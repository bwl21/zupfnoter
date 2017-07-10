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


#https://github.com/rails/rails/blob/d66e7835bea9505f7003e5038aa19b6ea95ceea1/activesupport/lib/active_support/core_ext/object/duplicable.rb
#--
# Most objects are cloneable, but not all. For example you can't dup +nil+:
#
#   nil.dup # => TypeError: can't dup NilClass
#
# Classes may signal their instances are not duplicable removing +dup+/+clone+
# or raising exceptions from them. So, to dup an arbitrary object you normally
# use an optimistic approach and are ready to catch an exception, say:
#
#   arbitrary_object.dup rescue object
#
# Rails dups objects in a few critical spots where they are not that arbitrary.
# That rescue is very expensive (like 40 times slower than a predicate), and it
# is often triggered.
#
# That's why we hardcode the following cases and check duplicable? instead of
# using that rescue idiom.
#++
class Object
  # Can you safely dup this object?
  #
  # False for +nil+, +false+, +true+, symbol, number, method objects;
  # true otherwise.
  def duplicable?
    true
  end
end

class NilClass
  # +nil+ is not duplicable:
  #
  #   nil.duplicable? # => false
  #   nil.dup         # => TypeError: can't dup NilClass
  def duplicable?
    false
  end
end

class FalseClass
  # +false+ is not duplicable:
  #
  #   false.duplicable? # => false
  #   false.dup         # => TypeError: can't dup FalseClass
  def duplicable?
    false
  end
end

class TrueClass
  # +true+ is not duplicable:
  #
  #   true.duplicable? # => false
  #   true.dup         # => TypeError: can't dup TrueClass
  def duplicable?
    false
  end
end

class Symbol
  # Symbols are not duplicable:
  #
  #   :my_symbol.duplicable? # => false
  #   :my_symbol.dup         # => TypeError: can't dup Symbol
  def duplicable?
    false
  end
end

class Numeric
  # Numbers are not duplicable:
  #
  #  3.duplicable? # => false
  #  3.dup         # => TypeError: can't dup Integer
  def duplicable?
    false
  end
end

#require "bigdecimal"
class BigDecimal
  # BigDecimals are duplicable:
  #
  # BigDecimal.new("1.2").duplicable? # => true
  # BigDecimal.new("1.2").dup         # => #<BigDecimal:...,'0.12E1',18(18)>
  def duplicable?
    true
  end
end

class Method
  # Methods are not duplicable:
  #
  #  method(:puts).duplicable? # => false
  #  method(:puts).dup         # => TypeError: allocator undefined for Method
  def duplicable?
    false
  end
end


#https://github.com/rails/rails/blob/d66e7835bea9505f7003e5038aa19b6ea95ceea1/activesupport/lib/active_support/core_ext/object/deep_dup.rb

# this is for Opal to avoid that builtin primitives are converted to Objects
# jspdf does not accept a String object for text
class String
  def deep_dup
    self.to_n
  end
end

class Numerical
  def deep_dup
    self.to_n
  end
end
# end this is for opal

class Object
  # Returns a deep copy of object if it's duplicable. If it's
  # not duplicable, returns +self+.
  #
  #   object = Object.new
  #   dup    = object.deep_dup
  #   dup.instance_variable_set(:@a, 1)
  #
  #   object.instance_variable_defined?(:@a) # => false
  #   dup.instance_variable_defined?(:@a)    # => true
  def deep_dup
    duplicable? ? dup : self
  end
end

class Array
  # Returns a deep copy of array.
  #
  #   array = [1, [2, 3]]
  #   dup   = array.deep_dup
  #   dup[1][2] = 4
  #
  #   array[1][2] # => nil
  #   dup[1][2]   # => 4
  def deep_dup
    map(&:deep_dup)
  end
end

class Hash
  # Returns a deep copy of hash.
  #
  #   hash = { a: { b: 'b' } }
  #   dup  = hash.deep_dup
  #   dup[:a][:c] = 'c'
  #
  #   hash[:a][:c] # => nil
  #   dup[:a][:c]  # => "c"
  def deep_dup
    hash = dup
    each_pair do |key, value|
      if key.frozen? && ::String === key
        hash[key] = value.deep_dup
      else
        hash.delete(key)
        hash[key.deep_dup] = value.deep_dup
      end
    end
    hash
  end


# https://github.com/rails/rails/blob/d66e7835bea9505f7003e5038aa19b6ea95ceea1/activesupport/lib/active_support/core_ext/hash/deep_merge.rb
# Returns a new hash with +self+ and +other_hash+ merged recursively.
#
#   h1 = { a: true, b: { c: [1, 2, 3] } }
#   h2 = { a: false, b: { x: [3, 4, 5] } }
#
#   h1.deep_merge(h2) # => { a: false, b: { c: [1, 2, 3], x: [3, 4, 5] } }
#
# Like with Hash#merge in the
# standard library, a block can be provided
# to merge values:
#
#   h1 = { a: 100, b: 200, c: { c1: 100 } }
#   h2 = { b: 250, c: { c1: 200 } }
#   h1.deep_merge(h2) { |key, this_val, other_val| this_val + other_val }
#   # => { a: 100, b: 450, c: { c1: 300 } }
  def deep_merge(other_hash, &block)
    dup.deep_merge!(other_hash, &block)
  end

# Same as +deep_merge+, but modifies +self+.
  def deep_merge!(other_hash, &block)
    other_hash.each_pair do |current_key, other_value|
      this_value = self[current_key]

      self[current_key] = if this_value.is_a?(Hash) && other_value.is_a?(Hash)
                            this_value.deep_merge(other_value, &block)
                          else
                            if block_given? && key?(current_key)
                              block.call(current_key, this_value, other_value)
                            else
                              other_value
                            end
                          end
    end

    self
  end
end


# Hash extension borrowed from

class Hash
  #https://stackoverflow.com/questions/1820451/ruby-style-how-to-check-whether-a-nested-hash-element-exists
  def dig(*path)
    path.inject(self) do |location, key|
      location.respond_to?(:keys) ? location[key] : nil
    end
  end

  # returns all nested keys of the hash as path separated by '.'
  def digkeys(r=[], parent_key = nil)
    keys.inject(r) do |r, key|
      newkey = [parent_key, key].compact.join(".")
      r.push newkey
      if self[key].respond_to?(:keys)
        self[key].digkeys(r, newkey)
      end
      r
    end
  end

end

require 'json'

class Confstack

  class DeleteMe
  end

  attr_accessor :strict
  # @return [Confstack]
  def initialize(name = 'default')
    @callstack        = [] # to detect circular references
    @confstack        = [{}] # the stack of configuration elements
    @lookup_cache     = {} # a cache for get to speedup lated binding
    @confresult_cache = {}
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
    @lookup_cache     = {}
    if hash.is_a? Hash
      @sourcestack.push(caller.first)
      newconf = @confstack.last.deep_dup.deep_merge(hash)
      @confstack.push(newconf)
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
    @lookup_cache = {}
    @sourcestack.pop
    @confstack.pop
    @confstack.count
  end

  def reset_to(level)
    @lookup_cache = {}
    @sourcestack = @sourcestack[0 .. level]
    @confstack = @confstack[0 .. level]
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
      result = @confstack.last
    else
      if @lookup_cache.has_key?(key)
        result = @lookup_cache[key]
      else
        result             = @confstack.last.dig(* key.split("."))
        @lookup_cache[key] = result
        unless result
          raise "confstack: key not available: #{key}" if result.nil? and not self.keys.include?(key) and @strict
        end
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
    @confstack.last.digkeys
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

    if (value == DeleteMe)
      delete(key)
    else
      array = key.split('.').reverse
      h     = array.inject(value) { |a, n| {n => a} } # https://stackoverflow.com/questions/5095077/ruby-convert-array-to-nested-hash
      push (h)
    end
  end


  def delete(key)
    keys = key.split('.')
    @confstack.last.dig(* keys[0..-2]).delete(keys.last)
  end

  private

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
