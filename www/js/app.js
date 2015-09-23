(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

module.exports.Dispatcher = require('./lib/Dispatcher')

},{"./lib/Dispatcher":2}],2:[function(require,module,exports){
/*
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Dispatcher
 * @typechecks
 */

"use strict";

var invariant = require('./invariant');

var _lastID = 1;
var _prefix = 'ID_';

/**
 * Dispatcher is used to broadcast payloads to registered callbacks. This is
 * different from generic pub-sub systems in two ways:
 *
 *   1) Callbacks are not subscribed to particular events. Every payload is
 *      dispatched to every registered callback.
 *   2) Callbacks can be deferred in whole or part until other callbacks have
 *      been executed.
 *
 * For example, consider this hypothetical flight destination form, which
 * selects a default city when a country is selected:
 *
 *   var flightDispatcher = new Dispatcher();
 *
 *   // Keeps track of which country is selected
 *   var CountryStore = {country: null};
 *
 *   // Keeps track of which city is selected
 *   var CityStore = {city: null};
 *
 *   // Keeps track of the base flight price of the selected city
 *   var FlightPriceStore = {price: null}
 *
 * When a user changes the selected city, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'city-update',
 *     selectedCity: 'paris'
 *   });
 *
 * This payload is digested by `CityStore`:
 *
 *   flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'city-update') {
 *       CityStore.city = payload.selectedCity;
 *     }
 *   });
 *
 * When the user selects a country, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'country-update',
 *     selectedCountry: 'australia'
 *   });
 *
 * This payload is digested by both stores:
 *
 *    CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       CountryStore.country = payload.selectedCountry;
 *     }
 *   });
 *
 * When the callback to update `CountryStore` is registered, we save a reference
 * to the returned token. Using this token with `waitFor()`, we can guarantee
 * that `CountryStore` is updated before the callback that updates `CityStore`
 * needs to query its data.
 *
 *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       // `CountryStore.country` may not be updated.
 *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
 *       // `CountryStore.country` is now guaranteed to be updated.
 *
 *       // Select the default city for the new country
 *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
 *     }
 *   });
 *
 * The usage of `waitFor()` can be chained, for example:
 *
 *   FlightPriceStore.dispatchToken =
 *     flightDispatcher.register(function(payload) {
 *       switch (payload.actionType) {
 *         case 'country-update':
 *           flightDispatcher.waitFor([CityStore.dispatchToken]);
 *           FlightPriceStore.price =
 *             getFlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *
 *         case 'city-update':
 *           FlightPriceStore.price =
 *             FlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *     }
 *   });
 *
 * The `country-update` payload will be guaranteed to invoke the stores'
 * registered callbacks in order: `CountryStore`, `CityStore`, then
 * `FlightPriceStore`.
 */

  function Dispatcher() {
    this.$Dispatcher_callbacks = {};
    this.$Dispatcher_isPending = {};
    this.$Dispatcher_isHandled = {};
    this.$Dispatcher_isDispatching = false;
    this.$Dispatcher_pendingPayload = null;
  }

  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   *
   * @param {function} callback
   * @return {string}
   */
  Dispatcher.prototype.register=function(callback) {
    var id = _prefix + _lastID++;
    this.$Dispatcher_callbacks[id] = callback;
    return id;
  };

  /**
   * Removes a callback based on its token.
   *
   * @param {string} id
   */
  Dispatcher.prototype.unregister=function(id) {
    invariant(
      this.$Dispatcher_callbacks[id],
      'Dispatcher.unregister(...): `%s` does not map to a registered callback.',
      id
    );
    delete this.$Dispatcher_callbacks[id];
  };

  /**
   * Waits for the callbacks specified to be invoked before continuing execution
   * of the current callback. This method should only be used by a callback in
   * response to a dispatched payload.
   *
   * @param {array<string>} ids
   */
  Dispatcher.prototype.waitFor=function(ids) {
    invariant(
      this.$Dispatcher_isDispatching,
      'Dispatcher.waitFor(...): Must be invoked while dispatching.'
    );
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];
      if (this.$Dispatcher_isPending[id]) {
        invariant(
          this.$Dispatcher_isHandled[id],
          'Dispatcher.waitFor(...): Circular dependency detected while ' +
          'waiting for `%s`.',
          id
        );
        continue;
      }
      invariant(
        this.$Dispatcher_callbacks[id],
        'Dispatcher.waitFor(...): `%s` does not map to a registered callback.',
        id
      );
      this.$Dispatcher_invokeCallback(id);
    }
  };

  /**
   * Dispatches a payload to all registered callbacks.
   *
   * @param {object} payload
   */
  Dispatcher.prototype.dispatch=function(payload) {
    invariant(
      !this.$Dispatcher_isDispatching,
      'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.'
    );
    this.$Dispatcher_startDispatching(payload);
    try {
      for (var id in this.$Dispatcher_callbacks) {
        if (this.$Dispatcher_isPending[id]) {
          continue;
        }
        this.$Dispatcher_invokeCallback(id);
      }
    } finally {
      this.$Dispatcher_stopDispatching();
    }
  };

  /**
   * Is this Dispatcher currently dispatching.
   *
   * @return {boolean}
   */
  Dispatcher.prototype.isDispatching=function() {
    return this.$Dispatcher_isDispatching;
  };

  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @param {string} id
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_invokeCallback=function(id) {
    this.$Dispatcher_isPending[id] = true;
    this.$Dispatcher_callbacks[id](this.$Dispatcher_pendingPayload);
    this.$Dispatcher_isHandled[id] = true;
  };

  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @param {object} payload
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_startDispatching=function(payload) {
    for (var id in this.$Dispatcher_callbacks) {
      this.$Dispatcher_isPending[id] = false;
      this.$Dispatcher_isHandled[id] = false;
    }
    this.$Dispatcher_pendingPayload = payload;
    this.$Dispatcher_isDispatching = true;
  };

  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_stopDispatching=function() {
    this.$Dispatcher_pendingPayload = null;
    this.$Dispatcher_isDispatching = false;
  };


module.exports = Dispatcher;

},{"./invariant":3}],3:[function(require,module,exports){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (false) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

},{}],4:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _import = require('./handlebars/base');

var base = _interopRequireWildcard(_import);

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)

var _SafeString = require('./handlebars/safe-string');

var _SafeString2 = _interopRequireWildcard(_SafeString);

var _Exception = require('./handlebars/exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _import2 = require('./handlebars/utils');

var Utils = _interopRequireWildcard(_import2);

var _import3 = require('./handlebars/runtime');

var runtime = _interopRequireWildcard(_import3);

var _noConflict = require('./handlebars/no-conflict');

var _noConflict2 = _interopRequireWildcard(_noConflict);

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
function create() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = _SafeString2['default'];
  hb.Exception = _Exception2['default'];
  hb.Utils = Utils;
  hb.escapeExpression = Utils.escapeExpression;

  hb.VM = runtime;
  hb.template = function (spec) {
    return runtime.template(spec, hb);
  };

  return hb;
}

var inst = create();
inst.create = create;

_noConflict2['default'](inst);

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];
},{"./handlebars/base":5,"./handlebars/exception":6,"./handlebars/no-conflict":7,"./handlebars/runtime":8,"./handlebars/safe-string":9,"./handlebars/utils":10}],5:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.HandlebarsEnvironment = HandlebarsEnvironment;
exports.createFrame = createFrame;

var _import = require('./utils');

var Utils = _interopRequireWildcard(_import);

var _Exception = require('./exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var VERSION = '3.0.1';
exports.VERSION = VERSION;
var COMPILER_REVISION = 6;

exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '== 1.x.x',
  5: '== 2.0.0-alpha.x',
  6: '>= 2.0.0-beta.1'
};

exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function registerHelper(name, fn) {
    if (toString.call(name) === objectType) {
      if (fn) {
        throw new _Exception2['default']('Arg not supported with multiple helpers');
      }
      Utils.extend(this.helpers, name);
    } else {
      this.helpers[name] = fn;
    }
  },
  unregisterHelper: function unregisterHelper(name) {
    delete this.helpers[name];
  },

  registerPartial: function registerPartial(name, partial) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials, name);
    } else {
      if (typeof partial === 'undefined') {
        throw new _Exception2['default']('Attempting to register a partial as undefined');
      }
      this.partials[name] = partial;
    }
  },
  unregisterPartial: function unregisterPartial(name) {
    delete this.partials[name];
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function () {
    if (arguments.length === 1) {
      // A missing field in a {{foo}} constuct.
      return undefined;
    } else {
      // Someone is actually trying to call something, blow up.
      throw new _Exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
    }
  });

  instance.registerHelper('blockHelperMissing', function (context, options) {
    var inverse = options.inverse,
        fn = options.fn;

    if (context === true) {
      return fn(this);
    } else if (context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if (context.length > 0) {
        if (options.ids) {
          options.ids = [options.name];
        }

        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
        options = { data: data };
      }

      return fn(context, options);
    }
  });

  instance.registerHelper('each', function (context, options) {
    if (!options) {
      throw new _Exception2['default']('Must pass iterator to #each');
    }

    var fn = options.fn,
        inverse = options.inverse,
        i = 0,
        ret = '',
        data = undefined,
        contextPath = undefined;

    if (options.data && options.ids) {
      contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (isFunction(context)) {
      context = context.call(this);
    }

    if (options.data) {
      data = createFrame(options.data);
    }

    function execIteration(field, index, last) {
      if (data) {
        data.key = field;
        data.index = index;
        data.first = index === 0;
        data.last = !!last;

        if (contextPath) {
          data.contextPath = contextPath + field;
        }
      }

      ret = ret + fn(context[field], {
        data: data,
        blockParams: Utils.blockParams([context[field], field], [contextPath + field, null])
      });
    }

    if (context && typeof context === 'object') {
      if (isArray(context)) {
        for (var j = context.length; i < j; i++) {
          execIteration(i, i, i === context.length - 1);
        }
      } else {
        var priorKey = undefined;

        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            // We're running the iterations one step out of sync so we can detect
            // the last iteration without have to scan the object twice and create
            // an itermediate keys array.
            if (priorKey) {
              execIteration(priorKey, i - 1);
            }
            priorKey = key;
            i++;
          }
        }
        if (priorKey) {
          execIteration(priorKey, i - 1, true);
        }
      }
    }

    if (i === 0) {
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function (conditional, options) {
    if (isFunction(conditional)) {
      conditional = conditional.call(this);
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if (!options.hash.includeZero && !conditional || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function (conditional, options) {
    return instance.helpers['if'].call(this, conditional, { fn: options.inverse, inverse: options.fn, hash: options.hash });
  });

  instance.registerHelper('with', function (context, options) {
    if (isFunction(context)) {
      context = context.call(this);
    }

    var fn = options.fn;

    if (!Utils.isEmpty(context)) {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
        options = { data: data };
      }

      return fn(context, options);
    } else {
      return options.inverse(this);
    }
  });

  instance.registerHelper('log', function (message, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, message);
  });

  instance.registerHelper('lookup', function (obj, field) {
    return obj && obj[field];
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 1,

  // Can be overridden in the host environment
  log: function log(level, message) {
    if (typeof console !== 'undefined' && logger.level <= level) {
      var method = logger.methodMap[level];
      (console[method] || console.log).call(console, message); // eslint-disable-line no-console
    }
  }
};

exports.logger = logger;
var log = logger.log;

exports.log = log;

function createFrame(object) {
  var frame = Utils.extend({}, object);
  frame._parent = object;
  return frame;
}

/* [args, ]options */
},{"./exception":6,"./utils":10}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var loc = node && node.loc,
      line = undefined,
      column = undefined;
  if (loc) {
    line = loc.start.line;
    column = loc.start.column;

    message += ' - ' + line + ':' + column;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Exception);
  }

  if (loc) {
    this.lineNumber = line;
    this.column = column;
  }
}

Exception.prototype = new Error();

exports['default'] = Exception;
module.exports = exports['default'];
},{}],7:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;
/*global window */

exports['default'] = function (Handlebars) {
  /* istanbul ignore next */
  var root = typeof global !== 'undefined' ? global : window,
      $Handlebars = root.Handlebars;
  /* istanbul ignore next */
  Handlebars.noConflict = function () {
    if (root.Handlebars === Handlebars) {
      root.Handlebars = $Handlebars;
    }
  };
};

module.exports = exports['default'];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.checkRevision = checkRevision;

// TODO: Remove this line and break up compilePartial

exports.template = template;
exports.wrapProgram = wrapProgram;
exports.resolvePartial = resolvePartial;
exports.invokePartial = invokePartial;
exports.noop = noop;

var _import = require('./utils');

var Utils = _interopRequireWildcard(_import);

var _Exception = require('./exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _COMPILER_REVISION$REVISION_CHANGES$createFrame = require('./base');

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = _COMPILER_REVISION$REVISION_CHANGES$createFrame.COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[currentRevision],
          compilerVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[compilerRevision];
      throw new _Exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new _Exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
    }
  }
}

function template(templateSpec, env) {
  /* istanbul ignore next */
  if (!env) {
    throw new _Exception2['default']('No environment passed to template');
  }
  if (!templateSpec || !templateSpec.main) {
    throw new _Exception2['default']('Unknown template object: ' + typeof templateSpec);
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  function invokePartialWrapper(partial, context, options) {
    if (options.hash) {
      context = Utils.extend({}, context, options.hash);
    }

    partial = env.VM.resolvePartial.call(this, partial, context, options);
    var result = env.VM.invokePartial.call(this, partial, context, options);

    if (result == null && env.compile) {
      options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
      result = options.partials[options.name](context, options);
    }
    if (result != null) {
      if (options.indent) {
        var lines = result.split('\n');
        for (var i = 0, l = lines.length; i < l; i++) {
          if (!lines[i] && i + 1 === l) {
            break;
          }

          lines[i] = options.indent + lines[i];
        }
        result = lines.join('\n');
      }
      return result;
    } else {
      throw new _Exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
    }
  }

  // Just add water
  var container = {
    strict: function strict(obj, name) {
      if (!(name in obj)) {
        throw new _Exception2['default']('"' + name + '" not defined in ' + obj);
      }
      return obj[name];
    },
    lookup: function lookup(depths, name) {
      var len = depths.length;
      for (var i = 0; i < len; i++) {
        if (depths[i] && depths[i][name] != null) {
          return depths[i][name];
        }
      }
    },
    lambda: function lambda(current, context) {
      return typeof current === 'function' ? current.call(context) : current;
    },

    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function fn(i) {
      return templateSpec[i];
    },

    programs: [],
    program: function program(i, data, declaredBlockParams, blockParams, depths) {
      var programWrapper = this.programs[i],
          fn = this.fn(i);
      if (data || depths || blockParams || declaredBlockParams) {
        programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
      }
      return programWrapper;
    },

    data: function data(value, depth) {
      while (value && depth--) {
        value = value._parent;
      }
      return value;
    },
    merge: function merge(param, common) {
      var obj = param || common;

      if (param && common && param !== common) {
        obj = Utils.extend({}, common, param);
      }

      return obj;
    },

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  function ret(context) {
    var options = arguments[1] === undefined ? {} : arguments[1];

    var data = options.data;

    ret._setup(options);
    if (!options.partial && templateSpec.useData) {
      data = initData(context, data);
    }
    var depths = undefined,
        blockParams = templateSpec.useBlockParams ? [] : undefined;
    if (templateSpec.useDepths) {
      depths = options.depths ? [context].concat(options.depths) : [context];
    }

    return templateSpec.main.call(container, context, container.helpers, container.partials, data, blockParams, depths);
  }
  ret.isTop = true;

  ret._setup = function (options) {
    if (!options.partial) {
      container.helpers = container.merge(options.helpers, env.helpers);

      if (templateSpec.usePartial) {
        container.partials = container.merge(options.partials, env.partials);
      }
    } else {
      container.helpers = options.helpers;
      container.partials = options.partials;
    }
  };

  ret._child = function (i, data, blockParams, depths) {
    if (templateSpec.useBlockParams && !blockParams) {
      throw new _Exception2['default']('must pass block params');
    }
    if (templateSpec.useDepths && !depths) {
      throw new _Exception2['default']('must pass parent depths');
    }

    return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
  };
  return ret;
}

function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
  function prog(context) {
    var options = arguments[1] === undefined ? {} : arguments[1];

    return fn.call(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), depths && [context].concat(depths));
  }
  prog.program = i;
  prog.depth = depths ? depths.length : 0;
  prog.blockParams = declaredBlockParams || 0;
  return prog;
}

function resolvePartial(partial, context, options) {
  if (!partial) {
    partial = options.partials[options.name];
  } else if (!partial.call && !options.name) {
    // This is a dynamic partial that returned a string
    options.name = partial;
    partial = options.partials[partial];
  }
  return partial;
}

function invokePartial(partial, context, options) {
  options.partial = true;

  if (partial === undefined) {
    throw new _Exception2['default']('The partial ' + options.name + ' could not be found');
  } else if (partial instanceof Function) {
    return partial(context, options);
  }
}

function noop() {
  return '';
}

function initData(context, data) {
  if (!data || !('root' in data)) {
    data = data ? _COMPILER_REVISION$REVISION_CHANGES$createFrame.createFrame(data) : {};
    data.root = context;
  }
  return data;
}
},{"./base":5,"./exception":6,"./utils":10}],9:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
  return '' + this.string;
};

exports['default'] = SafeString;
module.exports = exports['default'];
},{}],10:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.extend = extend;

// Older IE versions do not directly support indexOf so we must implement our own, sadly.
exports.indexOf = indexOf;
exports.escapeExpression = escapeExpression;
exports.isEmpty = isEmpty;
exports.blockParams = blockParams;
exports.appendContextPath = appendContextPath;
var escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#x27;',
  '`': '&#x60;'
};

var badChars = /[&<>"'`]/g,
    possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr];
}

function extend(obj /* , ...source */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
}

var toString = Object.prototype.toString;

exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
/*eslint-disable func-style, no-var */
var isFunction = function isFunction(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
/* istanbul ignore next */
if (isFunction(/x/)) {
  exports.isFunction = isFunction = function (value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
/*eslint-enable func-style, no-var */

/* istanbul ignore next */
var isArray = Array.isArray || function (value) {
  return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
};exports.isArray = isArray;

function indexOf(array, value) {
  for (var i = 0, len = array.length; i < len; i++) {
    if (array[i] === value) {
      return i;
    }
  }
  return -1;
}

function escapeExpression(string) {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return '';
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = '' + string;
  }

  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}

function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

function blockParams(params, ids) {
  params.path = ids;
  return params;
}

function appendContextPath(contextPath, id) {
  return (contextPath ? contextPath + '.' : '') + id;
}
},{}],11:[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime')['default'];

},{"./dist/cjs/handlebars.runtime":4}],12:[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":11}],13:[function(require,module,exports){

/**!
 * is
 * the definitive JavaScript type testing library
 *
 * @copyright 2013-2014 Enrico Marino / Jordan Harband
 * @license MIT
 */

var objProto = Object.prototype;
var owns = objProto.hasOwnProperty;
var toStr = objProto.toString;
var symbolValueOf;
if (typeof Symbol === 'function') {
  symbolValueOf = Symbol.prototype.valueOf;
}
var isActualNaN = function (value) {
  return value !== value;
};
var NON_HOST_TYPES = {
  boolean: 1,
  number: 1,
  string: 1,
  undefined: 1
};

var base64Regex = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/;
var hexRegex = /^[A-Fa-f0-9]+$/;

/**
 * Expose `is`
 */

var is = module.exports = {};

/**
 * Test general.
 */

/**
 * is.type
 * Test if `value` is a type of `type`.
 *
 * @param {Mixed} value value to test
 * @param {String} type type
 * @return {Boolean} true if `value` is a type of `type`, false otherwise
 * @api public
 */

is.a = is.type = function (value, type) {
  return typeof value === type;
};

/**
 * is.defined
 * Test if `value` is defined.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if 'value' is defined, false otherwise
 * @api public
 */

is.defined = function (value) {
  return typeof value !== 'undefined';
};

/**
 * is.empty
 * Test if `value` is empty.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is empty, false otherwise
 * @api public
 */

is.empty = function (value) {
  var type = toStr.call(value);
  var key;

  if ('[object Array]' === type || '[object Arguments]' === type || '[object String]' === type) {
    return value.length === 0;
  }

  if ('[object Object]' === type) {
    for (key in value) {
      if (owns.call(value, key)) { return false; }
    }
    return true;
  }

  return !value;
};

/**
 * is.equal
 * Test if `value` is equal to `other`.
 *
 * @param {Mixed} value value to test
 * @param {Mixed} other value to compare with
 * @return {Boolean} true if `value` is equal to `other`, false otherwise
 */

is.equal = function (value, other) {
  var strictlyEqual = value === other;
  if (strictlyEqual) {
    return true;
  }

  var type = toStr.call(value);
  var key;

  if (type !== toStr.call(other)) {
    return false;
  }

  if ('[object Object]' === type) {
    for (key in value) {
      if (!is.equal(value[key], other[key]) || !(key in other)) {
        return false;
      }
    }
    for (key in other) {
      if (!is.equal(value[key], other[key]) || !(key in value)) {
        return false;
      }
    }
    return true;
  }

  if ('[object Array]' === type) {
    key = value.length;
    if (key !== other.length) {
      return false;
    }
    while (--key) {
      if (!is.equal(value[key], other[key])) {
        return false;
      }
    }
    return true;
  }

  if ('[object Function]' === type) {
    return value.prototype === other.prototype;
  }

  if ('[object Date]' === type) {
    return value.getTime() === other.getTime();
  }

  return strictlyEqual;
};

/**
 * is.hosted
 * Test if `value` is hosted by `host`.
 *
 * @param {Mixed} value to test
 * @param {Mixed} host host to test with
 * @return {Boolean} true if `value` is hosted by `host`, false otherwise
 * @api public
 */

is.hosted = function (value, host) {
  var type = typeof host[value];
  return type === 'object' ? !!host[value] : !NON_HOST_TYPES[type];
};

/**
 * is.instance
 * Test if `value` is an instance of `constructor`.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is an instance of `constructor`
 * @api public
 */

is.instance = is['instanceof'] = function (value, constructor) {
  return value instanceof constructor;
};

/**
 * is.nil / is.null
 * Test if `value` is null.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is null, false otherwise
 * @api public
 */

is.nil = is['null'] = function (value) {
  return value === null;
};

/**
 * is.undef / is.undefined
 * Test if `value` is undefined.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is undefined, false otherwise
 * @api public
 */

is.undef = is.undefined = function (value) {
  return typeof value === 'undefined';
};

/**
 * Test arguments.
 */

/**
 * is.args
 * Test if `value` is an arguments object.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is an arguments object, false otherwise
 * @api public
 */

is.args = is.arguments = function (value) {
  var isStandardArguments = '[object Arguments]' === toStr.call(value);
  var isOldArguments = !is.array(value) && is.arraylike(value) && is.object(value) && is.fn(value.callee);
  return isStandardArguments || isOldArguments;
};

/**
 * Test array.
 */

/**
 * is.array
 * Test if 'value' is an array.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is an array, false otherwise
 * @api public
 */

is.array = function (value) {
  return '[object Array]' === toStr.call(value);
};

/**
 * is.arguments.empty
 * Test if `value` is an empty arguments object.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is an empty arguments object, false otherwise
 * @api public
 */
is.args.empty = function (value) {
  return is.args(value) && value.length === 0;
};

/**
 * is.array.empty
 * Test if `value` is an empty array.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is an empty array, false otherwise
 * @api public
 */
is.array.empty = function (value) {
  return is.array(value) && value.length === 0;
};

/**
 * is.arraylike
 * Test if `value` is an arraylike object.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is an arguments object, false otherwise
 * @api public
 */

is.arraylike = function (value) {
  return !!value && !is.boolean(value)
    && owns.call(value, 'length')
    && isFinite(value.length)
    && is.number(value.length)
    && value.length >= 0;
};

/**
 * Test boolean.
 */

/**
 * is.boolean
 * Test if `value` is a boolean.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is a boolean, false otherwise
 * @api public
 */

is.boolean = function (value) {
  return '[object Boolean]' === toStr.call(value);
};

/**
 * is.false
 * Test if `value` is false.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is false, false otherwise
 * @api public
 */

is['false'] = function (value) {
  return is.boolean(value) && Boolean(Number(value)) === false;
};

/**
 * is.true
 * Test if `value` is true.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is true, false otherwise
 * @api public
 */

is['true'] = function (value) {
  return is.boolean(value) && Boolean(Number(value)) === true;
};

/**
 * Test date.
 */

/**
 * is.date
 * Test if `value` is a date.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is a date, false otherwise
 * @api public
 */

is.date = function (value) {
  return '[object Date]' === toStr.call(value);
};

/**
 * Test element.
 */

/**
 * is.element
 * Test if `value` is an html element.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is an HTML Element, false otherwise
 * @api public
 */

is.element = function (value) {
  return value !== undefined
    && typeof HTMLElement !== 'undefined'
    && value instanceof HTMLElement
    && value.nodeType === 1;
};

/**
 * Test error.
 */

/**
 * is.error
 * Test if `value` is an error object.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is an error object, false otherwise
 * @api public
 */

is.error = function (value) {
  return '[object Error]' === toStr.call(value);
};

/**
 * Test function.
 */

/**
 * is.fn / is.function (deprecated)
 * Test if `value` is a function.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is a function, false otherwise
 * @api public
 */

is.fn = is['function'] = function (value) {
  var isAlert = typeof window !== 'undefined' && value === window.alert;
  return isAlert || '[object Function]' === toStr.call(value);
};

/**
 * Test number.
 */

/**
 * is.number
 * Test if `value` is a number.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is a number, false otherwise
 * @api public
 */

is.number = function (value) {
  return '[object Number]' === toStr.call(value);
};

/**
 * is.infinite
 * Test if `value` is positive or negative infinity.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is positive or negative Infinity, false otherwise
 * @api public
 */
is.infinite = function (value) {
  return value === Infinity || value === -Infinity;
};

/**
 * is.decimal
 * Test if `value` is a decimal number.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is a decimal number, false otherwise
 * @api public
 */

is.decimal = function (value) {
  return is.number(value) && !isActualNaN(value) && !is.infinite(value) && value % 1 !== 0;
};

/**
 * is.divisibleBy
 * Test if `value` is divisible by `n`.
 *
 * @param {Number} value value to test
 * @param {Number} n dividend
 * @return {Boolean} true if `value` is divisible by `n`, false otherwise
 * @api public
 */

is.divisibleBy = function (value, n) {
  var isDividendInfinite = is.infinite(value);
  var isDivisorInfinite = is.infinite(n);
  var isNonZeroNumber = is.number(value) && !isActualNaN(value) && is.number(n) && !isActualNaN(n) && n !== 0;
  return isDividendInfinite || isDivisorInfinite || (isNonZeroNumber && value % n === 0);
};

/**
 * is.int
 * Test if `value` is an integer.
 *
 * @param value to test
 * @return {Boolean} true if `value` is an integer, false otherwise
 * @api public
 */

is.int = function (value) {
  return is.number(value) && !isActualNaN(value) && value % 1 === 0;
};

/**
 * is.maximum
 * Test if `value` is greater than 'others' values.
 *
 * @param {Number} value value to test
 * @param {Array} others values to compare with
 * @return {Boolean} true if `value` is greater than `others` values
 * @api public
 */

is.maximum = function (value, others) {
  if (isActualNaN(value)) {
    throw new TypeError('NaN is not a valid value');
  } else if (!is.arraylike(others)) {
    throw new TypeError('second argument must be array-like');
  }
  var len = others.length;

  while (--len >= 0) {
    if (value < others[len]) {
      return false;
    }
  }

  return true;
};

/**
 * is.minimum
 * Test if `value` is less than `others` values.
 *
 * @param {Number} value value to test
 * @param {Array} others values to compare with
 * @return {Boolean} true if `value` is less than `others` values
 * @api public
 */

is.minimum = function (value, others) {
  if (isActualNaN(value)) {
    throw new TypeError('NaN is not a valid value');
  } else if (!is.arraylike(others)) {
    throw new TypeError('second argument must be array-like');
  }
  var len = others.length;

  while (--len >= 0) {
    if (value > others[len]) {
      return false;
    }
  }

  return true;
};

/**
 * is.nan
 * Test if `value` is not a number.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is not a number, false otherwise
 * @api public
 */

is.nan = function (value) {
  return !is.number(value) || value !== value;
};

/**
 * is.even
 * Test if `value` is an even number.
 *
 * @param {Number} value value to test
 * @return {Boolean} true if `value` is an even number, false otherwise
 * @api public
 */

is.even = function (value) {
  return is.infinite(value) || (is.number(value) && value === value && value % 2 === 0);
};

/**
 * is.odd
 * Test if `value` is an odd number.
 *
 * @param {Number} value value to test
 * @return {Boolean} true if `value` is an odd number, false otherwise
 * @api public
 */

is.odd = function (value) {
  return is.infinite(value) || (is.number(value) && value === value && value % 2 !== 0);
};

/**
 * is.ge
 * Test if `value` is greater than or equal to `other`.
 *
 * @param {Number} value value to test
 * @param {Number} other value to compare with
 * @return {Boolean}
 * @api public
 */

is.ge = function (value, other) {
  if (isActualNaN(value) || isActualNaN(other)) {
    throw new TypeError('NaN is not a valid value');
  }
  return !is.infinite(value) && !is.infinite(other) && value >= other;
};

/**
 * is.gt
 * Test if `value` is greater than `other`.
 *
 * @param {Number} value value to test
 * @param {Number} other value to compare with
 * @return {Boolean}
 * @api public
 */

is.gt = function (value, other) {
  if (isActualNaN(value) || isActualNaN(other)) {
    throw new TypeError('NaN is not a valid value');
  }
  return !is.infinite(value) && !is.infinite(other) && value > other;
};

/**
 * is.le
 * Test if `value` is less than or equal to `other`.
 *
 * @param {Number} value value to test
 * @param {Number} other value to compare with
 * @return {Boolean} if 'value' is less than or equal to 'other'
 * @api public
 */

is.le = function (value, other) {
  if (isActualNaN(value) || isActualNaN(other)) {
    throw new TypeError('NaN is not a valid value');
  }
  return !is.infinite(value) && !is.infinite(other) && value <= other;
};

/**
 * is.lt
 * Test if `value` is less than `other`.
 *
 * @param {Number} value value to test
 * @param {Number} other value to compare with
 * @return {Boolean} if `value` is less than `other`
 * @api public
 */

is.lt = function (value, other) {
  if (isActualNaN(value) || isActualNaN(other)) {
    throw new TypeError('NaN is not a valid value');
  }
  return !is.infinite(value) && !is.infinite(other) && value < other;
};

/**
 * is.within
 * Test if `value` is within `start` and `finish`.
 *
 * @param {Number} value value to test
 * @param {Number} start lower bound
 * @param {Number} finish upper bound
 * @return {Boolean} true if 'value' is is within 'start' and 'finish'
 * @api public
 */
is.within = function (value, start, finish) {
  if (isActualNaN(value) || isActualNaN(start) || isActualNaN(finish)) {
    throw new TypeError('NaN is not a valid value');
  } else if (!is.number(value) || !is.number(start) || !is.number(finish)) {
    throw new TypeError('all arguments must be numbers');
  }
  var isAnyInfinite = is.infinite(value) || is.infinite(start) || is.infinite(finish);
  return isAnyInfinite || (value >= start && value <= finish);
};

/**
 * Test object.
 */

/**
 * is.object
 * Test if `value` is an object.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is an object, false otherwise
 * @api public
 */

is.object = function (value) {
  return '[object Object]' === toStr.call(value);
};

/**
 * is.hash
 * Test if `value` is a hash - a plain object literal.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is a hash, false otherwise
 * @api public
 */

is.hash = function (value) {
  return is.object(value) && value.constructor === Object && !value.nodeType && !value.setInterval;
};

/**
 * Test regexp.
 */

/**
 * is.regexp
 * Test if `value` is a regular expression.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is a regexp, false otherwise
 * @api public
 */

is.regexp = function (value) {
  return '[object RegExp]' === toStr.call(value);
};

/**
 * Test string.
 */

/**
 * is.string
 * Test if `value` is a string.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if 'value' is a string, false otherwise
 * @api public
 */

is.string = function (value) {
  return '[object String]' === toStr.call(value);
};

/**
 * Test base64 string.
 */

/**
 * is.base64
 * Test if `value` is a valid base64 encoded string.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if 'value' is a base64 encoded string, false otherwise
 * @api public
 */

is.base64 = function (value) {
  return is.string(value) && (!value.length || base64Regex.test(value));
};

/**
 * Test base64 string.
 */

/**
 * is.hex
 * Test if `value` is a valid hex encoded string.
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if 'value' is a hex encoded string, false otherwise
 * @api public
 */

is.hex = function (value) {
  return is.string(value) && (!value.length || hexRegex.test(value));
};

/**
 * is.symbol
 * Test if `value` is an ES6 Symbol
 *
 * @param {Mixed} value value to test
 * @return {Boolean} true if `value` is a Symbol, false otherise
 * @api public
 */

is.symbol = function (value) {
  return typeof Symbol === 'function' && toStr.call(value) === '[object Symbol]' && typeof symbolValueOf.call(value) === 'symbol';
};

},{}],14:[function(require,module,exports){
// Avoid console errors for the IE crappy browsers
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _App = require('./app/App');

var _App2 = _interopRequireDefault(_App);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _gsap = require('gsap');

var _gsap2 = _interopRequireDefault(_gsap);

var _raf = require('./app/utils/raf');

var _raf2 = _interopRequireDefault(_raf);

var _jqueryMousewheel = require('jquery-mousewheel');

var _jqueryMousewheel2 = _interopRequireDefault(_jqueryMousewheel);

if (!window.console) console = { log: function log() {} };

window.jQuery = window.$ = _jquery2['default'];

(0, _jqueryMousewheel2['default'])(_jquery2['default']);

// Start App
var app = new _App2['default']();
app.init();

},{"./app/App":15,"./app/utils/raf":64,"gsap":"gsap","jquery":"jquery","jquery-mousewheel":"jquery-mousewheel"}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppActions = require('./actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var _AppTemplate = require('./AppTemplate');

var _AppTemplate2 = _interopRequireDefault(_AppTemplate);

var _Router = require('./services/Router');

var _Router2 = _interopRequireDefault(_Router);

var _GlobalEvents = require('./services/GlobalEvents');

var _GlobalEvents2 = _interopRequireDefault(_GlobalEvents);

var _Pool = require('./services/Pool');

var _Pool2 = _interopRequireDefault(_Pool);

var _Preloader = require('./services/Preloader');

var _Preloader2 = _interopRequireDefault(_Preloader);

var _Sounds = require('./services/Sounds');

var _Sounds2 = _interopRequireDefault(_Sounds);

var _mobileDetect = require('mobile-detect');

var _mobileDetect2 = _interopRequireDefault(_mobileDetect);

var _AppConstants = require('./constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _hasher = require('hasher');

var _hasher2 = _interopRequireDefault(_hasher);

var _PagesLoader = require('./components/PagesLoader');

var _PagesLoader2 = _interopRequireDefault(_PagesLoader);

var _Utils = require('./utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var App = (function () {
	function App() {
		_classCallCheck(this, App);

		this.onMainAssetsLoaded = this.onMainAssetsLoaded.bind(this);
	}

	_createClass(App, [{
		key: 'init',
		value: function init() {
			var md = new _mobileDetect2['default'](window.navigator.userAgent);

			_AppStore2['default'].Detector.isMobile = md.mobile() || md.tablet() ? true : false;

			var $appContainer = $('#app-container');
			_AppStore2['default'].Detector.oldIE = $appContainer.is('.ie6, .ie7, .ie8');
			// AppStore.Detector.oldIE = true

			_AppStore2['default'].Detector.isSupportWebGL = _Utils2['default'].SupportWebGL();

			if (_AppStore2['default'].Detector.oldIE) {
				_AppStore2['default'].Detector.isMobile = true;
			}

			// Init Preloader
			_AppStore2['default'].Preloader = new _Preloader2['default']();

			// Init Sounds
			_AppStore2['default'].Sounds = new _Sounds2['default']();

			// Init Pool
			_AppStore2['default'].Pool = new _Pool2['default']();

			_AppStore2['default'].PagesLoader = new _PagesLoader2['default']($('#assets-loader-page'));
			_AppStore2['default'].PagesLoader.componentDidMount();

			// Init router
			this.router = new _Router2['default']();
			this.router.init();

			this.$mainLoader = $('#main-loader');
			this.$mainLoader.css('opacity', 1);
			var $spinner = this.$mainLoader.find('.spinner-wrapper');
			var $spinnerSvg = $spinner.find('svg');
			var $logo = this.$mainLoader.find('.logo');
			var $background = this.$mainLoader.find('.background');
			this.tlIn = _AppStore2['default'].getTimeline();
			this.tlOut = _AppStore2['default'].getTimeline();

			this.tlIn.fromTo($spinner, 1, { opacity: 0 }, { opacity: 1, force3D: true, ease: Expo.easeOut }, 0);
			this.tlIn.fromTo($logo, 1, { opacity: 0 }, { opacity: 1, force3D: true, ease: Expo.easeOut }, 0);
			this.tlIn.play(0);

			this.spinnerTween = TweenMax.to($spinnerSvg, 0.5, { rotation: '360deg', repeat: -1, ease: Linear.easeNone });

			this.tlOut.to($spinner, 1, { scale: 1.2, y: 10, opacity: 0, force3D: true, ease: Expo.easeInOut }, 0);
			this.tlOut.to($logo, 1, { scale: 1.2, y: -10, opacity: 0, force3D: true, ease: Expo.easeInOut }, 0);
			this.tlOut.to($background, 1, { opacity: 0, force3D: true, ease: Expo.easeInOut }, 0.6);
			this.tlOut.pause(0);

			// Init global events
			window.GlobalEvents = new _GlobalEvents2['default']();
			GlobalEvents.init();

			var appTemplate = new _AppTemplate2['default']();
			appTemplate.isReady = function () {};
			appTemplate.render('#app-container');
			this.loadMainAssets();
		}
	}, {
		key: 'loadMainAssets',
		value: function loadMainAssets() {
			var hashUrl = location.hash.substring(2);
			var parts = hashUrl.substr(1).split('/');

			var manifest = [];
			if (parts.length < 3) {
				var h = {
					hash: hashUrl,
					parts: parts
				};
				_hasher2['default'].newHash = h;
				var manifest = _AppStore2['default'].pageAssetsToLoad();
			}

			if (manifest.length < 1 && parts.length < 3) {

				var manifest = [];
				var planets = _AppStore2['default'].planets();
				for (var i = 0; i < planets.length; i++) {
					var planet = planets[i];
					var o = {};
					var imgUrl = _AppStore2['default'].mainImageUrl(planet, _AppConstants2['default'].RESPONSIVE_IMAGE);
					manifest[i] = {
						id: 'main-loader-assets-' + planet,
						src: imgUrl
					};
				}
			}
			if (manifest.length < 1) {
				this.onMainAssetsLoaded();
			} else {
				_AppStore2['default'].Preloader.load(manifest, this.onMainAssetsLoaded);
			}
		}
	}, {
		key: 'onMainAssetsLoaded',
		value: function onMainAssetsLoaded() {
			var _this = this;

			setTimeout(function () {
				_this.tlOut.play();
				// Start routing
				_this.router.beginRouting();
				setTimeout(function () {
					_this.spinnerTween.pause();
					_this.spinnerTween = null;
					_this.$mainLoader.remove();
					_AppStore2['default'].releaseTimeline(_this.tlIn);
					_AppStore2['default'].releaseTimeline(_this.tlOut);
				}, 1600);
			}, 500);
		}
	}]);

	return App;
})();

exports['default'] = App;
module.exports = exports['default'];

},{"./AppTemplate":16,"./actions/AppActions":17,"./components/PagesLoader":31,"./constants/AppConstants":47,"./services/GlobalEvents":54,"./services/Pool":55,"./services/Preloader":56,"./services/Router":57,"./services/Sounds":58,"./stores/AppStore":60,"./utils/Utils":62,"hasher":"hasher","mobile-detect":"mobile-detect"}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseComponent2 = require('./../pager/components/BaseComponent');

var _BaseComponent3 = _interopRequireDefault(_BaseComponent2);

var _FrontContainer = require('./components/FrontContainer');

var _FrontContainer2 = _interopRequireDefault(_FrontContainer);

var _PagesContainer = require('./components/PagesContainer');

var _PagesContainer2 = _interopRequireDefault(_PagesContainer);

var _PXContainer = require('./components/PXContainer');

var _PXContainer2 = _interopRequireDefault(_PXContainer);

var _AppStore = require('./stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppConstants = require('./constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _AppActions = require('./actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var AppTemplate = (function (_BaseComponent) {
	_inherits(AppTemplate, _BaseComponent);

	function AppTemplate() {
		_classCallCheck(this, AppTemplate);

		_get(Object.getPrototypeOf(AppTemplate.prototype), 'constructor', this).call(this);
		this.isReady = undefined;
		_AppStore2['default'].on(_AppConstants2['default'].WINDOW_RESIZE, this.resize);
	}

	_createClass(AppTemplate, [{
		key: 'render',
		value: function render(parent) {
			_get(Object.getPrototypeOf(AppTemplate.prototype), 'render', this).call(this, 'AppTemplate', parent, undefined);
		}
	}, {
		key: 'componentWillMount',
		value: function componentWillMount() {
			_get(Object.getPrototypeOf(AppTemplate.prototype), 'componentWillMount', this).call(this);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this = this;

			_get(Object.getPrototypeOf(AppTemplate.prototype), 'componentDidMount', this).call(this);

			this.frontContainer = new _FrontContainer2['default']();
			this.frontContainer.render('#app-template');

			this.pagesContainer = new _PagesContainer2['default']();
			this.pagesContainer.render('#app-template');

			this.pxContainer = new _PXContainer2['default']();
			this.pxContainer.init('#app-template');
			_AppActions2['default'].pxContainerIsReady(this.pxContainer);

			GlobalEvents.resize();

			setTimeout(function () {
				_this.onReady();
			}, 0);
		}
	}, {
		key: 'onReady',
		value: function onReady() {
			this.isReady();
			this.animate();
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(AppTemplate.prototype), 'componentWillUnmount', this).call(this);
		}
	}, {
		key: 'animate',
		value: function animate() {
			requestAnimationFrame(this.animate);
			this.pxContainer.update();
			this.pagesContainer.update();
		}
	}, {
		key: 'resize',
		value: function resize() {
			this.frontContainer.resize();
			this.pxContainer.resize();
		}
	}]);

	return AppTemplate;
})(_BaseComponent3['default']);

exports['default'] = AppTemplate;
module.exports = exports['default'];

},{"./../pager/components/BaseComponent":66,"./actions/AppActions":17,"./components/FrontContainer":24,"./components/PXContainer":28,"./components/PagesContainer":30,"./constants/AppConstants":47,"./stores/AppStore":60}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _AppDispatcher = require('./../dispatchers/AppDispatcher');

var _AppDispatcher2 = _interopRequireDefault(_AppDispatcher);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

function _proceedHasherChangeAction(pageId) {
    _AppDispatcher2['default'].handleViewAction({
        actionType: _AppConstants2['default'].PAGE_HASHER_CHANGED,
        item: pageId
    });
}
var AppActions = {
    pageHasherChanged: function pageHasherChanged(pageId) {
        var manifest = _AppStore2['default'].pageAssetsToLoad();
        if (manifest.length < 1) {
            _proceedHasherChangeAction(pageId);
        } else {
            _AppStore2['default'].PagesLoader.open();
            _AppStore2['default'].Preloader.load(manifest, function () {
                _AppStore2['default'].PagesLoader.close();
                _proceedHasherChangeAction(pageId);
            });
        }
    },
    windowResize: function windowResize(windowW, windowH) {
        _AppDispatcher2['default'].handleViewAction({
            actionType: _AppConstants2['default'].WINDOW_RESIZE,
            item: { windowW: windowW, windowH: windowH }
        });
    },
    pxContainerIsReady: function pxContainerIsReady(component) {
        _AppDispatcher2['default'].handleViewAction({
            actionType: _AppConstants2['default'].PX_CONTAINER_IS_READY,
            item: component
        });
    },
    pxAddChild: function pxAddChild(child) {
        _AppDispatcher2['default'].handleViewAction({
            actionType: _AppConstants2['default'].PX_CONTAINER_ADD_CHILD,
            item: { child: child }
        });
    },
    pxRemoveChild: function pxRemoveChild(child) {
        _AppDispatcher2['default'].handleViewAction({
            actionType: _AppConstants2['default'].PX_CONTAINER_REMOVE_CHILD,
            item: { child: child }
        });
    },
    toggleSounds: function toggleSounds() {
        _AppDispatcher2['default'].handleViewAction({
            actionType: _AppConstants2['default'].TOGGLE_SOUNDS,
            item: undefined
        });
    }
};

exports['default'] = AppActions;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../dispatchers/AppDispatcher":48,"./../stores/AppStore":60}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _Knot = require('./Knot');

var _Knot2 = _interopRequireDefault(_Knot);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var ArrowBtn = (function () {
	function ArrowBtn(element, direction) {
		_classCallCheck(this, ArrowBtn);

		this.element = element;
		this.direction = direction;
	}

	_createClass(ArrowBtn, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.tlOver = _AppStore2['default'].getTimeline();
			this.tlOut = _AppStore2['default'].getTimeline();
			var knotsEl = this.element.find(".knot");
			var linesEl = this.element.find(".line");
			var radius = 3;
			var margin = 30;
			this.lineSize = _AppStore2['default'].getLineWidth();

			for (var i = 0; i < knotsEl.length; i++) {
				var knot = $(knotsEl[i]);
				knot.attr('r', radius);
			};
			for (var i = 0; i < linesEl.length; i++) {
				var line = $(linesEl[i]);
				line.css('stroke-width', this.lineSize);
			};

			var startX = margin >> 1;
			var startY = margin;
			var offsetUpDown = 0.6;
			$(knotsEl.get(0)).attr({
				'cx': startX + 0,
				'cy': startY + 0
			});
			$(knotsEl.get(1)).attr({
				'cx': startX + margin,
				'cy': startY + 0
			});
			$(knotsEl.get(2)).attr({
				'cx': startX + margin * 2,
				'cy': startY + 0
			});
			$(knotsEl.get(3)).attr({
				'cx': startX + margin * offsetUpDown,
				'cy': startY - margin * offsetUpDown
			});
			$(knotsEl.get(4)).attr({
				'cx': startX + margin * offsetUpDown,
				'cy': startY + margin * offsetUpDown
			});
			$(linesEl.get(0)).attr({
				'x1': startX + 0,
				'y1': startY + 0,
				'x2': startX + margin,
				'y2': startY + 0
			});
			$(linesEl.get(1)).attr({
				'x1': startX + margin,
				'y1': startY + 0,
				'x2': startX + margin * 2,
				'y2': startY + 0
			});
			$(linesEl.get(2)).attr({
				'x1': startX + 0,
				'y1': startY + 0,
				'x2': startX + margin * offsetUpDown,
				'y2': startY - margin * offsetUpDown
			});
			$(linesEl.get(3)).attr({
				'x1': startX + 0,
				'y1': startY + 0,
				'x2': startX + margin * offsetUpDown,
				'y2': startY + margin * offsetUpDown
			});

			var offset = 10;
			this.tlOver.to(knotsEl[0], 1, { x: -offset + (radius >> 1), force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOver.to(knotsEl[1], 1, { x: -offset, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOver.to(knotsEl[2], 1, { x: -offset, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOver.to(linesEl[0], 1, { scaleX: 1.1, x: -offset, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
			this.tlOver.to(linesEl[1], 1, { scaleX: 1.1, x: -offset, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
			this.tlOver.to(linesEl[2], 1, { x: -offset, rotation: '10deg', force3D: true, transformOrigin: '0% 100%', ease: Elastic.easeOut }, 0);
			this.tlOver.to(linesEl[3], 1, { x: -offset, rotation: '-10deg', force3D: true, transformOrigin: '0% 0%', ease: Elastic.easeOut }, 0);
			this.tlOver.to(knotsEl[3], 1, { x: -offset / 2, y: offset / 2 - radius, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOver.to(knotsEl[4], 1, { x: -offset / 2, y: -(offset / 2) + radius, force3D: true, ease: Elastic.easeOut }, 0);

			this.tlOut.to(knotsEl[0], 1, { x: 0, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOut.to(knotsEl[1], 1, { x: 0, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOut.to(knotsEl[2], 1, { x: 0, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOut.to(linesEl[0], 1, { scaleX: 1, x: 0, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
			this.tlOut.to(linesEl[1], 1, { scaleX: 1, x: 0, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
			this.tlOut.to(linesEl[2], 1, { x: 0, rotation: '0deg', force3D: true, transformOrigin: '0% 100%', ease: Elastic.easeOut }, 0);
			this.tlOut.to(linesEl[3], 1, { x: 0, rotation: '0deg', force3D: true, transformOrigin: '0% 0%', ease: Elastic.easeOut }, 0);
			this.tlOut.to(knotsEl[3], 1, { x: 0, y: 0, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOut.to(knotsEl[4], 1, { x: 0, y: 0, force3D: true, ease: Elastic.easeOut }, 0);

			if (_AppStore2['default'].Detector.oldIE) {
				switch (this.direction) {
					case _AppConstants2['default'].RIGHT:
						this.element.html('<img src=' + _AppStore2['default'].baseMediaPath() + 'image/arrow-next.png' + '>');
						break;
					case _AppConstants2['default'].LEFT:
						this.element.html('<img src=' + _AppStore2['default'].baseMediaPath() + 'image/arrow-previous.png' + '>');
						break;
				}
			} else {
				switch (this.direction) {
					case _AppConstants2['default'].LEFT:
						break;
					case _AppConstants2['default'].RIGHT:
						TweenMax.set(this.element, { rotation: '180deg', transformOrigin: '50% 50%' });
						break;
					case _AppConstants2['default'].TOP:
						TweenMax.set(this.element, { rotation: '90deg', transformOrigin: '50% 50%' });
						break;
					case _AppConstants2['default'].BOTTOM:
						TweenMax.set(this.element, { rotation: '-90deg', transformOrigin: '50% 50%' });
						break;
				}
			}

			this.tlOver.pause(0);
			this.tlOut.pause(0);

			this.rollover = this.rollover.bind(this);
			this.rollout = this.rollout.bind(this);
			this.click = this.click.bind(this);
			this.element.on('mouseenter', this.rollover);
			this.element.on('mouseleave', this.rollout);
			if (this.btnClicked != undefined) this.element.on('click', this.click);

			this.width = margin * 3;
			this.height = margin * 2;
			this.element.css({
				width: this.width,
				height: this.height
			});
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			this.element.css({
				left: x,
				top: y
			});
		}
	}, {
		key: 'click',
		value: function click(e) {
			e.preventDefault();
			this.btnClicked(this.direction);
		}
	}, {
		key: 'rollout',
		value: function rollout(e) {
			e.preventDefault();
			this.mouseOut();
		}
	}, {
		key: 'rollover',
		value: function rollover(e) {
			e.preventDefault();
			this.mouseOver();
		}
	}, {
		key: 'mouseOver',
		value: function mouseOver() {
			this.tlOut.kill();
			this.tlOver.play(0);
		}
	}, {
		key: 'mouseOut',
		value: function mouseOut() {
			this.tlOver.kill();
			this.tlOut.play(0);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_AppStore2['default'].releaseTimeline(this.tlOver);
			_AppStore2['default'].releaseTimeline(this.tlOut);
			this.element.off('mouseenter', this.rollover);
			this.element.off('mouseleave', this.rollout);
			this.element.off('click', this.click);
		}
	}]);

	return ArrowBtn;
})();

exports['default'] = ArrowBtn;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../stores/AppStore":60,"./../utils/Utils":62,"./Knot":26}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BasePlanetPage2 = require('./BasePlanetPage');

var _BasePlanetPage3 = _interopRequireDefault(_BasePlanetPage2);

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _ScrollBar = require('./ScrollBar');

var _ScrollBar2 = _interopRequireDefault(_ScrollBar);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var BaseCampaignPage = (function (_BasePlanetPage) {
	_inherits(BaseCampaignPage, _BasePlanetPage);

	function BaseCampaignPage(props) {
		_classCallCheck(this, BaseCampaignPage);

		props.data.isMobile = _AppStore2['default'].Detector.isMobile;
		props.data.isOldIE = _AppStore2['default'].Detector.oldIE;
		_get(Object.getPrototypeOf(BaseCampaignPage.prototype), 'constructor', this).call(this, props);
		this.pxScrollContainer = _AppStore2['default'].getContainer();
		if (!_AppStore2['default'].Detector.oldIE) this.pxContainer.addChild(this.pxScrollContainer);
		this.pageHeight = 0;
		this.scrollTarget = 0;
	}

	_createClass(BaseCampaignPage, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.scrollEl = this.child.find(".interface.absolute").get(0);

			if (!_AppStore2['default'].Detector.isMobile) {
				this.onWheel = this.onWheel.bind(this);
				$(window).on("mousewheel", this.onWheel);
				this.scrollTarget = 0;
				this.lastScrollY = 0;
				this.scrollEase = 0.1;

				this.onScrollTarget = this.onScrollTarget.bind(this);
				var scrollEl = this.child.find('#scrollbar-view');
				this.scrollbar = new _ScrollBar2['default'](scrollEl);
				this.scrollbar.scrollTargetHandler = this.onScrollTarget;
				this.scrollbar.componentDidMount();
			}

			_get(Object.getPrototypeOf(BaseCampaignPage.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'onScrollTarget',
		value: function onScrollTarget(val) {
			this.scrollTargetChanged(val);
		}
	}, {
		key: 'scrollTargetChanged',
		value: function scrollTargetChanged(val) {
			this.scrollTarget = val;
			this.applyScrollBounds();
			this.scrollbar.setScrollTarget(this.scrollTarget);
		}
	}, {
		key: 'onWheel',
		value: function onWheel(e) {
			e.preventDefault();
			var delta = e.wheelDelta;
			var value = -(e.deltaY * e.deltaFactor);
			this.updateScrollTarget(value);
		}
	}, {
		key: 'updateScrollTarget',
		value: function updateScrollTarget(value) {
			this.scrollTarget += value;
			this.applyScrollBounds();
			this.scrollbar.setScrollTarget(this.scrollTarget);
		}
	}, {
		key: 'applyScrollBounds',
		value: function applyScrollBounds() {
			var windowH = _AppStore2['default'].Window.h;
			this.scrollTarget = this.scrollTarget < 0 ? 0 : this.scrollTarget;
			this.scrollTarget = this.scrollTarget + windowH > this.pageHeight ? this.pageHeight - windowH : this.scrollTarget;
		}
	}, {
		key: 'update',
		value: function update() {
			if (!_AppStore2['default'].Detector.isMobile) {
				this.lastScrollY += (this.scrollTarget - this.lastScrollY) * this.scrollEase;
				_Utils2['default'].Translate(this.scrollEl, 0, -this.lastScrollY, 0);
				this.pxScrollContainer.y = -this.lastScrollY;
				this.scrollbar.update();
			}
		}
	}, {
		key: 'resize',
		value: function resize() {

			if (_AppStore2['default'].Detector.isMobile) {
				_get(Object.getPrototypeOf(BaseCampaignPage.prototype), 'resize', this).call(this);
			} else {
				var windowH = _AppStore2['default'].Window.h;
				this.scrollbar.pageHeight = this.pageHeight - windowH;
				this.scrollbar.resize();
				_get(Object.getPrototypeOf(BaseCampaignPage.prototype), 'resize', this).call(this);
			}
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			_get(Object.getPrototypeOf(BaseCampaignPage.prototype), 'didTransitionOutComplete', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			if (!_AppStore2['default'].Detector.isMobile) this.scrollbar.componentWillUnmount();
			if (!_AppStore2['default'].Detector.oldIE) this.pxScrollContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.pxScrollContainer);
			$(window).off("mousewheel", this.onWheel);
			_get(Object.getPrototypeOf(BaseCampaignPage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return BaseCampaignPage;
})(_BasePlanetPage3['default']);

exports['default'] = BaseCampaignPage;
module.exports = exports['default'];

},{"./../actions/AppActions":17,"./../stores/AppStore":60,"./../utils/Utils":62,"./BasePlanetPage":20,"./ScrollBar":36}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _Page2 = require('./Page');

var _Page3 = _interopRequireDefault(_Page2);

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var BasePlanetPage = (function (_Page) {
	_inherits(BasePlanetPage, _Page);

	function BasePlanetPage(props) {
		_classCallCheck(this, BasePlanetPage);

		_get(Object.getPrototypeOf(BasePlanetPage.prototype), 'constructor', this).call(this, props);
		this.experience = undefined;
	}

	_createClass(BasePlanetPage, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(BasePlanetPage.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			_get(Object.getPrototypeOf(BasePlanetPage.prototype), 'didTransitionOutComplete', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			if (this.experience != undefined) this.experience.componentWillUnmount();
			_get(Object.getPrototypeOf(BasePlanetPage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return BasePlanetPage;
})(_Page3['default']);

exports['default'] = BasePlanetPage;
module.exports = exports['default'];

},{"./../actions/AppActions":17,"./Page":29}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _SpringGarden = require('./SpringGarden');

var _SpringGarden2 = _interopRequireDefault(_SpringGarden);

var _CompassRings = require('./CompassRings');

var _CompassRings2 = _interopRequireDefault(_CompassRings);

var Compass = (function () {
	function Compass(pxContainer, type) {
		_classCallCheck(this, Compass);

		this.pxContainer = pxContainer;
		this.type = type || _AppConstants2['default'].LANDING;
	}

	_createClass(Compass, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.container = _AppStore2['default'].getContainer();
			this.pxContainer.addChild(this.container);

			this.rings = new _CompassRings2['default'](this.container);
			this.rings.componentDidMount();

			this.springGardens = [];
			this.getRadius();
		}
	}, {
		key: 'updateData',
		value: function updateData(data) {
			this.removePreviousSpringGardens();
			this.springGardens = [];
			for (var i = 0; i < data.length; i++) {
				var springGarden = _AppStore2['default'].getSpringGarden();
				var product = data[i];
				var color = product.color;
				springGarden.id = this.id;
				springGarden.radius = this.radius;
				springGarden.knotRadius = this.knotRadius;
				springGarden.componentDidMount(product, this.type);
				this.container.addChild(springGarden.container);
				this.springGardens[i] = springGarden;
			}
		}
	}, {
		key: 'removePreviousSpringGardens',
		value: function removePreviousSpringGardens() {
			for (var i = 0; i < this.springGardens.length; i++) {
				var springGarden = this.springGardens[i];
				springGarden.clear();
				springGarden.componentWillUnmount();
				_AppStore2['default'].releaseSpringGarden(springGarden);
			}
		}
	}, {
		key: 'update',
		value: function update() {
			if (this.springGardens.length < 1) return;
			for (var i = 0; i < this.springGardens.length; i++) {
				var springGarden = this.springGardens[i];
				springGarden.update();
			}
		}
	}, {
		key: 'getRadius',
		value: function getRadius() {
			var windowH = _AppStore2['default'].Window.h;
			var sizePercentage = this.type == _AppConstants2['default'].EXPERIENCE || this.type == _AppConstants2['default'].CAMPAIGN ? _AppConstants2['default'].COMPASS_SMALL_SIZE_PERCENTAGE : _AppConstants2['default'].COMPASS_SIZE_PERCENTAGE;
			this.radius = windowH * sizePercentage;
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {}
	}, {
		key: 'willTransitionOut',
		value: function willTransitionOut() {}
	}, {
		key: 'updateRadius',
		value: function updateRadius() {
			this.getRadius();
			this.rings.resize(this.radius);
		}
	}, {
		key: 'resize',
		value: function resize() {
			if (this.type == _AppConstants2['default'].LANDING) {
				this.updateRadius();
			}
			if (this.springGardens.length < 1) return;
			for (var i = 0; i < this.springGardens.length; i++) {
				var springGarden = this.springGardens[i];
				springGarden.resize(this.radius);
			}
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			this.container.x = x;
			this.container.y = y;
			this.x = x;
			this.y = y;
		}
	}, {
		key: 'scale',
		value: function scale(x, y) {
			this.container.scale.x = x;
			this.container.scale.y = y;
			this.scaleX = x;
			this.scaleY = y;
		}
	}, {
		key: 'positionElement',
		value: function positionElement(x, y) {}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.container.removeChildren();
			_AppStore2['default'].releaseContainer(this.container);
			this.removePreviousSpringGardens();
			this.rings.componentWillUnmount();
		}
	}]);

	return Compass;
})();

exports['default'] = Compass;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../stores/AppStore":60,"./CompassRings":22,"./SpringGarden":38}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var CompassRings = (function () {
	function CompassRings(parentContainer) {
		_classCallCheck(this, CompassRings);

		this.container = parentContainer;
	}

	_createClass(CompassRings, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.ringsContainer = _AppStore2['default'].getContainer();
			this.titlesContainer = _AppStore2['default'].getContainer();
			this.container.addChild(this.ringsContainer);
			this.container.addChild(this.titlesContainer);

			this.circles = [];
			var ciclesLen = 6;
			for (var i = 0; i < ciclesLen; i++) {
				var g = new PIXI.Graphics();
				this.circles[i] = g;
				this.ringsContainer.addChild(g);
			}

			this.titles = [];
			var globalContent = _AppStore2['default'].globalContent();
			var elements = _AppStore2['default'].elementsOfNature();
			var elementsTexts = globalContent.elements;
			var fontSize = 26;

			for (var i = 0; i < elements.length; i++) {
				var elementId = elements[i];
				var elementTitle = elementsTexts[elementId].toUpperCase();
				var txt = new PIXI.Text(elementTitle, { font: fontSize + 'px FuturaBold', fill: 'white', align: 'center' });
				txt.anchor.x = 0.5;
				txt.anchor.y = 0.5;
				this.titlesContainer.addChild(txt);
				this.titles.push({
					txt: txt,
					degBegin: this.getDegreesBeginForTitlesById(elementId)
				});
			}
		}
	}, {
		key: 'getDegreesBeginForTitlesById',
		value: function getDegreesBeginForTitlesById(id) {
			// be careful starts from center -90deg
			switch (id) {
				case 'fire':
					return -130;
				case 'earth':
					return -50;
				case 'metal':
					return 15;
				case 'water':
					return 90;
				case 'wood':
					return 165;
			}
		}
	}, {
		key: 'drawRings',
		value: function drawRings() {
			var radiusMargin = this.radius / this.circles.length;
			var len = this.circles.length + 1;
			var lastR;
			var lineW = _AppStore2['default'].getLineWidth();
			var color = 0xffffff;
			for (var i = 1; i < len; i++) {
				var g = this.circles[i - 1];
				var r;

				g.clear();

				// radius differences
				if (i == 1) r = radiusMargin * 0.16;else r = lastR + radiusMargin;

				// lines
				if (i == 3) {
					this.drawAroundThreeGroupLines(lastR, r, g, lineW, color);
				}
				if (i == 6) {
					this.drawAroundFourGroupLines(lastR, r, g, lineW, color);
					this.drawTitles(r, color);
				}

				// circle
				this.drawCircle(g, r);

				lastR = r;
			}
		}
	}, {
		key: 'drawAroundThreeGroupLines',
		value: function drawAroundThreeGroupLines(lastR, newR, g, lineW, color) {
			var leftTheta = 7 * Math.PI / 6;
			var rightTheta = 11 * Math.PI / 6;

			this.drawAroundLine(g, lineW, color, 0, -newR, 0, -lastR);

			var fromX = newR * Math.cos(leftTheta);
			var fromY = -newR * Math.sin(leftTheta);
			var toX = lastR * Math.cos(leftTheta);
			var toY = -lastR * Math.sin(leftTheta);
			this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY);

			fromX = newR * Math.cos(rightTheta);
			fromY = -newR * Math.sin(rightTheta);
			toX = lastR * Math.cos(rightTheta);
			toY = -lastR * Math.sin(rightTheta);
			this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY);
		}
	}, {
		key: 'drawAroundFourGroupLines',
		value: function drawAroundFourGroupLines(lastR, newR, g, lineW, color) {
			var leftTopTheta = 11 * Math.PI / 12;
			var rightTopTheta = Math.PI / 12;

			var leftBottomTheta = 5 * Math.PI / 4;
			var rightBottomTheta = 7 * Math.PI / 4;

			this.drawAroundLine(g, lineW, color, 0, -newR, 0, -lastR);

			var fromX = newR * Math.cos(leftTopTheta);
			var fromY = -newR * Math.sin(leftTopTheta);
			var toX = lastR * Math.cos(leftTopTheta);
			var toY = -lastR * Math.sin(leftTopTheta);
			this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY);

			fromX = newR * Math.cos(rightTopTheta);
			fromY = -newR * Math.sin(rightTopTheta);
			toX = lastR * Math.cos(rightTopTheta);
			toY = -lastR * Math.sin(rightTopTheta);
			this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY);

			fromX = newR * Math.cos(leftBottomTheta);
			fromY = -newR * Math.sin(leftBottomTheta);
			toX = lastR * Math.cos(leftBottomTheta);
			toY = -lastR * Math.sin(leftBottomTheta);
			this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY);

			fromX = newR * Math.cos(rightBottomTheta);
			fromY = -newR * Math.sin(rightBottomTheta);
			toX = lastR * Math.cos(rightBottomTheta);
			toY = -lastR * Math.sin(rightBottomTheta);
			this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY);
		}
	}, {
		key: 'drawAroundLine',
		value: function drawAroundLine(g, lineW, color, fromX, fromY, toX, toY) {
			g.lineStyle(lineW, color, 1);
			g.beginFill(color, 0);
			g.moveTo(fromX, fromY);
			g.lineTo(toX, toY);
			g.endFill();
		}
	}, {
		key: 'drawCircle',
		value: function drawCircle(g, r) {
			g.lineStyle(_AppStore2['default'].getLineWidth(), 0xffffff, 1);
			g.beginFill(0xffffff, 0);

			g.moveTo(r, 0);

			var angle = 0;
			var x = 0;
			var y = 0;
			var gap = Math.min(300 / this.radius * 5, 10);
			var steps = Math.round(360 / gap);
			for (var i = -1; i < steps; i++) {
				angle = _Utils2['default'].DegreesToRadians(i * gap);
				x = r * Math.cos(angle);
				y = r * Math.sin(angle);
				g.lineTo(x, y);
			};

			// close it
			angle = _Utils2['default'].DegreesToRadians(360);
			x = r * Math.cos(angle);
			y = r * Math.sin(angle);
			g.lineTo(x, y);

			g.endFill();
		}
	}, {
		key: 'drawTitles',
		value: function drawTitles(r, color) {
			var titles = this.titles;
			var offset = this.radius / 270 * -25;
			var scale = this.radius / 270 * 1;
			var r = r + offset;
			for (var i = 0; i < titles.length; i++) {
				var title = titles[i];
				var angle = _Utils2['default'].DegreesToRadians(title.degBegin);
				title.txt.rotation = angle + _Utils2['default'].DegreesToRadians(90);
				title.txt.x = r * Math.cos(angle);
				title.txt.y = r * Math.sin(angle);
				title.txt.scale.x = scale;
				title.txt.scale.y = scale;
			}
		}
	}, {
		key: 'resize',
		value: function resize(radius) {
			var windowH = _AppStore2['default'].Window.h;
			this.radius = radius;
			this.drawRings();
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.ringsContainer.removeChildren();
			this.titlesContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.ringsContainer);
			_AppStore2['default'].releaseContainer(this.titlesContainer);
		}
	}]);

	return CompassRings;
})();

exports['default'] = CompassRings;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../stores/AppStore":60,"./../utils/Utils":62}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Compass = require('./Compass');

var _Compass2 = _interopRequireDefault(_Compass);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _SmallCompass = require('./SmallCompass');

var _SmallCompass2 = _interopRequireDefault(_SmallCompass);

var CompassesContainer = (function () {
	function CompassesContainer(pxContainer, parentEl) {
		_classCallCheck(this, CompassesContainer);

		this.parentEl = parentEl;
		this.pxContainer = pxContainer;
		this.currentIndex = 0;
	}

	_createClass(CompassesContainer, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.container = _AppStore2['default'].getContainer();
			this.pxContainer.addChild(this.container);

			this.compasses = [];

			this.mainCompass = new _Compass2['default'](this.container, _AppConstants2['default'].EXPERIENCE);
			this.mainCompass.knotRadius = _AppConstants2['default'].SMALL_KNOT_RADIUS;
			this.mainCompass.componentDidMount();
			this.mainCompass.state = _AppConstants2['default'].OPEN;

			var infos = _AppStore2['default'].generalInfosLangScope();

			var planets = _AppStore2['default'].planets();
			for (var i = 0; i < planets.length; i++) {
				var planet = planets[i];
				var smallCompass = new _SmallCompass2['default'](this.container, _AppConstants2['default'].EXPERIENCE);
				var planetData = _AppStore2['default'].productsDataById(planet);
				smallCompass.state = _AppConstants2['default'].CLOSE;
				smallCompass.id = planet;
				smallCompass.componentDidMount(planetData, planet, this.parentEl, infos.planet);
				this.compasses[i] = smallCompass;
				if (planet == this.id) {
					this.mainCompass.id = planet;
					this.openedCompassIndex = i;
					smallCompass.state = _AppConstants2['default'].OPEN;
					this.closeCompass(i);
				}
			}
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			this.updateCompassProduct();
			for (var i = 0; i < this.compasses.length; i++) {
				this.compasses[i].didTransitionInComplete();
			};
			this.mainCompass.updateRadius();
			this.mainCompass.didTransitionInComplete();
		}
	}, {
		key: 'willTransitionOut',
		value: function willTransitionOut() {
			for (var i = 0; i < this.compasses.length; i++) {
				this.compasses[i].willTransitionOut();
			};
			this.mainCompass.willTransitionOut();
		}
	}, {
		key: 'update',
		value: function update() {
			for (var i = 0; i < this.compasses.length; i++) {
				this.compasses[i].update();
			};
			this.mainCompass.update();
		}
	}, {
		key: 'updateCompassProduct',
		value: function updateCompassProduct() {
			var planetData = _AppStore2['default'].productsDataById(this.id);
			var productData = planetData;
			for (var i = 0; i < productData.length; i++) {
				var product = productData[i];
				if (this.currentIndex == i) {
					product.highlight = true;
				} else {
					product.highlight = false;
				}
			};
			this.mainCompass.updateData(productData);
		}
	}, {
		key: 'changeData',
		value: function changeData(newId) {
			this.id = newId;
			var planets = _AppStore2['default'].planets();
			for (var i = 0; i < planets.length; i++) {
				var planet = planets[i];
				var compass = this.compasses[i];
				if (planet == this.id) {
					this.mainCompass.id = planet;
					this.openedCompassIndex = i;
					compass.state = _AppConstants2['default'].OPEN;
					this.closeCompass(i);
				} else {
					compass.state = _AppConstants2['default'].CLOSE;
					this.openCompass(i);
				}
			}
			this.resize();
			this.positionTitleElements(this.y);
			this.updateCompassProduct();
		}
	}, {
		key: 'openCompass',
		value: function openCompass(index) {
			var compass = this.compasses[index];
			compass.opacity(1);
		}
	}, {
		key: 'closeCompass',
		value: function closeCompass(index) {
			var compass = this.compasses[index];
			compass.opacity(0);
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			var compasses = this.compasses;
			var totalW = 0;
			var biggestRadius = 0;
			for (var i = 0; i < compasses.length; i++) {
				var compass = compasses[i];
				var size = compass.radius << 1;
				var previousCmp = compasses[i - 1];
				var nextCmp = compasses[i + 1];
				var cx = totalW + this.getCompassMargin(compass);
				compass.resize();
				biggestRadius = biggestRadius < compass.radius ? compass.radius : biggestRadius;
				compass.position(cx, 0);
				compass.posX = cx;
				totalW = cx + this.getCompassMargin(compass);

				if (compass.state == _AppConstants2['default'].OPEN) {
					this.mainCompass.position(compass.x, 0);
				}
			}

			this.mainCompass.resize();

			this.width = totalW;
			this.height = biggestRadius;
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			this.x = x;
			this.y = y;
			this.container.position.x = x;
			this.container.position.y = y;
			this.positionTitleElements(y);
		}
	}, {
		key: 'positionTitleElements',
		value: function positionTitleElements(y) {
			var windowW = _AppStore2['default'].Window.w;
			var compasses = this.compasses;
			for (var i = 0; i < compasses.length; i++) {
				var compass = compasses[i];
				compass.positionElement(compass.posX + (windowW >> 1) - (this.width >> 1), y);
			}
		}
	}, {
		key: 'getCompassMargin',
		value: function getCompassMargin(compass) {
			return compass.state == _AppConstants2['default'].OPEN ? 140 : 80;
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			for (var i = 0; i < this.compasses.length; i++) {
				this.compasses[i].componentWillUnmount();
			}
			this.mainCompass.componentWillUnmount();
			this.container.removeChildren();
			_AppStore2['default'].releaseContainer(this.container);
		}
	}]);

	return CompassesContainer;
})();

exports['default'] = CompassesContainer;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../stores/AppStore":60,"./Compass":21,"./SmallCompass":37}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseComponent2 = require('./../../pager/components/BaseComponent');

var _BaseComponent3 = _interopRequireDefault(_BaseComponent2);

var _FrontContainer_hbs = require('./../partials/FrontContainer.hbs');

var _FrontContainer_hbs2 = _interopRequireDefault(_FrontContainer_hbs);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var FrontContainer = (function (_BaseComponent) {
	_inherits(FrontContainer, _BaseComponent);

	function FrontContainer() {
		_classCallCheck(this, FrontContainer);

		_get(Object.getPrototypeOf(FrontContainer.prototype), 'constructor', this).call(this);
	}

	_createClass(FrontContainer, [{
		key: 'render',
		value: function render(parent) {
			var scope = {};
			var generaInfos = _AppStore2['default'].generalInfos();
			scope.infos = _AppStore2['default'].generalInfosLangScope();
			scope.facebookUrl = generaInfos['facebook_url'];
			scope.twitterUrl = generaInfos['twitter_url'];
			scope.instagramUrl = generaInfos['instagram_url'];
			scope.labUrl = generaInfos['lab_url'];
			scope.menShopUrl = 'http://www.camper.com/' + JS_lang + '_' + JS_country + '/men/shoes/new-collection';
			scope.womenShopUrl = 'http://www.camper.com/' + JS_lang + '_' + JS_country + '/women/shoes/new-collection';
			scope.isMobile = _AppStore2['default'].Detector.oldIE ? false : _AppStore2['default'].Detector.isMobile;

			if (scope.isMobile) {
				scope.mobileMenu = [{ id: 'home', name: scope.infos['home_txt'], url: '#!/landing' }, { id: 'shop-men', name: scope.infos['shop_title'] + ' ' + scope.infos['shop_men'], url: scope.menShopUrl }, { id: 'shop-women', name: scope.infos['shop_title'] + ' ' + scope.infos['shop_women'], url: scope.womenShopUrl }, { id: 'lab', name: scope.infos['camper_lab'], url: scope.labUrl }];
			}

			_get(Object.getPrototypeOf(FrontContainer.prototype), 'render', this).call(this, 'FrontContainer', parent, _FrontContainer_hbs2['default'], scope);
		}
	}, {
		key: 'componentWillMount',
		value: function componentWillMount() {
			_get(Object.getPrototypeOf(FrontContainer.prototype), 'componentWillMount', this).call(this);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(FrontContainer.prototype), 'componentDidMount', this).call(this);

			if (_AppStore2['default'].Detector.isMobile) {
				this.mobile = {
					menuIsOpened: false,
					el: this.child.find('.mobile-menu'),
					burger: this.child.find('.burger'),
					slidemenu: this.child.find('.menu-slider'),
					mainMenu: this.child.find('ul.main-menu'),
					socialMenu: this.child.find('ul.social-menu')
				};
			}

			this.$socialWrapper = this.child.find('#social-wrapper');
			this.$socialTitle = this.$socialWrapper.find('.social-title');
			this.$socialIconsContainer = this.$socialWrapper.find('ul');
			this.$socialBtns = this.$socialWrapper.find('li');
			this.$camperLab = this.child.find('.camper-lab');
			this.$shop = this.child.find('.shop-wrapper');
			this.$home = this.child.find('.home-btn');
			this.$play = this.child.find('.play-xp-btn');
			this.$mute = this.child.find('.mute');
			this.countriesH = 0;

			if (_AppStore2['default'].Detector.oldIE) {
				var $logo = this.child.find('.logo');
				var $facebook = this.child.find('#footer .facebook a');
				var $twitter = this.child.find('#footer .twitter a');
				var $instagram = this.child.find('#footer .instagram a');
				$logo.html('<img src=' + _AppStore2['default'].baseMediaPath() + 'image/logo.png' + '>');
				$facebook.html('<img src=' + _AppStore2['default'].baseMediaPath() + 'image/facebook.png' + '>');
				$twitter.html('<img src=' + _AppStore2['default'].baseMediaPath() + 'image/twitter.png' + '>');
				$instagram.html('<img src=' + _AppStore2['default'].baseMediaPath() + 'image/instagram.png' + '>');
			}

			this.onSubMenuMouseEnter = this.onSubMenuMouseEnter.bind(this);
			this.onSubMenuMouseLeave = this.onSubMenuMouseLeave.bind(this);
			this.$shop.on('mouseenter', this.onSubMenuMouseEnter);
			this.$shop.on('mouseleave', this.onSubMenuMouseLeave);

			this.onSocialMouseEnter = this.onSocialMouseEnter.bind(this);
			this.onSocialMouseLeave = this.onSocialMouseLeave.bind(this);
			this.$socialWrapper.on('mouseenter', this.onSocialMouseEnter);
			this.$socialWrapper.on('mouseleave', this.onSocialMouseLeave);

			this.onMuteClicked = this.onMuteClicked.bind(this);
			this.$mute.on('click', this.onMuteClicked);

			this.onPlayXPClicked = this.onPlayXPClicked.bind(this);
			this.$play.on('click', this.onPlayXPClicked);

			this.socialTl = new TimelineMax();
			this.socialTl.staggerFrom(this.$socialBtns, 1, { scale: 0, y: 10, force3D: true, opacity: 0, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0.01, 0);
			this.socialTl.from(this.$socialIconsContainer, 1, { y: 30, ease: Elastic.easeOut }, 0);
			this.socialTl.pause(0);

			this.resize();

			if (_AppStore2['default'].Detector.isMobile) {
				this.initMobile();
			}
		}
	}, {
		key: 'onPlayXPClicked',
		value: function onPlayXPClicked(e) {
			e.preventDefault();
			var hash = _Router2['default'].getNewHash();
			if (hash.parts.length > 2) {
				var url = '/planet/' + hash.parts[1];
				_Router2['default'].setHash(url);
			} else if (hash.parts.length == 1) {
				var url = '/planet/' + _AppStore2['default'].LandingCurrentPoster;
				_Router2['default'].setHash(url);
			}
		}
	}, {
		key: 'onMuteClicked',
		value: function onMuteClicked(e) {
			e.preventDefault();
			_AppActions2['default'].toggleSounds();
		}
	}, {
		key: 'initMobile',
		value: function initMobile() {
			this.onBurgerClicked = this.onBurgerClicked.bind(this);
			this.mobile.burger.on('click', this.onBurgerClicked);

			this.mobile.tl = new TimelineMax();
			this.mobile.tl.from(this.mobile.slidemenu, 0.6, { scale: 1.1, opacity: 0, ease: Expo.easeInOut }, 0);
			this.mobile.tl.pause(0);
		}
	}, {
		key: 'onBurgerClicked',
		value: function onBurgerClicked(e) {
			var _this = this;

			e.preventDefault();
			if (this.mobile.menuIsOpened) {
				clearTimeout(this.mobile.slideTimeout);
				this.mobile.slideTimeout = setTimeout(function () {
					_this.mobile.slidemenu.css('top', -3000);
				}, 900);
				this.mobile.tl.timeScale(1.4).reverse();
				this.mobile.menuIsOpened = false;
			} else {
				this.mobile.slidemenu.css('top', 0);
				this.resizeMobile();
				this.mobile.tl.timeScale(1).play();
				this.mobile.menuIsOpened = true;
			}
		}
	}, {
		key: 'onSocialMouseEnter',
		value: function onSocialMouseEnter(e) {
			e.preventDefault();
			clearTimeout(this.socialBtnTimeout);
			this.socialTl.timeScale(1).play();
		}
	}, {
		key: 'onSocialMouseLeave',
		value: function onSocialMouseLeave(e) {
			var _this2 = this;

			e.preventDefault();
			clearTimeout(this.socialBtnTimeout);
			this.socialBtnTimeout = setTimeout(function () {
				_this2.socialTl.timeScale(1.8).reverse();
			}, 400);
		}
	}, {
		key: 'onSubMenuMouseEnter',
		value: function onSubMenuMouseEnter(e) {
			e.preventDefault();
			var $target = $(e.currentTarget);
			$target.addClass('hovered');
		}
	}, {
		key: 'onSubMenuMouseLeave',
		value: function onSubMenuMouseLeave(e) {
			e.preventDefault();
			var $target = $(e.currentTarget);
			$target.removeClass('hovered');
		}
	}, {
		key: 'resize',
		value: function resize() {
			if (!this.domIsReady) return;
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.countriesH = 60;
			this.countriesTitleH = 20;

			var socialCss = {
				left: windowW - _AppConstants2['default'].PADDING_AROUND - this.$socialTitle.width(),
				top: windowH - _AppConstants2['default'].PADDING_AROUND - this.$socialTitle.height()
			};
			var socialIconsCss = {
				left: (this.$socialTitle.width() >> 1) - (this.$socialIconsContainer.width() >> 1),
				top: -this.$socialIconsContainer.height() - 20
			};
			var camperLabCss = {
				left: windowW - _AppConstants2['default'].PADDING_AROUND - this.$camperLab.width(),
				top: _AppConstants2['default'].PADDING_AROUND
			};
			var shopCss = {
				left: camperLabCss.left - this.$shop.width() - _AppConstants2['default'].PADDING_AROUND,
				top: _AppConstants2['default'].PADDING_AROUND
			};
			var playCss = {
				left: shopCss.left - this.$play.width() - _AppConstants2['default'].PADDING_AROUND,
				top: _AppConstants2['default'].PADDING_AROUND
			};
			var homeCss = {
				left: playCss.left - this.$home.width() - _AppConstants2['default'].PADDING_AROUND,
				top: _AppConstants2['default'].PADDING_AROUND
			};
			var muteCss = {
				left: _AppConstants2['default'].PADDING_AROUND,
				top: windowH - _AppConstants2['default'].PADDING_AROUND - this.$mute.height()
			};

			this.$socialWrapper.css(socialCss);
			this.$camperLab.css(camperLabCss);
			this.$shop.css(shopCss);
			this.$socialIconsContainer.css(socialIconsCss);
			this.$home.css(homeCss);
			this.$play.css(playCss);
			this.$mute.css(muteCss);

			if (_AppStore2['default'].Detector.isMobile) {
				this.resizeMobile();
			}
		}
	}, {
		key: 'resizeMobile',
		value: function resizeMobile() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var burgerCss = {
				left: windowW - this.mobile.burger.width() - _AppConstants2['default'].PADDING_AROUND,
				top: _AppConstants2['default'].PADDING_AROUND
			};
			var slidemenuCss = {
				width: windowW,
				height: windowH
			};
			var mainMenuW = this.mobile.mainMenu.width();
			var mainMenuH = this.mobile.mainMenu.height();
			var mainMenuCss = {
				top: (windowH >> 1) - (mainMenuH >> 1) - mainMenuH * 0.1,
				left: (windowW >> 1) - (mainMenuW >> 1)
			};
			var socialMenuCss = {
				top: mainMenuCss.top + mainMenuH + 10,
				left: (windowW >> 1) - (this.mobile.socialMenu.width() >> 1)
			};
			this.mobile.slidemenu.css(slidemenuCss);
			this.mobile.burger.css(burgerCss);
			this.mobile.mainMenu.css(mainMenuCss);
			this.mobile.socialMenu.css(socialMenuCss);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(FrontContainer.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return FrontContainer;
})(_BaseComponent3['default']);

exports['default'] = FrontContainer;
module.exports = exports['default'];

},{"./../../pager/components/BaseComponent":66,"./../actions/AppActions":17,"./../constants/AppConstants":47,"./../partials/FrontContainer.hbs":49,"./../services/Router":57,"./../stores/AppStore":60}],25:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var GradientText = (function () {
	function GradientText(pxContainer) {
		_classCallCheck(this, GradientText);

		this.pxContainer = pxContainer;
	}

	_createClass(GradientText, [{
		key: 'componentDidMount',
		value: function componentDidMount(params) {

			this.gradientText = {
				container: _AppStore2['default'].getContainer(),
				gradient: _AppStore2['default'].getSprite()
			};
			this.gradientText.gradient.blendMode = PIXI.BLEND_MODES.ADD;

			this.lines = [];
			this.linesContainer = _AppStore2['default'].getContainer();
			this.pxContainer.addChild(this.linesContainer);

			this.gradientText.gradient.anchor.x = 0.5;
			this.gradientText.gradient.anchor.y = 0.5;
			this.gradientText.container.addChild(this.gradientText.gradient);
			this.container = this.gradientText.container;

			var lightLineUrl = _AppStore2['default'].Preloader.getImageURL('ski-experience-light-line');
			for (var i = 0; i < 16; i++) {
				var l = _AppStore2['default'].getSprite();
				l.texture = PIXI.Texture.fromImage(lightLineUrl);
				l.blendMode = PIXI.BLEND_MODES.ADD;
				l.scale.x = _Utils2['default'].Rand(10, 40);
				l.scale.y = _Utils2['default'].Rand(0.1, 1.4);
				l.alpha = _Utils2['default'].Rand(0.1, 0.8);
				l.y = _Utils2['default'].Rand(-100, 100);
				l.anchor.x = l.anchor.y = 0.5;
				this.gradientText.container.addChild(l);
				this.lines[i] = l;
			};

			this.flareA = _AppStore2['default'].getSprite();
			this.flareA.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('ski-experience-lens-flare'));
			this.flareB = _AppStore2['default'].getSprite();
			this.flareB.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('ski-experience-lens-flare'));
			this.flareA.blendMode = this.flareB.blendMode = PIXI.BLEND_MODES.ADD;
			this.flareA.anchor.x = this.flareA.anchor.y = this.flareB.anchor.x = this.flareB.anchor.y = 0.5;
			this.flareA.scale.x = this.flareA.scale.y = this.flareB.scale.x = this.flareB.scale.y = 4;
			this.container.addChild(this.flareA);
			this.container.addChild(this.flareB);

			var style = {
				font: 'italic ' + params.fontSize + 'px ' + params.fontFamily,
				fill: '#F7EDCA',
				stroke: '#4a1850',
				strokeThickness: params.strokeThickness,
				dropShadow: true,
				dropShadowColor: '#000000',
				dropShadowAngle: Math.PI / 6,
				dropShadowDistance: 20,
				wordWrap: false
			};

			this.gradientText.textfield = new PIXI.Text(_AppStore2['default'].randomSentence().toUpperCase(), style);
			this.gradientText.textfield.anchor.x = 0.5;
			this.gradientText.textfield.anchor.y = 0.5;
			this.gradientText.container.addChild(this.gradientText.textfield);
			this.pxContainer.addChild(this.gradientText.container);

			this.gradients = [['#fdb0c1', '#fffb48', '#ff2cff', '#ff2a07'], ['#ffa69d', '#f5ff20', '#3fff7d', '#7afafe', '#2460ff', '#ff2a07'], ['#fdb0c1', '#b6937d', '#0e2e61', '#616a71'], ['#c98e94', '#0e2e61', '#3fff7d', '#616a71', '#ff2a07']];

			var canvas = document.createElement('canvas');
			var ctx = canvas.getContext("2d");
			this.gradientCanvas = {
				canvas: canvas,
				ctx: ctx
			};

			this.generateGradientText();
		}
	}, {
		key: 'toggle',
		value: function toggle() {
			var windowW = _AppStore2['default'].Window.w;
			for (var i = 0; i < this.lines.length; i++) {
				var line = this.lines[i];
				line.x = _Utils2['default'].Rand(-line.width << 1, windowW + (line.width << 1));
				line.velX = 70 + Math.random() * 90;
				line.velX *= line.x < 0 ? 1 : -1;
			}
			this.flareA.x = -this.flareA.width;
			this.flareA.y = -_Utils2['default'].Rand(10, 30);
			this.flareB.x = windowW + this.flareB.width;
			this.flareB.y = _Utils2['default'].Rand(10, 30);

			this.flareA.velX = 160 + Math.random() * 30;
			this.flareB.velX = 160 + Math.random() * 30;

			this.flareA.velX *= this.flareA.x > 0 ? -1 : 1;
			this.flareB.velX *= this.flareB.x > 0 ? -1 : 1;
		}
	}, {
		key: 'setText',
		value: function setText() {
			this.gradientText.gradient.mask = null;
			this.gradientText.gradient.texture.destroy(true);
			this.gradientText.textfield.text = _AppStore2['default'].randomSentence().toUpperCase();
			this.generateGradientText();
		}
	}, {
		key: 'generateGradientText',
		value: function generateGradientText() {
			var gradientPadding = 30;
			var gradientW = this.gradientText.textfield.width + (gradientPadding << 1);
			var gradientH = this.gradientText.textfield.height + (gradientPadding << 1);
			var randomPaletteIndex = parseInt(_Utils2['default'].Rand(0, this.gradients.length - 1), 10);
			this.generateGradient(gradientW, gradientH, this.gradients[randomPaletteIndex]);

			this.gradientText.texture = this.generateTextureFromCanvas();
			this.gradientText.gradient.texture = this.gradientText.texture;

			this.gradientText.gradient.x = -gradientPadding;
			this.gradientText.gradient.y = -gradientPadding;
			this.gradientText.gradient.mask = this.gradientText.textfield;

			this.width = this.gradientText.textfield.width;
			this.height = this.gradientText.textfield.height;
		}
	}, {
		key: 'generateTextureFromCanvas',
		value: function generateTextureFromCanvas() {
			return PIXI.Texture.fromCanvas(this.gradientCanvas.canvas);
		}
	}, {
		key: 'generateGradient',
		value: function generateGradient(width, height, palette) {
			var canvas = this.gradientCanvas.canvas;
			var ctx = this.gradientCanvas.ctx;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			canvas.width = width;
			canvas.height = height;
			var gradient = ctx.createLinearGradient(0, 0, 0, height);
			var paletteLen = palette.length;
			for (var i = 0; i < paletteLen; i++) {
				gradient.addColorStop(i / paletteLen, palette[i]);
			};
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, height);
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			this.x = x;
			this.y = y;
			this.gradientText.container.x = x;
			this.gradientText.container.y = y;
		}
	}, {
		key: 'getWidth',
		value: function getWidth() {
			return this.width * this.scale;
		}
	}, {
		key: 'getHeight',
		value: function getHeight() {
			return this.height * this.scale;
		}
	}, {
		key: 'update',
		value: function update() {
			for (var i = 0; i < this.lines.length; i++) {
				var line = this.lines[i];
				line.x += line.velX;
			}
			this.flareA.x += this.flareA.velX;
			this.flareB.x += this.flareB.velX;
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.scale = windowW / 1600 * 1;
			this.gradientText.container.scale.x = this.scale;
			this.gradientText.container.scale.y = this.scale;
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			for (var i = 0; i < this.lines.length; i++) {
				var line = this.lines[i];
				_AppStore2['default'].releaseSprite(line);
			};
			_AppStore2['default'].releaseSprite(this.flareA);
			_AppStore2['default'].releaseSprite(this.flareB);
			this.gradientText.textfield.destroy(true, true);
			this.gradientText.container.removeChildren();
			this.linesContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.gradientText.container);
			_AppStore2['default'].releaseContainer(this.linesContainer);
			_AppStore2['default'].releaseSprite(this.gradientText.gradient);
		}
	}]);

	return GradientText;
})();

exports['default'] = GradientText;
module.exports = exports['default'];

},{"./../stores/AppStore":60,"./../utils/Utils":62}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var Knot = (function () {
	function Knot(springContainer, r, color) {
		_classCallCheck(this, Knot);

		this.radius = r || 3;
		this.color = color || 0xffffff;
		this.springContainer = springContainer;
		this.vx = 0;
		this.vy = 0;
		this.x = 0;
		this.y = 0;
		this.toX = 0;
		this.toY = 0;
		this.fromX = 0;
		this.fromY = 0;
		this.scaleX = 1;
		this.scaleY = 1;
	}

	_createClass(Knot, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.g = new PIXI.Graphics();
			this.springContainer.addChild(this.g);
			this.draw();
			return this;
		}
	}, {
		key: 'changeSize',
		value: function changeSize(radius) {
			this.radius = radius || 3;
			this.draw();
		}
	}, {
		key: 'draw',
		value: function draw() {
			this.g.clear();
			this.g.lineStyle(_AppStore2['default'].getLineWidth(), this.color, 1);
			this.g.beginFill(this.color, 1);
			this.g.drawCircle(0, 0, this.radius);
			this.g.endFill();
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			this.g.x = x;
			this.g.y = y;
			this.x = x;
			this.y = y;
		}
	}, {
		key: 'clear',
		value: function clear() {
			this.g.clear();
		}
	}, {
		key: 'scale',
		value: function scale(x, y) {
			this.g.scale.x = x;
			this.g.scale.y = y;
			this.scaleX = x;
			this.scaleY = y;
		}
	}, {
		key: 'velocity',
		value: function velocity(x, y) {
			this.vx = x;
			this.vy = y;
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.g.clear();
			this.g = null;
		}
	}]);

	return Knot;
})();

exports['default'] = Knot;
module.exports = exports['default'];

},{"./../stores/AppStore":60}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Vec2 = require('./../utils/Vec2');

var _Vec22 = _interopRequireDefault(_Vec2);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _bezierEasing = require('bezier-easing');

var _bezierEasing2 = _interopRequireDefault(_bezierEasing);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);



var LandingSlideshow = (function () {
	function LandingSlideshow(pxContainer, parentEl) {
		_classCallCheck(this, LandingSlideshow);

		this.parentEl = parentEl;
		this.pxContainer = pxContainer;
	}

	_createClass(LandingSlideshow, [{
		key: 'componentDidMount',
		value: function componentDidMount() {

			var oldHash = _Router2['default'].getOldHash();
			if (oldHash != undefined) {
				var planet = oldHash.parts[1];
				this.currentId = planet;
			}
			this.currentId = this.currentId == undefined ? 'alaska' : this.currentId;
			_AppStore2['default'].LandingCurrentPoster = this.currentId;

			// this.displacementOffsets = {
			// 	ski: [100, 30, 0.85, 0.85],
			// 	metal: [100, 30, 0.85, 0.85],
			// 	alaska: [100, 30, 0.85, 0.85],
			// 	wood: [0, 0, 0.92, 0.92],
			// 	gemstone: [-80, 0, 0.92, 0.92]
			// }

			var infos = _AppStore2['default'].generalInfosLangScope();
			this.slideshowContainer = _AppStore2['default'].getContainer();
			this.slideshowWrapper = _AppStore2['default'].getContainer();
			this.pxContainer.addChild(this.slideshowContainer);
			this.slideshowContainer.addChild(this.slideshowWrapper);
			this.counter = 0;
			this.planetTitleTxt = infos.planet.toUpperCase();

			var slideshowTitle = this.parentEl.find('.slideshow-title');
			var planetTitle = slideshowTitle.find('.planet-title');
			var planetName = slideshowTitle.find('.planet-name');
			this.titleContainer = {
				parent: slideshowTitle,
				planetTitle: planetTitle,
				planetName: planetName
			};

			this.planetNameTween = TweenMax.fromTo(planetName, 0.5, { scaleX: 1.4, scaleY: 0, opacity: 0 }, { scale: 1, opacity: 1, force3D: true, ease: Elastic.easeOut });
			this.planetNameTween.pause(0);

			var displacementFrag = "#define GLSLIFY 1\nprecision mediump float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform sampler2D displacementMap;\nuniform sampler2D uSampler;\nuniform vec2 scale;\nuniform vec2 offset;\nuniform vec4 dimensions;\nuniform vec2 mapDimensions;// = vec2(256.0, 256.0);\n// const vec2 textureDimensions = vec2(750.0, 750.0);\n\nvoid main(void) {\n   vec2 mapCords = vTextureCoord.xy;\n//   mapCords -= ;\n   mapCords += (dimensions.zw + offset) / dimensions.xy ;\n   mapCords.y *= -1.0;\n   mapCords.y += 1.0;\n   vec2 matSample = texture2D(displacementMap, mapCords).xy;\n   // matSample -= 0.5;\n   // matSample *= scale;\n   // matSample /= mapDimensions;\n   gl_FragColor = texture2D(displacementMap, mapCords);\n  //  gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb, 1.0);\n  //  vec2 cord = vTextureCoord;\n\n  // gl_FragColor =  texture2D(displacementMap, cord);\n     // gl_FragColor = gl_FragColor;\n}";

			var planets = _AppStore2['default'].planets();
			this.slides = [];
			for (var i = 0; i < planets.length; i++) {
				var s = {};
				var id = planets[i];
				var wrapperContainer = _AppStore2['default'].getContainer();
				var maskRect = {
					g: _AppStore2['default'].getGraphics(),
					newW: 0,
					width: 0,
					x: 0
				};
				var imgUrl = _AppStore2['default'].mainImageUrl(id, _AppConstants2['default'].RESPONSIVE_IMAGE);
				// var imgMapUrl = AppStore.mainImageMapUrl(id, AppConstants.RESPONSIVE_IMAGE)
				var texture = PIXI.Texture.fromImage(imgUrl);
				// var displacementTexture = PIXI.Texture.fromImage(imgMapUrl)
				// s.displacementSprite = new PIXI.Sprite(displacementTexture)
				// s.displacementSprite.anchor.x = s.displacementSprite.anchor.y = 0.5
				// s.displacementFilter = new PIXI.filters.DisplacementFilter(s.displacementSprite)
				var sprite = _AppStore2['default'].getSprite();
				sprite.texture = texture;
				sprite.params = {};
				this.slideshowWrapper.addChild(wrapperContainer);
				wrapperContainer.addChild(sprite);
				wrapperContainer.addChild(maskRect.g);
				// wrapperContainer.addChild(s.displacementSprite)
				// sprite.filters = [s.displacementFilter]
				sprite.mask = maskRect.g;
				s.oldPosition = new _Vec22['default'](0, 0);
				s.newPosition = new _Vec22['default'](0, 0);
				s.wrapperContainer = wrapperContainer;
				s.sprite = sprite;
				s.texture = texture;
				s.maskRect = maskRect;
				s.planetName = id.toUpperCase();
				s.imgResponsiveSize = _AppStore2['default'].responsiveImageSize(_AppConstants2['default'].RESPONSIVE_IMAGE);
				s.imgUrl = imgUrl;
				s.id = planets[i];
				this.slides[i] = s;
			}

			this.shiftUntilCorrectCurrentSlide();

			this.maskEasing = (0, _bezierEasing2['default'])(1, -0.02, .01, 1.07);
			this.chooseSlideToHighlight();
		}
	}, {
		key: 'shiftUntilCorrectCurrentSlide',
		value: function shiftUntilCorrectCurrentSlide() {
			if (this.currentId == this.slides[2].id) {
				return;
			} else {
				this.shiftNextSlidesArray();
				this.shiftUntilCorrectCurrentSlide();
			}
		}
	}, {
		key: 'updateTitles',
		value: function updateTitles(title, name) {
			var planetTitle = this.titleContainer.planetTitle;
			var planetName = this.titleContainer.planetName;
			planetTitle.text(title);
			planetName.text(name);
			this.planetNameTween.play(0);
		}
	}, {
		key: 'drawCenteredMaskRect',
		value: function drawCenteredMaskRect(graphics, x, y, w, h) {
			graphics.clear();
			graphics.beginFill(0xffff00, 1);
			graphics.drawRect(x, y, w, h);
			graphics.endFill();
		}
	}, {
		key: 'shiftNextSlidesArray',
		value: function shiftNextSlidesArray() {
			var firstElement = this.slides.shift();
			this.slides.push(firstElement);
			return firstElement;
		}
	}, {
		key: 'next',
		value: function next() {
			var firstElement = this.shiftNextSlidesArray();
			this.elementThatMovedInSlidesArray = firstElement;
			this.chooseSlideToHighlight();
			this.applyValuesToSlides();
		}
	}, {
		key: 'previous',
		value: function previous() {
			var lastElement = this.slides.pop();
			this.slides.unshift(lastElement);
			this.elementThatMovedInSlidesArray = lastElement;
			this.chooseSlideToHighlight();
			this.applyValuesToSlides();
		}
	}, {
		key: 'chooseSlideToHighlight',
		value: function chooseSlideToHighlight() {
			var totalLen = this.slides.length - 1;
			for (var i = 0; i < this.slides.length; i++) {
				var slide = this.slides[i];
				if (i == 2) {
					slide.highlight = true; // Highlight the middle elements
					this.currentId = slide.id;
					_AppStore2['default'].LandingCurrentPoster = this.currentId;
					this.slideshowWrapper.setChildIndex(slide.wrapperContainer, totalLen);
					this.updateTitles(this.planetTitleTxt, slide.planetName);
					this.positionTitlesContainer();
				} else {
					slide.highlight = false;
					this.slideshowWrapper.setChildIndex(slide.wrapperContainer, i);
				}
			}
		}
	}, {
		key: 'applyResponsiveImgToSlideDependsWindow',
		value: function applyResponsiveImgToSlideDependsWindow(slide) {
			var s = slide;
			var imgUrl = _AppStore2['default'].mainImageUrl(s.id, _AppConstants2['default'].RESPONSIVE_IMAGE);
			if (s.imgUrl != imgUrl) {
				s.imgResponsiveSize = _AppStore2['default'].responsiveImageSize(_AppConstants2['default'].RESPONSIVE_IMAGE);
				s.texture.destroy(true);
				s.texture = PIXI.Texture.fromImage(imgUrl);
				s.sprite.texture = s.texture;
				s.imgUrl = imgUrl;
			}
		}
	}, {
		key: 'resizeAndPositionImgSprite',
		value: function resizeAndPositionImgSprite(slide, maskSlideW, windowW, windowH) {
			var s = slide;
			var resizeVars = _Utils2['default'].ResizePositionProportionallyWithAnchorCenter(maskSlideW, windowH, s.imgResponsiveSize[0], s.imgResponsiveSize[1]);
			s.sprite.anchor.x = 0.5;
			s.sprite.anchor.y = 0.5;
			s.sprite.scale.x = resizeVars.scale;
			s.sprite.scale.y = resizeVars.scale;
			s.sprite.width = resizeVars.width;
			s.sprite.height = resizeVars.height;
			s.sprite.toX = resizeVars.left;
			s.sprite.y = resizeVars.top;
		}
	}, {
		key: 'update',
		value: function update() {
			var slides = this.slides;
			this.counter += 0.012;
			for (var i = 0; i < slides.length; i++) {
				var s = slides[i];
				s.maskRect.valueScale += (1 - s.maskRect.valueScale) * 0.2;
				var ease = this.maskEasing.get(s.maskRect.valueScale);
				s.wrapperContainer.x += (s.newPosition.x - s.wrapperContainer.x) * 0.2;
				s.maskRect.width += (s.maskRect.newW - s.maskRect.width) * 0.2;
				// s.displacementSprite.x = s.displacementSprite.xPos + Math.sin(this.counter) * 18
				// s.displacementSprite.y = s.displacementSprite.yPos + Math.cos(this.counter) * 12
				var maskRectX = (1 - ease) * s.maskRect.newX;
				s.sprite.x += (s.sprite.toX - s.sprite.x) * 0.2;
				this.drawCenteredMaskRect(s.maskRect.g, maskRectX, 0, s.maskRect.width, s.maskRect.height);
			}
			this.slideshowContainer.scale.x += (this.slideshowContainer.scaleXY - this.slideshowContainer.scale.x) * 0.08;
			this.slideshowContainer.scale.y += (this.slideshowContainer.scaleXY - this.slideshowContainer.scale.y) * 0.08;
		}
	}, {
		key: 'positionSlideshowContainer',
		value: function positionSlideshowContainer() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var lastSlide = this.slides[this.slides.length - 1];
			var containerTotalW = lastSlide.newPosition.x + lastSlide.maskRect.newW;
			this.slideshowContainer.pivot.x = containerTotalW >> 1;
			this.slideshowContainer.pivot.y = windowH >> 1;
			this.slideshowContainer.x = windowW >> 1;
			this.slideshowContainer.y = windowH >> 1;
			this.slideshowContainer.baseY = this.slideshowContainer.y;
			this.slideshowContainer.scale.x = 1.4;
			this.slideshowContainer.scale.y = 1.4;
			this.slideshowContainer.scaleXY = 1.05;
		}
	}, {
		key: 'applyValuesToSlides',
		value: function applyValuesToSlides() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var currentPosX = 0;
			for (var i = 0; i < this.slides.length; i++) {
				var s = this.slides[i];
				this.applyResponsiveImgToSlideDependsWindow(s);
				var hightlightedSlideW = windowW * (1 - _AppConstants2['default'].LANDING_NORMAL_SLIDE_PERCENTAGE * 2);
				var normalSlideW = windowW * _AppConstants2['default'].LANDING_NORMAL_SLIDE_PERCENTAGE;
				var slideW = 0;
				if (s.highlight) slideW = hightlightedSlideW;else slideW = normalSlideW;
				this.resizeAndPositionImgSprite(s, slideW, windowW, windowH);
				// var displacementVars = this.displacementOffsets[s.id]
				// s.displacementSprite.x = (slideW >> 1) + displacementVars[0]
				// s.displacementSprite.y = (windowH >> 1) + displacementVars[1]
				// s.displacementSprite.xPos = s.displacementSprite.x
				// s.displacementSprite.yPos = s.displacementSprite.y
				// s.displacementSprite.scale.x = displacementVars[2]
				// s.displacementSprite.scale.y = displacementVars[3]
				// s.displacementSprite.alpha = 0.5
				s.maskRect.newW = slideW;
				s.maskRect.height = windowH;
				s.maskRect.newX = slideW >> 1;
				s.maskRect.valueScale = 2;
				s.oldPosition.x = s.newPosition.x;
				s.newPosition.x = currentPosX;
				if (this.elementThatMovedInSlidesArray != undefined && this.elementThatMovedInSlidesArray.id == s.id) {
					s.wrapperContainer.x = s.newPosition.x;
				}
				currentPosX += slideW;
			}
			this.positionSlideshowContainer();
		}
	}, {
		key: 'positionTitlesContainer',
		value: function positionTitlesContainer() {
			var _this = this;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			clearTimeout(this.titleTimeout);
			this.titleTimeout = setTimeout(function () {
				var compassSize = windowH * _AppConstants2['default'].COMPASS_SIZE_PERCENTAGE << 1;
				var topOffset = (windowH >> 1) + (compassSize >> 1);
				var titlesContainerCss = {
					top: topOffset + (windowH - topOffset >> 1) - _this.titleContainer.parent.height() * 0.6,
					left: (windowW >> 1) - (_this.titleContainer.parent.width() >> 1)
				};
				_this.titleContainer.parent.css(titlesContainerCss);
			}, 0);
		}
	}, {
		key: 'resize',
		value: function resize() {
			this.applyValuesToSlides();
			this.positionTitlesContainer();
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {

			var slides = this.slides;
			for (var i = 0; i < slides.length; i++) {
				var s = slides[i];

				s.maskRect.g.clear();
				_AppStore2['default'].releaseGraphics(s.maskRect.g);

				s.sprite.texture.destroy(true);
				_AppStore2['default'].releaseSprite(s.sprite);

				s.wrapperContainer.removeChildren();
				_AppStore2['default'].releaseContainer(s.wrapperContainer);
			}

			this.slides.length = 0;
			this.planetNameTween = null;

			this.slideshowContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.slideshowContainer);

			this.slideshowWrapper.removeChildren();
			_AppStore2['default'].releaseContainer(this.slideshowWrapper);
		}
	}]);

	return LandingSlideshow;
})();

exports['default'] = LandingSlideshow;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../services/Router":57,"./../stores/AppStore":60,"./../utils/Utils":62,"./../utils/Vec2":63,"bezier-easing":"bezier-easing"}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var PXContainer = (function () {
	function PXContainer() {
		_classCallCheck(this, PXContainer);
	}

	_createClass(PXContainer, [{
		key: 'init',
		value: function init(elementId) {

			this.clearBack = false;

			this.didHasherChange = this.didHasherChange.bind(this);
			_AppStore2['default'].on(_AppConstants2['default'].PAGE_HASHER_CHANGED, this.didHasherChange);
			_AppStore2['default'].on(_AppConstants2['default'].PAGE_HASHER_INTERNAL_CHANGE, this.didHasherChange);

			if (_AppStore2['default'].Detector.isMobile) {} else {
				var renderOptions = {
					resolution: 1,
					transparent: true,
					antialias: true
				};
				this.renderer = new PIXI.autoDetectRenderer(1, 1, renderOptions);
				// this.renderer = new PIXI.CanvasRenderer(1, 1, renderOptions)
				this.currentColor = undefined;
				var el = $(elementId);
				$(this.renderer.view).attr('id', 'px-container');
				var $backgroundElement = $('<div id="background-element"></div>');
				_AppStore2['default'].BackgroundElement = $backgroundElement;
				el.append($backgroundElement);
				el.append(this.renderer.view);
				this.stage = new PIXI.Container();
				this.background = new PIXI.Graphics();
				this.drawBackground(0x000000);
				this.stage.addChild(this.background);
			}
		}
	}, {
		key: 'drawBackground',
		value: function drawBackground(color) {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.background.clear();
			this.background.lineStyle(0);
			this.background.beginFill(color, 1);
			this.background.drawRect(0, 0, windowW, windowH);
			this.background.endFill();
		}
	}, {
		key: 'add',
		value: function add(child) {
			if (_AppStore2['default'].Detector.isMobile) return;
			this.stage.addChild(child);
		}
	}, {
		key: 'remove',
		value: function remove(child) {
			if (_AppStore2['default'].Detector.isMobile) return;
			this.stage.removeChild(child);
		}
	}, {
		key: 'update',
		value: function update() {
			if (_AppStore2['default'].Detector.isMobile) return;
			this.renderer.render(this.stage);
		}
	}, {
		key: 'resize',
		value: function resize() {
			if (_AppStore2['default'].Detector.isMobile) return;
			// var scale = (window.devicePixelRatio == undefined) ? 1 : window.devicePixelRatio
			var scale = 1;
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			_AppStore2['default'].BackgroundElement.css({
				width: windowW,
				height: windowH
			});
			this.renderer.resize(windowW * scale, windowH * scale);
			if (!this.clearBack) {
				this.drawBackground(this.currentColor);
			}
		}
	}, {
		key: 'didHasherChange',
		value: function didHasherChange() {
			var pageId = _AppStore2['default'].getPageId();
			var palette = _AppStore2['default'].paletteColorsById(pageId);
			this.clearBack = false;
			if (_AppStore2['default'].Detector.isMobile) {
				if (palette != undefined) {
					var c = palette[0];
					this.currentColor = c;
					$('html').css('background-color', c.replace('0x', '#'));
				}
			} else {
				if (palette != undefined) {
					var c = palette[0];
					this.currentColor = c;

					if (_AppStore2['default'].getTypeOfPage() == _AppConstants2['default'].EXPERIENCE) {
						var hash = _Router2['default'].getNewHash();
						if (hash.targetId == 'alaska' || hash.targetId == 'metal') {
							this.clearBack = true;
							this.background.clear();
						} else {
							this.drawBackground(c);
						}
					} else {
						this.drawBackground(c);
					}
				}
			}
		}
	}]);

	return PXContainer;
})();

exports['default'] = PXContainer;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../services/Router":57,"./../stores/AppStore":60}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BasePage2 = require('./../../pager/components/BasePage');

var _BasePage3 = _interopRequireDefault(_BasePage2);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var Page = (function (_BasePage) {
	_inherits(Page, _BasePage);

	function Page(props) {
		_classCallCheck(this, Page);

		_get(Object.getPrototypeOf(Page.prototype), 'constructor', this).call(this, props);
		this.resize = this.resize.bind(this);
		this.pxContainer = _AppStore2['default'].getContainer();
	}

	_createClass(Page, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this = this;

			if (_AppStore2['default'].Detector.isMobile) {
				this.child.css('position', 'absolute');
				$('html').css('overflow-y', 'auto');
			}

			if (this.props.type == _AppConstants2['default'].LANDING) this.parent.css('cursor', 'pointer');else this.parent.css('cursor', 'auto');

			setTimeout(function () {
				_AppActions2['default'].pxAddChild(_this.pxContainer);
			}, 0);
			_get(Object.getPrototypeOf(Page.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'componentWillMount',
		value: function componentWillMount() {
			_AppStore2['default'].on(_AppConstants2['default'].WINDOW_RESIZE, this.resize);
			_get(Object.getPrototypeOf(Page.prototype), 'componentWillMount', this).call(this);
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			var _this2 = this;

			setTimeout(function () {
				_AppActions2['default'].pxRemoveChild(_this2.pxContainer);
			}, 0);
			_get(Object.getPrototypeOf(Page.prototype), 'didTransitionOutComplete', this).call(this);
		}
	}, {
		key: 'setupAnimations',
		value: function setupAnimations() {
			_get(Object.getPrototypeOf(Page.prototype), 'setupAnimations', this).call(this);
		}
	}, {
		key: 'getImageUrlById',
		value: function getImageUrlById(id) {
			return _AppStore2['default'].Preloader.getImageURL(this.id + '-' + this.props.type.toLowerCase() + '-' + id);
		}
	}, {
		key: 'resize',
		value: function resize() {
			_get(Object.getPrototypeOf(Page.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			if (!_AppStore2['default'].Detector.oldIE) this.pxContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.pxContainer);
			_AppStore2['default'].off(_AppConstants2['default'].WINDOW_RESIZE, this.resize);
			_get(Object.getPrototypeOf(Page.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return Page;
})(_BasePage3['default']);

exports['default'] = Page;
module.exports = exports['default'];

},{"./../../pager/components/BasePage":67,"./../actions/AppActions":17,"./../constants/AppConstants":47,"./../stores/AppStore":60}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseComponent = require('./../../pager/components/BaseComponent');

var _BaseComponent2 = _interopRequireDefault(_BaseComponent);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _BasePager2 = require('./../../pager/components/BasePager');

var _BasePager3 = _interopRequireDefault(_BasePager2);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var _Landing = require('./pages/Landing');

var _Landing2 = _interopRequireDefault(_Landing);

var _Landing_hbs = require('./../partials/pages/Landing.hbs');

var _Landing_hbs2 = _interopRequireDefault(_Landing_hbs);

var _PlanetExperiencePage = require('./PlanetExperiencePage');

var _PlanetExperiencePage2 = _interopRequireDefault(_PlanetExperiencePage);

var _PlanetExperiencePage_hbs = require('./../partials/PlanetExperiencePage.hbs');

var _PlanetExperiencePage_hbs2 = _interopRequireDefault(_PlanetExperiencePage_hbs);

var _PlanetCampaignPage = require('./PlanetCampaignPage');

var _PlanetCampaignPage2 = _interopRequireDefault(_PlanetCampaignPage);

var _PlanetCampaignPage_hbs = require('./../partials/PlanetCampaignPage.hbs');

var _PlanetCampaignPage_hbs2 = _interopRequireDefault(_PlanetCampaignPage_hbs);

var PagesContainer = (function (_BasePager) {
	_inherits(PagesContainer, _BasePager);

	function PagesContainer() {
		_classCallCheck(this, PagesContainer);

		_get(Object.getPrototypeOf(PagesContainer.prototype), 'constructor', this).call(this);
		this.swallowHasherChange = false;
	}

	_createClass(PagesContainer, [{
		key: 'componentWillMount',
		value: function componentWillMount() {
			_AppStore2['default'].on(_AppConstants2['default'].PAGE_HASHER_CHANGED, this.didHasherChange);
			_AppStore2['default'].on(_AppConstants2['default'].PAGE_HASHER_INTERNAL_CHANGE, this.didHasherInternalChange);
			_get(Object.getPrototypeOf(PagesContainer.prototype), 'componentWillMount', this).call(this);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(PagesContainer.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_AppStore2['default'].off(_AppConstants2['default'].PAGE_HASHER_CHANGED, this.didHasherChange);
			_AppStore2['default'].off(_AppConstants2['default'].PAGE_HASHER_INTERNAL_CHANGE, this.didHasherInternalChange);
			_get(Object.getPrototypeOf(PagesContainer.prototype), 'componentWillUnmount', this).call(this);
		}
	}, {
		key: 'didHasherInternalChange',
		value: function didHasherInternalChange() {
			this.currentComponent.internalHasherChanged();
		}
	}, {
		key: 'didHasherChange',
		value: function didHasherChange() {
			var _this = this;

			// Swallow hasher change if the change is fast as 1sec
			if (this.swallowHasherChange) return;else this.setupNewbornComponents();
			this.swallowHasherChange = true;
			this.hasherChangeTimeout = setTimeout(function () {
				_this.swallowHasherChange = false;
			}, 1000);
		}
	}, {
		key: 'setupNewbornComponents',
		value: function setupNewbornComponents() {
			var hash = _Router2['default'].getNewHash();
			var template = { type: undefined, partial: undefined };
			switch (hash.parts.length) {
				case 1:
					template.type = _Landing2['default'];
					template.partial = _Landing_hbs2['default'];
					break;
				case 2:
					template.type = _PlanetExperiencePage2['default'];
					template.partial = _PlanetExperiencePage_hbs2['default'];
					break;
				case 3:
					template.type = _PlanetCampaignPage2['default'];
					template.partial = _PlanetCampaignPage_hbs2['default'];
					break;
				default:
					template.type = _Landing2['default'];
					template.partial = _Landing_hbs2['default'];
			}

			this.setupNewComponent(hash.parent, template);
			this.currentComponent = this.components['new-component'];
		}
	}, {
		key: 'update',
		value: function update() {
			if (this.currentComponent != undefined) this.currentComponent.update();
		}
	}]);

	return PagesContainer;
})(_BasePager3['default']);

exports['default'] = PagesContainer;
module.exports = exports['default'];

},{"./../../pager/components/BaseComponent":66,"./../../pager/components/BasePager":68,"./../constants/AppConstants":47,"./../partials/PlanetCampaignPage.hbs":51,"./../partials/PlanetExperiencePage.hbs":52,"./../partials/pages/Landing.hbs":53,"./../services/Router":57,"./../stores/AppStore":60,"./PlanetCampaignPage":32,"./PlanetExperiencePage":33,"./pages/Landing":46}],31:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var PagesLoader = (function () {
	function PagesLoader(el) {
		_classCallCheck(this, PagesLoader);

		this.element = el;
	}

	_createClass(PagesLoader, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.$spinnerWrapper = this.element.find('.spinner-wrapper');
			this.$background = this.element.find('.background');
			this.$spinnerSvg = this.$spinnerWrapper.find('svg');
			this.spinnerTween = TweenMax.to(this.$spinnerSvg, 0.5, { paused: true, rotation: '360deg', repeat: -1, ease: Linear.easeNone });

			this.tl = new TimelineMax();
			this.tl.from(this.$spinnerWrapper, 1, { scale: 1.2, opacity: 0, force3D: true, ease: Expo.easeInOut }, 0);
			this.tl.from(this.$background, 1, { opacity: 0, force3D: true, ease: Expo.easeInOut }, 0);
			this.tl.pause(0);
		}
	}, {
		key: 'open',
		value: function open() {
			this.element.css('visibility', 'visible');
			this.spinnerTween.play();
			this.tl.play();
		}
	}, {
		key: 'close',
		value: function close() {
			var _this = this;

			this.tl.reverse();
			setTimeout(function () {
				_this.spinnerTween.pause();
				_this.element.css('visibility', 'hidden');
			}, 600);
		}
	}]);

	return PagesLoader;
})();

exports['default'] = PagesLoader;
module.exports = exports['default'];

},{}],32:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseCampaignPage2 = require('./BaseCampaignPage');

var _BaseCampaignPage3 = _interopRequireDefault(_BaseCampaignPage2);

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _ArrowBtn = require('./ArrowBtn');

var _ArrowBtn2 = _interopRequireDefault(_ArrowBtn);

var _PlayBtn = require('./PlayBtn');

var _PlayBtn2 = _interopRequireDefault(_PlayBtn);

var _RectangleBtn = require('./RectangleBtn');

var _RectangleBtn2 = _interopRequireDefault(_RectangleBtn);

var _TitleSwitcher = require('./TitleSwitcher');

var _TitleSwitcher2 = _interopRequireDefault(_TitleSwitcher);

var _CompassesContainer = require('./CompassesContainer');

var _CompassesContainer2 = _interopRequireDefault(_CompassesContainer);

var PlanetCampaignPage = (function (_BaseCampaignPage) {
	_inherits(PlanetCampaignPage, _BaseCampaignPage);

	function PlanetCampaignPage(props) {
		_classCallCheck(this, PlanetCampaignPage);

		props.data['empty-image'] = _AppStore2['default'].getEmptyImgUrl();
		_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'constructor', this).call(this, props);
		this.productId = undefined;
		this.fromInternalChange = false;
		this.currentIndex = 0;
		this.direction = _AppConstants2['default'].LEFT;
		this.currentProductContainerClass = 'product-container-b';
		this.timeoutTime = 1000;
	}

	_createClass(PlanetCampaignPage, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.updateProductData();

			this.infos = _AppStore2['default'].generalInfosLangScope();

			var slideshowTitle = this.child.find('.slideshow-title');
			var planetTitle = slideshowTitle.find('.planet-title');
			var planetName = slideshowTitle.find('.planet-name');
			this.titleContainer = {
				parent: slideshowTitle,
				planetTitle: planetTitle,
				planetName: planetName
			};

			this.planetNameTween = TweenMax.fromTo(planetName, 0.5, { scaleX: 1.4, scaleY: 0, opacity: 0 }, { scale: 1, opacity: 1, force3D: true, ease: Elastic.easeOut });
			this.planetNameTween.pause(0);

			var productContainersWrapper = this.child.find('.product-containers-wrapper');
			var containerA = productContainersWrapper.find('.product-container-a');
			var containerB = productContainersWrapper.find('.product-container-b');

			this.containers = {
				'product-container-a': {
					el: containerA,
					posterWrapper: containerA.find('.poster-wrapper'),
					posterImg: containerA.find('img'),
					spinner: {
						el: containerA.find('.spinner-wrapper'),
						svg: containerA.find('.spinner-wrapper svg'),
						path: containerA.find('.spinner-wrapper svg path')
					},
					video: {
						playBtn: new _PlayBtn2['default'](containerA.find('.play-btn')).componentDidMount(),
						el: containerA.find('.video-wrapper'),
						container: containerA.find('.video-container')
					}
				},
				'product-container-b': {
					el: containerB,
					posterWrapper: containerB.find('.poster-wrapper'),
					posterImg: containerB.find('img'),
					spinner: {
						el: containerB.find('.spinner-wrapper'),
						svg: containerB.find('.spinner-wrapper svg'),
						path: containerB.find('.spinner-wrapper svg path')
					},
					video: {
						playBtn: new _PlayBtn2['default'](containerB.find('.play-btn')).componentDidMount(),
						el: containerB.find('.video-wrapper'),
						container: containerB.find('.video-container')
					}
				}
			};

			this.containers['product-container-a'].spinner.tween = TweenMax.to(this.containers['product-container-a'].spinner.svg, 0.5, { paused: true, rotation: '360deg', repeat: -1, ease: Linear.easeNone });
			this.containers['product-container-b'].spinner.tween = TweenMax.to(this.containers['product-container-b'].spinner.svg, 0.5, { paused: true, rotation: '360deg', repeat: -1, ease: Linear.easeNone });

			this.arrowClicked = this.arrowClicked.bind(this);
			this.onPlanetClicked = this.onPlanetClicked.bind(this);
			this.bottomClicked = this.bottomClicked.bind(this);

			this.previousBtn = new _ArrowBtn2['default'](this.child.find('.previous-btn'), _AppConstants2['default'].LEFT);
			this.previousBtn.btnClicked = this.arrowClicked;
			this.previousBtn.componentDidMount();
			this.nextBtn = new _ArrowBtn2['default'](this.child.find('.next-btn'), _AppConstants2['default'].RIGHT);
			this.nextBtn.btnClicked = this.arrowClicked;
			this.nextBtn.componentDidMount();

			this.downBtn = new _ArrowBtn2['default'](this.child.find('.down-btn'), _AppConstants2['default'].BOTTOM);
			this.downBtn.btnClicked = this.bottomClicked;
			this.downBtn.componentDidMount();

			this.$experienceBtn = this.child.find('.go-experience-btn');
			this.goExperienceBtn = new _RectangleBtn2['default'](this.$experienceBtn, this.infos.experience_title);
			this.goExperienceBtn.btnClicked = this.onGoExperienceClicked;
			this.goExperienceBtn.componentDidMount();

			this.onExperienceMouseEnter = this.onExperienceMouseEnter.bind(this);
			this.onExperienceMouseLeave = this.onExperienceMouseLeave.bind(this);
			this.$experienceBtn.on('mouseenter', this.onExperienceMouseEnter);
			this.$experienceBtn.on('mouseleave', this.onExperienceMouseLeave);

			if (_AppStore2['default'].Detector.oldIE || _AppStore2['default'].Detector.isMobile) {
				this.downBtn.element.css('display', 'none');
			}

			this.buyBtn = new _TitleSwitcher2['default'](this.child.find('.buy-btn'), this.child.find('.dots-rectangle-btn'), this.infos['buy_title']);
			this.buyBtn.componentDidMount();

			if (!_AppStore2['default'].Detector.isMobile) {
				this.compassesContainer = new _CompassesContainer2['default'](this.pxScrollContainer, this.child.find(".interface.absolute"));
				this.compassesContainer.id = this.id;
				this.compassesContainer.componentDidMount();
			}

			this.onVideoMouseEnter = this.onVideoMouseEnter.bind(this);
			this.onVideoMouseLeave = this.onVideoMouseLeave.bind(this);
			this.onVideoClick = this.onVideoClick.bind(this);

			this.checkCurrentProductByUrl();
			this.updateColors();
			$(document).on('keydown', this.onKeyPressed);

			this.updateTitles(this.infos.planet.toUpperCase(), this.id.toUpperCase());

			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'onExperienceMouseEnter',
		value: function onExperienceMouseEnter(e) {
			e.preventDefault();
			this.goExperienceBtn.rollover();
		}
	}, {
		key: 'onExperienceMouseLeave',
		value: function onExperienceMouseLeave(e) {
			e.preventDefault();
			this.goExperienceBtn.rollout();
		}
	}, {
		key: 'onGoExperienceClicked',
		value: function onGoExperienceClicked() {
			var url = "/planet/" + this.id;
			_Router2['default'].setHash(url);
		}
	}, {
		key: 'addVideoEvents',
		value: function addVideoEvents() {
			if (this.currentContainer == undefined) return;
			this.currentContainer.video.el.on('mouseenter', this.onVideoMouseEnter);
			this.currentContainer.video.el.on('mouseleave', this.onVideoMouseLeave);
			this.currentContainer.video.el.on('click', this.onVideoClick);
		}
	}, {
		key: 'removeVideoEvents',
		value: function removeVideoEvents() {
			if (this.currentContainer == undefined) return;
			this.currentContainer.video.el.off('mouseenter', this.onVideoMouseEnter);
			this.currentContainer.video.el.off('mouseleave', this.onVideoMouseLeave);
			this.currentContainer.video.el.off('click', this.onVideoClick);
		}
	}, {
		key: 'onVideoMouseEnter',
		value: function onVideoMouseEnter(e) {
			e.preventDefault();
			this.currentContainer.video.playBtn.mouseOver();
		}
	}, {
		key: 'onVideoMouseLeave',
		value: function onVideoMouseLeave(e) {
			e.preventDefault();
			this.currentContainer.video.playBtn.mouseOut();
		}
	}, {
		key: 'onVideoClick',
		value: function onVideoClick(e) {
			e.preventDefault();
			this.assignVideoToNewContainer();
			this.currentContainer.video.playBtn.close();
		}
	}, {
		key: 'updateTitles',
		value: function updateTitles(title, name) {
			var planetTitle = this.titleContainer.planetTitle;
			var planetName = this.titleContainer.planetName;
			planetTitle.text(title);
			planetName.text(name);
			this.planetNameTween.play(0);
		}
	}, {
		key: 'updateProductData',
		value: function updateProductData() {
			this.products = _AppStore2['default'].productsDataById(this.id);
		}
	}, {
		key: 'onPlanetClicked',
		value: function onPlanetClicked() {
			var url = "/landing";
			_Router2['default'].setHash(url);
		}
	}, {
		key: 'arrowClicked',
		value: function arrowClicked(direction) {
			if (this.animationRunning) return;
			this.switchSlideByDirection(direction);
		}
	}, {
		key: 'bottomClicked',
		value: function bottomClicked() {
			this.scrollTargetChanged(this.pageHeight);
		}
	}, {
		key: 'onKeyPressed',
		value: function onKeyPressed(e) {
			if (this.animationRunning) return;
			e.preventDefault();
			switch (e.which) {
				case 37:
					// left
					this.switchSlideByDirection(_AppConstants2['default'].LEFT);
					break;
				case 39:
					// right
					this.switchSlideByDirection(_AppConstants2['default'].RIGHT);
					break;
				case 38:
					// up
					break;
				case 40:
					// down
					break;
				default:
					return;
			}
		}
	}, {
		key: 'switchSlideByDirection',
		value: function switchSlideByDirection(direction) {
			switch (direction) {
				case _AppConstants2['default'].LEFT:
					this.previous();
					break;
				case _AppConstants2['default'].RIGHT:
					this.next();
					break;
			}
			if (this.currentIndex > this.products.length - 1) {
				var nextId = _AppStore2['default'].getNextPlanet(this.id);
				var nexturl = "/planet/" + nextId + '/0';
				_Router2['default'].setHash(nexturl);
				return;
			} else if (this.currentIndex < 0) {
				var previousId = _AppStore2['default'].getPreviousPlanet(this.id);
				var productsData = _AppStore2['default'].productsDataById(previousId);
				var previousurl = "/planet/" + previousId + '/' + (productsData.length - 1).toString();
				_Router2['default'].setHash(previousurl);
				return;
			}
			this.updateHasher();
		}
	}, {
		key: 'updateHasher',
		value: function updateHasher() {
			var url = "/planet/" + this.id + '/' + this.currentIndex;
			_Router2['default'].setHash(url);
		}
	}, {
		key: 'next',
		value: function next() {
			this.direction = _AppConstants2['default'].LEFT;
			this.currentIndex += 1;
		}
	}, {
		key: 'previous',
		value: function previous() {
			this.direction = _AppConstants2['default'].RIGHT;
			this.currentIndex -= 1;
		}
	}, {
		key: 'getCurrentIndexFromProductId',
		value: function getCurrentIndexFromProductId(productId) {
			for (var i = 0; i < this.products.length; i++) {
				if (this.products[i].id == productId) {
					return i;
				}
			}
		}
	}, {
		key: 'internalHasherChanged',
		value: function internalHasherChanged() {
			var newId = _AppStore2['default'].getPageId();
			if (newId != this.id) {
				this.updateTitles(this.infos.planet.toUpperCase(), newId.toUpperCase());
				this.positionTitlesContainer();
			}
			this.id = newId;
			this.props.data = _AppStore2['default'].pageContent();

			this.updateProductData();
			this.fromInternalChange = true;
			this.checkCurrentProductByUrl();

			if (!_AppStore2['default'].Detector.isMobile) {
				this.compassesContainer.currentIndex = this.currentIndex;
				this.compassesContainer.changeData(this.id);
			}
			this.updateColors();
		}
	}, {
		key: 'checkCurrentProductByUrl',
		value: function checkCurrentProductByUrl() {
			var newHasher = _Router2['default'].getNewHash();
			var productId = parseInt(newHasher.targetId, 10);
			this.currentIndex = this.getCurrentIndexFromProductId(productId);
			this.showProductById(productId);
		}
	}, {
		key: 'updateColors',
		value: function updateColors() {
			var color = this.products[this.currentIndex].color;
			this.buyBtn.updateColor(color);
			var c = color.replace('0x', '#');
			this.currentContainer.spinner.path.css('fill', c);
			this.currentContainer.video.el.css('background-color', c);

			this.currentContainer.video.playBtn.open();

			var $buyBtn = this.buyBtn.element;
			var buyUrl = 'http://www.camper.com/' + JS_lang + '_' + JS_country + this.products[this.currentIndex]['product-url'];
			$buyBtn.attr('href', buyUrl);
		}
	}, {
		key: 'showProductById',
		value: function showProductById(id) {
			this.animationRunning = true;
			this.productId = id;
			this.currentProductContainerClass = this.currentProductContainerClass === 'product-container-a' ? 'product-container-b' : 'product-container-a';
			this.previousContainer = this.currentContainer;
			this.removeVideoEvents();
			this.currentContainer = this.containers[this.currentProductContainerClass];
			this.addVideoEvents();

			this.assignAssetsToNewContainer();
			this.resizeVideoWrapper();
			this.resizePosterWrappers();
			this.animateContainers();

			this.applyScreenshot();

			this.updatePageHeight();
		}
	}, {
		key: 'applyScreenshot',
		value: function applyScreenshot() {
			var videoThumb = this.products[this.productId]['video-thumb'];
			var imgSize = _AppStore2['default'].responsiveImageWidth(_AppConstants2['default'].RESPONSIVE_IMAGE);
			var imgSrc = _AppStore2['default'].getEnvironment()['static'] + 'image/planets/' + this.id + '/' + videoThumb + '-' + imgSize + '.jpg';
			var $img = $('<img src=' + imgSrc + '>');
			this.currentContainer.video.container.html($img);
		}
	}, {
		key: 'assignAssetsToNewContainer',
		value: function assignAssetsToNewContainer() {
			var _this = this;

			var productScope = _AppStore2['default'].getSpecificProductById(this.id, this.productId);
			var imgSize = _AppStore2['default'].responsivePosterImage();
			var imgSrc = _AppStore2['default'].getEnvironment()['static'] + 'image/planets/' + this.id + '/' + productScope['id'] + '-' + imgSize + '.jpg';

			this.currentContainer.posterImg.attr('src', this.props.data['empty-image']);
			this.currentContainer.posterImg.removeClass('opened');
			this.currentContainer.spinner.el.removeClass('closed');
			this.currentContainer.spinner.tween.play();
			var img = new Image();
			img.onload = function () {
				_this.currentContainer.posterImg.attr('src', imgSrc);
				_this.currentContainer.spinner.el.addClass('closed');
				_this.currentContainer.posterImg.addClass('opened');

				setTimeout(function () {
					_this.currentContainer.spinner.tween.pause();
				}, 500);
			};
			img.src = imgSrc;

			this.buyBtn.update(this.infos.buy_title + ' ' + productScope.name);
		}
	}, {
		key: 'assignVideoToNewContainer',
		value: function assignVideoToNewContainer() {
			this.currentContainer.video.container.removeClass('opened');

			var productScope = _AppStore2['default'].getSpecificProductById(this.id, this.productId);
			var videoId = productScope['video-id'];
			var frameUUID = _Utils2['default'].UUID();
			var iframeStr = '<iframe src="//fast.wistia.net/embed/iframe/' + videoId + '" id="' + frameUUID + '" allowtransparency="false" frameborder="0" scrolling="yes" class="wistia_embed" name="wistia_embed" allowfullscreen mozallowfullscreen webkitallowfullscreen oallowfullscreen msallowfullscreen width="100%" height="100%"></iframe>';
			var iframe = $(iframeStr);
			this.currentContainer.video.uuid = frameUUID;
			this.currentContainer.video.container.html(iframe);
			this.currentContainer.videoIsAdded = true;

			this.currentContainer.video.container.addClass('opened');
			this.currentContainer.video.el.css('background-color', 'transparent');
		}
	}, {
		key: 'animateContainers',
		value: function animateContainers() {
			var _this2 = this;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var dir = this.direction == _AppConstants2['default'].LEFT ? 1 : -1;
			var time = this.previousContainer == undefined ? 0 : 1;
			if (this.previousContainer != undefined) TweenMax.fromTo(this.previousContainer.el, 1, { x: 0, opacity: 1 }, { x: -windowW * dir, opacity: 1, force3D: true, ease: Expo.easeInOut });
			TweenMax.fromTo(this.currentContainer.el, time, { x: windowW * dir, opacity: 1 }, { x: 0, opacity: 1, force3D: true, ease: Expo.easeInOut });
			setTimeout(function () {
				_this2.updateTopButtonsPositions();
				_this2.buyBtn.show();
			}, 200);
			setTimeout(function () {
				_this2.animationRunning = false;
				_this2.removePreviousContainerAssets();
				// this.assignVideoToNewContainer()
			}, this.timeoutTime);
		}
	}, {
		key: 'removePreviousContainerAssets',
		value: function removePreviousContainerAssets() {
			if (this.previousContainer == undefined) return;
			this.previousContainer.posterImg.attr('src', this.props.data['empty-image']);
			this.previousContainer.video.container.html('');
			this.previousContainer.video.container.removeClass('opened');
			this.currentContainer.videoIsAdded = false;
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			if (!_AppStore2['default'].Detector.isMobile) {
				this.compassesContainer.currentIndex = this.currentIndex;
				this.compassesContainer.didTransitionInComplete();
			}
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'didTransitionInComplete', this).call(this);
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'didTransitionOutComplete', this).call(this);
		}
	}, {
		key: 'willTransitionOut',
		value: function willTransitionOut() {
			if (!_AppStore2['default'].Detector.isMobile) this.compassesContainer.willTransitionOut();
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'willTransitionOut', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {
			if (!_AppStore2['default'].Detector.isMobile) this.compassesContainer.update();
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resizeVideoWrapper',
		value: function resizeVideoWrapper() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			var orientation = _AppStore2['default'].Detector.isMobile ? _AppConstants2['default'].LANDSCAPE : undefined;
			var scale = _AppStore2['default'].Detector.isMobile ? 1 : 0.6;

			var videoResize = _Utils2['default'].ResizePositionProportionally(windowW * scale, windowH * scale, _AppConstants2['default'].MEDIA_GLOBAL_W, _AppConstants2['default'].MEDIA_GLOBAL_H, orientation);

			var videoTop = windowH * 0.51 - (videoResize.height >> 1);
			videoTop = _AppStore2['default'].Detector.isMobile ? 220 : videoTop;

			this.videoCss = {
				width: videoResize.width,
				height: videoResize.height,
				top: videoTop,
				left: (windowW >> 1) - (videoResize.width >> 1)
			};
			this.currentContainer.video.el.css(this.videoCss);
			this.videoTotalHeight = (this.videoCss.top << 1) + this.videoCss.height;
		}
	}, {
		key: 'resizePosterWrappers',
		value: function resizePosterWrappers() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			var orientation = _AppStore2['default'].Detector.isMobile ? _AppConstants2['default'].LANDSCAPE : undefined;
			var scale = _AppStore2['default'].Detector.isMobile ? 1 : 0.6;

			var imageResize = _Utils2['default'].ResizePositionProportionally(windowW * scale, windowH * scale, _AppConstants2['default'].CAMPAIGN_IMAGE_SIZE[0], _AppConstants2['default'].CAMPAIGN_IMAGE_SIZE[1], orientation);

			var posterTop = (this.compassPadding << 1) + windowH + this.videoCss.top;
			posterTop = _AppStore2['default'].Detector.isMobile ? this.videoCss.top + this.videoCss.height + 136 : posterTop;

			this.posterImgCss = {
				width: imageResize.width,
				height: imageResize.height,
				top: posterTop,
				left: (windowW >> 1) - (imageResize.width >> 1)
			};

			if (this.previousContainer != undefined) this.previousContainer.el.css('z-index', 1);
			this.currentContainer.el.css('z-index', 2);
			this.currentContainer.posterWrapper.css(this.posterImgCss);

			this.posterTotalHeight = (this.videoCss.top << 1) + this.posterImgCss.height;
		}
	}, {
		key: 'updateTopButtonsPositions',
		value: function updateTopButtonsPositions() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			var buyTopPos = this.posterImgCss.top + this.posterImgCss.height + (this.pageHeight - (this.posterImgCss.top + this.posterImgCss.height) >> 1) - this.buyBtn.height - (this.buyBtn.height >> 1) - this.buyBtn.height * 0.4;
			buyTopPos = _AppStore2['default'].Detector.isMobile ? this.videoCss.top + this.videoCss.height + 40 : buyTopPos;

			this.buyBtn.position((windowW >> 1) - this.buyBtn.width - (_AppConstants2['default'].PADDING_AROUND >> 1), buyTopPos);

			this.goExperienceBtn.position((windowW >> 1) + (_AppConstants2['default'].PADDING_AROUND >> 1), buyTopPos);

			var downTopPos = this.videoCss.top + this.videoCss.height + (windowH - (this.videoCss.top + this.videoCss.height) >> 1) - (this.downBtn.height >> 1);
			downTopPos = _AppStore2['default'].Detector.isMobile ? this.videoCss.top + this.videoCss.height + 40 : downTopPos;

			this.downBtn.position((windowW >> 1) - (this.downBtn.width >> 1), downTopPos);
		}
	}, {
		key: 'resizeCompassContainer',
		value: function resizeCompassContainer() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.compassesContainer.resize();
			this.compassPadding = 140;
			this.compassesContainer.position((windowW >> 1) - (this.compassesContainer.width >> 1), windowH + this.compassPadding + this.compassPadding * 0.3);
		}
	}, {
		key: 'updatePageHeight',
		value: function updatePageHeight() {
			this.pageHeight = this.videoTotalHeight + this.posterTotalHeight + (this.compassPadding << 1);
		}
	}, {
		key: 'positionTitlesContainer',
		value: function positionTitlesContainer() {
			var _this3 = this;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			clearTimeout(this.titleTimeout);
			this.titleTimeout = setTimeout(function () {
				var compassSize = windowH * _AppConstants2['default'].COMPASS_SIZE_PERCENTAGE << 1;
				var topOffset = (windowH >> 1) + (compassSize >> 1);
				var topPos = (_this3.videoCss.top >> 1) - (_this3.titleContainer.parent.height() >> 1);
				topPos += _AppStore2['default'].Detector.isMobile ? 30 : 0;
				var titlesContainerCss = {
					top: topPos,
					left: (windowW >> 1) - (_this3.titleContainer.parent.width() >> 1)
				};
				_this3.titleContainer.parent.css(titlesContainerCss);
			}, 0);
		}
	}, {
		key: 'resize',
		value: function resize() {

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			if (!_AppStore2['default'].Detector.isMobile) this.resizeCompassContainer();
			this.positionTitlesContainer();
			this.resizeVideoWrapper();
			this.resizePosterWrappers();
			this.updatePageHeight();
			this.updateTopButtonsPositions();

			var previousXPos = _AppStore2['default'].Detector.isMobile ? 0 : (this.videoCss.left >> 1) - (this.previousBtn.width >> 1) - 4;
			var nextXPos = _AppStore2['default'].Detector.isMobile ? windowW - this.previousBtn.width : this.videoCss.left + this.videoCss.width + (windowW - (this.videoCss.left + this.videoCss.width) >> 1) - (this.nextBtn.width >> 1) + 4;

			if (_AppStore2['default'].Detector.oldIE) {
				previousXPos += 40;
				nextXPos -= 40;
			}

			this.previousBtn.position(previousXPos, (windowH >> 1) - (this.previousBtn.height >> 1));
			this.nextBtn.position(nextXPos, (windowH >> 1) - (this.previousBtn.height >> 1));

			var childCss = {
				width: windowW
			};
			this.child.css(childCss);

			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			$(document).off('keydown', this.onKeyPressed);
			clearTimeout(this.videoAssignTimeout);
			if (!_AppStore2['default'].Detector.isMobile) this.compassesContainer.componentWillUnmount();
			this.containers['product-container-a'].video.playBtn.componentWillUnmount();
			this.containers['product-container-b'].video.playBtn.componentWillUnmount();
			this.removeVideoEvents();
			this.previousBtn.componentWillUnmount();
			this.nextBtn.componentWillUnmount();
			this.buyBtn.componentWillUnmount();
			this.downBtn.componentWillUnmount();
			this.goExperienceBtn.componentWillUnmount();
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return PlanetCampaignPage;
})(_BaseCampaignPage3['default']);

exports['default'] = PlanetCampaignPage;
module.exports = exports['default'];

},{"./../actions/AppActions":17,"./../constants/AppConstants":47,"./../services/Router":57,"./../stores/AppStore":60,"./../utils/Utils":62,"./ArrowBtn":18,"./BaseCampaignPage":19,"./CompassesContainer":23,"./PlayBtn":34,"./RectangleBtn":35,"./TitleSwitcher":39}],33:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BasePlanetPage2 = require('./BasePlanetPage');

var _BasePlanetPage3 = _interopRequireDefault(_BasePlanetPage2);

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _CompassesContainer = require('./CompassesContainer');

var _CompassesContainer2 = _interopRequireDefault(_CompassesContainer);

var _RectangleBtn = require('./RectangleBtn');

var _RectangleBtn2 = _interopRequireDefault(_RectangleBtn);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var _AlaskaXP = require('./experiences/AlaskaXP');

var _AlaskaXP2 = _interopRequireDefault(_AlaskaXP);

var _SkiXP = require('./experiences/SkiXP');

var _SkiXP2 = _interopRequireDefault(_SkiXP);

var _MetalXP = require('./experiences/MetalXP');

var _MetalXP2 = _interopRequireDefault(_MetalXP);

var _WoodXP = require('./experiences/WoodXP');

var _WoodXP2 = _interopRequireDefault(_WoodXP);

var _GemStoneXP = require('./experiences/GemStoneXP');

var _GemStoneXP2 = _interopRequireDefault(_GemStoneXP);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _ArrowBtn = require('./ArrowBtn');

var _ArrowBtn2 = _interopRequireDefault(_ArrowBtn);

var PlanetExperiencePage = (function (_BasePlanetPage) {
	_inherits(PlanetExperiencePage, _BasePlanetPage);

	function PlanetExperiencePage(props) {
		_classCallCheck(this, PlanetExperiencePage);

		_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'constructor', this).call(this, props);
	}

	_createClass(PlanetExperiencePage, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.transitionInCompleted = false;
			this.activateArrows = false;

			var infos = _AppStore2['default'].generalInfosLangScope();

			var XpClazz = this.getExperienceById(this.id);
			this.experience = new XpClazz(this.pxContainer, this.child, this.parent);
			this.experience.cta.txt = infos.experience[this.id];
			this.experience.id = this.id;
			this.experience.componentDidMount();

			this.$campaignBtn = this.child.find('.dots-rectangle-btn');
			this.goCampaignBtn = new _RectangleBtn2['default'](this.$campaignBtn, infos.campaign_title);
			this.goCampaignBtn.btnClicked = this.onGoCampaignClicked;
			this.goCampaignBtn.componentDidMount();

			this.onCampaignMouseEnter = this.onCampaignMouseEnter.bind(this);
			this.onCampaignMouseLeave = this.onCampaignMouseLeave.bind(this);
			this.$campaignBtn.on('mouseenter', this.onCampaignMouseEnter);
			this.$campaignBtn.on('mouseleave', this.onCampaignMouseLeave);

			this.arrowClicked = this.arrowClicked.bind(this);
			this.previousBtn = new _ArrowBtn2['default'](this.child.find('.previous-btn'), _AppConstants2['default'].LEFT);
			this.previousBtn.btnClicked = this.arrowClicked;
			this.previousBtn.componentDidMount();
			this.nextBtn = new _ArrowBtn2['default'](this.child.find('.next-btn'), _AppConstants2['default'].RIGHT);
			this.nextBtn.btnClicked = this.arrowClicked;
			this.nextBtn.componentDidMount();

			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'arrowClicked',
		value: function arrowClicked(direction) {
			if (this.activateArrows == false) return;
			var planet;
			switch (direction) {
				case _AppConstants2['default'].RIGHT:
					planet = _AppStore2['default'].getNextPlanet(this.id);
					_AppStore2['default'].ChangePlanetFromDirection = _AppConstants2['default'].RIGHT;
					break;
				case _AppConstants2['default'].LEFT:
					planet = _AppStore2['default'].getPreviousPlanet(this.id);
					_AppStore2['default'].ChangePlanetFromDirection = _AppConstants2['default'].LEFT;
					break;
			}
			var url = "/planet/" + planet;
			_Router2['default'].setHash(url);
		}
	}, {
		key: 'onCampaignMouseEnter',
		value: function onCampaignMouseEnter(e) {
			e.preventDefault();
			this.goCampaignBtn.rollover();
		}
	}, {
		key: 'onCampaignMouseLeave',
		value: function onCampaignMouseLeave(e) {
			e.preventDefault();
			this.goCampaignBtn.rollout();
		}
	}, {
		key: 'onGoCampaignClicked',
		value: function onGoCampaignClicked() {
			var url = "/planet/" + this.id + '/0';
			_Router2['default'].setHash(url);
		}
	}, {
		key: 'getExperienceById',
		value: function getExperienceById(id) {
			switch (id) {
				case 'ski':
					return _SkiXP2['default'];
				case 'metal':
					return _MetalXP2['default'];
				case 'alaska':
					return _AlaskaXP2['default'];
				case 'wood':
					return _WoodXP2['default'];
				case 'gemstone':
					return _GemStoneXP2['default'];
			}
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'didTransitionOutComplete', this).call(this);
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			var _this = this;

			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'didTransitionInComplete', this).call(this);
			this.experience.didTransitionInComplete();
			setTimeout(function () {
				_this.activateArrows = true;
			}, 1400);
		}
	}, {
		key: 'willTransitionIn',
		value: function willTransitionIn() {
			this.transitionInCompleted = true;
			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'willTransitionIn', this).call(this);
		}
	}, {
		key: 'willTransitionOut',
		value: function willTransitionOut() {
			this.experience.willTransitionOut();
			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'willTransitionOut', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {
			if (this.transitionInCompleted) {
				this.experience.update();
			}
		}
	}, {
		key: 'resize',
		value: function resize() {
			var _this2 = this;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.experience.resize();

			this.previousBtn.position(_AppConstants2['default'].PADDING_AROUND, (windowH >> 1) - (this.previousBtn.height >> 1));
			this.nextBtn.position(windowW - this.nextBtn.width - _AppConstants2['default'].PADDING_AROUND, (windowH >> 1) - (this.previousBtn.height >> 1));

			setTimeout(function () {
				_this2.goCampaignBtn.position((windowW >> 1) - (_this2.goCampaignBtn.width >> 1), windowH - _this2.goCampaignBtn.height * 0.7 - _AppConstants2['default'].PADDING_AROUND);
			}, 0);

			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.goCampaignBtn.componentWillUnmount();
			this.$campaignBtn.off('mouseenter', this.onCampaignMouseEnter);
			this.$campaignBtn.off('mouseleave', this.onCampaignMouseLeave);
			this.previousBtn.componentWillUnmount();
			this.nextBtn.componentWillUnmount();
			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return PlanetExperiencePage;
})(_BasePlanetPage3['default']);

exports['default'] = PlanetExperiencePage;
module.exports = exports['default'];

},{"./../actions/AppActions":17,"./../constants/AppConstants":47,"./../services/Router":57,"./../stores/AppStore":60,"./ArrowBtn":18,"./BasePlanetPage":20,"./CompassesContainer":23,"./RectangleBtn":35,"./experiences/AlaskaXP":40,"./experiences/GemStoneXP":42,"./experiences/MetalXP":43,"./experiences/SkiXP":44,"./experiences/WoodXP":45}],34:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _Knot = require('./Knot');

var _Knot2 = _interopRequireDefault(_Knot);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var PlayBtn = (function () {
	function PlayBtn(element) {
		_classCallCheck(this, PlayBtn);

		this.element = element;
	}

	_createClass(PlayBtn, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.tlOver = _AppStore2['default'].getTimeline();
			this.tlOut = _AppStore2['default'].getTimeline();
			var knotsEl = this.element.find(".knot");
			var linesEl = this.element.find(".line");
			var aroundEl = this.element.find(".around");
			var radius = 3;
			var margin = 30;
			var circleRad = 60;
			var circleContainerSize = 200;
			this.lineSize = _AppStore2['default'].getLineWidth();
			for (var i = 0; i < knotsEl.length; i++) {
				var knot = $(knotsEl[i]);
				knot.attr('r', radius);
			};
			aroundEl.attr('r', circleRad);
			for (var i = 0; i < linesEl.length; i++) {
				var line = $(linesEl[i]);
				line.css('stroke-width', this.lineSize);
			};

			var startX = circleContainerSize * 0.486;
			var startY = circleContainerSize >> 1;
			var offsetUpDown = 0.6;
			$(knotsEl.get(0)).attr({
				'cx': startX + margin,
				'cy': startY + 0
			});
			$(knotsEl.get(1)).attr({
				'cx': startX - margin * 0.4,
				'cy': startY - margin
			});
			$(knotsEl.get(2)).attr({
				'cx': startX - margin * 0.4,
				'cy': startY + margin
			});
			$(aroundEl.get(0)).attr({
				'cx': circleContainerSize >> 1,
				'cy': circleContainerSize >> 1
			});
			$(linesEl.get(0)).attr({
				'x1': startX + margin,
				'y1': startY + 0,
				'x2': startX - margin * 0.4,
				'y2': startY - margin
			});
			$(linesEl.get(1)).attr({
				'x1': startX + margin,
				'y1': startY + 0,
				'x2': startX - margin * 0.4,
				'y2': startY + margin
			});

			var offset = 10;
			var paddingX = 4;
			if (_AppStore2['default'].Detector.oldIE) {
				this.element.html('<img src=' + _AppStore2['default'].baseMediaPath() + 'image/play-btn.png' + '>');
			} else {
				this.tlOver.to(aroundEl, 1, { scale: 1.1, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				this.tlOver.to(knotsEl[0], 1, { x: offset + (radius >> 1) - paddingX, force3D: true, ease: Elastic.easeOut }, 0);
				this.tlOver.to(knotsEl[1], 1, { x: -offset + 12 - paddingX, y: (offset >> 1) - 6, force3D: true, ease: Elastic.easeOut }, 0);
				this.tlOver.to(knotsEl[2], 1, { x: -offset + 12 - paddingX, y: -(offset >> 1) + 6, force3D: true, ease: Elastic.easeOut }, 0);
				this.tlOver.to(linesEl[0], 1, { scaleX: 1.2, x: offset + (radius >> 1) - paddingX, force3D: true, transformOrigin: '100% 100%', ease: Elastic.easeOut }, 0);
				this.tlOver.to(linesEl[1], 1, { scaleX: 1.2, x: offset + (radius >> 1) - paddingX, force3D: true, transformOrigin: '100% 0%', ease: Elastic.easeOut }, 0);

				this.tlOut.to(aroundEl, 1, { scale: 1, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				this.tlOut.to(knotsEl[0], 1, { x: 0, force3D: true, ease: Elastic.easeOut }, 0);
				this.tlOut.to(knotsEl[1], 1, { x: 0, y: 0, force3D: true, ease: Elastic.easeOut }, 0);
				this.tlOut.to(knotsEl[2], 1, { x: 0, y: 0, force3D: true, ease: Elastic.easeOut }, 0);
				this.tlOut.to(linesEl[0], 1, { scaleX: 1, x: 0, force3D: true, transformOrigin: '100% 100%', ease: Elastic.easeOut }, 0);
				this.tlOut.to(linesEl[1], 1, { scaleX: 1, x: 0, force3D: true, transformOrigin: '100% 0%', ease: Elastic.easeOut }, 0);

				this.tlOver.pause(0);
				this.tlOut.pause(0);
			}

			this.close();

			return this;
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			this.element.css({
				left: x,
				top: y
			});
		}
	}, {
		key: 'mouseOver',
		value: function mouseOver() {
			if (_AppStore2['default'].Detector.oldIE) return;
			this.tlOut.kill();
			this.tlOver.play(0);
		}
	}, {
		key: 'mouseOut',
		value: function mouseOut() {
			if (_AppStore2['default'].Detector.oldIE) return;
			this.tlOver.kill();
			this.tlOut.play(0);
		}
	}, {
		key: 'open',
		value: function open() {
			var _this = this;

			TweenMax.fromTo(this.element, .1, { opacity: 0 }, { opacity: 1, ease: Expo.easeOut });
			setTimeout(function () {
				_this.element.css('visibility', 'visible');
			}, 80);
		}
	}, {
		key: 'close',
		value: function close() {
			var _this2 = this;

			TweenMax.fromTo(this.element, .1, { opacity: 1 }, { opacity: 0, ease: Expo.easeOut });
			setTimeout(function () {
				_this2.element.css('visibility', 'hidden');
			}, 80);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_AppStore2['default'].releaseTimeline(this.tlOver);
			_AppStore2['default'].releaseTimeline(this.tlOut);
		}
	}]);

	return PlayBtn;
})();

exports['default'] = PlayBtn;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../stores/AppStore":60,"./../utils/Utils":62,"./Knot":26}],35:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _Knot = require('./Knot');

var _Knot2 = _interopRequireDefault(_Knot);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var RectangleBtn = (function () {
	function RectangleBtn(element, titleTxt, rectW) {
		_classCallCheck(this, RectangleBtn);

		this.element = element;
		this.titleTxt = titleTxt;
		this.rectW = rectW;
	}

	_createClass(RectangleBtn, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this = this;

			this.tlOver = _AppStore2['default'].getTimeline();
			this.tlOut = _AppStore2['default'].getTimeline();
			this.width = 0;
			this.height = 0;
			var knotsEl = this.element.find(".knot");
			var linesEl = this.element.find(".line");
			var titleEl = this.element.find(".btn-title");
			var radius = 3;
			var paddingX = 24;
			var paddingY = 20;
			this.lineSize = _AppStore2['default'].getLineWidth();
			if (this.titleTxt != undefined) titleEl.text(this.titleTxt);

			setTimeout(function () {

				var titleW = _this.rectW == undefined ? titleEl.width() : _this.rectW;
				var titleH = _AppConstants2['default'].GLOBAL_FONT_SIZE;

				for (var i = 0; i < knotsEl.length; i++) {
					var knot = $(knotsEl[i]);
					knot.attr('r', radius);
				};
				for (var i = 0; i < linesEl.length; i++) {
					var line = $(linesEl[i]);
					line.css('stroke-width', _this.lineSize);
				};

				_this.width = titleW + (paddingX << 1);
				_this.height = titleH + (paddingY << 1);
				titleEl.css({
					left: (_this.width >> 1) - (titleW >> 1),
					top: (_this.height >> 1) - (titleH >> 1)
				});
				_this.element.css({
					width: _this.width,
					height: _this.height
				});

				var startX = radius * 3;
				var startY = radius * 3;
				var offsetUpDown = 0.6;
				$(knotsEl.get(0)).attr({
					'cx': startX + 0,
					'cy': startY + 0
				});
				$(knotsEl.get(1)).attr({
					'cx': _this.width - startX,
					'cy': startY + 0
				});
				$(knotsEl.get(2)).attr({
					'cx': startX + 0,
					'cy': _this.height - startY
				});
				$(knotsEl.get(3)).attr({
					'cx': _this.width - startX,
					'cy': _this.height - startY
				});
				$(linesEl.get(0)).attr({
					'x1': startX + 0,
					'y1': startY + 0,
					'x2': _this.width - startX,
					'y2': startY + 0
				});
				$(linesEl.get(1)).attr({
					'x1': _this.width - startX,
					'y1': startY + 0,
					'x2': _this.width - startX,
					'y2': _this.height - startY
				});
				$(linesEl.get(2)).attr({
					'x1': _this.width - startX,
					'y1': _this.height - startY,
					'x2': startY + 0,
					'y2': _this.height - startY
				});
				$(linesEl.get(3)).attr({
					'x1': startX + 0,
					'y1': startY + 0,
					'x2': startX + 0,
					'y2': _this.height - startY
				});

				_this.tlOver.to(knotsEl[0], 1, { x: -3, y: -3, force3D: true, ease: Elastic.easeOut }, 0);
				_this.tlOver.to(knotsEl[1], 1, { x: 3, y: -3, force3D: true, ease: Elastic.easeOut }, 0);
				_this.tlOver.to(knotsEl[2], 1, { x: -3, y: 3, force3D: true, ease: Elastic.easeOut }, 0);
				_this.tlOver.to(knotsEl[3], 1, { x: 3, y: 3, force3D: true, ease: Elastic.easeOut }, 0);
				_this.tlOver.to(linesEl[0], 1, { scaleX: 1.05, y: -3, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				_this.tlOver.to(linesEl[1], 1, { scaleY: 1.05, x: 3, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				_this.tlOver.to(linesEl[2], 1, { scaleX: 1.05, y: 3, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				_this.tlOver.to(linesEl[3], 1, { scaleY: 1.05, x: -3, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);

				_this.tlOut.to(knotsEl[0], 1, { x: 0, y: 0, force3D: true, ease: Elastic.easeOut }, 0);
				_this.tlOut.to(knotsEl[1], 1, { x: 0, y: 0, force3D: true, ease: Elastic.easeOut }, 0);
				_this.tlOut.to(knotsEl[2], 1, { x: 0, y: 0, force3D: true, ease: Elastic.easeOut }, 0);
				_this.tlOut.to(knotsEl[3], 1, { x: 0, y: 0, force3D: true, ease: Elastic.easeOut }, 0);
				_this.tlOut.to(linesEl[0], 1, { scaleX: 1, y: 0, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				_this.tlOut.to(linesEl[1], 1, { scaleY: 1, x: 0, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				_this.tlOut.to(linesEl[2], 1, { scaleX: 1, y: 0, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				_this.tlOut.to(linesEl[3], 1, { scaleY: 1, x: 0, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);

				_this.tlOver.pause(0);
				_this.tlOut.pause(0);

				// this.rollover = this.rollover.bind(this)
				// this.rollout = this.rollout.bind(this)
				// this.element.on('mouseenter', this.rollover)
				// this.element.on('mouseleave', this.rollout)

				if (_this.btnClicked != undefined) {
					_this.click = _this.click.bind(_this);
					_this.element.on('click', _this.click);
				}
			}, 0);
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			_Utils2['default'].Translate(this.element.get(0), x, y, 0);
			this.x = x;
			this.y = y;
		}
	}, {
		key: 'click',
		value: function click(e) {
			e.preventDefault();
			this.btnClicked();
		}
	}, {
		key: 'rollout',
		value: function rollout() {
			this.tlOver.kill();
			this.tlOut.play(0);
		}
	}, {
		key: 'rollover',
		value: function rollover() {
			this.tlOut.kill();
			this.tlOver.play(0);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_AppStore2['default'].releaseTimeline(this.tlOver);
			_AppStore2['default'].releaseTimeline(this.tlOut);
			if (this.btnClicked != undefined) {
				this.element.off('click', this.click);
			}
		}
	}]);

	return RectangleBtn;
})();

exports['default'] = RectangleBtn;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../stores/AppStore":60,"./../utils/Utils":62,"./Knot":26}],36:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var ScrollBar = (function () {
    function ScrollBar(element) {
        _classCallCheck(this, ScrollBar);

        this.element = element;
        this.pageHeight = undefined;
        this.scrollTarget = undefined;
        this.newPosY = 0;
        this.ease = 0.1;
        this.mouseInDown = false;
    }

    _createClass(ScrollBar, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
            var _this = this;

            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseMove = this.onMouseMove.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);

            this.grab = this.element.find(".scroll-grab.btn");
            this.grabEl = this.grab.get(0);
            this.grab.on("mousedown", this.onMouseDown);
            setTimeout(function () {
                _this.grabW = _this.grab.width();
                _this.grabH = _this.grab.height();
            }, 0);
        }
    }, {
        key: 'onMouseDown',
        value: function onMouseDown(e) {
            e.preventDefault();
            this.mouseInDown = true;
            $(window).on("mousemove", this.onMouseMove);
            $(window).on("mouseup", this.onMouseUp);
        }
    }, {
        key: 'onMouseUp',
        value: function onMouseUp(e) {
            e.preventDefault();
            this.mouseInDown = false;
            this.killAllEvents();
        }
    }, {
        key: 'onMouseMove',
        value: function onMouseMove(e) {
            e.preventDefault();
            var windowH = _AppStore2['default'].Window.h;
            var posY = this.pageHeight / windowH * e.clientY;
            this.scrollTargetHandler(posY);
        }
    }, {
        key: 'setScrollTarget',
        value: function setScrollTarget(val) {
            this.scrollTarget = val;
        }
    }, {
        key: 'killAllEvents',
        value: function killAllEvents() {
            $(window).off("mousemove", this.onMouseMove);
            $(window).off("mouseup", this.onMouseUp);
        }
    }, {
        key: 'update',
        value: function update() {
            var windowH = _AppStore2['default'].Window.h;
            var posY = Math.round(this.scrollTarget / this.pageHeight * (windowH - this.grabH));
            if (isNaN(posY)) return;
            this.newPosY += (posY - this.newPosY) * this.ease;
            var p = this.newPosY;
            _Utils2['default'].Translate(this.grabEl, 0, p, 0);
        }
    }, {
        key: 'resize',
        value: function resize() {}
    }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
            this.grab.off("mousedown", this.onMouseDown);
            this.killAllEvents();
        }
    }]);

    return ScrollBar;
})();

exports['default'] = ScrollBar;
module.exports = exports['default'];

},{"./../stores/AppStore":60,"./../utils/Utils":62}],37:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Knot = require('./Knot');

var _Knot2 = _interopRequireDefault(_Knot);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _Vec2 = require('./../utils/Vec2');

var _Vec22 = _interopRequireDefault(_Vec2);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var SmallCompass = (function () {
	function SmallCompass(pxContainer, type) {
		_classCallCheck(this, SmallCompass);

		this.pxContainer = pxContainer;
		this.type = type || _AppConstants2['default'].LANDING;
		this.bounce = -1;
	}

	_createClass(SmallCompass, [{
		key: 'componentDidMount',
		value: function componentDidMount(data, name, parentEl, planetTxt) {
			this.parentEl = parentEl;
			this.container = _AppStore2['default'].getContainer();
			this.pxContainer.addChild(this.container);

			this.bgCircle = new PIXI.Graphics();
			this.container.addChild(this.bgCircle);

			var knotRadius = _AppConstants2['default'].SMALL_KNOT_RADIUS;
			this.radius = 30;
			this.radiusLimit = this.radius * 0.8 - (knotRadius >> 1);
			this.width = this.radius;
			this.height = this.radius;

			var compassName = planetTxt.toUpperCase() + ' ' + name.toUpperCase();
			this.element = this.parentEl.find('.compasses-texts-wrapper');
			var containerEl = $('<div class="texts-container btn"></div>');
			this.element.append(containerEl);
			var titleTop = $('<div class="top-title"></div');

			this.circleRad = 90;
			var circlepath = 'M0,' + this.circleRad / 2 + 'a' + this.circleRad / 2 + ',' + this.circleRad / 2 + ' 0 1,0 ' + this.circleRad + ',0a' + this.circleRad / 2 + ',' + this.circleRad / 2 + ' 0 1,0 -' + this.circleRad + ',0';
			var svgStr = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <defs> <path id="path1" d="' + circlepath + '" > </path> </defs> <text fill="white" id="myText"> <textPath xlink:href="#path1"> <tspan dx="0px" dy="0px">' + compassName + '</tspan> </textPath> </text></svg>';
			var titleTopSvg = $(svgStr);
			titleTop.append(titleTopSvg);
			containerEl.append(titleTop);
			titleTopSvg.css({
				width: this.circleRad,
				height: this.circleRad
			});
			this.titles = {
				container: containerEl,
				$titleTop: titleTop,
				titleTop: titleTop.get(0),
				rotation: 0
			};

			this.onClicked = this.onClicked.bind(this);
			this.titles.container.on('click', this.onClicked);

			this.knots = [];
			for (var i = 0; i < data.length; i++) {
				var d = data[i];
				var knot = new _Knot2['default'](this.container, knotRadius, 0xffffff).componentDidMount();
				knot.mass = knotRadius;
				knot.vx = Math.random() * 0.8;
				knot.vy = Math.random() * 0.8;
				knot.posVec = new PIXI.Point(0, 0);
				knot.posFVec = new PIXI.Point(0, 0);
				knot.velVec = new PIXI.Point(0, 0);
				knot.velFVec = new PIXI.Point(0, 0);
				knot.position(_Utils2['default'].Rand(-this.radiusLimit, this.radiusLimit), _Utils2['default'].Rand(-this.radiusLimit, this.radiusLimit));
				this.knots[i] = knot;
			}

			var lineW = _AppStore2['default'].getLineWidth();
			// draw a rectangle
			this.bgCircle.clear();
			this.bgCircle.lineStyle(lineW, 0xffffff, 1);
			this.bgCircle.beginFill(0xffffff, 0);
			this.bgCircle.drawCircle(0, 0, this.radius);
		}
	}, {
		key: 'onClicked',
		value: function onClicked(e) {
			e.preventDefault();
			var url = "/planet/" + this.id + "/0";
			_Router2['default'].setHash(url);
		}
	}, {
		key: 'checkWalls',
		value: function checkWalls(knot) {
			if (knot.x + knot.radius > this.radiusLimit) {
				knot.x = this.radiusLimit - knot.radius;
				knot.vx *= this.bounce;
			} else if (knot.x - knot.radius < -this.radiusLimit - knot.radius) {
				knot.x = -this.radiusLimit + knot.radius - knot.radius;
				knot.vx *= this.bounce;
			}
			if (knot.y + knot.radius > this.radiusLimit) {
				knot.y = this.radiusLimit - knot.radius;
				knot.vy *= this.bounce;
			} else if (knot.y - knot.radius < -this.radiusLimit) {
				knot.y = -this.radiusLimit + knot.radius;
				knot.vy *= this.bounce;
			}
		}
	}, {
		key: 'checkCollision',
		value: function checkCollision(knotA, knotB) {
			var dx = knotB.x - knotA.x;
			var dy = knotB.y - knotA.y;
			var dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < knotA.radius + knotB.radius) {
				var angle = Math.atan2(dy, dx);
				var sin = Math.sin(angle);
				var cos = Math.cos(angle);
				knotA.posVec.x = 0;
				knotA.posVec.y = 0;
				this.rotate(knotB.posVec, dx, dy, sin, cos, true);
				this.rotate(knotA.velVec, knotA.vx, knotA.vy, sin, cos, true);
				this.rotate(knotB.velVec, knotB.vx, knotB.vy, sin, cos, true);

				// collision reaction
				var vxTotal = knotA.velVec.x - knotB.velVec.x;
				knotA.velVec.x = ((knotA.mass - knotB.mass) * knotA.velVec.x + 2 * knotB.mass * knotB.velVec.x) / (knotA.mass + knotB.mass);
				knotB.velVec.x = vxTotal + knotA.velVec.x;

				// update position
				knotA.posVec.x += knotA.velVec.x;
				knotB.posVec.x += knotB.velVec.x;

				// rotate positions back
				this.rotate(knotA.posFVec, knotA.posVec.x, knotA.posVec.y, sin, cos, false);
				this.rotate(knotB.posFVec, knotB.posVec.x, knotB.posVec.y, sin, cos, false);

				// adjust positions to actual screen positions
				knotB.x = knotA.x + knotB.posFVec.x;
				knotB.y = knotA.y + knotB.posFVec.y;
				knotA.x = knotA.x + knotA.posFVec.x;
				knotA.y = knotA.y + knotA.posFVec.y;

				// rotate velocities back
				this.rotate(knotA.velFVec, knotA.velVec.x, knotA.velVec.y, sin, cos, false);
				this.rotate(knotB.velFVec, knotB.velVec.x, knotB.velVec.y, sin, cos, false);

				knotA.vx = knotA.velFVec.x;
				knotA.vy = knotA.velFVec.y;
				knotB.vx = knotB.velFVec.x;
				knotB.vy = knotB.velFVec.y;
			}
		}
	}, {
		key: 'rotate',
		value: function rotate(point, x, y, sin, cos, reverse) {
			if (reverse) {
				point.x = x * cos + y * sin;
				point.y = y * cos - x * sin;
			} else {
				point.x = x * cos - y * sin;
				point.y = y * cos + x * sin;
			}
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			// this.titles.container.addClass('active')
		}
	}, {
		key: 'willTransitionOut',
		value: function willTransitionOut() {
			// this.titles.container.removeClass('active')	
		}
	}, {
		key: 'update',
		value: function update() {
			var knots = this.knots;
			var knotsNum = knots.length;
			for (var i = 0; i < knotsNum; i++) {
				var knot = knots[i];
				knot.position(knot.x + knot.vx, knot.y + knot.vy);
				this.checkWalls(knot);
			}
			for (i = 0; i < knotsNum - 1; i++) {
				var knotA = knots[i];
				for (var j = i + 1; j < knotsNum; j++) {
					var knotB = knots[j];
					this.checkCollision(knotA, knotB);
				}
			}
			// this.titles.rotation += 0.2
			// this.rotateEl(this.titles.titleTop, this.titles.rotation)
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowH = _AppStore2['default'].Window.h;
		}
	}, {
		key: 'rotateEl',
		value: function rotateEl(div, deg) {
			_Utils2['default'].Style(div, 'rotate(' + deg + 'deg)');
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			this.container.x = x;
			this.container.y = y;
			this.x = x;
			this.y = y;
		}
	}, {
		key: 'opacity',
		value: function opacity(val) {
			this.container.alpha = val;
			this.titles.$titleTop.css('opacity', val);
		}
	}, {
		key: 'positionElement',
		value: function positionElement(x, y) {
			this.titles.container.css({
				left: x - (this.circleRad >> 1),
				top: y - (this.circleRad >> 1),
				width: this.circleRad,
				height: this.circleRad
			});
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			for (var i = 0; i < this.knots.length; i++) {
				this.knots[i].componentWillUnmount();
			}
			this.titles.container.off('click', this.onClicked);
			this.knots.length = 0;
			this.bgCircle.clear();
			this.bgCircle = null;
			this.container.removeChildren();
			_AppStore2['default'].releaseContainer(this.container);
		}
	}]);

	return SmallCompass;
})();

exports['default'] = SmallCompass;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../services/Router":57,"./../stores/AppStore":60,"./../utils/Utils":62,"./../utils/Vec2":63,"./Knot":26}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _Knot = require('./Knot');

var _Knot2 = _interopRequireDefault(_Knot);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var SpringGarden = (function () {
	function SpringGarden() {
		_classCallCheck(this, SpringGarden);

		this.container = new PIXI.Container();
		this.areaPolygonContainer = new PIXI.Container();
		this.areaPolygon = new PIXI.Graphics();
		this.areaPolygonContainer.addChild(this.areaPolygon);
		this.container.addChild(this.areaPolygonContainer);

		this.lineW = _AppStore2['default'].getLineWidth();
		this.paused = true;
		this.opened = false;

		this.knots = [];
		for (var i = 0; i < _AppConstants2['default'].TOTAL_KNOT_NUM; i++) {
			var knot = new _Knot2['default'](this.container).componentDidMount();
			this.knots[i] = knot;
		}
		this.config = {
			spring: 0,
			friction: 0,
			springLength: 0
		};
	}

	_createClass(SpringGarden, [{
		key: 'componentDidMount',
		value: function componentDidMount(data, type) {
			this.params = data;
			type = type || _AppConstants2['default'].LANDING;
			this.color = type == _AppConstants2['default'].LANDING || this.params.highlight == false ? 0xffffff : this.params.color;
			this.color = this.params.color;
			if (this.params.highlight != undefined && type != _AppConstants2['default'].LANDING) {
				this.color = this.params.highlight == false ? 0xffffff : this.color;
			}
			var knotsData = this.params.knots;
			for (var i = 0; i < this.knots.length; i++) {
				var newKnotScale = knotsData[i];
				var knot = this.knots[i];
				knot.changeSize(this.knotRadius);
				knot.toX = newKnotScale.x * this.radius;
				knot.toY = newKnotScale.y * this.radius;
				knot.x = 0;
				knot.y = 0;
			}
			this.container.rotation = _Utils2['default'].Rand(-14, 14);
			this.config.springLength = 200;
			this.assignOpenedConfig();
		}
	}, {
		key: 'update',
		value: function update() {
			this.areaPolygon.clear();
			this.areaPolygon.lineStyle(this.lineW, this.color, 0.8);
			var len = this.knots.length;
			var spring = this.config.spring;
			var friction = this.config.friction;
			for (var i = 0; i < len; i++) {
				var knot = this.knots[i];
				var previousKnot = this.knots[i - 1];
				previousKnot = previousKnot == undefined ? this.knots[len - 1] : previousKnot;

				_Utils2['default'].SpringTo(knot, knot.toX, knot.toY, i, spring, friction, this.config.springLength);
				knot.position(knot.x + knot.vx, knot.y + knot.vy);

				this.areaPolygon.moveTo(previousKnot.x, previousKnot.y);
				this.areaPolygon.lineTo(knot.x, knot.y);
			}
			this.config.springLength -= this.config.springLength * 0.4;
			this.container.rotation -= this.container.rotation * 0.4;
		}
	}, {
		key: 'assignOpenedConfig',
		value: function assignOpenedConfig() {
			this.config.spring = 0.05;
			this.config.friction = 0.9;
		}
	}, {
		key: 'clear',
		value: function clear() {
			for (var i = 0; i < this.knots.length; i++) {
				var knot = this.knots[i];
				knot.clear();
			}
			this.areaPolygon.clear();
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {}
	}, {
		key: 'resize',
		value: function resize(radius) {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.radius = radius;
			this.container.x = 0;
			this.container.y = 0;
		}
	}]);

	return SpringGarden;
})();

exports['default'] = SpringGarden;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../services/Router":57,"./../stores/AppStore":60,"./../utils/Utils":62,"./Knot":26}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _Knot = require('./Knot');

var _Knot2 = _interopRequireDefault(_Knot);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _RectangleBtn = require('./RectangleBtn');

var _RectangleBtn2 = _interopRequireDefault(_RectangleBtn);

var TitleSwitcher = (function () {
	function TitleSwitcher(element, rectangleEl, buyTxt) {
		_classCallCheck(this, TitleSwitcher);

		this.element = element;
		this.rectEl = rectangleEl;
		this.buyTxt = buyTxt;
	}

	_createClass(TitleSwitcher, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.productTitleWrapper = this.element.find(".product-title-wrapper");
			var containerA = this.element.find('.title-a');
			var containerB = this.element.find('.title-b');
			this.containers = {
				'title-a': {
					el: containerA
				},
				'title-b': {
					el: containerB
				}
			};
			this.width = 100;
			this.height = _AppConstants2['default'].GLOBAL_FONT_SIZE;

			var rectWidth = this.buyTxt.length * 10;
			this.rectangleBorder = new _RectangleBtn2['default'](this.rectEl, null, 110 + rectWidth);
			this.rectangleBorder.componentDidMount();
			this.allRectSvgKnots = this.rectEl.find('svg .knot');
			this.allRectSvgLines = this.rectEl.find('svg .line');

			if (this.onClick != undefined) {
				this.onClicked = this.onClicked.bind(this);
				this.element.on('click', this.onClicked);
			}
			this.onOver = this.onOver.bind(this);
			this.onOut = this.onOut.bind(this);
			this.element.on('mouseenter', this.onOver);
			this.element.on('mouseleave', this.onOut);
		}
	}, {
		key: 'onOver',
		value: function onOver(e) {
			e.preventDefault();
			this.rectangleBorder.rollover();
		}
	}, {
		key: 'onOut',
		value: function onOut(e) {
			e.preventDefault();
			this.rectangleBorder.rollout();
		}
	}, {
		key: 'onClicked',
		value: function onClicked(e) {
			e.preventDefault();
			this.onClick();
		}
	}, {
		key: 'updateColor',
		value: function updateColor(color) {
			var c = color;
			c = c.replace("0x", "#");
			this.allRectSvgKnots.css('fill', c);
			this.allRectSvgLines.css('stroke', c);
		}
	}, {
		key: 'update',
		value: function update(name) {
			this.currentTitleClass = this.currentTitleClass === 'title-a' ? 'title-b' : 'title-a';
			this.previousTitle = this.currentTitle;
			this.currentTitle = this.containers[this.currentTitleClass];
			this.currentTitle.el.text(name);

			this.updateComponentSize();

			this.currentTitle.el.removeClass('did-transition-in').removeClass('did-transition-out').removeClass('will-transition-out').addClass('will-transition-in');
			if (this.previousTitle != undefined) {
				this.previousTitle.el.removeClass('did-transition-out').removeClass('did-transition-in').removeClass('will-transition-in').addClass('will-transition-out');
			}
		}
	}, {
		key: 'show',
		value: function show() {
			this.element.css('width', this.currentTitle.width);
			this.currentTitle.el.removeClass('did-transition-out').removeClass('will-transition-in').removeClass('will-transition-out').addClass('did-transition-in');
			if (this.previousTitle != undefined) {
				this.previousTitle.el.removeClass('did-transition-in').removeClass('will-transition-in').removeClass('will-transition-out').addClass('did-transition-out');
			}
		}
	}, {
		key: 'updateComponentSize',
		value: function updateComponentSize() {
			var _this = this;

			setTimeout(function () {
				var currentTitleW = _this.currentTitle.el.width();
				_this.currentTitle.width = currentTitleW;
				_this.width = _this.rectangleBorder.width;
			}, 0);
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			_Utils2['default'].Translate(this.productTitleWrapper.get(0), (this.width >> 1) - (this.currentTitle.width >> 1), 0, 0);
			_Utils2['default'].Translate(this.element.get(0), x, y, 0);
			this.x = x;
			this.y = y;
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			if (this.onClick != undefined) {
				this.element.off('click', this.onClicked);
			}
			this.element.off('mouseenter', this.onOver);
			this.element.off('mouseleave', this.onOut);
			this.rectangleBorder.componentWillUnmount();
		}
	}]);

	return TitleSwitcher;
})();

exports['default'] = TitleSwitcher;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../stores/AppStore":60,"./../utils/Utils":62,"./Knot":26,"./RectangleBtn":35}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseXP2 = require('./BaseXP');

var _BaseXP3 = _interopRequireDefault(_BaseXP2);

var _Utils = require('./../../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _AppStore = require('./../../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppConstants = require('./../../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _pixiParticles = require('pixi-particles');

var _pixiParticles2 = _interopRequireDefault(_pixiParticles);

var AlaskaXP = (function (_BaseXP) {
	_inherits(AlaskaXP, _BaseXP);

	function AlaskaXP(parentContainer, parentElement) {
		_classCallCheck(this, AlaskaXP);

		_get(Object.getPrototypeOf(AlaskaXP.prototype), 'constructor', this).call(this, parentContainer, parentElement);

		this.currentRockId = 'rock-b';
		this.countClicks = 0;
		this.elapsed = Date.now();
		this.isAnimate = false;
		this.shoeIndex = 0;
		this.isFirstTimePass = true;
	}

	_createClass(AlaskaXP, [{
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			var _this = this;

			setTimeout(function () {
				var videoId = 'enq5mr5vth';
				var iframeStr = '<iframe src="//fast.wistia.net/embed/iframe/' + videoId + '" allowtransparency="false" frameborder="0" scrolling="yes" class="wistia_embed" name="wistia_embed" allowfullscreen mozallowfullscreen webkitallowfullscreen oallowfullscreen msallowfullscreen width="100%" height="100%"></iframe>';
				_this.iframe = $(iframeStr);
				_AppStore2['default'].BackgroundElement.html(_this.iframe);
				_this.resizeIFrame();
			}, 200);

			_get(Object.getPrototypeOf(AlaskaXP.prototype), 'didTransitionInComplete', this).call(this);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {

			_AppStore2['default'].BackgroundElement.html('');

			this.button = $('<div class="xp-button"></div>');
			this.button.css('cursor', 'pointer');
			this.element.append(this.button);

			this.particleContainer = _AppStore2['default'].getContainer();

			// 	this.twistFilter = new PIXI.filters.TwistFilter()
			// 	this.twistFilter.angle = 0
			// this.pxContainer.filters = [this.twistFilter]

			this.emitter = new cloudkid.Emitter(this.particleContainer, [PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('alaska-experience-particle'))], {
				"alpha": {
					"start": 0.8,
					"end": 0.6
				},
				"scale": {
					"start": 0.0,
					"end": 0.15
				},
				"color": {
					"start": "56609b",
					"end": "aeeefd"
				},
				"speed": {
					"start": 100,
					"end": 300
				},
				"startRotation": {
					"min": 90,
					"max": 90
				},
				"rotationSpeed": {
					"min": 20,
					"max": 300
				},
				"lifetime": {
					"min": 2,
					"max": 2
				},
				"frequency": 0.006,
				"maxParticles": 200,
				"emitter-lifetime": 0,
				"pos": {
					"x": 0,
					"y": 0
				},
				"addAtBack": false,
				"spawnType": "circle",
				"blendMode": "screen",
				"spawnCircle": {
					"x": 0,
					"y": 0,
					"r": 200
				}
			});

			this.rocks = {
				'rock-a': {
					'front': _AppStore2['default'].getSprite(),
					'back': _AppStore2['default'].getSprite(),
					'holder': _AppStore2['default'].getContainer(),
					'wrapperFront': _AppStore2['default'].getContainer(),
					'wrapperBack': _AppStore2['default'].getContainer(),
					'wrapperShoe': _AppStore2['default'].getContainer(),
					'normalWrapperFront': _AppStore2['default'].getContainer(),
					'normalWrapperBack': _AppStore2['default'].getContainer(),
					'width': 677,
					'height': 1056,
					'paddingX': 30,
					'paddingY': 40,
					'offsetX': -20,
					'offsetY': -40,
					'anim': {
						time: 0,
						spring: 0.2,
						friction: 0.9,
						springLength: 0
					}
				},
				'rock-b': {
					'front': _AppStore2['default'].getSprite(),
					'back': _AppStore2['default'].getSprite(),
					'holder': _AppStore2['default'].getContainer(),
					'wrapperFront': _AppStore2['default'].getContainer(),
					'wrapperBack': _AppStore2['default'].getContainer(),
					'wrapperShoe': _AppStore2['default'].getContainer(),
					'normalWrapperFront': _AppStore2['default'].getContainer(),
					'normalWrapperBack': _AppStore2['default'].getContainer(),
					'width': 980,
					'height': 825,
					'paddingX': 50,
					'paddingY': 10,
					'offsetX': 0,
					'offsetY': 0,
					'anim': {
						time: 0,
						spring: 0.2,
						friction: 0.9,
						springLength: 0
					}
				}
			};

			this.rocks['rock-a'].front.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('alaska-experience-rock-0-0'));
			this.rocks['rock-a'].back.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('alaska-experience-rock-0-1'));
			this.rocks['rock-b'].front.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('alaska-experience-rock-1-0'));
			this.rocks['rock-b'].back.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('alaska-experience-rock-1-1'));

			this.shoes = [_AppStore2['default'].getSprite(), _AppStore2['default'].getSprite(), _AppStore2['default'].getSprite(), _AppStore2['default'].getSprite()];

			this.shoes[0].texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('alaska-experience-shoe-0'));
			this.shoes[1].texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('alaska-experience-shoe-1'));
			this.shoes[2].texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('alaska-experience-shoe-2'));
			this.shoes[3].texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('alaska-experience-shoe-3'));

			this.emitter.emit = true;

			this.addToStage('rock-a');
			this.addToStage('rock-b');
			this.switchRock();

			this.pxContainer.addChild(this.particleContainer);

			this.onClick = this.onClick.bind(this);
			this.button.on('click', this.onClick);

			_get(Object.getPrototypeOf(AlaskaXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'onClick',
		value: function onClick(e) {
			e.preventDefault();
			if (this.isAnimate) return;
			this.toggleRock();
		}
	}, {
		key: 'toggleRock',
		value: function toggleRock() {
			var _this2 = this;

			this.currentRock.wrapperBack.x = _Utils2['default'].Rand(-20, 20);
			this.currentRock.wrapperFront.x = _Utils2['default'].Rand(-20, 20);
			this.currentRock.wrapperBack.y = _Utils2['default'].Rand(-5, 5);
			this.currentRock.wrapperFront.y = _Utils2['default'].Rand(-5, 5);

			this.countClicks += 1;
			this.particleContainer.alpha = 0.7;
			clearTimeout(this.counterTimeout);
			this.counterTimeout = setTimeout(function () {
				_this2.countClicks = 0;
			}, 600);
			if (this.countClicks > 3) {
				this.switchRock();
				this.countClicks = 0;
			}
		}
	}, {
		key: 'switchRock',
		value: function switchRock() {
			this.currentRockId = this.currentRockId === 'rock-a' ? 'rock-b' : 'rock-a';
			this.previousRock = this.currentRock == undefined ? this.rocks['rock-b'] : this.currentRock;
			this.currentRock = this.rocks[this.currentRockId];

			this.shoeIndex += 1;
			this.shoeIndex = this.shoeIndex > this.shoes.length - 1 ? 0 : this.shoeIndex;
			this.shoeIndex = this.shoeIndex < 0 ? this.shoes.length - 1 : this.shoeIndex;
			this.previousShoe = this.currentShoe == undefined ? this.shoes[0] : this.currentShoe;
			this.currentShoe = this.shoes[this.shoeIndex];
			this.previousShoe.anchor.x = 0.5;
			this.previousShoe.anchor.y = 0.5;
			this.currentShoe.anchor.x = 0.5;
			this.currentShoe.anchor.y = 0.5;

			this.currentRock.wrapperShoe.addChild(this.currentShoe);

			this.resetAnimValues();
		}
	}, {
		key: 'resetAnimValues',
		value: function resetAnimValues() {
			var _this3 = this;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.currentRock.holder.x = windowW >> 1;
			this.currentRock.holder.y = -this.currentRock.height * 0.8;
			this.currentRock.anim.toY = windowH >> 1;
			this.previousRock.holder.x = windowW >> 1;
			this.previousRock.anim.toY = windowH * 2;
			if (this.isFirstTimePass) {
				this.previousRock.holder.y = windowH * 2;
				this.isFirstTimePass = false;
			}

			this.currentShoe.scale.x = 0.8;
			this.currentShoe.scale.y = 0.8;

			this.currentRock.wrapperBack.rotation = 0;
			this.currentRock.wrapperFront.rotation = 0;
			this.isAnimate = true;

			this.currentRock.wrapperShoe.scale.x = 0;
			this.currentRock.wrapperShoe.scale.y = 0;
			this.previousRock.wrapperShoe.rotation = _Utils2['default'].Rand(-2.8, -1.8);

			// this.twistFilter.angle = 2

			setTimeout(function () {
				TweenMax.to(_this3.currentRock.holder, 1.4, { y: _this3.currentRock.anim.toY, ease: Elastic.easeOut });
				TweenMax.fromTo(_this3.currentRock.holder.scale, 2, { x: -0.1, y: 0 }, { x: 1, y: 1, ease: Elastic.easeOut });
				_this3.isAnimate = false;
				_this3.previousRock.wrapperShoe.removeChildren();
			}, 2600);

			TweenMax.to(this.previousRock.wrapperBack, 2, { x: _Utils2['default'].Rand(-240, -100), rotation: _Utils2['default'].Rand(-.7, -.2), ease: Elastic.easeOut });
			TweenMax.to(this.previousRock.wrapperFront, 2, { x: _Utils2['default'].Rand(240, 300), y: _Utils2['default'].Rand(160, 240), rotation: _Utils2['default'].Rand(.2, .4), ease: Elastic.easeOut });

			TweenMax.to(this.previousRock.wrapperShoe.scale, 1.4, { x: 1.4, y: 1.4, ease: Elastic.easeOut });
			TweenMax.to(this.previousRock.wrapperShoe, 1.4, { rotation: 0, ease: Elastic.easeOut });

			var randIndex = _Utils2['default'].Rand(0, 2, 0);
			var soundId = 'alaska-sounds-rock-open-' + randIndex;
			_AppStore2['default'].Sounds.play(soundId);

			setTimeout(function () {
				TweenMax.to(_this3.previousRock.holder, 1, { y: _this3.previousRock.anim.toY, ease: Expo.easeInOut });
				TweenMax.fromTo(_this3.previousRock.holder.scale, 1, { x: 1, y: 1 }, { x: 0.8, y: 0.8, ease: Expo.easeInOut });

				var randIndex = _Utils2['default'].Rand(0, 1, 0);
				var soundId = 'alaska-sounds-rock-in-' + randIndex;
				_AppStore2['default'].Sounds.play(soundId);
			}, 1600);

			this.particleContainer.alpha = 1;
		}
	}, {
		key: 'addToStage',
		value: function addToStage(rockId) {
			var rock = this.rocks[rockId];
			var scale = 0.5;
			this.pxContainer.addChild(rock.holder);
			rock.holder.addChildAt(rock.wrapperBack, 0);
			rock.holder.addChildAt(rock.wrapperShoe, 1);
			rock.holder.addChildAt(rock.wrapperFront, 2);

			rock.wrapperBack.addChild(rock.normalWrapperBack);
			rock.wrapperFront.addChild(rock.normalWrapperFront);
			rock.normalWrapperBack.addChild(rock.back);
			rock.normalWrapperFront.addChild(rock.front);

			rock.back.anchor.x = 0.5;
			rock.back.anchor.y = 0.5;
			rock.front.anchor.x = 0.5;
			rock.front.anchor.y = 0.5;
			rock.normalWrapperBack.pivot.x = 0.5;
			rock.normalWrapperBack.pivot.y = 0.5;
			rock.normalWrapperBack.scale.x = scale;
			rock.normalWrapperBack.scale.y = scale;
			rock.normalWrapperFront.pivot.x = 0.5;
			rock.normalWrapperFront.pivot.y = 0.5;
			rock.normalWrapperFront.scale.x = scale;
			rock.normalWrapperFront.scale.y = scale;
			rock.holder.pivot.x = 0.5;
			rock.holder.pivot.y = 0.5;
			rock.normalWrapperFront.x = rock.paddingX + rock.offsetX;
			rock.normalWrapperFront.y = rock.paddingY + rock.offsetY;
			rock.normalWrapperBack.x = -rock.paddingX + rock.offsetX;
			rock.normalWrapperBack.y = -rock.paddingY + rock.offsetY;
			rock.width *= scale;
			rock.height *= scale;
			rock.wrapperFront.toX = 0;
			rock.wrapperFront.toY = 0;
			rock.wrapperFront.vx = 0;
			rock.wrapperFront.vy = 0;
			rock.wrapperBack.toX = 0;
			rock.wrapperBack.toY = 0;
			rock.wrapperBack.vx = 0;
			rock.wrapperBack.vy = 0;
		}
	}, {
		key: 'update',
		value: function update() {
			_get(Object.getPrototypeOf(AlaskaXP.prototype), 'update', this).call(this);

			var now = Date.now();
			this.emitter.update((now - this.elapsed) * 0.001);
			this.elapsed = now;

			this.particleContainer.alpha -= (this.particleContainer.alpha + 0.0001) * 0.01;
			// this.twistFilter.angle -= (this.twistFilter.angle + 0.001) * 0.1

			this.currentRock.anim.time += 0.04;
			this.currentRock.normalWrapperBack.x = -this.currentRock.paddingX + this.currentRock.offsetX + Math.cos(this.currentRock.anim.time) * 5;
			this.currentRock.normalWrapperBack.y = -this.currentRock.paddingX + this.currentRock.offsetX + Math.sin(this.currentRock.anim.time) * 22;
			this.currentRock.normalWrapperFront.x = this.currentRock.paddingX + this.currentRock.offsetX + Math.cos(this.currentRock.anim.time) * 4;
			this.currentRock.normalWrapperFront.y = this.currentRock.paddingX + this.currentRock.offsetX + Math.sin(this.currentRock.anim.time) * 22;
			this.currentRock.normalWrapperBack.rotation = Math.sin(this.currentRock.anim.time) * 0.02;
			this.currentRock.normalWrapperFront.rotation = Math.cos(this.currentRock.anim.time) * 0.02;

			this.currentShoe.rotation = Math.cos(this.currentRock.anim.time * 0.8) * 0.1;

			_Utils2['default'].SpringTo(this.currentRock.wrapperBack, this.currentRock.wrapperBack.toX, this.currentRock.wrapperBack.toY, 1, this.currentRock.anim.spring, this.currentRock.anim.friction, this.currentRock.anim.springLength);
			_Utils2['default'].SpringTo(this.currentRock.wrapperFront, this.currentRock.wrapperFront.toX, this.currentRock.wrapperFront.toY, 1, this.currentRock.anim.spring, this.currentRock.anim.friction, this.currentRock.anim.springLength);
			this.currentRock.wrapperBack.x += this.currentRock.wrapperBack.vx;
			this.currentRock.wrapperFront.x += this.currentRock.wrapperFront.vx;
			this.currentRock.wrapperBack.y += this.currentRock.wrapperBack.vy;
			this.currentRock.wrapperFront.y += this.currentRock.wrapperFront.vy;
		}
	}, {
		key: 'resizeIFrame',
		value: function resizeIFrame() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var videoResize = _Utils2['default'].ResizePositionProportionally(windowW, windowH, _AppConstants2['default'].MEDIA_GLOBAL_W, _AppConstants2['default'].MEDIA_GLOBAL_H);

			this.iframe.css({
				position: 'absolute',
				left: videoResize.left,
				top: videoResize.top,
				width: videoResize.width,
				height: videoResize.height
			});
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			if (this.iframe != undefined) {
				this.resizeIFrame();
			}

			this.particleContainer.x = windowW >> 1;
			this.particleContainer.y = windowH >> 1;

			this.currentRock.anim.toY = windowH >> 1;
			this.currentRock.holder.x = windowW >> 1;
			this.currentRock.holder.y = windowH >> 1;

			var buttonW = windowW * 0.4;
			var buttonH = windowH * 0.6;
			this.button.css({
				width: buttonW,
				height: buttonH,
				left: (windowW >> 1) - (buttonW >> 1),
				top: (windowH >> 1) - (buttonH >> 1)
			});

			_get(Object.getPrototypeOf(AlaskaXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'removeFromRockById',
		value: function removeFromRockById(id) {
			this.rocks[id].holder.removeChildren();
			this.rocks[id].wrapperFront.removeChildren();
			this.rocks[id].wrapperBack.removeChildren();
			this.rocks[id].wrapperShoe.removeChildren();
			this.rocks[id].normalWrapperFront.removeChildren();
			this.rocks[id].normalWrapperBack.removeChildren();
			_AppStore2['default'].releaseSprite(this.rocks[id].front);
			_AppStore2['default'].releaseSprite(this.rocks[id].back);
			_AppStore2['default'].releaseContainer(this.rocks[id].holder);
			_AppStore2['default'].releaseContainer(this.rocks[id].wrapperFront);
			_AppStore2['default'].releaseContainer(this.rocks[id].wrapperBack);
			_AppStore2['default'].releaseContainer(this.rocks[id].wrapperShoe);
			_AppStore2['default'].releaseContainer(this.rocks[id].normalWrapperFront);
			_AppStore2['default'].releaseContainer(this.rocks[id].normalWrapperBack);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			for (var i = 0; i < this.shoes.length; i++) {
				var shoe = this.shoes[i];
				_AppStore2['default'].releaseSprite(shoe);
			};
			// this.videoSprite.destroy(true)
			// Utils.RemoveVideo(this.video)
			// this.pxContainer.filters = null
			this.removeFromRockById('rock-a');
			this.removeFromRockById('rock-b');
			this.button.off('click', this.onClick);
			this.emitter.emit = false;
			this.emitter.destroy();
			this.particleContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.particleContainer);
			// AppStore.releaseSprite(this.videoSprite)
			_get(Object.getPrototypeOf(AlaskaXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return AlaskaXP;
})(_BaseXP3['default']);

exports['default'] = AlaskaXP;
module.exports = exports['default'];

},{"./../../constants/AppConstants":47,"./../../stores/AppStore":60,"./../../utils/Utils":62,"./BaseXP":41,"pixi-particles":"pixi-particles"}],41:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Router = require('./../../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var BaseXP = (function () {
	function BaseXP(parentContainer, parentElement, topParent) {
		_classCallCheck(this, BaseXP);

		this.pxContainer = _AppStore2['default'].getContainer();
		this.element = parentElement;
		this.parent = topParent;
		this.parentContainer = parentContainer;
		this.parentContainer.addChild(this.pxContainer);

		this.containerMask = _AppStore2['default'].getGraphics();
		this.pxContainer.mask = this.containerMask;
		this.parentContainer.addChild(this.containerMask);

		this.cta = {
			container: this.element.find('#cta-container'),
			text: this.element.find('#cta-container .cta-text'),
			wrapper: this.element.find('#cta-container .cta-text-wrapper'),
			background: this.element.find('#cta-container .background'),
			icon: this.element.find('#cta-container .headphone-icon')
		};

		this.cta.effectTween = TweenMax.to(this.cta.text, 0.1, { opacity: 0, repeat: -1 });
		this.cta.effectIconTween = TweenMax.to(this.cta.icon, 0.1, { opacity: 0, repeat: -1 });
	}

	_createClass(BaseXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.cta.text.html(this.cta.txt);
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			var _this = this;

			setTimeout(function () {
				_this.cta.effectTween.pause();
				_this.cta.effectIconTween.pause();
				TweenMax.to(_this.cta.wrapper, 0.4, { opacity: 0, scale: 1.2, force3D: true, ease: Expo.easeOut });
				TweenMax.to(_this.cta.icon, 0.4, { opacity: 0, scale: 1.2, force3D: true, ease: Expo.easeOut });
				TweenMax.to(_this.cta.background, 0.6, { opacity: 0, force3D: true, ease: Expo.easeOut });
				setTimeout(function () {
					_this.cta.container.remove();
				}, 700);
			}, 2500);
		}
	}, {
		key: 'willTransitionOut',
		value: function willTransitionOut() {}
	}, {
		key: 'update',
		value: function update() {}
	}, {
		key: 'resize',
		value: function resize() {
			var _this2 = this;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.containerMask.clear();
			this.containerMask.lineStyle(0, 0x0000FF, 1);
			this.containerMask.beginFill(0x000000, 1);
			this.containerMask.drawRect(0, 0, windowW, windowH);
			this.containerMask.endFill();

			setTimeout(function () {
				_this2.cta.wrapper.css({
					top: (windowH >> 1) - (_this2.cta.text.height() >> 1),
					left: (windowW >> 1) - (_this2.cta.text.width() >> 1)
				});
			}, 0);

			this.cta.background.css({
				width: windowW,
				height: windowH
			});
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {

			var hash = _Router2['default'].getNewHash();
			if (hash.targetId == 'alaska' || hash.targetId == 'metal') {} else {
				_AppStore2['default'].BackgroundElement.html('');
			}

			this.containerMask.clear();
			this.pxContainer.mask = null;
			_AppStore2['default'].Sounds.stopSoundsByPlanetId(this.id);
			this.parentContainer.removeChild(this.pxContainer);
			this.pxContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.pxContainer);
			_AppStore2['default'].releaseGraphics(this.containerMask);
			// PIXI.loader.reset()
		}
	}]);

	return BaseXP;
})();

exports['default'] = BaseXP;
module.exports = exports['default'];

},{"./../../services/Router":57,"./../../stores/AppStore":60}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseXP2 = require('./BaseXP');

var _BaseXP3 = _interopRequireDefault(_BaseXP2);

var _AppStore = require('./../../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Vec2 = require('./../../utils/Vec2');

var _Vec22 = _interopRequireDefault(_Vec2);

var _Utils = require('./../../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _AppConstants = require('./../../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);



var GemStoneXP = (function (_BaseXP) {
	_inherits(GemStoneXP, _BaseXP);

	function GemStoneXP(parentContainer, parentElement) {
		_classCallCheck(this, GemStoneXP);

		_get(Object.getPrototypeOf(GemStoneXP.prototype), 'constructor', this).call(this, parentContainer, parentElement);
	}

	_createClass(GemStoneXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.mouseVec = {
				middle: new _Vec22['default'](0, 0),
				normalMiddle: new _Vec22['default'](0, 0),
				normalMouse: new _Vec22['default'](0, 0),
				radius: 0,
				normalDist: 0
			};
			this.isAnimating = false;

			// var texture = PIXI.Texture.fromVideo(AppStore.baseMediaPath() + 'image/planets/gemstone/experience-assets/bg-video/gemstone' + '.' + AppStore.videoExtensionSupport())
			// this.video = $(texture.baseTexture.source)
			// this.video.attr('loop', true)
			// this.videoSprite = AppStore.getSprite()
			// this.videoSprite.texture = texture
			// this.pxContainer.addChild(this.videoSprite)

			this.stepsCounter = 0;
			this.state = 'normal';
			this.shoeIndex = 0;
			this.counter = 0;

			this.button = $('<div class="xp-button"></div>');
			this.element.append(this.button);

			_AppStore2['default'].Sounds.play('gemstone-sounds-reveal-1', { loop: -1 });

			var explosionFrag = "#define GLSLIFY 1\nprecision mediump float;\n\nvarying vec2 vTextureCoord;\nuniform vec2 resolution;\nuniform sampler2D uSampler;\n// uniform sampler2D uDisplacement;\nuniform float time;\nuniform float zoom;\nuniform float brightness;\nuniform float twirl;\nuniform float iterations;\n\nvoid main(void) {\n    vec2 p = -1.0 + 2.0 * vTextureCoord.xy;\n    vec2 uv;\n    // vec4 map = texture2D(uDisplacement, vTextureCoord);\n    // vec2 scale = vec2(0.2, 0.2);\n    // map -= 0.5;\n    // map.wz *= scale;\n    float ints = brightness;\n    float r = sqrt( dot(p,p) ) * (zoom);\n    float a = atan(p.y,p.x) + 0.75*sin(0.5 / r + time) * (0.7 + 0.6) - 1.75*cos(0.25 / r + time / 1.7) * (0.9 + 0.2);\n    float h = (0.5 + 0.5*cos(6.0*a));\n    float s = smoothstep(2.8,0.2,h);\n    uv.x = time * 2.0 - ints * 0.25 + 1.0/( r + .1*s);\n    uv.y = iterations*a/3.1416;\n    //map.x *= 0.1;\n    //map.y *= 0.1;\n    // uv.x += vTextureCoord.x + map.z;\n    // uv.y += vTextureCoord.y + map.w;\n    vec3 col = texture2D(uSampler,uv).xyz;\n    col *= 1.0 + 0.4 * ints;\n    float ao = smoothstep(0.0,0.3,h)-smoothstep(0.5,1.0,h);\n    col *= twirl-0.6*ao*r;\n    col = (col * 0.8) / (1.8 * r);\n    gl_FragColor = vec4(col,1.0);\n\n    // gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x + map.x, vTextureCoord.y + map.y));\n}\n";
			var imgUrl = _AppStore2['default'].Preloader.getImageURL('gemstone-experience-texture');
			var texture = PIXI.Texture.fromImage(imgUrl);
			// var textureDisplacement = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-displacement-texture-1'))
			this.sprite = _AppStore2['default'].getSprite();
			this.sprite.texture = texture;
			this.sprite.shader = new PIXI.AbstractFilter(null, explosionFrag, this.uniforms = {
				resolution: { type: '2f', value: { x: 1, y: 1 } },
				uSampler: { type: 'sampler2D', value: texture },
				// uDisplacement: {type: 'sampler2D', value: textureDisplacement},
				time: { type: '1f', value: 0 },
				zoom: { type: '1f', value: 1.0 },
				brightness: { type: '1f', value: 1.25 },
				twirl: { type: '1f', value: 1.0 },
				iterations: { type: '1f', value: 1.0 }
			});
			this.pxContainer.addChild(this.sprite);

			this.illusion = {
				holder: _AppStore2['default'].getContainer(),
				mask: _AppStore2['default'].getSprite(),
				maskFilter: undefined,
				shoeContainer: _AppStore2['default'].getContainer(),
				shoeWrapper: _AppStore2['default'].getContainer(),
				displacementMapTexture: _AppStore2['default'].getSprite(),
				backgroundSpr: _AppStore2['default'].getSprite()
			};

			this.illusion.displacementMapTexture.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('gemstone-experience-displacement-map'));
			this.illusion.backgroundSpr.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('gemstone-experience-background-texture'));
			this.illusion.mask.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('gemstone-experience-gradient-mask'));
			this.illusion.maskFilter = new PIXI.filters.DisplacementFilter(this.illusion.displacementMapTexture);

			this.shoes = [_AppStore2['default'].getSprite(), _AppStore2['default'].getSprite(), _AppStore2['default'].getSprite()];

			this.shoes[0].texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('gemstone-experience-shoe-0'));
			this.shoes[1].texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('gemstone-experience-shoe-1'));
			this.shoes[2].texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('gemstone-experience-shoe-2'));

			this.onMouseMove = this.onMouseMove.bind(this);
			this.toggleActivationStep = this.toggleActivationStep.bind(this);
			this.onMouseOver = this.onMouseOver.bind(this);
			this.onMouseOut = this.onMouseOut.bind(this);
			this.button.on('mouseenter', this.onMouseOver);
			this.button.on('mouseleave', this.onMouseOut);
			$('#app-container').on('mousemove', this.onMouseMove);

			this.setupIllusion();
			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'setupIllusion',
		value: function setupIllusion() {
			var ll = this.illusion;
			this.pxContainer.addChild(ll.holder);
			ll.holder.addChild(ll.shoeContainer);
			ll.shoeContainer.addChild(ll.backgroundSpr);
			ll.shoeContainer.addChild(ll.shoeWrapper);
			ll.holder.addChild(ll.mask);
			ll.holder.addChild(ll.displacementMapTexture);

			ll.backgroundSpr.anchor.x = 0.5;
			ll.backgroundSpr.anchor.y = 0.5;
			ll.displacementMapTexture.anchor.x = 0.5;
			ll.displacementMapTexture.anchor.y = 0.5;
			ll.mask.anchor.x = 0.5;
			ll.mask.anchor.y = 0.5;
			ll.holder.pivot.x = 0.5;
			ll.holder.pivot.y = 0.5;
			ll.shoeContainer.pivot.x = 0.5;
			ll.shoeContainer.pivot.y = 0.5;
			ll.shoeWrapper.pivot.x = 0.5;
			ll.shoeWrapper.pivot.y = 0.5;
			ll.mask.scale.x = 0;
			ll.mask.scale.y = 0;
			ll.backgroundSpr.scale.x = 0;
			ll.backgroundSpr.scale.y = 0;

			ll.holder.filters = [ll.maskFilter];
			ll.shoeContainer.mask = ll.mask;
		}
	}, {
		key: 'onMouseOver',
		value: function onMouseOver(e) {
			e.preventDefault();
			if (this.isAnimating) return;
			this.activationInterval = setInterval(this.toggleActivationStep, 380);
			_AppStore2['default'].Sounds.play('gemstone-sounds-reveal-0', { interrupt: createjs.Sound.INTERRUPT_ANY, volume: 0.1 });
		}
	}, {
		key: 'toggleActivationStep',
		value: function toggleActivationStep() {
			var _this = this;

			this.stepsCounter += 2;
			if (this.stepsCounter > 4) {
				this.isAnimating = true;
				this.resetActivationState();
				this.stateToShowroom();
				this.animateInShoe();
				clearTimeout(this.showroomTimeout);
				_AppStore2['default'].Sounds.play('gemstone-sounds-cave-return');
				this.showroomTimeout = setTimeout(function () {
					_this.state = 'normal';
					_this.updateMousePos();
					_this.animateOutShoe();
					setTimeout(function () {
						_this.isAnimating = false;
					}, 500);
				}, 2200);
			}
		}
	}, {
		key: 'stateToShowroom',
		value: function stateToShowroom() {
			this.state = 'showroom';
		}
	}, {
		key: 'resetActivationState',
		value: function resetActivationState() {
			this.stepsCounter = 0;
			clearInterval(this.activationInterval);
		}
	}, {
		key: 'animateInShoe',
		value: function animateInShoe() {
			var ll = this.illusion;

			this.shoeIndex += 1;
			this.shoeIndex = this.shoeIndex > this.shoes.length - 1 ? 0 : this.shoeIndex;
			this.shoeIndex = this.shoeIndex < 0 ? this.shoes.length - 1 : this.shoeIndex;
			this.currentShoe = this.shoes[this.shoeIndex];
			this.currentShoe.anchor.x = 0.5;
			this.currentShoe.anchor.y = 0.5;
			ll.shoeWrapper.rotation = 0;

			TweenMax.fromTo(ll.backgroundSpr.scale, 2, { x: 1.8, y: 1.8 }, { x: 1.6, y: 1.6, ease: Expo.easeOut });
			TweenMax.fromTo(ll.mask.scale, 2, { x: 0, y: 0 }, { x: 4.1 * 0.8, y: 3.6 * 0.8, ease: Elastic.easeOut });
			TweenMax.fromTo(this.currentShoe.scale, 2, { x: 0, y: 0 }, { x: 1.2, y: 1.2, ease: Elastic.easeOut });
			TweenMax.fromTo(this.currentShoe, 2, { rotation: _Utils2['default'].Rand(-1, 1) }, { rotation: 0, ease: Elastic.easeOut });

			ll.shoeWrapper.addChild(this.currentShoe);
		}
	}, {
		key: 'animateOutShoe',
		value: function animateOutShoe() {
			var _this2 = this;

			var ll = this.illusion;

			TweenMax.to(ll.backgroundSpr.scale, 1.6, { x: 0, y: 0, ease: Expo.easeInOut });
			TweenMax.to(ll.mask.scale, 1.4, { x: 0, y: 0, ease: Expo.easeInOut });
			TweenMax.to(this.currentShoe.scale, 1.6, { x: 0, y: 0, ease: Expo.easeInOut });
			TweenMax.to(ll.shoeWrapper, 1.6, { rotation: _Utils2['default'].Rand(-3, -2), ease: Expo.easeInOut });

			setTimeout(function () {
				ll.shoeWrapper.removeChild(_this2.currentShoe);
			}, 1600);
		}
	}, {
		key: 'resetValues',
		value: function resetValues() {
			this.uniforms.zoom.value += (2 - this.uniforms.zoom.value) * 0.05;
			this.uniforms.twirl.value += (1 - this.uniforms.twirl.value) * 0.1;
			this.uniforms.brightness.value += (1.25 - this.uniforms.brightness.value) * 0.1;
			this.uniforms.iterations.value = 2;
		}
	}, {
		key: 'onMouseOut',
		value: function onMouseOut(e) {
			e.preventDefault();
			this.resetActivationState();
		}
	}, {
		key: 'onMouseMove',
		value: function onMouseMove(e) {
			e.preventDefault();
			this.updateMousePos();
		}
	}, {
		key: 'updateMousePos',
		value: function updateMousePos() {
			this.mouseVec.normalMiddle.x = this.mouseVec.middle.x;
			this.mouseVec.normalMiddle.y = this.mouseVec.middle.y;
			this.mouseVec.normalMouse.x = _AppStore2['default'].Mouse.x;
			this.mouseVec.normalMouse.y = _AppStore2['default'].Mouse.y;
			var dist = this.mouseVec.normalMiddle.distanceTo(this.mouseVec.normalMouse);
			var newDist = dist / this.mouseVec.radius * 1.2;
			this.mouseVec.normalDist += (newDist - this.mouseVec.normalDist) * 0.06;
		}
	}, {
		key: 'update',
		value: function update() {
			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'update', this).call(this);

			this.counter += 0.04;

			this.illusion.maskFilter.maskSprite.scale.x = 1 + Math.sin(this.counter) * 0.4;
			this.illusion.maskFilter.maskSprite.scale.y = 1 + Math.sin(this.counter) * 0.4;
			this.illusion.maskFilter.maskSprite.rotation += 0.01;

			this.illusion.shoeWrapper.rotation = Math.sin(this.counter) * 0.1;
			this.illusion.shoeWrapper.x = Math.sin(this.counter) * 10;
			this.illusion.shoeWrapper.y = Math.cos(this.counter) * 20;
			this.illusion.shoeWrapper.scale.x = 1 + Math.sin(this.counter) * 0.101;
			this.illusion.shoeWrapper.scale.y = 1 + Math.sin(this.counter) * 0.1;

			if (this.state == 'normal') {
				var time = 0.005 + (0.02 - this.mouseVec.normalDist * 0.02) + this.stepsCounter * 0.001;
				time = Math.max(time, 0.007);
				this.uniforms.time.value += time;

				var zoom = 0.8 + 1 * this.mouseVec.normalDist * 0.6 + this.stepsCounter * 0.1;
				this.uniforms.zoom.value += (zoom - this.uniforms.zoom.value) * 0.02;

				var twirl = 0.8 + 1 * this.mouseVec.normalDist * 0.6 + this.stepsCounter * 0.4;
				this.uniforms.twirl.value += (twirl - this.uniforms.twirl.value) * 0.06;

				var brightness = 0.8 + 1 * this.mouseVec.normalDist * 1;
				this.uniforms.brightness.value += (brightness - this.uniforms.brightness.value) * 0.08;

				var iterations = Math.round(2 + (0.01 - this.mouseVec.normalDist * 0.01));
				this.uniforms.iterations.value += (iterations - this.uniforms.iterations.value) * 0.1;
			} else {
				this.mouseVec.normalDist = 1;
				var time = 0.001 + (0.02 - this.mouseVec.normalDist * 0.02);
				this.uniforms.time.value += time;
				this.resetValues();
			}
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.sprite.width = windowW;
			this.sprite.height = windowH;
			this.uniforms.resolution.value.x = windowW;
			this.uniforms.resolution.value.y = windowH;
			this.mouseVec.middle.x = windowW >> 1;
			this.mouseVec.middle.y = windowH >> 1;
			this.mouseVec.radius = windowW > windowH ? windowW >> 1 : windowH >> 1;

			var buttonW = windowW * 0.4;
			var buttonH = windowH * 0.6;
			this.button.css({
				width: buttonW,
				height: buttonH,
				left: (windowW >> 1) - (buttonW >> 1),
				top: (windowH >> 1) - (buttonH >> 1)
			});

			// var videoResize = Utils.ResizePositionProportionally(windowW, windowH, AppConstants.MEDIA_GLOBAL_W, AppConstants.MEDIA_GLOBAL_H)

			// this.video.css({
			// 	width: videoResize.width,
			// 	height: videoResize.height,
			// 	left: videoResize.left,
			// 	top: videoResize.top,
			// })

			this.illusion.holder.x = windowW >> 1;
			this.illusion.holder.y = windowH >> 1;

			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			clearInterval(this.activationInterval);
			clearTimeout(this.showroomTimeout);
			$('#app-container').off('mousemove', this.onMouseMove);
			this.button.off('mouseenter', this.onMouseOver);
			this.button.off('mouseleave', this.onMouseOut);

			for (var i = 0; i < this.shoes.length; i++) {
				var shoe = this.shoes[i];
				_AppStore2['default'].releaseSprite(shoe);
			};

			this.illusion.holder.filters = null;
			this.illusion.holder.removeChildren();
			_AppStore2['default'].releaseSprite(this.sprite);
			_AppStore2['default'].releaseSprite(this.illusion.mask);
			_AppStore2['default'].releaseSprite(this.illusion.displacementMapTexture);
			_AppStore2['default'].releaseSprite(this.illusion.backgroundSpr);
			_AppStore2['default'].releaseContainer(this.illusion.holder);
			this.illusion.shoeContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.illusion.shoeContainer);
			this.illusion.shoeWrapper.removeChildren();
			_AppStore2['default'].releaseContainer(this.illusion.shoeWrapper);
			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return GemStoneXP;
})(_BaseXP3['default']);

exports['default'] = GemStoneXP;
module.exports = exports['default'];

},{"./../../constants/AppConstants":47,"./../../stores/AppStore":60,"./../../utils/Utils":62,"./../../utils/Vec2":63,"./BaseXP":41}],43:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseXP2 = require('./BaseXP');

var _BaseXP3 = _interopRequireDefault(_BaseXP2);

var _AppStore = require('./../../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Utils = require('./../../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _AppConstants = require('./../../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);



var MetalXP = (function (_BaseXP) {
	_inherits(MetalXP, _BaseXP);

	function MetalXP(parentContainer, parentElement) {
		_classCallCheck(this, MetalXP);

		_get(Object.getPrototypeOf(MetalXP.prototype), 'constructor', this).call(this, parentContainer, parentElement);
	}

	_createClass(MetalXP, [{
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			var _this = this;

			setTimeout(function () {
				var videoId = 'v6zreywdqq';
				var iframeStr = '<iframe src="//fast.wistia.net/embed/iframe/' + videoId + '" allowtransparency="false" frameborder="0" scrolling="yes" class="wistia_embed" name="wistia_embed" allowfullscreen mozallowfullscreen webkitallowfullscreen oallowfullscreen msallowfullscreen width="100%" height="100%"></iframe>';
				_this.iframe = $(iframeStr);
				_AppStore2['default'].BackgroundElement.html(_this.iframe);
				_this.resizeIFrame();
			}, 200);

			_get(Object.getPrototypeOf(MetalXP.prototype), 'didTransitionInComplete', this).call(this);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {

			_AppStore2['default'].BackgroundElement.html('');

			var Engine = Matter.Engine,
			    World = Matter.World,
			    Body = Matter.Body,
			    Composites = Matter.Composites,
			    MouseConstraint = Matter.MouseConstraint;

			this.engine = Engine.create(this.element.get(0), {
				render: {
					options: {
						showAngleIndicator: false,
						showVelocity: false,
						background: 'transparent',
						wireframes: false
					}
				}
			});

			_AppStore2['default'].Sounds.play('metal-sounds-overall-0');

			this.matterCanvas = this.element.find('canvas');

			var mouseConstraint = MouseConstraint.create(this.engine);
			World.add(this.engine.world, mouseConstraint);
			mouseConstraint.constraint.render.visible = false;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var ratio = 112;
			this.cradle = Composites.newtonsCradle(windowW * 0.5 - (ratio * 6 >> 1), 0, 4, ratio, windowH * 0.58);
			World.add(this.engine.world, this.cradle);

			this.engine.world.gravity.y = 6;

			this.bodies = this.cradle.bodies;
			for (var i = 0; i < this.bodies.length; i++) {
				var body = this.bodies[i];
				body.active = false;
				body.render.visible = false;
				body.render.lineWidth = 0;
				this.cradle.constraints[i].render.visible = false;

				body.restitution = 1;
				body.friction = 16;
			};

			Body.translate(this.cradle.bodies[0], { x: -580, y: -500 });

			var explosionFrag = "#define GLSLIFY 1\nprecision mediump float;\n\nvarying vec2 vTextureCoord;\nuniform vec2 resolution;\nuniform sampler2D uSampler;\nuniform float time;\nuniform float rotation;\nuniform float displace;\nuniform float intensity;\nuniform float zoom;\nuniform float octave;\nuniform vec2 offset;\nuniform sampler2D mask;\n\n\n// float hash21(in vec2 n){ return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }\nfloat hash21(in vec2 n){ return fract(sin(dot(n, offset)) * 43758.5453); }\nmat2 makem2(in float theta){float c = cos(theta);float s = sin(theta);return mat2(c,-s,s,c);}\nfloat noise( in vec2 x ){return texture2D(uSampler, x*.01).x;}\n\nvec2 gradn(vec2 p) {\n    float ep = .09;\n    float gradx = noise(vec2(p.x+ep,p.y))-noise(vec2(p.x-ep,p.y));\n    float grady = noise(vec2(p.x,p.y+ep))-noise(vec2(p.x,p.y-ep));\n    return vec2(gradx,grady);\n}\n\nfloat flow(in vec2 p)\n{\n    float z = zoom;\n    float rz = 0.;\n    vec2 bp = p;\n    for (float i= 1.0; i < 6.0; i++) {\n        //primary flow speed\n        p += time*.6;\n        //secondary flow speed (speed of the perceived flow)\n        bp += time*1.9;\n        //displacement field (try changing time multiplier)\n        vec2 gr = gradn(i*p*.34+time*1.);\n        //rotation of the displacement field\n        gr*=makem2(time*rotation-(0.05*p.x+0.03*p.y)*40.);\n        //displace the system\n        p += gr*displace;\n        //add noise octave\n        rz+= (sin(noise(p)*7.)*0.5+0.5)/z;\n        //blend factor (blending displaced system with base system)\n        //you could call this advection factor (.5 being low, .95 being high)\n        p = mix(bp,p,octave);\n        //intensity scaling\n        z *= intensity;\n        //octave scaling\n        p *= 2.;\n        bp *= .09;\n    }\n    return rz;  \n}\n\nvoid main(void) {\n    vec2 p = -1.0 + 2.0 * vTextureCoord.xy;\n    float rz = flow(p);\n    vec3 col = vec3(.2,0.07,0.01)/rz;\n    col = pow(col,vec3(1.4));\n\n    vec4 original = vec4(col, 1.0);\n\n    vec4 masky = texture2D(mask, vTextureCoord);\n    float alpha = 1.0;\n    original *= (masky.r * masky.a * alpha);\n\n    gl_FragColor = vec4(original);\n}\n\n";
			var imgUrl = _AppStore2['default'].Preloader.getImageURL('metal-experience-noise');
			var ballAUrl = _AppStore2['default'].Preloader.getImageURL('metal-experience-ball-a');
			var gradientMaskUrl = _AppStore2['default'].Preloader.getImageURL('metal-experience-gradient-mask');
			this.cranes = [];
			for (var i = 0; i < 4; i++) {
				var g = {};

				var line = new PIXI.Graphics();
				this.pxContainer.addChild(line);

				var ball = _AppStore2['default'].getSprite();
				ball.texture = PIXI.Texture.fromImage(ballAUrl);
				ball.anchor.x = ball.anchor.y = 0.5;
				ball.scale.x = ball.scale.y = 0.5;

				var lava = new PIXI.Sprite(PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('metal-experience-ball-b')));
				lava.anchor.x = lava.anchor.y = 0.5;
				lava.scale.x = lava.scale.y = 0.5;

				// var texture = PIXI.Texture.fromImage(imgUrl)
				// var sprite = AppStore.getSprite()
				// sprite.texture = texture
				// var uniforms = undefined
				// sprite.shader = new PIXI.AbstractFilter(null, explosionFrag, uniforms = {
				// 	resolution: { type: '2f', value: { x: 1, y: 1 } },
				// 	uSampler: {type: 'sampler2D', value: texture},
				// 	mask: {type: 'sampler2D', value: PIXI.Texture.fromImage(gradientMaskUrl)},
				// 	time: {type: '1f', value: 0},
				// 	rotation: {type: '1f', value: Utils.Rand(-80,80)},
				// 	displace: {type: '1f', value: Utils.Rand(0.01,0.3)},
				// 	intensity: {type: '1f', value: 0.1},
				// 	zoom: {type: '1f', value: Utils.Rand(1,5)},
				// 	octave: {type: '1f', value: Utils.Rand(0.5,1)},
				// 	offset: { type: '2f', value: { x: Utils.Rand(8,24), y: Utils.Rand(2,16) } },
				//    })
				lava.blendMode = PIXI.BLEND_MODES.SCREEN;

				var holder = _AppStore2['default'].getContainer();
				holder.addChild(ball);
				holder.addChild(lava);
				this.pxContainer.addChild(holder);

				// var ratio = 226
				// sprite.width = ratio
				// sprite.height = ratio
				// uniforms.resolution.x = ratio
				// uniforms.resolution.y = ratio
				// sprite.anchor.x = sprite.anchor.y = 0.5

				g.holder = holder;
				g.ball = ball;
				g.lava = lava;
				g.line = line;
				// g.uniforms = uniforms
				this.cranes[i] = g;
			};

			this.runner = Engine.run(this.engine);

			Matter.Events.on(this.engine, 'collisionStart', function (event) {
				var pairs = event.pairs;
				for (var i = 0; i < pairs.length; i++) {
					var pair = pairs[i];
					pair.bodyA.active = true;
					pair.bodyB.active = true;
				}

				clearTimeout(this.ambientSoundTimeout);
				this.ambientSoundTimeout = setTimeout(function () {
					_AppStore2['default'].Sounds.play('metal-sounds-ambient', { interrupt: createjs.Sound.INTERRUPT_ANY });
				}, 300);
			});

			Matter.Events.on(this.engine, 'collisionActive', function (event) {
				var pairs = event.pairs;
				for (var i = 0; i < pairs.length; i++) {
					var pair = pairs[i];
					pair.bodyA.active = true;
					pair.bodyB.active = true;
				}
				clearTimeout(this.burnSoundTimeout);
				this.burnSoundTimeout = setTimeout(function () {
					_AppStore2['default'].Sounds.play('metal-sounds-burn', { interrupt: createjs.Sound.INTERRUPT_ANY, volume: _Utils2['default'].Rand(0.2, 0.6, 0.1) });
				}, 200);
			});

			Matter.Events.on(this.engine, 'collisionEnd', function (event) {
				var pairs = event.pairs;
				for (var i = 0; i < pairs.length; i++) {
					var pair = pairs[i];
					pair.bodyA.active = false;
					pair.bodyB.active = false;
				}
			});

			_get(Object.getPrototypeOf(MetalXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {

			for (var i = 0; i < this.cranes.length; i++) {
				var body = this.cradle.bodies[i];
				var constraint = this.cradle.constraints[i];
				var constraintStart = constraint.pointA;
				var constraintEnd = constraint.bodyB.position;
				var uniforms = this.cranes[i].uniforms;
				var ball = this.cranes[i].ball;
				var lava = this.cranes[i].lava;
				var holder = this.cranes[i].holder;
				var line = this.cranes[i].line;
				var displacement = this.cranes[i].displacement;

				holder.x = body.position.x;
				holder.y = body.position.y;

				// if(body.active) {
				// 	uniforms.intensity.value += (1.6 - uniforms.intensity.value) * 0.1
				// }else{
				// 	uniforms.intensity.value -= (uniforms.intensity.value + 0.5) * 0.005
				// }

				if (body.active) {
					lava.alpha += (0.8 - lava.alpha) * 0.1;
				} else {
					lava.alpha -= (lava.alpha + 0.1) * 0.01;
				}

				// uniforms.time.value += 0.001

				line.clear();
				line.lineStyle(1, 0xffffff, 1);
				line.moveTo(constraintStart.x, constraintStart.y);
				line.lineTo(constraintEnd.x, constraintEnd.y);
			};

			_get(Object.getPrototypeOf(MetalXP.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resizeIFrame',
		value: function resizeIFrame() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var videoResize = _Utils2['default'].ResizePositionProportionally(windowW, windowH, _AppConstants2['default'].MEDIA_GLOBAL_W, _AppConstants2['default'].MEDIA_GLOBAL_H);

			this.iframe.css({
				position: 'absolute',
				left: videoResize.left,
				top: videoResize.top,
				width: videoResize.width,
				height: videoResize.height
			});
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			if (this.iframe != undefined) {
				this.resizeIFrame();
			}

			this.matterCanvas.get(0).width = windowW;
			this.matterCanvas.get(0).height = windowH;

			_get(Object.getPrototypeOf(MetalXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			Matter.Engine.clear(this.engine);
			Matter.Runner.stop(this.runner);
			Matter.Engine.events = {};

			for (var i = 0; i < this.cranes.length; i++) {
				var ball = this.cranes[i].ball;
				var lava = this.cranes[i].lava;
				var holder = this.cranes[i].holder;
				var uniforms = this.cranes[i].uniforms;
				var displacement = this.cranes[i].displacement;

				uniforms = null;

				_AppStore2['default'].releaseSprite(ball);
				_AppStore2['default'].releaseSprite(lava);

				holder.removeChildren();
				_AppStore2['default'].releaseContainer(holder);
			}

			// this.videoSprite.destroy(true)
			// Utils.RemoveVideo(this.video)
			_get(Object.getPrototypeOf(MetalXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return MetalXP;
})(_BaseXP3['default']);

exports['default'] = MetalXP;
module.exports = exports['default'];

},{"./../../constants/AppConstants":47,"./../../stores/AppStore":60,"./../../utils/Utils":62,"./BaseXP":41}],44:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseXP2 = require('./BaseXP');

var _BaseXP3 = _interopRequireDefault(_BaseXP2);

var _AppStore = require('./../../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _bezierEasing = require('bezier-easing');

var _bezierEasing2 = _interopRequireDefault(_bezierEasing);

var _Utils = require('./../../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _GradientText = require('./../GradientText');

var _GradientText2 = _interopRequireDefault(_GradientText);

var _pixiParticles = require('pixi-particles');

var _pixiParticles2 = _interopRequireDefault(_pixiParticles);

var _AppConstants = require('./../../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var SkiXP = (function (_BaseXP) {
	_inherits(SkiXP, _BaseXP);

	function SkiXP(parentContainer, parentElement) {
		_classCallCheck(this, SkiXP);

		_get(Object.getPrototypeOf(SkiXP.prototype), 'constructor', this).call(this, parentContainer, parentElement);
	}

	_createClass(SkiXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.onBumpOver = this.onBumpOver.bind(this);
			this.count = 0;
			this.pointsLen = 20;
			this.ropeLength = 1920 / this.pointsLen;
			this.isTitleAnimate = false;
			this.elapsed = Date.now();
			this.counter = {
				vel: 0.05
			};

			// AppStore.Sounds.play('ski-sounds-drums', { interrupt: createjs.Sound.INTERRUPT_ANY, loop:-1 })

			var texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('ski-experience-bumps'));
			this.bumps = [];
			for (var i = 0; i < 6; i++) {
				var points = [];
				for (var j = 0; j < this.pointsLen; j++) {
					points.push(new PIXI.Point(j * this.ropeLength, 0));
				}
				this.bumps.push({
					counter: 0,
					ease: (0, _bezierEasing2['default'])(1, .04, 0, 1),
					points: points,
					vel: 0.05,
					rope: new PIXI.mesh.Rope(texture, points)
				});
			};
			this.bumpsContainer = _AppStore2['default'].getContainer();
			this.pxContainer.addChild(this.bumpsContainer);

			var style = {
				font: '22px FuturaBold',
				fill: 'white'
			};

			this.gameStatus = {
				textField: new PIXI.Text("SCORE: 1000 PTS", style),
				pointTextField: new PIXI.Text("+150 pts", style),
				counter: 0,
				score: 0,
				time: 0
			};

			this.pxContainer.addChild(this.gameStatus.textField);
			this.pxContainer.addChild(this.gameStatus.pointTextField);
			this.gameStatus.textField.anchor.x = this.gameStatus.textField.anchor.y = 0.5;
			this.gameStatus.pointTextField.anchor.x = this.gameStatus.pointTextField.anchor.y = 0.5;
			this.gameStatus.pointTextField.scale.x = this.gameStatus.pointTextField.scale.y = 0;

			this.particleContainer = _AppStore2['default'].getContainer();
			this.emitter = new cloudkid.Emitter(this.particleContainer, [PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('ski-experience-shoe-0')), PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('ski-experience-shoe-1')), PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('ski-experience-shoe-2')), PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('ski-experience-shoe-3'))], {
				"alpha": {
					"start": 1,
					"end": 1
				},
				"scale": {
					"start": 0.1,
					"end": 0.4
				},
				"color": {
					"start": "ffffff",
					"end": "9ff3ff"
				},
				"speed": {
					"start": 400,
					"end": 100
				},
				"acceleration": {
					"x": 0,
					"y": 400
				},
				"startRotation": {
					"min": 280,
					"max": 260
				},
				"rotationSpeed": {
					"min": 0,
					"max": 0
				},
				"lifetime": {
					"min": 5,
					"max": 8
				},
				"blendMode": "normal",
				"frequency": 1.10,
				"emitterLifetime": -1,
				"maxParticles": 100,
				"pos": {
					"x": 0,
					"y": 0
				},
				"addAtBack": true,
				"spawnType": "circle",
				"spawnCircle": {
					"x": 0,
					"y": 0,
					"r": _AppStore2['default'].Window.w * 0.6
				}
			});

			this.setupBumps();

			this.pxContainer.addChild(this.particleContainer);

			var gradientTextA = new _GradientText2['default'](this.pxContainer);
			gradientTextA.componentDidMount({ fontFamily: 'Mechsuit', fontSize: 90, strokeThickness: 14 });
			var gradientTextB = new _GradientText2['default'](this.pxContainer);
			gradientTextB.componentDidMount({ fontFamily: 'Paladins', fontSize: 120, strokeThickness: 14 });
			var gradientTextC = new _GradientText2['default'](this.pxContainer);
			gradientTextC.componentDidMount({ fontFamily: 'Skirmisher', fontSize: 150, strokeThickness: 14 });

			this.gradientTextIndex = 0;
			this.gradientTexts = [gradientTextA, gradientTextB, gradientTextC];
			for (var i = 0; i < this.gradientTexts.length; i++) {
				var gradientTxt = this.gradientTexts[i];
				gradientTxt.container.alpha = 0;
			};

			this.emitter.emit = true;

			_get(Object.getPrototypeOf(SkiXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'setupBumps',
		value: function setupBumps() {
			for (var i = 0; i < this.bumps.length; i++) {
				var bump = this.bumps[i];
				var rope = bump.rope;
				rope.y = 160 * i;
				rope.buttonMode = false;
				rope.interactive = true;
				rope.id = 'bump_' + i;
				rope.on('mouseover', this.onBumpOver);
				this.bumpsContainer.addChild(rope);
			}
			this.bumps[0].rope.x = 300;
			this.bumps[1].rope.scale.set(-1.1, 1.1);
			this.bumps[1].rope.x = 1900;
			this.bumps[2].rope.scale.set(1.2, 1.2);
			this.bumps[3].rope.scale.set(-1.3, 1.3);
			this.bumps[3].rope.x = 2100;
			this.bumps[4].rope.scale.set(1.4, 1.4);
			this.bumps[4].rope.y += 140;
			this.bumps[5].rope.scale.set(-1.6, 1.5);
			this.bumps[5].rope.x = 2100;
			this.bumps[5].rope.y += 200;

			for (var i = 0; i < this.bumps.length; i++) {
				var bump = this.bumps[i];
				var rope = bump.rope;
				bump.scaleX = rope.scale.x;
				bump.scaleY = rope.scale.y;
				bump.scaleInitialX = rope.scale.x;
				bump.scaleInitialY = rope.scale.y;
			};

			this.bumpsContainer.x = 0;
			this.bumpsContainer.y = 0;
		}
	}, {
		key: 'onBumpOver',
		value: function onBumpOver(e) {
			var _this = this;

			var target = e.target;
			var id = target.id;
			var index = Math.round(id.replace('bump_', ''));
			var bump = this.bumps[index];
			var scale = _Utils2['default'].Rand(0.01, 0.02);
			// bump.counter = 0

			bump.vel = 0.9;
			this.gameStatus.lastScore = this.gameStatus.score;

			this.gameStatus.textField.text = 'SCORE: ' + this.gameStatus.score + ' pts';
			this.gameStatus.score += Math.round(_Utils2['default'].Rand(1, 100));

			this.gameStatus.textField.scale.x = 1.3;
			this.gameStatus.textField.scale.y = 1.1;
			clearTimeout(this.pointStatusTimeout);
			this.pointStatusTimeout = setTimeout(function () {
				_this.gameStatus.textField.scale.x = 1;
				_this.gameStatus.textField.scale.y = 1;
			}, 10);

			if (this.isTitleAnimate) return;

			var randIndex = _Utils2['default'].Rand(0, 1, 0);
			var soundId = 'ski-sounds-bump-' + randIndex;
			_AppStore2['default'].Sounds.play(soundId);

			this.gameStatus.counter += 1;
			if (this.gameStatus.counter > 10) {

				this.currentGradientText = this.getGradientText();
				this.currentGradientText.setText();
				this.resizeGradientTexts();

				_AppStore2['default'].Sounds.play('ski-sounds-text-in-0');

				this.gameStatus.pointTextField.text = Math.round(Math.random() * 300) + ' pts';

				this.gameStatus.pointTextField.x = _AppStore2['default'].Mouse.x;
				this.gameStatus.pointTextField.y = _AppStore2['default'].Mouse.y;
				this.gameStatus.pointTextField.alpha = 1;

				var randIndex = _Utils2['default'].Rand(0, 1, 0);
				var soundId = 'ski-sounds-flying-' + randIndex;
				_AppStore2['default'].Sounds.play(soundId);

				TweenMax.fromTo(this.gameStatus.pointTextField.scale, 0.6, { x: 0, y: 2 }, { x: 1.4, y: 1.4, ease: Elastic.easeOut });
				TweenMax.to(this.gameStatus.pointTextField, 1, { y: -100, alpha: 0, ease: Linear.easeOut });

				TweenMax.fromTo(this.gameStatus.textField.scale, 0.6, { x: 0, y: 2 }, { x: 1.4, y: 1.4, ease: Elastic.easeOut });
				TweenMax.to(this.gameStatus.textField.scale, 0.8, { delay: 0.8, x: 1, y: 1, ease: Expo.easeOut });
				TweenMax.fromTo(this.currentGradientText.container.scale, 0.4, { x: 0, y: 0 }, { x: this.currentGradientText.scale - 0.5, y: this.currentGradientText.scale - 0.5, ease: Elastic.easeOut });
				TweenMax.to(this.currentGradientText.container.scale, 0.4, { delay: 0.2, x: this.currentGradientText.scale, y: this.currentGradientText.scale, ease: Elastic.easeOut });
				TweenMax.fromTo(this.currentGradientText.container, 0.4, { alpha: 0 }, { alpha: 1, ease: Elastic.easeOut });
				this.currentGradientText.toggle();
				this.isTitleAnimate = true;
				// TweenMax.to(this.counter, 0.4, { vel:0.3, ease:Elastic.easeOut })
				setTimeout(function () {
					TweenMax.to(_this.currentGradientText.container.scale, 0.6, { x: _this.currentGradientText.scale + 2, y: _this.currentGradientText.scale + 0.1, ease: Expo.easeInOut });
					TweenMax.to(_this.currentGradientText.container, 0.6, { alpha: 0, ease: Expo.easeInOut });
				}, 1600);
				setTimeout(function () {
					_this.isTitleAnimate = false;
					// TweenMax.to(this.counter, 0.5, { vel:0.02, ease:Expo.easeInOut })
				}, 2000);
				this.gameStatus.counter = 0;
			}
		}
	}, {
		key: 'getGradientText',
		value: function getGradientText() {
			this.gradientTextIndex += 1;
			this.gradientTextIndex = this.gradientTextIndex > this.gradientTexts.length - 1 ? 0 : this.gradientTextIndex;
			this.gradientTextIndex = this.gradientTextIndex < 0 ? this.gradientTexts.length - 1 : this.gradientTextIndex;
			return this.gradientTexts[this.gradientTextIndex];
		}
	}, {
		key: 'update',
		value: function update() {
			// this.count += this.counter.vel

			if (this.currentGradientText != undefined) {
				this.currentGradientText.update();
			}

			// var mouse = AppStore.Mouse
			// this.particleContainer.x += (mouse.x - this.particleContainer.x) * 0.1
			// this.particleContainer.y += (mouse.y - this.particleContainer.y) * 0.1

			var now = Date.now();
			this.emitter.update((now - this.elapsed) * 0.001);
			// this.emitter.emit = false
			this.elapsed = now;

			for (var i = 0; i < this.bumps.length; i++) {
				var bump = this.bumps[i];
				var points = bump.points;
				bump.vel -= (bump.vel - 0.05) * 0.2;
				bump.counter += bump.vel;
				for (var j = 0; j < points.length; j++) {
					points[j].x = j * this.ropeLength + Math.cos(j * 0.3 + bump.counter) * 10;
					points[j].y = Math.sin(j * 0.5 + bump.counter) * 40;
				}
			};

			_get(Object.getPrototypeOf(SkiXP.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resizeGradientTexts',
		value: function resizeGradientTexts() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			for (var i = 0; i < this.gradientTexts.length; i++) {
				var gradientText = this.gradientTexts[i];
				gradientText.resize();
				gradientText.position(windowW >> 1, windowH >> 1);
			}
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var ratio = windowW / windowH;
			if (ratio < 1.63) {
				var scale = windowH / 900 * 0.8;
			} else {
				var scale = windowW / 1620 * 0.8;
			}
			this.bumpsContainer.scale.x = scale;
			this.bumpsContainer.scale.y = scale;
			this.bumpsContainer.x = (windowW >> 1) - (2100 * scale >> 1);
			this.bumpsContainer.y = (windowH >> 1) - (200 * this.bumps.length * scale >> 1);

			this.particleContainer.x = windowW >> 1;
			this.particleContainer.y = windowH >> 1;

			this.gameStatus.textField.x = windowW >> 1;
			this.gameStatus.textField.y = _AppConstants2['default'].PADDING_AROUND + (this.gameStatus.textField.height >> 1);

			this.resizeGradientTexts();

			_get(Object.getPrototypeOf(SkiXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {

			this.bumpsContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.bumpsContainer);

			this.particleContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.particleContainer);

			for (var i = 0; i < this.gradientTexts.length; i++) {
				var gradientTxt = this.gradientTexts[i];
				gradientTxt.componentWillUnmount();
			};

			this.emitter.destroy();

			this.gameStatus.textField.destroy(true, true);
			this.gameStatus.pointTextField.destroy(true, true);

			_get(Object.getPrototypeOf(SkiXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return SkiXP;
})(_BaseXP3['default']);

exports['default'] = SkiXP;
module.exports = exports['default'];

},{"./../../constants/AppConstants":47,"./../../stores/AppStore":60,"./../../utils/Utils":62,"./../GradientText":25,"./BaseXP":41,"bezier-easing":"bezier-easing","pixi-particles":"pixi-particles"}],45:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseXP2 = require('./BaseXP');

var _BaseXP3 = _interopRequireDefault(_BaseXP2);

var _AppStore = require('./../../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Utils = require('./../../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _pixiParticles = require('pixi-particles');

var _pixiParticles2 = _interopRequireDefault(_pixiParticles);

var _Sounds = require('./../../services/Sounds');

var _Sounds2 = _interopRequireDefault(_Sounds);

var WoodXP = (function (_BaseXP) {
	_inherits(WoodXP, _BaseXP);

	function WoodXP(parentContainer, parentElement) {
		_classCallCheck(this, WoodXP);

		_get(Object.getPrototypeOf(WoodXP.prototype), 'constructor', this).call(this, parentContainer, parentElement);
	}

	_createClass(WoodXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {

			this.counter = 0;
			this.owl = {
				time: _Utils2['default'].Rand(100, 300),
				counter: 0
			};

			this.notes = {
				len: 8,
				btns: []
			};

			this.displacementMapTexture = _AppStore2['default'].getSprite();
			this.displacementMapTexture.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('wood-experience-displacement'));
			this.displacementMapTexture.anchor.x = this.displacementMapTexture.anchor.y = 0.5;
			this.displacementFilter = new PIXI.filters.DisplacementFilter(this.displacementMapTexture);
			this.displacementMapTexture.scale.x = this.displacementMapTexture.scale.y = 0;
			this.displacementTween = TweenMax.fromTo(this.displacementMapTexture.scale, 2, { x: 0, y: 0 }, { x: 20, y: 20, ease: Expo.easeOut });

			this.onMouseEnter = this.onMouseEnter.bind(this);

			var notes = 0;
			for (var i = 0; i < this.notes.len; i++) {
				var btn = $('<div id="' + 'note-' + notes + '" class="xp-button"></div>');
				this.element.append(btn);
				btn.on('mouseenter', this.onMouseEnter);
				this.notes.btns.push(btn);
				notes += 1;
			};

			notes = this.notes.len;
			for (var i = this.notes.len; i < this.notes.len * 2; i++) {
				var btn = $('<div id="' + 'note-' + notes + '" class="xp-button"></div>');
				this.element.append(btn);
				btn.on('mouseenter', this.onMouseEnter);
				this.notes.btns.push(btn);
				notes -= 1;
			};

			this.elapsed = Date.now();

			this.circles = {
				container: _AppStore2['default'].getContainer(),
				parts: []
			};
			this.pxContainer.addChild(this.circles.container);

			_AppStore2['default'].Sounds.play('wood-sounds-rain', { interrupt: createjs.Sound.INTERRUPT_ANY, loop: -1 });

			this.particleContainer = _AppStore2['default'].getContainer();
			this.emitter = new cloudkid.Emitter(this.particleContainer, [PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('wood-experience-rain'))], {
				"alpha": {
					"start": 0.4,
					"end": 0.4
				},
				"scale": {
					"start": 1,
					"end": 1
				},
				"color": {
					"start": "ffffff",
					"end": "ffffff"
				},
				"speed": {
					"start": 3000,
					"end": 3000
				},
				"startRotation": {
					"min": 90,
					"max": 90
				},
				"rotationSpeed": {
					"min": 0,
					"max": 0
				},
				"lifetime": {
					"min": 0.81,
					"max": 0.81
				},
				"blendMode": "normal",
				"frequency": 0.01,
				"emitterLifetime": 0,
				"maxParticles": 200,
				"pos": {
					"x": 0,
					"y": -400
				},
				"addAtBack": false,
				"spawnType": "rect",
				"spawnRect": {
					"x": 0,
					"y": 0,
					"w": 900,
					"h": 20
				}
			});

			this.emitter.emit = true;

			var totalScale = 0.6;
			this.totalSteps = 18;
			var scaleStep = totalScale / this.totalSteps;
			var currentScale = totalScale;
			for (var i = 0; i < this.totalSteps; i++) {
				var part = _AppStore2['default'].getSprite();
				part.texture = PIXI.Texture.fromImage(_AppStore2['default'].Preloader.getImageURL('wood-experience-wood-part'));
				part.anchor.x = part.anchor.y = 0.5;
				part.rotation = _Utils2['default'].Rand(-.1, .1);

				part.scale.x = part.scale.y = currentScale;
				currentScale -= scaleStep;

				this.circles.container.addChild(part);
				this.circles.parts[i] = part;
			};

			this.pxContainer.addChild(this.displacementMapTexture);
			this.circles.container.filters = [this.displacementFilter];
			this.pxContainer.addChild(this.particleContainer);

			_get(Object.getPrototypeOf(WoodXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'onMouseEnter',
		value: function onMouseEnter(e) {
			e.preventDefault();
			var target = e.currentTarget;
			var id = target.id;
			var noteNum = id.replace('note-', '');
			var soundId = 'wood-sounds-woodblock-' + noteNum;
			_AppStore2['default'].Sounds.play(soundId);
			this.displacementTween.play(0);
		}
	}, {
		key: 'update',
		value: function update() {
			this.counter += 0.8;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var mouse = _AppStore2['default'].Mouse;

			var normalX = mouse.x / windowW * 3;
			var normalY = mouse.y / windowH * 3;
			var offsetNormalX = normalX - 1.5;
			var offsetNormalY = normalY - 1.5;
			var middleX = mouse.x > windowW >> 1.5 ? 1.5 - (normalX - 1.5) : normalX;
			var middleY = mouse.y > windowH >> 1.5 ? 1.5 - (normalY - 1.5) : normalY;

			// var parts = this.circles.parts
			// for (var i = 0; i < parts.length; i++) {
			// 	var part = parts[i]
			// 	part.rotation = Math.cos((this.counter + i) / this.totalSteps) * 2
			// 	part.x += offsetNormalX * (1*i)
			// 	part.y += offsetNormalY * (1*i)
			// };

			var parts = this.circles.parts;
			for (var i = 0; i < parts.length; i++) {
				var part = parts[i];
				var deltaX = (mouse.x - (windowW >> 1) - part.x) / (i + parts.length);
				var deltaY = (mouse.y - (windowH >> 1) - part.y) / (i + parts.length);
				part.rotation = Math.cos((this.counter + i) / this.totalSteps) * 2;
				part.x += deltaX;
				part.y += deltaY;
			};

			this.displacementMapTexture.x = mouse.x;
			this.displacementMapTexture.y = mouse.y;

			var now = Date.now();
			this.emitter.update((now - this.elapsed) * 0.001);
			this.elapsed = now;

			this.owl.counter += 2;
			if (this.owl.counter > this.owl.time) {
				this.owl.time = _Utils2['default'].Rand(800, 2000);
				this.owl.counter = 0;
				_AppStore2['default'].Sounds.play('wood-sounds-owl');
			}

			_get(Object.getPrototypeOf(WoodXP.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.circles.container.x = windowW >> 1;
			this.circles.container.y = windowH >> 1;

			var bounds = 1300;
			var scale = windowW > windowH ? windowW / bounds * 1 : windowH / (bounds * 0.8) * 1;
			this.circles.container.scale.x = scale;
			this.circles.container.scale.y = scale;

			this.displacementMapTexture.x = this.circles.container.x;
			this.displacementMapTexture.y = this.circles.container.y;

			this.emitter.spawnRect.width = windowW;
			this.emitter.spawnRect.height = windowH;

			var btnW = windowW / (this.notes.len * 2);

			for (var i = 0; i < this.notes.btns.length; i++) {
				var btn = this.notes.btns[i];
				btn.css({
					left: btnW * i,
					width: btnW,
					height: windowH
				});
			};

			_get(Object.getPrototypeOf(WoodXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			for (var i = 0; i < this.notes.btns.length; i++) {
				var btn = this.notes.btns[i];
				btn.off('mouseenter', this.onMouseEnter);
			};
			for (var i = 0; i < this.circles.parts.length; i++) {
				var part = this.circles.parts[i];
				_AppStore2['default'].releaseSprite(part);
			};
			this.circles.container.filters = null;
			this.circles.container.removeChildren();
			this.particleContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.circles.container);
			_AppStore2['default'].releaseContainer(this.particleContainer);
			_AppStore2['default'].releaseSprite(this.displacementMapTexture);
			this.emitter.destroy();
			_get(Object.getPrototypeOf(WoodXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return WoodXP;
})(_BaseXP3['default']);

exports['default'] = WoodXP;
module.exports = exports['default'];

},{"./../../services/Sounds":58,"./../../stores/AppStore":60,"./../../utils/Utils":62,"./BaseXP":41,"pixi-particles":"pixi-particles"}],46:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _Page2 = require('./../Page');

var _Page3 = _interopRequireDefault(_Page2);

var _LandingSlideshow = require('./../LandingSlideshow');

var _LandingSlideshow2 = _interopRequireDefault(_LandingSlideshow);

var _AppStore = require('./../../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Compass = require('./../Compass');

var _Compass2 = _interopRequireDefault(_Compass);

var _ArrowBtn = require('./../ArrowBtn');

var _ArrowBtn2 = _interopRequireDefault(_ArrowBtn);

var _AppConstants = require('./../../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Router = require('./../../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var Landing = (function (_Page) {
	_inherits(Landing, _Page);

	function Landing(props) {
		_classCallCheck(this, Landing);

		props.data.isMobile = _AppStore2['default'].Detector.isMobile;
		if (props.data.isMobile) {
			var mobileScope = [];
			var planets = _AppStore2['default'].planets();
			var infos = _AppStore2['default'].generalInfosLangScope();
			for (var i = 0; i < planets.length; i++) {
				var planet = planets[i];
				var g = {
					id: planet,
					planetTxt: infos.planet.toUpperCase(),
					planetName: planet.toUpperCase(),
					imgsrc: _AppStore2['default'].mainImageUrl(planet, _AppConstants2['default'].RESPONSIVE_IMAGE),
					url: "#!/planet/" + planet + '/0'
				};
				mobileScope[i] = g;
			}
			props.data.mobileScope = mobileScope;
		}

		_get(Object.getPrototypeOf(Landing.prototype), 'constructor', this).call(this, props);
	}

	_createClass(Landing, [{
		key: 'componentDidMount',
		value: function componentDidMount() {

			if (_AppStore2['default'].Detector.isMobile != true) {

				this.landingSlideshow = new _LandingSlideshow2['default'](this.pxContainer, this.child);
				this.landingSlideshow.componentDidMount();

				this.compass = new _Compass2['default'](this.pxContainer);
				this.compass.componentDidMount();

				this.arrowLeft = new _ArrowBtn2['default'](this.child.find('.previous-btn'), _AppConstants2['default'].LEFT);
				this.arrowLeft.componentDidMount();
				this.arrowRight = new _ArrowBtn2['default'](this.child.find('.next-btn'), _AppConstants2['default'].RIGHT);
				this.arrowRight.componentDidMount();

				this.onKeyPressed = this.onKeyPressed.bind(this);
				$(document).on('keydown', this.onKeyPressed);

				this.arrowClicked = this.arrowClicked.bind(this);
				this.arrowMouseEnter = this.arrowMouseEnter.bind(this);
				this.arrowMouseLeave = this.arrowMouseLeave.bind(this);
				this.middleAreaMouseEnter = this.middleAreaMouseEnter.bind(this);
				this.middleAreaMouseLeave = this.middleAreaMouseLeave.bind(this);
				this.middleAreaClick = this.middleAreaClick.bind(this);

				this.previousArea = this.child.find('.interface .previous-area');
				this.nextArea = this.child.find('.interface .next-area');
				this.middleArea = this.child.find('.interface .middle-area');
				this.previousArea.on('click', this.arrowClicked);
				this.nextArea.on('click', this.arrowClicked);
				this.previousArea.on('mouseenter', this.arrowMouseEnter);
				this.nextArea.on('mouseenter', this.arrowMouseEnter);
				this.middleArea.on('mouseenter', this.middleAreaMouseEnter);
				this.previousArea.on('mouseleave', this.arrowMouseLeave);
				this.nextArea.on('mouseleave', this.arrowMouseLeave);
				this.middleArea.on('mouseleave', this.middleAreaMouseLeave);

				this.middleArea.on('click', this.middleAreaClick);

				this.tweenCompass = TweenMax.to(this.compass.container.scale, 0.6, { x: 1.1, y: 1.1, ease: Back.easeInOut });
				this.tweenCompass.pause(0);
			}

			_get(Object.getPrototypeOf(Landing.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'middleAreaMouseEnter',
		value: function middleAreaMouseEnter(e) {
			e.preventDefault();
			this.tweenCompass.timeScale(1).play();
		}
	}, {
		key: 'middleAreaMouseLeave',
		value: function middleAreaMouseLeave(e) {
			e.preventDefault();
			this.tweenCompass.timeScale(1.4).reverse();
		}
	}, {
		key: 'middleAreaClick',
		value: function middleAreaClick(e) {
			e.preventDefault();
			var url = "/planet/" + this.landingSlideshow.currentId;
			_Router2['default'].setHash(url);
		}
	}, {
		key: 'arrowClicked',
		value: function arrowClicked(e) {
			e.preventDefault();
			var id = e.currentTarget.id;
			var direction = id.toUpperCase();
			switch (direction) {
				case _AppConstants2['default'].LEFT:
					this.previous();
					break;
				case _AppConstants2['default'].RIGHT:
					this.next();
					break;
			}
		}
	}, {
		key: 'arrowMouseEnter',
		value: function arrowMouseEnter(e) {
			e.preventDefault();
			var id = e.currentTarget.id;
			var direction = id.toUpperCase();
			var arrow = this.getArrowByDirection(direction);
			arrow.mouseOver();
		}
	}, {
		key: 'arrowMouseLeave',
		value: function arrowMouseLeave(e) {
			e.preventDefault();
			var id = e.currentTarget.id;
			var direction = id.toUpperCase();
			var arrow = this.getArrowByDirection(direction);
			arrow.mouseOut();
		}
	}, {
		key: 'getArrowByDirection',
		value: function getArrowByDirection(direction) {
			switch (direction) {
				case _AppConstants2['default'].LEFT:
					return this.arrowLeft;
					break;
				case _AppConstants2['default'].RIGHT:
					return this.arrowRight;
					break;
			}
		}
	}, {
		key: 'onKeyPressed',
		value: function onKeyPressed(e) {
			e.preventDefault();
			switch (e.which) {
				case 37:
					// left
					this.previous();
					break;
				case 39:
					// right
					this.next();
					break;
				default:
					return;
			}
		}
	}, {
		key: 'updateCompassPlanet',
		value: function updateCompassPlanet() {
			if (_AppStore2['default'].Detector.isMobile) return;

			var planetData = _AppStore2['default'].productsDataById(this.landingSlideshow.currentId);
			this.compass.updateData(planetData);
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			_get(Object.getPrototypeOf(Landing.prototype), 'didTransitionInComplete', this).call(this);
			this.updateCompassPlanet();
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			_get(Object.getPrototypeOf(Landing.prototype), 'didTransitionOutComplete', this).call(this);
		}
	}, {
		key: 'next',
		value: function next() {
			this.landingSlideshow.next();
			this.updateCompassPlanet();
		}
	}, {
		key: 'previous',
		value: function previous() {
			this.landingSlideshow.previous();
			this.updateCompassPlanet();
		}
	}, {
		key: 'update',
		value: function update() {

			if (_AppStore2['default'].Detector.isMobile) return;

			// var windowW = AppStore.Window.w
			// var mouseX = AppStore.Mouse.x
			this.landingSlideshow.update();
			this.compass.update();
			// this.direction = AppConstants.NONE
			// var area = windowW * 0.25
			// if(mouseX > ((windowW >> 1) - area) && mouseX < ((windowW >> 1) + area)) {
			// 	this.direction = AppConstants.TOP
			// }

			_get(Object.getPrototypeOf(Landing.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
			_get(Object.getPrototypeOf(Landing.prototype), 'resize', this).call(this);

			if (_AppStore2['default'].Detector.isMobile) return;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.landingSlideshow.resize();
			this.compass.resize();
			this.compass.position(windowW >> 1, (windowH >> 1) + windowH * 0.03);
			this.arrowRight.position(windowW - (windowW * _AppConstants2['default'].LANDING_NORMAL_SLIDE_PERCENTAGE >> 1), windowH >> 1);
			this.arrowLeft.position((windowW * _AppConstants2['default'].LANDING_NORMAL_SLIDE_PERCENTAGE >> 1) - this.arrowLeft.width, windowH >> 1);
			this.previousArea.css({
				width: windowW * _AppConstants2['default'].LANDING_NORMAL_SLIDE_PERCENTAGE,
				height: windowH
			});
			this.nextArea.css({
				width: windowW * _AppConstants2['default'].LANDING_NORMAL_SLIDE_PERCENTAGE,
				height: windowH,
				left: windowW - windowW * _AppConstants2['default'].LANDING_NORMAL_SLIDE_PERCENTAGE
			});
			this.middleArea.css({
				left: windowW * _AppConstants2['default'].LANDING_NORMAL_SLIDE_PERCENTAGE,
				width: windowW - (windowW * _AppConstants2['default'].LANDING_NORMAL_SLIDE_PERCENTAGE << 1),
				height: windowH
			});
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(Landing.prototype), 'componentWillUnmount', this).call(this);

			if (_AppStore2['default'].Detector.isMobile) return;

			this.landingSlideshow.componentWillUnmount();
			this.compass.componentWillUnmount();
			this.arrowLeft.componentWillUnmount();
			this.arrowRight.componentWillUnmount();
			$(document).off('keydown', this.onKeyPressed);

			this.previousArea.off('click', this.arrowClicked);
			this.nextArea.off('click', this.arrowClicked);
			this.previousArea.off('mouseenter', this.arrowMouseEnter);
			this.nextArea.off('mouseenter', this.arrowMouseEnter);
			this.previousArea.off('mouseleave', this.arrowMouseLeave);
			this.nextArea.off('mouseleave', this.arrowMouseLeave);

			this.middleArea.off('mouseenter', this.middleAreaMouseEnter);
			this.middleArea.off('mouseleave', this.middleAreaMouseLeave);
			this.middleArea.off('click', this.middleAreaClick);
		}
	}]);

	return Landing;
})(_Page3['default']);

exports['default'] = Landing;
module.exports = exports['default'];

},{"./../../constants/AppConstants":47,"./../../services/Router":57,"./../../stores/AppStore":60,"./../ArrowBtn":18,"./../Compass":21,"./../LandingSlideshow":27,"./../Page":29}],47:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = {
	WINDOW_RESIZE: 'WINDOW_RESIZE',
	PAGE_HASHER_CHANGED: 'PAGE_HASHER_CHANGED',
	PAGE_HASHER_INTERNAL_CHANGE: 'PAGE_HASHER_INTERNAL_CHANGE',
	PX_CONTAINER_IS_READY: 'PX_CONTAINER_IS_READY',
	PX_CONTAINER_ADD_CHILD: 'PX_CONTAINER_ADD_CHILD',
	PX_CONTAINER_REMOVE_CHILD: 'PX_CONTAINER_REMOVE_CHILD',
	TOGGLE_SOUNDS: 'TOGGLE_SOUNDS',

	LANDING: 'LANDING',
	EXPERIENCE: 'EXPERIENCE',
	CAMPAIGN: 'CAMPAIGN',
	NONE: 'NONE',

	COMPASS_SIZE_PERCENTAGE: 0.16,
	COMPASS_SMALL_SIZE_PERCENTAGE: 0.18,

	LANDING_NORMAL_SLIDE_PERCENTAGE: 0.24,

	SMALL_KNOT_RADIUS: 3,

	OPEN: 'OPEN',
	CLOSE: 'CLOSE',

	LEFT: 'LEFT',
	RIGHT: 'RIGHT',
	TOP: 'TOP',
	BOTTOM: 'BOTTOM',

	TOTAL_KNOT_NUM: 3,

	PADDING_AROUND: 40,

	CAMPAIGN_IMAGE_SIZE: [1400, 945],

	RESPONSIVE_IMAGE: [1920, 1280, 640],

	ENVIRONMENTS: {
		PREPROD: {
			'static': ''
		},
		PROD: {
			"static": JS_url_static + '/'
		}
	},

	LANDSCAPE: 'LANDSCAPE',
	PORTRAIT: 'PORTRAIT',

	MEDIA_GLOBAL_W: 1920,
	MEDIA_GLOBAL_H: 1080,

	GLOBAL_FONT_SIZE: 16,

	MIN_MIDDLE_W: 960,
	MQ_XSMALL: 320,
	MQ_SMALL: 480,
	MQ_MEDIUM: 768,
	MQ_LARGE: 1024,
	MQ_XLARGE: 1280,
	MQ_XXLARGE: 1680
};
module.exports = exports['default'];

},{}],48:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _flux = require('flux');

var _flux2 = _interopRequireDefault(_flux);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var AppDispatcher = (0, _objectAssign2['default'])(new _flux2['default'].Dispatcher(), {
	handleViewAction: function handleViewAction(action) {
		this.dispatch({
			source: 'VIEW_ACTION',
			action: action
		});
	}
});

exports['default'] = AppDispatcher;
module.exports = exports['default'];

},{"flux":1,"object-assign":"object-assign"}],49:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"1":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "		\n		<div id=\"mobile-menu\">\n			<a href=\"http://www.camper.com/\" target=\"_blank\" class=\"logo\">\n				<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 136.013 49.375\" enable-background=\"new 0 0 136.013 49.375\" xml:space=\"preserve\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M82.141,8.002h3.354c1.213,0,1.717,0.499,1.717,1.725v7.137c0,1.231-0.501,1.736-1.705,1.736h-3.365V8.002z M82.523,24.617v8.426l-7.087-0.384V1.925H87.39c3.292,0,5.96,2.705,5.96,6.044v10.604c0,3.338-2.668,6.044-5.96,6.044H82.523z M33.491,7.913c-1.132,0-2.048,1.065-2.048,2.379v11.256h4.409V10.292c0-1.314-0.917-2.379-2.047-2.379H33.491z M32.994,0.974h1.308c4.702,0,8.514,3.866,8.514,8.634v25.224l-6.963,1.273v-7.848h-4.409l0.012,8.787l-6.974,2.018V9.608C24.481,4.839,28.292,0.974,32.994,0.974 M121.933,7.921h3.423c1.215,0,1.718,0.497,1.718,1.724v8.194c0,1.232-0.502,1.736-1.705,1.736h-3.436V7.921z M133.718,31.055v17.487l-6.906-3.368V31.591c0-4.92-4.588-5.08-4.588-5.08v16.774l-6.983-2.914V1.925h12.231c3.291,0,5.959,2.705,5.959,6.044v11.077c0,2.207-1.217,4.153-2.991,5.115C131.761,24.894,133.718,27.077,133.718,31.055 M10.809,0.833c-4.703,0-8.514,3.866-8.514,8.634v27.936c0,4.769,4.019,8.634,8.722,8.634l1.306-0.085c5.655-1.063,8.306-4.639,8.306-9.407v-8.94h-6.996v8.736c0,1.409-0.064,2.65-1.994,2.992c-1.231,0.219-2.417-0.816-2.417-2.132V10.151c0-1.314,0.917-2.381,2.047-2.381h0.315c1.13,0,2.048,1.067,2.048,2.381v8.464h6.996V9.467c0-4.768-3.812-8.634-8.514-8.634H10.809 M103.953,23.162h6.977v-6.744h-6.977V8.423l7.676-0.002V1.924H96.72v33.278c0,0,5.225,1.141,7.532,1.666c1.517,0.346,7.752,2.253,7.752,2.253v-7.015l-8.051-1.508V23.162z M46.879,1.927l0.003,32.35l7.123-0.895V18.985l5.126,10.426l5.126-10.484l0.002,13.664l7.022-0.054V1.895h-7.545L59.13,14.6L54.661,1.927H46.879z\"/></svg>\n			</a>\n			<div class=\"burger btn\">\n				<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 61.564 49.356\" enable-background=\"new 0 0 61.564 49.356\" xml:space=\"preserve\"><g><path d=\"M4.564,8.006c1.443,0,2.682-0.854,3.266-2.077h19.648c0.584,1.223,1.823,2.077,3.267,2.077c1.444,0,2.683-0.854,3.266-2.077h19.649c0.583,1.223,1.821,2.077,3.266,2.077c0.013,0,0.025-0.003,0.039-0.003c0.012,0,0.023,0.003,0.035,0.003c0.243,0,0.481-0.023,0.714-0.069c0.696-0.138,1.338-0.479,1.853-0.993c1.414-1.414,1.414-3.715-0.001-5.131c-0.411-0.411-0.917-0.683-1.457-0.848c-0.372-0.129-0.767-0.214-1.183-0.214c-1.443,0-2.682,0.853-3.266,2.076H34.011c-0.584-1.223-1.822-2.076-3.266-2.076s-2.682,0.853-3.267,2.076H7.83C7.247,1.603,6.007,0.75,4.564,0.75c-2.001,0-3.629,1.627-3.629,3.627C0.936,6.378,2.563,8.006,4.564,8.006z\"/><path d=\"M4.564,28.168c1.443,0,2.682-0.854,3.266-2.076h19.649c0.584,1.223,1.823,2.076,3.267,2.076s2.682-0.854,3.266-2.076h19.649c0.584,1.223,1.822,2.076,3.266,2.076c0.012,0,0.024-0.004,0.037-0.004c0.012,0,0.024,0.004,0.037,0.004c0.243,0,0.481-0.023,0.714-0.07c0.696-0.137,1.338-0.478,1.853-0.992c0.176-0.175,0.329-0.365,0.462-0.568c0.004-0.006,0.006-0.012,0.01-0.018c0.383-0.584,0.59-1.265,0.59-1.979c0-0.702-0.203-1.371-0.573-1.948c-0.01-0.016-0.016-0.034-0.027-0.051c-0.133-0.202-0.286-0.392-0.462-0.567c-0.686-0.685-1.597-1.062-2.565-1.062c-0.013,0-0.025,0.003-0.037,0.003c-0.013,0-0.025-0.003-0.037-0.003c-1.444,0-2.683,0.853-3.266,2.076H34.011c-0.583-1.223-1.821-2.076-3.266-2.076c-1.443,0-2.683,0.853-3.267,2.076H7.831c-0.584-1.223-1.823-2.076-3.266-2.076c-2.001,0-3.629,1.627-3.629,3.627S2.563,28.168,4.564,28.168z\"/><path d=\"M57,41.351c-0.013,0-0.025,0.004-0.037,0.004c-0.013,0-0.025-0.004-0.037-0.004c-1.443,0-2.682,0.853-3.266,2.075H34.011c-0.584-1.223-1.822-2.075-3.266-2.075s-2.682,0.853-3.267,2.075H7.83c-0.583-1.223-1.823-2.075-3.266-2.075c-2.001,0-3.629,1.627-3.629,3.626c0,2.001,1.628,3.629,3.629,3.629c1.443,0,2.683-0.854,3.266-2.077h19.648c0.584,1.223,1.823,2.077,3.267,2.077c1.444,0,2.683-0.854,3.266-2.077h19.649c0.583,1.223,1.821,2.077,3.266,2.077c0.012,0,0.024-0.004,0.037-0.004c0.012,0,0.024,0.004,0.037,0.004c0.243,0,0.481-0.023,0.714-0.07c0.697-0.138,1.339-0.479,1.853-0.992c1.414-1.414,1.414-3.717-0.001-5.131C58.88,41.728,57.969,41.351,57,41.351z\"/></g></svg>\n			</div>\n			<div class=\"menu-slider\">\n				<ul class='main-menu'>\n"
    + ((stack1 = helpers.each.call(depth0,(depth0 != null ? depth0.mobileMenu : depth0),{"name":"each","hash":{},"fn":this.program(2, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "				</ul>\n				<ul class='social-menu'>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias3(((helper = (helper = helpers.facebookUrl || (depth0 != null ? depth0.facebookUrl : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"facebookUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.001,0.167c-8.745,0-15.834,7.09-15.834,15.834c0,8.745,7.089,15.835,15.834,15.835c8.745,0,15.834-7.09,15.834-15.835C31.836,7.257,24.746,0.167,16.001,0.167 M19.498,13.32l-0.184,2.369h-2.427v8.229h-3.068v-8.229h-1.638V13.32h1.638v-1.592c0-0.701,0.017-1.782,0.527-2.453c0.536-0.709,1.273-1.191,2.541-1.191c2.066,0,2.935,0.295,2.935,0.295l-0.41,2.425c0,0-0.682-0.196-1.318-0.196c-0.637,0-1.207,0.227-1.207,0.863v1.85H19.498z\"/></svg>\n						</a>\n					</li>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias3(((helper = (helper = helpers.twitterUrl || (depth0 != null ? depth0.twitterUrl : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"twitterUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.002,0.167c-8.746,0-15.835,7.09-15.835,15.834c0,8.746,7.089,15.835,15.835,15.835c8.745,0,15.834-7.089,15.834-15.835C31.836,7.257,24.747,0.167,16.002,0.167 M22.322,13.539c0.007,0.138,0.009,0.279,0.009,0.42c0,4.302-3.272,9.259-9.259,9.259c-1.837,0-3.547-0.539-4.987-1.461c0.253,0.031,0.514,0.044,0.776,0.044c1.525,0,2.928-0.52,4.042-1.394c-1.424-0.023-2.625-0.965-3.039-2.258c0.198,0.037,0.402,0.058,0.611,0.058c0.298,0,0.585-0.038,0.858-0.115c-1.489-0.297-2.612-1.612-2.612-3.189v-0.041c0.44,0.242,0.942,0.389,1.475,0.407c-0.873-0.585-1.447-1.581-1.447-2.709c0-0.597,0.16-1.155,0.441-1.638c1.605,1.97,4.003,3.264,6.708,3.4c-0.057-0.238-0.085-0.485-0.085-0.74c0-1.797,1.458-3.254,3.254-3.254c0.937,0,1.783,0.395,2.375,1.028c0.742-0.146,1.438-0.417,2.067-0.789c-0.242,0.759-0.759,1.396-1.432,1.799c0.658-0.079,1.286-0.253,1.869-0.511C23.511,12.507,22.959,13.079,22.322,13.539\"/></svg>\n						</a>\n					</li>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias3(((helper = (helper = helpers.instagramUrl || (depth0 != null ? depth0.instagramUrl : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"instagramUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M19.413,12.602l-0.009-2.686l2.685-0.008v2.684L19.413,12.602z M16.004,18.788c1.536,0,2.787-1.25,2.787-2.787c0-0.605-0.196-1.166-0.528-1.624c-0.507-0.703-1.329-1.163-2.259-1.163c-0.931,0-1.753,0.46-2.26,1.163c-0.33,0.458-0.527,1.019-0.527,1.624C13.217,17.538,14.467,18.788,16.004,18.788z M20.333,16.001c0,2.387-1.942,4.33-4.329,4.33c-2.388,0-4.329-1.943-4.329-4.33c0-0.575,0.114-1.123,0.318-1.624H9.629v6.481c0,0.836,0.681,1.518,1.518,1.518h9.714c0.837,0,1.517-0.682,1.517-1.518v-6.481h-2.363C20.217,14.878,20.333,15.426,20.333,16.001z M31.836,16.001c0,8.744-7.09,15.835-15.835,15.835S0.167,24.745,0.167,16.001c0-8.745,7.089-15.834,15.834-15.834S31.836,7.256,31.836,16.001z M23.921,11.144c0-1.688-1.373-3.06-3.062-3.06h-9.713c-1.687,0-3.06,1.371-3.06,3.06v9.714c0,1.688,1.373,3.06,3.06,3.06h9.713c1.688,0,3.062-1.372,3.062-3.06V11.144z\"/></svg>\n						</a>\n					</li>\n				</ul>\n			</div>\n		</div>\n\n";
},"2":function(depth0,helpers,partials,data) {
    var helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "						<li id='"
    + alias3(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"id","hash":{},"data":data}) : helper)))
    + "'><a target=\"_blank\" href='"
    + alias3(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"url","hash":{},"data":data}) : helper)))
    + "'>"
    + alias3(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"name","hash":{},"data":data}) : helper)))
    + "</a></li>\n";
},"4":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=this.lambda, alias2=this.escapeExpression, alias3=helpers.helperMissing, alias4="function";

  return "\n		<header id=\"header\">\n			<a href=\"http://www.camper.com/\" target=\"_blank\" class=\"logo\">\n				<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 136.013 49.375\" enable-background=\"new 0 0 136.013 49.375\" xml:space=\"preserve\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M82.141,8.002h3.354c1.213,0,1.717,0.499,1.717,1.725v7.137c0,1.231-0.501,1.736-1.705,1.736h-3.365V8.002z M82.523,24.617v8.426l-7.087-0.384V1.925H87.39c3.292,0,5.96,2.705,5.96,6.044v10.604c0,3.338-2.668,6.044-5.96,6.044H82.523z M33.491,7.913c-1.132,0-2.048,1.065-2.048,2.379v11.256h4.409V10.292c0-1.314-0.917-2.379-2.047-2.379H33.491z M32.994,0.974h1.308c4.702,0,8.514,3.866,8.514,8.634v25.224l-6.963,1.273v-7.848h-4.409l0.012,8.787l-6.974,2.018V9.608C24.481,4.839,28.292,0.974,32.994,0.974 M121.933,7.921h3.423c1.215,0,1.718,0.497,1.718,1.724v8.194c0,1.232-0.502,1.736-1.705,1.736h-3.436V7.921z M133.718,31.055v17.487l-6.906-3.368V31.591c0-4.92-4.588-5.08-4.588-5.08v16.774l-6.983-2.914V1.925h12.231c3.291,0,5.959,2.705,5.959,6.044v11.077c0,2.207-1.217,4.153-2.991,5.115C131.761,24.894,133.718,27.077,133.718,31.055 M10.809,0.833c-4.703,0-8.514,3.866-8.514,8.634v27.936c0,4.769,4.019,8.634,8.722,8.634l1.306-0.085c5.655-1.063,8.306-4.639,8.306-9.407v-8.94h-6.996v8.736c0,1.409-0.064,2.65-1.994,2.992c-1.231,0.219-2.417-0.816-2.417-2.132V10.151c0-1.314,0.917-2.381,2.047-2.381h0.315c1.13,0,2.048,1.067,2.048,2.381v8.464h6.996V9.467c0-4.768-3.812-8.634-8.514-8.634H10.809 M103.953,23.162h6.977v-6.744h-6.977V8.423l7.676-0.002V1.924H96.72v33.278c0,0,5.225,1.141,7.532,1.666c1.517,0.346,7.752,2.253,7.752,2.253v-7.015l-8.051-1.508V23.162z M46.879,1.927l0.003,32.35l7.123-0.895V18.985l5.126,10.426l5.126-10.484l0.002,13.664l7.022-0.054V1.895h-7.545L59.13,14.6L54.661,1.927H46.879z\"/></svg>\n			</a>\n			<div class=\"home-btn\"><a href=\"#!/landing\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.home_txt : stack1), depth0))
    + "</a></div>\n			<div class=\"play-xp-btn btn\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.play_txt : stack1), depth0))
    + "</div>\n			<div class=\"camper-lab\"><a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.labUrl || (depth0 != null ? depth0.labUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"labUrl","hash":{},"data":data}) : helper)))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.camper_lab : stack1), depth0))
    + "</a></div>\n			<div class=\"shop-wrapper btn\">\n				<div class=\"shop-title\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_title : stack1), depth0))
    + "</div>\n				<ul class=\"submenu-wrapper\">\n					<li class=\"sub-0\"><a target=\"_blank\" href='"
    + alias2(((helper = (helper = helpers.menShopUrl || (depth0 != null ? depth0.menShopUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"menShopUrl","hash":{},"data":data}) : helper)))
    + "'>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_men : stack1), depth0))
    + "</a></li>\n					<li class=\"sub-1\"><a target=\"_blank\" href='"
    + alias2(((helper = (helper = helpers.womenShopUrl || (depth0 != null ? depth0.womenShopUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"womenShopUrl","hash":{},"data":data}) : helper)))
    + "'>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_women : stack1), depth0))
    + "</a></li>\n				</ul>\n			</div>\n		</header>\n		<footer id=\"footer\" class=\"btn\">\n			<div class=\"mute\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.mute_txt : stack1), depth0))
    + "</div>\n			<div id=\"social-wrapper\">\n				<div class=\"social-title\">SOCIAL</div>\n				<ul>\n					<li class='facebook'>\n						<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.facebookUrl || (depth0 != null ? depth0.facebookUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"facebookUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.001,0.167c-8.745,0-15.834,7.09-15.834,15.834c0,8.745,7.089,15.835,15.834,15.835c8.745,0,15.834-7.09,15.834-15.835C31.836,7.257,24.746,0.167,16.001,0.167 M19.498,13.32l-0.184,2.369h-2.427v8.229h-3.068v-8.229h-1.638V13.32h1.638v-1.592c0-0.701,0.017-1.782,0.527-2.453c0.536-0.709,1.273-1.191,2.541-1.191c2.066,0,2.935,0.295,2.935,0.295l-0.41,2.425c0,0-0.682-0.196-1.318-0.196c-0.637,0-1.207,0.227-1.207,0.863v1.85H19.498z\"/></svg>\n						</a>\n					</li>\n					<li class='twitter'>\n						<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.twitterUrl || (depth0 != null ? depth0.twitterUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"twitterUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.002,0.167c-8.746,0-15.835,7.09-15.835,15.834c0,8.746,7.089,15.835,15.835,15.835c8.745,0,15.834-7.089,15.834-15.835C31.836,7.257,24.747,0.167,16.002,0.167 M22.322,13.539c0.007,0.138,0.009,0.279,0.009,0.42c0,4.302-3.272,9.259-9.259,9.259c-1.837,0-3.547-0.539-4.987-1.461c0.253,0.031,0.514,0.044,0.776,0.044c1.525,0,2.928-0.52,4.042-1.394c-1.424-0.023-2.625-0.965-3.039-2.258c0.198,0.037,0.402,0.058,0.611,0.058c0.298,0,0.585-0.038,0.858-0.115c-1.489-0.297-2.612-1.612-2.612-3.189v-0.041c0.44,0.242,0.942,0.389,1.475,0.407c-0.873-0.585-1.447-1.581-1.447-2.709c0-0.597,0.16-1.155,0.441-1.638c1.605,1.97,4.003,3.264,6.708,3.4c-0.057-0.238-0.085-0.485-0.085-0.74c0-1.797,1.458-3.254,3.254-3.254c0.937,0,1.783,0.395,2.375,1.028c0.742-0.146,1.438-0.417,2.067-0.789c-0.242,0.759-0.759,1.396-1.432,1.799c0.658-0.079,1.286-0.253,1.869-0.511C23.511,12.507,22.959,13.079,22.322,13.539\"/></svg>\n						</a>\n					</li>\n					<li class='instagram'>\n						<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.instagramUrl || (depth0 != null ? depth0.instagramUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"instagramUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M19.413,12.602l-0.009-2.686l2.685-0.008v2.684L19.413,12.602z M16.004,18.788c1.536,0,2.787-1.25,2.787-2.787c0-0.605-0.196-1.166-0.528-1.624c-0.507-0.703-1.329-1.163-2.259-1.163c-0.931,0-1.753,0.46-2.26,1.163c-0.33,0.458-0.527,1.019-0.527,1.624C13.217,17.538,14.467,18.788,16.004,18.788z M20.333,16.001c0,2.387-1.942,4.33-4.329,4.33c-2.388,0-4.329-1.943-4.329-4.33c0-0.575,0.114-1.123,0.318-1.624H9.629v6.481c0,0.836,0.681,1.518,1.518,1.518h9.714c0.837,0,1.517-0.682,1.517-1.518v-6.481h-2.363C20.217,14.878,20.333,15.426,20.333,16.001z M31.836,16.001c0,8.744-7.09,15.835-15.835,15.835S0.167,24.745,0.167,16.001c0-8.745,7.089-15.834,15.834-15.834S31.836,7.256,31.836,16.001z M23.921,11.144c0-1.688-1.373-3.06-3.062-3.06h-9.713c-1.687,0-3.06,1.371-3.06,3.06v9.714c0,1.688,1.373,3.06,3.06,3.06h9.713c1.688,0,3.062-1.372,3.062-3.06V11.144z\"/></svg>\n						</a>\n					</li>\n				</ul>\n			</div>\n		</footer>\n\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return "<div>\n\n\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.isMobile : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.program(4, data, 0),"data":data})) != null ? stack1 : "")
    + "\n</div>";
},"useData":true});

},{"hbsfy/runtime":12}],50:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div id='pages-container'>\n	<div id='page-a'></div>\n	<div id='page-b'></div>\n</div>";
},"useData":true});

},{"hbsfy/runtime":12}],51:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"1":function(depth0,helpers,partials,data) {
    return "\n";
},"3":function(depth0,helpers,partials,data) {
    return "		<div id=\"scrollbar-view\">\n			<div class=\"relative\">\n				<div class=\"scroll-grab btn\"></div>\n				<div class=\"scroll-bg btn\"></div>\n			</div>\n		</div>\n";
},"5":function(depth0,helpers,partials,data) {
    return "";
},"7":function(depth0,helpers,partials,data) {
    return "							<svg>\n								<circle class=\"around\" />\n								<circle class=\"knot\" />\n								<circle class=\"knot\" />\n								<circle class=\"knot\" />\n								<line class=\"line\"/>\n								<line class=\"line\"/>\n							</svg>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "<div class='page-wrapper'>\n	\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.isMobile : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "\n\n\n	<div class=\"interface absolute\">\n		\n		<div class=\"down-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n\n		<div class=\"slideshow-title\">\n			<div class=\"planet-title\"></div>\n			<div class=\"planet-name\"></div>\n		</div>\n\n		<div class=\"compasses-texts-wrapper\"></div>\n		\n		<a href=\"#\" target=\"_blank\" class=\"buy-btn btn\">\n			<div class=\"dots-rectangle-btn btn\">\n				<div class=\"btn-title\"></div>\n				<svg>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\"/>\n					<line class=\"line\"/>\n					<line class=\"line\" />\n					<line class=\"line\" />\n				</svg>\n			</div>\n			<div class=\"product-title-wrapper\">\n				<div class=\"product-title title-a\"></div>\n				<div class=\"product-title title-b\"></div>\n			</div>\n		</a>\n\n		<div class=\"go-experience-btn dots-rectangle-btn btn\">\n			<div class=\"btn-title\"></div>\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n\n		<div class=\"product-containers-wrapper\">\n			<div class=\"product-container product-container-a\">\n				<div class=\"poster-wrapper\">\n					<div class=\"spinner-img spinner-wrapper\">\n						<svg width=\"100%\" viewBox=\"0 0 300 300\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n							<path d=\"M 150,0 a 150,150 0 0,1 106.066,256.066 l -35.355,-35.355 a -100,-100 0 0,0 -70.711,-170.711 z\" fill=\"#76f19a\">\n							</path>\n						</svg>\n					</div>\n					<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n				</div>\n				<div class=\"video-wrapper btn\">\n					<div class=\"play-btn\">\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.isOldIE : depth0),{"name":"if","hash":{},"fn":this.program(5, data, 0),"inverse":this.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "					</div>\n					<div class=\"video-container btn\"></div>\n				</div>\n			</div>\n			<div class=\"product-container product-container-b\">\n				<div class=\"poster-wrapper\">\n					<div class=\"spinner-img spinner-wrapper\">\n						<svg width=\"100%\" viewBox=\"0 0 300 300\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n							<path d=\"M 150,0 a 150,150 0 0,1 106.066,256.066 l -35.355,-35.355 a -100,-100 0 0,0 -70.711,-170.711 z\" fill=\"#76f19a\">\n							</path>\n						</svg>\n					</div>\n					<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n				</div>\n				<div class=\"video-wrapper btn\">\n					<div class=\"play-btn\">\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.isOldIE : depth0),{"name":"if","hash":{},"fn":this.program(5, data, 0),"inverse":this.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "					</div>\n					<div class=\"video-container btn\"></div>\n				</div>\n			</div>\n		</div>\n	</div>\n\n	<div class=\"interface fixed\">\n		<div class=\"previous-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"next-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n	</div>\n\n</div>";
},"useData":true});

},{"hbsfy/runtime":12}],52:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class='page-wrapper'>\n	<div id=\"cta-container\">\n		<div class=\"cta-text-wrapper\">\n			<div class=\"cta-text\"></div>\n			<div class=\"headphone-icon\">\n				<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 70.039 58.834\">\n				<path fill=\"#FFFFFF\" d=\"M42.67,2.876c0-1.312-1.063-2.376-2.376-2.376c-1.312,0-2.376,1.063-2.376,2.376\n					c0,0.16,0.017,0.316,0.047,0.467l-13.522,12.17c-0.324-0.165-0.686-0.268-1.075-0.268c-1.053,0-1.936,0.69-2.248,1.639H4.71\n					c-0.434-0.47-1.05-0.768-1.739-0.768c-1.312,0-2.376,1.063-2.376,2.375c0,0.809,0.405,1.521,1.022,1.949v19.502\n					C1,40.371,0.595,41.082,0.595,41.891c0,1.313,1.063,2.377,2.376,2.377c1.122,0,2.056-0.779,2.305-1.826h15.787\n					c0.249,1.047,1.184,1.826,2.306,1.826c0.458,0,0.881-0.136,1.245-0.36l13.349,11.62c-0.025,0.14-0.043,0.283-0.043,0.431\n					c0,1.312,1.064,2.376,2.376,2.376c1.312,0,2.376-1.063,2.376-2.376c0-1.089-0.736-1.996-1.734-2.277V5.153\n					C41.935,4.871,42.67,3.964,42.67,2.876z M38.971,53.799L25.708,42.254c0.018-0.119,0.036-0.238,0.036-0.363\n					c0-1.312-1.063-2.376-2.375-2.376c-0.78,0-1.466,0.381-1.899,0.961H4.87c-0.315-0.421-0.764-0.731-1.287-0.871V20.778\n					c0.9-0.241,1.585-0.992,1.728-1.929h16.033c0.417,0.686,1.164,1.147,2.024,1.147c1.312,0,2.375-1.063,2.375-2.376\n					c0-0.196-0.03-0.384-0.075-0.566L38.971,5.083V53.799z M50.767,20.815h1.966v16.711h-1.966V20.815z M59.614,12.952h1.966v32.438\n					h-1.966V12.952z M69.444,2.139v54.065h-1.966V2.139H69.444z\"/>\n				</svg>\n			</div>\n		</div>\n		<div class=\"background\"></div>\n	</div>\n	<div class=\"dots-rectangle-btn btn\">\n		<div class=\"btn-title\"></div>\n		<svg>\n			<circle class=\"knot\" />\n			<circle class=\"knot\" />\n			<circle class=\"knot\" />\n			<circle class=\"knot\" />\n			<line class=\"line\"/>\n			<line class=\"line\"/>\n			<line class=\"line\" />\n			<line class=\"line\" />\n		</svg>\n	</div>\n	<div class=\"interface fixed\">\n		<div class=\"previous-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"next-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n	</div>\n</div>";
},"useData":true});

},{"hbsfy/runtime":12}],53:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"1":function(depth0,helpers,partials,data) {
    var stack1;

  return "	\n		<ul class='planets-menu'>\n"
    + ((stack1 = helpers.each.call(depth0,(depth0 != null ? depth0.mobileScope : depth0),{"name":"each","hash":{},"fn":this.program(2, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "		</ul>\n\n";
},"2":function(depth0,helpers,partials,data) {
    var helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "				<li id='"
    + alias3(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"id","hash":{},"data":data}) : helper)))
    + "'>\n					<a href='"
    + alias3(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"url","hash":{},"data":data}) : helper)))
    + "'>\n						<div class=\"img-wrapper\">\n							<img src=\""
    + alias3(((helper = (helper = helpers.imgsrc || (depth0 != null ? depth0.imgsrc : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"imgsrc","hash":{},"data":data}) : helper)))
    + "\" alt=\""
    + alias3(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"id","hash":{},"data":data}) : helper)))
    + "\">\n						</div>\n					</a>\n				</li>\n";
},"4":function(depth0,helpers,partials,data) {
    return "\n		<div class=\"slideshow-title\">\n			<div class=\"planet-title\"></div>\n			<div class=\"planet-name\"></div>\n		</div>\n		<div class=\"interface\">\n\n			<div id=\"left\" class=\"previous-area area-btn\"></div>\n			<div id=\"right\" class=\"next-area area-btn\"></div>\n			<div id=\"middle\" class=\"middle-area area-btn\"></div>\n\n			<div class=\"previous-btn dots-arrow-btn\">\n				<svg>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\"/>\n					<line class=\"line\"/>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\" />\n					<line class=\"line\" />\n				</svg>\n			</div>\n			<div class=\"next-btn dots-arrow-btn\">\n				<svg>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\"/>\n					<line class=\"line\"/>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\" />\n					<line class=\"line\" />\n				</svg>\n			</div>\n		</div>\n\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return "<div class='page-wrapper'>\n\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.isMobile : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.program(4, data, 0),"data":data})) != null ? stack1 : "")
    + "\n</div>";
},"useData":true});

},{"hbsfy/runtime":12}],54:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var GlobalEvents = (function () {
	function GlobalEvents() {
		_classCallCheck(this, GlobalEvents);
	}

	_createClass(GlobalEvents, [{
		key: 'init',
		value: function init() {
			$(window).on('resize', this.resize);
			$(window).on('mousemove', this.onMouseMove);
			_AppStore2['default'].Mouse = _AppStore2['default'].Detector.oldIE ? { x: 0, y: 0 } : new PIXI.Point();
		}
	}, {
		key: 'resize',
		value: function resize() {
			_AppActions2['default'].windowResize($(window).innerWidth(), $(window).innerHeight());
		}
	}, {
		key: 'onMouseMove',
		value: function onMouseMove(e) {
			e.preventDefault();
			_AppStore2['default'].Mouse.x = e.pageX;
			_AppStore2['default'].Mouse.y = e.pageY;
		}
	}]);

	return GlobalEvents;
})();

exports['default'] = GlobalEvents;
module.exports = exports['default'];

},{"./../actions/AppActions":17,"./../stores/AppStore":60}],55:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _SpringGarden = require('./../components/SpringGarden');

var _SpringGarden2 = _interopRequireDefault(_SpringGarden);

var Pool = (function () {
	function Pool() {
		_classCallCheck(this, Pool);

		var planets = _AppStore2['default'].planets();
		var pxContainerNum = 50 + planets.length * 1;
		var graphicsNum = planets.length * 3 - 2;
		// var spritesNum = planets.length + (3*2) + (8*4) + 40
		var springGardensNum = 12;

		if (!_AppStore2['default'].Detector.oldIE) {
			var op = window.ObjectPool;
			this.timelines = op.generate(TimelineMax, { count: 20 });
			this.pxContainers = op.generate(PIXI.Container, { count: pxContainerNum });
			this.graphics = op.generate(PIXI.Graphics, { count: graphicsNum });
			// this.sprites = op.generate(PIXI.Sprite, { count: spritesNum })
			this.springGardens = op.generate(_SpringGarden2['default'], { count: springGardensNum });
		}
	}

	_createClass(Pool, [{
		key: 'getTimeline',
		value: function getTimeline() {
			var tl = _AppStore2['default'].Detector.oldIE ? new TimelineMax() : this.timelines.get();
			tl.kill();
			tl.clear();
			return tl;
		}
	}, {
		key: 'releaseTimeline',
		value: function releaseTimeline(item) {
			item.kill();
			item.clear();
			if (!_AppStore2['default'].Detector.oldIE) {
				this.timelines.release(item);
			}
		}
	}, {
		key: 'getContainer',
		value: function getContainer() {
			if (_AppStore2['default'].Detector.oldIE) return;
			var container = this.pxContainers.get();
			container.scale.x = 1;
			container.scale.y = 1;
			container.position.x = 0;
			container.position.y = 0;
			container.x = 0;
			container.y = 0;
			container.pivot.x = 0;
			container.pivot.y = 0;
			container.rotation = 0;
			container.alpha = 1;
			container.blendMode = PIXI.BLEND_MODES.NORMAL;
			container.mask = null;
			container.filters = null;
			return container;
		}
	}, {
		key: 'releaseContainer',
		value: function releaseContainer(item) {
			if (_AppStore2['default'].Detector.oldIE) return;
			this.pxContainers.release(item);
		}
	}, {
		key: 'getGraphics',
		value: function getGraphics() {
			if (_AppStore2['default'].Detector.oldIE) return;
			var g = this.graphics.get();
			g.clear();
			g.scale.x = 1;
			g.scale.y = 1;
			g.position.x = 0;
			g.position.y = 0;
			g.pivot.x = 0;
			g.pivot.y = 0;
			g.rotation = 0;
			return g;
		}
	}, {
		key: 'releaseGraphics',
		value: function releaseGraphics(item) {
			if (_AppStore2['default'].Detector.oldIE) return;
			this.graphics.release(item);
		}
	}, {
		key: 'getSprite',
		value: function getSprite() {
			if (_AppStore2['default'].Detector.oldIE) return;
			// var sprite = this.sprites.get()
			// sprite.scale.x = 1
			// sprite.scale.y = 1
			// sprite.position.x = 0
			// sprite.position.y = 0
			// sprite.x = 0
			// sprite.y = 0
			// sprite.anchor.x = 0
			// sprite.anchor.y = 0
			// sprite.pivot.x = 0
			// sprite.pivot.y = 0
			// sprite.rotation = 0
			// sprite.alpha = 1
			// sprite.blendMode = PIXI.BLEND_MODES.NORMAL
			// sprite.filters = null
			// sprite.mask = null
			// 		sprite.shader = null
			// sprite.renderable = true
			// console.log('get >>>>>>>>>>>>>>>', sprite)
			return new PIXI.Sprite();
		}
	}, {
		key: 'releaseSprite',
		value: function releaseSprite(item) {
			if (_AppStore2['default'].Detector.oldIE) return;
			// console.log('release <<<<<<<<<<<<<<', item)
			// console.log(item.parent)
			if (item.parent != undefined) {
				item.parent.removeChild(item);
			}
			// if(item.texture.baseTexture != null) {

			// }
			// item.texture.baseTexture.dispose()
			item.destroy(true, true);
			// item.texture.baseTexture
			// item.scale.x = 1
			// item.scale.y = 1
			// item.position.x = 0
			// item.position.y = 0
			// item.x = 0
			// item.y = 0
			// item.anchor.x = 0
			// item.anchor.y = 0
			// item.pivot.x = 0
			// item.pivot.y = 0
			// item.rotation = 0
			// item.alpha = 1
			// item.blendMode = PIXI.BLEND_MODES.NORMAL
			// item.filters = null
			// item.mask = null
			// 		item.shader = null
			// 		item.renderable = false
			// item.texture.valid = false
			// 		item.texture.baseTexture.dispose()
			// 		// item.texture.destroy()
			// this.sprites.release(item)
		}
	}, {
		key: 'getSpringGarden',
		value: function getSpringGarden() {
			if (_AppStore2['default'].Detector.oldIE) return;
			return this.springGardens.get();
		}
	}, {
		key: 'releaseSpringGarden',
		value: function releaseSpringGarden(item) {
			if (_AppStore2['default'].Detector.oldIE) return;
			this.springGardens.release(item);
		}
	}]);

	return Pool;
})();

exports['default'] = Pool;
module.exports = exports['default'];

},{"./../components/SpringGarden":38,"./../stores/AppStore":60}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var Preloader = (function () {
	function Preloader() {
		_classCallCheck(this, Preloader);

		this.queue = new createjs.LoadQueue();
		createjs.Sound.alternateExtensions = ["mp3"];
		this.queue.installPlugin(createjs.Sound);
		this.queue.on("complete", this.onManifestLoadCompleted, this);
		this.currentLoadedCallback = undefined;
		this.allManifests = [];
	}

	_createClass(Preloader, [{
		key: "load",
		value: function load(manifest, onLoaded) {

			if (_AppStore2["default"].Detector.oldIE) {
				onLoaded();
				return;
			}

			if (this.allManifests.length > 0) {
				for (var i = 0; i < this.allManifests.length; i++) {
					var m = this.allManifests[i];
					if (m.length == manifest.length && m[0].id == manifest[0].id && m[m.length - 1].id == manifest[manifest.length - 1].id) {
						onLoaded();
						return;
					}
				};
			}

			this.allManifests.push(manifest);
			this.currentLoadedCallback = onLoaded;
			this.queue.loadManifest(manifest);
		}
	}, {
		key: "onManifestLoadCompleted",
		value: function onManifestLoadCompleted() {
			this.currentLoadedCallback();
		}
	}, {
		key: "getContentById",
		value: function getContentById(id) {
			return this.queue.getResult(id);
		}
	}, {
		key: "getSvg",
		value: function getSvg(id) {
			return this.getContentById(id + "-svg");
		}
	}, {
		key: "getImageURL",
		value: function getImageURL(id) {
			return this.getContentById(id).getAttribute("src");
		}
	}]);

	return Preloader;
})();

exports["default"] = Preloader;
module.exports = exports["default"];

},{"./../stores/AppStore":60}],57:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _GlobalData = require('./../../../../www/data/data');

var _GlobalData2 = _interopRequireDefault(_GlobalData);

var _hasher = require('hasher');

var _hasher2 = _interopRequireDefault(_hasher);

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var _crossroads = require('crossroads');

var _crossroads2 = _interopRequireDefault(_crossroads);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var Router = (function () {
	function Router() {
		_classCallCheck(this, Router);
	}

	_createClass(Router, [{
		key: 'init',
		value: function init() {
			this.routing = _GlobalData2['default'].routing;
			this.defaultRoute = this.routing['/'];
			this.newHashFounded = false;
			_hasher2['default'].newHash = undefined;
			_hasher2['default'].oldHash = undefined;
			_hasher2['default'].prependHash = '!';
			var hash = window.location.hash.split('?');
			window.location.hash = hash[0];
			_hasher2['default'].initialized.add(this._didHasherChange.bind(this));
			_hasher2['default'].changed.add(this._didHasherChange.bind(this));
			this._setupCrossroads();
		}
	}, {
		key: 'beginRouting',
		value: function beginRouting() {
			_hasher2['default'].init();
		}
	}, {
		key: '_setupCrossroads',
		value: function _setupCrossroads() {
			var planets = _AppStore2['default'].planets();
			var basicSection = _crossroads2['default'].addRoute('{page}', this._onFirstDegreeURLHandler.bind(this), 3);
			basicSection.rules = {
				page: ['landing']
			};
			var planetProductSection = _crossroads2['default'].addRoute('/planet/{planetId}/{productId}', this._onPlanetProductURLHandler.bind(this), 2);
			planetProductSection.rules = {
				planetId: planets,
				productId: /^[0-6]/
			};
			var planetSection = _crossroads2['default'].addRoute('/planet/{planetId}', this._onPlanetURLHandler.bind(this), 2);
			planetSection.rules = {
				planetId: planets
			};
		}
	}, {
		key: '_onFirstDegreeURLHandler',
		value: function _onFirstDegreeURLHandler(pageId) {
			this._assignRoute(pageId);
		}
	}, {
		key: '_onPlanetProductURLHandler',
		value: function _onPlanetProductURLHandler(planetId, productId) {
			this._assignRoute(productId);
		}
	}, {
		key: '_onPlanetURLHandler',
		value: function _onPlanetURLHandler(planetId) {

			var isSupportWebGL = _AppStore2['default'].Detector.isSupportWebGL;

			if (_AppStore2['default'].Detector.isMobile || !isSupportWebGL) {
				var mobileUrl = '/planet/' + planetId + '/0';
				Router.setHash(mobileUrl);
				return;
			}

			this._assignRoute(planetId);
		}
	}, {
		key: '_onBlogPostURLHandler',
		value: function _onBlogPostURLHandler(postId) {
			this._assignRoute(postId);
		}
	}, {
		key: '_onDefaultURLHandler',
		value: function _onDefaultURLHandler() {
			this._sendToDefault();
		}
	}, {
		key: '_assignRoute',
		value: function _assignRoute(id) {
			var hash = _hasher2['default'].getHash();
			var parts = this._getURLParts(hash);
			this._updatePageRoute(hash, parts, parts[0], id);
			this.newHashFounded = true;
		}
	}, {
		key: '_getURLParts',
		value: function _getURLParts(url) {
			var hash = url;
			hash = hash.substr(1);
			return hash.split('/');
		}
	}, {
		key: '_updatePageRoute',
		value: function _updatePageRoute(hash, parts, parent, targetId) {
			_hasher2['default'].oldHash = _hasher2['default'].newHash;
			_hasher2['default'].newHash = {
				hash: hash,
				parts: parts,
				parent: parent,
				targetId: targetId
			};
			_AppActions2['default'].pageHasherChanged();
		}
	}, {
		key: '_didHasherChange',
		value: function _didHasherChange(newHash, oldHash) {
			this.newHashFounded = false;
			_crossroads2['default'].parse(newHash);
			if (this.newHashFounded) return;
			// If URL don't match a pattern, send to default
			this._onDefaultURLHandler();
		}
	}, {
		key: '_sendToDefault',
		value: function _sendToDefault() {
			_hasher2['default'].setHash(_AppStore2['default'].defaultRoute());
		}
	}], [{
		key: 'getBaseURL',
		value: function getBaseURL() {
			return document.URL.split("#")[0];
		}
	}, {
		key: 'getHash',
		value: function getHash() {
			return _hasher2['default'].getHash();
		}
	}, {
		key: 'getRoutes',
		value: function getRoutes() {
			return _GlobalData2['default'].routing;
		}
	}, {
		key: 'getNewHash',
		value: function getNewHash() {
			// console.log(hasher.newHash)
			return _hasher2['default'].newHash;
		}
	}, {
		key: 'getOldHash',
		value: function getOldHash() {
			return _hasher2['default'].oldHash;
		}
	}, {
		key: 'setHash',
		value: function setHash(hash) {
			_hasher2['default'].setHash(hash);
		}
	}]);

	return Router;
})();

exports['default'] = Router;
module.exports = exports['default'];

},{"./../../../../www/data/data":69,"./../actions/AppActions":17,"./../stores/AppStore":60,"crossroads":"crossroads","hasher":"hasher"}],58:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Sounds = (function () {
	function Sounds() {
		_classCallCheck(this, Sounds);

		this.isMute = false;
		this.activeIds = [];
		this.tweenVal = { val: 1 };
	}

	_createClass(Sounds, [{
		key: 'play',
		value: function play(id, params) {
			var parameters = params || {};
			parameters.volume = this.isMute ? 0 : 1;
			var sound = createjs.Sound.play(id, parameters);
			this.addedAsActive(id, sound);
		}
	}, {
		key: 'addedAsActive',
		value: function addedAsActive(id, sound) {
			var alreadyAdded = false;
			for (var i = 0; i < this.activeIds.length; i++) {
				var activeS = this.activeIds[i];
				if (activeS.id == id) {
					alreadyAdded = true;
				}
			}
			if (!alreadyAdded) {
				this.activeIds.push({
					id: id,
					sound: sound
				});
			}
		}
	}, {
		key: 'toggle',
		value: function toggle() {
			if (this.isMute) {
				this.unMuteAll();
				this.isMute = false;
			} else {
				this.muteAll();
				this.isMute = true;
			}
		}
	}, {
		key: 'muteAll',
		value: function muteAll() {
			var _this = this;

			TweenMax.fromTo(this.tweenVal, 0.5, { val: 1 }, { val: 0, ease: Linear.easeInOut, onUpdate: function onUpdate() {
					_this.updateAllSoundsParams('volume', _this.tweenVal.val);
				} });
		}
	}, {
		key: 'unMuteAll',
		value: function unMuteAll() {
			var _this2 = this;

			TweenMax.fromTo(this.tweenVal, 0.5, { val: 0 }, { val: 1, ease: Linear.easeInOut, onUpdate: function onUpdate() {
					_this2.updateAllSoundsParams('volume', _this2.tweenVal.val);
				} });
		}
	}, {
		key: 'updateAllSoundsParams',
		value: function updateAllSoundsParams(param, value) {
			for (var i = 0; i < this.activeIds.length; i++) {
				var activeS = this.activeIds[i];
				activeS.sound[param] = value;
			};
		}
	}, {
		key: 'stopSoundsByPlanetId',
		value: function stopSoundsByPlanetId(id) {
			var tempArray = [];
			for (var i = 0; i < this.activeIds.length; i++) {
				var activeS = this.activeIds[i];
				if (activeS.id.indexOf(id) >= 0) {
					activeS.sound.stop();
				} else {
					tempArray.push(activeS);
				}
			}
			this.activeIds = tempArray.slice(0);
		}
	}]);

	return Sounds;
})();

exports['default'] = Sounds;
module.exports = exports['default'];

},{}],59:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var TransitionAnimations = {

	// EXPERIENCE -------------------------------
	'experience-in': function experienceIn(scope, timeline) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var windowW = _AppStore2['default'].Window.w;
		var windowH = _AppStore2['default'].Window.h;

		switch (types.oldType) {
			case _AppConstants2['default'].LANDING:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				var direction = _AppStore2['default'].ChangePlanetFromDirection == _AppConstants2['default'].LEFT ? -1 : 1;
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { x: windowW * direction, ease: Expo.easeInOut }, { x: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { x: windowW * direction, ease: Expo.easeInOut }, { x: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
	},
	'experience-out': function experienceOut(scope, timeline) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var windowW = _AppStore2['default'].Window.w;
		var windowH = _AppStore2['default'].Window.h;

		switch (types.newType) {
			case _AppConstants2['default'].LANDING:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				var direction = _AppStore2['default'].ChangePlanetFromDirection == _AppConstants2['default'].LEFT ? -1 : 1;
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { x: 0, ease: Expo.easeInOut }, { x: -windowW * direction, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { x: 0, ease: Expo.easeInOut }, { x: -windowW * direction, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
	},

	// CAMPAIGN -------------------------------
	'campaign-in': function campaignIn(scope, timeline) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var windowH = _AppStore2['default'].Window.h;

		switch (types.oldType) {
			case _AppConstants2['default'].LANDING:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
	},
	'campaign-out': function campaignOut(scope, timeline) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var windowH = _AppStore2['default'].Window.h;

		switch (types.newType) {
			case _AppConstants2['default'].LANDING:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
	},

	// LANDING -------------------------------
	'landing-in': function landingIn(scope, timeline) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var windowH = _AppStore2['default'].Window.h;

		switch (types.oldType) {
			case _AppConstants2['default'].LANDING:
				break;
			case _AppConstants2['default'].EXPERIENCE:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				if (!_AppStore2['default'].Detector.oldIE) timeline.fromTo(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
	},
	'landing-out': function landingOut(scope, timeline) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var windowW = _AppStore2['default'].Window.w;
		var windowH = _AppStore2['default'].Window.h;

		switch (types.newType) {
			case _AppConstants2['default'].EXPERIENCE:
				if (!_AppStore2['default'].Detector.oldIE) timeline.to(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
				timeline.to(wrapper, 1, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				if (!_AppStore2['default'].Detector.oldIE) timeline.to(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
				timeline.to(wrapper, 1, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
	}
};

exports['default'] = TransitionAnimations;
module.exports = exports['default'];

},{"./../constants/AppConstants":47,"./../stores/AppStore":60}],60:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _AppDispatcher = require('./../dispatchers/AppDispatcher');

var _AppDispatcher2 = _interopRequireDefault(_AppDispatcher);

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _eventemitter2 = require('eventemitter2');

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _GlobalData = require('./../../../../www/data/data');

var _GlobalData2 = _interopRequireDefault(_GlobalData);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

function _getPageContent() {
    var scope = _getPageId();
    var langContent = _getContentByLang(AppStore.lang());
    var pageContent = langContent[scope];
    return pageContent;
}
function _getPageId() {
    return _getContentScope().id;
}
function _getTypeOfNewAndOldPage() {
    var newHasher = _Router2['default'].getNewHash();
    var oldHasher = _Router2['default'].getOldHash();
    return { newType: _getTypeOfPage(newHasher), oldType: _getTypeOfPage(oldHasher) };
}
function _getTypeOfPage(hash) {
    var h = hash || _Router2['default'].getNewHash();
    if (h == undefined) return _AppConstants2['default'].NONE;
    if (h.parts.length == 3) return _AppConstants2['default'].CAMPAIGN;else if (h.parts.length == 2) return _AppConstants2['default'].EXPERIENCE;else return _AppConstants2['default'].LANDING;
}
function _getContentScope() {
    var hashObj = _Router2['default'].getNewHash();
    var routeScope;
    if (hashObj.parts.length > 2) {
        var parentPath = hashObj.hash.replace('/' + hashObj.targetId, '');
        routeScope = AppStore.getRoutePathScopeById(parentPath);
    } else {
        routeScope = AppStore.getRoutePathScopeById(hashObj.hash);
    }
    return routeScope;
}
function _getPageAssetsToLoad() {
    var scope = _getContentScope();
    if (scope == undefined) return [];
    var hashObj = _Router2['default'].getNewHash();
    var targetId;
    var type = _getTypeOfPage();
    targetId = type.toLowerCase() + '-assets';
    var manifest = _addBasePathsToUrls(scope[targetId], scope.id, targetId, type);
    if (type == _AppConstants2['default'].EXPERIENCE) {
        var soundsManifest = _addSoundsBasePathsToUrls(scope['sounds-assets'], scope.id, 'sounds-assets', 'sounds');
        manifest = manifest.concat(soundsManifest);
    }
    return manifest;
}
function _addBasePathsToUrls(urls, pageId, targetId, type) {
    var basePath = _getPageAssetsBasePathById(pageId, targetId);
    var manifest = [];
    if (urls == undefined || urls.length < 1) return manifest;
    for (var i = 0; i < urls.length; i++) {
        var splitter = urls[i].split('.');
        var fileName = splitter[0];
        var extension = splitter[1];
        manifest[i] = {
            id: pageId + '-' + type.toLowerCase() + '-' + fileName,
            src: basePath + fileName + '.' + extension
        };
    }
    return manifest;
}
function _addSoundsBasePathsToUrls(urls, pageId, targetId, type) {
    var basePath = _getPageAssetsBasePathById(pageId, targetId);
    var manifest = [];
    if (urls == undefined || urls.length < 1) return manifest;
    for (var i = 0; i < urls.length; i++) {
        var splitter = urls[i].split('.');
        var fileName = splitter[0];
        var extension = 'ogg';
        manifest[i] = {
            id: pageId + '-' + type.toLowerCase() + '-' + fileName,
            src: basePath + fileName + '.' + extension
        };
    }
    return manifest;
}
function _getPageAssetsBasePathById(id, assetGroupId) {
    return AppStore.baseMediaPath() + 'image/planets/' + id + '/' + assetGroupId + '/';
}
function _getMenuContent() {
    return _GlobalData2['default'].menu;
}
function _getContentByLang(lang) {
    return _GlobalData2['default'].lang[lang];
}
function _getGeneralInfos() {
    return _GlobalData2['default'].infos.lang[AppStore.lang()];
}
function _getAppData() {
    return _GlobalData2['default'];
}
function _getDefaultRoute() {
    return _GlobalData2['default']['default-route'];
}
function _getGlobalContent() {
    var langContent = _getContentByLang(AppStore.lang());
    return langContent['global'];
}
function _windowWidthHeight() {
    return {
        w: window.innerWidth,
        h: window.innerHeight
    };
}
var AppStore = (0, _objectAssign2['default'])({}, _eventemitter2.EventEmitter2.prototype, {
    emitChange: function emitChange(type, item) {
        this.emit(type, item);
    },
    pageContent: function pageContent() {
        return _getPageContent();
    },
    menuContent: function menuContent() {
        return _getMenuContent();
    },
    countries: function countries() {
        return _GlobalData2['default'].countries;
    },
    appData: function appData() {
        return _getAppData();
    },
    lang: function lang() {
        var defaultLang = true;
        for (var i = 0; i < _GlobalData2['default'].langs.length; i++) {
            var lang = _GlobalData2['default'].langs[i];
            if (lang == JS_lang) {
                defaultLang = false;
            }
        };
        return defaultLang == true ? 'en' : JS_lang;
    },
    defaultRoute: function defaultRoute() {
        return _getDefaultRoute();
    },
    globalContent: function globalContent() {
        return _getGlobalContent();
    },
    generalInfos: function generalInfos() {
        return _GlobalData2['default'].infos;
    },
    randomSentence: function randomSentence() {
        var sentences = _GlobalData2['default'].sentences;
        var index = parseInt(_Utils2['default'].Rand(0, sentences.length - 1), 10);
        return sentences[index];
    },
    generalInfosLangScope: function generalInfosLangScope() {
        return _getGeneralInfos();
    },
    getEmptyImgUrl: function getEmptyImgUrl() {
        return AppStore.getEnvironment()['static'] + 'image/empty.png';
    },
    videoExtensionSupport: function videoExtensionSupport() {
        if (Modernizr.video) {
            if (Modernizr.video.h264) {
                return 'mp4';
            } else if (Modernizr.video.webm) {
                return 'webm';
            } else if (Modernizr.video.ogg) {
                return 'ogg';
            }
        }
    },
    mainImageUrl: function mainImageUrl(id, responsiveArray) {
        return AppStore.baseMediaPath() + 'image/planets/' + id + '/main-' + AppStore.responsiveImageWidth(responsiveArray) + '.jpg';
    },
    mainImageMapUrl: function mainImageMapUrl(id, responsiveArray) {
        return AppStore.baseMediaPath() + 'image/planets/' + id + '/main-map-' + AppStore.responsiveImageWidth(responsiveArray) + '.jpg';
    },
    baseMediaPath: function baseMediaPath() {
        return AppStore.getEnvironment()['static'];
    },
    getRoutePathScopeById: function getRoutePathScopeById(id) {
        return _GlobalData2['default'].routing[id];
    },
    getPageId: function getPageId() {
        return _getPageId();
    },
    getTypeOfNewAndOldPage: function getTypeOfNewAndOldPage() {
        return _getTypeOfNewAndOldPage();
    },
    getTypeOfPage: function getTypeOfPage(hash) {
        return _getTypeOfPage(hash);
    },
    getEnvironment: function getEnvironment() {
        return _AppConstants2['default'].ENVIRONMENTS[ENV];
    },
    getLineWidth: function getLineWidth() {
        return 2;
    },
    pageAssetsToLoad: function pageAssetsToLoad() {
        return _getPageAssetsToLoad();
    },
    getExperienceAnimationDirection: function getExperienceAnimationDirection() {
        var newHasher = _Router2['default'].getNewHash();
        var oldHasher = _Router2['default'].getOldHash();
        if (oldHasher == undefined) return _AppConstants2['default'].RIGHT;
        var newId = newHasher.targetId;
        var oldId = oldHasher.targetId;
        var newIndex, oldIndex;
        var planets = AppStore.planets();
        for (var i = 0; i < planets.length; i++) {
            var planet = planets[i];
            if (planet == newId) newIndex = i;
            if (planet == oldId) oldIndex = i;
        }
        return newIndex > oldIndex ? _AppConstants2['default'].RIGHT : _AppConstants2['default'].LEFT;
    },
    responsiveImageWidth: function responsiveImageWidth(responsiveArray) {
        var windowW = AppStore.Window.w == undefined ? $(window).innerWidth() : AppStore.Window.w;
        // var scale = (window.devicePixelRatio == undefined) ? 1 : window.devicePixelRatio
        var scale = 1;
        return _Utils2['default'].Closest(responsiveArray, windowW * scale);
    },
    responsiveImageSize: function responsiveImageSize(responsiveArray, baseWidth, baseHeight) {
        var baseW = baseWidth || _AppConstants2['default'].MEDIA_GLOBAL_W;
        var baseH = baseHeight || _AppConstants2['default'].MEDIA_GLOBAL_H;
        var responsiveWidth = AppStore.responsiveImageWidth(responsiveArray);
        var scale = responsiveWidth / baseW * 1;
        var responsiveHeight = baseH * scale;
        return [responsiveWidth, responsiveHeight];
    },
    responsivePosterImage: function responsivePosterImage() {
        var responsiveW = AppStore.responsiveImageWidth(_AppConstants2['default'].RESPONSIVE_IMAGE);
        switch (responsiveW) {
            case _AppConstants2['default'].RESPONSIVE_IMAGE[0]:
                return "L";
            case _AppConstants2['default'].RESPONSIVE_IMAGE[1]:
                return "M";
            case _AppConstants2['default'].RESPONSIVE_IMAGE[2]:
                return "S";
        }
    },
    planets: function planets() {
        return _GlobalData2['default'].planets;
    },
    getNextPlanet: function getNextPlanet(id) {
        var planets = AppStore.planets();
        var nextPlanetId;
        for (var i = 0; i < planets.length; i++) {
            var planet = planets[i];
            if (planet == id) {
                nextPlanetId = planets[i + 1];
            }
        };
        return nextPlanetId == undefined ? planets[0] : nextPlanetId;
    },
    getPreviousPlanet: function getPreviousPlanet(id) {
        var planets = AppStore.planets();
        var previousPlanetId;
        for (var i = 0; i < planets.length; i++) {
            var planet = planets[i];
            if (planet == id) {
                previousPlanetId = planets[i - 1];
            }
        };
        return previousPlanetId == undefined ? planets[planets.length - 1] : previousPlanetId;
    },
    elementsOfNature: function elementsOfNature() {
        return _GlobalData2['default'].elements;
    },
    allGender: function allGender() {
        return _GlobalData2['default'].gender;
    },
    productsData: function productsData() {
        return _GlobalData2['default']['products-data'];
    },
    productsDataById: function productsDataById(id) {
        var data = AppStore.productsData();
        return data[id];
    },
    paletteColorsById: function paletteColorsById(id) {
        return _GlobalData2['default']['colors'][id];
    },
    getSpecificProductById: function getSpecificProductById(planetId, productId) {
        var planetProducts = AppStore.productsDataById(planetId);
        for (var i = 0; i < planetProducts.length; i++) {
            if (productId == planetProducts[i].id) {
                return planetProducts[i];
            }
        }
    },
    Window: function Window() {
        return _windowWidthHeight();
    },
    addPXChild: function addPXChild(item) {
        if (AppStore.Detector.oldIE) return;
        AppStore.PXContainer.add(item.child);
    },
    removePXChild: function removePXChild(item) {
        if (AppStore.Detector.oldIE) return;
        AppStore.PXContainer.remove(item.child);
    },
    getTimeline: function getTimeline() {
        return AppStore.Pool.getTimeline();
    },
    releaseTimeline: function releaseTimeline(item) {
        return AppStore.Pool.releaseTimeline(item);
    },
    getContainer: function getContainer() {
        return AppStore.Pool.getContainer();
    },
    releaseContainer: function releaseContainer(item) {
        return AppStore.Pool.releaseContainer(item);
    },
    getGraphics: function getGraphics() {
        return AppStore.Pool.getGraphics();
    },
    releaseGraphics: function releaseGraphics(item) {
        return AppStore.Pool.releaseGraphics(item);
    },
    getSprite: function getSprite() {
        return AppStore.Pool.getSprite();
    },
    releaseSprite: function releaseSprite(item) {
        return AppStore.Pool.releaseSprite(item);
    },
    getSpringGarden: function getSpringGarden() {
        return AppStore.Pool.getSpringGarden();
    },
    releaseSpringGarden: function releaseSpringGarden(item) {
        return AppStore.Pool.releaseSpringGarden(item);
    },
    Detector: {
        isMobile: undefined
    },
    Pool: undefined,
    Preloader: undefined,
    Sounds: undefined,
    Mouse: undefined,
    PXContainer: undefined,
    Orientation: _AppConstants2['default'].LANDSCAPE,
    dispatcherIndex: _AppDispatcher2['default'].register(function (payload) {
        var action = payload.action;
        switch (action.actionType) {
            case _AppConstants2['default'].PAGE_HASHER_CHANGED:

                // Try to catch the internal hash change for the 3 parts pages ex. /planet/wood/0
                var newHasher = _Router2['default'].getNewHash();
                var oldHasher = _Router2['default'].getOldHash();
                var actionType = _AppConstants2['default'].PAGE_HASHER_CHANGED;
                if (oldHasher != undefined) {
                    // if(newHasher.parts.length == 3 && oldHasher.parts.length == 3 && newHasher.parts[1] == oldHasher.parts[1]) {
                    if (newHasher.parts.length == 3 && oldHasher.parts.length == 3) {
                        actionType = _AppConstants2['default'].PAGE_HASHER_INTERNAL_CHANGE;
                    }
                }

                AppStore.emitChange(actionType);
                break;
            case _AppConstants2['default'].WINDOW_RESIZE:
                AppStore.Window.w = action.item.windowW;
                AppStore.Window.h = action.item.windowH;
                AppStore.Orientation = AppStore.Window.w > AppStore.Window.h ? _AppConstants2['default'].LANDSCAPE : _AppConstants2['default'].PORTRAIT;
                AppStore.emitChange(action.actionType);
                break;
            case _AppConstants2['default'].PX_CONTAINER_IS_READY:
                AppStore.PXContainer = action.item;
                AppStore.emitChange(action.actionType);
                break;
            case _AppConstants2['default'].PX_CONTAINER_ADD_CHILD:
                AppStore.addPXChild(action.item);
                AppStore.emitChange(action.actionType);
                break;
            case _AppConstants2['default'].PX_CONTAINER_REMOVE_CHILD:
                AppStore.removePXChild(action.item);
                AppStore.emitChange(action.actionType);
                break;
            case _AppConstants2['default'].TOGGLE_SOUNDS:
                AppStore.Sounds.toggle();
                AppStore.emitChange(action.actionType);
                break;
        }
        return true;
    })
});

exports['default'] = AppStore;
module.exports = exports['default'];

},{"./../../../../www/data/data":69,"./../constants/AppConstants":47,"./../dispatchers/AppDispatcher":48,"./../services/Router":57,"./../utils/Utils":62,"eventemitter2":"eventemitter2","object-assign":"object-assign"}],61:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _is = require('is');

var _is2 = _interopRequireDefault(_is);

function getAllMethods(obj) {
	return Object.getOwnPropertyNames(obj).filter(function (key) {
		return _is2['default'].fn(obj[key]);
	});
}

function autoBind(obj) {
	// console.log('obj -----', obj)
	getAllMethods(obj.constructor.prototype).forEach(function (mtd) {
		// console.log(mtd)
		obj[mtd] = obj[mtd].bind(obj);
	});
}

exports['default'] = autoBind;
module.exports = exports['default'];

},{"is":13}],62:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var Utils = (function () {
	function Utils() {
		_classCallCheck(this, Utils);
	}

	_createClass(Utils, null, [{
		key: 'NormalizeMouseCoords',
		value: function NormalizeMouseCoords(e, objWrapper) {
			var posx = 0;
			var posy = 0;
			if (!e) var e = window.event;
			if (e.pageX || e.pageY) {
				posx = e.pageX;
				posy = e.pageY;
			} else if (e.clientX || e.clientY) {
				posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
				posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
			}
			objWrapper.x = posx;
			objWrapper.y = posy;
			return objWrapper;
		}
	}, {
		key: 'ResizePositionProportionally',
		value: function ResizePositionProportionally(windowW, windowH, contentW, contentH, orientation) {
			var aspectRatio = contentW / contentH;

			if (orientation !== undefined) {
				if (orientation == _AppConstants2['default'].LANDSCAPE) {
					var scale = windowW / contentW * 1;
				} else {
					var scale = windowH / contentH * 1;
				}
			} else {
				var scale = windowW / windowH < aspectRatio ? windowH / contentH * 1 : windowW / contentW * 1;
			}

			var newW = contentW * scale;
			var newH = contentH * scale;
			var css = {
				width: newW,
				height: newH,
				left: (windowW >> 1) - (newW >> 1),
				top: (windowH >> 1) - (newH >> 1),
				scale: scale
			};
			return css;
		}
	}, {
		key: 'ResizePositionProportionallyWithAnchorCenter',
		value: function ResizePositionProportionallyWithAnchorCenter(windowW, windowH, contentW, contentH) {
			var aspectRatio = contentW / contentH;
			var scale = windowW / windowH < aspectRatio ? windowH / contentH * 1 : windowW / contentW * 1;
			var newW = contentW * scale;
			var newH = contentH * scale;
			var css = {
				width: newW,
				height: newH,
				left: windowW >> 1,
				top: windowH >> 1,
				scale: scale
			};
			return css;
		}
	}, {
		key: 'DegreesToRadians',
		value: function DegreesToRadians(degrees) {
			return degrees * (Math.PI / 180);
		}
	}, {
		key: 'RadiansToDegrees',
		value: function RadiansToDegrees(radians) {
			return radians * (180 / Math.PI);
		}
	}, {
		key: 'Limit',
		value: function Limit(v, min, max) {
			return Math.min(max, Math.max(min, v));
		}
	}, {
		key: 'Closest',
		value: function Closest(array, num) {
			var i = 0;
			var minDiff = 2000;
			var ans;
			for (i in array) {
				var m = Math.abs(num - array[i]);
				if (m < minDiff) {
					minDiff = m;
					ans = array[i];
				}
			}
			return ans;
		}
	}, {
		key: 'Style',
		value: function Style(div, style) {
			div.style.webkitTransform = style;
			div.style.mozTransform = style;
			div.style.msTransform = style;
			div.style.oTransform = style;
			div.style.transform = style;
		}
	}, {
		key: 'Translate',
		value: function Translate(div, x, y, z) {

			if ('webkitTransform' in document.body.style || 'mozTransform' in document.body.style || 'oTransform' in document.body.style || 'transform' in document.body.style) {
				Utils.Style(div, 'translate3d(' + x + 'px,' + y + 'px,' + z + 'px)');
			} else {
				$(div).css({
					top: y,
					left: x
				});
			}
		}
	}, {
		key: 'UUID',
		value: function UUID() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}
			return s4() + s4();
		}
	}, {
		key: 'Rand',
		value: function Rand(min, max, decimals) {
			var randomNum = Math.random() * (max - min) + min;
			if (decimals == undefined) {
				return randomNum;
			} else {
				var d = Math.pow(10, decimals);
				return ~ ~(d * randomNum + 0.5) / d;
			}
		}
	}, {
		key: 'SpringTo',
		value: function SpringTo(item, toX, toY, index, spring, friction, springLength) {
			var dx = toX - item.x;
			var dy = toY - item.y;
			var angle = Math.atan2(dy, dx);
			var targetX = toX - Math.cos(angle) * (springLength * index);
			var targetY = toY - Math.sin(angle) * (springLength * index);
			item.vx += (targetX - item.x) * spring;
			item.vy += (targetY - item.y) * spring;
			item.vx *= friction;
			item.vy *= friction;
		}
	}, {
		key: 'CapitalizeFirstLetter',
		value: function CapitalizeFirstLetter(string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		}
	}, {
		key: 'RemoveVideo',
		value: function RemoveVideo($media) {
			if (!$media.length) return;
			$media[0].pause();
			$media[0].src = '';
			$media.children('source').prop('src', '');
			$media.remove().length = 0;
		}
	}, {
		key: 'SupportWebGL',
		value: function SupportWebGL() {
			try {
				var canvas = document.createElement('canvas');
				return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
			} catch (e) {
				return false;
			}
		}
	}]);

	return Utils;
})();

exports['default'] = Utils;
module.exports = exports['default'];

},{"./../constants/AppConstants":47}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Vec2 = (function () {
	function Vec2(x, y) {
		_classCallCheck(this, Vec2);

		this.x = x;
		this.y = y;
	}

	_createClass(Vec2, [{
		key: "distanceTo",
		value: function distanceTo(v) {
			return Math.sqrt(this.distanceToSquared(v));
		}
	}, {
		key: "distanceToSquared",
		value: function distanceToSquared(v) {
			var dx = this.x - v.x,
			    dy = this.y - v.y;
			return dx * dx + dy * dy;
		}
	}, {
		key: "length",
		value: function length() {
			return Math.sqrt(this.x * this.x + this.y * this.y);
		}
	}, {
		key: "normalize",
		value: function normalize() {
			return this.divideScalar(this.length());
		}
	}, {
		key: "divideScalar",
		value: function divideScalar(scalar) {
			if (scalar !== 0) {
				var invScalar = 1 / scalar;
				this.x *= invScalar;
				this.y *= invScalar;
			} else {
				this.x = 0;
				this.y = 0;
			}
			return this;
		}
	}]);

	return Vec2;
})();

exports["default"] = Vec2;
module.exports = exports["default"];

},{}],64:[function(require,module,exports){
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel

// MIT license

'use strict';

(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function () {
            callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };

    if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) {
        clearTimeout(id);
    };
})();

},{}],65:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _flux = require('flux');

var _flux2 = _interopRequireDefault(_flux);

var _eventemitter2 = require('eventemitter2');

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

// Actions
var PagerActions = {
    onPageReady: function onPageReady(hash) {
        PagerDispatcher.handlePagerAction({
            type: PagerConstants.PAGE_IS_READY,
            item: hash
        });
    },
    onTransitionOutComplete: function onTransitionOutComplete() {
        PagerDispatcher.handlePagerAction({
            type: PagerConstants.PAGE_TRANSITION_OUT_COMPLETE,
            item: undefined
        });
    },
    pageTransitionDidFinish: function pageTransitionDidFinish() {
        PagerDispatcher.handlePagerAction({
            type: PagerConstants.PAGE_TRANSITION_DID_FINISH,
            item: undefined
        });
    }
};

// Constants
var PagerConstants = {
    PAGE_IS_READY: 'PAGE_IS_READY',
    PAGE_TRANSITION_IN: 'PAGE_TRANSITION_IN',
    PAGE_TRANSITION_OUT: 'PAGE_TRANSITION_OUT',
    PAGE_TRANSITION_OUT_COMPLETE: 'PAGE_TRANSITION_OUT_COMPLETE',
    PAGE_TRANSITION_IN_PROGRESS: 'PAGE_TRANSITION_IN_PROGRESS',
    PAGE_TRANSITION_DID_FINISH: 'PAGE_TRANSITION_DID_FINISH'
};

// Dispatcher
var PagerDispatcher = (0, _objectAssign2['default'])(new _flux2['default'].Dispatcher(), {
    handlePagerAction: function handlePagerAction(action) {
        this.dispatch(action);
    }
});

// Store
var PagerStore = (0, _objectAssign2['default'])({}, _eventemitter2.EventEmitter2.prototype, {
    firstPageTransition: true,
    pageTransitionState: undefined,
    dispatcherIndex: PagerDispatcher.register(function (payload) {
        var actionType = payload.type;
        var item = payload.item;
        switch (actionType) {
            case PagerConstants.PAGE_IS_READY:
                PagerStore.pageTransitionState = PagerConstants.PAGE_TRANSITION_IN_PROGRESS;
                var type = PagerStore.firstPageTransition ? PagerConstants.PAGE_TRANSITION_IN : PagerConstants.PAGE_TRANSITION_OUT;
                PagerStore.emit(type);
                break;
            case PagerConstants.PAGE_TRANSITION_OUT_COMPLETE:
                var type = PagerConstants.PAGE_TRANSITION_IN;
                PagerStore.emit(type);
                break;
            case PagerConstants.PAGE_TRANSITION_DID_FINISH:
                if (PagerStore.firstPageTransition) PagerStore.firstPageTransition = false;
                PagerStore.pageTransitionState = PagerConstants.PAGE_TRANSITION_DID_FINISH;
                PagerStore.emit(actionType);
                break;
        }
        return true;
    })
});

exports['default'] = {
    PagerStore: PagerStore,
    PagerActions: PagerActions,
    PagerConstants: PagerConstants,
    PagerDispatcher: PagerDispatcher
};
module.exports = exports['default'];

},{"eventemitter2":"eventemitter2","flux":1,"object-assign":"object-assign"}],66:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _Autobind = require('./../../app/utils/Autobind');

var _Autobind2 = _interopRequireDefault(_Autobind);

var _toSlugCase = require('to-slug-case');

var _toSlugCase2 = _interopRequireDefault(_toSlugCase);

var BaseComponent = (function () {
	function BaseComponent() {
		_classCallCheck(this, BaseComponent);

		(0, _Autobind2['default'])(this);
		this.domIsReady = false;
	}

	_createClass(BaseComponent, [{
		key: 'componentWillMount',
		value: function componentWillMount() {}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.domIsReady = true;
		}
	}, {
		key: 'render',
		value: function render(childId, parentId, template, object) {
			this.componentWillMount();
			this.childId = childId;
			this.parentId = parentId;
			this.parent = parentId instanceof jQuery ? parentId : $(this.parentId);
			this.child = template == undefined ? $('<div></div>') : $(template(object));
			if (this.child.attr('id') == undefined) this.child.attr('id', (0, _toSlugCase2['default'])(childId));
			this.child.ready(this.componentDidMount);

			// setTimeout(()=>{
			// 	this.componentDidMount()
			// }, 0)

			this.parent.append(this.child);
			// console.log(this.parent, this.child)
		}
	}, {
		key: 'remove',
		value: function remove() {
			this.componentWillUnmount();
			this.child.remove();
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {}
	}]);

	return BaseComponent;
})();

exports['default'] = BaseComponent;
module.exports = exports['default'];

},{"./../../app/utils/Autobind":61,"to-slug-case":"to-slug-case"}],67:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseComponent2 = require('./BaseComponent');

var _BaseComponent3 = _interopRequireDefault(_BaseComponent2);

var _TransitionAnimations = require('./../../app/services/TransitionAnimations');

var _TransitionAnimations2 = _interopRequireDefault(_TransitionAnimations);

var _AppStore = require('./../../app/stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var BasePage = (function (_BaseComponent) {
	_inherits(BasePage, _BaseComponent);

	function BasePage(props) {
		_classCallCheck(this, BasePage);

		_get(Object.getPrototypeOf(BasePage.prototype), 'constructor', this).call(this);
		this.props = props;
		this.didTransitionInComplete = this.didTransitionInComplete.bind(this);
		this.didTransitionOutComplete = this.didTransitionOutComplete.bind(this);
	}

	_createClass(BasePage, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this = this;

			this.child.addClass(this.props.type.toLowerCase());
			this.resize();
			this.setupAnimations();
			setTimeout(function () {
				return _this.props.isReady(_this.props.hash);
			}, 0);
		}
	}, {
		key: 'setupAnimations',
		value: function setupAnimations() {
			var keyName = this.props.type.toLowerCase() + '-in';
			// this.tlIn = AppStore.getTimeline()
			this.tlIn = new TimelineMax();
			this.tlIn.eventCallback('onComplete', this.didTransitionInComplete);
			_TransitionAnimations2['default'][keyName](this, this.tlIn);
			this.tlIn.pause(0);
		}
	}, {
		key: 'willTransitionIn',
		value: function willTransitionIn() {
			this.tlIn.play(0);
		}
	}, {
		key: 'willTransitionOut',
		value: function willTransitionOut() {
			var keyName = this.props.type.toLowerCase() + '-out';
			// this.tlOut = AppStore.getTimeline()
			this.tlOut = new TimelineMax();
			this.tlOut.eventCallback('onComplete', this.didTransitionOutComplete);
			_TransitionAnimations2['default'][keyName](this, this.tlOut);
			this.tlOut.play(0);
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			var _this2 = this;

			// console.log('didTransitionInComplete', this.id, this.props.type)
			this.releaseTimelineIn();
			setTimeout(function () {
				return _this2.props.didTransitionInComplete();
			}, 0);
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			var _this3 = this;

			// console.log('didTransitionOutComplete', this.id, this.props.type)
			this.releaseTimelineOut();
			setTimeout(function () {
				return _this3.props.didTransitionOutComplete();
			}, 0);
		}
	}, {
		key: 'resize',
		value: function resize() {}
	}, {
		key: 'forceUnmount',
		value: function forceUnmount() {
			if (this.tlIn != undefined) {
				this.tlIn.pause(0);
			}
			if (this.tlOut != undefined) {
				this.tlOut.pause(0);
			}
			this.didTransitionOutComplete();
		}
	}, {
		key: 'releaseTimelineIn',
		value: function releaseTimelineIn() {
			if (this.tlIn != undefined) {
				this.tlIn.clear();
				// AppStore.releaseTimeline(this.tlIn)
				this.tlIn = null;
			}
		}
	}, {
		key: 'releaseTimelineOut',
		value: function releaseTimelineOut() {
			if (this.tlOut != undefined) {
				this.tlOut.clear();
				// AppStore.releaseTimeline(this.tlOut)
				this.tlIOut = null;
			}
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.releaseTimelineIn();
			this.releaseTimelineOut();
		}
	}]);

	return BasePage;
})(_BaseComponent3['default']);

exports['default'] = BasePage;
module.exports = exports['default'];

},{"./../../app/services/TransitionAnimations":59,"./../../app/stores/AppStore":60,"./BaseComponent":66}],68:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseComponent2 = require('./BaseComponent');

var _BaseComponent3 = _interopRequireDefault(_BaseComponent2);

var _Pager = require('./../Pager');

var _PagesContainer_hbs = require('./../../app/partials/PagesContainer.hbs');

var _PagesContainer_hbs2 = _interopRequireDefault(_PagesContainer_hbs);

var _AppStore = require('./../../app/stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Utils = require('./../../app/utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var BasePager = (function (_BaseComponent) {
	_inherits(BasePager, _BaseComponent);

	function BasePager() {
		_classCallCheck(this, BasePager);

		_get(Object.getPrototypeOf(BasePager.prototype), 'constructor', this).call(this);
		this.currentPageDivRef = 'page-b';
		this.willPageTransitionIn = this.willPageTransitionIn.bind(this);
		this.willPageTransitionOut = this.willPageTransitionOut.bind(this);
		this.didPageTransitionInComplete = this.didPageTransitionInComplete.bind(this);
		this.didPageTransitionOutComplete = this.didPageTransitionOutComplete.bind(this);
		this.components = {
			'new-component': undefined,
			'old-component': undefined
		};
	}

	_createClass(BasePager, [{
		key: 'render',
		value: function render(parent) {
			_get(Object.getPrototypeOf(BasePager.prototype), 'render', this).call(this, 'BasePager', parent, _PagesContainer_hbs2['default'], undefined);
		}
	}, {
		key: 'componentWillMount',
		value: function componentWillMount() {
			_Pager.PagerStore.on(_Pager.PagerConstants.PAGE_TRANSITION_IN, this.willPageTransitionIn);
			_Pager.PagerStore.on(_Pager.PagerConstants.PAGE_TRANSITION_OUT, this.willPageTransitionOut);
			_get(Object.getPrototypeOf(BasePager.prototype), 'componentWillMount', this).call(this);
		}
	}, {
		key: 'willPageTransitionIn',
		value: function willPageTransitionIn() {
			if (_Pager.PagerStore.firstPageTransition) {
				this.switchPagesDivIndex();
				this.components['new-component'].willTransitionIn();
			}
		}
	}, {
		key: 'willPageTransitionOut',
		value: function willPageTransitionOut() {
			this.components['old-component'].willTransitionOut();
			this.switchPagesDivIndex();
			this.components['new-component'].willTransitionIn();
		}
	}, {
		key: 'didPageTransitionInComplete',
		value: function didPageTransitionInComplete() {
			// console.log('didPageTransitionInComplete')
			_Pager.PagerActions.pageTransitionDidFinish();
			this.unmountComponent('old-component');
		}
	}, {
		key: 'didPageTransitionOutComplete',
		value: function didPageTransitionOutComplete() {
			// console.log('didPageTransitionOutComplete')
			_Pager.PagerActions.onTransitionOutComplete();
		}
	}, {
		key: 'switchPagesDivIndex',
		value: function switchPagesDivIndex() {
			var newComponent = this.components['new-component'];
			var oldComponent = this.components['old-component'];
			if (newComponent != undefined) newComponent.parent.css('z-index', 2);
			if (oldComponent != undefined) oldComponent.parent.css('z-index', 1);
		}
	}, {
		key: 'setupNewComponent',
		value: function setupNewComponent(hash, template) {
			var id = _Utils2['default'].CapitalizeFirstLetter(hash.replace("/", ""));
			this.oldPageDivRef = this.currentPageDivRef;
			this.currentPageDivRef = this.currentPageDivRef === 'page-a' ? 'page-b' : 'page-a';
			var el = this.child.find('#' + this.currentPageDivRef);
			var props = {
				id: this.currentPageDivRef,
				isReady: this.onPageReady,
				type: _AppStore2['default'].getTypeOfPage(),
				hash: hash,
				didTransitionInComplete: this.didPageTransitionInComplete,
				didTransitionOutComplete: this.didPageTransitionOutComplete,
				data: _AppStore2['default'].pageContent()
			};
			var page = new template.type(props);
			page.id = _AppStore2['default'].getPageId();
			page.render(id, el, template.partial, props.data);
			this.components['old-component'] = this.components['new-component'];
			this.components['new-component'] = page;
			if (_Pager.PagerStore.pageTransitionState === _Pager.PagerConstants.PAGE_TRANSITION_IN_PROGRESS) {
				this.components['old-component'].forceUnmount();
			}
		}
	}, {
		key: 'onPageReady',
		value: function onPageReady(hash) {
			_Pager.PagerActions.onPageReady(hash);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(BasePager.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'unmountComponent',
		value: function unmountComponent(ref) {
			if (this.components[ref] !== undefined) {
				this.components[ref].remove();
			}
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_Pager.PagerStore.off(_Pager.PagerConstants.PAGE_TRANSITION_IN, this.willPageTransitionIn);
			_Pager.PagerStore.off(_Pager.PagerConstants.PAGE_TRANSITION_OUT, this.willPageTransitionOut);
			this.unmountComponent('old-component');
			this.unmountComponent('new-component');
			_get(Object.getPrototypeOf(BasePager.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return BasePager;
})(_BaseComponent3['default']);

exports['default'] = BasePager;
module.exports = exports['default'];

},{"./../../app/partials/PagesContainer.hbs":50,"./../../app/stores/AppStore":60,"./../../app/utils/Utils":62,"./../Pager":65,"./BaseComponent":66}],69:[function(require,module,exports){
module.exports={
	"infos": {
		"twitter_url": "https://twitter.com/camper",
		"facebook_url": "https://www.facebook.com/Camper",
		"instagram_url": "https://instagram.com/camper/",
		"lab_url": "http://www.camper.com/lab",
		"lang": {
			"en": {
				"camper_lab": "Camper Lab",
				"shop_title": "Shop",
				"shop_men": "Men",
				"shop_women": "Women",
				"planet": "Planet",
				"buy_title": "Buy",
				"campaign_title": "Discover campaign",
				"experience_title": "See experience",
				"legal": "Legal",
				"home_txt": "HOME",
				"mute_txt": "MUTE",
				"play_txt": "PLAY",
				"experience": {
					"alaska": "'Break the ice'",
					"gemstone": "'Enter the vortex'",
					"ski": "'Hit the bumps'",
					"wood": "'Play the temple blocks'",
					"metal": "'Bang the balls'",
				}
			},
			"fr": {
				"camper_lab": "Camper Lab",
				"shop_title": "Acheter",
				"shop_men": "homme",
				"shop_women": "femme",
				"planet": "Planète",
				"buy_title": "Acheter",
				"campaign_title": "Découvrir la campagne",
				"experience_title": "Voir l’expérience",
				"legal": "Légal",
				"home_txt": "HOME",
				"mute_txt": "Muet",
				"play_txt": "Jouer",
				"experience": {
					"alaska": "'Brisez la glace'",
					"gemstone": "'Entrez dans le vortex'",
					"ski": "'Dévalez les bosses'",
					"wood": "'Jouez des blocs chinois'",
					"metal": "'Faites se heurter les boules'",
				}
			},
			"es": {
				"camper_lab": "Camper Lab",
				"shop_title": "Comprar",
				"shop_men": "hombre",
				"shop_women": "mujer",
				"planet": "Planeta",
				"buy_title": "Comprar",
				"campaign_title": "Descubre la campaña",
				"experience_title": "Vive la experiencia",
				"legal": "Información legal",
				"home_txt": "HOME",
				"mute_txt": "Silenciar",
				"play_txt": "Juega",
				"experience": {
					"alaska": "'Rompe el hielo'",
					"gemstone": "'Entra en el vórtice'",
					"ski": "'Sáltate los desniveles'",
					"wood": "'Toca el xilófono'",
					"metal": "'Dale a las bolas'",
				}
			},
			"it": {
				"camper_lab": "Camper Lab",
				"shop_title": "Acquisti",
				"shop_men": "uomo",
				"shop_women": "donna",
				"planet": "Pianeta",
				"buy_title": "Acquista",
				"campaign_title": "Scopri la campagna",
				"experience_title": "Guarda l’esperienza",
				"legal": "Legale",
				"home_txt": "HOME",
				"mute_txt": "No audio",
				"play_txt": "Riproduci",
				"experience": {
					"alaska": "'Rompi il ghiaccio'",
					"gemstone": "'Entra nel vortice'",
					"ski": "'Affronta le cunette'",
					"wood": "'Suona i temple block'",
					"metal": "'Colpisci le palle'",
				}
			},
			"de": {
				"camper_lab": "Camper Lab",
				"shop_title": "Shop",
				"shop_men": "Herren",
				"shop_women": "Damen",
				"planet": "Planet",
				"buy_title": "Kaufen",
				"campaign_title": "Kampagne entdecken",
				"experience_title": "Experience erleben",
				"legal": "Impressum",
				"home_txt": "HOME",
				"mute_txt": "Stumm",
				"play_txt": "Abspielen",
				"experience": {
					"alaska": "'Brich das Eis'",
					"gemstone": "'Rausch durch den Strudel'",
					"ski": "'Schieß den Schuh'",
					"wood": "'Spiel Tempelblocks'",
					"metal": "'Gib dir die Kugeln'",
				}
			},
			"pt": {
				"camper_lab": "Camper Lab",
				"shop_title": "Compre",
				"shop_men": "homem",
				"shop_women": "mulher",
				"planet": "Planeta",
				"buy_title": "Comprar",
				"campaign_title": "Descobre a campanha",
				"experience_title": "Ver a experiência",
				"legal": "Legal",
				"home_txt": "HOME",
				"mute_txt": "Sem som",
				"play_txt": "Jogar",
				"experience": {
					"alaska": "'Quebra o gelo'",
					"gemstone": "'Entra no vórtice'",
					"ski": "'Atreve-te na pista'",
					"wood": "'Toca nos blocos do templo e ouve'",
					"metal": "'Faz colidir as esferas'",
				}
			}
		}
	},

	"planets": ["ski", "metal", "alaska", "wood", "gemstone"],
	"elements": ["fire", "earth", "metal", "water", "wood"],
	"gender": ["male", "female", "animal"],
	"langs": ["en", "fr", "es", "it", "de", "pt"],

	"colors": {
		"ski": ["0x6181aa", "0xc3d9f1"],
		"metal": ["0x0d0d0f", "0x595959"],
		"alaska": ["0xb7cadb", "0x6f8698"],
		"wood": ["0x502016", "0xc58547"],
		"gemstone": ["0x363864", "0x477e94"]
	},

	"products-data": {
		"ski": [
			{
				"id": 0,
				"name": "FISS",
				"color": "0x343a5c",
				"video-id": "mzs5yc3i5x",
				"video-thumb": "thumb-0",
				"product-url": "/men/shoes/fiss_lab",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "FISS",
				"color": "0xcff0fc",
				"video-id": "0l1dswyr4x",
				"video-thumb": "thumb-2",
				"product-url": "/men/shoes/fiss_lab",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			},{
				"id": 2,
				"name": "FISS",
				"color": "0xe7e33c",
				"video-id": "cwj04a3z55",
				"video-thumb": "thumb-3",
				"product-url": "/women/shoes/fiss_lab",
				"knots": [
					{"x":0.1, "y":-0.1},
					{"x":0.6, "y":-0.3},
					{"x":0.5, "y":-0.6}
				]
			},{
				"id": 3,
				"name": "FISS",
				"color": "0xdb3076",
				"video-id": "8fbp0pbww8",
				"video-thumb": "thumb-3",
				"product-url": "/women/shoes/fiss_lab",
				"knots": [
					{"x":0.0, "y":-0.8},
					{"x":0.2, "y":-0.6},
					{"x":-0.1, "y":-0.1}
				]
			},{
				"id": 4,
				"name": "LAIKA",
				"color": "0xf3f318",
				"video-id": "8fbp0pbww8",
				"video-thumb": "thumb-3",
				"product-url": "/women/shoes/laika_sport",
				"knots": [
					{"x":0.3, "y":0.3},
					{"x":-0.2, "y":0.6},
					{"x":0.3, "y":0.6}
				]
			}
		],
		"metal": [
			{
				"id": 0,
				"name": "BELUGA",
				"color": "0x818181",
				"video-id": "gsun7amzq8",
				"video-thumb": "thumb-0",
				"product-url": "/women/shoes/beluga/camper-beluga-K400014-001",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "HARDWOOD",
				"color": "0xe82b18",
				"video-id": "fevnsbsj84",
				"video-thumb": "thumb-0",
				"product-url": "/men/shoes/hardwood/camper-hardwood-K300029-001",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			}
		],
		"alaska": [
			{
				"id": 0,
				"name": "gemma",
				"color": "0xb6937d",
				"video-id": "ljrt61icha",
				"video-thumb": "thumb-0",
				"product-url": "/women/shoes/gemma_lab",
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "pelotas",
				"color": "0xc98e94",
				"video-id": "n0ksuy0wua",
				"video-thumb": "thumb-1",
				"product-url": "/women/shoes/pelotas/camper-pelotas-K200038-001",
				"knots": [
					{"x":0.3, "y":-0.6},
					{"x":0.6, "y":0.4},
					{"x":0.4, "y":0.7}
				]
			},{
				"id": 2,
				"name": "ENDURO",
				"color": "0x616a71",
				"video-id": "8xpnpynqup",
				"video-thumb": "thumb-2",
				"product-url": "/men/shoes/enduro_lab",
				"knots": [
					{"x":-0.3, "y":0.1},
					{"x":-0.6, "y":-0.1},
					{"x":-0.6, "y":-0.6}
				]
			},{
				"id": 3,
				"name": "ENDURO",
				"color": "0x0e2e61",
				"video-id": "m509p0iu4u",
				"video-thumb": "thumb-3",
				"product-url": "/women/shoes/enduro_lab",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":-0.1},
					{"x":-0.6, "y":0.1}
				]
			}
		],
		"wood": [
			{
				"id": 0,
				"name": "VINTAR",
				"color": "0xd79b7a",
				"video-id": "1mevrxz7v6",
				"video-thumb": "thumb-0",
				"product-url": "/men/shoes/vintar/camper-vintar-K300048-001",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "BELUGA",
				"color": "0x88a2c7",
				"video-id": "gldrv27k76",
				"video-thumb": "thumb-1",
				"product-url": "/women/shoes/beluga/camper-beluga-K400015-001",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			}
		],
		"gemstone": [
			{
				"id": 0,
				"name": "ENDURO",
				"color": "0x2892c1",
				"video-id": "pnr81ri2xo",
				"video-thumb": "thumb-0",
				"product-url": "/men/shoes/enduro_lab",
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "ENDURO",
				"color": "0x62a8bb",
				"video-id": "9qbhhpb89b",
				"video-thumb": "thumb-1",
				"product-url": "/women/shoes/enduro_lab",
				"knots": [
					{"x":0.3, "y":-0.6},
					{"x":0.6, "y":0.4},
					{"x":0.4, "y":0.7}
				]
			},{
				"id": 2,
				"name": "gemma",
				"color": "0x090b36",
				"video-id": "ckgwzd3npu",
				"video-thumb": "thumb-2",
				"product-url": "/women/shoes/gemma_lab",
				"knots": [
					{"x":-0.3, "y":0.1},
					{"x":-0.6, "y":-0.3},
					{"x":-0.6, "y":-0.4}
				]
			}
		]
	},

	"lang": {
		"en": {
			"global": {
				"elements": {
					"fire": "fire",
					"earth": "earth",
					"metal": "metal",
					"water": "water",
					"wood": "wood"
				}
			},
			"landing": {
			},
			"ski": {
			},
			"metal": {
			},
			"alaska": {
			},
			"wood": {
			},
			"gemstone": {
			}
		},
		"fr": {
			"global": {
				"header-title": "Header fr",
				"footer-title": "Footer fr",
				"elements": {
					"fire": "fire",
					"earth": "earth",
					"metal": "metal",
					"water": "water",
					"wood": "wood"
				},
				"gender": {
					"male": "m",
					"female": "f",
					"animal": "a"
				}
			},
			"landing": {
			},
			"ski": {
			},
			"metal": {
			},
			"alaska": {
			},
			"wood": {
			},
			"gemstone": {
			}
		},
		"es": {
			"global": {
				"header-title": "Header es",
				"footer-title": "Footer es",
				"elements": {
					"fire": "fire",
					"earth": "earth",
					"metal": "metal",
					"water": "water",
					"wood": "wood"
				},
				"gender": {
					"male": "m",
					"female": "f",
					"animal": "a"
				}
			},
			"landing": {
			},
			"ski": {
			},
			"metal": {
			},
			"alaska": {
			},
			"wood": {
			},
			"gemstone": {
			}
		},
		"it": {
			"global": {
				"header-title": "Header it",
				"footer-title": "Footer it",
				"elements": {
					"fire": "fire",
					"earth": "earth",
					"metal": "metal",
					"water": "water",
					"wood": "wood"
				},
				"gender": {
					"male": "m",
					"female": "f",
					"animal": "a"
				}
			},
			"landing": {
			},
			"ski": {
			},
			"metal": {
			},
			"alaska": {
			},
			"wood": {
			},
			"gemstone": {
			}
		},
		"de": {
			"global": {
				"header-title": "Header ge",
				"footer-title": "Footer ge",
				"elements": {
					"fire": "fire",
					"earth": "earth",
					"metal": "metal",
					"water": "water",
					"wood": "wood"
				},
				"gender": {
					"male": "m",
					"female": "f",
					"animal": "a"
				}
			},
			"landing": {
			},
			"ski": {
			},
			"metal": {
			},
			"alaska": {
			},
			"wood": {
			},
			"gemstone": {
			}
		},
		"pt": {
			"global": {
				"header-title": "Header pt",
				"footer-title": "Footer pt",
				"elements": {
					"fire": "fire",
					"earth": "earth",
					"metal": "metal",
					"water": "water",
					"wood": "wood"
				},
				"gender": {
					"male": "m",
					"female": "f",
					"animal": "a"
				}
			},
			"landing": {
			},
			"ski": {
			},
			"metal": {
			},
			"alaska": {
			},
			"wood": {
			},
			"gemstone": {
			}
		}
	},

	"default-route": "/landing",

	"routing": {
		"/landing": {
			"id": "landing"
		},
		"/planet/ski": {
			"id": "ski",
			"experience-assets": [
				"bumps.png",
				"light-line.png",
				"lens-flare.png",
				"shoe-0.png",
				"shoe-1.png",
				"shoe-2.png",
				"shoe-3.png"
			],
			"sounds-assets": [
				"bump-0",
				"bump-1",
				"flying-0",
				"flying-1",
				"text-in-0"
			],
			"campaign-assets": [
			]
		},
		"/planet/metal": {
			"id": "metal",
			"experience-assets": [
				"ball-a.png",
				"ball-b.png",
				"noise.jpg",
				"gradient-mask.jpg"
			],
			"sounds-assets": [
				"burn",
				"overall-0",
				"ambient"
			],
			"campaign-assets": [
			]
		},
		"/planet/alaska": {
			"id": "alaska",
			"experience-assets": [
				"rock-0-0.png",
				"rock-0-1.png",
				"rock-1-0.png",
				"rock-1-1.png",
				"particle.png",
				"shoe-0.png",
				"shoe-1.png",
				"shoe-2.png",
				"shoe-3.png"
			],
			"sounds-assets": [
				"rock-in-0",
				"rock-in-1",
				"rock-open-0",
				"rock-open-1",
				"rock-open-2"
			],
			"campaign-assets": [
			]
		},
		"/planet/wood": {
			"id": "wood",
			"experience-assets": [
				"wood-part.png",
				"rain.png",
				"displacement.jpg"
			],
			"sounds-assets": [
				"rain",
				"owl",
				"woodblock-0",
				"woodblock-1",
				"woodblock-2",
				"woodblock-3",
				"woodblock-4",
				"woodblock-5",
				"woodblock-6",
				"woodblock-7"
			],
			"campaign-assets": [
			]
		},
		"/planet/gemstone": {
			"id": "gemstone",
			"experience-assets": [
				"texture.jpg",
				"shoe-0.png",
				"shoe-1.png",
				"shoe-2.png",
				"gradient-mask.jpg",
				"background-texture.jpg",
				"displacement-map.jpg"
			],
			"sounds-assets": [
				"cave-return",
				"reveal-0",
				"reveal-1"
			],
			"campaign-assets": [
			]
		}
	},

	"sentences": [
		"Well done !",
		"Oh gosh !",
		"Cool bro !",
		"Perfect !",
		"You are rippin' !",
		"Nice trick !",
		"Yeah !",
		"Mega cool !",
		"Giga cool !",
		"Bravo !",
		"Impressive !",
		"Stunning !",
		"Big time !",
		"Crucial !",
		"Terrific !",
		"Outstanding !",
		"Smashing !",
		"Fabulous !",
		"Unbelievable !",
		"Epic !"
	]
}
},{}]},{},[14]);
