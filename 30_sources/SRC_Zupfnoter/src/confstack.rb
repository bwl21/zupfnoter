# this class maintains a configuration stack. It allows to
# * maintain an hierarchical configuration repository
# * push a default configuration
#   the default configuration provides
#   * default for all values
#   * key and datatype of value
# * push a a specific configuration, which is again a hash overwriting parts of the default
# * pop the specific configuraiton to return to the defaults
# * access to configuration items by a key such as "a.b.c"
#
# supports nested configs and named configs
#
# see confstack_spec.rb how it works
# note that Confstack.new(false) does not create the enviornment and is not nestable.
# this is for local confstacks only
#
# the configuration name is also a name for the environment variable
# so be sure
#
# inspired by https://github.com/mbklein/confstruct
# * make it simpler
# * leave out syntactic sugar to work with method missing
# * support late binding
# * work with opal
#

require 'json'

class Confstack

  attr_accessor :strict
  # @return [Confstack]
  def initialize(name = 'default')
    @callstack        = [] # to detect circular references
    @confstack        = [{}] # the stack of configuration elements
    @confresult_flat  = {} # the flattened stack (not the flattend parateres :-)
    @confresult_cache = {} # a cache for get to speedup lated binding
    @sourcestack      = [] # to store traceback information for pushes
    @strict           = true # raise error on wrong key
    if name
      @confstack_name = "confstack__" + name
      push({'confstack' => {'env' => @confstack_name}})
      push_from_env # this is supports the case that the upper envrionmet has redefined confstac.env
    end
    self
  end

  # push a hash on the stack
  # todo: hash is updated with the sibling keys
  # so handle with care
  #
  # @param [Hash] hash push a hash to the confstace
  # @return [Confstack] self
  def push(hash={})
    @confresult_cache = {}
    if hash.is_a? Hash
      @sourcestack.push(caller.first)
      @confstack.push(hash)
      _flatten
    else
      self
    end
    @confstack.count
  end


  # this pushes on the stack but also prepares forwarding to subshells
  # by storing the pushed hash to an environment variable
  #
  # note that the environment variable can itself be configured
  # see confstack_spec.rb for an example
  #
  # restrictions:
  #  * no late binding
  #  * settings by $conf['']= are not forwarded
  #
  # @param [Object] hash
  def push_to_env(hash={})
    localstack = Confstack.new(false) # false does not create an environment for local stack and avoids infinite loop
    localstack.push(get_from_env)
    localstack.push(hash)
    newpush = localstack[]

    hash_json = newpush.to_json

    ENV[self['confstack.env']] = hash_json
    push(hash)
  end

  # this pulls a configuration from the envrionment and pushes it to the confstack
  #
  def push_from_env()
    push_to_env(get_from_env) # note, we do push_to_env to support arbitrary nessting of the same
  end

  # this pulls a configuratioon from the environment
  # but does not push it to the confstack
  # this allows to continue with another confstack in the subshell
  def get_from_env
    result = {}
    if self.keys.include?('confstack.env')
      fromenv = ENV[self['confstack.env']]
      unless fromenv.nil?
        result = JSON.parse(fromenv)
      end
    end
    result
  end

  # pop the current configuration
  # @return [Confstack] self
  def pop
    @confresult_cache = {}
    @sourcestack.pop
    @confstack.pop
    _flatten
    @confstack.count
  end

  def save(name)
    result = self.get

    File.open("#{name}.yaml", 'w') { |f| f.puts(result.to_yaml) }
    File.open("#{name}.json", 'w') { |f| f.puts(result.to_json) }
  end

  # access a particular configuration value
  # if the value is not a terminal, the subtree is returened as a Hash
  # it recursivly resolves lambdas in this for late bound dependendies
  # @param [String] key for example "a.b.c"
  # @param [Hash] options default: resolve => true
  def get(key=nil, options={:resolve => true})
    if key.nil?
      result = @confresult_flat
    else
      result =_get_one(@confresult_flat, key)
      unless result
        raise "confstack: key not available: #{key}" if result.nil? and not self.keys.include?(key) and @strict
      end
    end

    result = _resolve_dependencies(key, result) if options[:resolve] == true

    result
  end


  alias :[] :get

  def each(&block)
    self.keys.each do |k|
      block.call(k, self[k])
    end
  end

  # @return [Array of String] all individual hierachical keys
  def keys
    @confkeys_flat
  end

  # @return [Array of String] all individual hierachical keys
  def _keys
    @confstack.map { |s| _get_keys(s) }.compact.flatten.uniq
  end

  def get_source(key)
    stack  = @confstack.each_with_index.map { |s, index| [_get_one(s, key), index] }
    result = stack.select { |value| !(value.first.nil?) }.last
    @confstack.map { |s, index| _get_one(s, key) }.compact.last
    @sourcestack[result.last.to_i]
  end


  # this updates a hash according to the key hierarchy
  # should be a method of Hash ...
  def []=(key, value)
    keys = key.split('.')
    _update_hash(@confstack.last, keys, value)
    _flatten
  end

  private


  # this populates the flat result
  def _flatten
    @confkeys_flat   = self._keys
    @confresult_flat = @confkeys_flat.inject({}) do |result, element|
      result[element] = _get(element)
      _add_hash(result, element.split("."), _get(element), nil) # nil is the same as below: it could be any key which does not occur in conf
      result
    end
    @confresult_flat = @confresult_flat[nil] # nil is the same as above
    @confresult_flat = {} if @confresult_flat.nil?
  end

  # this method adds a value to a hash for a current_key, with in a key hierarchy denoted by keys
  # _add_hash({}, ['foo', 'bar'], 'bar_value', 'foobar') => {'foo' => {'bar' => {'foobar'=> 'bar_value'}}}

  # @param [Hash] hash the Hash to be manuipulated
  # @param [Array] keys the list of parent keys
  # @param [Object] value the value for the key
  # @param [current_key] the lowest key for the value
  def _add_hash(hash, keys, value, current_key)
    hash = {} if hash.nil? # this covers the case that a new Hash for a particular key is created
    if keys.empty?
      hash[current_key] = value
    else
      hash[current_key] = {} unless hash[current_key].is_a? Hash
      _add_hash(hash[current_key], keys[1..-1], value, keys.first) #unless keys.empty?
    end
    #this is for convenience
    hash
  end

  # this updates a hash according to the keys
  # todo: unify this with _add_hash
  # @param
  # @param [Hash] hash to be updated
  # @param [Array] keys strings, with the key hierarcy from top to bottom
  # @param [Object] value the value for the ky
  def _update_hash(hash, keys, value)
    hash = {} if hash.nil? # this covers the case that a new Hash for a particular key is created

    if keys.empty?
      raise "empty keys in _add_hash"
    else
      if keys.count == 1
        hash[keys.first] = value
      else
        hash[keys.first] = {} unless hash[keys.first].is_a? Hash
        _update_hash(hash[keys.first], keys[1..-1], value) #unless keys.empty?
      end
      #this is for convenience
      hash
    end
  end

  def _get(key)
    @confstack.map { |s, index| _get_one(s, key) }.compact.last
  end


  # this gets the key of one particular stack element
  def _get_one(hash, key)
    keys   = key.split('.')
    retval = keys.inject(hash) do |result, element|
      break unless result.is_a? Hash
      result[element] #|| result[element.to_sym]
    end
    retval
  end

  # @param [Hash] hash the has to get the keys from
  # @param [String] path the path to hash (not the path in hash)
  def _get_keys(hash, path = nil)
    retval = hash.keys.inject([]) do |result, key|
      newpath = [path, key].compact.join('.')
      newhash = hash[key]

      result << newpath
      result << _get_keys(newhash, newpath) if newhash.is_a? Hash
      result
    end
    retval.compact.flatten
  end


  # this resulves a single paramter dependency
  def _resolve_value_dependency(key, value)
    if @confresult_cache.has_key?(value)
      result = @confresult_cache[value]
    else
      if @callstack.include?(key)
        loop      = @callstack[@callstack.index { |x| x == key } .. -1]
        @callstack=[]
        raise "circular conf dependency: #{loop + ["#{key} ..."]}"
      end

      @callstack.push(key)
      result = value.call
      @callstack.pop
      @confresult_cache[key] = result
    end

    result
  end

  def _resolve_array_dependency(key, array)
    array.map { |f| _resolve_dependencies(nil, f) }
  end

  # This recursively resolves the dependencies in a hash
  def _resolve_hash_dependency(key, hash)
    result = hash.inject({}) do |r, v|
      r[v.first] = _resolve_dependencies([key, v.first], v.last)
      r
    end
    result
  end

  def _resolve_dependencies(key, result)
    if result.class == Proc
      result = _resolve_value_dependency(key, result)
    end

    if result.class == Hash
      result = _resolve_hash_dependency(key, result)
    end

    if result.class == Array
      result = _resolve_array_dependency(key, result)
    end
    result
  end
end
