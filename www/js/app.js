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

var App = (function () {
	function App() {
		_classCallCheck(this, App);
	}

	_createClass(App, [{
		key: 'init',
		value: function init() {

			var mobilecheck = function mobilecheck() {
				var check = false;
				(function (a) {
					if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
				})(navigator.userAgent || navigator.vendor || window.opera);
				return check;
			};

			_AppStore2['default'].Detector.isMobile = mobilecheck();
			// AppStore.Detector.isMobile = true
			// console.log(AppStore.Detector)

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

},{"./AppTemplate":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/AppTemplate.js","./actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./services/GlobalEvents":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/GlobalEvents.js","./services/Pool":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Pool.js","./services/Preloader":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Preloader.js","./services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/AppTemplate.js":[function(require,module,exports){
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
				scope.mobileMenu = [{ id: 'home', name: scope.infos['home_txt'], url: '#!/landing' }, { id: 'shop-men', name: scope.infos['shop_title'] + ' ' + scope.infos['shop_men'], url: scope.infos['shop_men_url'] }, { id: 'shop-women', name: scope.infos['shop_title'] + ' ' + scope.infos['shop_women'], url: scope.infos['shop_women_url'] }, { id: 'lab', name: scope.infos['camper_lab'], url: scope.infos['camper_lab_url'] }, { id: 'legal', name: scope.infos['legal'], url: scope.infos['legal_url'] }];
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
			this.$legal = this.child.find('.legal');
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
			var legalCss = {
				left: _AppConstants2['default'].PADDING_AROUND,
				top: windowH - _AppConstants2['default'].PADDING_AROUND - this.$legal.height()
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
			this.$legal.css(legalCss);
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
			console.log('buy');
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
				this.withFill = this.params.highlight == false ? false : true;
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

				this.onStageClicked = this.onStageClicked.bind(this);
				this.parent.on('click', this.onStageClicked);

				this.arrowClicked = this.arrowClicked.bind(this);
				this.arrowMouseEnter = this.arrowMouseEnter.bind(this);
				this.arrowMouseLeave = this.arrowMouseLeave.bind(this);

				this.previousArea = this.child.find('.interface .previous-area');
				this.nextArea = this.child.find('.interface .next-area');
				this.previousArea.on('click', this.arrowClicked);
				this.nextArea.on('click', this.arrowClicked);
				this.previousArea.on('mouseenter', this.arrowMouseEnter);
				this.nextArea.on('mouseenter', this.arrowMouseEnter);
				this.previousArea.on('mouseleave', this.arrowMouseLeave);
				this.nextArea.on('mouseleave', this.arrowMouseLeave);
			}

			_get(Object.getPrototypeOf(Landing.prototype), 'componentDidMount', this).call(this);
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
		key: 'onStageClicked',
		value: function onStageClicked(e) {
			e.preventDefault();
			switch (this.direction) {
				case _AppConstants2['default'].LEFT:
					this.previous();
					break;
				case _AppConstants2['default'].RIGHT:
					this.next();
					break;
				case _AppConstants2['default'].TOP:
					var url = "/planet/" + this.landingSlideshow.currentId + '/0';
					_Router2['default'].setHash(url);
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

			var windowW = _AppStore2['default'].Window.w;
			var mouseX = _AppStore2['default'].Mouse.x;
			this.landingSlideshow.update();
			this.compass.update();
			this.direction = _AppConstants2['default'].NONE;
			var area = windowW * 0.25;
			if (mouseX > (windowW >> 1) - area && mouseX < (windowW >> 1) + area) {
				this.direction = _AppConstants2['default'].TOP;
			}

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
			this.parent.off('click', this.onStageClicked);

			this.previousArea.off('click', this.arrowClicked);
			this.nextArea.off('click', this.arrowClicked);
			this.previousArea.off('mouseenter', this.arrowMouseEnter);
			this.nextArea.off('mouseenter', this.arrowMouseEnter);
			this.previousArea.off('mouseleave', this.arrowMouseLeave);
			this.nextArea.off('mouseleave', this.arrowMouseLeave);
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
			"static": JS_url_static
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
    + "</a></li>\n				</ul>\n			</div>\n		</header>\n		<footer id=\"footer\" class=\"btn\">\n			<div class=\"legal\"><a target=\"_blank\" href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.legal_url : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.legal : stack1), depth0))
    + "</a></div>\n			<div id=\"social-wrapper\">\n				<div class=\"social-title\">SOCIAL</div>\n				<ul>\n					<li>\n						<a target=\"_blank\" href=\""
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
    return "\n		<div class=\"slideshow-title\">\n			<div class=\"planet-title\"></div>\n			<div class=\"planet-name\"></div>\n		</div>\n		<div class=\"interface\">\n\n			<div id=\"left\" class=\"previous-area area-btn\"></div>\n			<div id=\"right\" class=\"next-area area-btn\"></div>\n\n			<div class=\"previous-btn dots-arrow-btn\">\n				<svg>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\"/>\n					<line class=\"line\"/>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\" />\n					<line class=\"line\" />\n				</svg>\n			</div>\n			<div class=\"next-btn dots-arrow-btn\">\n				<svg>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\"/>\n					<line class=\"line\"/>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\" />\n					<line class=\"line\" />\n				</svg>\n			</div>\n		</div>\n\n";
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
        return _Utils2['default'].Closest(responsiveArray, windowW);
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmx1eC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L2xpYi9EaXNwYXRjaGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvbGliL2ludmFyaWFudC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvYmFzZVRvU3RyaW5nLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9NYWluLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwVGVtcGxhdGUuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9hY3Rpb25zL0FwcEFjdGlvbnMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Fycm93QnRuLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9CYXNlQ2FtcGFpZ25QYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9CYXNlUGxhbmV0UGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzcy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzc1JpbmdzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Db21wYXNzZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Zyb250Q29udGFpbmVyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Lbm90LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9MYW5kaW5nU2xpZGVzaG93LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9QWENvbnRhaW5lci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1BsYW5ldENhbXBhaWduUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1BsYXlCdG4uanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1JlY3RhbmdsZUJ0bi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvU2Nyb2xsQmFyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9TbWFsbENvbXBhc3MuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1NwcmluZ0dhcmRlbi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvVGl0bGVTd2l0Y2hlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvQWxhc2thWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL0Jhc2VYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvR2VtU3RvbmVYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvTWV0YWxYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvU2tpWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL1dvb2RYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvcGFnZXMvTGFuZGluZy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbnN0YW50cy9BcHBDb25zdGFudHMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9kaXNwYXRjaGVycy9BcHBEaXNwYXRjaGVyLmpzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9Gcm9udENvbnRhaW5lci5oYnMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL1BhZ2VzQ29udGFpbmVyLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGxhbmV0Q2FtcGFpZ25QYWdlLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuaGJzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9wYWdlcy9MYW5kaW5nLmhicyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL0dsb2JhbEV2ZW50cy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1Bvb2wuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9QcmVsb2FkZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9Sb3V0ZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9UcmFuc2l0aW9uQW5pbWF0aW9ucy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3N0b3Jlcy9BcHBTdG9yZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3V0aWxzL0F1dG9iaW5kLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvVXRpbHMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC91dGlscy9WZWMyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvcmFmLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9QYWdlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvcGFnZXIvY29tcG9uZW50cy9CYXNlQ29tcG9uZW50LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VQYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VQYWdlci5qcyIsInd3dy9kYXRhL2RhdGEuanNvbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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LE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pHLE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ25GLE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ25GLE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMxSCxPQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDMUgsT0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2hJLE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMvSCxPQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQUFBQyxNQUFNLEdBQUMsQ0FBQyxHQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDMUcsT0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLEVBQUUsTUFBTSxHQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsTUFBTSxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTs7QUFFM0csT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQzVFLE9BQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUM1RSxPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDNUUsT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNqSCxPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pILE9BQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQyxNQUFN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LE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNuRixVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDbEYsVUFBSyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUN0SCxVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNySCxVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNySCxVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBOztBQUV0SCxVQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakYsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pGLFVBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNqRixVQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakYsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakgsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakgsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakgsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7O0FBRWpILFVBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNwQixVQUFLLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7Ozs7Ozs7O0lBUW5CLEVBQUUsQ0FBQyxDQUFDLENBQUE7R0FDTDs7O1NB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QyxDQUFBO0FBQ2pELFFBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUM3RCxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7OztBQUduRSxRQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUM3QyxTQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBLEdBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUEsSUFBSyxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0FBQzNILFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTs7O0FBR3pDLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7QUFHakMsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDM0UsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7OztBQUczRSxTQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDcEMsU0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLFNBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNwQyxTQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7OztBQUdwQyxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUMzRSxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTs7QUFFM0UsU0FBSyxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNyQixTQUFLLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzNCLFNBQUssQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFD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LENBQUE7QUFDdEMsUUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDN0IsUUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6RCxNQUFJO0FBQ0osUUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ3ZEO0FBQ0QsT0FBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUE7QUFDM0IsT0FBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7QUFDL0IsT0FBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUE7QUFDbkMsUUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM3QixRQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3hCLFFBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2xDLGdCQUFZLEdBQUcsQUFBQyxZQUFZLElBQUksU0FBUyxHQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQTs7QUFFN0UsdUJBQU0sUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUN2RixRQUFJLENBQUMsUUFBUSxDQUFD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QU0sQ0FBQyxDQUFDLENBQUE7O0FBRS9CLFVBQU8sS0FBSyxDQUFDLE9BQU87QUFDbkIsUUFBSywwQkFBYSxPQUFPO0FBQ3hCLFlBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQy9HLFlBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxFQUFFLElBQUksRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDckcsVUFBSztBQUFBLEFBQ04sUUFBSywwQkFBYSxVQUFVO0FBQzNCLFlBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQy9HLFlBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxFQUFFLElBQUksRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDckcsVUFBSztB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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbm1vZHVsZS5leHBvcnRzLkRpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2xpYi9EaXNwYXRjaGVyJylcbiIsIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgRGlzcGF0Y2hlclxuICogQHR5cGVjaGVja3NcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIGludmFyaWFudCA9IHJlcXVpcmUoJy4vaW52YXJpYW50Jyk7XG5cbnZhciBfbGFzdElEID0gMTtcbnZhciBfcHJlZml4ID0gJ0lEXyc7XG5cbi8qKlxuICogRGlzcGF0Y2hlciBpcyB1c2VkIHRvIGJyb2FkY2FzdCBwYXlsb2FkcyB0byByZWdpc3RlcmVkIGNhbGxiYWNrcy4gVGhpcyBpc1xuICogZGlmZmVyZW50IGZyb20gZ2VuZXJpYyBwdWItc3ViIHN5c3RlbXMgaW4gdHdvIHdheXM6XG4gKlxuICogICAxKSBDYWxsYmFja3MgYXJlIG5vdCBzdWJzY3JpYmVkIHRvIHBhcnRpY3VsYXIgZXZlbnRzLiBFdmVyeSBwYXlsb2FkIGlzXG4gKiAgICAgIGRpc3BhdGNoZWQgdG8gZXZlcnkgcmVnaXN0ZXJlZCBjYWxsYmFjay5cbiAqICAgMikgQ2FsbGJhY2tzIGNhbiBiZSBkZWZlcnJlZCBpbiB3aG9sZSBvciBwYXJ0IHVudGlsIG90aGVyIGNhbGxiYWNrcyBoYXZlXG4gKiAgICAgIGJlZW4gZXhlY3V0ZWQuXG4gKlxuICogRm9yIGV4YW1wbGUsIGNvbnNpZGVyIHRoaXMgaHlwb3RoZXRpY2FsIGZsaWdodCBkZXN0aW5hdGlvbiBmb3JtLCB3aGljaFxuICogc2VsZWN0cyBhIGRlZmF1bHQgY2l0eSB3aGVuIGEgY291bnRyeSBpcyBzZWxlY3RlZDpcbiAqXG4gKiAgIHZhciBmbGlnaHREaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIoKTtcbiAqXG4gKiAgIC8vIEtlZXBzIHRyYWNrIG9mIHdoaWNoIGNvdW50cnkgaXMgc2VsZWN0ZWRcbiAqICAgdmFyIENvdW50cnlTdG9yZSA9IHtjb3VudHJ5OiBudWxsfTtcbiAqXG4gKiAgIC8vIEtlZXBzIHRyYWNrIG9mIHdoaWNoIGNpdHkgaXMgc2VsZWN0ZWRcbiAqICAgdmFyIENpdHlTdG9yZSA9IHtjaXR5OiBudWxsfTtcbiAqXG4gKiAgIC8vIEtlZXBzIHRyYWNrIG9mIHRoZSBiYXNlIGZsaWdodCBwcmljZSBvZiB0aGUgc2VsZWN0ZWQgY2l0eVxuICogICB2YXIgRmxpZ2h0UHJpY2VTdG9yZSA9IHtwcmljZTogbnVsbH1cbiAqXG4gKiBXaGVuIGEgdXNlciBjaGFuZ2VzIHRoZSBzZWxlY3RlZCBjaXR5LCB3ZSBkaXNwYXRjaCB0aGUgcGF5bG9hZDpcbiAqXG4gKiAgIGZsaWdodERpc3BhdGNoZXIuZGlzcGF0Y2goe1xuICogICAgIGFjdGlvblR5cGU6ICdjaXR5LXVwZGF0ZScsXG4gKiAgICAgc2VsZWN0ZWRDaXR5OiAncGFyaXMnXG4gKiAgIH0pO1xuICpcbiAqIFRoaXMgcGF5bG9hZCBpcyBkaWdlc3RlZCBieSBgQ2l0eVN0b3JlYDpcbiAqXG4gKiAgIGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjaXR5LXVwZGF0ZScpIHtcbiAqICAgICAgIENpdHlTdG9yZS5jaXR5ID0gcGF5bG9hZC5zZWxlY3RlZENpdHk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBXaGVuIHRoZSB1c2VyIHNlbGVjdHMgYSBjb3VudHJ5LCB3ZSBkaXNwYXRjaCB0aGUgcGF5bG9hZDpcbiAqXG4gKiAgIGZsaWdodERpc3BhdGNoZXIuZGlzcGF0Y2goe1xuICogICAgIGFjdGlvblR5cGU6ICdjb3VudHJ5LXVwZGF0ZScsXG4gKiAgICAgc2VsZWN0ZWRDb3VudHJ5OiAnYXVzdHJhbGlhJ1xuICogICB9KTtcbiAqXG4gKiBUaGlzIHBheWxvYWQgaXMgZGlnZXN0ZWQgYnkgYm90aCBzdG9yZXM6XG4gKlxuICogICAgQ291bnRyeVN0b3JlLmRpc3BhdGNoVG9rZW4gPSBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY291bnRyeS11cGRhdGUnKSB7XG4gKiAgICAgICBDb3VudHJ5U3RvcmUuY291bnRyeSA9IHBheWxvYWQuc2VsZWN0ZWRDb3VudHJ5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgY2FsbGJhY2sgdG8gdXBkYXRlIGBDb3VudHJ5U3RvcmVgIGlzIHJlZ2lzdGVyZWQsIHdlIHNhdmUgYSByZWZlcmVuY2VcbiAqIHRvIHRoZSByZXR1cm5lZCB0b2tlbi4gVXNpbmcgdGhpcyB0b2tlbiB3aXRoIGB3YWl0Rm9yKClgLCB3ZSBjYW4gZ3VhcmFudGVlXG4gKiB0aGF0IGBDb3VudHJ5U3RvcmVgIGlzIHVwZGF0ZWQgYmVmb3JlIHRoZSBjYWxsYmFjayB0aGF0IHVwZGF0ZXMgYENpdHlTdG9yZWBcbiAqIG5lZWRzIHRvIHF1ZXJ5IGl0cyBkYXRhLlxuICpcbiAqICAgQ2l0eVN0b3JlLmRpc3BhdGNoVG9rZW4gPSBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY291bnRyeS11cGRhdGUnKSB7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIG1heSBub3QgYmUgdXBkYXRlZC5cbiAqICAgICAgIGZsaWdodERpc3BhdGNoZXIud2FpdEZvcihbQ291bnRyeVN0b3JlLmRpc3BhdGNoVG9rZW5dKTtcbiAqICAgICAgIC8vIGBDb3VudHJ5U3RvcmUuY291bnRyeWAgaXMgbm93IGd1YXJhbnRlZWQgdG8gYmUgdXBkYXRlZC5cbiAqXG4gKiAgICAgICAvLyBTZWxlY3QgdGhlIGRlZmF1bHQgY2l0eSBmb3IgdGhlIG5ldyBjb3VudHJ5XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IGdldERlZmF1bHRDaXR5Rm9yQ291bnRyeShDb3VudHJ5U3RvcmUuY291bnRyeSk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgdXNhZ2Ugb2YgYHdhaXRGb3IoKWAgY2FuIGJlIGNoYWluZWQsIGZvciBleGFtcGxlOlxuICpcbiAqICAgRmxpZ2h0UHJpY2VTdG9yZS5kaXNwYXRjaFRva2VuID1cbiAqICAgICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICAgIHN3aXRjaCAocGF5bG9hZC5hY3Rpb25UeXBlKSB7XG4gKiAgICAgICAgIGNhc2UgJ2NvdW50cnktdXBkYXRlJzpcbiAqICAgICAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NpdHlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBnZXRGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKlxuICogICAgICAgICBjYXNlICdjaXR5LXVwZGF0ZSc6XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgYGNvdW50cnktdXBkYXRlYCBwYXlsb2FkIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBpbnZva2UgdGhlIHN0b3JlcydcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzIGluIG9yZGVyOiBgQ291bnRyeVN0b3JlYCwgYENpdHlTdG9yZWAsIHRoZW5cbiAqIGBGbGlnaHRQcmljZVN0b3JlYC5cbiAqL1xuXG4gIGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZyA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGV2ZXJ5IGRpc3BhdGNoZWQgcGF5bG9hZC4gUmV0dXJuc1xuICAgKiBhIHRva2VuIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBgd2FpdEZvcigpYC5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUucmVnaXN0ZXI9ZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB2YXIgaWQgPSBfcHJlZml4ICsgX2xhc3RJRCsrO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSA9IGNhbGxiYWNrO1xuICAgIHJldHVybiBpZDtcbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGNhbGxiYWNrIGJhc2VkIG9uIGl0cyB0b2tlbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS51bnJlZ2lzdGVyPWZ1bmN0aW9uKGlkKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdLFxuICAgICAgJ0Rpc3BhdGNoZXIudW5yZWdpc3RlciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJyxcbiAgICAgIGlkXG4gICAgKTtcbiAgICBkZWxldGUgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBXYWl0cyBmb3IgdGhlIGNhbGxiYWNrcyBzcGVjaWZpZWQgdG8gYmUgaW52b2tlZCBiZWZvcmUgY29udGludWluZyBleGVjdXRpb25cbiAgICogb2YgdGhlIGN1cnJlbnQgY2FsbGJhY2suIFRoaXMgbWV0aG9kIHNob3VsZCBvbmx5IGJlIHVzZWQgYnkgYSBjYWxsYmFjayBpblxuICAgKiByZXNwb25zZSB0byBhIGRpc3BhdGNoZWQgcGF5bG9hZC5cbiAgICpcbiAgICogQHBhcmFtIHthcnJheTxzdHJpbmc+fSBpZHNcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLndhaXRGb3I9ZnVuY3Rpb24oaWRzKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nLFxuICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBNdXN0IGJlIGludm9rZWQgd2hpbGUgZGlzcGF0Y2hpbmcuJ1xuICAgICk7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGlkcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgIHZhciBpZCA9IGlkc1tpaV07XG4gICAgICBpZiAodGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgIGludmFyaWFudChcbiAgICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0sXG4gICAgICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBDaXJjdWxhciBkZXBlbmRlbmN5IGRldGVjdGVkIHdoaWxlICcgK1xuICAgICAgICAgICd3YWl0aW5nIGZvciBgJXNgLicsXG4gICAgICAgICAgaWRcbiAgICAgICAgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnZhcmlhbnQoXG4gICAgICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSxcbiAgICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJyxcbiAgICAgICAgaWRcbiAgICAgICk7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrKGlkKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoZXMgYSBwYXlsb2FkIHRvIGFsbCByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHBheWxvYWRcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoPWZ1bmN0aW9uKHBheWxvYWQpIHtcbiAgICBpbnZhcmlhbnQoXG4gICAgICAhdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nLFxuICAgICAgJ0Rpc3BhdGNoLmRpc3BhdGNoKC4uLik6IENhbm5vdCBkaXNwYXRjaCBpbiB0aGUgbWlkZGxlIG9mIGEgZGlzcGF0Y2guJ1xuICAgICk7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9zdGFydERpc3BhdGNoaW5nKHBheWxvYWQpO1xuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcykge1xuICAgICAgICBpZiAodGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfc3RvcERpc3BhdGNoaW5nKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBJcyB0aGlzIERpc3BhdGNoZXIgY3VycmVudGx5IGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuaXNEaXNwYXRjaGluZz1mdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSBjYWxsYmFjayBzdG9yZWQgd2l0aCB0aGUgZ2l2ZW4gaWQuIEFsc28gZG8gc29tZSBpbnRlcm5hbFxuICAgKiBib29ra2VlcGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2s9ZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0gPSB0cnVlO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSh0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkKTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0gPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgYm9va2tlZXBpbmcgbmVlZGVkIHdoZW4gZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXlsb2FkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfc3RhcnREaXNwYXRjaGluZz1mdW5jdGlvbihwYXlsb2FkKSB7XG4gICAgZm9yICh2YXIgaWQgaW4gdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MpIHtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSA9IGZhbHNlO1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBwYXlsb2FkO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENsZWFyIGJvb2trZWVwaW5nIHVzZWQgZm9yIGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX3N0b3BEaXNwYXRjaGluZz1mdW5jdGlvbigpIHtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gbnVsbDtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgfTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXI7XG4iLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBpbnZhcmlhbnRcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBVc2UgaW52YXJpYW50KCkgdG8gYXNzZXJ0IHN0YXRlIHdoaWNoIHlvdXIgcHJvZ3JhbSBhc3N1bWVzIHRvIGJlIHRydWUuXG4gKlxuICogUHJvdmlkZSBzcHJpbnRmLXN0eWxlIGZvcm1hdCAob25seSAlcyBpcyBzdXBwb3J0ZWQpIGFuZCBhcmd1bWVudHNcbiAqIHRvIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBicm9rZSBhbmQgd2hhdCB5b3Ugd2VyZVxuICogZXhwZWN0aW5nLlxuICpcbiAqIFRoZSBpbnZhcmlhbnQgbWVzc2FnZSB3aWxsIGJlIHN0cmlwcGVkIGluIHByb2R1Y3Rpb24sIGJ1dCB0aGUgaW52YXJpYW50XG4gKiB3aWxsIHJlbWFpbiB0byBlbnN1cmUgbG9naWMgZG9lcyBub3QgZGlmZmVyIGluIHByb2R1Y3Rpb24uXG4gKi9cblxudmFyIGludmFyaWFudCA9IGZ1bmN0aW9uKGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIGlmIChmYWxzZSkge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICtcbiAgICAgICAgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJ1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZSwgZl07XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdJbnZhcmlhbnQgVmlvbGF0aW9uOiAnICtcbiAgICAgICAgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJnc1thcmdJbmRleCsrXTsgfSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX2ltcG9ydCA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9iYXNlJyk7XG5cbnZhciBiYXNlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbi8vIEVhY2ggb2YgdGhlc2UgYXVnbWVudCB0aGUgSGFuZGxlYmFycyBvYmplY3QuIE5vIG5lZWQgdG8gc2V0dXAgaGVyZS5cbi8vIChUaGlzIGlzIGRvbmUgdG8gZWFzaWx5IHNoYXJlIGNvZGUgYmV0d2VlbiBjb21tb25qcyBhbmQgYnJvd3NlIGVudnMpXG5cbnZhciBfU2FmZVN0cmluZyA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9zYWZlLXN0cmluZycpO1xuXG52YXIgX1NhZmVTdHJpbmcyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX1NhZmVTdHJpbmcpO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBfaW1wb3J0MiA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy91dGlscycpO1xuXG52YXIgVXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0Mik7XG5cbnZhciBfaW1wb3J0MyA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9ydW50aW1lJyk7XG5cbnZhciBydW50aW1lID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydDMpO1xuXG52YXIgX25vQ29uZmxpY3QgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvbm8tY29uZmxpY3QnKTtcblxudmFyIF9ub0NvbmZsaWN0MiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9ub0NvbmZsaWN0KTtcblxuLy8gRm9yIGNvbXBhdGliaWxpdHkgYW5kIHVzYWdlIG91dHNpZGUgb2YgbW9kdWxlIHN5c3RlbXMsIG1ha2UgdGhlIEhhbmRsZWJhcnMgb2JqZWN0IGEgbmFtZXNwYWNlXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIHZhciBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChoYiwgYmFzZSk7XG4gIGhiLlNhZmVTdHJpbmcgPSBfU2FmZVN0cmluZzJbJ2RlZmF1bHQnXTtcbiAgaGIuRXhjZXB0aW9uID0gX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXTtcbiAgaGIuVXRpbHMgPSBVdGlscztcbiAgaGIuZXNjYXBlRXhwcmVzc2lvbiA9IFV0aWxzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgaGIuVk0gPSBydW50aW1lO1xuICBoYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uIChzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgaGIpO1xuICB9O1xuXG4gIHJldHVybiBoYjtcbn1cblxudmFyIGluc3QgPSBjcmVhdGUoKTtcbmluc3QuY3JlYXRlID0gY3JlYXRlO1xuXG5fbm9Db25mbGljdDJbJ2RlZmF1bHQnXShpbnN0KTtcblxuaW5zdFsnZGVmYXVsdCddID0gaW5zdDtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gaW5zdDtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7XG5leHBvcnRzLmNyZWF0ZUZyYW1lID0gY3JlYXRlRnJhbWU7XG5cbnZhciBfaW1wb3J0ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgVXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0KTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIFZFUlNJT04gPSAnMy4wLjEnO1xuZXhwb3J0cy5WRVJTSU9OID0gVkVSU0lPTjtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IDY7XG5cbmV4cG9ydHMuQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz09IDEueC54JyxcbiAgNTogJz09IDIuMC4wLWFscGhhLngnLFxuICA2OiAnPj0gMi4wLjAtYmV0YS4xJ1xufTtcblxuZXhwb3J0cy5SRVZJU0lPTl9DSEFOR0VTID0gUkVWSVNJT05fQ0hBTkdFUztcbnZhciBpc0FycmF5ID0gVXRpbHMuaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uID0gVXRpbHMuaXNGdW5jdGlvbixcbiAgICB0b1N0cmluZyA9IFV0aWxzLnRvU3RyaW5nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzKSB7XG4gIHRoaXMuaGVscGVycyA9IGhlbHBlcnMgfHwge307XG4gIHRoaXMucGFydGlhbHMgPSBwYXJ0aWFscyB8fCB7fTtcblxuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xufVxuXG5IYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogSGFuZGxlYmFyc0Vudmlyb25tZW50LFxuXG4gIGxvZ2dlcjogbG9nZ2VyLFxuICBsb2c6IGxvZyxcblxuICByZWdpc3RlckhlbHBlcjogZnVuY3Rpb24gcmVnaXN0ZXJIZWxwZXIobmFtZSwgZm4pIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgaWYgKGZuKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTtcbiAgICAgIH1cbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uIHVucmVnaXN0ZXJIZWxwZXIobmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLmhlbHBlcnNbbmFtZV07XG4gIH0sXG5cbiAgcmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbiByZWdpc3RlclBhcnRpYWwobmFtZSwgcGFydGlhbCkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgcGFydGlhbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ0F0dGVtcHRpbmcgdG8gcmVnaXN0ZXIgYSBwYXJ0aWFsIGFzIHVuZGVmaW5lZCcpO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWw7XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24gdW5yZWdpc3RlclBhcnRpYWwobmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLnBhcnRpYWxzW25hbWVdO1xuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24gKCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyBBIG1pc3NpbmcgZmllbGQgaW4gYSB7e2Zvb319IGNvbnN0dWN0LlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU29tZW9uZSBpcyBhY3R1YWxseSB0cnlpbmcgdG8gY2FsbCBzb21ldGhpbmcsIGJsb3cgdXAuXG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnTWlzc2luZyBoZWxwZXI6IFwiJyArIGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV0ubmFtZSArICdcIicpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXG4gICAgICAgIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZm4odGhpcyk7XG4gICAgfSBlbHNlIGlmIChjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgaWYgKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICBpZiAob3B0aW9ucy5pZHMpIHtcbiAgICAgICAgICBvcHRpb25zLmlkcyA9IFtvcHRpb25zLm5hbWVdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIHZhciBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5uYW1lKTtcbiAgICAgICAgb3B0aW9ucyA9IHsgZGF0YTogZGF0YSB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnTXVzdCBwYXNzIGl0ZXJhdG9yIHRvICNlYWNoJyk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbixcbiAgICAgICAgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIHJldCA9ICcnLFxuICAgICAgICBkYXRhID0gdW5kZWZpbmVkLFxuICAgICAgICBjb250ZXh0UGF0aCA9IHVuZGVmaW5lZDtcblxuICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgIGNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSkgKyAnLic7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXhlY0l0ZXJhdGlvbihmaWVsZCwgaW5kZXgsIGxhc3QpIHtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIGRhdGEua2V5ID0gZmllbGQ7XG4gICAgICAgIGRhdGEuaW5kZXggPSBpbmRleDtcbiAgICAgICAgZGF0YS5maXJzdCA9IGluZGV4ID09PSAwO1xuICAgICAgICBkYXRhLmxhc3QgPSAhIWxhc3Q7XG5cbiAgICAgICAgaWYgKGNvbnRleHRQYXRoKSB7XG4gICAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGNvbnRleHRQYXRoICsgZmllbGQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtmaWVsZF0sIHtcbiAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgYmxvY2tQYXJhbXM6IFV0aWxzLmJsb2NrUGFyYW1zKFtjb250ZXh0W2ZpZWxkXSwgZmllbGRdLCBbY29udGV4dFBhdGggKyBmaWVsZCwgbnVsbF0pXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvciAodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgICAgIGV4ZWNJdGVyYXRpb24oaSwgaSwgaSA9PT0gY29udGV4dC5sZW5ndGggLSAxKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHByaW9yS2V5ID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgLy8gV2UncmUgcnVubmluZyB0aGUgaXRlcmF0aW9ucyBvbmUgc3RlcCBvdXQgb2Ygc3luYyBzbyB3ZSBjYW4gZGV0ZWN0XG4gICAgICAgICAgICAvLyB0aGUgbGFzdCBpdGVyYXRpb24gd2l0aG91dCBoYXZlIHRvIHNjYW4gdGhlIG9iamVjdCB0d2ljZSBhbmQgY3JlYXRlXG4gICAgICAgICAgICAvLyBhbiBpdGVybWVkaWF0ZSBrZXlzIGFycmF5LlxuICAgICAgICAgICAgaWYgKHByaW9yS2V5KSB7XG4gICAgICAgICAgICAgIGV4ZWNJdGVyYXRpb24ocHJpb3JLZXksIGkgLSAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByaW9yS2V5ID0ga2V5O1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocHJpb3JLZXkpIHtcbiAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpIC0gMSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbiAoY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHtcbiAgICAgIGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICghb3B0aW9ucy5oYXNoLmluY2x1ZGVaZXJvICYmICFjb25kaXRpb25hbCB8fCBVdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24gKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwgeyBmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2ggfSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkge1xuICAgICAgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSB7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIHZhciBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pO1xuICAgICAgICBvcHRpb25zID0geyBkYXRhOiBkYXRhIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbiAobWVzc2FnZSwgb3B0aW9ucykge1xuICAgIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgICBpbnN0YW5jZS5sb2cobGV2ZWwsIG1lc3NhZ2UpO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9va3VwJywgZnVuY3Rpb24gKG9iaiwgZmllbGQpIHtcbiAgICByZXR1cm4gb2JqICYmIG9ialtmaWVsZF07XG4gIH0pO1xufVxuXG52YXIgbG9nZ2VyID0ge1xuICBtZXRob2RNYXA6IHsgMDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcicgfSxcblxuICAvLyBTdGF0ZSBlbnVtXG4gIERFQlVHOiAwLFxuICBJTkZPOiAxLFxuICBXQVJOOiAyLFxuICBFUlJPUjogMyxcbiAgbGV2ZWw6IDEsXG5cbiAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbiBsb2cobGV2ZWwsIG1lc3NhZ2UpIHtcbiAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IGxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgKGNvbnNvbGVbbWV0aG9kXSB8fCBjb25zb2xlLmxvZykuY2FsbChjb25zb2xlLCBtZXNzYWdlKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgfVxuICB9XG59O1xuXG5leHBvcnRzLmxvZ2dlciA9IGxvZ2dlcjtcbnZhciBsb2cgPSBsb2dnZXIubG9nO1xuXG5leHBvcnRzLmxvZyA9IGxvZztcblxuZnVuY3Rpb24gY3JlYXRlRnJhbWUob2JqZWN0KSB7XG4gIHZhciBmcmFtZSA9IFV0aWxzLmV4dGVuZCh7fSwgb2JqZWN0KTtcbiAgZnJhbWUuX3BhcmVudCA9IG9iamVjdDtcbiAgcmV0dXJuIGZyYW1lO1xufVxuXG4vKiBbYXJncywgXW9wdGlvbnMgKi8iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKG1lc3NhZ2UsIG5vZGUpIHtcbiAgdmFyIGxvYyA9IG5vZGUgJiYgbm9kZS5sb2MsXG4gICAgICBsaW5lID0gdW5kZWZpbmVkLFxuICAgICAgY29sdW1uID0gdW5kZWZpbmVkO1xuICBpZiAobG9jKSB7XG4gICAgbGluZSA9IGxvYy5zdGFydC5saW5lO1xuICAgIGNvbHVtbiA9IGxvYy5zdGFydC5jb2x1bW47XG5cbiAgICBtZXNzYWdlICs9ICcgLSAnICsgbGluZSArICc6JyArIGNvbHVtbjtcbiAgfVxuXG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cblxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBFeGNlcHRpb24pO1xuICB9XG5cbiAgaWYgKGxvYykge1xuICAgIHRoaXMubGluZU51bWJlciA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gPSBjb2x1bW47XG4gIH1cbn1cblxuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBFeGNlcHRpb247XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG4vKmdsb2JhbCB3aW5kb3cgKi9cblxuZXhwb3J0c1snZGVmYXVsdCddID0gZnVuY3Rpb24gKEhhbmRsZWJhcnMpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgdmFyIHJvb3QgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHdpbmRvdyxcbiAgICAgICRIYW5kbGViYXJzID0gcm9vdC5IYW5kbGViYXJzO1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBIYW5kbGViYXJzLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHJvb3QuSGFuZGxlYmFycyA9PT0gSGFuZGxlYmFycykge1xuICAgICAgcm9vdC5IYW5kbGViYXJzID0gJEhhbmRsZWJhcnM7XG4gICAgfVxuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uO1xuXG4vLyBUT0RPOiBSZW1vdmUgdGhpcyBsaW5lIGFuZCBicmVhayB1cCBjb21waWxlUGFydGlhbFxuXG5leHBvcnRzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG5leHBvcnRzLndyYXBQcm9ncmFtID0gd3JhcFByb2dyYW07XG5leHBvcnRzLnJlc29sdmVQYXJ0aWFsID0gcmVzb2x2ZVBhcnRpYWw7XG5leHBvcnRzLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO1xuZXhwb3J0cy5ub29wID0gbm9vcDtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBVdGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5DT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gJyArICdQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgcnVudGltZVZlcnNpb25zICsgJykgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uICgnICsgY29tcGlsZXJWZXJzaW9ucyArICcpLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuICcgKyAnUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgY29tcGlsZXJJbmZvWzFdICsgJykuJyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ05vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZScpO1xuICB9XG4gIGlmICghdGVtcGxhdGVTcGVjIHx8ICF0ZW1wbGF0ZVNwZWMubWFpbikge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdVbmtub3duIHRlbXBsYXRlIG9iamVjdDogJyArIHR5cGVvZiB0ZW1wbGF0ZVNwZWMpO1xuICB9XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgZW52LlZNLmNoZWNrUmV2aXNpb24odGVtcGxhdGVTcGVjLmNvbXBpbGVyKTtcblxuICBmdW5jdGlvbiBpbnZva2VQYXJ0aWFsV3JhcHBlcihwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMuaGFzaCkge1xuICAgICAgY29udGV4dCA9IFV0aWxzLmV4dGVuZCh7fSwgY29udGV4dCwgb3B0aW9ucy5oYXNoKTtcbiAgICB9XG5cbiAgICBwYXJ0aWFsID0gZW52LlZNLnJlc29sdmVQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgdmFyIHJlc3VsdCA9IGVudi5WTS5pbnZva2VQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgY29udGV4dCwgb3B0aW9ucyk7XG5cbiAgICBpZiAocmVzdWx0ID09IG51bGwgJiYgZW52LmNvbXBpbGUpIHtcbiAgICAgIG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHRlbXBsYXRlU3BlYy5jb21waWxlck9wdGlvbnMsIGVudik7XG4gICAgICByZXN1bHQgPSBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgIT0gbnVsbCkge1xuICAgICAgaWYgKG9wdGlvbnMuaW5kZW50KSB7XG4gICAgICAgIHZhciBsaW5lcyA9IHJlc3VsdC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGluZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCFsaW5lc1tpXSAmJiBpICsgMSA9PT0gbCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGluZXNbaV0gPSBvcHRpb25zLmluZGVudCArIGxpbmVzW2ldO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9IGxpbmVzLmpvaW4oJ1xcbicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RoZSBwYXJ0aWFsICcgKyBvcHRpb25zLm5hbWUgKyAnIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGUnKTtcbiAgICB9XG4gIH1cblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIHN0cmljdDogZnVuY3Rpb24gc3RyaWN0KG9iaiwgbmFtZSkge1xuICAgICAgaWYgKCEobmFtZSBpbiBvYmopKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdcIicgKyBuYW1lICsgJ1wiIG5vdCBkZWZpbmVkIGluICcgKyBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9ialtuYW1lXTtcbiAgICB9LFxuICAgIGxvb2t1cDogZnVuY3Rpb24gbG9va3VwKGRlcHRocywgbmFtZSkge1xuICAgICAgdmFyIGxlbiA9IGRlcHRocy5sZW5ndGg7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChkZXB0aHNbaV0gJiYgZGVwdGhzW2ldW25hbWVdICE9IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gZGVwdGhzW2ldW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBsYW1iZGE6IGZ1bmN0aW9uIGxhbWJkYShjdXJyZW50LCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIGN1cnJlbnQgPT09ICdmdW5jdGlvbicgPyBjdXJyZW50LmNhbGwoY29udGV4dCkgOiBjdXJyZW50O1xuICAgIH0sXG5cbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIGludm9rZVBhcnRpYWw6IGludm9rZVBhcnRpYWxXcmFwcGVyLFxuXG4gICAgZm46IGZ1bmN0aW9uIGZuKGkpIHtcbiAgICAgIHJldHVybiB0ZW1wbGF0ZVNwZWNbaV07XG4gICAgfSxcblxuICAgIHByb2dyYW1zOiBbXSxcbiAgICBwcm9ncmFtOiBmdW5jdGlvbiBwcm9ncmFtKGksIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0sXG4gICAgICAgICAgZm4gPSB0aGlzLmZuKGkpO1xuICAgICAgaWYgKGRhdGEgfHwgZGVwdGhzIHx8IGJsb2NrUGFyYW1zIHx8IGRlY2xhcmVkQmxvY2tQYXJhbXMpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uIGRhdGEodmFsdWUsIGRlcHRoKSB7XG4gICAgICB3aGlsZSAodmFsdWUgJiYgZGVwdGgtLSkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLl9wYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24gbWVyZ2UocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIG9iaiA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiBwYXJhbSAhPT0gY29tbW9uKSB7XG4gICAgICAgIG9iaiA9IFV0aWxzLmV4dGVuZCh7fSwgY29tbW9uLCBwYXJhbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSxcblxuICAgIG5vb3A6IGVudi5WTS5ub29wLFxuICAgIGNvbXBpbGVySW5mbzogdGVtcGxhdGVTcGVjLmNvbXBpbGVyXG4gIH07XG5cbiAgZnVuY3Rpb24gcmV0KGNvbnRleHQpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMV07XG5cbiAgICB2YXIgZGF0YSA9IG9wdGlvbnMuZGF0YTtcblxuICAgIHJldC5fc2V0dXAob3B0aW9ucyk7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwgJiYgdGVtcGxhdGVTcGVjLnVzZURhdGEpIHtcbiAgICAgIGRhdGEgPSBpbml0RGF0YShjb250ZXh0LCBkYXRhKTtcbiAgICB9XG4gICAgdmFyIGRlcHRocyA9IHVuZGVmaW5lZCxcbiAgICAgICAgYmxvY2tQYXJhbXMgPSB0ZW1wbGF0ZVNwZWMudXNlQmxvY2tQYXJhbXMgPyBbXSA6IHVuZGVmaW5lZDtcbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocykge1xuICAgICAgZGVwdGhzID0gb3B0aW9ucy5kZXB0aHMgPyBbY29udGV4dF0uY29uY2F0KG9wdGlvbnMuZGVwdGhzKSA6IFtjb250ZXh0XTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGVtcGxhdGVTcGVjLm1haW4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICB9XG4gIHJldC5pc1RvcCA9IHRydWU7XG5cbiAgcmV0Ll9zZXR1cCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMuaGVscGVycywgZW52LmhlbHBlcnMpO1xuXG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZVBhcnRpYWwpIHtcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMucGFydGlhbHMsIGVudi5wYXJ0aWFscyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG4gIH07XG5cbiAgcmV0Ll9jaGlsZCA9IGZ1bmN0aW9uIChpLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyAmJiAhYmxvY2tQYXJhbXMpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdtdXN0IHBhc3MgYmxvY2sgcGFyYW1zJyk7XG4gICAgfVxuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzICYmICFkZXB0aHMpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdtdXN0IHBhc3MgcGFyZW50IGRlcHRocycpO1xuICAgIH1cblxuICAgIHJldHVybiB3cmFwUHJvZ3JhbShjb250YWluZXIsIGksIHRlbXBsYXRlU3BlY1tpXSwgZGF0YSwgMCwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gIH07XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIHdyYXBQcm9ncmFtKGNvbnRhaW5lciwgaSwgZm4sIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgZnVuY3Rpb24gcHJvZyhjb250ZXh0KSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzFdO1xuXG4gICAgcmV0dXJuIGZuLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEgfHwgZGF0YSwgYmxvY2tQYXJhbXMgJiYgW29wdGlvbnMuYmxvY2tQYXJhbXNdLmNvbmNhdChibG9ja1BhcmFtcyksIGRlcHRocyAmJiBbY29udGV4dF0uY29uY2F0KGRlcHRocykpO1xuICB9XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSBkZXB0aHMgPyBkZXB0aHMubGVuZ3RoIDogMDtcbiAgcHJvZy5ibG9ja1BhcmFtcyA9IGRlY2xhcmVkQmxvY2tQYXJhbXMgfHwgMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgaWYgKCFwYXJ0aWFsKSB7XG4gICAgcGFydGlhbCA9IG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXTtcbiAgfSBlbHNlIGlmICghcGFydGlhbC5jYWxsICYmICFvcHRpb25zLm5hbWUpIHtcbiAgICAvLyBUaGlzIGlzIGEgZHluYW1pYyBwYXJ0aWFsIHRoYXQgcmV0dXJuZWQgYSBzdHJpbmdcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJ0aWFsO1xuICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW3BhcnRpYWxdO1xuICB9XG4gIHJldHVybiBwYXJ0aWFsO1xufVxuXG5mdW5jdGlvbiBpbnZva2VQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucy5wYXJ0aWFsID0gdHJ1ZTtcblxuICBpZiAocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RoZSBwYXJ0aWFsICcgKyBvcHRpb25zLm5hbWUgKyAnIGNvdWxkIG5vdCBiZSBmb3VuZCcpO1xuICB9IGVsc2UgaWYgKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7XG4gIHJldHVybiAnJztcbn1cblxuZnVuY3Rpb24gaW5pdERhdGEoY29udGV4dCwgZGF0YSkge1xuICBpZiAoIWRhdGEgfHwgISgncm9vdCcgaW4gZGF0YSkpIHtcbiAgICBkYXRhID0gZGF0YSA/IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLmNyZWF0ZUZyYW1lKGRhdGEpIDoge307XG4gICAgZGF0YS5yb290ID0gY29udGV4dDtcbiAgfVxuICByZXR1cm4gZGF0YTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gU2FmZVN0cmluZy5wcm90b3R5cGUudG9IVE1MID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJycgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IFNhZmVTdHJpbmc7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLmV4dGVuZCA9IGV4dGVuZDtcblxuLy8gT2xkZXIgSUUgdmVyc2lvbnMgZG8gbm90IGRpcmVjdGx5IHN1cHBvcnQgaW5kZXhPZiBzbyB3ZSBtdXN0IGltcGxlbWVudCBvdXIgb3duLCBzYWRseS5cbmV4cG9ydHMuaW5kZXhPZiA9IGluZGV4T2Y7XG5leHBvcnRzLmVzY2FwZUV4cHJlc3Npb24gPSBlc2NhcGVFeHByZXNzaW9uO1xuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTtcbmV4cG9ydHMuYmxvY2tQYXJhbXMgPSBibG9ja1BhcmFtcztcbmV4cG9ydHMuYXBwZW5kQ29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aDtcbnZhciBlc2NhcGUgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgJ1xcJyc6ICcmI3gyNzsnLFxuICAnYCc6ICcmI3g2MDsnXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2csXG4gICAgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxuZnVuY3Rpb24gZXNjYXBlQ2hhcihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqIC8qICwgLi4uc291cmNlICovKSB7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhcmd1bWVudHNbaV0sIGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG4vKmVzbGludC1kaXNhYmxlIGZ1bmMtc3R5bGUsIG5vLXZhciAqL1xudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuaWYgKGlzRnVuY3Rpb24oL3gvKSkge1xuICBleHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbnZhciBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbi8qZXNsaW50LWVuYWJsZSBmdW5jLXN0eWxlLCBuby12YXIgKi9cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtleHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpbmRleE9mKGFycmF5LCB2YWx1ZSkge1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoYXJyYXlbaV0gPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVFeHByZXNzaW9uKHN0cmluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyAmJiBzdHJpbmcudG9IVE1MKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvSFRNTCgpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9IGVsc2UgaWYgKCFzdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcgKyAnJztcbiAgICB9XG5cbiAgICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgICBzdHJpbmcgPSAnJyArIHN0cmluZztcbiAgfVxuXG4gIGlmICghcG9zc2libGUudGVzdChzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZztcbiAgfVxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xufVxuXG5mdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gYmxvY2tQYXJhbXMocGFyYW1zLCBpZHMpIHtcbiAgcGFyYW1zLnBhdGggPSBpZHM7XG4gIHJldHVybiBwYXJhbXM7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZENvbnRleHRQYXRoKGNvbnRleHRQYXRoLCBpZCkge1xuICByZXR1cm4gKGNvbnRleHRQYXRoID8gY29udGV4dFBhdGggKyAnLicgOiAnJykgKyBpZDtcbn0iLCIvLyBDcmVhdGUgYSBzaW1wbGUgcGF0aCBhbGlhcyB0byBhbGxvdyBicm93c2VyaWZ5IHRvIHJlc29sdmVcbi8vIHRoZSBydW50aW1lIG9uIGEgc3VwcG9ydGVkIHBhdGguXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lJylbJ2RlZmF1bHQnXTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKVtcImRlZmF1bHRcIl07XG4iLCJ2YXIgYmFzZVRvU3RyaW5nID0gcmVxdWlyZSgnLi4vaW50ZXJuYWwvYmFzZVRvU3RyaW5nJyk7XG5cbi8qKlxuICogQ2FwaXRhbGl6ZXMgdGhlIGZpcnN0IGNoYXJhY3RlciBvZiBgc3RyaW5nYC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFN0cmluZ1xuICogQHBhcmFtIHtzdHJpbmd9IFtzdHJpbmc9JyddIFRoZSBzdHJpbmcgdG8gY2FwaXRhbGl6ZS5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGNhcGl0YWxpemVkIHN0cmluZy5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5jYXBpdGFsaXplKCdmcmVkJyk7XG4gKiAvLyA9PiAnRnJlZCdcbiAqL1xuZnVuY3Rpb24gY2FwaXRhbGl6ZShzdHJpbmcpIHtcbiAgc3RyaW5nID0gYmFzZVRvU3RyaW5nKHN0cmluZyk7XG4gIHJldHVybiBzdHJpbmcgJiYgKHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0cmluZy5zbGljZSgxKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2FwaXRhbGl6ZTtcbiIsIi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBhIHN0cmluZyBpZiBpdCdzIG5vdCBvbmUuIEFuIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZFxuICogZm9yIGBudWxsYCBvciBgdW5kZWZpbmVkYCB2YWx1ZXMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGJhc2VUb1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT0gbnVsbCA/ICcnIDogKHZhbHVlICsgJycpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VUb1N0cmluZztcbiIsIi8vIEF2b2lkIGNvbnNvbGUgZXJyb3JzIGZvciB0aGUgSUUgY3JhcHB5IGJyb3dzZXJzXG5pZiAoICEgd2luZG93LmNvbnNvbGUgKSBjb25zb2xlID0geyBsb2c6IGZ1bmN0aW9uKCl7fSB9O1xuXG5pbXBvcnQgQXBwIGZyb20gJ0FwcCdcbmltcG9ydCAkIGZyb20gJ2pxdWVyeSdcbmltcG9ydCBUd2Vlbk1heCBmcm9tICdnc2FwJ1xuaW1wb3J0IHJhZiBmcm9tICdyYWYnXG5pbXBvcnQgcGl4aSBmcm9tICdwaXhpLmpzJ1xuaW1wb3J0IHdoZWVsIGZyb20gJ2pxdWVyeS1tb3VzZXdoZWVsJ1xuXG53aW5kb3cualF1ZXJ5ID0gd2luZG93LiQgPSAkXG5cbndoZWVsKCQpXG5cbi8vIFN0YXJ0IEFwcFxudmFyIGFwcCA9IG5ldyBBcHAoKVxuYXBwLmluaXQoKVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBUZW1wbGF0ZSBmcm9tICdBcHBUZW1wbGF0ZSdcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuaW1wb3J0IEdFdmVudHMgZnJvbSAnR2xvYmFsRXZlbnRzJ1xuaW1wb3J0IFBvb2wgZnJvbSAnUG9vbCdcbmltcG9ydCBQcmVsb2FkZXIgZnJvbSAnUHJlbG9hZGVyJ1xuXG5jbGFzcyBBcHAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0fVxuXHRpbml0KCkge1xuXG5cdFx0dmFyIG1vYmlsZWNoZWNrID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgY2hlY2sgPSBmYWxzZTtcblx0XHRcdChmdW5jdGlvbihhKXtpZigvKGFuZHJvaWR8YmJcXGQrfG1lZWdvKS4rbW9iaWxlfGF2YW50Z298YmFkYVxcL3xibGFja2JlcnJ5fGJsYXplcnxjb21wYWx8ZWxhaW5lfGZlbm5lY3xoaXB0b3B8aWVtb2JpbGV8aXAoaG9uZXxvZCl8aXJpc3xraW5kbGV8bGdlIHxtYWVtb3xtaWRwfG1tcHxtb2JpbGUuK2ZpcmVmb3h8bmV0ZnJvbnR8b3BlcmEgbShvYnxpbilpfHBhbG0oIG9zKT98cGhvbmV8cChpeGl8cmUpXFwvfHBsdWNrZXJ8cG9ja2V0fHBzcHxzZXJpZXMoNHw2KTB8c3ltYmlhbnx0cmVvfHVwXFwuKGJyb3dzZXJ8bGluayl8dm9kYWZvbmV8d2FwfHdpbmRvd3MgY2V8eGRhfHhpaW5vL2kudGVzdChhKXx8LzEyMDd8NjMxMHw2NTkwfDNnc298NHRocHw1MFsxLTZdaXw3NzBzfDgwMnN8YSB3YXxhYmFjfGFjKGVyfG9vfHNcXC0pfGFpKGtvfHJuKXxhbChhdnxjYXxjbyl8YW1vaXxhbihleHxueXx5dyl8YXB0dXxhcihjaHxnbyl8YXModGV8dXMpfGF0dHd8YXUoZGl8XFwtbXxyIHxzICl8YXZhbnxiZShja3xsbHxucSl8YmkobGJ8cmQpfGJsKGFjfGF6KXxicihlfHYpd3xidW1ifGJ3XFwtKG58dSl8YzU1XFwvfGNhcGl8Y2N3YXxjZG1cXC18Y2VsbHxjaHRtfGNsZGN8Y21kXFwtfGNvKG1wfG5kKXxjcmF3fGRhKGl0fGxsfG5nKXxkYnRlfGRjXFwtc3xkZXZpfGRpY2F8ZG1vYnxkbyhjfHApb3xkcygxMnxcXC1kKXxlbCg0OXxhaSl8ZW0obDJ8dWwpfGVyKGljfGswKXxlc2w4fGV6KFs0LTddMHxvc3x3YXx6ZSl8ZmV0Y3xmbHkoXFwtfF8pfGcxIHV8ZzU2MHxnZW5lfGdmXFwtNXxnXFwtbW98Z28oXFwud3xvZCl8Z3IoYWR8dW4pfGhhaWV8aGNpdHxoZFxcLShtfHB8dCl8aGVpXFwtfGhpKHB0fHRhKXxocCggaXxpcCl8aHNcXC1jfGh0KGMoXFwtfCB8X3xhfGd8cHxzfHQpfHRwKXxodShhd3x0Yyl8aVxcLSgyMHxnb3xtYSl8aTIzMHxpYWMoIHxcXC18XFwvKXxpYnJvfGlkZWF8aWcwMXxpa29tfGltMWt8aW5ub3xpcGFxfGlyaXN8amEodHx2KWF8amJyb3xqZW11fGppZ3N8a2RkaXxrZWppfGtndCggfFxcLyl8a2xvbnxrcHQgfGt3Y1xcLXxreW8oY3xrKXxsZShub3x4aSl8bGcoIGd8XFwvKGt8bHx1KXw1MHw1NHxcXC1bYS13XSl8bGlid3xseW54fG0xXFwtd3xtM2dhfG01MFxcL3xtYSh0ZXx1aXx4byl8bWMoMDF8MjF8Y2EpfG1cXC1jcnxtZShyY3xyaSl8bWkobzh8b2F8dHMpfG1tZWZ8bW8oMDF8MDJ8Yml8ZGV8ZG98dChcXC18IHxvfHYpfHp6KXxtdCg1MHxwMXx2ICl8bXdicHxteXdhfG4xMFswLTJdfG4yMFsyLTNdfG4zMCgwfDIpfG41MCgwfDJ8NSl8bjcoMCgwfDEpfDEwKXxuZSgoY3xtKVxcLXxvbnx0Znx3Znx3Z3x3dCl8bm9rKDZ8aSl8bnpwaHxvMmltfG9wKHRpfHd2KXxvcmFufG93ZzF8cDgwMHxwYW4oYXxkfHQpfHBkeGd8cGcoMTN8XFwtKFsxLThdfGMpKXxwaGlsfHBpcmV8cGwoYXl8dWMpfHBuXFwtMnxwbyhja3xydHxzZSl8cHJveHxwc2lvfHB0XFwtZ3xxYVxcLWF8cWMoMDd8MTJ8MjF8MzJ8NjB8XFwtWzItN118aVxcLSl8cXRla3xyMzgwfHI2MDB8cmFrc3xyaW05fHJvKHZlfHpvKXxzNTVcXC98c2EoZ2V8bWF8bW18bXN8bnl8dmEpfHNjKDAxfGhcXC18b298cFxcLSl8c2RrXFwvfHNlKGMoXFwtfDB8MSl8NDd8bWN8bmR8cmkpfHNnaFxcLXxzaGFyfHNpZShcXC18bSl8c2tcXC0wfHNsKDQ1fGlkKXxzbShhbHxhcnxiM3xpdHx0NSl8c28oZnR8bnkpfHNwKDAxfGhcXC18dlxcLXx2ICl8c3koMDF8bWIpfHQyKDE4fDUwKXx0NigwMHwxMHwxOCl8dGEoZ3R8bGspfHRjbFxcLXx0ZGdcXC18dGVsKGl8bSl8dGltXFwtfHRcXC1tb3x0byhwbHxzaCl8dHMoNzB8bVxcLXxtM3xtNSl8dHhcXC05fHVwKFxcLmJ8ZzF8c2kpfHV0c3R8djQwMHx2NzUwfHZlcml8dmkocmd8dGUpfHZrKDQwfDVbMC0zXXxcXC12KXx2bTQwfHZvZGF8dnVsY3x2eCg1Mnw1M3w2MHw2MXw3MHw4MHw4MXw4M3w4NXw5OCl8dzNjKFxcLXwgKXx3ZWJjfHdoaXR8d2koZyB8bmN8bncpfHdtbGJ8d29udXx4NzAwfHlhc1xcLXx5b3VyfHpldG98enRlXFwtL2kudGVzdChhLnN1YnN0cigwLDQpKSljaGVjayA9IHRydWV9KShuYXZpZ2F0b3IudXNlckFnZW50fHxuYXZpZ2F0b3IudmVuZG9yfHx3aW5kb3cub3BlcmEpO1xuXHRcdFx0cmV0dXJuIGNoZWNrO1xuXHRcdH1cblxuXHRcdEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlID0gbW9iaWxlY2hlY2soKVxuXHRcdC8vIEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlID0gdHJ1ZVxuXHRcdC8vIGNvbnNvbGUubG9nKEFwcFN0b3JlLkRldGVjdG9yKVxuXG5cdFx0Ly8gSW5pdCBQcmVsb2FkZXJcblx0XHRBcHBTdG9yZS5QcmVsb2FkZXIgPSBuZXcgUHJlbG9hZGVyKClcblxuXHRcdC8vIEluaXQgUG9vbFxuXHRcdEFwcFN0b3JlLlBvb2wgPSBuZXcgUG9vbCgpXG5cblx0XHQvLyBJbml0IHJvdXRlclxuXHRcdHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpXG5cdFx0dGhpcy5yb3V0ZXIuaW5pdCgpXG5cblx0XHQvLyBJbml0IGdsb2JhbCBldmVudHNcblx0XHR3aW5kb3cuR2xvYmFsRXZlbnRzID0gbmV3IEdFdmVudHMoKVxuXHRcdEdsb2JhbEV2ZW50cy5pbml0KClcblxuXHRcdHZhciBhcHBUZW1wbGF0ZSA9IG5ldyBBcHBUZW1wbGF0ZSgpXG5cdFx0dGhpcy50ZW1wbGF0ZUlzUmVhZHkgPSB0aGlzLnRlbXBsYXRlSXNSZWFkeS5iaW5kKHRoaXMpXG5cdFx0YXBwVGVtcGxhdGUuaXNSZWFkeSA9IHRoaXMudGVtcGxhdGVJc1JlYWR5XG5cdFx0YXBwVGVtcGxhdGUucmVuZGVyKCcjYXBwLWNvbnRhaW5lcicpXG5cdH1cblx0dGVtcGxhdGVJc1JlYWR5KCkge1xuXHRcdC8vIFN0YXJ0IHJvdXRpbmdcblx0XHR0aGlzLnJvdXRlci5iZWdpblJvdXRpbmcoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFwcFxuICAgIFx0XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IEZyb250Q29udGFpbmVyIGZyb20gJ0Zyb250Q29udGFpbmVyJ1xuaW1wb3J0IFBhZ2VzQ29udGFpbmVyIGZyb20gJ1BhZ2VzQ29udGFpbmVyJ1xuaW1wb3J0IFBYQ29udGFpbmVyIGZyb20gJ1BYQ29udGFpbmVyJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuXG5jbGFzcyBBcHBUZW1wbGF0ZSBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5pc1JlYWR5ID0gdW5kZWZpbmVkXG5cdFx0QXBwU3RvcmUub24oQXBwQ29uc3RhbnRzLldJTkRPV19SRVNJWkUsIHRoaXMucmVzaXplKVxuXHR9XG5cdHJlbmRlcihwYXJlbnQpIHtcblx0XHRzdXBlci5yZW5kZXIoJ0FwcFRlbXBsYXRlJywgcGFyZW50LCB1bmRlZmluZWQpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5mcm9udENvbnRhaW5lciA9IG5ldyBGcm9udENvbnRhaW5lcigpXG5cdFx0dGhpcy5mcm9udENvbnRhaW5lci5yZW5kZXIoJyNhcHAtdGVtcGxhdGUnKVxuXG5cdFx0dGhpcy5wYWdlc0NvbnRhaW5lciA9IG5ldyBQYWdlc0NvbnRhaW5lcigpXG5cdFx0dGhpcy5wYWdlc0NvbnRhaW5lci5yZW5kZXIoJyNhcHAtdGVtcGxhdGUnKVxuXG5cdFx0dGhpcy5weENvbnRhaW5lciA9IG5ldyBQWENvbnRhaW5lcigpXG5cdFx0dGhpcy5weENvbnRhaW5lci5pbml0KCcjYXBwLXRlbXBsYXRlJylcblx0XHRBcHBBY3Rpb25zLnB4Q29udGFpbmVySXNSZWFkeSh0aGlzLnB4Q29udGFpbmVyKVxuXG5cdFx0R2xvYmFsRXZlbnRzLnJlc2l6ZSgpXG5cblx0XHR0aGlzLmFuaW1hdGUoKVxuXG5cdFx0c2V0VGltZW91dCgoKT0+e3RoaXMuaXNSZWFkeSgpfSwgMClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cblx0YW5pbWF0ZSgpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRlKVxuXHQgICAgdGhpcy5weENvbnRhaW5lci51cGRhdGUoKVxuXHQgICAgdGhpcy5wYWdlc0NvbnRhaW5lci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR0aGlzLmZyb250Q29udGFpbmVyLnJlc2l6ZSgpXG5cdFx0dGhpcy5weENvbnRhaW5lci5yZXNpemUoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFwcFRlbXBsYXRlXG4iLCJpbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBEaXNwYXRjaGVyIGZyb20gJ0FwcERpc3BhdGNoZXInXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmZ1bmN0aW9uIF9wcm9jZWVkSGFzaGVyQ2hhbmdlQWN0aW9uKHBhZ2VJZCkge1xuICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VELFxuICAgICAgICBpdGVtOiBwYWdlSWRcbiAgICB9KSAgXG59XG52YXIgQXBwQWN0aW9ucyA9IHtcbiAgICBwYWdlSGFzaGVyQ2hhbmdlZDogZnVuY3Rpb24ocGFnZUlkKSB7XG4gICAgICAgIHZhciBtYW5pZmVzdCA9IEFwcFN0b3JlLnBhZ2VBc3NldHNUb0xvYWQoKVxuICAgICAgICBpZihtYW5pZmVzdC5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICBfcHJvY2VlZEhhc2hlckNoYW5nZUFjdGlvbihwYWdlSWQpXG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgQXBwU3RvcmUuUHJlbG9hZGVyLmxvYWQobWFuaWZlc3QsICgpPT57XG4gICAgICAgICAgICAgICAgX3Byb2NlZWRIYXNoZXJDaGFuZ2VBY3Rpb24ocGFnZUlkKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH0sXG4gICAgd2luZG93UmVzaXplOiBmdW5jdGlvbih3aW5kb3dXLCB3aW5kb3dIKSB7XG4gICAgICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuV0lORE9XX1JFU0laRSxcbiAgICAgICAgICAgIGl0ZW06IHsgd2luZG93Vzp3aW5kb3dXLCB3aW5kb3dIOndpbmRvd0ggfVxuICAgICAgICB9KVxuICAgIH0sXG4gICAgcHhDb250YWluZXJJc1JlYWR5OiBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfSVNfUkVBRFksXG4gICAgICAgICAgICBpdGVtOiBjb21wb25lbnRcbiAgICAgICAgfSkgICAgICAgICAgICBcbiAgICB9LFxuICAgIHB4QWRkQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0FERF9DSElMRCxcbiAgICAgICAgICAgIGl0ZW06IHtjaGlsZDogY2hpbGR9XG4gICAgICAgIH0pICAgICAgICAgICAgXG4gICAgfSxcbiAgICBweFJlbW92ZUNoaWxkOiBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQsXG4gICAgICAgICAgICBpdGVtOiB7Y2hpbGQ6IGNoaWxkfVxuICAgICAgICB9KSAgICAgICAgICAgIFxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQXBwQWN0aW9uc1xuXG5cbiAgICAgIFxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcnJvd0J0biB7XG5cdGNvbnN0cnVjdG9yKGVsZW1lbnQsIGRpcmVjdGlvbikge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcblx0XHR0aGlzLmRpcmVjdGlvbiA9IGRpcmVjdGlvblxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMudGxPdmVyID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdHRoaXMudGxPdXQgPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdFx0dmFyIGtub3RzRWwgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5rbm90XCIpXG5cdFx0dmFyIGxpbmVzRWwgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5saW5lXCIpXG5cdFx0dmFyIHJhZGl1cyA9IDNcblx0XHR2YXIgbWFyZ2luID0gMzBcblx0XHR0aGlzLmxpbmVTaXplID0gQXBwU3RvcmUuZ2V0TGluZVdpZHRoKClcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwga25vdHNFbC5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSAkKGtub3RzRWxbaV0pXG5cdFx0XHRrbm90LmF0dHIoJ3InLCByYWRpdXMpXG5cdFx0fTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzRWwubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBsaW5lID0gJChsaW5lc0VsW2ldKVxuXHRcdFx0bGluZS5jc3MoJ3N0cm9rZS13aWR0aCcsIHRoaXMubGluZVNpemUpXG5cdFx0fTtcblxuXHRcdHZhciBzdGFydFggPSBtYXJnaW4gPj4gMVxuXHRcdHZhciBzdGFydFkgPSBtYXJnaW5cblx0XHR2YXIgb2Zmc2V0VXBEb3duID0gMC42XG5cdFx0JChrbm90c0VsLmdldCgwKSkuYXR0cih7XG5cdFx0XHQnY3gnOiBzdGFydFggKyAwLFxuXHRcdFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdH0pXG5cdFx0JChrbm90c0VsLmdldCgxKSkuYXR0cih7XG5cdFx0XHQnY3gnOiBzdGFydFggKyBtYXJnaW4sXG5cdFx0XHQnY3knOiBzdGFydFkgKyAwXG5cdFx0fSlcblx0XHQkKGtub3RzRWwuZ2V0KDIpKS5hdHRyKHtcblx0XHRcdCdjeCc6IHN0YXJ0WCArIChtYXJnaW4qMiksXG5cdFx0XHQnY3knOiBzdGFydFkgKyAwXG5cdFx0fSlcblx0XHQkKGtub3RzRWwuZ2V0KDMpKS5hdHRyKHtcblx0XHRcdCdjeCc6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdFx0J2N5Jzogc3RhcnRZIC0gKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHR9KVxuXHRcdCQoa25vdHNFbC5nZXQoNCkpLmF0dHIoe1xuXHRcdFx0J2N4Jzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0XHQnY3knOiBzdGFydFkgKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdH0pXG5cdFx0JChsaW5lc0VsLmdldCgwKSkuYXR0cih7XG5cdFx0XHQneDEnOiBzdGFydFggKyAwLFxuXHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdCd4Mic6IHN0YXJ0WCArIG1hcmdpbixcblx0XHRcdCd5Mic6IHN0YXJ0WSArIDBcblx0XHR9KVxuXHRcdCQobGluZXNFbC5nZXQoMSkpLmF0dHIoe1xuXHRcdFx0J3gxJzogc3RhcnRYICsgbWFyZ2luLFxuXHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdCd4Mic6IHN0YXJ0WCArIChtYXJnaW4qMiksXG5cdFx0XHQneTInOiBzdGFydFkgKyAwXG5cdFx0fSlcblx0XHQkKGxpbmVzRWwuZ2V0KDIpKS5hdHRyKHtcblx0XHRcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0XHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdFx0J3gyJzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0XHQneTInOiBzdGFydFkgLSAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdH0pXG5cdFx0JChsaW5lc0VsLmdldCgzKSkuYXR0cih7XG5cdFx0XHQneDEnOiBzdGFydFggKyAwLFxuXHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdCd4Mic6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdFx0J3kyJzogc3RhcnRZICsgKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHR9KVxuXG5cdFx0dmFyIG9mZnNldCA9IDEwXG5cdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFswXSwgMSwgeyB4Oi1vZmZzZXQrKHJhZGl1cyA+PiAxKSwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMV0sIDEsIHsgeDotb2Zmc2V0LCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFsyXSwgMSwgeyB4Oi1vZmZzZXQsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhsaW5lc0VsWzBdLCAxLCB7IHNjYWxlWDoxLjEsIHg6LW9mZnNldCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMV0sIDEsIHsgc2NhbGVYOjEuMSwgeDotb2Zmc2V0LCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFsyXSwgMSwgeyB4Oi1vZmZzZXQsIHJvdGF0aW9uOicxMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAxMDAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhsaW5lc0VsWzNdLCAxLCB7IHg6LW9mZnNldCwgcm90YXRpb246Jy0xMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFszXSwgMSwgeyB4Oi1vZmZzZXQvMiwgeToob2Zmc2V0LzIpLXJhZGl1cywgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbNF0sIDEsIHsgeDotb2Zmc2V0LzIsIHk6LShvZmZzZXQvMikrcmFkaXVzLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cblx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbMF0sIDEsIHsgeDowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhrbm90c0VsWzFdLCAxLCB7IHg6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFsyXSwgMSwgeyB4OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMF0sIDEsIHsgc2NhbGVYOjEsIHg6MCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdXQudG8obGluZXNFbFsxXSwgMSwgeyBzY2FsZVg6MSwgeDowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzJdLCAxLCB7IHg6MCwgcm90YXRpb246JzBkZWcnLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonMCUgMTAwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzNdLCAxLCB7IHg6MCwgcm90YXRpb246JzBkZWcnLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonMCUgMCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFszXSwgMSwgeyB4OjAsIHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFs0XSwgMSwgeyB4OjAsIHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXG5cdFx0c3dpdGNoKHRoaXMuZGlyZWN0aW9uKSB7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MRUZUOlxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuUklHSFQ6XG5cdFx0XHRcdFR3ZWVuTWF4LnNldCh0aGlzLmVsZW1lbnQsIHsgcm90YXRpb246JzE4MGRlZycsIHRyYW5zZm9ybU9yaWdpbjogJzUwJSA1MCUnIH0pXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5UT1A6XG5cdFx0XHRcdFR3ZWVuTWF4LnNldCh0aGlzLmVsZW1lbnQsIHsgcm90YXRpb246JzkwZGVnJywgdHJhbnNmb3JtT3JpZ2luOiAnNTAlIDUwJScgfSlcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkJPVFRPTTpcblx0XHRcdFx0VHdlZW5NYXguc2V0KHRoaXMuZWxlbWVudCwgeyByb3RhdGlvbjonLTkwZGVnJywgdHJhbnNmb3JtT3JpZ2luOiAnNTAlIDUwJScgfSlcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHR0aGlzLnRsT3Zlci5wYXVzZSgwKVxuXHRcdHRoaXMudGxPdXQucGF1c2UoMClcblxuXHRcdHRoaXMucm9sbG92ZXIgPSB0aGlzLnJvbGxvdmVyLmJpbmQodGhpcylcblx0XHR0aGlzLnJvbGxvdXQgPSB0aGlzLnJvbGxvdXQuYmluZCh0aGlzKVxuXHRcdHRoaXMuY2xpY2sgPSB0aGlzLmNsaWNrLmJpbmQodGhpcylcblx0XHR0aGlzLmVsZW1lbnQub24oJ21vdXNlZW50ZXInLCB0aGlzLnJvbGxvdmVyKVxuXHRcdHRoaXMuZWxlbWVudC5vbignbW91c2VsZWF2ZScsIHRoaXMucm9sbG91dClcblx0XHRpZih0aGlzLmJ0bkNsaWNrZWQgIT0gdW5kZWZpbmVkKSB0aGlzLmVsZW1lbnQub24oJ2NsaWNrJywgdGhpcy5jbGljaylcblxuXHRcdHRoaXMud2lkdGggPSBtYXJnaW4gKiAzXG5cdFx0dGhpcy5oZWlnaHQgPSBtYXJnaW4gKiAyXG5cdFx0dGhpcy5lbGVtZW50LmNzcyh7XG5cdFx0XHR3aWR0aDogdGhpcy53aWR0aCxcblx0XHRcdGhlaWdodDogdGhpcy5oZWlnaHRcblx0XHR9KVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLmVsZW1lbnQuY3NzKHtcblx0XHRcdGxlZnQ6IHgsXG5cdFx0XHR0b3A6IHlcblx0XHR9KVxuXHR9XG5cdGNsaWNrKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLmJ0bkNsaWNrZWQodGhpcy5kaXJlY3Rpb24pXG5cdH1cblx0cm9sbG91dChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5tb3VzZU91dCgpXHRcblx0fVxuXHRyb2xsb3ZlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5tb3VzZU92ZXIoKVx0XG5cdH1cblx0bW91c2VPdmVyKCkge1xuXHRcdHRoaXMudGxPdXQua2lsbCgpXG5cdFx0dGhpcy50bE92ZXIucGxheSgwKVxuXHR9XG5cdG1vdXNlT3V0KCkge1xuXHRcdHRoaXMudGxPdmVyLmtpbGwoKVxuXHRcdHRoaXMudGxPdXQucGxheSgwKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEFwcFN0b3JlLnJlbGVhc2VUaW1lbGluZSh0aGlzLnRsT3Zlcilcblx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bE91dClcblx0XHR0aGlzLmVsZW1lbnQub2ZmKCdtb3VzZWVudGVyJywgdGhpcy5yb2xsb3Zlcilcblx0XHR0aGlzLmVsZW1lbnQub2ZmKCdtb3VzZWxlYXZlJywgdGhpcy5yb2xsb3V0KVxuXHRcdHRoaXMuZWxlbWVudC5vZmYoJ2NsaWNrJywgdGhpcy5jbGljaylcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VQbGFuZXRQYWdlIGZyb20gJ0Jhc2VQbGFuZXRQYWdlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBTY3JvbGxCYXIgZnJvbSAnU2Nyb2xsQmFyJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCYXNlQ2FtcGFpZ25QYWdlIGV4dGVuZHMgQmFzZVBsYW5ldFBhZ2Uge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHByb3BzLmRhdGEuaXNNb2JpbGUgPSBBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZVxuXG5cdFx0c3VwZXIocHJvcHMpXG5cdFx0dGhpcy5weFNjcm9sbENvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnB4U2Nyb2xsQ29udGFpbmVyKVxuXHRcdHRoaXMucGFnZUhlaWdodCA9IDBcblx0XHR0aGlzLnNjcm9sbFRhcmdldCA9IDBcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnNjcm9sbEVsID0gdGhpcy5jaGlsZC5maW5kKFwiLmludGVyZmFjZS5hYnNvbHV0ZVwiKS5nZXQoMClcblxuXHRcdGlmKCFBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5vbldoZWVsID0gdGhpcy5vbldoZWVsLmJpbmQodGhpcylcblx0XHRcdCQod2luZG93KS5vbihcIm1vdXNld2hlZWxcIiwgdGhpcy5vbldoZWVsKVxuXHRcdFx0dGhpcy5zY3JvbGxUYXJnZXQgPSAwXG5cdFx0XHR0aGlzLmxhc3RTY3JvbGxZID0gMFxuXHRcdFx0dGhpcy5zY3JvbGxFYXNlID0gMC4xXG5cblx0XHRcdHRoaXMub25TY3JvbGxUYXJnZXQgPSB0aGlzLm9uU2Nyb2xsVGFyZ2V0LmJpbmQodGhpcylcblx0XHRcdHZhciBzY3JvbGxFbCA9IHRoaXMuY2hpbGQuZmluZCgnI3Njcm9sbGJhci12aWV3Jylcblx0XHRcdHRoaXMuc2Nyb2xsYmFyID0gbmV3IFNjcm9sbEJhcihzY3JvbGxFbClcblx0XHRcdHRoaXMuc2Nyb2xsYmFyLnNjcm9sbFRhcmdldEhhbmRsZXIgPSB0aGlzLm9uU2Nyb2xsVGFyZ2V0XG5cdFx0XHR0aGlzLnNjcm9sbGJhci5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0fVxuXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdH1cblx0b25TY3JvbGxUYXJnZXQodmFsKSB7XG5cdFx0dGhpcy5zY3JvbGxUYXJnZXRDaGFuZ2VkKHZhbClcblx0fVxuXHRzY3JvbGxUYXJnZXRDaGFuZ2VkKHZhbCkge1xuXHRcdHRoaXMuc2Nyb2xsVGFyZ2V0ID0gdmFsXG4gICAgICAgIHRoaXMuYXBwbHlTY3JvbGxCb3VuZHMoKVxuICAgICAgICB0aGlzLnNjcm9sbGJhci5zZXRTY3JvbGxUYXJnZXQodGhpcy5zY3JvbGxUYXJnZXQpXG5cdH1cblx0b25XaGVlbChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dmFyIGRlbHRhID0gZS53aGVlbERlbHRhXG5cdFx0dmFyIHZhbHVlID0gLShlLmRlbHRhWSAqIGUuZGVsdGFGYWN0b3IpXG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsVGFyZ2V0KHZhbHVlKVxuXHR9XG5cdHVwZGF0ZVNjcm9sbFRhcmdldCh2YWx1ZSkge1xuXHRcdHRoaXMuc2Nyb2xsVGFyZ2V0ICs9IHZhbHVlXG4gICAgICAgIHRoaXMuYXBwbHlTY3JvbGxCb3VuZHMoKVxuICAgICAgICB0aGlzLnNjcm9sbGJhci5zZXRTY3JvbGxUYXJnZXQodGhpcy5zY3JvbGxUYXJnZXQpXG5cdH1cblx0YXBwbHlTY3JvbGxCb3VuZHMoKSB7XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMuc2Nyb2xsVGFyZ2V0ID0gKHRoaXMuc2Nyb2xsVGFyZ2V0IDwgMCkgPyAwIDogdGhpcy5zY3JvbGxUYXJnZXRcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQgPSAodGhpcy5zY3JvbGxUYXJnZXQgKyB3aW5kb3dIID4gdGhpcy5wYWdlSGVpZ2h0KSA/ICh0aGlzLnBhZ2VIZWlnaHQgLSB3aW5kb3dIKSA6IHRoaXMuc2Nyb2xsVGFyZ2V0XG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdGlmKCFBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5sYXN0U2Nyb2xsWSArPSAodGhpcy5zY3JvbGxUYXJnZXQgLSB0aGlzLmxhc3RTY3JvbGxZKSAqIHRoaXMuc2Nyb2xsRWFzZVxuXHRcdFx0VXRpbHMuVHJhbnNsYXRlKHRoaXMuc2Nyb2xsRWwsIDAsIC10aGlzLmxhc3RTY3JvbGxZLCAwKVxuXHRcdFx0dGhpcy5weFNjcm9sbENvbnRhaW5lci55ID0gLXRoaXMubGFzdFNjcm9sbFlcblx0XHRcdHRoaXMuc2Nyb2xsYmFyLnVwZGF0ZSgpXG5cdFx0fVx0XG5cdH1cblx0cmVzaXplKCkge1xuXG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpICB7XG5cdFx0XHRzdXBlci5yZXNpemUoKVxuXHRcdH1lbHNle1xuXHRcdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdFx0dGhpcy5zY3JvbGxiYXIucGFnZUhlaWdodCA9IHRoaXMucGFnZUhlaWdodCAtIHdpbmRvd0hcblx0ICAgICAgICB0aGlzLnNjcm9sbGJhci5yZXNpemUoKVxuXHQgICAgICAgIHN1cGVyLnJlc2l6ZSgpXG5cdFx0fVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGlmKCFBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgdGhpcy5zY3JvbGxiYXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMucHhTY3JvbGxDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5weFNjcm9sbENvbnRhaW5lcilcblx0XHQkKHdpbmRvdykub2ZmKFwibW91c2V3aGVlbFwiLCB0aGlzLm9uV2hlZWwpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgUGFnZSBmcm9tICdQYWdlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZVBsYW5ldFBhZ2UgZXh0ZW5kcyBQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcylcblx0XHR0aGlzLmV4cGVyaWVuY2UgPSB1bmRlZmluZWRcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0aWYodGhpcy5leHBlcmllbmNlICE9IHVuZGVmaW5lZCkgdGhpcy5leHBlcmllbmNlLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFNwcmluZ0dhcmRlbiBmcm9tICdTcHJpbmdHYXJkZW4nXG5pbXBvcnQgQ29tcGFzc1JpbmdzIGZyb20gJ0NvbXBhc3NSaW5ncydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGFzcyB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCB0eXBlKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lciA9IHB4Q29udGFpbmVyXG5cdFx0dGhpcy50eXBlID0gdHlwZSB8fCBBcHBDb25zdGFudHMuTEFORElOR1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuY29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKVxuXG4gXHRcdHRoaXMucmluZ3MgPSBuZXcgQ29tcGFzc1JpbmdzKHRoaXMuY29udGFpbmVyKVxuXHQgXHR0aGlzLnJpbmdzLmNvbXBvbmVudERpZE1vdW50KClcblxuXHQgXHR0aGlzLnNwcmluZ0dhcmRlbnMgPSBbXVxuXHQgXHR0aGlzLmdldFJhZGl1cygpXG5cdH1cblx0dXBkYXRlRGF0YShkYXRhKSB7XG5cdFx0dGhpcy5yZW1vdmVQcmV2aW91c1NwcmluZ0dhcmRlbnMoKVxuXHRcdHRoaXMuc3ByaW5nR2FyZGVucyA9IFtdXG5cdFx0dmFyIHNwcmluZ0dhcmRlbldpdGhGaWxsID0gKHRoaXMudHlwZSA9PSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRSkgPyB0cnVlIDogZmFsc2Vcblx0XHQvLyB2YXIgc3ByaW5nR2FyZGVuSXNJbnRlcmFjdGl2ZSA9ICh0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UpID8gdHJ1ZSA6IGZhbHNlXG5cdFx0dmFyIHNwcmluZ0dhcmRlbklzSW50ZXJhY3RpdmUgPSBmYWxzZVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IEFwcFN0b3JlLmdldFNwcmluZ0dhcmRlbigpXG5cdFx0XHR2YXIgcHJvZHVjdCA9IGRhdGFbaV1cblx0XHRcdHZhciBjb2xvciA9IHByb2R1Y3QuY29sb3Jcblx0XHRcdHNwcmluZ0dhcmRlbi5pZCA9IHRoaXMuaWRcblx0XHRcdHNwcmluZ0dhcmRlbi5yYWRpdXMgPSB0aGlzLnJhZGl1c1xuXHRcdFx0c3ByaW5nR2FyZGVuLmtub3RSYWRpdXMgPSB0aGlzLmtub3RSYWRpdXNcblx0XHRcdHNwcmluZ0dhcmRlbi5jb21wb25lbnREaWRNb3VudChwcm9kdWN0LCBzcHJpbmdHYXJkZW5XaXRoRmlsbCwgc3ByaW5nR2FyZGVuSXNJbnRlcmFjdGl2ZSwgdGhpcy50eXBlKVxuXHRcdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQoc3ByaW5nR2FyZGVuLmNvbnRhaW5lcilcblx0XHRcdHRoaXMuc3ByaW5nR2FyZGVuc1tpXSA9IHNwcmluZ0dhcmRlblxuXHRcdH1cblx0fVxuXHRyZW1vdmVQcmV2aW91c1NwcmluZ0dhcmRlbnMoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSB0aGlzLnNwcmluZ0dhcmRlbnNbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi5jbGVhcigpXG5cdFx0XHRzcHJpbmdHYXJkZW4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdFx0QXBwU3RvcmUucmVsZWFzZVNwcmluZ0dhcmRlbihzcHJpbmdHYXJkZW4pXG5cdFx0fVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoIDwgMSkgcmV0dXJuIFxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc3ByaW5nR2FyZGVucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IHRoaXMuc3ByaW5nR2FyZGVuc1tpXVxuXHRcdFx0c3ByaW5nR2FyZGVuLnVwZGF0ZSgpXG5cdFx0fVxuXHR9XG5cdGdldFJhZGl1cygpIHtcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIHNpemVQZXJjZW50YWdlID0gKHRoaXMudHlwZSA9PSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRSB8fCB0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkNBTVBBSUdOKSA/IEFwcENvbnN0YW50cy5DT01QQVNTX1NNQUxMX1NJWkVfUEVSQ0VOVEFHRSA6IEFwcENvbnN0YW50cy5DT01QQVNTX1NJWkVfUEVSQ0VOVEFHRVxuXHRcdHRoaXMucmFkaXVzID0gd2luZG93SCAqIHNpemVQZXJjZW50YWdlXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdH1cblx0d2lsbFRyYW5zaXRpb25PdXQoKSB7XG5cdH1cblx0dXBkYXRlUmFkaXVzKCkge1xuXHRcdHRoaXMuZ2V0UmFkaXVzKClcblx0XHR0aGlzLnJpbmdzLnJlc2l6ZSh0aGlzLnJhZGl1cylcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0aWYodGhpcy50eXBlID09IEFwcENvbnN0YW50cy5MQU5ESU5HKSB7XG5cdFx0XHR0aGlzLnVwZGF0ZVJhZGl1cygpXG5cdFx0fVxuXHRcdGlmKHRoaXMuc3ByaW5nR2FyZGVucy5sZW5ndGggPCAxKSByZXR1cm4gXG5cdCBcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zcHJpbmdHYXJkZW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc3ByaW5nR2FyZGVuID0gdGhpcy5zcHJpbmdHYXJkZW5zW2ldXG5cdFx0XHRzcHJpbmdHYXJkZW4ucmVzaXplKHRoaXMucmFkaXVzKVxuXHRcdH1cblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0dGhpcy5jb250YWluZXIueCA9IHhcblx0XHR0aGlzLmNvbnRhaW5lci55ID0geVxuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0cG9zaXRpb25FbGVtZW50KHgsIHkpIHtcblxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMuY29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMuY29udGFpbmVyKVxuXHRcdHRoaXMucmVtb3ZlUHJldmlvdXNTcHJpbmdHYXJkZW5zKClcblx0XHR0aGlzLnJpbmdzLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbXBhc3NSaW5ncyB7XG5cdGNvbnN0cnVjdG9yKHBhcmVudENvbnRhaW5lcikge1xuXHRcdHRoaXMuY29udGFpbmVyID0gcGFyZW50Q29udGFpbmVyXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5yaW5nc0NvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy50aXRsZXNDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMucmluZ3NDb250YWluZXIpXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy50aXRsZXNDb250YWluZXIpXG5cblx0XHR0aGlzLmNpcmNsZXMgPSBbXVxuXHRcdHZhciBjaWNsZXNMZW4gPSA2XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjaWNsZXNMZW47IGkrKykge1xuXHRcdFx0dmFyIGcgPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0XHR0aGlzLmNpcmNsZXNbaV0gPSBnXG5cdFx0XHR0aGlzLnJpbmdzQ29udGFpbmVyLmFkZENoaWxkKGcpXG5cdFx0fVxuXG5cdFx0dGhpcy50aXRsZXMgPSBbXVxuXHRcdHZhciBnbG9iYWxDb250ZW50ID0gQXBwU3RvcmUuZ2xvYmFsQ29udGVudCgpXG5cdFx0dmFyIGVsZW1lbnRzID0gQXBwU3RvcmUuZWxlbWVudHNPZk5hdHVyZSgpXG5cdFx0dmFyIGVsZW1lbnRzVGV4dHMgPSBnbG9iYWxDb250ZW50LmVsZW1lbnRzXG5cdFx0dmFyIGZvbnRTaXplID0gMjZcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBlbGVtZW50SWQgPSBlbGVtZW50c1tpXVxuXHRcdFx0dmFyIGVsZW1lbnRUaXRsZSA9IGVsZW1lbnRzVGV4dHNbZWxlbWVudElkXS50b1VwcGVyQ2FzZSgpXG5cdFx0XHR2YXIgdHh0ID0gbmV3IFBJWEkuVGV4dChlbGVtZW50VGl0bGUsIHsgZm9udDogZm9udFNpemUgKyAncHggRnV0dXJhQm9sZCcsIGZpbGw6ICd3aGl0ZScsIGFsaWduOiAnY2VudGVyJyB9KVxuXHRcdFx0dHh0LmFuY2hvci54ID0gMC41XG5cdFx0XHR0eHQuYW5jaG9yLnkgPSAwLjVcblx0XHRcdHRoaXMudGl0bGVzQ29udGFpbmVyLmFkZENoaWxkKHR4dClcblx0XHRcdHRoaXMudGl0bGVzLnB1c2goe1xuXHRcdFx0XHR0eHQ6IHR4dCxcblx0XHRcdFx0ZGVnQmVnaW46IHRoaXMuZ2V0RGVncmVlc0JlZ2luRm9yVGl0bGVzQnlJZChlbGVtZW50SWQpLFxuXHRcdFx0fSlcblx0XHR9XG5cblx0fVxuXHRnZXREZWdyZWVzQmVnaW5Gb3JUaXRsZXNCeUlkKGlkKSB7XG5cdFx0Ly8gYmUgY2FyZWZ1bCBzdGFydHMgZnJvbSBjZW50ZXIgLTkwZGVnXG5cdFx0c3dpdGNoKGlkKSB7XG5cdFx0XHRjYXNlICdmaXJlJzogcmV0dXJuIC0xMzBcblx0XHRcdGNhc2UgJ2VhcnRoJzogcmV0dXJuIC01MFxuXHRcdFx0Y2FzZSAnbWV0YWwnOiByZXR1cm4gMTVcblx0XHRcdGNhc2UgJ3dhdGVyJzogcmV0dXJuIDkwXG5cdFx0XHRjYXNlICd3b29kJzogcmV0dXJuIDE2NVxuXHRcdH1cblx0fVxuXHRkcmF3UmluZ3MoKSB7XG5cdFx0dmFyIHJhZGl1c01hcmdpbiA9IHRoaXMucmFkaXVzIC8gdGhpcy5jaXJjbGVzLmxlbmd0aFxuXHRcdHZhciBsZW4gPSB0aGlzLmNpcmNsZXMubGVuZ3RoICsgMVxuXHRcdHZhciBsYXN0Ujtcblx0XHR2YXIgbGluZVcgPSBBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKVxuXHRcdHZhciBjb2xvciA9IDB4ZmZmZmZmXG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0dmFyIGcgPSB0aGlzLmNpcmNsZXNbaS0xXVxuXHRcdFx0dmFyIHI7XG5cblx0XHRcdGcuY2xlYXIoKVxuXG5cdFx0XHQvLyByYWRpdXMgZGlmZmVyZW5jZXNcblx0XHRcdGlmKGkgPT0gMSkgciA9IHJhZGl1c01hcmdpbiAqIDAuMTZcblx0XHRcdGVsc2UgciA9IGxhc3RSICsgcmFkaXVzTWFyZ2luXG5cblx0XHRcdC8vIGxpbmVzXG5cdFx0XHRpZihpPT0zKSB7XG5cdFx0XHRcdHRoaXMuZHJhd0Fyb3VuZFRocmVlR3JvdXBMaW5lcyhsYXN0UiwgciwgZywgbGluZVcsIGNvbG9yKVxuXHRcdFx0fVxuXHRcdFx0aWYoaT09Nikge1xuXHRcdFx0XHR0aGlzLmRyYXdBcm91bmRGb3VyR3JvdXBMaW5lcyhsYXN0UiwgciwgZywgbGluZVcsIGNvbG9yKVxuXHRcdFx0XHR0aGlzLmRyYXdUaXRsZXMociwgY29sb3IpXG5cdFx0XHR9XG5cblx0XHRcdC8vIGNpcmNsZVxuXHRcdFx0dGhpcy5kcmF3Q2lyY2xlKGcsIHIpXG5cblx0XHRcdGxhc3RSID0gclxuXHRcdH1cblx0fVxuXHRkcmF3QXJvdW5kVGhyZWVHcm91cExpbmVzKGxhc3RSLCBuZXdSLCBnLCBsaW5lVywgY29sb3IpIHtcblx0XHR2YXIgbGVmdFRoZXRhID0gKDcgKiBNYXRoLlBJKSAvIDZcblx0XHR2YXIgcmlnaHRUaGV0YSA9ICgxMSAqIE1hdGguUEkpIC8gNlxuXHRcdFxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCAwLCAtbmV3UiwgMCwgLWxhc3RSKVxuXHRcdFxuXHRcdHZhciBmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhsZWZ0VGhldGEpXG5cdFx0dmFyIGZyb21ZID0gLW5ld1IgKiBNYXRoLnNpbihsZWZ0VGhldGEpXG5cdFx0dmFyIHRvWCA9IGxhc3RSICogTWF0aC5jb3MobGVmdFRoZXRhKVxuXHRcdHZhciB0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihsZWZ0VGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhyaWdodFRoZXRhKVxuXHRcdGZyb21ZID0gLW5ld1IgKiBNYXRoLnNpbihyaWdodFRoZXRhKVxuXHRcdHRvWCA9IGxhc3RSICogTWF0aC5jb3MocmlnaHRUaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihyaWdodFRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXHR9XG5cdGRyYXdBcm91bmRGb3VyR3JvdXBMaW5lcyhsYXN0UiwgbmV3UiwgZywgbGluZVcsIGNvbG9yKSB7XG5cdFx0dmFyIGxlZnRUb3BUaGV0YSA9ICgxMSAqIE1hdGguUEkpIC8gMTJcblx0XHR2YXIgcmlnaHRUb3BUaGV0YSA9IE1hdGguUEkgLyAxMlxuXG5cdFx0dmFyIGxlZnRCb3R0b21UaGV0YSA9ICg1ICogTWF0aC5QSSkgLyA0XG5cdFx0dmFyIHJpZ2h0Qm90dG9tVGhldGEgPSAoNyAqIE1hdGguUEkpIC8gNFxuXHRcdFxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCAwLCAtbmV3UiwgMCwgLWxhc3RSKVxuXHRcdFxuXHRcdHZhciBmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhsZWZ0VG9wVGhldGEpXG5cdFx0dmFyIGZyb21ZID0gLW5ld1IgKiBNYXRoLnNpbihsZWZ0VG9wVGhldGEpXG5cdFx0dmFyIHRvWCA9IGxhc3RSICogTWF0aC5jb3MobGVmdFRvcFRoZXRhKVxuXHRcdHZhciB0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihsZWZ0VG9wVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhyaWdodFRvcFRoZXRhKVxuXHRcdGZyb21ZID0gLW5ld1IgKiBNYXRoLnNpbihyaWdodFRvcFRoZXRhKVxuXHRcdHRvWCA9IGxhc3RSICogTWF0aC5jb3MocmlnaHRUb3BUaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihyaWdodFRvcFRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXG5cdFx0ZnJvbVggPSBuZXdSICogTWF0aC5jb3MobGVmdEJvdHRvbVRoZXRhKVxuXHRcdGZyb21ZID0gLW5ld1IgKiBNYXRoLnNpbihsZWZ0Qm90dG9tVGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhsZWZ0Qm90dG9tVGhldGEpXG5cdFx0dG9ZID0gLWxhc3RSICogTWF0aC5zaW4obGVmdEJvdHRvbVRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXG5cdFx0ZnJvbVggPSBuZXdSICogTWF0aC5jb3MocmlnaHRCb3R0b21UaGV0YSlcblx0XHRmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4ocmlnaHRCb3R0b21UaGV0YSlcblx0XHR0b1ggPSBsYXN0UiAqIE1hdGguY29zKHJpZ2h0Qm90dG9tVGhldGEpXG5cdFx0dG9ZID0gLWxhc3RSICogTWF0aC5zaW4ocmlnaHRCb3R0b21UaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblx0fVxuXHRkcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpIHtcblx0XHRnLmxpbmVTdHlsZShsaW5lVywgY29sb3IsIDEpXG5cdFx0Zy5iZWdpbkZpbGwoY29sb3IsIDApXG5cdFx0Zy5tb3ZlVG8oZnJvbVgsIGZyb21ZKVxuXHRcdGcubGluZVRvKHRvWCwgdG9ZKVxuXHRcdGcuZW5kRmlsbCgpXG5cdH1cblx0ZHJhd0NpcmNsZShnLCByKSB7XG5cdFx0Zy5saW5lU3R5bGUoQXBwU3RvcmUuZ2V0TGluZVdpZHRoKCksIDB4ZmZmZmZmLCAxKVxuXHRcdGcuYmVnaW5GaWxsKDB4ZmZmZmZmLCAwKVxuXHRcdFxuXHRcdGcubW92ZVRvKHIsIDApXG5cblx0XHR2YXIgYW5nbGUgPSAwXG5cdFx0dmFyIHggPSAwXG5cdFx0dmFyIHkgPSAwXG5cdFx0dmFyIGdhcCA9IE1hdGgubWluKCgzMDAgLyB0aGlzLnJhZGl1cykgKiA1LCAxMClcblx0XHR2YXIgc3RlcHMgPSBNYXRoLnJvdW5kKDM2MCAvIGdhcClcblx0XHRmb3IgKHZhciBpID0gLTE7IGkgPCBzdGVwczsgaSsrKSB7XG5cdFx0XHRhbmdsZSA9IFV0aWxzLkRlZ3JlZXNUb1JhZGlhbnMoaSAqIGdhcClcblx0XHRcdHggPSByICogTWF0aC5jb3MoYW5nbGUpXG5cdFx0XHR5ID0gciAqIE1hdGguc2luKGFuZ2xlKVxuXHRcdFx0Zy5saW5lVG8oeCwgeSlcblx0XHR9O1xuXG5cdFx0Ly8gY2xvc2UgaXRcblx0XHRhbmdsZSA9IFV0aWxzLkRlZ3JlZXNUb1JhZGlhbnMoMzYwKVxuXHRcdHggPSByICogTWF0aC5jb3MoYW5nbGUpXG5cdFx0eSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRnLmxpbmVUbyh4LCB5KVxuXG5cdFx0Zy5lbmRGaWxsKClcblx0fVxuXHRkcmF3VGl0bGVzKHIsIGNvbG9yKSB7XG5cdFx0dmFyIHRpdGxlcyA9IHRoaXMudGl0bGVzXG5cdFx0dmFyIG9mZnNldCA9ICh0aGlzLnJhZGl1cyAvIDI3MCkgKiAtMjVcblx0XHR2YXIgc2NhbGUgPSAodGhpcy5yYWRpdXMgLyAyNzApICogMVxuXHRcdHZhciByID0gciArIG9mZnNldFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGl0bGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgdGl0bGUgPSB0aXRsZXNbaV1cblx0XHRcdHZhciBhbmdsZSA9IFV0aWxzLkRlZ3JlZXNUb1JhZGlhbnModGl0bGUuZGVnQmVnaW4pXG5cdFx0XHR0aXRsZS50eHQucm90YXRpb24gPSBhbmdsZSArIFV0aWxzLkRlZ3JlZXNUb1JhZGlhbnMoOTApXG5cdFx0XHR0aXRsZS50eHQueCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHRcdHRpdGxlLnR4dC55ID0gciAqIE1hdGguc2luKGFuZ2xlKVxuXHRcdFx0dGl0bGUudHh0LnNjYWxlLnggPSBzY2FsZVxuXHRcdFx0dGl0bGUudHh0LnNjYWxlLnkgPSBzY2FsZVxuXHRcdH1cblx0fVxuXHRyZXNpemUocmFkaXVzKSB7XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmFkaXVzID0gcmFkaXVzXG5cdFx0dGhpcy5kcmF3UmluZ3MoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMucmluZ3NDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdHRoaXMudGl0bGVzQ29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMucmluZ3NDb250YWluZXIpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnRpdGxlc0NvbnRhaW5lcilcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3MgZnJvbSAnQ29tcGFzcydcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFNtYWxsQ29tcGFzcyBmcm9tICdTbWFsbENvbXBhc3MnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbXBhc3Nlc0NvbnRhaW5lciB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCBwYXJlbnRFbCkge1xuXHRcdHRoaXMucGFyZW50RWwgPSBwYXJlbnRFbFxuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHRcdHRoaXMuY3VycmVudEluZGV4ID0gMFxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuY29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKVxuXG5cdFx0dGhpcy5jb21wYXNzZXMgPSBbXVxuXG5cdFx0dGhpcy5tYWluQ29tcGFzcyA9IG5ldyBDb21wYXNzKHRoaXMuY29udGFpbmVyLCBBcHBDb25zdGFudHMuRVhQRVJJRU5DRSlcblx0XHR0aGlzLm1haW5Db21wYXNzLmtub3RSYWRpdXMgPSBBcHBDb25zdGFudHMuU01BTExfS05PVF9SQURJVVNcblx0XHR0aGlzLm1haW5Db21wYXNzLmNvbXBvbmVudERpZE1vdW50KClcblx0XHR0aGlzLm1haW5Db21wYXNzLnN0YXRlID0gQXBwQ29uc3RhbnRzLk9QRU5cblxuXHRcdHZhciBpbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cblx0XHR2YXIgcGxhbmV0cyA9IEFwcFN0b3JlLnBsYW5ldHMoKVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHBsYW5ldCA9IHBsYW5ldHNbaV1cblx0XHRcdHZhciBzbWFsbENvbXBhc3MgPSBuZXcgU21hbGxDb21wYXNzKHRoaXMuY29udGFpbmVyLCBBcHBDb25zdGFudHMuRVhQRVJJRU5DRSlcblx0XHRcdHZhciBwbGFuZXREYXRhID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZChwbGFuZXQpXG5cdFx0XHRzbWFsbENvbXBhc3Muc3RhdGUgPSBBcHBDb25zdGFudHMuQ0xPU0Vcblx0XHRcdHNtYWxsQ29tcGFzcy5pZCA9IHBsYW5ldFxuXHRcdFx0c21hbGxDb21wYXNzLmNvbXBvbmVudERpZE1vdW50KHBsYW5ldERhdGEsIHBsYW5ldCwgdGhpcy5wYXJlbnRFbCwgaW5mb3MucGxhbmV0KVxuXHRcdFx0dGhpcy5jb21wYXNzZXNbaV0gPSBzbWFsbENvbXBhc3Ncblx0XHRcdGlmKHBsYW5ldCA9PSB0aGlzLmlkKSB7XG5cdFx0XHRcdHRoaXMubWFpbkNvbXBhc3MuaWQgPSBwbGFuZXRcblx0XHRcdFx0dGhpcy5vcGVuZWRDb21wYXNzSW5kZXggPSBpXG5cdFx0XHRcdHNtYWxsQ29tcGFzcy5zdGF0ZSA9IEFwcENvbnN0YW50cy5PUEVOXG5cdFx0XHRcdHRoaXMuY2xvc2VDb21wYXNzKGkpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHRoaXMudXBkYXRlQ29tcGFzc1Byb2R1Y3QoKVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0XHR9O1xuXHRcdHRoaXMubWFpbkNvbXBhc3MudXBkYXRlUmFkaXVzKClcblx0XHR0aGlzLm1haW5Db21wYXNzLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29tcGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc1tpXS53aWxsVHJhbnNpdGlvbk91dCgpXG5cdFx0fTtcdFxuXHRcdHRoaXMubWFpbkNvbXBhc3Mud2lsbFRyYW5zaXRpb25PdXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29tcGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc1tpXS51cGRhdGUoKVxuXHRcdH07XG5cdFx0dGhpcy5tYWluQ29tcGFzcy51cGRhdGUoKVxuXHR9XG5cdHVwZGF0ZUNvbXBhc3NQcm9kdWN0KCkge1xuXHRcdHZhciBwbGFuZXREYXRhID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZCh0aGlzLmlkKVxuXHRcdHZhciBwcm9kdWN0RGF0YSA9IHBsYW5ldERhdGFcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHByb2R1Y3REYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcHJvZHVjdCA9IHByb2R1Y3REYXRhW2ldXG5cdFx0XHRpZih0aGlzLmN1cnJlbnRJbmRleCA9PSBpKSB7XG5cdFx0XHRcdHByb2R1Y3QuaGlnaGxpZ2h0ID0gdHJ1ZVxuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHByb2R1Y3QuaGlnaGxpZ2h0ID0gZmFsc2Vcblx0XHRcdH1cblx0XHR9O1xuXHRcdHRoaXMubWFpbkNvbXBhc3MudXBkYXRlRGF0YShwcm9kdWN0RGF0YSlcblx0fVxuXHRjaGFuZ2VEYXRhKG5ld0lkKSB7XG5cdFx0dGhpcy5pZCA9IG5ld0lkXG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwbGFuZXQgPSBwbGFuZXRzW2ldXG5cdFx0XHR2YXIgY29tcGFzcyA9IHRoaXMuY29tcGFzc2VzW2ldXG5cdFx0XHRpZihwbGFuZXQgPT0gdGhpcy5pZCkgeyBcblx0XHRcdFx0dGhpcy5tYWluQ29tcGFzcy5pZCA9IHBsYW5ldFxuXHRcdFx0XHR0aGlzLm9wZW5lZENvbXBhc3NJbmRleCA9IGlcblx0XHRcdFx0Y29tcGFzcy5zdGF0ZSA9IEFwcENvbnN0YW50cy5PUEVOXG5cdFx0XHRcdHRoaXMuY2xvc2VDb21wYXNzKGkpXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0Y29tcGFzcy5zdGF0ZSA9IEFwcENvbnN0YW50cy5DTE9TRVxuXHRcdFx0XHR0aGlzLm9wZW5Db21wYXNzKGkpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMucmVzaXplKClcblx0XHR0aGlzLnBvc2l0aW9uVGl0bGVFbGVtZW50cyh0aGlzLnkpXG5cdFx0dGhpcy51cGRhdGVDb21wYXNzUHJvZHVjdCgpXG5cdH1cblx0b3BlbkNvbXBhc3MoaW5kZXgpIHtcblx0XHR2YXIgY29tcGFzcyA9IHRoaXMuY29tcGFzc2VzW2luZGV4XVxuXHRcdGNvbXBhc3Mub3BhY2l0eSgxKVxuXHR9XG5cdGNsb3NlQ29tcGFzcyhpbmRleCkge1xuXHRcdHZhciBjb21wYXNzID0gdGhpcy5jb21wYXNzZXNbaW5kZXhdXG5cdFx0Y29tcGFzcy5vcGFjaXR5KDApXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR2YXIgY29tcGFzc2VzID0gdGhpcy5jb21wYXNzZXNcblx0XHR2YXIgdG90YWxXID0gMFxuXHRcdHZhciBiaWdnZXN0UmFkaXVzID0gMFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29tcGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY29tcGFzcyA9IGNvbXBhc3Nlc1tpXVxuXHRcdFx0dmFyIHNpemUgPSAoY29tcGFzcy5yYWRpdXMgPDwgMSlcblx0XHRcdHZhciBwcmV2aW91c0NtcCA9IGNvbXBhc3Nlc1tpLTFdXG5cdFx0XHR2YXIgbmV4dENtcCA9IGNvbXBhc3Nlc1tpKzFdXG5cdFx0XHR2YXIgY3ggPSB0b3RhbFcgKyB0aGlzLmdldENvbXBhc3NNYXJnaW4oY29tcGFzcylcblx0XHRcdGNvbXBhc3MucmVzaXplKClcblx0XHRcdGJpZ2dlc3RSYWRpdXMgPSBiaWdnZXN0UmFkaXVzIDwgY29tcGFzcy5yYWRpdXMgPyBjb21wYXNzLnJhZGl1cyA6IGJpZ2dlc3RSYWRpdXNcblx0XHRcdGNvbXBhc3MucG9zaXRpb24oY3gsIDApXG5cdFx0XHRjb21wYXNzLnBvc1ggPSBjeFxuXHRcdFx0dG90YWxXID0gY3ggKyB0aGlzLmdldENvbXBhc3NNYXJnaW4oY29tcGFzcylcblxuXHRcdFx0aWYoY29tcGFzcy5zdGF0ZSA9PSBBcHBDb25zdGFudHMuT1BFTikge1xuXHRcdFx0XHR0aGlzLm1haW5Db21wYXNzLnBvc2l0aW9uKFxuXHRcdFx0XHRcdGNvbXBhc3MueCxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdClcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLm1haW5Db21wYXNzLnJlc2l6ZSgpXG5cblx0XHR0aGlzLndpZHRoID0gdG90YWxXXG5cdFx0dGhpcy5oZWlnaHQgPSBiaWdnZXN0UmFkaXVzXG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdFx0dGhpcy5jb250YWluZXIucG9zaXRpb24ueCA9IHhcblx0XHR0aGlzLmNvbnRhaW5lci5wb3NpdGlvbi55ID0geVxuXHRcdHRoaXMucG9zaXRpb25UaXRsZUVsZW1lbnRzKHkpXG5cdH1cblx0cG9zaXRpb25UaXRsZUVsZW1lbnRzKHkpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIGNvbXBhc3NlcyA9IHRoaXMuY29tcGFzc2VzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjb21wYXNzID0gY29tcGFzc2VzW2ldXG5cdFx0XHRjb21wYXNzLnBvc2l0aW9uRWxlbWVudChcblx0XHRcdFx0Y29tcGFzcy5wb3NYICsgKHdpbmRvd1cgPj4gMSkgLSAodGhpcy53aWR0aCA+PiAxKSxcblx0XHRcdFx0eVxuXHRcdFx0KVxuXHRcdH1cblx0fVxuXHRnZXRDb21wYXNzTWFyZ2luKGNvbXBhc3MpIHtcblx0XHRyZXR1cm4gKGNvbXBhc3Muc3RhdGUgPT0gQXBwQ29uc3RhbnRzLk9QRU4pID8gMTQwIDogODBcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29tcGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc1tpXS5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0fVxuXHRcdHRoaXMubWFpbkNvbXBhc3MuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuY29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMuY29udGFpbmVyKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJ0Zyb250Q29udGFpbmVyX2hicydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5jbGFzcyBGcm9udENvbnRhaW5lciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0cmVuZGVyKHBhcmVudCkge1xuXHRcdHZhciBzY29wZSA9IHt9XG5cdFx0dmFyIGdlbmVyYUluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zKClcblx0XHRzY29wZS5pbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0c2NvcGUuZmFjZWJvb2tVcmwgPSBnZW5lcmFJbmZvc1snZmFjZWJvb2tfdXJsJ11cblx0XHRzY29wZS50d2l0dGVyVXJsID0gZ2VuZXJhSW5mb3NbJ3R3aXR0ZXJfdXJsJ11cblx0XHRzY29wZS5pbnN0YWdyYW1VcmwgPSBnZW5lcmFJbmZvc1snaW5zdGFncmFtX3VybCddXG5cdFx0c2NvcGUuaXNNb2JpbGUgPSBBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZVxuXG5cdFx0aWYoc2NvcGUuaXNNb2JpbGUpIHtcblx0XHRcdHNjb3BlLm1vYmlsZU1lbnUgPSBbXG5cdFx0XHRcdHsgaWQ6J2hvbWUnLCBuYW1lOnNjb3BlLmluZm9zWydob21lX3R4dCddLCB1cmw6JyMhL2xhbmRpbmcnIH0sXG5cdFx0XHRcdHsgaWQ6J3Nob3AtbWVuJywgbmFtZTpzY29wZS5pbmZvc1snc2hvcF90aXRsZSddICsgJyAnICsgc2NvcGUuaW5mb3NbJ3Nob3BfbWVuJ10sIHVybDpzY29wZS5pbmZvc1snc2hvcF9tZW5fdXJsJ10gfSxcblx0XHRcdFx0eyBpZDonc2hvcC13b21lbicsIG5hbWU6c2NvcGUuaW5mb3NbJ3Nob3BfdGl0bGUnXSArICcgJyArIHNjb3BlLmluZm9zWydzaG9wX3dvbWVuJ10sIHVybDpzY29wZS5pbmZvc1snc2hvcF93b21lbl91cmwnXSB9LFxuXHRcdFx0XHR7IGlkOidsYWInLCBuYW1lOnNjb3BlLmluZm9zWydjYW1wZXJfbGFiJ10sIHVybDpzY29wZS5pbmZvc1snY2FtcGVyX2xhYl91cmwnXSB9LFxuXHRcdFx0XHR7IGlkOidsZWdhbCcsIG5hbWU6c2NvcGUuaW5mb3NbJ2xlZ2FsJ10sIHVybDpzY29wZS5pbmZvc1snbGVnYWxfdXJsJ10gfSxcblx0XHRcdF1cblx0XHR9XG5cblx0XHRzdXBlci5yZW5kZXIoJ0Zyb250Q29udGFpbmVyJywgcGFyZW50LCB0ZW1wbGF0ZSwgc2NvcGUpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdHRoaXMubW9iaWxlID0ge1xuXHRcdFx0XHRtZW51SXNPcGVuZWQ6IGZhbHNlLFxuXHRcdFx0XHRlbDogdGhpcy5jaGlsZC5maW5kKCcubW9iaWxlLW1lbnUnKSxcblx0XHRcdFx0YnVyZ2VyOiB0aGlzLmNoaWxkLmZpbmQoJy5idXJnZXInKSxcblx0XHRcdFx0c2xpZGVtZW51OiB0aGlzLmNoaWxkLmZpbmQoJy5tZW51LXNsaWRlcicpLFxuXHRcdFx0XHRtYWluTWVudTogdGhpcy5jaGlsZC5maW5kKCd1bC5tYWluLW1lbnUnKSxcblx0XHRcdFx0c29jaWFsTWVudTogdGhpcy5jaGlsZC5maW5kKCd1bC5zb2NpYWwtbWVudScpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy4kc29jaWFsV3JhcHBlciA9IHRoaXMuY2hpbGQuZmluZCgnI3NvY2lhbC13cmFwcGVyJylcblx0XHR0aGlzLiRzb2NpYWxUaXRsZSA9IHRoaXMuJHNvY2lhbFdyYXBwZXIuZmluZCgnLnNvY2lhbC10aXRsZScpXG5cdFx0dGhpcy4kc29jaWFsSWNvbnNDb250YWluZXIgPSB0aGlzLiRzb2NpYWxXcmFwcGVyLmZpbmQoJ3VsJylcblx0XHR0aGlzLiRzb2NpYWxCdG5zID0gdGhpcy4kc29jaWFsV3JhcHBlci5maW5kKCdsaScpXG5cdFx0dGhpcy4kbGVnYWwgPSB0aGlzLmNoaWxkLmZpbmQoJy5sZWdhbCcpXG5cdFx0dGhpcy4kY2FtcGVyTGFiID0gdGhpcy5jaGlsZC5maW5kKCcuY2FtcGVyLWxhYicpXG5cdFx0dGhpcy4kc2hvcCA9IHRoaXMuY2hpbGQuZmluZCgnLnNob3Atd3JhcHBlcicpXG5cdFx0dGhpcy4kaG9tZSA9IHRoaXMuY2hpbGQuZmluZCgnLmhvbWUtYnRuJylcblx0XHR0aGlzLmNvdW50cmllc0ggPSAwXG5cblx0XHR0aGlzLm9uU3ViTWVudU1vdXNlRW50ZXIgPSB0aGlzLm9uU3ViTWVudU1vdXNlRW50ZXIuYmluZCh0aGlzKVxuXHRcdHRoaXMub25TdWJNZW51TW91c2VMZWF2ZSA9IHRoaXMub25TdWJNZW51TW91c2VMZWF2ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy4kc2hvcC5vbignbW91c2VlbnRlcicsIHRoaXMub25TdWJNZW51TW91c2VFbnRlcilcblx0XHR0aGlzLiRzaG9wLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5vblN1Yk1lbnVNb3VzZUxlYXZlKVxuXG5cdFx0dGhpcy5vblNvY2lhbE1vdXNlRW50ZXIgPSB0aGlzLm9uU29jaWFsTW91c2VFbnRlci5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vblNvY2lhbE1vdXNlTGVhdmUgPSB0aGlzLm9uU29jaWFsTW91c2VMZWF2ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy4kc29jaWFsV3JhcHBlci5vbignbW91c2VlbnRlcicsIHRoaXMub25Tb2NpYWxNb3VzZUVudGVyKVxuXHRcdHRoaXMuJHNvY2lhbFdyYXBwZXIub24oJ21vdXNlbGVhdmUnLCB0aGlzLm9uU29jaWFsTW91c2VMZWF2ZSlcblxuXHRcdHRoaXMuc29jaWFsVGwgPSBuZXcgVGltZWxpbmVNYXgoKVxuXHRcdHRoaXMuc29jaWFsVGwuc3RhZ2dlckZyb20odGhpcy4kc29jaWFsQnRucywgMSwgeyBzY2FsZTowLCB5OjEwLCBmb3JjZTNEOnRydWUsIG9wYWNpdHk6MCwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMC4wMSwgMClcblx0XHR0aGlzLnNvY2lhbFRsLmZyb20odGhpcy4kc29jaWFsSWNvbnNDb250YWluZXIsIDEsIHsgeTozMCwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnNvY2lhbFRsLnBhdXNlKDApXG5cblx0XHR0aGlzLnJlc2l6ZSgpXG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5pbml0TW9iaWxlKClcblx0XHR9XG5cdH1cblx0aW5pdE1vYmlsZSgpIHtcblx0XHR0aGlzLm9uQnVyZ2VyQ2xpY2tlZCA9IHRoaXMub25CdXJnZXJDbGlja2VkLmJpbmQodGhpcylcblx0XHR0aGlzLm1vYmlsZS5idXJnZXIub24oJ2NsaWNrJywgdGhpcy5vbkJ1cmdlckNsaWNrZWQpXG5cblx0XHR0aGlzLm1vYmlsZS50bCA9IG5ldyBUaW1lbGluZU1heCgpXG5cdFx0dGhpcy5tb2JpbGUudGwuZnJvbSh0aGlzLm1vYmlsZS5zbGlkZW1lbnUsIDAuNiwgeyBzY2FsZToxLjEsIG9wYWNpdHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdHRoaXMubW9iaWxlLnRsLnBhdXNlKDApXG5cdH1cblx0b25CdXJnZXJDbGlja2VkKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRpZih0aGlzLm1vYmlsZS5tZW51SXNPcGVuZWQpIHtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLm1vYmlsZS5zbGlkZVRpbWVvdXQpXG5cdFx0XHR0aGlzLm1vYmlsZS5zbGlkZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRcdHRoaXMubW9iaWxlLnNsaWRlbWVudS5jc3MoJ3RvcCcsIC0zMDAwKVxuXHRcdFx0fSwgOTAwKVxuXHRcdFx0dGhpcy5tb2JpbGUudGwudGltZVNjYWxlKDEuNCkucmV2ZXJzZSgpXG5cdFx0XHR0aGlzLm1vYmlsZS5tZW51SXNPcGVuZWQgPSBmYWxzZVxuXHRcdH1lbHNle1xuXHRcdFx0dGhpcy5tb2JpbGUuc2xpZGVtZW51LmNzcygndG9wJywgMClcblx0XHRcdHRoaXMucmVzaXplTW9iaWxlKClcblx0XHRcdHRoaXMubW9iaWxlLnRsLnRpbWVTY2FsZSgxKS5wbGF5KClcblx0XHRcdHRoaXMubW9iaWxlLm1lbnVJc09wZW5lZCA9IHRydWVcblx0XHR9XG5cdH1cblx0b25Tb2NpYWxNb3VzZUVudGVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRjbGVhclRpbWVvdXQodGhpcy5zb2NpYWxCdG5UaW1lb3V0KVxuXHRcdHRoaXMuc29jaWFsVGwudGltZVNjYWxlKDEpLnBsYXkoKVxuXHR9XG5cdG9uU29jaWFsTW91c2VMZWF2ZShlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMuc29jaWFsQnRuVGltZW91dClcblx0XHR0aGlzLnNvY2lhbEJ0blRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR0aGlzLnNvY2lhbFRsLnRpbWVTY2FsZSgxLjgpLnJldmVyc2UoKVxuXHRcdH0sIDQwMClcblx0fVxuXHRvblN1Yk1lbnVNb3VzZUVudGVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXHRcdCR0YXJnZXQuYWRkQ2xhc3MoJ2hvdmVyZWQnKVxuXHR9XG5cdG9uU3ViTWVudU1vdXNlTGVhdmUoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cdFx0JHRhcmdldC5yZW1vdmVDbGFzcygnaG92ZXJlZCcpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdGlmKCF0aGlzLmRvbUlzUmVhZHkpIHJldHVyblxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR0aGlzLmNvdW50cmllc0ggPSA2MFxuXHRcdHRoaXMuY291bnRyaWVzVGl0bGVIID0gMjBcblxuXHRcdHZhciBzb2NpYWxDc3MgPSB7XG5cdFx0XHRsZWZ0OiB3aW5kb3dXIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kc29jaWFsVGl0bGUud2lkdGgoKSxcblx0XHRcdHRvcDogd2luZG93SCAtIEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCAtIHRoaXMuJHNvY2lhbFRpdGxlLmhlaWdodCgpLFxuXHRcdH1cblx0XHR2YXIgc29jaWFsSWNvbnNDc3MgPSB7XG5cdFx0XHRsZWZ0OiAodGhpcy4kc29jaWFsVGl0bGUud2lkdGgoKSA+PiAxKSAtICh0aGlzLiRzb2NpYWxJY29uc0NvbnRhaW5lci53aWR0aCgpID4+IDEpLFxuXHRcdFx0dG9wOiAtdGhpcy4kc29jaWFsSWNvbnNDb250YWluZXIuaGVpZ2h0KCkgLSAyMFxuXHRcdH1cblx0XHR2YXIgbGVnYWxDc3MgPSB7XG5cdFx0XHRsZWZ0OiBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQsXG5cdFx0XHR0b3A6IHdpbmRvd0ggLSBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgLSB0aGlzLiRsZWdhbC5oZWlnaHQoKSxcdFxuXHRcdH1cblx0XHR2YXIgY2FtcGVyTGFiQ3NzID0ge1xuXHRcdFx0bGVmdDogd2luZG93VyAtIEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCAtIHRoaXMuJGNhbXBlckxhYi53aWR0aCgpLFxuXHRcdFx0dG9wOiBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQsXG5cdFx0fVxuXHRcdHZhciBzaG9wQ3NzID0ge1xuXHRcdFx0bGVmdDogY2FtcGVyTGFiQ3NzLmxlZnQgLSB0aGlzLiRzaG9wLndpZHRoKCkgLSAoQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EKSxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdH1cblx0XHR2YXIgaG9tZUNzcyA9IHtcblx0XHRcdGxlZnQ6IHNob3BDc3MubGVmdCAtIHRoaXMuJGhvbWUud2lkdGgoKSAtIChBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQpLFxuXHRcdFx0dG9wOiBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQsXG5cdFx0fVxuXG5cdFx0dGhpcy4kc29jaWFsV3JhcHBlci5jc3Moc29jaWFsQ3NzKVxuXHRcdHRoaXMuJGxlZ2FsLmNzcyhsZWdhbENzcylcblx0XHR0aGlzLiRjYW1wZXJMYWIuY3NzKGNhbXBlckxhYkNzcylcblx0XHR0aGlzLiRzaG9wLmNzcyhzaG9wQ3NzKVxuXHRcdHRoaXMuJHNvY2lhbEljb25zQ29udGFpbmVyLmNzcyhzb2NpYWxJY29uc0Nzcylcblx0XHR0aGlzLiRob21lLmNzcyhob21lQ3NzKVxuXG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdHRoaXMucmVzaXplTW9iaWxlKClcblx0XHR9XG5cdH1cblx0cmVzaXplTW9iaWxlKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIGJ1cmdlckNzcyA9IHtcblx0XHRcdGxlZnQ6IHdpbmRvd1cgLSB0aGlzLm1vYmlsZS5idXJnZXIud2lkdGgoKSAtIEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EXG5cdFx0fVxuXHRcdHZhciBzbGlkZW1lbnVDc3MgPSB7XG5cdFx0XHR3aWR0aDogd2luZG93Vyxcblx0XHRcdGhlaWdodDogd2luZG93SFxuXHRcdH1cblx0XHR2YXIgbWFpbk1lbnVXID0gdGhpcy5tb2JpbGUubWFpbk1lbnUud2lkdGgoKVxuXHRcdHZhciBtYWluTWVudUggPSB0aGlzLm1vYmlsZS5tYWluTWVudS5oZWlnaHQoKVxuXHRcdHZhciBtYWluTWVudUNzcyA9IHtcblx0XHRcdHRvcDogKHdpbmRvd0ggPj4gMSkgLSAobWFpbk1lbnVIID4+IDEpIC0gKG1haW5NZW51SCAqIDAuMSksXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtIChtYWluTWVudVcgPj4gMSlcblx0XHR9XG5cdFx0dmFyIHNvY2lhbE1lbnVDc3MgPSB7XG5cdFx0XHR0b3A6IG1haW5NZW51Q3NzLnRvcCArIG1haW5NZW51SCArIDEwLFxuXHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAodGhpcy5tb2JpbGUuc29jaWFsTWVudS53aWR0aCgpID4+IDEpXG5cdFx0fVxuXHRcdHRoaXMubW9iaWxlLnNsaWRlbWVudS5jc3Moc2xpZGVtZW51Q3NzKVxuXHRcdHRoaXMubW9iaWxlLmJ1cmdlci5jc3MoYnVyZ2VyQ3NzKVxuXHRcdHRoaXMubW9iaWxlLm1haW5NZW51LmNzcyhtYWluTWVudUNzcylcblx0XHR0aGlzLm1vYmlsZS5zb2NpYWxNZW51LmNzcyhzb2NpYWxNZW51Q3NzKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBGcm9udENvbnRhaW5lclxuXG5cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgS25vdCB7XG5cdGNvbnN0cnVjdG9yKHNwcmluZ0NvbnRhaW5lciwgciwgY29sb3IpIHtcblx0XHR0aGlzLnJhZGl1cyA9IHIgfHwgM1xuXHRcdHRoaXMuY29sb3IgPSBjb2xvciB8fCAweGZmZmZmZlxuXHRcdHRoaXMuc3ByaW5nQ29udGFpbmVyID0gc3ByaW5nQ29udGFpbmVyXG5cdFx0dGhpcy52eCA9IDBcblx0XHR0aGlzLnZ5ID0gMFxuXHRcdHRoaXMueCA9IDBcblx0XHR0aGlzLnkgPSAwXG5cdFx0dGhpcy50b1ggPSAwXG5cdFx0dGhpcy50b1kgPSAwXG5cdFx0dGhpcy5mcm9tWCA9IDBcblx0XHR0aGlzLmZyb21ZID0gMFxuXHRcdHRoaXMuc2NhbGVYID0gMVxuXHRcdHRoaXMuc2NhbGVZID0gMVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuZyA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHR0aGlzLnNwcmluZ0NvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmcpXG5cdFx0dGhpcy5kcmF3KClcblx0XHRyZXR1cm4gdGhpc1xuXHR9XG5cdGNoYW5nZVNpemUocmFkaXVzKSB7XG5cdFx0dGhpcy5yYWRpdXMgPSByYWRpdXMgfHwgM1xuXHRcdHRoaXMuZHJhdygpXG5cdH1cblx0ZHJhdygpIHtcblx0XHR0aGlzLmcuY2xlYXIoKVxuXHRcdHRoaXMuZy5saW5lU3R5bGUoQXBwU3RvcmUuZ2V0TGluZVdpZHRoKCksIHRoaXMuY29sb3IsIDEpO1xuXHRcdHRoaXMuZy5iZWdpbkZpbGwodGhpcy5jb2xvciwgMSk7XG5cdFx0dGhpcy5nLmRyYXdDaXJjbGUoMCwgMCwgdGhpcy5yYWRpdXMpO1xuXHRcdHRoaXMuZy5lbmRGaWxsKClcdFxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLmcueCA9IHhcblx0XHR0aGlzLmcueSA9IHlcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHR9XG5cdGNsZWFyKCkge1xuXHRcdHRoaXMuZy5jbGVhcigpXG5cdH1cblx0c2NhbGUoeCwgeSkge1xuXHRcdHRoaXMuZy5zY2FsZS54ID0geFxuXHRcdHRoaXMuZy5zY2FsZS55ID0geVxuXHRcdHRoaXMuc2NhbGVYID0geFxuXHRcdHRoaXMuc2NhbGVZID0geVxuXHR9XG5cdHZlbG9jaXR5KHgsIHkpIHtcblx0XHR0aGlzLnZ4ID0geFxuXHRcdHRoaXMudnkgPSB5XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5nLmNsZWFyKClcblx0XHR0aGlzLmcgPSBudWxsXG5cdH1cbn1cbiIsImltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IFZlYzIgZnJvbSAnVmVjMidcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBCZXppZXJFYXNpbmcgZnJvbSAnYmV6aWVyLWVhc2luZydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGFuZGluZ1NsaWRlc2hvdyB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCBwYXJlbnRFbCkge1xuXHRcdHRoaXMucGFyZW50RWwgPSBwYXJlbnRFbFxuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHRcdHRoaXMuY3VycmVudElkID0gJ2FsYXNrYSdcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR2YXIgaW5mb3MgPSBBcHBTdG9yZS5nZW5lcmFsSW5mb3NMYW5nU2NvcGUoKVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnNsaWRlc2hvd0NvbnRhaW5lcilcblx0IFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuYWRkQ2hpbGQodGhpcy5zbGlkZXNob3dXcmFwcGVyKVxuXHQgXHR0aGlzLmNvdW50ZXIgPSAwXG5cdCBcdHRoaXMucGxhbmV0VGl0bGVUeHQgPSBpbmZvcy5wbGFuZXQudG9VcHBlckNhc2UoKVxuXG5cdFx0dmFyIHNsaWRlc2hvd1RpdGxlID0gdGhpcy5wYXJlbnRFbC5maW5kKCcuc2xpZGVzaG93LXRpdGxlJylcblx0XHR2YXIgcGxhbmV0VGl0bGUgPSBzbGlkZXNob3dUaXRsZS5maW5kKCcucGxhbmV0LXRpdGxlJylcblx0XHR2YXIgcGxhbmV0TmFtZSA9IHNsaWRlc2hvd1RpdGxlLmZpbmQoJy5wbGFuZXQtbmFtZScpXG5cdCBcdHRoaXMudGl0bGVDb250YWluZXIgPSB7XG5cdCBcdFx0cGFyZW50OiBzbGlkZXNob3dUaXRsZSxcblx0IFx0XHRwbGFuZXRUaXRsZTogcGxhbmV0VGl0bGUsXG5cdCBcdFx0cGxhbmV0TmFtZTogcGxhbmV0TmFtZVxuXHQgXHR9XG5cblx0IFx0dGhpcy5wbGFuZXROYW1lVHdlZW4gPSBUd2Vlbk1heC5mcm9tVG8ocGxhbmV0TmFtZSwgMC41LCB7c2NhbGVYOjEuNCwgc2NhbGVZOjAsIG9wYWNpdHk6MH0sIHsgc2NhbGU6MSwgb3BhY2l0eToxLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0pXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuLnBhdXNlKDApXG5cblx0IFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0IFx0dGhpcy5zbGlkZXMgPSBbXVxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0IFx0XHR2YXIgcyA9IHt9XG5cdCBcdFx0dmFyIGlkID0gcGxhbmV0c1tpXVxuXHQgXHRcdHZhciB3cmFwcGVyQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0XHR2YXIgbWFza1JlY3QgPSB7XG5cdCBcdFx0XHRnOiBBcHBTdG9yZS5nZXRHcmFwaGljcygpLFxuXHQgXHRcdFx0bmV3VzogMCxcblx0IFx0XHRcdHdpZHRoOiAwLFxuXHQgXHRcdFx0eDogMFxuXHQgXHRcdH1cblx0IFx0XHR2YXIgaW1nVXJsID0gQXBwU3RvcmUubWFpbkltYWdlVXJsKGlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0IFx0XHR2YXIgdGV4dHVyZSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1nVXJsKVxuXHQgXHRcdHZhciBzcHJpdGUgPSBBcHBTdG9yZS5nZXRTcHJpdGUoKVxuXHQgXHRcdHNwcml0ZS50ZXh0dXJlID0gdGV4dHVyZVxuXHQgXHRcdHNwcml0ZS5wYXJhbXMgPSB7fVxuXHQgXHRcdHRoaXMuc2xpZGVzaG93V3JhcHBlci5hZGRDaGlsZCh3cmFwcGVyQ29udGFpbmVyKVxuXHQgXHRcdHdyYXBwZXJDb250YWluZXIuYWRkQ2hpbGQoc3ByaXRlKVxuXHQgXHRcdHdyYXBwZXJDb250YWluZXIuYWRkQ2hpbGQobWFza1JlY3QuZylcblx0IFx0XHRzcHJpdGUubWFzayA9IG1hc2tSZWN0Lmdcblx0IFx0XHRzLm9sZFBvc2l0aW9uID0gbmV3IFZlYzIoMCwgMClcblx0IFx0XHRzLm5ld1Bvc2l0aW9uID0gbmV3IFZlYzIoMCwgMClcblx0IFx0XHRzLndyYXBwZXJDb250YWluZXIgPSB3cmFwcGVyQ29udGFpbmVyXG5cdCBcdFx0cy5zcHJpdGUgPSBzcHJpdGVcblx0IFx0XHRzLnRleHR1cmUgPSB0ZXh0dXJlXG5cdCBcdFx0cy5tYXNrUmVjdCA9IG1hc2tSZWN0XG5cdCBcdFx0cy5wbGFuZXROYW1lID0gaWQudG9VcHBlckNhc2UoKVxuXHQgXHRcdHMuaW1nUmVzcG9uc2l2ZVNpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VTaXplKEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHQgXHRcdHMuaW1nVXJsID0gaW1nVXJsXG5cdCBcdFx0cy5pZCA9IHBsYW5ldHNbaV1cblx0IFx0XHR0aGlzLnNsaWRlc1tpXSA9IHNcblx0IFx0fVxuXG5cdCBcdHRoaXMubWFza0Vhc2luZyA9IEJlemllckVhc2luZyguMjEsMS40NywuNTIsMSlcblx0IFx0dGhpcy5jaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KClcblx0fVxuXHR1cGRhdGVUaXRsZXModGl0bGUsIG5hbWUpIHtcblx0XHR2YXIgcGxhbmV0VGl0bGUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldFRpdGxlXG5cdFx0dmFyIHBsYW5ldE5hbWUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldE5hbWVcblx0IFx0cGxhbmV0VGl0bGUudGV4dCh0aXRsZSlcblx0IFx0cGxhbmV0TmFtZS50ZXh0KG5hbWUpXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuLnBsYXkoMClcblx0fVxuXHRkcmF3Q2VudGVyZWRNYXNrUmVjdChncmFwaGljcywgeCwgeSwgdywgaCkge1xuXHRcdGdyYXBoaWNzLmNsZWFyKClcblx0XHRncmFwaGljcy5iZWdpbkZpbGwoMHhmZmZmMDAsIDEpXG5cdFx0Z3JhcGhpY3MuZHJhd1JlY3QoeCwgeSwgdywgaClcblx0XHRncmFwaGljcy5lbmRGaWxsKClcblx0fVxuXHRuZXh0KCkge1xuXHRcdHZhciBmaXJzdEVsZW1lbnQgPSB0aGlzLnNsaWRlcy5zaGlmdCgpXG5cdFx0dGhpcy5zbGlkZXMucHVzaChmaXJzdEVsZW1lbnQpXG5cdFx0dGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSA9IGZpcnN0RWxlbWVudFxuXHRcdHRoaXMuY2hvb3NlU2xpZGVUb0hpZ2hsaWdodCgpXG5cdFx0dGhpcy5hcHBseVZhbHVlc1RvU2xpZGVzKClcblx0fVxuXHRwcmV2aW91cygpIHtcblx0XHR2YXIgbGFzdEVsZW1lbnQgPSB0aGlzLnNsaWRlcy5wb3AoKVxuXHRcdHRoaXMuc2xpZGVzLnVuc2hpZnQobGFzdEVsZW1lbnQpXG5cdFx0dGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSA9IGxhc3RFbGVtZW50XG5cdFx0dGhpcy5jaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KClcblx0XHR0aGlzLmFwcGx5VmFsdWVzVG9TbGlkZXMoKVxuXHR9XG5cdGNob29zZVNsaWRlVG9IaWdobGlnaHQoKSB7XG5cdFx0dmFyIHRvdGFsTGVuID0gdGhpcy5zbGlkZXMubGVuZ3RoLTFcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2xpZGUgPSB0aGlzLnNsaWRlc1tpXVxuXHRcdFx0aWYoaSA9PSAyKSB7XG5cdFx0XHRcdHNsaWRlLmhpZ2hsaWdodCA9IHRydWUgLy8gSGlnaGxpZ2h0IHRoZSBtaWRkbGUgZWxlbWVudHNcblx0XHRcdFx0dGhpcy5jdXJyZW50SWQgPSBzbGlkZS5pZFxuXHRcdFx0XHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIuc2V0Q2hpbGRJbmRleChzbGlkZS53cmFwcGVyQ29udGFpbmVyLCB0b3RhbExlbilcblx0XHRcdFx0dGhpcy51cGRhdGVUaXRsZXModGhpcy5wbGFuZXRUaXRsZVR4dCwgc2xpZGUucGxhbmV0TmFtZSlcblx0XHRcdFx0dGhpcy5wb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0c2xpZGUuaGlnaGxpZ2h0ID0gZmFsc2Vcblx0XHRcdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLnNldENoaWxkSW5kZXgoc2xpZGUud3JhcHBlckNvbnRhaW5lciwgaSlcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0YXBwbHlSZXNwb25zaXZlSW1nVG9TbGlkZURlcGVuZHNXaW5kb3coc2xpZGUpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIGltZ1VybCA9IEFwcFN0b3JlLm1haW5JbWFnZVVybChzLmlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0XHRpZihzLmltZ1VybCAhPSBpbWdVcmwpIHtcblx0XHRcdHMuaW1nUmVzcG9uc2l2ZVNpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VTaXplKEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHRcdFx0cy50ZXh0dXJlLmRlc3Ryb3kodHJ1ZSlcblx0XHRcdHMudGV4dHVyZSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1nVXJsKVxuXHRcdFx0cy5zcHJpdGUudGV4dHVyZSA9IHMudGV4dHVyZVxuXHRcdFx0cy5pbWdVcmwgPSBpbWdVcmxcblx0XHR9XG5cdH1cblx0cmVzaXplQW5kUG9zaXRpb25JbWdTcHJpdGUoc2xpZGUsIG1hc2tTbGlkZVcsIHdpbmRvd1csIHdpbmRvd0gpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIHJlc2l6ZVZhcnMgPSBVdGlscy5SZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcihtYXNrU2xpZGVXLCB3aW5kb3dILCBzLmltZ1Jlc3BvbnNpdmVTaXplWzBdLCBzLmltZ1Jlc3BvbnNpdmVTaXplWzFdKVxuXHRcdHMuc3ByaXRlLmFuY2hvci54ID0gMC41XG5cdFx0cy5zcHJpdGUuYW5jaG9yLnkgPSAwLjVcblx0XHRzLnNwcml0ZS5zY2FsZS54ID0gcmVzaXplVmFycy5zY2FsZVxuXHRcdHMuc3ByaXRlLnNjYWxlLnkgPSByZXNpemVWYXJzLnNjYWxlXG5cdFx0cy5zcHJpdGUud2lkdGggPSByZXNpemVWYXJzLndpZHRoXG5cdFx0cy5zcHJpdGUuaGVpZ2h0ID0gcmVzaXplVmFycy5oZWlnaHRcblx0XHRzLnNwcml0ZS54ID0gcmVzaXplVmFycy5sZWZ0XG5cdFx0cy5zcHJpdGUueSA9IHJlc2l6ZVZhcnMudG9wXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHZhciBzbGlkZXMgPSB0aGlzLnNsaWRlc1xuXHRcdHRoaXMuY291bnRlciArPSAwLjAxMlxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcyA9IHNsaWRlc1tpXVxuXHRcdFx0cy5tYXNrUmVjdC52YWx1ZVNjYWxlICs9ICgwLjQgLSBzLm1hc2tSZWN0LnZhbHVlU2NhbGUpICogMC4wNVxuXHRcdFx0dmFyIGVhc2UgPSB0aGlzLm1hc2tFYXNpbmcuZ2V0KHMubWFza1JlY3QudmFsdWVTY2FsZSlcblx0XHRcdHMud3JhcHBlckNvbnRhaW5lci54ICs9IChzLm5ld1Bvc2l0aW9uLnggLSBzLndyYXBwZXJDb250YWluZXIueCkgKiBlYXNlXG5cdFx0XHRzLm1hc2tSZWN0LndpZHRoID0gcy5tYXNrUmVjdC5uZXdXICogZWFzZVxuXHRcdFx0dmFyIG1hc2tSZWN0WCA9ICgxIC0gZWFzZSkgKiBzLm1hc2tSZWN0Lm5ld1hcblx0XHRcdHRoaXMuZHJhd0NlbnRlcmVkTWFza1JlY3Qocy5tYXNrUmVjdC5nLCBtYXNrUmVjdFgsIDAsIHMubWFza1JlY3Qud2lkdGgsIHMubWFza1JlY3QuaGVpZ2h0KVxuXHRcdFx0cy5zcHJpdGUuc2tldy54ID0gTWF0aC5jb3ModGhpcy5jb3VudGVyKSAqIDAuMDIwXG5cdFx0XHRzLnNwcml0ZS5za2V3LnkgPSBNYXRoLnNpbih0aGlzLmNvdW50ZXIpICogMC4wMjBcblx0XHR9XG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueCArPSAodGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGVYWSAtIHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLngpICogMC4wOFxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnkgKz0gKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFkgLSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54KSAqIDAuMDhcblx0fVxuXHRwb3NpdGlvblNsaWRlc2hvd0NvbnRhaW5lcigpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBsYXN0U2xpZGUgPSB0aGlzLnNsaWRlc1t0aGlzLnNsaWRlcy5sZW5ndGgtMV1cblx0XHR2YXIgY29udGFpbmVyVG90YWxXID0gbGFzdFNsaWRlLm5ld1Bvc2l0aW9uLnggKyBsYXN0U2xpZGUubWFza1JlY3QubmV3V1xuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnBpdm90LnggPSBjb250YWluZXJUb3RhbFcgPj4gMVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnBpdm90LnkgPSB3aW5kb3dIID4+IDFcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci54ID0gKHdpbmRvd1cgPj4gMSlcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci55ID0gKHdpbmRvd0ggPj4gMSlcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5iYXNlWSA9IHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnlcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54ID0gMS4zXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueSA9IDEuM1xuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFkgPSAxLjA1XG5cdH1cblx0YXBwbHlWYWx1ZXNUb1NsaWRlcygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBjdXJyZW50UG9zWCA9IDBcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcyA9IHRoaXMuc2xpZGVzW2ldXG5cdFx0XHR0aGlzLmFwcGx5UmVzcG9uc2l2ZUltZ1RvU2xpZGVEZXBlbmRzV2luZG93KHMpXG5cdFx0XHR2YXIgaGlnaHRsaWdodGVkU2xpZGVXID0gd2luZG93VyAqICgxIC0gKEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFICogMikpXG5cdFx0XHR2YXIgbm9ybWFsU2xpZGVXID0gd2luZG93VyAqIEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFXG5cdFx0XHR2YXIgc2xpZGVXID0gMFxuXHRcdFx0aWYocy5oaWdobGlnaHQpIHNsaWRlVyA9IGhpZ2h0bGlnaHRlZFNsaWRlV1xuXHRcdFx0ZWxzZSBzbGlkZVcgPSBub3JtYWxTbGlkZVdcblx0XHRcdHRoaXMucmVzaXplQW5kUG9zaXRpb25JbWdTcHJpdGUocywgc2xpZGVXLCB3aW5kb3dXLCB3aW5kb3dIKVxuXHRcdFx0cy5tYXNrUmVjdC5uZXdXID0gc2xpZGVXXG5cdFx0XHRzLm1hc2tSZWN0LmhlaWdodCA9IHdpbmRvd0hcblx0XHRcdHMubWFza1JlY3QubmV3WCA9IHNsaWRlVyA+PiAxXG5cdFx0XHRzLm1hc2tSZWN0LnZhbHVlU2NhbGUgPSAyXG5cdFx0XHRzLm9sZFBvc2l0aW9uLnggPSBzLm5ld1Bvc2l0aW9uLnhcblx0XHRcdHMubmV3UG9zaXRpb24ueCA9IGN1cnJlbnRQb3NYXG5cdFx0XHRpZih0aGlzLmVsZW1lbnRUaGF0TW92ZWRJblNsaWRlc0FycmF5ICE9IHVuZGVmaW5lZCAmJiB0aGlzLmVsZW1lbnRUaGF0TW92ZWRJblNsaWRlc0FycmF5LmlkID09IHMuaWQpe1xuXHRcdFx0XHRzLndyYXBwZXJDb250YWluZXIueCA9IHMubmV3UG9zaXRpb24ueFxuXHRcdFx0fVxuXHRcdFx0Y3VycmVudFBvc1ggKz0gc2xpZGVXXG5cdFx0fVxuXHRcdHRoaXMucG9zaXRpb25TbGlkZXNob3dDb250YWluZXIoKVxuXHR9XG5cdHBvc2l0aW9uVGl0bGVzQ29udGFpbmVyKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGl0bGVUaW1lb3V0KVxuXHRcdHRoaXMudGl0bGVUaW1lb3V0ID0gc2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dmFyIGNvbXBhc3NTaXplID0gKHdpbmRvd0ggKiBBcHBDb25zdGFudHMuQ09NUEFTU19TSVpFX1BFUkNFTlRBR0UpIDw8IDFcblx0XHRcdHZhciB0b3BPZmZzZXQgPSAod2luZG93SCA+PiAxKSArIChjb21wYXNzU2l6ZSA+PiAxKVxuXHRcdFx0dmFyIHRpdGxlc0NvbnRhaW5lckNzcyA9IHtcblx0XHRcdFx0dG9wOiB0b3BPZmZzZXQgKyAoKHdpbmRvd0ggLSB0b3BPZmZzZXQpID4+IDEpIC0gKHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LmhlaWdodCgpICogMC42KSxcblx0XHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAodGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQud2lkdGgoKSA+PiAxKSxcblx0XHRcdH1cblx0XHRcdHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LmNzcyh0aXRsZXNDb250YWluZXJDc3MpXG5cdFx0fSwgMClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5hcHBseVZhbHVlc1RvU2xpZGVzKClcblx0XHR0aGlzLnBvc2l0aW9uVGl0bGVzQ29udGFpbmVyKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblxuXHRcdHZhciBzbGlkZXMgPSB0aGlzLnNsaWRlc1xuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHNsaWRlcy5sZW5ndGg7IGkrKykge1xuXHQgXHRcdHZhciBzID0gc2xpZGVzW2ldXG5cblx0IFx0XHRzLm1hc2tSZWN0LmcuY2xlYXIoKVxuXHQgXHRcdEFwcFN0b3JlLnJlbGVhc2VHcmFwaGljcyhzLm1hc2tSZWN0LmcpXG5cblx0IFx0XHRzLnNwcml0ZS50ZXh0dXJlLmRlc3Ryb3kodHJ1ZSlcblx0IFx0XHRBcHBTdG9yZS5yZWxlYXNlU3ByaXRlKHMuc3ByaXRlKVxuXG5cdCBcdFx0cy53cmFwcGVyQ29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0IFx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHMud3JhcHBlckNvbnRhaW5lcilcblx0IFx0fVxuXG5cdCBcdHRoaXMuc2xpZGVzLmxlbmd0aCA9IDBcblx0IFx0dGhpcy5wbGFuZXROYW1lVHdlZW4gPSBudWxsXG5cblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnNsaWRlc2hvd0NvbnRhaW5lcilcblxuXHRcdHRoaXMuc2xpZGVzaG93V3JhcHBlci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnNsaWRlc2hvd1dyYXBwZXIpXG5cdFx0XG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQWENvbnRhaW5lciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHR9XG5cdGluaXQoZWxlbWVudElkKSB7XG5cblx0XHR0aGlzLmRpZEhhc2hlckNoYW5nZSA9IHRoaXMuZGlkSGFzaGVyQ2hhbmdlLmJpbmQodGhpcylcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCwgdGhpcy5kaWRIYXNoZXJDaGFuZ2UpXG5cdFx0QXBwU3RvcmUub24oQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRSwgdGhpcy5kaWRIYXNoZXJDaGFuZ2UpXG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnJlbmRlcmVyID0gbmV3IFBJWEkuYXV0b0RldGVjdFJlbmRlcmVyKDEsIDEsIHsgYW50aWFsaWFzOiB0cnVlIH0pXG5cdFx0XHR0aGlzLm9sZENvbG9yID0gXCIweGZmZmZmZlwiXG5cdFx0XHR0aGlzLm5ld0NvbG9yID0gXCIweGZmZmZmZlwiXG5cdFx0XHR0aGlzLmNvbG9yVHdlZW4gPSB7Y29sb3I6dGhpcy5vbGRDb2xvcn1cblx0XHRcdHZhciBlbCA9ICQoZWxlbWVudElkKVxuXHRcdFx0JCh0aGlzLnJlbmRlcmVyLnZpZXcpLmF0dHIoJ2lkJywgJ3B4LWNvbnRhaW5lcicpXG5cdFx0XHRlbC5hcHBlbmQodGhpcy5yZW5kZXJlci52aWV3KVxuXHRcdFx0dGhpcy5zdGFnZSA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0fVxuXHR9XG5cdGFkZChjaGlsZCkge1xuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm5cblx0XHR0aGlzLnN0YWdlLmFkZENoaWxkKGNoaWxkKVxuXHR9XG5cdHJlbW92ZShjaGlsZCkge1xuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm5cblx0XHR0aGlzLnN0YWdlLnJlbW92ZUNoaWxkKGNoaWxkKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgcmV0dXJuXG5cdCAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnN0YWdlKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgcmV0dXJuXG5cdFx0dmFyIHNjYWxlID0gKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID09IHVuZGVmaW5lZCkgPyAxIDogd2luZG93LmRldmljZVBpeGVsUmF0aW9cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmVuZGVyZXIucmVzaXplKHdpbmRvd1cgKiBzY2FsZSwgd2luZG93SCAqIHNjYWxlKVxuXHR9XG5cdGRpZEhhc2hlckNoYW5nZSgpIHtcblx0XHR2YXIgcGFnZUlkID0gQXBwU3RvcmUuZ2V0UGFnZUlkKClcblx0XHR2YXIgcGFsZXR0ZSA9IEFwcFN0b3JlLnBhbGV0dGVDb2xvcnNCeUlkKHBhZ2VJZClcblx0XHQvLyB0aGlzLm9sZENvbG9yID0gdGhpcy5uZXdDb2xvclxuXHRcdC8vIHRoaXMubmV3Q29sb3IgPSBwYWxldHRlWzBdXG5cdFx0Ly8gY29uc29sZS5sb2codGhpcy5vbGRDb2xvciwgdGhpcy5uZXdDb2xvcilcblx0XHQvLyBpZihwYWxldHRlICE9IHVuZGVmaW5lZCkgVHdlZW5NYXgudG8odGhpcy5yZW5kZXJlciwgMSwgeyBjb2xvclByb3BzOiB7YmFja2dyb3VuZENvbG9yOlwicmVkXCJ9fSlcblx0XHQvLyBpZihwYWxldHRlICE9IHVuZGVmaW5lZCkgVHdlZW5NYXgudG8odGhpcy5jb2xvclR3ZWVuLCAxLCB7IGNvbG9yUHJvcHM6IHtjb2xvcjp0aGlzLm5ld0NvbG9yfSwgb25VcGRhdGU6ICgpPT57XG5cdFx0Ly8gXHRjb25zb2xlLmxvZyh0aGlzLmNvbG9yVHdlZW4uY29sb3IpXG5cdFx0Ly8gfX0pXG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdGlmKHBhbGV0dGUgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHZhciBjID0gcGFsZXR0ZVswXVxuXHRcdFx0XHQkKCdodG1sJykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgYy5yZXBsYWNlKCcweCcsICcjJykpXG5cdFx0XHR9XG5cdFx0fWVsc2V7XG5cdFx0XHRpZihwYWxldHRlICE9IHVuZGVmaW5lZCkgdGhpcy5yZW5kZXJlci5iYWNrZ3JvdW5kQ29sb3IgPSBwYWxldHRlWzBdXG5cdFx0fVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVBhZ2UgZnJvbSAnQmFzZVBhZ2UnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhZ2UgZXh0ZW5kcyBCYXNlUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdFx0dGhpcy5yZXNpemUgPSB0aGlzLnJlc2l6ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5weENvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5jaGlsZC5jc3MoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJylcblx0XHRcdCQoJ2h0bWwnKS5jc3MoJ292ZXJmbG93LXknLCAnYXV0bycpXG5cdFx0fVxuXG5cdFx0aWYodGhpcy5wcm9wcy50eXBlID09IEFwcENvbnN0YW50cy5MQU5ESU5HKSB0aGlzLnBhcmVudC5jc3MoJ2N1cnNvcicsICdwb2ludGVyJylcblx0XHRlbHNlIHRoaXMucGFyZW50LmNzcygnY3Vyc29yJywgJ2F1dG8nKVxuXG5cdFx0c2V0VGltZW91dCgoKT0+e0FwcEFjdGlvbnMucHhBZGRDaGlsZCh0aGlzLnB4Q29udGFpbmVyKX0sIDApXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuV0lORE9XX1JFU0laRSwgdGhpcy5yZXNpemUpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c2V0VGltZW91dCgoKT0+e0FwcEFjdGlvbnMucHhSZW1vdmVDaGlsZCh0aGlzLnB4Q29udGFpbmVyKX0sIDApXG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRzZXR1cEFuaW1hdGlvbnMoKSB7XG5cdFx0c3VwZXIuc2V0dXBBbmltYXRpb25zKClcblx0fVxuXHRnZXRJbWFnZVVybEJ5SWQoaWQpIHtcblx0XHRyZXR1cm4gQXBwU3RvcmUuUHJlbG9hZGVyLmdldEltYWdlVVJMKHRoaXMuaWQgKyAnLScgKyB0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKSArICctJyArIGlkKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLnB4Q29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIpXG5cdFx0QXBwU3RvcmUub2ZmKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBCYXNlUGFnZXIgZnJvbSAnQmFzZVBhZ2VyJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5pbXBvcnQgTGFuZGluZyBmcm9tICdMYW5kaW5nJ1xuaW1wb3J0IExhbmRpbmdUZW1wbGF0ZSBmcm9tICdMYW5kaW5nX2hicydcbmltcG9ydCBQbGFuZXRFeHBlcmllbmNlUGFnZSBmcm9tICdQbGFuZXRFeHBlcmllbmNlUGFnZSdcbmltcG9ydCBQbGFuZXRFeHBlcmllbmNlUGFnZVRlbXBsYXRlIGZyb20gJ1BsYW5ldEV4cGVyaWVuY2VQYWdlX2hicydcbmltcG9ydCBQbGFuZXRDYW1wYWlnblBhZ2UgZnJvbSAnUGxhbmV0Q2FtcGFpZ25QYWdlJ1xuaW1wb3J0IFBsYW5ldENhbXBhaWduUGFnZVRlbXBsYXRlIGZyb20gJ1BsYW5ldENhbXBhaWduUGFnZV9oYnMnXG5cbmNsYXNzIFBhZ2VzQ29udGFpbmVyIGV4dGVuZHMgQmFzZVBhZ2VyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IGZhbHNlXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VELCB0aGlzLmRpZEhhc2hlckNoYW5nZSlcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfSU5URVJOQUxfQ0hBTkdFLCB0aGlzLmRpZEhhc2hlckludGVybmFsQ2hhbmdlKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9mZihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCwgdGhpcy5kaWRIYXNoZXJDaGFuZ2UpXG5cdFx0QXBwU3RvcmUub2ZmKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0UsIHRoaXMuZGlkSGFzaGVySW50ZXJuYWxDaGFuZ2UpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG5cdGRpZEhhc2hlckludGVybmFsQ2hhbmdlKCkge1xuXHRcdHRoaXMuY3VycmVudENvbXBvbmVudC5pbnRlcm5hbEhhc2hlckNoYW5nZWQoKVxuXHR9XG5cdGRpZEhhc2hlckNoYW5nZSgpIHtcblx0XHQvLyBTd2FsbG93IGhhc2hlciBjaGFuZ2UgaWYgdGhlIGNoYW5nZSBpcyBmYXN0IGFzIDFzZWNcblx0XHRpZih0aGlzLnN3YWxsb3dIYXNoZXJDaGFuZ2UpIHJldHVybiBcblx0XHRlbHNlIHRoaXMuc2V0dXBOZXdib3JuQ29tcG9uZW50cygpXG5cdFx0dGhpcy5zd2FsbG93SGFzaGVyQ2hhbmdlID0gdHJ1ZVxuXHRcdHRoaXMuaGFzaGVyQ2hhbmdlVGltZW91dCA9IHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IGZhbHNlXG5cdFx0fSwgMTAwMClcblx0fVxuXHRzZXR1cE5ld2Jvcm5Db21wb25lbnRzKCkge1xuXHRcdHZhciBoYXNoID0gUm91dGVyLmdldE5ld0hhc2goKVxuXHRcdHZhciB0ZW1wbGF0ZSA9IHsgdHlwZTogdW5kZWZpbmVkLCBwYXJ0aWFsOiB1bmRlZmluZWQgfVxuXHRcdHN3aXRjaChoYXNoLnBhcnRzLmxlbmd0aCkge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gTGFuZGluZ1xuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gTGFuZGluZ1RlbXBsYXRlXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXBsYXRlLnR5cGUgPSBQbGFuZXRFeHBlcmllbmNlUGFnZVxuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gUGxhbmV0RXhwZXJpZW5jZVBhZ2VUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gUGxhbmV0Q2FtcGFpZ25QYWdlXG5cdFx0XHRcdHRlbXBsYXRlLnBhcnRpYWwgPSBQbGFuZXRDYW1wYWlnblBhZ2VUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGVtcGxhdGUudHlwZSA9IExhbmRpbmdcblx0XHRcdFx0dGVtcGxhdGUucGFydGlhbCA9IExhbmRpbmdUZW1wbGF0ZVx0XHRcblx0XHR9XG5cblx0XHR0aGlzLnNldHVwTmV3Q29tcG9uZW50KGhhc2gucGFyZW50LCB0ZW1wbGF0ZSlcblx0XHR0aGlzLmN1cnJlbnRDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLmN1cnJlbnRDb21wb25lbnQgIT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJlbnRDb21wb25lbnQudXBkYXRlKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQYWdlc0NvbnRhaW5lclxuXG5cblxuIiwiaW1wb3J0IEJhc2VDYW1wYWlnblBhZ2UgZnJvbSAnQmFzZUNhbXBhaWduUGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFycm93QnRuIGZyb20gJ0Fycm93QnRuJ1xuaW1wb3J0IFBsYXlCdG4gZnJvbSAnUGxheUJ0bidcbmltcG9ydCBSZWN0YW5nbGVCdG4gZnJvbSAnUmVjdGFuZ2xlQnRuJ1xuaW1wb3J0IFRpdGxlU3dpdGNoZXIgZnJvbSAnVGl0bGVTd2l0Y2hlcidcbmltcG9ydCBDb21wYXNzZXNDb250YWluZXIgZnJvbSAnQ29tcGFzc2VzQ29udGFpbmVyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGFuZXRDYW1wYWlnblBhZ2UgZXh0ZW5kcyBCYXNlQ2FtcGFpZ25QYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRwcm9wcy5kYXRhWydlbXB0eS1pbWFnZSddID0gQXBwU3RvcmUuZ2V0RW1wdHlJbWdVcmwoKVxuXHRcdHN1cGVyKHByb3BzKVxuXHRcdHRoaXMucHJvZHVjdElkID0gdW5kZWZpbmVkXG5cdFx0dGhpcy5mcm9tSW50ZXJuYWxDaGFuZ2UgPSBmYWxzZVxuXHRcdHRoaXMuY3VycmVudEluZGV4ID0gMFxuXHRcdHRoaXMuZGlyZWN0aW9uID0gQXBwQ29uc3RhbnRzLkxFRlRcblx0XHR0aGlzLmN1cnJlbnRQcm9kdWN0Q29udGFpbmVyQ2xhc3MgPSAncHJvZHVjdC1jb250YWluZXItYidcblx0XHR0aGlzLnRpbWVvdXRUaW1lID0gOTAwXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy51cGRhdGVQcm9kdWN0RGF0YSgpXG5cblx0XHR0aGlzLmluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zTGFuZ1Njb3BlKClcblxuXHRcdHZhciBzbGlkZXNob3dUaXRsZSA9IHRoaXMuY2hpbGQuZmluZCgnLnNsaWRlc2hvdy10aXRsZScpXG5cdFx0dmFyIHBsYW5ldFRpdGxlID0gc2xpZGVzaG93VGl0bGUuZmluZCgnLnBsYW5ldC10aXRsZScpXG5cdFx0dmFyIHBsYW5ldE5hbWUgPSBzbGlkZXNob3dUaXRsZS5maW5kKCcucGxhbmV0LW5hbWUnKVxuXHQgXHR0aGlzLnRpdGxlQ29udGFpbmVyID0ge1xuXHQgXHRcdHBhcmVudDogc2xpZGVzaG93VGl0bGUsXG5cdCBcdFx0cGxhbmV0VGl0bGU6IHBsYW5ldFRpdGxlLFxuXHQgXHRcdHBsYW5ldE5hbWU6IHBsYW5ldE5hbWVcblx0IFx0fVxuXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuID0gVHdlZW5NYXguZnJvbVRvKHBsYW5ldE5hbWUsIDAuNSwge3NjYWxlWDoxLjQsIHNjYWxlWTowLCBvcGFjaXR5OjB9LCB7IHNjYWxlOjEsIG9wYWNpdHk6MSwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9KVxuXHQgXHR0aGlzLnBsYW5ldE5hbWVUd2Vlbi5wYXVzZSgwKVxuXG5cdFx0dmFyIHByb2R1Y3RDb250YWluZXJzV3JhcHBlciA9IHRoaXMuY2hpbGQuZmluZCgnLnByb2R1Y3QtY29udGFpbmVycy13cmFwcGVyJylcblx0XHR2YXIgY29udGFpbmVyQSA9IHByb2R1Y3RDb250YWluZXJzV3JhcHBlci5maW5kKCcucHJvZHVjdC1jb250YWluZXItYScpXG5cdFx0dmFyIGNvbnRhaW5lckIgPSBwcm9kdWN0Q29udGFpbmVyc1dyYXBwZXIuZmluZCgnLnByb2R1Y3QtY29udGFpbmVyLWInKVxuXHRcdHRoaXMuY29udGFpbmVycyA9IHtcblx0XHRcdCdwcm9kdWN0LWNvbnRhaW5lci1hJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQSxcblx0XHRcdFx0cG9zdGVyV3JhcHBlcjogY29udGFpbmVyQS5maW5kKCcucG9zdGVyLXdyYXBwZXInKSxcblx0XHRcdFx0cG9zdGVySW1nOiBjb250YWluZXJBLmZpbmQoJ2ltZycpLFxuXHRcdFx0XHRzcGlubmVyOiB7XG5cdFx0XHRcdFx0ZWw6IGNvbnRhaW5lckEuZmluZCgnLnNwaW5uZXItd3JhcHBlcicpLFxuXHRcdFx0XHRcdHN2ZzogY29udGFpbmVyQS5maW5kKCcuc3Bpbm5lci13cmFwcGVyIHN2ZycpLFxuXHRcdFx0XHRcdHBhdGg6IGNvbnRhaW5lckEuZmluZCgnLnNwaW5uZXItd3JhcHBlciBzdmcgcGF0aCcpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHZpZGVvOiB7XG5cdFx0XHRcdFx0ZWw6IGNvbnRhaW5lckEuZmluZCgnLnZpZGVvLXdyYXBwZXInKSxcblx0XHRcdFx0XHRwbGF5OiBjb250YWluZXJBLmZpbmQoJy5wbGF5LWJ0bicpLFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogY29udGFpbmVyQS5maW5kKCcudmlkZW8tY29udGFpbmVyJyksXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQncHJvZHVjdC1jb250YWluZXItYic6IHtcblx0XHRcdFx0ZWw6IGNvbnRhaW5lckIsXG5cdFx0XHRcdHBvc3RlcldyYXBwZXI6IGNvbnRhaW5lckIuZmluZCgnLnBvc3Rlci13cmFwcGVyJyksXG5cdFx0XHRcdHBvc3RlckltZzogY29udGFpbmVyQi5maW5kKCdpbWcnKSxcblx0XHRcdFx0c3Bpbm5lcjoge1xuXHRcdFx0XHRcdGVsOiBjb250YWluZXJCLmZpbmQoJy5zcGlubmVyLXdyYXBwZXInKSxcblx0XHRcdFx0XHRzdmc6IGNvbnRhaW5lckIuZmluZCgnLnNwaW5uZXItd3JhcHBlciBzdmcnKSxcblx0XHRcdFx0XHRwYXRoOiBjb250YWluZXJCLmZpbmQoJy5zcGlubmVyLXdyYXBwZXIgc3ZnIHBhdGgnKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR2aWRlbzoge1xuXHRcdFx0XHRcdGVsOiBjb250YWluZXJCLmZpbmQoJy52aWRlby13cmFwcGVyJyksXG5cdFx0XHRcdFx0cGxheTogY29udGFpbmVyQi5maW5kKCcucGxheS1idG4nKSxcblx0XHRcdFx0XHRjb250YWluZXI6IGNvbnRhaW5lckIuZmluZCgnLnZpZGVvLWNvbnRhaW5lcicpLFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5hcnJvd0NsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vbkJ1eUNsaWNrZWQgPSB0aGlzLm9uQnV5Q2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vblBsYW5ldENsaWNrZWQgPSB0aGlzLm9uUGxhbmV0Q2xpY2tlZC5iaW5kKHRoaXMpXG5cblx0XHR0aGlzLnByZXZpb3VzQnRuID0gbmV3IEFycm93QnRuKHRoaXMuY2hpbGQuZmluZCgnLnByZXZpb3VzLWJ0bicpLCBBcHBDb25zdGFudHMuTEVGVClcblx0XHR0aGlzLnByZXZpb3VzQnRuLmJ0bkNsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZFxuXHRcdHRoaXMucHJldmlvdXNCdG4uY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdHRoaXMubmV4dEJ0biA9IG5ldyBBcnJvd0J0bih0aGlzLmNoaWxkLmZpbmQoJy5uZXh0LWJ0bicpLCBBcHBDb25zdGFudHMuUklHSFQpXG5cdFx0dGhpcy5uZXh0QnRuLmJ0bkNsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZFxuXHRcdHRoaXMubmV4dEJ0bi5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHR0aGlzLmJ1eUJ0biA9IG5ldyBUaXRsZVN3aXRjaGVyKHRoaXMuY2hpbGQuZmluZCgnLmJ1eS1idG4nKSwgdGhpcy5jaGlsZC5maW5kKCcuZG90cy1yZWN0YW5nbGUtYnRuJyksIHRoaXMuaW5mb3NbJ2J1eV90aXRsZSddKVxuXHRcdHRoaXMuYnV5QnRuLm9uQ2xpY2sgPSB0aGlzLm9uQnV5Q2xpY2tlZFxuXHRcdHRoaXMuYnV5QnRuLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHRoaXMucGxheUJ0biA9IG5ldyBQbGF5QnRuKHRoaXMuY2hpbGQuZmluZCgnLnBsYXktYnRuJykpXG5cdFx0dGhpcy5wbGF5QnRuLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdGlmKCFBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIgPSBuZXcgQ29tcGFzc2VzQ29udGFpbmVyKHRoaXMucHhTY3JvbGxDb250YWluZXIsIHRoaXMuY2hpbGQuZmluZChcIi5pbnRlcmZhY2UuYWJzb2x1dGVcIikpXG5cdFx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5pZCA9IHRoaXMuaWRcblx0XHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmNvbXBvbmVudERpZE1vdW50KClcblx0XHR9XG5cblx0XHQvLyB0aGlzLm9uVmlkZW9Nb3VzZUVudGVyID0gdGhpcy5vblZpZGVvTW91c2VFbnRlci5iaW5kKHRoaXMpXG5cdFx0Ly8gdGhpcy5vblZpZGVvTW91c2VMZWF2ZSA9IHRoaXMub25WaWRlb01vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHRcdC8vIHRoaXMub25WaWRlb0NsaWNrID0gdGhpcy5vblZpZGVvQ2xpY2suYmluZCh0aGlzKVxuXG5cdFx0dGhpcy5jaGVja0N1cnJlbnRQcm9kdWN0QnlVcmwoKVxuXHRcdHRoaXMudXBkYXRlQ29sb3JzKClcblx0XHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIHRoaXMub25LZXlQcmVzc2VkKVxuXG5cdFx0dGhpcy51cGRhdGVUaXRsZXModGhpcy5pbmZvcy5wbGFuZXQudG9VcHBlckNhc2UoKSwgdGhpcy5pZC50b1VwcGVyQ2FzZSgpKVxuXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGFkZFZpZGVvRXZlbnRzKCkge1xuXHRcdC8vIGlmKHRoaXMuY3VycmVudENvbnRhaW5lciA9PSB1bmRlZmluZWQpIHJldHVyblxuXHRcdC8vIHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5lbC5vbignbW91c2VlbnRlcicsIHRoaXMub25WaWRlb01vdXNlRW50ZXIpXG5cdFx0Ly8gdGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5vblZpZGVvTW91c2VMZWF2ZSlcblx0XHQvLyB0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8uZWwub24oJ2NsaWNrJywgdGhpcy5vblZpZGVvQ2xpY2spXG5cdH1cblx0cmVtb3ZlVmlkZW9FdmVudHMoKSB7XG5cdFx0Ly8gaWYodGhpcy5jdXJyZW50Q29udGFpbmVyID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cdFx0Ly8gdGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLm9mZignbW91c2VlbnRlcicsIHRoaXMub25WaWRlb01vdXNlRW50ZXIpXG5cdFx0Ly8gdGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLm9mZignbW91c2VsZWF2ZScsIHRoaXMub25WaWRlb01vdXNlTGVhdmUpXG5cdFx0Ly8gdGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLm9mZignY2xpY2snLCB0aGlzLm9uVmlkZW9DbGljaylcblx0fVxuXHRvblZpZGVvTW91c2VFbnRlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLnBsYXkuYWRkQ2xhc3MoJ2hvdmVyZWQnKVxuXHR9XG5cdG9uVmlkZW9Nb3VzZUxlYXZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8ucGxheS5yZW1vdmVDbGFzcygnaG92ZXJlZCcpXG5cdH1cblx0b25WaWRlb0NsaWNrKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLmFzc2lnblZpZGVvVG9OZXdDb250YWluZXIoKVxuXHR9XG5cdHVwZGF0ZVRpdGxlcyh0aXRsZSwgbmFtZSkge1xuXHRcdHZhciBwbGFuZXRUaXRsZSA9IHRoaXMudGl0bGVDb250YWluZXIucGxhbmV0VGl0bGVcblx0XHR2YXIgcGxhbmV0TmFtZSA9IHRoaXMudGl0bGVDb250YWluZXIucGxhbmV0TmFtZVxuXHQgXHRwbGFuZXRUaXRsZS50ZXh0KHRpdGxlKVxuXHQgXHRwbGFuZXROYW1lLnRleHQobmFtZSlcblx0IFx0dGhpcy5wbGFuZXROYW1lVHdlZW4ucGxheSgwKVxuXHR9XG5cdHVwZGF0ZVByb2R1Y3REYXRhKCkge1xuXHRcdHRoaXMucHJvZHVjdHMgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHRoaXMuaWQpXG5cdH1cblx0b25QbGFuZXRDbGlja2VkKCkge1xuXHRcdHZhciB1cmwgPSBcIi9sYW5kaW5nXCJcblx0XHRSb3V0ZXIuc2V0SGFzaCh1cmwpXG5cdH1cblx0b25CdXlDbGlja2VkKCkge1xuXHRcdGNvbnNvbGUubG9nKCdidXknKVxuXHR9XG5cdGFycm93Q2xpY2tlZChkaXJlY3Rpb24pIHtcblx0XHRpZih0aGlzLmFuaW1hdGlvblJ1bm5pbmcpIHJldHVyblxuXHRcdHRoaXMuc3dpdGNoU2xpZGVCeURpcmVjdGlvbihkaXJlY3Rpb24pXG5cdH1cblx0b25LZXlQcmVzc2VkKGUpIHtcblx0XHRpZih0aGlzLmFuaW1hdGlvblJ1bm5pbmcpIHJldHVyblxuXHQgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0c3dpdGNoKGUud2hpY2gpIHtcblx0ICAgICAgICBjYXNlIDM3OiAvLyBsZWZ0XG5cdCAgICAgICAgXHR0aGlzLnN3aXRjaFNsaWRlQnlEaXJlY3Rpb24oQXBwQ29uc3RhbnRzLkxFRlQpXG5cdCAgICAgICAgXHRicmVhaztcblx0ICAgICAgICBjYXNlIDM5OiAvLyByaWdodFxuXHQgICAgICAgIFx0dGhpcy5zd2l0Y2hTbGlkZUJ5RGlyZWN0aW9uKEFwcENvbnN0YW50cy5SSUdIVClcblx0ICAgICAgICBcdGJyZWFrO1xuXHQgICAgICAgIGNhc2UgMzg6IC8vIHVwXG5cdCAgICAgICAgXHRicmVhaztcblx0ICAgICAgICBjYXNlIDQwOiAvLyBkb3duXG5cdCAgICAgICAgXHRicmVhaztcblx0ICAgICAgICBkZWZhdWx0OiByZXR1cm47XG5cdCAgICB9XG5cdH1cblx0c3dpdGNoU2xpZGVCeURpcmVjdGlvbihkaXJlY3Rpb24pIHtcblx0XHRzd2l0Y2goZGlyZWN0aW9uKSB7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MRUZUOlxuXHRcdFx0XHR0aGlzLnByZXZpb3VzKClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlJJR0hUOlxuXHRcdFx0XHR0aGlzLm5leHQoKVxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHRpZih0aGlzLmN1cnJlbnRJbmRleCA+IHRoaXMucHJvZHVjdHMubGVuZ3RoLTEpIHtcblx0XHRcdHZhciBuZXh0SWQgPSBBcHBTdG9yZS5nZXROZXh0UGxhbmV0KHRoaXMuaWQpXG5cdFx0XHR2YXIgbmV4dHVybCA9IFwiL3BsYW5ldC9cIiArIG5leHRJZCArICcvMCdcblx0XHRcdFJvdXRlci5zZXRIYXNoKG5leHR1cmwpXG5cdFx0XHRyZXR1cm5cblx0XHR9ZWxzZSBpZih0aGlzLmN1cnJlbnRJbmRleCA8IDApIHtcblx0XHRcdHZhciBwcmV2aW91c0lkID0gQXBwU3RvcmUuZ2V0UHJldmlvdXNQbGFuZXQodGhpcy5pZClcblx0XHRcdHZhciBwcm9kdWN0c0RhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHByZXZpb3VzSWQpXG5cdFx0XHR2YXIgcHJldmlvdXN1cmwgPSBcIi9wbGFuZXQvXCIgKyBwcmV2aW91c0lkICsgJy8nICsgKHByb2R1Y3RzRGF0YS5sZW5ndGgtMSkudG9TdHJpbmcoKVxuXHRcdFx0Um91dGVyLnNldEhhc2gocHJldmlvdXN1cmwpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cdFx0dGhpcy51cGRhdGVIYXNoZXIoKVxuXHR9XG5cdHVwZGF0ZUhhc2hlcigpIHtcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZCArICcvJyArIHRoaXMuY3VycmVudEluZGV4XG5cdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHR9XG5cdG5leHQoKSB7XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTEVGVFxuXHRcdHRoaXMuY3VycmVudEluZGV4ICs9IDFcblx0fVxuXHRwcmV2aW91cygpIHtcblx0XHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5SSUdIVFxuXHRcdHRoaXMuY3VycmVudEluZGV4IC09IDFcblx0fVxuXHRnZXRDdXJyZW50SW5kZXhGcm9tUHJvZHVjdElkKHByb2R1Y3RJZCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wcm9kdWN0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYodGhpcy5wcm9kdWN0c1tpXS5pZCA9PSBwcm9kdWN0SWQpIHtcblx0XHRcdFx0cmV0dXJuIGlcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0aW50ZXJuYWxIYXNoZXJDaGFuZ2VkKCkge1xuXHRcdHZhciBuZXdJZCA9IEFwcFN0b3JlLmdldFBhZ2VJZCgpXG5cdFx0aWYobmV3SWQgIT0gdGhpcy5pZCkge1xuXHRcdFx0dGhpcy51cGRhdGVUaXRsZXModGhpcy5pbmZvcy5wbGFuZXQudG9VcHBlckNhc2UoKSwgbmV3SWQudG9VcHBlckNhc2UoKSlcblx0XHRcdHRoaXMucG9zaXRpb25UaXRsZXNDb250YWluZXIoKVxuXHRcdH1cblx0XHR0aGlzLmlkID0gbmV3SWRcblx0XHR0aGlzLnByb3BzLmRhdGEgPSBBcHBTdG9yZS5wYWdlQ29udGVudCgpXG5cdFx0dGhpcy51cGRhdGVQcm9kdWN0RGF0YSgpXG5cdFx0dGhpcy5mcm9tSW50ZXJuYWxDaGFuZ2UgPSB0cnVlXG5cdFx0dGhpcy5jaGVja0N1cnJlbnRQcm9kdWN0QnlVcmwoKVxuXG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5jdXJyZW50SW5kZXggPSB0aGlzLmN1cnJlbnRJbmRleFxuXHRcdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuY2hhbmdlRGF0YSh0aGlzLmlkKVxuXHRcdH1cblx0XHR0aGlzLnVwZGF0ZUNvbG9ycygpXG5cdH1cblx0Y2hlY2tDdXJyZW50UHJvZHVjdEJ5VXJsKCkge1xuXHRcdHZhciBuZXdIYXNoZXIgPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG5cdFx0dmFyIHByb2R1Y3RJZCA9IHBhcnNlSW50KG5ld0hhc2hlci50YXJnZXRJZCwgMTApXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggPSB0aGlzLmdldEN1cnJlbnRJbmRleEZyb21Qcm9kdWN0SWQocHJvZHVjdElkKVxuXHRcdHRoaXMuc2hvd1Byb2R1Y3RCeUlkKHByb2R1Y3RJZClcblx0fVxuXHR1cGRhdGVDb2xvcnMoKSB7XG5cdFx0dmFyIGNvbG9yID0gdGhpcy5wcm9kdWN0c1t0aGlzLmN1cnJlbnRJbmRleF0uY29sb3Jcblx0XHR0aGlzLmJ1eUJ0bi51cGRhdGVDb2xvcihjb2xvcilcblx0XHR2YXIgYyA9IGNvbG9yLnJlcGxhY2UoJzB4JywgJyMnKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5zcGlubmVyLnBhdGguY3NzKCdmaWxsJywgYylcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8uZWwuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgYylcblx0fVxuXHRzaG93UHJvZHVjdEJ5SWQoaWQpIHtcblx0XHR0aGlzLmFuaW1hdGlvblJ1bm5pbmcgPSB0cnVlXG5cdFx0dGhpcy5wcm9kdWN0SWQgPSBpZFxuXHRcdHRoaXMuY3VycmVudFByb2R1Y3RDb250YWluZXJDbGFzcyA9ICh0aGlzLmN1cnJlbnRQcm9kdWN0Q29udGFpbmVyQ2xhc3MgPT09ICdwcm9kdWN0LWNvbnRhaW5lci1hJykgPyAncHJvZHVjdC1jb250YWluZXItYicgOiAncHJvZHVjdC1jb250YWluZXItYSdcblx0XHR0aGlzLnByZXZpb3VzQ29udGFpbmVyID0gdGhpcy5jdXJyZW50Q29udGFpbmVyXG5cdFx0dGhpcy5yZW1vdmVWaWRlb0V2ZW50cygpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyID0gdGhpcy5jb250YWluZXJzW3RoaXMuY3VycmVudFByb2R1Y3RDb250YWluZXJDbGFzc11cblx0XHR0aGlzLmFkZFZpZGVvRXZlbnRzKClcblx0XHRcblx0XHR0aGlzLmFzc2lnbkFzc2V0c1RvTmV3Q29udGFpbmVyKClcblx0XHR0aGlzLnJlc2l6ZU1lZGlhV3JhcHBlcnMoKVxuXHRcdHRoaXMucmVzaXplVmlkZW9XcmFwcGVyKClcblx0XHR0aGlzLmFuaW1hdGVDb250YWluZXJzKClcblxuXHRcdHRoaXMudXBkYXRlUGFnZUhlaWdodCgpXG5cdH1cblx0YXNzaWduQXNzZXRzVG9OZXdDb250YWluZXIoKSB7XG5cdFx0dmFyIHByb2R1Y3RTY29wZSA9IEFwcFN0b3JlLmdldFNwZWNpZmljUHJvZHVjdEJ5SWQodGhpcy5pZCwgdGhpcy5wcm9kdWN0SWQpXG5cdFx0dmFyIGltZ1NpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlUG9zdGVySW1hZ2UoKVxuXHRcdHZhciBpbWdTcmMgPSBBcHBTdG9yZS5nZXRFbnZpcm9ubWVudCgpLnN0YXRpYyArICdpbWFnZS9wbGFuZXRzLycgKyB0aGlzLmlkICsgJy8nICsgcHJvZHVjdFNjb3BlWydpZCddICsgJy0nICsgaW1nU2l6ZSArICcuanBnJ1xuXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnBvc3RlckltZy5hdHRyKCdzcmMnLCB0aGlzLnByb3BzLmRhdGFbJ2VtcHR5LWltYWdlJ10pXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnBvc3RlckltZy5yZW1vdmVDbGFzcygnb3BlbmVkJylcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIuc3Bpbm5lci5lbC5yZW1vdmVDbGFzcygnY2xvc2VkJylcblx0XHR2YXIgaW1nID0gbmV3IEltYWdlKClcblx0XHRpbWcub25sb2FkID0gKCk9PiB7XG5cdFx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIucG9zdGVySW1nLmF0dHIoJ3NyYycsIGltZ1NyYylcblx0XHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5zcGlubmVyLmVsLmFkZENsYXNzKCdjbG9zZWQnKVxuXHRcdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnBvc3RlckltZy5hZGRDbGFzcygnb3BlbmVkJylcblx0XHR9XG5cdFx0aW1nLnNyYyA9IGltZ1NyY1xuXG5cdFx0dGhpcy5idXlCdG4udXBkYXRlKHRoaXMuaW5mb3MuYnV5X3RpdGxlICsgJyAnICsgcHJvZHVjdFNjb3BlLm5hbWUpXG5cdH1cblx0YXNzaWduVmlkZW9Ub05ld0NvbnRhaW5lcigpIHtcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8uY29udGFpbmVyLnJlbW92ZUNsYXNzKCdvcGVuZWQnKVxuXG5cdFx0dmFyIHByb2R1Y3RTY29wZSA9IEFwcFN0b3JlLmdldFNwZWNpZmljUHJvZHVjdEJ5SWQodGhpcy5pZCwgdGhpcy5wcm9kdWN0SWQpXG5cdFx0dmFyIHZpZGVvSWQgPSBwcm9kdWN0U2NvcGVbJ3ZpZGVvLWlkJ11cblx0XHR2YXIgZnJhbWVVVUlEID0gVXRpbHMuVVVJRCgpXG5cdFx0dmFyIGlmcmFtZVN0ciA9ICc8aWZyYW1lIHNyYz1cIi8vZmFzdC53aXN0aWEubmV0L2VtYmVkL2lmcmFtZS8nK3ZpZGVvSWQrJ1wiIGlkPVwiJytmcmFtZVVVSUQrJ1wiIGFsbG93dHJhbnNwYXJlbmN5PVwiZmFsc2VcIiBmcmFtZWJvcmRlcj1cIjBcIiBzY3JvbGxpbmc9XCJub1wiIGNsYXNzPVwid2lzdGlhX2VtYmVkXCIgbmFtZT1cIndpc3RpYV9lbWJlZFwiIGFsbG93ZnVsbHNjcmVlbiBtb3phbGxvd2Z1bGxzY3JlZW4gd2Via2l0YWxsb3dmdWxsc2NyZWVuIG9hbGxvd2Z1bGxzY3JlZW4gbXNhbGxvd2Z1bGxzY3JlZW4gd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiPjwvaWZyYW1lPidcblx0XHR2YXIgaWZyYW1lID0gJChpZnJhbWVTdHIpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLnV1aWQgPSBmcmFtZVVVSURcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8uY29udGFpbmVyLmh0bWwoaWZyYW1lKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlb0lzQWRkZWQgPSB0cnVlXG5cblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8uY29udGFpbmVyLmFkZENsYXNzKCdvcGVuZWQnKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5lbC5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAndHJhbnNwYXJlbnQnKVxuXG5cdFx0Ly8gc2V0VGltZW91dCgoKT0+e1xuXHRcdC8vIFx0dmFyIHdpc3RpYUVtYmVkID0gJCgnIycrZnJhbWVVVUlEKVswXS53aXN0aWFBcGlcblx0XHQvLyBcdHdpc3RpYUVtYmVkLmJpbmQoXCJlbmRcIiwgKCk9PiB7XG5cdFx0Ly8gXHRcdGFsZXJ0KFwiVGhlIHZpZGVvIGVuZGVkIVwiKTtcblx0XHQvLyBcdH0pO1xuXHRcdC8vIH0sIDIwMDApXG5cdH1cblx0YW5pbWF0ZUNvbnRhaW5lcnMoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR2YXIgZGlyID0gKHRoaXMuZGlyZWN0aW9uID09IEFwcENvbnN0YW50cy5MRUZUKSA/IDEgOiAtMVxuXHRcdHZhciB0aW1lID0gKHRoaXMucHJldmlvdXNDb250YWluZXIgPT0gdW5kZWZpbmVkKSA/IDAgOiAxXG5cdFx0aWYodGhpcy5wcmV2aW91c0NvbnRhaW5lciAhPSB1bmRlZmluZWQpIFR3ZWVuTWF4LmZyb21Ubyh0aGlzLnByZXZpb3VzQ29udGFpbmVyLmVsLCAxLCB7eDowLCBvcGFjaXR5OiAxfSwgeyB4Oi13aW5kb3dXKmRpciwgb3BhY2l0eTogMSwgZm9yY2UzRDp0cnVlLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0pXG5cdFx0VHdlZW5NYXguZnJvbVRvKHRoaXMuY3VycmVudENvbnRhaW5lci5lbCwgdGltZSwge3g6d2luZG93VypkaXIsIG9wYWNpdHk6IDF9LCB7IHg6MCwgb3BhY2l0eTogMSwgZm9yY2UzRDp0cnVlLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0pXG5cdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dGhpcy51cGRhdGVUb3BCdXR0b25zUG9zaXRpb25zKClcblx0XHRcdHRoaXMuYnV5QnRuLnNob3coKVxuXHRcdH0sIDIwMClcblx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR0aGlzLmFuaW1hdGlvblJ1bm5pbmcgPSBmYWxzZVxuXHRcdFx0dGhpcy5yZW1vdmVQcmV2aW91c0NvbnRhaW5lckFzc2V0cygpXG5cdFx0fSwgdGhpcy50aW1lb3V0VGltZSlcblx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR0aGlzLmFzc2lnblZpZGVvVG9OZXdDb250YWluZXIoKVxuXHRcdH0sIHRoaXMudGltZW91dFRpbWUgKyA1MDApXG5cdH1cblx0cmVtb3ZlUHJldmlvdXNDb250YWluZXJBc3NldHMoKSB7XG5cdFx0aWYodGhpcy5wcmV2aW91c0NvbnRhaW5lciA9PSB1bmRlZmluZWQpIHJldHVyblxuXHRcdHRoaXMucHJldmlvdXNDb250YWluZXIucG9zdGVySW1nLmF0dHIoJ3NyYycsIHRoaXMucHJvcHMuZGF0YVsnZW1wdHktaW1hZ2UnXSlcblx0XHR0aGlzLnByZXZpb3VzQ29udGFpbmVyLnZpZGVvLmNvbnRhaW5lci5odG1sKCcnKVxuXHRcdHRoaXMucHJldmlvdXNDb250YWluZXIudmlkZW8uY29udGFpbmVyLnJlbW92ZUNsYXNzKCdvcGVuZWQnKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlb0lzQWRkZWQgPSBmYWxzZVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdGlmKCFBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuY3VycmVudEluZGV4ID0gdGhpcy5jdXJyZW50SW5kZXhcblx0XHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0XHR9XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdGlmKCFBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgdGhpcy5jb21wYXNzZXNDb250YWluZXIud2lsbFRyYW5zaXRpb25PdXQoKVxuXHRcdHN1cGVyLndpbGxUcmFuc2l0aW9uT3V0KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci51cGRhdGUoKVxuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplTWVkaWFXcmFwcGVycygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dmFyIG9yaWVudGF0aW9uID0gKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSA/IEFwcENvbnN0YW50cy5MQU5EU0NBUEUgOiB1bmRlZmluZWRcblx0XHR2YXIgc2NhbGUgPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gMSA6IDAuNlxuXG5cdFx0dmFyIGltYWdlUmVzaXplID0gVXRpbHMuUmVzaXplUG9zaXRpb25Qcm9wb3J0aW9uYWxseSh3aW5kb3dXICogc2NhbGUsIHdpbmRvd0ggKiBzY2FsZSwgQXBwQ29uc3RhbnRzLkNBTVBBSUdOX0lNQUdFX1NJWkVbMF0sIEFwcENvbnN0YW50cy5DQU1QQUlHTl9JTUFHRV9TSVpFWzFdLCBvcmllbnRhdGlvbilcblx0XHRcblx0XHR2YXIgcG9zdGVyVG9wID0gKHdpbmRvd0ggKiAwLjUxKSAtIChpbWFnZVJlc2l6ZS5oZWlnaHQgPj4gMSlcblx0XHRwb3N0ZXJUb3AgPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gMjIwIDogcG9zdGVyVG9wXG5cdFx0XG5cdFx0dGhpcy5wb3N0ZXJJbWdDc3MgPSB7XG5cdFx0XHR3aWR0aDogaW1hZ2VSZXNpemUud2lkdGgsXG5cdFx0XHRoZWlnaHQ6IGltYWdlUmVzaXplLmhlaWdodCxcblx0XHRcdHRvcDogcG9zdGVyVG9wLFxuXHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAoaW1hZ2VSZXNpemUud2lkdGggPj4gMSlcblx0XHR9XG5cblx0XHRpZih0aGlzLnByZXZpb3VzQ29udGFpbmVyICE9IHVuZGVmaW5lZCkgdGhpcy5wcmV2aW91c0NvbnRhaW5lci5lbC5jc3MoJ3otaW5kZXgnLCAxKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5lbC5jc3MoJ3otaW5kZXgnLCAyKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5wb3N0ZXJXcmFwcGVyLmNzcyh0aGlzLnBvc3RlckltZ0NzcylcblxuXHRcdHRoaXMucG9zdGVyVG90YWxIZWlnaHQgPSAodGhpcy5wb3N0ZXJJbWdDc3MudG9wIDw8IDEpICsgdGhpcy5wb3N0ZXJJbWdDc3MuaGVpZ2h0XG5cdH1cblx0cmVzaXplVmlkZW9XcmFwcGVyKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR2YXIgb3JpZW50YXRpb24gPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSA6IHVuZGVmaW5lZFxuXHRcdHZhciBzY2FsZSA9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyAxIDogMC42XG5cblx0XHR2YXIgdmlkZW9SZXNpemUgPSBVdGlscy5SZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5KHdpbmRvd1cgKiBzY2FsZSwgd2luZG93SCAqIHNjYWxlLCBBcHBDb25zdGFudHMuTUVESUFfR0xPQkFMX1csIEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfSCwgb3JpZW50YXRpb24pXG5cdFx0XG5cdFx0dmFyIHZpZGVvVG9wID0gKHRoaXMuY29tcGFzc1BhZGRpbmcgPDwgMSkgKyB3aW5kb3dIICsgdGhpcy5wb3N0ZXJJbWdDc3MudG9wXG5cdFx0dmlkZW9Ub3AgPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gdGhpcy5idXlCdG4ueSArIHRoaXMuYnV5QnRuLmhlaWdodCArIDEwMCA6IHZpZGVvVG9wXG5cblx0XHR2YXIgdmlkZW9Dc3MgPSB7XG5cdFx0XHR3aWR0aDogdmlkZW9SZXNpemUud2lkdGgsXG5cdFx0XHRoZWlnaHQ6IHZpZGVvUmVzaXplLmhlaWdodCxcblx0XHRcdHRvcDogdmlkZW9Ub3AsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtICh2aWRlb1Jlc2l6ZS53aWR0aCA+PiAxKVx0XG5cdFx0fVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5lbC5jc3ModmlkZW9Dc3MpXG5cdFx0dGhpcy52aWRlb1RvdGFsSGVpZ2h0ID0gKHRoaXMucG9zdGVySW1nQ3NzLnRvcCA8PCAxKSArIHZpZGVvQ3NzLmhlaWdodFxuXHR9XG5cdHVwZGF0ZVRvcEJ1dHRvbnNQb3NpdGlvbnMoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR2YXIgdG9wUG9zID0gKHRoaXMucG9zdGVySW1nQ3NzLnRvcCArIHRoaXMucG9zdGVySW1nQ3NzLmhlaWdodCkgKyAoKHdpbmRvd0ggLSAodGhpcy5wb3N0ZXJJbWdDc3MudG9wICsgdGhpcy5wb3N0ZXJJbWdDc3MuaGVpZ2h0KSkgPj4gMSkgLSAodGhpcy5idXlCdG4uaGVpZ2h0KSAtICh0aGlzLmJ1eUJ0bi5oZWlnaHQgPj4gMSlcblx0XHR0b3BQb3MgPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gdGhpcy5wb3N0ZXJJbWdDc3MudG9wICsgdGhpcy5wb3N0ZXJJbWdDc3MuaGVpZ2h0ICsgNjAgOiB0b3BQb3Ncblx0XHR0aGlzLmJ1eUJ0bi5wb3NpdGlvbihcblx0XHRcdCh3aW5kb3dXID4+IDEpIC0gKHRoaXMuYnV5QnRuLndpZHRoID4+IDEpLFxuXHRcdFx0dG9wUG9zXG5cdFx0KVxuXHR9XG5cdHJlc2l6ZUNvbXBhc3NDb250YWluZXIoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5yZXNpemUoKVxuXHRcdHRoaXMuY29tcGFzc1BhZGRpbmcgPSAxNDBcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5wb3NpdGlvbihcblx0XHRcdCh3aW5kb3dXID4+IDEpIC0gKHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLndpZHRoID4+IDEpLFxuXHRcdFx0KHdpbmRvd0gpICsgdGhpcy5jb21wYXNzUGFkZGluZyArICh0aGlzLmNvbXBhc3NQYWRkaW5nICogMC4zKVxuXHRcdClcblx0fVxuXHR1cGRhdGVQYWdlSGVpZ2h0KCkge1xuXHRcdHRoaXMucGFnZUhlaWdodCA9IHRoaXMudmlkZW9Ub3RhbEhlaWdodCArIHRoaXMucG9zdGVyVG90YWxIZWlnaHQgKyAodGhpcy5jb21wYXNzUGFkZGluZyA8PCAxKVxuXHR9XG5cdHBvc2l0aW9uVGl0bGVzQ29udGFpbmVyKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGl0bGVUaW1lb3V0KVxuXHRcdHRoaXMudGl0bGVUaW1lb3V0ID0gc2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dmFyIGNvbXBhc3NTaXplID0gKHdpbmRvd0ggKiBBcHBDb25zdGFudHMuQ09NUEFTU19TSVpFX1BFUkNFTlRBR0UpIDw8IDFcblx0XHRcdHZhciB0b3BPZmZzZXQgPSAod2luZG93SCA+PiAxKSArIChjb21wYXNzU2l6ZSA+PiAxKVxuXHRcdFx0dmFyIHRvcFBvcyA9ICh0aGlzLnBvc3RlckltZ0Nzcy50b3AgPj4gMSkgLSAodGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQuaGVpZ2h0KCkgPj4gMSlcblx0XHRcdHRvcFBvcyArPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gMzAgOiAwXG5cdFx0XHR2YXIgdGl0bGVzQ29udGFpbmVyQ3NzID0ge1xuXHRcdFx0XHR0b3A6IHRvcFBvcyxcblx0XHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAodGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQud2lkdGgoKSA+PiAxKSxcblx0XHRcdH1cblx0XHRcdHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LmNzcyh0aXRsZXNDb250YWluZXJDc3MpXG5cdFx0fSwgMClcblx0fVxuXHRyZXNpemUoKSB7XG5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB0aGlzLnJlc2l6ZUNvbXBhc3NDb250YWluZXIoKVxuXHRcdHRoaXMucG9zaXRpb25UaXRsZXNDb250YWluZXIoKVxuXHRcdHRoaXMucmVzaXplTWVkaWFXcmFwcGVycygpXG5cdFx0dGhpcy51cGRhdGVUb3BCdXR0b25zUG9zaXRpb25zKClcblx0XHR0aGlzLnJlc2l6ZVZpZGVvV3JhcHBlcigpXG5cdFx0dGhpcy51cGRhdGVQYWdlSGVpZ2h0KClcblxuXHRcdHZhciBwcmV2aW91c1hQb3MgPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gMCA6ICh0aGlzLnBvc3RlckltZ0Nzcy5sZWZ0ID4+IDEpIC0gKHRoaXMucHJldmlvdXNCdG4ud2lkdGggPj4gMSkgLSA0XG5cdFx0dmFyIG5leHRYUG9zID0gKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSA/IHdpbmRvd1cgLSB0aGlzLnByZXZpb3VzQnRuLndpZHRoIDogKHRoaXMucG9zdGVySW1nQ3NzLmxlZnQgKyB0aGlzLnBvc3RlckltZ0Nzcy53aWR0aCkgKyAoKHdpbmRvd1cgLSAodGhpcy5wb3N0ZXJJbWdDc3MubGVmdCArIHRoaXMucG9zdGVySW1nQ3NzLndpZHRoKSkgPj4gMSkgLSAodGhpcy5uZXh0QnRuLndpZHRoID4+IDEpICsgNFxuXG5cdFx0dGhpcy5wcmV2aW91c0J0bi5wb3NpdGlvbihcblx0XHRcdHByZXZpb3VzWFBvcyxcblx0XHRcdCh3aW5kb3dIID4+IDEpIC0gKHRoaXMucHJldmlvdXNCdG4uaGVpZ2h0ID4+IDEpXG5cdFx0KVxuXHRcdHRoaXMubmV4dEJ0bi5wb3NpdGlvbihcblx0XHRcdG5leHRYUG9zLFxuXHRcdFx0KHdpbmRvd0ggPj4gMSkgLSAodGhpcy5wcmV2aW91c0J0bi5oZWlnaHQgPj4gMSlcblx0XHQpXG5cblx0XHR2YXIgY2hpbGRDc3MgPSB7XG5cdFx0XHR3aWR0aDogd2luZG93Vyxcblx0XHR9XG5cdFx0dGhpcy5jaGlsZC5jc3MoY2hpbGRDc3MpXG5cblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdCQoZG9jdW1lbnQpLm9mZigna2V5ZG93bicsIHRoaXMub25LZXlQcmVzc2VkKVxuXHRcdGNsZWFyVGltZW91dCh0aGlzLnZpZGVvQXNzaWduVGltZW91dClcblx0XHRpZighQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLnByZXZpb3VzQnRuLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLm5leHRCdG4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuYnV5QnRuLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlUGxhbmV0UGFnZSBmcm9tICdCYXNlUGxhbmV0UGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQ29tcGFzc2VzQ29udGFpbmVyIGZyb20gJ0NvbXBhc3Nlc0NvbnRhaW5lcidcbmltcG9ydCBSZWN0YW5nbGVCdG4gZnJvbSAnUmVjdGFuZ2xlQnRuJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5pbXBvcnQgQWxhc2thWFAgZnJvbSAnQWxhc2thWFAnXG5pbXBvcnQgU2tpWFAgZnJvbSAnU2tpWFAnXG5pbXBvcnQgTWV0YWxYUCBmcm9tICdNZXRhbFhQJ1xuaW1wb3J0IFdvb2RYUCBmcm9tICdXb29kWFAnXG5pbXBvcnQgR2VtU3RvbmVYUCBmcm9tICdHZW1TdG9uZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGFuZXRFeHBlcmllbmNlUGFnZSBleHRlbmRzIEJhc2VQbGFuZXRQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcylcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblxuXHRcdHZhciBpbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cblx0XHR2YXIgWHBDbGF6eiA9IHRoaXMuZ2V0RXhwZXJpZW5jZUJ5SWQodGhpcy5pZClcblx0XHR0aGlzLmV4cGVyaWVuY2UgPSBuZXcgWHBDbGF6eih0aGlzLnB4Q29udGFpbmVyKVxuXHRcdHRoaXMuZXhwZXJpZW5jZS5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0XG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIgPSBuZXcgQ29tcGFzc2VzQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIsIHRoaXMuY2hpbGQpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuaWQgPSB0aGlzLmlkXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5nb0NhbXBhaWduQnRuID0gbmV3IFJlY3RhbmdsZUJ0bih0aGlzLmNoaWxkLmZpbmQoJy5nby1jYW1wYWlnbi1idG4nKSwgaW5mb3MuY2FtcGFpZ25fdGl0bGUpXG5cdFx0dGhpcy5nb0NhbXBhaWduQnRuLmJ0bkNsaWNrZWQgPSB0aGlzLm9uR29DYW1wYWlnbkNsaWNrZWRcblx0XHR0aGlzLmdvQ2FtcGFpZ25CdG4uY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdG9uR29DYW1wYWlnbkNsaWNrZWQoKSB7XG5cdFx0dmFyIHVybCA9IFwiL3BsYW5ldC9cIiArIHRoaXMuaWQgKyAnLzAnXG5cdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHR9XG5cdGdldEV4cGVyaWVuY2VCeUlkKGlkKSB7XG5cdFx0c3dpdGNoKGlkKXtcblx0XHRcdGNhc2UgJ3NraSc6IHJldHVybiBTa2lYUFxuXHRcdFx0Y2FzZSAnbWV0YWwnOiByZXR1cm4gTWV0YWxYUFxuXHRcdFx0Y2FzZSAnYWxhc2thJzogcmV0dXJuIEFsYXNrYVhQXG5cdFx0XHRjYXNlICd3b29kJzogcmV0dXJuIFdvb2RYUFxuXHRcdFx0Y2FzZSAnZ2Vtc3RvbmUnOiByZXR1cm4gR2VtU3RvbmVYUFxuXHRcdH1cblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpXHRcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpXG5cdH1cblx0d2lsbFRyYW5zaXRpb25PdXQoKSB7XG5cdFx0c3VwZXIud2lsbFRyYW5zaXRpb25PdXQoKVxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLndpbGxUcmFuc2l0aW9uT3V0KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dGhpcy5leHBlcmllbmNlLnVwZGF0ZSgpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHRoaXMuZXhwZXJpZW5jZS5yZXNpemUoKVxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLnJlc2l6ZSgpXG5cblx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR2YXIgY29tcGFzc0NvbnRhaW5lckJvdHRvbSA9IHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLnkgKyB0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5oZWlnaHRcblx0XHRcdHRoaXMuZ29DYW1wYWlnbkJ0bi5wb3NpdGlvbihcblx0XHRcdFx0KHdpbmRvd1cgPj4gMSkgLSAodGhpcy5nb0NhbXBhaWduQnRuLndpZHRoID4+IDEpLFxuXHRcdFx0XHRjb21wYXNzQ29udGFpbmVyQm90dG9tICsgKHRoaXMuZ29DYW1wYWlnbkJ0bi5oZWlnaHQgPj4gMSlcblx0XHRcdClcblx0XHR9LCAwKVxuXG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5nb0NhbXBhaWduQnRuLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheUJ0biB7XG5cdGNvbnN0cnVjdG9yKGVsZW1lbnQpIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50XG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy50bE92ZXIgPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdFx0dGhpcy50bE91dCA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHQvLyB2YXIga25vdHNFbCA9IHRoaXMuZWxlbWVudC5maW5kKFwiLmtub3RcIilcblx0XHQvLyB2YXIgbGluZXNFbCA9IHRoaXMuZWxlbWVudC5maW5kKFwiLmxpbmVcIilcblx0XHQvLyB2YXIgcmFkaXVzID0gM1xuXHRcdC8vIHZhciBtYXJnaW4gPSAzMFxuXHRcdC8vIHRoaXMubGluZVNpemUgPSBBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKVxuXHRcdC8vIGZvciAodmFyIGkgPSAwOyBpIDwga25vdHNFbC5sZW5ndGg7IGkrKykge1xuXHRcdC8vIFx0dmFyIGtub3QgPSAkKGtub3RzRWxbaV0pXG5cdFx0Ly8gXHRrbm90LmF0dHIoJ3InLCByYWRpdXMpXG5cdFx0Ly8gfTtcblx0XHQvLyBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzRWwubGVuZ3RoOyBpKyspIHtcblx0XHQvLyBcdHZhciBsaW5lID0gJChsaW5lc0VsW2ldKVxuXHRcdC8vIFx0bGluZS5jc3MoJ3N0cm9rZS13aWR0aCcsIHRoaXMubGluZVNpemUpXG5cdFx0Ly8gfTtcblxuXHRcdC8vIHZhciBzdGFydFggPSBtYXJnaW4gPj4gMVxuXHRcdC8vIHZhciBzdGFydFkgPSBtYXJnaW5cblx0XHQvLyB2YXIgb2Zmc2V0VXBEb3duID0gMC42XG5cdFx0Ly8gJChrbm90c0VsLmdldCgwKSkuYXR0cih7XG5cdFx0Ly8gXHQnY3gnOiBzdGFydFggKyAwLFxuXHRcdC8vIFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdC8vIH0pXG5cdFx0Ly8gJChrbm90c0VsLmdldCgxKSkuYXR0cih7XG5cdFx0Ly8gXHQnY3gnOiBzdGFydFggKyBtYXJnaW4sXG5cdFx0Ly8gXHQnY3knOiBzdGFydFkgKyAwXG5cdFx0Ly8gfSlcblx0XHQvLyAkKGtub3RzRWwuZ2V0KDIpKS5hdHRyKHtcblx0XHQvLyBcdCdjeCc6IHN0YXJ0WCArIChtYXJnaW4qMiksXG5cdFx0Ly8gXHQnY3knOiBzdGFydFkgKyAwXG5cdFx0Ly8gfSlcblx0XHQvLyAkKGtub3RzRWwuZ2V0KDMpKS5hdHRyKHtcblx0XHQvLyBcdCdjeCc6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdC8vIFx0J2N5Jzogc3RhcnRZIC0gKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHQvLyB9KVxuXHRcdC8vICQoa25vdHNFbC5nZXQoNCkpLmF0dHIoe1xuXHRcdC8vIFx0J2N4Jzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0Ly8gXHQnY3knOiBzdGFydFkgKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdC8vIH0pXG5cdFx0Ly8gJChsaW5lc0VsLmdldCgwKSkuYXR0cih7XG5cdFx0Ly8gXHQneDEnOiBzdGFydFggKyAwLFxuXHRcdC8vIFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHQvLyBcdCd4Mic6IHN0YXJ0WCArIG1hcmdpbixcblx0XHQvLyBcdCd5Mic6IHN0YXJ0WSArIDBcblx0XHQvLyB9KVxuXHRcdC8vICQobGluZXNFbC5nZXQoMSkpLmF0dHIoe1xuXHRcdC8vIFx0J3gxJzogc3RhcnRYICsgbWFyZ2luLFxuXHRcdC8vIFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHQvLyBcdCd4Mic6IHN0YXJ0WCArIChtYXJnaW4qMiksXG5cdFx0Ly8gXHQneTInOiBzdGFydFkgKyAwXG5cdFx0Ly8gfSlcblx0XHQvLyAkKGxpbmVzRWwuZ2V0KDIpKS5hdHRyKHtcblx0XHQvLyBcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0Ly8gXHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdC8vIFx0J3gyJzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0Ly8gXHQneTInOiBzdGFydFkgLSAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdC8vIH0pXG5cdFx0Ly8gJChsaW5lc0VsLmdldCgzKSkuYXR0cih7XG5cdFx0Ly8gXHQneDEnOiBzdGFydFggKyAwLFxuXHRcdC8vIFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHQvLyBcdCd4Mic6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdC8vIFx0J3kyJzogc3RhcnRZICsgKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHQvLyB9KVxuXG5cdFx0Ly8gdmFyIG9mZnNldCA9IDEwXG5cdFx0Ly8gdGhpcy50bE92ZXIudG8oa25vdHNFbFswXSwgMSwgeyB4Oi1vZmZzZXQrKHJhZGl1cyA+PiAxKSwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMV0sIDEsIHsgeDotb2Zmc2V0LCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE92ZXIudG8oa25vdHNFbFsyXSwgMSwgeyB4Oi1vZmZzZXQsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHQvLyB0aGlzLnRsT3Zlci50byhsaW5lc0VsWzBdLCAxLCB7IHNjYWxlWDoxLjEsIHg6LW9mZnNldCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMV0sIDEsIHsgc2NhbGVYOjEuMSwgeDotb2Zmc2V0LCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE92ZXIudG8obGluZXNFbFsyXSwgMSwgeyB4Oi1vZmZzZXQsIHJvdGF0aW9uOicxMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAxMDAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHQvLyB0aGlzLnRsT3Zlci50byhsaW5lc0VsWzNdLCAxLCB7IHg6LW9mZnNldCwgcm90YXRpb246Jy0xMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE92ZXIudG8oa25vdHNFbFszXSwgMSwgeyB4Oi1vZmZzZXQvMiwgeToob2Zmc2V0LzIpLXJhZGl1cywgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdmVyLnRvKGtub3RzRWxbNF0sIDEsIHsgeDotb2Zmc2V0LzIsIHk6LShvZmZzZXQvMikrcmFkaXVzLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cblx0XHQvLyB0aGlzLnRsT3V0LnRvKGtub3RzRWxbMF0sIDEsIHsgeDowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE91dC50byhrbm90c0VsWzFdLCAxLCB7IHg6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdXQudG8oa25vdHNFbFsyXSwgMSwgeyB4OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHQvLyB0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMF0sIDEsIHsgc2NhbGVYOjEsIHg6MCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdXQudG8obGluZXNFbFsxXSwgMSwgeyBzY2FsZVg6MSwgeDowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE91dC50byhsaW5lc0VsWzJdLCAxLCB7IHg6MCwgcm90YXRpb246JzBkZWcnLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonMCUgMTAwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE91dC50byhsaW5lc0VsWzNdLCAxLCB7IHg6MCwgcm90YXRpb246JzBkZWcnLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonMCUgMCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdXQudG8oa25vdHNFbFszXSwgMSwgeyB4OjAsIHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdXQudG8oa25vdHNFbFs0XSwgMSwgeyB4OjAsIHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXG5cdFx0Ly8gdGhpcy50bE92ZXIucGF1c2UoMClcblx0XHQvLyB0aGlzLnRsT3V0LnBhdXNlKDApXG5cblx0XHQvLyB0aGlzLnJvbGxvdmVyID0gdGhpcy5yb2xsb3Zlci5iaW5kKHRoaXMpXG5cdFx0Ly8gdGhpcy5yb2xsb3V0ID0gdGhpcy5yb2xsb3V0LmJpbmQodGhpcylcblx0XHQvLyB0aGlzLmNsaWNrID0gdGhpcy5jbGljay5iaW5kKHRoaXMpXG5cdFx0Ly8gdGhpcy5lbGVtZW50Lm9uKCdtb3VzZWVudGVyJywgdGhpcy5yb2xsb3Zlcilcblx0XHQvLyB0aGlzLmVsZW1lbnQub24oJ21vdXNlbGVhdmUnLCB0aGlzLnJvbGxvdXQpXG5cdFx0Ly8gaWYodGhpcy5idG5DbGlja2VkICE9IHVuZGVmaW5lZCkgdGhpcy5lbGVtZW50Lm9uKCdjbGljaycsIHRoaXMuY2xpY2spXG5cblx0XHQvLyB0aGlzLndpZHRoID0gbWFyZ2luICogM1xuXHRcdC8vIHRoaXMuaGVpZ2h0ID0gbWFyZ2luICogMlxuXHRcdC8vIHRoaXMuZWxlbWVudC5jc3Moe1xuXHRcdC8vIFx0d2lkdGg6IHRoaXMud2lkdGgsXG5cdFx0Ly8gXHRoZWlnaHQ6IHRoaXMuaGVpZ2h0XG5cdFx0Ly8gfSlcblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0dGhpcy5lbGVtZW50LmNzcyh7XG5cdFx0XHRsZWZ0OiB4LFxuXHRcdFx0dG9wOiB5XG5cdFx0fSlcblx0fVxuXHRjbGljayhlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5idG5DbGlja2VkKHRoaXMuZGlyZWN0aW9uKVxuXHR9XG5cdHJvbGxvdXQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMubW91c2VPdXQoKVx0XG5cdH1cblx0cm9sbG92ZXIoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMubW91c2VPdmVyKClcdFxuXHR9XG5cdG1vdXNlT3ZlcigpIHtcblx0XHR0aGlzLnRsT3V0LmtpbGwoKVxuXHRcdHRoaXMudGxPdmVyLnBsYXkoMClcblx0fVxuXHRtb3VzZU91dCgpIHtcblx0XHR0aGlzLnRsT3Zlci5raWxsKClcblx0XHR0aGlzLnRsT3V0LnBsYXkoMClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bE92ZXIpXG5cdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdXQpXG5cdFx0dGhpcy5lbGVtZW50Lm9mZignbW91c2VlbnRlcicsIHRoaXMucm9sbG92ZXIpXG5cdFx0dGhpcy5lbGVtZW50Lm9mZignbW91c2VsZWF2ZScsIHRoaXMucm9sbG91dClcblx0XHR0aGlzLmVsZW1lbnQub2ZmKCdjbGljaycsIHRoaXMuY2xpY2spXG5cdH1cbn1cbiIsImltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjdGFuZ2xlQnRuIHtcblx0Y29uc3RydWN0b3IoZWxlbWVudCwgdGl0bGVUeHQsIHJlY3RXKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudFxuXHRcdHRoaXMudGl0bGVUeHQgPSB0aXRsZVR4dFxuXHRcdHRoaXMucmVjdFcgPSByZWN0V1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMudGxPdmVyID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdHRoaXMudGxPdXQgPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdFx0dGhpcy53aWR0aCA9IDBcblx0XHR0aGlzLmhlaWdodCA9IDBcblx0XHR2YXIga25vdHNFbCA9IHRoaXMuZWxlbWVudC5maW5kKFwiLmtub3RcIilcblx0XHR2YXIgbGluZXNFbCA9IHRoaXMuZWxlbWVudC5maW5kKFwiLmxpbmVcIilcblx0XHR2YXIgdGl0bGVFbCA9IHRoaXMuZWxlbWVudC5maW5kKFwiLmJ0bi10aXRsZVwiKVxuXHRcdHZhciByYWRpdXMgPSAzXG5cdFx0dmFyIHBhZGRpbmdYID0gMjRcblx0XHR2YXIgcGFkZGluZ1kgPSAyMFxuXHRcdHRoaXMubGluZVNpemUgPSBBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKVxuXHRcdGlmKHRoaXMudGl0bGVUeHQgIT0gdW5kZWZpbmVkKSB0aXRsZUVsLnRleHQodGhpcy50aXRsZVR4dClcblxuXHRcdHNldFRpbWVvdXQoKCk9PntcblxuXHRcdFx0dmFyIHRpdGxlVyA9IHRoaXMucmVjdFdcblx0XHRcdHZhciB0aXRsZUggPSBBcHBDb25zdGFudHMuR0xPQkFMX0ZPTlRfU0laRVxuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtub3RzRWwubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIGtub3QgPSAkKGtub3RzRWxbaV0pXG5cdFx0XHRcdGtub3QuYXR0cigncicsIHJhZGl1cylcblx0XHRcdH07XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzRWwubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIGxpbmUgPSAkKGxpbmVzRWxbaV0pXG5cdFx0XHRcdGxpbmUuY3NzKCdzdHJva2Utd2lkdGgnLCB0aGlzLmxpbmVTaXplKVxuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy53aWR0aCA9IHRpdGxlVyArIChwYWRkaW5nWCA8PCAxKVxuXHRcdFx0dGhpcy5oZWlnaHQgPSB0aXRsZUggKyAocGFkZGluZ1kgPDwgMSlcblx0XHRcdHRpdGxlRWwuY3NzKHtcblx0XHRcdFx0bGVmdDogKHRoaXMud2lkdGggPj4gMSkgLSAodGl0bGVXID4+IDEpLFxuXHRcdFx0XHR0b3A6ICh0aGlzLmhlaWdodCA+PiAxKSAtICh0aXRsZUggPj4gMSlcblx0XHRcdH0pXG5cdFx0XHR0aGlzLmVsZW1lbnQuY3NzKHtcblx0XHRcdFx0d2lkdGg6IHRoaXMud2lkdGgsXG5cdFx0XHRcdGhlaWdodDogdGhpcy5oZWlnaHRcblx0XHRcdH0pXG5cblx0XHRcdHZhciBzdGFydFggPSByYWRpdXMgKiAzXG5cdFx0XHR2YXIgc3RhcnRZID0gcmFkaXVzICogM1xuXHRcdFx0dmFyIG9mZnNldFVwRG93biA9IDAuNlxuXHRcdFx0JChrbm90c0VsLmdldCgwKSkuYXR0cih7XG5cdFx0XHRcdCdjeCc6IHN0YXJ0WCArIDAsXG5cdFx0XHRcdCdjeSc6IHN0YXJ0WSArIDBcblx0XHRcdH0pXG5cdFx0XHQkKGtub3RzRWwuZ2V0KDEpKS5hdHRyKHtcblx0XHRcdFx0J2N4JzogdGhpcy53aWR0aCAtIHN0YXJ0WCxcblx0XHRcdFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdFx0fSlcblx0XHRcdCQoa25vdHNFbC5nZXQoMikpLmF0dHIoe1xuXHRcdFx0XHQnY3gnOiBzdGFydFggKyAwLFxuXHRcdFx0XHQnY3knOiB0aGlzLmhlaWdodCAtIHN0YXJ0WVxuXHRcdFx0fSlcblx0XHRcdCQoa25vdHNFbC5nZXQoMykpLmF0dHIoe1xuXHRcdFx0XHQnY3gnOiB0aGlzLndpZHRoIC0gc3RhcnRYLFxuXHRcdFx0XHQnY3knOiB0aGlzLmhlaWdodCAtIHN0YXJ0WVxuXHRcdFx0fSlcblx0XHRcdCQobGluZXNFbC5nZXQoMCkpLmF0dHIoe1xuXHRcdFx0XHQneDEnOiBzdGFydFggKyAwLFxuXHRcdFx0XHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdFx0XHQneDInOiB0aGlzLndpZHRoIC0gc3RhcnRYLFxuXHRcdFx0XHQneTInOiBzdGFydFkgKyAwXG5cdFx0XHR9KVxuXHRcdFx0JChsaW5lc0VsLmdldCgxKSkuYXR0cih7XG5cdFx0XHRcdCd4MSc6IHRoaXMud2lkdGggLSBzdGFydFgsXG5cdFx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHRcdCd4Mic6IHRoaXMud2lkdGggLSBzdGFydFgsXG5cdFx0XHRcdCd5Mic6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZXG5cdFx0XHR9KVxuXHRcdFx0JChsaW5lc0VsLmdldCgyKSkuYXR0cih7XG5cdFx0XHRcdCd4MSc6IHRoaXMud2lkdGggLSBzdGFydFgsXG5cdFx0XHRcdCd5MSc6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZLFxuXHRcdFx0XHQneDInOiBzdGFydFkgKyAwLFxuXHRcdFx0XHQneTInOiB0aGlzLmhlaWdodCAtIHN0YXJ0WVxuXHRcdFx0fSlcblx0XHRcdCQobGluZXNFbC5nZXQoMykpLmF0dHIoe1xuXHRcdFx0XHQneDEnOiBzdGFydFggKyAwLFxuXHRcdFx0XHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdFx0XHQneDInOiBzdGFydFggKyAwLFxuXHRcdFx0XHQneTInOiB0aGlzLmhlaWdodCAtIHN0YXJ0WVxuXHRcdFx0fSlcblxuXHRcdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFswXSwgMSwgeyB4Oi0zLCB5Oi0zLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzFdLCAxLCB7IHg6MywgeTotMywgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFsyXSwgMSwgeyB4Oi0zLCB5OjMsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbM10sIDEsIHsgeDozLCB5OjMsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMF0sIDEsIHsgc2NhbGVYOjEuMDUsIHk6LTMsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMV0sIDEsIHsgc2NhbGVZOjEuMDUsIHg6MywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFsyXSwgMSwgeyBzY2FsZVg6MS4wNSwgeTozLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3Zlci50byhsaW5lc0VsWzNdLCAxLCB7IHNjYWxlWToxLjA1LCB4Oi0zLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cblx0XHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFswXSwgMSwgeyB4OjAsIHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE91dC50byhrbm90c0VsWzFdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbMl0sIDEsIHsgeDowLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFszXSwgMSwgeyB4OjAsIHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzBdLCAxLCB7IHNjYWxlWDoxLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8obGluZXNFbFsxXSwgMSwgeyBzY2FsZVk6MSwgeDowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMl0sIDEsIHsgc2NhbGVYOjEsIHk6MCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzNdLCAxLCB7IHNjYWxlWToxLCB4OjAsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblxuXHRcdFx0dGhpcy50bE92ZXIucGF1c2UoMClcblx0XHRcdHRoaXMudGxPdXQucGF1c2UoMClcblxuXHRcdFx0Ly8gdGhpcy5yb2xsb3ZlciA9IHRoaXMucm9sbG92ZXIuYmluZCh0aGlzKVxuXHRcdFx0Ly8gdGhpcy5yb2xsb3V0ID0gdGhpcy5yb2xsb3V0LmJpbmQodGhpcylcblx0XHRcdC8vIHRoaXMuY2xpY2sgPSB0aGlzLmNsaWNrLmJpbmQodGhpcylcblx0XHRcdC8vIHRoaXMuZWxlbWVudC5vbignbW91c2VlbnRlcicsIHRoaXMucm9sbG92ZXIpXG5cdFx0XHQvLyB0aGlzLmVsZW1lbnQub24oJ21vdXNlbGVhdmUnLCB0aGlzLnJvbGxvdXQpXG5cdFx0XHQvLyB0aGlzLmVsZW1lbnQub24oJ2NsaWNrJywgdGhpcy5jbGljaylcblx0XHR9LCAwKVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHRVdGlscy5UcmFuc2xhdGUodGhpcy5lbGVtZW50LmdldCgwKSwgeCwgeSwgMClcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHR9XG5cdGNsaWNrKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRpZih0aGlzLmJ0bkNsaWNrZWQgIT0gdW5kZWZpbmVkKSB0aGlzLmJ0bkNsaWNrZWQoKVxuXHR9XG5cdHJvbGxvdXQoKSB7XG5cdFx0dGhpcy50bE92ZXIua2lsbCgpXG5cdFx0dGhpcy50bE91dC5wbGF5KDApXG5cdH1cblx0cm9sbG92ZXIoKSB7XG5cdFx0dGhpcy50bE91dC5raWxsKClcblx0XHR0aGlzLnRsT3Zlci5wbGF5KDApXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdmVyKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VUaW1lbGluZSh0aGlzLnRsT3V0KVxuXHRcdC8vIHRoaXMuZWxlbWVudC5vZmYoJ21vdXNlZW50ZXInLCB0aGlzLnJvbGxvdmVyKVxuXHRcdC8vIHRoaXMuZWxlbWVudC5vZmYoJ21vdXNlbGVhdmUnLCB0aGlzLnJvbGxvdXQpXG5cdFx0Ly8gdGhpcy5lbGVtZW50Lm9mZignY2xpY2snLCB0aGlzLmNsaWNrKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNjcm9sbEJhciB7XG4gICAgY29uc3RydWN0b3IoZWxlbWVudCkge1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50XG4gICAgICAgIHRoaXMucGFnZUhlaWdodCA9IHVuZGVmaW5lZFxuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldCA9IHVuZGVmaW5lZFxuICAgICAgICB0aGlzLm5ld1Bvc1kgPSAwXG4gICAgICAgIHRoaXMuZWFzZSA9IDAuMVxuICAgICAgICB0aGlzLm1vdXNlSW5Eb3duID0gZmFsc2VcbiAgICB9XG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMub25Nb3VzZURvd24gPSB0aGlzLm9uTW91c2VEb3duLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy5vbk1vdXNlTW92ZSA9IHRoaXMub25Nb3VzZU1vdmUuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLm9uTW91c2VVcCA9IHRoaXMub25Nb3VzZVVwLmJpbmQodGhpcylcblxuICAgICAgICB0aGlzLmdyYWIgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5zY3JvbGwtZ3JhYi5idG5cIilcbiAgICAgICAgdGhpcy5ncmFiRWwgPSB0aGlzLmdyYWIuZ2V0KDApXG4gICAgICAgIHRoaXMuZ3JhYi5vbihcIm1vdXNlZG93blwiLCB0aGlzLm9uTW91c2VEb3duKVxuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICB0aGlzLmdyYWJXID0gdGhpcy5ncmFiLndpZHRoKClcbiAgICAgICAgICAgIHRoaXMuZ3JhYkggPSB0aGlzLmdyYWIuaGVpZ2h0KClcbiAgICAgICAgfSwgMClcbiAgICB9XG4gICAgb25Nb3VzZURvd24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgdGhpcy5tb3VzZUluRG93biA9IHRydWVcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIHRoaXMub25Nb3VzZU1vdmUpXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNldXBcIiwgdGhpcy5vbk1vdXNlVXApXG4gICAgfVxuICAgIG9uTW91c2VVcChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICB0aGlzLm1vdXNlSW5Eb3duID0gZmFsc2VcbiAgICAgICAgdGhpcy5raWxsQWxsRXZlbnRzKClcbiAgICB9XG4gICAgb25Nb3VzZU1vdmUoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgdmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuICAgICAgICB2YXIgcG9zWSA9ICh0aGlzLnBhZ2VIZWlnaHQgLyB3aW5kb3dIICkgKiBlLmNsaWVudFlcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXRIYW5kbGVyKHBvc1kpXG4gICAgfVxuICAgIHNldFNjcm9sbFRhcmdldCh2YWwpIHtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQgPSB2YWxcbiAgICB9XG4gICAga2lsbEFsbEV2ZW50cygpIHtcbiAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCB0aGlzLm9uTW91c2VNb3ZlKVxuICAgICAgICAkKHdpbmRvdykub2ZmKFwibW91c2V1cFwiLCB0aGlzLm9uTW91c2VVcClcbiAgICB9XG4gICAgdXBkYXRlKCkge1xuICAgICAgICB2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG4gICAgICAgIHZhciBwb3NZID0gTWF0aC5yb3VuZCgodGhpcy5zY3JvbGxUYXJnZXQgLyB0aGlzLnBhZ2VIZWlnaHQpICogKHdpbmRvd0ggLSB0aGlzLmdyYWJIKSlcbiAgICAgICAgaWYoaXNOYU4ocG9zWSkpIHJldHVyblxuICAgICAgICB0aGlzLm5ld1Bvc1kgKz0gKHBvc1kgLSB0aGlzLm5ld1Bvc1kpICogdGhpcy5lYXNlXG4gICAgICAgIHZhciBwID0gdGhpcy5uZXdQb3NZXG4gICAgICAgIFV0aWxzLlRyYW5zbGF0ZSh0aGlzLmdyYWJFbCwgMCwgcCwgMClcbiAgICB9XG4gICAgcmVzaXplKCkge1xuICAgIH1cbiAgICBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcbiAgICAgICAgdGhpcy5ncmFiLm9mZihcIm1vdXNlZG93blwiLCB0aGlzLm9uTW91c2VEb3duKVxuICAgICAgICB0aGlzLmtpbGxBbGxFdmVudHMoKVxuICAgIH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBWZWMyIGZyb20gJ1ZlYzInXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU21hbGxDb21wYXNzIHtcblx0Y29uc3RydWN0b3IocHhDb250YWluZXIsIHR5cGUpIHtcblx0XHR0aGlzLnB4Q29udGFpbmVyID0gcHhDb250YWluZXJcblx0XHR0aGlzLnR5cGUgPSB0eXBlIHx8IEFwcENvbnN0YW50cy5MQU5ESU5HXG5cdFx0dGhpcy5ib3VuY2UgPSAtMVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KGRhdGEsIG5hbWUsIHBhcmVudEVsLCBwbGFuZXRUeHQpIHtcblx0XHR0aGlzLnBhcmVudEVsID0gcGFyZW50RWxcblx0XHR0aGlzLmNvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmNvbnRhaW5lcilcblxuXHRcdHRoaXMuYmdDaXJjbGUgPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5iZ0NpcmNsZSlcblxuXHRcdHZhciBrbm90UmFkaXVzID0gQXBwQ29uc3RhbnRzLlNNQUxMX0tOT1RfUkFESVVTXG5cdFx0dGhpcy5yYWRpdXMgPSAzMFxuXHRcdHRoaXMucmFkaXVzTGltaXQgPSAodGhpcy5yYWRpdXMqMC44KSAtIChrbm90UmFkaXVzPj4xKVxuXHRcdHRoaXMud2lkdGggPSB0aGlzLnJhZGl1c1xuXHRcdHRoaXMuaGVpZ2h0ID0gdGhpcy5yYWRpdXNcblxuXHRcdHZhciBjb21wYXNzTmFtZSA9IHBsYW5ldFR4dC50b1VwcGVyQ2FzZSgpICsgJyAnICsgbmFtZS50b1VwcGVyQ2FzZSgpXG5cdFx0dGhpcy5lbGVtZW50ID0gdGhpcy5wYXJlbnRFbC5maW5kKCcuY29tcGFzc2VzLXRleHRzLXdyYXBwZXInKVxuXHRcdHZhciBjb250YWluZXJFbCA9ICQoJzxkaXYgY2xhc3M9XCJ0ZXh0cy1jb250YWluZXIgYnRuXCI+PC9kaXY+Jylcblx0XHR0aGlzLmVsZW1lbnQuYXBwZW5kKGNvbnRhaW5lckVsKVxuXHRcdHZhciB0aXRsZVRvcCA9ICQoJzxkaXYgY2xhc3M9XCJ0b3AtdGl0bGVcIj48L2RpdicpXG5cblx0XHR0aGlzLmNpcmNsZVJhZCA9IDkwXG5cdFx0dmFyIGNpcmNsZXBhdGggPSAnTTAsJyt0aGlzLmNpcmNsZVJhZC8yKydhJyt0aGlzLmNpcmNsZVJhZC8yKycsJyt0aGlzLmNpcmNsZVJhZC8yKycgMCAxLDAgJyt0aGlzLmNpcmNsZVJhZCsnLDBhJyt0aGlzLmNpcmNsZVJhZC8yKycsJyt0aGlzLmNpcmNsZVJhZC8yKycgMCAxLDAgLScrdGhpcy5jaXJjbGVSYWQrJywwJ1xuXHRcdHZhciBzdmdTdHIgPSAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI+IDxkZWZzPiA8cGF0aCBpZD1cInBhdGgxXCIgZD1cIicrY2lyY2xlcGF0aCsnXCIgPiA8L3BhdGg+IDwvZGVmcz4gPHRleHQgZmlsbD1cIndoaXRlXCIgaWQ9XCJteVRleHRcIj4gPHRleHRQYXRoIHhsaW5rOmhyZWY9XCIjcGF0aDFcIj4gPHRzcGFuIGR4PVwiMHB4XCIgZHk9XCIwcHhcIj4nICsgY29tcGFzc05hbWUgKyAnPC90c3Bhbj4gPC90ZXh0UGF0aD4gPC90ZXh0Pjwvc3ZnPidcblx0XHR2YXIgdGl0bGVUb3BTdmcgPSAkKHN2Z1N0cilcblx0XHR0aXRsZVRvcC5hcHBlbmQodGl0bGVUb3BTdmcpXG5cdFx0Y29udGFpbmVyRWwuYXBwZW5kKHRpdGxlVG9wKVxuXHRcdHRpdGxlVG9wU3ZnLmNzcyh7XG5cdFx0XHR3aWR0aDogdGhpcy5jaXJjbGVSYWQsXG5cdFx0XHRoZWlnaHQ6IHRoaXMuY2lyY2xlUmFkXG5cdFx0fSlcblx0XHR0aGlzLnRpdGxlcyA9IHtcblx0XHRcdGNvbnRhaW5lcjogY29udGFpbmVyRWwsXG5cdFx0XHQkdGl0bGVUb3A6IHRpdGxlVG9wLFxuXHRcdFx0dGl0bGVUb3A6IHRpdGxlVG9wLmdldCgwKSxcblx0XHRcdHJvdGF0aW9uOiAwLFxuXHRcdH1cblxuXHRcdHRoaXMub25DbGlja2VkID0gdGhpcy5vbkNsaWNrZWQuYmluZCh0aGlzKVxuXHRcdHRoaXMudGl0bGVzLmNvbnRhaW5lci5vbignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblxuXHRcdHRoaXMua25vdHMgPSBbXVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGQgPSBkYXRhW2ldXG5cdFx0XHR2YXIga25vdCA9IG5ldyBLbm90KHRoaXMuY29udGFpbmVyLCBrbm90UmFkaXVzLCAweGZmZmZmZikuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdFx0a25vdC5tYXNzID0ga25vdFJhZGl1c1xuXHRcdFx0a25vdC52eCA9IE1hdGgucmFuZG9tKCkgKiAwLjhcbiAgICAgICAgICAgIGtub3QudnkgPSBNYXRoLnJhbmRvbSgpICogMC44XG4gICAgICAgICAgICBrbm90LnBvc1ZlYyA9IG5ldyBQSVhJLlBvaW50KDAsIDApXG4gICAgICAgICAgICBrbm90LnBvc0ZWZWMgPSBuZXcgUElYSS5Qb2ludCgwLCAwKVxuICAgICAgICAgICAga25vdC52ZWxWZWMgPSBuZXcgUElYSS5Qb2ludCgwLCAwKVxuICAgICAgICAgICAga25vdC52ZWxGVmVjID0gbmV3IFBJWEkuUG9pbnQoMCwgMClcblx0XHRcdGtub3QucG9zaXRpb24oVXRpbHMuUmFuZCgtdGhpcy5yYWRpdXNMaW1pdCwgdGhpcy5yYWRpdXNMaW1pdCksIFV0aWxzLlJhbmQoLXRoaXMucmFkaXVzTGltaXQsIHRoaXMucmFkaXVzTGltaXQpKVxuXHRcdFx0dGhpcy5rbm90c1tpXSA9IGtub3Rcblx0XHR9XG5cblx0XHR2YXIgbGluZVcgPSBBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKVxuXHRcdC8vIGRyYXcgYSByZWN0YW5nbGVcblx0XHR0aGlzLmJnQ2lyY2xlLmNsZWFyKClcblx0XHR0aGlzLmJnQ2lyY2xlLmxpbmVTdHlsZShsaW5lVywgMHhmZmZmZmYsIDEpXG5cdFx0dGhpcy5iZ0NpcmNsZS5iZWdpbkZpbGwoMHhmZmZmZmYsIDApXG5cdFx0dGhpcy5iZ0NpcmNsZS5kcmF3Q2lyY2xlKDAsIDAsIHRoaXMucmFkaXVzKVxuXHR9XG5cdG9uQ2xpY2tlZChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dmFyIHVybCA9IFwiL3BsYW5ldC9cIiArIHRoaXMuaWQgKyBcIi8wXCJcblx0XHRSb3V0ZXIuc2V0SGFzaCh1cmwpXG5cdH1cblx0Y2hlY2tXYWxscyhrbm90KSB7XG5cdFx0aWYoa25vdC54ICsga25vdC5yYWRpdXMgPiB0aGlzLnJhZGl1c0xpbWl0KSB7XG5cdCAgICAgICAga25vdC54ID0gdGhpcy5yYWRpdXNMaW1pdCAtIGtub3QucmFkaXVzO1xuXHQgICAgICAgIGtub3QudnggKj0gdGhpcy5ib3VuY2U7XG5cdCAgICB9ZWxzZSBpZihrbm90LnggLSBrbm90LnJhZGl1cyA8IC10aGlzLnJhZGl1c0xpbWl0LWtub3QucmFkaXVzKSB7XG5cdCAgICAgICAga25vdC54ID0gLXRoaXMucmFkaXVzTGltaXQgKyBrbm90LnJhZGl1cy1rbm90LnJhZGl1cztcblx0ICAgICAgICBrbm90LnZ4ICo9IHRoaXMuYm91bmNlO1xuXHQgICAgfVxuXHQgICAgaWYoa25vdC55ICsga25vdC5yYWRpdXMgPiB0aGlzLnJhZGl1c0xpbWl0KSB7XG5cdCAgICAgICAga25vdC55ID0gdGhpcy5yYWRpdXNMaW1pdCAtIGtub3QucmFkaXVzO1xuXHQgICAgICAgIGtub3QudnkgKj0gdGhpcy5ib3VuY2U7XG5cdCAgICB9ZWxzZSBpZihrbm90LnkgLSBrbm90LnJhZGl1cyA8IC10aGlzLnJhZGl1c0xpbWl0KSB7XG5cdCAgICAgICAga25vdC55ID0gLXRoaXMucmFkaXVzTGltaXQgKyBrbm90LnJhZGl1cztcblx0ICAgICAgICBrbm90LnZ5ICo9IHRoaXMuYm91bmNlO1xuXHQgICAgfVxuXHR9XG5cdGNoZWNrQ29sbGlzaW9uKGtub3RBLCBrbm90Qikge1xuXHRcdHZhciBkeCA9IGtub3RCLnggLSBrbm90QS54O1xuXHQgICAgdmFyIGR5ID0ga25vdEIueSAtIGtub3RBLnk7XG5cdCAgICB2YXIgZGlzdCA9IE1hdGguc3FydChkeCpkeCArIGR5KmR5KTtcblx0ICAgIGlmKGRpc3QgPCBrbm90QS5yYWRpdXMgKyBrbm90Qi5yYWRpdXMpIHtcblx0ICAgICAgICB2YXIgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeClcblx0ICAgICAgICB2YXIgc2luID0gTWF0aC5zaW4oYW5nbGUpXG5cdCAgICAgICAgdmFyIGNvcyA9IE1hdGguY29zKGFuZ2xlKVxuXHQgICAgICAgIGtub3RBLnBvc1ZlYy54ID0gMFxuXHQgICAgICAgIGtub3RBLnBvc1ZlYy55ID0gMFxuXHQgICAgICAgIHRoaXMucm90YXRlKGtub3RCLnBvc1ZlYywgZHgsIGR5LCBzaW4sIGNvcywgdHJ1ZSlcblx0ICAgICAgICB0aGlzLnJvdGF0ZShrbm90QS52ZWxWZWMsIGtub3RBLnZ4LCBrbm90QS52eSwgc2luLCBjb3MsIHRydWUpXG5cdCAgICAgICAgdGhpcy5yb3RhdGUoa25vdEIudmVsVmVjLCBrbm90Qi52eCwga25vdEIudnksIHNpbiwgY29zLCB0cnVlKVxuXG5cdCAgICAgICAgLy8gY29sbGlzaW9uIHJlYWN0aW9uXG5cdFx0XHR2YXIgdnhUb3RhbCA9IGtub3RBLnZlbFZlYy54IC0ga25vdEIudmVsVmVjLnhcblx0XHRcdGtub3RBLnZlbFZlYy54ID0gKChrbm90QS5tYXNzIC0ga25vdEIubWFzcykgKiBrbm90QS52ZWxWZWMueCArIDIgKiBrbm90Qi5tYXNzICoga25vdEIudmVsVmVjLngpIC8gKGtub3RBLm1hc3MgKyBrbm90Qi5tYXNzKVxuXHRcdFx0a25vdEIudmVsVmVjLnggPSB2eFRvdGFsICsga25vdEEudmVsVmVjLnhcblxuXHRcdFx0Ly8gdXBkYXRlIHBvc2l0aW9uXG5cdFx0XHRrbm90QS5wb3NWZWMueCArPSBrbm90QS52ZWxWZWMueDtcblx0XHRcdGtub3RCLnBvc1ZlYy54ICs9IGtub3RCLnZlbFZlYy54O1xuXG5cdFx0XHQvLyByb3RhdGUgcG9zaXRpb25zIGJhY2tcblx0XHRcdHRoaXMucm90YXRlKGtub3RBLnBvc0ZWZWMsIGtub3RBLnBvc1ZlYy54LCBrbm90QS5wb3NWZWMueSwgc2luLCBjb3MsIGZhbHNlKVxuXHRcdFx0dGhpcy5yb3RhdGUoa25vdEIucG9zRlZlYywga25vdEIucG9zVmVjLngsIGtub3RCLnBvc1ZlYy55LCBzaW4sIGNvcywgZmFsc2UpXG5cblx0XHRcdC8vIGFkanVzdCBwb3NpdGlvbnMgdG8gYWN0dWFsIHNjcmVlbiBwb3NpdGlvbnNcblx0XHRcdGtub3RCLnggPSBrbm90QS54ICsga25vdEIucG9zRlZlYy54O1xuXHRcdFx0a25vdEIueSA9IGtub3RBLnkgKyBrbm90Qi5wb3NGVmVjLnk7XG5cdFx0XHRrbm90QS54ID0ga25vdEEueCArIGtub3RBLnBvc0ZWZWMueDtcblx0XHRcdGtub3RBLnkgPSBrbm90QS55ICsga25vdEEucG9zRlZlYy55O1xuXG5cdFx0XHQvLyByb3RhdGUgdmVsb2NpdGllcyBiYWNrXG5cdFx0XHR0aGlzLnJvdGF0ZShrbm90QS52ZWxGVmVjLCBrbm90QS52ZWxWZWMueCwga25vdEEudmVsVmVjLnksIHNpbiwgY29zLCBmYWxzZSlcblx0XHRcdHRoaXMucm90YXRlKGtub3RCLnZlbEZWZWMsIGtub3RCLnZlbFZlYy54LCBrbm90Qi52ZWxWZWMueSwgc2luLCBjb3MsIGZhbHNlKVxuXG5cdFx0XHRrbm90QS52eCA9IGtub3RBLnZlbEZWZWMueDtcblx0ICAgICAgICBrbm90QS52eSA9IGtub3RBLnZlbEZWZWMueTtcblx0ICAgICAgICBrbm90Qi52eCA9IGtub3RCLnZlbEZWZWMueDtcblx0ICAgICAgICBrbm90Qi52eSA9IGtub3RCLnZlbEZWZWMueTtcblx0ICAgIH1cblx0fVxuXHRyb3RhdGUocG9pbnQsIHgsIHksIHNpbiwgY29zLCByZXZlcnNlKSB7XG5cdFx0aWYocmV2ZXJzZSkge1xuXHRcdFx0cG9pbnQueCA9IHggKiBjb3MgKyB5ICogc2luO1xuXHRcdFx0cG9pbnQueSA9IHkgKiBjb3MgLSB4ICogc2luO1xuXHRcdH1lbHNle1xuXHRcdFx0cG9pbnQueCA9IHggKiBjb3MgLSB5ICogc2luO1xuXHRcdFx0cG9pbnQueSA9IHkgKiBjb3MgKyB4ICogc2luO1xuXHRcdH1cblx0fVxuXHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHQvLyB0aGlzLnRpdGxlcy5jb250YWluZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cdH1cblx0d2lsbFRyYW5zaXRpb25PdXQoKSB7XG5cdFx0Ly8gdGhpcy50aXRsZXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVx0XG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHZhciBrbm90cyA9IHRoaXMua25vdHNcblx0XHR2YXIga25vdHNOdW0gPSBrbm90cy5sZW5ndGhcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtub3RzTnVtOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0ga25vdHNbaV1cblx0XHRcdGtub3QucG9zaXRpb24oa25vdC54ICsga25vdC52eCwga25vdC55ICsga25vdC52eSlcblx0XHRcdHRoaXMuY2hlY2tXYWxscyhrbm90KVxuXHRcdH1cblx0XHRmb3IgKGkgPSAwOyBpIDwga25vdHNOdW0gLSAxOyBpKyspIHtcblx0XHRcdHZhciBrbm90QSA9IGtub3RzW2ldXG5cdFx0XHRmb3IgKHZhciBqID0gaSArIDE7IGogPCBrbm90c051bTsgaisrKSB7XG5cdFx0XHRcdHZhciBrbm90QiA9IGtub3RzW2pdXG5cdFx0XHRcdHRoaXMuY2hlY2tDb2xsaXNpb24oa25vdEEsIGtub3RCKVxuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLnRpdGxlcy5yb3RhdGlvbiArPSAwLjJcblx0XHR0aGlzLnJvdGF0ZUVsKHRoaXMudGl0bGVzLnRpdGxlVG9wLCB0aGlzLnRpdGxlcy5yb3RhdGlvbilcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHR9XG5cdHJvdGF0ZUVsKGRpdiwgZGVnKSB7XG5cdFx0VXRpbHMuU3R5bGUoZGl2LCAncm90YXRlKCcrZGVnKydkZWcpJylcblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0dGhpcy5jb250YWluZXIueCA9IHhcblx0XHR0aGlzLmNvbnRhaW5lci55ID0geVxuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0b3BhY2l0eSh2YWwpIHtcblx0XHR0aGlzLmNvbnRhaW5lci5hbHBoYSA9IHZhbFxuXHRcdHRoaXMudGl0bGVzLiR0aXRsZVRvcC5jc3MoJ29wYWNpdHknLCB2YWwpXG5cdH1cblx0cG9zaXRpb25FbGVtZW50KHgsIHkpIHtcblx0XHR0aGlzLnRpdGxlcy5jb250YWluZXIuY3NzKHtcblx0XHRcdGxlZnQ6IHggLSAodGhpcy5jaXJjbGVSYWQ+PjEpLFxuXHRcdFx0dG9wOiB5IC0gKHRoaXMuY2lyY2xlUmFkPj4xKSxcblx0XHRcdHdpZHRoOiB0aGlzLmNpcmNsZVJhZCxcblx0XHRcdGhlaWdodDogdGhpcy5jaXJjbGVSYWQsXG5cdFx0fSlcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMua25vdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMua25vdHNbaV0uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdH1cblx0XHR0aGlzLnRpdGxlcy5jb250YWluZXIub2ZmKCdjbGljaycsIHRoaXMub25DbGlja2VkKVxuXHRcdHRoaXMua25vdHMubGVuZ3RoID0gMFxuXHRcdHRoaXMuYmdDaXJjbGUuY2xlYXIoKVxuXHRcdHRoaXMuYmdDaXJjbGUgPSBudWxsXG5cdFx0dGhpcy5jb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5jb250YWluZXIpXG5cdH1cbn1cbiIsImltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTcHJpbmdHYXJkZW4ge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLmNvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0dGhpcy5hcmVhUG9seWdvbiA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmFkZENoaWxkKHRoaXMuYXJlYVBvbHlnb24pXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lcilcblx0XHRcblx0XHR0aGlzLmxpbmVXID0gQXBwU3RvcmUuZ2V0TGluZVdpZHRoKClcblx0XHR0aGlzLnBhdXNlZCA9IHRydWVcblx0XHR0aGlzLm9wZW5lZCA9IGZhbHNlXG5cblx0XHR0aGlzLmtub3RzID0gW11cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IEFwcENvbnN0YW50cy5UT1RBTF9LTk9UX05VTTsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IG5ldyBLbm90KHRoaXMuY29udGFpbmVyKS5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0XHR0aGlzLmtub3RzW2ldID0ga25vdFxuXHRcdH1cblxuXHRcdHRoaXMuY29uZmlnID0ge1xuXHRcdFx0c3ByaW5nOiAwLFxuXHRcdFx0ZnJpY3Rpb246IDAsXG5cdFx0XHRzcHJpbmdMZW5ndGg6IDBcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoZGF0YSwgd2l0aEZpbGwsIGlzSW50ZXJhY3RpdmUsIHR5cGUpIHtcblx0XHR0aGlzLnBhcmFtcyA9IGRhdGFcblx0XHR0eXBlID0gdHlwZSB8fCBBcHBDb25zdGFudHMuTEFORElOR1xuXHRcdHRoaXMuY29sb3IgPSAodHlwZSA9PSBBcHBDb25zdGFudHMuTEFORElORykgfHwgdGhpcy5wYXJhbXMuaGlnaGxpZ2h0ID09IGZhbHNlID8gMHhmZmZmZmYgOiB0aGlzLnBhcmFtcy5jb2xvclxuXHRcdHRoaXMud2l0aEZpbGwgPSB3aXRoRmlsbCB8fCBmYWxzZVxuXHRcdGlmKHRoaXMucGFyYW1zLmhpZ2hsaWdodCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuY29sb3IgPSB0aGlzLnBhcmFtcy5oaWdobGlnaHQgPT0gZmFsc2UgPyAweGZmZmZmZiA6IHRoaXMuY29sb3Jcblx0XHRcdHRoaXMud2l0aEZpbGwgPSB0aGlzLnBhcmFtcy5oaWdobGlnaHQgPT0gZmFsc2UgPyBmYWxzZSA6IHRydWVcblx0XHR9XG5cdFx0dGhpcy5pc0ludGVyYWN0aXZlID0gaXNJbnRlcmFjdGl2ZSB8fCBmYWxzZVxuXHRcdHZhciBrbm90c0RhdGEgPSB0aGlzLnBhcmFtcy5rbm90c1xuXG5cdFx0dGhpcy5vbkNsaWNrZWQgPSB0aGlzLm9uQ2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0aWYodGhpcy5pc0ludGVyYWN0aXZlKSB7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmJ1dHRvbk1vZGUgPSB0cnVlXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmludGVyYWN0aXZlID0gdHJ1ZVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5vbignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblx0XHR9ZWxzZXtcblx0XHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIuYnV0dG9uTW9kZSA9IGZhbHNlXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmludGVyYWN0aXZlID0gZmFsc2Vcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMua25vdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBuZXdLbm90U2NhbGUgPSBrbm90c0RhdGFbaV1cblx0XHRcdHZhciBrbm90ID0gdGhpcy5rbm90c1tpXVxuXHRcdFx0a25vdC5jaGFuZ2VTaXplKHRoaXMua25vdFJhZGl1cylcblx0XHRcdGtub3QudG9YID0gbmV3S25vdFNjYWxlLnggKiAodGhpcy5yYWRpdXMpXG5cdFx0XHRrbm90LnRvWSA9IG5ld0tub3RTY2FsZS55ICogKHRoaXMucmFkaXVzKVxuXHRcdH1cblx0XHR0aGlzLmNvbnRhaW5lci5yb3RhdGlvbiA9IFV0aWxzLlJhbmQoLTQsIDQpXG5cdFx0dGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoID0gMjAwXG5cdFx0dGhpcy5hc3NpZ25PcGVuZWRDb25maWcoKVxuXHR9XG5cdG9uQ2xpY2tlZCgpIHtcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZCArICcvJyArIHRoaXMucGFyYW1zLmlkXG5cdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR0aGlzLmFyZWFQb2x5Z29uLmNsZWFyKClcblx0XHRpZih0aGlzLndpdGhGaWxsKSB7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uLmJlZ2luRmlsbCh0aGlzLmNvbG9yKVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbi5saW5lU3R5bGUoMClcblx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubW92ZVRvKHRoaXMua25vdHNbMF0ueCwgdGhpcy5rbm90c1swXS55KVxuXHRcdH1lbHNle1xuXHRcdFx0dGhpcy5hcmVhUG9seWdvbi5saW5lU3R5bGUodGhpcy5saW5lVywgdGhpcy5jb2xvciwgMC44KVxuXHRcdH1cblx0XHR2YXIgbGVuID0gdGhpcy5rbm90cy5sZW5ndGhcblx0XHR2YXIgc3ByaW5nID0gdGhpcy5jb25maWcuc3ByaW5nXG5cdFx0dmFyIGZyaWN0aW9uID0gdGhpcy5jb25maWcuZnJpY3Rpb25cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IHRoaXMua25vdHNbaV1cblx0XHRcdHZhciBwcmV2aW91c0tub3QgPSB0aGlzLmtub3RzW2ktMV1cblx0XHRcdHByZXZpb3VzS25vdCA9IChwcmV2aW91c0tub3QgPT0gdW5kZWZpbmVkKSA/IHRoaXMua25vdHNbbGVuLTFdIDogcHJldmlvdXNLbm90XG5cblx0XHRcdFV0aWxzLlNwcmluZ1RvKGtub3QsIGtub3QudG9YLCBrbm90LnRvWSwgaSwgc3ByaW5nLCBmcmljdGlvbiwgdGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoKVxuXHRcdFx0a25vdC5wb3NpdGlvbihrbm90LnggKyBrbm90LnZ4LCBrbm90LnkgKyBrbm90LnZ5KVxuXG5cdFx0XHRpZih0aGlzLndpdGhGaWxsKSB7XG5cdFx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubGluZVRvKGtub3QueCwga25vdC55KVxuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubW92ZVRvKHByZXZpb3VzS25vdC54LCBwcmV2aW91c0tub3QueSlcblx0XHRcdFx0dGhpcy5hcmVhUG9seWdvbi5saW5lVG8oa25vdC54LCBrbm90LnkpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKHRoaXMud2l0aEZpbGwpIHtcblx0XHRcdHRoaXMuYXJlYVBvbHlnb24uZW5kRmlsbCgpXG5cdFx0fVxuXHRcdHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCAtPSAodGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoKSAqIDAuMVxuXHRcdHRoaXMuY29udGFpbmVyLnJvdGF0aW9uIC09ICh0aGlzLmNvbnRhaW5lci5yb3RhdGlvbikgKiAwLjFcblx0fVxuXHRhc3NpZ25PcGVuZWRDb25maWcoKSB7XG5cdFx0dGhpcy5jb25maWcuc3ByaW5nID0gMC4wM1xuXHRcdHRoaXMuY29uZmlnLmZyaWN0aW9uID0gMC45MlxuXHR9XG5cdGNsZWFyKCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5rbm90cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSB0aGlzLmtub3RzW2ldXG5cdFx0XHRrbm90LmNsZWFyKClcblx0XHR9XG5cdFx0dGhpcy5hcmVhUG9seWdvbi5jbGVhcigpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0aWYodGhpcy5pc0ludGVyYWN0aXZlKSB7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmJ1dHRvbk1vZGUgPSBmYWxzZVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5pbnRlcmFjdGl2ZSA9IGZhbHNlXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLm9mZignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblx0XHR9XG5cdH1cblx0cmVzaXplKHJhZGl1cykge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dGhpcy5yYWRpdXMgPSByYWRpdXNcblx0XHR0aGlzLmNvbnRhaW5lci54ID0gMFxuXHRcdHRoaXMuY29udGFpbmVyLnkgPSAwXG5cdH1cbn1cbiIsImltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBSZWN0YW5nbGVCdG4gZnJvbSAnUmVjdGFuZ2xlQnRuJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUaXRsZVN3aXRjaGVyIHtcblx0Y29uc3RydWN0b3IoZWxlbWVudCwgcmVjdGFuZ2xlRWwsIGJ1eVR4dCkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcblx0XHR0aGlzLnJlY3RFbCA9IHJlY3RhbmdsZUVsXG5cdFx0dGhpcy5idXlUeHQgPSBidXlUeHRcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnByb2R1Y3RUaXRsZVdyYXBwZXIgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5wcm9kdWN0LXRpdGxlLXdyYXBwZXJcIilcblx0XHR2YXIgY29udGFpbmVyQSA9IHRoaXMuZWxlbWVudC5maW5kKCcudGl0bGUtYScpXG5cdFx0dmFyIGNvbnRhaW5lckIgPSB0aGlzLmVsZW1lbnQuZmluZCgnLnRpdGxlLWInKVxuXHRcdHRoaXMuY29udGFpbmVycyA9IHtcblx0XHRcdCd0aXRsZS1hJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQVxuXHRcdFx0fSxcblx0XHRcdCd0aXRsZS1iJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQlxuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLndpZHRoID0gMTAwXG5cdFx0dGhpcy5oZWlnaHQgPSBBcHBDb25zdGFudHMuR0xPQkFMX0ZPTlRfU0laRVxuXG5cdFx0dmFyIHJlY3RXaWR0aCA9IHRoaXMuYnV5VHh0Lmxlbmd0aCAqIDEwXG5cdFx0dGhpcy5yZWN0YW5nbGVCb3JkZXIgPSBuZXcgUmVjdGFuZ2xlQnRuKHRoaXMucmVjdEVsLCBudWxsLCAxMTAgKyByZWN0V2lkdGgpXG5cdFx0dGhpcy5yZWN0YW5nbGVCb3JkZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdHRoaXMuYWxsUmVjdFN2Z0tub3RzID0gdGhpcy5yZWN0RWwuZmluZCgnc3ZnIC5rbm90Jylcblx0XHR0aGlzLmFsbFJlY3RTdmdMaW5lcyA9IHRoaXMucmVjdEVsLmZpbmQoJ3N2ZyAubGluZScpXG5cblx0XHRpZih0aGlzLm9uQ2xpY2sgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLm9uQ2xpY2tlZCA9IHRoaXMub25DbGlja2VkLmJpbmQodGhpcylcblx0XHRcdHRoaXMuZWxlbWVudC5vbignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblx0XHR9XG5cdFx0dGhpcy5vbk92ZXIgPSB0aGlzLm9uT3Zlci5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vbk91dCA9IHRoaXMub25PdXQuYmluZCh0aGlzKVxuXHRcdHRoaXMuZWxlbWVudC5vbignbW91c2VlbnRlcicsIHRoaXMub25PdmVyKVxuXHRcdHRoaXMuZWxlbWVudC5vbignbW91c2VsZWF2ZScsIHRoaXMub25PdXQpXG5cdH1cblx0b25PdmVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLnJlY3RhbmdsZUJvcmRlci5yb2xsb3ZlcigpXG5cdH1cblx0b25PdXQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMucmVjdGFuZ2xlQm9yZGVyLnJvbGxvdXQoKVxuXHR9XG5cdG9uQ2xpY2tlZChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5vbkNsaWNrKClcblx0fVxuXHR1cGRhdGVDb2xvcihjb2xvcikge1xuXHRcdHZhciBjID0gY29sb3Jcblx0XHRjID0gYy5yZXBsYWNlKFwiMHhcIiwgXCIjXCIpXG5cdFx0dGhpcy5hbGxSZWN0U3ZnS25vdHMuY3NzKCdmaWxsJywgYylcblx0XHR0aGlzLmFsbFJlY3RTdmdMaW5lcy5jc3MoJ3N0cm9rZScsIGMpXG5cdH1cblx0dXBkYXRlKG5hbWUpIHtcblx0XHR0aGlzLmN1cnJlbnRUaXRsZUNsYXNzID0gKHRoaXMuY3VycmVudFRpdGxlQ2xhc3MgPT09ICd0aXRsZS1hJykgPyAndGl0bGUtYicgOiAndGl0bGUtYSdcblx0XHR0aGlzLnByZXZpb3VzVGl0bGUgPSB0aGlzLmN1cnJlbnRUaXRsZVxuXHRcdHRoaXMuY3VycmVudFRpdGxlID0gdGhpcy5jb250YWluZXJzW3RoaXMuY3VycmVudFRpdGxlQ2xhc3NdXG5cdFx0dGhpcy5jdXJyZW50VGl0bGUuZWwudGV4dChuYW1lKVxuXG5cdFx0dGhpcy51cGRhdGVDb21wb25lbnRTaXplKClcblxuXHRcdHRoaXMuY3VycmVudFRpdGxlLmVsLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1pbicpLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1vdXQnKS5yZW1vdmVDbGFzcygnd2lsbC10cmFuc2l0aW9uLW91dCcpLmFkZENsYXNzKCd3aWxsLXRyYW5zaXRpb24taW4nKVxuXHRcdGlmKHRoaXMucHJldmlvdXNUaXRsZSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMucHJldmlvdXNUaXRsZS5lbC5yZW1vdmVDbGFzcygnZGlkLXRyYW5zaXRpb24tb3V0JykucmVtb3ZlQ2xhc3MoJ2RpZC10cmFuc2l0aW9uLWluJykucmVtb3ZlQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1pbicpLmFkZENsYXNzKCd3aWxsLXRyYW5zaXRpb24tb3V0Jylcblx0XHR9XG5cdH1cblx0c2hvdygpIHtcblx0XHR0aGlzLmVsZW1lbnQuY3NzKCd3aWR0aCcsIHRoaXMuY3VycmVudFRpdGxlLndpZHRoKVxuXHRcdHRoaXMuY3VycmVudFRpdGxlLmVsLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1vdXQnKS5yZW1vdmVDbGFzcygnd2lsbC10cmFuc2l0aW9uLWluJykucmVtb3ZlQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1vdXQnKS5hZGRDbGFzcygnZGlkLXRyYW5zaXRpb24taW4nKVxuXHRcdGlmKHRoaXMucHJldmlvdXNUaXRsZSAhPSB1bmRlZmluZWQpe1xuXHRcdFx0dGhpcy5wcmV2aW91c1RpdGxlLmVsLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1pbicpLnJlbW92ZUNsYXNzKCd3aWxsLXRyYW5zaXRpb24taW4nKS5yZW1vdmVDbGFzcygnd2lsbC10cmFuc2l0aW9uLW91dCcpLmFkZENsYXNzKCdkaWQtdHJhbnNpdGlvbi1vdXQnKVxuXHRcdH1cblx0fVxuXHR1cGRhdGVDb21wb25lbnRTaXplKCkge1xuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHZhciBjdXJyZW50VGl0bGVXID0gdGhpcy5jdXJyZW50VGl0bGUuZWwud2lkdGgoKVxuXHRcdFx0dGhpcy5jdXJyZW50VGl0bGUud2lkdGggPSBjdXJyZW50VGl0bGVXXG5cdFx0XHR0aGlzLndpZHRoID0gdGhpcy5yZWN0YW5nbGVCb3JkZXIud2lkdGhcblx0XHR9LCAwKVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHRVdGlscy5UcmFuc2xhdGUodGhpcy5wcm9kdWN0VGl0bGVXcmFwcGVyLmdldCgwKSwgKHRoaXMud2lkdGggPj4gMSkgLSAodGhpcy5jdXJyZW50VGl0bGUud2lkdGggPj4gMSksIDAsIDApXG5cdFx0VXRpbHMuVHJhbnNsYXRlKHRoaXMuZWxlbWVudC5nZXQoMCksIHgsIHksIDApXG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLm9uQ2xpY2sgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLmVsZW1lbnQub2ZmKCdjbGljaycsIHRoaXMub25DbGlja2VkKVxuXHRcdH1cblx0XHR0aGlzLmVsZW1lbnQub2ZmKCdtb3VzZWVudGVyJywgdGhpcy5vbk92ZXIpXG5cdFx0dGhpcy5lbGVtZW50Lm9mZignbW91c2VsZWF2ZScsIHRoaXMub25PdXQpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGFza2FYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKHBhcmVudENvbnRhaW5lcikge1xuXHRcdHN1cGVyKHBhcmVudENvbnRhaW5lcilcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5wYXJlbnRDb250YWluZXIgPSBwYXJlbnRDb250YWluZXJcblx0XHR0aGlzLnBhcmVudENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnB4Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHR9XG5cdHVwZGF0ZSgpIHtcblx0fVxuXHRyZXNpemUoKSB7XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5wYXJlbnRDb250YWluZXIucmVtb3ZlQ2hpbGQodGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLnB4Q29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuY29uc3QgZ2xzbGlmeSA9IHJlcXVpcmUoJ2dsc2xpZnknKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHZW1TdG9uZVhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0c3VwZXIocGFyZW50Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdC8vIHZhciBleHBsb3Npb25GcmFnID0gZ2xzbGlmeSgnLi4vc2hhZGVycy9nZW1zdG9uZS9kaWZmdXNpb24tbWl4LWZyYWcuZ2xzbCcpXG5cblx0XHQvLyB2YXIgaW1nVXJsID0gQXBwU3RvcmUuUHJlbG9hZGVyLmdldEltYWdlVVJMKCdnZW1zdG9uZS1leHBlcmllbmNlLW5vaXNlLWNvbG9yJylcblx0XHQvLyBjb25zb2xlLmxvZyhpbWdVcmwpXG5cdFx0Ly8gdmFyIHRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGltZ1VybClcblx0XHQvLyB0aGlzLnNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlKVxuXG5cdFx0Ly8gdGhpcy5zcHJpdGUuc2hhZGVyID0gbmV3IFBJWEkuQWJzdHJhY3RGaWx0ZXIobnVsbCwgZXhwbG9zaW9uRnJhZywgdGhpcy51bmlmb3JtcyA9IHtcblx0XHQvLyBcdHJlc29sdXRpb246IHsgdHlwZTogJzJmJywgdmFsdWU6IHsgeDogMCwgeTogMCB9IH0sXG5cdFx0Ly8gXHR1Tm9pc2U6IHt0eXBlOiAnc2FtcGxlcjJEJywgdmFsdWU6IHRleHR1cmV9LFxuXHRcdC8vIFx0dGltZToge3R5cGU6ICcxZicsIHZhbHVlOiAwfSxcblx0IC8vICAgIH0pXG5cblx0IC8vICAgIHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5zcHJpdGUpXG5cblx0XHQvLyBjb25zb2xlLmxvZyhleHBsb3Npb25GcmFnKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHRcdHRoaXMudW5pZm9ybXMudGltZS52YWx1ZSArPSAwLjFcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnNwcml0ZS53aWR0aCA9IHdpbmRvd1dcblx0XHR0aGlzLnNwcml0ZS5oZWlnaHQgPSB3aW5kb3dIXG5cdFx0dGhpcy51bmlmb3Jtcy5yZXNvbHV0aW9uLnZhbHVlLnggPSB3aW5kb3dXXG5cdFx0dGhpcy51bmlmb3Jtcy5yZXNvbHV0aW9uLnZhbHVlLnkgPSB3aW5kb3dIXG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNZXRhbFhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0c3VwZXIocGFyZW50Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuIiwiaW1wb3J0IEJhc2VYUCBmcm9tICdCYXNlWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNraVhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0c3VwZXIocGFyZW50Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuIiwiaW1wb3J0IEJhc2VYUCBmcm9tICdCYXNlWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdvb2RYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKHBhcmVudENvbnRhaW5lcikge1xuXHRcdHN1cGVyKHBhcmVudENvbnRhaW5lcilcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBQYWdlIGZyb20gJ1BhZ2UnXG5pbXBvcnQgTGFuZGluZ1NsaWRlc2hvdyBmcm9tICdMYW5kaW5nU2xpZGVzaG93J1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3MgZnJvbSAnQ29tcGFzcydcbmltcG9ydCBBcnJvd0J0biBmcm9tICdBcnJvd0J0bidcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhbmRpbmcgZXh0ZW5kcyBQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRwcm9wcy5kYXRhLmlzTW9iaWxlID0gQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGVcblx0XHRpZihwcm9wcy5kYXRhLmlzTW9iaWxlKSB7XG5cdFx0XHR2YXIgbW9iaWxlU2NvcGUgPSBbXVxuXHRcdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHRcdHZhciBpbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIHBsYW5ldCA9IHBsYW5ldHNbaV1cblx0XHRcdFx0dmFyIGcgPSB7XG5cdFx0XHRcdFx0aWQ6IHBsYW5ldCxcblx0XHRcdFx0XHRwbGFuZXRUeHQ6IGluZm9zLnBsYW5ldC50b1VwcGVyQ2FzZSgpLFxuXHRcdFx0XHRcdHBsYW5ldE5hbWU6IHBsYW5ldC50b1VwcGVyQ2FzZSgpLFxuXHRcdFx0XHRcdGltZ3NyYzogQXBwU3RvcmUubWFpbkltYWdlVXJsKHBsYW5ldCwgQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpLFxuXHRcdFx0XHRcdHVybDogXCIjIS9wbGFuZXQvXCIgKyBwbGFuZXQgKyAnLzAnXG5cdFx0XHRcdH1cblx0XHRcdFx0bW9iaWxlU2NvcGVbaV0gPSBnXG5cdFx0XHR9O1xuXHRcdFx0cHJvcHMuZGF0YS5tb2JpbGVTY29wZSA9IG1vYmlsZVNjb3BlXG5cdFx0fVxuXG5cdFx0c3VwZXIocHJvcHMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSAhPSB0cnVlKSB7XG5cblx0XHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdyA9IG5ldyBMYW5kaW5nU2xpZGVzaG93KHRoaXMucHhDb250YWluZXIsIHRoaXMuY2hpbGQpXG5cdFx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0XHR0aGlzLmNvbXBhc3MgPSBuZXcgQ29tcGFzcyh0aGlzLnB4Q29udGFpbmVyKVxuXHRcdFx0dGhpcy5jb21wYXNzLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdFx0dGhpcy5hcnJvd0xlZnQgPSBuZXcgQXJyb3dCdG4odGhpcy5jaGlsZC5maW5kKCcucHJldmlvdXMtYnRuJyksIEFwcENvbnN0YW50cy5MRUZUKVxuXHRcdFx0dGhpcy5hcnJvd0xlZnQuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdFx0dGhpcy5hcnJvd1JpZ2h0ID0gbmV3IEFycm93QnRuKHRoaXMuY2hpbGQuZmluZCgnLm5leHQtYnRuJyksIEFwcENvbnN0YW50cy5SSUdIVClcblx0XHRcdHRoaXMuYXJyb3dSaWdodC5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHRcdHRoaXMub25LZXlQcmVzc2VkID0gdGhpcy5vbktleVByZXNzZWQuYmluZCh0aGlzKVxuXHRcdFx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCB0aGlzLm9uS2V5UHJlc3NlZClcblxuXHRcdFx0dGhpcy5vblN0YWdlQ2xpY2tlZCA9IHRoaXMub25TdGFnZUNsaWNrZWQuYmluZCh0aGlzKVxuXHRcdFx0dGhpcy5wYXJlbnQub24oJ2NsaWNrJywgdGhpcy5vblN0YWdlQ2xpY2tlZClcblxuXHRcdFx0dGhpcy5hcnJvd0NsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0XHR0aGlzLmFycm93TW91c2VFbnRlciA9IHRoaXMuYXJyb3dNb3VzZUVudGVyLmJpbmQodGhpcylcblx0XHRcdHRoaXMuYXJyb3dNb3VzZUxlYXZlID0gdGhpcy5hcnJvd01vdXNlTGVhdmUuYmluZCh0aGlzKVxuXG5cdFx0XHR0aGlzLnByZXZpb3VzQXJlYSA9IHRoaXMuY2hpbGQuZmluZCgnLmludGVyZmFjZSAucHJldmlvdXMtYXJlYScpXG5cdFx0XHR0aGlzLm5leHRBcmVhID0gdGhpcy5jaGlsZC5maW5kKCcuaW50ZXJmYWNlIC5uZXh0LWFyZWEnKVxuXHRcdFx0dGhpcy5wcmV2aW91c0FyZWEub24oJ2NsaWNrJywgdGhpcy5hcnJvd0NsaWNrZWQpXG5cdFx0XHR0aGlzLm5leHRBcmVhLm9uKCdjbGljaycsIHRoaXMuYXJyb3dDbGlja2VkKVxuXHRcdFx0dGhpcy5wcmV2aW91c0FyZWEub24oJ21vdXNlZW50ZXInLCB0aGlzLmFycm93TW91c2VFbnRlcilcblx0XHRcdHRoaXMubmV4dEFyZWEub24oJ21vdXNlZW50ZXInLCB0aGlzLmFycm93TW91c2VFbnRlcilcblx0XHRcdHRoaXMucHJldmlvdXNBcmVhLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5hcnJvd01vdXNlTGVhdmUpXG5cdFx0XHR0aGlzLm5leHRBcmVhLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5hcnJvd01vdXNlTGVhdmUpXG5cblx0XHR9XG5cblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0YXJyb3dDbGlja2VkKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgaWQgPSBlLmN1cnJlbnRUYXJnZXQuaWRcblx0XHR2YXIgZGlyZWN0aW9uID0gaWQudG9VcHBlckNhc2UoKVxuXHRcdHN3aXRjaChkaXJlY3Rpb24pIHtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxFRlQ6XG5cdFx0XHRcdHRoaXMucHJldmlvdXMoKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuUklHSFQ6XG5cdFx0XHRcdHRoaXMubmV4dCgpXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHR9XG5cdGFycm93TW91c2VFbnRlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dmFyIGlkID0gZS5jdXJyZW50VGFyZ2V0LmlkXG5cdFx0dmFyIGRpcmVjdGlvbiA9IGlkLnRvVXBwZXJDYXNlKClcblx0XHR2YXIgYXJyb3cgPSB0aGlzLmdldEFycm93QnlEaXJlY3Rpb24oZGlyZWN0aW9uKVxuXHRcdGFycm93Lm1vdXNlT3ZlcigpXG5cdH1cblx0YXJyb3dNb3VzZUxlYXZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgaWQgPSBlLmN1cnJlbnRUYXJnZXQuaWRcblx0XHR2YXIgZGlyZWN0aW9uID0gaWQudG9VcHBlckNhc2UoKVxuXHRcdHZhciBhcnJvdyA9IHRoaXMuZ2V0QXJyb3dCeURpcmVjdGlvbihkaXJlY3Rpb24pXG5cdFx0YXJyb3cubW91c2VPdXQoKVxuXHR9XG5cdGdldEFycm93QnlEaXJlY3Rpb24oZGlyZWN0aW9uKSB7XG5cdFx0c3dpdGNoKGRpcmVjdGlvbikge1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEVGVDpcblx0XHRcdFx0cmV0dXJuIHRoaXMuYXJyb3dMZWZ0XG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5SSUdIVDpcblx0XHRcdFx0cmV0dXJuIHRoaXMuYXJyb3dSaWdodFxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0fVxuXHRvblN0YWdlQ2xpY2tlZChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0c3dpdGNoKHRoaXMuZGlyZWN0aW9uKSB7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MRUZUOlxuXHRcdFx0XHR0aGlzLnByZXZpb3VzKClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlJJR0hUOlxuXHRcdFx0XHR0aGlzLm5leHQoKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuVE9QOlxuXHRcdFx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5sYW5kaW5nU2xpZGVzaG93LmN1cnJlbnRJZCArICcvMCdcblx0XHRcdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0fVxuXHRvbktleVByZXNzZWQoZSkge1xuXHQgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0c3dpdGNoKGUud2hpY2gpIHtcblx0ICAgICAgICBjYXNlIDM3OiAvLyBsZWZ0XG5cdCAgICAgICAgXHR0aGlzLnByZXZpb3VzKClcblx0ICAgICAgICBcdGJyZWFrXG5cdCAgICAgICAgY2FzZSAzOTogLy8gcmlnaHRcblx0ICAgICAgICBcdHRoaXMubmV4dCgpXG5cdCAgICAgICAgXHRicmVha1xuXHQgICAgICAgIGRlZmF1bHQ6IHJldHVybjtcblx0ICAgIH1cblx0fVxuXHR1cGRhdGVDb21wYXNzUGxhbmV0KCkge1xuXG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHJldHVybiBcblx0XHRcblx0XHR2YXIgcGxhbmV0RGF0YSA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQodGhpcy5sYW5kaW5nU2xpZGVzaG93LmN1cnJlbnRJZClcblx0XHR0aGlzLmNvbXBhc3MudXBkYXRlRGF0YShwbGFuZXREYXRhKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdG5leHQoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93Lm5leHQoKVxuXHRcdHRoaXMudXBkYXRlQ29tcGFzc1BsYW5ldCgpXG5cdH1cblx0cHJldmlvdXMoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnByZXZpb3VzKClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgcmV0dXJuIFxuXG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciBtb3VzZVggPSBBcHBTdG9yZS5Nb3VzZS54XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnVwZGF0ZSgpXG5cdFx0dGhpcy5jb21wYXNzLnVwZGF0ZSgpXG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTk9ORVxuXHRcdHZhciBhcmVhID0gd2luZG93VyAqIDAuMjVcblx0XHRpZihtb3VzZVggPiAoKHdpbmRvd1cgPj4gMSkgLSBhcmVhKSAmJiBtb3VzZVggPCAoKHdpbmRvd1cgPj4gMSkgKyBhcmVhKSkge1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuVE9QXG5cdFx0fVxuXG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm4gXG5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5yZXNpemUoKVxuXHRcdHRoaXMuY29tcGFzcy5yZXNpemUoKVxuXHRcdHRoaXMuY29tcGFzcy5wb3NpdGlvbihcblx0XHRcdHdpbmRvd1cgPj4gMSxcblx0XHRcdCh3aW5kb3dIID4+IDEpICsgKHdpbmRvd0ggKiAwLjAzKVxuXHRcdClcblx0XHR0aGlzLmFycm93UmlnaHQucG9zaXRpb24oXG5cdFx0XHR3aW5kb3dXIC0gKCh3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UpID4+IDEpLFxuXHRcdFx0d2luZG93SCA+PiAxXG5cdFx0KVxuXHRcdHRoaXMuYXJyb3dMZWZ0LnBvc2l0aW9uKFxuXHRcdFx0KCh3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UpID4+IDEpIC0gdGhpcy5hcnJvd0xlZnQud2lkdGgsXG5cdFx0XHR3aW5kb3dIID4+IDFcblx0XHQpXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEuY3NzKHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UsXG5cdFx0XHRoZWlnaHQ6IHdpbmRvd0hcblx0XHR9KVxuXHRcdHRoaXMubmV4dEFyZWEuY3NzKHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UsXG5cdFx0XHRoZWlnaHQ6IHdpbmRvd0gsXG5cdFx0XHRsZWZ0OiB3aW5kb3dXIC0gKHdpbmRvd1cgKiBBcHBDb25zdGFudHMuTEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRSlcblx0XHR9KVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm4gXG5cblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuY29tcGFzcy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5hcnJvd0xlZnQuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuYXJyb3dSaWdodC5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0JChkb2N1bWVudCkub2ZmKCdrZXlkb3duJywgdGhpcy5vbktleVByZXNzZWQpXG5cdFx0dGhpcy5wYXJlbnQub2ZmKCdjbGljaycsIHRoaXMub25TdGFnZUNsaWNrZWQpXG5cblx0XHR0aGlzLnByZXZpb3VzQXJlYS5vZmYoJ2NsaWNrJywgdGhpcy5hcnJvd0NsaWNrZWQpXG5cdFx0dGhpcy5uZXh0QXJlYS5vZmYoJ2NsaWNrJywgdGhpcy5hcnJvd0NsaWNrZWQpXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEub2ZmKCdtb3VzZWVudGVyJywgdGhpcy5hcnJvd01vdXNlRW50ZXIpXG5cdFx0dGhpcy5uZXh0QXJlYS5vZmYoJ21vdXNlZW50ZXInLCB0aGlzLmFycm93TW91c2VFbnRlcilcblx0XHR0aGlzLnByZXZpb3VzQXJlYS5vZmYoJ21vdXNlbGVhdmUnLCB0aGlzLmFycm93TW91c2VMZWF2ZSlcblx0XHR0aGlzLm5leHRBcmVhLm9mZignbW91c2VsZWF2ZScsIHRoaXMuYXJyb3dNb3VzZUxlYXZlKVxuXHR9XG59XG5cbiIsImV4cG9ydCBkZWZhdWx0IHtcblx0V0lORE9XX1JFU0laRTogJ1dJTkRPV19SRVNJWkUnLFxuXHRQQUdFX0hBU0hFUl9DSEFOR0VEOiAnUEFHRV9IQVNIRVJfQ0hBTkdFRCcsXG5cdFBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRTogJ1BBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRScsXG5cdFBYX0NPTlRBSU5FUl9JU19SRUFEWTogJ1BYX0NPTlRBSU5FUl9JU19SRUFEWScsXG5cdFBYX0NPTlRBSU5FUl9BRERfQ0hJTEQ6ICdQWF9DT05UQUlORVJfQUREX0NISUxEJyxcblx0UFhfQ09OVEFJTkVSX1JFTU9WRV9DSElMRDogJ1BYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQnLFxuXG5cdExBTkRJTkc6ICdMQU5ESU5HJyxcblx0RVhQRVJJRU5DRTogJ0VYUEVSSUVOQ0UnLFxuXHRDQU1QQUlHTjogJ0NBTVBBSUdOJyxcblx0Tk9ORTogJ05PTkUnLFxuXG5cdENPTVBBU1NfU0laRV9QRVJDRU5UQUdFOiAwLjE2LFxuXHRDT01QQVNTX1NNQUxMX1NJWkVfUEVSQ0VOVEFHRTogMC4xOCxcblxuXHRMQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFOiAwLjI0LFxuXG5cdFNNQUxMX0tOT1RfUkFESVVTOiAzLFxuXG5cdE9QRU46ICdPUEVOJyxcblx0Q0xPU0U6ICdDTE9TRScsXG5cblx0TEVGVDogJ0xFRlQnLFxuXHRSSUdIVDogJ1JJR0hUJyxcblx0VE9QOiAnVE9QJyxcblx0Qk9UVE9NOiAnQk9UVE9NJyxcblxuXHRUT1RBTF9LTk9UX05VTTogMyxcblxuXHRQQURESU5HX0FST1VORDogNDAsXG5cblx0Q0FNUEFJR05fSU1BR0VfU0laRTogWzE1MDAsIDk3M10sXG5cblx0UkVTUE9OU0lWRV9JTUFHRTogWzE5MjAsIDEyODAsIDY0MF0sXG5cblx0RU5WSVJPTk1FTlRTOiB7XG5cdFx0UFJFUFJPRDoge1xuXHRcdFx0c3RhdGljOiAnJ1xuXHRcdH0sXG5cdFx0UFJPRDoge1xuXHRcdFx0XCJzdGF0aWNcIjogSlNfdXJsX3N0YXRpY1xuXHRcdH1cblx0fSxcblxuXHRMQU5EU0NBUEU6ICdMQU5EU0NBUEUnLFxuXHRQT1JUUkFJVDogJ1BPUlRSQUlUJyxcblxuXHRNRURJQV9HTE9CQUxfVzogMTkyMCxcblx0TUVESUFfR0xPQkFMX0g6IDEwODAsXG5cblx0R0xPQkFMX0ZPTlRfU0laRTogMTYsXG5cblx0TUlOX01JRERMRV9XOiA5NjAsXG5cdE1RX1hTTUFMTDogMzIwLFxuXHRNUV9TTUFMTDogNDgwLFxuXHRNUV9NRURJVU06IDc2OCxcblx0TVFfTEFSR0U6IDEwMjQsXG5cdE1RX1hMQVJHRTogMTI4MCxcblx0TVFfWFhMQVJHRTogMTY4MCxcbn0iLCJpbXBvcnQgRmx1eCBmcm9tICdmbHV4J1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJ1xuXG52YXIgQXBwRGlzcGF0Y2hlciA9IGFzc2lnbihuZXcgRmx1eC5EaXNwYXRjaGVyKCksIHtcblx0aGFuZGxlVmlld0FjdGlvbjogZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0dGhpcy5kaXNwYXRjaCh7XG5cdFx0XHRzb3VyY2U6ICdWSUVXX0FDVElPTicsXG5cdFx0XHRhY3Rpb246IGFjdGlvblxuXHRcdH0pO1xuXHR9XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgQXBwRGlzcGF0Y2hlciIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazEsIGhlbHBlciwgYWxpYXMxPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMyPVwiZnVuY3Rpb25cIiwgYWxpYXMzPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICByZXR1cm4gXCJcdFx0XFxuXHRcdDxkaXYgaWQ9XFxcIm1vYmlsZS1tZW51XFxcIj5cXG5cdFx0XHQ8YSBocmVmPVxcXCIjIS9sYW5kaW5nXFxcIiBjbGFzcz1cXFwibG9nb1xcXCI+XFxuXHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgaWQ9XFxcIkxheWVyXzFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMTM2LjAxMyA0OS4zNzVcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDEzNi4wMTMgNDkuMzc1XFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBmaWxsLXJ1bGU9XFxcImV2ZW5vZGRcXFwiIGNsaXAtcnVsZT1cXFwiZXZlbm9kZFxcXCIgZD1cXFwiTTgyLjE0MSw4LjAwMmgzLjM1NGMxLjIxMywwLDEuNzE3LDAuNDk5LDEuNzE3LDEuNzI1djcuMTM3YzAsMS4yMzEtMC41MDEsMS43MzYtMS43MDUsMS43MzZoLTMuMzY1VjguMDAyeiBNODIuNTIzLDI0LjYxN3Y4LjQyNmwtNy4wODctMC4zODRWMS45MjVIODcuMzljMy4yOTIsMCw1Ljk2LDIuNzA1LDUuOTYsNi4wNDR2MTAuNjA0YzAsMy4zMzgtMi42NjgsNi4wNDQtNS45Niw2LjA0NEg4Mi41MjN6IE0zMy40OTEsNy45MTNjLTEuMTMyLDAtMi4wNDgsMS4wNjUtMi4wNDgsMi4zNzl2MTEuMjU2aDQuNDA5VjEwLjI5MmMwLTEuMzE0LTAuOTE3LTIuMzc5LTIuMDQ3LTIuMzc5SDMzLjQ5MXogTTMyLjk5NCwwLjk3NGgxLjMwOGM0LjcwMiwwLDguNTE0LDMuODY2LDguNTE0LDguNjM0djI1LjIyNGwtNi45NjMsMS4yNzN2LTcuODQ4aC00LjQwOWwwLjAxMiw4Ljc4N2wtNi45NzQsMi4wMThWOS42MDhDMjQuNDgxLDQuODM5LDI4LjI5MiwwLjk3NCwzMi45OTQsMC45NzQgTTEyMS45MzMsNy45MjFoMy40MjNjMS4yMTUsMCwxLjcxOCwwLjQ5NywxLjcxOCwxLjcyNHY4LjE5NGMwLDEuMjMyLTAuNTAyLDEuNzM2LTEuNzA1LDEuNzM2aC0zLjQzNlY3LjkyMXogTTEzMy43MTgsMzEuMDU1djE3LjQ4N2wtNi45MDYtMy4zNjhWMzEuNTkxYzAtNC45Mi00LjU4OC01LjA4LTQuNTg4LTUuMDh2MTYuNzc0bC02Ljk4My0yLjkxNFYxLjkyNWgxMi4yMzFjMy4yOTEsMCw1Ljk1OSwyLjcwNSw1Ljk1OSw2LjA0NHYxMS4wNzdjMCwyLjIwNy0xLjIxNyw0LjE1My0yLjk5MSw1LjExNUMxMzEuNzYxLDI0Ljg5NCwxMzMuNzE4LDI3LjA3NywxMzMuNzE4LDMxLjA1NSBNMTAuODA5LDAuODMzYy00LjcwMywwLTguNTE0LDMuODY2LTguNTE0LDguNjM0djI3LjkzNmMwLDQuNzY5LDQuMDE5LDguNjM0LDguNzIyLDguNjM0bDEuMzA2LTAuMDg1YzUuNjU1LTEuMDYzLDguMzA2LTQuNjM5LDguMzA2LTkuNDA3di04Ljk0aC02Ljk5NnY4LjczNmMwLDEuNDA5LTAuMDY0LDIuNjUtMS45OTQsMi45OTJjLTEuMjMxLDAuMjE5LTIuNDE3LTAuODE2LTIuNDE3LTIuMTMyVjEwLjE1MWMwLTEuMzE0LDAuOTE3LTIuMzgxLDIuMDQ3LTIuMzgxaDAuMzE1YzEuMTMsMCwyLjA0OCwxLjA2NywyLjA0OCwyLjM4MXY4LjQ2NGg2Ljk5NlY5LjQ2N2MwLTQuNzY4LTMuODEyLTguNjM0LTguNTE0LTguNjM0SDEwLjgwOSBNMTAzLjk1MywyMy4xNjJoNi45Nzd2LTYuNzQ0aC02Ljk3N1Y4LjQyM2w3LjY3Ni0wLjAwMlYxLjkyNEg5Ni43MnYzMy4yNzhjMCwwLDUuMjI1LDEuMTQxLDcuNTMyLDEuNjY2YzEuNTE3LDAuMzQ2LDcuNzUyLDIuMjUzLDcuNzUyLDIuMjUzdi03LjAxNWwtOC4wNTEtMS41MDhWMjMuMTYyeiBNNDYuODc5LDEuOTI3bDAuMDAzLDMyLjM1bDcuMTIzLTAuODk1VjE4Ljk4NWw1LjEyNiwxMC40MjZsNS4xMjYtMTAuNDg0bDAuMDAyLDEzLjY2NGw3LjAyMi0wLjA1NFYxLjg5NWgtNy41NDVMNTkuMTMsMTQuNkw1NC42NjEsMS45MjdINDYuODc5elxcXCIvPjwvc3ZnPlxcblx0XHRcdDwvYT5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJidXJnZXIgYnRuXFxcIj5cXG5cdFx0XHRcdDwhRE9DVFlQRSBzdmcgUFVCTElDIFxcXCItLy9XM0MvL0RURCBTVkcgMS4xLy9FTlxcXCIgXFxcImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZFxcXCI+PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgNjEuNTY0IDQ5LjM1NlxcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgNjEuNTY0IDQ5LjM1NlxcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PGc+PHBhdGggZD1cXFwiTTQuNTY0LDguMDA2YzEuNDQzLDAsMi42ODItMC44NTQsMy4yNjYtMi4wNzdoMTkuNjQ4YzAuNTg0LDEuMjIzLDEuODIzLDIuMDc3LDMuMjY3LDIuMDc3YzEuNDQ0LDAsMi42ODMtMC44NTQsMy4yNjYtMi4wNzdoMTkuNjQ5YzAuNTgzLDEuMjIzLDEuODIxLDIuMDc3LDMuMjY2LDIuMDc3YzAuMDEzLDAsMC4wMjUtMC4wMDMsMC4wMzktMC4wMDNjMC4wMTIsMCwwLjAyMywwLjAwMywwLjAzNSwwLjAwM2MwLjI0MywwLDAuNDgxLTAuMDIzLDAuNzE0LTAuMDY5YzAuNjk2LTAuMTM4LDEuMzM4LTAuNDc5LDEuODUzLTAuOTkzYzEuNDE0LTEuNDE0LDEuNDE0LTMuNzE1LTAuMDAxLTUuMTMxYy0wLjQxMS0wLjQxMS0wLjkxNy0wLjY4My0xLjQ1Ny0wLjg0OGMtMC4zNzItMC4xMjktMC43NjctMC4yMTQtMS4xODMtMC4yMTRjLTEuNDQzLDAtMi42ODIsMC44NTMtMy4yNjYsMi4wNzZIMzQuMDExYy0wLjU4NC0xLjIyMy0xLjgyMi0yLjA3Ni0zLjI2Ni0yLjA3NnMtMi42ODIsMC44NTMtMy4yNjcsMi4wNzZINy44M0M3LjI0NywxLjYwMyw2LjAwNywwLjc1LDQuNTY0LDAuNzVjLTIuMDAxLDAtMy42MjksMS42MjctMy42MjksMy42MjdDMC45MzYsNi4zNzgsMi41NjMsOC4wMDYsNC41NjQsOC4wMDZ6XFxcIi8+PHBhdGggZD1cXFwiTTQuNTY0LDI4LjE2OGMxLjQ0MywwLDIuNjgyLTAuODU0LDMuMjY2LTIuMDc2aDE5LjY0OWMwLjU4NCwxLjIyMywxLjgyMywyLjA3NiwzLjI2NywyLjA3NnMyLjY4Mi0wLjg1NCwzLjI2Ni0yLjA3NmgxOS42NDljMC41ODQsMS4yMjMsMS44MjIsMi4wNzYsMy4yNjYsMi4wNzZjMC4wMTIsMCwwLjAyNC0wLjAwNCwwLjAzNy0wLjAwNGMwLjAxMiwwLDAuMDI0LDAuMDA0LDAuMDM3LDAuMDA0YzAuMjQzLDAsMC40ODEtMC4wMjMsMC43MTQtMC4wN2MwLjY5Ni0wLjEzNywxLjMzOC0wLjQ3OCwxLjg1My0wLjk5MmMwLjE3Ni0wLjE3NSwwLjMyOS0wLjM2NSwwLjQ2Mi0wLjU2OGMwLjAwNC0wLjAwNiwwLjAwNi0wLjAxMiwwLjAxLTAuMDE4YzAuMzgzLTAuNTg0LDAuNTktMS4yNjUsMC41OS0xLjk3OWMwLTAuNzAyLTAuMjAzLTEuMzcxLTAuNTczLTEuOTQ4Yy0wLjAxLTAuMDE2LTAuMDE2LTAuMDM0LTAuMDI3LTAuMDUxYy0wLjEzMy0wLjIwMi0wLjI4Ni0wLjM5Mi0wLjQ2Mi0wLjU2N2MtMC42ODYtMC42ODUtMS41OTctMS4wNjItMi41NjUtMS4wNjJjLTAuMDEzLDAtMC4wMjUsMC4wMDMtMC4wMzcsMC4wMDNjLTAuMDEzLDAtMC4wMjUtMC4wMDMtMC4wMzctMC4wMDNjLTEuNDQ0LDAtMi42ODMsMC44NTMtMy4yNjYsMi4wNzZIMzQuMDExYy0wLjU4My0xLjIyMy0xLjgyMS0yLjA3Ni0zLjI2Ni0yLjA3NmMtMS40NDMsMC0yLjY4MywwLjg1My0zLjI2NywyLjA3Nkg3LjgzMWMtMC41ODQtMS4yMjMtMS44MjMtMi4wNzYtMy4yNjYtMi4wNzZjLTIuMDAxLDAtMy42MjksMS42MjctMy42MjksMy42MjdTMi41NjMsMjguMTY4LDQuNTY0LDI4LjE2OHpcXFwiLz48cGF0aCBkPVxcXCJNNTcsNDEuMzUxYy0wLjAxMywwLTAuMDI1LDAuMDA0LTAuMDM3LDAuMDA0Yy0wLjAxMywwLTAuMDI1LTAuMDA0LTAuMDM3LTAuMDA0Yy0xLjQ0MywwLTIuNjgyLDAuODUzLTMuMjY2LDIuMDc1SDM0LjAxMWMtMC41ODQtMS4yMjMtMS44MjItMi4wNzUtMy4yNjYtMi4wNzVzLTIuNjgyLDAuODUzLTMuMjY3LDIuMDc1SDcuODNjLTAuNTgzLTEuMjIzLTEuODIzLTIuMDc1LTMuMjY2LTIuMDc1Yy0yLjAwMSwwLTMuNjI5LDEuNjI3LTMuNjI5LDMuNjI2YzAsMi4wMDEsMS42MjgsMy42MjksMy42MjksMy42MjljMS40NDMsMCwyLjY4My0wLjg1NCwzLjI2Ni0yLjA3N2gxOS42NDhjMC41ODQsMS4yMjMsMS44MjMsMi4wNzcsMy4yNjcsMi4wNzdjMS40NDQsMCwyLjY4My0wLjg1NCwzLjI2Ni0yLjA3N2gxOS42NDljMC41ODMsMS4yMjMsMS44MjEsMi4wNzcsMy4yNjYsMi4wNzdjMC4wMTIsMCwwLjAyNC0wLjAwNCwwLjAzNy0wLjAwNGMwLjAxMiwwLDAuMDI0LDAuMDA0LDAuMDM3LDAuMDA0YzAuMjQzLDAsMC40ODEtMC4wMjMsMC43MTQtMC4wN2MwLjY5Ny0wLjEzOCwxLjMzOS0wLjQ3OSwxLjg1My0wLjk5MmMxLjQxNC0xLjQxNCwxLjQxNC0zLjcxNy0wLjAwMS01LjEzMUM1OC44OCw0MS43MjgsNTcuOTY5LDQxLjM1MSw1Nyw0MS4zNTF6XFxcIi8+PC9nPjwvc3ZnPlxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcIm1lbnUtc2xpZGVyXFxcIj5cXG5cdFx0XHRcdDx1bCBjbGFzcz0nbWFpbi1tZW51Jz5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm1vYmlsZU1lbnUgOiBkZXB0aDApLHtcIm5hbWVcIjpcImVhY2hcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDIsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcdFx0XHRcdDwvdWw+XFxuXHRcdFx0XHQ8dWwgY2xhc3M9J3NvY2lhbC1tZW51Jz5cXG5cdFx0XHRcdFx0PGxpPlxcblx0XHRcdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZmFjZWJvb2tVcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmZhY2Vib29rVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJmYWNlYm9va1VybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE2LjAwMiwwLjE2N2MtOC43NDYsMC0xNS44MzUsNy4wOS0xNS44MzUsMTUuODM0YzAsOC43NDYsNy4wODksMTUuODM1LDE1LjgzNSwxNS44MzVjOC43NDUsMCwxNS44MzQtNy4wODksMTUuODM0LTE1LjgzNUMzMS44MzYsNy4yNTcsMjQuNzQ3LDAuMTY3LDE2LjAwMiwwLjE2NyBNMjIuMzIyLDEzLjUzOWMwLjAwNywwLjEzOCwwLjAwOSwwLjI3OSwwLjAwOSwwLjQyYzAsNC4zMDItMy4yNzIsOS4yNTktOS4yNTksOS4yNTljLTEuODM3LDAtMy41NDctMC41MzktNC45ODctMS40NjFjMC4yNTMsMC4wMzEsMC41MTQsMC4wNDQsMC43NzYsMC4wNDRjMS41MjUsMCwyLjkyOC0wLjUyLDQuMDQyLTEuMzk0Yy0xLjQyNC0wLjAyMy0yLjYyNS0wLjk2NS0zLjAzOS0yLjI1OGMwLjE5OCwwLjAzNywwLjQwMiwwLjA1OCwwLjYxMSwwLjA1OGMwLjI5OCwwLDAuNTg1LTAuMDM4LDAuODU4LTAuMTE1Yy0xLjQ4OS0wLjI5Ny0yLjYxMi0xLjYxMi0yLjYxMi0zLjE4OXYtMC4wNDFjMC40NCwwLjI0MiwwLjk0MiwwLjM4OSwxLjQ3NSwwLjQwN2MtMC44NzMtMC41ODUtMS40NDctMS41ODEtMS40NDctMi43MDljMC0wLjU5NywwLjE2LTEuMTU1LDAuNDQxLTEuNjM4YzEuNjA1LDEuOTcsNC4wMDMsMy4yNjQsNi43MDgsMy40Yy0wLjA1Ny0wLjIzOC0wLjA4NS0wLjQ4NS0wLjA4NS0wLjc0YzAtMS43OTcsMS40NTgtMy4yNTQsMy4yNTQtMy4yNTRjMC45MzcsMCwxLjc4MywwLjM5NSwyLjM3NSwxLjAyOGMwLjc0Mi0wLjE0NiwxLjQzOC0wLjQxNywyLjA2Ny0wLjc4OWMtMC4yNDIsMC43NTktMC43NTksMS4zOTYtMS40MzIsMS43OTljMC42NTgtMC4wNzksMS4yODYtMC4yNTMsMS44NjktMC41MTFDMjMuNTExLDEyLjUwNywyMi45NTksMTMuMDc5LDIyLjMyMiwxMy41MzlcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdFx0XHQ8L2E+XFxuXHRcdFx0XHRcdDwvbGk+XFxuXHRcdFx0XHRcdDxsaT5cXG5cdFx0XHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnR3aXR0ZXJVcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnR3aXR0ZXJVcmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcInR3aXR0ZXJVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xNi4wMDEsMC4xNjdjLTguNzQ1LDAtMTUuODM0LDcuMDktMTUuODM0LDE1LjgzNGMwLDguNzQ1LDcuMDg5LDE1LjgzNSwxNS44MzQsMTUuODM1YzguNzQ1LDAsMTUuODM0LTcuMDksMTUuODM0LTE1LjgzNUMzMS44MzYsNy4yNTcsMjQuNzQ2LDAuMTY3LDE2LjAwMSwwLjE2NyBNMTkuNDk4LDEzLjMybC0wLjE4NCwyLjM2OWgtMi40Mjd2OC4yMjloLTMuMDY4di04LjIyOWgtMS42MzhWMTMuMzJoMS42Mzh2LTEuNTkyYzAtMC43MDEsMC4wMTctMS43ODIsMC41MjctMi40NTNjMC41MzYtMC43MDksMS4yNzMtMS4xOTEsMi41NDEtMS4xOTFjMi4wNjYsMCwyLjkzNSwwLjI5NSwyLjkzNSwwLjI5NWwtMC40MSwyLjQyNWMwLDAtMC42ODItMC4xOTYtMS4zMTgtMC4xOTZjLTAuNjM3LDAtMS4yMDcsMC4yMjctMS4yMDcsMC44NjN2MS44NUgxOS40OTh6XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHRcdFx0PC9hPlxcblx0XHRcdFx0XHQ8L2xpPlxcblx0XHRcdFx0XHQ8bGk+XFxuXHRcdFx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbnN0YWdyYW1VcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluc3RhZ3JhbVVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaW5zdGFncmFtVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTkuNDEzLDEyLjYwMmwtMC4wMDktMi42ODZsMi42ODUtMC4wMDh2Mi42ODRMMTkuNDEzLDEyLjYwMnogTTE2LjAwNCwxOC43ODhjMS41MzYsMCwyLjc4Ny0xLjI1LDIuNzg3LTIuNzg3YzAtMC42MDUtMC4xOTYtMS4xNjYtMC41MjgtMS42MjRjLTAuNTA3LTAuNzAzLTEuMzI5LTEuMTYzLTIuMjU5LTEuMTYzYy0wLjkzMSwwLTEuNzUzLDAuNDYtMi4yNiwxLjE2M2MtMC4zMywwLjQ1OC0wLjUyNywxLjAxOS0wLjUyNywxLjYyNEMxMy4yMTcsMTcuNTM4LDE0LjQ2NywxOC43ODgsMTYuMDA0LDE4Ljc4OHogTTIwLjMzMywxNi4wMDFjMCwyLjM4Ny0xLjk0Miw0LjMzLTQuMzI5LDQuMzNjLTIuMzg4LDAtNC4zMjktMS45NDMtNC4zMjktNC4zM2MwLTAuNTc1LDAuMTE0LTEuMTIzLDAuMzE4LTEuNjI0SDkuNjI5djYuNDgxYzAsMC44MzYsMC42ODEsMS41MTgsMS41MTgsMS41MThoOS43MTRjMC44MzcsMCwxLjUxNy0wLjY4MiwxLjUxNy0xLjUxOHYtNi40ODFoLTIuMzYzQzIwLjIxNywxNC44NzgsMjAuMzMzLDE1LjQyNiwyMC4zMzMsMTYuMDAxeiBNMzEuODM2LDE2LjAwMWMwLDguNzQ0LTcuMDksMTUuODM1LTE1LjgzNSwxNS44MzVTMC4xNjcsMjQuNzQ1LDAuMTY3LDE2LjAwMWMwLTguNzQ1LDcuMDg5LTE1LjgzNCwxNS44MzQtMTUuODM0UzMxLjgzNiw3LjI1NiwzMS44MzYsMTYuMDAxeiBNMjMuOTIxLDExLjE0NGMwLTEuNjg4LTEuMzczLTMuMDYtMy4wNjItMy4wNmgtOS43MTNjLTEuNjg3LDAtMy4wNiwxLjM3MS0zLjA2LDMuMDZ2OS43MTRjMCwxLjY4OCwxLjM3MywzLjA2LDMuMDYsMy4wNmg5LjcxM2MxLjY4OCwwLDMuMDYyLTEuMzcyLDMuMDYyLTMuMDZWMTEuMTQ0elxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0XHRcdDwvYT5cXG5cdFx0XHRcdFx0PC9saT5cXG5cdFx0XHRcdDwvdWw+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2PlxcblxcblwiO1xufSxcIjJcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlciwgYWxpYXMxPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMyPVwiZnVuY3Rpb25cIiwgYWxpYXMzPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICByZXR1cm4gXCJcdFx0XHRcdFx0XHQ8bGkgaWQ9J1wiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pZCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImlkXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIic+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9J1wiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy51cmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwidXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIic+XCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm5hbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcIm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9hPjwvbGk+XFxuXCI7XG59LFwiNFwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT10aGlzLmxhbWJkYSwgYWxpYXMyPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgYWxpYXMzPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXM0PVwiZnVuY3Rpb25cIjtcblxuICByZXR1cm4gXCJcXG5cdFx0PGhlYWRlciBpZD1cXFwiaGVhZGVyXFxcIj5cXG5cdFx0XHQ8YSBocmVmPVxcXCIjIS9sYW5kaW5nXFxcIiBjbGFzcz1cXFwibG9nb1xcXCI+XFxuXHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgaWQ9XFxcIkxheWVyXzFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMTM2LjAxMyA0OS4zNzVcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDEzNi4wMTMgNDkuMzc1XFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBmaWxsLXJ1bGU9XFxcImV2ZW5vZGRcXFwiIGNsaXAtcnVsZT1cXFwiZXZlbm9kZFxcXCIgZD1cXFwiTTgyLjE0MSw4LjAwMmgzLjM1NGMxLjIxMywwLDEuNzE3LDAuNDk5LDEuNzE3LDEuNzI1djcuMTM3YzAsMS4yMzEtMC41MDEsMS43MzYtMS43MDUsMS43MzZoLTMuMzY1VjguMDAyeiBNODIuNTIzLDI0LjYxN3Y4LjQyNmwtNy4wODctMC4zODRWMS45MjVIODcuMzljMy4yOTIsMCw1Ljk2LDIuNzA1LDUuOTYsNi4wNDR2MTAuNjA0YzAsMy4zMzgtMi42NjgsNi4wNDQtNS45Niw2LjA0NEg4Mi41MjN6IE0zMy40OTEsNy45MTNjLTEuMTMyLDAtMi4wNDgsMS4wNjUtMi4wNDgsMi4zNzl2MTEuMjU2aDQuNDA5VjEwLjI5MmMwLTEuMzE0LTAuOTE3LTIuMzc5LTIuMDQ3LTIuMzc5SDMzLjQ5MXogTTMyLjk5NCwwLjk3NGgxLjMwOGM0LjcwMiwwLDguNTE0LDMuODY2LDguNTE0LDguNjM0djI1LjIyNGwtNi45NjMsMS4yNzN2LTcuODQ4aC00LjQwOWwwLjAxMiw4Ljc4N2wtNi45NzQsMi4wMThWOS42MDhDMjQuNDgxLDQuODM5LDI4LjI5MiwwLjk3NCwzMi45OTQsMC45NzQgTTEyMS45MzMsNy45MjFoMy40MjNjMS4yMTUsMCwxLjcxOCwwLjQ5NywxLjcxOCwxLjcyNHY4LjE5NGMwLDEuMjMyLTAuNTAyLDEuNzM2LTEuNzA1LDEuNzM2aC0zLjQzNlY3LjkyMXogTTEzMy43MTgsMzEuMDU1djE3LjQ4N2wtNi45MDYtMy4zNjhWMzEuNTkxYzAtNC45Mi00LjU4OC01LjA4LTQuNTg4LTUuMDh2MTYuNzc0bC02Ljk4My0yLjkxNFYxLjkyNWgxMi4yMzFjMy4yOTEsMCw1Ljk1OSwyLjcwNSw1Ljk1OSw2LjA0NHYxMS4wNzdjMCwyLjIwNy0xLjIxNyw0LjE1My0yLjk5MSw1LjExNUMxMzEuNzYxLDI0Ljg5NCwxMzMuNzE4LDI3LjA3NywxMzMuNzE4LDMxLjA1NSBNMTAuODA5LDAuODMzYy00LjcwMywwLTguNTE0LDMuODY2LTguNTE0LDguNjM0djI3LjkzNmMwLDQuNzY5LDQuMDE5LDguNjM0LDguNzIyLDguNjM0bDEuMzA2LTAuMDg1YzUuNjU1LTEuMDYzLDguMzA2LTQuNjM5LDguMzA2LTkuNDA3di04Ljk0aC02Ljk5NnY4LjczNmMwLDEuNDA5LTAuMDY0LDIuNjUtMS45OTQsMi45OTJjLTEuMjMxLDAuMjE5LTIuNDE3LTAuODE2LTIuNDE3LTIuMTMyVjEwLjE1MWMwLTEuMzE0LDAuOTE3LTIuMzgxLDIuMDQ3LTIuMzgxaDAuMzE1YzEuMTMsMCwyLjA0OCwxLjA2NywyLjA0OCwyLjM4MXY4LjQ2NGg2Ljk5NlY5LjQ2N2MwLTQuNzY4LTMuODEyLTguNjM0LTguNTE0LTguNjM0SDEwLjgwOSBNMTAzLjk1MywyMy4xNjJoNi45Nzd2LTYuNzQ0aC02Ljk3N1Y4LjQyM2w3LjY3Ni0wLjAwMlYxLjkyNEg5Ni43MnYzMy4yNzhjMCwwLDUuMjI1LDEuMTQxLDcuNTMyLDEuNjY2YzEuNTE3LDAuMzQ2LDcuNzUyLDIuMjUzLDcuNzUyLDIuMjUzdi03LjAxNWwtOC4wNTEtMS41MDhWMjMuMTYyeiBNNDYuODc5LDEuOTI3bDAuMDAzLDMyLjM1bDcuMTIzLTAuODk1VjE4Ljk4NWw1LjEyNiwxMC40MjZsNS4xMjYtMTAuNDg0bDAuMDAyLDEzLjY2NGw3LjAyMi0wLjA1NFYxLjg5NWgtNy41NDVMNTkuMTMsMTQuNkw1NC42NjEsMS45MjdINDYuODc5elxcXCIvPjwvc3ZnPlxcblx0XHRcdDwvYT5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJob21lLWJ0blxcXCI+PGEgaHJlZj1cXFwiIyEvbGFuZGluZ1xcXCI+XCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmhvbWVfdHh0IDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiPC9hPjwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImNhbXBlci1sYWJcXFwiPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY2FtcGVyX2xhYl91cmwgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5jYW1wZXJfbGFiIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiPC9hPjwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInNob3Atd3JhcHBlciBidG5cXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwic2hvcC10aXRsZVxcXCI+XCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLnNob3BfdGl0bGUgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCI8L2Rpdj5cXG5cdFx0XHRcdDx1bCBjbGFzcz1cXFwic3VibWVudS13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdFx0PGxpIGNsYXNzPVxcXCJzdWItMFxcXCI+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9J1wiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX21lbl91cmwgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCInPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX21lbiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2xpPlxcblx0XHRcdFx0XHQ8bGkgY2xhc3M9XFxcInN1Yi0xXFxcIj48YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj0nXCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLnNob3Bfd29tZW5fdXJsIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiJz5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuc2hvcF93b21lbiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2xpPlxcblx0XHRcdFx0PC91bD5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9oZWFkZXI+XFxuXHRcdDxmb290ZXIgaWQ9XFxcImZvb3RlclxcXCIgY2xhc3M9XFxcImJ0blxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwibGVnYWxcXFwiPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEubGVnYWxfdXJsIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEubGVnYWwgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCI8L2E+PC9kaXY+XFxuXHRcdFx0PGRpdiBpZD1cXFwic29jaWFsLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwic29jaWFsLXRpdGxlXFxcIj5TT0NJQUw8L2Rpdj5cXG5cdFx0XHRcdDx1bD5cXG5cdFx0XHRcdFx0PGxpPlxcblx0XHRcdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZmFjZWJvb2tVcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmZhY2Vib29rVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMyksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzNCA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJmYWNlYm9va1VybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE2LjAwMiwwLjE2N2MtOC43NDYsMC0xNS44MzUsNy4wOS0xNS44MzUsMTUuODM0YzAsOC43NDYsNy4wODksMTUuODM1LDE1LjgzNSwxNS44MzVjOC43NDUsMCwxNS44MzQtNy4wODksMTUuODM0LTE1LjgzNUMzMS44MzYsNy4yNTcsMjQuNzQ3LDAuMTY3LDE2LjAwMiwwLjE2NyBNMjIuMzIyLDEzLjUzOWMwLjAwNywwLjEzOCwwLjAwOSwwLjI3OSwwLjAwOSwwLjQyYzAsNC4zMDItMy4yNzIsOS4yNTktOS4yNTksOS4yNTljLTEuODM3LDAtMy41NDctMC41MzktNC45ODctMS40NjFjMC4yNTMsMC4wMzEsMC41MTQsMC4wNDQsMC43NzYsMC4wNDRjMS41MjUsMCwyLjkyOC0wLjUyLDQuMDQyLTEuMzk0Yy0xLjQyNC0wLjAyMy0yLjYyNS0wLjk2NS0zLjAzOS0yLjI1OGMwLjE5OCwwLjAzNywwLjQwMiwwLjA1OCwwLjYxMSwwLjA1OGMwLjI5OCwwLDAuNTg1LTAuMDM4LDAuODU4LTAuMTE1Yy0xLjQ4OS0wLjI5Ny0yLjYxMi0xLjYxMi0yLjYxMi0zLjE4OXYtMC4wNDFjMC40NCwwLjI0MiwwLjk0MiwwLjM4OSwxLjQ3NSwwLjQwN2MtMC44NzMtMC41ODUtMS40NDctMS41ODEtMS40NDctMi43MDljMC0wLjU5NywwLjE2LTEuMTU1LDAuNDQxLTEuNjM4YzEuNjA1LDEuOTcsNC4wMDMsMy4yNjQsNi43MDgsMy40Yy0wLjA1Ny0wLjIzOC0wLjA4NS0wLjQ4NS0wLjA4NS0wLjc0YzAtMS43OTcsMS40NTgtMy4yNTQsMy4yNTQtMy4yNTRjMC45MzcsMCwxLjc4MywwLjM5NSwyLjM3NSwxLjAyOGMwLjc0Mi0wLjE0NiwxLjQzOC0wLjQxNywyLjA2Ny0wLjc4OWMtMC4yNDIsMC43NTktMC43NTksMS4zOTYtMS40MzIsMS43OTljMC42NTgtMC4wNzksMS4yODYtMC4yNTMsMS44NjktMC41MTFDMjMuNTExLDEyLjUwNywyMi45NTksMTMuMDc5LDIyLjMyMiwxMy41MzlcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdFx0XHQ8L2E+XFxuXHRcdFx0XHRcdDwvbGk+XFxuXHRcdFx0XHRcdDxsaT5cXG5cdFx0XHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnR3aXR0ZXJVcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnR3aXR0ZXJVcmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMzKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXM0ID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcInR3aXR0ZXJVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xNi4wMDEsMC4xNjdjLTguNzQ1LDAtMTUuODM0LDcuMDktMTUuODM0LDE1LjgzNGMwLDguNzQ1LDcuMDg5LDE1LjgzNSwxNS44MzQsMTUuODM1YzguNzQ1LDAsMTUuODM0LTcuMDksMTUuODM0LTE1LjgzNUMzMS44MzYsNy4yNTcsMjQuNzQ2LDAuMTY3LDE2LjAwMSwwLjE2NyBNMTkuNDk4LDEzLjMybC0wLjE4NCwyLjM2OWgtMi40Mjd2OC4yMjloLTMuMDY4di04LjIyOWgtMS42MzhWMTMuMzJoMS42Mzh2LTEuNTkyYzAtMC43MDEsMC4wMTctMS43ODIsMC41MjctMi40NTNjMC41MzYtMC43MDksMS4yNzMtMS4xOTEsMi41NDEtMS4xOTFjMi4wNjYsMCwyLjkzNSwwLjI5NSwyLjkzNSwwLjI5NWwtMC40MSwyLjQyNWMwLDAtMC42ODItMC4xOTYtMS4zMTgtMC4xOTZjLTAuNjM3LDAtMS4yMDcsMC4yMjctMS4yMDcsMC44NjN2MS44NUgxOS40OTh6XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHRcdFx0PC9hPlxcblx0XHRcdFx0XHQ8L2xpPlxcblx0XHRcdFx0XHQ8bGk+XFxuXHRcdFx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbnN0YWdyYW1VcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluc3RhZ3JhbVVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaW5zdGFncmFtVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTkuNDEzLDEyLjYwMmwtMC4wMDktMi42ODZsMi42ODUtMC4wMDh2Mi42ODRMMTkuNDEzLDEyLjYwMnogTTE2LjAwNCwxOC43ODhjMS41MzYsMCwyLjc4Ny0xLjI1LDIuNzg3LTIuNzg3YzAtMC42MDUtMC4xOTYtMS4xNjYtMC41MjgtMS42MjRjLTAuNTA3LTAuNzAzLTEuMzI5LTEuMTYzLTIuMjU5LTEuMTYzYy0wLjkzMSwwLTEuNzUzLDAuNDYtMi4yNiwxLjE2M2MtMC4zMywwLjQ1OC0wLjUyNywxLjAxOS0wLjUyNywxLjYyNEMxMy4yMTcsMTcuNTM4LDE0LjQ2NywxOC43ODgsMTYuMDA0LDE4Ljc4OHogTTIwLjMzMywxNi4wMDFjMCwyLjM4Ny0xLjk0Miw0LjMzLTQuMzI5LDQuMzNjLTIuMzg4LDAtNC4zMjktMS45NDMtNC4zMjktNC4zM2MwLTAuNTc1LDAuMTE0LTEuMTIzLDAuMzE4LTEuNjI0SDkuNjI5djYuNDgxYzAsMC44MzYsMC42ODEsMS41MTgsMS41MTgsMS41MThoOS43MTRjMC44MzcsMCwxLjUxNy0wLjY4MiwxLjUxNy0xLjUxOHYtNi40ODFoLTIuMzYzQzIwLjIxNywxNC44NzgsMjAuMzMzLDE1LjQyNiwyMC4zMzMsMTYuMDAxeiBNMzEuODM2LDE2LjAwMWMwLDguNzQ0LTcuMDksMTUuODM1LTE1LjgzNSwxNS44MzVTMC4xNjcsMjQuNzQ1LDAuMTY3LDE2LjAwMWMwLTguNzQ1LDcuMDg5LTE1LjgzNCwxNS44MzQtMTUuODM0UzMxLjgzNiw3LjI1NiwzMS44MzYsMTYuMDAxeiBNMjMuOTIxLDExLjE0NGMwLTEuNjg4LTEuMzczLTMuMDYtMy4wNjItMy4wNmgtOS43MTNjLTEuNjg3LDAtMy4wNiwxLjM3MS0zLjA2LDMuMDZ2OS43MTRjMCwxLjY4OCwxLjM3MywzLjA2LDMuMDYsMy4wNmg5LjcxM2MxLjY4OCwwLDMuMDYyLTEuMzcyLDMuMDYyLTMuMDZWMTEuMTQ0elxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0XHRcdDwvYT5cXG5cdFx0XHRcdFx0PC9saT5cXG5cdFx0XHRcdDwvdWw+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZm9vdGVyPlxcblxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiPGRpdj5cXG5cXG5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pc01vYmlsZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMucHJvZ3JhbSg0LCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXG48L2Rpdj5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIjxkaXYgaWQ9J3BhZ2VzLWNvbnRhaW5lcic+XFxuXHQ8ZGl2IGlkPSdwYWdlLWEnPjwvZGl2Plxcblx0PGRpdiBpZD0ncGFnZS1iJz48L2Rpdj5cXG48L2Rpdj5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXFxuXCI7XG59LFwiM1wiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCJcdFx0PGRpdiBpZD1cXFwic2Nyb2xsYmFyLXZpZXdcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInJlbGF0aXZlXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInNjcm9sbC1ncmFiIGJ0blxcXCI+PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzY3JvbGwtYmcgYnRuXFxcIj48L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyLCBhbGlhczE9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczI9XCJmdW5jdGlvblwiLCBhbGlhczM9dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9J3BhZ2Utd3JhcHBlcic+XFxuXHRcXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pc01vYmlsZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXG5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImludGVyZmFjZSBhYnNvbHV0ZVxcXCI+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInNsaWRlc2hvdy10aXRsZVxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwicGxhbmV0LXRpdGxlXFxcIj48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwbGFuZXQtbmFtZVxcXCI+PC9kaXY+XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJjb21wYXNzZXMtdGV4dHMtd3JhcHBlclxcXCI+PC9kaXY+XFxuXHRcdFxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJidXktYnRuIGJ0blxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiZG90cy1yZWN0YW5nbGUtYnRuIGJ0blxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJidG4tdGl0bGVcXFwiPjwvZGl2Plxcblx0XHRcdFx0PHN2Zz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PC9zdmc+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwicHJvZHVjdC10aXRsZS13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtdGl0bGUgdGl0bGUtYVxcXCI+PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwcm9kdWN0LXRpdGxlIHRpdGxlLWJcXFwiPjwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwicHJvZHVjdC1jb250YWluZXJzLXdyYXBwZXJcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtY29udGFpbmVyIHByb2R1Y3QtY29udGFpbmVyLWFcXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwicG9zdGVyLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzcGlubmVyLWltZyBzcGlubmVyLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0XHRcdDxzdmcgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMDAgMzAwXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiPlxcblx0XHRcdFx0XHRcdFx0PHBhdGggZD1cXFwiTSAxNTAsMCBhIDE1MCwxNTAgMCAwLDEgMTA2LjA2NiwyNTYuMDY2IGwgLTM1LjM1NSwtMzUuMzU1IGEgLTEwMCwtMTAwIDAgMCwwIC03MC43MTEsLTE3MC43MTEgelxcXCIgZmlsbD1cXFwiIzc2ZjE5YVxcXCI+XFxuXHRcdFx0XHRcdFx0XHRcdDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9XFxcInRyYW5zZm9ybVxcXCIgYXR0cmlidXRlVHlwZT1cXFwiWE1MXFxcIiB0eXBlPVxcXCJyb3RhdGVcXFwiIGZyb209XFxcIjAgMTUwIDE1MFxcXCIgdG89XFxcIjM2MCAxNTAgMTUwXFxcIiBiZWdpbj1cXFwiMHNcXFwiIGR1cj1cXFwiMC41c1xcXCIgZmlsbD1cXFwiZnJlZXplXFxcIiByZXBlYXRDb3VudD1cXFwiaW5kZWZpbml0ZVxcXCI+PC9hbmltYXRlVHJhbnNmb3JtPlxcblx0XHRcdFx0XHRcdFx0PC9wYXRoPlxcblx0XHRcdFx0XHRcdDwvc3ZnPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0PGltZyBzcmM9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVyc1snZW1wdHktaW1hZ2UnXSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDBbJ2VtcHR5LWltYWdlJ10gOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImVtcHR5LWltYWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInZpZGVvLXdyYXBwZXIgYnRuXFxcIj5cXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwidmlkZW8tY29udGFpbmVyXFxcIj48L2Rpdj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtY29udGFpbmVyIHByb2R1Y3QtY29udGFpbmVyLWJcXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwicG9zdGVyLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzcGlubmVyLWltZyBzcGlubmVyLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0XHRcdDxzdmcgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMDAgMzAwXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiPlxcblx0XHRcdFx0XHRcdFx0PHBhdGggZD1cXFwiTSAxNTAsMCBhIDE1MCwxNTAgMCAwLDEgMTA2LjA2NiwyNTYuMDY2IGwgLTM1LjM1NSwtMzUuMzU1IGEgLTEwMCwtMTAwIDAgMCwwIC03MC43MTEsLTE3MC43MTEgelxcXCIgZmlsbD1cXFwiIzc2ZjE5YVxcXCI+XFxuXHRcdFx0XHRcdFx0XHRcdDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9XFxcInRyYW5zZm9ybVxcXCIgYXR0cmlidXRlVHlwZT1cXFwiWE1MXFxcIiB0eXBlPVxcXCJyb3RhdGVcXFwiIGZyb209XFxcIjAgMTUwIDE1MFxcXCIgdG89XFxcIjM2MCAxNTAgMTUwXFxcIiBiZWdpbj1cXFwiMHNcXFwiIGR1cj1cXFwiMC41c1xcXCIgZmlsbD1cXFwiZnJlZXplXFxcIiByZXBlYXRDb3VudD1cXFwiaW5kZWZpbml0ZVxcXCI+PC9hbmltYXRlVHJhbnNmb3JtPlxcblx0XHRcdFx0XHRcdFx0PC9wYXRoPlxcblx0XHRcdFx0XHRcdDwvc3ZnPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0PGltZyBzcmM9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVyc1snZW1wdHktaW1hZ2UnXSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDBbJ2VtcHR5LWltYWdlJ10gOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImVtcHR5LWltYWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInZpZGVvLXdyYXBwZXIgYnRuXFxcIj5cXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwidmlkZW8tY29udGFpbmVyXFxcIj48L2Rpdj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblxcblx0PGRpdiBjbGFzcz1cXFwiaW50ZXJmYWNlIGZpeGVkXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwicHJldmlvdXMtYnRuIGRvdHMtYXJyb3ctYnRuIGJ0blxcXCI+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdDwvc3ZnPlxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwibmV4dC1idG4gZG90cy1hcnJvdy1idG4gYnRuXFxcIj5cXG5cdFx0XHQ8c3ZnPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0PC9zdmc+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuPC9kaXY+XCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGNsYXNzPSdwYWdlLXdyYXBwZXInPlxcblx0PGRpdiBjbGFzcz1cXFwiY29tcGFzc2VzLXRleHRzLXdyYXBwZXJcXFwiPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJpbnRlcmZhY2VcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJnby1jYW1wYWlnbi1idG4gZG90cy1yZWN0YW5nbGUtYnRuIGJ0blxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiYnRuLXRpdGxlXFxcIj48L2Rpdj5cXG5cdFx0XHQ8c3ZnPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHQ8L3N2Zz5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCJcdFxcblx0XHQ8dWwgY2xhc3M9J3BsYW5ldHMtbWVudSc+XFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5tb2JpbGVTY29wZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiZWFjaFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMiwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlx0XHQ8L3VsPlxcblxcblwiO1xufSxcIjJcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlciwgYWxpYXMxPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMyPVwiZnVuY3Rpb25cIiwgYWxpYXMzPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICByZXR1cm4gXCJcdFx0XHRcdDxsaSBpZD0nXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmlkIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pZCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaWRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiJz5cXG5cdFx0XHRcdFx0PGEgaHJlZj0nXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJ1cmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiJz5cXG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbWctd3JhcHBlclxcXCI+XFxuXHRcdFx0XHRcdFx0XHQ8aW1nIHNyYz1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmltZ3NyYyB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW1nc3JjIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJpbWdzcmNcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBhbHQ9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pZCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImlkXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdDwvYT5cXG5cdFx0XHRcdDwvbGk+XFxuXCI7XG59LFwiNFwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCJcXG5cdFx0PGRpdiBjbGFzcz1cXFwic2xpZGVzaG93LXRpdGxlXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwbGFuZXQtdGl0bGVcXFwiPjwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInBsYW5ldC1uYW1lXFxcIj48L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcImludGVyZmFjZVxcXCI+XFxuXFxuXHRcdFx0PGRpdiBpZD1cXFwibGVmdFxcXCIgY2xhc3M9XFxcInByZXZpb3VzLWFyZWEgYXJlYS1idG5cXFwiPjwvZGl2Plxcblx0XHRcdDxkaXYgaWQ9XFxcInJpZ2h0XFxcIiBjbGFzcz1cXFwibmV4dC1hcmVhIGFyZWEtYnRuXFxcIj48L2Rpdj5cXG5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwcmV2aW91cy1idG4gZG90cy1hcnJvdy1idG5cXFwiPlxcblx0XHRcdFx0PHN2Zz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PC9zdmc+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwibmV4dC1idG4gZG90cy1hcnJvdy1idG5cXFwiPlxcblx0XHRcdFx0PHN2Zz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PC9zdmc+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2PlxcblxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pc01vYmlsZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMucHJvZ3JhbSg0LCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXG48L2Rpdj5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbiAgICBcdFxuY2xhc3MgR2xvYmFsRXZlbnRzIHtcblx0aW5pdCgpIHtcblx0XHQkKHdpbmRvdykub24oJ3Jlc2l6ZScsIHRoaXMucmVzaXplKVxuXHRcdCQod2luZG93KS5vbignbW91c2Vtb3ZlJywgdGhpcy5vbk1vdXNlTW92ZSlcblx0XHRBcHBTdG9yZS5Nb3VzZSA9IG5ldyBQSVhJLlBvaW50KClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0QXBwQWN0aW9ucy53aW5kb3dSZXNpemUod2luZG93LmlubmVyV2lkdGgsIHdpbmRvdy5pbm5lckhlaWdodClcblx0fVxuXHRvbk1vdXNlTW92ZShlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0QXBwU3RvcmUuTW91c2UueCA9IGUucGFnZVhcblx0XHRBcHBTdG9yZS5Nb3VzZS55ID0gZS5wYWdlWVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEdsb2JhbEV2ZW50c1xuIiwiaW1wb3J0IG9wIGZyb20gJ29iamVjdHBvb2wnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgU3ByaW5nR2FyZGVuIGZyb20gJ1NwcmluZ0dhcmRlbidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9vbCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG5cdFx0dmFyIHB4Q29udGFpbmVyTnVtID0gMjAgKyAocGxhbmV0cy5sZW5ndGggKiAxKVxuXHRcdHZhciBncmFwaGljc051bSA9IChwbGFuZXRzLmxlbmd0aCAqIDMpIC0gMlxuXHRcdHZhciBzcHJpdGVzTnVtID0gcGxhbmV0cy5sZW5ndGhcblx0XHR2YXIgc3ByaW5nR2FyZGVuc051bSA9IDEwXG5cblx0XHR0aGlzLnRpbWVsaW5lcyA9IG9wLmdlbmVyYXRlKFRpbWVsaW5lTWF4LCB7IGNvdW50OiAyMCB9KVxuXHRcdHRoaXMucHhDb250YWluZXJzID0gb3AuZ2VuZXJhdGUoUElYSS5Db250YWluZXIsIHsgY291bnQ6IHB4Q29udGFpbmVyTnVtIH0pXG5cdFx0dGhpcy5ncmFwaGljcyA9IG9wLmdlbmVyYXRlKFBJWEkuR3JhcGhpY3MsIHsgY291bnQ6IGdyYXBoaWNzTnVtIH0pXG5cdFx0dGhpcy5zcHJpdGVzID0gb3AuZ2VuZXJhdGUoUElYSS5TcHJpdGUsIHsgY291bnQ6IHNwcml0ZXNOdW0gfSlcblx0XHR0aGlzLnNwcmluZ0dhcmRlbnMgPSBvcC5nZW5lcmF0ZShTcHJpbmdHYXJkZW4sIHsgY291bnQ6IHNwcmluZ0dhcmRlbnNOdW0gfSlcblx0fVxuXHRnZXRUaW1lbGluZSgpIHtcblx0XHR2YXIgdGwgPSB0aGlzLnRpbWVsaW5lcy5nZXQoKVxuXHRcdHRsLmtpbGwoKVxuXHRcdHRsLmNsZWFyKClcblx0XHRyZXR1cm4gdGxcblx0fVxuXHRyZWxlYXNlVGltZWxpbmUoaXRlbSkge1xuXHRcdGl0ZW0ua2lsbCgpXG5cdFx0aXRlbS5jbGVhcigpXG5cdFx0dGhpcy50aW1lbGluZXMucmVsZWFzZShpdGVtKVxuXHR9XG5cdGdldENvbnRhaW5lcigpIHtcblx0XHR2YXIgY29udGFpbmVyID0gdGhpcy5weENvbnRhaW5lcnMuZ2V0KClcblx0XHQvLyBjb25zb2xlLmxvZygnZ2V0ID4+Pj4+Pj4+Pj4+Pj4+PicsIGNvbnRhaW5lcilcblx0XHRjb250YWluZXIuc2NhbGUueCA9IDFcblx0XHRjb250YWluZXIuc2NhbGUueSA9IDFcblx0XHRjb250YWluZXIucG9zaXRpb24ueCA9IDBcblx0XHRjb250YWluZXIucG9zaXRpb24ueSA9IDBcblx0XHRjb250YWluZXIuc2tldy54ID0gMFxuXHRcdGNvbnRhaW5lci5za2V3LnkgPSAwXG5cdFx0Y29udGFpbmVyLnBpdm90LnggPSAwXG5cdFx0Y29udGFpbmVyLnBpdm90LnkgPSAwXG5cdFx0Y29udGFpbmVyLnJvdGF0aW9uID0gMFxuXHRcdGNvbnRhaW5lci5hbHBoYSA9IDFcblx0XHRyZXR1cm4gY29udGFpbmVyXG5cdH1cblx0cmVsZWFzZUNvbnRhaW5lcihpdGVtKSB7XG5cdFx0Ly8gY29uc29sZS5sb2coJ3JlbGVhc2UgPDw8PDw8PDw8PDw8PDwnLCBpdGVtKVxuXHRcdHRoaXMucHhDb250YWluZXJzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRHcmFwaGljcygpIHtcblx0XHR2YXIgZyA9IHRoaXMuZ3JhcGhpY3MuZ2V0KClcblx0XHRnLmNsZWFyKClcblx0XHRnLnNjYWxlLnggPSAxXG5cdFx0Zy5zY2FsZS55ID0gMVxuXHRcdGcucG9zaXRpb24ueCA9IDBcblx0XHRnLnBvc2l0aW9uLnkgPSAwXG5cdFx0Zy5za2V3LnggPSAwXG5cdFx0Zy5za2V3LnkgPSAwXG5cdFx0Zy5waXZvdC54ID0gMFxuXHRcdGcucGl2b3QueSA9IDBcblx0XHRnLnJvdGF0aW9uID0gMFxuXHRcdHJldHVybiBnXG5cdH1cblx0cmVsZWFzZUdyYXBoaWNzKGl0ZW0pIHtcblx0XHR0aGlzLmdyYXBoaWNzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRTcHJpdGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3ByaXRlcy5nZXQoKVxuXHR9XG5cdHJlbGVhc2VTcHJpdGUoaXRlbSkge1xuXHRcdHRoaXMuc3ByaXRlcy5yZWxlYXNlKGl0ZW0pXG5cdH1cblx0Z2V0U3ByaW5nR2FyZGVuKCkge1xuXHRcdHJldHVybiB0aGlzLnNwcmluZ0dhcmRlbnMuZ2V0KClcblx0fVxuXHRyZWxlYXNlU3ByaW5nR2FyZGVuKGl0ZW0pIHtcblx0XHR0aGlzLnNwcmluZ0dhcmRlbnMucmVsZWFzZShpdGVtKVxuXHR9XG59XG4iLCJjbGFzcyBQcmVsb2FkZXIgIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5xdWV1ZSA9IG5ldyBjcmVhdGVqcy5Mb2FkUXVldWUodHJ1ZSlcblx0XHR0aGlzLnF1ZXVlLm9uKFwiY29tcGxldGVcIiwgdGhpcy5vbk1hbmlmZXN0TG9hZENvbXBsZXRlZCwgdGhpcylcblx0XHR0aGlzLmN1cnJlbnRMb2FkZWRDYWxsYmFjayA9IHVuZGVmaW5lZFxuXHR9XG5cdGxvYWQobWFuaWZlc3QsIG9uTG9hZGVkKSB7XG5cdFx0dGhpcy5jdXJyZW50TG9hZGVkQ2FsbGJhY2sgPSBvbkxvYWRlZFxuICAgICAgICB0aGlzLnF1ZXVlLmxvYWRNYW5pZmVzdChtYW5pZmVzdClcblx0fVxuXHRvbk1hbmlmZXN0TG9hZENvbXBsZXRlZCgpIHtcblx0XHR0aGlzLmN1cnJlbnRMb2FkZWRDYWxsYmFjaygpXG5cdH1cblx0Z2V0Q29udGVudEJ5SWQoaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5xdWV1ZS5nZXRSZXN1bHQoaWQpXG5cdH1cblx0Z2V0U3ZnKGlkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0Q29udGVudEJ5SWQoaWQrXCItc3ZnXCIpXG5cdH1cblx0Z2V0SW1hZ2VVUkwoaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5nZXRDb250ZW50QnlJZChpZCkuZ2V0QXR0cmlidXRlKFwic3JjXCIpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUHJlbG9hZGVyXG4iLCJpbXBvcnQgZGF0YSBmcm9tICdHbG9iYWxEYXRhJ1xuaW1wb3J0IGhhc2hlciBmcm9tICdoYXNoZXInXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IGNyb3Nzcm9hZHMgZnJvbSAnY3Jvc3Nyb2FkcydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuY2xhc3MgUm91dGVyIHtcblx0aW5pdCgpIHtcblx0XHR0aGlzLnJvdXRpbmcgPSBkYXRhLnJvdXRpbmdcblx0XHR0aGlzLmRlZmF1bHRSb3V0ZSA9IHRoaXMucm91dGluZ1snLyddXG5cdFx0dGhpcy5uZXdIYXNoRm91bmRlZCA9IGZhbHNlXG5cdFx0aGFzaGVyLm5ld0hhc2ggPSB1bmRlZmluZWRcblx0XHRoYXNoZXIub2xkSGFzaCA9IHVuZGVmaW5lZFxuXHRcdGhhc2hlci5wcmVwZW5kSGFzaCA9ICchJ1xuXHRcdGhhc2hlci5pbml0aWFsaXplZC5hZGQodGhpcy5fZGlkSGFzaGVyQ2hhbmdlLmJpbmQodGhpcykpXG5cdFx0aGFzaGVyLmNoYW5nZWQuYWRkKHRoaXMuX2RpZEhhc2hlckNoYW5nZS5iaW5kKHRoaXMpKVxuXHRcdHRoaXMuX3NldHVwQ3Jvc3Nyb2FkcygpXG5cdH1cblx0YmVnaW5Sb3V0aW5nKCkge1xuXHRcdGhhc2hlci5pbml0KClcblx0fVxuXHRfc2V0dXBDcm9zc3JvYWRzKCkge1xuXHRcdHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG5cdFx0dmFyIGJhc2ljU2VjdGlvbiA9IGNyb3Nzcm9hZHMuYWRkUm91dGUoJ3twYWdlfScsIHRoaXMuX29uRmlyc3REZWdyZWVVUkxIYW5kbGVyLmJpbmQodGhpcyksIDMpXG5cdFx0YmFzaWNTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgICAgIHBhZ2UgOiBbJ2xhbmRpbmcnXSAvL3ZhbGlkIHNlY3Rpb25zXG5cdCAgICB9XG5cdCAgICB2YXIgcGxhbmV0UHJvZHVjdFNlY3Rpb24gPSBjcm9zc3JvYWRzLmFkZFJvdXRlKCcvcGxhbmV0L3twbGFuZXRJZH0ve3Byb2R1Y3RJZH0nLCB0aGlzLl9vblBsYW5ldFByb2R1Y3RVUkxIYW5kbGVyLmJpbmQodGhpcyksIDIpXG5cdCAgICBwbGFuZXRQcm9kdWN0U2VjdGlvbi5ydWxlcyA9IHtcblx0ICAgIFx0cGxhbmV0SWQ6IHBsYW5ldHMsXG5cdCAgICBcdHByb2R1Y3RJZCA6IC9eWzAtNV0vXG5cdCAgICB9XG5cdCAgICB2YXIgcGxhbmV0U2VjdGlvbiA9IGNyb3Nzcm9hZHMuYWRkUm91dGUoJy9wbGFuZXQve3BsYW5ldElkfScsIHRoaXMuX29uUGxhbmV0VVJMSGFuZGxlci5iaW5kKHRoaXMpLCAyKVxuXHQgICAgcGxhbmV0U2VjdGlvbi5ydWxlcyA9IHtcblx0ICAgIFx0cGxhbmV0SWQ6IHBsYW5ldHNcblx0ICAgIH1cblx0fVxuXHRfb25GaXJzdERlZ3JlZVVSTEhhbmRsZXIocGFnZUlkKSB7XG5cdFx0dGhpcy5fYXNzaWduUm91dGUocGFnZUlkKVxuXHR9XG5cdF9vblBsYW5ldFByb2R1Y3RVUkxIYW5kbGVyKHBsYW5ldElkLCBwcm9kdWN0SWQpIHtcblx0XHR0aGlzLl9hc3NpZ25Sb3V0ZShwcm9kdWN0SWQpXG5cdH1cblx0X29uUGxhbmV0VVJMSGFuZGxlcihwbGFuZXRJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHBsYW5ldElkKVxuXHR9XG5cdF9vbkJsb2dQb3N0VVJMSGFuZGxlcihwb3N0SWQpIHtcblx0XHR0aGlzLl9hc3NpZ25Sb3V0ZShwb3N0SWQpXG5cdH1cblx0X29uRGVmYXVsdFVSTEhhbmRsZXIoKSB7XG5cdFx0dGhpcy5fc2VuZFRvRGVmYXVsdCgpXG5cdH1cblx0X2Fzc2lnblJvdXRlKGlkKSB7XG5cdFx0dmFyIGhhc2ggPSBoYXNoZXIuZ2V0SGFzaCgpXG5cdFx0dmFyIHBhcnRzID0gdGhpcy5fZ2V0VVJMUGFydHMoaGFzaClcblx0XHR0aGlzLl91cGRhdGVQYWdlUm91dGUoaGFzaCwgcGFydHMsIHBhcnRzWzBdLCBpZClcblx0XHR0aGlzLm5ld0hhc2hGb3VuZGVkID0gdHJ1ZVxuXHR9XG5cdF9nZXRVUkxQYXJ0cyh1cmwpIHtcblx0XHR2YXIgaGFzaCA9IHVybFxuXHRcdGhhc2ggPSBoYXNoLnN1YnN0cigxKVxuXHRcdHJldHVybiBoYXNoLnNwbGl0KCcvJylcblx0fVxuXHRfdXBkYXRlUGFnZVJvdXRlKGhhc2gsIHBhcnRzLCBwYXJlbnQsIHRhcmdldElkKSB7XG5cdFx0aGFzaGVyLm9sZEhhc2ggPSBoYXNoZXIubmV3SGFzaFxuXHRcdGhhc2hlci5uZXdIYXNoID0ge1xuXHRcdFx0aGFzaDogaGFzaCxcblx0XHRcdHBhcnRzOiBwYXJ0cyxcblx0XHRcdHBhcmVudDogcGFyZW50LFxuXHRcdFx0dGFyZ2V0SWQ6IHRhcmdldElkXG5cdFx0fVxuXHRcdEFwcEFjdGlvbnMucGFnZUhhc2hlckNoYW5nZWQoKVxuXHR9XG5cdF9kaWRIYXNoZXJDaGFuZ2UobmV3SGFzaCwgb2xkSGFzaCkge1xuXHRcdHRoaXMubmV3SGFzaEZvdW5kZWQgPSBmYWxzZVxuXHRcdGNyb3Nzcm9hZHMucGFyc2UobmV3SGFzaClcblx0XHRpZih0aGlzLm5ld0hhc2hGb3VuZGVkKSByZXR1cm5cblx0XHQvLyBJZiBVUkwgZG9uJ3QgbWF0Y2ggYSBwYXR0ZXJuLCBzZW5kIHRvIGRlZmF1bHRcblx0XHR0aGlzLl9vbkRlZmF1bHRVUkxIYW5kbGVyKClcblx0fVxuXHRfc2VuZFRvRGVmYXVsdCgpIHtcblx0XHRoYXNoZXIuc2V0SGFzaChBcHBTdG9yZS5kZWZhdWx0Um91dGUoKSlcblx0fVxuXHRzdGF0aWMgZ2V0QmFzZVVSTCgpIHtcblx0XHRyZXR1cm4gZG9jdW1lbnQuVVJMLnNwbGl0KFwiI1wiKVswXVxuXHR9XG5cdHN0YXRpYyBnZXRIYXNoKCkge1xuXHRcdHJldHVybiBoYXNoZXIuZ2V0SGFzaCgpXG5cdH1cblx0c3RhdGljIGdldFJvdXRlcygpIHtcblx0XHRyZXR1cm4gZGF0YS5yb3V0aW5nXG5cdH1cblx0c3RhdGljIGdldE5ld0hhc2goKSB7XG5cdFx0cmV0dXJuIGhhc2hlci5uZXdIYXNoXG5cdH1cblx0c3RhdGljIGdldE9sZEhhc2goKSB7XG5cdFx0cmV0dXJuIGhhc2hlci5vbGRIYXNoXG5cdH1cblx0c3RhdGljIHNldEhhc2goaGFzaCkge1xuXHRcdGhhc2hlci5zZXRIYXNoKGhhc2gpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUm91dGVyXG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcblxudmFyIFRyYW5zaXRpb25BbmltYXRpb25zID0ge1xuXG5cdC8vIEVYUEVSSUVOQ0UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQnZXhwZXJpZW5jZS1pbic6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0c3dpdGNoKHR5cGVzLm9sZFR5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR2YXIgZGlyZWN0aW9uID0gKEFwcFN0b3JlLmdldEV4cGVyaWVuY2VBbmltYXRpb25EaXJlY3Rpb24oKSA9PSBBcHBDb25zdGFudHMuTEVGVCkgPyAtMSA6IDFcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHg6d2luZG93VypkaXJlY3Rpb24sIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB4OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeDp3aW5kb3dXKmRpcmVjdGlvbiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHg6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuQ0FNUEFJR046XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHR9LFxuXHQnZXhwZXJpZW5jZS1vdXQnOiBmdW5jdGlvbihzY29wZSwgdGltZWxpbmUpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHRpbWVsaW5lLnRvKHdyYXBwZXIsIDEsIHsgb3BhY2l0eTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0pXG5cdFx0XG5cdFx0c3dpdGNoKHR5cGVzLm5ld1R5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR2YXIgZGlyZWN0aW9uID0gKEFwcFN0b3JlLmdldEV4cGVyaWVuY2VBbmltYXRpb25EaXJlY3Rpb24oKSA9PSBBcHBDb25zdGFudHMuTEVGVCkgPyAtMSA6IDFcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHg6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHg6LXdpbmRvd1cqZGlyZWN0aW9uLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHg6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHg6LXdpbmRvd1cqZGlyZWN0aW9uLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdH0sXG5cblx0Ly8gQ0FNUEFJR04gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQnY2FtcGFpZ24taW4nOiBmdW5jdGlvbihzY29wZSwgdGltZWxpbmUpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0c3dpdGNoKHR5cGVzLm9sZFR5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdH0sXG5cdCdjYW1wYWlnbi1vdXQnOiBmdW5jdGlvbihzY29wZSwgdGltZWxpbmUpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0c3dpdGNoKHR5cGVzLm5ld1R5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdH0sXG5cblx0Ly8gTEFORElORyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCdsYW5kaW5nLWluJzogZnVuY3Rpb24oc2NvcGUsIHRpbWVsaW5lKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHN3aXRjaCh0eXBlcy5vbGRUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxBTkRJTkc6XG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuQ0FNUEFJR046XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHR9LFxuXHQnbGFuZGluZy1vdXQnOiBmdW5jdGlvbihzY29wZSwgdGltZWxpbmUpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHN3aXRjaCh0eXBlcy5uZXdUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLnRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS50byh3cmFwcGVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuQ0FNUEFJR046XG5cdFx0XHRcdHRpbWVsaW5lLnRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS50byh3cmFwcGVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBUcmFuc2l0aW9uQW5pbWF0aW9uc1xuIiwiaW1wb3J0IEFwcERpc3BhdGNoZXIgZnJvbSAnQXBwRGlzcGF0Y2hlcidcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IHtFdmVudEVtaXR0ZXIyfSBmcm9tICdldmVudGVtaXR0ZXIyJ1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJ1xuaW1wb3J0IGRhdGEgZnJvbSAnR2xvYmFsRGF0YSdcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuXG5mdW5jdGlvbiBfZ2V0UGFnZUNvbnRlbnQoKSB7XG4gICAgdmFyIHNjb3BlID0gX2dldFBhZ2VJZCgpXG4gICAgdmFyIGxhbmdDb250ZW50ID0gX2dldENvbnRlbnRCeUxhbmcoQXBwU3RvcmUubGFuZygpKVxuICAgIHZhciBwYWdlQ29udGVudCA9IGxhbmdDb250ZW50W3Njb3BlXVxuICAgIHJldHVybiBwYWdlQ29udGVudFxufVxuZnVuY3Rpb24gX2dldFBhZ2VJZCgpIHtcbiAgICByZXR1cm4gX2dldENvbnRlbnRTY29wZSgpLmlkXG59XG5mdW5jdGlvbiBfZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpIHtcbiAgICB2YXIgbmV3SGFzaGVyID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgIHZhciBvbGRIYXNoZXIgPSBSb3V0ZXIuZ2V0T2xkSGFzaCgpXG4gICAgcmV0dXJuIHsgbmV3VHlwZTogX2dldFR5cGVPZlBhZ2UobmV3SGFzaGVyKSwgb2xkVHlwZTogX2dldFR5cGVPZlBhZ2Uob2xkSGFzaGVyKSB9XG59XG5mdW5jdGlvbiBfZ2V0VHlwZU9mUGFnZShoYXNoKSB7XG4gICAgdmFyIGggPSBoYXNoIHx8IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICBpZihoID09IHVuZGVmaW5lZCkgcmV0dXJuIEFwcENvbnN0YW50cy5OT05FXG4gICAgaWYoaC5wYXJ0cy5sZW5ndGggPT0gMykgcmV0dXJuIEFwcENvbnN0YW50cy5DQU1QQUlHTlxuICAgIGVsc2UgaWYoaC5wYXJ0cy5sZW5ndGggPT0gMikgcmV0dXJuIEFwcENvbnN0YW50cy5FWFBFUklFTkNFXG4gICAgZWxzZSByZXR1cm4gQXBwQ29uc3RhbnRzLkxBTkRJTkdcbn1cbmZ1bmN0aW9uIF9nZXRDb250ZW50U2NvcGUoKSB7XG4gICAgdmFyIGhhc2hPYmogPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG4gICAgdmFyIHJvdXRlU2NvcGU7XG4gICAgaWYoaGFzaE9iai5wYXJ0cy5sZW5ndGggPiAyKSB7XG4gICAgICAgIHZhciBwYXJlbnRQYXRoID0gaGFzaE9iai5oYXNoLnJlcGxhY2UoJy8nK2hhc2hPYmoudGFyZ2V0SWQsICcnKVxuICAgICAgICByb3V0ZVNjb3BlID0gQXBwU3RvcmUuZ2V0Um91dGVQYXRoU2NvcGVCeUlkKHBhcmVudFBhdGgpXG4gICAgfWVsc2V7XG4gICAgICAgIHJvdXRlU2NvcGUgPSBBcHBTdG9yZS5nZXRSb3V0ZVBhdGhTY29wZUJ5SWQoaGFzaE9iai5oYXNoKVxuICAgIH1cbiAgICByZXR1cm4gcm91dGVTY29wZVxufVxuZnVuY3Rpb24gX2dldFBhZ2VBc3NldHNUb0xvYWQoKSB7XG4gICAgdmFyIHNjb3BlID0gX2dldENvbnRlbnRTY29wZSgpXG4gICAgdmFyIGhhc2hPYmogPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG4gICAgdmFyIHRhcmdldElkO1xuICAgIHZhciB0eXBlID0gX2dldFR5cGVPZlBhZ2UoKVxuICAgIHRhcmdldElkID0gdHlwZS50b0xvd2VyQ2FzZSgpICsgJy1hc3NldHMnXG4gICAgdmFyIG1hbmlmZXN0ID0gX2FkZEJhc2VQYXRoc1RvVXJscyhzY29wZVt0YXJnZXRJZF0sIHNjb3BlLmlkLCB0YXJnZXRJZCwgdHlwZSlcbiAgICByZXR1cm4gbWFuaWZlc3Rcbn1cbmZ1bmN0aW9uIF9hZGRCYXNlUGF0aHNUb1VybHModXJscywgcGFnZUlkLCB0YXJnZXRJZCwgdHlwZSkge1xuICAgIHZhciBiYXNlUGF0aCA9IF9nZXRQYWdlQXNzZXRzQmFzZVBhdGhCeUlkKHBhZ2VJZCwgdGFyZ2V0SWQpXG4gICAgdmFyIG1hbmlmZXN0ID0gW11cbiAgICBpZih1cmxzID09IHVuZGVmaW5lZCB8fCB1cmxzLmxlbmd0aCA8IDEpIHJldHVybiBtYW5pZmVzdFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdXJscy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc3BsaXR0ZXIgPSB1cmxzW2ldLnNwbGl0KCcuJylcbiAgICAgICAgdmFyIGZpbGVOYW1lID0gc3BsaXR0ZXJbMF1cbiAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHNwbGl0dGVyWzFdXG4gICAgICAgIG1hbmlmZXN0W2ldID0ge1xuICAgICAgICAgICAgaWQ6IHBhZ2VJZCArICctJyArIHR5cGUudG9Mb3dlckNhc2UoKSArICctJyArIGZpbGVOYW1lLFxuICAgICAgICAgICAgc3JjOiBiYXNlUGF0aCArIGZpbGVOYW1lICsgJy4nICsgZXh0ZW5zaW9uXG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hbmlmZXN0XG59XG5mdW5jdGlvbiBfZ2V0UGFnZUFzc2V0c0Jhc2VQYXRoQnlJZChpZCwgYXNzZXRHcm91cElkKSB7XG4gICAgcmV0dXJuIEFwcFN0b3JlLmJhc2VNZWRpYVBhdGgoKSArICcvaW1hZ2UvcGxhbmV0cy8nICsgaWQgKyAnLycgKyBhc3NldEdyb3VwSWQgKyAnLydcbn1cbmZ1bmN0aW9uIF9nZXRNZW51Q29udGVudCgpIHtcbiAgICByZXR1cm4gZGF0YS5tZW51XG59XG5mdW5jdGlvbiBfZ2V0Q29udGVudEJ5TGFuZyhsYW5nKSB7XG4gICAgcmV0dXJuIGRhdGEubGFuZ1tsYW5nXVxufVxuZnVuY3Rpb24gX2dldEdlbmVyYWxJbmZvcygpIHtcbiAgICByZXR1cm4gZGF0YS5pbmZvcy5sYW5nW0FwcFN0b3JlLmxhbmcoKV1cbn1cbmZ1bmN0aW9uIF9nZXRBcHBEYXRhKCkge1xuICAgIHJldHVybiBkYXRhXG59XG5mdW5jdGlvbiBfZ2V0RGVmYXVsdFJvdXRlKCkge1xuICAgIHJldHVybiBkYXRhWydkZWZhdWx0LXJvdXRlJ11cbn1cbmZ1bmN0aW9uIF9nZXRHbG9iYWxDb250ZW50KCkge1xuICAgIHZhciBsYW5nQ29udGVudCA9IF9nZXRDb250ZW50QnlMYW5nKEFwcFN0b3JlLmxhbmcoKSlcbiAgICByZXR1cm4gbGFuZ0NvbnRlbnRbJ2dsb2JhbCddXG59XG5mdW5jdGlvbiBfd2luZG93V2lkdGhIZWlnaHQoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdzogd2luZG93LmlubmVyV2lkdGgsXG4gICAgICAgIGg6IHdpbmRvdy5pbm5lckhlaWdodFxuICAgIH1cbn1cbnZhciBBcHBTdG9yZSA9IGFzc2lnbih7fSwgRXZlbnRFbWl0dGVyMi5wcm90b3R5cGUsIHtcbiAgICBlbWl0Q2hhbmdlOiBmdW5jdGlvbih0eXBlLCBpdGVtKSB7XG4gICAgICAgIHRoaXMuZW1pdCh0eXBlLCBpdGVtKVxuICAgIH0sXG4gICAgcGFnZUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldFBhZ2VDb250ZW50KClcbiAgICB9LFxuICAgIG1lbnVDb250ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRNZW51Q29udGVudCgpXG4gICAgfSxcbiAgICBjb3VudHJpZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGF0YS5jb3VudHJpZXNcbiAgICB9LFxuICAgIGFwcERhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldEFwcERhdGEoKVxuICAgIH0sXG4gICAgbGFuZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBKU19sYW5nXG4gICAgfSxcbiAgICBkZWZhdWx0Um91dGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldERlZmF1bHRSb3V0ZSgpXG4gICAgfSxcbiAgICBnbG9iYWxDb250ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRHbG9iYWxDb250ZW50KClcbiAgICB9LFxuICAgIGdlbmVyYWxJbmZvczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmluZm9zXG4gICAgfSxcbiAgICBnZW5lcmFsSW5mb3NMYW5nU2NvcGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldEdlbmVyYWxJbmZvcygpXG4gICAgfSxcbiAgICBnZXRFbXB0eUltZ1VybDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5nZXRFbnZpcm9ubWVudCgpLnN0YXRpYyArICdpbWFnZS9lbXB0eS5wbmcnXG4gICAgfSxcbiAgICBtYWluSW1hZ2VVcmw6IGZ1bmN0aW9uKGlkLCByZXNwb25zaXZlQXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLmJhc2VNZWRpYVBhdGgoKSArICdpbWFnZS9wbGFuZXRzLycgKyBpZCArICcvbWFpbi0nICsgQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlV2lkdGgocmVzcG9uc2l2ZUFycmF5KSArICcuanBnJ1xuICAgIH0sXG4gICAgYmFzZU1lZGlhUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5nZXRFbnZpcm9ubWVudCgpLnN0YXRpY1xuICAgIH0sXG4gICAgZ2V0Um91dGVQYXRoU2NvcGVCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gZGF0YS5yb3V0aW5nW2lkXVxuICAgIH0sXG4gICAgZ2V0UGFnZUlkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRQYWdlSWQoKVxuICAgIH0sXG4gICAgZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG4gICAgfSxcbiAgICBnZXRUeXBlT2ZQYWdlOiBmdW5jdGlvbihoYXNoKSB7XG4gICAgICAgIHJldHVybiBfZ2V0VHlwZU9mUGFnZShoYXNoKVxuICAgIH0sXG4gICAgZ2V0RW52aXJvbm1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwQ29uc3RhbnRzLkVOVklST05NRU5UU1tFTlZdXG4gICAgfSxcbiAgICBnZXRMaW5lV2lkdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gMlxuICAgIH0sXG4gICAgcGFnZUFzc2V0c1RvTG9hZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0UGFnZUFzc2V0c1RvTG9hZCgpXG4gICAgfSxcbiAgICBnZXRFeHBlcmllbmNlQW5pbWF0aW9uRGlyZWN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG5ld0hhc2hlciA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICAgICAgdmFyIG9sZEhhc2hlciA9IFJvdXRlci5nZXRPbGRIYXNoKClcbiAgICAgICAgaWYob2xkSGFzaGVyID09IHVuZGVmaW5lZCkgcmV0dXJuIEFwcENvbnN0YW50cy5SSUdIVFxuICAgICAgICB2YXIgbmV3SWQgPSBuZXdIYXNoZXIudGFyZ2V0SWRcbiAgICAgICAgdmFyIG9sZElkID0gb2xkSGFzaGVyLnRhcmdldElkXG4gICAgICAgIHZhciBuZXdJbmRleCwgb2xkSW5kZXg7XG4gICAgICAgIHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBsYW5ldCA9IHBsYW5ldHNbaV1cbiAgICAgICAgICAgIGlmKHBsYW5ldCA9PSBuZXdJZCkgbmV3SW5kZXggPSBpXG4gICAgICAgICAgICBpZihwbGFuZXQgPT0gb2xkSWQpIG9sZEluZGV4ID0gaVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAobmV3SW5kZXggPiBvbGRJbmRleCkgPyBBcHBDb25zdGFudHMuUklHSFQgOiAgQXBwQ29uc3RhbnRzLkxFRlRcbiAgICB9LFxuICAgIHJlc3BvbnNpdmVJbWFnZVdpZHRoOiBmdW5jdGlvbihyZXNwb25zaXZlQXJyYXkpIHtcbiAgICAgICAgdmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuICAgICAgICByZXR1cm4gVXRpbHMuQ2xvc2VzdChyZXNwb25zaXZlQXJyYXksIHdpbmRvd1cpXG4gICAgfSxcbiAgICByZXNwb25zaXZlSW1hZ2VTaXplOiBmdW5jdGlvbihyZXNwb25zaXZlQXJyYXksIGJhc2VXaWR0aCwgYmFzZUhlaWdodCkge1xuICAgICAgICB2YXIgYmFzZVcgPSBiYXNlV2lkdGggfHwgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9XXG4gICAgICAgIHZhciBiYXNlSCA9IGJhc2VIZWlnaHQgfHwgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9IXG4gICAgICAgIHZhciByZXNwb25zaXZlV2lkdGggPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VXaWR0aChyZXNwb25zaXZlQXJyYXkpXG4gICAgICAgIHZhciBzY2FsZSA9IChyZXNwb25zaXZlV2lkdGggLyBiYXNlVykgKiAxXG4gICAgICAgIHZhciByZXNwb25zaXZlSGVpZ2h0ID0gYmFzZUggKiBzY2FsZVxuICAgICAgICByZXR1cm4gWyByZXNwb25zaXZlV2lkdGgsIHJlc3BvbnNpdmVIZWlnaHQgXVxuICAgIH0sXG4gICAgcmVzcG9uc2l2ZVBvc3RlckltYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlc3BvbnNpdmVXID0gQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlV2lkdGgoQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpXG4gICAgICAgIHN3aXRjaChyZXNwb25zaXZlVykge1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRVswXTogcmV0dXJuIFwiTFwiXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFWzFdOiByZXR1cm4gXCJNXCJcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0VbMl06IHJldHVybiBcIlNcIlxuICAgICAgICB9XG4gICAgfSxcbiAgICBwbGFuZXRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEucGxhbmV0c1xuICAgIH0sXG4gICAgZ2V0TmV4dFBsYW5ldDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcbiAgICAgICAgdmFyIG5leHRQbGFuZXRJZDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGxhbmV0ID0gcGxhbmV0c1tpXVxuICAgICAgICAgICAgaWYocGxhbmV0ID09IGlkKSB7XG4gICAgICAgICAgICAgICAgbmV4dFBsYW5ldElkID0gcGxhbmV0c1tpKzFdIFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gKG5leHRQbGFuZXRJZCA9PSB1bmRlZmluZWQpID8gcGxhbmV0c1swXSA6IG5leHRQbGFuZXRJZFxuICAgIH0sXG4gICAgZ2V0UHJldmlvdXNQbGFuZXQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG4gICAgICAgIHZhciBwcmV2aW91c1BsYW5ldElkO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwbGFuZXQgPSBwbGFuZXRzW2ldXG4gICAgICAgICAgICBpZihwbGFuZXQgPT0gaWQpIHtcbiAgICAgICAgICAgICAgICBwcmV2aW91c1BsYW5ldElkID0gcGxhbmV0c1tpLTFdIFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gKHByZXZpb3VzUGxhbmV0SWQgPT0gdW5kZWZpbmVkKSA/IHBsYW5ldHNbcGxhbmV0cy5sZW5ndGgtMV0gOiBwcmV2aW91c1BsYW5ldElkXG4gICAgfSxcbiAgICBlbGVtZW50c09mTmF0dXJlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuZWxlbWVudHNcbiAgICB9LFxuICAgIGFsbEdlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmdlbmRlclxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGFbJ3Byb2R1Y3RzLWRhdGEnXVxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhQnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGEoKVxuICAgICAgICByZXR1cm4gZGF0YVtpZF1cbiAgICB9LFxuICAgIHBhbGV0dGVDb2xvcnNCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gZGF0YVsnY29sb3JzJ11baWRdXG4gICAgfSxcbiAgICBnZXRTcGVjaWZpY1Byb2R1Y3RCeUlkOiBmdW5jdGlvbihwbGFuZXRJZCwgcHJvZHVjdElkKSB7XG4gICAgICAgIHZhciBwbGFuZXRQcm9kdWN0cyA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQocGxhbmV0SWQpXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0UHJvZHVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKHByb2R1Y3RJZCA9PSBwbGFuZXRQcm9kdWN0c1tpXS5pZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwbGFuZXRQcm9kdWN0c1tpXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBXaW5kb3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX3dpbmRvd1dpZHRoSGVpZ2h0KClcbiAgICB9LFxuICAgIGFkZFBYQ2hpbGQ6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgQXBwU3RvcmUuUFhDb250YWluZXIuYWRkKGl0ZW0uY2hpbGQpXG4gICAgfSxcbiAgICByZW1vdmVQWENoaWxkOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIEFwcFN0b3JlLlBYQ29udGFpbmVyLnJlbW92ZShpdGVtLmNoaWxkKVxuICAgIH0sXG4gICAgZ2V0VGltZWxpbmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5nZXRUaW1lbGluZSgpXG4gICAgfSxcbiAgICByZWxlYXNlVGltZWxpbmU6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVRpbWVsaW5lKGl0ZW0pXG4gICAgfSxcbiAgICBnZXRDb250YWluZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5nZXRDb250YWluZXIoKVxuICAgIH0sXG4gICAgcmVsZWFzZUNvbnRhaW5lcjogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlQ29udGFpbmVyKGl0ZW0pXG4gICAgfSxcbiAgICBnZXRHcmFwaGljczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldEdyYXBoaWNzKClcbiAgICB9LFxuICAgIHJlbGVhc2VHcmFwaGljczogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlR3JhcGhpY3MoaXRlbSlcbiAgICB9LFxuICAgIGdldFNwcml0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldFNwcml0ZSgpXG4gICAgfSxcbiAgICByZWxlYXNlU3ByaXRlOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VTcHJpdGUoaXRlbSlcbiAgICB9LFxuICAgIGdldFNwcmluZ0dhcmRlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldFNwcmluZ0dhcmRlbigpXG4gICAgfSxcbiAgICByZWxlYXNlU3ByaW5nR2FyZGVuOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VTcHJpbmdHYXJkZW4oaXRlbSlcbiAgICB9LFxuICAgIERldGVjdG9yOiB7XG4gICAgICAgIGlzTW9iaWxlOiB1bmRlZmluZWRcbiAgICB9LFxuICAgIFBvb2w6IHVuZGVmaW5lZCxcbiAgICBQcmVsb2FkZXI6IHVuZGVmaW5lZCxcbiAgICBNb3VzZTogdW5kZWZpbmVkLFxuICAgIFBYQ29udGFpbmVyOiB1bmRlZmluZWQsXG4gICAgT3JpZW50YXRpb246IEFwcENvbnN0YW50cy5MQU5EU0NBUEUsXG4gICAgZGlzcGF0Y2hlckluZGV4OiBBcHBEaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpe1xuICAgICAgICB2YXIgYWN0aW9uID0gcGF5bG9hZC5hY3Rpb25cbiAgICAgICAgc3dpdGNoKGFjdGlvbi5hY3Rpb25UeXBlKSB7XG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VEOlxuXG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGNhdGNoIHRoZSBpbnRlcm5hbCBoYXNoIGNoYW5nZSBmb3IgdGhlIDMgcGFydHMgcGFnZXMgZXguIC9wbGFuZXQvd29vZC8wXG4gICAgICAgICAgICAgICAgdmFyIG5ld0hhc2hlciA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICAgICAgICAgICAgICB2YXIgb2xkSGFzaGVyID0gUm91dGVyLmdldE9sZEhhc2goKVxuICAgICAgICAgICAgICAgIHZhciBhY3Rpb25UeXBlID0gQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRURcbiAgICAgICAgICAgICAgICBpZihvbGRIYXNoZXIgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmKG5ld0hhc2hlci5wYXJ0cy5sZW5ndGggPT0gMyAmJiBvbGRIYXNoZXIucGFydHMubGVuZ3RoID09IDMgJiYgbmV3SGFzaGVyLnBhcnRzWzFdID09IG9sZEhhc2hlci5wYXJ0c1sxXSkge1xuICAgICAgICAgICAgICAgICAgICBpZihuZXdIYXNoZXIucGFydHMubGVuZ3RoID09IDMgJiYgb2xkSGFzaGVyLnBhcnRzLmxlbmd0aCA9PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25UeXBlID0gQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFOlxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy53ID0gYWN0aW9uLml0ZW0ud2luZG93V1xuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy5oID0gYWN0aW9uLml0ZW0ud2luZG93SFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLk9yaWVudGF0aW9uID0gKEFwcFN0b3JlLldpbmRvdy53ID4gQXBwU3RvcmUuV2luZG93LmgpID8gQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSA6IEFwcENvbnN0YW50cy5QT1JUUkFJVFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9JU19SRUFEWTpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5QWENvbnRhaW5lciA9IGFjdGlvbi5pdGVtXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb24uYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0FERF9DSElMRDpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5hZGRQWENoaWxkKGFjdGlvbi5pdGVtKVxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQ6XG4gICAgICAgICAgICAgICAgQXBwU3RvcmUucmVtb3ZlUFhDaGlsZChhY3Rpb24uaXRlbSlcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5lbWl0Q2hhbmdlKGFjdGlvbi5hY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH0pXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IEFwcFN0b3JlXG5cbiIsImltcG9ydCBpcyBmcm9tICdpcyc7XG5cbmZ1bmN0aW9uIGdldEFsbE1ldGhvZHMob2JqKSB7XG5cdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopXG5cdFx0LmZpbHRlcihrZXkgPT4gaXMuZm4ob2JqW2tleV0pKVxufVxuXG5mdW5jdGlvbiBhdXRvQmluZChvYmopIHtcblx0Ly8gY29uc29sZS5sb2coJ29iaiAtLS0tLScsIG9iailcbiAgXHRnZXRBbGxNZXRob2RzKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG5cdFx0LmZvckVhY2gobXRkID0+IHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKG10ZClcblx0XHRcdG9ialttdGRdID0gb2JqW210ZF0uYmluZChvYmopO1xuXHRcdH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGF1dG9CaW5kOyIsImltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5jbGFzcyBVdGlscyB7XG5cdHN0YXRpYyBOb3JtYWxpemVNb3VzZUNvb3JkcyhlLCBvYmpXcmFwcGVyKSB7XG5cdFx0dmFyIHBvc3ggPSAwO1xuXHRcdHZhciBwb3N5ID0gMDtcblx0XHRpZiAoIWUpIHZhciBlID0gd2luZG93LmV2ZW50O1xuXHRcdGlmIChlLnBhZ2VYIHx8IGUucGFnZVkpIFx0e1xuXHRcdFx0cG9zeCA9IGUucGFnZVg7XG5cdFx0XHRwb3N5ID0gZS5wYWdlWTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoZS5jbGllbnRYIHx8IGUuY2xpZW50WSkgXHR7XG5cdFx0XHRwb3N4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0XG5cdFx0XHRcdCsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XG5cdFx0XHRwb3N5ID0gZS5jbGllbnRZICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3Bcblx0XHRcdFx0KyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuXHRcdH1cblx0XHRvYmpXcmFwcGVyLnggPSBwb3N4XG5cdFx0b2JqV3JhcHBlci55ID0gcG9zeVxuXHRcdHJldHVybiBvYmpXcmFwcGVyXG5cdH1cblx0c3RhdGljIFJlc2l6ZVBvc2l0aW9uUHJvcG9ydGlvbmFsbHkod2luZG93Vywgd2luZG93SCwgY29udGVudFcsIGNvbnRlbnRILCBvcmllbnRhdGlvbikge1xuXHRcdHZhciBhc3BlY3RSYXRpbyA9IGNvbnRlbnRXIC8gY29udGVudEhcblxuXHRcdGlmKG9yaWVudGF0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmKG9yaWVudGF0aW9uID09IEFwcENvbnN0YW50cy5MQU5EU0NBUEUpIHtcblx0XHRcdFx0dmFyIHNjYWxlID0gKHdpbmRvd1cgLyBjb250ZW50VykgKiAxXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dmFyIHNjYWxlID0gKHdpbmRvd0ggLyBjb250ZW50SCkgKiAxXG5cdFx0XHR9XG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgc2NhbGUgPSAoKHdpbmRvd1cgLyB3aW5kb3dIKSA8IGFzcGVjdFJhdGlvKSA/ICh3aW5kb3dIIC8gY29udGVudEgpICogMSA6ICh3aW5kb3dXIC8gY29udGVudFcpICogMVxuXHRcdH1cblxuXHRcdHZhciBuZXdXID0gY29udGVudFcgKiBzY2FsZVxuXHRcdHZhciBuZXdIID0gY29udGVudEggKiBzY2FsZVxuXHRcdHZhciBjc3MgPSB7XG5cdFx0XHR3aWR0aDogbmV3Vyxcblx0XHRcdGhlaWdodDogbmV3SCxcblx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKG5ld1cgPj4gMSksXG5cdFx0XHR0b3A6ICh3aW5kb3dIID4+IDEpIC0gKG5ld0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcih3aW5kb3dXLCB3aW5kb3dILCBjb250ZW50VywgY29udGVudEgpIHtcblx0XHR2YXIgYXNwZWN0UmF0aW8gPSBjb250ZW50VyAvIGNvbnRlbnRIXG5cdFx0dmFyIHNjYWxlID0gKCh3aW5kb3dXIC8gd2luZG93SCkgPCBhc3BlY3RSYXRpbykgPyAod2luZG93SCAvIGNvbnRlbnRIKSAqIDEgOiAod2luZG93VyAvIGNvbnRlbnRXKSAqIDFcblx0XHR2YXIgbmV3VyA9IGNvbnRlbnRXICogc2NhbGVcblx0XHR2YXIgbmV3SCA9IGNvbnRlbnRIICogc2NhbGVcblx0XHR2YXIgY3NzID0ge1xuXHRcdFx0d2lkdGg6IG5ld1csXG5cdFx0XHRoZWlnaHQ6IG5ld0gsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSxcblx0XHRcdHRvcDogKHdpbmRvd0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSYW5kKG1pbiwgbWF4KSB7XG5cdFx0cmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pblxuXHR9XG5cdHN0YXRpYyBEZWdyZWVzVG9SYWRpYW5zKGRlZ3JlZXMpIHtcblx0XHRyZXR1cm4gZGVncmVlcyAqIChNYXRoLlBJIC8gMTgwKVxuXHR9XG4gICAgc3RhdGljIFJhZGlhbnNUb0RlZ3JlZXMocmFkaWFucykge1xuICAgICAgICByZXR1cm4gcmFkaWFucyAqICgxODAgLyBNYXRoLlBJKVxuICAgIH1cbiAgICBzdGF0aWMgTGltaXQodiwgbWluLCBtYXgpIHtcbiAgICBcdHJldHVybiAoTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHYpKSk7XG4gICAgfVxuXHRzdGF0aWMgQ2xvc2VzdChhcnJheSwgbnVtKSB7XG4gICAgICAgIHZhciBpPTA7XG5cdCAgICB2YXIgbWluRGlmZj0yMDAwO1xuXHQgICAgdmFyIGFucztcblx0ICAgIGZvcihpIGluIGFycmF5KXtcblx0XHRcdHZhciBtPU1hdGguYWJzKG51bS1hcnJheVtpXSk7XG5cdFx0XHRpZihtPG1pbkRpZmYpeyBcblx0XHRcdFx0bWluRGlmZj1tOyBcblx0XHRcdFx0YW5zPWFycmF5W2ldOyBcblx0XHRcdH1cblx0XHR9XG5cdCAgICByZXR1cm4gYW5zO1xuICAgIH1cbiAgICBzdGF0aWMgU3R5bGUoZGl2LCBzdHlsZSkge1xuICAgIFx0ZGl2LnN0eWxlLndlYmtpdFRyYW5zZm9ybSA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLm1velRyYW5zZm9ybSAgICA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLm1zVHJhbnNmb3JtICAgICA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLm9UcmFuc2Zvcm0gICAgICA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLnRyYW5zZm9ybSAgICAgICA9IHN0eWxlXG4gICAgfVxuICAgIHN0YXRpYyBUcmFuc2xhdGUoZGl2LCB4LCB5LCB6KSB7XG4gICAgXHRVdGlscy5TdHlsZShkaXYsICd0cmFuc2xhdGUzZCgnK3grJ3B4LCcreSsncHgsJyt6KydweCknKVxuICAgIH1cbiAgICBzdGF0aWMgVVVJRCgpIHtcblx0XHRmdW5jdGlvbiBzNCgpIHtcblx0XHRcdHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxuXHRcdFx0XHQudG9TdHJpbmcoMTYpXG5cdFx0XHRcdC5zdWJzdHJpbmcoMSk7XG5cdFx0fVxuXHRcdHJldHVybiBzNCgpICsgczQoKTtcblx0fVxuICAgIHN0YXRpYyBTcHJpbmdUbyhpdGVtLCB0b1gsIHRvWSwgaW5kZXgsIHNwcmluZywgZnJpY3Rpb24sIHNwcmluZ0xlbmd0aCkge1xuICAgIFx0dmFyIGR4ID0gdG9YIC0gaXRlbS54XG4gICAgXHR2YXIgZHkgPSB0b1kgLSBpdGVtLnlcblx0XHR2YXIgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeClcblx0XHR2YXIgdGFyZ2V0WCA9IHRvWCAtIE1hdGguY29zKGFuZ2xlKSAqIChzcHJpbmdMZW5ndGggKiBpbmRleClcblx0XHR2YXIgdGFyZ2V0WSA9IHRvWSAtIE1hdGguc2luKGFuZ2xlKSAqIChzcHJpbmdMZW5ndGggKiBpbmRleClcblx0XHRpdGVtLnZ4ICs9ICh0YXJnZXRYIC0gaXRlbS54KSAqIHNwcmluZ1xuXHRcdGl0ZW0udnkgKz0gKHRhcmdldFkgLSBpdGVtLnkpICogc3ByaW5nXG5cdFx0aXRlbS52eCAqPSBmcmljdGlvblxuXHRcdGl0ZW0udnkgKj0gZnJpY3Rpb25cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFV0aWxzXG4iLCJjbGFzcyBWZWMyIHtcblx0Y29uc3RydWN0b3IoeCwgeSkge1xuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0ZGlzdGFuY2VUbyh2KSB7XG5cdFx0cmV0dXJuIE1hdGguc3FydCggdGhpcy5kaXN0YW5jZVRvU3F1YXJlZCggdiApIClcblx0fVxuXHRkaXN0YW5jZVRvU3F1YXJlZCh2KSB7XG5cdFx0dmFyIGR4ID0gdGhpcy54IC0gdi54LCBkeSA9IHRoaXMueSAtIHYueTtcblx0XHRyZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmVjMlxuIiwiLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cbi8vIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcbiBcbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcbiBcbi8vIE1JVCBsaWNlbnNlXG4gXG4oZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB2YXIgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XG4gICAgZm9yKHZhciB4ID0gMDsgeCA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK3gpIHtcbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ10gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2ZW5kb3JzW3hdKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICB9XG4gXG4gICAgaWYgKCF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2ssIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciBjdXJyVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgdmFyIHRpbWVUb0NhbGwgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyVGltZSAtIGxhc3RUaW1lKSk7XG4gICAgICAgICAgICB2YXIgaWQgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soY3VyclRpbWUgKyB0aW1lVG9DYWxsKTsgfSwgXG4gICAgICAgICAgICAgIHRpbWVUb0NhbGwpO1xuICAgICAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH07XG4gXG4gICAgaWYgKCF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXG4gICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xuICAgICAgICB9O1xufSgpKTsiLCJpbXBvcnQgRmx1eCBmcm9tICdmbHV4J1xuaW1wb3J0IHtFdmVudEVtaXR0ZXIyfSBmcm9tICdldmVudGVtaXR0ZXIyJ1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJ1xuXG4vLyBBY3Rpb25zXG52YXIgUGFnZXJBY3Rpb25zID0ge1xuICAgIG9uUGFnZVJlYWR5OiBmdW5jdGlvbihoYXNoKSB7XG4gICAgICAgIFBhZ2VyRGlzcGF0Y2hlci5oYW5kbGVQYWdlckFjdGlvbih7XG4gICAgICAgIFx0dHlwZTogUGFnZXJDb25zdGFudHMuUEFHRV9JU19SRUFEWSxcbiAgICAgICAgXHRpdGVtOiBoYXNoXG4gICAgICAgIH0pICBcbiAgICB9LFxuICAgIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICBcdFBhZ2VyRGlzcGF0Y2hlci5oYW5kbGVQYWdlckFjdGlvbih7XG4gICAgICAgIFx0dHlwZTogUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURSxcbiAgICAgICAgXHRpdGVtOiB1bmRlZmluZWRcbiAgICAgICAgfSkgIFxuICAgIH0sXG4gICAgcGFnZVRyYW5zaXRpb25EaWRGaW5pc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICBQYWdlckRpc3BhdGNoZXIuaGFuZGxlUGFnZXJBY3Rpb24oe1xuICAgICAgICBcdHR5cGU6IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNILFxuICAgICAgICBcdGl0ZW06IHVuZGVmaW5lZFxuICAgICAgICB9KSAgXG4gICAgfVxufVxuXG4vLyBDb25zdGFudHNcbnZhciBQYWdlckNvbnN0YW50cyA9IHtcblx0UEFHRV9JU19SRUFEWTogJ1BBR0VfSVNfUkVBRFknLFxuXHRQQUdFX1RSQU5TSVRJT05fSU46ICdQQUdFX1RSQU5TSVRJT05fSU4nLFxuXHRQQUdFX1RSQU5TSVRJT05fT1VUOiAnUEFHRV9UUkFOU0lUSU9OX09VVCcsXG5cdFBBR0VfVFJBTlNJVElPTl9PVVRfQ09NUExFVEU6ICdQQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFJyxcblx0UEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTOiAnUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTJyxcblx0UEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0g6ICdQQUdFX1RSQU5TSVRJT05fRElEX0ZJTklTSCcsXG59XG5cbi8vIERpc3BhdGNoZXJcbnZhciBQYWdlckRpc3BhdGNoZXIgPSBhc3NpZ24obmV3IEZsdXguRGlzcGF0Y2hlcigpLCB7XG5cdGhhbmRsZVBhZ2VyQWN0aW9uOiBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHR0aGlzLmRpc3BhdGNoKGFjdGlvbilcblx0fVxufSlcblxuLy8gU3RvcmVcbnZhciBQYWdlclN0b3JlID0gYXNzaWduKHt9LCBFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSwge1xuICAgIGZpcnN0UGFnZVRyYW5zaXRpb246IHRydWUsXG4gICAgcGFnZVRyYW5zaXRpb25TdGF0ZTogdW5kZWZpbmVkLCBcbiAgICBkaXNwYXRjaGVySW5kZXg6IFBhZ2VyRGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKXtcbiAgICAgICAgdmFyIGFjdGlvblR5cGUgPSBwYXlsb2FkLnR5cGVcbiAgICAgICAgdmFyIGl0ZW0gPSBwYXlsb2FkLml0ZW1cbiAgICAgICAgc3dpdGNoKGFjdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgUGFnZXJDb25zdGFudHMuUEFHRV9JU19SRUFEWTpcbiAgICAgICAgICAgIFx0UGFnZXJTdG9yZS5wYWdlVHJhbnNpdGlvblN0YXRlID0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTXG4gICAgICAgICAgICBcdHZhciB0eXBlID0gUGFnZXJTdG9yZS5maXJzdFBhZ2VUcmFuc2l0aW9uID8gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOIDogUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVFxuICAgICAgICAgICAgXHRQYWdlclN0b3JlLmVtaXQodHlwZSlcbiAgICAgICAgICAgIFx0YnJlYWtcbiAgICAgICAgICAgIGNhc2UgUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURTpcbiAgICAgICAgICAgIFx0dmFyIHR5cGUgPSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU5cbiAgICAgICAgICAgIFx0UGFnZXJTdG9yZS5lbWl0KHR5cGUpXG4gICAgICAgICAgICBcdGJyZWFrXG4gICAgICAgICAgICBjYXNlIFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIOlxuICAgICAgICAgICAgXHRpZiAoUGFnZXJTdG9yZS5maXJzdFBhZ2VUcmFuc2l0aW9uKSBQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24gPSBmYWxzZVxuICAgICAgICAgICAgICAgIFBhZ2VyU3RvcmUucGFnZVRyYW5zaXRpb25TdGF0ZSA9IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIXG4gICAgICAgICAgICAgICAgUGFnZXJTdG9yZS5lbWl0KGFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH0pXG59KVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFBhZ2VyU3RvcmU6IFBhZ2VyU3RvcmUsXG5cdFBhZ2VyQWN0aW9uczogUGFnZXJBY3Rpb25zLFxuXHRQYWdlckNvbnN0YW50czogUGFnZXJDb25zdGFudHMsXG5cdFBhZ2VyRGlzcGF0Y2hlcjogUGFnZXJEaXNwYXRjaGVyXG59XG4iLCJpbXBvcnQgYXV0b2JpbmQgZnJvbSAnQXV0b2JpbmQnXG5pbXBvcnQgc2x1ZyBmcm9tICd0by1zbHVnLWNhc2UnXG5cbmNsYXNzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRhdXRvYmluZCh0aGlzKVxuXHRcdHRoaXMuZG9tSXNSZWFkeSA9IGZhbHNlXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuZG9tSXNSZWFkeSA9IHRydWVcblx0fVxuXHRyZW5kZXIoY2hpbGRJZCwgcGFyZW50SWQsIHRlbXBsYXRlLCBvYmplY3QpIHtcblx0XHR0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdFx0dGhpcy5jaGlsZElkID0gY2hpbGRJZFxuXHRcdHRoaXMucGFyZW50SWQgPSBwYXJlbnRJZFxuXHRcdHRoaXMucGFyZW50ID0gKHBhcmVudElkIGluc3RhbmNlb2YgalF1ZXJ5KSA/IHBhcmVudElkIDogJCh0aGlzLnBhcmVudElkKVxuXHRcdHRoaXMuY2hpbGQgPSAodGVtcGxhdGUgPT0gdW5kZWZpbmVkKSA/ICQoJzxkaXY+PC9kaXY+JykgOiAkKHRlbXBsYXRlKG9iamVjdCkpXG5cdFx0aWYodGhpcy5jaGlsZC5hdHRyKCdpZCcpID09IHVuZGVmaW5lZCkgdGhpcy5jaGlsZC5hdHRyKCdpZCcsIHNsdWcoY2hpbGRJZCkpXG5cdFx0dGhpcy5jaGlsZC5yZWFkeSh0aGlzLmNvbXBvbmVudERpZE1vdW50KVxuXHRcdHRoaXMucGFyZW50LmFwcGVuZCh0aGlzLmNoaWxkKVxuXHR9XG5cdHJlbW92ZSgpIHtcblx0XHR0aGlzLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmNoaWxkLnJlbW92ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZUNvbXBvbmVudFxuXG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IFRyYW5zaXRpb25BbmltYXRpb25zIGZyb20gJ1RyYW5zaXRpb25BbmltYXRpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCYXNlUGFnZSBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKClcblx0XHR0aGlzLnByb3BzID0gcHJvcHNcblx0XHR0aGlzLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlID0gdGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUgPSB0aGlzLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZS5iaW5kKHRoaXMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5jaGlsZC5hZGRDbGFzcyh0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKSlcblx0XHR0aGlzLnJlc2l6ZSgpXG5cdFx0dGhpcy5zZXR1cEFuaW1hdGlvbnMoKVxuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wcm9wcy5pc1JlYWR5KHRoaXMucHJvcHMuaGFzaCksIDApXG5cdH1cblx0c2V0dXBBbmltYXRpb25zKCkge1xuXHRcdHZhciBrZXlOYW1lID0gdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLWluJ1xuXHRcdC8vIHRoaXMudGxJbiA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLnRsSW4gPSBuZXcgVGltZWxpbmVNYXgoKVxuXHRcdHRoaXMudGxJbi5ldmVudENhbGxiYWNrKCdvbkNvbXBsZXRlJywgdGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSlcblx0XHRUcmFuc2l0aW9uQW5pbWF0aW9uc1trZXlOYW1lXSh0aGlzLCB0aGlzLnRsSW4pXG5cdFx0dGhpcy50bEluLnBhdXNlKDApXG5cdH1cblx0d2lsbFRyYW5zaXRpb25JbigpIHtcblx0XHR0aGlzLnRsSW4ucGxheSgwKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHZhciBrZXlOYW1lID0gdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLW91dCdcblx0XHQvLyB0aGlzLnRsT3V0ID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdHRoaXMudGxPdXQgPSBuZXcgVGltZWxpbmVNYXgoKVxuXHRcdHRoaXMudGxPdXQuZXZlbnRDYWxsYmFjaygnb25Db21wbGV0ZScsIHRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKVxuXHRcdFRyYW5zaXRpb25BbmltYXRpb25zW2tleU5hbWVdKHRoaXMsIHRoaXMudGxPdXQpXG5cdFx0dGhpcy50bE91dC5wbGF5KDApXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0Ly8gY29uc29sZS5sb2coJ2RpZFRyYW5zaXRpb25JbkNvbXBsZXRlJywgdGhpcy5pZCwgdGhpcy5wcm9wcy50eXBlKVxuXHRcdHRoaXMucmVsZWFzZVRpbWVsaW5lSW4oKVxuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wcm9wcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpLCAwKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlJywgdGhpcy5pZCwgdGhpcy5wcm9wcy50eXBlKVxuXHRcdHRoaXMucmVsZWFzZVRpbWVsaW5lT3V0KClcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucHJvcHMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCksIDApXG5cdH1cblx0cmVzaXplKCkge1xuXHR9XG5cdGZvcmNlVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLnRsSW4gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsSW4ucGF1c2UoMClcblx0XHR9XG5cdFx0aWYodGhpcy50bE91dCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxPdXQucGF1c2UoMClcblx0XHR9XG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHJlbGVhc2VUaW1lbGluZUluKCkge1xuXHRcdGlmKHRoaXMudGxJbiAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxJbi5jbGVhcigpXG5cdFx0XHQvLyBBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bEluKVxuXHRcdFx0dGhpcy50bEluID0gbnVsbFxuXHRcdH1cblx0fVxuXHRyZWxlYXNlVGltZWxpbmVPdXQoKSB7XG5cdFx0aWYodGhpcy50bE91dCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxPdXQuY2xlYXIoKVxuXHRcdFx0Ly8gQXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdXQpXG5cdFx0XHR0aGlzLnRsSU91dCA9IG51bGxcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5yZWxlYXNlVGltZWxpbmVJbigpXG5cdFx0dGhpcy5yZWxlYXNlVGltZWxpbmVPdXQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IHtQYWdlclN0b3JlLCBQYWdlckFjdGlvbnMsIFBhZ2VyQ29uc3RhbnRzLCBQYWdlckRpc3BhdGNoZXJ9IGZyb20gJ1BhZ2VyJ1xuaW1wb3J0IF9jYXBpdGFsaXplIGZyb20gJ2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICdQYWdlc0NvbnRhaW5lcl9oYnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmNsYXNzIEJhc2VQYWdlciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5jdXJyZW50UGFnZURpdlJlZiA9ICdwYWdlLWInXG5cdFx0dGhpcy53aWxsUGFnZVRyYW5zaXRpb25JbiA9IHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uSW4uYmluZCh0aGlzKVxuXHRcdHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0ID0gdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlID0gdGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSA9IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5jb21wb25lbnRzID0ge1xuXHRcdFx0J25ldy1jb21wb25lbnQnOiB1bmRlZmluZWQsXG5cdFx0XHQnb2xkLWNvbXBvbmVudCc6IHVuZGVmaW5lZFxuXHRcdH1cblx0fVxuXHRyZW5kZXIocGFyZW50KSB7XG5cdFx0c3VwZXIucmVuZGVyKCdCYXNlUGFnZXInLCBwYXJlbnQsIHRlbXBsYXRlLCB1bmRlZmluZWQpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdFBhZ2VyU3RvcmUub24oUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOLCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluKVxuXHRcdFBhZ2VyU3RvcmUub24oUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVCwgdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHR3aWxsUGFnZVRyYW5zaXRpb25JbigpIHtcblx0XHRpZihQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24pIHtcblx0XHRcdHRoaXMuc3dpdGNoUGFnZXNEaXZJbmRleCgpXG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXS53aWxsVHJhbnNpdGlvbkluKClcblx0XHR9XG5cdH1cblx0d2lsbFBhZ2VUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHRoaXMuY29tcG9uZW50c1snb2xkLWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uT3V0KClcblx0XHR0aGlzLnN3aXRjaFBhZ2VzRGl2SW5kZXgoKVxuXHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uSW4oKVxuXHR9XG5cdGRpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlJylcblx0XHRQYWdlckFjdGlvbnMucGFnZVRyYW5zaXRpb25EaWRGaW5pc2goKVxuXHRcdHRoaXMudW5tb3VudENvbXBvbmVudCgnb2xkLWNvbXBvbmVudCcpXG5cdH1cblx0ZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZScpXG5cdFx0UGFnZXJBY3Rpb25zLm9uVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRzd2l0Y2hQYWdlc0RpdkluZGV4KCkge1xuXHRcdHZhciBuZXdDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHRcdHZhciBvbGRDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXVxuXHRcdGlmKG5ld0NvbXBvbmVudCAhPSB1bmRlZmluZWQpIG5ld0NvbXBvbmVudC5jaGlsZC5jc3MoJ3otaW5kZXgnLCAyKVxuXHRcdGlmKG9sZENvbXBvbmVudCAhPSB1bmRlZmluZWQpIG9sZENvbXBvbmVudC5jaGlsZC5jc3MoJ3otaW5kZXgnLCAxKVxuXHR9XG5cdHNldHVwTmV3Q29tcG9uZW50KGhhc2gsIHRlbXBsYXRlKSB7XG5cdFx0dmFyIGlkID0gX2NhcGl0YWxpemUoaGFzaC5yZXBsYWNlKFwiL1wiLCBcIlwiKSlcblx0XHR0aGlzLm9sZFBhZ2VEaXZSZWYgPSB0aGlzLmN1cnJlbnRQYWdlRGl2UmVmXG5cdFx0dGhpcy5jdXJyZW50UGFnZURpdlJlZiA9ICh0aGlzLmN1cnJlbnRQYWdlRGl2UmVmID09PSAncGFnZS1hJykgPyAncGFnZS1iJyA6ICdwYWdlLWEnXG5cdFx0dmFyIGVsID0gdGhpcy5jaGlsZC5maW5kKCcjJyt0aGlzLmN1cnJlbnRQYWdlRGl2UmVmKVxuXHRcdHZhciBwcm9wcyA9IHtcblx0XHRcdGlkOiB0aGlzLmN1cnJlbnRQYWdlRGl2UmVmLFxuXHRcdFx0aXNSZWFkeTogdGhpcy5vblBhZ2VSZWFkeSxcblx0XHRcdHR5cGU6IEFwcFN0b3JlLmdldFR5cGVPZlBhZ2UoKSxcblx0XHRcdGhhc2g6IGhhc2gsXG5cdFx0XHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZTogdGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUsXG5cdFx0XHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGU6IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSxcblx0XHRcdGRhdGE6IEFwcFN0b3JlLnBhZ2VDb250ZW50KClcblx0XHR9XG5cdFx0dmFyIHBhZ2UgPSBuZXcgdGVtcGxhdGUudHlwZShwcm9wcylcblx0XHRwYWdlLmlkID0gQXBwU3RvcmUuZ2V0UGFnZUlkKClcblx0XHRwYWdlLnJlbmRlcihpZCwgZWwsIHRlbXBsYXRlLnBhcnRpYWwsIHByb3BzLmRhdGEpXG5cdFx0dGhpcy5jb21wb25lbnRzWydvbGQtY29tcG9uZW50J10gPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddID0gcGFnZVxuXHRcdGlmKFBhZ2VyU3RvcmUucGFnZVRyYW5zaXRpb25TdGF0ZSA9PT0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTKSB7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXS5mb3JjZVVubW91bnQoKVxuXHRcdH1cblx0fVxuXHRvblBhZ2VSZWFkeShoYXNoKSB7XG5cdFx0UGFnZXJBY3Rpb25zLm9uUGFnZVJlYWR5KGhhc2gpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVubW91bnRDb21wb25lbnQocmVmKSB7XG5cdFx0aWYodGhpcy5jb21wb25lbnRzW3JlZl0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5jb21wb25lbnRzW3JlZl0ucmVtb3ZlKClcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0UGFnZXJTdG9yZS5vZmYoUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOLCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluKVxuXHRcdFBhZ2VyU3RvcmUub2ZmKFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9PVVQsIHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0KVxuXHRcdHRoaXMudW5tb3VudENvbXBvbmVudCgnb2xkLWNvbXBvbmVudCcpXG5cdFx0dGhpcy51bm1vdW50Q29tcG9uZW50KCduZXctY29tcG9uZW50Jylcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZVBhZ2VyXG5cbiIsIm1vZHVsZS5leHBvcnRzPXtcblx0XCJpbmZvc1wiOiB7XG5cdFx0XCJ0d2l0dGVyX3VybFwiOiBcImh0dHA6Ly90d2l0dGVyLmNvbVwiLFxuXHRcdFwiZmFjZWJvb2tfdXJsXCI6IFwiaHR0cDovL2ZhY2Vib29rLmNvbVwiLFxuXHRcdFwiaW5zdGFncmFtX3VybFwiOiBcImh0dHA6Ly9pbnN0YWdyYW0uY29tXCIsXG5cdFx0XCJsYW5nXCI6IHtcblx0XHRcdFwiZW5cIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwiZnJcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwiZXNcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwiaXRcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwiZGVcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwicHRcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJzZWUgY2FtcGFpZ25cIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRcImNvdW50cmllc1wiOiBbXG5cdFx0e1xuXHRcdFx0XCJpZFwiOiBcIkdCUlwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZW5cIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIkZSQVwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZnJcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIkVTUFwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZXNcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIklUQVwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiaXRcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIkRFVVwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZGVcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIlBSVFwiLFxuXHRcdFx0XCJsYW5nXCI6IFwicHRcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH1cblx0XSxcblx0XCJwbGFuZXRzXCI6IFtcInNraVwiLCBcIm1ldGFsXCIsIFwiYWxhc2thXCIsIFwid29vZFwiLCBcImdlbXN0b25lXCJdLFxuXHRcImVsZW1lbnRzXCI6IFtcImZpcmVcIiwgXCJlYXJ0aFwiLCBcIm1ldGFsXCIsIFwid2F0ZXJcIiwgXCJ3b29kXCJdLFxuXHRcImdlbmRlclwiOiBbXCJtYWxlXCIsIFwiZmVtYWxlXCIsIFwiYW5pbWFsXCJdLFxuXG5cdFwiY29sb3JzXCI6IHtcblx0XHRcInNraVwiOiBbXCIweDYxODFhYVwiLCBcIjB4YzNkOWYxXCJdLFxuXHRcdFwibWV0YWxcIjogW1wiMHgwZDBkMGZcIiwgXCIweDU5NTk1OVwiXSxcblx0XHRcImFsYXNrYVwiOiBbXCIweGI3Y2FkYlwiLCBcIjB4NmY4Njk4XCJdLFxuXHRcdFwid29vZFwiOiBbXCIweDUwMjAxNlwiLCBcIjB4YzU4NTQ3XCJdLFxuXHRcdFwiZ2Vtc3RvbmVcIjogW1wiMHgzNjM4NjRcIiwgXCIweDQ3N2U5NFwiXVxuXHR9LFxuXG5cdFwicHJvZHVjdHMtZGF0YVwiOiB7XG5cdFx0XCJza2lcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkZJU1NcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4MzQzYTVjXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJtenM1eWMzaTV4XCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkZJU1NcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4Y2ZmMGZjXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCIwbDFkc3d5cjR4XCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAyLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGU3ZTMzY1wiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiY3dqMDRhM3o1NVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAzLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGRiMzA3NlwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiOGZicDBwYnd3OFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiA0LFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGY0ZWNkYVwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiOGZicDBwYnd3OFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMSwgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjV9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwibWV0YWxcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkJFTFVHQVwiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg4MTgxODFcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcImdzdW43YW16cThcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJuYW1lXCI6IFwiSEFSRFdPT0RcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4ZTgyYjE4XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJmZXZuc2Jzajg0XCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XSxcblx0XHRcImFsYXNrYVwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJuYW1lXCI6IFwiZ2VtbWFcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YjY5MzdkXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJsanJ0NjFpY2hhXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4yLCBcInlcIjowLjN9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwibmFtZVwiOiBcInBlbG90YXNcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4Yzk4ZTk0XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJuMGtzdXkwd3VhXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAyLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJFTkRVUk9cIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NjE2YTcxXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCI4eHBucHlucXVwXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMyxcblx0XHRcdFx0XCJuYW1lXCI6IFwiRU5EVVJPXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDBlMmU2MVwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwibTUwOXAwaXU0dVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjF9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwid29vZFwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJuYW1lXCI6IFwiVklOVEFSXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGQ3OWI3YVwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiZ2xkcnYyN2s3NlwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJCRUxVR0FcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4ODhhMmM3XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCIxbWV2cnh6N3Y2XCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XSxcblx0XHRcImdlbXN0b25lXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJFTkRVUk9cIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4Mjg5MmMxXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCI5cWJoaHBiODliXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4yLCBcInlcIjowLjN9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkVORFVST1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg2MmE4YmJcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcInBucjgxcmkyeG9cIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDIsXG5cdFx0XHRcdFwibmFtZVwiOiBcImdlbW1hXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDA5MGIzNlwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiY2tnd3pkM25wdVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuM30sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjR9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cblx0XCJsYW5nXCI6IHtcblx0XHRcImVuXCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXJcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXJcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiZnJcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBmclwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBmclwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJlc1wiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGVzXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGVzXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcIml0XCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgaXRcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgaXRcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiZGVcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBnZVwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBnZVwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJwdFwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIHB0XCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIHB0XCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdFwiZGVmYXVsdC1yb3V0ZVwiOiBcIi9sYW5kaW5nXCIsXG5cblx0XCJyb3V0aW5nXCI6IHtcblx0XHRcIi9sYW5kaW5nXCI6IHtcblx0XHRcdFwiaWRcIjogXCJsYW5kaW5nXCJcblx0XHR9LFxuXHRcdFwiL3BsYW5ldC9za2lcIjoge1xuXHRcdFx0XCJpZFwiOiBcInNraVwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L21ldGFsXCI6IHtcblx0XHRcdFwiaWRcIjogXCJtZXRhbFwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L2FsYXNrYVwiOiB7XG5cdFx0XHRcImlkXCI6IFwiYWxhc2thXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvd29vZFwiOiB7XG5cdFx0XHRcImlkXCI6IFwid29vZFwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L2dlbXN0b25lXCI6IHtcblx0XHRcdFwiaWRcIjogXCJnZW1zdG9uZVwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XVxuXHRcdH1cblx0fVxufSJdfQ==
