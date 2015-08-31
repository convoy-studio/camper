(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/panagiotisthomoglou/Projects/camper/node_modules/flux/index.js":[function(require,module,exports){
/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

module.exports.Dispatcher = require('./lib/Dispatcher')

},{"./lib/Dispatcher":"/Users/panagiotisthomoglou/Projects/camper/node_modules/flux/lib/Dispatcher.js"}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/flux/lib/Dispatcher.js":[function(require,module,exports){
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

},{"./invariant":"/Users/panagiotisthomoglou/Projects/camper/node_modules/flux/lib/invariant.js"}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/flux/lib/invariant.js":[function(require,module,exports){
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

},{}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars.runtime.js":[function(require,module,exports){
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
},{"./handlebars/base":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/base.js","./handlebars/exception":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/exception.js","./handlebars/no-conflict":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/no-conflict.js","./handlebars/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/runtime.js","./handlebars/safe-string":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/safe-string.js","./handlebars/utils":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/utils.js"}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/base.js":[function(require,module,exports){
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
},{"./exception":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/exception.js","./utils":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/utils.js"}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/exception.js":[function(require,module,exports){
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
},{}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/no-conflict.js":[function(require,module,exports){
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

},{}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/runtime.js":[function(require,module,exports){
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
},{"./base":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/base.js","./exception":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/exception.js","./utils":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/utils.js"}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/safe-string.js":[function(require,module,exports){
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
},{}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars/utils.js":[function(require,module,exports){
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
},{}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/runtime.js":[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime')['default'];

},{"./dist/cjs/handlebars.runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/dist/cjs/handlebars.runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js":[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/handlebars/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/lodash/String/capitalize.js":[function(require,module,exports){
var baseToString = require('../internal/baseToString');

/**
 * Capitalizes the first character of `string`.
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to capitalize.
 * @returns {string} Returns the capitalized string.
 * @example
 *
 * _.capitalize('fred');
 * // => 'Fred'
 */
function capitalize(string) {
  string = baseToString(string);
  return string && (string.charAt(0).toUpperCase() + string.slice(1));
}

module.exports = capitalize;

},{"../internal/baseToString":"/Users/panagiotisthomoglou/Projects/camper/node_modules/lodash/internal/baseToString.js"}],"/Users/panagiotisthomoglou/Projects/camper/node_modules/lodash/internal/baseToString.js":[function(require,module,exports){
/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` or `undefined` values.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  return value == null ? '' : (value + '');
}

module.exports = baseToString;

},{}],"/Users/panagiotisthomoglou/Projects/camper/src/js/Main.js":[function(require,module,exports){
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

var _pixiJs = require('pixi.js');

var _pixiJs2 = _interopRequireDefault(_pixiJs);

var _jqueryMousewheel = require('jquery-mousewheel');

var _jqueryMousewheel2 = _interopRequireDefault(_jqueryMousewheel);

if (!window.console) console = { log: function log() {} };

window.jQuery = window.$ = _jquery2['default'];

(0, _jqueryMousewheel2['default'])(_jquery2['default']);

// Start App
var app = new _App2['default']();
app.init();

},{"./app/App":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/App.js","./app/utils/raf":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/raf.js","gsap":"gsap","jquery":"jquery","jquery-mousewheel":"jquery-mousewheel","pixi.js":"pixi.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/App.js":[function(require,module,exports){
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

var _mobileDetect = require('mobile-detect');

var _mobileDetect2 = _interopRequireDefault(_mobileDetect);

var App = (function () {
	function App() {
		_classCallCheck(this, App);
	}

	_createClass(App, [{
		key: 'init',
		value: function init() {

			var md = new _mobileDetect2['default'](window.navigator.userAgent);

			_AppStore2['default'].Detector.isMobile = md.mobile() || md.tablet() ? true : false;

			// Init Preloader
			_AppStore2['default'].Preloader = new _Preloader2['default']();

			// Init Pool
			_AppStore2['default'].Pool = new _Pool2['default']();

			// Init router
			this.router = new _Router2['default']();
			this.router.init();

			// Init global events
			window.GlobalEvents = new _GlobalEvents2['default']();
			GlobalEvents.init();

			var appTemplate = new _AppTemplate2['default']();
			this.templateIsReady = this.templateIsReady.bind(this);
			appTemplate.isReady = this.templateIsReady;
			appTemplate.render('#app-container');
		}
	}, {
		key: 'templateIsReady',
		value: function templateIsReady() {
			// Start routing
			this.router.beginRouting();
		}
	}]);

	return App;
})();

exports['default'] = App;
module.exports = exports['default'];

},{"./AppTemplate":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/AppTemplate.js","./actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./services/GlobalEvents":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/GlobalEvents.js","./services/Pool":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Pool.js","./services/Preloader":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Preloader.js","./services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","mobile-detect":"mobile-detect"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/AppTemplate.js":[function(require,module,exports){
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

			this.animate();

			setTimeout(function () {
				_this.isReady();
			}, 0);
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

},{"./../pager/components/BaseComponent":"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BaseComponent.js","./actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./components/FrontContainer":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/FrontContainer.js","./components/PXContainer":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PXContainer.js","./components/PagesContainer":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PagesContainer.js","./constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js":[function(require,module,exports){
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
            _AppStore2['default'].Preloader.load(manifest, function () {
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
    }
};

exports['default'] = AppActions;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../dispatchers/AppDispatcher":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/dispatchers/AppDispatcher.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ArrowBtn.js":[function(require,module,exports){
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BaseCampaignPage.js":[function(require,module,exports){
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

		_get(Object.getPrototypeOf(BaseCampaignPage.prototype), 'constructor', this).call(this, props);
		this.pxScrollContainer = _AppStore2['default'].getContainer();
		this.pxContainer.addChild(this.pxScrollContainer);
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
			this.pxScrollContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.pxScrollContainer);
			$(window).off("mousewheel", this.onWheel);
			_get(Object.getPrototypeOf(BaseCampaignPage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return BaseCampaignPage;
})(_BasePlanetPage3['default']);

exports['default'] = BaseCampaignPage;
module.exports = exports['default'];

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./BasePlanetPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js","./ScrollBar":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ScrollBar.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js":[function(require,module,exports){
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

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./Page":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Page.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Compass.js":[function(require,module,exports){
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
			var springGardenWithFill = this.type == _AppConstants2['default'].EXPERIENCE ? true : false;
			// var springGardenIsInteractive = (this.type == AppConstants.EXPERIENCE) ? true : false
			var springGardenIsInteractive = false;
			for (var i = 0; i < data.length; i++) {
				var springGarden = _AppStore2['default'].getSpringGarden();
				var product = data[i];
				var color = product.color;
				springGarden.id = this.id;
				springGarden.radius = this.radius;
				springGarden.knotRadius = this.knotRadius;
				springGarden.componentDidMount(product, springGardenWithFill, springGardenIsInteractive, this.type);
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./CompassRings":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassRings.js","./SpringGarden":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SpringGarden.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassRings.js":[function(require,module,exports){
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassesContainer.js":[function(require,module,exports){
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./Compass":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Compass.js","./SmallCompass":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SmallCompass.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/FrontContainer.js":[function(require,module,exports){
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
			scope.isMobile = _AppStore2['default'].Detector.isMobile;

			if (scope.isMobile) {
				scope.mobileMenu = [{ id: 'home', name: scope.infos['home_txt'], url: '#!/landing' }, { id: 'shop-men', name: scope.infos['shop_title'] + ' ' + scope.infos['shop_men'], url: scope.infos['shop_men_url'] }, { id: 'shop-women', name: scope.infos['shop_title'] + ' ' + scope.infos['shop_women'], url: scope.infos['shop_women_url'] }, { id: 'lab', name: scope.infos['camper_lab'], url: scope.infos['camper_lab_url'] }];
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
			this.countriesH = 0;

			this.onSubMenuMouseEnter = this.onSubMenuMouseEnter.bind(this);
			this.onSubMenuMouseLeave = this.onSubMenuMouseLeave.bind(this);
			this.$shop.on('mouseenter', this.onSubMenuMouseEnter);
			this.$shop.on('mouseleave', this.onSubMenuMouseLeave);

			this.onSocialMouseEnter = this.onSocialMouseEnter.bind(this);
			this.onSocialMouseLeave = this.onSocialMouseLeave.bind(this);
			this.$socialWrapper.on('mouseenter', this.onSocialMouseEnter);
			this.$socialWrapper.on('mouseleave', this.onSocialMouseLeave);

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
			var homeCss = {
				left: shopCss.left - this.$home.width() - _AppConstants2['default'].PADDING_AROUND,
				top: _AppConstants2['default'].PADDING_AROUND
			};

			this.$socialWrapper.css(socialCss);
			this.$camperLab.css(camperLabCss);
			this.$shop.css(shopCss);
			this.$socialIconsContainer.css(socialIconsCss);
			this.$home.css(homeCss);

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

},{"./../../pager/components/BaseComponent":"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BaseComponent.js","./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../partials/FrontContainer.hbs":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/FrontContainer.hbs","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js":[function(require,module,exports){
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

},{"./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/LandingSlideshow.js":[function(require,module,exports){
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

var LandingSlideshow = (function () {
	function LandingSlideshow(pxContainer, parentEl) {
		_classCallCheck(this, LandingSlideshow);

		this.parentEl = parentEl;
		this.pxContainer = pxContainer;
		this.currentId = 'alaska';
	}

	_createClass(LandingSlideshow, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
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
				var texture = PIXI.Texture.fromImage(imgUrl);
				var sprite = _AppStore2['default'].getSprite();
				sprite.texture = texture;
				sprite.params = {};
				this.slideshowWrapper.addChild(wrapperContainer);
				wrapperContainer.addChild(sprite);
				wrapperContainer.addChild(maskRect.g);
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

			this.maskEasing = (0, _bezierEasing2['default'])(.21, 1.47, .52, 1);
			this.chooseSlideToHighlight();
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
		key: 'next',
		value: function next() {
			var firstElement = this.slides.shift();
			this.slides.push(firstElement);
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
			s.sprite.x = resizeVars.left;
			s.sprite.y = resizeVars.top;
		}
	}, {
		key: 'update',
		value: function update() {
			var slides = this.slides;
			this.counter += 0.012;
			for (var i = 0; i < slides.length; i++) {
				var s = slides[i];
				s.maskRect.valueScale += (0.4 - s.maskRect.valueScale) * 0.05;
				var ease = this.maskEasing.get(s.maskRect.valueScale);
				s.wrapperContainer.x += (s.newPosition.x - s.wrapperContainer.x) * ease;
				s.maskRect.width = s.maskRect.newW * ease;
				var maskRectX = (1 - ease) * s.maskRect.newX;
				this.drawCenteredMaskRect(s.maskRect.g, maskRectX, 0, s.maskRect.width, s.maskRect.height);
				s.sprite.skew.x = Math.cos(this.counter) * 0.020;
				s.sprite.skew.y = Math.sin(this.counter) * 0.020;
			}
			this.slideshowContainer.scale.x += (this.slideshowContainer.scaleXY - this.slideshowContainer.scale.x) * 0.08;
			this.slideshowContainer.scale.y += (this.slideshowContainer.scaleXY - this.slideshowContainer.scale.x) * 0.08;
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
			this.slideshowContainer.scale.x = 1.3;
			this.slideshowContainer.scale.y = 1.3;
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./../utils/Vec2":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Vec2.js","bezier-easing":"bezier-easing"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PXContainer.js":[function(require,module,exports){
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

var PXContainer = (function () {
	function PXContainer() {
		_classCallCheck(this, PXContainer);
	}

	_createClass(PXContainer, [{
		key: 'init',
		value: function init(elementId) {

			this.didHasherChange = this.didHasherChange.bind(this);
			_AppStore2['default'].on(_AppConstants2['default'].PAGE_HASHER_CHANGED, this.didHasherChange);
			_AppStore2['default'].on(_AppConstants2['default'].PAGE_HASHER_INTERNAL_CHANGE, this.didHasherChange);

			if (_AppStore2['default'].Detector.isMobile) {} else {
				this.renderer = new PIXI.autoDetectRenderer(1, 1, { antialias: true });
				this.oldColor = "0xffffff";
				this.newColor = "0xffffff";
				this.colorTween = { color: this.oldColor };
				var el = $(elementId);
				$(this.renderer.view).attr('id', 'px-container');
				el.append(this.renderer.view);
				this.stage = new PIXI.Container();
			}
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
			var scale = window.devicePixelRatio == undefined ? 1 : window.devicePixelRatio;
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.renderer.resize(windowW * scale, windowH * scale);
		}
	}, {
		key: 'didHasherChange',
		value: function didHasherChange() {
			var pageId = _AppStore2['default'].getPageId();
			var palette = _AppStore2['default'].paletteColorsById(pageId);
			// this.oldColor = this.newColor
			// this.newColor = palette[0]
			// console.log(this.oldColor, this.newColor)
			// if(palette != undefined) TweenMax.to(this.renderer, 1, { colorProps: {backgroundColor:"red"}})
			// if(palette != undefined) TweenMax.to(this.colorTween, 1, { colorProps: {color:this.newColor}, onUpdate: ()=>{
			// 	console.log(this.colorTween.color)
			// }})
			if (_AppStore2['default'].Detector.isMobile) {
				if (palette != undefined) {
					var c = palette[0];
					$('html').css('background-color', c.replace('0x', '#'));
				}
			} else {
				if (palette != undefined) this.renderer.backgroundColor = palette[0];
			}
		}
	}]);

	return PXContainer;
})();

exports['default'] = PXContainer;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Page.js":[function(require,module,exports){
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
			this.pxContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.pxContainer);
			_AppStore2['default'].off(_AppConstants2['default'].WINDOW_RESIZE, this.resize);
			_get(Object.getPrototypeOf(Page.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return Page;
})(_BasePage3['default']);

exports['default'] = Page;
module.exports = exports['default'];

},{"./../../pager/components/BasePage":"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BasePage.js","./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PagesContainer.js":[function(require,module,exports){
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

},{"./../../pager/components/BaseComponent":"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BaseComponent.js","./../../pager/components/BasePager":"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BasePager.js","./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../partials/PlanetCampaignPage.hbs":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/PlanetCampaignPage.hbs","./../partials/PlanetExperiencePage.hbs":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/PlanetExperiencePage.hbs","./../partials/pages/Landing.hbs":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/pages/Landing.hbs","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./PlanetCampaignPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlanetCampaignPage.js","./PlanetExperiencePage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlanetExperiencePage.js","./pages/Landing":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/pages/Landing.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlanetCampaignPage.js":[function(require,module,exports){
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
		this.timeoutTime = 900;
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
						el: containerA.find('.video-wrapper'),
						play: containerA.find('.play-btn'),
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
						el: containerB.find('.video-wrapper'),
						play: containerB.find('.play-btn'),
						container: containerB.find('.video-container')
					}
				}
			};

			this.arrowClicked = this.arrowClicked.bind(this);
			this.onBuyClicked = this.onBuyClicked.bind(this);
			this.onPlanetClicked = this.onPlanetClicked.bind(this);

			this.previousBtn = new _ArrowBtn2['default'](this.child.find('.previous-btn'), _AppConstants2['default'].LEFT);
			this.previousBtn.btnClicked = this.arrowClicked;
			this.previousBtn.componentDidMount();
			this.nextBtn = new _ArrowBtn2['default'](this.child.find('.next-btn'), _AppConstants2['default'].RIGHT);
			this.nextBtn.btnClicked = this.arrowClicked;
			this.nextBtn.componentDidMount();

			this.buyBtn = new _TitleSwitcher2['default'](this.child.find('.buy-btn'), this.child.find('.dots-rectangle-btn'), this.infos['buy_title']);
			this.buyBtn.onClick = this.onBuyClicked;
			this.buyBtn.componentDidMount();

			this.playBtn = new _PlayBtn2['default'](this.child.find('.play-btn'));
			this.playBtn.componentDidMount();

			if (!_AppStore2['default'].Detector.isMobile) {
				this.compassesContainer = new _CompassesContainer2['default'](this.pxScrollContainer, this.child.find(".interface.absolute"));
				this.compassesContainer.id = this.id;
				this.compassesContainer.componentDidMount();
			}

			// this.onVideoMouseEnter = this.onVideoMouseEnter.bind(this)
			// this.onVideoMouseLeave = this.onVideoMouseLeave.bind(this)
			// this.onVideoClick = this.onVideoClick.bind(this)

			this.checkCurrentProductByUrl();
			this.updateColors();
			$(document).on('keydown', this.onKeyPressed);

			this.updateTitles(this.infos.planet.toUpperCase(), this.id.toUpperCase());

			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'addVideoEvents',
		value: function addVideoEvents() {
			// if(this.currentContainer == undefined) return
			// this.currentContainer.video.el.on('mouseenter', this.onVideoMouseEnter)
			// this.currentContainer.video.el.on('mouseleave', this.onVideoMouseLeave)
			// this.currentContainer.video.el.on('click', this.onVideoClick)
		}
	}, {
		key: 'removeVideoEvents',
		value: function removeVideoEvents() {
			// if(this.currentContainer == undefined) return
			// this.currentContainer.video.el.off('mouseenter', this.onVideoMouseEnter)
			// this.currentContainer.video.el.off('mouseleave', this.onVideoMouseLeave)
			// this.currentContainer.video.el.off('click', this.onVideoClick)
		}
	}, {
		key: 'onVideoMouseEnter',
		value: function onVideoMouseEnter(e) {
			e.preventDefault();
			this.currentContainer.video.play.addClass('hovered');
		}
	}, {
		key: 'onVideoMouseLeave',
		value: function onVideoMouseLeave(e) {
			e.preventDefault();
			this.currentContainer.video.play.removeClass('hovered');
		}
	}, {
		key: 'onVideoClick',
		value: function onVideoClick(e) {
			e.preventDefault();
			this.assignVideoToNewContainer();
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
		key: 'onBuyClicked',
		value: function onBuyClicked() {
			// console.log('buy')
			// window.location.href =
		}
	}, {
		key: 'arrowClicked',
		value: function arrowClicked(direction) {
			if (this.animationRunning) return;
			this.switchSlideByDirection(direction);
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
			this.resizeMediaWrappers();
			this.resizeVideoWrapper();
			this.animateContainers();

			this.updatePageHeight();
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
			var img = new Image();
			img.onload = function () {
				_this.currentContainer.posterImg.attr('src', imgSrc);
				_this.currentContainer.spinner.el.addClass('closed');
				_this.currentContainer.posterImg.addClass('opened');
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
			var iframeStr = '<iframe src="//fast.wistia.net/embed/iframe/' + videoId + '" id="' + frameUUID + '" allowtransparency="false" frameborder="0" scrolling="no" class="wistia_embed" name="wistia_embed" allowfullscreen mozallowfullscreen webkitallowfullscreen oallowfullscreen msallowfullscreen width="100%" height="100%"></iframe>';
			var iframe = $(iframeStr);
			this.currentContainer.video.uuid = frameUUID;
			this.currentContainer.video.container.html(iframe);
			this.currentContainer.videoIsAdded = true;

			this.currentContainer.video.container.addClass('opened');
			this.currentContainer.video.el.css('background-color', 'transparent');

			// setTimeout(()=>{
			// 	var wistiaEmbed = $('#'+frameUUID)[0].wistiaApi
			// 	wistiaEmbed.bind("end", ()=> {
			// 		alert("The video ended!");
			// 	});
			// }, 2000)
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
			}, this.timeoutTime);
			setTimeout(function () {
				_this2.assignVideoToNewContainer();
			}, this.timeoutTime + 500);
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
		key: 'resizeMediaWrappers',
		value: function resizeMediaWrappers() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			var orientation = _AppStore2['default'].Detector.isMobile ? _AppConstants2['default'].LANDSCAPE : undefined;
			var scale = _AppStore2['default'].Detector.isMobile ? 1 : 0.6;

			var imageResize = _Utils2['default'].ResizePositionProportionally(windowW * scale, windowH * scale, _AppConstants2['default'].CAMPAIGN_IMAGE_SIZE[0], _AppConstants2['default'].CAMPAIGN_IMAGE_SIZE[1], orientation);

			var posterTop = windowH * 0.51 - (imageResize.height >> 1);
			posterTop = _AppStore2['default'].Detector.isMobile ? 220 : posterTop;

			this.posterImgCss = {
				width: imageResize.width,
				height: imageResize.height,
				top: posterTop,
				left: (windowW >> 1) - (imageResize.width >> 1)
			};

			if (this.previousContainer != undefined) this.previousContainer.el.css('z-index', 1);
			this.currentContainer.el.css('z-index', 2);
			this.currentContainer.posterWrapper.css(this.posterImgCss);

			this.posterTotalHeight = (this.posterImgCss.top << 1) + this.posterImgCss.height;
		}
	}, {
		key: 'resizeVideoWrapper',
		value: function resizeVideoWrapper() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			var orientation = _AppStore2['default'].Detector.isMobile ? _AppConstants2['default'].LANDSCAPE : undefined;
			var scale = _AppStore2['default'].Detector.isMobile ? 1 : 0.6;

			var videoResize = _Utils2['default'].ResizePositionProportionally(windowW * scale, windowH * scale, _AppConstants2['default'].MEDIA_GLOBAL_W, _AppConstants2['default'].MEDIA_GLOBAL_H, orientation);

			var videoTop = (this.compassPadding << 1) + windowH + this.posterImgCss.top;
			videoTop = _AppStore2['default'].Detector.isMobile ? this.buyBtn.y + this.buyBtn.height + 100 : videoTop;

			var videoCss = {
				width: videoResize.width,
				height: videoResize.height,
				top: videoTop,
				left: (windowW >> 1) - (videoResize.width >> 1)
			};
			this.currentContainer.video.el.css(videoCss);
			this.videoTotalHeight = (this.posterImgCss.top << 1) + videoCss.height;
		}
	}, {
		key: 'updateTopButtonsPositions',
		value: function updateTopButtonsPositions() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var topPos = this.posterImgCss.top + this.posterImgCss.height + (windowH - (this.posterImgCss.top + this.posterImgCss.height) >> 1) - this.buyBtn.height - (this.buyBtn.height >> 1);
			topPos = _AppStore2['default'].Detector.isMobile ? this.posterImgCss.top + this.posterImgCss.height + 60 : topPos;
			this.buyBtn.position((windowW >> 1) - (this.buyBtn.width >> 1), topPos);
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
				var topPos = (_this3.posterImgCss.top >> 1) - (_this3.titleContainer.parent.height() >> 1);
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
			this.resizeMediaWrappers();
			this.updateTopButtonsPositions();
			this.resizeVideoWrapper();
			this.updatePageHeight();

			var previousXPos = _AppStore2['default'].Detector.isMobile ? 0 : (this.posterImgCss.left >> 1) - (this.previousBtn.width >> 1) - 4;
			var nextXPos = _AppStore2['default'].Detector.isMobile ? windowW - this.previousBtn.width : this.posterImgCss.left + this.posterImgCss.width + (windowW - (this.posterImgCss.left + this.posterImgCss.width) >> 1) - (this.nextBtn.width >> 1) + 4;

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
			this.previousBtn.componentWillUnmount();
			this.nextBtn.componentWillUnmount();
			this.buyBtn.componentWillUnmount();
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return PlanetCampaignPage;
})(_BaseCampaignPage3['default']);

exports['default'] = PlanetCampaignPage;
module.exports = exports['default'];

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./ArrowBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ArrowBtn.js","./BaseCampaignPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BaseCampaignPage.js","./CompassesContainer":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassesContainer.js","./PlayBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlayBtn.js","./RectangleBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/RectangleBtn.js","./TitleSwitcher":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/TitleSwitcher.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlanetExperiencePage.js":[function(require,module,exports){
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

var PlanetExperiencePage = (function (_BasePlanetPage) {
	_inherits(PlanetExperiencePage, _BasePlanetPage);

	function PlanetExperiencePage(props) {
		_classCallCheck(this, PlanetExperiencePage);

		_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'constructor', this).call(this, props);
	}

	_createClass(PlanetExperiencePage, [{
		key: 'componentDidMount',
		value: function componentDidMount() {

			var infos = _AppStore2['default'].generalInfosLangScope();

			var XpClazz = this.getExperienceById(this.id);
			this.experience = new XpClazz(this.pxContainer);
			this.experience.componentDidMount();

			this.compassesContainer = new _CompassesContainer2['default'](this.pxContainer, this.child);
			this.compassesContainer.id = this.id;
			this.compassesContainer.componentDidMount();

			this.goCampaignBtn = new _RectangleBtn2['default'](this.child.find('.go-campaign-btn'), infos.campaign_title);
			this.goCampaignBtn.btnClicked = this.onGoCampaignClicked;
			this.goCampaignBtn.componentDidMount();

			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'componentDidMount', this).call(this);
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
			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'didTransitionInComplete', this).call(this);
			this.compassesContainer.didTransitionInComplete();
		}
	}, {
		key: 'willTransitionOut',
		value: function willTransitionOut() {
			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'willTransitionOut', this).call(this);
			this.compassesContainer.willTransitionOut();
		}
	}, {
		key: 'update',
		value: function update() {
			this.experience.update();
			this.compassesContainer.update();
		}
	}, {
		key: 'resize',
		value: function resize() {
			var _this = this;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.experience.resize();
			this.compassesContainer.resize();

			setTimeout(function () {
				var compassContainerBottom = _this.compassesContainer.y + _this.compassesContainer.height;
				_this.goCampaignBtn.position((windowW >> 1) - (_this.goCampaignBtn.width >> 1), compassContainerBottom + (_this.goCampaignBtn.height >> 1));
			}, 0);

			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.compassesContainer.componentWillUnmount();
			this.goCampaignBtn.componentWillUnmount();
			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return PlanetExperiencePage;
})(_BasePlanetPage3['default']);

exports['default'] = PlanetExperiencePage;
module.exports = exports['default'];

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./BasePlanetPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js","./CompassesContainer":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassesContainer.js","./RectangleBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/RectangleBtn.js","./experiences/AlaskaXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/AlaskaXP.js","./experiences/GemStoneXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/GemStoneXP.js","./experiences/MetalXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/MetalXP.js","./experiences/SkiXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/SkiXP.js","./experiences/WoodXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/WoodXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlayBtn.js":[function(require,module,exports){
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
			// var knotsEl = this.element.find(".knot")
			// var linesEl = this.element.find(".line")
			// var radius = 3
			// var margin = 30
			// this.lineSize = AppStore.getLineWidth()
			// for (var i = 0; i < knotsEl.length; i++) {
			// 	var knot = $(knotsEl[i])
			// 	knot.attr('r', radius)
			// };
			// for (var i = 0; i < linesEl.length; i++) {
			// 	var line = $(linesEl[i])
			// 	line.css('stroke-width', this.lineSize)
			// };

			// var startX = margin >> 1
			// var startY = margin
			// var offsetUpDown = 0.6
			// $(knotsEl.get(0)).attr({
			// 	'cx': startX + 0,
			// 	'cy': startY + 0
			// })
			// $(knotsEl.get(1)).attr({
			// 	'cx': startX + margin,
			// 	'cy': startY + 0
			// })
			// $(knotsEl.get(2)).attr({
			// 	'cx': startX + (margin*2),
			// 	'cy': startY + 0
			// })
			// $(knotsEl.get(3)).attr({
			// 	'cx': startX + (margin * offsetUpDown),
			// 	'cy': startY - (margin * offsetUpDown)
			// })
			// $(knotsEl.get(4)).attr({
			// 	'cx': startX + (margin * offsetUpDown),
			// 	'cy': startY + (margin * offsetUpDown)
			// })
			// $(linesEl.get(0)).attr({
			// 	'x1': startX + 0,
			// 	'y1': startY + 0,
			// 	'x2': startX + margin,
			// 	'y2': startY + 0
			// })
			// $(linesEl.get(1)).attr({
			// 	'x1': startX + margin,
			// 	'y1': startY + 0,
			// 	'x2': startX + (margin*2),
			// 	'y2': startY + 0
			// })
			// $(linesEl.get(2)).attr({
			// 	'x1': startX + 0,
			// 	'y1': startY + 0,
			// 	'x2': startX + (margin * offsetUpDown),
			// 	'y2': startY - (margin * offsetUpDown)
			// })
			// $(linesEl.get(3)).attr({
			// 	'x1': startX + 0,
			// 	'y1': startY + 0,
			// 	'x2': startX + (margin * offsetUpDown),
			// 	'y2': startY + (margin * offsetUpDown)
			// })

			// var offset = 10
			// this.tlOver.to(knotsEl[0], 1, { x:-offset+(radius >> 1), force3D:true, ease:Elastic.easeOut }, 0)
			// this.tlOver.to(knotsEl[1], 1, { x:-offset, force3D:true, ease:Elastic.easeOut }, 0)
			// this.tlOver.to(knotsEl[2], 1, { x:-offset, force3D:true, ease:Elastic.easeOut }, 0)
			// this.tlOver.to(linesEl[0], 1, { scaleX:1.1, x:-offset, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			// this.tlOver.to(linesEl[1], 1, { scaleX:1.1, x:-offset, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			// this.tlOver.to(linesEl[2], 1, { x:-offset, rotation:'10deg', force3D:true, transformOrigin:'0% 100%', ease:Elastic.easeOut }, 0)
			// this.tlOver.to(linesEl[3], 1, { x:-offset, rotation:'-10deg', force3D:true, transformOrigin:'0% 0%', ease:Elastic.easeOut }, 0)
			// this.tlOver.to(knotsEl[3], 1, { x:-offset/2, y:(offset/2)-radius, force3D:true, ease:Elastic.easeOut }, 0)
			// this.tlOver.to(knotsEl[4], 1, { x:-offset/2, y:-(offset/2)+radius, force3D:true, ease:Elastic.easeOut }, 0)

			// this.tlOut.to(knotsEl[0], 1, { x:0, force3D:true, ease:Elastic.easeOut }, 0)
			// this.tlOut.to(knotsEl[1], 1, { x:0, force3D:true, ease:Elastic.easeOut }, 0)
			// this.tlOut.to(knotsEl[2], 1, { x:0, force3D:true, ease:Elastic.easeOut }, 0)
			// this.tlOut.to(linesEl[0], 1, { scaleX:1, x:0, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			// this.tlOut.to(linesEl[1], 1, { scaleX:1, x:0, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			// this.tlOut.to(linesEl[2], 1, { x:0, rotation:'0deg', force3D:true, transformOrigin:'0% 100%', ease:Elastic.easeOut }, 0)
			// this.tlOut.to(linesEl[3], 1, { x:0, rotation:'0deg', force3D:true, transformOrigin:'0% 0%', ease:Elastic.easeOut }, 0)
			// this.tlOut.to(knotsEl[3], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)
			// this.tlOut.to(knotsEl[4], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)

			// this.tlOver.pause(0)
			// this.tlOut.pause(0)

			// this.rollover = this.rollover.bind(this)
			// this.rollout = this.rollout.bind(this)
			// this.click = this.click.bind(this)
			// this.element.on('mouseenter', this.rollover)
			// this.element.on('mouseleave', this.rollout)
			// if(this.btnClicked != undefined) this.element.on('click', this.click)

			// this.width = margin * 3
			// this.height = margin * 2
			// this.element.css({
			// 	width: this.width,
			// 	height: this.height
			// })
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

	return PlayBtn;
})();

exports['default'] = PlayBtn;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/RectangleBtn.js":[function(require,module,exports){
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

				var titleW = _this.rectW;
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
				// this.click = this.click.bind(this)
				// this.element.on('mouseenter', this.rollover)
				// this.element.on('mouseleave', this.rollout)
				// this.element.on('click', this.click)
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
			if (this.btnClicked != undefined) this.btnClicked();
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
			// this.element.off('mouseenter', this.rollover)
			// this.element.off('mouseleave', this.rollout)
			// this.element.off('click', this.click)
		}
	}]);

	return RectangleBtn;
})();

exports['default'] = RectangleBtn;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ScrollBar.js":[function(require,module,exports){
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

},{"./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SmallCompass.js":[function(require,module,exports){
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
			this.titles.rotation += 0.2;
			this.rotateEl(this.titles.titleTop, this.titles.rotation);
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./../utils/Vec2":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Vec2.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SpringGarden.js":[function(require,module,exports){
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
		value: function componentDidMount(data, withFill, isInteractive, type) {
			this.params = data;
			type = type || _AppConstants2['default'].LANDING;
			this.color = type == _AppConstants2['default'].LANDING || this.params.highlight == false ? 0xffffff : this.params.color;
			this.withFill = withFill || false;
			if (this.params.highlight != undefined) {
				this.color = this.params.highlight == false ? 0xffffff : this.color;
				this.withFill = this.params.highlight;
			}
			this.isInteractive = isInteractive || false;
			var knotsData = this.params.knots;

			this.onClicked = this.onClicked.bind(this);
			if (this.isInteractive) {
				this.areaPolygonContainer.buttonMode = true;
				this.areaPolygonContainer.interactive = true;
				this.areaPolygonContainer.on('click', this.onClicked);
			} else {
				this.areaPolygonContainer.buttonMode = false;
				this.areaPolygonContainer.interactive = false;
			}

			for (var i = 0; i < this.knots.length; i++) {
				var newKnotScale = knotsData[i];
				var knot = this.knots[i];
				knot.changeSize(this.knotRadius);
				knot.toX = newKnotScale.x * this.radius;
				knot.toY = newKnotScale.y * this.radius;
			}
			this.container.rotation = _Utils2['default'].Rand(-4, 4);
			this.config.springLength = 200;
			this.assignOpenedConfig();
		}
	}, {
		key: 'onClicked',
		value: function onClicked() {
			var url = "/planet/" + this.id + '/' + this.params.id;
			_Router2['default'].setHash(url);
		}
	}, {
		key: 'update',
		value: function update() {
			this.areaPolygon.clear();
			if (this.withFill) {
				this.areaPolygon.beginFill(this.color);
				this.areaPolygon.lineStyle(0);
				this.areaPolygon.moveTo(this.knots[0].x, this.knots[0].y);
			} else {
				this.areaPolygon.lineStyle(this.lineW, this.color, 0.8);
			}
			var len = this.knots.length;
			var spring = this.config.spring;
			var friction = this.config.friction;
			for (var i = 0; i < len; i++) {
				var knot = this.knots[i];
				var previousKnot = this.knots[i - 1];
				previousKnot = previousKnot == undefined ? this.knots[len - 1] : previousKnot;

				_Utils2['default'].SpringTo(knot, knot.toX, knot.toY, i, spring, friction, this.config.springLength);
				knot.position(knot.x + knot.vx, knot.y + knot.vy);

				if (this.withFill) {
					this.areaPolygon.lineTo(knot.x, knot.y);
				} else {
					this.areaPolygon.moveTo(previousKnot.x, previousKnot.y);
					this.areaPolygon.lineTo(knot.x, knot.y);
				}
			}
			if (this.withFill) {
				this.areaPolygon.endFill();
			}
			this.config.springLength -= this.config.springLength * 0.1;
			this.container.rotation -= this.container.rotation * 0.1;
		}
	}, {
		key: 'assignOpenedConfig',
		value: function assignOpenedConfig() {
			this.config.spring = 0.03;
			this.config.friction = 0.92;
		}
	}, {
		key: 'clear',
		value: function clear() {
			for (var i = 0; i < this.knots.length; i++) {
				var knot = this.knots[i];
				knot.clear();
			}
			this.withFill = false;
			this.areaPolygon.clear();
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			if (this.isInteractive) {
				this.areaPolygonContainer.buttonMode = false;
				this.areaPolygonContainer.interactive = false;
				this.areaPolygonContainer.off('click', this.onClicked);
			}
		}
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/TitleSwitcher.js":[function(require,module,exports){
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
		}
	}]);

	return TitleSwitcher;
})();

exports['default'] = TitleSwitcher;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js","./RectangleBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/RectangleBtn.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/AlaskaXP.js":[function(require,module,exports){
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

var AlaskaXP = (function (_BaseXP) {
	_inherits(AlaskaXP, _BaseXP);

	function AlaskaXP(parentContainer) {
		_classCallCheck(this, AlaskaXP);

		_get(Object.getPrototypeOf(AlaskaXP.prototype), 'constructor', this).call(this, parentContainer);
	}

	_createClass(AlaskaXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(AlaskaXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {
			_get(Object.getPrototypeOf(AlaskaXP.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
			_get(Object.getPrototypeOf(AlaskaXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(AlaskaXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return AlaskaXP;
})(_BaseXP3['default']);

exports['default'] = AlaskaXP;
module.exports = exports['default'];

},{"./BaseXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/BaseXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/BaseXP.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _AppStore = require('./../../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var BaseXP = (function () {
	function BaseXP(parentContainer) {
		_classCallCheck(this, BaseXP);

		this.pxContainer = _AppStore2['default'].getContainer();
		this.parentContainer = parentContainer;
		this.parentContainer.addChild(this.pxContainer);
	}

	_createClass(BaseXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {}
	}, {
		key: 'update',
		value: function update() {}
	}, {
		key: 'resize',
		value: function resize() {}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.parentContainer.removeChild(this.pxContainer);
			this.pxContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.pxContainer);
		}
	}]);

	return BaseXP;
})();

exports['default'] = BaseXP;
module.exports = exports['default'];

},{"./../../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/GemStoneXP.js":[function(require,module,exports){
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



var GemStoneXP = (function (_BaseXP) {
	_inherits(GemStoneXP, _BaseXP);

	function GemStoneXP(parentContainer) {
		_classCallCheck(this, GemStoneXP);

		_get(Object.getPrototypeOf(GemStoneXP.prototype), 'constructor', this).call(this, parentContainer);
	}

	_createClass(GemStoneXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'componentDidMount', this).call(this);

			// var explosionFrag = glslify('../shaders/gemstone/diffusion-mix-frag.glsl')

			// var imgUrl = AppStore.Preloader.getImageURL('gemstone-experience-noise-color')
			// console.log(imgUrl)
			// var texture = PIXI.Texture.fromImage(imgUrl)
			// this.sprite = new PIXI.Sprite(texture)

			// this.sprite.shader = new PIXI.AbstractFilter(null, explosionFrag, this.uniforms = {
			// 	resolution: { type: '2f', value: { x: 0, y: 0 } },
			// 	uNoise: {type: 'sampler2D', value: texture},
			// 	time: {type: '1f', value: 0},
			//    })

			//    this.pxContainer.addChild(this.sprite)

			// console.log(explosionFrag)
		}
	}, {
		key: 'update',
		value: function update() {
			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'update', this).call(this);
			this.uniforms.time.value += 0.1;
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
			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return GemStoneXP;
})(_BaseXP3['default']);

exports['default'] = GemStoneXP;
module.exports = exports['default'];

},{"./../../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./BaseXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/BaseXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/MetalXP.js":[function(require,module,exports){
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

var MetalXP = (function (_BaseXP) {
	_inherits(MetalXP, _BaseXP);

	function MetalXP(parentContainer) {
		_classCallCheck(this, MetalXP);

		_get(Object.getPrototypeOf(MetalXP.prototype), 'constructor', this).call(this, parentContainer);
	}

	_createClass(MetalXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(MetalXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {
			_get(Object.getPrototypeOf(MetalXP.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
			_get(Object.getPrototypeOf(MetalXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(MetalXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return MetalXP;
})(_BaseXP3['default']);

exports['default'] = MetalXP;
module.exports = exports['default'];

},{"./BaseXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/BaseXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/SkiXP.js":[function(require,module,exports){
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

var SkiXP = (function (_BaseXP) {
	_inherits(SkiXP, _BaseXP);

	function SkiXP(parentContainer) {
		_classCallCheck(this, SkiXP);

		_get(Object.getPrototypeOf(SkiXP.prototype), 'constructor', this).call(this, parentContainer);
	}

	_createClass(SkiXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(SkiXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {
			_get(Object.getPrototypeOf(SkiXP.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
			_get(Object.getPrototypeOf(SkiXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(SkiXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return SkiXP;
})(_BaseXP3['default']);

exports['default'] = SkiXP;
module.exports = exports['default'];

},{"./BaseXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/BaseXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/WoodXP.js":[function(require,module,exports){
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

var WoodXP = (function (_BaseXP) {
	_inherits(WoodXP, _BaseXP);

	function WoodXP(parentContainer) {
		_classCallCheck(this, WoodXP);

		_get(Object.getPrototypeOf(WoodXP.prototype), 'constructor', this).call(this, parentContainer);
	}

	_createClass(WoodXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(WoodXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {
			_get(Object.getPrototypeOf(WoodXP.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
			_get(Object.getPrototypeOf(WoodXP.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(WoodXP.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return WoodXP;
})(_BaseXP3['default']);

exports['default'] = WoodXP;
module.exports = exports['default'];

},{"./BaseXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/BaseXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/pages/Landing.js":[function(require,module,exports){
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
			};
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
			var url = "/planet/" + this.landingSlideshow.currentId + '/0';
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

},{"./../../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../ArrowBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ArrowBtn.js","./../Compass":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Compass.js","./../LandingSlideshow":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/LandingSlideshow.js","./../Page":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Page.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js":[function(require,module,exports){
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

	CAMPAIGN_IMAGE_SIZE: [1500, 973],

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

},{}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/dispatchers/AppDispatcher.js":[function(require,module,exports){
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

},{"flux":"/Users/panagiotisthomoglou/Projects/camper/node_modules/flux/index.js","object-assign":"object-assign"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/FrontContainer.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"1":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "		\n		<div id=\"mobile-menu\">\n			<a href=\"#!/landing\" class=\"logo\">\n				<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 136.013 49.375\" enable-background=\"new 0 0 136.013 49.375\" xml:space=\"preserve\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M82.141,8.002h3.354c1.213,0,1.717,0.499,1.717,1.725v7.137c0,1.231-0.501,1.736-1.705,1.736h-3.365V8.002z M82.523,24.617v8.426l-7.087-0.384V1.925H87.39c3.292,0,5.96,2.705,5.96,6.044v10.604c0,3.338-2.668,6.044-5.96,6.044H82.523z M33.491,7.913c-1.132,0-2.048,1.065-2.048,2.379v11.256h4.409V10.292c0-1.314-0.917-2.379-2.047-2.379H33.491z M32.994,0.974h1.308c4.702,0,8.514,3.866,8.514,8.634v25.224l-6.963,1.273v-7.848h-4.409l0.012,8.787l-6.974,2.018V9.608C24.481,4.839,28.292,0.974,32.994,0.974 M121.933,7.921h3.423c1.215,0,1.718,0.497,1.718,1.724v8.194c0,1.232-0.502,1.736-1.705,1.736h-3.436V7.921z M133.718,31.055v17.487l-6.906-3.368V31.591c0-4.92-4.588-5.08-4.588-5.08v16.774l-6.983-2.914V1.925h12.231c3.291,0,5.959,2.705,5.959,6.044v11.077c0,2.207-1.217,4.153-2.991,5.115C131.761,24.894,133.718,27.077,133.718,31.055 M10.809,0.833c-4.703,0-8.514,3.866-8.514,8.634v27.936c0,4.769,4.019,8.634,8.722,8.634l1.306-0.085c5.655-1.063,8.306-4.639,8.306-9.407v-8.94h-6.996v8.736c0,1.409-0.064,2.65-1.994,2.992c-1.231,0.219-2.417-0.816-2.417-2.132V10.151c0-1.314,0.917-2.381,2.047-2.381h0.315c1.13,0,2.048,1.067,2.048,2.381v8.464h6.996V9.467c0-4.768-3.812-8.634-8.514-8.634H10.809 M103.953,23.162h6.977v-6.744h-6.977V8.423l7.676-0.002V1.924H96.72v33.278c0,0,5.225,1.141,7.532,1.666c1.517,0.346,7.752,2.253,7.752,2.253v-7.015l-8.051-1.508V23.162z M46.879,1.927l0.003,32.35l7.123-0.895V18.985l5.126,10.426l5.126-10.484l0.002,13.664l7.022-0.054V1.895h-7.545L59.13,14.6L54.661,1.927H46.879z\"/></svg>\n			</a>\n			<div class=\"burger btn\">\n				<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 61.564 49.356\" enable-background=\"new 0 0 61.564 49.356\" xml:space=\"preserve\"><g><path d=\"M4.564,8.006c1.443,0,2.682-0.854,3.266-2.077h19.648c0.584,1.223,1.823,2.077,3.267,2.077c1.444,0,2.683-0.854,3.266-2.077h19.649c0.583,1.223,1.821,2.077,3.266,2.077c0.013,0,0.025-0.003,0.039-0.003c0.012,0,0.023,0.003,0.035,0.003c0.243,0,0.481-0.023,0.714-0.069c0.696-0.138,1.338-0.479,1.853-0.993c1.414-1.414,1.414-3.715-0.001-5.131c-0.411-0.411-0.917-0.683-1.457-0.848c-0.372-0.129-0.767-0.214-1.183-0.214c-1.443,0-2.682,0.853-3.266,2.076H34.011c-0.584-1.223-1.822-2.076-3.266-2.076s-2.682,0.853-3.267,2.076H7.83C7.247,1.603,6.007,0.75,4.564,0.75c-2.001,0-3.629,1.627-3.629,3.627C0.936,6.378,2.563,8.006,4.564,8.006z\"/><path d=\"M4.564,28.168c1.443,0,2.682-0.854,3.266-2.076h19.649c0.584,1.223,1.823,2.076,3.267,2.076s2.682-0.854,3.266-2.076h19.649c0.584,1.223,1.822,2.076,3.266,2.076c0.012,0,0.024-0.004,0.037-0.004c0.012,0,0.024,0.004,0.037,0.004c0.243,0,0.481-0.023,0.714-0.07c0.696-0.137,1.338-0.478,1.853-0.992c0.176-0.175,0.329-0.365,0.462-0.568c0.004-0.006,0.006-0.012,0.01-0.018c0.383-0.584,0.59-1.265,0.59-1.979c0-0.702-0.203-1.371-0.573-1.948c-0.01-0.016-0.016-0.034-0.027-0.051c-0.133-0.202-0.286-0.392-0.462-0.567c-0.686-0.685-1.597-1.062-2.565-1.062c-0.013,0-0.025,0.003-0.037,0.003c-0.013,0-0.025-0.003-0.037-0.003c-1.444,0-2.683,0.853-3.266,2.076H34.011c-0.583-1.223-1.821-2.076-3.266-2.076c-1.443,0-2.683,0.853-3.267,2.076H7.831c-0.584-1.223-1.823-2.076-3.266-2.076c-2.001,0-3.629,1.627-3.629,3.627S2.563,28.168,4.564,28.168z\"/><path d=\"M57,41.351c-0.013,0-0.025,0.004-0.037,0.004c-0.013,0-0.025-0.004-0.037-0.004c-1.443,0-2.682,0.853-3.266,2.075H34.011c-0.584-1.223-1.822-2.075-3.266-2.075s-2.682,0.853-3.267,2.075H7.83c-0.583-1.223-1.823-2.075-3.266-2.075c-2.001,0-3.629,1.627-3.629,3.626c0,2.001,1.628,3.629,3.629,3.629c1.443,0,2.683-0.854,3.266-2.077h19.648c0.584,1.223,1.823,2.077,3.267,2.077c1.444,0,2.683-0.854,3.266-2.077h19.649c0.583,1.223,1.821,2.077,3.266,2.077c0.012,0,0.024-0.004,0.037-0.004c0.012,0,0.024,0.004,0.037,0.004c0.243,0,0.481-0.023,0.714-0.07c0.697-0.138,1.339-0.479,1.853-0.992c1.414-1.414,1.414-3.717-0.001-5.131C58.88,41.728,57.969,41.351,57,41.351z\"/></g></svg>\n			</div>\n			<div class=\"menu-slider\">\n				<ul class='main-menu'>\n"
    + ((stack1 = helpers.each.call(depth0,(depth0 != null ? depth0.mobileMenu : depth0),{"name":"each","hash":{},"fn":this.program(2, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "				</ul>\n				<ul class='social-menu'>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias3(((helper = (helper = helpers.facebookUrl || (depth0 != null ? depth0.facebookUrl : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"facebookUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.002,0.167c-8.746,0-15.835,7.09-15.835,15.834c0,8.746,7.089,15.835,15.835,15.835c8.745,0,15.834-7.089,15.834-15.835C31.836,7.257,24.747,0.167,16.002,0.167 M22.322,13.539c0.007,0.138,0.009,0.279,0.009,0.42c0,4.302-3.272,9.259-9.259,9.259c-1.837,0-3.547-0.539-4.987-1.461c0.253,0.031,0.514,0.044,0.776,0.044c1.525,0,2.928-0.52,4.042-1.394c-1.424-0.023-2.625-0.965-3.039-2.258c0.198,0.037,0.402,0.058,0.611,0.058c0.298,0,0.585-0.038,0.858-0.115c-1.489-0.297-2.612-1.612-2.612-3.189v-0.041c0.44,0.242,0.942,0.389,1.475,0.407c-0.873-0.585-1.447-1.581-1.447-2.709c0-0.597,0.16-1.155,0.441-1.638c1.605,1.97,4.003,3.264,6.708,3.4c-0.057-0.238-0.085-0.485-0.085-0.74c0-1.797,1.458-3.254,3.254-3.254c0.937,0,1.783,0.395,2.375,1.028c0.742-0.146,1.438-0.417,2.067-0.789c-0.242,0.759-0.759,1.396-1.432,1.799c0.658-0.079,1.286-0.253,1.869-0.511C23.511,12.507,22.959,13.079,22.322,13.539\"/></svg>\n						</a>\n					</li>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias3(((helper = (helper = helpers.twitterUrl || (depth0 != null ? depth0.twitterUrl : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"twitterUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.001,0.167c-8.745,0-15.834,7.09-15.834,15.834c0,8.745,7.089,15.835,15.834,15.835c8.745,0,15.834-7.09,15.834-15.835C31.836,7.257,24.746,0.167,16.001,0.167 M19.498,13.32l-0.184,2.369h-2.427v8.229h-3.068v-8.229h-1.638V13.32h1.638v-1.592c0-0.701,0.017-1.782,0.527-2.453c0.536-0.709,1.273-1.191,2.541-1.191c2.066,0,2.935,0.295,2.935,0.295l-0.41,2.425c0,0-0.682-0.196-1.318-0.196c-0.637,0-1.207,0.227-1.207,0.863v1.85H19.498z\"/></svg>\n						</a>\n					</li>\n					<li>\n						<a target=\"_blank\" href=\""
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

  return "\n		<header id=\"header\">\n			<a href=\"#!/landing\" class=\"logo\">\n				<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 136.013 49.375\" enable-background=\"new 0 0 136.013 49.375\" xml:space=\"preserve\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M82.141,8.002h3.354c1.213,0,1.717,0.499,1.717,1.725v7.137c0,1.231-0.501,1.736-1.705,1.736h-3.365V8.002z M82.523,24.617v8.426l-7.087-0.384V1.925H87.39c3.292,0,5.96,2.705,5.96,6.044v10.604c0,3.338-2.668,6.044-5.96,6.044H82.523z M33.491,7.913c-1.132,0-2.048,1.065-2.048,2.379v11.256h4.409V10.292c0-1.314-0.917-2.379-2.047-2.379H33.491z M32.994,0.974h1.308c4.702,0,8.514,3.866,8.514,8.634v25.224l-6.963,1.273v-7.848h-4.409l0.012,8.787l-6.974,2.018V9.608C24.481,4.839,28.292,0.974,32.994,0.974 M121.933,7.921h3.423c1.215,0,1.718,0.497,1.718,1.724v8.194c0,1.232-0.502,1.736-1.705,1.736h-3.436V7.921z M133.718,31.055v17.487l-6.906-3.368V31.591c0-4.92-4.588-5.08-4.588-5.08v16.774l-6.983-2.914V1.925h12.231c3.291,0,5.959,2.705,5.959,6.044v11.077c0,2.207-1.217,4.153-2.991,5.115C131.761,24.894,133.718,27.077,133.718,31.055 M10.809,0.833c-4.703,0-8.514,3.866-8.514,8.634v27.936c0,4.769,4.019,8.634,8.722,8.634l1.306-0.085c5.655-1.063,8.306-4.639,8.306-9.407v-8.94h-6.996v8.736c0,1.409-0.064,2.65-1.994,2.992c-1.231,0.219-2.417-0.816-2.417-2.132V10.151c0-1.314,0.917-2.381,2.047-2.381h0.315c1.13,0,2.048,1.067,2.048,2.381v8.464h6.996V9.467c0-4.768-3.812-8.634-8.514-8.634H10.809 M103.953,23.162h6.977v-6.744h-6.977V8.423l7.676-0.002V1.924H96.72v33.278c0,0,5.225,1.141,7.532,1.666c1.517,0.346,7.752,2.253,7.752,2.253v-7.015l-8.051-1.508V23.162z M46.879,1.927l0.003,32.35l7.123-0.895V18.985l5.126,10.426l5.126-10.484l0.002,13.664l7.022-0.054V1.895h-7.545L59.13,14.6L54.661,1.927H46.879z\"/></svg>\n			</a>\n			<div class=\"home-btn\"><a href=\"#!/landing\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.home_txt : stack1), depth0))
    + "</a></div>\n			<div class=\"camper-lab\"><a target=\"_blank\" href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.camper_lab_url : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.camper_lab : stack1), depth0))
    + "</a></div>\n			<div class=\"shop-wrapper btn\">\n				<div class=\"shop-title\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_title : stack1), depth0))
    + "</div>\n				<ul class=\"submenu-wrapper\">\n					<li class=\"sub-0\"><a target=\"_blank\" href='"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_men_url : stack1), depth0))
    + "'>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_men : stack1), depth0))
    + "</a></li>\n					<li class=\"sub-1\"><a target=\"_blank\" href='"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_women_url : stack1), depth0))
    + "'>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_women : stack1), depth0))
    + "</a></li>\n				</ul>\n			</div>\n		</header>\n		<footer id=\"footer\" class=\"btn\">\n			<div id=\"social-wrapper\">\n				<div class=\"social-title\">SOCIAL</div>\n				<ul>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.facebookUrl || (depth0 != null ? depth0.facebookUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"facebookUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.002,0.167c-8.746,0-15.835,7.09-15.835,15.834c0,8.746,7.089,15.835,15.835,15.835c8.745,0,15.834-7.089,15.834-15.835C31.836,7.257,24.747,0.167,16.002,0.167 M22.322,13.539c0.007,0.138,0.009,0.279,0.009,0.42c0,4.302-3.272,9.259-9.259,9.259c-1.837,0-3.547-0.539-4.987-1.461c0.253,0.031,0.514,0.044,0.776,0.044c1.525,0,2.928-0.52,4.042-1.394c-1.424-0.023-2.625-0.965-3.039-2.258c0.198,0.037,0.402,0.058,0.611,0.058c0.298,0,0.585-0.038,0.858-0.115c-1.489-0.297-2.612-1.612-2.612-3.189v-0.041c0.44,0.242,0.942,0.389,1.475,0.407c-0.873-0.585-1.447-1.581-1.447-2.709c0-0.597,0.16-1.155,0.441-1.638c1.605,1.97,4.003,3.264,6.708,3.4c-0.057-0.238-0.085-0.485-0.085-0.74c0-1.797,1.458-3.254,3.254-3.254c0.937,0,1.783,0.395,2.375,1.028c0.742-0.146,1.438-0.417,2.067-0.789c-0.242,0.759-0.759,1.396-1.432,1.799c0.658-0.079,1.286-0.253,1.869-0.511C23.511,12.507,22.959,13.079,22.322,13.539\"/></svg>\n						</a>\n					</li>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.twitterUrl || (depth0 != null ? depth0.twitterUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"twitterUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.001,0.167c-8.745,0-15.834,7.09-15.834,15.834c0,8.745,7.089,15.835,15.834,15.835c8.745,0,15.834-7.09,15.834-15.835C31.836,7.257,24.746,0.167,16.001,0.167 M19.498,13.32l-0.184,2.369h-2.427v8.229h-3.068v-8.229h-1.638V13.32h1.638v-1.592c0-0.701,0.017-1.782,0.527-2.453c0.536-0.709,1.273-1.191,2.541-1.191c2.066,0,2.935,0.295,2.935,0.295l-0.41,2.425c0,0-0.682-0.196-1.318-0.196c-0.637,0-1.207,0.227-1.207,0.863v1.85H19.498z\"/></svg>\n						</a>\n					</li>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.instagramUrl || (depth0 != null ? depth0.instagramUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"instagramUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M19.413,12.602l-0.009-2.686l2.685-0.008v2.684L19.413,12.602z M16.004,18.788c1.536,0,2.787-1.25,2.787-2.787c0-0.605-0.196-1.166-0.528-1.624c-0.507-0.703-1.329-1.163-2.259-1.163c-0.931,0-1.753,0.46-2.26,1.163c-0.33,0.458-0.527,1.019-0.527,1.624C13.217,17.538,14.467,18.788,16.004,18.788z M20.333,16.001c0,2.387-1.942,4.33-4.329,4.33c-2.388,0-4.329-1.943-4.329-4.33c0-0.575,0.114-1.123,0.318-1.624H9.629v6.481c0,0.836,0.681,1.518,1.518,1.518h9.714c0.837,0,1.517-0.682,1.517-1.518v-6.481h-2.363C20.217,14.878,20.333,15.426,20.333,16.001z M31.836,16.001c0,8.744-7.09,15.835-15.835,15.835S0.167,24.745,0.167,16.001c0-8.745,7.089-15.834,15.834-15.834S31.836,7.256,31.836,16.001z M23.921,11.144c0-1.688-1.373-3.06-3.062-3.06h-9.713c-1.687,0-3.06,1.371-3.06,3.06v9.714c0,1.688,1.373,3.06,3.06,3.06h9.713c1.688,0,3.062-1.372,3.062-3.06V11.144z\"/></svg>\n						</a>\n					</li>\n				</ul>\n			</div>\n		</footer>\n\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return "<div>\n\n\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.isMobile : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.program(4, data, 0),"data":data})) != null ? stack1 : "")
    + "\n</div>";
},"useData":true});

},{"hbsfy/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/PagesContainer.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div id='pages-container'>\n	<div id='page-a'></div>\n	<div id='page-b'></div>\n</div>";
},"useData":true});

},{"hbsfy/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/PlanetCampaignPage.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"1":function(depth0,helpers,partials,data) {
    return "\n";
},"3":function(depth0,helpers,partials,data) {
    return "		<div id=\"scrollbar-view\">\n			<div class=\"relative\">\n				<div class=\"scroll-grab btn\"></div>\n				<div class=\"scroll-bg btn\"></div>\n			</div>\n		</div>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "<div class='page-wrapper'>\n	\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.isMobile : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "\n\n\n	<div class=\"interface absolute\">\n\n		<div class=\"slideshow-title\">\n			<div class=\"planet-title\"></div>\n			<div class=\"planet-name\"></div>\n		</div>\n\n		<div class=\"compasses-texts-wrapper\"></div>\n		\n		<div class=\"buy-btn btn\">\n			<div class=\"dots-rectangle-btn btn\">\n				<div class=\"btn-title\"></div>\n				<svg>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\"/>\n					<line class=\"line\"/>\n					<line class=\"line\" />\n					<line class=\"line\" />\n				</svg>\n			</div>\n			<div class=\"product-title-wrapper\">\n				<div class=\"product-title title-a\"></div>\n				<div class=\"product-title title-b\"></div>\n			</div>\n		</div>\n		<div class=\"product-containers-wrapper\">\n			<div class=\"product-container product-container-a\">\n				<div class=\"poster-wrapper\">\n					<div class=\"spinner-img spinner-wrapper\">\n						<svg width=\"100%\" viewBox=\"0 0 300 300\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n							<path d=\"M 150,0 a 150,150 0 0,1 106.066,256.066 l -35.355,-35.355 a -100,-100 0 0,0 -70.711,-170.711 z\" fill=\"#76f19a\">\n								<animateTransform attributeName=\"transform\" attributeType=\"XML\" type=\"rotate\" from=\"0 150 150\" to=\"360 150 150\" begin=\"0s\" dur=\"0.5s\" fill=\"freeze\" repeatCount=\"indefinite\"></animateTransform>\n							</path>\n						</svg>\n					</div>\n					<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n				</div>\n				<div class=\"video-wrapper btn\">\n					<div class=\"video-container\"></div>\n				</div>\n			</div>\n			<div class=\"product-container product-container-b\">\n				<div class=\"poster-wrapper\">\n					<div class=\"spinner-img spinner-wrapper\">\n						<svg width=\"100%\" viewBox=\"0 0 300 300\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n							<path d=\"M 150,0 a 150,150 0 0,1 106.066,256.066 l -35.355,-35.355 a -100,-100 0 0,0 -70.711,-170.711 z\" fill=\"#76f19a\">\n								<animateTransform attributeName=\"transform\" attributeType=\"XML\" type=\"rotate\" from=\"0 150 150\" to=\"360 150 150\" begin=\"0s\" dur=\"0.5s\" fill=\"freeze\" repeatCount=\"indefinite\"></animateTransform>\n							</path>\n						</svg>\n					</div>\n					<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n				</div>\n				<div class=\"video-wrapper btn\">\n					<div class=\"video-container\"></div>\n				</div>\n			</div>\n		</div>\n	</div>\n\n	<div class=\"interface fixed\">\n		<div class=\"previous-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"next-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n	</div>\n\n</div>";
},"useData":true});

},{"hbsfy/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/PlanetExperiencePage.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class='page-wrapper'>\n	<div class=\"compasses-texts-wrapper\">\n	</div>\n	<div class=\"interface\">\n		<div class=\"go-campaign-btn dots-rectangle-btn btn\">\n			<div class=\"btn-title\"></div>\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n	</div>\n</div>";
},"useData":true});

},{"hbsfy/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/pages/Landing.hbs":[function(require,module,exports){
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

},{"hbsfy/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/GlobalEvents.js":[function(require,module,exports){
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
			_AppStore2['default'].Mouse = new PIXI.Point();
		}
	}, {
		key: 'resize',
		value: function resize() {
			_AppActions2['default'].windowResize(window.innerWidth, window.innerHeight);
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

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Pool.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _objectpool = require('objectpool');

var _objectpool2 = _interopRequireDefault(_objectpool);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _SpringGarden = require('./../components/SpringGarden');

var _SpringGarden2 = _interopRequireDefault(_SpringGarden);

var Pool = (function () {
	function Pool() {
		_classCallCheck(this, Pool);

		var planets = _AppStore2['default'].planets();
		var pxContainerNum = 20 + planets.length * 1;
		var graphicsNum = planets.length * 3 - 2;
		var spritesNum = planets.length;
		var springGardensNum = 10;

		this.timelines = _objectpool2['default'].generate(TimelineMax, { count: 20 });
		this.pxContainers = _objectpool2['default'].generate(PIXI.Container, { count: pxContainerNum });
		this.graphics = _objectpool2['default'].generate(PIXI.Graphics, { count: graphicsNum });
		this.sprites = _objectpool2['default'].generate(PIXI.Sprite, { count: spritesNum });
		this.springGardens = _objectpool2['default'].generate(_SpringGarden2['default'], { count: springGardensNum });
	}

	_createClass(Pool, [{
		key: 'getTimeline',
		value: function getTimeline() {
			var tl = this.timelines.get();
			tl.kill();
			tl.clear();
			return tl;
		}
	}, {
		key: 'releaseTimeline',
		value: function releaseTimeline(item) {
			item.kill();
			item.clear();
			this.timelines.release(item);
		}
	}, {
		key: 'getContainer',
		value: function getContainer() {
			var container = this.pxContainers.get();
			// console.log('get >>>>>>>>>>>>>>>', container)
			container.scale.x = 1;
			container.scale.y = 1;
			container.position.x = 0;
			container.position.y = 0;
			container.skew.x = 0;
			container.skew.y = 0;
			container.pivot.x = 0;
			container.pivot.y = 0;
			container.rotation = 0;
			container.alpha = 1;
			return container;
		}
	}, {
		key: 'releaseContainer',
		value: function releaseContainer(item) {
			// console.log('release <<<<<<<<<<<<<<', item)
			this.pxContainers.release(item);
		}
	}, {
		key: 'getGraphics',
		value: function getGraphics() {
			var g = this.graphics.get();
			g.clear();
			g.scale.x = 1;
			g.scale.y = 1;
			g.position.x = 0;
			g.position.y = 0;
			g.skew.x = 0;
			g.skew.y = 0;
			g.pivot.x = 0;
			g.pivot.y = 0;
			g.rotation = 0;
			return g;
		}
	}, {
		key: 'releaseGraphics',
		value: function releaseGraphics(item) {
			this.graphics.release(item);
		}
	}, {
		key: 'getSprite',
		value: function getSprite() {
			return this.sprites.get();
		}
	}, {
		key: 'releaseSprite',
		value: function releaseSprite(item) {
			this.sprites.release(item);
		}
	}, {
		key: 'getSpringGarden',
		value: function getSpringGarden() {
			return this.springGardens.get();
		}
	}, {
		key: 'releaseSpringGarden',
		value: function releaseSpringGarden(item) {
			this.springGardens.release(item);
		}
	}]);

	return Pool;
})();

exports['default'] = Pool;
module.exports = exports['default'];

},{"./../components/SpringGarden":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SpringGarden.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","objectpool":"objectpool"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Preloader.js":[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Preloader = (function () {
	function Preloader() {
		_classCallCheck(this, Preloader);

		this.queue = new createjs.LoadQueue(true);
		this.queue.on("complete", this.onManifestLoadCompleted, this);
		this.currentLoadedCallback = undefined;
	}

	_createClass(Preloader, [{
		key: "load",
		value: function load(manifest, onLoaded) {
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

},{}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js":[function(require,module,exports){
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
				page: ['landing'] //valid sections
			};
			var planetProductSection = _crossroads2['default'].addRoute('/planet/{planetId}/{productId}', this._onPlanetProductURLHandler.bind(this), 2);
			planetProductSection.rules = {
				planetId: planets,
				productId: /^[0-5]/
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

},{"./../../../../www/data/data":"/Users/panagiotisthomoglou/Projects/camper/www/data/data.json","./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","crossroads":"crossroads","hasher":"hasher"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/TransitionAnimations.js":[function(require,module,exports){
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
				timeline.fromTo(scope.pxContainer, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				var direction = _AppStore2['default'].getExperienceAnimationDirection() == _AppConstants2['default'].LEFT ? -1 : 1;
				timeline.fromTo(scope.pxContainer, 1, { x: windowW * direction, ease: Expo.easeInOut }, { x: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { x: windowW * direction, ease: Expo.easeInOut }, { x: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
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

		timeline.to(wrapper, 1, { opacity: 0, ease: Expo.easeInOut });

		switch (types.newType) {
			case _AppConstants2['default'].LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				var direction = _AppStore2['default'].getExperienceAnimationDirection() == _AppConstants2['default'].LEFT ? -1 : 1;
				timeline.fromTo(scope.pxContainer, 1, { x: 0, ease: Expo.easeInOut }, { x: -windowW * direction, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { x: 0, ease: Expo.easeInOut }, { x: -windowW * direction, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
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
				timeline.fromTo(scope.pxContainer, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y: windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
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
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH << 2, ease: Expo.easeInOut }, 0);
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
				timeline.fromTo(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
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
				timeline.to(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
				timeline.to(wrapper, 1, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.to(scope.pxContainer, 1, { y: -windowH << 2, ease: Expo.easeInOut }, 0);
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js":[function(require,module,exports){
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
    var hashObj = _Router2['default'].getNewHash();
    var targetId;
    var type = _getTypeOfPage();
    targetId = type.toLowerCase() + '-assets';
    var manifest = _addBasePathsToUrls(scope[targetId], scope.id, targetId, type);
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
function _getPageAssetsBasePathById(id, assetGroupId) {
    return AppStore.baseMediaPath() + '/image/planets/' + id + '/' + assetGroupId + '/';
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
        return JS_lang;
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
    generalInfosLangScope: function generalInfosLangScope() {
        return _getGeneralInfos();
    },
    getEmptyImgUrl: function getEmptyImgUrl() {
        return AppStore.getEnvironment()['static'] + 'image/empty.png';
    },
    mainImageUrl: function mainImageUrl(id, responsiveArray) {
        return AppStore.baseMediaPath() + 'image/planets/' + id + '/main-' + AppStore.responsiveImageWidth(responsiveArray) + '.jpg';
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
        var windowW = AppStore.Window.w;
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
        AppStore.PXContainer.add(item.child);
    },
    removePXChild: function removePXChild(item) {
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

        }
        return true;
    })
});

exports['default'] = AppStore;
module.exports = exports['default'];

},{"./../../../../www/data/data":"/Users/panagiotisthomoglou/Projects/camper/www/data/data.json","./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../dispatchers/AppDispatcher":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/dispatchers/AppDispatcher.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","eventemitter2":"eventemitter2","object-assign":"object-assign"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Autobind.js":[function(require,module,exports){
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

},{"is":"is"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js":[function(require,module,exports){
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
		key: 'Rand',
		value: function Rand(min, max) {
			return Math.random() * (max - min) + min;
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
			Utils.Style(div, 'translate3d(' + x + 'px,' + y + 'px,' + z + 'px)');
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
	}]);

	return Utils;
})();

exports['default'] = Utils;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Vec2.js":[function(require,module,exports){
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
	}]);

	return Vec2;
})();

exports["default"] = Vec2;
module.exports = exports["default"];

},{}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/raf.js":[function(require,module,exports){
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

},{}],"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/Pager.js":[function(require,module,exports){
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

},{"eventemitter2":"eventemitter2","flux":"/Users/panagiotisthomoglou/Projects/camper/node_modules/flux/index.js","object-assign":"object-assign"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BaseComponent.js":[function(require,module,exports){
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
			this.parent.append(this.child);
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

},{"./../../app/utils/Autobind":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Autobind.js","to-slug-case":"to-slug-case"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BasePage.js":[function(require,module,exports){
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

},{"./../../app/services/TransitionAnimations":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/TransitionAnimations.js","./../../app/stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./BaseComponent":"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BaseComponent.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BasePager.js":[function(require,module,exports){
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

var _lodashStringCapitalize = require('lodash/String/capitalize');

var _lodashStringCapitalize2 = _interopRequireDefault(_lodashStringCapitalize);

var _PagesContainer_hbs = require('./../../app/partials/PagesContainer.hbs');

var _PagesContainer_hbs2 = _interopRequireDefault(_PagesContainer_hbs);

var _AppStore = require('./../../app/stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

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
			if (newComponent != undefined) newComponent.child.css('z-index', 2);
			if (oldComponent != undefined) oldComponent.child.css('z-index', 1);
		}
	}, {
		key: 'setupNewComponent',
		value: function setupNewComponent(hash, template) {
			var id = (0, _lodashStringCapitalize2['default'])(hash.replace("/", ""));
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

},{"./../../app/partials/PagesContainer.hbs":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/PagesContainer.hbs","./../../app/stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../Pager":"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/Pager.js","./BaseComponent":"/Users/panagiotisthomoglou/Projects/camper/src/js/pager/components/BaseComponent.js","lodash/String/capitalize":"/Users/panagiotisthomoglou/Projects/camper/node_modules/lodash/String/capitalize.js"}],"/Users/panagiotisthomoglou/Projects/camper/www/data/data.json":[function(require,module,exports){
module.exports={
	"infos": {
		"twitter_url": "http://twitter.com",
		"facebook_url": "http://facebook.com",
		"instagram_url": "http://instagram.com",
		"lang": {
			"en": {
				"countries": {
					"GBR": "english",
					"FRA": "french",
					"ESP": "spanish",
					"ITA": "italian",
					"DEU": "german",
					"PRT": "portugese"
				},
				"legal": "legal",
				"legal_url": "http://google.com",
				"camper_lab": "camper lab",
				"camper_lab_url": "http://google.com",
				"shop_title": "shop",
				"shop_men": "man",
				"shop_men_url": "http://google.com",
				"shop_women": "woman",
				"shop_women_url": "http://google.com",
				"planet": "planet",
				"buy_title": "buy",
				"campaign_title": "see campaign",
				"home_txt": "HOME"
			},
			"fr": {
				"countries": {
					"GBR": "english",
					"FRA": "french",
					"ESP": "spanish",
					"ITA": "italian",
					"DEU": "german",
					"PRT": "portugese"
				},
				"legal": "legal",
				"legal_url": "http://google.com",
				"camper_lab": "camper lab",
				"camper_lab_url": "http://google.com",
				"shop_title": "shop",
				"shop_men": "man",
				"shop_men_url": "http://google.com",
				"shop_women": "woman",
				"shop_women_url": "http://google.com",
				"planet": "planet",
				"buy_title": "buy",
				"campaign_title": "see campaign",
				"home_txt": "HOME"
			},
			"es": {
				"countries": {
					"GBR": "english",
					"FRA": "french",
					"ESP": "spanish",
					"ITA": "italian",
					"DEU": "german",
					"PRT": "portugese"
				},
				"legal": "legal",
				"legal_url": "http://google.com",
				"camper_lab": "camper lab",
				"camper_lab_url": "http://google.com",
				"shop_title": "shop",
				"shop_men": "man",
				"shop_men_url": "http://google.com",
				"shop_women": "woman",
				"shop_women_url": "http://google.com",
				"planet": "planet",
				"buy_title": "buy",
				"campaign_title": "see campaign",
				"home_txt": "HOME"
			},
			"it": {
				"countries": {
					"GBR": "english",
					"FRA": "french",
					"ESP": "spanish",
					"ITA": "italian",
					"DEU": "german",
					"PRT": "portugese"
				},
				"legal": "legal",
				"legal_url": "http://google.com",
				"camper_lab": "camper lab",
				"camper_lab_url": "http://google.com",
				"shop_title": "shop",
				"shop_men": "man",
				"shop_men_url": "http://google.com",
				"shop_women": "woman",
				"shop_women_url": "http://google.com",
				"planet": "planet",
				"buy_title": "buy",
				"campaign_title": "see campaign",
				"home_txt": "HOME"
			},
			"de": {
				"countries": {
					"GBR": "english",
					"FRA": "french",
					"ESP": "spanish",
					"ITA": "italian",
					"DEU": "german",
					"PRT": "portugese"
				},
				"legal": "legal",
				"legal_url": "http://google.com",
				"camper_lab": "camper lab",
				"camper_lab_url": "http://google.com",
				"shop_title": "shop",
				"shop_men": "man",
				"shop_men_url": "http://google.com",
				"shop_women": "woman",
				"shop_women_url": "http://google.com",
				"planet": "planet",
				"buy_title": "buy",
				"campaign_title": "see campaign",
				"home_txt": "HOME"
			},
			"pt": {
				"countries": {
					"GBR": "english",
					"FRA": "french",
					"ESP": "spanish",
					"ITA": "italian",
					"DEU": "german",
					"PRT": "portugese"
				},
				"legal": "legal",
				"legal_url": "http://google.com",
				"camper_lab": "camper lab",
				"camper_lab_url": "http://google.com",
				"shop_title": "shop",
				"shop_men": "man",
				"shop_men_url": "http://google.com",
				"shop_women": "woman",
				"shop_women_url": "http://google.com",
				"planet": "planet",
				"buy_title": "buy",
				"campaign_title": "see campaign",
				"home_txt": "HOME"
			}
		}
	},

	"countries": [
		{
			"id": "GBR",
			"lang": "en",
			"url": "http://google.com"
		},{
			"id": "FRA",
			"lang": "fr",
			"url": "http://google.com"
		},{
			"id": "ESP",
			"lang": "es",
			"url": "http://google.com"
		},{
			"id": "ITA",
			"lang": "it",
			"url": "http://google.com"
		},{
			"id": "DEU",
			"lang": "de",
			"url": "http://google.com"
		},{
			"id": "PRT",
			"lang": "pt",
			"url": "http://google.com"
		}
	],
	"planets": ["ski", "metal", "alaska", "wood", "gemstone"],
	"elements": ["fire", "earth", "metal", "water", "wood"],
	"gender": ["male", "female", "animal"],

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
				"knots": [
					{"x":0.3, "y":-0.1},
					{"x":0.6, "y":-0.4},
					{"x":0.6, "y":-0.6}
				]
			},{
				"id": 3,
				"name": "FISS",
				"color": "0xdb3076",
				"video-id": "8fbp0pbww8",
				"knots": [
					{"x":-0.3, "y":-0.1},
					{"x":-0.6, "y":-0.4},
					{"x":-0.6, "y":-0.6}
				]
			},{
				"id": 4,
				"name": "FISS",
				"color": "0xf4ecda",
				"video-id": "8fbp0pbww8",
				"knots": [
					{"x":-0.1, "y":0.1},
					{"x":-0.2, "y":0.4},
					{"x":0.3, "y":0.5}
				]
			}
		],
		"metal": [
			{
				"id": 0,
				"name": "BELUGA",
				"color": "0x818181",
				"video-id": "gsun7amzq8",
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
				"video-id": "gldrv27k76",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "BELUGA",
				"color": "0x88a2c7",
				"video-id": "1mevrxz7v6",
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
				"video-id": "9qbhhpb89b",
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "ENDURO",
				"color": "0x62a8bb",
				"video-id": "pnr81ri2xo",
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
				"header-title": "Header",
				"footer-title": "Footer",
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
			],
			"campaign-assets": [
			]
		},
		"/planet/metal": {
			"id": "metal",
			"experience-assets": [
			],
			"campaign-assets": [
			]
		},
		"/planet/alaska": {
			"id": "alaska",
			"experience-assets": [
			],
			"campaign-assets": [
			]
		},
		"/planet/wood": {
			"id": "wood",
			"experience-assets": [
			],
			"campaign-assets": [
			]
		},
		"/planet/gemstone": {
			"id": "gemstone",
			"experience-assets": [
			],
			"campaign-assets": [
			]
		}
	}
}
},{}]},{},["/Users/panagiotisthomoglou/Projects/camper/src/js/Main.js"])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmx1eC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L2xpYi9EaXNwYXRjaGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvbGliL2ludmFyaWFudC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvYmFzZVRvU3RyaW5nLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9NYWluLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwVGVtcGxhdGUuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9hY3Rpb25zL0FwcEFjdGlvbnMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Fycm93QnRuLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9CYXNlQ2FtcGFpZ25QYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9CYXNlUGxhbmV0UGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzcy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzc1JpbmdzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Db21wYXNzZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Zyb250Q29udGFpbmVyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Lbm90LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9MYW5kaW5nU2xpZGVzaG93LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9QWENvbnRhaW5lci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1BsYW5ldENhbXBhaWduUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1BsYXlCdG4uanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1JlY3RhbmdsZUJ0bi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvU2Nyb2xsQmFyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9TbWFsbENvbXBhc3MuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1NwcmluZ0dhcmRlbi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvVGl0bGVTd2l0Y2hlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvQWxhc2thWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL0Jhc2VYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvR2VtU3RvbmVYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvTWV0YWxYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvU2tpWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL1dvb2RYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvcGFnZXMvTGFuZGluZy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbnN0YW50cy9BcHBDb25zdGFudHMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9kaXNwYXRjaGVycy9BcHBEaXNwYXRjaGVyLmpzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9Gcm9udENvbnRhaW5lci5oYnMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL1BhZ2VzQ29udGFpbmVyLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGxhbmV0Q2FtcGFpZ25QYWdlLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuaGJzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9wYWdlcy9MYW5kaW5nLmhicyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL0dsb2JhbEV2ZW50cy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1Bvb2wuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9QcmVsb2FkZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9Sb3V0ZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9UcmFuc2l0aW9uQW5pbWF0aW9ucy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3N0b3Jlcy9BcHBTdG9yZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3V0aWxzL0F1dG9iaW5kLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvVXRpbHMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC91dGlscy9WZWMyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvcmFmLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9QYWdlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvcGFnZXIvY29tcG9uZW50cy9CYXNlQ29tcG9uZW50LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VQYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VQYWdlci5qcyIsInd3dy9kYXRhL2RhdGEuanNvbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ25GLE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMxSCxPQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDMUgsT0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2hJLE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMvSCxPQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQUFBQyxNQUFNLEdBQUMsQ0FBQyxHQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDMUcsT0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLEVBQUUsTUFBTSxHQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsTUFBTSxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTs7QUFFM0csT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQzVFLE9BQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUM1RSxPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDNUUsT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNqSCxPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pILE9BQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDeEgsT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsUUFBUSxFQUFDLE1BQU0sRUFB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RSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNwRixVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNuRixVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNuRixVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDbEYsVUFBSyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUN0SCxVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNySCxVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNySCxVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBOztBQUV0SCxVQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakYsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pGLFVBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNqRixVQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakYsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakgsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakgsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FB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LENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDeEMsUUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQzFCLE1BQUssSUFBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7QUFDM0QsUUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ3JELFFBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUMxQjtBQUNELE9BQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUU7QUFDeEMsUUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDeEMsUUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQzFCLE1BQUssSUFBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO0FBQy9DLFFBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDekMsUUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQzFCO0dBQ0o7OztTQUNhLHdCQUFDLEtBQUssRUFBRSxLQUFLLEVBQUU7QUFDNUIsT0FBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLE9BQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUMzQixPQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BDLE9BQUcsSUFBSSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTtBQUNuQyxRQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUM5QixRQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ3pCLFFBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDekIsU0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ2xCLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNsQixRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQ2pELFFBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUM3RCxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7OztBQUduRSxRQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUM3QyxTQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBLEdBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUEsSUFBSyxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0FBQzNILFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTs7O0FBR3pDLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7QUFHakMsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDM0UsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7OztBQUczRSxTQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDcEMsU0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLFNBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNwQyxTQUFL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Q0FBQyxDQUFBOztBQUUvQixVQUFPLEtBQUssQ0FBQyxPQUFPO0FBQ25CLFFBQUssMEJBQWEsT0FBTztBQUN4QixZQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMvRyxZQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3JHLFVBQUs7QUFBQSxBQUNOLFFBQUssMEJBQWEsVUFBVTtBQUMzQixZQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMvRyxZQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3JHLFVBQUs7QUFBQSxBQUNO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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cy5EaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9saWIvRGlzcGF0Y2hlcicpXG4iLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIERpc3BhdGNoZXJcbiAqIEB0eXBlY2hlY2tzXG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCcuL2ludmFyaWFudCcpO1xuXG52YXIgX2xhc3RJRCA9IDE7XG52YXIgX3ByZWZpeCA9ICdJRF8nO1xuXG4vKipcbiAqIERpc3BhdGNoZXIgaXMgdXNlZCB0byBicm9hZGNhc3QgcGF5bG9hZHMgdG8gcmVnaXN0ZXJlZCBjYWxsYmFja3MuIFRoaXMgaXNcbiAqIGRpZmZlcmVudCBmcm9tIGdlbmVyaWMgcHViLXN1YiBzeXN0ZW1zIGluIHR3byB3YXlzOlxuICpcbiAqICAgMSkgQ2FsbGJhY2tzIGFyZSBub3Qgc3Vic2NyaWJlZCB0byBwYXJ0aWN1bGFyIGV2ZW50cy4gRXZlcnkgcGF5bG9hZCBpc1xuICogICAgICBkaXNwYXRjaGVkIHRvIGV2ZXJ5IHJlZ2lzdGVyZWQgY2FsbGJhY2suXG4gKiAgIDIpIENhbGxiYWNrcyBjYW4gYmUgZGVmZXJyZWQgaW4gd2hvbGUgb3IgcGFydCB1bnRpbCBvdGhlciBjYWxsYmFja3MgaGF2ZVxuICogICAgICBiZWVuIGV4ZWN1dGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGlzIGh5cG90aGV0aWNhbCBmbGlnaHQgZGVzdGluYXRpb24gZm9ybSwgd2hpY2hcbiAqIHNlbGVjdHMgYSBkZWZhdWx0IGNpdHkgd2hlbiBhIGNvdW50cnkgaXMgc2VsZWN0ZWQ6XG4gKlxuICogICB2YXIgZmxpZ2h0RGlzcGF0Y2hlciA9IG5ldyBEaXNwYXRjaGVyKCk7XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjb3VudHJ5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDb3VudHJ5U3RvcmUgPSB7Y291bnRyeTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjaXR5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDaXR5U3RvcmUgPSB7Y2l0eTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgYmFzZSBmbGlnaHQgcHJpY2Ugb2YgdGhlIHNlbGVjdGVkIGNpdHlcbiAqICAgdmFyIEZsaWdodFByaWNlU3RvcmUgPSB7cHJpY2U6IG51bGx9XG4gKlxuICogV2hlbiBhIHVzZXIgY2hhbmdlcyB0aGUgc2VsZWN0ZWQgY2l0eSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY2l0eS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ2l0eTogJ3BhcmlzJ1xuICogICB9KTtcbiAqXG4gKiBUaGlzIHBheWxvYWQgaXMgZGlnZXN0ZWQgYnkgYENpdHlTdG9yZWA6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY2l0eS11cGRhdGUnKSB7XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IHBheWxvYWQuc2VsZWN0ZWRDaXR5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgdXNlciBzZWxlY3RzIGEgY291bnRyeSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY291bnRyeS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ291bnRyeTogJ2F1c3RyYWxpYSdcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGJvdGggc3RvcmVzOlxuICpcbiAqICAgIENvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgQ291bnRyeVN0b3JlLmNvdW50cnkgPSBwYXlsb2FkLnNlbGVjdGVkQ291bnRyeTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIGNhbGxiYWNrIHRvIHVwZGF0ZSBgQ291bnRyeVN0b3JlYCBpcyByZWdpc3RlcmVkLCB3ZSBzYXZlIGEgcmVmZXJlbmNlXG4gKiB0byB0aGUgcmV0dXJuZWQgdG9rZW4uIFVzaW5nIHRoaXMgdG9rZW4gd2l0aCBgd2FpdEZvcigpYCwgd2UgY2FuIGd1YXJhbnRlZVxuICogdGhhdCBgQ291bnRyeVN0b3JlYCBpcyB1cGRhdGVkIGJlZm9yZSB0aGUgY2FsbGJhY2sgdGhhdCB1cGRhdGVzIGBDaXR5U3RvcmVgXG4gKiBuZWVkcyB0byBxdWVyeSBpdHMgZGF0YS5cbiAqXG4gKiAgIENpdHlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBtYXkgbm90IGJlIHVwZGF0ZWQuXG4gKiAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIGlzIG5vdyBndWFyYW50ZWVkIHRvIGJlIHVwZGF0ZWQuXG4gKlxuICogICAgICAgLy8gU2VsZWN0IHRoZSBkZWZhdWx0IGNpdHkgZm9yIHRoZSBuZXcgY291bnRyeVxuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBnZXREZWZhdWx0Q2l0eUZvckNvdW50cnkoQ291bnRyeVN0b3JlLmNvdW50cnkpO1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogVGhlIHVzYWdlIG9mIGB3YWl0Rm9yKClgIGNhbiBiZSBjaGFpbmVkLCBmb3IgZXhhbXBsZTpcbiAqXG4gKiAgIEZsaWdodFByaWNlU3RvcmUuZGlzcGF0Y2hUb2tlbiA9XG4gKiAgICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgICBzd2l0Y2ggKHBheWxvYWQuYWN0aW9uVHlwZSkge1xuICogICAgICAgICBjYXNlICdjb3VudHJ5LXVwZGF0ZSc6XG4gKiAgICAgICAgICAgZmxpZ2h0RGlzcGF0Y2hlci53YWl0Rm9yKFtDaXR5U3RvcmUuZGlzcGF0Y2hUb2tlbl0pO1xuICogICAgICAgICAgIEZsaWdodFByaWNlU3RvcmUucHJpY2UgPVxuICogICAgICAgICAgICAgZ2V0RmxpZ2h0UHJpY2VTdG9yZShDb3VudHJ5U3RvcmUuY291bnRyeSwgQ2l0eVN0b3JlLmNpdHkpO1xuICogICAgICAgICAgIGJyZWFrO1xuICpcbiAqICAgICAgICAgY2FzZSAnY2l0eS11cGRhdGUnOlxuICogICAgICAgICAgIEZsaWdodFByaWNlU3RvcmUucHJpY2UgPVxuICogICAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZShDb3VudHJ5U3RvcmUuY291bnRyeSwgQ2l0eVN0b3JlLmNpdHkpO1xuICogICAgICAgICAgIGJyZWFrO1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogVGhlIGBjb3VudHJ5LXVwZGF0ZWAgcGF5bG9hZCB3aWxsIGJlIGd1YXJhbnRlZWQgdG8gaW52b2tlIHRoZSBzdG9yZXMnXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcyBpbiBvcmRlcjogYENvdW50cnlTdG9yZWAsIGBDaXR5U3RvcmVgLCB0aGVuXG4gKiBgRmxpZ2h0UHJpY2VTdG9yZWAuXG4gKi9cblxuICBmdW5jdGlvbiBEaXNwYXRjaGVyKCkge1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmcgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZCA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IGZhbHNlO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCBldmVyeSBkaXNwYXRjaGVkIHBheWxvYWQuIFJldHVybnNcbiAgICogYSB0b2tlbiB0aGF0IGNhbiBiZSB1c2VkIHdpdGggYHdhaXRGb3IoKWAuXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLnJlZ2lzdGVyPWZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIGlkID0gX3ByZWZpeCArIF9sYXN0SUQrKztcbiAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0gPSBjYWxsYmFjaztcbiAgICByZXR1cm4gaWQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBjYWxsYmFjayBiYXNlZCBvbiBpdHMgdG9rZW4uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpZFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUudW5yZWdpc3Rlcj1mdW5jdGlvbihpZCkge1xuICAgIGludmFyaWFudChcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSxcbiAgICAgICdEaXNwYXRjaGVyLnVucmVnaXN0ZXIoLi4uKTogYCVzYCBkb2VzIG5vdCBtYXAgdG8gYSByZWdpc3RlcmVkIGNhbGxiYWNrLicsXG4gICAgICBpZFxuICAgICk7XG4gICAgZGVsZXRlIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXTtcbiAgfTtcblxuICAvKipcbiAgICogV2FpdHMgZm9yIHRoZSBjYWxsYmFja3Mgc3BlY2lmaWVkIHRvIGJlIGludm9rZWQgYmVmb3JlIGNvbnRpbnVpbmcgZXhlY3V0aW9uXG4gICAqIG9mIHRoZSBjdXJyZW50IGNhbGxiYWNrLiBUaGlzIG1ldGhvZCBzaG91bGQgb25seSBiZSB1c2VkIGJ5IGEgY2FsbGJhY2sgaW5cbiAgICogcmVzcG9uc2UgdG8gYSBkaXNwYXRjaGVkIHBheWxvYWQuXG4gICAqXG4gICAqIEBwYXJhbSB7YXJyYXk8c3RyaW5nPn0gaWRzXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS53YWl0Rm9yPWZ1bmN0aW9uKGlkcykge1xuICAgIGludmFyaWFudChcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyxcbiAgICAgICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogTXVzdCBiZSBpbnZva2VkIHdoaWxlIGRpc3BhdGNoaW5nLidcbiAgICApO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBpZHMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICB2YXIgaWQgPSBpZHNbaWldO1xuICAgICAgaWYgKHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSkge1xuICAgICAgICBpbnZhcmlhbnQoXG4gICAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdLFxuICAgICAgICAgICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogQ2lyY3VsYXIgZGVwZW5kZW5jeSBkZXRlY3RlZCB3aGlsZSAnICtcbiAgICAgICAgICAnd2FpdGluZyBmb3IgYCVzYC4nLFxuICAgICAgICAgIGlkXG4gICAgICAgICk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW52YXJpYW50KFxuICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0sXG4gICAgICAgICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogYCVzYCBkb2VzIG5vdCBtYXAgdG8gYSByZWdpc3RlcmVkIGNhbGxiYWNrLicsXG4gICAgICAgIGlkXG4gICAgICApO1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEaXNwYXRjaGVzIGEgcGF5bG9hZCB0byBhbGwgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXlsb2FkXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaD1mdW5jdGlvbihwYXlsb2FkKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgIXRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyxcbiAgICAgICdEaXNwYXRjaC5kaXNwYXRjaCguLi4pOiBDYW5ub3QgZGlzcGF0Y2ggaW4gdGhlIG1pZGRsZSBvZiBhIGRpc3BhdGNoLidcbiAgICApO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfc3RhcnREaXNwYXRjaGluZyhwYXlsb2FkKTtcbiAgICB0cnkge1xuICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MpIHtcbiAgICAgICAgaWYgKHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2soaWQpO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX3N0b3BEaXNwYXRjaGluZygpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogSXMgdGhpcyBEaXNwYXRjaGVyIGN1cnJlbnRseSBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmlzRGlzcGF0Y2hpbmc9ZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZztcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbCB0aGUgY2FsbGJhY2sgc3RvcmVkIHdpdGggdGhlIGdpdmVuIGlkLiBBbHNvIGRvIHNvbWUgaW50ZXJuYWxcbiAgICogYm9va2tlZXBpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrPWZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdID0gdHJ1ZTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0odGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCk7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdID0gdHJ1ZTtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IHVwIGJvb2trZWVwaW5nIG5lZWRlZCB3aGVuIGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcGF5bG9hZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX3N0YXJ0RGlzcGF0Y2hpbmc9ZnVuY3Rpb24ocGF5bG9hZCkge1xuICAgIGZvciAodmFyIGlkIGluIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzKSB7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0gPSBmYWxzZTtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkW2lkXSA9IGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gcGF5bG9hZDtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDbGVhciBib29ra2VlcGluZyB1c2VkIGZvciBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS4kRGlzcGF0Y2hlcl9zdG9wRGlzcGF0Y2hpbmc9ZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IG51bGw7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gIH07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBEaXNwYXRjaGVyO1xuIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgaW52YXJpYW50XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogVXNlIGludmFyaWFudCgpIHRvIGFzc2VydCBzdGF0ZSB3aGljaCB5b3VyIHByb2dyYW0gYXNzdW1lcyB0byBiZSB0cnVlLlxuICpcbiAqIFByb3ZpZGUgc3ByaW50Zi1zdHlsZSBmb3JtYXQgKG9ubHkgJXMgaXMgc3VwcG9ydGVkKSBhbmQgYXJndW1lbnRzXG4gKiB0byBwcm92aWRlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgYnJva2UgYW5kIHdoYXQgeW91IHdlcmVcbiAqIGV4cGVjdGluZy5cbiAqXG4gKiBUaGUgaW52YXJpYW50IG1lc3NhZ2Ugd2lsbCBiZSBzdHJpcHBlZCBpbiBwcm9kdWN0aW9uLCBidXQgdGhlIGludmFyaWFudFxuICogd2lsbCByZW1haW4gdG8gZW5zdXJlIGxvZ2ljIGRvZXMgbm90IGRpZmZlciBpbiBwcm9kdWN0aW9uLlxuICovXG5cbnZhciBpbnZhcmlhbnQgPSBmdW5jdGlvbihjb25kaXRpb24sIGZvcm1hdCwgYSwgYiwgYywgZCwgZSwgZikge1xuICBpZiAoZmFsc2UpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YXJpYW50IHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQnKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHZhciBlcnJvcjtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAnTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArXG4gICAgICAgICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLidcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhcmdzID0gW2EsIGIsIGMsIGQsIGUsIGZdO1xuICAgICAgdmFyIGFyZ0luZGV4ID0gMDtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAnSW52YXJpYW50IFZpb2xhdGlvbjogJyArXG4gICAgICAgIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107IH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIGVycm9yLmZyYW1lc1RvUG9wID0gMTsgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBpbnZhcmlhbnQncyBvd24gZnJhbWVcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbnZhcmlhbnQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvYmFzZScpO1xuXG52YXIgYmFzZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG4vLyBFYWNoIG9mIHRoZXNlIGF1Z21lbnQgdGhlIEhhbmRsZWJhcnMgb2JqZWN0LiBObyBuZWVkIHRvIHNldHVwIGhlcmUuXG4vLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxuXG52YXIgX1NhZmVTdHJpbmcgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcnKTtcblxudmFyIF9TYWZlU3RyaW5nMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9TYWZlU3RyaW5nKTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgX2ltcG9ydDIgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydDIpO1xuXG52YXIgX2ltcG9ydDMgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvcnVudGltZScpO1xuXG52YXIgcnVudGltZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQzKTtcblxudmFyIF9ub0NvbmZsaWN0ID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL25vLWNvbmZsaWN0Jyk7XG5cbnZhciBfbm9Db25mbGljdDIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfbm9Db25mbGljdCk7XG5cbi8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxuZnVuY3Rpb24gY3JlYXRlKCkge1xuICB2YXIgaGIgPSBuZXcgYmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoaGIsIGJhc2UpO1xuICBoYi5TYWZlU3RyaW5nID0gX1NhZmVTdHJpbmcyWydkZWZhdWx0J107XG4gIGhiLkV4Y2VwdGlvbiA9IF9FeGNlcHRpb24yWydkZWZhdWx0J107XG4gIGhiLlV0aWxzID0gVXRpbHM7XG4gIGhiLmVzY2FwZUV4cHJlc3Npb24gPSBVdGlscy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIGhiLlZNID0gcnVudGltZTtcbiAgaGIudGVtcGxhdGUgPSBmdW5jdGlvbiAoc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgfTtcblxuICByZXR1cm4gaGI7XG59XG5cbnZhciBpbnN0ID0gY3JlYXRlKCk7XG5pbnN0LmNyZWF0ZSA9IGNyZWF0ZTtcblxuX25vQ29uZmxpY3QyWydkZWZhdWx0J10oaW5zdCk7XG5cbmluc3RbJ2RlZmF1bHQnXSA9IGluc3Q7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGluc3Q7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O1xuZXhwb3J0cy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lO1xuXG52YXIgX2ltcG9ydCA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBWRVJTSU9OID0gJzMuMC4xJztcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSA2O1xuXG5leHBvcnRzLkNPTVBJTEVSX1JFVklTSU9OID0gQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc9PSAxLngueCcsXG4gIDU6ICc9PSAyLjAuMC1hbHBoYS54JyxcbiAgNjogJz49IDIuMC4wLWJldGEuMSdcbn07XG5cbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uIHJlZ2lzdGVySGVscGVyKG5hbWUsIGZuKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChmbikge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7XG4gICAgICB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbiB1bnJlZ2lzdGVySGVscGVyKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5oZWxwZXJzW25hbWVdO1xuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24gcmVnaXN0ZXJQYXJ0aWFsKG5hbWUsIHBhcnRpYWwpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHBhcnRpYWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdBdHRlbXB0aW5nIHRvIHJlZ2lzdGVyIGEgcGFydGlhbCBhcyB1bmRlZmluZWQnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBwYXJ0aWFsO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uIHVucmVnaXN0ZXJQYXJ0aWFsKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5wYXJ0aWFsc1tuYW1lXTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0SGVscGVycyhpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gQSBtaXNzaW5nIGZpZWxkIGluIGEge3tmb299fSBjb25zdHVjdC5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ01pc3NpbmcgaGVscGVyOiBcIicgKyBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdLm5hbWUgKyAnXCInKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmIChjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgICAgICAgb3B0aW9ucy5pZHMgPSBbb3B0aW9ucy5uYW1lXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMubmFtZSk7XG4gICAgICAgIG9wdGlvbnMgPSB7IGRhdGE6IGRhdGEgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ011c3QgcGFzcyBpdGVyYXRvciB0byAjZWFjaCcpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sXG4gICAgICAgIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICByZXQgPSAnJyxcbiAgICAgICAgZGF0YSA9IHVuZGVmaW5lZCxcbiAgICAgICAgY29udGV4dFBhdGggPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICBjb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pICsgJy4nO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4ZWNJdGVyYXRpb24oZmllbGQsIGluZGV4LCBsYXN0KSB7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICBkYXRhLmtleSA9IGZpZWxkO1xuICAgICAgICBkYXRhLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGRhdGEuZmlyc3QgPSBpbmRleCA9PT0gMDtcbiAgICAgICAgZGF0YS5sYXN0ID0gISFsYXN0O1xuXG4gICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBjb250ZXh0UGF0aCArIGZpZWxkO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbZmllbGRdLCB7XG4gICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIGJsb2NrUGFyYW1zOiBVdGlscy5ibG9ja1BhcmFtcyhbY29udGV4dFtmaWVsZF0sIGZpZWxkXSwgW2NvbnRleHRQYXRoICsgZmllbGQsIG51bGxdKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IgKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGkgPCBqOyBpKyspIHtcbiAgICAgICAgICBleGVjSXRlcmF0aW9uKGksIGksIGkgPT09IGNvbnRleHQubGVuZ3RoIC0gMSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwcmlvcktleSA9IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIC8vIFdlJ3JlIHJ1bm5pbmcgdGhlIGl0ZXJhdGlvbnMgb25lIHN0ZXAgb3V0IG9mIHN5bmMgc28gd2UgY2FuIGRldGVjdFxuICAgICAgICAgICAgLy8gdGhlIGxhc3QgaXRlcmF0aW9uIHdpdGhvdXQgaGF2ZSB0byBzY2FuIHRoZSBvYmplY3QgdHdpY2UgYW5kIGNyZWF0ZVxuICAgICAgICAgICAgLy8gYW4gaXRlcm1lZGlhdGUga2V5cyBhcnJheS5cbiAgICAgICAgICAgIGlmIChwcmlvcktleSkge1xuICAgICAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpIC0gMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcmlvcktleSA9IGtleTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByaW9yS2V5KSB7XG4gICAgICAgICAgZXhlY0l0ZXJhdGlvbihwcmlvcktleSwgaSAtIDEsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24gKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7XG4gICAgICBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwgfHwgVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uIChjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHsgZm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNoIH0pO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKTtcbiAgICAgICAgb3B0aW9ucyA9IHsgZGF0YTogZGF0YSB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24gKG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBtZXNzYWdlKTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvb2t1cCcsIGZ1bmN0aW9uIChvYmosIGZpZWxkKSB7XG4gICAgcmV0dXJuIG9iaiAmJiBvYmpbZmllbGRdO1xuICB9KTtcbn1cblxudmFyIGxvZ2dlciA9IHtcbiAgbWV0aG9kTWFwOiB7IDA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InIH0sXG5cbiAgLy8gU3RhdGUgZW51bVxuICBERUJVRzogMCxcbiAgSU5GTzogMSxcbiAgV0FSTjogMixcbiAgRVJST1I6IDMsXG4gIGxldmVsOiAxLFxuXG4gIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24gbG9nKGxldmVsLCBtZXNzYWdlKSB7XG4gICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBsb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBsb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIChjb25zb2xlW21ldGhvZF0gfHwgY29uc29sZS5sb2cpLmNhbGwoY29uc29sZSwgbWVzc2FnZSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc29sZVxuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0cy5sb2dnZXIgPSBsb2dnZXI7XG52YXIgbG9nID0gbG9nZ2VyLmxvZztcblxuZXhwb3J0cy5sb2cgPSBsb2c7XG5cbmZ1bmN0aW9uIGNyZWF0ZUZyYW1lKG9iamVjdCkge1xuICB2YXIgZnJhbWUgPSBVdGlscy5leHRlbmQoe30sIG9iamVjdCk7XG4gIGZyYW1lLl9wYXJlbnQgPSBvYmplY3Q7XG4gIHJldHVybiBmcmFtZTtcbn1cblxuLyogW2FyZ3MsIF1vcHRpb25zICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbmZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlLCBub2RlKSB7XG4gIHZhciBsb2MgPSBub2RlICYmIG5vZGUubG9jLFxuICAgICAgbGluZSA9IHVuZGVmaW5lZCxcbiAgICAgIGNvbHVtbiA9IHVuZGVmaW5lZDtcbiAgaWYgKGxvYykge1xuICAgIGxpbmUgPSBsb2Muc3RhcnQubGluZTtcbiAgICBjb2x1bW4gPSBsb2Muc3RhcnQuY29sdW1uO1xuXG4gICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBjb2x1bW47XG4gIH1cblxuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgRXhjZXB0aW9uKTtcbiAgfVxuXG4gIGlmIChsb2MpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gY29sdW1uO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gRXhjZXB0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuLypnbG9iYWwgd2luZG93ICovXG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGZ1bmN0aW9uIChIYW5kbGViYXJzKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIHZhciByb290ID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3csXG4gICAgICAkSGFuZGxlYmFycyA9IHJvb3QuSGFuZGxlYmFycztcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgSGFuZGxlYmFycy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChyb290LkhhbmRsZWJhcnMgPT09IEhhbmRsZWJhcnMpIHtcbiAgICAgIHJvb3QuSGFuZGxlYmFycyA9ICRIYW5kbGViYXJzO1xuICAgIH1cbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5jaGVja1JldmlzaW9uID0gY2hlY2tSZXZpc2lvbjtcblxuLy8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuZXhwb3J0cy53cmFwUHJvZ3JhbSA9IHdyYXBQcm9ncmFtO1xuZXhwb3J0cy5yZXNvbHZlUGFydGlhbCA9IHJlc29sdmVQYXJ0aWFsO1xuZXhwb3J0cy5pbnZva2VQYXJ0aWFsID0gaW52b2tlUGFydGlhbDtcbmV4cG9ydHMubm9vcCA9IG5vb3A7XG5cbnZhciBfaW1wb3J0ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgVXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0KTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbmZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvICYmIGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgY3VycmVudFJldmlzaW9uID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuICcgKyAnUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIHJ1bnRpbWVWZXJzaW9ucyArICcpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVyVmVyc2lvbnMgKyAnKS4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiAnICsgJ1BsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVySW5mb1sxXSArICcpLicpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAoIWVudikge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdObyBlbnZpcm9ubWVudCBwYXNzZWQgdG8gdGVtcGxhdGUnKTtcbiAgfVxuICBpZiAoIXRlbXBsYXRlU3BlYyB8fCAhdGVtcGxhdGVTcGVjLm1haW4pIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVW5rbm93biB0ZW1wbGF0ZSBvYmplY3Q6ICcgKyB0eXBlb2YgdGVtcGxhdGVTcGVjKTtcbiAgfVxuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIGVudi5WTS5jaGVja1JldmlzaW9uKHRlbXBsYXRlU3BlYy5jb21waWxlcik7XG5cbiAgZnVuY3Rpb24gaW52b2tlUGFydGlhbFdyYXBwZXIocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICAgIGNvbnRleHQgPSBVdGlscy5leHRlbmQoe30sIGNvbnRleHQsIG9wdGlvbnMuaGFzaCk7XG4gICAgfVxuXG4gICAgcGFydGlhbCA9IGVudi5WTS5yZXNvbHZlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIHZhciByZXN1bHQgPSBlbnYuVk0uaW52b2tlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHJlc3VsdCA9PSBudWxsICYmIGVudi5jb21waWxlKSB7XG4gICAgICBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB0ZW1wbGF0ZVNwZWMuY29tcGlsZXJPcHRpb25zLCBlbnYpO1xuICAgICAgcmVzdWx0ID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHtcbiAgICAgIGlmIChvcHRpb25zLmluZGVudCkge1xuICAgICAgICB2YXIgbGluZXMgPSByZXN1bHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpbmVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGlmICghbGluZXNbaV0gJiYgaSArIDEgPT09IGwpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpbmVzW2ldID0gb3B0aW9ucy5pbmRlbnQgKyBsaW5lc1tpXTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSBsaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUaGUgcGFydGlhbCAnICsgb3B0aW9ucy5uYW1lICsgJyBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBzdHJpY3Q6IGZ1bmN0aW9uIHN0cmljdChvYmosIG5hbWUpIHtcbiAgICAgIGlmICghKG5hbWUgaW4gb2JqKSkge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnXCInICsgbmFtZSArICdcIiBub3QgZGVmaW5lZCBpbiAnICsgb2JqKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmpbbmFtZV07XG4gICAgfSxcbiAgICBsb29rdXA6IGZ1bmN0aW9uIGxvb2t1cChkZXB0aHMsIG5hbWUpIHtcbiAgICAgIHZhciBsZW4gPSBkZXB0aHMubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoZGVwdGhzW2ldICYmIGRlcHRoc1tpXVtuYW1lXSAhPSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIGRlcHRoc1tpXVtuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgbGFtYmRhOiBmdW5jdGlvbiBsYW1iZGEoY3VycmVudCwgY29udGV4dCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBjdXJyZW50ID09PSAnZnVuY3Rpb24nID8gY3VycmVudC5jYWxsKGNvbnRleHQpIDogY3VycmVudDtcbiAgICB9LFxuXG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcblxuICAgIGZuOiBmdW5jdGlvbiBmbihpKSB7XG4gICAgICByZXR1cm4gdGVtcGxhdGVTcGVjW2ldO1xuICAgIH0sXG5cbiAgICBwcm9ncmFtczogW10sXG4gICAgcHJvZ3JhbTogZnVuY3Rpb24gcHJvZ3JhbShpLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldLFxuICAgICAgICAgIGZuID0gdGhpcy5mbihpKTtcbiAgICAgIGlmIChkYXRhIHx8IGRlcHRocyB8fCBibG9ja1BhcmFtcyB8fCBkZWNsYXJlZEJsb2NrUGFyYW1zKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gd3JhcFByb2dyYW0odGhpcywgaSwgZm4sIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gd3JhcFByb2dyYW0odGhpcywgaSwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH0sXG5cbiAgICBkYXRhOiBmdW5jdGlvbiBkYXRhKHZhbHVlLCBkZXB0aCkge1xuICAgICAgd2hpbGUgKHZhbHVlICYmIGRlcHRoLS0pIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5fcGFyZW50O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uIG1lcmdlKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIHZhciBvYmogPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgcGFyYW0gIT09IGNvbW1vbikge1xuICAgICAgICBvYmogPSBVdGlscy5leHRlbmQoe30sIGNvbW1vbiwgcGFyYW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG5cbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IHRlbXBsYXRlU3BlYy5jb21waWxlclxuICB9O1xuXG4gIGZ1bmN0aW9uIHJldChjb250ZXh0KSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzFdO1xuXG4gICAgdmFyIGRhdGEgPSBvcHRpb25zLmRhdGE7XG5cbiAgICByZXQuX3NldHVwKG9wdGlvbnMpO1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsICYmIHRlbXBsYXRlU3BlYy51c2VEYXRhKSB7XG4gICAgICBkYXRhID0gaW5pdERhdGEoY29udGV4dCwgZGF0YSk7XG4gICAgfVxuICAgIHZhciBkZXB0aHMgPSB1bmRlZmluZWQsXG4gICAgICAgIGJsb2NrUGFyYW1zID0gdGVtcGxhdGVTcGVjLnVzZUJsb2NrUGFyYW1zID8gW10gOiB1bmRlZmluZWQ7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMpIHtcbiAgICAgIGRlcHRocyA9IG9wdGlvbnMuZGVwdGhzID8gW2NvbnRleHRdLmNvbmNhdChvcHRpb25zLmRlcHRocykgOiBbY29udGV4dF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRlbXBsYXRlU3BlYy5tYWluLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgfVxuICByZXQuaXNUb3AgPSB0cnVlO1xuXG4gIHJldC5fc2V0dXAgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBjb250YWluZXIuaGVscGVycyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLmhlbHBlcnMsIGVudi5oZWxwZXJzKTtcblxuICAgICAgaWYgKHRlbXBsYXRlU3BlYy51c2VQYXJ0aWFsKSB7XG4gICAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLnBhcnRpYWxzLCBlbnYucGFydGlhbHMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuaGVscGVycyA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IG9wdGlvbnMucGFydGlhbHM7XG4gICAgfVxuICB9O1xuXG4gIHJldC5fY2hpbGQgPSBmdW5jdGlvbiAoaSwgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlQmxvY2tQYXJhbXMgJiYgIWJsb2NrUGFyYW1zKSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnbXVzdCBwYXNzIGJsb2NrIHBhcmFtcycpO1xuICAgIH1cbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocyAmJiAhZGVwdGhzKSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnbXVzdCBwYXNzIHBhcmVudCBkZXB0aHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCB0ZW1wbGF0ZVNwZWNbaV0sIGRhdGEsIDAsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICB9O1xuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiB3cmFwUHJvZ3JhbShjb250YWluZXIsIGksIGZuLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gIGZ1bmN0aW9uIHByb2coY29udGV4dCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1sxXTtcblxuICAgIHJldHVybiBmbi5jYWxsKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgb3B0aW9ucy5kYXRhIHx8IGRhdGEsIGJsb2NrUGFyYW1zICYmIFtvcHRpb25zLmJsb2NrUGFyYW1zXS5jb25jYXQoYmxvY2tQYXJhbXMpLCBkZXB0aHMgJiYgW2NvbnRleHRdLmNvbmNhdChkZXB0aHMpKTtcbiAgfVxuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gZGVwdGhzID8gZGVwdGhzLmxlbmd0aCA6IDA7XG4gIHByb2cuYmxvY2tQYXJhbXMgPSBkZWNsYXJlZEJsb2NrUGFyYW1zIHx8IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlUGFydGlhbChwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gIGlmICghcGFydGlhbCkge1xuICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV07XG4gIH0gZWxzZSBpZiAoIXBhcnRpYWwuY2FsbCAmJiAhb3B0aW9ucy5uYW1lKSB7XG4gICAgLy8gVGhpcyBpcyBhIGR5bmFtaWMgcGFydGlhbCB0aGF0IHJldHVybmVkIGEgc3RyaW5nXG4gICAgb3B0aW9ucy5uYW1lID0gcGFydGlhbDtcbiAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1twYXJ0aWFsXTtcbiAgfVxuICByZXR1cm4gcGFydGlhbDtcbn1cblxuZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMucGFydGlhbCA9IHRydWU7XG5cbiAgaWYgKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUaGUgcGFydGlhbCAnICsgb3B0aW9ucy5uYW1lICsgJyBjb3VsZCBub3QgYmUgZm91bmQnKTtcbiAgfSBlbHNlIGlmIChwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBub29wKCkge1xuICByZXR1cm4gJyc7XG59XG5cbmZ1bmN0aW9uIGluaXREYXRhKGNvbnRleHQsIGRhdGEpIHtcbiAgaWYgKCFkYXRhIHx8ICEoJ3Jvb3QnIGluIGRhdGEpKSB7XG4gICAgZGF0YSA9IGRhdGEgPyBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5jcmVhdGVGcmFtZShkYXRhKSA6IHt9O1xuICAgIGRhdGEucm9vdCA9IGNvbnRleHQ7XG4gIH1cbiAgcmV0dXJuIGRhdGE7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbmZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufVxuXG5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IFNhZmVTdHJpbmcucHJvdG90eXBlLnRvSFRNTCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICcnICsgdGhpcy5zdHJpbmc7XG59O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBTYWZlU3RyaW5nO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7XG5cbi8vIE9sZGVyIElFIHZlcnNpb25zIGRvIG5vdCBkaXJlY3RseSBzdXBwb3J0IGluZGV4T2Ygc28gd2UgbXVzdCBpbXBsZW1lbnQgb3VyIG93biwgc2FkbHkuXG5leHBvcnRzLmluZGV4T2YgPSBpbmRleE9mO1xuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtcbmV4cG9ydHMuaXNFbXB0eSA9IGlzRW1wdHk7XG5leHBvcnRzLmJsb2NrUGFyYW1zID0gYmxvY2tQYXJhbXM7XG5leHBvcnRzLmFwcGVuZENvbnRleHRQYXRoID0gYXBwZW5kQ29udGV4dFBhdGg7XG52YXIgZXNjYXBlID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gICdcXCcnOiAnJiN4Mjc7JyxcbiAgJ2AnOiAnJiN4NjA7J1xufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nLFxuICAgIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKG9iaiAvKiAsIC4uLnNvdXJjZSAqLykge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZXhwb3J0cy50b1N0cmluZyA9IHRvU3RyaW5nO1xuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxuLyplc2xpbnQtZGlzYWJsZSBmdW5jLXN0eWxlLCBuby12YXIgKi9cbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG4vKmVzbGludC1lbmFibGUgZnVuYy1zdHlsZSwgbm8tdmFyICovXG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07ZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGFycmF5W2ldID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgJiYgc3RyaW5nLnRvSFRNTCkge1xuICAgICAgcmV0dXJuIHN0cmluZy50b0hUTUwoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nICsgJyc7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmc7XG4gIH1cblxuICBpZiAoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmc7XG4gIH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSkge1xuICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJsb2NrUGFyYW1zKHBhcmFtcywgaWRzKSB7XG4gIHBhcmFtcy5wYXRoID0gaWRzO1xuICByZXR1cm4gcGFyYW1zO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRDb250ZXh0UGF0aChjb250ZXh0UGF0aCwgaWQpIHtcbiAgcmV0dXJuIChjb250ZXh0UGF0aCA/IGNvbnRleHRQYXRoICsgJy4nIDogJycpICsgaWQ7XG59IiwiLy8gQ3JlYXRlIGEgc2ltcGxlIHBhdGggYWxpYXMgdG8gYWxsb3cgYnJvd3NlcmlmeSB0byByZXNvbHZlXG4vLyB0aGUgcnVudGltZSBvbiBhIHN1cHBvcnRlZCBwYXRoLlxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZScpWydkZWZhdWx0J107XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIilbXCJkZWZhdWx0XCJdO1xuIiwidmFyIGJhc2VUb1N0cmluZyA9IHJlcXVpcmUoJy4uL2ludGVybmFsL2Jhc2VUb1N0cmluZycpO1xuXG4vKipcbiAqIENhcGl0YWxpemVzIHRoZSBmaXJzdCBjaGFyYWN0ZXIgb2YgYHN0cmluZ2AuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBTdHJpbmdcbiAqIEBwYXJhbSB7c3RyaW5nfSBbc3RyaW5nPScnXSBUaGUgc3RyaW5nIHRvIGNhcGl0YWxpemUuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBjYXBpdGFsaXplZCBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uY2FwaXRhbGl6ZSgnZnJlZCcpO1xuICogLy8gPT4gJ0ZyZWQnXG4gKi9cbmZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7XG4gIHN0cmluZyA9IGJhc2VUb1N0cmluZyhzdHJpbmcpO1xuICByZXR1cm4gc3RyaW5nICYmIChzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc2xpY2UoMSkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNhcGl0YWxpemU7XG4iLCIvKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBzdHJpbmcgaWYgaXQncyBub3Qgb25lLiBBbiBlbXB0eSBzdHJpbmcgaXMgcmV0dXJuZWRcbiAqIGZvciBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgdmFsdWVzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBiYXNlVG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6ICh2YWx1ZSArICcnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlVG9TdHJpbmc7XG4iLCIvLyBBdm9pZCBjb25zb2xlIGVycm9ycyBmb3IgdGhlIElFIGNyYXBweSBicm93c2Vyc1xuaWYgKCAhIHdpbmRvdy5jb25zb2xlICkgY29uc29sZSA9IHsgbG9nOiBmdW5jdGlvbigpe30gfTtcblxuaW1wb3J0IEFwcCBmcm9tICdBcHAnXG5pbXBvcnQgJCBmcm9tICdqcXVlcnknXG5pbXBvcnQgVHdlZW5NYXggZnJvbSAnZ3NhcCdcbmltcG9ydCByYWYgZnJvbSAncmFmJ1xuaW1wb3J0IHBpeGkgZnJvbSAncGl4aS5qcydcbmltcG9ydCB3aGVlbCBmcm9tICdqcXVlcnktbW91c2V3aGVlbCdcblxud2luZG93LmpRdWVyeSA9IHdpbmRvdy4kID0gJFxuXG53aGVlbCgkKVxuXG4vLyBTdGFydCBBcHBcbnZhciBhcHAgPSBuZXcgQXBwKClcbmFwcC5pbml0KClcbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwVGVtcGxhdGUgZnJvbSAnQXBwVGVtcGxhdGUnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBHRXZlbnRzIGZyb20gJ0dsb2JhbEV2ZW50cydcbmltcG9ydCBQb29sIGZyb20gJ1Bvb2wnXG5pbXBvcnQgUHJlbG9hZGVyIGZyb20gJ1ByZWxvYWRlcidcbmltcG9ydCBNb2JpbGVEZXRlY3QgZnJvbSAnbW9iaWxlLWRldGVjdCdcblxuY2xhc3MgQXBwIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdH1cblx0aW5pdCgpIHtcblxuXHRcdHZhciBtZCA9IG5ldyBNb2JpbGVEZXRlY3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG5cblx0XHRBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSA9IChtZC5tb2JpbGUoKSB8fCBtZC50YWJsZXQoKSkgPyB0cnVlIDogZmFsc2VcblxuXHRcdC8vIEluaXQgUHJlbG9hZGVyXG5cdFx0QXBwU3RvcmUuUHJlbG9hZGVyID0gbmV3IFByZWxvYWRlcigpXG5cblx0XHQvLyBJbml0IFBvb2xcblx0XHRBcHBTdG9yZS5Qb29sID0gbmV3IFBvb2woKVxuXG5cdFx0Ly8gSW5pdCByb3V0ZXJcblx0XHR0aGlzLnJvdXRlciA9IG5ldyBSb3V0ZXIoKVxuXHRcdHRoaXMucm91dGVyLmluaXQoKVxuXG5cdFx0Ly8gSW5pdCBnbG9iYWwgZXZlbnRzXG5cdFx0d2luZG93Lkdsb2JhbEV2ZW50cyA9IG5ldyBHRXZlbnRzKClcblx0XHRHbG9iYWxFdmVudHMuaW5pdCgpXG5cblx0XHR2YXIgYXBwVGVtcGxhdGUgPSBuZXcgQXBwVGVtcGxhdGUoKVxuXHRcdHRoaXMudGVtcGxhdGVJc1JlYWR5ID0gdGhpcy50ZW1wbGF0ZUlzUmVhZHkuYmluZCh0aGlzKVxuXHRcdGFwcFRlbXBsYXRlLmlzUmVhZHkgPSB0aGlzLnRlbXBsYXRlSXNSZWFkeVxuXHRcdGFwcFRlbXBsYXRlLnJlbmRlcignI2FwcC1jb250YWluZXInKVxuXHR9XG5cdHRlbXBsYXRlSXNSZWFkeSgpIHtcblx0XHQvLyBTdGFydCByb3V0aW5nXG5cdFx0dGhpcy5yb3V0ZXIuYmVnaW5Sb3V0aW5nKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBcbiAgICBcdFxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCBGcm9udENvbnRhaW5lciBmcm9tICdGcm9udENvbnRhaW5lcidcbmltcG9ydCBQYWdlc0NvbnRhaW5lciBmcm9tICdQYWdlc0NvbnRhaW5lcidcbmltcG9ydCBQWENvbnRhaW5lciBmcm9tICdQWENvbnRhaW5lcidcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuY2xhc3MgQXBwVGVtcGxhdGUgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMuaXNSZWFkeSA9IHVuZGVmaW5lZFxuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0fVxuXHRyZW5kZXIocGFyZW50KSB7XG5cdFx0c3VwZXIucmVuZGVyKCdBcHBUZW1wbGF0ZScsIHBhcmVudCwgdW5kZWZpbmVkKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHRoaXMuZnJvbnRDb250YWluZXIgPSBuZXcgRnJvbnRDb250YWluZXIoKVxuXHRcdHRoaXMuZnJvbnRDb250YWluZXIucmVuZGVyKCcjYXBwLXRlbXBsYXRlJylcblxuXHRcdHRoaXMucGFnZXNDb250YWluZXIgPSBuZXcgUGFnZXNDb250YWluZXIoKVxuXHRcdHRoaXMucGFnZXNDb250YWluZXIucmVuZGVyKCcjYXBwLXRlbXBsYXRlJylcblxuXHRcdHRoaXMucHhDb250YWluZXIgPSBuZXcgUFhDb250YWluZXIoKVxuXHRcdHRoaXMucHhDb250YWluZXIuaW5pdCgnI2FwcC10ZW1wbGF0ZScpXG5cdFx0QXBwQWN0aW9ucy5weENvbnRhaW5lcklzUmVhZHkodGhpcy5weENvbnRhaW5lcilcblxuXHRcdEdsb2JhbEV2ZW50cy5yZXNpemUoKVxuXG5cdFx0dGhpcy5hbmltYXRlKClcblxuXHRcdHNldFRpbWVvdXQoKCk9Pnt0aGlzLmlzUmVhZHkoKX0sIDApXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG5cdGFuaW1hdGUoKSB7XG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0ZSlcblx0ICAgIHRoaXMucHhDb250YWluZXIudXBkYXRlKClcblx0ICAgIHRoaXMucGFnZXNDb250YWluZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5mcm9udENvbnRhaW5lci5yZXNpemUoKVxuXHRcdHRoaXMucHhDb250YWluZXIucmVzaXplKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBUZW1wbGF0ZVxuIiwiaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwRGlzcGF0Y2hlciBmcm9tICdBcHBEaXNwYXRjaGVyJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5mdW5jdGlvbiBfcHJvY2VlZEhhc2hlckNoYW5nZUFjdGlvbihwYWdlSWQpIHtcbiAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCxcbiAgICAgICAgaXRlbTogcGFnZUlkXG4gICAgfSkgIFxufVxudmFyIEFwcEFjdGlvbnMgPSB7XG4gICAgcGFnZUhhc2hlckNoYW5nZWQ6IGZ1bmN0aW9uKHBhZ2VJZCkge1xuICAgICAgICB2YXIgbWFuaWZlc3QgPSBBcHBTdG9yZS5wYWdlQXNzZXRzVG9Mb2FkKClcbiAgICAgICAgaWYobWFuaWZlc3QubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgX3Byb2NlZWRIYXNoZXJDaGFuZ2VBY3Rpb24ocGFnZUlkKVxuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIEFwcFN0b3JlLlByZWxvYWRlci5sb2FkKG1hbmlmZXN0LCAoKT0+e1xuICAgICAgICAgICAgICAgIF9wcm9jZWVkSGFzaGVyQ2hhbmdlQWN0aW9uKHBhZ2VJZClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHdpbmRvd1Jlc2l6ZTogZnVuY3Rpb24od2luZG93Vywgd2luZG93SCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLldJTkRPV19SRVNJWkUsXG4gICAgICAgICAgICBpdGVtOiB7IHdpbmRvd1c6d2luZG93Vywgd2luZG93SDp3aW5kb3dIIH1cbiAgICAgICAgfSlcbiAgICB9LFxuICAgIHB4Q29udGFpbmVySXNSZWFkeTogZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0lTX1JFQURZLFxuICAgICAgICAgICAgaXRlbTogY29tcG9uZW50XG4gICAgICAgIH0pICAgICAgICAgICAgXG4gICAgfSxcbiAgICBweEFkZENoaWxkOiBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9BRERfQ0hJTEQsXG4gICAgICAgICAgICBpdGVtOiB7Y2hpbGQ6IGNoaWxkfVxuICAgICAgICB9KSAgICAgICAgICAgIFxuICAgIH0sXG4gICAgcHhSZW1vdmVDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfUkVNT1ZFX0NISUxELFxuICAgICAgICAgICAgaXRlbToge2NoaWxkOiBjaGlsZH1cbiAgICAgICAgfSkgICAgICAgICAgICBcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFwcEFjdGlvbnNcblxuXG4gICAgICBcbiIsImltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJyb3dCdG4ge1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50LCBkaXJlY3Rpb24pIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb25cblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnRsT3ZlciA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLnRsT3V0ID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdHZhciBrbm90c0VsID0gdGhpcy5lbGVtZW50LmZpbmQoXCIua25vdFwiKVxuXHRcdHZhciBsaW5lc0VsID0gdGhpcy5lbGVtZW50LmZpbmQoXCIubGluZVwiKVxuXHRcdHZhciByYWRpdXMgPSAzXG5cdFx0dmFyIG1hcmdpbiA9IDMwXG5cdFx0dGhpcy5saW5lU2l6ZSA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtub3RzRWwubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0gJChrbm90c0VsW2ldKVxuXHRcdFx0a25vdC5hdHRyKCdyJywgcmFkaXVzKVxuXHRcdH07XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lc0VsLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbGluZSA9ICQobGluZXNFbFtpXSlcblx0XHRcdGxpbmUuY3NzKCdzdHJva2Utd2lkdGgnLCB0aGlzLmxpbmVTaXplKVxuXHRcdH07XG5cblx0XHR2YXIgc3RhcnRYID0gbWFyZ2luID4+IDFcblx0XHR2YXIgc3RhcnRZID0gbWFyZ2luXG5cdFx0dmFyIG9mZnNldFVwRG93biA9IDAuNlxuXHRcdCQoa25vdHNFbC5nZXQoMCkpLmF0dHIoe1xuXHRcdFx0J2N4Jzogc3RhcnRYICsgMCxcblx0XHRcdCdjeSc6IHN0YXJ0WSArIDBcblx0XHR9KVxuXHRcdCQoa25vdHNFbC5nZXQoMSkpLmF0dHIoe1xuXHRcdFx0J2N4Jzogc3RhcnRYICsgbWFyZ2luLFxuXHRcdFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdH0pXG5cdFx0JChrbm90c0VsLmdldCgyKSkuYXR0cih7XG5cdFx0XHQnY3gnOiBzdGFydFggKyAobWFyZ2luKjIpLFxuXHRcdFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdH0pXG5cdFx0JChrbm90c0VsLmdldCgzKSkuYXR0cih7XG5cdFx0XHQnY3gnOiBzdGFydFggKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKSxcblx0XHRcdCdjeSc6IHN0YXJ0WSAtIChtYXJnaW4gKiBvZmZzZXRVcERvd24pXG5cdFx0fSlcblx0XHQkKGtub3RzRWwuZ2V0KDQpKS5hdHRyKHtcblx0XHRcdCdjeCc6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdFx0J2N5Jzogc3RhcnRZICsgKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHR9KVxuXHRcdCQobGluZXNFbC5nZXQoMCkpLmF0dHIoe1xuXHRcdFx0J3gxJzogc3RhcnRYICsgMCxcblx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHQneDInOiBzdGFydFggKyBtYXJnaW4sXG5cdFx0XHQneTInOiBzdGFydFkgKyAwXG5cdFx0fSlcblx0XHQkKGxpbmVzRWwuZ2V0KDEpKS5hdHRyKHtcblx0XHRcdCd4MSc6IHN0YXJ0WCArIG1hcmdpbixcblx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHQneDInOiBzdGFydFggKyAobWFyZ2luKjIpLFxuXHRcdFx0J3kyJzogc3RhcnRZICsgMFxuXHRcdH0pXG5cdFx0JChsaW5lc0VsLmdldCgyKSkuYXR0cih7XG5cdFx0XHQneDEnOiBzdGFydFggKyAwLFxuXHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdCd4Mic6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdFx0J3kyJzogc3RhcnRZIC0gKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHR9KVxuXHRcdCQobGluZXNFbC5nZXQoMykpLmF0dHIoe1xuXHRcdFx0J3gxJzogc3RhcnRYICsgMCxcblx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHQneDInOiBzdGFydFggKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKSxcblx0XHRcdCd5Mic6IHN0YXJ0WSArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pXG5cdFx0fSlcblxuXHRcdHZhciBvZmZzZXQgPSAxMFxuXHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMF0sIDEsIHsgeDotb2Zmc2V0KyhyYWRpdXMgPj4gMSksIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzFdLCAxLCB7IHg6LW9mZnNldCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMl0sIDEsIHsgeDotb2Zmc2V0LCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFswXSwgMSwgeyBzY2FsZVg6MS4xLCB4Oi1vZmZzZXQsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhsaW5lc0VsWzFdLCAxLCB7IHNjYWxlWDoxLjEsIHg6LW9mZnNldCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMl0sIDEsIHsgeDotb2Zmc2V0LCByb3RhdGlvbjonMTBkZWcnLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonMCUgMTAwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFszXSwgMSwgeyB4Oi1vZmZzZXQsIHJvdGF0aW9uOictMTBkZWcnLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonMCUgMCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbM10sIDEsIHsgeDotb2Zmc2V0LzIsIHk6KG9mZnNldC8yKS1yYWRpdXMsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzRdLCAxLCB7IHg6LW9mZnNldC8yLCB5Oi0ob2Zmc2V0LzIpK3JhZGl1cywgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXG5cdFx0dGhpcy50bE91dC50byhrbm90c0VsWzBdLCAxLCB7IHg6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFsxXSwgMSwgeyB4OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbMl0sIDEsIHsgeDowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzBdLCAxLCB7IHNjYWxlWDoxLCB4OjAsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMV0sIDEsIHsgc2NhbGVYOjEsIHg6MCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdXQudG8obGluZXNFbFsyXSwgMSwgeyB4OjAsIHJvdGF0aW9uOicwZGVnJywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzAlIDEwMCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdXQudG8obGluZXNFbFszXSwgMSwgeyB4OjAsIHJvdGF0aW9uOicwZGVnJywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzAlIDAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbM10sIDEsIHsgeDowLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbNF0sIDEsIHsgeDowLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblxuXHRcdHN3aXRjaCh0aGlzLmRpcmVjdGlvbikge1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEVGVDpcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlJJR0hUOlxuXHRcdFx0XHRUd2Vlbk1heC5zZXQodGhpcy5lbGVtZW50LCB7IHJvdGF0aW9uOicxODBkZWcnLCB0cmFuc2Zvcm1PcmlnaW46ICc1MCUgNTAlJyB9KVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuVE9QOlxuXHRcdFx0XHRUd2Vlbk1heC5zZXQodGhpcy5lbGVtZW50LCB7IHJvdGF0aW9uOic5MGRlZycsIHRyYW5zZm9ybU9yaWdpbjogJzUwJSA1MCUnIH0pXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5CT1RUT006XG5cdFx0XHRcdFR3ZWVuTWF4LnNldCh0aGlzLmVsZW1lbnQsIHsgcm90YXRpb246Jy05MGRlZycsIHRyYW5zZm9ybU9yaWdpbjogJzUwJSA1MCUnIH0pXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0dGhpcy50bE92ZXIucGF1c2UoMClcblx0XHR0aGlzLnRsT3V0LnBhdXNlKDApXG5cblx0XHR0aGlzLnJvbGxvdmVyID0gdGhpcy5yb2xsb3Zlci5iaW5kKHRoaXMpXG5cdFx0dGhpcy5yb2xsb3V0ID0gdGhpcy5yb2xsb3V0LmJpbmQodGhpcylcblx0XHR0aGlzLmNsaWNrID0gdGhpcy5jbGljay5iaW5kKHRoaXMpXG5cdFx0dGhpcy5lbGVtZW50Lm9uKCdtb3VzZWVudGVyJywgdGhpcy5yb2xsb3Zlcilcblx0XHR0aGlzLmVsZW1lbnQub24oJ21vdXNlbGVhdmUnLCB0aGlzLnJvbGxvdXQpXG5cdFx0aWYodGhpcy5idG5DbGlja2VkICE9IHVuZGVmaW5lZCkgdGhpcy5lbGVtZW50Lm9uKCdjbGljaycsIHRoaXMuY2xpY2spXG5cblx0XHR0aGlzLndpZHRoID0gbWFyZ2luICogM1xuXHRcdHRoaXMuaGVpZ2h0ID0gbWFyZ2luICogMlxuXHRcdHRoaXMuZWxlbWVudC5jc3Moe1xuXHRcdFx0d2lkdGg6IHRoaXMud2lkdGgsXG5cdFx0XHRoZWlnaHQ6IHRoaXMuaGVpZ2h0XG5cdFx0fSlcblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0dGhpcy5lbGVtZW50LmNzcyh7XG5cdFx0XHRsZWZ0OiB4LFxuXHRcdFx0dG9wOiB5XG5cdFx0fSlcblx0fVxuXHRjbGljayhlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5idG5DbGlja2VkKHRoaXMuZGlyZWN0aW9uKVxuXHR9XG5cdHJvbGxvdXQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMubW91c2VPdXQoKVx0XG5cdH1cblx0cm9sbG92ZXIoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMubW91c2VPdmVyKClcdFxuXHR9XG5cdG1vdXNlT3ZlcigpIHtcblx0XHR0aGlzLnRsT3V0LmtpbGwoKVxuXHRcdHRoaXMudGxPdmVyLnBsYXkoMClcblx0fVxuXHRtb3VzZU91dCgpIHtcblx0XHR0aGlzLnRsT3Zlci5raWxsKClcblx0XHR0aGlzLnRsT3V0LnBsYXkoMClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bE92ZXIpXG5cdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdXQpXG5cdFx0dGhpcy5lbGVtZW50Lm9mZignbW91c2VlbnRlcicsIHRoaXMucm9sbG92ZXIpXG5cdFx0dGhpcy5lbGVtZW50Lm9mZignbW91c2VsZWF2ZScsIHRoaXMucm9sbG91dClcblx0XHR0aGlzLmVsZW1lbnQub2ZmKCdjbGljaycsIHRoaXMuY2xpY2spXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlUGxhbmV0UGFnZSBmcm9tICdCYXNlUGxhbmV0UGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgU2Nyb2xsQmFyIGZyb20gJ1Njcm9sbEJhcidcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZUNhbXBhaWduUGFnZSBleHRlbmRzIEJhc2VQbGFuZXRQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRwcm9wcy5kYXRhLmlzTW9iaWxlID0gQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGVcblxuXHRcdHN1cGVyKHByb3BzKVxuXHRcdHRoaXMucHhTY3JvbGxDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5weFNjcm9sbENvbnRhaW5lcilcblx0XHR0aGlzLnBhZ2VIZWlnaHQgPSAwXG5cdFx0dGhpcy5zY3JvbGxUYXJnZXQgPSAwXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5zY3JvbGxFbCA9IHRoaXMuY2hpbGQuZmluZChcIi5pbnRlcmZhY2UuYWJzb2x1dGVcIikuZ2V0KDApXG5cblx0XHRpZighQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdHRoaXMub25XaGVlbCA9IHRoaXMub25XaGVlbC5iaW5kKHRoaXMpXG5cdFx0XHQkKHdpbmRvdykub24oXCJtb3VzZXdoZWVsXCIsIHRoaXMub25XaGVlbClcblx0XHRcdHRoaXMuc2Nyb2xsVGFyZ2V0ID0gMFxuXHRcdFx0dGhpcy5sYXN0U2Nyb2xsWSA9IDBcblx0XHRcdHRoaXMuc2Nyb2xsRWFzZSA9IDAuMVxuXG5cdFx0XHR0aGlzLm9uU2Nyb2xsVGFyZ2V0ID0gdGhpcy5vblNjcm9sbFRhcmdldC5iaW5kKHRoaXMpXG5cdFx0XHR2YXIgc2Nyb2xsRWwgPSB0aGlzLmNoaWxkLmZpbmQoJyNzY3JvbGxiYXItdmlldycpXG5cdFx0XHR0aGlzLnNjcm9sbGJhciA9IG5ldyBTY3JvbGxCYXIoc2Nyb2xsRWwpXG5cdFx0XHR0aGlzLnNjcm9sbGJhci5zY3JvbGxUYXJnZXRIYW5kbGVyID0gdGhpcy5vblNjcm9sbFRhcmdldFxuXHRcdFx0dGhpcy5zY3JvbGxiYXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdH1cblxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHR9XG5cdG9uU2Nyb2xsVGFyZ2V0KHZhbCkge1xuXHRcdHRoaXMuc2Nyb2xsVGFyZ2V0Q2hhbmdlZCh2YWwpXG5cdH1cblx0c2Nyb2xsVGFyZ2V0Q2hhbmdlZCh2YWwpIHtcblx0XHR0aGlzLnNjcm9sbFRhcmdldCA9IHZhbFxuICAgICAgICB0aGlzLmFwcGx5U2Nyb2xsQm91bmRzKClcbiAgICAgICAgdGhpcy5zY3JvbGxiYXIuc2V0U2Nyb2xsVGFyZ2V0KHRoaXMuc2Nyb2xsVGFyZ2V0KVxuXHR9XG5cdG9uV2hlZWwoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciBkZWx0YSA9IGUud2hlZWxEZWx0YVxuXHRcdHZhciB2YWx1ZSA9IC0oZS5kZWx0YVkgKiBlLmRlbHRhRmFjdG9yKVxuICAgICAgICB0aGlzLnVwZGF0ZVNjcm9sbFRhcmdldCh2YWx1ZSlcblx0fVxuXHR1cGRhdGVTY3JvbGxUYXJnZXQodmFsdWUpIHtcblx0XHR0aGlzLnNjcm9sbFRhcmdldCArPSB2YWx1ZVxuICAgICAgICB0aGlzLmFwcGx5U2Nyb2xsQm91bmRzKClcbiAgICAgICAgdGhpcy5zY3JvbGxiYXIuc2V0U2Nyb2xsVGFyZ2V0KHRoaXMuc2Nyb2xsVGFyZ2V0KVxuXHR9XG5cdGFwcGx5U2Nyb2xsQm91bmRzKCkge1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnNjcm9sbFRhcmdldCA9ICh0aGlzLnNjcm9sbFRhcmdldCA8IDApID8gMCA6IHRoaXMuc2Nyb2xsVGFyZ2V0XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gKHRoaXMuc2Nyb2xsVGFyZ2V0ICsgd2luZG93SCA+IHRoaXMucGFnZUhlaWdodCkgPyAodGhpcy5wYWdlSGVpZ2h0IC0gd2luZG93SCkgOiB0aGlzLnNjcm9sbFRhcmdldFxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZighQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdHRoaXMubGFzdFNjcm9sbFkgKz0gKHRoaXMuc2Nyb2xsVGFyZ2V0IC0gdGhpcy5sYXN0U2Nyb2xsWSkgKiB0aGlzLnNjcm9sbEVhc2Vcblx0XHRcdFV0aWxzLlRyYW5zbGF0ZSh0aGlzLnNjcm9sbEVsLCAwLCAtdGhpcy5sYXN0U2Nyb2xsWSwgMClcblx0XHRcdHRoaXMucHhTY3JvbGxDb250YWluZXIueSA9IC10aGlzLmxhc3RTY3JvbGxZXG5cdFx0XHR0aGlzLnNjcm9sbGJhci51cGRhdGUoKVxuXHRcdH1cdFxuXHR9XG5cdHJlc2l6ZSgpIHtcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSAge1xuXHRcdFx0c3VwZXIucmVzaXplKClcblx0XHR9ZWxzZXtcblx0XHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHRcdHRoaXMuc2Nyb2xsYmFyLnBhZ2VIZWlnaHQgPSB0aGlzLnBhZ2VIZWlnaHQgLSB3aW5kb3dIXG5cdCAgICAgICAgdGhpcy5zY3JvbGxiYXIucmVzaXplKClcblx0ICAgICAgICBzdXBlci5yZXNpemUoKVxuXHRcdH1cblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpZighQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHRoaXMuc2Nyb2xsYmFyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLnB4U2Nyb2xsQ29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMucHhTY3JvbGxDb250YWluZXIpXG5cdFx0JCh3aW5kb3cpLm9mZihcIm1vdXNld2hlZWxcIiwgdGhpcy5vbldoZWVsKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IFBhZ2UgZnJvbSAnUGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJhc2VQbGFuZXRQYWdlIGV4dGVuZHMgUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdFx0dGhpcy5leHBlcmllbmNlID0gdW5kZWZpbmVkXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGlmKHRoaXMuZXhwZXJpZW5jZSAhPSB1bmRlZmluZWQpIHRoaXMuZXhwZXJpZW5jZS5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBTcHJpbmdHYXJkZW4gZnJvbSAnU3ByaW5nR2FyZGVuJ1xuaW1wb3J0IENvbXBhc3NSaW5ncyBmcm9tICdDb21wYXNzUmluZ3MnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbXBhc3Mge1xuXHRjb25zdHJ1Y3RvcihweENvbnRhaW5lciwgdHlwZSkge1xuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHRcdHRoaXMudHlwZSA9IHR5cGUgfHwgQXBwQ29uc3RhbnRzLkxBTkRJTkdcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmNvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmNvbnRhaW5lcilcblxuIFx0XHR0aGlzLnJpbmdzID0gbmV3IENvbXBhc3NSaW5ncyh0aGlzLmNvbnRhaW5lcilcblx0IFx0dGhpcy5yaW5ncy5jb21wb25lbnREaWRNb3VudCgpXG5cblx0IFx0dGhpcy5zcHJpbmdHYXJkZW5zID0gW11cblx0IFx0dGhpcy5nZXRSYWRpdXMoKVxuXHR9XG5cdHVwZGF0ZURhdGEoZGF0YSkge1xuXHRcdHRoaXMucmVtb3ZlUHJldmlvdXNTcHJpbmdHYXJkZW5zKClcblx0XHR0aGlzLnNwcmluZ0dhcmRlbnMgPSBbXVxuXHRcdHZhciBzcHJpbmdHYXJkZW5XaXRoRmlsbCA9ICh0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UpID8gdHJ1ZSA6IGZhbHNlXG5cdFx0Ly8gdmFyIHNwcmluZ0dhcmRlbklzSW50ZXJhY3RpdmUgPSAodGhpcy50eXBlID09IEFwcENvbnN0YW50cy5FWFBFUklFTkNFKSA/IHRydWUgOiBmYWxzZVxuXHRcdHZhciBzcHJpbmdHYXJkZW5Jc0ludGVyYWN0aXZlID0gZmFsc2Vcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSBBcHBTdG9yZS5nZXRTcHJpbmdHYXJkZW4oKVxuXHRcdFx0dmFyIHByb2R1Y3QgPSBkYXRhW2ldXG5cdFx0XHR2YXIgY29sb3IgPSBwcm9kdWN0LmNvbG9yXG5cdFx0XHRzcHJpbmdHYXJkZW4uaWQgPSB0aGlzLmlkXG5cdFx0XHRzcHJpbmdHYXJkZW4ucmFkaXVzID0gdGhpcy5yYWRpdXNcblx0XHRcdHNwcmluZ0dhcmRlbi5rbm90UmFkaXVzID0gdGhpcy5rbm90UmFkaXVzXG5cdFx0XHRzcHJpbmdHYXJkZW4uY29tcG9uZW50RGlkTW91bnQocHJvZHVjdCwgc3ByaW5nR2FyZGVuV2l0aEZpbGwsIHNwcmluZ0dhcmRlbklzSW50ZXJhY3RpdmUsIHRoaXMudHlwZSlcblx0XHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHNwcmluZ0dhcmRlbi5jb250YWluZXIpXG5cdFx0XHR0aGlzLnNwcmluZ0dhcmRlbnNbaV0gPSBzcHJpbmdHYXJkZW5cblx0XHR9XG5cdH1cblx0cmVtb3ZlUHJldmlvdXNTcHJpbmdHYXJkZW5zKCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zcHJpbmdHYXJkZW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc3ByaW5nR2FyZGVuID0gdGhpcy5zcHJpbmdHYXJkZW5zW2ldXG5cdFx0XHRzcHJpbmdHYXJkZW4uY2xlYXIoKVxuXHRcdFx0c3ByaW5nR2FyZGVuLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHRcdEFwcFN0b3JlLnJlbGVhc2VTcHJpbmdHYXJkZW4oc3ByaW5nR2FyZGVuKVxuXHRcdH1cblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0aWYodGhpcy5zcHJpbmdHYXJkZW5zLmxlbmd0aCA8IDEpIHJldHVybiBcblx0IFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSB0aGlzLnNwcmluZ0dhcmRlbnNbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi51cGRhdGUoKVxuXHRcdH1cblx0fVxuXHRnZXRSYWRpdXMoKSB7XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBzaXplUGVyY2VudGFnZSA9ICh0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UgfHwgdGhpcy50eXBlID09IEFwcENvbnN0YW50cy5DQU1QQUlHTikgPyBBcHBDb25zdGFudHMuQ09NUEFTU19TTUFMTF9TSVpFX1BFUkNFTlRBR0UgOiBBcHBDb25zdGFudHMuQ09NUEFTU19TSVpFX1BFUkNFTlRBR0Vcblx0XHR0aGlzLnJhZGl1cyA9IHdpbmRvd0ggKiBzaXplUGVyY2VudGFnZVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHR9XG5cdHVwZGF0ZVJhZGl1cygpIHtcblx0XHR0aGlzLmdldFJhZGl1cygpXG5cdFx0dGhpcy5yaW5ncy5yZXNpemUodGhpcy5yYWRpdXMpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdGlmKHRoaXMudHlwZSA9PSBBcHBDb25zdGFudHMuTEFORElORykge1xuXHRcdFx0dGhpcy51cGRhdGVSYWRpdXMoKVxuXHRcdH1cblx0XHRpZih0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoIDwgMSkgcmV0dXJuIFxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc3ByaW5nR2FyZGVucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IHRoaXMuc3ByaW5nR2FyZGVuc1tpXVxuXHRcdFx0c3ByaW5nR2FyZGVuLnJlc2l6ZSh0aGlzLnJhZGl1cylcblx0XHR9XG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMuY29udGFpbmVyLnggPSB4XG5cdFx0dGhpcy5jb250YWluZXIueSA9IHlcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHR9XG5cdHNjYWxlKHgsIHkpIHtcblx0XHR0aGlzLmNvbnRhaW5lci5zY2FsZS54ID0geFxuXHRcdHRoaXMuY29udGFpbmVyLnNjYWxlLnkgPSB5XG5cdFx0dGhpcy5zY2FsZVggPSB4XG5cdFx0dGhpcy5zY2FsZVkgPSB5XHRcblx0fVxuXHRwb3NpdGlvbkVsZW1lbnQoeCwgeSkge1xuXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5jb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5jb250YWluZXIpXG5cdFx0dGhpcy5yZW1vdmVQcmV2aW91c1NwcmluZ0dhcmRlbnMoKVxuXHRcdHRoaXMucmluZ3MuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGFzc1JpbmdzIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0dGhpcy5jb250YWluZXIgPSBwYXJlbnRDb250YWluZXJcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnJpbmdzQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnRpdGxlc0NvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5yaW5nc0NvbnRhaW5lcilcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnRpdGxlc0NvbnRhaW5lcilcblxuXHRcdHRoaXMuY2lyY2xlcyA9IFtdXG5cdFx0dmFyIGNpY2xlc0xlbiA9IDZcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNpY2xlc0xlbjsgaSsrKSB7XG5cdFx0XHR2YXIgZyA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHRcdHRoaXMuY2lyY2xlc1tpXSA9IGdcblx0XHRcdHRoaXMucmluZ3NDb250YWluZXIuYWRkQ2hpbGQoZylcblx0XHR9XG5cblx0XHR0aGlzLnRpdGxlcyA9IFtdXG5cdFx0dmFyIGdsb2JhbENvbnRlbnQgPSBBcHBTdG9yZS5nbG9iYWxDb250ZW50KClcblx0XHR2YXIgZWxlbWVudHMgPSBBcHBTdG9yZS5lbGVtZW50c09mTmF0dXJlKClcblx0XHR2YXIgZWxlbWVudHNUZXh0cyA9IGdsb2JhbENvbnRlbnQuZWxlbWVudHNcblx0XHR2YXIgZm9udFNpemUgPSAyNlxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGVsZW1lbnRJZCA9IGVsZW1lbnRzW2ldXG5cdFx0XHR2YXIgZWxlbWVudFRpdGxlID0gZWxlbWVudHNUZXh0c1tlbGVtZW50SWRdLnRvVXBwZXJDYXNlKClcblx0XHRcdHZhciB0eHQgPSBuZXcgUElYSS5UZXh0KGVsZW1lbnRUaXRsZSwgeyBmb250OiBmb250U2l6ZSArICdweCBGdXR1cmFCb2xkJywgZmlsbDogJ3doaXRlJywgYWxpZ246ICdjZW50ZXInIH0pXG5cdFx0XHR0eHQuYW5jaG9yLnggPSAwLjVcblx0XHRcdHR4dC5hbmNob3IueSA9IDAuNVxuXHRcdFx0dGhpcy50aXRsZXNDb250YWluZXIuYWRkQ2hpbGQodHh0KVxuXHRcdFx0dGhpcy50aXRsZXMucHVzaCh7XG5cdFx0XHRcdHR4dDogdHh0LFxuXHRcdFx0XHRkZWdCZWdpbjogdGhpcy5nZXREZWdyZWVzQmVnaW5Gb3JUaXRsZXNCeUlkKGVsZW1lbnRJZCksXG5cdFx0XHR9KVxuXHRcdH1cblxuXHR9XG5cdGdldERlZ3JlZXNCZWdpbkZvclRpdGxlc0J5SWQoaWQpIHtcblx0XHQvLyBiZSBjYXJlZnVsIHN0YXJ0cyBmcm9tIGNlbnRlciAtOTBkZWdcblx0XHRzd2l0Y2goaWQpIHtcblx0XHRcdGNhc2UgJ2ZpcmUnOiByZXR1cm4gLTEzMFxuXHRcdFx0Y2FzZSAnZWFydGgnOiByZXR1cm4gLTUwXG5cdFx0XHRjYXNlICdtZXRhbCc6IHJldHVybiAxNVxuXHRcdFx0Y2FzZSAnd2F0ZXInOiByZXR1cm4gOTBcblx0XHRcdGNhc2UgJ3dvb2QnOiByZXR1cm4gMTY1XG5cdFx0fVxuXHR9XG5cdGRyYXdSaW5ncygpIHtcblx0XHR2YXIgcmFkaXVzTWFyZ2luID0gdGhpcy5yYWRpdXMgLyB0aGlzLmNpcmNsZXMubGVuZ3RoXG5cdFx0dmFyIGxlbiA9IHRoaXMuY2lyY2xlcy5sZW5ndGggKyAxXG5cdFx0dmFyIGxhc3RSO1xuXHRcdHZhciBsaW5lVyA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0dmFyIGNvbG9yID0gMHhmZmZmZmZcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHR2YXIgZyA9IHRoaXMuY2lyY2xlc1tpLTFdXG5cdFx0XHR2YXIgcjtcblxuXHRcdFx0Zy5jbGVhcigpXG5cblx0XHRcdC8vIHJhZGl1cyBkaWZmZXJlbmNlc1xuXHRcdFx0aWYoaSA9PSAxKSByID0gcmFkaXVzTWFyZ2luICogMC4xNlxuXHRcdFx0ZWxzZSByID0gbGFzdFIgKyByYWRpdXNNYXJnaW5cblxuXHRcdFx0Ly8gbGluZXNcblx0XHRcdGlmKGk9PTMpIHtcblx0XHRcdFx0dGhpcy5kcmF3QXJvdW5kVGhyZWVHcm91cExpbmVzKGxhc3RSLCByLCBnLCBsaW5lVywgY29sb3IpXG5cdFx0XHR9XG5cdFx0XHRpZihpPT02KSB7XG5cdFx0XHRcdHRoaXMuZHJhd0Fyb3VuZEZvdXJHcm91cExpbmVzKGxhc3RSLCByLCBnLCBsaW5lVywgY29sb3IpXG5cdFx0XHRcdHRoaXMuZHJhd1RpdGxlcyhyLCBjb2xvcilcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2lyY2xlXG5cdFx0XHR0aGlzLmRyYXdDaXJjbGUoZywgcilcblxuXHRcdFx0bGFzdFIgPSByXG5cdFx0fVxuXHR9XG5cdGRyYXdBcm91bmRUaHJlZUdyb3VwTGluZXMobGFzdFIsIG5ld1IsIGcsIGxpbmVXLCBjb2xvcikge1xuXHRcdHZhciBsZWZ0VGhldGEgPSAoNyAqIE1hdGguUEkpIC8gNlxuXHRcdHZhciByaWdodFRoZXRhID0gKDExICogTWF0aC5QSSkgLyA2XG5cdFx0XG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIDAsIC1uZXdSLCAwLCAtbGFzdFIpXG5cdFx0XG5cdFx0dmFyIGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRUaGV0YSlcblx0XHR2YXIgZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRUaGV0YSlcblx0XHR2YXIgdG9YID0gbGFzdFIgKiBNYXRoLmNvcyhsZWZ0VGhldGEpXG5cdFx0dmFyIHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0VGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0VGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodFRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0VGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cdH1cblx0ZHJhd0Fyb3VuZEZvdXJHcm91cExpbmVzKGxhc3RSLCBuZXdSLCBnLCBsaW5lVywgY29sb3IpIHtcblx0XHR2YXIgbGVmdFRvcFRoZXRhID0gKDExICogTWF0aC5QSSkgLyAxMlxuXHRcdHZhciByaWdodFRvcFRoZXRhID0gTWF0aC5QSSAvIDEyXG5cblx0XHR2YXIgbGVmdEJvdHRvbVRoZXRhID0gKDUgKiBNYXRoLlBJKSAvIDRcblx0XHR2YXIgcmlnaHRCb3R0b21UaGV0YSA9ICg3ICogTWF0aC5QSSkgLyA0XG5cdFx0XG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIDAsIC1uZXdSLCAwLCAtbGFzdFIpXG5cdFx0XG5cdFx0dmFyIGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgdG9YID0gbGFzdFIgKiBNYXRoLmNvcyhsZWZ0VG9wVGhldGEpXG5cdFx0dmFyIHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRUb3BUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0VG9wVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0VG9wVGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodFRvcFRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0VG9wVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhsZWZ0Qm90dG9tVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0b1ggPSBsYXN0UiAqIE1hdGguY29zKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihsZWZ0Qm90dG9tVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhyaWdodEJvdHRvbVRoZXRhKVxuXHRcdGZyb21ZID0gLW5ld1IgKiBNYXRoLnNpbihyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRvWCA9IGxhc3RSICogTWF0aC5jb3MocmlnaHRCb3R0b21UaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXHR9XG5cdGRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSkge1xuXHRcdGcubGluZVN0eWxlKGxpbmVXLCBjb2xvciwgMSlcblx0XHRnLmJlZ2luRmlsbChjb2xvciwgMClcblx0XHRnLm1vdmVUbyhmcm9tWCwgZnJvbVkpXG5cdFx0Zy5saW5lVG8odG9YLCB0b1kpXG5cdFx0Zy5lbmRGaWxsKClcblx0fVxuXHRkcmF3Q2lyY2xlKGcsIHIpIHtcblx0XHRnLmxpbmVTdHlsZShBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKSwgMHhmZmZmZmYsIDEpXG5cdFx0Zy5iZWdpbkZpbGwoMHhmZmZmZmYsIDApXG5cdFx0XG5cdFx0Zy5tb3ZlVG8ociwgMClcblxuXHRcdHZhciBhbmdsZSA9IDBcblx0XHR2YXIgeCA9IDBcblx0XHR2YXIgeSA9IDBcblx0XHR2YXIgZ2FwID0gTWF0aC5taW4oKDMwMCAvIHRoaXMucmFkaXVzKSAqIDUsIDEwKVxuXHRcdHZhciBzdGVwcyA9IE1hdGgucm91bmQoMzYwIC8gZ2FwKVxuXHRcdGZvciAodmFyIGkgPSAtMTsgaSA8IHN0ZXBzOyBpKyspIHtcblx0XHRcdGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucyhpICogZ2FwKVxuXHRcdFx0eCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHRcdHkgPSByICogTWF0aC5zaW4oYW5nbGUpXG5cdFx0XHRnLmxpbmVUbyh4LCB5KVxuXHRcdH07XG5cblx0XHQvLyBjbG9zZSBpdFxuXHRcdGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucygzNjApXG5cdFx0eCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHR5ID0gciAqIE1hdGguc2luKGFuZ2xlKVxuXHRcdGcubGluZVRvKHgsIHkpXG5cblx0XHRnLmVuZEZpbGwoKVxuXHR9XG5cdGRyYXdUaXRsZXMociwgY29sb3IpIHtcblx0XHR2YXIgdGl0bGVzID0gdGhpcy50aXRsZXNcblx0XHR2YXIgb2Zmc2V0ID0gKHRoaXMucmFkaXVzIC8gMjcwKSAqIC0yNVxuXHRcdHZhciBzY2FsZSA9ICh0aGlzLnJhZGl1cyAvIDI3MCkgKiAxXG5cdFx0dmFyIHIgPSByICsgb2Zmc2V0XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aXRsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciB0aXRsZSA9IHRpdGxlc1tpXVxuXHRcdFx0dmFyIGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucyh0aXRsZS5kZWdCZWdpbilcblx0XHRcdHRpdGxlLnR4dC5yb3RhdGlvbiA9IGFuZ2xlICsgVXRpbHMuRGVncmVlc1RvUmFkaWFucyg5MClcblx0XHRcdHRpdGxlLnR4dC54ID0gciAqIE1hdGguY29zKGFuZ2xlKVxuXHRcdFx0dGl0bGUudHh0LnkgPSByICogTWF0aC5zaW4oYW5nbGUpXG5cdFx0XHR0aXRsZS50eHQuc2NhbGUueCA9IHNjYWxlXG5cdFx0XHR0aXRsZS50eHQuc2NhbGUueSA9IHNjYWxlXG5cdFx0fVxuXHR9XG5cdHJlc2l6ZShyYWRpdXMpIHtcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dGhpcy5yYWRpdXMgPSByYWRpdXNcblx0XHR0aGlzLmRyYXdSaW5ncygpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5yaW5nc0NvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0dGhpcy50aXRsZXNDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5yaW5nc0NvbnRhaW5lcilcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMudGl0bGVzQ29udGFpbmVyKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQ29tcGFzcyBmcm9tICdDb21wYXNzJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgU21hbGxDb21wYXNzIGZyb20gJ1NtYWxsQ29tcGFzcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGFzc2VzQ29udGFpbmVyIHtcblx0Y29uc3RydWN0b3IocHhDb250YWluZXIsIHBhcmVudEVsKSB7XG5cdFx0dGhpcy5wYXJlbnRFbCA9IHBhcmVudEVsXG5cdFx0dGhpcy5weENvbnRhaW5lciA9IHB4Q29udGFpbmVyXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggPSAwXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5jb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5jb250YWluZXIpXG5cblx0XHR0aGlzLmNvbXBhc3NlcyA9IFtdXG5cblx0XHR0aGlzLm1haW5Db21wYXNzID0gbmV3IENvbXBhc3ModGhpcy5jb250YWluZXIsIEFwcENvbnN0YW50cy5FWFBFUklFTkNFKVxuXHRcdHRoaXMubWFpbkNvbXBhc3Mua25vdFJhZGl1cyA9IEFwcENvbnN0YW50cy5TTUFMTF9LTk9UX1JBRElVU1xuXHRcdHRoaXMubWFpbkNvbXBhc3MuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdHRoaXMubWFpbkNvbXBhc3Muc3RhdGUgPSBBcHBDb25zdGFudHMuT1BFTlxuXG5cdFx0dmFyIGluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zTGFuZ1Njb3BlKClcblxuXHRcdHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcGxhbmV0ID0gcGxhbmV0c1tpXVxuXHRcdFx0dmFyIHNtYWxsQ29tcGFzcyA9IG5ldyBTbWFsbENvbXBhc3ModGhpcy5jb250YWluZXIsIEFwcENvbnN0YW50cy5FWFBFUklFTkNFKVxuXHRcdFx0dmFyIHBsYW5ldERhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHBsYW5ldClcblx0XHRcdHNtYWxsQ29tcGFzcy5zdGF0ZSA9IEFwcENvbnN0YW50cy5DTE9TRVxuXHRcdFx0c21hbGxDb21wYXNzLmlkID0gcGxhbmV0XG5cdFx0XHRzbWFsbENvbXBhc3MuY29tcG9uZW50RGlkTW91bnQocGxhbmV0RGF0YSwgcGxhbmV0LCB0aGlzLnBhcmVudEVsLCBpbmZvcy5wbGFuZXQpXG5cdFx0XHR0aGlzLmNvbXBhc3Nlc1tpXSA9IHNtYWxsQ29tcGFzc1xuXHRcdFx0aWYocGxhbmV0ID09IHRoaXMuaWQpIHtcblx0XHRcdFx0dGhpcy5tYWluQ29tcGFzcy5pZCA9IHBsYW5ldFxuXHRcdFx0XHR0aGlzLm9wZW5lZENvbXBhc3NJbmRleCA9IGlcblx0XHRcdFx0c21hbGxDb21wYXNzLnN0YXRlID0gQXBwQ29uc3RhbnRzLk9QRU5cblx0XHRcdFx0dGhpcy5jbG9zZUNvbXBhc3MoaSlcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0dGhpcy51cGRhdGVDb21wYXNzUHJvZHVjdCgpXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvbXBhc3Nlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5jb21wYXNzZXNbaV0uZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVxuXHRcdH07XG5cdFx0dGhpcy5tYWluQ29tcGFzcy51cGRhdGVSYWRpdXMoKVxuXHRcdHRoaXMubWFpbkNvbXBhc3MuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLndpbGxUcmFuc2l0aW9uT3V0KClcblx0XHR9O1x0XG5cdFx0dGhpcy5tYWluQ29tcGFzcy53aWxsVHJhbnNpdGlvbk91dCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLnVwZGF0ZSgpXG5cdFx0fTtcblx0XHR0aGlzLm1haW5Db21wYXNzLnVwZGF0ZSgpXG5cdH1cblx0dXBkYXRlQ29tcGFzc1Byb2R1Y3QoKSB7XG5cdFx0dmFyIHBsYW5ldERhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHRoaXMuaWQpXG5cdFx0dmFyIHByb2R1Y3REYXRhID0gcGxhbmV0RGF0YVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcHJvZHVjdERhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwcm9kdWN0ID0gcHJvZHVjdERhdGFbaV1cblx0XHRcdGlmKHRoaXMuY3VycmVudEluZGV4ID09IGkpIHtcblx0XHRcdFx0cHJvZHVjdC5oaWdobGlnaHQgPSB0cnVlXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0cHJvZHVjdC5oaWdobGlnaHQgPSBmYWxzZVxuXHRcdFx0fVxuXHRcdH07XG5cdFx0dGhpcy5tYWluQ29tcGFzcy51cGRhdGVEYXRhKHByb2R1Y3REYXRhKVxuXHR9XG5cdGNoYW5nZURhdGEobmV3SWQpIHtcblx0XHR0aGlzLmlkID0gbmV3SWRcblx0XHR2YXIgcGxhbmV0cyA9IEFwcFN0b3JlLnBsYW5ldHMoKVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHBsYW5ldCA9IHBsYW5ldHNbaV1cblx0XHRcdHZhciBjb21wYXNzID0gdGhpcy5jb21wYXNzZXNbaV1cblx0XHRcdGlmKHBsYW5ldCA9PSB0aGlzLmlkKSB7IFxuXHRcdFx0XHR0aGlzLm1haW5Db21wYXNzLmlkID0gcGxhbmV0XG5cdFx0XHRcdHRoaXMub3BlbmVkQ29tcGFzc0luZGV4ID0gaVxuXHRcdFx0XHRjb21wYXNzLnN0YXRlID0gQXBwQ29uc3RhbnRzLk9QRU5cblx0XHRcdFx0dGhpcy5jbG9zZUNvbXBhc3MoaSlcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRjb21wYXNzLnN0YXRlID0gQXBwQ29uc3RhbnRzLkNMT1NFXG5cdFx0XHRcdHRoaXMub3BlbkNvbXBhc3MoaSlcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy5yZXNpemUoKVxuXHRcdHRoaXMucG9zaXRpb25UaXRsZUVsZW1lbnRzKHRoaXMueSlcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQcm9kdWN0KClcblx0fVxuXHRvcGVuQ29tcGFzcyhpbmRleCkge1xuXHRcdHZhciBjb21wYXNzID0gdGhpcy5jb21wYXNzZXNbaW5kZXhdXG5cdFx0Y29tcGFzcy5vcGFjaXR5KDEpXG5cdH1cblx0Y2xvc2VDb21wYXNzKGluZGV4KSB7XG5cdFx0dmFyIGNvbXBhc3MgPSB0aGlzLmNvbXBhc3Nlc1tpbmRleF1cblx0XHRjb21wYXNzLm9wYWNpdHkoMClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHZhciBjb21wYXNzZXMgPSB0aGlzLmNvbXBhc3Nlc1xuXHRcdHZhciB0b3RhbFcgPSAwXG5cdFx0dmFyIGJpZ2dlc3RSYWRpdXMgPSAwXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjb21wYXNzID0gY29tcGFzc2VzW2ldXG5cdFx0XHR2YXIgc2l6ZSA9IChjb21wYXNzLnJhZGl1cyA8PCAxKVxuXHRcdFx0dmFyIHByZXZpb3VzQ21wID0gY29tcGFzc2VzW2ktMV1cblx0XHRcdHZhciBuZXh0Q21wID0gY29tcGFzc2VzW2krMV1cblx0XHRcdHZhciBjeCA9IHRvdGFsVyArIHRoaXMuZ2V0Q29tcGFzc01hcmdpbihjb21wYXNzKVxuXHRcdFx0Y29tcGFzcy5yZXNpemUoKVxuXHRcdFx0YmlnZ2VzdFJhZGl1cyA9IGJpZ2dlc3RSYWRpdXMgPCBjb21wYXNzLnJhZGl1cyA/IGNvbXBhc3MucmFkaXVzIDogYmlnZ2VzdFJhZGl1c1xuXHRcdFx0Y29tcGFzcy5wb3NpdGlvbihjeCwgMClcblx0XHRcdGNvbXBhc3MucG9zWCA9IGN4XG5cdFx0XHR0b3RhbFcgPSBjeCArIHRoaXMuZ2V0Q29tcGFzc01hcmdpbihjb21wYXNzKVxuXG5cdFx0XHRpZihjb21wYXNzLnN0YXRlID09IEFwcENvbnN0YW50cy5PUEVOKSB7XG5cdFx0XHRcdHRoaXMubWFpbkNvbXBhc3MucG9zaXRpb24oXG5cdFx0XHRcdFx0Y29tcGFzcy54LFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0KVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMubWFpbkNvbXBhc3MucmVzaXplKClcblxuXHRcdHRoaXMud2lkdGggPSB0b3RhbFdcblx0XHR0aGlzLmhlaWdodCA9IGJpZ2dlc3RSYWRpdXNcblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0XHR0aGlzLmNvbnRhaW5lci5wb3NpdGlvbi54ID0geFxuXHRcdHRoaXMuY29udGFpbmVyLnBvc2l0aW9uLnkgPSB5XG5cdFx0dGhpcy5wb3NpdGlvblRpdGxlRWxlbWVudHMoeSlcblx0fVxuXHRwb3NpdGlvblRpdGxlRWxlbWVudHMoeSkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgY29tcGFzc2VzID0gdGhpcy5jb21wYXNzZXNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBhc3Nlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGNvbXBhc3MgPSBjb21wYXNzZXNbaV1cblx0XHRcdGNvbXBhc3MucG9zaXRpb25FbGVtZW50KFxuXHRcdFx0XHRjb21wYXNzLnBvc1ggKyAod2luZG93VyA+PiAxKSAtICh0aGlzLndpZHRoID4+IDEpLFxuXHRcdFx0XHR5XG5cdFx0XHQpXG5cdFx0fVxuXHR9XG5cdGdldENvbXBhc3NNYXJnaW4oY29tcGFzcykge1xuXHRcdHJldHVybiAoY29tcGFzcy5zdGF0ZSA9PSBBcHBDb25zdGFudHMuT1BFTikgPyAxNDAgOiA4MFxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR9XG5cdFx0dGhpcy5tYWluQ29tcGFzcy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5jb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5jb250YWluZXIpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnRnJvbnRDb250YWluZXJfaGJzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5cbmNsYXNzIEZyb250Q29udGFpbmVyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRyZW5kZXIocGFyZW50KSB7XG5cdFx0dmFyIHNjb3BlID0ge31cblx0XHR2YXIgZ2VuZXJhSW5mb3MgPSBBcHBTdG9yZS5nZW5lcmFsSW5mb3MoKVxuXHRcdHNjb3BlLmluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zTGFuZ1Njb3BlKClcblx0XHRzY29wZS5mYWNlYm9va1VybCA9IGdlbmVyYUluZm9zWydmYWNlYm9va191cmwnXVxuXHRcdHNjb3BlLnR3aXR0ZXJVcmwgPSBnZW5lcmFJbmZvc1sndHdpdHRlcl91cmwnXVxuXHRcdHNjb3BlLmluc3RhZ3JhbVVybCA9IGdlbmVyYUluZm9zWydpbnN0YWdyYW1fdXJsJ11cblx0XHRzY29wZS5pc01vYmlsZSA9IEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlXG5cblx0XHRpZihzY29wZS5pc01vYmlsZSkge1xuXHRcdFx0c2NvcGUubW9iaWxlTWVudSA9IFtcblx0XHRcdFx0eyBpZDonaG9tZScsIG5hbWU6c2NvcGUuaW5mb3NbJ2hvbWVfdHh0J10sIHVybDonIyEvbGFuZGluZycgfSxcblx0XHRcdFx0eyBpZDonc2hvcC1tZW4nLCBuYW1lOnNjb3BlLmluZm9zWydzaG9wX3RpdGxlJ10gKyAnICcgKyBzY29wZS5pbmZvc1snc2hvcF9tZW4nXSwgdXJsOnNjb3BlLmluZm9zWydzaG9wX21lbl91cmwnXSB9LFxuXHRcdFx0XHR7IGlkOidzaG9wLXdvbWVuJywgbmFtZTpzY29wZS5pbmZvc1snc2hvcF90aXRsZSddICsgJyAnICsgc2NvcGUuaW5mb3NbJ3Nob3Bfd29tZW4nXSwgdXJsOnNjb3BlLmluZm9zWydzaG9wX3dvbWVuX3VybCddIH0sXG5cdFx0XHRcdHsgaWQ6J2xhYicsIG5hbWU6c2NvcGUuaW5mb3NbJ2NhbXBlcl9sYWInXSwgdXJsOnNjb3BlLmluZm9zWydjYW1wZXJfbGFiX3VybCddIH0sXG5cdFx0XHRdXG5cdFx0fVxuXG5cdFx0c3VwZXIucmVuZGVyKCdGcm9udENvbnRhaW5lcicsIHBhcmVudCwgdGVtcGxhdGUsIHNjb3BlKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB7XG5cdFx0XHR0aGlzLm1vYmlsZSA9IHtcblx0XHRcdFx0bWVudUlzT3BlbmVkOiBmYWxzZSxcblx0XHRcdFx0ZWw6IHRoaXMuY2hpbGQuZmluZCgnLm1vYmlsZS1tZW51JyksXG5cdFx0XHRcdGJ1cmdlcjogdGhpcy5jaGlsZC5maW5kKCcuYnVyZ2VyJyksXG5cdFx0XHRcdHNsaWRlbWVudTogdGhpcy5jaGlsZC5maW5kKCcubWVudS1zbGlkZXInKSxcblx0XHRcdFx0bWFpbk1lbnU6IHRoaXMuY2hpbGQuZmluZCgndWwubWFpbi1tZW51JyksXG5cdFx0XHRcdHNvY2lhbE1lbnU6IHRoaXMuY2hpbGQuZmluZCgndWwuc29jaWFsLW1lbnUnKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuJHNvY2lhbFdyYXBwZXIgPSB0aGlzLmNoaWxkLmZpbmQoJyNzb2NpYWwtd3JhcHBlcicpXG5cdFx0dGhpcy4kc29jaWFsVGl0bGUgPSB0aGlzLiRzb2NpYWxXcmFwcGVyLmZpbmQoJy5zb2NpYWwtdGl0bGUnKVxuXHRcdHRoaXMuJHNvY2lhbEljb25zQ29udGFpbmVyID0gdGhpcy4kc29jaWFsV3JhcHBlci5maW5kKCd1bCcpXG5cdFx0dGhpcy4kc29jaWFsQnRucyA9IHRoaXMuJHNvY2lhbFdyYXBwZXIuZmluZCgnbGknKVxuXHRcdHRoaXMuJGNhbXBlckxhYiA9IHRoaXMuY2hpbGQuZmluZCgnLmNhbXBlci1sYWInKVxuXHRcdHRoaXMuJHNob3AgPSB0aGlzLmNoaWxkLmZpbmQoJy5zaG9wLXdyYXBwZXInKVxuXHRcdHRoaXMuJGhvbWUgPSB0aGlzLmNoaWxkLmZpbmQoJy5ob21lLWJ0bicpXG5cdFx0dGhpcy5jb3VudHJpZXNIID0gMFxuXG5cdFx0dGhpcy5vblN1Yk1lbnVNb3VzZUVudGVyID0gdGhpcy5vblN1Yk1lbnVNb3VzZUVudGVyLmJpbmQodGhpcylcblx0XHR0aGlzLm9uU3ViTWVudU1vdXNlTGVhdmUgPSB0aGlzLm9uU3ViTWVudU1vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHRcdHRoaXMuJHNob3Aub24oJ21vdXNlZW50ZXInLCB0aGlzLm9uU3ViTWVudU1vdXNlRW50ZXIpXG5cdFx0dGhpcy4kc2hvcC5vbignbW91c2VsZWF2ZScsIHRoaXMub25TdWJNZW51TW91c2VMZWF2ZSlcblxuXHRcdHRoaXMub25Tb2NpYWxNb3VzZUVudGVyID0gdGhpcy5vblNvY2lhbE1vdXNlRW50ZXIuYmluZCh0aGlzKVxuXHRcdHRoaXMub25Tb2NpYWxNb3VzZUxlYXZlID0gdGhpcy5vblNvY2lhbE1vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHRcdHRoaXMuJHNvY2lhbFdyYXBwZXIub24oJ21vdXNlZW50ZXInLCB0aGlzLm9uU29jaWFsTW91c2VFbnRlcilcblx0XHR0aGlzLiRzb2NpYWxXcmFwcGVyLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5vblNvY2lhbE1vdXNlTGVhdmUpXG5cblx0XHR0aGlzLnNvY2lhbFRsID0gbmV3IFRpbWVsaW5lTWF4KClcblx0XHR0aGlzLnNvY2lhbFRsLnN0YWdnZXJGcm9tKHRoaXMuJHNvY2lhbEJ0bnMsIDEsIHsgc2NhbGU6MCwgeToxMCwgZm9yY2UzRDp0cnVlLCBvcGFjaXR5OjAsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDAuMDEsIDApXG5cdFx0dGhpcy5zb2NpYWxUbC5mcm9tKHRoaXMuJHNvY2lhbEljb25zQ29udGFpbmVyLCAxLCB7IHk6MzAsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy5zb2NpYWxUbC5wYXVzZSgwKVxuXG5cdFx0dGhpcy5yZXNpemUoKVxuXG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdHRoaXMuaW5pdE1vYmlsZSgpXG5cdFx0fVxuXHR9XG5cdGluaXRNb2JpbGUoKSB7XG5cdFx0dGhpcy5vbkJ1cmdlckNsaWNrZWQgPSB0aGlzLm9uQnVyZ2VyQ2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5tb2JpbGUuYnVyZ2VyLm9uKCdjbGljaycsIHRoaXMub25CdXJnZXJDbGlja2VkKVxuXG5cdFx0dGhpcy5tb2JpbGUudGwgPSBuZXcgVGltZWxpbmVNYXgoKVxuXHRcdHRoaXMubW9iaWxlLnRsLmZyb20odGhpcy5tb2JpbGUuc2xpZGVtZW51LCAwLjYsIHsgc2NhbGU6MS4xLCBvcGFjaXR5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHR0aGlzLm1vYmlsZS50bC5wYXVzZSgwKVxuXHR9XG5cdG9uQnVyZ2VyQ2xpY2tlZChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0aWYodGhpcy5tb2JpbGUubWVudUlzT3BlbmVkKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy5tb2JpbGUuc2xpZGVUaW1lb3V0KVxuXHRcdFx0dGhpcy5tb2JpbGUuc2xpZGVUaW1lb3V0ID0gc2V0VGltZW91dCgoKT0+e1xuXHRcdFx0XHR0aGlzLm1vYmlsZS5zbGlkZW1lbnUuY3NzKCd0b3AnLCAtMzAwMClcblx0XHRcdH0sIDkwMClcblx0XHRcdHRoaXMubW9iaWxlLnRsLnRpbWVTY2FsZSgxLjQpLnJldmVyc2UoKVxuXHRcdFx0dGhpcy5tb2JpbGUubWVudUlzT3BlbmVkID0gZmFsc2Vcblx0XHR9ZWxzZXtcblx0XHRcdHRoaXMubW9iaWxlLnNsaWRlbWVudS5jc3MoJ3RvcCcsIDApXG5cdFx0XHR0aGlzLnJlc2l6ZU1vYmlsZSgpXG5cdFx0XHR0aGlzLm1vYmlsZS50bC50aW1lU2NhbGUoMSkucGxheSgpXG5cdFx0XHR0aGlzLm1vYmlsZS5tZW51SXNPcGVuZWQgPSB0cnVlXG5cdFx0fVxuXHR9XG5cdG9uU29jaWFsTW91c2VFbnRlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMuc29jaWFsQnRuVGltZW91dClcblx0XHR0aGlzLnNvY2lhbFRsLnRpbWVTY2FsZSgxKS5wbGF5KClcblx0fVxuXHRvblNvY2lhbE1vdXNlTGVhdmUoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdGNsZWFyVGltZW91dCh0aGlzLnNvY2lhbEJ0blRpbWVvdXQpXG5cdFx0dGhpcy5zb2NpYWxCdG5UaW1lb3V0ID0gc2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dGhpcy5zb2NpYWxUbC50aW1lU2NhbGUoMS44KS5yZXZlcnNlKClcblx0XHR9LCA0MDApXG5cdH1cblx0b25TdWJNZW51TW91c2VFbnRlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dmFyICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblx0XHQkdGFyZ2V0LmFkZENsYXNzKCdob3ZlcmVkJylcblx0fVxuXHRvblN1Yk1lbnVNb3VzZUxlYXZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXHRcdCR0YXJnZXQucmVtb3ZlQ2xhc3MoJ2hvdmVyZWQnKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRpZighdGhpcy5kb21Jc1JlYWR5KSByZXR1cm5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGhpcy5jb3VudHJpZXNIID0gNjBcblx0XHR0aGlzLmNvdW50cmllc1RpdGxlSCA9IDIwXG5cblx0XHR2YXIgc29jaWFsQ3NzID0ge1xuXHRcdFx0bGVmdDogd2luZG93VyAtIEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCAtIHRoaXMuJHNvY2lhbFRpdGxlLndpZHRoKCksXG5cdFx0XHR0b3A6IHdpbmRvd0ggLSBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgLSB0aGlzLiRzb2NpYWxUaXRsZS5oZWlnaHQoKSxcblx0XHR9XG5cdFx0dmFyIHNvY2lhbEljb25zQ3NzID0ge1xuXHRcdFx0bGVmdDogKHRoaXMuJHNvY2lhbFRpdGxlLndpZHRoKCkgPj4gMSkgLSAodGhpcy4kc29jaWFsSWNvbnNDb250YWluZXIud2lkdGgoKSA+PiAxKSxcblx0XHRcdHRvcDogLXRoaXMuJHNvY2lhbEljb25zQ29udGFpbmVyLmhlaWdodCgpIC0gMjBcblx0XHR9XG5cdFx0dmFyIGNhbXBlckxhYkNzcyA9IHtcblx0XHRcdGxlZnQ6IHdpbmRvd1cgLSBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgLSB0aGlzLiRjYW1wZXJMYWIud2lkdGgoKSxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdH1cblx0XHR2YXIgc2hvcENzcyA9IHtcblx0XHRcdGxlZnQ6IGNhbXBlckxhYkNzcy5sZWZ0IC0gdGhpcy4kc2hvcC53aWR0aCgpIC0gKEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCksXG5cdFx0XHR0b3A6IEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCxcblx0XHR9XG5cdFx0dmFyIGhvbWVDc3MgPSB7XG5cdFx0XHRsZWZ0OiBzaG9wQ3NzLmxlZnQgLSB0aGlzLiRob21lLndpZHRoKCkgLSAoQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EKSxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdH1cblxuXHRcdHRoaXMuJHNvY2lhbFdyYXBwZXIuY3NzKHNvY2lhbENzcylcblx0XHR0aGlzLiRjYW1wZXJMYWIuY3NzKGNhbXBlckxhYkNzcylcblx0XHR0aGlzLiRzaG9wLmNzcyhzaG9wQ3NzKVxuXHRcdHRoaXMuJHNvY2lhbEljb25zQ29udGFpbmVyLmNzcyhzb2NpYWxJY29uc0Nzcylcblx0XHR0aGlzLiRob21lLmNzcyhob21lQ3NzKVxuXG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdHRoaXMucmVzaXplTW9iaWxlKClcblx0XHR9XG5cdH1cblx0cmVzaXplTW9iaWxlKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIGJ1cmdlckNzcyA9IHtcblx0XHRcdGxlZnQ6IHdpbmRvd1cgLSB0aGlzLm1vYmlsZS5idXJnZXIud2lkdGgoKSAtIEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EXG5cdFx0fVxuXHRcdHZhciBzbGlkZW1lbnVDc3MgPSB7XG5cdFx0XHR3aWR0aDogd2luZG93Vyxcblx0XHRcdGhlaWdodDogd2luZG93SFxuXHRcdH1cblx0XHR2YXIgbWFpbk1lbnVXID0gdGhpcy5tb2JpbGUubWFpbk1lbnUud2lkdGgoKVxuXHRcdHZhciBtYWluTWVudUggPSB0aGlzLm1vYmlsZS5tYWluTWVudS5oZWlnaHQoKVxuXHRcdHZhciBtYWluTWVudUNzcyA9IHtcblx0XHRcdHRvcDogKHdpbmRvd0ggPj4gMSkgLSAobWFpbk1lbnVIID4+IDEpIC0gKG1haW5NZW51SCAqIDAuMSksXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtIChtYWluTWVudVcgPj4gMSlcblx0XHR9XG5cdFx0dmFyIHNvY2lhbE1lbnVDc3MgPSB7XG5cdFx0XHR0b3A6IG1haW5NZW51Q3NzLnRvcCArIG1haW5NZW51SCArIDEwLFxuXHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAodGhpcy5tb2JpbGUuc29jaWFsTWVudS53aWR0aCgpID4+IDEpXG5cdFx0fVxuXHRcdHRoaXMubW9iaWxlLnNsaWRlbWVudS5jc3Moc2xpZGVtZW51Q3NzKVxuXHRcdHRoaXMubW9iaWxlLmJ1cmdlci5jc3MoYnVyZ2VyQ3NzKVxuXHRcdHRoaXMubW9iaWxlLm1haW5NZW51LmNzcyhtYWluTWVudUNzcylcblx0XHR0aGlzLm1vYmlsZS5zb2NpYWxNZW51LmNzcyhzb2NpYWxNZW51Q3NzKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBGcm9udENvbnRhaW5lclxuXG5cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgS25vdCB7XG5cdGNvbnN0cnVjdG9yKHNwcmluZ0NvbnRhaW5lciwgciwgY29sb3IpIHtcblx0XHR0aGlzLnJhZGl1cyA9IHIgfHwgM1xuXHRcdHRoaXMuY29sb3IgPSBjb2xvciB8fCAweGZmZmZmZlxuXHRcdHRoaXMuc3ByaW5nQ29udGFpbmVyID0gc3ByaW5nQ29udGFpbmVyXG5cdFx0dGhpcy52eCA9IDBcblx0XHR0aGlzLnZ5ID0gMFxuXHRcdHRoaXMueCA9IDBcblx0XHR0aGlzLnkgPSAwXG5cdFx0dGhpcy50b1ggPSAwXG5cdFx0dGhpcy50b1kgPSAwXG5cdFx0dGhpcy5mcm9tWCA9IDBcblx0XHR0aGlzLmZyb21ZID0gMFxuXHRcdHRoaXMuc2NhbGVYID0gMVxuXHRcdHRoaXMuc2NhbGVZID0gMVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuZyA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHR0aGlzLnNwcmluZ0NvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmcpXG5cdFx0dGhpcy5kcmF3KClcblx0XHRyZXR1cm4gdGhpc1xuXHR9XG5cdGNoYW5nZVNpemUocmFkaXVzKSB7XG5cdFx0dGhpcy5yYWRpdXMgPSByYWRpdXMgfHwgM1xuXHRcdHRoaXMuZHJhdygpXG5cdH1cblx0ZHJhdygpIHtcblx0XHR0aGlzLmcuY2xlYXIoKVxuXHRcdHRoaXMuZy5saW5lU3R5bGUoQXBwU3RvcmUuZ2V0TGluZVdpZHRoKCksIHRoaXMuY29sb3IsIDEpO1xuXHRcdHRoaXMuZy5iZWdpbkZpbGwodGhpcy5jb2xvciwgMSk7XG5cdFx0dGhpcy5nLmRyYXdDaXJjbGUoMCwgMCwgdGhpcy5yYWRpdXMpO1xuXHRcdHRoaXMuZy5lbmRGaWxsKClcdFxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLmcueCA9IHhcblx0XHR0aGlzLmcueSA9IHlcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHR9XG5cdGNsZWFyKCkge1xuXHRcdHRoaXMuZy5jbGVhcigpXG5cdH1cblx0c2NhbGUoeCwgeSkge1xuXHRcdHRoaXMuZy5zY2FsZS54ID0geFxuXHRcdHRoaXMuZy5zY2FsZS55ID0geVxuXHRcdHRoaXMuc2NhbGVYID0geFxuXHRcdHRoaXMuc2NhbGVZID0geVxuXHR9XG5cdHZlbG9jaXR5KHgsIHkpIHtcblx0XHR0aGlzLnZ4ID0geFxuXHRcdHRoaXMudnkgPSB5XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5nLmNsZWFyKClcblx0XHR0aGlzLmcgPSBudWxsXG5cdH1cbn1cbiIsImltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IFZlYzIgZnJvbSAnVmVjMidcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBCZXppZXJFYXNpbmcgZnJvbSAnYmV6aWVyLWVhc2luZydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGFuZGluZ1NsaWRlc2hvdyB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCBwYXJlbnRFbCkge1xuXHRcdHRoaXMucGFyZW50RWwgPSBwYXJlbnRFbFxuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHRcdHRoaXMuY3VycmVudElkID0gJ2FsYXNrYSdcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR2YXIgaW5mb3MgPSBBcHBTdG9yZS5nZW5lcmFsSW5mb3NMYW5nU2NvcGUoKVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnNsaWRlc2hvd0NvbnRhaW5lcilcblx0IFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuYWRkQ2hpbGQodGhpcy5zbGlkZXNob3dXcmFwcGVyKVxuXHQgXHR0aGlzLmNvdW50ZXIgPSAwXG5cdCBcdHRoaXMucGxhbmV0VGl0bGVUeHQgPSBpbmZvcy5wbGFuZXQudG9VcHBlckNhc2UoKVxuXG5cdFx0dmFyIHNsaWRlc2hvd1RpdGxlID0gdGhpcy5wYXJlbnRFbC5maW5kKCcuc2xpZGVzaG93LXRpdGxlJylcblx0XHR2YXIgcGxhbmV0VGl0bGUgPSBzbGlkZXNob3dUaXRsZS5maW5kKCcucGxhbmV0LXRpdGxlJylcblx0XHR2YXIgcGxhbmV0TmFtZSA9IHNsaWRlc2hvd1RpdGxlLmZpbmQoJy5wbGFuZXQtbmFtZScpXG5cdCBcdHRoaXMudGl0bGVDb250YWluZXIgPSB7XG5cdCBcdFx0cGFyZW50OiBzbGlkZXNob3dUaXRsZSxcblx0IFx0XHRwbGFuZXRUaXRsZTogcGxhbmV0VGl0bGUsXG5cdCBcdFx0cGxhbmV0TmFtZTogcGxhbmV0TmFtZVxuXHQgXHR9XG5cblx0IFx0dGhpcy5wbGFuZXROYW1lVHdlZW4gPSBUd2Vlbk1heC5mcm9tVG8ocGxhbmV0TmFtZSwgMC41LCB7c2NhbGVYOjEuNCwgc2NhbGVZOjAsIG9wYWNpdHk6MH0sIHsgc2NhbGU6MSwgb3BhY2l0eToxLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0pXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuLnBhdXNlKDApXG5cblx0IFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0IFx0dGhpcy5zbGlkZXMgPSBbXVxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0IFx0XHR2YXIgcyA9IHt9XG5cdCBcdFx0dmFyIGlkID0gcGxhbmV0c1tpXVxuXHQgXHRcdHZhciB3cmFwcGVyQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0XHR2YXIgbWFza1JlY3QgPSB7XG5cdCBcdFx0XHRnOiBBcHBTdG9yZS5nZXRHcmFwaGljcygpLFxuXHQgXHRcdFx0bmV3VzogMCxcblx0IFx0XHRcdHdpZHRoOiAwLFxuXHQgXHRcdFx0eDogMFxuXHQgXHRcdH1cblx0IFx0XHR2YXIgaW1nVXJsID0gQXBwU3RvcmUubWFpbkltYWdlVXJsKGlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0IFx0XHR2YXIgdGV4dHVyZSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1nVXJsKVxuXHQgXHRcdHZhciBzcHJpdGUgPSBBcHBTdG9yZS5nZXRTcHJpdGUoKVxuXHQgXHRcdHNwcml0ZS50ZXh0dXJlID0gdGV4dHVyZVxuXHQgXHRcdHNwcml0ZS5wYXJhbXMgPSB7fVxuXHQgXHRcdHRoaXMuc2xpZGVzaG93V3JhcHBlci5hZGRDaGlsZCh3cmFwcGVyQ29udGFpbmVyKVxuXHQgXHRcdHdyYXBwZXJDb250YWluZXIuYWRkQ2hpbGQoc3ByaXRlKVxuXHQgXHRcdHdyYXBwZXJDb250YWluZXIuYWRkQ2hpbGQobWFza1JlY3QuZylcblx0IFx0XHRzcHJpdGUubWFzayA9IG1hc2tSZWN0Lmdcblx0IFx0XHRzLm9sZFBvc2l0aW9uID0gbmV3IFZlYzIoMCwgMClcblx0IFx0XHRzLm5ld1Bvc2l0aW9uID0gbmV3IFZlYzIoMCwgMClcblx0IFx0XHRzLndyYXBwZXJDb250YWluZXIgPSB3cmFwcGVyQ29udGFpbmVyXG5cdCBcdFx0cy5zcHJpdGUgPSBzcHJpdGVcblx0IFx0XHRzLnRleHR1cmUgPSB0ZXh0dXJlXG5cdCBcdFx0cy5tYXNrUmVjdCA9IG1hc2tSZWN0XG5cdCBcdFx0cy5wbGFuZXROYW1lID0gaWQudG9VcHBlckNhc2UoKVxuXHQgXHRcdHMuaW1nUmVzcG9uc2l2ZVNpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VTaXplKEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHQgXHRcdHMuaW1nVXJsID0gaW1nVXJsXG5cdCBcdFx0cy5pZCA9IHBsYW5ldHNbaV1cblx0IFx0XHR0aGlzLnNsaWRlc1tpXSA9IHNcblx0IFx0fVxuXG5cdCBcdHRoaXMubWFza0Vhc2luZyA9IEJlemllckVhc2luZyguMjEsMS40NywuNTIsMSlcblx0IFx0dGhpcy5jaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KClcblx0fVxuXHR1cGRhdGVUaXRsZXModGl0bGUsIG5hbWUpIHtcblx0XHR2YXIgcGxhbmV0VGl0bGUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldFRpdGxlXG5cdFx0dmFyIHBsYW5ldE5hbWUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldE5hbWVcblx0IFx0cGxhbmV0VGl0bGUudGV4dCh0aXRsZSlcblx0IFx0cGxhbmV0TmFtZS50ZXh0KG5hbWUpXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuLnBsYXkoMClcblx0fVxuXHRkcmF3Q2VudGVyZWRNYXNrUmVjdChncmFwaGljcywgeCwgeSwgdywgaCkge1xuXHRcdGdyYXBoaWNzLmNsZWFyKClcblx0XHRncmFwaGljcy5iZWdpbkZpbGwoMHhmZmZmMDAsIDEpXG5cdFx0Z3JhcGhpY3MuZHJhd1JlY3QoeCwgeSwgdywgaClcblx0XHRncmFwaGljcy5lbmRGaWxsKClcblx0fVxuXHRuZXh0KCkge1xuXHRcdHZhciBmaXJzdEVsZW1lbnQgPSB0aGlzLnNsaWRlcy5zaGlmdCgpXG5cdFx0dGhpcy5zbGlkZXMucHVzaChmaXJzdEVsZW1lbnQpXG5cdFx0dGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSA9IGZpcnN0RWxlbWVudFxuXHRcdHRoaXMuY2hvb3NlU2xpZGVUb0hpZ2hsaWdodCgpXG5cdFx0dGhpcy5hcHBseVZhbHVlc1RvU2xpZGVzKClcblx0fVxuXHRwcmV2aW91cygpIHtcblx0XHR2YXIgbGFzdEVsZW1lbnQgPSB0aGlzLnNsaWRlcy5wb3AoKVxuXHRcdHRoaXMuc2xpZGVzLnVuc2hpZnQobGFzdEVsZW1lbnQpXG5cdFx0dGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSA9IGxhc3RFbGVtZW50XG5cdFx0dGhpcy5jaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KClcblx0XHR0aGlzLmFwcGx5VmFsdWVzVG9TbGlkZXMoKVxuXHR9XG5cdGNob29zZVNsaWRlVG9IaWdobGlnaHQoKSB7XG5cdFx0dmFyIHRvdGFsTGVuID0gdGhpcy5zbGlkZXMubGVuZ3RoLTFcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2xpZGUgPSB0aGlzLnNsaWRlc1tpXVxuXHRcdFx0aWYoaSA9PSAyKSB7XG5cdFx0XHRcdHNsaWRlLmhpZ2hsaWdodCA9IHRydWUgLy8gSGlnaGxpZ2h0IHRoZSBtaWRkbGUgZWxlbWVudHNcblx0XHRcdFx0dGhpcy5jdXJyZW50SWQgPSBzbGlkZS5pZFxuXHRcdFx0XHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIuc2V0Q2hpbGRJbmRleChzbGlkZS53cmFwcGVyQ29udGFpbmVyLCB0b3RhbExlbilcblx0XHRcdFx0dGhpcy51cGRhdGVUaXRsZXModGhpcy5wbGFuZXRUaXRsZVR4dCwgc2xpZGUucGxhbmV0TmFtZSlcblx0XHRcdFx0dGhpcy5wb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0c2xpZGUuaGlnaGxpZ2h0ID0gZmFsc2Vcblx0XHRcdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLnNldENoaWxkSW5kZXgoc2xpZGUud3JhcHBlckNvbnRhaW5lciwgaSlcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0YXBwbHlSZXNwb25zaXZlSW1nVG9TbGlkZURlcGVuZHNXaW5kb3coc2xpZGUpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIGltZ1VybCA9IEFwcFN0b3JlLm1haW5JbWFnZVVybChzLmlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0XHRpZihzLmltZ1VybCAhPSBpbWdVcmwpIHtcblx0XHRcdHMuaW1nUmVzcG9uc2l2ZVNpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VTaXplKEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHRcdFx0cy50ZXh0dXJlLmRlc3Ryb3kodHJ1ZSlcblx0XHRcdHMudGV4dHVyZSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1nVXJsKVxuXHRcdFx0cy5zcHJpdGUudGV4dHVyZSA9IHMudGV4dHVyZVxuXHRcdFx0cy5pbWdVcmwgPSBpbWdVcmxcblx0XHR9XG5cdH1cblx0cmVzaXplQW5kUG9zaXRpb25JbWdTcHJpdGUoc2xpZGUsIG1hc2tTbGlkZVcsIHdpbmRvd1csIHdpbmRvd0gpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIHJlc2l6ZVZhcnMgPSBVdGlscy5SZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcihtYXNrU2xpZGVXLCB3aW5kb3dILCBzLmltZ1Jlc3BvbnNpdmVTaXplWzBdLCBzLmltZ1Jlc3BvbnNpdmVTaXplWzFdKVxuXHRcdHMuc3ByaXRlLmFuY2hvci54ID0gMC41XG5cdFx0cy5zcHJpdGUuYW5jaG9yLnkgPSAwLjVcblx0XHRzLnNwcml0ZS5zY2FsZS54ID0gcmVzaXplVmFycy5zY2FsZVxuXHRcdHMuc3ByaXRlLnNjYWxlLnkgPSByZXNpemVWYXJzLnNjYWxlXG5cdFx0cy5zcHJpdGUud2lkdGggPSByZXNpemVWYXJzLndpZHRoXG5cdFx0cy5zcHJpdGUuaGVpZ2h0ID0gcmVzaXplVmFycy5oZWlnaHRcblx0XHRzLnNwcml0ZS54ID0gcmVzaXplVmFycy5sZWZ0XG5cdFx0cy5zcHJpdGUueSA9IHJlc2l6ZVZhcnMudG9wXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHZhciBzbGlkZXMgPSB0aGlzLnNsaWRlc1xuXHRcdHRoaXMuY291bnRlciArPSAwLjAxMlxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcyA9IHNsaWRlc1tpXVxuXHRcdFx0cy5tYXNrUmVjdC52YWx1ZVNjYWxlICs9ICgwLjQgLSBzLm1hc2tSZWN0LnZhbHVlU2NhbGUpICogMC4wNVxuXHRcdFx0dmFyIGVhc2UgPSB0aGlzLm1hc2tFYXNpbmcuZ2V0KHMubWFza1JlY3QudmFsdWVTY2FsZSlcblx0XHRcdHMud3JhcHBlckNvbnRhaW5lci54ICs9IChzLm5ld1Bvc2l0aW9uLnggLSBzLndyYXBwZXJDb250YWluZXIueCkgKiBlYXNlXG5cdFx0XHRzLm1hc2tSZWN0LndpZHRoID0gcy5tYXNrUmVjdC5uZXdXICogZWFzZVxuXHRcdFx0dmFyIG1hc2tSZWN0WCA9ICgxIC0gZWFzZSkgKiBzLm1hc2tSZWN0Lm5ld1hcblx0XHRcdHRoaXMuZHJhd0NlbnRlcmVkTWFza1JlY3Qocy5tYXNrUmVjdC5nLCBtYXNrUmVjdFgsIDAsIHMubWFza1JlY3Qud2lkdGgsIHMubWFza1JlY3QuaGVpZ2h0KVxuXHRcdFx0cy5zcHJpdGUuc2tldy54ID0gTWF0aC5jb3ModGhpcy5jb3VudGVyKSAqIDAuMDIwXG5cdFx0XHRzLnNwcml0ZS5za2V3LnkgPSBNYXRoLnNpbih0aGlzLmNvdW50ZXIpICogMC4wMjBcblx0XHR9XG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueCArPSAodGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGVYWSAtIHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLngpICogMC4wOFxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnkgKz0gKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFkgLSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54KSAqIDAuMDhcblx0fVxuXHRwb3NpdGlvblNsaWRlc2hvd0NvbnRhaW5lcigpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBsYXN0U2xpZGUgPSB0aGlzLnNsaWRlc1t0aGlzLnNsaWRlcy5sZW5ndGgtMV1cblx0XHR2YXIgY29udGFpbmVyVG90YWxXID0gbGFzdFNsaWRlLm5ld1Bvc2l0aW9uLnggKyBsYXN0U2xpZGUubWFza1JlY3QubmV3V1xuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnBpdm90LnggPSBjb250YWluZXJUb3RhbFcgPj4gMVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnBpdm90LnkgPSB3aW5kb3dIID4+IDFcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci54ID0gKHdpbmRvd1cgPj4gMSlcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci55ID0gKHdpbmRvd0ggPj4gMSlcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5iYXNlWSA9IHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnlcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54ID0gMS4zXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueSA9IDEuM1xuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFkgPSAxLjA1XG5cdH1cblx0YXBwbHlWYWx1ZXNUb1NsaWRlcygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBjdXJyZW50UG9zWCA9IDBcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcyA9IHRoaXMuc2xpZGVzW2ldXG5cdFx0XHR0aGlzLmFwcGx5UmVzcG9uc2l2ZUltZ1RvU2xpZGVEZXBlbmRzV2luZG93KHMpXG5cdFx0XHR2YXIgaGlnaHRsaWdodGVkU2xpZGVXID0gd2luZG93VyAqICgxIC0gKEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFICogMikpXG5cdFx0XHR2YXIgbm9ybWFsU2xpZGVXID0gd2luZG93VyAqIEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFXG5cdFx0XHR2YXIgc2xpZGVXID0gMFxuXHRcdFx0aWYocy5oaWdobGlnaHQpIHNsaWRlVyA9IGhpZ2h0bGlnaHRlZFNsaWRlV1xuXHRcdFx0ZWxzZSBzbGlkZVcgPSBub3JtYWxTbGlkZVdcblx0XHRcdHRoaXMucmVzaXplQW5kUG9zaXRpb25JbWdTcHJpdGUocywgc2xpZGVXLCB3aW5kb3dXLCB3aW5kb3dIKVxuXHRcdFx0cy5tYXNrUmVjdC5uZXdXID0gc2xpZGVXXG5cdFx0XHRzLm1hc2tSZWN0LmhlaWdodCA9IHdpbmRvd0hcblx0XHRcdHMubWFza1JlY3QubmV3WCA9IHNsaWRlVyA+PiAxXG5cdFx0XHRzLm1hc2tSZWN0LnZhbHVlU2NhbGUgPSAyXG5cdFx0XHRzLm9sZFBvc2l0aW9uLnggPSBzLm5ld1Bvc2l0aW9uLnhcblx0XHRcdHMubmV3UG9zaXRpb24ueCA9IGN1cnJlbnRQb3NYXG5cdFx0XHRpZih0aGlzLmVsZW1lbnRUaGF0TW92ZWRJblNsaWRlc0FycmF5ICE9IHVuZGVmaW5lZCAmJiB0aGlzLmVsZW1lbnRUaGF0TW92ZWRJblNsaWRlc0FycmF5LmlkID09IHMuaWQpe1xuXHRcdFx0XHRzLndyYXBwZXJDb250YWluZXIueCA9IHMubmV3UG9zaXRpb24ueFxuXHRcdFx0fVxuXHRcdFx0Y3VycmVudFBvc1ggKz0gc2xpZGVXXG5cdFx0fVxuXHRcdHRoaXMucG9zaXRpb25TbGlkZXNob3dDb250YWluZXIoKVxuXHR9XG5cdHBvc2l0aW9uVGl0bGVzQ29udGFpbmVyKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGl0bGVUaW1lb3V0KVxuXHRcdHRoaXMudGl0bGVUaW1lb3V0ID0gc2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dmFyIGNvbXBhc3NTaXplID0gKHdpbmRvd0ggKiBBcHBDb25zdGFudHMuQ09NUEFTU19TSVpFX1BFUkNFTlRBR0UpIDw8IDFcblx0XHRcdHZhciB0b3BPZmZzZXQgPSAod2luZG93SCA+PiAxKSArIChjb21wYXNzU2l6ZSA+PiAxKVxuXHRcdFx0dmFyIHRpdGxlc0NvbnRhaW5lckNzcyA9IHtcblx0XHRcdFx0dG9wOiB0b3BPZmZzZXQgKyAoKHdpbmRvd0ggLSB0b3BPZmZzZXQpID4+IDEpIC0gKHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LmhlaWdodCgpICogMC42KSxcblx0XHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAodGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQud2lkdGgoKSA+PiAxKSxcblx0XHRcdH1cblx0XHRcdHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LmNzcyh0aXRsZXNDb250YWluZXJDc3MpXG5cdFx0fSwgMClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5hcHBseVZhbHVlc1RvU2xpZGVzKClcblx0XHR0aGlzLnBvc2l0aW9uVGl0bGVzQ29udGFpbmVyKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblxuXHRcdHZhciBzbGlkZXMgPSB0aGlzLnNsaWRlc1xuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHNsaWRlcy5sZW5ndGg7IGkrKykge1xuXHQgXHRcdHZhciBzID0gc2xpZGVzW2ldXG5cblx0IFx0XHRzLm1hc2tSZWN0LmcuY2xlYXIoKVxuXHQgXHRcdEFwcFN0b3JlLnJlbGVhc2VHcmFwaGljcyhzLm1hc2tSZWN0LmcpXG5cblx0IFx0XHRzLnNwcml0ZS50ZXh0dXJlLmRlc3Ryb3kodHJ1ZSlcblx0IFx0XHRBcHBTdG9yZS5yZWxlYXNlU3ByaXRlKHMuc3ByaXRlKVxuXG5cdCBcdFx0cy53cmFwcGVyQ29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0IFx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHMud3JhcHBlckNvbnRhaW5lcilcblx0IFx0fVxuXG5cdCBcdHRoaXMuc2xpZGVzLmxlbmd0aCA9IDBcblx0IFx0dGhpcy5wbGFuZXROYW1lVHdlZW4gPSBudWxsXG5cblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnNsaWRlc2hvd0NvbnRhaW5lcilcblxuXHRcdHRoaXMuc2xpZGVzaG93V3JhcHBlci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnNsaWRlc2hvd1dyYXBwZXIpXG5cdFx0XG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQWENvbnRhaW5lciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHR9XG5cdGluaXQoZWxlbWVudElkKSB7XG5cblx0XHR0aGlzLmRpZEhhc2hlckNoYW5nZSA9IHRoaXMuZGlkSGFzaGVyQ2hhbmdlLmJpbmQodGhpcylcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCwgdGhpcy5kaWRIYXNoZXJDaGFuZ2UpXG5cdFx0QXBwU3RvcmUub24oQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRSwgdGhpcy5kaWRIYXNoZXJDaGFuZ2UpXG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnJlbmRlcmVyID0gbmV3IFBJWEkuYXV0b0RldGVjdFJlbmRlcmVyKDEsIDEsIHsgYW50aWFsaWFzOiB0cnVlIH0pXG5cdFx0XHR0aGlzLm9sZENvbG9yID0gXCIweGZmZmZmZlwiXG5cdFx0XHR0aGlzLm5ld0NvbG9yID0gXCIweGZmZmZmZlwiXG5cdFx0XHR0aGlzLmNvbG9yVHdlZW4gPSB7Y29sb3I6dGhpcy5vbGRDb2xvcn1cblx0XHRcdHZhciBlbCA9ICQoZWxlbWVudElkKVxuXHRcdFx0JCh0aGlzLnJlbmRlcmVyLnZpZXcpLmF0dHIoJ2lkJywgJ3B4LWNvbnRhaW5lcicpXG5cdFx0XHRlbC5hcHBlbmQodGhpcy5yZW5kZXJlci52aWV3KVxuXHRcdFx0dGhpcy5zdGFnZSA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0fVxuXHR9XG5cdGFkZChjaGlsZCkge1xuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm5cblx0XHR0aGlzLnN0YWdlLmFkZENoaWxkKGNoaWxkKVxuXHR9XG5cdHJlbW92ZShjaGlsZCkge1xuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm5cblx0XHR0aGlzLnN0YWdlLnJlbW92ZUNoaWxkKGNoaWxkKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgcmV0dXJuXG5cdCAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnN0YWdlKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgcmV0dXJuXG5cdFx0dmFyIHNjYWxlID0gKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID09IHVuZGVmaW5lZCkgPyAxIDogd2luZG93LmRldmljZVBpeGVsUmF0aW9cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmVuZGVyZXIucmVzaXplKHdpbmRvd1cgKiBzY2FsZSwgd2luZG93SCAqIHNjYWxlKVxuXHR9XG5cdGRpZEhhc2hlckNoYW5nZSgpIHtcblx0XHR2YXIgcGFnZUlkID0gQXBwU3RvcmUuZ2V0UGFnZUlkKClcblx0XHR2YXIgcGFsZXR0ZSA9IEFwcFN0b3JlLnBhbGV0dGVDb2xvcnNCeUlkKHBhZ2VJZClcblx0XHQvLyB0aGlzLm9sZENvbG9yID0gdGhpcy5uZXdDb2xvclxuXHRcdC8vIHRoaXMubmV3Q29sb3IgPSBwYWxldHRlWzBdXG5cdFx0Ly8gY29uc29sZS5sb2codGhpcy5vbGRDb2xvciwgdGhpcy5uZXdDb2xvcilcblx0XHQvLyBpZihwYWxldHRlICE9IHVuZGVmaW5lZCkgVHdlZW5NYXgudG8odGhpcy5yZW5kZXJlciwgMSwgeyBjb2xvclByb3BzOiB7YmFja2dyb3VuZENvbG9yOlwicmVkXCJ9fSlcblx0XHQvLyBpZihwYWxldHRlICE9IHVuZGVmaW5lZCkgVHdlZW5NYXgudG8odGhpcy5jb2xvclR3ZWVuLCAxLCB7IGNvbG9yUHJvcHM6IHtjb2xvcjp0aGlzLm5ld0NvbG9yfSwgb25VcGRhdGU6ICgpPT57XG5cdFx0Ly8gXHRjb25zb2xlLmxvZyh0aGlzLmNvbG9yVHdlZW4uY29sb3IpXG5cdFx0Ly8gfX0pXG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdGlmKHBhbGV0dGUgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHZhciBjID0gcGFsZXR0ZVswXVxuXHRcdFx0XHQkKCdodG1sJykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgYy5yZXBsYWNlKCcweCcsICcjJykpXG5cdFx0XHR9XG5cdFx0fWVsc2V7XG5cdFx0XHRpZihwYWxldHRlICE9IHVuZGVmaW5lZCkgdGhpcy5yZW5kZXJlci5iYWNrZ3JvdW5kQ29sb3IgPSBwYWxldHRlWzBdXG5cdFx0fVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVBhZ2UgZnJvbSAnQmFzZVBhZ2UnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhZ2UgZXh0ZW5kcyBCYXNlUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdFx0dGhpcy5yZXNpemUgPSB0aGlzLnJlc2l6ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5weENvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5jaGlsZC5jc3MoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJylcblx0XHRcdCQoJ2h0bWwnKS5jc3MoJ292ZXJmbG93LXknLCAnYXV0bycpXG5cdFx0fVxuXG5cdFx0aWYodGhpcy5wcm9wcy50eXBlID09IEFwcENvbnN0YW50cy5MQU5ESU5HKSB0aGlzLnBhcmVudC5jc3MoJ2N1cnNvcicsICdwb2ludGVyJylcblx0XHRlbHNlIHRoaXMucGFyZW50LmNzcygnY3Vyc29yJywgJ2F1dG8nKVxuXG5cdFx0c2V0VGltZW91dCgoKT0+e0FwcEFjdGlvbnMucHhBZGRDaGlsZCh0aGlzLnB4Q29udGFpbmVyKX0sIDApXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuV0lORE9XX1JFU0laRSwgdGhpcy5yZXNpemUpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c2V0VGltZW91dCgoKT0+e0FwcEFjdGlvbnMucHhSZW1vdmVDaGlsZCh0aGlzLnB4Q29udGFpbmVyKX0sIDApXG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRzZXR1cEFuaW1hdGlvbnMoKSB7XG5cdFx0c3VwZXIuc2V0dXBBbmltYXRpb25zKClcblx0fVxuXHRnZXRJbWFnZVVybEJ5SWQoaWQpIHtcblx0XHRyZXR1cm4gQXBwU3RvcmUuUHJlbG9hZGVyLmdldEltYWdlVVJMKHRoaXMuaWQgKyAnLScgKyB0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKSArICctJyArIGlkKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLnB4Q29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIpXG5cdFx0QXBwU3RvcmUub2ZmKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBCYXNlUGFnZXIgZnJvbSAnQmFzZVBhZ2VyJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5pbXBvcnQgTGFuZGluZyBmcm9tICdMYW5kaW5nJ1xuaW1wb3J0IExhbmRpbmdUZW1wbGF0ZSBmcm9tICdMYW5kaW5nX2hicydcbmltcG9ydCBQbGFuZXRFeHBlcmllbmNlUGFnZSBmcm9tICdQbGFuZXRFeHBlcmllbmNlUGFnZSdcbmltcG9ydCBQbGFuZXRFeHBlcmllbmNlUGFnZVRlbXBsYXRlIGZyb20gJ1BsYW5ldEV4cGVyaWVuY2VQYWdlX2hicydcbmltcG9ydCBQbGFuZXRDYW1wYWlnblBhZ2UgZnJvbSAnUGxhbmV0Q2FtcGFpZ25QYWdlJ1xuaW1wb3J0IFBsYW5ldENhbXBhaWduUGFnZVRlbXBsYXRlIGZyb20gJ1BsYW5ldENhbXBhaWduUGFnZV9oYnMnXG5cbmNsYXNzIFBhZ2VzQ29udGFpbmVyIGV4dGVuZHMgQmFzZVBhZ2VyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IGZhbHNlXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VELCB0aGlzLmRpZEhhc2hlckNoYW5nZSlcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfSU5URVJOQUxfQ0hBTkdFLCB0aGlzLmRpZEhhc2hlckludGVybmFsQ2hhbmdlKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9mZihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCwgdGhpcy5kaWRIYXNoZXJDaGFuZ2UpXG5cdFx0QXBwU3RvcmUub2ZmKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0UsIHRoaXMuZGlkSGFzaGVySW50ZXJuYWxDaGFuZ2UpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG5cdGRpZEhhc2hlckludGVybmFsQ2hhbmdlKCkge1xuXHRcdHRoaXMuY3VycmVudENvbXBvbmVudC5pbnRlcm5hbEhhc2hlckNoYW5nZWQoKVxuXHR9XG5cdGRpZEhhc2hlckNoYW5nZSgpIHtcblx0XHQvLyBTd2FsbG93IGhhc2hlciBjaGFuZ2UgaWYgdGhlIGNoYW5nZSBpcyBmYXN0IGFzIDFzZWNcblx0XHRpZih0aGlzLnN3YWxsb3dIYXNoZXJDaGFuZ2UpIHJldHVybiBcblx0XHRlbHNlIHRoaXMuc2V0dXBOZXdib3JuQ29tcG9uZW50cygpXG5cdFx0dGhpcy5zd2FsbG93SGFzaGVyQ2hhbmdlID0gdHJ1ZVxuXHRcdHRoaXMuaGFzaGVyQ2hhbmdlVGltZW91dCA9IHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IGZhbHNlXG5cdFx0fSwgMTAwMClcblx0fVxuXHRzZXR1cE5ld2Jvcm5Db21wb25lbnRzKCkge1xuXHRcdHZhciBoYXNoID0gUm91dGVyLmdldE5ld0hhc2goKVxuXHRcdHZhciB0ZW1wbGF0ZSA9IHsgdHlwZTogdW5kZWZpbmVkLCBwYXJ0aWFsOiB1bmRlZmluZWQgfVxuXHRcdHN3aXRjaChoYXNoLnBhcnRzLmxlbmd0aCkge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gTGFuZGluZ1xuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gTGFuZGluZ1RlbXBsYXRlXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXBsYXRlLnR5cGUgPSBQbGFuZXRFeHBlcmllbmNlUGFnZVxuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gUGxhbmV0RXhwZXJpZW5jZVBhZ2VUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gUGxhbmV0Q2FtcGFpZ25QYWdlXG5cdFx0XHRcdHRlbXBsYXRlLnBhcnRpYWwgPSBQbGFuZXRDYW1wYWlnblBhZ2VUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGVtcGxhdGUudHlwZSA9IExhbmRpbmdcblx0XHRcdFx0dGVtcGxhdGUucGFydGlhbCA9IExhbmRpbmdUZW1wbGF0ZVx0XHRcblx0XHR9XG5cblx0XHR0aGlzLnNldHVwTmV3Q29tcG9uZW50KGhhc2gucGFyZW50LCB0ZW1wbGF0ZSlcblx0XHR0aGlzLmN1cnJlbnRDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLmN1cnJlbnRDb21wb25lbnQgIT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJlbnRDb21wb25lbnQudXBkYXRlKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQYWdlc0NvbnRhaW5lclxuXG5cblxuIiwiaW1wb3J0IEJhc2VDYW1wYWlnblBhZ2UgZnJvbSAnQmFzZUNhbXBhaWduUGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFycm93QnRuIGZyb20gJ0Fycm93QnRuJ1xuaW1wb3J0IFBsYXlCdG4gZnJvbSAnUGxheUJ0bidcbmltcG9ydCBSZWN0YW5nbGVCdG4gZnJvbSAnUmVjdGFuZ2xlQnRuJ1xuaW1wb3J0IFRpdGxlU3dpdGNoZXIgZnJvbSAnVGl0bGVTd2l0Y2hlcidcbmltcG9ydCBDb21wYXNzZXNDb250YWluZXIgZnJvbSAnQ29tcGFzc2VzQ29udGFpbmVyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGFuZXRDYW1wYWlnblBhZ2UgZXh0ZW5kcyBCYXNlQ2FtcGFpZ25QYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRwcm9wcy5kYXRhWydlbXB0eS1pbWFnZSddID0gQXBwU3RvcmUuZ2V0RW1wdHlJbWdVcmwoKVxuXHRcdHN1cGVyKHByb3BzKVxuXHRcdHRoaXMucHJvZHVjdElkID0gdW5kZWZpbmVkXG5cdFx0dGhpcy5mcm9tSW50ZXJuYWxDaGFuZ2UgPSBmYWxzZVxuXHRcdHRoaXMuY3VycmVudEluZGV4ID0gMFxuXHRcdHRoaXMuZGlyZWN0aW9uID0gQXBwQ29uc3RhbnRzLkxFRlRcblx0XHR0aGlzLmN1cnJlbnRQcm9kdWN0Q29udGFpbmVyQ2xhc3MgPSAncHJvZHVjdC1jb250YWluZXItYidcblx0XHR0aGlzLnRpbWVvdXRUaW1lID0gOTAwXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy51cGRhdGVQcm9kdWN0RGF0YSgpXG5cblx0XHR0aGlzLmluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zTGFuZ1Njb3BlKClcblxuXHRcdHZhciBzbGlkZXNob3dUaXRsZSA9IHRoaXMuY2hpbGQuZmluZCgnLnNsaWRlc2hvdy10aXRsZScpXG5cdFx0dmFyIHBsYW5ldFRpdGxlID0gc2xpZGVzaG93VGl0bGUuZmluZCgnLnBsYW5ldC10aXRsZScpXG5cdFx0dmFyIHBsYW5ldE5hbWUgPSBzbGlkZXNob3dUaXRsZS5maW5kKCcucGxhbmV0LW5hbWUnKVxuXHQgXHR0aGlzLnRpdGxlQ29udGFpbmVyID0ge1xuXHQgXHRcdHBhcmVudDogc2xpZGVzaG93VGl0bGUsXG5cdCBcdFx0cGxhbmV0VGl0bGU6IHBsYW5ldFRpdGxlLFxuXHQgXHRcdHBsYW5ldE5hbWU6IHBsYW5ldE5hbWVcblx0IFx0fVxuXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuID0gVHdlZW5NYXguZnJvbVRvKHBsYW5ldE5hbWUsIDAuNSwge3NjYWxlWDoxLjQsIHNjYWxlWTowLCBvcGFjaXR5OjB9LCB7IHNjYWxlOjEsIG9wYWNpdHk6MSwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9KVxuXHQgXHR0aGlzLnBsYW5ldE5hbWVUd2Vlbi5wYXVzZSgwKVxuXG5cdFx0dmFyIHByb2R1Y3RDb250YWluZXJzV3JhcHBlciA9IHRoaXMuY2hpbGQuZmluZCgnLnByb2R1Y3QtY29udGFpbmVycy13cmFwcGVyJylcblx0XHR2YXIgY29udGFpbmVyQSA9IHByb2R1Y3RDb250YWluZXJzV3JhcHBlci5maW5kKCcucHJvZHVjdC1jb250YWluZXItYScpXG5cdFx0dmFyIGNvbnRhaW5lckIgPSBwcm9kdWN0Q29udGFpbmVyc1dyYXBwZXIuZmluZCgnLnByb2R1Y3QtY29udGFpbmVyLWInKVxuXHRcdHRoaXMuY29udGFpbmVycyA9IHtcblx0XHRcdCdwcm9kdWN0LWNvbnRhaW5lci1hJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQSxcblx0XHRcdFx0cG9zdGVyV3JhcHBlcjogY29udGFpbmVyQS5maW5kKCcucG9zdGVyLXdyYXBwZXInKSxcblx0XHRcdFx0cG9zdGVySW1nOiBjb250YWluZXJBLmZpbmQoJ2ltZycpLFxuXHRcdFx0XHRzcGlubmVyOiB7XG5cdFx0XHRcdFx0ZWw6IGNvbnRhaW5lckEuZmluZCgnLnNwaW5uZXItd3JhcHBlcicpLFxuXHRcdFx0XHRcdHN2ZzogY29udGFpbmVyQS5maW5kKCcuc3Bpbm5lci13cmFwcGVyIHN2ZycpLFxuXHRcdFx0XHRcdHBhdGg6IGNvbnRhaW5lckEuZmluZCgnLnNwaW5uZXItd3JhcHBlciBzdmcgcGF0aCcpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHZpZGVvOiB7XG5cdFx0XHRcdFx0ZWw6IGNvbnRhaW5lckEuZmluZCgnLnZpZGVvLXdyYXBwZXInKSxcblx0XHRcdFx0XHRwbGF5OiBjb250YWluZXJBLmZpbmQoJy5wbGF5LWJ0bicpLFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogY29udGFpbmVyQS5maW5kKCcudmlkZW8tY29udGFpbmVyJyksXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQncHJvZHVjdC1jb250YWluZXItYic6IHtcblx0XHRcdFx0ZWw6IGNvbnRhaW5lckIsXG5cdFx0XHRcdHBvc3RlcldyYXBwZXI6IGNvbnRhaW5lckIuZmluZCgnLnBvc3Rlci13cmFwcGVyJyksXG5cdFx0XHRcdHBvc3RlckltZzogY29udGFpbmVyQi5maW5kKCdpbWcnKSxcblx0XHRcdFx0c3Bpbm5lcjoge1xuXHRcdFx0XHRcdGVsOiBjb250YWluZXJCLmZpbmQoJy5zcGlubmVyLXdyYXBwZXInKSxcblx0XHRcdFx0XHRzdmc6IGNvbnRhaW5lckIuZmluZCgnLnNwaW5uZXItd3JhcHBlciBzdmcnKSxcblx0XHRcdFx0XHRwYXRoOiBjb250YWluZXJCLmZpbmQoJy5zcGlubmVyLXdyYXBwZXIgc3ZnIHBhdGgnKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR2aWRlbzoge1xuXHRcdFx0XHRcdGVsOiBjb250YWluZXJCLmZpbmQoJy52aWRlby13cmFwcGVyJyksXG5cdFx0XHRcdFx0cGxheTogY29udGFpbmVyQi5maW5kKCcucGxheS1idG4nKSxcblx0XHRcdFx0XHRjb250YWluZXI6IGNvbnRhaW5lckIuZmluZCgnLnZpZGVvLWNvbnRhaW5lcicpLFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5hcnJvd0NsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vbkJ1eUNsaWNrZWQgPSB0aGlzLm9uQnV5Q2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vblBsYW5ldENsaWNrZWQgPSB0aGlzLm9uUGxhbmV0Q2xpY2tlZC5iaW5kKHRoaXMpXG5cblx0XHR0aGlzLnByZXZpb3VzQnRuID0gbmV3IEFycm93QnRuKHRoaXMuY2hpbGQuZmluZCgnLnByZXZpb3VzLWJ0bicpLCBBcHBDb25zdGFudHMuTEVGVClcblx0XHR0aGlzLnByZXZpb3VzQnRuLmJ0bkNsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZFxuXHRcdHRoaXMucHJldmlvdXNCdG4uY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdHRoaXMubmV4dEJ0biA9IG5ldyBBcnJvd0J0bih0aGlzLmNoaWxkLmZpbmQoJy5uZXh0LWJ0bicpLCBBcHBDb25zdGFudHMuUklHSFQpXG5cdFx0dGhpcy5uZXh0QnRuLmJ0bkNsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZFxuXHRcdHRoaXMubmV4dEJ0bi5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHR0aGlzLmJ1eUJ0biA9IG5ldyBUaXRsZVN3aXRjaGVyKHRoaXMuY2hpbGQuZmluZCgnLmJ1eS1idG4nKSwgdGhpcy5jaGlsZC5maW5kKCcuZG90cy1yZWN0YW5nbGUtYnRuJyksIHRoaXMuaW5mb3NbJ2J1eV90aXRsZSddKVxuXHRcdHRoaXMuYnV5QnRuLm9uQ2xpY2sgPSB0aGlzLm9uQnV5Q2xpY2tlZFxuXHRcdHRoaXMuYnV5QnRuLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHRoaXMucGxheUJ0biA9IG5ldyBQbGF5QnRuKHRoaXMuY2hpbGQuZmluZCgnLnBsYXktYnRuJykpXG5cdFx0dGhpcy5wbGF5QnRuLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdGlmKCFBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIgPSBuZXcgQ29tcGFzc2VzQ29udGFpbmVyKHRoaXMucHhTY3JvbGxDb250YWluZXIsIHRoaXMuY2hpbGQuZmluZChcIi5pbnRlcmZhY2UuYWJzb2x1dGVcIikpXG5cdFx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5pZCA9IHRoaXMuaWRcblx0XHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmNvbXBvbmVudERpZE1vdW50KClcblx0XHR9XG5cblx0XHQvLyB0aGlzLm9uVmlkZW9Nb3VzZUVudGVyID0gdGhpcy5vblZpZGVvTW91c2VFbnRlci5iaW5kKHRoaXMpXG5cdFx0Ly8gdGhpcy5vblZpZGVvTW91c2VMZWF2ZSA9IHRoaXMub25WaWRlb01vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHRcdC8vIHRoaXMub25WaWRlb0NsaWNrID0gdGhpcy5vblZpZGVvQ2xpY2suYmluZCh0aGlzKVxuXG5cdFx0dGhpcy5jaGVja0N1cnJlbnRQcm9kdWN0QnlVcmwoKVxuXHRcdHRoaXMudXBkYXRlQ29sb3JzKClcblx0XHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIHRoaXMub25LZXlQcmVzc2VkKVxuXG5cdFx0dGhpcy51cGRhdGVUaXRsZXModGhpcy5pbmZvcy5wbGFuZXQudG9VcHBlckNhc2UoKSwgdGhpcy5pZC50b1VwcGVyQ2FzZSgpKVxuXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGFkZFZpZGVvRXZlbnRzKCkge1xuXHRcdC8vIGlmKHRoaXMuY3VycmVudENvbnRhaW5lciA9PSB1bmRlZmluZWQpIHJldHVyblxuXHRcdC8vIHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5lbC5vbignbW91c2VlbnRlcicsIHRoaXMub25WaWRlb01vdXNlRW50ZXIpXG5cdFx0Ly8gdGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5vblZpZGVvTW91c2VMZWF2ZSlcblx0XHQvLyB0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8uZWwub24oJ2NsaWNrJywgdGhpcy5vblZpZGVvQ2xpY2spXG5cdH1cblx0cmVtb3ZlVmlkZW9FdmVudHMoKSB7XG5cdFx0Ly8gaWYodGhpcy5jdXJyZW50Q29udGFpbmVyID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cdFx0Ly8gdGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLm9mZignbW91c2VlbnRlcicsIHRoaXMub25WaWRlb01vdXNlRW50ZXIpXG5cdFx0Ly8gdGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLm9mZignbW91c2VsZWF2ZScsIHRoaXMub25WaWRlb01vdXNlTGVhdmUpXG5cdFx0Ly8gdGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLm9mZignY2xpY2snLCB0aGlzLm9uVmlkZW9DbGljaylcblx0fVxuXHRvblZpZGVvTW91c2VFbnRlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLnBsYXkuYWRkQ2xhc3MoJ2hvdmVyZWQnKVxuXHR9XG5cdG9uVmlkZW9Nb3VzZUxlYXZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8ucGxheS5yZW1vdmVDbGFzcygnaG92ZXJlZCcpXG5cdH1cblx0b25WaWRlb0NsaWNrKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLmFzc2lnblZpZGVvVG9OZXdDb250YWluZXIoKVxuXHR9XG5cdHVwZGF0ZVRpdGxlcyh0aXRsZSwgbmFtZSkge1xuXHRcdHZhciBwbGFuZXRUaXRsZSA9IHRoaXMudGl0bGVDb250YWluZXIucGxhbmV0VGl0bGVcblx0XHR2YXIgcGxhbmV0TmFtZSA9IHRoaXMudGl0bGVDb250YWluZXIucGxhbmV0TmFtZVxuXHQgXHRwbGFuZXRUaXRsZS50ZXh0KHRpdGxlKVxuXHQgXHRwbGFuZXROYW1lLnRleHQobmFtZSlcblx0IFx0dGhpcy5wbGFuZXROYW1lVHdlZW4ucGxheSgwKVxuXHR9XG5cdHVwZGF0ZVByb2R1Y3REYXRhKCkge1xuXHRcdHRoaXMucHJvZHVjdHMgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHRoaXMuaWQpXG5cdH1cblx0b25QbGFuZXRDbGlja2VkKCkge1xuXHRcdHZhciB1cmwgPSBcIi9sYW5kaW5nXCJcblx0XHRSb3V0ZXIuc2V0SGFzaCh1cmwpXG5cdH1cblx0b25CdXlDbGlja2VkKCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdidXknKVxuXHRcdC8vIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gXG5cdH1cblx0YXJyb3dDbGlja2VkKGRpcmVjdGlvbikge1xuXHRcdGlmKHRoaXMuYW5pbWF0aW9uUnVubmluZykgcmV0dXJuXG5cdFx0dGhpcy5zd2l0Y2hTbGlkZUJ5RGlyZWN0aW9uKGRpcmVjdGlvbilcblx0fVxuXHRvbktleVByZXNzZWQoZSkge1xuXHRcdGlmKHRoaXMuYW5pbWF0aW9uUnVubmluZykgcmV0dXJuXG5cdCAgICBlLnByZXZlbnREZWZhdWx0KClcblx0XHRzd2l0Y2goZS53aGljaCkge1xuXHQgICAgICAgIGNhc2UgMzc6IC8vIGxlZnRcblx0ICAgICAgICBcdHRoaXMuc3dpdGNoU2xpZGVCeURpcmVjdGlvbihBcHBDb25zdGFudHMuTEVGVClcblx0ICAgICAgICBcdGJyZWFrO1xuXHQgICAgICAgIGNhc2UgMzk6IC8vIHJpZ2h0XG5cdCAgICAgICAgXHR0aGlzLnN3aXRjaFNsaWRlQnlEaXJlY3Rpb24oQXBwQ29uc3RhbnRzLlJJR0hUKVxuXHQgICAgICAgIFx0YnJlYWs7XG5cdCAgICAgICAgY2FzZSAzODogLy8gdXBcblx0ICAgICAgICBcdGJyZWFrO1xuXHQgICAgICAgIGNhc2UgNDA6IC8vIGRvd25cblx0ICAgICAgICBcdGJyZWFrO1xuXHQgICAgICAgIGRlZmF1bHQ6IHJldHVybjtcblx0ICAgIH1cblx0fVxuXHRzd2l0Y2hTbGlkZUJ5RGlyZWN0aW9uKGRpcmVjdGlvbikge1xuXHRcdHN3aXRjaChkaXJlY3Rpb24pIHtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxFRlQ6XG5cdFx0XHRcdHRoaXMucHJldmlvdXMoKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuUklHSFQ6XG5cdFx0XHRcdHRoaXMubmV4dCgpXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdGlmKHRoaXMuY3VycmVudEluZGV4ID4gdGhpcy5wcm9kdWN0cy5sZW5ndGgtMSkge1xuXHRcdFx0dmFyIG5leHRJZCA9IEFwcFN0b3JlLmdldE5leHRQbGFuZXQodGhpcy5pZClcblx0XHRcdHZhciBuZXh0dXJsID0gXCIvcGxhbmV0L1wiICsgbmV4dElkICsgJy8wJ1xuXHRcdFx0Um91dGVyLnNldEhhc2gobmV4dHVybClcblx0XHRcdHJldHVyblxuXHRcdH1lbHNlIGlmKHRoaXMuY3VycmVudEluZGV4IDwgMCkge1xuXHRcdFx0dmFyIHByZXZpb3VzSWQgPSBBcHBTdG9yZS5nZXRQcmV2aW91c1BsYW5ldCh0aGlzLmlkKVxuXHRcdFx0dmFyIHByb2R1Y3RzRGF0YSA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQocHJldmlvdXNJZClcblx0XHRcdHZhciBwcmV2aW91c3VybCA9IFwiL3BsYW5ldC9cIiArIHByZXZpb3VzSWQgKyAnLycgKyAocHJvZHVjdHNEYXRhLmxlbmd0aC0xKS50b1N0cmluZygpXG5cdFx0XHRSb3V0ZXIuc2V0SGFzaChwcmV2aW91c3VybClcblx0XHRcdHJldHVyblxuXHRcdH1cblx0XHR0aGlzLnVwZGF0ZUhhc2hlcigpXG5cdH1cblx0dXBkYXRlSGFzaGVyKCkge1xuXHRcdHZhciB1cmwgPSBcIi9wbGFuZXQvXCIgKyB0aGlzLmlkICsgJy8nICsgdGhpcy5jdXJyZW50SW5kZXhcblx0XHRSb3V0ZXIuc2V0SGFzaCh1cmwpXG5cdH1cblx0bmV4dCgpIHtcblx0XHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5MRUZUXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggKz0gMVxuXHR9XG5cdHByZXZpb3VzKCkge1xuXHRcdHRoaXMuZGlyZWN0aW9uID0gQXBwQ29uc3RhbnRzLlJJR0hUXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggLT0gMVxuXHR9XG5cdGdldEN1cnJlbnRJbmRleEZyb21Qcm9kdWN0SWQocHJvZHVjdElkKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnByb2R1Y3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZih0aGlzLnByb2R1Y3RzW2ldLmlkID09IHByb2R1Y3RJZCkge1xuXHRcdFx0XHRyZXR1cm4gaVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRpbnRlcm5hbEhhc2hlckNoYW5nZWQoKSB7XG5cdFx0dmFyIG5ld0lkID0gQXBwU3RvcmUuZ2V0UGFnZUlkKClcblx0XHRpZihuZXdJZCAhPSB0aGlzLmlkKSB7XG5cdFx0XHR0aGlzLnVwZGF0ZVRpdGxlcyh0aGlzLmluZm9zLnBsYW5ldC50b1VwcGVyQ2FzZSgpLCBuZXdJZC50b1VwcGVyQ2FzZSgpKVxuXHRcdFx0dGhpcy5wb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpXG5cdFx0fVxuXHRcdHRoaXMuaWQgPSBuZXdJZFxuXHRcdHRoaXMucHJvcHMuZGF0YSA9IEFwcFN0b3JlLnBhZ2VDb250ZW50KClcblx0XHR0aGlzLnVwZGF0ZVByb2R1Y3REYXRhKClcblx0XHR0aGlzLmZyb21JbnRlcm5hbENoYW5nZSA9IHRydWVcblx0XHR0aGlzLmNoZWNrQ3VycmVudFByb2R1Y3RCeVVybCgpXG5cblx0XHRpZighQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmN1cnJlbnRJbmRleCA9IHRoaXMuY3VycmVudEluZGV4XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5jaGFuZ2VEYXRhKHRoaXMuaWQpXG5cdFx0fVxuXHRcdHRoaXMudXBkYXRlQ29sb3JzKClcblx0fVxuXHRjaGVja0N1cnJlbnRQcm9kdWN0QnlVcmwoKSB7XG5cdFx0dmFyIG5ld0hhc2hlciA9IFJvdXRlci5nZXROZXdIYXNoKClcblx0XHR2YXIgcHJvZHVjdElkID0gcGFyc2VJbnQobmV3SGFzaGVyLnRhcmdldElkLCAxMClcblx0XHR0aGlzLmN1cnJlbnRJbmRleCA9IHRoaXMuZ2V0Q3VycmVudEluZGV4RnJvbVByb2R1Y3RJZChwcm9kdWN0SWQpXG5cdFx0dGhpcy5zaG93UHJvZHVjdEJ5SWQocHJvZHVjdElkKVxuXHR9XG5cdHVwZGF0ZUNvbG9ycygpIHtcblx0XHR2YXIgY29sb3IgPSB0aGlzLnByb2R1Y3RzW3RoaXMuY3VycmVudEluZGV4XS5jb2xvclxuXHRcdHRoaXMuYnV5QnRuLnVwZGF0ZUNvbG9yKGNvbG9yKVxuXHRcdHZhciBjID0gY29sb3IucmVwbGFjZSgnMHgnLCAnIycpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnNwaW5uZXIucGF0aC5jc3MoJ2ZpbGwnLCBjKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5lbC5jc3MoJ2JhY2tncm91bmQtY29sb3InLCBjKVxuXHR9XG5cdHNob3dQcm9kdWN0QnlJZChpZCkge1xuXHRcdHRoaXMuYW5pbWF0aW9uUnVubmluZyA9IHRydWVcblx0XHR0aGlzLnByb2R1Y3RJZCA9IGlkXG5cdFx0dGhpcy5jdXJyZW50UHJvZHVjdENvbnRhaW5lckNsYXNzID0gKHRoaXMuY3VycmVudFByb2R1Y3RDb250YWluZXJDbGFzcyA9PT0gJ3Byb2R1Y3QtY29udGFpbmVyLWEnKSA/ICdwcm9kdWN0LWNvbnRhaW5lci1iJyA6ICdwcm9kdWN0LWNvbnRhaW5lci1hJ1xuXHRcdHRoaXMucHJldmlvdXNDb250YWluZXIgPSB0aGlzLmN1cnJlbnRDb250YWluZXJcblx0XHR0aGlzLnJlbW92ZVZpZGVvRXZlbnRzKClcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lcnNbdGhpcy5jdXJyZW50UHJvZHVjdENvbnRhaW5lckNsYXNzXVxuXHRcdHRoaXMuYWRkVmlkZW9FdmVudHMoKVxuXHRcdFxuXHRcdHRoaXMuYXNzaWduQXNzZXRzVG9OZXdDb250YWluZXIoKVxuXHRcdHRoaXMucmVzaXplTWVkaWFXcmFwcGVycygpXG5cdFx0dGhpcy5yZXNpemVWaWRlb1dyYXBwZXIoKVxuXHRcdHRoaXMuYW5pbWF0ZUNvbnRhaW5lcnMoKVxuXG5cdFx0dGhpcy51cGRhdGVQYWdlSGVpZ2h0KClcblx0fVxuXHRhc3NpZ25Bc3NldHNUb05ld0NvbnRhaW5lcigpIHtcblx0XHR2YXIgcHJvZHVjdFNjb3BlID0gQXBwU3RvcmUuZ2V0U3BlY2lmaWNQcm9kdWN0QnlJZCh0aGlzLmlkLCB0aGlzLnByb2R1Y3RJZClcblx0XHR2YXIgaW1nU2l6ZSA9IEFwcFN0b3JlLnJlc3BvbnNpdmVQb3N0ZXJJbWFnZSgpXG5cdFx0dmFyIGltZ1NyYyA9IEFwcFN0b3JlLmdldEVudmlyb25tZW50KCkuc3RhdGljICsgJ2ltYWdlL3BsYW5ldHMvJyArIHRoaXMuaWQgKyAnLycgKyBwcm9kdWN0U2NvcGVbJ2lkJ10gKyAnLScgKyBpbWdTaXplICsgJy5qcGcnXG5cblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIucG9zdGVySW1nLmF0dHIoJ3NyYycsIHRoaXMucHJvcHMuZGF0YVsnZW1wdHktaW1hZ2UnXSlcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIucG9zdGVySW1nLnJlbW92ZUNsYXNzKCdvcGVuZWQnKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5zcGlubmVyLmVsLnJlbW92ZUNsYXNzKCdjbG9zZWQnKVxuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKVxuXHRcdGltZy5vbmxvYWQgPSAoKT0+IHtcblx0XHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5wb3N0ZXJJbWcuYXR0cignc3JjJywgaW1nU3JjKVxuXHRcdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnNwaW5uZXIuZWwuYWRkQ2xhc3MoJ2Nsb3NlZCcpXG5cdFx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIucG9zdGVySW1nLmFkZENsYXNzKCdvcGVuZWQnKVxuXHRcdH1cblx0XHRpbWcuc3JjID0gaW1nU3JjXG5cblx0XHR0aGlzLmJ1eUJ0bi51cGRhdGUodGhpcy5pbmZvcy5idXlfdGl0bGUgKyAnICcgKyBwcm9kdWN0U2NvcGUubmFtZSlcblx0fVxuXHRhc3NpZ25WaWRlb1RvTmV3Q29udGFpbmVyKCkge1xuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ29wZW5lZCcpXG5cblx0XHR2YXIgcHJvZHVjdFNjb3BlID0gQXBwU3RvcmUuZ2V0U3BlY2lmaWNQcm9kdWN0QnlJZCh0aGlzLmlkLCB0aGlzLnByb2R1Y3RJZClcblx0XHR2YXIgdmlkZW9JZCA9IHByb2R1Y3RTY29wZVsndmlkZW8taWQnXVxuXHRcdHZhciBmcmFtZVVVSUQgPSBVdGlscy5VVUlEKClcblx0XHR2YXIgaWZyYW1lU3RyID0gJzxpZnJhbWUgc3JjPVwiLy9mYXN0Lndpc3RpYS5uZXQvZW1iZWQvaWZyYW1lLycrdmlkZW9JZCsnXCIgaWQ9XCInK2ZyYW1lVVVJRCsnXCIgYWxsb3d0cmFuc3BhcmVuY3k9XCJmYWxzZVwiIGZyYW1lYm9yZGVyPVwiMFwiIHNjcm9sbGluZz1cIm5vXCIgY2xhc3M9XCJ3aXN0aWFfZW1iZWRcIiBuYW1lPVwid2lzdGlhX2VtYmVkXCIgYWxsb3dmdWxsc2NyZWVuIG1vemFsbG93ZnVsbHNjcmVlbiB3ZWJraXRhbGxvd2Z1bGxzY3JlZW4gb2FsbG93ZnVsbHNjcmVlbiBtc2FsbG93ZnVsbHNjcmVlbiB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIxMDAlXCI+PC9pZnJhbWU+J1xuXHRcdHZhciBpZnJhbWUgPSAkKGlmcmFtZVN0cilcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8udXVpZCA9IGZyYW1lVVVJRFxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5jb250YWluZXIuaHRtbChpZnJhbWUpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvSXNBZGRlZCA9IHRydWVcblxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5jb250YWluZXIuYWRkQ2xhc3MoJ29wZW5lZCcpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICd0cmFuc3BhcmVudCcpXG5cblx0XHQvLyBzZXRUaW1lb3V0KCgpPT57XG5cdFx0Ly8gXHR2YXIgd2lzdGlhRW1iZWQgPSAkKCcjJytmcmFtZVVVSUQpWzBdLndpc3RpYUFwaVxuXHRcdC8vIFx0d2lzdGlhRW1iZWQuYmluZChcImVuZFwiLCAoKT0+IHtcblx0XHQvLyBcdFx0YWxlcnQoXCJUaGUgdmlkZW8gZW5kZWQhXCIpO1xuXHRcdC8vIFx0fSk7XG5cdFx0Ly8gfSwgMjAwMClcblx0fVxuXHRhbmltYXRlQ29udGFpbmVycygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBkaXIgPSAodGhpcy5kaXJlY3Rpb24gPT0gQXBwQ29uc3RhbnRzLkxFRlQpID8gMSA6IC0xXG5cdFx0dmFyIHRpbWUgPSAodGhpcy5wcmV2aW91c0NvbnRhaW5lciA9PSB1bmRlZmluZWQpID8gMCA6IDFcblx0XHRpZih0aGlzLnByZXZpb3VzQ29udGFpbmVyICE9IHVuZGVmaW5lZCkgVHdlZW5NYXguZnJvbVRvKHRoaXMucHJldmlvdXNDb250YWluZXIuZWwsIDEsIHt4OjAsIG9wYWNpdHk6IDF9LCB7IHg6LXdpbmRvd1cqZGlyLCBvcGFjaXR5OiAxLCBmb3JjZTNEOnRydWUsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHRUd2Vlbk1heC5mcm9tVG8odGhpcy5jdXJyZW50Q29udGFpbmVyLmVsLCB0aW1lLCB7eDp3aW5kb3dXKmRpciwgb3BhY2l0eTogMX0sIHsgeDowLCBvcGFjaXR5OiAxLCBmb3JjZTNEOnRydWUsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR0aGlzLnVwZGF0ZVRvcEJ1dHRvbnNQb3NpdGlvbnMoKVxuXHRcdFx0dGhpcy5idXlCdG4uc2hvdygpXG5cdFx0fSwgMjAwKVxuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuYW5pbWF0aW9uUnVubmluZyA9IGZhbHNlXG5cdFx0XHR0aGlzLnJlbW92ZVByZXZpb3VzQ29udGFpbmVyQXNzZXRzKClcblx0XHR9LCB0aGlzLnRpbWVvdXRUaW1lKVxuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuYXNzaWduVmlkZW9Ub05ld0NvbnRhaW5lcigpXG5cdFx0fSwgdGhpcy50aW1lb3V0VGltZSArIDUwMClcblx0fVxuXHRyZW1vdmVQcmV2aW91c0NvbnRhaW5lckFzc2V0cygpIHtcblx0XHRpZih0aGlzLnByZXZpb3VzQ29udGFpbmVyID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cdFx0dGhpcy5wcmV2aW91c0NvbnRhaW5lci5wb3N0ZXJJbWcuYXR0cignc3JjJywgdGhpcy5wcm9wcy5kYXRhWydlbXB0eS1pbWFnZSddKVxuXHRcdHRoaXMucHJldmlvdXNDb250YWluZXIudmlkZW8uY29udGFpbmVyLmh0bWwoJycpXG5cdFx0dGhpcy5wcmV2aW91c0NvbnRhaW5lci52aWRlby5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ29wZW5lZCcpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvSXNBZGRlZCA9IGZhbHNlXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5jdXJyZW50SW5kZXggPSB0aGlzLmN1cnJlbnRJbmRleFxuXHRcdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVxuXHRcdH1cblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpXG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0d2lsbFRyYW5zaXRpb25PdXQoKSB7XG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci53aWxsVHJhbnNpdGlvbk91dCgpXG5cdFx0c3VwZXIud2lsbFRyYW5zaXRpb25PdXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZighQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLnVwZGF0ZSgpXG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemVNZWRpYVdyYXBwZXJzKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR2YXIgb3JpZW50YXRpb24gPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSA6IHVuZGVmaW5lZFxuXHRcdHZhciBzY2FsZSA9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyAxIDogMC42XG5cblx0XHR2YXIgaW1hZ2VSZXNpemUgPSBVdGlscy5SZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5KHdpbmRvd1cgKiBzY2FsZSwgd2luZG93SCAqIHNjYWxlLCBBcHBDb25zdGFudHMuQ0FNUEFJR05fSU1BR0VfU0laRVswXSwgQXBwQ29uc3RhbnRzLkNBTVBBSUdOX0lNQUdFX1NJWkVbMV0sIG9yaWVudGF0aW9uKVxuXHRcdFxuXHRcdHZhciBwb3N0ZXJUb3AgPSAod2luZG93SCAqIDAuNTEpIC0gKGltYWdlUmVzaXplLmhlaWdodCA+PiAxKVxuXHRcdHBvc3RlclRvcCA9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyAyMjAgOiBwb3N0ZXJUb3Bcblx0XHRcblx0XHR0aGlzLnBvc3RlckltZ0NzcyA9IHtcblx0XHRcdHdpZHRoOiBpbWFnZVJlc2l6ZS53aWR0aCxcblx0XHRcdGhlaWdodDogaW1hZ2VSZXNpemUuaGVpZ2h0LFxuXHRcdFx0dG9wOiBwb3N0ZXJUb3AsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtIChpbWFnZVJlc2l6ZS53aWR0aCA+PiAxKVxuXHRcdH1cblxuXHRcdGlmKHRoaXMucHJldmlvdXNDb250YWluZXIgIT0gdW5kZWZpbmVkKSB0aGlzLnByZXZpb3VzQ29udGFpbmVyLmVsLmNzcygnei1pbmRleCcsIDEpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLmVsLmNzcygnei1pbmRleCcsIDIpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnBvc3RlcldyYXBwZXIuY3NzKHRoaXMucG9zdGVySW1nQ3NzKVxuXG5cdFx0dGhpcy5wb3N0ZXJUb3RhbEhlaWdodCA9ICh0aGlzLnBvc3RlckltZ0Nzcy50b3AgPDwgMSkgKyB0aGlzLnBvc3RlckltZ0Nzcy5oZWlnaHRcblx0fVxuXHRyZXNpemVWaWRlb1dyYXBwZXIoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHZhciBvcmllbnRhdGlvbiA9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyBBcHBDb25zdGFudHMuTEFORFNDQVBFIDogdW5kZWZpbmVkXG5cdFx0dmFyIHNjYWxlID0gKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSA/IDEgOiAwLjZcblxuXHRcdHZhciB2aWRlb1Jlc2l6ZSA9IFV0aWxzLlJlc2l6ZVBvc2l0aW9uUHJvcG9ydGlvbmFsbHkod2luZG93VyAqIHNjYWxlLCB3aW5kb3dIICogc2NhbGUsIEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfVywgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9ILCBvcmllbnRhdGlvbilcblx0XHRcblx0XHR2YXIgdmlkZW9Ub3AgPSAodGhpcy5jb21wYXNzUGFkZGluZyA8PCAxKSArIHdpbmRvd0ggKyB0aGlzLnBvc3RlckltZ0Nzcy50b3Bcblx0XHR2aWRlb1RvcCA9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyB0aGlzLmJ1eUJ0bi55ICsgdGhpcy5idXlCdG4uaGVpZ2h0ICsgMTAwIDogdmlkZW9Ub3BcblxuXHRcdHZhciB2aWRlb0NzcyA9IHtcblx0XHRcdHdpZHRoOiB2aWRlb1Jlc2l6ZS53aWR0aCxcblx0XHRcdGhlaWdodDogdmlkZW9SZXNpemUuaGVpZ2h0LFxuXHRcdFx0dG9wOiB2aWRlb1RvcCxcblx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKHZpZGVvUmVzaXplLndpZHRoID4+IDEpXHRcblx0XHR9XG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLmNzcyh2aWRlb0Nzcylcblx0XHR0aGlzLnZpZGVvVG90YWxIZWlnaHQgPSAodGhpcy5wb3N0ZXJJbWdDc3MudG9wIDw8IDEpICsgdmlkZW9Dc3MuaGVpZ2h0XG5cdH1cblx0dXBkYXRlVG9wQnV0dG9uc1Bvc2l0aW9ucygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciB0b3BQb3MgPSAodGhpcy5wb3N0ZXJJbWdDc3MudG9wICsgdGhpcy5wb3N0ZXJJbWdDc3MuaGVpZ2h0KSArICgod2luZG93SCAtICh0aGlzLnBvc3RlckltZ0Nzcy50b3AgKyB0aGlzLnBvc3RlckltZ0Nzcy5oZWlnaHQpKSA+PiAxKSAtICh0aGlzLmJ1eUJ0bi5oZWlnaHQpIC0gKHRoaXMuYnV5QnRuLmhlaWdodCA+PiAxKVxuXHRcdHRvcFBvcyA9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyB0aGlzLnBvc3RlckltZ0Nzcy50b3AgKyB0aGlzLnBvc3RlckltZ0Nzcy5oZWlnaHQgKyA2MCA6IHRvcFBvc1xuXHRcdHRoaXMuYnV5QnRuLnBvc2l0aW9uKFxuXHRcdFx0KHdpbmRvd1cgPj4gMSkgLSAodGhpcy5idXlCdG4ud2lkdGggPj4gMSksXG5cdFx0XHR0b3BQb3Ncblx0XHQpXG5cdH1cblx0cmVzaXplQ29tcGFzc0NvbnRhaW5lcigpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLnJlc2l6ZSgpXG5cdFx0dGhpcy5jb21wYXNzUGFkZGluZyA9IDE0MFxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLnBvc2l0aW9uKFxuXHRcdFx0KHdpbmRvd1cgPj4gMSkgLSAodGhpcy5jb21wYXNzZXNDb250YWluZXIud2lkdGggPj4gMSksXG5cdFx0XHQod2luZG93SCkgKyB0aGlzLmNvbXBhc3NQYWRkaW5nICsgKHRoaXMuY29tcGFzc1BhZGRpbmcgKiAwLjMpXG5cdFx0KVxuXHR9XG5cdHVwZGF0ZVBhZ2VIZWlnaHQoKSB7XG5cdFx0dGhpcy5wYWdlSGVpZ2h0ID0gdGhpcy52aWRlb1RvdGFsSGVpZ2h0ICsgdGhpcy5wb3N0ZXJUb3RhbEhlaWdodCArICh0aGlzLmNvbXBhc3NQYWRkaW5nIDw8IDEpXG5cdH1cblx0cG9zaXRpb25UaXRsZXNDb250YWluZXIoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHRjbGVhclRpbWVvdXQodGhpcy50aXRsZVRpbWVvdXQpXG5cdFx0dGhpcy50aXRsZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR2YXIgY29tcGFzc1NpemUgPSAod2luZG93SCAqIEFwcENvbnN0YW50cy5DT01QQVNTX1NJWkVfUEVSQ0VOVEFHRSkgPDwgMVxuXHRcdFx0dmFyIHRvcE9mZnNldCA9ICh3aW5kb3dIID4+IDEpICsgKGNvbXBhc3NTaXplID4+IDEpXG5cdFx0XHR2YXIgdG9wUG9zID0gKHRoaXMucG9zdGVySW1nQ3NzLnRvcCA+PiAxKSAtICh0aGlzLnRpdGxlQ29udGFpbmVyLnBhcmVudC5oZWlnaHQoKSA+PiAxKVxuXHRcdFx0dG9wUG9zICs9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyAzMCA6IDBcblx0XHRcdHZhciB0aXRsZXNDb250YWluZXJDc3MgPSB7XG5cdFx0XHRcdHRvcDogdG9wUG9zLFxuXHRcdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtICh0aGlzLnRpdGxlQ29udGFpbmVyLnBhcmVudC53aWR0aCgpID4+IDEpLFxuXHRcdFx0fVxuXHRcdFx0dGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQuY3NzKHRpdGxlc0NvbnRhaW5lckNzcylcblx0XHR9LCAwKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRpZighQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHRoaXMucmVzaXplQ29tcGFzc0NvbnRhaW5lcigpXG5cdFx0dGhpcy5wb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpXG5cdFx0dGhpcy5yZXNpemVNZWRpYVdyYXBwZXJzKClcblx0XHR0aGlzLnVwZGF0ZVRvcEJ1dHRvbnNQb3NpdGlvbnMoKVxuXHRcdHRoaXMucmVzaXplVmlkZW9XcmFwcGVyKClcblx0XHR0aGlzLnVwZGF0ZVBhZ2VIZWlnaHQoKVxuXG5cdFx0dmFyIHByZXZpb3VzWFBvcyA9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyAwIDogKHRoaXMucG9zdGVySW1nQ3NzLmxlZnQgPj4gMSkgLSAodGhpcy5wcmV2aW91c0J0bi53aWR0aCA+PiAxKSAtIDRcblx0XHR2YXIgbmV4dFhQb3MgPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gd2luZG93VyAtIHRoaXMucHJldmlvdXNCdG4ud2lkdGggOiAodGhpcy5wb3N0ZXJJbWdDc3MubGVmdCArIHRoaXMucG9zdGVySW1nQ3NzLndpZHRoKSArICgod2luZG93VyAtICh0aGlzLnBvc3RlckltZ0Nzcy5sZWZ0ICsgdGhpcy5wb3N0ZXJJbWdDc3Mud2lkdGgpKSA+PiAxKSAtICh0aGlzLm5leHRCdG4ud2lkdGggPj4gMSkgKyA0XG5cblx0XHR0aGlzLnByZXZpb3VzQnRuLnBvc2l0aW9uKFxuXHRcdFx0cHJldmlvdXNYUG9zLFxuXHRcdFx0KHdpbmRvd0ggPj4gMSkgLSAodGhpcy5wcmV2aW91c0J0bi5oZWlnaHQgPj4gMSlcblx0XHQpXG5cdFx0dGhpcy5uZXh0QnRuLnBvc2l0aW9uKFxuXHRcdFx0bmV4dFhQb3MsXG5cdFx0XHQod2luZG93SCA+PiAxKSAtICh0aGlzLnByZXZpb3VzQnRuLmhlaWdodCA+PiAxKVxuXHRcdClcblxuXHRcdHZhciBjaGlsZENzcyA9IHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXLFxuXHRcdH1cblx0XHR0aGlzLmNoaWxkLmNzcyhjaGlsZENzcylcblxuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0JChkb2N1bWVudCkub2ZmKCdrZXlkb3duJywgdGhpcy5vbktleVByZXNzZWQpXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMudmlkZW9Bc3NpZ25UaW1lb3V0KVxuXHRcdGlmKCFBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgdGhpcy5jb21wYXNzZXNDb250YWluZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMucHJldmlvdXNCdG4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMubmV4dEJ0bi5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5idXlCdG4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VQbGFuZXRQYWdlIGZyb20gJ0Jhc2VQbGFuZXRQYWdlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBDb21wYXNzZXNDb250YWluZXIgZnJvbSAnQ29tcGFzc2VzQ29udGFpbmVyJ1xuaW1wb3J0IFJlY3RhbmdsZUJ0biBmcm9tICdSZWN0YW5nbGVCdG4nXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBBbGFza2FYUCBmcm9tICdBbGFza2FYUCdcbmltcG9ydCBTa2lYUCBmcm9tICdTa2lYUCdcbmltcG9ydCBNZXRhbFhQIGZyb20gJ01ldGFsWFAnXG5pbXBvcnQgV29vZFhQIGZyb20gJ1dvb2RYUCdcbmltcG9ydCBHZW1TdG9uZVhQIGZyb20gJ0dlbVN0b25lWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBsYW5ldEV4cGVyaWVuY2VQYWdlIGV4dGVuZHMgQmFzZVBsYW5ldFBhZ2Uge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXG5cdFx0dmFyIGluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zTGFuZ1Njb3BlKClcblxuXHRcdHZhciBYcENsYXp6ID0gdGhpcy5nZXRFeHBlcmllbmNlQnlJZCh0aGlzLmlkKVxuXHRcdHRoaXMuZXhwZXJpZW5jZSA9IG5ldyBYcENsYXp6KHRoaXMucHhDb250YWluZXIpXG5cdFx0dGhpcy5leHBlcmllbmNlLmNvbXBvbmVudERpZE1vdW50KClcblx0XHRcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lciA9IG5ldyBDb21wYXNzZXNDb250YWluZXIodGhpcy5weENvbnRhaW5lciwgdGhpcy5jaGlsZClcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5pZCA9IHRoaXMuaWRcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHR0aGlzLmdvQ2FtcGFpZ25CdG4gPSBuZXcgUmVjdGFuZ2xlQnRuKHRoaXMuY2hpbGQuZmluZCgnLmdvLWNhbXBhaWduLWJ0bicpLCBpbmZvcy5jYW1wYWlnbl90aXRsZSlcblx0XHR0aGlzLmdvQ2FtcGFpZ25CdG4uYnRuQ2xpY2tlZCA9IHRoaXMub25Hb0NhbXBhaWduQ2xpY2tlZFxuXHRcdHRoaXMuZ29DYW1wYWlnbkJ0bi5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0b25Hb0NhbXBhaWduQ2xpY2tlZCgpIHtcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZCArICcvMCdcblx0XHRSb3V0ZXIuc2V0SGFzaCh1cmwpXG5cdH1cblx0Z2V0RXhwZXJpZW5jZUJ5SWQoaWQpIHtcblx0XHRzd2l0Y2goaWQpe1xuXHRcdFx0Y2FzZSAnc2tpJzogcmV0dXJuIFNraVhQXG5cdFx0XHRjYXNlICdtZXRhbCc6IHJldHVybiBNZXRhbFhQXG5cdFx0XHRjYXNlICdhbGFza2EnOiByZXR1cm4gQWxhc2thWFBcblx0XHRcdGNhc2UgJ3dvb2QnOiByZXR1cm4gV29vZFhQXG5cdFx0XHRjYXNlICdnZW1zdG9uZSc6IHJldHVybiBHZW1TdG9uZVhQXG5cdFx0fVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcdFxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0XHRzdXBlci53aWxsVHJhbnNpdGlvbk91dCgpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIud2lsbFRyYW5zaXRpb25PdXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR0aGlzLmV4cGVyaWVuY2UudXBkYXRlKClcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGhpcy5leHBlcmllbmNlLnJlc2l6ZSgpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIucmVzaXplKClcblxuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHZhciBjb21wYXNzQ29udGFpbmVyQm90dG9tID0gdGhpcy5jb21wYXNzZXNDb250YWluZXIueSArIHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmhlaWdodFxuXHRcdFx0dGhpcy5nb0NhbXBhaWduQnRuLnBvc2l0aW9uKFxuXHRcdFx0XHQod2luZG93VyA+PiAxKSAtICh0aGlzLmdvQ2FtcGFpZ25CdG4ud2lkdGggPj4gMSksXG5cdFx0XHRcdGNvbXBhc3NDb250YWluZXJCb3R0b20gKyAodGhpcy5nb0NhbXBhaWduQnRuLmhlaWdodCA+PiAxKVxuXHRcdFx0KVxuXHRcdH0sIDApXG5cblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmdvQ2FtcGFpZ25CdG4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGF5QnRuIHtcblx0Y29uc3RydWN0b3IoZWxlbWVudCkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnRsT3ZlciA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLnRsT3V0ID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdC8vIHZhciBrbm90c0VsID0gdGhpcy5lbGVtZW50LmZpbmQoXCIua25vdFwiKVxuXHRcdC8vIHZhciBsaW5lc0VsID0gdGhpcy5lbGVtZW50LmZpbmQoXCIubGluZVwiKVxuXHRcdC8vIHZhciByYWRpdXMgPSAzXG5cdFx0Ly8gdmFyIG1hcmdpbiA9IDMwXG5cdFx0Ly8gdGhpcy5saW5lU2l6ZSA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0Ly8gZm9yICh2YXIgaSA9IDA7IGkgPCBrbm90c0VsLmxlbmd0aDsgaSsrKSB7XG5cdFx0Ly8gXHR2YXIga25vdCA9ICQoa25vdHNFbFtpXSlcblx0XHQvLyBcdGtub3QuYXR0cigncicsIHJhZGl1cylcblx0XHQvLyB9O1xuXHRcdC8vIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXNFbC5sZW5ndGg7IGkrKykge1xuXHRcdC8vIFx0dmFyIGxpbmUgPSAkKGxpbmVzRWxbaV0pXG5cdFx0Ly8gXHRsaW5lLmNzcygnc3Ryb2tlLXdpZHRoJywgdGhpcy5saW5lU2l6ZSlcblx0XHQvLyB9O1xuXG5cdFx0Ly8gdmFyIHN0YXJ0WCA9IG1hcmdpbiA+PiAxXG5cdFx0Ly8gdmFyIHN0YXJ0WSA9IG1hcmdpblxuXHRcdC8vIHZhciBvZmZzZXRVcERvd24gPSAwLjZcblx0XHQvLyAkKGtub3RzRWwuZ2V0KDApKS5hdHRyKHtcblx0XHQvLyBcdCdjeCc6IHN0YXJ0WCArIDAsXG5cdFx0Ly8gXHQnY3knOiBzdGFydFkgKyAwXG5cdFx0Ly8gfSlcblx0XHQvLyAkKGtub3RzRWwuZ2V0KDEpKS5hdHRyKHtcblx0XHQvLyBcdCdjeCc6IHN0YXJ0WCArIG1hcmdpbixcblx0XHQvLyBcdCdjeSc6IHN0YXJ0WSArIDBcblx0XHQvLyB9KVxuXHRcdC8vICQoa25vdHNFbC5nZXQoMikpLmF0dHIoe1xuXHRcdC8vIFx0J2N4Jzogc3RhcnRYICsgKG1hcmdpbioyKSxcblx0XHQvLyBcdCdjeSc6IHN0YXJ0WSArIDBcblx0XHQvLyB9KVxuXHRcdC8vICQoa25vdHNFbC5nZXQoMykpLmF0dHIoe1xuXHRcdC8vIFx0J2N4Jzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0Ly8gXHQnY3knOiBzdGFydFkgLSAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdC8vIH0pXG5cdFx0Ly8gJChrbm90c0VsLmdldCg0KSkuYXR0cih7XG5cdFx0Ly8gXHQnY3gnOiBzdGFydFggKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKSxcblx0XHQvLyBcdCdjeSc6IHN0YXJ0WSArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pXG5cdFx0Ly8gfSlcblx0XHQvLyAkKGxpbmVzRWwuZ2V0KDApKS5hdHRyKHtcblx0XHQvLyBcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0Ly8gXHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdC8vIFx0J3gyJzogc3RhcnRYICsgbWFyZ2luLFxuXHRcdC8vIFx0J3kyJzogc3RhcnRZICsgMFxuXHRcdC8vIH0pXG5cdFx0Ly8gJChsaW5lc0VsLmdldCgxKSkuYXR0cih7XG5cdFx0Ly8gXHQneDEnOiBzdGFydFggKyBtYXJnaW4sXG5cdFx0Ly8gXHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdC8vIFx0J3gyJzogc3RhcnRYICsgKG1hcmdpbioyKSxcblx0XHQvLyBcdCd5Mic6IHN0YXJ0WSArIDBcblx0XHQvLyB9KVxuXHRcdC8vICQobGluZXNFbC5nZXQoMikpLmF0dHIoe1xuXHRcdC8vIFx0J3gxJzogc3RhcnRYICsgMCxcblx0XHQvLyBcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0Ly8gXHQneDInOiBzdGFydFggKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKSxcblx0XHQvLyBcdCd5Mic6IHN0YXJ0WSAtIChtYXJnaW4gKiBvZmZzZXRVcERvd24pXG5cdFx0Ly8gfSlcblx0XHQvLyAkKGxpbmVzRWwuZ2V0KDMpKS5hdHRyKHtcblx0XHQvLyBcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0Ly8gXHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdC8vIFx0J3gyJzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0Ly8gXHQneTInOiBzdGFydFkgKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdC8vIH0pXG5cblx0XHQvLyB2YXIgb2Zmc2V0ID0gMTBcblx0XHQvLyB0aGlzLnRsT3Zlci50byhrbm90c0VsWzBdLCAxLCB7IHg6LW9mZnNldCsocmFkaXVzID4+IDEpLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE92ZXIudG8oa25vdHNFbFsxXSwgMSwgeyB4Oi1vZmZzZXQsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHQvLyB0aGlzLnRsT3Zlci50byhrbm90c0VsWzJdLCAxLCB7IHg6LW9mZnNldCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMF0sIDEsIHsgc2NhbGVYOjEuMSwgeDotb2Zmc2V0LCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE92ZXIudG8obGluZXNFbFsxXSwgMSwgeyBzY2FsZVg6MS4xLCB4Oi1vZmZzZXQsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHQvLyB0aGlzLnRsT3Zlci50byhsaW5lc0VsWzJdLCAxLCB7IHg6LW9mZnNldCwgcm90YXRpb246JzEwZGVnJywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzAlIDEwMCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbM10sIDEsIHsgeDotb2Zmc2V0LCByb3RhdGlvbjonLTEwZGVnJywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzAlIDAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHQvLyB0aGlzLnRsT3Zlci50byhrbm90c0VsWzNdLCAxLCB7IHg6LW9mZnNldC8yLCB5OihvZmZzZXQvMiktcmFkaXVzLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE92ZXIudG8oa25vdHNFbFs0XSwgMSwgeyB4Oi1vZmZzZXQvMiwgeTotKG9mZnNldC8yKStyYWRpdXMsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblxuXHRcdC8vIHRoaXMudGxPdXQudG8oa25vdHNFbFswXSwgMSwgeyB4OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHQvLyB0aGlzLnRsT3V0LnRvKGtub3RzRWxbMV0sIDEsIHsgeDowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE91dC50byhrbm90c0VsWzJdLCAxLCB7IHg6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdXQudG8obGluZXNFbFswXSwgMSwgeyBzY2FsZVg6MSwgeDowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE91dC50byhsaW5lc0VsWzFdLCAxLCB7IHNjYWxlWDoxLCB4OjAsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHQvLyB0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMl0sIDEsIHsgeDowLCByb3RhdGlvbjonMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAxMDAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHQvLyB0aGlzLnRsT3V0LnRvKGxpbmVzRWxbM10sIDEsIHsgeDowLCByb3RhdGlvbjonMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE91dC50byhrbm90c0VsWzNdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE91dC50byhrbm90c0VsWzRdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cblx0XHQvLyB0aGlzLnRsT3Zlci5wYXVzZSgwKVxuXHRcdC8vIHRoaXMudGxPdXQucGF1c2UoMClcblxuXHRcdC8vIHRoaXMucm9sbG92ZXIgPSB0aGlzLnJvbGxvdmVyLmJpbmQodGhpcylcblx0XHQvLyB0aGlzLnJvbGxvdXQgPSB0aGlzLnJvbGxvdXQuYmluZCh0aGlzKVxuXHRcdC8vIHRoaXMuY2xpY2sgPSB0aGlzLmNsaWNrLmJpbmQodGhpcylcblx0XHQvLyB0aGlzLmVsZW1lbnQub24oJ21vdXNlZW50ZXInLCB0aGlzLnJvbGxvdmVyKVxuXHRcdC8vIHRoaXMuZWxlbWVudC5vbignbW91c2VsZWF2ZScsIHRoaXMucm9sbG91dClcblx0XHQvLyBpZih0aGlzLmJ0bkNsaWNrZWQgIT0gdW5kZWZpbmVkKSB0aGlzLmVsZW1lbnQub24oJ2NsaWNrJywgdGhpcy5jbGljaylcblxuXHRcdC8vIHRoaXMud2lkdGggPSBtYXJnaW4gKiAzXG5cdFx0Ly8gdGhpcy5oZWlnaHQgPSBtYXJnaW4gKiAyXG5cdFx0Ly8gdGhpcy5lbGVtZW50LmNzcyh7XG5cdFx0Ly8gXHR3aWR0aDogdGhpcy53aWR0aCxcblx0XHQvLyBcdGhlaWdodDogdGhpcy5oZWlnaHRcblx0XHQvLyB9KVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLmVsZW1lbnQuY3NzKHtcblx0XHRcdGxlZnQ6IHgsXG5cdFx0XHR0b3A6IHlcblx0XHR9KVxuXHR9XG5cdGNsaWNrKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLmJ0bkNsaWNrZWQodGhpcy5kaXJlY3Rpb24pXG5cdH1cblx0cm9sbG91dChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5tb3VzZU91dCgpXHRcblx0fVxuXHRyb2xsb3ZlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5tb3VzZU92ZXIoKVx0XG5cdH1cblx0bW91c2VPdmVyKCkge1xuXHRcdHRoaXMudGxPdXQua2lsbCgpXG5cdFx0dGhpcy50bE92ZXIucGxheSgwKVxuXHR9XG5cdG1vdXNlT3V0KCkge1xuXHRcdHRoaXMudGxPdmVyLmtpbGwoKVxuXHRcdHRoaXMudGxPdXQucGxheSgwKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEFwcFN0b3JlLnJlbGVhc2VUaW1lbGluZSh0aGlzLnRsT3Zlcilcblx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bE91dClcblx0XHR0aGlzLmVsZW1lbnQub2ZmKCdtb3VzZWVudGVyJywgdGhpcy5yb2xsb3Zlcilcblx0XHR0aGlzLmVsZW1lbnQub2ZmKCdtb3VzZWxlYXZlJywgdGhpcy5yb2xsb3V0KVxuXHRcdHRoaXMuZWxlbWVudC5vZmYoJ2NsaWNrJywgdGhpcy5jbGljaylcblx0fVxufVxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVCdG4ge1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50LCB0aXRsZVR4dCwgcmVjdFcpIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50XG5cdFx0dGhpcy50aXRsZVR4dCA9IHRpdGxlVHh0XG5cdFx0dGhpcy5yZWN0VyA9IHJlY3RXXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy50bE92ZXIgPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdFx0dGhpcy50bE91dCA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLndpZHRoID0gMFxuXHRcdHRoaXMuaGVpZ2h0ID0gMFxuXHRcdHZhciBrbm90c0VsID0gdGhpcy5lbGVtZW50LmZpbmQoXCIua25vdFwiKVxuXHRcdHZhciBsaW5lc0VsID0gdGhpcy5lbGVtZW50LmZpbmQoXCIubGluZVwiKVxuXHRcdHZhciB0aXRsZUVsID0gdGhpcy5lbGVtZW50LmZpbmQoXCIuYnRuLXRpdGxlXCIpXG5cdFx0dmFyIHJhZGl1cyA9IDNcblx0XHR2YXIgcGFkZGluZ1ggPSAyNFxuXHRcdHZhciBwYWRkaW5nWSA9IDIwXG5cdFx0dGhpcy5saW5lU2l6ZSA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0aWYodGhpcy50aXRsZVR4dCAhPSB1bmRlZmluZWQpIHRpdGxlRWwudGV4dCh0aGlzLnRpdGxlVHh0KVxuXG5cdFx0c2V0VGltZW91dCgoKT0+e1xuXG5cdFx0XHR2YXIgdGl0bGVXID0gdGhpcy5yZWN0V1xuXHRcdFx0dmFyIHRpdGxlSCA9IEFwcENvbnN0YW50cy5HTE9CQUxfRk9OVF9TSVpFXG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga25vdHNFbC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIga25vdCA9ICQoa25vdHNFbFtpXSlcblx0XHRcdFx0a25vdC5hdHRyKCdyJywgcmFkaXVzKVxuXHRcdFx0fTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXNFbC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgbGluZSA9ICQobGluZXNFbFtpXSlcblx0XHRcdFx0bGluZS5jc3MoJ3N0cm9rZS13aWR0aCcsIHRoaXMubGluZVNpemUpXG5cdFx0XHR9O1xuXG5cdFx0XHR0aGlzLndpZHRoID0gdGl0bGVXICsgKHBhZGRpbmdYIDw8IDEpXG5cdFx0XHR0aGlzLmhlaWdodCA9IHRpdGxlSCArIChwYWRkaW5nWSA8PCAxKVxuXHRcdFx0dGl0bGVFbC5jc3Moe1xuXHRcdFx0XHRsZWZ0OiAodGhpcy53aWR0aCA+PiAxKSAtICh0aXRsZVcgPj4gMSksXG5cdFx0XHRcdHRvcDogKHRoaXMuaGVpZ2h0ID4+IDEpIC0gKHRpdGxlSCA+PiAxKVxuXHRcdFx0fSlcblx0XHRcdHRoaXMuZWxlbWVudC5jc3Moe1xuXHRcdFx0XHR3aWR0aDogdGhpcy53aWR0aCxcblx0XHRcdFx0aGVpZ2h0OiB0aGlzLmhlaWdodFxuXHRcdFx0fSlcblxuXHRcdFx0dmFyIHN0YXJ0WCA9IHJhZGl1cyAqIDNcblx0XHRcdHZhciBzdGFydFkgPSByYWRpdXMgKiAzXG5cdFx0XHR2YXIgb2Zmc2V0VXBEb3duID0gMC42XG5cdFx0XHQkKGtub3RzRWwuZ2V0KDApKS5hdHRyKHtcblx0XHRcdFx0J2N4Jzogc3RhcnRYICsgMCxcblx0XHRcdFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdFx0fSlcblx0XHRcdCQoa25vdHNFbC5nZXQoMSkpLmF0dHIoe1xuXHRcdFx0XHQnY3gnOiB0aGlzLndpZHRoIC0gc3RhcnRYLFxuXHRcdFx0XHQnY3knOiBzdGFydFkgKyAwXG5cdFx0XHR9KVxuXHRcdFx0JChrbm90c0VsLmdldCgyKSkuYXR0cih7XG5cdFx0XHRcdCdjeCc6IHN0YXJ0WCArIDAsXG5cdFx0XHRcdCdjeSc6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZXG5cdFx0XHR9KVxuXHRcdFx0JChrbm90c0VsLmdldCgzKSkuYXR0cih7XG5cdFx0XHRcdCdjeCc6IHRoaXMud2lkdGggLSBzdGFydFgsXG5cdFx0XHRcdCdjeSc6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZXG5cdFx0XHR9KVxuXHRcdFx0JChsaW5lc0VsLmdldCgwKSkuYXR0cih7XG5cdFx0XHRcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHRcdCd4Mic6IHRoaXMud2lkdGggLSBzdGFydFgsXG5cdFx0XHRcdCd5Mic6IHN0YXJ0WSArIDBcblx0XHRcdH0pXG5cdFx0XHQkKGxpbmVzRWwuZ2V0KDEpKS5hdHRyKHtcblx0XHRcdFx0J3gxJzogdGhpcy53aWR0aCAtIHN0YXJ0WCxcblx0XHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdFx0J3gyJzogdGhpcy53aWR0aCAtIHN0YXJ0WCxcblx0XHRcdFx0J3kyJzogdGhpcy5oZWlnaHQgLSBzdGFydFlcblx0XHRcdH0pXG5cdFx0XHQkKGxpbmVzRWwuZ2V0KDIpKS5hdHRyKHtcblx0XHRcdFx0J3gxJzogdGhpcy53aWR0aCAtIHN0YXJ0WCxcblx0XHRcdFx0J3kxJzogdGhpcy5oZWlnaHQgLSBzdGFydFksXG5cdFx0XHRcdCd4Mic6IHN0YXJ0WSArIDAsXG5cdFx0XHRcdCd5Mic6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZXG5cdFx0XHR9KVxuXHRcdFx0JChsaW5lc0VsLmdldCgzKSkuYXR0cih7XG5cdFx0XHRcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHRcdCd4Mic6IHN0YXJ0WCArIDAsXG5cdFx0XHRcdCd5Mic6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZXG5cdFx0XHR9KVxuXG5cdFx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzBdLCAxLCB7IHg6LTMsIHk6LTMsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMV0sIDEsIHsgeDozLCB5Oi0zLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzJdLCAxLCB7IHg6LTMsIHk6MywgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFszXSwgMSwgeyB4OjMsIHk6MywgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFswXSwgMSwgeyBzY2FsZVg6MS4wNSwgeTotMywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFsxXSwgMSwgeyBzY2FsZVk6MS4wNSwgeDozLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3Zlci50byhsaW5lc0VsWzJdLCAxLCB7IHNjYWxlWDoxLjA1LCB5OjMsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbM10sIDEsIHsgc2NhbGVZOjEuMDUsIHg6LTMsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblxuXHRcdFx0dGhpcy50bE91dC50byhrbm90c0VsWzBdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbMV0sIDEsIHsgeDowLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFsyXSwgMSwgeyB4OjAsIHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE91dC50byhrbm90c0VsWzNdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMF0sIDEsIHsgc2NhbGVYOjEsIHk6MCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzFdLCAxLCB7IHNjYWxlWToxLCB4OjAsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8obGluZXNFbFsyXSwgMSwgeyBzY2FsZVg6MSwgeTowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbM10sIDEsIHsgc2NhbGVZOjEsIHg6MCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXG5cdFx0XHR0aGlzLnRsT3Zlci5wYXVzZSgwKVxuXHRcdFx0dGhpcy50bE91dC5wYXVzZSgwKVxuXG5cdFx0XHQvLyB0aGlzLnJvbGxvdmVyID0gdGhpcy5yb2xsb3Zlci5iaW5kKHRoaXMpXG5cdFx0XHQvLyB0aGlzLnJvbGxvdXQgPSB0aGlzLnJvbGxvdXQuYmluZCh0aGlzKVxuXHRcdFx0Ly8gdGhpcy5jbGljayA9IHRoaXMuY2xpY2suYmluZCh0aGlzKVxuXHRcdFx0Ly8gdGhpcy5lbGVtZW50Lm9uKCdtb3VzZWVudGVyJywgdGhpcy5yb2xsb3Zlcilcblx0XHRcdC8vIHRoaXMuZWxlbWVudC5vbignbW91c2VsZWF2ZScsIHRoaXMucm9sbG91dClcblx0XHRcdC8vIHRoaXMuZWxlbWVudC5vbignY2xpY2snLCB0aGlzLmNsaWNrKVxuXHRcdH0sIDApXG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdFV0aWxzLlRyYW5zbGF0ZSh0aGlzLmVsZW1lbnQuZ2V0KDApLCB4LCB5LCAwKVxuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0Y2xpY2soZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdGlmKHRoaXMuYnRuQ2xpY2tlZCAhPSB1bmRlZmluZWQpIHRoaXMuYnRuQ2xpY2tlZCgpXG5cdH1cblx0cm9sbG91dCgpIHtcblx0XHR0aGlzLnRsT3Zlci5raWxsKClcblx0XHR0aGlzLnRsT3V0LnBsYXkoMClcblx0fVxuXHRyb2xsb3ZlcigpIHtcblx0XHR0aGlzLnRsT3V0LmtpbGwoKVxuXHRcdHRoaXMudGxPdmVyLnBsYXkoMClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bE92ZXIpXG5cdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdXQpXG5cdFx0Ly8gdGhpcy5lbGVtZW50Lm9mZignbW91c2VlbnRlcicsIHRoaXMucm9sbG92ZXIpXG5cdFx0Ly8gdGhpcy5lbGVtZW50Lm9mZignbW91c2VsZWF2ZScsIHRoaXMucm9sbG91dClcblx0XHQvLyB0aGlzLmVsZW1lbnQub2ZmKCdjbGljaycsIHRoaXMuY2xpY2spXG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2Nyb2xsQmFyIHtcbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcbiAgICAgICAgdGhpcy5wYWdlSGVpZ2h0ID0gdW5kZWZpbmVkXG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gdW5kZWZpbmVkXG4gICAgICAgIHRoaXMubmV3UG9zWSA9IDBcbiAgICAgICAgdGhpcy5lYXNlID0gMC4xXG4gICAgICAgIHRoaXMubW91c2VJbkRvd24gPSBmYWxzZVxuICAgIH1cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5vbk1vdXNlRG93biA9IHRoaXMub25Nb3VzZURvd24uYmluZCh0aGlzKVxuICAgICAgICB0aGlzLm9uTW91c2VNb3ZlID0gdGhpcy5vbk1vdXNlTW92ZS5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMub25Nb3VzZVVwID0gdGhpcy5vbk1vdXNlVXAuYmluZCh0aGlzKVxuXG4gICAgICAgIHRoaXMuZ3JhYiA9IHRoaXMuZWxlbWVudC5maW5kKFwiLnNjcm9sbC1ncmFiLmJ0blwiKVxuICAgICAgICB0aGlzLmdyYWJFbCA9IHRoaXMuZ3JhYi5nZXQoMClcbiAgICAgICAgdGhpcy5ncmFiLm9uKFwibW91c2Vkb3duXCIsIHRoaXMub25Nb3VzZURvd24pXG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgIHRoaXMuZ3JhYlcgPSB0aGlzLmdyYWIud2lkdGgoKVxuICAgICAgICAgICAgdGhpcy5ncmFiSCA9IHRoaXMuZ3JhYi5oZWlnaHQoKVxuICAgICAgICB9LCAwKVxuICAgIH1cbiAgICBvbk1vdXNlRG93bihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICB0aGlzLm1vdXNlSW5Eb3duID0gdHJ1ZVxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgdGhpcy5vbk1vdXNlTW92ZSlcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2V1cFwiLCB0aGlzLm9uTW91c2VVcClcbiAgICB9XG4gICAgb25Nb3VzZVVwKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIHRoaXMubW91c2VJbkRvd24gPSBmYWxzZVxuICAgICAgICB0aGlzLmtpbGxBbGxFdmVudHMoKVxuICAgIH1cbiAgICBvbk1vdXNlTW92ZShlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICB2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG4gICAgICAgIHZhciBwb3NZID0gKHRoaXMucGFnZUhlaWdodCAvIHdpbmRvd0ggKSAqIGUuY2xpZW50WVxuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldEhhbmRsZXIocG9zWSlcbiAgICB9XG4gICAgc2V0U2Nyb2xsVGFyZ2V0KHZhbCkge1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldCA9IHZhbFxuICAgIH1cbiAgICBraWxsQWxsRXZlbnRzKCkge1xuICAgICAgICAkKHdpbmRvdykub2ZmKFwibW91c2Vtb3ZlXCIsIHRoaXMub25Nb3VzZU1vdmUpXG4gICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZXVwXCIsIHRoaXMub25Nb3VzZVVwKVxuICAgIH1cbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcbiAgICAgICAgdmFyIHBvc1kgPSBNYXRoLnJvdW5kKCh0aGlzLnNjcm9sbFRhcmdldCAvIHRoaXMucGFnZUhlaWdodCkgKiAod2luZG93SCAtIHRoaXMuZ3JhYkgpKVxuICAgICAgICBpZihpc05hTihwb3NZKSkgcmV0dXJuXG4gICAgICAgIHRoaXMubmV3UG9zWSArPSAocG9zWSAtIHRoaXMubmV3UG9zWSkgKiB0aGlzLmVhc2VcbiAgICAgICAgdmFyIHAgPSB0aGlzLm5ld1Bvc1lcbiAgICAgICAgVXRpbHMuVHJhbnNsYXRlKHRoaXMuZ3JhYkVsLCAwLCBwLCAwKVxuICAgIH1cbiAgICByZXNpemUoKSB7XG4gICAgfVxuICAgIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuICAgICAgICB0aGlzLmdyYWIub2ZmKFwibW91c2Vkb3duXCIsIHRoaXMub25Nb3VzZURvd24pXG4gICAgICAgIHRoaXMua2lsbEFsbEV2ZW50cygpXG4gICAgfVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgS25vdCBmcm9tICdLbm90J1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IFZlYzIgZnJvbSAnVmVjMidcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTbWFsbENvbXBhc3Mge1xuXHRjb25zdHJ1Y3RvcihweENvbnRhaW5lciwgdHlwZSkge1xuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHRcdHRoaXMudHlwZSA9IHR5cGUgfHwgQXBwQ29uc3RhbnRzLkxBTkRJTkdcblx0XHR0aGlzLmJvdW5jZSA9IC0xXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoZGF0YSwgbmFtZSwgcGFyZW50RWwsIHBsYW5ldFR4dCkge1xuXHRcdHRoaXMucGFyZW50RWwgPSBwYXJlbnRFbFxuXHRcdHRoaXMuY29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKVxuXG5cdFx0dGhpcy5iZ0NpcmNsZSA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmJnQ2lyY2xlKVxuXG5cdFx0dmFyIGtub3RSYWRpdXMgPSBBcHBDb25zdGFudHMuU01BTExfS05PVF9SQURJVVNcblx0XHR0aGlzLnJhZGl1cyA9IDMwXG5cdFx0dGhpcy5yYWRpdXNMaW1pdCA9ICh0aGlzLnJhZGl1cyowLjgpIC0gKGtub3RSYWRpdXM+PjEpXG5cdFx0dGhpcy53aWR0aCA9IHRoaXMucmFkaXVzXG5cdFx0dGhpcy5oZWlnaHQgPSB0aGlzLnJhZGl1c1xuXG5cdFx0dmFyIGNvbXBhc3NOYW1lID0gcGxhbmV0VHh0LnRvVXBwZXJDYXNlKCkgKyAnICcgKyBuYW1lLnRvVXBwZXJDYXNlKClcblx0XHR0aGlzLmVsZW1lbnQgPSB0aGlzLnBhcmVudEVsLmZpbmQoJy5jb21wYXNzZXMtdGV4dHMtd3JhcHBlcicpXG5cdFx0dmFyIGNvbnRhaW5lckVsID0gJCgnPGRpdiBjbGFzcz1cInRleHRzLWNvbnRhaW5lciBidG5cIj48L2Rpdj4nKVxuXHRcdHRoaXMuZWxlbWVudC5hcHBlbmQoY29udGFpbmVyRWwpXG5cdFx0dmFyIHRpdGxlVG9wID0gJCgnPGRpdiBjbGFzcz1cInRvcC10aXRsZVwiPjwvZGl2JylcblxuXHRcdHRoaXMuY2lyY2xlUmFkID0gOTBcblx0XHR2YXIgY2lyY2xlcGF0aCA9ICdNMCwnK3RoaXMuY2lyY2xlUmFkLzIrJ2EnK3RoaXMuY2lyY2xlUmFkLzIrJywnK3RoaXMuY2lyY2xlUmFkLzIrJyAwIDEsMCAnK3RoaXMuY2lyY2xlUmFkKycsMGEnK3RoaXMuY2lyY2xlUmFkLzIrJywnK3RoaXMuY2lyY2xlUmFkLzIrJyAwIDEsMCAtJyt0aGlzLmNpcmNsZVJhZCsnLDAnXG5cdFx0dmFyIHN2Z1N0ciA9ICc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIj4gPGRlZnM+IDxwYXRoIGlkPVwicGF0aDFcIiBkPVwiJytjaXJjbGVwYXRoKydcIiA+IDwvcGF0aD4gPC9kZWZzPiA8dGV4dCBmaWxsPVwid2hpdGVcIiBpZD1cIm15VGV4dFwiPiA8dGV4dFBhdGggeGxpbms6aHJlZj1cIiNwYXRoMVwiPiA8dHNwYW4gZHg9XCIwcHhcIiBkeT1cIjBweFwiPicgKyBjb21wYXNzTmFtZSArICc8L3RzcGFuPiA8L3RleHRQYXRoPiA8L3RleHQ+PC9zdmc+J1xuXHRcdHZhciB0aXRsZVRvcFN2ZyA9ICQoc3ZnU3RyKVxuXHRcdHRpdGxlVG9wLmFwcGVuZCh0aXRsZVRvcFN2Zylcblx0XHRjb250YWluZXJFbC5hcHBlbmQodGl0bGVUb3ApXG5cdFx0dGl0bGVUb3BTdmcuY3NzKHtcblx0XHRcdHdpZHRoOiB0aGlzLmNpcmNsZVJhZCxcblx0XHRcdGhlaWdodDogdGhpcy5jaXJjbGVSYWRcblx0XHR9KVxuXHRcdHRoaXMudGl0bGVzID0ge1xuXHRcdFx0Y29udGFpbmVyOiBjb250YWluZXJFbCxcblx0XHRcdCR0aXRsZVRvcDogdGl0bGVUb3AsXG5cdFx0XHR0aXRsZVRvcDogdGl0bGVUb3AuZ2V0KDApLFxuXHRcdFx0cm90YXRpb246IDAsXG5cdFx0fVxuXG5cdFx0dGhpcy5vbkNsaWNrZWQgPSB0aGlzLm9uQ2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0dGhpcy50aXRsZXMuY29udGFpbmVyLm9uKCdjbGljaycsIHRoaXMub25DbGlja2VkKVxuXG5cdFx0dGhpcy5rbm90cyA9IFtdXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZCA9IGRhdGFbaV1cblx0XHRcdHZhciBrbm90ID0gbmV3IEtub3QodGhpcy5jb250YWluZXIsIGtub3RSYWRpdXMsIDB4ZmZmZmZmKS5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0XHRrbm90Lm1hc3MgPSBrbm90UmFkaXVzXG5cdFx0XHRrbm90LnZ4ID0gTWF0aC5yYW5kb20oKSAqIDAuOFxuICAgICAgICAgICAga25vdC52eSA9IE1hdGgucmFuZG9tKCkgKiAwLjhcbiAgICAgICAgICAgIGtub3QucG9zVmVjID0gbmV3IFBJWEkuUG9pbnQoMCwgMClcbiAgICAgICAgICAgIGtub3QucG9zRlZlYyA9IG5ldyBQSVhJLlBvaW50KDAsIDApXG4gICAgICAgICAgICBrbm90LnZlbFZlYyA9IG5ldyBQSVhJLlBvaW50KDAsIDApXG4gICAgICAgICAgICBrbm90LnZlbEZWZWMgPSBuZXcgUElYSS5Qb2ludCgwLCAwKVxuXHRcdFx0a25vdC5wb3NpdGlvbihVdGlscy5SYW5kKC10aGlzLnJhZGl1c0xpbWl0LCB0aGlzLnJhZGl1c0xpbWl0KSwgVXRpbHMuUmFuZCgtdGhpcy5yYWRpdXNMaW1pdCwgdGhpcy5yYWRpdXNMaW1pdCkpXG5cdFx0XHR0aGlzLmtub3RzW2ldID0ga25vdFxuXHRcdH1cblxuXHRcdHZhciBsaW5lVyA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0Ly8gZHJhdyBhIHJlY3RhbmdsZVxuXHRcdHRoaXMuYmdDaXJjbGUuY2xlYXIoKVxuXHRcdHRoaXMuYmdDaXJjbGUubGluZVN0eWxlKGxpbmVXLCAweGZmZmZmZiwgMSlcblx0XHR0aGlzLmJnQ2lyY2xlLmJlZ2luRmlsbCgweGZmZmZmZiwgMClcblx0XHR0aGlzLmJnQ2lyY2xlLmRyYXdDaXJjbGUoMCwgMCwgdGhpcy5yYWRpdXMpXG5cdH1cblx0b25DbGlja2VkKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZCArIFwiLzBcIlxuXHRcdFJvdXRlci5zZXRIYXNoKHVybClcblx0fVxuXHRjaGVja1dhbGxzKGtub3QpIHtcblx0XHRpZihrbm90LnggKyBrbm90LnJhZGl1cyA+IHRoaXMucmFkaXVzTGltaXQpIHtcblx0ICAgICAgICBrbm90LnggPSB0aGlzLnJhZGl1c0xpbWl0IC0ga25vdC5yYWRpdXM7XG5cdCAgICAgICAga25vdC52eCAqPSB0aGlzLmJvdW5jZTtcblx0ICAgIH1lbHNlIGlmKGtub3QueCAtIGtub3QucmFkaXVzIDwgLXRoaXMucmFkaXVzTGltaXQta25vdC5yYWRpdXMpIHtcblx0ICAgICAgICBrbm90LnggPSAtdGhpcy5yYWRpdXNMaW1pdCArIGtub3QucmFkaXVzLWtub3QucmFkaXVzO1xuXHQgICAgICAgIGtub3QudnggKj0gdGhpcy5ib3VuY2U7XG5cdCAgICB9XG5cdCAgICBpZihrbm90LnkgKyBrbm90LnJhZGl1cyA+IHRoaXMucmFkaXVzTGltaXQpIHtcblx0ICAgICAgICBrbm90LnkgPSB0aGlzLnJhZGl1c0xpbWl0IC0ga25vdC5yYWRpdXM7XG5cdCAgICAgICAga25vdC52eSAqPSB0aGlzLmJvdW5jZTtcblx0ICAgIH1lbHNlIGlmKGtub3QueSAtIGtub3QucmFkaXVzIDwgLXRoaXMucmFkaXVzTGltaXQpIHtcblx0ICAgICAgICBrbm90LnkgPSAtdGhpcy5yYWRpdXNMaW1pdCArIGtub3QucmFkaXVzO1xuXHQgICAgICAgIGtub3QudnkgKj0gdGhpcy5ib3VuY2U7XG5cdCAgICB9XG5cdH1cblx0Y2hlY2tDb2xsaXNpb24oa25vdEEsIGtub3RCKSB7XG5cdFx0dmFyIGR4ID0ga25vdEIueCAtIGtub3RBLng7XG5cdCAgICB2YXIgZHkgPSBrbm90Qi55IC0ga25vdEEueTtcblx0ICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KGR4KmR4ICsgZHkqZHkpO1xuXHQgICAgaWYoZGlzdCA8IGtub3RBLnJhZGl1cyArIGtub3RCLnJhZGl1cykge1xuXHQgICAgICAgIHZhciBhbmdsZSA9IE1hdGguYXRhbjIoZHksIGR4KVxuXHQgICAgICAgIHZhciBzaW4gPSBNYXRoLnNpbihhbmdsZSlcblx0ICAgICAgICB2YXIgY29zID0gTWF0aC5jb3MoYW5nbGUpXG5cdCAgICAgICAga25vdEEucG9zVmVjLnggPSAwXG5cdCAgICAgICAga25vdEEucG9zVmVjLnkgPSAwXG5cdCAgICAgICAgdGhpcy5yb3RhdGUoa25vdEIucG9zVmVjLCBkeCwgZHksIHNpbiwgY29zLCB0cnVlKVxuXHQgICAgICAgIHRoaXMucm90YXRlKGtub3RBLnZlbFZlYywga25vdEEudngsIGtub3RBLnZ5LCBzaW4sIGNvcywgdHJ1ZSlcblx0ICAgICAgICB0aGlzLnJvdGF0ZShrbm90Qi52ZWxWZWMsIGtub3RCLnZ4LCBrbm90Qi52eSwgc2luLCBjb3MsIHRydWUpXG5cblx0ICAgICAgICAvLyBjb2xsaXNpb24gcmVhY3Rpb25cblx0XHRcdHZhciB2eFRvdGFsID0ga25vdEEudmVsVmVjLnggLSBrbm90Qi52ZWxWZWMueFxuXHRcdFx0a25vdEEudmVsVmVjLnggPSAoKGtub3RBLm1hc3MgLSBrbm90Qi5tYXNzKSAqIGtub3RBLnZlbFZlYy54ICsgMiAqIGtub3RCLm1hc3MgKiBrbm90Qi52ZWxWZWMueCkgLyAoa25vdEEubWFzcyArIGtub3RCLm1hc3MpXG5cdFx0XHRrbm90Qi52ZWxWZWMueCA9IHZ4VG90YWwgKyBrbm90QS52ZWxWZWMueFxuXG5cdFx0XHQvLyB1cGRhdGUgcG9zaXRpb25cblx0XHRcdGtub3RBLnBvc1ZlYy54ICs9IGtub3RBLnZlbFZlYy54O1xuXHRcdFx0a25vdEIucG9zVmVjLnggKz0ga25vdEIudmVsVmVjLng7XG5cblx0XHRcdC8vIHJvdGF0ZSBwb3NpdGlvbnMgYmFja1xuXHRcdFx0dGhpcy5yb3RhdGUoa25vdEEucG9zRlZlYywga25vdEEucG9zVmVjLngsIGtub3RBLnBvc1ZlYy55LCBzaW4sIGNvcywgZmFsc2UpXG5cdFx0XHR0aGlzLnJvdGF0ZShrbm90Qi5wb3NGVmVjLCBrbm90Qi5wb3NWZWMueCwga25vdEIucG9zVmVjLnksIHNpbiwgY29zLCBmYWxzZSlcblxuXHRcdFx0Ly8gYWRqdXN0IHBvc2l0aW9ucyB0byBhY3R1YWwgc2NyZWVuIHBvc2l0aW9uc1xuXHRcdFx0a25vdEIueCA9IGtub3RBLnggKyBrbm90Qi5wb3NGVmVjLng7XG5cdFx0XHRrbm90Qi55ID0ga25vdEEueSArIGtub3RCLnBvc0ZWZWMueTtcblx0XHRcdGtub3RBLnggPSBrbm90QS54ICsga25vdEEucG9zRlZlYy54O1xuXHRcdFx0a25vdEEueSA9IGtub3RBLnkgKyBrbm90QS5wb3NGVmVjLnk7XG5cblx0XHRcdC8vIHJvdGF0ZSB2ZWxvY2l0aWVzIGJhY2tcblx0XHRcdHRoaXMucm90YXRlKGtub3RBLnZlbEZWZWMsIGtub3RBLnZlbFZlYy54LCBrbm90QS52ZWxWZWMueSwgc2luLCBjb3MsIGZhbHNlKVxuXHRcdFx0dGhpcy5yb3RhdGUoa25vdEIudmVsRlZlYywga25vdEIudmVsVmVjLngsIGtub3RCLnZlbFZlYy55LCBzaW4sIGNvcywgZmFsc2UpXG5cblx0XHRcdGtub3RBLnZ4ID0ga25vdEEudmVsRlZlYy54O1xuXHQgICAgICAgIGtub3RBLnZ5ID0ga25vdEEudmVsRlZlYy55O1xuXHQgICAgICAgIGtub3RCLnZ4ID0ga25vdEIudmVsRlZlYy54O1xuXHQgICAgICAgIGtub3RCLnZ5ID0ga25vdEIudmVsRlZlYy55O1xuXHQgICAgfVxuXHR9XG5cdHJvdGF0ZShwb2ludCwgeCwgeSwgc2luLCBjb3MsIHJldmVyc2UpIHtcblx0XHRpZihyZXZlcnNlKSB7XG5cdFx0XHRwb2ludC54ID0geCAqIGNvcyArIHkgKiBzaW47XG5cdFx0XHRwb2ludC55ID0geSAqIGNvcyAtIHggKiBzaW47XG5cdFx0fWVsc2V7XG5cdFx0XHRwb2ludC54ID0geCAqIGNvcyAtIHkgKiBzaW47XG5cdFx0XHRwb2ludC55ID0geSAqIGNvcyArIHggKiBzaW47XG5cdFx0fVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdC8vIHRoaXMudGl0bGVzLmNvbnRhaW5lci5hZGRDbGFzcygnYWN0aXZlJylcblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0XHQvLyB0aGlzLnRpdGxlcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXHRcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dmFyIGtub3RzID0gdGhpcy5rbm90c1xuXHRcdHZhciBrbm90c051bSA9IGtub3RzLmxlbmd0aFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwga25vdHNOdW07IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSBrbm90c1tpXVxuXHRcdFx0a25vdC5wb3NpdGlvbihrbm90LnggKyBrbm90LnZ4LCBrbm90LnkgKyBrbm90LnZ5KVxuXHRcdFx0dGhpcy5jaGVja1dhbGxzKGtub3QpXG5cdFx0fVxuXHRcdGZvciAoaSA9IDA7IGkgPCBrbm90c051bSAtIDE7IGkrKykge1xuXHRcdFx0dmFyIGtub3RBID0ga25vdHNbaV1cblx0XHRcdGZvciAodmFyIGogPSBpICsgMTsgaiA8IGtub3RzTnVtOyBqKyspIHtcblx0XHRcdFx0dmFyIGtub3RCID0ga25vdHNbal1cblx0XHRcdFx0dGhpcy5jaGVja0NvbGxpc2lvbihrbm90QSwga25vdEIpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMudGl0bGVzLnJvdGF0aW9uICs9IDAuMlxuXHRcdHRoaXMucm90YXRlRWwodGhpcy50aXRsZXMudGl0bGVUb3AsIHRoaXMudGl0bGVzLnJvdGF0aW9uKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdH1cblx0cm90YXRlRWwoZGl2LCBkZWcpIHtcblx0XHRVdGlscy5TdHlsZShkaXYsICdyb3RhdGUoJytkZWcrJ2RlZyknKVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLmNvbnRhaW5lci54ID0geFxuXHRcdHRoaXMuY29udGFpbmVyLnkgPSB5XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRvcGFjaXR5KHZhbCkge1xuXHRcdHRoaXMuY29udGFpbmVyLmFscGhhID0gdmFsXG5cdFx0dGhpcy50aXRsZXMuJHRpdGxlVG9wLmNzcygnb3BhY2l0eScsIHZhbClcblx0fVxuXHRwb3NpdGlvbkVsZW1lbnQoeCwgeSkge1xuXHRcdHRoaXMudGl0bGVzLmNvbnRhaW5lci5jc3Moe1xuXHRcdFx0bGVmdDogeCAtICh0aGlzLmNpcmNsZVJhZD4+MSksXG5cdFx0XHR0b3A6IHkgLSAodGhpcy5jaXJjbGVSYWQ+PjEpLFxuXHRcdFx0d2lkdGg6IHRoaXMuY2lyY2xlUmFkLFxuXHRcdFx0aGVpZ2h0OiB0aGlzLmNpcmNsZVJhZCxcblx0XHR9KVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5rbm90cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5rbm90c1tpXS5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0fVxuXHRcdHRoaXMudGl0bGVzLmNvbnRhaW5lci5vZmYoJ2NsaWNrJywgdGhpcy5vbkNsaWNrZWQpXG5cdFx0dGhpcy5rbm90cy5sZW5ndGggPSAwXG5cdFx0dGhpcy5iZ0NpcmNsZS5jbGVhcigpXG5cdFx0dGhpcy5iZ0NpcmNsZSA9IG51bGxcblx0XHR0aGlzLmNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLmNvbnRhaW5lcilcblx0fVxufVxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNwcmluZ0dhcmRlbiB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuY29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0XHR0aGlzLmFyZWFQb2x5Z29uID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIuYWRkQ2hpbGQodGhpcy5hcmVhUG9seWdvbilcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyKVxuXHRcdFxuXHRcdHRoaXMubGluZVcgPSBBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKVxuXHRcdHRoaXMucGF1c2VkID0gdHJ1ZVxuXHRcdHRoaXMub3BlbmVkID0gZmFsc2VcblxuXHRcdHRoaXMua25vdHMgPSBbXVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgQXBwQ29uc3RhbnRzLlRPVEFMX0tOT1RfTlVNOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0gbmV3IEtub3QodGhpcy5jb250YWluZXIpLmNvbXBvbmVudERpZE1vdW50KClcblx0XHRcdHRoaXMua25vdHNbaV0gPSBrbm90XG5cdFx0fVxuXHRcdHRoaXMuY29uZmlnID0ge1xuXHRcdFx0c3ByaW5nOiAwLFxuXHRcdFx0ZnJpY3Rpb246IDAsXG5cdFx0XHRzcHJpbmdMZW5ndGg6IDBcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoZGF0YSwgd2l0aEZpbGwsIGlzSW50ZXJhY3RpdmUsIHR5cGUpIHtcblx0XHR0aGlzLnBhcmFtcyA9IGRhdGFcblx0XHR0eXBlID0gdHlwZSB8fCBBcHBDb25zdGFudHMuTEFORElOR1xuXHRcdHRoaXMuY29sb3IgPSAodHlwZSA9PSBBcHBDb25zdGFudHMuTEFORElORykgfHwgdGhpcy5wYXJhbXMuaGlnaGxpZ2h0ID09IGZhbHNlID8gMHhmZmZmZmYgOiB0aGlzLnBhcmFtcy5jb2xvclxuXHRcdHRoaXMud2l0aEZpbGwgPSB3aXRoRmlsbCB8fCBmYWxzZVxuXHRcdGlmKHRoaXMucGFyYW1zLmhpZ2hsaWdodCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuY29sb3IgPSB0aGlzLnBhcmFtcy5oaWdobGlnaHQgPT0gZmFsc2UgPyAweGZmZmZmZiA6IHRoaXMuY29sb3Jcblx0XHRcdHRoaXMud2l0aEZpbGwgPSB0aGlzLnBhcmFtcy5oaWdobGlnaHRcblx0XHR9XG5cdFx0dGhpcy5pc0ludGVyYWN0aXZlID0gaXNJbnRlcmFjdGl2ZSB8fCBmYWxzZVxuXHRcdHZhciBrbm90c0RhdGEgPSB0aGlzLnBhcmFtcy5rbm90c1xuXG5cdFx0dGhpcy5vbkNsaWNrZWQgPSB0aGlzLm9uQ2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0aWYodGhpcy5pc0ludGVyYWN0aXZlKSB7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmJ1dHRvbk1vZGUgPSB0cnVlXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmludGVyYWN0aXZlID0gdHJ1ZVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5vbignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblx0XHR9ZWxzZXtcblx0XHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIuYnV0dG9uTW9kZSA9IGZhbHNlXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmludGVyYWN0aXZlID0gZmFsc2Vcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMua25vdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBuZXdLbm90U2NhbGUgPSBrbm90c0RhdGFbaV1cblx0XHRcdHZhciBrbm90ID0gdGhpcy5rbm90c1tpXVxuXHRcdFx0a25vdC5jaGFuZ2VTaXplKHRoaXMua25vdFJhZGl1cylcblx0XHRcdGtub3QudG9YID0gbmV3S25vdFNjYWxlLnggKiAodGhpcy5yYWRpdXMpXG5cdFx0XHRrbm90LnRvWSA9IG5ld0tub3RTY2FsZS55ICogKHRoaXMucmFkaXVzKVxuXHRcdH1cblx0XHR0aGlzLmNvbnRhaW5lci5yb3RhdGlvbiA9IFV0aWxzLlJhbmQoLTQsIDQpXG5cdFx0dGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoID0gMjAwXG5cdFx0dGhpcy5hc3NpZ25PcGVuZWRDb25maWcoKVxuXHR9XG5cdG9uQ2xpY2tlZCgpIHtcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZCArICcvJyArIHRoaXMucGFyYW1zLmlkXG5cdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR0aGlzLmFyZWFQb2x5Z29uLmNsZWFyKClcblx0XHRpZih0aGlzLndpdGhGaWxsKSB7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uLmJlZ2luRmlsbCh0aGlzLmNvbG9yKVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbi5saW5lU3R5bGUoMClcblx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubW92ZVRvKHRoaXMua25vdHNbMF0ueCwgdGhpcy5rbm90c1swXS55KVxuXHRcdH1lbHNle1xuXHRcdFx0dGhpcy5hcmVhUG9seWdvbi5saW5lU3R5bGUodGhpcy5saW5lVywgdGhpcy5jb2xvciwgMC44KVxuXHRcdH1cblx0XHR2YXIgbGVuID0gdGhpcy5rbm90cy5sZW5ndGhcblx0XHR2YXIgc3ByaW5nID0gdGhpcy5jb25maWcuc3ByaW5nXG5cdFx0dmFyIGZyaWN0aW9uID0gdGhpcy5jb25maWcuZnJpY3Rpb25cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IHRoaXMua25vdHNbaV1cblx0XHRcdHZhciBwcmV2aW91c0tub3QgPSB0aGlzLmtub3RzW2ktMV1cblx0XHRcdHByZXZpb3VzS25vdCA9IChwcmV2aW91c0tub3QgPT0gdW5kZWZpbmVkKSA/IHRoaXMua25vdHNbbGVuLTFdIDogcHJldmlvdXNLbm90XG5cblx0XHRcdFV0aWxzLlNwcmluZ1RvKGtub3QsIGtub3QudG9YLCBrbm90LnRvWSwgaSwgc3ByaW5nLCBmcmljdGlvbiwgdGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoKVxuXHRcdFx0a25vdC5wb3NpdGlvbihrbm90LnggKyBrbm90LnZ4LCBrbm90LnkgKyBrbm90LnZ5KVxuXG5cdFx0XHRpZih0aGlzLndpdGhGaWxsKSB7XG5cdFx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubGluZVRvKGtub3QueCwga25vdC55KVxuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubW92ZVRvKHByZXZpb3VzS25vdC54LCBwcmV2aW91c0tub3QueSlcblx0XHRcdFx0dGhpcy5hcmVhUG9seWdvbi5saW5lVG8oa25vdC54LCBrbm90LnkpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKHRoaXMud2l0aEZpbGwpIHtcblx0XHRcdHRoaXMuYXJlYVBvbHlnb24uZW5kRmlsbCgpXG5cdFx0fVxuXHRcdHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCAtPSAodGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoKSAqIDAuMVxuXHRcdHRoaXMuY29udGFpbmVyLnJvdGF0aW9uIC09ICh0aGlzLmNvbnRhaW5lci5yb3RhdGlvbikgKiAwLjFcblx0fVxuXHRhc3NpZ25PcGVuZWRDb25maWcoKSB7XG5cdFx0dGhpcy5jb25maWcuc3ByaW5nID0gMC4wM1xuXHRcdHRoaXMuY29uZmlnLmZyaWN0aW9uID0gMC45MlxuXHR9XG5cdGNsZWFyKCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5rbm90cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSB0aGlzLmtub3RzW2ldXG5cdFx0XHRrbm90LmNsZWFyKClcblx0XHR9XG5cdFx0dGhpcy53aXRoRmlsbCA9IGZhbHNlXG5cdFx0dGhpcy5hcmVhUG9seWdvbi5jbGVhcigpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0aWYodGhpcy5pc0ludGVyYWN0aXZlKSB7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmJ1dHRvbk1vZGUgPSBmYWxzZVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5pbnRlcmFjdGl2ZSA9IGZhbHNlXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLm9mZignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblx0XHR9XG5cdH1cblx0cmVzaXplKHJhZGl1cykge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dGhpcy5yYWRpdXMgPSByYWRpdXNcblx0XHR0aGlzLmNvbnRhaW5lci54ID0gMFxuXHRcdHRoaXMuY29udGFpbmVyLnkgPSAwXG5cdH1cbn1cbiIsImltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBSZWN0YW5nbGVCdG4gZnJvbSAnUmVjdGFuZ2xlQnRuJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUaXRsZVN3aXRjaGVyIHtcblx0Y29uc3RydWN0b3IoZWxlbWVudCwgcmVjdGFuZ2xlRWwsIGJ1eVR4dCkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcblx0XHR0aGlzLnJlY3RFbCA9IHJlY3RhbmdsZUVsXG5cdFx0dGhpcy5idXlUeHQgPSBidXlUeHRcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnByb2R1Y3RUaXRsZVdyYXBwZXIgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5wcm9kdWN0LXRpdGxlLXdyYXBwZXJcIilcblx0XHR2YXIgY29udGFpbmVyQSA9IHRoaXMuZWxlbWVudC5maW5kKCcudGl0bGUtYScpXG5cdFx0dmFyIGNvbnRhaW5lckIgPSB0aGlzLmVsZW1lbnQuZmluZCgnLnRpdGxlLWInKVxuXHRcdHRoaXMuY29udGFpbmVycyA9IHtcblx0XHRcdCd0aXRsZS1hJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQVxuXHRcdFx0fSxcblx0XHRcdCd0aXRsZS1iJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQlxuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLndpZHRoID0gMTAwXG5cdFx0dGhpcy5oZWlnaHQgPSBBcHBDb25zdGFudHMuR0xPQkFMX0ZPTlRfU0laRVxuXG5cdFx0dmFyIHJlY3RXaWR0aCA9IHRoaXMuYnV5VHh0Lmxlbmd0aCAqIDEwXG5cdFx0dGhpcy5yZWN0YW5nbGVCb3JkZXIgPSBuZXcgUmVjdGFuZ2xlQnRuKHRoaXMucmVjdEVsLCBudWxsLCAxMTAgKyByZWN0V2lkdGgpXG5cdFx0dGhpcy5yZWN0YW5nbGVCb3JkZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdHRoaXMuYWxsUmVjdFN2Z0tub3RzID0gdGhpcy5yZWN0RWwuZmluZCgnc3ZnIC5rbm90Jylcblx0XHR0aGlzLmFsbFJlY3RTdmdMaW5lcyA9IHRoaXMucmVjdEVsLmZpbmQoJ3N2ZyAubGluZScpXG5cblx0XHRpZih0aGlzLm9uQ2xpY2sgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLm9uQ2xpY2tlZCA9IHRoaXMub25DbGlja2VkLmJpbmQodGhpcylcblx0XHRcdHRoaXMuZWxlbWVudC5vbignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblx0XHR9XG5cdFx0dGhpcy5vbk92ZXIgPSB0aGlzLm9uT3Zlci5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vbk91dCA9IHRoaXMub25PdXQuYmluZCh0aGlzKVxuXHRcdHRoaXMuZWxlbWVudC5vbignbW91c2VlbnRlcicsIHRoaXMub25PdmVyKVxuXHRcdHRoaXMuZWxlbWVudC5vbignbW91c2VsZWF2ZScsIHRoaXMub25PdXQpXG5cdH1cblx0b25PdmVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLnJlY3RhbmdsZUJvcmRlci5yb2xsb3ZlcigpXG5cdH1cblx0b25PdXQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMucmVjdGFuZ2xlQm9yZGVyLnJvbGxvdXQoKVxuXHR9XG5cdG9uQ2xpY2tlZChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5vbkNsaWNrKClcblx0fVxuXHR1cGRhdGVDb2xvcihjb2xvcikge1xuXHRcdHZhciBjID0gY29sb3Jcblx0XHRjID0gYy5yZXBsYWNlKFwiMHhcIiwgXCIjXCIpXG5cdFx0dGhpcy5hbGxSZWN0U3ZnS25vdHMuY3NzKCdmaWxsJywgYylcblx0XHR0aGlzLmFsbFJlY3RTdmdMaW5lcy5jc3MoJ3N0cm9rZScsIGMpXG5cdH1cblx0dXBkYXRlKG5hbWUpIHtcblx0XHR0aGlzLmN1cnJlbnRUaXRsZUNsYXNzID0gKHRoaXMuY3VycmVudFRpdGxlQ2xhc3MgPT09ICd0aXRsZS1hJykgPyAndGl0bGUtYicgOiAndGl0bGUtYSdcblx0XHR0aGlzLnByZXZpb3VzVGl0bGUgPSB0aGlzLmN1cnJlbnRUaXRsZVxuXHRcdHRoaXMuY3VycmVudFRpdGxlID0gdGhpcy5jb250YWluZXJzW3RoaXMuY3VycmVudFRpdGxlQ2xhc3NdXG5cdFx0dGhpcy5jdXJyZW50VGl0bGUuZWwudGV4dChuYW1lKVxuXG5cdFx0dGhpcy51cGRhdGVDb21wb25lbnRTaXplKClcblxuXHRcdHRoaXMuY3VycmVudFRpdGxlLmVsLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1pbicpLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1vdXQnKS5yZW1vdmVDbGFzcygnd2lsbC10cmFuc2l0aW9uLW91dCcpLmFkZENsYXNzKCd3aWxsLXRyYW5zaXRpb24taW4nKVxuXHRcdGlmKHRoaXMucHJldmlvdXNUaXRsZSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMucHJldmlvdXNUaXRsZS5lbC5yZW1vdmVDbGFzcygnZGlkLXRyYW5zaXRpb24tb3V0JykucmVtb3ZlQ2xhc3MoJ2RpZC10cmFuc2l0aW9uLWluJykucmVtb3ZlQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1pbicpLmFkZENsYXNzKCd3aWxsLXRyYW5zaXRpb24tb3V0Jylcblx0XHR9XG5cdH1cblx0c2hvdygpIHtcblx0XHR0aGlzLmVsZW1lbnQuY3NzKCd3aWR0aCcsIHRoaXMuY3VycmVudFRpdGxlLndpZHRoKVxuXHRcdHRoaXMuY3VycmVudFRpdGxlLmVsLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1vdXQnKS5yZW1vdmVDbGFzcygnd2lsbC10cmFuc2l0aW9uLWluJykucmVtb3ZlQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1vdXQnKS5hZGRDbGFzcygnZGlkLXRyYW5zaXRpb24taW4nKVxuXHRcdGlmKHRoaXMucHJldmlvdXNUaXRsZSAhPSB1bmRlZmluZWQpe1xuXHRcdFx0dGhpcy5wcmV2aW91c1RpdGxlLmVsLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1pbicpLnJlbW92ZUNsYXNzKCd3aWxsLXRyYW5zaXRpb24taW4nKS5yZW1vdmVDbGFzcygnd2lsbC10cmFuc2l0aW9uLW91dCcpLmFkZENsYXNzKCdkaWQtdHJhbnNpdGlvbi1vdXQnKVxuXHRcdH1cblx0fVxuXHR1cGRhdGVDb21wb25lbnRTaXplKCkge1xuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHZhciBjdXJyZW50VGl0bGVXID0gdGhpcy5jdXJyZW50VGl0bGUuZWwud2lkdGgoKVxuXHRcdFx0dGhpcy5jdXJyZW50VGl0bGUud2lkdGggPSBjdXJyZW50VGl0bGVXXG5cdFx0XHR0aGlzLndpZHRoID0gdGhpcy5yZWN0YW5nbGVCb3JkZXIud2lkdGhcblx0XHR9LCAwKVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHRVdGlscy5UcmFuc2xhdGUodGhpcy5wcm9kdWN0VGl0bGVXcmFwcGVyLmdldCgwKSwgKHRoaXMud2lkdGggPj4gMSkgLSAodGhpcy5jdXJyZW50VGl0bGUud2lkdGggPj4gMSksIDAsIDApXG5cdFx0VXRpbHMuVHJhbnNsYXRlKHRoaXMuZWxlbWVudC5nZXQoMCksIHgsIHksIDApXG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLm9uQ2xpY2sgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLmVsZW1lbnQub2ZmKCdjbGljaycsIHRoaXMub25DbGlja2VkKVxuXHRcdH1cblx0XHR0aGlzLmVsZW1lbnQub2ZmKCdtb3VzZWVudGVyJywgdGhpcy5vbk92ZXIpXG5cdFx0dGhpcy5lbGVtZW50Lm9mZignbW91c2VsZWF2ZScsIHRoaXMub25PdXQpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGFza2FYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKHBhcmVudENvbnRhaW5lcikge1xuXHRcdHN1cGVyKHBhcmVudENvbnRhaW5lcilcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5wYXJlbnRDb250YWluZXIgPSBwYXJlbnRDb250YWluZXJcblx0XHR0aGlzLnBhcmVudENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnB4Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHR9XG5cdHVwZGF0ZSgpIHtcblx0fVxuXHRyZXNpemUoKSB7XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5wYXJlbnRDb250YWluZXIucmVtb3ZlQ2hpbGQodGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLnB4Q29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuY29uc3QgZ2xzbGlmeSA9IHJlcXVpcmUoJ2dsc2xpZnknKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHZW1TdG9uZVhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0c3VwZXIocGFyZW50Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdC8vIHZhciBleHBsb3Npb25GcmFnID0gZ2xzbGlmeSgnLi4vc2hhZGVycy9nZW1zdG9uZS9kaWZmdXNpb24tbWl4LWZyYWcuZ2xzbCcpXG5cblx0XHQvLyB2YXIgaW1nVXJsID0gQXBwU3RvcmUuUHJlbG9hZGVyLmdldEltYWdlVVJMKCdnZW1zdG9uZS1leHBlcmllbmNlLW5vaXNlLWNvbG9yJylcblx0XHQvLyBjb25zb2xlLmxvZyhpbWdVcmwpXG5cdFx0Ly8gdmFyIHRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGltZ1VybClcblx0XHQvLyB0aGlzLnNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlKVxuXG5cdFx0Ly8gdGhpcy5zcHJpdGUuc2hhZGVyID0gbmV3IFBJWEkuQWJzdHJhY3RGaWx0ZXIobnVsbCwgZXhwbG9zaW9uRnJhZywgdGhpcy51bmlmb3JtcyA9IHtcblx0XHQvLyBcdHJlc29sdXRpb246IHsgdHlwZTogJzJmJywgdmFsdWU6IHsgeDogMCwgeTogMCB9IH0sXG5cdFx0Ly8gXHR1Tm9pc2U6IHt0eXBlOiAnc2FtcGxlcjJEJywgdmFsdWU6IHRleHR1cmV9LFxuXHRcdC8vIFx0dGltZToge3R5cGU6ICcxZicsIHZhbHVlOiAwfSxcblx0IC8vICAgIH0pXG5cblx0IC8vICAgIHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5zcHJpdGUpXG5cblx0XHQvLyBjb25zb2xlLmxvZyhleHBsb3Npb25GcmFnKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHRcdHRoaXMudW5pZm9ybXMudGltZS52YWx1ZSArPSAwLjFcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnNwcml0ZS53aWR0aCA9IHdpbmRvd1dcblx0XHR0aGlzLnNwcml0ZS5oZWlnaHQgPSB3aW5kb3dIXG5cdFx0dGhpcy51bmlmb3Jtcy5yZXNvbHV0aW9uLnZhbHVlLnggPSB3aW5kb3dXXG5cdFx0dGhpcy51bmlmb3Jtcy5yZXNvbHV0aW9uLnZhbHVlLnkgPSB3aW5kb3dIXG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNZXRhbFhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0c3VwZXIocGFyZW50Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuIiwiaW1wb3J0IEJhc2VYUCBmcm9tICdCYXNlWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNraVhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0c3VwZXIocGFyZW50Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuIiwiaW1wb3J0IEJhc2VYUCBmcm9tICdCYXNlWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdvb2RYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKHBhcmVudENvbnRhaW5lcikge1xuXHRcdHN1cGVyKHBhcmVudENvbnRhaW5lcilcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBQYWdlIGZyb20gJ1BhZ2UnXG5pbXBvcnQgTGFuZGluZ1NsaWRlc2hvdyBmcm9tICdMYW5kaW5nU2xpZGVzaG93J1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3MgZnJvbSAnQ29tcGFzcydcbmltcG9ydCBBcnJvd0J0biBmcm9tICdBcnJvd0J0bidcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhbmRpbmcgZXh0ZW5kcyBQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRwcm9wcy5kYXRhLmlzTW9iaWxlID0gQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGVcblx0XHRpZihwcm9wcy5kYXRhLmlzTW9iaWxlKSB7XG5cdFx0XHR2YXIgbW9iaWxlU2NvcGUgPSBbXVxuXHRcdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHRcdHZhciBpbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIHBsYW5ldCA9IHBsYW5ldHNbaV1cblx0XHRcdFx0dmFyIGcgPSB7XG5cdFx0XHRcdFx0aWQ6IHBsYW5ldCxcblx0XHRcdFx0XHRwbGFuZXRUeHQ6IGluZm9zLnBsYW5ldC50b1VwcGVyQ2FzZSgpLFxuXHRcdFx0XHRcdHBsYW5ldE5hbWU6IHBsYW5ldC50b1VwcGVyQ2FzZSgpLFxuXHRcdFx0XHRcdGltZ3NyYzogQXBwU3RvcmUubWFpbkltYWdlVXJsKHBsYW5ldCwgQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpLFxuXHRcdFx0XHRcdHVybDogXCIjIS9wbGFuZXQvXCIgKyBwbGFuZXQgKyAnLzAnXG5cdFx0XHRcdH1cblx0XHRcdFx0bW9iaWxlU2NvcGVbaV0gPSBnXG5cdFx0XHR9O1xuXHRcdFx0cHJvcHMuZGF0YS5tb2JpbGVTY29wZSA9IG1vYmlsZVNjb3BlXG5cdFx0fVxuXG5cdFx0c3VwZXIocHJvcHMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSAhPSB0cnVlKSB7XG5cblx0XHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdyA9IG5ldyBMYW5kaW5nU2xpZGVzaG93KHRoaXMucHhDb250YWluZXIsIHRoaXMuY2hpbGQpXG5cdFx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0XHR0aGlzLmNvbXBhc3MgPSBuZXcgQ29tcGFzcyh0aGlzLnB4Q29udGFpbmVyKVxuXHRcdFx0dGhpcy5jb21wYXNzLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdFx0dGhpcy5hcnJvd0xlZnQgPSBuZXcgQXJyb3dCdG4odGhpcy5jaGlsZC5maW5kKCcucHJldmlvdXMtYnRuJyksIEFwcENvbnN0YW50cy5MRUZUKVxuXHRcdFx0dGhpcy5hcnJvd0xlZnQuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdFx0dGhpcy5hcnJvd1JpZ2h0ID0gbmV3IEFycm93QnRuKHRoaXMuY2hpbGQuZmluZCgnLm5leHQtYnRuJyksIEFwcENvbnN0YW50cy5SSUdIVClcblx0XHRcdHRoaXMuYXJyb3dSaWdodC5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHRcdHRoaXMub25LZXlQcmVzc2VkID0gdGhpcy5vbktleVByZXNzZWQuYmluZCh0aGlzKVxuXHRcdFx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCB0aGlzLm9uS2V5UHJlc3NlZClcblxuXHRcdFx0dGhpcy5hcnJvd0NsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0XHR0aGlzLmFycm93TW91c2VFbnRlciA9IHRoaXMuYXJyb3dNb3VzZUVudGVyLmJpbmQodGhpcylcblx0XHRcdHRoaXMuYXJyb3dNb3VzZUxlYXZlID0gdGhpcy5hcnJvd01vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHRcdFx0dGhpcy5taWRkbGVBcmVhTW91c2VFbnRlciA9IHRoaXMubWlkZGxlQXJlYU1vdXNlRW50ZXIuYmluZCh0aGlzKVxuXHRcdFx0dGhpcy5taWRkbGVBcmVhTW91c2VMZWF2ZSA9IHRoaXMubWlkZGxlQXJlYU1vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHRcdFx0dGhpcy5taWRkbGVBcmVhQ2xpY2sgPSB0aGlzLm1pZGRsZUFyZWFDbGljay5iaW5kKHRoaXMpXG5cblx0XHRcdHRoaXMucHJldmlvdXNBcmVhID0gdGhpcy5jaGlsZC5maW5kKCcuaW50ZXJmYWNlIC5wcmV2aW91cy1hcmVhJylcblx0XHRcdHRoaXMubmV4dEFyZWEgPSB0aGlzLmNoaWxkLmZpbmQoJy5pbnRlcmZhY2UgLm5leHQtYXJlYScpXG5cdFx0XHR0aGlzLm1pZGRsZUFyZWEgPSB0aGlzLmNoaWxkLmZpbmQoJy5pbnRlcmZhY2UgLm1pZGRsZS1hcmVhJylcblx0XHRcdHRoaXMucHJldmlvdXNBcmVhLm9uKCdjbGljaycsIHRoaXMuYXJyb3dDbGlja2VkKVxuXHRcdFx0dGhpcy5uZXh0QXJlYS5vbignY2xpY2snLCB0aGlzLmFycm93Q2xpY2tlZClcblx0XHRcdHRoaXMucHJldmlvdXNBcmVhLm9uKCdtb3VzZWVudGVyJywgdGhpcy5hcnJvd01vdXNlRW50ZXIpXG5cdFx0XHR0aGlzLm5leHRBcmVhLm9uKCdtb3VzZWVudGVyJywgdGhpcy5hcnJvd01vdXNlRW50ZXIpXG5cdFx0XHR0aGlzLm1pZGRsZUFyZWEub24oJ21vdXNlZW50ZXInLCB0aGlzLm1pZGRsZUFyZWFNb3VzZUVudGVyKVxuXHRcdFx0dGhpcy5wcmV2aW91c0FyZWEub24oJ21vdXNlbGVhdmUnLCB0aGlzLmFycm93TW91c2VMZWF2ZSlcblx0XHRcdHRoaXMubmV4dEFyZWEub24oJ21vdXNlbGVhdmUnLCB0aGlzLmFycm93TW91c2VMZWF2ZSlcblx0XHRcdHRoaXMubWlkZGxlQXJlYS5vbignbW91c2VsZWF2ZScsIHRoaXMubWlkZGxlQXJlYU1vdXNlTGVhdmUpXG5cblx0XHRcdHRoaXMubWlkZGxlQXJlYS5vbignY2xpY2snLCB0aGlzLm1pZGRsZUFyZWFDbGljaylcblxuXHRcdFx0dGhpcy50d2VlbkNvbXBhc3MgPSBUd2Vlbk1heC50byh0aGlzLmNvbXBhc3MuY29udGFpbmVyLnNjYWxlLCAwLjYsIHsgeDoxLjEsIHk6MS4xLCBlYXNlOkJhY2suZWFzZUluT3V0IH0pXG5cdFx0XHR0aGlzLnR3ZWVuQ29tcGFzcy5wYXVzZSgwKVxuXHRcdH1cblxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRtaWRkbGVBcmVhTW91c2VFbnRlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy50d2VlbkNvbXBhc3MudGltZVNjYWxlKDEpLnBsYXkoKVxuXHR9XG5cdG1pZGRsZUFyZWFNb3VzZUxlYXZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLnR3ZWVuQ29tcGFzcy50aW1lU2NhbGUoMS40KS5yZXZlcnNlKClcblx0fVxuXHRtaWRkbGVBcmVhQ2xpY2soZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciB1cmwgPSBcIi9wbGFuZXQvXCIgKyB0aGlzLmxhbmRpbmdTbGlkZXNob3cuY3VycmVudElkICsgJy8wJ1xuXHRcdFJvdXRlci5zZXRIYXNoKHVybClcblx0fVxuXHRhcnJvd0NsaWNrZWQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciBpZCA9IGUuY3VycmVudFRhcmdldC5pZFxuXHRcdHZhciBkaXJlY3Rpb24gPSBpZC50b1VwcGVyQ2FzZSgpXG5cdFx0c3dpdGNoKGRpcmVjdGlvbikge1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEVGVDpcblx0XHRcdFx0dGhpcy5wcmV2aW91cygpXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5SSUdIVDpcblx0XHRcdFx0dGhpcy5uZXh0KClcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdH1cblx0YXJyb3dNb3VzZUVudGVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgaWQgPSBlLmN1cnJlbnRUYXJnZXQuaWRcblx0XHR2YXIgZGlyZWN0aW9uID0gaWQudG9VcHBlckNhc2UoKVxuXHRcdHZhciBhcnJvdyA9IHRoaXMuZ2V0QXJyb3dCeURpcmVjdGlvbihkaXJlY3Rpb24pXG5cdFx0YXJyb3cubW91c2VPdmVyKClcblx0fVxuXHRhcnJvd01vdXNlTGVhdmUoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciBpZCA9IGUuY3VycmVudFRhcmdldC5pZFxuXHRcdHZhciBkaXJlY3Rpb24gPSBpZC50b1VwcGVyQ2FzZSgpXG5cdFx0dmFyIGFycm93ID0gdGhpcy5nZXRBcnJvd0J5RGlyZWN0aW9uKGRpcmVjdGlvbilcblx0XHRhcnJvdy5tb3VzZU91dCgpXG5cdH1cblx0Z2V0QXJyb3dCeURpcmVjdGlvbihkaXJlY3Rpb24pIHtcblx0XHRzd2l0Y2goZGlyZWN0aW9uKSB7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MRUZUOlxuXHRcdFx0XHRyZXR1cm4gdGhpcy5hcnJvd0xlZnRcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlJJR0hUOlxuXHRcdFx0XHRyZXR1cm4gdGhpcy5hcnJvd1JpZ2h0XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHR9XG5cdG9uS2V5UHJlc3NlZChlKSB7XG5cdCAgICBlLnByZXZlbnREZWZhdWx0KClcblx0XHRzd2l0Y2goZS53aGljaCkge1xuXHQgICAgICAgIGNhc2UgMzc6IC8vIGxlZnRcblx0ICAgICAgICBcdHRoaXMucHJldmlvdXMoKVxuXHQgICAgICAgIFx0YnJlYWtcblx0ICAgICAgICBjYXNlIDM5OiAvLyByaWdodFxuXHQgICAgICAgIFx0dGhpcy5uZXh0KClcblx0ICAgICAgICBcdGJyZWFrXG5cdCAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuXHQgICAgfVxuXHR9XG5cdHVwZGF0ZUNvbXBhc3NQbGFuZXQoKSB7XG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHJldHVybiBcblx0XHRcblx0XHR2YXIgcGxhbmV0RGF0YSA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQodGhpcy5sYW5kaW5nU2xpZGVzaG93LmN1cnJlbnRJZClcblx0XHR0aGlzLmNvbXBhc3MudXBkYXRlRGF0YShwbGFuZXREYXRhKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdG5leHQoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93Lm5leHQoKVxuXHRcdHRoaXMudXBkYXRlQ29tcGFzc1BsYW5ldCgpXG5cdH1cblx0cHJldmlvdXMoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnByZXZpb3VzKClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgcmV0dXJuIFxuXG5cdFx0Ly8gdmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdC8vIHZhciBtb3VzZVggPSBBcHBTdG9yZS5Nb3VzZS54XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnVwZGF0ZSgpXG5cdFx0dGhpcy5jb21wYXNzLnVwZGF0ZSgpXG5cdFx0Ly8gdGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTk9ORVxuXHRcdC8vIHZhciBhcmVhID0gd2luZG93VyAqIDAuMjVcblx0XHQvLyBpZihtb3VzZVggPiAoKHdpbmRvd1cgPj4gMSkgLSBhcmVhKSAmJiBtb3VzZVggPCAoKHdpbmRvd1cgPj4gMSkgKyBhcmVhKSkge1xuXHRcdC8vIFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuVE9QXG5cdFx0Ly8gfVxuXG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm4gXG5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5yZXNpemUoKVxuXHRcdHRoaXMuY29tcGFzcy5yZXNpemUoKVxuXHRcdHRoaXMuY29tcGFzcy5wb3NpdGlvbihcblx0XHRcdHdpbmRvd1cgPj4gMSxcblx0XHRcdCh3aW5kb3dIID4+IDEpICsgKHdpbmRvd0ggKiAwLjAzKVxuXHRcdClcblx0XHR0aGlzLmFycm93UmlnaHQucG9zaXRpb24oXG5cdFx0XHR3aW5kb3dXIC0gKCh3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UpID4+IDEpLFxuXHRcdFx0d2luZG93SCA+PiAxXG5cdFx0KVxuXHRcdHRoaXMuYXJyb3dMZWZ0LnBvc2l0aW9uKFxuXHRcdFx0KCh3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UpID4+IDEpIC0gdGhpcy5hcnJvd0xlZnQud2lkdGgsXG5cdFx0XHR3aW5kb3dIID4+IDFcblx0XHQpXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEuY3NzKHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UsXG5cdFx0XHRoZWlnaHQ6IHdpbmRvd0hcblx0XHR9KVxuXHRcdHRoaXMubmV4dEFyZWEuY3NzKHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UsXG5cdFx0XHRoZWlnaHQ6IHdpbmRvd0gsXG5cdFx0XHRsZWZ0OiB3aW5kb3dXIC0gKHdpbmRvd1cgKiBBcHBDb25zdGFudHMuTEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRSlcblx0XHR9KVxuXHRcdHRoaXMubWlkZGxlQXJlYS5jc3Moe1xuXHRcdFx0bGVmdDogd2luZG93VyAqIEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFLFxuXHRcdFx0d2lkdGg6IHdpbmRvd1cgLSAoKHdpbmRvd1cgKiBBcHBDb25zdGFudHMuTEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRSkgPDwgMSksXG5cdFx0XHRoZWlnaHQ6IHdpbmRvd0hcblx0XHR9KVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm4gXG5cblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuY29tcGFzcy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5hcnJvd0xlZnQuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuYXJyb3dSaWdodC5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0JChkb2N1bWVudCkub2ZmKCdrZXlkb3duJywgdGhpcy5vbktleVByZXNzZWQpXG5cblx0XHR0aGlzLnByZXZpb3VzQXJlYS5vZmYoJ2NsaWNrJywgdGhpcy5hcnJvd0NsaWNrZWQpXG5cdFx0dGhpcy5uZXh0QXJlYS5vZmYoJ2NsaWNrJywgdGhpcy5hcnJvd0NsaWNrZWQpXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEub2ZmKCdtb3VzZWVudGVyJywgdGhpcy5hcnJvd01vdXNlRW50ZXIpXG5cdFx0dGhpcy5uZXh0QXJlYS5vZmYoJ21vdXNlZW50ZXInLCB0aGlzLmFycm93TW91c2VFbnRlcilcblx0XHR0aGlzLnByZXZpb3VzQXJlYS5vZmYoJ21vdXNlbGVhdmUnLCB0aGlzLmFycm93TW91c2VMZWF2ZSlcblx0XHR0aGlzLm5leHRBcmVhLm9mZignbW91c2VsZWF2ZScsIHRoaXMuYXJyb3dNb3VzZUxlYXZlKVxuXG5cdFx0dGhpcy5taWRkbGVBcmVhLm9mZignbW91c2VlbnRlcicsIHRoaXMubWlkZGxlQXJlYU1vdXNlRW50ZXIpXG5cdFx0dGhpcy5taWRkbGVBcmVhLm9mZignbW91c2VsZWF2ZScsIHRoaXMubWlkZGxlQXJlYU1vdXNlTGVhdmUpXG5cdFx0dGhpcy5taWRkbGVBcmVhLm9mZignY2xpY2snLCB0aGlzLm1pZGRsZUFyZWFDbGljaylcblx0fVxufVxuXG4iLCJleHBvcnQgZGVmYXVsdCB7XG5cdFdJTkRPV19SRVNJWkU6ICdXSU5ET1dfUkVTSVpFJyxcblx0UEFHRV9IQVNIRVJfQ0hBTkdFRDogJ1BBR0VfSEFTSEVSX0NIQU5HRUQnLFxuXHRQQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0U6ICdQQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0UnLFxuXHRQWF9DT05UQUlORVJfSVNfUkVBRFk6ICdQWF9DT05UQUlORVJfSVNfUkVBRFknLFxuXHRQWF9DT05UQUlORVJfQUREX0NISUxEOiAnUFhfQ09OVEFJTkVSX0FERF9DSElMRCcsXG5cdFBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQ6ICdQWF9DT05UQUlORVJfUkVNT1ZFX0NISUxEJyxcblxuXHRMQU5ESU5HOiAnTEFORElORycsXG5cdEVYUEVSSUVOQ0U6ICdFWFBFUklFTkNFJyxcblx0Q0FNUEFJR046ICdDQU1QQUlHTicsXG5cdE5PTkU6ICdOT05FJyxcblxuXHRDT01QQVNTX1NJWkVfUEVSQ0VOVEFHRTogMC4xNixcblx0Q09NUEFTU19TTUFMTF9TSVpFX1BFUkNFTlRBR0U6IDAuMTgsXG5cblx0TEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRTogMC4yNCxcblxuXHRTTUFMTF9LTk9UX1JBRElVUzogMyxcblxuXHRPUEVOOiAnT1BFTicsXG5cdENMT1NFOiAnQ0xPU0UnLFxuXG5cdExFRlQ6ICdMRUZUJyxcblx0UklHSFQ6ICdSSUdIVCcsXG5cdFRPUDogJ1RPUCcsXG5cdEJPVFRPTTogJ0JPVFRPTScsXG5cblx0VE9UQUxfS05PVF9OVU06IDMsXG5cblx0UEFERElOR19BUk9VTkQ6IDQwLFxuXG5cdENBTVBBSUdOX0lNQUdFX1NJWkU6IFsxNTAwLCA5NzNdLFxuXG5cdFJFU1BPTlNJVkVfSU1BR0U6IFsxOTIwLCAxMjgwLCA2NDBdLFxuXG5cdEVOVklST05NRU5UUzoge1xuXHRcdFBSRVBST0Q6IHtcblx0XHRcdHN0YXRpYzogJydcblx0XHR9LFxuXHRcdFBST0Q6IHtcblx0XHRcdFwic3RhdGljXCI6IEpTX3VybF9zdGF0aWMgKyAnLydcblx0XHR9XG5cdH0sXG5cblx0TEFORFNDQVBFOiAnTEFORFNDQVBFJyxcblx0UE9SVFJBSVQ6ICdQT1JUUkFJVCcsXG5cblx0TUVESUFfR0xPQkFMX1c6IDE5MjAsXG5cdE1FRElBX0dMT0JBTF9IOiAxMDgwLFxuXG5cdEdMT0JBTF9GT05UX1NJWkU6IDE2LFxuXG5cdE1JTl9NSURETEVfVzogOTYwLFxuXHRNUV9YU01BTEw6IDMyMCxcblx0TVFfU01BTEw6IDQ4MCxcblx0TVFfTUVESVVNOiA3NjgsXG5cdE1RX0xBUkdFOiAxMDI0LFxuXHRNUV9YTEFSR0U6IDEyODAsXG5cdE1RX1hYTEFSR0U6IDE2ODAsXG59IiwiaW1wb3J0IEZsdXggZnJvbSAnZmx1eCdcbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbidcblxudmFyIEFwcERpc3BhdGNoZXIgPSBhc3NpZ24obmV3IEZsdXguRGlzcGF0Y2hlcigpLCB7XG5cdGhhbmRsZVZpZXdBY3Rpb246IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdHRoaXMuZGlzcGF0Y2goe1xuXHRcdFx0c291cmNlOiAnVklFV19BQ1RJT04nLFxuXHRcdFx0YWN0aW9uOiBhY3Rpb25cblx0XHR9KTtcblx0fVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IEFwcERpc3BhdGNoZXIiLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiXHRcdFxcblx0XHQ8ZGl2IGlkPVxcXCJtb2JpbGUtbWVudVxcXCI+XFxuXHRcdFx0PGEgaHJlZj1cXFwiIyEvbGFuZGluZ1xcXCIgY2xhc3M9XFxcImxvZ29cXFwiPlxcblx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIGlkPVxcXCJMYXllcl8xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDEzNi4wMTMgNDkuMzc1XFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAxMzYuMDEzIDQ5LjM3NVxcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIiBjbGlwLXJ1bGU9XFxcImV2ZW5vZGRcXFwiIGQ9XFxcIk04Mi4xNDEsOC4wMDJoMy4zNTRjMS4yMTMsMCwxLjcxNywwLjQ5OSwxLjcxNywxLjcyNXY3LjEzN2MwLDEuMjMxLTAuNTAxLDEuNzM2LTEuNzA1LDEuNzM2aC0zLjM2NVY4LjAwMnogTTgyLjUyMywyNC42MTd2OC40MjZsLTcuMDg3LTAuMzg0VjEuOTI1SDg3LjM5YzMuMjkyLDAsNS45NiwyLjcwNSw1Ljk2LDYuMDQ0djEwLjYwNGMwLDMuMzM4LTIuNjY4LDYuMDQ0LTUuOTYsNi4wNDRIODIuNTIzeiBNMzMuNDkxLDcuOTEzYy0xLjEzMiwwLTIuMDQ4LDEuMDY1LTIuMDQ4LDIuMzc5djExLjI1Nmg0LjQwOVYxMC4yOTJjMC0xLjMxNC0wLjkxNy0yLjM3OS0yLjA0Ny0yLjM3OUgzMy40OTF6IE0zMi45OTQsMC45NzRoMS4zMDhjNC43MDIsMCw4LjUxNCwzLjg2Niw4LjUxNCw4LjYzNHYyNS4yMjRsLTYuOTYzLDEuMjczdi03Ljg0OGgtNC40MDlsMC4wMTIsOC43ODdsLTYuOTc0LDIuMDE4VjkuNjA4QzI0LjQ4MSw0LjgzOSwyOC4yOTIsMC45NzQsMzIuOTk0LDAuOTc0IE0xMjEuOTMzLDcuOTIxaDMuNDIzYzEuMjE1LDAsMS43MTgsMC40OTcsMS43MTgsMS43MjR2OC4xOTRjMCwxLjIzMi0wLjUwMiwxLjczNi0xLjcwNSwxLjczNmgtMy40MzZWNy45MjF6IE0xMzMuNzE4LDMxLjA1NXYxNy40ODdsLTYuOTA2LTMuMzY4VjMxLjU5MWMwLTQuOTItNC41ODgtNS4wOC00LjU4OC01LjA4djE2Ljc3NGwtNi45ODMtMi45MTRWMS45MjVoMTIuMjMxYzMuMjkxLDAsNS45NTksMi43MDUsNS45NTksNi4wNDR2MTEuMDc3YzAsMi4yMDctMS4yMTcsNC4xNTMtMi45OTEsNS4xMTVDMTMxLjc2MSwyNC44OTQsMTMzLjcxOCwyNy4wNzcsMTMzLjcxOCwzMS4wNTUgTTEwLjgwOSwwLjgzM2MtNC43MDMsMC04LjUxNCwzLjg2Ni04LjUxNCw4LjYzNHYyNy45MzZjMCw0Ljc2OSw0LjAxOSw4LjYzNCw4LjcyMiw4LjYzNGwxLjMwNi0wLjA4NWM1LjY1NS0xLjA2Myw4LjMwNi00LjYzOSw4LjMwNi05LjQwN3YtOC45NGgtNi45OTZ2OC43MzZjMCwxLjQwOS0wLjA2NCwyLjY1LTEuOTk0LDIuOTkyYy0xLjIzMSwwLjIxOS0yLjQxNy0wLjgxNi0yLjQxNy0yLjEzMlYxMC4xNTFjMC0xLjMxNCwwLjkxNy0yLjM4MSwyLjA0Ny0yLjM4MWgwLjMxNWMxLjEzLDAsMi4wNDgsMS4wNjcsMi4wNDgsMi4zODF2OC40NjRoNi45OTZWOS40NjdjMC00Ljc2OC0zLjgxMi04LjYzNC04LjUxNC04LjYzNEgxMC44MDkgTTEwMy45NTMsMjMuMTYyaDYuOTc3di02Ljc0NGgtNi45NzdWOC40MjNsNy42NzYtMC4wMDJWMS45MjRIOTYuNzJ2MzMuMjc4YzAsMCw1LjIyNSwxLjE0MSw3LjUzMiwxLjY2NmMxLjUxNywwLjM0Niw3Ljc1MiwyLjI1Myw3Ljc1MiwyLjI1M3YtNy4wMTVsLTguMDUxLTEuNTA4VjIzLjE2MnogTTQ2Ljg3OSwxLjkyN2wwLjAwMywzMi4zNWw3LjEyMy0wLjg5NVYxOC45ODVsNS4xMjYsMTAuNDI2bDUuMTI2LTEwLjQ4NGwwLjAwMiwxMy42NjRsNy4wMjItMC4wNTRWMS44OTVoLTcuNTQ1TDU5LjEzLDE0LjZMNTQuNjYxLDEuOTI3SDQ2Ljg3OXpcXFwiLz48L3N2Zz5cXG5cdFx0XHQ8L2E+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiYnVyZ2VyIGJ0blxcXCI+XFxuXHRcdFx0XHQ8IURPQ1RZUEUgc3ZnIFBVQkxJQyBcXFwiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU5cXFwiIFxcXCJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGRcXFwiPjxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDYxLjU2NCA0OS4zNTZcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDYxLjU2NCA0OS4zNTZcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxnPjxwYXRoIGQ9XFxcIk00LjU2NCw4LjAwNmMxLjQ0MywwLDIuNjgyLTAuODU0LDMuMjY2LTIuMDc3aDE5LjY0OGMwLjU4NCwxLjIyMywxLjgyMywyLjA3NywzLjI2NywyLjA3N2MxLjQ0NCwwLDIuNjgzLTAuODU0LDMuMjY2LTIuMDc3aDE5LjY0OWMwLjU4MywxLjIyMywxLjgyMSwyLjA3NywzLjI2NiwyLjA3N2MwLjAxMywwLDAuMDI1LTAuMDAzLDAuMDM5LTAuMDAzYzAuMDEyLDAsMC4wMjMsMC4wMDMsMC4wMzUsMC4wMDNjMC4yNDMsMCwwLjQ4MS0wLjAyMywwLjcxNC0wLjA2OWMwLjY5Ni0wLjEzOCwxLjMzOC0wLjQ3OSwxLjg1My0wLjk5M2MxLjQxNC0xLjQxNCwxLjQxNC0zLjcxNS0wLjAwMS01LjEzMWMtMC40MTEtMC40MTEtMC45MTctMC42ODMtMS40NTctMC44NDhjLTAuMzcyLTAuMTI5LTAuNzY3LTAuMjE0LTEuMTgzLTAuMjE0Yy0xLjQ0MywwLTIuNjgyLDAuODUzLTMuMjY2LDIuMDc2SDM0LjAxMWMtMC41ODQtMS4yMjMtMS44MjItMi4wNzYtMy4yNjYtMi4wNzZzLTIuNjgyLDAuODUzLTMuMjY3LDIuMDc2SDcuODNDNy4yNDcsMS42MDMsNi4wMDcsMC43NSw0LjU2NCwwLjc1Yy0yLjAwMSwwLTMuNjI5LDEuNjI3LTMuNjI5LDMuNjI3QzAuOTM2LDYuMzc4LDIuNTYzLDguMDA2LDQuNTY0LDguMDA2elxcXCIvPjxwYXRoIGQ9XFxcIk00LjU2NCwyOC4xNjhjMS40NDMsMCwyLjY4Mi0wLjg1NCwzLjI2Ni0yLjA3NmgxOS42NDljMC41ODQsMS4yMjMsMS44MjMsMi4wNzYsMy4yNjcsMi4wNzZzMi42ODItMC44NTQsMy4yNjYtMi4wNzZoMTkuNjQ5YzAuNTg0LDEuMjIzLDEuODIyLDIuMDc2LDMuMjY2LDIuMDc2YzAuMDEyLDAsMC4wMjQtMC4wMDQsMC4wMzctMC4wMDRjMC4wMTIsMCwwLjAyNCwwLjAwNCwwLjAzNywwLjAwNGMwLjI0MywwLDAuNDgxLTAuMDIzLDAuNzE0LTAuMDdjMC42OTYtMC4xMzcsMS4zMzgtMC40NzgsMS44NTMtMC45OTJjMC4xNzYtMC4xNzUsMC4zMjktMC4zNjUsMC40NjItMC41NjhjMC4wMDQtMC4wMDYsMC4wMDYtMC4wMTIsMC4wMS0wLjAxOGMwLjM4My0wLjU4NCwwLjU5LTEuMjY1LDAuNTktMS45NzljMC0wLjcwMi0wLjIwMy0xLjM3MS0wLjU3My0xLjk0OGMtMC4wMS0wLjAxNi0wLjAxNi0wLjAzNC0wLjAyNy0wLjA1MWMtMC4xMzMtMC4yMDItMC4yODYtMC4zOTItMC40NjItMC41NjdjLTAuNjg2LTAuNjg1LTEuNTk3LTEuMDYyLTIuNTY1LTEuMDYyYy0wLjAxMywwLTAuMDI1LDAuMDAzLTAuMDM3LDAuMDAzYy0wLjAxMywwLTAuMDI1LTAuMDAzLTAuMDM3LTAuMDAzYy0xLjQ0NCwwLTIuNjgzLDAuODUzLTMuMjY2LDIuMDc2SDM0LjAxMWMtMC41ODMtMS4yMjMtMS44MjEtMi4wNzYtMy4yNjYtMi4wNzZjLTEuNDQzLDAtMi42ODMsMC44NTMtMy4yNjcsMi4wNzZINy44MzFjLTAuNTg0LTEuMjIzLTEuODIzLTIuMDc2LTMuMjY2LTIuMDc2Yy0yLjAwMSwwLTMuNjI5LDEuNjI3LTMuNjI5LDMuNjI3UzIuNTYzLDI4LjE2OCw0LjU2NCwyOC4xNjh6XFxcIi8+PHBhdGggZD1cXFwiTTU3LDQxLjM1MWMtMC4wMTMsMC0wLjAyNSwwLjAwNC0wLjAzNywwLjAwNGMtMC4wMTMsMC0wLjAyNS0wLjAwNC0wLjAzNy0wLjAwNGMtMS40NDMsMC0yLjY4MiwwLjg1My0zLjI2NiwyLjA3NUgzNC4wMTFjLTAuNTg0LTEuMjIzLTEuODIyLTIuMDc1LTMuMjY2LTIuMDc1cy0yLjY4MiwwLjg1My0zLjI2NywyLjA3NUg3LjgzYy0wLjU4My0xLjIyMy0xLjgyMy0yLjA3NS0zLjI2Ni0yLjA3NWMtMi4wMDEsMC0zLjYyOSwxLjYyNy0zLjYyOSwzLjYyNmMwLDIuMDAxLDEuNjI4LDMuNjI5LDMuNjI5LDMuNjI5YzEuNDQzLDAsMi42ODMtMC44NTQsMy4yNjYtMi4wNzdoMTkuNjQ4YzAuNTg0LDEuMjIzLDEuODIzLDIuMDc3LDMuMjY3LDIuMDc3YzEuNDQ0LDAsMi42ODMtMC44NTQsMy4yNjYtMi4wNzdoMTkuNjQ5YzAuNTgzLDEuMjIzLDEuODIxLDIuMDc3LDMuMjY2LDIuMDc3YzAuMDEyLDAsMC4wMjQtMC4wMDQsMC4wMzctMC4wMDRjMC4wMTIsMCwwLjAyNCwwLjAwNCwwLjAzNywwLjAwNGMwLjI0MywwLDAuNDgxLTAuMDIzLDAuNzE0LTAuMDdjMC42OTctMC4xMzgsMS4zMzktMC40NzksMS44NTMtMC45OTJjMS40MTQtMS40MTQsMS40MTQtMy43MTctMC4wMDEtNS4xMzFDNTguODgsNDEuNzI4LDU3Ljk2OSw0MS4zNTEsNTcsNDEuMzUxelxcXCIvPjwvZz48L3N2Zz5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJtZW51LXNsaWRlclxcXCI+XFxuXHRcdFx0XHQ8dWwgY2xhc3M9J21haW4tbWVudSc+XFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5tb2JpbGVNZW51IDogZGVwdGgwKSx7XCJuYW1lXCI6XCJlYWNoXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgyLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXHRcdFx0XHQ8L3VsPlxcblx0XHRcdFx0PHVsIGNsYXNzPSdzb2NpYWwtbWVudSc+XFxuXHRcdFx0XHRcdDxsaT5cXG5cdFx0XHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmZhY2Vib29rVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5mYWNlYm9va1VybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiZmFjZWJvb2tVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xNi4wMDIsMC4xNjdjLTguNzQ2LDAtMTUuODM1LDcuMDktMTUuODM1LDE1LjgzNGMwLDguNzQ2LDcuMDg5LDE1LjgzNSwxNS44MzUsMTUuODM1YzguNzQ1LDAsMTUuODM0LTcuMDg5LDE1LjgzNC0xNS44MzVDMzEuODM2LDcuMjU3LDI0Ljc0NywwLjE2NywxNi4wMDIsMC4xNjcgTTIyLjMyMiwxMy41MzljMC4wMDcsMC4xMzgsMC4wMDksMC4yNzksMC4wMDksMC40MmMwLDQuMzAyLTMuMjcyLDkuMjU5LTkuMjU5LDkuMjU5Yy0xLjgzNywwLTMuNTQ3LTAuNTM5LTQuOTg3LTEuNDYxYzAuMjUzLDAuMDMxLDAuNTE0LDAuMDQ0LDAuNzc2LDAuMDQ0YzEuNTI1LDAsMi45MjgtMC41Miw0LjA0Mi0xLjM5NGMtMS40MjQtMC4wMjMtMi42MjUtMC45NjUtMy4wMzktMi4yNThjMC4xOTgsMC4wMzcsMC40MDIsMC4wNTgsMC42MTEsMC4wNThjMC4yOTgsMCwwLjU4NS0wLjAzOCwwLjg1OC0wLjExNWMtMS40ODktMC4yOTctMi42MTItMS42MTItMi42MTItMy4xODl2LTAuMDQxYzAuNDQsMC4yNDIsMC45NDIsMC4zODksMS40NzUsMC40MDdjLTAuODczLTAuNTg1LTEuNDQ3LTEuNTgxLTEuNDQ3LTIuNzA5YzAtMC41OTcsMC4xNi0xLjE1NSwwLjQ0MS0xLjYzOGMxLjYwNSwxLjk3LDQuMDAzLDMuMjY0LDYuNzA4LDMuNGMtMC4wNTctMC4yMzgtMC4wODUtMC40ODUtMC4wODUtMC43NGMwLTEuNzk3LDEuNDU4LTMuMjU0LDMuMjU0LTMuMjU0YzAuOTM3LDAsMS43ODMsMC4zOTUsMi4zNzUsMS4wMjhjMC43NDItMC4xNDYsMS40MzgtMC40MTcsMi4wNjctMC43ODljLTAuMjQyLDAuNzU5LTAuNzU5LDEuMzk2LTEuNDMyLDEuNzk5YzAuNjU4LTAuMDc5LDEuMjg2LTAuMjUzLDEuODY5LTAuNTExQzIzLjUxMSwxMi41MDcsMjIuOTU5LDEzLjA3OSwyMi4zMjIsMTMuNTM5XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHRcdFx0PC9hPlxcblx0XHRcdFx0XHQ8L2xpPlxcblx0XHRcdFx0XHQ8bGk+XFxuXHRcdFx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy50d2l0dGVyVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50d2l0dGVyVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJ0d2l0dGVyVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTYuMDAxLDAuMTY3Yy04Ljc0NSwwLTE1LjgzNCw3LjA5LTE1LjgzNCwxNS44MzRjMCw4Ljc0NSw3LjA4OSwxNS44MzUsMTUuODM0LDE1LjgzNWM4Ljc0NSwwLDE1LjgzNC03LjA5LDE1LjgzNC0xNS44MzVDMzEuODM2LDcuMjU3LDI0Ljc0NiwwLjE2NywxNi4wMDEsMC4xNjcgTTE5LjQ5OCwxMy4zMmwtMC4xODQsMi4zNjloLTIuNDI3djguMjI5aC0zLjA2OHYtOC4yMjloLTEuNjM4VjEzLjMyaDEuNjM4di0xLjU5MmMwLTAuNzAxLDAuMDE3LTEuNzgyLDAuNTI3LTIuNDUzYzAuNTM2LTAuNzA5LDEuMjczLTEuMTkxLDIuNTQxLTEuMTkxYzIuMDY2LDAsMi45MzUsMC4yOTUsMi45MzUsMC4yOTVsLTAuNDEsMi40MjVjMCwwLTAuNjgyLTAuMTk2LTEuMzE4LTAuMTk2Yy0wLjYzNywwLTEuMjA3LDAuMjI3LTEuMjA3LDAuODYzdjEuODVIMTkuNDk4elxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0XHRcdDwvYT5cXG5cdFx0XHRcdFx0PC9saT5cXG5cdFx0XHRcdFx0PGxpPlxcblx0XHRcdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW5zdGFncmFtVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbnN0YWdyYW1VcmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImluc3RhZ3JhbVVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE5LjQxMywxMi42MDJsLTAuMDA5LTIuNjg2bDIuNjg1LTAuMDA4djIuNjg0TDE5LjQxMywxMi42MDJ6IE0xNi4wMDQsMTguNzg4YzEuNTM2LDAsMi43ODctMS4yNSwyLjc4Ny0yLjc4N2MwLTAuNjA1LTAuMTk2LTEuMTY2LTAuNTI4LTEuNjI0Yy0wLjUwNy0wLjcwMy0xLjMyOS0xLjE2My0yLjI1OS0xLjE2M2MtMC45MzEsMC0xLjc1MywwLjQ2LTIuMjYsMS4xNjNjLTAuMzMsMC40NTgtMC41MjcsMS4wMTktMC41MjcsMS42MjRDMTMuMjE3LDE3LjUzOCwxNC40NjcsMTguNzg4LDE2LjAwNCwxOC43ODh6IE0yMC4zMzMsMTYuMDAxYzAsMi4zODctMS45NDIsNC4zMy00LjMyOSw0LjMzYy0yLjM4OCwwLTQuMzI5LTEuOTQzLTQuMzI5LTQuMzNjMC0wLjU3NSwwLjExNC0xLjEyMywwLjMxOC0xLjYyNEg5LjYyOXY2LjQ4MWMwLDAuODM2LDAuNjgxLDEuNTE4LDEuNTE4LDEuNTE4aDkuNzE0YzAuODM3LDAsMS41MTctMC42ODIsMS41MTctMS41MTh2LTYuNDgxaC0yLjM2M0MyMC4yMTcsMTQuODc4LDIwLjMzMywxNS40MjYsMjAuMzMzLDE2LjAwMXogTTMxLjgzNiwxNi4wMDFjMCw4Ljc0NC03LjA5LDE1LjgzNS0xNS44MzUsMTUuODM1UzAuMTY3LDI0Ljc0NSwwLjE2NywxNi4wMDFjMC04Ljc0NSw3LjA4OS0xNS44MzQsMTUuODM0LTE1LjgzNFMzMS44MzYsNy4yNTYsMzEuODM2LDE2LjAwMXogTTIzLjkyMSwxMS4xNDRjMC0xLjY4OC0xLjM3My0zLjA2LTMuMDYyLTMuMDZoLTkuNzEzYy0xLjY4NywwLTMuMDYsMS4zNzEtMy4wNiwzLjA2djkuNzE0YzAsMS42ODgsMS4zNzMsMy4wNiwzLjA2LDMuMDZoOS43MTNjMS42ODgsMCwzLjA2Mi0xLjM3MiwzLjA2Mi0zLjA2VjExLjE0NHpcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdFx0XHQ8L2E+XFxuXHRcdFx0XHRcdDwvbGk+XFxuXHRcdFx0XHQ8L3VsPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cXG5cIjtcbn0sXCIyXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHRcdFx0PGxpIGlkPSdcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaWQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlkIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJpZFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCInPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPSdcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51cmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcInVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCInPlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5uYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5uYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvYT48L2xpPlxcblwiO1xufSxcIjRcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyLCBhbGlhczE9dGhpcy5sYW1iZGEsIGFsaWFzMj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIGFsaWFzMz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzND1cImZ1bmN0aW9uXCI7XG5cbiAgcmV0dXJuIFwiXFxuXHRcdDxoZWFkZXIgaWQ9XFxcImhlYWRlclxcXCI+XFxuXHRcdFx0PGEgaHJlZj1cXFwiIyEvbGFuZGluZ1xcXCIgY2xhc3M9XFxcImxvZ29cXFwiPlxcblx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIGlkPVxcXCJMYXllcl8xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDEzNi4wMTMgNDkuMzc1XFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAxMzYuMDEzIDQ5LjM3NVxcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIiBjbGlwLXJ1bGU9XFxcImV2ZW5vZGRcXFwiIGQ9XFxcIk04Mi4xNDEsOC4wMDJoMy4zNTRjMS4yMTMsMCwxLjcxNywwLjQ5OSwxLjcxNywxLjcyNXY3LjEzN2MwLDEuMjMxLTAuNTAxLDEuNzM2LTEuNzA1LDEuNzM2aC0zLjM2NVY4LjAwMnogTTgyLjUyMywyNC42MTd2OC40MjZsLTcuMDg3LTAuMzg0VjEuOTI1SDg3LjM5YzMuMjkyLDAsNS45NiwyLjcwNSw1Ljk2LDYuMDQ0djEwLjYwNGMwLDMuMzM4LTIuNjY4LDYuMDQ0LTUuOTYsNi4wNDRIODIuNTIzeiBNMzMuNDkxLDcuOTEzYy0xLjEzMiwwLTIuMDQ4LDEuMDY1LTIuMDQ4LDIuMzc5djExLjI1Nmg0LjQwOVYxMC4yOTJjMC0xLjMxNC0wLjkxNy0yLjM3OS0yLjA0Ny0yLjM3OUgzMy40OTF6IE0zMi45OTQsMC45NzRoMS4zMDhjNC43MDIsMCw4LjUxNCwzLjg2Niw4LjUxNCw4LjYzNHYyNS4yMjRsLTYuOTYzLDEuMjczdi03Ljg0OGgtNC40MDlsMC4wMTIsOC43ODdsLTYuOTc0LDIuMDE4VjkuNjA4QzI0LjQ4MSw0LjgzOSwyOC4yOTIsMC45NzQsMzIuOTk0LDAuOTc0IE0xMjEuOTMzLDcuOTIxaDMuNDIzYzEuMjE1LDAsMS43MTgsMC40OTcsMS43MTgsMS43MjR2OC4xOTRjMCwxLjIzMi0wLjUwMiwxLjczNi0xLjcwNSwxLjczNmgtMy40MzZWNy45MjF6IE0xMzMuNzE4LDMxLjA1NXYxNy40ODdsLTYuOTA2LTMuMzY4VjMxLjU5MWMwLTQuOTItNC41ODgtNS4wOC00LjU4OC01LjA4djE2Ljc3NGwtNi45ODMtMi45MTRWMS45MjVoMTIuMjMxYzMuMjkxLDAsNS45NTksMi43MDUsNS45NTksNi4wNDR2MTEuMDc3YzAsMi4yMDctMS4yMTcsNC4xNTMtMi45OTEsNS4xMTVDMTMxLjc2MSwyNC44OTQsMTMzLjcxOCwyNy4wNzcsMTMzLjcxOCwzMS4wNTUgTTEwLjgwOSwwLjgzM2MtNC43MDMsMC04LjUxNCwzLjg2Ni04LjUxNCw4LjYzNHYyNy45MzZjMCw0Ljc2OSw0LjAxOSw4LjYzNCw4LjcyMiw4LjYzNGwxLjMwNi0wLjA4NWM1LjY1NS0xLjA2Myw4LjMwNi00LjYzOSw4LjMwNi05LjQwN3YtOC45NGgtNi45OTZ2OC43MzZjMCwxLjQwOS0wLjA2NCwyLjY1LTEuOTk0LDIuOTkyYy0xLjIzMSwwLjIxOS0yLjQxNy0wLjgxNi0yLjQxNy0yLjEzMlYxMC4xNTFjMC0xLjMxNCwwLjkxNy0yLjM4MSwyLjA0Ny0yLjM4MWgwLjMxNWMxLjEzLDAsMi4wNDgsMS4wNjcsMi4wNDgsMi4zODF2OC40NjRoNi45OTZWOS40NjdjMC00Ljc2OC0zLjgxMi04LjYzNC04LjUxNC04LjYzNEgxMC44MDkgTTEwMy45NTMsMjMuMTYyaDYuOTc3di02Ljc0NGgtNi45NzdWOC40MjNsNy42NzYtMC4wMDJWMS45MjRIOTYuNzJ2MzMuMjc4YzAsMCw1LjIyNSwxLjE0MSw3LjUzMiwxLjY2NmMxLjUxNywwLjM0Niw3Ljc1MiwyLjI1Myw3Ljc1MiwyLjI1M3YtNy4wMTVsLTguMDUxLTEuNTA4VjIzLjE2MnogTTQ2Ljg3OSwxLjkyN2wwLjAwMywzMi4zNWw3LjEyMy0wLjg5NVYxOC45ODVsNS4xMjYsMTAuNDI2bDUuMTI2LTEwLjQ4NGwwLjAwMiwxMy42NjRsNy4wMjItMC4wNTRWMS44OTVoLTcuNTQ1TDU5LjEzLDE0LjZMNTQuNjYxLDEuOTI3SDQ2Ljg3OXpcXFwiLz48L3N2Zz5cXG5cdFx0XHQ8L2E+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiaG9tZS1idG5cXFwiPjxhIGhyZWY9XFxcIiMhL2xhbmRpbmdcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5ob21lX3R4dCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJjYW1wZXItbGFiXFxcIj48YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmNhbXBlcl9sYWJfdXJsIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY2FtcGVyX2xhYiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzaG9wLXdyYXBwZXIgYnRuXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInNob3AtdGl0bGVcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX3RpdGxlIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiPC9kaXY+XFxuXHRcdFx0XHQ8dWwgY2xhc3M9XFxcInN1Ym1lbnUtd3JhcHBlclxcXCI+XFxuXHRcdFx0XHRcdDxsaSBjbGFzcz1cXFwic3ViLTBcXFwiPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPSdcIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuc2hvcF9tZW5fdXJsIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiJz5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuc2hvcF9tZW4gOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCI8L2E+PC9saT5cXG5cdFx0XHRcdFx0PGxpIGNsYXNzPVxcXCJzdWItMVxcXCI+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9J1wiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX3dvbWVuX3VybCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIic+XCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLnNob3Bfd29tZW4gOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCI8L2E+PC9saT5cXG5cdFx0XHRcdDwvdWw+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvaGVhZGVyPlxcblx0XHQ8Zm9vdGVyIGlkPVxcXCJmb290ZXJcXFwiIGNsYXNzPVxcXCJidG5cXFwiPlxcblx0XHRcdDxkaXYgaWQ9XFxcInNvY2lhbC13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInNvY2lhbC10aXRsZVxcXCI+U09DSUFMPC9kaXY+XFxuXHRcdFx0XHQ8dWw+XFxuXHRcdFx0XHRcdDxsaT5cXG5cdFx0XHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmZhY2Vib29rVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5mYWNlYm9va1VybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiZmFjZWJvb2tVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xNi4wMDIsMC4xNjdjLTguNzQ2LDAtMTUuODM1LDcuMDktMTUuODM1LDE1LjgzNGMwLDguNzQ2LDcuMDg5LDE1LjgzNSwxNS44MzUsMTUuODM1YzguNzQ1LDAsMTUuODM0LTcuMDg5LDE1LjgzNC0xNS44MzVDMzEuODM2LDcuMjU3LDI0Ljc0NywwLjE2NywxNi4wMDIsMC4xNjcgTTIyLjMyMiwxMy41MzljMC4wMDcsMC4xMzgsMC4wMDksMC4yNzksMC4wMDksMC40MmMwLDQuMzAyLTMuMjcyLDkuMjU5LTkuMjU5LDkuMjU5Yy0xLjgzNywwLTMuNTQ3LTAuNTM5LTQuOTg3LTEuNDYxYzAuMjUzLDAuMDMxLDAuNTE0LDAuMDQ0LDAuNzc2LDAuMDQ0YzEuNTI1LDAsMi45MjgtMC41Miw0LjA0Mi0xLjM5NGMtMS40MjQtMC4wMjMtMi42MjUtMC45NjUtMy4wMzktMi4yNThjMC4xOTgsMC4wMzcsMC40MDIsMC4wNTgsMC42MTEsMC4wNThjMC4yOTgsMCwwLjU4NS0wLjAzOCwwLjg1OC0wLjExNWMtMS40ODktMC4yOTctMi42MTItMS42MTItMi42MTItMy4xODl2LTAuMDQxYzAuNDQsMC4yNDIsMC45NDIsMC4zODksMS40NzUsMC40MDdjLTAuODczLTAuNTg1LTEuNDQ3LTEuNTgxLTEuNDQ3LTIuNzA5YzAtMC41OTcsMC4xNi0xLjE1NSwwLjQ0MS0xLjYzOGMxLjYwNSwxLjk3LDQuMDAzLDMuMjY0LDYuNzA4LDMuNGMtMC4wNTctMC4yMzgtMC4wODUtMC40ODUtMC4wODUtMC43NGMwLTEuNzk3LDEuNDU4LTMuMjU0LDMuMjU0LTMuMjU0YzAuOTM3LDAsMS43ODMsMC4zOTUsMi4zNzUsMS4wMjhjMC43NDItMC4xNDYsMS40MzgtMC40MTcsMi4wNjctMC43ODljLTAuMjQyLDAuNzU5LTAuNzU5LDEuMzk2LTEuNDMyLDEuNzk5YzAuNjU4LTAuMDc5LDEuMjg2LTAuMjUzLDEuODY5LTAuNTExQzIzLjUxMSwxMi41MDcsMjIuOTU5LDEzLjA3OSwyMi4zMjIsMTMuNTM5XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHRcdFx0PC9hPlxcblx0XHRcdFx0XHQ8L2xpPlxcblx0XHRcdFx0XHQ8bGk+XFxuXHRcdFx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy50d2l0dGVyVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50d2l0dGVyVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMyksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzNCA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJ0d2l0dGVyVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTYuMDAxLDAuMTY3Yy04Ljc0NSwwLTE1LjgzNCw3LjA5LTE1LjgzNCwxNS44MzRjMCw4Ljc0NSw3LjA4OSwxNS44MzUsMTUuODM0LDE1LjgzNWM4Ljc0NSwwLDE1LjgzNC03LjA5LDE1LjgzNC0xNS44MzVDMzEuODM2LDcuMjU3LDI0Ljc0NiwwLjE2NywxNi4wMDEsMC4xNjcgTTE5LjQ5OCwxMy4zMmwtMC4xODQsMi4zNjloLTIuNDI3djguMjI5aC0zLjA2OHYtOC4yMjloLTEuNjM4VjEzLjMyaDEuNjM4di0xLjU5MmMwLTAuNzAxLDAuMDE3LTEuNzgyLDAuNTI3LTIuNDUzYzAuNTM2LTAuNzA5LDEuMjczLTEuMTkxLDIuNTQxLTEuMTkxYzIuMDY2LDAsMi45MzUsMC4yOTUsMi45MzUsMC4yOTVsLTAuNDEsMi40MjVjMCwwLTAuNjgyLTAuMTk2LTEuMzE4LTAuMTk2Yy0wLjYzNywwLTEuMjA3LDAuMjI3LTEuMjA3LDAuODYzdjEuODVIMTkuNDk4elxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0XHRcdDwvYT5cXG5cdFx0XHRcdFx0PC9saT5cXG5cdFx0XHRcdFx0PGxpPlxcblx0XHRcdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW5zdGFncmFtVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbnN0YWdyYW1VcmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMzKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXM0ID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImluc3RhZ3JhbVVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE5LjQxMywxMi42MDJsLTAuMDA5LTIuNjg2bDIuNjg1LTAuMDA4djIuNjg0TDE5LjQxMywxMi42MDJ6IE0xNi4wMDQsMTguNzg4YzEuNTM2LDAsMi43ODctMS4yNSwyLjc4Ny0yLjc4N2MwLTAuNjA1LTAuMTk2LTEuMTY2LTAuNTI4LTEuNjI0Yy0wLjUwNy0wLjcwMy0xLjMyOS0xLjE2My0yLjI1OS0xLjE2M2MtMC45MzEsMC0xLjc1MywwLjQ2LTIuMjYsMS4xNjNjLTAuMzMsMC40NTgtMC41MjcsMS4wMTktMC41MjcsMS42MjRDMTMuMjE3LDE3LjUzOCwxNC40NjcsMTguNzg4LDE2LjAwNCwxOC43ODh6IE0yMC4zMzMsMTYuMDAxYzAsMi4zODctMS45NDIsNC4zMy00LjMyOSw0LjMzYy0yLjM4OCwwLTQuMzI5LTEuOTQzLTQuMzI5LTQuMzNjMC0wLjU3NSwwLjExNC0xLjEyMywwLjMxOC0xLjYyNEg5LjYyOXY2LjQ4MWMwLDAuODM2LDAuNjgxLDEuNTE4LDEuNTE4LDEuNTE4aDkuNzE0YzAuODM3LDAsMS41MTctMC42ODIsMS41MTctMS41MTh2LTYuNDgxaC0yLjM2M0MyMC4yMTcsMTQuODc4LDIwLjMzMywxNS40MjYsMjAuMzMzLDE2LjAwMXogTTMxLjgzNiwxNi4wMDFjMCw4Ljc0NC03LjA5LDE1LjgzNS0xNS44MzUsMTUuODM1UzAuMTY3LDI0Ljc0NSwwLjE2NywxNi4wMDFjMC04Ljc0NSw3LjA4OS0xNS44MzQsMTUuODM0LTE1LjgzNFMzMS44MzYsNy4yNTYsMzEuODM2LDE2LjAwMXogTTIzLjkyMSwxMS4xNDRjMC0xLjY4OC0xLjM3My0zLjA2LTMuMDYyLTMuMDZoLTkuNzEzYy0xLjY4NywwLTMuMDYsMS4zNzEtMy4wNiwzLjA2djkuNzE0YzAsMS42ODgsMS4zNzMsMy4wNiwzLjA2LDMuMDZoOS43MTNjMS42ODgsMCwzLjA2Mi0xLjM3MiwzLjA2Mi0zLjA2VjExLjE0NHpcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdFx0XHQ8L2E+XFxuXHRcdFx0XHRcdDwvbGk+XFxuXHRcdFx0XHQ8L3VsPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Zvb3Rlcj5cXG5cXG5cIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiBcIjxkaXY+XFxuXFxuXFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXNNb2JpbGUgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLnByb2dyYW0oNCwgZGF0YSwgMCksXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxuPC9kaXY+XCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGlkPSdwYWdlcy1jb250YWluZXInPlxcblx0PGRpdiBpZD0ncGFnZS1hJz48L2Rpdj5cXG5cdDxkaXYgaWQ9J3BhZ2UtYic+PC9kaXY+XFxuPC9kaXY+XCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIlxcblwiO1xufSxcIjNcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXHRcdDxkaXYgaWQ9XFxcInNjcm9sbGJhci12aWV3XFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJyZWxhdGl2ZVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzY3JvbGwtZ3JhYiBidG5cXFwiPjwvZGl2Plxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwic2Nyb2xsLWJnIGJ0blxcXCI+PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2PlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazEsIGhlbHBlciwgYWxpYXMxPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMyPVwiZnVuY3Rpb25cIiwgYWxpYXMzPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICByZXR1cm4gXCI8ZGl2IGNsYXNzPSdwYWdlLXdyYXBwZXInPlxcblx0XFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXNNb2JpbGUgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLnByb2dyYW0oMywgZGF0YSwgMCksXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxuXFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJpbnRlcmZhY2UgYWJzb2x1dGVcXFwiPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJzbGlkZXNob3ctdGl0bGVcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInBsYW5ldC10aXRsZVxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwicGxhbmV0LW5hbWVcXFwiPjwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiY29tcGFzc2VzLXRleHRzLXdyYXBwZXJcXFwiPjwvZGl2Plxcblx0XHRcXG5cdFx0PGRpdiBjbGFzcz1cXFwiYnV5LWJ0biBidG5cXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImRvdHMtcmVjdGFuZ2xlLWJ0biBidG5cXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiYnRuLXRpdGxlXFxcIj48L2Rpdj5cXG5cdFx0XHRcdDxzdmc+XFxuXHRcdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDwvc3ZnPlxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtdGl0bGUtd3JhcHBlclxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwcm9kdWN0LXRpdGxlIHRpdGxlLWFcXFwiPjwvZGl2Plxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwicHJvZHVjdC10aXRsZSB0aXRsZS1iXFxcIj48L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtY29udGFpbmVycy13cmFwcGVyXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwcm9kdWN0LWNvbnRhaW5lciBwcm9kdWN0LWNvbnRhaW5lci1hXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInBvc3Rlci13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwic3Bpbm5lci1pbWcgc3Bpbm5lci13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdFx0XHQ8c3ZnIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzAwIDMwMFxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIj5cXG5cdFx0XHRcdFx0XHRcdDxwYXRoIGQ9XFxcIk0gMTUwLDAgYSAxNTAsMTUwIDAgMCwxIDEwNi4wNjYsMjU2LjA2NiBsIC0zNS4zNTUsLTM1LjM1NSBhIC0xMDAsLTEwMCAwIDAsMCAtNzAuNzExLC0xNzAuNzExIHpcXFwiIGZpbGw9XFxcIiM3NmYxOWFcXFwiPlxcblx0XHRcdFx0XHRcdFx0XHQ8YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPVxcXCJ0cmFuc2Zvcm1cXFwiIGF0dHJpYnV0ZVR5cGU9XFxcIlhNTFxcXCIgdHlwZT1cXFwicm90YXRlXFxcIiBmcm9tPVxcXCIwIDE1MCAxNTBcXFwiIHRvPVxcXCIzNjAgMTUwIDE1MFxcXCIgYmVnaW49XFxcIjBzXFxcIiBkdXI9XFxcIjAuNXNcXFwiIGZpbGw9XFxcImZyZWV6ZVxcXCIgcmVwZWF0Q291bnQ9XFxcImluZGVmaW5pdGVcXFwiPjwvYW5pbWF0ZVRyYW5zZm9ybT5cXG5cdFx0XHRcdFx0XHRcdDwvcGF0aD5cXG5cdFx0XHRcdFx0XHQ8L3N2Zz5cXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdDxpbWcgc3JjPVxcXCJcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnNbJ2VtcHR5LWltYWdlJ10gfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwWydlbXB0eS1pbWFnZSddIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJlbXB0eS1pbWFnZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ2aWRlby13cmFwcGVyIGJ0blxcXCI+XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcInZpZGVvLWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwcm9kdWN0LWNvbnRhaW5lciBwcm9kdWN0LWNvbnRhaW5lci1iXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInBvc3Rlci13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwic3Bpbm5lci1pbWcgc3Bpbm5lci13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdFx0XHQ8c3ZnIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzAwIDMwMFxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIj5cXG5cdFx0XHRcdFx0XHRcdDxwYXRoIGQ9XFxcIk0gMTUwLDAgYSAxNTAsMTUwIDAgMCwxIDEwNi4wNjYsMjU2LjA2NiBsIC0zNS4zNTUsLTM1LjM1NSBhIC0xMDAsLTEwMCAwIDAsMCAtNzAuNzExLC0xNzAuNzExIHpcXFwiIGZpbGw9XFxcIiM3NmYxOWFcXFwiPlxcblx0XHRcdFx0XHRcdFx0XHQ8YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPVxcXCJ0cmFuc2Zvcm1cXFwiIGF0dHJpYnV0ZVR5cGU9XFxcIlhNTFxcXCIgdHlwZT1cXFwicm90YXRlXFxcIiBmcm9tPVxcXCIwIDE1MCAxNTBcXFwiIHRvPVxcXCIzNjAgMTUwIDE1MFxcXCIgYmVnaW49XFxcIjBzXFxcIiBkdXI9XFxcIjAuNXNcXFwiIGZpbGw9XFxcImZyZWV6ZVxcXCIgcmVwZWF0Q291bnQ9XFxcImluZGVmaW5pdGVcXFwiPjwvYW5pbWF0ZVRyYW5zZm9ybT5cXG5cdFx0XHRcdFx0XHRcdDwvcGF0aD5cXG5cdFx0XHRcdFx0XHQ8L3N2Zz5cXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdDxpbWcgc3JjPVxcXCJcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnNbJ2VtcHR5LWltYWdlJ10gfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwWydlbXB0eS1pbWFnZSddIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJlbXB0eS1pbWFnZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ2aWRlby13cmFwcGVyIGJ0blxcXCI+XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcInZpZGVvLWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImludGVyZmFjZSBmaXhlZFxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInByZXZpb3VzLWJ0biBkb3RzLWFycm93LWJ0biBidG5cXFwiPlxcblx0XHRcdDxzdmc+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHQ8L3N2Zz5cXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcIm5leHQtYnRuIGRvdHMtYXJyb3ctYnRuIGJ0blxcXCI+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdDwvc3ZnPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcblxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdDxkaXYgY2xhc3M9XFxcImNvbXBhc3Nlcy10ZXh0cy13cmFwcGVyXFxcIj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwiaW50ZXJmYWNlXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiZ28tY2FtcGFpZ24tYnRuIGRvdHMtcmVjdGFuZ2xlLWJ0biBidG5cXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImJ0bi10aXRsZVxcXCI+PC9kaXY+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0PC9zdmc+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiXHRcXG5cdFx0PHVsIGNsYXNzPSdwbGFuZXRzLW1lbnUnPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubW9iaWxlU2NvcGUgOiBkZXB0aDApLHtcIm5hbWVcIjpcImVhY2hcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDIsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcdFx0PC91bD5cXG5cXG5cIjtcbn0sXCIyXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHQ8bGkgaWQ9J1wiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pZCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImlkXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIic+XFxuXHRcdFx0XHRcdDxhIGhyZWY9J1wiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy51cmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwidXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIic+XFxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW1nLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0XHRcdFx0PGltZyBzcmM9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbWdzcmMgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltZ3NyYyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaW1nc3JjXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgYWx0PVxcXCJcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaWQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlkIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJpZFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHQ8L2E+XFxuXHRcdFx0XHQ8L2xpPlxcblwiO1xufSxcIjRcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXFxuXHRcdDxkaXYgY2xhc3M9XFxcInNsaWRlc2hvdy10aXRsZVxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwicGxhbmV0LXRpdGxlXFxcIj48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwbGFuZXQtbmFtZVxcXCI+PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJpbnRlcmZhY2VcXFwiPlxcblxcblx0XHRcdDxkaXYgaWQ9XFxcImxlZnRcXFwiIGNsYXNzPVxcXCJwcmV2aW91cy1hcmVhIGFyZWEtYnRuXFxcIj48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGlkPVxcXCJyaWdodFxcXCIgY2xhc3M9XFxcIm5leHQtYXJlYSBhcmVhLWJ0blxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBpZD1cXFwibWlkZGxlXFxcIiBjbGFzcz1cXFwibWlkZGxlLWFyZWEgYXJlYS1idG5cXFwiPjwvZGl2Plxcblxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInByZXZpb3VzLWJ0biBkb3RzLWFycm93LWJ0blxcXCI+XFxuXHRcdFx0XHQ8c3ZnPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHQ8L3N2Zz5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJuZXh0LWJ0biBkb3RzLWFycm93LWJ0blxcXCI+XFxuXHRcdFx0XHQ8c3ZnPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHQ8L3N2Zz5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCI8ZGl2IGNsYXNzPSdwYWdlLXdyYXBwZXInPlxcblxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzTW9iaWxlIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5wcm9ncmFtKDQsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuICAgIFx0XG5jbGFzcyBHbG9iYWxFdmVudHMge1xuXHRpbml0KCkge1xuXHRcdCQod2luZG93KS5vbigncmVzaXplJywgdGhpcy5yZXNpemUpXG5cdFx0JCh3aW5kb3cpLm9uKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlKVxuXHRcdEFwcFN0b3JlLk1vdXNlID0gbmV3IFBJWEkuUG9pbnQoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRBcHBBY3Rpb25zLndpbmRvd1Jlc2l6ZSh3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0KVxuXHR9XG5cdG9uTW91c2VNb3ZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRBcHBTdG9yZS5Nb3VzZS54ID0gZS5wYWdlWFxuXHRcdEFwcFN0b3JlLk1vdXNlLnkgPSBlLnBhZ2VZXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2xvYmFsRXZlbnRzXG4iLCJpbXBvcnQgb3AgZnJvbSAnb2JqZWN0cG9vbCdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBTcHJpbmdHYXJkZW4gZnJvbSAnU3ByaW5nR2FyZGVuJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb29sIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHR2YXIgcHhDb250YWluZXJOdW0gPSAyMCArIChwbGFuZXRzLmxlbmd0aCAqIDEpXG5cdFx0dmFyIGdyYXBoaWNzTnVtID0gKHBsYW5ldHMubGVuZ3RoICogMykgLSAyXG5cdFx0dmFyIHNwcml0ZXNOdW0gPSBwbGFuZXRzLmxlbmd0aFxuXHRcdHZhciBzcHJpbmdHYXJkZW5zTnVtID0gMTBcblxuXHRcdHRoaXMudGltZWxpbmVzID0gb3AuZ2VuZXJhdGUoVGltZWxpbmVNYXgsIHsgY291bnQ6IDIwIH0pXG5cdFx0dGhpcy5weENvbnRhaW5lcnMgPSBvcC5nZW5lcmF0ZShQSVhJLkNvbnRhaW5lciwgeyBjb3VudDogcHhDb250YWluZXJOdW0gfSlcblx0XHR0aGlzLmdyYXBoaWNzID0gb3AuZ2VuZXJhdGUoUElYSS5HcmFwaGljcywgeyBjb3VudDogZ3JhcGhpY3NOdW0gfSlcblx0XHR0aGlzLnNwcml0ZXMgPSBvcC5nZW5lcmF0ZShQSVhJLlNwcml0ZSwgeyBjb3VudDogc3ByaXRlc051bSB9KVxuXHRcdHRoaXMuc3ByaW5nR2FyZGVucyA9IG9wLmdlbmVyYXRlKFNwcmluZ0dhcmRlbiwgeyBjb3VudDogc3ByaW5nR2FyZGVuc051bSB9KVxuXHR9XG5cdGdldFRpbWVsaW5lKCkge1xuXHRcdHZhciB0bCA9IHRoaXMudGltZWxpbmVzLmdldCgpXG5cdFx0dGwua2lsbCgpXG5cdFx0dGwuY2xlYXIoKVxuXHRcdHJldHVybiB0bFxuXHR9XG5cdHJlbGVhc2VUaW1lbGluZShpdGVtKSB7XG5cdFx0aXRlbS5raWxsKClcblx0XHRpdGVtLmNsZWFyKClcblx0XHR0aGlzLnRpbWVsaW5lcy5yZWxlYXNlKGl0ZW0pXG5cdH1cblx0Z2V0Q29udGFpbmVyKCkge1xuXHRcdHZhciBjb250YWluZXIgPSB0aGlzLnB4Q29udGFpbmVycy5nZXQoKVxuXHRcdC8vIGNvbnNvbGUubG9nKCdnZXQgPj4+Pj4+Pj4+Pj4+Pj4+JywgY29udGFpbmVyKVxuXHRcdGNvbnRhaW5lci5zY2FsZS54ID0gMVxuXHRcdGNvbnRhaW5lci5zY2FsZS55ID0gMVxuXHRcdGNvbnRhaW5lci5wb3NpdGlvbi54ID0gMFxuXHRcdGNvbnRhaW5lci5wb3NpdGlvbi55ID0gMFxuXHRcdGNvbnRhaW5lci5za2V3LnggPSAwXG5cdFx0Y29udGFpbmVyLnNrZXcueSA9IDBcblx0XHRjb250YWluZXIucGl2b3QueCA9IDBcblx0XHRjb250YWluZXIucGl2b3QueSA9IDBcblx0XHRjb250YWluZXIucm90YXRpb24gPSAwXG5cdFx0Y29udGFpbmVyLmFscGhhID0gMVxuXHRcdHJldHVybiBjb250YWluZXJcblx0fVxuXHRyZWxlYXNlQ29udGFpbmVyKGl0ZW0pIHtcblx0XHQvLyBjb25zb2xlLmxvZygncmVsZWFzZSA8PDw8PDw8PDw8PDw8PCcsIGl0ZW0pXG5cdFx0dGhpcy5weENvbnRhaW5lcnMucmVsZWFzZShpdGVtKVxuXHR9XG5cdGdldEdyYXBoaWNzKCkge1xuXHRcdHZhciBnID0gdGhpcy5ncmFwaGljcy5nZXQoKVxuXHRcdGcuY2xlYXIoKVxuXHRcdGcuc2NhbGUueCA9IDFcblx0XHRnLnNjYWxlLnkgPSAxXG5cdFx0Zy5wb3NpdGlvbi54ID0gMFxuXHRcdGcucG9zaXRpb24ueSA9IDBcblx0XHRnLnNrZXcueCA9IDBcblx0XHRnLnNrZXcueSA9IDBcblx0XHRnLnBpdm90LnggPSAwXG5cdFx0Zy5waXZvdC55ID0gMFxuXHRcdGcucm90YXRpb24gPSAwXG5cdFx0cmV0dXJuIGdcblx0fVxuXHRyZWxlYXNlR3JhcGhpY3MoaXRlbSkge1xuXHRcdHRoaXMuZ3JhcGhpY3MucmVsZWFzZShpdGVtKVxuXHR9XG5cdGdldFNwcml0ZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zcHJpdGVzLmdldCgpXG5cdH1cblx0cmVsZWFzZVNwcml0ZShpdGVtKSB7XG5cdFx0dGhpcy5zcHJpdGVzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRTcHJpbmdHYXJkZW4oKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3ByaW5nR2FyZGVucy5nZXQoKVxuXHR9XG5cdHJlbGVhc2VTcHJpbmdHYXJkZW4oaXRlbSkge1xuXHRcdHRoaXMuc3ByaW5nR2FyZGVucy5yZWxlYXNlKGl0ZW0pXG5cdH1cbn1cbiIsImNsYXNzIFByZWxvYWRlciAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLnF1ZXVlID0gbmV3IGNyZWF0ZWpzLkxvYWRRdWV1ZSh0cnVlKVxuXHRcdHRoaXMucXVldWUub24oXCJjb21wbGV0ZVwiLCB0aGlzLm9uTWFuaWZlc3RMb2FkQ29tcGxldGVkLCB0aGlzKVxuXHRcdHRoaXMuY3VycmVudExvYWRlZENhbGxiYWNrID0gdW5kZWZpbmVkXG5cdH1cblx0bG9hZChtYW5pZmVzdCwgb25Mb2FkZWQpIHtcblx0XHR0aGlzLmN1cnJlbnRMb2FkZWRDYWxsYmFjayA9IG9uTG9hZGVkXG4gICAgICAgIHRoaXMucXVldWUubG9hZE1hbmlmZXN0KG1hbmlmZXN0KVxuXHR9XG5cdG9uTWFuaWZlc3RMb2FkQ29tcGxldGVkKCkge1xuXHRcdHRoaXMuY3VycmVudExvYWRlZENhbGxiYWNrKClcblx0fVxuXHRnZXRDb250ZW50QnlJZChpZCkge1xuXHRcdHJldHVybiB0aGlzLnF1ZXVlLmdldFJlc3VsdChpZClcblx0fVxuXHRnZXRTdmcoaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5nZXRDb250ZW50QnlJZChpZCtcIi1zdmdcIilcblx0fVxuXHRnZXRJbWFnZVVSTChpZCkge1xuXHRcdHJldHVybiB0aGlzLmdldENvbnRlbnRCeUlkKGlkKS5nZXRBdHRyaWJ1dGUoXCJzcmNcIilcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQcmVsb2FkZXJcbiIsImltcG9ydCBkYXRhIGZyb20gJ0dsb2JhbERhdGEnXG5pbXBvcnQgaGFzaGVyIGZyb20gJ2hhc2hlcidcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgY3Jvc3Nyb2FkcyBmcm9tICdjcm9zc3JvYWRzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5jbGFzcyBSb3V0ZXIge1xuXHRpbml0KCkge1xuXHRcdHRoaXMucm91dGluZyA9IGRhdGEucm91dGluZ1xuXHRcdHRoaXMuZGVmYXVsdFJvdXRlID0gdGhpcy5yb3V0aW5nWycvJ11cblx0XHR0aGlzLm5ld0hhc2hGb3VuZGVkID0gZmFsc2Vcblx0XHRoYXNoZXIubmV3SGFzaCA9IHVuZGVmaW5lZFxuXHRcdGhhc2hlci5vbGRIYXNoID0gdW5kZWZpbmVkXG5cdFx0aGFzaGVyLnByZXBlbmRIYXNoID0gJyEnXG5cdFx0aGFzaGVyLmluaXRpYWxpemVkLmFkZCh0aGlzLl9kaWRIYXNoZXJDaGFuZ2UuYmluZCh0aGlzKSlcblx0XHRoYXNoZXIuY2hhbmdlZC5hZGQodGhpcy5fZGlkSGFzaGVyQ2hhbmdlLmJpbmQodGhpcykpXG5cdFx0dGhpcy5fc2V0dXBDcm9zc3JvYWRzKClcblx0fVxuXHRiZWdpblJvdXRpbmcoKSB7XG5cdFx0aGFzaGVyLmluaXQoKVxuXHR9XG5cdF9zZXR1cENyb3Nzcm9hZHMoKSB7XG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHR2YXIgYmFzaWNTZWN0aW9uID0gY3Jvc3Nyb2Fkcy5hZGRSb3V0ZSgne3BhZ2V9JywgdGhpcy5fb25GaXJzdERlZ3JlZVVSTEhhbmRsZXIuYmluZCh0aGlzKSwgMylcblx0XHRiYXNpY1NlY3Rpb24ucnVsZXMgPSB7XG5cdCAgICAgICAgcGFnZSA6IFsnbGFuZGluZyddIC8vdmFsaWQgc2VjdGlvbnNcblx0ICAgIH1cblx0ICAgIHZhciBwbGFuZXRQcm9kdWN0U2VjdGlvbiA9IGNyb3Nzcm9hZHMuYWRkUm91dGUoJy9wbGFuZXQve3BsYW5ldElkfS97cHJvZHVjdElkfScsIHRoaXMuX29uUGxhbmV0UHJvZHVjdFVSTEhhbmRsZXIuYmluZCh0aGlzKSwgMilcblx0ICAgIHBsYW5ldFByb2R1Y3RTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgXHRwbGFuZXRJZDogcGxhbmV0cyxcblx0ICAgIFx0cHJvZHVjdElkIDogL15bMC01XS9cblx0ICAgIH1cblx0ICAgIHZhciBwbGFuZXRTZWN0aW9uID0gY3Jvc3Nyb2Fkcy5hZGRSb3V0ZSgnL3BsYW5ldC97cGxhbmV0SWR9JywgdGhpcy5fb25QbGFuZXRVUkxIYW5kbGVyLmJpbmQodGhpcyksIDIpXG5cdCAgICBwbGFuZXRTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgXHRwbGFuZXRJZDogcGxhbmV0c1xuXHQgICAgfVxuXHR9XG5cdF9vbkZpcnN0RGVncmVlVVJMSGFuZGxlcihwYWdlSWQpIHtcblx0XHR0aGlzLl9hc3NpZ25Sb3V0ZShwYWdlSWQpXG5cdH1cblx0X29uUGxhbmV0UHJvZHVjdFVSTEhhbmRsZXIocGxhbmV0SWQsIHByb2R1Y3RJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHByb2R1Y3RJZClcblx0fVxuXHRfb25QbGFuZXRVUkxIYW5kbGVyKHBsYW5ldElkKSB7XG5cdFx0dGhpcy5fYXNzaWduUm91dGUocGxhbmV0SWQpXG5cdH1cblx0X29uQmxvZ1Bvc3RVUkxIYW5kbGVyKHBvc3RJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHBvc3RJZClcblx0fVxuXHRfb25EZWZhdWx0VVJMSGFuZGxlcigpIHtcblx0XHR0aGlzLl9zZW5kVG9EZWZhdWx0KClcblx0fVxuXHRfYXNzaWduUm91dGUoaWQpIHtcblx0XHR2YXIgaGFzaCA9IGhhc2hlci5nZXRIYXNoKClcblx0XHR2YXIgcGFydHMgPSB0aGlzLl9nZXRVUkxQYXJ0cyhoYXNoKVxuXHRcdHRoaXMuX3VwZGF0ZVBhZ2VSb3V0ZShoYXNoLCBwYXJ0cywgcGFydHNbMF0sIGlkKVxuXHRcdHRoaXMubmV3SGFzaEZvdW5kZWQgPSB0cnVlXG5cdH1cblx0X2dldFVSTFBhcnRzKHVybCkge1xuXHRcdHZhciBoYXNoID0gdXJsXG5cdFx0aGFzaCA9IGhhc2guc3Vic3RyKDEpXG5cdFx0cmV0dXJuIGhhc2guc3BsaXQoJy8nKVxuXHR9XG5cdF91cGRhdGVQYWdlUm91dGUoaGFzaCwgcGFydHMsIHBhcmVudCwgdGFyZ2V0SWQpIHtcblx0XHRoYXNoZXIub2xkSGFzaCA9IGhhc2hlci5uZXdIYXNoXG5cdFx0aGFzaGVyLm5ld0hhc2ggPSB7XG5cdFx0XHRoYXNoOiBoYXNoLFxuXHRcdFx0cGFydHM6IHBhcnRzLFxuXHRcdFx0cGFyZW50OiBwYXJlbnQsXG5cdFx0XHR0YXJnZXRJZDogdGFyZ2V0SWRcblx0XHR9XG5cdFx0QXBwQWN0aW9ucy5wYWdlSGFzaGVyQ2hhbmdlZCgpXG5cdH1cblx0X2RpZEhhc2hlckNoYW5nZShuZXdIYXNoLCBvbGRIYXNoKSB7XG5cdFx0dGhpcy5uZXdIYXNoRm91bmRlZCA9IGZhbHNlXG5cdFx0Y3Jvc3Nyb2Fkcy5wYXJzZShuZXdIYXNoKVxuXHRcdGlmKHRoaXMubmV3SGFzaEZvdW5kZWQpIHJldHVyblxuXHRcdC8vIElmIFVSTCBkb24ndCBtYXRjaCBhIHBhdHRlcm4sIHNlbmQgdG8gZGVmYXVsdFxuXHRcdHRoaXMuX29uRGVmYXVsdFVSTEhhbmRsZXIoKVxuXHR9XG5cdF9zZW5kVG9EZWZhdWx0KCkge1xuXHRcdGhhc2hlci5zZXRIYXNoKEFwcFN0b3JlLmRlZmF1bHRSb3V0ZSgpKVxuXHR9XG5cdHN0YXRpYyBnZXRCYXNlVVJMKCkge1xuXHRcdHJldHVybiBkb2N1bWVudC5VUkwuc3BsaXQoXCIjXCIpWzBdXG5cdH1cblx0c3RhdGljIGdldEhhc2goKSB7XG5cdFx0cmV0dXJuIGhhc2hlci5nZXRIYXNoKClcblx0fVxuXHRzdGF0aWMgZ2V0Um91dGVzKCkge1xuXHRcdHJldHVybiBkYXRhLnJvdXRpbmdcblx0fVxuXHRzdGF0aWMgZ2V0TmV3SGFzaCgpIHtcblx0XHRyZXR1cm4gaGFzaGVyLm5ld0hhc2hcblx0fVxuXHRzdGF0aWMgZ2V0T2xkSGFzaCgpIHtcblx0XHRyZXR1cm4gaGFzaGVyLm9sZEhhc2hcblx0fVxuXHRzdGF0aWMgc2V0SGFzaChoYXNoKSB7XG5cdFx0aGFzaGVyLnNldEhhc2goaGFzaClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBSb3V0ZXJcbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG52YXIgVHJhbnNpdGlvbkFuaW1hdGlvbnMgPSB7XG5cblx0Ly8gRVhQRVJJRU5DRSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCdleHBlcmllbmNlLWluJzogZnVuY3Rpb24oc2NvcGUsIHRpbWVsaW5lKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMub2xkVHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHZhciBkaXJlY3Rpb24gPSAoQXBwU3RvcmUuZ2V0RXhwZXJpZW5jZUFuaW1hdGlvbkRpcmVjdGlvbigpID09IEFwcENvbnN0YW50cy5MRUZUKSA/IC0xIDogMVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeDp3aW5kb3dXKmRpcmVjdGlvbiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHg6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB4OndpbmRvd1cqZGlyZWN0aW9uLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeDowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdH0sXG5cdCdleHBlcmllbmNlLW91dCc6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGltZWxpbmUudG8od3JhcHBlciwgMSwgeyBvcGFjaXR5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHRcblx0XHRzd2l0Y2godHlwZXMubmV3VHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHZhciBkaXJlY3Rpb24gPSAoQXBwU3RvcmUuZ2V0RXhwZXJpZW5jZUFuaW1hdGlvbkRpcmVjdGlvbigpID09IEFwcENvbnN0YW50cy5MRUZUKSA/IC0xIDogMVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeDowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeDotd2luZG93VypkaXJlY3Rpb24sIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeDowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeDotd2luZG93VypkaXJlY3Rpb24sIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkNBTVBBSUdOOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0fSxcblxuXHQvLyBDQU1QQUlHTiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCdjYW1wYWlnbi1pbic6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMub2xkVHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0fSxcblx0J2NhbXBhaWduLW91dCc6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMubmV3VHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0fSxcblxuXHQvLyBMQU5ESU5HIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0J2xhbmRpbmctaW4nOiBmdW5jdGlvbihzY29wZSwgdGltZWxpbmUpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0c3dpdGNoKHR5cGVzLm9sZFR5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdH0sXG5cdCdsYW5kaW5nLW91dCc6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0c3dpdGNoKHR5cGVzLm5ld1R5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUudG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLnRvKHdyYXBwZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUudG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLnRvKHdyYXBwZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRyYW5zaXRpb25BbmltYXRpb25zXG4iLCJpbXBvcnQgQXBwRGlzcGF0Y2hlciBmcm9tICdBcHBEaXNwYXRjaGVyJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQge0V2ZW50RW1pdHRlcjJ9IGZyb20gJ2V2ZW50ZW1pdHRlcjInXG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nXG5pbXBvcnQgZGF0YSBmcm9tICdHbG9iYWxEYXRhJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5cbmZ1bmN0aW9uIF9nZXRQYWdlQ29udGVudCgpIHtcbiAgICB2YXIgc2NvcGUgPSBfZ2V0UGFnZUlkKClcbiAgICB2YXIgbGFuZ0NvbnRlbnQgPSBfZ2V0Q29udGVudEJ5TGFuZyhBcHBTdG9yZS5sYW5nKCkpXG4gICAgdmFyIHBhZ2VDb250ZW50ID0gbGFuZ0NvbnRlbnRbc2NvcGVdXG4gICAgcmV0dXJuIHBhZ2VDb250ZW50XG59XG5mdW5jdGlvbiBfZ2V0UGFnZUlkKCkge1xuICAgIHJldHVybiBfZ2V0Q29udGVudFNjb3BlKCkuaWRcbn1cbmZ1bmN0aW9uIF9nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKCkge1xuICAgIHZhciBuZXdIYXNoZXIgPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG4gICAgdmFyIG9sZEhhc2hlciA9IFJvdXRlci5nZXRPbGRIYXNoKClcbiAgICByZXR1cm4geyBuZXdUeXBlOiBfZ2V0VHlwZU9mUGFnZShuZXdIYXNoZXIpLCBvbGRUeXBlOiBfZ2V0VHlwZU9mUGFnZShvbGRIYXNoZXIpIH1cbn1cbmZ1bmN0aW9uIF9nZXRUeXBlT2ZQYWdlKGhhc2gpIHtcbiAgICB2YXIgaCA9IGhhc2ggfHwgUm91dGVyLmdldE5ld0hhc2goKVxuICAgIGlmKGggPT0gdW5kZWZpbmVkKSByZXR1cm4gQXBwQ29uc3RhbnRzLk5PTkVcbiAgICBpZihoLnBhcnRzLmxlbmd0aCA9PSAzKSByZXR1cm4gQXBwQ29uc3RhbnRzLkNBTVBBSUdOXG4gICAgZWxzZSBpZihoLnBhcnRzLmxlbmd0aCA9PSAyKSByZXR1cm4gQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0VcbiAgICBlbHNlIHJldHVybiBBcHBDb25zdGFudHMuTEFORElOR1xufVxuZnVuY3Rpb24gX2dldENvbnRlbnRTY29wZSgpIHtcbiAgICB2YXIgaGFzaE9iaiA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICB2YXIgcm91dGVTY29wZTtcbiAgICBpZihoYXNoT2JqLnBhcnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgdmFyIHBhcmVudFBhdGggPSBoYXNoT2JqLmhhc2gucmVwbGFjZSgnLycraGFzaE9iai50YXJnZXRJZCwgJycpXG4gICAgICAgIHJvdXRlU2NvcGUgPSBBcHBTdG9yZS5nZXRSb3V0ZVBhdGhTY29wZUJ5SWQocGFyZW50UGF0aClcbiAgICB9ZWxzZXtcbiAgICAgICAgcm91dGVTY29wZSA9IEFwcFN0b3JlLmdldFJvdXRlUGF0aFNjb3BlQnlJZChoYXNoT2JqLmhhc2gpXG4gICAgfVxuICAgIHJldHVybiByb3V0ZVNjb3BlXG59XG5mdW5jdGlvbiBfZ2V0UGFnZUFzc2V0c1RvTG9hZCgpIHtcbiAgICB2YXIgc2NvcGUgPSBfZ2V0Q29udGVudFNjb3BlKClcbiAgICB2YXIgaGFzaE9iaiA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICB2YXIgdGFyZ2V0SWQ7XG4gICAgdmFyIHR5cGUgPSBfZ2V0VHlwZU9mUGFnZSgpXG4gICAgdGFyZ2V0SWQgPSB0eXBlLnRvTG93ZXJDYXNlKCkgKyAnLWFzc2V0cydcbiAgICB2YXIgbWFuaWZlc3QgPSBfYWRkQmFzZVBhdGhzVG9VcmxzKHNjb3BlW3RhcmdldElkXSwgc2NvcGUuaWQsIHRhcmdldElkLCB0eXBlKVxuICAgIHJldHVybiBtYW5pZmVzdFxufVxuZnVuY3Rpb24gX2FkZEJhc2VQYXRoc1RvVXJscyh1cmxzLCBwYWdlSWQsIHRhcmdldElkLCB0eXBlKSB7XG4gICAgdmFyIGJhc2VQYXRoID0gX2dldFBhZ2VBc3NldHNCYXNlUGF0aEJ5SWQocGFnZUlkLCB0YXJnZXRJZClcbiAgICB2YXIgbWFuaWZlc3QgPSBbXVxuICAgIGlmKHVybHMgPT0gdW5kZWZpbmVkIHx8IHVybHMubGVuZ3RoIDwgMSkgcmV0dXJuIG1hbmlmZXN0XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB1cmxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzcGxpdHRlciA9IHVybHNbaV0uc3BsaXQoJy4nKVxuICAgICAgICB2YXIgZmlsZU5hbWUgPSBzcGxpdHRlclswXVxuICAgICAgICB2YXIgZXh0ZW5zaW9uID0gc3BsaXR0ZXJbMV1cbiAgICAgICAgbWFuaWZlc3RbaV0gPSB7XG4gICAgICAgICAgICBpZDogcGFnZUlkICsgJy0nICsgdHlwZS50b0xvd2VyQ2FzZSgpICsgJy0nICsgZmlsZU5hbWUsXG4gICAgICAgICAgICBzcmM6IGJhc2VQYXRoICsgZmlsZU5hbWUgKyAnLicgKyBleHRlbnNpb25cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWFuaWZlc3Rcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlQXNzZXRzQmFzZVBhdGhCeUlkKGlkLCBhc3NldEdyb3VwSWQpIHtcbiAgICByZXR1cm4gQXBwU3RvcmUuYmFzZU1lZGlhUGF0aCgpICsgJy9pbWFnZS9wbGFuZXRzLycgKyBpZCArICcvJyArIGFzc2V0R3JvdXBJZCArICcvJ1xufVxuZnVuY3Rpb24gX2dldE1lbnVDb250ZW50KCkge1xuICAgIHJldHVybiBkYXRhLm1lbnVcbn1cbmZ1bmN0aW9uIF9nZXRDb250ZW50QnlMYW5nKGxhbmcpIHtcbiAgICByZXR1cm4gZGF0YS5sYW5nW2xhbmddXG59XG5mdW5jdGlvbiBfZ2V0R2VuZXJhbEluZm9zKCkge1xuICAgIHJldHVybiBkYXRhLmluZm9zLmxhbmdbQXBwU3RvcmUubGFuZygpXVxufVxuZnVuY3Rpb24gX2dldEFwcERhdGEoKSB7XG4gICAgcmV0dXJuIGRhdGFcbn1cbmZ1bmN0aW9uIF9nZXREZWZhdWx0Um91dGUoKSB7XG4gICAgcmV0dXJuIGRhdGFbJ2RlZmF1bHQtcm91dGUnXVxufVxuZnVuY3Rpb24gX2dldEdsb2JhbENvbnRlbnQoKSB7XG4gICAgdmFyIGxhbmdDb250ZW50ID0gX2dldENvbnRlbnRCeUxhbmcoQXBwU3RvcmUubGFuZygpKVxuICAgIHJldHVybiBsYW5nQ29udGVudFsnZ2xvYmFsJ11cbn1cbmZ1bmN0aW9uIF93aW5kb3dXaWR0aEhlaWdodCgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB3OiB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgaDogd2luZG93LmlubmVySGVpZ2h0XG4gICAgfVxufVxudmFyIEFwcFN0b3JlID0gYXNzaWduKHt9LCBFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSwge1xuICAgIGVtaXRDaGFuZ2U6IGZ1bmN0aW9uKHR5cGUsIGl0ZW0pIHtcbiAgICAgICAgdGhpcy5lbWl0KHR5cGUsIGl0ZW0pXG4gICAgfSxcbiAgICBwYWdlQ29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0UGFnZUNvbnRlbnQoKVxuICAgIH0sXG4gICAgbWVudUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldE1lbnVDb250ZW50KClcbiAgICB9LFxuICAgIGNvdW50cmllczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmNvdW50cmllc1xuICAgIH0sXG4gICAgYXBwRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0QXBwRGF0YSgpXG4gICAgfSxcbiAgICBsYW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEpTX2xhbmdcbiAgICB9LFxuICAgIGRlZmF1bHRSb3V0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0RGVmYXVsdFJvdXRlKClcbiAgICB9LFxuICAgIGdsb2JhbENvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldEdsb2JhbENvbnRlbnQoKVxuICAgIH0sXG4gICAgZ2VuZXJhbEluZm9zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuaW5mb3NcbiAgICB9LFxuICAgIGdlbmVyYWxJbmZvc0xhbmdTY29wZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0R2VuZXJhbEluZm9zKClcbiAgICB9LFxuICAgIGdldEVtcHR5SW1nVXJsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLmdldEVudmlyb25tZW50KCkuc3RhdGljICsgJ2ltYWdlL2VtcHR5LnBuZydcbiAgICB9LFxuICAgIG1haW5JbWFnZVVybDogZnVuY3Rpb24oaWQsIHJlc3BvbnNpdmVBcnJheSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuYmFzZU1lZGlhUGF0aCgpICsgJ2ltYWdlL3BsYW5ldHMvJyArIGlkICsgJy9tYWluLScgKyBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VXaWR0aChyZXNwb25zaXZlQXJyYXkpICsgJy5qcGcnXG4gICAgfSxcbiAgICBiYXNlTWVkaWFQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLmdldEVudmlyb25tZW50KCkuc3RhdGljXG4gICAgfSxcbiAgICBnZXRSb3V0ZVBhdGhTY29wZUJ5SWQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiBkYXRhLnJvdXRpbmdbaWRdXG4gICAgfSxcbiAgICBnZXRQYWdlSWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldFBhZ2VJZCgpXG4gICAgfSxcbiAgICBnZXRUeXBlT2ZOZXdBbmRPbGRQYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcbiAgICB9LFxuICAgIGdldFR5cGVPZlBhZ2U6IGZ1bmN0aW9uKGhhc2gpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRUeXBlT2ZQYWdlKGhhc2gpXG4gICAgfSxcbiAgICBnZXRFbnZpcm9ubWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBDb25zdGFudHMuRU5WSVJPTk1FTlRTW0VOVl1cbiAgICB9LFxuICAgIGdldExpbmVXaWR0aDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAyXG4gICAgfSxcbiAgICBwYWdlQXNzZXRzVG9Mb2FkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRQYWdlQXNzZXRzVG9Mb2FkKClcbiAgICB9LFxuICAgIGdldEV4cGVyaWVuY2VBbmltYXRpb25EaXJlY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbmV3SGFzaGVyID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgICAgICB2YXIgb2xkSGFzaGVyID0gUm91dGVyLmdldE9sZEhhc2goKVxuICAgICAgICBpZihvbGRIYXNoZXIgPT0gdW5kZWZpbmVkKSByZXR1cm4gQXBwQ29uc3RhbnRzLlJJR0hUXG4gICAgICAgIHZhciBuZXdJZCA9IG5ld0hhc2hlci50YXJnZXRJZFxuICAgICAgICB2YXIgb2xkSWQgPSBvbGRIYXNoZXIudGFyZ2V0SWRcbiAgICAgICAgdmFyIG5ld0luZGV4LCBvbGRJbmRleDtcbiAgICAgICAgdmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGxhbmV0ID0gcGxhbmV0c1tpXVxuICAgICAgICAgICAgaWYocGxhbmV0ID09IG5ld0lkKSBuZXdJbmRleCA9IGlcbiAgICAgICAgICAgIGlmKHBsYW5ldCA9PSBvbGRJZCkgb2xkSW5kZXggPSBpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChuZXdJbmRleCA+IG9sZEluZGV4KSA/IEFwcENvbnN0YW50cy5SSUdIVCA6ICBBcHBDb25zdGFudHMuTEVGVFxuICAgIH0sXG4gICAgcmVzcG9uc2l2ZUltYWdlV2lkdGg6IGZ1bmN0aW9uKHJlc3BvbnNpdmVBcnJheSkge1xuICAgICAgICB2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG4gICAgICAgIC8vIHZhciBzY2FsZSA9ICh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA9PSB1bmRlZmluZWQpID8gMSA6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvXG4gICAgICAgIHZhciBzY2FsZSA9IDFcbiAgICAgICAgcmV0dXJuIFV0aWxzLkNsb3Nlc3QocmVzcG9uc2l2ZUFycmF5LCB3aW5kb3dXICogc2NhbGUpXG4gICAgfSxcbiAgICByZXNwb25zaXZlSW1hZ2VTaXplOiBmdW5jdGlvbihyZXNwb25zaXZlQXJyYXksIGJhc2VXaWR0aCwgYmFzZUhlaWdodCkge1xuICAgICAgICB2YXIgYmFzZVcgPSBiYXNlV2lkdGggfHwgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9XXG4gICAgICAgIHZhciBiYXNlSCA9IGJhc2VIZWlnaHQgfHwgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9IXG4gICAgICAgIHZhciByZXNwb25zaXZlV2lkdGggPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VXaWR0aChyZXNwb25zaXZlQXJyYXkpXG4gICAgICAgIHZhciBzY2FsZSA9IChyZXNwb25zaXZlV2lkdGggLyBiYXNlVykgKiAxXG4gICAgICAgIHZhciByZXNwb25zaXZlSGVpZ2h0ID0gYmFzZUggKiBzY2FsZVxuICAgICAgICByZXR1cm4gWyByZXNwb25zaXZlV2lkdGgsIHJlc3BvbnNpdmVIZWlnaHQgXVxuICAgIH0sXG4gICAgcmVzcG9uc2l2ZVBvc3RlckltYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlc3BvbnNpdmVXID0gQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlV2lkdGgoQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpXG4gICAgICAgIHN3aXRjaChyZXNwb25zaXZlVykge1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRVswXTogcmV0dXJuIFwiTFwiXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFWzFdOiByZXR1cm4gXCJNXCJcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0VbMl06IHJldHVybiBcIlNcIlxuICAgICAgICB9XG4gICAgfSxcbiAgICBwbGFuZXRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEucGxhbmV0c1xuICAgIH0sXG4gICAgZ2V0TmV4dFBsYW5ldDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcbiAgICAgICAgdmFyIG5leHRQbGFuZXRJZDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGxhbmV0ID0gcGxhbmV0c1tpXVxuICAgICAgICAgICAgaWYocGxhbmV0ID09IGlkKSB7XG4gICAgICAgICAgICAgICAgbmV4dFBsYW5ldElkID0gcGxhbmV0c1tpKzFdIFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gKG5leHRQbGFuZXRJZCA9PSB1bmRlZmluZWQpID8gcGxhbmV0c1swXSA6IG5leHRQbGFuZXRJZFxuICAgIH0sXG4gICAgZ2V0UHJldmlvdXNQbGFuZXQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG4gICAgICAgIHZhciBwcmV2aW91c1BsYW5ldElkO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwbGFuZXQgPSBwbGFuZXRzW2ldXG4gICAgICAgICAgICBpZihwbGFuZXQgPT0gaWQpIHtcbiAgICAgICAgICAgICAgICBwcmV2aW91c1BsYW5ldElkID0gcGxhbmV0c1tpLTFdIFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gKHByZXZpb3VzUGxhbmV0SWQgPT0gdW5kZWZpbmVkKSA/IHBsYW5ldHNbcGxhbmV0cy5sZW5ndGgtMV0gOiBwcmV2aW91c1BsYW5ldElkXG4gICAgfSxcbiAgICBlbGVtZW50c09mTmF0dXJlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuZWxlbWVudHNcbiAgICB9LFxuICAgIGFsbEdlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmdlbmRlclxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGFbJ3Byb2R1Y3RzLWRhdGEnXVxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhQnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGEoKVxuICAgICAgICByZXR1cm4gZGF0YVtpZF1cbiAgICB9LFxuICAgIHBhbGV0dGVDb2xvcnNCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gZGF0YVsnY29sb3JzJ11baWRdXG4gICAgfSxcbiAgICBnZXRTcGVjaWZpY1Byb2R1Y3RCeUlkOiBmdW5jdGlvbihwbGFuZXRJZCwgcHJvZHVjdElkKSB7XG4gICAgICAgIHZhciBwbGFuZXRQcm9kdWN0cyA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQocGxhbmV0SWQpXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0UHJvZHVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKHByb2R1Y3RJZCA9PSBwbGFuZXRQcm9kdWN0c1tpXS5pZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwbGFuZXRQcm9kdWN0c1tpXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBXaW5kb3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX3dpbmRvd1dpZHRoSGVpZ2h0KClcbiAgICB9LFxuICAgIGFkZFBYQ2hpbGQ6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgQXBwU3RvcmUuUFhDb250YWluZXIuYWRkKGl0ZW0uY2hpbGQpXG4gICAgfSxcbiAgICByZW1vdmVQWENoaWxkOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIEFwcFN0b3JlLlBYQ29udGFpbmVyLnJlbW92ZShpdGVtLmNoaWxkKVxuICAgIH0sXG4gICAgZ2V0VGltZWxpbmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5nZXRUaW1lbGluZSgpXG4gICAgfSxcbiAgICByZWxlYXNlVGltZWxpbmU6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVRpbWVsaW5lKGl0ZW0pXG4gICAgfSxcbiAgICBnZXRDb250YWluZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5nZXRDb250YWluZXIoKVxuICAgIH0sXG4gICAgcmVsZWFzZUNvbnRhaW5lcjogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlQ29udGFpbmVyKGl0ZW0pXG4gICAgfSxcbiAgICBnZXRHcmFwaGljczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldEdyYXBoaWNzKClcbiAgICB9LFxuICAgIHJlbGVhc2VHcmFwaGljczogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlR3JhcGhpY3MoaXRlbSlcbiAgICB9LFxuICAgIGdldFNwcml0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldFNwcml0ZSgpXG4gICAgfSxcbiAgICByZWxlYXNlU3ByaXRlOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VTcHJpdGUoaXRlbSlcbiAgICB9LFxuICAgIGdldFNwcmluZ0dhcmRlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldFNwcmluZ0dhcmRlbigpXG4gICAgfSxcbiAgICByZWxlYXNlU3ByaW5nR2FyZGVuOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VTcHJpbmdHYXJkZW4oaXRlbSlcbiAgICB9LFxuICAgIERldGVjdG9yOiB7XG4gICAgICAgIGlzTW9iaWxlOiB1bmRlZmluZWRcbiAgICB9LFxuICAgIFBvb2w6IHVuZGVmaW5lZCxcbiAgICBQcmVsb2FkZXI6IHVuZGVmaW5lZCxcbiAgICBNb3VzZTogdW5kZWZpbmVkLFxuICAgIFBYQ29udGFpbmVyOiB1bmRlZmluZWQsXG4gICAgT3JpZW50YXRpb246IEFwcENvbnN0YW50cy5MQU5EU0NBUEUsXG4gICAgZGlzcGF0Y2hlckluZGV4OiBBcHBEaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpe1xuICAgICAgICB2YXIgYWN0aW9uID0gcGF5bG9hZC5hY3Rpb25cbiAgICAgICAgc3dpdGNoKGFjdGlvbi5hY3Rpb25UeXBlKSB7XG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VEOlxuXG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGNhdGNoIHRoZSBpbnRlcm5hbCBoYXNoIGNoYW5nZSBmb3IgdGhlIDMgcGFydHMgcGFnZXMgZXguIC9wbGFuZXQvd29vZC8wXG4gICAgICAgICAgICAgICAgdmFyIG5ld0hhc2hlciA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICAgICAgICAgICAgICB2YXIgb2xkSGFzaGVyID0gUm91dGVyLmdldE9sZEhhc2goKVxuICAgICAgICAgICAgICAgIHZhciBhY3Rpb25UeXBlID0gQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRURcbiAgICAgICAgICAgICAgICBpZihvbGRIYXNoZXIgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmKG5ld0hhc2hlci5wYXJ0cy5sZW5ndGggPT0gMyAmJiBvbGRIYXNoZXIucGFydHMubGVuZ3RoID09IDMgJiYgbmV3SGFzaGVyLnBhcnRzWzFdID09IG9sZEhhc2hlci5wYXJ0c1sxXSkge1xuICAgICAgICAgICAgICAgICAgICBpZihuZXdIYXNoZXIucGFydHMubGVuZ3RoID09IDMgJiYgb2xkSGFzaGVyLnBhcnRzLmxlbmd0aCA9PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25UeXBlID0gQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFOlxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy53ID0gYWN0aW9uLml0ZW0ud2luZG93V1xuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy5oID0gYWN0aW9uLml0ZW0ud2luZG93SFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLk9yaWVudGF0aW9uID0gKEFwcFN0b3JlLldpbmRvdy53ID4gQXBwU3RvcmUuV2luZG93LmgpID8gQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSA6IEFwcENvbnN0YW50cy5QT1JUUkFJVFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9JU19SRUFEWTpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5QWENvbnRhaW5lciA9IGFjdGlvbi5pdGVtXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb24uYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0FERF9DSElMRDpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5hZGRQWENoaWxkKGFjdGlvbi5pdGVtKVxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQ6XG4gICAgICAgICAgICAgICAgQXBwU3RvcmUucmVtb3ZlUFhDaGlsZChhY3Rpb24uaXRlbSlcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5lbWl0Q2hhbmdlKGFjdGlvbi5hY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH0pXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IEFwcFN0b3JlXG5cbiIsImltcG9ydCBpcyBmcm9tICdpcyc7XG5cbmZ1bmN0aW9uIGdldEFsbE1ldGhvZHMob2JqKSB7XG5cdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopXG5cdFx0LmZpbHRlcihrZXkgPT4gaXMuZm4ob2JqW2tleV0pKVxufVxuXG5mdW5jdGlvbiBhdXRvQmluZChvYmopIHtcblx0Ly8gY29uc29sZS5sb2coJ29iaiAtLS0tLScsIG9iailcbiAgXHRnZXRBbGxNZXRob2RzKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG5cdFx0LmZvckVhY2gobXRkID0+IHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKG10ZClcblx0XHRcdG9ialttdGRdID0gb2JqW210ZF0uYmluZChvYmopO1xuXHRcdH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGF1dG9CaW5kOyIsImltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5jbGFzcyBVdGlscyB7XG5cdHN0YXRpYyBOb3JtYWxpemVNb3VzZUNvb3JkcyhlLCBvYmpXcmFwcGVyKSB7XG5cdFx0dmFyIHBvc3ggPSAwO1xuXHRcdHZhciBwb3N5ID0gMDtcblx0XHRpZiAoIWUpIHZhciBlID0gd2luZG93LmV2ZW50O1xuXHRcdGlmIChlLnBhZ2VYIHx8IGUucGFnZVkpIFx0e1xuXHRcdFx0cG9zeCA9IGUucGFnZVg7XG5cdFx0XHRwb3N5ID0gZS5wYWdlWTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoZS5jbGllbnRYIHx8IGUuY2xpZW50WSkgXHR7XG5cdFx0XHRwb3N4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0XG5cdFx0XHRcdCsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XG5cdFx0XHRwb3N5ID0gZS5jbGllbnRZICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3Bcblx0XHRcdFx0KyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuXHRcdH1cblx0XHRvYmpXcmFwcGVyLnggPSBwb3N4XG5cdFx0b2JqV3JhcHBlci55ID0gcG9zeVxuXHRcdHJldHVybiBvYmpXcmFwcGVyXG5cdH1cblx0c3RhdGljIFJlc2l6ZVBvc2l0aW9uUHJvcG9ydGlvbmFsbHkod2luZG93Vywgd2luZG93SCwgY29udGVudFcsIGNvbnRlbnRILCBvcmllbnRhdGlvbikge1xuXHRcdHZhciBhc3BlY3RSYXRpbyA9IGNvbnRlbnRXIC8gY29udGVudEhcblxuXHRcdGlmKG9yaWVudGF0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmKG9yaWVudGF0aW9uID09IEFwcENvbnN0YW50cy5MQU5EU0NBUEUpIHtcblx0XHRcdFx0dmFyIHNjYWxlID0gKHdpbmRvd1cgLyBjb250ZW50VykgKiAxXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dmFyIHNjYWxlID0gKHdpbmRvd0ggLyBjb250ZW50SCkgKiAxXG5cdFx0XHR9XG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgc2NhbGUgPSAoKHdpbmRvd1cgLyB3aW5kb3dIKSA8IGFzcGVjdFJhdGlvKSA/ICh3aW5kb3dIIC8gY29udGVudEgpICogMSA6ICh3aW5kb3dXIC8gY29udGVudFcpICogMVxuXHRcdH1cblxuXHRcdHZhciBuZXdXID0gY29udGVudFcgKiBzY2FsZVxuXHRcdHZhciBuZXdIID0gY29udGVudEggKiBzY2FsZVxuXHRcdHZhciBjc3MgPSB7XG5cdFx0XHR3aWR0aDogbmV3Vyxcblx0XHRcdGhlaWdodDogbmV3SCxcblx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKG5ld1cgPj4gMSksXG5cdFx0XHR0b3A6ICh3aW5kb3dIID4+IDEpIC0gKG5ld0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcih3aW5kb3dXLCB3aW5kb3dILCBjb250ZW50VywgY29udGVudEgpIHtcblx0XHR2YXIgYXNwZWN0UmF0aW8gPSBjb250ZW50VyAvIGNvbnRlbnRIXG5cdFx0dmFyIHNjYWxlID0gKCh3aW5kb3dXIC8gd2luZG93SCkgPCBhc3BlY3RSYXRpbykgPyAod2luZG93SCAvIGNvbnRlbnRIKSAqIDEgOiAod2luZG93VyAvIGNvbnRlbnRXKSAqIDFcblx0XHR2YXIgbmV3VyA9IGNvbnRlbnRXICogc2NhbGVcblx0XHR2YXIgbmV3SCA9IGNvbnRlbnRIICogc2NhbGVcblx0XHR2YXIgY3NzID0ge1xuXHRcdFx0d2lkdGg6IG5ld1csXG5cdFx0XHRoZWlnaHQ6IG5ld0gsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSxcblx0XHRcdHRvcDogKHdpbmRvd0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSYW5kKG1pbiwgbWF4KSB7XG5cdFx0cmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pblxuXHR9XG5cdHN0YXRpYyBEZWdyZWVzVG9SYWRpYW5zKGRlZ3JlZXMpIHtcblx0XHRyZXR1cm4gZGVncmVlcyAqIChNYXRoLlBJIC8gMTgwKVxuXHR9XG4gICAgc3RhdGljIFJhZGlhbnNUb0RlZ3JlZXMocmFkaWFucykge1xuICAgICAgICByZXR1cm4gcmFkaWFucyAqICgxODAgLyBNYXRoLlBJKVxuICAgIH1cbiAgICBzdGF0aWMgTGltaXQodiwgbWluLCBtYXgpIHtcbiAgICBcdHJldHVybiAoTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHYpKSk7XG4gICAgfVxuXHRzdGF0aWMgQ2xvc2VzdChhcnJheSwgbnVtKSB7XG4gICAgICAgIHZhciBpPTA7XG5cdCAgICB2YXIgbWluRGlmZj0yMDAwO1xuXHQgICAgdmFyIGFucztcblx0ICAgIGZvcihpIGluIGFycmF5KXtcblx0XHRcdHZhciBtPU1hdGguYWJzKG51bS1hcnJheVtpXSk7XG5cdFx0XHRpZihtPG1pbkRpZmYpeyBcblx0XHRcdFx0bWluRGlmZj1tOyBcblx0XHRcdFx0YW5zPWFycmF5W2ldOyBcblx0XHRcdH1cblx0XHR9XG5cdCAgICByZXR1cm4gYW5zO1xuICAgIH1cbiAgICBzdGF0aWMgU3R5bGUoZGl2LCBzdHlsZSkge1xuICAgIFx0ZGl2LnN0eWxlLndlYmtpdFRyYW5zZm9ybSA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLm1velRyYW5zZm9ybSAgICA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLm1zVHJhbnNmb3JtICAgICA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLm9UcmFuc2Zvcm0gICAgICA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLnRyYW5zZm9ybSAgICAgICA9IHN0eWxlXG4gICAgfVxuICAgIHN0YXRpYyBUcmFuc2xhdGUoZGl2LCB4LCB5LCB6KSB7XG4gICAgXHRVdGlscy5TdHlsZShkaXYsICd0cmFuc2xhdGUzZCgnK3grJ3B4LCcreSsncHgsJyt6KydweCknKVxuICAgIH1cbiAgICBzdGF0aWMgVVVJRCgpIHtcblx0XHRmdW5jdGlvbiBzNCgpIHtcblx0XHRcdHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxuXHRcdFx0XHQudG9TdHJpbmcoMTYpXG5cdFx0XHRcdC5zdWJzdHJpbmcoMSk7XG5cdFx0fVxuXHRcdHJldHVybiBzNCgpICsgczQoKTtcblx0fVxuICAgIHN0YXRpYyBTcHJpbmdUbyhpdGVtLCB0b1gsIHRvWSwgaW5kZXgsIHNwcmluZywgZnJpY3Rpb24sIHNwcmluZ0xlbmd0aCkge1xuICAgIFx0dmFyIGR4ID0gdG9YIC0gaXRlbS54XG4gICAgXHR2YXIgZHkgPSB0b1kgLSBpdGVtLnlcblx0XHR2YXIgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeClcblx0XHR2YXIgdGFyZ2V0WCA9IHRvWCAtIE1hdGguY29zKGFuZ2xlKSAqIChzcHJpbmdMZW5ndGggKiBpbmRleClcblx0XHR2YXIgdGFyZ2V0WSA9IHRvWSAtIE1hdGguc2luKGFuZ2xlKSAqIChzcHJpbmdMZW5ndGggKiBpbmRleClcblx0XHRpdGVtLnZ4ICs9ICh0YXJnZXRYIC0gaXRlbS54KSAqIHNwcmluZ1xuXHRcdGl0ZW0udnkgKz0gKHRhcmdldFkgLSBpdGVtLnkpICogc3ByaW5nXG5cdFx0aXRlbS52eCAqPSBmcmljdGlvblxuXHRcdGl0ZW0udnkgKj0gZnJpY3Rpb25cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFV0aWxzXG4iLCJjbGFzcyBWZWMyIHtcblx0Y29uc3RydWN0b3IoeCwgeSkge1xuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0ZGlzdGFuY2VUbyh2KSB7XG5cdFx0cmV0dXJuIE1hdGguc3FydCggdGhpcy5kaXN0YW5jZVRvU3F1YXJlZCggdiApIClcblx0fVxuXHRkaXN0YW5jZVRvU3F1YXJlZCh2KSB7XG5cdFx0dmFyIGR4ID0gdGhpcy54IC0gdi54LCBkeSA9IHRoaXMueSAtIHYueTtcblx0XHRyZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmVjMlxuIiwiLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cbi8vIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcbiBcbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcbiBcbi8vIE1JVCBsaWNlbnNlXG4gXG4oZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB2YXIgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XG4gICAgZm9yKHZhciB4ID0gMDsgeCA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK3gpIHtcbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ10gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2ZW5kb3JzW3hdKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICB9XG4gXG4gICAgaWYgKCF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2ssIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciBjdXJyVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgdmFyIHRpbWVUb0NhbGwgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyVGltZSAtIGxhc3RUaW1lKSk7XG4gICAgICAgICAgICB2YXIgaWQgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soY3VyclRpbWUgKyB0aW1lVG9DYWxsKTsgfSwgXG4gICAgICAgICAgICAgIHRpbWVUb0NhbGwpO1xuICAgICAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH07XG4gXG4gICAgaWYgKCF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXG4gICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xuICAgICAgICB9O1xufSgpKTsiLCJpbXBvcnQgRmx1eCBmcm9tICdmbHV4J1xuaW1wb3J0IHtFdmVudEVtaXR0ZXIyfSBmcm9tICdldmVudGVtaXR0ZXIyJ1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJ1xuXG4vLyBBY3Rpb25zXG52YXIgUGFnZXJBY3Rpb25zID0ge1xuICAgIG9uUGFnZVJlYWR5OiBmdW5jdGlvbihoYXNoKSB7XG4gICAgICAgIFBhZ2VyRGlzcGF0Y2hlci5oYW5kbGVQYWdlckFjdGlvbih7XG4gICAgICAgIFx0dHlwZTogUGFnZXJDb25zdGFudHMuUEFHRV9JU19SRUFEWSxcbiAgICAgICAgXHRpdGVtOiBoYXNoXG4gICAgICAgIH0pICBcbiAgICB9LFxuICAgIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICBcdFBhZ2VyRGlzcGF0Y2hlci5oYW5kbGVQYWdlckFjdGlvbih7XG4gICAgICAgIFx0dHlwZTogUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURSxcbiAgICAgICAgXHRpdGVtOiB1bmRlZmluZWRcbiAgICAgICAgfSkgIFxuICAgIH0sXG4gICAgcGFnZVRyYW5zaXRpb25EaWRGaW5pc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICBQYWdlckRpc3BhdGNoZXIuaGFuZGxlUGFnZXJBY3Rpb24oe1xuICAgICAgICBcdHR5cGU6IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNILFxuICAgICAgICBcdGl0ZW06IHVuZGVmaW5lZFxuICAgICAgICB9KSAgXG4gICAgfVxufVxuXG4vLyBDb25zdGFudHNcbnZhciBQYWdlckNvbnN0YW50cyA9IHtcblx0UEFHRV9JU19SRUFEWTogJ1BBR0VfSVNfUkVBRFknLFxuXHRQQUdFX1RSQU5TSVRJT05fSU46ICdQQUdFX1RSQU5TSVRJT05fSU4nLFxuXHRQQUdFX1RSQU5TSVRJT05fT1VUOiAnUEFHRV9UUkFOU0lUSU9OX09VVCcsXG5cdFBBR0VfVFJBTlNJVElPTl9PVVRfQ09NUExFVEU6ICdQQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFJyxcblx0UEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTOiAnUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTJyxcblx0UEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0g6ICdQQUdFX1RSQU5TSVRJT05fRElEX0ZJTklTSCcsXG59XG5cbi8vIERpc3BhdGNoZXJcbnZhciBQYWdlckRpc3BhdGNoZXIgPSBhc3NpZ24obmV3IEZsdXguRGlzcGF0Y2hlcigpLCB7XG5cdGhhbmRsZVBhZ2VyQWN0aW9uOiBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHR0aGlzLmRpc3BhdGNoKGFjdGlvbilcblx0fVxufSlcblxuLy8gU3RvcmVcbnZhciBQYWdlclN0b3JlID0gYXNzaWduKHt9LCBFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSwge1xuICAgIGZpcnN0UGFnZVRyYW5zaXRpb246IHRydWUsXG4gICAgcGFnZVRyYW5zaXRpb25TdGF0ZTogdW5kZWZpbmVkLCBcbiAgICBkaXNwYXRjaGVySW5kZXg6IFBhZ2VyRGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKXtcbiAgICAgICAgdmFyIGFjdGlvblR5cGUgPSBwYXlsb2FkLnR5cGVcbiAgICAgICAgdmFyIGl0ZW0gPSBwYXlsb2FkLml0ZW1cbiAgICAgICAgc3dpdGNoKGFjdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgUGFnZXJDb25zdGFudHMuUEFHRV9JU19SRUFEWTpcbiAgICAgICAgICAgIFx0UGFnZXJTdG9yZS5wYWdlVHJhbnNpdGlvblN0YXRlID0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTXG4gICAgICAgICAgICBcdHZhciB0eXBlID0gUGFnZXJTdG9yZS5maXJzdFBhZ2VUcmFuc2l0aW9uID8gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOIDogUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVFxuICAgICAgICAgICAgXHRQYWdlclN0b3JlLmVtaXQodHlwZSlcbiAgICAgICAgICAgIFx0YnJlYWtcbiAgICAgICAgICAgIGNhc2UgUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURTpcbiAgICAgICAgICAgIFx0dmFyIHR5cGUgPSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU5cbiAgICAgICAgICAgIFx0UGFnZXJTdG9yZS5lbWl0KHR5cGUpXG4gICAgICAgICAgICBcdGJyZWFrXG4gICAgICAgICAgICBjYXNlIFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIOlxuICAgICAgICAgICAgXHRpZiAoUGFnZXJTdG9yZS5maXJzdFBhZ2VUcmFuc2l0aW9uKSBQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24gPSBmYWxzZVxuICAgICAgICAgICAgICAgIFBhZ2VyU3RvcmUucGFnZVRyYW5zaXRpb25TdGF0ZSA9IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIXG4gICAgICAgICAgICAgICAgUGFnZXJTdG9yZS5lbWl0KGFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH0pXG59KVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFBhZ2VyU3RvcmU6IFBhZ2VyU3RvcmUsXG5cdFBhZ2VyQWN0aW9uczogUGFnZXJBY3Rpb25zLFxuXHRQYWdlckNvbnN0YW50czogUGFnZXJDb25zdGFudHMsXG5cdFBhZ2VyRGlzcGF0Y2hlcjogUGFnZXJEaXNwYXRjaGVyXG59XG4iLCJpbXBvcnQgYXV0b2JpbmQgZnJvbSAnQXV0b2JpbmQnXG5pbXBvcnQgc2x1ZyBmcm9tICd0by1zbHVnLWNhc2UnXG5cbmNsYXNzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRhdXRvYmluZCh0aGlzKVxuXHRcdHRoaXMuZG9tSXNSZWFkeSA9IGZhbHNlXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuZG9tSXNSZWFkeSA9IHRydWVcblx0fVxuXHRyZW5kZXIoY2hpbGRJZCwgcGFyZW50SWQsIHRlbXBsYXRlLCBvYmplY3QpIHtcblx0XHR0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdFx0dGhpcy5jaGlsZElkID0gY2hpbGRJZFxuXHRcdHRoaXMucGFyZW50SWQgPSBwYXJlbnRJZFxuXHRcdHRoaXMucGFyZW50ID0gKHBhcmVudElkIGluc3RhbmNlb2YgalF1ZXJ5KSA/IHBhcmVudElkIDogJCh0aGlzLnBhcmVudElkKVxuXHRcdHRoaXMuY2hpbGQgPSAodGVtcGxhdGUgPT0gdW5kZWZpbmVkKSA/ICQoJzxkaXY+PC9kaXY+JykgOiAkKHRlbXBsYXRlKG9iamVjdCkpXG5cdFx0aWYodGhpcy5jaGlsZC5hdHRyKCdpZCcpID09IHVuZGVmaW5lZCkgdGhpcy5jaGlsZC5hdHRyKCdpZCcsIHNsdWcoY2hpbGRJZCkpXG5cdFx0dGhpcy5jaGlsZC5yZWFkeSh0aGlzLmNvbXBvbmVudERpZE1vdW50KVxuXHRcdHRoaXMucGFyZW50LmFwcGVuZCh0aGlzLmNoaWxkKVxuXHR9XG5cdHJlbW92ZSgpIHtcblx0XHR0aGlzLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmNoaWxkLnJlbW92ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZUNvbXBvbmVudFxuXG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IFRyYW5zaXRpb25BbmltYXRpb25zIGZyb20gJ1RyYW5zaXRpb25BbmltYXRpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCYXNlUGFnZSBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKClcblx0XHR0aGlzLnByb3BzID0gcHJvcHNcblx0XHR0aGlzLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlID0gdGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUgPSB0aGlzLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZS5iaW5kKHRoaXMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5jaGlsZC5hZGRDbGFzcyh0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKSlcblx0XHR0aGlzLnJlc2l6ZSgpXG5cdFx0dGhpcy5zZXR1cEFuaW1hdGlvbnMoKVxuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wcm9wcy5pc1JlYWR5KHRoaXMucHJvcHMuaGFzaCksIDApXG5cdH1cblx0c2V0dXBBbmltYXRpb25zKCkge1xuXHRcdHZhciBrZXlOYW1lID0gdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLWluJ1xuXHRcdC8vIHRoaXMudGxJbiA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLnRsSW4gPSBuZXcgVGltZWxpbmVNYXgoKVxuXHRcdHRoaXMudGxJbi5ldmVudENhbGxiYWNrKCdvbkNvbXBsZXRlJywgdGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSlcblx0XHRUcmFuc2l0aW9uQW5pbWF0aW9uc1trZXlOYW1lXSh0aGlzLCB0aGlzLnRsSW4pXG5cdFx0dGhpcy50bEluLnBhdXNlKDApXG5cdH1cblx0d2lsbFRyYW5zaXRpb25JbigpIHtcblx0XHR0aGlzLnRsSW4ucGxheSgwKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHZhciBrZXlOYW1lID0gdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLW91dCdcblx0XHQvLyB0aGlzLnRsT3V0ID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdHRoaXMudGxPdXQgPSBuZXcgVGltZWxpbmVNYXgoKVxuXHRcdHRoaXMudGxPdXQuZXZlbnRDYWxsYmFjaygnb25Db21wbGV0ZScsIHRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKVxuXHRcdFRyYW5zaXRpb25BbmltYXRpb25zW2tleU5hbWVdKHRoaXMsIHRoaXMudGxPdXQpXG5cdFx0dGhpcy50bE91dC5wbGF5KDApXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0Ly8gY29uc29sZS5sb2coJ2RpZFRyYW5zaXRpb25JbkNvbXBsZXRlJywgdGhpcy5pZCwgdGhpcy5wcm9wcy50eXBlKVxuXHRcdHRoaXMucmVsZWFzZVRpbWVsaW5lSW4oKVxuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wcm9wcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpLCAwKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlJywgdGhpcy5pZCwgdGhpcy5wcm9wcy50eXBlKVxuXHRcdHRoaXMucmVsZWFzZVRpbWVsaW5lT3V0KClcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucHJvcHMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCksIDApXG5cdH1cblx0cmVzaXplKCkge1xuXHR9XG5cdGZvcmNlVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLnRsSW4gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsSW4ucGF1c2UoMClcblx0XHR9XG5cdFx0aWYodGhpcy50bE91dCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxPdXQucGF1c2UoMClcblx0XHR9XG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHJlbGVhc2VUaW1lbGluZUluKCkge1xuXHRcdGlmKHRoaXMudGxJbiAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxJbi5jbGVhcigpXG5cdFx0XHQvLyBBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bEluKVxuXHRcdFx0dGhpcy50bEluID0gbnVsbFxuXHRcdH1cblx0fVxuXHRyZWxlYXNlVGltZWxpbmVPdXQoKSB7XG5cdFx0aWYodGhpcy50bE91dCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxPdXQuY2xlYXIoKVxuXHRcdFx0Ly8gQXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdXQpXG5cdFx0XHR0aGlzLnRsSU91dCA9IG51bGxcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5yZWxlYXNlVGltZWxpbmVJbigpXG5cdFx0dGhpcy5yZWxlYXNlVGltZWxpbmVPdXQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IHtQYWdlclN0b3JlLCBQYWdlckFjdGlvbnMsIFBhZ2VyQ29uc3RhbnRzLCBQYWdlckRpc3BhdGNoZXJ9IGZyb20gJ1BhZ2VyJ1xuaW1wb3J0IF9jYXBpdGFsaXplIGZyb20gJ2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICdQYWdlc0NvbnRhaW5lcl9oYnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmNsYXNzIEJhc2VQYWdlciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5jdXJyZW50UGFnZURpdlJlZiA9ICdwYWdlLWInXG5cdFx0dGhpcy53aWxsUGFnZVRyYW5zaXRpb25JbiA9IHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uSW4uYmluZCh0aGlzKVxuXHRcdHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0ID0gdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlID0gdGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSA9IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5jb21wb25lbnRzID0ge1xuXHRcdFx0J25ldy1jb21wb25lbnQnOiB1bmRlZmluZWQsXG5cdFx0XHQnb2xkLWNvbXBvbmVudCc6IHVuZGVmaW5lZFxuXHRcdH1cblx0fVxuXHRyZW5kZXIocGFyZW50KSB7XG5cdFx0c3VwZXIucmVuZGVyKCdCYXNlUGFnZXInLCBwYXJlbnQsIHRlbXBsYXRlLCB1bmRlZmluZWQpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdFBhZ2VyU3RvcmUub24oUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOLCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluKVxuXHRcdFBhZ2VyU3RvcmUub24oUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVCwgdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHR3aWxsUGFnZVRyYW5zaXRpb25JbigpIHtcblx0XHRpZihQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24pIHtcblx0XHRcdHRoaXMuc3dpdGNoUGFnZXNEaXZJbmRleCgpXG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXS53aWxsVHJhbnNpdGlvbkluKClcblx0XHR9XG5cdH1cblx0d2lsbFBhZ2VUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHRoaXMuY29tcG9uZW50c1snb2xkLWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uT3V0KClcblx0XHR0aGlzLnN3aXRjaFBhZ2VzRGl2SW5kZXgoKVxuXHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uSW4oKVxuXHR9XG5cdGRpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlJylcblx0XHRQYWdlckFjdGlvbnMucGFnZVRyYW5zaXRpb25EaWRGaW5pc2goKVxuXHRcdHRoaXMudW5tb3VudENvbXBvbmVudCgnb2xkLWNvbXBvbmVudCcpXG5cdH1cblx0ZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZScpXG5cdFx0UGFnZXJBY3Rpb25zLm9uVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRzd2l0Y2hQYWdlc0RpdkluZGV4KCkge1xuXHRcdHZhciBuZXdDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHRcdHZhciBvbGRDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXVxuXHRcdGlmKG5ld0NvbXBvbmVudCAhPSB1bmRlZmluZWQpIG5ld0NvbXBvbmVudC5jaGlsZC5jc3MoJ3otaW5kZXgnLCAyKVxuXHRcdGlmKG9sZENvbXBvbmVudCAhPSB1bmRlZmluZWQpIG9sZENvbXBvbmVudC5jaGlsZC5jc3MoJ3otaW5kZXgnLCAxKVxuXHR9XG5cdHNldHVwTmV3Q29tcG9uZW50KGhhc2gsIHRlbXBsYXRlKSB7XG5cdFx0dmFyIGlkID0gX2NhcGl0YWxpemUoaGFzaC5yZXBsYWNlKFwiL1wiLCBcIlwiKSlcblx0XHR0aGlzLm9sZFBhZ2VEaXZSZWYgPSB0aGlzLmN1cnJlbnRQYWdlRGl2UmVmXG5cdFx0dGhpcy5jdXJyZW50UGFnZURpdlJlZiA9ICh0aGlzLmN1cnJlbnRQYWdlRGl2UmVmID09PSAncGFnZS1hJykgPyAncGFnZS1iJyA6ICdwYWdlLWEnXG5cdFx0dmFyIGVsID0gdGhpcy5jaGlsZC5maW5kKCcjJyt0aGlzLmN1cnJlbnRQYWdlRGl2UmVmKVxuXHRcdHZhciBwcm9wcyA9IHtcblx0XHRcdGlkOiB0aGlzLmN1cnJlbnRQYWdlRGl2UmVmLFxuXHRcdFx0aXNSZWFkeTogdGhpcy5vblBhZ2VSZWFkeSxcblx0XHRcdHR5cGU6IEFwcFN0b3JlLmdldFR5cGVPZlBhZ2UoKSxcblx0XHRcdGhhc2g6IGhhc2gsXG5cdFx0XHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZTogdGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUsXG5cdFx0XHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGU6IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSxcblx0XHRcdGRhdGE6IEFwcFN0b3JlLnBhZ2VDb250ZW50KClcblx0XHR9XG5cdFx0dmFyIHBhZ2UgPSBuZXcgdGVtcGxhdGUudHlwZShwcm9wcylcblx0XHRwYWdlLmlkID0gQXBwU3RvcmUuZ2V0UGFnZUlkKClcblx0XHRwYWdlLnJlbmRlcihpZCwgZWwsIHRlbXBsYXRlLnBhcnRpYWwsIHByb3BzLmRhdGEpXG5cdFx0dGhpcy5jb21wb25lbnRzWydvbGQtY29tcG9uZW50J10gPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddID0gcGFnZVxuXHRcdGlmKFBhZ2VyU3RvcmUucGFnZVRyYW5zaXRpb25TdGF0ZSA9PT0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTKSB7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXS5mb3JjZVVubW91bnQoKVxuXHRcdH1cblx0fVxuXHRvblBhZ2VSZWFkeShoYXNoKSB7XG5cdFx0UGFnZXJBY3Rpb25zLm9uUGFnZVJlYWR5KGhhc2gpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVubW91bnRDb21wb25lbnQocmVmKSB7XG5cdFx0aWYodGhpcy5jb21wb25lbnRzW3JlZl0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5jb21wb25lbnRzW3JlZl0ucmVtb3ZlKClcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0UGFnZXJTdG9yZS5vZmYoUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOLCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluKVxuXHRcdFBhZ2VyU3RvcmUub2ZmKFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9PVVQsIHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0KVxuXHRcdHRoaXMudW5tb3VudENvbXBvbmVudCgnb2xkLWNvbXBvbmVudCcpXG5cdFx0dGhpcy51bm1vdW50Q29tcG9uZW50KCduZXctY29tcG9uZW50Jylcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZVBhZ2VyXG5cbiIsIm1vZHVsZS5leHBvcnRzPXtcblx0XCJpbmZvc1wiOiB7XG5cdFx0XCJ0d2l0dGVyX3VybFwiOiBcImh0dHA6Ly90d2l0dGVyLmNvbVwiLFxuXHRcdFwiZmFjZWJvb2tfdXJsXCI6IFwiaHR0cDovL2ZhY2Vib29rLmNvbVwiLFxuXHRcdFwiaW5zdGFncmFtX3VybFwiOiBcImh0dHA6Ly9pbnN0YWdyYW0uY29tXCIsXG5cdFx0XCJsYW5nXCI6IHtcblx0XHRcdFwiZW5cIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwiZnJcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwiZXNcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwiaXRcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwiZGVcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwicHRcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRcImNvdW50cmllc1wiOiBbXG5cdFx0e1xuXHRcdFx0XCJpZFwiOiBcIkdCUlwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZW5cIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIkZSQVwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZnJcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIkVTUFwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZXNcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIklUQVwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiaXRcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIkRFVVwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZGVcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIlBSVFwiLFxuXHRcdFx0XCJsYW5nXCI6IFwicHRcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH1cblx0XSxcblx0XCJwbGFuZXRzXCI6IFtcInNraVwiLCBcIm1ldGFsXCIsIFwiYWxhc2thXCIsIFwid29vZFwiLCBcImdlbXN0b25lXCJdLFxuXHRcImVsZW1lbnRzXCI6IFtcImZpcmVcIiwgXCJlYXJ0aFwiLCBcIm1ldGFsXCIsIFwid2F0ZXJcIiwgXCJ3b29kXCJdLFxuXHRcImdlbmRlclwiOiBbXCJtYWxlXCIsIFwiZmVtYWxlXCIsIFwiYW5pbWFsXCJdLFxuXG5cdFwiY29sb3JzXCI6IHtcblx0XHRcInNraVwiOiBbXCIweDYxODFhYVwiLCBcIjB4YzNkOWYxXCJdLFxuXHRcdFwibWV0YWxcIjogW1wiMHgwZDBkMGZcIiwgXCIweDU5NTk1OVwiXSxcblx0XHRcImFsYXNrYVwiOiBbXCIweGI3Y2FkYlwiLCBcIjB4NmY4Njk4XCJdLFxuXHRcdFwid29vZFwiOiBbXCIweDUwMjAxNlwiLCBcIjB4YzU4NTQ3XCJdLFxuXHRcdFwiZ2Vtc3RvbmVcIjogW1wiMHgzNjM4NjRcIiwgXCIweDQ3N2U5NFwiXVxuXHR9LFxuXG5cdFwicHJvZHVjdHMtZGF0YVwiOiB7XG5cdFx0XCJza2lcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkZJU1NcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4MzQzYTVjXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJtenM1eWMzaTV4XCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkZJU1NcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4Y2ZmMGZjXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCIwbDFkc3d5cjR4XCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAyLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGU3ZTMzY1wiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiY3dqMDRhM3o1NVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAzLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGRiMzA3NlwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiOGZicDBwYnd3OFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiA0LFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGY0ZWNkYVwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiOGZicDBwYnd3OFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMSwgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjV9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwibWV0YWxcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkJFTFVHQVwiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg4MTgxODFcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcImdzdW43YW16cThcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJuYW1lXCI6IFwiSEFSRFdPT0RcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4ZTgyYjE4XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJmZXZuc2Jzajg0XCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XSxcblx0XHRcImFsYXNrYVwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJuYW1lXCI6IFwiZ2VtbWFcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YjY5MzdkXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJsanJ0NjFpY2hhXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4yLCBcInlcIjowLjN9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwibmFtZVwiOiBcInBlbG90YXNcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4Yzk4ZTk0XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJuMGtzdXkwd3VhXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAyLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJFTkRVUk9cIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NjE2YTcxXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCI4eHBucHlucXVwXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMyxcblx0XHRcdFx0XCJuYW1lXCI6IFwiRU5EVVJPXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDBlMmU2MVwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwibTUwOXAwaXU0dVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjF9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwid29vZFwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJuYW1lXCI6IFwiVklOVEFSXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGQ3OWI3YVwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiZ2xkcnYyN2s3NlwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJCRUxVR0FcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4ODhhMmM3XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCIxbWV2cnh6N3Y2XCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XSxcblx0XHRcImdlbXN0b25lXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJFTkRVUk9cIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4Mjg5MmMxXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCI5cWJoaHBiODliXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4yLCBcInlcIjowLjN9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkVORFVST1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg2MmE4YmJcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcInBucjgxcmkyeG9cIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDIsXG5cdFx0XHRcdFwibmFtZVwiOiBcImdlbW1hXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDA5MGIzNlwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiY2tnd3pkM25wdVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuM30sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjR9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cblx0XCJsYW5nXCI6IHtcblx0XHRcImVuXCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXJcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXJcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiZnJcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBmclwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBmclwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJlc1wiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGVzXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGVzXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcIml0XCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgaXRcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgaXRcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiZGVcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBnZVwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBnZVwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJwdFwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIHB0XCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIHB0XCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdFwiZGVmYXVsdC1yb3V0ZVwiOiBcIi9sYW5kaW5nXCIsXG5cblx0XCJyb3V0aW5nXCI6IHtcblx0XHRcIi9sYW5kaW5nXCI6IHtcblx0XHRcdFwiaWRcIjogXCJsYW5kaW5nXCJcblx0XHR9LFxuXHRcdFwiL3BsYW5ldC9za2lcIjoge1xuXHRcdFx0XCJpZFwiOiBcInNraVwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L21ldGFsXCI6IHtcblx0XHRcdFwiaWRcIjogXCJtZXRhbFwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L2FsYXNrYVwiOiB7XG5cdFx0XHRcImlkXCI6IFwiYWxhc2thXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvd29vZFwiOiB7XG5cdFx0XHRcImlkXCI6IFwid29vZFwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L2dlbXN0b25lXCI6IHtcblx0XHRcdFwiaWRcIjogXCJnZW1zdG9uZVwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XVxuXHRcdH1cblx0fVxufSJdfQ==
