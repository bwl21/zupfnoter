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
# * https://github.com/mbklein/confstruct
#

class Confstack

  # @return [Confstack]
  def initialize
    @confstack = []
    @confresult_flat = {}
    self
  end

  # @param [Hash] hash push a hash to the confstace
  # @return [Confstack] self
  def push(hash)
    @confstack.push(hash)
    _flatten
    self
  end


  # pop the current configuration
  # @return [Confstack] self
  def pop
    @confstack.pop
    _flatten
    self
  end

  # access a particular configuration value
  # if the value is not a terminal, the subtree is returened as a Hash
  # @param [String] key for example "a.b.c"
  def get(key=nil)
    if key.nil?
      result = @confresult_flat
    else
      result =_get_one(@confresult_flat, key)
    end
    result
  end

  # @return [Array of String] all individual hierachical keys
  def keys
    @confstack.map { |s| _get_keys(s) }.compact.flatten.uniq
  end

  private

  def _flatten
    the_keys = self.keys
    @confresult_flat = the_keys.inject({}) do |result, element|
      result[element] = _get(element)
      _add_hash(result, element.split("."), _get(element), nil)
      result
    end
    @confresult_flat = @confresult_flat[nil]
  end

  def _add_hash(hash, keys, value, current_key)
    # this is for convenience
    hash = {} if hash.nil?

    if keys.empty?
      hash[current_key] = value
    else
      hash[current_key] = {} unless hash[current_key].is_a? Hash
      _add_hash(hash[current_key], keys[1..-1], value, keys.first.to_sym) #unless keys.empty?
    end
    #this is for convenience
    hash
  end

  def _get(key)
    @confstack.map { |s| _get_one(s, key) }.compact.last
  end


  def _get_one(hash, key)
    keys = key.split('.')
    retval = keys.inject(hash) do |result, element|
      break unless result.is_a? Hash
      result[element] || result[element.to_sym]
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
end
