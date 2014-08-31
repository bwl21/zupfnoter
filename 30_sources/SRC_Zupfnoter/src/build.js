(function(undefined) {
  // The Opal object that is exposed globally
  var Opal = this.Opal = {};

  // The actual class for BasicObject
  var RubyBasicObject;

  // The actual Object class
  var RubyObject;

  // The actual Module class
  var RubyModule;

  // The actual Class class
  var RubyClass;

  // Constructor for instances of BasicObject
  function BasicObject(){}

  // Constructor for instances of Object
  function Object(){}

  // Constructor for instances of Class
  function Class(){}

  // Constructor for instances of Module
  function Module(){}

  // Constructor for instances of NilClass (nil)
  function NilClass(){}

  // All bridged classes - keep track to donate methods from Object
  var bridged_classes = [];

  // TopScope is used for inheriting constants from the top scope
  var TopScope = function(){};

  // Opal just acts as the top scope
  TopScope.prototype = Opal;

  // To inherit scopes
  Opal.constructor  = TopScope;

  Opal.constants = [];

  // This is a useful reference to global object inside ruby files
  Opal.global = this;

  // Minify common function calls
  var $hasOwn = Opal.hasOwnProperty;
  var $slice  = Opal.slice = Array.prototype.slice;

  // Generates unique id for every ruby object
  var unique_id = 0;

  // Return next unique id
  Opal.uid = function() {
    return unique_id++;
  };

  // Table holds all class variables
  Opal.cvars = {};

  // Globals table
  Opal.gvars = {};

  /*
   * Create a new constants scope for the given class with the given
   * base. Constants are looked up through their parents, so the base
   * scope will be the outer scope of the new klass.
   */
  function create_scope(base, klass, id) {
    var const_alloc   = function() {};
    var const_scope   = const_alloc.prototype = new base.constructor();
    klass._scope      = const_scope;
    const_scope.base  = klass;
    klass._base_module = base.base;
    const_scope.constructor = const_alloc;
    const_scope.constants = [];

    if (id) {
      klass._orig_scope = base;
      base[id] = base.constructor[id] = klass;
      base.constants.push(id);
    }
  }

  Opal.create_scope = create_scope;

  /*
   * A `class Foo; end` expression in ruby is compiled to call this runtime
   * method which either returns an existing class of the given name, or creates
   * a new class in the given `base` scope.
   *
   * If a constant with the given name exists, then we check to make sure that
   * it is a class and also that the superclasses match. If either of these
   * fail, then we raise a `TypeError`. Note, superklass may be null if one was
   * not specified in the ruby code.
   *
   * We pass a constructor to this method of the form `function ClassName() {}`
   * simply so that classes show up with nicely formatted names inside debuggers
   * in the web browser (or node/sprockets).
   *
   * The `base` is the current `self` value where the class is being created
   * from. We use this to get the scope for where the class should be created.
   * If `base` is an object (not a class/module), we simple get its class and
   * use that as the base instead.
   *
   * @param [Object] base where the class is being created
   * @param [Class] superklass superclass of the new class (may be null)
   * @param [String] id the name of the class to be created
   * @param [Function] constructor function to use as constructor
   * @return [Class] new or existing ruby class
   */
  Opal.klass = function(base, superklass, id, constructor) {

    // If base is an object, use its class
    if (!base._isClass) {
      base = base._klass;
    }

    // Not specifying a superclass means we can assume it to be Object
    if (superklass === null) {
      superklass = RubyObject;
    }

    var klass = base._scope[id];

    // If a constant exists in the scope, then we must use that
    if ($hasOwn.call(base._scope, id) && klass._orig_scope === base._scope) {

      // Make sure the existing constant is a class, or raise error
      if (!klass._isClass) {
        throw Opal.TypeError.$new(id + " is not a class");
      }

      // Make sure existing class has same superclass
      if (superklass !== klass._super && superklass !== RubyObject) {
        throw Opal.TypeError.$new("superclass mismatch for class " + id);
      }
    }
    else if (typeof(superklass) === 'function') {
      // passed native constructor as superklass, so bridge it as ruby class
      return bridge_class(id, superklass);
    }
    else {
      // if class doesnt exist, create a new one with given superclass
      klass = boot_class(superklass, constructor);

      // name class using base (e.g. Foo or Foo::Baz)
      klass._name = id;

      // every class gets its own constant scope, inherited from current scope
      create_scope(base._scope, klass, id);

      // Name new class directly onto current scope (Opal.Foo.Baz = klass)
      base[id] = base._scope[id] = klass;

      // Copy all parent constants to child, unless parent is Object
      if (superklass !== RubyObject && superklass !== RubyBasicObject) {
        Opal.donate_constants(superklass, klass);
      }

      // call .inherited() hook with new class on the superclass
      if (superklass.$inherited) {
        superklass.$inherited(klass);
      }
    }

    return klass;
  };

  // Create generic class with given superclass.
  var boot_class = Opal.boot = function(superklass, constructor) {
    // instances
    var ctor = function() {};
        ctor.prototype = superklass._proto;

    constructor.prototype = new ctor();

    constructor.prototype.constructor = constructor;

    return boot_class_meta(superklass, constructor);
  };

  // class itself
  function boot_class_meta(superklass, constructor) {
    var mtor = function() {};
    mtor.prototype = superklass.constructor.prototype;

    function OpalClass() {};
    OpalClass.prototype = new mtor();

    var klass = new OpalClass();

    klass._id         = unique_id++;
    klass._alloc      = constructor;
    klass._isClass    = true;
    klass.constructor = OpalClass;
    klass._super      = superklass;
    klass._methods    = [];
    klass.__inc__     = [];
    klass.__parent    = superklass;
    klass._proto      = constructor.prototype;

    constructor.prototype._klass = klass;

    return klass;
  }

  // Define new module (or return existing module)
  Opal.module = function(base, id) {
    var module;

    if (!base._isClass) {
      base = base._klass;
    }

    if ($hasOwn.call(base._scope, id)) {
      module = base._scope[id];

      if (!module.__mod__ && module !== RubyObject) {
        throw Opal.TypeError.$new(id + " is not a module")
      }
    }
    else {
      module = boot_module()
      module._name = id;

      create_scope(base._scope, module, id);

      // Name new module directly onto current scope (Opal.Foo.Baz = module)
      base[id] = base._scope[id] = module;
    }

    return module;
  };

  /*
   * Internal function to create a new module instance. This simply sets up
   * the prototype hierarchy and method tables.
   */
  function boot_module() {
    var mtor = function() {};
    mtor.prototype = RubyModule.constructor.prototype;

    function OpalModule() {};
    OpalModule.prototype = new mtor();

    var module = new OpalModule();

    module._id         = unique_id++;
    module._isClass    = true;
    module.constructor = OpalModule;
    module._super      = RubyModule;
    module._methods    = [];
    module.__inc__     = [];
    module.__parent    = RubyModule;
    module._proto      = {};
    module.__mod__     = true;
    module.__dep__     = [];

    return module;
  }

  // Boot a base class (makes instances).
  var boot_defclass = function(id, constructor, superklass) {
    if (superklass) {
      var ctor           = function() {};
          ctor.prototype = superklass.prototype;

      constructor.prototype = new ctor();
    }

    constructor.prototype.constructor = constructor;

    return constructor;
  };

  // Boot the actual (meta?) classes of core classes
  var boot_makemeta = function(id, constructor, superklass) {

    var mtor = function() {};
    mtor.prototype  = superklass.prototype;

    function OpalClass() {};
    OpalClass.prototype = new mtor();

    var klass = new OpalClass();

    klass._id         = unique_id++;
    klass._alloc      = constructor;
    klass._isClass    = true;
    klass._name       = id;
    klass._super      = superklass;
    klass.constructor = OpalClass;
    klass._methods    = [];
    klass.__inc__     = [];
    klass.__parent    = superklass;
    klass._proto      = constructor.prototype;

    constructor.prototype._klass = klass;

    Opal[id] = klass;
    Opal.constants.push(id);

    return klass;
  };

  /*
   * For performance, some core ruby classes are toll-free bridged to their
   * native javascript counterparts (e.g. a ruby Array is a javascript Array).
   *
   * This method is used to setup a native constructor (e.g. Array), to have
   * its prototype act like a normal ruby class. Firstly, a new ruby class is
   * created using the native constructor so that its prototype is set as the
   * target for th new class. Note: all bridged classes are set to inherit
   * from Object.
   *
   * Bridged classes are tracked in `bridged_classes` array so that methods
   * defined on Object can be "donated" to all bridged classes. This allows
   * us to fake the inheritance of a native prototype from our Object
   * prototype.
   *
   * Example:
   *
   *    bridge_class("Proc", Function);
   *
   * @param [String] name the name of the ruby class to create
   * @param [Function] constructor native javascript constructor to use
   * @return [Class] returns new ruby class
   */
  function bridge_class(name, constructor) {
    var klass = boot_class_meta(RubyObject, constructor);

    klass._name = name;

    create_scope(Opal, klass, name);
    bridged_classes.push(klass);

    var object_methods = RubyBasicObject._methods.concat(RubyObject._methods);

    for (var i = 0, len = object_methods.length; i < len; i++) {
      var meth = object_methods[i];
      constructor.prototype[meth] = RubyObject._proto[meth];
    }

    return klass;
  };

  /*
   * constant assign
   */
  Opal.casgn = function(base_module, name, value) {
    var scope = base_module._scope;

    if (value._isClass && value._name === nil) {
      value._name = name;
    }

    if (value._isClass) {
      value._base_module = base_module;
    }

    scope.constants.push(name);
    return scope[name] = value;
  };

  /*
   * constant decl
   */
  Opal.cdecl = function(base_scope, name, value) {
    base_scope.constants.push(name);
    return base_scope[name] = value;
  };

  /*
   * constant get
   */
  Opal.cget = function(base_scope, path) {
    if (path == null) {
      path       = base_scope;
      base_scope = Opal.Object;
    }

    var result = base_scope;

    path = path.split('::');
    while (path.length != 0) {
      result = result.$const_get(path.shift());
    }

    return result;
  }

  /*
   * When a source module is included into the target module, we must also copy
   * its constants to the target.
   */
  Opal.donate_constants = function(source_mod, target_mod) {
    var source_constants = source_mod._scope.constants,
        target_scope     = target_mod._scope,
        target_constants = target_scope.constants;

    for (var i = 0, length = source_constants.length; i < length; i++) {
      target_constants.push(source_constants[i]);
      target_scope[source_constants[i]] = source_mod._scope[source_constants[i]];
    }
  };

  /*
   * Methods stubs are used to facilitate method_missing in opal. A stub is a
   * placeholder function which just calls `method_missing` on the receiver.
   * If no method with the given name is actually defined on an object, then it
   * is obvious to say that the stub will be called instead, and then in turn
   * method_missing will be called.
   *
   * When a file in ruby gets compiled to javascript, it includes a call to
   * this function which adds stubs for every method name in the compiled file.
   * It should then be safe to assume that method_missing will work for any
   * method call detected.
   *
   * Method stubs are added to the BasicObject prototype, which every other
   * ruby object inherits, so all objects should handle method missing. A stub
   * is only added if the given property name (method name) is not already
   * defined.
   *
   * Note: all ruby methods have a `$` prefix in javascript, so all stubs will
   * have this prefix as well (to make this method more performant).
   *
   *    Opal.add_stubs(["$foo", "$bar", "$baz="]);
   *
   * All stub functions will have a private `rb_stub` property set to true so
   * that other internal methods can detect if a method is just a stub or not.
   * `Kernel#respond_to?` uses this property to detect a methods presence.
   *
   * @param [Array] stubs an array of method stubs to add
   */
  Opal.add_stubs = function(stubs) {
    for (var i = 0, length = stubs.length; i < length; i++) {
      var stub = stubs[i];

      if (!BasicObject.prototype[stub]) {
        BasicObject.prototype[stub] = true;
        add_stub_for(BasicObject.prototype, stub);
      }
    }
  };

  /*
   * Actuall add a method_missing stub function to the given prototype for the
   * given name.
   *
   * @param [Prototype] prototype the target prototype
   * @param [String] stub stub name to add (e.g. "$foo")
   */
  function add_stub_for(prototype, stub) {
    function method_missing_stub() {
      // Copy any given block onto the method_missing dispatcher
      this.$method_missing._p = method_missing_stub._p;

      // Set block property to null ready for the next call (stop false-positives)
      method_missing_stub._p = null;

      // call method missing with correct args (remove '$' prefix on method name)
      return this.$method_missing.apply(this, [stub.slice(1)].concat($slice.call(arguments)));
    }

    method_missing_stub.rb_stub = true;
    prototype[stub] = method_missing_stub;
  }

  // Expose for other parts of Opal to use
  Opal.add_stub_for = add_stub_for;

  // Const missing dispatcher
  Opal.cm = function(name) {
    return this.base.$const_missing(name);
  };

  // Arity count error dispatcher
  Opal.ac = function(actual, expected, object, meth) {
    var inspect = (object._isClass ? object._name + '.' : object._klass._name + '#') + meth;
    var msg = '[' + inspect + '] wrong number of arguments(' + actual + ' for ' + expected + ')';
    throw Opal.ArgumentError.$new(msg);
  };

  // Super dispatcher
  Opal.find_super_dispatcher = function(obj, jsid, current_func, iter, defs) {
    var dispatcher;

    if (defs) {
      dispatcher = obj._isClass ? defs._super : obj._klass._proto;
    }
    else {
      if (obj._isClass) {
        dispatcher = obj._super;
      }
      else {
        dispatcher = find_obj_super_dispatcher(obj, jsid, current_func);
      }
    }

    dispatcher = dispatcher['$' + jsid];
    dispatcher._p = iter;

    return dispatcher;
  };

  // Iter dispatcher for super in a block
  Opal.find_iter_super_dispatcher = function(obj, jsid, current_func, iter, defs) {
    if (current_func._def) {
      return Opal.find_super_dispatcher(obj, current_func._jsid, current_func, iter, defs);
    }
    else {
      return Opal.find_super_dispatcher(obj, jsid, current_func, iter, defs);
    }
  };

  var find_obj_super_dispatcher = function(obj, jsid, current_func) {
    var klass = obj.__meta__ || obj._klass;

    while (klass) {
      if (klass._proto['$' + jsid] === current_func) {
        // ok
        break;
      }

      klass = klass.__parent;
    }

    // if we arent in a class, we couldnt find current?
    if (!klass) {
      throw new Error("could not find current class for super()");
    }

    klass = klass.__parent;

    // else, let's find the next one
    while (klass) {
      var working = klass._proto['$' + jsid];

      if (working && working !== current_func) {
        // ok
        break;
      }

      klass = klass.__parent;
    }

    return klass._proto;
  };

  /*
   * Used to return as an expression. Sometimes, we can't simply return from
   * a javascript function as if we were a method, as the return is used as
   * an expression, or even inside a block which must "return" to the outer
   * method. This helper simply throws an error which is then caught by the
   * method. This approach is expensive, so it is only used when absolutely
   * needed.
   */
  Opal.$return = function(val) {
    Opal.returner.$v = val;
    throw Opal.returner;
  };

  // handles yield calls for 1 yielded arg
  Opal.$yield1 = function(block, arg) {
    if (typeof(block) !== "function") {
      throw Opal.LocalJumpError.$new("no block given");
    }

    if (block.length > 1) {
      if (arg._isArray) {
        return block.apply(null, arg);
      }
      else {
        return block(arg);
      }
    }
    else {
      return block(arg);
    }
  };

  // handles yield for > 1 yielded arg
  Opal.$yieldX = function(block, args) {
    if (typeof(block) !== "function") {
      throw Opal.LocalJumpError.$new("no block given");
    }

    if (block.length > 1 && args.length == 1) {
      if (args[0]._isArray) {
        return block.apply(null, args[0]);
      }
    }

    if (!args._isArray) {
      args = $slice.call(args);
    }

    return block.apply(null, args);
  };

  // Finds the corresponding exception match in candidates.  Each candidate can
  // be a value, or an array of values.  Returns null if not found.
  Opal.$rescue = function(exception, candidates) {
    for (var i = 0; i != candidates.length; i++) {
      var candidate = candidates[i];
      if (candidate._isArray) {
        var subresult;
        if (subresult = Opal.$rescue(exception, candidate)) {
          return subresult;
        }
      }
      else if (candidate['$==='](exception)) {
        return candidate;
      }
    }
    return null;
  };

  Opal.is_a = function(object, klass) {
    if (object.__meta__ === klass) {
      return true;
    }

    var search = object._klass;

    while (search) {
      if (search === klass) {
        return true;
      }

      for (var i = 0, length = search.__inc__.length; i < length; i++) {
        if (search.__inc__[i] == klass) {
          return true;
        }
      }

      search = search._super;
    }

    return false;
  }

  // Helper to convert the given object to an array
  Opal.to_ary = function(value) {
    if (value._isArray) {
      return value;
    }
    else if (value.$to_ary && !value.$to_ary.rb_stub) {
      return value.$to_ary();
    }

    return [value];
  };

  /*
    Call a ruby method on a ruby object with some arguments:

      var my_array = [1, 2, 3, 4]
      Opal.send(my_array, 'length')     # => 4
      Opal.send(my_array, 'reverse!')   # => [4, 3, 2, 1]

    A missing method will be forwarded to the object via
    method_missing.

    The result of either call with be returned.

    @param [Object] recv the ruby object
    @param [String] mid ruby method to call
  */
  Opal.send = function(recv, mid) {
    var args = $slice.call(arguments, 2),
        func = recv['$' + mid];

    if (func) {
      return func.apply(recv, args);
    }

    return recv.$method_missing.apply(recv, [mid].concat(args));
  };

  Opal.block_send = function(recv, mid, block) {
    var args = $slice.call(arguments, 3),
        func = recv['$' + mid];

    if (func) {
      func._p = block;
      return func.apply(recv, args);
    }

    return recv.$method_missing.apply(recv, [mid].concat(args));
  };

  /**
   * Donate methods for a class/module
   */
  Opal.donate = function(klass, defined, indirect) {
    var methods = klass._methods, included_in = klass.__dep__;

    // if (!indirect) {
      klass._methods = methods.concat(defined);
    // }

    if (included_in) {
      for (var i = 0, length = included_in.length; i < length; i++) {
        var includee = included_in[i];
        var dest = includee._proto;

        for (var j = 0, jj = defined.length; j < jj; j++) {
          var method = defined[j];
          dest[method] = klass._proto[method];
          dest[method]._donated = true;
        }

        if (includee.__dep__) {
          Opal.donate(includee, defined, true);
        }
      }
    }
  };

  Opal.defn = function(obj, jsid, body) {
    if (obj.__mod__) {
      obj._proto[jsid] = body;
      Opal.donate(obj, [jsid]);
    }
    else if (obj._isClass) {
      obj._proto[jsid] = body;

      if (obj === RubyBasicObject) {
        define_basic_object_method(jsid, body);
      }
      else if (obj === RubyObject) {
        Opal.donate(obj, [jsid]);
      }
    }
    else {
      obj[jsid] = body;
    }

    return nil;
  };

  /*
   * Define a singleton method on the given object.
   */
  Opal.defs = function(obj, jsid, body) {
    if (obj._isClass || obj.__mod__) {
      obj.constructor.prototype[jsid] = body;
    }
    else {
      obj[jsid] = body;
    }
  };

  function define_basic_object_method(jsid, body) {
    RubyBasicObject._methods.push(jsid);
    for (var i = 0, len = bridged_classes.length; i < len; i++) {
      bridged_classes[i]._proto[jsid] = body;
    }
  }

  Opal.hash = function() {
    if (arguments.length == 1 && arguments[0]._klass == Opal.Hash) {
      return arguments[0];
    }

    var hash   = new Opal.Hash._alloc,
        keys   = [],
        assocs = {};

    hash.map   = assocs;
    hash.keys  = keys;

    if (arguments.length == 1) {
      if (arguments[0]._isArray) {
        var args = arguments[0];

        for (var i = 0, length = args.length; i < length; i++) {
          var pair = args[i];

          if (pair.length !== 2) {
            throw Opal.ArgumentError.$new("value not of length 2: " + pair.$inspect());
          }

          var key = pair[0],
              obj = pair[1];

          if (assocs[key] == null) {
            keys.push(key);
          }

          assocs[key] = obj;
        }
      }
      else {
        var obj = arguments[0];
        for (var key in obj) {
          assocs[key] = obj[key];
          keys.push(key);
        }
      }
    }
    else {
      var length = arguments.length;
      if (length % 2 !== 0) {
        throw Opal.ArgumentError.$new("odd number of arguments for Hash");
      }

      for (var i = 0; i < length; i++) {
        var key = arguments[i],
            obj = arguments[++i];

        if (assocs[key] == null) {
          keys.push(key);
        }

        assocs[key] = obj;
      }
    }

    return hash;
  };

  /*
   * hash2 is a faster creator for hashes that just use symbols and
   * strings as keys. The map and keys array can be constructed at
   * compile time, so they are just added here by the constructor
   * function
   */
  Opal.hash2 = function(keys, map) {
    var hash = new Opal.Hash._alloc;

    hash.keys = keys;
    hash.map  = map;

    return hash;
  };

  /*
   * Create a new range instance with first and last values, and whether the
   * range excludes the last value.
   */
  Opal.range = function(first, last, exc) {
    var range         = new Opal.Range._alloc;
        range.begin   = first;
        range.end     = last;
        range.exclude = exc;

    return range;
  };

  // Initialization
  // --------------

  // Constructors for *instances* of core objects
  boot_defclass('BasicObject', BasicObject);
  boot_defclass('Object', Object, BasicObject);
  boot_defclass('Module', Module, Object);
  boot_defclass('Class', Class, Module);

  // Constructors for *classes* of core objects
  RubyBasicObject = boot_makemeta('BasicObject', BasicObject, Class);
  RubyObject      = boot_makemeta('Object', Object, RubyBasicObject.constructor);
  RubyModule      = boot_makemeta('Module', Module, RubyObject.constructor);
  RubyClass       = boot_makemeta('Class', Class, RubyModule.constructor);

  // Fix booted classes to use their metaclass
  RubyBasicObject._klass = RubyClass;
  RubyObject._klass = RubyClass;
  RubyModule._klass = RubyClass;
  RubyClass._klass = RubyClass;

  // Fix superclasses of booted classes
  RubyBasicObject._super = null;
  RubyObject._super = RubyBasicObject;
  RubyModule._super = RubyObject;
  RubyClass._super = RubyModule;

  // Internally, Object acts like a module as it is "included" into bridged
  // classes. In other words, we donate methods from Object into our bridged
  // classes as their prototypes don't inherit from our root Object, so they
  // act like module includes.
  RubyObject.__dep__ = bridged_classes;

  Opal.base = RubyObject;
  RubyBasicObject._scope = RubyObject._scope = Opal;
  RubyBasicObject._orig_scope = RubyObject._orig_scope = Opal;
  Opal.Kernel = RubyObject;

  RubyModule._scope = RubyObject._scope;
  RubyClass._scope = RubyObject._scope;
  RubyModule._orig_scope = RubyObject._orig_scope;
  RubyClass._orig_scope = RubyObject._orig_scope;

  RubyObject._proto.toString = function() {
    return this.$to_s();
  };

  Opal.top = new RubyObject._alloc();

  Opal.klass(RubyObject, RubyObject, 'NilClass', NilClass);

  var nil = Opal.nil = new NilClass;
  nil.call = nil.apply = function() { throw Opal.LocalJumpError.$new('no block given'); };

  Opal.breaker  = new Error('unexpected break');
  Opal.returner = new Error('unexpected return');

  bridge_class('Array', Array);
  bridge_class('Boolean', Boolean);
  bridge_class('Numeric', Number);
  bridge_class('String', String);
  bridge_class('Proc', Function);
  bridge_class('Exception', Error);
  bridge_class('Regexp', RegExp);
  bridge_class('Time', Date);

  TypeError._super = Error;
}).call(this);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  $opal.add_stubs(['$new', '$class', '$===', '$respond_to?', '$raise', '$type_error', '$__send__', '$coerce_to', '$nil?', '$<=>', '$name', '$inspect']);
  return (function($base) {
    var self = $module($base, 'Opal');

    var def = self._proto, $scope = self._scope;

    $opal.defs(self, '$type_error', function(object, type, method, coerced) {
      var $a, $b, self = this;

      if (method == null) {
        method = nil
      }
      if (coerced == null) {
        coerced = nil
      }
      if ((($a = (($b = method !== false && method !== nil) ? coerced : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return (($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a).$new("can't convert " + (object.$class()) + " into " + (type) + " (" + (object.$class()) + "#" + (method) + " gives " + (coerced.$class()))
        } else {
        return (($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a).$new("no implicit conversion of " + (object.$class()) + " into " + (type))
      };
    });

    $opal.defs(self, '$coerce_to', function(object, type, method) {
      var $a, self = this;

      if ((($a = type['$==='](object)) !== nil && (!$a._isBoolean || $a == true))) {
        return object};
      if ((($a = object['$respond_to?'](method)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise(self.$type_error(object, type))
      };
      return object.$__send__(method);
    });

    $opal.defs(self, '$coerce_to!', function(object, type, method) {
      var $a, self = this, coerced = nil;

      coerced = self.$coerce_to(object, type, method);
      if ((($a = type['$==='](coerced)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise(self.$type_error(object, type, method, coerced))
      };
      return coerced;
    });

    $opal.defs(self, '$coerce_to?', function(object, type, method) {
      var $a, self = this, coerced = nil;

      if ((($a = object['$respond_to?'](method)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return nil
      };
      coerced = self.$coerce_to(object, type, method);
      if ((($a = coerced['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return nil};
      if ((($a = type['$==='](coerced)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise(self.$type_error(object, type, method, coerced))
      };
      return coerced;
    });

    $opal.defs(self, '$try_convert', function(object, type, method) {
      var $a, self = this;

      if ((($a = type['$==='](object)) !== nil && (!$a._isBoolean || $a == true))) {
        return object};
      if ((($a = object['$respond_to?'](method)) !== nil && (!$a._isBoolean || $a == true))) {
        return object.$__send__(method)
        } else {
        return nil
      };
    });

    $opal.defs(self, '$compare', function(a, b) {
      var $a, self = this, compare = nil;

      compare = a['$<=>'](b);
      if ((($a = compare === nil) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "comparison of " + (a.$class().$name()) + " with " + (b.$class().$name()) + " failed")};
      return compare;
    });

    $opal.defs(self, '$destructure', function(args) {
      var self = this;

      
      if (args.length == 1) {
        return args[0];
      }
      else if (args._isArray) {
        return args;
      }
      else {
        return $slice.call(args);
      }
    
    });

    $opal.defs(self, '$respond_to?', function(obj, method) {
      var self = this;

      
      if (obj == null || !obj._klass) {
        return false;
      }
    
      return obj['$respond_to?'](method);
    });

    $opal.defs(self, '$inspect', function(obj) {
      var self = this;

      
      if (obj === undefined) {
        return "undefined";
      }
      else if (obj === null) {
        return "null";
      }
      else if (!obj._klass) {
        return obj.toString();
      }
      else {
        return obj.$inspect();
      }
    
    });
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/helpers.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$attr_reader', '$attr_writer', '$=~', '$raise', '$const_missing', '$to_str', '$to_proc', '$append_features', '$included', '$name', '$new', '$to_s']);
  return (function($base, $super) {
    function $Module(){};
    var self = $Module = $klass($base, $super, 'Module', $Module);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4;

    $opal.defs(self, '$new', TMP_1 = function() {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      
      function AnonModule(){}
      var klass     = Opal.boot(Opal.Module, AnonModule);
      klass._name   = nil;
      klass._klass  = Opal.Module;
      klass.__dep__ = []
      klass.__mod__ = true;
      klass._proto  = {};

      // inherit scope from parent
      $opal.create_scope(Opal.Module._scope, klass);

      if (block !== nil) {
        var block_self = block._s;
        block._s = null;
        block.call(klass);
        block._s = block_self;
      }

      return klass;
    
    });

    def['$==='] = function(object) {
      var $a, self = this;

      if ((($a = object == null) !== nil && (!$a._isBoolean || $a == true))) {
        return false};
      return $opal.is_a(object, self);
    };

    def['$<'] = function(other) {
      var self = this;

      
      var working = self;

      while (working) {
        if (working === other) {
          return true;
        }

        working = working.__parent;
      }

      return false;
    
    };

    def.$alias_method = function(newname, oldname) {
      var self = this;

      
      self._proto['$' + newname] = self._proto['$' + oldname];

      if (self._methods) {
        $opal.donate(self, ['$' + newname ])
      }
    
      return self;
    };

    def.$alias_native = function(mid, jsid) {
      var self = this;

      if (jsid == null) {
        jsid = mid
      }
      return self._proto['$' + mid] = self._proto[jsid];
    };

    def.$ancestors = function() {
      var self = this;

      
      var parent = self,
          result = [];

      while (parent) {
        result.push(parent);
        result = result.concat(parent.__inc__);

        parent = parent._super;
      }

      return result;
    
    };

    def.$append_features = function(klass) {
      var self = this;

      
      var module   = self,
          included = klass.__inc__;

      // check if this module is already included in the klass
      for (var i = 0, length = included.length; i < length; i++) {
        if (included[i] === module) {
          return;
        }
      }

      included.push(module);
      module.__dep__.push(klass);

      // iclass
      var iclass = {
        name: module._name,

        _proto:   module._proto,
        __parent: klass.__parent,
        __iclass: true
      };

      klass.__parent = iclass;

      var donator   = module._proto,
          prototype = klass._proto,
          methods   = module._methods;

      for (var i = 0, length = methods.length; i < length; i++) {
        var method = methods[i];

        if (prototype.hasOwnProperty(method) && !prototype[method]._donated) {
          // if the target class already has a method of the same name defined
          // and that method was NOT donated, then it must be a method defined
          // by the class so we do not want to override it
        }
        else {
          prototype[method] = donator[method];
          prototype[method]._donated = true;
        }
      }

      if (klass.__dep__) {
        $opal.donate(klass, methods.slice(), true);
      }

      $opal.donate_constants(module, klass);
    
      return self;
    };

    def.$attr_accessor = function(names) {
      var $a, $b, self = this;

      names = $slice.call(arguments, 0);
      ($a = self).$attr_reader.apply($a, [].concat(names));
      return ($b = self).$attr_writer.apply($b, [].concat(names));
    };

    def.$attr_reader = function(names) {
      var self = this;

      names = $slice.call(arguments, 0);
      
      var proto = self._proto, cls = self;
      for (var i = 0, length = names.length; i < length; i++) {
        (function(name) {
          proto[name] = nil;
          var func = function() { return this[name] };

          if (cls._isSingleton) {
            proto.constructor.prototype['$' + name] = func;
          }
          else {
            proto['$' + name] = func;
            $opal.donate(self, ['$' + name ]);
          }
        })(names[i]);
      }
    
      return nil;
    };

    def.$attr_writer = function(names) {
      var self = this;

      names = $slice.call(arguments, 0);
      
      var proto = self._proto, cls = self;
      for (var i = 0, length = names.length; i < length; i++) {
        (function(name) {
          proto[name] = nil;
          var func = function(value) { return this[name] = value; };

          if (cls._isSingleton) {
            proto.constructor.prototype['$' + name + '='] = func;
          }
          else {
            proto['$' + name + '='] = func;
            $opal.donate(self, ['$' + name + '=']);
          }
        })(names[i]);
      }
    
      return nil;
    };

    $opal.defn(self, '$attr', def.$attr_accessor);

    def.$constants = function() {
      var self = this;

      return self._scope.constants;
    };

    def['$const_defined?'] = function(name, inherit) {
      var $a, self = this;

      if (inherit == null) {
        inherit = true
      }
      if ((($a = name['$=~'](/^[A-Z]\w*$/)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.NameError) == null ? $opal.cm('NameError') : $a), "wrong constant name " + (name))
      };
      
      scopes = [self._scope];
      if (inherit || self === Opal.Object) {
        var parent = self._super;
        while (parent !== Opal.BasicObject) {
          scopes.push(parent._scope);
          parent = parent._super;
        }
      }

      for (var i = 0, len = scopes.length; i < len; i++) {
        if (scopes[i].hasOwnProperty(name)) {
          return true;
        }
      }

      return false;
    
    };

    def.$const_get = function(name, inherit) {
      var $a, self = this;

      if (inherit == null) {
        inherit = true
      }
      if ((($a = name['$=~'](/^[A-Z]\w*$/)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.NameError) == null ? $opal.cm('NameError') : $a), "wrong constant name " + (name))
      };
      
      var scopes = [self._scope];
      if (inherit || self == Opal.Object) {
        var parent = self._super;
        while (parent !== Opal.BasicObject) {
          scopes.push(parent._scope);
          parent = parent._super;
        }
      }

      for (var i = 0, len = scopes.length; i < len; i++) {
        if (scopes[i].hasOwnProperty(name)) {
          return scopes[i][name];
        }
      }

      return self.$const_missing(name);
    
    };

    def.$const_missing = function(const$) {
      var $a, self = this, name = nil;

      name = self._name;
      return self.$raise((($a = $scope.NameError) == null ? $opal.cm('NameError') : $a), "uninitialized constant " + (name) + "::" + (const$));
    };

    def.$const_set = function(name, value) {
      var $a, self = this;

      if ((($a = name['$=~'](/^[A-Z]\w*$/)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.NameError) == null ? $opal.cm('NameError') : $a), "wrong constant name " + (name))
      };
      try {
      name = name.$to_str()
      } catch ($err) {if (true) {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "conversion with #to_str failed")
        }else { throw $err; }
      };
      
      $opal.casgn(self, name, value);
      return value
    ;
    };

    def.$define_method = TMP_2 = function(name, method) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      
      if (method) {
        block = method.$to_proc();
      }

      if (block === nil) {
        throw new Error("no block given");
      }

      var jsid    = '$' + name;
      block._jsid = name;
      block._s    = null;
      block._def  = block;

      self._proto[jsid] = block;
      $opal.donate(self, [jsid]);

      return name;
    ;
    };

    def.$remove_method = function(name) {
      var self = this;

      
      var jsid    = '$' + name;
      var current = self._proto[jsid];
      delete self._proto[jsid];

      // Check if we need to reverse $opal.donate
      // $opal.retire(self, [jsid]);
      return self;
    
    };

    def.$include = function(mods) {
      var self = this;

      mods = $slice.call(arguments, 0);
      
      for (var i = mods.length - 1; i >= 0; i--) {
        var mod = mods[i];

        if (mod === self) {
          continue;
        }

        (mod).$append_features(self);
        (mod).$included(self);
      }
    
      return self;
    };

    def['$include?'] = function(mod) {
      var self = this;

      
      for (var cls = self; cls; cls = cls.parent) {
        for (var i = 0; i != cls.__inc__.length; i++) {
          var mod2 = cls.__inc__[i];
          if (mod === mod2) {
            return true;
          }
        }
      }
      return false;
    
    };

    def.$instance_method = function(name) {
      var $a, self = this;

      
      var meth = self._proto['$' + name];

      if (!meth || meth.rb_stub) {
        self.$raise((($a = $scope.NameError) == null ? $opal.cm('NameError') : $a), "undefined method `" + (name) + "' for class `" + (self.$name()) + "'");
      }

      return (($a = $scope.UnboundMethod) == null ? $opal.cm('UnboundMethod') : $a).$new(self, meth, name);
    
    };

    def.$instance_methods = function(include_super) {
      var self = this;

      if (include_super == null) {
        include_super = false
      }
      
      var methods = [], proto = self._proto;

      for (var prop in self._proto) {
        if (!include_super && !proto.hasOwnProperty(prop)) {
          continue;
        }

        if (!include_super && proto[prop]._donated) {
          continue;
        }

        if (prop.charAt(0) === '$') {
          methods.push(prop.substr(1));
        }
      }

      return methods;
    
    };

    def.$included = function(mod) {
      var self = this;

      return nil;
    };

    def.$extended = function(mod) {
      var self = this;

      return nil;
    };

    def.$module_eval = TMP_3 = function() {
      var $a, self = this, $iter = TMP_3._p, block = $iter || nil;

      TMP_3._p = null;
      if (block !== false && block !== nil) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "no block given")
      };
      
      var old = block._s,
          result;

      block._s = null;
      result = block.call(self);
      block._s = old;

      return result;
    
    };

    $opal.defn(self, '$class_eval', def.$module_eval);

    def.$module_exec = TMP_4 = function() {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      
      if (block === nil) {
        throw new Error("no block given");
      }

      var block_self = block._s, result;

      block._s = null;
      result = block.apply(self, $slice.call(arguments));
      block._s = block_self;

      return result;
    
    };

    $opal.defn(self, '$class_exec', def.$module_exec);

    def['$method_defined?'] = function(method) {
      var self = this;

      
      var body = self._proto['$' + method];
      return (!!body) && !body.rb_stub;
    
    };

    def.$module_function = function(methods) {
      var self = this;

      methods = $slice.call(arguments, 0);
      
      for (var i = 0, length = methods.length; i < length; i++) {
        var meth = methods[i], func = self._proto['$' + meth];

        self.constructor.prototype['$' + meth] = func;
      }

      return self;
    
    };

    def.$name = function() {
      var self = this;

      
      if (self._full_name) {
        return self._full_name;
      }

      var result = [], base = self;

      while (base) {
        if (base._name === nil) {
          return result.length === 0 ? nil : result.join('::');
        }

        result.unshift(base._name);

        base = base._base_module;

        if (base === $opal.Object) {
          break;
        }
      }

      if (result.length === 0) {
        return nil;
      }

      return self._full_name = result.join('::');
    
    };

    def.$public = function() {
      var self = this;

      return nil;
    };

    def.$private_class_method = function(name) {
      var self = this;

      return self['$' + name] || nil;
    };

    $opal.defn(self, '$private', def.$public);

    $opal.defn(self, '$protected', def.$public);

    def['$private_method_defined?'] = function(obj) {
      var self = this;

      return false;
    };

    def.$private_constant = function() {
      var self = this;

      return nil;
    };

    $opal.defn(self, '$protected_method_defined?', def['$private_method_defined?']);

    $opal.defn(self, '$public_instance_methods', def.$instance_methods);

    $opal.defn(self, '$public_method_defined?', def['$method_defined?']);

    def.$remove_class_variable = function() {
      var self = this;

      return nil;
    };

    def.$remove_const = function(name) {
      var self = this;

      
      var old = self._scope[name];
      delete self._scope[name];
      return old;
    
    };

    def.$to_s = function() {
      var self = this;

      return self.$name().$to_s();
    };

    return (def.$undef_method = function(symbol) {
      var self = this;

      $opal.add_stub_for(self._proto, "$" + symbol);
      return self;
    }, nil) && 'undef_method';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/module.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$raise', '$allocate']);
  ;
  return (function($base, $super) {
    function $Class(){};
    var self = $Class = $klass($base, $super, 'Class', $Class);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2;

    $opal.defs(self, '$new', TMP_1 = function(sup) {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil;

      if (sup == null) {
        sup = (($a = $scope.Object) == null ? $opal.cm('Object') : $a)
      }
      TMP_1._p = null;
      
      if (!sup._isClass || sup.__mod__) {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "superclass must be a Class");
      }

      function AnonClass(){};
      var klass       = Opal.boot(sup, AnonClass)
      klass._name     = nil;
      klass.__parent  = sup;

      // inherit scope from parent
      $opal.create_scope(sup._scope, klass);

      sup.$inherited(klass);

      if (block !== nil) {
        var block_self = block._s;
        block._s = null;
        block.call(klass);
        block._s = block_self;
      }

      return klass;
    ;
    });

    def.$allocate = function() {
      var self = this;

      
      var obj = new self._alloc;
      obj._id = Opal.uid();
      return obj;
    
    };

    def.$inherited = function(cls) {
      var self = this;

      return nil;
    };

    def.$new = TMP_2 = function(args) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_2._p = null;
      
      var obj = self.$allocate();

      obj.$initialize._p = block;
      obj.$initialize.apply(obj, args);
      return obj;
    ;
    };

    return (def.$superclass = function() {
      var self = this;

      return self._super || nil;
    }, nil) && 'superclass';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/class.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$raise']);
  return (function($base, $super) {
    function $BasicObject(){};
    var self = $BasicObject = $klass($base, $super, 'BasicObject', $BasicObject);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4;

    $opal.defn(self, '$initialize', function() {
      var self = this;

      return nil;
    });

    $opal.defn(self, '$==', function(other) {
      var self = this;

      return self === other;
    });

    $opal.defn(self, '$__id__', function() {
      var self = this;

      return self._id || (self._id = Opal.uid());
    });

    $opal.defn(self, '$__send__', TMP_1 = function(symbol, args) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_1._p = null;
      
      var func = self['$' + symbol]

      if (func) {
        if (block !== nil) {
          func._p = block;
        }

        return func.apply(self, args);
      }

      if (block !== nil) {
        self.$method_missing._p = block;
      }

      return self.$method_missing.apply(self, [symbol].concat(args));
    
    });

    $opal.defn(self, '$!', function() {
      var self = this;

      return false;
    });

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$equal?', def['$==']);

    $opal.defn(self, '$instance_eval', TMP_2 = function() {
      var $a, self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      if (block !== false && block !== nil) {
        } else {
        (($a = $scope.Kernel) == null ? $opal.cm('Kernel') : $a).$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "no block given")
      };
      
      var old = block._s,
          result;

      block._s = null;
      result = block.call(self, self);
      block._s = old;

      return result;
    
    });

    $opal.defn(self, '$instance_exec', TMP_3 = function(args) {
      var $a, self = this, $iter = TMP_3._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_3._p = null;
      if (block !== false && block !== nil) {
        } else {
        (($a = $scope.Kernel) == null ? $opal.cm('Kernel') : $a).$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "no block given")
      };
      
      var block_self = block._s,
          result;

      block._s = null;
      result = block.apply(self, args);
      block._s = block_self;

      return result;
    
    });

    return ($opal.defn(self, '$method_missing', TMP_4 = function(symbol, args) {
      var $a, self = this, $iter = TMP_4._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_4._p = null;
      return (($a = $scope.Kernel) == null ? $opal.cm('Kernel') : $a).$raise((($a = $scope.NoMethodError) == null ? $opal.cm('NoMethodError') : $a), "undefined method `" + (symbol) + "' for BasicObject instance");
    }), nil) && 'method_missing';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/basic_object.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $gvars = $opal.gvars;

  $opal.add_stubs(['$raise', '$inspect', '$==', '$name', '$class', '$new', '$respond_to?', '$to_ary', '$to_a', '$allocate', '$copy_instance_variables', '$initialize_clone', '$initialize_copy', '$singleton_class', '$initialize_dup', '$for', '$to_proc', '$append_features', '$extended', '$to_i', '$to_s', '$to_f', '$*', '$===', '$empty?', '$ArgumentError', '$nan?', '$infinite?', '$to_int', '$>', '$length', '$print', '$format', '$puts', '$each', '$<=', '$[]', '$nil?', '$is_a?', '$rand', '$coerce_to', '$respond_to_missing?']);
  return (function($base) {
    var self = $module($base, 'Kernel');

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_9;

    def.$method_missing = TMP_1 = function(symbol, args) {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_1._p = null;
      return self.$raise((($a = $scope.NoMethodError) == null ? $opal.cm('NoMethodError') : $a), "undefined method `" + (symbol) + "' for " + (self.$inspect()));
    };

    def['$=~'] = function(obj) {
      var self = this;

      return false;
    };

    def['$==='] = function(other) {
      var self = this;

      return self['$=='](other);
    };

    def['$<=>'] = function(other) {
      var self = this;

      
      if (self['$=='](other)) {
        return 0;
      }

      return nil;
    ;
    };

    def.$method = function(name) {
      var $a, self = this;

      
      var meth = self['$' + name];

      if (!meth || meth.rb_stub) {
        self.$raise((($a = $scope.NameError) == null ? $opal.cm('NameError') : $a), "undefined method `" + (name) + "' for class `" + (self.$class().$name()) + "'");
      }

      return (($a = $scope.Method) == null ? $opal.cm('Method') : $a).$new(self, meth, name);
    
    };

    def.$methods = function(all) {
      var self = this;

      if (all == null) {
        all = true
      }
      
      var methods = [];

      for (var key in self) {
        if (key[0] == "$" && typeof(self[key]) === "function") {
          if (all == false || all === nil) {
            if (!$opal.hasOwnProperty.call(self, key)) {
              continue;
            }
          }
          if (self[key].rb_stub === undefined) {
            methods.push(key.substr(1));
          }
        }
      }

      return methods;
    
    };

    def.$Array = TMP_2 = function(object, args) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_2._p = null;
      
      if (object == null || object === nil) {
        return [];
      }
      else if (object['$respond_to?']("to_ary")) {
        return object.$to_ary();
      }
      else if (object['$respond_to?']("to_a")) {
        return object.$to_a();
      }
      else {
        return [object];
      }
    ;
    };

    def.$caller = function() {
      var self = this;

      return [];
    };

    def.$class = function() {
      var self = this;

      return self._klass;
    };

    def.$copy_instance_variables = function(other) {
      var self = this;

      
      for (var name in other) {
        if (name.charAt(0) !== '$') {
          if (name !== '_id' && name !== '_klass') {
            self[name] = other[name];
          }
        }
      }
    
    };

    def.$clone = function() {
      var self = this, copy = nil;

      copy = self.$class().$allocate();
      copy.$copy_instance_variables(self);
      copy.$initialize_clone(self);
      return copy;
    };

    def.$initialize_clone = function(other) {
      var self = this;

      return self.$initialize_copy(other);
    };

    def.$define_singleton_method = TMP_3 = function(name) {
      var $a, self = this, $iter = TMP_3._p, body = $iter || nil;

      TMP_3._p = null;
      if (body !== false && body !== nil) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to create Proc object without a block")
      };
      
      var jsid   = '$' + name;
      body._jsid = name;
      body._s    = null;
      body._def  = body;

      self.$singleton_class()._proto[jsid] = body;

      return self;
    
    };

    def.$dup = function() {
      var self = this, copy = nil;

      copy = self.$class().$allocate();
      copy.$copy_instance_variables(self);
      copy.$initialize_dup(self);
      return copy;
    };

    def.$initialize_dup = function(other) {
      var self = this;

      return self.$initialize_copy(other);
    };

    def.$enum_for = TMP_4 = function(method, args) {
      var $a, $b, $c, self = this, $iter = TMP_4._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      if (method == null) {
        method = "each"
      }
      TMP_4._p = null;
      return ($a = ($b = (($c = $scope.Enumerator) == null ? $opal.cm('Enumerator') : $c)).$for, $a._p = block.$to_proc(), $a).apply($b, [self, method].concat(args));
    };

    $opal.defn(self, '$to_enum', def.$enum_for);

    def['$equal?'] = function(other) {
      var self = this;

      return self === other;
    };

    def.$extend = function(mods) {
      var self = this;

      mods = $slice.call(arguments, 0);
      
      var singleton = self.$singleton_class();

      for (var i = mods.length - 1; i >= 0; i--) {
        var mod = mods[i];

        (mod).$append_features(singleton);
        (mod).$extended(self);
      }
    ;
      return self;
    };

    def.$format = function(format, args) {
      var self = this;

      args = $slice.call(arguments, 1);
      
      var idx = 0;
      return format.replace(/%(\d+\$)?([-+ 0]*)(\d*|\*(\d+\$)?)(?:\.(\d*|\*(\d+\$)?))?([cspdiubBoxXfgeEG])|(%%)/g, function(str, idx_str, flags, width_str, w_idx_str, prec_str, p_idx_str, spec, escaped) {
        if (escaped) {
          return '%';
        }

        var width,
        prec,
        is_integer_spec = ("diubBoxX".indexOf(spec) != -1),
        is_float_spec = ("eEfgG".indexOf(spec) != -1),
        prefix = '',
        obj;

        if (width_str === undefined) {
          width = undefined;
        } else if (width_str.charAt(0) == '*') {
          var w_idx = idx++;
          if (w_idx_str) {
            w_idx = parseInt(w_idx_str, 10) - 1;
          }
          width = (args[w_idx]).$to_i();
        } else {
          width = parseInt(width_str, 10);
        }
        if (!prec_str) {
          prec = is_float_spec ? 6 : undefined;
        } else if (prec_str.charAt(0) == '*') {
          var p_idx = idx++;
          if (p_idx_str) {
            p_idx = parseInt(p_idx_str, 10) - 1;
          }
          prec = (args[p_idx]).$to_i();
        } else {
          prec = parseInt(prec_str, 10);
        }
        if (idx_str) {
          idx = parseInt(idx_str, 10) - 1;
        }
        switch (spec) {
        case 'c':
          obj = args[idx];
          if (obj._isString) {
            str = obj.charAt(0);
          } else {
            str = String.fromCharCode((obj).$to_i());
          }
          break;
        case 's':
          str = (args[idx]).$to_s();
          if (prec !== undefined) {
            str = str.substr(0, prec);
          }
          break;
        case 'p':
          str = (args[idx]).$inspect();
          if (prec !== undefined) {
            str = str.substr(0, prec);
          }
          break;
        case 'd':
        case 'i':
        case 'u':
          str = (args[idx]).$to_i().toString();
          break;
        case 'b':
        case 'B':
          str = (args[idx]).$to_i().toString(2);
          break;
        case 'o':
          str = (args[idx]).$to_i().toString(8);
          break;
        case 'x':
        case 'X':
          str = (args[idx]).$to_i().toString(16);
          break;
        case 'e':
        case 'E':
          str = (args[idx]).$to_f().toExponential(prec);
          break;
        case 'f':
          str = (args[idx]).$to_f().toFixed(prec);
          break;
        case 'g':
        case 'G':
          str = (args[idx]).$to_f().toPrecision(prec);
          break;
        }
        idx++;
        if (is_integer_spec || is_float_spec) {
          if (str.charAt(0) == '-') {
            prefix = '-';
            str = str.substr(1);
          } else {
            if (flags.indexOf('+') != -1) {
              prefix = '+';
            } else if (flags.indexOf(' ') != -1) {
              prefix = ' ';
            }
          }
        }
        if (is_integer_spec && prec !== undefined) {
          if (str.length < prec) {
            str = "0"['$*'](prec - str.length) + str;
          }
        }
        var total_len = prefix.length + str.length;
        if (width !== undefined && total_len < width) {
          if (flags.indexOf('-') != -1) {
            str = str + " "['$*'](width - total_len);
          } else {
            var pad_char = ' ';
            if (flags.indexOf('0') != -1) {
              str = "0"['$*'](width - total_len) + str;
            } else {
              prefix = " "['$*'](width - total_len) + prefix;
            }
          }
        }
        var result = prefix + str;
        if ('XEG'.indexOf(spec) != -1) {
          result = result.toUpperCase();
        }
        return result;
      });
    
    };

    def.$hash = function() {
      var self = this;

      return self._id;
    };

    def.$initialize_copy = function(other) {
      var self = this;

      return nil;
    };

    def.$inspect = function() {
      var self = this;

      return self.$to_s();
    };

    def['$instance_of?'] = function(klass) {
      var self = this;

      return self._klass === klass;
    };

    def['$instance_variable_defined?'] = function(name) {
      var self = this;

      return $opal.hasOwnProperty.call(self, name.substr(1));
    };

    def.$instance_variable_get = function(name) {
      var self = this;

      
      var ivar = self[name.substr(1)];

      return ivar == null ? nil : ivar;
    
    };

    def.$instance_variable_set = function(name, value) {
      var self = this;

      return self[name.substr(1)] = value;
    };

    def.$instance_variables = function() {
      var self = this;

      
      var result = [];

      for (var name in self) {
        if (name.charAt(0) !== '$') {
          if (name !== '_klass' && name !== '_id') {
            result.push('@' + name);
          }
        }
      }

      return result;
    
    };

    def.$Integer = function(value, base) {
      var $a, $b, self = this, $case = nil;

      if (base == null) {
        base = nil
      }
      if ((($a = (($b = $scope.String) == null ? $opal.cm('String') : $b)['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = value['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "invalid value for Integer: (empty string)")};
        return parseInt(value, ((($a = base) !== false && $a !== nil) ? $a : undefined));};
      if (base !== false && base !== nil) {
        self.$raise(self.$ArgumentError("base is only valid for String values"))};
      return (function() {$case = value;if ((($a = $scope.Integer) == null ? $opal.cm('Integer') : $a)['$===']($case)) {return value}else if ((($a = $scope.Float) == null ? $opal.cm('Float') : $a)['$===']($case)) {if ((($a = ((($b = value['$nan?']()) !== false && $b !== nil) ? $b : value['$infinite?']())) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.FloatDomainError) == null ? $opal.cm('FloatDomainError') : $a), "unable to coerce " + (value) + " to Integer")};
      return value.$to_int();}else if ((($a = $scope.NilClass) == null ? $opal.cm('NilClass') : $a)['$===']($case)) {return self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "can't convert nil into Integer")}else {if ((($a = value['$respond_to?']("to_int")) !== nil && (!$a._isBoolean || $a == true))) {
        return value.$to_int()
      } else if ((($a = value['$respond_to?']("to_i")) !== nil && (!$a._isBoolean || $a == true))) {
        return value.$to_i()
        } else {
        return self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "can't convert " + (value.$class()) + " into Integer")
      }}})();
    };

    def.$Float = function(value) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.String) == null ? $opal.cm('String') : $b)['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
        return parseFloat(value);
      } else if ((($a = value['$respond_to?']("to_f")) !== nil && (!$a._isBoolean || $a == true))) {
        return value.$to_f()
        } else {
        return self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "can't convert " + (value.$class()) + " into Float")
      };
    };

    def['$is_a?'] = function(klass) {
      var self = this;

      return $opal.is_a(self, klass);
    };

    $opal.defn(self, '$kind_of?', def['$is_a?']);

    def.$lambda = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      block.is_lambda = true;
      return block;
    };

    def.$loop = TMP_6 = function() {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      
      while (true) {
        if (block() === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def['$nil?'] = function() {
      var self = this;

      return false;
    };

    $opal.defn(self, '$object_id', def.$__id__);

    def.$printf = function(args) {
      var $a, self = this;

      args = $slice.call(arguments, 0);
      if (args.$length()['$>'](0)) {
        self.$print(($a = self).$format.apply($a, [].concat(args)))};
      return nil;
    };

    def.$private_methods = function() {
      var self = this;

      return [];
    };

    def.$proc = TMP_7 = function() {
      var $a, self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      if (block !== false && block !== nil) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to create Proc object without a block")
      };
      block.is_lambda = false;
      return block;
    };

    def.$puts = function(strs) {
      var $a, self = this;
      if ($gvars.stdout == null) $gvars.stdout = nil;

      strs = $slice.call(arguments, 0);
      return ($a = $gvars.stdout).$puts.apply($a, [].concat(strs));
    };

    def.$p = function(args) {
      var $a, $b, TMP_8, self = this;

      args = $slice.call(arguments, 0);
      ($a = ($b = args).$each, $a._p = (TMP_8 = function(obj){var self = TMP_8._s || this;
        if ($gvars.stdout == null) $gvars.stdout = nil;
if (obj == null) obj = nil;
      return $gvars.stdout.$puts(obj.$inspect())}, TMP_8._s = self, TMP_8), $a).call($b);
      if (args.$length()['$<='](1)) {
        return args['$[]'](0)
        } else {
        return args
      };
    };

    def.$print = function(strs) {
      var $a, self = this;
      if ($gvars.stdout == null) $gvars.stdout = nil;

      strs = $slice.call(arguments, 0);
      return ($a = $gvars.stdout).$print.apply($a, [].concat(strs));
    };

    def.$warn = function(strs) {
      var $a, $b, self = this;
      if ($gvars.VERBOSE == null) $gvars.VERBOSE = nil;
      if ($gvars.stderr == null) $gvars.stderr = nil;

      strs = $slice.call(arguments, 0);
      if ((($a = ((($b = $gvars.VERBOSE['$nil?']()) !== false && $b !== nil) ? $b : strs['$empty?']())) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        ($a = $gvars.stderr).$puts.apply($a, [].concat(strs))
      };
      return nil;
    };

    def.$raise = function(exception, string) {
      var $a, self = this;
      if ($gvars["!"] == null) $gvars["!"] = nil;

      
      if (exception == null && $gvars["!"]) {
        exception = $gvars["!"];
      }
      else if (exception._isString) {
        exception = (($a = $scope.RuntimeError) == null ? $opal.cm('RuntimeError') : $a).$new(exception);
      }
      else if (!exception['$is_a?']((($a = $scope.Exception) == null ? $opal.cm('Exception') : $a))) {
        exception = exception.$new(string);
      }

      $gvars["!"] = exception;
      throw exception;
    ;
    };

    $opal.defn(self, '$fail', def.$raise);

    def.$rand = function(max) {
      var $a, self = this;

      
      if (max === undefined) {
        return Math.random();
      }
      else if (max._isRange) {
        var arr = max.$to_a();

        return arr[self.$rand(arr.length)];
      }
      else {
        return Math.floor(Math.random() *
          Math.abs((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(max, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int")));
      }
    
    };

    $opal.defn(self, '$srand', def.$rand);

    def['$respond_to?'] = function(name, include_all) {
      var $a, self = this;

      if (include_all == null) {
        include_all = false
      }
      if ((($a = self['$respond_to_missing?'](name)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      
      var body = self['$' + name];

      if (typeof(body) === "function" && !body.rb_stub) {
        return true;
      }
    
      return false;
    };

    $opal.defn(self, '$send', def.$__send__);

    $opal.defn(self, '$public_send', def.$__send__);

    def.$singleton_class = function() {
      var self = this;

      
      if (self._isClass) {
        if (self.__meta__) {
          return self.__meta__;
        }

        var meta = new $opal.Class._alloc;
        meta._klass = $opal.Class;
        self.__meta__ = meta;
        // FIXME - is this right? (probably - methods defined on
        // class' singleton should also go to subclasses?)
        meta._proto = self.constructor.prototype;
        meta._isSingleton = true;
        meta.__inc__ = [];
        meta._methods = [];

        meta._scope = self._scope;

        return meta;
      }

      if (self._isClass) {
        return self._klass;
      }

      if (self.__meta__) {
        return self.__meta__;
      }

      else {
        var orig_class = self._klass,
            class_id   = "#<Class:#<" + orig_class._name + ":" + orig_class._id + ">>";

        var Singleton = function () {};
        var meta = Opal.boot(orig_class, Singleton);
        meta._name = class_id;

        meta._proto = self;
        self.__meta__ = meta;
        meta._klass = orig_class._klass;
        meta._scope = orig_class._scope;
        meta.__parent = orig_class;

        return meta;
      }
    
    };

    $opal.defn(self, '$sprintf', def.$format);

    def.$String = function(str) {
      var self = this;

      return String(str);
    };

    def.$tap = TMP_9 = function() {
      var self = this, $iter = TMP_9._p, block = $iter || nil;

      TMP_9._p = null;
      if ($opal.$yield1(block, self) === $breaker) return $breaker.$v;
      return self;
    };

    def.$to_proc = function() {
      var self = this;

      return self;
    };

    def.$to_s = function() {
      var self = this;

      return "#<" + self.$class().$name() + ":" + self._id + ">";
    };

    def.$freeze = function() {
      var self = this;

      self.___frozen___ = true;
      return self;
    };

    def['$frozen?'] = function() {
      var $a, self = this;
      if (self.___frozen___ == null) self.___frozen___ = nil;

      return ((($a = self.___frozen___) !== false && $a !== nil) ? $a : false);
    };

    def['$respond_to_missing?'] = function(method_name) {
      var self = this;

      return false;
    };
        ;$opal.donate(self, ["$method_missing", "$=~", "$===", "$<=>", "$method", "$methods", "$Array", "$caller", "$class", "$copy_instance_variables", "$clone", "$initialize_clone", "$define_singleton_method", "$dup", "$initialize_dup", "$enum_for", "$to_enum", "$equal?", "$extend", "$format", "$hash", "$initialize_copy", "$inspect", "$instance_of?", "$instance_variable_defined?", "$instance_variable_get", "$instance_variable_set", "$instance_variables", "$Integer", "$Float", "$is_a?", "$kind_of?", "$lambda", "$loop", "$nil?", "$object_id", "$printf", "$private_methods", "$proc", "$puts", "$p", "$print", "$warn", "$raise", "$fail", "$rand", "$srand", "$respond_to?", "$send", "$public_send", "$singleton_class", "$sprintf", "$String", "$tap", "$to_proc", "$to_s", "$freeze", "$frozen?", "$respond_to_missing?"]);
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/kernel.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$raise']);
  (function($base, $super) {
    function $NilClass(){};
    var self = $NilClass = $klass($base, $super, 'NilClass', $NilClass);

    var def = self._proto, $scope = self._scope;

    def['$!'] = function() {
      var self = this;

      return true;
    };

    def['$&'] = function(other) {
      var self = this;

      return false;
    };

    def['$|'] = function(other) {
      var self = this;

      return other !== false && other !== nil;
    };

    def['$^'] = function(other) {
      var self = this;

      return other !== false && other !== nil;
    };

    def['$=='] = function(other) {
      var self = this;

      return other === nil;
    };

    def.$dup = function() {
      var $a, self = this;

      return self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a));
    };

    def.$inspect = function() {
      var self = this;

      return "nil";
    };

    def['$nil?'] = function() {
      var self = this;

      return true;
    };

    def.$singleton_class = function() {
      var $a, self = this;

      return (($a = $scope.NilClass) == null ? $opal.cm('NilClass') : $a);
    };

    def.$to_a = function() {
      var self = this;

      return [];
    };

    def.$to_h = function() {
      var self = this;

      return $opal.hash();
    };

    def.$to_i = function() {
      var self = this;

      return 0;
    };

    $opal.defn(self, '$to_f', def.$to_i);

    def.$to_s = function() {
      var self = this;

      return "";
    };

    def.$object_id = function() {
      var $a, self = this;

      return (($a = $scope.NilClass) == null ? $opal.cm('NilClass') : $a)._id || ((($a = $scope.NilClass) == null ? $opal.cm('NilClass') : $a)._id = $opal.uid());
    };

    return $opal.defn(self, '$hash', def.$object_id);
  })(self, null);
  return $opal.cdecl($scope, 'NIL', nil);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/nil_class.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$undef_method']);
  (function($base, $super) {
    function $Boolean(){};
    var self = $Boolean = $klass($base, $super, 'Boolean', $Boolean);

    var def = self._proto, $scope = self._scope;

    def._isBoolean = true;

    (function(self) {
      var $scope = self._scope, def = self._proto;

      return self.$undef_method("new")
    })(self.$singleton_class());

    def['$!'] = function() {
      var self = this;

      return self != true;
    };

    def['$&'] = function(other) {
      var self = this;

      return (self == true) ? (other !== false && other !== nil) : false;
    };

    def['$|'] = function(other) {
      var self = this;

      return (self == true) ? true : (other !== false && other !== nil);
    };

    def['$^'] = function(other) {
      var self = this;

      return (self == true) ? (other === false || other === nil) : (other !== false && other !== nil);
    };

    def['$=='] = function(other) {
      var self = this;

      return (self == true) === other.valueOf();
    };

    $opal.defn(self, '$equal?', def['$==']);

    $opal.defn(self, '$singleton_class', def.$class);

    return (def.$to_s = function() {
      var self = this;

      return (self == true) ? 'true' : 'false';
    }, nil) && 'to_s';
  })(self, null);
  $opal.cdecl($scope, 'TrueClass', (($a = $scope.Boolean) == null ? $opal.cm('Boolean') : $a));
  $opal.cdecl($scope, 'FalseClass', (($a = $scope.Boolean) == null ? $opal.cm('Boolean') : $a));
  $opal.cdecl($scope, 'TRUE', true);
  return $opal.cdecl($scope, 'FALSE', false);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/boolean.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module;

  $opal.add_stubs(['$attr_reader', '$name', '$class']);
  (function($base, $super) {
    function $Exception(){};
    var self = $Exception = $klass($base, $super, 'Exception', $Exception);

    var def = self._proto, $scope = self._scope;

    def.message = nil;
    self.$attr_reader("message");

    $opal.defs(self, '$new', function(message) {
      var self = this;

      if (message == null) {
        message = ""
      }
      
      var err = new Error(message);
      err._klass = self;
      err.name = self._name;
      return err;
    
    });

    def.$backtrace = function() {
      var self = this;

      
      var backtrace = self.stack;

      if (typeof(backtrace) === 'string') {
        return backtrace.split("\n").slice(0, 15);
      }
      else if (backtrace) {
        return backtrace.slice(0, 15);
      }

      return [];
    
    };

    def.$inspect = function() {
      var self = this;

      return "#<" + (self.$class().$name()) + ": '" + (self.message) + "'>";
    };

    return $opal.defn(self, '$to_s', def.$message);
  })(self, null);
  (function($base, $super) {
    function $ScriptError(){};
    var self = $ScriptError = $klass($base, $super, 'ScriptError', $ScriptError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.Exception) == null ? $opal.cm('Exception') : $a));
  (function($base, $super) {
    function $SyntaxError(){};
    var self = $SyntaxError = $klass($base, $super, 'SyntaxError', $SyntaxError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.ScriptError) == null ? $opal.cm('ScriptError') : $a));
  (function($base, $super) {
    function $LoadError(){};
    var self = $LoadError = $klass($base, $super, 'LoadError', $LoadError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.ScriptError) == null ? $opal.cm('ScriptError') : $a));
  (function($base, $super) {
    function $NotImplementedError(){};
    var self = $NotImplementedError = $klass($base, $super, 'NotImplementedError', $NotImplementedError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.ScriptError) == null ? $opal.cm('ScriptError') : $a));
  (function($base, $super) {
    function $SystemExit(){};
    var self = $SystemExit = $klass($base, $super, 'SystemExit', $SystemExit);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.Exception) == null ? $opal.cm('Exception') : $a));
  (function($base, $super) {
    function $StandardError(){};
    var self = $StandardError = $klass($base, $super, 'StandardError', $StandardError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.Exception) == null ? $opal.cm('Exception') : $a));
  (function($base, $super) {
    function $NameError(){};
    var self = $NameError = $klass($base, $super, 'NameError', $NameError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));
  (function($base, $super) {
    function $NoMethodError(){};
    var self = $NoMethodError = $klass($base, $super, 'NoMethodError', $NoMethodError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.NameError) == null ? $opal.cm('NameError') : $a));
  (function($base, $super) {
    function $RuntimeError(){};
    var self = $RuntimeError = $klass($base, $super, 'RuntimeError', $RuntimeError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));
  (function($base, $super) {
    function $LocalJumpError(){};
    var self = $LocalJumpError = $klass($base, $super, 'LocalJumpError', $LocalJumpError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));
  (function($base, $super) {
    function $TypeError(){};
    var self = $TypeError = $klass($base, $super, 'TypeError', $TypeError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));
  (function($base, $super) {
    function $ArgumentError(){};
    var self = $ArgumentError = $klass($base, $super, 'ArgumentError', $ArgumentError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));
  (function($base, $super) {
    function $IndexError(){};
    var self = $IndexError = $klass($base, $super, 'IndexError', $IndexError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));
  (function($base, $super) {
    function $StopIteration(){};
    var self = $StopIteration = $klass($base, $super, 'StopIteration', $StopIteration);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a));
  (function($base, $super) {
    function $KeyError(){};
    var self = $KeyError = $klass($base, $super, 'KeyError', $KeyError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a));
  (function($base, $super) {
    function $RangeError(){};
    var self = $RangeError = $klass($base, $super, 'RangeError', $RangeError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));
  (function($base, $super) {
    function $FloatDomainError(){};
    var self = $FloatDomainError = $klass($base, $super, 'FloatDomainError', $FloatDomainError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.RangeError) == null ? $opal.cm('RangeError') : $a));
  (function($base, $super) {
    function $IOError(){};
    var self = $IOError = $klass($base, $super, 'IOError', $IOError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));
  (function($base, $super) {
    function $SystemCallError(){};
    var self = $SystemCallError = $klass($base, $super, 'SystemCallError', $SystemCallError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));
  return (function($base) {
    var self = $module($base, 'Errno');

    var def = self._proto, $scope = self._scope, $a;

    (function($base, $super) {
      function $EINVAL(){};
      var self = $EINVAL = $klass($base, $super, 'EINVAL', $EINVAL);

      var def = self._proto, $scope = self._scope, TMP_1;

      return ($opal.defs(self, '$new', TMP_1 = function() {
        var self = this, $iter = TMP_1._p, $yield = $iter || nil;

        TMP_1._p = null;
        return $opal.find_super_dispatcher(self, 'new', TMP_1, null, $EINVAL).apply(self, ["Invalid argument"]);
      }), nil) && 'new'
    })(self, (($a = $scope.SystemCallError) == null ? $opal.cm('SystemCallError') : $a))
    
  })(self);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/error.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars;

  $opal.add_stubs(['$respond_to?', '$to_str', '$to_s', '$coerce_to', '$new', '$raise', '$class', '$call']);
  return (function($base, $super) {
    function $Regexp(){};
    var self = $Regexp = $klass($base, $super, 'Regexp', $Regexp);

    var def = self._proto, $scope = self._scope, TMP_1;

    def._isRegexp = true;

    (function(self) {
      var $scope = self._scope, def = self._proto;

      self._proto.$escape = function(string) {
        var self = this;

        
        return string.replace(/([-[\]/{}()*+?.^$\\| ])/g, '\\$1')
                     .replace(/[\n]/g, '\\n')
                     .replace(/[\r]/g, '\\r')
                     .replace(/[\f]/g, '\\f')
                     .replace(/[\t]/g, '\\t');
      
      };
      self._proto.$quote = self._proto.$escape;
      self._proto.$union = function(parts) {
        var self = this;

        parts = $slice.call(arguments, 0);
        return new RegExp(parts.join(''));
      };
      return (self._proto.$new = function(regexp, options) {
        var self = this;

        return new RegExp(regexp, options);
      }, nil) && 'new';
    })(self.$singleton_class());

    def['$=='] = function(other) {
      var self = this;

      return other.constructor == RegExp && self.toString() === other.toString();
    };

    def['$==='] = function(str) {
      var self = this;

      
      if (!str._isString && str['$respond_to?']("to_str")) {
        str = str.$to_str();
      }

      if (!str._isString) {
        return false;
      }

      return self.test(str);
    ;
    };

    def['$=~'] = function(string) {
      var $a, self = this;

      if ((($a = string === nil) !== nil && (!$a._isBoolean || $a == true))) {
        $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
        return nil;};
      string = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(string, (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s();
      
      var re = self;

      if (re.global) {
        // should we clear it afterwards too?
        re.lastIndex = 0;
      }
      else {
        // rewrite regular expression to add the global flag to capture pre/post match
        re = new RegExp(re.source, 'g' + (re.multiline ? 'm' : '') + (re.ignoreCase ? 'i' : ''));
      }

      var result = re.exec(string);

      if (result) {
        $gvars["~"] = (($a = $scope.MatchData) == null ? $opal.cm('MatchData') : $a).$new(re, result);
      }
      else {
        $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
      }

      return result ? result.index : nil;
    
    };

    $opal.defn(self, '$eql?', def['$==']);

    def.$inspect = function() {
      var self = this;

      return self.toString();
    };

    def.$match = TMP_1 = function(string, pos) {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if ((($a = string === nil) !== nil && (!$a._isBoolean || $a == true))) {
        $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
        return nil;};
      if ((($a = string._isString == null) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = string['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "no implicit conversion of " + (string.$class()) + " into String")
        };
        string = string.$to_str();};
      
      var re = self;

      if (re.global) {
        // should we clear it afterwards too?
        re.lastIndex = 0;
      }
      else {
        re = new RegExp(re.source, 'g' + (re.multiline ? 'm' : '') + (re.ignoreCase ? 'i' : ''));
      }

      var result = re.exec(string);

      if (result) {
        result = $gvars["~"] = (($a = $scope.MatchData) == null ? $opal.cm('MatchData') : $a).$new(re, result);

        if (block === nil) {
          return result;
        }
        else {
          return block.$call(result);
        }
      }
      else {
        return $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
      }
    
    };

    def.$source = function() {
      var self = this;

      return self.source;
    };

    return $opal.defn(self, '$to_s', def.$source);
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/regexp.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  $opal.add_stubs(['$===', '$>', '$<', '$equal?', '$<=>', '$==', '$normalize', '$raise', '$class', '$>=', '$<=']);
  return (function($base) {
    var self = $module($base, 'Comparable');

    var def = self._proto, $scope = self._scope;

    $opal.defs(self, '$normalize', function(what) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Integer) == null ? $opal.cm('Integer') : $b)['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
        return what};
      if (what['$>'](0)) {
        return 1};
      if (what['$<'](0)) {
        return -1};
      return 0;
    });

    def['$=='] = function(other) {
      var $a, self = this, cmp = nil;

      try {
      if ((($a = self['$equal?'](other)) !== nil && (!$a._isBoolean || $a == true))) {
          return true};
        if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return false
        };
        return (($a = $scope.Comparable) == null ? $opal.cm('Comparable') : $a).$normalize(cmp)['$=='](0);
      } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a)])) {
        return false
        }else { throw $err; }
      };
    };

    def['$>'] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return (($a = $scope.Comparable) == null ? $opal.cm('Comparable') : $a).$normalize(cmp)['$>'](0);
    };

    def['$>='] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return (($a = $scope.Comparable) == null ? $opal.cm('Comparable') : $a).$normalize(cmp)['$>='](0);
    };

    def['$<'] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return (($a = $scope.Comparable) == null ? $opal.cm('Comparable') : $a).$normalize(cmp)['$<'](0);
    };

    def['$<='] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return (($a = $scope.Comparable) == null ? $opal.cm('Comparable') : $a).$normalize(cmp)['$<='](0);
    };

    def['$between?'] = function(min, max) {
      var self = this;

      if (self['$<'](min)) {
        return false};
      if (self['$>'](max)) {
        return false};
      return true;
    };
        ;$opal.donate(self, ["$==", "$>", "$>=", "$<", "$<=", "$between?"]);
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/comparable.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  $opal.add_stubs(['$raise', '$enum_for', '$flatten', '$map', '$==', '$destructure', '$nil?', '$coerce_to!', '$coerce_to', '$===', '$new', '$<<', '$[]', '$[]=', '$inspect', '$__send__', '$yield', '$enumerator_size', '$respond_to?', '$size', '$private', '$compare', '$<=>', '$dup', '$sort', '$call', '$first', '$zip', '$to_a']);
  return (function($base) {
    var self = $module($base, 'Enumerable');

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_7, TMP_8, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13, TMP_14, TMP_15, TMP_16, TMP_17, TMP_18, TMP_19, TMP_20, TMP_22, TMP_23, TMP_24, TMP_25, TMP_26, TMP_27, TMP_28, TMP_29, TMP_30, TMP_31, TMP_32, TMP_33, TMP_35, TMP_36, TMP_40, TMP_41;

    def['$all?'] = TMP_1 = function() {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      
      var result = true;

      if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
            result = false;
            return $breaker;
          }
        }
      }
      else {
        self.$each._p = function(obj) {
          if (arguments.length == 1 && (($a = obj) === nil || ($a._isBoolean && $a == false))) {
            result = false;
            return $breaker;
          }
        }
      }

      self.$each();

      return result;
    
    };

    def['$any?'] = TMP_2 = function() {
      var $a, self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      
      var result = false;

      if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result = true;
            return $breaker;
          }
        };
      }
      else {
        self.$each._p = function(obj) {
          if (arguments.length != 1 || (($a = obj) !== nil && (!$a._isBoolean || $a == true))) {
            result = true;
            return $breaker;
          }
        }
      }

      self.$each();

      return result;
    
    };

    def.$chunk = TMP_3 = function(state) {
      var $a, self = this, $iter = TMP_3._p, block = $iter || nil;

      TMP_3._p = null;
      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$collect = TMP_4 = function() {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect")
      };
      
      var result = [];

      self.$each._p = function() {
        var value = $opal.$yieldX(block, arguments);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        result.push(value);
      };

      self.$each();

      return result;
    
    };

    def.$collect_concat = TMP_5 = function() {
      var $a, $b, TMP_6, self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect_concat")
      };
      return ($a = ($b = self).$map, $a._p = (TMP_6 = function(item){var self = TMP_6._s || this, $a;
if (item == null) item = nil;
      return $a = $opal.$yield1(block, item), $a === $breaker ? $a : $a}, TMP_6._s = self, TMP_6), $a).call($b).$flatten(1);
    };

    def.$count = TMP_7 = function(object) {
      var $a, self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      
      var result = 0;

      if (object != null) {
        block = function() {
          return (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments)['$=='](object);
        };
      }
      else if (block === nil) {
        block = function() { return true; };
      }

      self.$each._p = function() {
        var value = $opal.$yieldX(block, arguments);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
          result++;
        }
      }

      self.$each();

      return result;
    
    };

    def.$cycle = TMP_8 = function(n) {
      var $a, self = this, $iter = TMP_8._p, block = $iter || nil;

      if (n == null) {
        n = nil
      }
      TMP_8._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("cycle", n)
      };
      if ((($a = n['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        n = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to!'](n, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        if ((($a = n <= 0) !== nil && (!$a._isBoolean || $a == true))) {
          return nil};
      };
      
      var result,
          all  = [];

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        all.push(param);
      }

      self.$each();

      if (result !== undefined) {
        return result;
      }

      if (all.length === 0) {
        return nil;
      }
    
      if ((($a = n['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        
        while (true) {
          for (var i = 0, length = all.length; i < length; i++) {
            var value = $opal.$yield1(block, all[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }
        }
      
        } else {
        
        while (n > 1) {
          for (var i = 0, length = all.length; i < length; i++) {
            var value = $opal.$yield1(block, all[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }

          n--;
        }
      
      };
    };

    def.$detect = TMP_9 = function(ifnone) {
      var $a, self = this, $iter = TMP_9._p, block = $iter || nil;

      TMP_9._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("detect", ifnone)
      };
      
      var result = undefined;

      self.$each._p = function() {
        var params = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value  = $opal.$yield1(block, params);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
          result = params;
          return $breaker;
        }
      };

      self.$each();

      if (result === undefined && ifnone !== undefined) {
        if (typeof(ifnone) === 'function') {
          result = ifnone();
        }
        else {
          result = ifnone;
        }
      }

      return result === undefined ? nil : result;
    
    };

    def.$drop = function(number) {
      var $a, self = this;

      number = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(number, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      if ((($a = number < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "attempt to drop negative size")};
      
      var result  = [],
          current = 0;

      self.$each._p = function() {
        if (number <= current) {
          result.push((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments));
        }

        current++;
      };

      self.$each()

      return result;
    
    };

    def.$drop_while = TMP_10 = function() {
      var $a, self = this, $iter = TMP_10._p, block = $iter || nil;

      TMP_10._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("drop_while")
      };
      
      var result   = [],
          dropping = true;

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

        if (dropping) {
          var value = $opal.$yield1(block, param);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
            dropping = false;
            result.push(param);
          }
        }
        else {
          result.push(param);
        }
      };

      self.$each();

      return result;
    
    };

    def.$each_cons = TMP_11 = function(n) {
      var $a, self = this, $iter = TMP_11._p, block = $iter || nil;

      TMP_11._p = null;
      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$each_entry = TMP_12 = function() {
      var $a, self = this, $iter = TMP_12._p, block = $iter || nil;

      TMP_12._p = null;
      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$each_slice = TMP_13 = function(n) {
      var $a, self = this, $iter = TMP_13._p, block = $iter || nil;

      TMP_13._p = null;
      n = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(n, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      if ((($a = n <= 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "invalid slice size")};
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_slice", n)
      };
      
      var result,
          slice = []

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

        slice.push(param);

        if (slice.length === n) {
          if ($opal.$yield1(block, slice) === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          slice = [];
        }
      };

      self.$each();

      if (result !== undefined) {
        return result;
      }

      // our "last" group, if smaller than n then won't have been yielded
      if (slice.length > 0) {
        if ($opal.$yield1(block, slice) === $breaker) {
          return $breaker.$v;
        }
      }
    ;
      return nil;
    };

    def.$each_with_index = TMP_14 = function(args) {
      var $a, $b, self = this, $iter = TMP_14._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_14._p = null;
      if ((block !== nil)) {
        } else {
        return ($a = self).$enum_for.apply($a, ["each_with_index"].concat(args))
      };
      
      var result,
          index = 0;

      self.$each._p = function() {
        var param = (($b = $scope.Opal) == null ? $opal.cm('Opal') : $b).$destructure(arguments),
            value = block(param, index);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        index++;
      };

      self.$each.apply(self, args);

      if (result !== undefined) {
        return result;
      }
    
      return self;
    };

    def.$each_with_object = TMP_15 = function(object) {
      var $a, self = this, $iter = TMP_15._p, block = $iter || nil;

      TMP_15._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_with_object", object)
      };
      
      var result;

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = block(param, object);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }
      };

      self.$each();

      if (result !== undefined) {
        return result;
      }
    
      return object;
    };

    def.$entries = function(args) {
      var $a, self = this;

      args = $slice.call(arguments, 0);
      
      var result = [];

      self.$each._p = function() {
        result.push((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments));
      };

      self.$each.apply(self, args);

      return result;
    
    };

    $opal.defn(self, '$find', def.$detect);

    def.$find_all = TMP_16 = function() {
      var $a, self = this, $iter = TMP_16._p, block = $iter || nil;

      TMP_16._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("find_all")
      };
      
      var result = [];

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
          result.push(param);
        }
      };

      self.$each();

      return result;
    
    };

    def.$find_index = TMP_17 = function(object) {
      var $a, self = this, $iter = TMP_17._p, block = $iter || nil;

      TMP_17._p = null;
      if ((($a = object === undefined && block === nil) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$enum_for("find_index")};
      
      var result = nil,
          index  = 0;

      if (object != null) {
        self.$each._p = function() {
          var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          if ((param)['$=='](object)) {
            result = index;
            return $breaker;
          }

          index += 1;
        };
      }
      else if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result = index;
            return $breaker;
          }

          index += 1;
        };
      }

      self.$each();

      return result;
    
    };

    def.$first = function(number) {
      var $a, self = this, result = nil;

      if ((($a = number === undefined) !== nil && (!$a._isBoolean || $a == true))) {
        result = nil;
        
        self.$each._p = function() {
          result = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          return $breaker;
        };

        self.$each();
      ;
        } else {
        result = [];
        number = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(number, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        if ((($a = number < 0) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "attempt to take negative size")};
        if ((($a = number == 0) !== nil && (!$a._isBoolean || $a == true))) {
          return []};
        
        var current = 0,
            number  = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(number, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");

        self.$each._p = function() {
          result.push((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments));

          if (number <= ++current) {
            return $breaker;
          }
        };

        self.$each();
      ;
      };
      return result;
    };

    $opal.defn(self, '$flat_map', def.$collect_concat);

    def.$grep = TMP_18 = function(pattern) {
      var $a, self = this, $iter = TMP_18._p, block = $iter || nil;

      TMP_18._p = null;
      
      var result = [];

      if (block !== nil) {
        self.$each._p = function() {
          var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
              value = pattern['$==='](param);

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            value = $opal.$yield1(block, param);

            if (value === $breaker) {
              result = $breaker.$v;
              return $breaker;
            }

            result.push(value);
          }
        };
      }
      else {
        self.$each._p = function() {
          var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
              value = pattern['$==='](param);

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result.push(param);
          }
        };
      }

      self.$each();

      return result;
    ;
    };

    def.$group_by = TMP_19 = function() {
      var $a, $b, $c, self = this, $iter = TMP_19._p, block = $iter || nil, hash = nil;

      TMP_19._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("group_by")
      };
      hash = (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a).$new();
      
      var result;

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        (($a = value, $b = hash, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, []))))['$<<'](param);
      }

      self.$each();

      if (result !== undefined) {
        return result;
      }
    
      return hash;
    };

    def['$include?'] = function(obj) {
      var $a, self = this;

      
      var result = false;

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

        if ((param)['$=='](obj)) {
          result = true;
          return $breaker;
        }
      }

      self.$each();

      return result;
    
    };

    def.$inject = TMP_20 = function(object, sym) {
      var $a, self = this, $iter = TMP_20._p, block = $iter || nil;

      TMP_20._p = null;
      
      var result = object;

      if (block !== nil && sym === undefined) {
        self.$each._p = function() {
          var value = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          if (result === undefined) {
            result = value;
            return;
          }

          value = $opal.$yieldX(block, [result, value]);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          result = value;
        };
      }
      else {
        if (sym === undefined) {
          if (!(($a = $scope.Symbol) == null ? $opal.cm('Symbol') : $a)['$==='](object)) {
            self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "" + (object.$inspect()) + " is not a Symbol");
          }

          sym    = object;
          result = undefined;
        }

        self.$each._p = function() {
          var value = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          if (result === undefined) {
            result = value;
            return;
          }

          result = (result).$__send__(sym, value);
        };
      }

      self.$each();

      return result == undefined ? nil : result;
    ;
    };

    def.$lazy = function() {
      var $a, $b, TMP_21, $c, $d, self = this;

      return ($a = ($b = (($c = ((($d = $scope.Enumerator) == null ? $opal.cm('Enumerator') : $d))._scope).Lazy == null ? $c.cm('Lazy') : $c.Lazy)).$new, $a._p = (TMP_21 = function(enum$, args){var self = TMP_21._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
      return ($a = enum$).$yield.apply($a, [].concat(args))}, TMP_21._s = self, TMP_21), $a).call($b, self, self.$enumerator_size());
    };

    def.$enumerator_size = function() {
      var $a, self = this;

      if ((($a = self['$respond_to?']("size")) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$size()
        } else {
        return nil
      };
    };

    self.$private("enumerator_size");

    $opal.defn(self, '$map', def.$collect);

    def.$max = TMP_22 = function() {
      var $a, self = this, $iter = TMP_22._p, block = $iter || nil;

      TMP_22._p = null;
      
      var result;

      if (block !== nil) {
        self.$each._p = function() {
          var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          var value = block(param, result);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if (value === nil) {
            self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "comparison failed");
          }

          if (value > 0) {
            result = param;
          }
        };
      }
      else {
        self.$each._p = function() {
          var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          if ((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$compare(param, result) > 0) {
            result = param;
          }
        };
      }

      self.$each();

      return result === undefined ? nil : result;
    
    };

    def.$max_by = TMP_23 = function() {
      var $a, self = this, $iter = TMP_23._p, block = $iter || nil;

      TMP_23._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("max_by")
      };
      
      var result,
          by;

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (result === undefined) {
          result = param;
          by     = value;
          return;
        }

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((value)['$<=>'](by) > 0) {
          result = param
          by     = value;
        }
      };

      self.$each();

      return result === undefined ? nil : result;
    
    };

    $opal.defn(self, '$member?', def['$include?']);

    def.$min = TMP_24 = function() {
      var $a, self = this, $iter = TMP_24._p, block = $iter || nil;

      TMP_24._p = null;
      
      var result;

      if (block !== nil) {
        self.$each._p = function() {
          var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          var value = block(param, result);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if (value === nil) {
            self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "comparison failed");
          }

          if (value < 0) {
            result = param;
          }
        };
      }
      else {
        self.$each._p = function() {
          var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          if ((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$compare(param, result) < 0) {
            result = param;
          }
        };
      }

      self.$each();

      return result === undefined ? nil : result;
    
    };

    def.$min_by = TMP_25 = function() {
      var $a, self = this, $iter = TMP_25._p, block = $iter || nil;

      TMP_25._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("min_by")
      };
      
      var result,
          by;

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (result === undefined) {
          result = param;
          by     = value;
          return;
        }

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((value)['$<=>'](by) < 0) {
          result = param
          by     = value;
        }
      };

      self.$each();

      return result === undefined ? nil : result;
    
    };

    def.$minmax = TMP_26 = function() {
      var $a, self = this, $iter = TMP_26._p, block = $iter || nil;

      TMP_26._p = null;
      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$minmax_by = TMP_27 = function() {
      var $a, self = this, $iter = TMP_27._p, block = $iter || nil;

      TMP_27._p = null;
      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def['$none?'] = TMP_28 = function() {
      var $a, self = this, $iter = TMP_28._p, block = $iter || nil;

      TMP_28._p = null;
      
      var result = true;

      if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result = false;
            return $breaker;
          }
        }
      }
      else {
        self.$each._p = function() {
          var value = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result = false;
            return $breaker;
          }
        };
      }

      self.$each();

      return result;
    
    };

    def['$one?'] = TMP_29 = function() {
      var $a, self = this, $iter = TMP_29._p, block = $iter || nil;

      TMP_29._p = null;
      
      var result = false;

      if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            if (result === true) {
              result = false;
              return $breaker;
            }

            result = true;
          }
        }
      }
      else {
        self.$each._p = function() {
          var value = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            if (result === true) {
              result = false;
              return $breaker;
            }

            result = true;
          }
        }
      }

      self.$each();

      return result;
    
    };

    def.$partition = TMP_30 = function() {
      var $a, self = this, $iter = TMP_30._p, block = $iter || nil;

      TMP_30._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("partition")
      };
      
      var truthy = [], falsy = [];

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
          truthy.push(param);
        }
        else {
          falsy.push(param);
        }
      };

      self.$each();

      return [truthy, falsy];
    
    };

    $opal.defn(self, '$reduce', def.$inject);

    def.$reject = TMP_31 = function() {
      var $a, self = this, $iter = TMP_31._p, block = $iter || nil;

      TMP_31._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reject")
      };
      
      var result = [];

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
          result.push(param);
        }
      };

      self.$each();

      return result;
    
    };

    def.$reverse_each = TMP_32 = function() {
      var self = this, $iter = TMP_32._p, block = $iter || nil;

      TMP_32._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reverse_each")
      };
      
      var result = [];

      self.$each._p = function() {
        result.push(arguments);
      };

      self.$each();

      for (var i = result.length - 1; i >= 0; i--) {
        $opal.$yieldX(block, result[i]);
      }

      return result;
    
    };

    $opal.defn(self, '$select', def.$find_all);

    def.$slice_before = TMP_33 = function(pattern) {
      var $a, $b, TMP_34, $c, self = this, $iter = TMP_33._p, block = $iter || nil;

      TMP_33._p = null;
      if ((($a = pattern === undefined && block === nil || arguments.length > 1) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "wrong number of arguments (" + (arguments.length) + " for 1)")};
      return ($a = ($b = (($c = $scope.Enumerator) == null ? $opal.cm('Enumerator') : $c)).$new, $a._p = (TMP_34 = function(e){var self = TMP_34._s || this, $a;
if (e == null) e = nil;
      
        var slice = [];

        if (block !== nil) {
          if (pattern === undefined) {
            self.$each._p = function() {
              var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
                  value = $opal.$yield1(block, param);

              if ((($a = value) !== nil && (!$a._isBoolean || $a == true)) && slice.length > 0) {
                e['$<<'](slice);
                slice = [];
              }

              slice.push(param);
            };
          }
          else {
            self.$each._p = function() {
              var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
                  value = block(param, pattern.$dup());

              if ((($a = value) !== nil && (!$a._isBoolean || $a == true)) && slice.length > 0) {
                e['$<<'](slice);
                slice = [];
              }

              slice.push(param);
            };
          }
        }
        else {
          self.$each._p = function() {
            var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
                value = pattern['$==='](param);

            if ((($a = value) !== nil && (!$a._isBoolean || $a == true)) && slice.length > 0) {
              e['$<<'](slice);
              slice = [];
            }

            slice.push(param);
          };
        }

        self.$each();

        if (slice.length > 0) {
          e['$<<'](slice);
        }
      ;}, TMP_34._s = self, TMP_34), $a).call($b);
    };

    def.$sort = TMP_35 = function() {
      var $a, self = this, $iter = TMP_35._p, block = $iter || nil;

      TMP_35._p = null;
      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$sort_by = TMP_36 = function() {
      var $a, $b, TMP_37, $c, $d, TMP_38, $e, $f, TMP_39, self = this, $iter = TMP_36._p, block = $iter || nil;

      TMP_36._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("sort_by")
      };
      return ($a = ($b = ($c = ($d = ($e = ($f = self).$map, $e._p = (TMP_39 = function(){var self = TMP_39._s || this, $a;

      arg = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments);
        return [block.$call(arg), arg];}, TMP_39._s = self, TMP_39), $e).call($f)).$sort, $c._p = (TMP_38 = function(a, b){var self = TMP_38._s || this;
if (a == null) a = nil;if (b == null) b = nil;
      return a['$[]'](0)['$<=>'](b['$[]'](0))}, TMP_38._s = self, TMP_38), $c).call($d)).$map, $a._p = (TMP_37 = function(arg){var self = TMP_37._s || this;
if (arg == null) arg = nil;
      return arg[1];}, TMP_37._s = self, TMP_37), $a).call($b);
    };

    def.$take = function(num) {
      var self = this;

      return self.$first(num);
    };

    def.$take_while = TMP_40 = function() {
      var $a, self = this, $iter = TMP_40._p, block = $iter || nil;

      TMP_40._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("take_while")
      };
      
      var result = [];

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
          return $breaker;
        }

        result.push(param);
      };

      self.$each();

      return result;
    
    };

    $opal.defn(self, '$to_a', def.$entries);

    def.$zip = TMP_41 = function(others) {
      var $a, self = this, $iter = TMP_41._p, block = $iter || nil;

      others = $slice.call(arguments, 0);
      TMP_41._p = null;
      return ($a = self.$to_a()).$zip.apply($a, [].concat(others));
    };
        ;$opal.donate(self, ["$all?", "$any?", "$chunk", "$collect", "$collect_concat", "$count", "$cycle", "$detect", "$drop", "$drop_while", "$each_cons", "$each_entry", "$each_slice", "$each_with_index", "$each_with_object", "$entries", "$find", "$find_all", "$find_index", "$first", "$flat_map", "$grep", "$group_by", "$include?", "$inject", "$lazy", "$enumerator_size", "$map", "$max", "$max_by", "$member?", "$min", "$min_by", "$minmax", "$minmax_by", "$none?", "$one?", "$partition", "$reduce", "$reject", "$reverse_each", "$select", "$slice_before", "$sort", "$sort_by", "$take", "$take_while", "$to_a", "$zip"]);
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/enumerable.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$allocate', '$new', '$to_proc', '$coerce_to', '$nil?', '$empty?', '$+', '$class', '$__send__', '$===', '$call', '$enum_for', '$destructure', '$name', '$inspect', '$[]', '$raise', '$yield', '$each', '$enumerator_size', '$respond_to?', '$try_convert', '$<', '$for']);
  ;
  return (function($base, $super) {
    function $Enumerator(){};
    var self = $Enumerator = $klass($base, $super, 'Enumerator', $Enumerator);

    var def = self._proto, $scope = self._scope, $a, TMP_1, TMP_2, TMP_3, TMP_4;

    def.size = def.args = def.object = def.method = nil;
    self.$include((($a = $scope.Enumerable) == null ? $opal.cm('Enumerable') : $a));

    $opal.defs(self, '$for', TMP_1 = function(object, method, args) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 2);
      if (method == null) {
        method = "each"
      }
      TMP_1._p = null;
      
      var obj = self.$allocate();

      obj.object = object;
      obj.size   = block;
      obj.method = method;
      obj.args   = args;

      return obj;
    ;
    });

    def.$initialize = TMP_2 = function() {
      var $a, $b, $c, self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      if (block !== false && block !== nil) {
        self.object = ($a = ($b = (($c = $scope.Generator) == null ? $opal.cm('Generator') : $c)).$new, $a._p = block.$to_proc(), $a).call($b);
        self.method = "each";
        self.args = [];
        self.size = arguments[0] || nil;
        if ((($a = self.size) !== nil && (!$a._isBoolean || $a == true))) {
          return self.size = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(self.size, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int")
          } else {
          return nil
        };
        } else {
        self.object = arguments[0];
        self.method = arguments[1] || "each";
        self.args = $slice.call(arguments, 2);
        return self.size = nil;
      };
    };

    def.$each = TMP_3 = function(args) {
      var $a, $b, $c, self = this, $iter = TMP_3._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_3._p = null;
      if ((($a = ($b = block['$nil?'](), $b !== false && $b !== nil ?args['$empty?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      args = self.args['$+'](args);
      if ((($a = block['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return ($a = self.$class()).$new.apply($a, [self.object, self.method].concat(args))};
      return ($b = ($c = self.object).$__send__, $b._p = block.$to_proc(), $b).apply($c, [self.method].concat(args));
    };

    def.$size = function() {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Proc) == null ? $opal.cm('Proc') : $b)['$==='](self.size)) !== nil && (!$a._isBoolean || $a == true))) {
        return ($a = self.size).$call.apply($a, [].concat(self.args))
        } else {
        return self.size
      };
    };

    def.$with_index = TMP_4 = function(offset) {
      var $a, self = this, $iter = TMP_4._p, block = $iter || nil;

      if (offset == null) {
        offset = 0
      }
      TMP_4._p = null;
      if (offset !== false && offset !== nil) {
        offset = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(offset, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int")
        } else {
        offset = 0
      };
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("with_index", offset)
      };
      
      var result

      self.$each._p = function() {
        var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(arguments),
            value = block(param, index);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        index++;
      }

      self.$each();

      if (result !== undefined) {
        return result;
      }
    ;
    };

    $opal.defn(self, '$with_object', def.$each_with_object);

    def.$inspect = function() {
      var $a, self = this, result = nil;

      result = "#<" + (self.$class().$name()) + ": " + (self.object.$inspect()) + ":" + (self.method);
      if ((($a = self.args['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        result = result['$+']("(" + (self.args.$inspect()['$[]']((($a = $scope.Range) == null ? $opal.cm('Range') : $a).$new(1, -2))) + ")")
      };
      return result['$+'](">");
    };

    (function($base, $super) {
      function $Generator(){};
      var self = $Generator = $klass($base, $super, 'Generator', $Generator);

      var def = self._proto, $scope = self._scope, $a, TMP_5, TMP_6;

      def.block = nil;
      self.$include((($a = $scope.Enumerable) == null ? $opal.cm('Enumerable') : $a));

      def.$initialize = TMP_5 = function() {
        var $a, self = this, $iter = TMP_5._p, block = $iter || nil;

        TMP_5._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise((($a = $scope.LocalJumpError) == null ? $opal.cm('LocalJumpError') : $a), "no block given")
        };
        return self.block = block;
      };

      return (def.$each = TMP_6 = function(args) {
        var $a, $b, $c, self = this, $iter = TMP_6._p, block = $iter || nil, yielder = nil;

        args = $slice.call(arguments, 0);
        TMP_6._p = null;
        yielder = ($a = ($b = (($c = $scope.Yielder) == null ? $opal.cm('Yielder') : $c)).$new, $a._p = block.$to_proc(), $a).call($b);
        
        try {
          args.unshift(yielder);

          if ($opal.$yieldX(self.block, args) === $breaker) {
            return $breaker.$v;
          }
        }
        catch (e) {
          if (e === $breaker) {
            return $breaker.$v;
          }
          else {
            throw e;
          }
        }
      ;
        return self;
      }, nil) && 'each';
    })(self, null);

    (function($base, $super) {
      function $Yielder(){};
      var self = $Yielder = $klass($base, $super, 'Yielder', $Yielder);

      var def = self._proto, $scope = self._scope, TMP_7;

      def.block = nil;
      def.$initialize = TMP_7 = function() {
        var self = this, $iter = TMP_7._p, block = $iter || nil;

        TMP_7._p = null;
        return self.block = block;
      };

      def.$yield = function(values) {
        var self = this;

        values = $slice.call(arguments, 0);
        
        var value = $opal.$yieldX(self.block, values);

        if (value === $breaker) {
          throw $breaker;
        }

        return value;
      ;
      };

      return (def['$<<'] = function(values) {
        var $a, self = this;

        values = $slice.call(arguments, 0);
        ($a = self).$yield.apply($a, [].concat(values));
        return self;
      }, nil) && '<<';
    })(self, null);

    return (function($base, $super) {
      function $Lazy(){};
      var self = $Lazy = $klass($base, $super, 'Lazy', $Lazy);

      var def = self._proto, $scope = self._scope, $a, TMP_8, TMP_11, TMP_13, TMP_18, TMP_20, TMP_21, TMP_23, TMP_26, TMP_29;

      def.enumerator = nil;
      (function($base, $super) {
        function $StopLazyError(){};
        var self = $StopLazyError = $klass($base, $super, 'StopLazyError', $StopLazyError);

        var def = self._proto, $scope = self._scope;

        return nil;
      })(self, (($a = $scope.Exception) == null ? $opal.cm('Exception') : $a));

      def.$initialize = TMP_8 = function(object, size) {
        var $a, TMP_9, self = this, $iter = TMP_8._p, block = $iter || nil;

        if (size == null) {
          size = nil
        }
        TMP_8._p = null;
        if ((block !== nil)) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to call lazy new without a block")
        };
        self.enumerator = object;
        return $opal.find_super_dispatcher(self, 'initialize', TMP_8, (TMP_9 = function(yielder, each_args){var self = TMP_9._s || this, $a, $b, TMP_10;
if (yielder == null) yielder = nil;each_args = $slice.call(arguments, 1);
        try {
          return ($a = ($b = object).$each, $a._p = (TMP_10 = function(args){var self = TMP_10._s || this;
args = $slice.call(arguments, 0);
            
              args.unshift(yielder);

              if ($opal.$yieldX(block, args) === $breaker) {
                return $breaker;
              }
            ;}, TMP_10._s = self, TMP_10), $a).apply($b, [].concat(each_args))
          } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.Exception) == null ? $opal.cm('Exception') : $a)])) {
            return nil
            }else { throw $err; }
          }}, TMP_9._s = self, TMP_9)).apply(self, [size]);
      };

      $opal.defn(self, '$force', def.$to_a);

      def.$lazy = function() {
        var self = this;

        return self;
      };

      def.$collect = TMP_11 = function() {
        var $a, $b, TMP_12, $c, self = this, $iter = TMP_11._p, block = $iter || nil;

        TMP_11._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to call lazy map without a block")
        };
        return ($a = ($b = (($c = $scope.Lazy) == null ? $opal.cm('Lazy') : $c)).$new, $a._p = (TMP_12 = function(enum$, args){var self = TMP_12._s || this;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          enum$.$yield(value);
        }, TMP_12._s = self, TMP_12), $a).call($b, self, self.$enumerator_size());
      };

      def.$collect_concat = TMP_13 = function() {
        var $a, $b, TMP_14, $c, self = this, $iter = TMP_13._p, block = $iter || nil;

        TMP_13._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to call lazy map without a block")
        };
        return ($a = ($b = (($c = $scope.Lazy) == null ? $opal.cm('Lazy') : $c)).$new, $a._p = (TMP_14 = function(enum$, args){var self = TMP_14._s || this, $a, $b, TMP_15, $c, TMP_16;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((value)['$respond_to?']("force") && (value)['$respond_to?']("each")) {
            ($a = ($b = (value)).$each, $a._p = (TMP_15 = function(v){var self = TMP_15._s || this;
if (v == null) v = nil;
          return enum$.$yield(v)}, TMP_15._s = self, TMP_15), $a).call($b)
          }
          else {
            var array = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$try_convert(value, (($a = $scope.Array) == null ? $opal.cm('Array') : $a), "to_ary");

            if (array === nil) {
              enum$.$yield(value);
            }
            else {
              ($a = ($c = (value)).$each, $a._p = (TMP_16 = function(v){var self = TMP_16._s || this;
if (v == null) v = nil;
          return enum$.$yield(v)}, TMP_16._s = self, TMP_16), $a).call($c);
            }
          }
        ;}, TMP_14._s = self, TMP_14), $a).call($b, self, nil);
      };

      def.$drop = function(n) {
        var $a, $b, TMP_17, $c, self = this, current_size = nil, set_size = nil, dropped = nil;

        n = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(n, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        if (n['$<'](0)) {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "attempt to drop negative size")};
        current_size = self.$enumerator_size();
        set_size = (function() {if ((($a = (($b = $scope.Integer) == null ? $opal.cm('Integer') : $b)['$==='](current_size)) !== nil && (!$a._isBoolean || $a == true))) {
          if (n['$<'](current_size)) {
            return n
            } else {
            return current_size
          }
          } else {
          return current_size
        }; return nil; })();
        dropped = 0;
        return ($a = ($b = (($c = $scope.Lazy) == null ? $opal.cm('Lazy') : $c)).$new, $a._p = (TMP_17 = function(enum$, args){var self = TMP_17._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        if (dropped['$<'](n)) {
            return dropped = dropped['$+'](1)
            } else {
            return ($a = enum$).$yield.apply($a, [].concat(args))
          }}, TMP_17._s = self, TMP_17), $a).call($b, self, set_size);
      };

      def.$drop_while = TMP_18 = function() {
        var $a, $b, TMP_19, $c, self = this, $iter = TMP_18._p, block = $iter || nil, succeeding = nil;

        TMP_18._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to call lazy drop_while without a block")
        };
        succeeding = true;
        return ($a = ($b = (($c = $scope.Lazy) == null ? $opal.cm('Lazy') : $c)).$new, $a._p = (TMP_19 = function(enum$, args){var self = TMP_19._s || this, $a, $b;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        if (succeeding !== false && succeeding !== nil) {
            
            var value = $opal.$yieldX(block, args);

            if (value === $breaker) {
              return $breaker;
            }

            if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
              succeeding = false;

              ($a = enum$).$yield.apply($a, [].concat(args));
            }
          
            } else {
            return ($b = enum$).$yield.apply($b, [].concat(args))
          }}, TMP_19._s = self, TMP_19), $a).call($b, self, nil);
      };

      def.$enum_for = TMP_20 = function(method, args) {
        var $a, $b, self = this, $iter = TMP_20._p, block = $iter || nil;

        args = $slice.call(arguments, 1);
        if (method == null) {
          method = "each"
        }
        TMP_20._p = null;
        return ($a = ($b = self.$class()).$for, $a._p = block.$to_proc(), $a).apply($b, [self, method].concat(args));
      };

      def.$find_all = TMP_21 = function() {
        var $a, $b, TMP_22, $c, self = this, $iter = TMP_21._p, block = $iter || nil;

        TMP_21._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to call lazy select without a block")
        };
        return ($a = ($b = (($c = $scope.Lazy) == null ? $opal.cm('Lazy') : $c)).$new, $a._p = (TMP_22 = function(enum$, args){var self = TMP_22._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            ($a = enum$).$yield.apply($a, [].concat(args));
          }
        ;}, TMP_22._s = self, TMP_22), $a).call($b, self, nil);
      };

      $opal.defn(self, '$flat_map', def.$collect_concat);

      def.$grep = TMP_23 = function(pattern) {
        var $a, $b, TMP_24, $c, TMP_25, $d, self = this, $iter = TMP_23._p, block = $iter || nil;

        TMP_23._p = null;
        if (block !== false && block !== nil) {
          return ($a = ($b = (($c = $scope.Lazy) == null ? $opal.cm('Lazy') : $c)).$new, $a._p = (TMP_24 = function(enum$, args){var self = TMP_24._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
          
            var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(args),
                value = pattern['$==='](param);

            if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
              value = $opal.$yield1(block, param);

              if (value === $breaker) {
                return $breaker;
              }

              enum$.$yield($opal.$yield1(block, param));
            }
          ;}, TMP_24._s = self, TMP_24), $a).call($b, self, nil)
          } else {
          return ($a = ($c = (($d = $scope.Lazy) == null ? $opal.cm('Lazy') : $d)).$new, $a._p = (TMP_25 = function(enum$, args){var self = TMP_25._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
          
            var param = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$destructure(args),
                value = pattern['$==='](param);

            if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
              enum$.$yield(param);
            }
          ;}, TMP_25._s = self, TMP_25), $a).call($c, self, nil)
        };
      };

      $opal.defn(self, '$map', def.$collect);

      $opal.defn(self, '$select', def.$find_all);

      def.$reject = TMP_26 = function() {
        var $a, $b, TMP_27, $c, self = this, $iter = TMP_26._p, block = $iter || nil;

        TMP_26._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to call lazy reject without a block")
        };
        return ($a = ($b = (($c = $scope.Lazy) == null ? $opal.cm('Lazy') : $c)).$new, $a._p = (TMP_27 = function(enum$, args){var self = TMP_27._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
            ($a = enum$).$yield.apply($a, [].concat(args));
          }
        ;}, TMP_27._s = self, TMP_27), $a).call($b, self, nil);
      };

      def.$take = function(n) {
        var $a, $b, TMP_28, $c, self = this, current_size = nil, set_size = nil, taken = nil;

        n = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(n, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        if (n['$<'](0)) {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "attempt to take negative size")};
        current_size = self.$enumerator_size();
        set_size = (function() {if ((($a = (($b = $scope.Integer) == null ? $opal.cm('Integer') : $b)['$==='](current_size)) !== nil && (!$a._isBoolean || $a == true))) {
          if (n['$<'](current_size)) {
            return n
            } else {
            return current_size
          }
          } else {
          return current_size
        }; return nil; })();
        taken = 0;
        return ($a = ($b = (($c = $scope.Lazy) == null ? $opal.cm('Lazy') : $c)).$new, $a._p = (TMP_28 = function(enum$, args){var self = TMP_28._s || this, $a, $b;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        if (taken['$<'](n)) {
            ($a = enum$).$yield.apply($a, [].concat(args));
            return taken = taken['$+'](1);
            } else {
            return self.$raise((($b = $scope.StopLazyError) == null ? $opal.cm('StopLazyError') : $b))
          }}, TMP_28._s = self, TMP_28), $a).call($b, self, set_size);
      };

      def.$take_while = TMP_29 = function() {
        var $a, $b, TMP_30, $c, self = this, $iter = TMP_29._p, block = $iter || nil;

        TMP_29._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to call lazy take_while without a block")
        };
        return ($a = ($b = (($c = $scope.Lazy) == null ? $opal.cm('Lazy') : $c)).$new, $a._p = (TMP_30 = function(enum$, args){var self = TMP_30._s || this, $a, $b;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            ($a = enum$).$yield.apply($a, [].concat(args));
          }
          else {
            self.$raise((($b = $scope.StopLazyError) == null ? $opal.cm('StopLazyError') : $b));
          }
        ;}, TMP_30._s = self, TMP_30), $a).call($b, self, nil);
      };

      $opal.defn(self, '$to_enum', def.$enum_for);

      return (def.$inspect = function() {
        var self = this;

        return "#<" + (self.$class().$name()) + ": " + (self.enumerator.$inspect()) + ">";
      }, nil) && 'inspect';
    })(self, self);
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/enumerator.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars, $range = $opal.range;

  $opal.add_stubs(['$include', '$new', '$class', '$raise', '$===', '$to_a', '$respond_to?', '$to_ary', '$coerce_to', '$coerce_to?', '$==', '$to_str', '$clone', '$hash', '$<=>', '$inspect', '$empty?', '$enum_for', '$nil?', '$coerce_to!', '$initialize_clone', '$initialize_dup', '$replace', '$eql?', '$length', '$begin', '$end', '$exclude_end?', '$flatten', '$object_id', '$[]', '$to_s', '$join', '$delete_if', '$to_proc', '$each', '$reverse', '$!', '$map', '$rand', '$keep_if', '$shuffle!', '$>', '$<', '$sort', '$times', '$[]=', '$<<', '$at']);
  ;
  return (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self._proto, $scope = self._scope, $a, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_8, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13, TMP_14, TMP_15, TMP_17, TMP_18, TMP_19, TMP_20, TMP_21, TMP_24;

    def.length = nil;
    self.$include((($a = $scope.Enumerable) == null ? $opal.cm('Enumerable') : $a));

    def._isArray = true;

    $opal.defs(self, '$[]', function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      return objects;
    });

    def.$initialize = function(args) {
      var $a, self = this;

      args = $slice.call(arguments, 0);
      return ($a = self.$class()).$new.apply($a, [].concat(args));
    };

    $opal.defs(self, '$new', TMP_1 = function(size, obj) {
      var $a, $b, self = this, $iter = TMP_1._p, block = $iter || nil;

      if (size == null) {
        size = nil
      }
      if (obj == null) {
        obj = nil
      }
      TMP_1._p = null;
      if ((($a = arguments.length > 2) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "wrong number of arguments (" + (arguments.length) + " for 0..2)")};
      if ((($a = arguments.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      if ((($a = arguments.length === 1) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](size)) !== nil && (!$a._isBoolean || $a == true))) {
          return size.$to_a()
        } else if ((($a = size['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
          return size.$to_ary()}};
      size = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(size, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      if ((($a = size < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "negative array size")};
      
      var result = [];

      if (block === nil) {
        for (var i = 0; i < size; i++) {
          result.push(obj);
        }
      }
      else {
        for (var i = 0, value; i < size; i++) {
          value = block(i);

          if (value === $breaker) {
            return $breaker.$v;
          }

          result[i] = value;
        }
      }

      return result;
    
    });

    $opal.defs(self, '$try_convert', function(obj) {
      var $a, self = this;

      return (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to?'](obj, (($a = $scope.Array) == null ? $opal.cm('Array') : $a), "to_ary");
    });

    def['$&'] = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.Array) == null ? $opal.cm('Array') : $a), "to_ary").$to_a()
      };
      
      var result = [],
          seen   = {};

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if (!seen[item]) {
          for (var j = 0, length2 = other.length; j < length2; j++) {
            var item2 = other[j];

            if (!seen[item2] && (item)['$=='](item2)) {
              seen[item] = true;
              result.push(item);
            }
          }
        }
      }

      return result;
    
    };

    def['$*'] = function(other) {
      var $a, self = this;

      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        return self.join(other.$to_str())};
      if ((($a = other['$respond_to?']("to_int")) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "no implicit conversion of " + (other.$class()) + " into Integer")
      };
      other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      if ((($a = other < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "negative argument")};
      
      var result = [];

      for (var i = 0; i < other; i++) {
        result = result.concat(self);
      }

      return result;
    
    };

    def['$+'] = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.Array) == null ? $opal.cm('Array') : $a), "to_ary").$to_a()
      };
      return self.concat(other);
    };

    def['$-'] = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.Array) == null ? $opal.cm('Array') : $a), "to_ary").$to_a()
      };
      if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      if ((($a = other.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$clone()};
      
      var seen   = {},
          result = [];

      for (var i = 0, length = other.length; i < length; i++) {
        seen[other[i]] = true;
      }

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if (!seen[item]) {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$<<'] = function(object) {
      var self = this;

      self.push(object);
      return self;
    };

    def['$<=>'] = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
      } else if ((($a = other['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_ary().$to_a()
        } else {
        return nil
      };
      
      if (self.$hash() === other.$hash()) {
        return 0;
      }

      if (self.length != other.length) {
        return (self.length > other.length) ? 1 : -1;
      }

      for (var i = 0, length = self.length; i < length; i++) {
        var tmp = (self[i])['$<=>'](other[i]);

        if (tmp !== 0) {
          return tmp;
        }
      }

      return 0;
    ;
    };

    def['$=='] = function(other) {
      var $a, $b, self = this;

      if ((($a = self === other) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        if ((($a = other['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return false
        };
        return other['$=='](self);
      };
      other = other.$to_a();
      if ((($a = self.length === other.length) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var a = self[i],
            b = other[i];

        if (a._isArray && b._isArray && (a === self)) {
          continue;
        }

        if (!(a)['$=='](b)) {
          return false;
        }
      }
    
      return true;
    };

    def['$[]'] = function(index, length) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Range) == null ? $opal.cm('Range') : $b)['$==='](index)) !== nil && (!$a._isBoolean || $a == true))) {
        
        var size    = self.length,
            exclude = index.exclude,
            from    = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index.begin, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int"),
            to      = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index.end, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");

        if (from < 0) {
          from += size;

          if (from < 0) {
            return nil;
          }
        }

        if (from > size) {
          return nil;
        }

        if (to < 0) {
          to += size;

          if (to < 0) {
            return [];
          }
        }

        if (!exclude) {
          to += 1;
        }

        return self.slice(from, to);
      ;
        } else {
        index = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        
        var size = self.length;

        if (index < 0) {
          index += size;

          if (index < 0) {
            return nil;
          }
        }

        if (length === undefined) {
          if (index >= size || index < 0) {
            return nil;
          }

          return self[index];
        }
        else {
          length = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(length, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");

          if (length < 0 || index > size || index < 0) {
            return nil;
          }

          return self.slice(index, index + length);
        }
      
      };
    };

    def['$[]='] = function(index, value, extra) {
      var $a, $b, self = this, data = nil, length = nil;

      if ((($a = (($b = $scope.Range) == null ? $opal.cm('Range') : $b)['$==='](index)) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
          data = value.$to_a()
        } else if ((($a = value['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
          data = value.$to_ary().$to_a()
          } else {
          data = [value]
        };
        
        var size    = self.length,
            exclude = index.exclude,
            from    = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index.begin, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int"),
            to      = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index.end, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");

        if (from < 0) {
          from += size;

          if (from < 0) {
            self.$raise((($a = $scope.RangeError) == null ? $opal.cm('RangeError') : $a), "" + (index.$inspect()) + " out of range");
          }
        }

        if (to < 0) {
          to += size;
        }

        if (!exclude) {
          to += 1;
        }

        if (from > size) {
          for (var i = size; i < from; i++) {
            self[i] = nil;
          }
        }

        if (to < 0) {
          self.splice.apply(self, [from, 0].concat(data));
        }
        else {
          self.splice.apply(self, [from, to - from].concat(data));
        }

        return value;
      ;
        } else {
        if ((($a = extra === undefined) !== nil && (!$a._isBoolean || $a == true))) {
          length = 1
          } else {
          length = value;
          value = extra;
          if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
            data = value.$to_a()
          } else if ((($a = value['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
            data = value.$to_ary().$to_a()
            } else {
            data = [value]
          };
        };
        
        var size   = self.length,
            index  = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int"),
            length = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(length, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int"),
            old;

        if (index < 0) {
          old    = index;
          index += size;

          if (index < 0) {
            self.$raise((($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a), "index " + (old) + " too small for array; minimum " + (-self.length));
          }
        }

        if (length < 0) {
          self.$raise((($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a), "negative length (" + (length) + ")")
        }

        if (index > size) {
          for (var i = size; i < index; i++) {
            self[i] = nil;
          }
        }

        if (extra === undefined) {
          self[index] = value;
        }
        else {
          self.splice.apply(self, [index, length].concat(data));
        }

        return value;
      ;
      };
    };

    def.$assoc = function(object) {
      var self = this;

      
      for (var i = 0, length = self.length, item; i < length; i++) {
        if (item = self[i], item.length && (item[0])['$=='](object)) {
          return item;
        }
      }

      return nil;
    
    };

    def.$at = function(index) {
      var $a, self = this;

      index = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      
      if (index < 0) {
        index += self.length;
      }

      if (index < 0 || index >= self.length) {
        return nil;
      }

      return self[index];
    
    };

    def.$cycle = TMP_2 = function(n) {
      var $a, $b, self = this, $iter = TMP_2._p, block = $iter || nil;

      if (n == null) {
        n = nil
      }
      TMP_2._p = null;
      if ((($a = ((($b = self['$empty?']()) !== false && $b !== nil) ? $b : n['$=='](0))) !== nil && (!$a._isBoolean || $a == true))) {
        return nil};
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("cycle", n)
      };
      if ((($a = n['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        
        while (true) {
          for (var i = 0, length = self.length; i < length; i++) {
            var value = $opal.$yield1(block, self[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }
        }
      
        } else {
        n = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to!'](n, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        
        if (n <= 0) {
          return self;
        }

        while (n > 0) {
          for (var i = 0, length = self.length; i < length; i++) {
            var value = $opal.$yield1(block, self[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }

          n--;
        }
      
      };
      return self;
    };

    def.$clear = function() {
      var self = this;

      self.splice(0, self.length);
      return self;
    };

    def.$clone = function() {
      var self = this, copy = nil;

      copy = [];
      copy.$initialize_clone(self);
      return copy;
    };

    def.$dup = function() {
      var self = this, copy = nil;

      copy = [];
      copy.$initialize_dup(self);
      return copy;
    };

    def.$initialize_copy = function(other) {
      var self = this;

      return self.$replace(other);
    };

    def.$collect = TMP_3 = function() {
      var self = this, $iter = TMP_3._p, block = $iter || nil;

      TMP_3._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect")
      };
      
      var result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        var value = Opal.$yield1(block, self[i]);

        if (value === $breaker) {
          return $breaker.$v;
        }

        result.push(value);
      }

      return result;
    
    };

    def['$collect!'] = TMP_4 = function() {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect!")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var value = Opal.$yield1(block, self[i]);

        if (value === $breaker) {
          return $breaker.$v;
        }

        self[i] = value;
      }
    
      return self;
    };

    def.$compact = function() {
      var self = this;

      
      var result = [];

      for (var i = 0, length = self.length, item; i < length; i++) {
        if ((item = self[i]) !== nil) {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$compact!'] = function() {
      var self = this;

      
      var original = self.length;

      for (var i = 0, length = self.length; i < length; i++) {
        if (self[i] === nil) {
          self.splice(i, 1);

          length--;
          i--;
        }
      }

      return self.length === original ? nil : self;
    
    };

    def.$concat = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.Array) == null ? $opal.cm('Array') : $a), "to_ary").$to_a()
      };
      
      for (var i = 0, length = other.length; i < length; i++) {
        self.push(other[i]);
      }
    
      return self;
    };

    def.$delete = function(object) {
      var self = this;

      
      var original = self.length;

      for (var i = 0, length = original; i < length; i++) {
        if ((self[i])['$=='](object)) {
          self.splice(i, 1);

          length--;
          i--;
        }
      }

      return self.length === original ? nil : object;
    
    };

    def.$delete_at = function(index) {
      var $a, self = this;

      
      index = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");

      if (index < 0) {
        index += self.length;
      }

      if (index < 0 || index >= self.length) {
        return nil;
      }

      var result = self[index];

      self.splice(index, 1);

      return result;
    ;
    };

    def.$delete_if = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("delete_if")
      };
      
      for (var i = 0, length = self.length, value; i < length; i++) {
        if ((value = block(self[i])) === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          self.splice(i, 1);

          length--;
          i--;
        }
      }
    
      return self;
    };

    def.$drop = function(number) {
      var $a, self = this;

      
      if (number < 0) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a))
      }

      return self.slice(number);
    ;
    };

    $opal.defn(self, '$dup', def.$clone);

    def.$each = TMP_6 = function() {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var value = $opal.$yield1(block, self[i]);

        if (value == $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def.$each_index = TMP_7 = function() {
      var self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_index")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var value = $opal.$yield1(block, i);

        if (value === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def['$empty?'] = function() {
      var self = this;

      return self.length === 0;
    };

    def['$eql?'] = function(other) {
      var $a, $b, self = this;

      if ((($a = self === other) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      other = other.$to_a();
      if ((($a = self.length === other.length) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var a = self[i],
            b = other[i];

        if (a._isArray && b._isArray && (a === self)) {
          continue;
        }

        if (!(a)['$eql?'](b)) {
          return false;
        }
      }
    
      return true;
    };

    def.$fetch = TMP_8 = function(index, defaults) {
      var $a, self = this, $iter = TMP_8._p, block = $iter || nil;

      TMP_8._p = null;
      
      var original = index;

      index = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");

      if (index < 0) {
        index += self.length;
      }

      if (index >= 0 && index < self.length) {
        return self[index];
      }

      if (block !== nil) {
        return block(original);
      }

      if (defaults != null) {
        return defaults;
      }

      if (self.length === 0) {
        self.$raise((($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a), "index " + (original) + " outside of array bounds: 0...0")
      }
      else {
        self.$raise((($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a), "index " + (original) + " outside of array bounds: -" + (self.length) + "..." + (self.length));
      }
    ;
    };

    def.$fill = TMP_9 = function(args) {
      var $a, $b, self = this, $iter = TMP_9._p, block = $iter || nil, one = nil, two = nil, obj = nil, left = nil, right = nil;

      args = $slice.call(arguments, 0);
      TMP_9._p = null;
      if (block !== false && block !== nil) {
        if ((($a = args.length > 2) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "wrong number of arguments (" + (args.$length()) + " for 0..2)")};
        $a = $opal.to_ary(args), one = ($a[0] == null ? nil : $a[0]), two = ($a[1] == null ? nil : $a[1]);
        } else {
        if ((($a = args.length == 0) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "wrong number of arguments (0 for 1..3)")
        } else if ((($a = args.length > 3) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "wrong number of arguments (" + (args.$length()) + " for 1..3)")};
        $a = $opal.to_ary(args), obj = ($a[0] == null ? nil : $a[0]), one = ($a[1] == null ? nil : $a[1]), two = ($a[2] == null ? nil : $a[2]);
      };
      if ((($a = (($b = $scope.Range) == null ? $opal.cm('Range') : $b)['$==='](one)) !== nil && (!$a._isBoolean || $a == true))) {
        if (two !== false && two !== nil) {
          self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "length invalid with range")};
        left = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(one.$begin(), (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        if ((($a = left < 0) !== nil && (!$a._isBoolean || $a == true))) {
          left += self.length;};
        if ((($a = left < 0) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise((($a = $scope.RangeError) == null ? $opal.cm('RangeError') : $a), "" + (one.$inspect()) + " out of range")};
        right = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(one.$end(), (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        if ((($a = right < 0) !== nil && (!$a._isBoolean || $a == true))) {
          right += self.length;};
        if ((($a = one['$exclude_end?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          right += 1;
        };
        if ((($a = right <= left) !== nil && (!$a._isBoolean || $a == true))) {
          return self};
      } else if (one !== false && one !== nil) {
        left = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(one, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        if ((($a = left < 0) !== nil && (!$a._isBoolean || $a == true))) {
          left += self.length;};
        if ((($a = left < 0) !== nil && (!$a._isBoolean || $a == true))) {
          left = 0};
        if (two !== false && two !== nil) {
          right = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(two, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
          if ((($a = right == 0) !== nil && (!$a._isBoolean || $a == true))) {
            return self};
          right += left;
          } else {
          right = self.length
        };
        } else {
        left = 0;
        right = self.length;
      };
      if ((($a = left > self.length) !== nil && (!$a._isBoolean || $a == true))) {
        
        for (var i = self.length; i < right; i++) {
          self[i] = nil;
        }
      ;};
      if ((($a = right > self.length) !== nil && (!$a._isBoolean || $a == true))) {
        self.length = right};
      if (block !== false && block !== nil) {
        
        for (var length = self.length; left < right; left++) {
          var value = block(left);

          if (value === $breaker) {
            return $breaker.$v;
          }

          self[left] = value;
        }
      ;
        } else {
        
        for (var length = self.length; left < right; left++) {
          self[left] = obj;
        }
      ;
      };
      return self;
    };

    def.$first = function(count) {
      var $a, self = this;

      
      if (count == null) {
        return self.length === 0 ? nil : self[0];
      }

      count = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(count, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");

      if (count < 0) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "negative array size");
      }

      return self.slice(0, count);
    
    };

    def.$flatten = function(level) {
      var $a, self = this;

      
      var result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if ((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$respond_to?'](item, "to_ary")) {
          item = (item).$to_ary();

          if (level == null) {
            result.push.apply(result, (item).$flatten().$to_a());
          }
          else if (level == 0) {
            result.push(item);
          }
          else {
            result.push.apply(result, (item).$flatten(level - 1).$to_a());
          }
        }
        else {
          result.push(item);
        }
      }

      return result;
    ;
    };

    def['$flatten!'] = function(level) {
      var self = this;

      
      var flattened = self.$flatten(level);

      if (self.length == flattened.length) {
        for (var i = 0, length = self.length; i < length; i++) {
          if (self[i] !== flattened[i]) {
            break;
          }
        }

        if (i == length) {
          return nil;
        }
      }

      self.$replace(flattened);
    ;
      return self;
    };

    def.$hash = function() {
      var self = this;

      return self._id || (self._id = Opal.uid());
    };

    def['$include?'] = function(member) {
      var self = this;

      
      for (var i = 0, length = self.length; i < length; i++) {
        if ((self[i])['$=='](member)) {
          return true;
        }
      }

      return false;
    
    };

    def.$index = TMP_10 = function(object) {
      var self = this, $iter = TMP_10._p, block = $iter || nil;

      TMP_10._p = null;
      
      if (object != null) {
        for (var i = 0, length = self.length; i < length; i++) {
          if ((self[i])['$=='](object)) {
            return i;
          }
        }
      }
      else if (block !== nil) {
        for (var i = 0, length = self.length, value; i < length; i++) {
          if ((value = block(self[i])) === $breaker) {
            return $breaker.$v;
          }

          if (value !== false && value !== nil) {
            return i;
          }
        }
      }
      else {
        return self.$enum_for("index");
      }

      return nil;
    
    };

    def.$insert = function(index, objects) {
      var $a, self = this;

      objects = $slice.call(arguments, 1);
      
      index = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(index, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");

      if (objects.length > 0) {
        if (index < 0) {
          index += self.length + 1;

          if (index < 0) {
            self.$raise((($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a), "" + (index) + " is out of bounds");
          }
        }
        if (index > self.length) {
          for (var i = self.length; i < index; i++) {
            self.push(nil);
          }
        }

        self.splice.apply(self, [index, 0].concat(objects));
      }
    ;
      return self;
    };

    def.$inspect = function() {
      var self = this;

      
      var i, inspect, el, el_insp, length, object_id;

      inspect = [];
      object_id = self.$object_id();
      length = self.length;

      for (i = 0; i < length; i++) {
        el = self['$[]'](i);

        // Check object_id to ensure it's not the same array get into an infinite loop
        el_insp = (el).$object_id() === object_id ? '[...]' : (el).$inspect();

        inspect.push(el_insp);
      }
      return '[' + inspect.join(', ') + ']';
    ;
    };

    def.$join = function(sep) {
      var $a, self = this;
      if ($gvars[","] == null) $gvars[","] = nil;

      if (sep == null) {
        sep = nil
      }
      if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return ""};
      if ((($a = sep === nil) !== nil && (!$a._isBoolean || $a == true))) {
        sep = $gvars[","]};
      
      var result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if ((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$respond_to?'](item, "to_str")) {
          var tmp = (item).$to_str();

          if (tmp !== nil) {
            result.push((tmp).$to_s());

            continue;
          }
        }

        if ((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$respond_to?'](item, "to_ary")) {
          var tmp = (item).$to_ary();

          if (tmp !== nil) {
            result.push((tmp).$join(sep));

            continue;
          }
        }

        if ((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$respond_to?'](item, "to_s")) {
          var tmp = (item).$to_s();

          if (tmp !== nil) {
            result.push(tmp);

            continue;
          }
        }

        self.$raise((($a = $scope.NoMethodError) == null ? $opal.cm('NoMethodError') : $a), "" + ((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$inspect(item)) + " doesn't respond to #to_str, #to_ary or #to_s");
      }

      if (sep === nil) {
        return result.join('');
      }
      else {
        return result.join((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to!'](sep, (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s());
      }
    ;
    };

    def.$keep_if = TMP_11 = function() {
      var self = this, $iter = TMP_11._p, block = $iter || nil;

      TMP_11._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("keep_if")
      };
      
      for (var i = 0, length = self.length, value; i < length; i++) {
        if ((value = block(self[i])) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          self.splice(i, 1);

          length--;
          i--;
        }
      }
    
      return self;
    };

    def.$last = function(count) {
      var $a, self = this;

      
      if (count == null) {
        return self.length === 0 ? nil : self[self.length - 1];
      }

      count = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(count, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");

      if (count < 0) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "negative array size");
      }

      if (count > self.length) {
        count = self.length;
      }

      return self.slice(self.length - count, self.length);
    
    };

    def.$length = function() {
      var self = this;

      return self.length;
    };

    $opal.defn(self, '$map', def.$collect);

    $opal.defn(self, '$map!', def['$collect!']);

    def.$pop = function(count) {
      var $a, self = this;

      if ((($a = count === undefined) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
          return nil};
        return self.pop();};
      count = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(count, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      if ((($a = count < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "negative array size")};
      if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      if ((($a = count > self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self.splice(0, self.length);
        } else {
        return self.splice(self.length - count, self.length);
      };
    };

    def.$push = function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      
      for (var i = 0, length = objects.length; i < length; i++) {
        self.push(objects[i]);
      }
    
      return self;
    };

    def.$rassoc = function(object) {
      var self = this;

      
      for (var i = 0, length = self.length, item; i < length; i++) {
        item = self[i];

        if (item.length && item[1] !== undefined) {
          if ((item[1])['$=='](object)) {
            return item;
          }
        }
      }

      return nil;
    
    };

    def.$reject = TMP_12 = function() {
      var self = this, $iter = TMP_12._p, block = $iter || nil;

      TMP_12._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reject")
      };
      
      var result = [];

      for (var i = 0, length = self.length, value; i < length; i++) {
        if ((value = block(self[i])) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          result.push(self[i]);
        }
      }
      return result;
    
    };

    def['$reject!'] = TMP_13 = function() {
      var $a, $b, self = this, $iter = TMP_13._p, block = $iter || nil, original = nil;

      TMP_13._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reject!")
      };
      original = self.$length();
      ($a = ($b = self).$delete_if, $a._p = block.$to_proc(), $a).call($b);
      if (self.$length()['$=='](original)) {
        return nil
        } else {
        return self
      };
    };

    def.$replace = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.Array) == null ? $opal.cm('Array') : $a), "to_ary").$to_a()
      };
      
      self.splice(0, self.length);
      self.push.apply(self, other);
    
      return self;
    };

    def.$reverse = function() {
      var self = this;

      return self.slice(0).reverse();
    };

    def['$reverse!'] = function() {
      var self = this;

      return self.reverse();
    };

    def.$reverse_each = TMP_14 = function() {
      var $a, $b, self = this, $iter = TMP_14._p, block = $iter || nil;

      TMP_14._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reverse_each")
      };
      ($a = ($b = self.$reverse()).$each, $a._p = block.$to_proc(), $a).call($b);
      return self;
    };

    def.$rindex = TMP_15 = function(object) {
      var self = this, $iter = TMP_15._p, block = $iter || nil;

      TMP_15._p = null;
      
      if (object != null) {
        for (var i = self.length - 1; i >= 0; i--) {
          if ((self[i])['$=='](object)) {
            return i;
          }
        }
      }
      else if (block !== nil) {
        for (var i = self.length - 1, value; i >= 0; i--) {
          if ((value = block(self[i])) === $breaker) {
            return $breaker.$v;
          }

          if (value !== false && value !== nil) {
            return i;
          }
        }
      }
      else if (object == null) {
        return self.$enum_for("rindex");
      }

      return nil;
    
    };

    def.$sample = function(n) {
      var $a, $b, TMP_16, self = this;

      if (n == null) {
        n = nil
      }
      if ((($a = ($b = n['$!'](), $b !== false && $b !== nil ?self['$empty?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return nil};
      if ((($a = (($b = n !== false && n !== nil) ? self['$empty?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      if (n !== false && n !== nil) {
        return ($a = ($b = ($range(1, n, false))).$map, $a._p = (TMP_16 = function(){var self = TMP_16._s || this;

        return self['$[]'](self.$rand(self.$length()))}, TMP_16._s = self, TMP_16), $a).call($b)
        } else {
        return self['$[]'](self.$rand(self.$length()))
      };
    };

    def.$select = TMP_17 = function() {
      var self = this, $iter = TMP_17._p, block = $iter || nil;

      TMP_17._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("select")
      };
      
      var result = [];

      for (var i = 0, length = self.length, item, value; i < length; i++) {
        item = self[i];

        if ((value = $opal.$yield1(block, item)) === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$select!'] = TMP_18 = function() {
      var $a, $b, self = this, $iter = TMP_18._p, block = $iter || nil;

      TMP_18._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("select!")
      };
      
      var original = self.length;
      ($a = ($b = self).$keep_if, $a._p = block.$to_proc(), $a).call($b);
      return self.length === original ? nil : self;
    
    };

    def.$shift = function(count) {
      var $a, self = this;

      if ((($a = count === undefined) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
          return nil};
        return self.shift();};
      count = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(count, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      if ((($a = count < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "negative array size")};
      if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      return self.splice(0, count);
    };

    $opal.defn(self, '$size', def.$length);

    def.$shuffle = function() {
      var self = this;

      return self.$clone()['$shuffle!']();
    };

    def['$shuffle!'] = function() {
      var self = this;

      
      for (var i = self.length - 1; i > 0; i--) {
        var tmp = self[i],
            j   = Math.floor(Math.random() * (i + 1));

        self[i] = self[j];
        self[j] = tmp;
      }
    
      return self;
    };

    $opal.defn(self, '$slice', def['$[]']);

    def['$slice!'] = function(index, length) {
      var self = this;

      
      if (index < 0) {
        index += self.length;
      }

      if (length != null) {
        return self.splice(index, length);
      }

      if (index < 0 || index >= self.length) {
        return nil;
      }

      return self.splice(index, 1)[0];
    
    };

    def.$sort = TMP_19 = function() {
      var $a, self = this, $iter = TMP_19._p, block = $iter || nil;

      TMP_19._p = null;
      if ((($a = self.length > 1) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return self
      };
      
      if (!(block !== nil)) {
        block = function(a, b) {
          return (a)['$<=>'](b);
        };
      }

      try {
        return self.slice().sort(function(x, y) {
          var ret = block(x, y);

          if (ret === $breaker) {
            throw $breaker;
          }
          else if (ret === nil) {
            self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "comparison of " + ((x).$inspect()) + " with " + ((y).$inspect()) + " failed");
          }

          return (ret)['$>'](0) ? 1 : ((ret)['$<'](0) ? -1 : 0);
        });
      }
      catch (e) {
        if (e === $breaker) {
          return $breaker.$v;
        }
        else {
          throw e;
        }
      }
    ;
    };

    def['$sort!'] = TMP_20 = function() {
      var $a, $b, self = this, $iter = TMP_20._p, block = $iter || nil;

      TMP_20._p = null;
      
      var result;

      if ((block !== nil)) {
        result = ($a = ($b = (self.slice())).$sort, $a._p = block.$to_proc(), $a).call($b);
      }
      else {
        result = (self.slice()).$sort();
      }

      self.length = 0;
      for(var i = 0, length = result.length; i < length; i++) {
        self.push(result[i]);
      }

      return self;
    ;
    };

    def.$take = function(count) {
      var $a, self = this;

      
      if (count < 0) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a));
      }

      return self.slice(0, count);
    ;
    };

    def.$take_while = TMP_21 = function() {
      var self = this, $iter = TMP_21._p, block = $iter || nil;

      TMP_21._p = null;
      
      var result = [];

      for (var i = 0, length = self.length, item, value; i < length; i++) {
        item = self[i];

        if ((value = block(item)) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          return result;
        }

        result.push(item);
      }

      return result;
    
    };

    def.$to_a = function() {
      var self = this;

      return self;
    };

    $opal.defn(self, '$to_ary', def.$to_a);

    $opal.defn(self, '$to_s', def.$inspect);

    def.$transpose = function() {
      var $a, $b, TMP_22, self = this, result = nil, max = nil;

      if ((($a = self['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      result = [];
      max = nil;
      ($a = ($b = self).$each, $a._p = (TMP_22 = function(row){var self = TMP_22._s || this, $a, $b, TMP_23;
if (row == null) row = nil;
      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](row)) !== nil && (!$a._isBoolean || $a == true))) {
          row = row.$to_a()
          } else {
          row = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(row, (($a = $scope.Array) == null ? $opal.cm('Array') : $a), "to_ary").$to_a()
        };
        ((($a = max) !== false && $a !== nil) ? $a : max = row.length);
        if ((($a = (row.length)['$=='](max)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise((($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a), "element size differs (" + (row.length) + " should be " + (max))};
        return ($a = ($b = (row.length)).$times, $a._p = (TMP_23 = function(i){var self = TMP_23._s || this, $a, $b, $c, entry = nil;
if (i == null) i = nil;
        entry = (($a = i, $b = result, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, []))));
          return entry['$<<'](row.$at(i));}, TMP_23._s = self, TMP_23), $a).call($b);}, TMP_22._s = self, TMP_22), $a).call($b);
      return result;
    };

    def.$uniq = function() {
      var self = this;

      
      var result = [],
          seen   = {};

      for (var i = 0, length = self.length, item, hash; i < length; i++) {
        item = self[i];
        hash = item;

        if (!seen[hash]) {
          seen[hash] = true;

          result.push(item);
        }
      }

      return result;
    
    };

    def['$uniq!'] = function() {
      var self = this;

      
      var original = self.length,
          seen     = {};

      for (var i = 0, length = original, item, hash; i < length; i++) {
        item = self[i];
        hash = item;

        if (!seen[hash]) {
          seen[hash] = true;
        }
        else {
          self.splice(i, 1);

          length--;
          i--;
        }
      }

      return self.length === original ? nil : self;
    
    };

    def.$unshift = function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      
      for (var i = objects.length - 1; i >= 0; i--) {
        self.unshift(objects[i]);
      }
    
      return self;
    };

    return (def.$zip = TMP_24 = function(others) {
      var self = this, $iter = TMP_24._p, block = $iter || nil;

      others = $slice.call(arguments, 0);
      TMP_24._p = null;
      
      var result = [], size = self.length, part, o;

      for (var i = 0; i < size; i++) {
        part = [self[i]];

        for (var j = 0, jj = others.length; j < jj; j++) {
          o = others[j][i];

          if (o == null) {
            o = nil;
          }

          part[j + 1] = o;
        }

        result[i] = part;
      }

      if (block !== nil) {
        for (var i = 0; i < size; i++) {
          block(result[i]);
        }

        return nil;
      }

      return result;
    
    }, nil) && 'zip';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/array.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$new', '$allocate', '$initialize', '$to_proc', '$__send__', '$clone', '$respond_to?', '$==', '$eql?', '$inspect', '$*', '$class', '$slice', '$uniq', '$flatten']);
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self._proto, $scope = self._scope;

    return ($opal.defs(self, '$inherited', function(klass) {
      var $a, $b, self = this, replace = nil;

      replace = (($a = $scope.Class) == null ? $opal.cm('Class') : $a).$new((($a = ((($b = $scope.Array) == null ? $opal.cm('Array') : $b))._scope).Wrapper == null ? $a.cm('Wrapper') : $a.Wrapper));
      
      klass._proto        = replace._proto;
      klass._proto._klass = klass;
      klass._alloc        = replace._alloc;
      klass.__parent      = (($a = ((($b = $scope.Array) == null ? $opal.cm('Array') : $b))._scope).Wrapper == null ? $a.cm('Wrapper') : $a.Wrapper);

      klass.$allocate = replace.$allocate;
      klass.$new      = replace.$new;
      klass["$[]"]    = replace["$[]"];
    
    }), nil) && 'inherited'
  })(self, null);
  return (function($base, $super) {
    function $Wrapper(){};
    var self = $Wrapper = $klass($base, $super, 'Wrapper', $Wrapper);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5;

    def.literal = nil;
    $opal.defs(self, '$allocate', TMP_1 = function(array) {
      var self = this, $iter = TMP_1._p, $yield = $iter || nil, obj = nil;

      if (array == null) {
        array = []
      }
      TMP_1._p = null;
      obj = $opal.find_super_dispatcher(self, 'allocate', TMP_1, null, $Wrapper).apply(self, []);
      obj.literal = array;
      return obj;
    });

    $opal.defs(self, '$new', TMP_2 = function(args) {
      var $a, $b, self = this, $iter = TMP_2._p, block = $iter || nil, obj = nil;

      args = $slice.call(arguments, 0);
      TMP_2._p = null;
      obj = self.$allocate();
      ($a = ($b = obj).$initialize, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
      return obj;
    });

    $opal.defs(self, '$[]', function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      return self.$allocate(objects);
    });

    def.$initialize = TMP_3 = function(args) {
      var $a, $b, $c, self = this, $iter = TMP_3._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_3._p = null;
      return self.literal = ($a = ($b = (($c = $scope.Array) == null ? $opal.cm('Array') : $c)).$new, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
    };

    def.$method_missing = TMP_4 = function(args) {
      var $a, $b, self = this, $iter = TMP_4._p, block = $iter || nil, result = nil;

      args = $slice.call(arguments, 0);
      TMP_4._p = null;
      result = ($a = ($b = self.literal).$__send__, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
      if ((($a = result === self.literal) !== nil && (!$a._isBoolean || $a == true))) {
        return self
        } else {
        return result
      };
    };

    def.$initialize_copy = function(other) {
      var self = this;

      return self.literal = (other.literal).$clone();
    };

    def['$respond_to?'] = TMP_5 = function(name) {var $zuper = $slice.call(arguments, 0);
      var $a, self = this, $iter = TMP_5._p, $yield = $iter || nil;

      TMP_5._p = null;
      return ((($a = $opal.find_super_dispatcher(self, 'respond_to?', TMP_5, $iter).apply(self, $zuper)) !== false && $a !== nil) ? $a : self.literal['$respond_to?'](name));
    };

    def['$=='] = function(other) {
      var self = this;

      return self.literal['$=='](other);
    };

    def['$eql?'] = function(other) {
      var self = this;

      return self.literal['$eql?'](other);
    };

    def.$to_a = function() {
      var self = this;

      return self.literal;
    };

    def.$to_ary = function() {
      var self = this;

      return self;
    };

    def.$inspect = function() {
      var self = this;

      return self.literal.$inspect();
    };

    def['$*'] = function(other) {
      var self = this;

      
      var result = self.literal['$*'](other);

      if (result._isArray) {
        return self.$class().$allocate(result)
      }
      else {
        return result;
      }
    ;
    };

    def['$[]'] = function(index, length) {
      var self = this;

      
      var result = self.literal.$slice(index, length);

      if (result._isArray && (index._isRange || length !== undefined)) {
        return self.$class().$allocate(result)
      }
      else {
        return result;
      }
    ;
    };

    $opal.defn(self, '$slice', def['$[]']);

    def.$uniq = function() {
      var self = this;

      return self.$class().$allocate(self.literal.$uniq());
    };

    return (def.$flatten = function(level) {
      var self = this;

      return self.$class().$allocate(self.literal.$flatten(level));
    }, nil) && 'flatten';
  })((($a = $scope.Array) == null ? $opal.cm('Array') : $a), null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/array/inheritance.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$!', '$==', '$call', '$coerce_to!', '$lambda?', '$abs', '$arity', '$raise', '$enum_for', '$flatten', '$inspect', '$===', '$alias_method', '$clone']);
  ;
  return (function($base, $super) {
    function $Hash(){};
    var self = $Hash = $klass($base, $super, 'Hash', $Hash);

    var def = self._proto, $scope = self._scope, $a, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_8, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13;

    def.proc = def.none = nil;
    self.$include((($a = $scope.Enumerable) == null ? $opal.cm('Enumerable') : $a));

    $opal.defs(self, '$[]', function(objs) {
      var self = this;

      objs = $slice.call(arguments, 0);
      return $opal.hash.apply(null, objs);
    });

    $opal.defs(self, '$allocate', function() {
      var self = this;

      
      var hash = new self._alloc;

      hash.map  = {};
      hash.keys = [];
      hash.none = nil;
      hash.proc = nil;

      return hash;
    
    });

    def.$initialize = TMP_1 = function(defaults) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      
      self.none = (defaults === undefined ? nil : defaults);
      self.proc = block;
    
      return self;
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (self === other) {
        return true;
      }

      if (!other.map || !other.keys) {
        return false;
      }

      if (self.keys.length !== other.keys.length) {
        return false;
      }

      var map  = self.map,
          map2 = other.map;

      for (var i = 0, length = self.keys.length; i < length; i++) {
        var key = self.keys[i], obj = map[key], obj2 = map2[key];
        if (obj2 === undefined || (obj)['$=='](obj2)['$!']()) {
          return false;
        }
      }

      return true;
    
    };

    def['$[]'] = function(key) {
      var self = this;

      
      var map = self.map;

      if ($opal.hasOwnProperty.call(map, key)) {
        return map[key];
      }

      var proc = self.proc;

      if (proc !== nil) {
        return (proc).$call(self, key);
      }

      return self.none;
    
    };

    def['$[]='] = function(key, value) {
      var self = this;

      
      var map = self.map;

      if (!$opal.hasOwnProperty.call(map, key)) {
        self.keys.push(key);
      }

      map[key] = value;

      return value;
    
    };

    def.$assoc = function(object) {
      var self = this;

      
      var keys = self.keys, key;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if ((key)['$=='](object)) {
          return [key, self.map[key]];
        }
      }

      return nil;
    
    };

    def.$clear = function() {
      var self = this;

      
      self.map = {};
      self.keys = [];
      return self;
    
    };

    def.$clone = function() {
      var self = this;

      
      var map  = {},
          keys = [];

      for (var i = 0, length = self.keys.length; i < length; i++) {
        var key   = self.keys[i],
            value = self.map[key];

        keys.push(key);
        map[key] = value;
      }

      var hash = new self._klass._alloc();

      hash.map  = map;
      hash.keys = keys;
      hash.none = self.none;
      hash.proc = self.proc;

      return hash;
    
    };

    def.$default = function(val) {
      var self = this;

      
      if (val !== undefined && self.proc !== nil) {
        return self.proc.$call(self, val);
      }
      return self.none;
    ;
    };

    def['$default='] = function(object) {
      var self = this;

      
      self.proc = nil;
      return (self.none = object);
    
    };

    def.$default_proc = function() {
      var self = this;

      return self.proc;
    };

    def['$default_proc='] = function(proc) {
      var $a, self = this;

      
      if (proc !== nil) {
        proc = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to!'](proc, (($a = $scope.Proc) == null ? $opal.cm('Proc') : $a), "to_proc");

        if (proc['$lambda?']() && proc.$arity().$abs() != 2) {
          self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "default_proc takes two arguments");
        }
      }
      self.none = nil;
      return (self.proc = proc);
    ;
    };

    def.$delete = TMP_2 = function(key) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      
      var map  = self.map, result = map[key];

      if (result != null) {
        delete map[key];
        self.keys.$delete(key);

        return result;
      }

      if (block !== nil) {
        return block.$call(key);
      }
      return nil;
    
    };

    def.$delete_if = TMP_3 = function() {
      var self = this, $iter = TMP_3._p, block = $iter || nil;

      TMP_3._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("delete_if")
      };
      
      var map = self.map, keys = self.keys, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          keys.splice(i, 1);
          delete map[key];

          length--;
          i--;
        }
      }

      return self;
    
    };

    $opal.defn(self, '$dup', def.$clone);

    def.$each = TMP_4 = function() {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each")
      };
      
      var map  = self.map,
          keys = self.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key   = keys[i],
            value = $opal.$yield1(block, [key, map[key]]);

        if (value === $breaker) {
          return $breaker.$v;
        }
      }

      return self;
    
    };

    def.$each_key = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each_key")
      };
      
      var keys = self.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        if (block(key) === $breaker) {
          return $breaker.$v;
        }
      }

      return self;
    
    };

    $opal.defn(self, '$each_pair', def.$each);

    def.$each_value = TMP_6 = function() {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each_value")
      };
      
      var map = self.map, keys = self.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        if (block(map[keys[i]]) === $breaker) {
          return $breaker.$v;
        }
      }

      return self;
    
    };

    def['$empty?'] = function() {
      var self = this;

      return self.keys.length === 0;
    };

    $opal.defn(self, '$eql?', def['$==']);

    def.$fetch = TMP_7 = function(key, defaults) {
      var $a, self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      
      var value = self.map[key];

      if (value != null) {
        return value;
      }

      if (block !== nil) {
        var value;

        if ((value = block(key)) === $breaker) {
          return $breaker.$v;
        }

        return value;
      }

      if (defaults != null) {
        return defaults;
      }

      self.$raise((($a = $scope.KeyError) == null ? $opal.cm('KeyError') : $a), "key not found");
    
    };

    def.$flatten = function(level) {
      var self = this;

      
      var map = self.map, keys = self.keys, result = [];

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], value = map[key];

        result.push(key);

        if (value._isArray) {
          if (level == null || level === 1) {
            result.push(value);
          }
          else {
            result = result.concat((value).$flatten(level - 1));
          }
        }
        else {
          result.push(value);
        }
      }

      return result;
    
    };

    def['$has_key?'] = function(key) {
      var self = this;

      return $opal.hasOwnProperty.call(self.map, key);
    };

    def['$has_value?'] = function(value) {
      var self = this;

      
      for (var assoc in self.map) {
        if ((self.map[assoc])['$=='](value)) {
          return true;
        }
      }

      return false;
    ;
    };

    def.$hash = function() {
      var self = this;

      return self._id;
    };

    $opal.defn(self, '$include?', def['$has_key?']);

    def.$index = function(object) {
      var self = this;

      
      var map = self.map, keys = self.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        if ((map[key])['$=='](object)) {
          return key;
        }
      }

      return nil;
    
    };

    def.$indexes = function(keys) {
      var self = this;

      keys = $slice.call(arguments, 0);
      
      var result = [], map = self.map, val;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], val = map[key];

        if (val != null) {
          result.push(val);
        }
        else {
          result.push(self.none);
        }
      }

      return result;
    
    };

    $opal.defn(self, '$indices', def.$indexes);

    def.$inspect = function() {
      var self = this;

      
      var inspect = [], keys = self.keys, map = self.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], val = map[key];

        if (val === self) {
          inspect.push((key).$inspect() + '=>' + '{...}');
        } else {
          inspect.push((key).$inspect() + '=>' + (map[key]).$inspect());
        }
      }

      return '{' + inspect.join(', ') + '}';
    ;
    };

    def.$invert = function() {
      var self = this;

      
      var result = $opal.hash(), keys = self.keys, map = self.map,
          keys2 = result.keys, map2 = result.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        keys2.push(obj);
        map2[obj] = key;
      }

      return result;
    
    };

    def.$keep_if = TMP_8 = function() {
      var self = this, $iter = TMP_8._p, block = $iter || nil;

      TMP_8._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("keep_if")
      };
      
      var map = self.map, keys = self.keys, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          keys.splice(i, 1);
          delete map[key];

          length--;
          i--;
        }
      }

      return self;
    
    };

    $opal.defn(self, '$key', def.$index);

    $opal.defn(self, '$key?', def['$has_key?']);

    def.$keys = function() {
      var self = this;

      return self.keys.slice(0);
    };

    def.$length = function() {
      var self = this;

      return self.keys.length;
    };

    $opal.defn(self, '$member?', def['$has_key?']);

    def.$merge = TMP_9 = function(other) {
      var $a, self = this, $iter = TMP_9._p, block = $iter || nil;

      TMP_9._p = null;
      
      if (! (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a)['$==='](other)) {
        other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to!'](other, (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a), "to_hash");
      }

      var keys = self.keys, map = self.map,
          result = $opal.hash(), keys2 = result.keys, map2 = result.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        keys2.push(key);
        map2[key] = map[key];
      }

      var keys = other.keys, map = other.map;

      if (block === nil) {
        for (var i = 0, length = keys.length; i < length; i++) {
          var key = keys[i];

          if (map2[key] == null) {
            keys2.push(key);
          }

          map2[key] = map[key];
        }
      }
      else {
        for (var i = 0, length = keys.length; i < length; i++) {
          var key = keys[i];

          if (map2[key] == null) {
            keys2.push(key);
            map2[key] = map[key];
          }
          else {
            map2[key] = block(key, map2[key], map[key]);
          }
        }
      }

      return result;
    ;
    };

    def['$merge!'] = TMP_10 = function(other) {
      var $a, self = this, $iter = TMP_10._p, block = $iter || nil;

      TMP_10._p = null;
      
      if (! (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a)['$==='](other)) {
        other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to!'](other, (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a), "to_hash");
      }

      var keys = self.keys, map = self.map,
          keys2 = other.keys, map2 = other.map;

      if (block === nil) {
        for (var i = 0, length = keys2.length; i < length; i++) {
          var key = keys2[i];

          if (map[key] == null) {
            keys.push(key);
          }

          map[key] = map2[key];
        }
      }
      else {
        for (var i = 0, length = keys2.length; i < length; i++) {
          var key = keys2[i];

          if (map[key] == null) {
            keys.push(key);
            map[key] = map2[key];
          }
          else {
            map[key] = block(key, map[key], map2[key]);
          }
        }
      }

      return self;
    ;
    };

    def.$rassoc = function(object) {
      var self = this;

      
      var keys = self.keys, map = self.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((obj)['$=='](object)) {
          return [key, obj];
        }
      }

      return nil;
    
    };

    def.$reject = TMP_11 = function() {
      var self = this, $iter = TMP_11._p, block = $iter || nil;

      TMP_11._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("reject")
      };
      
      var keys = self.keys, map = self.map,
          result = $opal.hash(), map2 = result.map, keys2 = result.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key], value;

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          keys2.push(key);
          map2[key] = obj;
        }
      }

      return result;
    
    };

    def.$replace = function(other) {
      var self = this;

      
      var map = self.map = {}, keys = self.keys = [];

      for (var i = 0, length = other.keys.length; i < length; i++) {
        var key = other.keys[i];
        keys.push(key);
        map[key] = other.map[key];
      }

      return self;
    
    };

    def.$select = TMP_12 = function() {
      var self = this, $iter = TMP_12._p, block = $iter || nil;

      TMP_12._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("select")
      };
      
      var keys = self.keys, map = self.map,
          result = $opal.hash(), map2 = result.map, keys2 = result.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key], value;

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          keys2.push(key);
          map2[key] = obj;
        }
      }

      return result;
    
    };

    def['$select!'] = TMP_13 = function() {
      var self = this, $iter = TMP_13._p, block = $iter || nil;

      TMP_13._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("select!")
      };
      
      var map = self.map, keys = self.keys, value, result = nil;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          keys.splice(i, 1);
          delete map[key];

          length--;
          i--;
          result = self
        }
      }

      return result;
    
    };

    def.$shift = function() {
      var self = this;

      
      var keys = self.keys, map = self.map;

      if (keys.length) {
        var key = keys[0], obj = map[key];

        delete map[key];
        keys.splice(0, 1);

        return [key, obj];
      }

      return nil;
    
    };

    $opal.defn(self, '$size', def.$length);

    self.$alias_method("store", "[]=");

    def.$to_a = function() {
      var self = this;

      
      var keys = self.keys, map = self.map, result = [];

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];
        result.push([key, map[key]]);
      }

      return result;
    
    };

    def.$to_h = function() {
      var self = this;

      
      var hash   = new Opal.Hash._alloc,
          cloned = self.$clone();

      hash.map  = cloned.map;
      hash.keys = cloned.keys;
      hash.none = cloned.none;
      hash.proc = cloned.proc;

      return hash;
    ;
    };

    def.$to_hash = function() {
      var self = this;

      return self;
    };

    $opal.defn(self, '$to_s', def.$inspect);

    $opal.defn(self, '$update', def['$merge!']);

    $opal.defn(self, '$value?', def['$has_value?']);

    $opal.defn(self, '$values_at', def.$indexes);

    return (def.$values = function() {
      var self = this;

      
      var map    = self.map,
          result = [];

      for (var key in map) {
        result.push(map[key]);
      }

      return result;
    
    }, nil) && 'values';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/hash.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars;

  $opal.add_stubs(['$include', '$to_str', '$===', '$format', '$coerce_to', '$to_s', '$respond_to?', '$<=>', '$raise', '$=~', '$empty?', '$ljust', '$ceil', '$/', '$+', '$rjust', '$floor', '$to_a', '$each_char', '$to_proc', '$coerce_to!', '$initialize_clone', '$initialize_dup', '$enum_for', '$split', '$chomp', '$escape', '$class', '$to_i', '$name', '$!', '$each_line', '$match', '$new', '$try_convert', '$chars', '$&', '$join', '$is_a?', '$[]', '$str', '$value', '$proc', '$send']);
  ;
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self._proto, $scope = self._scope, $a, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7;

    def.length = nil;
    self.$include((($a = $scope.Comparable) == null ? $opal.cm('Comparable') : $a));

    def._isString = true;

    $opal.defs(self, '$try_convert', function(what) {
      var self = this;

      try {
      return what.$to_str()
      } catch ($err) {if (true) {
        return nil
        }else { throw $err; }
      };
    });

    $opal.defs(self, '$new', function(str) {
      var self = this;

      if (str == null) {
        str = ""
      }
      return new String(str);
    });

    def['$%'] = function(data) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Array) == null ? $opal.cm('Array') : $b)['$==='](data)) !== nil && (!$a._isBoolean || $a == true))) {
        return ($a = self).$format.apply($a, [self].concat(data))
        } else {
        return self.$format(self, data)
      };
    };

    def['$*'] = function(count) {
      var self = this;

      
      if (count < 1) {
        return '';
      }

      var result  = '',
          pattern = self;

      while (count > 0) {
        if (count & 1) {
          result += pattern;
        }

        count >>= 1;
        pattern += pattern;
      }

      return result;
    
    };

    def['$+'] = function(other) {
      var $a, self = this;

      other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str");
      return self + other.$to_s();
    };

    def['$<=>'] = function(other) {
      var $a, self = this;

      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_str().$to_s();
        return self > other ? 1 : (self < other ? -1 : 0);
        } else {
        
        var cmp = other['$<=>'](self);

        if (cmp === nil) {
          return nil;
        }
        else {
          return cmp > 0 ? -1 : (cmp < 0 ? 1 : 0);
        }
      ;
      };
    };

    def['$=='] = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.String) == null ? $opal.cm('String') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      return self.$to_s() == other.$to_s();
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$===', def['$==']);

    def['$=~'] = function(other) {
      var $a, self = this;

      
      if (other._isString) {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "type mismatch: String given");
      }

      return other['$=~'](self);
    ;
    };

    def['$[]'] = function(index, length) {
      var self = this;

      
      var size = self.length;

      if (index._isRange) {
        var exclude = index.exclude,
            length  = index.end,
            index   = index.begin;

        if (index < 0) {
          index += size;
        }

        if (length < 0) {
          length += size;
        }

        if (!exclude) {
          length += 1;
        }

        if (index > size) {
          return nil;
        }

        length = length - index;

        if (length < 0) {
          length = 0;
        }

        return self.substr(index, length);
      }

      if (index < 0) {
        index += self.length;
      }

      if (length == null) {
        if (index >= self.length || index < 0) {
          return nil;
        }

        return self.substr(index, 1);
      }

      if (index > self.length || index < 0) {
        return nil;
      }

      return self.substr(index, length);
    
    };

    def.$capitalize = function() {
      var self = this;

      return self.charAt(0).toUpperCase() + self.substr(1).toLowerCase();
    };

    def.$casecmp = function(other) {
      var $a, self = this;

      other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s();
      return (self.toLowerCase())['$<=>'](other.toLowerCase());
    };

    def.$center = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(width, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      padstr = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(padstr, (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      
      var ljustified = self.$ljust((width['$+'](self.length))['$/'](2).$ceil(), padstr),
          rjustified = self.$rjust((width['$+'](self.length))['$/'](2).$floor(), padstr);

      return rjustified + ljustified.slice(self.length);
    ;
    };

    def.$chars = TMP_1 = function() {
      var $a, $b, self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$each_char().$to_a()
      };
      return ($a = ($b = self).$each_char, $a._p = block.$to_proc(), $a).call($b);
    };

    def.$chomp = function(separator) {
      var $a, self = this;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      if ((($a = separator === nil || self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      separator = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to!'](separator, (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s();
      
      if (separator === "\n") {
        return self.replace(/\r?\n?$/, '');
      }
      else if (separator === "") {
        return self.replace(/(\r?\n)+$/, '');
      }
      else if (self.length > separator.length) {
        var tail = self.substr(self.length - separator.length, separator.length);

        if (tail === separator) {
          return self.substr(0, self.length - separator.length);
        }
      }
    
      return self;
    };

    def.$chop = function() {
      var self = this;

      
      var length = self.length;

      if (length <= 1) {
        return "";
      }

      if (self.charAt(length - 1) === "\n" && self.charAt(length - 2) === "\r") {
        return self.substr(0, length - 2);
      }
      else {
        return self.substr(0, length - 1);
      }
    
    };

    def.$chr = function() {
      var self = this;

      return self.charAt(0);
    };

    def.$clone = function() {
      var self = this, copy = nil;

      copy = self.slice();
      copy.$initialize_clone(self);
      return copy;
    };

    def.$dup = function() {
      var self = this, copy = nil;

      copy = self.slice();
      copy.$initialize_dup(self);
      return copy;
    };

    def.$count = function(str) {
      var self = this;

      return (self.length - self.replace(new RegExp(str, 'g'), '').length) / str.length;
    };

    $opal.defn(self, '$dup', def.$clone);

    def.$downcase = function() {
      var self = this;

      return self.toLowerCase();
    };

    def.$each_char = TMP_2 = function() {
      var $a, self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_char")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        ((($a = $opal.$yield1(block, self.charAt(i))) === $breaker) ? $breaker.$v : $a);
      }
    
      return self;
    };

    def.$each_line = TMP_3 = function(separator) {
      var $a, self = this, $iter = TMP_3._p, $yield = $iter || nil;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      TMP_3._p = null;
      if (($yield !== nil)) {
        } else {
        return self.$split(separator)
      };
      
      var chomped  = self.$chomp(),
          trailing = self.length != chomped.length,
          splitted = chomped.split(separator);

      for (var i = 0, length = splitted.length; i < length; i++) {
        if (i < length - 1 || trailing) {
          ((($a = $opal.$yield1($yield, splitted[i] + separator)) === $breaker) ? $breaker.$v : $a);
        }
        else {
          ((($a = $opal.$yield1($yield, splitted[i])) === $breaker) ? $breaker.$v : $a);
        }
      }
    ;
      return self;
    };

    def['$empty?'] = function() {
      var self = this;

      return self.length === 0;
    };

    def['$end_with?'] = function(suffixes) {
      var $a, self = this;

      suffixes = $slice.call(arguments, 0);
      
      for (var i = 0, length = suffixes.length; i < length; i++) {
        var suffix = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(suffixes[i], (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s();

        if (self.length >= suffix.length &&
            self.substr(self.length - suffix.length, suffix.length) == suffix) {
          return true;
        }
      }
    
      return false;
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$equal?', def['$===']);

    def.$gsub = TMP_4 = function(pattern, replace) {
      var $a, $b, $c, self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if ((($a = ((($b = (($c = $scope.String) == null ? $opal.cm('String') : $c)['$==='](pattern)) !== false && $b !== nil) ? $b : pattern['$respond_to?']("to_str"))) !== nil && (!$a._isBoolean || $a == true))) {
        pattern = (new RegExp("" + (($a = $scope.Regexp) == null ? $opal.cm('Regexp') : $a).$escape(pattern.$to_str())))};
      if ((($a = (($b = $scope.Regexp) == null ? $opal.cm('Regexp') : $b)['$==='](pattern)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "wrong argument type " + (pattern.$class()) + " (expected Regexp)")
      };
      
      var pattern = pattern.toString(),
          options = pattern.substr(pattern.lastIndexOf('/') + 1) + 'g',
          regexp  = pattern.substr(1, pattern.lastIndexOf('/') - 1);

      self.$sub._p = block;
      return self.$sub(new RegExp(regexp, options), replace);
    
    };

    def.$hash = function() {
      var self = this;

      return self.toString();
    };

    def.$hex = function() {
      var self = this;

      return self.$to_i(16);
    };

    def['$include?'] = function(other) {
      var $a, self = this;

      
      if (other._isString) {
        return self.indexOf(other) !== -1;
      }
    
      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "no implicit conversion of " + (other.$class().$name()) + " into String")
      };
      return self.indexOf(other.$to_str()) !== -1;
    };

    def.$index = function(what, offset) {
      var $a, $b, self = this, result = nil;

      if (offset == null) {
        offset = nil
      }
      if ((($a = (($b = $scope.String) == null ? $opal.cm('String') : $b)['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
        what = what.$to_s()
      } else if ((($a = what['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        what = what.$to_str().$to_s()
      } else if ((($a = (($b = $scope.Regexp) == null ? $opal.cm('Regexp') : $b)['$==='](what)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "type mismatch: " + (what.$class()) + " given")};
      result = -1;
      if (offset !== false && offset !== nil) {
        offset = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(offset, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        
        var size = self.length;

        if (offset < 0) {
          offset = offset + size;
        }

        if (offset > size) {
          return nil;
        }
      
        if ((($a = (($b = $scope.Regexp) == null ? $opal.cm('Regexp') : $b)['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
          result = ((($a = (what['$=~'](self.substr(offset)))) !== false && $a !== nil) ? $a : -1)
          } else {
          result = self.substr(offset).indexOf(what)
        };
        
        if (result !== -1) {
          result += offset;
        }
      
      } else if ((($a = (($b = $scope.Regexp) == null ? $opal.cm('Regexp') : $b)['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
        result = ((($a = (what['$=~'](self))) !== false && $a !== nil) ? $a : -1)
        } else {
        result = self.indexOf(what)
      };
      if ((($a = result === -1) !== nil && (!$a._isBoolean || $a == true))) {
        return nil
        } else {
        return result
      };
    };

    def.$inspect = function() {
      var self = this;

      
      var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          meta      = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
          };

      escapable.lastIndex = 0;

      return escapable.test(self) ? '"' + self.replace(escapable, function(a) {
        var c = meta[a];

        return typeof c === 'string' ? c :
          '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + self + '"';
    
    };

    def.$intern = function() {
      var self = this;

      return self;
    };

    def.$lines = function(separator) {
      var self = this;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      return self.$each_line(separator).$to_a();
    };

    def.$length = function() {
      var self = this;

      return self.length;
    };

    def.$ljust = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(width, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      padstr = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(padstr, (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      
      var index  = -1,
          result = "";

      width -= self.length;

      while (++index < width) {
        result += padstr;
      }

      return self + result.slice(0, width);
    
    };

    def.$lstrip = function() {
      var self = this;

      return self.replace(/^\s*/, '');
    };

    def.$match = TMP_5 = function(pattern, pos) {
      var $a, $b, $c, self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if ((($a = ((($b = (($c = $scope.String) == null ? $opal.cm('String') : $c)['$==='](pattern)) !== false && $b !== nil) ? $b : pattern['$respond_to?']("to_str"))) !== nil && (!$a._isBoolean || $a == true))) {
        pattern = (new RegExp("" + (($a = $scope.Regexp) == null ? $opal.cm('Regexp') : $a).$escape(pattern.$to_str())))};
      if ((($a = (($b = $scope.Regexp) == null ? $opal.cm('Regexp') : $b)['$==='](pattern)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "wrong argument type " + (pattern.$class()) + " (expected Regexp)")
      };
      return ($a = ($b = pattern).$match, $a._p = block.$to_proc(), $a).call($b, self, pos);
    };

    def.$next = function() {
      var self = this;

      
      if (self.length === 0) {
        return "";
      }

      var initial = self.substr(0, self.length - 1);
      var last    = String.fromCharCode(self.charCodeAt(self.length - 1) + 1);

      return initial + last;
    
    };

    def.$ord = function() {
      var self = this;

      return self.charCodeAt(0);
    };

    def.$partition = function(str) {
      var self = this;

      
      var result = self.split(str);
      var splitter = (result[0].length === self.length ? "" : str);

      return [result[0], splitter, result.slice(1).join(str.toString())];
    
    };

    def.$reverse = function() {
      var self = this;

      return self.split('').reverse().join('');
    };

    def.$rindex = function(search, offset) {
      var $a, self = this;

      
      var search_type = (search == null ? Opal.NilClass : search.constructor);
      if (search_type != String && search_type != RegExp) {
        var msg = "type mismatch: " + search_type + " given";
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a).$new(msg));
      }

      if (self.length == 0) {
        return search.length == 0 ? 0 : nil;
      }

      var result = -1;
      if (offset != null) {
        if (offset < 0) {
          offset = self.length + offset;
        }

        if (search_type == String) {
          result = self.lastIndexOf(search, offset);
        }
        else {
          result = self.substr(0, offset + 1).$reverse().search(search);
          if (result !== -1) {
            result = offset - result;
          }
        }
      }
      else {
        if (search_type == String) {
          result = self.lastIndexOf(search);
        }
        else {
          result = self.$reverse().search(search);
          if (result !== -1) {
            result = self.length - 1 - result;
          }
        }
      }

      return result === -1 ? nil : result;
    
    };

    def.$rjust = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(width, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      padstr = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(padstr, (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      
      var chars     = Math.floor(width - self.length),
          patterns  = Math.floor(chars / padstr.length),
          result    = Array(patterns + 1).join(padstr),
          remaining = chars - result.length;

      return result + padstr.slice(0, remaining) + self;
    
    };

    def.$rstrip = function() {
      var self = this;

      return self.replace(/\s*$/, '');
    };

    def.$scan = TMP_6 = function(pattern) {
      var $a, self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      
      if (pattern.global) {
        // should we clear it afterwards too?
        pattern.lastIndex = 0;
      }
      else {
        // rewrite regular expression to add the global flag to capture pre/post match
        pattern = new RegExp(pattern.source, 'g' + (pattern.multiline ? 'm' : '') + (pattern.ignoreCase ? 'i' : ''));
      }

      var result = [];
      var match;

      while ((match = pattern.exec(self)) != null) {
        var match_data = (($a = $scope.MatchData) == null ? $opal.cm('MatchData') : $a).$new(pattern, match);
        if (block === nil) {
          match.length == 1 ? result.push(match[0]) : result.push(match.slice(1));
        }
        else {
          match.length == 1 ? block(match[0]) : block.apply(self, match.slice(1));
        }
      }

      return (block !== nil ? self : result);
    
    };

    $opal.defn(self, '$size', def.$length);

    $opal.defn(self, '$slice', def['$[]']);

    def.$split = function(pattern, limit) {
      var $a, self = this;
      if ($gvars[";"] == null) $gvars[";"] = nil;

      if (pattern == null) {
        pattern = ((($a = $gvars[";"]) !== false && $a !== nil) ? $a : " ")
      }
      
      if (pattern === nil || pattern === undefined) {
        pattern = $gvars[";"];
      }

      var result = [];
      if (limit !== undefined) {
        limit = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to!'](limit, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      }

      if (self.length === 0) {
        return [];
      }

      if (limit === 1) {
        return [self];
      }

      if (pattern && pattern._isRegexp) {
        var pattern_str = pattern.toString();

        /* Opal and JS's repr of an empty RE. */
        var blank_pattern = (pattern_str.substr(0, 3) == '/^/') ||
                  (pattern_str.substr(0, 6) == '/(?:)/');

        /* This is our fast path */
        if (limit === undefined || limit === 0) {
          result = self.split(blank_pattern ? /(?:)/ : pattern);
        }
        else {
          /* RegExp.exec only has sane behavior with global flag */
          if (! pattern.global) {
            pattern = eval(pattern_str + 'g');
          }

          var match_data;
          var prev_index = 0;
          pattern.lastIndex = 0;

          while ((match_data = pattern.exec(self)) !== null) {
            var segment = self.slice(prev_index, match_data.index);
            result.push(segment);

            prev_index = pattern.lastIndex;

            if (match_data[0].length === 0) {
              if (blank_pattern) {
                /* explicitly split on JS's empty RE form.*/
                pattern = /(?:)/;
              }

              result = self.split(pattern);
              /* with "unlimited", ruby leaves a trail on blanks. */
              if (limit !== undefined && limit < 0 && blank_pattern) {
                result.push('');
              }

              prev_index = undefined;
              break;
            }

            if (limit !== undefined && limit > 1 && result.length + 1 == limit) {
              break;
            }
          }

          if (prev_index !== undefined) {
            result.push(self.slice(prev_index, self.length));
          }
        }
      }
      else {
        var splitted = 0, start = 0, lim = 0;

        if (pattern === nil || pattern === undefined) {
          pattern = ' '
        } else {
          pattern = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$try_convert(pattern, (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s();
        }

        var string = (pattern == ' ') ? self.replace(/[\r\n\t\v]\s+/g, ' ')
                                      : self;
        var cursor = -1;
        while ((cursor = string.indexOf(pattern, start)) > -1 && cursor < string.length) {
          if (splitted + 1 === limit) {
            break;
          }

          if (pattern == ' ' && cursor == start) {
            start = cursor + 1;
            continue;
          }

          result.push(string.substr(start, pattern.length ? cursor - start : 1));
          splitted++;

          start = cursor + (pattern.length ? pattern.length : 1);
        }

        if (string.length > 0 && (limit < 0 || string.length > start)) {
          if (string.length == start) {
            result.push('');
          }
          else {
            result.push(string.substr(start, string.length));
          }
        }
      }

      if (limit === undefined || limit === 0) {
        while (result[result.length-1] === '') {
          result.length = result.length - 1;
        }
      }

      if (limit > 0) {
        var tail = result.slice(limit - 1).join('');
        result.splice(limit - 1, result.length - 1, tail);
      }

      return result;
    ;
    };

    def.$squeeze = function(sets) {
      var $a, self = this;

      sets = $slice.call(arguments, 0);
      
      if (sets.length === 0) {
        return self.replace(/(.)\1+/g, '$1');
      }
    
      
      var set = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(sets[0], (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$chars();

      for (var i = 1, length = sets.length; i < length; i++) {
        set = (set)['$&']((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(sets[i], (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$chars());
      }

      if (set.length === 0) {
        return self;
      }

      return self.replace(new RegExp("([" + (($a = $scope.Regexp) == null ? $opal.cm('Regexp') : $a).$escape((set).$join()) + "])\\1+", "g"), "$1");
    ;
    };

    def['$start_with?'] = function(prefixes) {
      var $a, self = this;

      prefixes = $slice.call(arguments, 0);
      
      for (var i = 0, length = prefixes.length; i < length; i++) {
        var prefix = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(prefixes[i], (($a = $scope.String) == null ? $opal.cm('String') : $a), "to_str").$to_s();

        if (self.indexOf(prefix) === 0) {
          return true;
        }
      }

      return false;
    
    };

    def.$strip = function() {
      var self = this;

      return self.replace(/^\s*/, '').replace(/\s*$/, '');
    };

    def.$sub = TMP_7 = function(pattern, replace) {
      var $a, self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      
      if (typeof(replace) === 'string') {
        // convert Ruby back reference to JavaScript back reference
        replace = replace.replace(/\\([1-9])/g, '$$$1')
        return self.replace(pattern, replace);
      }
      if (block !== nil) {
        return self.replace(pattern, function() {
          // FIXME: this should be a formal MatchData object with all the goodies
          var match_data = []
          for (var i = 0, len = arguments.length; i < len; i++) {
            var arg = arguments[i];
            if (arg == undefined) {
              match_data.push(nil);
            }
            else {
              match_data.push(arg);
            }
          }

          var str = match_data.pop();
          var offset = match_data.pop();
          var match_len = match_data.length;

          // $1, $2, $3 not being parsed correctly in Ruby code
          //for (var i = 1; i < match_len; i++) {
          //  __gvars[String(i)] = match_data[i];
          //}
          $gvars["&"] = match_data[0];
          $gvars["~"] = match_data;
          return block(match_data[0]);
        });
      }
      else if (replace !== undefined) {
        if (replace['$is_a?']((($a = $scope.Hash) == null ? $opal.cm('Hash') : $a))) {
          return self.replace(pattern, function(str) {
            var value = replace['$[]'](self.$str());

            return (value == null) ? nil : self.$value().$to_s();
          });
        }
        else {
          replace = (($a = $scope.String) == null ? $opal.cm('String') : $a).$try_convert(replace);

          if (replace == null) {
            self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "can't convert " + (replace.$class()) + " into String");
          }

          return self.replace(pattern, replace);
        }
      }
      else {
        // convert Ruby back reference to JavaScript back reference
        replace = replace.toString().replace(/\\([1-9])/g, '$$$1')
        return self.replace(pattern, replace);
      }
    ;
    };

    $opal.defn(self, '$succ', def.$next);

    def.$sum = function(n) {
      var self = this;

      if (n == null) {
        n = 16
      }
      
      var result = 0;

      for (var i = 0, length = self.length; i < length; i++) {
        result += (self.charCodeAt(i) % ((1 << n) - 1));
      }

      return result;
    
    };

    def.$swapcase = function() {
      var self = this;

      
      var str = self.replace(/([a-z]+)|([A-Z]+)/g, function($0,$1,$2) {
        return $1 ? $0.toUpperCase() : $0.toLowerCase();
      });

      if (self.constructor === String) {
        return str;
      }

      return self.$class().$new(str);
    
    };

    def.$to_f = function() {
      var self = this;

      
      if (self.charAt(0) === '_') {
        return 0;
      }

      var result = parseFloat(self.replace(/_/g, ''));

      if (isNaN(result) || result == Infinity || result == -Infinity) {
        return 0;
      }
      else {
        return result;
      }
    
    };

    def.$to_i = function(base) {
      var self = this;

      if (base == null) {
        base = 10
      }
      
      var result = parseInt(self, base);

      if (isNaN(result)) {
        return 0;
      }

      return result;
    
    };

    def.$to_proc = function() {
      var $a, $b, TMP_8, self = this;

      return ($a = ($b = self).$proc, $a._p = (TMP_8 = function(recv, args){var self = TMP_8._s || this, $a;
if (recv == null) recv = nil;args = $slice.call(arguments, 1);
      return ($a = recv).$send.apply($a, [self].concat(args))}, TMP_8._s = self, TMP_8), $a).call($b);
    };

    def.$to_s = function() {
      var self = this;

      return self.toString();
    };

    $opal.defn(self, '$to_str', def.$to_s);

    $opal.defn(self, '$to_sym', def.$intern);

    def.$tr = function(from, to) {
      var self = this;

      
      if (from.length == 0 || from === to) {
        return self;
      }

      var subs = {};
      var from_chars = from.split('');
      var from_length = from_chars.length;
      var to_chars = to.split('');
      var to_length = to_chars.length;

      var inverse = false;
      var global_sub = null;
      if (from_chars[0] === '^') {
        inverse = true;
        from_chars.shift();
        global_sub = to_chars[to_length - 1]
        from_length -= 1;
      }

      var from_chars_expanded = [];
      var last_from = null;
      var in_range = false;
      for (var i = 0; i < from_length; i++) {
        var ch = from_chars[i];
        if (last_from == null) {
          last_from = ch;
          from_chars_expanded.push(ch);
        }
        else if (ch === '-') {
          if (last_from === '-') {
            from_chars_expanded.push('-');
            from_chars_expanded.push('-');
          }
          else if (i == from_length - 1) {
            from_chars_expanded.push('-');
          }
          else {
            in_range = true;
          }
        }
        else if (in_range) {
          var start = last_from.charCodeAt(0) + 1;
          var end = ch.charCodeAt(0);
          for (var c = start; c < end; c++) {
            from_chars_expanded.push(String.fromCharCode(c));
          }
          from_chars_expanded.push(ch);
          in_range = null;
          last_from = null;
        }
        else {
          from_chars_expanded.push(ch);
        }
      }

      from_chars = from_chars_expanded;
      from_length = from_chars.length;

      if (inverse) {
        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = true;
        }
      }
      else {
        if (to_length > 0) {
          var to_chars_expanded = [];
          var last_to = null;
          var in_range = false;
          for (var i = 0; i < to_length; i++) {
            var ch = to_chars[i];
            if (last_from == null) {
              last_from = ch;
              to_chars_expanded.push(ch);
            }
            else if (ch === '-') {
              if (last_to === '-') {
                to_chars_expanded.push('-');
                to_chars_expanded.push('-');
              }
              else if (i == to_length - 1) {
                to_chars_expanded.push('-');
              }
              else {
                in_range = true;
              }
            }
            else if (in_range) {
              var start = last_from.charCodeAt(0) + 1;
              var end = ch.charCodeAt(0);
              for (var c = start; c < end; c++) {
                to_chars_expanded.push(String.fromCharCode(c));
              }
              to_chars_expanded.push(ch);
              in_range = null;
              last_from = null;
            }
            else {
              to_chars_expanded.push(ch);
            }
          }

          to_chars = to_chars_expanded;
          to_length = to_chars.length;
        }

        var length_diff = from_length - to_length;
        if (length_diff > 0) {
          var pad_char = (to_length > 0 ? to_chars[to_length - 1] : '');
          for (var i = 0; i < length_diff; i++) {
            to_chars.push(pad_char);
          }
        }

        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = to_chars[i];
        }
      }

      var new_str = ''
      for (var i = 0, length = self.length; i < length; i++) {
        var ch = self.charAt(i);
        var sub = subs[ch];
        if (inverse) {
          new_str += (sub == null ? global_sub : ch);
        }
        else {
          new_str += (sub != null ? sub : ch);
        }
      }
      return new_str;
    
    };

    def.$tr_s = function(from, to) {
      var self = this;

      
      if (from.length == 0) {
        return self;
      }

      var subs = {};
      var from_chars = from.split('');
      var from_length = from_chars.length;
      var to_chars = to.split('');
      var to_length = to_chars.length;

      var inverse = false;
      var global_sub = null;
      if (from_chars[0] === '^') {
        inverse = true;
        from_chars.shift();
        global_sub = to_chars[to_length - 1]
        from_length -= 1;
      }

      var from_chars_expanded = [];
      var last_from = null;
      var in_range = false;
      for (var i = 0; i < from_length; i++) {
        var ch = from_chars[i];
        if (last_from == null) {
          last_from = ch;
          from_chars_expanded.push(ch);
        }
        else if (ch === '-') {
          if (last_from === '-') {
            from_chars_expanded.push('-');
            from_chars_expanded.push('-');
          }
          else if (i == from_length - 1) {
            from_chars_expanded.push('-');
          }
          else {
            in_range = true;
          }
        }
        else if (in_range) {
          var start = last_from.charCodeAt(0) + 1;
          var end = ch.charCodeAt(0);
          for (var c = start; c < end; c++) {
            from_chars_expanded.push(String.fromCharCode(c));
          }
          from_chars_expanded.push(ch);
          in_range = null;
          last_from = null;
        }
        else {
          from_chars_expanded.push(ch);
        }
      }

      from_chars = from_chars_expanded;
      from_length = from_chars.length;

      if (inverse) {
        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = true;
        }
      }
      else {
        if (to_length > 0) {
          var to_chars_expanded = [];
          var last_to = null;
          var in_range = false;
          for (var i = 0; i < to_length; i++) {
            var ch = to_chars[i];
            if (last_from == null) {
              last_from = ch;
              to_chars_expanded.push(ch);
            }
            else if (ch === '-') {
              if (last_to === '-') {
                to_chars_expanded.push('-');
                to_chars_expanded.push('-');
              }
              else if (i == to_length - 1) {
                to_chars_expanded.push('-');
              }
              else {
                in_range = true;
              }
            }
            else if (in_range) {
              var start = last_from.charCodeAt(0) + 1;
              var end = ch.charCodeAt(0);
              for (var c = start; c < end; c++) {
                to_chars_expanded.push(String.fromCharCode(c));
              }
              to_chars_expanded.push(ch);
              in_range = null;
              last_from = null;
            }
            else {
              to_chars_expanded.push(ch);
            }
          }

          to_chars = to_chars_expanded;
          to_length = to_chars.length;
        }

        var length_diff = from_length - to_length;
        if (length_diff > 0) {
          var pad_char = (to_length > 0 ? to_chars[to_length - 1] : '');
          for (var i = 0; i < length_diff; i++) {
            to_chars.push(pad_char);
          }
        }

        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = to_chars[i];
        }
      }
      var new_str = ''
      var last_substitute = null
      for (var i = 0, length = self.length; i < length; i++) {
        var ch = self.charAt(i);
        var sub = subs[ch]
        if (inverse) {
          if (sub == null) {
            if (last_substitute == null) {
              new_str += global_sub;
              last_substitute = true;
            }
          }
          else {
            new_str += ch;
            last_substitute = null;
          }
        }
        else {
          if (sub != null) {
            if (last_substitute == null || last_substitute !== sub) {
              new_str += sub;
              last_substitute = sub;
            }
          }
          else {
            new_str += ch;
            last_substitute = null;
          }
        }
      }
      return new_str;
    
    };

    def.$upcase = function() {
      var self = this;

      return self.toUpperCase();
    };

    def.$freeze = function() {
      var self = this;

      return self;
    };

    return (def['$frozen?'] = function() {
      var self = this;

      return true;
    }, nil) && 'frozen?';
  })(self, null);
  return $opal.cdecl($scope, 'Symbol', (($a = $scope.String) == null ? $opal.cm('String') : $a));
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/string.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$new', '$allocate', '$initialize', '$to_proc', '$__send__', '$class', '$clone', '$respond_to?', '$==', '$inspect']);
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self._proto, $scope = self._scope;

    return ($opal.defs(self, '$inherited', function(klass) {
      var $a, $b, self = this, replace = nil;

      replace = (($a = $scope.Class) == null ? $opal.cm('Class') : $a).$new((($a = ((($b = $scope.String) == null ? $opal.cm('String') : $b))._scope).Wrapper == null ? $a.cm('Wrapper') : $a.Wrapper));
      
      klass._proto        = replace._proto;
      klass._proto._klass = klass;
      klass._alloc        = replace._alloc;
      klass.__parent      = (($a = ((($b = $scope.String) == null ? $opal.cm('String') : $b))._scope).Wrapper == null ? $a.cm('Wrapper') : $a.Wrapper);

      klass.$allocate = replace.$allocate;
      klass.$new      = replace.$new;
    
    }), nil) && 'inherited'
  })(self, null);
  return (function($base, $super) {
    function $Wrapper(){};
    var self = $Wrapper = $klass($base, $super, 'Wrapper', $Wrapper);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4;

    def.literal = nil;
    $opal.defs(self, '$allocate', TMP_1 = function(string) {
      var self = this, $iter = TMP_1._p, $yield = $iter || nil, obj = nil;

      if (string == null) {
        string = ""
      }
      TMP_1._p = null;
      obj = $opal.find_super_dispatcher(self, 'allocate', TMP_1, null, $Wrapper).apply(self, []);
      obj.literal = string;
      return obj;
    });

    $opal.defs(self, '$new', TMP_2 = function(args) {
      var $a, $b, self = this, $iter = TMP_2._p, block = $iter || nil, obj = nil;

      args = $slice.call(arguments, 0);
      TMP_2._p = null;
      obj = self.$allocate();
      ($a = ($b = obj).$initialize, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
      return obj;
    });

    $opal.defs(self, '$[]', function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      return self.$allocate(objects);
    });

    def.$initialize = function(string) {
      var self = this;

      if (string == null) {
        string = ""
      }
      return self.literal = string;
    };

    def.$method_missing = TMP_3 = function(args) {
      var $a, $b, self = this, $iter = TMP_3._p, block = $iter || nil, result = nil;

      args = $slice.call(arguments, 0);
      TMP_3._p = null;
      result = ($a = ($b = self.literal).$__send__, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
      if ((($a = result._isString != null) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = result == self.literal) !== nil && (!$a._isBoolean || $a == true))) {
          return self
          } else {
          return self.$class().$allocate(result)
        }
        } else {
        return result
      };
    };

    def.$initialize_copy = function(other) {
      var self = this;

      return self.literal = (other.literal).$clone();
    };

    def['$respond_to?'] = TMP_4 = function(name) {var $zuper = $slice.call(arguments, 0);
      var $a, self = this, $iter = TMP_4._p, $yield = $iter || nil;

      TMP_4._p = null;
      return ((($a = $opal.find_super_dispatcher(self, 'respond_to?', TMP_4, $iter).apply(self, $zuper)) !== false && $a !== nil) ? $a : self.literal['$respond_to?'](name));
    };

    def['$=='] = function(other) {
      var self = this;

      return self.literal['$=='](other);
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$===', def['$==']);

    def.$to_s = function() {
      var self = this;

      return self.literal;
    };

    def.$to_str = function() {
      var self = this;

      return self;
    };

    return (def.$inspect = function() {
      var self = this;

      return self.literal.$inspect();
    }, nil) && 'inspect';
  })((($a = $scope.String) == null ? $opal.cm('String') : $a), null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/string/inheritance.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars;

  $opal.add_stubs(['$attr_reader', '$pre_match', '$post_match', '$[]', '$===', '$!', '$==', '$raise', '$inspect']);
  return (function($base, $super) {
    function $MatchData(){};
    var self = $MatchData = $klass($base, $super, 'MatchData', $MatchData);

    var def = self._proto, $scope = self._scope, TMP_1;

    def.string = def.matches = def.begin = nil;
    self.$attr_reader("post_match", "pre_match", "regexp", "string");

    $opal.defs(self, '$new', TMP_1 = function(regexp, match_groups) {
      var self = this, $iter = TMP_1._p, $yield = $iter || nil, data = nil;

      TMP_1._p = null;
      data = $opal.find_super_dispatcher(self, 'new', TMP_1, null, $MatchData).apply(self, [regexp, match_groups]);
      $gvars["`"] = data.$pre_match();
      $gvars["'"] = data.$post_match();
      $gvars["~"] = data;
      return data;
    });

    def.$initialize = function(regexp, match_groups) {
      var self = this;

      self.regexp = regexp;
      self.begin = match_groups.index;
      self.string = match_groups.input;
      self.pre_match = self.string.substr(0, regexp.lastIndex - match_groups[0].length);
      self.post_match = self.string.substr(regexp.lastIndex);
      self.matches = [];
      
      for (var i = 0, length = match_groups.length; i < length; i++) {
        var group = match_groups[i];

        if (group == null) {
          self.matches.push(nil);
        }
        else {
          self.matches.push(group);
        }
      }
    
    };

    def['$[]'] = function(args) {
      var $a, self = this;

      args = $slice.call(arguments, 0);
      return ($a = self.matches)['$[]'].apply($a, [].concat(args));
    };

    def['$=='] = function(other) {
      var $a, $b, $c, $d, self = this;

      if ((($a = (($b = $scope.MatchData) == null ? $opal.cm('MatchData') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      return ($a = ($b = ($c = ($d = self.string == other.string, $d !== false && $d !== nil ?self.regexp == other.regexp : $d), $c !== false && $c !== nil ?self.pre_match == other.pre_match : $c), $b !== false && $b !== nil ?self.post_match == other.post_match : $b), $a !== false && $a !== nil ?self.begin == other.begin : $a);
    };

    def.$begin = function(pos) {
      var $a, $b, self = this;

      if ((($a = ($b = pos['$=='](0)['$!'](), $b !== false && $b !== nil ?pos['$=='](1)['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "MatchData#begin only supports 0th element")};
      return self.begin;
    };

    def.$captures = function() {
      var self = this;

      return self.matches.slice(1);
    };

    def.$inspect = function() {
      var self = this;

      
      var str = "#<MatchData " + (self.matches[0]).$inspect();

      for (var i = 1, length = self.matches.length; i < length; i++) {
        str += " " + i + ":" + (self.matches[i]).$inspect();
      }

      return str + ">";
    ;
    };

    def.$length = function() {
      var self = this;

      return self.matches.length;
    };

    $opal.defn(self, '$size', def.$length);

    def.$to_a = function() {
      var self = this;

      return self.matches;
    };

    def.$to_s = function() {
      var self = this;

      return self.matches[0];
    };

    return (def.$values_at = function(indexes) {
      var self = this;

      indexes = $slice.call(arguments, 0);
      
      var values       = [],
          match_length = self.matches.length;

      for (var i = 0, length = indexes.length; i < length; i++) {
        var pos = indexes[i];

        if (pos >= 0) {
          values.push(self.matches[pos]);
        }
        else {
          pos += match_length;

          if (pos > 0) {
            values.push(self.matches[pos]);
          }
          else {
            values.push(nil);
          }
        }
      }

      return values;
    ;
    }, nil) && 'values_at';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/match_data.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$coerce', '$===', '$raise', '$class', '$__send__', '$send_coerced', '$to_int', '$coerce_to!', '$-@', '$**', '$-', '$respond_to?', '$==', '$enum_for', '$gcd', '$lcm', '$<', '$>', '$floor', '$/', '$%']);
  ;
  (function($base, $super) {
    function $Numeric(){};
    var self = $Numeric = $klass($base, $super, 'Numeric', $Numeric);

    var def = self._proto, $scope = self._scope, $a, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6;

    self.$include((($a = $scope.Comparable) == null ? $opal.cm('Comparable') : $a));

    def._isNumber = true;

    def.$coerce = function(other, type) {
      var $a, self = this, $case = nil;

      if (type == null) {
        type = "operation"
      }
      try {
      
      if (other._isNumber) {
        return [self, other];
      }
      else {
        return other.$coerce(self);
      }
    
      } catch ($err) {if (true) {
        return (function() {$case = type;if ("operation"['$===']($case)) {return self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "" + (other.$class()) + " can't be coerce into Numeric")}else if ("comparison"['$===']($case)) {return self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")}else { return nil }})()
        }else { throw $err; }
      };
    };

    def.$send_coerced = function(method, other) {
      var $a, self = this, type = nil, $case = nil, a = nil, b = nil;

      type = (function() {$case = method;if ("+"['$===']($case) || "-"['$===']($case) || "*"['$===']($case) || "/"['$===']($case) || "%"['$===']($case) || "&"['$===']($case) || "|"['$===']($case) || "^"['$===']($case) || "**"['$===']($case)) {return "operation"}else if (">"['$===']($case) || ">="['$===']($case) || "<"['$===']($case) || "<="['$===']($case) || "<=>"['$===']($case)) {return "comparison"}else { return nil }})();
      $a = $opal.to_ary(self.$coerce(other, type)), a = ($a[0] == null ? nil : $a[0]), b = ($a[1] == null ? nil : $a[1]);
      return a.$__send__(method, b);
    };

    def['$+'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self + other;
      }
      else {
        return self.$send_coerced("+", other);
      }
    
    };

    def['$-'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self - other;
      }
      else {
        return self.$send_coerced("-", other);
      }
    
    };

    def['$*'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self * other;
      }
      else {
        return self.$send_coerced("*", other);
      }
    
    };

    def['$/'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self / other;
      }
      else {
        return self.$send_coerced("/", other);
      }
    
    };

    def['$%'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        if (other < 0 || self < 0) {
          return (self % other + other) % other;
        }
        else {
          return self % other;
        }
      }
      else {
        return self.$send_coerced("%", other);
      }
    
    };

    def['$&'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self & other;
      }
      else {
        return self.$send_coerced("&", other);
      }
    
    };

    def['$|'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self | other;
      }
      else {
        return self.$send_coerced("|", other);
      }
    
    };

    def['$^'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self ^ other;
      }
      else {
        return self.$send_coerced("^", other);
      }
    
    };

    def['$<'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self < other;
      }
      else {
        return self.$send_coerced("<", other);
      }
    
    };

    def['$<='] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self <= other;
      }
      else {
        return self.$send_coerced("<=", other);
      }
    
    };

    def['$>'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self > other;
      }
      else {
        return self.$send_coerced(">", other);
      }
    
    };

    def['$>='] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self >= other;
      }
      else {
        return self.$send_coerced(">=", other);
      }
    
    };

    def['$<=>'] = function(other) {
      var $a, self = this;

      try {
      
      if (other._isNumber) {
        return self > other ? 1 : (self < other ? -1 : 0);
      }
      else {
        return self.$send_coerced("<=>", other);
      }
    
      } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a)])) {
        return nil
        }else { throw $err; }
      };
    };

    def['$<<'] = function(count) {
      var self = this;

      return self << count.$to_int();
    };

    def['$>>'] = function(count) {
      var self = this;

      return self >> count.$to_int();
    };

    def['$[]'] = function(bit) {
      var $a, self = this, min = nil, max = nil;

      bit = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a)['$coerce_to!'](bit, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      min = ((2)['$**'](30))['$-@']();
      max = ((2)['$**'](30))['$-'](1);
      return (bit < min || bit > max) ? 0 : (self >> bit) % 2;
    };

    def['$+@'] = function() {
      var self = this;

      return +self;
    };

    def['$-@'] = function() {
      var self = this;

      return -self;
    };

    def['$~'] = function() {
      var self = this;

      return ~self;
    };

    def['$**'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return Math.pow(self, other);
      }
      else {
        return self.$send_coerced("**", other);
      }
    
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self == Number(other);
      }
      else if (other['$respond_to?']("==")) {
        return other['$=='](self);
      }
      else {
        return false;
      }
    ;
    };

    def.$abs = function() {
      var self = this;

      return Math.abs(self);
    };

    def.$ceil = function() {
      var self = this;

      return Math.ceil(self);
    };

    def.$chr = function() {
      var self = this;

      return String.fromCharCode(self);
    };

    def.$conj = function() {
      var self = this;

      return self;
    };

    $opal.defn(self, '$conjugate', def.$conj);

    def.$downto = TMP_1 = function(finish) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("downto", finish)
      };
      
      for (var i = self; i >= finish; i--) {
        if (block(i) === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$equal?', def['$==']);

    def['$even?'] = function() {
      var self = this;

      return self % 2 === 0;
    };

    def.$floor = function() {
      var self = this;

      return Math.floor(self);
    };

    def.$gcd = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Integer) == null ? $opal.cm('Integer') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "not an integer")
      };
      
      var min = Math.abs(self),
          max = Math.abs(other);

      while (min > 0) {
        var tmp = min;

        min = max % min;
        max = tmp;
      }

      return max;
    
    };

    def.$gcdlcm = function(other) {
      var self = this;

      return [self.$gcd(), self.$lcm()];
    };

    def.$hash = function() {
      var self = this;

      return self.toString();
    };

    def['$integer?'] = function() {
      var self = this;

      return self % 1 === 0;
    };

    def['$is_a?'] = TMP_2 = function(klass) {var $zuper = $slice.call(arguments, 0);
      var $a, $b, $c, self = this, $iter = TMP_2._p, $yield = $iter || nil;

      TMP_2._p = null;
      if ((($a = (($b = klass['$==']((($c = $scope.Fixnum) == null ? $opal.cm('Fixnum') : $c))) ? (($c = $scope.Integer) == null ? $opal.cm('Integer') : $c)['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']((($c = $scope.Integer) == null ? $opal.cm('Integer') : $c))) ? (($c = $scope.Integer) == null ? $opal.cm('Integer') : $c)['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']((($c = $scope.Float) == null ? $opal.cm('Float') : $c))) ? (($c = $scope.Float) == null ? $opal.cm('Float') : $c)['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      return $opal.find_super_dispatcher(self, 'is_a?', TMP_2, $iter).apply(self, $zuper);
    };

    $opal.defn(self, '$kind_of?', def['$is_a?']);

    def['$instance_of?'] = TMP_3 = function(klass) {var $zuper = $slice.call(arguments, 0);
      var $a, $b, $c, self = this, $iter = TMP_3._p, $yield = $iter || nil;

      TMP_3._p = null;
      if ((($a = (($b = klass['$==']((($c = $scope.Fixnum) == null ? $opal.cm('Fixnum') : $c))) ? (($c = $scope.Integer) == null ? $opal.cm('Integer') : $c)['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']((($c = $scope.Integer) == null ? $opal.cm('Integer') : $c))) ? (($c = $scope.Integer) == null ? $opal.cm('Integer') : $c)['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']((($c = $scope.Float) == null ? $opal.cm('Float') : $c))) ? (($c = $scope.Float) == null ? $opal.cm('Float') : $c)['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      return $opal.find_super_dispatcher(self, 'instance_of?', TMP_3, $iter).apply(self, $zuper);
    };

    def.$lcm = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Integer) == null ? $opal.cm('Integer') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "not an integer")
      };
      
      if (self == 0 || other == 0) {
        return 0;
      }
      else {
        return Math.abs(self * other / self.$gcd(other));
      }
    
    };

    $opal.defn(self, '$magnitude', def.$abs);

    $opal.defn(self, '$modulo', def['$%']);

    def.$next = function() {
      var self = this;

      return self + 1;
    };

    def['$nonzero?'] = function() {
      var self = this;

      return self == 0 ? nil : self;
    };

    def['$odd?'] = function() {
      var self = this;

      return self % 2 !== 0;
    };

    def.$ord = function() {
      var self = this;

      return self;
    };

    def.$pred = function() {
      var self = this;

      return self - 1;
    };

    def.$round = function() {
      var self = this;

      return Math.round(self);
    };

    def.$step = TMP_4 = function(limit, step) {
      var $a, self = this, $iter = TMP_4._p, block = $iter || nil;

      if (step == null) {
        step = 1
      }
      TMP_4._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("step", limit, step)
      };
      if ((($a = step == 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "step cannot be 0")};
      
      var value = self;

      if (step > 0) {
        while (value <= limit) {
          block(value);
          value += step;
        }
      }
      else {
        while (value >= limit) {
          block(value);
          value += step;
        }
      }
    
      return self;
    };

    $opal.defn(self, '$succ', def.$next);

    def.$times = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("times")
      };
      
      for (var i = 0; i < self; i++) {
        if (block(i) === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def.$to_f = function() {
      var self = this;

      return self;
    };

    def.$to_i = function() {
      var self = this;

      return parseInt(self);
    };

    $opal.defn(self, '$to_int', def.$to_i);

    def.$to_s = function(base) {
      var $a, $b, self = this;

      if (base == null) {
        base = 10
      }
      if ((($a = ((($b = base['$<'](2)) !== false && $b !== nil) ? $b : base['$>'](36))) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "base must be between 2 and 36")};
      return self.toString(base);
    };

    $opal.defn(self, '$inspect', def.$to_s);

    def.$divmod = function(rhs) {
      var self = this, q = nil, r = nil;

      q = (self['$/'](rhs)).$floor();
      r = self['$%'](rhs);
      return [q, r];
    };

    def.$upto = TMP_6 = function(finish) {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("upto", finish)
      };
      
      for (var i = self; i <= finish; i++) {
        if (block(i) === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def['$zero?'] = function() {
      var self = this;

      return self == 0;
    };

    def.$size = function() {
      var self = this;

      return 4;
    };

    def['$nan?'] = function() {
      var self = this;

      return isNaN(self);
    };

    def['$finite?'] = function() {
      var self = this;

      return self != Infinity && self != -Infinity;
    };

    def['$infinite?'] = function() {
      var self = this;

      
      if (self == Infinity) {
        return +1;
      }
      else if (self == -Infinity) {
        return -1;
      }
      else {
        return nil;
      }
    
    };

    def['$positive?'] = function() {
      var self = this;

      return 1 / self > 0;
    };

    return (def['$negative?'] = function() {
      var self = this;

      return 1 / self < 0;
    }, nil) && 'negative?';
  })(self, null);
  $opal.cdecl($scope, 'Fixnum', (($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a));
  (function($base, $super) {
    function $Integer(){};
    var self = $Integer = $klass($base, $super, 'Integer', $Integer);

    var def = self._proto, $scope = self._scope;

    return ($opal.defs(self, '$===', function(other) {
      var self = this;

      
      if (!other._isNumber) {
        return false;
      }

      return (other % 1) === 0;
    
    }), nil) && '==='
  })(self, (($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a));
  return (function($base, $super) {
    function $Float(){};
    var self = $Float = $klass($base, $super, 'Float', $Float);

    var def = self._proto, $scope = self._scope, $a;

    $opal.defs(self, '$===', function(other) {
      var self = this;

      return !!other._isNumber;
    });

    $opal.cdecl($scope, 'INFINITY', Infinity);

    $opal.cdecl($scope, 'NAN', NaN);

    if ((($a = (typeof(Number.EPSILON) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      return $opal.cdecl($scope, 'EPSILON', Number.EPSILON)
      } else {
      return $opal.cdecl($scope, 'EPSILON', 2.2204460492503130808472633361816E-16)
    };
  })(self, (($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a));
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/numeric.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs([]);
  return (function($base, $super) {
    function $Complex(){};
    var self = $Complex = $klass($base, $super, 'Complex', $Complex);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a))
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/complex.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs([]);
  return (function($base, $super) {
    function $Rational(){};
    var self = $Rational = $klass($base, $super, 'Rational', $Rational);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, (($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a))
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/rational.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$raise']);
  return (function($base, $super) {
    function $Proc(){};
    var self = $Proc = $klass($base, $super, 'Proc', $Proc);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2;

    def._isProc = true;

    def.is_lambda = false;

    $opal.defs(self, '$new', TMP_1 = function() {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if (block !== false && block !== nil) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "tried to create a Proc object without a block")
      };
      return block;
    });

    def.$call = TMP_2 = function(args) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_2._p = null;
      
      if (block !== nil) {
        self._p = block;
      }

      var result;

      if (self.is_lambda) {
        result = self.apply(null, args);
      }
      else {
        result = Opal.$yieldX(self, args);
      }

      if (result === $breaker) {
        return $breaker.$v;
      }

      return result;
    
    };

    $opal.defn(self, '$[]', def.$call);

    def.$to_proc = function() {
      var self = this;

      return self;
    };

    def['$lambda?'] = function() {
      var self = this;

      return !!self.is_lambda;
    };

    return (def.$arity = function() {
      var self = this;

      return self.length;
    }, nil) && 'arity';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/proc.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$attr_reader', '$class', '$arity', '$new', '$name']);
  (function($base, $super) {
    function $Method(){};
    var self = $Method = $klass($base, $super, 'Method', $Method);

    var def = self._proto, $scope = self._scope, TMP_1;

    def.method = def.receiver = def.owner = def.name = def.obj = nil;
    self.$attr_reader("owner", "receiver", "name");

    def.$initialize = function(receiver, method, name) {
      var self = this;

      self.receiver = receiver;
      self.owner = receiver.$class();
      self.name = name;
      return self.method = method;
    };

    def.$arity = function() {
      var self = this;

      return self.method.$arity();
    };

    def.$call = TMP_1 = function(args) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_1._p = null;
      
      self.method._p = block;

      return self.method.apply(self.receiver, args);
    ;
    };

    $opal.defn(self, '$[]', def.$call);

    def.$unbind = function() {
      var $a, self = this;

      return (($a = $scope.UnboundMethod) == null ? $opal.cm('UnboundMethod') : $a).$new(self.owner, self.method, self.name);
    };

    def.$to_proc = function() {
      var self = this;

      return self.method;
    };

    return (def.$inspect = function() {
      var self = this;

      return "#<Method: " + (self.obj.$class().$name()) + "#" + (self.name) + "}>";
    }, nil) && 'inspect';
  })(self, null);
  return (function($base, $super) {
    function $UnboundMethod(){};
    var self = $UnboundMethod = $klass($base, $super, 'UnboundMethod', $UnboundMethod);

    var def = self._proto, $scope = self._scope;

    def.method = def.name = def.owner = nil;
    self.$attr_reader("owner", "name");

    def.$initialize = function(owner, method, name) {
      var self = this;

      self.owner = owner;
      self.method = method;
      return self.name = name;
    };

    def.$arity = function() {
      var self = this;

      return self.method.$arity();
    };

    def.$bind = function(object) {
      var $a, self = this;

      return (($a = $scope.Method) == null ? $opal.cm('Method') : $a).$new(object, self.method, self.name);
    };

    return (def.$inspect = function() {
      var self = this;

      return "#<UnboundMethod: " + (self.owner.$name()) + "#" + (self.name) + ">";
    }, nil) && 'inspect';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/method.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$attr_reader', '$<=', '$<', '$enum_for', '$succ', '$!', '$==', '$===', '$exclude_end?', '$eql?', '$begin', '$end', '$-', '$abs', '$to_i', '$raise', '$inspect']);
  ;
  return (function($base, $super) {
    function $Range(){};
    var self = $Range = $klass($base, $super, 'Range', $Range);

    var def = self._proto, $scope = self._scope, $a, TMP_1, TMP_2, TMP_3;

    def.begin = def.exclude = def.end = nil;
    self.$include((($a = $scope.Enumerable) == null ? $opal.cm('Enumerable') : $a));

    def._isRange = true;

    self.$attr_reader("begin", "end");

    def.$initialize = function(first, last, exclude) {
      var self = this;

      if (exclude == null) {
        exclude = false
      }
      self.begin = first;
      self.end = last;
      return self.exclude = exclude;
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (!other._isRange) {
        return false;
      }

      return self.exclude === other.exclude &&
             self.begin   ==  other.begin &&
             self.end     ==  other.end;
    
    };

    def['$==='] = function(value) {
      var $a, $b, self = this;

      return (($a = self.begin['$<='](value)) ? ((function() {if ((($b = self.exclude) !== nil && (!$b._isBoolean || $b == true))) {
        return value['$<'](self.end)
        } else {
        return value['$<='](self.end)
      }; return nil; })()) : $a);
    };

    $opal.defn(self, '$cover?', def['$===']);

    def.$each = TMP_1 = function() {
      var $a, $b, self = this, $iter = TMP_1._p, block = $iter || nil, current = nil, last = nil;

      TMP_1._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      current = self.begin;
      last = self.end;
      while (current['$<'](last)) {
      if ($opal.$yield1(block, current) === $breaker) return $breaker.$v;
      current = current.$succ();};
      if ((($a = ($b = self.exclude['$!'](), $b !== false && $b !== nil ?current['$=='](last) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        if ($opal.$yield1(block, current) === $breaker) return $breaker.$v};
      return self;
    };

    def['$eql?'] = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Range) == null ? $opal.cm('Range') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      return ($a = ($b = self.exclude['$==='](other['$exclude_end?']()), $b !== false && $b !== nil ?self.begin['$eql?'](other.$begin()) : $b), $a !== false && $a !== nil ?self.end['$eql?'](other.$end()) : $a);
    };

    def['$exclude_end?'] = function() {
      var self = this;

      return self.exclude;
    };

    $opal.defn(self, '$first', def.$begin);

    $opal.defn(self, '$include?', def['$cover?']);

    $opal.defn(self, '$last', def.$end);

    def.$max = TMP_2 = function() {var $zuper = $slice.call(arguments, 0);
      var self = this, $iter = TMP_2._p, $yield = $iter || nil;

      TMP_2._p = null;
      if (($yield !== nil)) {
        return $opal.find_super_dispatcher(self, 'max', TMP_2, $iter).apply(self, $zuper)
        } else {
        return self.exclude ? self.end - 1 : self.end;
      };
    };

    $opal.defn(self, '$member?', def['$cover?']);

    def.$min = TMP_3 = function() {var $zuper = $slice.call(arguments, 0);
      var self = this, $iter = TMP_3._p, $yield = $iter || nil;

      TMP_3._p = null;
      if (($yield !== nil)) {
        return $opal.find_super_dispatcher(self, 'min', TMP_3, $iter).apply(self, $zuper)
        } else {
        return self.begin
      };
    };

    $opal.defn(self, '$member?', def['$include?']);

    def.$size = function() {
      var $a, $b, $c, self = this, _begin = nil, _end = nil, infinity = nil;

      _begin = self.begin;
      _end = self.end;
      if ((($a = self.exclude) !== nil && (!$a._isBoolean || $a == true))) {
        _end = _end['$-'](1)};
      if ((($a = ($b = (($c = $scope.Numeric) == null ? $opal.cm('Numeric') : $c)['$==='](_begin), $b !== false && $b !== nil ?(($c = $scope.Numeric) == null ? $opal.cm('Numeric') : $c)['$==='](_end) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return nil
      };
      if (_end['$<'](_begin)) {
        return 0};
      infinity = (($a = ((($b = $scope.Float) == null ? $opal.cm('Float') : $b))._scope).INFINITY == null ? $a.cm('INFINITY') : $a.INFINITY);
      if ((($a = ((($b = infinity['$=='](_begin.$abs())) !== false && $b !== nil) ? $b : _end.$abs()['$=='](infinity))) !== nil && (!$a._isBoolean || $a == true))) {
        return infinity};
      return ((Math.abs(_end - _begin) + 1)).$to_i();
    };

    def.$step = function(n) {
      var $a, self = this;

      if (n == null) {
        n = 1
      }
      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$to_s = function() {
      var self = this;

      return self.begin.$inspect() + (self.exclude ? '...' : '..') + self.end.$inspect();
    };

    return $opal.defn(self, '$inspect', def.$to_s);
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/range.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$kind_of?', '$to_i', '$coerce_to', '$between?', '$raise', '$new', '$compact', '$nil?', '$===', '$<=>', '$to_f', '$strftime', '$is_a?', '$zero?', '$utc?', '$warn', '$yday', '$rjust', '$ljust', '$zone', '$sec', '$min', '$hour', '$day', '$month', '$year', '$wday', '$isdst']);
  ;
  return (function($base, $super) {
    function $Time(){};
    var self = $Time = $klass($base, $super, 'Time', $Time);

    var def = self._proto, $scope = self._scope, $a;

    self.$include((($a = $scope.Comparable) == null ? $opal.cm('Comparable') : $a));

    
    var days_of_week = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        short_days   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        short_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        long_months  = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  ;

    $opal.defs(self, '$at', function(seconds, frac) {
      var self = this;

      if (frac == null) {
        frac = 0
      }
      return new Date(seconds * 1000 + frac);
    });

    $opal.defs(self, '$new', function(year, month, day, hour, minute, second, utc_offset) {
      var self = this;

      
      switch (arguments.length) {
        case 1:
          return new Date(year, 0);

        case 2:
          return new Date(year, month - 1);

        case 3:
          return new Date(year, month - 1, day);

        case 4:
          return new Date(year, month - 1, day, hour);

        case 5:
          return new Date(year, month - 1, day, hour, minute);

        case 6:
          return new Date(year, month - 1, day, hour, minute, second);

        case 7:
          return new Date(year, month - 1, day, hour, minute, second);

        default:
          return new Date();
      }
    
    });

    $opal.defs(self, '$local', function(year, month, day, hour, minute, second, millisecond) {
      var $a, $b, self = this;

      if (month == null) {
        month = nil
      }
      if (day == null) {
        day = nil
      }
      if (hour == null) {
        hour = nil
      }
      if (minute == null) {
        minute = nil
      }
      if (second == null) {
        second = nil
      }
      if (millisecond == null) {
        millisecond = nil
      }
      if ((($a = arguments.length === 10) !== nil && (!$a._isBoolean || $a == true))) {
        
        var args = $slice.call(arguments).reverse();

        second = args[9];
        minute = args[8];
        hour   = args[7];
        day    = args[6];
        month  = args[5];
        year   = args[4];
      };
      year = (function() {if ((($a = year['$kind_of?']((($b = $scope.String) == null ? $opal.cm('String') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
        return year.$to_i()
        } else {
        return (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(year, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int")
      }; return nil; })();
      month = (function() {if ((($a = month['$kind_of?']((($b = $scope.String) == null ? $opal.cm('String') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
        return month.$to_i()
        } else {
        return (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(((($a = month) !== false && $a !== nil) ? $a : 1), (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int")
      }; return nil; })();
      if ((($a = month['$between?'](1, 12)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "month out of range: " + (month))
      };
      day = (function() {if ((($a = day['$kind_of?']((($b = $scope.String) == null ? $opal.cm('String') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
        return day.$to_i()
        } else {
        return (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(((($a = day) !== false && $a !== nil) ? $a : 1), (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int")
      }; return nil; })();
      if ((($a = day['$between?'](1, 31)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "day out of range: " + (day))
      };
      hour = (function() {if ((($a = hour['$kind_of?']((($b = $scope.String) == null ? $opal.cm('String') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
        return hour.$to_i()
        } else {
        return (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(((($a = hour) !== false && $a !== nil) ? $a : 0), (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int")
      }; return nil; })();
      if ((($a = hour['$between?'](0, 24)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "hour out of range: " + (hour))
      };
      minute = (function() {if ((($a = minute['$kind_of?']((($b = $scope.String) == null ? $opal.cm('String') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
        return minute.$to_i()
        } else {
        return (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(((($a = minute) !== false && $a !== nil) ? $a : 0), (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int")
      }; return nil; })();
      if ((($a = minute['$between?'](0, 59)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "minute out of range: " + (minute))
      };
      second = (function() {if ((($a = second['$kind_of?']((($b = $scope.String) == null ? $opal.cm('String') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
        return second.$to_i()
        } else {
        return (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(((($a = second) !== false && $a !== nil) ? $a : 0), (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int")
      }; return nil; })();
      if ((($a = second['$between?'](0, 59)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "second out of range: " + (second))
      };
      return ($a = self).$new.apply($a, [].concat([year, month, day, hour, minute, second].$compact()));
    });

    $opal.defs(self, '$gm', function(year, month, day, hour, minute, second, utc_offset) {
      var $a, self = this;

      if ((($a = year['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "missing year (got nil)")};
      
      if (month > 12 || day > 31 || hour > 24 || minute > 59 || second > 59) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a));
      }

      var date = new Date(Date.UTC(year, (month || 1) - 1, (day || 1), (hour || 0), (minute || 0), (second || 0)));
      date.tz_offset = 0
      return date;
    ;
    });

    (function(self) {
      var $scope = self._scope, def = self._proto;

      self._proto.$mktime = self._proto.$local;
      return self._proto.$utc = self._proto.$gm;
    })(self.$singleton_class());

    $opal.defs(self, '$now', function() {
      var self = this;

      return new Date();
    });

    def['$+'] = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Time) == null ? $opal.cm('Time') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "time + time?")};
      other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
      
      var result = new Date(self.getTime() + (other * 1000));
      result.tz_offset = self.tz_offset;
      return result;
    
    };

    def['$-'] = function(other) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Time) == null ? $opal.cm('Time') : $b)['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        return (self.getTime() - other.getTime()) / 1000;
        } else {
        other = (($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$coerce_to(other, (($a = $scope.Integer) == null ? $opal.cm('Integer') : $a), "to_int");
        
        var result = new Date(self.getTime() - (other * 1000));
        result.tz_offset = self.tz_offset;
        return result;
      
      };
    };

    def['$<=>'] = function(other) {
      var self = this;

      return self.$to_f()['$<=>'](other.$to_f());
    };

    def['$=='] = function(other) {
      var self = this;

      return self.$to_f() === other.$to_f();
    };

    def.$asctime = function() {
      var self = this;

      return self.$strftime("%a %b %e %H:%M:%S %Y");
    };

    $opal.defn(self, '$ctime', def.$asctime);

    def.$day = function() {
      var self = this;

      return self.getDate();
    };

    def.$yday = function() {
      var self = this;

      
      // http://javascript.about.com/library/bldayyear.htm
      var onejan = new Date(self.getFullYear(), 0, 1);
      return Math.ceil((self - onejan) / 86400000);
    
    };

    def.$isdst = function() {
      var $a, self = this;

      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def['$eql?'] = function(other) {
      var $a, $b, self = this;

      return ($a = other['$is_a?']((($b = $scope.Time) == null ? $opal.cm('Time') : $b)), $a !== false && $a !== nil ?(self['$<=>'](other))['$zero?']() : $a);
    };

    def['$friday?'] = function() {
      var self = this;

      return self.getDay() === 5;
    };

    def.$hour = function() {
      var self = this;

      return self.getHours();
    };

    def.$inspect = function() {
      var $a, self = this;

      if ((($a = self['$utc?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$strftime("%Y-%m-%d %H:%M:%S UTC")
        } else {
        return self.$strftime("%Y-%m-%d %H:%M:%S %z")
      };
    };

    $opal.defn(self, '$mday', def.$day);

    def.$min = function() {
      var self = this;

      return self.getMinutes();
    };

    def.$mon = function() {
      var self = this;

      return self.getMonth() + 1;
    };

    def['$monday?'] = function() {
      var self = this;

      return self.getDay() === 1;
    };

    $opal.defn(self, '$month', def.$mon);

    def['$saturday?'] = function() {
      var self = this;

      return self.getDay() === 6;
    };

    def.$sec = function() {
      var self = this;

      return self.getSeconds();
    };

    def.$usec = function() {
      var self = this;

      self.$warn("Microseconds are not supported");
      return 0;
    };

    def.$zone = function() {
      var self = this;

      
      var string = self.toString(),
          result;

      if (string.indexOf('(') == -1) {
        result = string.match(/[A-Z]{3,4}/)[0];
      }
      else {
        result = string.match(/\([^)]+\)/)[0].match(/[A-Z]/g).join('');
      }

      if (result == "GMT" && /(GMT\W*\d{4})/.test(string)) {
        return RegExp.$1;
      }
      else {
        return result;
      }
    
    };

    def.$getgm = function() {
      var self = this;

      
      var result = new Date(self.getTime());
      result.tz_offset = 0;
      return result;
    
    };

    def['$gmt?'] = function() {
      var self = this;

      return self.tz_offset == 0;
    };

    def.$gmt_offset = function() {
      var self = this;

      return -self.getTimezoneOffset() * 60;
    };

    def.$strftime = function(format) {
      var self = this;

      
      return format.replace(/%([\-_#^0]*:{0,2})(\d+)?([EO]*)(.)/g, function(full, flags, width, _, conv) {
        var result = "",
            width  = parseInt(width),
            zero   = flags.indexOf('0') !== -1,
            pad    = flags.indexOf('-') === -1,
            blank  = flags.indexOf('_') !== -1,
            upcase = flags.indexOf('^') !== -1,
            invert = flags.indexOf('#') !== -1,
            colons = (flags.match(':') || []).length;

        if (zero && blank) {
          if (flags.indexOf('0') < flags.indexOf('_')) {
            zero = false;
          }
          else {
            blank = false;
          }
        }

        switch (conv) {
          case 'Y':
            result += self.getFullYear();
            break;

          case 'C':
            zero    = !blank;
            result += Match.round(self.getFullYear() / 100);
            break;

          case 'y':
            zero    = !blank;
            result += (self.getFullYear() % 100);
            break;

          case 'm':
            zero    = !blank;
            result += (self.getMonth() + 1);
            break;

          case 'B':
            result += long_months[self.getMonth()];
            break;

          case 'b':
          case 'h':
            blank   = !zero;
            result += short_months[self.getMonth()];
            break;

          case 'd':
            zero    = !blank
            result += self.getDate();
            break;

          case 'e':
            blank   = !zero
            result += self.getDate();
            break;

          case 'j':
            result += self.$yday();
            break;

          case 'H':
            zero    = !blank;
            result += self.getHours();
            break;

          case 'k':
            blank   = !zero;
            result += self.getHours();
            break;

          case 'I':
            zero    = !blank;
            result += (self.getHours() % 12 || 12);
            break;

          case 'l':
            blank   = !zero;
            result += (self.getHours() % 12 || 12);
            break;

          case 'P':
            result += (self.getHours() >= 12 ? "pm" : "am");
            break;

          case 'p':
            result += (self.getHours() >= 12 ? "PM" : "AM");
            break;

          case 'M':
            zero    = !blank;
            result += self.getMinutes();
            break;

          case 'S':
            zero    = !blank;
            result += self.getSeconds();
            break;

          case 'L':
            zero    = !blank;
            width   = isNaN(width) ? 3 : width;
            result += self.getMilliseconds();
            break;

          case 'N':
            width   = isNaN(width) ? 9 : width;
            result += (self.getMilliseconds().toString()).$rjust(3, "0");
            result  = (result).$ljust(width, "0");
            break;

          case 'z':
            var offset  = self.getTimezoneOffset(),
                hours   = Math.floor(Math.abs(offset) / 60),
                minutes = Math.abs(offset) % 60;

            result += offset < 0 ? "+" : "-";
            result += hours < 10 ? "0" : "";
            result += hours;

            if (colons > 0) {
              result += ":";
            }

            result += minutes < 10 ? "0" : "";
            result += minutes;

            if (colons > 1) {
              result += ":00";
            }

            break;

          case 'Z':
            result += self.$zone();
            break;

          case 'A':
            result += days_of_week[self.getDay()];
            break;

          case 'a':
            result += short_days[self.getDay()];
            break;

          case 'u':
            result += (self.getDay() + 1);
            break;

          case 'w':
            result += self.getDay();
            break;

          // TODO: week year
          // TODO: week number

          case 's':
            result += parseInt(self.getTime() / 1000)
            break;

          case 'n':
            result += "\n";
            break;

          case 't':
            result += "\t";
            break;

          case '%':
            result += "%";
            break;

          case 'c':
            result += self.$strftime("%a %b %e %T %Y");
            break;

          case 'D':
          case 'x':
            result += self.$strftime("%m/%d/%y");
            break;

          case 'F':
            result += self.$strftime("%Y-%m-%d");
            break;

          case 'v':
            result += self.$strftime("%e-%^b-%4Y");
            break;

          case 'r':
            result += self.$strftime("%I:%M:%S %p");
            break;

          case 'R':
            result += self.$strftime("%H:%M");
            break;

          case 'T':
          case 'X':
            result += self.$strftime("%H:%M:%S");
            break;

          default:
            return full;
        }

        if (upcase) {
          result = result.toUpperCase();
        }

        if (invert) {
          result = result.replace(/[A-Z]/, function(c) { c.toLowerCase() }).
                          replace(/[a-z]/, function(c) { c.toUpperCase() });
        }

        if (pad && (zero || blank)) {
          result = (result).$rjust(isNaN(width) ? 2 : width, blank ? " " : "0");
        }

        return result;
      });
    
    };

    def['$sunday?'] = function() {
      var self = this;

      return self.getDay() === 0;
    };

    def['$thursday?'] = function() {
      var self = this;

      return self.getDay() === 4;
    };

    def.$to_a = function() {
      var self = this;

      return [self.$sec(), self.$min(), self.$hour(), self.$day(), self.$month(), self.$year(), self.$wday(), self.$yday(), self.$isdst(), self.$zone()];
    };

    def.$to_f = function() {
      var self = this;

      return self.getTime() / 1000;
    };

    def.$to_i = function() {
      var self = this;

      return parseInt(self.getTime() / 1000);
    };

    $opal.defn(self, '$to_s', def.$inspect);

    def['$tuesday?'] = function() {
      var self = this;

      return self.getDay() === 2;
    };

    $opal.defn(self, '$utc?', def['$gmt?']);

    def.$utc_offset = function() {
      var self = this;

      return self.getTimezoneOffset() * -60;
    };

    def.$wday = function() {
      var self = this;

      return self.getDay();
    };

    def['$wednesday?'] = function() {
      var self = this;

      return self.getDay() === 3;
    };

    return (def.$year = function() {
      var self = this;

      return self.getFullYear();
    }, nil) && 'year';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/time.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$==', '$[]', '$upcase', '$const_set', '$new', '$unshift', '$each', '$define_struct_attribute', '$instance_eval', '$to_proc', '$raise', '$<<', '$members', '$define_method', '$instance_variable_get', '$instance_variable_set', '$include', '$each_with_index', '$class', '$===', '$>=', '$size', '$include?', '$to_sym', '$enum_for', '$hash', '$all?', '$length', '$map', '$+', '$name', '$join', '$inspect', '$each_pair']);
  return (function($base, $super) {
    function $Struct(){};
    var self = $Struct = $klass($base, $super, 'Struct', $Struct);

    var def = self._proto, $scope = self._scope, TMP_1, $a, TMP_8, TMP_10;

    $opal.defs(self, '$new', TMP_1 = function(name, args) {var $zuper = $slice.call(arguments, 0);
      var $a, $b, $c, TMP_2, $d, self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_1._p = null;
      if (self['$==']((($a = $scope.Struct) == null ? $opal.cm('Struct') : $a))) {
        } else {
        return $opal.find_super_dispatcher(self, 'new', TMP_1, $iter, $Struct).apply(self, $zuper)
      };
      if (name['$[]'](0)['$=='](name['$[]'](0).$upcase())) {
        return (($a = $scope.Struct) == null ? $opal.cm('Struct') : $a).$const_set(name, ($a = self).$new.apply($a, [].concat(args)))
        } else {
        args.$unshift(name);
        return ($b = ($c = (($d = $scope.Class) == null ? $opal.cm('Class') : $d)).$new, $b._p = (TMP_2 = function(){var self = TMP_2._s || this, $a, $b, TMP_3, $c;

        ($a = ($b = args).$each, $a._p = (TMP_3 = function(arg){var self = TMP_3._s || this;
if (arg == null) arg = nil;
          return self.$define_struct_attribute(arg)}, TMP_3._s = self, TMP_3), $a).call($b);
          if (block !== false && block !== nil) {
            return ($a = ($c = self).$instance_eval, $a._p = block.$to_proc(), $a).call($c)
            } else {
            return nil
          };}, TMP_2._s = self, TMP_2), $b).call($c, self);
      };
    });

    $opal.defs(self, '$define_struct_attribute', function(name) {
      var $a, $b, TMP_4, $c, TMP_5, self = this;

      if (self['$==']((($a = $scope.Struct) == null ? $opal.cm('Struct') : $a))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "you cannot define attributes to the Struct class")};
      self.$members()['$<<'](name);
      ($a = ($b = self).$define_method, $a._p = (TMP_4 = function(){var self = TMP_4._s || this;

      return self.$instance_variable_get("@" + (name))}, TMP_4._s = self, TMP_4), $a).call($b, name);
      return ($a = ($c = self).$define_method, $a._p = (TMP_5 = function(value){var self = TMP_5._s || this;
if (value == null) value = nil;
      return self.$instance_variable_set("@" + (name), value)}, TMP_5._s = self, TMP_5), $a).call($c, "" + (name) + "=");
    });

    $opal.defs(self, '$members', function() {
      var $a, self = this;
      if (self.members == null) self.members = nil;

      if (self['$==']((($a = $scope.Struct) == null ? $opal.cm('Struct') : $a))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "the Struct class has no members")};
      return ((($a = self.members) !== false && $a !== nil) ? $a : self.members = []);
    });

    $opal.defs(self, '$inherited', function(klass) {
      var $a, $b, TMP_6, self = this, members = nil;
      if (self.members == null) self.members = nil;

      if (self['$==']((($a = $scope.Struct) == null ? $opal.cm('Struct') : $a))) {
        return nil};
      members = self.members;
      return ($a = ($b = klass).$instance_eval, $a._p = (TMP_6 = function(){var self = TMP_6._s || this;

      return self.members = members}, TMP_6._s = self, TMP_6), $a).call($b);
    });

    (function(self) {
      var $scope = self._scope, def = self._proto;

      return self._proto['$[]'] = self._proto.$new
    })(self.$singleton_class());

    self.$include((($a = $scope.Enumerable) == null ? $opal.cm('Enumerable') : $a));

    def.$initialize = function(args) {
      var $a, $b, TMP_7, self = this;

      args = $slice.call(arguments, 0);
      return ($a = ($b = self.$members()).$each_with_index, $a._p = (TMP_7 = function(name, index){var self = TMP_7._s || this;
if (name == null) name = nil;if (index == null) index = nil;
      return self.$instance_variable_set("@" + (name), args['$[]'](index))}, TMP_7._s = self, TMP_7), $a).call($b);
    };

    def.$members = function() {
      var self = this;

      return self.$class().$members();
    };

    def['$[]'] = function(name) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Integer) == null ? $opal.cm('Integer') : $b)['$==='](name)) !== nil && (!$a._isBoolean || $a == true))) {
        if (name['$>='](self.$members().$size())) {
          self.$raise((($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a), "offset " + (name) + " too large for struct(size:" + (self.$members().$size()) + ")")};
        name = self.$members()['$[]'](name);
      } else if ((($a = self.$members()['$include?'](name.$to_sym())) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.NameError) == null ? $opal.cm('NameError') : $a), "no member '" + (name) + "' in struct")
      };
      return self.$instance_variable_get("@" + (name));
    };

    def['$[]='] = function(name, value) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Integer) == null ? $opal.cm('Integer') : $b)['$==='](name)) !== nil && (!$a._isBoolean || $a == true))) {
        if (name['$>='](self.$members().$size())) {
          self.$raise((($a = $scope.IndexError) == null ? $opal.cm('IndexError') : $a), "offset " + (name) + " too large for struct(size:" + (self.$members().$size()) + ")")};
        name = self.$members()['$[]'](name);
      } else if ((($a = self.$members()['$include?'](name.$to_sym())) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise((($a = $scope.NameError) == null ? $opal.cm('NameError') : $a), "no member '" + (name) + "' in struct")
      };
      return self.$instance_variable_set("@" + (name), value);
    };

    def.$each = TMP_8 = function() {
      var $a, $b, TMP_9, self = this, $iter = TMP_8._p, $yield = $iter || nil;

      TMP_8._p = null;
      if (($yield !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      ($a = ($b = self.$members()).$each, $a._p = (TMP_9 = function(name){var self = TMP_9._s || this, $a;
if (name == null) name = nil;
      return $a = $opal.$yield1($yield, self['$[]'](name)), $a === $breaker ? $a : $a}, TMP_9._s = self, TMP_9), $a).call($b);
      return self;
    };

    def.$each_pair = TMP_10 = function() {
      var $a, $b, TMP_11, self = this, $iter = TMP_10._p, $yield = $iter || nil;

      TMP_10._p = null;
      if (($yield !== nil)) {
        } else {
        return self.$enum_for("each_pair")
      };
      ($a = ($b = self.$members()).$each, $a._p = (TMP_11 = function(name){var self = TMP_11._s || this, $a;
if (name == null) name = nil;
      return $a = $opal.$yieldX($yield, [name, self['$[]'](name)]), $a === $breaker ? $a : $a}, TMP_11._s = self, TMP_11), $a).call($b);
      return self;
    };

    def['$eql?'] = function(other) {
      var $a, $b, $c, TMP_12, self = this;

      return ((($a = self.$hash()['$=='](other.$hash())) !== false && $a !== nil) ? $a : ($b = ($c = other.$each_with_index())['$all?'], $b._p = (TMP_12 = function(object, index){var self = TMP_12._s || this;
if (object == null) object = nil;if (index == null) index = nil;
      return self['$[]'](self.$members()['$[]'](index))['$=='](object)}, TMP_12._s = self, TMP_12), $b).call($c));
    };

    def.$length = function() {
      var self = this;

      return self.$members().$length();
    };

    $opal.defn(self, '$size', def.$length);

    def.$to_a = function() {
      var $a, $b, TMP_13, self = this;

      return ($a = ($b = self.$members()).$map, $a._p = (TMP_13 = function(name){var self = TMP_13._s || this;
if (name == null) name = nil;
      return self['$[]'](name)}, TMP_13._s = self, TMP_13), $a).call($b);
    };

    $opal.defn(self, '$values', def.$to_a);

    def.$inspect = function() {
      var $a, $b, TMP_14, self = this, result = nil;

      result = "#<struct ";
      if (self.$class()['$==']((($a = $scope.Struct) == null ? $opal.cm('Struct') : $a))) {
        result = result['$+']("" + (self.$class().$name()) + " ")};
      result = result['$+'](($a = ($b = self.$each_pair()).$map, $a._p = (TMP_14 = function(name, value){var self = TMP_14._s || this;
if (name == null) name = nil;if (value == null) value = nil;
      return "" + (name) + "=" + (value.$inspect())}, TMP_14._s = self, TMP_14), $a).call($b).$join(", "));
      result = result['$+'](">");
      return result;
    };

    return $opal.defn(self, '$to_s', def.$inspect);
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/struct.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, $b, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module, $gvars = $opal.gvars;
  if ($gvars.stdout == null) $gvars.stdout = nil;
  if ($gvars.stderr == null) $gvars.stderr = nil;

  $opal.add_stubs(['$write', '$join', '$map', '$String', '$getbyte', '$getc', '$raise', '$new', '$to_s', '$extend']);
  (function($base, $super) {
    function $IO(){};
    var self = $IO = $klass($base, $super, 'IO', $IO);

    var def = self._proto, $scope = self._scope;

    $opal.cdecl($scope, 'SEEK_SET', 0);

    $opal.cdecl($scope, 'SEEK_CUR', 1);

    $opal.cdecl($scope, 'SEEK_END', 2);

    (function($base) {
      var self = $module($base, 'Writable');

      var def = self._proto, $scope = self._scope;

      def['$<<'] = function(string) {
        var self = this;

        self.$write(string);
        return self;
      };

      def.$print = function(args) {
        var $a, $b, TMP_1, self = this;
        if ($gvars[","] == null) $gvars[","] = nil;

        args = $slice.call(arguments, 0);
        return self.$write(($a = ($b = args).$map, $a._p = (TMP_1 = function(arg){var self = TMP_1._s || this;
if (arg == null) arg = nil;
        return self.$String(arg)}, TMP_1._s = self, TMP_1), $a).call($b).$join($gvars[","]));
      };

      def.$puts = function(args) {
        var $a, $b, TMP_2, self = this;
        if ($gvars["/"] == null) $gvars["/"] = nil;

        args = $slice.call(arguments, 0);
        return self.$write(($a = ($b = args).$map, $a._p = (TMP_2 = function(arg){var self = TMP_2._s || this;
if (arg == null) arg = nil;
        return self.$String(arg)}, TMP_2._s = self, TMP_2), $a).call($b).$join($gvars["/"]));
      };
            ;$opal.donate(self, ["$<<", "$print", "$puts"]);
    })(self);

    return (function($base) {
      var self = $module($base, 'Readable');

      var def = self._proto, $scope = self._scope;

      def.$readbyte = function() {
        var self = this;

        return self.$getbyte();
      };

      def.$readchar = function() {
        var self = this;

        return self.$getc();
      };

      def.$readline = function(sep) {
        var $a, self = this;
        if ($gvars["/"] == null) $gvars["/"] = nil;

        if (sep == null) {
          sep = $gvars["/"]
        }
        return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
      };

      def.$readpartial = function(integer, outbuf) {
        var $a, self = this;

        if (outbuf == null) {
          outbuf = nil
        }
        return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
      };
            ;$opal.donate(self, ["$readbyte", "$readchar", "$readline", "$readpartial"]);
    })(self);
  })(self, null);
  $opal.cdecl($scope, 'STDERR', $gvars.stderr = (($a = $scope.IO) == null ? $opal.cm('IO') : $a).$new());
  $opal.cdecl($scope, 'STDIN', $gvars.stdin = (($a = $scope.IO) == null ? $opal.cm('IO') : $a).$new());
  $opal.cdecl($scope, 'STDOUT', $gvars.stdout = (($a = $scope.IO) == null ? $opal.cm('IO') : $a).$new());
  $opal.defs($gvars.stdout, '$write', function(string) {
    var self = this;

    console.log(string.$to_s());;
    return nil;
  });
  $opal.defs($gvars.stderr, '$write', function(string) {
    var self = this;

    console.warn(string.$to_s());;
    return nil;
  });
  $gvars.stdout.$extend((($a = ((($b = $scope.IO) == null ? $opal.cm('IO') : $b))._scope).Writable == null ? $a.cm('Writable') : $a.Writable));
  return $gvars.stderr.$extend((($a = ((($b = $scope.IO) == null ? $opal.cm('IO') : $b))._scope).Writable == null ? $a.cm('Writable') : $a.Writable));
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/io.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice;

  $opal.add_stubs(['$include']);
  $opal.defs(self, '$to_s', function() {
    var self = this;

    return "main";
  });
  return ($opal.defs(self, '$include', function(mod) {
    var $a, self = this;

    return (($a = $scope.Object) == null ? $opal.cm('Object') : $a).$include(mod);
  }), nil) && 'include';
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/main.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $gvars = $opal.gvars, $hash2 = $opal.hash2;

  $opal.add_stubs(['$new']);
  $gvars["&"] = $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
  $gvars[":"] = [];
  $gvars["\""] = [];
  $gvars["/"] = "\n";
  $gvars[","] = nil;
  $opal.cdecl($scope, 'ARGV', []);
  $opal.cdecl($scope, 'ARGF', (($a = $scope.Object) == null ? $opal.cm('Object') : $a).$new());
  $opal.cdecl($scope, 'ENV', $hash2([], {}));
  $gvars.VERBOSE = false;
  $gvars.DEBUG = false;
  $gvars.SAFE = 0;
  $opal.cdecl($scope, 'RUBY_PLATFORM', "opal");
  $opal.cdecl($scope, 'RUBY_ENGINE', "opal");
  $opal.cdecl($scope, 'RUBY_VERSION', "2.1.1");
  $opal.cdecl($scope, 'RUBY_ENGINE_VERSION', "0.6.1");
  return $opal.cdecl($scope, 'RUBY_RELEASE_DATE', "2014-04-15");
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/variables.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice;

  $opal.add_stubs([]);
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  return true;
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $range = $opal.range, $hash2 = $opal.hash2, $klass = $opal.klass, $gvars = $opal.gvars;

  $opal.add_stubs(['$try_convert', '$native?', '$respond_to?', '$to_n', '$raise', '$inspect', '$Native', '$end_with?', '$define_method', '$[]', '$convert', '$call', '$to_proc', '$new', '$each', '$native_reader', '$native_writer', '$extend', '$to_a', '$to_ary', '$include', '$method_missing', '$bind', '$instance_method', '$[]=', '$slice', '$-', '$length', '$enum_for', '$===', '$>=', '$<<', '$==', '$instance_variable_set', '$members', '$each_with_index', '$each_pair', '$name']);
  (function($base) {
    var self = $module($base, 'Native');

    var def = self._proto, $scope = self._scope, TMP_1;

    $opal.defs(self, '$is_a?', function(object, klass) {
      var self = this;

      
      try {
        return object instanceof self.$try_convert(klass);
      }
      catch (e) {
        return false;
      }
    ;
    });

    $opal.defs(self, '$try_convert', function(value) {
      var self = this;

      
      if (self['$native?'](value)) {
        return value;
      }
      else if (value['$respond_to?']("to_n")) {
        return value.$to_n();
      }
      else {
        return nil;
      }
    ;
    });

    $opal.defs(self, '$convert', function(value) {
      var $a, self = this;

      
      if (self['$native?'](value)) {
        return value;
      }
      else if (value['$respond_to?']("to_n")) {
        return value.$to_n();
      }
      else {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "" + (value.$inspect()) + " isn't native");
      }
    ;
    });

    $opal.defs(self, '$call', TMP_1 = function(obj, key, args) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 2);
      TMP_1._p = null;
      
      var prop = obj[key];

      if (prop instanceof Function) {
        var converted = new Array(args.length);

        for (var i = 0, length = args.length; i < length; i++) {
          var item = args[i],
              conv = self.$try_convert(item);

          converted[i] = conv === nil ? item : conv;
        }

        if (block !== nil) {
          converted.push(block);
        }

        return self.$Native(prop.apply(obj, converted));
      }
      else {
        return self.$Native(prop);
      }
    ;
    });

    (function($base) {
      var self = $module($base, 'Helpers');

      var def = self._proto, $scope = self._scope;

      def.$alias_native = function(new$, old, options) {
        var $a, $b, TMP_2, $c, TMP_3, $d, TMP_4, self = this, as = nil;

        if (old == null) {
          old = new$
        }
        if (options == null) {
          options = $hash2([], {})
        }
        if ((($a = old['$end_with?']("=")) !== nil && (!$a._isBoolean || $a == true))) {
          return ($a = ($b = self).$define_method, $a._p = (TMP_2 = function(value){var self = TMP_2._s || this, $a;
            if (self["native"] == null) self["native"] = nil;
if (value == null) value = nil;
          self["native"][old['$[]']($range(0, -2, false))] = (($a = $scope.Native) == null ? $opal.cm('Native') : $a).$convert(value);
            return value;}, TMP_2._s = self, TMP_2), $a).call($b, new$)
        } else if ((($a = as = options['$[]']("as")) !== nil && (!$a._isBoolean || $a == true))) {
          return ($a = ($c = self).$define_method, $a._p = (TMP_3 = function(args){var self = TMP_3._s || this, block, $a, $b, $c, $d;
            if (self["native"] == null) self["native"] = nil;
args = $slice.call(arguments, 0);
            block = TMP_3._p || nil, TMP_3._p = null;
          if ((($a = value = ($b = ($c = (($d = $scope.Native) == null ? $opal.cm('Native') : $d)).$call, $b._p = block.$to_proc(), $b).apply($c, [self["native"], old].concat(args))) !== nil && (!$a._isBoolean || $a == true))) {
              return as.$new(value.$to_n())
              } else {
              return nil
            }}, TMP_3._s = self, TMP_3), $a).call($c, new$)
          } else {
          return ($a = ($d = self).$define_method, $a._p = (TMP_4 = function(args){var self = TMP_4._s || this, block, $a, $b, $c;
            if (self["native"] == null) self["native"] = nil;
args = $slice.call(arguments, 0);
            block = TMP_4._p || nil, TMP_4._p = null;
          return ($a = ($b = (($c = $scope.Native) == null ? $opal.cm('Native') : $c)).$call, $a._p = block.$to_proc(), $a).apply($b, [self["native"], old].concat(args))}, TMP_4._s = self, TMP_4), $a).call($d, new$)
        };
      };

      def.$native_reader = function(names) {
        var $a, $b, TMP_5, self = this;

        names = $slice.call(arguments, 0);
        return ($a = ($b = names).$each, $a._p = (TMP_5 = function(name){var self = TMP_5._s || this, $a, $b, TMP_6;
if (name == null) name = nil;
        return ($a = ($b = self).$define_method, $a._p = (TMP_6 = function(){var self = TMP_6._s || this;
            if (self["native"] == null) self["native"] = nil;

          return self.$Native(self["native"][name])}, TMP_6._s = self, TMP_6), $a).call($b, name)}, TMP_5._s = self, TMP_5), $a).call($b);
      };

      def.$native_writer = function(names) {
        var $a, $b, TMP_7, self = this;

        names = $slice.call(arguments, 0);
        return ($a = ($b = names).$each, $a._p = (TMP_7 = function(name){var self = TMP_7._s || this, $a, $b, TMP_8;
if (name == null) name = nil;
        return ($a = ($b = self).$define_method, $a._p = (TMP_8 = function(value){var self = TMP_8._s || this;
            if (self["native"] == null) self["native"] = nil;
if (value == null) value = nil;
          return self.$Native(self["native"][name] = value)}, TMP_8._s = self, TMP_8), $a).call($b, "" + (name) + "=")}, TMP_7._s = self, TMP_7), $a).call($b);
      };

      def.$native_accessor = function(names) {
        var $a, $b, self = this;

        names = $slice.call(arguments, 0);
        ($a = self).$native_reader.apply($a, [].concat(names));
        return ($b = self).$native_writer.apply($b, [].concat(names));
      };
            ;$opal.donate(self, ["$alias_native", "$native_reader", "$native_writer", "$native_accessor"]);
    })(self);

    $opal.defs(self, '$included', function(klass) {
      var $a, self = this;

      return klass.$extend((($a = $scope.Helpers) == null ? $opal.cm('Helpers') : $a));
    });

    def.$initialize = function(native$) {
      var $a, $b, self = this;

      if ((($a = (($b = $scope.Kernel) == null ? $opal.cm('Kernel') : $b)['$native?'](native$)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        (($a = $scope.Kernel) == null ? $opal.cm('Kernel') : $a).$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "" + (native$.$inspect()) + " isn't native")
      };
      return self["native"] = native$;
    };

    def.$to_n = function() {
      var self = this;
      if (self["native"] == null) self["native"] = nil;

      return self["native"];
    };
        ;$opal.donate(self, ["$initialize", "$to_n"]);
  })(self);
  (function($base) {
    var self = $module($base, 'Kernel');

    var def = self._proto, $scope = self._scope, TMP_9;

    def['$native?'] = function(value) {
      var self = this;

      return value == null || !value._klass;
    };

    def.$Native = function(obj) {
      var $a, $b, self = this;

      if ((($a = obj == null) !== nil && (!$a._isBoolean || $a == true))) {
        return nil
      } else if ((($a = self['$native?'](obj)) !== nil && (!$a._isBoolean || $a == true))) {
        return (($a = ((($b = $scope.Native) == null ? $opal.cm('Native') : $b))._scope).Object == null ? $a.cm('Object') : $a.Object).$new(obj)
        } else {
        return obj
      };
    };

    def.$Array = TMP_9 = function(object, args) {
      var $a, $b, $c, $d, self = this, $iter = TMP_9._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_9._p = null;
      
      if (object == null || object === nil) {
        return [];
      }
      else if (self['$native?'](object)) {
        return ($a = ($b = (($c = ((($d = $scope.Native) == null ? $opal.cm('Native') : $d))._scope).Array == null ? $c.cm('Array') : $c.Array)).$new, $a._p = block.$to_proc(), $a).apply($b, [object].concat(args)).$to_a();
      }
      else if (object['$respond_to?']("to_ary")) {
        return object.$to_ary();
      }
      else if (object['$respond_to?']("to_a")) {
        return object.$to_a();
      }
      else {
        return [object];
      }
    ;
    };
        ;$opal.donate(self, ["$native?", "$Native", "$Array"]);
  })(self);
  (function($base, $super) {
    function $Object(){};
    var self = $Object = $klass($base, $super, 'Object', $Object);

    var def = self._proto, $scope = self._scope, $a, TMP_10, TMP_11, TMP_12;

    def["native"] = nil;
    self.$include((($a = $scope.Native) == null ? $opal.cm('Native') : $a));

    $opal.defn(self, '$==', function(other) {
      var $a, self = this;

      return self["native"] === (($a = $scope.Native) == null ? $opal.cm('Native') : $a).$try_convert(other);
    });

    $opal.defn(self, '$has_key?', function(name) {
      var self = this;

      return $opal.hasOwnProperty.call(self["native"], name);
    });

    $opal.defn(self, '$key?', def['$has_key?']);

    $opal.defn(self, '$include?', def['$has_key?']);

    $opal.defn(self, '$member?', def['$has_key?']);

    $opal.defn(self, '$each', TMP_10 = function(args) {
      var $a, self = this, $iter = TMP_10._p, $yield = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_10._p = null;
      if (($yield !== nil)) {
        
        for (var key in self["native"]) {
          ((($a = $opal.$yieldX($yield, [key, self["native"][key]])) === $breaker) ? $breaker.$v : $a)
        }
      ;
        return self;
        } else {
        return ($a = self).$method_missing.apply($a, ["each"].concat(args))
      };
    });

    $opal.defn(self, '$[]', function(key) {
      var $a, self = this;

      
      var prop = self["native"][key];

      if (prop instanceof Function) {
        return prop;
      }
      else {
        return (($a = $opal.Object._scope.Native) == null ? $opal.cm('Native') : $a).$call(self["native"], key)
      }
    ;
    });

    $opal.defn(self, '$[]=', function(key, value) {
      var $a, self = this, native$ = nil;

      native$ = (($a = $scope.Native) == null ? $opal.cm('Native') : $a).$try_convert(value);
      if ((($a = native$ === nil) !== nil && (!$a._isBoolean || $a == true))) {
        return self["native"][key] = value;
        } else {
        return self["native"][key] = native$;
      };
    });

    $opal.defn(self, '$merge!', function(other) {
      var $a, self = this;

      
      var other = (($a = $scope.Native) == null ? $opal.cm('Native') : $a).$convert(other);

      for (var prop in other) {
        self["native"][prop] = other[prop];
      }
    ;
      return self;
    });

    $opal.defn(self, '$respond_to?', function(name, include_all) {
      var $a, self = this;

      if (include_all == null) {
        include_all = false
      }
      return (($a = $scope.Kernel) == null ? $opal.cm('Kernel') : $a).$instance_method("respond_to?").$bind(self).$call(name, include_all);
    });

    $opal.defn(self, '$respond_to_missing?', function(name) {
      var self = this;

      return $opal.hasOwnProperty.call(self["native"], name);
    });

    $opal.defn(self, '$method_missing', TMP_11 = function(mid, args) {
      var $a, $b, $c, self = this, $iter = TMP_11._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_11._p = null;
      
      if (mid.charAt(mid.length - 1) === '=') {
        return self['$[]='](mid.$slice(0, mid.$length()['$-'](1)), args['$[]'](0));
      }
      else {
        return ($a = ($b = (($c = $opal.Object._scope.Native) == null ? $opal.cm('Native') : $c)).$call, $a._p = block.$to_proc(), $a).apply($b, [self["native"], mid].concat(args));
      }
    ;
    });

    $opal.defn(self, '$nil?', function() {
      var self = this;

      return false;
    });

    $opal.defn(self, '$is_a?', function(klass) {
      var self = this;

      return $opal.is_a(self, klass);
    });

    $opal.defn(self, '$kind_of?', def['$is_a?']);

    $opal.defn(self, '$instance_of?', function(klass) {
      var self = this;

      return self._klass === klass;
    });

    $opal.defn(self, '$class', function() {
      var self = this;

      return self._klass;
    });

    $opal.defn(self, '$to_a', TMP_12 = function(options) {
      var $a, $b, $c, $d, self = this, $iter = TMP_12._p, block = $iter || nil;

      if (options == null) {
        options = $hash2([], {})
      }
      TMP_12._p = null;
      return ($a = ($b = (($c = ((($d = $scope.Native) == null ? $opal.cm('Native') : $d))._scope).Array == null ? $c.cm('Array') : $c.Array)).$new, $a._p = block.$to_proc(), $a).call($b, self["native"], options).$to_a();
    });

    return ($opal.defn(self, '$inspect', function() {
      var self = this;

      return "#<Native:" + (String(self["native"])) + ">";
    }), nil) && 'inspect';
  })((($a = $scope.Native) == null ? $opal.cm('Native') : $a), (($a = $scope.BasicObject) == null ? $opal.cm('BasicObject') : $a));
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self._proto, $scope = self._scope, $a, TMP_13, TMP_14;

    def.named = def["native"] = def.get = def.block = def.set = def.length = nil;
    self.$include((($a = $scope.Native) == null ? $opal.cm('Native') : $a));

    self.$include((($a = $scope.Enumerable) == null ? $opal.cm('Enumerable') : $a));

    def.$initialize = TMP_13 = function(native$, options) {
      var $a, self = this, $iter = TMP_13._p, block = $iter || nil;

      if (options == null) {
        options = $hash2([], {})
      }
      TMP_13._p = null;
      $opal.find_super_dispatcher(self, 'initialize', TMP_13, null).apply(self, [native$]);
      self.get = ((($a = options['$[]']("get")) !== false && $a !== nil) ? $a : options['$[]']("access"));
      self.named = options['$[]']("named");
      self.set = ((($a = options['$[]']("set")) !== false && $a !== nil) ? $a : options['$[]']("access"));
      self.length = ((($a = options['$[]']("length")) !== false && $a !== nil) ? $a : "length");
      self.block = block;
      if ((($a = self.$length() == null) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "no length found on the array-like object")
        } else {
        return nil
      };
    };

    def.$each = TMP_14 = function() {
      var self = this, $iter = TMP_14._p, block = $iter || nil;

      TMP_14._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each")
      };
      
      for (var i = 0, length = self.$length(); i < length; i++) {
        var value = $opal.$yield1(block, self['$[]'](i));

        if (value === $breaker) {
          return $breaker.$v;
        }
      }
    ;
      return self;
    };

    def['$[]'] = function(index) {
      var $a, self = this, result = nil, $case = nil;

      result = (function() {$case = index;if ((($a = $scope.String) == null ? $opal.cm('String') : $a)['$===']($case) || (($a = $scope.Symbol) == null ? $opal.cm('Symbol') : $a)['$===']($case)) {if ((($a = self.named) !== nil && (!$a._isBoolean || $a == true))) {
        return self["native"][self.named](index);
        } else {
        return self["native"][index];
      }}else if ((($a = $scope.Integer) == null ? $opal.cm('Integer') : $a)['$===']($case)) {if ((($a = self.get) !== nil && (!$a._isBoolean || $a == true))) {
        return self["native"][self.get](index);
        } else {
        return self["native"][index];
      }}else { return nil }})();
      if (result !== false && result !== nil) {
        if ((($a = self.block) !== nil && (!$a._isBoolean || $a == true))) {
          return self.block.$call(result)
          } else {
          return self.$Native(result)
        }
        } else {
        return nil
      };
    };

    def['$[]='] = function(index, value) {
      var $a, self = this;

      if ((($a = self.set) !== nil && (!$a._isBoolean || $a == true))) {
        return self["native"][self.set](index, (($a = $scope.Native) == null ? $opal.cm('Native') : $a).$convert(value));
        } else {
        return self["native"][index] = (($a = $scope.Native) == null ? $opal.cm('Native') : $a).$convert(value);
      };
    };

    def.$last = function(count) {
      var $a, self = this, index = nil, result = nil;

      if (count == null) {
        count = nil
      }
      if (count !== false && count !== nil) {
        index = self.$length()['$-'](1);
        result = [];
        while (index['$>='](0)) {
        result['$<<'](self['$[]'](index));
        index = index['$-'](1);};
        return result;
        } else {
        return self['$[]'](self.$length()['$-'](1))
      };
    };

    def.$length = function() {
      var self = this;

      return self["native"][self.length];
    };

    $opal.defn(self, '$to_ary', def.$to_a);

    return (def.$inspect = function() {
      var self = this;

      return self.$to_a().$inspect();
    }, nil) && 'inspect';
  })((($a = $scope.Native) == null ? $opal.cm('Native') : $a), null);
  (function($base, $super) {
    function $Numeric(){};
    var self = $Numeric = $klass($base, $super, 'Numeric', $Numeric);

    var def = self._proto, $scope = self._scope;

    return (def.$to_n = function() {
      var self = this;

      return self.valueOf();
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Proc(){};
    var self = $Proc = $klass($base, $super, 'Proc', $Proc);

    var def = self._proto, $scope = self._scope;

    return (def.$to_n = function() {
      var self = this;

      return self;
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self._proto, $scope = self._scope;

    return (def.$to_n = function() {
      var self = this;

      return self.valueOf();
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Regexp(){};
    var self = $Regexp = $klass($base, $super, 'Regexp', $Regexp);

    var def = self._proto, $scope = self._scope;

    return (def.$to_n = function() {
      var self = this;

      return self.valueOf();
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $MatchData(){};
    var self = $MatchData = $klass($base, $super, 'MatchData', $MatchData);

    var def = self._proto, $scope = self._scope;

    def.matches = nil;
    return (def.$to_n = function() {
      var self = this;

      return self.matches;
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Struct(){};
    var self = $Struct = $klass($base, $super, 'Struct', $Struct);

    var def = self._proto, $scope = self._scope;

    def.$initialize = function(args) {
      var $a, $b, TMP_15, $c, TMP_16, self = this, object = nil;

      args = $slice.call(arguments, 0);
      if ((($a = (($b = args.$length()['$=='](1)) ? self['$native?'](args['$[]'](0)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        object = args['$[]'](0);
        return ($a = ($b = self.$members()).$each, $a._p = (TMP_15 = function(name){var self = TMP_15._s || this;
if (name == null) name = nil;
        return self.$instance_variable_set("@" + (name), self.$Native(object[name]))}, TMP_15._s = self, TMP_15), $a).call($b);
        } else {
        return ($a = ($c = self.$members()).$each_with_index, $a._p = (TMP_16 = function(name, index){var self = TMP_16._s || this;
if (name == null) name = nil;if (index == null) index = nil;
        return self.$instance_variable_set("@" + (name), args['$[]'](index))}, TMP_16._s = self, TMP_16), $a).call($c)
      };
    };

    return (def.$to_n = function() {
      var $a, $b, TMP_17, self = this, result = nil;

      result = {};
      ($a = ($b = self).$each_pair, $a._p = (TMP_17 = function(name, value){var self = TMP_17._s || this;
if (name == null) name = nil;if (value == null) value = nil;
      return result[name] = value.$to_n();}, TMP_17._s = self, TMP_17), $a).call($b);
      return result;
    }, nil) && 'to_n';
  })(self, null);
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self._proto, $scope = self._scope;

    return (def.$to_n = function() {
      var self = this;

      
      var result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        var obj = self[i];

        if ((obj)['$respond_to?']("to_n")) {
          result.push((obj).$to_n());
        }
        else {
          result.push(obj);
        }
      }

      return result;
    ;
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Boolean(){};
    var self = $Boolean = $klass($base, $super, 'Boolean', $Boolean);

    var def = self._proto, $scope = self._scope;

    return (def.$to_n = function() {
      var self = this;

      return self.valueOf();
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Time(){};
    var self = $Time = $klass($base, $super, 'Time', $Time);

    var def = self._proto, $scope = self._scope;

    return (def.$to_n = function() {
      var self = this;

      return self;
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $NilClass(){};
    var self = $NilClass = $klass($base, $super, 'NilClass', $NilClass);

    var def = self._proto, $scope = self._scope;

    return (def.$to_n = function() {
      var self = this;

      return null;
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Hash(){};
    var self = $Hash = $klass($base, $super, 'Hash', $Hash);

    var def = self._proto, $scope = self._scope, TMP_18;

    def.$initialize = TMP_18 = function(defaults) {
      var $a, self = this, $iter = TMP_18._p, block = $iter || nil;

      TMP_18._p = null;
      
      if (defaults != null) {
        if (defaults.constructor === Object) {
          var map  = self.map,
              keys = self.keys;

          for (var key in defaults) {
            var value = defaults[key];

            if (value && value.constructor === Object) {
              map[key] = (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a).$new(value);
            }
            else {
              map[key] = self.$Native(defaults[key]);
            }

            keys.push(key);
          }
        }
        else {
          self.none = defaults;
        }
      }
      else if (block !== nil) {
        self.proc = block;
      }

      return self;
    
    };

    return (def.$to_n = function() {
      var self = this;

      
      var result = {},
          keys   = self.keys,
          map    = self.map,
          bucket,
          value;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i],
            obj = map[key];

        if ((obj)['$respond_to?']("to_n")) {
          result[key] = (obj).$to_n();
        }
        else {
          result[key] = obj;
        }
      }

      return result;
    ;
    }, nil) && 'to_n';
  })(self, null);
  (function($base, $super) {
    function $Module(){};
    var self = $Module = $klass($base, $super, 'Module', $Module);

    var def = self._proto, $scope = self._scope;

    return (def.$native_module = function() {
      var self = this;

      return Opal.global[self.$name()] = self;
    }, nil) && 'native_module'
  })(self, null);
  (function($base, $super) {
    function $Class(){};
    var self = $Class = $klass($base, $super, 'Class', $Class);

    var def = self._proto, $scope = self._scope;

    def.$native_alias = function(jsid, mid) {
      var self = this;

      return self._proto[jsid] = self._proto['$' + mid];
    };

    return $opal.defn(self, '$native_class', def.$native_module);
  })(self, null);
  return $gvars.$ = $gvars.global = self.$Native(Opal.global);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/native.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$attr_reader', '$expose', '$alias_native', '$[]=', '$nil?', '$is_a?', '$to_n', '$has_key?', '$delete', '$call', '$gsub', '$upcase', '$[]', '$compact', '$map', '$respond_to?', '$<<', '$Native', '$new']);
  ;
  
  var root = $opal.global, dom_class;

  if (root.jQuery) {
    dom_class = jQuery
  }
  else if (root.Zepto) {
    dom_class = Zepto.zepto.Z;
  }
  else {
    throw new Error("jQuery must be included before opal-jquery");
  }

  return (function($base, $super) {
    function $Element(){};
    var self = $Element = $klass($base, $super, 'Element', $Element);

    var def = self._proto, $scope = self._scope, $a, TMP_1, TMP_2, TMP_5, TMP_6;

    self.$include((($a = $scope.Enumerable) == null ? $opal.cm('Enumerable') : $a));

    $opal.defs(self, '$find', function(selector) {
      var self = this;

      return $(selector);
    });

    $opal.defs(self, '$[]', function(selector) {
      var self = this;

      return $(selector);
    });

    $opal.defs(self, '$id', function(id) {
      var self = this;

      
      var el = document.getElementById(id);

      if (!el) {
        return nil;
      }

      return $(el);
    
    });

    $opal.defs(self, '$new', function(tag) {
      var self = this;

      if (tag == null) {
        tag = "div"
      }
      return $(document.createElement(tag));
    });

    $opal.defs(self, '$parse', function(str) {
      var self = this;

      return $(str);
    });

    $opal.defs(self, '$expose', function(methods) {
      var self = this;

      methods = $slice.call(arguments, 0);
      
      for (var i = 0, length = methods.length, method; i < length; i++) {
        method = methods[i];
        self._proto['$' + method] = self._proto[method];
      }

      return nil;
    
    });

    self.$attr_reader("selector");

    self.$expose("after", "before", "parent", "parents", "prepend", "prev", "remove");

    self.$expose("hide", "show", "toggle", "children", "blur", "closest", "detach");

    self.$expose("focus", "find", "next", "siblings", "text", "trigger", "append");

    self.$expose("height", "width", "serialize", "is", "filter", "last", "first");

    self.$expose("wrap", "stop", "clone", "empty");

    self.$expose("get", "attr", "prop");

    $opal.defn(self, '$succ', def.$next);

    $opal.defn(self, '$<<', def.$append);

    self.$alias_native("[]=", "attr");

    self.$alias_native("add_class", "addClass");

    self.$alias_native("append_to", "appendTo");

    self.$alias_native("has_class?", "hasClass");

    self.$alias_native("html=", "html");

    self.$alias_native("remove_attr", "removeAttr");

    self.$alias_native("remove_class", "removeClass");

    self.$alias_native("text=", "text");

    self.$alias_native("toggle_class", "toggleClass");

    self.$alias_native("value=", "val");

    self.$alias_native("scroll_left=", "scrollLeft");

    self.$alias_native("scroll_left", "scrollLeft");

    self.$alias_native("remove_attribute", "removeAttr");

    self.$alias_native("slide_down", "slideDown");

    self.$alias_native("slide_up", "slideUp");

    self.$alias_native("slide_toggle", "slideToggle");

    self.$alias_native("fade_toggle", "fadeToggle");

    def.$to_n = function() {
      var self = this;

      return self;
    };

    def['$[]'] = function(name) {
      var self = this;

      return self.attr(name) || "";
    };

    def.$add_attribute = function(name) {
      var self = this;

      return self['$[]='](name, "");
    };

    def['$has_attribute?'] = function(name) {
      var self = this;

      return !!self.attr(name);
    };

    def.$append_to_body = function() {
      var self = this;

      return self.appendTo(document.body);
    };

    def.$append_to_head = function() {
      var self = this;

      return self.appendTo(document.head);
    };

    def.$at = function(index) {
      var self = this;

      
      var length = self.length;

      if (index < 0) {
        index += length;
      }

      if (index < 0 || index >= length) {
        return nil;
      }

      return $(self[index]);
    
    };

    def.$class_name = function() {
      var self = this;

      
      var first = self[0];
      return (first && first.className) || "";
    
    };

    def['$class_name='] = function(name) {
      var self = this;

      
      for (var i = 0, length = self.length; i < length; i++) {
        self[i].className = name;
      }
    
      return self;
    };

    def.$css = function(name, value) {
      var $a, $b, $c, self = this;

      if (value == null) {
        value = nil
      }
      if ((($a = ($b = value['$nil?'](), $b !== false && $b !== nil ?name['$is_a?']((($c = $scope.String) == null ? $opal.cm('String') : $c)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return self.css(name)
      } else if ((($a = name['$is_a?']((($b = $scope.Hash) == null ? $opal.cm('Hash') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
        self.css(name.$to_n());
        } else {
        self.css(name, value);
      };
      return self;
    };

    def.$animate = TMP_1 = function(params) {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil, speed = nil;

      TMP_1._p = null;
      speed = (function() {if ((($a = params['$has_key?']("speed")) !== nil && (!$a._isBoolean || $a == true))) {
        return params.$delete("speed")
        } else {
        return 400
      }; return nil; })();
      
      self.animate(params.$to_n(), speed, function() {
        (function() {if ((block !== nil)) {
        return block.$call()
        } else {
        return nil
      }; return nil; })()
      })
    ;
    };

    def.$data = function(args) {
      var self = this;

      args = $slice.call(arguments, 0);
      
      var result = self.data.apply(self, args);
      return result == null ? nil : result;
    
    };

    def.$effect = TMP_2 = function(name, args) {
      var $a, $b, TMP_3, $c, TMP_4, self = this, $iter = TMP_2._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_2._p = null;
      name = ($a = ($b = name).$gsub, $a._p = (TMP_3 = function(match){var self = TMP_3._s || this;
if (match == null) match = nil;
      return match['$[]'](1).$upcase()}, TMP_3._s = self, TMP_3), $a).call($b, /_\w/);
      args = ($a = ($c = args).$map, $a._p = (TMP_4 = function(a){var self = TMP_4._s || this, $a;
if (a == null) a = nil;
      if ((($a = a['$respond_to?']("to_n")) !== nil && (!$a._isBoolean || $a == true))) {
          return a.$to_n()
          } else {
          return nil
        }}, TMP_4._s = self, TMP_4), $a).call($c).$compact();
      args['$<<'](function() { (function() {if ((block !== nil)) {
        return block.$call()
        } else {
        return nil
      }; return nil; })() });
      return self[name].apply(self, args);
    };

    def['$visible?'] = function() {
      var self = this;

      return self.is(':visible');
    };

    def.$offset = function() {
      var self = this;

      return self.$Native(self.offset());
    };

    def.$each = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, $yield = $iter || nil;

      TMP_5._p = null;
      for (var i = 0, length = self.length; i < length; i++) {
      if ($opal.$yield1($yield, $(self[i])) === $breaker) return $breaker.$v;
      };
      return self;
    };

    def.$first = function() {
      var self = this;

      return self.length ? self.first() : nil;
    };

    def.$html = function(content) {
      var self = this;

      
      if (content != null) {
        return self.html(content);
      }

      return self.html() || '';
    
    };

    def.$id = function() {
      var self = this;

      
      var first = self[0];
      return (first && first.id) || "";
    
    };

    def['$id='] = function(id) {
      var self = this;

      
      var first = self[0];

      if (first) {
        first.id = id;
      }

      return self;
    
    };

    def.$tag_name = function() {
      var self = this;

      return self.length > 0 ? self[0].tagName.toLowerCase() : nil;
    };

    def.$inspect = function() {
      var self = this;

      
      var val, el, str, result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        el  = self[i];
        str = "<" + el.tagName.toLowerCase();

        if (val = el.id) str += (' id="' + val + '"');
        if (val = el.className) str += (' class="' + val + '"');

        result.push(str + '>');
      }

      return '#<Element [' + result.join(', ') + ']>';
    
    };

    def.$length = function() {
      var self = this;

      return self.length;
    };

    def['$any?'] = function() {
      var self = this;

      return self.length > 0;
    };

    def['$empty?'] = function() {
      var self = this;

      return self.length === 0;
    };

    $opal.defn(self, '$empty?', def['$none?']);

    def.$on = TMP_6 = function(name, sel) {
      var $a, self = this, $iter = TMP_6._p, block = $iter || nil;

      if (sel == null) {
        sel = nil
      }
      TMP_6._p = null;
      
      var wrapper = function(evt) {
        if (evt.preventDefault) {
          evt = (($a = $scope.Event) == null ? $opal.cm('Event') : $a).$new(evt);
        }

        return block.apply(null, arguments);
      };

      block._jq_wrap = wrapper;

      if (sel == nil) {
        self.on(name, wrapper);
      }
      else {
        self.on(name, sel, wrapper);
      }
    ;
      return block;
    };

    def.$off = function(name, sel, block) {
      var self = this;

      if (block == null) {
        block = nil
      }
      
      if (sel == null) {
        return self.off(name);
      }
      else if (block === nil) {
        return self.off(name, sel._jq_wrap);
      }
      else {
        return self.off(name, sel, block._jq_wrap);
      }
    
    };

    $opal.defn(self, '$size', def.$length);

    return (def.$value = function() {
      var self = this;

      return self.val() || "";
    }, nil) && 'value';
  })(self, dom_class);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-jquery/element.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $gvars = $opal.gvars;

  $opal.add_stubs(['$find']);
  ;
  $opal.cdecl($scope, 'Window', (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find(window));
  return $gvars.window = (($a = $scope.Window) == null ? $opal.cm('Window') : $a);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-jquery/window.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $gvars = $opal.gvars;

  $opal.add_stubs(['$find']);
  ;
  $opal.cdecl($scope, 'Document', (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find(document));
  (function(self) {
    var $scope = self._scope, def = self._proto;

    self._proto['$ready?'] = TMP_1 = function() {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if (block !== false && block !== nil) {
        return $(block);
        } else {
        return nil
      };
    };
    self._proto.$title = function() {
      var self = this;

      return document.title;
    };
    self._proto['$title='] = function(title) {
      var self = this;

      return document.title = title;
    };
    self._proto.$head = function() {
      var $a, self = this;

      return (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find(document.head);
    };
    return (self._proto.$body = function() {
      var $a, self = this;

      return (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find(document.body);
    }, nil) && 'body';
  })((($a = $scope.Document) == null ? $opal.cm('Document') : $a).$singleton_class());
  return $gvars.document = (($a = $scope.Document) == null ? $opal.cm('Document') : $a);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-jquery/document.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$stop', '$prevent']);
  return (function($base, $super) {
    function $Event(){};
    var self = $Event = $klass($base, $super, 'Event', $Event);

    var def = self._proto, $scope = self._scope;

    def["native"] = nil;
    def.$initialize = function(native$) {
      var self = this;

      return self["native"] = native$;
    };

    def['$[]'] = function(name) {
      var self = this;

      return self["native"][name];
    };

    def.$type = function() {
      var self = this;

      return self["native"].type;
    };

    def.$current_target = function() {
      var self = this;

      return $(self["native"].currentTarget);
    };

    def.$target = function() {
      var self = this;

      return $(self["native"].target);
    };

    def['$prevented?'] = function() {
      var self = this;

      return self["native"].isDefaultPrevented();
    };

    def.$prevent = function() {
      var self = this;

      return self["native"].preventDefault();
    };

    def['$stopped?'] = function() {
      var self = this;

      return self["native"].propagationStopped();
    };

    def.$stop = function() {
      var self = this;

      return self["native"].stopPropagation();
    };

    def.$stop_immediate = function() {
      var self = this;

      return self["native"].stopImmediatePropagation();
    };

    def.$kill = function() {
      var self = this;

      self.$stop();
      return self.$prevent();
    };

    $opal.defn(self, '$default_prevented?', def['$prevented?']);

    $opal.defn(self, '$prevent_default', def.$prevent);

    $opal.defn(self, '$propagation_stopped?', def['$stopped?']);

    $opal.defn(self, '$stop_propagation', def.$stop);

    $opal.defn(self, '$stop_immediate_propagation', def.$stop_immediate);

    def.$page_x = function() {
      var self = this;

      return self["native"].pageX;
    };

    def.$page_y = function() {
      var self = this;

      return self["native"].pageY;
    };

    def.$touch_x = function() {
      var self = this;

      return self["native"].originalEvent.touches[0].pageX;
    };

    def.$touch_y = function() {
      var self = this;

      return self["native"].originalEvent.touches[0].pageY;
    };

    def.$ctrl_key = function() {
      var self = this;

      return self["native"].ctrlKey;
    };

    def.$key_code = function() {
      var self = this;

      return self["native"].keyCode;
    };

    return (def.$which = function() {
      var self = this;

      return self["native"].which;
    }, nil) && 'which';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-jquery/event.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $hash2 = $opal.hash2, $klass = $opal.klass;

  $opal.add_stubs(['$new', '$push', '$[]=', '$[]', '$create_id', '$json_create', '$attr_accessor', '$create_id=', '$===', '$parse', '$generate', '$from_object', '$to_json', '$responds_to?', '$to_io', '$write', '$to_s', '$strftime']);
  (function($base) {
    var self = $module($base, 'JSON');

    var def = self._proto, $scope = self._scope, $a;

    
    var $parse  = JSON.parse,
        $hasOwn = Opal.hasOwnProperty;

    function to_opal(value, options) {
      switch (typeof value) {
        case 'string':
          return value;

        case 'number':
          return value;

        case 'boolean':
          return !!value;

        case 'null':
          return nil;

        case 'object':
          if (!value) return nil;

          if (value._isArray) {
            var arr = (options.array_class).$new();

            for (var i = 0, ii = value.length; i < ii; i++) {
              (arr).$push(to_opal(value[i], options));
            }

            return arr;
          }
          else {
            var hash = (options.object_class).$new();

            for (var k in value) {
              if ($hasOwn.call(value, k)) {
                (hash)['$[]='](k, to_opal(value[k], options));
              }
            }

            var klass;
            if ((klass = (hash)['$[]']((($a = $scope.JSON) == null ? $opal.cm('JSON') : $a).$create_id())) != nil) {
              klass = Opal.cget(klass);
              return (klass).$json_create(hash);
            }
            else {
              return hash;
            }
          }
      }
    };
  

    (function(self) {
      var $scope = self._scope, def = self._proto;

      return self.$attr_accessor("create_id")
    })(self.$singleton_class());

    self['$create_id=']("json_class");

    $opal.defs(self, '$[]', function(value, options) {
      var $a, $b, self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      if ((($a = (($b = $scope.String) == null ? $opal.cm('String') : $b)['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$parse(value, options)
        } else {
        return self.$generate(value, options)
      };
    });

    $opal.defs(self, '$parse', function(source, options) {
      var self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      return self.$from_object($parse(source), options);
    });

    $opal.defs(self, '$parse!', function(source, options) {
      var self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      return self.$parse(source, options);
    });

    $opal.defs(self, '$from_object', function(js_object, options) {
      var $a, $b, $c, $d, self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      ($a = "object_class", $b = options, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, (($d = $scope.Hash) == null ? $opal.cm('Hash') : $d))));
      ($a = "array_class", $b = options, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, (($d = $scope.Array) == null ? $opal.cm('Array') : $d))));
      return to_opal(js_object, options.map);
    });

    $opal.defs(self, '$generate', function(obj, options) {
      var self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      return obj.$to_json(options);
    });

    $opal.defs(self, '$dump', function(obj, io, limit) {
      var $a, self = this, string = nil;

      if (io == null) {
        io = nil
      }
      if (limit == null) {
        limit = nil
      }
      string = self.$generate(obj);
      if (io !== false && io !== nil) {
        if ((($a = io['$responds_to?']("to_io")) !== nil && (!$a._isBoolean || $a == true))) {
          io = io.$to_io()};
        io.$write(string);
        return io;
        } else {
        return string
      };
    });
    
  })(self);
  (function($base, $super) {
    function $Object(){};
    var self = $Object = $klass($base, $super, 'Object', $Object);

    var def = self._proto, $scope = self._scope;

    return ($opal.defn(self, '$to_json', function() {
      var self = this;

      return self.$to_s().$to_json();
    }), nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self._proto, $scope = self._scope;

    return (def.$to_json = function() {
      var self = this;

      
      var result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        result.push((self[i]).$to_json());
      }

      return '[' + result.join(', ') + ']';
    
    }, nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $Boolean(){};
    var self = $Boolean = $klass($base, $super, 'Boolean', $Boolean);

    var def = self._proto, $scope = self._scope;

    return (def.$to_json = function() {
      var self = this;

      return (self == true) ? 'true' : 'false';
    }, nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $Hash(){};
    var self = $Hash = $klass($base, $super, 'Hash', $Hash);

    var def = self._proto, $scope = self._scope;

    return (def.$to_json = function() {
      var self = this;

      
      var inspect = [], keys = self.keys, map = self.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];
        inspect.push((key).$to_s().$to_json() + ':' + (map[key]).$to_json());
      }

      return '{' + inspect.join(', ') + '}';
    ;
    }, nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $NilClass(){};
    var self = $NilClass = $klass($base, $super, 'NilClass', $NilClass);

    var def = self._proto, $scope = self._scope;

    return (def.$to_json = function() {
      var self = this;

      return "null";
    }, nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $Numeric(){};
    var self = $Numeric = $klass($base, $super, 'Numeric', $Numeric);

    var def = self._proto, $scope = self._scope;

    return (def.$to_json = function() {
      var self = this;

      return self.toString();
    }, nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self._proto, $scope = self._scope;

    return $opal.defn(self, '$to_json', def.$inspect)
  })(self, null);
  (function($base, $super) {
    function $Time(){};
    var self = $Time = $klass($base, $super, 'Time', $Time);

    var def = self._proto, $scope = self._scope;

    return (def.$to_json = function() {
      var self = this;

      return self.$strftime("%FT%T%z").$to_json();
    }, nil) && 'to_json'
  })(self, null);
  return (function($base, $super) {
    function $Date(){};
    var self = $Date = $klass($base, $super, 'Date', $Date);

    var def = self._proto, $scope = self._scope;

    def.$to_json = function() {
      var self = this;

      return self.$to_s().$to_json();
    };

    return (def.$as_json = function() {
      var self = this;

      return self.$to_s();
    }, nil) && 'as_json';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/json.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $hash2 = $opal.hash2;

  $opal.add_stubs(['$attr_reader', '$send!', '$new', '$delete', '$to_n', '$from_object', '$succeed', '$fail', '$call', '$parse', '$xhr']);
  ;
  ;
  return (function($base, $super) {
    function $HTTP(){};
    var self = $HTTP = $klass($base, $super, 'HTTP', $HTTP);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6;

    def.errback = def.json = def.body = def.ok = def.settings = def.callback = nil;
    self.$attr_reader("body", "error_message", "method", "status_code", "url", "xhr");

    $opal.defs(self, '$get', TMP_1 = function(url, opts) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      if (opts == null) {
        opts = $hash2([], {})
      }
      TMP_1._p = null;
      return self.$new(url, "GET", opts, block)['$send!']();
    });

    $opal.defs(self, '$post', TMP_2 = function(url, opts) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      if (opts == null) {
        opts = $hash2([], {})
      }
      TMP_2._p = null;
      return self.$new(url, "POST", opts, block)['$send!']();
    });

    $opal.defs(self, '$put', TMP_3 = function(url, opts) {
      var self = this, $iter = TMP_3._p, block = $iter || nil;

      if (opts == null) {
        opts = $hash2([], {})
      }
      TMP_3._p = null;
      return self.$new(url, "PUT", opts, block)['$send!']();
    });

    $opal.defs(self, '$delete', TMP_4 = function(url, opts) {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      if (opts == null) {
        opts = $hash2([], {})
      }
      TMP_4._p = null;
      return self.$new(url, "DELETE", opts, block)['$send!']();
    });

    def.$initialize = function(url, method, options, handler) {
      var $a, self = this, http = nil, payload = nil, settings = nil;

      if (handler == null) {
        handler = nil
      }
      self.url = url;
      self.method = method;
      self.ok = true;
      self.xhr = nil;
      http = self;
      payload = options.$delete("payload");
      settings = options.$to_n();
      if (handler !== false && handler !== nil) {
        self.callback = self.errback = handler};
      
      if (typeof(payload) === 'string') {
        settings.data = payload;
      }
      else if (payload != nil) {
        settings.data = payload.$to_json();
        settings.contentType = 'application/json';
      }

      settings.url  = url;
      settings.type = method;

      settings.success = function(data, status, xhr) {
        http.body = data;
        http.xhr = xhr;
        http.status_code = xhr.status;

        if (typeof(data) === 'object') {
          http.json = (($a = $scope.JSON) == null ? $opal.cm('JSON') : $a).$from_object(data);
        }

        return http.$succeed();
      };

      settings.error = function(xhr, status, error) {
        http.body = xhr.responseText;
        http.xhr = xhr;
        http.status_code = xhr.status;

        return http.$fail();
      };
    
      return self.settings = settings;
    };

    def.$callback = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      self.callback = block;
      return self;
    };

    def.$errback = TMP_6 = function() {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      self.errback = block;
      return self;
    };

    def.$fail = function() {
      var $a, self = this;

      self.ok = false;
      if ((($a = self.errback) !== nil && (!$a._isBoolean || $a == true))) {
        return self.errback.$call(self)
        } else {
        return nil
      };
    };

    def.$json = function() {
      var $a, $b, self = this;

      return ((($a = self.json) !== false && $a !== nil) ? $a : (($b = $scope.JSON) == null ? $opal.cm('JSON') : $b).$parse(self.body));
    };

    def['$ok?'] = function() {
      var self = this;

      return self.ok;
    };

    def['$send!'] = function() {
      var self = this;

      $.ajax(self.settings);
      return self;
    };

    def.$succeed = function() {
      var $a, self = this;

      if ((($a = self.callback) !== nil && (!$a._isBoolean || $a == true))) {
        return self.callback.$call(self)
        } else {
        return nil
      };
    };

    return (def.$get_header = function(key) {
      var self = this;

      return self.$xhr().getResponseHeader(key);;
    }, nil) && 'get_header';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-jquery/http.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  $opal.add_stubs([]);
  return (function($base) {
    var self = $module($base, 'Kernel');

    var def = self._proto, $scope = self._scope;

    def.$alert = function(msg) {
      var self = this;

      alert(msg);
      return nil;
    }
        ;$opal.donate(self, ["$alert"]);
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-jquery/kernel.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice;

  $opal.add_stubs([]);
  ;
  ;
  ;
  ;
  ;
  return true;
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-jquery.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module;

  $opal.add_stubs(['$-', '$*', '$x', '$y', '$+', '$normalized?', '$normalize', '$acos', '$dot_product', '$calculate_each', '$sqrt', '$squared_distance', '$coerce', '$class', '$cross_product', '$angle_between', '$private', '$new', '$send']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self._proto, $scope = self._scope;

    return (function($base) {
      var self = $module($base, 'Calculations');

      var def = self._proto, $scope = self._scope;

      (function($base) {
        var self = $module($base, 'ClassMethods');

        var def = self._proto, $scope = self._scope;

        def.$cross_product = function(vector1, vector2) {
          var self = this;

          return vector1.$x()['$*'](vector2.$y())['$-'](vector1.$y()['$*'](vector2.$x()));
        };

        def.$dot_product = function(vector1, vector2) {
          var self = this;

          return vector1.$x()['$*'](vector2.$x())['$+'](vector1.$y()['$*'](vector2.$y()));
        };

        def.$angle_between = function(vector1, vector2) {
          var $a, self = this, one = nil, two = nil;

          one = (function() {if ((($a = vector1['$normalized?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return vector1
            } else {
            return vector1.$normalize()
          }; return nil; })();
          two = (function() {if ((($a = vector2['$normalized?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return vector2
            } else {
            return vector2.$normalize()
          }; return nil; })();
          return (($a = $scope.Math) == null ? $opal.cm('Math') : $a).$acos(self.$dot_product(one, two));
        };
                ;$opal.donate(self, ["$cross_product", "$dot_product", "$angle_between"]);
      })(self);

      def['$*'] = function(other) {
        var self = this;

        return self.$calculate_each("*", other);
      };

      def['$/'] = function(other) {
        var self = this;

        return self.$calculate_each("/", other);
      };

      def['$+'] = function(other) {
        var self = this;

        return self.$calculate_each("+", other);
      };

      def['$-'] = function(other) {
        var self = this;

        return self.$calculate_each("-", other);
      };

      def.$distance = function(other) {
        var $a, self = this;

        return (($a = $scope.Math) == null ? $opal.cm('Math') : $a).$sqrt(self.$squared_distance(other));
      };

      def.$squared_distance = function(other) {
        var $a, self = this, v = nil, _ = nil, dx = nil, dy = nil;

        $a = $opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        dx = v.$x()['$-'](self.$x());
        dy = v.$y()['$-'](self.$y());
        return dx['$*'](dx)['$+'](dy['$*'](dy));
      };

      def.$dot_product = function(other) {
        var $a, self = this, v = nil, _ = nil;

        $a = $opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        return self.$class().$dot_product(self, v);
      };

      def.$cross_product = function(other) {
        var $a, self = this, v = nil, _ = nil;

        $a = $opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        return self.$class().$cross_product(self, v);
      };

      def.$angle_between = function(other) {
        var $a, self = this, v = nil, _ = nil;

        $a = $opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        return self.$class().$angle_between(self, v);
      };

      self.$private();

      def.$calculate_each = function(method, other) {
        var $a, self = this, v = nil, _ = nil;

        $a = $opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        return self.$class().$new(self.$x().$send(method, v.$x()), self.$y().$send(method, v.$y()));
      };
            ;$opal.donate(self, ["$*", "$/", "$+", "$-", "$distance", "$squared_distance", "$dot_product", "$cross_product", "$angle_between", "$calculate_each"]);
    })(self)
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/vector2d/calculations.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module, $hash2 = $opal.hash2;

  $opal.add_stubs(['$===', '$parse', '$raise', '$class', '$x', '$y', '$new', '$to_i', '$to_f']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self._proto, $scope = self._scope;

    return (function($base) {
      var self = $module($base, 'Coercions');

      var def = self._proto, $scope = self._scope;

      def.$coerce = function(other) {
        var $a, self = this, $case = nil;

        return (function() {$case = other;if ((($a = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $a)['$===']($case)) {return [other, self]}else if ((($a = $scope.Array) == null ? $opal.cm('Array') : $a)['$===']($case) || (($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$===']($case) || (($a = $scope.String) == null ? $opal.cm('String') : $a)['$===']($case) || (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a)['$===']($case)) {return [(($a = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $a).$parse(other), self]}else {return self.$raise((($a = $scope.TypeError) == null ? $opal.cm('TypeError') : $a), "" + (self.$class()) + " can't be coerced into " + (other.$class()))}})();
      };

      def.$inspect = function() {
        var self = this;

        return "Vector2d(" + (self.$x()) + "," + (self.$y()) + ")";
      };

      def.$to_a = function() {
        var self = this;

        return [self.$x(), self.$y()];
      };

      def.$to_hash = function() {
        var self = this;

        return $hash2(["x", "y"], {"x": self.$x(), "y": self.$y()});
      };

      def.$to_i_vector = function() {
        var self = this;

        return self.$class().$new(self.$x().$to_i(), self.$y().$to_i());
      };

      def.$to_f_vector = function() {
        var self = this;

        return self.$class().$new(self.$x().$to_f(), self.$y().$to_f());
      };

      def.$to_s = function() {
        var self = this;

        return "" + (self.$x()) + "x" + (self.$y());
      };
            ;$opal.donate(self, ["$coerce", "$inspect", "$to_a", "$to_hash", "$to_i_vector", "$to_f_vector", "$to_s"]);
    })(self)
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/vector2d/coercions.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module;

  $opal.add_stubs(['$coerce', '$>', '$x', '$y', '$fit', '$/', '$to_f_vector', '$*', '$==', '$<', '$alias_method']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self._proto, $scope = self._scope;

    return (function($base) {
      var self = $module($base, 'Fitting');

      var def = self._proto, $scope = self._scope;

      def.$contain = function(other) {
        var $a, $b, self = this, v = nil, _ = nil;

        $a = $opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        if ((($a = (((($b = v.$x()['$>'](self.$x())) !== false && $b !== nil) ? $b : v.$y()['$>'](self.$y())))) !== nil && (!$a._isBoolean || $a == true))) {
          return other.$fit(self)
          } else {
          return other
        };
      };

      def.$fit = function(other) {
        var $a, $b, $c, self = this, v = nil, _ = nil, scale = nil;

        $a = $opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        scale = v.$to_f_vector()['$/'](self);
        return self['$*'](((function() {if ((($a = (((($b = scale.$y()['$=='](0)) !== false && $b !== nil) ? $b : ((($c = scale.$x()['$>'](0)) ? scale.$x()['$<'](scale.$y()) : $c))))) !== nil && (!$a._isBoolean || $a == true))) {
          return scale.$x()
          } else {
          return scale.$y()
        }; return nil; })()));
      };

      self.$alias_method("constrain_both", "fit");

      def.$fit_either = function(other) {
        var $a, $b, self = this, v = nil, _ = nil, scale = nil;

        $a = $opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        scale = v.$to_f_vector()['$/'](self);
        if ((($a = ((($b = scale.$x()['$>'](0)) ? scale.$y()['$>'](0) : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          scale = (function() {if ((($a = (scale.$x()['$<'](scale.$y()))) !== nil && (!$a._isBoolean || $a == true))) {
            return scale.$y()
            } else {
            return scale.$x()
          }; return nil; })();
          return self['$*'](scale);
          } else {
          return self.$fit(v)
        };
      };

      self.$alias_method("constrain_one", "fit_either");
            ;$opal.donate(self, ["$contain", "$fit", "$fit_either"]);
    })(self)
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/vector2d/fitting.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module;

  $opal.add_stubs(['$atan2', '$y', '$x', '$abs', '$/', '$to_f', '$sqrt', '$squared_length', '$+', '$*', '$==', '$length']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self._proto, $scope = self._scope;

    return (function($base) {
      var self = $module($base, 'Properties');

      var def = self._proto, $scope = self._scope;

      def.$angle = function() {
        var $a, self = this;

        return (($a = $scope.Math) == null ? $opal.cm('Math') : $a).$atan2(self.$y(), self.$x());
      };

      def.$aspect_ratio = function() {
        var self = this;

        return (self.$x().$to_f()['$/'](self.$y().$to_f())).$abs();
      };

      def.$length = function() {
        var $a, self = this;

        return (($a = $scope.Math) == null ? $opal.cm('Math') : $a).$sqrt(self.$squared_length());
      };

      def.$squared_length = function() {
        var self = this;

        return self.$x()['$*'](self.$x())['$+'](self.$y()['$*'](self.$y()));
      };

      def['$normalized?'] = function() {
        var self = this;

        return self.$length().$to_f()['$=='](1.0);
      };
            ;$opal.donate(self, ["$angle", "$aspect_ratio", "$length", "$squared_length", "$normalized?"]);
    })(self)
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/vector2d/properties.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module;

  $opal.add_stubs(['$new', '$class', '$ceil', '$x', '$y', '$floor', '$resize', '$-@', '$*', '$/', '$length', '$-', '$cos', '$sin', '$+', '$round', '$min']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self._proto, $scope = self._scope;

    return (function($base) {
      var self = $module($base, 'Transformations');

      var def = self._proto, $scope = self._scope;

      def.$ceil = function() {
        var self = this;

        return self.$class().$new(self.$x().$ceil(), self.$y().$ceil());
      };

      def.$floor = function() {
        var self = this;

        return self.$class().$new(self.$x().$floor(), self.$y().$floor());
      };

      def.$normalize = function() {
        var self = this;

        return self.$resize(1.0);
      };

      def.$perpendicular = function() {
        var $a, self = this;

        return (($a = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $a).$new(self.$y()['$-@'](), self.$x());
      };

      def.$resize = function(new_length) {
        var self = this;

        return self['$*']((new_length['$/'](self.$length())));
      };

      def.$reverse = function() {
        var self = this;

        return self.$class().$new(self.$x()['$-@'](), self.$y()['$-@']());
      };

      def.$rotate = function(angle) {
        var $a, self = this;

        return (($a = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $a).$new(self.$x()['$*']((($a = $scope.Math) == null ? $opal.cm('Math') : $a).$cos(angle))['$-'](self.$y()['$*']((($a = $scope.Math) == null ? $opal.cm('Math') : $a).$sin(angle))), self.$x()['$*']((($a = $scope.Math) == null ? $opal.cm('Math') : $a).$sin(angle))['$+'](self.$y()['$*']((($a = $scope.Math) == null ? $opal.cm('Math') : $a).$cos(angle))));
      };

      def.$round = function(digits) {
        var self = this;

        if (digits == null) {
          digits = 0
        }
        return self.$class().$new(self.$x().$round(digits), self.$y().$round(digits));
      };

      def.$truncate = function(max) {
        var self = this;

        return self.$resize([max, self.$length()].$min());
      };
            ;$opal.donate(self, ["$ceil", "$floor", "$normalize", "$perpendicular", "$resize", "$reverse", "$rotate", "$round", "$truncate"]);
    })(self)
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/vector2d/transformations.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs([]);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self._proto, $scope = self._scope;

    return $opal.cdecl($scope, 'VERSION', "2.1.0")
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/vector2d/version.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$extend', '$include', '$nil?', '$parse_single_arg', '$new', '$private', '$===', '$parse', '$parse_str', '$parse_hash', '$dup', '$has_key?', '$[]', '$[]=', '$=~', '$map', '$to_proc', '$split', '$raise', '$attr_reader', '$x', '$y']);
  ;
  ;
  ;
  ;
  ;
  ;
  (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self._proto, $scope = self._scope, $a, $b, $c;

    self.$extend((($a = ((($b = ((($c = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $c))._scope).Calculations == null ? $b.cm('Calculations') : $b.Calculations))._scope).ClassMethods == null ? $a.cm('ClassMethods') : $a.ClassMethods));

    self.$include((($a = ((($b = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $b))._scope).Calculations == null ? $a.cm('Calculations') : $a.Calculations));

    self.$include((($a = ((($b = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $b))._scope).Coercions == null ? $a.cm('Coercions') : $a.Coercions));

    self.$include((($a = ((($b = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $b))._scope).Fitting == null ? $a.cm('Fitting') : $a.Fitting));

    self.$include((($a = ((($b = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $b))._scope).Properties == null ? $a.cm('Properties') : $a.Properties));

    self.$include((($a = ((($b = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $b))._scope).Transformations == null ? $a.cm('Transformations') : $a.Transformations));

    (function(self) {
      var $scope = self._scope, def = self._proto;

      self._proto.$parse = function(arg, second_arg) {
        var $a, self = this;

        if (second_arg == null) {
          second_arg = nil
        }
        if ((($a = second_arg['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$parse_single_arg(arg)
          } else {
          return self.$new(arg, second_arg)
        };
      };
      self.$private();
      self._proto.$parse_single_arg = function(arg) {
        var $a, $b, self = this, $case = nil;

        return (function() {$case = arg;if ((($a = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $a)['$===']($case)) {return arg}else if ((($a = $scope.Array) == null ? $opal.cm('Array') : $a)['$===']($case)) {return ($a = self).$parse.apply($a, [].concat(arg))}else if ((($b = $scope.String) == null ? $opal.cm('String') : $b)['$===']($case)) {return self.$parse_str(arg)}else if ((($b = $scope.Hash) == null ? $opal.cm('Hash') : $b)['$===']($case)) {return self.$parse_hash(arg.$dup())}else {return self.$new(arg, arg)}})();
      };
      self._proto.$parse_hash = function(hash) {
        var $a, $b, $c, self = this;

        if ((($a = hash['$has_key?']("x")) !== nil && (!$a._isBoolean || $a == true))) {
          ($a = "x", $b = hash, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, hash['$[]']("x"))))};
        if ((($a = hash['$has_key?']("y")) !== nil && (!$a._isBoolean || $a == true))) {
          ($a = "y", $b = hash, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, hash['$[]']("y"))))};
        return self.$new(hash['$[]']("x"), hash['$[]']("y"));
      };
      return (self._proto.$parse_str = function(str) {
        var $a, $b, $c, self = this;

        if ((($a = str['$=~'](/^[\s]*[\d\.]*[\s]*x[\s]*[\d\.]*[\s]*$/)) !== nil && (!$a._isBoolean || $a == true))) {
          return ($a = self).$new.apply($a, [].concat(($b = ($c = str.$split("x")).$map, $b._p = "to_f".$to_proc(), $b).call($c)))
          } else {
          return self.$raise((($b = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $b), "not a valid string input")
        };
      }, nil) && 'parse_str';
    })(self.$singleton_class());

    self.$attr_reader("x", "y");

    def.$initialize = function(x, y) {
      var $a, self = this;

      return $a = [x, y], self.x = $a[0], self.y = $a[1];
    };

    return (def['$=='] = function(comp) {
      var $a, self = this;

      return ($a = comp.$x()['$==='](self.$x()), $a !== false && $a !== nil ?comp.$y()['$==='](self.$y()) : $a);
    }, nil) && '==';
  })(self, null);
  return ($opal.Object._proto.$Vector2d = function(args) {
    var $a, $b, self = this;

    args = $slice.call(arguments, 0);
    return ($a = (($b = $scope.Vector2d) == null ? $opal.cm('Vector2d') : $b)).$parse.apply($a, [].concat(args));
  }, nil) && 'Vector2d';
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/vector2d.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass;

  $opal.add_stubs(['$===', '$raise', '$type_error', '$to_f', '$log', '$include']);
  return (function($base) {
    var self = $module($base, 'Math');

    var def = self._proto, $scope = self._scope, $a;

    (function($base, $super) {
      function $DomainError(){};
      var self = $DomainError = $klass($base, $super, 'DomainError', $DomainError);

      var def = self._proto, $scope = self._scope, TMP_1;

      return ($opal.defs(self, '$new', TMP_1 = function(method) {
        var self = this, $iter = TMP_1._p, $yield = $iter || nil;

        TMP_1._p = null;
        return $opal.find_super_dispatcher(self, 'new', TMP_1, null, $DomainError).apply(self, ["Numerical argument is out of domain - \"" + (method) + "\""]);
      }), nil) && 'new'
    })(self, (($a = $scope.StandardError) == null ? $opal.cm('StandardError') : $a));

    $opal.cdecl($scope, 'E', Math.E);

    $opal.cdecl($scope, 'PI', Math.PI);

    def.$acos = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      x = x.$to_f();

      if (x < -1 || x > 1) {
        self.$raise((($a = $scope.DomainError) == null ? $opal.cm('DomainError') : $a), "acos");
      }

      return Math.acos(x);
    ;
    };

    if ((($a = (typeof(Math.acosh) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      } else {
      
      Math.acosh = function(x) {
        return Math.log(x + Math.sqrt(x * x - 1));
      }
    
    };

    def.$acosh = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.acosh(x.$to_f());
    ;
    };

    def.$asin = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      x = x.$to_f();

      if (x < -1 || x > 1) {
        self.$raise((($a = $scope.DomainError) == null ? $opal.cm('DomainError') : $a), "asin");
      }

      return Math.asin(x);
    ;
    };

    if ((($a = (typeof(Math.asinh) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      } else {
      
      Math.asinh = function(x) {
        return Math.log(x + Math.sqrt(x * x + 1))
      }
    ;
    };

    def.$asinh = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.asinh(x.$to_f());
    ;
    };

    def.$atan = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.atan(x.$to_f());
    ;
    };

    def.$atan2 = function(x, y) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](y)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(y, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.atan2(x.$to_f(), y.$to_f());
    ;
    };

    if ((($a = (typeof(Math.atanh) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      } else {
      
      Math.atanh = function(x) {
        return 0.5 * Math.log((1 + x) / (1 - x));
      }
    
    };

    def.$atanh = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      x = x.$to_f();

      if (x < -1 || x > 1) {
        self.$raise((($a = $scope.DomainError) == null ? $opal.cm('DomainError') : $a), "atanh");
      }

      return Math.atanh(x);
    ;
    };

    def.$cbrt = function(x) {
      var self = this;

      return Math.cbrt(x);
    };

    def.$cos = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.cos(x.$to_f());
    ;
    };

    if ((($a = (typeof(Math.cosh) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      } else {
      
      Math.cosh = function(x) {
        return (Math.exp(x) + Math.exp(-x)) / 2;
      }
    
    };

    def.$cosh = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.cosh(x.$to_f());
    ;
    };

    def.$erf = function(x) {
      var $a, self = this;

      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$erfc = function(x) {
      var $a, self = this;

      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$exp = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.exp(x.$to_f());
    ;
    };

    def.$frexp = function(x) {
      var $a, self = this;

      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$gamma = function(x) {
      var $a, self = this;

      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    if ((($a = (typeof(Math.hypot) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      } else {
      
      Math.hypot = function(x, y) {
        return Math.sqrt(x * x + y * y)
      }
    ;
    };

    def.$hypot = function(x, y) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](y)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(y, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.hypot(x.$to_f(), y.$to_f());
    ;
    };

    def.$ldexp = function(flt, int$) {
      var $a, self = this;

      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$lgamma = function(x) {
      var $a, self = this;

      return self.$raise((($a = $scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
    };

    def.$log = function(num, base, method) {
      var $a, self = this;

      if (base == null) {
        base = (($a = $scope.E) == null ? $opal.cm('E') : $a)
      }
      if (method == null) {
        method = nil
      }
      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](num)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(num, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](base)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(base, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      num  = num.$to_f();
      base = base.$to_f();

      if (num < 0) {
        self.$raise((($a = $scope.DomainError) == null ? $opal.cm('DomainError') : $a), ((($a = method) !== false && $a !== nil) ? $a : "log"));
      }

      num = Math.log(num);

      if (base != Math.E) {
        num /= Math.log(base);
      }

      return num
    ;
    };

    if ((($a = (typeof(Math.log10) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      def.$log10 = function(num) {
        var $a, self = this;

        
        if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](num)) {
          self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(num, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
        }

        num = num.$to_f();

        if (num < 0) {
          self.$raise((($a = $scope.DomainError) == null ? $opal.cm('DomainError') : $a), "log2");
        }

        return Math.log10(num);
      ;
      }
      } else {
      def.$log10 = function(num) {
        var self = this;

        return self.$log(num, 10, "log10");
      }
    };

    if ((($a = (typeof(Math.log2) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      def.$log2 = function(num) {
        var $a, self = this;

        
        if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](num)) {
          self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(num, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
        }

        num = num.$to_f();

        if (num < 0) {
          self.$raise((($a = $scope.DomainError) == null ? $opal.cm('DomainError') : $a), "log2");
        }

        return Math.log2(num);
      ;
      }
      } else {
      def.$log2 = function(num) {
        var self = this;

        return self.$log(num, 2, "log2");
      }
    };

    def.$sin = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.sin(x.$to_f());
    ;
    };

    if ((($a = (typeof(Math.sinh) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      } else {
      
      Math.sinh = function(x) {
        return (Math.exp(x) - Math.exp(-x)) / 2;
      }
    
    };

    def.$sinh = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.sinh(x.$to_f());
    ;
    };

    def.$sqrt = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      x = x.$to_f();

      if (x < 0) {
        self.$raise((($a = $scope.DomainError) == null ? $opal.cm('DomainError') : $a), "log2");
      }

      return Math.sqrt(x);
    ;
    };

    def.$tan = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.tan(x.$to_f());
    ;
    };

    if ((($a = (typeof(Math.tanh) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      } else {
      
      Math.tanh = function(x) {
        if (x == Infinity) {
          return 1;
        }
        else if (x == -Infinity) {
          return -1;
        }
        else {
          return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x));
        }
      }
    
    };

    def.$tanh = function(x) {
      var $a, self = this;

      
      if (!(($a = $scope.Numeric) == null ? $opal.cm('Numeric') : $a)['$==='](x)) {
        self.$raise((($a = $scope.Opal) == null ? $opal.cm('Opal') : $a).$type_error(x, (($a = $scope.Float) == null ? $opal.cm('Float') : $a)));
      }

      return Math.tanh(x.$to_f());
    ;
    };

    (function(self) {
      var $scope = self._scope, def = self._proto;

      return self.$include((($a = $scope.Math) == null ? $opal.cm('Math') : $a))
    })(self.$singleton_class());
        ;$opal.donate(self, ["$acos", "$acosh", "$asin", "$asinh", "$atan", "$atan2", "$atanh", "$cbrt", "$cos", "$cosh", "$erf", "$erfc", "$exp", "$frexp", "$gamma", "$hypot", "$ldexp", "$lgamma", "$log", "$log10", "$log10", "$log2", "$log2", "$sin", "$sinh", "$sqrt", "$tan", "$tanh"]);
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/math.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $hash2 = $opal.hash2;

  $opal.add_stubs(['$find', '$write', '$strftime', '$now', '$<<', '$[]', '$puts']);
  ;
  return (function($base, $super) {
    function $ConsoleLogger(){};
    var self = $ConsoleLogger = $klass($base, $super, 'ConsoleLogger', $ConsoleLogger);

    var def = self._proto, $scope = self._scope;

    def.console = nil;
    def.$initialize = function(element_id) {
      var $a, self = this;

      return self.console = (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find("#" + (element_id));
    };

    def.$error = function(msg) {
      var self = this;

      return self.$write("error", msg);
    };

    def.$warning = function(msg) {
      var self = this;

      return self.$write("warning", msg);
    };

    def.$info = function(msg) {
      var self = this;

      return self.$write("info", msg);
    };

    def.$debug = function(msg) {
      var self = this;

      return self.$write("debug", msg);
    };

    return (def.$write = function(type, msg) {
      var $a, self = this, icons = nil, time = nil;

      icons = $hash2(["error", "warning", "info", "debug"], {"error": "icon-error-alt", "warning": "icon-attention", "info": "icon-info-circled", "debug": "icon-minus-squared"});
      time = (($a = $scope.Time) == null ? $opal.cm('Time') : $a).$now().$strftime("%H:%M:%S");
      self.console['$<<']("<li class='" + (type) + "'><i class=\"" + (icons['$[]'](type)) + "\"><span class='time'>" + (time) + "</span><span class='msg'>" + (msg) + "</span></li>");
      self.console.parent().scrollTop(999999);
      return self.$puts(msg);
    }, nil) && 'write';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/consolelogger.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range, $gvars = $opal.gvars;

  $opal.add_stubs(['$attr_accessor', '$is_a?', '$raise', '$pitch', '$beat', '$duration', '$first_in_part', '$attr_reader', '$first', '$each', '$beat=', '$last', '$companion=', '$visible?', '$class', '$update_beats', '$<<', '$select', '$empty?', '$reject', '$notes', '$compact', '$flatten', '$map', '$[]', '$compact!', '$>', '$length', '$new', '$expanded_beat_maps', '$max', '$keys', '$last_beat', '$private', '$inject', '$[]=', '$+', '$index=', '$index', '$==', '$dotted', '$-', '$/', '$*', '$include', '$harpnote_options', '$beat_layout_policy', '$compute_beat_compression', '$values', '$<', '$warning', '$min', '$call', '$include?', '$layout_voice', '$each_with_index', '$voices', '$origin', '$build_synch_points', '$layout_note', '$meta_data', '$strftime', '$now', '$layout_playable', '$layout_newpart', '$to', '$nil?', '$first_in_part?', '$tie_end?', '$Vector2d', '$center', '$make_slur_path', '$push', '$error', '$tie_start?', '$slur_starts', '$slur_ends', '$policy', '$from', '$beat_maps', '$duration_to_id', '$to_json', '$layout_measure_start', '$layout_accord', '$layout_pause', '$sort_by', '$visible=', '$name', '$to_sym', '$reverse', '$rotate', '$angle', '$x', '$y']);
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Music');

      var def = self._proto, $scope = self._scope, $a;

      (function($base, $super) {
        function $MusicEntity(){};
        var self = $MusicEntity = $klass($base, $super, 'MusicEntity', $MusicEntity);

        var def = self._proto, $scope = self._scope;

        def.visible = nil;
        self.$attr_accessor("origin", "beat", "visible");

        def.$initialize = function() {
          var self = this;

          return self.visible = true;
        };

        return (def['$visible?'] = function() {
          var self = this;

          return self.visible;
        }, nil) && 'visible?';
      })(self, null);

      (function($base, $super) {
        function $NonPlayable(){};
        var self = $NonPlayable = $klass($base, $super, 'NonPlayable', $NonPlayable);

        var def = self._proto, $scope = self._scope;

        def.companion = nil;
        self.$attr_accessor("companion");

        def['$companion='] = function(companion) {
          var $a, $b, $c, $d, self = this;

          if ((($a = companion['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Music == null ? $c.cm('Music') : $c.Music))._scope).Playable == null ? $b.cm('Playable') : $b.Playable))) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$raise("Companion must be playable")
          };
          return self.companion = companion;
        };

        def.$pitch = function() {
          var self = this;

          return self.companion.$pitch();
        };

        def.$beat = function() {
          var self = this;

          return self.companion.$beat();
        };

        return (def.$duration = function() {
          var self = this;

          return self.companion.$duration();
        }, nil) && 'duration';
      })(self, (($a = $scope.MusicEntity) == null ? $opal.cm('MusicEntity') : $a));

      (function($base, $super) {
        function $Playable(){};
        var self = $Playable = $klass($base, $super, 'Playable', $Playable);

        var def = self._proto, $scope = self._scope, TMP_1;

        def.tie_end = def.tie_start = nil;
        self.$attr_accessor("first_in_part", "jump_starts", "jump_ends", "slur_starts", "slur_ends", "tie_start", "tie_end");

        def.$initialize = TMP_1 = function() {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_1._p, $yield = $iter || nil;

          TMP_1._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_1, $iter).apply(self, $zuper);
          self.slur_starts = [];
          self.slur_ends = [];
          self.tie_start = false;
          return self.tie_end = false;
        };

        def['$first_in_part?'] = function() {
          var self = this;

          return self.$first_in_part();
        };

        def['$tie_end?'] = function() {
          var self = this;

          return self.tie_end;
        };

        return (def['$tie_start?'] = function() {
          var self = this;

          return self.tie_start;
        }, nil) && 'tie_start?';
      })(self, (($a = $scope.MusicEntity) == null ? $opal.cm('MusicEntity') : $a));

      (function($base, $super) {
        function $Note(){};
        var self = $Note = $klass($base, $super, 'Note', $Note);

        var def = self._proto, $scope = self._scope, TMP_2;

        self.$attr_reader("pitch", "duration");

        return (def.$initialize = TMP_2 = function(pitch, duration) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_2._p, $yield = $iter || nil;

          TMP_2._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_2, $iter).apply(self, $zuper);
          self.pitch = pitch;
          return self.duration = duration;
        }, nil) && 'initialize';
      })(self, (($a = $scope.Playable) == null ? $opal.cm('Playable') : $a));

      (function($base, $super) {
        function $SynchPoint(){};
        var self = $SynchPoint = $klass($base, $super, 'SynchPoint', $SynchPoint);

        var def = self._proto, $scope = self._scope, TMP_3;

        def.notes = nil;
        self.$attr_reader("notes");

        def.$initialize = TMP_3 = function(notes) {var $zuper = $slice.call(arguments, 0);
          var $a, $b, self = this, $iter = TMP_3._p, $yield = $iter || nil;

          TMP_3._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_3, $iter).apply(self, $zuper);
          if ((($a = notes['$is_a?']((($b = $scope.Array) == null ? $opal.cm('Array') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$raise("Notes must be an array")
          };
          return self.notes = notes;
        };

        def.$duration = function() {
          var self = this;

          return self.notes.$first().$duration();
        };

        def['$beat='] = function(value) {
          var $a, $b, TMP_4, self = this;

          self.beat = value;
          return ($a = ($b = self.notes).$each, $a._p = (TMP_4 = function(n){var self = TMP_4._s || this;
if (n == null) n = nil;
          return n['$beat='](value)}, TMP_4._s = self, TMP_4), $a).call($b);
        };

        return (def.$pitch = function() {
          var self = this;

          return self.notes.$last().$pitch();
        }, nil) && 'pitch';
      })(self, (($a = $scope.Playable) == null ? $opal.cm('Playable') : $a));

      (function($base, $super) {
        function $Pause(){};
        var self = $Pause = $klass($base, $super, 'Pause', $Pause);

        var def = self._proto, $scope = self._scope, TMP_5;

        def.visible = nil;
        self.$attr_reader("duration", "pitch");

        def.$initialize = TMP_5 = function(pitch, duration) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_5._p, $yield = $iter || nil;

          TMP_5._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_5, $iter).apply(self, $zuper);
          self.pitch = pitch;
          return self.duration = duration;
        };

        def['$visible='] = function(visible) {
          var self = this;

          return self.visible = visible;
        };

        return (def['$visible?'] = function() {
          var self = this;

          return self.visible;
        }, nil) && 'visible?';
      })(self, (($a = $scope.Playable) == null ? $opal.cm('Playable') : $a));

      (function($base, $super) {
        function $MeasureStart(){};
        var self = $MeasureStart = $klass($base, $super, 'MeasureStart', $MeasureStart);

        var def = self._proto, $scope = self._scope, TMP_6;

        return (def.$initialize = TMP_6 = function(companion) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_6._p, $yield = $iter || nil;

          TMP_6._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_6, $iter).apply(self, $zuper);
          self['$companion='](companion);
          return self.visible = companion['$visible?']();
        }, nil) && 'initialize'
      })(self, (($a = $scope.NonPlayable) == null ? $opal.cm('NonPlayable') : $a));

      (function($base, $super) {
        function $NewPart(){};
        var self = $NewPart = $klass($base, $super, 'NewPart', $NewPart);

        var def = self._proto, $scope = self._scope, TMP_7;

        self.$attr_reader("name");

        return (def.$initialize = TMP_7 = function(title) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_7._p, $yield = $iter || nil;

          TMP_7._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_7, $iter).apply(self, $zuper);
          return self.name = title;
        }, nil) && 'initialize';
      })(self, (($a = $scope.NonPlayable) == null ? $opal.cm('NonPlayable') : $a));

      (function($base, $super) {
        function $Dacapo(){};
        var self = $Dacapo = $klass($base, $super, 'Dacapo', $Dacapo);

        var def = self._proto, $scope = self._scope, TMP_8;

        self.$attr_reader("from", "to", "policy");

        return (def.$initialize = TMP_8 = function(from, to, policy) {var $zuper = $slice.call(arguments, 0);
          var $a, $b, $c, $d, self = this, $iter = TMP_8._p, $yield = $iter || nil;

          TMP_8._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_8, $iter).apply(self, $zuper);
          if ((($a = from['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Music == null ? $c.cm('Music') : $c.Music))._scope).Playable == null ? $b.cm('Playable') : $b.Playable))) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$raise("End point of Jump (" + (from.$class()) + ") must be a Playable")
          };
          if ((($a = to['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Music == null ? $c.cm('Music') : $c.Music))._scope).Playable == null ? $b.cm('Playable') : $b.Playable))) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$raise("Start point of Jump (" + (to.$class()) + ") must be a Playable")
          };
          self.from = from;
          self.to = to;
          return self.policy = policy;
        }, nil) && 'initialize';
      })(self, (($a = $scope.MusicEntity) == null ? $opal.cm('MusicEntity') : $a));

      (function($base, $super) {
        function $BeatMap(){};
        var self = $BeatMap = $klass($base, $super, 'BeatMap', $BeatMap);

        var def = self._proto, $scope = self._scope;

        self.$attr_accessor("index");

        return (def.$initialize = function(index) {
          var self = this;

          return self.index = index;
        }, nil) && 'initialize';
      })(self, (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a));

      (function($base, $super) {
        function $Song(){};
        var self = $Song = $klass($base, $super, 'Song', $Song);

        var def = self._proto, $scope = self._scope;

        def.voices = def.beat_maps = nil;
        self.$attr_reader("voices", "beat_maps");

        self.$attr_accessor("meta_data", "harpnote_options");

        def.$initialize = function(voices, note_length_in_beats, metadata) {
          var self = this;

          if (voices == null) {
            voices = []
          }
          if (note_length_in_beats == null) {
            note_length_in_beats = 8
          }
          if (metadata == null) {
            metadata = $hash2([], {})
          }
          self.voices = voices;
          self.note_length_in_beats = note_length_in_beats;
          self.meta_data = metadata;
          return self.$update_beats();
        };

        def['$<<'] = function(voice) {
          var self = this;

          self.voices['$<<'](voice);
          return self.$update_beats();
        };

        def.$build_synch_points = function(selector) {
          var $a, $b, TMP_9, $c, $d, TMP_11, self = this;

          if (selector == null) {
            selector = nil
          }
          return ($a = ($b = ($c = ($d = self.$expanded_beat_maps()).$map, $c._p = (TMP_11 = function(playables){var self = TMP_11._s || this, $a;
if (playables == null) playables = nil;
          if (selector !== false && selector !== nil) {
              playables = [playables['$[]'](selector.$first()), playables['$[]'](selector.$last())]};
            playables['$compact!']();
            if (playables.$length()['$>'](1)) {
              return (($a = $scope.SynchPoint) == null ? $opal.cm('SynchPoint') : $a).$new(playables)
              } else {
              return nil
            };}, TMP_11._s = self, TMP_11), $c).call($d).$flatten().$compact()).$select, $a._p = (TMP_9 = function(sp){var self = TMP_9._s || this, $a, $b, TMP_10;
if (sp == null) sp = nil;
          return ($a = ($b = sp.$notes()).$reject, $a._p = (TMP_10 = function(e){var self = TMP_10._s || this, $a;
if (e == null) e = nil;
            return e['$is_a?']((($a = $scope.Note) == null ? $opal.cm('Note') : $a))}, TMP_10._s = self, TMP_10), $a).call($b)['$empty?']()}, TMP_9._s = self, TMP_9), $a).call($b);
        };

        def.$last_beat = function() {
          var $a, $b, TMP_12, self = this, max_beat = nil;

          return max_beat = ($a = ($b = self.beat_maps).$map, $a._p = (TMP_12 = function(map){var self = TMP_12._s || this;
if (map == null) map = nil;
          return map.$keys().$max()}, TMP_12._s = self, TMP_12), $a).call($b).$max();
        };

        def.$expanded_beat_maps = function() {
          var $a, $b, TMP_13, self = this;

          return ($a = ($b = ($range(0, self.$last_beat(), false))).$map, $a._p = (TMP_13 = function(beat){var self = TMP_13._s || this, $a, $b, TMP_14;
            if (self.beat_maps == null) self.beat_maps = nil;
if (beat == null) beat = nil;
          return ($a = ($b = self.beat_maps).$map, $a._p = (TMP_14 = function(map){var self = TMP_14._s || this;
if (map == null) map = nil;
            return map['$[]'](beat)}, TMP_14._s = self, TMP_14), $a).call($b)}, TMP_13._s = self, TMP_13), $a).call($b);
        };

        self.$private();

        return (def.$update_beats = function() {
          var $a, $b, TMP_15, self = this;

          self.beat_maps = ($a = ($b = self.voices).$map, $a._p = (TMP_15 = function(voice){var self = TMP_15._s || this, $a, $b, TMP_16, $c, $d, TMP_17, current_beat = nil, voice_map = nil;
if (voice == null) voice = nil;
          current_beat = 0;
            voice_map = ($a = ($b = ($c = ($d = voice).$select, $c._p = (TMP_17 = function(e){var self = TMP_17._s || this, $a;
if (e == null) e = nil;
            return e['$is_a?']((($a = $scope.Playable) == null ? $opal.cm('Playable') : $a))}, TMP_17._s = self, TMP_17), $c).call($d)).$inject, $a._p = (TMP_16 = function(map, playable){var self = TMP_16._s || this, beats = nil;
if (map == null) map = nil;if (playable == null) playable = nil;
            beats = playable.$duration();
              map['$[]='](current_beat, playable);
              playable['$beat='](current_beat);
              current_beat = current_beat['$+'](beats);
              map['$index='](voice.$index());
              return map;}, TMP_16._s = self, TMP_16), $a).call($b, (($c = $scope.BeatMap) == null ? $opal.cm('BeatMap') : $c).$new(voice.$index()));
            return voice_map;}, TMP_15._s = self, TMP_15), $a).call($b);
          return nil;
        }, nil) && 'update_beats';
      })(self, null);

      (function($base, $super) {
        function $Voice(){};
        var self = $Voice = $klass($base, $super, 'Voice', $Voice);

        var def = self._proto, $scope = self._scope, TMP_18;

        def.show_voice = def.show_flowline = def.show_jumpline = nil;
        self.$attr_accessor("index", "name", "show_voice", "show_flowline", "show_jumpline");

        def.$initialize = TMP_18 = function() {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_18._p, $yield = $iter || nil;

          TMP_18._p = null;
          self.show_voice = true;
          self.show_flowline = true;
          self.show_jumpline = true;
          return $opal.find_super_dispatcher(self, 'initialize', TMP_18, $iter).apply(self, $zuper);
        };

        def['$show_voice?'] = function() {
          var self = this;

          return self.show_voice['$=='](true);
        };

        def['$show_flowline?'] = function() {
          var self = this;

          return self.show_flowline['$=='](true);
        };

        return (def['$show_jumpline?'] = function() {
          var self = this;

          return self.show_jumpline['$=='](true);
        }, nil) && 'show_jumpline?';
      })(self, (($a = $scope.Array) == null ? $opal.cm('Array') : $a));
      
    })(self);

    (function($base) {
      var self = $module($base, 'Drawing');

      var def = self._proto, $scope = self._scope, $a;

      (function($base, $super) {
        function $Sheet(){};
        var self = $Sheet = $klass($base, $super, 'Sheet', $Sheet);

        var def = self._proto, $scope = self._scope;

        self.$attr_reader("children", "vertical_scale");

        return (def.$initialize = function(children, vertical_scale) {
          var self = this;

          if (children == null) {
            children = []
          }
          if (vertical_scale == null) {
            vertical_scale = 1.0
          }
          self.children = children;
          return self.vertical_scale = vertical_scale;
        }, nil) && 'initialize';
      })(self, null);

      (function($base, $super) {
        function $Drawable(){};
        var self = $Drawable = $klass($base, $super, 'Drawable', $Drawable);

        var def = self._proto, $scope = self._scope;

        def.visible = nil;
        def.$initialize = function() {
          var self = this;

          return self.visible = true;
        };

        def.$center = function() {
          var self = this;

          return self.$raise("Not implemented");
        };

        def['$visible?'] = function() {
          var self = this;

          return self.visible;
        };

        return (def['$visible='] = function(v) {
          var self = this;

          return self.visible = v;
        }, nil) && 'visible=';
      })(self, null);

      (function($base, $super) {
        function $FlowLine(){};
        var self = $FlowLine = $klass($base, $super, 'FlowLine', $FlowLine);

        var def = self._proto, $scope = self._scope, TMP_19;

        def.style = nil;
        self.$attr_reader("from", "to", "style", "origin");

        def.$initialize = TMP_19 = function(from, to, style, origin) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_19._p, $yield = $iter || nil;

          if (style == null) {
            style = "solid"
          }
          if (origin == null) {
            origin = nil
          }
          TMP_19._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_19, $iter).apply(self, $zuper);
          self.from = from;
          self.to = to;
          self.style = style;
          return self.origin = origin;
        };

        return (def['$dashed?'] = function() {
          var self = this;

          return self.style['$==']("dashed");
        }, nil) && 'dashed?';
      })(self, (($a = $scope.Drawable) == null ? $opal.cm('Drawable') : $a));

      (function($base, $super) {
        function $JumpLine(){};
        var self = $JumpLine = $klass($base, $super, 'JumpLine', $JumpLine);

        var def = self._proto, $scope = self._scope, TMP_20;

        def.policy = nil;
        self.$attr_reader("from", "to");

        def.$initialize = TMP_20 = function(from, to, policy) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_20._p, $yield = $iter || nil;

          if (policy == null) {
            policy = $hash2(["level"], {"level": 0})
          }
          TMP_20._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_20, $iter).apply(self, $zuper);
          self.from = from;
          self.to = to;
          return self.policy = policy;
        };

        def.$level = function() {
          var $a, self = this;

          return ((($a = self.policy['$[]']("level")) !== false && $a !== nil) ? $a : 0);
        };

        return (def.$distance = function() {
          var self = this;

          return self.policy['$[]']("distance");
        }, nil) && 'distance';
      })(self, (($a = $scope.Drawable) == null ? $opal.cm('Drawable') : $a));

      (function($base, $super) {
        function $Path(){};
        var self = $Path = $klass($base, $super, 'Path', $Path);

        var def = self._proto, $scope = self._scope, TMP_21;

        def.fill = nil;
        self.$attr_reader("path", "style");

        def.$initialize = TMP_21 = function(path, fill, origin) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_21._p, $yield = $iter || nil;

          if (fill == null) {
            fill = nil
          }
          if (origin == null) {
            origin = nil
          }
          TMP_21._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_21, $iter).apply(self, $zuper);
          self.path = path;
          self.fill = fill;
          return self.origin = origin;
        };

        return (def['$filled?'] = function() {
          var self = this;

          return self.fill['$==']("filled");
        }, nil) && 'filled?';
      })(self, (($a = $scope.Drawable) == null ? $opal.cm('Drawable') : $a));

      (function($base, $super) {
        function $Ellipse(){};
        var self = $Ellipse = $klass($base, $super, 'Ellipse', $Ellipse);

        var def = self._proto, $scope = self._scope, TMP_22;

        def.size = def.fill = nil;
        self.$attr_reader("center", "size", "fill", "dotted", "origin");

        def.$initialize = TMP_22 = function(center, size, fill, dotted, origin) {var $zuper = $slice.call(arguments, 0);
          var self = this, $a, $iter = TMP_22._p, $yield = $iter || nil;

          if (fill == null) {
            fill = "filled"
          }
          if (dotted == null) {
            dotted = (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)
          }
          if (origin == null) {
            origin = nil
          }
          TMP_22._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_22, $iter).apply(self, $zuper);
          self.center = center;
          self.size = size;
          self.fill = fill;
          self.dotted = dotted;
          return self.origin = origin;
        };

        def.$height = function() {
          var self = this;

          return self.size.$last();
        };

        def['$dotted?'] = function() {
          var self = this;

          return self.$dotted();
        };

        return (def['$filled?'] = function() {
          var self = this;

          return self.fill['$==']("filled");
        }, nil) && 'filled?';
      })(self, (($a = $scope.Drawable) == null ? $opal.cm('Drawable') : $a));

      (function($base, $super) {
        function $Annotation(){};
        var self = $Annotation = $klass($base, $super, 'Annotation', $Annotation);

        var def = self._proto, $scope = self._scope, TMP_23;

        self.$attr_reader("center", "text", "style", "origin");

        return (def.$initialize = TMP_23 = function(center, text, style, origin) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_23._p, $yield = $iter || nil;

          if (style == null) {
            style = "regular"
          }
          if (origin == null) {
            origin = nil
          }
          TMP_23._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_23, $iter).apply(self, $zuper);
          self.center = center;
          self.text = text;
          self.style = style;
          return self.origin = origin;
        }, nil) && 'initialize';
      })(self, (($a = $scope.Drawable) == null ? $opal.cm('Drawable') : $a));

      (function($base, $super) {
        function $Glyph(){};
        var self = $Glyph = $klass($base, $super, 'Glyph', $Glyph);

        var def = self._proto, $scope = self._scope, TMP_24;

        def.size = def.fill = nil;
        self.$attr_reader("center", "size", "glyph", "dotted", "origin");

        $opal.cdecl($scope, 'GLYPHS', $hash2(["rest_1", "rest_4", "rest_8", "rest_16", "rest_32", "rest_64", "rest_128"], {"rest_1": $hash2(["d", "w", "h"], {"d": [["M", (0.06)['$-'](0.06)['$-']((11.25)['$/'](2)), (0.03)['$-']((1.7)['$*'](4.68))], ["l", 0.09, -0.06], ["l", 5.46, 0], ["l", 5.49, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 2.19], ["l", 0, 2.19], ["l", -0.06, 0.09], ["l", -0.09, 0.06], ["l", -5.49, 0], ["l", -5.46, 0], ["l", -0.09, -0.06], ["l", -0.06, -0.09], ["l", 0, -2.19], ["l", 0, -2.19], ["z"]], "w": 11.25, "h": (2.2)['$*'](4.68)}), "rest_4": $hash2(["d", "w", "h"], {"d": [["M", 1.89, -11.82], ["c", 0.12, -0.06, 0.24, -0.06, 0.36, -0.03], ["c", 0.09, 0.06, 4.74, 5.58, 4.86, 5.82], ["c", 0.21, 0.39, 0.15, 0.78, -0.15, 1.26], ["c", -0.24, 0.33, -0.72, 0.81, -1.62, 1.56], ["c", -0.45, 0.36, -0.87, 0.75, -0.96, 0.84], ["c", -0.93, 0.99, -1.14, 2.49, -0.6, 3.63], ["c", 0.18, 0.39, 0.27, 0.48, 1.32, 1.68], ["c", 1.92, 2.25, 1.83, 2.16, 1.83, 2.34], ["c", 0, 0.18, -0.18, 0.36, -0.36, 0.39], ["c", -0.15, 0, -0.27, -0.06, -0.48, -0.27], ["c", -0.75, -0.75, -2.46, -1.29, -3.39, -1.08], ["c", -0.45, 0.09, -0.69, 0.27, -0.9, 0.69], ["c", -0.12, 0.3, -0.21, 0.66, -0.24, 1.14], ["c", -0.03, 0.66, 0.09, 1.35, 0.3, 2.01], ["c", 0.15, 0.42, 0.24, 0.66, 0.45, 0.96], ["c", 0.18, 0.24, 0.18, 0.33, 0.03, 0.42], ["c", -0.12, 0.06, -0.18, 0.03, -0.45, -0.3], ["c", -1.08, -1.38, -2.07, -3.36, -2.4, -4.83], ["c", -0.27, -1.05, -0.15, -1.77, 0.27, -2.07], ["c", 0.21, -0.12, 0.42, -0.15, 0.87, -0.15], ["c", 0.87, 0.06, 2.1, 0.39, 3.3, 0.9], ["l", 0.39, 0.18], ["l", -1.65, -1.95], ["c", -2.52, -2.97, -2.61, -3.09, -2.7, -3.27], ["c", -0.09, -0.24, -0.12, -0.48, -0.03, -0.75], ["c", 0.15, -0.48, 0.57, -0.96, 1.83, -2.01], ["c", 0.45, -0.36, 0.84, -0.72, 0.93, -0.78], ["c", 0.69, -0.75, 1.02, -1.8, 0.9, -2.79], ["c", -0.06, -0.33, -0.21, -0.84, -0.39, -1.11], ["c", -0.09, -0.15, -0.45, -0.6, -0.81, -1.05], ["c", -0.36, -0.42, -0.69, -0.81, -0.72, -0.87], ["c", -0.09, -0.18, 0, -0.42, 0.21, -0.51], ["z"]], "w": 7.888, "h": 21.435}), "rest_8": $hash2(["d", "w", "h"], {"d": [["M", 1.68, -6.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.39, -0.18, 1.32, -1.29, 1.68, -1.98], ["c", 0.09, -0.21, 0.24, -0.3, 0.39, -0.3], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.27, 1.11, -1.86, 6.42], ["c", -1.02, 3.48, -1.89, 6.39, -1.92, 6.42], ["c", 0, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.15, -0.57, 1.68, -4.92], ["c", 0.96, -2.67, 1.74, -4.89, 1.71, -4.89], ["l", -0.51, 0.15], ["c", -1.08, 0.36, -1.74, 0.48, -2.55, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 7.534, "h": 13.883}), "rest_16": $hash2(["d", "w", "h"], {"d": [["M", 3.33, -6.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.87, 0.42], ["c", 0.39, -0.18, 1.2, -1.23, 1.62, -2.07], ["c", 0.06, -0.15, 0.24, -0.24, 0.36, -0.24], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.45, 1.86, -2.67, 10.17], ["c", -1.5, 5.55, -2.73, 10.14, -2.76, 10.17], ["c", -0.03, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.12, -0.57, 1.44, -4.92], ["c", 0.81, -2.67, 1.47, -4.86, 1.47, -4.89], ["c", -0.03, 0, -0.27, 0.06, -0.54, 0.15], ["c", -1.08, 0.36, -1.77, 0.48, -2.58, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.33, -0.15, 1.02, -0.93, 1.41, -1.59], ["c", 0.12, -0.21, 0.18, -0.39, 0.39, -1.08], ["c", 0.66, -2.1, 1.17, -3.84, 1.17, -3.87], ["c", 0, 0, -0.21, 0.06, -0.42, 0.15], ["c", -0.51, 0.15, -1.2, 0.33, -1.68, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 9.724, "h": 21.383}), "rest_32": $hash2(["d", "w", "h"], {"d": [["M", 4.23, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.27, -0.06], ["c", 0.33, -0.21, 0.99, -1.11, 1.44, -1.98], ["c", 0.09, -0.24, 0.21, -0.33, 0.39, -0.33], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.57, 2.67, -3.21, 13.89], ["c", -1.8, 7.62, -3.3, 13.89, -3.3, 13.92], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.09, -0.57, 1.23, -4.92], ["c", 0.69, -2.67, 1.26, -4.86, 1.29, -4.89], ["c", 0, -0.03, -0.12, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.12, 0.09, 0.3, 0.18, 0.48, 0.21], ["c", 0.12, 0, 0.18, 0, 0.3, -0.09], ["c", 0.42, -0.21, 1.29, -1.29, 1.56, -1.89], ["c", 0.03, -0.12, 1.23, -4.59, 1.23, -4.65], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -0.63, 0.18, -1.2, 0.36, -1.74, 0.45], ["c", -0.39, 0.06, -0.54, 0.06, -1.02, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.18, 0.18, 0.51, 0.27, 0.72, 0.15], ["c", 0.3, -0.12, 0.69, -0.57, 1.08, -1.17], ["c", 0.42, -0.6, 0.39, -0.51, 1.05, -3.03], ["c", 0.33, -1.26, 0.6, -2.31, 0.6, -2.34], ["c", 0, 0, -0.21, 0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.14, 0.33, -1.62, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 11.373, "h": 28.883}), "rest_64": $hash2(["d", "w", "h"], {"d": [["M", 5.13, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.24, -0.12, 0.63, -0.66, 1.08, -1.56], ["c", 0.33, -0.66, 0.39, -0.72, 0.6, -0.72], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.69, 3.66, -3.54, 17.64], ["c", -1.95, 9.66, -3.57, 17.61, -3.57, 17.64], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.06, -0.57, 1.05, -4.95], ["c", 0.6, -2.7, 1.08, -4.89, 1.08, -4.92], ["c", 0, 0, -0.24, 0.06, -0.51, 0.15], ["c", -0.66, 0.24, -1.2, 0.36, -1.77, 0.48], ["c", -0.42, 0.06, -0.57, 0.06, -1.05, 0.06], ["c", -0.69, 0, -0.87, -0.03, -1.35, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.21, 0.03, 0.39, -0.09, 0.72, -0.42], ["c", 0.45, -0.45, 1.02, -1.26, 1.17, -1.65], ["c", 0.03, -0.09, 0.27, -1.14, 0.54, -2.34], ["c", 0.27, -1.2, 0.48, -2.19, 0.51, -2.22], ["c", 0, -0.03, -0.09, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.9, 0.42], ["c", 0.36, -0.18, 1.2, -1.26, 1.47, -1.89], ["c", 0.03, -0.09, 0.3, -1.2, 0.57, -2.43], ["l", 0.51, -2.28], ["l", -0.54, 0.18], ["c", -1.11, 0.36, -1.8, 0.48, -2.61, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.21, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.36, -0.18, 0.93, -0.93, 1.29, -1.68], ["c", 0.12, -0.24, 0.18, -0.48, 0.63, -2.55], ["l", 0.51, -2.31], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -1.14, 0.36, -2.1, 0.54, -2.82, 0.51], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 12.453, "h": 36.383}), "rest_128": $hash2(["d", "w", "h"], {"d": [["M", 6.03, -21.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.21, 0, 0.33, -0.06, 0.54, -0.36], ["c", 0.15, -0.21, 0.54, -0.93, 0.78, -1.47], ["c", 0.15, -0.33, 0.18, -0.39, 0.3, -0.48], ["c", 0.18, -0.09, 0.45, 0, 0.51, 0.15], ["c", 0.03, 0.09, -7.11, 42.75, -7.17, 42.84], ["c", -0.03, 0.03, -0.15, 0.09, -0.24, 0.15], ["c", -0.18, 0.06, -0.24, 0.06, -0.45, 0.06], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.03, -0.57, 0.84, -4.98], ["c", 0.51, -2.7, 0.93, -4.92, 0.9, -4.92], ["c", 0, 0, -0.15, 0.06, -0.36, 0.12], ["c", -0.78, 0.27, -1.62, 0.48, -2.31, 0.57], ["c", -0.15, 0.03, -0.54, 0.03, -0.81, 0.03], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.63, 0.48], ["c", 0.12, 0, 0.18, 0, 0.3, -0.09], ["c", 0.42, -0.21, 1.14, -1.11, 1.5, -1.83], ["c", 0.12, -0.27, 0.12, -0.27, 0.54, -2.52], ["c", 0.24, -1.23, 0.42, -2.25, 0.39, -2.25], ["c", 0, 0, -0.24, 0.06, -0.51, 0.18], ["c", -1.26, 0.39, -2.25, 0.57, -3.06, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.51, 0.3, 0.75, 0.18], ["c", 0.36, -0.15, 1.05, -0.99, 1.41, -1.77], ["l", 0.15, -0.3], ["l", 0.42, -2.25], ["c", 0.21, -1.26, 0.42, -2.28, 0.39, -2.28], ["l", -0.51, 0.15], ["c", -1.11, 0.39, -1.89, 0.51, -2.7, 0.51], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.18, 0.48, 0.27, 0.72, 0.21], ["c", 0.33, -0.12, 1.14, -1.26, 1.41, -1.95], ["c", 0, -0.09, 0.21, -1.11, 0.45, -2.34], ["c", 0.21, -1.2, 0.39, -2.22, 0.39, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.2, 0.33, -1.71, 0.42], ["c", -0.3, 0.06, -0.51, 0.06, -0.93, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.18, 0, 0.36, -0.09, 0.57, -0.33], ["c", 0.33, -0.36, 0.78, -1.14, 0.93, -1.56], ["c", 0.03, -0.12, 0.24, -1.2, 0.45, -2.4], ["c", 0.24, -1.2, 0.42, -2.22, 0.42, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.39, 0.09], ["c", -1.05, 0.36, -1.8, 0.48, -2.58, 0.48], ["c", -0.63, 0, -0.84, -0.03, -1.29, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 12.992, "h": 43.883})}));

        def.$initialize = TMP_24 = function(center, size, glyph_name, dotted, origin) {var $zuper = $slice.call(arguments, 0);
          var $a, self = this, $iter = TMP_24._p, $yield = $iter || nil;

          if (dotted == null) {
            dotted = (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)
          }
          if (origin == null) {
            origin = nil
          }
          TMP_24._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_24, $iter).apply(self, $zuper);
          self.center = center;
          self.glyph_name = glyph_name;
          self.glyph = (($a = $scope.GLYPHS) == null ? $opal.cm('GLYPHS') : $a)['$[]'](glyph_name);
          self.size = size;
          self.dotted = dotted;
          self.origin = origin;
          return self.filled = true;
        };

        def.$height = function() {
          var self = this;

          return self.size.$last();
        };

        def['$dotted?'] = function() {
          var self = this;

          return self.$dotted();
        };

        return (def['$filled?'] = function() {
          var self = this;

          return self.fill['$==']("filled");
        }, nil) && 'filled?';
      })(self, (($a = $scope.Drawable) == null ? $opal.cm('Drawable') : $a));
      
    })(self);

    (function($base) {
      var self = $module($base, 'Layout');

      var def = self._proto, $scope = self._scope, $a, $b;

      self.$include((($a = ((($b = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $b))._scope).Music == null ? $a.cm('Music') : $a.Music));

      self.$include((($a = ((($b = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $b))._scope).Drawing == null ? $a.cm('Drawing') : $a.Drawing));

      (function($base, $super) {
        function $Default(){};
        var self = $Default = $klass($base, $super, 'Default', $Default);

        var def = self._proto, $scope = self._scope, $a;

        def.beat_spacing = def.slur_index = nil;
        $opal.cdecl($scope, 'ELLIPSE_SIZE', [2.8, 1.7]);

        $opal.cdecl($scope, 'REST_SIZE', [2.8, 2.8]);

        $opal.cdecl($scope, 'X_SPACING', (115.0)['$/'](10.0));

        $opal.cdecl($scope, 'Y_OFFSET', 5);

        $opal.cdecl($scope, 'X_OFFSET', (($a = $scope.ELLIPSE_SIZE) == null ? $opal.cm('ELLIPSE_SIZE') : $a).$first());

        $opal.cdecl($scope, 'Y_SCALE', 4);

        $opal.cdecl($scope, 'DRAWING_AREA_SIZE', [400, 282]);

        $opal.cdecl($scope, 'BEAT_RESOULUTION', 64);

        $opal.cdecl($scope, 'PITCH_OFFSET', -43);

        $opal.cdecl($scope, 'DURATION_TO_STYLE', $hash2(["d64", "d48", "d32", "d24", "d16", "d12", "d8", "d6", "d4", "d3", "d2", "d1"], {"d64": [0.9, "empty", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d48": [0.7, "empty", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d32": [0.7, "empty", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d24": [0.7, "filled", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d16": [0.7, "filled", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d12": [0.5, "filled", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d8": [0.5, "filled", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d6": [0.3, "filled", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d4": [0.3, "filled", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d3": [0.1, "filled", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d2": [0.1, "filled", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d1": [0.05, "filled", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)]}));

        $opal.cdecl($scope, 'REST_TO_GLYPH', $hash2(["d64", "d48", "d32", "d24", "d16", "d12", "d8", "d6", "d4", "d3", "d2", "d1"], {"d64": [[0.9, 0.9], "rest_1", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d48": [[0.5, 0.5], "rest_1", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d32": [[0.5, 0.5], "rest_1", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d24": [[0.4, 0.7], "rest_4", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d16": [[0.4, 0.7], "rest_4", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d12": [[0.3, 0.5], "rest_8", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d8": [[0.3, 0.5], "rest_8", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d6": [[0.3, 0.4], "rest_16", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d4": [[0.3, 0.5], "rest_16", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d3": [[0.3, 0.5], "rest_32", (($a = $scope.TRUE) == null ? $opal.cm('TRUE') : $a)], "d2": [[0.3, 0.5], "rest_32", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)], "d1": [[0.3, 0.5], "rest_64", (($a = $scope.FALSE) == null ? $opal.cm('FALSE') : $a)]}));

        def.$initialize = function() {
          var $a, self = this;

          self.beat_spacing = (($a = $scope.Y_SCALE) == null ? $opal.cm('Y_SCALE') : $a)['$*'](1.0)['$/']((($a = $scope.BEAT_RESOULUTION) == null ? $opal.cm('BEAT_RESOULUTION') : $a));
          return self.slur_index = $hash2([], {});
        };

        def.$beat_layout_policy = function(music) {
          var $a, $b, TMP_25, $c, self = this;

          return ($a = ($b = (($c = $scope.Proc) == null ? $opal.cm('Proc') : $c)).$new, $a._p = (TMP_25 = function(beat){var self = TMP_25._s || this, $a;
            if (self.beat_spacing == null) self.beat_spacing = nil;
if (beat == null) beat = nil;
          return (beat['$-'](1))['$*'](self.beat_spacing)['$+']((($a = $scope.Y_OFFSET) == null ? $opal.cm('Y_OFFSET') : $a))}, TMP_25._s = self, TMP_25), $a).call($b);
        };

        def.$layout = function(music, beat_layout, print_variant_nr) {
          var $a, $b, TMP_26, $c, TMP_27, $d, TMP_28, $e, $f, TMP_29, TMP_30, $g, TMP_31, $h, $i, TMP_33, $j, TMP_34, $k, self = this, print_options = nil, beat_compression_map = nil, maximal_beat = nil, full_beat_spacing = nil, factor = nil, compressed_beat_layout = nil, voice_elements = nil, note_to_ellipse = nil, required_synchlines = nil, synch_lines = nil, sheet_marks = nil, rightmark = nil, leftmark = nil, annotations = nil, title_pos = nil, legend_pos = nil, title = nil, meter = nil, key = nil, composer = nil, tempo = nil, print_variant_title = nil, legend = nil, datestring = nil, sheet_elements = nil, hugo = nil;
          if ($gvars.log == null) $gvars.log = nil;

          if (beat_layout == null) {
            beat_layout = nil
          }
          if (print_variant_nr == null) {
            print_variant_nr = 0
          }
          print_options = music.$harpnote_options()['$[]']("print")['$[]'](print_variant_nr);
          beat_layout = ((($a = beat_layout) !== false && $a !== nil) ? $a : self.$beat_layout_policy(music));
          beat_compression_map = self.$compute_beat_compression(music, print_options['$[]']("layoutlines"));
          maximal_beat = beat_compression_map.$values().$max();
          full_beat_spacing = (($a = $scope.DRAWING_AREA_SIZE) == null ? $opal.cm('DRAWING_AREA_SIZE') : $a).$last()['$/'](maximal_beat);
          if (full_beat_spacing['$<'](self.beat_spacing)) {
            factor = (self.beat_spacing['$/'](full_beat_spacing));
            $gvars.log.$warning("note distance too small (factor " + (factor) + ")");};
          self.beat_spacing = [full_beat_spacing, (2)['$*'](self.beat_spacing)].$min();
          compressed_beat_layout = ($a = ($b = (($c = $scope.Proc) == null ? $opal.cm('Proc') : $c)).$new, $a._p = (TMP_26 = function(beat){var self = TMP_26._s || this;
if (beat == null) beat = nil;
          return beat_layout.$call(beat_compression_map['$[]'](beat))}, TMP_26._s = self, TMP_26), $a).call($b);
          voice_elements = ($a = ($c = music.$voices().$each_with_index()).$map, $a._p = (TMP_27 = function(v, index){var self = TMP_27._s || this, $a;
if (v == null) v = nil;if (index == null) index = nil;
          if ((($a = print_options['$[]']("voices")['$include?'](index)) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$layout_voice(v, compressed_beat_layout, $hash2(["flowline", "jumpline"], {"flowline": print_options['$[]']("flowlines")['$include?'](index), "jumpline": print_options['$[]']("jumplines")['$include?'](index)}))
              } else {
              return nil
            }}, TMP_27._s = self, TMP_27), $a).call($c).$flatten().$compact();
          note_to_ellipse = (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a)['$[]'](($a = ($d = ($e = ($f = voice_elements).$select, $e._p = (TMP_29 = function(e){var self = TMP_29._s || this, $a;
if (e == null) e = nil;
          return e['$is_a?']((($a = $scope.Ellipse) == null ? $opal.cm('Ellipse') : $a))}, TMP_29._s = self, TMP_29), $e).call($f)).$map, $a._p = (TMP_28 = function(e){var self = TMP_28._s || this;
if (e == null) e = nil;
          return [e.$origin(), e]}, TMP_28._s = self, TMP_28), $a).call($d));
          required_synchlines = ($a = ($e = print_options['$[]']("synchlines")).$select, $a._p = (TMP_30 = function(sl){var self = TMP_30._s || this, $a;
if (sl == null) sl = nil;
          return ($a = print_options['$[]']("voices")['$include?'](sl.$first()), $a !== false && $a !== nil ?print_options['$[]']("voices")['$include?'](sl.$last()) : $a)}, TMP_30._s = self, TMP_30), $a).call($e);
          synch_lines = ($a = ($g = required_synchlines).$map, $a._p = (TMP_31 = function(selector){var self = TMP_31._s || this, $a, $b, TMP_32, synch_points_to_show = nil;
if (selector == null) selector = nil;
          synch_points_to_show = music.$build_synch_points(selector);
            return ($a = ($b = synch_points_to_show).$map, $a._p = (TMP_32 = function(sp){var self = TMP_32._s || this, $a;
if (sp == null) sp = nil;
            return (($a = $scope.FlowLine) == null ? $opal.cm('FlowLine') : $a).$new(note_to_ellipse['$[]'](sp.$notes().$first()), note_to_ellipse['$[]'](sp.$notes()['$[]'](1)), "dashed", sp)}, TMP_32._s = self, TMP_32), $a).call($b);}, TMP_31._s = self, TMP_31), $a).call($g).$flatten();
          sheet_marks = [];
          rightmark = (($a = ((($h = ((($i = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $i))._scope).Music == null ? $h.cm('Music') : $h.Music))._scope).Note == null ? $a.cm('Note') : $a.Note).$new(79, 2);
          leftmark = (($a = ((($h = ((($i = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $i))._scope).Music == null ? $h.cm('Music') : $h.Music))._scope).Note == null ? $a.cm('Note') : $a.Note).$new(43, 2);
          ($a = ($h = ($range(1, 3, false))).$each, $a._p = (TMP_33 = function(i){var self = TMP_33._s || this;
if (i == null) i = nil;
          rightmark['$beat='](i['$*'](16));
            leftmark['$beat='](i['$*'](8));
            sheet_marks['$<<'](self.$layout_note(rightmark, self.$beat_layout_policy(music)));
            return sheet_marks['$<<'](self.$layout_note(leftmark, self.$beat_layout_policy(music)));}, TMP_33._s = self, TMP_33), $a).call($h);
          annotations = [];
          title_pos = [20, 20];
          legend_pos = [20, 30];
          title = ((($a = music.$meta_data()['$[]']("title")) !== false && $a !== nil) ? $a : "untitled");
          meter = music.$meta_data()['$[]']("meter");
          key = music.$meta_data()['$[]']("key");
          composer = music.$meta_data()['$[]']("composer");
          tempo = music.$meta_data()['$[]']("tempo_display");
          print_variant_title = print_options['$[]']("title");
          title_pos = ((($a = music.$harpnote_options()['$[]']("legend")) !== false && $a !== nil) ? $a : [20, 20]);
          legend_pos = [title_pos.$first(), title_pos.$last()['$+'](7)];
          legend = "" + (print_variant_title) + "\n" + (composer) + "\nTakt: " + (meter) + " (" + (tempo) + ")\nTonart: " + (key);
          annotations['$<<']((($a = ((($i = ((($j = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $j))._scope).Drawing == null ? $i.cm('Drawing') : $i.Drawing))._scope).Annotation == null ? $a.cm('Annotation') : $a.Annotation).$new(title_pos, title, "large"));
          annotations['$<<']((($a = ((($i = ((($j = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $j))._scope).Drawing == null ? $i.cm('Drawing') : $i.Drawing))._scope).Annotation == null ? $a.cm('Annotation') : $a.Annotation).$new(legend_pos, legend, "regular"));
          datestring = (($a = $scope.Time) == null ? $opal.cm('Time') : $a).$now().$strftime("%Y-%m-%d %H:%M:%S %Z");
          annotations['$<<']((($a = ((($i = ((($j = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $j))._scope).Drawing == null ? $i.cm('Drawing') : $i.Drawing))._scope).Annotation == null ? $a.cm('Annotation') : $a.Annotation).$new([150, 292], "rendered " + (datestring) + " by Zupfnoter " + ((($a = $scope.VERSION) == null ? $opal.cm('VERSION') : $a)) + " " + ((($a = $scope.COPYRIGHT) == null ? $opal.cm('COPYRIGHT') : $a)) + " (Host " + (window.location) + ")", "small"));
          ($a = ($i = music.$harpnote_options()['$[]']("notes")).$each, $a._p = (TMP_34 = function(note){var self = TMP_34._s || this, $a, $b, $c;
if (note == null) note = nil;
          return annotations['$<<']((($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Drawing == null ? $b.cm('Drawing') : $b.Drawing))._scope).Annotation == null ? $a.cm('Annotation') : $a.Annotation).$new(note['$[]'](0), note['$[]'](1), note['$[]'](2)))}, TMP_34._s = self, TMP_34), $a).call($i);
          sheet_elements = synch_lines['$+'](voice_elements)['$+'](sheet_marks)['$+'](annotations);
          hugo = 1;
          return (($a = ((($j = ((($k = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $k))._scope).Drawing == null ? $j.cm('Drawing') : $j.Drawing))._scope).Sheet == null ? $a.cm('Sheet') : $a.Sheet).$new(sheet_elements);
        };

        def.$layout_voice = function(voice, beat_layout, show_options) {
          var $a, $b, TMP_35, $c, TMP_36, $d, TMP_37, $e, $f, TMP_38, TMP_39, $g, $h, TMP_40, TMP_41, $i, TMP_42, $j, $k, TMP_43, TMP_44, $l, $m, TMP_45, TMP_46, $n, TMP_50, $o, $p, TMP_51, self = this, playables = nil, res_playables = nil, res_measures = nil, res_newparts = nil, lookuptable_drawing_by_playable = nil, previous_note = nil, res_flow = nil, tie_start = nil, res_slurs = nil, res_dacapo = nil, retval = nil;

          playables = ($a = ($b = voice).$select, $a._p = (TMP_35 = function(c){var self = TMP_35._s || this, $a;
if (c == null) c = nil;
          return c['$is_a?']((($a = $scope.Playable) == null ? $opal.cm('Playable') : $a))}, TMP_35._s = self, TMP_35), $a).call($b);
          res_playables = ($a = ($c = playables).$map, $a._p = (TMP_36 = function(playable){var self = TMP_36._s || this;
if (playable == null) playable = nil;
          return self.$layout_playable(playable, beat_layout)}, TMP_36._s = self, TMP_36), $a).call($c).$flatten();
          res_measures = ($a = ($d = ($e = ($f = voice).$select, $e._p = (TMP_38 = function(c){var self = TMP_38._s || this, $a;
if (c == null) c = nil;
          return c['$is_a?']((($a = $scope.MeasureStart) == null ? $opal.cm('MeasureStart') : $a))}, TMP_38._s = self, TMP_38), $e).call($f)).$map, $a._p = (TMP_37 = function(measure){var self = TMP_37._s || this;
if (measure == null) measure = nil;
          return self.$layout_playable(measure, beat_layout)}, TMP_37._s = self, TMP_37), $a).call($d);
          res_newparts = ($a = ($e = ($g = ($h = voice).$select, $g._p = (TMP_40 = function(c){var self = TMP_40._s || this, $a;
if (c == null) c = nil;
          return c['$is_a?']((($a = $scope.NewPart) == null ? $opal.cm('NewPart') : $a))}, TMP_40._s = self, TMP_40), $g).call($h)).$map, $a._p = (TMP_39 = function(newpart){var self = TMP_39._s || this;
if (newpart == null) newpart = nil;
          return self.$layout_newpart(newpart, beat_layout)}, TMP_39._s = self, TMP_39), $a).call($e);
          lookuptable_drawing_by_playable = (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a)['$[]'](($a = ($g = res_playables).$map, $a._p = (TMP_41 = function(e){var self = TMP_41._s || this;
if (e == null) e = nil;
          return [e.$origin(), e]}, TMP_41._s = self, TMP_41), $a).call($g));
          ($a = ($i = ($j = ($k = res_playables).$select, $j._p = (TMP_43 = function(e){var self = TMP_43._s || this, $a;
if (e == null) e = nil;
          return e['$is_a?']((($a = $scope.FlowLine) == null ? $opal.cm('FlowLine') : $a))}, TMP_43._s = self, TMP_43), $j).call($k)).$each, $a._p = (TMP_42 = function(f){var self = TMP_42._s || this;
if (f == null) f = nil;
          return lookuptable_drawing_by_playable['$[]='](f.$origin(), f.$to())}, TMP_42._s = self, TMP_42), $a).call($i);
          previous_note = nil;
          res_flow = ($a = ($j = ($l = ($m = voice).$select, $l._p = (TMP_45 = function(c){var self = TMP_45._s || this, $a, $b;
if (c == null) c = nil;
          return ((($a = c['$is_a?']((($b = $scope.Playable) == null ? $opal.cm('Playable') : $b))) !== false && $a !== nil) ? $a : c['$is_a?']((($b = $scope.SynchPoint) == null ? $opal.cm('SynchPoint') : $b)))}, TMP_45._s = self, TMP_45), $l).call($m)).$map, $a._p = (TMP_44 = function(playable){var self = TMP_44._s || this, $a, res = nil;
if (playable == null) playable = nil;
          res = nil;
            if ((($a = previous_note['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              res = (($a = $scope.FlowLine) == null ? $opal.cm('FlowLine') : $a).$new(lookuptable_drawing_by_playable['$[]'](previous_note), lookuptable_drawing_by_playable['$[]'](playable))
            };
            if ((($a = playable['$first_in_part?']()) !== nil && (!$a._isBoolean || $a == true))) {
              res = nil};
            previous_note = playable;
            return res;}, TMP_44._s = self, TMP_44), $a).call($j).$compact();
          self.slur_index['$[]=']("first_playable", playables.$first());
          tie_start = playables.$first();
          res_slurs = ($a = ($l = playables).$inject, $a._p = (TMP_46 = function(result, playable){var self = TMP_46._s || this, $a, $b, $c, $d, TMP_47, TMP_48, TMP_49, p1 = nil, p2 = nil, tiepath = nil;
            if (self.slur_index == null) self.slur_index = nil;
if (result == null) result = nil;if (playable == null) playable = nil;
          if ((($a = playable['$tie_end?']()) !== nil && (!$a._isBoolean || $a == true))) {
              p1 = self.$Vector2d(lookuptable_drawing_by_playable['$[]'](tie_start).$center())['$+']([3, 0]);
              p2 = self.$Vector2d(lookuptable_drawing_by_playable['$[]'](playable).$center())['$+']([3, 0]);
              tiepath = self.$make_slur_path(p1, p2);
              result.$push((($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Drawing == null ? $b.cm('Drawing') : $b.Drawing))._scope).Path == null ? $a.cm('Path') : $a.Path).$new(tiepath));
              if ((($a = playable['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Music == null ? $c.cm('Music') : $c.Music))._scope).SynchPoint == null ? $b.cm('SynchPoint') : $b.SynchPoint))) !== nil && (!$a._isBoolean || $a == true))) {
                ($a = ($b = playable.$notes()).$each_with_index, $a._p = (TMP_47 = function(n, index){var self = TMP_47._s || this, $a, $b, $c;
                  if ($gvars.log == null) $gvars.log = nil;
if (n == null) n = nil;if (index == null) index = nil;
                try {
                  p1 = tie_start.$notes()['$[]'](index);
                    p1 = self.$Vector2d(lookuptable_drawing_by_playable['$[]'](p1).$center())['$+']([3, 0]);
                    p2 = self.$Vector2d(lookuptable_drawing_by_playable['$[]'](n).$center())['$+']([3, 0]);
                    tiepath = self.$make_slur_path(p1, p2);
                    return result.$push((($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Drawing == null ? $b.cm('Drawing') : $b.Drawing))._scope).Path == null ? $a.cm('Path') : $a.Path).$new(tiepath));
                  } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.Exception) == null ? $opal.cm('Exception') : $a)])) {e = $err;
                    return $gvars.log.$error("tied chords which doesn't have same number of notes")
                    }else { throw $err; }
                  }}, TMP_47._s = self, TMP_47), $a).call($b)};};
            if ((($a = playable['$tie_start?']()) !== nil && (!$a._isBoolean || $a == true))) {
              tie_start = playable};
            ($a = ($c = playable.$slur_starts()).$each, $a._p = (TMP_48 = function(s){var self = TMP_48._s || this;
              if (self.slur_index == null) self.slur_index = nil;
if (s == null) s = nil;
            return self.slur_index['$[]='](s, playable)}, TMP_48._s = self, TMP_48), $a).call($c);
            self.slur_index['$[]='](playable.$slur_starts().$first(), playable);
            ($a = ($d = playable.$slur_ends()).$each, $a._p = (TMP_49 = function(id){var self = TMP_49._s || this, $a, $b, $c, begin_slur = nil, slurpath = nil;
              if (self.slur_index == null) self.slur_index = nil;
if (id == null) id = nil;
            begin_slur = ((($a = self.slur_index['$[]'](id)) !== false && $a !== nil) ? $a : self.slur_index['$[]']("first_playable"));
              p1 = self.$Vector2d(lookuptable_drawing_by_playable['$[]'](begin_slur).$center())['$+']([3, 0]);
              p2 = self.$Vector2d(lookuptable_drawing_by_playable['$[]'](playable).$center())['$+']([3, 0]);
              slurpath = self.$make_slur_path(p1, p2);
              return result.$push((($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Drawing == null ? $b.cm('Drawing') : $b.Drawing))._scope).Path == null ? $a.cm('Path') : $a.Path).$new(slurpath));}, TMP_49._s = self, TMP_49), $a).call($d);
            return result;}, TMP_46._s = self, TMP_46), $a).call($l, []);
          if ((($a = show_options['$[]']("flowline")) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            res_flow = []
          };
          res_dacapo = ($a = ($n = ($o = ($p = voice).$select, $o._p = (TMP_51 = function(c){var self = TMP_51._s || this, $a;
if (c == null) c = nil;
          return c['$is_a?']((($a = $scope.Dacapo) == null ? $opal.cm('Dacapo') : $a))}, TMP_51._s = self, TMP_51), $o).call($p)).$map, $a._p = (TMP_50 = function(dacapo){var self = TMP_50._s || this, $a, distance = nil, vertical = nil;
if (dacapo == null) dacapo = nil;
          if ((($a = distance = dacapo.$policy()['$[]']("distance")) !== nil && (!$a._isBoolean || $a == true))) {
              vertical = $hash2(["distance"], {"distance": (distance['$+'](0.5))['$*']((($a = $scope.X_SPACING) == null ? $opal.cm('X_SPACING') : $a))})
              } else {
              vertical = $hash2(["level"], {"level": dacapo.$policy()['$[]']("level")})
            };
            return (($a = $scope.JumpLine) == null ? $opal.cm('JumpLine') : $a).$new(lookuptable_drawing_by_playable['$[]'](dacapo.$from()), lookuptable_drawing_by_playable['$[]'](dacapo.$to()), vertical);}, TMP_50._s = self, TMP_50), $a).call($n);
          if ((($a = show_options['$[]']("jumpline")) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            res_dacapo = []
          };
          return retval = (res_flow['$+'](res_playables)['$+'](res_dacapo)['$+'](res_measures)['$+'](res_newparts)['$+'](res_slurs)).$compact();
        };

        self.$private();

        def.$compute_beat_compression = function(music, layout_lines) {
          var $a, $b, TMP_52, $c, TMP_53, $d, TMP_54, self = this, max_beat = nil, current_beat = nil, last_size = nil, relevant_beat_maps = nil;

          max_beat = ($a = ($b = music.$beat_maps()).$map, $a._p = (TMP_52 = function(map){var self = TMP_52._s || this;
if (map == null) map = nil;
          return map.$keys().$max()}, TMP_52._s = self, TMP_52), $a).call($b).$max();
          current_beat = 0;
          last_size = ((($a = $scope.BEAT_RESOULUTION) == null ? $opal.cm('BEAT_RESOULUTION') : $a));
          relevant_beat_maps = ($a = ($c = layout_lines).$inject, $a._p = (TMP_53 = function(r, i){var self = TMP_53._s || this;
if (r == null) r = nil;if (i == null) i = nil;
          return r.$push(music.$beat_maps()['$[]'](i))}, TMP_53._s = self, TMP_53), $a).call($c, []).$compact();
          return (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a)['$[]'](($a = ($d = ($range(0, max_beat, false))).$map, $a._p = (TMP_54 = function(beat){var self = TMP_54._s || this, $a, $b, TMP_55, $c, TMP_56, $d, TMP_57, notes_on_beat = nil, max_duration = nil, has_no_notes_on_beat = nil, is_new_part = nil, size = nil, e = nil, increment = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (beat == null) beat = nil;
          notes_on_beat = ($a = ($b = relevant_beat_maps).$map, $a._p = (TMP_55 = function(bm){var self = TMP_55._s || this;
if (bm == null) bm = nil;
            return bm['$[]'](beat)}, TMP_55._s = self, TMP_55), $a).call($b).$flatten().$compact();
            max_duration = ($a = ($c = notes_on_beat).$map, $a._p = (TMP_56 = function(n){var self = TMP_56._s || this;
if (n == null) n = nil;
            return n.$duration()}, TMP_56._s = self, TMP_56), $a).call($c).$max();
            has_no_notes_on_beat = notes_on_beat['$empty?']();
            is_new_part = ($a = ($d = notes_on_beat).$select, $a._p = (TMP_57 = function(n){var self = TMP_57._s || this;
if (n == null) n = nil;
            return n['$first_in_part?']()}, TMP_57._s = self, TMP_57), $a).call($d);
            if (has_no_notes_on_beat !== false && has_no_notes_on_beat !== nil) {
              } else {
              try {
              size = ((($a = $scope.BEAT_RESOULUTION) == null ? $opal.cm('BEAT_RESOULUTION') : $a))['$*']((($a = $scope.DURATION_TO_STYLE) == null ? $opal.cm('DURATION_TO_STYLE') : $a)['$[]'](self.$duration_to_id(max_duration)).$first())
              } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.Exception) == null ? $opal.cm('Exception') : $a)])) {e = $err;
                $gvars.log.$error("unsupported duration: " + (max_duration) + " on beat " + (beat) + ",  " + (notes_on_beat.$to_json()))
                }else { throw $err; }
              };
              increment = (size['$+'](last_size))['$/'](2);
              last_size = size;
              if ((($a = is_new_part['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                increment = increment['$+']((($a = $scope.BEAT_RESOULUTION) == null ? $opal.cm('BEAT_RESOULUTION') : $a))
              };
              current_beat = current_beat['$+'](increment);
            };
            return [beat, current_beat];}, TMP_54._s = self, TMP_54), $a).call($d));
        };

        def.$layout_playable = function(root, beat_layout) {
          var $a, $b, self = this;
          if ($gvars.log == null) $gvars.log = nil;

          if ((($a = root['$is_a?']((($b = $scope.Note) == null ? $opal.cm('Note') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$layout_note(root, beat_layout)
          } else if ((($a = root['$is_a?']((($b = $scope.MeasureStart) == null ? $opal.cm('MeasureStart') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$layout_measure_start(root, beat_layout)
          } else if ((($a = root['$is_a?']((($b = $scope.SynchPoint) == null ? $opal.cm('SynchPoint') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$layout_accord(root, beat_layout)
          } else if ((($a = root['$is_a?']((($b = $scope.Pause) == null ? $opal.cm('Pause') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$layout_pause(root, beat_layout)
          } else if ((($a = root['$is_a?']((($b = $scope.NewPart) == null ? $opal.cm('NewPart') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$layout_newpart(root, beat_layout)
            } else {
            return $gvars.log.$error("Missing Music -> Sheet transform: " + (root))
          };
        };

        def.$layout_note = function(root, beat_layout) {
          var $a, $b, TMP_58, $c, self = this, x_offset = nil, y_offset = nil, scale = nil, fill = nil, dotted = nil, size = nil, res = nil;

          x_offset = ((($a = $scope.PITCH_OFFSET) == null ? $opal.cm('PITCH_OFFSET') : $a)['$+'](root.$pitch()))['$*']((($a = $scope.X_SPACING) == null ? $opal.cm('X_SPACING') : $a))['$+']((($a = $scope.X_OFFSET) == null ? $opal.cm('X_OFFSET') : $a));
          y_offset = beat_layout.$call(root.$beat());
          $a = $opal.to_ary((($b = $scope.DURATION_TO_STYLE) == null ? $opal.cm('DURATION_TO_STYLE') : $b)['$[]'](self.$duration_to_id(root.$duration()))), scale = ($a[0] == null ? nil : $a[0]), fill = ($a[1] == null ? nil : $a[1]), dotted = ($a[2] == null ? nil : $a[2]);
          size = ($a = ($b = (($c = $scope.ELLIPSE_SIZE) == null ? $opal.cm('ELLIPSE_SIZE') : $c)).$map, $a._p = (TMP_58 = function(e){var self = TMP_58._s || this;
if (e == null) e = nil;
          return e['$*'](scale)}, TMP_58._s = self, TMP_58), $a).call($b);
          res = (($a = $scope.Ellipse) == null ? $opal.cm('Ellipse') : $a).$new([x_offset, y_offset], size, fill, dotted, root);
          return res;
        };

        def.$layout_accord = function(root, beat_layout) {
          var $a, $b, TMP_59, $c, TMP_60, self = this, notes = nil, resnotes = nil, res = nil;

          notes = ($a = ($b = root.$notes()).$sort_by, $a._p = (TMP_59 = function(a){var self = TMP_59._s || this;
if (a == null) a = nil;
          return a.$pitch()}, TMP_59._s = self, TMP_59), $a).call($b);
          resnotes = ($a = ($c = notes).$map, $a._p = (TMP_60 = function(c){var self = TMP_60._s || this;
if (c == null) c = nil;
          return self.$layout_note(c, beat_layout)}, TMP_60._s = self, TMP_60), $a).call($c);
          res = [];
          res['$<<']((($a = $scope.FlowLine) == null ? $opal.cm('FlowLine') : $a).$new(resnotes.$first(), resnotes.$last(), "dashed", root));
          res['$<<'](resnotes);
          return res;
        };

        def.$layout_pause = function(root, beat_layout) {
          var $a, $b, $c, self = this, x_offset = nil, y_offset = nil, scale = nil, glyph = nil, dotted = nil, size = nil, res = nil;

          x_offset = ((($a = $scope.PITCH_OFFSET) == null ? $opal.cm('PITCH_OFFSET') : $a)['$+'](root.$pitch()))['$*']((($a = $scope.X_SPACING) == null ? $opal.cm('X_SPACING') : $a))['$+']((($a = $scope.X_OFFSET) == null ? $opal.cm('X_OFFSET') : $a));
          y_offset = beat_layout.$call(root.$beat());
          $a = $opal.to_ary((($b = $scope.REST_TO_GLYPH) == null ? $opal.cm('REST_TO_GLYPH') : $b)['$[]'](self.$duration_to_id(root.$duration()))), scale = ($a[0] == null ? nil : $a[0]), glyph = ($a[1] == null ? nil : $a[1]), dotted = ($a[2] == null ? nil : $a[2]);
          size = [(($a = $scope.REST_SIZE) == null ? $opal.cm('REST_SIZE') : $a).$first()['$*'](scale.$first()), (($a = $scope.REST_SIZE) == null ? $opal.cm('REST_SIZE') : $a).$last()['$*'](scale.$last())];
          res = (($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Drawing == null ? $b.cm('Drawing') : $b.Drawing))._scope).Glyph == null ? $a.cm('Glyph') : $a.Glyph).$new([x_offset, y_offset], size, glyph, dotted, root);
          if ((($a = root['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            res['$visible='](false)
          };
          return res;
        };

        def.$layout_measure_start = function(root, beat_layout) {
          var $a, $b, TMP_61, $c, self = this, x_offset = nil, y_offset = nil, scale = nil, fill = nil, dotted = nil, size = nil, res = nil;

          x_offset = ((($a = $scope.PITCH_OFFSET) == null ? $opal.cm('PITCH_OFFSET') : $a)['$+'](root.$pitch()))['$*']((($a = $scope.X_SPACING) == null ? $opal.cm('X_SPACING') : $a))['$+']((($a = $scope.X_OFFSET) == null ? $opal.cm('X_OFFSET') : $a));
          y_offset = beat_layout.$call(root.$beat());
          $a = $opal.to_ary((($b = $scope.DURATION_TO_STYLE) == null ? $opal.cm('DURATION_TO_STYLE') : $b)['$[]'](self.$duration_to_id(root.$duration()))), scale = ($a[0] == null ? nil : $a[0]), fill = ($a[1] == null ? nil : $a[1]), dotted = ($a[2] == null ? nil : $a[2]);
          size = ($a = ($b = (($c = $scope.ELLIPSE_SIZE) == null ? $opal.cm('ELLIPSE_SIZE') : $c)).$map, $a._p = (TMP_61 = function(e){var self = TMP_61._s || this;
if (e == null) e = nil;
          return e['$*'](scale)}, TMP_61._s = self, TMP_61), $a).call($b);
          res = (($a = $scope.Ellipse) == null ? $opal.cm('Ellipse') : $a).$new([x_offset, y_offset['$-'](size.$last())['$-'](0.5)], [size.$first(), 0.1], fill, false, root);
          if ((($a = root['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            res['$visible='](false)
          };
          return res;
        };

        def.$layout_newpart = function(root, beat_layout) {
          var $a, self = this, x_offset = nil, y_offset = nil, res = nil;
          if ($gvars.log == null) $gvars.log = nil;

          if ((($a = root.$beat()) !== nil && (!$a._isBoolean || $a == true))) {
            x_offset = ((($a = $scope.PITCH_OFFSET) == null ? $opal.cm('PITCH_OFFSET') : $a)['$+'](root.$pitch())['$+']((-0.5)))['$*']((($a = $scope.X_SPACING) == null ? $opal.cm('X_SPACING') : $a))['$+']((($a = $scope.X_OFFSET) == null ? $opal.cm('X_OFFSET') : $a));
            y_offset = beat_layout.$call(root.$beat())['$-'](((24)['$*'](self.beat_spacing)));
            res = (($a = $scope.Annotation) == null ? $opal.cm('Annotation') : $a).$new([x_offset, y_offset], root.$name(), "regular", nil);
            } else {
            $gvars.log.$warning("Part without content");
            res = nil;
          };
          return res;
        };

        def.$duration_to_id = function(duration) {
          var self = this;

          return (("d") + (duration)).$to_sym();
        };

        return (def.$make_slur_path = function(p1, p2) {
          var self = this, deltap = nil, cp_template = nil, cp1 = nil, cp2 = nil, slurpath = nil;

          deltap = p2['$-'](p1);
          cp_template = self.$Vector2d((-0.3)['$*'](deltap.$length()), 0).$rotate(deltap.$angle()).$reverse();
          cp1 = cp_template.$rotate(-0.4);
          cp2 = deltap['$+'](cp_template.$reverse().$rotate(0.4));
          return slurpath = [["M", p1.$x(), p1.$y()], ["c", cp1.$x(), cp1.$y(), cp2.$x(), cp2.$y(), deltap.$x(), deltap.$y()]];
        }, nil) && 'make_slur_path';
      })(self, null);
      
    })(self);
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/harpnotes.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range, $gvars = $opal.gvars;

  $opal.add_stubs(['$map', '$Native', '$[]', '$each', '$[]=', '$downcase', '$floor', '$/', '$%', '$<', '$+', '$==', '$!', '$*', '$new', '$reset_state', '$reset_measure_accidentals', '$match', '$parse', '$last', '$first', '$<<', '$error', '$message', '$split', '$parse_harpnote_config', '$compact', '$flatten', '$count', '$length', '$warning', '$select', '$empty?', '$to_i', '$strip', '$set_key', '$each_with_index', '$debug', '$index=', '$flatten!', '$compact!', '$send', '$nil?', '$origin=', '$make_jumplines', '$now', '$join', '$to_n', '$keys', '$meta_data=', '$harpnote_options=', '$harpnote_options', '$-', '$to_s', '$private', '$is_a?', '$origin', '$round', '$transform_rest', '$transform_real_note', '$push', '$pitch', '$visible=', '$companion=', '$first_in_part=', '$clear', '$get_midipitch', '$slur_starts=', '$slur_ends=', '$tie_start=', '$tie_end=', '$tie_start?', '$tie_end?', '$gsub', '$pop']);
  ;
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Input');

      var def = self._proto, $scope = self._scope;

      (function($base, $super) {
        function $ABCPitchToMidipitch(){};
        var self = $ABCPitchToMidipitch = $klass($base, $super, 'ABCPitchToMidipitch', $ABCPitchToMidipitch);

        var def = self._proto, $scope = self._scope;

        def.measure_accidentals = def.voice_accidentals = def.accidental_pitches = nil;
        def.$initialize = function() {
          var $a, $b, TMP_1, $c, TMP_2, self = this;

          self.tonemap = $hash2(["c", "d", "e", "f", "g", "a", "b"], {"c": 0, "d": 1, "e": 2, "f": 3, "g": 4, "a": 5, "b": 6});
          self.voice_accidentals = ($a = ($b = ($range(0, 6, false))).$map, $a._p = (TMP_1 = function(f){var self = TMP_1._s || this;
if (f == null) f = nil;
          return 0}, TMP_1._s = self, TMP_1), $a).call($b);
          self.measure_accidentals = ($a = ($c = ($range(0, 6, false))).$map, $a._p = (TMP_2 = function(f){var self = TMP_2._s || this;
if (f == null) f = nil;
          return 0}, TMP_2._s = self, TMP_2), $a).call($c);
          return self.accidental_pitches = $hash2(["sharp", "flat", "natural"], {"sharp": 1, "flat": -1, "natural": 0});
        };

        def.$set_key = function(key) {
          var $a, $b, TMP_3, $c, TMP_4, self = this, nkey = nil, accidentals = nil;

          self.voice_accidentals = ($a = ($b = ($range(0, 6, false))).$map, $a._p = (TMP_3 = function(f){var self = TMP_3._s || this;
if (f == null) f = nil;
          return 0}, TMP_3._s = self, TMP_3), $a).call($b);
          nkey = self.$Native(key);
          accidentals = self.$Native(key)['$[]']("accidentals");
          ($a = ($c = accidentals).$each, $a._p = (TMP_4 = function(accidental){var self = TMP_4._s || this, a = nil;
            if (self.voice_accidentals == null) self.voice_accidentals = nil;
            if (self.tonemap == null) self.tonemap = nil;
            if (self.accidental_pitches == null) self.accidental_pitches = nil;
if (accidental == null) accidental = nil;
          a = self.$Native(accidental);
            self.voice_accidentals['$[]='](self.tonemap['$[]'](a['$[]']("note").$downcase()), self.accidental_pitches['$[]'](a['$[]']("acc").$downcase()));
            return self;}, TMP_4._s = self, TMP_4), $a).call($c);
          return self;
        };

        def.$reset_measure_accidentals = function() {
          var $a, $b, TMP_5, self = this;

          return self.measure_accidentals = ($a = ($b = self.measure_accidentals).$map, $a._p = (TMP_5 = function(f){var self = TMP_5._s || this;
if (f == null) f = nil;
          return 0}, TMP_5._s = self, TMP_5), $a).call($b);
        };

        return (def.$get_midipitch = function(note) {
          var $a, self = this, native_note = nil, abc_pitch = nil, scale = nil, octave = nil, note_in_octave = nil, acc_by_key = nil, note_accidental = nil, pitch_delta = nil, acc_by_measure = nil, result = nil;

          native_note = self.$Native(note);
          abc_pitch = native_note['$[]']("pitch");
          scale = [0, 2, 4, 5, 7, 9, 11];
          octave = (abc_pitch['$/'](7)).$floor();
          note_in_octave = abc_pitch['$%'](7);
          if (note_in_octave['$<'](0)) {
            note_in_octave = note_in_octave['$+'](7)};
          acc_by_key = self.voice_accidentals['$[]'](note_in_octave);
          note_accidental = native_note['$[]']("accidental");
          if ((($a = (note_accidental)) !== nil && (!$a._isBoolean || $a == true))) {
            pitch_delta = self.accidental_pitches['$[]'](note_accidental);
            if (pitch_delta['$=='](0)) {
              if ((($a = self.measure_accidentals['$[]'](note_in_octave)['$=='](0)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
                pitch_delta = 0
                } else {
                pitch_delta = (-1)['$*'](self.voice_accidentals['$[]'](note_in_octave))
              }};
            self.measure_accidentals['$[]='](note_in_octave, pitch_delta);};
          acc_by_measure = self.measure_accidentals['$[]'](note_in_octave);
          result = (60)['$+']((12)['$*'](octave))['$+'](scale['$[]'](note_in_octave))['$+'](acc_by_key)['$+'](acc_by_measure);
          return result;
        }, nil) && 'get_midipitch';
      })(self, null);

      (function($base, $super) {
        function $ABCToHarpnotes(){};
        var self = $ABCToHarpnotes = $klass($base, $super, 'ABCToHarpnotes', $ABCToHarpnotes);

        var def = self._proto, $scope = self._scope;

        def.pitch_transformer = def.repetition_stack = def.previous_note = def.next_note_marks_measure = def.next_note_marks_repeat_start = def.previous_new_part = nil;
        def.$initialize = function() {
          var $a, $b, $c, self = this;

          self.pitch_transformer = (($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Input == null ? $b.cm('Input') : $b.Input))._scope).ABCPitchToMidipitch == null ? $a.cm('ABCPitchToMidipitch') : $a.ABCPitchToMidipitch).$new();
          self.jumptargets = $hash2([], {});
          return self.$reset_state();
        };

        def.$reset_state = function() {
          var self = this;

          self.next_note_marks_measure = false;
          self.next_note_marks_repeat_start = false;
          self.previous_new_part = [];
          self.previous_note = nil;
          self.repetition_stack = [];
          self.pitch_transformer.$reset_measure_accidentals();
          return nil;
        };

        def.$parse_harpnote_config = function(abc_code) {
          var $a, $b, TMP_6, self = this, hn_config_from_song = nil, line_no = nil;

          hn_config_from_song = $hash2([], {});
          line_no = 1;
          ($a = ($b = abc_code.$split("\n")).$each, $a._p = (TMP_6 = function(line){var self = TMP_6._s || this, $a, $b, TMP_7, $c, $d, entry = nil, parsed_entry = nil, e = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (line == null) line = nil;
          entry = ($a = ($b = line).$match, $a._p = (TMP_7 = function(m){var self = TMP_7._s || this;
if (m == null) m = nil;
            return [m['$[]'](1), m['$[]'](2)]}, TMP_7._s = self, TMP_7), $a).call($b, /^%%%%hn\.(print|legend|note) (.*)/);
            if (entry !== false && entry !== nil) {
              try {
              parsed_entry = (($a = $scope.JSON) == null ? $opal.cm('JSON') : $a).$parse(entry.$last());
                ($a = entry.$first(), $c = hn_config_from_song, ((($d = $c['$[]']($a)) !== false && $d !== nil) ? $d : $c['$[]=']($a, [])));
                hn_config_from_song['$[]'](entry.$first())['$<<'](parsed_entry);
              } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.Exception) == null ? $opal.cm('Exception') : $a)])) {e = $err;
                $gvars.log.$error("" + (e.$message()) + " in line " + (line_no) + " while parsing: " + (entry))
                }else { throw $err; }
              }};
            return line_no = line_no['$+'](1);}, TMP_6._s = self, TMP_6), $a).call($b);
          if ((($a = hn_config_from_song['$[]']("print")) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            hn_config_from_song['$[]=']("print", [$hash2(["t", "v", "s", "f", "j", "l"], {"t": "full sheet", "v": [1, 2, 3, 4], "s": [[1, 2], [3, 4]], "f": [1, 3], "j": [1, 3], "l": [1, 2, 3, 4]})])
          };
          if ((($a = hn_config_from_song['$[]']("legend")) !== nil && (!$a._isBoolean || $a == true))) {
            hn_config_from_song['$[]=']("legend", hn_config_from_song['$[]']("legend").$first())};
          return hn_config_from_song;
        };

        def.$transform = function(abc_code) {
          var $a, $b, TMP_8, $c, TMP_9, $d, TMP_10, $e, TMP_11, $f, TMP_12, $g, TMP_16, $h, $i, TMP_20, TMP_21, $j, TMP_22, self = this, harpnote_options = nil, warnings = nil, note_length_rows = nil, note_length = nil, tune = nil, lines = nil, first_staff = nil, key = nil, meter = nil, voices = nil, hn_voices = nil, result = nil, meta_data = nil, duration = nil, bpm = nil, duration_display = nil, meta_data_from_tune = nil;

          harpnote_options = self.$parse_harpnote_config(abc_code);
          
          var book = new ABCJS.TuneBook(abc_code);
          var parser = new ABCJS.parse.Parse();
          parser.parse(book.tunes[0].abc);
          var warnings = parser.getWarningObjects();
          var tune = parser.getTune();
          // todo handle parser warnings
          console.log(tune);
          console.log(JSON.stringify(tune));
        
          warnings = [self.$Native(warnings)].$flatten().$compact();
          ($a = ($b = warnings).$each, $a._p = (TMP_8 = function(w){var self = TMP_8._s || this, wn = nil, lines = nil, line_no = nil, char_pos = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (w == null) w = nil;
          wn = self.$Native(w);
            lines = abc_code['$[]'](1, wn['$[]']("startChar")).$split("\n");
            line_no = lines.$count();
            char_pos = lines.$last().$length();
            return $gvars.log.$warning("" + (wn['$[]']("message")) + " at line " + (wn['$[]']("line")) + " position " + (line_no) + ":" + (char_pos));}, TMP_8._s = self, TMP_8), $a).call($b);
          note_length_rows = ($a = ($c = abc_code.$split("\n")).$select, $a._p = (TMP_9 = function(row){var self = TMP_9._s || this;
if (row == null) row = nil;
          return row['$[]']($range(0, 1, false))['$==']("L:")}, TMP_9._s = self, TMP_9), $a).call($c);
          if ((($a = note_length_rows['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            note_length_rows = ["L:1/4"]};
          note_length = ($a = ($d = note_length_rows.$first().$strip().$split(":").$last().$split("/")).$map, $a._p = (TMP_10 = function(s){var self = TMP_10._s || this;
if (s == null) s = nil;
          return s.$strip().$to_i()}, TMP_10._s = self, TMP_10), $a).call($d);
          note_length = note_length.$last()['$/'](note_length.$first());
          tune = self.$Native(tune);
          lines = ($a = ($e = tune['$[]']("lines")).$select, $a._p = (TMP_11 = function(l){var self = TMP_11._s || this;
if (l == null) l = nil;
          return self.$Native(l)['$[]']("staff")}, TMP_11._s = self, TMP_11), $a).call($e);
          first_staff = self.$Native(self.$Native(lines.$first())['$[]']("staff").$first());
          key = first_staff['$[]']("key");
          self.pitch_transformer.$set_key(key);
          meter = $hash2(["type"], {"type": first_staff['$[]']("meter")['$[]']("type")});
          if (meter['$[]']("type")['$==']("specified")) {
            meter['$[]=']("den", self.$Native(first_staff['$[]']("meter")['$[]']("value").$first())['$[]']("den"));
            meter['$[]=']("num", self.$Native(first_staff['$[]']("meter")['$[]']("value").$first())['$[]']("num"));
            meter['$[]=']("display", "" + (meter['$[]']("num")) + "/" + (meter['$[]']("den")));
          } else if ((($a = meter['$[]=']("display", meter['$[]']("type"))) !== nil && (!$a._isBoolean || $a == true))) {};
          voices = [];
          ($a = ($f = lines).$each_with_index, $a._p = (TMP_12 = function(line, line_index){var self = TMP_12._s || this, $a, $b, TMP_13, voice_no = nil;
if (line == null) line = nil;if (line_index == null) line_index = nil;
          voice_no = 1;
            return ($a = ($b = self.$Native(line)['$[]']("staff")).$each_with_index, $a._p = (TMP_13 = function(staff, staff_index){var self = TMP_13._s || this, $a, $b, TMP_14;
if (staff == null) staff = nil;if (staff_index == null) staff_index = nil;
            return ($a = ($b = self.$Native(staff)['$[]']("voices")).$each_with_index, $a._p = (TMP_14 = function(voice, voice_index){var self = TMP_14._s || this, $a, $b, $c, $d, $e, $f, TMP_15;
                if ($gvars.log == null) $gvars.log = nil;
if (voice == null) voice = nil;if (voice_index == null) voice_index = nil;
              $gvars.log.$debug("reading line.staff.voice " + (voice_no) + ":" + (line_index) + " " + (staff_index) + "." + (voice_index) + " (" + ("abc_to_harpnotes") + " " + (203) + ")");
                ($a = voice_no, $b = voices, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, (($d = ((($e = ((($f = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $f))._scope).Music == null ? $e.cm('Music') : $e.Music))._scope).Voice == null ? $d.cm('Voice') : $d.Voice).$new())));
                voices['$[]'](voice_no)['$<<'](($a = ($b = voice).$map, $a._p = (TMP_15 = function(x){var self = TMP_15._s || this;
if (x == null) x = nil;
                return self.$Native(x)}, TMP_15._s = self, TMP_15), $a).call($b));
                voices['$[]'](voice_no)['$index='](voice_no);
                voices['$[]'](voice_no)['$flatten!']();
                return voice_no = voice_no['$+'](1);}, TMP_14._s = self, TMP_14), $a).call($b)}, TMP_13._s = self, TMP_13), $a).call($b);}, TMP_12._s = self, TMP_12), $a).call($f);
          voices['$compact!']();
          hn_voices = ($a = ($g = voices.$each_with_index()).$map, $a._p = (TMP_16 = function(voice, voice_idx){var self = TMP_16._s || this, $a, $b, TMP_17, $c, TMP_19, hn_voice = nil, jumplines = nil;
if (voice == null) voice = nil;if (voice_idx == null) voice_idx = nil;
          self.$reset_state();
            hn_voice = ($a = ($b = voice).$map, $a._p = (TMP_17 = function(el){var self = TMP_17._s || this, $a, $b, TMP_18, type = nil, hn_voice_element = nil;
if (el == null) el = nil;
            type = el['$[]']("el_type");
              hn_voice_element = self.$send("transform_" + (type), el);
              if ((($a = ((($b = hn_voice_element['$nil?']()) !== false && $b !== nil) ? $b : hn_voice_element['$empty?']())) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                ($a = ($b = hn_voice_element).$each, $a._p = (TMP_18 = function(e){var self = TMP_18._s || this;
if (e == null) e = nil;
                return e['$origin='](el)}, TMP_18._s = self, TMP_18), $a).call($b)
              };
              return hn_voice_element;}, TMP_17._s = self, TMP_17), $a).call($b).$flatten().$compact();
            jumplines = [];
            ($a = ($c = hn_voice).$each, $a._p = (TMP_19 = function(e){var self = TMP_19._s || this;
if (e == null) e = nil;
            return jumplines['$<<'](self.$make_jumplines(e))}, TMP_19._s = self, TMP_19), $a).call($c);
            hn_voice = hn_voice['$+'](jumplines.$flatten().$compact());
            return hn_voice;}, TMP_16._s = self, TMP_16), $a).call($g);
          result = (($a = ((($h = ((($i = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $i))._scope).Music == null ? $h.cm('Music') : $h.Music))._scope).Song == null ? $a.cm('Song') : $a.Song).$new(hn_voices, note_length);
          meta_data = $hash2(["compile_time", "meter", "key"], {"compile_time": (($a = $scope.Time) == null ? $opal.cm('Time') : $a).$now(), "meter": meter['$[]']("display"), "key": self.$Native(key)['$[]']("root")['$+'](self.$Native(key)['$[]']("acc"))['$+'](self.$Native(key)['$[]']("mode"))});
          duration = 0.25;
          bpm = 120;
          meta_data['$[]=']("tempo", $hash2(["duration", "bpm"], {"duration": [duration], "bpm": bpm}));
          meta_data['$[]=']("tempo_display", "1/" + ((1)['$/'](duration)) + " = " + (bpm));
          if ((($a = tune['$[]']("metaText")['$[]']("tempo")) !== nil && (!$a._isBoolean || $a == true))) {
            duration = (function() {try {return tune['$[]']("metaText")['$[]']("tempo")['$[]']("duration") } catch ($err) { return meta_data['$[]']("tempo")['$[]']("duration") }})();
            bpm = (function() {try {return tune['$[]']("metaText")['$[]']("tempo")['$[]']("bpm") } catch ($err) { return meta_data['$[]']("tempo")['$[]']("bpm") }})();
            meta_data['$[]=']("tempo", $hash2(["duration", "bpm"], {"duration": duration, "bpm": bpm}));
            duration_display = ($a = ($h = duration).$map, $a._p = (TMP_20 = function(d){var self = TMP_20._s || this;
if (d == null) d = nil;
            return "1/" + ((1)['$/'](d))}, TMP_20._s = self, TMP_20), $a).call($h);
            meta_data['$[]=']("tempo_display", [tune['$[]']("metaText")['$[]']("tempo")['$[]']("preString"), duration_display, "=", bpm, tune['$[]']("metaText")['$[]']("tempo")['$[]']("postString")].$join(" "));};
          meta_data_from_tune = (($a = $scope.Hash) == null ? $opal.cm('Hash') : $a).$new(tune['$[]']("metaText").$to_n());
          ($a = ($i = meta_data_from_tune.$keys()).$each, $a._p = (TMP_21 = function(k){var self = TMP_21._s || this;
if (k == null) k = nil;
          return meta_data['$[]='](k, meta_data_from_tune['$[]'](k))}, TMP_21._s = self, TMP_21), $a).call($i);
          result['$meta_data='](meta_data);
          result['$harpnote_options=']($hash2([], {}));
          result.$harpnote_options()['$[]=']("print", ($a = ($j = harpnote_options['$[]']("print")).$map, $a._p = (TMP_22 = function(o){var self = TMP_22._s || this, $a, $b, TMP_23, $c, TMP_24, $d, TMP_26, $e, TMP_27, $f, TMP_28, $g, TMP_29, ro = nil, missing_voices = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (o == null) o = nil;
          ro = $hash2(["title", "voices", "synchlines", "flowlines", "jumplines", "layoutlines"], {"title": o['$[]']("t"), "voices": ($a = ($b = o['$[]']("v")).$map, $a._p = (TMP_23 = function(i){var self = TMP_23._s || this;
if (i == null) i = nil;
            return i['$-'](1)}, TMP_23._s = self, TMP_23), $a).call($b), "synchlines": ($a = ($c = o['$[]']("s")).$map, $a._p = (TMP_24 = function(i){var self = TMP_24._s || this, $a, $b, TMP_25;
if (i == null) i = nil;
            return ($a = ($b = i).$map, $a._p = (TMP_25 = function(j){var self = TMP_25._s || this;
if (j == null) j = nil;
              return j['$-'](1)}, TMP_25._s = self, TMP_25), $a).call($b)}, TMP_24._s = self, TMP_24), $a).call($c), "flowlines": ($a = ($d = o['$[]']("f")).$map, $a._p = (TMP_26 = function(i){var self = TMP_26._s || this;
if (i == null) i = nil;
            return i['$-'](1)}, TMP_26._s = self, TMP_26), $a).call($d), "jumplines": ($a = ($e = o['$[]']("j")).$map, $a._p = (TMP_27 = function(i){var self = TMP_27._s || this;
if (i == null) i = nil;
            return i['$-'](1)}, TMP_27._s = self, TMP_27), $a).call($e), "layoutlines": ($a = ($f = (((($g = o['$[]']("l")) !== false && $g !== nil) ? $g : o['$[]']("v")))).$map, $a._p = (TMP_28 = function(i){var self = TMP_28._s || this;
if (i == null) i = nil;
            return i['$-'](1)}, TMP_28._s = self, TMP_28), $a).call($f)});
            missing_voices = ($a = ($g = (ro['$[]']("voices")['$-'](ro['$[]']("layoutlines")))).$map, $a._p = (TMP_29 = function(i){var self = TMP_29._s || this;
if (i == null) i = nil;
            return i['$+'](1)}, TMP_29._s = self, TMP_29), $a).call($g);
            if ((($a = missing_voices['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              $gvars.log.$error("hn.print '" + (ro['$[]']("title")) + "' l: missing voices " + (missing_voices.$to_s()))
            };
            return ro;}, TMP_22._s = self, TMP_22), $a).call($j));
          result.$harpnote_options()['$[]=']("legend", harpnote_options['$[]']("legend"));
          result.$harpnote_options()['$[]=']("notes", ((($a = harpnote_options['$[]']("note")) !== false && $a !== nil) ? $a : []));
          return result;
        };

        self.$private();

        def.$make_jumplines = function(entity) {
          var $a, $b, $c, $d, TMP_30, self = this, result = nil, chords = nil;

          result = [];
          if ((($a = entity['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Music == null ? $c.cm('Music') : $c.Music))._scope).Playable == null ? $b.cm('Playable') : $b.Playable))) !== nil && (!$a._isBoolean || $a == true))) {
            chords = ((($a = entity.$origin()['$[]']("chord")) !== false && $a !== nil) ? $a : []);
            ($a = ($b = chords).$each, $a._p = (TMP_30 = function(chord){var self = TMP_30._s || this, $a, $b, $c, name = nil, nameparts = nil, target = nil, argument = nil;
              if (self.jumptargets == null) self.jumptargets = nil;
              if ($gvars.log == null) $gvars.log = nil;
if (chord == null) chord = nil;
            name = self.$Native(chord)['$[]']("name");
              if (name['$[]'](0)['$==']("@")) {
                nameparts = name['$[]']($range(1, -1, false)).$split("@");
                target = self.jumptargets['$[]'](nameparts.$first());
                argument = ((($a = nameparts.$last().$to_i()) !== false && $a !== nil) ? $a : 1);
                if ((($a = target['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
                  return $gvars.log.$error("missing target " + (name['$[]']($range(1, -1, false))))
                  } else {
                  return result['$<<']((($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Music == null ? $b.cm('Music') : $b.Music))._scope).Dacapo == null ? $a.cm('Dacapo') : $a.Dacapo).$new(target, entity, $hash2(["distance"], {"distance": argument})))
                };
                } else {
                return nil
              };}, TMP_30._s = self, TMP_30), $a).call($b);};
          return result;
        };

        def.$transform_note = function(note) {
          var $a, $b, TMP_31, self = this, duration = nil, result = nil, jumpstarts = nil, jumpends = nil;

          duration = ((64)['$*'](note['$[]']("duration"))).$round();
          if ((($a = note['$[]']("rest")['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            if (note['$[]']("rest")['$[]']("type")['$==']("spacer")) {
              result = []
              } else {
              result = self.$transform_rest(note, duration)
            }
            } else {
            result = self.$transform_real_note(note, duration)
          };
          if ((($a = result['$empty?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = self.repetition_stack['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              self.repetition_stack['$<<'](result.$last())};
            if ((($a = note['$[]']("chord")['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              jumpstarts = [];
              jumpends = [];
              ($a = ($b = note['$[]']("chord")).$each, $a._p = (TMP_31 = function(chord){var self = TMP_31._s || this, $a, $b, TMP_32, name = nil;
                if (self.jumptargets == null) self.jumptargets = nil;
if (chord == null) chord = nil;
              name = self.$Native(chord)['$[]']("name");
                if (name['$[]'](0)['$=='](":")) {
                  jumpends.$push(name['$[]']($range(1, -1, false)));
                  self.jumptargets['$[]='](name['$[]']($range(1, -1, false)), ($a = ($b = result).$select, $a._p = (TMP_32 = function(n){var self = TMP_32._s || this, $a, $b, $c;
if (n == null) n = nil;
                  return n['$is_a?']((($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Music == null ? $b.cm('Music') : $b.Music))._scope).Playable == null ? $a.cm('Playable') : $a.Playable))}, TMP_32._s = self, TMP_32), $a).call($b).$last());};
                if (name['$[]'](0)['$==']("@")) {
                  return jumpstarts.$push(name['$[]']($range(1, -1, false)))
                  } else {
                  return nil
                };}, TMP_31._s = self, TMP_31), $a).call($b);
            };};
          return result;
        };

        def.$transform_rest = function(note, duration) {
          var $a, $b, $c, TMP_33, self = this, pitch = nil, res = nil, result = nil;

          if ((($a = self.previous_note) !== nil && (!$a._isBoolean || $a == true))) {
            pitch = self.previous_note.$pitch()
            } else {
            pitch = 60
          };
          res = (($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Music == null ? $b.cm('Music') : $b.Music))._scope).Pause == null ? $a.cm('Pause') : $a.Pause).$new(pitch, duration);
          res['$origin='](note);
          if (note['$[]']("rest")['$[]']("type")['$==']("invisible")) {
            res['$visible='](false)};
          self.previous_note = res;
          result = [res];
          if ((($a = self.next_note_marks_measure) !== nil && (!$a._isBoolean || $a == true))) {
            result['$<<']((($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Music == null ? $b.cm('Music') : $b.Music))._scope).MeasureStart == null ? $a.cm('MeasureStart') : $a.MeasureStart).$new(res));
            self.next_note_marks_measure = false;};
          if ((($a = self.next_note_marks_repeat_start) !== nil && (!$a._isBoolean || $a == true))) {
            self.repetition_stack['$<<'](res);
            self.next_note_marks_repeat_start = false;};
          ($a = ($b = self.previous_new_part).$each, $a._p = (TMP_33 = function(part){var self = TMP_33._s || this;
if (part == null) part = nil;
          part['$companion='](res);
            return res['$first_in_part='](true);}, TMP_33._s = self, TMP_33), $a).call($b);
          self.previous_new_part.$clear();
          return result;
        };

        def.$transform_real_note = function(note, duration) {
          var $a, $b, TMP_34, $c, $d, TMP_36, $e, TMP_37, $f, TMP_38, $g, TMP_39, self = this, notes = nil, res = nil, synchpoint = nil;

          notes = ($a = ($b = self.$Native(note['$[]']("pitches"))).$map, $a._p = (TMP_34 = function(pitch){var self = TMP_34._s || this, $a, $b, $c, TMP_35, midipitch = nil, native_pitch = nil, thenote = nil;
            if (self.pitch_transformer == null) self.pitch_transformer = nil;
if (pitch == null) pitch = nil;
          midipitch = self.pitch_transformer.$get_midipitch(pitch);
            native_pitch = self.$Native(pitch);
            thenote = (($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Music == null ? $b.cm('Music') : $b.Music))._scope).Note == null ? $a.cm('Note') : $a.Note).$new(midipitch, duration);
            thenote['$origin='](note);
            thenote['$slur_starts='](($a = ($b = (((($c = native_pitch['$[]']("startSlur")) !== false && $c !== nil) ? $c : []))).$map, $a._p = (TMP_35 = function(s){var self = TMP_35._s || this;
if (s == null) s = nil;
            return self.$Native(s)['$[]']("label")}, TMP_35._s = self, TMP_35), $a).call($b));
            thenote['$slur_ends='](((($a = native_pitch['$[]']("endSlur")) !== false && $a !== nil) ? $a : []));
            thenote['$tie_start=']((native_pitch['$[]']("startTie")['$nil?']()['$!']()));
            thenote['$tie_end=']((native_pitch['$[]']("endTie")['$nil?']()['$!']()));
            return thenote;}, TMP_34._s = self, TMP_34), $a).call($b);
          res = [];
          if (notes.$length()['$=='](1)) {
            res['$<<'](notes.$first())
            } else {
            synchpoint = (($a = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Music == null ? $c.cm('Music') : $c.Music))._scope).SynchPoint == null ? $a.cm('SynchPoint') : $a.SynchPoint).$new(notes);
            synchpoint['$slur_starts='](($a = ($c = (((($d = note['$[]']("startSlur")) !== false && $d !== nil) ? $d : []))).$map, $a._p = (TMP_36 = function(s){var self = TMP_36._s || this;
if (s == null) s = nil;
            return self.$Native(s)['$[]']("label")}, TMP_36._s = self, TMP_36), $a).call($c));
            synchpoint['$slur_ends='](((($a = note['$[]']("endSlur")) !== false && $a !== nil) ? $a : []));
            synchpoint['$tie_start='](((($a = (note['$[]']("startTie")['$nil?']()['$!']())) !== false && $a !== nil) ? $a : (($d = ($e = notes).$select, $d._p = (TMP_37 = function(n){var self = TMP_37._s || this;
if (n == null) n = nil;
            return n['$tie_start?']()}, TMP_37._s = self, TMP_37), $d).call($e)['$empty?']()['$!']())));
            synchpoint['$tie_end='](((($a = (note['$[]']("endTie")['$nil?']()['$!']())) !== false && $a !== nil) ? $a : (($d = ($f = notes).$select, $d._p = (TMP_38 = function(n){var self = TMP_38._s || this;
if (n == null) n = nil;
            return n['$tie_end?']()}, TMP_38._s = self, TMP_38), $d).call($f)['$empty?']()['$!']())));
            res['$<<'](synchpoint);
          };
          self.previous_note = res.$last();
          if ((($a = self.next_note_marks_measure) !== nil && (!$a._isBoolean || $a == true))) {
            res['$<<']((($a = ((($d = ((($g = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $g))._scope).Music == null ? $d.cm('Music') : $d.Music))._scope).MeasureStart == null ? $a.cm('MeasureStart') : $a.MeasureStart).$new(notes.$last()));
            self.next_note_marks_measure = false;};
          if ((($a = self.next_note_marks_repeat_start) !== nil && (!$a._isBoolean || $a == true))) {
            self.repetition_stack['$<<'](notes.$last());
            self.next_note_marks_repeat_start = false;};
          ($a = ($d = self.previous_new_part).$each, $a._p = (TMP_39 = function(part){var self = TMP_39._s || this;
if (part == null) part = nil;
          part['$companion='](notes.$last());
            return notes.$last()['$first_in_part='](true);}, TMP_39._s = self, TMP_39), $a).call($d);
          self.previous_new_part.$clear();
          return res;
        };

        def.$transform_bar = function(bar) {
          var self = this, type = nil;

          type = bar['$[]']("type");
          self.next_note_marks_measure = true;
          self.pitch_transformer.$reset_measure_accidentals();
          return self.$send("transform_" + (type.$gsub(" ", "_")), bar);
        };

        def.$transform_bar_thin = function(bar) {
          var self = this;

          self.next_note_marks_measure = true;
          return nil;
        };

        def.$transform_bar_left_repeat = function(bar) {
          var self = this;

          self.next_note_marks_repeat_start = true;
          return nil;
        };

        def.$transform_bar_thin_thick = function(bar) {
          var self = this;

          self.next_note_marks_measure = true;
          return nil;
        };

        def.$transform_bar_right_repeat = function(bar) {
          var $a, $b, $c, self = this, start = nil;

          if (self.repetition_stack.$length()['$=='](1)) {
            start = self.repetition_stack.$last()
            } else {
            start = self.repetition_stack.$pop()
          };
          return [(($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Music == null ? $b.cm('Music') : $b.Music))._scope).Dacapo == null ? $a.cm('Dacapo') : $a.Dacapo).$new(start, self.previous_note, $hash2(["level"], {"level": self.repetition_stack.$length()}))];
        };

        def.$transform_part = function(part) {
          var $a, $b, $c, self = this, new_part = nil;

          new_part = (($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Music == null ? $b.cm('Music') : $b.Music))._scope).NewPart == null ? $a.cm('NewPart') : $a.NewPart).$new(part['$[]']("title"));
          self.previous_new_part['$<<'](new_part);
          return [new_part];
        };

        return (def.$method_missing = function(name, args) {
          var self = this;
          if ($gvars.log == null) $gvars.log = nil;

          args = $slice.call(arguments, 1);
          $gvars.log.$debug("Missing transformation rule: " + (name) + " (" + ("abc_to_harpnotes") + " " + (483) + ")");
          return nil;
        }, nil) && 'method_missing';
      })(self, null);
      
    })(self)
    
  })(self);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/abc_to_harpnotes.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2;

  $opal.add_stubs(['$attr_accessor', '$[]=', '$Native', '$new', '$path']);
  return (function($base) {
    var self = $module($base, 'Raphael');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Element(){};
      var self = $Element = $klass($base, $super, 'Element', $Element);

      var def = self._proto, $scope = self._scope, TMP_1;

      self.$attr_accessor("unhighlight_color");

      def.$initialize = function(r) {
        var self = this;

        self.r = r;
        return self['$[]=']("stroke-width", 0.5);
      };

      def['$[]'] = function(name) {
        var self = this;

        return self.r.attr(name);
      };

      def['$[]='] = function(name, value) {
        var self = this;

        return self.r.attr(name, value);
      };

      def.$translate = function(x, y) {
        var self = this;

        return self.r.translate(x, y);
      };

      def.$transform = function(cmd) {
        var self = this;

        return self.r.transform(cmd);
      };

      def.$get_bbox = function() {
        var self = this;

        return self.$Native(self.r.getBBox());
      };

      return (def.$on_click = TMP_1 = function() {
        var self = this, $iter = TMP_1._p, block = $iter || nil;

        TMP_1._p = null;
        
        var wrapper = function(evt) {
          return block.apply(null, arguments);
        };
        self.r.click(wrapper);
      
      }, nil) && 'on_click';
    })(self, null);

    (function($base, $super) {
      function $Paper(){};
      var self = $Paper = $klass($base, $super, 'Paper', $Paper);

      var def = self._proto, $scope = self._scope;

      def.r = nil;
      def.$initialize = function(element, width, height) {
        var self = this;

        return self.r = Raphael(element, width, height);
      };

      def.$raw = function() {
        var self = this;

        return self.r;
      };

      def.$clear = function() {
        var self = this;

        return self.r.clear();
      };

      def.$ellipse = function(x, y, rx, ry) {
        var $a, $b, self = this;

        return (($a = ((($b = $scope.Raphael) == null ? $opal.cm('Raphael') : $b))._scope).Element == null ? $a.cm('Element') : $a.Element).$new(self.r.ellipse(x, y, rx, ry));
      };

      def.$path = function(spec) {
        var $a, $b, self = this;

        return (($a = ((($b = $scope.Raphael) == null ? $opal.cm('Raphael') : $b))._scope).Element == null ? $a.cm('Element') : $a.Element).$new(self.r.path(spec));
      };

      def.$rect = function(x, y, rx, ry, radius) {
        var $a, $b, self = this;

        if (radius == null) {
          radius = 0
        }
        return (($a = ((($b = $scope.Raphael) == null ? $opal.cm('Raphael') : $b))._scope).Element == null ? $a.cm('Element') : $a.Element).$new(self.r.rect(x, y, rx, ry, radius));
      };

      def.$set_view_box = function(x, y, width, height, fit) {
        var self = this;

        return self.r.setViewBox(x, y, width, height, fit);
      };

      def.$line = function(x1, y1, x2, y2) {
        var self = this;

        return self.$path("M" + (x1) + "," + (y1) + "L" + (x2) + "," + (y2));
      };

      def.$text = function(x, y, text, attributes) {
        var $a, $b, self = this;

        if (attributes == null) {
          attributes = $hash2([], {})
        }
        return x = (($a = ((($b = $scope.Raphael) == null ? $opal.cm('Raphael') : $b))._scope).Element == null ? $a.cm('Element') : $a.Element).$new(self.r.text(x, y, text));
      };

      def.$size = function() {
        var self = this;

        return [self.r.canvas.offsetWidth, self.r.canvas.offsetHeight];
      };

      return (def.$enable_pan_zoom = function() {
        var $a, self = this;

        if ((($a = self.r.panzoom != undefined) !== nil && (!$a._isBoolean || $a == true))) {
          return self.r.panzoom().enable();
          } else {
          return nil
        };
      }, nil) && 'enable_pan_zoom';
    })(self, null);
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-raphael.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$attr_accessor', '$apply_offset_to_point', '$nil?', '$apply_offset_to_x', '$==', '$+', '$/', '$-', '$private', '$first', '$last']);
  ;
  
jsPDF.API.setLineDash = function(dashArray, dashPhase) {
  if(dashArray == undefined) {
    this.internal.write('[] 0 d')
  } else {
    this.internal.write('[' + dashArray + '] ' + dashPhase + ' d')
  }

  return this;
};

  return (function($base, $super) {
    function $JsPDF(){};
    var self = $JsPDF = $klass($base, $super, 'JsPDF', $JsPDF);

    var def = self._proto, $scope = self._scope;

    def.native_jspdf = def.x_offset = nil;
    self.$attr_accessor("x_offset");

    def.$initialize = function(orientation, unit, format) {
      var self = this;

      if (orientation == null) {
        orientation = "p"
      }
      if (unit == null) {
        unit = "mm"
      }
      if (format == null) {
        format = "a4"
      }
      self.x_offset = 0;
      return self.native_jspdf = new jsPDF(orientation, unit, format);
    };

    def.$line = function(from, to) {
      var self = this, nfrom = nil, nto = nil;

      nfrom = self.$apply_offset_to_point(from);
      nto = self.$apply_offset_to_point(to);
      return self.native_jspdf.lines([ [ nto[0] - nfrom[0], nto[1] - nfrom[1] ] ], nfrom[0], nfrom[1]);
    };

    def['$line_cap='] = function(value) {
      var self = this;

      return self.native_jspdf.setLineCap(value);
    };

    def.$ellipse = function(center, size, style) {
      var self = this, ncenter = nil;

      if (style == null) {
        style = undefined
      }
      ncenter = self.$apply_offset_to_point(center);
      return self.native_jspdf.ellipse(ncenter[0], ncenter[1], size[0], size[1], style);
    };

    def['$fill='] = function(rgb) {
      var self = this;

      return self.native_jspdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    };

    def['$stroke='] = function(rgb) {
      var self = this;

      return self.native_jspdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
    };

    def['$text_color='] = function(rgb) {
      var self = this;

      return self.native_jspdf.setTextColor(rgb[0], rgb[1], rgb[2]);
    };

    def['$font_size='] = function(size) {
      var self = this;

      return self.native_jspdf.setFontSize(size);
    };

    def['$font_style='] = function(style) {
      var self = this;

      return self.native_jspdf.setFontStyle(style);
    };

    def.$use_solid_lines = function() {
      var self = this;

      return self.native_jspdf.setLineDash('', 0);
    };

    def['$line_dash='] = function(dist) {
      var $a, self = this;

      if (dist == null) {
        dist = 3
      }
      if ((($a = dist['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        dist = undefined};
      return self.native_jspdf.setLineDash(dist, dist);
    };

    def.$text = function(x, y, text, flags) {
      var self = this, nx = nil;

      if (flags == null) {
        flags = nil
      }
      nx = self.$apply_offset_to_x(x);
      return self.native_jspdf.text(nx, y, text, flags);
    };

    def.$rect_like_ellipse = function(center, size, style) {
      var self = this, ncenter = nil;

      if (style == null) {
        style = "undefined"
      }
      ncenter = self.$apply_offset_to_point(center);
      return self.native_jspdf.rect(ncenter[0], ncenter[1], size[0], size[1], style);
    };

    def.$rect = function(x1, y1, x2, y2, style) {
      var self = this, nx1 = nil;

      if (style == null) {
        style = "undefined"
      }
      nx1 = self.$apply_offset_to_x(x1);
      return self.native_jspdf.rect(nx1, y1, x2, y2, style);
    };

    def.$lines = function(lines, x, y, scale, style, close) {
      var self = this, nx = nil;

      nx = self.$apply_offset_to_x(x);
      return self.native_jspdf.lines(lines, nx, y, scale, style, close);
    };

    def.$output = function(type, options) {
      var $a, self = this;

      if (type == null) {
        type = "raw"
      }
      if (options == null) {
        options = nil
      }
      if (type['$==']("raw")) {
        type = undefined};
      if ((($a = options['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        options = undefined};
      return self.native_jspdf.output(type, options);
    };

    def.$left_arrowhead = function(x, y) {
      var self = this, delta = nil, x0 = nil, x1 = nil, y_top = nil, y_bottom = nil;

      delta = 1.0;
      x0 = self.$apply_offset_to_x(x);
      x1 = self.$apply_offset_to_x(x['$+'](delta));
      y_top = y['$+'](delta['$/'](2.0));
      y_bottom = y['$-'](delta['$/'](2.0));
      return self.native_jspdf.triangle(x0, y, x1, y_top, x1, y_bottom, x0, y, 'FD');
    };

    def.$addPage = function() {
      var self = this;

      return self.native_jspdf.addPage();
    };

    self.$private();

    def.$apply_offset_to_point = function(point) {
      var self = this;

      return [point.$first()['$+'](self.x_offset), point.$last()];
    };

    return (def.$apply_offset_to_x = function(x) {
      var self = this;

      return x['$+'](self.x_offset);
    }, nil) && 'apply_offset_to_x';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-jspdf.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass;

  $opal.add_stubs(['$new', '$to_blob']);
  return (function($base) {
    var self = $module($base, 'JSZip');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $ZipFile(){};
      var self = $ZipFile = $klass($base, $super, 'ZipFile', $ZipFile);

      var def = self._proto, $scope = self._scope;

      def.$initialize = function() {
        var self = this;

        return self.zip = new JSZip();
      };

      def.$folder = function(name) {
        var $a, self = this;

        return (($a = $scope.Folder) == null ? $opal.cm('Folder') : $a).$new(self.zip.folder(name));
      };

      def.$file = function(name, content) {
        var self = this;

        return self.zip.file(name, content);
      };

      def.$to_blob = function() {
        var self = this;

        return self.zip.generate({type:"blob"});
      };

      def.$to_blob_url = function() {
        var self = this, blob = nil;

        blob = self.$to_blob();
        return window.URL.createObjectURL(blob);
      };

      return (def.$to_base64 = function() {
        var self = this;

        return self.zip.generate();
      }, nil) && 'to_base64';
    })(self, null);

    (function($base, $super) {
      function $Folder(){};
      var self = $Folder = $klass($base, $super, 'Folder', $Folder);

      var def = self._proto, $scope = self._scope;

      def.$initialize = function(folder) {
        var self = this;

        return self.folder = folder;
      };

      return (def.$file = function(name, content) {
        var self = this;

        return self.folder.file(name, content);
      }, nil) && 'file';
    })(self, null);
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-jszip.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2;

  $opal.add_stubs(['$Native', '$find', '$new', '$raw', '$to_n']);
  return (function($base) {
    var self = $module($base, 'ABCJS');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Write');

      var def = self._proto, $scope = self._scope;

      (function($base, $super) {
        function $Printer(){};
        var self = $Printer = $klass($base, $super, 'Printer', $Printer);

        var def = self._proto, $scope = self._scope, TMP_1;

        def.$initialize = function(div, printerparams) {
          var $a, $b, self = this, paper = nil, pp = nil;

          if (printerparams == null) {
            printerparams = $hash2([], {})
          }
          self.parent = self.$Native((($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find("#" + (div)));
          paper = (($a = ((($b = $scope.Raphael) == null ? $opal.cm('Raphael') : $b))._scope).Paper == null ? $a.cm('Paper') : $a.Paper).$new(div, 1100, 700);
          self.paper = paper.$raw();
          pp = printerparams.$to_n();
          return self.printer = new ABCJS.write.Printer(self.paper, pp);
        };

        def.$on_select = TMP_1 = function() {
          var self = this, $iter = TMP_1._p, block = $iter || nil;

          TMP_1._p = null;
          
            self.printer.addSelectListener(
              {// anonymous object!
               highlight: function(abcelem){
                 block.apply(null , [abcelem]);
                }
              }
            )
          
        };

        def.$range_highlight = function(from, to) {
          var self = this;

          
        self.printer.rangeHighlight(from, to);
        
          return nil;
        };

        def.$range_highlight_more = function(from, to) {
          var self = this;

          
        self.printer.rangeHighlightMore(from, to);
        
          return nil;
        };

        def.$range_unhighlight_more = function(from, to) {
          var self = this;

          
        self.printer.rangeUnhighlightMore(from, to);
        
          return nil;
        };

        return (def.$draw = function(abc_code) {
          var self = this;

          

        var book = new ABCJS.TuneBook(abc_code);
        var parser = new ABCJS.parse.Parse();
        parser.parse(abc_code);
        var tune = parser.getTune();


        // memoize the some container properties
        // note that printABC changes the width of the surrounding div :-(
        var top = self.parent.scrollTop();
        var width = self.parent.width();

        self.paper.clear();
        self.printer.printABC(tune)

        // reset the aforehead mentioned container poperties
        self.parent.scrollTop(top);
        self.parent.width(width);
        
        }, nil) && 'draw';
      })(self, null)
      
    })(self)
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-abcjs.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass;

  $opal.add_stubs([]);
  return (function($base) {
    var self = $module($base, 'Musicaljs');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Instrument(){};
      var self = $Instrument = $klass($base, $super, 'Instrument', $Instrument);

      var def = self._proto, $scope = self._scope;

      def.$initialize = function(options) {
        var self = this;

        self.instrument = new Instrument(options);
        return self.isplaying = false;
      };

      def.$play = function(options, abc_text) {
        var self = this;

        return self.instrument.play(options, abc_text);
      };

      return (def.$tone = function(pitch, velocity, duration, delay, timbre) {
        var self = this;

        return self.instrument.tone(pitch, velocity, duration, delay, timbre);
      }, nil) && 'tone';
    })(self, null)
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-musicaljs.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $gvars = $opal.gvars, $range = $opal.range;

  $opal.add_stubs(['$include', '$attr_reader', '$new', '$set_view_box', '$clear', '$rect', '$each', '$is_a?', '$visible?', '$draw_ellipse', '$draw_flowline', '$draw_jumpline', '$draw_glyph', '$draw_annotation', '$draw_path', '$debug', '$class', '$children', '$unhighlight_element', '$highlight_element', '$get_elements_by_range', '$private', '$inject', '$+', '$first', '$join', '$[]', '$each_key', '$Native', '$origin', '$nil?', '$>', '$<', '$===', '$push', '$unhighlight_color=', '$[]=', '$include?', '$-', '$unhighlight_color', '$<<', '$ellipse', '$center', '$last', '$size', '$push_element', '$==', '$fill', '$dotted?', '$*', '$on_click', '$call', '$path_to_raphael', '$glyph', '$transform', '$/', '$path', '$get_bbox', '$-@', '$line', '$from', '$to', '$style', '$distance', '$level', '$translate', '$text']);
  ;
  ;
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $RaphaelEngine(){};
      var self = $RaphaelEngine = $klass($base, $super, 'RaphaelEngine', $RaphaelEngine);

      var def = self._proto, $scope = self._scope, $a, $b, TMP_2;

      def.paper = def.highlighted = def.elements = nil;
      self.$include((($a = ((($b = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $b))._scope).Drawing == null ? $a.cm('Drawing') : $a.Drawing));

      self.$attr_reader("paper");

      $opal.cdecl($scope, 'PADDING', 5);

      $opal.cdecl($scope, 'ARROW_SIZE', 1.0);

      $opal.cdecl($scope, 'JUMPLINE_INDENT', 10);

      $opal.cdecl($scope, 'DOTTED_SIZE', 0.3);

      def.$initialize = function(element_id, width, height) {
        var $a, $b, self = this;

        self.paper = (($a = ((($b = $scope.Raphael) == null ? $opal.cm('Raphael') : $b))._scope).Paper == null ? $a.cm('Paper') : $a.Paper).$new(element_id, width, height);
        self.on_select = nil;
        self.elements = $hash2([], {});
        return self.highlighted = [];
      };

      def.$set_view_box = function(x, y, width, height) {
        var self = this;

        return self.paper.$set_view_box(x, y, width, height, true);
      };

      def.$draw = function(sheet) {
        var $a, $b, TMP_1, self = this;

        self.paper.$clear();
        self.elements = $hash2([], {});
        self.highlighted = [];
        self.paper.$rect(1.0, 1.0, 418, 295);
        self.paper.$rect(0.0, 0.0, 420.0, 297.0);
        return ($a = ($b = sheet.$children()).$each, $a._p = (TMP_1 = function(child){var self = TMP_1._s || this, $a, $b, $c, $d;
          if ($gvars.log == null) $gvars.log = nil;
if (child == null) child = nil;
        if ((($a = child['$is_a?']((($b = $scope.Ellipse) == null ? $opal.cm('Ellipse') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_ellipse(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = $scope.FlowLine) == null ? $opal.cm('FlowLine') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_flowline(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = $scope.JumpLine) == null ? $opal.cm('JumpLine') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_jumpline(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Drawing == null ? $c.cm('Drawing') : $c.Drawing))._scope).Glyph == null ? $b.cm('Glyph') : $b.Glyph))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_glyph(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Drawing == null ? $c.cm('Drawing') : $c.Drawing))._scope).Annotation == null ? $b.cm('Annotation') : $b.Annotation))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_annotation(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Drawing == null ? $c.cm('Drawing') : $c.Drawing))._scope).Path == null ? $b.cm('Path') : $b.Path))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_path(child)
              } else {
              return nil
            }
            } else {
            $gvars.log.$debug("don't know how to draw " + (child.$class()) + " (" + ("raphael_engine") + " " + (49) + ")");
            return nil;
          }}, TMP_1._s = self, TMP_1), $a).call($b);
      };

      def.$on_select = TMP_2 = function() {
        var self = this, $iter = TMP_2._p, block = $iter || nil;

        TMP_2._p = null;
        return self.on_select = block;
      };

      def.$unhighlight_all = function() {
        var $a, $b, TMP_3, self = this;

        return ($a = ($b = self.highlighted).$each, $a._p = (TMP_3 = function(e){var self = TMP_3._s || this;
if (e == null) e = nil;
        return self.$unhighlight_element(e)}, TMP_3._s = self, TMP_3), $a).call($b);
      };

      def.$range_highlight = function(from, to) {
        var $a, $b, TMP_4, self = this;

        return ($a = ($b = self.$get_elements_by_range(from, to)).$each, $a._p = (TMP_4 = function(element){var self = TMP_4._s || this;
if (element == null) element = nil;
        return self.$highlight_element(element)}, TMP_4._s = self, TMP_4), $a).call($b);
      };

      def.$range_unhighlight = function(from, to) {
        var $a, $b, TMP_5, self = this;

        return ($a = ($b = self.$get_elements_by_range(from, to)).$each, $a._p = (TMP_5 = function(element){var self = TMP_5._s || this;
if (element == null) element = nil;
        return self.$unhighlight_element(element)}, TMP_5._s = self, TMP_5), $a).call($b);
      };

      self.$private();

      def.$path_to_raphael = function(path) {
        var $a, $b, TMP_6, self = this, result = nil;

        result = ($a = ($b = path).$inject, $a._p = (TMP_6 = function(result, element){var self = TMP_6._s || this;
if (result == null) result = nil;if (element == null) element = nil;
        result = result['$+'](element.$first());
          return result = result['$+'](element['$[]']($range(1, -1, false)).$join(" "));}, TMP_6._s = self, TMP_6), $a).call($b, "");
        return result;
      };

      def.$get_elements_by_range = function(from, to) {
        var $a, $b, TMP_7, self = this, result = nil;

        result = [];
        ($a = ($b = self.elements).$each_key, $a._p = (TMP_7 = function(k){var self = TMP_7._s || this, $a, $b, $c, TMP_8, origin = nil, el_start = nil, el_end = nil;
          if (self.elements == null) self.elements = nil;
if (k == null) k = nil;
        origin = self.$Native(k.$origin());
          if ((($a = origin['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return nil
            } else {
            el_start = self.$Native(k.$origin())['$[]']("startChar");
            el_end = self.$Native(k.$origin())['$[]']("endChar");
            if ((($a = (((($b = ((($c = to['$>'](el_start)) ? from['$<'](el_end) : $c))) !== false && $b !== nil) ? $b : (($c = (to['$==='](from)), $c !== false && $c !== nil ?to['$==='](el_end) : $c))))) !== nil && (!$a._isBoolean || $a == true))) {
              return ($a = ($b = self.elements['$[]'](k)).$each, $a._p = (TMP_8 = function(e){var self = TMP_8._s || this;
if (e == null) e = nil;
              return result.$push(e)}, TMP_8._s = self, TMP_8), $a).call($b)
              } else {
              return nil
            };
          };}, TMP_7._s = self, TMP_7), $a).call($b);
        return result;
      };

      def.$highlight_element = function(element) {
        var self = this;

        self.$unhighlight_element(element);
        self.highlighted.$push(element);
        element['$unhighlight_color='](element['$[]']("fill"));
        element['$[]=']("fill", "#ff0000");
        element['$[]=']("stroke", "#ff0000");
        return nil;
      };

      def.$unhighlight_element = function(element) {
        var $a, self = this;

        if ((($a = self.highlighted['$include?'](element)) !== nil && (!$a._isBoolean || $a == true))) {
          self.highlighted = self.highlighted['$-']([element]);
          element['$[]=']("fill", element.$unhighlight_color());
          element['$[]=']("stroke", "#000000");};
        return nil;
      };

      def.$push_element = function(root, element) {
        var $a, $b, $c, self = this;

        ($a = root, $b = self.elements, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, [])));
        return self.elements['$[]'](root)['$<<'](element);
      };

      def.$draw_ellipse = function(root) {
        var $a, $b, TMP_9, $c, TMP_10, self = this, e = nil, x = nil, y = nil, e_dot = nil;

        e = self.paper.$ellipse(root.$center().$first(), root.$center().$last(), root.$size().$first(), root.$size().$last());
        self.$push_element(root.$origin(), e);
        e['$[]=']("fill", (function() {if (root.$fill()['$==']("filled")) {
          return "black"
          } else {
          return "white"
        }; return nil; })());
        if ((($a = root['$dotted?']()) !== nil && (!$a._isBoolean || $a == true))) {
          x = root.$center().$first()['$+']((root.$size().$first()['$*'](1.2)));
          y = root.$center().$last()['$+']((root.$size().$last()['$*'](1.2)));
          e_dot = self.paper.$ellipse(x, y, (($a = $scope.DOTTED_SIZE) == null ? $opal.cm('DOTTED_SIZE') : $a), (($a = $scope.DOTTED_SIZE) == null ? $opal.cm('DOTTED_SIZE') : $a));
          e_dot['$[]=']("fill", "black");
          self.$push_element(root.$origin(), e_dot);
          ($a = ($b = e_dot).$on_click, $a._p = (TMP_9 = function(){var self = TMP_9._s || this, $a, $b, origin = nil;
            if (self.on_select == null) self.on_select = nil;

          origin = root.$origin();
            if ((($a = ((($b = origin['$nil?']()) !== false && $b !== nil) ? $b : self.on_select['$nil?']())) !== nil && (!$a._isBoolean || $a == true))) {
              return nil
              } else {
              return self.on_select.$call(origin)
            };}, TMP_9._s = self, TMP_9), $a).call($b);};
        return ($a = ($c = e).$on_click, $a._p = (TMP_10 = function(){var self = TMP_10._s || this, $a, $b, origin = nil;
          if (self.on_select == null) self.on_select = nil;

        origin = root.$origin();
          if ((($a = ((($b = origin['$nil?']()) !== false && $b !== nil) ? $b : self.on_select['$nil?']())) !== nil && (!$a._isBoolean || $a == true))) {
            return nil
            } else {
            return self.on_select.$call(origin)
          };}, TMP_10._s = self, TMP_10), $a).call($c);
      };

      def.$draw_glyph = function(root) {
        var $a, $b, TMP_12, $c, TMP_13, self = this, center = nil, size = nil, path_spec = nil, e = nil, bbox = nil, glyph_center = nil, scalefactor = nil, x = nil, y = nil, e_dot = nil;

        def.$glyph_to_path_spec = function(glyph) {
          var $a, $b, TMP_11, self = this, result = nil;

          result = "";
          ($a = ($b = glyph['$[]']("d")).$each, $a._p = (TMP_11 = function(part){var self = TMP_11._s || this;
if (part == null) part = nil;
          result = result['$+'](part.$first());
            return result = result['$+'](part['$[]']($range(1, -1, false)).$join(" "));}, TMP_11._s = self, TMP_11), $a).call($b);
          return result;
        };
        center = [root.$center().$first(), root.$center().$last()];
        size = [root.$size().$first(), root.$size().$last()];
        path_spec = self.$path_to_raphael(root.$glyph()['$[]']("d"));
        e = self.paper.$rect(root.$center().$first(), root.$center().$last()['$-'](size.$last()), size.$first(), size.$last());
        e['$[]=']("fill", "white");
        e['$[]=']("stroke", "white");
        e.$transform("t-" + (size.$first()['$/'](2)) + " " + (size.$last()['$/'](2)));
        e = self.paper.$path(path_spec);
        e['$[]=']("fill", "black");
        self.$push_element(root.$origin(), e);
        ($a = ($b = e).$on_click, $a._p = (TMP_12 = function(){var self = TMP_12._s || this, $a, $b, origin = nil;
          if (self.on_select == null) self.on_select = nil;

        origin = root.$origin();
          if ((($a = ((($b = origin['$nil?']()) !== false && $b !== nil) ? $b : self.on_select['$nil?']())) !== nil && (!$a._isBoolean || $a == true))) {
            return nil
            } else {
            return self.on_select.$call(origin)
          };}, TMP_12._s = self, TMP_12), $a).call($b);
        bbox = e.$get_bbox();
        glyph_center = [(bbox['$[]']("x")['$+'](bbox['$[]']("x2")))['$/'](2), (bbox['$[]']("y")['$+'](bbox['$[]']("y2")))['$/'](2)];
        scalefactor = size.$last()['$/'](bbox['$[]']("height"));
        e.$transform("t" + ((center.$first())) + " " + ((center.$last())) + "t" + ((glyph_center.$first()['$-@']())) + " " + ((glyph_center.$last()['$-@']())) + "s" + (scalefactor));
        if ((($a = root['$dotted?']()) !== nil && (!$a._isBoolean || $a == true))) {
          bbox = e.$get_bbox();
          x = bbox['$[]']("x2")['$+'](0.5);
          y = bbox['$[]']("y2")['$+'](0.5);
          e_dot = self.paper.$ellipse(x, y, (($a = $scope.DOTTED_SIZE) == null ? $opal.cm('DOTTED_SIZE') : $a), (($a = $scope.DOTTED_SIZE) == null ? $opal.cm('DOTTED_SIZE') : $a));
          e_dot['$[]=']("fill", "black");
          self.$push_element(root.$origin(), e_dot);
          return ($a = ($c = e_dot).$on_click, $a._p = (TMP_13 = function(){var self = TMP_13._s || this, $a, $b, origin = nil;
            if (self.on_select == null) self.on_select = nil;

          origin = root.$origin();
            if ((($a = ((($b = origin['$nil?']()) !== false && $b !== nil) ? $b : self.on_select['$nil?']())) !== nil && (!$a._isBoolean || $a == true))) {
              return nil
              } else {
              return self.on_select.$call(origin)
            };}, TMP_13._s = self, TMP_13), $a).call($c);
          } else {
          return nil
        };
      };

      def.$draw_flowline = function(root) {
        var self = this, l = nil;

        l = self.paper.$line(root.$from().$center()['$[]'](0), root.$from().$center()['$[]'](1), root.$to().$center()['$[]'](0), root.$to().$center()['$[]'](1));
        if (root.$style()['$==']("dashed")) {
          return l['$[]=']("stroke-dasharray", "-")
          } else {
          return nil
        };
      };

      def.$draw_jumpline = function(root) {
        var $a, $b, $c, self = this, startpoint = nil, endpoint = nil, distance = nil, depth = nil, path = nil, arrow = nil;

        startpoint = root.$from().$center();
        ($a = 0, $b = startpoint, $b['$[]=']($a, $b['$[]']($a)['$+']((($c = $scope.PADDING) == null ? $opal.cm('PADDING') : $c))));
        endpoint = root.$to().$center();
        ($a = 0, $b = endpoint, $b['$[]=']($a, $b['$[]']($a)['$+']((($c = $scope.PADDING) == null ? $opal.cm('PADDING') : $c))));
        distance = root.$distance();
        if ((($a = distance['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
          depth = (420)['$-']((root.$level()['$*']((($a = $scope.JUMPLINE_INDENT) == null ? $opal.cm('JUMPLINE_INDENT') : $a))))
          } else {
          depth = endpoint['$[]'](0)['$+'](distance)
        };
        path = "M" + (endpoint['$[]'](0)) + "," + (endpoint['$[]'](1)) + "L" + (depth) + "," + (endpoint['$[]'](1)) + "L" + (depth) + "," + (startpoint['$[]'](1)) + "L" + (startpoint['$[]'](0)) + "," + (startpoint['$[]'](1));
        self.paper.$path(path);
        arrow = self.paper.$path("M0,0L" + ((($a = $scope.ARROW_SIZE) == null ? $opal.cm('ARROW_SIZE') : $a)) + "," + ((-0.5)['$*']((($a = $scope.ARROW_SIZE) == null ? $opal.cm('ARROW_SIZE') : $a))) + "L" + ((($a = $scope.ARROW_SIZE) == null ? $opal.cm('ARROW_SIZE') : $a)) + "," + ((0.5)['$*']((($a = $scope.ARROW_SIZE) == null ? $opal.cm('ARROW_SIZE') : $a))) + "L0,0");
        arrow['$[]=']("fill", "red");
        return arrow.$translate(startpoint['$[]'](0), startpoint['$[]'](1));
      };

      def.$draw_annotation = function(root) {
        var $a, self = this, style_def = nil, style = nil, element = nil;

        style_def = $hash2(["small", "regular", "large"], {"small": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 2.1, "font_style": "normal"}), "regular": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 4.2, "font_style": "normal"}), "large": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 7.03, "font_style": "bold"})});
        style = ((($a = style_def['$[]'](root.$style())) !== false && $a !== nil) ? $a : style_def['$[]']("regular"));
        element = self.paper.$text(root.$center().$first(), root.$center().$last(), root.$text());
        element['$[]=']("font-size", style['$[]']("font_size"));
        element['$[]=']("font-weight", style['$[]']("font_size"));
        element['$[]=']("text-anchor", "start");
        return element.$translate(0, element.$get_bbox()['$[]']("height")['$/'](2)['$-'](style['$[]']("font_size")));
      };

      return (def.$draw_path = function(root) {
        var self = this, path_spec = nil;

        path_spec = self.$path_to_raphael(root.$path());
        return self.paper.$path(path_spec);
      }, nil) && 'draw_path';
    })(self, null)
    
  })(self);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/raphael_engine.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $range = $opal.range, $gvars = $opal.gvars, $hash2 = $opal.hash2;

  $opal.add_stubs(['$include', '$attr_reader', '$/', '$new', '$x_offset=', '$*', '$each', '$draw_segment', '$+', '$rect', '$draw_cropmark', '$is_a?', '$visible?', '$draw_ellipse', '$draw_flowline', '$draw_jumpline', '$draw_glyph', '$draw_path', '$draw_annotation', '$debug', '$class', '$children', '$private', '$[]', '$style', '$text_color=', '$font_size=', '$font_style=', '$text', '$first', '$center', '$last', '$line', '$-', '$filled?', '$fill=', '$map', '$ellipse', '$size', '$dotted?', '$zip', '$stroke=', '$rect_like_ellipse', '$glyph', '$===', '$empty?', '$lines', '$push', '$error', '$addPage', '$draw', '$dashed?', '$line_dash=', '$from', '$to', '$use_solid_lines', '$clone', '$[]=', '$distance', '$nil?', '$level', '$left_arrowhead', '$path']);
  ;
  ;
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $PDFEngine(){};
      var self = $PDFEngine = $klass($base, $super, 'PDFEngine', $PDFEngine);

      var def = self._proto, $scope = self._scope, $a, $b;

      def.pdf = nil;
      self.$include((($a = ((($b = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $b))._scope).Drawing == null ? $a.cm('Drawing') : $a.Drawing));

      self.$attr_reader("pdf");

      $opal.cdecl($scope, 'PADDING', 4.0);

      $opal.cdecl($scope, 'ARROW_SIZE', 1.0);

      $opal.cdecl($scope, 'JUMPLINE_INDENT', 10.0);

      $opal.cdecl($scope, 'DOTTED_SIZE', 0.3);

      $opal.cdecl($scope, 'X_SPACING', (115.0)['$/'](10.0));

      def.$initialize = function() {
        var $a, self = this;

        self.pdf = (($a = $scope.JsPDF) == null ? $opal.cm('JsPDF') : $a).$new("l", "mm", "a3");
        return self.pdf['$x_offset='](0.0);
      };

      def.$draw_in_segments = function(sheet) {
        var $a, $b, TMP_1, self = this, delta = nil, addpage = nil;

        delta = (-12.0)['$*']((($a = $scope.X_SPACING) == null ? $opal.cm('X_SPACING') : $a));
        self.pdf = (($a = $scope.JsPDF) == null ? $opal.cm('JsPDF') : $a).$new("p", "mm", "a4");
        addpage = false;
        ($a = ($b = ($range(0, 2, false))).$each, $a._p = (TMP_1 = function(i){var self = TMP_1._s || this;
if (i == null) i = nil;
        self.$draw_segment((30)['$+'](i['$*'](delta)), sheet, addpage);
          return addpage = true;}, TMP_1._s = self, TMP_1), $a).call($b);
        return self.pdf;
      };

      def.$draw = function(sheet) {
        var $a, $b, TMP_2, $c, TMP_4, self = this, delta = nil;

        self.pdf.$rect(1.0, 1.0, 418, 295);
        self.pdf.$rect(0.0, 0.0, 420.0, 297.0);
        delta = (12.0)['$*']((($a = $scope.X_SPACING) == null ? $opal.cm('X_SPACING') : $a));
        ($a = ($b = ($range(1, 2, false))).$each, $a._p = (TMP_2 = function(i){var self = TMP_2._s || this, $a, $b, TMP_3;
if (i == null) i = nil;
        return ($a = ($b = ["top", "bottom"]).$each, $a._p = (TMP_3 = function(border){var self = TMP_3._s || this;
if (border == null) border = nil;
          return self.$draw_cropmark(i, delta, border)}, TMP_3._s = self, TMP_3), $a).call($b)}, TMP_2._s = self, TMP_2), $a).call($b);
        ($a = ($c = sheet.$children()).$each, $a._p = (TMP_4 = function(child){var self = TMP_4._s || this, $a, $b, $c, $d;
          if ($gvars.log == null) $gvars.log = nil;
if (child == null) child = nil;
        if ((($a = child['$is_a?']((($b = $scope.Ellipse) == null ? $opal.cm('Ellipse') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_ellipse(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = $scope.FlowLine) == null ? $opal.cm('FlowLine') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_flowline(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = $scope.JumpLine) == null ? $opal.cm('JumpLine') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_jumpline(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Drawing == null ? $c.cm('Drawing') : $c.Drawing))._scope).Glyph == null ? $b.cm('Glyph') : $b.Glyph))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_glyph(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Drawing == null ? $c.cm('Drawing') : $c.Drawing))._scope).Path == null ? $b.cm('Path') : $b.Path))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_path(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((($b = ((($c = ((($d = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $d))._scope).Drawing == null ? $c.cm('Drawing') : $c.Drawing))._scope).Annotation == null ? $b.cm('Annotation') : $b.Annotation))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$draw_annotation(child)
              } else {
              return nil
            }
            } else {
            $gvars.log.$debug("don't know how to draw " + (child.$class()) + " (" + ("pdf_engine") + " " + (60) + ")");
            return nil;
          }}, TMP_4._s = self, TMP_4), $a).call($c);
        return self.pdf;
      };

      self.$private();

      def.$draw_annotation = function(root) {
        var $a, self = this, style_def = nil, style = nil;

        style_def = $hash2(["small", "regular", "large"], {"small": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 6, "font_style": "normal"}), "regular": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 12, "font_style": "normal"}), "large": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 20, "font_style": "bold"})});
        style = ((($a = style_def['$[]'](root.$style())) !== false && $a !== nil) ? $a : style_def['$[]']("regular"));
        self.pdf['$text_color='](style['$[]']("text_color"));
        self.pdf['$font_size='](style['$[]']("font_size"));
        self.pdf['$font_style='](style['$[]']("font_style"));
        return self.pdf.$text(root.$center().$first(), root.$center().$last(), root.$text());
      };

      def.$draw_cropmark = function(i, delta, border) {
        var $a, self = this, v = nil, hpos = nil, hdiff = nil;

        v = $hash2(["top", "bottom"], {"top": [0, 7, 9], "bottom": [297, 290, 288]})['$[]'](border);
        hpos = (($a = $scope.X_SPACING) == null ? $opal.cm('X_SPACING') : $a)['$/'](2.0)['$+'](delta['$*'](i))['$+'](3);
        hdiff = (($a = $scope.X_SPACING) == null ? $opal.cm('X_SPACING') : $a)['$/'](2.0);
        self.pdf.$line([hpos, v.$first()], [hpos, v.$last()]);
        return self.pdf.$line([hpos['$-'](hdiff), v['$[]'](1)], [hpos['$+'](hdiff), v['$[]'](1)]);
      };

      def.$draw_ellipse = function(root) {
        var $a, $b, TMP_5, $c, TMP_6, $d, TMP_7, self = this, style = nil;

        style = (function() {if ((($a = root['$filled?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "F"
          } else {
          return "FD"
        }; return nil; })();
        self.pdf['$fill='](($a = ($b = ($range(0, 3, true))).$map, $a._p = (TMP_5 = function(){var self = TMP_5._s || this, $a;

        if ((($a = root['$filled?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return 0
            } else {
            return 255
          }}, TMP_5._s = self, TMP_5), $a).call($b));
        self.pdf.$ellipse(root.$center(), root.$size(), style);
        if ((($a = root['$dotted?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.pdf['$fill='](($a = ($c = ($range(0, 3, true))).$map, $a._p = (TMP_6 = function(){var self = TMP_6._s || this;

          return 0}, TMP_6._s = self, TMP_6), $a).call($c));
          return self.pdf.$ellipse(($a = ($d = root.$center().$zip(root.$size())).$map, $a._p = (TMP_7 = function(s){var self = TMP_7._s || this, $a, a = nil, b = nil;
if (s == null) s = nil;
          $a = $opal.to_ary(s), a = ($a[0] == null ? nil : $a[0]), b = ($a[1] == null ? nil : $a[1]);
            return a['$+'](b['$*'](1.5));}, TMP_7._s = self, TMP_7), $a).call($d), [(($a = $scope.DOTTED_SIZE) == null ? $opal.cm('DOTTED_SIZE') : $a), (($a = $scope.DOTTED_SIZE) == null ? $opal.cm('DOTTED_SIZE') : $a)], "F");
          } else {
          return nil
        };
      };

      def.$draw_glyph = function(root) {
        var $a, $b, TMP_8, $c, TMP_9, $d, TMP_10, $e, TMP_11, $f, TMP_12, $g, TMP_13, self = this, style = nil, center = nil, size = nil, scalefactor = nil, scale = nil, lines = nil, start = nil;

        style = root['$filled?']("FD", "FD");
        self.pdf['$fill='](($a = ($b = ($range(0, 3, true))).$map, $a._p = (TMP_8 = function(){var self = TMP_8._s || this, $a;

        if ((($a = root['$filled?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return 0
            } else {
            return 255
          }}, TMP_8._s = self, TMP_8), $a).call($b));
        center = [root.$center().$first()['$-'](root.$size().$first()), root.$center().$last()['$-'](root.$size().$last())];
        size = ($a = ($c = root.$size()).$map, $a._p = (TMP_9 = function(s){var self = TMP_9._s || this;
if (s == null) s = nil;
        return (2.0)['$*'](s)}, TMP_9._s = self, TMP_9), $a).call($c);
        self.pdf['$fill='](($a = ($d = ($range(0, 3, true))).$map, $a._p = (TMP_10 = function(){var self = TMP_10._s || this, $a;

        if ((($a = root['$filled?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return 0
            } else {
            return 255
          }}, TMP_10._s = self, TMP_10), $a).call($d));
        self.pdf['$fill=']([255, 255, 255]);
        self.pdf['$stroke=']([255, 255, 255]);
        self.pdf.$rect_like_ellipse(center, size, "FD");
        self.pdf['$fill=']([0, 0, 0]);
        self.pdf['$stroke=']([0, 0, 0]);
        scalefactor = size.$last()['$/'](root.$glyph()['$[]']("h"));
        scale = [scalefactor, scalefactor];
        lines = [];
        start = [];
        ($a = ($e = root.$glyph()['$[]']("d")).$each, $a._p = (TMP_11 = function(element){var self = TMP_11._s || this, $a, $case = nil;
          if (self.pdf == null) self.pdf = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (element == null) element = nil;
        return (function() {$case = element.$first();if ("M"['$===']($case)) {if ((($a = lines['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.pdf.$lines(lines, start.$first(), start.$last(), scale, "FD", false)
          };
          lines = [];
          return start = [center.$first()['$+']((element['$[]'](1)['$+'](root.$glyph()['$[]']("w")['$/'](2)))['$*'](scale.$first())), center.$last()['$-']((element['$[]'](2)['$+'](root.$glyph()['$[]']("h")['$/'](2)))['$*'](scale.$last()))];}else if ("l"['$===']($case)) {return lines.$push(element['$[]']($range(1, -1, false)))}else if ("c"['$===']($case)) {return lines.$push(element['$[]']($range(1, -1, false)))}else if ("z"['$===']($case)) {if ((($a = lines['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.pdf.$lines(lines, start.$first(), start.$last(), scale, "FD", true)
          };
          return lines = [];}else {return $gvars.log.$error("unsupported command '" + (element.$first()) + "' in glyph (" + ("pdf_engine") + " " + (149) + ")")}})()}, TMP_11._s = self, TMP_11), $a).call($e);
        self.pdf['$stroke=']([0, 0, 0]);
        if ((($a = root['$dotted?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.pdf['$fill='](($a = ($f = ($range(0, 3, true))).$map, $a._p = (TMP_12 = function(){var self = TMP_12._s || this;

          return 0}, TMP_12._s = self, TMP_12), $a).call($f));
          return self.pdf.$ellipse(($a = ($g = root.$center().$zip(root.$size())).$map, $a._p = (TMP_13 = function(s){var self = TMP_13._s || this, $a, a = nil, b = nil;
if (s == null) s = nil;
          $a = $opal.to_ary(s), a = ($a[0] == null ? nil : $a[0]), b = ($a[1] == null ? nil : $a[1]);
            return a['$+'](b['$*'](1.5));}, TMP_13._s = self, TMP_13), $a).call($g), [(($a = $scope.DOTTED_SIZE) == null ? $opal.cm('DOTTED_SIZE') : $a), (($a = $scope.DOTTED_SIZE) == null ? $opal.cm('DOTTED_SIZE') : $a)], "F");
          } else {
          return nil
        };
      };

      def.$draw_segment = function(x_offset, sheet, newpage) {
        var self = this;

        if (newpage == null) {
          newpage = false
        }
        self.pdf['$x_offset='](x_offset);
        if (newpage !== false && newpage !== nil) {
          self.pdf.$addPage()};
        return self.$draw(sheet);
      };

      def.$draw_flowline = function(root) {
        var $a, self = this;

        if ((($a = root['$dashed?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.pdf['$line_dash='](3)};
        self.pdf.$line(root.$from().$center(), root.$to().$center());
        if ((($a = root['$dashed?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return self.pdf.$use_solid_lines()
          } else {
          return nil
        };
      };

      def.$draw_jumpline = function(root) {
        var $a, $b, $c, TMP_14, self = this, startpoint = nil, endpoint = nil, distance = nil, depth = nil;

        startpoint = root.$from().$center().$clone();
        ($a = 0, $b = startpoint, $b['$[]=']($a, $b['$[]']($a)['$+']((($c = $scope.PADDING) == null ? $opal.cm('PADDING') : $c))));
        ($a = 1, $b = startpoint, $b['$[]=']($a, $b['$[]']($a)['$-']((($c = $scope.PADDING) == null ? $opal.cm('PADDING') : $c)['$/'](4.0))));
        endpoint = root.$to().$center().$clone();
        ($a = 0, $b = endpoint, $b['$[]=']($a, $b['$[]']($a)['$+']((($c = $scope.PADDING) == null ? $opal.cm('PADDING') : $c))));
        ($a = 1, $b = endpoint, $b['$[]=']($a, $b['$[]']($a)['$+']((($c = $scope.PADDING) == null ? $opal.cm('PADDING') : $c)['$/'](4.0))));
        distance = root.$distance();
        if ((($a = distance['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
          depth = (418.0)['$-']((root.$level()['$*']((($a = $scope.JUMPLINE_INDENT) == null ? $opal.cm('JUMPLINE_INDENT') : $a))))
          } else {
          depth = endpoint['$[]'](0)['$+'](distance)
        };
        self.pdf['$stroke='](($a = ($b = ($range(0, 3, true))).$map, $a._p = (TMP_14 = function(){var self = TMP_14._s || this;

        return 0}, TMP_14._s = self, TMP_14), $a).call($b));
        self.pdf.$line(endpoint, [depth, endpoint['$[]'](1)]);
        self.pdf.$line([depth, endpoint['$[]'](1)], [depth, startpoint['$[]'](1)]);
        self.pdf.$line([depth, startpoint['$[]'](1)], startpoint);
        return self.pdf.$left_arrowhead(startpoint['$[]'](0), startpoint['$[]'](1));
      };

      return (def.$draw_path = function(root) {
        var $a, $b, TMP_15, $c, TMP_16, self = this, lines = nil, scale = nil, start = nil, style = nil;

        lines = [];
        scale = [1, 1];
        start = [];
        style = root['$filled?']("FD", "FD");
        self.pdf['$fill='](($a = ($b = ($range(0, 3, true))).$map, $a._p = (TMP_15 = function(){var self = TMP_15._s || this, $a;

        if ((($a = root['$filled?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return 0
            } else {
            return 255
          }}, TMP_15._s = self, TMP_15), $a).call($b));
        ($a = ($c = root.$path()).$each, $a._p = (TMP_16 = function(element){var self = TMP_16._s || this, $a, $case = nil;
          if (self.pdf == null) self.pdf = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (element == null) element = nil;
        return (function() {$case = element.$first();if ("M"['$===']($case)) {if ((($a = lines['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.pdf.$lines(lines, start.$first(), start.$last(), scale, style, false)
          };
          lines = [];
          return start = element['$[]']($range(1, 2, false));}else if ("l"['$===']($case)) {return lines.$push(element['$[]']($range(1, -1, false)))}else if ("c"['$===']($case)) {return lines.$push(element['$[]']($range(1, -1, false)))}else if ("z"['$===']($case)) {if ((($a = lines['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.pdf.$lines(lines, start.$first(), start.$last(), scale, style, true)
          };
          return lines = [];}else {return $gvars.log.$error("unsupported command '" + (element.$first()) + "' in glyph (" + ("pdf_engine") + " " + (237) + ")")}})()}, TMP_16._s = self, TMP_16), $a).call($c);
        if ((($a = lines['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return self.pdf.$lines(lines, start.$first(), start.$last(), scale, style, false)
        };
      }, nil) && 'draw_path';
    })(self, null)
    
  })(self);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/pdf_engine.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range;

  $opal.add_stubs(['$attr_reader', '$call', '$lambda', '$raise', '$new', '$set_help', '$set_default', '$push', '$each', '$[]=', '$name', '$[]', '$get_default', '$get_help', '$!', '$empty?', '$get_clean_argument_values', '$perform', '$undoable?', '$clear', '$can_undo?', '$pop', '$invert', '$can_redo?', '$map', '$first', '$select', '$is_a?', '$scan', '$parse_string', '$to_sym', '$each_with_index', '$parameter_name', '$clone', '$unshift', '$join', '$parameters', '$to_a']);
  return (function($base) {
    var self = $module($base, 'CommandController');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Parameter(){};
      var self = $Parameter = $klass($base, $super, 'Parameter', $Parameter);

      var def = self._proto, $scope = self._scope, TMP_1, TMP_2;

      def.default_action = def.name = def.help_action = nil;
      self.$attr_reader("name");

      def.$initialize = function(name, type) {
        var self = this;

        self.name = name;
        return self.type = type;
      };

      def.$set_help = TMP_1 = function() {
        var self = this, $iter = TMP_1._p, block = $iter || nil;

        TMP_1._p = null;
        return self.help_action = block;
      };

      def.$set_default = TMP_2 = function() {
        var self = this, $iter = TMP_2._p, block = $iter || nil;

        TMP_2._p = null;
        return self.default_action = block;
      };

      def.$get_help = function() {
        var self = this, default$ = nil;

        default$ = self.default_action.$call();
        if (default$ !== false && default$ !== nil) {
          default$ = "[" + (default$) + "]"};
        return "{" + (self.name) + "}" + (default$) + " = " + (self.help_action.$call());
      };

      return (def.$get_default = function() {
        var self = this;

        return self.default_action.$call();
      }, nil) && 'get_default';
    })(self, null);

    (function($base, $super) {
      function $Command(){};
      var self = $Command = $klass($base, $super, 'Command', $Command);

      var def = self._proto, $scope = self._scope, TMP_6, TMP_9, TMP_10, TMP_11;

      def.parameters = def.action = def.inverse_action = def.help_action = def.undoable = nil;
      self.$attr_reader("name", "parameters");

      def.$initialize = function(name) {
        var $a, $b, TMP_3, $c, TMP_4, $d, TMP_5, self = this;

        self.name = name;
        self.help_action = ($a = ($b = self).$lambda, $a._p = (TMP_3 = function(){var self = TMP_3._s || this;

        return "no help defined for " + (name)}, TMP_3._s = self, TMP_3), $a).call($b);
        self.parameters = [];
        self.action = ($a = ($c = self).$lambda, $a._p = (TMP_4 = function(p){var self = TMP_4._s || this;
if (p == null) p = nil;
        return self.$raise("No action defined for " + (name))}, TMP_4._s = self, TMP_4), $a).call($c);
        self.inverse_action = ($a = ($d = self).$lambda, $a._p = (TMP_5 = function(p){var self = TMP_5._s || this;
if (p == null) p = nil;
        return self.$raise("No  undo defined fore " + (name))}, TMP_5._s = self, TMP_5), $a).call($d);
        return self.undoable = true;
      };

      def.$add_parameter = TMP_6 = function(name, type, help, default$) {
        var $a, $b, TMP_7, $c, TMP_8, self = this, $iter = TMP_6._p, block = $iter || nil, parameter = nil;

        if (help == null) {
          help = nil
        }
        if (default$ == null) {
          default$ = nil
        }
        TMP_6._p = null;
        parameter = (($a = $scope.Parameter) == null ? $opal.cm('Parameter') : $a).$new(name, type);
        ($a = ($b = parameter).$set_help, $a._p = (TMP_7 = function(){var self = TMP_7._s || this;

        return help}, TMP_7._s = self, TMP_7), $a).call($b);
        ($a = ($c = parameter).$set_default, $a._p = (TMP_8 = function(){var self = TMP_8._s || this;

        return default$}, TMP_8._s = self, TMP_8), $a).call($c);
        if ((block !== nil)) {
          block.$call(parameter)};
        return self.parameters.$push(parameter);
      };

      def.$as_action = TMP_9 = function() {
        var self = this, $iter = TMP_9._p, block = $iter || nil;

        TMP_9._p = null;
        return self.action = block;
      };

      def.$as_inverse = TMP_10 = function() {
        var self = this, $iter = TMP_10._p, block = $iter || nil;

        TMP_10._p = null;
        return self.inverse_action = block;
      };

      def.$set_help = TMP_11 = function() {
        var self = this, $iter = TMP_11._p, block = $iter || nil;

        TMP_11._p = null;
        return self.help_action = block;
      };

      def.$perform = function(arguments$) {
        var self = this;

        return self.action.$call(arguments$);
      };

      def.$invert = function(arguments$) {
        var self = this;

        return self.inverse_action.$call(arguments$);
      };

      def.$get_clean_argument_values = function(arguments$) {
        var $a, $b, TMP_12, self = this, result = nil;

        result = $hash2([], {});
        ($a = ($b = self.parameters).$each, $a._p = (TMP_12 = function(p){var self = TMP_12._s || this, $a;
if (p == null) p = nil;
        return result['$[]='](p.$name(), ((($a = arguments$['$[]'](p.$name())) !== false && $a !== nil) ? $a : p.$get_default()))}, TMP_12._s = self, TMP_12), $a).call($b);
        return result;
      };

      def.$get_help = function() {
        var self = this;

        return self.help_action.$call();
      };

      def.$parameter_name = function(index) {
        var self = this;

        return self.parameters['$[]'](index).$name();
      };

      def.$parameter_help = function(index) {
        var self = this;

        return self.parameters['$[]'](index).$get_help();
      };

      def.$parameter_default = function(index) {
        var self = this;

        return self.parameters['$[]'](index).$get_default();
      };

      def['$undoable?'] = function() {
        var self = this;

        return self.undoable;
      };

      return (def['$undoable='] = function(value) {
        var self = this;

        return self.undoable = value;
      }, nil) && 'undoable=';
    })(self, null);

    (function($base, $super) {
      function $CommandStack(){};
      var self = $CommandStack = $klass($base, $super, 'CommandStack', $CommandStack);

      var def = self._proto, $scope = self._scope, TMP_13;

      def.commands = def.undo_stack = def.redo_stack = def.history_stack = nil;
      def.$initialize = function() {
        var self = this;

        self.commands = $hash2([], {});
        self.undo_stack = [];
        self.redo_stack = [];
        return self.history_stack = [];
      };

      def.$add_command = TMP_13 = function(name) {
        var $a, self = this, $iter = TMP_13._p, block = $iter || nil, command = nil;

        TMP_13._p = null;
        command = (($a = $scope.Command) == null ? $opal.cm('Command') : $a).$new(name);
        block.$call(command);
        return self.commands['$[]='](command.$name(), command);
      };

      def['$can_undo?'] = function() {
        var self = this;

        return self.undo_stack['$empty?']()['$!']();
      };

      def['$can_redo?'] = function() {
        var self = this;

        return self.redo_stack['$empty?']()['$!']();
      };

      def.$perform = function(command, arguments$) {
        var $a, self = this, the_arguments = nil;

        the_arguments = command.$get_clean_argument_values(arguments$);
        command.$perform(the_arguments);
        if ((($a = command['$undoable?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.undo_stack.$push([command, the_arguments]);
          self.redo_stack.$clear();};
        return self.history_stack.$push(["  do", command, the_arguments]);
      };

      def.$undo = function() {
        var $a, self = this, command = nil, arguments$ = nil;

        if ((($a = self['$can_undo?']()) !== nil && (!$a._isBoolean || $a == true))) {
          $a = $opal.to_ary(self.undo_stack.$pop()), command = ($a[0] == null ? nil : $a[0]), arguments$ = ($a[1] == null ? nil : $a[1]);
          self.redo_stack.$push([command, arguments$]);
          self.history_stack.$push(["undo", command, arguments$]);
          return command.$invert(arguments$);
          } else {
          return self.$raise("nothing to undo")
        };
      };

      def.$redo = function() {
        var $a, self = this, command = nil, arguments$ = nil;

        if ((($a = self['$can_redo?']()) !== nil && (!$a._isBoolean || $a == true))) {
          $a = $opal.to_ary(self.redo_stack.$pop()), command = ($a[0] == null ? nil : $a[0]), arguments$ = ($a[1] == null ? nil : $a[1]);
          return self.$perform(command, arguments$);
          } else {
          return self.$raise("nothing to redo")
        };
      };

      $opal.cdecl($scope, 'STRING_COMMAND_REGEX', /([^ \\\^"{]+)|"(([^\\"]|\\["n\\])*)"|(\{.+\})/);

      def.$parse_string = function(command) {
        var $a, $b, TMP_14, $c, self = this, r = nil;

        return r = ($a = ($b = command.$scan((($c = $scope.STRING_COMMAND_REGEX) == null ? $opal.cm('STRING_COMMAND_REGEX') : $c))).$map, $a._p = (TMP_14 = function(s){var self = TMP_14._s || this, $a, $b, TMP_15;
if (s == null) s = nil;
        return ($a = ($b = s).$select, $a._p = (TMP_15 = function(x){var self = TMP_15._s || this, $a;
if (x == null) x = nil;
          return x['$is_a?']((($a = $scope.Object) == null ? $opal.cm('Object') : $a))}, TMP_15._s = self, TMP_15), $a).call($b).$first()}, TMP_14._s = self, TMP_14), $a).call($b);
      };

      def.$run_string = function(command) {
        var $a, $b, TMP_16, self = this, arguments$ = nil, parts = nil, the_command = nil;

        arguments$ = $hash2([], {});
        parts = self.$parse_string(command);
        the_command = self.commands['$[]'](parts.$first().$to_sym());
        if (the_command !== false && the_command !== nil) {
          } else {
          self.$raise("wrong command: " + (command))
        };
        ($a = ($b = parts['$[]']($range(1, -1, false))).$each_with_index, $a._p = (TMP_16 = function(argument, index){var self = TMP_16._s || this;
if (argument == null) argument = nil;if (index == null) index = nil;
        try {
          return arguments$['$[]='](the_command.$parameter_name(index), argument)
          } catch ($err) {if (true) {
            return self.$raise("too many arguments in '" + (command) + "'")
            }else { throw $err; }
          }}, TMP_16._s = self, TMP_16), $a).call($b);
        return self.$perform(the_command, arguments$);
      };

      def.$history = function() {
        var self = this;

        return self.history_stack.$clone();
      };

      def.$undostack = function() {
        var $a, $b, TMP_17, self = this;

        return ($a = ($b = self.undo_stack).$map, $a._p = (TMP_17 = function(c){var self = TMP_17._s || this;
if (c == null) c = nil;
        return c.$clone().$unshift("undo")}, TMP_17._s = self, TMP_17), $a).call($b);
      };

      def.$redostack = function() {
        var $a, $b, TMP_18, self = this;

        return ($a = ($b = self.redo_stack).$map, $a._p = (TMP_18 = function(c){var self = TMP_18._s || this;
if (c == null) c = nil;
        return c.$clone().$unshift("redo")}, TMP_18._s = self, TMP_18), $a).call($b);
      };

      return (def.$help_string_style = function() {
        var $a, $b, TMP_19, self = this;

        return ($a = ($b = self.commands.$to_a()).$map, $a._p = (TMP_19 = function(k, c){var self = TMP_19._s || this, $a, $b, TMP_20, parameter_names = nil;
if (k == null) k = nil;if (c == null) c = nil;
        parameter_names = ($a = ($b = c.$parameters()).$map, $a._p = (TMP_20 = function(p){var self = TMP_20._s || this;
if (p == null) p = nil;
          return "{" + (p.$name()) + "}"}, TMP_20._s = self, TMP_20), $a).call($b).$join(" ");
          return "" + (c.$name()) + " " + (parameter_names) + " : " + (c.$get_help());}, TMP_19._s = self, TMP_19), $a).call($b);
      }, nil) && 'help_string_style';
    })(self, null);
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/command-controller.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, $b, TMP_20, $c, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $hash2 = $opal.hash2, $gvars = $opal.gvars;

  $opal.add_stubs(['$load_dir', '$save_dir', '$[]', '$warning', '$update', '$to_json', '$[]=', '$parse', '$warn', '$clone', '$private', '$attr', '$new', '$debug', '$methods', '$each', '$send', '$select', '$=~', '$setup_ui', '$setup_ui_listener', '$load_from_loacalstorage', '$run_string', '$error', '$message', '$split', '$first', '$===', '$then', '$status_code', '$body', '$get', '$HTTP', '$get_text', '$Native', '$nil?', '$set_text', '$draw', '$layout_harpnotes', '$draw_in_segments', '$is_playing?', '$stop', '$html', '$find', '$==', '$play_song', '$play_selection', '$play_from_selection', '$backtrace', '$info', '$set_inactive', '$load_song', '$save_to_localstorage', '$set_active', '$file', '$output', '$render_a4', '$render_a3', '$to_blob', '$strftime', '$now', '$transform', '$layout', '$select_range_by_position', '$range_highlight_more', '$range_highlight', '$range_unhighlight_more', '$range_unhighlight', '$unhighlight_all', '$highlight_abc_object', '$set_view_box', '$on_select', '$select_abc_object', '$origin', '$on', '$play_abc', '$render_previews', '$handle_command', '$on_change', '$on_selection_change', '$get_selection_positions', '$last', '$on_noteon', '$on_noteoff', '$unhighlight_abc_object', '$on_songoff', '$stop_play_abc', '$prevent_default', '$save_file', '$prevent', '$css', '$-', '$page_x', '$ready?']);
  (function($base, $super) {
    function $LocalStore(){};
    var self = $LocalStore = $klass($base, $super, 'LocalStore', $LocalStore);

    var def = self._proto, $scope = self._scope;

    def.directory = def.name = nil;
    def.$initialize = function(name) {
      var $a, self = this;

      self.name = name;
      self.$load_dir();
      if ((($a = self.directory) !== nil && (!$a._isBoolean || $a == true))) {
        return nil
        } else {
        self.directory = $hash2([], {});
        return self.$save_dir();
      };
    };

    def.$create = function(key, item, title) {
      var $a, self = this;
      if ($gvars.log == null) $gvars.log = nil;

      if (title == null) {
        title = nil
      }
      if ((($a = self.directory['$[]'](key)) !== nil && (!$a._isBoolean || $a == true))) {
        return $gvars.log.$warning("local storage: key '" + (key) + "' already exists")
        } else {
        return self.$update(key, item, title, true)
      };
    };

    def.$update = function(key, item, title, create) {
      var $a, $b, self = this, envelope = nil;
      if ($gvars.log == null) $gvars.log = nil;

      if (title == null) {
        title = nil
      }
      if (create == null) {
        create = false
      }
      envelope = $hash2(["p", "title"], {"p": item, "title": title}).$to_json();
      if ((($a = ((($b = self.directory['$[]'](key)) !== false && $b !== nil) ? $b : create)) !== nil && (!$a._isBoolean || $a == true))) {
        localStorage.setItem(self.$mangle_key(key), envelope);
        self.directory['$[]='](key, title);
        return self.$save_dir();
        } else {
        return $gvars.log.$warning("local storage update: key '" + (key) + "' does not exist")
      };
    };

    def.$retrieve = function(key) {
      var $a, self = this, envelope = nil, result = nil;

      envelope = (($a = $scope.JSON) == null ? $opal.cm('JSON') : $a).$parse(localStorage.getItem(self.$mangle_key(key)));
      if (envelope !== false && envelope !== nil) {
        result = envelope['$[]']("p")};
      return result;
    };

    def.$delete = function(key) {
      var $a, self = this;
      if ($gvars.log == null) $gvars.log = nil;

      if ((($a = self.directory['$[]'](key)) !== nil && (!$a._isBoolean || $a == true))) {
        return $gvars.log.$warn("local storage: key '" + (key) + "' does not exist")
        } else {
        localStorage.deleteItem(self.$mangle_key(key));
        self.directory['$[]='](key, nil);
        return self.$save_dir();
      };
    };

    def.$list = function() {
      var self = this;

      return self.directory.$clone();
    };

    self.$private();

    def.$mangle_key = function(key) {
      var self = this;

      return "" + (self.name) + "." + (key);
    };

    def.$load_dir = function() {
      var $a, self = this, dirkey = nil;

      dirkey = "" + (self.name) + "__dir";
      return self.directory = (($a = $scope.JSON) == null ? $opal.cm('JSON') : $a).$parse(localStorage.getItem(dirkey));
    };

    return (def.$save_dir = function() {
      var self = this, dir_json = nil, dirkey = nil;

      dir_json = self.directory.$to_json();
      dirkey = "" + (self.name) + "__dir";
      return localStorage.setItem(dirkey, dir_json);
    }, nil) && 'save_dir';
  })(self, null);
  (function($base, $super) {
    function $Controller(){};
    var self = $Controller = $klass($base, $super, 'Controller', $Controller);

    var def = self._proto, $scope = self._scope;

    def.commands = def.editor = def.harpnote_player = def.tune_preview_printer = def.song = def.harpnote_preview_printer = def.song_harpnotes = nil;
    self.$attr("editor", "harpnote_preview_printer", "tune_preview_printer");

    def.$initialize = function() {
      var $a, $b, $c, TMP_1, $d, TMP_2, self = this;
      if ($gvars.log == null) $gvars.log = nil;

      $gvars.log = (($a = $scope.ConsoleLogger) == null ? $opal.cm('ConsoleLogger') : $a).$new("consoleEntries");
      self.editor = (($a = ((($b = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $b))._scope).TextPane == null ? $a.cm('TextPane') : $a.TextPane).$new("abcEditor");
      self.harpnote_player = (($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Music == null ? $b.cm('Music') : $b.Music))._scope).HarpnotePlayer == null ? $a.cm('HarpnotePlayer') : $a.HarpnotePlayer).$new();
      self.songbook = (($a = $scope.LocalStore) == null ? $opal.cm('LocalStore') : $a).$new("songbook");
      self.abc_transformer = (($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Input == null ? $b.cm('Input') : $b.Input))._scope).ABCToHarpnotes == null ? $a.cm('ABCToHarpnotes') : $a.ABCToHarpnotes).$new();
      self.dropboxclient = (($a = ((($b = ((($c = $scope.Opal) == null ? $opal.cm('Opal') : $c))._scope).DropboxJs == null ? $b.cm('DropboxJs') : $b.DropboxJs))._scope).NilClient == null ? $a.cm('NilClient') : $a.NilClient).$new();
      self.commands = (($a = ((($b = $scope.CommandController) == null ? $opal.cm('CommandController') : $b))._scope).CommandStack == null ? $a.cm('CommandStack') : $a.CommandStack).$new();
      $gvars.log.$debug(self.$methods());
      ($a = ($b = ($c = ($d = self.$methods()).$select, $c._p = (TMP_2 = function(n){var self = TMP_2._s || this;
if (n == null) n = nil;
      return n['$=~'](/__ic.*/)}, TMP_2._s = self, TMP_2), $c).call($d)).$each, $a._p = (TMP_1 = function(m){var self = TMP_1._s || this;
if (m == null) m = nil;
      return self.$send(m)}, TMP_1._s = self, TMP_1), $a).call($b);
      self.$setup_ui();
      self.$setup_ui_listener();
      return self.$load_from_loacalstorage();
    };

    def.$handle_command = function(command) {
      var $a, $b, TMP_3, $c, self = this, e = nil, command_tokens = nil, $case = nil;
      if ($gvars.log == null) $gvars.log = nil;

      try {
      self.commands.$run_string(command)
      } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.Exception) == null ? $opal.cm('Exception') : $a)])) {e = $err;
        $gvars.log.$error(e.$message())
        }else { throw $err; }
      };
      return nil;
      command_tokens = command.$split(" ");
      return (function() {$case = command_tokens.$first();if ("lw"['$===']($case)) {$gvars.log.$debug("listing webdav");
      return ($a = ($b = (($c = $scope.Browser) == null ? $opal.cm('Browser') : $c).$HTTP().$get("http://www.weichel21.de/months.js")).$then, $a._p = (TMP_3 = function(response){var self = TMP_3._s || this;
        if ($gvars.log == null) $gvars.log = nil;
if (response == null) response = nil;
      $gvars.log.$debug("returned " + (response.$status_code()));
        return $gvars.log.$debug(response.$body());}, TMP_3._s = self, TMP_3), $a).call($b);}else {return $gvars.log.$error("wrong commnad: " + (command))}})();
    };

    def.$save_to_localstorage = function() {
      var self = this, abc = nil;

      abc = self.editor.$get_text();
      return abc = localStorage.setItem('abc_data', abc);;
    };

    def.$load_from_loacalstorage = function() {
      var $a, self = this, abc = nil;

      abc = self.$Native(localStorage.getItem('abc_data'));
      if ((($a = abc['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return nil
        } else {
        return self.editor.$set_text(abc)
      };
    };

    def.$render_a3 = function(index) {
      var $a, $b, self = this, printer = nil;

      if (index == null) {
        index = 0
      }
      printer = (($a = ((($b = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $b))._scope).PDFEngine == null ? $a.cm('PDFEngine') : $a.PDFEngine).$new();
      return printer.$draw(self.$layout_harpnotes(index));
    };

    def.$render_a4 = function(index) {
      var $a, $b, self = this;

      if (index == null) {
        index = 0
      }
      return (($a = ((($b = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $b))._scope).PDFEngine == null ? $a.cm('PDFEngine') : $a.PDFEngine).$new().$draw_in_segments(self.$layout_harpnotes(index));
    };

    def.$play_abc = function(mode) {
      var $a, self = this;

      if (mode == null) {
        mode = "song"
      }
      if ((($a = self.harpnote_player['$is_playing?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.harpnote_player.$stop();
        return (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find("#tbPlay").$html("play");
        } else {
        (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find("#tbPlay").$html("stop");
        if (mode['$==']("song")) {
          self.harpnote_player.$play_song(0)};
        if (mode['$==']("selection")) {
          self.harpnote_player.$play_selection(0)};
        if (mode['$==']("selection_ff")) {
          return self.harpnote_player.$play_from_selection()
          } else {
          return nil
        };
      };
    };

    def.$stop_play_abc = function() {
      var $a, self = this;

      self.harpnote_player.$stop();
      return (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find("#tbPlay").$html("play");
    };

    def.$render_tunepreview_callback = function() {
      var $a, self = this, e = nil;
      if ($gvars.log == null) $gvars.log = nil;

      try {
      self.tune_preview_printer.$draw(self.editor.$get_text())
      } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.Exception) == null ? $opal.cm('Exception') : $a)])) {e = $err;
        $gvars.log.$error([e.$message(), e.$backtrace()])
        }else { throw $err; }
      };
      $gvars.log.$info("#finished Tune");
      self.$set_inactive("#tunePreview");
      return nil;
    };

    def.$render_harpnotepreview_callback = function() {
      var $a, self = this, e = nil;
      if ($gvars.log == null) $gvars.log = nil;

      try {
      self.song_harpnotes = self.$layout_harpnotes(0);
        self.harpnote_player.$load_song(self.song);
        self.harpnote_preview_printer.$draw(self.song_harpnotes);
      } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.Exception) == null ? $opal.cm('Exception') : $a)])) {e = $err;
        $gvars.log.$error([e.$message(), e.$backtrace()])
        }else { throw $err; }
      };
      $gvars.log.$info("finished Haprnotes");
      self.$set_inactive("#harpPreview");
      return nil;
    };

    def.$render_previews = function() {
      var self = this;
      if ($gvars.log == null) $gvars.log = nil;

      $gvars.log.$info("rendering");
      self.$save_to_localstorage();
      self.$set_active("#tunePreview");
      setTimeout(function(){self.$render_tunepreview_callback()}, 0);
      self.$set_active("#harpPreview");
      return setTimeout(function(){self.$render_harpnotepreview_callback()}, 0);
    };

    def.$save_file = function() {
      var $a, $b, self = this, zip = nil, blob = nil, filename = nil;

      zip = (($a = ((($b = $scope.JSZip) == null ? $opal.cm('JSZip') : $b))._scope).ZipFile == null ? $a.cm('ZipFile') : $a.ZipFile).$new();
      zip.$file("song.abc", self.editor.$get_text());
      zip.$file("harpnotes_a4.pdf", self.$render_a4().$output("blob"));
      zip.$file("harpnotes_a3.pdf", self.$render_a3().$output("bob"));
      blob = zip.$to_blob();
      filename = "song" + ((($a = $scope.Time) == null ? $opal.cm('Time') : $a).$now().$strftime("%d%m%Y%H%M%S")) + ".zip";
      return window.saveAs(blob, filename);
    };

    def.$layout_harpnotes = function(print_variant) {
      var $a, $b, $c, self = this;

      if (print_variant == null) {
        print_variant = 0
      }
      self.song = (($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Input == null ? $b.cm('Input') : $b.Input))._scope).ABCToHarpnotes == null ? $a.cm('ABCToHarpnotes') : $a.ABCToHarpnotes).$new().$transform(self.editor.$get_text());
      return (($a = ((($b = ((($c = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $c))._scope).Layout == null ? $b.cm('Layout') : $b.Layout))._scope).Default == null ? $a.cm('Default') : $a.Default).$new().$layout(self.song, nil, print_variant);
    };

    def.$highlight_abc_object = function(abcelement) {
      var $a, self = this, a = nil;

      a = self.$Native(abcelement);
      if ((($a = self.harpnote_player['$is_playing?']()) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.editor.$select_range_by_position(a['$[]']("startChar"), a['$[]']("endChar"))
      };
      self.tune_preview_printer.$range_highlight_more(a['$[]']("startChar"), a['$[]']("endChar"));
      return self.harpnote_preview_printer.$range_highlight(a['$[]']("startChar"), a['$[]']("endChar"));
    };

    def.$unhighlight_abc_object = function(abcelement) {
      var self = this, a = nil;

      a = self.$Native(abcelement);
      self.tune_preview_printer.$range_unhighlight_more(a['$[]']("startChar"), a['$[]']("endChar"));
      return self.harpnote_preview_printer.$range_unhighlight(a['$[]']("startChar"), a['$[]']("endChar"));
    };

    def.$select_abc_object = function(abcelement) {
      var self = this;

      self.harpnote_preview_printer.$unhighlight_all();
      return self.$highlight_abc_object(abcelement);
    };

    self.$private();

    def.$setup_ui = function() {
      var $a, $b, TMP_4, $c, $d, TMP_5, self = this, printerparams = nil;

      self.harpnote_preview_printer = (($a = ((($b = $scope.Harpnotes) == null ? $opal.cm('Harpnotes') : $b))._scope).RaphaelEngine == null ? $a.cm('RaphaelEngine') : $a.RaphaelEngine).$new("harpPreview", 1100, 700);
      self.harpnote_preview_printer.$set_view_box(0, 0, 440, 297);
      ($a = ($b = self.harpnote_preview_printer).$on_select, $a._p = (TMP_4 = function(harpnote){var self = TMP_4._s || this;
if (harpnote == null) harpnote = nil;
      return self.$select_abc_object(harpnote.$origin())}, TMP_4._s = self, TMP_4), $a).call($b);
      printerparams = $hash2(["staffwidth"], {"staffwidth": 750});
      self.tune_preview_printer = (($a = ((($c = ((($d = $scope.ABCJS) == null ? $opal.cm('ABCJS') : $d))._scope).Write == null ? $c.cm('Write') : $c.Write))._scope).Printer == null ? $a.cm('Printer') : $a.Printer).$new("tunePreview", printerparams);
      return ($a = ($c = self.tune_preview_printer).$on_select, $a._p = (TMP_5 = function(abcelement){var self = TMP_5._s || this, a = nil;
if (abcelement == null) abcelement = nil;
      a = self.$Native(abcelement);
        return self.$select_abc_object(abcelement);}, TMP_5._s = self, TMP_5), $a).call($c);
    };

    def.$setup_ui_listener = function() {
      var $a, $b, TMP_6, $c, TMP_7, $d, TMP_8, $e, TMP_9, $f, TMP_10, $g, TMP_11, $h, TMP_12, $i, TMP_13, $j, TMP_14, $k, TMP_15, $l, TMP_16, $m, TMP_17, $n, self = this;

      ($a = ($b = (($c = $scope.Element) == null ? $opal.cm('Element') : $c).$find("#tbPlay")).$on, $a._p = (TMP_6 = function(){var self = TMP_6._s || this;

      return self.$play_abc("selection_ff")}, TMP_6._s = self, TMP_6), $a).call($b, "click");
      ($a = ($c = (($d = $scope.Element) == null ? $opal.cm('Element') : $d).$find("#tbRender")).$on, $a._p = (TMP_7 = function(){var self = TMP_7._s || this;

      return self.$render_previews()}, TMP_7._s = self, TMP_7), $a).call($c, "click");
      ($a = ($d = (($e = $scope.Element) == null ? $opal.cm('Element') : $e).$find("#tbPrintA3")).$on, $a._p = (TMP_8 = function(){var self = TMP_8._s || this, url = nil;

      url = self.$render_a3().$output("datauristring");
        return window.open(url);}, TMP_8._s = self, TMP_8), $a).call($d, "click");
      ($a = ($e = (($f = $scope.Element) == null ? $opal.cm('Element') : $f).$find("#tbPrintA4")).$on, $a._p = (TMP_9 = function(){var self = TMP_9._s || this, url = nil;

      url = self.$render_a4().$output("datauristring");
        return window.open(url);}, TMP_9._s = self, TMP_9), $a).call($e, "click");
      ($a = ($f = (($g = $scope.Element) == null ? $opal.cm('Element') : $g).$find("#tbCommand")).$on, $a._p = (TMP_10 = function(event){var self = TMP_10._s || this;
if (event == null) event = nil;
      self.$handle_command(self.$Native(event['$[]']("target"))['$[]']("value"));
        return self.$Native(event['$[]']("target"))['$[]=']("value", "");}, TMP_10._s = self, TMP_10), $a).call($f, "change");
      ($a = ($g = self.editor).$on_change, $a._p = (TMP_11 = function(e){var self = TMP_11._s || this, $a;
        if (self.refresh_timer == null) self.refresh_timer = nil;
        if (self.playtimer_timer == null) self.playtimer_timer = nil;
if (e == null) e = nil;
      if ((($a = self.refresh_timer) !== nil && (!$a._isBoolean || $a == true))) {
          clearTimeout(self.refresh_timer);};
        if ((($a = self.playtimer_timer) !== nil && (!$a._isBoolean || $a == true))) {
          setTimeout(function(){$('#tbPlay').html('play')}, 0);
          clearTimeout(self.playtimer_timer);};
        self.refresh_timer = setTimeout(function(){self.$render_previews()}, 2000);
        return nil;}, TMP_11._s = self, TMP_11), $a).call($g);
      ($a = ($h = self.editor).$on_selection_change, $a._p = (TMP_12 = function(e){var self = TMP_12._s || this, a = nil;
        if (self.editor == null) self.editor = nil;
        if (self.tune_preview_printer == null) self.tune_preview_printer = nil;
        if (self.harpnote_preview_printer == null) self.harpnote_preview_printer = nil;
        if (self.harpnote_player == null) self.harpnote_player = nil;
if (e == null) e = nil;
      a = self.editor.$get_selection_positions();
        if (a.$first()['$=='](a.$last())) {
          return nil
          } else {
          self.tune_preview_printer.$range_highlight(a.$first(), a.$last());
          self.harpnote_preview_printer.$unhighlight_all();
          self.harpnote_preview_printer.$range_highlight(a.$first(), a.$last());
          return self.harpnote_player.$range_highlight(a.$first(), a.$last());
        };}, TMP_12._s = self, TMP_12), $a).call($h);
      ($a = ($i = self.harpnote_player).$on_noteon, $a._p = (TMP_13 = function(e){var self = TMP_13._s || this;
        if ($gvars.log == null) $gvars.log = nil;
if (e == null) e = nil;
      $gvars.log.$debug("noteon " + (self.$Native(e)['$[]']("startChar")));
        return self.$highlight_abc_object(e);}, TMP_13._s = self, TMP_13), $a).call($i);
      ($a = ($j = self.harpnote_player).$on_noteoff, $a._p = (TMP_14 = function(e){var self = TMP_14._s || this;
        if ($gvars.log == null) $gvars.log = nil;
if (e == null) e = nil;
      $gvars.log.$debug("noteoff " + (self.$Native(e)['$[]']("startChar")));
        return self.$unhighlight_abc_object(e);}, TMP_14._s = self, TMP_14), $a).call($j);
      ($a = ($k = self.harpnote_player).$on_songoff, $a._p = (TMP_15 = function(){var self = TMP_15._s || this;

      return self.$stop_play_abc()}, TMP_15._s = self, TMP_15), $a).call($k);
      ($a = ($l = (($m = $scope.Element) == null ? $opal.cm('Element') : $m).$find(window)).$on, $a._p = (TMP_16 = function(evt){var self = TMP_16._s || this, $a;
        if ($gvars.log == null) $gvars.log = nil;
if (evt == null) evt = nil;
      $gvars.log.$debug("key pressed (" + ("controller") + " " + (351) + ")");
        console.log(event);
        if ((($a = evt.keyCode == 13 && evt.shiftKey) !== nil && (!$a._isBoolean || $a == true))) {
          evt.$prevent_default();
          self.$render_previews();
          return evt.preventDefault();
        } else if ((($a = (event.keyCode == 83 && event.ctrlKey) || (event.which == 19)) !== nil && (!$a._isBoolean || $a == true))) {
          evt.$prevent_default();
          self.$save_file();
          return evt.preventDefault();
          } else {
          return nil
        };}, TMP_16._s = self, TMP_16), $a).call($l, "keydown");
      return ($a = ($m = (($n = $scope.Element) == null ? $opal.cm('Element') : $n).$find("#dragbar")).$on, $a._p = (TMP_17 = function(re){var self = TMP_17._s || this, $a, $b, TMP_18, $c, TMP_19, $d;
if (re == null) re = nil;
      re.$prevent();
        ($a = ($b = (($c = $scope.Element) == null ? $opal.cm('Element') : $c).$find(document)).$on, $a._p = (TMP_18 = function(e){var self = TMP_18._s || this, $a;
if (e == null) e = nil;
        (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find("#leftColumn").$css("right", "" + ((window.innerWidth)['$-'](e.$page_x())) + "px");
          (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find("#rightColumn").$css("left", "" + (e.$page_x()) + "px");
          return (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find("#dragbar").$css("left", "" + (e.$page_x()) + "px");}, TMP_18._s = self, TMP_18), $a).call($b, "mousemove");
        return ($a = ($c = (($d = $scope.Element) == null ? $opal.cm('Element') : $d).$find(document)).$on, $a._p = (TMP_19 = function(){var self = TMP_19._s || this;

        return $(document).unbind('mousemove');}, TMP_19._s = self, TMP_19), $a).call($c, "mouseup");}, TMP_17._s = self, TMP_17), $a).call($m, "mousedown");
    };

    def.$set_active = function(ui_element) {
      var $a, self = this;

      return (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find(ui_element).$css("background-color", "red");
    };

    return (def.$set_inactive = function(ui_element) {
      var $a, self = this;

      return (($a = $scope.Element) == null ? $opal.cm('Element') : $a).$find(ui_element).$css("background-color", "white");
    }, nil) && 'set_inactive';
  })(self, null);
  return ($a = ($b = (($c = $scope.Document) == null ? $opal.cm('Document') : $c))['$ready?'], $a._p = (TMP_20 = function(){var self = TMP_20._s || this, $a;

  return (($a = $scope.Controller) == null ? $opal.cm('Controller') : $a).$new()}, TMP_20._s = self, TMP_20), $a).call($b);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/controller.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars, $hash2 = $opal.hash2;

  $opal.add_stubs(['$private', '$info', '$add_command', '$undoable=', '$set_help', '$as_action', '$join', '$help_string_style', '$undo', '$redo', '$map', '$first', '$name', '$[]', '$last', '$history', '$undostack', '$redostack', '$parameter_help', '$add_parameter', '$set_default', '$===', '$play_abc', '$error', '$stop_play_abc', '$raise', '$[]=', '$get_text', '$set_text', '$as_inverse', '$get_metadata', '$update', '$+', '$list', '$retrieve', '$command_tokens', '$new', '$app_name=', '$then', '$authenticate', '$app_name', '$to_s', '$select', '$=~', '$read_dir', '$harpnote_options', '$fail', '$write_file', '$gsub', '$output', '$render_a3', '$render_a4', '$each_with_index', '$each', '$push', '$when', '$puts', '$read_file']);
  return (function($base, $super) {
    function $Controller(){};
    var self = $Controller = $klass($base, $super, 'Controller', $Controller);

    var def = self._proto, $scope = self._scope;

    def.commands = nil;
    self.$private();

    def.$__ic_01_internal_commands = function() {
      var $a, $b, TMP_1, $c, TMP_4, $d, TMP_7, $e, TMP_10, $f, TMP_14, $g, TMP_18, self = this;
      if ($gvars.log == null) $gvars.log = nil;

      $gvars.log.$info("registering commands");
      ($a = ($b = self.commands).$add_command, $a._p = (TMP_1 = function(c){var self = TMP_1._s || this, $a, $b, TMP_2, $c, TMP_3;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_2 = function(){var self = TMP_2._s || this;

        return "this help"}, TMP_2._s = self, TMP_2), $a).call($b);
        return ($a = ($c = c).$as_action, $a._p = (TMP_3 = function(){var self = TMP_3._s || this;
          if (self.commands == null) self.commands = nil;
          if ($gvars.log == null) $gvars.log = nil;

        return $gvars.log.$info("<pre>" + (self.commands.$help_string_style().$join("\n")) + "</pre>")}, TMP_3._s = self, TMP_3), $a).call($c);}, TMP_1._s = self, TMP_1), $a).call($b, "help");
      ($a = ($c = self.commands).$add_command, $a._p = (TMP_4 = function(c){var self = TMP_4._s || this, $a, $b, TMP_5, $c, TMP_6;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_5 = function(){var self = TMP_5._s || this;

        return "undo last command"}, TMP_5._s = self, TMP_5), $a).call($b);
        return ($a = ($c = c).$as_action, $a._p = (TMP_6 = function(a){var self = TMP_6._s || this;
          if (self.commands == null) self.commands = nil;
if (a == null) a = nil;
        return self.commands.$undo()}, TMP_6._s = self, TMP_6), $a).call($c);}, TMP_4._s = self, TMP_4), $a).call($c, "undo");
      ($a = ($d = self.commands).$add_command, $a._p = (TMP_7 = function(c){var self = TMP_7._s || this, $a, $b, TMP_8, $c, TMP_9;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_8 = function(){var self = TMP_8._s || this;

        return "redo last command"}, TMP_8._s = self, TMP_8), $a).call($b);
        return ($a = ($c = c).$as_action, $a._p = (TMP_9 = function(a){var self = TMP_9._s || this;
          if (self.commands == null) self.commands = nil;
if (a == null) a = nil;
        return self.commands.$redo()}, TMP_9._s = self, TMP_9), $a).call($c);}, TMP_7._s = self, TMP_7), $a).call($d, "redo");
      ($a = ($e = self.commands).$add_command, $a._p = (TMP_10 = function(c){var self = TMP_10._s || this, $a, $b, TMP_11, $c, TMP_12;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_11 = function(){var self = TMP_11._s || this;

        return "show history"}, TMP_11._s = self, TMP_11), $a).call($b);
        return ($a = ($c = c).$as_action, $a._p = (TMP_12 = function(a){var self = TMP_12._s || this, $a, $b, TMP_13, history = nil;
          if (self.commands == null) self.commands = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (a == null) a = nil;
        history = ($a = ($b = self.commands.$history()).$map, $a._p = (TMP_13 = function(c){var self = TMP_13._s || this;
if (c == null) c = nil;
          return "" + (c.$first()) + ": " + (c['$[]'](1).$name()) + "(" + (c.$last()) + ")"}, TMP_13._s = self, TMP_13), $a).call($b);
          return $gvars.log.$info("<pre>" + (history.$join("\n")) + "</pre>");}, TMP_12._s = self, TMP_12), $a).call($c);}, TMP_10._s = self, TMP_10), $a).call($e, "history");
      ($a = ($f = self.commands).$add_command, $a._p = (TMP_14 = function(c){var self = TMP_14._s || this, $a, $b, TMP_15, $c, TMP_16;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_15 = function(){var self = TMP_15._s || this;

        return "show undo stack"}, TMP_15._s = self, TMP_15), $a).call($b);
        return ($a = ($c = c).$as_action, $a._p = (TMP_16 = function(a){var self = TMP_16._s || this, $a, $b, TMP_17, history = nil;
          if (self.commands == null) self.commands = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (a == null) a = nil;
        history = ($a = ($b = self.commands.$undostack()).$map, $a._p = (TMP_17 = function(c){var self = TMP_17._s || this;
if (c == null) c = nil;
          return "" + (c.$first()) + ": " + (c['$[]'](1).$name()) + "(" + (c.$last()) + ")"}, TMP_17._s = self, TMP_17), $a).call($b);
          return $gvars.log.$info("<pre>" + (history.$join("\n")) + "</pre>");}, TMP_16._s = self, TMP_16), $a).call($c);}, TMP_14._s = self, TMP_14), $a).call($f, "showundo");
      return ($a = ($g = self.commands).$add_command, $a._p = (TMP_18 = function(c){var self = TMP_18._s || this, $a, $b, TMP_19, $c, TMP_20;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_19 = function(){var self = TMP_19._s || this;

        return "show redo stack"}, TMP_19._s = self, TMP_19), $a).call($b);
        return ($a = ($c = c).$as_action, $a._p = (TMP_20 = function(a){var self = TMP_20._s || this, $a, $b, TMP_21, history = nil;
          if (self.commands == null) self.commands = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (a == null) a = nil;
        history = ($a = ($b = self.commands.$redostack()).$map, $a._p = (TMP_21 = function(c){var self = TMP_21._s || this;
if (c == null) c = nil;
          return "" + (c.$first()) + ": " + (c['$[]'](1).$name()) + "(" + (c.$last()) + ")"}, TMP_21._s = self, TMP_21), $a).call($b);
          return $gvars.log.$info("<pre>" + (history.$join("\n")) + "</pre>");}, TMP_20._s = self, TMP_20), $a).call($c);}, TMP_18._s = self, TMP_18), $a).call($g, "showredo");
    };

    def.$__ic_02_play_commands = function() {
      var $a, $b, TMP_22, $c, TMP_28, self = this;

      ($a = ($b = self.commands).$add_command, $a._p = (TMP_22 = function(c){var self = TMP_22._s || this, $a, $b, TMP_23, $c, TMP_24, $d, TMP_27;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_23 = function(){var self = TMP_23._s || this;

        return "play song " + (c.$parameter_help(0))}, TMP_23._s = self, TMP_23), $a).call($b);
        ($a = ($c = c).$add_parameter, $a._p = (TMP_24 = function(parameter){var self = TMP_24._s || this, $a, $b, TMP_25, $c, TMP_26;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a._p = (TMP_25 = function(){var self = TMP_25._s || this;

          return "ff"}, TMP_25._s = self, TMP_25), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a._p = (TMP_26 = function(){var self = TMP_26._s || this;

          return "r(all | ff | sel): range to play"}, TMP_26._s = self, TMP_26), $a).call($c);}, TMP_24._s = self, TMP_24), $a).call($c, "range", "string");
        return ($a = ($d = c).$as_action, $a._p = (TMP_27 = function(argument){var self = TMP_27._s || this, $case = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (argument == null) argument = nil;
        return (function() {$case = argument['$[]']("range");if ("sel"['$===']($case)) {return self.$play_abc("selection")}else if ("ff"['$===']($case)) {return self.$play_abc("selection_ff")}else if ("all"['$===']($case)) {return self.$play_abc()}else {return $gvars.log.$error("wrong range to play")}})()}, TMP_27._s = self, TMP_27), $a).call($d);}, TMP_22._s = self, TMP_22), $a).call($b, "p");
      return ($a = ($c = self.commands).$add_command, $a._p = (TMP_28 = function(c){var self = TMP_28._s || this, $a, $b, TMP_29, $c, TMP_30;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_29 = function(){var self = TMP_29._s || this;

        return "stop playing"}, TMP_29._s = self, TMP_29), $a).call($b);
        return ($a = ($c = c).$as_action, $a._p = (TMP_30 = function(a){var self = TMP_30._s || this;
if (a == null) a = nil;
        return self.$stop_play_abc()}, TMP_30._s = self, TMP_30), $a).call($c);}, TMP_28._s = self, TMP_28), $a).call($c, "stop");
    };

    def.$__ic_03_create_commands = function() {
      var $a, $b, TMP_31, self = this;

      return ($a = ($b = self.commands).$add_command, $a._p = (TMP_31 = function(c){var self = TMP_31._s || this, $a, $b, TMP_32, $c, TMP_33, $d, TMP_35, $e, TMP_38, $f, TMP_39;
if (c == null) c = nil;
      ($a = ($b = c).$set_help, $a._p = (TMP_32 = function(){var self = TMP_32._s || this;

        return "create song " + (c.$parameter_help(0)) + " " + (c.$parameter_help(1))}, TMP_32._s = self, TMP_32), $a).call($b);
        ($a = ($c = c).$add_parameter, $a._p = (TMP_33 = function(parameter){var self = TMP_33._s || this, $a, $b, TMP_34;
if (parameter == null) parameter = nil;
        return ($a = ($b = parameter).$set_help, $a._p = (TMP_34 = function(){var self = TMP_34._s || this;

          return "value for X: line, a unique id"}, TMP_34._s = self, TMP_34), $a).call($b)}, TMP_33._s = self, TMP_33), $a).call($c, "id", "string");
        ($a = ($d = c).$add_parameter, $a._p = (TMP_35 = function(parameter){var self = TMP_35._s || this, $a, $b, TMP_36, $c, TMP_37;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a._p = (TMP_36 = function(){var self = TMP_36._s || this;

          return "untitled"}, TMP_36._s = self, TMP_36), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a._p = (TMP_37 = function(){var self = TMP_37._s || this;

          return "Title of the song"}, TMP_37._s = self, TMP_37), $a).call($c);}, TMP_35._s = self, TMP_35), $a).call($d, "title", "string");
        ($a = ($e = c).$as_action, $a._p = (TMP_38 = function(args){var self = TMP_38._s || this, song_id = nil, song_title = nil, template = nil;
          if (self.editor == null) self.editor = nil;
if (args == null) args = nil;
        song_id = args['$[]']("id");
          song_title = args['$[]']("title");
          if (song_id !== false && song_id !== nil) {
            } else {
            self.$raise("no id specified")
          };
          if (song_title !== false && song_title !== nil) {
            } else {
            self.$raise("no title specified")
          };
          template = "X:" + (song_id) + "\nT:" + (song_title) + "\nC:{copyright}\nR:{rhythm}\nM:4/4\nL:1/4\nQ:1/4=120\nK:C\n% %%%hn.print {\"t\":\"alle Stimmen\",         \"v\":[1,2,3,4], \"s\": [[1,2],[3,4]], \"f\":[1,3], \"j\":[1]}\n% %%%hn.print {\"t\":\"sopran, alt\", \"v\":[1,2],     \"s\":[[1,2]],       \"f\":[1],   \"j\":[1]}\n%%%%hn.print {\"t\":\"tenor, bass\", \"v\":[3, 4],     \"s\":[[1, 2], [3,4]],       \"f\":[3  ],   \"j\":[1, 3]}\n%%%%hn.legend [10,10]\n%%%%hn.note [[5, 50], \"Folge: A A B B C A\", \"regular\"]\n%%%%hn.note [[360, 280], \"Erstellt mit Zupfnoter 0.7\", \"regular\"]\n%%score T1 T2  B1 B2\nV:T1 clef=treble-8 octave=-1 name=\"Sopran\" snm=\"S\"\nV:T2 clef=treble-8 octave=-1 name=\"Alt\" snm=\"A\"\nV:B1 clef=bass transpose=-24 name=\"Tenor\" middle=D, snm=\"T\"\nV:B2 clef=bass transpose=-24 name=\"Bass\" middle=D, snm=\"B\"\n[V:T1] c'\n[V:T2] c\n[V:B1] c,\n[V:B2] C\n%\n";
          args['$[]=']("oldval", self.editor.$get_text());
          return self.editor.$set_text(template);}, TMP_38._s = self, TMP_38), $a).call($e);
        return ($a = ($f = c).$as_inverse, $a._p = (TMP_39 = function(args){var self = TMP_39._s || this;
          if (self.editor == null) self.editor = nil;
if (args == null) args = nil;
        return self.editor.$set_text(args['$[]']("oldval"))}, TMP_39._s = self, TMP_39), $a).call($f);}, TMP_31._s = self, TMP_31), $a).call($b, "c");
    };

    def.$__ic_04_localstore_commands = function() {
      var $a, $b, TMP_40, $c, TMP_43, $d, TMP_47, self = this;

      ($a = ($b = self.commands).$add_command, $a._p = (TMP_40 = function(c){var self = TMP_40._s || this, $a, $b, TMP_41, $c, TMP_42;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_41 = function(){var self = TMP_41._s || this;

        return "save to localstore"}, TMP_41._s = self, TMP_41), $a).call($b);
        return ($a = ($c = c).$as_action, $a._p = (TMP_42 = function(){var self = TMP_42._s || this, abc_code = nil, metadata = nil, filename = nil;
          if (self.editor == null) self.editor = nil;
          if (self.abc_transformer == null) self.abc_transformer = nil;
          if (self.songbook == null) self.songbook = nil;
          if ($gvars.log == null) $gvars.log = nil;

        abc_code = self.editor.$get_text();
          metadata = self.abc_transformer.$get_metadata(abc_code);
          filename = "" + (metadata['$[]']("X")) + "_" + (metadata['$[]']("T"));
          self.songbook.$update(metadata['$[]']("X"), abc_code, metadata['$[]']("T"), true);
          return $gvars.log.$info("saved to '" + (filename) + "'");}, TMP_42._s = self, TMP_42), $a).call($c);}, TMP_40._s = self, TMP_40), $a).call($b, "lsave");
      ($a = ($c = self.commands).$add_command, $a._p = (TMP_43 = function(c){var self = TMP_43._s || this, $a, $b, TMP_44, $c, TMP_45;
if (c == null) c = nil;
      c['$undoable='](false);
        ($a = ($b = c).$set_help, $a._p = (TMP_44 = function(){var self = TMP_44._s || this;

        return "list files in localstore"}, TMP_44._s = self, TMP_44), $a).call($b);
        return ($a = ($c = c).$as_action, $a._p = (TMP_45 = function(a){var self = TMP_45._s || this, $a, $b, TMP_46;
          if (self.songbook == null) self.songbook = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (a == null) a = nil;
        return $gvars.log.$info("<pre>"['$+'](($a = ($b = self.songbook.$list()).$map, $a._p = (TMP_46 = function(k, v){var self = TMP_46._s || this;
if (k == null) k = nil;if (v == null) v = nil;
          return "" + (k) + "_" + (v)}, TMP_46._s = self, TMP_46), $a).call($b).$join("\n"))['$+']("</pre>"))}, TMP_45._s = self, TMP_45), $a).call($c);}, TMP_43._s = self, TMP_43), $a).call($c, "lls");
      return ($a = ($d = self.commands).$add_command, $a._p = (TMP_47 = function(c){var self = TMP_47._s || this, $a, $b, TMP_48, $c, TMP_50, $d, TMP_51, $e, TMP_52;
if (c == null) c = nil;
      c['$undoable='](true);
        ($a = ($b = c).$add_parameter, $a._p = (TMP_48 = function(parameter){var self = TMP_48._s || this, $a, $b, TMP_49;
if (parameter == null) parameter = nil;
        return ($a = ($b = parameter).$set_help, $a._p = (TMP_49 = function(){var self = TMP_49._s || this;

          return "id of the song to be loaded"}, TMP_49._s = self, TMP_49), $a).call($b)}, TMP_48._s = self, TMP_48), $a).call($b, "id", "string");
        ($a = ($c = c).$set_help, $a._p = (TMP_50 = function(){var self = TMP_50._s || this;

        return "open song from local store  " + (c.$parameter_help(0))}, TMP_50._s = self, TMP_50), $a).call($c);
        ($a = ($d = c).$as_action, $a._p = (TMP_51 = function(args){var self = TMP_51._s || this, $a, payload = nil;
          if (self.songbook == null) self.songbook = nil;
          if (self.editor == null) self.editor = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        if ((($a = args['$[]']("id")) !== nil && (!$a._isBoolean || $a == true))) {
            payload = self.songbook.$retrieve(args['$[]']("id"));
            if (payload !== false && payload !== nil) {
              args['$[]=']("oldval", self.editor.$get_text());
              return self.editor.$set_text(payload);
              } else {
              return $gvars.log.$error("song " + (self.$command_tokens().$last()) + " not found")
            };
            } else {
            return $gvars.log.$error("plase add a song number")
          }}, TMP_51._s = self, TMP_51), $a).call($d);
        return ($a = ($e = c).$as_inverse, $a._p = (TMP_52 = function(args){var self = TMP_52._s || this;
          if (self.editor == null) self.editor = nil;
if (args == null) args = nil;
        return self.editor.$set_text(args['$[]']("oldval"))}, TMP_52._s = self, TMP_52), $a).call($e);}, TMP_47._s = self, TMP_47), $a).call($d, "lopen");
    };

    return (def.$__ic_05_dropbox_commands = function() {
      var $a, $b, TMP_53, $c, TMP_61, $d, TMP_70, $e, TMP_77, $f, TMP_80, $g, TMP_91, self = this;

      ($a = ($b = self.commands).$add_command, $a._p = (TMP_53 = function(command){var self = TMP_53._s || this, $a, $b, TMP_54, $c, TMP_57, $d, TMP_58, $e, TMP_60;
if (command == null) command = nil;
      ($a = ($b = command).$add_parameter, $a._p = (TMP_54 = function(parameter){var self = TMP_54._s || this, $a, $b, TMP_55, $c, TMP_56;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a._p = (TMP_55 = function(){var self = TMP_55._s || this;

          return "app"}, TMP_55._s = self, TMP_55), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a._p = (TMP_56 = function(){var self = TMP_56._s || this;

          return "(app | full) app: app only | full: full dropbox"}, TMP_56._s = self, TMP_56), $a).call($c);}, TMP_54._s = self, TMP_54), $a).call($b, "scope", "string");
        ($a = ($c = command).$set_help, $a._p = (TMP_57 = function(){var self = TMP_57._s || this;

        return "dropbox login for " + (command.$parameter_help(0))}, TMP_57._s = self, TMP_57), $a).call($c);
        ($a = ($d = command).$as_action, $a._p = (TMP_58 = function(args){var self = TMP_58._s || this, $a, $b, $c, TMP_59, $case = nil;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        $case = args['$[]']("scope");if ("full"['$===']($case)) {self.dropboxclient = (($a = ((($b = ((($c = $scope.Opal) == null ? $opal.cm('Opal') : $c))._scope).DropboxJs == null ? $b.cm('DropboxJs') : $b.DropboxJs))._scope).Client == null ? $a.cm('Client') : $a.Client).$new("us2s6tq6bubk6xh");
          self.dropboxclient['$app_name=']("full Dropbox");
          self.dropboxpath = "/zupfnoter/";}else if ("app"['$===']($case)) {self.dropboxclient = (($a = ((($b = ((($c = $scope.Opal) == null ? $opal.cm('Opal') : $c))._scope).DropboxJs == null ? $b.cm('DropboxJs') : $b.DropboxJs))._scope).Client == null ? $a.cm('Client') : $a.Client).$new("xr3zna7wrp75zax");
          self.dropboxclient['$app_name=']("App folder only");
          self.dropboxpath = "/";}else {$gvars.log.$error("select app | full")};
          return ($a = ($b = self.dropboxclient.$authenticate()).$then, $a._p = (TMP_59 = function(){var self = TMP_59._s || this;
            if ($gvars.log == null) $gvars.log = nil;

          return $gvars.log.$info("logged in at dropbox with " + (args['$[]']("scope")) + " access")}, TMP_59._s = self, TMP_59), $a).call($b);}, TMP_58._s = self, TMP_58), $a).call($d);
        return ($a = ($e = command).$as_inverse, $a._p = (TMP_60 = function(args){var self = TMP_60._s || this;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        $gvars.log.$info("logged out from dropbox");
          return self.dropboxclient = nil;}, TMP_60._s = self, TMP_60), $a).call($e);}, TMP_53._s = self, TMP_53), $a).call($b, "dlogin");
      ($a = ($c = self.commands).$add_command, $a._p = (TMP_61 = function(command){var self = TMP_61._s || this, $a, $b, TMP_62, $c, TMP_65, $d, TMP_66;
if (command == null) command = nil;
      command['$undoable='](false);
        ($a = ($b = command).$add_parameter, $a._p = (TMP_62 = function(parameter){var self = TMP_62._s || this, $a, $b, TMP_63, $c, TMP_64;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a._p = (TMP_63 = function(){var self = TMP_63._s || this, $a;
            if (self.dropboxpath == null) self.dropboxpath = nil;

          return ((($a = self.dropboxpath) !== false && $a !== nil) ? $a : "/")}, TMP_63._s = self, TMP_63), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a._p = (TMP_64 = function(){var self = TMP_64._s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return "path in dropbox " + (self.dropboxclient.$app_name())}, TMP_64._s = self, TMP_64), $a).call($c);}, TMP_62._s = self, TMP_62), $a).call($b, "path", "string");
        ($a = ($c = command).$set_help, $a._p = (TMP_65 = function(){var self = TMP_65._s || this;

        return "list files in " + (command.$parameter_help(0))}, TMP_65._s = self, TMP_65), $a).call($c);
        return ($a = ($d = command).$as_action, $a._p = (TMP_66 = function(args){var self = TMP_66._s || this, $a, $b, TMP_67, $c, $d, TMP_69, rootpath = nil;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        rootpath = args['$[]']("path");
          $gvars.log.$info("" + (self.dropboxclient.$app_name()) + ": " + (args['$[]']("path")) + ":");
          return ($a = ($b = ($c = ($d = self.dropboxclient.$authenticate()).$then, $c._p = (TMP_69 = function(){var self = TMP_69._s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return self.dropboxclient.$read_dir(rootpath)}, TMP_69._s = self, TMP_69), $c).call($d)).$then, $a._p = (TMP_67 = function(entries){var self = TMP_67._s || this, $a, $b, TMP_68;
            if ($gvars.log == null) $gvars.log = nil;
if (entries == null) entries = nil;
          return $gvars.log.$info("<pre>"['$+'](($a = ($b = entries).$select, $a._p = (TMP_68 = function(entry){var self = TMP_68._s || this;
if (entry == null) entry = nil;
            return entry['$=~'](/\.abc$/)}, TMP_68._s = self, TMP_68), $a).call($b).$join("\n").$to_s())['$+']("</pre>"))}, TMP_67._s = self, TMP_67), $a).call($b);}, TMP_66._s = self, TMP_66), $a).call($d);}, TMP_61._s = self, TMP_61), $a).call($c, "dls");
      ($a = ($d = self.commands).$add_command, $a._p = (TMP_70 = function(command){var self = TMP_70._s || this, $a, $b, TMP_71, $c, TMP_74, $d, TMP_75, $e, TMP_76;
if (command == null) command = nil;
      ($a = ($b = command).$add_parameter, $a._p = (TMP_71 = function(parameter){var self = TMP_71._s || this, $a, $b, TMP_72, $c, TMP_73;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a._p = (TMP_72 = function(){var self = TMP_72._s || this;
            if (self.dropboxpath == null) self.dropboxpath = nil;

          return self.dropboxpath}, TMP_72._s = self, TMP_72), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a._p = (TMP_73 = function(){var self = TMP_73._s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return "path in dropbox " + (self.dropboxclient.$app_name())}, TMP_73._s = self, TMP_73), $a).call($c);}, TMP_71._s = self, TMP_71), $a).call($b, "path", "string");
        ($a = ($c = command).$set_help, $a._p = (TMP_74 = function(){var self = TMP_74._s || this;

        return "dropbox change dir to " + (command.$parameter_help(0))}, TMP_74._s = self, TMP_74), $a).call($c);
        ($a = ($d = command).$as_action, $a._p = (TMP_75 = function(args){var self = TMP_75._s || this, rootpath = nil;
          if (self.dropboxpath == null) self.dropboxpath = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        rootpath = args['$[]']("path");
          args['$[]=']("oldval", self.dropboxpath);
          self.dropboxpath = rootpath;
          return $gvars.log.$info("dropbox path changed to " + (self.dropboxpath));}, TMP_75._s = self, TMP_75), $a).call($d);
        return ($a = ($e = command).$as_inverse, $a._p = (TMP_76 = function(args){var self = TMP_76._s || this;
          if (self.dropboxpath == null) self.dropboxpath = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        self.dropboxpath = args['$[]']("oldval");
          return $gvars.log.$info("dropbox path changed back to " + (self.dropboxpath));}, TMP_76._s = self, TMP_76), $a).call($e);}, TMP_70._s = self, TMP_70), $a).call($d, "dcd");
      ($a = ($e = self.commands).$add_command, $a._p = (TMP_77 = function(command){var self = TMP_77._s || this, $a, $b, TMP_78, $c, TMP_79;
if (command == null) command = nil;
      command['$undoable='](false);
        ($a = ($b = command).$set_help, $a._p = (TMP_78 = function(){var self = TMP_78._s || this;

        return "show drobox path"}, TMP_78._s = self, TMP_78), $a).call($b);
        return ($a = ($c = command).$as_action, $a._p = (TMP_79 = function(args){var self = TMP_79._s || this;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if (self.dropboxpath == null) self.dropboxpath = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        return $gvars.log.$info("" + (self.dropboxclient.$app_name()) + ": " + (self.dropboxpath))}, TMP_79._s = self, TMP_79), $a).call($c);}, TMP_77._s = self, TMP_77), $a).call($e, "dpwd");
      ($a = ($f = self.commands).$add_command, $a._p = (TMP_80 = function(command){var self = TMP_80._s || this, $a, $b, TMP_81, $c, TMP_84, $d, TMP_85;
if (command == null) command = nil;
      ($a = ($b = command).$add_parameter, $a._p = (TMP_81 = function(parameter){var self = TMP_81._s || this, $a, $b, TMP_82, $c, TMP_83;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a._p = (TMP_82 = function(){var self = TMP_82._s || this;
            if (self.dropboxpath == null) self.dropboxpath = nil;

          return self.dropboxpath}, TMP_82._s = self, TMP_82), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a._p = (TMP_83 = function(){var self = TMP_83._s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return "path to save in " + (self.dropboxclient.$app_name())}, TMP_83._s = self, TMP_83), $a).call($c);}, TMP_81._s = self, TMP_81), $a).call($b, "path", "string");
        command['$undoable='](false);
        ($a = ($c = command).$set_help, $a._p = (TMP_84 = function(){var self = TMP_84._s || this;

        return "save to dropbox {" + (command.$parameter_help(0)) + "}"}, TMP_84._s = self, TMP_84), $a).call($c);
        return ($a = ($d = command).$as_action, $a._p = (TMP_85 = function(args){var self = TMP_85._s || this, $a, $b, TMP_86, $c, $d, TMP_87, $e, $f, TMP_88, abc_code = nil, metadata = nil, filebase = nil, print_variants = nil, rootpath = nil;
          if (self.editor == null) self.editor = nil;
          if (self.abc_transformer == null) self.abc_transformer = nil;
          if (self.song == null) self.song = nil;
          if (self.dropboxclient == null) self.dropboxclient = nil;
if (args == null) args = nil;
        abc_code = self.editor.$get_text();
          metadata = self.abc_transformer.$get_metadata(abc_code);
          filebase = "" + (metadata['$[]']("X")) + "_" + (metadata['$[]']("T"));
          print_variants = self.song.$harpnote_options()['$[]']("print");
          rootpath = args['$[]']("path");
          return ($a = ($b = ($c = ($d = ($e = ($f = self.dropboxclient.$authenticate()).$then, $e._p = (TMP_88 = function(){var self = TMP_88._s || this, $a, $b, TMP_89, $c, TMP_90, save_promises = nil, pdfs = nil;
            if (self.dropboxclient == null) self.dropboxclient = nil;
            if (self.editor == null) self.editor = nil;

          save_promises = [self.dropboxclient.$write_file("" + (rootpath) + (filebase) + ".abc", self.editor.$get_text())];
            pdfs = $hash2([], {});
            ($a = ($b = print_variants.$each_with_index()).$map, $a._p = (TMP_89 = function(print_variant, index){var self = TMP_89._s || this, filename = nil;
if (print_variant == null) print_variant = nil;if (index == null) index = nil;
            filename = print_variant['$[]']("title").$gsub(/[^a-zA-Z0-9\-\_]/, "_");
              pdfs['$[]=']("" + (rootpath) + (filebase) + "_" + (print_variant['$[]']("title")) + "_a3.pdf", self.$render_a3(index).$output("blob"));
              return pdfs['$[]=']("" + (rootpath) + (filebase) + "_" + (print_variant['$[]']("title")) + "_a4.pdf", self.$render_a4(index).$output("blob"));}, TMP_89._s = self, TMP_89), $a).call($b);
            ($a = ($c = pdfs).$each, $a._p = (TMP_90 = function(name, pdfdata){var self = TMP_90._s || this;
              if (self.dropboxclient == null) self.dropboxclient = nil;
if (name == null) name = nil;if (pdfdata == null) pdfdata = nil;
            return save_promises.$push(self.dropboxclient.$write_file(name, pdfdata))}, TMP_90._s = self, TMP_90), $a).call($c);
            save_promises.$push(self.dropboxclient.$write_file("" + (rootpath) + (filebase) + ".abc", self.editor.$get_text()));
            return (($a = $scope.Promise) == null ? $opal.cm('Promise') : $a).$when(save_promises);}, TMP_88._s = self, TMP_88), $e).call($f)).$then, $c._p = (TMP_87 = function(){var self = TMP_87._s || this;
            if ($gvars.log == null) $gvars.log = nil;

          return $gvars.log.$info("all files saved")}, TMP_87._s = self, TMP_87), $c).call($d)).$fail, $a._p = (TMP_86 = function(err){var self = TMP_86._s || this;
            if ($gvars.log == null) $gvars.log = nil;
if (err == null) err = nil;
          return $gvars.log.$error("there was an error saving files " + (err))}, TMP_86._s = self, TMP_86), $a).call($b);}, TMP_85._s = self, TMP_85), $a).call($d);}, TMP_80._s = self, TMP_80), $a).call($f, "dsave");
      return ($a = ($g = self.commands).$add_command, $a._p = (TMP_91 = function(command){var self = TMP_91._s || this, $a, $b, TMP_92, $c, TMP_95, $d, TMP_96, $e, TMP_101;
if (command == null) command = nil;
      command.$add_parameter("fileid", "string", "file id");
        ($a = ($b = command).$add_parameter, $a._p = (TMP_92 = function(p){var self = TMP_92._s || this, $a, $b, TMP_93, $c, TMP_94;
if (p == null) p = nil;
        ($a = ($b = p).$set_default, $a._p = (TMP_93 = function(){var self = TMP_93._s || this;
            if (self.dropboxpath == null) self.dropboxpath = nil;

          return self.dropboxpath}, TMP_93._s = self, TMP_93), $a).call($b);
          return ($a = ($c = p).$set_help, $a._p = (TMP_94 = function(){var self = TMP_94._s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return "path to save in " + (self.dropboxclient.$app_name())}, TMP_94._s = self, TMP_94), $a).call($c);}, TMP_92._s = self, TMP_92), $a).call($b, "path", "string");
        ($a = ($c = command).$set_help, $a._p = (TMP_95 = function(){var self = TMP_95._s || this;

        return "read file with " + (command.$parameter_help(0)) + ", from dropbox " + (command.$parameter_help(1))}, TMP_95._s = self, TMP_95), $a).call($c);
        ($a = ($d = command).$as_action, $a._p = (TMP_96 = function(args){var self = TMP_96._s || this, $a, $b, TMP_97, $c, $d, TMP_98, $e, $f, TMP_100, fileid = nil, rootpath = nil;
          if (self.editor == null) self.editor = nil;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        args['$[]=']("oldval", self.editor.$get_text());
          fileid = args['$[]']("fileid");
          rootpath = args['$[]']("path");
          $gvars.log.$info("get from Dropbox path " + (rootpath) + (fileid) + "_ ...:");
          return ($a = ($b = ($c = ($d = ($e = ($f = self.dropboxclient.$authenticate()).$then, $e._p = (TMP_100 = function(error, data){var self = TMP_100._s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;
if (error == null) error = nil;if (data == null) data = nil;
          return self.dropboxclient.$read_dir(rootpath)}, TMP_100._s = self, TMP_100), $e).call($f)).$then, $c._p = (TMP_98 = function(entries){var self = TMP_98._s || this, $a, $b, TMP_99, file = nil;
            if (self.dropboxclient == null) self.dropboxclient = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (entries == null) entries = nil;
          $gvars.log.$puts(entries);
            file = ($a = ($b = entries).$select, $a._p = (TMP_99 = function(entry){var self = TMP_99._s || this;
if (entry == null) entry = nil;
            return entry['$=~']((new RegExp("" + fileid + "_.*\\.abc$")))}, TMP_99._s = self, TMP_99), $a).call($b).$first();
            return self.dropboxclient.$read_file("" + (rootpath) + (file));}, TMP_98._s = self, TMP_98), $c).call($d)).$then, $a._p = (TMP_97 = function(abc_text){var self = TMP_97._s || this;
            if (self.editor == null) self.editor = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (abc_text == null) abc_text = nil;
          $gvars.log.$puts("got it");
            return self.editor.$set_text(abc_text);}, TMP_97._s = self, TMP_97), $a).call($b);}, TMP_96._s = self, TMP_96), $a).call($d);
        return ($a = ($e = command).$as_inverse, $a._p = (TMP_101 = function(args){var self = TMP_101._s || this;
          if (self.editor == null) self.editor = nil;
if (args == null) args = nil;
        return self.editor.$set_text(args['$[]']("oldval"))}, TMP_101._s = self, TMP_101), $a).call($e);}, TMP_91._s = self, TMP_91), $a).call($g, "dopen");
    }, nil) && '__ic_05_dropbox_commands';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/controller_command_definitions.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $gvars = $opal.gvars, $hash2 = $opal.hash2;

  $opal.add_stubs(['$on', '$[]', '$Native', '$call', '$select', '$>=', '$first', '$play_notes', '$stop', '$last', '$*', '$+', '$-', '$each', '$clone', '$[]=', '$to_n', '$nil?', '$>', '$<', '$===', '$push', '$sort', '$reduce', '$meta_data', '$/', '$debug', '$compact', '$flatten', '$map', '$beat', '$-@', '$pitch', '$duration', '$is_a?', '$origin', '$each_with_index', '$voices']);
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Music');

      var def = self._proto, $scope = self._scope;

      (function($base, $super) {
        function $HarpnotePlayer(){};
        var self = $HarpnotePlayer = $klass($base, $super, 'HarpnotePlayer', $HarpnotePlayer);

        var def = self._proto, $scope = self._scope, TMP_1, TMP_3, TMP_5;

        def.isplaying = def.inst = def.voice_elements = def.selection = def.song_off_timer = def.timefactor = nil;
        def.$initialize = function() {
          var self = this;

          self.inst = new Instrument("piano");
          self.isplaying = false;
          return self.selection = [];
        };

        def['$is_playing?'] = function() {
          var self = this;

          return self.isplaying;
        };

        def.$on_noteon = TMP_1 = function() {
          var $a, $b, TMP_2, self = this, $iter = TMP_1._p, block = $iter || nil;

          TMP_1._p = null;
          return ($a = ($b = self.$Native(self.inst)).$on, $a._p = (TMP_2 = function(element){var self = TMP_2._s || this, abc_element = nil;
if (element == null) element = nil;
          abc_element = self.$Native(element)['$[]']("origin");
            block.$call(abc_element);
            return nil;}, TMP_2._s = self, TMP_2), $a).call($b, "noteon");
        };

        def.$on_noteoff = TMP_3 = function() {
          var $a, $b, TMP_4, self = this, $iter = TMP_3._p, block = $iter || nil;

          TMP_3._p = null;
          return ($a = ($b = self.$Native(self.inst)).$on, $a._p = (TMP_4 = function(element){var self = TMP_4._s || this, abc_element = nil;
if (element == null) element = nil;
          abc_element = self.$Native(element)['$[]']("origin");
            block.$call(abc_element);
            return nil;}, TMP_4._s = self, TMP_4), $a).call($b, "noteoff");
        };

        def.$on_songoff = TMP_5 = function() {
          var self = this, $iter = TMP_5._p, block = $iter || nil;

          TMP_5._p = null;
          return self.songoff_callback = block;
        };

        def.$play_from_selection = function() {
          var $a, $b, TMP_6, self = this, notes_to_play = nil;

          notes_to_play = ($a = ($b = self.voice_elements).$select, $a._p = (TMP_6 = function(n){var self = TMP_6._s || this;
            if (self.selection == null) self.selection = nil;
if (n == null) n = nil;
          return n['$[]']("delay")['$>='](self.selection.$first()['$[]']("delay"))}, TMP_6._s = self, TMP_6), $a).call($b);
          return self.$play_notes(notes_to_play);
        };

        def.$play_selection = function() {
          var self = this;

          return self.$play_notes(self.selection);
        };

        def.$play_song = function() {
          var self = this;

          return self.$play_notes(self.voice_elements);
        };

        def.$play_notes = function(the_notes) {
          var $a, $b, TMP_7, self = this, firstnote = nil, lastnote = nil, stop_time = nil;

          self.$stop();
          if ((($a = self.song_off_timer) !== nil && (!$a._isBoolean || $a == true))) {
            clearTimeout(self.song_off_timer);};
          firstnote = the_notes.$first();
          lastnote = the_notes.$last();
          stop_time = (lastnote['$[]']("delay")['$-'](firstnote['$[]']("delay"))['$+']((64)['$*'](self.timefactor)))['$*'](1000);
          self.song_off_timer = setTimeout(function(){self.songoff_callback.$call()}, stop_time );
          ($a = ($b = the_notes).$each, $a._p = (TMP_7 = function(the_note){var self = TMP_7._s || this, $a, $b, the_note_to_play = nil, note = nil;
if (the_note == null) the_note = nil;
          the_note_to_play = the_note.$clone();
            ($a = "delay", $b = the_note_to_play, $b['$[]=']($a, $b['$[]']($a)['$-'](firstnote['$[]']("delay"))));
            note = the_note_to_play.$to_n();
            
            self.inst.tone(note);
            self.inst.schedule(note.delay + note.duration, function(){self.inst._trigger("noteoff", note);});
           }, TMP_7._s = self, TMP_7), $a).call($b);
          return self.isplaying = true;
        };

        def.$stop = function() {
          var self = this;

          self.inst.silence();
          return self.isplaying = false;
        };

        def.$unhighlight_all = function() {
          var self = this;

          return self.selection = [];
        };

        def.$range_highlight = function(from, to) {
          var $a, $b, TMP_8, $c, $d, TMP_9, self = this;

          self.selection = [];
          return ($a = ($b = ($c = ($d = self.voice_elements).$sort, $c._p = (TMP_9 = function(e){var self = TMP_9._s || this;
if (e == null) e = nil;
          return e['$[]']("delay")}, TMP_9._s = self, TMP_9), $c).call($d)).$each, $a._p = (TMP_8 = function(element){var self = TMP_8._s || this, $a, $b, $c, origin = nil, el_start = nil, el_end = nil;
            if (self.selection == null) self.selection = nil;
if (element == null) element = nil;
          origin = self.$Native(element['$[]']("origin"));
            if ((($a = origin['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return nil
              } else {
              el_start = origin['$[]']("startChar");
              el_end = origin['$[]']("endChar");
              if ((($a = (((($b = ((($c = to['$>'](el_start)) ? from['$<'](el_end) : $c))) !== false && $b !== nil) ? $b : (($c = (to['$==='](from)), $c !== false && $c !== nil ?to['$==='](el_end) : $c))))) !== nil && (!$a._isBoolean || $a == true))) {
                return self.selection.$push(element)
                } else {
                return nil
              };
            };}, TMP_8._s = self, TMP_8), $a).call($b);
        };

        return (def.$load_song = function(music) {
          var $a, $b, TMP_10, self = this, specduration = nil, specbpm = nil, spectf = nil, tf = nil;
          if ($gvars.log == null) $gvars.log = nil;

          specduration = music.$meta_data()['$[]']("tempo")['$[]']("duration").$reduce("+");
          specbpm = music.$meta_data()['$[]']("tempo")['$[]']("bpm");
          spectf = (specduration['$*'](specbpm));
          tf = spectf['$*'](((128)['$/'](120)));
          self.timefactor = (1)['$/'](tf);
          $gvars.log.$debug("playing with tempo: " + (tf) + " ticks per quarter " + ("harpnote_player") + " " + (121));
          return self.voice_elements = ($a = ($b = music.$voices().$each_with_index()).$map, $a._p = (TMP_10 = function(voice, index){var self = TMP_10._s || this, $a, $b, TMP_11, $c, $d, TMP_12;
if (voice == null) voice = nil;if (index == null) index = nil;
          return ($a = ($b = ($c = ($d = voice).$select, $c._p = (TMP_12 = function(c){var self = TMP_12._s || this, $a;
if (c == null) c = nil;
            return c['$is_a?']((($a = $scope.Playable) == null ? $opal.cm('Playable') : $a))}, TMP_12._s = self, TMP_12), $c).call($d)).$map, $a._p = (TMP_11 = function(root){var self = TMP_11._s || this, $a, $b, delay = nil, pitch = nil, duration = nil, velocity = nil;
              if (self.timefactor == null) self.timefactor = nil;
if (root == null) root = nil;
            delay = root.$beat()['$*'](self.timefactor);
              pitch = root.$pitch()['$-@']();
              duration = root.$duration()['$*'](self.timefactor);
              velocity = 0.2;
              if ((($a = root['$is_a?']((($b = $scope.Pause) == null ? $opal.cm('Pause') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
                velocity = 1.1e-05};
              return $hash2(["pitch", "velocity", "duration", "delay", "origin"], {"pitch": pitch, "velocity": velocity, "duration": duration, "delay": delay, "origin": root.$origin()});}, TMP_11._s = self, TMP_11), $a).call($b)}, TMP_10._s = self, TMP_10), $a).call($b).$flatten().$compact();
        }, nil) && 'load_song';
      })(self, null)
      
    })(self)
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/harpnote_player.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $gvars = $opal.gvars;

  $opal.add_stubs(['$attr_accessor', '$on', '$call', '$Native', '$getSession', '$[]', '$debug']);
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $TextPane(){};
      var self = $TextPane = $klass($base, $super, 'TextPane', $TextPane);

      var def = self._proto, $scope = self._scope, TMP_1, TMP_3;

      def.editor = nil;
      self.$attr_accessor("editor");

      def.$initialize = function(div) {
        var self = this;

        
        var editor = ace.edit(div);
        // editor.setTheme("ace/theme/tomorrow_night");
      
        return self.editor = editor;
      };

      def.$on_change = TMP_1 = function() {
        var $a, $b, TMP_2, self = this, $iter = TMP_1._p, block = $iter || nil;

        TMP_1._p = null;
        return ($a = ($b = self.$Native(self.$Native(self.editor).$getSession())).$on, $a._p = (TMP_2 = function(e){var self = TMP_2._s || this;
if (e == null) e = nil;
        return block.$call(e)}, TMP_2._s = self, TMP_2), $a).call($b, "change");
      };

      def.$on_selection_change = TMP_3 = function() {
        var $a, $b, TMP_4, self = this, $iter = TMP_3._p, block = $iter || nil;

        TMP_3._p = null;
        return ($a = ($b = self.$Native(self.$Native(self.editor)['$[]']("selection"))).$on, $a._p = (TMP_4 = function(e){var self = TMP_4._s || this;
if (e == null) e = nil;
        return block.$call(e)}, TMP_4._s = self, TMP_4), $a).call($b, "changeSelection");
      };

      def.$get_selection_positions = function() {
        var self = this;

        
        doc = self.editor.selection.doc;
        range = self.editor.selection.getRange();
        range_start = doc.positionToIndex(range.start, 0);
        range_end = doc.positionToIndex(range.end, 0);
      
        return [range_start, range_end];
      };

      def.$select_range_by_position = function(selection_start, selection_end) {
        var self = this;
        if ($gvars.log == null) $gvars.log = nil;

        $gvars.log.$debug("set editor selection to " + (selection_start) + ", " + (selection_end) + " (" + ("text_pane") + " " + (70) + ") ");
        
        doc = self.editor.selection.doc
        startrange = doc.indexToPosition(selection_start);
        endrange = doc.indexToPosition(selection_end);
        range = new Range(startrange.row, startrange.column, endrange.row, endrange.column);
        myrange = {start:startrange, end:endrange}
        self.editor.selection.setSelectionRange(myrange, false);
      
      };

      def.$get_text = function() {
        var self = this;

        return self.editor.getSession().getValue();
      };

      return (def.$set_text = function(text) {
        var self = this;

        return self.editor.getSession().setValue(text);
      }, nil) && 'set_text';
    })(self, null)
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/text_pane.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$resolve', '$new', '$reject', '$attr_reader', '$!', '$==', '$<<', '$>>', '$exception?', '$resolved?', '$value', '$rejected?', '$===', '$error', '$realized?', '$raise', '$^', '$call', '$resolve!', '$exception!', '$reject!', '$class', '$object_id', '$+', '$inspect', '$act?', '$prev', '$concat', '$it', '$lambda', '$reverse', '$each', '$wait', '$then', '$to_proc', '$map', '$reduce', '$always', '$try', '$tap', '$all?', '$find']);
  return (function($base, $super) {
    function $Promise(){};
    var self = $Promise = $klass($base, $super, 'Promise', $Promise);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4;

    def.success = def.exception = def.realized = def.delayed = def.failure = def.error = def.prev = def.next = def.value = nil;
    $opal.defs(self, '$value', function(value) {
      var self = this;

      return self.$new().$resolve(value);
    });

    $opal.defs(self, '$error', function(value) {
      var self = this;

      return self.$new().$reject(value);
    });

    $opal.defs(self, '$when', function(promises) {
      var $a, self = this;

      promises = $slice.call(arguments, 0);
      return (($a = $scope.When) == null ? $opal.cm('When') : $a).$new(promises);
    });

    self.$attr_reader("value", "error", "prev", "next");

    def.$initialize = function(success, failure) {
      var self = this;

      if (success == null) {
        success = nil
      }
      if (failure == null) {
        failure = nil
      }
      self.success = success;
      self.failure = failure;
      self.realized = nil;
      self.exception = false;
      self.value = nil;
      self.error = nil;
      self.delayed = nil;
      self.prev = nil;
      return self.next = nil;
    };

    def['$act?'] = function() {
      var self = this;

      return self.success['$=='](nil)['$!']();
    };

    def['$exception?'] = function() {
      var self = this;

      return self.exception;
    };

    def['$realized?'] = function() {
      var self = this;

      return self.realized['$=='](nil)['$!']();
    };

    def['$resolved?'] = function() {
      var self = this;

      return self.realized['$==']("resolve");
    };

    def['$rejected?'] = function() {
      var self = this;

      return self.realized['$==']("reject");
    };

    def['$^'] = function(promise) {
      var self = this;

      promise['$<<'](self);
      self['$>>'](promise);
      return promise;
    };

    def['$<<'] = function(promise) {
      var self = this;

      self.prev = promise;
      return self;
    };

    def['$>>'] = function(promise) {
      var $a, $b, $c, $d, self = this;

      self.next = promise;
      if ((($a = self['$exception?']()) !== nil && (!$a._isBoolean || $a == true))) {
        promise.$reject(self.delayed)
      } else if ((($a = self['$resolved?']()) !== nil && (!$a._isBoolean || $a == true))) {
        promise.$resolve(((($a = self.delayed) !== false && $a !== nil) ? $a : self.$value()))
      } else if ((($a = ($b = self['$rejected?'](), $b !== false && $b !== nil ?(((($c = self.failure['$!']()) !== false && $c !== nil) ? $c : (($d = $scope.Promise) == null ? $opal.cm('Promise') : $d)['$===']((((($d = self.delayed) !== false && $d !== nil) ? $d : self.error))))) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        promise.$reject(((($a = self.delayed) !== false && $a !== nil) ? $a : self.$error()))};
      return self;
    };

    def.$resolve = function(value) {
      var $a, $b, self = this, e = nil;

      if (value == null) {
        value = nil
      }
      if ((($a = self['$realized?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "the promise has already been realized")};
      if ((($a = (($b = $scope.Promise) == null ? $opal.cm('Promise') : $b)['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
        value['$<<'](self.prev);
        return value['$^'](self);};
      self.realized = "resolve";
      self.value = value;
      try {
      if ((($a = self.success) !== nil && (!$a._isBoolean || $a == true))) {
          value = self.success.$call(value)};
        self['$resolve!'](value);
      } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.Exception) == null ? $opal.cm('Exception') : $a)])) {e = $err;
        self['$exception!'](e)
        }else { throw $err; }
      };
      return self;
    };

    def['$resolve!'] = function(value) {
      var $a, self = this;

      if ((($a = self.next) !== nil && (!$a._isBoolean || $a == true))) {
        return self.next.$resolve(value)
        } else {
        return self.delayed = value
      };
    };

    def.$reject = function(value) {
      var $a, $b, self = this, e = nil;

      if (value == null) {
        value = nil
      }
      if ((($a = self['$realized?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "the promise has already been realized")};
      if ((($a = (($b = $scope.Promise) == null ? $opal.cm('Promise') : $b)['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
        value['$<<'](self.prev);
        return value['$^'](self);};
      self.realized = "reject";
      self.error = value;
      try {
      if ((($a = self.failure) !== nil && (!$a._isBoolean || $a == true))) {
          value = self.failure.$call(value);
          if ((($a = (($b = $scope.Promise) == null ? $opal.cm('Promise') : $b)['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
            self['$reject!'](value)};
          } else {
          self['$reject!'](value)
        }
      } catch ($err) {if ($opal.$rescue($err, [(($a = $scope.Exception) == null ? $opal.cm('Exception') : $a)])) {e = $err;
        self['$exception!'](e)
        }else { throw $err; }
      };
      return self;
    };

    def['$reject!'] = function(value) {
      var $a, self = this;

      if ((($a = self.next) !== nil && (!$a._isBoolean || $a == true))) {
        return self.next.$reject(value)
        } else {
        return self.delayed = value
      };
    };

    def['$exception!'] = function(error) {
      var self = this;

      self.exception = true;
      return self['$reject!'](error);
    };

    def.$then = TMP_1 = function() {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      return self['$^']((($a = $scope.Promise) == null ? $opal.cm('Promise') : $a).$new(block));
    };

    $opal.defn(self, '$do', def.$then);

    def.$fail = TMP_2 = function() {
      var $a, self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      return self['$^']((($a = $scope.Promise) == null ? $opal.cm('Promise') : $a).$new(nil, block));
    };

    $opal.defn(self, '$rescue', def.$fail);

    $opal.defn(self, '$catch', def.$fail);

    def.$always = TMP_3 = function() {
      var $a, self = this, $iter = TMP_3._p, block = $iter || nil;

      TMP_3._p = null;
      return self['$^']((($a = $scope.Promise) == null ? $opal.cm('Promise') : $a).$new(block, block));
    };

    $opal.defn(self, '$finally', def.$always);

    $opal.defn(self, '$ensure', def.$always);

    def.$trace = TMP_4 = function() {
      var $a, self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      return self['$^']((($a = $scope.Trace) == null ? $opal.cm('Trace') : $a).$new(block));
    };

    def.$inspect = function() {
      var $a, self = this, result = nil;

      result = "#<" + (self.$class()) + "(" + (self.$object_id()) + ")";
      if ((($a = self.next) !== nil && (!$a._isBoolean || $a == true))) {
        result = result['$+'](" >> " + (self.next.$inspect()))};
      if ((($a = self['$realized?']()) !== nil && (!$a._isBoolean || $a == true))) {
        result = result['$+'](": " + ((((($a = self.value) !== false && $a !== nil) ? $a : self.error)).$inspect()) + ">")
        } else {
        result = result['$+'](">")
      };
      return result;
    };

    (function($base, $super) {
      function $Trace(){};
      var self = $Trace = $klass($base, $super, 'Trace', $Trace);

      var def = self._proto, $scope = self._scope, TMP_6;

      $opal.defs(self, '$it', function(promise) {
        var $a, self = this, current = nil, prev = nil;

        if ((($a = promise['$realized?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "the promise hasn't been realized")
        };
        current = (function() {if ((($a = promise['$act?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return [promise.$value()]
          } else {
          return []
        }; return nil; })();
        if ((($a = prev = promise.$prev()) !== nil && (!$a._isBoolean || $a == true))) {
          return current.$concat(self.$it(prev))
          } else {
          return current
        };
      });

      return (def.$initialize = TMP_6 = function(block) {
        var $a, $b, TMP_5, self = this, $iter = TMP_6._p, $yield = $iter || nil;

        TMP_6._p = null;
        return $opal.find_super_dispatcher(self, 'initialize', TMP_6, null).apply(self, [($a = ($b = self).$lambda, $a._p = (TMP_5 = function(){var self = TMP_5._s || this, $a, $b;

        return ($a = block).$call.apply($a, [].concat((($b = $scope.Trace) == null ? $opal.cm('Trace') : $b).$it(self).$reverse()))}, TMP_5._s = self, TMP_5), $a).call($b)]);
      }, nil) && 'initialize';
    })(self, self);

    return (function($base, $super) {
      function $When(){};
      var self = $When = $klass($base, $super, 'When', $When);

      var def = self._proto, $scope = self._scope, TMP_7, TMP_9, TMP_11, TMP_13, TMP_17;

      def.wait = nil;
      def.$initialize = TMP_7 = function(promises) {
        var $a, $b, TMP_8, self = this, $iter = TMP_7._p, $yield = $iter || nil;

        if (promises == null) {
          promises = []
        }
        TMP_7._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_7, null).apply(self, []);
        self.wait = [];
        return ($a = ($b = promises).$each, $a._p = (TMP_8 = function(promise){var self = TMP_8._s || this;
if (promise == null) promise = nil;
        return self.$wait(promise)}, TMP_8._s = self, TMP_8), $a).call($b);
      };

      def.$each = TMP_9 = function() {
        var $a, $b, TMP_10, self = this, $iter = TMP_9._p, block = $iter || nil;

        TMP_9._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "no block given")
        };
        return ($a = ($b = self).$then, $a._p = (TMP_10 = function(values){var self = TMP_10._s || this, $a, $b;
if (values == null) values = nil;
        return ($a = ($b = values).$each, $a._p = block.$to_proc(), $a).call($b)}, TMP_10._s = self, TMP_10), $a).call($b);
      };

      def.$collect = TMP_11 = function() {
        var $a, $b, TMP_12, self = this, $iter = TMP_11._p, block = $iter || nil;

        TMP_11._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise((($a = $scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "no block given")
        };
        return ($a = ($b = self).$then, $a._p = (TMP_12 = function(values){var self = TMP_12._s || this, $a, $b;
if (values == null) values = nil;
        return (($a = $scope.When) == null ? $opal.cm('When') : $a).$new(($a = ($b = values).$map, $a._p = block.$to_proc(), $a).call($b))}, TMP_12._s = self, TMP_12), $a).call($b);
      };

      def.$inject = TMP_13 = function(args) {
        var $a, $b, TMP_14, self = this, $iter = TMP_13._p, block = $iter || nil;

        args = $slice.call(arguments, 0);
        TMP_13._p = null;
        return ($a = ($b = self).$then, $a._p = (TMP_14 = function(values){var self = TMP_14._s || this, $a, $b;
if (values == null) values = nil;
        return ($a = ($b = values).$reduce, $a._p = block.$to_proc(), $a).apply($b, [].concat(args))}, TMP_14._s = self, TMP_14), $a).call($b);
      };

      $opal.defn(self, '$map', def.$collect);

      $opal.defn(self, '$reduce', def.$inject);

      def.$wait = function(promise) {
        var $a, $b, TMP_15, self = this;

        if ((($a = (($b = $scope.Promise) == null ? $opal.cm('Promise') : $b)['$==='](promise)) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          promise = (($a = $scope.Promise) == null ? $opal.cm('Promise') : $a).$value(promise)
        };
        if ((($a = promise['$act?']()) !== nil && (!$a._isBoolean || $a == true))) {
          promise = promise.$then()};
        self.wait['$<<'](promise);
        ($a = ($b = promise).$always, $a._p = (TMP_15 = function(){var self = TMP_15._s || this, $a;
          if (self.next == null) self.next = nil;

        if ((($a = self.next) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$try()
            } else {
            return nil
          }}, TMP_15._s = self, TMP_15), $a).call($b);
        return self;
      };

      $opal.defn(self, '$and', def.$wait);

      def['$>>'] = TMP_17 = function() {var $zuper = $slice.call(arguments, 0);
        var $a, $b, TMP_16, self = this, $iter = TMP_17._p, $yield = $iter || nil;

        TMP_17._p = null;
        return ($a = ($b = $opal.find_super_dispatcher(self, '>>', TMP_17, $iter).apply(self, $zuper)).$tap, $a._p = (TMP_16 = function(){var self = TMP_16._s || this;

        return self.$try()}, TMP_16._s = self, TMP_16), $a).call($b);
      };

      return (def.$try = function() {
        var $a, $b, $c, $d, self = this, promise = nil;

        if ((($a = ($b = ($c = self.wait)['$all?'], $b._p = "realized?".$to_proc(), $b).call($c)) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = promise = ($b = ($d = self.wait).$find, $b._p = "rejected?".$to_proc(), $b).call($d)) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$reject(promise.$error())
            } else {
            return self.$resolve(($a = ($b = self.wait).$map, $a._p = "value".$to_proc(), $a).call($b))
          }
          } else {
          return nil
        };
      }, nil) && 'try';
    })(self, self);
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/promise.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $gvars = $opal.gvars;

  $opal.add_stubs(['$attr_accessor', '$raise', '$lambda', '$error', '$tap', '$call', '$reject', '$resolve', '$new', '$with_promise']);
  ;
  return (function($base) {
    var self = $module($base, 'Opal');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'DropboxJs');

      var def = self._proto, $scope = self._scope;

      (function($base, $super) {
        function $NilClient(){};
        var self = $NilClient = $klass($base, $super, 'NilClient', $NilClient);

        var def = self._proto, $scope = self._scope;

        self.$attr_accessor("root_in_dropbox", "app_name");

        return (def.$authenticate = function() {
          var self = this;

          return self.$raise("not logged in to dropbox");
        }, nil) && 'authenticate';
      })(self, null);

      (function($base, $super) {
        function $Client(){};
        var self = $Client = $klass($base, $super, 'Client', $Client);

        var def = self._proto, $scope = self._scope, TMP_2;

        self.$attr_accessor("root_in_dropbox", "app_name");

        def.$initialize = function(key) {
          var $a, $b, TMP_1, self = this;

          self.errorlogger = ($a = ($b = self).$lambda, $a._p = (TMP_1 = function(error){var self = TMP_1._s || this;
            if ($gvars.log == null) $gvars.log = nil;
if (error == null) error = nil;
          return $gvars.log.$error(error)}, TMP_1._s = self, TMP_1), $a).call($b);
          self.root = new Dropbox.Client({ key: key });;
          
           self.root.onError.addListener(function(error) {
                                   self.errorlogger(error)
           });
        
        };

        def.$with_promise = TMP_2 = function() {
          var $a, $b, TMP_3, $c, self = this, $iter = TMP_2._p, block = $iter || nil;

          TMP_2._p = null;
          return ($a = ($b = (($c = $scope.Promise) == null ? $opal.cm('Promise') : $c).$new()).$tap, $a._p = (TMP_3 = function(promise){var self = TMP_3._s || this, $a, $b, TMP_4;
if (promise == null) promise = nil;
          return block.$call(($a = ($b = self).$lambda, $a._p = (TMP_4 = function(error, data){var self = TMP_4._s || this;
if (error == null) error = nil;if (data == null) data = nil;
            if (error !== false && error !== nil) {
                return promise.$reject(error)
                } else {
                return promise.$resolve(data)
              }}, TMP_4._s = self, TMP_4), $a).call($b))}, TMP_3._s = self, TMP_3), $a).call($b);
        };

        def.$authenticate = function() {
          var $a, $b, TMP_5, self = this;

          return ($a = ($b = self).$with_promise, $a._p = (TMP_5 = function(iblock){var self = TMP_5._s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          return self.root.authenticate(iblock);}, TMP_5._s = self, TMP_5), $a).call($b);
        };

        def.$get_account_info = function() {
          var $a, $b, TMP_6, self = this;

          return ($a = ($b = self).$with_promise, $a._p = (TMP_6 = function(iblock){var self = TMP_6._s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          return self.root.getAccountInfo(iblock);}, TMP_6._s = self, TMP_6), $a).call($b);
        };

        def.$write_file = function(filename, data) {
          var $a, $b, TMP_7, self = this;

          return ($a = ($b = self).$with_promise, $a._p = (TMP_7 = function(iblock){var self = TMP_7._s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          return self.root.writeFile(filename, data, iblock);}, TMP_7._s = self, TMP_7), $a).call($b);
        };

        def.$read_file = function(filename) {
          var $a, $b, TMP_8, self = this;

          return ($a = ($b = self).$with_promise, $a._p = (TMP_8 = function(iblock){var self = TMP_8._s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          return self.root.readFile(filename, iblock);}, TMP_8._s = self, TMP_8), $a).call($b);
        };

        return (def.$read_dir = function(dirname) {
          var $a, $b, TMP_9, self = this;

          if (dirname == null) {
            dirname = "/"
          }
          return ($a = ($b = self).$with_promise, $a._p = (TMP_9 = function(iblock){var self = TMP_9._s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          self.root.readdir(dirname, iblock);
            return nil;}, TMP_9._s = self, TMP_9), $a).call($b);
        }, nil) && 'read_dir';
      })(self, null);
      
    })(self)
    
  })(self);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal-dropboxjs.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice;

  $opal.add_stubs(['$year', '$now']);
  $opal.cdecl($scope, 'VERSION', "0.7.6");
  return $opal.cdecl($scope, 'COPYRIGHT', "©" + ((($a = $scope.Time) == null ? $opal.cm('Time') : $a).$now().$year()) + " https://www.bernhard-weichel.de");
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/version.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice;

  $opal.add_stubs(['$puts']);
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  self.$puts("now starting zupfnoter");
  return self.$puts("zupfnoter is now running");
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/application.js.map
;
