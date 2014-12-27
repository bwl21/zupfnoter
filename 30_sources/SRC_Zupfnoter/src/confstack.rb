class Confstack

  attr_reader :confstack

  def initialize
    @confstack = []
  end

  def push(hash)
    @confstack.push(hash)
  end

  def pop
    @confstack.pop
  end

  def get(key)
    require 'pry';
    @confstack.map { |s| _get(s, key) }.compact.last
  end

  def keys
    @confstack.map { |s| _get_keys(s) }.compact.flatten.uniq
  end

  def flatten
    the_keys = self.keys
    r1 = the_keys.inject({}) do |result, element|
      _add_hash(result, element.split("."), get(element), nil)
    end
    r1[nil]
  end

  def add_hash(hash, keys, value = nil)
    _add_hash(hash, keys, value, nil)[nil]
  end


  private

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

  def _get(hash, key)
    keys = key.split('.')
    retval = keys.inject(hash) do |result, element|
      break unless result.is_a? Hash

      result[element.to_sym]
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
