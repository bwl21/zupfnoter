(function(undefined) {
  if (typeof(this.Opal) !== 'undefined') {
    console.warn('Opal already loaded. Loading twice can cause troubles, please fix your setup.');
    return this.Opal;
  }

  // The Opal object that is exposed globally
  var Opal = this.Opal = {};

  // All bridged classes - keep track to donate methods from Object
  var bridged_classes = Opal.bridged_classes = [];

  // TopScope is used for inheriting constants from the top scope
  var TopScope = function(){};

  // Opal just acts as the top scope
  TopScope.prototype = Opal;

  // To inherit scopes
  Opal.constructor = TopScope;

  // List top scope constants
  Opal.constants = [];

  // This is a useful reference to global object inside ruby files
  Opal.global = this;

  // Minify common function calls
  var $hasOwn = Opal.hasOwnProperty;
  var $slice  = Opal.slice = Array.prototype.slice;

  // Nil object id is always 4
  var nil_id = 4;

  // Generates even sequential numbers greater than 4
  // (nil_id) to serve as unique ids for ruby objects
  var unique_id = nil_id;

  // Return next unique id
  Opal.uid = function() {
    unique_id += 2;
    return unique_id;
  };

  // Table holds all class variables
  Opal.cvars = {};

  // Globals table
  Opal.gvars = {};

  // Exit function, this should be replaced by platform specific implementation
  // (See nodejs and phantom for examples)
  Opal.exit = function(status) { if (Opal.gvars.DEBUG) console.log('Exited with status '+status); };

  /**
    Get a constant on the given scope. Every class and module in Opal has a
    scope used to store, and inherit, constants. For example, the top level
    `Object` in ruby has a scope accessible as `Opal.Object.$$scope`.

    To get the `Array` class using this scope, you could use:

        Opal.Object.$$scope.get("Array")

    If a constant with the given name cannot be found, then a dispatch to the
    class/module's `#const_method` is called, which by default will raise an
    error.

    @param [String] name the name of the constant to lookup
    @returns [RubyObject]
  */
  Opal.get = function(name) {
    var constant = this[name];

    if (constant == null) {
      return this.base.$const_missing(name);
    }

    return constant;
  };

  /*
   * Create a new constants scope for the given class with the given
   * base. Constants are looked up through their parents, so the base
   * scope will be the outer scope of the new klass.
   */
  function create_scope(base, klass, id) {
    var const_alloc = function() {};
    var const_scope = const_alloc.prototype = new base.constructor();

    klass.$$scope       = const_scope;
    klass.$$base_module = base.base;

    const_scope.base        = klass;
    const_scope.constructor = const_alloc;
    const_scope.constants   = [];

    if (id) {
      klass.$$orig_scope = base;
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
    if (!base.$$is_class) {
      base = base.$$class;
    }

    // Not specifying a superclass means we can assume it to be Object
    if (superklass === null) {
      superklass = ObjectClass;
    }

    var klass = base.$$scope[id];

    // If a constant exists in the scope, then we must use that
    if ($hasOwn.call(base.$$scope, id) && klass.$$orig_scope === base.$$scope) {
      // Make sure the existing constant is a class, or raise error
      if (!klass.$$is_class) {
        throw Opal.TypeError.$new(id + " is not a class");
      }

      // Make sure existing class has same superclass
      if (superklass !== klass.$$super && superklass !== ObjectClass) {
        throw Opal.TypeError.$new("superclass mismatch for class " + id);
      }
    }
    else if (typeof(superklass) === 'function') {
      // passed native constructor as superklass, so bridge it as ruby class
      return bridge_class(id, superklass, base);
    }
    else {
      // if class doesnt exist, create a new one with given superclass
      klass = boot_class(superklass, constructor);

      // name class using base (e.g. Foo or Foo::Baz)
      klass.$$name = id;

      // every class gets its own constant scope, inherited from current scope
      create_scope(base.$$scope, klass, id);

      // Name new class directly onto current scope (Opal.Foo.Baz = klass)
      base[id] = base.$$scope[id] = klass;

      // Copy all parent constants to child, unless parent is Object
      if (superklass !== ObjectClass && superklass !== BasicObjectClass) {
        donate_constants(superklass, klass);
      }

      // call .inherited() hook with new class on the superclass
      if (superklass.$inherited) {
        superklass.$inherited(klass);
      }
    }

    return klass;
  };

  // Create generic class with given superclass.
  function boot_class(superklass, constructor) {
    var alloc = boot_class_alloc(null, constructor, superklass)

    return boot_class_object(superklass, alloc);
  }

  // Make `boot_class` available to the JS-API
  Opal.boot = boot_class;

  /*
   * The class object itself (as in `Class.new`)
   *
   * @param [(Opal) Class] superklass Another class object (as in `Class.new`)
   * @param [constructor]  alloc      The constructor that holds the prototype
   *                                  that will be used for instances of the
   *                                  newly constructed class.
   */
  function boot_class_object(superklass, alloc) {
    var singleton_class = function() {};
    singleton_class.prototype = superklass.constructor.prototype;

    function OpalClass() {}
    OpalClass.prototype = new singleton_class();

    var klass = new OpalClass();

    setup_module_or_class_object(klass, OpalClass, superklass, alloc.prototype);

    // @property $$alloc This is the constructor of instances of the current
    //                   class. Its prototype will be used for method lookup
    klass.$$alloc = alloc;

    // @property $$proto.$$class Make available to instances a reference to the
    //                           class they belong to.
    klass.$$proto.$$class = klass;

    return klass;
  }

  /*
   * Adds common/required properties to a module or class object
   * (as in `Module.new` / `Class.new`)
   *
   * @param module      The module or class that needs to be prepared
   *
   * @param constructor The constructor of the module or class itself,
   *                    usually it's already assigned by using `new`. Some
   *                    ipothesis on why it's needed can be found below.
   *
   * @param superklass  The superclass of the class/module object, for modules
   *                    is `Module` (of `ModuleClass` in JS context)
   *
   * @param prototype   The prototype on which the class/module methods will
   *                    be stored.
   */
  function setup_module_or_class_object(module, constructor, superklass, prototype) {
    // @property $$id Each class is assigned a unique `id` that helps
    //                comparation and implementation of `#object_id`
    module.$$id = Opal.uid();

    // @property $$proto This is the prototype on which methods will be defined
    module.$$proto = prototype;

    // @property constructor keeps a ref to the constructor, but apparently the
    //                       constructor is already set on:
    //
    //                          `var module = new constructor` is called.
    //
    //                       Maybe there are some browsers not abiding (IE6?)
    module.constructor = constructor;

    // @property $$is_class Clearly mark this as a class-like
    module.$$is_class = true;

    // @property $$super the superclass, doesn't get changed by module inclusions
    module.$$super = superklass;

    // @property $$parent direct parent class or module
    //                    starts with the superclass, after module inclusion is
    //                    the last included module
    module.$$parent = superklass;

    // @property $$methods keeps track of methods defined on the class
    //                     but seems to be used just by `define_basic_object_method`
    //                     and for donating (Ruby) Object methods to bridged classes
    //                     TODO: check if it can be removed
    module.$$methods = [];

    // @property $$inc included modules
    module.$$inc = [];
  }

  /**
    Define new module (or return existing module). The given `base` is basically
    the current `self` value the `module` statement was defined in. If this is
    a ruby module or class, then it is used, otherwise if the base is a ruby
    object then that objects real ruby class is used (e.g. if the base is the
    main object, then the top level `Object` class is used as the base).

    If a module of the given name is already defined in the base, then that
    instance is just returned.

    If there is a class of the given name in the base, then an error is
    generated instead (cannot have a class and module of same name in same base).

    Otherwise, a new module is created in the base with the given name, and that
    new instance is returned back (to be referenced at runtime).

    @param [RubyModule or Class] base class or module this definition is inside
    @param [String] id the name of the new (or existing) module
    @returns [RubyModule]
  */
  Opal.module = function(base, id) {
    var module;

    if (!base.$$is_class) {
      base = base.$$class;
    }

    if ($hasOwn.call(base.$$scope, id)) {
      module = base.$$scope[id];

      if (!module.$$is_mod && module !== ObjectClass) {
        throw Opal.TypeError.$new(id + " is not a module");
      }
    }
    else {
      module = boot_module_object();
      module.$$name = id;

      create_scope(base.$$scope, module, id);

      // Name new module directly onto current scope (Opal.Foo.Baz = module)
      base[id] = base.$$scope[id] = module;
    }

    return module;
  };

  /*
   * Internal function to create a new module instance. This simply sets up
   * the prototype hierarchy and method tables.
   */
  function boot_module_object() {
    var mtor = function() {};
    mtor.prototype = ModuleClass.constructor.prototype;

    function module_constructor() {}
    module_constructor.prototype = new mtor();

    var module = new module_constructor();
    var module_prototype = {};

    setup_module_or_class_object(module, module_constructor, ModuleClass, module_prototype);

    module.$$is_mod = true;
    module.$$dep    = [];

    return module;
  }

  /**
    Return the singleton class for the passed object.

    If the given object alredy has a singleton class, then it will be stored on
    the object as the `$$meta` property. If this exists, then it is simply
    returned back.

    Otherwise, a new singleton object for the class or object is created, set on
    the object at `$$meta` for future use, and then returned.

    @param [RubyObject] object the ruby object
    @returns [RubyClass] the singleton class for object
  */
  Opal.get_singleton_class = function(object) {
    if (object.$$meta) {
      return object.$$meta;
    }

    if (object.$$is_class) {
      return build_class_singleton_class(object);
    }

    return build_object_singleton_class(object);
  };

  /**
    Build the singleton class for an existing class.

    NOTE: Actually in MRI a class' singleton class inherits from its
    superclass' singleton class which in turn inherits from Class.

    @param [RubyClass] klass
    @returns [RubyClass]
   */
  function build_class_singleton_class(klass) {
    var meta = new Opal.Class.$$alloc;

    meta.$$class = Opal.Class;
    meta.$$proto = klass.constructor.prototype;

    meta.$$is_singleton = true;
    meta.$$inc          = [];
    meta.$$methods      = [];
    meta.$$scope        = klass.$$scope;

    return klass.$$meta = meta;
  }

  /**
    Build the singleton class for a Ruby (non class) Object.

    @param [RubyObject] object
    @returns [RubyClass]
   */
  function build_object_singleton_class(object) {
    var orig_class = object.$$class,
        class_id   = "#<Class:#<" + orig_class.$$name + ":" + orig_class.$$id + ">>";

    var Singleton = function () {};
    var meta = Opal.boot(orig_class, Singleton);
    meta.$$name   = class_id;

    meta.$$proto  = object;
    meta.$$class  = orig_class.$$class;
    meta.$$scope  = orig_class.$$scope;
    meta.$$parent = orig_class;
    return object.$$meta = meta;
  }

  /**
    The actual inclusion of a module into a class.

    ## Class `$$parent` and `iclass`

    To handle `super` calls, every class has a `$$parent`. This parent is
    used to resolve the next class for a super call. A normal class would
    have this point to its superclass. However, if a class includes a module
    then this would need to take into account the module. The module would
    also have to then point its `$$parent` to the actual superclass. We
    cannot modify modules like this, because it might be included in more
    then one class. To fix this, we actually insert an `iclass` as the class'
    `$$parent` which can then point to the superclass. The `iclass` acts as
    a proxy to the actual module, so the `super` chain can then search it for
    the required method.

    @param [RubyModule] module the module to include
    @param [RubyClass] klass the target class to include module into
    @returns [null]
  */
  Opal.append_features = function(module, klass) {
    var included = klass.$$inc;

    // check if this module is already included in the klass
    for (var j = 0, jj = included.length; j < jj; j++) {
      if (included[j] === module) {
        return;
      }
    }

    included.push(module);
    module.$$dep.push(klass);

    // iclass
    var iclass = {
      $$name:   module.$$name,
      $$proto:  module.$$proto,
      $$parent: klass.$$parent,
      $$module: module,
      $$iclass: true
    };

    klass.$$parent = iclass;

    var donator   = module.$$proto,
        prototype = klass.$$proto,
        methods   = module.$$methods;

    for (var i = 0, length = methods.length; i < length; i++) {
      var method = methods[i], current;


      if ( prototype.hasOwnProperty(method) &&
          !(current = prototype[method]).$$donated && !current.$$stub ) {
        // if the target class already has a method of the same name defined
        // and that method was NOT donated, then it must be a method defined
        // by the class so we do not want to override it
      }
      else {
        prototype[method] = donator[method];
        prototype[method].$$donated = true;
      }
    }

    if (klass.$$dep) {
      donate_methods(klass, methods.slice(), true);
    }

    donate_constants(module, klass);
  };

  // Boot a base class (makes instances).
  function boot_class_alloc(id, constructor, superklass) {
    if (superklass) {
      var ctor = function() {};
          ctor.prototype   = superklass.$$proto || superklass.prototype;

      if (id) {
        ctor.displayName = id;
      }

      constructor.prototype = new ctor();
    }

    constructor.prototype.constructor = constructor;

    return constructor;
  }

  /*
   * Builds the class object for core classes:
   * - make the class object have a singleton class
   * - make the singleton class inherit from its parent singleton class
   *
   * @param id         [String]      the name of the class
   * @param alloc      [Function]    the constructor for the core class instances
   * @param superclass [Class alloc] the constructor of the superclass
   */
  function boot_core_class_object(id, alloc, superclass) {
    var superclass_constructor = function() {};
        superclass_constructor.prototype = superclass.prototype;

    var singleton_class = function() {};
        singleton_class.prototype = new superclass_constructor();

    singleton_class.displayName = "#<Class:"+id+">";

    // the singleton_class acts as the class object constructor
    var klass = new singleton_class();

    setup_module_or_class_object(klass, singleton_class, superclass, alloc.prototype);

    klass.$$alloc = alloc;
    klass.$$name  = id;

    // Give all instances a ref to their class
    alloc.prototype.$$class = klass;

    Opal[id] = klass;
    Opal.constants.push(id);

    return klass;
  }

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
   * @param [Object] base where the bridge class is being created. If none is supplied, the top level scope (Opal) will be used
   * @return [Class] returns new ruby class
   */
  function bridge_class(name, constructor, base) {
    var klass = boot_class_object(ObjectClass, constructor);

    klass.$$name = name;

    if (base === undefined) {
      base = Opal;
    }
    else {
      base = base.$$scope;
    }

    create_scope(base, klass, name);
    bridged_classes.push(klass);

    var object_methods = BasicObjectClass.$$methods.concat(ObjectClass.$$methods);

    for (var i = 0, len = object_methods.length; i < len; i++) {
      var meth = object_methods[i];
      constructor.prototype[meth] = ObjectClass.$$proto[meth];
    }

    add_stubs_subscriber(constructor.prototype);

    return klass;
  }

  /*
   * constant assign
   */
  Opal.casgn = function(base_module, name, value) {
    var scope = base_module.$$scope;

    if (value.$$is_class && value.$$name === nil) {
      value.$$name = name;
    }

    if (value.$$is_class) {
      value.$$base_module = base_module;
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
   * When a source module is included into the target module, we must also copy
   * its constants to the target.
   */
  function donate_constants(source_mod, target_mod) {
    var source_constants = source_mod.$$scope.constants,
        target_scope     = target_mod.$$scope,
        target_constants = target_scope.constants;

    for (var i = 0, length = source_constants.length; i < length; i++) {
      target_constants.push(source_constants[i]);
      target_scope[source_constants[i]] = source_mod.$$scope[source_constants[i]];
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
   * All stub functions will have a private `$$stub` property set to true so
   * that other internal methods can detect if a method is just a stub or not.
   * `Kernel#respond_to?` uses this property to detect a methods presence.
   *
   * @param [Array] stubs an array of method stubs to add
   */
  Opal.add_stubs = function(stubs) {
    var subscribers = Opal.stub_subscribers;
    var subscriber;

    for (var i = 0, length = stubs.length; i < length; i++) {
      var method_name = stubs[i], stub = stub_for(method_name);

      for (var j = 0; j < subscribers.length; j++) {
        subscriber = subscribers[j];
        if (!(method_name in subscriber)) {
          subscriber[method_name] = stub;
        }
      }
    }
  };

  /*
   * Add a prototype to the subscribers list, and (TODO) add previously stubbed
   * methods.
   *
   * @param [Prototype]
   */
  function add_stubs_subscriber(prototype) {
    // TODO: Add previously stubbed methods too.
    Opal.stub_subscribers.push(prototype);
  }

  /*
   * Keep a list of prototypes that want method_missing stubs to be added.
   *
   * @default [Prototype List] BasicObject.prototype
   */
  Opal.stub_subscribers = [BasicObject.prototype];

  /*
   * Add a method_missing stub function to the given prototype for the
   * given name.
   *
   * @param [Prototype] prototype the target prototype
   * @param [String] stub stub name to add (e.g. "$foo")
   */
  function add_stub_for(prototype, stub) {
    var method_missing_stub = stub_for(stub);
    prototype[stub] = method_missing_stub;
  }

  /*
   * Generate the method_missing stub for a given method name.
   *
   * @param [String] method_name The js-name of the method to stub (e.g. "$foo")
   */
  function stub_for(method_name) {
    function method_missing_stub() {
      // Copy any given block onto the method_missing dispatcher
      this.$method_missing.$$p = method_missing_stub.$$p;

      // Set block property to null ready for the next call (stop false-positives)
      method_missing_stub.$$p = null;

      // call method missing with correct args (remove '$' prefix on method name)
      return this.$method_missing.apply(this, [method_name.slice(1)].concat($slice.call(arguments)));
    }

    method_missing_stub.$$stub = true;

    return method_missing_stub;
  }

  // Expose for other parts of Opal to use
  Opal.add_stub_for = add_stub_for;

  // Arity count error dispatcher
  Opal.ac = function(actual, expected, object, meth) {
    var inspect = (object.$$is_class ? object.$$name + '.' : object.$$class.$$name + '#') + meth;
    var msg = '[' + inspect + '] wrong number of arguments(' + actual + ' for ' + expected + ')';
    throw Opal.ArgumentError.$new(msg);
  };

  // Super dispatcher
  Opal.find_super_dispatcher = function(obj, jsid, current_func, iter, defs) {
    var dispatcher;

    if (defs) {
      dispatcher = obj.$$is_class ? defs.$$super : obj.$$class.$$proto;
    }
    else {
      if (obj.$$is_class) {
        dispatcher = obj.$$super;
      }
      else {
        dispatcher = find_obj_super_dispatcher(obj, jsid, current_func);
      }
    }

    dispatcher = dispatcher['$' + jsid];
    dispatcher.$$p = iter;

    return dispatcher;
  };

  // Iter dispatcher for super in a block
  Opal.find_iter_super_dispatcher = function(obj, jsid, current_func, iter, defs) {
    if (current_func.$$def) {
      return Opal.find_super_dispatcher(obj, current_func.$$jsid, current_func, iter, defs);
    }
    else {
      return Opal.find_super_dispatcher(obj, jsid, current_func, iter, defs);
    }
  };

  function find_obj_super_dispatcher(obj, jsid, current_func) {
    var klass = obj.$$meta || obj.$$class;
    jsid = '$' + jsid;

    while (klass) {
      if (klass.$$proto[jsid] === current_func) {
        // ok
        break;
      }

      klass = klass.$$parent;
    }

    // if we arent in a class, we couldnt find current?
    if (!klass) {
      throw new Error("could not find current class for super()");
    }

    klass = klass.$$parent;

    // else, let's find the next one
    while (klass) {
      var working = klass.$$proto[jsid];

      if (working && working !== current_func) {
        // ok
        break;
      }

      klass = klass.$$parent;
    }

    return klass.$$proto;
  };

  /*
   * Used to return as an expression. Sometimes, we can't simply return from
   * a javascript function as if we were a method, as the return is used as
   * an expression, or even inside a block which must "return" to the outer
   * method. This helper simply throws an error which is then caught by the
   * method. This approach is expensive, so it is only used when absolutely
   * needed.
   */
  Opal.ret = function(val) {
    Opal.returner.$v = val;
    throw Opal.returner;
  };

  // handles yield calls for 1 yielded arg
  Opal.yield1 = function(block, arg) {
    if (typeof(block) !== "function") {
      throw Opal.LocalJumpError.$new("no block given");
    }

    if (block.length > 1 && arg.$$is_array) {
      return block.apply(null, arg);
    }
    else {
      return block(arg);
    }
  };

  // handles yield for > 1 yielded arg
  Opal.yieldX = function(block, args) {
    if (typeof(block) !== "function") {
      throw Opal.LocalJumpError.$new("no block given");
    }

    if (block.length > 1 && args.length == 1) {
      if (args[0].$$is_array) {
        return block.apply(null, args[0]);
      }
    }

    if (!args.$$is_array) {
      args = $slice.call(args);
    }

    return block.apply(null, args);
  };

  // Finds the corresponding exception match in candidates.  Each candidate can
  // be a value, or an array of values.  Returns null if not found.
  Opal.rescue = function(exception, candidates) {
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];

      if (candidate.$$is_array) {
        var result = Opal.rescue(exception, candidate);

        if (result) {
          return result;
        }
      }
      else if (candidate['$==='](exception)) {
        return candidate;
      }
    }

    return null;
  };

  Opal.is_a = function(object, klass) {
    if (object.$$meta === klass) {
      return true;
    }

    var search = object.$$class;

    while (search) {
      if (search === klass) {
        return true;
      }

      for (var i = 0, length = search.$$inc.length; i < length; i++) {
        if (search.$$inc[i] == klass) {
          return true;
        }
      }

      search = search.$$super;
    }

    return false;
  };

  // Helper to convert the given object to an array
  Opal.to_ary = function(value) {
    if (value.$$is_array) {
      return value;
    }
    else if (value.$to_ary && !value.$to_ary.$$stub) {
      return value.$to_ary();
    }

    return [value];
  };

  /**
    Used to get a list of rest keyword arguments. Method takes the given
    keyword args, i.e. the hash literal passed to the method containing all
    keyword arguemnts passed to method, as well as the used args which are
    the names of required and optional arguments defined. This method then
    just returns all key/value pairs which have not been used, in a new
    hash literal.

    @param given_args [Hash] all kwargs given to method
    @param used_args [Object<String: true>] all keys used as named kwargs
    @return [Hash]
   */
  Opal.kwrestargs = function(given_args, used_args) {
    var keys      = [],
        map       = {},
        key       = null,
        given_map = given_args.smap;

    for (key in given_map) {
      if (!used_args[key]) {
        keys.push(key);
        map[key] = given_map[key];
      }
    }

    return Opal.hash2(keys, map);
  };

  /*
   * Call a ruby method on a ruby object with some arguments:
   *
   *   var my_array = [1, 2, 3, 4]
   *   Opal.send(my_array, 'length')     # => 4
   *   Opal.send(my_array, 'reverse!')   # => [4, 3, 2, 1]
   *
   * A missing method will be forwarded to the object via
   * method_missing.
   *
   * The result of either call with be returned.
   *
   * @param [Object] recv the ruby object
   * @param [String] mid ruby method to call
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
      func.$$p = block;
      return func.apply(recv, args);
    }

    return recv.$method_missing.apply(recv, [mid].concat(args));
  };

  /*
   * Donate methods for a class/module
   */
  function donate_methods(klass, defined, indirect) {
    var methods = klass.$$methods, included_in = klass.$$dep;

    // if (!indirect) {
      klass.$$methods = methods.concat(defined);
    // }

    if (included_in) {
      for (var i = 0, length = included_in.length; i < length; i++) {
        var includee = included_in[i];
        var dest     = includee.$$proto;

        for (var j = 0, jj = defined.length; j < jj; j++) {
          var method = defined[j];

          dest[method] = klass.$$proto[method];
          dest[method].$$donated = true;
        }

        if (includee.$$dep) {
          donate_methods(includee, defined, true);
        }
      }
    }
  };

  /**
    Define the given method on the module.

    This also handles donating methods to all classes that include this
    module. Method conflicts are also handled here, where a class might already
    have defined a method of the same name, or another included module defined
    the same method.

    @param [RubyModule] module the module method defined on
    @param [String] jsid javascript friendly method name (e.g. "$foo")
    @param [Function] body method body of actual function
  */
  function define_module_method(module, jsid, body) {
    module.$$proto[jsid] = body;
    body.$$owner = module;

    module.$$methods.push(jsid);

    if (module.$$module_function) {
      module[jsid] = body;
    }

    var included_in = module.$$dep;

    if (included_in) {
      for (var i = 0, length = included_in.length; i < length; i++) {
        var includee = included_in[i];
        var dest = includee.$$proto;
        var current = dest[jsid];


        if (dest.hasOwnProperty(jsid) && !current.$$donated && !current.$$stub) {
          // target class has already defined the same method name - do nothing
        }
        else if (dest.hasOwnProperty(jsid) && !current.$$stub) {
          // target class includes another module that has defined this method
          var klass_includees = includee.$$inc;

          for (var j = 0, jj = klass_includees.length; j < jj; j++) {
            if (klass_includees[j] === current.$$owner) {
              var current_owner_index = j;
            }
            if (klass_includees[j] === module) {
              var module_index = j;
            }
          }

          // only redefine method on class if the module was included AFTER
          // the module which defined the current method body. Also make sure
          // a module can overwrite a method it defined before
          if (current_owner_index <= module_index) {
            dest[jsid] = body;
            dest[jsid].$$donated = true;
          }
        }
        else {
          // neither a class, or module included by class, has defined method
          dest[jsid] = body;
          dest[jsid].$$donated = true;
        }

        if (includee.$$dep) {
          donate_methods(includee, [jsid], true);
        }
      }
    }
  }

  /**
    Used to define methods on an object. This is a helper method, used by the
    compiled source to define methods on special case objects when the compiler
    can not determine the destination object, or the object is a Module
    instance. This can get called by `Module#define_method` as well.

    ## Modules

    Any method defined on a module will come through this runtime helper.
    The method is added to the module body, and the owner of the method is
    set to be the module itself. This is used later when choosing which
    method should show on a class if more than 1 included modules define
    the same method. Finally, if the module is in `module_function` mode,
    then the method is also defined onto the module itself.

    ## Classes

    This helper will only be called for classes when a method is being
    defined indirectly; either through `Module#define_method`, or by a
    literal `def` method inside an `instance_eval` or `class_eval` body. In
    either case, the method is simply added to the class' prototype. A special
    exception exists for `BasicObject` and `Object`. These two classes are
    special because they are used in toll-free bridged classes. In each of
    these two cases, extra work is required to define the methods on toll-free
    bridged class' prototypes as well.

    ## Objects

    If a simple ruby object is the object, then the method is simply just
    defined on the object as a singleton method. This would be the case when
    a method is defined inside an `instance_eval` block.

    @param [RubyObject or Class] obj the actual obj to define method for
    @param [String] jsid the javascript friendly method name (e.g. '$foo')
    @param [Function] body the literal javascript function used as method
    @returns [null]
  */
  Opal.defn = function(obj, jsid, body) {
    if (obj.$$is_mod) {
      define_module_method(obj, jsid, body);
    }
    else if (obj.$$is_class) {
      obj.$$proto[jsid] = body;

      if (obj === BasicObjectClass) {
        define_basic_object_method(jsid, body);
      }
      else if (obj === ObjectClass) {
        donate_methods(obj, [jsid]);
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
    if (obj.$$is_class || obj.$$is_mod) {
      obj.constructor.prototype[jsid] = body;
    }
    else {
      obj[jsid] = body;
    }
  };

  function define_basic_object_method(jsid, body) {
    BasicObjectClass.$$methods.push(jsid);
    for (var i = 0, len = bridged_classes.length; i < len; i++) {
      bridged_classes[i].$$proto[jsid] = body;
    }
  }

  /*
   * Called to remove a method.
   */
  Opal.undef = function(obj, jsid) {
    delete obj.$$proto[jsid];
  };

  Opal.hash = function() {
    if (arguments.length == 1 && arguments[0].$$class == Opal.Hash) {
      return arguments[0];
    }

    var hash = new Opal.Hash.$$alloc(),
        keys = [],
        _map = {},
        smap = {},
        key, obj, length, khash, map;

    hash.map   = _map;
    hash.smap  = smap;
    hash.keys  = keys;

    if (arguments.length == 1) {
      if (arguments[0].$$is_array) {
        var args = arguments[0];

        for (var i = 0, ii = args.length; i < ii; i++) {
          var pair = args[i];

          if (pair.length !== 2) {
            throw Opal.ArgumentError.$new("value not of length 2: " + pair.$inspect());
          }

          key = pair[0];
          obj = pair[1];

          if (key.$$is_string) {
            khash = key;
            map = smap;
          } else {
            khash = key.$hash();
            map = _map;
          }

          if (map[khash] == null) {
            keys.push(key);
          }

          map[khash] = obj;
        }
      }
      else {
        obj = arguments[0];
        for (key in obj) {
          khash = key.$hash();
          smap[khash] = obj[khash];
          keys.push(key);
        }
      }
    }
    else {
      length = arguments.length;
      if (length % 2 !== 0) {
        throw Opal.ArgumentError.$new("odd number of arguments for Hash");
      }

      for (var j = 0; j < length; j++) {
        key = arguments[j];
        obj = arguments[++j];

        if (key.$$is_string) {
          khash = key;
          map = smap;
        } else {
          khash = key.$hash();
          map = _map;
        }

        if (map[khash] == null) {
          keys.push(key);
        }

        map[khash] = obj;
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
    var hash = new Opal.Hash.$$alloc();

    hash.keys = keys;
    hash.map  = {};
    hash.smap = map;

    return hash;
  };

  /*
   * Create a new range instance with first and last values, and whether the
   * range excludes the last value.
   */
  Opal.range = function(first, last, exc) {
    var range         = new Opal.Range.$$alloc();
        range.begin   = first;
        range.end     = last;
        range.exclude = exc;

    return range;
  };

  // Require system
  // --------------
  (function(Opal) {
    var loaded_features = ['corelib/runtime'],
        require_table   = {'corelib/runtime': true},
        modules         = {};

    var current_dir  = '.';

    function mark_as_loaded(filename) {
      if (require_table[filename]) {
        return false;
      }

      loaded_features.push(filename);
      require_table[filename] = true;

      return true;
    }

    function normalize_loadable_path(path) {
      var parts, part, new_parts = [], SEPARATOR = '/';

      if (current_dir !== '.') {
        path = current_dir.replace(/\/*$/, '/') + path;
      }

      path = path.replace(/\.(rb|opal|js)$/, '');
      parts = path.split(SEPARATOR);

      for (var i = 0, ii = parts.length; i < ii; i++) {
        part = parts[i];
        if (part == '') continue;
        (part === '..') ? new_parts.pop() : new_parts.push(part)
      }

      return new_parts.join(SEPARATOR);
    }

    function load(path) {
      mark_as_loaded(path);

      var module = modules[path];

      if (module) {
        module(Opal);
      }
      else {
        var severity = Opal.dynamic_require_severity || 'warning';
        var message  = 'cannot load such file -- ' + path;

        if (severity === "error") {
          Opal.LoadError ? Opal.LoadError.$new(message) : function(){throw message}();
        }
        else if (severity === "warning") {
          console.warn('WARNING: LoadError: ' + message);
        }
      }

      return true;
    }

    function require(path) {
      if (require_table[path]) {
        return false;
      }

      return load(path);
    }

    Opal.modules         = modules;
    Opal.loaded_features = loaded_features;

    Opal.normalize_loadable_path = normalize_loadable_path;
    Opal.mark_as_loaded          = mark_as_loaded;

    Opal.load    = load;
    Opal.require = require;
  })(Opal);

  // Initialization
  // --------------

  // The actual class for BasicObject
  var BasicObjectClass;

  // The actual Object class
  var ObjectClass;

  // The actual Module class
  var ModuleClass;

  // The actual Class class
  var ClassClass;

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

  // Constructors for *instances* of core objects
  boot_class_alloc('BasicObject', BasicObject);
  boot_class_alloc('Object',      Object,       BasicObject);
  boot_class_alloc('Module',      Module,       Object);
  boot_class_alloc('Class',       Class,        Module);

  // Constructors for *classes* of core objects
  BasicObjectClass = boot_core_class_object('BasicObject', BasicObject, Class);
  ObjectClass      = boot_core_class_object('Object',      Object,      BasicObjectClass.constructor);
  ModuleClass      = boot_core_class_object('Module',      Module,      ObjectClass.constructor);
  ClassClass       = boot_core_class_object('Class',       Class,       ModuleClass.constructor);

  // Fix booted classes to use their metaclass
  BasicObjectClass.$$class = ClassClass;
  ObjectClass.$$class      = ClassClass;
  ModuleClass.$$class      = ClassClass;
  ClassClass.$$class       = ClassClass;

  // Fix superclasses of booted classes
  BasicObjectClass.$$super = null;
  ObjectClass.$$super      = BasicObjectClass;
  ModuleClass.$$super      = ObjectClass;
  ClassClass.$$super       = ModuleClass;

  BasicObjectClass.$$parent = null;
  ObjectClass.$$parent      = BasicObjectClass;
  ModuleClass.$$parent      = ObjectClass;
  ClassClass.$$parent       = ModuleClass;

  // Internally, Object acts like a module as it is "included" into bridged
  // classes. In other words, we donate methods from Object into our bridged
  // classes as their prototypes don't inherit from our root Object, so they
  // act like module includes.
  ObjectClass.$$dep = bridged_classes;

  Opal.base                     = ObjectClass;
  BasicObjectClass.$$scope      = ObjectClass.$$scope = Opal;
  BasicObjectClass.$$orig_scope = ObjectClass.$$orig_scope = Opal;
  Opal.Kernel                   = ObjectClass;

  ModuleClass.$$scope      = ObjectClass.$$scope;
  ModuleClass.$$orig_scope = ObjectClass.$$orig_scope;
  ClassClass.$$scope       = ObjectClass.$$scope;
  ClassClass.$$orig_scope  = ObjectClass.$$orig_scope;

  ObjectClass.$$proto.toString = function() {
    return this.$to_s();
  };

  ObjectClass.$$proto.$require = Opal.require;

  Opal.top = new ObjectClass.$$alloc();

  // Nil
  Opal.klass(ObjectClass, ObjectClass, 'NilClass', NilClass);
  var nil = Opal.nil = new NilClass();
  nil.$$id = nil_id;
  nil.call = nil.apply = function() { throw Opal.LocalJumpError.$new('no block given'); };

  Opal.breaker  = new Error('unexpected break');
  Opal.returner = new Error('unexpected return');

  bridge_class('Array',     Array);
  bridge_class('Boolean',   Boolean);
  bridge_class('Numeric',   Number);
  bridge_class('String',    String);
  bridge_class('Proc',      Function);
  bridge_class('Exception', Error);
  bridge_class('Regexp',    RegExp);
  bridge_class('Time',      Date);

  TypeError.$$super = Error;
}).call(this);

if (typeof(global) !== 'undefined') {
  global.Opal = this.Opal;
  Opal.global = global;
}
if (typeof(window) !== 'undefined') {
  window.Opal = this.Opal;
  Opal.global = window;
}
Opal.mark_as_loaded(Opal.normalize_loadable_path("corelib/runtime"));
/* Generated by Opal 0.8.0 */
Opal.modules["corelib/helpers"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module;

  Opal.add_stubs(['$new', '$class', '$===', '$respond_to?', '$raise', '$type_error', '$__send__', '$coerce_to', '$nil?', '$<=>', '$inspect']);
  return (function($base) {
    var self = $module($base, 'Opal');

    var def = self.$$proto, $scope = self.$$scope;

    Opal.defs(self, '$type_error', function(object, type, method, coerced) {
      var $a, $b, self = this;

      if (method == null) {
        method = nil
      }
      if (coerced == null) {
        coerced = nil
      }
      if ((($a = (($b = method !== false && method !== nil) ? coerced : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return $scope.get('TypeError').$new("can't convert " + (object.$class()) + " into " + (type) + " (" + (object.$class()) + "#" + (method) + " gives " + (coerced.$class()))
        } else {
        return $scope.get('TypeError').$new("no implicit conversion of " + (object.$class()) + " into " + (type))
      };
    });

    Opal.defs(self, '$coerce_to', function(object, type, method) {
      var $a, self = this;

      if ((($a = type['$==='](object)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return object};
      if ((($a = object['$respond_to?'](method)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise(self.$type_error(object, type))
      };
      return object.$__send__(method);
    });

    Opal.defs(self, '$coerce_to!', function(object, type, method) {
      var $a, self = this, coerced = nil;

      coerced = self.$coerce_to(object, type, method);
      if ((($a = type['$==='](coerced)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise(self.$type_error(object, type, method, coerced))
      };
      return coerced;
    });

    Opal.defs(self, '$coerce_to?', function(object, type, method) {
      var $a, self = this, coerced = nil;

      if ((($a = object['$respond_to?'](method)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        return nil
      };
      coerced = self.$coerce_to(object, type, method);
      if ((($a = coerced['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        return nil};
      if ((($a = type['$==='](coerced)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise(self.$type_error(object, type, method, coerced))
      };
      return coerced;
    });

    Opal.defs(self, '$try_convert', function(object, type, method) {
      var $a, self = this;

      if ((($a = type['$==='](object)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return object};
      if ((($a = object['$respond_to?'](method)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return object.$__send__(method)
        } else {
        return nil
      };
    });

    Opal.defs(self, '$compare', function(a, b) {
      var $a, self = this, compare = nil;

      compare = a['$<=>'](b);
      if ((($a = compare === nil) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "comparison of " + (a.$class()) + " with " + (b.$class()) + " failed")};
      return compare;
    });

    Opal.defs(self, '$destructure', function(args) {
      var self = this;

      
      if (args.length == 1) {
        return args[0];
      }
      else if (args.$$is_array) {
        return args;
      }
      else {
        return $slice.call(args);
      }
    
    });

    Opal.defs(self, '$respond_to?', function(obj, method) {
      var self = this;

      
      if (obj == null || !obj.$$class) {
        return false;
      }
    
      return obj['$respond_to?'](method);
    });

    Opal.defs(self, '$inspect', function(obj) {
      var self = this;

      
      if (obj === undefined) {
        return "undefined";
      }
      else if (obj === null) {
        return "null";
      }
      else if (!obj.$$class) {
        return obj.toString();
      }
      else {
        return obj.$inspect();
      }
    
    });
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/module"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$attr_reader', '$attr_writer', '$coerce_to!', '$raise', '$=~', '$[]', '$!', '$==', '$inject', '$const_get', '$split', '$const_missing', '$to_str', '$===', '$to_proc', '$lambda', '$bind', '$call', '$class', '$append_features', '$included', '$name', '$new', '$to_s', '$__id__']);
  return (function($base, $super) {
    function $Module(){};
    var self = $Module = $klass($base, $super, 'Module', $Module);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_3, TMP_5, TMP_6;

    Opal.defs(self, '$new', TMP_1 = function() {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      TMP_1.$$p = null;
      
      function AnonModule(){}
      var klass      = Opal.boot(Opal.Module, AnonModule);
      klass.$$name   = nil;
      klass.$$class  = Opal.Module;
      klass.$$dep    = []
      klass.$$is_mod = true;
      klass.$$proto  = {};

      // inherit scope from parent
      Opal.create_scope(Opal.Module.$$scope, klass);

      if (block !== nil) {
        var block_self = block.$$s;
        block.$$s = null;
        block.call(klass);
        block.$$s = block_self;
      }

      return klass;
    
    });

    def['$==='] = function(object) {
      var $a, self = this;

      if ((($a = object == null) !== nil && (!$a.$$is_boolean || $a == true))) {
        return false};
      return Opal.is_a(object, self);
    };

    def['$<'] = function(other) {
      var self = this;

      
      var working = self;

      while (working) {
        if (working === other) {
          return true;
        }

        working = working.$$parent;
      }

      return false;
    
    };

    def.$alias_method = function(newname, oldname) {
      var self = this;

      
      var newjsid = '$' + newname,
          body    = self.$$proto['$' + oldname];

      if (self.$$is_singleton) {
        self.$$proto[newjsid] = body;
      }
      else {
        Opal.defn(self, newjsid, body);
      }

      return self;
    
      return self;
    };

    def.$alias_native = function(mid, jsid) {
      var self = this;

      if (jsid == null) {
        jsid = mid
      }
      return self.$$proto['$' + mid] = self.$$proto[jsid];
    };

    def.$ancestors = function() {
      var self = this;

      
      var parent = self,
          result = [];

      while (parent) {
        result.push(parent);
        result = result.concat(parent.$$inc);

        parent = parent.$$super;
      }

      return result;
    
    };

    def.$append_features = function(klass) {
      var self = this;

      Opal.append_features(self, klass);
      return self;
    };

    def.$attr_accessor = function(names) {
      var $a, $b, self = this;

      names = $slice.call(arguments, 0);
      ($a = self).$attr_reader.apply($a, [].concat(names));
      return ($b = self).$attr_writer.apply($b, [].concat(names));
    };

    Opal.defn(self, '$attr', def.$attr_accessor);

    def.$attr_reader = function(names) {
      var self = this;

      names = $slice.call(arguments, 0);
      
      var proto = self.$$proto;

      for (var i = names.length - 1; i >= 0; i--) {
        var name = names[i],
            id   = '$' + name;

        // the closure here is needed because name will change at the next
        // cycle, I wish we could use let.
        var body = (function(name) {
          return function() {
            return this[name];
          };
        })(name);

        // initialize the instance variable as nil
        proto[name] = nil;

        if (self.$$is_singleton) {
          proto.constructor.prototype[id] = body;
        }
        else {
          Opal.defn(self, id, body);
        }
      }
    
      return nil;
    };

    def.$attr_writer = function(names) {
      var self = this;

      names = $slice.call(arguments, 0);
      
      var proto = self.$$proto;

      for (var i = names.length - 1; i >= 0; i--) {
        var name = names[i],
            id   = '$' + name + '=';

        // the closure here is needed because name will change at the next
        // cycle, I wish we could use let.
        var body = (function(name){
          return function(value) {
            return this[name] = value;
          }
        })(name);

        // initialize the instance variable as nil
        proto[name] = nil;

        if (self.$$is_singleton) {
          proto.constructor.prototype[id] = body;
        }
        else {
          Opal.defn(self, id, body);
        }
      }
    
      return nil;
    };

    def.$autoload = function(const$, path) {
      var self = this;

      
      var autoloaders;

      if (!(autoloaders = self.$$autoload)) {
        autoloaders = self.$$autoload = {};
      }

      autoloaders[const$] = path;
      return nil;
    ;
    };

    def.$class_variable_get = function(name) {
      var $a, self = this;

      name = $scope.get('Opal')['$coerce_to!'](name, $scope.get('String'), "to_str");
      if ((($a = name.length < 3 || name.slice(0,2) !== '@@') !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('NameError'), "class vars should start with @@")};
      
      var value = Opal.cvars[name.slice(2)];
      (function() {if ((($a = value == null) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.$raise($scope.get('NameError'), "uninitialized class variable @@a in")
        } else {
        return nil
      }; return nil; })()
      return value;
    
    };

    def.$class_variable_set = function(name, value) {
      var $a, self = this;

      name = $scope.get('Opal')['$coerce_to!'](name, $scope.get('String'), "to_str");
      if ((($a = name.length < 3 || name.slice(0,2) !== '@@') !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('NameError'))};
      
      Opal.cvars[name.slice(2)] = value;
      return value;
    
    };

    def.$constants = function() {
      var self = this;

      return self.$$scope.constants;
    };

    def['$const_defined?'] = function(name, inherit) {
      var $a, self = this;

      if (inherit == null) {
        inherit = true
      }
      if ((($a = name['$=~'](/^[A-Z]\w*$/)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('NameError'), "wrong constant name " + (name))
      };
      
      var scopes = [self.$$scope];

      if (inherit || self === Opal.Object) {
        var parent = self.$$super;

        while (parent !== Opal.BasicObject) {
          scopes.push(parent.$$scope);

          parent = parent.$$super;
        }
      }

      for (var i = 0, length = scopes.length; i < length; i++) {
        if (scopes[i].hasOwnProperty(name)) {
          return true;
        }
      }

      return false;
    
    };

    def.$const_get = function(name, inherit) {
      var $a, $b, TMP_2, self = this;

      if (inherit == null) {
        inherit = true
      }
      if ((($a = ($b = name['$[]']("::"), $b !== false && $b !== nil ?name['$==']("::")['$!']() : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return ($a = ($b = name.$split("::")).$inject, $a.$$p = (TMP_2 = function(o, c){var self = TMP_2.$$s || this;
if (o == null) o = nil;if (c == null) c = nil;
        return o.$const_get(c)}, TMP_2.$$s = self, TMP_2), $a).call($b, self)};
      if ((($a = name['$=~'](/^[A-Z]\w*$/)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('NameError'), "wrong constant name " + (name))
      };
      
      var scopes = [self.$$scope];

      if (inherit || self == Opal.Object) {
        var parent = self.$$super;

        while (parent !== Opal.BasicObject) {
          scopes.push(parent.$$scope);

          parent = parent.$$super;
        }
      }

      for (var i = 0, length = scopes.length; i < length; i++) {
        if (scopes[i].hasOwnProperty(name)) {
          return scopes[i][name];
        }
      }

      return self.$const_missing(name);
    
    };

    def.$const_missing = function(name) {
      var self = this;

      
      if (self.$$autoload) {
        var file = self.$$autoload[name];

        if (file) {
          self.$require(file);

          return self.$const_get(name);
        }
      }
    
      return self.$raise($scope.get('NameError'), "uninitialized constant " + (self) + "::" + (name));
    };

    def.$const_set = function(name, value) {
      var $a, self = this;

      if ((($a = name['$=~'](/^[A-Z]\w*$/)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('NameError'), "wrong constant name " + (name))
      };
      try {
      name = name.$to_str()
      } catch ($err) {if (true) {
        self.$raise($scope.get('TypeError'), "conversion with #to_str failed")
        }else { throw $err; }
      };
      Opal.casgn(self, name, value);
      return value;
    };

    def.$define_method = TMP_3 = function(name, method) {
      var $a, $b, $c, TMP_4, self = this, $iter = TMP_3.$$p, block = $iter || nil, $case = nil;

      TMP_3.$$p = null;
      if ((($a = method === undefined && !(block !== nil)) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "tried to create a Proc object without a block")};
      ((($a = block) !== false && $a !== nil) ? $a : block = (function() {$case = method;if ($scope.get('Proc')['$===']($case)) {return method}else if ($scope.get('Method')['$===']($case)) {return method.$to_proc()}else if ($scope.get('UnboundMethod')['$===']($case)) {return ($b = ($c = self).$lambda, $b.$$p = (TMP_4 = function(args){var self = TMP_4.$$s || this, $a, bound = nil;
args = $slice.call(arguments, 0);
      bound = method.$bind(self);
        return ($a = bound).$call.apply($a, [].concat(args));}, TMP_4.$$s = self, TMP_4), $b).call($c)}else {return self.$raise($scope.get('TypeError'), "wrong argument type " + (block.$class()) + " (expected Proc/Method)")}})());
      
      var id = '$' + name;

      block.$$jsid = name;
      block.$$s    = null;
      block.$$def  = block;

      if (self.$$is_singleton) {
        self.$$proto[id] = block;
      }
      else {
        Opal.defn(self, id, block);
      }

      return name;
    
    };

    def.$remove_method = function(name) {
      var self = this;

      Opal.undef(self, '$' + name);
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

      
      for (var cls = self; cls; cls = cls.$$super) {
        for (var i = 0; i != cls.$$inc.length; i++) {
          var mod2 = cls.$$inc[i];
          if (mod === mod2) {
            return true;
          }
        }
      }
      return false;
    
    };

    def.$instance_method = function(name) {
      var self = this;

      
      var meth = self.$$proto['$' + name];

      if (!meth || meth.$$stub) {
        self.$raise($scope.get('NameError'), "undefined method `" + (name) + "' for class `" + (self.$name()) + "'");
      }

      return $scope.get('UnboundMethod').$new(self, meth, name);
    
    };

    def.$instance_methods = function(include_super) {
      var self = this;

      if (include_super == null) {
        include_super = true
      }
      
      var methods = [],
          proto   = self.$$proto;

      for (var prop in proto) {
        if (!(prop.charAt(0) === '$')) {
          continue;
        }

        if (!(typeof(proto[prop]) === "function")) {
          continue;
        }

        if (proto[prop].$$stub) {
          continue;
        }

        if (!self.$$is_mod) {
          if (self !== Opal.BasicObject && proto[prop] === Opal.BasicObject.$$proto[prop]) {
            continue;
          }

          if (!include_super && !proto.hasOwnProperty(prop)) {
            continue;
          }

          if (!include_super && proto[prop].$$donated) {
            continue;
          }
        }

        methods.push(prop.substr(1));
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

    def.$module_eval = TMP_5 = function() {
      var self = this, $iter = TMP_5.$$p, block = $iter || nil;

      TMP_5.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        self.$raise($scope.get('ArgumentError'), "no block given")
      };
      
      var old = block.$$s,
          result;

      block.$$s = null;
      result = block.call(self);
      block.$$s = old;

      return result;
    
    };

    Opal.defn(self, '$class_eval', def.$module_eval);

    def.$module_exec = TMP_6 = function() {
      var self = this, $iter = TMP_6.$$p, block = $iter || nil;

      TMP_6.$$p = null;
      
      if (block === nil) {
        throw new Error("no block given");
      }

      var block_self = block.$$s, result;

      block.$$s = null;
      result = block.apply(self, $slice.call(arguments));
      block.$$s = block_self;

      return result;
    
    };

    Opal.defn(self, '$class_exec', def.$module_exec);

    def['$method_defined?'] = function(method) {
      var self = this;

      
      var body = self.$$proto['$' + method];
      return (!!body) && !body.$$stub;
    
    };

    def.$module_function = function(methods) {
      var self = this;

      methods = $slice.call(arguments, 0);
      
      if (methods.length === 0) {
        self.$$module_function = true;
      }
      else {
        for (var i = 0, length = methods.length; i < length; i++) {
          var meth = methods[i], func = self.$$proto['$' + meth];

          self.constructor.prototype['$' + meth] = func;
        }
      }

      return self;
    
    };

    def.$name = function() {
      var self = this;

      
      if (self.$$full_name) {
        return self.$$full_name;
      }

      var result = [], base = self;

      while (base) {
        if (base.$$name === nil) {
          return result.length === 0 ? nil : result.join('::');
        }

        result.unshift(base.$$name);

        base = base.$$base_module;

        if (base === Opal.Object) {
          break;
        }
      }

      if (result.length === 0) {
        return nil;
      }

      return self.$$full_name = result.join('::');
    
    };

    def.$public = function(methods) {
      var self = this;

      methods = $slice.call(arguments, 0);
      
      if (methods.length === 0) {
        self.$$module_function = false;
      }

      return nil;
    
    };

    Opal.defn(self, '$private', def.$public);

    Opal.defn(self, '$protected', def.$public);

    Opal.defn(self, '$nesting', def.$public);

    def.$private_class_method = function(name) {
      var self = this;

      return self['$' + name] || nil;
    };

    Opal.defn(self, '$public_class_method', def.$private_class_method);

    def['$private_method_defined?'] = function(obj) {
      var self = this;

      return false;
    };

    def.$private_constant = function() {
      var self = this;

      return nil;
    };

    Opal.defn(self, '$protected_method_defined?', def['$private_method_defined?']);

    Opal.defn(self, '$public_instance_methods', def.$instance_methods);

    Opal.defn(self, '$public_method_defined?', def['$method_defined?']);

    def.$remove_class_variable = function() {
      var self = this;

      return nil;
    };

    def.$remove_const = function(name) {
      var self = this;

      
      var old = self.$$scope[name];
      delete self.$$scope[name];
      return old;
    
    };

    def.$to_s = function() {
      var $a, self = this;

      return ((($a = self.$$name) !== false && $a !== nil) ? $a : "#<" + (self.$$is_mod ? 'Module' : 'Class') + ":0x" + (self.$__id__().$to_s(16)) + ">");
    };

    return (def.$undef_method = function(symbol) {
      var self = this;

      Opal.add_stub_for(self.$$proto, "$" + symbol);
      return self;
    }, nil) && 'undef_method';
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/class"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$require', '$raise', '$allocate']);
  self.$require("corelib/module");
  return (function($base, $super) {
    function $Class(){};
    var self = $Class = $klass($base, $super, 'Class', $Class);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2;

    Opal.defs(self, '$new', TMP_1 = function(sup) {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      if (sup == null) {
        sup = $scope.get('Object')
      }
      TMP_1.$$p = null;
      
      if (!sup.$$is_class || sup.$$is_mod) {
        self.$raise($scope.get('TypeError'), "superclass must be a Class");
      }

      function AnonClass(){};
      var klass      = Opal.boot(sup, AnonClass)
      klass.$$name   = nil;
      klass.$$parent = sup;

      // inherit scope from parent
      Opal.create_scope(sup.$$scope, klass);

      sup.$inherited(klass);

      if (block !== nil) {
        var block_self = block.$$s;
        block.$$s = null;
        block.call(klass);
        block.$$s = block_self;
      }

      return klass;
    ;
    });

    def.$allocate = function() {
      var self = this;

      
      var obj = new self.$$alloc;
      obj.$$id = Opal.uid();
      return obj;
    
    };

    def.$inherited = function(cls) {
      var self = this;

      return nil;
    };

    def.$new = TMP_2 = function(args) {
      var self = this, $iter = TMP_2.$$p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_2.$$p = null;
      
      var obj = self.$allocate();

      obj.$initialize.$$p = block;
      obj.$initialize.apply(obj, args);
      return obj;
    ;
    };

    return (def.$superclass = function() {
      var self = this;

      return self.$$super || nil;
    }, nil) && 'superclass';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/basic_object"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$raise', '$inspect']);
  return (function($base, $super) {
    function $BasicObject(){};
    var self = $BasicObject = $klass($base, $super, 'BasicObject', $BasicObject);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4;

    Opal.defn(self, '$initialize', function() {
      var self = this;

      return nil;
    });

    Opal.defn(self, '$==', function(other) {
      var self = this;

      return self === other;
    });

    Opal.defn(self, '$__id__', function() {
      var self = this;

      return self.$$id || (self.$$id = Opal.uid());
    });

    Opal.defn(self, '$__send__', TMP_1 = function(symbol, args) {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_1.$$p = null;
      
      var func = self['$' + symbol]

      if (func) {
        if (block !== nil) {
          func.$$p = block;
        }

        return func.apply(self, args);
      }

      if (block !== nil) {
        self.$method_missing.$$p = block;
      }

      return self.$method_missing.apply(self, [symbol].concat(args));
    
    });

    Opal.defn(self, '$!', function() {
      var self = this;

      return false;
    });

    Opal.defn(self, '$eql?', def['$==']);

    Opal.defn(self, '$equal?', def['$==']);

    Opal.defn(self, '$instance_eval', TMP_2 = function() {
      var self = this, $iter = TMP_2.$$p, block = $iter || nil;

      TMP_2.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        $scope.get('Kernel').$raise($scope.get('ArgumentError'), "no block given")
      };
      
      var old = block.$$s,
          result;

      block.$$s = null;
      result = block.call(self, self);
      block.$$s = old;

      return result;
    
    });

    Opal.defn(self, '$instance_exec', TMP_3 = function(args) {
      var self = this, $iter = TMP_3.$$p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_3.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        $scope.get('Kernel').$raise($scope.get('ArgumentError'), "no block given")
      };
      
      var block_self = block.$$s,
          result;

      block.$$s = null;
      result = block.apply(self, args);
      block.$$s = block_self;

      return result;
    
    });

    return (Opal.defn(self, '$method_missing', TMP_4 = function(symbol, args) {
      var $a, self = this, $iter = TMP_4.$$p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_4.$$p = null;
      return $scope.get('Kernel').$raise($scope.get('NoMethodError'), (function() {if ((($a = self.$inspect && !self.$inspect.$$stub) !== nil && (!$a.$$is_boolean || $a == true))) {
        return "undefined method `" + (symbol) + "' for " + (self.$inspect()) + ":" + (self.$$class)
        } else {
        return "undefined method `" + (symbol) + "' for " + (self.$$class)
      }; return nil; })());
    }), nil) && 'method_missing';
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/kernel"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_le(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs <= rhs : lhs['$<='](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $gvars = Opal.gvars, $hash2 = Opal.hash2;

  Opal.add_stubs(['$raise', '$inspect', '$==', '$object_id', '$class', '$new', '$coerce_to?', '$<<', '$allocate', '$copy_instance_variables', '$initialize_clone', '$initialize_copy', '$singleton_class', '$initialize_dup', '$for', '$to_proc', '$each', '$reverse', '$append_features', '$extended', '$length', '$respond_to?', '$[]', '$nil?', '$to_a', '$to_int', '$fetch', '$Integer', '$Float', '$to_ary', '$to_str', '$coerce_to', '$to_s', '$__id__', '$coerce_to!', '$===', '$print', '$format', '$puts', '$empty?', '$rand', '$respond_to_missing?', '$try_convert!', '$expand_path', '$join', '$start_with?']);
  return (function($base) {
    var self = $module($base, 'Kernel');

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_9;

    Opal.defn(self, '$method_missing', TMP_1 = function(symbol, args) {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_1.$$p = null;
      return self.$raise($scope.get('NoMethodError'), "undefined method `" + (symbol) + "' for " + (self.$inspect()));
    });

    Opal.defn(self, '$=~', function(obj) {
      var self = this;

      return false;
    });

    Opal.defn(self, '$===', function(other) {
      var $a, self = this;

      return ((($a = self.$object_id()['$=='](other.$object_id())) !== false && $a !== nil) ? $a : self['$=='](other));
    });

    Opal.defn(self, '$<=>', function(other) {
      var self = this;

      
      var x = self['$=='](other);

      if (x && x !== nil) {
        return 0;
      }

      return nil;
    ;
    });

    Opal.defn(self, '$method', function(name) {
      var self = this;

      
      var meth = self['$' + name];

      if (!meth || meth.$$stub) {
        self.$raise($scope.get('NameError'), "undefined method `" + (name) + "' for class `" + (self.$class()) + "'");
      }

      return $scope.get('Method').$new(self, meth, name);
    
    });

    Opal.defn(self, '$methods', function(all) {
      var self = this;

      if (all == null) {
        all = true
      }
      
      var methods = [];

      for (var key in self) {
        if (key[0] == "$" && typeof(self[key]) === "function") {
          if (all == false || all === nil) {
            if (!Opal.hasOwnProperty.call(self, key)) {
              continue;
            }
          }
          if (self[key].$$stub === undefined) {
            methods.push(key.substr(1));
          }
        }
      }

      return methods;
    
    });

    Opal.defn(self, '$Array', function(object) {
      var self = this;

      
      var coerced;

      if (object === nil) {
        return [];
      }

      if (object.$$is_array) {
        return object;
      }

      coerced = $scope.get('Opal')['$coerce_to?'](object, $scope.get('Array'), "to_ary");
      if (coerced !== nil) { return coerced; }

      coerced = $scope.get('Opal')['$coerce_to?'](object, $scope.get('Array'), "to_a");
      if (coerced !== nil) { return coerced; }

      return [object];
    
    });

    Opal.defn(self, '$at_exit', TMP_2 = function() {
      var $a, self = this, $iter = TMP_2.$$p, block = $iter || nil;
      if ($gvars.__at_exit__ == null) $gvars.__at_exit__ = nil;

      TMP_2.$$p = null;
      ((($a = $gvars.__at_exit__) !== false && $a !== nil) ? $a : $gvars.__at_exit__ = []);
      return $gvars.__at_exit__['$<<'](block);
    });

    Opal.defn(self, '$caller', function() {
      var self = this;

      return [];
    });

    Opal.defn(self, '$class', function() {
      var self = this;

      return self.$$class;
    });

    Opal.defn(self, '$copy_instance_variables', function(other) {
      var self = this;

      
      for (var name in other) {
        if (name.charAt(0) !== '$') {
          self[name] = other[name];
        }
      }
    
    });

    Opal.defn(self, '$clone', function() {
      var self = this, copy = nil;

      copy = self.$class().$allocate();
      copy.$copy_instance_variables(self);
      copy.$initialize_clone(self);
      return copy;
    });

    Opal.defn(self, '$initialize_clone', function(other) {
      var self = this;

      return self.$initialize_copy(other);
    });

    Opal.defn(self, '$define_singleton_method', TMP_3 = function(name, body) {
      var $a, self = this, $iter = TMP_3.$$p, block = $iter || nil;

      if (body == null) {
        body = nil
      }
      TMP_3.$$p = null;
      ((($a = body) !== false && $a !== nil) ? $a : body = block);
      if (body !== false && body !== nil) {
        } else {
        self.$raise($scope.get('ArgumentError'), "tried to create Proc object without a block")
      };
      
      var jsid   = '$' + name;
      body.$$jsid = name;
      body.$$s    = null;
      body.$$def  = body;

      self.$singleton_class().$$proto[jsid] = body;

      return self;
    
    });

    Opal.defn(self, '$dup', function() {
      var self = this, copy = nil;

      copy = self.$class().$allocate();
      copy.$copy_instance_variables(self);
      copy.$initialize_dup(self);
      return copy;
    });

    Opal.defn(self, '$initialize_dup', function(other) {
      var self = this;

      return self.$initialize_copy(other);
    });

    Opal.defn(self, '$enum_for', TMP_4 = function(method, args) {
      var $a, $b, self = this, $iter = TMP_4.$$p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      if (method == null) {
        method = "each"
      }
      TMP_4.$$p = null;
      return ($a = ($b = $scope.get('Enumerator')).$for, $a.$$p = block.$to_proc(), $a).apply($b, [self, method].concat(args));
    });

    Opal.defn(self, '$to_enum', def.$enum_for);

    Opal.defn(self, '$equal?', function(other) {
      var self = this;

      return self === other;
    });

    Opal.defn(self, '$exit', function(status) {
      var $a, $b, self = this;
      if ($gvars.__at_exit__ == null) $gvars.__at_exit__ = nil;

      if (status == null) {
        status = true
      }
      if ((($a = $gvars.__at_exit__) !== nil && (!$a.$$is_boolean || $a == true))) {
        ($a = ($b = $gvars.__at_exit__.$reverse()).$each, $a.$$p = "call".$to_proc(), $a).call($b)};
      if ((($a = status === true) !== nil && (!$a.$$is_boolean || $a == true))) {
        status = 0};
      Opal.exit(status);
      return nil;
    });

    Opal.defn(self, '$extend', function(mods) {
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
    });

    Opal.defn(self, '$format', function(format_string, args) {
      var $a, $b, self = this, ary = nil;
      if ($gvars.DEBUG == null) $gvars.DEBUG = nil;

      args = $slice.call(arguments, 1);
      if ((($a = (($b = args.$length()['$=='](1)) ? args['$[]'](0)['$respond_to?']("to_ary") : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        ary = $scope.get('Opal')['$coerce_to?'](args['$[]'](0), $scope.get('Array'), "to_ary");
        if ((($a = ary['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          args = ary.$to_a()
        };};
      
      var result = '',
          //used for slicing:
          begin_slice = 0,
          end_slice,
          //used for iterating over the format string:
          i,
          len = format_string.length,
          //used for processing field values:
          arg,
          str,
          //used for processing %g and %G fields:
          exponent,
          //used for keeping track of width and precision:
          width,
          precision,
          //used for holding temporary values:
          tmp_num,
          //used for processing %{} and %<> fileds:
          hash_parameter_key,
          closing_brace_char,
          //used for processing %b, %B, %o, %x, and %X fields:
          base_number,
          base_prefix,
          base_neg_zero_regex,
          base_neg_zero_digit,
          //used for processing arguments:
          next_arg,
          seq_arg_num = 1,
          pos_arg_num = 0,
          //used for keeping track of flags:
          flags,
          FNONE  = 0,
          FSHARP = 1,
          FMINUS = 2,
          FPLUS  = 4,
          FZERO  = 8,
          FSPACE = 16,
          FWIDTH = 32,
          FPREC  = 64,
          FPREC0 = 128;

      function CHECK_FOR_FLAGS() {
        if (flags&FWIDTH) { self.$raise($scope.get('ArgumentError'), "flag after width") }
        if (flags&FPREC0) { self.$raise($scope.get('ArgumentError'), "flag after precision") }
      }

      function CHECK_FOR_WIDTH() {
        if (flags&FWIDTH) { self.$raise($scope.get('ArgumentError'), "width given twice") }
        if (flags&FPREC0) { self.$raise($scope.get('ArgumentError'), "width after precision") }
      }

      function GET_NTH_ARG(num) {
        if (num >= args.length) { self.$raise($scope.get('ArgumentError'), "too few arguments") }
        return args[num];
      }

      function GET_NEXT_ARG() {
        switch (pos_arg_num) {
        case -1: self.$raise($scope.get('ArgumentError'), "unnumbered(" + (seq_arg_num) + ") mixed with numbered")
        case -2: self.$raise($scope.get('ArgumentError'), "unnumbered(" + (seq_arg_num) + ") mixed with named")
        }
        pos_arg_num = seq_arg_num++;
        return GET_NTH_ARG(pos_arg_num - 1);
      }

      function GET_POS_ARG(num) {
        if (pos_arg_num > 0) {
          self.$raise($scope.get('ArgumentError'), "numbered(" + (num) + ") after unnumbered(" + (pos_arg_num) + ")")
        }
        if (pos_arg_num === -2) {
          self.$raise($scope.get('ArgumentError'), "numbered(" + (num) + ") after named")
        }
        if (num < 1) {
          self.$raise($scope.get('ArgumentError'), "invalid index - " + (num) + "$")
        }
        pos_arg_num = -1;
        return GET_NTH_ARG(num - 1);
      }

      function GET_ARG() {
        return (next_arg === undefined ? GET_NEXT_ARG() : next_arg);
      }

      function READ_NUM(label) {
        var num, str = '';
        for (;; i++) {
          if (i === len) {
            self.$raise($scope.get('ArgumentError'), "malformed format string - %*[0-9]")
          }
          if (format_string.charCodeAt(i) < 48 || format_string.charCodeAt(i) > 57) {
            i--;
            num = parseInt(str) || 0;
            if (num > 2147483647) {
              self.$raise($scope.get('ArgumentError'), "" + (label) + " too big")
            }
            return num;
          }
          str += format_string.charAt(i);
        }
      }

      function READ_NUM_AFTER_ASTER(label) {
        var arg, num = READ_NUM(label);
        if (format_string.charAt(i + 1) === '$') {
          i++;
          arg = GET_POS_ARG(num);
        } else {
          arg = GET_NEXT_ARG();
        }
        return (arg).$to_int();
      }

      for (i = format_string.indexOf('%'); i !== -1; i = format_string.indexOf('%', i)) {
        str = undefined;

        flags = FNONE;
        width = -1;
        precision = -1;
        next_arg = undefined;

        end_slice = i;

        i++;

        switch (format_string.charAt(i)) {
        case '%':
          begin_slice = i;
        case '':
        case '\n':
        case '\0':
          i++;
          continue;
        }

        format_sequence: for (; i < len; i++) {
          switch (format_string.charAt(i)) {

          case ' ':
            CHECK_FOR_FLAGS();
            flags |= FSPACE;
            continue format_sequence;

          case '#':
            CHECK_FOR_FLAGS();
            flags |= FSHARP;
            continue format_sequence;

          case '+':
            CHECK_FOR_FLAGS();
            flags |= FPLUS;
            continue format_sequence;

          case '-':
            CHECK_FOR_FLAGS();
            flags |= FMINUS;
            continue format_sequence;

          case '0':
            CHECK_FOR_FLAGS();
            flags |= FZERO;
            continue format_sequence;

          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            tmp_num = READ_NUM('width');
            if (format_string.charAt(i + 1) === '$') {
              if (i + 2 === len) {
                str = '%';
                i++;
                break format_sequence;
              }
              if (next_arg !== undefined) {
                self.$raise($scope.get('ArgumentError'), "value given twice - %" + (tmp_num) + "$")
              }
              next_arg = GET_POS_ARG(tmp_num);
              i++;
            } else {
              CHECK_FOR_WIDTH();
              flags |= FWIDTH;
              width = tmp_num;
            }
            continue format_sequence;

          case '<':
          case '\{':
            closing_brace_char = (format_string.charAt(i) === '<' ? '>' : '\}');
            hash_parameter_key = '';

            i++;

            for (;; i++) {
              if (i === len) {
                self.$raise($scope.get('ArgumentError'), "malformed name - unmatched parenthesis")
              }
              if (format_string.charAt(i) === closing_brace_char) {

                if (pos_arg_num > 0) {
                  self.$raise($scope.get('ArgumentError'), "named " + (hash_parameter_key) + " after unnumbered(" + (pos_arg_num) + ")")
                }
                if (pos_arg_num === -1) {
                  self.$raise($scope.get('ArgumentError'), "named " + (hash_parameter_key) + " after numbered")
                }
                pos_arg_num = -2;

                if (args[0] === undefined || !args[0].$$is_hash) {
                  self.$raise($scope.get('ArgumentError'), "one hash required")
                }

                next_arg = (args[0]).$fetch(hash_parameter_key);

                if (closing_brace_char === '>') {
                  continue format_sequence;
                } else {
                  str = next_arg.toString();
                  if (precision !== -1) { str = str.slice(0, precision); }
                  if (flags&FMINUS) {
                    while (str.length < width) { str = str + ' '; }
                  } else {
                    while (str.length < width) { str = ' ' + str; }
                  }
                  break format_sequence;
                }
              }
              hash_parameter_key += format_string.charAt(i);
            }

          case '*':
            i++;
            CHECK_FOR_WIDTH();
            flags |= FWIDTH;
            width = READ_NUM_AFTER_ASTER('width');
            if (width < 0) {
              flags |= FMINUS;
              width = -width;
            }
            continue format_sequence;

          case '.':
            if (flags&FPREC0) {
              self.$raise($scope.get('ArgumentError'), "precision given twice")
            }
            flags |= FPREC|FPREC0;
            precision = 0;
            i++;
            if (format_string.charAt(i) === '*') {
              i++;
              precision = READ_NUM_AFTER_ASTER('precision');
              if (precision < 0) {
                flags &= ~FPREC;
              }
              continue format_sequence;
            }
            precision = READ_NUM('precision');
            continue format_sequence;

          case 'd':
          case 'i':
          case 'u':
            arg = self.$Integer(GET_ARG());
            if (arg >= 0) {
              str = arg.toString();
              while (str.length < precision) { str = '0' + str; }
              if (flags&FMINUS) {
                if (flags&FPLUS || flags&FSPACE) { str = (flags&FPLUS ? '+' : ' ') + str; }
                while (str.length < width) { str = str + ' '; }
              } else {
                if (flags&FZERO && precision === -1) {
                  while (str.length < width - ((flags&FPLUS || flags&FSPACE) ? 1 : 0)) { str = '0' + str; }
                  if (flags&FPLUS || flags&FSPACE) { str = (flags&FPLUS ? '+' : ' ') + str; }
                } else {
                  if (flags&FPLUS || flags&FSPACE) { str = (flags&FPLUS ? '+' : ' ') + str; }
                  while (str.length < width) { str = ' ' + str; }
                }
              }
            } else {
              str = (-arg).toString();
              while (str.length < precision) { str = '0' + str; }
              if (flags&FMINUS) {
                str = '-' + str;
                while (str.length < width) { str = str + ' '; }
              } else {
                if (flags&FZERO && precision === -1) {
                  while (str.length < width - 1) { str = '0' + str; }
                  str = '-' + str;
                } else {
                  str = '-' + str;
                  while (str.length < width) { str = ' ' + str; }
                }
              }
            }
            break format_sequence;

          case 'b':
          case 'B':
          case 'o':
          case 'x':
          case 'X':
            switch (format_string.charAt(i)) {
            case 'b':
            case 'B':
              base_number = 2;
              base_prefix = '0b';
              base_neg_zero_regex = /^1+/;
              base_neg_zero_digit = '1';
              break;
            case 'o':
              base_number = 8;
              base_prefix = '0';
              base_neg_zero_regex = /^3?7+/;
              base_neg_zero_digit = '7';
              break;
            case 'x':
            case 'X':
              base_number = 16;
              base_prefix = '0x';
              base_neg_zero_regex = /^f+/;
              base_neg_zero_digit = 'f';
              break;
            }
            arg = self.$Integer(GET_ARG());
            if (arg >= 0) {
              str = arg.toString(base_number);
              while (str.length < precision) { str = '0' + str; }
              if (flags&FMINUS) {
                if (flags&FPLUS || flags&FSPACE) { str = (flags&FPLUS ? '+' : ' ') + str; }
                if (flags&FSHARP && arg !== 0) { str = base_prefix + str; }
                while (str.length < width) { str = str + ' '; }
              } else {
                if (flags&FZERO && precision === -1) {
                  while (str.length < width - ((flags&FPLUS || flags&FSPACE) ? 1 : 0) - ((flags&FSHARP && arg !== 0) ? base_prefix.length : 0)) { str = '0' + str; }
                  if (flags&FSHARP && arg !== 0) { str = base_prefix + str; }
                  if (flags&FPLUS || flags&FSPACE) { str = (flags&FPLUS ? '+' : ' ') + str; }
                } else {
                  if (flags&FSHARP && arg !== 0) { str = base_prefix + str; }
                  if (flags&FPLUS || flags&FSPACE) { str = (flags&FPLUS ? '+' : ' ') + str; }
                  while (str.length < width) { str = ' ' + str; }
                }
              }
            } else {
              if (flags&FPLUS || flags&FSPACE) {
                str = (-arg).toString(base_number);
                while (str.length < precision) { str = '0' + str; }
                if (flags&FMINUS) {
                  if (flags&FSHARP) { str = base_prefix + str; }
                  str = '-' + str;
                  while (str.length < width) { str = str + ' '; }
                } else {
                  if (flags&FZERO && precision === -1) {
                    while (str.length < width - 1 - (flags&FSHARP ? 2 : 0)) { str = '0' + str; }
                    if (flags&FSHARP) { str = base_prefix + str; }
                    str = '-' + str;
                  } else {
                    if (flags&FSHARP) { str = base_prefix + str; }
                    str = '-' + str;
                    while (str.length < width) { str = ' ' + str; }
                  }
                }
              } else {
                str = (arg >>> 0).toString(base_number).replace(base_neg_zero_regex, base_neg_zero_digit);
                while (str.length < precision - 2) { str = base_neg_zero_digit + str; }
                if (flags&FMINUS) {
                  str = '..' + str;
                  if (flags&FSHARP) { str = base_prefix + str; }
                  while (str.length < width) { str = str + ' '; }
                } else {
                  if (flags&FZERO && precision === -1) {
                    while (str.length < width - 2 - (flags&FSHARP ? base_prefix.length : 0)) { str = base_neg_zero_digit + str; }
                    str = '..' + str;
                    if (flags&FSHARP) { str = base_prefix + str; }
                  } else {
                    str = '..' + str;
                    if (flags&FSHARP) { str = base_prefix + str; }
                    while (str.length < width) { str = ' ' + str; }
                  }
                }
              }
            }
            if (format_string.charAt(i) === format_string.charAt(i).toUpperCase()) {
              str = str.toUpperCase();
            }
            break format_sequence;

          case 'f':
          case 'e':
          case 'E':
          case 'g':
          case 'G':
            arg = self.$Float(GET_ARG());
            if (arg >= 0 || isNaN(arg)) {
              if (arg === Infinity) {
                str = 'Inf';
              } else {
                switch (format_string.charAt(i)) {
                case 'f':
                  str = arg.toFixed(precision === -1 ? 6 : precision);
                  break;
                case 'e':
                case 'E':
                  str = arg.toExponential(precision === -1 ? 6 : precision);
                  break;
                case 'g':
                case 'G':
                  str = arg.toExponential();
                  exponent = parseInt(str.split('e')[1]);
                  if (!(exponent < -4 || exponent >= (precision === -1 ? 6 : precision))) {
                    str = arg.toPrecision(precision === -1 ? (flags&FSHARP ? 6 : undefined) : precision);
                  }
                  break;
                }
              }
              if (flags&FMINUS) {
                if (flags&FPLUS || flags&FSPACE) { str = (flags&FPLUS ? '+' : ' ') + str; }
                while (str.length < width) { str = str + ' '; }
              } else {
                if (flags&FZERO && arg !== Infinity && !isNaN(arg)) {
                  while (str.length < width - ((flags&FPLUS || flags&FSPACE) ? 1 : 0)) { str = '0' + str; }
                  if (flags&FPLUS || flags&FSPACE) { str = (flags&FPLUS ? '+' : ' ') + str; }
                } else {
                  if (flags&FPLUS || flags&FSPACE) { str = (flags&FPLUS ? '+' : ' ') + str; }
                  while (str.length < width) { str = ' ' + str; }
                }
              }
            } else {
              if (arg === -Infinity) {
                str = 'Inf';
              } else {
                switch (format_string.charAt(i)) {
                case 'f':
                  str = (-arg).toFixed(precision === -1 ? 6 : precision);
                  break;
                case 'e':
                case 'E':
                  str = (-arg).toExponential(precision === -1 ? 6 : precision);
                  break;
                case 'g':
                case 'G':
                  str = (-arg).toExponential();
                  exponent = parseInt(str.split('e')[1]);
                  if (!(exponent < -4 || exponent >= (precision === -1 ? 6 : precision))) {
                    str = (-arg).toPrecision(precision === -1 ? (flags&FSHARP ? 6 : undefined) : precision);
                  }
                  break;
                }
              }
              if (flags&FMINUS) {
                str = '-' + str;
                while (str.length < width) { str = str + ' '; }
              } else {
                if (flags&FZERO && arg !== -Infinity) {
                  while (str.length < width - 1) { str = '0' + str; }
                  str = '-' + str;
                } else {
                  str = '-' + str;
                  while (str.length < width) { str = ' ' + str; }
                }
              }
            }
            if (format_string.charAt(i) === format_string.charAt(i).toUpperCase() && arg !== Infinity && arg !== -Infinity && !isNaN(arg)) {
              str = str.toUpperCase();
            }
            str = str.replace(/([eE][-+]?)([0-9])$/, '$10$2');
            break format_sequence;

          case 'a':
          case 'A':
            // Not implemented because there are no specs for this field type.
            self.$raise($scope.get('NotImplementedError'), "`A` and `a` format field types are not implemented in Opal yet")

          case 'c':
            arg = GET_ARG();
            if ((arg)['$respond_to?']("to_ary")) { arg = (arg).$to_ary()[0]; }
            if ((arg)['$respond_to?']("to_str")) {
              str = (arg).$to_str();
            } else {
              str = String.fromCharCode($scope.get('Opal').$coerce_to(arg, $scope.get('Integer'), "to_int"));
            }
            if (str.length !== 1) {
              self.$raise($scope.get('ArgumentError'), "%c requires a character")
            }
            if (flags&FMINUS) {
              while (str.length < width) { str = str + ' '; }
            } else {
              while (str.length < width) { str = ' ' + str; }
            }
            break format_sequence;

          case 'p':
            str = (GET_ARG()).$inspect();
            if (precision !== -1) { str = str.slice(0, precision); }
            if (flags&FMINUS) {
              while (str.length < width) { str = str + ' '; }
            } else {
              while (str.length < width) { str = ' ' + str; }
            }
            break format_sequence;

          case 's':
            str = (GET_ARG()).$to_s();
            if (precision !== -1) { str = str.slice(0, precision); }
            if (flags&FMINUS) {
              while (str.length < width) { str = str + ' '; }
            } else {
              while (str.length < width) { str = ' ' + str; }
            }
            break format_sequence;

          default:
            self.$raise($scope.get('ArgumentError'), "malformed format string - %" + (format_string.charAt(i)))
          }
        }

        if (str === undefined) {
          self.$raise($scope.get('ArgumentError'), "malformed format string - %")
        }

        result += format_string.slice(begin_slice, end_slice) + str;
        begin_slice = i + 1;
      }

      if ($gvars.DEBUG && pos_arg_num >= 0 && seq_arg_num < args.length) {
        self.$raise($scope.get('ArgumentError'), "too many arguments for format string")
      }

      return result + format_string.slice(begin_slice);
    ;
    });

    Opal.defn(self, '$freeze', function() {
      var self = this;

      self.___frozen___ = true;
      return self;
    });

    Opal.defn(self, '$frozen?', function() {
      var $a, self = this;
      if (self.___frozen___ == null) self.___frozen___ = nil;

      return ((($a = self.___frozen___) !== false && $a !== nil) ? $a : false);
    });

    Opal.defn(self, '$hash', function() {
      var self = this;

      return "" + (self.$class()) + ":" + (self.$class().$__id__()) + ":" + (self.$__id__());
    });

    Opal.defn(self, '$initialize_copy', function(other) {
      var self = this;

      return nil;
    });

    Opal.defn(self, '$inspect', function() {
      var self = this;

      return self.$to_s();
    });

    Opal.defn(self, '$instance_of?', function(klass) {
      var self = this;

      return self.$$class === klass;
    });

    Opal.defn(self, '$instance_variable_defined?', function(name) {
      var self = this;

      return Opal.hasOwnProperty.call(self, name.substr(1));
    });

    Opal.defn(self, '$instance_variable_get', function(name) {
      var self = this;

      
      var ivar = self[name.substr(1)];

      return ivar == null ? nil : ivar;
    
    });

    Opal.defn(self, '$instance_variable_set', function(name, value) {
      var self = this;

      return self[name.substr(1)] = value;
    });

    Opal.defn(self, '$instance_variables', function() {
      var self = this;

      
      var result = [];

      for (var name in self) {
        if (name.charAt(0) !== '$') {
          if (name !== '$$class' && name !== '$$id') {
            result.push('@' + name);
          }
        }
      }

      return result;
    
    });

    Opal.defn(self, '$Integer', function(value, base) {
      var self = this;

      
      var i, str, base_digits;

      if (!value.$$is_string) {
        if (base !== undefined) {
          self.$raise($scope.get('ArgumentError'), "base specified for non string value")
        }
        if (value === nil) {
          self.$raise($scope.get('TypeError'), "can't convert nil into Integer")
        }
        if (value.$$is_number) {
          if (value === Infinity || value === -Infinity || isNaN(value)) {
            self.$raise($scope.get('FloatDomainError'), value)
          }
          return Math.floor(value);
        }
        if (value['$respond_to?']("to_int")) {
          i = value.$to_int();
          if (i !== nil) {
            return i;
          }
        }
        return $scope.get('Opal')['$coerce_to!'](value, $scope.get('Integer'), "to_i");
      }

      if (base === undefined) {
        base = 0;
      } else {
        base = $scope.get('Opal').$coerce_to(base, $scope.get('Integer'), "to_int");
        if (base === 1 || base < 0 || base > 36) {
          self.$raise($scope.get('ArgumentError'), "invalid radix " + (base))
        }
      }

      str = value.toLowerCase();

      str = str.replace(/(\d)_(?=\d)/g, '$1');

      str = str.replace(/^(\s*[+-]?)(0[bodx]?)/, function (_, head, flag) {
        switch (flag) {
        case '0b':
          if (base === 0 || base === 2) {
            base = 2;
            return head;
          }
        case '0':
        case '0o':
          if (base === 0 || base === 8) {
            base = 8;
            return head;
          }
        case '0d':
          if (base === 0 || base === 10) {
            base = 10;
            return head;
          }
        case '0x':
          if (base === 0 || base === 16) {
            base = 16;
            return head;
          }
        }
        self.$raise($scope.get('ArgumentError'), "invalid value for Integer(): \"" + (value) + "\"")
      });

      base = (base === 0 ? 10 : base);

      base_digits = '0-' + (base <= 10 ? base - 1 : '9a-' + String.fromCharCode(97 + (base - 11)));

      if (!(new RegExp('^\\s*[+-]?[' + base_digits + ']+\\s*$')).test(str)) {
        self.$raise($scope.get('ArgumentError'), "invalid value for Integer(): \"" + (value) + "\"")
      }

      i = parseInt(str, base);

      if (isNaN(i)) {
        self.$raise($scope.get('ArgumentError'), "invalid value for Integer(): \"" + (value) + "\"")
      }

      return i;
    ;
    });

    Opal.defn(self, '$Float', function(value) {
      var self = this;

      
      var str;

      if (value === nil) {
        self.$raise($scope.get('TypeError'), "can't convert nil into Float")
      }

      if (value.$$is_string) {
        str = value.toString();

        str = str.replace(/(\d)_(?=\d)/g, '$1');

        //Special case for hex strings only:
        if (/^\s*[-+]?0[xX][0-9a-fA-F]+\s*$/.test(str)) {
          return self.$Integer(str);
        }

        if (!/^\s*[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?\s*$/.test(str)) {
          self.$raise($scope.get('ArgumentError'), "invalid value for Float(): \"" + (value) + "\"")
        }

        return parseFloat(str);
      }

      return $scope.get('Opal')['$coerce_to!'](value, $scope.get('Float'), "to_f");
    
    });

    Opal.defn(self, '$Hash', function(arg) {
      var $a, $b, self = this;

      if ((($a = ((($b = arg['$nil?']()) !== false && $b !== nil) ? $b : arg['$==']([]))) !== nil && (!$a.$$is_boolean || $a == true))) {
        return $hash2([], {})};
      if ((($a = $scope.get('Hash')['$==='](arg)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return arg};
      return $scope.get('Opal')['$coerce_to!'](arg, $scope.get('Hash'), "to_hash");
    });

    Opal.defn(self, '$is_a?', function(klass) {
      var self = this;

      return Opal.is_a(self, klass);
    });

    Opal.defn(self, '$kind_of?', def['$is_a?']);

    Opal.defn(self, '$lambda', TMP_5 = function() {
      var self = this, $iter = TMP_5.$$p, block = $iter || nil;

      TMP_5.$$p = null;
      block.$$is_lambda = true;
      return block;
    });

    Opal.defn(self, '$load', function(file) {
      var self = this;

      file = $scope.get('Opal')['$coerce_to!'](file, $scope.get('String'), "to_str");
      return Opal.load(Opal.normalize_loadable_path(file));
    });

    Opal.defn(self, '$loop', TMP_6 = function() {
      var self = this, $iter = TMP_6.$$p, block = $iter || nil;

      TMP_6.$$p = null;
      
      while (true) {
        if (block() === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    });

    Opal.defn(self, '$nil?', function() {
      var self = this;

      return false;
    });

    Opal.defn(self, '$object_id', def.$__id__);

    Opal.defn(self, '$printf', function(args) {
      var $a, self = this;

      args = $slice.call(arguments, 0);
      if ($rb_gt(args.$length(), 0)) {
        self.$print(($a = self).$format.apply($a, [].concat(args)))};
      return nil;
    });

    Opal.defn(self, '$private_methods', function() {
      var self = this;

      return [];
    });

    Opal.defn(self, '$private_instance_methods', def.$private_methods);

    Opal.defn(self, '$proc', TMP_7 = function() {
      var self = this, $iter = TMP_7.$$p, block = $iter || nil;

      TMP_7.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        self.$raise($scope.get('ArgumentError'), "tried to create Proc object without a block")
      };
      block.$$is_lambda = false;
      return block;
    });

    Opal.defn(self, '$puts', function(strs) {
      var $a, self = this;
      if ($gvars.stdout == null) $gvars.stdout = nil;

      strs = $slice.call(arguments, 0);
      return ($a = $gvars.stdout).$puts.apply($a, [].concat(strs));
    });

    Opal.defn(self, '$p', function(args) {
      var $a, $b, TMP_8, self = this;

      args = $slice.call(arguments, 0);
      ($a = ($b = args).$each, $a.$$p = (TMP_8 = function(obj){var self = TMP_8.$$s || this;
        if ($gvars.stdout == null) $gvars.stdout = nil;
if (obj == null) obj = nil;
      return $gvars.stdout.$puts(obj.$inspect())}, TMP_8.$$s = self, TMP_8), $a).call($b);
      if ($rb_le(args.$length(), 1)) {
        return args['$[]'](0)
        } else {
        return args
      };
    });

    Opal.defn(self, '$print', function(strs) {
      var $a, self = this;
      if ($gvars.stdout == null) $gvars.stdout = nil;

      strs = $slice.call(arguments, 0);
      return ($a = $gvars.stdout).$print.apply($a, [].concat(strs));
    });

    Opal.defn(self, '$warn', function(strs) {
      var $a, $b, self = this;
      if ($gvars.VERBOSE == null) $gvars.VERBOSE = nil;
      if ($gvars.stderr == null) $gvars.stderr = nil;

      strs = $slice.call(arguments, 0);
      if ((($a = ((($b = $gvars.VERBOSE['$nil?']()) !== false && $b !== nil) ? $b : strs['$empty?']())) !== nil && (!$a.$$is_boolean || $a == true))) {
        return nil
        } else {
        return ($a = $gvars.stderr).$puts.apply($a, [].concat(strs))
      };
    });

    Opal.defn(self, '$raise', function(exception, string) {
      var self = this;
      if ($gvars["!"] == null) $gvars["!"] = nil;

      
      if (exception == null && $gvars["!"]) {
        throw $gvars["!"];
      }

      if (exception == null) {
        exception = $scope.get('RuntimeError').$new();
      }
      else if (exception.$$is_string) {
        exception = $scope.get('RuntimeError').$new(exception);
      }
      else if (exception.$$is_class) {
        exception = exception.$new(string);
      }

      $gvars["!"] = exception;

      throw exception;
    ;
    });

    Opal.defn(self, '$fail', def.$raise);

    Opal.defn(self, '$rand', function(max) {
      var self = this;

      
      if (max === undefined) {
        return Math.random();
      }
      else if (max.$$is_range) {
        var arr = max.$to_a();

        return arr[self.$rand(arr.length)];
      }
      else {
        return Math.floor(Math.random() *
          Math.abs($scope.get('Opal').$coerce_to(max, $scope.get('Integer'), "to_int")));
      }
    
    });

    Opal.defn(self, '$respond_to?', function(name, include_all) {
      var $a, self = this;

      if (include_all == null) {
        include_all = false
      }
      if ((($a = self['$respond_to_missing?'](name)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return true};
      
      var body = self['$' + name];

      if (typeof(body) === "function" && !body.$$stub) {
        return true;
      }
    
      return false;
    });

    Opal.defn(self, '$respond_to_missing?', function(method_name) {
      var self = this;

      return false;
    });

    Opal.defn(self, '$require', function(file) {
      var self = this;

      file = $scope.get('Opal')['$coerce_to!'](file, $scope.get('String'), "to_str");
      return Opal.require(Opal.normalize_loadable_path(file));
    });

    Opal.defn(self, '$require_relative', function(file) {
      var self = this;

      $scope.get('Opal')['$try_convert!'](file, $scope.get('String'), "to_str");
      file = $scope.get('File').$expand_path($scope.get('File').$join(Opal.current_file, "..", file));
      return Opal.require(Opal.normalize_loadable_path(file));
    });

    Opal.defn(self, '$require_tree', function(path) {
      var self = this;

      path = $scope.get('File').$expand_path(path);
      if (path['$=='](".")) {
        path = ""};
      
      for (var name in Opal.modules) {
        if ((name)['$start_with?'](path)) {
          Opal.require(name);
        }
      }
    ;
      return nil;
    });

    Opal.defn(self, '$send', def.$__send__);

    Opal.defn(self, '$public_send', def.$__send__);

    Opal.defn(self, '$singleton_class', function() {
      var self = this;

      return Opal.get_singleton_class(self);
    });

    Opal.defn(self, '$sprintf', def.$format);

    Opal.defn(self, '$srand', def.$rand);

    Opal.defn(self, '$String', function(str) {
      var $a, self = this;

      return ((($a = $scope.get('Opal')['$coerce_to?'](str, $scope.get('String'), "to_str")) !== false && $a !== nil) ? $a : $scope.get('Opal')['$coerce_to!'](str, $scope.get('String'), "to_s"));
    });

    Opal.defn(self, '$taint', function() {
      var self = this;

      return self;
    });

    Opal.defn(self, '$tainted?', function() {
      var self = this;

      return false;
    });

    Opal.defn(self, '$tap', TMP_9 = function() {
      var self = this, $iter = TMP_9.$$p, block = $iter || nil;

      TMP_9.$$p = null;
      if (Opal.yield1(block, self) === $breaker) return $breaker.$v;
      return self;
    });

    Opal.defn(self, '$to_proc', function() {
      var self = this;

      return self;
    });

    Opal.defn(self, '$to_s', function() {
      var self = this;

      return "#<" + (self.$class()) + ":0x" + (self.$__id__().$to_s(16)) + ">";
    });

    Opal.defn(self, '$untaint', def.$taint);
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/nil_class"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$raise']);
  (function($base, $super) {
    function $NilClass(){};
    var self = $NilClass = $klass($base, $super, 'NilClass', $NilClass);

    var def = self.$$proto, $scope = self.$$scope;

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
      var self = this;

      return self.$raise($scope.get('TypeError'));
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
      var self = this;

      return $scope.get('NilClass');
    };

    def.$to_a = function() {
      var self = this;

      return [];
    };

    def.$to_h = function() {
      var self = this;

      return Opal.hash();
    };

    def.$to_i = function() {
      var self = this;

      return 0;
    };

    Opal.defn(self, '$to_f', def.$to_i);

    return (def.$to_s = function() {
      var self = this;

      return "";
    }, nil) && 'to_s';
  })(self, null);
  return Opal.cdecl($scope, 'NIL', nil);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/boolean"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$undef_method']);
  (function($base, $super) {
    function $Boolean(){};
    var self = $Boolean = $klass($base, $super, 'Boolean', $Boolean);

    var def = self.$$proto, $scope = self.$$scope;

    def.$$is_boolean = true;

    def.$__id__ = function() {
      var self = this;

      return self.valueOf() ? 2 : 0;
    };

    Opal.defn(self, '$object_id', def.$__id__);

    (function(self) {
      var $scope = self.$$scope, def = self.$$proto;

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

    Opal.defn(self, '$equal?', def['$==']);

    Opal.defn(self, '$singleton_class', def.$class);

    return (def.$to_s = function() {
      var self = this;

      return (self == true) ? 'true' : 'false';
    }, nil) && 'to_s';
  })(self, null);
  Opal.cdecl($scope, 'TrueClass', $scope.get('Boolean'));
  Opal.cdecl($scope, 'FalseClass', $scope.get('Boolean'));
  Opal.cdecl($scope, 'TRUE', true);
  return Opal.cdecl($scope, 'FALSE', false);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/error"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $module = Opal.module;

  Opal.add_stubs(['$attr_reader', '$class']);
  (function($base, $super) {
    function $Exception(){};
    var self = $Exception = $klass($base, $super, 'Exception', $Exception);

    var def = self.$$proto, $scope = self.$$scope;

    def.message = nil;
    self.$attr_reader("message");

    Opal.defs(self, '$new', function(message) {
      var self = this;

      if (message == null) {
        message = "Exception"
      }
      
      var err = new self.$$alloc(message);

      if (Error.captureStackTrace) {
        Error.captureStackTrace(err);
      }

      err.name = self.$$name;
      err.$initialize(message);
      return err;
    
    });

    def.$initialize = function(message) {
      var self = this;

      return self.message = message;
    };

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

      return "#<" + (self.$class()) + ": '" + (self.message) + "'>";
    };

    return Opal.defn(self, '$to_s', def.$message);
  })(self, null);
  (function($base, $super) {
    function $ScriptError(){};
    var self = $ScriptError = $klass($base, $super, 'ScriptError', $ScriptError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('Exception'));
  (function($base, $super) {
    function $SyntaxError(){};
    var self = $SyntaxError = $klass($base, $super, 'SyntaxError', $SyntaxError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('ScriptError'));
  (function($base, $super) {
    function $LoadError(){};
    var self = $LoadError = $klass($base, $super, 'LoadError', $LoadError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('ScriptError'));
  (function($base, $super) {
    function $NotImplementedError(){};
    var self = $NotImplementedError = $klass($base, $super, 'NotImplementedError', $NotImplementedError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('ScriptError'));
  (function($base, $super) {
    function $SystemExit(){};
    var self = $SystemExit = $klass($base, $super, 'SystemExit', $SystemExit);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('Exception'));
  (function($base, $super) {
    function $NoMemoryError(){};
    var self = $NoMemoryError = $klass($base, $super, 'NoMemoryError', $NoMemoryError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('Exception'));
  (function($base, $super) {
    function $SignalException(){};
    var self = $SignalException = $klass($base, $super, 'SignalException', $SignalException);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('Exception'));
  (function($base, $super) {
    function $Interrupt(){};
    var self = $Interrupt = $klass($base, $super, 'Interrupt', $Interrupt);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('Exception'));
  (function($base, $super) {
    function $StandardError(){};
    var self = $StandardError = $klass($base, $super, 'StandardError', $StandardError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('Exception'));
  (function($base, $super) {
    function $NameError(){};
    var self = $NameError = $klass($base, $super, 'NameError', $NameError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  (function($base, $super) {
    function $NoMethodError(){};
    var self = $NoMethodError = $klass($base, $super, 'NoMethodError', $NoMethodError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('NameError'));
  (function($base, $super) {
    function $RuntimeError(){};
    var self = $RuntimeError = $klass($base, $super, 'RuntimeError', $RuntimeError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  (function($base, $super) {
    function $LocalJumpError(){};
    var self = $LocalJumpError = $klass($base, $super, 'LocalJumpError', $LocalJumpError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  (function($base, $super) {
    function $TypeError(){};
    var self = $TypeError = $klass($base, $super, 'TypeError', $TypeError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  (function($base, $super) {
    function $ArgumentError(){};
    var self = $ArgumentError = $klass($base, $super, 'ArgumentError', $ArgumentError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  (function($base, $super) {
    function $IndexError(){};
    var self = $IndexError = $klass($base, $super, 'IndexError', $IndexError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  (function($base, $super) {
    function $StopIteration(){};
    var self = $StopIteration = $klass($base, $super, 'StopIteration', $StopIteration);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('IndexError'));
  (function($base, $super) {
    function $KeyError(){};
    var self = $KeyError = $klass($base, $super, 'KeyError', $KeyError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('IndexError'));
  (function($base, $super) {
    function $RangeError(){};
    var self = $RangeError = $klass($base, $super, 'RangeError', $RangeError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  (function($base, $super) {
    function $FloatDomainError(){};
    var self = $FloatDomainError = $klass($base, $super, 'FloatDomainError', $FloatDomainError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('RangeError'));
  (function($base, $super) {
    function $IOError(){};
    var self = $IOError = $klass($base, $super, 'IOError', $IOError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  (function($base, $super) {
    function $SystemCallError(){};
    var self = $SystemCallError = $klass($base, $super, 'SystemCallError', $SystemCallError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  return (function($base) {
    var self = $module($base, 'Errno');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $EINVAL(){};
      var self = $EINVAL = $klass($base, $super, 'EINVAL', $EINVAL);

      var def = self.$$proto, $scope = self.$$scope, TMP_1;

      return (Opal.defs(self, '$new', TMP_1 = function() {
        var self = this, $iter = TMP_1.$$p, $yield = $iter || nil;

        TMP_1.$$p = null;
        return Opal.find_super_dispatcher(self, 'new', TMP_1, null, $EINVAL).apply(self, ["Invalid argument"]);
      }), nil) && 'new'
    })(self, $scope.get('SystemCallError'))
  })(self);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/regexp"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $gvars = Opal.gvars;

  Opal.add_stubs(['$nil?', '$[]', '$raise', '$escape', '$options', '$to_str', '$new', '$join', '$!', '$match', '$begin', '$coerce_to', '$call', '$=~']);
  (function($base, $super) {
    function $RegexpError(){};
    var self = $RegexpError = $klass($base, $super, 'RegexpError', $RegexpError);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('StandardError'));
  return (function($base, $super) {
    function $Regexp(){};
    var self = $Regexp = $klass($base, $super, 'Regexp', $Regexp);

    var def = self.$$proto, $scope = self.$$scope, TMP_1;

    Opal.cdecl($scope, 'IGNORECASE', 1);

    Opal.cdecl($scope, 'MULTILINE', 4);

    def.$$is_regexp = true;

    (function(self) {
      var $scope = self.$$scope, def = self.$$proto;

      self.$$proto.$escape = function(string) {
        var self = this;

        
        return string.replace(/([-[\]\/{}()*+?.^$\\| ])/g, '\\$1')
                     .replace(/[\n]/g, '\\n')
                     .replace(/[\r]/g, '\\r')
                     .replace(/[\f]/g, '\\f')
                     .replace(/[\t]/g, '\\t');
      
      };
      self.$$proto.$last_match = function(n) {
        var $a, self = this;
        if ($gvars["~"] == null) $gvars["~"] = nil;

        if (n == null) {
          n = nil
        }
        if ((($a = n['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          return $gvars["~"]
          } else {
          return $gvars["~"]['$[]'](n)
        };
      };
      self.$$proto.$quote = self.$$proto.$escape;
      self.$$proto.$union = function(parts) {
        var self = this;

        parts = $slice.call(arguments, 0);
        
        var is_first_part_array, quoted_validated, part, options, each_part_options;
        if (parts.length == 0) {
          return /(?!)/;
        }
        // cover the 2 arrays passed as arguments case
        is_first_part_array = parts[0].$$is_array;
        if (parts.length > 1 && is_first_part_array) {
          self.$raise($scope.get('TypeError'), "no implicit conversion of Array into String")
        }        
        // deal with splat issues (related to https://github.com/opal/opal/issues/858)
        if (is_first_part_array) {
          parts = parts[0];
        }
        options = undefined;
        quoted_validated = [];
        for (var i=0; i < parts.length; i++) {
          part = parts[i];
          if (part.$$is_string) {
            quoted_validated.push(self.$escape(part));
          }
          else if (part.$$is_regexp) { 
            each_part_options = (part).$options();   
            if (options != undefined && options != each_part_options) {
              self.$raise($scope.get('TypeError'), "All expressions must use the same options")
            }
            options = each_part_options;
            quoted_validated.push('('+part.source+')');
          }
          else {
            quoted_validated.push(self.$escape((part).$to_str()));
          }
        }
      
        return self.$new((quoted_validated).$join("|"), options);
      };
      return (self.$$proto.$new = function(regexp, options) {
        var self = this;

        
        // Play nice with IE8
        if (regexp.$$is_string && regexp.substr(regexp.length-1, 1) == "\\") {
          self.$raise($scope.get('RegexpError'), "too short escape sequence: /" + (regexp) + "/")
        }
        
        if (options == undefined || options['$!']()) {
          options = undefined;
        }
        
        if (options != undefined) {
          if (regexp.$$is_regexp) {
            // options are already in regex
            options = undefined;
          }
          else if (options.$$is_number) {
            var result = '';
            if ($scope.get('IGNORECASE') & options) {
              result += 'i';
            }
            if ($scope.get('MULTILINE') & options) {
              result += 'm';
            }
            options = result;
          }
          else {
            options = 'i';
          }
        }       
        
        return new RegExp(regexp, options);
      ;
      }, nil) && 'new';
    })(self.$singleton_class());

    def['$=='] = function(other) {
      var self = this;

      return other.constructor == RegExp && self.toString() === other.toString();
    };

    def['$==='] = function(string) {
      var self = this;

      return self.$match(string) !== nil;
    };

    def['$=~'] = function(string) {
      var $a, self = this;
      if ($gvars["~"] == null) $gvars["~"] = nil;

      return ($a = self.$match(string), $a !== false && $a !== nil ?$gvars["~"].$begin(0) : $a);
    };

    Opal.defn(self, '$eql?', def['$==']);

    def.$inspect = function() {
      var self = this;

      return self.toString();
    };

    def.$match = TMP_1 = function(string, pos) {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;
      if ($gvars["~"] == null) $gvars["~"] = nil;

      TMP_1.$$p = null;
      
      if (pos === undefined) {
        pos = 0;
      } else {
        pos = $scope.get('Opal').$coerce_to(pos, $scope.get('Integer'), "to_int");
      }

      if (string === nil) {
        return $gvars["~"] = nil;
      }

      string = $scope.get('Opal').$coerce_to(string, $scope.get('String'), "to_str");

      if (pos < 0) {
        pos += string.length;
        if (pos < 0) {
          return $gvars["~"] = nil;
        }
      }

      // global RegExp maintains state, so not using self/this
      var md, re = new RegExp(self.source, 'gm' + (self.ignoreCase ? 'i' : ''));

      while (true) {
        md = re.exec(string);
        if (md === null) {
          return $gvars["~"] = nil;
        }
        if (md.index >= pos) {
          $gvars["~"] = $scope.get('MatchData').$new(re, md)
          return block === nil ? $gvars["~"] : block.$call($gvars["~"]);
        }
        re.lastIndex = md.index + 1;
      }
    ;
    };

    def['$~'] = function() {
      var self = this;
      if ($gvars._ == null) $gvars._ = nil;

      return self['$=~']($gvars._);
    };

    def.$source = function() {
      var self = this;

      return self.source;
    };

    def.$options = function() {
      var self = this;

      
      var as_string, text_flags, result, text_flag;
      as_string = self.toString();
      if (as_string == "/(?:)/") {
        self.$raise($scope.get('TypeError'), "uninitialized Regexp")
      }
      text_flags = as_string.replace(self.source, '').match(/\w+/);
      result = 0;
      // may have no flags
      if (text_flags == null) {
        return result;
      }
      // first match contains all of our flags
      text_flags = text_flags[0];
      for (var i=0; i < text_flags.length; i++) {
        text_flag = text_flags[i];
        switch(text_flag) {
          case 'i':
            result |= $scope.get('IGNORECASE');
            break;
          case 'm':
            result |= $scope.get('MULTILINE');
            break;
          default:
            self.$raise("RegExp flag " + (text_flag) + " does not have a match in Ruby")
        }
      }
      
      return result;
    
    };

    return Opal.defn(self, '$to_s', def.$source);
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/comparable"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module;

  Opal.add_stubs(['$===', '$equal?', '$<=>', '$normalize', '$raise', '$class']);
  return (function($base) {
    var self = $module($base, 'Comparable');

    var def = self.$$proto, $scope = self.$$scope;

    Opal.defs(self, '$normalize', function(what) {
      var $a, self = this;

      if ((($a = $scope.get('Integer')['$==='](what)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return what};
      if ($rb_gt(what, 0)) {
        return 1};
      if ($rb_lt(what, 0)) {
        return -1};
      return 0;
    });

    Opal.defn(self, '$==', function(other) {
      var $a, self = this, cmp = nil;

      try {
      if ((($a = self['$equal?'](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
          return true};
        if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          return false
        };
        return $scope.get('Comparable').$normalize(cmp) == 0;
      } catch ($err) {if (Opal.rescue($err, [$scope.get('StandardError')])) {
        return false
        }else { throw $err; }
      };
    });

    Opal.defn(self, '$>', function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.get('Comparable').$normalize(cmp) > 0;
    });

    Opal.defn(self, '$>=', function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.get('Comparable').$normalize(cmp) >= 0;
    });

    Opal.defn(self, '$<', function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.get('Comparable').$normalize(cmp) < 0;
    });

    Opal.defn(self, '$<=', function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.get('Comparable').$normalize(cmp) <= 0;
    });

    Opal.defn(self, '$between?', function(min, max) {
      var self = this;

      if ($rb_lt(self, min)) {
        return false};
      if ($rb_gt(self, max)) {
        return false};
      return true;
    });
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/enumerable"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module;

  Opal.add_stubs(['$raise', '$enum_for', '$flatten', '$map', '$==', '$destructure', '$nil?', '$coerce_to!', '$coerce_to', '$===', '$new', '$<<', '$[]', '$[]=', '$inspect', '$__send__', '$yield', '$enumerator_size', '$respond_to?', '$size', '$private', '$compare', '$<=>', '$dup', '$to_a', '$lambda', '$sort', '$call', '$first', '$zip']);
  return (function($base) {
    var self = $module($base, 'Enumerable');

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_7, TMP_8, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13, TMP_14, TMP_15, TMP_16, TMP_17, TMP_18, TMP_19, TMP_20, TMP_22, TMP_23, TMP_24, TMP_25, TMP_26, TMP_27, TMP_28, TMP_29, TMP_30, TMP_31, TMP_32, TMP_33, TMP_35, TMP_37, TMP_41, TMP_42;

    Opal.defn(self, '$all?', TMP_1 = function() {
      var $a, self = this, $iter = TMP_1.$$p, block = $iter || nil;

      TMP_1.$$p = null;
      
      var result = true;

      if (block !== nil) {
        self.$each.$$p = function() {
          var value = Opal.yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) === nil || ($a.$$is_boolean && $a == false))) {
            result = false;
            return $breaker;
          }
        };
      }
      else {
        self.$each.$$p = function(obj) {
          if (arguments.length == 1 && (($a = obj) === nil || ($a.$$is_boolean && $a == false))) {
            result = false;
            return $breaker;
          }
        };
      }

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$any?', TMP_2 = function() {
      var $a, self = this, $iter = TMP_2.$$p, block = $iter || nil;

      TMP_2.$$p = null;
      
      var result = false;

      if (block !== nil) {
        self.$each.$$p = function() {
          var value = Opal.yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
            result = true;
            return $breaker;
          }
        };
      }
      else {
        self.$each.$$p = function(obj) {
          if (arguments.length != 1 || (($a = obj) !== nil && (!$a.$$is_boolean || $a == true))) {
            result = true;
            return $breaker;
          }
        }
      }

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$chunk', TMP_3 = function(state) {
      var self = this, $iter = TMP_3.$$p, block = $iter || nil;

      TMP_3.$$p = null;
      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$collect', TMP_4 = function() {
      var self = this, $iter = TMP_4.$$p, block = $iter || nil;

      TMP_4.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect")
      };
      
      var result = [];

      self.$each.$$p = function() {
        var value = Opal.yieldX(block, arguments);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        result.push(value);
      };

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$collect_concat', TMP_5 = function() {
      var $a, $b, TMP_6, self = this, $iter = TMP_5.$$p, block = $iter || nil;

      TMP_5.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect_concat")
      };
      return ($a = ($b = self).$map, $a.$$p = (TMP_6 = function(item){var self = TMP_6.$$s || this, $a;
if (item == null) item = nil;
      return $a = Opal.yield1(block, item), $a === $breaker ? $a : $a}, TMP_6.$$s = self, TMP_6), $a).call($b).$flatten(1);
    });

    Opal.defn(self, '$count', TMP_7 = function(object) {
      var $a, self = this, $iter = TMP_7.$$p, block = $iter || nil;

      TMP_7.$$p = null;
      
      var result = 0;

      if (object != null) {
        block = function() {
          return $scope.get('Opal').$destructure(arguments)['$=='](object);
        };
      }
      else if (block === nil) {
        block = function() { return true; };
      }

      self.$each.$$p = function() {
        var value = Opal.yieldX(block, arguments);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
          result++;
        }
      }

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$cycle', TMP_8 = function(n) {
      var $a, self = this, $iter = TMP_8.$$p, block = $iter || nil;

      if (n == null) {
        n = nil
      }
      TMP_8.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("cycle", n)
      };
      if ((($a = n['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        n = $scope.get('Opal')['$coerce_to!'](n, $scope.get('Integer'), "to_int");
        if ((($a = n <= 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          return nil};
      };
      
      var result,
          all  = [];

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
            value = Opal.yield1(block, param);

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
    
      if ((($a = n['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        
        while (true) {
          for (var i = 0, length = all.length; i < length; i++) {
            var value = Opal.yield1(block, all[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }
        }
      
        } else {
        
        while (n > 1) {
          for (var i = 0, length = all.length; i < length; i++) {
            var value = Opal.yield1(block, all[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }

          n--;
        }
      
      };
    });

    Opal.defn(self, '$detect', TMP_9 = function(ifnone) {
      var $a, self = this, $iter = TMP_9.$$p, block = $iter || nil;

      TMP_9.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("detect", ifnone)
      };
      
      var result = undefined;

      self.$each.$$p = function() {
        var params = $scope.get('Opal').$destructure(arguments),
            value  = Opal.yield1(block, params);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
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
    
    });

    Opal.defn(self, '$drop', function(number) {
      var $a, self = this;

      number = $scope.get('Opal').$coerce_to(number, $scope.get('Integer'), "to_int");
      if ((($a = number < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "attempt to drop negative size")};
      
      var result  = [],
          current = 0;

      self.$each.$$p = function() {
        if (number <= current) {
          result.push($scope.get('Opal').$destructure(arguments));
        }

        current++;
      };

      self.$each()

      return result;
    
    });

    Opal.defn(self, '$drop_while', TMP_10 = function() {
      var $a, self = this, $iter = TMP_10.$$p, block = $iter || nil;

      TMP_10.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("drop_while")
      };
      
      var result   = [],
          dropping = true;

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments);

        if (dropping) {
          var value = Opal.yield1(block, param);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) === nil || ($a.$$is_boolean && $a == false))) {
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
    
    });

    Opal.defn(self, '$each_cons', TMP_11 = function(n) {
      var self = this, $iter = TMP_11.$$p, block = $iter || nil;

      TMP_11.$$p = null;
      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$each_entry', TMP_12 = function() {
      var self = this, $iter = TMP_12.$$p, block = $iter || nil;

      TMP_12.$$p = null;
      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$each_slice', TMP_13 = function(n) {
      var $a, self = this, $iter = TMP_13.$$p, block = $iter || nil;

      TMP_13.$$p = null;
      n = $scope.get('Opal').$coerce_to(n, $scope.get('Integer'), "to_int");
      if ((($a = n <= 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "invalid slice size")};
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_slice", n)
      };
      
      var result,
          slice = []

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments);

        slice.push(param);

        if (slice.length === n) {
          if (Opal.yield1(block, slice) === $breaker) {
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
        if (Opal.yield1(block, slice) === $breaker) {
          return $breaker.$v;
        }
      }
    ;
      return nil;
    });

    Opal.defn(self, '$each_with_index', TMP_14 = function(args) {
      var $a, self = this, $iter = TMP_14.$$p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_14.$$p = null;
      if ((block !== nil)) {
        } else {
        return ($a = self).$enum_for.apply($a, ["each_with_index"].concat(args))
      };
      
      var result,
          index = 0;

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
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
    });

    Opal.defn(self, '$each_with_object', TMP_15 = function(object) {
      var self = this, $iter = TMP_15.$$p, block = $iter || nil;

      TMP_15.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_with_object", object)
      };
      
      var result;

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
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
    });

    Opal.defn(self, '$entries', function(args) {
      var self = this;

      args = $slice.call(arguments, 0);
      
      var result = [];

      self.$each.$$p = function() {
        result.push($scope.get('Opal').$destructure(arguments));
      };

      self.$each.apply(self, args);

      return result;
    
    });

    Opal.defn(self, '$find', def.$detect);

    Opal.defn(self, '$find_all', TMP_16 = function() {
      var $a, self = this, $iter = TMP_16.$$p, block = $iter || nil;

      TMP_16.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("find_all")
      };
      
      var result = [];

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
            value = Opal.yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
          result.push(param);
        }
      };

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$find_index', TMP_17 = function(object) {
      var $a, self = this, $iter = TMP_17.$$p, block = $iter || nil;

      TMP_17.$$p = null;
      if ((($a = object === undefined && block === nil) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.$enum_for("find_index")};
      
      var result = nil,
          index  = 0;

      if (object != null) {
        self.$each.$$p = function() {
          var param = $scope.get('Opal').$destructure(arguments);

          if ((param)['$=='](object)) {
            result = index;
            return $breaker;
          }

          index += 1;
        };
      }
      else if (block !== nil) {
        self.$each.$$p = function() {
          var value = Opal.yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
            result = index;
            return $breaker;
          }

          index += 1;
        };
      }

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$first', function(number) {
      var $a, self = this, result = nil;

      if ((($a = number === undefined) !== nil && (!$a.$$is_boolean || $a == true))) {
        result = nil;
        
        self.$each.$$p = function() {
          result = $scope.get('Opal').$destructure(arguments);

          return $breaker;
        };

        self.$each();
      ;
        } else {
        result = [];
        number = $scope.get('Opal').$coerce_to(number, $scope.get('Integer'), "to_int");
        if ((($a = number < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.$raise($scope.get('ArgumentError'), "attempt to take negative size")};
        if ((($a = number == 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          return []};
        
        var current = 0,
            number  = $scope.get('Opal').$coerce_to(number, $scope.get('Integer'), "to_int");

        self.$each.$$p = function() {
          result.push($scope.get('Opal').$destructure(arguments));

          if (number <= ++current) {
            return $breaker;
          }
        };

        self.$each();
      ;
      };
      return result;
    });

    Opal.defn(self, '$flat_map', def.$collect_concat);

    Opal.defn(self, '$grep', TMP_18 = function(pattern) {
      var $a, self = this, $iter = TMP_18.$$p, block = $iter || nil;

      TMP_18.$$p = null;
      
      var result = [];

      if (block !== nil) {
        self.$each.$$p = function() {
          var param = $scope.get('Opal').$destructure(arguments),
              value = pattern['$==='](param);

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
            value = Opal.yield1(block, param);

            if (value === $breaker) {
              result = $breaker.$v;
              return $breaker;
            }

            result.push(value);
          }
        };
      }
      else {
        self.$each.$$p = function() {
          var param = $scope.get('Opal').$destructure(arguments),
              value = pattern['$==='](param);

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
            result.push(param);
          }
        };
      }

      self.$each();

      return result;
    ;
    });

    Opal.defn(self, '$group_by', TMP_19 = function() {
      var $a, $b, $c, self = this, $iter = TMP_19.$$p, block = $iter || nil, hash = nil;

      TMP_19.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("group_by")
      };
      hash = $scope.get('Hash').$new();
      
      var result;

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
            value = Opal.yield1(block, param);

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
    });

    Opal.defn(self, '$include?', function(obj) {
      var self = this;

      
      var result = false;

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments);

        if ((param)['$=='](obj)) {
          result = true;
          return $breaker;
        }
      }

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$inject', TMP_20 = function(object, sym) {
      var self = this, $iter = TMP_20.$$p, block = $iter || nil;

      TMP_20.$$p = null;
      
      var result = object;

      if (block !== nil && sym === undefined) {
        self.$each.$$p = function() {
          var value = $scope.get('Opal').$destructure(arguments);

          if (result === undefined) {
            result = value;
            return;
          }

          value = Opal.yieldX(block, [result, value]);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          result = value;
        };
      }
      else {
        if (sym === undefined) {
          if (!$scope.get('Symbol')['$==='](object)) {
            self.$raise($scope.get('TypeError'), "" + (object.$inspect()) + " is not a Symbol");
          }

          sym    = object;
          result = undefined;
        }

        self.$each.$$p = function() {
          var value = $scope.get('Opal').$destructure(arguments);

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
    });

    Opal.defn(self, '$lazy', function() {
      var $a, $b, TMP_21, self = this;

      return ($a = ($b = (($scope.get('Enumerator')).$$scope.get('Lazy'))).$new, $a.$$p = (TMP_21 = function(enum$, args){var self = TMP_21.$$s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
      return ($a = enum$).$yield.apply($a, [].concat(args))}, TMP_21.$$s = self, TMP_21), $a).call($b, self, self.$enumerator_size());
    });

    Opal.defn(self, '$enumerator_size', function() {
      var $a, self = this;

      if ((($a = self['$respond_to?']("size")) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.$size()
        } else {
        return nil
      };
    });

    self.$private("enumerator_size");

    Opal.defn(self, '$map', def.$collect);

    Opal.defn(self, '$max', TMP_22 = function() {
      var self = this, $iter = TMP_22.$$p, block = $iter || nil;

      TMP_22.$$p = null;
      
      var result;

      if (block !== nil) {
        self.$each.$$p = function() {
          var param = $scope.get('Opal').$destructure(arguments);

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
            self.$raise($scope.get('ArgumentError'), "comparison failed");
          }

          if (value > 0) {
            result = param;
          }
        };
      }
      else {
        self.$each.$$p = function() {
          var param = $scope.get('Opal').$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          if ($scope.get('Opal').$compare(param, result) > 0) {
            result = param;
          }
        };
      }

      self.$each();

      return result === undefined ? nil : result;
    
    });

    Opal.defn(self, '$max_by', TMP_23 = function() {
      var self = this, $iter = TMP_23.$$p, block = $iter || nil;

      TMP_23.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("max_by")
      };
      
      var result,
          by;

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
            value = Opal.yield1(block, param);

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
    
    });

    Opal.defn(self, '$member?', def['$include?']);

    Opal.defn(self, '$min', TMP_24 = function() {
      var self = this, $iter = TMP_24.$$p, block = $iter || nil;

      TMP_24.$$p = null;
      
      var result;

      if (block !== nil) {
        self.$each.$$p = function() {
          var param = $scope.get('Opal').$destructure(arguments);

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
            self.$raise($scope.get('ArgumentError'), "comparison failed");
          }

          if (value < 0) {
            result = param;
          }
        };
      }
      else {
        self.$each.$$p = function() {
          var param = $scope.get('Opal').$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          if ($scope.get('Opal').$compare(param, result) < 0) {
            result = param;
          }
        };
      }

      self.$each();

      return result === undefined ? nil : result;
    
    });

    Opal.defn(self, '$min_by', TMP_25 = function() {
      var self = this, $iter = TMP_25.$$p, block = $iter || nil;

      TMP_25.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("min_by")
      };
      
      var result,
          by;

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
            value = Opal.yield1(block, param);

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
    
    });

    Opal.defn(self, '$minmax', TMP_26 = function() {
      var self = this, $iter = TMP_26.$$p, block = $iter || nil;

      TMP_26.$$p = null;
      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$minmax_by', TMP_27 = function() {
      var self = this, $iter = TMP_27.$$p, block = $iter || nil;

      TMP_27.$$p = null;
      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$none?', TMP_28 = function() {
      var $a, self = this, $iter = TMP_28.$$p, block = $iter || nil;

      TMP_28.$$p = null;
      
      var result = true;

      if (block !== nil) {
        self.$each.$$p = function() {
          var value = Opal.yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
            result = false;
            return $breaker;
          }
        }
      }
      else {
        self.$each.$$p = function() {
          var value = $scope.get('Opal').$destructure(arguments);

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
            result = false;
            return $breaker;
          }
        };
      }

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$one?', TMP_29 = function() {
      var $a, self = this, $iter = TMP_29.$$p, block = $iter || nil;

      TMP_29.$$p = null;
      
      var result = false;

      if (block !== nil) {
        self.$each.$$p = function() {
          var value = Opal.yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
            if (result === true) {
              result = false;
              return $breaker;
            }

            result = true;
          }
        }
      }
      else {
        self.$each.$$p = function() {
          var value = $scope.get('Opal').$destructure(arguments);

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
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
    
    });

    Opal.defn(self, '$partition', TMP_30 = function() {
      var $a, self = this, $iter = TMP_30.$$p, block = $iter || nil;

      TMP_30.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("partition")
      };
      
      var truthy = [], falsy = [], result;

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
            value = Opal.yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
          truthy.push(param);
        }
        else {
          falsy.push(param);
        }
      };

      self.$each();

      return [truthy, falsy];
    
    });

    Opal.defn(self, '$reduce', def.$inject);

    Opal.defn(self, '$reject', TMP_31 = function() {
      var $a, self = this, $iter = TMP_31.$$p, block = $iter || nil;

      TMP_31.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reject")
      };
      
      var result = [];

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
            value = Opal.yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) === nil || ($a.$$is_boolean && $a == false))) {
          result.push(param);
        }
      };

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$reverse_each', TMP_32 = function() {
      var self = this, $iter = TMP_32.$$p, block = $iter || nil;

      TMP_32.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reverse_each")
      };
      
      var result = [];

      self.$each.$$p = function() {
        result.push(arguments);
      };

      self.$each();

      for (var i = result.length - 1; i >= 0; i--) {
        Opal.yieldX(block, result[i]);
      }

      return result;
    
    });

    Opal.defn(self, '$select', def.$find_all);

    Opal.defn(self, '$slice_before', TMP_33 = function(pattern) {
      var $a, $b, TMP_34, self = this, $iter = TMP_33.$$p, block = $iter || nil;

      TMP_33.$$p = null;
      if ((($a = pattern === undefined && block === nil || arguments.length > 1) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "wrong number of arguments (" + (arguments.length) + " for 1)")};
      return ($a = ($b = $scope.get('Enumerator')).$new, $a.$$p = (TMP_34 = function(e){var self = TMP_34.$$s || this, $a;
if (e == null) e = nil;
      
        var slice = [];

        if (block !== nil) {
          if (pattern === undefined) {
            self.$each.$$p = function() {
              var param = $scope.get('Opal').$destructure(arguments),
                  value = Opal.yield1(block, param);

              if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true)) && slice.length > 0) {
                e['$<<'](slice);
                slice = [];
              }

              slice.push(param);
            };
          }
          else {
            self.$each.$$p = function() {
              var param = $scope.get('Opal').$destructure(arguments),
                  value = block(param, pattern.$dup());

              if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true)) && slice.length > 0) {
                e['$<<'](slice);
                slice = [];
              }

              slice.push(param);
            };
          }
        }
        else {
          self.$each.$$p = function() {
            var param = $scope.get('Opal').$destructure(arguments),
                value = pattern['$==='](param);

            if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true)) && slice.length > 0) {
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
      ;}, TMP_34.$$s = self, TMP_34), $a).call($b);
    });

    Opal.defn(self, '$sort', TMP_35 = function() {
      var $a, $b, TMP_36, self = this, $iter = TMP_35.$$p, block = $iter || nil, ary = nil;

      TMP_35.$$p = null;
      ary = self.$to_a();
      if ((block !== nil)) {
        } else {
        block = ($a = ($b = self).$lambda, $a.$$p = (TMP_36 = function(a, b){var self = TMP_36.$$s || this;
if (a == null) a = nil;if (b == null) b = nil;
        return a['$<=>'](b)}, TMP_36.$$s = self, TMP_36), $a).call($b)
      };
      return ary.sort(block);
    });

    Opal.defn(self, '$sort_by', TMP_37 = function() {
      var $a, $b, TMP_38, $c, $d, TMP_39, $e, $f, TMP_40, self = this, $iter = TMP_37.$$p, block = $iter || nil;

      TMP_37.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("sort_by")
      };
      return ($a = ($b = ($c = ($d = ($e = ($f = self).$map, $e.$$p = (TMP_40 = function(){var self = TMP_40.$$s || this, arg = nil;

      arg = $scope.get('Opal').$destructure(arguments);
        return [block.$call(arg), arg];}, TMP_40.$$s = self, TMP_40), $e).call($f)).$sort, $c.$$p = (TMP_39 = function(a, b){var self = TMP_39.$$s || this;
if (a == null) a = nil;if (b == null) b = nil;
      return a['$[]'](0)['$<=>'](b['$[]'](0))}, TMP_39.$$s = self, TMP_39), $c).call($d)).$map, $a.$$p = (TMP_38 = function(arg){var self = TMP_38.$$s || this;
if (arg == null) arg = nil;
      return arg[1];}, TMP_38.$$s = self, TMP_38), $a).call($b);
    });

    Opal.defn(self, '$take', function(num) {
      var self = this;

      return self.$first(num);
    });

    Opal.defn(self, '$take_while', TMP_41 = function() {
      var $a, self = this, $iter = TMP_41.$$p, block = $iter || nil;

      TMP_41.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("take_while")
      };
      
      var result = [];

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
            value = Opal.yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) === nil || ($a.$$is_boolean && $a == false))) {
          return $breaker;
        }

        result.push(param);
      };

      self.$each();

      return result;
    
    });

    Opal.defn(self, '$to_a', def.$entries);

    Opal.defn(self, '$zip', TMP_42 = function(others) {
      var $a, self = this, $iter = TMP_42.$$p, block = $iter || nil;

      others = $slice.call(arguments, 0);
      TMP_42.$$p = null;
      return ($a = self.$to_a()).$zip.apply($a, [].concat(others));
    });
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/enumerator"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$require', '$include', '$allocate', '$new', '$to_proc', '$coerce_to', '$nil?', '$empty?', '$class', '$__send__', '$===', '$call', '$enum_for', '$destructure', '$inspect', '$[]', '$raise', '$yield', '$each', '$enumerator_size', '$respond_to?', '$try_convert', '$for']);
  self.$require("corelib/enumerable");
  return (function($base, $super) {
    function $Enumerator(){};
    var self = $Enumerator = $klass($base, $super, 'Enumerator', $Enumerator);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4;

    def.size = def.args = def.object = def.method = nil;
    self.$include($scope.get('Enumerable'));

    Opal.defs(self, '$for', TMP_1 = function(object, method, args) {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      args = $slice.call(arguments, 2);
      if (method == null) {
        method = "each"
      }
      TMP_1.$$p = null;
      
      var obj = self.$allocate();

      obj.object = object;
      obj.size   = block;
      obj.method = method;
      obj.args   = args;

      return obj;
    ;
    });

    def.$initialize = TMP_2 = function() {
      var $a, $b, self = this, $iter = TMP_2.$$p, block = $iter || nil;

      TMP_2.$$p = null;
      if (block !== false && block !== nil) {
        self.object = ($a = ($b = $scope.get('Generator')).$new, $a.$$p = block.$to_proc(), $a).call($b);
        self.method = "each";
        self.args = [];
        self.size = arguments[0] || nil;
        if ((($a = self.size) !== nil && (!$a.$$is_boolean || $a == true))) {
          return self.size = $scope.get('Opal').$coerce_to(self.size, $scope.get('Integer'), "to_int")
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
      var $a, $b, $c, self = this, $iter = TMP_3.$$p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_3.$$p = null;
      if ((($a = ($b = block['$nil?'](), $b !== false && $b !== nil ?args['$empty?']() : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self};
      args = $rb_plus(self.args, args);
      if ((($a = block['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        return ($a = self.$class()).$new.apply($a, [self.object, self.method].concat(args))};
      return ($b = ($c = self.object).$__send__, $b.$$p = block.$to_proc(), $b).apply($c, [self.method].concat(args));
    };

    def.$size = function() {
      var $a, self = this;

      if ((($a = $scope.get('Proc')['$==='](self.size)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return ($a = self.size).$call.apply($a, [].concat(self.args))
        } else {
        return self.size
      };
    };

    def.$with_index = TMP_4 = function(offset) {
      var self = this, $iter = TMP_4.$$p, block = $iter || nil;

      if (offset == null) {
        offset = 0
      }
      TMP_4.$$p = null;
      if (offset !== false && offset !== nil) {
        offset = $scope.get('Opal').$coerce_to(offset, $scope.get('Integer'), "to_int")
        } else {
        offset = 0
      };
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("with_index", offset)
      };
      
      var result, index = offset;

      self.$each.$$p = function() {
        var param = $scope.get('Opal').$destructure(arguments),
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

      return self.object;
    
    };

    Opal.defn(self, '$with_object', def.$each_with_object);

    def.$inspect = function() {
      var $a, self = this, result = nil;

      result = "#<" + (self.$class()) + ": " + (self.object.$inspect()) + ":" + (self.method);
      if ((($a = self.args['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        result = $rb_plus(result, "(" + (self.args.$inspect()['$[]']($scope.get('Range').$new(1, -2))) + ")")
      };
      return $rb_plus(result, ">");
    };

    (function($base, $super) {
      function $Generator(){};
      var self = $Generator = $klass($base, $super, 'Generator', $Generator);

      var def = self.$$proto, $scope = self.$$scope, TMP_5, TMP_6;

      def.block = nil;
      self.$include($scope.get('Enumerable'));

      def.$initialize = TMP_5 = function() {
        var self = this, $iter = TMP_5.$$p, block = $iter || nil;

        TMP_5.$$p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.get('LocalJumpError'), "no block given")
        };
        return self.block = block;
      };

      return (def.$each = TMP_6 = function(args) {
        var $a, $b, self = this, $iter = TMP_6.$$p, block = $iter || nil, yielder = nil;

        args = $slice.call(arguments, 0);
        TMP_6.$$p = null;
        yielder = ($a = ($b = $scope.get('Yielder')).$new, $a.$$p = block.$to_proc(), $a).call($b);
        
        try {
          args.unshift(yielder);

          if (Opal.yieldX(self.block, args) === $breaker) {
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

      var def = self.$$proto, $scope = self.$$scope, TMP_7;

      def.block = nil;
      def.$initialize = TMP_7 = function() {
        var self = this, $iter = TMP_7.$$p, block = $iter || nil;

        TMP_7.$$p = null;
        return self.block = block;
      };

      def.$yield = function(values) {
        var self = this;

        values = $slice.call(arguments, 0);
        
        var value = Opal.yieldX(self.block, values);

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

      var def = self.$$proto, $scope = self.$$scope, TMP_8, TMP_11, TMP_13, TMP_18, TMP_20, TMP_21, TMP_23, TMP_26, TMP_29;

      def.enumerator = nil;
      (function($base, $super) {
        function $StopLazyError(){};
        var self = $StopLazyError = $klass($base, $super, 'StopLazyError', $StopLazyError);

        var def = self.$$proto, $scope = self.$$scope;

        return nil;
      })(self, $scope.get('Exception'));

      def.$initialize = TMP_8 = function(object, size) {
        var TMP_9, self = this, $iter = TMP_8.$$p, block = $iter || nil;

        if (size == null) {
          size = nil
        }
        TMP_8.$$p = null;
        if ((block !== nil)) {
          } else {
          self.$raise($scope.get('ArgumentError'), "tried to call lazy new without a block")
        };
        self.enumerator = object;
        return Opal.find_super_dispatcher(self, 'initialize', TMP_8, (TMP_9 = function(yielder, each_args){var self = TMP_9.$$s || this, $a, $b, TMP_10;
if (yielder == null) yielder = nil;each_args = $slice.call(arguments, 1);
        try {
          return ($a = ($b = object).$each, $a.$$p = (TMP_10 = function(args){var self = TMP_10.$$s || this;
args = $slice.call(arguments, 0);
            
              args.unshift(yielder);

              if (Opal.yieldX(block, args) === $breaker) {
                return $breaker;
              }
            ;}, TMP_10.$$s = self, TMP_10), $a).apply($b, [].concat(each_args))
          } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {
            return nil
            }else { throw $err; }
          }}, TMP_9.$$s = self, TMP_9)).apply(self, [size]);
      };

      Opal.defn(self, '$force', def.$to_a);

      def.$lazy = function() {
        var self = this;

        return self;
      };

      def.$collect = TMP_11 = function() {
        var $a, $b, TMP_12, self = this, $iter = TMP_11.$$p, block = $iter || nil;

        TMP_11.$$p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.get('ArgumentError'), "tried to call lazy map without a block")
        };
        return ($a = ($b = $scope.get('Lazy')).$new, $a.$$p = (TMP_12 = function(enum$, args){var self = TMP_12.$$s || this;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = Opal.yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          enum$.$yield(value);
        }, TMP_12.$$s = self, TMP_12), $a).call($b, self, self.$enumerator_size());
      };

      def.$collect_concat = TMP_13 = function() {
        var $a, $b, TMP_14, self = this, $iter = TMP_13.$$p, block = $iter || nil;

        TMP_13.$$p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.get('ArgumentError'), "tried to call lazy map without a block")
        };
        return ($a = ($b = $scope.get('Lazy')).$new, $a.$$p = (TMP_14 = function(enum$, args){var self = TMP_14.$$s || this, $a, $b, TMP_15, $c, TMP_16;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = Opal.yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((value)['$respond_to?']("force") && (value)['$respond_to?']("each")) {
            ($a = ($b = (value)).$each, $a.$$p = (TMP_15 = function(v){var self = TMP_15.$$s || this;
if (v == null) v = nil;
          return enum$.$yield(v)}, TMP_15.$$s = self, TMP_15), $a).call($b)
          }
          else {
            var array = $scope.get('Opal').$try_convert(value, $scope.get('Array'), "to_ary");

            if (array === nil) {
              enum$.$yield(value);
            }
            else {
              ($a = ($c = (value)).$each, $a.$$p = (TMP_16 = function(v){var self = TMP_16.$$s || this;
if (v == null) v = nil;
          return enum$.$yield(v)}, TMP_16.$$s = self, TMP_16), $a).call($c);
            }
          }
        ;}, TMP_14.$$s = self, TMP_14), $a).call($b, self, nil);
      };

      def.$drop = function(n) {
        var $a, $b, TMP_17, self = this, current_size = nil, set_size = nil, dropped = nil;

        n = $scope.get('Opal').$coerce_to(n, $scope.get('Integer'), "to_int");
        if ($rb_lt(n, 0)) {
          self.$raise($scope.get('ArgumentError'), "attempt to drop negative size")};
        current_size = self.$enumerator_size();
        set_size = (function() {if ((($a = $scope.get('Integer')['$==='](current_size)) !== nil && (!$a.$$is_boolean || $a == true))) {
          if ($rb_lt(n, current_size)) {
            return n
            } else {
            return current_size
          }
          } else {
          return current_size
        }; return nil; })();
        dropped = 0;
        return ($a = ($b = $scope.get('Lazy')).$new, $a.$$p = (TMP_17 = function(enum$, args){var self = TMP_17.$$s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        if ($rb_lt(dropped, n)) {
            return dropped = $rb_plus(dropped, 1)
            } else {
            return ($a = enum$).$yield.apply($a, [].concat(args))
          }}, TMP_17.$$s = self, TMP_17), $a).call($b, self, set_size);
      };

      def.$drop_while = TMP_18 = function() {
        var $a, $b, TMP_19, self = this, $iter = TMP_18.$$p, block = $iter || nil, succeeding = nil;

        TMP_18.$$p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.get('ArgumentError'), "tried to call lazy drop_while without a block")
        };
        succeeding = true;
        return ($a = ($b = $scope.get('Lazy')).$new, $a.$$p = (TMP_19 = function(enum$, args){var self = TMP_19.$$s || this, $a, $b;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        if (succeeding !== false && succeeding !== nil) {
            
            var value = Opal.yieldX(block, args);

            if (value === $breaker) {
              return $breaker;
            }

            if ((($a = value) === nil || ($a.$$is_boolean && $a == false))) {
              succeeding = false;

              ($a = enum$).$yield.apply($a, [].concat(args));
            }
          
            } else {
            return ($b = enum$).$yield.apply($b, [].concat(args))
          }}, TMP_19.$$s = self, TMP_19), $a).call($b, self, nil);
      };

      def.$enum_for = TMP_20 = function(method, args) {
        var $a, $b, self = this, $iter = TMP_20.$$p, block = $iter || nil;

        args = $slice.call(arguments, 1);
        if (method == null) {
          method = "each"
        }
        TMP_20.$$p = null;
        return ($a = ($b = self.$class()).$for, $a.$$p = block.$to_proc(), $a).apply($b, [self, method].concat(args));
      };

      def.$find_all = TMP_21 = function() {
        var $a, $b, TMP_22, self = this, $iter = TMP_21.$$p, block = $iter || nil;

        TMP_21.$$p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.get('ArgumentError'), "tried to call lazy select without a block")
        };
        return ($a = ($b = $scope.get('Lazy')).$new, $a.$$p = (TMP_22 = function(enum$, args){var self = TMP_22.$$s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = Opal.yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
            ($a = enum$).$yield.apply($a, [].concat(args));
          }
        ;}, TMP_22.$$s = self, TMP_22), $a).call($b, self, nil);
      };

      Opal.defn(self, '$flat_map', def.$collect_concat);

      def.$grep = TMP_23 = function(pattern) {
        var $a, $b, TMP_24, $c, TMP_25, self = this, $iter = TMP_23.$$p, block = $iter || nil;

        TMP_23.$$p = null;
        if (block !== false && block !== nil) {
          return ($a = ($b = $scope.get('Lazy')).$new, $a.$$p = (TMP_24 = function(enum$, args){var self = TMP_24.$$s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
          
            var param = $scope.get('Opal').$destructure(args),
                value = pattern['$==='](param);

            if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
              value = Opal.yield1(block, param);

              if (value === $breaker) {
                return $breaker;
              }

              enum$.$yield(Opal.yield1(block, param));
            }
          ;}, TMP_24.$$s = self, TMP_24), $a).call($b, self, nil)
          } else {
          return ($a = ($c = $scope.get('Lazy')).$new, $a.$$p = (TMP_25 = function(enum$, args){var self = TMP_25.$$s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
          
            var param = $scope.get('Opal').$destructure(args),
                value = pattern['$==='](param);

            if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
              enum$.$yield(param);
            }
          ;}, TMP_25.$$s = self, TMP_25), $a).call($c, self, nil)
        };
      };

      Opal.defn(self, '$map', def.$collect);

      Opal.defn(self, '$select', def.$find_all);

      def.$reject = TMP_26 = function() {
        var $a, $b, TMP_27, self = this, $iter = TMP_26.$$p, block = $iter || nil;

        TMP_26.$$p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.get('ArgumentError'), "tried to call lazy reject without a block")
        };
        return ($a = ($b = $scope.get('Lazy')).$new, $a.$$p = (TMP_27 = function(enum$, args){var self = TMP_27.$$s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = Opal.yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((($a = value) === nil || ($a.$$is_boolean && $a == false))) {
            ($a = enum$).$yield.apply($a, [].concat(args));
          }
        ;}, TMP_27.$$s = self, TMP_27), $a).call($b, self, nil);
      };

      def.$take = function(n) {
        var $a, $b, TMP_28, self = this, current_size = nil, set_size = nil, taken = nil;

        n = $scope.get('Opal').$coerce_to(n, $scope.get('Integer'), "to_int");
        if ($rb_lt(n, 0)) {
          self.$raise($scope.get('ArgumentError'), "attempt to take negative size")};
        current_size = self.$enumerator_size();
        set_size = (function() {if ((($a = $scope.get('Integer')['$==='](current_size)) !== nil && (!$a.$$is_boolean || $a == true))) {
          if ($rb_lt(n, current_size)) {
            return n
            } else {
            return current_size
          }
          } else {
          return current_size
        }; return nil; })();
        taken = 0;
        return ($a = ($b = $scope.get('Lazy')).$new, $a.$$p = (TMP_28 = function(enum$, args){var self = TMP_28.$$s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        if ($rb_lt(taken, n)) {
            ($a = enum$).$yield.apply($a, [].concat(args));
            return taken = $rb_plus(taken, 1);
            } else {
            return self.$raise($scope.get('StopLazyError'))
          }}, TMP_28.$$s = self, TMP_28), $a).call($b, self, set_size);
      };

      def.$take_while = TMP_29 = function() {
        var $a, $b, TMP_30, self = this, $iter = TMP_29.$$p, block = $iter || nil;

        TMP_29.$$p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.get('ArgumentError'), "tried to call lazy take_while without a block")
        };
        return ($a = ($b = $scope.get('Lazy')).$new, $a.$$p = (TMP_30 = function(enum$, args){var self = TMP_30.$$s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = Opal.yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a.$$is_boolean || $a == true))) {
            ($a = enum$).$yield.apply($a, [].concat(args));
          }
          else {
            self.$raise($scope.get('StopLazyError'));
          }
        ;}, TMP_30.$$s = self, TMP_30), $a).call($b, self, nil);
      };

      Opal.defn(self, '$to_enum', def.$enum_for);

      return (def.$inspect = function() {
        var self = this;

        return "#<" + (self.$class()) + ": " + (self.enumerator.$inspect()) + ">";
      }, nil) && 'inspect';
    })(self, self);
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/array"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $gvars = Opal.gvars, $range = Opal.range, $hash2 = Opal.hash2;

  Opal.add_stubs(['$require', '$include', '$new', '$class', '$raise', '$===', '$to_a', '$respond_to?', '$to_ary', '$coerce_to', '$coerce_to?', '$==', '$to_str', '$clone', '$hash', '$<=>', '$object_id', '$inspect', '$enum_for', '$empty?', '$nil?', '$coerce_to!', '$initialize_clone', '$initialize_dup', '$replace', '$eql?', '$length', '$begin', '$end', '$exclude_end?', '$flatten', '$__id__', '$[]', '$to_s', '$join', '$delete_if', '$to_proc', '$each', '$reverse', '$frozen?', '$rotate', '$!', '$map', '$rand', '$keep_if', '$shuffle!', '$sort', '$times', '$[]=', '$<<', '$at', '$kind_of?', '$last', '$first', '$upto']);
  self.$require("corelib/enumerable");
  return (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_8, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13, TMP_14, TMP_15, TMP_16, TMP_17, TMP_18, TMP_19, TMP_21, TMP_22, TMP_23, TMP_24, TMP_25, TMP_30;

    def.length = nil;
    self.$include($scope.get('Enumerable'));

    def.$$is_array = true;

    Opal.defs(self, '$[]', function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      return objects;
    });

    def.$initialize = function(args) {
      var $a, self = this;

      args = $slice.call(arguments, 0);
      return ($a = self.$class()).$new.apply($a, [].concat(args));
    };

    Opal.defs(self, '$new', TMP_1 = function(size, obj) {
      var $a, self = this, $iter = TMP_1.$$p, block = $iter || nil;

      if (size == null) {
        size = nil
      }
      if (obj == null) {
        obj = nil
      }
      TMP_1.$$p = null;
      if ((($a = arguments.length > 2) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "wrong number of arguments (" + (arguments.length) + " for 0..2)")};
      if ((($a = arguments.length === 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        return []};
      if ((($a = arguments.length === 1) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ((($a = $scope.get('Array')['$==='](size)) !== nil && (!$a.$$is_boolean || $a == true))) {
          return size.$to_a()
        } else if ((($a = size['$respond_to?']("to_ary")) !== nil && (!$a.$$is_boolean || $a == true))) {
          return size.$to_ary()}};
      size = $scope.get('Opal').$coerce_to(size, $scope.get('Integer'), "to_int");
      if ((($a = size < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "negative array size")};
      
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

    Opal.defs(self, '$try_convert', function(obj) {
      var self = this;

      return $scope.get('Opal')['$coerce_to?'](obj, $scope.get('Array'), "to_ary");
    });

    def['$&'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.get('Array')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.get('Opal').$coerce_to(other, $scope.get('Array'), "to_ary").$to_a()
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

    def['$|'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.get('Array')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.get('Opal').$coerce_to(other, $scope.get('Array'), "to_ary").$to_a()
      };
      
      var result = [],
          seen   = {};

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if (!seen[item]) {
          seen[item] = true;
          result.push(item);
        }
      }

      for (var i = 0, length = other.length; i < length; i++) {
        var item = other[i];

        if (!seen[item]) {
          seen[item] = true;
          result.push(item);
        }
      }
      return result;
    
    };

    def['$*'] = function(other) {
      var $a, self = this;

      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.join(other.$to_str())};
      if ((($a = other['$respond_to?']("to_int")) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('TypeError'), "no implicit conversion of " + (other.$class()) + " into Integer")
      };
      other = $scope.get('Opal').$coerce_to(other, $scope.get('Integer'), "to_int");
      if ((($a = other < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "negative argument")};
      
      var result = [];

      for (var i = 0; i < other; i++) {
        result = result.concat(self);
      }

      return result;
    
    };

    def['$+'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.get('Array')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.get('Opal').$coerce_to(other, $scope.get('Array'), "to_ary").$to_a()
      };
      return self.concat(other);
    };

    def['$-'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.get('Array')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.get('Opal').$coerce_to(other, $scope.get('Array'), "to_ary").$to_a()
      };
      if ((($a = self.length === 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        return []};
      if ((($a = other.length === 0) !== nil && (!$a.$$is_boolean || $a == true))) {
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
      var $a, self = this;

      if ((($a = $scope.get('Array')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        other = other.$to_a()
      } else if ((($a = other['$respond_to?']("to_ary")) !== nil && (!$a.$$is_boolean || $a == true))) {
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
      var self = this;

      
      var recursed = {};

      function _eqeq(array, other) {
        var i, length, a, b;

        if (!other.$$is_array) {
          if ($scope.get('Opal')['$respond_to?'](other, "to_ary")) {
            return (other)['$=='](array);
          } else {
            return false;
          }
        }

        other = other.$to_a();

        if (array.length !== other.length) {
          return false;
        }

        recursed[(array).$object_id()] = true;

        for (i = 0, length = array.length; i < length; i++) {
          a = array[i];
          b = other[i];
          if (a.$$is_array) {
            if (b.$$is_array && b.length !== a.length) {
              return false;
            }
            if (!recursed.hasOwnProperty((a).$object_id())) {
              if (!_eqeq(a, b)) {
                return false;
              }
            }
          } else {
            if (!(a)['$=='](b)) {
              return false;
            }
          }
        }

        return true;
      }

      return _eqeq(self, other);
    ;
    };

    def['$[]'] = function(index, length) {
      var $a, self = this;

      if ((($a = $scope.get('Range')['$==='](index)) !== nil && (!$a.$$is_boolean || $a == true))) {
        
        var size    = self.length,
            exclude = index.exclude,
            from    = $scope.get('Opal').$coerce_to(index.begin, $scope.get('Integer'), "to_int"),
            to      = $scope.get('Opal').$coerce_to(index.end, $scope.get('Integer'), "to_int");

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
        index = $scope.get('Opal').$coerce_to(index, $scope.get('Integer'), "to_int");
        
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
          length = $scope.get('Opal').$coerce_to(length, $scope.get('Integer'), "to_int");

          if (length < 0 || index > size || index < 0) {
            return nil;
          }

          return self.slice(index, index + length);
        }
      
      };
    };

    def['$[]='] = function(index, value, extra) {
      var $a, self = this, data = nil, length = nil;

      if ((($a = $scope.get('Range')['$==='](index)) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ((($a = $scope.get('Array')['$==='](value)) !== nil && (!$a.$$is_boolean || $a == true))) {
          data = value.$to_a()
        } else if ((($a = value['$respond_to?']("to_ary")) !== nil && (!$a.$$is_boolean || $a == true))) {
          data = value.$to_ary().$to_a()
          } else {
          data = [value]
        };
        
        var size    = self.length,
            exclude = index.exclude,
            from    = $scope.get('Opal').$coerce_to(index.begin, $scope.get('Integer'), "to_int"),
            to      = $scope.get('Opal').$coerce_to(index.end, $scope.get('Integer'), "to_int");

        if (from < 0) {
          from += size;

          if (from < 0) {
            self.$raise($scope.get('RangeError'), "" + (index.$inspect()) + " out of range");
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
        if ((($a = extra === undefined) !== nil && (!$a.$$is_boolean || $a == true))) {
          length = 1
          } else {
          length = value;
          value = extra;
          if ((($a = $scope.get('Array')['$==='](value)) !== nil && (!$a.$$is_boolean || $a == true))) {
            data = value.$to_a()
          } else if ((($a = value['$respond_to?']("to_ary")) !== nil && (!$a.$$is_boolean || $a == true))) {
            data = value.$to_ary().$to_a()
            } else {
            data = [value]
          };
        };
        
        var size   = self.length,
            index  = $scope.get('Opal').$coerce_to(index, $scope.get('Integer'), "to_int"),
            length = $scope.get('Opal').$coerce_to(length, $scope.get('Integer'), "to_int"),
            old;

        if (index < 0) {
          old    = index;
          index += size;

          if (index < 0) {
            self.$raise($scope.get('IndexError'), "index " + (old) + " too small for array; minimum " + (-self.length));
          }
        }

        if (length < 0) {
          self.$raise($scope.get('IndexError'), "negative length (" + (length) + ")")
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
      var self = this;

      index = $scope.get('Opal').$coerce_to(index, $scope.get('Integer'), "to_int");
      
      if (index < 0) {
        index += self.length;
      }

      if (index < 0 || index >= self.length) {
        return nil;
      }

      return self[index];
    
    };

    def.$bsearch = TMP_2 = function() {
      var self = this, $iter = TMP_2.$$p, block = $iter || nil;

      TMP_2.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("bsearch")
      };
      
      var min = 0,
          max = self.length,
          mid,
          val,
          ret,
          smaller = false,
          satisfied = nil;

      while (min < max) {
        mid = min + Math.floor((max - min) / 2);
        val = self[mid];
        ret = block(val);

        if (ret === $breaker) {
          return $breaker.$v;
        }
        else if (ret === true) {
          satisfied = val;
          smaller = true;
        }
        else if (ret === false || ret === nil) {
          smaller = false;
        }
        else if (ret.$$is_number) {
          if (ret === 0) { return val; }
          smaller = (ret < 0);
        }
        else {
          self.$raise($scope.get('TypeError'), "wrong argument type " + ((ret).$class()) + " (must be numeric, true, false or nil)")
        }

        if (smaller) { max = mid; } else { min = mid + 1; }
      }

      return satisfied;
    
    };

    def.$cycle = TMP_3 = function(n) {
      var $a, $b, self = this, $iter = TMP_3.$$p, block = $iter || nil;

      if (n == null) {
        n = nil
      }
      TMP_3.$$p = null;
      if ((($a = ((($b = self['$empty?']()) !== false && $b !== nil) ? $b : n['$=='](0))) !== nil && (!$a.$$is_boolean || $a == true))) {
        return nil};
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("cycle", n)
      };
      if ((($a = n['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        
        while (true) {
          for (var i = 0, length = self.length; i < length; i++) {
            var value = Opal.yield1(block, self[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }
        }
      
        } else {
        n = $scope.get('Opal')['$coerce_to!'](n, $scope.get('Integer'), "to_int");
        
        if (n <= 0) {
          return self;
        }

        while (n > 0) {
          for (var i = 0, length = self.length; i < length; i++) {
            var value = Opal.yield1(block, self[i]);

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

    def.$collect = TMP_4 = function() {
      var self = this, $iter = TMP_4.$$p, block = $iter || nil;

      TMP_4.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect")
      };
      
      var result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        var value = Opal.yield1(block, self[i]);

        if (value === $breaker) {
          return $breaker.$v;
        }

        result.push(value);
      }

      return result;
    
    };

    def['$collect!'] = TMP_5 = function() {
      var self = this, $iter = TMP_5.$$p, block = $iter || nil;

      TMP_5.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect!")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var value = Opal.yield1(block, self[i]);

        if (value === $breaker) {
          return $breaker.$v;
        }

        self[i] = value;
      }
    
      return self;
    };

    def.$combination = TMP_6 = function(n) {
      var $a, self = this, $iter = TMP_6.$$p, $yield = $iter || nil, num = nil;

      TMP_6.$$p = null;
      num = $scope.get('Opal')['$coerce_to!'](n, $scope.get('Integer'), "to_int");
      if (($yield !== nil)) {
        } else {
        return self.$enum_for("combination", num)
      };
      
      var i, length, stack, chosen, lev, done, next;

      if (num === 0) {
        ((($a = Opal.yield1($yield, [])) === $breaker) ? $breaker.$v : $a)
      } else if (num === 1) {
        for (i = 0, length = self.length; i < length; i++) {
          ((($a = Opal.yield1($yield, [self[i]])) === $breaker) ? $breaker.$v : $a)
        }
      }
      else if (num === self.length) {
        ((($a = Opal.yield1($yield, self.slice())) === $breaker) ? $breaker.$v : $a)
      }
      else if (num >= 0 && num < self.length) {
        stack = [];
        for (i = 0; i <= num + 1; i++) {
          stack.push(0);
        }

        chosen = [];
        lev = 0;
        done = false;
        stack[0] = -1;

        while (!done) {
          chosen[lev] = self[stack[lev+1]];
          while (lev < num - 1) {
            lev++;
            next = stack[lev+1] = stack[lev] + 1;
            chosen[lev] = self[next];
          }
          ((($a = Opal.yield1($yield, chosen.slice())) === $breaker) ? $breaker.$v : $a)
          lev++;
          do {
            done = (lev === 0);
            stack[lev]++;
            lev--;
          } while ( stack[lev+1] + num === self.length + lev + 1 );
        }
      }
    ;
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
      var $a, self = this;

      if ((($a = $scope.get('Array')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.get('Opal').$coerce_to(other, $scope.get('Array'), "to_ary").$to_a()
      };
      
      for (var i = 0, length = other.length; i < length; i++) {
        self.push(other[i]);
      }
    
      return self;
    };

    def.$delete = TMP_7 = function(object) {
      var $a, self = this, $iter = TMP_7.$$p, $yield = $iter || nil;

      TMP_7.$$p = null;
      
      var original = self.length;

      for (var i = 0, length = original; i < length; i++) {
        if ((self[i])['$=='](object)) {
          self.splice(i, 1);

          length--;
          i--;
        }
      }

      if (self.length === original) {
        if (($yield !== nil)) {
          return ((($a = Opal.yieldX($yield, [])) === $breaker) ? $breaker.$v : $a);
        }
        return nil;
      }
      return object;
    ;
    };

    def.$delete_at = function(index) {
      var self = this;

      
      index = $scope.get('Opal').$coerce_to(index, $scope.get('Integer'), "to_int");

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

    def.$delete_if = TMP_8 = function() {
      var self = this, $iter = TMP_8.$$p, block = $iter || nil;

      TMP_8.$$p = null;
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
      var self = this;

      
      if (number < 0) {
        self.$raise($scope.get('ArgumentError'))
      }

      return self.slice(number);
    ;
    };

    Opal.defn(self, '$dup', def.$clone);

    def.$each = TMP_9 = function() {
      var self = this, $iter = TMP_9.$$p, block = $iter || nil;

      TMP_9.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var value = Opal.yield1(block, self[i]);

        if (value == $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def.$each_index = TMP_10 = function() {
      var self = this, $iter = TMP_10.$$p, block = $iter || nil;

      TMP_10.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_index")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var value = Opal.yield1(block, i);

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
      var self = this;

      
      var recursed = {};

      function _eql(array, other) {
        var i, length, a, b;

        if (!other.$$is_array) {
          return false;
        }

        other = other.$to_a();

        if (array.length !== other.length) {
          return false;
        }

        recursed[(array).$object_id()] = true;

        for (i = 0, length = array.length; i < length; i++) {
          a = array[i];
          b = other[i];
          if (a.$$is_array) {
            if (b.$$is_array && b.length !== a.length) {
              return false;
            }
            if (!recursed.hasOwnProperty((a).$object_id())) {
              if (!_eql(a, b)) {
                return false;
              }
            }
          } else {
            if (!(a)['$eql?'](b)) {
              return false;
            }
          }
        }

        return true;
      }

      return _eql(self, other);
    
    };

    def.$fetch = TMP_11 = function(index, defaults) {
      var self = this, $iter = TMP_11.$$p, block = $iter || nil;

      TMP_11.$$p = null;
      
      var original = index;

      index = $scope.get('Opal').$coerce_to(index, $scope.get('Integer'), "to_int");

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
        self.$raise($scope.get('IndexError'), "index " + (original) + " outside of array bounds: 0...0")
      }
      else {
        self.$raise($scope.get('IndexError'), "index " + (original) + " outside of array bounds: -" + (self.length) + "..." + (self.length));
      }
    ;
    };

    def.$fill = TMP_12 = function(args) {
      var $a, self = this, $iter = TMP_12.$$p, block = $iter || nil, one = nil, two = nil, obj = nil, left = nil, right = nil;

      args = $slice.call(arguments, 0);
      TMP_12.$$p = null;
      if (block !== false && block !== nil) {
        if ((($a = args.length > 2) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.$raise($scope.get('ArgumentError'), "wrong number of arguments (" + (args.$length()) + " for 0..2)")};
        $a = Opal.to_ary(args), one = ($a[0] == null ? nil : $a[0]), two = ($a[1] == null ? nil : $a[1]);
        } else {
        if ((($a = args.length == 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.$raise($scope.get('ArgumentError'), "wrong number of arguments (0 for 1..3)")
        } else if ((($a = args.length > 3) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.$raise($scope.get('ArgumentError'), "wrong number of arguments (" + (args.$length()) + " for 1..3)")};
        $a = Opal.to_ary(args), obj = ($a[0] == null ? nil : $a[0]), one = ($a[1] == null ? nil : $a[1]), two = ($a[2] == null ? nil : $a[2]);
      };
      if ((($a = $scope.get('Range')['$==='](one)) !== nil && (!$a.$$is_boolean || $a == true))) {
        if (two !== false && two !== nil) {
          self.$raise($scope.get('TypeError'), "length invalid with range")};
        left = $scope.get('Opal').$coerce_to(one.$begin(), $scope.get('Integer'), "to_int");
        if ((($a = left < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          left += self.length;};
        if ((($a = left < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.$raise($scope.get('RangeError'), "" + (one.$inspect()) + " out of range")};
        right = $scope.get('Opal').$coerce_to(one.$end(), $scope.get('Integer'), "to_int");
        if ((($a = right < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          right += self.length;};
        if ((($a = one['$exclude_end?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          right += 1;
        };
        if ((($a = right <= left) !== nil && (!$a.$$is_boolean || $a == true))) {
          return self};
      } else if (one !== false && one !== nil) {
        left = $scope.get('Opal').$coerce_to(one, $scope.get('Integer'), "to_int");
        if ((($a = left < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          left += self.length;};
        if ((($a = left < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          left = 0};
        if (two !== false && two !== nil) {
          right = $scope.get('Opal').$coerce_to(two, $scope.get('Integer'), "to_int");
          if ((($a = right == 0) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self};
          right += left;
          } else {
          right = self.length
        };
        } else {
        left = 0;
        right = self.length;
      };
      if ((($a = left > self.length) !== nil && (!$a.$$is_boolean || $a == true))) {
        
        for (var i = self.length; i < right; i++) {
          self[i] = nil;
        }
      ;};
      if ((($a = right > self.length) !== nil && (!$a.$$is_boolean || $a == true))) {
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
      var self = this;

      
      if (count == null) {
        return self.length === 0 ? nil : self[0];
      }

      count = $scope.get('Opal').$coerce_to(count, $scope.get('Integer'), "to_int");

      if (count < 0) {
        self.$raise($scope.get('ArgumentError'), "negative array size");
      }

      return self.slice(0, count);
    
    };

    def.$flatten = function(level) {
      var self = this;

      
      var object_id = (self).$object_id();

      function _flatten(array, level) {
        var array = (array).$to_a(),
            result = [],
            i, length,
            item, ary;

        for (i = 0, length = array.length; i < length; i++) {
          item = array[i];

          if (!$scope.get('Opal')['$respond_to?'](item, "to_ary")) {
            result.push(item);
            continue;
          }

          ary = (item).$to_ary();

          if (ary === nil) {
            result.push(item);
            continue;
          }

          if (!ary.$$is_array) {
            self.$raise($scope.get('TypeError'));
          }

          if (object_id === (ary).$object_id()) {
            self.$raise($scope.get('ArgumentError'));
          }

          switch (level) {
          case undefined:
            result.push.apply(result, _flatten(ary));
            break;
          case 0:
            result.push(ary);
            break;
          default:
            result.push.apply(result, _flatten(ary, level - 1));
          }
        }
        return result;
      }

      if (level !== undefined) {
        level = $scope.get('Opal').$coerce_to(level, $scope.get('Integer'), "to_int");
      }

      return _flatten(self, level);
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

      
      var hash = ['A'],
          item;
      for (var i = 0, length = self.length; i < length; i++) {
        item = self[i];
        if (item.$$is_array && (self)['$eql?'](item)) {
          hash.push('self');
        } else {
          hash.push(item.$hash());
        }
      }
      return hash.join(',');
    
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

    def.$index = TMP_13 = function(object) {
      var self = this, $iter = TMP_13.$$p, block = $iter || nil;

      TMP_13.$$p = null;
      
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
      var self = this;

      objects = $slice.call(arguments, 1);
      
      index = $scope.get('Opal').$coerce_to(index, $scope.get('Integer'), "to_int");

      if (objects.length > 0) {
        if (index < 0) {
          index += self.length + 1;

          if (index < 0) {
            self.$raise($scope.get('IndexError'), "" + (index) + " is out of bounds");
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

      
      var result = [],
          id     = self.$__id__();

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self['$[]'](i);

        if ((item).$__id__() === id) {
          result.push('[...]');
        }
        else {
          result.push((item).$inspect());
        }
      }

      return '[' + result.join(', ') + ']';
    ;
    };

    def.$join = function(sep) {
      var $a, self = this;
      if ($gvars[","] == null) $gvars[","] = nil;

      if (sep == null) {
        sep = nil
      }
      if ((($a = self.length === 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        return ""};
      if ((($a = sep === nil) !== nil && (!$a.$$is_boolean || $a == true))) {
        sep = $gvars[","]};
      
      var result = [];
      var object_id = (self).$object_id();

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if ($scope.get('Opal')['$respond_to?'](item, "to_str")) {
          var tmp = (item).$to_str();

          if (tmp !== nil) {
            result.push((tmp).$to_s());

            continue;
          }
        }

        if ($scope.get('Opal')['$respond_to?'](item, "to_ary")) {
          var tmp = (item).$to_ary();

          if (object_id === (tmp).$object_id()) {
            self.$raise($scope.get('ArgumentError'));
          }

          if (tmp !== nil) {
            result.push((tmp).$join(sep));

            continue;
          }
        }

        if ($scope.get('Opal')['$respond_to?'](item, "to_s")) {
          var tmp = (item).$to_s();

          if (tmp !== nil) {
            result.push(tmp);

            continue;
          }
        }

        self.$raise($scope.get('NoMethodError'), "" + ($scope.get('Opal').$inspect(item)) + " doesn't respond to #to_str, #to_ary or #to_s");
      }

      if (sep === nil) {
        return result.join('');
      }
      else {
        return result.join($scope.get('Opal')['$coerce_to!'](sep, $scope.get('String'), "to_str").$to_s());
      }
    ;
    };

    def.$keep_if = TMP_14 = function() {
      var self = this, $iter = TMP_14.$$p, block = $iter || nil;

      TMP_14.$$p = null;
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
      var self = this;

      
      if (count == null) {
        return self.length === 0 ? nil : self[self.length - 1];
      }

      count = $scope.get('Opal').$coerce_to(count, $scope.get('Integer'), "to_int");

      if (count < 0) {
        self.$raise($scope.get('ArgumentError'), "negative array size");
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

    Opal.defn(self, '$map', def.$collect);

    Opal.defn(self, '$map!', def['$collect!']);

    def.$pop = function(count) {
      var $a, self = this;

      if ((($a = count === undefined) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ((($a = self.length === 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          return nil};
        return self.pop();};
      count = $scope.get('Opal').$coerce_to(count, $scope.get('Integer'), "to_int");
      if ((($a = count < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "negative array size")};
      if ((($a = self.length === 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        return []};
      if ((($a = count > self.length) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.splice(0, self.length);
        } else {
        return self.splice(self.length - count, self.length);
      };
    };

    def.$product = TMP_15 = function(args) {
      var $a, self = this, $iter = TMP_15.$$p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_15.$$p = null;
      
      var result = (block !== nil) ? null : [],
          n = args.length + 1,
          counters = new Array(n),
          lengths  = new Array(n),
          arrays   = new Array(n),
          i, m, subarray, len, resultlen = 1;

      arrays[0] = self;
      for (i = 1; i < n; i++) {
        arrays[i] = $scope.get('Opal').$coerce_to(args[i - 1], $scope.get('Array'), "to_ary");
      }

      for (i = 0; i < n; i++) {
        len = arrays[i].length;
        if (len === 0) {
          return result || self;
        }
        resultlen *= len;
        if (resultlen > 2147483647) {
          self.$raise($scope.get('RangeError'), "too big to product")
        }
        lengths[i] = len;
        counters[i] = 0;
      }

      outer_loop: for (;;) {
        subarray = [];
        for (i = 0; i < n; i++) {
          subarray.push(arrays[i][counters[i]]);
        }
        if (result) {
          result.push(subarray);
        } else {
          ((($a = Opal.yield1(block, subarray)) === $breaker) ? $breaker.$v : $a)
        }
        m = n - 1;
        counters[m]++;
        while (counters[m] === lengths[m]) {
          counters[m] = 0;
          if (--m < 0) break outer_loop;
          counters[m]++;
        }
      }

      return result || self;
    ;
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

    def.$reject = TMP_16 = function() {
      var self = this, $iter = TMP_16.$$p, block = $iter || nil;

      TMP_16.$$p = null;
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

    def['$reject!'] = TMP_17 = function() {
      var $a, $b, self = this, $iter = TMP_17.$$p, block = $iter || nil, original = nil;

      TMP_17.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reject!")
      };
      original = self.$length();
      ($a = ($b = self).$delete_if, $a.$$p = block.$to_proc(), $a).call($b);
      if (self.$length()['$=='](original)) {
        return nil
        } else {
        return self
      };
    };

    def.$replace = function(other) {
      var $a, self = this;

      if ((($a = $scope.get('Array')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.get('Opal').$coerce_to(other, $scope.get('Array'), "to_ary").$to_a()
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

    def.$reverse_each = TMP_18 = function() {
      var $a, $b, self = this, $iter = TMP_18.$$p, block = $iter || nil;

      TMP_18.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reverse_each")
      };
      ($a = ($b = self.$reverse()).$each, $a.$$p = block.$to_proc(), $a).call($b);
      return self;
    };

    def.$rindex = TMP_19 = function(object) {
      var self = this, $iter = TMP_19.$$p, block = $iter || nil;

      TMP_19.$$p = null;
      
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

    def.$rotate = function(n) {
      var self = this;

      if (n == null) {
        n = 1
      }
      n = $scope.get('Opal').$coerce_to(n, $scope.get('Integer'), "to_int");
      
      var ary, idx, firstPart, lastPart;
      
      if (self.length === 1) {
        return self.slice();
      }
      if (self.length === 0) {
        return [];
      }
      
      ary = self.slice();
      idx = n % ary.length;
      
      firstPart = ary.slice(idx);
      lastPart = ary.slice(0, idx);
      return firstPart.concat(lastPart);
    
    };

    def['$rotate!'] = function(cnt) {
      var $a, self = this, ary = nil;

      if (cnt == null) {
        cnt = 1
      }
      if ((($a = self['$frozen?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('RuntimeError'), "can't modify frozen Array")};
      
      if (self.length === 0 || self.length === 1) {
        return self;
      }
    
      cnt = $scope.get('Opal').$coerce_to(cnt, $scope.get('Integer'), "to_int");
      ary = self.$rotate(cnt);
      return self.$replace(ary);
    };

    def.$sample = function(n) {
      var $a, $b, TMP_20, self = this;

      if (n == null) {
        n = nil
      }
      if ((($a = ($b = n['$!'](), $b !== false && $b !== nil ?self['$empty?']() : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return nil};
      if ((($a = (($b = n !== false && n !== nil) ? self['$empty?']() : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return []};
      if (n !== false && n !== nil) {
        return ($a = ($b = ($range(1, n, false))).$map, $a.$$p = (TMP_20 = function(){var self = TMP_20.$$s || this;

        return self['$[]'](self.$rand(self.$length()))}, TMP_20.$$s = self, TMP_20), $a).call($b)
        } else {
        return self['$[]'](self.$rand(self.$length()))
      };
    };

    def.$select = TMP_21 = function() {
      var self = this, $iter = TMP_21.$$p, block = $iter || nil;

      TMP_21.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("select")
      };
      
      var result = [];

      for (var i = 0, length = self.length, item, value; i < length; i++) {
        item = self[i];

        if ((value = Opal.yield1(block, item)) === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$select!'] = TMP_22 = function() {
      var $a, $b, self = this, $iter = TMP_22.$$p, block = $iter || nil;

      TMP_22.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("select!")
      };
      
      var original = self.length;
      ($a = ($b = self).$keep_if, $a.$$p = block.$to_proc(), $a).call($b);
      return self.length === original ? nil : self;
    
    };

    def.$shift = function(count) {
      var $a, self = this;

      if ((($a = count === undefined) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ((($a = self.length === 0) !== nil && (!$a.$$is_boolean || $a == true))) {
          return nil};
        return self.shift();};
      count = $scope.get('Opal').$coerce_to(count, $scope.get('Integer'), "to_int");
      if ((($a = count < 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "negative array size")};
      if ((($a = self.length === 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        return []};
      return self.splice(0, count);
    };

    Opal.defn(self, '$size', def.$length);

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

    Opal.defn(self, '$slice', def['$[]']);

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

    def.$sort = TMP_23 = function() {
      var $a, self = this, $iter = TMP_23.$$p, block = $iter || nil;

      TMP_23.$$p = null;
      if ((($a = self.length > 1) !== nil && (!$a.$$is_boolean || $a == true))) {
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
            self.$raise($scope.get('ArgumentError'), "comparison of " + ((x).$inspect()) + " with " + ((y).$inspect()) + " failed");
          }

          return $rb_gt(ret, 0) ? 1 : ($rb_lt(ret, 0) ? -1 : 0);
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

    def['$sort!'] = TMP_24 = function() {
      var $a, $b, self = this, $iter = TMP_24.$$p, block = $iter || nil;

      TMP_24.$$p = null;
      
      var result;

      if ((block !== nil)) {
        result = ($a = ($b = (self.slice())).$sort, $a.$$p = block.$to_proc(), $a).call($b);
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
      var self = this;

      
      if (count < 0) {
        self.$raise($scope.get('ArgumentError'));
      }

      return self.slice(0, count);
    ;
    };

    def.$take_while = TMP_25 = function() {
      var self = this, $iter = TMP_25.$$p, block = $iter || nil;

      TMP_25.$$p = null;
      
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

    Opal.defn(self, '$to_ary', def.$to_a);

    def.$to_h = function() {
      var self = this;

      
      var i, len = self.length, ary, key, val, hash = $hash2([], {});

      for (i = 0; i < len; i++) {
        ary = $scope.get('Opal')['$coerce_to?'](self[i], $scope.get('Array'), "to_ary");
        if (!ary.$$is_array) {
          self.$raise($scope.get('TypeError'), "wrong element type " + ((ary).$class()) + " at " + (i) + " (expected array)")
        }
        if (ary.length !== 2) {
          self.$raise($scope.get('ArgumentError'), "wrong array length at " + (i) + " (expected 2, was " + ((ary).$length()) + ")")
        }
        key = ary[0];
        val = ary[1];
        hash.$store(key, val);
      }

      return hash;
    ;
    };

    Opal.defn(self, '$to_s', def.$inspect);

    def.$transpose = function() {
      var $a, $b, TMP_26, self = this, result = nil, max = nil;

      if ((($a = self['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        return []};
      result = [];
      max = nil;
      ($a = ($b = self).$each, $a.$$p = (TMP_26 = function(row){var self = TMP_26.$$s || this, $a, $b, TMP_27;
if (row == null) row = nil;
      if ((($a = $scope.get('Array')['$==='](row)) !== nil && (!$a.$$is_boolean || $a == true))) {
          row = row.$to_a()
          } else {
          row = $scope.get('Opal').$coerce_to(row, $scope.get('Array'), "to_ary").$to_a()
        };
        ((($a = max) !== false && $a !== nil) ? $a : max = row.length);
        if ((($a = (row.length)['$=='](max)['$!']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.$raise($scope.get('IndexError'), "element size differs (" + (row.length) + " should be " + (max))};
        return ($a = ($b = (row.length)).$times, $a.$$p = (TMP_27 = function(i){var self = TMP_27.$$s || this, $a, $b, $c, entry = nil;
if (i == null) i = nil;
        entry = (($a = i, $b = result, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, []))));
          return entry['$<<'](row.$at(i));}, TMP_27.$$s = self, TMP_27), $a).call($b);}, TMP_26.$$s = self, TMP_26), $a).call($b);
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

    def.$values_at = function(args) {
      var $a, $b, TMP_28, self = this, out = nil;

      args = $slice.call(arguments, 0);
      out = [];
      ($a = ($b = args).$each, $a.$$p = (TMP_28 = function(elem){var self = TMP_28.$$s || this, $a, $b, TMP_29, finish = nil, start = nil, i = nil;
if (elem == null) elem = nil;
      if ((($a = elem['$kind_of?']($scope.get('Range'))) !== nil && (!$a.$$is_boolean || $a == true))) {
          finish = $scope.get('Opal').$coerce_to(elem.$last(), $scope.get('Integer'), "to_int");
          start = $scope.get('Opal').$coerce_to(elem.$first(), $scope.get('Integer'), "to_int");
          
          if (start < 0) {
            start = start + self.length;
            return nil;;
          }
        
          
          if (finish < 0) {
            finish = finish + self.length;
          }
          if (elem['$exclude_end?']()) {
            finish--;
          }
          if (finish < start) {
            return nil;;
          }
        
          return ($a = ($b = start).$upto, $a.$$p = (TMP_29 = function(i){var self = TMP_29.$$s || this;
if (i == null) i = nil;
          return out['$<<'](self.$at(i))}, TMP_29.$$s = self, TMP_29), $a).call($b, finish);
          } else {
          i = $scope.get('Opal').$coerce_to(elem, $scope.get('Integer'), "to_int");
          return out['$<<'](self.$at(i));
        }}, TMP_28.$$s = self, TMP_28), $a).call($b);
      return out;
    };

    return (def.$zip = TMP_30 = function(others) {
      var $a, self = this, $iter = TMP_30.$$p, block = $iter || nil;

      others = $slice.call(arguments, 0);
      TMP_30.$$p = null;
      
      var result = [], size = self.length, part, o, i, j, jj;

      for (j = 0, jj = others.length; j < jj; j++) {
        o = others[j];
        if (!o.$$is_array) {
          others[j] = (((($a = $scope.get('Opal')['$coerce_to?'](o, $scope.get('Array'), "to_ary")) !== false && $a !== nil) ? $a : $scope.get('Opal')['$coerce_to!'](o, $scope.get('Enumerator'), "each"))).$to_a();
        }
      }

      for (i = 0; i < size; i++) {
        part = [self[i]];

        for (j = 0, jj = others.length; j < jj; j++) {
          o = others[j][i];

          if (o == null) {
            o = nil;
          }

          part[j + 1] = o;
        }

        result[i] = part;
      }

      if (block !== nil) {
        for (i = 0; i < size; i++) {
          block(result[i]);
        }

        return nil;
      }

      return result;
    
    }, nil) && 'zip';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/array/inheritance"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$new', '$allocate', '$initialize', '$to_proc', '$__send__', '$clone', '$respond_to?', '$==', '$eql?', '$inspect', '$hash', '$class', '$slice', '$uniq', '$flatten']);
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self.$$proto, $scope = self.$$scope;

    return (Opal.defs(self, '$inherited', function(klass) {
      var self = this, replace = nil;

      replace = $scope.get('Class').$new((($scope.get('Array')).$$scope.get('Wrapper')));
      
      klass.$$proto         = replace.$$proto;
      klass.$$proto.$$class = klass;
      klass.$$alloc         = replace.$$alloc;
      klass.$$parent        = (($scope.get('Array')).$$scope.get('Wrapper'));

      klass.$allocate = replace.$allocate;
      klass.$new      = replace.$new;
      klass["$[]"]    = replace["$[]"];
    
    }), nil) && 'inherited'
  })(self, null);
  return (function($base, $super) {
    function $Wrapper(){};
    var self = $Wrapper = $klass($base, $super, 'Wrapper', $Wrapper);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5;

    def.literal = nil;
    def.$$is_array = true;

    Opal.defs(self, '$allocate', TMP_1 = function(array) {
      var self = this, $iter = TMP_1.$$p, $yield = $iter || nil, obj = nil;

      if (array == null) {
        array = []
      }
      TMP_1.$$p = null;
      obj = Opal.find_super_dispatcher(self, 'allocate', TMP_1, null, $Wrapper).apply(self, []);
      obj.literal = array;
      return obj;
    });

    Opal.defs(self, '$new', TMP_2 = function(args) {
      var $a, $b, self = this, $iter = TMP_2.$$p, block = $iter || nil, obj = nil;

      args = $slice.call(arguments, 0);
      TMP_2.$$p = null;
      obj = self.$allocate();
      ($a = ($b = obj).$initialize, $a.$$p = block.$to_proc(), $a).apply($b, [].concat(args));
      return obj;
    });

    Opal.defs(self, '$[]', function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      return self.$allocate(objects);
    });

    def.$initialize = TMP_3 = function(args) {
      var $a, $b, self = this, $iter = TMP_3.$$p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_3.$$p = null;
      return self.literal = ($a = ($b = $scope.get('Array')).$new, $a.$$p = block.$to_proc(), $a).apply($b, [].concat(args));
    };

    def.$method_missing = TMP_4 = function(args) {
      var $a, $b, self = this, $iter = TMP_4.$$p, block = $iter || nil, result = nil;

      args = $slice.call(arguments, 0);
      TMP_4.$$p = null;
      result = ($a = ($b = self.literal).$__send__, $a.$$p = block.$to_proc(), $a).apply($b, [].concat(args));
      if ((($a = result === self.literal) !== nil && (!$a.$$is_boolean || $a == true))) {
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
      var $a, self = this, $iter = TMP_5.$$p, $yield = $iter || nil;

      TMP_5.$$p = null;
      return ((($a = Opal.find_super_dispatcher(self, 'respond_to?', TMP_5, $iter).apply(self, $zuper)) !== false && $a !== nil) ? $a : self.literal['$respond_to?'](name));
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

    def.$hash = function() {
      var self = this;

      return self.literal.$hash();
    };

    def['$*'] = function(other) {
      var self = this;

      
      var result = $rb_times(self.literal, other);

      if (result.$$is_array) {
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

      if (result.$$is_array && (index.$$is_range || length !== undefined)) {
        return self.$class().$allocate(result)
      }
      else {
        return result;
      }
    ;
    };

    Opal.defn(self, '$slice', def['$[]']);

    def.$uniq = function() {
      var self = this;

      return self.$class().$allocate(self.literal.$uniq());
    };

    def.$flatten = function(level) {
      var self = this;

      return self.$class().$allocate(self.literal.$flatten(level));
    };

    def['$-'] = function(other) {
      var self = this;

      return $rb_minus(self.literal, other);
    };

    return (def['$+'] = function(other) {
      var self = this;

      return $rb_plus(self.literal, other);
    }, nil) && '+';
  })($scope.get('Array'), null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/hash"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$require', '$include', '$coerce_to?', '$[]', '$merge!', '$allocate', '$raise', '$!', '$==', '$call', '$coerce_to!', '$lambda?', '$abs', '$arity', '$enum_for', '$inspect', '$flatten', '$eql?', '$===', '$clone', '$to_proc', '$alias_method']);
  self.$require("corelib/enumerable");
  return (function($base, $super) {
    function $Hash(){};
    var self = $Hash = $klass($base, $super, 'Hash', $Hash);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_8, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13;

    def.proc = def.none = nil;
    self.$include($scope.get('Enumerable'));

    def.$$is_hash = true;

    Opal.defs(self, '$[]', function(argv) {
      var self = this;

      argv = $slice.call(arguments, 0);
      
      var hash, i, argc = argv.length;

      if (argc === 1) {
        hash = $scope.get('Opal')['$coerce_to?'](argv['$[]'](0), $scope.get('Hash'), "to_hash");
        if (hash !== nil) {
          return self.$allocate()['$merge!'](hash);
        }

        argv = $scope.get('Opal')['$coerce_to?'](argv['$[]'](0), $scope.get('Array'), "to_ary");
        if (argv === nil) {
          self.$raise($scope.get('ArgumentError'), "odd number of arguments for Hash")
        }

        argc = argv.length;
        hash = self.$allocate();

        for (i = 0; i < argc; i++) {
          if (!argv[i].$$is_array) continue;
          switch(argv[i].length) {
          case 1:
            hash.$store(argv[i][0], nil);
            break;
          case 2:
            hash.$store(argv[i][0], argv[i][1]);
            break;
          default:
            self.$raise($scope.get('ArgumentError'), "invalid number of elements (" + (argv[i].length) + " for 1..2)")
          }
        }

        return hash;
      }

      if (argc % 2 !== 0) {
        self.$raise($scope.get('ArgumentError'), "odd number of arguments for Hash")
      }

      hash = self.$allocate();

      for (i = 0; i < argc; i += 2) {
        hash.$store(argv[i], argv[i + 1]);
      }

      return hash;
    ;
    });

    Opal.defs(self, '$allocate', function() {
      var self = this;

      
      var hash = new self.$$alloc;

      hash.map  = {};
      hash.smap = {};
      hash.keys = [];
      hash.none = nil;
      hash.proc = nil;

      return hash;
    
    });

    def.$initialize = TMP_1 = function(defaults) {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      TMP_1.$$p = null;
      
      self.none = (defaults === undefined ? nil : defaults);
      self.proc = block;
    
      return self;
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (self === other) {
        return true;
      }

      if (!other.keys || !other.smap || !other.map) {
        return false;
      }

      if (self.keys.length !== other.keys.length) {
        return false;
      }

      var _map  = self.map,
          smap  = self.smap,
          _map2 = other.map,
          smap2 = other.smap,
          map, map2, key, khash, value, value2;

      for (var i = 0, length = self.keys.length; i < length; i++) {
        key = self.keys[i];

        if (key.$$is_string) {
          khash = key;
          map   = smap;
          map2  = smap2;
        } else {
          khash = key.$hash();
          map   = _map;
          map2  = _map2;
        }

        value  = map[khash];
        if (value === undefined) console.log('==', key, self);
        value2 = map2[khash];

        if (value2 === undefined || ((value)['$=='](value2))['$!']()) {
          return false;
        }
      }

      return true;
    
    };

    def['$[]'] = function(key) {
      var self = this;

      
      var map, khash;

      if (key.$$is_string) {
        map = self.smap;
        khash = key;
      } else {
        map = self.map;
        khash = key.$hash();
      }

      if (map === undefined) { console.log(self, '[] --> key:', key, khash, map) }


      if (Opal.hasOwnProperty.call(map, khash)) {
        return map[khash];
      }

      var proc = self.proc;

      if (proc !== nil) {
        return (proc).$call(self, key);
      }

      return self.none;
    
    };

    def['$[]='] = function(key, value) {
      var self = this;

      
      var map, khash, value;

      if (key.$$is_string) {
        map = self.smap;
        khash = key;
      } else {
        map = self.map;
        khash = key.$hash();
      }

      if (!Opal.hasOwnProperty.call(map, khash)) {
        self.keys.push(key);
      }

      map[khash] = value;

      return value;
    
    };

    def.$assoc = function(object) {
      var self = this;

      
      var keys = self.keys,
          map, key, khash;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if ((key)['$=='](object)) {
          if (key.$$is_string) {
            map = self.smap;
            khash = key;
          } else {
            map = self.map;
            khash = key.$hash();
          }

          return [key, map[khash]];
        }
      }

      return nil;
    
    };

    def.$clear = function() {
      var self = this;

      
      self.map = {};
      self.smap = {};
      self.keys = [];
      return self;
    
    };

    def.$clone = function() {
      var self = this;

      
      var _map  = {},
          smap  = {},
          _map2 = self.map,
          smap2 = self.smap,
          keys  = [],
          map, map2, key, khash, value;

      for (var i = 0, length = self.keys.length; i < length; i++) {
        key   = self.keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
          map2 = smap2;
        } else {
          khash = key.$hash();
          map = _map;
          map2 = _map2;
        }

        value = map2[khash];

        keys.push(key);
        map[khash] = value;
      }

      var clone = new self.$$class.$$alloc();

      clone.map  = _map;
      clone.smap = smap;
      clone.keys = keys;
      clone.none = self.none;
      clone.proc = self.proc;

      return clone;
    
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
      var self = this;

      
      if (proc !== nil) {
        proc = $scope.get('Opal')['$coerce_to!'](proc, $scope.get('Proc'), "to_proc");

        if (proc['$lambda?']() && proc.$arity().$abs() != 2) {
          self.$raise($scope.get('TypeError'), "default_proc takes two arguments");
        }
      }
      self.none = nil;
      return (self.proc = proc);
    ;
    };

    def.$delete = TMP_2 = function(key) {
      var self = this, $iter = TMP_2.$$p, block = $iter || nil;

      TMP_2.$$p = null;
      
      var result, map, khash;

      if (key.$$is_string) {
        map = self.smap;
        khash = key;
      } else {
        map = self.map;
        khash = key.$hash();
      }

      result = map[khash];

      if (result != null) {
        delete map[khash];
        self.keys.$delete(key);

        return result;
      }

      if (block !== nil) {
        return block.$call(key);
      }
      return nil;
    
    };

    def.$delete_if = TMP_3 = function() {
      var self = this, $iter = TMP_3.$$p, block = $iter || nil;

      TMP_3.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("delete_if")
      };
      
      var _map = self.map,
          smap = self.smap,
          keys = self.keys,
          map, key, value, obj, khash;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          map = smap;
          khash = key;
        } else {
          map = _map;
          khash = key.$hash();
        }
        obj = map[khash];
        value = block(key, obj);

        if (value === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          keys.splice(i, 1);
          delete map[khash];

          length--;
          i--;
        }
      }

      return self;
    
    };

    Opal.defn(self, '$dup', def.$clone);

    def.$each = TMP_4 = function() {
      var self = this, $iter = TMP_4.$$p, block = $iter || nil;

      TMP_4.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each")
      };
      
      var _map = self.map,
          smap = self.smap,
          keys = self.keys,
          map, key, khash, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          map = smap;
          khash = key;
        } else {
          map = _map;
          khash = key.$hash();
        }

        value = Opal.yield1(block, [key, map[khash]]);

        if (value === $breaker) {
          return $breaker.$v;
        }
      }

      return self;
    
    };

    def.$each_key = TMP_5 = function() {
      var self = this, $iter = TMP_5.$$p, block = $iter || nil;

      TMP_5.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each_key")
      };
      
      var keys = self.keys, key;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (block(key) === $breaker) {
          return $breaker.$v;
        }
      }

      return self;
    
    };

    Opal.defn(self, '$each_pair', def.$each);

    def.$each_value = TMP_6 = function() {
      var self = this, $iter = TMP_6.$$p, block = $iter || nil;

      TMP_6.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each_value")
      };
      
      var _map = self.map,
          smap = self.smap,
          keys = self.keys, key, map, khash;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          map = smap;
          khash = key;
        } else {
          map = _map;
          khash = key.$hash();
        }

        if (block(map[khash]) === $breaker) {
          return $breaker.$v;
        }
      }

      return self;
    
    };

    def['$empty?'] = function() {
      var self = this;

      return self.keys.length === 0;
    };

    Opal.defn(self, '$eql?', def['$==']);

    def.$fetch = TMP_7 = function(key, defaults) {
      var self = this, $iter = TMP_7.$$p, block = $iter || nil;

      TMP_7.$$p = null;
      
      var map, khash, value;

      if (key.$$is_string) {
        khash = key;
        map = self.smap;
      } else {
        khash = key.$hash();
        map = self.map;
      }

      value = map[khash];

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

      self.$raise($scope.get('KeyError'), "key not found: " + (key.$inspect()));
    
    };

    def.$flatten = function(level) {
      var self = this;

      
      var _map = self.map,
          smap = self.smap,
          keys = self.keys,
          result = [],
          map, key, khash, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
        } else {
          khash = key.$hash();
          map = _map;
        }

        value = map[khash];

        result.push(key);

        if (value.$$is_array) {
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

      
      var keys = self.keys,
          map, khash;

      if (key.$$is_string) {
        khash = key;
        map = self.smap;
      } else {
        khash = key.$hash();
        map = self.map;
      }

      if (Opal.hasOwnProperty.call(map, khash)) {
        for (var i = 0, length = keys.length; i < length; i++) {
          if (!(key['$eql?'](keys[i]))['$!']()) {
            return true;
          }
        }
      }

      return false;
    
    };

    def['$has_value?'] = function(value) {
      var self = this;

      
      var _map = self.map,
          smap = self.smap,
          keys = self.keys, key, map, khash;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          map = smap;
          khash = key;
        } else {
          map = _map;
          khash = key.$hash();
        }

        if ((map[khash])['$=='](value)) {
          return true;
        }
      }

      return false;
    
    };

    var hash_ids = null;

    def.$hash = function() {
      var self = this;

      
      var top = (hash_ids === null);
      try {
        var key, value,
            hash = ['Hash'],
            keys = self.keys,
            id = self.$object_id(),
            counter = 0;

        if (top) {
          hash_ids = {}
        }

        if (hash_ids.hasOwnProperty(id)) {
          return 'self';
        }

        hash_ids[id] = true;

        for (var i = 0, length = keys.length; i < length; i++) {
          key   = keys[i];
          value = key.$$is_string ? self.smap[key] : self.map[key.$hash()];
          key   = key.$hash();
          value = (typeof(value) === 'undefined') ? '' : value.$hash();
          hash.push([key,value]);
        }

        return hash.sort().join();
      } finally {
        if (top) {
          hash_ids = null;
        }
      }
    
    };

    Opal.defn(self, '$include?', def['$has_key?']);

    def.$index = function(object) {
      var self = this;

      
      var _map = self.map,
          smap = self.smap,
          keys = self.keys,
          map, khash, key;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          map = smap;
          khash = key;
        } else {
          map = _map;
          khash = key.$hash();
        }

        if ((map[khash])['$=='](object)) {
          return key;
        }
      }

      return nil;
    
    };

    def.$indexes = function(keys) {
      var self = this;

      keys = $slice.call(arguments, 0);
      
      var result = [],
          _map = self.map,
          smap = self.smap,
          map, key, khash, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
        } else {
          khash = key.$hash();
          map = _map;
        }

        value = map[khash];

        if (value != null) {
          result.push(value);
        }
        else {
          result.push(self.none);
        }
      }

      return result;
    
    };

    Opal.defn(self, '$indices', def.$indexes);

    var inspect_ids = null;

    def.$inspect = function() {
      var self = this;

      
      var top = (inspect_ids === null);
      try {

        var key, value,
            inspect = [],
            keys = self.keys,
            id = self.$object_id(),
            counter = 0;

        if (top) {
          inspect_ids = {}
        }

        if (inspect_ids.hasOwnProperty(id)) {
          return '{...}';
        }

        inspect_ids[id] = true;

        for (var i = 0, length = keys.length; i < length; i++) {
          key   = keys[i];
          value = key.$$is_string ? self.smap[key] : self.map[key.$hash()];
          key   = key.$inspect();
          value = value.$inspect();
          inspect.push(key + '=>' + value);
        }

        return '{' + inspect.join(', ') + '}';
      } finally {

        if (top) {
          inspect_ids = null;
        }
      }
    
    };

    def.$invert = function() {
      var self = this;

      
      var result = Opal.hash(),
          keys = self.keys,
          _map = self.map,
          smap = self.smap,
          keys2 = result.keys,
          _map2 = result.map,
          smap2 = result.smap,
          map, map2, key, khash, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          map = smap;
          khash = key;
        } else {
          map = _map;
          khash = key.$hash();
        }

        value = map[khash];
        keys2.push(value);

        if (value.$$is_string) {
          map2 = smap2;
          khash = value;
        } else {
          map2 = _map2;
          khash = value.$hash();
        }

        map2[khash] = key;
      }

      return result;
    
    };

    def.$keep_if = TMP_8 = function() {
      var self = this, $iter = TMP_8.$$p, block = $iter || nil;

      TMP_8.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("keep_if")
      };
      
      var _map = self.map,
          smap = self.smap,
          keys = self.keys,
          map, key, khash, value, keep;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
        } else {
          khash = key.$hash();
          map = _map;
        }

        value = map[khash];
        keep  = block(key, value);

        if (keep === $breaker) {
          return $breaker.$v;
        }

        if (keep === false || keep === nil) {
          keys.splice(i, 1);
          delete map[khash];

          length--;
          i--;
        }
      }

      return self;
    
    };

    Opal.defn(self, '$key', def.$index);

    Opal.defn(self, '$key?', def['$has_key?']);

    def.$keys = function() {
      var self = this;

      return self.keys.slice(0);
    };

    def.$length = function() {
      var self = this;

      return self.keys.length;
    };

    Opal.defn(self, '$member?', def['$has_key?']);

    def.$merge = TMP_9 = function(other) {
      var $a, $b, self = this, $iter = TMP_9.$$p, block = $iter || nil, cloned = nil;

      TMP_9.$$p = null;
      if ((($a = $scope.get('Hash')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        other = $scope.get('Opal')['$coerce_to!'](other, $scope.get('Hash'), "to_hash")
      };
      cloned = self.$clone();
      ($a = ($b = cloned)['$merge!'], $a.$$p = block.$to_proc(), $a).call($b, other);
      return cloned;
    };

    def['$merge!'] = TMP_10 = function(other) {
      var self = this, $iter = TMP_10.$$p, block = $iter || nil;

      TMP_10.$$p = null;
      
      if (! $scope.get('Hash')['$==='](other)) {
        other = $scope.get('Opal')['$coerce_to!'](other, $scope.get('Hash'), "to_hash");
      }

      var keys  = self.keys,
          _map  = self.map,
          smap  = self.smap,
          keys2 = other.keys,
          _map2 = other.map,
          smap2 = other.smap,
          map, map2, key, khash, value, value2;

      if (block === nil) {
        for (var i = 0, length = keys2.length; i < length; i++) {
          key = keys2[i];

          if (key.$$is_string) {
            khash = key;
            map = smap;
            map2 = smap2;
          } else {
            khash = key.$hash();
            map = _map;
            map2 = _map2;
          }

          if (map[khash] == null) {
            keys.push(key);
          }

          map[khash] = map2[khash];
        }
      }
      else {
        for (var i = 0, length = keys2.length; i < length; i++) {
          key    = keys2[i];

          if (key.$$is_string) {
            khash = key;
            map = smap;
            map2 = smap2;
          } else {
            khash = key.$hash();
            map = _map;
            map2 = _map2;
          }

          value  = map[khash];
          value2 = map2[khash];

          if (value == null) {
            keys.push(key);
            map[khash] = value2;
          }
          else {
            map[khash] = block(key, value, value2);
          }
        }
      }

      return self;
    ;
    };

    def.$rassoc = function(object) {
      var self = this;

      
      var keys = self.keys,
          _map = self.map,
          smap = self.smap,
          key, khash, value, map;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i]

        if (key.$$is_string) {
          khash = key;
          map = smap;
        } else {
          khash = key.$hash();
          map = _map;
        }

        value = map[khash];

        if ((value)['$=='](object)) {
          return [key, value];
        }
      }

      return nil;
    
    };

    def.$reject = TMP_11 = function() {
      var self = this, $iter = TMP_11.$$p, block = $iter || nil;

      TMP_11.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("reject")
      };
      
      var keys   = self.keys,
          _map    = self.map,
          smap    = self.smap,
          result = Opal.hash(),
          _map2   = result.map,
          smap2   = result.smap,
          keys2  = result.keys,
          map, map2, key, khash, object, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
          map2 = smap2;
        } else {
          khash = key.$hash();
          map = _map;
          map2 = _map2;
        }

        object = map[khash];

        if ((value = block(key, object)) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          keys2.push(key);
          map2[khash] = object;
        }
      }

      return result;
    
    };

    def.$replace = function(other) {
      var self = this;

      
      var keys  = self.keys = [],
          _map  = self.map  = {},
          smap  = self.smap = {},
          _map2 = other.map,
          smap2 = other.smap,
          key, khash, map, map2;

      for (var i = 0, length = other.keys.length; i < length; i++) {
        key = other.keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
          map2 = smap2;
        } else {
          khash = key.$hash();
          map = _map;
          map2 = _map2;
        }

        keys.push(key);
        map[khash] = map2[khash];
      }

      return self;
    
    };

    def.$select = TMP_12 = function() {
      var self = this, $iter = TMP_12.$$p, block = $iter || nil;

      TMP_12.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("select")
      };
      
      var keys   = self.keys,
          _map   = self.map,
          smap   = self.smap,
          result = Opal.hash(),
          _map2  = result.map,
          smap2  = result.smap,
          keys2  = result.keys,
          map, map2, key, khash, value, object;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
          map2 = smap2;
        } else {
          khash = key.$hash();
          map = _map;
          map2 = _map2;
        }

        value = map[khash];
        object = block(key, value);

        if (object === $breaker) {
          return $breaker.$v;
        }

        if (object !== false && object !== nil) {
          keys2.push(key);
          map2[khash] = value;
        }
      }

      return result;
    
    };

    def['$select!'] = TMP_13 = function() {
      var self = this, $iter = TMP_13.$$p, block = $iter || nil;

      TMP_13.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("select!")
      };
      
      var _map = self.map,
          smap = self.smap,
          keys = self.keys,
          result = nil,
          key, khash, value, object, map;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
        } else {
          khash = key.$hash();
          map = _map;
        }

        value = map[khash];
        object = block(key, value);

        if (object === $breaker) {
          return $breaker.$v;
        }

        if (object === false || object === nil) {
          keys.splice(i, 1);
          delete map[khash];

          length--;
          i--;
          result = self
        }
      }

      return result;
    
    };

    def.$shift = function() {
      var self = this;

      
      var keys = self.keys,
          _map = self.map,
          smap = self.smap,
          map, key, khash, value;

      if (keys.length) {
        key = keys[0];
        if (key.$$is_string) {
          khash = key;
          map = smap;
        } else {
          khash = key.$hash();
          map = _map;
        }
        value = map[khash];

        delete map[khash];
        keys.splice(0, 1);

        return [key, value];
      }

      return nil;
    
    };

    Opal.defn(self, '$size', def.$length);

    self.$alias_method("store", "[]=");

    def.$to_a = function() {
      var self = this;

      
      var keys = self.keys,
          _map = self.map,
          smap = self.smap,
          result = [],
          map, key, khash;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
        } else {
          khash = key.$hash();
          map = _map;
        }

        result.push([key, map[khash]]);
      }

      return result;
    
    };

    def.$to_h = function() {
      var self = this;

      
      if (self.$$class === Opal.Hash) {
        return self
      }

      var hash   = new Opal.Hash.$$alloc,
          cloned = self.$clone();

      hash.map  = cloned.map;
      hash.smap = cloned.smap;
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

    Opal.defn(self, '$to_s', def.$inspect);

    Opal.defn(self, '$update', def['$merge!']);

    Opal.defn(self, '$value?', def['$has_value?']);

    Opal.defn(self, '$values_at', def.$indexes);

    return (def.$values = function() {
      var self = this;

      
      var _map = self.map,
          smap = self.smap,
          keys = self.keys,
          result = [],
          map, khash, key;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (key.$$is_string) {
          khash = key;
          map = smap;
        } else {
          khash = key.$hash();
          map = _map;
        }

        result.push(map[khash]);
      }

      return result;
    
    }, nil) && 'values';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/string"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $gvars = Opal.gvars;

  Opal.add_stubs(['$require', '$include', '$coerce_to?', '$coerce_to', '$raise', '$===', '$format', '$to_s', '$respond_to?', '$to_str', '$<=>', '$==', '$=~', '$new', '$empty?', '$ljust', '$ceil', '$rjust', '$floor', '$to_a', '$each_char', '$to_proc', '$coerce_to!', '$initialize_clone', '$initialize_dup', '$enum_for', '$chomp', '$[]', '$to_i', '$class', '$each_line', '$match', '$captures', '$proc', '$shift', '$__send__', '$succ', '$escape']);
  self.$require("corelib/comparable");
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_8, TMP_10;

    def.length = nil;
    self.$include($scope.get('Comparable'));

    def.$$is_string = true;

    def.$__id__ = function() {
      var self = this;

      return self.toString();
    };

    Opal.defn(self, '$object_id', def.$__id__);

    Opal.defs(self, '$try_convert', function(what) {
      var self = this;

      return $scope.get('Opal')['$coerce_to?'](what, $scope.get('String'), "to_str");
    });

    Opal.defs(self, '$new', function(str) {
      var self = this;

      if (str == null) {
        str = ""
      }
      str = $scope.get('Opal').$coerce_to(str, $scope.get('String'), "to_str");
      return new String(str);
    });

    def.$initialize = function(str) {
      var self = this;

      
      if (str === undefined) {
        return self;
      }
    
      return self.$raise($scope.get('NotImplementedError'), "Mutable strings are not supported in Opal.");
    };

    def['$%'] = function(data) {
      var $a, self = this;

      if ((($a = $scope.get('Array')['$==='](data)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return ($a = self).$format.apply($a, [self].concat(data))
        } else {
        return self.$format(self, data)
      };
    };

    def['$*'] = function(count) {
      var self = this;

      
      count = $scope.get('Opal').$coerce_to(count, $scope.get('Integer'), "to_int");

      if (count < 0) {
        self.$raise($scope.get('ArgumentError'), "negative argument")
      }

      if (count === 0) {
        return '';
      }

      var result = '',
          string = self.toString();

      // All credit for the bit-twiddling magic code below goes to Mozilla
      // polyfill implementation of String.prototype.repeat() posted here:
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat

      if (string.length * count >= 1 << 28) {
        self.$raise($scope.get('RangeError'), "multiply count must not overflow maximum string size")
      }

      for (;;) {
        if ((count & 1) === 1) {
          result += string;
        }
        count >>>= 1;
        if (count === 0) {
          break;
        }
        string += string;
      }

      return result;
    ;
    };

    def['$+'] = function(other) {
      var self = this;

      other = $scope.get('Opal').$coerce_to(other, $scope.get('String'), "to_str");
      return self + other.$to_s();
    };

    def['$<=>'] = function(other) {
      var $a, self = this;

      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a.$$is_boolean || $a == true))) {
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

    def['$<<'] = function(other) {
      var self = this;

      return self.$raise($scope.get('NotImplementedError'), "#<< not supported. Mutable String methods are not supported in Opal.");
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (other.$$is_string) {
        return self.toString() === other.toString();
      }
      if ($scope.get('Opal')['$respond_to?'](other, "to_str")) {
        return other['$=='](self);
      }
      return false;
    ;
    };

    Opal.defn(self, '$eql?', def['$==']);

    Opal.defn(self, '$===', def['$==']);

    def['$=~'] = function(other) {
      var self = this;

      
      if (other.$$is_string) {
        self.$raise($scope.get('TypeError'), "type mismatch: String given");
      }

      return other['$=~'](self);
    ;
    };

    def['$[]'] = function(index, length) {
      var self = this;

      
      var size = self.length;

      if (index.$$is_range) {
        var exclude = index.exclude,
            length  = $scope.get('Opal').$coerce_to(index.end, $scope.get('Integer'), "to_int"),
            index   = $scope.get('Opal').$coerce_to(index.begin, $scope.get('Integer'), "to_int");

        if (Math.abs(index) > size) {
          return nil;
        }

        if (index < 0) {
          index += size;
        }

        if (length < 0) {
          length += size;
        }

        if (!exclude) {
          length += 1;
        }

        length = length - index;

        if (length < 0) {
          length = 0;
        }

        return self.substr(index, length);
      }


      if (index.$$is_string) {
        if (length != null) {
          self.$raise($scope.get('TypeError'))
        }
        return self.indexOf(index) !== -1 ? index : nil;
      }


      if (index.$$is_regexp) {
        var match = self.match(index);

        if (match === null) {
          $gvars["~"] = nil
          return nil;
        }

        $gvars["~"] = $scope.get('MatchData').$new(index, match)

        if (length == null) {
          return match[0];
        }

        length = $scope.get('Opal').$coerce_to(length, $scope.get('Integer'), "to_int");

        if (length < 0 && -length < match.length) {
          return match[length += match.length];
        }

        if (length >= 0 && length < match.length) {
          return match[length];
        }

        return nil;
      }


      index = $scope.get('Opal').$coerce_to(index, $scope.get('Integer'), "to_int");

      if (index < 0) {
        index += size;
      }

      if (length == null) {
        if (index >= size || index < 0) {
          return nil;
        }
        return self.substr(index, 1);
      }

      length = $scope.get('Opal').$coerce_to(length, $scope.get('Integer'), "to_int");

      if (length < 0) {
        return nil;
      }

      if (index > size || index < 0) {
        return nil;
      }

      return self.substr(index, length);
    ;
    };

    def.$capitalize = function() {
      var self = this;

      return self.charAt(0).toUpperCase() + self.substr(1).toLowerCase();
    };

    Opal.defn(self, '$capitalize!', def['$<<']);

    def.$casecmp = function(other) {
      var self = this;

      other = $scope.get('Opal').$coerce_to(other, $scope.get('String'), "to_str").$to_s();
      
      var ascii_only = /^[\x00-\x7F]*$/;
      if (ascii_only.test(self) && ascii_only.test(other)) {
        self = self.toLowerCase();
        other = other.toLowerCase();
      }
    
      return self['$<=>'](other);
    };

    def.$center = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = $scope.get('Opal').$coerce_to(width, $scope.get('Integer'), "to_int");
      padstr = $scope.get('Opal').$coerce_to(padstr, $scope.get('String'), "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self};
      
      var ljustified = self.$ljust($rb_divide(($rb_plus(width, self.length)), 2).$ceil(), padstr),
          rjustified = self.$rjust($rb_divide(($rb_plus(width, self.length)), 2).$floor(), padstr);

      return rjustified + ljustified.slice(self.length);
    ;
    };

    def.$chars = TMP_1 = function() {
      var $a, $b, self = this, $iter = TMP_1.$$p, block = $iter || nil;

      TMP_1.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$each_char().$to_a()
      };
      return ($a = ($b = self).$each_char, $a.$$p = block.$to_proc(), $a).call($b);
    };

    def.$chomp = function(separator) {
      var $a, self = this;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      if ((($a = separator === nil || self.length === 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self};
      separator = $scope.get('Opal')['$coerce_to!'](separator, $scope.get('String'), "to_str").$to_s();
      
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

    Opal.defn(self, '$chomp!', def['$<<']);

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

    Opal.defn(self, '$chop!', def['$<<']);

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

    def.$count = function(sets) {
      var self = this;

      sets = $slice.call(arguments, 0);
      
      if (sets.length === 0) {
        self.$raise($scope.get('ArgumentError'), "ArgumentError: wrong number of arguments (0 for 1+)")
      }
      var char_class = char_class_from_char_sets(sets);
      if (char_class === null) {
        return 0;
      }
      return self.length - self.replace(new RegExp(char_class, 'g'), '').length;
    ;
    };

    def.$delete = function(sets) {
      var self = this;

      sets = $slice.call(arguments, 0);
      
      if (sets.length === 0) {
        self.$raise($scope.get('ArgumentError'), "ArgumentError: wrong number of arguments (0 for 1+)")
      }
      var char_class = char_class_from_char_sets(sets);
      if (char_class === null) {
        return self;
      }
      return self.replace(new RegExp(char_class, 'g'), '');
    ;
    };

    Opal.defn(self, '$dup', def.$clone);

    def.$downcase = function() {
      var self = this;

      return self.toLowerCase();
    };

    Opal.defn(self, '$downcase!', def['$<<']);

    def.$each_char = TMP_2 = function() {
      var $a, self = this, $iter = TMP_2.$$p, block = $iter || nil;

      TMP_2.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_char")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        ((($a = Opal.yield1(block, self.charAt(i))) === $breaker) ? $breaker.$v : $a);
      }
    
      return self;
    };

    def.$each_line = TMP_3 = function(separator) {
      var $a, self = this, $iter = TMP_3.$$p, $yield = $iter || nil;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      TMP_3.$$p = null;
      if (($yield !== nil)) {
        } else {
        return self.$enum_for("each_line", separator)
      };
      
      if (separator === nil) {
        ((($a = Opal.yield1($yield, self)) === $breaker) ? $breaker.$v : $a);
        return self;
      }

      separator = $scope.get('Opal').$coerce_to(separator, $scope.get('String'), "to_str")

      if (separator.length === 0) {
        for (var a = self.split(/(\n{2,})/), i = 0, n = a.length; i < n; i += 2) {
          if (a[i] || a[i + 1]) {
            ((($a = Opal.yield1($yield, (a[i] || "") + (a[i + 1] || ""))) === $breaker) ? $breaker.$v : $a);
          }
        }
        return self;
      }

      var chomped  = self.$chomp(separator),
          trailing = self.length != chomped.length,
          splitted = chomped.split(separator);

      for (var i = 0, length = splitted.length; i < length; i++) {
        if (i < length - 1 || trailing) {
          ((($a = Opal.yield1($yield, splitted[i] + separator)) === $breaker) ? $breaker.$v : $a);
        }
        else {
          ((($a = Opal.yield1($yield, splitted[i])) === $breaker) ? $breaker.$v : $a);
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
      var self = this;

      suffixes = $slice.call(arguments, 0);
      
      for (var i = 0, length = suffixes.length; i < length; i++) {
        var suffix = $scope.get('Opal').$coerce_to(suffixes[i], $scope.get('String'), "to_str").$to_s();

        if (self.length >= suffix.length &&
            self.substr(self.length - suffix.length, suffix.length) == suffix) {
          return true;
        }
      }
    
      return false;
    };

    Opal.defn(self, '$eql?', def['$==']);

    Opal.defn(self, '$equal?', def['$===']);

    def.$gsub = TMP_4 = function(pattern, replacement) {
      var self = this, $iter = TMP_4.$$p, block = $iter || nil;

      TMP_4.$$p = null;
      
      var result = '', match_data = nil, index = 0, match, _replacement;

      if (pattern.$$is_regexp) {
        pattern = new RegExp(pattern.source, 'gm' + (pattern.ignoreCase ? 'i' : ''));
      } else {
        pattern = $scope.get('Opal').$coerce_to(pattern, $scope.get('String'), "to_str");
        pattern = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gm');
      }

      while (true) {
        match = pattern.exec(self);

        if (match === null) {
          $gvars["~"] = nil
          result += self.slice(index);
          break;
        }

        match_data = $scope.get('MatchData').$new(pattern, match);

        if (replacement === undefined) {
          if (block === nil) {
            self.$raise($scope.get('ArgumentError'), "wrong number of arguments (1 for 2)")
          }
          _replacement = block(match[0]);
        }
        else if (replacement.$$is_hash) {
          _replacement = (replacement)['$[]'](match[0]).$to_s();
        }
        else {
          if (!replacement.$$is_string) {
            replacement = $scope.get('Opal').$coerce_to(replacement, $scope.get('String'), "to_str");
          }
          _replacement = replacement.replace(/([\\]+)([0-9+&`'])/g, function (original, slashes, command) {
            if (slashes.length % 2 === 0) {
              return original;
            }
            switch (command) {
            case "+":
              for (var i = match.length - 1; i > 0; i--) {
                if (match[i] !== undefined) {
                  return slashes.slice(1) + match[i];
                }
              }
              return '';
            case "&": return slashes.slice(1) + match[0];
            case "`": return slashes.slice(1) + self.slice(0, match.index);
            case "'": return slashes.slice(1) + self.slice(match.index + match[0].length);
            default:  return slashes.slice(1) + (match[command] || '');
            }
          }).replace(/\\\\/g, '\\');
        }

        if (pattern.lastIndex === match.index) {
          result += (_replacement + self.slice(index, match.index + 1))
          pattern.lastIndex += 1;
        }
        else {
          result += (self.slice(index, match.index) + _replacement)
        }
        index = pattern.lastIndex;
      }

      $gvars["~"] = match_data
      return result;
    
    };

    Opal.defn(self, '$gsub!', def['$<<']);

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

      
      if (other.$$is_string) {
        return self.indexOf(other) !== -1;
      }
    
      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('TypeError'), "no implicit conversion of " + (other.$class()) + " into String")
      };
      return self.indexOf(other.$to_str()) !== -1;
    };

    def.$index = function(search, offset) {
      var self = this;

      
      var index,
          match,
          regex;

      if (offset === undefined) {
        offset = 0;
      } else {
        offset = $scope.get('Opal').$coerce_to(offset, $scope.get('Integer'), "to_int");
        if (offset < 0) {
          offset += self.length;
          if (offset < 0) {
            return nil;
          }
        }
      }

      if (search.$$is_regexp) {
        regex = new RegExp(search.source, 'gm' + (search.ignoreCase ? 'i' : ''));
        while (true) {
          match = regex.exec(self);
          if (match === null) {
            $gvars["~"] = nil;
            index = -1;
            break;
          }
          if (match.index >= offset) {
            $gvars["~"] = $scope.get('MatchData').$new(regex, match)
            index = match.index;
            break;
          }
          regex.lastIndex = match.index + 1;
        }
      } else {
        search = $scope.get('Opal').$coerce_to(search, $scope.get('String'), "to_str");
        if (search.length === 0 && offset > self.length) {
          index = -1;
        } else {
          index = self.indexOf(search, offset);
        }
      }

      return index === -1 ? nil : index;
    
    };

    def.$inspect = function() {
      var self = this;

      
      var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          meta = {
            '\u0007': '\\a',
            '\u001b': '\\e',
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '\v': '\\v',
            '"' : '\\"',
            '\\': '\\\\'
          },
          escaped = self.replace(escapable, function (chr) {
            return meta[chr] || '\\u' + ('0000' + chr.charCodeAt(0).toString(16).toUpperCase()).slice(-4);
          });
      return '"' + escaped.replace(/\#[\$\@\{]/g, '\\$&') + '"';
    
    };

    def.$intern = function() {
      var self = this;

      return self;
    };

    def.$lines = TMP_5 = function(separator) {
      var $a, $b, self = this, $iter = TMP_5.$$p, block = $iter || nil, e = nil;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      TMP_5.$$p = null;
      e = ($a = ($b = self).$each_line, $a.$$p = block.$to_proc(), $a).call($b, separator);
      if (block !== false && block !== nil) {
        return self
        } else {
        return e.$to_a()
      };
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
      width = $scope.get('Opal').$coerce_to(width, $scope.get('Integer'), "to_int");
      padstr = $scope.get('Opal').$coerce_to(padstr, $scope.get('String'), "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a.$$is_boolean || $a == true))) {
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

    Opal.defn(self, '$lstrip!', def['$<<']);

    def.$match = TMP_6 = function(pattern, pos) {
      var $a, $b, self = this, $iter = TMP_6.$$p, block = $iter || nil;

      TMP_6.$$p = null;
      if ((($a = ((($b = $scope.get('String')['$==='](pattern)) !== false && $b !== nil) ? $b : pattern['$respond_to?']("to_str"))) !== nil && (!$a.$$is_boolean || $a == true))) {
        pattern = $scope.get('Regexp').$new(pattern.$to_str())};
      if ((($a = $scope.get('Regexp')['$==='](pattern)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('TypeError'), "wrong argument type " + (pattern.$class()) + " (expected Regexp)")
      };
      return ($a = ($b = pattern).$match, $a.$$p = block.$to_proc(), $a).call($b, self, pos);
    };

    def.$next = function() {
      var self = this;

      
      var i = self.length;
      if (i === 0) {
        return '';
      }
      var result = self;
      var first_alphanum_char_index = self.search(/[a-zA-Z0-9]/);
      var carry = false;
      var code;
      while (i--) {
        code = self.charCodeAt(i);
        if ((code >= 48 && code <= 57) ||
          (code >= 65 && code <= 90) ||
          (code >= 97 && code <= 122)) {
          switch (code) {
          case 57:
            carry = true;
            code = 48;
            break;
          case 90:
            carry = true;
            code = 65;
            break;
          case 122:
            carry = true;
            code = 97;
            break;
          default:
            carry = false;
            code += 1;
          }
        } else {
          if (first_alphanum_char_index === -1) {
            if (code === 255) {
              carry = true;
              code = 0;
            } else {
              carry = false;
              code += 1;
            }
          } else {
            carry = true;
          }
        }
        result = result.slice(0, i) + String.fromCharCode(code) + result.slice(i + 1);
        if (carry && (i === 0 || i === first_alphanum_char_index)) {
          switch (code) {
          case 65:
            break;
          case 97:
            break;
          default:
            code += 1;
          }
          if (i === 0) {
            result = String.fromCharCode(code) + result;
          } else {
            result = result.slice(0, i) + String.fromCharCode(code) + result.slice(i);
          }
          carry = false;
        }
        if (!carry) {
          break;
        }
      }
      return result;
    
    };

    Opal.defn(self, '$next!', def['$<<']);

    def.$oct = function() {
      var self = this;

      
      var result,
          string = self,
          radix = 8;

      if (/^\s*_/.test(string)) {
        return 0;
      }

      string = string.replace(/^(\s*[+-]?)(0[bodx]?)(.+)$/i, function (original, head, flag, tail) {
        switch (tail.charAt(0)) {
        case '+':
        case '-':
          return original;
        case '0':
          if (tail.charAt(1) === 'x' && flag === '0x') {
            return original;
          }
        }
        switch (flag) {
        case '0b':
          radix = 2;
          break;
        case '0':
        case '0o':
          radix = 8;
          break;
        case '0d':
          radix = 10;
          break;
        case '0x':
          radix = 16;
          break;
        }
        return head + tail;
      });

      result = parseInt(string.replace(/_(?!_)/g, ''), radix);
      return isNaN(result) ? 0 : result;
    
    };

    def.$ord = function() {
      var self = this;

      return self.charCodeAt(0);
    };

    def.$partition = function(sep) {
      var self = this;

      
      var i, m;

      if (sep.$$is_regexp) {
        m = sep.exec(self);
        if (m === null) {
          i = -1;
        } else {
          $scope.get('MatchData').$new(sep, m);
          sep = m[0];
          i = m.index;
        }
      } else {
        sep = $scope.get('Opal').$coerce_to(sep, $scope.get('String'), "to_str");
        i = self.indexOf(sep);
      }

      if (i === -1) {
        return [self, '', ''];
      }

      return [
        self.slice(0, i),
        self.slice(i, i + sep.length),
        self.slice(i + sep.length)
      ];
    
    };

    def.$reverse = function() {
      var self = this;

      return self.split('').reverse().join('');
    };

    Opal.defn(self, '$reverse!', def['$<<']);

    def.$rindex = function(search, offset) {
      var self = this;

      
      var i, m, r, _m;

      if (offset === undefined) {
        offset = self.length;
      } else {
        offset = $scope.get('Opal').$coerce_to(offset, $scope.get('Integer'), "to_int");
        if (offset < 0) {
          offset += self.length;
          if (offset < 0) {
            return nil;
          }
        }
      }

      if (search.$$is_regexp) {
        m = null;
        r = new RegExp(search.source, 'gm' + (search.ignoreCase ? 'i' : ''));
        while (true) {
          _m = r.exec(self);
          if (_m === null || _m.index > offset) {
            break;
          }
          m = _m;
          r.lastIndex = m.index + 1;
        }
        if (m === null) {
          $gvars["~"] = nil
          i = -1;
        } else {
          $scope.get('MatchData').$new(r, m);
          i = m.index;
        }
      } else {
        search = $scope.get('Opal').$coerce_to(search, $scope.get('String'), "to_str");
        i = self.lastIndexOf(search, offset);
      }

      return i === -1 ? nil : i;
    
    };

    def.$rjust = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = $scope.get('Opal').$coerce_to(width, $scope.get('Integer'), "to_int");
      padstr = $scope.get('Opal').$coerce_to(padstr, $scope.get('String'), "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self};
      
      var chars     = Math.floor(width - self.length),
          patterns  = Math.floor(chars / padstr.length),
          result    = Array(patterns + 1).join(padstr),
          remaining = chars - result.length;

      return result + padstr.slice(0, remaining) + self;
    
    };

    def.$rpartition = function(sep) {
      var self = this;

      
      var i, m, r, _m;

      if (sep.$$is_regexp) {
        m = null;
        r = new RegExp(sep.source, 'gm' + (sep.ignoreCase ? 'i' : ''));

        while (true) {
          _m = r.exec(self);
          if (_m === null) {
            break;
          }
          m = _m;
          r.lastIndex = m.index + 1;
        }

        if (m === null) {
          i = -1;
        } else {
          $scope.get('MatchData').$new(r, m);
          sep = m[0];
          i = m.index;
        }

      } else {
        sep = $scope.get('Opal').$coerce_to(sep, $scope.get('String'), "to_str");
        i = self.lastIndexOf(sep);
      }

      if (i === -1) {
        return ['', '', self];
      }

      return [
        self.slice(0, i),
        self.slice(i, i + sep.length),
        self.slice(i + sep.length)
      ];
    
    };

    def.$rstrip = function() {
      var self = this;

      return self.replace(/[\s\u0000]*$/, '');
    };

    def.$scan = TMP_7 = function(pattern) {
      var self = this, $iter = TMP_7.$$p, block = $iter || nil;

      TMP_7.$$p = null;
      
      var result = [],
          match_data = nil,
          match;

      if (pattern.$$is_regexp) {
        pattern = new RegExp(pattern.source, 'gm' + (pattern.ignoreCase ? 'i' : ''));
      } else {
        pattern = $scope.get('Opal').$coerce_to(pattern, $scope.get('String'), "to_str");
        pattern = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gm');
      }

      while ((match = pattern.exec(self)) != null) {
        match_data = $scope.get('MatchData').$new(pattern, match);
        if (block === nil) {
          match.length == 1 ? result.push(match[0]) : result.push((match_data).$captures());
        } else {
          match.length == 1 ? block(match[0]) : block.call(self, (match_data).$captures());
        }
        if (pattern.lastIndex === match.index) {
          pattern.lastIndex += 1;
        }
      }

      $gvars["~"] = match_data

      return (block !== nil ? self : result);
    
    };

    Opal.defn(self, '$size', def.$length);

    Opal.defn(self, '$slice', def['$[]']);

    Opal.defn(self, '$slice!', def['$<<']);

    def.$split = function(pattern, limit) {
      var $a, self = this;
      if ($gvars[";"] == null) $gvars[";"] = nil;

      
      if (self.length === 0) {
        return [];
      }

      if (limit === undefined) {
        limit = 0;
      } else {
        limit = $scope.get('Opal')['$coerce_to!'](limit, $scope.get('Integer'), "to_int");
        if (limit === 1) {
          return [self];
        }
      }

      if (pattern === undefined || pattern === nil) {
        pattern = ((($a = $gvars[";"]) !== false && $a !== nil) ? $a : " ");
      }

      var result = [],
          string = self.toString(),
          index = 0,
          match,
          i;

      if (pattern.$$is_regexp) {
        pattern = new RegExp(pattern.source, 'gm' + (pattern.ignoreCase ? 'i' : ''));
      } else {
        pattern = $scope.get('Opal').$coerce_to(pattern, $scope.get('String'), "to_str").$to_s();
        if (pattern === ' ') {
          pattern = /\s+/gm;
          string = string.replace(/^\s+/, '');
        } else {
          pattern = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gm');
        }
      }

      result = string.split(pattern);

      if (result.length === 1 && result[0] === string) {
        return result;
      }

      while ((i = result.indexOf(undefined)) !== -1) {
        result.splice(i, 1);
      }

      if (limit === 0) {
        while (result[result.length - 1] === '') {
          result.length -= 1;
        }
        return result;
      }

      match = pattern.exec(string);

      if (limit < 0) {
        if (match !== null && match[0] === '' && pattern.source.indexOf('(?=') === -1) {
          for (i = 0; i < match.length; i++) {
            result.push('');
          }
        }
        return result;
      }

      if (match !== null && match[0] === '') {
        result.splice(limit - 1, result.length - 1, result.slice(limit - 1).join(''));
        return result;
      }

      i = 0;
      while (match !== null) {
        i++;
        index = pattern.lastIndex;
        if (i + 1 === limit) {
          break;
        }
        match = pattern.exec(string);
      }

      result.splice(limit - 1, result.length - 1, string.slice(index));
      return result;
    
    };

    def.$squeeze = function(sets) {
      var self = this;

      sets = $slice.call(arguments, 0);
      
      if (sets.length === 0) {
        return self.replace(/(.)\1+/g, '$1');
      }
      var char_class = char_class_from_char_sets(sets);
      if (char_class === null) {
        return self;
      }
      return self.replace(new RegExp('(' + char_class + ')\\1+', 'g'), '$1');
    
    };

    Opal.defn(self, '$squeeze!', def['$<<']);

    def['$start_with?'] = function(prefixes) {
      var self = this;

      prefixes = $slice.call(arguments, 0);
      
      for (var i = 0, length = prefixes.length; i < length; i++) {
        var prefix = $scope.get('Opal').$coerce_to(prefixes[i], $scope.get('String'), "to_str").$to_s();

        if (self.indexOf(prefix) === 0) {
          return true;
        }
      }

      return false;
    
    };

    def.$strip = function() {
      var self = this;

      return self.replace(/^\s*/, '').replace(/[\s\u0000]*$/, '');
    };

    Opal.defn(self, '$strip!', def['$<<']);

    def.$sub = TMP_8 = function(pattern, replacement) {
      var self = this, $iter = TMP_8.$$p, block = $iter || nil;

      TMP_8.$$p = null;
      
      if (!pattern.$$is_regexp) {
        pattern = $scope.get('Opal').$coerce_to(pattern, $scope.get('String'), "to_str");
        pattern = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      }

      var result = pattern.exec(self);

      if (result === null) {
        $gvars["~"] = nil
        return self.toString();
      }

      $scope.get('MatchData').$new(pattern, result)

      if (replacement === undefined) {
        if (block === nil) {
          self.$raise($scope.get('ArgumentError'), "wrong number of arguments (1 for 2)")
        }
        return self.slice(0, result.index) + block(result[0]) + self.slice(result.index + result[0].length);
      }

      if (replacement.$$is_hash) {
        return self.slice(0, result.index) + (replacement)['$[]'](result[0]).$to_s() + self.slice(result.index + result[0].length);
      }

      replacement = $scope.get('Opal').$coerce_to(replacement, $scope.get('String'), "to_str");

      replacement = replacement.replace(/([\\]+)([0-9+&`'])/g, function (original, slashes, command) {
        if (slashes.length % 2 === 0) {
          return original;
        }
        switch (command) {
        case "+":
          for (var i = result.length - 1; i > 0; i--) {
            if (result[i] !== undefined) {
              return slashes.slice(1) + result[i];
            }
          }
          return '';
        case "&": return slashes.slice(1) + result[0];
        case "`": return slashes.slice(1) + self.slice(0, result.index);
        case "'": return slashes.slice(1) + self.slice(result.index + result[0].length);
        default:  return slashes.slice(1) + (result[command] || '');
        }
      }).replace(/\\\\/g, '\\');

      return self.slice(0, result.index) + replacement + self.slice(result.index + result[0].length);
    ;
    };

    Opal.defn(self, '$sub!', def['$<<']);

    Opal.defn(self, '$succ', def.$next);

    Opal.defn(self, '$succ!', def['$<<']);

    def.$sum = function(n) {
      var self = this;

      if (n == null) {
        n = 16
      }
      
      n = $scope.get('Opal').$coerce_to(n, $scope.get('Integer'), "to_int");

      var result = 0,
          length = self.length,
          i = 0;

      for (; i < length; i++) {
        result += self.charCodeAt(i);
      }

      if (n <= 0) {
        return result;
      }

      return result & (Math.pow(2, n) - 1);
    ;
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

    Opal.defn(self, '$swapcase!', def['$<<']);

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
      
      var result,
          string = self.toLowerCase(),
          radix = $scope.get('Opal').$coerce_to(base, $scope.get('Integer'), "to_int");

      if (radix === 1 || radix < 0 || radix > 36) {
        self.$raise($scope.get('ArgumentError'), "invalid radix " + (radix))
      }

      if (/^\s*_/.test(string)) {
        return 0;
      }

      string = string.replace(/^(\s*[+-]?)(0[bodx]?)(.+)$/, function (original, head, flag, tail) {
        switch (tail.charAt(0)) {
        case '+':
        case '-':
          return original;
        case '0':
          if (tail.charAt(1) === 'x' && flag === '0x' && (radix === 0 || radix === 16)) {
            return original;
          }
        }
        switch (flag) {
        case '0b':
          if (radix === 0 || radix === 2) {
            radix = 2;
            return head + tail;
          }
          break;
        case '0':
        case '0o':
          if (radix === 0 || radix === 8) {
            radix = 8;
            return head + tail;
          }
          break;
        case '0d':
          if (radix === 0 || radix === 10) {
            radix = 10;
            return head + tail;
          }
          break;
        case '0x':
          if (radix === 0 || radix === 16) {
            radix = 16;
            return head + tail;
          }
          break;
        }
        return original
      });

      result = parseInt(string.replace(/_(?!_)/g, ''), radix);
      return isNaN(result) ? 0 : result;
    ;
    };

    def.$to_proc = function() {
      var $a, $b, TMP_9, self = this, sym = nil;

      sym = self;
      return ($a = ($b = self).$proc, $a.$$p = (TMP_9 = function(args){var self = TMP_9.$$s || this, block, $a, $b, obj = nil;
args = $slice.call(arguments, 0);
        block = TMP_9.$$p || nil, TMP_9.$$p = null;
      if ((($a = args['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.$raise($scope.get('ArgumentError'), "no receiver given")};
        obj = args.$shift();
        return ($a = ($b = obj).$__send__, $a.$$p = block.$to_proc(), $a).apply($b, [sym].concat(args));}, TMP_9.$$s = self, TMP_9), $a).call($b);
    };

    def.$to_s = function() {
      var self = this;

      return self.toString();
    };

    Opal.defn(self, '$to_str', def.$to_s);

    Opal.defn(self, '$to_sym', def.$intern);

    def.$tr = function(from, to) {
      var self = this;

      from = $scope.get('Opal').$coerce_to(from, $scope.get('String'), "to_str").$to_s();
      to = $scope.get('Opal').$coerce_to(to, $scope.get('String'), "to_str").$to_s();
      
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
      if (from_chars[0] === '^' && from_chars.length > 1) {
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
          var start = last_from.charCodeAt(0);
          var end = ch.charCodeAt(0);
          if (start > end) {
            self.$raise($scope.get('ArgumentError'), "invalid range \"" + (String.fromCharCode(start)) + "-" + (String.fromCharCode(end)) + "\" in string transliteration")
          }
          for (var c = start + 1; c < end; c++) {
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
              var start = last_from.charCodeAt(0);
              var end = ch.charCodeAt(0);
              if (start > end) {
                self.$raise($scope.get('ArgumentError'), "invalid range \"" + (String.fromCharCode(start)) + "-" + (String.fromCharCode(end)) + "\" in string transliteration")
              }
              for (var c = start + 1; c < end; c++) {
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

    Opal.defn(self, '$tr!', def['$<<']);

    def.$tr_s = function(from, to) {
      var self = this;

      from = $scope.get('Opal').$coerce_to(from, $scope.get('String'), "to_str").$to_s();
      to = $scope.get('Opal').$coerce_to(to, $scope.get('String'), "to_str").$to_s();
      
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
      if (from_chars[0] === '^' && from_chars.length > 1) {
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
          var start = last_from.charCodeAt(0);
          var end = ch.charCodeAt(0);
          if (start > end) {
            self.$raise($scope.get('ArgumentError'), "invalid range \"" + (String.fromCharCode(start)) + "-" + (String.fromCharCode(end)) + "\" in string transliteration")
          }
          for (var c = start + 1; c < end; c++) {
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
              var start = last_from.charCodeAt(0);
              var end = ch.charCodeAt(0);
              if (start > end) {
                self.$raise($scope.get('ArgumentError'), "invalid range \"" + (String.fromCharCode(start)) + "-" + (String.fromCharCode(end)) + "\" in string transliteration")
              }
              for (var c = start + 1; c < end; c++) {
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

    Opal.defn(self, '$tr_s!', def['$<<']);

    def.$upcase = function() {
      var self = this;

      return self.toUpperCase();
    };

    Opal.defn(self, '$upcase!', def['$<<']);

    def.$freeze = function() {
      var self = this;

      return self;
    };

    def['$frozen?'] = function() {
      var self = this;

      return true;
    };

    def.$upto = TMP_10 = function(stop, excl) {
      var self = this, $iter = TMP_10.$$p, block = $iter || nil;

      if (excl == null) {
        excl = false
      }
      TMP_10.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("upto", stop, excl)
      };
      stop = $scope.get('Opal').$coerce_to(stop, $scope.get('String'), "to_str");
      
      var a, b, s = self.toString();

      if (s.length === 1 && stop.length === 1) {

        a = s.charCodeAt(0);
        b = stop.charCodeAt(0);

        while (a <= b) {
          if (excl && a === b) {
            break;
          }
          block(String.fromCharCode(a));
          a += 1;
        }

      } else if (parseInt(s).toString() === s && parseInt(stop).toString() === stop) {

        a = parseInt(s);
        b = parseInt(stop);

        while (a <= b) {
          if (excl && a === b) {
            break;
          }
          block(a.toString());
          a += 1;
        }

      } else {

        while (s.length <= stop.length && s <= stop) {
          if (excl && s === stop) {
            break;
          }
          block(s);
          s = (s).$succ();
        }

      }
      return self;
    
    };

    
    function char_class_from_char_sets(sets) {
      function explode_sequences_in_character_set(set) {
        var result = '',
            i, len = set.length,
            curr_char,
            skip_next_dash,
            char_code_from,
            char_code_upto,
            char_code;
        for (i = 0; i < len; i++) {
          curr_char = set.charAt(i);
          if (curr_char === '-' && i > 0 && i < (len - 1) && !skip_next_dash) {
            char_code_from = set.charCodeAt(i - 1);
            char_code_upto = set.charCodeAt(i + 1);
            if (char_code_from > char_code_upto) {
              self.$raise($scope.get('ArgumentError'), "invalid range \"" + (char_code_from) + "-" + (char_code_upto) + "\" in string transliteration")
            }
            for (char_code = char_code_from + 1; char_code < char_code_upto + 1; char_code++) {
              result += String.fromCharCode(char_code);
            }
            skip_next_dash = true;
            i++;
          } else {
            skip_next_dash = (curr_char === '\\');
            result += curr_char;
          }
        }
        return result;
      }

      function intersection(setA, setB) {
        if (setA.length === 0) {
          return setB;
        }
        var result = '',
            i, len = setA.length,
            chr;
        for (i = 0; i < len; i++) {
          chr = setA.charAt(i);
          if (setB.indexOf(chr) !== -1) {
            result += chr;
          }
        }
        return result;
      }

      var i, len, set, neg, chr, tmp,
          pos_intersection = '',
          neg_intersection = '';

      for (i = 0, len = sets.length; i < len; i++) {
        set = $scope.get('Opal').$coerce_to(sets[i], $scope.get('String'), "to_str");
        neg = (set.charAt(0) === '^' && set.length > 1);
        set = explode_sequences_in_character_set(neg ? set.slice(1) : set);
        if (neg) {
          neg_intersection = intersection(neg_intersection, set);
        } else {
          pos_intersection = intersection(pos_intersection, set);
        }
      }

      if (pos_intersection.length > 0 && neg_intersection.length > 0) {
        tmp = '';
        for (i = 0, len = pos_intersection.length; i < len; i++) {
          chr = pos_intersection.charAt(i);
          if (neg_intersection.indexOf(chr) === -1) {
            tmp += chr;
          }
        }
        pos_intersection = tmp;
        neg_intersection = '';
      }

      if (pos_intersection.length > 0) {
        return '[' + $scope.get('Regexp').$escape(pos_intersection) + ']';
      }

      if (neg_intersection.length > 0) {
        return '[^' + $scope.get('Regexp').$escape(neg_intersection) + ']';
      }

      return null;
    }
  
  })(self, null);
  return Opal.cdecl($scope, 'Symbol', $scope.get('String'));
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/string/inheritance"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $gvars = Opal.gvars;

  Opal.add_stubs(['$new', '$allocate', '$initialize', '$to_proc', '$__send__', '$class', '$clone', '$respond_to?', '$==', '$inspect', '$map', '$split', '$enum_for', '$each_line', '$to_a', '$%']);
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self.$$proto, $scope = self.$$scope;

    return (Opal.defs(self, '$inherited', function(klass) {
      var self = this, replace = nil;

      replace = $scope.get('Class').$new((($scope.get('String')).$$scope.get('Wrapper')));
      
      klass.$$proto         = replace.$$proto;
      klass.$$proto.$$class = klass;
      klass.$$alloc         = replace.$$alloc;
      klass.$$parent        = (($scope.get('String')).$$scope.get('Wrapper'));

      klass.$allocate = replace.$allocate;
      klass.$new      = replace.$new;
    
    }), nil) && 'inherited'
  })(self, null);
  return (function($base, $super) {
    function $Wrapper(){};
    var self = $Wrapper = $klass($base, $super, 'Wrapper', $Wrapper);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_6, TMP_8;

    def.literal = nil;
    def.$$is_string = true;

    Opal.defs(self, '$allocate', TMP_1 = function(string) {
      var self = this, $iter = TMP_1.$$p, $yield = $iter || nil, obj = nil;

      if (string == null) {
        string = ""
      }
      TMP_1.$$p = null;
      obj = Opal.find_super_dispatcher(self, 'allocate', TMP_1, null, $Wrapper).apply(self, []);
      obj.literal = string;
      return obj;
    });

    Opal.defs(self, '$new', TMP_2 = function(args) {
      var $a, $b, self = this, $iter = TMP_2.$$p, block = $iter || nil, obj = nil;

      args = $slice.call(arguments, 0);
      TMP_2.$$p = null;
      obj = self.$allocate();
      ($a = ($b = obj).$initialize, $a.$$p = block.$to_proc(), $a).apply($b, [].concat(args));
      return obj;
    });

    Opal.defs(self, '$[]', function(objects) {
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
      var $a, $b, self = this, $iter = TMP_3.$$p, block = $iter || nil, result = nil;

      args = $slice.call(arguments, 0);
      TMP_3.$$p = null;
      result = ($a = ($b = self.literal).$__send__, $a.$$p = block.$to_proc(), $a).apply($b, [].concat(args));
      if ((($a = result.$$is_string != null) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ((($a = result == self.literal) !== nil && (!$a.$$is_boolean || $a == true))) {
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
      var $a, self = this, $iter = TMP_4.$$p, $yield = $iter || nil;

      TMP_4.$$p = null;
      return ((($a = Opal.find_super_dispatcher(self, 'respond_to?', TMP_4, $iter).apply(self, $zuper)) !== false && $a !== nil) ? $a : self.literal['$respond_to?'](name));
    };

    def['$=='] = function(other) {
      var self = this;

      return self.literal['$=='](other);
    };

    Opal.defn(self, '$eql?', def['$==']);

    Opal.defn(self, '$===', def['$==']);

    def.$to_s = function() {
      var self = this;

      return self.literal;
    };

    Opal.defn(self, '$to_str', def.$to_s);

    def.$inspect = function() {
      var self = this;

      return self.literal.$inspect();
    };

    def['$+'] = function(other) {
      var self = this;

      return $rb_plus(self.literal, other);
    };

    def['$*'] = function(other) {
      var self = this;

      
      var result = $rb_times(self.literal, other);

      if (result.$$is_string) {
        return self.$class().$allocate(result)
      }
      else {
        return result;
      }
    ;
    };

    def.$split = function(pattern, limit) {
      var $a, $b, TMP_5, self = this;

      return ($a = ($b = self.literal.$split(pattern, limit)).$map, $a.$$p = (TMP_5 = function(str){var self = TMP_5.$$s || this;
if (str == null) str = nil;
      return self.$class().$allocate(str)}, TMP_5.$$s = self, TMP_5), $a).call($b);
    };

    def.$replace = function(string) {
      var self = this;

      return self.literal = string;
    };

    def.$each_line = TMP_6 = function(separator) {
      var $a, $b, TMP_7, self = this, $iter = TMP_6.$$p, $yield = $iter || nil;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      TMP_6.$$p = null;
      if (($yield !== nil)) {
        } else {
        return self.$enum_for("each_line", separator)
      };
      return ($a = ($b = self.literal).$each_line, $a.$$p = (TMP_7 = function(str){var self = TMP_7.$$s || this, $a;
if (str == null) str = nil;
      return $a = Opal.yield1($yield, self.$class().$allocate(str)), $a === $breaker ? $a : $a}, TMP_7.$$s = self, TMP_7), $a).call($b, separator);
    };

    def.$lines = TMP_8 = function(separator) {
      var $a, $b, self = this, $iter = TMP_8.$$p, block = $iter || nil, e = nil;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      TMP_8.$$p = null;
      e = ($a = ($b = self).$each_line, $a.$$p = block.$to_proc(), $a).call($b, separator);
      if (block !== false && block !== nil) {
        return self
        } else {
        return e.$to_a()
      };
    };

    return (def['$%'] = function(data) {
      var self = this;

      return self.literal['$%'](data);
    }, nil) && '%';
  })($scope.get('String'), null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/match_data"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $gvars = Opal.gvars;

  Opal.add_stubs(['$attr_reader', '$[]', '$raise', '$===', '$inspect', '$to_a', '$coerce_to!']);
  return (function($base, $super) {
    function $MatchData(){};
    var self = $MatchData = $klass($base, $super, 'MatchData', $MatchData);

    var def = self.$$proto, $scope = self.$$scope;

    def.matches = nil;
    self.$attr_reader("post_match", "pre_match", "regexp", "string");

    def.$initialize = function(regexp, match_groups) {
      var self = this;

      $gvars["~"] = self;
      self.regexp = regexp;
      self.begin = match_groups.index;
      self.string = match_groups.input;
      self.pre_match = match_groups.input.slice(0, match_groups.index);
      self.post_match = match_groups.input.slice(match_groups.index + match_groups[0].length);
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

    def.$offset = function(n) {
      var self = this;

      
      if (n !== 0) {
        self.$raise($scope.get('ArgumentError'), "MatchData#offset only supports 0th element")
      }
      return [self.begin, self.begin + self.matches[n].length];
    ;
    };

    def['$=='] = function(other) {
      var $a, $b, $c, $d, self = this;

      if ((($a = $scope.get('MatchData')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        return false
      };
      return ($a = ($b = ($c = ($d = self.string == other.string, $d !== false && $d !== nil ?self.regexp.toString() == other.regexp.toString() : $d), $c !== false && $c !== nil ?self.pre_match == other.pre_match : $c), $b !== false && $b !== nil ?self.post_match == other.post_match : $b), $a !== false && $a !== nil ?self.begin == other.begin : $a);
    };

    Opal.defn(self, '$eql?', def['$==']);

    def.$begin = function(n) {
      var self = this;

      
      if (n !== 0) {
        self.$raise($scope.get('ArgumentError'), "MatchData#begin only supports 0th element")
      }
      return self.begin;
    ;
    };

    def.$end = function(n) {
      var self = this;

      
      if (n !== 0) {
        self.$raise($scope.get('ArgumentError'), "MatchData#end only supports 0th element")
      }
      return self.begin + self.matches[n].length;
    ;
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

    Opal.defn(self, '$size', def.$length);

    def.$to_a = function() {
      var self = this;

      return self.matches;
    };

    def.$to_s = function() {
      var self = this;

      return self.matches[0];
    };

    return (def.$values_at = function(args) {
      var self = this;

      args = $slice.call(arguments, 0);
      
      var i, a, index, values = [];

      for (i = 0; i < args.length; i++) {

        if (args[i].$$is_range) {
          a = (args[i]).$to_a();
          a.unshift(i, 1);
          Array.prototype.splice.apply(args, a);
        }

        index = $scope.get('Opal')['$coerce_to!'](args[i], $scope.get('Integer'), "to_int");

        if (index < 0) {
          index += self.matches.length;
          if (index < 0) {
            values.push(nil);
            continue;
          }
        }

        values.push(self.matches[index]);
      }

      return values;
    
    }, nil) && 'values_at';
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/numeric"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$require', '$include', '$coerce', '$===', '$raise', '$class', '$__send__', '$send_coerced', '$coerce_to!', '$-@', '$**', '$respond_to?', '$==', '$enum_for', '$gcd', '$lcm', '$floor', '$%']);
  self.$require("corelib/comparable");
  (function($base, $super) {
    function $Numeric(){};
    var self = $Numeric = $klass($base, $super, 'Numeric', $Numeric);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6;

    self.$include($scope.get('Comparable'));

    def.$$is_number = true;

    def.$__id__ = function() {
      var self = this;

      return (self * 2) + 1;
    };

    Opal.defn(self, '$object_id', def.$__id__);

    def.$coerce = function(other, type) {
      var self = this, $case = nil;

      if (type == null) {
        type = "operation"
      }
      try {
      
      if (other.$$is_number) {
        return [self, other];
      }
      else {
        return other.$coerce(self);
      }
    
      } catch ($err) {if (true) {
        return (function() {$case = type;if ("operation"['$===']($case)) {return self.$raise($scope.get('TypeError'), "" + (other.$class()) + " can't be coerced into Numeric")}else if ("comparison"['$===']($case)) {return self.$raise($scope.get('ArgumentError'), "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")}else { return nil }})()
        }else { throw $err; }
      };
    };

    def.$send_coerced = function(method, other) {
      var $a, self = this, type = nil, $case = nil, a = nil, b = nil;

      type = (function() {$case = method;if ("+"['$===']($case) || "-"['$===']($case) || "*"['$===']($case) || "/"['$===']($case) || "%"['$===']($case) || "&"['$===']($case) || "|"['$===']($case) || "^"['$===']($case) || "**"['$===']($case)) {return "operation"}else if (">"['$===']($case) || ">="['$===']($case) || "<"['$===']($case) || "<="['$===']($case) || "<=>"['$===']($case)) {return "comparison"}else { return nil }})();
      $a = Opal.to_ary(self.$coerce(other, type)), a = ($a[0] == null ? nil : $a[0]), b = ($a[1] == null ? nil : $a[1]);
      return a.$__send__(method, b);
    };

    def['$+'] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self + other;
      }
      else {
        return self.$send_coerced("+", other);
      }
    
    };

    def['$-'] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self - other;
      }
      else {
        return self.$send_coerced("-", other);
      }
    
    };

    def['$*'] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self * other;
      }
      else {
        return self.$send_coerced("*", other);
      }
    
    };

    def['$/'] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self / other;
      }
      else {
        return self.$send_coerced("/", other);
      }
    
    };

    def['$%'] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
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

      
      if (other.$$is_number) {
        return self & other;
      }
      else {
        return self.$send_coerced("&", other);
      }
    
    };

    def['$|'] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self | other;
      }
      else {
        return self.$send_coerced("|", other);
      }
    
    };

    def['$^'] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self ^ other;
      }
      else {
        return self.$send_coerced("^", other);
      }
    
    };

    def['$<'] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self < other;
      }
      else {
        return self.$send_coerced("<", other);
      }
    
    };

    def['$<='] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self <= other;
      }
      else {
        return self.$send_coerced("<=", other);
      }
    
    };

    def['$>'] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self > other;
      }
      else {
        return self.$send_coerced(">", other);
      }
    
    };

    def['$>='] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
        return self >= other;
      }
      else {
        return self.$send_coerced(">=", other);
      }
    
    };

    def['$<=>'] = function(other) {
      var self = this;

      try {
      
      if (other.$$is_number) {
        return self > other ? 1 : (self < other ? -1 : 0);
      }
      else {
        return self.$send_coerced("<=>", other);
      }
    
      } catch ($err) {if (Opal.rescue($err, [$scope.get('ArgumentError')])) {
        return nil
        }else { throw $err; }
      };
    };

    def['$<<'] = function(count) {
      var self = this;

      count = $scope.get('Opal')['$coerce_to!'](count, $scope.get('Integer'), "to_int");
      return count > 0 ? self << count : self >> -count;
    };

    def['$>>'] = function(count) {
      var self = this;

      count = $scope.get('Opal')['$coerce_to!'](count, $scope.get('Integer'), "to_int");
      return count > 0 ? self >> count : self << -count;
    };

    def['$[]'] = function(bit) {
      var self = this, min = nil, max = nil;

      bit = $scope.get('Opal')['$coerce_to!'](bit, $scope.get('Integer'), "to_int");
      min = ((2)['$**'](30))['$-@']();
      max = $rb_minus(((2)['$**'](30)), 1);
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

      
      if (other.$$is_number) {
        return Math.pow(self, other);
      }
      else {
        return self.$send_coerced("**", other);
      }
    
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (other.$$is_number) {
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

    def.$chr = function(encoding) {
      var self = this;

      return String.fromCharCode(self);
    };

    def.$conj = function() {
      var self = this;

      return self;
    };

    Opal.defn(self, '$conjugate', def.$conj);

    def.$downto = TMP_1 = function(finish) {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      TMP_1.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("downto", finish)
      };
      
      if (!finish.$$is_number) {
        self.$raise($scope.get('ArgumentError'), "comparison of " + (self.$class()) + " with " + (finish.$class()) + " failed")
      }
      for (var i = self; i >= finish; i--) {
        if (block(i) === $breaker) {
          return $breaker.$v;
        }
      }
    ;
      return self;
    };

    Opal.defn(self, '$eql?', def['$==']);

    def['$equal?'] = function(other) {
      var $a, self = this;

      return ((($a = self['$=='](other)) !== false && $a !== nil) ? $a : isNaN(self) && isNaN(other));
    };

    def['$even?'] = function() {
      var self = this;

      return self % 2 === 0;
    };

    def.$floor = function() {
      var self = this;

      return Math.floor(self);
    };

    def.$gcd = function(other) {
      var $a, self = this;

      if ((($a = $scope.get('Integer')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('TypeError'), "not an integer")
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

      return 'Numeric:'+self.toString();
    };

    def['$integer?'] = function() {
      var self = this;

      return self % 1 === 0;
    };

    def['$is_a?'] = TMP_2 = function(klass) {var $zuper = $slice.call(arguments, 0);
      var $a, $b, self = this, $iter = TMP_2.$$p, $yield = $iter || nil;

      TMP_2.$$p = null;
      if ((($a = (($b = klass['$==']($scope.get('Fixnum'))) ? $scope.get('Integer')['$==='](self) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']($scope.get('Integer'))) ? $scope.get('Integer')['$==='](self) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']($scope.get('Float'))) ? $scope.get('Float')['$==='](self) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return true};
      return Opal.find_super_dispatcher(self, 'is_a?', TMP_2, $iter).apply(self, $zuper);
    };

    Opal.defn(self, '$kind_of?', def['$is_a?']);

    def['$instance_of?'] = TMP_3 = function(klass) {var $zuper = $slice.call(arguments, 0);
      var $a, $b, self = this, $iter = TMP_3.$$p, $yield = $iter || nil;

      TMP_3.$$p = null;
      if ((($a = (($b = klass['$==']($scope.get('Fixnum'))) ? $scope.get('Integer')['$==='](self) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']($scope.get('Integer'))) ? $scope.get('Integer')['$==='](self) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']($scope.get('Float'))) ? $scope.get('Float')['$==='](self) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return true};
      return Opal.find_super_dispatcher(self, 'instance_of?', TMP_3, $iter).apply(self, $zuper);
    };

    def.$lcm = function(other) {
      var $a, self = this;

      if ((($a = $scope.get('Integer')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('TypeError'), "not an integer")
      };
      
      if (self == 0 || other == 0) {
        return 0;
      }
      else {
        return Math.abs(self * other / self.$gcd(other));
      }
    
    };

    Opal.defn(self, '$magnitude', def.$abs);

    Opal.defn(self, '$modulo', def['$%']);

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

    def.$round = function(ndigits) {
      var self = this;

      if (ndigits == null) {
        ndigits = 0
      }
      
      var scale = Math.pow(10, ndigits);
      return Math.round(self * scale) / scale;
    
    };

    def.$step = TMP_4 = function(limit, step) {
      var $a, self = this, $iter = TMP_4.$$p, block = $iter || nil;

      if (step == null) {
        step = 1
      }
      TMP_4.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("step", limit, step)
      };
      if ((($a = step == 0) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "step cannot be 0")};
      
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

    Opal.defn(self, '$succ', def.$next);

    def.$times = TMP_5 = function() {
      var self = this, $iter = TMP_5.$$p, block = $iter || nil;

      TMP_5.$$p = null;
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

    Opal.defn(self, '$to_int', def.$to_i);

    def.$to_s = function(base) {
      var $a, $b, self = this;

      if (base == null) {
        base = 10
      }
      if ((($a = ((($b = $rb_lt(base, 2)) !== false && $b !== nil) ? $b : $rb_gt(base, 36))) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "base must be between 2 and 36")};
      return self.toString(base);
    };

    Opal.defn(self, '$inspect', def.$to_s);

    def.$divmod = function(rhs) {
      var self = this, q = nil, r = nil;

      q = ($rb_divide(self, rhs)).$floor();
      r = self['$%'](rhs);
      return [q, r];
    };

    def.$upto = TMP_6 = function(finish) {
      var self = this, $iter = TMP_6.$$p, block = $iter || nil;

      TMP_6.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("upto", finish)
      };
      
      if (!finish.$$is_number) {
        self.$raise($scope.get('ArgumentError'), "comparison of " + (self.$class()) + " with " + (finish.$class()) + " failed")
      }
      for (var i = self; i <= finish; i++) {
        if (block(i) === $breaker) {
          return $breaker.$v;
        }
      }
    ;
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
  Opal.cdecl($scope, 'Fixnum', $scope.get('Numeric'));
  (function($base, $super) {
    function $Integer(){};
    var self = $Integer = $klass($base, $super, 'Integer', $Integer);

    var def = self.$$proto, $scope = self.$$scope;

    return (Opal.defs(self, '$===', function(other) {
      var self = this;

      
      if (!other.$$is_number) {
        return false;
      }

      return (other % 1) === 0;
    
    }), nil) && '==='
  })(self, $scope.get('Numeric'));
  return (function($base, $super) {
    function $Float(){};
    var self = $Float = $klass($base, $super, 'Float', $Float);

    var def = self.$$proto, $scope = self.$$scope, $a;

    Opal.defs(self, '$===', function(other) {
      var self = this;

      return !!other.$$is_number;
    });

    Opal.cdecl($scope, 'INFINITY', Infinity);

    Opal.cdecl($scope, 'NAN', NaN);

    if ((($a = (typeof(Number.EPSILON) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
      return Opal.cdecl($scope, 'EPSILON', Number.EPSILON)
      } else {
      return Opal.cdecl($scope, 'EPSILON', 2.2204460492503130808472633361816E-16)
    };
  })(self, $scope.get('Numeric'));
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/complex"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  return (function($base, $super) {
    function $Complex(){};
    var self = $Complex = $klass($base, $super, 'Complex', $Complex);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('Numeric'))
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/rational"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  return (function($base, $super) {
    function $Rational(){};
    var self = $Rational = $klass($base, $super, 'Rational', $Rational);

    var def = self.$$proto, $scope = self.$$scope;

    return nil;
  })(self, $scope.get('Numeric'))
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/proc"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$raise']);
  return (function($base, $super) {
    function $Proc(){};
    var self = $Proc = $klass($base, $super, 'Proc', $Proc);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2;

    def.$$is_proc = true;

    def.$$is_lambda = false;

    Opal.defs(self, '$new', TMP_1 = function() {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      TMP_1.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        self.$raise($scope.get('ArgumentError'), "tried to create a Proc object without a block")
      };
      return block;
    });

    def.$call = TMP_2 = function(args) {
      var self = this, $iter = TMP_2.$$p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_2.$$p = null;
      
      if (block !== nil) {
        self.$$p = block;
      }

      var result;

      if (self.$$is_lambda) {
        result = self.apply(null, args);
      }
      else {
        result = Opal.yieldX(self, args);
      }

      if (result === $breaker) {
        return $breaker.$v;
      }

      return result;
    
    };

    Opal.defn(self, '$[]', def.$call);

    def.$to_proc = function() {
      var self = this;

      return self;
    };

    def['$lambda?'] = function() {
      var self = this;

      return !!self.$$is_lambda;
    };

    return (def.$arity = function() {
      var self = this;

      return self.length;
    }, nil) && 'arity';
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/method"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$attr_reader', '$class', '$arity', '$new', '$name']);
  (function($base, $super) {
    function $Method(){};
    var self = $Method = $klass($base, $super, 'Method', $Method);

    var def = self.$$proto, $scope = self.$$scope, TMP_1;

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
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_1.$$p = null;
      
      self.method.$$p = block;

      return self.method.apply(self.receiver, args);
    ;
    };

    Opal.defn(self, '$[]', def.$call);

    def.$unbind = function() {
      var self = this;

      return $scope.get('UnboundMethod').$new(self.owner, self.method, self.name);
    };

    def.$to_proc = function() {
      var self = this;

      return self.method;
    };

    return (def.$inspect = function() {
      var self = this;

      return "#<Method: " + (self.obj.$class()) + "#" + (self.name) + "}>";
    }, nil) && 'inspect';
  })(self, null);
  return (function($base, $super) {
    function $UnboundMethod(){};
    var self = $UnboundMethod = $klass($base, $super, 'UnboundMethod', $UnboundMethod);

    var def = self.$$proto, $scope = self.$$scope;

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
      var self = this;

      return $scope.get('Method').$new(object, self.method, self.name);
    };

    return (def.$inspect = function() {
      var self = this;

      return "#<UnboundMethod: " + (self.owner.$name()) + "#" + (self.name) + ">";
    }, nil) && 'inspect';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/range"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_le(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs <= rhs : lhs['$<='](rhs);
  }
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$require', '$include', '$attr_reader', '$<=>', '$raise', '$include?', '$enum_for', '$succ', '$!', '$==', '$===', '$exclude_end?', '$eql?', '$begin', '$end', '$abs', '$to_i', '$inspect']);
  self.$require("corelib/enumerable");
  return (function($base, $super) {
    function $Range(){};
    var self = $Range = $klass($base, $super, 'Range', $Range);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3;

    def.begin = def.exclude = def.end = nil;
    self.$include($scope.get('Enumerable'));

    def.$$is_range = true;

    self.$attr_reader("begin", "end");

    def.$initialize = function(first, last, exclude) {
      var $a, self = this;

      if (exclude == null) {
        exclude = false
      }
      if ((($a = first['$<=>'](last)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'))
      };
      self.begin = first;
      self.end = last;
      return self.exclude = exclude;
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (!other.$$is_range) {
        return false;
      }

      return self.exclude === other.exclude &&
             self.begin   ==  other.begin &&
             self.end     ==  other.end;
    
    };

    def['$==='] = function(value) {
      var self = this;

      return self['$include?'](value);
    };

    def['$cover?'] = function(value) {
      var $a, $b, self = this;

      return (($a = $rb_le(self.begin, value)) ? ((function() {if ((($b = self.exclude) !== nil && (!$b.$$is_boolean || $b == true))) {
        return $rb_lt(value, self.end)
        } else {
        return $rb_le(value, self.end)
      }; return nil; })()) : $a);
    };

    def.$each = TMP_1 = function() {
      var $a, $b, self = this, $iter = TMP_1.$$p, block = $iter || nil, current = nil, last = nil;

      TMP_1.$$p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      current = self.begin;
      last = self.end;
      while ($rb_lt(current, last)) {
      if (Opal.yield1(block, current) === $breaker) return $breaker.$v;
      current = current.$succ();};
      if ((($a = ($b = self.exclude['$!'](), $b !== false && $b !== nil ?current['$=='](last) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        if (Opal.yield1(block, current) === $breaker) return $breaker.$v};
      return self;
    };

    def['$eql?'] = function(other) {
      var $a, $b, self = this;

      if ((($a = $scope.get('Range')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        return false
      };
      return ($a = ($b = self.exclude['$==='](other['$exclude_end?']()), $b !== false && $b !== nil ?self.begin['$eql?'](other.$begin()) : $b), $a !== false && $a !== nil ?self.end['$eql?'](other.$end()) : $a);
    };

    def['$exclude_end?'] = function() {
      var self = this;

      return self.exclude;
    };

    Opal.defn(self, '$first', def.$begin);

    Opal.defn(self, '$include?', def['$cover?']);

    Opal.defn(self, '$last', def.$end);

    def.$max = TMP_2 = function() {var $zuper = $slice.call(arguments, 0);
      var self = this, $iter = TMP_2.$$p, $yield = $iter || nil;

      TMP_2.$$p = null;
      if (($yield !== nil)) {
        return Opal.find_super_dispatcher(self, 'max', TMP_2, $iter).apply(self, $zuper)
        } else {
        return self.exclude ? self.end - 1 : self.end;
      };
    };

    Opal.defn(self, '$member?', def['$cover?']);

    def.$min = TMP_3 = function() {var $zuper = $slice.call(arguments, 0);
      var self = this, $iter = TMP_3.$$p, $yield = $iter || nil;

      TMP_3.$$p = null;
      if (($yield !== nil)) {
        return Opal.find_super_dispatcher(self, 'min', TMP_3, $iter).apply(self, $zuper)
        } else {
        return self.begin
      };
    };

    Opal.defn(self, '$member?', def['$include?']);

    def.$size = function() {
      var $a, $b, self = this, _begin = nil, _end = nil, infinity = nil;

      _begin = self.begin;
      _end = self.end;
      if ((($a = self.exclude) !== nil && (!$a.$$is_boolean || $a == true))) {
        _end = $rb_minus(_end, 1)};
      if ((($a = ($b = $scope.get('Numeric')['$==='](_begin), $b !== false && $b !== nil ?$scope.get('Numeric')['$==='](_end) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        return nil
      };
      if ($rb_lt(_end, _begin)) {
        return 0};
      infinity = (($scope.get('Float')).$$scope.get('INFINITY'));
      if ((($a = ((($b = infinity['$=='](_begin.$abs())) !== false && $b !== nil) ? $b : _end.$abs()['$=='](infinity))) !== nil && (!$a.$$is_boolean || $a == true))) {
        return infinity};
      return ((Math.abs(_end - _begin) + 1)).$to_i();
    };

    def.$step = function(n) {
      var self = this;

      if (n == null) {
        n = 1
      }
      return self.$raise($scope.get('NotImplementedError'));
    };

    def.$to_s = function() {
      var self = this;

      return self.begin.$inspect() + (self.exclude ? '...' : '..') + self.end.$inspect();
    };

    return Opal.defn(self, '$inspect', def.$to_s);
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/time"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_le(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs <= rhs : lhs['$<='](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $range = Opal.range;

  Opal.add_stubs(['$require', '$include', '$kind_of?', '$to_i', '$coerce_to', '$between?', '$raise', '$new', '$compact', '$nil?', '$===', '$<=>', '$to_f', '$strftime', '$is_a?', '$zero?', '$wday', '$utc?', '$warn', '$year', '$mon', '$day', '$yday', '$hour', '$min', '$sec', '$rjust', '$ljust', '$zone', '$to_s', '$[]', '$cweek_cyear', '$month', '$isdst', '$private', '$!', '$==', '$ceil']);
  self.$require("corelib/comparable");
  return (function($base, $super) {
    function $Time(){};
    var self = $Time = $klass($base, $super, 'Time', $Time);

    var def = self.$$proto, $scope = self.$$scope;

    def.tz_offset = nil;
    self.$include($scope.get('Comparable'));

    
    var days_of_week = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        short_days   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        short_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        long_months  = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  ;

    Opal.defs(self, '$at', function(seconds, frac) {
      var self = this;

      if (frac == null) {
        frac = 0
      }
      return new Date(seconds * 1000 + frac);
    });

    Opal.defs(self, '$new', function(year, month, day, hour, minute, second, utc_offset) {
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

    Opal.defs(self, '$local', function(year, month, day, hour, minute, second, millisecond) {
      var $a, self = this;

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
      if ((($a = arguments.length === 10) !== nil && (!$a.$$is_boolean || $a == true))) {
        
        var args = $slice.call(arguments).reverse();

        second = args[9];
        minute = args[8];
        hour   = args[7];
        day    = args[6];
        month  = args[5];
        year   = args[4];
      };
      year = (function() {if ((($a = year['$kind_of?']($scope.get('String'))) !== nil && (!$a.$$is_boolean || $a == true))) {
        return year.$to_i()
        } else {
        return $scope.get('Opal').$coerce_to(year, $scope.get('Integer'), "to_int")
      }; return nil; })();
      month = (function() {if ((($a = month['$kind_of?']($scope.get('String'))) !== nil && (!$a.$$is_boolean || $a == true))) {
        return month.$to_i()
        } else {
        return $scope.get('Opal').$coerce_to(((($a = month) !== false && $a !== nil) ? $a : 1), $scope.get('Integer'), "to_int")
      }; return nil; })();
      if ((($a = month['$between?'](1, 12)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'), "month out of range: " + (month))
      };
      day = (function() {if ((($a = day['$kind_of?']($scope.get('String'))) !== nil && (!$a.$$is_boolean || $a == true))) {
        return day.$to_i()
        } else {
        return $scope.get('Opal').$coerce_to(((($a = day) !== false && $a !== nil) ? $a : 1), $scope.get('Integer'), "to_int")
      }; return nil; })();
      if ((($a = day['$between?'](1, 31)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'), "day out of range: " + (day))
      };
      hour = (function() {if ((($a = hour['$kind_of?']($scope.get('String'))) !== nil && (!$a.$$is_boolean || $a == true))) {
        return hour.$to_i()
        } else {
        return $scope.get('Opal').$coerce_to(((($a = hour) !== false && $a !== nil) ? $a : 0), $scope.get('Integer'), "to_int")
      }; return nil; })();
      if ((($a = hour['$between?'](0, 24)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'), "hour out of range: " + (hour))
      };
      minute = (function() {if ((($a = minute['$kind_of?']($scope.get('String'))) !== nil && (!$a.$$is_boolean || $a == true))) {
        return minute.$to_i()
        } else {
        return $scope.get('Opal').$coerce_to(((($a = minute) !== false && $a !== nil) ? $a : 0), $scope.get('Integer'), "to_int")
      }; return nil; })();
      if ((($a = minute['$between?'](0, 59)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'), "minute out of range: " + (minute))
      };
      second = (function() {if ((($a = second['$kind_of?']($scope.get('String'))) !== nil && (!$a.$$is_boolean || $a == true))) {
        return second.$to_i()
        } else {
        return $scope.get('Opal').$coerce_to(((($a = second) !== false && $a !== nil) ? $a : 0), $scope.get('Integer'), "to_int")
      }; return nil; })();
      if ((($a = second['$between?'](0, 59)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.$raise($scope.get('ArgumentError'), "second out of range: " + (second))
      };
      return ($a = self).$new.apply($a, [].concat([year, month, day, hour, minute, second].$compact()));
    });

    Opal.defs(self, '$gm', function(year, month, day, hour, minute, second, utc_offset) {
      var $a, self = this;

      if ((($a = year['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('TypeError'), "missing year (got nil)")};
      
      if (month > 12 || day > 31 || hour > 24 || minute > 59 || second > 59) {
        self.$raise($scope.get('ArgumentError'));
      }

      var date = new Date(Date.UTC(year, (month || 1) - 1, (day || 1), (hour || 0), (minute || 0), (second || 0)));
      date.tz_offset = 0
      return date;
    ;
    });

    (function(self) {
      var $scope = self.$$scope, def = self.$$proto;

      self.$$proto.$mktime = self.$$proto.$local;
      return self.$$proto.$utc = self.$$proto.$gm;
    })(self.$singleton_class());

    Opal.defs(self, '$now', function() {
      var self = this;

      return new Date();
    });

    def['$+'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.get('Time')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('TypeError'), "time + time?")};
      other = $scope.get('Opal').$coerce_to(other, $scope.get('Integer'), "to_int");
      
      var result           = new Date(self.getTime() + (other * 1000));
          result.tz_offset = self.tz_offset;

      return result;
    
    };

    def['$-'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.get('Time')['$==='](other)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return (self.getTime() - other.getTime()) / 1000};
      other = $scope.get('Opal').$coerce_to(other, $scope.get('Integer'), "to_int");
      
      var result           = new Date(self.getTime() - (other * 1000));
          result.tz_offset = self.tz_offset;

      return result;
    
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

    Opal.defn(self, '$ctime', def.$asctime);

    def.$day = function() {
      var self = this;

      
      if (self.tz_offset === 0) {
        return self.getUTCDate();
      }
      else {
        return self.getDate();
      }
    ;
    };

    def.$yday = function() {
      var self = this;

      
      // http://javascript.about.com/library/bldayyear.htm
      var onejan = new Date(self.getFullYear(), 0, 1);
      return Math.ceil((self - onejan) / 86400000);
    
    };

    def.$isdst = function() {
      var self = this;

      return self.$raise($scope.get('NotImplementedError'));
    };

    def['$eql?'] = function(other) {
      var $a, self = this;

      return ($a = other['$is_a?']($scope.get('Time')), $a !== false && $a !== nil ?(self['$<=>'](other))['$zero?']() : $a);
    };

    def['$friday?'] = function() {
      var self = this;

      return self.$wday() == 5;
    };

    def.$hour = function() {
      var self = this;

      
      if (self.tz_offset === 0) {
        return self.getUTCHours();
      }
      else {
        return self.getHours();
      }
    ;
    };

    def.$inspect = function() {
      var $a, self = this;

      if ((($a = self['$utc?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.$strftime("%Y-%m-%d %H:%M:%S UTC")
        } else {
        return self.$strftime("%Y-%m-%d %H:%M:%S %z")
      };
    };

    Opal.defn(self, '$mday', def.$day);

    def.$min = function() {
      var self = this;

      
      if (self.tz_offset === 0) {
        return self.getUTCMinutes();
      }
      else {
        return self.getMinutes();
      }
    ;
    };

    def.$mon = function() {
      var self = this;

      
      if (self.tz_offset === 0) {
        return self.getUTCMonth() + 1;
      }
      else {
        return self.getMonth() + 1;
      }
    ;
    };

    def['$monday?'] = function() {
      var self = this;

      return self.$wday() == 1;
    };

    Opal.defn(self, '$month', def.$mon);

    def['$saturday?'] = function() {
      var self = this;

      return self.$wday() == 6;
    };

    def.$sec = function() {
      var self = this;

      
      if (self.tz_offset === 0) {
        return self.getUTCSeconds();
      }
      else {
        return self.getSeconds();
      }
    ;
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

      
      var result           = new Date(self.getTime());
          result.tz_offset = 0;

      return result;
    
    };

    def['$gmt?'] = function() {
      var self = this;

      return self.tz_offset === 0;
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
            result += self.$year();
            break;

          case 'C':
            zero    = !blank;
            result += Math.round(self.$year() / 100);
            break;

          case 'y':
            zero    = !blank;
            result += (self.$year() % 100);
            break;

          case 'm':
            zero    = !blank;
            result += self.$mon();
            break;

          case 'B':
            result += long_months[self.$mon() - 1];
            break;

          case 'b':
          case 'h':
            blank   = !zero;
            result += short_months[self.$mon() - 1];
            break;

          case 'd':
            zero    = !blank
            result += self.$day();
            break;

          case 'e':
            blank   = !zero
            result += self.$day();
            break;

          case 'j':
            result += self.$yday();
            break;

          case 'H':
            zero    = !blank;
            result += self.$hour();
            break;

          case 'k':
            blank   = !zero;
            result += self.$hour();
            break;

          case 'I':
            zero    = !blank;
            result += (self.$hour() % 12 || 12);
            break;

          case 'l':
            blank   = !zero;
            result += (self.$hour() % 12 || 12);
            break;

          case 'P':
            result += (self.$hour() >= 12 ? "pm" : "am");
            break;

          case 'p':
            result += (self.$hour() >= 12 ? "PM" : "AM");
            break;

          case 'M':
            zero    = !blank;
            result += self.$min();
            break;

          case 'S':
            zero    = !blank;
            result += self.$sec()
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
            result += days_of_week[self.$wday()];
            break;

          case 'a':
            result += short_days[self.$wday()];
            break;

          case 'u':
            result += (self.$wday() + 1);
            break;

          case 'w':
            result += self.$wday();
            break;

          case 'V':
            result += self.$cweek_cyear()['$[]'](0).$to_s().$rjust(2, "0");
            break;

          case 'G':
            result += self.$cweek_cyear()['$[]'](1);
            break;

          case 'g':
            result += self.$cweek_cyear()['$[]'](1)['$[]']($range(-2, -1, false));
            break;

          case 's':
            result += self.$to_i();
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

      return self.$wday() == 0;
    };

    def['$thursday?'] = function() {
      var self = this;

      return self.$wday() == 4;
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

    Opal.defn(self, '$to_s', def.$inspect);

    def['$tuesday?'] = function() {
      var self = this;

      return self.$wday() == 2;
    };

    Opal.defn(self, '$utc?', def['$gmt?']);

    Opal.defn(self, '$utc_offset', def.$gmt_offset);

    def.$wday = function() {
      var self = this;

      
      if (self.tz_offset === 0) {
        return self.getUTCDay();
      }
      else {
        return self.getDay();
      }
    ;
    };

    def['$wednesday?'] = function() {
      var self = this;

      return self.$wday() == 3;
    };

    def.$year = function() {
      var self = this;

      
      if (self.tz_offset === 0) {
        return self.getUTCFullYear();
      }
      else {
        return self.getFullYear();
      }
    ;
    };

    self.$private("cweek_cyear");

    return (def.$cweek_cyear = function() {
      var $a, $b, self = this, jan01 = nil, jan01_wday = nil, first_monday = nil, year = nil, offset = nil, week = nil, dec31 = nil, dec31_wday = nil;

      jan01 = $scope.get('Time').$new(self.$year(), 1, 1);
      jan01_wday = jan01.$wday();
      first_monday = 0;
      year = self.$year();
      if ((($a = (($b = $rb_le(jan01_wday, 4)) ? jan01_wday['$=='](0)['$!']() : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        offset = $rb_minus(jan01_wday, 1)
        } else {
        offset = $rb_minus($rb_minus(jan01_wday, 7), 1);
        if (offset['$=='](-8)) {
          offset = -1};
      };
      week = ($rb_divide(($rb_plus(self.$yday(), offset)), 7.0)).$ceil();
      if ($rb_le(week, 0)) {
        return $scope.get('Time').$new($rb_minus(self.$year(), 1), 12, 31).$cweek_cyear()
      } else if (week['$=='](53)) {
        dec31 = $scope.get('Time').$new(self.$year(), 12, 31);
        dec31_wday = dec31.$wday();
        if ((($a = (($b = $rb_le(dec31_wday, 3)) ? dec31_wday['$=='](0)['$!']() : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
          week = 1;
          year = $rb_plus(year, 1);};};
      return [week, year];
    }, nil) && 'cweek_cyear';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/struct"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  function $rb_ge(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs >= rhs : lhs['$>='](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $hash2 = Opal.hash2;

  Opal.add_stubs(['$require', '$include', '$==', '$[]', '$upcase', '$const_set', '$new', '$unshift', '$each', '$define_struct_attribute', '$instance_eval', '$to_proc', '$raise', '$<<', '$members', '$attr_accessor', '$each_with_index', '$instance_variable_set', '$class', '$===', '$-@', '$size', '$include?', '$to_sym', '$instance_variable_get', '$enum_for', '$hash', '$all?', '$length', '$map', '$join', '$inspect', '$each_pair', '$inject', '$[]=', '$flatten', '$to_a']);
  self.$require("corelib/enumerable");
  return (function($base, $super) {
    function $Struct(){};
    var self = $Struct = $klass($base, $super, 'Struct', $Struct);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_6, TMP_8;

    self.$include($scope.get('Enumerable'));

    Opal.defs(self, '$new', TMP_1 = function(name, args) {var $zuper = $slice.call(arguments, 0);
      var $a, $b, $c, TMP_2, self = this, $iter = TMP_1.$$p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_1.$$p = null;
      if (self['$==']($scope.get('Struct'))) {
        } else {
        return Opal.find_super_dispatcher(self, 'new', TMP_1, $iter, $Struct).apply(self, $zuper)
      };
      if (name['$[]'](0)['$=='](name['$[]'](0).$upcase())) {
        return $scope.get('Struct').$const_set(name, ($a = self).$new.apply($a, [].concat(args)))
        } else {
        args.$unshift(name);
        return ($b = ($c = $scope.get('Class')).$new, $b.$$p = (TMP_2 = function(){var self = TMP_2.$$s || this, $a, $b, TMP_3, $c;

        ($a = ($b = args).$each, $a.$$p = (TMP_3 = function(arg){var self = TMP_3.$$s || this;
if (arg == null) arg = nil;
          return self.$define_struct_attribute(arg)}, TMP_3.$$s = self, TMP_3), $a).call($b);
          if (block !== false && block !== nil) {
            return ($a = ($c = self).$instance_eval, $a.$$p = block.$to_proc(), $a).call($c)
            } else {
            return nil
          };}, TMP_2.$$s = self, TMP_2), $b).call($c, self);
      };
    });

    Opal.defs(self, '$define_struct_attribute', function(name) {
      var self = this;

      if (self['$==']($scope.get('Struct'))) {
        self.$raise($scope.get('ArgumentError'), "you cannot define attributes to the Struct class")};
      self.$members()['$<<'](name);
      return self.$attr_accessor(name);
    });

    Opal.defs(self, '$members', function() {
      var $a, self = this;
      if (self.members == null) self.members = nil;

      if (self['$==']($scope.get('Struct'))) {
        self.$raise($scope.get('ArgumentError'), "the Struct class has no members")};
      return ((($a = self.members) !== false && $a !== nil) ? $a : self.members = []);
    });

    Opal.defs(self, '$inherited', function(klass) {
      var $a, $b, TMP_4, self = this, members = nil;
      if (self.members == null) self.members = nil;

      members = self.members;
      return ($a = ($b = klass).$instance_eval, $a.$$p = (TMP_4 = function(){var self = TMP_4.$$s || this;

      return self.members = members}, TMP_4.$$s = self, TMP_4), $a).call($b);
    });

    (function(self) {
      var $scope = self.$$scope, def = self.$$proto;

      return self.$$proto['$[]'] = self.$$proto.$new
    })(self.$singleton_class());

    def.$initialize = function(args) {
      var $a, $b, TMP_5, self = this;

      args = $slice.call(arguments, 0);
      return ($a = ($b = self.$members()).$each_with_index, $a.$$p = (TMP_5 = function(name, index){var self = TMP_5.$$s || this;
if (name == null) name = nil;if (index == null) index = nil;
      return self.$instance_variable_set("@" + (name), args['$[]'](index))}, TMP_5.$$s = self, TMP_5), $a).call($b);
    };

    def.$members = function() {
      var self = this;

      return self.$class().$members();
    };

    def['$[]'] = function(name) {
      var $a, self = this;

      if ((($a = $scope.get('Integer')['$==='](name)) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ($rb_lt(name, self.$members().$size()['$-@']())) {
          self.$raise($scope.get('IndexError'), "offset " + (name) + " too small for struct(size:" + (self.$members().$size()) + ")")};
        if ($rb_ge(name, self.$members().$size())) {
          self.$raise($scope.get('IndexError'), "offset " + (name) + " too large for struct(size:" + (self.$members().$size()) + ")")};
        name = self.$members()['$[]'](name);
      } else if ((($a = $scope.get('String')['$==='](name)) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ((($a = self.$members()['$include?'](name.$to_sym())) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          self.$raise($scope.get('NameError'), "no member '" + (name) + "' in struct")
        }
        } else {
        self.$raise($scope.get('TypeError'), "no implicit conversion of " + (name.$class()) + " into Integer")
      };
      return self.$instance_variable_get("@" + (name));
    };

    def['$[]='] = function(name, value) {
      var $a, self = this;

      if ((($a = $scope.get('Integer')['$==='](name)) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ($rb_lt(name, self.$members().$size()['$-@']())) {
          self.$raise($scope.get('IndexError'), "offset " + (name) + " too small for struct(size:" + (self.$members().$size()) + ")")};
        if ($rb_ge(name, self.$members().$size())) {
          self.$raise($scope.get('IndexError'), "offset " + (name) + " too large for struct(size:" + (self.$members().$size()) + ")")};
        name = self.$members()['$[]'](name);
      } else if ((($a = $scope.get('String')['$==='](name)) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ((($a = self.$members()['$include?'](name.$to_sym())) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          self.$raise($scope.get('NameError'), "no member '" + (name) + "' in struct")
        }
        } else {
        self.$raise($scope.get('TypeError'), "no implicit conversion of " + (name.$class()) + " into Integer")
      };
      return self.$instance_variable_set("@" + (name), value);
    };

    def.$each = TMP_6 = function() {
      var $a, $b, TMP_7, self = this, $iter = TMP_6.$$p, $yield = $iter || nil;

      TMP_6.$$p = null;
      if (($yield !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      ($a = ($b = self.$members()).$each, $a.$$p = (TMP_7 = function(name){var self = TMP_7.$$s || this, $a;
if (name == null) name = nil;
      return $a = Opal.yield1($yield, self['$[]'](name)), $a === $breaker ? $a : $a}, TMP_7.$$s = self, TMP_7), $a).call($b);
      return self;
    };

    def.$each_pair = TMP_8 = function() {
      var $a, $b, TMP_9, self = this, $iter = TMP_8.$$p, $yield = $iter || nil;

      TMP_8.$$p = null;
      if (($yield !== nil)) {
        } else {
        return self.$enum_for("each_pair")
      };
      ($a = ($b = self.$members()).$each, $a.$$p = (TMP_9 = function(name){var self = TMP_9.$$s || this, $a;
if (name == null) name = nil;
      return $a = Opal.yieldX($yield, [name, self['$[]'](name)]), $a === $breaker ? $a : $a}, TMP_9.$$s = self, TMP_9), $a).call($b);
      return self;
    };

    def['$eql?'] = function(other) {
      var $a, $b, $c, TMP_10, self = this;

      return ((($a = self.$hash()['$=='](other.$hash())) !== false && $a !== nil) ? $a : ($b = ($c = other.$each_with_index())['$all?'], $b.$$p = (TMP_10 = function(object, index){var self = TMP_10.$$s || this;
if (object == null) object = nil;if (index == null) index = nil;
      return self['$[]'](self.$members()['$[]'](index))['$=='](object)}, TMP_10.$$s = self, TMP_10), $b).call($c));
    };

    def.$length = function() {
      var self = this;

      return self.$members().$length();
    };

    Opal.defn(self, '$size', def.$length);

    def.$to_a = function() {
      var $a, $b, TMP_11, self = this;

      return ($a = ($b = self.$members()).$map, $a.$$p = (TMP_11 = function(name){var self = TMP_11.$$s || this;
if (name == null) name = nil;
      return self['$[]'](name)}, TMP_11.$$s = self, TMP_11), $a).call($b);
    };

    Opal.defn(self, '$values', def.$to_a);

    def.$inspect = function() {
      var $a, $b, TMP_12, self = this, result = nil;

      result = "#<struct ";
      if (self.$class()['$==']($scope.get('Struct'))) {
        result = $rb_plus(result, "" + (self.$class()) + " ")};
      result = $rb_plus(result, ($a = ($b = self.$each_pair()).$map, $a.$$p = (TMP_12 = function(name, value){var self = TMP_12.$$s || this;
if (name == null) name = nil;if (value == null) value = nil;
      return "" + (name) + "=" + (value.$inspect())}, TMP_12.$$s = self, TMP_12), $a).call($b).$join(", "));
      result = $rb_plus(result, ">");
      return result;
    };

    Opal.defn(self, '$to_s', def.$inspect);

    def.$to_h = function() {
      var $a, $b, TMP_13, self = this;

      return ($a = ($b = self.$members()).$inject, $a.$$p = (TMP_13 = function(h, name){var self = TMP_13.$$s || this;
if (h == null) h = nil;if (name == null) name = nil;
      h['$[]='](name, self['$[]'](name));
        return h;}, TMP_13.$$s = self, TMP_13), $a).call($b, $hash2([], {}));
    };

    return (def.$values_at = function(args) {
      var $a, $b, TMP_14, self = this;

      args = $slice.call(arguments, 0);
      args = ($a = ($b = args).$map, $a.$$p = (TMP_14 = function(arg){var self = TMP_14.$$s || this;
if (arg == null) arg = nil;
      return arg.$$is_range ? arg.$to_a() : arg;}, TMP_14.$$s = self, TMP_14), $a).call($b).$flatten();
      
      var result = [];
      for (var i = 0, len = args.length; i < len; i++) {
        if (!args[i].$$is_number) {
          self.$raise($scope.get('TypeError'), "no implicit conversion of " + ((args[i]).$class()) + " into Integer")
        }
        result.push(self['$[]'](args[i]));
      }
      return result;
    ;
    }, nil) && 'values_at';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/io"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var $a, $b, self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $module = Opal.module, $gvars = Opal.gvars;
  if ($gvars.stdout == null) $gvars.stdout = nil;
  if ($gvars.stderr == null) $gvars.stderr = nil;

  Opal.add_stubs(['$attr_accessor', '$size', '$write', '$join', '$map', '$String', '$empty?', '$concat', '$chomp', '$getbyte', '$getc', '$raise', '$new', '$write_proc=', '$extend']);
  (function($base, $super) {
    function $IO(){};
    var self = $IO = $klass($base, $super, 'IO', $IO);

    var def = self.$$proto, $scope = self.$$scope;

    def.tty = def.closed = nil;
    Opal.cdecl($scope, 'SEEK_SET', 0);

    Opal.cdecl($scope, 'SEEK_CUR', 1);

    Opal.cdecl($scope, 'SEEK_END', 2);

    def['$tty?'] = function() {
      var self = this;

      return self.tty;
    };

    def['$closed?'] = function() {
      var self = this;

      return self.closed;
    };

    self.$attr_accessor("write_proc");

    def.$write = function(string) {
      var self = this;

      self.write_proc(string);
      return string.$size();
    };

    self.$attr_accessor("sync");

    (function($base) {
      var self = $module($base, 'Writable');

      var def = self.$$proto, $scope = self.$$scope;

      Opal.defn(self, '$<<', function(string) {
        var self = this;

        self.$write(string);
        return self;
      });

      Opal.defn(self, '$print', function(args) {
        var $a, $b, TMP_1, self = this;
        if ($gvars[","] == null) $gvars[","] = nil;

        args = $slice.call(arguments, 0);
        self.$write(($a = ($b = args).$map, $a.$$p = (TMP_1 = function(arg){var self = TMP_1.$$s || this;
if (arg == null) arg = nil;
        return self.$String(arg)}, TMP_1.$$s = self, TMP_1), $a).call($b).$join($gvars[","]));
        return nil;
      });

      Opal.defn(self, '$puts', function(args) {
        var $a, $b, TMP_2, self = this, newline = nil;
        if ($gvars["/"] == null) $gvars["/"] = nil;

        args = $slice.call(arguments, 0);
        newline = $gvars["/"];
        if ((($a = args['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.$write($gvars["/"])
          } else {
          self.$write(($a = ($b = args).$map, $a.$$p = (TMP_2 = function(arg){var self = TMP_2.$$s || this;
if (arg == null) arg = nil;
          return self.$String(arg).$chomp()}, TMP_2.$$s = self, TMP_2), $a).call($b).$concat([nil]).$join(newline))
        };
        return nil;
      });
    })(self);

    return (function($base) {
      var self = $module($base, 'Readable');

      var def = self.$$proto, $scope = self.$$scope;

      Opal.defn(self, '$readbyte', function() {
        var self = this;

        return self.$getbyte();
      });

      Opal.defn(self, '$readchar', function() {
        var self = this;

        return self.$getc();
      });

      Opal.defn(self, '$readline', function(sep) {
        var self = this;
        if ($gvars["/"] == null) $gvars["/"] = nil;

        if (sep == null) {
          sep = $gvars["/"]
        }
        return self.$raise($scope.get('NotImplementedError'));
      });

      Opal.defn(self, '$readpartial', function(integer, outbuf) {
        var self = this;

        if (outbuf == null) {
          outbuf = nil
        }
        return self.$raise($scope.get('NotImplementedError'));
      });
    })(self);
  })(self, null);
  Opal.cdecl($scope, 'STDERR', $gvars.stderr = $scope.get('IO').$new());
  Opal.cdecl($scope, 'STDIN', $gvars.stdin = $scope.get('IO').$new());
  Opal.cdecl($scope, 'STDOUT', $gvars.stdout = $scope.get('IO').$new());
  (($a = [typeof(process) === 'object' ? function(s){process.stdout.write(s)} : function(s){console.log(s)}]), $b = $gvars.stdout, $b['$write_proc='].apply($b, $a), $a[$a.length-1]);
  (($a = [typeof(process) === 'object' ? function(s){process.stderr.write(s)} : function(s){console.warn(s)}]), $b = $gvars.stderr, $b['$write_proc='].apply($b, $a), $a[$a.length-1]);
  $gvars.stdout.$extend((($scope.get('IO')).$$scope.get('Writable')));
  return $gvars.stderr.$extend((($scope.get('IO')).$$scope.get('Writable')));
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/main"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice;

  Opal.add_stubs(['$include']);
  Opal.defs(self, '$to_s', function() {
    var self = this;

    return "main";
  });
  return (Opal.defs(self, '$include', function(mod) {
    var self = this;

    return $scope.get('Object').$include(mod);
  }), nil) && 'include';
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/variables"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $gvars = Opal.gvars, $hash2 = Opal.hash2;

  Opal.add_stubs(['$new']);
  $gvars["&"] = $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
  $gvars.LOADED_FEATURES = $gvars["\""] = Opal.loaded_features;
  $gvars.LOAD_PATH = $gvars[":"] = [];
  $gvars["/"] = "\n";
  $gvars[","] = nil;
  Opal.cdecl($scope, 'ARGV', []);
  Opal.cdecl($scope, 'ARGF', $scope.get('Object').$new());
  Opal.cdecl($scope, 'ENV', $hash2([], {}));
  $gvars.VERBOSE = false;
  $gvars.DEBUG = false;
  $gvars.SAFE = 0;
  Opal.cdecl($scope, 'RUBY_PLATFORM', "opal");
  Opal.cdecl($scope, 'RUBY_ENGINE', "opal");
  Opal.cdecl($scope, 'RUBY_VERSION', "2.1.5");
  Opal.cdecl($scope, 'RUBY_ENGINE_VERSION', "0.8.0");
  return Opal.cdecl($scope, 'RUBY_RELEASE_DATE', "2015-07-16");
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/dir"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$[]']);
  return (function($base, $super) {
    function $Dir(){};
    var self = $Dir = $klass($base, $super, 'Dir', $Dir);

    var def = self.$$proto, $scope = self.$$scope;

    return (function(self) {
      var $scope = self.$$scope, def = self.$$proto, TMP_1;

      self.$$proto.$chdir = TMP_1 = function(dir) {
        var $a, self = this, $iter = TMP_1.$$p, $yield = $iter || nil, prev_cwd = nil;

        TMP_1.$$p = null;
        try {
        prev_cwd = Opal.current_dir;
        Opal.current_dir = dir;
        return $a = Opal.yieldX($yield, []), $a === $breaker ? $a : $a;
        } finally {
        Opal.current_dir = prev_cwd;
        };
      };
      self.$$proto.$pwd = function() {
        var self = this;

        return Opal.current_dir || '.';
      };
      self.$$proto.$getwd = self.$$proto.$pwd;
      return (self.$$proto.$home = function() {
        var $a, self = this;

        return ((($a = $scope.get('ENV')['$[]']("HOME")) !== false && $a !== nil) ? $a : ".");
      }, nil) && 'home';
    })(self.$singleton_class())
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["corelib/file"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $range = Opal.range;

  Opal.add_stubs(['$join', '$compact', '$split', '$==', '$first', '$[]=', '$home', '$each', '$pop', '$<<', '$[]', '$gsub', '$find', '$=~']);
  return (function($base, $super) {
    function $File(){};
    var self = $File = $klass($base, $super, 'File', $File);

    var def = self.$$proto, $scope = self.$$scope;

    Opal.cdecl($scope, 'Separator', Opal.cdecl($scope, 'SEPARATOR', "/"));

    Opal.cdecl($scope, 'ALT_SEPARATOR', nil);

    Opal.cdecl($scope, 'PATH_SEPARATOR', ":");

    return (function(self) {
      var $scope = self.$$scope, def = self.$$proto;

      self.$$proto.$expand_path = function(path, basedir) {
        var $a, $b, TMP_1, self = this, parts = nil, new_parts = nil;

        if (basedir == null) {
          basedir = nil
        }
        path = [basedir, path].$compact().$join($scope.get('SEPARATOR'));
        parts = path.$split($scope.get('SEPARATOR'));
        new_parts = [];
        if (parts.$first()['$==']("~")) {
          parts['$[]='](0, $scope.get('Dir').$home())};
        ($a = ($b = parts).$each, $a.$$p = (TMP_1 = function(part){var self = TMP_1.$$s || this;
if (part == null) part = nil;
        if (part['$==']("..")) {
            return new_parts.$pop()
            } else {
            return new_parts['$<<'](part)
          }}, TMP_1.$$s = self, TMP_1), $a).call($b);
        return new_parts.$join($scope.get('SEPARATOR'));
      };
      self.$$proto.$dirname = function(path) {
        var self = this;

        return self.$split(path)['$[]']($range(0, -2, false));
      };
      self.$$proto.$basename = function(path) {
        var self = this;

        return self.$split(path)['$[]'](-1);
      };
      self.$$proto['$exist?'] = function(path) {
        var self = this;

        return Opal.modules[path] != null;
      };
      self.$$proto['$exists?'] = self.$$proto['$exist?'];
      self.$$proto['$directory?'] = function(path) {
        var $a, $b, TMP_2, self = this, files = nil, file = nil;

        files = [];
        
        for (var key in Opal.modules) {
          files.push(key)
        }
      ;
        path = path.$gsub((new RegExp("(^." + $scope.get('SEPARATOR') + "+|" + $scope.get('SEPARATOR') + "+$)")));
        file = ($a = ($b = files).$find, $a.$$p = (TMP_2 = function(file){var self = TMP_2.$$s || this;
if (file == null) file = nil;
        return file['$=~']((new RegExp("^" + path)))}, TMP_2.$$s = self, TMP_2), $a).call($b);
        return file;
      };
      self.$$proto.$join = function(paths) {
        var self = this;

        paths = $slice.call(arguments, 0);
        return paths.$join($scope.get('SEPARATOR')).$gsub((new RegExp("" + $scope.get('SEPARATOR') + "+")), $scope.get('SEPARATOR'));
      };
      return (self.$$proto.$split = function(path) {
        var self = this;

        return path.$split($scope.get('SEPARATOR'));
      }, nil) && 'split';
    })(self.$singleton_class());
  })(self, $scope.get('IO'))
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice;

  Opal.add_stubs(['$require']);
  self.$require("corelib/runtime");
  self.$require("corelib/helpers");
  self.$require("corelib/module");
  self.$require("corelib/class");
  self.$require("corelib/basic_object");
  self.$require("corelib/kernel");
  self.$require("corelib/nil_class");
  self.$require("corelib/boolean");
  self.$require("corelib/error");
  self.$require("corelib/regexp");
  self.$require("corelib/comparable");
  self.$require("corelib/enumerable");
  self.$require("corelib/enumerator");
  self.$require("corelib/array");
  self.$require("corelib/array/inheritance");
  self.$require("corelib/hash");
  self.$require("corelib/string");
  self.$require("corelib/string/inheritance");
  self.$require("corelib/match_data");
  self.$require("corelib/numeric");
  self.$require("corelib/complex");
  self.$require("corelib/rational");
  self.$require("corelib/proc");
  self.$require("corelib/method");
  self.$require("corelib/range");
  self.$require("corelib/time");
  self.$require("corelib/struct");
  self.$require("corelib/io");
  self.$require("corelib/main");
  self.$require("corelib/variables");
  self.$require("corelib/dir");
  return self.$require("corelib/file");
};

/* Generated by Opal 0.8.0 */
Opal.modules["native"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_ge(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs >= rhs : lhs['$>='](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $range = Opal.range, $hash2 = Opal.hash2, $klass = Opal.klass, $gvars = Opal.gvars;

  Opal.add_stubs(['$try_convert', '$native?', '$respond_to?', '$to_n', '$raise', '$inspect', '$Native', '$end_with?', '$define_method', '$[]', '$convert', '$call', '$to_proc', '$new', '$each', '$native_reader', '$native_writer', '$extend', '$alias_method', '$to_a', '$_Array', '$include', '$method_missing', '$bind', '$instance_method', '$[]=', '$slice', '$length', '$enum_for', '$===', '$<<', '$==', '$instance_variable_set', '$members', '$each_with_index', '$each_pair', '$name', '$native_module']);
  (function($base) {
    var self = $module($base, 'Native');

    var def = self.$$proto, $scope = self.$$scope, TMP_1;

    Opal.defs(self, '$is_a?', function(object, klass) {
      var self = this;

      
      try {
        return object instanceof self.$try_convert(klass);
      }
      catch (e) {
        return false;
      }
    ;
    });

    Opal.defs(self, '$try_convert', function(value) {
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

    Opal.defs(self, '$convert', function(value) {
      var self = this;

      
      if (self['$native?'](value)) {
        return value;
      }
      else if (value['$respond_to?']("to_n")) {
        return value.$to_n();
      }
      else {
        self.$raise($scope.get('ArgumentError'), "" + (value.$inspect()) + " isn't native");
      }
    ;
    });

    Opal.defs(self, '$call', TMP_1 = function(obj, key, args) {
      var self = this, $iter = TMP_1.$$p, block = $iter || nil;

      args = $slice.call(arguments, 2);
      TMP_1.$$p = null;
      
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

      var def = self.$$proto, $scope = self.$$scope;

      Opal.defn(self, '$alias_native', function(new$, old, options) {
        var $a, $b, TMP_2, $c, TMP_3, $d, TMP_4, self = this, as = nil;

        if (old == null) {
          old = new$
        }
        if (options == null) {
          options = $hash2([], {})
        }
        if ((($a = old['$end_with?']("=")) !== nil && (!$a.$$is_boolean || $a == true))) {
          return ($a = ($b = self).$define_method, $a.$$p = (TMP_2 = function(value){var self = TMP_2.$$s || this;
            if (self["native"] == null) self["native"] = nil;
if (value == null) value = nil;
          self["native"][old['$[]']($range(0, -2, false))] = $scope.get('Native').$convert(value);
            return value;}, TMP_2.$$s = self, TMP_2), $a).call($b, new$)
        } else if ((($a = as = options['$[]']("as")) !== nil && (!$a.$$is_boolean || $a == true))) {
          return ($a = ($c = self).$define_method, $a.$$p = (TMP_3 = function(args){var self = TMP_3.$$s || this, block, $a, $b, $c, value = nil;
            if (self["native"] == null) self["native"] = nil;
args = $slice.call(arguments, 0);
            block = TMP_3.$$p || nil, TMP_3.$$p = null;
          if ((($a = value = ($b = ($c = $scope.get('Native')).$call, $b.$$p = block.$to_proc(), $b).apply($c, [self["native"], old].concat(args))) !== nil && (!$a.$$is_boolean || $a == true))) {
              return as.$new(value.$to_n())
              } else {
              return nil
            }}, TMP_3.$$s = self, TMP_3), $a).call($c, new$)
          } else {
          return ($a = ($d = self).$define_method, $a.$$p = (TMP_4 = function(args){var self = TMP_4.$$s || this, block, $a, $b;
            if (self["native"] == null) self["native"] = nil;
args = $slice.call(arguments, 0);
            block = TMP_4.$$p || nil, TMP_4.$$p = null;
          return ($a = ($b = $scope.get('Native')).$call, $a.$$p = block.$to_proc(), $a).apply($b, [self["native"], old].concat(args))}, TMP_4.$$s = self, TMP_4), $a).call($d, new$)
        };
      });

      Opal.defn(self, '$native_reader', function(names) {
        var $a, $b, TMP_5, self = this;

        names = $slice.call(arguments, 0);
        return ($a = ($b = names).$each, $a.$$p = (TMP_5 = function(name){var self = TMP_5.$$s || this, $a, $b, TMP_6;
if (name == null) name = nil;
        return ($a = ($b = self).$define_method, $a.$$p = (TMP_6 = function(){var self = TMP_6.$$s || this;
            if (self["native"] == null) self["native"] = nil;

          return self.$Native(self["native"][name])}, TMP_6.$$s = self, TMP_6), $a).call($b, name)}, TMP_5.$$s = self, TMP_5), $a).call($b);
      });

      Opal.defn(self, '$native_writer', function(names) {
        var $a, $b, TMP_7, self = this;

        names = $slice.call(arguments, 0);
        return ($a = ($b = names).$each, $a.$$p = (TMP_7 = function(name){var self = TMP_7.$$s || this, $a, $b, TMP_8;
if (name == null) name = nil;
        return ($a = ($b = self).$define_method, $a.$$p = (TMP_8 = function(value){var self = TMP_8.$$s || this;
            if (self["native"] == null) self["native"] = nil;
if (value == null) value = nil;
          return self.$Native(self["native"][name] = value)}, TMP_8.$$s = self, TMP_8), $a).call($b, "" + (name) + "=")}, TMP_7.$$s = self, TMP_7), $a).call($b);
      });

      Opal.defn(self, '$native_accessor', function(names) {
        var $a, $b, self = this;

        names = $slice.call(arguments, 0);
        ($a = self).$native_reader.apply($a, [].concat(names));
        return ($b = self).$native_writer.apply($b, [].concat(names));
      });
    })(self);

    Opal.defs(self, '$included', function(klass) {
      var self = this;

      return klass.$extend($scope.get('Helpers'));
    });

    Opal.defn(self, '$initialize', function(native$) {
      var $a, self = this;

      if ((($a = $scope.get('Kernel')['$native?'](native$)) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        $scope.get('Kernel').$raise($scope.get('ArgumentError'), "" + (native$.$inspect()) + " isn't native")
      };
      return self["native"] = native$;
    });

    Opal.defn(self, '$to_n', function() {
      var self = this;
      if (self["native"] == null) self["native"] = nil;

      return self["native"];
    });
  })(self);
  (function($base) {
    var self = $module($base, 'Kernel');

    var def = self.$$proto, $scope = self.$$scope, TMP_9;

    Opal.defn(self, '$native?', function(value) {
      var self = this;

      return value == null || !value.$$class;
    });

    Opal.defn(self, '$Native', function(obj) {
      var $a, self = this;

      if ((($a = obj == null) !== nil && (!$a.$$is_boolean || $a == true))) {
        return nil
      } else if ((($a = self['$native?'](obj)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return (($scope.get('Native')).$$scope.get('Object')).$new(obj)
        } else {
        return obj
      };
    });

    self.$alias_method("_Array", "Array");

    Opal.defn(self, '$Array', TMP_9 = function(object, args) {
      var $a, $b, self = this, $iter = TMP_9.$$p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_9.$$p = null;
      if ((($a = self['$native?'](object)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return ($a = ($b = (($scope.get('Native')).$$scope.get('Array'))).$new, $a.$$p = block.$to_proc(), $a).apply($b, [object].concat(args)).$to_a()};
      return self.$_Array(object);
    });
  })(self);
  (function($base, $super) {
    function $Object(){};
    var self = $Object = $klass($base, $super, 'Object', $Object);

    var def = self.$$proto, $scope = self.$$scope, TMP_10, TMP_11, TMP_12;

    def["native"] = nil;
    self.$include(Opal.get('Native'));

    Opal.defn(self, '$==', function(other) {
      var self = this;

      return self["native"] === $scope.get('Native').$try_convert(other);
    });

    Opal.defn(self, '$has_key?', function(name) {
      var self = this;

      return Opal.hasOwnProperty.call(self["native"], name);
    });

    Opal.defn(self, '$key?', def['$has_key?']);

    Opal.defn(self, '$include?', def['$has_key?']);

    Opal.defn(self, '$member?', def['$has_key?']);

    Opal.defn(self, '$each', TMP_10 = function(args) {
      var $a, self = this, $iter = TMP_10.$$p, $yield = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_10.$$p = null;
      if (($yield !== nil)) {
        
        for (var key in self["native"]) {
          ((($a = Opal.yieldX($yield, [key, self["native"][key]])) === $breaker) ? $breaker.$v : $a)
        }
      ;
        return self;
        } else {
        return ($a = self).$method_missing.apply($a, ["each"].concat(args))
      };
    });

    Opal.defn(self, '$[]', function(key) {
      var self = this;

      
      var prop = self["native"][key];

      if (prop instanceof Function) {
        return prop;
      }
      else {
        return Opal.get('Native').$call(self["native"], key)
      }
    ;
    });

    Opal.defn(self, '$[]=', function(key, value) {
      var $a, self = this, native$ = nil;

      native$ = $scope.get('Native').$try_convert(value);
      if ((($a = native$ === nil) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self["native"][key] = value;
        } else {
        return self["native"][key] = native$;
      };
    });

    Opal.defn(self, '$merge!', function(other) {
      var self = this;

      
      var other = $scope.get('Native').$convert(other);

      for (var prop in other) {
        self["native"][prop] = other[prop];
      }
    ;
      return self;
    });

    Opal.defn(self, '$respond_to?', function(name, include_all) {
      var self = this;

      if (include_all == null) {
        include_all = false
      }
      return $scope.get('Kernel').$instance_method("respond_to?").$bind(self).$call(name, include_all);
    });

    Opal.defn(self, '$respond_to_missing?', function(name) {
      var self = this;

      return Opal.hasOwnProperty.call(self["native"], name);
    });

    Opal.defn(self, '$method_missing', TMP_11 = function(mid, args) {
      var $a, $b, self = this, $iter = TMP_11.$$p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_11.$$p = null;
      
      if (mid.charAt(mid.length - 1) === '=') {
        return self['$[]='](mid.$slice(0, $rb_minus(mid.$length(), 1)), args['$[]'](0));
      }
      else {
        return ($a = ($b = Opal.get('Native')).$call, $a.$$p = block.$to_proc(), $a).apply($b, [self["native"], mid].concat(args));
      }
    ;
    });

    Opal.defn(self, '$nil?', function() {
      var self = this;

      return false;
    });

    Opal.defn(self, '$is_a?', function(klass) {
      var self = this;

      return Opal.is_a(self, klass);
    });

    Opal.defn(self, '$kind_of?', def['$is_a?']);

    Opal.defn(self, '$instance_of?', function(klass) {
      var self = this;

      return self.$$class === klass;
    });

    Opal.defn(self, '$class', function() {
      var self = this;

      return self.$$class;
    });

    Opal.defn(self, '$to_a', TMP_12 = function(options) {
      var $a, $b, self = this, $iter = TMP_12.$$p, block = $iter || nil;

      if (options == null) {
        options = $hash2([], {})
      }
      TMP_12.$$p = null;
      return ($a = ($b = (($scope.get('Native')).$$scope.get('Array'))).$new, $a.$$p = block.$to_proc(), $a).call($b, self["native"], options).$to_a();
    });

    return (Opal.defn(self, '$inspect', function() {
      var self = this;

      return "#<Native:" + (String(self["native"])) + ">";
    }), nil) && 'inspect';
  })($scope.get('Native'), $scope.get('BasicObject'));
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self.$$proto, $scope = self.$$scope, TMP_13, TMP_14;

    def.named = def["native"] = def.get = def.block = def.set = def.length = nil;
    self.$include($scope.get('Native'));

    self.$include($scope.get('Enumerable'));

    def.$initialize = TMP_13 = function(native$, options) {
      var $a, self = this, $iter = TMP_13.$$p, block = $iter || nil;

      if (options == null) {
        options = $hash2([], {})
      }
      TMP_13.$$p = null;
      Opal.find_super_dispatcher(self, 'initialize', TMP_13, null).apply(self, [native$]);
      self.get = ((($a = options['$[]']("get")) !== false && $a !== nil) ? $a : options['$[]']("access"));
      self.named = options['$[]']("named");
      self.set = ((($a = options['$[]']("set")) !== false && $a !== nil) ? $a : options['$[]']("access"));
      self.length = ((($a = options['$[]']("length")) !== false && $a !== nil) ? $a : "length");
      self.block = block;
      if ((($a = self.$length() == null) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.$raise($scope.get('ArgumentError'), "no length found on the array-like object")
        } else {
        return nil
      };
    };

    def.$each = TMP_14 = function() {
      var self = this, $iter = TMP_14.$$p, block = $iter || nil;

      TMP_14.$$p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each")
      };
      
      for (var i = 0, length = self.$length(); i < length; i++) {
        var value = Opal.yield1(block, self['$[]'](i));

        if (value === $breaker) {
          return $breaker.$v;
        }
      }
    ;
      return self;
    };

    def['$[]'] = function(index) {
      var $a, self = this, result = nil, $case = nil;

      result = (function() {$case = index;if ($scope.get('String')['$===']($case) || $scope.get('Symbol')['$===']($case)) {if ((($a = self.named) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self["native"][self.named](index);
        } else {
        return self["native"][index];
      }}else if ($scope.get('Integer')['$===']($case)) {if ((($a = self.get) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self["native"][self.get](index);
        } else {
        return self["native"][index];
      }}else { return nil }})();
      if (result !== false && result !== nil) {
        if ((($a = self.block) !== nil && (!$a.$$is_boolean || $a == true))) {
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

      if ((($a = self.set) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self["native"][self.set](index, $scope.get('Native').$convert(value));
        } else {
        return self["native"][index] = $scope.get('Native').$convert(value);
      };
    };

    def.$last = function(count) {
      var $a, self = this, index = nil, result = nil;

      if (count == null) {
        count = nil
      }
      if (count !== false && count !== nil) {
        index = $rb_minus(self.$length(), 1);
        result = [];
        while ($rb_ge(index, 0)) {
        result['$<<'](self['$[]'](index));
        index = $rb_minus(index, 1);};
        return result;
        } else {
        return self['$[]']($rb_minus(self.$length(), 1))
      };
    };

    def.$length = function() {
      var self = this;

      return self["native"][self.length];
    };

    Opal.defn(self, '$to_ary', def.$to_a);

    return (def.$inspect = function() {
      var self = this;

      return self.$to_a().$inspect();
    }, nil) && 'inspect';
  })($scope.get('Native'), null);
  (function($base, $super) {
    function $Numeric(){};
    var self = $Numeric = $klass($base, $super, 'Numeric', $Numeric);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_n = function() {
      var self = this;

      return self.valueOf();
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Proc(){};
    var self = $Proc = $klass($base, $super, 'Proc', $Proc);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_n = function() {
      var self = this;

      return self;
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_n = function() {
      var self = this;

      return self.valueOf();
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Regexp(){};
    var self = $Regexp = $klass($base, $super, 'Regexp', $Regexp);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_n = function() {
      var self = this;

      return self.valueOf();
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $MatchData(){};
    var self = $MatchData = $klass($base, $super, 'MatchData', $MatchData);

    var def = self.$$proto, $scope = self.$$scope;

    def.matches = nil;
    return (def.$to_n = function() {
      var self = this;

      return self.matches;
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Struct(){};
    var self = $Struct = $klass($base, $super, 'Struct', $Struct);

    var def = self.$$proto, $scope = self.$$scope;

    def.$initialize = function(args) {
      var $a, $b, TMP_15, $c, TMP_16, self = this, object = nil;

      args = $slice.call(arguments, 0);
      if ((($a = (($b = args.$length()['$=='](1)) ? self['$native?'](args['$[]'](0)) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        object = args['$[]'](0);
        return ($a = ($b = self.$members()).$each, $a.$$p = (TMP_15 = function(name){var self = TMP_15.$$s || this;
if (name == null) name = nil;
        return self.$instance_variable_set("@" + (name), self.$Native(object[name]))}, TMP_15.$$s = self, TMP_15), $a).call($b);
        } else {
        return ($a = ($c = self.$members()).$each_with_index, $a.$$p = (TMP_16 = function(name, index){var self = TMP_16.$$s || this;
if (name == null) name = nil;if (index == null) index = nil;
        return self.$instance_variable_set("@" + (name), args['$[]'](index))}, TMP_16.$$s = self, TMP_16), $a).call($c)
      };
    };

    return (def.$to_n = function() {
      var $a, $b, TMP_17, self = this, result = nil;

      result = {};
      ($a = ($b = self).$each_pair, $a.$$p = (TMP_17 = function(name, value){var self = TMP_17.$$s || this;
if (name == null) name = nil;if (value == null) value = nil;
      return result[name] = value.$to_n();}, TMP_17.$$s = self, TMP_17), $a).call($b);
      return result;
    }, nil) && 'to_n';
  })(self, null);
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self.$$proto, $scope = self.$$scope;

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

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_n = function() {
      var self = this;

      return self.valueOf();
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Time(){};
    var self = $Time = $klass($base, $super, 'Time', $Time);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_n = function() {
      var self = this;

      return self;
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $NilClass(){};
    var self = $NilClass = $klass($base, $super, 'NilClass', $NilClass);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_n = function() {
      var self = this;

      return null;
    }, nil) && 'to_n'
  })(self, null);
  (function($base, $super) {
    function $Hash(){};
    var self = $Hash = $klass($base, $super, 'Hash', $Hash);

    var def = self.$$proto, $scope = self.$$scope, TMP_18;

    def.$initialize = TMP_18 = function(defaults) {
      var self = this, $iter = TMP_18.$$p, block = $iter || nil;

      TMP_18.$$p = null;
      
      if (defaults != null) {
        if (defaults.constructor === Object) {
          var _map = self.map,
              smap = self.smap,
              keys = self.keys,
              map, khash, value;

          for (var key in defaults) {
            value = defaults[key];

            if (key.$$is_string) {
              map = smap;
              khash = key;
            } else {
              map = _map;
              khash = key.$hash();
            }

            if (value && value.constructor === Object) {
              map[khash] = $scope.get('Hash').$new(value);
            }
            else {
              map[khash] = self.$Native(value);
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
          _map   = self.map,
          smap   = self.smap,
          map, khash, value, key;

      for (var i = 0, length = keys.length; i < length; i++) {
        key   = keys[i];

        if (key.$$is_string) {
          map = smap;
          khash = key;
        } else {
          map = _map;
          khash = key.$hash();
        }

        value = map[khash];

        if ((value)['$respond_to?']("to_n")) {
          result[key] = (value).$to_n();
        }
        else {
          result[key] = value;
        }
      }

      return result;
    ;
    }, nil) && 'to_n';
  })(self, null);
  (function($base, $super) {
    function $Module(){};
    var self = $Module = $klass($base, $super, 'Module', $Module);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$native_module = function() {
      var self = this;

      return Opal.global[self.$name()] = self;
    }, nil) && 'native_module'
  })(self, null);
  (function($base, $super) {
    function $Class(){};
    var self = $Class = $klass($base, $super, 'Class', $Class);

    var def = self.$$proto, $scope = self.$$scope;

    def.$native_alias = function(new_jsid, existing_mid) {
      var self = this;

      
      var aliased = self.$$proto['$' + existing_mid];
      if (!aliased) {
        self.$raise($scope.get('NameError'), "undefined method `" + (existing_mid) + "' for class `" + (self.$inspect()) + "'");
      }
      self.$$proto[new_jsid] = aliased;
    ;
    };

    return (def.$native_class = function() {
      var self = this;

      self.$native_module();
      self["new"] = self.$new;
    }, nil) && 'native_class';
  })(self, null);
  return $gvars.$ = $gvars.global = self.$Native(Opal.global);
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal/jquery/constants"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var $a, self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $gvars = Opal.gvars;
  if ($gvars.$ == null) $gvars.$ = nil;

  Opal.add_stubs(['$require', '$[]', '$raise']);
  self.$require("native");
  if ((($a = ($scope.JQUERY_CLASS != null)) !== nil && (!$a.$$is_boolean || $a == true))) {
    return nil
    } else {
    return (function() {if ((($a = $gvars.$['$[]']("jQuery")) !== nil && (!$a.$$is_boolean || $a == true))) {return Opal.cdecl($scope, 'JQUERY_CLASS', Opal.cdecl($scope, 'JQUERY_SELECTOR', $gvars.$['$[]']("jQuery")))}else if ((($a = $gvars.$['$[]']("Zepto")) !== nil && (!$a.$$is_boolean || $a == true))) {Opal.cdecl($scope, 'JQUERY_SELECTOR', $gvars.$['$[]']("Zepto"));
    return Opal.cdecl($scope, 'JQUERY_CLASS', $gvars.$['$[]']("Zepto")['$[]']("zepto")['$[]']("Z"));}else {return self.$raise($scope.get('NameError'), "Can't find jQuery or Zepto. jQuery must be included before opal-jquery")}})()
  };
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal/jquery/element"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$require', '$to_n', '$include', '$each', '$alias_native', '$attr_reader', '$nil?', '$[]', '$[]=', '$raise', '$is_a?', '$has_key?', '$delete', '$call', '$gsub', '$upcase', '$compact', '$map', '$respond_to?', '$<<', '$Native', '$new']);
  self.$require("native");
  self.$require("opal/jquery/constants");
  return (function($base, $super) {
    function $Element(){};
    var self = $Element = $klass($base, $super, 'Element', $Element);

    var def = self.$$proto, $scope = self.$$scope, TMP_2, TMP_3, TMP_6, TMP_7, TMP_8;

    var $ = $scope.get('JQUERY_SELECTOR').$to_n();

    self.$include($scope.get('Enumerable'));

    Opal.defs(self, '$find', function(selector) {
      var self = this;

      return $(selector);
    });

    Opal.defs(self, '$[]', function(selector) {
      var self = this;

      return $(selector);
    });

    Opal.defs(self, '$id', function(id) {
      var self = this;

      
      var el = document.getElementById(id);

      if (!el) {
        return nil;
      }

      return $(el);
    
    });

    Opal.defs(self, '$new', function(tag) {
      var self = this;

      if (tag == null) {
        tag = "div"
      }
      return $(document.createElement(tag));
    });

    Opal.defs(self, '$parse', function(str) {
      var self = this;

      return $(str);
    });

    Opal.defs(self, '$expose', function(methods) {
      var $a, $b, TMP_1, self = this;

      methods = $slice.call(arguments, 0);
      return ($a = ($b = methods).$each, $a.$$p = (TMP_1 = function(method){var self = TMP_1.$$s || this;
if (method == null) method = nil;
      return self.$alias_native(method)}, TMP_1.$$s = self, TMP_1), $a).call($b);
    });

    self.$attr_reader("selector");

    self.$alias_native("after");

    self.$alias_native("before");

    self.$alias_native("parent");

    self.$alias_native("parents");

    self.$alias_native("prev");

    self.$alias_native("remove");

    self.$alias_native("hide");

    self.$alias_native("show");

    self.$alias_native("toggle");

    self.$alias_native("children");

    self.$alias_native("blur");

    self.$alias_native("closest");

    self.$alias_native("detach");

    self.$alias_native("focus");

    self.$alias_native("find");

    self.$alias_native("next");

    self.$alias_native("siblings");

    self.$alias_native("text");

    self.$alias_native("trigger");

    self.$alias_native("append");

    self.$alias_native("prepend");

    self.$alias_native("serialize");

    self.$alias_native("is");

    self.$alias_native("filter");

    self.$alias_native("last");

    self.$alias_native("wrap");

    self.$alias_native("stop");

    self.$alias_native("clone");

    self.$alias_native("empty");

    self.$alias_native("get");

    self.$alias_native("prop");

    Opal.defn(self, '$succ', def.$next);

    Opal.defn(self, '$<<', def.$append);

    self.$alias_native("add_class", "addClass");

    self.$alias_native("append_to", "appendTo");

    self.$alias_native("has_class?", "hasClass");

    self.$alias_native("html=", "html");

    self.$alias_native("index");

    self.$alias_native("is?", "is");

    self.$alias_native("remove_attr", "removeAttr");

    self.$alias_native("remove_class", "removeClass");

    self.$alias_native("submit");

    self.$alias_native("text=", "text");

    self.$alias_native("toggle_class", "toggleClass");

    self.$alias_native("value=", "val");

    self.$alias_native("scroll_top=", "scrollTop");

    self.$alias_native("scroll_top", "scrollTop");

    self.$alias_native("scroll_left=", "scrollLeft");

    self.$alias_native("scroll_left", "scrollLeft");

    self.$alias_native("remove_attribute", "removeAttr");

    self.$alias_native("slide_down", "slideDown");

    self.$alias_native("slide_up", "slideUp");

    self.$alias_native("slide_toggle", "slideToggle");

    self.$alias_native("fade_toggle", "fadeToggle");

    self.$alias_native("height=", "height");

    self.$alias_native("width=", "width");

    self.$alias_native("outer_width", "outerWidth");

    self.$alias_native("outer_height", "outerHeight");

    def.$to_n = function() {
      var self = this;

      return self;
    };

    def['$[]'] = function(name) {
      var self = this;

      
      var value = self.attr(name);
      if(value === undefined) return nil;
      return value;
    
    };

    def['$[]='] = function(name, value) {
      var $a, self = this;

      if ((($a = value['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.removeAttr(name);};
      return self.attr(name, value);
    };

    def.$attr = function(args) {
      var self = this;

      args = $slice.call(arguments, 0);
      
      var size = args.length;
      switch (size) {
      case 1:
        return self['$[]'](args[0]);
        break;
      case 2:
        return self['$[]='](args[0], args[1]);
        break;
      default:
        self.$raise($scope.get('ArgumentError'), "#attr only accepts 1 or 2 arguments")
      }
    ;
    };

    def['$has_attribute?'] = function(name) {
      var self = this;

      return self.attr(name) !== undefined;
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
      var $a, $b, self = this;

      if (value == null) {
        value = nil
      }
      if ((($a = ($b = value['$nil?'](), $b !== false && $b !== nil ?name['$is_a?']($scope.get('String')) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.css(name)
      } else if ((($a = name['$is_a?']($scope.get('Hash'))) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.css(name.$to_n());
        } else {
        self.css(name, value);
      };
      return self;
    };

    def.$animate = TMP_2 = function(params) {
      var $a, self = this, $iter = TMP_2.$$p, block = $iter || nil, speed = nil;

      TMP_2.$$p = null;
      speed = (function() {if ((($a = params['$has_key?']("speed")) !== nil && (!$a.$$is_boolean || $a == true))) {
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

    def.$effect = TMP_3 = function(name, args) {
      var $a, $b, TMP_4, $c, TMP_5, self = this, $iter = TMP_3.$$p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_3.$$p = null;
      name = ($a = ($b = name).$gsub, $a.$$p = (TMP_4 = function(match){var self = TMP_4.$$s || this;
if (match == null) match = nil;
      return match['$[]'](1).$upcase()}, TMP_4.$$s = self, TMP_4), $a).call($b, /_\w/);
      args = ($a = ($c = args).$map, $a.$$p = (TMP_5 = function(a){var self = TMP_5.$$s || this, $a;
if (a == null) a = nil;
      if ((($a = a['$respond_to?']("to_n")) !== nil && (!$a.$$is_boolean || $a == true))) {
          return a.$to_n()
          } else {
          return nil
        }}, TMP_5.$$s = self, TMP_5), $a).call($c).$compact();
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

    def.$each = TMP_6 = function() {
      var self = this, $iter = TMP_6.$$p, $yield = $iter || nil;

      TMP_6.$$p = null;
      for (var i = 0, length = self.length; i < length; i++) {
      if (Opal.yield1($yield, $(self[i])) === $breaker) return $breaker.$v;
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

      
      if      (self[0] === document) return '#<Element [document]>'
      else if (self[0] === window  ) return '#<Element [window]>'

      var val, el, str, result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        el  = self[i];
        if (!el.tagName) { return '#<Element ['+el.toString()+']'; }

        str = "<" + el.tagName.toLowerCase();

        if (val = el.id) str += (' id="' + val + '"');
        if (val = el.className) str += (' class="' + val + '"');

        result.push(str + '>');
      }

      return '#<Element [' + result.join(', ') + ']>';
    
    };

    def.$to_s = function() {
      var self = this;

      
      var val, el, result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        el  = self[i];

        result.push(el.outerHTML)
      }

      return result.join(', ');
    
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

    Opal.defn(self, '$empty?', def['$none?']);

    def.$on = TMP_7 = function(name, sel) {
      var self = this, $iter = TMP_7.$$p, block = $iter || nil;

      if (sel == null) {
        sel = nil
      }
      TMP_7.$$p = null;
      
      var wrapper = function(evt) {
        if (evt.preventDefault) {
          evt = $scope.get('Event').$new(evt);
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

    def.$one = TMP_8 = function(name, sel) {
      var self = this, $iter = TMP_8.$$p, block = $iter || nil;

      if (sel == null) {
        sel = nil
      }
      TMP_8.$$p = null;
      
      var wrapper = function(evt) {
        if (evt.preventDefault) {
          evt = $scope.get('Event').$new(evt);
        }

        return block.apply(null, arguments);
      };

      block._jq_wrap = wrapper;

      if (sel == nil) {
        self.one(name, wrapper);
      }
      else {
        self.one(name, sel, wrapper);
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

    def.$serialize_array = function() {
      var $a, $b, TMP_9, self = this;

      return ($a = ($b = (self.serializeArray())).$map, $a.$$p = (TMP_9 = function(e){var self = TMP_9.$$s || this;
if (e == null) e = nil;
      return $scope.get('Hash').$new(e)}, TMP_9.$$s = self, TMP_9), $a).call($b);
    };

    Opal.defn(self, '$size', def.$length);

    def.$value = function() {
      var self = this;

      return self.val() || "";
    };

    def.$height = function() {
      var self = this;

      return self.height() || nil;
    };

    def.$width = function() {
      var self = this;

      return self.width() || nil;
    };

    return (def.$position = function() {
      var self = this;

      return self.$Native(self.position());
    }, nil) && 'position';
  })(self, $scope.get('JQUERY_CLASS').$to_n());
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal/jquery/window"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $gvars = Opal.gvars;

  Opal.add_stubs(['$require', '$include', '$find', '$on', '$to_proc', '$element', '$off', '$trigger', '$new']);
  self.$require("opal/jquery/element");
  (function($base) {
    var self = $module($base, 'Browser');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $Window(){};
      var self = $Window = $klass($base, $super, 'Window', $Window);

      var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2;

      def.element = nil;
      self.$include($scope.get('Native'));

      def.$element = function() {
        var $a, self = this;

        return ((($a = self.element) !== false && $a !== nil) ? $a : self.element = $scope.get('Element').$find(window));
      };

      def.$on = TMP_1 = function(args) {
        var $a, $b, self = this, $iter = TMP_1.$$p, block = $iter || nil;

        args = $slice.call(arguments, 0);
        TMP_1.$$p = null;
        return ($a = ($b = self.$element()).$on, $a.$$p = block.$to_proc(), $a).apply($b, [].concat(args));
      };

      def.$off = TMP_2 = function(args) {
        var $a, $b, self = this, $iter = TMP_2.$$p, block = $iter || nil;

        args = $slice.call(arguments, 0);
        TMP_2.$$p = null;
        return ($a = ($b = self.$element()).$off, $a.$$p = block.$to_proc(), $a).apply($b, [].concat(args));
      };

      return (def.$trigger = function(args) {
        var $a, self = this;

        args = $slice.call(arguments, 0);
        return ($a = self.$element()).$trigger.apply($a, [].concat(args));
      }, nil) && 'trigger';
    })(self, null)
  })(self);
  Opal.cdecl($scope, 'Window', (($scope.get('Browser')).$$scope.get('Window')).$new(window));
  return $gvars.window = $scope.get('Window');
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal/jquery/document"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $gvars = Opal.gvars;

  Opal.add_stubs(['$require', '$to_n', '$find', '$send']);
  self.$require("opal/jquery/constants");
  self.$require("opal/jquery/element");
  (function($base) {
    var self = $module($base, 'Browser');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base) {
      var self = $module($base, 'DocumentMethods');

      var def = self.$$proto, $scope = self.$$scope, TMP_1;

      var $ = $scope.get('JQUERY_SELECTOR').$to_n();

      Opal.defn(self, '$ready?', TMP_1 = function() {
        var self = this, $iter = TMP_1.$$p, block = $iter || nil;

        TMP_1.$$p = null;
        if ((block !== nil)) {
          return $(block);
          } else {
          return nil
        };
      });

      Opal.defn(self, '$title', function() {
        var self = this;

        return document.title;
      });

      Opal.defn(self, '$title=', function(title) {
        var self = this;

        return document.title = title;
      });

      Opal.defn(self, '$head', function() {
        var self = this;

        return $scope.get('Element').$find(document.head);
      });

      Opal.defn(self, '$body', function() {
        var self = this;

        return $scope.get('Element').$find(document.body);
      });
    })(self)
  })(self);
  Opal.cdecl($scope, 'Document', $scope.get('Element').$find(document));
  $scope.get('Document').$send("extend", (($scope.get('Browser')).$$scope.get('DocumentMethods')));
  return $gvars.document = $scope.get('Document');
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal/jquery/event"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$require', '$to_n', '$stop', '$prevent']);
  self.$require("opal/jquery/constants");
  return (function($base, $super) {
    function $Event(){};
    var self = $Event = $klass($base, $super, 'Event', $Event);

    var def = self.$$proto, $scope = self.$$scope;

    def["native"] = nil;
    var $ = $scope.get('JQUERY_SELECTOR').$to_n();

    def.$initialize = function(native$) {
      var self = this;

      return self["native"] = native$;
    };

    def.$to_n = function() {
      var self = this;

      return self["native"];
    };

    def['$[]'] = function(name) {
      var self = this;

      return self["native"][name];
    };

    def.$type = function() {
      var self = this;

      return self["native"].type;
    };

    def.$element = function() {
      var self = this;

      return $(self["native"].currentTarget);
    };

    Opal.defn(self, '$current_target', def.$element);

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

      return self["native"].isPropagationStopped();
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

    def.$meta_key = function() {
      var self = this;

      return self["native"].metaKey;
    };

    def.$alt_key = function() {
      var self = this;

      return self["native"].altKey;
    };

    def.$shift_key = function() {
      var self = this;

      return self["native"].shiftKey;
    };

    def.$key_code = function() {
      var self = this;

      return self["native"].keyCode;
    };

    def.$which = function() {
      var self = this;

      return self["native"].which;
    };

    Opal.defn(self, '$default_prevented?', def['$prevented?']);

    Opal.defn(self, '$prevent_default', def.$prevent);

    Opal.defn(self, '$propagation_stopped?', def['$stopped?']);

    Opal.defn(self, '$stop_propagation', def.$stop);

    return Opal.defn(self, '$stop_immediate_propagation', def.$stop_immediate);
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["json"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $hash2 = Opal.hash2, $klass = Opal.klass;

  Opal.add_stubs(['$new', '$push', '$[]=', '$[]', '$create_id', '$json_create', '$attr_accessor', '$create_id=', '$===', '$parse', '$generate', '$from_object', '$to_json', '$responds_to?', '$to_io', '$write', '$to_s', '$to_a', '$strftime']);
  (function($base) {
    var self = $module($base, 'JSON');

    var def = self.$$proto, $scope = self.$$scope, $a, $b;

    
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

          if (value.$$is_array) {
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
            if ((klass = (hash)['$[]']($scope.get('JSON').$create_id())) != nil) {
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
      var $scope = self.$$scope, def = self.$$proto;

      return self.$attr_accessor("create_id")
    })(self.$singleton_class());

    (($a = ["json_class"]), $b = self, $b['$create_id='].apply($b, $a), $a[$a.length-1]);

    Opal.defs(self, '$[]', function(value, options) {
      var $a, self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      if ((($a = $scope.get('String')['$==='](value)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.$parse(value, options)
        } else {
        return self.$generate(value, options)
      };
    });

    Opal.defs(self, '$parse', function(source, options) {
      var self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      return self.$from_object($parse(source), options);
    });

    Opal.defs(self, '$parse!', function(source, options) {
      var self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      return self.$parse(source, options);
    });

    Opal.defs(self, '$from_object', function(js_object, options) {
      var $a, $b, $c, self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      ($a = "object_class", $b = options, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, $scope.get('Hash'))));
      ($a = "array_class", $b = options, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, $scope.get('Array'))));
      return to_opal(js_object, options.smap);
    });

    Opal.defs(self, '$generate', function(obj, options) {
      var self = this;

      if (options == null) {
        options = $hash2([], {})
      }
      return obj.$to_json(options);
    });

    Opal.defs(self, '$dump', function(obj, io, limit) {
      var $a, self = this, string = nil;

      if (io == null) {
        io = nil
      }
      if (limit == null) {
        limit = nil
      }
      string = self.$generate(obj);
      if (io !== false && io !== nil) {
        if ((($a = io['$responds_to?']("to_io")) !== nil && (!$a.$$is_boolean || $a == true))) {
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

    var def = self.$$proto, $scope = self.$$scope;

    return (Opal.defn(self, '$to_json', function() {
      var self = this;

      return self.$to_s().$to_json();
    }), nil) && 'to_json'
  })(self, null);
  (function($base) {
    var self = $module($base, 'Enumerable');

    var def = self.$$proto, $scope = self.$$scope;

    Opal.defn(self, '$to_json', function() {
      var self = this;

      return self.$to_a().$to_json();
    })
  })(self);
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self.$$proto, $scope = self.$$scope;

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

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_json = function() {
      var self = this;

      return (self == true) ? 'true' : 'false';
    }, nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $Hash(){};
    var self = $Hash = $klass($base, $super, 'Hash', $Hash);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_json = function() {
      var self = this;

      
      var inspect = [],
          keys = self.keys,
          _map = self.map,
          smap = self.smap,
          map, khash;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        if (key.$$is_string) {
          map = smap;
          khash = key;
        } else {
          map = _map;
          khash = key.$hash();
        }

        inspect.push((key).$to_s().$to_json() + ':' + (map[khash]).$to_json());
      }

      return '{' + inspect.join(', ') + '}';
    ;
    }, nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $NilClass(){};
    var self = $NilClass = $klass($base, $super, 'NilClass', $NilClass);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_json = function() {
      var self = this;

      return "null";
    }, nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $Numeric(){};
    var self = $Numeric = $klass($base, $super, 'Numeric', $Numeric);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_json = function() {
      var self = this;

      return self.toString();
    }, nil) && 'to_json'
  })(self, null);
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self.$$proto, $scope = self.$$scope;

    return Opal.defn(self, '$to_json', def.$inspect)
  })(self, null);
  (function($base, $super) {
    function $Time(){};
    var self = $Time = $klass($base, $super, 'Time', $Time);

    var def = self.$$proto, $scope = self.$$scope;

    return (def.$to_json = function() {
      var self = this;

      return self.$strftime("%FT%T%z").$to_json();
    }, nil) && 'to_json'
  })(self, null);
  return (function($base, $super) {
    function $Date(){};
    var self = $Date = $klass($base, $super, 'Date', $Date);

    var def = self.$$proto, $scope = self.$$scope;

    def.$to_json = function() {
      var self = this;

      return self.$to_s().$to_json();
    };

    return (def.$as_json = function() {
      var self = this;

      return self.$to_s();
    }, nil) && 'as_json';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["promise"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_le(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs <= rhs : lhs['$<='](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $hash2 = Opal.hash2;

  Opal.add_stubs(['$resolve', '$new', '$reject', '$attr_reader', '$===', '$value', '$has_key?', '$keys', '$!', '$==', '$<<', '$>>', '$exception?', '$[]', '$resolved?', '$rejected?', '$error', '$include?', '$action', '$realized?', '$raise', '$^', '$call', '$resolve!', '$exception!', '$reject!', '$class', '$object_id', '$inspect', '$act?', '$nil?', '$prev', '$push', '$concat', '$it', '$lambda', '$reverse', '$pop', '$length', '$shift', '$each', '$wait', '$then', '$to_proc', '$map', '$reduce', '$always', '$try', '$tap', '$all?', '$find']);
  return (function($base, $super) {
    function $Promise(){};
    var self = $Promise = $klass($base, $super, 'Promise', $Promise);

    var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2, TMP_3, TMP_4;

    def.value = def.action = def.exception = def.realized = def.delayed = def.error = def.prev = def.next = nil;
    Opal.defs(self, '$value', function(value) {
      var self = this;

      return self.$new().$resolve(value);
    });

    Opal.defs(self, '$error', function(value) {
      var self = this;

      return self.$new().$reject(value);
    });

    Opal.defs(self, '$when', function(promises) {
      var self = this;

      promises = $slice.call(arguments, 0);
      return $scope.get('When').$new(promises);
    });

    self.$attr_reader("error", "prev", "next");

    def.$initialize = function(action) {
      var self = this;

      if (action == null) {
        action = $hash2([], {})
      }
      self.action = action;
      self.realized = false;
      self.exception = false;
      self.value = nil;
      self.error = nil;
      self.delayed = false;
      self.prev = nil;
      return self.next = nil;
    };

    def.$value = function() {
      var $a, self = this;

      if ((($a = $scope.get('Promise')['$==='](self.value)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.value.$value()
        } else {
        return self.value
      };
    };

    def['$act?'] = function() {
      var $a, self = this;

      return ((($a = self.action['$has_key?']("success")) !== false && $a !== nil) ? $a : self.action['$has_key?']("always"));
    };

    def.$action = function() {
      var self = this;

      return self.action.$keys();
    };

    def['$exception?'] = function() {
      var self = this;

      return self.exception;
    };

    def['$realized?'] = function() {
      var self = this;

      return self.realized['$!']()['$!']();
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
      var $a, $b, $c, self = this;

      self.next = promise;
      if ((($a = self['$exception?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        promise.$reject(self.delayed['$[]'](0))
      } else if ((($a = self['$resolved?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        promise.$resolve((function() {if ((($a = self.delayed) !== nil && (!$a.$$is_boolean || $a == true))) {
          return self.delayed['$[]'](0)
          } else {
          return self.$value()
        }; return nil; })())
      } else if ((($a = self['$rejected?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        if ((($a = ((($b = self.action['$has_key?']("failure")['$!']()) !== false && $b !== nil) ? $b : $scope.get('Promise')['$==='](((function() {if ((($c = self.delayed) !== nil && (!$c.$$is_boolean || $c == true))) {
          return self.delayed['$[]'](0)
          } else {
          return self.error
        }; return nil; })())))) !== nil && (!$a.$$is_boolean || $a == true))) {
          promise.$reject((function() {if ((($a = self.delayed) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self.delayed['$[]'](0)
            } else {
            return self.$error()
          }; return nil; })())
        } else if ((($a = promise.$action()['$include?']("always")) !== nil && (!$a.$$is_boolean || $a == true))) {
          promise.$reject((function() {if ((($a = self.delayed) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self.delayed['$[]'](0)
            } else {
            return self.$error()
          }; return nil; })())}};
      return self;
    };

    def.$resolve = function(value) {
      var $a, $b, self = this, block = nil, e = nil;

      if (value == null) {
        value = nil
      }
      if ((($a = self['$realized?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "the promise has already been realized")};
      if ((($a = $scope.get('Promise')['$==='](value)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return (value['$<<'](self.prev))['$^'](self)};
      try {
      if ((($a = block = ((($b = self.action['$[]']("success")) !== false && $b !== nil) ? $b : self.action['$[]']("always"))) !== nil && (!$a.$$is_boolean || $a == true))) {
          value = block.$call(value)};
        self['$resolve!'](value);
      } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
        self['$exception!'](e)
        }else { throw $err; }
      };
      return self;
    };

    def['$resolve!'] = function(value) {
      var $a, self = this;

      self.realized = "resolve";
      self.value = value;
      if ((($a = self.next) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.next.$resolve(value)
        } else {
        return self.delayed = [value]
      };
    };

    def.$reject = function(value) {
      var $a, $b, self = this, block = nil, e = nil;

      if (value == null) {
        value = nil
      }
      if ((($a = self['$realized?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "the promise has already been realized")};
      if ((($a = $scope.get('Promise')['$==='](value)) !== nil && (!$a.$$is_boolean || $a == true))) {
        return (value['$<<'](self.prev))['$^'](self)};
      try {
      if ((($a = block = ((($b = self.action['$[]']("failure")) !== false && $b !== nil) ? $b : self.action['$[]']("always"))) !== nil && (!$a.$$is_boolean || $a == true))) {
          value = block.$call(value)};
        if ((($a = self.action['$has_key?']("always")) !== nil && (!$a.$$is_boolean || $a == true))) {
          self['$resolve!'](value)
          } else {
          self['$reject!'](value)
        };
      } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
        self['$exception!'](e)
        }else { throw $err; }
      };
      return self;
    };

    def['$reject!'] = function(value) {
      var $a, self = this;

      self.realized = "reject";
      self.error = value;
      if ((($a = self.next) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.next.$reject(value)
        } else {
        return self.delayed = [value]
      };
    };

    def['$exception!'] = function(error) {
      var self = this;

      self.exception = true;
      return self['$reject!'](error);
    };

    def.$then = TMP_1 = function() {
      var $a, self = this, $iter = TMP_1.$$p, block = $iter || nil;

      TMP_1.$$p = null;
      if ((($a = self.next) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "a promise has already been chained")};
      return self['$^']($scope.get('Promise').$new($hash2(["success"], {"success": block})));
    };

    Opal.defn(self, '$do', def.$then);

    def.$fail = TMP_2 = function() {
      var $a, self = this, $iter = TMP_2.$$p, block = $iter || nil;

      TMP_2.$$p = null;
      if ((($a = self.next) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "a promise has already been chained")};
      return self['$^']($scope.get('Promise').$new($hash2(["failure"], {"failure": block})));
    };

    Opal.defn(self, '$rescue', def.$fail);

    Opal.defn(self, '$catch', def.$fail);

    def.$always = TMP_3 = function() {
      var $a, self = this, $iter = TMP_3.$$p, block = $iter || nil;

      TMP_3.$$p = null;
      if ((($a = self.next) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "a promise has already been chained")};
      return self['$^']($scope.get('Promise').$new($hash2(["always"], {"always": block})));
    };

    Opal.defn(self, '$finally', def.$always);

    Opal.defn(self, '$ensure', def.$always);

    def.$trace = TMP_4 = function(depth) {
      var $a, self = this, $iter = TMP_4.$$p, block = $iter || nil;

      if (depth == null) {
        depth = nil
      }
      TMP_4.$$p = null;
      if ((($a = self.next) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$raise($scope.get('ArgumentError'), "a promise has already been chained")};
      return self['$^']($scope.get('Trace').$new(depth, block));
    };

    def.$inspect = function() {
      var $a, self = this, result = nil;

      result = "#<" + (self.$class()) + "(" + (self.$object_id()) + ")";
      if ((($a = self.next) !== nil && (!$a.$$is_boolean || $a == true))) {
        result = $rb_plus(result, " >> " + (self.next.$inspect()))};
      if ((($a = self['$realized?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        result = $rb_plus(result, ": " + ((((($a = self.value) !== false && $a !== nil) ? $a : self.error)).$inspect()) + ">")
        } else {
        result = $rb_plus(result, ">")
      };
      return result;
    };

    (function($base, $super) {
      function $Trace(){};
      var self = $Trace = $klass($base, $super, 'Trace', $Trace);

      var def = self.$$proto, $scope = self.$$scope, TMP_6;

      Opal.defs(self, '$it', function(promise) {
        var $a, $b, self = this, current = nil, prev = nil;

        current = [];
        if ((($a = ((($b = promise['$act?']()) !== false && $b !== nil) ? $b : promise.$prev()['$nil?']())) !== nil && (!$a.$$is_boolean || $a == true))) {
          current.$push(promise.$value())};
        if ((($a = prev = promise.$prev()) !== nil && (!$a.$$is_boolean || $a == true))) {
          return current.$concat(self.$it(prev))
          } else {
          return current
        };
      });

      return (def.$initialize = TMP_6 = function(depth, block) {
        var $a, $b, TMP_5, self = this, $iter = TMP_6.$$p, $yield = $iter || nil;

        TMP_6.$$p = null;
        self.depth = depth;
        return Opal.find_super_dispatcher(self, 'initialize', TMP_6, null).apply(self, [$hash2(["success"], {"success": ($a = ($b = self).$lambda, $a.$$p = (TMP_5 = function(){var self = TMP_5.$$s || this, $a, $b, trace = nil;

        trace = $scope.get('Trace').$it(self).$reverse();
          trace.$pop();
          if ((($a = (($b = depth !== false && depth !== nil) ? $rb_le(depth, trace.$length()) : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
            trace.$shift($rb_minus(trace.$length(), depth))};
          return ($a = block).$call.apply($a, [].concat(trace));}, TMP_5.$$s = self, TMP_5), $a).call($b)})]);
      }, nil) && 'initialize';
    })(self, self);

    return (function($base, $super) {
      function $When(){};
      var self = $When = $klass($base, $super, 'When', $When);

      var def = self.$$proto, $scope = self.$$scope, TMP_7, TMP_9, TMP_11, TMP_13, TMP_17;

      def.wait = nil;
      def.$initialize = TMP_7 = function(promises) {
        var $a, $b, TMP_8, self = this, $iter = TMP_7.$$p, $yield = $iter || nil;

        if (promises == null) {
          promises = []
        }
        TMP_7.$$p = null;
        Opal.find_super_dispatcher(self, 'initialize', TMP_7, null).apply(self, []);
        self.wait = [];
        return ($a = ($b = promises).$each, $a.$$p = (TMP_8 = function(promise){var self = TMP_8.$$s || this;
if (promise == null) promise = nil;
        return self.$wait(promise)}, TMP_8.$$s = self, TMP_8), $a).call($b);
      };

      def.$each = TMP_9 = function() {
        var $a, $b, TMP_10, self = this, $iter = TMP_9.$$p, block = $iter || nil;

        TMP_9.$$p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.get('ArgumentError'), "no block given")
        };
        return ($a = ($b = self).$then, $a.$$p = (TMP_10 = function(values){var self = TMP_10.$$s || this, $a, $b;
if (values == null) values = nil;
        return ($a = ($b = values).$each, $a.$$p = block.$to_proc(), $a).call($b)}, TMP_10.$$s = self, TMP_10), $a).call($b);
      };

      def.$collect = TMP_11 = function() {
        var $a, $b, TMP_12, self = this, $iter = TMP_11.$$p, block = $iter || nil;

        TMP_11.$$p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.get('ArgumentError'), "no block given")
        };
        return ($a = ($b = self).$then, $a.$$p = (TMP_12 = function(values){var self = TMP_12.$$s || this, $a, $b;
if (values == null) values = nil;
        return $scope.get('When').$new(($a = ($b = values).$map, $a.$$p = block.$to_proc(), $a).call($b))}, TMP_12.$$s = self, TMP_12), $a).call($b);
      };

      def.$inject = TMP_13 = function(args) {
        var $a, $b, TMP_14, self = this, $iter = TMP_13.$$p, block = $iter || nil;

        args = $slice.call(arguments, 0);
        TMP_13.$$p = null;
        return ($a = ($b = self).$then, $a.$$p = (TMP_14 = function(values){var self = TMP_14.$$s || this, $a, $b;
if (values == null) values = nil;
        return ($a = ($b = values).$reduce, $a.$$p = block.$to_proc(), $a).apply($b, [].concat(args))}, TMP_14.$$s = self, TMP_14), $a).call($b);
      };

      Opal.defn(self, '$map', def.$collect);

      Opal.defn(self, '$reduce', def.$inject);

      def.$wait = function(promise) {
        var $a, $b, TMP_15, self = this;

        if ((($a = $scope.get('Promise')['$==='](promise)) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          promise = $scope.get('Promise').$value(promise)
        };
        if ((($a = promise['$act?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          promise = promise.$then()};
        self.wait['$<<'](promise);
        ($a = ($b = promise).$always, $a.$$p = (TMP_15 = function(){var self = TMP_15.$$s || this, $a;
          if (self.next == null) self.next = nil;

        if ((($a = self.next) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self.$try()
            } else {
            return nil
          }}, TMP_15.$$s = self, TMP_15), $a).call($b);
        return self;
      };

      Opal.defn(self, '$and', def.$wait);

      def['$>>'] = TMP_17 = function() {var $zuper = $slice.call(arguments, 0);
        var $a, $b, TMP_16, self = this, $iter = TMP_17.$$p, $yield = $iter || nil;

        TMP_17.$$p = null;
        return ($a = ($b = Opal.find_super_dispatcher(self, '>>', TMP_17, $iter).apply(self, $zuper)).$tap, $a.$$p = (TMP_16 = function(){var self = TMP_16.$$s || this;

        return self.$try()}, TMP_16.$$s = self, TMP_16), $a).call($b);
      };

      return (def.$try = function() {
        var $a, $b, $c, $d, self = this, promise = nil;

        if ((($a = ($b = ($c = self.wait)['$all?'], $b.$$p = "realized?".$to_proc(), $b).call($c)) !== nil && (!$a.$$is_boolean || $a == true))) {
          if ((($a = promise = ($b = ($d = self.wait).$find, $b.$$p = "rejected?".$to_proc(), $b).call($d)) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self.$reject(promise.$error())
            } else {
            return self.$resolve(($a = ($b = self.wait).$map, $a.$$p = "value".$to_proc(), $a).call($b))
          }
          } else {
          return nil
        };
      }, nil) && 'try';
    })(self, self);
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal/jquery/http"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $hash2 = Opal.hash2;

  Opal.add_stubs(['$require', '$to_n', '$each', '$define_singleton_method', '$send', '$new', '$define_method', '$attr_reader', '$delete', '$update', '$upcase', '$succeed', '$fail', '$promise', '$parse', '$private', '$tap', '$proc', '$ok?', '$resolve', '$reject', '$from_object', '$call']);
  self.$require("json");
  self.$require("native");
  self.$require("promise");
  self.$require("opal/jquery/constants");
  return (function($base, $super) {
    function $HTTP(){};
    var self = $HTTP = $klass($base, $super, 'HTTP', $HTTP);

    var def = self.$$proto, $scope = self.$$scope, $a, $b, TMP_1;

    def.settings = def.payload = def.url = def.method = def.handler = def.json = def.body = def.ok = def.xhr = def.promise = def.status_code = nil;
    var $ = $scope.get('JQUERY_SELECTOR').$to_n();

    Opal.cdecl($scope, 'ACTIONS', ["get", "post", "put", "delete", "patch", "head"]);

    ($a = ($b = $scope.get('ACTIONS')).$each, $a.$$p = (TMP_1 = function(action){var self = TMP_1.$$s || this, $a, $b, TMP_2, $c, TMP_3;
if (action == null) action = nil;
    ($a = ($b = self).$define_singleton_method, $a.$$p = (TMP_2 = function(url, options){var self = TMP_2.$$s || this, block;
if (url == null) url = nil;if (options == null) options = $hash2([], {});
        block = TMP_2.$$p || nil, TMP_2.$$p = null;
      return self.$new().$send(action, url, options, block)}, TMP_2.$$s = self, TMP_2), $a).call($b, action);
      return ($a = ($c = self).$define_method, $a.$$p = (TMP_3 = function(url, options){var self = TMP_3.$$s || this, block;
if (url == null) url = nil;if (options == null) options = $hash2([], {});
        block = TMP_3.$$p || nil, TMP_3.$$p = null;
      return self.$send(action, url, options, block)}, TMP_3.$$s = self, TMP_3), $a).call($c, action);}, TMP_1.$$s = self, TMP_1), $a).call($b);

    Opal.defs(self, '$setup', function() {
      var self = this;

      return $scope.get('Hash').$new($.ajaxSetup());
    });

    Opal.defs(self, '$setup=', function(settings) {
      var self = this;

      return $.ajaxSetup(settings.$to_n());
    });

    self.$attr_reader("body", "error_message", "method", "status_code", "url", "xhr");

    def.$initialize = function() {
      var self = this;

      self.settings = $hash2([], {});
      return self.ok = true;
    };

    def.$send = function(method, url, options, block) {
      var $a, self = this, settings = nil, payload = nil;

      self.method = method;
      self.url = url;
      self.payload = options.$delete("payload");
      self.handler = block;
      self.settings.$update(options);
      $a = [self.settings.$to_n(), self.payload], settings = $a[0], payload = $a[1];
      
      if (typeof(payload) === 'string') {
        settings.data = payload;
      }
      else if (payload != nil) {
        settings.data = payload.$to_json();
        settings.contentType = 'application/json';
      }

      settings.url  = self.url;
      settings.type = self.method.$upcase();

      settings.success = function(data, status, xhr) {
        return self.$succeed(data, status, xhr);
      };

      settings.error = function(xhr, status, error) {
        return self.$fail(xhr, status, error);
      };

      $.ajax(settings);
    ;
      if ((($a = self.handler) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self
        } else {
        return self.$promise()
      };
    };

    def.$json = function() {
      var $a, self = this;

      return ((($a = self.json) !== false && $a !== nil) ? $a : self.json = $scope.get('JSON').$parse(self.body));
    };

    def['$ok?'] = function() {
      var self = this;

      return self.ok;
    };

    def.$get_header = function(key) {
      var self = this;

      return self.xhr.getResponseHeader(key);;
    };

    self.$private();

    def.$promise = function() {
      var $a, $b, TMP_4, self = this;

      if ((($a = self.promise) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.promise};
      return self.promise = ($a = ($b = $scope.get('Promise').$new()).$tap, $a.$$p = (TMP_4 = function(promise){var self = TMP_4.$$s || this, $a, $b, TMP_5;
if (promise == null) promise = nil;
      return self.handler = ($a = ($b = self).$proc, $a.$$p = (TMP_5 = function(res){var self = TMP_5.$$s || this, $a;
if (res == null) res = nil;
        if ((($a = res['$ok?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return promise.$resolve(res)
            } else {
            return promise.$reject(res)
          }}, TMP_5.$$s = self, TMP_5), $a).call($b)}, TMP_4.$$s = self, TMP_4), $a).call($b);
    };

    def.$succeed = function(data, status, xhr) {
      var $a, self = this;

      
      self.body = data;
      self.xhr  = xhr;
      self.status_code = xhr.status;

      if (typeof(data) === 'object') {
        self.json = $scope.get('JSON').$from_object(data);
      }
    ;
      if ((($a = self.handler) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.handler.$call(self)
        } else {
        return nil
      };
    };

    return (def.$fail = function(xhr, status, error) {
      var $a, self = this;

      
      self.body = xhr.responseText;
      self.xhr = xhr;
      self.status_code = xhr.status;
    ;
      self.ok = false;
      if ((($a = self.handler) !== nil && (!$a.$$is_boolean || $a == true))) {
        return self.handler.$call(self)
        } else {
        return nil
      };
    }, nil) && 'fail';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal/jquery/kernel"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module;

  return (function($base) {
    var self = $module($base, 'Kernel');

    var def = self.$$proto, $scope = self.$$scope;

    Opal.defn(self, '$alert', function(msg) {
      var self = this;

      alert(msg);
      return nil;
    })
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal/jquery"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice;

  Opal.add_stubs(['$==', '$require']);
  if ($scope.get('RUBY_ENGINE')['$==']("opal")) {
    self.$require("opal/jquery/window");
    self.$require("opal/jquery/document");
    self.$require("opal/jquery/element");
    self.$require("opal/jquery/event");
    self.$require("opal/jquery/http");
    return self.$require("opal/jquery/kernel");}
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal-jquery"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice;

  Opal.add_stubs(['$require']);
  return self.$require("opal/jquery")
};

/* Generated by Opal 0.8.0 */
Opal.modules["vector2d/calculations"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $module = Opal.module;

  Opal.add_stubs(['$x', '$y', '$normalized?', '$normalize', '$acos', '$dot_product', '$calculate_each', '$sqrt', '$squared_distance', '$coerce', '$class', '$cross_product', '$angle_between', '$private', '$new', '$send']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self.$$proto, $scope = self.$$scope;

    return (function($base) {
      var self = $module($base, 'Calculations');

      var def = self.$$proto, $scope = self.$$scope;

      (function($base) {
        var self = $module($base, 'ClassMethods');

        var def = self.$$proto, $scope = self.$$scope;

        Opal.defn(self, '$cross_product', function(vector1, vector2) {
          var self = this;

          return $rb_minus($rb_times(vector1.$x(), vector2.$y()), $rb_times(vector1.$y(), vector2.$x()));
        });

        Opal.defn(self, '$dot_product', function(vector1, vector2) {
          var self = this;

          return $rb_plus($rb_times(vector1.$x(), vector2.$x()), $rb_times(vector1.$y(), vector2.$y()));
        });

        Opal.defn(self, '$angle_between', function(vector1, vector2) {
          var $a, self = this, one = nil, two = nil;

          one = (function() {if ((($a = vector1['$normalized?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return vector1
            } else {
            return vector1.$normalize()
          }; return nil; })();
          two = (function() {if ((($a = vector2['$normalized?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return vector2
            } else {
            return vector2.$normalize()
          }; return nil; })();
          return $scope.get('Math').$acos(self.$dot_product(one, two));
        });
      })(self);

      Opal.defn(self, '$*', function(other) {
        var self = this;

        return self.$calculate_each("*", other);
      });

      Opal.defn(self, '$/', function(other) {
        var self = this;

        return self.$calculate_each("/", other);
      });

      Opal.defn(self, '$+', function(other) {
        var self = this;

        return self.$calculate_each("+", other);
      });

      Opal.defn(self, '$-', function(other) {
        var self = this;

        return self.$calculate_each("-", other);
      });

      Opal.defn(self, '$distance', function(other) {
        var self = this;

        return $scope.get('Math').$sqrt(self.$squared_distance(other));
      });

      Opal.defn(self, '$squared_distance', function(other) {
        var $a, self = this, v = nil, _ = nil, dx = nil, dy = nil;

        $a = Opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        dx = $rb_minus(v.$x(), self.$x());
        dy = $rb_minus(v.$y(), self.$y());
        return $rb_plus($rb_times(dx, dx), $rb_times(dy, dy));
      });

      Opal.defn(self, '$dot_product', function(other) {
        var $a, self = this, v = nil, _ = nil;

        $a = Opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        return self.$class().$dot_product(self, v);
      });

      Opal.defn(self, '$cross_product', function(other) {
        var $a, self = this, v = nil, _ = nil;

        $a = Opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        return self.$class().$cross_product(self, v);
      });

      Opal.defn(self, '$angle_between', function(other) {
        var $a, self = this, v = nil, _ = nil;

        $a = Opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        return self.$class().$angle_between(self, v);
      });

      self.$private();

      Opal.defn(self, '$calculate_each', function(method, other) {
        var $a, self = this, v = nil, _ = nil;

        $a = Opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        return self.$class().$new(self.$x().$send(method, v.$x()), self.$y().$send(method, v.$y()));
      });
    })(self)
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["vector2d/coercions"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $module = Opal.module, $hash2 = Opal.hash2;

  Opal.add_stubs(['$===', '$parse', '$raise', '$class', '$x', '$y', '$new', '$to_i', '$to_f']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self.$$proto, $scope = self.$$scope;

    return (function($base) {
      var self = $module($base, 'Coercions');

      var def = self.$$proto, $scope = self.$$scope;

      Opal.defn(self, '$coerce', function(other) {
        var self = this, $case = nil;

        return (function() {$case = other;if ($scope.get('Vector2d')['$===']($case)) {return [other, self]}else if ($scope.get('Array')['$===']($case) || $scope.get('Numeric')['$===']($case) || $scope.get('String')['$===']($case) || $scope.get('Hash')['$===']($case)) {return [$scope.get('Vector2d').$parse(other), self]}else {return self.$raise($scope.get('TypeError'), "" + (self.$class()) + " can't be coerced into " + (other.$class()))}})();
      });

      Opal.defn(self, '$inspect', function() {
        var self = this;

        return "Vector2d(" + (self.$x()) + "," + (self.$y()) + ")";
      });

      Opal.defn(self, '$to_a', function() {
        var self = this;

        return [self.$x(), self.$y()];
      });

      Opal.defn(self, '$to_hash', function() {
        var self = this;

        return $hash2(["x", "y"], {"x": self.$x(), "y": self.$y()});
      });

      Opal.defn(self, '$to_i_vector', function() {
        var self = this;

        return self.$class().$new(self.$x().$to_i(), self.$y().$to_i());
      });

      Opal.defn(self, '$to_f_vector', function() {
        var self = this;

        return self.$class().$new(self.$x().$to_f(), self.$y().$to_f());
      });

      Opal.defn(self, '$to_s', function() {
        var self = this;

        return "" + (self.$x()) + "x" + (self.$y());
      });
    })(self)
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["vector2d/fitting"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $module = Opal.module;

  Opal.add_stubs(['$coerce', '$x', '$y', '$fit', '$to_f_vector', '$==', '$alias_method']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self.$$proto, $scope = self.$$scope;

    return (function($base) {
      var self = $module($base, 'Fitting');

      var def = self.$$proto, $scope = self.$$scope;

      Opal.defn(self, '$contain', function(other) {
        var $a, $b, self = this, v = nil, _ = nil;

        $a = Opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        if ((($a = (((($b = $rb_gt(v.$x(), self.$x())) !== false && $b !== nil) ? $b : $rb_gt(v.$y(), self.$y())))) !== nil && (!$a.$$is_boolean || $a == true))) {
          return other.$fit(self)
          } else {
          return other
        };
      });

      Opal.defn(self, '$fit', function(other) {
        var $a, $b, $c, self = this, v = nil, _ = nil, scale = nil;

        $a = Opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        scale = $rb_divide(v.$to_f_vector(), self);
        return $rb_times(self, ((function() {if ((($a = (((($b = scale.$y()['$=='](0)) !== false && $b !== nil) ? $b : ((($c = $rb_gt(scale.$x(), 0)) ? $rb_lt(scale.$x(), scale.$y()) : $c))))) !== nil && (!$a.$$is_boolean || $a == true))) {
          return scale.$x()
          } else {
          return scale.$y()
        }; return nil; })()));
      });

      self.$alias_method("constrain_both", "fit");

      Opal.defn(self, '$fit_either', function(other) {
        var $a, $b, self = this, v = nil, _ = nil, scale = nil;

        $a = Opal.to_ary(self.$coerce(other)), v = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
        scale = $rb_divide(v.$to_f_vector(), self);
        if ((($a = ((($b = $rb_gt(scale.$x(), 0)) ? $rb_gt(scale.$y(), 0) : $b))) !== nil && (!$a.$$is_boolean || $a == true))) {
          scale = (function() {if ((($a = ($rb_lt(scale.$x(), scale.$y()))) !== nil && (!$a.$$is_boolean || $a == true))) {
            return scale.$y()
            } else {
            return scale.$x()
          }; return nil; })();
          return $rb_times(self, scale);
          } else {
          return self.$fit(v)
        };
      });

      self.$alias_method("constrain_one", "fit_either");
    })(self)
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["vector2d/properties"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $module = Opal.module;

  Opal.add_stubs(['$atan2', '$y', '$x', '$abs', '$to_f', '$sqrt', '$squared_length', '$==', '$length']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self.$$proto, $scope = self.$$scope;

    return (function($base) {
      var self = $module($base, 'Properties');

      var def = self.$$proto, $scope = self.$$scope;

      Opal.defn(self, '$angle', function() {
        var self = this;

        return $scope.get('Math').$atan2(self.$y(), self.$x());
      });

      Opal.defn(self, '$aspect_ratio', function() {
        var self = this;

        return ($rb_divide(self.$x().$to_f(), self.$y().$to_f())).$abs();
      });

      Opal.defn(self, '$length', function() {
        var self = this;

        return $scope.get('Math').$sqrt(self.$squared_length());
      });

      Opal.defn(self, '$squared_length', function() {
        var self = this;

        return $rb_plus($rb_times(self.$x(), self.$x()), $rb_times(self.$y(), self.$y()));
      });

      Opal.defn(self, '$normalized?', function() {
        var self = this;

        return self.$length().$to_f()['$=='](1.0);
      });
    })(self)
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["vector2d/transformations"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $module = Opal.module;

  Opal.add_stubs(['$new', '$class', '$ceil', '$x', '$y', '$floor', '$resize', '$-@', '$length', '$cos', '$sin', '$round', '$min']);
  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self.$$proto, $scope = self.$$scope;

    return (function($base) {
      var self = $module($base, 'Transformations');

      var def = self.$$proto, $scope = self.$$scope;

      Opal.defn(self, '$ceil', function() {
        var self = this;

        return self.$class().$new(self.$x().$ceil(), self.$y().$ceil());
      });

      Opal.defn(self, '$floor', function() {
        var self = this;

        return self.$class().$new(self.$x().$floor(), self.$y().$floor());
      });

      Opal.defn(self, '$normalize', function() {
        var self = this;

        return self.$resize(1.0);
      });

      Opal.defn(self, '$perpendicular', function() {
        var self = this;

        return $scope.get('Vector2d').$new(self.$y()['$-@'](), self.$x());
      });

      Opal.defn(self, '$resize', function(new_length) {
        var self = this;

        return $rb_times(self, ($rb_divide(new_length, self.$length())));
      });

      Opal.defn(self, '$reverse', function() {
        var self = this;

        return self.$class().$new(self.$x()['$-@'](), self.$y()['$-@']());
      });

      Opal.defn(self, '$rotate', function(angle) {
        var self = this;

        return $scope.get('Vector2d').$new($rb_minus($rb_times(self.$x(), $scope.get('Math').$cos(angle)), $rb_times(self.$y(), $scope.get('Math').$sin(angle))), $rb_plus($rb_times(self.$x(), $scope.get('Math').$sin(angle)), $rb_times(self.$y(), $scope.get('Math').$cos(angle))));
      });

      Opal.defn(self, '$round', function(digits) {
        var self = this;

        if (digits == null) {
          digits = 0
        }
        return self.$class().$new(self.$x().$round(digits), self.$y().$round(digits));
      });

      Opal.defn(self, '$truncate', function(max) {
        var self = this;

        return self.$resize([max, self.$length()].$min());
      });
    })(self)
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["vector2d/version"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  return (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self.$$proto, $scope = self.$$scope;

    return Opal.cdecl($scope, 'VERSION', "2.1.0")
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["vector2d"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$require', '$extend', '$include', '$nil?', '$parse_single_arg', '$new', '$private', '$===', '$parse', '$parse_str', '$parse_hash', '$dup', '$has_key?', '$[]', '$[]=', '$=~', '$map', '$to_proc', '$split', '$raise', '$attr_reader', '$x', '$y']);
  self.$require("vector2d/calculations");
  self.$require("vector2d/coercions");
  self.$require("vector2d/fitting");
  self.$require("vector2d/properties");
  self.$require("vector2d/transformations");
  self.$require("vector2d/version");
  (function($base, $super) {
    function $Vector2d(){};
    var self = $Vector2d = $klass($base, $super, 'Vector2d', $Vector2d);

    var def = self.$$proto, $scope = self.$$scope;

    self.$extend((((($scope.get('Vector2d')).$$scope.get('Calculations'))).$$scope.get('ClassMethods')));

    self.$include((($scope.get('Vector2d')).$$scope.get('Calculations')));

    self.$include((($scope.get('Vector2d')).$$scope.get('Coercions')));

    self.$include((($scope.get('Vector2d')).$$scope.get('Fitting')));

    self.$include((($scope.get('Vector2d')).$$scope.get('Properties')));

    self.$include((($scope.get('Vector2d')).$$scope.get('Transformations')));

    (function(self) {
      var $scope = self.$$scope, def = self.$$proto;

      self.$$proto.$parse = function(arg, second_arg) {
        var $a, self = this;

        if (second_arg == null) {
          second_arg = nil
        }
        if ((($a = second_arg['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          return self.$parse_single_arg(arg)
          } else {
          return self.$new(arg, second_arg)
        };
      };
      self.$private();
      self.$$proto.$parse_single_arg = function(arg) {
        var $a, self = this, $case = nil;

        return (function() {$case = arg;if ($scope.get('Vector2d')['$===']($case)) {return arg}else if ($scope.get('Array')['$===']($case)) {return ($a = self).$parse.apply($a, [].concat(arg))}else if ($scope.get('String')['$===']($case)) {return self.$parse_str(arg)}else if ($scope.get('Hash')['$===']($case)) {return self.$parse_hash(arg.$dup())}else {return self.$new(arg, arg)}})();
      };
      self.$$proto.$parse_hash = function(hash) {
        var $a, $b, $c, self = this;

        if ((($a = hash['$has_key?']("x")) !== nil && (!$a.$$is_boolean || $a == true))) {
          ($a = "x", $b = hash, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, hash['$[]']("x"))))};
        if ((($a = hash['$has_key?']("y")) !== nil && (!$a.$$is_boolean || $a == true))) {
          ($a = "y", $b = hash, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, hash['$[]']("y"))))};
        return self.$new(hash['$[]']("x"), hash['$[]']("y"));
      };
      return (self.$$proto.$parse_str = function(str) {
        var $a, $b, $c, self = this;

        if ((($a = str['$=~'](/^[\s]*[\d\.]*[\s]*x[\s]*[\d\.]*[\s]*$/)) !== nil && (!$a.$$is_boolean || $a == true))) {
          return ($a = self).$new.apply($a, [].concat(($b = ($c = str.$split("x")).$map, $b.$$p = "to_f".$to_proc(), $b).call($c)))
          } else {
          return self.$raise($scope.get('ArgumentError'), "not a valid string input")
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
  return (Opal.Object.$$proto.$Vector2d = function(args) {
    var $a, self = this;

    args = $slice.call(arguments, 0);
    return ($a = $scope.get('Vector2d')).$parse.apply($a, [].concat(args));
  }, nil) && 'Vector2d';
};

/* Generated by Opal 0.8.0 */
Opal.modules["math"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass;

  Opal.add_stubs(['$===', '$raise', '$type_error', '$to_f', '$log', '$include']);
  return (function($base) {
    var self = $module($base, 'Math');

    var def = self.$$proto, $scope = self.$$scope, $a;

    (function($base, $super) {
      function $DomainError(){};
      var self = $DomainError = $klass($base, $super, 'DomainError', $DomainError);

      var def = self.$$proto, $scope = self.$$scope, TMP_1;

      return (Opal.defs(self, '$new', TMP_1 = function(method) {
        var self = this, $iter = TMP_1.$$p, $yield = $iter || nil;

        TMP_1.$$p = null;
        return Opal.find_super_dispatcher(self, 'new', TMP_1, null, $DomainError).apply(self, ["Numerical argument is out of domain - \"" + (method) + "\""]);
      }), nil) && 'new'
    })(self, $scope.get('StandardError'));

    Opal.cdecl($scope, 'E', Math.E);

    Opal.cdecl($scope, 'PI', Math.PI);

    Opal.defn(self, '$acos', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      x = x.$to_f();

      if (x < -1 || x > 1) {
        self.$raise($scope.get('DomainError'), "acos");
      }

      return Math.acos(x);
    ;
    });

    if ((($a = (typeof(Math.acosh) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
      } else {
      
      Math.acosh = function(x) {
        return Math.log(x + Math.sqrt(x * x - 1));
      }
    
    };

    Opal.defn(self, '$acosh', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.acosh(x.$to_f());
    ;
    });

    Opal.defn(self, '$asin', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      x = x.$to_f();

      if (x < -1 || x > 1) {
        self.$raise($scope.get('DomainError'), "asin");
      }

      return Math.asin(x);
    ;
    });

    if ((($a = (typeof(Math.asinh) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
      } else {
      
      Math.asinh = function(x) {
        return Math.log(x + Math.sqrt(x * x + 1))
      }
    ;
    };

    Opal.defn(self, '$asinh', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.asinh(x.$to_f());
    ;
    });

    Opal.defn(self, '$atan', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.atan(x.$to_f());
    ;
    });

    Opal.defn(self, '$atan2', function(x, y) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      if (!$scope.get('Numeric')['$==='](y)) {
        self.$raise($scope.get('Opal').$type_error(y, $scope.get('Float')));
      }

      return Math.atan2(x.$to_f(), y.$to_f());
    ;
    });

    if ((($a = (typeof(Math.atanh) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
      } else {
      
      Math.atanh = function(x) {
        return 0.5 * Math.log((1 + x) / (1 - x));
      }
    
    };

    Opal.defn(self, '$atanh', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      x = x.$to_f();

      if (x < -1 || x > 1) {
        self.$raise($scope.get('DomainError'), "atanh");
      }

      return Math.atanh(x);
    ;
    });

    Opal.defn(self, '$cbrt', function(x) {
      var self = this;

      return Math.cbrt(x);
    });

    Opal.defn(self, '$cos', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.cos(x.$to_f());
    ;
    });

    if ((($a = (typeof(Math.cosh) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
      } else {
      
      Math.cosh = function(x) {
        return (Math.exp(x) + Math.exp(-x)) / 2;
      }
    
    };

    Opal.defn(self, '$cosh', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.cosh(x.$to_f());
    ;
    });

    Opal.defn(self, '$erf', function(x) {
      var self = this;

      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$erfc', function(x) {
      var self = this;

      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$exp', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.exp(x.$to_f());
    ;
    });

    Opal.defn(self, '$frexp', function(x) {
      var self = this;

      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$gamma', function(x) {
      var self = this;

      return self.$raise($scope.get('NotImplementedError'));
    });

    if ((($a = (typeof(Math.hypot) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
      } else {
      
      Math.hypot = function(x, y) {
        return Math.sqrt(x * x + y * y)
      }
    ;
    };

    Opal.defn(self, '$hypot', function(x, y) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      if (!$scope.get('Numeric')['$==='](y)) {
        self.$raise($scope.get('Opal').$type_error(y, $scope.get('Float')));
      }

      return Math.hypot(x.$to_f(), y.$to_f());
    ;
    });

    Opal.defn(self, '$ldexp', function(flt, int$) {
      var self = this;

      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$lgamma', function(x) {
      var self = this;

      return self.$raise($scope.get('NotImplementedError'));
    });

    Opal.defn(self, '$log', function(num, base, method) {
      var $a, self = this;

      if (base == null) {
        base = $scope.get('E')
      }
      if (method == null) {
        method = nil
      }
      
      if (!$scope.get('Numeric')['$==='](num)) {
        self.$raise($scope.get('Opal').$type_error(num, $scope.get('Float')));
      }

      if (!$scope.get('Numeric')['$==='](base)) {
        self.$raise($scope.get('Opal').$type_error(base, $scope.get('Float')));
      }

      num  = num.$to_f();
      base = base.$to_f();

      if (num < 0) {
        self.$raise($scope.get('DomainError'), ((($a = method) !== false && $a !== nil) ? $a : "log"));
      }

      num = Math.log(num);

      if (base != Math.E) {
        num /= Math.log(base);
      }

      return num
    ;
    });

    if ((($a = (typeof(Math.log10) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
      Opal.defn(self, '$log10', function(num) {
        var self = this;

        
        if (!$scope.get('Numeric')['$==='](num)) {
          self.$raise($scope.get('Opal').$type_error(num, $scope.get('Float')));
        }

        num = num.$to_f();

        if (num < 0) {
          self.$raise($scope.get('DomainError'), "log2");
        }

        return Math.log10(num);
      ;
      })
      } else {
      Opal.defn(self, '$log10', function(num) {
        var self = this;

        return self.$log(num, 10, "log10");
      })
    };

    if ((($a = (typeof(Math.log2) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
      Opal.defn(self, '$log2', function(num) {
        var self = this;

        
        if (!$scope.get('Numeric')['$==='](num)) {
          self.$raise($scope.get('Opal').$type_error(num, $scope.get('Float')));
        }

        num = num.$to_f();

        if (num < 0) {
          self.$raise($scope.get('DomainError'), "log2");
        }

        return Math.log2(num);
      ;
      })
      } else {
      Opal.defn(self, '$log2', function(num) {
        var self = this;

        return self.$log(num, 2, "log2");
      })
    };

    Opal.defn(self, '$sin', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.sin(x.$to_f());
    ;
    });

    if ((($a = (typeof(Math.sinh) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
      } else {
      
      Math.sinh = function(x) {
        return (Math.exp(x) - Math.exp(-x)) / 2;
      }
    
    };

    Opal.defn(self, '$sinh', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.sinh(x.$to_f());
    ;
    });

    Opal.defn(self, '$sqrt', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      x = x.$to_f();

      if (x < 0) {
        self.$raise($scope.get('DomainError'), "log2");
      }

      return Math.sqrt(x);
    ;
    });

    Opal.defn(self, '$tan', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.tan(x.$to_f());
    ;
    });

    if ((($a = (typeof(Math.tanh) !== "undefined")) !== nil && (!$a.$$is_boolean || $a == true))) {
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

    Opal.defn(self, '$tanh', function(x) {
      var self = this;

      
      if (!$scope.get('Numeric')['$==='](x)) {
        self.$raise($scope.get('Opal').$type_error(x, $scope.get('Float')));
      }

      return Math.tanh(x.$to_f());
    ;
    });

    (function(self) {
      var $scope = self.$$scope, def = self.$$proto;

      return self.$include($scope.get('Math'))
    })(self.$singleton_class());
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["consolelogger"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_le(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs <= rhs : lhs['$<='](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $hash2 = Opal.hash2, $gvars = Opal.gvars;

  Opal.add_stubs(['$require', '$attr_reader', '$[]', '$clear_annotations', '$add_annotation', '$write', '$to_sym', '$message', '$invert', '$private', '$first', '$last', '$<<', '$strftime', '$now', '$write_html', '$puts']);
  self.$require("opal-jquery");
  return (function($base, $super) {
    function $ConsoleLogger(){};
    var self = $ConsoleLogger = $klass($base, $super, 'ConsoleLogger', $ConsoleLogger);

    var def = self.$$proto, $scope = self.$$scope;

    def.loglevel = def.annotations = def.console = nil;
    Opal.cdecl($scope, 'LOGLEVELS', $hash2(["message", "error", "warning", "info", "debug"], {"message": 0, "error": 1, "warning": 2, "info": 3, "debug": 4}));

    Opal.cdecl($scope, 'LOGICONS', $hash2(["message", "error", "warning", "info", "debug"], {"message": "icon-info-circled", "error": "icon-error-alt", "warning": "icon-attention", "info": "icon-info-circled", "debug": "icon-minus-squared"}));

    self.$attr_reader("annotations");

    def.$initialize = function(element_id) {
      var self = this;

      self.console = element_id;
      self.loglevel = $scope.get('LOGLEVELS')['$[]']("info");
      return self.$clear_annotations();
    };

    def.$clear_annotations = function() {
      var self = this;

      return self.annotations = [];
    };

    def.$error = function(msg, start_pos, end_pos) {
      var self = this;

      if (start_pos == null) {
        start_pos = nil
      }
      if (end_pos == null) {
        end_pos = nil
      }
      self.$add_annotation(msg, start_pos, end_pos, "error");
      return self.$write("error", msg);
    };

    def.$warning = function(msg, start_pos, end_pos) {
      var self = this;

      if (start_pos == null) {
        start_pos = nil
      }
      if (end_pos == null) {
        end_pos = nil
      }
      self.$add_annotation(msg, start_pos, end_pos, "warning");
      return self.$write("warning", msg);
    };

    def.$info = function(msg, start_pos, end_pos) {
      var self = this;

      if (start_pos == null) {
        start_pos = nil
      }
      if (end_pos == null) {
        end_pos = nil
      }
      self.$add_annotation(msg, start_pos, end_pos, "info");
      return self.$write("info", msg);
    };

    def.$debug = function(msg, start_pos, end_pos) {
      var self = this;

      if (start_pos == null) {
        start_pos = nil
      }
      if (end_pos == null) {
        end_pos = nil
      }
      self.$add_annotation(msg, start_pos, end_pos, "debug");
      return self.$write("debug", msg);
    };

    def.$message = function(msg, start_pos, end_pos) {
      var self = this;

      if (start_pos == null) {
        start_pos = nil
      }
      if (end_pos == null) {
        end_pos = nil
      }
      self.$add_annotation(msg, start_pos, end_pos, "message");
      return self.$write("message", msg);
    };

    def['$loglevel='] = function(level) {
      var $a, self = this;
      if ($gvars.log == null) $gvars.log = nil;

      self.loglevel = ((($a = $scope.get('LOGLEVELS')['$[]'](level.$to_sym())) !== false && $a !== nil) ? $a : $scope.get('LOGLEVELS')['$[]']("debug"));
      return $gvars.log.$message("logging messages up to " + ($scope.get('LOGLEVELS').$invert()['$[]'](self.loglevel)));
    };

    def.$loglevel = function() {
      var self = this;

      return $scope.get('LOGLEVELS').$invert()['$[]'](self.loglevel);
    };

    self.$private();

    def.$add_annotation = function(msg, start_pos, end_pos, type) {
      var $a, self = this, the_start = nil, the_end = nil;

      if (start_pos !== false && start_pos !== nil) {
        the_start = start_pos;
        the_end = ((($a = end_pos) !== false && $a !== nil) ? $a : [the_start.$first(), $rb_plus(the_start.$last(), 1)]);
        self.annotations['$<<']($hash2(["start_pos", "end_pos", "text", "type"], {"start_pos": the_start, "end_pos": the_end, "text": msg, "type": type}));};
      return nil;
    };

    return (def.$write = function(type, msg) {
      var $a, self = this, current_level = nil, time = nil;

      current_level = ((($a = $scope.get('LOGLEVELS')['$[]'](type)) !== false && $a !== nil) ? $a : $scope.get('LOGLEVELS')['$[]']("warning"));
      if ((($a = ($rb_le(current_level, self.loglevel))) !== nil && (!$a.$$is_boolean || $a == true))) {
        time = $scope.get('Time').$now().$strftime("%H:%M:%S");
        self.console.$write_html("<li class='" + (type) + "'><i class=\"" + ($scope.get('LOGICONS')['$[]'](type)) + "\"><span class='time'>" + (time) + "</span><span class='msg'>" + (msg) + "</span></li>");
        return self.$puts(msg);
        } else {
        return nil
      };
    }, nil) && 'write';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["harpnotes"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $hash2 = Opal.hash2, $range = Opal.range, $hash = Opal.hash, $gvars = Opal.gvars;

  Opal.add_stubs(['$attr_accessor', '$first', '$last', '$is_a?', '$raise', '$pitch', '$beat', '$duration', '$first_in_part', '$attr_reader', '$each', '$beat=', '$companion=', '$visible?', '$[]', '$class', '$update_beats', '$<<', '$compact', '$flatten', '$map', '$proxy_note', '$length', '$new', '$expanded_beat_maps', '$select', '$empty?', '$reject', '$notes', '$max', '$keys', '$last_beat', '$private', '$inject', '$get', '$==', '$tuplet', '$floor', '$start_pos', '$error', '$[]=', '$index=', '$index', '$center', '$dotted', '$include', '$push', '$harpnote_options', '$warning', '$initialize', '$compute_beat_compression', '$values', '$min', '$call', '$include?', '$build_synch_points', '$layout_voice', '$each_with_index', '$voices', '$origin', '$make_sheetmark_path', '$meta_data', '$strftime', '$now', '$join', '$split', '$to_i', '$scan', '$pop', '$layout_playable', '$layout_newpart', '$reverse', '$nil?', '$line_width=', '$first_in_part?', '$tuplet_start?', '$tuplet_end?', '$Vector2d', '$make_annotated_bezier_path', '$debug', '$tap', '$to_a', '$to_s', '$tie_end?', '$make_slur_path', '$tie_start?', '$slur_starts', '$slur_ends', '$policy', '$make_path_from_jumpline', '$from', '$to', '$companion', '$position', '$text', '$beat_maps', '$duration_to_id', '$to_json', '$layout_note', '$layout_measure_start', '$layout_accord', '$layout_pause', '$check_duration', '$sort_by', '$visible=', '$x', '$y', '$normalize', '$+@', '$-@', '$name', '$to_sym', '$===', '$start_pos_to_s', '$end_pos', '$rotate', '$angle', '$perpendicular']);
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base) {
      var self = $module($base, 'Music');

      var def = self.$$proto, $scope = self.$$scope;

      (function($base, $super) {
        function $MusicEntity(){};
        var self = $MusicEntity = $klass($base, $super, 'MusicEntity', $MusicEntity);

        var def = self.$$proto, $scope = self.$$scope;

        def.visible = def.start_pos = nil;
        self.$attr_accessor("origin", "beat", "visible", "start_pos", "end_pos");

        def.$initialize = function() {
          var self = this;

          return self.visible = true;
        };

        def['$visible?'] = function() {
          var self = this;

          return self.visible;
        };

        return (def.$start_pos_to_s = function() {
          var self = this;

          return "[" + (self.start_pos.$first()) + ":" + (self.start_pos.$last()) + "]";
        }, nil) && 'start_pos_to_s';
      })(self, null);

      (function($base, $super) {
        function $NonPlayable(){};
        var self = $NonPlayable = $klass($base, $super, 'NonPlayable', $NonPlayable);

        var def = self.$$proto, $scope = self.$$scope;

        def.companion = nil;
        self.$attr_accessor("companion");

        def['$companion='] = function(companion) {
          var $a, self = this;

          if ((($a = companion['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Playable')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            self.$raise("Companion must be playable")
          };
          return self.companion = companion;
        };

        def.$pitch = function() {
          var self = this;

          try {return self.companion.$pitch() } catch ($err) { return nil };
        };

        def.$beat = function() {
          var self = this;

          try {return self.companion.$beat() } catch ($err) { return nil };
        };

        return (def.$duration = function() {
          var self = this;

          try {return self.companion.$duration() } catch ($err) { return nil };
        }, nil) && 'duration';
      })(self, $scope.get('MusicEntity'));

      (function($base, $super) {
        function $Playable(){};
        var self = $Playable = $klass($base, $super, 'Playable', $Playable);

        var def = self.$$proto, $scope = self.$$scope, TMP_1;

        def.tie_end = def.tie_start = def.tuplet_start = def.tuplet_end = nil;
        self.$attr_accessor("first_in_part", "jump_starts", "jump_ends", "slur_starts", "slur_ends", "tie_start", "tie_end", "duration", "tuplet", "tuplet_start", "tuplet_end");

        def.$initialize = TMP_1 = function() {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_1.$$p, $yield = $iter || nil;

          TMP_1.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_1, $iter).apply(self, $zuper);
          self.slur_starts = [];
          self.slur_ends = [];
          self.tie_start = false;
          self.tie_end = false;
          self.tuplet = 1;
          self.tuplet_start = false;
          return self.tuplet_end = false;
        };

        def['$first_in_part?'] = function() {
          var self = this;

          return self.$first_in_part();
        };

        def['$tie_end?'] = function() {
          var self = this;

          return self.tie_end;
        };

        def['$tie_start?'] = function() {
          var self = this;

          return self.tie_start;
        };

        def['$tuplet_start?'] = function() {
          var self = this;

          return self.tuplet_start;
        };

        def['$tuplet_end?'] = function() {
          var self = this;

          return self.tuplet_end;
        };

        return (def.$proxy_note = function() {
          var self = this;

          return self;
        }, nil) && 'proxy_note';
      })(self, $scope.get('MusicEntity'));

      (function($base, $super) {
        function $Note(){};
        var self = $Note = $klass($base, $super, 'Note', $Note);

        var def = self.$$proto, $scope = self.$$scope, TMP_2;

        self.$attr_reader("pitch", "duration");

        return (def.$initialize = TMP_2 = function(pitch, duration) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_2.$$p, $yield = $iter || nil;

          TMP_2.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_2, $iter).apply(self, $zuper);
          self.pitch = pitch;
          return self.duration = duration;
        }, nil) && 'initialize';
      })(self, $scope.get('Playable'));

      (function($base, $super) {
        function $SynchPoint(){};
        var self = $SynchPoint = $klass($base, $super, 'SynchPoint', $SynchPoint);

        var def = self.$$proto, $scope = self.$$scope, TMP_3;

        def.notes = nil;
        self.$attr_reader("notes");

        def.$initialize = TMP_3 = function(notes) {var $zuper = $slice.call(arguments, 0);
          var $a, self = this, $iter = TMP_3.$$p, $yield = $iter || nil;

          TMP_3.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_3, $iter).apply(self, $zuper);
          if ((($a = notes['$is_a?']($scope.get('Array'))) !== nil && (!$a.$$is_boolean || $a == true))) {
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
          return ($a = ($b = self.notes).$each, $a.$$p = (TMP_4 = function(n){var self = TMP_4.$$s || this, $a, $b;
if (n == null) n = nil;
          return (($a = [value]), $b = n, $b['$beat='].apply($b, $a), $a[$a.length-1])}, TMP_4.$$s = self, TMP_4), $a).call($b);
        };

        def.$pitch = function() {
          var self = this;

          return self.notes.$first().$pitch();
        };

        return (def.$proxy_note = function() {
          var self = this;

          return self.notes.$first();
        }, nil) && 'proxy_note';
      })(self, $scope.get('Playable'));

      (function($base, $super) {
        function $Pause(){};
        var self = $Pause = $klass($base, $super, 'Pause', $Pause);

        var def = self.$$proto, $scope = self.$$scope, TMP_5;

        def.visible = nil;
        self.$attr_reader("duration", "pitch");

        def.$initialize = TMP_5 = function(pitch, duration) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_5.$$p, $yield = $iter || nil;

          TMP_5.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_5, $iter).apply(self, $zuper);
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
      })(self, $scope.get('Playable'));

      (function($base, $super) {
        function $MeasureStart(){};
        var self = $MeasureStart = $klass($base, $super, 'MeasureStart', $MeasureStart);

        var def = self.$$proto, $scope = self.$$scope, TMP_6;

        return (def.$initialize = TMP_6 = function(companion) {var $zuper = $slice.call(arguments, 0);
          var $a, $b, self = this, $iter = TMP_6.$$p, $yield = $iter || nil;

          TMP_6.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_6, $iter).apply(self, $zuper);
          (($a = [companion]), $b = self, $b['$companion='].apply($b, $a), $a[$a.length-1]);
          return self.visible = companion['$visible?']();
        }, nil) && 'initialize'
      })(self, $scope.get('NonPlayable'));

      (function($base, $super) {
        function $NewPart(){};
        var self = $NewPart = $klass($base, $super, 'NewPart', $NewPart);

        var def = self.$$proto, $scope = self.$$scope, TMP_7;

        self.$attr_reader("name");

        return (def.$initialize = TMP_7 = function(title) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_7.$$p, $yield = $iter || nil;

          TMP_7.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_7, $iter).apply(self, $zuper);
          return self.name = title;
        }, nil) && 'initialize';
      })(self, $scope.get('NonPlayable'));

      (function($base, $super) {
        function $NoteBoundAnnotation(){};
        var self = $NoteBoundAnnotation = $klass($base, $super, 'NoteBoundAnnotation', $NoteBoundAnnotation);

        var def = self.$$proto, $scope = self.$$scope, TMP_8;

        def.annotations = nil;
        def.$initialize = TMP_8 = function(companion, annotation) {var $zuper = $slice.call(arguments, 0);
          var $a, $b, self = this, $iter = TMP_8.$$p, $yield = $iter || nil;

          TMP_8.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_8, $iter).apply(self, $zuper);
          (($a = [companion]), $b = self, $b['$companion='].apply($b, $a), $a[$a.length-1]);
          return self.annotations = annotation;
        };

        def.$text = function() {
          var self = this;

          return self.annotations['$[]']("text");
        };

        return (def.$position = function() {
          var self = this;

          return self.annotations['$[]']("pos");
        }, nil) && 'position';
      })(self, $scope.get('NonPlayable'));

      (function($base, $super) {
        function $Goto(){};
        var self = $Goto = $klass($base, $super, 'Goto', $Goto);

        var def = self.$$proto, $scope = self.$$scope, TMP_9;

        self.$attr_reader("from", "to", "policy");

        return (def.$initialize = TMP_9 = function(from, to, policy) {var $zuper = $slice.call(arguments, 0);
          var $a, self = this, $iter = TMP_9.$$p, $yield = $iter || nil;

          TMP_9.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_9, $iter).apply(self, $zuper);
          if ((($a = from['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Playable')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            self.$raise("End point of Jump (" + (from.$class()) + ") must be a Playable")
          };
          if ((($a = to['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Playable')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            self.$raise("Start point of Jump (" + (to.$class()) + ") must be a Playable")
          };
          self.from = from;
          self.to = to;
          return self.policy = policy;
        }, nil) && 'initialize';
      })(self, $scope.get('MusicEntity'));

      (function($base, $super) {
        function $BeatMap(){};
        var self = $BeatMap = $klass($base, $super, 'BeatMap', $BeatMap);

        var def = self.$$proto, $scope = self.$$scope;

        self.$attr_accessor("index");

        return (def.$initialize = function(index) {
          var self = this;

          return self.index = index;
        }, nil) && 'initialize';
      })(self, $scope.get('Hash'));

      (function($base, $super) {
        function $Song(){};
        var self = $Song = $klass($base, $super, 'Song', $Song);

        var def = self.$$proto, $scope = self.$$scope;

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
          self.views = [];
          return self.$update_beats();
        };

        def['$<<'] = function(voice) {
          var self = this;

          self.voices['$<<'](voice);
          return self.$update_beats();
        };

        def.$build_synch_points = function(selector) {
          var $a, $b, TMP_10, $c, TMP_12, self = this, syncpoints = nil;

          if (selector == null) {
            selector = nil
          }
          syncpoints = ($a = ($b = self.$expanded_beat_maps()).$map, $a.$$p = (TMP_10 = function(playables){var self = TMP_10.$$s || this, $a, $b, TMP_11, the_playables = nil;
if (playables == null) playables = nil;
          if (selector !== false && selector !== nil) {
              playables = [playables['$[]'](selector.$first()), playables['$[]'](selector.$last())]};
            the_playables = ($a = ($b = playables).$map, $a.$$p = (TMP_11 = function(p){var self = TMP_11.$$s || this, $a, r = nil;
if (p == null) p = nil;
            if ((($a = p['$is_a?']($scope.get('Playable'))) !== nil && (!$a.$$is_boolean || $a == true))) {
                r = p.$proxy_note()};
              return r;}, TMP_11.$$s = self, TMP_11), $a).call($b);
            if ($rb_gt(the_playables.$length(), 1)) {
              return $scope.get('SynchPoint').$new(the_playables)
              } else {
              return nil
            };}, TMP_10.$$s = self, TMP_10), $a).call($b).$flatten().$compact();
          syncpoints = ($a = ($c = syncpoints).$select, $a.$$p = (TMP_12 = function(sp){var self = TMP_12.$$s || this, $a, $b, TMP_13;
if (sp == null) sp = nil;
          return ($a = ($b = sp.$notes()).$reject, $a.$$p = (TMP_13 = function(e){var self = TMP_13.$$s || this;
if (e == null) e = nil;
            return e['$is_a?']($scope.get('Playable'))}, TMP_13.$$s = self, TMP_13), $a).call($b)['$empty?']()}, TMP_12.$$s = self, TMP_12), $a).call($c);
          return syncpoints;
        };

        def.$last_beat = function() {
          var $a, $b, TMP_14, self = this, max_beat = nil;

          return max_beat = ($a = ($b = self.beat_maps).$map, $a.$$p = (TMP_14 = function(map){var self = TMP_14.$$s || this;
if (map == null) map = nil;
          return map.$keys().$max()}, TMP_14.$$s = self, TMP_14), $a).call($b).$max();
        };

        def.$expanded_beat_maps = function() {
          var $a, $b, TMP_15, self = this;

          return ($a = ($b = ($range(0, self.$last_beat(), false))).$map, $a.$$p = (TMP_15 = function(beat){var self = TMP_15.$$s || this, $a, $b, TMP_16;
            if (self.beat_maps == null) self.beat_maps = nil;
if (beat == null) beat = nil;
          return ($a = ($b = self.beat_maps).$map, $a.$$p = (TMP_16 = function(map){var self = TMP_16.$$s || this;
if (map == null) map = nil;
            return map['$[]'](beat)}, TMP_16.$$s = self, TMP_16), $a).call($b)}, TMP_15.$$s = self, TMP_15), $a).call($b);
        };

        self.$private();

        return (def.$update_beats = function() {
          var $a, $b, TMP_17, self = this, tupletmap = nil;

          tupletmap = $hash(1, 1, 2, $rb_divide(3, 2), 3, $rb_divide(2, 3), 4, $rb_divide(3, 4), 5, $rb_divide(2, 5), 6, $rb_divide(2, 6), 7, $rb_divide(2, 7), 8, $rb_divide(3, 8), 9, $rb_divide(2, 9));
          self.beat_maps = ($a = ($b = self.voices).$map, $a.$$p = (TMP_17 = function(voice){var self = TMP_17.$$s || this, $a, $b, TMP_18, $c, $d, TMP_19, current_beat = nil, voice_map = nil;
if (voice == null) voice = nil;
          current_beat = 0;
            voice_map = ($a = ($b = ($c = ($d = voice).$select, $c.$$p = (TMP_19 = function(e){var self = TMP_19.$$s || this;
if (e == null) e = nil;
            return e['$is_a?']($scope.get('Playable'))}, TMP_19.$$s = self, TMP_19), $c).call($d)).$inject, $a.$$p = (TMP_18 = function(map, playable){var self = TMP_18.$$s || this, $a, $b, beats = nil, beat_error = nil, pos = nil;
              if ($gvars.conf == null) $gvars.conf = nil;
              if ($gvars.log == null) $gvars.log = nil;
if (map == null) map = nil;if (playable == null) playable = nil;
            beats = $rb_times(playable.$duration(), $gvars.conf.$get("layout.BEAT_PER_DURATION"));
              if (playable.$tuplet()['$=='](3)) {};
              beats = $rb_times(beats, tupletmap['$[]'](playable.$tuplet()));
              beat_error = $rb_minus(beats, beats.$floor(0));
              if ($rb_gt(beat_error, 0)) {
                pos = playable.$start_pos();
                $gvars.log.$error("unsupported tuplet " + (playable.$tuplet()) + " " + (beat_error), pos);
                beats = beats.$floor(0);};
              map['$[]='](current_beat, playable);
              (($a = [current_beat]), $b = playable, $b['$beat='].apply($b, $a), $a[$a.length-1]);
              current_beat = $rb_plus(current_beat, beats);
              (($a = [voice.$index()]), $b = map, $b['$index='].apply($b, $a), $a[$a.length-1]);
              return map;}, TMP_18.$$s = self, TMP_18), $a).call($b, $scope.get('BeatMap').$new(voice.$index()));
            return voice_map;}, TMP_17.$$s = self, TMP_17), $a).call($b);
          return nil;
        }, nil) && 'update_beats';
      })(self, null);

      (function($base, $super) {
        function $Voice(){};
        var self = $Voice = $klass($base, $super, 'Voice', $Voice);

        var def = self.$$proto, $scope = self.$$scope, TMP_20;

        def.show_voice = def.show_flowline = def.show_jumpline = nil;
        self.$attr_accessor("index", "name", "show_voice", "show_flowline", "show_jumpline");

        def.$initialize = TMP_20 = function() {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_20.$$p, $yield = $iter || nil;

          TMP_20.$$p = null;
          self.show_voice = true;
          self.show_flowline = true;
          self.show_jumpline = true;
          return Opal.find_super_dispatcher(self, 'initialize', TMP_20, $iter).apply(self, $zuper);
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
      })(self, $scope.get('Array'));
    })(self);

    (function($base) {
      var self = $module($base, 'Drawing');

      var def = self.$$proto, $scope = self.$$scope;

      (function($base, $super) {
        function $Sheet(){};
        var self = $Sheet = $klass($base, $super, 'Sheet', $Sheet);

        var def = self.$$proto, $scope = self.$$scope;

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

        var def = self.$$proto, $scope = self.$$scope;

        def.visible = def.line_width = nil;
        def.$initialize = function() {
          var self = this;
          if ($gvars.conf == null) $gvars.conf = nil;

          self.visible = true;
          return self.line_width = $gvars.conf.$get("layout.LINE_THIN");
        };

        def.$center = function() {
          var self = this;

          return self.$raise("center not implemented for " + (self.$class()));
        };

        def['$visible?'] = function() {
          var self = this;

          return self.visible;
        };

        def['$visible='] = function(v) {
          var self = this;

          return self.visible = v;
        };

        def['$line_width='] = function(v) {
          var self = this;

          return self.line_width = v;
        };

        return (def.$line_width = function() {
          var self = this;

          return self.line_width;
        }, nil) && 'line_width';
      })(self, null);

      (function($base, $super) {
        function $Symbol(){};
        var self = $Symbol = $klass($base, $super, 'Symbol', $Symbol);

        var def = self.$$proto, $scope = self.$$scope, TMP_21;

        return (def.$iniitalize = TMP_21 = function() {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_21.$$p, $yield = $iter || nil;

          TMP_21.$$p = null;
          return Opal.find_super_dispatcher(self, 'iniitalize', TMP_21, $iter).apply(self, $zuper);
        }, nil) && 'iniitalize'
      })(self, $scope.get('Drawable'));

      (function($base, $super) {
        function $FlowLine(){};
        var self = $FlowLine = $klass($base, $super, 'FlowLine', $FlowLine);

        var def = self.$$proto, $scope = self.$$scope, TMP_22;

        def.style = nil;
        self.$attr_reader("from", "to", "style", "origin", "center");

        def.$initialize = TMP_22 = function(from, to, style, origin, center) {var $zuper = $slice.call(arguments, 0);
          var $a, self = this, $iter = TMP_22.$$p, $yield = $iter || nil;

          if (style == null) {
            style = "solid"
          }
          if (origin == null) {
            origin = nil
          }
          if (center == null) {
            center = nil
          }
          TMP_22.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_22, $iter).apply(self, $zuper);
          self.from = from;
          self.to = to;
          self.style = style;
          self.origin = origin;
          return self.center = ((($a = center) !== false && $a !== nil) ? $a : to.$center());
        };

        def['$dashed?'] = function() {
          var self = this;

          return self.style['$==']("dashed");
        };

        return (def['$dotted?'] = function() {
          var self = this;

          return self.style['$==']("dotted");
        }, nil) && 'dotted?';
      })(self, $scope.get('Drawable'));

      (function($base, $super) {
        function $Path(){};
        var self = $Path = $klass($base, $super, 'Path', $Path);

        var def = self.$$proto, $scope = self.$$scope, TMP_23;

        def.fill = nil;
        self.$attr_reader("path", "style");

        def.$initialize = TMP_23 = function(path, fill, origin) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_23.$$p, $yield = $iter || nil;

          if (fill == null) {
            fill = nil
          }
          if (origin == null) {
            origin = nil
          }
          TMP_23.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_23, $iter).apply(self, $zuper);
          self.path = path;
          self.fill = fill;
          return self.origin = origin;
        };

        return (def['$filled?'] = function() {
          var self = this;

          return self.fill['$==']("filled");
        }, nil) && 'filled?';
      })(self, $scope.get('Drawable'));

      (function($base, $super) {
        function $Ellipse(){};
        var self = $Ellipse = $klass($base, $super, 'Ellipse', $Ellipse);

        var def = self.$$proto, $scope = self.$$scope, TMP_24;

        def.size = def.fill = nil;
        self.$attr_reader("center", "size", "fill", "dotted", "origin");

        def.$initialize = TMP_24 = function(center, size, fill, dotted, origin) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_24.$$p, $yield = $iter || nil;

          if (fill == null) {
            fill = "filled"
          }
          if (dotted == null) {
            dotted = $scope.get('TRUE')
          }
          if (origin == null) {
            origin = nil
          }
          TMP_24.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_24, $iter).apply(self, $zuper);
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
      })(self, $scope.get('Symbol'));

      (function($base, $super) {
        function $Annotation(){};
        var self = $Annotation = $klass($base, $super, 'Annotation', $Annotation);

        var def = self.$$proto, $scope = self.$$scope, TMP_25;

        self.$attr_reader("center", "text", "style", "origin");

        return (def.$initialize = TMP_25 = function(center, text, style, origin) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_25.$$p, $yield = $iter || nil;

          if (style == null) {
            style = "regular"
          }
          if (origin == null) {
            origin = nil
          }
          TMP_25.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_25, $iter).apply(self, $zuper);
          self.center = center;
          self.text = text;
          self.style = style;
          return self.origin = origin;
        }, nil) && 'initialize';
      })(self, $scope.get('Drawable'));

      (function($base, $super) {
        function $Glyph(){};
        var self = $Glyph = $klass($base, $super, 'Glyph', $Glyph);

        var def = self.$$proto, $scope = self.$$scope, TMP_26;

        def.size = def.fill = nil;
        self.$attr_reader("center", "size", "glyph", "dotted", "origin");

        Opal.cdecl($scope, 'GLYPHS', $hash2(["rest_1", "rest_4", "rest_8", "rest_16", "rest_32", "rest_64", "rest_128"], {"rest_1": $hash2(["d", "w", "h"], {"d": [["M", $rb_minus($rb_minus(0.06, 0.06), $rb_divide(11.25, 2)), $rb_minus(0.03, $rb_times(1.7, 4.68))], ["l", 0.09, -0.06], ["l", 5.46, 0], ["l", 5.49, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 2.19], ["l", 0, 2.19], ["l", -0.06, 0.09], ["l", -0.09, 0.06], ["l", -5.49, 0], ["l", -5.46, 0], ["l", -0.09, -0.06], ["l", -0.06, -0.09], ["l", 0, -2.19], ["l", 0, -2.19], ["z"]], "w": 11.25, "h": $rb_times(2.2, 4.68)}), "rest_4": $hash2(["d", "w", "h"], {"d": [["M", 1.89, -11.82], ["c", 0.12, -0.06, 0.24, -0.06, 0.36, -0.03], ["c", 0.09, 0.06, 4.74, 5.58, 4.86, 5.82], ["c", 0.21, 0.39, 0.15, 0.78, -0.15, 1.26], ["c", -0.24, 0.33, -0.72, 0.81, -1.62, 1.56], ["c", -0.45, 0.36, -0.87, 0.75, -0.96, 0.84], ["c", -0.93, 0.99, -1.14, 2.49, -0.6, 3.63], ["c", 0.18, 0.39, 0.27, 0.48, 1.32, 1.68], ["c", 1.92, 2.25, 1.83, 2.16, 1.83, 2.34], ["c", 0, 0.18, -0.18, 0.36, -0.36, 0.39], ["c", -0.15, 0, -0.27, -0.06, -0.48, -0.27], ["c", -0.75, -0.75, -2.46, -1.29, -3.39, -1.08], ["c", -0.45, 0.09, -0.69, 0.27, -0.9, 0.69], ["c", -0.12, 0.3, -0.21, 0.66, -0.24, 1.14], ["c", -0.03, 0.66, 0.09, 1.35, 0.3, 2.01], ["c", 0.15, 0.42, 0.24, 0.66, 0.45, 0.96], ["c", 0.18, 0.24, 0.18, 0.33, 0.03, 0.42], ["c", -0.12, 0.06, -0.18, 0.03, -0.45, -0.3], ["c", -1.08, -1.38, -2.07, -3.36, -2.4, -4.83], ["c", -0.27, -1.05, -0.15, -1.77, 0.27, -2.07], ["c", 0.21, -0.12, 0.42, -0.15, 0.87, -0.15], ["c", 0.87, 0.06, 2.1, 0.39, 3.3, 0.9], ["l", 0.39, 0.18], ["l", -1.65, -1.95], ["c", -2.52, -2.97, -2.61, -3.09, -2.7, -3.27], ["c", -0.09, -0.24, -0.12, -0.48, -0.03, -0.75], ["c", 0.15, -0.48, 0.57, -0.96, 1.83, -2.01], ["c", 0.45, -0.36, 0.84, -0.72, 0.93, -0.78], ["c", 0.69, -0.75, 1.02, -1.8, 0.9, -2.79], ["c", -0.06, -0.33, -0.21, -0.84, -0.39, -1.11], ["c", -0.09, -0.15, -0.45, -0.6, -0.81, -1.05], ["c", -0.36, -0.42, -0.69, -0.81, -0.72, -0.87], ["c", -0.09, -0.18, 0, -0.42, 0.21, -0.51], ["z"]], "w": 7.888, "h": 21.435}), "rest_8": $hash2(["d", "w", "h"], {"d": [["M", 1.68, -6.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.39, -0.18, 1.32, -1.29, 1.68, -1.98], ["c", 0.09, -0.21, 0.24, -0.3, 0.39, -0.3], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.27, 1.11, -1.86, 6.42], ["c", -1.02, 3.48, -1.89, 6.39, -1.92, 6.42], ["c", 0, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.15, -0.57, 1.68, -4.92], ["c", 0.96, -2.67, 1.74, -4.89, 1.71, -4.89], ["l", -0.51, 0.15], ["c", -1.08, 0.36, -1.74, 0.48, -2.55, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 7.534, "h": 13.883}), "rest_16": $hash2(["d", "w", "h"], {"d": [["M", 3.33, -6.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.87, 0.42], ["c", 0.39, -0.18, 1.2, -1.23, 1.62, -2.07], ["c", 0.06, -0.15, 0.24, -0.24, 0.36, -0.24], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.45, 1.86, -2.67, 10.17], ["c", -1.5, 5.55, -2.73, 10.14, -2.76, 10.17], ["c", -0.03, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.12, -0.57, 1.44, -4.92], ["c", 0.81, -2.67, 1.47, -4.86, 1.47, -4.89], ["c", -0.03, 0, -0.27, 0.06, -0.54, 0.15], ["c", -1.08, 0.36, -1.77, 0.48, -2.58, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.33, -0.15, 1.02, -0.93, 1.41, -1.59], ["c", 0.12, -0.21, 0.18, -0.39, 0.39, -1.08], ["c", 0.66, -2.1, 1.17, -3.84, 1.17, -3.87], ["c", 0, 0, -0.21, 0.06, -0.42, 0.15], ["c", -0.51, 0.15, -1.2, 0.33, -1.68, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 9.724, "h": 21.383}), "rest_32": $hash2(["d", "w", "h"], {"d": [["M", 4.23, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.27, -0.06], ["c", 0.33, -0.21, 0.99, -1.11, 1.44, -1.98], ["c", 0.09, -0.24, 0.21, -0.33, 0.39, -0.33], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.57, 2.67, -3.21, 13.89], ["c", -1.8, 7.62, -3.3, 13.89, -3.3, 13.92], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.09, -0.57, 1.23, -4.92], ["c", 0.69, -2.67, 1.26, -4.86, 1.29, -4.89], ["c", 0, -0.03, -0.12, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.12, 0.09, 0.3, 0.18, 0.48, 0.21], ["c", 0.12, 0, 0.18, 0, 0.3, -0.09], ["c", 0.42, -0.21, 1.29, -1.29, 1.56, -1.89], ["c", 0.03, -0.12, 1.23, -4.59, 1.23, -4.65], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -0.63, 0.18, -1.2, 0.36, -1.74, 0.45], ["c", -0.39, 0.06, -0.54, 0.06, -1.02, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.18, 0.18, 0.51, 0.27, 0.72, 0.15], ["c", 0.3, -0.12, 0.69, -0.57, 1.08, -1.17], ["c", 0.42, -0.6, 0.39, -0.51, 1.05, -3.03], ["c", 0.33, -1.26, 0.6, -2.31, 0.6, -2.34], ["c", 0, 0, -0.21, 0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.14, 0.33, -1.62, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 11.373, "h": 28.883}), "rest_64": $hash2(["d", "w", "h"], {"d": [["M", 5.13, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.24, -0.12, 0.63, -0.66, 1.08, -1.56], ["c", 0.33, -0.66, 0.39, -0.72, 0.6, -0.72], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.69, 3.66, -3.54, 17.64], ["c", -1.95, 9.66, -3.57, 17.61, -3.57, 17.64], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.06, -0.57, 1.05, -4.95], ["c", 0.6, -2.7, 1.08, -4.89, 1.08, -4.92], ["c", 0, 0, -0.24, 0.06, -0.51, 0.15], ["c", -0.66, 0.24, -1.2, 0.36, -1.77, 0.48], ["c", -0.42, 0.06, -0.57, 0.06, -1.05, 0.06], ["c", -0.69, 0, -0.87, -0.03, -1.35, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.21, 0.03, 0.39, -0.09, 0.72, -0.42], ["c", 0.45, -0.45, 1.02, -1.26, 1.17, -1.65], ["c", 0.03, -0.09, 0.27, -1.14, 0.54, -2.34], ["c", 0.27, -1.2, 0.48, -2.19, 0.51, -2.22], ["c", 0, -0.03, -0.09, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.9, 0.42], ["c", 0.36, -0.18, 1.2, -1.26, 1.47, -1.89], ["c", 0.03, -0.09, 0.3, -1.2, 0.57, -2.43], ["l", 0.51, -2.28], ["l", -0.54, 0.18], ["c", -1.11, 0.36, -1.8, 0.48, -2.61, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.21, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.36, -0.18, 0.93, -0.93, 1.29, -1.68], ["c", 0.12, -0.24, 0.18, -0.48, 0.63, -2.55], ["l", 0.51, -2.31], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -1.14, 0.36, -2.1, 0.54, -2.82, 0.51], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 12.453, "h": 36.383}), "rest_128": $hash2(["d", "w", "h"], {"d": [["M", 6.03, -21.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.21, 0, 0.33, -0.06, 0.54, -0.36], ["c", 0.15, -0.21, 0.54, -0.93, 0.78, -1.47], ["c", 0.15, -0.33, 0.18, -0.39, 0.3, -0.48], ["c", 0.18, -0.09, 0.45, 0, 0.51, 0.15], ["c", 0.03, 0.09, -7.11, 42.75, -7.17, 42.84], ["c", -0.03, 0.03, -0.15, 0.09, -0.24, 0.15], ["c", -0.18, 0.06, -0.24, 0.06, -0.45, 0.06], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.03, -0.57, 0.84, -4.98], ["c", 0.51, -2.7, 0.93, -4.92, 0.9, -4.92], ["c", 0, 0, -0.15, 0.06, -0.36, 0.12], ["c", -0.78, 0.27, -1.62, 0.48, -2.31, 0.57], ["c", -0.15, 0.03, -0.54, 0.03, -0.81, 0.03], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.63, 0.48], ["c", 0.12, 0, 0.18, 0, 0.3, -0.09], ["c", 0.42, -0.21, 1.14, -1.11, 1.5, -1.83], ["c", 0.12, -0.27, 0.12, -0.27, 0.54, -2.52], ["c", 0.24, -1.23, 0.42, -2.25, 0.39, -2.25], ["c", 0, 0, -0.24, 0.06, -0.51, 0.18], ["c", -1.26, 0.39, -2.25, 0.57, -3.06, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.51, 0.3, 0.75, 0.18], ["c", 0.36, -0.15, 1.05, -0.99, 1.41, -1.77], ["l", 0.15, -0.3], ["l", 0.42, -2.25], ["c", 0.21, -1.26, 0.42, -2.28, 0.39, -2.28], ["l", -0.51, 0.15], ["c", -1.11, 0.39, -1.89, 0.51, -2.7, 0.51], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.18, 0.48, 0.27, 0.72, 0.21], ["c", 0.33, -0.12, 1.14, -1.26, 1.41, -1.95], ["c", 0, -0.09, 0.21, -1.11, 0.45, -2.34], ["c", 0.21, -1.2, 0.39, -2.22, 0.39, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.2, 0.33, -1.71, 0.42], ["c", -0.3, 0.06, -0.51, 0.06, -0.93, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.18, 0, 0.36, -0.09, 0.57, -0.33], ["c", 0.33, -0.36, 0.78, -1.14, 0.93, -1.56], ["c", 0.03, -0.12, 0.24, -1.2, 0.45, -2.4], ["c", 0.24, -1.2, 0.42, -2.22, 0.42, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.39, 0.09], ["c", -1.05, 0.36, -1.8, 0.48, -2.58, 0.48], ["c", -0.63, 0, -0.84, -0.03, -1.29, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], "w": 12.992, "h": 43.883})}));

        def.$initialize = TMP_26 = function(center, size, glyph_name, dotted, origin) {var $zuper = $slice.call(arguments, 0);
          var self = this, $iter = TMP_26.$$p, $yield = $iter || nil;

          if (dotted == null) {
            dotted = $scope.get('FALSE')
          }
          if (origin == null) {
            origin = nil
          }
          TMP_26.$$p = null;
          Opal.find_super_dispatcher(self, 'initialize', TMP_26, $iter).apply(self, $zuper);
          self.center = center;
          self.glyph_name = glyph_name;
          self.glyph = $scope.get('GLYPHS')['$[]'](glyph_name);
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
      })(self, $scope.get('Symbol'));
    })(self);

    (function($base) {
      var self = $module($base, 'Layout');

      var def = self.$$proto, $scope = self.$$scope;

      self.$include((($scope.get('Harpnotes')).$$scope.get('Music')));

      self.$include((($scope.get('Harpnotes')).$$scope.get('Drawing')));

      (function($base, $super) {
        function $Default(){};
        var self = $Default = $klass($base, $super, 'Default', $Default);

        var def = self.$$proto, $scope = self.$$scope;

        def.y_offset = def.beat_spacing = def.slur_index = nil;
        Opal.cdecl($scope, 'MM_PER_POINT', 0.3);

        def.$initialize = function() {
          var self = this;
          if ($gvars.conf == null) $gvars.conf = nil;

          self.beat_spacing = $rb_divide($rb_times($gvars.conf.$get("layout.Y_SCALE"), 1.0), $gvars.conf.$get("layout.BEAT_RESOLUTION"));
          self.slur_index = $hash2([], {});
          return self.y_offset = 5;
        };

        def.$layout = function(music, beat_layout, print_variant_nr) {
          var $a, $b, $c, TMP_27, TMP_28, $d, TMP_29, $e, TMP_30, $f, TMP_32, $g, TMP_33, $h, $i, TMP_34, TMP_35, $j, TMP_37, $k, TMP_38, $l, TMP_40, self = this, print_options = nil, song_print_options = nil, layout_options = nil, beat_compression_map = nil, maximal_beat = nil, full_beat_spacing = nil, factor = nil, compressed_beat_layout_proc = nil, required_synchlines = nil, synched_notes = nil, voice_elements = nil, note_to_ellipse = nil, synch_lines = nil, sheet_marks = nil, annotations = nil, title = nil, meter = nil, key = nil, composer = nil, tempo = nil, print_variant_title = nil, title_pos = nil, legend_pos = nil, legend = nil, datestring = nil, lyrics = nil, lyric_text = nil, text = nil, verses = nil, pos = nil, sheet_elements = nil;
          if ($gvars.conf == null) $gvars.conf = nil;
          if ($gvars.log == null) $gvars.log = nil;

          if (beat_layout == null) {
            beat_layout = nil
          }
          if (print_variant_nr == null) {
            print_variant_nr = 0
          }
          print_options = $scope.get('Confstack').$new();
          print_options.$push($gvars.conf.$get("extract.0"));
          if ($gvars.conf.$get("location")['$==']("song")) {
            song_print_options = $gvars.conf.$get("extract." + (print_variant_nr))
            } else {
            song_print_options = music.$harpnote_options()['$[]']("print")['$[]'](print_variant_nr);
            song_print_options['$[]=']("legend", music.$harpnote_options()['$[]']("legend"));
            song_print_options['$[]=']("lyrics", music.$harpnote_options()['$[]']("lyrics"));
            song_print_options['$[]=']("notes", music.$harpnote_options()['$[]']("notes"));
          };
          if (song_print_options !== false && song_print_options !== nil) {
            print_options.$push(song_print_options)
            } else {
            $gvars.log.$warning("selected print variant [" + (print_variant_nr) + "] not available using [0]: '" + (print_options.$get("title")) + "'")
          };
          print_options = print_options.$get();
          layout_options = ((($a = print_options['$[]']("layout")) !== false && $a !== nil) ? $a : $hash2([], {}));
          $gvars.conf.$push($hash2(["layout"], {"layout": layout_options}));
          self.$initialize();
          self.y_offset = print_options['$[]']("startpos");
          beat_compression_map = self.$compute_beat_compression(music, print_options['$[]']("layoutlines"));
          maximal_beat = beat_compression_map.$values().$max();
          full_beat_spacing = $rb_divide(($rb_minus($gvars.conf.$get("layout.DRAWING_AREA_SIZE").$last(), self.y_offset)), maximal_beat);
          if ($rb_lt(full_beat_spacing, self.beat_spacing)) {
            factor = ($rb_divide(self.beat_spacing, full_beat_spacing));
            $gvars.log.$warning("note distance too small (factor " + (factor) + ")");};
          self.beat_spacing = [full_beat_spacing, $rb_times(2, self.beat_spacing)].$min();
          beat_layout = ((($a = beat_layout) !== false && $a !== nil) ? $a : ($b = ($c = $scope.get('Proc')).$new, $b.$$p = (TMP_27 = function(beat){var self = TMP_27.$$s || this;
            if (self.beat_spacing == null) self.beat_spacing = nil;
            if (self.y_offset == null) self.y_offset = nil;
if (beat == null) beat = nil;
          return $rb_plus($rb_times(beat, self.beat_spacing), self.y_offset)}, TMP_27.$$s = self, TMP_27), $b).call($c));
          compressed_beat_layout_proc = ($a = ($b = $scope.get('Proc')).$new, $a.$$p = (TMP_28 = function(beat){var self = TMP_28.$$s || this;
if (beat == null) beat = nil;
          return beat_layout.$call(beat_compression_map['$[]'](beat))}, TMP_28.$$s = self, TMP_28), $a).call($b);
          required_synchlines = ($a = ($d = print_options['$[]']("synchlines")).$select, $a.$$p = (TMP_29 = function(sl){var self = TMP_29.$$s || this, $a;
if (sl == null) sl = nil;
          return ($a = print_options['$[]']("voices")['$include?'](sl.$first()), $a !== false && $a !== nil ?print_options['$[]']("voices")['$include?'](sl.$last()) : $a)}, TMP_29.$$s = self, TMP_29), $a).call($d);
          synched_notes = ($a = ($e = required_synchlines).$map, $a.$$p = (TMP_30 = function(selector){var self = TMP_30.$$s || this, $a, $b, TMP_31, synch_points_to_show = nil;
if (selector == null) selector = nil;
          synch_points_to_show = music.$build_synch_points(selector);
            return ($a = ($b = synch_points_to_show).$map, $a.$$p = (TMP_31 = function(sp){var self = TMP_31.$$s || this;
if (sp == null) sp = nil;
            return [sp.$notes().$first(), sp.$notes().$last()]}, TMP_31.$$s = self, TMP_31), $a).call($b);}, TMP_30.$$s = self, TMP_30), $a).call($e).$flatten();
          voice_elements = ($a = ($f = music.$voices().$each_with_index()).$map, $a.$$p = (TMP_32 = function(v, index){var self = TMP_32.$$s || this, $a;
if (v == null) v = nil;if (index == null) index = nil;
          if ((($a = print_options['$[]']("voices")['$include?'](index)) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$layout_voice(v, compressed_beat_layout_proc, $hash2(["flowline", "subflowline", "jumpline", "annotations", "synched_notes"], {"flowline": print_options['$[]']("flowlines")['$include?'](index), "subflowline": print_options['$[]']("subflowlines")['$include?'](index), "jumpline": print_options['$[]']("jumplines")['$include?'](index), "annotations": music.$harpnote_options()['$[]']("annotations"), "synched_notes": synched_notes}))
              } else {
              return nil
            }}, TMP_32.$$s = self, TMP_32), $a).call($f).$flatten().$compact();
          note_to_ellipse = $scope.get('Hash')['$[]'](($a = ($g = ($h = ($i = voice_elements).$select, $h.$$p = (TMP_34 = function(e){var self = TMP_34.$$s || this;
if (e == null) e = nil;
          return e['$is_a?']($scope.get('Symbol'))}, TMP_34.$$s = self, TMP_34), $h).call($i)).$map, $a.$$p = (TMP_33 = function(e){var self = TMP_33.$$s || this;
if (e == null) e = nil;
          return [e.$origin(), e]}, TMP_33.$$s = self, TMP_33), $a).call($g));
          synch_lines = ($a = ($h = required_synchlines).$map, $a.$$p = (TMP_35 = function(selector){var self = TMP_35.$$s || this, $a, $b, TMP_36, synch_points_to_show = nil;
if (selector == null) selector = nil;
          synch_points_to_show = music.$build_synch_points(selector);
            return ($a = ($b = synch_points_to_show).$map, $a.$$p = (TMP_36 = function(sp){var self = TMP_36.$$s || this;
if (sp == null) sp = nil;
            return $scope.get('FlowLine').$new(note_to_ellipse['$[]'](sp.$notes().$first()), note_to_ellipse['$[]'](sp.$notes().$last()), "dashed", sp)}, TMP_36.$$s = self, TMP_36), $a).call($b);}, TMP_35.$$s = self, TMP_35), $a).call($h).$flatten();
          sheet_marks = ($a = ($j = [79, 55, 43]).$inject, $a.$$p = (TMP_37 = function(result, pitch){var self = TMP_37.$$s || this, markpath = nil;
            if ($gvars.conf == null) $gvars.conf = nil;
if (result == null) result = nil;if (pitch == null) pitch = nil;
          markpath = self.$make_sheetmark_path([$rb_plus($rb_times(($rb_plus($gvars.conf.$get("layout.PITCH_OFFSET"), pitch)), $gvars.conf.$get("layout.X_SPACING")), $gvars.conf.$get("layout.X_OFFSET")), 10]);
            result['$<<']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Path')).$new(markpath, "filled"));
            return result;}, TMP_37.$$s = self, TMP_37), $a).call($j, []);
          annotations = [];
          title = ((($a = music.$meta_data()['$[]']("title")) !== false && $a !== nil) ? $a : "untitled");
          meter = music.$meta_data()['$[]']("meter");
          key = music.$meta_data()['$[]']("key");
          composer = music.$meta_data()['$[]']("composer");
          tempo = music.$meta_data()['$[]']("tempo_display");
          print_variant_title = print_options['$[]']("title");
          title_pos = print_options['$[]']("legend")['$[]']("pos");
          legend_pos = [title_pos.$first(), $rb_plus(title_pos.$last(), 7)];
          legend = "" + (print_variant_title) + "\n" + (composer) + "\nTakt: " + (meter) + " (" + (tempo) + ")\nTonart: " + (key);
          annotations['$<<']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')).$new(title_pos, title, "large"));
          annotations['$<<']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')).$new(legend_pos, legend, "regular"));
          datestring = $scope.get('Time').$now().$strftime("%Y-%m-%d %H:%M:%S %Z");
          annotations['$<<']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')).$new([150, 288], "rendered " + (datestring) + " by Zupfnoter " + ($scope.get('VERSION')) + " " + ($scope.get('COPYRIGHT')) + " (Host " + (window.location) + ")", "smaller"));
          lyrics = print_options['$[]']("lyrics");
          lyric_text = music.$harpnote_options()['$[]']("lyrics")['$[]']("text");
          if (lyric_text !== false && lyric_text !== nil) {
            text = lyric_text.$join("\n");
            if ((($a = lyrics['$[]']("versepos")) !== nil && (!$a.$$is_boolean || $a == true))) {
              verses = text.$split("\n\n");
              ($a = ($k = lyrics['$[]']("versepos")).$each, $a.$$p = (TMP_38 = function(key, value){var self = TMP_38.$$s || this, $a, $b, TMP_39, the_text = nil;
if (key == null) key = nil;if (value == null) value = nil;
              the_text = ($a = ($b = key.$scan(/\d+/)).$map, $a.$$p = (TMP_39 = function(i){var self = TMP_39.$$s || this;
if (i == null) i = nil;
                return verses['$[]']($rb_minus(i.$to_i(), 1))}, TMP_39.$$s = self, TMP_39), $a).call($b).$join("\n\n");
                return annotations['$<<']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')).$new(value, the_text));}, TMP_38.$$s = self, TMP_38), $a).call($k);
              } else {
              pos = lyrics['$[]']("pos");
              annotations['$<<']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')).$new(pos, text));
            };};
          ($a = ($l = print_options['$[]']("notes")).$each, $a.$$p = (TMP_40 = function(note){var self = TMP_40.$$s || this;
if (note == null) note = nil;
          return annotations['$<<']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')).$new(note['$[]']("pos"), note['$[]']("text"), note['$[]']("style")))}, TMP_40.$$s = self, TMP_40), $a).call($l);
          sheet_elements = $rb_plus($rb_plus($rb_plus(synch_lines, voice_elements), sheet_marks), annotations);
          $gvars.conf.$pop();
          return (((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Sheet')).$new(sheet_elements);
        };

        def.$layout_voice = function(voice, beat_layout, show_options) {
          var $a, $b, TMP_41, $c, TMP_42, $d, TMP_43, $e, $f, TMP_44, TMP_45, $g, $h, TMP_46, TMP_47, $i, TMP_48, $j, $k, TMP_49, TMP_50, $l, $m, TMP_51, TMP_52, $n, TMP_54, $o, TMP_61, $p, $q, TMP_63, TMP_64, $r, $s, TMP_65, self = this, playables = nil, res_playables = nil, res_measures = nil, res_newparts = nil, lookuptable_drawing_by_playable = nil, previous_note = nil, res_flow = nil, res_sub_flow = nil, tuplet_start = nil, res_tuplets = nil, tie_start = nil, res_slurs = nil, res_gotos = nil, res_annotations = nil, retval = nil;

          playables = ($a = ($b = voice).$select, $a.$$p = (TMP_41 = function(c){var self = TMP_41.$$s || this;
if (c == null) c = nil;
          return c['$is_a?']($scope.get('Playable'))}, TMP_41.$$s = self, TMP_41), $a).call($b);
          res_playables = ($a = ($c = playables).$map, $a.$$p = (TMP_42 = function(playable){var self = TMP_42.$$s || this;
if (playable == null) playable = nil;
          return self.$layout_playable(playable, beat_layout)}, TMP_42.$$s = self, TMP_42), $a).call($c).$flatten();
          res_measures = ($a = ($d = ($e = ($f = voice).$select, $e.$$p = (TMP_44 = function(c){var self = TMP_44.$$s || this;
if (c == null) c = nil;
          return c['$is_a?']($scope.get('MeasureStart'))}, TMP_44.$$s = self, TMP_44), $e).call($f)).$map, $a.$$p = (TMP_43 = function(measure){var self = TMP_43.$$s || this;
if (measure == null) measure = nil;
          return self.$layout_playable(measure, beat_layout)}, TMP_43.$$s = self, TMP_43), $a).call($d);
          res_newparts = ($a = ($e = ($g = ($h = voice).$select, $g.$$p = (TMP_46 = function(c){var self = TMP_46.$$s || this;
if (c == null) c = nil;
          return c['$is_a?']($scope.get('NewPart'))}, TMP_46.$$s = self, TMP_46), $g).call($h)).$map, $a.$$p = (TMP_45 = function(newpart){var self = TMP_45.$$s || this;
if (newpart == null) newpart = nil;
          return self.$layout_newpart(newpart, beat_layout)}, TMP_45.$$s = self, TMP_45), $a).call($e);
          lookuptable_drawing_by_playable = $scope.get('Hash')['$[]'](($a = ($g = res_playables).$map, $a.$$p = (TMP_47 = function(e){var self = TMP_47.$$s || this;
if (e == null) e = nil;
          return [e.$origin(), e]}, TMP_47.$$s = self, TMP_47), $a).call($g).$reverse());
          previous_note = nil;
          res_flow = ($a = ($i = ($j = ($k = voice).$select, $j.$$p = (TMP_49 = function(c){var self = TMP_49.$$s || this;
if (c == null) c = nil;
          return c['$is_a?']($scope.get('Playable'))}, TMP_49.$$s = self, TMP_49), $j).call($k)).$map, $a.$$p = (TMP_48 = function(playable){var self = TMP_48.$$s || this, $a, $b, res = nil;
            if ($gvars.conf == null) $gvars.conf = nil;
if (playable == null) playable = nil;
          res = nil;
            if ((($a = previous_note['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              } else {
              res = $scope.get('FlowLine').$new(lookuptable_drawing_by_playable['$[]'](previous_note), lookuptable_drawing_by_playable['$[]'](playable));
              (($a = [$gvars.conf.$get("layout.LINE_MEDIUM")]), $b = res, $b['$line_width='].apply($b, $a), $a[$a.length-1]);
            };
            if ((($a = playable['$first_in_part?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              res = nil};
            previous_note = playable;
            return res;}, TMP_48.$$s = self, TMP_48), $a).call($i).$compact();
          previous_note = nil;
          res_sub_flow = ($a = ($j = ($l = ($m = voice).$select, $l.$$p = (TMP_51 = function(c){var self = TMP_51.$$s || this, $a;
if (c == null) c = nil;
          return ((($a = c['$is_a?']($scope.get('Playable'))) !== false && $a !== nil) ? $a : c['$is_a?']($scope.get('SynchPoint')))}, TMP_51.$$s = self, TMP_51), $l).call($m)).$map, $a.$$p = (TMP_50 = function(playable){var self = TMP_50.$$s || this, $a, res = nil;
if (playable == null) playable = nil;
          if ((($a = show_options['$[]']("synched_notes")['$include?'](playable.$proxy_note())) !== nil && (!$a.$$is_boolean || $a == true))) {
              } else {
              res = nil;
              if ((($a = previous_note['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
                } else {
                res = $scope.get('FlowLine').$new(lookuptable_drawing_by_playable['$[]'](previous_note), lookuptable_drawing_by_playable['$[]'](playable), "dotted")
              };
              if ((($a = playable['$first_in_part?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
                res = nil};
            };
            previous_note = playable;
            return res;}, TMP_50.$$s = self, TMP_50), $a).call($j).$compact();
          if ((($a = show_options['$[]']("subflowline")) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            res_sub_flow = []
          };
          if ((($a = show_options['$[]']("flowline")) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            res_flow = []
          };
          tuplet_start = playables.$first();
          res_tuplets = ($a = ($l = playables).$inject, $a.$$p = (TMP_52 = function(result, playable){var self = TMP_52.$$s || this, $a, $b, TMP_53, p1 = nil, p2 = nil, tiepath = nil, anchor = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (result == null) result = nil;if (playable == null) playable = nil;
          if ((($a = playable['$tuplet_start?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              tuplet_start = playable};
            if ((($a = playable['$tuplet_end?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              p1 = self.$Vector2d(lookuptable_drawing_by_playable['$[]'](tuplet_start).$center());
              p2 = self.$Vector2d(lookuptable_drawing_by_playable['$[]'](playable).$center());
              $a = Opal.to_ary(self.$make_annotated_bezier_path([p1, p2])), tiepath = ($a[0] == null ? nil : $a[0]), anchor = ($a[1] == null ? nil : $a[1]);
              $gvars.log.$debug("" + ([tiepath, anchor]) + " (" + ("harpnotes") + " " + (1208) + ")");
              result.$push(($a = ($b = (((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Path')).$new(tiepath)).$tap, $a.$$p = (TMP_53 = function(d){var self = TMP_53.$$s || this, $a, $b;
                if ($gvars.conf == null) $gvars.conf = nil;
if (d == null) d = nil;
              return (($a = [$gvars.conf.$get("layout.LINE_MEDIUM")]), $b = d, $b['$line_width='].apply($b, $a), $a[$a.length-1])}, TMP_53.$$s = self, TMP_53), $a).call($b));
              result.$push((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')).$new(anchor.$to_a(), playable.$tuplet().$to_s(), "small"));};
            return result;}, TMP_52.$$s = self, TMP_52), $a).call($l, []);
          self.slur_index['$[]=']("first_playable", playables.$first());
          tie_start = playables.$first();
          res_slurs = ($a = ($n = playables).$inject, $a.$$p = (TMP_54 = function(result, playable){var self = TMP_54.$$s || this, $a, $b, TMP_55, $c, TMP_56, $d, TMP_58, $e, TMP_59, p1 = nil, p2 = nil, tiepath = nil;
            if (self.slur_index == null) self.slur_index = nil;
if (result == null) result = nil;if (playable == null) playable = nil;
          if ((($a = playable['$tie_end?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              p1 = $rb_plus(self.$Vector2d(lookuptable_drawing_by_playable['$[]'](tie_start).$center()), [3, 0]);
              p2 = $rb_plus(self.$Vector2d(lookuptable_drawing_by_playable['$[]'](playable).$center()), [3, 0]);
              tiepath = self.$make_slur_path(p1, p2);
              result.$push(($a = ($b = (((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Path')).$new(tiepath)).$tap, $a.$$p = (TMP_55 = function(d){var self = TMP_55.$$s || this, $a, $b;
                if ($gvars.conf == null) $gvars.conf = nil;
if (d == null) d = nil;
              return (($a = [$gvars.conf.$get("layout.LINE_MEDIUM")]), $b = d, $b['$line_width='].apply($b, $a), $a[$a.length-1])}, TMP_55.$$s = self, TMP_55), $a).call($b));
              if ((($a = playable['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('SynchPoint')))) !== nil && (!$a.$$is_boolean || $a == true))) {
                ($a = ($c = playable.$notes()).$each_with_index, $a.$$p = (TMP_56 = function(n, index){var self = TMP_56.$$s || this, $a, $b, TMP_57, e = nil;
                  if ($gvars.log == null) $gvars.log = nil;
if (n == null) n = nil;if (index == null) index = nil;
                try {
                  p1 = tie_start.$notes()['$[]'](index);
                    p1 = $rb_plus(self.$Vector2d(lookuptable_drawing_by_playable['$[]'](p1).$center()), [3, 0]);
                    p2 = $rb_plus(self.$Vector2d(lookuptable_drawing_by_playable['$[]'](n).$center()), [3, 0]);
                    tiepath = self.$make_slur_path(p1, p2);
                    return result.$push(($a = ($b = (((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Path')).$new(tiepath)).$tap, $a.$$p = (TMP_57 = function(d){var self = TMP_57.$$s || this, $a, $b;
                      if ($gvars.conf == null) $gvars.conf = nil;
if (d == null) d = nil;
                    return (($a = [$gvars.conf.$get("layout.LINE_MEDIUM")]), $b = d, $b['$line_width='].apply($b, $a), $a[$a.length-1])}, TMP_57.$$s = self, TMP_57), $a).call($b));
                  } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
                    return $gvars.log.$error("tied chords which doesn't have same number of notes", n.$start_pos())
                    }else { throw $err; }
                  }}, TMP_56.$$s = self, TMP_56), $a).call($c)};};
            if ((($a = playable['$tie_start?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              tie_start = playable};
            ($a = ($d = playable.$slur_starts()).$each, $a.$$p = (TMP_58 = function(s){var self = TMP_58.$$s || this;
              if (self.slur_index == null) self.slur_index = nil;
if (s == null) s = nil;
            return self.slur_index['$[]='](s, playable)}, TMP_58.$$s = self, TMP_58), $a).call($d);
            self.slur_index['$[]='](playable.$slur_starts().$first(), playable);
            ($a = ($e = playable.$slur_ends()).$each, $a.$$p = (TMP_59 = function(id){var self = TMP_59.$$s || this, $a, $b, TMP_60, begin_slur = nil, slurpath = nil;
              if (self.slur_index == null) self.slur_index = nil;
if (id == null) id = nil;
            begin_slur = ((($a = self.slur_index['$[]'](id)) !== false && $a !== nil) ? $a : self.slur_index['$[]']("first_playable"));
              p1 = $rb_plus(self.$Vector2d(lookuptable_drawing_by_playable['$[]'](begin_slur).$center()), [3, 0]);
              p2 = $rb_plus(self.$Vector2d(lookuptable_drawing_by_playable['$[]'](playable).$center()), [3, 0]);
              slurpath = self.$make_slur_path(p1, p2);
              return result.$push(($a = ($b = (((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Path')).$new(slurpath)).$tap, $a.$$p = (TMP_60 = function(d){var self = TMP_60.$$s || this, $a, $b;
                if ($gvars.conf == null) $gvars.conf = nil;
if (d == null) d = nil;
              return (($a = [$gvars.conf.$get("layout.LINE_MEDIUM")]), $b = d, $b['$line_width='].apply($b, $a), $a[$a.length-1])}, TMP_60.$$s = self, TMP_60), $a).call($b));}, TMP_59.$$s = self, TMP_59), $a).call($e);
            return result;}, TMP_54.$$s = self, TMP_54), $a).call($n, []);
          res_gotos = ($a = ($o = ($p = ($q = voice).$select, $p.$$p = (TMP_63 = function(c){var self = TMP_63.$$s || this;
if (c == null) c = nil;
          return c['$is_a?']($scope.get('Goto'))}, TMP_63.$$s = self, TMP_63), $p).call($q)).$map, $a.$$p = (TMP_61 = function(goto$){var self = TMP_61.$$s || this, $a, $b, TMP_62, distance = nil, vertical = nil, path = nil;
            if ($gvars.log == null) $gvars.log = nil;
            if ($gvars.conf == null) $gvars.conf = nil;
if (goto$ == null) goto$ = nil;
          distance = goto$.$policy()['$[]']("distance");
            $gvars.log.$debug("vertical line x offset: " + (distance) + " " + ("harpnotes") + ":" + (1264));
            if ($rb_gt(distance, 0)) {
              distance = $rb_minus(distance, 1)};
            if (distance !== false && distance !== nil) {
              vertical = $rb_times(($rb_plus(distance, 0.5)), $gvars.conf.$get("layout.X_SPACING"))
              } else {
              vertical = $rb_times(0.5, $gvars.conf.$get("layout.X_SPACING"))
            };
            path = self.$make_path_from_jumpline(self.$Vector2d(lookuptable_drawing_by_playable['$[]'](goto$.$from()).$center()), self.$Vector2d(lookuptable_drawing_by_playable['$[]'](goto$.$to()).$center()), self.$Vector2d(2.5, 2.5), vertical);
            return [($a = ($b = (((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Path')).$new(path['$[]'](0), nil, goto$.$from())).$tap, $a.$$p = (TMP_62 = function(s){var self = TMP_62.$$s || this, $a, $b;
              if ($gvars.conf == null) $gvars.conf = nil;
if (s == null) s = nil;
            return (($a = [$gvars.conf.$get("layout.LINE_THICK")]), $b = s, $b['$line_width='].apply($b, $a), $a[$a.length-1])}, TMP_62.$$s = self, TMP_62), $a).call($b), (((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Path')).$new(path['$[]'](1), "filled", goto$.$from())];}, TMP_61.$$s = self, TMP_61), $a).call($o).$flatten();
          if ((($a = show_options['$[]']("jumpline")) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            res_gotos = []
          };
          res_annotations = ($a = ($p = ($r = ($s = voice).$select, $r.$$p = (TMP_65 = function(c){var self = TMP_65.$$s || this;
if (c == null) c = nil;
          return c['$is_a?']($scope.get('NoteBoundAnnotation'))}, TMP_65.$$s = self, TMP_65), $r).call($s)).$map, $a.$$p = (TMP_64 = function(annotation){var self = TMP_64.$$s || this, position = nil;
if (annotation == null) annotation = nil;
          position = $rb_plus(self.$Vector2d(lookuptable_drawing_by_playable['$[]'](annotation.$companion()).$center()), annotation.$position());
            return (((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')).$new(position.$to_a(), annotation.$text());}, TMP_64.$$s = self, TMP_64), $a).call($p);
          return retval = ($rb_plus($rb_plus($rb_plus($rb_plus($rb_plus($rb_plus($rb_plus($rb_plus(res_flow, res_sub_flow), res_slurs), res_tuplets), res_playables), res_gotos), res_measures), res_newparts), res_annotations)).$compact();
        };

        self.$private();

        def.$compute_beat_compression = function(music, layout_lines) {
          var $a, $b, TMP_66, $c, TMP_67, $d, TMP_68, self = this, max_beat = nil, conf_beat_resolution = nil, current_beat = nil, last_size = nil, relevant_beat_maps = nil, result = nil;
          if ($gvars.conf == null) $gvars.conf = nil;

          max_beat = ($a = ($b = music.$beat_maps()).$map, $a.$$p = (TMP_66 = function(map){var self = TMP_66.$$s || this;
if (map == null) map = nil;
          return map.$keys().$max()}, TMP_66.$$s = self, TMP_66), $a).call($b).$max();
          conf_beat_resolution = $gvars.conf.$get("layout.BEAT_RESOLUTION");
          current_beat = 0;
          last_size = 0;
          relevant_beat_maps = ($a = ($c = layout_lines).$inject, $a.$$p = (TMP_67 = function(r, i){var self = TMP_67.$$s || this;
if (r == null) r = nil;if (i == null) i = nil;
          return r.$push(music.$beat_maps()['$[]'](i))}, TMP_67.$$s = self, TMP_67), $a).call($c, []).$compact();
          result = $scope.get('Hash')['$[]'](($a = ($d = ($range(0, max_beat, false))).$map, $a.$$p = (TMP_68 = function(beat){var self = TMP_68.$$s || this, $a, $b, TMP_69, $c, TMP_70, $d, TMP_71, notes_on_beat = nil, max_duration_on_beat = nil, has_no_notes_on_beat = nil, is_new_part = nil, size = nil, e = nil, increment = nil;
            if ($gvars.conf == null) $gvars.conf = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (beat == null) beat = nil;
          notes_on_beat = ($a = ($b = relevant_beat_maps).$map, $a.$$p = (TMP_69 = function(bm){var self = TMP_69.$$s || this;
if (bm == null) bm = nil;
            return bm['$[]'](beat)}, TMP_69.$$s = self, TMP_69), $a).call($b).$flatten().$compact();
            max_duration_on_beat = ($a = ($c = notes_on_beat).$map, $a.$$p = (TMP_70 = function(n){var self = TMP_70.$$s || this;
if (n == null) n = nil;
            return n.$duration()}, TMP_70.$$s = self, TMP_70), $a).call($c).$max();
            has_no_notes_on_beat = notes_on_beat['$empty?']();
            is_new_part = ($a = ($d = notes_on_beat).$select, $a.$$p = (TMP_71 = function(n){var self = TMP_71.$$s || this;
if (n == null) n = nil;
            return n['$first_in_part?']()}, TMP_71.$$s = self, TMP_71), $a).call($d);
            if (has_no_notes_on_beat !== false && has_no_notes_on_beat !== nil) {
              } else {
              try {
              size = $rb_times(conf_beat_resolution, $gvars.conf.$get("layout.DURATION_TO_STYLE")['$[]'](self.$duration_to_id(max_duration_on_beat)).$first())
              } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
                $gvars.log.$error("BUG: unsupported duration: " + (max_duration_on_beat) + " on beat " + (beat) + ",  " + (notes_on_beat.$to_json()))
                }else { throw $err; }
              };
              increment = $rb_divide(($rb_plus(size, last_size)), 2);
              last_size = size;
              if ((($a = is_new_part['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
                } else {
                increment = $rb_plus(increment, increment)
              };
              current_beat = $rb_plus(current_beat, increment);
            };
            return [beat, current_beat];}, TMP_68.$$s = self, TMP_68), $a).call($d));
          return result;
        };

        def.$layout_playable = function(root, beat_layout) {
          var $a, self = this;
          if ($gvars.log == null) $gvars.log = nil;

          if ((($a = root['$is_a?']($scope.get('Note'))) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self.$layout_note(root, beat_layout)
          } else if ((($a = root['$is_a?']($scope.get('MeasureStart'))) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self.$layout_measure_start(root, beat_layout)
          } else if ((($a = root['$is_a?']($scope.get('SynchPoint'))) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self.$layout_accord(root, beat_layout)
          } else if ((($a = root['$is_a?']($scope.get('Pause'))) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self.$layout_pause(root, beat_layout)
          } else if ((($a = root['$is_a?']($scope.get('NewPart'))) !== nil && (!$a.$$is_boolean || $a == true))) {
            return self.$layout_newpart(root, beat_layout)
            } else {
            return $gvars.log.$error("Missing Music -> Sheet transform: " + (root))
          };
        };

        def.$layout_note = function(root, beat_layout) {
          var $a, $b, TMP_72, $c, self = this, x_offset = nil, y_offset = nil, scale = nil, fill = nil, dotted = nil, size = nil, res = nil;
          if ($gvars.conf == null) $gvars.conf = nil;

          x_offset = $rb_plus($rb_times(($rb_plus($gvars.conf.$get("layout.PITCH_OFFSET"), root.$pitch())), $gvars.conf.$get("layout.X_SPACING")), $gvars.conf.$get("layout.X_OFFSET"));
          y_offset = beat_layout.$call(root.$beat());
          $a = Opal.to_ary($gvars.conf.$get("layout.DURATION_TO_STYLE")['$[]'](self.$check_duration(root))), scale = ($a[0] == null ? nil : $a[0]), fill = ($a[1] == null ? nil : $a[1]), dotted = ($a[2] == null ? nil : $a[2]);
          size = ($a = ($b = $gvars.conf.$get("layout.ELLIPSE_SIZE")).$map, $a.$$p = (TMP_72 = function(e){var self = TMP_72.$$s || this;
if (e == null) e = nil;
          return $rb_times(e, scale)}, TMP_72.$$s = self, TMP_72), $a).call($b);
          res = $scope.get('Ellipse').$new([x_offset, y_offset], size, fill, dotted, root);
          (($a = [$gvars.conf.$get("layout.LINE_THICK")]), $c = res, $c['$line_width='].apply($c, $a), $a[$a.length-1]);
          return res;
        };

        def.$layout_accord = function(root, beat_layout) {
          var $a, $b, TMP_73, $c, TMP_74, self = this, resnotes = nil, resnotes_sorted = nil, res = nil;

          resnotes = ($a = ($b = root.$notes()).$map, $a.$$p = (TMP_73 = function(c){var self = TMP_73.$$s || this;
if (c == null) c = nil;
          return self.$layout_note(c, beat_layout)}, TMP_73.$$s = self, TMP_73), $a).call($b);
          resnotes_sorted = ($a = ($c = resnotes).$sort_by, $a.$$p = (TMP_74 = function(n){var self = TMP_74.$$s || this;
if (n == null) n = nil;
          return n.$origin().$pitch()}, TMP_74.$$s = self, TMP_74), $a).call($c);
          res = [];
          res['$<<']($scope.get('FlowLine').$new(resnotes_sorted.$first(), resnotes_sorted.$last(), "dashed", root, resnotes.$first().$center()));
          res['$<<'](resnotes);
          return res;
        };

        def.$layout_pause = function(root, beat_layout) {
          var $a, $b, self = this, x_offset = nil, y_offset = nil, scale = nil, glyph = nil, dotted = nil, rest_size = nil, size = nil, res = nil;
          if ($gvars.conf == null) $gvars.conf = nil;

          x_offset = $rb_plus($rb_times(($rb_plus($gvars.conf.$get("layout.PITCH_OFFSET"), root.$pitch())), $gvars.conf.$get("layout.X_SPACING")), $gvars.conf.$get("layout.X_OFFSET"));
          y_offset = beat_layout.$call(root.$beat());
          self.$check_duration(root);
          $a = Opal.to_ary($gvars.conf.$get("layout.REST_TO_GLYPH")['$[]'](self.$check_duration(root))), scale = ($a[0] == null ? nil : $a[0]), glyph = ($a[1] == null ? nil : $a[1]), dotted = ($a[2] == null ? nil : $a[2]);
          rest_size = $gvars.conf.$get("layout.REST_SIZE");
          size = [$rb_times(rest_size.$first(), scale.$first()), $rb_times(rest_size.$last(), scale.$last())];
          res = (((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Glyph')).$new([x_offset, y_offset], size, glyph, dotted, root);
          if ((($a = root['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            (($a = [false]), $b = res, $b['$visible='].apply($b, $a), $a[$a.length-1])
          };
          return res;
        };

        def.$layout_measure_start = function(root, beat_layout) {
          var $a, $b, TMP_75, $c, self = this, x_offset = nil, y_offset = nil, scale = nil, fill = nil, dotted = nil, size = nil, res = nil;
          if ($gvars.conf == null) $gvars.conf = nil;

          x_offset = $rb_plus($rb_times(($rb_plus($gvars.conf.$get("layout.PITCH_OFFSET"), root.$pitch())), $gvars.conf.$get("layout.X_SPACING")), $gvars.conf.$get("layout.X_OFFSET"));
          y_offset = beat_layout.$call(root.$beat());
          $a = Opal.to_ary($gvars.conf.$get("layout.DURATION_TO_STYLE")['$[]'](self.$duration_to_id(root.$duration()))), scale = ($a[0] == null ? nil : $a[0]), fill = ($a[1] == null ? nil : $a[1]), dotted = ($a[2] == null ? nil : $a[2]);
          size = ($a = ($b = $gvars.conf.$get("layout.ELLIPSE_SIZE")).$map, $a.$$p = (TMP_75 = function(e){var self = TMP_75.$$s || this;
if (e == null) e = nil;
          return $rb_times(e, scale)}, TMP_75.$$s = self, TMP_75), $a).call($b);
          res = $scope.get('Ellipse').$new([x_offset, $rb_minus($rb_minus(y_offset, size.$last()), 0.5)], [size.$first(), 0.1], fill, false, root);
          if ((($a = root['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            (($a = [false]), $c = res, $c['$visible='].apply($c, $a), $a[$a.length-1])
          };
          return res;
        };

        def.$make_path_from_jumpline = function(from, to, north_east_offset, policy) {
          var self = this, start_of_vertical = nil, end_of_vertical = nil, start_orientation = nil, end_orientation = nil, start_offset = nil, end_offset = nil, end_offset_of_line = nil, start_of_jumpline = nil, end_of_jumpline = nil, p1 = nil, p2 = nil, p3 = nil, p4 = nil, p4_line = nil, a1 = nil, a2 = nil, a3 = nil, rp2 = nil, rp3 = nil, rp4 = nil, ra1 = nil, ra2 = nil, ra3 = nil, path = nil;

          start_of_vertical = self.$Vector2d($rb_plus(from.$x(), policy), from.$y());
          end_of_vertical = self.$Vector2d($rb_plus(from.$x(), policy), to.$y());
          start_orientation = self.$Vector2d((($rb_times(($rb_minus(start_of_vertical, from)), [1, 0])).$normalize()).$x(), 0);
          end_orientation = self.$Vector2d((($rb_times(($rb_minus(end_of_vertical, to)), [1, 0])).$normalize()).$x(), 0);
          start_offset = $rb_times(north_east_offset, [start_orientation.$x(), 1]);
          end_offset = $rb_times(north_east_offset, [end_orientation.$x(), -1]);
          end_offset_of_line = $rb_times($rb_times(north_east_offset, [end_orientation.$x(), -1]), [1.5, 1]);
          start_of_vertical = $rb_plus(start_of_vertical, $rb_times(start_offset, [0, 1]));
          end_of_vertical = $rb_plus(end_of_vertical, $rb_times(end_offset, [0, 1]));
          start_of_jumpline = $rb_plus(from, [$rb_times(start_offset.$x(), north_east_offset.$x()), north_east_offset.$y()['$+@']()]);
          end_of_jumpline = $rb_plus(to, [$rb_times(end_offset.$x(), north_east_offset.$x()), north_east_offset.$y()['$-@']()]);
          p1 = $rb_plus(from, start_offset);
          p2 = start_of_vertical;
          p3 = end_of_vertical;
          p4 = $rb_plus(to, end_offset);
          p4_line = $rb_plus(to, end_offset_of_line);
          a1 = $rb_plus($rb_plus(p4, $rb_times(end_orientation, 2.5)), [0, 1]);
          a2 = $rb_minus($rb_plus(p4, $rb_times(end_orientation, 2.5)), [0, 1]);
          a3 = p4;
          rp2 = $rb_minus(p2, p1);
          rp3 = $rb_minus(p3, p2);
          rp4 = $rb_minus(p4_line, p3);
          ra1 = $rb_minus(a1, p4);
          ra2 = $rb_minus(a2, a1);
          ra3 = $rb_minus(p4, a2);
          path = [[["M", p1.$x(), p1.$y()], ["l", rp2.$x(), rp2.$y()], ["l", rp3.$x(), rp3.$y()], ["l", rp4.$x(), rp4.$y()]], [["M", p4.$x(), p4.$y()], ["l", ra1.$x(), ra1.$y()], ["l", ra2.$x(), ra2.$y()], ["l", ra3.$x(), ra3.$y()], ["z"]]];
          return path;
        };

        def.$layout_newpart = function(root, beat_layout) {
          var $a, self = this, x_offset = nil, y_offset = nil, res = nil;
          if ($gvars.conf == null) $gvars.conf = nil;
          if ($gvars.log == null) $gvars.log = nil;

          if ((($a = root.$beat()) !== nil && (!$a.$$is_boolean || $a == true))) {
            x_offset = $rb_plus($rb_times(($rb_plus($rb_plus($gvars.conf.$get("layout.PITCH_OFFSET"), root.$pitch()), (-0.5))), $gvars.conf.$get("layout.X_SPACING")), $gvars.conf.$get("layout.X_OFFSET"));
            y_offset = $rb_minus(beat_layout.$call(root.$beat()), $rb_times($gvars.conf.$get("layout.FONT_STYLE_DEF")['$[]']("regular")['$[]']("font_size"), 0.5));
            res = $scope.get('Annotation').$new([x_offset, y_offset], root.$name(), "regular", nil);
            } else {
            $gvars.log.$warning("Part without content");
            res = nil;
          };
          return res;
        };

        def.$duration_to_id = function(duration) {
          var $a, self = this, result = nil;
          if ($gvars.conf == null) $gvars.conf = nil;

          result = (("d") + (duration)).$to_sym();
          if ((($a = $gvars.conf.$get("layout.DURATION_TO_STYLE")['$[]'](result)['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            result = "err"};
          return result;
        };

        def.$check_duration = function(root) {
          var $a, self = this, result = nil;
          if ($gvars.log == null) $gvars.log = nil;

          result = self.$duration_to_id(root.$duration());
          if ((($a = result['$===']("err")) !== nil && (!$a.$$is_boolean || $a == true))) {
            $gvars.log.$error("unsupported duration at " + (root.$start_pos_to_s()), root.$start_pos(), root.$end_pos())};
          return result;
        };

        def.$make_sheetmark_path = function(note) {
          var $a, $b, TMP_76, self = this, w = nil, h = nil, base = nil, vpath = nil, path = nil;

          w = 0.5;
          h = 5;
          base = $rb_minus(self.$Vector2d(note), [w, $rb_divide(h, 2)]);
          vpath = [self.$Vector2d(w, (w)['$-@']()), self.$Vector2d(w, $rb_times(2, w)), self.$Vector2d(0, h), self.$Vector2d((w)['$-@'](), $rb_times(2, w)), self.$Vector2d((w)['$-@'](), $rb_times(-2, (w))), self.$Vector2d(0, h['$-@']())];
          path = [["M", base.$x(), base.$y()]];
          ($a = ($b = vpath).$each, $a.$$p = (TMP_76 = function(p){var self = TMP_76.$$s || this;
if (p == null) p = nil;
          return path['$<<'](["l", p.$x(), p.$y()])}, TMP_76.$$s = self, TMP_76), $a).call($b);
          return path;
        };

        def.$make_slur_path = function(p1, p2) {
          var self = this, deltap = nil, cp_template = nil, cp1 = nil, cp2 = nil, slurpath = nil;

          deltap = $rb_minus(p2, p1);
          cp_template = self.$Vector2d($rb_times(0.3, deltap.$length()), 0).$rotate(deltap.$angle());
          cp1 = cp_template.$rotate(-0.4);
          cp2 = $rb_plus(deltap, cp_template.$reverse().$rotate(0.4));
          return slurpath = [["M", p1.$x(), p1.$y()], ["c", cp1.$x(), cp1.$y(), cp2.$x(), cp2.$y(), deltap.$x(), deltap.$y()]];
        };

        return (def.$make_annotated_bezier_path = function(points) {
          var self = this, p1 = nil, p2 = nil, deltap = nil, cp_template = nil, rotate_by = nil, cp1 = nil, cp2 = nil, cpa1 = nil, cpa2 = nil, cpm1 = nil, cpm2 = nil, cpmm = nil, cpmm1 = nil, cpmm2 = nil, annotation_anchor = nil, slurpath = nil;

          p1 = points.$first();
          p2 = points.$last();
          deltap = $rb_minus(p2, p1);
          cp_template = self.$Vector2d(5, 0).$rotate(deltap.$angle());
          rotate_by = $rb_divide((($scope.get('Math')).$$scope.get('PI')), 2);
          cp1 = cp_template.$rotate(rotate_by['$-@']());
          cp2 = $rb_plus(deltap, cp_template.$reverse().$rotate(rotate_by));
          cpa1 = $rb_plus(p1, cp1);
          cpa2 = $rb_plus(p1, cp2);
          cpm1 = $rb_divide(($rb_plus(p1, cpa1)), 2);
          cpm2 = $rb_divide(($rb_plus(p2, cpa2)), 2);
          cpmm = $rb_divide(($rb_plus(cpa1, cpa2)), 2);
          cpmm1 = $rb_divide(($rb_plus(cpm1, cpmm)), 2);
          cpmm2 = $rb_divide(($rb_plus(cpm2, cpmm)), 2);
          annotation_anchor = $rb_plus($rb_divide(($rb_plus(cpmm1, cpmm2)), 2), $rb_times(($rb_minus(cpmm1, cpmm2)).$perpendicular().$normalize(), 2));
          annotation_anchor = $rb_plus(annotation_anchor, [0, -4]);
          slurpath = [["M", p1.$x(), p1.$y()], ["c", cp1.$x(), cp1.$y(), cp2.$x(), cp2.$y(), deltap.$x(), deltap.$y()]];
          return [slurpath, annotation_anchor];
        }, nil) && 'make_annotated_bezier_path';
      })(self, null);
    })(self);
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["abc_to_harpnotes"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $hash2 = Opal.hash2, $range = Opal.range, $gvars = Opal.gvars;

  Opal.add_stubs(['$require', '$map', '$lambda', '$Native', '$[]', '$each', '$[]=', '$downcase', '$floor', '$%', '$clone', '$==', '$!', '$new', '$reset_state', '$reset_measure_accidentals', '$match', '$parse', '$last', '$first', '$<<', '$message', '$error', '$split', '$inject', '$get_metadata', '$select', '$nil?', '$join', '$compact', '$flatten', '$parse_harpnote_config', '$get', '$charpos_to_line_column', '$warning', '$empty?', '$to_i', '$strip', '$set_key', '$each_with_index', '$debug', '$index=', '$flatten!', '$compact!', '$send', '$origin=', '$start_pos=', '$end_pos=', '$make_jumplines', '$make_notebound_annotations', '$unshift', '$now', '$to_n', '$keys', '$meta_data=', '$harpnote_options=', '$push', '$harpnote_options', '$to_s', '$pop', '$line_no', '$count', '$length', '$private', '$is_a?', '$_extract_chord_lines', '$origin', '$start_pos_to_s', '$start_pos', '$end_pos', '$===', '$to_f', '$round', '$transform_rest', '$transform_real_note', '$tuplet=', '$tuplet_start=', '$tuplet_end=', '$pitch', '$get_midipitch', '$visible=', '$companion=', '$first_in_part=', '$clear', '$slur_starts=', '$slur_ends=', '$tie_start=', '$tie_end=', '$tie_start?', '$tie_end?', '$_extract_variant_ending', '$gsub']);
  self.$require("native");
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base) {
      var self = $module($base, 'Input');

      var def = self.$$proto, $scope = self.$$scope;

      (function($base, $super) {
        function $ABCPitchToMidipitch(){};
        var self = $ABCPitchToMidipitch = $klass($base, $super, 'ABCPitchToMidipitch', $ABCPitchToMidipitch);

        var def = self.$$proto, $scope = self.$$scope, TMP_4;

        def.measure_accidentals = def.voice_accidentals = def.accidental_pitches = nil;
        def.$initialize = function() {
          var $a, $b, TMP_1, $c, TMP_2, $d, TMP_3, self = this;

          self.tonemap = $hash2(["c", "d", "e", "f", "g", "a", "b"], {"c": 0, "d": 1, "e": 2, "f": 3, "g": 4, "a": 5, "b": 6});
          self.voice_accidentals = ($a = ($b = ($range(0, 6, false))).$map, $a.$$p = (TMP_1 = function(f){var self = TMP_1.$$s || this;
if (f == null) f = nil;
          return 0}, TMP_1.$$s = self, TMP_1), $a).call($b);
          self.measure_accidentals = ($a = ($c = ($range(0, 6, false))).$map, $a.$$p = (TMP_2 = function(f){var self = TMP_2.$$s || this;
if (f == null) f = nil;
          return 0}, TMP_2.$$s = self, TMP_2), $a).call($c);
          self.on_error = ($a = ($d = self).$lambda, $a.$$p = (TMP_3 = function(line, message){var self = TMP_3.$$s || this;
if (line == null) line = nil;if (message == null) message = nil;
          return nil}, TMP_3.$$s = self, TMP_3), $a).call($d);
          return self.accidental_pitches = $hash2(["sharp", "flat", "natural"], {"sharp": 1, "flat": -1, "natural": 0});
        };

        def.$on_error = TMP_4 = function() {
          var self = this, $iter = TMP_4.$$p, block = $iter || nil;

          TMP_4.$$p = null;
          return self.on_error = block;
        };

        def.$set_key = function(key) {
          var $a, $b, TMP_5, $c, TMP_6, self = this, nkey = nil, accidentals = nil;

          self.voice_accidentals = ($a = ($b = ($range(0, 6, false))).$map, $a.$$p = (TMP_5 = function(f){var self = TMP_5.$$s || this;
if (f == null) f = nil;
          return 0}, TMP_5.$$s = self, TMP_5), $a).call($b);
          nkey = self.$Native(key);
          accidentals = self.$Native(key)['$[]']("accidentals");
          ($a = ($c = accidentals).$each, $a.$$p = (TMP_6 = function(accidental){var self = TMP_6.$$s || this, a = nil;
            if (self.voice_accidentals == null) self.voice_accidentals = nil;
            if (self.tonemap == null) self.tonemap = nil;
            if (self.accidental_pitches == null) self.accidental_pitches = nil;
if (accidental == null) accidental = nil;
          a = self.$Native(accidental);
            self.voice_accidentals['$[]='](self.tonemap['$[]'](a['$[]']("note").$downcase()), self.accidental_pitches['$[]'](a['$[]']("acc").$downcase()));
            return self;}, TMP_6.$$s = self, TMP_6), $a).call($c);
          return self;
        };

        def.$reset_measure_accidentals = function() {
          var $a, $b, TMP_7, self = this;

          return self.measure_accidentals = ($a = ($b = self.measure_accidentals).$map, $a.$$p = (TMP_7 = function(f){var self = TMP_7.$$s || this;
if (f == null) f = nil;
          return 0}, TMP_7.$$s = self, TMP_7), $a).call($b);
        };

        return (def.$get_midipitch = function(note, persist_accidentals) {
          var $a, self = this, native_note = nil, abc_pitch = nil, scale = nil, octave = nil, note_in_octave = nil, acc_by_key = nil, note_accidental = nil, measure_accidentals = nil, pitch_delta = nil, acc_by_measure = nil, result = nil;

          if (persist_accidentals == null) {
            persist_accidentals = true
          }
          native_note = self.$Native(note);
          abc_pitch = native_note['$[]']("pitch");
          scale = [0, 2, 4, 5, 7, 9, 11];
          octave = ($rb_divide(abc_pitch, 7)).$floor();
          note_in_octave = abc_pitch['$%'](7);
          if ($rb_lt(note_in_octave, 0)) {
            note_in_octave = $rb_plus(note_in_octave, 7)};
          acc_by_key = self.voice_accidentals['$[]'](note_in_octave);
          note_accidental = native_note['$[]']("accidental");
          measure_accidentals = self.measure_accidentals.$clone();
          if ((($a = (note_accidental)) !== nil && (!$a.$$is_boolean || $a == true))) {
            pitch_delta = self.accidental_pitches['$[]'](note_accidental);
            if (pitch_delta['$=='](0)) {
              if ((($a = measure_accidentals['$[]'](note_in_octave)['$=='](0)['$!']()) !== nil && (!$a.$$is_boolean || $a == true))) {
                pitch_delta = 0
                } else {
                pitch_delta = $rb_times(-1, self.voice_accidentals['$[]'](note_in_octave))
              }};
            measure_accidentals['$[]='](note_in_octave, pitch_delta);};
          acc_by_measure = measure_accidentals['$[]'](note_in_octave);
          if (persist_accidentals !== false && persist_accidentals !== nil) {
            self.measure_accidentals = measure_accidentals.$clone()};
          result = $rb_plus($rb_plus($rb_plus($rb_plus(60, $rb_times(12, octave)), scale['$[]'](note_in_octave)), acc_by_key), acc_by_measure);
          return result;
        }, nil) && 'get_midipitch';
      })(self, null);

      (function($base, $super) {
        function $ABCToHarpnotes(){};
        var self = $ABCToHarpnotes = $klass($base, $super, 'ABCToHarpnotes', $ABCToHarpnotes);

        var def = self.$$proto, $scope = self.$$scope;

        def.pitch_transformer = def.annotations = def.abc_code = def.tuplet_downcount = def.pitch_providers = def.current_tuplet = def.repetition_stack = def.previous_note = def.next_note_marks = def.previous_new_part = nil;
        def.$initialize = function() {
          var self = this;

          self.pitch_transformer = (((($scope.get('Harpnotes')).$$scope.get('Input'))).$$scope.get('ABCPitchToMidipitch')).$new();
          self.abc_code = nil;
          self.previous_new_part = [];
          return self.$reset_state();
        };

        def.$reset_state = function() {
          var self = this;

          self.jumptargets = $hash2([], {});
          self.next_note_marks = $hash2(["measure", "repeat_start", "variant_ending"], {"measure": false, "repeat_start": false, "variant_ending": nil});
          self.previous_new_part = [];
          self.previous_note = nil;
          self.repetition_stack = [];
          self.pitch_transformer.$reset_measure_accidentals();
          self.current_tuplet = 0;
          self.tuplet_downcount = 0;
          self.pitch_providers = [];
          return nil;
        };

        def.$parse_harpnote_config = function(abc_code) {
          var $a, $b, TMP_8, self = this, hn_config_from_song = nil, line_no = nil;

          hn_config_from_song = $hash2([], {});
          line_no = 1;
          ($a = ($b = abc_code.$split("\n")).$each, $a.$$p = (TMP_8 = function(line){var self = TMP_8.$$s || this, $a, $b, TMP_9, $c, $d, entry = nil, parsed_entry = nil, e = nil, message = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (line == null) line = nil;
          entry = ($a = ($b = line).$match, $a.$$p = (TMP_9 = function(m){var self = TMP_9.$$s || this;
if (m == null) m = nil;
            return [m['$[]'](1), m['$[]'](2)]}, TMP_9.$$s = self, TMP_9), $a).call($b, /^%%%%hn\.(print|legend|note|annotation|lyrics) (.*)/);
            if (entry !== false && entry !== nil) {
              try {
              parsed_entry = $scope.get('JSON').$parse(entry.$last());
                parsed_entry['$[]=']("line_no", line_no);
                ($a = entry.$first(), $c = hn_config_from_song, ((($d = $c['$[]']($a)) !== false && $d !== nil) ? $d : $c['$[]=']($a, [])));
                hn_config_from_song['$[]'](entry.$first())['$<<'](parsed_entry);
              } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
                message = ("error in harpnote commands: " + (e.$message()) + " [" + (line_no) + ":" + (entry) + "]");
                $gvars.log.$error(message, [line_no, 1], [line_no, 2]);
                }else { throw $err; }
              }};
            return line_no = $rb_plus(line_no, 1);}, TMP_8.$$s = self, TMP_8), $a).call($b);
          if ((($a = hn_config_from_song['$[]']("legend")) !== nil && (!$a.$$is_boolean || $a == true))) {
            hn_config_from_song['$[]=']("legend", hn_config_from_song['$[]']("legend").$first())};
          if ((($a = hn_config_from_song['$[]']("lyrics")) !== nil && (!$a.$$is_boolean || $a == true))) {
            hn_config_from_song['$[]=']("lyrics", hn_config_from_song['$[]']("lyrics").$first())};
          return hn_config_from_song;
        };

        def.$get_metadata = function(abc_code) {
          var $a, $b, TMP_10, self = this, retval = nil;

          retval = ($a = ($b = abc_code.$split("\n")).$inject, $a.$$p = (TMP_10 = function(result, line){var self = TMP_10.$$s || this, $a, $b, TMP_11, entry = nil;
if (result == null) result = nil;if (line == null) line = nil;
          entry = ($a = ($b = line).$match, $a.$$p = (TMP_11 = function(m){var self = TMP_11.$$s || this;
if (m == null) m = nil;
            return [m['$[]'](1), m['$[]'](2)]}, TMP_11.$$s = self, TMP_11), $a).call($b, /^(X|T|F):\s*(.*)/);
            if (entry !== false && entry !== nil) {
              result['$[]='](entry.$first(), entry.$last())};
            return result;}, TMP_10.$$s = self, TMP_10), $a).call($b, $hash2([], {}));
          return retval;
        };

        def.$add_metadata = function(abc_code, new_metadata) {
          var $a, $b, TMP_12, $c, $d, TMP_13, self = this, old_metadata = nil, more_metadata = nil;

          old_metadata = self.$get_metadata(abc_code);
          more_metadata = ($a = ($b = ($c = ($d = new_metadata).$select, $c.$$p = (TMP_13 = function(k, v){var self = TMP_13.$$s || this;
if (k == null) k = nil;if (v == null) v = nil;
          return old_metadata['$[]'](k)['$nil?']()}, TMP_13.$$s = self, TMP_13), $c).call($d)).$map, $a.$$p = (TMP_12 = function(k, v){var self = TMP_12.$$s || this;
if (k == null) k = nil;if (v == null) v = nil;
          return "" + (k) + ":" + (v)}, TMP_12.$$s = self, TMP_12), $a).call($b);
          return [more_metadata, abc_code].$flatten().$compact().$join("\n");
        };

        def.$transform = function(zupfnoter_abc) {
          var $a, $b, TMP_14, $c, TMP_15, $d, TMP_16, $e, TMP_17, $f, TMP_18, $g, TMP_19, $h, TMP_23, $i, TMP_29, $j, TMP_30, $k, TMP_31, $l, TMP_32, $m, TMP_34, self = this, harpnote_options = nil, warnings = nil, note_length_rows = nil, note_length = nil, tune = nil, lines = nil, first_staff = nil, key = nil, meter = nil, voices = nil, hn_voices = nil, result = nil, meta_data = nil, duration = nil, bpm = nil, duration_display = nil, meta_data_from_tune = nil, print_options = nil;
          if ($gvars.conf == null) $gvars.conf = nil;

          self.abc_code = zupfnoter_abc;
          harpnote_options = self.$parse_harpnote_config(zupfnoter_abc);
          if ($gvars.conf.$get("location")['$==']("song")) {
            self.annotations = $gvars.conf.$get("annotations")
            } else {
            self.annotations = (((($a = harpnote_options['$[]']("annotation")) !== false && $a !== nil) ? $a : []));
            self.annotations = ($a = ($b = self.annotations).$inject, $a.$$p = (TMP_14 = function(hash, entry){var self = TMP_14.$$s || this;
if (hash == null) hash = nil;if (entry == null) entry = nil;
            hash['$[]='](entry['$[]']("id"), entry);
              return hash;}, TMP_14.$$s = self, TMP_14), $a).call($b, $hash2([], {}));
          };
          
          var parser = new ABCJS.parse.Parse();
          parser.parse(self.abc_code);
          var warnings = parser.getWarningObjects();
          var tune = parser.getTune();
          // todo handle parser warnings
          console.log(tune);
          console.log(JSON.stringify(tune));
        
          warnings = [self.$Native(warnings)].$flatten().$compact();
          ($a = ($c = warnings).$each, $a.$$p = (TMP_15 = function(w){var self = TMP_15.$$s || this, $a, wn = nil, line_no = nil, char_pos = nil, msg = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (w == null) w = nil;
          wn = self.$Native(w);
            $a = Opal.to_ary(self.$charpos_to_line_column(wn['$[]']("startChar"))), line_no = ($a[0] == null ? nil : $a[0]), char_pos = ($a[1] == null ? nil : $a[1]);
            msg = "" + (wn['$[]']("message")) + " at line " + (wn['$[]']("line")) + " at [" + (line_no) + ":" + (char_pos) + "]";
            return $gvars.log.$warning(msg, [line_no, char_pos], [line_no, $rb_plus(char_pos, 1)]);}, TMP_15.$$s = self, TMP_15), $a).call($c);
          note_length_rows = ($a = ($d = zupfnoter_abc.$split("\n")).$select, $a.$$p = (TMP_16 = function(row){var self = TMP_16.$$s || this;
if (row == null) row = nil;
          return row['$[]']($range(0, 1, false))['$==']("L:")}, TMP_16.$$s = self, TMP_16), $a).call($d);
          if ((($a = note_length_rows['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            note_length_rows = ["L:1/4"]};
          note_length = ($a = ($e = note_length_rows.$first().$strip().$split(":").$last().$split("/")).$map, $a.$$p = (TMP_17 = function(s){var self = TMP_17.$$s || this;
if (s == null) s = nil;
          return s.$strip().$to_i()}, TMP_17.$$s = self, TMP_17), $a).call($e);
          note_length = $rb_divide(note_length.$last(), note_length.$first());
          tune = self.$Native(tune);
          lines = ($a = ($f = tune['$[]']("lines")).$select, $a.$$p = (TMP_18 = function(l){var self = TMP_18.$$s || this;
if (l == null) l = nil;
          return self.$Native(l)['$[]']("staff")}, TMP_18.$$s = self, TMP_18), $a).call($f);
          first_staff = self.$Native(self.$Native(lines.$first())['$[]']("staff").$first());
          key = first_staff['$[]']("key");
          self.pitch_transformer.$set_key(key);
          meter = $hash2(["type"], {"type": first_staff['$[]']("meter")['$[]']("type")});
          if (meter['$[]']("type")['$==']("specified")) {
            meter['$[]=']("den", self.$Native(first_staff['$[]']("meter")['$[]']("value").$first())['$[]']("den"));
            meter['$[]=']("num", self.$Native(first_staff['$[]']("meter")['$[]']("value").$first())['$[]']("num"));
            meter['$[]=']("display", "" + (meter['$[]']("num")) + "/" + (meter['$[]']("den")));
          } else if ((($a = meter['$[]=']("display", meter['$[]']("type"))) !== nil && (!$a.$$is_boolean || $a == true))) {};
          voices = [];
          ($a = ($g = lines).$each_with_index, $a.$$p = (TMP_19 = function(line, line_index){var self = TMP_19.$$s || this, $a, $b, TMP_20, voice_no = nil;
if (line == null) line = nil;if (line_index == null) line_index = nil;
          voice_no = 1;
            return ($a = ($b = self.$Native(line)['$[]']("staff")).$each_with_index, $a.$$p = (TMP_20 = function(staff, staff_index){var self = TMP_20.$$s || this, $a, $b, TMP_21;
if (staff == null) staff = nil;if (staff_index == null) staff_index = nil;
            return ($a = ($b = self.$Native(staff)['$[]']("voices")).$each_with_index, $a.$$p = (TMP_21 = function(voice, voice_index){var self = TMP_21.$$s || this, $a, $b, $c, TMP_22;
                if ($gvars.log == null) $gvars.log = nil;
if (voice == null) voice = nil;if (voice_index == null) voice_index = nil;
              $gvars.log.$debug("reading line.staff.voice " + (voice_no) + ":" + (line_index) + " " + (staff_index) + "." + (voice_index) + " (" + ("abc_to_harpnotes") + " " + (262) + ")");
                ($a = voice_no, $b = voices, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, (((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Voice')).$new())));
                voices['$[]'](voice_no)['$<<'](($a = ($b = voice).$map, $a.$$p = (TMP_22 = function(x){var self = TMP_22.$$s || this;
if (x == null) x = nil;
                return self.$Native(x)}, TMP_22.$$s = self, TMP_22), $a).call($b));
                (($a = [voice_no]), $c = voices['$[]'](voice_no), $c['$index='].apply($c, $a), $a[$a.length-1]);
                voices['$[]'](voice_no)['$flatten!']();
                return voice_no = $rb_plus(voice_no, 1);}, TMP_21.$$s = self, TMP_21), $a).call($b)}, TMP_20.$$s = self, TMP_20), $a).call($b);}, TMP_19.$$s = self, TMP_19), $a).call($g);
          voices['$compact!']();
          hn_voices = ($a = ($h = voices.$each_with_index()).$map, $a.$$p = (TMP_23 = function(voice, voice_idx){var self = TMP_23.$$s || this, $a, $b, TMP_24, $c, TMP_25, $d, TMP_27, $e, TMP_28, hn_voice = nil, jumplines = nil, notebound_annotations = nil;
if (voice == null) voice = nil;if (voice_idx == null) voice_idx = nil;
          self.$reset_state();
            self.pitch_providers = ($a = ($b = voice).$map, $a.$$p = (TMP_24 = function(el){var self = TMP_24.$$s || this, $a, result = nil;
if (el == null) el = nil;
            result = nil;
              if ((($a = el['$[]']("pitches")) !== nil && (!$a.$$is_boolean || $a == true))) {
                return result = el
                } else {
                return nil
              };}, TMP_24.$$s = self, TMP_24), $a).call($b);
            hn_voice = ($a = ($c = voice.$each_with_index()).$map, $a.$$p = (TMP_25 = function(el, i){var self = TMP_25.$$s || this, $a, $b, TMP_26, type = nil, hn_voice_element = nil, end_char = nil, start_char = nil, start_pos = nil, end_pos = nil;
if (el == null) el = nil;if (i == null) i = nil;
            type = el['$[]']("el_type");
              hn_voice_element = self.$send("transform_" + (type), el, i);
              if ((($a = el['$[]']("startChar")) !== nil && (!$a.$$is_boolean || $a == true))) {
                if (el['$[]']("startChar")['$=='](el['$[]']("endChar"))) {
                  ($a = "startChar", $b = el, $b['$[]=']($a, $rb_minus($b['$[]']($a), 3)))};
                end_char = el['$[]']("endChar");
                start_char = el['$[]']("startChar");
                if ($rb_gt(start_char, 0)) {
                  start_pos = self.$charpos_to_line_column(start_char)};
                if ($rb_gt(end_char, 0)) {
                  end_pos = self.$charpos_to_line_column(end_char)};
                if ((($a = ((($b = hn_voice_element['$nil?']()) !== false && $b !== nil) ? $b : hn_voice_element['$empty?']())) !== nil && (!$a.$$is_boolean || $a == true))) {
                  } else {
                  ($a = ($b = hn_voice_element).$each, $a.$$p = (TMP_26 = function(e){var self = TMP_26.$$s || this, $a, $b;
if (e == null) e = nil;
                  (($a = [el]), $b = e, $b['$origin='].apply($b, $a), $a[$a.length-1]);
                    (($a = [start_pos]), $b = e, $b['$start_pos='].apply($b, $a), $a[$a.length-1]);
                    return (($a = [end_pos]), $b = e, $b['$end_pos='].apply($b, $a), $a[$a.length-1]);}, TMP_26.$$s = self, TMP_26), $a).call($b)
                };};
              return hn_voice_element;}, TMP_25.$$s = self, TMP_25), $a).call($c).$flatten().$compact();
            jumplines = [];
            ($a = ($d = hn_voice).$each, $a.$$p = (TMP_27 = function(e){var self = TMP_27.$$s || this;
if (e == null) e = nil;
            return jumplines['$<<'](self.$make_jumplines(e))}, TMP_27.$$s = self, TMP_27), $a).call($d);
            hn_voice = $rb_plus(hn_voice, jumplines.$flatten().$compact());
            notebound_annotations = [];
            ($a = ($e = hn_voice).$each, $a.$$p = (TMP_28 = function(e){var self = TMP_28.$$s || this;
if (e == null) e = nil;
            return notebound_annotations['$<<'](self.$make_notebound_annotations(e))}, TMP_28.$$s = self, TMP_28), $a).call($e);
            hn_voice = $rb_plus(hn_voice, notebound_annotations.$flatten().$compact());
            return hn_voice;}, TMP_23.$$s = self, TMP_23), $a).call($h);
          hn_voices.$unshift(hn_voices.$first());
          result = (((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Song')).$new(hn_voices, note_length);
          meta_data = $hash2(["compile_time", "meter", "key"], {"compile_time": $scope.get('Time').$now(), "meter": meter['$[]']("display"), "key": $rb_plus($rb_plus(self.$Native(key)['$[]']("root"), self.$Native(key)['$[]']("acc")), self.$Native(key)['$[]']("mode"))});
          ($a = ($i = $hash2(["key"], {"key": "K:"})).$each, $a.$$p = (TMP_29 = function(k, v){var self = TMP_29.$$s || this, $a;
            if (self.annotations == null) self.annotations = nil;
if (k == null) k = nil;if (v == null) v = nil;
          if ((($a = self.annotations['$[]'](v)) !== nil && (!$a.$$is_boolean || $a == true))) {
              return meta_data['$[]='](k, $rb_plus(meta_data['$[]'](k), (((($a = self.annotations['$[]'](v)['$[]']("text")) !== false && $a !== nil) ? $a : ""))))
              } else {
              return nil
            }}, TMP_29.$$s = self, TMP_29), $a).call($i);
          duration = 0.25;
          bpm = 120;
          meta_data['$[]=']("tempo", $hash2(["duration", "bpm"], {"duration": [duration], "bpm": bpm}));
          meta_data['$[]=']("tempo_display", "1/" + ($rb_divide(1, duration)) + " = " + (bpm));
          if ((($a = tune['$[]']("metaText")['$[]']("tempo")) !== nil && (!$a.$$is_boolean || $a == true))) {
            duration = (function() {try {return tune['$[]']("metaText")['$[]']("tempo")['$[]']("duration") } catch ($err) { return meta_data['$[]']("tempo")['$[]']("duration") }})();
            bpm = (function() {try {return tune['$[]']("metaText")['$[]']("tempo")['$[]']("bpm") } catch ($err) { return meta_data['$[]']("tempo")['$[]']("bpm") }})();
            meta_data['$[]=']("tempo", $hash2(["duration", "bpm"], {"duration": duration, "bpm": bpm}));
            duration_display = ($a = ($j = duration).$map, $a.$$p = (TMP_30 = function(d){var self = TMP_30.$$s || this;
if (d == null) d = nil;
            return "1/" + ($rb_divide(1, d))}, TMP_30.$$s = self, TMP_30), $a).call($j);
            meta_data['$[]=']("tempo_display", [tune['$[]']("metaText")['$[]']("tempo")['$[]']("preString"), duration_display, "=", bpm, tune['$[]']("metaText")['$[]']("tempo")['$[]']("postString")].$join(" "));};
          meta_data_from_tune = $scope.get('Hash').$new(tune['$[]']("metaText").$to_n());
          ($a = ($k = meta_data_from_tune.$keys()).$each, $a.$$p = (TMP_31 = function(k){var self = TMP_31.$$s || this;
if (k == null) k = nil;
          return meta_data['$[]='](k, meta_data_from_tune['$[]'](k))}, TMP_31.$$s = self, TMP_31), $a).call($k);
          (($a = [meta_data]), $l = result, $l['$meta_data='].apply($l, $a), $a[$a.length-1]);
          (($a = [$hash2([], {})]), $l = result, $l['$harpnote_options='].apply($l, $a), $a[$a.length-1]);
          print_options = $scope.get('Confstack').$new();
          print_options.$push($gvars.conf.$get("defaults.print"));
          result.$harpnote_options()['$[]=']("print", ($a = ($l = (((($m = harpnote_options['$[]']("print")) !== false && $m !== nil) ? $m : [$hash2([], {})])).$each_with_index()).$map, $a.$$p = (TMP_32 = function(specified_option, index){var self = TMP_32.$$s || this, $a, $b, TMP_33, resulting_options = nil, missing_voices = nil, msg = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (specified_option == null) specified_option = nil;if (index == null) index = nil;
          print_options.$push(specified_option);
            resulting_options = $hash2(["view_id", "title", "startpos", "voices", "synchlines", "flowlines", "subflowlines", "jumplines", "layoutlines"], {"view_id": index, "title": print_options.$get("t"), "startpos": print_options.$get("startpos"), "voices": (print_options.$get("v")), "synchlines": (print_options.$get("s")), "flowlines": (print_options.$get("f")), "subflowlines": (print_options.$get("sf")), "jumplines": (print_options.$get("j")), "layoutlines": (((($a = print_options.$get("l")) !== false && $a !== nil) ? $a : print_options.$get("v")))});
            missing_voices = ($a = ($b = ($rb_minus(resulting_options['$[]']("voices"), resulting_options['$[]']("layoutlines")))).$map, $a.$$p = (TMP_33 = function(i){var self = TMP_33.$$s || this;
if (i == null) i = nil;
            return $rb_plus(i, 1)}, TMP_33.$$s = self, TMP_33), $a).call($b);
            if ((($a = missing_voices['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              } else {
              $gvars.log.$error("hn.print '" + (resulting_options['$[]']("title")) + "' l: missing voices " + (missing_voices.$to_s()))
            };
            print_options.$pop();
            msg = "hn.print '" + (resulting_options['$[]']("title")) + "' l: missing voices " + (missing_voices.$to_s());
            if ((($a = missing_voices['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              } else {
              $gvars.log.$error(msg, [self.$line_no(), 1])
            };
            return resulting_options;}, TMP_32.$$s = self, TMP_32), $a).call($l));
          if ($gvars.conf.$get("location")['$==']("song")) {
            result.$harpnote_options()['$[]=']("print", ($a = ($m = $gvars.conf.$get("produce")).$map, $a.$$p = (TMP_34 = function(i){var self = TMP_34.$$s || this, title = nil;
              if ($gvars.conf == null) $gvars.conf = nil;
              if ($gvars.log == null) $gvars.log = nil;
if (i == null) i = nil;
            title = $gvars.conf.$get("extract." + (i) + ".title");
              if (title !== false && title !== nil) {
                return $hash2(["title", "view_id"], {"title": title, "view_id": i})
                } else {
                $gvars.log.$error("could not find extract number " + (i), [1, 1], [1000, 1000]);
                return nil;
              };}, TMP_34.$$s = self, TMP_34), $a).call($m).$compact())};
          print_options = $scope.get('Confstack').$new();
          print_options.$push($gvars.conf.$get("defaults.legend"));
          if ((($a = harpnote_options['$[]']("legend")) !== nil && (!$a.$$is_boolean || $a == true))) {
            print_options.$push(harpnote_options['$[]']("legend"))};
          result.$harpnote_options()['$[]=']("legend", print_options.$get());
          print_options = $scope.get('Confstack').$new();
          print_options.$push($gvars.conf.$get("defaults.lyrics"));
          if ((($a = harpnote_options['$[]']("lyrics")) !== nil && (!$a.$$is_boolean || $a == true))) {
            print_options.$push(harpnote_options['$[]']("lyrics"))};
          result.$harpnote_options()['$[]=']("lyrics", print_options.$get());
          result.$harpnote_options()['$[]']("lyrics")['$[]=']("text", ((($a = meta_data['$[]']("unalignedWords")) !== false && $a !== nil) ? $a : []));
          result.$harpnote_options()['$[]=']("notes", ((($a = harpnote_options['$[]']("note")) !== false && $a !== nil) ? $a : []));
          return result;
        };

        def.$charpos_to_line_column = function(charpos) {
          var self = this, lines = nil, line_no = nil, char_pos = nil;

          lines = self.abc_code['$[]'](1, charpos).$split("\n");
          line_no = lines.$count();
          char_pos = lines.$last().$length();
          return [line_no, char_pos];
        };

        self.$private();

        def.$_extract_chord_lines = function(entity) {
          var $a, $b, TMP_35, self = this, result = nil;

          result = [];
          if ((($a = entity['$[]']("chord")['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            ($a = ($b = entity['$[]']("chord")).$each, $a.$$p = (TMP_35 = function(chord){var self = TMP_35.$$s || this, $a, $b, TMP_36, text = nil;
if (chord == null) chord = nil;
            text = self.$Native(chord)['$[]']("name");
              return ($a = ($b = text.$split("\n")).$each, $a.$$p = (TMP_36 = function(line){var self = TMP_36.$$s || this;
if (line == null) line = nil;
              return result['$<<'](line)}, TMP_36.$$s = self, TMP_36), $a).call($b);}, TMP_35.$$s = self, TMP_35), $a).call($b)
          };
          return result;
        };

        def.$_extract_variant_ending = function(entity) {
          var $a, self = this, result = nil;

          result = nil;
          if ((($a = entity['$[]']("startEnding")) !== nil && (!$a.$$is_boolean || $a == true))) {
            result = entity['$[]']("startEnding")};
          return result;
        };

        def.$make_jumplines = function(entity) {
          var $a, $b, TMP_37, self = this, result = nil, chords = nil;

          result = [];
          if ((($a = entity['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Playable')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            chords = self.$_extract_chord_lines(entity.$origin());
            ($a = ($b = chords).$each, $a.$$p = (TMP_37 = function(name){var self = TMP_37.$$s || this, $a, nameparts = nil, targetname = nil, target = nil, argument = nil;
              if (self.jumptargets == null) self.jumptargets = nil;
              if ($gvars.log == null) $gvars.log = nil;
if (name == null) name = nil;
            if (name['$[]'](0)['$==']("@")) {
                nameparts = name['$[]']($range(1, -1, false)).$split("@");
                targetname = nameparts['$[]'](0);
                target = self.jumptargets['$[]'](targetname);
                argument = ((($a = nameparts['$[]'](1)) !== false && $a !== nil) ? $a : 1);
                argument = argument.$to_i();
                if ((($a = target['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
                  return $gvars.log.$error("target '" + (targetname) + "' not found in voice at " + (entity.$start_pos_to_s()), entity.$start_pos(), entity.$end_pos())
                  } else {
                  return result['$<<']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Goto')).$new(entity, target, $hash2(["distance"], {"distance": argument})))
                };
                } else {
                return nil
              }}, TMP_37.$$s = self, TMP_37), $a).call($b);};
          return result;
        };

        def.$make_notebound_annotations = function(entity) {
          var $a, $b, TMP_38, self = this, result = nil, chords = nil;

          result = [];
          if ((($a = entity['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Playable')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            chords = self.$_extract_chord_lines(entity.$origin());
            ($a = ($b = chords).$each, $a.$$p = (TMP_38 = function(name){var self = TMP_38.$$s || this, $a, $b, TMP_39, $c, match = nil, semantic = nil, text = nil, pos_x = nil, pos_y = nil, $case = nil, annotation = nil, notepos = nil, position = nil;
              if (self.annotations == null) self.annotations = nil;
              if ($gvars.log == null) $gvars.log = nil;
if (name == null) name = nil;
            match = name.$match(/^([!#])([^\@]+)(\@(\-?[0-9\.]+),(\-?[0-9\.]+))?$/);
              if (match !== false && match !== nil) {
                semantic = match['$[]'](1);
                text = match['$[]'](2);
                if ((($a = match['$[]'](4)) !== nil && (!$a.$$is_boolean || $a == true))) {
                  pos_x = match['$[]'](4)};
                if ((($a = match['$[]'](5)) !== nil && (!$a.$$is_boolean || $a == true))) {
                  pos_y = match['$[]'](5)};
                $case = semantic;if ("#"['$===']($case)) {annotation = self.annotations['$[]'](text);
                if (annotation !== false && annotation !== nil) {
                  } else {
                  $gvars.log.$error("could not find annotation " + (text), entity.$start_pos(), entity.$end_pos())
                };}else if ("!"['$===']($case)) {annotation = $hash2(["text"], {"text": text})}else {annotation = nil};
                if (annotation !== false && annotation !== nil) {
                  if (pos_x !== false && pos_x !== nil) {
                    notepos = ($a = ($b = [pos_x, pos_y]).$map, $a.$$p = (TMP_39 = function(p){var self = TMP_39.$$s || this;
if (p == null) p = nil;
                    return p.$to_f()}, TMP_39.$$s = self, TMP_39), $a).call($b)};
                  position = ((($a = ((($c = notepos) !== false && $c !== nil) ? $c : annotation['$[]']("pos"))) !== false && $a !== nil) ? $a : [2, -5]);
                  return result['$<<']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('NoteBoundAnnotation')).$new(entity, $hash2(["pos", "text"], {"pos": position, "text": annotation['$[]']("text")})));
                  } else {
                  return nil
                };
                } else {
                return nil
              };}, TMP_38.$$s = self, TMP_38), $a).call($b);};
          return result;
        };

        def.$transform_note = function(note, index) {
          var $a, $b, TMP_40, self = this, duration = nil, start_tuplet = nil, end_tuplet = nil, result = nil, pitch_note = nil, chords = nil, jumpends = nil;
          if ($gvars.conf == null) $gvars.conf = nil;

          if (index == null) {
            index = 0
          }
          duration = ($rb_times($gvars.conf.$get("layout.SHORTEST_NOTE"), note['$[]']("duration"))).$round();
          if ((($a = note['$[]']("startTriplet")) !== nil && (!$a.$$is_boolean || $a == true))) {
            start_tuplet = true};
          if ((($a = note['$[]']("endTriplet")) !== nil && (!$a.$$is_boolean || $a == true))) {
            end_tuplet = true};
          if ($rb_gt(self.tuplet_downcount, 1)) {
            self.tuplet_downcount = $rb_minus(self.tuplet_downcount, 1)
            } else {
            self.tuplet_downcount = ((($a = note['$[]']("startTriplet")) !== false && $a !== nil) ? $a : 1);
            self.current_tuplet = self.tuplet_downcount;
          };
          if ((($a = note['$[]']("rest")['$nil?']()['$!']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            if (note['$[]']("rest")['$[]']("type")['$==']("spacer")) {
              result = []
              } else {
              pitch_note = self.pitch_providers['$[]']($range(index, -1, false)).$compact().$first();
              result = self.$transform_rest(note, duration, pitch_note);
            }
            } else {
            result = self.$transform_real_note(note, duration)
          };
          if ((($a = result['$empty?']()['$!']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            (($a = [self.current_tuplet]), $b = result.$first(), $b['$tuplet='].apply($b, $a), $a[$a.length-1]);
            (($a = [start_tuplet]), $b = result.$first(), $b['$tuplet_start='].apply($b, $a), $a[$a.length-1]);
            (($a = [end_tuplet]), $b = result.$first(), $b['$tuplet_end='].apply($b, $a), $a[$a.length-1]);
            if ((($a = self.repetition_stack['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              self.repetition_stack['$<<'](result.$last())};
            chords = self.$_extract_chord_lines(note);
            jumpends = [];
            ($a = ($b = chords).$each, $a.$$p = (TMP_40 = function(name){var self = TMP_40.$$s || this, $a, $b, TMP_41;
              if (self.jumptargets == null) self.jumptargets = nil;
if (name == null) name = nil;
            if (name['$[]'](0)['$=='](":")) {
                jumpends.$push(name['$[]']($range(1, -1, false)));
                self.jumptargets['$[]='](name['$[]']($range(1, -1, false)), ($a = ($b = result).$select, $a.$$p = (TMP_41 = function(n){var self = TMP_41.$$s || this;
if (n == null) n = nil;
                return n['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Playable')))}, TMP_41.$$s = self, TMP_41), $a).call($b).$last());};
              if (name['$[]'](0)['$==']("@")) {
                return nil
                } else {
                return nil
              };}, TMP_40.$$s = self, TMP_40), $a).call($b);};
          return result;
        };

        def.$transform_rest = function(note, duration, pitch_note) {
          var $a, $b, TMP_42, self = this, pitch = nil, rest = nil, result = nil;

          if (pitch_note == null) {
            pitch_note = nil
          }
          pitch = 60;
          if ((($a = self.previous_note) !== nil && (!$a.$$is_boolean || $a == true))) {
            pitch = self.previous_note.$pitch()};
          if ((($a = pitch_note['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            pitch = self.pitch_transformer.$get_midipitch(self.$Native(pitch_note['$[]']("pitches")).$first(), false)
          };
          rest = (((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Pause')).$new(pitch, duration);
          (($a = [note]), $b = rest, $b['$origin='].apply($b, $a), $a[$a.length-1]);
          if (note['$[]']("rest")['$[]']("type")['$==']("invisible")) {
            (($a = [false]), $b = rest, $b['$visible='].apply($b, $a), $a[$a.length-1])};
          self.previous_note = rest;
          result = [rest];
          if ((($a = self.next_note_marks['$[]']("measure")) !== nil && (!$a.$$is_boolean || $a == true))) {
            result['$<<']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('MeasureStart')).$new(rest));
            self.next_note_marks['$[]=']("measure", false);};
          if ((($a = self.next_note_marks['$[]']("repeat_start")) !== nil && (!$a.$$is_boolean || $a == true))) {
            self.repetition_stack['$<<'](rest);
            self.next_note_marks['$[]=']("repeat_start", false);};
          if ((($a = self.next_note_marks['$[]']("variant_ending")) !== nil && (!$a.$$is_boolean || $a == true))) {
            result['$<<']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('NoteBoundAnnotation')).$new(self.previous_note, $hash2(["pos", "text"], {"pos": [0, 0], "text": self.next_note_marks['$[]']("variant_ending")})));
            self.next_note_marks['$[]']("variant_ending");};
          ($a = ($b = self.previous_new_part).$each, $a.$$p = (TMP_42 = function(part){var self = TMP_42.$$s || this, $a, $b;
if (part == null) part = nil;
          (($a = [rest]), $b = part, $b['$companion='].apply($b, $a), $a[$a.length-1]);
            return (($a = [true]), $b = rest, $b['$first_in_part='].apply($b, $a), $a[$a.length-1]);}, TMP_42.$$s = self, TMP_42), $a).call($b);
          self.previous_new_part.$clear();
          return result;
        };

        def.$transform_real_note = function(note, duration) {
          var $a, $b, TMP_43, $c, $d, $e, TMP_45, $f, $g, TMP_46, $h, TMP_47, TMP_48, TMP_49, self = this, notes = nil, result = nil, synchpoint = nil;

          notes = ($a = ($b = self.$Native(note['$[]']("pitches"))).$map, $a.$$p = (TMP_43 = function(pitch){var self = TMP_43.$$s || this, $a, $b, $c, $d, TMP_44, $e, midipitch = nil, native_pitch = nil, thenote = nil;
            if (self.pitch_transformer == null) self.pitch_transformer = nil;
if (pitch == null) pitch = nil;
          midipitch = self.pitch_transformer.$get_midipitch(pitch);
            native_pitch = self.$Native(pitch);
            thenote = (((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Note')).$new(midipitch, duration);
            (($a = [note]), $b = thenote, $b['$origin='].apply($b, $a), $a[$a.length-1]);
            (($a = [($c = ($d = (((($e = native_pitch['$[]']("startSlur")) !== false && $e !== nil) ? $e : []))).$map, $c.$$p = (TMP_44 = function(s){var self = TMP_44.$$s || this;
if (s == null) s = nil;
            return self.$Native(s)['$[]']("label")}, TMP_44.$$s = self, TMP_44), $c).call($d)]), $b = thenote, $b['$slur_starts='].apply($b, $a), $a[$a.length-1]);
            (($a = [((($c = native_pitch['$[]']("endSlur")) !== false && $c !== nil) ? $c : [])]), $b = thenote, $b['$slur_ends='].apply($b, $a), $a[$a.length-1]);
            (($a = [(native_pitch['$[]']("startTie")['$nil?']()['$!']())]), $b = thenote, $b['$tie_start='].apply($b, $a), $a[$a.length-1]);
            (($a = [(native_pitch['$[]']("endTie")['$nil?']()['$!']())]), $b = thenote, $b['$tie_end='].apply($b, $a), $a[$a.length-1]);
            return thenote;}, TMP_43.$$s = self, TMP_43), $a).call($b);
          result = [];
          if (notes.$length()['$=='](1)) {
            result['$<<'](notes.$first())
            } else {
            synchpoint = (((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('SynchPoint')).$new(notes);
            (($a = [($d = ($e = (((($f = note['$[]']("startSlur")) !== false && $f !== nil) ? $f : []))).$map, $d.$$p = (TMP_45 = function(s){var self = TMP_45.$$s || this;
if (s == null) s = nil;
            return self.$Native(s)['$[]']("label")}, TMP_45.$$s = self, TMP_45), $d).call($e)]), $c = synchpoint, $c['$slur_starts='].apply($c, $a), $a[$a.length-1]);
            (($a = [((($d = note['$[]']("endSlur")) !== false && $d !== nil) ? $d : [])]), $c = synchpoint, $c['$slur_ends='].apply($c, $a), $a[$a.length-1]);
            (($a = [((($d = (note['$[]']("startTie")['$nil?']()['$!']())) !== false && $d !== nil) ? $d : (($f = ($g = notes).$select, $f.$$p = (TMP_46 = function(n){var self = TMP_46.$$s || this;
if (n == null) n = nil;
            return n['$tie_start?']()}, TMP_46.$$s = self, TMP_46), $f).call($g)['$empty?']()['$!']()))]), $c = synchpoint, $c['$tie_start='].apply($c, $a), $a[$a.length-1]);
            (($a = [((($d = (note['$[]']("endTie")['$nil?']()['$!']())) !== false && $d !== nil) ? $d : (($f = ($h = notes).$select, $f.$$p = (TMP_47 = function(n){var self = TMP_47.$$s || this;
if (n == null) n = nil;
            return n['$tie_end?']()}, TMP_47.$$s = self, TMP_47), $f).call($h)['$empty?']()['$!']()))]), $c = synchpoint, $c['$tie_end='].apply($c, $a), $a[$a.length-1]);
            result['$<<'](synchpoint);
          };
          ($a = ($c = self.previous_new_part).$each, $a.$$p = (TMP_48 = function(part){var self = TMP_48.$$s || this, $a, $b;
if (part == null) part = nil;
          (($a = [true]), $b = result.$last(), $b['$first_in_part='].apply($b, $a), $a[$a.length-1]);
            return (($a = [notes.$first()]), $b = part, $b['$companion='].apply($b, $a), $a[$a.length-1]);}, TMP_48.$$s = self, TMP_48), $a).call($c);
          self.previous_new_part.$clear();
          self.previous_note = result.$last();
          if ((($a = self.next_note_marks['$[]']("measure")) !== nil && (!$a.$$is_boolean || $a == true))) {
            ($a = ($d = notes).$each, $a.$$p = (TMP_49 = function(note){var self = TMP_49.$$s || this;
if (note == null) note = nil;
            return result['$<<']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('MeasureStart')).$new(note))}, TMP_49.$$s = self, TMP_49), $a).call($d);
            self.next_note_marks['$[]=']("measure", false);};
          if ((($a = self.next_note_marks['$[]']("repeat_start")) !== nil && (!$a.$$is_boolean || $a == true))) {
            self.repetition_stack['$<<'](notes.$first());
            self.next_note_marks['$[]=']("repeat_start", false);};
          if ((($a = self.next_note_marks['$[]']("variant_ending")) !== nil && (!$a.$$is_boolean || $a == true))) {
            result['$<<']((((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('NoteBoundAnnotation')).$new(self.previous_note, $hash2(["pos", "text"], {"pos": [4, -2], "text": self.next_note_marks['$[]']("variant_ending")})));
            self.next_note_marks['$[]=']("variant_ending", nil);};
          return result;
        };

        def.$transform_bar = function(bar) {
          var self = this, type = nil;

          type = bar['$[]']("type");
          self.next_note_marks['$[]=']("measure", true);
          self.next_note_marks['$[]=']("variant_ending", self.$_extract_variant_ending(bar));
          self.pitch_transformer.$reset_measure_accidentals();
          return self.$send("transform_" + (type.$gsub(" ", "_")), bar);
        };

        def.$transform_bar_invisible = function(bar) {
          var self = this;

          self.next_note_marks['$[]=']("measure", false);
          return nil;
        };

        def.$transform_bar_thin = function(bar) {
          var self = this;

          return nil;
        };

        def.$transform_bar_left_repeat = function(bar) {
          var self = this;

          self.next_note_marks['$[]=']("repeat_start", true);
          return nil;
        };

        def.$transform_bar_thin_thick = function(bar) {
          var self = this;

          return nil;
        };

        def.$transform_bar_right_repeat = function(bar) {
          var $a, $b, TMP_50, self = this, start = nil, distance = nil;

          if (self.repetition_stack.$length()['$=='](1)) {
            start = self.repetition_stack.$last()
            } else {
            start = self.repetition_stack.$pop()
          };
          distance = 2;
          ($a = ($b = self.$_extract_chord_lines(bar)).$each, $a.$$p = (TMP_50 = function(line){var self = TMP_50.$$s || this, $a, level = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (line == null) line = nil;
          level = line.$split("@");
            if ((($a = level['$[]'](2)) !== nil && (!$a.$$is_boolean || $a == true))) {
              level = level['$[]'](2);
              $gvars.log.$debug("bar repeat level " + (level) + " " + ("abc_to_harpnotes") + ":" + (735));
              if ((($a = level['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
                return nil
                } else {
                return distance = level.$to_i()
              };
              } else {
              return nil
            };}, TMP_50.$$s = self, TMP_50), $a).call($b);
          return [(((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('Goto')).$new(self.previous_note, start, $hash2(["distance"], {"distance": distance}))];
        };

        def.$transform_part = function(part) {
          var $a, $b, self = this, new_part = nil;

          new_part = (((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('NewPart')).$new(part['$[]']("title"));
          (($a = [part]), $b = new_part, $b['$origin='].apply($b, $a), $a[$a.length-1]);
          self.previous_new_part['$<<'](new_part);
          return [new_part];
        };

        return (def.$method_missing = function(name, args) {
          var self = this;
          if ($gvars.log == null) $gvars.log = nil;

          args = $slice.call(arguments, 1);
          $gvars.log.$debug("Missing transformation rule: " + (name) + " (" + ("abc_to_harpnotes") + " " + (751) + ")");
          return nil;
        }, nil) && 'method_missing';
      })(self, null);
    })(self)
  })(self);
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal-raphael"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $hash2 = Opal.hash2;

  Opal.add_stubs(['$attr_accessor', '$[]=', '$Native', '$new', '$line_width=', '$path']);
  return (function($base) {
    var self = $module($base, 'Raphael');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $Element(){};
      var self = $Element = $klass($base, $super, 'Element', $Element);

      var def = self.$$proto, $scope = self.$$scope, TMP_1;

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

      def['$line_width='] = function(width) {
        var self = this;

        return self['$[]=']("stroke-width", width);
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
        var self = this, $iter = TMP_1.$$p, block = $iter || nil;

        TMP_1.$$p = null;
        
        var wrapper = function(evt) {
          return block.apply(null, arguments);
        };
        self.r.click(wrapper);
      
      }, nil) && 'on_click';
    })(self, null);

    (function($base, $super) {
      function $Paper(){};
      var self = $Paper = $klass($base, $super, 'Paper', $Paper);

      var def = self.$$proto, $scope = self.$$scope;

      def.r = def.line_width = nil;
      def.$initialize = function(element, width, height) {
        var self = this;

        self.r = Raphael(element, width, height);
        return self.line_width = 0.2;
      };

      def.$raw = function() {
        var self = this;

        return self.r;
      };

      def['$line_width='] = function(width) {
        var self = this;

        return self.line_width = width;
      };

      def.$clear = function() {
        var self = this;

        return self.r.clear();
      };

      def.$ellipse = function(x, y, rx, ry) {
        var $a, $b, self = this, result = nil;

        result = (($scope.get('Raphael')).$$scope.get('Element')).$new(self.r.ellipse(x, y, rx, ry));
        (($a = [self.line_width]), $b = result, $b['$line_width='].apply($b, $a), $a[$a.length-1]);
        return result;
      };

      def.$path = function(spec) {
        var $a, $b, self = this, result = nil;

        result = (($scope.get('Raphael')).$$scope.get('Element')).$new(self.r.path(spec));
        (($a = [self.line_width]), $b = result, $b['$line_width='].apply($b, $a), $a[$a.length-1]);
        return result;
      };

      def.$rect = function(x, y, rx, ry, radius) {
        var $a, $b, self = this, result = nil;

        if (radius == null) {
          radius = 0
        }
        result = (($scope.get('Raphael')).$$scope.get('Element')).$new(self.r.rect(x, y, rx, ry, radius));
        (($a = [self.line_width]), $b = result, $b['$line_width='].apply($b, $a), $a[$a.length-1]);
        return result;
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
        var self = this;

        if (attributes == null) {
          attributes = $hash2([], {})
        }
        return (($scope.get('Raphael')).$$scope.get('Element')).$new(self.r.text(x, y, text));
      };

      def.$size = function() {
        var self = this;

        return [self.r.canvas.offsetWidth, self.r.canvas.offsetHeight];
      };

      return (def.$enable_pan_zoom = function() {
        var $a, self = this;

        if ((($a = self.r.panzoom != undefined) !== nil && (!$a.$$is_boolean || $a == true))) {
          return self.r.panzoom().enable();
          } else {
          return nil
        };
      }, nil) && 'enable_pan_zoom';
    })(self, null);
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal-jspdf"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass;

  Opal.add_stubs(['$require', '$attr_accessor', '$apply_offset_to_point', '$nil?', '$apply_offset_to_x', '$==', '$private', '$first', '$last']);
  self.$require("native");
  
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

    var def = self.$$proto, $scope = self.$$scope;

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

    def['$line_width='] = function(width) {
      var self = this;

      return self.native_jspdf.setLineWidth(width);
    };

    def['$line_dash='] = function(dist) {
      var $a, self = this;

      if (dist == null) {
        dist = 3
      }
      if ((($a = dist['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        dist = undefined};
      return self.native_jspdf.setLineDash(dist, dist);
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
      if ((($a = options['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        options = undefined};
      return self.native_jspdf.output(type, options);
    };

    def.$left_arrowhead = function(x, y) {
      var self = this, delta = nil, x0 = nil, x1 = nil, y_top = nil, y_bottom = nil;

      delta = 1.0;
      x0 = self.$apply_offset_to_x(x);
      x1 = self.$apply_offset_to_x($rb_plus(x, delta));
      y_top = $rb_plus(y, $rb_divide(delta, 2.0));
      y_bottom = $rb_minus(y, $rb_divide(delta, 2.0));
      return self.native_jspdf.triangle(x0, y, x1, y_top, x1, y_bottom, x0, y, 'FD');
    };

    def.$addPage = function() {
      var self = this;

      return self.native_jspdf.addPage();
    };

    self.$private();

    def.$apply_offset_to_point = function(point) {
      var self = this;

      return [$rb_plus(point.$first(), self.x_offset), point.$last()];
    };

    return (def.$apply_offset_to_x = function(x) {
      var self = this;

      return $rb_plus(x, self.x_offset);
    }, nil) && 'apply_offset_to_x';
  })(self, null);
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal-jszip"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass;

  Opal.add_stubs(['$new', '$to_blob']);
  return (function($base) {
    var self = $module($base, 'JSZip');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $ZipFile(){};
      var self = $ZipFile = $klass($base, $super, 'ZipFile', $ZipFile);

      var def = self.$$proto, $scope = self.$$scope;

      def.$initialize = function() {
        var self = this;

        return self.zip = new JSZip();
      };

      def.$folder = function(name) {
        var self = this;

        return $scope.get('Folder').$new(self.zip.folder(name));
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

      var def = self.$$proto, $scope = self.$$scope;

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
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal-abcjs"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $hash2 = Opal.hash2;

  Opal.add_stubs(['$Native', '$find', '$css', '$[]', '$remove', '$new', '$raw', '$to_n']);
  return (function($base) {
    var self = $module($base, 'ABCJS');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base) {
      var self = $module($base, 'Write');

      var def = self.$$proto, $scope = self.$$scope;

      (function($base, $super) {
        function $Printer(){};
        var self = $Printer = $klass($base, $super, 'Printer', $Printer);

        var def = self.$$proto, $scope = self.$$scope, TMP_1;

        def.parent = nil;
        def.$initialize = function(div, printerparams) {
          var self = this, paper = nil, pp = nil;

          if (printerparams == null) {
            printerparams = $hash2([], {})
          }
          self.parent = self.$Native($scope.get('Element').$find("#" + (div)));
          self.parent.$css("width", $rb_plus(printerparams['$[]']("staffwidth"), 50));
          self.parent.$find("svg").$remove();
          paper = (($scope.get('Raphael')).$$scope.get('Paper')).$new(div, printerparams['$[]']("staffwidth"), 900);
          self.paper = paper.$raw();
          pp = printerparams.$to_n();
          return self.printer = new ABCJS.write.Printer(self.paper, pp);
        };

        def.$on_select = TMP_1 = function() {
          var self = this, $iter = TMP_1.$$p, block = $iter || nil;

          TMP_1.$$p = null;
          
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
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal-musicaljs"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass;

  return (function($base) {
    var self = $module($base, 'Musicaljs');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $Instrument(){};
      var self = $Instrument = $klass($base, $super, 'Instrument', $Instrument);

      var def = self.$$proto, $scope = self.$$scope;

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
};

/* Generated by Opal 0.8.0 */
Opal.modules["raphael_engine"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $hash2 = Opal.hash2, $gvars = Opal.gvars, $range = Opal.range;

  Opal.add_stubs(['$require', '$include', '$attr_reader', '$new', '$set_view_box', '$clear', '$rect', '$each', '$line_width=', '$line_width', '$is_a?', '$visible?', '$draw_ellipse', '$draw_flowline', '$draw_glyph', '$draw_annotation', '$draw_path', '$debug', '$class', '$children', '$unhighlight_element', '$highlight_element', '$get_elements_by_range', '$private', '$inject', '$first', '$join', '$[]', '$sort', '$each_key', '$Native', '$origin', '$nil?', '$map', '$last', '$push', '$unhighlight_color=', '$[]=', '$include?', '$unhighlight_color', '$<<', '$ellipse', '$center', '$size', '$push_element', '$==', '$fill', '$dotted?', '$on_click', '$call', '$path_to_raphael', '$glyph', '$transform', '$path', '$get_bbox', '$-@', '$line', '$from', '$to', '$style', '$distance', '$level', '$translate', '$get', '$gsub', '$text', '$filled?']);
  self.$require("opal-raphael");
  self.$require("harpnotes");
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $RaphaelEngine(){};
      var self = $RaphaelEngine = $klass($base, $super, 'RaphaelEngine', $RaphaelEngine);

      var def = self.$$proto, $scope = self.$$scope, TMP_2;

      def.paper = def.highlighted = def.elements = def.x = def.container_id = nil;
      self.$include((($scope.get('Harpnotes')).$$scope.get('Drawing')));

      self.$attr_reader("paper");

      Opal.cdecl($scope, 'PADDING', 5);

      Opal.cdecl($scope, 'ARROW_SIZE', 1.0);

      Opal.cdecl($scope, 'JUMPLINE_INDENT', 10);

      Opal.cdecl($scope, 'DOTTED_SIZE', 0.3);

      def.$initialize = function(element_id, width, height) {
        var self = this;

        self.container_id = element_id;
        self.paper = (($scope.get('Raphael')).$$scope.get('Paper')).$new(element_id, width, height);
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
        return ($a = ($b = sheet.$children()).$each, $a.$$p = (TMP_1 = function(child){var self = TMP_1.$$s || this, $a, $b;
          if (self.paper == null) self.paper = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (child == null) child = nil;
        (($a = [child.$line_width()]), $b = self.paper, $b['$line_width='].apply($b, $a), $a[$a.length-1]);
          if ((($a = child['$is_a?']($scope.get('Ellipse'))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_ellipse(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']($scope.get('FlowLine'))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_flowline(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Glyph')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_glyph(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_annotation(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Path')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_path(child)
              } else {
              return nil
            }
            } else {
            $gvars.log.$debug("BUG:don't know how to draw " + (child.$class()) + " (" + ("raphael_engine") + " " + (49) + ")");
            return nil;
          };}, TMP_1.$$s = self, TMP_1), $a).call($b);
      };

      def.$on_select = TMP_2 = function() {
        var self = this, $iter = TMP_2.$$p, block = $iter || nil;

        TMP_2.$$p = null;
        return self.on_select = block;
      };

      def.$unhighlight_all = function() {
        var $a, $b, TMP_3, self = this;

        return ($a = ($b = self.highlighted).$each, $a.$$p = (TMP_3 = function(e){var self = TMP_3.$$s || this;
if (e == null) e = nil;
        return self.$unhighlight_element(e)}, TMP_3.$$s = self, TMP_3), $a).call($b);
      };

      def.$range_highlight = function(from, to) {
        var $a, $b, TMP_4, self = this;

        return ($a = ($b = self.$get_elements_by_range(from, to)).$each, $a.$$p = (TMP_4 = function(element){var self = TMP_4.$$s || this;
if (element == null) element = nil;
        return self.$highlight_element(element)}, TMP_4.$$s = self, TMP_4), $a).call($b);
      };

      def.$range_unhighlight = function(from, to) {
        var $a, $b, TMP_5, self = this;

        return ($a = ($b = self.$get_elements_by_range(from, to)).$each, $a.$$p = (TMP_5 = function(element){var self = TMP_5.$$s || this;
if (element == null) element = nil;
        return self.$unhighlight_element(element)}, TMP_5.$$s = self, TMP_5), $a).call($b);
      };

      self.$private();

      def.$path_to_raphael = function(path) {
        var $a, $b, TMP_6, self = this, result = nil;

        result = ($a = ($b = path).$inject, $a.$$p = (TMP_6 = function(result, element){var self = TMP_6.$$s || this;
if (result == null) result = nil;if (element == null) element = nil;
        result = $rb_plus(result, element.$first());
          return result = $rb_plus(result, element['$[]']($range(1, -1, false)).$join(" "));}, TMP_6.$$s = self, TMP_6), $a).call($b, "");
        return result;
      };

      def.$get_elements_by_range = function(from, to) {
        var $a, $b, TMP_7, self = this, result = nil, range = nil;

        result = [];
        range = [from, to].$sort();
        ($a = ($b = self.elements).$each_key, $a.$$p = (TMP_7 = function(k){var self = TMP_7.$$s || this, $a, $b, TMP_8, $c, TMP_9, origin = nil, noterange = nil;
          if (self.elements == null) self.elements = nil;
if (k == null) k = nil;
        origin = self.$Native(k.$origin());
          if ((($a = origin['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return nil
            } else {
            noterange = ($a = ($b = ["startChar", "endChar"]).$map, $a.$$p = (TMP_8 = function(c){var self = TMP_8.$$s || this;
if (c == null) c = nil;
            return self.$Native(k.$origin())['$[]'](c)}, TMP_8.$$s = self, TMP_8), $a).call($b).$sort();
            if ($rb_gt($rb_times(($rb_minus(range.$first(), noterange.$last())), ($rb_minus(noterange.$first(), range.$last()))), 0)) {
              return ($a = ($c = self.elements['$[]'](k)).$each, $a.$$p = (TMP_9 = function(e){var self = TMP_9.$$s || this;
if (e == null) e = nil;
              return result.$push(e)}, TMP_9.$$s = self, TMP_9), $a).call($c)
              } else {
              return nil
            };
          };}, TMP_7.$$s = self, TMP_7), $a).call($b);
        return result;
      };

      def.$highlight_element = function(element) {
        var $a, $b, self = this;

        self.$unhighlight_element(element);
        self.highlighted.$push(element);
        if ((($a = self.x) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          self.x = 0
        };
        
            var node = element.r;
            var bbox = node.getBBox();
            var top = bbox.y + bbox.y2;
            top = 100 * Math.floor(top/100);
            $("#"+self.container_id).get(0).scrollTop=top;
      ;
        (($a = [element['$[]']("fill")]), $b = element, $b['$unhighlight_color='].apply($b, $a), $a[$a.length-1]);
        element['$[]=']("fill", "#ff0000");
        element['$[]=']("stroke", "#ff0000");
        return nil;
      };

      def.$unhighlight_element = function(element) {
        var $a, self = this;

        if ((($a = self.highlighted['$include?'](element)) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.highlighted = $rb_minus(self.highlighted, [element]);
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
        var $a, $b, TMP_10, $c, TMP_11, self = this, e = nil, x = nil, y = nil, e_dot = nil;

        e = self.paper.$ellipse(root.$center().$first(), root.$center().$last(), root.$size().$first(), root.$size().$last());
        self.$push_element(root.$origin(), e);
        e['$[]=']("fill", (function() {if (root.$fill()['$==']("filled")) {
          return "black"
          } else {
          return "white"
        }; return nil; })());
        if ((($a = root['$dotted?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          x = $rb_plus(root.$center().$first(), ($rb_times(root.$size().$first(), 1.2)));
          y = $rb_plus(root.$center().$last(), ($rb_times(root.$size().$last(), 1.2)));
          e_dot = self.paper.$ellipse(x, y, $scope.get('DOTTED_SIZE'), $scope.get('DOTTED_SIZE'));
          e_dot['$[]=']("fill", "black");
          self.$push_element(root.$origin(), e_dot);
          ($a = ($b = e_dot).$on_click, $a.$$p = (TMP_10 = function(){var self = TMP_10.$$s || this, $a, $b, origin = nil;
            if (self.on_select == null) self.on_select = nil;

          origin = root.$origin();
            if ((($a = ((($b = origin['$nil?']()) !== false && $b !== nil) ? $b : self.on_select['$nil?']())) !== nil && (!$a.$$is_boolean || $a == true))) {
              return nil
              } else {
              return self.on_select.$call(origin)
            };}, TMP_10.$$s = self, TMP_10), $a).call($b);};
        return ($a = ($c = e).$on_click, $a.$$p = (TMP_11 = function(){var self = TMP_11.$$s || this, $a, $b, origin = nil;
          if (self.on_select == null) self.on_select = nil;

        origin = root.$origin();
          if ((($a = ((($b = origin['$nil?']()) !== false && $b !== nil) ? $b : self.on_select['$nil?']())) !== nil && (!$a.$$is_boolean || $a == true))) {
            return nil
            } else {
            return self.on_select.$call(origin)
          };}, TMP_11.$$s = self, TMP_11), $a).call($c);
      };

      def.$draw_glyph = function(root) {
        var $a, $b, TMP_13, $c, TMP_14, self = this, center = nil, size = nil, path_spec = nil, e = nil, bbox = nil, glyph_center = nil, scalefactor = nil, x = nil, y = nil, e_dot = nil;

        def.$glyph_to_path_spec = function(glyph) {
          var $a, $b, TMP_12, self = this, result = nil;

          result = "";
          ($a = ($b = glyph['$[]']("d")).$each, $a.$$p = (TMP_12 = function(part){var self = TMP_12.$$s || this;
if (part == null) part = nil;
          result = $rb_plus(result, part.$first());
            return result = $rb_plus(result, part['$[]']($range(1, -1, false)).$join(" "));}, TMP_12.$$s = self, TMP_12), $a).call($b);
          return result;
        };
        center = [root.$center().$first(), root.$center().$last()];
        size = [root.$size().$first(), root.$size().$last()];
        path_spec = self.$path_to_raphael(root.$glyph()['$[]']("d"));
        e = self.paper.$rect(root.$center().$first(), $rb_minus(root.$center().$last(), size.$last()), size.$first(), size.$last());
        e['$[]=']("fill", "white");
        e['$[]=']("stroke", "white");
        e.$transform("t-" + ($rb_divide(size.$first(), 2)) + " " + ($rb_divide(size.$last(), 2)));
        e = self.paper.$path(path_spec);
        e['$[]=']("fill", "black");
        self.$push_element(root.$origin(), e);
        ($a = ($b = e).$on_click, $a.$$p = (TMP_13 = function(){var self = TMP_13.$$s || this, $a, $b, origin = nil;
          if (self.on_select == null) self.on_select = nil;

        origin = root.$origin();
          if ((($a = ((($b = origin['$nil?']()) !== false && $b !== nil) ? $b : self.on_select['$nil?']())) !== nil && (!$a.$$is_boolean || $a == true))) {
            return nil
            } else {
            return self.on_select.$call(origin)
          };}, TMP_13.$$s = self, TMP_13), $a).call($b);
        bbox = e.$get_bbox();
        glyph_center = [$rb_divide(($rb_plus(bbox['$[]']("x"), bbox['$[]']("x2"))), 2), $rb_divide(($rb_plus(bbox['$[]']("y"), bbox['$[]']("y2"))), 2)];
        scalefactor = $rb_divide(size.$last(), bbox['$[]']("height"));
        e.$transform("t" + ((center.$first())) + " " + ((center.$last())) + "t" + ((glyph_center.$first()['$-@']())) + " " + ((glyph_center.$last()['$-@']())) + "s" + (scalefactor));
        if ((($a = root['$dotted?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          bbox = e.$get_bbox();
          x = $rb_plus(bbox['$[]']("x2"), 0.5);
          y = $rb_plus(bbox['$[]']("y2"), 0.5);
          e_dot = self.paper.$ellipse(x, y, $scope.get('DOTTED_SIZE'), $scope.get('DOTTED_SIZE'));
          e_dot['$[]=']("fill", "black");
          self.$push_element(root.$origin(), e_dot);
          return ($a = ($c = e_dot).$on_click, $a.$$p = (TMP_14 = function(){var self = TMP_14.$$s || this, $a, $b, origin = nil;
            if (self.on_select == null) self.on_select = nil;

          origin = root.$origin();
            if ((($a = ((($b = origin['$nil?']()) !== false && $b !== nil) ? $b : self.on_select['$nil?']())) !== nil && (!$a.$$is_boolean || $a == true))) {
              return nil
              } else {
              return self.on_select.$call(origin)
            };}, TMP_14.$$s = self, TMP_14), $a).call($c);
          } else {
          return nil
        };
      };

      def.$draw_flowline = function(root) {
        var self = this, l = nil;

        l = self.paper.$line(root.$from().$center()['$[]'](0), root.$from().$center()['$[]'](1), root.$to().$center()['$[]'](0), root.$to().$center()['$[]'](1));
        if (root.$style()['$==']("dashed")) {
          l['$[]=']("stroke-dasharray", "-")};
        if (root.$style()['$==']("dotted")) {
          return l['$[]=']("stroke-dasharray", ". ")
          } else {
          return nil
        };
      };

      def.$draw_jumpline = function(root) {
        var $a, $b, self = this, startpoint = nil, endpoint = nil, distance = nil, depth = nil, path = nil, arrow = nil;

        startpoint = root.$from().$center();
        ($a = 0, $b = startpoint, $b['$[]=']($a, $rb_plus($b['$[]']($a), $scope.get('PADDING'))));
        endpoint = root.$to().$center();
        ($a = 0, $b = endpoint, $b['$[]=']($a, $rb_plus($b['$[]']($a), $scope.get('PADDING'))));
        distance = root.$distance();
        if ((($a = distance['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          depth = $rb_minus(420, ($rb_times(root.$level(), $scope.get('JUMPLINE_INDENT'))))
          } else {
          depth = $rb_plus(endpoint['$[]'](0), distance)
        };
        path = "M" + (endpoint['$[]'](0)) + "," + (endpoint['$[]'](1)) + "L" + (depth) + "," + (endpoint['$[]'](1)) + "L" + (depth) + "," + (startpoint['$[]'](1)) + "L" + (startpoint['$[]'](0)) + "," + (startpoint['$[]'](1));
        self.paper.$path(path);
        arrow = self.paper.$path("M0,0L" + ($scope.get('ARROW_SIZE')) + "," + ($rb_times(-0.5, $scope.get('ARROW_SIZE'))) + "L" + ($scope.get('ARROW_SIZE')) + "," + ($rb_times(0.5, $scope.get('ARROW_SIZE'))) + "L0,0");
        arrow['$[]=']("fill", "red");
        return arrow.$translate(startpoint['$[]'](0), startpoint['$[]'](1));
      };

      def.$draw_annotation = function(root) {
        var $a, self = this, style = nil, mm_per_point = nil, text = nil, element = nil, scaley = nil, scalex = nil, bbox = nil, dx = nil, dy = nil, translation = nil;
        if ($gvars.conf == null) $gvars.conf = nil;
        if ($gvars.log == null) $gvars.log = nil;

        style = ((($a = $gvars.conf.$get("layout.FONT_STYLE_DEF")['$[]'](root.$style())) !== false && $a !== nil) ? $a : $gvars.conf.$get("layout.FONT_STYLE_DEF")['$[]']("regular"));
        mm_per_point = $gvars.conf.$get("layout.MM_PER_POINT");
        text = root.$text().$gsub("\n\n", "\n \n");
        element = self.paper.$text(root.$center().$first(), root.$center().$last(), text);
        element['$[]=']("font-size", 1);
        element['$[]=']("font-weight", style['$[]']("font_style"));
        element['$[]=']("text-anchor", "start");
        scaley = $rb_divide(style['$[]']("font_size"), 3);
        scalex = $rb_divide($rb_times(scaley, 45), 42.5);
        element.$transform("s" + (scalex) + "," + (scaley));
        bbox = element.$get_bbox();
        $gvars.log.$debug("" + (root.$center().$first()) + ", " + (root.$center().$last()) + " ”" + (text) + "” " + (bbox['$[]']("width")) + ", " + (bbox['$[]']("height")) + " (" + ("raphael_engine") + " " + (285) + ")");
        dx = $rb_minus(root.$center().$first(), bbox['$[]']("x"));
        dy = $rb_minus(root.$center().$last(), bbox['$[]']("y"));
        translation = "s" + (scalex) + "," + (scaley) + "T" + (dx) + "," + (dy);
        element.$transform(translation);
        return element;
      };

      return (def.$draw_path = function(root) {
        var $a, self = this, path_spec = nil, e = nil;

        path_spec = self.$path_to_raphael(root.$path());
        e = self.paper.$path(path_spec);
        if ((($a = root['$filled?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          return e['$[]=']("fill", "#000000")
          } else {
          return nil
        };
      }, nil) && 'draw_path';
    })(self, null)
  })(self);
};

/* Generated by Opal 0.8.0 */
Opal.modules["pdf_engine"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $range = Opal.range, $gvars = Opal.gvars, $hash2 = Opal.hash2;

  Opal.add_stubs(['$require', '$include', '$attr_reader', '$new', '$x_offset=', '$each', '$draw_segment', '$rect', '$draw_cutmarks', '$line_width=', '$line_width', '$is_a?', '$visible?', '$draw_ellipse', '$draw_flowline', '$draw_glyph', '$draw_path', '$draw_annotation', '$debug', '$class', '$children', '$private', '$[]', '$get', '$style', '$text_color=', '$font_size=', '$font_style=', '$text', '$first', '$center', '$last', '$Vector2d', '$line', '$to_a', '$-@', '$filled?', '$fill=', '$map', '$ellipse', '$size', '$dotted?', '$zip', '$stroke=', '$rect_like_ellipse', '$glyph', '$===', '$empty?', '$lines', '$push', '$error', '$addPage', '$draw', '$dashed?', '$line_dash=', '$from', '$to', '$use_solid_lines', '$clone', '$[]=', '$distance', '$nil?', '$level', '$left_arrowhead', '$path']);
  self.$require("opal-jspdf");
  self.$require("harpnotes");
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $PDFEngine(){};
      var self = $PDFEngine = $klass($base, $super, 'PDFEngine', $PDFEngine);

      var def = self.$$proto, $scope = self.$$scope;

      def.pdf = nil;
      self.$include((($scope.get('Harpnotes')).$$scope.get('Drawing')));

      self.$attr_reader("pdf");

      Opal.cdecl($scope, 'PADDING', 4.0);

      Opal.cdecl($scope, 'JUMPLINE_INDENT', 10.0);

      Opal.cdecl($scope, 'DOTTED_SIZE', 0.3);

      Opal.cdecl($scope, 'X_SPACING', $rb_divide(115.0, 10.0));

      def.$initialize = function() {
        var $a, $b, self = this;

        self.pdf = $scope.get('JsPDF').$new("l", "mm", "a3");
        return (($a = [0.0]), $b = self.pdf, $b['$x_offset='].apply($b, $a), $a[$a.length-1]);
      };

      def.$draw_in_segments = function(sheet) {
        var $a, $b, TMP_1, self = this, delta = nil, addpage = nil;

        delta = $rb_times(-12.0, $scope.get('X_SPACING'));
        self.pdf = $scope.get('JsPDF').$new("p", "mm", "a4");
        addpage = false;
        ($a = ($b = ($range(0, 2, false))).$each, $a.$$p = (TMP_1 = function(i){var self = TMP_1.$$s || this;
if (i == null) i = nil;
        self.$draw_segment($rb_plus(30, $rb_times(i, delta)), sheet, addpage);
          return addpage = true;}, TMP_1.$$s = self, TMP_1), $a).call($b);
        return self.pdf;
      };

      def.$draw = function(sheet) {
        var $a, $b, TMP_2, $c, TMP_4, self = this, delta = nil;

        self.pdf.$rect(1.0, 1.0, 418, 295);
        self.pdf.$rect(0.0, 0.0, 420.0, 297.0);
        delta = $rb_times(12.0, $scope.get('X_SPACING'));
        ($a = ($b = ($range(1, 2, false))).$each, $a.$$p = (TMP_2 = function(i){var self = TMP_2.$$s || this, $a, $b, TMP_3;
if (i == null) i = nil;
        return ($a = ($b = ["top", "bottom"]).$each, $a.$$p = (TMP_3 = function(border){var self = TMP_3.$$s || this;
if (border == null) border = nil;
          return self.$draw_cutmarks(i, delta, border)}, TMP_3.$$s = self, TMP_3), $a).call($b)}, TMP_2.$$s = self, TMP_2), $a).call($b);
        ($a = ($c = sheet.$children()).$each, $a.$$p = (TMP_4 = function(child){var self = TMP_4.$$s || this, $a, $b;
          if (self.pdf == null) self.pdf = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (child == null) child = nil;
        (($a = [child.$line_width()]), $b = self.pdf, $b['$line_width='].apply($b, $a), $a[$a.length-1]);
          if ((($a = child['$is_a?']($scope.get('Ellipse'))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_ellipse(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']($scope.get('FlowLine'))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_flowline(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Glyph')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_glyph(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Path')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_path(child)
              } else {
              return nil
            }
          } else if ((($a = child['$is_a?']((((($scope.get('Harpnotes')).$$scope.get('Drawing'))).$$scope.get('Annotation')))) !== nil && (!$a.$$is_boolean || $a == true))) {
            if ((($a = child['$visible?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return self.$draw_annotation(child)
              } else {
              return nil
            }
            } else {
            $gvars.log.$debug("don't know how to draw " + (child.$class()) + " (" + ("pdf_engine") + " " + (58) + ")");
            return nil;
          };}, TMP_4.$$s = self, TMP_4), $a).call($c);
        return self.pdf;
      };

      self.$private();

      def.$draw_annotation = function(root) {
        var $a, $b, self = this, style = nil, mm_per_point = nil;
        if ($gvars.conf == null) $gvars.conf = nil;

        style = ((($a = $gvars.conf.$get("layout.FONT_STYLE_DEF")['$[]'](root.$style())) !== false && $a !== nil) ? $a : $gvars.conf.$get("layout.FONT_STYLE_DEF")['$[]']("regular"));
        mm_per_point = $gvars.conf.$get("layout.MM_PER_POINT");
        (($a = [style['$[]']("text_color")]), $b = self.pdf, $b['$text_color='].apply($b, $a), $a[$a.length-1]);
        (($a = [style['$[]']("font_size")]), $b = self.pdf, $b['$font_size='].apply($b, $a), $a[$a.length-1]);
        (($a = [style['$[]']("font_style")]), $b = self.pdf, $b['$font_style='].apply($b, $a), $a[$a.length-1]);
        return self.pdf.$text(root.$center().$first(), $rb_plus(root.$center().$last(), $rb_times(style['$[]']("font_size"), mm_per_point)), root.$text());
      };

      def.$draw_cutmarks = function(i, delta, border) {
        var self = this, vertical_pos = nil, hpos = nil, hdiff = nil, center = nil, size = nil;

        vertical_pos = $hash2(["top", "bottom"], {"top": 7, "bottom": 290})['$[]'](border);
        hpos = $rb_plus($rb_plus($rb_divide($scope.get('X_SPACING'), 2.0), $rb_times(delta, i)), 3);
        hdiff = $rb_divide($scope.get('X_SPACING'), 2.0);
        center = self.$Vector2d($rb_plus($rb_divide($scope.get('X_SPACING'), 2.0), $rb_times(delta, i)), vertical_pos);
        size = 1;
        self.pdf.$line(($rb_plus(center, [size['$-@'](), size['$-@']()])).$to_a(), ($rb_plus(center, [size, size])).$to_a());
        return self.pdf.$line(($rb_plus(center, [size['$-@'](), size])).$to_a(), ($rb_plus(center, [size, size['$-@']()])).$to_a());
      };

      def.$draw_ellipse = function(root) {
        var $a, $b, $c, $d, TMP_5, $e, TMP_6, TMP_7, self = this, style = nil;

        style = (function() {if ((($a = root['$filled?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          return "F"
          } else {
          return "FD"
        }; return nil; })();
        (($a = [($c = ($d = ($range(0, 3, true))).$map, $c.$$p = (TMP_5 = function(){var self = TMP_5.$$s || this, $a;

        if ((($a = root['$filled?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return 0
            } else {
            return 255
          }}, TMP_5.$$s = self, TMP_5), $c).call($d)]), $b = self.pdf, $b['$fill='].apply($b, $a), $a[$a.length-1]);
        self.pdf.$ellipse(root.$center(), root.$size(), style);
        if ((($a = root['$dotted?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          (($a = [($c = ($e = ($range(0, 3, true))).$map, $c.$$p = (TMP_6 = function(){var self = TMP_6.$$s || this;

          return 0}, TMP_6.$$s = self, TMP_6), $c).call($e)]), $b = self.pdf, $b['$fill='].apply($b, $a), $a[$a.length-1]);
          return self.pdf.$ellipse(($a = ($b = root.$center().$zip(root.$size())).$map, $a.$$p = (TMP_7 = function(s){var self = TMP_7.$$s || this, $a, a = nil, b = nil;
if (s == null) s = nil;
          $a = Opal.to_ary(s), a = ($a[0] == null ? nil : $a[0]), b = ($a[1] == null ? nil : $a[1]);
            return $rb_plus(a, $rb_times(b, 1.5));}, TMP_7.$$s = self, TMP_7), $a).call($b), [$scope.get('DOTTED_SIZE'), $scope.get('DOTTED_SIZE')], "F");
          } else {
          return nil
        };
      };

      def.$draw_glyph = function(root) {
        var $a, $b, $c, $d, TMP_8, TMP_9, $e, $f, TMP_10, TMP_11, $g, $h, TMP_12, TMP_13, self = this, style = nil, center = nil, size = nil, scalefactor = nil, scale = nil, lines = nil, start = nil;

        style = root['$filled?']("FD", "FD");
        (($a = [($c = ($d = ($range(0, 3, true))).$map, $c.$$p = (TMP_8 = function(){var self = TMP_8.$$s || this, $a;

        if ((($a = root['$filled?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return 0
            } else {
            return 255
          }}, TMP_8.$$s = self, TMP_8), $c).call($d)]), $b = self.pdf, $b['$fill='].apply($b, $a), $a[$a.length-1]);
        center = [$rb_minus(root.$center().$first(), root.$size().$first()), $rb_minus(root.$center().$last(), root.$size().$last())];
        size = ($a = ($b = root.$size()).$map, $a.$$p = (TMP_9 = function(s){var self = TMP_9.$$s || this;
if (s == null) s = nil;
        return $rb_times(2.0, s)}, TMP_9.$$s = self, TMP_9), $a).call($b);
        (($a = [($e = ($f = ($range(0, 3, true))).$map, $e.$$p = (TMP_10 = function(){var self = TMP_10.$$s || this, $a;

        if ((($a = root['$filled?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return 0
            } else {
            return 255
          }}, TMP_10.$$s = self, TMP_10), $e).call($f)]), $c = self.pdf, $c['$fill='].apply($c, $a), $a[$a.length-1]);
        (($a = [[255, 255, 255]]), $c = self.pdf, $c['$fill='].apply($c, $a), $a[$a.length-1]);
        (($a = [[255, 255, 255]]), $c = self.pdf, $c['$stroke='].apply($c, $a), $a[$a.length-1]);
        self.pdf.$rect_like_ellipse(center, size, "FD");
        (($a = [[0, 0, 0]]), $c = self.pdf, $c['$fill='].apply($c, $a), $a[$a.length-1]);
        (($a = [[0, 0, 0]]), $c = self.pdf, $c['$stroke='].apply($c, $a), $a[$a.length-1]);
        scalefactor = $rb_divide(size.$last(), root.$glyph()['$[]']("h"));
        scale = [scalefactor, scalefactor];
        lines = [];
        start = [];
        ($a = ($c = root.$glyph()['$[]']("d")).$each, $a.$$p = (TMP_11 = function(element){var self = TMP_11.$$s || this, $a, $case = nil;
          if (self.pdf == null) self.pdf = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (element == null) element = nil;
        return (function() {$case = element.$first();if ("M"['$===']($case)) {if ((($a = lines['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            self.pdf.$lines(lines, start.$first(), start.$last(), scale, "FD", false)
          };
          lines = [];
          return start = [$rb_plus(center.$first(), $rb_times(($rb_plus(element['$[]'](1), $rb_divide(root.$glyph()['$[]']("w"), 2))), scale.$first())), $rb_minus(center.$last(), $rb_times(($rb_plus(element['$[]'](2), $rb_divide(root.$glyph()['$[]']("h"), 2))), scale.$last()))];}else if ("l"['$===']($case)) {return lines.$push(element['$[]']($range(1, -1, false)))}else if ("c"['$===']($case)) {return lines.$push(element['$[]']($range(1, -1, false)))}else if ("z"['$===']($case)) {if ((($a = lines['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            self.pdf.$lines(lines, start.$first(), start.$last(), scale, "FD", true)
          };
          return lines = [];}else {return $gvars.log.$error("BUG: unsupported command '" + (element.$first()) + "' in glyph (" + ("pdf_engine") + " " + (147) + ")")}})()}, TMP_11.$$s = self, TMP_11), $a).call($c);
        (($a = [[0, 0, 0]]), $e = self.pdf, $e['$stroke='].apply($e, $a), $a[$a.length-1]);
        if ((($a = root['$dotted?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          (($a = [($g = ($h = ($range(0, 3, true))).$map, $g.$$p = (TMP_12 = function(){var self = TMP_12.$$s || this;

          return 0}, TMP_12.$$s = self, TMP_12), $g).call($h)]), $e = self.pdf, $e['$fill='].apply($e, $a), $a[$a.length-1]);
          return self.pdf.$ellipse(($a = ($e = root.$center().$zip(root.$size())).$map, $a.$$p = (TMP_13 = function(s){var self = TMP_13.$$s || this, $a, a = nil, b = nil;
if (s == null) s = nil;
          $a = Opal.to_ary(s), a = ($a[0] == null ? nil : $a[0]), b = ($a[1] == null ? nil : $a[1]);
            return $rb_plus(a, $rb_times(b, 1.5));}, TMP_13.$$s = self, TMP_13), $a).call($e), [$scope.get('DOTTED_SIZE'), $scope.get('DOTTED_SIZE')], "F");
          } else {
          return nil
        };
      };

      def.$draw_segment = function(x_offset, sheet, newpage) {
        var $a, $b, self = this;

        if (newpage == null) {
          newpage = false
        }
        (($a = [x_offset]), $b = self.pdf, $b['$x_offset='].apply($b, $a), $a[$a.length-1]);
        if (newpage !== false && newpage !== nil) {
          self.pdf.$addPage()};
        return self.$draw(sheet);
      };

      def.$draw_flowline = function(root) {
        var $a, $b, self = this;

        if ((($a = root['$dashed?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          (($a = [3]), $b = self.pdf, $b['$line_dash='].apply($b, $a), $a[$a.length-1])};
        if ((($a = root['$dotted?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          (($a = [6]), $b = self.pdf, $b['$line_dash='].apply($b, $a), $a[$a.length-1])};
        self.pdf.$line(root.$from().$center(), root.$to().$center());
        return self.pdf.$use_solid_lines();
      };

      def.$draw_jumpline = function(root) {
        var $a, $b, $c, $d, TMP_14, self = this, startpoint = nil, endpoint = nil, distance = nil, depth = nil;

        startpoint = root.$from().$center().$clone();
        ($a = 0, $b = startpoint, $b['$[]=']($a, $rb_plus($b['$[]']($a), $scope.get('PADDING'))));
        ($a = 1, $b = startpoint, $b['$[]=']($a, $rb_minus($b['$[]']($a), $rb_divide($scope.get('PADDING'), 4.0))));
        endpoint = root.$to().$center().$clone();
        ($a = 0, $b = endpoint, $b['$[]=']($a, $rb_plus($b['$[]']($a), $scope.get('PADDING'))));
        ($a = 1, $b = endpoint, $b['$[]=']($a, $rb_plus($b['$[]']($a), $rb_divide($scope.get('PADDING'), 4.0))));
        distance = root.$distance();
        if ((($a = distance['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          depth = $rb_minus(418.0, ($rb_times(root.$level(), $scope.get('JUMPLINE_INDENT'))))
          } else {
          depth = $rb_plus(endpoint['$[]'](0), distance)
        };
        (($a = [($c = ($d = ($range(0, 3, true))).$map, $c.$$p = (TMP_14 = function(){var self = TMP_14.$$s || this;

        return 0}, TMP_14.$$s = self, TMP_14), $c).call($d)]), $b = self.pdf, $b['$stroke='].apply($b, $a), $a[$a.length-1]);
        self.pdf.$line(endpoint, [depth, endpoint['$[]'](1)]);
        self.pdf.$line([depth, endpoint['$[]'](1)], [depth, startpoint['$[]'](1)]);
        self.pdf.$line([depth, startpoint['$[]'](1)], startpoint);
        return self.pdf.$left_arrowhead(startpoint['$[]'](0), startpoint['$[]'](1));
      };

      return (def.$draw_path = function(root) {
        var $a, $b, $c, $d, TMP_15, TMP_16, self = this, lines = nil, scale = nil, start = nil, style = nil;

        lines = [];
        scale = [1, 1];
        start = [];
        style = (function() {if ((($a = root['$filled?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          return "FD"
          } else {
          return ""
        }; return nil; })();
        (($a = [($c = ($d = ($range(1, 3, false))).$map, $c.$$p = (TMP_15 = function(){var self = TMP_15.$$s || this, $a;

        if ((($a = root['$filled?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return 0
            } else {
            return 255
          }}, TMP_15.$$s = self, TMP_15), $c).call($d)]), $b = self.pdf, $b['$fill='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = root.$path()).$each, $a.$$p = (TMP_16 = function(element){var self = TMP_16.$$s || this, $a, $case = nil;
          if (self.pdf == null) self.pdf = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (element == null) element = nil;
        return (function() {$case = element.$first();if ("M"['$===']($case)) {if ((($a = lines['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            self.pdf.$lines(lines, start.$first(), start.$last(), scale, style, false)
          };
          lines = [];
          return start = element['$[]']($range(1, 2, false));}else if ("L"['$===']($case)) {if ((($a = lines['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            self.pdf.$lines(lines, start.$first(), start.$last(), scale, style, false)
          };
          lines = [];
          return start = element['$[]']($range(1, 2, false));}else if ("l"['$===']($case)) {return lines.$push(element['$[]']($range(1, -1, false)))}else if ("c"['$===']($case)) {return lines.$push(element['$[]']($range(1, -1, false)))}else if ("z"['$===']($case)) {if ((($a = lines['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            self.pdf.$lines(lines, start.$first(), start.$last(), scale, "FD", true)
          };
          return lines = [];}else {return $gvars.log.$error("BUG: unsupported command '" + (element.$first()) + "' in glyph (" + ("pdf_engine") + " " + (242) + ")")}})()}, TMP_16.$$s = self, TMP_16), $a).call($b);
        if ((($a = lines['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          return nil
          } else {
          return self.pdf.$lines(lines, start.$first(), start.$last(), scale, style, false)
        };
      }, nil) && 'draw_path';
    })(self, null)
  })(self);
};

/* Generated by Opal 0.8.0 */
Opal.modules["command-controller"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $hash2 = Opal.hash2, $range = Opal.range;

  Opal.add_stubs(['$attr_reader', '$call', '$lambda', '$raise', '$new', '$set_help', '$set_default', '$push', '$!', '$start_with?', '$to_s', '$each', '$[]=', '$name', '$[]', '$get_default', '$get_help', '$empty?', '$get_clean_argument_values', '$perform', '$undoable?', '$clear', '$can_undo?', '$pop', '$invert', '$can_redo?', '$map', '$first', '$select', '$nil?', '$scan', '$parse_string', '$gsub', '$to_sym', '$each_with_index', '$parameter_name', '$clone', '$unshift', '$join', '$parameters', '$is_public?', '$last', '$to_a']);
  return (function($base) {
    var self = $module($base, 'CommandController');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $Parameter(){};
      var self = $Parameter = $klass($base, $super, 'Parameter', $Parameter);

      var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_2;

      def.default_action = def.name = def.help_action = nil;
      self.$attr_reader("name");

      def.$initialize = function(name, type) {
        var self = this;

        self.name = name;
        return self.type = type;
      };

      def.$set_help = TMP_1 = function() {
        var self = this, $iter = TMP_1.$$p, block = $iter || nil;

        TMP_1.$$p = null;
        return self.help_action = block;
      };

      def.$set_default = TMP_2 = function() {
        var self = this, $iter = TMP_2.$$p, block = $iter || nil;

        TMP_2.$$p = null;
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

      var def = self.$$proto, $scope = self.$$scope, TMP_6, TMP_9, TMP_10, TMP_11;

      def.parameters = def.name = def.action = def.inverse_action = def.help_action = def.undoable = nil;
      self.$attr_reader("name", "parameters");

      def.$initialize = function(name) {
        var $a, $b, TMP_3, $c, TMP_4, $d, TMP_5, self = this;

        self.name = name;
        self.help_action = ($a = ($b = self).$lambda, $a.$$p = (TMP_3 = function(){var self = TMP_3.$$s || this;

        return "no help defined for " + (name)}, TMP_3.$$s = self, TMP_3), $a).call($b);
        self.parameters = [];
        self.action = ($a = ($c = self).$lambda, $a.$$p = (TMP_4 = function(p){var self = TMP_4.$$s || this;
if (p == null) p = nil;
        return self.$raise("No action defined for " + (name))}, TMP_4.$$s = self, TMP_4), $a).call($c);
        self.inverse_action = ($a = ($d = self).$lambda, $a.$$p = (TMP_5 = function(p){var self = TMP_5.$$s || this;
if (p == null) p = nil;
        return self.$raise("No  undo defined fore " + (name))}, TMP_5.$$s = self, TMP_5), $a).call($d);
        return self.undoable = true;
      };

      def.$add_parameter = TMP_6 = function(name, type, help, default$) {
        var $a, $b, TMP_7, $c, TMP_8, self = this, $iter = TMP_6.$$p, block = $iter || nil, parameter = nil;

        if (help == null) {
          help = nil
        }
        if (default$ == null) {
          default$ = nil
        }
        TMP_6.$$p = null;
        parameter = $scope.get('Parameter').$new(name, type);
        ($a = ($b = parameter).$set_help, $a.$$p = (TMP_7 = function(){var self = TMP_7.$$s || this;

        return help}, TMP_7.$$s = self, TMP_7), $a).call($b);
        ($a = ($c = parameter).$set_default, $a.$$p = (TMP_8 = function(){var self = TMP_8.$$s || this;

        return default$}, TMP_8.$$s = self, TMP_8), $a).call($c);
        if ((block !== nil)) {
          block.$call(parameter)};
        return self.parameters.$push(parameter);
      };

      def.$as_action = TMP_9 = function() {
        var self = this, $iter = TMP_9.$$p, block = $iter || nil;

        TMP_9.$$p = null;
        return self.action = block;
      };

      def.$as_inverse = TMP_10 = function() {
        var self = this, $iter = TMP_10.$$p, block = $iter || nil;

        TMP_10.$$p = null;
        return self.inverse_action = block;
      };

      def['$is_public?'] = function() {
        var self = this;

        return (self.name.$to_s()['$start_with?']("_"))['$!']();
      };

      def.$set_help = TMP_11 = function() {
        var self = this, $iter = TMP_11.$$p, block = $iter || nil;

        TMP_11.$$p = null;
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
        ($a = ($b = self.parameters).$each, $a.$$p = (TMP_12 = function(p){var self = TMP_12.$$s || this, $a;
if (p == null) p = nil;
        return result['$[]='](p.$name(), ((($a = arguments$['$[]'](p.$name())) !== false && $a !== nil) ? $a : p.$get_default()))}, TMP_12.$$s = self, TMP_12), $a).call($b);
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

      var def = self.$$proto, $scope = self.$$scope, TMP_13;

      def.commands = def.undo_stack = def.redo_stack = def.history_stack = nil;
      def.$initialize = function() {
        var self = this;

        self.commands = $hash2([], {});
        self.undo_stack = [];
        self.redo_stack = [];
        return self.history_stack = [];
      };

      def.$add_command = TMP_13 = function(name) {
        var self = this, $iter = TMP_13.$$p, block = $iter || nil, command = nil;

        TMP_13.$$p = null;
        command = $scope.get('Command').$new(name);
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
        if ((($a = command['$undoable?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          self.undo_stack.$push([command, the_arguments]);
          self.redo_stack.$clear();};
        return self.history_stack.$push(["  do", command, the_arguments]);
      };

      def.$undo = function() {
        var $a, self = this, command = nil, arguments$ = nil;

        if ((($a = self['$can_undo?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          $a = Opal.to_ary(self.undo_stack.$pop()), command = ($a[0] == null ? nil : $a[0]), arguments$ = ($a[1] == null ? nil : $a[1]);
          self.redo_stack.$push([command, arguments$]);
          self.history_stack.$push(["undo", command, arguments$]);
          return command.$invert(arguments$);
          } else {
          return self.$raise("nothing to undo")
        };
      };

      def.$redo = function() {
        var $a, self = this, command = nil, arguments$ = nil;

        if ((($a = self['$can_redo?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          $a = Opal.to_ary(self.redo_stack.$pop()), command = ($a[0] == null ? nil : $a[0]), arguments$ = ($a[1] == null ? nil : $a[1]);
          return self.$perform(command, arguments$);
          } else {
          return self.$raise("nothing to redo")
        };
      };

      Opal.cdecl($scope, 'STRING_COMMAND_REGEX', /([^ \\\^"{]+)|"(([^\\"]|\\["n\\])*)"|(\{.+\})/);

      def.$parse_string = function(command) {
        var $a, $b, TMP_14, self = this, r = nil;

        return r = ($a = ($b = command.$scan($scope.get('STRING_COMMAND_REGEX'))).$map, $a.$$p = (TMP_14 = function(s){var self = TMP_14.$$s || this, $a, $b, TMP_15;
if (s == null) s = nil;
        return ($a = ($b = s).$select, $a.$$p = (TMP_15 = function(x){var self = TMP_15.$$s || this;
if (x == null) x = nil;
          return x['$nil?']()['$!']()}, TMP_15.$$s = self, TMP_15), $a).call($b).$first()}, TMP_14.$$s = self, TMP_14), $a).call($b);
      };

      def.$run_string = function(command) {
        var $a, $b, TMP_16, $c, TMP_17, self = this, arguments$ = nil, parts = nil, the_command = nil;

        arguments$ = $hash2([], {});
        parts = self.$parse_string(command);
        parts = ($a = ($b = parts).$map, $a.$$p = (TMP_16 = function(p){var self = TMP_16.$$s || this;
if (p == null) p = nil;
        return p.$gsub("\\\\", "\\")}, TMP_16.$$s = self, TMP_16), $a).call($b);
        the_command = self.commands['$[]'](parts.$first().$to_sym());
        if (the_command !== false && the_command !== nil) {
          } else {
          self.$raise("wrong command: " + (command))
        };
        ($a = ($c = parts['$[]']($range(1, -1, false))).$each_with_index, $a.$$p = (TMP_17 = function(argument, index){var self = TMP_17.$$s || this;
if (argument == null) argument = nil;if (index == null) index = nil;
        try {
          return arguments$['$[]='](the_command.$parameter_name(index), argument)
          } catch ($err) {if (true) {
            return self.$raise("too many arguments in '" + (command) + "'")
            }else { throw $err; }
          }}, TMP_17.$$s = self, TMP_17), $a).call($c);
        return self.$perform(the_command, arguments$);
      };

      def.$history = function() {
        var self = this;

        return self.history_stack.$clone();
      };

      def.$undostack = function() {
        var $a, $b, TMP_18, self = this;

        return ($a = ($b = self.undo_stack).$map, $a.$$p = (TMP_18 = function(c){var self = TMP_18.$$s || this;
if (c == null) c = nil;
        return c.$clone().$unshift("undo")}, TMP_18.$$s = self, TMP_18), $a).call($b);
      };

      def.$redostack = function() {
        var $a, $b, TMP_19, self = this;

        return ($a = ($b = self.redo_stack).$map, $a.$$p = (TMP_19 = function(c){var self = TMP_19.$$s || this;
if (c == null) c = nil;
        return c.$clone().$unshift("redo")}, TMP_19.$$s = self, TMP_19), $a).call($b);
      };

      return (def.$help_string_style = function() {
        var $a, $b, TMP_20, $c, $d, TMP_22, self = this;

        return ($a = ($b = ($c = ($d = self.commands.$to_a()).$select, $c.$$p = (TMP_22 = function(c){var self = TMP_22.$$s || this;
if (c == null) c = nil;
        return c.$last()['$is_public?']()}, TMP_22.$$s = self, TMP_22), $c).call($d)).$map, $a.$$p = (TMP_20 = function(k, c){var self = TMP_20.$$s || this, $a, $b, TMP_21, parameter_names = nil;
if (k == null) k = nil;if (c == null) c = nil;
        parameter_names = ($a = ($b = c.$parameters()).$map, $a.$$p = (TMP_21 = function(p){var self = TMP_21.$$s || this;
if (p == null) p = nil;
          return "{" + (p.$name()) + "}"}, TMP_21.$$s = self, TMP_21), $a).call($b).$join(" ");
          return "" + (c.$name()) + " " + (parameter_names) + " : " + (c.$get_help());}, TMP_20.$$s = self, TMP_20), $a).call($b);
      }, nil) && 'help_string_style';
    })(self, null);
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["controller"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  var $a, $b, TMP_22, self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $hash2 = Opal.hash2, $gvars = Opal.gvars;

  Opal.add_stubs(['$load_dir', '$save_dir', '$[]', '$warning', '$update', '$to_json', '$[]=', '$parse', '$warn', '$clone', '$private', '$attr', '$html', '$find', '$new', '$load_from_loacalstorage', '$on_command', '$save_to_localstorage', '$handle_command', '$info', '$push', '$_init_conf', '$each', '$send', '$select', '$=~', '$methods', '$setup_ui', '$load_demo_tune', '$set_status', '$loglevel', '$render_previews', '$setup_nodewebkit', '$setup_ui_listener', '$run_string', '$error', '$message', '$caller', '$include?', '$get_text', '$Native', '$nil?', '$set_text', '$draw', '$layout_harpnotes', '$draw_in_segments', '$is_playing?', '$stop', '$==', '$play_song', '$play_selection', '$play_from_selection', '$setup_tune_preview', '$get_abc_part', '$join', '$backtrace', '$debug', '$set_inactive', '$set_annotations', '$annotations', '$load_song', '$send_remote_command', '$set_active', '$render_tunepreview_callback', '$file', '$output', '$render_a4', '$render_a3', '$to_blob', '$strftime', '$now', '$clear_annotations', '$get_config_part', '$get_config_position', '$last', '$first', '$count', '$split', '$keys', '$transform', '$layout', '$pop', '$select_range_by_position', '$range_highlight_more', '$range_highlight', '$range_unhighlight_more', '$range_unhighlight', '$unhighlight_all', '$highlight_abc_object', '$merge!', '$inject', '$to_s', '$loglevel=', '$set_view_box', '$on_select', '$select_abc_object', '$origin', '$width', '$on', '$play_abc', '$on_change', '$request_refresh', '$on_selection_change', '$get_selection_positions', '$on_cursor_change', '$on_noteon', '$on_noteoff', '$unhighlight_abc_object', '$on_songoff', '$stop_play_abc', '$key', '$newValue', '$prevent', '$css', '$page_x', '$===', '$puts', '$ready?']);
  (function($base, $super) {
    function $LocalStore(){};
    var self = $LocalStore = $klass($base, $super, 'LocalStore', $LocalStore);

    var def = self.$$proto, $scope = self.$$scope;

    def.directory = def.name = nil;
    def.$initialize = function(name) {
      var $a, self = this;

      self.name = name;
      self.$load_dir();
      if ((($a = self.directory) !== nil && (!$a.$$is_boolean || $a == true))) {
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
      if ((($a = self.directory['$[]'](key)) !== nil && (!$a.$$is_boolean || $a == true))) {
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
      if ((($a = ((($b = self.directory['$[]'](key)) !== false && $b !== nil) ? $b : create)) !== nil && (!$a.$$is_boolean || $a == true))) {
        localStorage.setItem(self.$mangle_key(key), envelope);
        self.directory['$[]='](key, title);
        return self.$save_dir();
        } else {
        return $gvars.log.$warning("local storage update: key '" + (key) + "' does not exist")
      };
    };

    def.$retrieve = function(key) {
      var self = this, envelope = nil, result = nil;

      envelope = $scope.get('JSON').$parse(localStorage.getItem(self.$mangle_key(key)));
      if (envelope !== false && envelope !== nil) {
        result = envelope['$[]']("p")};
      return result;
    };

    def.$delete = function(key) {
      var $a, self = this;
      if ($gvars.log == null) $gvars.log = nil;

      if ((($a = self.directory['$[]'](key)) !== nil && (!$a.$$is_boolean || $a == true))) {
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
      var self = this, dirkey = nil;

      dirkey = "" + (self.name) + "__dir";
      return self.directory = $scope.get('JSON').$parse(localStorage.getItem(dirkey));
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

    var def = self.$$proto, $scope = self.$$scope;

    def.console = def.commands = def.systemstatus = def.editor = def.harpnote_player = def.tune_preview_printer = def.music_model = def.harpnote_preview_printer = def.song_harpnotes = def.refresh_timer = nil;
    self.$attr("editor", "harpnote_preview_printer", "tune_preview_printer", "systemstatus");

    def.$initialize = function() {
      var $a, $b, TMP_1, $c, TMP_2, $d, $e, TMP_3, self = this;
      if ($gvars.log == null) $gvars.log = nil;
      if ($gvars.conf == null) $gvars.conf = nil;

      $scope.get('Element').$find("#lbZupfnoter").$html("Zupfnoter " + ($scope.get('VERSION')));
      self.console = (($scope.get('JqConsole')).$$scope.get('JqConsole')).$new("commandconsole", "zupfnoter> ");
      self.console.$load_from_loacalstorage();
      ($a = ($b = self.console).$on_command, $a.$$p = (TMP_1 = function(cmd){var self = TMP_1.$$s || this;
        if (self.console == null) self.console = nil;
if (cmd == null) cmd = nil;
      self.console.$save_to_localstorage();
        return self.$handle_command(cmd);}, TMP_1.$$s = self, TMP_1), $a).call($b);
      $gvars.log = $scope.get('ConsoleLogger').$new(self.console);
      $gvars.log.$info("Welcome to Zupfnoter " + ($scope.get('VERSION')));
      $gvars.conf = $scope.get('Confstack').$new();
      $gvars.conf.$push(self.$_init_conf());
      self.editor = (($scope.get('Harpnotes')).$$scope.get('TextPane')).$new("abcEditor");
      self.harpnote_player = (((($scope.get('Harpnotes')).$$scope.get('Music'))).$$scope.get('HarpnotePlayer')).$new();
      self.songbook = $scope.get('LocalStore').$new("songbook");
      self.abc_transformer = (((($scope.get('Harpnotes')).$$scope.get('Input'))).$$scope.get('ABCToHarpnotes')).$new();
      self.dropboxclient = (((($scope.get('Opal')).$$scope.get('DropboxJs'))).$$scope.get('NilClient')).$new();
      self.systemstatus = $hash2([], {});
      self.commands = (($scope.get('CommandController')).$$scope.get('CommandStack')).$new();
      ($a = ($c = ($d = ($e = self.$methods()).$select, $d.$$p = (TMP_3 = function(n){var self = TMP_3.$$s || this;
if (n == null) n = nil;
      return n['$=~'](/__ic.*/)}, TMP_3.$$s = self, TMP_3), $d).call($e)).$each, $a.$$p = (TMP_2 = function(m){var self = TMP_2.$$s || this;
if (m == null) m = nil;
      return self.$send(m)}, TMP_2.$$s = self, TMP_2), $a).call($c);
      self.$setup_ui();
      self.$load_demo_tune();
      self.$set_status($hash2(["dropbox", "music_model", "loglevel", "autorefresh", "view"], {"dropbox": "not connected", "music_model": "unchanged", "loglevel": $gvars.log.$loglevel(), "autorefresh": "off", "view": 0}));
      self.$load_from_loacalstorage();
      self.$render_previews();
      self.$setup_nodewebkit();
      return self.$setup_ui_listener();
    };

    def.$handle_command = function(command) {
      var self = this, e = nil;
      if ($gvars.log == null) $gvars.log = nil;

      try {
      return self.commands.$run_string(command)
      } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
        return $gvars.log.$error("" + (e.$message()) + " in " + (command) + " " + (e.$caller()) + " " + ("controller") + ":" + (133))
        }else { throw $err; }
      };
    };

    def.$save_to_localstorage = function() {
      var $a, $b, TMP_4, self = this, systemstatus = nil, abc = nil;

      systemstatus = ($a = ($b = self.systemstatus).$select, $a.$$p = (TMP_4 = function(key, _){var self = TMP_4.$$s || this;
if (key == null) key = nil;if (_ == null) _ = nil;
      return ["music_model", "view", "autorefresh", "loglevel", "nwworkingdir"]['$include?'](key)}, TMP_4.$$s = self, TMP_4), $a).call($b).$to_json();
      abc = localStorage.setItem('systemstatus', systemstatus);;
      abc = self.editor.$get_text();
      return abc = localStorage.setItem('abc_data', abc);;
    };

    def.$load_from_loacalstorage = function() {
      var $a, self = this, abc = nil, envelope = nil;

      abc = self.$Native(localStorage.getItem('abc_data'));
      if ((($a = abc['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.editor.$set_text(abc)
      };
      envelope = $scope.get('JSON').$parse(localStorage.getItem('systemstatus'));
      if (envelope !== false && envelope !== nil) {
        self.$set_status(envelope)};
      return nil;
    };

    def.$load_demo_tune = function() {
      var self = this, abc = nil;

      abc = "X:21\nF:21_Ich_steh_an_deiner_krippen_hier\nT:Ich steh an deiner Krippen hier\nC:Nr. 59 aus dem Weihnachtsoratorium\nC:Joh. Seb. Bach\nC:Kirchenchor Mattighofen\n%%score ( 1 2 ) ( 3 4 )\nL:1/4\nQ:1/4=80.00\nM:4/4\nI:linebreak $\nK:G\nV:1 treble nm=\"Sopran Alt\"\nV:2 treble\nV:3 bass nm=\"Tenor Bass\"\nV:4 bass\nV:1\nG | G/A/ B A G | A A !fermata!B G/A/ |\nB c d c/B/ | A/G/ A !fermata!G :| B | B A G F |\nG/A/ B !fermata!A A | G F G D | G A !fermata!B G/A/ |\nB c d c/B/ | A/G/ A !fermata!G z |]\nV:2\nD | E/F/ G G/F/ G | G F G E/F/ |\nG/ B A/4G/4 F G | G F D :| z | G3/2 F/ F/E/ E/^D/ |\nE D D D | D/C/ D D/C/ B, | B, E ^D B, |\nE E D/E/2 G | G F D z |]\nV:3\nB, | B, E E/D/ D | E/C/ A,/D/ !fermata!D E |\nD G,/A,/ B,/C/ D | D C/B,/ !fermata!B, :| D | D D/C/ B,/C/ F,/B,/ |\nB,/A,/ A,/G,/ !fermata!F, F, | G,/A,/ B,/C/ B,/A,/ G, | G, F,/E,/ !fermata!F, E,/F,/ |\nG,3/2 A,/ B,/C/ D | D C/B,/ !fermata!B, z |]\nV:4\nG,/F,/ | E,3/2 D,/ C,3/2 B,,/ | C,/A,,/ D, G,, C, |\nG,/F,/ E, B,/A,/ G, | D D, G, :| z | B,/C/ D/2-D/2 G,/A,/ B, |\nE,/F,/ G, D, D/C/ | B,3/2 A,/ G,3/2 F,/ | E,/D,/ C, B,, E,/-E,/ |\nE,/D,/ C, B,,/A,,/ G,, | D,2 G,, z |]\n\n%%%%zupfnoter.config\n{\n \"produce\":[1],\n \"annotations\": {\n                  \"refn\": {\"id\": \"refn\", \"text\": \"referenced note\", \"pos\": [20,10]}\n                },\n \"extract\": {\n  \"0\": {\n       \"voices\": [1,2,3,4],\n       \"flowlines\": [1,3],\n       \"layoutlines\": [1,2,3,4],\n       \"lyrics\": {\"versepos\": {\"1,2,3,4,5,6\" :[10,100]}},\n       \"legend\": {\"pos\": [310,175]},\n       \"notes\":[\n         {\"pos\": [340,10], \"text\": \"Ich steh an deiner Krippen hier\", \"style\": \"strong\"}\n         ]\n      }\n       }\n}\n";
      return self.editor.$set_text(abc);
    };

    def.$render_a3 = function(index) {
      var self = this, printer = nil;

      if (index == null) {
        index = self.systemstatus['$[]']("view")
      }
      printer = (($scope.get('Harpnotes')).$$scope.get('PDFEngine')).$new();
      return printer.$draw(self.$layout_harpnotes(index));
    };

    def.$render_a4 = function(index) {
      var self = this;

      if (index == null) {
        index = self.systemstatus['$[]']("view")
      }
      return (($scope.get('Harpnotes')).$$scope.get('PDFEngine')).$new().$draw_in_segments(self.$layout_harpnotes(index));
    };

    def.$play_abc = function(mode) {
      var $a, self = this;

      if (mode == null) {
        mode = "music_model"
      }
      if ((($a = self.harpnote_player['$is_playing?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.harpnote_player.$stop();
        return $scope.get('Element').$find("#tbPlay").$html("play");
        } else {
        $scope.get('Element').$find("#tbPlay").$html("stop");
        if (mode['$==']("music_model")) {
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
      var self = this;

      self.harpnote_player.$stop();
      return $scope.get('Element').$find("#tbPlay").$html("play");
    };

    def.$render_tunepreview_callback = function() {
      var self = this, abc_text = nil, e = nil;
      if ($gvars.log == null) $gvars.log = nil;

      self.$setup_tune_preview();
      try {
      abc_text = self.editor.$get_abc_part();
        self.tune_preview_printer.$draw(abc_text);
      } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
        $gvars.log.$error(["Bug", e.$message(), e.$backtrace()].$join("\n"), [1, 1], [10, 1000])
        }else { throw $err; }
      };
      $gvars.log.$debug("finished render tune " + ("controller") + " " + (259));
      self.$set_inactive("#tunePreview");
      self.editor.$set_annotations($gvars.log.$annotations());
      return nil;
    };

    def.$render_harpnotepreview_callback = function() {
      var self = this, e = nil;
      if ($gvars.log == null) $gvars.log = nil;

      try {
      $gvars.log.$debug("viewid: " + (self.systemstatus['$[]']("view")) + " " + ("controller") + " " + (271));
        self.song_harpnotes = self.$layout_harpnotes(self.systemstatus['$[]']("view"));
        self.harpnote_player.$load_song(self.music_model);
        self.harpnote_preview_printer.$draw(self.song_harpnotes);
      } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
        $gvars.log.$error(["Bug", e.$message(), e.$backtrace()].$join("\n"), [1, 1], [10, 1000])
        }else { throw $err; }
      };
      self.$set_status($hash2(["refresh"], {"refresh": false}));
      $gvars.log.$debug("finished rendering Haprnotes " + ("controller") + " " + (282));
      self.$set_inactive("#harpPreview");
      self.editor.$set_annotations($gvars.log.$annotations());
      return nil;
    };

    def.$render_previews = function() {
      var self = this;
      if ($gvars.log == null) $gvars.log = nil;

      $gvars.log.$info("rendering");
      if (self.systemstatus['$[]']("autorefresh")['$==']("remote")) {
        } else {
        self.$save_to_localstorage();
        self.$send_remote_command("render");
      };
      self.$setup_tune_preview();
      self.$set_active("#tunePreview");
      setTimeout(function(){self.$render_tunepreview_callback()}, 0);
      self.$set_active("#harpPreview");
      return setTimeout(function(){self.$render_harpnotepreview_callback()}, 0);
    };

    def.$render_remote = function() {
      var self = this;

      self.$set_status($hash2(["refresh"], {"refresh": false}));
      self.$save_to_localstorage();
      self.$render_tunepreview_callback();
      return self.$send_remote_command("render");
    };

    def.$save_file = function() {
      var self = this, zip = nil, blob = nil, filename = nil;

      zip = (($scope.get('JSZip')).$$scope.get('ZipFile')).$new();
      zip.$file("song.abc", self.editor.$get_text());
      zip.$file("harpnotes_a4.pdf", self.$render_a4().$output("blob"));
      zip.$file("harpnotes_a3.pdf", self.$render_a3().$output("blob"));
      blob = zip.$to_blob();
      filename = "song" + ($scope.get('Time').$now().$strftime("%d%m%Y%H%M%S")) + ".zip";
      return window.saveAs(blob, filename);
    };

    def.$layout_harpnotes = function(print_variant) {
      var $a, $b, self = this, config_part = nil, config = nil, error = nil, line_col = nil, outdated_configs = nil, result = nil;
      if ($gvars.log == null) $gvars.log = nil;
      if ($gvars.conf == null) $gvars.conf = nil;

      if (print_variant == null) {
        print_variant = 0
      }
      $gvars.log.$clear_annotations();
      config_part = self.editor.$get_config_part();
      try {
      config = json_parse(config_part);
        config = $scope.get('JSON').$parse(config_part);
      } catch ($err) {if (Opal.rescue($err, [$scope.get('Object')])) {error = $err;
        line_col = self.editor.$get_config_position(error.$last());
        $gvars.log.$error("" + (error.$first()) + " at " + (line_col), line_col);
        config = $hash2([], {});
        }else { throw $err; }
      };
      outdated_configs = self.editor.$get_text().$split("%%%%hn.").$count();
      if ((($a = ((($b = $rb_gt(config.$keys().$count(), 0)) !== false && $b !== nil) ? $b : outdated_configs['$=='](1))) !== nil && (!$a.$$is_boolean || $a == true))) {
        config['$[]=']("location", "song")};
      $gvars.conf.$push(config);
      self.music_model = (((($scope.get('Harpnotes')).$$scope.get('Input'))).$$scope.get('ABCToHarpnotes')).$new().$transform(self.editor.$get_abc_part());
      result = (((($scope.get('Harpnotes')).$$scope.get('Layout'))).$$scope.get('Default')).$new().$layout(self.music_model, nil, print_variant);
      self.editor.$set_annotations($gvars.log.$annotations());
      $gvars.conf.$pop();
      return result;
    };

    def.$highlight_abc_object = function(abcelement) {
      var $a, self = this, a = nil, startchar = nil, endchar = nil;
      if ($gvars.log == null) $gvars.log = nil;

      a = self.$Native(abcelement);
      $gvars.log.$debug("select_abc_element " + (a['$[]']("startChar")) + " (" + ("controller") + " " + (361) + ")");
      startchar = a['$[]']("startChar");
      endchar = a['$[]']("endChar");
      if (endchar['$=='](startchar)) {
        endchar = $rb_minus(endchar, 5)};
      if ((($a = self.harpnote_player['$is_playing?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        } else {
        self.editor.$select_range_by_position(startchar, endchar)
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

    def.$set_status = function(status) {
      var $a, $b, TMP_5, $c, self = this, to_hide = nil, statusmessage = nil;
      if ($gvars.log == null) $gvars.log = nil;

      self.systemstatus['$merge!'](status);
      to_hide = ["nwworkingdir"];
      statusmessage = ($a = ($b = self.systemstatus).$inject, $a.$$p = (TMP_5 = function(r, v){var self = TMP_5.$$s || this, $a;
if (r == null) r = nil;if (v == null) v = nil;
      if ((($a = to_hide['$include?'](v.$first())) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          r.$push("" + (v.$first()) + ": " + (v.$last()) + "  ")
        };
        return r;}, TMP_5.$$s = self, TMP_5), $a).call($b, []).$join(" | ");
      $gvars.log.$debug("" + (self.systemstatus.$to_s()) + " " + ("controller") + " " + (402));
      if (self.systemstatus['$[]']("loglevel")['$==']($gvars.log.$loglevel())) {
        } else {
        (($a = [(self.systemstatus['$[]']("loglevel"))]), $c = $gvars.log, $c['$loglevel='].apply($c, $a), $a[$a.length-1])
      };
      return $scope.get('Element').$find("#tbStatus").$html(statusmessage);
    };

    self.$private();

    def.$setup_ui = function() {
      var $a, $b, TMP_6, self = this;

      self.harpnote_preview_printer = (($scope.get('Harpnotes')).$$scope.get('RaphaelEngine')).$new("harpPreview", 1100, 700);
      self.harpnote_preview_printer.$set_view_box(0, 0, 440, 297);
      return ($a = ($b = self.harpnote_preview_printer).$on_select, $a.$$p = (TMP_6 = function(harpnote){var self = TMP_6.$$s || this;
if (harpnote == null) harpnote = nil;
      return self.$select_abc_object(harpnote.$origin())}, TMP_6.$$s = self, TMP_6), $a).call($b);
    };

    def.$setup_tune_preview = function() {
      var $a, $b, TMP_7, self = this, width = nil, printerparams = nil;
      if ($gvars.log == null) $gvars.log = nil;

      width = $rb_minus(self.$Native($scope.get('Element').$find("#tunePreviewContainer").$width()), 50);
      $gvars.log.$debug("tune preview-width " + (width) + " " + ("controller") + ":" + (423));
      printerparams = $hash2(["staffwidth"], {"staffwidth": width});
      self.tune_preview_printer = (($scope.get('ABC2SVG')).$$scope.get('Abc2Svg')).$new($scope.get('Element').$find("#tunePreview"));
      return ($a = ($b = self.tune_preview_printer).$on_select, $a.$$p = (TMP_7 = function(abcelement){var self = TMP_7.$$s || this, a = nil;
if (abcelement == null) abcelement = nil;
      a = self.$Native(abcelement);
        return self.$select_abc_object(abcelement);}, TMP_7.$$s = self, TMP_7), $a).call($b);
    };

    def.$setup_ui_listener = function() {
      var $a, $b, TMP_8, $c, TMP_9, $d, TMP_10, $e, TMP_11, $f, TMP_12, $g, TMP_13, $h, TMP_14, $i, TMP_15, $j, TMP_16, $k, TMP_17, $l, TMP_18, $m, TMP_19, self = this;

      ($a = ($b = $scope.get('Element').$find("#tbPlay")).$on, $a.$$p = (TMP_8 = function(){var self = TMP_8.$$s || this;

      return self.$play_abc("selection_ff")}, TMP_8.$$s = self, TMP_8), $a).call($b, "click");
      ($a = ($c = $scope.get('Element').$find("#tbRender")).$on, $a.$$p = (TMP_9 = function(){var self = TMP_9.$$s || this;

      return self.$render_previews()}, TMP_9.$$s = self, TMP_9), $a).call($c, "click");
      ($a = ($d = $scope.get('Element').$find("#tbPrintA3")).$on, $a.$$p = (TMP_10 = function(){var self = TMP_10.$$s || this, url = nil;

      url = self.$render_a3().$output("datauristring");
        return window.open(url);}, TMP_10.$$s = self, TMP_10), $a).call($d, "click");
      ($a = ($e = $scope.get('Element').$find("#tbPrintA4")).$on, $a.$$p = (TMP_11 = function(){var self = TMP_11.$$s || this, url = nil;

      url = self.$render_a4().$output("datauristring");
        return window.open(url);}, TMP_11.$$s = self, TMP_11), $a).call($e, "click");
      ($a = ($f = self.editor).$on_change, $a.$$p = (TMP_12 = function(e){var self = TMP_12.$$s || this;
if (e == null) e = nil;
      self.$set_status($hash2(["music_model"], {"music_model": "changed"}));
        self.$request_refresh(true);
        return nil;}, TMP_12.$$s = self, TMP_12), $a).call($f);
      ($a = ($g = self.editor).$on_selection_change, $a.$$p = (TMP_13 = function(e){var self = TMP_13.$$s || this, $a, a = nil;
        if (self.editor == null) self.editor = nil;
        if (self.tune_preview_printer == null) self.tune_preview_printer = nil;
        if (self.harpnote_preview_printer == null) self.harpnote_preview_printer = nil;
        if (self.harpnote_player == null) self.harpnote_player = nil;
        if ($gvars.log == null) $gvars.log = nil;
if (e == null) e = nil;
      a = self.editor.$get_selection_positions();
        $gvars.log.$debug("editor selecton " + (a.$first()) + " to " + (a.$last()) + " (" + ("controller") + ":" + (452) + ")");
        if ((($a = self.tune_preview_printer.$range_highlight(a.$first(), a.$last())) !== nil && (!$a.$$is_boolean || $a == true))) {
          return nil
          } else {
          self.harpnote_preview_printer.$unhighlight_all();
          self.harpnote_preview_printer.$range_highlight(a.$first(), a.$last());
          return self.harpnote_player.$range_highlight(a.$first(), a.$last());
        };}, TMP_13.$$s = self, TMP_13), $a).call($g);
      ($a = ($h = self.editor).$on_cursor_change, $a.$$p = (TMP_14 = function(e){var self = TMP_14.$$s || this;
if (e == null) e = nil;
      return self.$request_refresh(false)}, TMP_14.$$s = self, TMP_14), $a).call($h);
      ($a = ($i = self.harpnote_player).$on_noteon, $a.$$p = (TMP_15 = function(e){var self = TMP_15.$$s || this;
        if ($gvars.log == null) $gvars.log = nil;
if (e == null) e = nil;
      $gvars.log.$debug("noteon " + (self.$Native(e)['$[]']("startChar")) + " (" + ("controller") + " " + (467) + ")");
        return self.$highlight_abc_object(e);}, TMP_15.$$s = self, TMP_15), $a).call($i);
      ($a = ($j = self.harpnote_player).$on_noteoff, $a.$$p = (TMP_16 = function(e){var self = TMP_16.$$s || this;
        if ($gvars.log == null) $gvars.log = nil;
if (e == null) e = nil;
      $gvars.log.$debug("noteoff " + (self.$Native(e)['$[]']("startChar")) + " (" + ("controller") + " " + (472) + ")");
        return self.$unhighlight_abc_object(e);}, TMP_16.$$s = self, TMP_16), $a).call($j);
      ($a = ($k = self.harpnote_player).$on_songoff, $a.$$p = (TMP_17 = function(){var self = TMP_17.$$s || this;

      return self.$stop_play_abc()}, TMP_17.$$s = self, TMP_17), $a).call($k);
      ($a = ($l = $scope.get('Element').$find(window)).$on, $a.$$p = (TMP_18 = function(evt){var self = TMP_18.$$s || this, $a, $b, $c, key = nil, value = nil;
        if (self.systemstatus == null) self.systemstatus = nil;
        if ($gvars.log == null) $gvars.log = nil;
if (evt == null) evt = nil;
      key = self.$Native(evt['$[]']("originalEvent")).$key();
        value = self.$Native(evt['$[]']("originalEvent")).$newValue();
        $gvars.log.$debug("got storage event " + (key) + ": " + (value) + " (" + ("controller") + " " + (500) + ")");
        if ((($a = ($b = (($c = self.systemstatus['$[]']("autorefresh")['$==']("remote")) ? key['$==']("command") : $c), $b !== false && $b !== nil ?value['$==']("render") : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
          return self.$load_from_loacalstorage()
          } else {
          return nil
        };}, TMP_18.$$s = self, TMP_18), $a).call($l, "storage");
      return ($a = ($m = $scope.get('Element').$find("#dragbar")).$on, $a.$$p = (TMP_19 = function(re){var self = TMP_19.$$s || this, $a, $b, TMP_20, $c, TMP_21;
if (re == null) re = nil;
      re.$prevent();
        ($a = ($b = $scope.get('Element').$find(document)).$on, $a.$$p = (TMP_20 = function(e){var self = TMP_20.$$s || this;
if (e == null) e = nil;
        $scope.get('Element').$find("#leftColumn").$css("right", "" + ($rb_minus(window.innerWidth, e.$page_x())) + "px");
          $scope.get('Element').$find("#rightColumn").$css("left", "" + (e.$page_x()) + "px");
          return $scope.get('Element').$find("#dragbar").$css("left", "" + (e.$page_x()) + "px");}, TMP_20.$$s = self, TMP_20), $a).call($b, "mousemove");
        return ($a = ($c = $scope.get('Element').$find(document)).$on, $a.$$p = (TMP_21 = function(){var self = TMP_21.$$s || this;

        return $(document).unbind('mousemove');}, TMP_21.$$s = self, TMP_21), $a).call($c, "mouseup");}, TMP_19.$$s = self, TMP_19), $a).call($m, "mousedown");
    };

    def.$request_refresh = function(init) {
      var $a, self = this, $case = nil;
      if ($gvars.log == null) $gvars.log = nil;

      if (init !== false && init !== nil) {
        self.$set_status($hash2(["refresh"], {"refresh": true}))};
      $gvars.log.$debug("request refresh " + (self.systemstatus['$[]']("refresh")) + " " + (init) + " " + ("controller") + " " + (524));
      if ((($a = self.refresh_timer) !== nil && (!$a.$$is_boolean || $a == true))) {
        clearTimeout(self.refresh_timer);};
      if ((($a = self.systemstatus['$[]']("refresh")) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.$handle_command("stop");
        return (function() {$case = self.systemstatus['$[]']("autorefresh");if ("on"['$===']($case)) {return self.refresh_timer = setTimeout(function(){self.$render_previews()}, 100)}else if ("off"['$===']($case)) {return self.refresh_timer = setTimeout(function(){self.$render_remote()}, 0)}else if ("remote"['$===']($case)) {return self.refresh_timer = setTimeout(function(){self.$render_previews()}, 500)}else { return nil }})();
        } else {
        return nil
      };
    };

    def.$send_remote_command = function(command) {
      var self = this;

      localStorage.setItem('command', '');
      return localStorage.setItem('command', command);;
    };

    def.$set_active = function(ui_element) {
      var self = this;

      return $scope.get('Element').$find(ui_element).$css("background-color", "red");
    };

    def.$set_inactive = function(ui_element) {
      var self = this;

      return $scope.get('Element').$find(ui_element).$css("background-color", "white");
    };

    self.$private();

    return (def.$_init_conf = function() {
      var self = this, result = nil;

      result = $hash2(["produce", "defaults", "annotations", "extract", "layout"], {"produce": [0], "defaults": $hash2(["print", "legend", "lyrics", "annotation"], {"print": $hash2(["t", "v", "startpos", "s", "f", "sf", "j", "l"], {"t": "", "v": [1, 2, 3, 4], "startpos": 15, "s": [[1, 2], [2, 3]], "f": [1, 3], "sf": [2, 4], "j": [1, 3], "l": [1, 2, 3, 4]}), "legend": $hash2(["pos"], {"pos": [20, 20]}), "lyrics": $hash2(["pos"], {"pos": [20, 60]}), "annotation": $hash2(["pos"], {"pos": [2, -5]})}), "annotations": $hash2(["vt", "vr"], {"vt": $hash2(["text", "pos"], {"text": "v", "pos": [-1, -6]}), "vr": $hash2(["text", "pos"], {"text": "v", "pos": [2, -3]})}), "extract": $hash2(["0", "1", "2"], {"0": $hash2(["line_no", "title", "startpos", "voices", "synchlines", "flowlines", "subflowlines", "jumplines", "layoutlines", "legend", "lyrics", "notes"], {"line_no": 1, "title": "alle Stimmen", "startpos": 15, "voices": [1, 2, 3, 4], "synchlines": [[1, 2], [3, 4]], "flowlines": [1, 3], "subflowlines": [2, 4], "jumplines": [1, 3], "layoutlines": [1, 2, 3, 4], "legend": $hash2(["pos"], {"pos": [320, 20]}), "lyrics": $hash2(["pos"], {"pos": [320, 50]}), "notes": []}), "1": $hash2(["line_no", "title", "voices"], {"line_no": 2, "title": "Sopran, Alt", "voices": [1, 2]}), "2": $hash2(["line_no", "title", "voices"], {"line_no": 1, "title": "Tenor, Bass", "voices": [3, 4]})}), "layout": $hash2(["LINE_THIN", "LINE_MEDIUM", "LINE_THICK", "ELLIPSE_SIZE", "REST_SIZE", "X_SPACING", "X_OFFSET", "Y_SCALE", "DRAWING_AREA_SIZE", "BEAT_RESOLUTION", "SHORTEST_NOTE", "BEAT_PER_DURATION", "PITCH_OFFSET", "FONT_STYLE_DEF", "MM_PER_POINT", "DURATION_TO_STYLE", "REST_TO_GLYPH"], {"LINE_THIN": 0.1, "LINE_MEDIUM": 0.3, "LINE_THICK": 0.5, "ELLIPSE_SIZE": [2.8, 1.7], "REST_SIZE": [2.8, 1.5], "X_SPACING": 11.5, "X_OFFSET": 2.8, "Y_SCALE": 4, "DRAWING_AREA_SIZE": [400, 282], "BEAT_RESOLUTION": 192, "SHORTEST_NOTE": 64, "BEAT_PER_DURATION": 3, "PITCH_OFFSET": -43, "FONT_STYLE_DEF": $hash2(["smaller", "small", "regular", "large"], {"smaller": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 6, "font_style": "normal"}), "small": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 9, "font_style": "normal"}), "regular": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 12, "font_style": "normal"}), "large": $hash2(["text_color", "font_size", "font_style"], {"text_color": [0, 0, 0], "font_size": 20, "font_style": "bold"})}), "MM_PER_POINT": 0.3, "DURATION_TO_STYLE": $hash2(["err", "d64", "d48", "d32", "d24", "d16", "d12", "d8", "d6", "d4", "d3", "d2", "d1"], {"err": [2, "filled", $scope.get('FALSE')], "d64": [0.9, "empty", $scope.get('FALSE')], "d48": [0.7, "empty", $scope.get('TRUE')], "d32": [0.7, "empty", $scope.get('FALSE')], "d24": [0.7, "filled", $scope.get('TRUE')], "d16": [0.7, "filled", $scope.get('FALSE')], "d12": [0.5, "filled", $scope.get('TRUE')], "d8": [0.5, "filled", $scope.get('FALSE')], "d6": [0.3, "filled", $scope.get('TRUE')], "d4": [0.3, "filled", $scope.get('FALSE')], "d3": [0.1, "filled", $scope.get('TRUE')], "d2": [0.1, "filled", $scope.get('FALSE')], "d1": [0.05, "filled", $scope.get('FALSE')]}), "REST_TO_GLYPH": $hash2(["err", "d64", "d48", "d32", "d24", "d16", "d12", "d8", "d6", "d4", "d3", "d2", "d1"], {"err": [[2, 2], "rest_1", $scope.get('FALSE')], "d64": [[0.9, 0.9], "rest_1", $scope.get('FALSE')], "d48": [[0.5, 0.5], "rest_1", $scope.get('TRUE')], "d32": [[0.5, 0.5], "rest_1", $scope.get('FALSE')], "d24": [[0.4, 0.7], "rest_4", $scope.get('TRUE')], "d16": [[0.4, 0.7], "rest_4", $scope.get('FALSE')], "d12": [[0.3, 0.5], "rest_8", $scope.get('TRUE')], "d8": [[0.3, 0.5], "rest_8", $scope.get('FALSE')], "d6": [[0.3, 0.4], "rest_16", $scope.get('TRUE')], "d4": [[0.3, 0.5], "rest_16", $scope.get('FALSE')], "d3": [[0.3, 0.5], "rest_32", $scope.get('TRUE')], "d2": [[0.3, 0.5], "rest_32", $scope.get('FALSE')], "d1": [[0.3, 0.5], "rest_64", $scope.get('FALSE')]})})});
      self.$puts(result.$to_json());
      return result;
    }, nil) && '_init_conf';
  })(self, null);
  return ($a = ($b = $scope.get('Document'))['$ready?'], $a.$$p = (TMP_22 = function(){var self = TMP_22.$$s || this;

  return $scope.get('Controller').$new()}, TMP_22.$$s = self, TMP_22), $a).call($b);
};

/* Generated by Opal 0.8.0 */
Opal.modules["controller-nw"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $gvars = Opal.gvars, $hash2 = Opal.hash2;

  Opal.add_stubs(['$info', '$gsub', '$handle_command', '$set_status', '$[]', '$render_previews', '$__ic_06_node_fs_commands', '$debug', '$message', '$join', '$backtrace', '$private', '$add_command', '$add_parameter', '$set_default', '$undoable=', '$set_help', '$parameter_help', '$as_action', '$get_text', '$get_metadata', '$to_s', '$first', '$split', '$raise', '$layout_harpnotes', '$harpnote_options', '$map', '$[]=', '$output', '$render_a3', '$render_a4', '$each_with_index', '$each', '$match', '$set_text', '$error', '$as_inverse']);
  return (function($base, $super) {
    function $Controller(){};
    var self = $Controller = $klass($base, $super, 'Controller', $Controller);

    var def = self.$$proto, $scope = self.$$scope;

    def.systemstatus = def.commands = nil;
    def.$setup_nodewebkit = function() {
      var self = this, arg = nil, f = nil, e = nil;
      if ($gvars.log == null) $gvars.log = nil;

      try {
      

        var gui = require('nw.gui');
        var fs = require('fs')

        var menu = new gui.Menu({ type: 'menubar', label: 'foobar'});

        menu.append(new gui.MenuItem({
          label: 'Zupfnoter',
          submenu: new gui.Menu()
        }));

        menu.items[0].submenu.append(new gui.MenuItem({
          label: 'About Zupfnoter',
          icon: 'public/menuicons/about-26.png',

          click: function () {
            alert("Zupfnoter version "+ $scope.get('VERSION') + "\n" + $scope.get('COPYRIGHT'));
          }
        }))

        menu.items[0].submenu.append(new gui.MenuItem({
          label: 'show arguments',
          click: function () {
            arg = nil
              arg = gui.App.argv;
            $gvars.log.$info(arg);
          }
        }))


        menu.items[0].submenu.append(new gui.MenuItem({
          label: 'Quit Zupfnoter',
          icon: 'public/menuicons/exit-26.png',

          click: function () {
            gui.App.quit();
          }
        }));

        menu.append(new gui.MenuItem({
          label: 'File',
          submenu: new gui.Menu()
        }));


        var chooser = $("#fileDialog");

        chooser.change(function(evt) {

          var filename = $(this).val();
          f = (filename).$gsub("\\", "\\\\")
        self.$handle_command("_fopen \"" + (f) + "\"")
          // Reset the selected value to empty ('')
          $(this).val('');
        });

        menu.items[1].submenu.append(new gui.MenuItem({
          label: 'open',
          icon: 'public/menuicons/view_file-26.png',
          click: function () {
            chooser.trigger('click');
          }
        }));


        var savechooser = $("#folderDialog");

        savechooser.change(function(evt) {
          var filename = $(this).val();

          f = filename
        self.$set_status($hash2(["nwworkingdir"], {"nwworkingdir": f}))
        f = f.$gsub("\\", "\\\\")
        self.$handle_command("_fsave \"" + (f) + "\"")

          // Reset the selected value to empty ('')
          $(this).val('');
        });

        menu.items[1].submenu.append(new gui.MenuItem({
          label: 'save',
          icon: 'public/menuicons/save-26.png',
          click: function () {
            savechooser.attr("nwworkingdir", self.systemstatus['$[]']("nwworkingdir"));
            savechooser.trigger('click');
          }
        }));

        menu.append(new gui.MenuItem({
          label: 'View',
          submenu: new gui.Menu()
        }));


        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'refresh',
          icon: 'public/menuicons/refresh-26.png',

          click: function () {
            self.$render_previews()
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'play all',
          icon: 'public/menuicons/play-26.png',

          click: function () {
            self.$handle_command("p all")
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'play from here',
          icon: 'public/menuicons/last-26.png',
          click: function () {
            self.$handle_command("p ff")
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'play selection',
          icon: 'public/menuicons/music_transcripts-26.png',
          click: function () {
            self.$handle_command("p sel")
          }
        }));


        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'set extract 0',
          icon: 'public/menuicons/0-26.png',

          click: function () {
            self.$handle_command("view 0")
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'set extract 1',
          icon: 'public/menuicons/1-26.png',
          click: function () {
            self.$handle_command("view 1")
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'set extract 2',
          icon: 'public/menuicons/2-26.png',
          click: function () {
            self.$handle_command("view 2")
          }
        }));
        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'set extract 3',
          icon: 'public/menuicons/3-26.png',
          click: function () {
            self.$handle_command("view 3")
          }
        }));



        gui.Window.get().menu = menu;
        gui.Window.title = "zupfnoter";
        gui.Window.get().show();

      ;
        return self.$__ic_06_node_fs_commands();
      } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
        return $gvars.log.$debug("error with node webkit: " + (e.$message()) + " " + (e.$backtrace().$join("\\n")) + " (" + ("controller-nw") + " " + (188) + ")")
        }else { throw $err; }
      };
    };

    self.$private();

    return (def.$__ic_06_node_fs_commands = function() {
      var $a, $b, TMP_1, $c, TMP_8, self = this;

      ($a = ($b = self.commands).$add_command, $a.$$p = (TMP_1 = function(command){var self = TMP_1.$$s || this, $a, $b, TMP_2, $c, TMP_4, $d, TMP_5;
if (command == null) command = nil;
      ($a = ($b = command).$add_parameter, $a.$$p = (TMP_2 = function(parameter){var self = TMP_2.$$s || this, $a, $b, TMP_3;
if (parameter == null) parameter = nil;
        return ($a = ($b = parameter).$set_default, $a.$$p = (TMP_3 = function(){var self = TMP_3.$$s || this;
            if (self.node_fs_path == null) self.node_fs_path = nil;

          return self.node_fs_path}, TMP_3.$$s = self, TMP_3), $a).call($b)}, TMP_2.$$s = self, TMP_2), $a).call($b, "path", "string");
        (($a = [false]), $c = command, $c['$undoable='].apply($c, $a), $a[$a.length-1]);
        ($a = ($c = command).$set_help, $a.$$p = (TMP_4 = function(){var self = TMP_4.$$s || this;

        return "save to local file system {" + (command.$parameter_help(0)) + "}"}, TMP_4.$$s = self, TMP_4), $a).call($c);
        return ($a = ($d = command).$as_action, $a.$$p = (TMP_5 = function(args){var self = TMP_5.$$s || this, $a, $b, TMP_6, $c, TMP_7, abc_code = nil, metadata = nil, filebase = nil, rootpath = nil, print_variants = nil, pdfs = nil, name = nil;
          if (self.editor == null) self.editor = nil;
          if (self.abc_transformer == null) self.abc_transformer = nil;
          if (self.music_model == null) self.music_model = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        abc_code = self.editor.$get_text();
          metadata = self.abc_transformer.$get_metadata(abc_code);
          filebase = metadata['$[]']("F");
          $gvars.log.$debug("" + (metadata.$to_s()) + " (" + ("controller-nw") + " " + (210) + ")");
          if (filebase !== false && filebase !== nil) {
            filebase = filebase.$split("\n").$first()
            } else {
            self.$raise("Filename not specified in song add an F: instruction")
          };
          rootpath = args['$[]']("path");
          $gvars.log.$info("saving to " + (rootpath));
          self.$layout_harpnotes();
          self.$render_previews();
          print_variants = self.music_model.$harpnote_options()['$[]']("print");
          pdfs = $hash2([], {});
          ($a = ($b = print_variants.$each_with_index()).$map, $a.$$p = (TMP_6 = function(print_variant, index){var self = TMP_6.$$s || this, filename = nil;
if (print_variant == null) print_variant = nil;if (index == null) index = nil;
          filename = print_variant['$[]']("title").$gsub(/[^a-zA-Z0-9\-\_]/, "_");
            pdfs['$[]=']("" + (rootpath) + "/" + (filebase) + "_" + (print_variant['$[]']("title")) + "_a3.pdf", self.$render_a3(index).$output("blob"));
            return pdfs['$[]=']("" + (rootpath) + "/" + (filebase) + "_" + (print_variant['$[]']("title")) + "_a4.pdf", self.$render_a4(index).$output("blob"));}, TMP_6.$$s = self, TMP_6), $a).call($b);
          var fs = require('fs');
          ($a = ($c = pdfs).$each, $a.$$p = (TMP_7 = function(name, pdfdata){var self = TMP_7.$$s || this;
            if ($gvars.log == null) $gvars.log = nil;
if (name == null) name = nil;if (pdfdata == null) pdfdata = nil;
          
            fs.writeFileSync(name, pdfdata)
          ;
            return $gvars.log.$info(name);}, TMP_7.$$s = self, TMP_7), $a).call($c);
          name = "" + (rootpath) + "/" + (filebase) + ".abc";
          fs.writeFileSync(name, self.editor.$get_text())  ;
          return $gvars.log.$info("save abco to " + (name));}, TMP_5.$$s = self, TMP_5), $a).call($d);}, TMP_1.$$s = self, TMP_1), $a).call($b, "_fsave");
      return ($a = ($c = self.commands).$add_command, $a.$$p = (TMP_8 = function(command){var self = TMP_8.$$s || this, $a, $b, TMP_9, $c, TMP_11, $d, TMP_12, $e, TMP_13;
if (command == null) command = nil;
      ($a = ($b = command).$add_parameter, $a.$$p = (TMP_9 = function(p){var self = TMP_9.$$s || this, $a, $b, TMP_10;
if (p == null) p = nil;
        return ($a = ($b = p).$set_help, $a.$$p = (TMP_10 = function(){var self = TMP_10.$$s || this;

          return "path to open"}, TMP_10.$$s = self, TMP_10), $a).call($b)}, TMP_9.$$s = self, TMP_9), $a).call($b, "path", "string");
        ($a = ($c = command).$set_help, $a.$$p = (TMP_11 = function(){var self = TMP_11.$$s || this;

        return "read file from local filesystem " + (command.$parameter_help(0))}, TMP_11.$$s = self, TMP_11), $a).call($c);
        ($a = ($d = command).$as_action, $a.$$p = (TMP_12 = function(args){var self = TMP_12.$$s || this, rootpath = nil, text = nil, nwdir = nil, e = nil;
          if (self.editor == null) self.editor = nil;
          if (self.systemstatus == null) self.systemstatus = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        args['$[]=']("oldval", $hash2(["text", "nwworkdir"], {"text": self.editor.$get_text(), "nwworkdir": self.systemstatus['$[]']("nwworkingdir")}));
          rootpath = args['$[]']("path");
          try {
          var fs = require('fs');
            text = fs.readFileSync(rootpath).toString();;
            nwdir = rootpath.$match(/(.*)([\/\\].+)/)['$[]'](1);
            self.$set_status($hash2(["nwworkingdir"], {"nwworkingdir": nwdir}));
            $gvars.log.$info("opened " + (rootpath));
            return self.editor.$set_text(text);
          } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
            return $gvars.log.$error(e.$message())
            }else { throw $err; }
          };}, TMP_12.$$s = self, TMP_12), $a).call($d);
        return ($a = ($e = command).$as_inverse, $a.$$p = (TMP_13 = function(args){var self = TMP_13.$$s || this;
          if (self.editor == null) self.editor = nil;
if (args == null) args = nil;
        self.$set_status($hash2(["nwworkdir"], {"nwworkdir": args['$[]']("oldval")['$[]']("nwworkingdir")}));
          return self.editor.$set_text(args['$[]']("oldval")['$[]']("text"));}, TMP_13.$$s = self, TMP_13), $a).call($e);}, TMP_8.$$s = self, TMP_8), $a).call($c, "_fopen");
    }, nil) && '__ic_06_node_fs_commands';
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["controller_command_definitions"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $gvars = Opal.gvars, $hash2 = Opal.hash2, $range = Opal.range;

  Opal.add_stubs(['$private', '$info', '$add_command', '$undoable=', '$set_help', '$as_action', '$message', '$join', '$help_string_style', '$add_parameter', '$set_default', '$[]', '$parameter_help', '$set_status', '$to_i', '$render_previews', '$loglevel=', '$loglevel', '$keys', '$error', '$undo', '$redo', '$map', '$first', '$name', '$last', '$history', '$undostack', '$redostack', '$===', '$play_abc', '$stop_play_abc', '$gsub', '$raise', '$[]=', '$get_text', '$set_text', '$as_inverse', '$get_metadata', '$update', '$list', '$retrieve', '$command_tokens', '$new', '$app_name=', '$then', '$app_name', '$authenticate', '$to_s', '$select', '$=~', '$read_dir', '$debug', '$split', '$layout_harpnotes', '$harpnote_options', '$write_file', '$output', '$render_a3', '$render_a4', '$each', '$push', '$fail', '$when', '$add_metadata', '$read_file', '$load_demo_tune']);
  return (function($base, $super) {
    function $Controller(){};
    var self = $Controller = $klass($base, $super, 'Controller', $Controller);

    var def = self.$$proto, $scope = self.$$scope;

    def.commands = nil;
    self.$private();

    def.$__ic_01_internal_commands = function() {
      var $a, $b, TMP_1, $c, TMP_4, $d, TMP_10, $e, TMP_16, $f, TMP_22, $g, TMP_25, $h, TMP_28, $i, TMP_32, $j, TMP_36, self = this;
      if ($gvars.log == null) $gvars.log = nil;

      $gvars.log.$info("registering commands");
      ($a = ($b = self.commands).$add_command, $a.$$p = (TMP_1 = function(c){var self = TMP_1.$$s || this, $a, $b, TMP_2, $c, TMP_3;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_2 = function(){var self = TMP_2.$$s || this;

        return "this help"}, TMP_2.$$s = self, TMP_2), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_3 = function(){var self = TMP_3.$$s || this;
          if (self.commands == null) self.commands = nil;
          if ($gvars.log == null) $gvars.log = nil;

        return $gvars.log.$message("<pre>" + (self.commands.$help_string_style().$join("\n")) + "</pre>")}, TMP_3.$$s = self, TMP_3), $a).call($c);}, TMP_1.$$s = self, TMP_1), $a).call($b, "help");
      ($a = ($c = self.commands).$add_command, $a.$$p = (TMP_4 = function(command){var self = TMP_4.$$s || this, $a, $b, TMP_5, $c, TMP_8, $d, TMP_9;
if (command == null) command = nil;
      ($a = ($b = command).$add_parameter, $a.$$p = (TMP_5 = function(p){var self = TMP_5.$$s || this, $a, $b, TMP_6, $c, TMP_7;
if (p == null) p = nil;
        ($a = ($b = p).$set_default, $a.$$p = (TMP_6 = function(){var self = TMP_6.$$s || this;
            if (self.systemstatus == null) self.systemstatus = nil;

          return self.systemstatus['$[]']("view")}, TMP_6.$$s = self, TMP_6), $a).call($b);
          return ($a = ($c = p).$set_help, $a.$$p = (TMP_7 = function(){var self = TMP_7.$$s || this;
            if (self.systemstatus == null) self.systemstatus = nil;

          return "id of the view to be used for preview [" + (self.systemstatus['$[]']("view")) + "]"}, TMP_7.$$s = self, TMP_7), $a).call($c);}, TMP_5.$$s = self, TMP_5), $a).call($b, "view", "integer");
        ($a = ($c = command).$set_help, $a.$$p = (TMP_8 = function(){var self = TMP_8.$$s || this;

        return "set current view  " + (command.$parameter_help(0)) + " and redisplay"}, TMP_8.$$s = self, TMP_8), $a).call($c);
        (($a = [false]), $d = command, $d['$undoable='].apply($d, $a), $a[$a.length-1]);
        return ($a = ($d = command).$as_action, $a.$$p = (TMP_9 = function(args){var self = TMP_9.$$s || this;
if (args == null) args = nil;
        self.$set_status($hash2(["view"], {"view": args['$[]']("view").$to_i()}));
          return self.$render_previews();}, TMP_9.$$s = self, TMP_9), $a).call($d);}, TMP_4.$$s = self, TMP_4), $a).call($c, "view");
      ($a = ($d = self.commands).$add_command, $a.$$p = (TMP_10 = function(c){var self = TMP_10.$$s || this, $a, $b, TMP_11, $c, TMP_12, $d, TMP_15;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_11 = function(){var self = TMP_11.$$s || this;

        return "set log level to " + (c.$parameter_help(0))}, TMP_11.$$s = self, TMP_11), $a).call($b);
        ($a = ($c = c).$add_parameter, $a.$$p = (TMP_12 = function(parameter){var self = TMP_12.$$s || this, $a, $b, TMP_13, $c, TMP_14;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a.$$p = (TMP_13 = function(){var self = TMP_13.$$s || this;

          return "warning"}, TMP_13.$$s = self, TMP_13), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a.$$p = (TMP_14 = function(){var self = TMP_14.$$s || this;

          return "error | warning | info | debug"}, TMP_14.$$s = self, TMP_14), $a).call($c);}, TMP_12.$$s = self, TMP_12), $a).call($c, "level", "string");
        return ($a = ($d = c).$as_action, $a.$$p = (TMP_15 = function(args){var self = TMP_15.$$s || this, $a, $b;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        (($a = [args['$[]']("level")]), $b = $gvars.log, $b['$loglevel='].apply($b, $a), $a[$a.length-1]);
          return self.$set_status($hash2(["loglevel"], {"loglevel": $gvars.log.$loglevel()}));}, TMP_15.$$s = self, TMP_15), $a).call($d);}, TMP_10.$$s = self, TMP_10), $a).call($d, "loglevel");
      ($a = ($e = self.commands).$add_command, $a.$$p = (TMP_16 = function(c){var self = TMP_16.$$s || this, $a, $b, TMP_17, $c, TMP_18, $d, TMP_21, values = nil;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_17 = function(){var self = TMP_17.$$s || this;

        return "turnon autorefresh"}, TMP_17.$$s = self, TMP_17), $a).call($b);
        values = $hash2(["on", "off", "remote"], {"on": "on", "off": "off", "remote": "remote"});
        ($a = ($c = c).$add_parameter, $a.$$p = (TMP_18 = function(parameter){var self = TMP_18.$$s || this, $a, $b, TMP_19, $c, TMP_20;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a.$$p = (TMP_19 = function(){var self = TMP_19.$$s || this;

          return "true"}, TMP_19.$$s = self, TMP_19), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a.$$p = (TMP_20 = function(){var self = TMP_20.$$s || this;

          return "" + (values.$keys().$join(" | "))}, TMP_20.$$s = self, TMP_20), $a).call($c);}, TMP_18.$$s = self, TMP_18), $a).call($c, "value", "string");
        return ($a = ($d = c).$as_action, $a.$$p = (TMP_21 = function(args){var self = TMP_21.$$s || this, result = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        result = values['$[]'](args['$[]']("value"));
          if (result !== false && result !== nil) {
            return self.$set_status($hash2(["autorefresh"], {"autorefresh": result}))
            } else {
            return $gvars.log.$error("wrong parameter " + (args['$[]']("value")) + ", " + (c.$parameter_help(0)))
          };}, TMP_21.$$s = self, TMP_21), $a).call($d);}, TMP_16.$$s = self, TMP_16), $a).call($e, "autorefresh");
      ($a = ($f = self.commands).$add_command, $a.$$p = (TMP_22 = function(c){var self = TMP_22.$$s || this, $a, $b, TMP_23, $c, TMP_24;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_23 = function(){var self = TMP_23.$$s || this;

        return "undo last command"}, TMP_23.$$s = self, TMP_23), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_24 = function(a){var self = TMP_24.$$s || this;
          if (self.commands == null) self.commands = nil;
if (a == null) a = nil;
        return self.commands.$undo()}, TMP_24.$$s = self, TMP_24), $a).call($c);}, TMP_22.$$s = self, TMP_22), $a).call($f, "undo");
      ($a = ($g = self.commands).$add_command, $a.$$p = (TMP_25 = function(c){var self = TMP_25.$$s || this, $a, $b, TMP_26, $c, TMP_27;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_26 = function(){var self = TMP_26.$$s || this;

        return "redo last command"}, TMP_26.$$s = self, TMP_26), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_27 = function(a){var self = TMP_27.$$s || this;
          if (self.commands == null) self.commands = nil;
if (a == null) a = nil;
        return self.commands.$redo()}, TMP_27.$$s = self, TMP_27), $a).call($c);}, TMP_25.$$s = self, TMP_25), $a).call($g, "redo");
      ($a = ($h = self.commands).$add_command, $a.$$p = (TMP_28 = function(c){var self = TMP_28.$$s || this, $a, $b, TMP_29, $c, TMP_30;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_29 = function(){var self = TMP_29.$$s || this;

        return "show history"}, TMP_29.$$s = self, TMP_29), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_30 = function(a){var self = TMP_30.$$s || this, $a, $b, TMP_31, history = nil;
          if (self.commands == null) self.commands = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (a == null) a = nil;
        history = ($a = ($b = self.commands.$history()).$map, $a.$$p = (TMP_31 = function(c){var self = TMP_31.$$s || this;
if (c == null) c = nil;
          return "" + (c.$first()) + ": " + (c['$[]'](1).$name()) + "(" + (c.$last()) + ")"}, TMP_31.$$s = self, TMP_31), $a).call($b);
          return $gvars.log.$message("<pre>" + (history.$join("\n")) + "</pre>");}, TMP_30.$$s = self, TMP_30), $a).call($c);}, TMP_28.$$s = self, TMP_28), $a).call($h, "history");
      ($a = ($i = self.commands).$add_command, $a.$$p = (TMP_32 = function(c){var self = TMP_32.$$s || this, $a, $b, TMP_33, $c, TMP_34;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_33 = function(){var self = TMP_33.$$s || this;

        return "show undo stack"}, TMP_33.$$s = self, TMP_33), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_34 = function(a){var self = TMP_34.$$s || this, $a, $b, TMP_35, history = nil;
          if (self.commands == null) self.commands = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (a == null) a = nil;
        history = ($a = ($b = self.commands.$undostack()).$map, $a.$$p = (TMP_35 = function(c){var self = TMP_35.$$s || this;
if (c == null) c = nil;
          return "" + (c.$first()) + ": " + (c['$[]'](1).$name()) + "(" + (c.$last()) + ")"}, TMP_35.$$s = self, TMP_35), $a).call($b);
          return $gvars.log.$message("<pre>" + (history.$join("\n")) + "</pre>");}, TMP_34.$$s = self, TMP_34), $a).call($c);}, TMP_32.$$s = self, TMP_32), $a).call($i, "showundo");
      return ($a = ($j = self.commands).$add_command, $a.$$p = (TMP_36 = function(c){var self = TMP_36.$$s || this, $a, $b, TMP_37, $c, TMP_38;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_37 = function(){var self = TMP_37.$$s || this;

        return "show redo stack"}, TMP_37.$$s = self, TMP_37), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_38 = function(a){var self = TMP_38.$$s || this, $a, $b, TMP_39, history = nil;
          if (self.commands == null) self.commands = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (a == null) a = nil;
        history = ($a = ($b = self.commands.$redostack()).$map, $a.$$p = (TMP_39 = function(c){var self = TMP_39.$$s || this;
if (c == null) c = nil;
          return "" + (c.$first()) + ": " + (c['$[]'](1).$name()) + "(" + (c.$last()) + ")"}, TMP_39.$$s = self, TMP_39), $a).call($b);
          return $gvars.log.$message("<pre>" + (history.$join("\n")) + "</pre>");}, TMP_38.$$s = self, TMP_38), $a).call($c);}, TMP_36.$$s = self, TMP_36), $a).call($j, "showredo");
    };

    def.$__ic_02_play_commands = function() {
      var $a, $b, TMP_40, $c, TMP_46, $d, TMP_49, self = this;

      ($a = ($b = self.commands).$add_command, $a.$$p = (TMP_40 = function(c){var self = TMP_40.$$s || this, $a, $b, TMP_41, $c, TMP_42, $d, TMP_45;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_41 = function(){var self = TMP_41.$$s || this;

        return "play song " + (c.$parameter_help(0))}, TMP_41.$$s = self, TMP_41), $a).call($b);
        ($a = ($c = c).$add_parameter, $a.$$p = (TMP_42 = function(parameter){var self = TMP_42.$$s || this, $a, $b, TMP_43, $c, TMP_44;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a.$$p = (TMP_43 = function(){var self = TMP_43.$$s || this;

          return "ff"}, TMP_43.$$s = self, TMP_43), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a.$$p = (TMP_44 = function(){var self = TMP_44.$$s || this;

          return "r(all | ff | sel): range to play"}, TMP_44.$$s = self, TMP_44), $a).call($c);}, TMP_42.$$s = self, TMP_42), $a).call($c, "range", "string");
        return ($a = ($d = c).$as_action, $a.$$p = (TMP_45 = function(argument){var self = TMP_45.$$s || this, $case = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (argument == null) argument = nil;
        return (function() {$case = argument['$[]']("range");if ("sel"['$===']($case)) {return self.$play_abc("selection")}else if ("ff"['$===']($case)) {return self.$play_abc("selection_ff")}else if ("all"['$===']($case)) {return self.$play_abc()}else {return $gvars.log.$error("wrong range to play")}})()}, TMP_45.$$s = self, TMP_45), $a).call($d);}, TMP_40.$$s = self, TMP_40), $a).call($b, "p");
      ($a = ($c = self.commands).$add_command, $a.$$p = (TMP_46 = function(c){var self = TMP_46.$$s || this, $a, $b, TMP_47, $c, TMP_48;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_47 = function(){var self = TMP_47.$$s || this;

        return "stop playing"}, TMP_47.$$s = self, TMP_47), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_48 = function(a){var self = TMP_48.$$s || this;
if (a == null) a = nil;
        return self.$stop_play_abc()}, TMP_48.$$s = self, TMP_48), $a).call($c);}, TMP_46.$$s = self, TMP_46), $a).call($c, "stop");
      return ($a = ($d = self.commands).$add_command, $a.$$p = (TMP_49 = function(c){var self = TMP_49.$$s || this, $a, $b, TMP_50, $c, TMP_51;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_50 = function(){var self = TMP_50.$$s || this;

        return "refresh"}, TMP_50.$$s = self, TMP_50), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_51 = function(a){var self = TMP_51.$$s || this;
if (a == null) a = nil;
        return self.$render_previews()}, TMP_51.$$s = self, TMP_51), $a).call($c);}, TMP_49.$$s = self, TMP_49), $a).call($d, "render");
    };

    def.$__ic_03_create_commands = function() {
      var $a, $b, TMP_52, self = this;

      return ($a = ($b = self.commands).$add_command, $a.$$p = (TMP_52 = function(c){var self = TMP_52.$$s || this, $a, $b, TMP_53, $c, TMP_54, $d, TMP_56, $e, TMP_59, $f, TMP_60;
if (c == null) c = nil;
      ($a = ($b = c).$set_help, $a.$$p = (TMP_53 = function(){var self = TMP_53.$$s || this;

        return "create song " + (c.$parameter_help(0)) + " " + (c.$parameter_help(1))}, TMP_53.$$s = self, TMP_53), $a).call($b);
        ($a = ($c = c).$add_parameter, $a.$$p = (TMP_54 = function(parameter){var self = TMP_54.$$s || this, $a, $b, TMP_55;
if (parameter == null) parameter = nil;
        return ($a = ($b = parameter).$set_help, $a.$$p = (TMP_55 = function(){var self = TMP_55.$$s || this;

          return "value for X: line, a unique id"}, TMP_55.$$s = self, TMP_55), $a).call($b)}, TMP_54.$$s = self, TMP_54), $a).call($c, "id", "string");
        ($a = ($d = c).$add_parameter, $a.$$p = (TMP_56 = function(parameter){var self = TMP_56.$$s || this, $a, $b, TMP_57, $c, TMP_58;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a.$$p = (TMP_57 = function(){var self = TMP_57.$$s || this;

          return "untitled"}, TMP_57.$$s = self, TMP_57), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a.$$p = (TMP_58 = function(){var self = TMP_58.$$s || this;

          return "Title of the song"}, TMP_58.$$s = self, TMP_58), $a).call($c);}, TMP_56.$$s = self, TMP_56), $a).call($d, "title", "string");
        ($a = ($e = c).$as_action, $a.$$p = (TMP_59 = function(args){var self = TMP_59.$$s || this, song_id = nil, song_title = nil, filename = nil, template = nil;
          if (self.editor == null) self.editor = nil;
if (args == null) args = nil;
        song_id = args['$[]']("id");
          song_title = args['$[]']("title");
          filename = song_title.$gsub(/[^a-zA-Z0-9\-\_]/, "_");
          if (song_id !== false && song_id !== nil) {
            } else {
            self.$raise("no id specified")
          };
          if (song_title !== false && song_title !== nil) {
            } else {
            self.$raise("no title specified")
          };
          template = "X:" + (song_id) + "\nF:" + (song_id) + "_" + (filename) + "\nT:" + (song_title) + "\nC:\nS:\nM:4/4\nL:1/4\nQ:1/4=120\nK:C\n%%score T1 T2  B1 B2\nV:T1 clef=treble-8 name=\"Sopran\" snm=\"S\"\nC\nV:T2 clef=treble-8  name=\"Alt\" snm=\"A\"\nC,\n\n%%%%zupfnoter.config\n\n{\n  \"produce\": [\"1\", \"2\"]\n}\n";
          args['$[]=']("oldval", self.editor.$get_text());
          self.editor.$set_text(template);
          return self.$set_status($hash2(["music_model"], {"music_model": "new"}));}, TMP_59.$$s = self, TMP_59), $a).call($e);
        return ($a = ($f = c).$as_inverse, $a.$$p = (TMP_60 = function(args){var self = TMP_60.$$s || this;
          if (self.editor == null) self.editor = nil;
if (args == null) args = nil;
        return self.editor.$set_text(args['$[]']("oldval"))}, TMP_60.$$s = self, TMP_60), $a).call($f);}, TMP_52.$$s = self, TMP_52), $a).call($b, "c");
    };

    def.$__ic_04_localstore_commands = function() {
      var $a, $b, TMP_61, $c, TMP_64, $d, TMP_68, self = this;

      ($a = ($b = self.commands).$add_command, $a.$$p = (TMP_61 = function(c){var self = TMP_61.$$s || this, $a, $b, TMP_62, $c, TMP_63;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_62 = function(){var self = TMP_62.$$s || this;

        return "save to localstore"}, TMP_62.$$s = self, TMP_62), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_63 = function(){var self = TMP_63.$$s || this, abc_code = nil, metadata = nil, filename = nil;
          if (self.editor == null) self.editor = nil;
          if (self.abc_transformer == null) self.abc_transformer = nil;
          if (self.songbook == null) self.songbook = nil;
          if ($gvars.log == null) $gvars.log = nil;

        abc_code = self.editor.$get_text();
          metadata = self.abc_transformer.$get_metadata(abc_code);
          filename = "" + (metadata['$[]']("X")) + "_" + (metadata['$[]']("T"));
          self.songbook.$update(metadata['$[]']("X"), abc_code, metadata['$[]']("T"), true);
          self.$set_status($hash2(["music_model"], {"music_model": "saved to localstore"}));
          return $gvars.log.$message("saved to '" + (filename) + "'");}, TMP_63.$$s = self, TMP_63), $a).call($c);}, TMP_61.$$s = self, TMP_61), $a).call($b, "lsave");
      ($a = ($c = self.commands).$add_command, $a.$$p = (TMP_64 = function(c){var self = TMP_64.$$s || this, $a, $b, TMP_65, $c, TMP_66;
if (c == null) c = nil;
      (($a = [false]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$set_help, $a.$$p = (TMP_65 = function(){var self = TMP_65.$$s || this;

        return "list files in localstore"}, TMP_65.$$s = self, TMP_65), $a).call($b);
        return ($a = ($c = c).$as_action, $a.$$p = (TMP_66 = function(a){var self = TMP_66.$$s || this, $a, $b, TMP_67;
          if (self.songbook == null) self.songbook = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (a == null) a = nil;
        return $gvars.log.$message($rb_plus($rb_plus("<pre>", ($a = ($b = self.songbook.$list()).$map, $a.$$p = (TMP_67 = function(k, v){var self = TMP_67.$$s || this;
if (k == null) k = nil;if (v == null) v = nil;
          return "" + (k) + "_" + (v)}, TMP_67.$$s = self, TMP_67), $a).call($b).$join("\n")), "</pre>"))}, TMP_66.$$s = self, TMP_66), $a).call($c);}, TMP_64.$$s = self, TMP_64), $a).call($c, "lls");
      return ($a = ($d = self.commands).$add_command, $a.$$p = (TMP_68 = function(c){var self = TMP_68.$$s || this, $a, $b, TMP_69, $c, TMP_71, $d, TMP_72, $e, TMP_73;
if (c == null) c = nil;
      (($a = [true]), $b = c, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = c).$add_parameter, $a.$$p = (TMP_69 = function(parameter){var self = TMP_69.$$s || this, $a, $b, TMP_70;
if (parameter == null) parameter = nil;
        return ($a = ($b = parameter).$set_help, $a.$$p = (TMP_70 = function(){var self = TMP_70.$$s || this;

          return "id of the song to be loaded"}, TMP_70.$$s = self, TMP_70), $a).call($b)}, TMP_69.$$s = self, TMP_69), $a).call($b, "id", "string");
        ($a = ($c = c).$set_help, $a.$$p = (TMP_71 = function(){var self = TMP_71.$$s || this;

        return "open song from local store  " + (c.$parameter_help(0))}, TMP_71.$$s = self, TMP_71), $a).call($c);
        ($a = ($d = c).$as_action, $a.$$p = (TMP_72 = function(args){var self = TMP_72.$$s || this, $a, payload = nil;
          if (self.songbook == null) self.songbook = nil;
          if (self.editor == null) self.editor = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        if ((($a = args['$[]']("id")) !== nil && (!$a.$$is_boolean || $a == true))) {
            payload = self.songbook.$retrieve(args['$[]']("id"));
            if (payload !== false && payload !== nil) {
              args['$[]=']("oldval", self.editor.$get_text());
              return self.editor.$set_text(payload);
              } else {
              return $gvars.log.$error("song " + (self.$command_tokens().$last()) + " not found")
            };
            } else {
            return $gvars.log.$error("plase add a song number")
          }}, TMP_72.$$s = self, TMP_72), $a).call($d);
        return ($a = ($e = c).$as_inverse, $a.$$p = (TMP_73 = function(args){var self = TMP_73.$$s || this;
          if (self.editor == null) self.editor = nil;
if (args == null) args = nil;
        return self.editor.$set_text(args['$[]']("oldval"))}, TMP_73.$$s = self, TMP_73), $a).call($e);}, TMP_68.$$s = self, TMP_68), $a).call($d, "lopen");
    };

    return (def.$__ic_05_dropbox_commands = function() {
      var $a, $b, TMP_74, $c, TMP_85, $d, TMP_94, $e, TMP_101, $f, TMP_104, $g, TMP_115, $h, TMP_127, self = this;

      ($a = ($b = self.commands).$add_command, $a.$$p = (TMP_74 = function(command){var self = TMP_74.$$s || this, $a, $b, TMP_75, $c, TMP_78, $d, TMP_81, $e, TMP_82, $f, TMP_84;
if (command == null) command = nil;
      ($a = ($b = command).$add_parameter, $a.$$p = (TMP_75 = function(parameter){var self = TMP_75.$$s || this, $a, $b, TMP_76, $c, TMP_77;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a.$$p = (TMP_76 = function(){var self = TMP_76.$$s || this;

          return "app"}, TMP_76.$$s = self, TMP_76), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a.$$p = (TMP_77 = function(){var self = TMP_77.$$s || this;

          return "(app | full) app: app only | full: full dropbox"}, TMP_77.$$s = self, TMP_77), $a).call($c);}, TMP_75.$$s = self, TMP_75), $a).call($b, "scope", "string");
        ($a = ($c = command).$add_parameter, $a.$$p = (TMP_78 = function(parameter){var self = TMP_78.$$s || this, $a, $b, TMP_79, $c, TMP_80;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a.$$p = (TMP_79 = function(){var self = TMP_79.$$s || this;

          return "/"}, TMP_79.$$s = self, TMP_79), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a.$$p = (TMP_80 = function(){var self = TMP_80.$$s || this;

          return "path to set in dropbox"}, TMP_80.$$s = self, TMP_80), $a).call($c);}, TMP_78.$$s = self, TMP_78), $a).call($c, "path", "string");
        ($a = ($d = command).$set_help, $a.$$p = (TMP_81 = function(){var self = TMP_81.$$s || this;

        return "dropbox login for " + (command.$parameter_help(0))}, TMP_81.$$s = self, TMP_81), $a).call($d);
        ($a = ($e = command).$as_action, $a.$$p = (TMP_82 = function(args){var self = TMP_82.$$s || this, $a, $b, TMP_83, $case = nil;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        $case = args['$[]']("scope");if ("full"['$===']($case)) {self.dropboxclient = (((($scope.get('Opal')).$$scope.get('DropboxJs'))).$$scope.get('Client')).$new("us2s6tq6bubk6xh");
          (($a = ["full Dropbox"]), $b = self.dropboxclient, $b['$app_name='].apply($b, $a), $a[$a.length-1]);
          self.dropboxpath = args['$[]']("path");}else if ("app"['$===']($case)) {self.dropboxclient = (((($scope.get('Opal')).$$scope.get('DropboxJs'))).$$scope.get('Client')).$new("xr3zna7wrp75zax");
          (($a = ["App folder only"]), $b = self.dropboxclient, $b['$app_name='].apply($b, $a), $a[$a.length-1]);
          self.dropboxpath = args['$[]']("path");}else {$gvars.log.$error("select app | full")};
          return ($a = ($b = self.dropboxclient.$authenticate()).$then, $a.$$p = (TMP_83 = function(){var self = TMP_83.$$s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;
            if (self.dropboxpath == null) self.dropboxpath = nil;
            if ($gvars.log == null) $gvars.log = nil;

          self.$set_status($hash2(["dropbox"], {"dropbox": "" + (self.dropboxclient.$app_name()) + ": " + (self.dropboxpath)}));
            return $gvars.log.$message("logged in at dropbox with " + (args['$[]']("scope")) + " access");}, TMP_83.$$s = self, TMP_83), $a).call($b);}, TMP_82.$$s = self, TMP_82), $a).call($e);
        return ($a = ($f = command).$as_inverse, $a.$$p = (TMP_84 = function(args){var self = TMP_84.$$s || this;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        self.$set_status($hash2(["dropbox"], {"dropbox": "logged out"}));
          $gvars.log.$message("logged out from dropbox");
          return self.dropboxclient = nil;}, TMP_84.$$s = self, TMP_84), $a).call($f);}, TMP_74.$$s = self, TMP_74), $a).call($b, "dlogin");
      ($a = ($c = self.commands).$add_command, $a.$$p = (TMP_85 = function(command){var self = TMP_85.$$s || this, $a, $b, TMP_86, $c, TMP_89, $d, TMP_90;
if (command == null) command = nil;
      (($a = [false]), $b = command, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = command).$add_parameter, $a.$$p = (TMP_86 = function(parameter){var self = TMP_86.$$s || this, $a, $b, TMP_87, $c, TMP_88;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a.$$p = (TMP_87 = function(){var self = TMP_87.$$s || this, $a;
            if (self.dropboxpath == null) self.dropboxpath = nil;

          return ((($a = self.dropboxpath) !== false && $a !== nil) ? $a : "/")}, TMP_87.$$s = self, TMP_87), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a.$$p = (TMP_88 = function(){var self = TMP_88.$$s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return "path in dropbox " + (self.dropboxclient.$app_name())}, TMP_88.$$s = self, TMP_88), $a).call($c);}, TMP_86.$$s = self, TMP_86), $a).call($b, "path", "string");
        ($a = ($c = command).$set_help, $a.$$p = (TMP_89 = function(){var self = TMP_89.$$s || this;

        return "list files in " + (command.$parameter_help(0))}, TMP_89.$$s = self, TMP_89), $a).call($c);
        return ($a = ($d = command).$as_action, $a.$$p = (TMP_90 = function(args){var self = TMP_90.$$s || this, $a, $b, TMP_91, $c, $d, TMP_93, rootpath = nil;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        rootpath = args['$[]']("path");
          $gvars.log.$message("" + (self.dropboxclient.$app_name()) + ": " + (args['$[]']("path")) + ":");
          return ($a = ($b = ($c = ($d = self.dropboxclient.$authenticate()).$then, $c.$$p = (TMP_93 = function(){var self = TMP_93.$$s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return self.dropboxclient.$read_dir(rootpath)}, TMP_93.$$s = self, TMP_93), $c).call($d)).$then, $a.$$p = (TMP_91 = function(entries){var self = TMP_91.$$s || this, $a, $b, TMP_92;
            if ($gvars.log == null) $gvars.log = nil;
if (entries == null) entries = nil;
          return $gvars.log.$message($rb_plus($rb_plus("<pre>", ($a = ($b = entries).$select, $a.$$p = (TMP_92 = function(entry){var self = TMP_92.$$s || this;
if (entry == null) entry = nil;
            return entry['$=~'](/\.abc$/)}, TMP_92.$$s = self, TMP_92), $a).call($b).$join("\n").$to_s()), "</pre>"))}, TMP_91.$$s = self, TMP_91), $a).call($b);}, TMP_90.$$s = self, TMP_90), $a).call($d);}, TMP_85.$$s = self, TMP_85), $a).call($c, "dls");
      ($a = ($d = self.commands).$add_command, $a.$$p = (TMP_94 = function(command){var self = TMP_94.$$s || this, $a, $b, TMP_95, $c, TMP_98, $d, TMP_99, $e, TMP_100;
if (command == null) command = nil;
      ($a = ($b = command).$add_parameter, $a.$$p = (TMP_95 = function(parameter){var self = TMP_95.$$s || this, $a, $b, TMP_96, $c, TMP_97;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a.$$p = (TMP_96 = function(){var self = TMP_96.$$s || this;
            if (self.dropboxpath == null) self.dropboxpath = nil;

          return self.dropboxpath}, TMP_96.$$s = self, TMP_96), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a.$$p = (TMP_97 = function(){var self = TMP_97.$$s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return "path in dropbox " + (self.dropboxclient.$app_name())}, TMP_97.$$s = self, TMP_97), $a).call($c);}, TMP_95.$$s = self, TMP_95), $a).call($b, "path", "string");
        ($a = ($c = command).$set_help, $a.$$p = (TMP_98 = function(){var self = TMP_98.$$s || this;

        return "dropbox change dir to " + (command.$parameter_help(0))}, TMP_98.$$s = self, TMP_98), $a).call($c);
        ($a = ($d = command).$as_action, $a.$$p = (TMP_99 = function(args){var self = TMP_99.$$s || this, rootpath = nil;
          if (self.dropboxpath == null) self.dropboxpath = nil;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        rootpath = args['$[]']("path");
          args['$[]=']("oldval", self.dropboxpath);
          self.dropboxpath = rootpath;
          self.$set_status($hash2(["dropbox"], {"dropbox": "" + (self.dropboxclient.$app_name()) + ": " + (self.dropboxpath)}));
          return $gvars.log.$message("dropbox path changed to " + (self.dropboxpath));}, TMP_99.$$s = self, TMP_99), $a).call($d);
        return ($a = ($e = command).$as_inverse, $a.$$p = (TMP_100 = function(args){var self = TMP_100.$$s || this;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if (self.dropboxpath == null) self.dropboxpath = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        self.dropboxpath = args['$[]']("oldval");
          self.$set_status($hash2(["dropbox"], {"dropbox": "" + (self.dropboxclient.$app_name()) + ": " + (self.dropboxpath)}));
          return $gvars.log.$message("dropbox path changed back to " + (self.dropboxpath));}, TMP_100.$$s = self, TMP_100), $a).call($e);}, TMP_94.$$s = self, TMP_94), $a).call($d, "dcd");
      ($a = ($e = self.commands).$add_command, $a.$$p = (TMP_101 = function(command){var self = TMP_101.$$s || this, $a, $b, TMP_102, $c, TMP_103;
if (command == null) command = nil;
      (($a = [false]), $b = command, $b['$undoable='].apply($b, $a), $a[$a.length-1]);
        ($a = ($b = command).$set_help, $a.$$p = (TMP_102 = function(){var self = TMP_102.$$s || this;

        return "show drobox path"}, TMP_102.$$s = self, TMP_102), $a).call($b);
        return ($a = ($c = command).$as_action, $a.$$p = (TMP_103 = function(args){var self = TMP_103.$$s || this;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if (self.dropboxpath == null) self.dropboxpath = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        return $gvars.log.$message("" + (self.dropboxclient.$app_name()) + ": " + (self.dropboxpath))}, TMP_103.$$s = self, TMP_103), $a).call($c);}, TMP_101.$$s = self, TMP_101), $a).call($e, "dpwd");
      ($a = ($f = self.commands).$add_command, $a.$$p = (TMP_104 = function(command){var self = TMP_104.$$s || this, $a, $b, TMP_105, $c, TMP_108, $d, TMP_109;
if (command == null) command = nil;
      ($a = ($b = command).$add_parameter, $a.$$p = (TMP_105 = function(parameter){var self = TMP_105.$$s || this, $a, $b, TMP_106, $c, TMP_107;
if (parameter == null) parameter = nil;
        ($a = ($b = parameter).$set_default, $a.$$p = (TMP_106 = function(){var self = TMP_106.$$s || this;
            if (self.dropboxpath == null) self.dropboxpath = nil;

          return self.dropboxpath}, TMP_106.$$s = self, TMP_106), $a).call($b);
          return ($a = ($c = parameter).$set_help, $a.$$p = (TMP_107 = function(){var self = TMP_107.$$s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return "path to save in " + (self.dropboxclient.$app_name())}, TMP_107.$$s = self, TMP_107), $a).call($c);}, TMP_105.$$s = self, TMP_105), $a).call($b, "path", "string");
        (($a = [false]), $c = command, $c['$undoable='].apply($c, $a), $a[$a.length-1]);
        ($a = ($c = command).$set_help, $a.$$p = (TMP_108 = function(){var self = TMP_108.$$s || this;

        return "save to dropbox {" + (command.$parameter_help(0)) + "}"}, TMP_108.$$s = self, TMP_108), $a).call($c);
        return ($a = ($d = command).$as_action, $a.$$p = (TMP_109 = function(args){var self = TMP_109.$$s || this, $a, $b, TMP_110, $c, TMP_113, $d, $e, TMP_114, $f, abc_code = nil, metadata = nil, filebase = nil, print_variants = nil, rootpath = nil, save_promises = nil;
          if (self.editor == null) self.editor = nil;
          if (self.abc_transformer == null) self.abc_transformer = nil;
          if (self.music_model == null) self.music_model = nil;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        abc_code = self.editor.$get_text();
          metadata = self.abc_transformer.$get_metadata(abc_code);
          filebase = metadata['$[]']("F");
          $gvars.log.$debug("" + (metadata.$to_s()) + " (" + ("controller_command_definitions") + " " + (386) + ")");
          if (filebase !== false && filebase !== nil) {
            filebase = filebase.$split("\n").$first()
            } else {
            self.$raise("Filename not specified in song add an F: instruction")
          };
          self.$layout_harpnotes();
          self.$render_previews();
          print_variants = self.music_model.$harpnote_options()['$[]']("print");
          rootpath = args['$[]']("path");
          save_promises = [];
          ($a = ($b = self.dropboxclient.$authenticate()).$then, $a.$$p = (TMP_110 = function(){var self = TMP_110.$$s || this, $a, $b, TMP_111, $c, TMP_112, pdfs = nil;
            if (self.dropboxclient == null) self.dropboxclient = nil;
            if (self.editor == null) self.editor = nil;

          save_promises = [self.dropboxclient.$write_file("" + (rootpath) + (filebase) + ".abc", self.editor.$get_text())];
            pdfs = $hash2([], {});
            ($a = ($b = print_variants).$map, $a.$$p = (TMP_111 = function(print_variant){var self = TMP_111.$$s || this, index = nil, filename = nil;
if (print_variant == null) print_variant = nil;
            index = print_variant['$[]']("view_id");
              filename = print_variant['$[]']("title").$gsub(/[^a-zA-Z0-9\-\_]/, "_");
              pdfs['$[]=']("" + (rootpath) + (filebase) + "_" + (print_variant['$[]']("title")) + "_a3.pdf", self.$render_a3(index).$output("blob"));
              return pdfs['$[]=']("" + (rootpath) + (filebase) + "_" + (print_variant['$[]']("title")) + "_a4.pdf", self.$render_a4(index).$output("blob"));}, TMP_111.$$s = self, TMP_111), $a).call($b);
            return ($a = ($c = pdfs).$each, $a.$$p = (TMP_112 = function(name, pdfdata){var self = TMP_112.$$s || this;
              if (self.dropboxclient == null) self.dropboxclient = nil;
if (name == null) name = nil;if (pdfdata == null) pdfdata = nil;
            return save_promises.$push(self.dropboxclient.$write_file(name, pdfdata))}, TMP_112.$$s = self, TMP_112), $a).call($c);}, TMP_110.$$s = self, TMP_110), $a).call($b);
          return ($a = ($c = ($d = ($e = ($f = $scope.get('Promise')).$when.apply($f, [].concat(save_promises))).$then, $d.$$p = (TMP_114 = function(){var self = TMP_114.$$s || this;
            if ($gvars.log == null) $gvars.log = nil;

          self.$set_status($hash2(["music_model"], {"music_model": "saved to dropbox"}));
            return $gvars.log.$message("all files saved");}, TMP_114.$$s = self, TMP_114), $d).call($e)).$fail, $a.$$p = (TMP_113 = function(err){var self = TMP_113.$$s || this;
            if ($gvars.log == null) $gvars.log = nil;
if (err == null) err = nil;
          return $gvars.log.$error("there was an error saving files " + (err))}, TMP_113.$$s = self, TMP_113), $a).call($c);}, TMP_109.$$s = self, TMP_109), $a).call($d);}, TMP_104.$$s = self, TMP_104), $a).call($f, "dsave");
      ($a = ($g = self.commands).$add_command, $a.$$p = (TMP_115 = function(command){var self = TMP_115.$$s || this, $a, $b, TMP_116, $c, TMP_119, $d, TMP_120, $e, TMP_126;
if (command == null) command = nil;
      command.$add_parameter("fileid", "string", "file id");
        ($a = ($b = command).$add_parameter, $a.$$p = (TMP_116 = function(p){var self = TMP_116.$$s || this, $a, $b, TMP_117, $c, TMP_118;
if (p == null) p = nil;
        ($a = ($b = p).$set_default, $a.$$p = (TMP_117 = function(){var self = TMP_117.$$s || this;
            if (self.dropboxpath == null) self.dropboxpath = nil;

          return self.dropboxpath}, TMP_117.$$s = self, TMP_117), $a).call($b);
          return ($a = ($c = p).$set_help, $a.$$p = (TMP_118 = function(){var self = TMP_118.$$s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;

          return "path to save in " + (self.dropboxclient.$app_name())}, TMP_118.$$s = self, TMP_118), $a).call($c);}, TMP_116.$$s = self, TMP_116), $a).call($b, "path", "string");
        ($a = ($c = command).$set_help, $a.$$p = (TMP_119 = function(){var self = TMP_119.$$s || this;

        return "read file with " + (command.$parameter_help(0)) + ", from dropbox " + (command.$parameter_help(1))}, TMP_119.$$s = self, TMP_119), $a).call($c);
        ($a = ($d = command).$as_action, $a.$$p = (TMP_120 = function(args){var self = TMP_120.$$s || this, $a, $b, TMP_121, $c, $d, TMP_122, $e, $f, TMP_123, $g, $h, TMP_125, fileid = nil, rootpath = nil;
          if (self.editor == null) self.editor = nil;
          if (self.dropboxclient == null) self.dropboxclient = nil;
          if ($gvars.log == null) $gvars.log = nil;
if (args == null) args = nil;
        args['$[]=']("oldval", self.editor.$get_text());
          fileid = args['$[]']("fileid");
          rootpath = args['$[]']("path");
          $gvars.log.$message("get from Dropbox path " + (rootpath) + (fileid) + "_ ...:");
          return ($a = ($b = ($c = ($d = ($e = ($f = ($g = ($h = self.dropboxclient.$authenticate()).$then, $g.$$p = (TMP_125 = function(error, data){var self = TMP_125.$$s || this;
            if (self.dropboxclient == null) self.dropboxclient = nil;
if (error == null) error = nil;if (data == null) data = nil;
          return self.dropboxclient.$read_dir(rootpath)}, TMP_125.$$s = self, TMP_125), $g).call($h)).$then, $e.$$p = (TMP_123 = function(entries){var self = TMP_123.$$s || this, $a, $b, TMP_124;
            if (self.dropboxclient == null) self.dropboxclient = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (entries == null) entries = nil;
          $gvars.log.$debug("" + (entries) + " (" + ("controller_command_definitions") + " " + (444) + ")");
            fileid = ($a = ($b = entries).$select, $a.$$p = (TMP_124 = function(entry){var self = TMP_124.$$s || this;
if (entry == null) entry = nil;
            return entry['$=~']((new RegExp("" + fileid + "_.*\\.abc$")))}, TMP_124.$$s = self, TMP_124), $a).call($b).$first();
            return self.dropboxclient.$read_file("" + (rootpath) + (fileid));}, TMP_123.$$s = self, TMP_123), $e).call($f)).$then, $c.$$p = (TMP_122 = function(abc_text){var self = TMP_122.$$s || this, filebase = nil;
            if (self.abc_transformer == null) self.abc_transformer = nil;
            if (self.editor == null) self.editor = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (abc_text == null) abc_text = nil;
          $gvars.log.$debug("loaded " + (fileid) + " (" + ("controller_command_definitions") + " " + (448) + ")");
            filebase = fileid.$split(".abc")['$[]']($range(0, -1, false)).$join(".abc");
            abc_text = self.abc_transformer.$add_metadata(abc_text, $hash2(["F"], {"F": filebase}));
            self.editor.$set_text(abc_text);
            return self.$set_status($hash2(["music_model"], {"music_model": "loaded"}));}, TMP_122.$$s = self, TMP_122), $c).call($d)).$fail, $a.$$p = (TMP_121 = function(err){var self = TMP_121.$$s || this;
            if ($gvars.log == null) $gvars.log = nil;
if (err == null) err = nil;
          return $gvars.log.$error("could not load file " + (err))}, TMP_121.$$s = self, TMP_121), $a).call($b);}, TMP_120.$$s = self, TMP_120), $a).call($d);
        return ($a = ($e = command).$as_inverse, $a.$$p = (TMP_126 = function(args){var self = TMP_126.$$s || this;
          if (self.editor == null) self.editor = nil;
if (args == null) args = nil;
        return self.editor.$set_text(args['$[]']("oldval"))}, TMP_126.$$s = self, TMP_126), $a).call($e);}, TMP_115.$$s = self, TMP_115), $a).call($g, "dopen");
      return ($a = ($h = self.commands).$add_command, $a.$$p = (TMP_127 = function(command){var self = TMP_127.$$s || this, $a, $b, TMP_128, $c, TMP_129;
if (command == null) command = nil;
      ($a = ($b = command).$set_help, $a.$$p = (TMP_128 = function(){var self = TMP_128.$$s || this;

        return "Load demo tune"}, TMP_128.$$s = self, TMP_128), $a).call($b);
        return ($a = ($c = command).$as_action, $a.$$p = (TMP_129 = function(args){var self = TMP_129.$$s || this;
if (args == null) args = nil;
        return self.$load_demo_tune()}, TMP_129.$$s = self, TMP_129), $a).call($c);}, TMP_127.$$s = self, TMP_127), $a).call($h, "demo");
    }, nil) && '__ic_05_dropbox_commands';
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["harpnote_player"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_ge(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs >= rhs : lhs['$>='](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_lt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs < rhs : lhs['$<'](rhs);
  }
  function $rb_divide(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs / rhs : lhs['$/'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $gvars = Opal.gvars, $hash2 = Opal.hash2;

  Opal.add_stubs(['$[]', '$debug', '$[]=', '$on', '$Native', '$call', '$to_s', '$first', '$select', '$error', '$play_notes', '$stop', '$empty?', '$warn', '$last', '$get', '$each', '$clone', '$to_n', '$create_inst', '$each_with_index', '$info', '$backtrace', '$nil?', '$class', '$===', '$push', '$sort', '$<=>', '$reduce', '$meta_data', '$compact', '$flatten', '$map', '$is_a?', '$mk_to_play', '$pitch', '$notes', '$tie_end?', '$==', '$tie_start?', '$voices', '$beat', '$-@', '$duration', '$origin']);
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base) {
      var self = $module($base, 'Music');

      var def = self.$$proto, $scope = self.$$scope;

      (function($base, $super) {
        function $HarpnotePlayer(){};
        var self = $HarpnotePlayer = $klass($base, $super, 'HarpnotePlayer', $HarpnotePlayer);

        var def = self.$$proto, $scope = self.$$scope, TMP_3, TMP_4, TMP_5;

        def.isplaying = def.inst = def.selection = def.voice_elements = def.song_off_timer = def.duration_timefactor = def.songoff_callback = def.beat_timefactor = nil;
        def.$initialize = function() {
          var self = this;

          self.inst = [];
          self.isplaying = false;
          return self.selection = [];
        };

        def['$is_playing?'] = function() {
          var self = this;

          return self.isplaying;
        };

        def.$create_inst = function(instrument_id) {
          var $a, $b, TMP_1, $c, TMP_2, self = this;
          if ($gvars.log == null) $gvars.log = nil;

          if ((($a = self.inst['$[]'](instrument_id)) !== nil && (!$a.$$is_boolean || $a == true))) {
            } else {
            $gvars.log.$debug("creating instrument " + (instrument_id) + " ");
            self.inst['$[]='](instrument_id, new Instrument("piano"));
            ($a = ($b = self.$Native(self.inst['$[]'](instrument_id))).$on, $a.$$p = (TMP_1 = function(element){var self = TMP_1.$$s || this, abc_element = nil;
              if (self.noteon_callback == null) self.noteon_callback = nil;
if (element == null) element = nil;
            abc_element = self.$Native(element)['$[]']("origin");
              self.noteon_callback.$call(abc_element);
              return nil;}, TMP_1.$$s = self, TMP_1), $a).call($b, "noteon");
            ($a = ($c = self.$Native(self.inst['$[]'](instrument_id))).$on, $a.$$p = (TMP_2 = function(element){var self = TMP_2.$$s || this, abc_element = nil;
              if (self.noteoff_callback == null) self.noteoff_callback = nil;
if (element == null) element = nil;
            abc_element = self.$Native(element)['$[]']("origin");
              self.noteoff_callback.$call(abc_element);
              return nil;}, TMP_2.$$s = self, TMP_2), $a).call($c, "noteoff");
          };
          return self.inst['$[]'](instrument_id);
        };

        def.$on_noteon = TMP_3 = function() {
          var self = this, $iter = TMP_3.$$p, block = $iter || nil;

          TMP_3.$$p = null;
          return self.noteon_callback = block;
        };

        def.$on_noteoff = TMP_4 = function() {
          var self = this, $iter = TMP_4.$$p, block = $iter || nil;

          TMP_4.$$p = null;
          return self.noteoff_callback = block;
        };

        def.$on_songoff = TMP_5 = function() {
          var self = this, $iter = TMP_5.$$p, block = $iter || nil;

          TMP_5.$$p = null;
          return self.songoff_callback = block;
        };

        def.$play_from_selection = function() {
          var $a, $b, TMP_6, self = this, notes_to_play = nil;
          if ($gvars.log == null) $gvars.log = nil;

          $gvars.log.$debug("" + (self.selection.$to_s()) + " (" + ("harpnote_player") + " " + (55) + ")");
          if ((($a = self.selection.$first()) !== nil && (!$a.$$is_boolean || $a == true))) {
            notes_to_play = ($a = ($b = self.voice_elements).$select, $a.$$p = (TMP_6 = function(n){var self = TMP_6.$$s || this;
              if (self.selection == null) self.selection = nil;
if (n == null) n = nil;
            return $rb_ge(n['$[]']("delay"), self.selection.$first()['$[]']("delay"))}, TMP_6.$$s = self, TMP_6), $a).call($b)
            } else {
            $gvars.log.$error("please select at least one note");
            notes_to_play = self.voice_elements;
          };
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
          var $a, $b, TMP_7, self = this, firstnote = nil, lastnote = nil, stop_time = nil, idx = nil;
          if ($gvars.log == null) $gvars.log = nil;
          if ($gvars.conf == null) $gvars.conf = nil;

          self.$stop();
          if ((($a = the_notes['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return $gvars.log.$warn("nothing selected to play")
            } else {
            if ((($a = self.song_off_timer) !== nil && (!$a.$$is_boolean || $a == true))) {
              clearTimeout(self.song_off_timer);};
            firstnote = the_notes.$first();
            lastnote = the_notes.$last();
            stop_time = $rb_times(($rb_plus($rb_minus(lastnote['$[]']("delay"), firstnote['$[]']("delay")), $rb_times($gvars.conf.$get("layout.SHORTEST_NOTE"), self.duration_timefactor))), 1000);
            self.song_off_timer = setTimeout(function(){self.songoff_callback.$call()}, stop_time );
            idx = 0;
            ($a = ($b = the_notes).$each, $a.$$p = (TMP_7 = function(the_note){var self = TMP_7.$$s || this, $a, $b, the_note_to_play = nil, note = nil, index = nil, inst = nil;
if (the_note == null) the_note = nil;
            the_note_to_play = the_note.$clone();
              ($a = "delay", $b = the_note_to_play, $b['$[]=']($a, $rb_minus($b['$[]']($a), firstnote['$[]']("delay"))));
              note = the_note_to_play.$to_n();
              index = the_note_to_play['$[]']("index");
              inst = self.$create_inst(index);
              
            inst.tone(note);
            inst.schedule(note.delay + note.duration, function(){inst._trigger("noteoff", note);});
           ;}, TMP_7.$$s = self, TMP_7), $a).call($b);
            return self.isplaying = true;
          };
        };

        def.$stop = function() {
          var $a, $b, TMP_8, self = this;

          ($a = ($b = self.inst).$each_with_index, $a.$$p = (TMP_8 = function(inst, index){var self = TMP_8.$$s || this, e = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (inst == null) inst = nil;if (index == null) index = nil;
          try {
            return inst.silence();
            } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
              return $gvars.log.$info(e.$backtrace())
              }else { throw $err; }
            }}, TMP_8.$$s = self, TMP_8), $a).call($b);
          return self.isplaying = false;
        };

        def.$unhighlight_all = function() {
          var self = this;

          return self.selection = [];
        };

        def.$range_highlight = function(from, to) {
          var $a, $b, TMP_9, $c, $d, TMP_10, self = this;

          self.selection = [];
          return ($a = ($b = ($c = ($d = self.voice_elements).$sort, $c.$$p = (TMP_10 = function(a, b){var self = TMP_10.$$s || this;
if (a == null) a = nil;if (b == null) b = nil;
          return a['$[]']("delay")['$<=>'](b['$[]']("delay"))}, TMP_10.$$s = self, TMP_10), $c).call($d)).$each, $a.$$p = (TMP_9 = function(element){var self = TMP_9.$$s || this, $a, $b, $c, origin = nil, el_start = nil, el_end = nil;
            if (self.selection == null) self.selection = nil;
            if ($gvars.log == null) $gvars.log = nil;
if (element == null) element = nil;
          origin = self.$Native(element['$[]']("origin"));
            if ((($a = origin['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
              return $gvars.log.$error("BUG: note without origin " + (element.$class()))
              } else {
              el_start = origin['$[]']("startChar");
              el_end = origin['$[]']("endChar");
              if ((($a = (((($b = ((($c = $rb_gt(to, el_start)) ? $rb_lt(from, el_end) : $c))) !== false && $b !== nil) ? $b : (($c = (to['$==='](from)), $c !== false && $c !== nil ?to['$==='](el_end) : $c))))) !== nil && (!$a.$$is_boolean || $a == true))) {
                return self.selection.$push(element)
                } else {
                return nil
              };
            };}, TMP_9.$$s = self, TMP_9), $a).call($b);
        };

        def.$load_song = function(music) {
          var $a, $b, TMP_11, self = this, specduration = nil, specbpm = nil, spectf = nil, tf = nil;
          if ($gvars.conf == null) $gvars.conf = nil;
          if ($gvars.log == null) $gvars.log = nil;

          specduration = music.$meta_data()['$[]']("tempo")['$[]']("duration").$reduce("+");
          specbpm = music.$meta_data()['$[]']("tempo")['$[]']("bpm");
          spectf = ($rb_times(specduration, specbpm));
          tf = $rb_times(spectf, ($rb_divide(128, 120)));
          self.duration_timefactor = $rb_divide(1, tf);
          self.beat_timefactor = $rb_divide(1, ($rb_times(tf, $gvars.conf.$get("layout.BEAT_PER_DURATION"))));
          $gvars.log.$debug("playing with tempo: " + (tf) + " ticks per quarter " + ("harpnote_player") + " " + (160));
          return self.voice_elements = ($a = ($b = music.$voices().$each_with_index()).$map, $a.$$p = (TMP_11 = function(voice, index){var self = TMP_11.$$s || this, $a, $b, TMP_12, $c, $d, TMP_15, tie_start = nil;
if (voice == null) voice = nil;if (index == null) index = nil;
          tie_start = $hash2([], {});
            return ($a = ($b = ($c = ($d = voice).$select, $c.$$p = (TMP_15 = function(c){var self = TMP_15.$$s || this;
if (c == null) c = nil;
            return c['$is_a?']($scope.get('Playable'))}, TMP_15.$$s = self, TMP_15), $c).call($d)).$map, $a.$$p = (TMP_12 = function(root){var self = TMP_12.$$s || this, $a, $b, TMP_13, $c, TMP_14, velocity = nil, to_play = nil, more_to_play = nil;
              if ($gvars.log == null) $gvars.log = nil;
if (root == null) root = nil;
            velocity = 0.5;
              if ((($a = root['$is_a?']($scope.get('Pause'))) !== nil && (!$a.$$is_boolean || $a == true))) {
                velocity = 1.1e-05};
              to_play = self.$mk_to_play(root, velocity, index);
              more_to_play = [];
              if ((($a = root['$is_a?']($scope.get('SynchPoint'))) !== nil && (!$a.$$is_boolean || $a == true))) {
                more_to_play = ($a = ($b = root.$notes().$each()).$map, $a.$$p = (TMP_13 = function(note){var self = TMP_13.$$s || this, $a;
if (note == null) note = nil;
                if ((($a = note.$pitch()['$==='](root.$pitch())) !== nil && (!$a.$$is_boolean || $a == true))) {
                    return nil
                    } else {
                    return self.$mk_to_play(note, velocity, index)
                  }}, TMP_13.$$s = self, TMP_13), $a).call($b).$compact()};
              if ((($a = root['$tie_end?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
                if (tie_start['$[]']("pitch")['$=='](to_play['$[]']("pitch"))) {
                  ($a = "duration", $c = to_play, $c['$[]=']($a, $rb_plus($c['$[]']($a), tie_start['$[]']("duration"))));
                  to_play['$[]=']("delay", tie_start['$[]']("delay"));
                  $gvars.log.$debug("" + (more_to_play) + " " + ("harpnote_player") + " " + (184));
                  ($a = ($c = more_to_play).$each, $a.$$p = (TMP_14 = function(p){var self = TMP_14.$$s || this, $a, $b;
if (p == null) p = nil;
                  ($a = "duration", $b = p, $b['$[]=']($a, $rb_plus($b['$[]']($a), tie_start['$[]']("duration"))));
                    return p['$[]=']("delay", tie_start['$[]']("delay"));}, TMP_14.$$s = self, TMP_14), $a).call($c);}};
              if ((($a = root['$tie_start?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
                tie_start = to_play};
              return $rb_plus([to_play], [more_to_play]);}, TMP_12.$$s = self, TMP_12), $a).call($b);}, TMP_11.$$s = self, TMP_11), $a).call($b).$flatten().$compact();
        };

        return (def.$mk_to_play = function(note, velocity, index) {
          var self = this;

          return $hash2(["delay", "pitch", "duration", "velocity", "origin", "index"], {"delay": $rb_times(note.$beat(), self.beat_timefactor), "pitch": note.$pitch()['$-@'](), "duration": $rb_times(note.$duration(), self.duration_timefactor), "velocity": velocity, "origin": note.$origin(), "index": index});
        }, nil) && 'mk_to_play';
      })(self, null)
    })(self)
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["text_pane"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $gvars = Opal.gvars, $hash2 = Opal.hash2;

  Opal.add_stubs(['$attr_accessor', '$on', '$clear_markers', '$call', '$Native', '$getSession', '$[]', '$debug', '$map', '$first', '$set_markers', '$to_n', '$each', '$add_marker', '$last', '$<<', '$clear', '$split', '$get_text', '$length', '$get_abc_part', '$count']);
  return (function($base) {
    var self = $module($base, 'Harpnotes');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $TextPane(){};
      var self = $TextPane = $klass($base, $super, 'TextPane', $TextPane);

      var def = self.$$proto, $scope = self.$$scope, TMP_1, TMP_3, TMP_5;

      def.editor = def.range = def.markers = nil;
      self.$attr_accessor("editor");

      def.$initialize = function(div) {
        var self = this;

        
        // see http://stackoverflow.com/questions/13545433/autocompletion-in-ace-editor
        //     http://stackoverflow.com/questions/26991288/ace-editor-autocompletion-remove-local-variables
        var langTools = ace.require("ace/ext/language_tools");
        langTools.setCompleters([langTools.snippetCompleter])

        var editor = ace.edit(div);
        editor.$blockScrolling = Infinity;

        editor.setTheme("ace/theme/abc");
        editor.getSession().setMode("ace/mode/abc");

        editor.setTheme("ace/theme/abc");

        editor.setOptions({
          highlightActiveLine: true,
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: false        });

        // todo: refine autocompletion according to http://plnkr.co/edit/6MVntVmXYUbjR0DI82Cr?p=preview
        //                                          https://github.com/ajaxorg/ace/wiki/How-to-enable-Autocomplete-in-the-Ace-editor

      
        self.editor = editor;
        self.range = ace.require('ace/range').Range;
        return self.markers = [];
      };

      def.$on_change = TMP_1 = function() {
        var $a, $b, TMP_2, self = this, $iter = TMP_1.$$p, block = $iter || nil;

        TMP_1.$$p = null;
        return ($a = ($b = self.$Native(self.$Native(self.editor).$getSession())).$on, $a.$$p = (TMP_2 = function(e){var self = TMP_2.$$s || this;
if (e == null) e = nil;
        self.$clear_markers();
          return block.$call(e);}, TMP_2.$$s = self, TMP_2), $a).call($b, "change");
      };

      def.$on_selection_change = TMP_3 = function() {
        var $a, $b, TMP_4, self = this, $iter = TMP_3.$$p, block = $iter || nil;

        TMP_3.$$p = null;
        return ($a = ($b = self.$Native(self.$Native(self.editor)['$[]']("selection"))).$on, $a.$$p = (TMP_4 = function(e){var self = TMP_4.$$s || this;
if (e == null) e = nil;
        return block.$call(e)}, TMP_4.$$s = self, TMP_4), $a).call($b, "changeSelection");
      };

      def.$on_cursor_change = TMP_5 = function() {
        var $a, $b, TMP_6, self = this, $iter = TMP_5.$$p, block = $iter || nil;

        TMP_5.$$p = null;
        return ($a = ($b = self.$Native(self.$Native(self.editor)['$[]']("selection"))).$on, $a.$$p = (TMP_6 = function(e){var self = TMP_6.$$s || this;
if (e == null) e = nil;
        return block.$call(e)}, TMP_6.$$s = self, TMP_6), $a).call($b, "changeCursor");
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

        $gvars.log.$debug("set editor selection to " + (selection_start) + ", " + (selection_end) + " (" + ("text_pane") + " " + (102) + ") ");
        
        doc = self.editor.selection.doc
        startrange = doc.indexToPosition(selection_start);
        endrange = doc.indexToPosition(selection_end);
        range = new Range(startrange.row, startrange.column, endrange.row, endrange.column);
        myrange = {start:startrange, end:endrange}
        self.editor.focus();
        self.editor.selection.setSelectionRange(myrange, false);
      
      };

      def.$get_text = function() {
        var self = this;

        return self.editor.getSession().getValue();
      };

      def.$set_text = function(text) {
        var self = this;

        return self.editor.getSession().setValue(text);
      };

      def.$set_annotations = function(annotations) {
        var $a, $b, TMP_7, self = this, editor_annotations = nil;

        editor_annotations = ($a = ($b = annotations).$map, $a.$$p = (TMP_7 = function(annotation){var self = TMP_7.$$s || this;
if (annotation == null) annotation = nil;
        return $hash2(["row", "text", "type"], {"row": $rb_minus(annotation['$[]']("start_pos").$first(), 1), "text": annotation['$[]']("text"), "type": annotation['$[]']("type")})}, TMP_7.$$s = self, TMP_7), $a).call($b);
        self.$set_markers(annotations);
        return self.editor.getSession().setAnnotations(editor_annotations.$to_n());
      };

      def.$set_markers = function(annotations) {
        var $a, $b, TMP_8, self = this;

        self.$clear_markers();
        return ($a = ($b = annotations).$each, $a.$$p = (TMP_8 = function(annotation){var self = TMP_8.$$s || this;
if (annotation == null) annotation = nil;
        return self.$add_marker(annotation)}, TMP_8.$$s = self, TMP_8), $a).call($b);
      };

      def.$add_marker = function(annotation) {
        var self = this, marker_start = nil, marker_end = nil, id = nil;

        marker_start = $hash2(["row", "col"], {"row": annotation['$[]']("start_pos").$first(), "col": annotation['$[]']("start_pos").$last()});
        marker_end = $hash2(["row", "col"], {"row": annotation['$[]']("end_pos").$first(), "col": annotation['$[]']("end_pos").$last()});
        id = self.editor.getSession().addMarker(new self.range($rb_minus(marker_start['$[]']("row"), 1), $rb_minus(marker_start['$[]']("col"), 1),
                                                              $rb_minus(marker_end['$[]']("row"), 1), $rb_minus(marker_end['$[]']("col"), 1)),
                                               "marked", "line", true);
        self.markers['$<<']($hash2(["from", "to", "id"], {"from": [marker_start['$[]']("row"), marker_start['$[]']("col")], "to": [marker_end['$[]']("row"), marker_end['$[]']("col")], "id": id}));
        return nil;
      };

      def.$clear_markers = function() {
        var $a, $b, TMP_9, self = this;

        ($a = ($b = self.markers).$each, $a.$$p = (TMP_9 = function(marker){var self = TMP_9.$$s || this;
          if (self.editor == null) self.editor = nil;
if (marker == null) marker = nil;
        return self.editor.session.removeMarker(marker['$[]']("id"));}, TMP_9.$$s = self, TMP_9), $a).call($b);
        return self.markers.$clear();
      };

      Opal.cdecl($scope, 'CONFIG_SEPARATOR', "%%%%zupfnoter.config");

      def.$get_abc_part = function() {
        var self = this;

        return self.$get_text().$split($scope.get('CONFIG_SEPARATOR')).$first();
      };

      def.$get_config_part = function() {
        var $a, self = this;

        return ((($a = self.$get_text().$split($scope.get('CONFIG_SEPARATOR'))['$[]'](1)) !== false && $a !== nil) ? $a : "{}");
      };

      return (def.$get_config_position = function(charpos) {
        var self = this, cp = nil, lines = nil, line_no = nil, char_pos = nil;

        cp = $rb_plus(charpos, ($rb_plus(self.$get_abc_part(), $scope.get('CONFIG_SEPARATOR'))).$length());
        lines = self.$get_text()['$[]'](0, cp).$split("\n");
        line_no = lines.$count();
        char_pos = lines.$last().$length();
        return [line_no, char_pos];
      }, nil) && 'get_config_position';
    })(self, null)
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal-dropboxjs"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  function $rb_ge(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs >= rhs : lhs['$>='](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $gvars = Opal.gvars;

  Opal.add_stubs(['$require', '$attr_accessor', '$raise', '$lambda', '$error', '$tap', '$call', '$reject', '$resolve', '$new', '$info', '$with_promise', '$debug', '$with_promise_retry']);
  self.$require("promise");
  return (function($base) {
    var self = $module($base, 'Opal');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base) {
      var self = $module($base, 'DropboxJs');

      var def = self.$$proto, $scope = self.$$scope;

      (function($base, $super) {
        function $NilClient(){};
        var self = $NilClient = $klass($base, $super, 'NilClient', $NilClient);

        var def = self.$$proto, $scope = self.$$scope;

        self.$attr_accessor("root_in_dropbox", "app_name");

        return (def.$authenticate = function() {
          var self = this;

          return self.$raise("not logged in to dropbox");
        }, nil) && 'authenticate';
      })(self, null);

      (function($base, $super) {
        function $Client(){};
        var self = $Client = $klass($base, $super, 'Client', $Client);

        var def = self.$$proto, $scope = self.$$scope, TMP_2, TMP_5;

        self.$attr_accessor("root_in_dropbox", "app_name");

        def.$initialize = function(key) {
          var $a, $b, TMP_1, self = this;

          self.errorlogger = ($a = ($b = self).$lambda, $a.$$p = (TMP_1 = function(error){var self = TMP_1.$$s || this;
            if ($gvars.log == null) $gvars.log = nil;
if (error == null) error = nil;
          return $gvars.log.$error(error)}, TMP_1.$$s = self, TMP_1), $a).call($b);
          return self.root = new Dropbox.Client({ key: key });;
        };

        def.$with_promise = TMP_2 = function() {
          var $a, $b, TMP_3, self = this, $iter = TMP_2.$$p, block = $iter || nil;

          TMP_2.$$p = null;
          return ($a = ($b = $scope.get('Promise').$new()).$tap, $a.$$p = (TMP_3 = function(promise){var self = TMP_3.$$s || this, $a, $b, TMP_4;
if (promise == null) promise = nil;
          return block.$call(($a = ($b = self).$lambda, $a.$$p = (TMP_4 = function(error, data){var self = TMP_4.$$s || this;
if (error == null) error = nil;if (data == null) data = nil;
            if (error !== false && error !== nil) {
                return promise.$reject(error)
                } else {
                return promise.$resolve(data)
              }}, TMP_4.$$s = self, TMP_4), $a).call($b))}, TMP_3.$$s = self, TMP_3), $a).call($b);
        };

        def.$with_promise_retry = TMP_5 = function(info, retries) {
          var $a, $b, TMP_6, self = this, $iter = TMP_5.$$p, block = $iter || nil;

          if (info == null) {
            info = ""
          }
          if (retries == null) {
            retries = 2
          }
          TMP_5.$$p = null;
          return ($a = ($b = $scope.get('Promise').$new()).$tap, $a.$$p = (TMP_6 = function(promise){var self = TMP_6.$$s || this, $a, $b, TMP_7, remaining = nil, handler = nil;
if (promise == null) promise = nil;
          remaining = retries;
            handler = ($a = ($b = self).$lambda, $a.$$p = (TMP_7 = function(error, data){var self = TMP_7.$$s || this;
              if ($gvars.log == null) $gvars.log = nil;
if (error == null) error = nil;if (data == null) data = nil;
            if (error !== false && error !== nil) {
                remaining = $rb_minus(remaining, 1);
                if ($rb_ge(remaining, 0)) {
                  $gvars.log.$info("" + (remaining) + " remaining retries " + (info));
                  return block.$call(handler);
                  } else {
                  $gvars.log.$error(error);
                  return promise.$reject(error);
                };
                } else {
                $gvars.log.$info("successs " + (info));
                return promise.$resolve(data);
              }}, TMP_7.$$s = self, TMP_7), $a).call($b);
            return block.$call(handler);}, TMP_6.$$s = self, TMP_6), $a).call($b);
        };

        def.$authenticate = function() {
          var $a, $b, TMP_8, self = this;

          return ($a = ($b = self).$with_promise, $a.$$p = (TMP_8 = function(iblock){var self = TMP_8.$$s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          return self.root.authenticate(iblock);}, TMP_8.$$s = self, TMP_8), $a).call($b);
        };

        def.$get_account_info = function() {
          var $a, $b, TMP_9, self = this;

          return ($a = ($b = self).$with_promise, $a.$$p = (TMP_9 = function(iblock){var self = TMP_9.$$s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          return self.root.getAccountInfo(iblock);}, TMP_9.$$s = self, TMP_9), $a).call($b);
        };

        def.$write_file = function(filename, data) {
          var $a, $b, TMP_10, self = this;
          if ($gvars.log == null) $gvars.log = nil;

          $gvars.log.$debug("waiting");
          return ($a = ($b = self).$with_promise_retry, $a.$$p = (TMP_10 = function(iblock){var self = TMP_10.$$s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          return self.root.writeFile(filename, data, iblock);}, TMP_10.$$s = self, TMP_10), $a).call($b, filename, 2);
        };

        def.$read_file = function(filename) {
          var $a, $b, TMP_11, self = this;

          return ($a = ($b = self).$with_promise, $a.$$p = (TMP_11 = function(iblock){var self = TMP_11.$$s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          return self.root.readFile(filename, iblock);}, TMP_11.$$s = self, TMP_11), $a).call($b);
        };

        return (def.$read_dir = function(dirname) {
          var $a, $b, TMP_12, self = this;

          if (dirname == null) {
            dirname = "/"
          }
          return ($a = ($b = self).$with_promise, $a.$$p = (TMP_12 = function(iblock){var self = TMP_12.$$s || this;
            if (self.root == null) self.root = nil;
if (iblock == null) iblock = nil;
          self.root.readdir(dirname, iblock);
            return nil;}, TMP_12.$$s = self, TMP_12), $a).call($b);
        }, nil) && 'read_dir';
      })(self, null);
    })(self)
  })(self);
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal-jqconsole"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_plus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs + rhs : lhs['$+'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $range = Opal.range;

  Opal.add_stubs(['$expose', '$Native', '$jqconsole', '$find', '$on_command', '$Write', '$handler', '$to_json', '$last', '$GetHistory', '$nil?', '$parse', '$SetHistory', '$[]', '$private', '$call', '$message', '$Prompt', '$lambda']);
  return (function($base) {
    var self = $module($base, 'JqConsole');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $JqConsole(){};
      var self = $JqConsole = $klass($base, $super, 'JqConsole', $JqConsole);

      var def = self.$$proto, $scope = self.$$scope, TMP_2;

      def.jqconsole = def.handler = nil;
      def.$initialize = function(container, prompt, message) {
        var $a, $b, TMP_1, self = this;

        if (message == null) {
          message = ""
        }
        $scope.get('Element').$expose("jqconsole");
        self.jqconsole = self.$Native($scope.get('Element').$find("#" + (container)).$jqconsole(message, prompt));
        ($a = ($b = self).$on_command, $a.$$p = (TMP_1 = function(cmd){var self = TMP_1.$$s || this;
          if (self.jqconsole == null) self.jqconsole = nil;
if (cmd == null) cmd = nil;
        return self.jqconsole.$Write("no handler installed; -> " + (cmd) + "\n")}, TMP_1.$$s = self, TMP_1), $a).call($b);
        self.$handler();
        return self.jqconsole;
      };

      def.$on_command = TMP_2 = function() {
        var self = this, $iter = TMP_2.$$p, block = $iter || nil;

        TMP_2.$$p = null;
        return self.handler = block;
      };

      def.$write = function(stuff) {
        var $a, self = this;

        stuff = $slice.call(arguments, 0);
        return ($a = self.jqconsole).$Write.apply($a, [].concat(stuff));
      };

      def.$write_html = function(html_str) {
        var self = this;

        return self.jqconsole.$Write(html_str, "unescaped", false);
      };

      def.$save_to_localstorage = function() {
        var self = this, history = nil;

        history = self.$Native(self.jqconsole.$GetHistory()).$last(15).$to_json();
        localStorage.setItem('console_history', history);
      };

      def.$load_from_loacalstorage = function() {
        var $a, self = this, history = nil;

        history = self.$Native(localStorage.getItem('console_history'));
        if ((($a = history['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
          return nil
          } else {
          history = $scope.get('JSON').$parse(history);
          if ((($a = history['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
            return nil
            } else {
            return self.jqconsole.$SetHistory(history)
          };
        };
      };

      def.$get_history = function() {
        var self = this;

        return self.jqconsole.$GetHistory();
      };

      def.$set_history = function(array) {
        var self = this;

        return self.jqconsole.$SetHistory(array['$[]']($range(0, 4, false)));
      };

      self.$private();

      return (def.$handler = function(cmd) {
        var $a, $b, TMP_3, $c, TMP_4, self = this, e = nil;

        if ((($a = (($b = cmd !== false && cmd !== nil) ? cmd != undefined : $b)) !== nil && (!$a.$$is_boolean || $a == true))) {
          try {
          self.handler.$call(cmd)
          } catch ($err) {if (Opal.rescue($err, [$scope.get('Exception')])) {e = $err;
            self.jqconsole.$Write($rb_plus($rb_plus("Error: ", e.$message()), "\n"))
            }else { throw $err; }
          }};
        return self.jqconsole.$Prompt(true, ($a = ($b = self).$lambda, $a.$$p = (TMP_3 = function(c){var self = TMP_3.$$s || this;
if (c == null) c = nil;
        return self.$handler(c)}, TMP_3.$$s = self, TMP_3), $a).call($b), ($a = ($c = self).$lambda, $a.$$p = (TMP_4 = function(c){var self = TMP_4.$$s || this;
if (c == null) c = nil;
        return false}, TMP_4.$$s = self, TMP_4), $a).call($c));
      }, nil) && 'handler';
    })(self, null)
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["confstack"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $klass = Opal.klass, $hash2 = Opal.hash2, $range = Opal.range;

  Opal.add_stubs(['$is_a?', '$push', '$_flatten', '$pop', '$nil?', '$_get_one', '$uniq', '$flatten', '$compact', '$map', '$_get_keys', '$private', '$keys', '$inject', '$[]=', '$_get', '$_add_hash', '$split', '$[]', '$empty?', '$to_sym', '$first', '$last', '$join', '$<<']);
  return (function($base, $super) {
    function $Confstack(){};
    var self = $Confstack = $klass($base, $super, 'Confstack', $Confstack);

    var def = self.$$proto, $scope = self.$$scope;

    def.confstack = def.confresult_flat = nil;
    def.$initialize = function() {
      var self = this;

      self.confstack = [];
      self.confresult_flat = $hash2([], {});
      return self;
    };

    def.$push = function(hash) {
      var $a, self = this;

      if ((($a = hash['$is_a?']($scope.get('Hash'))) !== nil && (!$a.$$is_boolean || $a == true))) {
        self.confstack.$push(hash)};
      self.$_flatten();
      return self;
    };

    def.$pop = function() {
      var self = this;

      self.confstack.$pop();
      self.$_flatten();
      return self;
    };

    def.$get = function(key) {
      var $a, self = this, result = nil;

      if (key == null) {
        key = nil
      }
      if ((($a = key['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        result = self.confresult_flat
        } else {
        result = self.$_get_one(self.confresult_flat, key)
      };
      return result;
    };

    def.$keys = function() {
      var $a, $b, TMP_1, self = this;

      return ($a = ($b = self.confstack).$map, $a.$$p = (TMP_1 = function(s){var self = TMP_1.$$s || this;
if (s == null) s = nil;
      return self.$_get_keys(s)}, TMP_1.$$s = self, TMP_1), $a).call($b).$compact().$flatten().$uniq();
    };

    self.$private();

    def.$_flatten = function() {
      var $a, $b, TMP_2, self = this, the_keys = nil;

      the_keys = self.$keys();
      self.confresult_flat = ($a = ($b = the_keys).$inject, $a.$$p = (TMP_2 = function(result, element){var self = TMP_2.$$s || this;
if (result == null) result = nil;if (element == null) element = nil;
      result['$[]='](element, self.$_get(element));
        self.$_add_hash(result, element.$split("."), self.$_get(element), nil);
        return result;}, TMP_2.$$s = self, TMP_2), $a).call($b, $hash2([], {}));
      return self.confresult_flat = self.confresult_flat['$[]'](nil);
    };

    def.$_add_hash = function(hash, keys, value, current_key) {
      var $a, self = this;

      if ((($a = hash['$nil?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        hash = $hash2([], {})};
      if ((($a = keys['$empty?']()) !== nil && (!$a.$$is_boolean || $a == true))) {
        hash['$[]='](current_key, value)
        } else {
        if ((($a = hash['$[]'](current_key)['$is_a?']($scope.get('Hash'))) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          hash['$[]='](current_key, $hash2([], {}))
        };
        self.$_add_hash(hash['$[]'](current_key), keys['$[]']($range(1, -1, false)), value, keys.$first().$to_sym());
      };
      return hash;
    };

    def.$_get = function(key) {
      var $a, $b, TMP_3, self = this;

      return ($a = ($b = self.confstack).$map, $a.$$p = (TMP_3 = function(s){var self = TMP_3.$$s || this;
if (s == null) s = nil;
      return self.$_get_one(s, key)}, TMP_3.$$s = self, TMP_3), $a).call($b).$compact().$last();
    };

    def.$_get_one = function(hash, key) {
      var $a, $b, TMP_4, self = this, keys = nil, retval = nil;

      keys = key.$split(".");
      retval = ($a = ($b = keys).$inject, $a.$$p = (TMP_4 = function(result, element){var self = TMP_4.$$s || this, $a;
if (result == null) result = nil;if (element == null) element = nil;
      if ((($a = result['$is_a?']($scope.get('Hash'))) !== nil && (!$a.$$is_boolean || $a == true))) {
          } else {
          return ($breaker.$v = nil, $breaker)
        };
        return ((($a = result['$[]'](element)) !== false && $a !== nil) ? $a : result['$[]'](element.$to_sym()));}, TMP_4.$$s = self, TMP_4), $a).call($b, hash);
      return retval;
    };

    return (def.$_get_keys = function(hash, path) {
      var $a, $b, TMP_5, self = this, retval = nil;

      if (path == null) {
        path = nil
      }
      retval = ($a = ($b = hash.$keys()).$inject, $a.$$p = (TMP_5 = function(result, key){var self = TMP_5.$$s || this, $a, newpath = nil, newhash = nil;
if (result == null) result = nil;if (key == null) key = nil;
      newpath = [path, key].$compact().$join(".");
        newhash = hash['$[]'](key);
        result['$<<'](newpath);
        if ((($a = newhash['$is_a?']($scope.get('Hash'))) !== nil && (!$a.$$is_boolean || $a == true))) {
          result['$<<'](self.$_get_keys(newhash, newpath))};
        return result;}, TMP_5.$$s = self, TMP_5), $a).call($b, []);
      return retval.$compact().$flatten();
    }, nil) && '_get_keys';
  })(self, null)
};

/* Generated by Opal 0.8.0 */
Opal.modules["opal-abc2svg"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  function $rb_gt(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs > rhs : lhs['$>'](rhs);
  }
  function $rb_times(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs * rhs : lhs['$*'](rhs);
  }
  function $rb_minus(lhs, rhs) {
    return (typeof(lhs) === 'number' && typeof(rhs) === 'number') ? lhs - rhs : lhs['$-'](rhs);
  }
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice, $module = Opal.module, $klass = Opal.klass, $hash2 = Opal.hash2, $gvars = Opal.gvars;

  Opal.add_stubs(['$lambda', '$set_callback', '$error', '$push', '$_anno_start', '$_anno_stop', '$to_n', '$unhighlight_all', '$range_highlight_more', '$each', '$find', '$join', '$uniq', '$flatten', '$split', '$attr', '$get_elements_by_range', '$gsub', '$_set_on_select', '$_translate', '$html', '$get_svg', '$[]=', '$sort', '$map', '$[]', '$first', '$last', '$private', '$Native', '$<<', '$puts', '$to_json', '$_mk_id', '$on', '$stop_propagation', '$call', '$id', '$current_target']);
  return (function($base) {
    var self = $module($base, 'ABC2SVG');

    var def = self.$$proto, $scope = self.$$scope;

    (function($base, $super) {
      function $Abc2Svg(){};
      var self = $Abc2Svg = $klass($base, $super, 'Abc2Svg', $Abc2Svg);

      var def = self.$$proto, $scope = self.$$scope, TMP_9, TMP_10;

      def.user = def.printer = def.svgbuf = def.element_to_position = def.root = nil;
      def.$initialize = function(div, options) {
        var $a, $b, TMP_1, $c, TMP_2, $d, TMP_3, $e, TMP_4, $f, TMP_5, $g, TMP_6, self = this;

        if (options == null) {
          options = $hash2([], {})
        }
        self.on_select = ($a = ($b = self).$lambda, $a.$$p = (TMP_1 = function(element){var self = TMP_1.$$s || this;
if (element == null) element = nil;
        return nil}, TMP_1.$$s = self, TMP_1), $a).call($b);
        self.printer = div;
        self.svgbuf = [];
        self.abc_source = "";
        self.element_to_position = $hash2([], {});
        self.user = $hash2(["img_out", "errmsg", "read_file", "annotate", "page_format"], {"img_out": nil, "errmsg": nil, "read_file": nil, "annotate": true, "page_format": true});
        ($a = ($c = self).$set_callback, $a.$$p = (TMP_2 = function(message, line_number, column_number){var self = TMP_2.$$s || this;
          if ($gvars.log == null) $gvars.log = nil;
if (message == null) message = nil;if (line_number == null) line_number = nil;if (column_number == null) column_number = nil;
        return $gvars.log.$error(message)}, TMP_2.$$s = self, TMP_2), $a).call($c, "errmsg");
        ($a = ($d = self).$set_callback, $a.$$p = (TMP_3 = function(svg){var self = TMP_3.$$s || this;
          if (self.svgbuf == null) self.svgbuf = nil;
if (svg == null) svg = nil;
        return self.svgbuf.$push(svg)}, TMP_3.$$s = self, TMP_3), $a).call($d, "img_out");
        ($a = ($e = self).$set_callback, $a.$$p = (TMP_4 = function(type, start, stop, x, y, w, h){var self = TMP_4.$$s || this;
if (type == null) type = nil;if (start == null) start = nil;if (stop == null) stop = nil;if (x == null) x = nil;if (y == null) y = nil;if (w == null) w = nil;if (h == null) h = nil;
        return self.$_anno_start(type, start, stop, x, y, w, h)}, TMP_4.$$s = self, TMP_4), $a).call($e, "anno_start");
        ($a = ($f = self).$set_callback, $a.$$p = (TMP_5 = function(type, start, stop, x, y, w, h){var self = TMP_5.$$s || this;
if (type == null) type = nil;if (start == null) start = nil;if (stop == null) stop = nil;if (x == null) x = nil;if (y == null) y = nil;if (w == null) w = nil;if (h == null) h = nil;
        return self.$_anno_stop(type, start, stop, x, y, w, h)}, TMP_5.$$s = self, TMP_5), $a).call($f, "anno_stop");
        ($a = ($g = self).$set_callback, $a.$$p = (TMP_6 = function(tsfirst, voice_tb, anno_type){var self = TMP_6.$$s || this;
if (tsfirst == null) tsfirst = nil;if (voice_tb == null) voice_tb = nil;if (anno_type == null) anno_type = nil;
        return nil}, TMP_6.$$s = self, TMP_6), $a).call($g, "get_abcmodel");
        return self.root = new Abc(self.user.$to_n());
      };

      def.$range_highlight = function(from, to) {
        var self = this;

        self.$unhighlight_all();
        self.$range_highlight_more(from, to);
        return nil;
      };

      def.$range_highlight_more = function(from, to) {
        var $a, $b, TMP_7, self = this;

        ($a = ($b = self.$get_elements_by_range(from, to)).$each, $a.$$p = (TMP_7 = function(id){var self = TMP_7.$$s || this, element = nil, classes = nil;
if (id == null) id = nil;
        element = $scope.get('Element').$find("#" + (id));
          element.parents('svg').get(0).scrollIntoView();
          classes = [element.$attr("class").$split(" "), "highlight"].$flatten().$uniq().$join(" ");
          return element.$attr("class", classes);}, TMP_7.$$s = self, TMP_7), $a).call($b);
        return nil;
      };

      def.$range_unhighlight_more = function(from, to) {
        var $a, $b, TMP_8, self = this;

        return ($a = ($b = self.$get_elements_by_range(from, to)).$each, $a.$$p = (TMP_8 = function(id){var self = TMP_8.$$s || this, foo = nil, classes = nil;
if (id == null) id = nil;
        foo = $scope.get('Element').$find("#" + (id));
          classes = foo.$attr("class").$gsub("highlight", "");
          return foo.$attr("class", classes);}, TMP_8.$$s = self, TMP_8), $a).call($b);
      };

      def.$unhighlight_all = function() {
        var self = this;

        return $scope.get('Element').$find(".highlight").$attr("class", "abcref");
      };

      def.$on_select = TMP_9 = function() {
        var self = this, $iter = TMP_9.$$p, block = $iter || nil;

        TMP_9.$$p = null;
        self.on_select = block;
        return self.$_set_on_select();
      };

      def.$draw = function(abc_code) {
        var self = this;

        self.$_translate("abc", abc_code);
        self.printer.$html(self.$get_svg());
        self.$_set_on_select();
        return nil;
      };

      def.$get_svg = function() {
        var self = this;

        return self.svgbuf.$join("\n");
      };

      def.$set_callback = TMP_10 = function(event) {
        var self = this, $iter = TMP_10.$$p, block = $iter || nil;

        TMP_10.$$p = null;
        return self.user['$[]='](event, block);
      };

      def.$get_elements_by_range = function(from, to) {
        var $a, $b, TMP_11, self = this, range = nil, result = nil;

        range = [from, to].$sort();
        result = [];
        ($a = ($b = self.element_to_position).$each, $a.$$p = (TMP_11 = function(k, value){var self = TMP_11.$$s || this, $a, $b, TMP_12, noterange = nil;
if (k == null) k = nil;if (value == null) value = nil;
        noterange = ($a = ($b = ["startChar", "endChar"]).$map, $a.$$p = (TMP_12 = function(c){var self = TMP_12.$$s || this;
if (c == null) c = nil;
          return value['$[]'](c)}, TMP_12.$$s = self, TMP_12), $a).call($b).$sort();
          if ($rb_gt($rb_times(($rb_minus(range.$first(), noterange.$last())), ($rb_minus(noterange.$first(), range.$last()))), 0)) {
            return result.$push(k)
            } else {
            return nil
          };}, TMP_11.$$s = self, TMP_11), $a).call($b);
        return result;
      };

      self.$private();

      def.$_get_abcmodel = function(tsfirst, voice_tb, anno_type) {
        var $a, $b, TMP_13, self = this, tune = nil;

        tune = $hash2(["voices"], {"voices": []});
        return tune['$[]=']("voices", ($a = ($b = self.$Native(voice_tb)).$map, $a.$$p = (TMP_13 = function(v){var self = TMP_13.$$s || this, $a, curnote = nil, result = nil, nextnote = nil;
if (v == null) v = nil;
        curnote = self.$Native(self.$Native(v)['$[]']("sym"));
          result = [];
          while (curnote !== false && curnote !== nil) {
          nextnote = curnote['$[]']("next");
          curnote['$[]=']("next", nil);
          curnote['$[]=']("prev", nil);
          curnote['$[]=']("ts_next", nil);
          curnote['$[]=']("ts_prev", nil);
          result['$<<'](curnote.$to_n());
          curnote = nextnote;};
          self.$puts(result.$to_json());
          return result;}, TMP_13.$$s = self, TMP_13), $a).call($b));
      };

      def.$_anno_start = function(music_type, start_offset, stop_offset, x, y, w, h) {
        var self = this, id = nil;

        id = self.$_mk_id(music_type, start_offset, stop_offset);
        
      self.root.out_svg('<g class="' + id +'">\n')
      ;
      };

      def.$_anno_stop = function(music_type, start_offset, stop_offset, x, y, w, h) {
        var self = this, id = nil;

        id = self.$_mk_id(music_type, start_offset, stop_offset);
        
          // close the container
          self.root.out_svg('</g>\n');
          // create a rectangle
          self.root.out_svg('<rect class="abcref" id="' + id +'" x="');
          self.root.out_sxsy(x, '" y="', y);
          self.root.out_svg('" width="' + w.toFixed(2) +
            '" height="' + h.toFixed(2) + '"/>\n')
        ;
        return self.element_to_position['$[]='](id, $hash2(["startChar", "endChar"], {"startChar": start_offset, "endChar": stop_offset}));
      };

      def.$_mk_id = function(music_type, start_offset, end_offset) {
        var self = this;

        return "_" + (music_type) + "_" + (start_offset) + "_" + (end_offset) + "_";
      };

      def.$_set_on_select = function() {
        var $a, $b, TMP_14, self = this;

        return ($a = ($b = $scope.get('Element').$find(".abcref")).$on, $a.$$p = (TMP_14 = function(evt){var self = TMP_14.$$s || this;
          if (self.on_select == null) self.on_select = nil;
          if (self.element_to_position == null) self.element_to_position = nil;
if (evt == null) evt = nil;
        evt.$stop_propagation();
          self.on_select.$call(self.element_to_position['$[]'](evt.$current_target().$id()));
          return nil;}, TMP_14.$$s = self, TMP_14), $a).call($b, "click");
      };

      return (def.$_translate = function(file_name, abc_source) {
        var self = this;

        self.abc_source = abc_source;
        self.element_to_position = $hash2([], {});
        self.svgbuf = [];
        
      self.root.tosvg(file_name, abc_source);
      ;
      }, nil) && '_translate';
    })(self, null)
  })(self)
};

/* Generated by Opal 0.8.0 */
Opal.modules["version"] = function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice;

  Opal.add_stubs(['$year', '$now']);
  Opal.cdecl($scope, 'VERSION', "0.10.3");
  return Opal.cdecl($scope, 'COPYRIGHT', "©" + ($scope.get('Time').$now().$year()) + " https://www.bernhard-weichel.de");
};

/* Generated by Opal 0.8.0 */
(function(Opal) {
  Opal.dynamic_require_severity = "error";
  var self = Opal.top, $scope = Opal, nil = Opal.nil, $breaker = Opal.breaker, $slice = Opal.slice;

  Opal.add_stubs(['$require', '$puts']);
  self.$require("opal");
  self.$require("opal-jquery");
  self.$require("vector2d");
  self.$require("math");
  self.$require("consolelogger");
  self.$require("harpnotes");
  self.$require("abc_to_harpnotes");
  self.$require("opal-raphael");
  self.$require("opal-jspdf");
  self.$require("opal-jszip");
  self.$require("opal-abcjs");
  self.$require("opal-musicaljs");
  self.$require("raphael_engine");
  self.$require("pdf_engine");
  self.$require("command-controller");
  self.$require("controller");
  self.$require("controller-nw");
  self.$require("controller_command_definitions");
  self.$require("harpnote_player");
  self.$require("text_pane");
  self.$require("opal-dropboxjs");
  self.$require("opal-jqconsole");
  self.$require("confstack");
  self.$require("opal-abc2svg");
  self.$require("version");
  self.$puts("now starting zupfnoter");
  return self.$puts("zupfnoter is now running");
})(Opal);
