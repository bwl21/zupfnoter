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
# inspired by https://github.com/mbklein/confstruct
# * make it simpler
# * leave out syntactic sugar to work with method missing
# * support late binding
# * work with opal
#

class Confstack

  # @return [Confstack]
  def initialize
    @callstack        = []
    @confstack        = []
    @confresult_flat  = {}
    @confresult_cache = {}
    self
  end

  # @param [Hash] hash push a hash to the confstace
  # @return [Confstack] self
  def push(hash)
    @confresult_cache = {}
    @confstack.push(hash) if hash.is_a? Hash
    _flatten
    self
  end


  # pop the current configuration
  # @return [Confstack] self
  def pop
    @confresult_cache = {}
    @confstack.pop
    _flatten
    self
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
    @confstack.map { |s| _get_keys(s) }.compact.flatten.uniq
  end

  private

  def _resolve(key)

  end

  def _flatten
    the_keys         = self.keys
    @confresult_flat = the_keys.inject({}) do |result, element|
      result[element] = _get(element)
      _add_hash(result, element.split("."), _get(element), nil) # nil is the same as below: it could be any key which does not occur in conf
      result
    end
    @confresult_flat = @confresult_flat[nil] # nil is the same as above
  end

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

  def _get(key)
    @confstack.map { |s| _get_one(s, key) }.compact.last
  end


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
    array.map{|f| _resolve_dependencies(nil, f)}
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
