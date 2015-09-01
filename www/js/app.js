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

var _AppConstants = require('./constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

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

			// Init Preloader
			_AppStore2['default'].Preloader = new _Preloader2['default']();

			// Init Pool
			_AppStore2['default'].Pool = new _Pool2['default']();

			// Init router
			this.router = new _Router2['default']();
			this.router.init();

			this.$mainLoader = $('#main-loader');
			var $spinner = this.$mainLoader.find('.spinner-wrapper');
			var $logo = this.$mainLoader.find('.logo');
			var $background = this.$mainLoader.find('.background');
			this.tlIn = _AppStore2['default'].getTimeline();
			this.tlOut = _AppStore2['default'].getTimeline();

			this.tlIn.fromTo($spinner, 1, { opacity: 0 }, { opacity: 1, force3D: true, ease: Expo.easeOut }, 0);
			this.tlIn.fromTo($logo, 1, { opacity: 0 }, { opacity: 1, force3D: true, ease: Expo.easeOut }, 0);
			this.tlIn.play(0);

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
			_AppStore2['default'].Preloader.load(manifest, this.onMainAssetsLoaded);
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

},{"./AppTemplate":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/AppTemplate.js","./actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./services/GlobalEvents":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/GlobalEvents.js","./services/Pool":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Pool.js","./services/Preloader":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Preloader.js","./services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","mobile-detect":"mobile-detect"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/AppTemplate.js":[function(require,module,exports){
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
			scope.labUrl = generaInfos['lab_url'];
			scope.menShopUrl = 'http://www.camper.com/' + JS_lang + '_' + JS_country + '/men/shoes/new-collection';
			scope.womenShopUrl = 'http://www.camper.com/' + JS_lang + '_' + JS_country + '/women/shoes/new-collection';
			scope.legalUrl = 'http://www.camper.com/html/legal/privacy_' + JS_lang + '.html';
			scope.isMobile = _AppStore2['default'].Detector.isMobile;

			if (scope.isMobile) {
				scope.mobileMenu = [{ id: 'home', name: scope.infos['home_txt'], url: '#!/landing' }, { id: 'shop-men', name: scope.infos['shop_title'] + ' ' + scope.infos['shop_men'], url: scope.menShopUrl }, { id: 'shop-women', name: scope.infos['shop_title'] + ' ' + scope.infos['shop_women'], url: scope.womenShopUrl }, { id: 'lab', name: scope.infos['camper_lab'], url: scope.labUrl }, { id: 'legal', name: scope.infos['legal'], url: scope.legalUrl }];
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
			this.$legal = this.child.find('.legal');
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
			var legalCss = {
				left: _AppConstants2['default'].PADDING_AROUND,
				top: windowH - _AppConstants2['default'].PADDING_AROUND - this.$legal.height()
			};

			this.$socialWrapper.css(socialCss);
			this.$camperLab.css(camperLabCss);
			this.$shop.css(shopCss);
			this.$socialIconsContainer.css(socialIconsCss);
			this.$home.css(homeCss);
			this.$legal.css(legalCss);

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
				var imgMapUrl = _AppStore2['default'].mainImageMapUrl(id, _AppConstants2['default'].RESPONSIVE_IMAGE);
				var texture = PIXI.Texture.fromImage(imgUrl);
				// var displacementTexture = PIXI.Texture.fromImage(imgMapUrl)
				// s.displacementSprite = PIXI.Sprite.fromImage(imgMapUrl)
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

			this.maskEasing = (0, _bezierEasing2['default'])(.84, .13, 0, 1.03);
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
			// var scale = (window.devicePixelRatio == undefined) ? 1 : window.devicePixelRatio
			var scale = 1;
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

// import PlayBtn from 'PlayBtn'

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
						// playBtn: new PlayBtn(containerA.find('.play-btn')).componentDidMount(),
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
						// playBtn: new PlayBtn(containerB.find('.play-btn')).componentDidMount(),
						el: containerB.find('.video-wrapper'),
						container: containerB.find('.video-container')
					}
				}
			};

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

			this.buyBtn = new _TitleSwitcher2['default'](this.child.find('.buy-btn'), this.child.find('.dots-rectangle-btn'), this.infos['buy_title']);
			this.buyBtn.componentDidMount();

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
			var iframeStr = '<iframe src="//fast.wistia.net/embed/iframe/' + videoId + '" id="' + frameUUID + '" allowtransparency="false" frameborder="0" scrolling="yes" class="wistia_embed" name="wistia_embed" allowfullscreen mozallowfullscreen webkitallowfullscreen oallowfullscreen msallowfullscreen width="100%" height="100%"></iframe>';
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
				_this2.assignVideoToNewContainer();
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

			this.buyBtn.position((windowW >> 1) - (this.buyBtn.width >> 1), buyTopPos);

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
			this.downBtn.componentWillUnmount();
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return PlanetCampaignPage;
})(_BaseCampaignPage3['default']);

exports['default'] = PlanetCampaignPage;
module.exports = exports['default'];

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./ArrowBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ArrowBtn.js","./BaseCampaignPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BaseCampaignPage.js","./CompassesContainer":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassesContainer.js","./RectangleBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/RectangleBtn.js","./TitleSwitcher":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/TitleSwitcher.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlanetExperiencePage.js":[function(require,module,exports){
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

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./BasePlanetPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js","./CompassesContainer":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassesContainer.js","./RectangleBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/RectangleBtn.js","./experiences/AlaskaXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/AlaskaXP.js","./experiences/GemStoneXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/GemStoneXP.js","./experiences/MetalXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/MetalXP.js","./experiences/SkiXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/SkiXP.js","./experiences/WoodXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/WoodXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/RectangleBtn.js":[function(require,module,exports){
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
			this.config.spring = 0.09;
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
			this.rectangleBorder.componentWillUnmount();
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

  return "\n		<header id=\"header\">\n			<a href=\"#!/landing\" class=\"logo\">\n				<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 136.013 49.375\" enable-background=\"new 0 0 136.013 49.375\" xml:space=\"preserve\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M82.141,8.002h3.354c1.213,0,1.717,0.499,1.717,1.725v7.137c0,1.231-0.501,1.736-1.705,1.736h-3.365V8.002z M82.523,24.617v8.426l-7.087-0.384V1.925H87.39c3.292,0,5.96,2.705,5.96,6.044v10.604c0,3.338-2.668,6.044-5.96,6.044H82.523z M33.491,7.913c-1.132,0-2.048,1.065-2.048,2.379v11.256h4.409V10.292c0-1.314-0.917-2.379-2.047-2.379H33.491z M32.994,0.974h1.308c4.702,0,8.514,3.866,8.514,8.634v25.224l-6.963,1.273v-7.848h-4.409l0.012,8.787l-6.974,2.018V9.608C24.481,4.839,28.292,0.974,32.994,0.974 M121.933,7.921h3.423c1.215,0,1.718,0.497,1.718,1.724v8.194c0,1.232-0.502,1.736-1.705,1.736h-3.436V7.921z M133.718,31.055v17.487l-6.906-3.368V31.591c0-4.92-4.588-5.08-4.588-5.08v16.774l-6.983-2.914V1.925h12.231c3.291,0,5.959,2.705,5.959,6.044v11.077c0,2.207-1.217,4.153-2.991,5.115C131.761,24.894,133.718,27.077,133.718,31.055 M10.809,0.833c-4.703,0-8.514,3.866-8.514,8.634v27.936c0,4.769,4.019,8.634,8.722,8.634l1.306-0.085c5.655-1.063,8.306-4.639,8.306-9.407v-8.94h-6.996v8.736c0,1.409-0.064,2.65-1.994,2.992c-1.231,0.219-2.417-0.816-2.417-2.132V10.151c0-1.314,0.917-2.381,2.047-2.381h0.315c1.13,0,2.048,1.067,2.048,2.381v8.464h6.996V9.467c0-4.768-3.812-8.634-8.514-8.634H10.809 M103.953,23.162h6.977v-6.744h-6.977V8.423l7.676-0.002V1.924H96.72v33.278c0,0,5.225,1.141,7.532,1.666c1.517,0.346,7.752,2.253,7.752,2.253v-7.015l-8.051-1.508V23.162z M46.879,1.927l0.003,32.35l7.123-0.895V18.985l5.126,10.426l5.126-10.484l0.002,13.664l7.022-0.054V1.895h-7.545L59.13,14.6L54.661,1.927H46.879z\"/></svg>\n			</a>\n			<div class=\"home-btn\"><a href=\"#!/landing\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.home_txt : stack1), depth0))
    + "</a></div>\n			<div class=\"camper-lab\"><a target=\"_blank\" href=\""
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
    + "</a></li>\n				</ul>\n			</div>\n		</header>\n		<footer id=\"footer\" class=\"btn\">\n			<div class=\"legal\"><a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.legalUrl || (depth0 != null ? depth0.legalUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"legalUrl","hash":{},"data":data}) : helper)))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.legal : stack1), depth0))
    + "</a></div>\n			<div id=\"social-wrapper\">\n				<div class=\"social-title\">SOCIAL</div>\n				<ul>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.facebookUrl || (depth0 != null ? depth0.facebookUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"facebookUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.001,0.167c-8.745,0-15.834,7.09-15.834,15.834c0,8.745,7.089,15.835,15.834,15.835c8.745,0,15.834-7.09,15.834-15.835C31.836,7.257,24.746,0.167,16.001,0.167 M19.498,13.32l-0.184,2.369h-2.427v8.229h-3.068v-8.229h-1.638V13.32h1.638v-1.592c0-0.701,0.017-1.782,0.527-2.453c0.536-0.709,1.273-1.191,2.541-1.191c2.066,0,2.935,0.295,2.935,0.295l-0.41,2.425c0,0-0.682-0.196-1.318-0.196c-0.637,0-1.207,0.227-1.207,0.863v1.85H19.498z\"/></svg>\n						</a>\n					</li>\n					<li>\n						<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.twitterUrl || (depth0 != null ? depth0.twitterUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"twitterUrl","hash":{},"data":data}) : helper)))
    + "\">\n							<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.002,0.167c-8.746,0-15.835,7.09-15.835,15.834c0,8.746,7.089,15.835,15.835,15.835c8.745,0,15.834-7.089,15.834-15.835C31.836,7.257,24.747,0.167,16.002,0.167 M22.322,13.539c0.007,0.138,0.009,0.279,0.009,0.42c0,4.302-3.272,9.259-9.259,9.259c-1.837,0-3.547-0.539-4.987-1.461c0.253,0.031,0.514,0.044,0.776,0.044c1.525,0,2.928-0.52,4.042-1.394c-1.424-0.023-2.625-0.965-3.039-2.258c0.198,0.037,0.402,0.058,0.611,0.058c0.298,0,0.585-0.038,0.858-0.115c-1.489-0.297-2.612-1.612-2.612-3.189v-0.041c0.44,0.242,0.942,0.389,1.475,0.407c-0.873-0.585-1.447-1.581-1.447-2.709c0-0.597,0.16-1.155,0.441-1.638c1.605,1.97,4.003,3.264,6.708,3.4c-0.057-0.238-0.085-0.485-0.085-0.74c0-1.797,1.458-3.254,3.254-3.254c0.937,0,1.783,0.395,2.375,1.028c0.742-0.146,1.438-0.417,2.067-0.789c-0.242,0.759-0.759,1.396-1.432,1.799c0.658-0.079,1.286-0.253,1.869-0.511C23.511,12.507,22.959,13.079,22.322,13.539\"/></svg>\n						</a>\n					</li>\n					<li>\n						<a target=\"_blank\" href=\""
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
    + "\n\n\n	<div class=\"interface absolute\">\n		\n		<div class=\"down-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n\n		<div class=\"slideshow-title\">\n			<div class=\"planet-title\"></div>\n			<div class=\"planet-name\"></div>\n		</div>\n\n		<div class=\"compasses-texts-wrapper\"></div>\n		\n		<a href=\"#\" target=\"_blank\" class=\"buy-btn btn\">\n			<div class=\"dots-rectangle-btn btn\">\n				<div class=\"btn-title\"></div>\n				<svg>\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<circle class=\"knot\" />\n					<line class=\"line\"/>\n					<line class=\"line\"/>\n					<line class=\"line\" />\n					<line class=\"line\" />\n				</svg>\n			</div>\n			<div class=\"product-title-wrapper\">\n				<div class=\"product-title title-a\"></div>\n				<div class=\"product-title title-b\"></div>\n			</div>\n		</a>\n		<div class=\"product-containers-wrapper\">\n			<div class=\"product-container product-container-a\">\n				<div class=\"poster-wrapper\">\n					<div class=\"spinner-img spinner-wrapper\">\n						<svg width=\"100%\" viewBox=\"0 0 300 300\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n							<path d=\"M 150,0 a 150,150 0 0,1 106.066,256.066 l -35.355,-35.355 a -100,-100 0 0,0 -70.711,-170.711 z\" fill=\"#76f19a\">\n								<animateTransform attributeName=\"transform\" attributeType=\"XML\" type=\"rotate\" from=\"0 150 150\" to=\"360 150 150\" begin=\"0s\" dur=\"0.5s\" fill=\"freeze\" repeatCount=\"indefinite\"></animateTransform>\n							</path>\n						</svg>\n					</div>\n					<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n				</div>\n				<div class=\"video-wrapper btn\">\n					<div class=\"video-container btn\"></div>\n				</div>\n			</div>\n			<div class=\"product-container product-container-b\">\n				<div class=\"poster-wrapper\">\n					<div class=\"spinner-img spinner-wrapper\">\n						<svg width=\"100%\" viewBox=\"0 0 300 300\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n							<path d=\"M 150,0 a 150,150 0 0,1 106.066,256.066 l -35.355,-35.355 a -100,-100 0 0,0 -70.711,-170.711 z\" fill=\"#76f19a\">\n								<animateTransform attributeName=\"transform\" attributeType=\"XML\" type=\"rotate\" from=\"0 150 150\" to=\"360 150 150\" begin=\"0s\" dur=\"0.5s\" fill=\"freeze\" repeatCount=\"indefinite\"></animateTransform>\n							</path>\n						</svg>\n					</div>\n					<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n				</div>\n				<div class=\"video-wrapper btn\">\n					<div class=\"video-container btn\"></div>\n				</div>\n			</div>\n		</div>\n	</div>\n\n	<div class=\"interface fixed\">\n		<div class=\"previous-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"next-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n	</div>\n\n</div>";
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
			// console.log('get >>>>>>>>>>>>>>>')
			var tl = this.timelines.get();
			tl.kill();
			tl.clear();
			return tl;
		}
	}, {
		key: 'releaseTimeline',
		value: function releaseTimeline(item) {
			// console.log('release <<<<<<<<<<<<<<', item)
			item.kill();
			item.clear();
			this.timelines.release(item);
		}
	}, {
		key: 'getContainer',
		value: function getContainer() {
			var container = this.pxContainers.get();
			container.scale.x = 1;
			container.scale.y = 1;
			container.position.x = 0;
			container.position.y = 0;
			container.pivot.x = 0;
			container.pivot.y = 0;
			container.rotation = 0;
			container.alpha = 1;
			return container;
		}
	}, {
		key: 'releaseContainer',
		value: function releaseContainer(item) {
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
        var windowW = AppStore.Window.w == undefined ? window.innerWidth : AppStore.Window.w;
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
				"campaign_title": "See campaign",
				"legal": "Legal",
				"home_txt": "HOME"
			},
			"fr": {
				"camper_lab": "Camper Lab",
				"shop_title": "Acheter",
				"shop_men": "homme",
				"shop_women": "femme",
				"planet": "Planète",
				"buy_title": "Acheter",
				"campaign_title": "Voir la campagne",
				"legal": "Légal",
				"home_txt": "HOME"
			},
			"es": {
				"camper_lab": "Camper Lab",
				"shop_title": "Comprar",
				"shop_men": "hombre",
				"shop_women": "mujer",
				"planet": "Planeta",
				"buy_title": "Comprar",
				"campaign_title": "Ver campaña",
				"legal": "Información legal",
				"home_txt": "HOME"
			},
			"it": {
				"camper_lab": "Camper Lab",
				"shop_title": "Acquisti",
				"shop_men": "uomo",
				"shop_women": "donna",
				"planet": "Pianeta",
				"buy_title": "Acquista",
				"campaign_title": "Guarda la campagna",
				"legal": "Legale",
				"home_txt": "HOME"
			},
			"de": {
				"camper_lab": "Camper Lab",
				"shop_title": "Shop",
				"shop_men": "Herren",
				"shop_women": "Damen",
				"planet": "Planet",
				"buy_title": "Kaufen",
				"campaign_title": "Kampagne ansehen",
				"legal": "Impressum",
				"home_txt": "HOME"
			},
			"pt": {
				"camper_lab": "Camper Lab",
				"shop_title": "Compre",
				"shop_men": "homem",
				"shop_women": "mulher",
				"planet": "Planeta",
				"buy_title": "Comprar",
				"campaign_title": "Ver campanha",
				"legal": "Legal",
				"home_txt": "HOME"
			}
		}
	},

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
				"product-url": "/men/shoes/fiss/camper-fiss-K100021-002",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "FISS",
				"color": "0x343a5c",
				"video-id": "mzs5yc3i5x",
				"product-url": "/men/shoes/fiss/camper-fiss-K100021-001",
				"knots": [
					{"x":0.2, "y":0.5},
					{"x":0.0, "y":0.3},
					{"x":0.1, "y":0.7}
				]
			},{
				"id": 2,
				"name": "FISS",
				"color": "0xcff0fc",
				"video-id": "0l1dswyr4x",
				"product-url": "/men/shoes/fiss/camper-fiss-K300023-002",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			},{
				"id": 3,
				"name": "FISS",
				"color": "0xe7e33c",
				"video-id": "cwj04a3z55",
				"product-url": "/women/shoes/fiss/camper-fiss-K400029-003",
				"knots": [
					{"x":0.1, "y":-0.1},
					{"x":0.6, "y":-0.3},
					{"x":0.5, "y":-0.6}
				]
			},{
				"id": 4,
				"name": "FISS",
				"color": "0xdb3076",
				"video-id": "8fbp0pbww8",
				"product-url": "/women/shoes/fiss/camper-fiss-K400029-001",
				"knots": [
					{"x":-0.3, "y":-0.1},
					{"x":-0.6, "y":-0.4},
					{"x":-0.6, "y":-0.6}
				]
			},{
				"id": 5,
				"name": "FISS",
				"color": "0xdb3076",
				"video-id": "8fbp0pbww8",
				"product-url": "/women/shoes/fiss/camper-fiss-K400031-003",
				"knots": [
					{"x":0.0, "y":-0.8},
					{"x":0.2, "y":-0.6},
					{"x":-0.1, "y":-0.1}
				]
			},{
				"id": 6,
				"name": "FISS",
				"color": "0xf4ecda",
				"video-id": "8fbp0pbww8",
				"product-url": "/women/shoes/laika/camper-laika-K400035-001",
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
				"product-url": "/women/shoes/beluga/camper-beluga-K400014-001",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "BELUGA",
				"color": "0x818181",
				"video-id": "gsun7amzq8",
				"product-url": "/men/shoes/beluga/camper-beluga-K300008-002",
				"knots": [
					{"x":0.1, "y":-0.7},
					{"x":-0.1, "y":-0.1},
					{"x":0.4, "y":0}
				]
			},{
				"id": 2,
				"name": "HARDWOOD",
				"color": "0xe82b18",
				"video-id": "fevnsbsj84",
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
				"product-url": "/women/shoes/gemma/camper-gemma-K400033-002",
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "gemma",
				"color": "0xb6937d",
				"video-id": "ljrt61icha",
				"product-url": "/women/shoes/gemma/camper-gemma-K400033-002",
				"knots": [
					{"x":-0.2, "y":-0.3},
					{"x":0.1, "y":-0.4},
					{"x":0.3, "y":-0.1}
				]
			},{
				"id": 2,
				"name": "pelotas",
				"color": "0xc98e94",
				"video-id": "n0ksuy0wua",
				"product-url": "/women/shoes/pelotas/camper-pelotas-K200038-001",
				"knots": [
					{"x":0.3, "y":-0.6},
					{"x":0.6, "y":0.4},
					{"x":0.4, "y":0.7}
				]
			},{
				"id": 3,
				"name": "ENDURO",
				"color": "0x616a71",
				"video-id": "8xpnpynqup",
				"product-url": "/men/shoes/enduro/camper-enduro-K300020-002",
				"knots": [
					{"x":-0.3, "y":0.1},
					{"x":-0.6, "y":-0.1},
					{"x":-0.6, "y":-0.6}
				]
			},{
				"id": 4,
				"name": "ENDURO",
				"color": "0x0e2e61",
				"video-id": "m509p0iu4u",
				"product-url": "/women/shoes/enduro/camper-enduro-K400025-001",
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
				"video-id": "1mevrxz7v6",
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
				"video-id": "9qbhhpb89b",
				"product-url": "/men/shoes/enduro/camper-enduro-K300020-001",
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
				"product-url": "/women/shoes/enduro/camper-enduro-K400025-002",
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
				"product-url": "/women/shoes/gemma/camper-gemma-K200046-001",
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmx1eC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L2xpYi9EaXNwYXRjaGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvbGliL2ludmFyaWFudC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvYmFzZVRvU3RyaW5nLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9NYWluLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwVGVtcGxhdGUuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9hY3Rpb25zL0FwcEFjdGlvbnMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Fycm93QnRuLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9CYXNlQ2FtcGFpZ25QYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9CYXNlUGxhbmV0UGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzcy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzc1JpbmdzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Db21wYXNzZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Zyb250Q29udGFpbmVyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Lbm90LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9MYW5kaW5nU2xpZGVzaG93LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9QWENvbnRhaW5lci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1BsYW5ldENhbXBhaWduUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1JlY3RhbmdsZUJ0bi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvU2Nyb2xsQmFyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9TbWFsbENvbXBhc3MuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1NwcmluZ0dhcmRlbi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvVGl0bGVTd2l0Y2hlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvQWxhc2thWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL0Jhc2VYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvR2VtU3RvbmVYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvTWV0YWxYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvU2tpWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL1dvb2RYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvcGFnZXMvTGFuZGluZy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbnN0YW50cy9BcHBDb25zdGFudHMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9kaXNwYXRjaGVycy9BcHBEaXNwYXRjaGVyLmpzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9Gcm9udENvbnRhaW5lci5oYnMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL1BhZ2VzQ29udGFpbmVyLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGxhbmV0Q2FtcGFpZ25QYWdlLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuaGJzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9wYWdlcy9MYW5kaW5nLmhicyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL0dsb2JhbEV2ZW50cy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1Bvb2wuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9QcmVsb2FkZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9Sb3V0ZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9UcmFuc2l0aW9uQW5pbWF0aW9ucy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3N0b3Jlcy9BcHBTdG9yZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3V0aWxzL0F1dG9iaW5kLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvVXRpbHMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC91dGlscy9WZWMyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvcmFmLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9QYWdlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvcGFnZXIvY29tcG9uZW50cy9CYXNlQ29tcG9uZW50LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VQYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VQYWdlci5qcyIsInd3dy9kYXRhL2RhdGEuanNvbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFDLE1BQU0sSUFBRSxNQUFNLElBQUksQ0FBQyxDQUFBLEFBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakcsT0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDbkYsT0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDbkYsT0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQzFILE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMxSCxPQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDaEksT0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQy9ILE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxBQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUUsTUFBTSxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMxRyxPQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsRUFBRSxNQUFNLEdBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBOztBQUUzRyxPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDNUUsT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQzVFLE9BQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUM1RSxPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pILE9BQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakgsT0FBSSxDQUFDLEtBQUssQ0FBQyxF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VUFBSyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUN0SCxVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNySCxVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNySCxVQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBOztBQUV0SCxVQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakYsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pGLFVBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNqRixVQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakYsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakgsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUs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LEVBQUUsSUFBSSxDQUFDLENBQUE7OztBQUduRSxRQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUM3QyxTQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBLEdBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUEsSUFBSyxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0FBQzNILFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTs7O0FBR3pDLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7QUFHakMsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDM0UsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7OztBQUczRSxTQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FB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QUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3JHLFVBQUs7QUFBQSxBQUNOLFFBQUssMEJBQWEsVUFBVTtBQUMzQixRQUFJLFNBQVMsR0FBRyxBQUFDLHNCQUFTLCtCQUErQixFQUFFLElBQUksMEJBQWEsSUFBSSxHQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUMxRixZQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsT0FBTyxHQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3JILFlBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE9BQU8sR0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMzRyxVQUFLO0FBQUEsQUFDTixRQUFLLDBCQUFhLFFBQVE7QUFDekIsWUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNoSCxZQUFRLENBQUMsTUFBTSxDQUFD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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbm1vZHVsZS5leHBvcnRzLkRpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2xpYi9EaXNwYXRjaGVyJylcbiIsIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgRGlzcGF0Y2hlclxuICogQHR5cGVjaGVja3NcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIGludmFyaWFudCA9IHJlcXVpcmUoJy4vaW52YXJpYW50Jyk7XG5cbnZhciBfbGFzdElEID0gMTtcbnZhciBfcHJlZml4ID0gJ0lEXyc7XG5cbi8qKlxuICogRGlzcGF0Y2hlciBpcyB1c2VkIHRvIGJyb2FkY2FzdCBwYXlsb2FkcyB0byByZWdpc3RlcmVkIGNhbGxiYWNrcy4gVGhpcyBpc1xuICogZGlmZmVyZW50IGZyb20gZ2VuZXJpYyBwdWItc3ViIHN5c3RlbXMgaW4gdHdvIHdheXM6XG4gKlxuICogICAxKSBDYWxsYmFja3MgYXJlIG5vdCBzdWJzY3JpYmVkIHRvIHBhcnRpY3VsYXIgZXZlbnRzLiBFdmVyeSBwYXlsb2FkIGlzXG4gKiAgICAgIGRpc3BhdGNoZWQgdG8gZXZlcnkgcmVnaXN0ZXJlZCBjYWxsYmFjay5cbiAqICAgMikgQ2FsbGJhY2tzIGNhbiBiZSBkZWZlcnJlZCBpbiB3aG9sZSBvciBwYXJ0IHVudGlsIG90aGVyIGNhbGxiYWNrcyBoYXZlXG4gKiAgICAgIGJlZW4gZXhlY3V0ZWQuXG4gKlxuICogRm9yIGV4YW1wbGUsIGNvbnNpZGVyIHRoaXMgaHlwb3RoZXRpY2FsIGZsaWdodCBkZXN0aW5hdGlvbiBmb3JtLCB3aGljaFxuICogc2VsZWN0cyBhIGRlZmF1bHQgY2l0eSB3aGVuIGEgY291bnRyeSBpcyBzZWxlY3RlZDpcbiAqXG4gKiAgIHZhciBmbGlnaHREaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIoKTtcbiAqXG4gKiAgIC8vIEtlZXBzIHRyYWNrIG9mIHdoaWNoIGNvdW50cnkgaXMgc2VsZWN0ZWRcbiAqICAgdmFyIENvdW50cnlTdG9yZSA9IHtjb3VudHJ5OiBudWxsfTtcbiAqXG4gKiAgIC8vIEtlZXBzIHRyYWNrIG9mIHdoaWNoIGNpdHkgaXMgc2VsZWN0ZWRcbiAqICAgdmFyIENpdHlTdG9yZSA9IHtjaXR5OiBudWxsfTtcbiAqXG4gKiAgIC8vIEtlZXBzIHRyYWNrIG9mIHRoZSBiYXNlIGZsaWdodCBwcmljZSBvZiB0aGUgc2VsZWN0ZWQgY2l0eVxuICogICB2YXIgRmxpZ2h0UHJpY2VTdG9yZSA9IHtwcmljZTogbnVsbH1cbiAqXG4gKiBXaGVuIGEgdXNlciBjaGFuZ2VzIHRoZSBzZWxlY3RlZCBjaXR5LCB3ZSBkaXNwYXRjaCB0aGUgcGF5bG9hZDpcbiAqXG4gKiAgIGZsaWdodERpc3BhdGNoZXIuZGlzcGF0Y2goe1xuICogICAgIGFjdGlvblR5cGU6ICdjaXR5LXVwZGF0ZScsXG4gKiAgICAgc2VsZWN0ZWRDaXR5OiAncGFyaXMnXG4gKiAgIH0pO1xuICpcbiAqIFRoaXMgcGF5bG9hZCBpcyBkaWdlc3RlZCBieSBgQ2l0eVN0b3JlYDpcbiAqXG4gKiAgIGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjaXR5LXVwZGF0ZScpIHtcbiAqICAgICAgIENpdHlTdG9yZS5jaXR5ID0gcGF5bG9hZC5zZWxlY3RlZENpdHk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBXaGVuIHRoZSB1c2VyIHNlbGVjdHMgYSBjb3VudHJ5LCB3ZSBkaXNwYXRjaCB0aGUgcGF5bG9hZDpcbiAqXG4gKiAgIGZsaWdodERpc3BhdGNoZXIuZGlzcGF0Y2goe1xuICogICAgIGFjdGlvblR5cGU6ICdjb3VudHJ5LXVwZGF0ZScsXG4gKiAgICAgc2VsZWN0ZWRDb3VudHJ5OiAnYXVzdHJhbGlhJ1xuICogICB9KTtcbiAqXG4gKiBUaGlzIHBheWxvYWQgaXMgZGlnZXN0ZWQgYnkgYm90aCBzdG9yZXM6XG4gKlxuICogICAgQ291bnRyeVN0b3JlLmRpc3BhdGNoVG9rZW4gPSBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY291bnRyeS11cGRhdGUnKSB7XG4gKiAgICAgICBDb3VudHJ5U3RvcmUuY291bnRyeSA9IHBheWxvYWQuc2VsZWN0ZWRDb3VudHJ5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgY2FsbGJhY2sgdG8gdXBkYXRlIGBDb3VudHJ5U3RvcmVgIGlzIHJlZ2lzdGVyZWQsIHdlIHNhdmUgYSByZWZlcmVuY2VcbiAqIHRvIHRoZSByZXR1cm5lZCB0b2tlbi4gVXNpbmcgdGhpcyB0b2tlbiB3aXRoIGB3YWl0Rm9yKClgLCB3ZSBjYW4gZ3VhcmFudGVlXG4gKiB0aGF0IGBDb3VudHJ5U3RvcmVgIGlzIHVwZGF0ZWQgYmVmb3JlIHRoZSBjYWxsYmFjayB0aGF0IHVwZGF0ZXMgYENpdHlTdG9yZWBcbiAqIG5lZWRzIHRvIHF1ZXJ5IGl0cyBkYXRhLlxuICpcbiAqICAgQ2l0eVN0b3JlLmRpc3BhdGNoVG9rZW4gPSBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY291bnRyeS11cGRhdGUnKSB7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIG1heSBub3QgYmUgdXBkYXRlZC5cbiAqICAgICAgIGZsaWdodERpc3BhdGNoZXIud2FpdEZvcihbQ291bnRyeVN0b3JlLmRpc3BhdGNoVG9rZW5dKTtcbiAqICAgICAgIC8vIGBDb3VudHJ5U3RvcmUuY291bnRyeWAgaXMgbm93IGd1YXJhbnRlZWQgdG8gYmUgdXBkYXRlZC5cbiAqXG4gKiAgICAgICAvLyBTZWxlY3QgdGhlIGRlZmF1bHQgY2l0eSBmb3IgdGhlIG5ldyBjb3VudHJ5XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IGdldERlZmF1bHRDaXR5Rm9yQ291bnRyeShDb3VudHJ5U3RvcmUuY291bnRyeSk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgdXNhZ2Ugb2YgYHdhaXRGb3IoKWAgY2FuIGJlIGNoYWluZWQsIGZvciBleGFtcGxlOlxuICpcbiAqICAgRmxpZ2h0UHJpY2VTdG9yZS5kaXNwYXRjaFRva2VuID1cbiAqICAgICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICAgIHN3aXRjaCAocGF5bG9hZC5hY3Rpb25UeXBlKSB7XG4gKiAgICAgICAgIGNhc2UgJ2NvdW50cnktdXBkYXRlJzpcbiAqICAgICAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NpdHlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBnZXRGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKlxuICogICAgICAgICBjYXNlICdjaXR5LXVwZGF0ZSc6XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgYGNvdW50cnktdXBkYXRlYCBwYXlsb2FkIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBpbnZva2UgdGhlIHN0b3JlcydcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzIGluIG9yZGVyOiBgQ291bnRyeVN0b3JlYCwgYENpdHlTdG9yZWAsIHRoZW5cbiAqIGBGbGlnaHRQcmljZVN0b3JlYC5cbiAqL1xuXG4gIGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZyA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGV2ZXJ5IGRpc3BhdGNoZWQgcGF5bG9hZC4gUmV0dXJuc1xuICAgKiBhIHRva2VuIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBgd2FpdEZvcigpYC5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUucmVnaXN0ZXI9ZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB2YXIgaWQgPSBfcHJlZml4ICsgX2xhc3RJRCsrO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSA9IGNhbGxiYWNrO1xuICAgIHJldHVybiBpZDtcbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGNhbGxiYWNrIGJhc2VkIG9uIGl0cyB0b2tlbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS51bnJlZ2lzdGVyPWZ1bmN0aW9uKGlkKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdLFxuICAgICAgJ0Rpc3BhdGNoZXIudW5yZWdpc3RlciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJyxcbiAgICAgIGlkXG4gICAgKTtcbiAgICBkZWxldGUgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBXYWl0cyBmb3IgdGhlIGNhbGxiYWNrcyBzcGVjaWZpZWQgdG8gYmUgaW52b2tlZCBiZWZvcmUgY29udGludWluZyBleGVjdXRpb25cbiAgICogb2YgdGhlIGN1cnJlbnQgY2FsbGJhY2suIFRoaXMgbWV0aG9kIHNob3VsZCBvbmx5IGJlIHVzZWQgYnkgYSBjYWxsYmFjayBpblxuICAgKiByZXNwb25zZSB0byBhIGRpc3BhdGNoZWQgcGF5bG9hZC5cbiAgICpcbiAgICogQHBhcmFtIHthcnJheTxzdHJpbmc+fSBpZHNcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLndhaXRGb3I9ZnVuY3Rpb24oaWRzKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nLFxuICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBNdXN0IGJlIGludm9rZWQgd2hpbGUgZGlzcGF0Y2hpbmcuJ1xuICAgICk7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGlkcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgIHZhciBpZCA9IGlkc1tpaV07XG4gICAgICBpZiAodGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgIGludmFyaWFudChcbiAgICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0sXG4gICAgICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBDaXJjdWxhciBkZXBlbmRlbmN5IGRldGVjdGVkIHdoaWxlICcgK1xuICAgICAgICAgICd3YWl0aW5nIGZvciBgJXNgLicsXG4gICAgICAgICAgaWRcbiAgICAgICAgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnZhcmlhbnQoXG4gICAgICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSxcbiAgICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJyxcbiAgICAgICAgaWRcbiAgICAgICk7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrKGlkKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoZXMgYSBwYXlsb2FkIHRvIGFsbCByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHBheWxvYWRcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoPWZ1bmN0aW9uKHBheWxvYWQpIHtcbiAgICBpbnZhcmlhbnQoXG4gICAgICAhdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nLFxuICAgICAgJ0Rpc3BhdGNoLmRpc3BhdGNoKC4uLik6IENhbm5vdCBkaXNwYXRjaCBpbiB0aGUgbWlkZGxlIG9mIGEgZGlzcGF0Y2guJ1xuICAgICk7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9zdGFydERpc3BhdGNoaW5nKHBheWxvYWQpO1xuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcykge1xuICAgICAgICBpZiAodGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfc3RvcERpc3BhdGNoaW5nKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBJcyB0aGlzIERpc3BhdGNoZXIgY3VycmVudGx5IGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuaXNEaXNwYXRjaGluZz1mdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSBjYWxsYmFjayBzdG9yZWQgd2l0aCB0aGUgZ2l2ZW4gaWQuIEFsc28gZG8gc29tZSBpbnRlcm5hbFxuICAgKiBib29ra2VlcGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2s9ZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0gPSB0cnVlO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSh0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkKTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0gPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgYm9va2tlZXBpbmcgbmVlZGVkIHdoZW4gZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXlsb2FkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfc3RhcnREaXNwYXRjaGluZz1mdW5jdGlvbihwYXlsb2FkKSB7XG4gICAgZm9yICh2YXIgaWQgaW4gdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MpIHtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSA9IGZhbHNlO1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBwYXlsb2FkO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENsZWFyIGJvb2trZWVwaW5nIHVzZWQgZm9yIGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX3N0b3BEaXNwYXRjaGluZz1mdW5jdGlvbigpIHtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gbnVsbDtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgfTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXI7XG4iLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBpbnZhcmlhbnRcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBVc2UgaW52YXJpYW50KCkgdG8gYXNzZXJ0IHN0YXRlIHdoaWNoIHlvdXIgcHJvZ3JhbSBhc3N1bWVzIHRvIGJlIHRydWUuXG4gKlxuICogUHJvdmlkZSBzcHJpbnRmLXN0eWxlIGZvcm1hdCAob25seSAlcyBpcyBzdXBwb3J0ZWQpIGFuZCBhcmd1bWVudHNcbiAqIHRvIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBicm9rZSBhbmQgd2hhdCB5b3Ugd2VyZVxuICogZXhwZWN0aW5nLlxuICpcbiAqIFRoZSBpbnZhcmlhbnQgbWVzc2FnZSB3aWxsIGJlIHN0cmlwcGVkIGluIHByb2R1Y3Rpb24sIGJ1dCB0aGUgaW52YXJpYW50XG4gKiB3aWxsIHJlbWFpbiB0byBlbnN1cmUgbG9naWMgZG9lcyBub3QgZGlmZmVyIGluIHByb2R1Y3Rpb24uXG4gKi9cblxudmFyIGludmFyaWFudCA9IGZ1bmN0aW9uKGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIGlmIChmYWxzZSkge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICtcbiAgICAgICAgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJ1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZSwgZl07XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdJbnZhcmlhbnQgVmlvbGF0aW9uOiAnICtcbiAgICAgICAgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJnc1thcmdJbmRleCsrXTsgfSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX2ltcG9ydCA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9iYXNlJyk7XG5cbnZhciBiYXNlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbi8vIEVhY2ggb2YgdGhlc2UgYXVnbWVudCB0aGUgSGFuZGxlYmFycyBvYmplY3QuIE5vIG5lZWQgdG8gc2V0dXAgaGVyZS5cbi8vIChUaGlzIGlzIGRvbmUgdG8gZWFzaWx5IHNoYXJlIGNvZGUgYmV0d2VlbiBjb21tb25qcyBhbmQgYnJvd3NlIGVudnMpXG5cbnZhciBfU2FmZVN0cmluZyA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9zYWZlLXN0cmluZycpO1xuXG52YXIgX1NhZmVTdHJpbmcyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX1NhZmVTdHJpbmcpO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBfaW1wb3J0MiA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy91dGlscycpO1xuXG52YXIgVXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0Mik7XG5cbnZhciBfaW1wb3J0MyA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9ydW50aW1lJyk7XG5cbnZhciBydW50aW1lID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydDMpO1xuXG52YXIgX25vQ29uZmxpY3QgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvbm8tY29uZmxpY3QnKTtcblxudmFyIF9ub0NvbmZsaWN0MiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9ub0NvbmZsaWN0KTtcblxuLy8gRm9yIGNvbXBhdGliaWxpdHkgYW5kIHVzYWdlIG91dHNpZGUgb2YgbW9kdWxlIHN5c3RlbXMsIG1ha2UgdGhlIEhhbmRsZWJhcnMgb2JqZWN0IGEgbmFtZXNwYWNlXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIHZhciBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChoYiwgYmFzZSk7XG4gIGhiLlNhZmVTdHJpbmcgPSBfU2FmZVN0cmluZzJbJ2RlZmF1bHQnXTtcbiAgaGIuRXhjZXB0aW9uID0gX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXTtcbiAgaGIuVXRpbHMgPSBVdGlscztcbiAgaGIuZXNjYXBlRXhwcmVzc2lvbiA9IFV0aWxzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgaGIuVk0gPSBydW50aW1lO1xuICBoYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uIChzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgaGIpO1xuICB9O1xuXG4gIHJldHVybiBoYjtcbn1cblxudmFyIGluc3QgPSBjcmVhdGUoKTtcbmluc3QuY3JlYXRlID0gY3JlYXRlO1xuXG5fbm9Db25mbGljdDJbJ2RlZmF1bHQnXShpbnN0KTtcblxuaW5zdFsnZGVmYXVsdCddID0gaW5zdDtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gaW5zdDtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7XG5leHBvcnRzLmNyZWF0ZUZyYW1lID0gY3JlYXRlRnJhbWU7XG5cbnZhciBfaW1wb3J0ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgVXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0KTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIFZFUlNJT04gPSAnMy4wLjEnO1xuZXhwb3J0cy5WRVJTSU9OID0gVkVSU0lPTjtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IDY7XG5cbmV4cG9ydHMuQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz09IDEueC54JyxcbiAgNTogJz09IDIuMC4wLWFscGhhLngnLFxuICA2OiAnPj0gMi4wLjAtYmV0YS4xJ1xufTtcblxuZXhwb3J0cy5SRVZJU0lPTl9DSEFOR0VTID0gUkVWSVNJT05fQ0hBTkdFUztcbnZhciBpc0FycmF5ID0gVXRpbHMuaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uID0gVXRpbHMuaXNGdW5jdGlvbixcbiAgICB0b1N0cmluZyA9IFV0aWxzLnRvU3RyaW5nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzKSB7XG4gIHRoaXMuaGVscGVycyA9IGhlbHBlcnMgfHwge307XG4gIHRoaXMucGFydGlhbHMgPSBwYXJ0aWFscyB8fCB7fTtcblxuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xufVxuXG5IYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogSGFuZGxlYmFyc0Vudmlyb25tZW50LFxuXG4gIGxvZ2dlcjogbG9nZ2VyLFxuICBsb2c6IGxvZyxcblxuICByZWdpc3RlckhlbHBlcjogZnVuY3Rpb24gcmVnaXN0ZXJIZWxwZXIobmFtZSwgZm4pIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgaWYgKGZuKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTtcbiAgICAgIH1cbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uIHVucmVnaXN0ZXJIZWxwZXIobmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLmhlbHBlcnNbbmFtZV07XG4gIH0sXG5cbiAgcmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbiByZWdpc3RlclBhcnRpYWwobmFtZSwgcGFydGlhbCkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgcGFydGlhbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ0F0dGVtcHRpbmcgdG8gcmVnaXN0ZXIgYSBwYXJ0aWFsIGFzIHVuZGVmaW5lZCcpO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWw7XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24gdW5yZWdpc3RlclBhcnRpYWwobmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLnBhcnRpYWxzW25hbWVdO1xuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24gKCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyBBIG1pc3NpbmcgZmllbGQgaW4gYSB7e2Zvb319IGNvbnN0dWN0LlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU29tZW9uZSBpcyBhY3R1YWxseSB0cnlpbmcgdG8gY2FsbCBzb21ldGhpbmcsIGJsb3cgdXAuXG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnTWlzc2luZyBoZWxwZXI6IFwiJyArIGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV0ubmFtZSArICdcIicpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXG4gICAgICAgIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZm4odGhpcyk7XG4gICAgfSBlbHNlIGlmIChjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgaWYgKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICBpZiAob3B0aW9ucy5pZHMpIHtcbiAgICAgICAgICBvcHRpb25zLmlkcyA9IFtvcHRpb25zLm5hbWVdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIHZhciBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5uYW1lKTtcbiAgICAgICAgb3B0aW9ucyA9IHsgZGF0YTogZGF0YSB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnTXVzdCBwYXNzIGl0ZXJhdG9yIHRvICNlYWNoJyk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbixcbiAgICAgICAgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIHJldCA9ICcnLFxuICAgICAgICBkYXRhID0gdW5kZWZpbmVkLFxuICAgICAgICBjb250ZXh0UGF0aCA9IHVuZGVmaW5lZDtcblxuICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgIGNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSkgKyAnLic7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXhlY0l0ZXJhdGlvbihmaWVsZCwgaW5kZXgsIGxhc3QpIHtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIGRhdGEua2V5ID0gZmllbGQ7XG4gICAgICAgIGRhdGEuaW5kZXggPSBpbmRleDtcbiAgICAgICAgZGF0YS5maXJzdCA9IGluZGV4ID09PSAwO1xuICAgICAgICBkYXRhLmxhc3QgPSAhIWxhc3Q7XG5cbiAgICAgICAgaWYgKGNvbnRleHRQYXRoKSB7XG4gICAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGNvbnRleHRQYXRoICsgZmllbGQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtmaWVsZF0sIHtcbiAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgYmxvY2tQYXJhbXM6IFV0aWxzLmJsb2NrUGFyYW1zKFtjb250ZXh0W2ZpZWxkXSwgZmllbGRdLCBbY29udGV4dFBhdGggKyBmaWVsZCwgbnVsbF0pXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvciAodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgICAgIGV4ZWNJdGVyYXRpb24oaSwgaSwgaSA9PT0gY29udGV4dC5sZW5ndGggLSAxKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHByaW9yS2V5ID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgLy8gV2UncmUgcnVubmluZyB0aGUgaXRlcmF0aW9ucyBvbmUgc3RlcCBvdXQgb2Ygc3luYyBzbyB3ZSBjYW4gZGV0ZWN0XG4gICAgICAgICAgICAvLyB0aGUgbGFzdCBpdGVyYXRpb24gd2l0aG91dCBoYXZlIHRvIHNjYW4gdGhlIG9iamVjdCB0d2ljZSBhbmQgY3JlYXRlXG4gICAgICAgICAgICAvLyBhbiBpdGVybWVkaWF0ZSBrZXlzIGFycmF5LlxuICAgICAgICAgICAgaWYgKHByaW9yS2V5KSB7XG4gICAgICAgICAgICAgIGV4ZWNJdGVyYXRpb24ocHJpb3JLZXksIGkgLSAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByaW9yS2V5ID0ga2V5O1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocHJpb3JLZXkpIHtcbiAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpIC0gMSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbiAoY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHtcbiAgICAgIGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICghb3B0aW9ucy5oYXNoLmluY2x1ZGVaZXJvICYmICFjb25kaXRpb25hbCB8fCBVdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24gKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwgeyBmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2ggfSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkge1xuICAgICAgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSB7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIHZhciBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pO1xuICAgICAgICBvcHRpb25zID0geyBkYXRhOiBkYXRhIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbiAobWVzc2FnZSwgb3B0aW9ucykge1xuICAgIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgICBpbnN0YW5jZS5sb2cobGV2ZWwsIG1lc3NhZ2UpO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9va3VwJywgZnVuY3Rpb24gKG9iaiwgZmllbGQpIHtcbiAgICByZXR1cm4gb2JqICYmIG9ialtmaWVsZF07XG4gIH0pO1xufVxuXG52YXIgbG9nZ2VyID0ge1xuICBtZXRob2RNYXA6IHsgMDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcicgfSxcblxuICAvLyBTdGF0ZSBlbnVtXG4gIERFQlVHOiAwLFxuICBJTkZPOiAxLFxuICBXQVJOOiAyLFxuICBFUlJPUjogMyxcbiAgbGV2ZWw6IDEsXG5cbiAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbiBsb2cobGV2ZWwsIG1lc3NhZ2UpIHtcbiAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IGxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgKGNvbnNvbGVbbWV0aG9kXSB8fCBjb25zb2xlLmxvZykuY2FsbChjb25zb2xlLCBtZXNzYWdlKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgfVxuICB9XG59O1xuXG5leHBvcnRzLmxvZ2dlciA9IGxvZ2dlcjtcbnZhciBsb2cgPSBsb2dnZXIubG9nO1xuXG5leHBvcnRzLmxvZyA9IGxvZztcblxuZnVuY3Rpb24gY3JlYXRlRnJhbWUob2JqZWN0KSB7XG4gIHZhciBmcmFtZSA9IFV0aWxzLmV4dGVuZCh7fSwgb2JqZWN0KTtcbiAgZnJhbWUuX3BhcmVudCA9IG9iamVjdDtcbiAgcmV0dXJuIGZyYW1lO1xufVxuXG4vKiBbYXJncywgXW9wdGlvbnMgKi8iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKG1lc3NhZ2UsIG5vZGUpIHtcbiAgdmFyIGxvYyA9IG5vZGUgJiYgbm9kZS5sb2MsXG4gICAgICBsaW5lID0gdW5kZWZpbmVkLFxuICAgICAgY29sdW1uID0gdW5kZWZpbmVkO1xuICBpZiAobG9jKSB7XG4gICAgbGluZSA9IGxvYy5zdGFydC5saW5lO1xuICAgIGNvbHVtbiA9IGxvYy5zdGFydC5jb2x1bW47XG5cbiAgICBtZXNzYWdlICs9ICcgLSAnICsgbGluZSArICc6JyArIGNvbHVtbjtcbiAgfVxuXG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cblxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBFeGNlcHRpb24pO1xuICB9XG5cbiAgaWYgKGxvYykge1xuICAgIHRoaXMubGluZU51bWJlciA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gPSBjb2x1bW47XG4gIH1cbn1cblxuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBFeGNlcHRpb247XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG4vKmdsb2JhbCB3aW5kb3cgKi9cblxuZXhwb3J0c1snZGVmYXVsdCddID0gZnVuY3Rpb24gKEhhbmRsZWJhcnMpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgdmFyIHJvb3QgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHdpbmRvdyxcbiAgICAgICRIYW5kbGViYXJzID0gcm9vdC5IYW5kbGViYXJzO1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBIYW5kbGViYXJzLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHJvb3QuSGFuZGxlYmFycyA9PT0gSGFuZGxlYmFycykge1xuICAgICAgcm9vdC5IYW5kbGViYXJzID0gJEhhbmRsZWJhcnM7XG4gICAgfVxuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uO1xuXG4vLyBUT0RPOiBSZW1vdmUgdGhpcyBsaW5lIGFuZCBicmVhayB1cCBjb21waWxlUGFydGlhbFxuXG5leHBvcnRzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG5leHBvcnRzLndyYXBQcm9ncmFtID0gd3JhcFByb2dyYW07XG5leHBvcnRzLnJlc29sdmVQYXJ0aWFsID0gcmVzb2x2ZVBhcnRpYWw7XG5leHBvcnRzLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO1xuZXhwb3J0cy5ub29wID0gbm9vcDtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBVdGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5DT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gJyArICdQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgcnVudGltZVZlcnNpb25zICsgJykgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uICgnICsgY29tcGlsZXJWZXJzaW9ucyArICcpLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuICcgKyAnUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgY29tcGlsZXJJbmZvWzFdICsgJykuJyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ05vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZScpO1xuICB9XG4gIGlmICghdGVtcGxhdGVTcGVjIHx8ICF0ZW1wbGF0ZVNwZWMubWFpbikge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdVbmtub3duIHRlbXBsYXRlIG9iamVjdDogJyArIHR5cGVvZiB0ZW1wbGF0ZVNwZWMpO1xuICB9XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgZW52LlZNLmNoZWNrUmV2aXNpb24odGVtcGxhdGVTcGVjLmNvbXBpbGVyKTtcblxuICBmdW5jdGlvbiBpbnZva2VQYXJ0aWFsV3JhcHBlcihwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMuaGFzaCkge1xuICAgICAgY29udGV4dCA9IFV0aWxzLmV4dGVuZCh7fSwgY29udGV4dCwgb3B0aW9ucy5oYXNoKTtcbiAgICB9XG5cbiAgICBwYXJ0aWFsID0gZW52LlZNLnJlc29sdmVQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgdmFyIHJlc3VsdCA9IGVudi5WTS5pbnZva2VQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgY29udGV4dCwgb3B0aW9ucyk7XG5cbiAgICBpZiAocmVzdWx0ID09IG51bGwgJiYgZW52LmNvbXBpbGUpIHtcbiAgICAgIG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHRlbXBsYXRlU3BlYy5jb21waWxlck9wdGlvbnMsIGVudik7XG4gICAgICByZXN1bHQgPSBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgIT0gbnVsbCkge1xuICAgICAgaWYgKG9wdGlvbnMuaW5kZW50KSB7XG4gICAgICAgIHZhciBsaW5lcyA9IHJlc3VsdC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGluZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCFsaW5lc1tpXSAmJiBpICsgMSA9PT0gbCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGluZXNbaV0gPSBvcHRpb25zLmluZGVudCArIGxpbmVzW2ldO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9IGxpbmVzLmpvaW4oJ1xcbicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RoZSBwYXJ0aWFsICcgKyBvcHRpb25zLm5hbWUgKyAnIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGUnKTtcbiAgICB9XG4gIH1cblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIHN0cmljdDogZnVuY3Rpb24gc3RyaWN0KG9iaiwgbmFtZSkge1xuICAgICAgaWYgKCEobmFtZSBpbiBvYmopKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdcIicgKyBuYW1lICsgJ1wiIG5vdCBkZWZpbmVkIGluICcgKyBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9ialtuYW1lXTtcbiAgICB9LFxuICAgIGxvb2t1cDogZnVuY3Rpb24gbG9va3VwKGRlcHRocywgbmFtZSkge1xuICAgICAgdmFyIGxlbiA9IGRlcHRocy5sZW5ndGg7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChkZXB0aHNbaV0gJiYgZGVwdGhzW2ldW25hbWVdICE9IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gZGVwdGhzW2ldW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBsYW1iZGE6IGZ1bmN0aW9uIGxhbWJkYShjdXJyZW50LCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIGN1cnJlbnQgPT09ICdmdW5jdGlvbicgPyBjdXJyZW50LmNhbGwoY29udGV4dCkgOiBjdXJyZW50O1xuICAgIH0sXG5cbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIGludm9rZVBhcnRpYWw6IGludm9rZVBhcnRpYWxXcmFwcGVyLFxuXG4gICAgZm46IGZ1bmN0aW9uIGZuKGkpIHtcbiAgICAgIHJldHVybiB0ZW1wbGF0ZVNwZWNbaV07XG4gICAgfSxcblxuICAgIHByb2dyYW1zOiBbXSxcbiAgICBwcm9ncmFtOiBmdW5jdGlvbiBwcm9ncmFtKGksIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0sXG4gICAgICAgICAgZm4gPSB0aGlzLmZuKGkpO1xuICAgICAgaWYgKGRhdGEgfHwgZGVwdGhzIHx8IGJsb2NrUGFyYW1zIHx8IGRlY2xhcmVkQmxvY2tQYXJhbXMpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uIGRhdGEodmFsdWUsIGRlcHRoKSB7XG4gICAgICB3aGlsZSAodmFsdWUgJiYgZGVwdGgtLSkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLl9wYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24gbWVyZ2UocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIG9iaiA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiBwYXJhbSAhPT0gY29tbW9uKSB7XG4gICAgICAgIG9iaiA9IFV0aWxzLmV4dGVuZCh7fSwgY29tbW9uLCBwYXJhbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSxcblxuICAgIG5vb3A6IGVudi5WTS5ub29wLFxuICAgIGNvbXBpbGVySW5mbzogdGVtcGxhdGVTcGVjLmNvbXBpbGVyXG4gIH07XG5cbiAgZnVuY3Rpb24gcmV0KGNvbnRleHQpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMV07XG5cbiAgICB2YXIgZGF0YSA9IG9wdGlvbnMuZGF0YTtcblxuICAgIHJldC5fc2V0dXAob3B0aW9ucyk7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwgJiYgdGVtcGxhdGVTcGVjLnVzZURhdGEpIHtcbiAgICAgIGRhdGEgPSBpbml0RGF0YShjb250ZXh0LCBkYXRhKTtcbiAgICB9XG4gICAgdmFyIGRlcHRocyA9IHVuZGVmaW5lZCxcbiAgICAgICAgYmxvY2tQYXJhbXMgPSB0ZW1wbGF0ZVNwZWMudXNlQmxvY2tQYXJhbXMgPyBbXSA6IHVuZGVmaW5lZDtcbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocykge1xuICAgICAgZGVwdGhzID0gb3B0aW9ucy5kZXB0aHMgPyBbY29udGV4dF0uY29uY2F0KG9wdGlvbnMuZGVwdGhzKSA6IFtjb250ZXh0XTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGVtcGxhdGVTcGVjLm1haW4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICB9XG4gIHJldC5pc1RvcCA9IHRydWU7XG5cbiAgcmV0Ll9zZXR1cCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMuaGVscGVycywgZW52LmhlbHBlcnMpO1xuXG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZVBhcnRpYWwpIHtcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMucGFydGlhbHMsIGVudi5wYXJ0aWFscyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG4gIH07XG5cbiAgcmV0Ll9jaGlsZCA9IGZ1bmN0aW9uIChpLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyAmJiAhYmxvY2tQYXJhbXMpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdtdXN0IHBhc3MgYmxvY2sgcGFyYW1zJyk7XG4gICAgfVxuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzICYmICFkZXB0aHMpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdtdXN0IHBhc3MgcGFyZW50IGRlcHRocycpO1xuICAgIH1cblxuICAgIHJldHVybiB3cmFwUHJvZ3JhbShjb250YWluZXIsIGksIHRlbXBsYXRlU3BlY1tpXSwgZGF0YSwgMCwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gIH07XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIHdyYXBQcm9ncmFtKGNvbnRhaW5lciwgaSwgZm4sIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgZnVuY3Rpb24gcHJvZyhjb250ZXh0KSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzFdO1xuXG4gICAgcmV0dXJuIGZuLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEgfHwgZGF0YSwgYmxvY2tQYXJhbXMgJiYgW29wdGlvbnMuYmxvY2tQYXJhbXNdLmNvbmNhdChibG9ja1BhcmFtcyksIGRlcHRocyAmJiBbY29udGV4dF0uY29uY2F0KGRlcHRocykpO1xuICB9XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSBkZXB0aHMgPyBkZXB0aHMubGVuZ3RoIDogMDtcbiAgcHJvZy5ibG9ja1BhcmFtcyA9IGRlY2xhcmVkQmxvY2tQYXJhbXMgfHwgMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgaWYgKCFwYXJ0aWFsKSB7XG4gICAgcGFydGlhbCA9IG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXTtcbiAgfSBlbHNlIGlmICghcGFydGlhbC5jYWxsICYmICFvcHRpb25zLm5hbWUpIHtcbiAgICAvLyBUaGlzIGlzIGEgZHluYW1pYyBwYXJ0aWFsIHRoYXQgcmV0dXJuZWQgYSBzdHJpbmdcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJ0aWFsO1xuICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW3BhcnRpYWxdO1xuICB9XG4gIHJldHVybiBwYXJ0aWFsO1xufVxuXG5mdW5jdGlvbiBpbnZva2VQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucy5wYXJ0aWFsID0gdHJ1ZTtcblxuICBpZiAocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RoZSBwYXJ0aWFsICcgKyBvcHRpb25zLm5hbWUgKyAnIGNvdWxkIG5vdCBiZSBmb3VuZCcpO1xuICB9IGVsc2UgaWYgKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7XG4gIHJldHVybiAnJztcbn1cblxuZnVuY3Rpb24gaW5pdERhdGEoY29udGV4dCwgZGF0YSkge1xuICBpZiAoIWRhdGEgfHwgISgncm9vdCcgaW4gZGF0YSkpIHtcbiAgICBkYXRhID0gZGF0YSA/IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLmNyZWF0ZUZyYW1lKGRhdGEpIDoge307XG4gICAgZGF0YS5yb290ID0gY29udGV4dDtcbiAgfVxuICByZXR1cm4gZGF0YTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gU2FmZVN0cmluZy5wcm90b3R5cGUudG9IVE1MID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJycgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IFNhZmVTdHJpbmc7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLmV4dGVuZCA9IGV4dGVuZDtcblxuLy8gT2xkZXIgSUUgdmVyc2lvbnMgZG8gbm90IGRpcmVjdGx5IHN1cHBvcnQgaW5kZXhPZiBzbyB3ZSBtdXN0IGltcGxlbWVudCBvdXIgb3duLCBzYWRseS5cbmV4cG9ydHMuaW5kZXhPZiA9IGluZGV4T2Y7XG5leHBvcnRzLmVzY2FwZUV4cHJlc3Npb24gPSBlc2NhcGVFeHByZXNzaW9uO1xuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTtcbmV4cG9ydHMuYmxvY2tQYXJhbXMgPSBibG9ja1BhcmFtcztcbmV4cG9ydHMuYXBwZW5kQ29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aDtcbnZhciBlc2NhcGUgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgJ1xcJyc6ICcmI3gyNzsnLFxuICAnYCc6ICcmI3g2MDsnXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2csXG4gICAgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxuZnVuY3Rpb24gZXNjYXBlQ2hhcihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqIC8qICwgLi4uc291cmNlICovKSB7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhcmd1bWVudHNbaV0sIGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG4vKmVzbGludC1kaXNhYmxlIGZ1bmMtc3R5bGUsIG5vLXZhciAqL1xudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuaWYgKGlzRnVuY3Rpb24oL3gvKSkge1xuICBleHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbnZhciBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbi8qZXNsaW50LWVuYWJsZSBmdW5jLXN0eWxlLCBuby12YXIgKi9cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtleHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpbmRleE9mKGFycmF5LCB2YWx1ZSkge1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoYXJyYXlbaV0gPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVFeHByZXNzaW9uKHN0cmluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyAmJiBzdHJpbmcudG9IVE1MKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvSFRNTCgpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9IGVsc2UgaWYgKCFzdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcgKyAnJztcbiAgICB9XG5cbiAgICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgICBzdHJpbmcgPSAnJyArIHN0cmluZztcbiAgfVxuXG4gIGlmICghcG9zc2libGUudGVzdChzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZztcbiAgfVxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xufVxuXG5mdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gYmxvY2tQYXJhbXMocGFyYW1zLCBpZHMpIHtcbiAgcGFyYW1zLnBhdGggPSBpZHM7XG4gIHJldHVybiBwYXJhbXM7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZENvbnRleHRQYXRoKGNvbnRleHRQYXRoLCBpZCkge1xuICByZXR1cm4gKGNvbnRleHRQYXRoID8gY29udGV4dFBhdGggKyAnLicgOiAnJykgKyBpZDtcbn0iLCIvLyBDcmVhdGUgYSBzaW1wbGUgcGF0aCBhbGlhcyB0byBhbGxvdyBicm93c2VyaWZ5IHRvIHJlc29sdmVcbi8vIHRoZSBydW50aW1lIG9uIGEgc3VwcG9ydGVkIHBhdGguXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lJylbJ2RlZmF1bHQnXTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKVtcImRlZmF1bHRcIl07XG4iLCJ2YXIgYmFzZVRvU3RyaW5nID0gcmVxdWlyZSgnLi4vaW50ZXJuYWwvYmFzZVRvU3RyaW5nJyk7XG5cbi8qKlxuICogQ2FwaXRhbGl6ZXMgdGhlIGZpcnN0IGNoYXJhY3RlciBvZiBgc3RyaW5nYC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFN0cmluZ1xuICogQHBhcmFtIHtzdHJpbmd9IFtzdHJpbmc9JyddIFRoZSBzdHJpbmcgdG8gY2FwaXRhbGl6ZS5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGNhcGl0YWxpemVkIHN0cmluZy5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5jYXBpdGFsaXplKCdmcmVkJyk7XG4gKiAvLyA9PiAnRnJlZCdcbiAqL1xuZnVuY3Rpb24gY2FwaXRhbGl6ZShzdHJpbmcpIHtcbiAgc3RyaW5nID0gYmFzZVRvU3RyaW5nKHN0cmluZyk7XG4gIHJldHVybiBzdHJpbmcgJiYgKHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0cmluZy5zbGljZSgxKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2FwaXRhbGl6ZTtcbiIsIi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBhIHN0cmluZyBpZiBpdCdzIG5vdCBvbmUuIEFuIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZFxuICogZm9yIGBudWxsYCBvciBgdW5kZWZpbmVkYCB2YWx1ZXMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGJhc2VUb1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT0gbnVsbCA/ICcnIDogKHZhbHVlICsgJycpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VUb1N0cmluZztcbiIsIi8vIEF2b2lkIGNvbnNvbGUgZXJyb3JzIGZvciB0aGUgSUUgY3JhcHB5IGJyb3dzZXJzXG5pZiAoICEgd2luZG93LmNvbnNvbGUgKSBjb25zb2xlID0geyBsb2c6IGZ1bmN0aW9uKCl7fSB9O1xuXG5pbXBvcnQgQXBwIGZyb20gJ0FwcCdcbmltcG9ydCAkIGZyb20gJ2pxdWVyeSdcbmltcG9ydCBUd2Vlbk1heCBmcm9tICdnc2FwJ1xuaW1wb3J0IHJhZiBmcm9tICdyYWYnXG5pbXBvcnQgcGl4aSBmcm9tICdwaXhpLmpzJ1xuaW1wb3J0IHdoZWVsIGZyb20gJ2pxdWVyeS1tb3VzZXdoZWVsJ1xuXG53aW5kb3cualF1ZXJ5ID0gd2luZG93LiQgPSAkXG5cbndoZWVsKCQpXG5cbi8vIFN0YXJ0IEFwcFxudmFyIGFwcCA9IG5ldyBBcHAoKVxuYXBwLmluaXQoKVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBUZW1wbGF0ZSBmcm9tICdBcHBUZW1wbGF0ZSdcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuaW1wb3J0IEdFdmVudHMgZnJvbSAnR2xvYmFsRXZlbnRzJ1xuaW1wb3J0IFBvb2wgZnJvbSAnUG9vbCdcbmltcG9ydCBQcmVsb2FkZXIgZnJvbSAnUHJlbG9hZGVyJ1xuaW1wb3J0IE1vYmlsZURldGVjdCBmcm9tICdtb2JpbGUtZGV0ZWN0J1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5cbmNsYXNzIEFwcCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMub25NYWluQXNzZXRzTG9hZGVkID0gdGhpcy5vbk1haW5Bc3NldHNMb2FkZWQuYmluZCh0aGlzKVxuXHR9XG5cdGluaXQoKSB7XG5cdFx0XHR2YXIgbWQgPSBuZXcgTW9iaWxlRGV0ZWN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KVxuXG5cdFx0XHRBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSA9IChtZC5tb2JpbGUoKSB8fCBtZC50YWJsZXQoKSkgPyB0cnVlIDogZmFsc2VcblxuXHRcdFx0Ly8gSW5pdCBQcmVsb2FkZXJcblx0XHRcdEFwcFN0b3JlLlByZWxvYWRlciA9IG5ldyBQcmVsb2FkZXIoKVxuXG5cdFx0XHQvLyBJbml0IFBvb2xcblx0XHRcdEFwcFN0b3JlLlBvb2wgPSBuZXcgUG9vbCgpXG5cblx0XHRcdC8vIEluaXQgcm91dGVyXG5cdFx0XHR0aGlzLnJvdXRlciA9IG5ldyBSb3V0ZXIoKVxuXHRcdFx0dGhpcy5yb3V0ZXIuaW5pdCgpXG5cblx0XHRcdHRoaXMuJG1haW5Mb2FkZXIgPSAkKCcjbWFpbi1sb2FkZXInKVxuXHRcdFx0dmFyICRzcGlubmVyID0gdGhpcy4kbWFpbkxvYWRlci5maW5kKCcuc3Bpbm5lci13cmFwcGVyJylcblx0XHRcdHZhciAkbG9nbyA9IHRoaXMuJG1haW5Mb2FkZXIuZmluZCgnLmxvZ28nKVxuXHRcdFx0dmFyICRiYWNrZ3JvdW5kID0gdGhpcy4kbWFpbkxvYWRlci5maW5kKCcuYmFja2dyb3VuZCcpXG5cdFx0XHR0aGlzLnRsSW4gPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdFx0XHR0aGlzLnRsT3V0ID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXG5cdFx0XHR0aGlzLnRsSW4uZnJvbVRvKCRzcGlubmVyLCAxLCB7b3BhY2l0eTowfSwgeyBvcGFjaXR5OjEsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFeHBvLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxJbi5mcm9tVG8oJGxvZ28sIDEsIHtvcGFjaXR5OjB9LCB7IG9wYWNpdHk6MSwgZm9yY2UzRDp0cnVlLCBlYXNlOkV4cG8uZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bEluLnBsYXkoMClcblxuXHRcdFx0dGhpcy50bE91dC50bygkc3Bpbm5lciwgMSwgeyBzY2FsZToxLjIsIHk6MTAsIG9wYWNpdHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKCRsb2dvLCAxLCB7IHNjYWxlOjEuMiwgeTotMTAsIG9wYWNpdHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKCRiYWNrZ3JvdW5kLCAxLCB7IG9wYWNpdHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDAuNilcblx0XHRcdHRoaXMudGxPdXQucGF1c2UoMClcblxuXHRcdFx0Ly8gSW5pdCBnbG9iYWwgZXZlbnRzXG5cdFx0XHR3aW5kb3cuR2xvYmFsRXZlbnRzID0gbmV3IEdFdmVudHMoKVxuXHRcdFx0R2xvYmFsRXZlbnRzLmluaXQoKVxuXG5cdFx0XHR2YXIgYXBwVGVtcGxhdGUgPSBuZXcgQXBwVGVtcGxhdGUoKVxuXHRcdFx0YXBwVGVtcGxhdGUuaXNSZWFkeSA9ICgpPT57fVxuXHRcdFx0YXBwVGVtcGxhdGUucmVuZGVyKCcjYXBwLWNvbnRhaW5lcicpXG5cdFx0XHR0aGlzLmxvYWRNYWluQXNzZXRzKClcblx0fVxuXHRsb2FkTWFpbkFzc2V0cygpIHtcblx0XHR2YXIgbWFuaWZlc3QgPSBbXVxuXHRcdHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcGxhbmV0ID0gcGxhbmV0c1tpXVxuXHRcdFx0dmFyIG8gPSB7fVxuXHRcdFx0dmFyIGltZ1VybCA9IEFwcFN0b3JlLm1haW5JbWFnZVVybChwbGFuZXQsIEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHRcdFx0bWFuaWZlc3RbaV0gPSB7XG5cdFx0XHRcdGlkOiAnbWFpbi1sb2FkZXItYXNzZXRzLScgKyBwbGFuZXQsXG4gICAgICAgICAgICBcdHNyYzogaW1nVXJsXG5cdFx0XHR9XG5cdFx0fVxuXHRcdEFwcFN0b3JlLlByZWxvYWRlci5sb2FkKG1hbmlmZXN0LCB0aGlzLm9uTWFpbkFzc2V0c0xvYWRlZClcblx0fVxuXHRvbk1haW5Bc3NldHNMb2FkZWQoKSB7XG5cdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dGhpcy50bE91dC5wbGF5KClcblx0XHRcdC8vIFN0YXJ0IHJvdXRpbmdcblx0XHRcdHRoaXMucm91dGVyLmJlZ2luUm91dGluZygpXG5cdFx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRcdHRoaXMuJG1haW5Mb2FkZXIucmVtb3ZlKClcblx0XHRcdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxJbilcblx0XHRcdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdXQpXG5cdFx0XHR9LCAxNjAwKVxuXHRcdH0sIDUwMClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBcbiAgICBcdFxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCBGcm9udENvbnRhaW5lciBmcm9tICdGcm9udENvbnRhaW5lcidcbmltcG9ydCBQYWdlc0NvbnRhaW5lciBmcm9tICdQYWdlc0NvbnRhaW5lcidcbmltcG9ydCBQWENvbnRhaW5lciBmcm9tICdQWENvbnRhaW5lcidcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuY2xhc3MgQXBwVGVtcGxhdGUgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMuaXNSZWFkeSA9IHVuZGVmaW5lZFxuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0fVxuXHRyZW5kZXIocGFyZW50KSB7XG5cdFx0c3VwZXIucmVuZGVyKCdBcHBUZW1wbGF0ZScsIHBhcmVudCwgdW5kZWZpbmVkKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHRoaXMuZnJvbnRDb250YWluZXIgPSBuZXcgRnJvbnRDb250YWluZXIoKVxuXHRcdHRoaXMuZnJvbnRDb250YWluZXIucmVuZGVyKCcjYXBwLXRlbXBsYXRlJylcblxuXHRcdHRoaXMucGFnZXNDb250YWluZXIgPSBuZXcgUGFnZXNDb250YWluZXIoKVxuXHRcdHRoaXMucGFnZXNDb250YWluZXIucmVuZGVyKCcjYXBwLXRlbXBsYXRlJylcblxuXHRcdHRoaXMucHhDb250YWluZXIgPSBuZXcgUFhDb250YWluZXIoKVxuXHRcdHRoaXMucHhDb250YWluZXIuaW5pdCgnI2FwcC10ZW1wbGF0ZScpXG5cdFx0QXBwQWN0aW9ucy5weENvbnRhaW5lcklzUmVhZHkodGhpcy5weENvbnRhaW5lcilcblxuXHRcdEdsb2JhbEV2ZW50cy5yZXNpemUoKVxuXG5cdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dGhpcy5vblJlYWR5KClcblx0XHR9LCAwKVxuXHR9XG5cdG9uUmVhZHkoKSB7XG5cdFx0dGhpcy5pc1JlYWR5KClcblx0XHR0aGlzLmFuaW1hdGUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxuXHRhbmltYXRlKCkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdGUpXG5cdCAgICB0aGlzLnB4Q29udGFpbmVyLnVwZGF0ZSgpXG5cdCAgICB0aGlzLnBhZ2VzQ29udGFpbmVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuZnJvbnRDb250YWluZXIucmVzaXplKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLnJlc2l6ZSgpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQXBwVGVtcGxhdGVcbiIsImltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcERpc3BhdGNoZXIgZnJvbSAnQXBwRGlzcGF0Y2hlcidcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZnVuY3Rpb24gX3Byb2NlZWRIYXNoZXJDaGFuZ2VBY3Rpb24ocGFnZUlkKSB7XG4gICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQsXG4gICAgICAgIGl0ZW06IHBhZ2VJZFxuICAgIH0pICBcbn1cbnZhciBBcHBBY3Rpb25zID0ge1xuICAgIHBhZ2VIYXNoZXJDaGFuZ2VkOiBmdW5jdGlvbihwYWdlSWQpIHtcbiAgICAgICAgdmFyIG1hbmlmZXN0ID0gQXBwU3RvcmUucGFnZUFzc2V0c1RvTG9hZCgpXG4gICAgICAgIGlmKG1hbmlmZXN0Lmxlbmd0aCA8IDEpIHtcbiAgICAgICAgICAgIF9wcm9jZWVkSGFzaGVyQ2hhbmdlQWN0aW9uKHBhZ2VJZClcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBBcHBTdG9yZS5QcmVsb2FkZXIubG9hZChtYW5pZmVzdCwgKCk9PntcbiAgICAgICAgICAgICAgICBfcHJvY2VlZEhhc2hlckNoYW5nZUFjdGlvbihwYWdlSWQpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfSxcbiAgICB3aW5kb3dSZXNpemU6IGZ1bmN0aW9uKHdpbmRvd1csIHdpbmRvd0gpIHtcbiAgICAgICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLFxuICAgICAgICAgICAgaXRlbTogeyB3aW5kb3dXOndpbmRvd1csIHdpbmRvd0g6d2luZG93SCB9XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBweENvbnRhaW5lcklzUmVhZHk6IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9JU19SRUFEWSxcbiAgICAgICAgICAgIGl0ZW06IGNvbXBvbmVudFxuICAgICAgICB9KSAgICAgICAgICAgIFxuICAgIH0sXG4gICAgcHhBZGRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfQUREX0NISUxELFxuICAgICAgICAgICAgaXRlbToge2NoaWxkOiBjaGlsZH1cbiAgICAgICAgfSkgICAgICAgICAgICBcbiAgICB9LFxuICAgIHB4UmVtb3ZlQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX1JFTU9WRV9DSElMRCxcbiAgICAgICAgICAgIGl0ZW06IHtjaGlsZDogY2hpbGR9XG4gICAgICAgIH0pICAgICAgICAgICAgXG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBBY3Rpb25zXG5cblxuICAgICAgXG4iLCJpbXBvcnQgS25vdCBmcm9tICdLbm90J1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFycm93QnRuIHtcblx0Y29uc3RydWN0b3IoZWxlbWVudCwgZGlyZWN0aW9uKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudFxuXHRcdHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy50bE92ZXIgPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdFx0dGhpcy50bE91dCA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR2YXIga25vdHNFbCA9IHRoaXMuZWxlbWVudC5maW5kKFwiLmtub3RcIilcblx0XHR2YXIgbGluZXNFbCA9IHRoaXMuZWxlbWVudC5maW5kKFwiLmxpbmVcIilcblx0XHR2YXIgcmFkaXVzID0gM1xuXHRcdHZhciBtYXJnaW4gPSAzMFxuXHRcdHRoaXMubGluZVNpemUgPSBBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKVxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrbm90c0VsLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9ICQoa25vdHNFbFtpXSlcblx0XHRcdGtub3QuYXR0cigncicsIHJhZGl1cylcblx0XHR9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXNFbC5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGxpbmUgPSAkKGxpbmVzRWxbaV0pXG5cdFx0XHRsaW5lLmNzcygnc3Ryb2tlLXdpZHRoJywgdGhpcy5saW5lU2l6ZSlcblx0XHR9O1xuXG5cdFx0dmFyIHN0YXJ0WCA9IG1hcmdpbiA+PiAxXG5cdFx0dmFyIHN0YXJ0WSA9IG1hcmdpblxuXHRcdHZhciBvZmZzZXRVcERvd24gPSAwLjZcblx0XHQkKGtub3RzRWwuZ2V0KDApKS5hdHRyKHtcblx0XHRcdCdjeCc6IHN0YXJ0WCArIDAsXG5cdFx0XHQnY3knOiBzdGFydFkgKyAwXG5cdFx0fSlcblx0XHQkKGtub3RzRWwuZ2V0KDEpKS5hdHRyKHtcblx0XHRcdCdjeCc6IHN0YXJ0WCArIG1hcmdpbixcblx0XHRcdCdjeSc6IHN0YXJ0WSArIDBcblx0XHR9KVxuXHRcdCQoa25vdHNFbC5nZXQoMikpLmF0dHIoe1xuXHRcdFx0J2N4Jzogc3RhcnRYICsgKG1hcmdpbioyKSxcblx0XHRcdCdjeSc6IHN0YXJ0WSArIDBcblx0XHR9KVxuXHRcdCQoa25vdHNFbC5nZXQoMykpLmF0dHIoe1xuXHRcdFx0J2N4Jzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0XHQnY3knOiBzdGFydFkgLSAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdH0pXG5cdFx0JChrbm90c0VsLmdldCg0KSkuYXR0cih7XG5cdFx0XHQnY3gnOiBzdGFydFggKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKSxcblx0XHRcdCdjeSc6IHN0YXJ0WSArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pXG5cdFx0fSlcblx0XHQkKGxpbmVzRWwuZ2V0KDApKS5hdHRyKHtcblx0XHRcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0XHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdFx0J3gyJzogc3RhcnRYICsgbWFyZ2luLFxuXHRcdFx0J3kyJzogc3RhcnRZICsgMFxuXHRcdH0pXG5cdFx0JChsaW5lc0VsLmdldCgxKSkuYXR0cih7XG5cdFx0XHQneDEnOiBzdGFydFggKyBtYXJnaW4sXG5cdFx0XHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdFx0J3gyJzogc3RhcnRYICsgKG1hcmdpbioyKSxcblx0XHRcdCd5Mic6IHN0YXJ0WSArIDBcblx0XHR9KVxuXHRcdCQobGluZXNFbC5nZXQoMikpLmF0dHIoe1xuXHRcdFx0J3gxJzogc3RhcnRYICsgMCxcblx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHQneDInOiBzdGFydFggKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKSxcblx0XHRcdCd5Mic6IHN0YXJ0WSAtIChtYXJnaW4gKiBvZmZzZXRVcERvd24pXG5cdFx0fSlcblx0XHQkKGxpbmVzRWwuZ2V0KDMpKS5hdHRyKHtcblx0XHRcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0XHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdFx0J3gyJzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0XHQneTInOiBzdGFydFkgKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdH0pXG5cblx0XHR2YXIgb2Zmc2V0ID0gMTBcblx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzBdLCAxLCB7IHg6LW9mZnNldCsocmFkaXVzID4+IDEpLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFsxXSwgMSwgeyB4Oi1vZmZzZXQsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzJdLCAxLCB7IHg6LW9mZnNldCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMF0sIDEsIHsgc2NhbGVYOjEuMSwgeDotb2Zmc2V0LCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFsxXSwgMSwgeyBzY2FsZVg6MS4xLCB4Oi1vZmZzZXQsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhsaW5lc0VsWzJdLCAxLCB7IHg6LW9mZnNldCwgcm90YXRpb246JzEwZGVnJywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzAlIDEwMCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbM10sIDEsIHsgeDotb2Zmc2V0LCByb3RhdGlvbjonLTEwZGVnJywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzAlIDAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzNdLCAxLCB7IHg6LW9mZnNldC8yLCB5OihvZmZzZXQvMiktcmFkaXVzLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFs0XSwgMSwgeyB4Oi1vZmZzZXQvMiwgeTotKG9mZnNldC8yKStyYWRpdXMsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblxuXHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFswXSwgMSwgeyB4OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbMV0sIDEsIHsgeDowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhrbm90c0VsWzJdLCAxLCB7IHg6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdXQudG8obGluZXNFbFswXSwgMSwgeyBzY2FsZVg6MSwgeDowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzFdLCAxLCB7IHNjYWxlWDoxLCB4OjAsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMl0sIDEsIHsgeDowLCByb3RhdGlvbjonMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAxMDAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbM10sIDEsIHsgeDowLCByb3RhdGlvbjonMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhrbm90c0VsWzNdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhrbm90c0VsWzRdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cblx0XHRzd2l0Y2godGhpcy5kaXJlY3Rpb24pIHtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxFRlQ6XG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5SSUdIVDpcblx0XHRcdFx0VHdlZW5NYXguc2V0KHRoaXMuZWxlbWVudCwgeyByb3RhdGlvbjonMTgwZGVnJywgdHJhbnNmb3JtT3JpZ2luOiAnNTAlIDUwJScgfSlcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlRPUDpcblx0XHRcdFx0VHdlZW5NYXguc2V0KHRoaXMuZWxlbWVudCwgeyByb3RhdGlvbjonOTBkZWcnLCB0cmFuc2Zvcm1PcmlnaW46ICc1MCUgNTAlJyB9KVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuQk9UVE9NOlxuXHRcdFx0XHRUd2Vlbk1heC5zZXQodGhpcy5lbGVtZW50LCB7IHJvdGF0aW9uOictOTBkZWcnLCB0cmFuc2Zvcm1PcmlnaW46ICc1MCUgNTAlJyB9KVxuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHRoaXMudGxPdmVyLnBhdXNlKDApXG5cdFx0dGhpcy50bE91dC5wYXVzZSgwKVxuXG5cdFx0dGhpcy5yb2xsb3ZlciA9IHRoaXMucm9sbG92ZXIuYmluZCh0aGlzKVxuXHRcdHRoaXMucm9sbG91dCA9IHRoaXMucm9sbG91dC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5jbGljayA9IHRoaXMuY2xpY2suYmluZCh0aGlzKVxuXHRcdHRoaXMuZWxlbWVudC5vbignbW91c2VlbnRlcicsIHRoaXMucm9sbG92ZXIpXG5cdFx0dGhpcy5lbGVtZW50Lm9uKCdtb3VzZWxlYXZlJywgdGhpcy5yb2xsb3V0KVxuXHRcdGlmKHRoaXMuYnRuQ2xpY2tlZCAhPSB1bmRlZmluZWQpIHRoaXMuZWxlbWVudC5vbignY2xpY2snLCB0aGlzLmNsaWNrKVxuXG5cdFx0dGhpcy53aWR0aCA9IG1hcmdpbiAqIDNcblx0XHR0aGlzLmhlaWdodCA9IG1hcmdpbiAqIDJcblx0XHR0aGlzLmVsZW1lbnQuY3NzKHtcblx0XHRcdHdpZHRoOiB0aGlzLndpZHRoLFxuXHRcdFx0aGVpZ2h0OiB0aGlzLmhlaWdodFxuXHRcdH0pXG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMuZWxlbWVudC5jc3Moe1xuXHRcdFx0bGVmdDogeCxcblx0XHRcdHRvcDogeVxuXHRcdH0pXG5cdH1cblx0Y2xpY2soZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMuYnRuQ2xpY2tlZCh0aGlzLmRpcmVjdGlvbilcblx0fVxuXHRyb2xsb3V0KGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLm1vdXNlT3V0KClcdFxuXHR9XG5cdHJvbGxvdmVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLm1vdXNlT3ZlcigpXHRcblx0fVxuXHRtb3VzZU92ZXIoKSB7XG5cdFx0dGhpcy50bE91dC5raWxsKClcblx0XHR0aGlzLnRsT3Zlci5wbGF5KDApXG5cdH1cblx0bW91c2VPdXQoKSB7XG5cdFx0dGhpcy50bE92ZXIua2lsbCgpXG5cdFx0dGhpcy50bE91dC5wbGF5KDApXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdmVyKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VUaW1lbGluZSh0aGlzLnRsT3V0KVxuXHRcdHRoaXMuZWxlbWVudC5vZmYoJ21vdXNlZW50ZXInLCB0aGlzLnJvbGxvdmVyKVxuXHRcdHRoaXMuZWxlbWVudC5vZmYoJ21vdXNlbGVhdmUnLCB0aGlzLnJvbGxvdXQpXG5cdFx0dGhpcy5lbGVtZW50Lm9mZignY2xpY2snLCB0aGlzLmNsaWNrKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVBsYW5ldFBhZ2UgZnJvbSAnQmFzZVBsYW5ldFBhZ2UnXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IFNjcm9sbEJhciBmcm9tICdTY3JvbGxCYXInXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJhc2VDYW1wYWlnblBhZ2UgZXh0ZW5kcyBCYXNlUGxhbmV0UGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0cHJvcHMuZGF0YS5pc01vYmlsZSA9IEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlXG5cblx0XHRzdXBlcihwcm9wcylcblx0XHR0aGlzLnB4U2Nyb2xsQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMucHhTY3JvbGxDb250YWluZXIpXG5cdFx0dGhpcy5wYWdlSGVpZ2h0ID0gMFxuXHRcdHRoaXMuc2Nyb2xsVGFyZ2V0ID0gMFxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuc2Nyb2xsRWwgPSB0aGlzLmNoaWxkLmZpbmQoXCIuaW50ZXJmYWNlLmFic29sdXRlXCIpLmdldCgwKVxuXG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB7XG5cdFx0XHR0aGlzLm9uV2hlZWwgPSB0aGlzLm9uV2hlZWwuYmluZCh0aGlzKVxuXHRcdFx0JCh3aW5kb3cpLm9uKFwibW91c2V3aGVlbFwiLCB0aGlzLm9uV2hlZWwpXG5cdFx0XHR0aGlzLnNjcm9sbFRhcmdldCA9IDBcblx0XHRcdHRoaXMubGFzdFNjcm9sbFkgPSAwXG5cdFx0XHR0aGlzLnNjcm9sbEVhc2UgPSAwLjFcblxuXHRcdFx0dGhpcy5vblNjcm9sbFRhcmdldCA9IHRoaXMub25TY3JvbGxUYXJnZXQuYmluZCh0aGlzKVxuXHRcdFx0dmFyIHNjcm9sbEVsID0gdGhpcy5jaGlsZC5maW5kKCcjc2Nyb2xsYmFyLXZpZXcnKVxuXHRcdFx0dGhpcy5zY3JvbGxiYXIgPSBuZXcgU2Nyb2xsQmFyKHNjcm9sbEVsKVxuXHRcdFx0dGhpcy5zY3JvbGxiYXIuc2Nyb2xsVGFyZ2V0SGFuZGxlciA9IHRoaXMub25TY3JvbGxUYXJnZXRcblx0XHRcdHRoaXMuc2Nyb2xsYmFyLmNvbXBvbmVudERpZE1vdW50KClcblx0XHR9XG5cblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cblx0fVxuXHRvblNjcm9sbFRhcmdldCh2YWwpIHtcblx0XHR0aGlzLnNjcm9sbFRhcmdldENoYW5nZWQodmFsKVxuXHR9XG5cdHNjcm9sbFRhcmdldENoYW5nZWQodmFsKSB7XG5cdFx0dGhpcy5zY3JvbGxUYXJnZXQgPSB2YWxcbiAgICAgICAgdGhpcy5hcHBseVNjcm9sbEJvdW5kcygpXG4gICAgICAgIHRoaXMuc2Nyb2xsYmFyLnNldFNjcm9sbFRhcmdldCh0aGlzLnNjcm9sbFRhcmdldClcblx0fVxuXHRvbldoZWVsKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgZGVsdGEgPSBlLndoZWVsRGVsdGFcblx0XHR2YXIgdmFsdWUgPSAtKGUuZGVsdGFZICogZS5kZWx0YUZhY3RvcilcbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxUYXJnZXQodmFsdWUpXG5cdH1cblx0dXBkYXRlU2Nyb2xsVGFyZ2V0KHZhbHVlKSB7XG5cdFx0dGhpcy5zY3JvbGxUYXJnZXQgKz0gdmFsdWVcbiAgICAgICAgdGhpcy5hcHBseVNjcm9sbEJvdW5kcygpXG4gICAgICAgIHRoaXMuc2Nyb2xsYmFyLnNldFNjcm9sbFRhcmdldCh0aGlzLnNjcm9sbFRhcmdldClcblx0fVxuXHRhcHBseVNjcm9sbEJvdW5kcygpIHtcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dGhpcy5zY3JvbGxUYXJnZXQgPSAodGhpcy5zY3JvbGxUYXJnZXQgPCAwKSA/IDAgOiB0aGlzLnNjcm9sbFRhcmdldFxuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldCA9ICh0aGlzLnNjcm9sbFRhcmdldCArIHdpbmRvd0ggPiB0aGlzLnBhZ2VIZWlnaHQpID8gKHRoaXMucGFnZUhlaWdodCAtIHdpbmRvd0gpIDogdGhpcy5zY3JvbGxUYXJnZXRcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB7XG5cdFx0XHR0aGlzLmxhc3RTY3JvbGxZICs9ICh0aGlzLnNjcm9sbFRhcmdldCAtIHRoaXMubGFzdFNjcm9sbFkpICogdGhpcy5zY3JvbGxFYXNlXG5cdFx0XHRVdGlscy5UcmFuc2xhdGUodGhpcy5zY3JvbGxFbCwgMCwgLXRoaXMubGFzdFNjcm9sbFksIDApXG5cdFx0XHR0aGlzLnB4U2Nyb2xsQ29udGFpbmVyLnkgPSAtdGhpcy5sYXN0U2Nyb2xsWVxuXHRcdFx0dGhpcy5zY3JvbGxiYXIudXBkYXRlKClcblx0XHR9XHRcblx0fVxuXHRyZXNpemUoKSB7XG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgIHtcblx0XHRcdHN1cGVyLnJlc2l6ZSgpXG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0XHR0aGlzLnNjcm9sbGJhci5wYWdlSGVpZ2h0ID0gdGhpcy5wYWdlSGVpZ2h0IC0gd2luZG93SFxuXHQgICAgICAgIHRoaXMuc2Nyb2xsYmFyLnJlc2l6ZSgpXG5cdCAgICAgICAgc3VwZXIucmVzaXplKClcblx0XHR9XG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB0aGlzLnNjcm9sbGJhci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5weFNjcm9sbENvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnB4U2Nyb2xsQ29udGFpbmVyKVxuXHRcdCQod2luZG93KS5vZmYoXCJtb3VzZXdoZWVsXCIsIHRoaXMub25XaGVlbClcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBQYWdlIGZyb20gJ1BhZ2UnXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCYXNlUGxhbmV0UGFnZSBleHRlbmRzIFBhZ2Uge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKVxuXHRcdHRoaXMuZXhwZXJpZW5jZSA9IHVuZGVmaW5lZFxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLmV4cGVyaWVuY2UgIT0gdW5kZWZpbmVkKSB0aGlzLmV4cGVyaWVuY2UuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgU3ByaW5nR2FyZGVuIGZyb20gJ1NwcmluZ0dhcmRlbidcbmltcG9ydCBDb21wYXNzUmluZ3MgZnJvbSAnQ29tcGFzc1JpbmdzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb21wYXNzIHtcblx0Y29uc3RydWN0b3IocHhDb250YWluZXIsIHR5cGUpIHtcblx0XHR0aGlzLnB4Q29udGFpbmVyID0gcHhDb250YWluZXJcblx0XHR0aGlzLnR5cGUgPSB0eXBlIHx8IEFwcENvbnN0YW50cy5MQU5ESU5HXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5jb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5jb250YWluZXIpXG5cbiBcdFx0dGhpcy5yaW5ncyA9IG5ldyBDb21wYXNzUmluZ3ModGhpcy5jb250YWluZXIpXG5cdCBcdHRoaXMucmluZ3MuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdCBcdHRoaXMuc3ByaW5nR2FyZGVucyA9IFtdXG5cdCBcdHRoaXMuZ2V0UmFkaXVzKClcblx0fVxuXHR1cGRhdGVEYXRhKGRhdGEpIHtcblx0XHR0aGlzLnJlbW92ZVByZXZpb3VzU3ByaW5nR2FyZGVucygpXG5cdFx0dGhpcy5zcHJpbmdHYXJkZW5zID0gW11cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSBBcHBTdG9yZS5nZXRTcHJpbmdHYXJkZW4oKVxuXHRcdFx0dmFyIHByb2R1Y3QgPSBkYXRhW2ldXG5cdFx0XHR2YXIgY29sb3IgPSBwcm9kdWN0LmNvbG9yXG5cdFx0XHRzcHJpbmdHYXJkZW4uaWQgPSB0aGlzLmlkXG5cdFx0XHRzcHJpbmdHYXJkZW4ucmFkaXVzID0gdGhpcy5yYWRpdXNcblx0XHRcdHNwcmluZ0dhcmRlbi5rbm90UmFkaXVzID0gdGhpcy5rbm90UmFkaXVzXG5cdFx0XHRzcHJpbmdHYXJkZW4uY29tcG9uZW50RGlkTW91bnQocHJvZHVjdCwgdGhpcy50eXBlKVxuXHRcdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQoc3ByaW5nR2FyZGVuLmNvbnRhaW5lcilcblx0XHRcdHRoaXMuc3ByaW5nR2FyZGVuc1tpXSA9IHNwcmluZ0dhcmRlblxuXHRcdH1cblx0fVxuXHRyZW1vdmVQcmV2aW91c1NwcmluZ0dhcmRlbnMoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSB0aGlzLnNwcmluZ0dhcmRlbnNbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi5jbGVhcigpXG5cdFx0XHRzcHJpbmdHYXJkZW4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdFx0QXBwU3RvcmUucmVsZWFzZVNwcmluZ0dhcmRlbihzcHJpbmdHYXJkZW4pXG5cdFx0fVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoIDwgMSkgcmV0dXJuIFxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc3ByaW5nR2FyZGVucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IHRoaXMuc3ByaW5nR2FyZGVuc1tpXVxuXHRcdFx0c3ByaW5nR2FyZGVuLnVwZGF0ZSgpXG5cdFx0fVxuXHR9XG5cdGdldFJhZGl1cygpIHtcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIHNpemVQZXJjZW50YWdlID0gKHRoaXMudHlwZSA9PSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRSB8fCB0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkNBTVBBSUdOKSA/IEFwcENvbnN0YW50cy5DT01QQVNTX1NNQUxMX1NJWkVfUEVSQ0VOVEFHRSA6IEFwcENvbnN0YW50cy5DT01QQVNTX1NJWkVfUEVSQ0VOVEFHRVxuXHRcdHRoaXMucmFkaXVzID0gd2luZG93SCAqIHNpemVQZXJjZW50YWdlXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdH1cblx0d2lsbFRyYW5zaXRpb25PdXQoKSB7XG5cdH1cblx0dXBkYXRlUmFkaXVzKCkge1xuXHRcdHRoaXMuZ2V0UmFkaXVzKClcblx0XHR0aGlzLnJpbmdzLnJlc2l6ZSh0aGlzLnJhZGl1cylcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0aWYodGhpcy50eXBlID09IEFwcENvbnN0YW50cy5MQU5ESU5HKSB7XG5cdFx0XHR0aGlzLnVwZGF0ZVJhZGl1cygpXG5cdFx0fVxuXHRcdGlmKHRoaXMuc3ByaW5nR2FyZGVucy5sZW5ndGggPCAxKSByZXR1cm4gXG5cdCBcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zcHJpbmdHYXJkZW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc3ByaW5nR2FyZGVuID0gdGhpcy5zcHJpbmdHYXJkZW5zW2ldXG5cdFx0XHRzcHJpbmdHYXJkZW4ucmVzaXplKHRoaXMucmFkaXVzKVxuXHRcdH1cblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0dGhpcy5jb250YWluZXIueCA9IHhcblx0XHR0aGlzLmNvbnRhaW5lci55ID0geVxuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0c2NhbGUoeCwgeSkge1xuXHRcdHRoaXMuY29udGFpbmVyLnNjYWxlLnggPSB4XG5cdFx0dGhpcy5jb250YWluZXIuc2NhbGUueSA9IHlcblx0XHR0aGlzLnNjYWxlWCA9IHhcblx0XHR0aGlzLnNjYWxlWSA9IHlcdFxuXHR9XG5cdHBvc2l0aW9uRWxlbWVudCh4LCB5KSB7XG5cblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLmNvbnRhaW5lcilcblx0XHR0aGlzLnJlbW92ZVByZXZpb3VzU3ByaW5nR2FyZGVucygpXG5cdFx0dGhpcy5yaW5ncy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb21wYXNzUmluZ3Mge1xuXHRjb25zdHJ1Y3RvcihwYXJlbnRDb250YWluZXIpIHtcblx0XHR0aGlzLmNvbnRhaW5lciA9IHBhcmVudENvbnRhaW5lclxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMucmluZ3NDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHRcdHRoaXMudGl0bGVzQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnJpbmdzQ29udGFpbmVyKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMudGl0bGVzQ29udGFpbmVyKVxuXG5cdFx0dGhpcy5jaXJjbGVzID0gW11cblx0XHR2YXIgY2ljbGVzTGVuID0gNlxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY2ljbGVzTGVuOyBpKyspIHtcblx0XHRcdHZhciBnID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdFx0dGhpcy5jaXJjbGVzW2ldID0gZ1xuXHRcdFx0dGhpcy5yaW5nc0NvbnRhaW5lci5hZGRDaGlsZChnKVxuXHRcdH1cblxuXHRcdHRoaXMudGl0bGVzID0gW11cblx0XHR2YXIgZ2xvYmFsQ29udGVudCA9IEFwcFN0b3JlLmdsb2JhbENvbnRlbnQoKVxuXHRcdHZhciBlbGVtZW50cyA9IEFwcFN0b3JlLmVsZW1lbnRzT2ZOYXR1cmUoKVxuXHRcdHZhciBlbGVtZW50c1RleHRzID0gZ2xvYmFsQ29udGVudC5lbGVtZW50c1xuXHRcdHZhciBmb250U2l6ZSA9IDI2XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZWxlbWVudElkID0gZWxlbWVudHNbaV1cblx0XHRcdHZhciBlbGVtZW50VGl0bGUgPSBlbGVtZW50c1RleHRzW2VsZW1lbnRJZF0udG9VcHBlckNhc2UoKVxuXHRcdFx0dmFyIHR4dCA9IG5ldyBQSVhJLlRleHQoZWxlbWVudFRpdGxlLCB7IGZvbnQ6IGZvbnRTaXplICsgJ3B4IEZ1dHVyYUJvbGQnLCBmaWxsOiAnd2hpdGUnLCBhbGlnbjogJ2NlbnRlcicgfSlcblx0XHRcdHR4dC5hbmNob3IueCA9IDAuNVxuXHRcdFx0dHh0LmFuY2hvci55ID0gMC41XG5cdFx0XHR0aGlzLnRpdGxlc0NvbnRhaW5lci5hZGRDaGlsZCh0eHQpXG5cdFx0XHR0aGlzLnRpdGxlcy5wdXNoKHtcblx0XHRcdFx0dHh0OiB0eHQsXG5cdFx0XHRcdGRlZ0JlZ2luOiB0aGlzLmdldERlZ3JlZXNCZWdpbkZvclRpdGxlc0J5SWQoZWxlbWVudElkKSxcblx0XHRcdH0pXG5cdFx0fVxuXG5cdH1cblx0Z2V0RGVncmVlc0JlZ2luRm9yVGl0bGVzQnlJZChpZCkge1xuXHRcdC8vIGJlIGNhcmVmdWwgc3RhcnRzIGZyb20gY2VudGVyIC05MGRlZ1xuXHRcdHN3aXRjaChpZCkge1xuXHRcdFx0Y2FzZSAnZmlyZSc6IHJldHVybiAtMTMwXG5cdFx0XHRjYXNlICdlYXJ0aCc6IHJldHVybiAtNTBcblx0XHRcdGNhc2UgJ21ldGFsJzogcmV0dXJuIDE1XG5cdFx0XHRjYXNlICd3YXRlcic6IHJldHVybiA5MFxuXHRcdFx0Y2FzZSAnd29vZCc6IHJldHVybiAxNjVcblx0XHR9XG5cdH1cblx0ZHJhd1JpbmdzKCkge1xuXHRcdHZhciByYWRpdXNNYXJnaW4gPSB0aGlzLnJhZGl1cyAvIHRoaXMuY2lyY2xlcy5sZW5ndGhcblx0XHR2YXIgbGVuID0gdGhpcy5jaXJjbGVzLmxlbmd0aCArIDFcblx0XHR2YXIgbGFzdFI7XG5cdFx0dmFyIGxpbmVXID0gQXBwU3RvcmUuZ2V0TGluZVdpZHRoKClcblx0XHR2YXIgY29sb3IgPSAweGZmZmZmZlxuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdHZhciBnID0gdGhpcy5jaXJjbGVzW2ktMV1cblx0XHRcdHZhciByO1xuXG5cdFx0XHRnLmNsZWFyKClcblxuXHRcdFx0Ly8gcmFkaXVzIGRpZmZlcmVuY2VzXG5cdFx0XHRpZihpID09IDEpIHIgPSByYWRpdXNNYXJnaW4gKiAwLjE2XG5cdFx0XHRlbHNlIHIgPSBsYXN0UiArIHJhZGl1c01hcmdpblxuXG5cdFx0XHQvLyBsaW5lc1xuXHRcdFx0aWYoaT09Mykge1xuXHRcdFx0XHR0aGlzLmRyYXdBcm91bmRUaHJlZUdyb3VwTGluZXMobGFzdFIsIHIsIGcsIGxpbmVXLCBjb2xvcilcblx0XHRcdH1cblx0XHRcdGlmKGk9PTYpIHtcblx0XHRcdFx0dGhpcy5kcmF3QXJvdW5kRm91ckdyb3VwTGluZXMobGFzdFIsIHIsIGcsIGxpbmVXLCBjb2xvcilcblx0XHRcdFx0dGhpcy5kcmF3VGl0bGVzKHIsIGNvbG9yKVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBjaXJjbGVcblx0XHRcdHRoaXMuZHJhd0NpcmNsZShnLCByKVxuXG5cdFx0XHRsYXN0UiA9IHJcblx0XHR9XG5cdH1cblx0ZHJhd0Fyb3VuZFRocmVlR3JvdXBMaW5lcyhsYXN0UiwgbmV3UiwgZywgbGluZVcsIGNvbG9yKSB7XG5cdFx0dmFyIGxlZnRUaGV0YSA9ICg3ICogTWF0aC5QSSkgLyA2XG5cdFx0dmFyIHJpZ2h0VGhldGEgPSAoMTEgKiBNYXRoLlBJKSAvIDZcblx0XHRcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgMCwgLW5ld1IsIDAsIC1sYXN0Uilcblx0XHRcblx0XHR2YXIgZnJvbVggPSBuZXdSICogTWF0aC5jb3MobGVmdFRoZXRhKVxuXHRcdHZhciBmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4obGVmdFRoZXRhKVxuXHRcdHZhciB0b1ggPSBsYXN0UiAqIE1hdGguY29zKGxlZnRUaGV0YSlcblx0XHR2YXIgdG9ZID0gLWxhc3RSICogTWF0aC5zaW4obGVmdFRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXG5cdFx0ZnJvbVggPSBuZXdSICogTWF0aC5jb3MocmlnaHRUaGV0YSlcblx0XHRmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4ocmlnaHRUaGV0YSlcblx0XHR0b1ggPSBsYXN0UiAqIE1hdGguY29zKHJpZ2h0VGhldGEpXG5cdFx0dG9ZID0gLWxhc3RSICogTWF0aC5zaW4ocmlnaHRUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblx0fVxuXHRkcmF3QXJvdW5kRm91ckdyb3VwTGluZXMobGFzdFIsIG5ld1IsIGcsIGxpbmVXLCBjb2xvcikge1xuXHRcdHZhciBsZWZ0VG9wVGhldGEgPSAoMTEgKiBNYXRoLlBJKSAvIDEyXG5cdFx0dmFyIHJpZ2h0VG9wVGhldGEgPSBNYXRoLlBJIC8gMTJcblxuXHRcdHZhciBsZWZ0Qm90dG9tVGhldGEgPSAoNSAqIE1hdGguUEkpIC8gNFxuXHRcdHZhciByaWdodEJvdHRvbVRoZXRhID0gKDcgKiBNYXRoLlBJKSAvIDRcblx0XHRcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgMCwgLW5ld1IsIDAsIC1sYXN0Uilcblx0XHRcblx0XHR2YXIgZnJvbVggPSBuZXdSICogTWF0aC5jb3MobGVmdFRvcFRoZXRhKVxuXHRcdHZhciBmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4obGVmdFRvcFRoZXRhKVxuXHRcdHZhciB0b1ggPSBsYXN0UiAqIE1hdGguY29zKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgdG9ZID0gLWxhc3RSICogTWF0aC5zaW4obGVmdFRvcFRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXG5cdFx0ZnJvbVggPSBuZXdSICogTWF0aC5jb3MocmlnaHRUb3BUaGV0YSlcblx0XHRmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4ocmlnaHRUb3BUaGV0YSlcblx0XHR0b1ggPSBsYXN0UiAqIE1hdGguY29zKHJpZ2h0VG9wVGhldGEpXG5cdFx0dG9ZID0gLWxhc3RSICogTWF0aC5zaW4ocmlnaHRUb3BUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRCb3R0b21UaGV0YSlcblx0XHRmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4obGVmdEJvdHRvbVRoZXRhKVxuXHRcdHRvWCA9IGxhc3RSICogTWF0aC5jb3MobGVmdEJvdHRvbVRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0Qm90dG9tVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0Qm90dG9tVGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0Qm90dG9tVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cdH1cblx0ZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKSB7XG5cdFx0Zy5saW5lU3R5bGUobGluZVcsIGNvbG9yLCAxKVxuXHRcdGcuYmVnaW5GaWxsKGNvbG9yLCAwKVxuXHRcdGcubW92ZVRvKGZyb21YLCBmcm9tWSlcblx0XHRnLmxpbmVUbyh0b1gsIHRvWSlcblx0XHRnLmVuZEZpbGwoKVxuXHR9XG5cdGRyYXdDaXJjbGUoZywgcikge1xuXHRcdGcubGluZVN0eWxlKEFwcFN0b3JlLmdldExpbmVXaWR0aCgpLCAweGZmZmZmZiwgMSlcblx0XHRnLmJlZ2luRmlsbCgweGZmZmZmZiwgMClcblx0XHRcblx0XHRnLm1vdmVUbyhyLCAwKVxuXG5cdFx0dmFyIGFuZ2xlID0gMFxuXHRcdHZhciB4ID0gMFxuXHRcdHZhciB5ID0gMFxuXHRcdHZhciBnYXAgPSBNYXRoLm1pbigoMzAwIC8gdGhpcy5yYWRpdXMpICogNSwgMTApXG5cdFx0dmFyIHN0ZXBzID0gTWF0aC5yb3VuZCgzNjAgLyBnYXApXG5cdFx0Zm9yICh2YXIgaSA9IC0xOyBpIDwgc3RlcHM7IGkrKykge1xuXHRcdFx0YW5nbGUgPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKGkgKiBnYXApXG5cdFx0XHR4ID0gciAqIE1hdGguY29zKGFuZ2xlKVxuXHRcdFx0eSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRcdGcubGluZVRvKHgsIHkpXG5cdFx0fTtcblxuXHRcdC8vIGNsb3NlIGl0XG5cdFx0YW5nbGUgPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKDM2MClcblx0XHR4ID0gciAqIE1hdGguY29zKGFuZ2xlKVxuXHRcdHkgPSByICogTWF0aC5zaW4oYW5nbGUpXG5cdFx0Zy5saW5lVG8oeCwgeSlcblxuXHRcdGcuZW5kRmlsbCgpXG5cdH1cblx0ZHJhd1RpdGxlcyhyLCBjb2xvcikge1xuXHRcdHZhciB0aXRsZXMgPSB0aGlzLnRpdGxlc1xuXHRcdHZhciBvZmZzZXQgPSAodGhpcy5yYWRpdXMgLyAyNzApICogLTI1XG5cdFx0dmFyIHNjYWxlID0gKHRoaXMucmFkaXVzIC8gMjcwKSAqIDFcblx0XHR2YXIgciA9IHIgKyBvZmZzZXRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRpdGxlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHRpdGxlID0gdGl0bGVzW2ldXG5cdFx0XHR2YXIgYW5nbGUgPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKHRpdGxlLmRlZ0JlZ2luKVxuXHRcdFx0dGl0bGUudHh0LnJvdGF0aW9uID0gYW5nbGUgKyBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKDkwKVxuXHRcdFx0dGl0bGUudHh0LnggPSByICogTWF0aC5jb3MoYW5nbGUpXG5cdFx0XHR0aXRsZS50eHQueSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRcdHRpdGxlLnR4dC5zY2FsZS54ID0gc2NhbGVcblx0XHRcdHRpdGxlLnR4dC5zY2FsZS55ID0gc2NhbGVcblx0XHR9XG5cdH1cblx0cmVzaXplKHJhZGl1cykge1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnJhZGl1cyA9IHJhZGl1c1xuXHRcdHRoaXMuZHJhd1JpbmdzKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLnJpbmdzQ29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHR0aGlzLnRpdGxlc0NvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnJpbmdzQ29udGFpbmVyKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy50aXRsZXNDb250YWluZXIpXG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBDb21wYXNzIGZyb20gJ0NvbXBhc3MnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBTbWFsbENvbXBhc3MgZnJvbSAnU21hbGxDb21wYXNzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb21wYXNzZXNDb250YWluZXIge1xuXHRjb25zdHJ1Y3RvcihweENvbnRhaW5lciwgcGFyZW50RWwpIHtcblx0XHR0aGlzLnBhcmVudEVsID0gcGFyZW50RWxcblx0XHR0aGlzLnB4Q29udGFpbmVyID0gcHhDb250YWluZXJcblx0XHR0aGlzLmN1cnJlbnRJbmRleCA9IDBcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmNvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmNvbnRhaW5lcilcblxuXHRcdHRoaXMuY29tcGFzc2VzID0gW11cblxuXHRcdHRoaXMubWFpbkNvbXBhc3MgPSBuZXcgQ29tcGFzcyh0aGlzLmNvbnRhaW5lciwgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UpXG5cdFx0dGhpcy5tYWluQ29tcGFzcy5rbm90UmFkaXVzID0gQXBwQ29uc3RhbnRzLlNNQUxMX0tOT1RfUkFESVVTXG5cdFx0dGhpcy5tYWluQ29tcGFzcy5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0dGhpcy5tYWluQ29tcGFzcy5zdGF0ZSA9IEFwcENvbnN0YW50cy5PUEVOXG5cblx0XHR2YXIgaW5mb3MgPSBBcHBTdG9yZS5nZW5lcmFsSW5mb3NMYW5nU2NvcGUoKVxuXG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwbGFuZXQgPSBwbGFuZXRzW2ldXG5cdFx0XHR2YXIgc21hbGxDb21wYXNzID0gbmV3IFNtYWxsQ29tcGFzcyh0aGlzLmNvbnRhaW5lciwgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UpXG5cdFx0XHR2YXIgcGxhbmV0RGF0YSA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQocGxhbmV0KVxuXHRcdFx0c21hbGxDb21wYXNzLnN0YXRlID0gQXBwQ29uc3RhbnRzLkNMT1NFXG5cdFx0XHRzbWFsbENvbXBhc3MuaWQgPSBwbGFuZXRcblx0XHRcdHNtYWxsQ29tcGFzcy5jb21wb25lbnREaWRNb3VudChwbGFuZXREYXRhLCBwbGFuZXQsIHRoaXMucGFyZW50RWwsIGluZm9zLnBsYW5ldClcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldID0gc21hbGxDb21wYXNzXG5cdFx0XHRpZihwbGFuZXQgPT0gdGhpcy5pZCkge1xuXHRcdFx0XHR0aGlzLm1haW5Db21wYXNzLmlkID0gcGxhbmV0XG5cdFx0XHRcdHRoaXMub3BlbmVkQ29tcGFzc0luZGV4ID0gaVxuXHRcdFx0XHRzbWFsbENvbXBhc3Muc3RhdGUgPSBBcHBDb25zdGFudHMuT1BFTlxuXHRcdFx0XHR0aGlzLmNsb3NlQ29tcGFzcyhpKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQcm9kdWN0KClcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29tcGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc1tpXS5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpXG5cdFx0fTtcblx0XHR0aGlzLm1haW5Db21wYXNzLnVwZGF0ZVJhZGl1cygpXG5cdFx0dGhpcy5tYWluQ29tcGFzcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpXG5cdH1cblx0d2lsbFRyYW5zaXRpb25PdXQoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvbXBhc3Nlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5jb21wYXNzZXNbaV0ud2lsbFRyYW5zaXRpb25PdXQoKVxuXHRcdH07XHRcblx0XHR0aGlzLm1haW5Db21wYXNzLndpbGxUcmFuc2l0aW9uT3V0KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvbXBhc3Nlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5jb21wYXNzZXNbaV0udXBkYXRlKClcblx0XHR9O1xuXHRcdHRoaXMubWFpbkNvbXBhc3MudXBkYXRlKClcblx0fVxuXHR1cGRhdGVDb21wYXNzUHJvZHVjdCgpIHtcblx0XHR2YXIgcGxhbmV0RGF0YSA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQodGhpcy5pZClcblx0XHR2YXIgcHJvZHVjdERhdGEgPSBwbGFuZXREYXRhXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwcm9kdWN0RGF0YS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHByb2R1Y3QgPSBwcm9kdWN0RGF0YVtpXVxuXHRcdFx0aWYodGhpcy5jdXJyZW50SW5kZXggPT0gaSkge1xuXHRcdFx0XHRwcm9kdWN0LmhpZ2hsaWdodCA9IHRydWVcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRwcm9kdWN0LmhpZ2hsaWdodCA9IGZhbHNlXG5cdFx0XHR9XG5cdFx0fTtcblx0XHR0aGlzLm1haW5Db21wYXNzLnVwZGF0ZURhdGEocHJvZHVjdERhdGEpXG5cdH1cblx0Y2hhbmdlRGF0YShuZXdJZCkge1xuXHRcdHRoaXMuaWQgPSBuZXdJZFxuXHRcdHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcGxhbmV0ID0gcGxhbmV0c1tpXVxuXHRcdFx0dmFyIGNvbXBhc3MgPSB0aGlzLmNvbXBhc3Nlc1tpXVxuXHRcdFx0aWYocGxhbmV0ID09IHRoaXMuaWQpIHsgXG5cdFx0XHRcdHRoaXMubWFpbkNvbXBhc3MuaWQgPSBwbGFuZXRcblx0XHRcdFx0dGhpcy5vcGVuZWRDb21wYXNzSW5kZXggPSBpXG5cdFx0XHRcdGNvbXBhc3Muc3RhdGUgPSBBcHBDb25zdGFudHMuT1BFTlxuXHRcdFx0XHR0aGlzLmNsb3NlQ29tcGFzcyhpKVxuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdGNvbXBhc3Muc3RhdGUgPSBBcHBDb25zdGFudHMuQ0xPU0Vcblx0XHRcdFx0dGhpcy5vcGVuQ29tcGFzcyhpKVxuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLnJlc2l6ZSgpXG5cdFx0dGhpcy5wb3NpdGlvblRpdGxlRWxlbWVudHModGhpcy55KVxuXHRcdHRoaXMudXBkYXRlQ29tcGFzc1Byb2R1Y3QoKVxuXHR9XG5cdG9wZW5Db21wYXNzKGluZGV4KSB7XG5cdFx0dmFyIGNvbXBhc3MgPSB0aGlzLmNvbXBhc3Nlc1tpbmRleF1cblx0XHRjb21wYXNzLm9wYWNpdHkoMSlcblx0fVxuXHRjbG9zZUNvbXBhc3MoaW5kZXgpIHtcblx0XHR2YXIgY29tcGFzcyA9IHRoaXMuY29tcGFzc2VzW2luZGV4XVxuXHRcdGNvbXBhc3Mub3BhY2l0eSgwKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dmFyIGNvbXBhc3NlcyA9IHRoaXMuY29tcGFzc2VzXG5cdFx0dmFyIHRvdGFsVyA9IDBcblx0XHR2YXIgYmlnZ2VzdFJhZGl1cyA9IDBcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBhc3Nlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGNvbXBhc3MgPSBjb21wYXNzZXNbaV1cblx0XHRcdHZhciBzaXplID0gKGNvbXBhc3MucmFkaXVzIDw8IDEpXG5cdFx0XHR2YXIgcHJldmlvdXNDbXAgPSBjb21wYXNzZXNbaS0xXVxuXHRcdFx0dmFyIG5leHRDbXAgPSBjb21wYXNzZXNbaSsxXVxuXHRcdFx0dmFyIGN4ID0gdG90YWxXICsgdGhpcy5nZXRDb21wYXNzTWFyZ2luKGNvbXBhc3MpXG5cdFx0XHRjb21wYXNzLnJlc2l6ZSgpXG5cdFx0XHRiaWdnZXN0UmFkaXVzID0gYmlnZ2VzdFJhZGl1cyA8IGNvbXBhc3MucmFkaXVzID8gY29tcGFzcy5yYWRpdXMgOiBiaWdnZXN0UmFkaXVzXG5cdFx0XHRjb21wYXNzLnBvc2l0aW9uKGN4LCAwKVxuXHRcdFx0Y29tcGFzcy5wb3NYID0gY3hcblx0XHRcdHRvdGFsVyA9IGN4ICsgdGhpcy5nZXRDb21wYXNzTWFyZ2luKGNvbXBhc3MpXG5cblx0XHRcdGlmKGNvbXBhc3Muc3RhdGUgPT0gQXBwQ29uc3RhbnRzLk9QRU4pIHtcblx0XHRcdFx0dGhpcy5tYWluQ29tcGFzcy5wb3NpdGlvbihcblx0XHRcdFx0XHRjb21wYXNzLngsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5tYWluQ29tcGFzcy5yZXNpemUoKVxuXG5cdFx0dGhpcy53aWR0aCA9IHRvdGFsV1xuXHRcdHRoaXMuaGVpZ2h0ID0gYmlnZ2VzdFJhZGl1c1xuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHRcdHRoaXMuY29udGFpbmVyLnBvc2l0aW9uLnggPSB4XG5cdFx0dGhpcy5jb250YWluZXIucG9zaXRpb24ueSA9IHlcblx0XHR0aGlzLnBvc2l0aW9uVGl0bGVFbGVtZW50cyh5KVxuXHR9XG5cdHBvc2l0aW9uVGl0bGVFbGVtZW50cyh5KSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciBjb21wYXNzZXMgPSB0aGlzLmNvbXBhc3Nlc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29tcGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY29tcGFzcyA9IGNvbXBhc3Nlc1tpXVxuXHRcdFx0Y29tcGFzcy5wb3NpdGlvbkVsZW1lbnQoXG5cdFx0XHRcdGNvbXBhc3MucG9zWCArICh3aW5kb3dXID4+IDEpIC0gKHRoaXMud2lkdGggPj4gMSksXG5cdFx0XHRcdHlcblx0XHRcdClcblx0XHR9XG5cdH1cblx0Z2V0Q29tcGFzc01hcmdpbihjb21wYXNzKSB7XG5cdFx0cmV0dXJuIChjb21wYXNzLnN0YXRlID09IEFwcENvbnN0YW50cy5PUEVOKSA/IDE0MCA6IDgwXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvbXBhc3Nlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5jb21wYXNzZXNbaV0uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdH1cblx0XHR0aGlzLm1haW5Db21wYXNzLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLmNvbnRhaW5lcilcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICdGcm9udENvbnRhaW5lcl9oYnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcblxuY2xhc3MgRnJvbnRDb250YWluZXIgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHR9XG5cdHJlbmRlcihwYXJlbnQpIHtcblx0XHR2YXIgc2NvcGUgPSB7fVxuXHRcdHZhciBnZW5lcmFJbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvcygpXG5cdFx0c2NvcGUuaW5mb3MgPSBBcHBTdG9yZS5nZW5lcmFsSW5mb3NMYW5nU2NvcGUoKVxuXHRcdHNjb3BlLmZhY2Vib29rVXJsID0gZ2VuZXJhSW5mb3NbJ2ZhY2Vib29rX3VybCddXG5cdFx0c2NvcGUudHdpdHRlclVybCA9IGdlbmVyYUluZm9zWyd0d2l0dGVyX3VybCddXG5cdFx0c2NvcGUuaW5zdGFncmFtVXJsID0gZ2VuZXJhSW5mb3NbJ2luc3RhZ3JhbV91cmwnXVxuXHRcdHNjb3BlLmxhYlVybCA9IGdlbmVyYUluZm9zWydsYWJfdXJsJ11cblx0XHRzY29wZS5tZW5TaG9wVXJsID0gJ2h0dHA6Ly93d3cuY2FtcGVyLmNvbS8nK0pTX2xhbmcrJ18nK0pTX2NvdW50cnkrJy9tZW4vc2hvZXMvbmV3LWNvbGxlY3Rpb24nXG5cdFx0c2NvcGUud29tZW5TaG9wVXJsID0gJ2h0dHA6Ly93d3cuY2FtcGVyLmNvbS8nK0pTX2xhbmcrJ18nK0pTX2NvdW50cnkrJy93b21lbi9zaG9lcy9uZXctY29sbGVjdGlvbidcblx0XHRzY29wZS5sZWdhbFVybCA9ICdodHRwOi8vd3d3LmNhbXBlci5jb20vaHRtbC9sZWdhbC9wcml2YWN5XycrSlNfbGFuZysnLmh0bWwnXG5cdFx0c2NvcGUuaXNNb2JpbGUgPSBBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZVxuXG5cdFx0aWYoc2NvcGUuaXNNb2JpbGUpIHtcblx0XHRcdHNjb3BlLm1vYmlsZU1lbnUgPSBbXG5cdFx0XHRcdHsgaWQ6J2hvbWUnLCBuYW1lOnNjb3BlLmluZm9zWydob21lX3R4dCddLCB1cmw6JyMhL2xhbmRpbmcnIH0sXG5cdFx0XHRcdHsgaWQ6J3Nob3AtbWVuJywgbmFtZTpzY29wZS5pbmZvc1snc2hvcF90aXRsZSddICsgJyAnICsgc2NvcGUuaW5mb3NbJ3Nob3BfbWVuJ10sIHVybDpzY29wZS5tZW5TaG9wVXJsIH0sXG5cdFx0XHRcdHsgaWQ6J3Nob3Atd29tZW4nLCBuYW1lOnNjb3BlLmluZm9zWydzaG9wX3RpdGxlJ10gKyAnICcgKyBzY29wZS5pbmZvc1snc2hvcF93b21lbiddLCB1cmw6c2NvcGUud29tZW5TaG9wVXJsIH0sXG5cdFx0XHRcdHsgaWQ6J2xhYicsIG5hbWU6c2NvcGUuaW5mb3NbJ2NhbXBlcl9sYWInXSwgdXJsOnNjb3BlLmxhYlVybCB9LFxuXHRcdFx0XHR7IGlkOidsZWdhbCcsIG5hbWU6c2NvcGUuaW5mb3NbJ2xlZ2FsJ10sIHVybDpzY29wZS5sZWdhbFVybCB9LFxuXHRcdFx0XVxuXHRcdH1cblxuXHRcdHN1cGVyLnJlbmRlcignRnJvbnRDb250YWluZXInLCBwYXJlbnQsIHRlbXBsYXRlLCBzY29wZSlcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5tb2JpbGUgPSB7XG5cdFx0XHRcdG1lbnVJc09wZW5lZDogZmFsc2UsXG5cdFx0XHRcdGVsOiB0aGlzLmNoaWxkLmZpbmQoJy5tb2JpbGUtbWVudScpLFxuXHRcdFx0XHRidXJnZXI6IHRoaXMuY2hpbGQuZmluZCgnLmJ1cmdlcicpLFxuXHRcdFx0XHRzbGlkZW1lbnU6IHRoaXMuY2hpbGQuZmluZCgnLm1lbnUtc2xpZGVyJyksXG5cdFx0XHRcdG1haW5NZW51OiB0aGlzLmNoaWxkLmZpbmQoJ3VsLm1haW4tbWVudScpLFxuXHRcdFx0XHRzb2NpYWxNZW51OiB0aGlzLmNoaWxkLmZpbmQoJ3VsLnNvY2lhbC1tZW51Jylcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLiRzb2NpYWxXcmFwcGVyID0gdGhpcy5jaGlsZC5maW5kKCcjc29jaWFsLXdyYXBwZXInKVxuXHRcdHRoaXMuJHNvY2lhbFRpdGxlID0gdGhpcy4kc29jaWFsV3JhcHBlci5maW5kKCcuc29jaWFsLXRpdGxlJylcblx0XHR0aGlzLiRzb2NpYWxJY29uc0NvbnRhaW5lciA9IHRoaXMuJHNvY2lhbFdyYXBwZXIuZmluZCgndWwnKVxuXHRcdHRoaXMuJHNvY2lhbEJ0bnMgPSB0aGlzLiRzb2NpYWxXcmFwcGVyLmZpbmQoJ2xpJylcblx0XHR0aGlzLiRjYW1wZXJMYWIgPSB0aGlzLmNoaWxkLmZpbmQoJy5jYW1wZXItbGFiJylcblx0XHR0aGlzLiRsZWdhbCA9IHRoaXMuY2hpbGQuZmluZCgnLmxlZ2FsJylcblx0XHR0aGlzLiRzaG9wID0gdGhpcy5jaGlsZC5maW5kKCcuc2hvcC13cmFwcGVyJylcblx0XHR0aGlzLiRob21lID0gdGhpcy5jaGlsZC5maW5kKCcuaG9tZS1idG4nKVxuXHRcdHRoaXMuY291bnRyaWVzSCA9IDBcblxuXHRcdHRoaXMub25TdWJNZW51TW91c2VFbnRlciA9IHRoaXMub25TdWJNZW51TW91c2VFbnRlci5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vblN1Yk1lbnVNb3VzZUxlYXZlID0gdGhpcy5vblN1Yk1lbnVNb3VzZUxlYXZlLmJpbmQodGhpcylcblx0XHR0aGlzLiRzaG9wLm9uKCdtb3VzZWVudGVyJywgdGhpcy5vblN1Yk1lbnVNb3VzZUVudGVyKVxuXHRcdHRoaXMuJHNob3Aub24oJ21vdXNlbGVhdmUnLCB0aGlzLm9uU3ViTWVudU1vdXNlTGVhdmUpXG5cblx0XHR0aGlzLm9uU29jaWFsTW91c2VFbnRlciA9IHRoaXMub25Tb2NpYWxNb3VzZUVudGVyLmJpbmQodGhpcylcblx0XHR0aGlzLm9uU29jaWFsTW91c2VMZWF2ZSA9IHRoaXMub25Tb2NpYWxNb3VzZUxlYXZlLmJpbmQodGhpcylcblx0XHR0aGlzLiRzb2NpYWxXcmFwcGVyLm9uKCdtb3VzZWVudGVyJywgdGhpcy5vblNvY2lhbE1vdXNlRW50ZXIpXG5cdFx0dGhpcy4kc29jaWFsV3JhcHBlci5vbignbW91c2VsZWF2ZScsIHRoaXMub25Tb2NpYWxNb3VzZUxlYXZlKVxuXG5cdFx0dGhpcy5zb2NpYWxUbCA9IG5ldyBUaW1lbGluZU1heCgpXG5cdFx0dGhpcy5zb2NpYWxUbC5zdGFnZ2VyRnJvbSh0aGlzLiRzb2NpYWxCdG5zLCAxLCB7IHNjYWxlOjAsIHk6MTAsIGZvcmNlM0Q6dHJ1ZSwgb3BhY2l0eTowLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwLjAxLCAwKVxuXHRcdHRoaXMuc29jaWFsVGwuZnJvbSh0aGlzLiRzb2NpYWxJY29uc0NvbnRhaW5lciwgMSwgeyB5OjMwLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMuc29jaWFsVGwucGF1c2UoMClcblxuXHRcdHRoaXMucmVzaXplKClcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB7XG5cdFx0XHR0aGlzLmluaXRNb2JpbGUoKVxuXHRcdH1cblx0fVxuXHRpbml0TW9iaWxlKCkge1xuXHRcdHRoaXMub25CdXJnZXJDbGlja2VkID0gdGhpcy5vbkJ1cmdlckNsaWNrZWQuYmluZCh0aGlzKVxuXHRcdHRoaXMubW9iaWxlLmJ1cmdlci5vbignY2xpY2snLCB0aGlzLm9uQnVyZ2VyQ2xpY2tlZClcblxuXHRcdHRoaXMubW9iaWxlLnRsID0gbmV3IFRpbWVsaW5lTWF4KClcblx0XHR0aGlzLm1vYmlsZS50bC5mcm9tKHRoaXMubW9iaWxlLnNsaWRlbWVudSwgMC42LCB7IHNjYWxlOjEuMSwgb3BhY2l0eTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0dGhpcy5tb2JpbGUudGwucGF1c2UoMClcblx0fVxuXHRvbkJ1cmdlckNsaWNrZWQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdGlmKHRoaXMubW9iaWxlLm1lbnVJc09wZW5lZCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMubW9iaWxlLnNsaWRlVGltZW91dClcblx0XHRcdHRoaXMubW9iaWxlLnNsaWRlVGltZW91dCA9IHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdFx0dGhpcy5tb2JpbGUuc2xpZGVtZW51LmNzcygndG9wJywgLTMwMDApXG5cdFx0XHR9LCA5MDApXG5cdFx0XHR0aGlzLm1vYmlsZS50bC50aW1lU2NhbGUoMS40KS5yZXZlcnNlKClcblx0XHRcdHRoaXMubW9iaWxlLm1lbnVJc09wZW5lZCA9IGZhbHNlXG5cdFx0fWVsc2V7XG5cdFx0XHR0aGlzLm1vYmlsZS5zbGlkZW1lbnUuY3NzKCd0b3AnLCAwKVxuXHRcdFx0dGhpcy5yZXNpemVNb2JpbGUoKVxuXHRcdFx0dGhpcy5tb2JpbGUudGwudGltZVNjYWxlKDEpLnBsYXkoKVxuXHRcdFx0dGhpcy5tb2JpbGUubWVudUlzT3BlbmVkID0gdHJ1ZVxuXHRcdH1cblx0fVxuXHRvblNvY2lhbE1vdXNlRW50ZXIoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdGNsZWFyVGltZW91dCh0aGlzLnNvY2lhbEJ0blRpbWVvdXQpXG5cdFx0dGhpcy5zb2NpYWxUbC50aW1lU2NhbGUoMSkucGxheSgpXG5cdH1cblx0b25Tb2NpYWxNb3VzZUxlYXZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRjbGVhclRpbWVvdXQodGhpcy5zb2NpYWxCdG5UaW1lb3V0KVxuXHRcdHRoaXMuc29jaWFsQnRuVGltZW91dCA9IHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuc29jaWFsVGwudGltZVNjYWxlKDEuOCkucmV2ZXJzZSgpXG5cdFx0fSwgNDAwKVxuXHR9XG5cdG9uU3ViTWVudU1vdXNlRW50ZXIoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cdFx0JHRhcmdldC5hZGRDbGFzcygnaG92ZXJlZCcpXG5cdH1cblx0b25TdWJNZW51TW91c2VMZWF2ZShlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dmFyICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblx0XHQkdGFyZ2V0LnJlbW92ZUNsYXNzKCdob3ZlcmVkJylcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0aWYoIXRoaXMuZG9tSXNSZWFkeSkgcmV0dXJuXG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHRoaXMuY291bnRyaWVzSCA9IDYwXG5cdFx0dGhpcy5jb3VudHJpZXNUaXRsZUggPSAyMFxuXG5cdFx0dmFyIHNvY2lhbENzcyA9IHtcblx0XHRcdGxlZnQ6IHdpbmRvd1cgLSBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgLSB0aGlzLiRzb2NpYWxUaXRsZS53aWR0aCgpLFxuXHRcdFx0dG9wOiB3aW5kb3dIIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kc29jaWFsVGl0bGUuaGVpZ2h0KCksXG5cdFx0fVxuXHRcdHZhciBzb2NpYWxJY29uc0NzcyA9IHtcblx0XHRcdGxlZnQ6ICh0aGlzLiRzb2NpYWxUaXRsZS53aWR0aCgpID4+IDEpIC0gKHRoaXMuJHNvY2lhbEljb25zQ29udGFpbmVyLndpZHRoKCkgPj4gMSksXG5cdFx0XHR0b3A6IC10aGlzLiRzb2NpYWxJY29uc0NvbnRhaW5lci5oZWlnaHQoKSAtIDIwXG5cdFx0fVxuXHRcdHZhciBjYW1wZXJMYWJDc3MgPSB7XG5cdFx0XHRsZWZ0OiB3aW5kb3dXIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kY2FtcGVyTGFiLndpZHRoKCksXG5cdFx0XHR0b3A6IEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCxcblx0XHR9XG5cdFx0dmFyIHNob3BDc3MgPSB7XG5cdFx0XHRsZWZ0OiBjYW1wZXJMYWJDc3MubGVmdCAtIHRoaXMuJHNob3Aud2lkdGgoKSAtIChBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQpLFxuXHRcdFx0dG9wOiBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQsXG5cdFx0fVxuXHRcdHZhciBob21lQ3NzID0ge1xuXHRcdFx0bGVmdDogc2hvcENzcy5sZWZ0IC0gdGhpcy4kaG9tZS53aWR0aCgpIC0gKEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCksXG5cdFx0XHR0b3A6IEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCxcblx0XHR9XG5cdFx0dmFyIGxlZ2FsQ3NzID0ge1xuXHRcdFx0bGVmdDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdFx0dG9wOiB3aW5kb3dIIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kbGVnYWwuaGVpZ2h0KCksXHRcblx0XHR9XG5cblx0XHR0aGlzLiRzb2NpYWxXcmFwcGVyLmNzcyhzb2NpYWxDc3MpXG5cdFx0dGhpcy4kY2FtcGVyTGFiLmNzcyhjYW1wZXJMYWJDc3MpXG5cdFx0dGhpcy4kc2hvcC5jc3Moc2hvcENzcylcblx0XHR0aGlzLiRzb2NpYWxJY29uc0NvbnRhaW5lci5jc3Moc29jaWFsSWNvbnNDc3MpXG5cdFx0dGhpcy4kaG9tZS5jc3MoaG9tZUNzcylcblx0XHR0aGlzLiRsZWdhbC5jc3MobGVnYWxDc3MpXG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0dGhpcy5yZXNpemVNb2JpbGUoKVxuXHRcdH1cblx0fVxuXHRyZXNpemVNb2JpbGUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR2YXIgYnVyZ2VyQ3NzID0ge1xuXHRcdFx0bGVmdDogd2luZG93VyAtIHRoaXMubW9iaWxlLmJ1cmdlci53aWR0aCgpIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdFx0dG9wOiBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkRcblx0XHR9XG5cdFx0dmFyIHNsaWRlbWVudUNzcyA9IHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXLFxuXHRcdFx0aGVpZ2h0OiB3aW5kb3dIXG5cdFx0fVxuXHRcdHZhciBtYWluTWVudVcgPSB0aGlzLm1vYmlsZS5tYWluTWVudS53aWR0aCgpXG5cdFx0dmFyIG1haW5NZW51SCA9IHRoaXMubW9iaWxlLm1haW5NZW51LmhlaWdodCgpXG5cdFx0dmFyIG1haW5NZW51Q3NzID0ge1xuXHRcdFx0dG9wOiAod2luZG93SCA+PiAxKSAtIChtYWluTWVudUggPj4gMSkgLSAobWFpbk1lbnVIICogMC4xKSxcblx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKG1haW5NZW51VyA+PiAxKVxuXHRcdH1cblx0XHR2YXIgc29jaWFsTWVudUNzcyA9IHtcblx0XHRcdHRvcDogbWFpbk1lbnVDc3MudG9wICsgbWFpbk1lbnVIICsgMTAsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtICh0aGlzLm1vYmlsZS5zb2NpYWxNZW51LndpZHRoKCkgPj4gMSlcblx0XHR9XG5cdFx0dGhpcy5tb2JpbGUuc2xpZGVtZW51LmNzcyhzbGlkZW1lbnVDc3MpXG5cdFx0dGhpcy5tb2JpbGUuYnVyZ2VyLmNzcyhidXJnZXJDc3MpXG5cdFx0dGhpcy5tb2JpbGUubWFpbk1lbnUuY3NzKG1haW5NZW51Q3NzKVxuXHRcdHRoaXMubW9iaWxlLnNvY2lhbE1lbnUuY3NzKHNvY2lhbE1lbnVDc3MpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZyb250Q29udGFpbmVyXG5cblxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBLbm90IHtcblx0Y29uc3RydWN0b3Ioc3ByaW5nQ29udGFpbmVyLCByLCBjb2xvcikge1xuXHRcdHRoaXMucmFkaXVzID0gciB8fCAzXG5cdFx0dGhpcy5jb2xvciA9IGNvbG9yIHx8IDB4ZmZmZmZmXG5cdFx0dGhpcy5zcHJpbmdDb250YWluZXIgPSBzcHJpbmdDb250YWluZXJcblx0XHR0aGlzLnZ4ID0gMFxuXHRcdHRoaXMudnkgPSAwXG5cdFx0dGhpcy54ID0gMFxuXHRcdHRoaXMueSA9IDBcblx0XHR0aGlzLnRvWCA9IDBcblx0XHR0aGlzLnRvWSA9IDBcblx0XHR0aGlzLmZyb21YID0gMFxuXHRcdHRoaXMuZnJvbVkgPSAwXG5cdFx0dGhpcy5zY2FsZVggPSAxXG5cdFx0dGhpcy5zY2FsZVkgPSAxXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5nID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMuc3ByaW5nQ29udGFpbmVyLmFkZENoaWxkKHRoaXMuZylcblx0XHR0aGlzLmRyYXcoKVxuXHRcdHJldHVybiB0aGlzXG5cdH1cblx0Y2hhbmdlU2l6ZShyYWRpdXMpIHtcblx0XHR0aGlzLnJhZGl1cyA9IHJhZGl1cyB8fCAzXG5cdFx0dGhpcy5kcmF3KClcblx0fVxuXHRkcmF3KCkge1xuXHRcdHRoaXMuZy5jbGVhcigpXG5cdFx0dGhpcy5nLmxpbmVTdHlsZShBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKSwgdGhpcy5jb2xvciwgMSk7XG5cdFx0dGhpcy5nLmJlZ2luRmlsbCh0aGlzLmNvbG9yLCAxKTtcblx0XHR0aGlzLmcuZHJhd0NpcmNsZSgwLCAwLCB0aGlzLnJhZGl1cyk7XG5cdFx0dGhpcy5nLmVuZEZpbGwoKVx0XG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMuZy54ID0geFxuXHRcdHRoaXMuZy55ID0geVxuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0Y2xlYXIoKSB7XG5cdFx0dGhpcy5nLmNsZWFyKClcblx0fVxuXHRzY2FsZSh4LCB5KSB7XG5cdFx0dGhpcy5nLnNjYWxlLnggPSB4XG5cdFx0dGhpcy5nLnNjYWxlLnkgPSB5XG5cdFx0dGhpcy5zY2FsZVggPSB4XG5cdFx0dGhpcy5zY2FsZVkgPSB5XG5cdH1cblx0dmVsb2NpdHkoeCwgeSkge1xuXHRcdHRoaXMudnggPSB4XG5cdFx0dGhpcy52eSA9IHlcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmcuY2xlYXIoKVxuXHRcdHRoaXMuZyA9IG51bGxcblx0fVxufVxuIiwiaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgVmVjMiBmcm9tICdWZWMyJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEJlemllckVhc2luZyBmcm9tICdiZXppZXItZWFzaW5nJ1xuY29uc3QgZ2xzbGlmeSA9IHJlcXVpcmUoJ2dsc2xpZnknKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMYW5kaW5nU2xpZGVzaG93IHtcblx0Y29uc3RydWN0b3IocHhDb250YWluZXIsIHBhcmVudEVsKSB7XG5cdFx0dGhpcy5wYXJlbnRFbCA9IHBhcmVudEVsXG5cdFx0dGhpcy5weENvbnRhaW5lciA9IHB4Q29udGFpbmVyXG5cdFx0dGhpcy5jdXJyZW50SWQgPSAnYWxhc2thJ1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHZhciBpbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHQgXHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHQgXHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyKVxuXHQgXHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnNsaWRlc2hvd1dyYXBwZXIpXG5cdCBcdHRoaXMuY291bnRlciA9IDBcblx0IFx0dGhpcy5wbGFuZXRUaXRsZVR4dCA9IGluZm9zLnBsYW5ldC50b1VwcGVyQ2FzZSgpXG5cblx0XHR2YXIgc2xpZGVzaG93VGl0bGUgPSB0aGlzLnBhcmVudEVsLmZpbmQoJy5zbGlkZXNob3ctdGl0bGUnKVxuXHRcdHZhciBwbGFuZXRUaXRsZSA9IHNsaWRlc2hvd1RpdGxlLmZpbmQoJy5wbGFuZXQtdGl0bGUnKVxuXHRcdHZhciBwbGFuZXROYW1lID0gc2xpZGVzaG93VGl0bGUuZmluZCgnLnBsYW5ldC1uYW1lJylcblx0IFx0dGhpcy50aXRsZUNvbnRhaW5lciA9IHtcblx0IFx0XHRwYXJlbnQ6IHNsaWRlc2hvd1RpdGxlLFxuXHQgXHRcdHBsYW5ldFRpdGxlOiBwbGFuZXRUaXRsZSxcblx0IFx0XHRwbGFuZXROYW1lOiBwbGFuZXROYW1lXG5cdCBcdH1cblxuXHQgXHR0aGlzLnBsYW5ldE5hbWVUd2VlbiA9IFR3ZWVuTWF4LmZyb21UbyhwbGFuZXROYW1lLCAwLjUsIHtzY2FsZVg6MS40LCBzY2FsZVk6MCwgb3BhY2l0eTowfSwgeyBzY2FsZToxLCBvcGFjaXR5OjEsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSlcblx0IFx0dGhpcy5wbGFuZXROYW1lVHdlZW4ucGF1c2UoMClcblxuXHQgXHR2YXIgZGlzcGxhY2VtZW50RnJhZyA9IGdsc2xpZnkoJy4vc2hhZGVycy9kaXNwbGFjZW1lbnQuZ2xzbCcpXG5cblx0IFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0IFx0dGhpcy5zbGlkZXMgPSBbXVxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0IFx0XHR2YXIgcyA9IHt9XG5cdCBcdFx0dmFyIGlkID0gcGxhbmV0c1tpXVxuXHQgXHRcdHZhciB3cmFwcGVyQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0XHR2YXIgbWFza1JlY3QgPSB7XG5cdCBcdFx0XHRnOiBBcHBTdG9yZS5nZXRHcmFwaGljcygpLFxuXHQgXHRcdFx0bmV3VzogMCxcblx0IFx0XHRcdHdpZHRoOiAwLFxuXHQgXHRcdFx0eDogMFxuXHQgXHRcdH1cblx0IFx0XHR2YXIgaW1nVXJsID0gQXBwU3RvcmUubWFpbkltYWdlVXJsKGlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0IFx0XHR2YXIgaW1nTWFwVXJsID0gQXBwU3RvcmUubWFpbkltYWdlTWFwVXJsKGlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0IFx0XHR2YXIgdGV4dHVyZSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1nVXJsKVxuXHQgXHRcdC8vIHZhciBkaXNwbGFjZW1lbnRUZXh0dXJlID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZShpbWdNYXBVcmwpXG5cdCBcdFx0Ly8gcy5kaXNwbGFjZW1lbnRTcHJpdGUgPSBQSVhJLlNwcml0ZS5mcm9tSW1hZ2UoaW1nTWFwVXJsKVxuXHQgXHRcdHZhciBzcHJpdGUgPSBBcHBTdG9yZS5nZXRTcHJpdGUoKVxuXHQgXHRcdHNwcml0ZS50ZXh0dXJlID0gdGV4dHVyZVxuXHQgXHRcdHNwcml0ZS5wYXJhbXMgPSB7fVxuXHQgXHRcdHRoaXMuc2xpZGVzaG93V3JhcHBlci5hZGRDaGlsZCh3cmFwcGVyQ29udGFpbmVyKVxuXHQgXHRcdHdyYXBwZXJDb250YWluZXIuYWRkQ2hpbGQoc3ByaXRlKVxuXHQgXHRcdHdyYXBwZXJDb250YWluZXIuYWRkQ2hpbGQobWFza1JlY3QuZylcblx0IFx0XHRzcHJpdGUubWFzayA9IG1hc2tSZWN0Lmdcblx0IFx0XHRzLm9sZFBvc2l0aW9uID0gbmV3IFZlYzIoMCwgMClcblx0IFx0XHRzLm5ld1Bvc2l0aW9uID0gbmV3IFZlYzIoMCwgMClcblx0IFx0XHRzLndyYXBwZXJDb250YWluZXIgPSB3cmFwcGVyQ29udGFpbmVyXG5cdCBcdFx0cy5zcHJpdGUgPSBzcHJpdGVcblx0IFx0XHRzLnRleHR1cmUgPSB0ZXh0dXJlXG5cdCBcdFx0cy5tYXNrUmVjdCA9IG1hc2tSZWN0XG5cdCBcdFx0cy5wbGFuZXROYW1lID0gaWQudG9VcHBlckNhc2UoKVxuXHQgXHRcdHMuaW1nUmVzcG9uc2l2ZVNpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VTaXplKEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHQgXHRcdHMuaW1nVXJsID0gaW1nVXJsXG5cdCBcdFx0cy5pZCA9IHBsYW5ldHNbaV1cblx0IFx0XHR0aGlzLnNsaWRlc1tpXSA9IHNcblx0IFx0fVxuXG5cdCBcdHRoaXMubWFza0Vhc2luZyA9IEJlemllckVhc2luZyguODQsLjEzLDAsMS4wMylcblx0IFx0dGhpcy5jaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KClcblx0fVxuXHR1cGRhdGVUaXRsZXModGl0bGUsIG5hbWUpIHtcblx0XHR2YXIgcGxhbmV0VGl0bGUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldFRpdGxlXG5cdFx0dmFyIHBsYW5ldE5hbWUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldE5hbWVcblx0IFx0cGxhbmV0VGl0bGUudGV4dCh0aXRsZSlcblx0IFx0cGxhbmV0TmFtZS50ZXh0KG5hbWUpXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuLnBsYXkoMClcblx0fVxuXHRkcmF3Q2VudGVyZWRNYXNrUmVjdChncmFwaGljcywgeCwgeSwgdywgaCkge1xuXHRcdGdyYXBoaWNzLmNsZWFyKClcblx0XHRncmFwaGljcy5iZWdpbkZpbGwoMHhmZmZmMDAsIDEpXG5cdFx0Z3JhcGhpY3MuZHJhd1JlY3QoeCwgeSwgdywgaClcblx0XHRncmFwaGljcy5lbmRGaWxsKClcblx0fVxuXHRuZXh0KCkge1xuXHRcdHZhciBmaXJzdEVsZW1lbnQgPSB0aGlzLnNsaWRlcy5zaGlmdCgpXG5cdFx0dGhpcy5zbGlkZXMucHVzaChmaXJzdEVsZW1lbnQpXG5cdFx0dGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSA9IGZpcnN0RWxlbWVudFxuXHRcdHRoaXMuY2hvb3NlU2xpZGVUb0hpZ2hsaWdodCgpXG5cdFx0dGhpcy5hcHBseVZhbHVlc1RvU2xpZGVzKClcblx0fVxuXHRwcmV2aW91cygpIHtcblx0XHR2YXIgbGFzdEVsZW1lbnQgPSB0aGlzLnNsaWRlcy5wb3AoKVxuXHRcdHRoaXMuc2xpZGVzLnVuc2hpZnQobGFzdEVsZW1lbnQpXG5cdFx0dGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSA9IGxhc3RFbGVtZW50XG5cdFx0dGhpcy5jaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KClcblx0XHR0aGlzLmFwcGx5VmFsdWVzVG9TbGlkZXMoKVxuXHR9XG5cdGNob29zZVNsaWRlVG9IaWdobGlnaHQoKSB7XG5cdFx0dmFyIHRvdGFsTGVuID0gdGhpcy5zbGlkZXMubGVuZ3RoLTFcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2xpZGUgPSB0aGlzLnNsaWRlc1tpXVxuXHRcdFx0aWYoaSA9PSAyKSB7XG5cdFx0XHRcdHNsaWRlLmhpZ2hsaWdodCA9IHRydWUgLy8gSGlnaGxpZ2h0IHRoZSBtaWRkbGUgZWxlbWVudHNcblx0XHRcdFx0dGhpcy5jdXJyZW50SWQgPSBzbGlkZS5pZFxuXHRcdFx0XHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIuc2V0Q2hpbGRJbmRleChzbGlkZS53cmFwcGVyQ29udGFpbmVyLCB0b3RhbExlbilcblx0XHRcdFx0dGhpcy51cGRhdGVUaXRsZXModGhpcy5wbGFuZXRUaXRsZVR4dCwgc2xpZGUucGxhbmV0TmFtZSlcblx0XHRcdFx0dGhpcy5wb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0c2xpZGUuaGlnaGxpZ2h0ID0gZmFsc2Vcblx0XHRcdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLnNldENoaWxkSW5kZXgoc2xpZGUud3JhcHBlckNvbnRhaW5lciwgaSlcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0YXBwbHlSZXNwb25zaXZlSW1nVG9TbGlkZURlcGVuZHNXaW5kb3coc2xpZGUpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIGltZ1VybCA9IEFwcFN0b3JlLm1haW5JbWFnZVVybChzLmlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0XHRpZihzLmltZ1VybCAhPSBpbWdVcmwpIHtcblx0XHRcdHMuaW1nUmVzcG9uc2l2ZVNpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VTaXplKEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHRcdFx0cy50ZXh0dXJlLmRlc3Ryb3kodHJ1ZSlcblx0XHRcdHMudGV4dHVyZSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1nVXJsKVxuXHRcdFx0cy5zcHJpdGUudGV4dHVyZSA9IHMudGV4dHVyZVxuXHRcdFx0cy5pbWdVcmwgPSBpbWdVcmxcblx0XHR9XG5cdH1cblx0cmVzaXplQW5kUG9zaXRpb25JbWdTcHJpdGUoc2xpZGUsIG1hc2tTbGlkZVcsIHdpbmRvd1csIHdpbmRvd0gpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIHJlc2l6ZVZhcnMgPSBVdGlscy5SZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcihtYXNrU2xpZGVXLCB3aW5kb3dILCBzLmltZ1Jlc3BvbnNpdmVTaXplWzBdLCBzLmltZ1Jlc3BvbnNpdmVTaXplWzFdKVxuXHRcdHMuc3ByaXRlLmFuY2hvci54ID0gMC41XG5cdFx0cy5zcHJpdGUuYW5jaG9yLnkgPSAwLjVcblx0XHRzLnNwcml0ZS5zY2FsZS54ID0gcmVzaXplVmFycy5zY2FsZVxuXHRcdHMuc3ByaXRlLnNjYWxlLnkgPSByZXNpemVWYXJzLnNjYWxlXG5cdFx0cy5zcHJpdGUud2lkdGggPSByZXNpemVWYXJzLndpZHRoXG5cdFx0cy5zcHJpdGUuaGVpZ2h0ID0gcmVzaXplVmFycy5oZWlnaHRcblx0XHRzLnNwcml0ZS50b1ggPSByZXNpemVWYXJzLmxlZnRcblx0XHRzLnNwcml0ZS55ID0gcmVzaXplVmFycy50b3Bcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dmFyIHNsaWRlcyA9IHRoaXMuc2xpZGVzXG5cdFx0dGhpcy5jb3VudGVyICs9IDAuMDEyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzbGlkZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzID0gc2xpZGVzW2ldXG5cdFx0XHRzLm1hc2tSZWN0LnZhbHVlU2NhbGUgKz0gKDEgLSBzLm1hc2tSZWN0LnZhbHVlU2NhbGUpICogMC4yXG5cdFx0XHR2YXIgZWFzZSA9IHRoaXMubWFza0Vhc2luZy5nZXQocy5tYXNrUmVjdC52YWx1ZVNjYWxlKVxuXHRcdFx0cy53cmFwcGVyQ29udGFpbmVyLnggKz0gKHMubmV3UG9zaXRpb24ueCAtIHMud3JhcHBlckNvbnRhaW5lci54KSAqIDAuMlxuXHRcdFx0cy5tYXNrUmVjdC53aWR0aCArPSAocy5tYXNrUmVjdC5uZXdXIC0gcy5tYXNrUmVjdC53aWR0aCkgKiAwLjJcblx0XHRcdHZhciBtYXNrUmVjdFggPSAoMSAtIGVhc2UpICogcy5tYXNrUmVjdC5uZXdYXG5cdFx0XHRzLnNwcml0ZS54ICs9IChzLnNwcml0ZS50b1ggLSBzLnNwcml0ZS54KSAqIDAuMlxuXHRcdFx0dGhpcy5kcmF3Q2VudGVyZWRNYXNrUmVjdChzLm1hc2tSZWN0LmcsIG1hc2tSZWN0WCwgMCwgcy5tYXNrUmVjdC53aWR0aCwgcy5tYXNrUmVjdC5oZWlnaHQpXG5cdFx0fVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnggKz0gKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFkgLSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54KSAqIDAuMDhcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS55ICs9ICh0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZVhZIC0gdGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueSkgKiAwLjA4XG5cdH1cblx0cG9zaXRpb25TbGlkZXNob3dDb250YWluZXIoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR2YXIgbGFzdFNsaWRlID0gdGhpcy5zbGlkZXNbdGhpcy5zbGlkZXMubGVuZ3RoLTFdXG5cdFx0dmFyIGNvbnRhaW5lclRvdGFsVyA9IGxhc3RTbGlkZS5uZXdQb3NpdGlvbi54ICsgbGFzdFNsaWRlLm1hc2tSZWN0Lm5ld1dcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5waXZvdC54ID0gY29udGFpbmVyVG90YWxXID4+IDFcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5waXZvdC55ID0gd2luZG93SCA+PiAxXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIueCA9ICh3aW5kb3dXID4+IDEpXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIueSA9ICh3aW5kb3dIID4+IDEpXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuYmFzZVkgPSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci55XG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueCA9IDEuNFxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnkgPSAxLjRcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZVhZID0gMS4wNVxuXHR9XG5cdGFwcGx5VmFsdWVzVG9TbGlkZXMoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR2YXIgY3VycmVudFBvc1ggPSAwXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNsaWRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHMgPSB0aGlzLnNsaWRlc1tpXVxuXHRcdFx0dGhpcy5hcHBseVJlc3BvbnNpdmVJbWdUb1NsaWRlRGVwZW5kc1dpbmRvdyhzKVxuXHRcdFx0dmFyIGhpZ2h0bGlnaHRlZFNsaWRlVyA9IHdpbmRvd1cgKiAoMSAtIChBcHBDb25zdGFudHMuTEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRSAqIDIpKVxuXHRcdFx0dmFyIG5vcm1hbFNsaWRlVyA9IHdpbmRvd1cgKiBBcHBDb25zdGFudHMuTEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRVxuXHRcdFx0dmFyIHNsaWRlVyA9IDBcblx0XHRcdGlmKHMuaGlnaGxpZ2h0KSBzbGlkZVcgPSBoaWdodGxpZ2h0ZWRTbGlkZVdcblx0XHRcdGVsc2Ugc2xpZGVXID0gbm9ybWFsU2xpZGVXXG5cdFx0XHR0aGlzLnJlc2l6ZUFuZFBvc2l0aW9uSW1nU3ByaXRlKHMsIHNsaWRlVywgd2luZG93Vywgd2luZG93SClcblx0XHRcdHMubWFza1JlY3QubmV3VyA9IHNsaWRlV1xuXHRcdFx0cy5tYXNrUmVjdC5oZWlnaHQgPSB3aW5kb3dIXG5cdFx0XHRzLm1hc2tSZWN0Lm5ld1ggPSBzbGlkZVcgPj4gMVxuXHRcdFx0cy5tYXNrUmVjdC52YWx1ZVNjYWxlID0gMlxuXHRcdFx0cy5vbGRQb3NpdGlvbi54ID0gcy5uZXdQb3NpdGlvbi54XG5cdFx0XHRzLm5ld1Bvc2l0aW9uLnggPSBjdXJyZW50UG9zWFxuXHRcdFx0aWYodGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSAhPSB1bmRlZmluZWQgJiYgdGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheS5pZCA9PSBzLmlkKXtcblx0XHRcdFx0cy53cmFwcGVyQ29udGFpbmVyLnggPSBzLm5ld1Bvc2l0aW9uLnhcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRQb3NYICs9IHNsaWRlV1xuXHRcdH1cblx0XHR0aGlzLnBvc2l0aW9uU2xpZGVzaG93Q29udGFpbmVyKClcblx0fVxuXHRwb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdGNsZWFyVGltZW91dCh0aGlzLnRpdGxlVGltZW91dClcblx0XHR0aGlzLnRpdGxlVGltZW91dCA9IHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHZhciBjb21wYXNzU2l6ZSA9ICh3aW5kb3dIICogQXBwQ29uc3RhbnRzLkNPTVBBU1NfU0laRV9QRVJDRU5UQUdFKSA8PCAxXG5cdFx0XHR2YXIgdG9wT2Zmc2V0ID0gKHdpbmRvd0ggPj4gMSkgKyAoY29tcGFzc1NpemUgPj4gMSlcblx0XHRcdHZhciB0aXRsZXNDb250YWluZXJDc3MgPSB7XG5cdFx0XHRcdHRvcDogdG9wT2Zmc2V0ICsgKCh3aW5kb3dIIC0gdG9wT2Zmc2V0KSA+PiAxKSAtICh0aGlzLnRpdGxlQ29udGFpbmVyLnBhcmVudC5oZWlnaHQoKSAqIDAuNiksXG5cdFx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LndpZHRoKCkgPj4gMSksXG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRpdGxlQ29udGFpbmVyLnBhcmVudC5jc3ModGl0bGVzQ29udGFpbmVyQ3NzKVxuXHRcdH0sIDApXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuYXBwbHlWYWx1ZXNUb1NsaWRlcygpXG5cdFx0dGhpcy5wb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cblx0XHR2YXIgc2xpZGVzID0gdGhpcy5zbGlkZXNcblx0IFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzbGlkZXMubGVuZ3RoOyBpKyspIHtcblx0IFx0XHR2YXIgcyA9IHNsaWRlc1tpXVxuXG5cdCBcdFx0cy5tYXNrUmVjdC5nLmNsZWFyKClcblx0IFx0XHRBcHBTdG9yZS5yZWxlYXNlR3JhcGhpY3Mocy5tYXNrUmVjdC5nKVxuXG5cdCBcdFx0cy5zcHJpdGUudGV4dHVyZS5kZXN0cm95KHRydWUpXG5cdCBcdFx0QXBwU3RvcmUucmVsZWFzZVNwcml0ZShzLnNwcml0ZSlcblxuXHQgXHRcdHMud3JhcHBlckNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdCBcdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcihzLndyYXBwZXJDb250YWluZXIpXG5cdCBcdH1cblxuXHQgXHR0aGlzLnNsaWRlcy5sZW5ndGggPSAwXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuID0gbnVsbFxuXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5zbGlkZXNob3dDb250YWluZXIpXG5cblx0XHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5zbGlkZXNob3dXcmFwcGVyKVxuXHRcdFxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUFhDb250YWluZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0fVxuXHRpbml0KGVsZW1lbnRJZCkge1xuXG5cdFx0dGhpcy5kaWRIYXNoZXJDaGFuZ2UgPSB0aGlzLmRpZEhhc2hlckNoYW5nZS5iaW5kKHRoaXMpXG5cdFx0QXBwU3RvcmUub24oQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQsIHRoaXMuZGlkSGFzaGVyQ2hhbmdlKVxuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0UsIHRoaXMuZGlkSGFzaGVyQ2hhbmdlKVxuXG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5yZW5kZXJlciA9IG5ldyBQSVhJLmF1dG9EZXRlY3RSZW5kZXJlcigxLCAxLCB7IGFudGlhbGlhczogdHJ1ZSB9KVxuXHRcdFx0dGhpcy5vbGRDb2xvciA9IFwiMHhmZmZmZmZcIlxuXHRcdFx0dGhpcy5uZXdDb2xvciA9IFwiMHhmZmZmZmZcIlxuXHRcdFx0dGhpcy5jb2xvclR3ZWVuID0ge2NvbG9yOnRoaXMub2xkQ29sb3J9XG5cdFx0XHR2YXIgZWwgPSAkKGVsZW1lbnRJZClcblx0XHRcdCQodGhpcy5yZW5kZXJlci52aWV3KS5hdHRyKCdpZCcsICdweC1jb250YWluZXInKVxuXHRcdFx0ZWwuYXBwZW5kKHRoaXMucmVuZGVyZXIudmlldylcblx0XHRcdHRoaXMuc3RhZ2UgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHRcdH1cblx0fVxuXHRhZGQoY2hpbGQpIHtcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgcmV0dXJuXG5cdFx0dGhpcy5zdGFnZS5hZGRDaGlsZChjaGlsZClcblx0fVxuXHRyZW1vdmUoY2hpbGQpIHtcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgcmV0dXJuXG5cdFx0dGhpcy5zdGFnZS5yZW1vdmVDaGlsZChjaGlsZClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHJldHVyblxuXHQgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy5zdGFnZSlcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHJldHVyblxuXHRcdC8vIHZhciBzY2FsZSA9ICh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA9PSB1bmRlZmluZWQpID8gMSA6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvXG5cdFx0dmFyIHNjYWxlID0gMVxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dGhpcy5yZW5kZXJlci5yZXNpemUod2luZG93VyAqIHNjYWxlLCB3aW5kb3dIICogc2NhbGUpXG5cdH1cblx0ZGlkSGFzaGVyQ2hhbmdlKCkge1xuXHRcdHZhciBwYWdlSWQgPSBBcHBTdG9yZS5nZXRQYWdlSWQoKVxuXHRcdHZhciBwYWxldHRlID0gQXBwU3RvcmUucGFsZXR0ZUNvbG9yc0J5SWQocGFnZUlkKVxuXHRcdC8vIHRoaXMub2xkQ29sb3IgPSB0aGlzLm5ld0NvbG9yXG5cdFx0Ly8gdGhpcy5uZXdDb2xvciA9IHBhbGV0dGVbMF1cblx0XHQvLyBjb25zb2xlLmxvZyh0aGlzLm9sZENvbG9yLCB0aGlzLm5ld0NvbG9yKVxuXHRcdC8vIGlmKHBhbGV0dGUgIT0gdW5kZWZpbmVkKSBUd2Vlbk1heC50byh0aGlzLnJlbmRlcmVyLCAxLCB7IGNvbG9yUHJvcHM6IHtiYWNrZ3JvdW5kQ29sb3I6XCJyZWRcIn19KVxuXHRcdC8vIGlmKHBhbGV0dGUgIT0gdW5kZWZpbmVkKSBUd2Vlbk1heC50byh0aGlzLmNvbG9yVHdlZW4sIDEsIHsgY29sb3JQcm9wczoge2NvbG9yOnRoaXMubmV3Q29sb3J9LCBvblVwZGF0ZTogKCk9Pntcblx0XHQvLyBcdGNvbnNvbGUubG9nKHRoaXMuY29sb3JUd2Vlbi5jb2xvcilcblx0XHQvLyB9fSlcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkge1xuXHRcdFx0aWYocGFsZXR0ZSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dmFyIGMgPSBwYWxldHRlWzBdXG5cdFx0XHRcdCQoJ2h0bWwnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCBjLnJlcGxhY2UoJzB4JywgJyMnKSlcblx0XHRcdH1cblx0XHR9ZWxzZXtcblx0XHRcdGlmKHBhbGV0dGUgIT0gdW5kZWZpbmVkKSB0aGlzLnJlbmRlcmVyLmJhY2tncm91bmRDb2xvciA9IHBhbGV0dGVbMF1cblx0XHR9XG5cdH1cbn1cbiIsImltcG9ydCBCYXNlUGFnZSBmcm9tICdCYXNlUGFnZSdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZSBleHRlbmRzIEJhc2VQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcylcblx0XHR0aGlzLnJlc2l6ZSA9IHRoaXMucmVzaXplLmJpbmQodGhpcylcblx0XHR0aGlzLnB4Q29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB7XG5cdFx0XHR0aGlzLmNoaWxkLmNzcygncG9zaXRpb24nLCAnYWJzb2x1dGUnKVxuXHRcdFx0JCgnaHRtbCcpLmNzcygnb3ZlcmZsb3cteScsICdhdXRvJylcblx0XHR9XG5cblx0XHRpZih0aGlzLnByb3BzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkxBTkRJTkcpIHRoaXMucGFyZW50LmNzcygnY3Vyc29yJywgJ3BvaW50ZXInKVxuXHRcdGVsc2UgdGhpcy5wYXJlbnQuY3NzKCdjdXJzb3InLCAnYXV0bycpXG5cblx0XHRzZXRUaW1lb3V0KCgpPT57QXBwQWN0aW9ucy5weEFkZENoaWxkKHRoaXMucHhDb250YWluZXIpfSwgMClcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzZXRUaW1lb3V0KCgpPT57QXBwQWN0aW9ucy5weFJlbW92ZUNoaWxkKHRoaXMucHhDb250YWluZXIpfSwgMClcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHNldHVwQW5pbWF0aW9ucygpIHtcblx0XHRzdXBlci5zZXR1cEFuaW1hdGlvbnMoKVxuXHR9XG5cdGdldEltYWdlVXJsQnlJZChpZCkge1xuXHRcdHJldHVybiBBcHBTdG9yZS5QcmVsb2FkZXIuZ2V0SW1hZ2VVUkwodGhpcy5pZCArICctJyArIHRoaXMucHJvcHMudHlwZS50b0xvd2VyQ2FzZSgpICsgJy0nICsgaWQpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMucHhDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5weENvbnRhaW5lcilcblx0XHRBcHBTdG9yZS5vZmYoQXBwQ29uc3RhbnRzLldJTkRPV19SRVNJWkUsIHRoaXMucmVzaXplKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEJhc2VQYWdlciBmcm9tICdCYXNlUGFnZXInXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBMYW5kaW5nIGZyb20gJ0xhbmRpbmcnXG5pbXBvcnQgTGFuZGluZ1RlbXBsYXRlIGZyb20gJ0xhbmRpbmdfaGJzJ1xuaW1wb3J0IFBsYW5ldEV4cGVyaWVuY2VQYWdlIGZyb20gJ1BsYW5ldEV4cGVyaWVuY2VQYWdlJ1xuaW1wb3J0IFBsYW5ldEV4cGVyaWVuY2VQYWdlVGVtcGxhdGUgZnJvbSAnUGxhbmV0RXhwZXJpZW5jZVBhZ2VfaGJzJ1xuaW1wb3J0IFBsYW5ldENhbXBhaWduUGFnZSBmcm9tICdQbGFuZXRDYW1wYWlnblBhZ2UnXG5pbXBvcnQgUGxhbmV0Q2FtcGFpZ25QYWdlVGVtcGxhdGUgZnJvbSAnUGxhbmV0Q2FtcGFpZ25QYWdlX2hicydcblxuY2xhc3MgUGFnZXNDb250YWluZXIgZXh0ZW5kcyBCYXNlUGFnZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5zd2FsbG93SGFzaGVyQ2hhbmdlID0gZmFsc2Vcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdFx0QXBwU3RvcmUub24oQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQsIHRoaXMuZGlkSGFzaGVyQ2hhbmdlKVxuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0UsIHRoaXMuZGlkSGFzaGVySW50ZXJuYWxDaGFuZ2UpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0QXBwU3RvcmUub2ZmKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VELCB0aGlzLmRpZEhhc2hlckNoYW5nZSlcblx0XHRBcHBTdG9yZS5vZmYoQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRSwgdGhpcy5kaWRIYXNoZXJJbnRlcm5hbENoYW5nZSlcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cblx0ZGlkSGFzaGVySW50ZXJuYWxDaGFuZ2UoKSB7XG5cdFx0dGhpcy5jdXJyZW50Q29tcG9uZW50LmludGVybmFsSGFzaGVyQ2hhbmdlZCgpXG5cdH1cblx0ZGlkSGFzaGVyQ2hhbmdlKCkge1xuXHRcdC8vIFN3YWxsb3cgaGFzaGVyIGNoYW5nZSBpZiB0aGUgY2hhbmdlIGlzIGZhc3QgYXMgMXNlY1xuXHRcdGlmKHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSkgcmV0dXJuIFxuXHRcdGVsc2UgdGhpcy5zZXR1cE5ld2Jvcm5Db21wb25lbnRzKClcblx0XHR0aGlzLnN3YWxsb3dIYXNoZXJDaGFuZ2UgPSB0cnVlXG5cdFx0dGhpcy5oYXNoZXJDaGFuZ2VUaW1lb3V0ID0gc2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dGhpcy5zd2FsbG93SGFzaGVyQ2hhbmdlID0gZmFsc2Vcblx0XHR9LCAxMDAwKVxuXHR9XG5cdHNldHVwTmV3Ym9ybkNvbXBvbmVudHMoKSB7XG5cdFx0dmFyIGhhc2ggPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG5cdFx0dmFyIHRlbXBsYXRlID0geyB0eXBlOiB1bmRlZmluZWQsIHBhcnRpYWw6IHVuZGVmaW5lZCB9XG5cdFx0c3dpdGNoKGhhc2gucGFydHMubGVuZ3RoKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXBsYXRlLnR5cGUgPSBMYW5kaW5nXG5cdFx0XHRcdHRlbXBsYXRlLnBhcnRpYWwgPSBMYW5kaW5nVGVtcGxhdGVcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcGxhdGUudHlwZSA9IFBsYW5ldEV4cGVyaWVuY2VQYWdlXG5cdFx0XHRcdHRlbXBsYXRlLnBhcnRpYWwgPSBQbGFuZXRFeHBlcmllbmNlUGFnZVRlbXBsYXRlXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDM6XG5cdFx0XHRcdHRlbXBsYXRlLnR5cGUgPSBQbGFuZXRDYW1wYWlnblBhZ2Vcblx0XHRcdFx0dGVtcGxhdGUucGFydGlhbCA9IFBsYW5ldENhbXBhaWduUGFnZVRlbXBsYXRlXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gTGFuZGluZ1xuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gTGFuZGluZ1RlbXBsYXRlXHRcdFxuXHRcdH1cblxuXHRcdHRoaXMuc2V0dXBOZXdDb21wb25lbnQoaGFzaC5wYXJlbnQsIHRlbXBsYXRlKVxuXHRcdHRoaXMuY3VycmVudENvbXBvbmVudCA9IHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdGlmKHRoaXMuY3VycmVudENvbXBvbmVudCAhPSB1bmRlZmluZWQpIHRoaXMuY3VycmVudENvbXBvbmVudC51cGRhdGUoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFBhZ2VzQ29udGFpbmVyXG5cblxuXG4iLCJpbXBvcnQgQmFzZUNhbXBhaWduUGFnZSBmcm9tICdCYXNlQ2FtcGFpZ25QYWdlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5pbXBvcnQgQXJyb3dCdG4gZnJvbSAnQXJyb3dCdG4nXG4vLyBpbXBvcnQgUGxheUJ0biBmcm9tICdQbGF5QnRuJ1xuaW1wb3J0IFJlY3RhbmdsZUJ0biBmcm9tICdSZWN0YW5nbGVCdG4nXG5pbXBvcnQgVGl0bGVTd2l0Y2hlciBmcm9tICdUaXRsZVN3aXRjaGVyJ1xuaW1wb3J0IENvbXBhc3Nlc0NvbnRhaW5lciBmcm9tICdDb21wYXNzZXNDb250YWluZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBsYW5ldENhbXBhaWduUGFnZSBleHRlbmRzIEJhc2VDYW1wYWlnblBhZ2Uge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHByb3BzLmRhdGFbJ2VtcHR5LWltYWdlJ10gPSBBcHBTdG9yZS5nZXRFbXB0eUltZ1VybCgpXG5cdFx0c3VwZXIocHJvcHMpXG5cdFx0dGhpcy5wcm9kdWN0SWQgPSB1bmRlZmluZWRcblx0XHR0aGlzLmZyb21JbnRlcm5hbENoYW5nZSA9IGZhbHNlXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggPSAwXG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTEVGVFxuXHRcdHRoaXMuY3VycmVudFByb2R1Y3RDb250YWluZXJDbGFzcyA9ICdwcm9kdWN0LWNvbnRhaW5lci1iJ1xuXHRcdHRoaXMudGltZW91dFRpbWUgPSAxMDAwXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy51cGRhdGVQcm9kdWN0RGF0YSgpXG5cblx0XHR0aGlzLmluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zTGFuZ1Njb3BlKClcblxuXHRcdHZhciBzbGlkZXNob3dUaXRsZSA9IHRoaXMuY2hpbGQuZmluZCgnLnNsaWRlc2hvdy10aXRsZScpXG5cdFx0dmFyIHBsYW5ldFRpdGxlID0gc2xpZGVzaG93VGl0bGUuZmluZCgnLnBsYW5ldC10aXRsZScpXG5cdFx0dmFyIHBsYW5ldE5hbWUgPSBzbGlkZXNob3dUaXRsZS5maW5kKCcucGxhbmV0LW5hbWUnKVxuXHQgXHR0aGlzLnRpdGxlQ29udGFpbmVyID0ge1xuXHQgXHRcdHBhcmVudDogc2xpZGVzaG93VGl0bGUsXG5cdCBcdFx0cGxhbmV0VGl0bGU6IHBsYW5ldFRpdGxlLFxuXHQgXHRcdHBsYW5ldE5hbWU6IHBsYW5ldE5hbWVcblx0IFx0fVxuXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuID0gVHdlZW5NYXguZnJvbVRvKHBsYW5ldE5hbWUsIDAuNSwge3NjYWxlWDoxLjQsIHNjYWxlWTowLCBvcGFjaXR5OjB9LCB7IHNjYWxlOjEsIG9wYWNpdHk6MSwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9KVxuXHQgXHR0aGlzLnBsYW5ldE5hbWVUd2Vlbi5wYXVzZSgwKVxuXG5cdFx0dmFyIHByb2R1Y3RDb250YWluZXJzV3JhcHBlciA9IHRoaXMuY2hpbGQuZmluZCgnLnByb2R1Y3QtY29udGFpbmVycy13cmFwcGVyJylcblx0XHR2YXIgY29udGFpbmVyQSA9IHByb2R1Y3RDb250YWluZXJzV3JhcHBlci5maW5kKCcucHJvZHVjdC1jb250YWluZXItYScpXG5cdFx0dmFyIGNvbnRhaW5lckIgPSBwcm9kdWN0Q29udGFpbmVyc1dyYXBwZXIuZmluZCgnLnByb2R1Y3QtY29udGFpbmVyLWInKVxuXG5cdFx0dGhpcy5jb250YWluZXJzID0ge1xuXHRcdFx0J3Byb2R1Y3QtY29udGFpbmVyLWEnOiB7XG5cdFx0XHRcdGVsOiBjb250YWluZXJBLFxuXHRcdFx0XHRwb3N0ZXJXcmFwcGVyOiBjb250YWluZXJBLmZpbmQoJy5wb3N0ZXItd3JhcHBlcicpLFxuXHRcdFx0XHRwb3N0ZXJJbWc6IGNvbnRhaW5lckEuZmluZCgnaW1nJyksXG5cdFx0XHRcdHNwaW5uZXI6IHtcblx0XHRcdFx0XHRlbDogY29udGFpbmVyQS5maW5kKCcuc3Bpbm5lci13cmFwcGVyJyksXG5cdFx0XHRcdFx0c3ZnOiBjb250YWluZXJBLmZpbmQoJy5zcGlubmVyLXdyYXBwZXIgc3ZnJyksXG5cdFx0XHRcdFx0cGF0aDogY29udGFpbmVyQS5maW5kKCcuc3Bpbm5lci13cmFwcGVyIHN2ZyBwYXRoJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dmlkZW86IHtcblx0XHRcdFx0XHQvLyBwbGF5QnRuOiBuZXcgUGxheUJ0bihjb250YWluZXJBLmZpbmQoJy5wbGF5LWJ0bicpKS5jb21wb25lbnREaWRNb3VudCgpLFxuXHRcdFx0XHRcdGVsOiBjb250YWluZXJBLmZpbmQoJy52aWRlby13cmFwcGVyJyksXG5cdFx0XHRcdFx0Y29udGFpbmVyOiBjb250YWluZXJBLmZpbmQoJy52aWRlby1jb250YWluZXInKSxcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdwcm9kdWN0LWNvbnRhaW5lci1iJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQixcblx0XHRcdFx0cG9zdGVyV3JhcHBlcjogY29udGFpbmVyQi5maW5kKCcucG9zdGVyLXdyYXBwZXInKSxcblx0XHRcdFx0cG9zdGVySW1nOiBjb250YWluZXJCLmZpbmQoJ2ltZycpLFxuXHRcdFx0XHRzcGlubmVyOiB7XG5cdFx0XHRcdFx0ZWw6IGNvbnRhaW5lckIuZmluZCgnLnNwaW5uZXItd3JhcHBlcicpLFxuXHRcdFx0XHRcdHN2ZzogY29udGFpbmVyQi5maW5kKCcuc3Bpbm5lci13cmFwcGVyIHN2ZycpLFxuXHRcdFx0XHRcdHBhdGg6IGNvbnRhaW5lckIuZmluZCgnLnNwaW5uZXItd3JhcHBlciBzdmcgcGF0aCcpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHZpZGVvOiB7XG5cdFx0XHRcdFx0Ly8gcGxheUJ0bjogbmV3IFBsYXlCdG4oY29udGFpbmVyQi5maW5kKCcucGxheS1idG4nKSkuY29tcG9uZW50RGlkTW91bnQoKSxcblx0XHRcdFx0XHRlbDogY29udGFpbmVyQi5maW5kKCcudmlkZW8td3JhcHBlcicpLFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogY29udGFpbmVyQi5maW5kKCcudmlkZW8tY29udGFpbmVyJyksXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLmFycm93Q2xpY2tlZCA9IHRoaXMuYXJyb3dDbGlja2VkLmJpbmQodGhpcylcblx0XHR0aGlzLm9uUGxhbmV0Q2xpY2tlZCA9IHRoaXMub25QbGFuZXRDbGlja2VkLmJpbmQodGhpcylcblx0XHR0aGlzLmJvdHRvbUNsaWNrZWQgPSB0aGlzLmJvdHRvbUNsaWNrZWQuYmluZCh0aGlzKVxuXG5cdFx0dGhpcy5wcmV2aW91c0J0biA9IG5ldyBBcnJvd0J0bih0aGlzLmNoaWxkLmZpbmQoJy5wcmV2aW91cy1idG4nKSwgQXBwQ29uc3RhbnRzLkxFRlQpXG5cdFx0dGhpcy5wcmV2aW91c0J0bi5idG5DbGlja2VkID0gdGhpcy5hcnJvd0NsaWNrZWRcblx0XHR0aGlzLnByZXZpb3VzQnRuLmNvbXBvbmVudERpZE1vdW50KClcblx0XHR0aGlzLm5leHRCdG4gPSBuZXcgQXJyb3dCdG4odGhpcy5jaGlsZC5maW5kKCcubmV4dC1idG4nKSwgQXBwQ29uc3RhbnRzLlJJR0hUKVxuXHRcdHRoaXMubmV4dEJ0bi5idG5DbGlja2VkID0gdGhpcy5hcnJvd0NsaWNrZWRcblx0XHR0aGlzLm5leHRCdG4uY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5kb3duQnRuID0gbmV3IEFycm93QnRuKHRoaXMuY2hpbGQuZmluZCgnLmRvd24tYnRuJyksIEFwcENvbnN0YW50cy5CT1RUT00pXG5cdFx0dGhpcy5kb3duQnRuLmJ0bkNsaWNrZWQgPSB0aGlzLmJvdHRvbUNsaWNrZWRcblx0XHR0aGlzLmRvd25CdG4uY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5idXlCdG4gPSBuZXcgVGl0bGVTd2l0Y2hlcih0aGlzLmNoaWxkLmZpbmQoJy5idXktYnRuJyksIHRoaXMuY2hpbGQuZmluZCgnLmRvdHMtcmVjdGFuZ2xlLWJ0bicpLCB0aGlzLmluZm9zWydidXlfdGl0bGUnXSlcblx0XHR0aGlzLmJ1eUJ0bi5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHRpZighQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyID0gbmV3IENvbXBhc3Nlc0NvbnRhaW5lcih0aGlzLnB4U2Nyb2xsQ29udGFpbmVyLCB0aGlzLmNoaWxkLmZpbmQoXCIuaW50ZXJmYWNlLmFic29sdXRlXCIpKVxuXHRcdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuaWQgPSB0aGlzLmlkXG5cdFx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0fVxuXG5cdFx0Ly8gdGhpcy5vblZpZGVvTW91c2VFbnRlciA9IHRoaXMub25WaWRlb01vdXNlRW50ZXIuYmluZCh0aGlzKVxuXHRcdC8vIHRoaXMub25WaWRlb01vdXNlTGVhdmUgPSB0aGlzLm9uVmlkZW9Nb3VzZUxlYXZlLmJpbmQodGhpcylcblx0XHQvLyB0aGlzLm9uVmlkZW9DbGljayA9IHRoaXMub25WaWRlb0NsaWNrLmJpbmQodGhpcylcblxuXHRcdHRoaXMuY2hlY2tDdXJyZW50UHJvZHVjdEJ5VXJsKClcblx0XHR0aGlzLnVwZGF0ZUNvbG9ycygpXG5cdFx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCB0aGlzLm9uS2V5UHJlc3NlZClcblxuXHRcdHRoaXMudXBkYXRlVGl0bGVzKHRoaXMuaW5mb3MucGxhbmV0LnRvVXBwZXJDYXNlKCksIHRoaXMuaWQudG9VcHBlckNhc2UoKSlcblxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRhZGRWaWRlb0V2ZW50cygpIHtcblx0XHQvLyBpZih0aGlzLmN1cnJlbnRDb250YWluZXIgPT0gdW5kZWZpbmVkKSByZXR1cm5cblx0XHQvLyB0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8uZWwub24oJ21vdXNlZW50ZXInLCB0aGlzLm9uVmlkZW9Nb3VzZUVudGVyKVxuXHRcdC8vIHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5lbC5vbignbW91c2VsZWF2ZScsIHRoaXMub25WaWRlb01vdXNlTGVhdmUpXG5cdFx0Ly8gdGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLm9uKCdjbGljaycsIHRoaXMub25WaWRlb0NsaWNrKVxuXHR9XG5cdHJlbW92ZVZpZGVvRXZlbnRzKCkge1xuXHRcdC8vIGlmKHRoaXMuY3VycmVudENvbnRhaW5lciA9PSB1bmRlZmluZWQpIHJldHVyblxuXHRcdC8vIHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5lbC5vZmYoJ21vdXNlZW50ZXInLCB0aGlzLm9uVmlkZW9Nb3VzZUVudGVyKVxuXHRcdC8vIHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5lbC5vZmYoJ21vdXNlbGVhdmUnLCB0aGlzLm9uVmlkZW9Nb3VzZUxlYXZlKVxuXHRcdC8vIHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5lbC5vZmYoJ2NsaWNrJywgdGhpcy5vblZpZGVvQ2xpY2spXG5cdH1cblx0b25WaWRlb01vdXNlRW50ZXIoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5wbGF5LmFkZENsYXNzKCdob3ZlcmVkJylcblx0fVxuXHRvblZpZGVvTW91c2VMZWF2ZShlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLnBsYXkucmVtb3ZlQ2xhc3MoJ2hvdmVyZWQnKVxuXHR9XG5cdG9uVmlkZW9DbGljayhlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5hc3NpZ25WaWRlb1RvTmV3Q29udGFpbmVyKClcblx0fVxuXHR1cGRhdGVUaXRsZXModGl0bGUsIG5hbWUpIHtcblx0XHR2YXIgcGxhbmV0VGl0bGUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldFRpdGxlXG5cdFx0dmFyIHBsYW5ldE5hbWUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldE5hbWVcblx0IFx0cGxhbmV0VGl0bGUudGV4dCh0aXRsZSlcblx0IFx0cGxhbmV0TmFtZS50ZXh0KG5hbWUpXG5cdCBcdHRoaXMucGxhbmV0TmFtZVR3ZWVuLnBsYXkoMClcblx0fVxuXHR1cGRhdGVQcm9kdWN0RGF0YSgpIHtcblx0XHR0aGlzLnByb2R1Y3RzID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZCh0aGlzLmlkKVxuXHR9XG5cdG9uUGxhbmV0Q2xpY2tlZCgpIHtcblx0XHR2YXIgdXJsID0gXCIvbGFuZGluZ1wiXG5cdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHR9XG5cdGFycm93Q2xpY2tlZChkaXJlY3Rpb24pIHtcblx0XHRpZih0aGlzLmFuaW1hdGlvblJ1bm5pbmcpIHJldHVyblxuXHRcdHRoaXMuc3dpdGNoU2xpZGVCeURpcmVjdGlvbihkaXJlY3Rpb24pXG5cdH1cblx0Ym90dG9tQ2xpY2tlZCgpIHtcblx0XHR0aGlzLnNjcm9sbFRhcmdldENoYW5nZWQodGhpcy5wYWdlSGVpZ2h0KVxuXHR9XG5cdG9uS2V5UHJlc3NlZChlKSB7XG5cdFx0aWYodGhpcy5hbmltYXRpb25SdW5uaW5nKSByZXR1cm5cblx0ICAgIGUucHJldmVudERlZmF1bHQoKVxuXHRcdHN3aXRjaChlLndoaWNoKSB7XG5cdCAgICAgICAgY2FzZSAzNzogLy8gbGVmdFxuXHQgICAgICAgIFx0dGhpcy5zd2l0Y2hTbGlkZUJ5RGlyZWN0aW9uKEFwcENvbnN0YW50cy5MRUZUKVxuXHQgICAgICAgIFx0YnJlYWs7XG5cdCAgICAgICAgY2FzZSAzOTogLy8gcmlnaHRcblx0ICAgICAgICBcdHRoaXMuc3dpdGNoU2xpZGVCeURpcmVjdGlvbihBcHBDb25zdGFudHMuUklHSFQpXG5cdCAgICAgICAgXHRicmVhaztcblx0ICAgICAgICBjYXNlIDM4OiAvLyB1cFxuXHQgICAgICAgIFx0YnJlYWs7XG5cdCAgICAgICAgY2FzZSA0MDogLy8gZG93blxuXHQgICAgICAgIFx0YnJlYWs7XG5cdCAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuXHQgICAgfVxuXHR9XG5cdHN3aXRjaFNsaWRlQnlEaXJlY3Rpb24oZGlyZWN0aW9uKSB7XG5cdFx0c3dpdGNoKGRpcmVjdGlvbikge1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEVGVDpcblx0XHRcdFx0dGhpcy5wcmV2aW91cygpXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5SSUdIVDpcblx0XHRcdFx0dGhpcy5uZXh0KClcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0aWYodGhpcy5jdXJyZW50SW5kZXggPiB0aGlzLnByb2R1Y3RzLmxlbmd0aC0xKSB7XG5cdFx0XHR2YXIgbmV4dElkID0gQXBwU3RvcmUuZ2V0TmV4dFBsYW5ldCh0aGlzLmlkKVxuXHRcdFx0dmFyIG5leHR1cmwgPSBcIi9wbGFuZXQvXCIgKyBuZXh0SWQgKyAnLzAnXG5cdFx0XHRSb3V0ZXIuc2V0SGFzaChuZXh0dXJsKVxuXHRcdFx0cmV0dXJuXG5cdFx0fWVsc2UgaWYodGhpcy5jdXJyZW50SW5kZXggPCAwKSB7XG5cdFx0XHR2YXIgcHJldmlvdXNJZCA9IEFwcFN0b3JlLmdldFByZXZpb3VzUGxhbmV0KHRoaXMuaWQpXG5cdFx0XHR2YXIgcHJvZHVjdHNEYXRhID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZChwcmV2aW91c0lkKVxuXHRcdFx0dmFyIHByZXZpb3VzdXJsID0gXCIvcGxhbmV0L1wiICsgcHJldmlvdXNJZCArICcvJyArIChwcm9kdWN0c0RhdGEubGVuZ3RoLTEpLnRvU3RyaW5nKClcblx0XHRcdFJvdXRlci5zZXRIYXNoKHByZXZpb3VzdXJsKVxuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXHRcdHRoaXMudXBkYXRlSGFzaGVyKClcblx0fVxuXHR1cGRhdGVIYXNoZXIoKSB7XG5cdFx0dmFyIHVybCA9IFwiL3BsYW5ldC9cIiArIHRoaXMuaWQgKyAnLycgKyB0aGlzLmN1cnJlbnRJbmRleFxuXHRcdFJvdXRlci5zZXRIYXNoKHVybClcblx0fVxuXHRuZXh0KCkge1xuXHRcdHRoaXMuZGlyZWN0aW9uID0gQXBwQ29uc3RhbnRzLkxFRlRcblx0XHR0aGlzLmN1cnJlbnRJbmRleCArPSAxXG5cdH1cblx0cHJldmlvdXMoKSB7XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuUklHSFRcblx0XHR0aGlzLmN1cnJlbnRJbmRleCAtPSAxXG5cdH1cblx0Z2V0Q3VycmVudEluZGV4RnJvbVByb2R1Y3RJZChwcm9kdWN0SWQpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucHJvZHVjdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmKHRoaXMucHJvZHVjdHNbaV0uaWQgPT0gcHJvZHVjdElkKSB7XG5cdFx0XHRcdHJldHVybiBpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGludGVybmFsSGFzaGVyQ2hhbmdlZCgpIHtcblx0XHR2YXIgbmV3SWQgPSBBcHBTdG9yZS5nZXRQYWdlSWQoKVxuXHRcdGlmKG5ld0lkICE9IHRoaXMuaWQpIHtcblx0XHRcdHRoaXMudXBkYXRlVGl0bGVzKHRoaXMuaW5mb3MucGxhbmV0LnRvVXBwZXJDYXNlKCksIG5ld0lkLnRvVXBwZXJDYXNlKCkpXG5cdFx0XHR0aGlzLnBvc2l0aW9uVGl0bGVzQ29udGFpbmVyKClcblx0XHR9XG5cdFx0dGhpcy5pZCA9IG5ld0lkXG5cdFx0dGhpcy5wcm9wcy5kYXRhID0gQXBwU3RvcmUucGFnZUNvbnRlbnQoKVxuXG5cdFx0dGhpcy51cGRhdGVQcm9kdWN0RGF0YSgpXG5cdFx0dGhpcy5mcm9tSW50ZXJuYWxDaGFuZ2UgPSB0cnVlXG5cdFx0dGhpcy5jaGVja0N1cnJlbnRQcm9kdWN0QnlVcmwoKVxuXG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5jdXJyZW50SW5kZXggPSB0aGlzLmN1cnJlbnRJbmRleFxuXHRcdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuY2hhbmdlRGF0YSh0aGlzLmlkKVxuXHRcdH1cblx0XHR0aGlzLnVwZGF0ZUNvbG9ycygpXG5cdH1cblx0Y2hlY2tDdXJyZW50UHJvZHVjdEJ5VXJsKCkge1xuXHRcdHZhciBuZXdIYXNoZXIgPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG5cdFx0dmFyIHByb2R1Y3RJZCA9IHBhcnNlSW50KG5ld0hhc2hlci50YXJnZXRJZCwgMTApXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggPSB0aGlzLmdldEN1cnJlbnRJbmRleEZyb21Qcm9kdWN0SWQocHJvZHVjdElkKVxuXHRcdHRoaXMuc2hvd1Byb2R1Y3RCeUlkKHByb2R1Y3RJZClcblx0fVxuXHR1cGRhdGVDb2xvcnMoKSB7XG5cdFx0dmFyIGNvbG9yID0gdGhpcy5wcm9kdWN0c1t0aGlzLmN1cnJlbnRJbmRleF0uY29sb3Jcblx0XHR0aGlzLmJ1eUJ0bi51cGRhdGVDb2xvcihjb2xvcilcblx0XHR2YXIgYyA9IGNvbG9yLnJlcGxhY2UoJzB4JywgJyMnKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5zcGlubmVyLnBhdGguY3NzKCdmaWxsJywgYylcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8uZWwuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgYylcblxuXHRcdHZhciAkYnV5QnRuID0gdGhpcy5idXlCdG4uZWxlbWVudFxuXHRcdHZhciBidXlVcmwgPSAnaHR0cDovL3d3dy5jYW1wZXIuY29tLycrSlNfbGFuZysnXycrSlNfY291bnRyeSt0aGlzLnByb2R1Y3RzW3RoaXMuY3VycmVudEluZGV4XVsncHJvZHVjdC11cmwnXVxuXHRcdCRidXlCdG4uYXR0cignaHJlZicsIGJ1eVVybClcblx0fVxuXHRzaG93UHJvZHVjdEJ5SWQoaWQpIHtcblx0XHR0aGlzLmFuaW1hdGlvblJ1bm5pbmcgPSB0cnVlXG5cdFx0dGhpcy5wcm9kdWN0SWQgPSBpZFxuXHRcdHRoaXMuY3VycmVudFByb2R1Y3RDb250YWluZXJDbGFzcyA9ICh0aGlzLmN1cnJlbnRQcm9kdWN0Q29udGFpbmVyQ2xhc3MgPT09ICdwcm9kdWN0LWNvbnRhaW5lci1hJykgPyAncHJvZHVjdC1jb250YWluZXItYicgOiAncHJvZHVjdC1jb250YWluZXItYSdcblx0XHR0aGlzLnByZXZpb3VzQ29udGFpbmVyID0gdGhpcy5jdXJyZW50Q29udGFpbmVyXG5cdFx0dGhpcy5yZW1vdmVWaWRlb0V2ZW50cygpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyID0gdGhpcy5jb250YWluZXJzW3RoaXMuY3VycmVudFByb2R1Y3RDb250YWluZXJDbGFzc11cblx0XHR0aGlzLmFkZFZpZGVvRXZlbnRzKClcblx0XHRcblx0XHR0aGlzLmFzc2lnbkFzc2V0c1RvTmV3Q29udGFpbmVyKClcblx0XHR0aGlzLnJlc2l6ZVZpZGVvV3JhcHBlcigpXG5cdFx0dGhpcy5yZXNpemVQb3N0ZXJXcmFwcGVycygpXG5cdFx0dGhpcy5hbmltYXRlQ29udGFpbmVycygpXG5cblx0XHR0aGlzLnVwZGF0ZVBhZ2VIZWlnaHQoKVxuXHR9XG5cdGFzc2lnbkFzc2V0c1RvTmV3Q29udGFpbmVyKCkge1xuXHRcdHZhciBwcm9kdWN0U2NvcGUgPSBBcHBTdG9yZS5nZXRTcGVjaWZpY1Byb2R1Y3RCeUlkKHRoaXMuaWQsIHRoaXMucHJvZHVjdElkKVxuXHRcdHZhciBpbWdTaXplID0gQXBwU3RvcmUucmVzcG9uc2l2ZVBvc3RlckltYWdlKClcblx0XHR2YXIgaW1nU3JjID0gQXBwU3RvcmUuZ2V0RW52aXJvbm1lbnQoKS5zdGF0aWMgKyAnaW1hZ2UvcGxhbmV0cy8nICsgdGhpcy5pZCArICcvJyArIHByb2R1Y3RTY29wZVsnaWQnXSArICctJyArIGltZ1NpemUgKyAnLmpwZydcblxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5wb3N0ZXJJbWcuYXR0cignc3JjJywgdGhpcy5wcm9wcy5kYXRhWydlbXB0eS1pbWFnZSddKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5wb3N0ZXJJbWcucmVtb3ZlQ2xhc3MoJ29wZW5lZCcpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnNwaW5uZXIuZWwucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpXG5cdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpXG5cdFx0aW1nLm9ubG9hZCA9ICgpPT4ge1xuXHRcdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnBvc3RlckltZy5hdHRyKCdzcmMnLCBpbWdTcmMpXG5cdFx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIuc3Bpbm5lci5lbC5hZGRDbGFzcygnY2xvc2VkJylcblx0XHRcdHRoaXMuY3VycmVudENvbnRhaW5lci5wb3N0ZXJJbWcuYWRkQ2xhc3MoJ29wZW5lZCcpXG5cdFx0fVxuXHRcdGltZy5zcmMgPSBpbWdTcmNcblxuXHRcdHRoaXMuYnV5QnRuLnVwZGF0ZSh0aGlzLmluZm9zLmJ1eV90aXRsZSArICcgJyArIHByb2R1Y3RTY29wZS5uYW1lKVxuXHR9XG5cdGFzc2lnblZpZGVvVG9OZXdDb250YWluZXIoKSB7XG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmNvbnRhaW5lci5yZW1vdmVDbGFzcygnb3BlbmVkJylcblxuXHRcdHZhciBwcm9kdWN0U2NvcGUgPSBBcHBTdG9yZS5nZXRTcGVjaWZpY1Byb2R1Y3RCeUlkKHRoaXMuaWQsIHRoaXMucHJvZHVjdElkKVxuXHRcdHZhciB2aWRlb0lkID0gcHJvZHVjdFNjb3BlWyd2aWRlby1pZCddXG5cdFx0dmFyIGZyYW1lVVVJRCA9IFV0aWxzLlVVSUQoKVxuXHRcdHZhciBpZnJhbWVTdHIgPSAnPGlmcmFtZSBzcmM9XCIvL2Zhc3Qud2lzdGlhLm5ldC9lbWJlZC9pZnJhbWUvJyt2aWRlb0lkKydcIiBpZD1cIicrZnJhbWVVVUlEKydcIiBhbGxvd3RyYW5zcGFyZW5jeT1cImZhbHNlXCIgZnJhbWVib3JkZXI9XCIwXCIgc2Nyb2xsaW5nPVwieWVzXCIgY2xhc3M9XCJ3aXN0aWFfZW1iZWRcIiBuYW1lPVwid2lzdGlhX2VtYmVkXCIgYWxsb3dmdWxsc2NyZWVuIG1vemFsbG93ZnVsbHNjcmVlbiB3ZWJraXRhbGxvd2Z1bGxzY3JlZW4gb2FsbG93ZnVsbHNjcmVlbiBtc2FsbG93ZnVsbHNjcmVlbiB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIxMDAlXCI+PC9pZnJhbWU+J1xuXHRcdHZhciBpZnJhbWUgPSAkKGlmcmFtZVN0cilcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8udXVpZCA9IGZyYW1lVVVJRFxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5jb250YWluZXIuaHRtbChpZnJhbWUpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvSXNBZGRlZCA9IHRydWVcblxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlby5jb250YWluZXIuYWRkQ2xhc3MoJ29wZW5lZCcpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvLmVsLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICd0cmFuc3BhcmVudCcpXG5cblx0XHQvLyBzZXRUaW1lb3V0KCgpPT57XG5cdFx0Ly8gXHR2YXIgd2lzdGlhRW1iZWQgPSAkKCcjJytmcmFtZVVVSUQpWzBdLndpc3RpYUFwaVxuXHRcdC8vIFx0d2lzdGlhRW1iZWQuYmluZChcImVuZFwiLCAoKT0+IHtcblx0XHQvLyBcdFx0YWxlcnQoXCJUaGUgdmlkZW8gZW5kZWQhXCIpO1xuXHRcdC8vIFx0fSk7XG5cdFx0Ly8gfSwgMjAwMClcblx0fVxuXHRhbmltYXRlQ29udGFpbmVycygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBkaXIgPSAodGhpcy5kaXJlY3Rpb24gPT0gQXBwQ29uc3RhbnRzLkxFRlQpID8gMSA6IC0xXG5cdFx0dmFyIHRpbWUgPSAodGhpcy5wcmV2aW91c0NvbnRhaW5lciA9PSB1bmRlZmluZWQpID8gMCA6IDFcblx0XHRpZih0aGlzLnByZXZpb3VzQ29udGFpbmVyICE9IHVuZGVmaW5lZCkgVHdlZW5NYXguZnJvbVRvKHRoaXMucHJldmlvdXNDb250YWluZXIuZWwsIDEsIHt4OjAsIG9wYWNpdHk6IDF9LCB7IHg6LXdpbmRvd1cqZGlyLCBvcGFjaXR5OiAxLCBmb3JjZTNEOnRydWUsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHRUd2Vlbk1heC5mcm9tVG8odGhpcy5jdXJyZW50Q29udGFpbmVyLmVsLCB0aW1lLCB7eDp3aW5kb3dXKmRpciwgb3BhY2l0eTogMX0sIHsgeDowLCBvcGFjaXR5OiAxLCBmb3JjZTNEOnRydWUsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR0aGlzLnVwZGF0ZVRvcEJ1dHRvbnNQb3NpdGlvbnMoKVxuXHRcdFx0dGhpcy5idXlCdG4uc2hvdygpXG5cdFx0fSwgMjAwKVxuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuYW5pbWF0aW9uUnVubmluZyA9IGZhbHNlXG5cdFx0XHR0aGlzLnJlbW92ZVByZXZpb3VzQ29udGFpbmVyQXNzZXRzKClcblx0XHRcdHRoaXMuYXNzaWduVmlkZW9Ub05ld0NvbnRhaW5lcigpXG5cdFx0fSwgdGhpcy50aW1lb3V0VGltZSlcblx0fVxuXHRyZW1vdmVQcmV2aW91c0NvbnRhaW5lckFzc2V0cygpIHtcblx0XHRpZih0aGlzLnByZXZpb3VzQ29udGFpbmVyID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cdFx0dGhpcy5wcmV2aW91c0NvbnRhaW5lci5wb3N0ZXJJbWcuYXR0cignc3JjJywgdGhpcy5wcm9wcy5kYXRhWydlbXB0eS1pbWFnZSddKVxuXHRcdHRoaXMucHJldmlvdXNDb250YWluZXIudmlkZW8uY29udGFpbmVyLmh0bWwoJycpXG5cdFx0dGhpcy5wcmV2aW91c0NvbnRhaW5lci52aWRlby5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ29wZW5lZCcpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvSXNBZGRlZCA9IGZhbHNlXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5jdXJyZW50SW5kZXggPSB0aGlzLmN1cnJlbnRJbmRleFxuXHRcdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVxuXHRcdH1cblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpXG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0d2lsbFRyYW5zaXRpb25PdXQoKSB7XG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci53aWxsVHJhbnNpdGlvbk91dCgpXG5cdFx0c3VwZXIud2lsbFRyYW5zaXRpb25PdXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZighQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLnVwZGF0ZSgpXG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemVWaWRlb1dyYXBwZXIoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHZhciBvcmllbnRhdGlvbiA9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyBBcHBDb25zdGFudHMuTEFORFNDQVBFIDogdW5kZWZpbmVkXG5cdFx0dmFyIHNjYWxlID0gKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSA/IDEgOiAwLjZcblxuXHRcdHZhciB2aWRlb1Jlc2l6ZSA9IFV0aWxzLlJlc2l6ZVBvc2l0aW9uUHJvcG9ydGlvbmFsbHkod2luZG93VyAqIHNjYWxlLCB3aW5kb3dIICogc2NhbGUsIEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfVywgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9ILCBvcmllbnRhdGlvbilcblx0XHRcblx0XHR2YXIgdmlkZW9Ub3AgPSAod2luZG93SCAqIDAuNTEpIC0gKHZpZGVvUmVzaXplLmhlaWdodCA+PiAxKVxuXHRcdHZpZGVvVG9wID0gKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSA/IDIyMCA6IHZpZGVvVG9wXG5cblx0XHR0aGlzLnZpZGVvQ3NzID0ge1xuXHRcdFx0d2lkdGg6IHZpZGVvUmVzaXplLndpZHRoLFxuXHRcdFx0aGVpZ2h0OiB2aWRlb1Jlc2l6ZS5oZWlnaHQsXG5cdFx0XHR0b3A6IHZpZGVvVG9wLFxuXHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAodmlkZW9SZXNpemUud2lkdGggPj4gMSlcdFxuXHRcdH1cblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW8uZWwuY3NzKHRoaXMudmlkZW9Dc3MpXG5cdFx0dGhpcy52aWRlb1RvdGFsSGVpZ2h0ID0gKHRoaXMudmlkZW9Dc3MudG9wIDw8IDEpICsgdGhpcy52aWRlb0Nzcy5oZWlnaHRcblx0fVxuXHRyZXNpemVQb3N0ZXJXcmFwcGVycygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dmFyIG9yaWVudGF0aW9uID0gKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSA/IEFwcENvbnN0YW50cy5MQU5EU0NBUEUgOiB1bmRlZmluZWRcblx0XHR2YXIgc2NhbGUgPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gMSA6IDAuNlxuXG5cdFx0dmFyIGltYWdlUmVzaXplID0gVXRpbHMuUmVzaXplUG9zaXRpb25Qcm9wb3J0aW9uYWxseSh3aW5kb3dXICogc2NhbGUsIHdpbmRvd0ggKiBzY2FsZSwgQXBwQ29uc3RhbnRzLkNBTVBBSUdOX0lNQUdFX1NJWkVbMF0sIEFwcENvbnN0YW50cy5DQU1QQUlHTl9JTUFHRV9TSVpFWzFdLCBvcmllbnRhdGlvbilcblx0XHRcblx0XHR2YXIgcG9zdGVyVG9wID0gKHRoaXMuY29tcGFzc1BhZGRpbmcgPDwgMSkgKyB3aW5kb3dIICsgdGhpcy52aWRlb0Nzcy50b3Bcblx0XHRwb3N0ZXJUb3AgPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gdGhpcy52aWRlb0Nzcy50b3AgKyB0aGlzLnZpZGVvQ3NzLmhlaWdodCArIDEzNiA6IHBvc3RlclRvcFxuXHRcdFxuXHRcdHRoaXMucG9zdGVySW1nQ3NzID0ge1xuXHRcdFx0d2lkdGg6IGltYWdlUmVzaXplLndpZHRoLFxuXHRcdFx0aGVpZ2h0OiBpbWFnZVJlc2l6ZS5oZWlnaHQsXG5cdFx0XHR0b3A6IHBvc3RlclRvcCxcblx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKGltYWdlUmVzaXplLndpZHRoID4+IDEpXG5cdFx0fVxuXG5cdFx0aWYodGhpcy5wcmV2aW91c0NvbnRhaW5lciAhPSB1bmRlZmluZWQpIHRoaXMucHJldmlvdXNDb250YWluZXIuZWwuY3NzKCd6LWluZGV4JywgMSlcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIuZWwuY3NzKCd6LWluZGV4JywgMilcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIucG9zdGVyV3JhcHBlci5jc3ModGhpcy5wb3N0ZXJJbWdDc3MpXG5cblx0XHR0aGlzLnBvc3RlclRvdGFsSGVpZ2h0ID0gKHRoaXMudmlkZW9Dc3MudG9wIDw8IDEpICsgdGhpcy5wb3N0ZXJJbWdDc3MuaGVpZ2h0XG5cdH1cblx0dXBkYXRlVG9wQnV0dG9uc1Bvc2l0aW9ucygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdFxuXHRcdHZhciBidXlUb3BQb3MgPSAodGhpcy5wb3N0ZXJJbWdDc3MudG9wICsgdGhpcy5wb3N0ZXJJbWdDc3MuaGVpZ2h0KSArICgodGhpcy5wYWdlSGVpZ2h0IC0gKCh0aGlzLnBvc3RlckltZ0Nzcy50b3ApICsgdGhpcy5wb3N0ZXJJbWdDc3MuaGVpZ2h0KSkgPj4gMSkgLSAodGhpcy5idXlCdG4uaGVpZ2h0KSAtICh0aGlzLmJ1eUJ0bi5oZWlnaHQgPj4gMSkgLSAodGhpcy5idXlCdG4uaGVpZ2h0ICogMC40KVxuXHRcdGJ1eVRvcFBvcyA9IChBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgPyB0aGlzLnZpZGVvQ3NzLnRvcCArIHRoaXMudmlkZW9Dc3MuaGVpZ2h0ICsgNDAgOiBidXlUb3BQb3Ncblx0XHRcblx0XHR0aGlzLmJ1eUJ0bi5wb3NpdGlvbihcblx0XHRcdCh3aW5kb3dXID4+IDEpIC0gKHRoaXMuYnV5QnRuLndpZHRoID4+IDEpLFxuXHRcdFx0YnV5VG9wUG9zXG5cdFx0KVxuXG5cdFx0dmFyIGRvd25Ub3BQb3MgPSAodGhpcy52aWRlb0Nzcy50b3AgKyB0aGlzLnZpZGVvQ3NzLmhlaWdodCkgKyAoKHdpbmRvd0ggLSAoKHRoaXMudmlkZW9Dc3MudG9wKSArIHRoaXMudmlkZW9Dc3MuaGVpZ2h0KSkgPj4gMSkgLSAodGhpcy5kb3duQnRuLmhlaWdodCA+PiAxKVxuXHRcdGRvd25Ub3BQb3MgPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gdGhpcy52aWRlb0Nzcy50b3AgKyB0aGlzLnZpZGVvQ3NzLmhlaWdodCArIDQwIDogZG93blRvcFBvc1xuXG5cdFx0dGhpcy5kb3duQnRuLnBvc2l0aW9uKFxuXHRcdFx0KHdpbmRvd1cgPj4gMSkgLSAodGhpcy5kb3duQnRuLndpZHRoID4+IDEpLFxuXHRcdFx0ZG93blRvcFBvc1xuXHRcdClcblx0fVxuXHRyZXNpemVDb21wYXNzQ29udGFpbmVyKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIucmVzaXplKClcblx0XHR0aGlzLmNvbXBhc3NQYWRkaW5nID0gMTQwXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIucG9zaXRpb24oXG5cdFx0XHQod2luZG93VyA+PiAxKSAtICh0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci53aWR0aCA+PiAxKSxcblx0XHRcdCh3aW5kb3dIKSArIHRoaXMuY29tcGFzc1BhZGRpbmcgKyAodGhpcy5jb21wYXNzUGFkZGluZyAqIDAuMylcblx0XHQpXG5cdH1cblx0dXBkYXRlUGFnZUhlaWdodCgpIHtcblx0XHR0aGlzLnBhZ2VIZWlnaHQgPSB0aGlzLnZpZGVvVG90YWxIZWlnaHQgKyB0aGlzLnBvc3RlclRvdGFsSGVpZ2h0ICsgKHRoaXMuY29tcGFzc1BhZGRpbmcgPDwgMSlcblx0fVxuXHRwb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdGNsZWFyVGltZW91dCh0aGlzLnRpdGxlVGltZW91dClcblx0XHR0aGlzLnRpdGxlVGltZW91dCA9IHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHZhciBjb21wYXNzU2l6ZSA9ICh3aW5kb3dIICogQXBwQ29uc3RhbnRzLkNPTVBBU1NfU0laRV9QRVJDRU5UQUdFKSA8PCAxXG5cdFx0XHR2YXIgdG9wT2Zmc2V0ID0gKHdpbmRvd0ggPj4gMSkgKyAoY29tcGFzc1NpemUgPj4gMSlcblx0XHRcdHZhciB0b3BQb3MgPSAodGhpcy52aWRlb0Nzcy50b3AgPj4gMSkgLSAodGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQuaGVpZ2h0KCkgPj4gMSlcblx0XHRcdHRvcFBvcyArPSAoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpID8gMzAgOiAwXG5cdFx0XHR2YXIgdGl0bGVzQ29udGFpbmVyQ3NzID0ge1xuXHRcdFx0XHR0b3A6IHRvcFBvcyxcblx0XHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAodGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQud2lkdGgoKSA+PiAxKSxcblx0XHRcdH1cblx0XHRcdHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LmNzcyh0aXRsZXNDb250YWluZXJDc3MpXG5cdFx0fSwgMClcblx0fVxuXHRyZXNpemUoKSB7XG5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0aWYoIUFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSB0aGlzLnJlc2l6ZUNvbXBhc3NDb250YWluZXIoKVxuXHRcdHRoaXMucG9zaXRpb25UaXRsZXNDb250YWluZXIoKVxuXHRcdHRoaXMucmVzaXplVmlkZW9XcmFwcGVyKClcblx0XHR0aGlzLnJlc2l6ZVBvc3RlcldyYXBwZXJzKClcblx0XHR0aGlzLnVwZGF0ZVBhZ2VIZWlnaHQoKVxuXHRcdHRoaXMudXBkYXRlVG9wQnV0dG9uc1Bvc2l0aW9ucygpXG5cblx0XHR2YXIgcHJldmlvdXNYUG9zID0gKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSA/IDAgOiAodGhpcy52aWRlb0Nzcy5sZWZ0ID4+IDEpIC0gKHRoaXMucHJldmlvdXNCdG4ud2lkdGggPj4gMSkgLSA0XG5cdFx0dmFyIG5leHRYUG9zID0gKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSA/IHdpbmRvd1cgLSB0aGlzLnByZXZpb3VzQnRuLndpZHRoIDogKHRoaXMudmlkZW9Dc3MubGVmdCArIHRoaXMudmlkZW9Dc3Mud2lkdGgpICsgKCh3aW5kb3dXIC0gKHRoaXMudmlkZW9Dc3MubGVmdCArIHRoaXMudmlkZW9Dc3Mud2lkdGgpKSA+PiAxKSAtICh0aGlzLm5leHRCdG4ud2lkdGggPj4gMSkgKyA0XG5cblx0XHR0aGlzLnByZXZpb3VzQnRuLnBvc2l0aW9uKFxuXHRcdFx0cHJldmlvdXNYUG9zLFxuXHRcdFx0KHdpbmRvd0ggPj4gMSkgLSAodGhpcy5wcmV2aW91c0J0bi5oZWlnaHQgPj4gMSlcblx0XHQpXG5cdFx0dGhpcy5uZXh0QnRuLnBvc2l0aW9uKFxuXHRcdFx0bmV4dFhQb3MsXG5cdFx0XHQod2luZG93SCA+PiAxKSAtICh0aGlzLnByZXZpb3VzQnRuLmhlaWdodCA+PiAxKVxuXHRcdClcblxuXHRcdHZhciBjaGlsZENzcyA9IHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXLFxuXHRcdH1cblx0XHR0aGlzLmNoaWxkLmNzcyhjaGlsZENzcylcblxuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0JChkb2N1bWVudCkub2ZmKCdrZXlkb3duJywgdGhpcy5vbktleVByZXNzZWQpXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMudmlkZW9Bc3NpZ25UaW1lb3V0KVxuXHRcdGlmKCFBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgdGhpcy5jb21wYXNzZXNDb250YWluZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMucHJldmlvdXNCdG4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMubmV4dEJ0bi5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5idXlCdG4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuZG93bkJ0bi5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVBsYW5ldFBhZ2UgZnJvbSAnQmFzZVBsYW5ldFBhZ2UnXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3Nlc0NvbnRhaW5lciBmcm9tICdDb21wYXNzZXNDb250YWluZXInXG5pbXBvcnQgUmVjdGFuZ2xlQnRuIGZyb20gJ1JlY3RhbmdsZUJ0bidcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuaW1wb3J0IEFsYXNrYVhQIGZyb20gJ0FsYXNrYVhQJ1xuaW1wb3J0IFNraVhQIGZyb20gJ1NraVhQJ1xuaW1wb3J0IE1ldGFsWFAgZnJvbSAnTWV0YWxYUCdcbmltcG9ydCBXb29kWFAgZnJvbSAnV29vZFhQJ1xuaW1wb3J0IEdlbVN0b25lWFAgZnJvbSAnR2VtU3RvbmVYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxhbmV0RXhwZXJpZW5jZVBhZ2UgZXh0ZW5kcyBCYXNlUGxhbmV0UGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cblx0XHR2YXIgaW5mb3MgPSBBcHBTdG9yZS5nZW5lcmFsSW5mb3NMYW5nU2NvcGUoKVxuXG5cdFx0dmFyIFhwQ2xhenogPSB0aGlzLmdldEV4cGVyaWVuY2VCeUlkKHRoaXMuaWQpXG5cdFx0dGhpcy5leHBlcmllbmNlID0gbmV3IFhwQ2xhenoodGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLmV4cGVyaWVuY2UuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdFxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyID0gbmV3IENvbXBhc3Nlc0NvbnRhaW5lcih0aGlzLnB4Q29udGFpbmVyLCB0aGlzLmNoaWxkKVxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmlkID0gdGhpcy5pZFxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHRoaXMuZ29DYW1wYWlnbkJ0biA9IG5ldyBSZWN0YW5nbGVCdG4odGhpcy5jaGlsZC5maW5kKCcuZ28tY2FtcGFpZ24tYnRuJyksIGluZm9zLmNhbXBhaWduX3RpdGxlKVxuXHRcdHRoaXMuZ29DYW1wYWlnbkJ0bi5idG5DbGlja2VkID0gdGhpcy5vbkdvQ2FtcGFpZ25DbGlja2VkXG5cdFx0dGhpcy5nb0NhbXBhaWduQnRuLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRvbkdvQ2FtcGFpZ25DbGlja2VkKCkge1xuXHRcdHZhciB1cmwgPSBcIi9wbGFuZXQvXCIgKyB0aGlzLmlkICsgJy8wJ1xuXHRcdFJvdXRlci5zZXRIYXNoKHVybClcblx0fVxuXHRnZXRFeHBlcmllbmNlQnlJZChpZCkge1xuXHRcdHN3aXRjaChpZCl7XG5cdFx0XHRjYXNlICdza2knOiByZXR1cm4gU2tpWFBcblx0XHRcdGNhc2UgJ21ldGFsJzogcmV0dXJuIE1ldGFsWFBcblx0XHRcdGNhc2UgJ2FsYXNrYSc6IHJldHVybiBBbGFza2FYUFxuXHRcdFx0Y2FzZSAnd29vZCc6IHJldHVybiBXb29kWFBcblx0XHRcdGNhc2UgJ2dlbXN0b25lJzogcmV0dXJuIEdlbVN0b25lWFBcblx0XHR9XG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVx0XG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHN1cGVyLndpbGxUcmFuc2l0aW9uT3V0KClcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci53aWxsVHJhbnNpdGlvbk91dCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHRoaXMuZXhwZXJpZW5jZS51cGRhdGUoKVxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR0aGlzLmV4cGVyaWVuY2UucmVzaXplKClcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5yZXNpemUoKVxuXG5cdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dmFyIGNvbXBhc3NDb250YWluZXJCb3R0b20gPSB0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci55ICsgdGhpcy5jb21wYXNzZXNDb250YWluZXIuaGVpZ2h0XG5cdFx0XHR0aGlzLmdvQ2FtcGFpZ25CdG4ucG9zaXRpb24oXG5cdFx0XHRcdCh3aW5kb3dXID4+IDEpIC0gKHRoaXMuZ29DYW1wYWlnbkJ0bi53aWR0aCA+PiAxKSxcblx0XHRcdFx0Y29tcGFzc0NvbnRhaW5lckJvdHRvbSArICh0aGlzLmdvQ2FtcGFpZ25CdG4uaGVpZ2h0ID4+IDEpXG5cdFx0XHQpXG5cdFx0fSwgMClcblxuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuZ29DYW1wYWlnbkJ0bi5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgS25vdCBmcm9tICdLbm90J1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY3RhbmdsZUJ0biB7XG5cdGNvbnN0cnVjdG9yKGVsZW1lbnQsIHRpdGxlVHh0LCByZWN0Vykge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcblx0XHR0aGlzLnRpdGxlVHh0ID0gdGl0bGVUeHRcblx0XHR0aGlzLnJlY3RXID0gcmVjdFdcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnRsT3ZlciA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLnRsT3V0ID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdHRoaXMud2lkdGggPSAwXG5cdFx0dGhpcy5oZWlnaHQgPSAwXG5cdFx0dmFyIGtub3RzRWwgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5rbm90XCIpXG5cdFx0dmFyIGxpbmVzRWwgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5saW5lXCIpXG5cdFx0dmFyIHRpdGxlRWwgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5idG4tdGl0bGVcIilcblx0XHR2YXIgcmFkaXVzID0gM1xuXHRcdHZhciBwYWRkaW5nWCA9IDI0XG5cdFx0dmFyIHBhZGRpbmdZID0gMjBcblx0XHR0aGlzLmxpbmVTaXplID0gQXBwU3RvcmUuZ2V0TGluZVdpZHRoKClcblx0XHRpZih0aGlzLnRpdGxlVHh0ICE9IHVuZGVmaW5lZCkgdGl0bGVFbC50ZXh0KHRoaXMudGl0bGVUeHQpXG5cblx0XHRzZXRUaW1lb3V0KCgpPT57XG5cblx0XHRcdHZhciB0aXRsZVcgPSB0aGlzLnJlY3RXXG5cdFx0XHR2YXIgdGl0bGVIID0gQXBwQ29uc3RhbnRzLkdMT0JBTF9GT05UX1NJWkVcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrbm90c0VsLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBrbm90ID0gJChrbm90c0VsW2ldKVxuXHRcdFx0XHRrbm90LmF0dHIoJ3InLCByYWRpdXMpXG5cdFx0XHR9O1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lc0VsLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBsaW5lID0gJChsaW5lc0VsW2ldKVxuXHRcdFx0XHRsaW5lLmNzcygnc3Ryb2tlLXdpZHRoJywgdGhpcy5saW5lU2l6ZSlcblx0XHRcdH07XG5cblx0XHRcdHRoaXMud2lkdGggPSB0aXRsZVcgKyAocGFkZGluZ1ggPDwgMSlcblx0XHRcdHRoaXMuaGVpZ2h0ID0gdGl0bGVIICsgKHBhZGRpbmdZIDw8IDEpXG5cdFx0XHR0aXRsZUVsLmNzcyh7XG5cdFx0XHRcdGxlZnQ6ICh0aGlzLndpZHRoID4+IDEpIC0gKHRpdGxlVyA+PiAxKSxcblx0XHRcdFx0dG9wOiAodGhpcy5oZWlnaHQgPj4gMSkgLSAodGl0bGVIID4+IDEpXG5cdFx0XHR9KVxuXHRcdFx0dGhpcy5lbGVtZW50LmNzcyh7XG5cdFx0XHRcdHdpZHRoOiB0aGlzLndpZHRoLFxuXHRcdFx0XHRoZWlnaHQ6IHRoaXMuaGVpZ2h0XG5cdFx0XHR9KVxuXG5cdFx0XHR2YXIgc3RhcnRYID0gcmFkaXVzICogM1xuXHRcdFx0dmFyIHN0YXJ0WSA9IHJhZGl1cyAqIDNcblx0XHRcdHZhciBvZmZzZXRVcERvd24gPSAwLjZcblx0XHRcdCQoa25vdHNFbC5nZXQoMCkpLmF0dHIoe1xuXHRcdFx0XHQnY3gnOiBzdGFydFggKyAwLFxuXHRcdFx0XHQnY3knOiBzdGFydFkgKyAwXG5cdFx0XHR9KVxuXHRcdFx0JChrbm90c0VsLmdldCgxKSkuYXR0cih7XG5cdFx0XHRcdCdjeCc6IHRoaXMud2lkdGggLSBzdGFydFgsXG5cdFx0XHRcdCdjeSc6IHN0YXJ0WSArIDBcblx0XHRcdH0pXG5cdFx0XHQkKGtub3RzRWwuZ2V0KDIpKS5hdHRyKHtcblx0XHRcdFx0J2N4Jzogc3RhcnRYICsgMCxcblx0XHRcdFx0J2N5JzogdGhpcy5oZWlnaHQgLSBzdGFydFlcblx0XHRcdH0pXG5cdFx0XHQkKGtub3RzRWwuZ2V0KDMpKS5hdHRyKHtcblx0XHRcdFx0J2N4JzogdGhpcy53aWR0aCAtIHN0YXJ0WCxcblx0XHRcdFx0J2N5JzogdGhpcy5oZWlnaHQgLSBzdGFydFlcblx0XHRcdH0pXG5cdFx0XHQkKGxpbmVzRWwuZ2V0KDApKS5hdHRyKHtcblx0XHRcdFx0J3gxJzogc3RhcnRYICsgMCxcblx0XHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdFx0J3gyJzogdGhpcy53aWR0aCAtIHN0YXJ0WCxcblx0XHRcdFx0J3kyJzogc3RhcnRZICsgMFxuXHRcdFx0fSlcblx0XHRcdCQobGluZXNFbC5nZXQoMSkpLmF0dHIoe1xuXHRcdFx0XHQneDEnOiB0aGlzLndpZHRoIC0gc3RhcnRYLFxuXHRcdFx0XHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdFx0XHQneDInOiB0aGlzLndpZHRoIC0gc3RhcnRYLFxuXHRcdFx0XHQneTInOiB0aGlzLmhlaWdodCAtIHN0YXJ0WVxuXHRcdFx0fSlcblx0XHRcdCQobGluZXNFbC5nZXQoMikpLmF0dHIoe1xuXHRcdFx0XHQneDEnOiB0aGlzLndpZHRoIC0gc3RhcnRYLFxuXHRcdFx0XHQneTEnOiB0aGlzLmhlaWdodCAtIHN0YXJ0WSxcblx0XHRcdFx0J3gyJzogc3RhcnRZICsgMCxcblx0XHRcdFx0J3kyJzogdGhpcy5oZWlnaHQgLSBzdGFydFlcblx0XHRcdH0pXG5cdFx0XHQkKGxpbmVzRWwuZ2V0KDMpKS5hdHRyKHtcblx0XHRcdFx0J3gxJzogc3RhcnRYICsgMCxcblx0XHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdFx0J3gyJzogc3RhcnRYICsgMCxcblx0XHRcdFx0J3kyJzogdGhpcy5oZWlnaHQgLSBzdGFydFlcblx0XHRcdH0pXG5cblx0XHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMF0sIDEsIHsgeDotMywgeTotMywgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFsxXSwgMSwgeyB4OjMsIHk6LTMsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMl0sIDEsIHsgeDotMywgeTozLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzNdLCAxLCB7IHg6MywgeTozLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3Zlci50byhsaW5lc0VsWzBdLCAxLCB7IHNjYWxlWDoxLjA1LCB5Oi0zLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3Zlci50byhsaW5lc0VsWzFdLCAxLCB7IHNjYWxlWToxLjA1LCB4OjMsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMl0sIDEsIHsgc2NhbGVYOjEuMDUsIHk6MywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFszXSwgMSwgeyBzY2FsZVk6MS4wNSwgeDotMywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbMF0sIDEsIHsgeDowLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFsxXSwgMSwgeyB4OjAsIHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE91dC50byhrbm90c0VsWzJdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbM10sIDEsIHsgeDowLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8obGluZXNFbFswXSwgMSwgeyBzY2FsZVg6MSwgeTowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMV0sIDEsIHsgc2NhbGVZOjEsIHg6MCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzJdLCAxLCB7IHNjYWxlWDoxLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8obGluZXNFbFszXSwgMSwgeyBzY2FsZVk6MSwgeDowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cblx0XHRcdHRoaXMudGxPdmVyLnBhdXNlKDApXG5cdFx0XHR0aGlzLnRsT3V0LnBhdXNlKDApXG5cblx0XHRcdC8vIHRoaXMucm9sbG92ZXIgPSB0aGlzLnJvbGxvdmVyLmJpbmQodGhpcylcblx0XHRcdC8vIHRoaXMucm9sbG91dCA9IHRoaXMucm9sbG91dC5iaW5kKHRoaXMpXG5cdFx0XHQvLyB0aGlzLmNsaWNrID0gdGhpcy5jbGljay5iaW5kKHRoaXMpXG5cdFx0XHQvLyB0aGlzLmVsZW1lbnQub24oJ21vdXNlZW50ZXInLCB0aGlzLnJvbGxvdmVyKVxuXHRcdFx0Ly8gdGhpcy5lbGVtZW50Lm9uKCdtb3VzZWxlYXZlJywgdGhpcy5yb2xsb3V0KVxuXHRcdFx0Ly8gdGhpcy5lbGVtZW50Lm9uKCdjbGljaycsIHRoaXMuY2xpY2spXG5cdFx0fSwgMClcblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0VXRpbHMuVHJhbnNsYXRlKHRoaXMuZWxlbWVudC5nZXQoMCksIHgsIHksIDApXG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRjbGljayhlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0aWYodGhpcy5idG5DbGlja2VkICE9IHVuZGVmaW5lZCkgdGhpcy5idG5DbGlja2VkKClcblx0fVxuXHRyb2xsb3V0KCkge1xuXHRcdHRoaXMudGxPdmVyLmtpbGwoKVxuXHRcdHRoaXMudGxPdXQucGxheSgwKVxuXHR9XG5cdHJvbGxvdmVyKCkge1xuXHRcdHRoaXMudGxPdXQua2lsbCgpXG5cdFx0dGhpcy50bE92ZXIucGxheSgwKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEFwcFN0b3JlLnJlbGVhc2VUaW1lbGluZSh0aGlzLnRsT3Zlcilcblx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bE91dClcblx0XHQvLyB0aGlzLmVsZW1lbnQub2ZmKCdtb3VzZWVudGVyJywgdGhpcy5yb2xsb3Zlcilcblx0XHQvLyB0aGlzLmVsZW1lbnQub2ZmKCdtb3VzZWxlYXZlJywgdGhpcy5yb2xsb3V0KVxuXHRcdC8vIHRoaXMuZWxlbWVudC5vZmYoJ2NsaWNrJywgdGhpcy5jbGljaylcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTY3JvbGxCYXIge1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudFxuICAgICAgICB0aGlzLnBhZ2VIZWlnaHQgPSB1bmRlZmluZWRcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQgPSB1bmRlZmluZWRcbiAgICAgICAgdGhpcy5uZXdQb3NZID0gMFxuICAgICAgICB0aGlzLmVhc2UgPSAwLjFcbiAgICAgICAgdGhpcy5tb3VzZUluRG93biA9IGZhbHNlXG4gICAgfVxuICAgIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgICB0aGlzLm9uTW91c2VEb3duID0gdGhpcy5vbk1vdXNlRG93bi5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMub25Nb3VzZU1vdmUgPSB0aGlzLm9uTW91c2VNb3ZlLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy5vbk1vdXNlVXAgPSB0aGlzLm9uTW91c2VVcC5iaW5kKHRoaXMpXG5cbiAgICAgICAgdGhpcy5ncmFiID0gdGhpcy5lbGVtZW50LmZpbmQoXCIuc2Nyb2xsLWdyYWIuYnRuXCIpXG4gICAgICAgIHRoaXMuZ3JhYkVsID0gdGhpcy5ncmFiLmdldCgwKVxuICAgICAgICB0aGlzLmdyYWIub24oXCJtb3VzZWRvd25cIiwgdGhpcy5vbk1vdXNlRG93bilcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgdGhpcy5ncmFiVyA9IHRoaXMuZ3JhYi53aWR0aCgpXG4gICAgICAgICAgICB0aGlzLmdyYWJIID0gdGhpcy5ncmFiLmhlaWdodCgpXG4gICAgICAgIH0sIDApXG4gICAgfVxuICAgIG9uTW91c2VEb3duKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIHRoaXMubW91c2VJbkRvd24gPSB0cnVlXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCB0aGlzLm9uTW91c2VNb3ZlKVxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZXVwXCIsIHRoaXMub25Nb3VzZVVwKVxuICAgIH1cbiAgICBvbk1vdXNlVXAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgdGhpcy5tb3VzZUluRG93biA9IGZhbHNlXG4gICAgICAgIHRoaXMua2lsbEFsbEV2ZW50cygpXG4gICAgfVxuICAgIG9uTW91c2VNb3ZlKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcbiAgICAgICAgdmFyIHBvc1kgPSAodGhpcy5wYWdlSGVpZ2h0IC8gd2luZG93SCApICogZS5jbGllbnRZXG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0SGFuZGxlcihwb3NZKVxuICAgIH1cbiAgICBzZXRTY3JvbGxUYXJnZXQodmFsKSB7XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gdmFsXG4gICAgfVxuICAgIGtpbGxBbGxFdmVudHMoKSB7XG4gICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgdGhpcy5vbk1vdXNlTW92ZSlcbiAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNldXBcIiwgdGhpcy5vbk1vdXNlVXApXG4gICAgfVxuICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgdmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuICAgICAgICB2YXIgcG9zWSA9IE1hdGgucm91bmQoKHRoaXMuc2Nyb2xsVGFyZ2V0IC8gdGhpcy5wYWdlSGVpZ2h0KSAqICh3aW5kb3dIIC0gdGhpcy5ncmFiSCkpXG4gICAgICAgIGlmKGlzTmFOKHBvc1kpKSByZXR1cm5cbiAgICAgICAgdGhpcy5uZXdQb3NZICs9IChwb3NZIC0gdGhpcy5uZXdQb3NZKSAqIHRoaXMuZWFzZVxuICAgICAgICB2YXIgcCA9IHRoaXMubmV3UG9zWVxuICAgICAgICBVdGlscy5UcmFuc2xhdGUodGhpcy5ncmFiRWwsIDAsIHAsIDApXG4gICAgfVxuICAgIHJlc2l6ZSgpIHtcbiAgICB9XG4gICAgY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgICAgIHRoaXMuZ3JhYi5vZmYoXCJtb3VzZWRvd25cIiwgdGhpcy5vbk1vdXNlRG93bilcbiAgICAgICAgdGhpcy5raWxsQWxsRXZlbnRzKClcbiAgICB9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5pbXBvcnQgVmVjMiBmcm9tICdWZWMyJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNtYWxsQ29tcGFzcyB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCB0eXBlKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lciA9IHB4Q29udGFpbmVyXG5cdFx0dGhpcy50eXBlID0gdHlwZSB8fCBBcHBDb25zdGFudHMuTEFORElOR1xuXHRcdHRoaXMuYm91bmNlID0gLTFcblx0fVxuXHRjb21wb25lbnREaWRNb3VudChkYXRhLCBuYW1lLCBwYXJlbnRFbCwgcGxhbmV0VHh0KSB7XG5cdFx0dGhpcy5wYXJlbnRFbCA9IHBhcmVudEVsXG5cdFx0dGhpcy5jb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5jb250YWluZXIpXG5cblx0XHR0aGlzLmJnQ2lyY2xlID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuYmdDaXJjbGUpXG5cblx0XHR2YXIga25vdFJhZGl1cyA9IEFwcENvbnN0YW50cy5TTUFMTF9LTk9UX1JBRElVU1xuXHRcdHRoaXMucmFkaXVzID0gMzBcblx0XHR0aGlzLnJhZGl1c0xpbWl0ID0gKHRoaXMucmFkaXVzKjAuOCkgLSAoa25vdFJhZGl1cz4+MSlcblx0XHR0aGlzLndpZHRoID0gdGhpcy5yYWRpdXNcblx0XHR0aGlzLmhlaWdodCA9IHRoaXMucmFkaXVzXG5cblx0XHR2YXIgY29tcGFzc05hbWUgPSBwbGFuZXRUeHQudG9VcHBlckNhc2UoKSArICcgJyArIG5hbWUudG9VcHBlckNhc2UoKVxuXHRcdHRoaXMuZWxlbWVudCA9IHRoaXMucGFyZW50RWwuZmluZCgnLmNvbXBhc3Nlcy10ZXh0cy13cmFwcGVyJylcblx0XHR2YXIgY29udGFpbmVyRWwgPSAkKCc8ZGl2IGNsYXNzPVwidGV4dHMtY29udGFpbmVyIGJ0blwiPjwvZGl2PicpXG5cdFx0dGhpcy5lbGVtZW50LmFwcGVuZChjb250YWluZXJFbClcblx0XHR2YXIgdGl0bGVUb3AgPSAkKCc8ZGl2IGNsYXNzPVwidG9wLXRpdGxlXCI+PC9kaXYnKVxuXG5cdFx0dGhpcy5jaXJjbGVSYWQgPSA5MFxuXHRcdHZhciBjaXJjbGVwYXRoID0gJ00wLCcrdGhpcy5jaXJjbGVSYWQvMisnYScrdGhpcy5jaXJjbGVSYWQvMisnLCcrdGhpcy5jaXJjbGVSYWQvMisnIDAgMSwwICcrdGhpcy5jaXJjbGVSYWQrJywwYScrdGhpcy5jaXJjbGVSYWQvMisnLCcrdGhpcy5jaXJjbGVSYWQvMisnIDAgMSwwIC0nK3RoaXMuY2lyY2xlUmFkKycsMCdcblx0XHR2YXIgc3ZnU3RyID0gJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiPiA8ZGVmcz4gPHBhdGggaWQ9XCJwYXRoMVwiIGQ9XCInK2NpcmNsZXBhdGgrJ1wiID4gPC9wYXRoPiA8L2RlZnM+IDx0ZXh0IGZpbGw9XCJ3aGl0ZVwiIGlkPVwibXlUZXh0XCI+IDx0ZXh0UGF0aCB4bGluazpocmVmPVwiI3BhdGgxXCI+IDx0c3BhbiBkeD1cIjBweFwiIGR5PVwiMHB4XCI+JyArIGNvbXBhc3NOYW1lICsgJzwvdHNwYW4+IDwvdGV4dFBhdGg+IDwvdGV4dD48L3N2Zz4nXG5cdFx0dmFyIHRpdGxlVG9wU3ZnID0gJChzdmdTdHIpXG5cdFx0dGl0bGVUb3AuYXBwZW5kKHRpdGxlVG9wU3ZnKVxuXHRcdGNvbnRhaW5lckVsLmFwcGVuZCh0aXRsZVRvcClcblx0XHR0aXRsZVRvcFN2Zy5jc3Moe1xuXHRcdFx0d2lkdGg6IHRoaXMuY2lyY2xlUmFkLFxuXHRcdFx0aGVpZ2h0OiB0aGlzLmNpcmNsZVJhZFxuXHRcdH0pXG5cdFx0dGhpcy50aXRsZXMgPSB7XG5cdFx0XHRjb250YWluZXI6IGNvbnRhaW5lckVsLFxuXHRcdFx0JHRpdGxlVG9wOiB0aXRsZVRvcCxcblx0XHRcdHRpdGxlVG9wOiB0aXRsZVRvcC5nZXQoMCksXG5cdFx0XHRyb3RhdGlvbjogMCxcblx0XHR9XG5cblx0XHR0aGlzLm9uQ2xpY2tlZCA9IHRoaXMub25DbGlja2VkLmJpbmQodGhpcylcblx0XHR0aGlzLnRpdGxlcy5jb250YWluZXIub24oJ2NsaWNrJywgdGhpcy5vbkNsaWNrZWQpXG5cblx0XHR0aGlzLmtub3RzID0gW11cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBkID0gZGF0YVtpXVxuXHRcdFx0dmFyIGtub3QgPSBuZXcgS25vdCh0aGlzLmNvbnRhaW5lciwga25vdFJhZGl1cywgMHhmZmZmZmYpLmNvbXBvbmVudERpZE1vdW50KClcblx0XHRcdGtub3QubWFzcyA9IGtub3RSYWRpdXNcblx0XHRcdGtub3QudnggPSBNYXRoLnJhbmRvbSgpICogMC44XG4gICAgICAgICAgICBrbm90LnZ5ID0gTWF0aC5yYW5kb20oKSAqIDAuOFxuICAgICAgICAgICAga25vdC5wb3NWZWMgPSBuZXcgUElYSS5Qb2ludCgwLCAwKVxuICAgICAgICAgICAga25vdC5wb3NGVmVjID0gbmV3IFBJWEkuUG9pbnQoMCwgMClcbiAgICAgICAgICAgIGtub3QudmVsVmVjID0gbmV3IFBJWEkuUG9pbnQoMCwgMClcbiAgICAgICAgICAgIGtub3QudmVsRlZlYyA9IG5ldyBQSVhJLlBvaW50KDAsIDApXG5cdFx0XHRrbm90LnBvc2l0aW9uKFV0aWxzLlJhbmQoLXRoaXMucmFkaXVzTGltaXQsIHRoaXMucmFkaXVzTGltaXQpLCBVdGlscy5SYW5kKC10aGlzLnJhZGl1c0xpbWl0LCB0aGlzLnJhZGl1c0xpbWl0KSlcblx0XHRcdHRoaXMua25vdHNbaV0gPSBrbm90XG5cdFx0fVxuXG5cdFx0dmFyIGxpbmVXID0gQXBwU3RvcmUuZ2V0TGluZVdpZHRoKClcblx0XHQvLyBkcmF3IGEgcmVjdGFuZ2xlXG5cdFx0dGhpcy5iZ0NpcmNsZS5jbGVhcigpXG5cdFx0dGhpcy5iZ0NpcmNsZS5saW5lU3R5bGUobGluZVcsIDB4ZmZmZmZmLCAxKVxuXHRcdHRoaXMuYmdDaXJjbGUuYmVnaW5GaWxsKDB4ZmZmZmZmLCAwKVxuXHRcdHRoaXMuYmdDaXJjbGUuZHJhd0NpcmNsZSgwLCAwLCB0aGlzLnJhZGl1cylcblx0fVxuXHRvbkNsaWNrZWQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciB1cmwgPSBcIi9wbGFuZXQvXCIgKyB0aGlzLmlkICsgXCIvMFwiXG5cdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHR9XG5cdGNoZWNrV2FsbHMoa25vdCkge1xuXHRcdGlmKGtub3QueCArIGtub3QucmFkaXVzID4gdGhpcy5yYWRpdXNMaW1pdCkge1xuXHQgICAgICAgIGtub3QueCA9IHRoaXMucmFkaXVzTGltaXQgLSBrbm90LnJhZGl1cztcblx0ICAgICAgICBrbm90LnZ4ICo9IHRoaXMuYm91bmNlO1xuXHQgICAgfWVsc2UgaWYoa25vdC54IC0ga25vdC5yYWRpdXMgPCAtdGhpcy5yYWRpdXNMaW1pdC1rbm90LnJhZGl1cykge1xuXHQgICAgICAgIGtub3QueCA9IC10aGlzLnJhZGl1c0xpbWl0ICsga25vdC5yYWRpdXMta25vdC5yYWRpdXM7XG5cdCAgICAgICAga25vdC52eCAqPSB0aGlzLmJvdW5jZTtcblx0ICAgIH1cblx0ICAgIGlmKGtub3QueSArIGtub3QucmFkaXVzID4gdGhpcy5yYWRpdXNMaW1pdCkge1xuXHQgICAgICAgIGtub3QueSA9IHRoaXMucmFkaXVzTGltaXQgLSBrbm90LnJhZGl1cztcblx0ICAgICAgICBrbm90LnZ5ICo9IHRoaXMuYm91bmNlO1xuXHQgICAgfWVsc2UgaWYoa25vdC55IC0ga25vdC5yYWRpdXMgPCAtdGhpcy5yYWRpdXNMaW1pdCkge1xuXHQgICAgICAgIGtub3QueSA9IC10aGlzLnJhZGl1c0xpbWl0ICsga25vdC5yYWRpdXM7XG5cdCAgICAgICAga25vdC52eSAqPSB0aGlzLmJvdW5jZTtcblx0ICAgIH1cblx0fVxuXHRjaGVja0NvbGxpc2lvbihrbm90QSwga25vdEIpIHtcblx0XHR2YXIgZHggPSBrbm90Qi54IC0ga25vdEEueDtcblx0ICAgIHZhciBkeSA9IGtub3RCLnkgLSBrbm90QS55O1xuXHQgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoZHgqZHggKyBkeSpkeSk7XG5cdCAgICBpZihkaXN0IDwga25vdEEucmFkaXVzICsga25vdEIucmFkaXVzKSB7XG5cdCAgICAgICAgdmFyIGFuZ2xlID0gTWF0aC5hdGFuMihkeSwgZHgpXG5cdCAgICAgICAgdmFyIHNpbiA9IE1hdGguc2luKGFuZ2xlKVxuXHQgICAgICAgIHZhciBjb3MgPSBNYXRoLmNvcyhhbmdsZSlcblx0ICAgICAgICBrbm90QS5wb3NWZWMueCA9IDBcblx0ICAgICAgICBrbm90QS5wb3NWZWMueSA9IDBcblx0ICAgICAgICB0aGlzLnJvdGF0ZShrbm90Qi5wb3NWZWMsIGR4LCBkeSwgc2luLCBjb3MsIHRydWUpXG5cdCAgICAgICAgdGhpcy5yb3RhdGUoa25vdEEudmVsVmVjLCBrbm90QS52eCwga25vdEEudnksIHNpbiwgY29zLCB0cnVlKVxuXHQgICAgICAgIHRoaXMucm90YXRlKGtub3RCLnZlbFZlYywga25vdEIudngsIGtub3RCLnZ5LCBzaW4sIGNvcywgdHJ1ZSlcblxuXHQgICAgICAgIC8vIGNvbGxpc2lvbiByZWFjdGlvblxuXHRcdFx0dmFyIHZ4VG90YWwgPSBrbm90QS52ZWxWZWMueCAtIGtub3RCLnZlbFZlYy54XG5cdFx0XHRrbm90QS52ZWxWZWMueCA9ICgoa25vdEEubWFzcyAtIGtub3RCLm1hc3MpICoga25vdEEudmVsVmVjLnggKyAyICoga25vdEIubWFzcyAqIGtub3RCLnZlbFZlYy54KSAvIChrbm90QS5tYXNzICsga25vdEIubWFzcylcblx0XHRcdGtub3RCLnZlbFZlYy54ID0gdnhUb3RhbCArIGtub3RBLnZlbFZlYy54XG5cblx0XHRcdC8vIHVwZGF0ZSBwb3NpdGlvblxuXHRcdFx0a25vdEEucG9zVmVjLnggKz0ga25vdEEudmVsVmVjLng7XG5cdFx0XHRrbm90Qi5wb3NWZWMueCArPSBrbm90Qi52ZWxWZWMueDtcblxuXHRcdFx0Ly8gcm90YXRlIHBvc2l0aW9ucyBiYWNrXG5cdFx0XHR0aGlzLnJvdGF0ZShrbm90QS5wb3NGVmVjLCBrbm90QS5wb3NWZWMueCwga25vdEEucG9zVmVjLnksIHNpbiwgY29zLCBmYWxzZSlcblx0XHRcdHRoaXMucm90YXRlKGtub3RCLnBvc0ZWZWMsIGtub3RCLnBvc1ZlYy54LCBrbm90Qi5wb3NWZWMueSwgc2luLCBjb3MsIGZhbHNlKVxuXG5cdFx0XHQvLyBhZGp1c3QgcG9zaXRpb25zIHRvIGFjdHVhbCBzY3JlZW4gcG9zaXRpb25zXG5cdFx0XHRrbm90Qi54ID0ga25vdEEueCArIGtub3RCLnBvc0ZWZWMueDtcblx0XHRcdGtub3RCLnkgPSBrbm90QS55ICsga25vdEIucG9zRlZlYy55O1xuXHRcdFx0a25vdEEueCA9IGtub3RBLnggKyBrbm90QS5wb3NGVmVjLng7XG5cdFx0XHRrbm90QS55ID0ga25vdEEueSArIGtub3RBLnBvc0ZWZWMueTtcblxuXHRcdFx0Ly8gcm90YXRlIHZlbG9jaXRpZXMgYmFja1xuXHRcdFx0dGhpcy5yb3RhdGUoa25vdEEudmVsRlZlYywga25vdEEudmVsVmVjLngsIGtub3RBLnZlbFZlYy55LCBzaW4sIGNvcywgZmFsc2UpXG5cdFx0XHR0aGlzLnJvdGF0ZShrbm90Qi52ZWxGVmVjLCBrbm90Qi52ZWxWZWMueCwga25vdEIudmVsVmVjLnksIHNpbiwgY29zLCBmYWxzZSlcblxuXHRcdFx0a25vdEEudnggPSBrbm90QS52ZWxGVmVjLng7XG5cdCAgICAgICAga25vdEEudnkgPSBrbm90QS52ZWxGVmVjLnk7XG5cdCAgICAgICAga25vdEIudnggPSBrbm90Qi52ZWxGVmVjLng7XG5cdCAgICAgICAga25vdEIudnkgPSBrbm90Qi52ZWxGVmVjLnk7XG5cdCAgICB9XG5cdH1cblx0cm90YXRlKHBvaW50LCB4LCB5LCBzaW4sIGNvcywgcmV2ZXJzZSkge1xuXHRcdGlmKHJldmVyc2UpIHtcblx0XHRcdHBvaW50LnggPSB4ICogY29zICsgeSAqIHNpbjtcblx0XHRcdHBvaW50LnkgPSB5ICogY29zIC0geCAqIHNpbjtcblx0XHR9ZWxzZXtcblx0XHRcdHBvaW50LnggPSB4ICogY29zIC0geSAqIHNpbjtcblx0XHRcdHBvaW50LnkgPSB5ICogY29zICsgeCAqIHNpbjtcblx0XHR9XG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0Ly8gdGhpcy50aXRsZXMuY29udGFpbmVyLmFkZENsYXNzKCdhY3RpdmUnKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdC8vIHRoaXMudGl0bGVzLmNvbnRhaW5lci5yZW1vdmVDbGFzcygnYWN0aXZlJylcdFxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR2YXIga25vdHMgPSB0aGlzLmtub3RzXG5cdFx0dmFyIGtub3RzTnVtID0ga25vdHMubGVuZ3RoXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrbm90c051bTsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IGtub3RzW2ldXG5cdFx0XHRrbm90LnBvc2l0aW9uKGtub3QueCArIGtub3QudngsIGtub3QueSArIGtub3QudnkpXG5cdFx0XHR0aGlzLmNoZWNrV2FsbHMoa25vdClcblx0XHR9XG5cdFx0Zm9yIChpID0gMDsgaSA8IGtub3RzTnVtIC0gMTsgaSsrKSB7XG5cdFx0XHR2YXIga25vdEEgPSBrbm90c1tpXVxuXHRcdFx0Zm9yICh2YXIgaiA9IGkgKyAxOyBqIDwga25vdHNOdW07IGorKykge1xuXHRcdFx0XHR2YXIga25vdEIgPSBrbm90c1tqXVxuXHRcdFx0XHR0aGlzLmNoZWNrQ29sbGlzaW9uKGtub3RBLCBrbm90Qilcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gdGhpcy50aXRsZXMucm90YXRpb24gKz0gMC4yXG5cdFx0Ly8gdGhpcy5yb3RhdGVFbCh0aGlzLnRpdGxlcy50aXRsZVRvcCwgdGhpcy50aXRsZXMucm90YXRpb24pXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0fVxuXHRyb3RhdGVFbChkaXYsIGRlZykge1xuXHRcdFV0aWxzLlN0eWxlKGRpdiwgJ3JvdGF0ZSgnK2RlZysnZGVnKScpXG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMuY29udGFpbmVyLnggPSB4XG5cdFx0dGhpcy5jb250YWluZXIueSA9IHlcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHR9XG5cdG9wYWNpdHkodmFsKSB7XG5cdFx0dGhpcy5jb250YWluZXIuYWxwaGEgPSB2YWxcblx0XHR0aGlzLnRpdGxlcy4kdGl0bGVUb3AuY3NzKCdvcGFjaXR5JywgdmFsKVxuXHR9XG5cdHBvc2l0aW9uRWxlbWVudCh4LCB5KSB7XG5cdFx0dGhpcy50aXRsZXMuY29udGFpbmVyLmNzcyh7XG5cdFx0XHRsZWZ0OiB4IC0gKHRoaXMuY2lyY2xlUmFkPj4xKSxcblx0XHRcdHRvcDogeSAtICh0aGlzLmNpcmNsZVJhZD4+MSksXG5cdFx0XHR3aWR0aDogdGhpcy5jaXJjbGVSYWQsXG5cdFx0XHRoZWlnaHQ6IHRoaXMuY2lyY2xlUmFkLFxuXHRcdH0pXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmtub3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmtub3RzW2ldLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR9XG5cdFx0dGhpcy50aXRsZXMuY29udGFpbmVyLm9mZignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblx0XHR0aGlzLmtub3RzLmxlbmd0aCA9IDBcblx0XHR0aGlzLmJnQ2lyY2xlLmNsZWFyKClcblx0XHR0aGlzLmJnQ2lyY2xlID0gbnVsbFxuXHRcdHRoaXMuY29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMuY29udGFpbmVyKVxuXHR9XG59XG4iLCJpbXBvcnQgS25vdCBmcm9tICdLbm90J1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3ByaW5nR2FyZGVuIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5jb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHRcdHRoaXMuYXJlYVBvbHlnb24gPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmFyZWFQb2x5Z29uKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIpXG5cdFx0XG5cdFx0dGhpcy5saW5lVyA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0dGhpcy5wYXVzZWQgPSB0cnVlXG5cdFx0dGhpcy5vcGVuZWQgPSBmYWxzZVxuXG5cdFx0dGhpcy5rbm90cyA9IFtdXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBBcHBDb25zdGFudHMuVE9UQUxfS05PVF9OVU07IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSBuZXcgS25vdCh0aGlzLmNvbnRhaW5lcikuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdFx0dGhpcy5rbm90c1tpXSA9IGtub3Rcblx0XHR9XG5cdFx0dGhpcy5jb25maWcgPSB7XG5cdFx0XHRzcHJpbmc6IDAsXG5cdFx0XHRmcmljdGlvbjogMCxcblx0XHRcdHNwcmluZ0xlbmd0aDogMFxuXHRcdH1cblx0fVxuXHRjb21wb25lbnREaWRNb3VudChkYXRhLCB0eXBlKSB7XG5cdFx0dGhpcy5wYXJhbXMgPSBkYXRhXG5cdFx0dHlwZSA9IHR5cGUgfHwgQXBwQ29uc3RhbnRzLkxBTkRJTkdcblx0XHR0aGlzLmNvbG9yID0gKHR5cGUgPT0gQXBwQ29uc3RhbnRzLkxBTkRJTkcpIHx8IHRoaXMucGFyYW1zLmhpZ2hsaWdodCA9PSBmYWxzZSA/IDB4ZmZmZmZmIDogdGhpcy5wYXJhbXMuY29sb3Jcblx0XHR0aGlzLmNvbG9yID0gdGhpcy5wYXJhbXMuY29sb3Jcblx0XHRpZih0aGlzLnBhcmFtcy5oaWdobGlnaHQgIT0gdW5kZWZpbmVkICYmIHR5cGUgIT0gQXBwQ29uc3RhbnRzLkxBTkRJTkcpIHtcblx0XHRcdHRoaXMuY29sb3IgPSB0aGlzLnBhcmFtcy5oaWdobGlnaHQgPT0gZmFsc2UgPyAweGZmZmZmZiA6IHRoaXMuY29sb3Jcblx0XHR9XG5cdFx0dmFyIGtub3RzRGF0YSA9IHRoaXMucGFyYW1zLmtub3RzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmtub3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbmV3S25vdFNjYWxlID0ga25vdHNEYXRhW2ldXG5cdFx0XHR2YXIga25vdCA9IHRoaXMua25vdHNbaV1cblx0XHRcdGtub3QuY2hhbmdlU2l6ZSh0aGlzLmtub3RSYWRpdXMpXG5cdFx0XHRrbm90LnRvWCA9IG5ld0tub3RTY2FsZS54ICogKHRoaXMucmFkaXVzKVxuXHRcdFx0a25vdC50b1kgPSBuZXdLbm90U2NhbGUueSAqICh0aGlzLnJhZGl1cylcblx0XHRcdGtub3QueCA9IDBcblx0XHRcdGtub3QueSA9IDBcblx0XHR9XG5cdFx0dGhpcy5jb250YWluZXIucm90YXRpb24gPSBVdGlscy5SYW5kKC0xNCwgMTQpXG5cdFx0dGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoID0gMjAwXG5cdFx0dGhpcy5hc3NpZ25PcGVuZWRDb25maWcoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR0aGlzLmFyZWFQb2x5Z29uLmNsZWFyKClcblx0XHR0aGlzLmFyZWFQb2x5Z29uLmxpbmVTdHlsZSh0aGlzLmxpbmVXLCB0aGlzLmNvbG9yLCAwLjgpXG5cdFx0dmFyIGxlbiA9IHRoaXMua25vdHMubGVuZ3RoXG5cdFx0dmFyIHNwcmluZyA9IHRoaXMuY29uZmlnLnNwcmluZ1xuXHRcdHZhciBmcmljdGlvbiA9IHRoaXMuY29uZmlnLmZyaWN0aW9uXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSB0aGlzLmtub3RzW2ldXG5cdFx0XHR2YXIgcHJldmlvdXNLbm90ID0gdGhpcy5rbm90c1tpLTFdXG5cdFx0XHRwcmV2aW91c0tub3QgPSAocHJldmlvdXNLbm90ID09IHVuZGVmaW5lZCkgPyB0aGlzLmtub3RzW2xlbi0xXSA6IHByZXZpb3VzS25vdFxuXG5cdFx0XHRVdGlscy5TcHJpbmdUbyhrbm90LCBrbm90LnRvWCwga25vdC50b1ksIGksIHNwcmluZywgZnJpY3Rpb24sIHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aClcblx0XHRcdGtub3QucG9zaXRpb24oa25vdC54ICsga25vdC52eCwga25vdC55ICsga25vdC52eSlcblxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbi5tb3ZlVG8ocHJldmlvdXNLbm90LngsIHByZXZpb3VzS25vdC55KVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbi5saW5lVG8oa25vdC54LCBrbm90LnkpXG5cdFx0fVxuXHRcdHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCAtPSAodGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoKSAqIDAuNFxuXHRcdHRoaXMuY29udGFpbmVyLnJvdGF0aW9uIC09ICh0aGlzLmNvbnRhaW5lci5yb3RhdGlvbikgKiAwLjRcblx0fVxuXHRhc3NpZ25PcGVuZWRDb25maWcoKSB7XG5cdFx0dGhpcy5jb25maWcuc3ByaW5nID0gMC4wOVxuXHRcdHRoaXMuY29uZmlnLmZyaWN0aW9uID0gMC45XG5cdH1cblx0Y2xlYXIoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmtub3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IHRoaXMua25vdHNbaV1cblx0XHRcdGtub3QuY2xlYXIoKVxuXHRcdH1cblx0XHR0aGlzLmFyZWFQb2x5Z29uLmNsZWFyKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0fVxuXHRyZXNpemUocmFkaXVzKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnJhZGl1cyA9IHJhZGl1c1xuXHRcdHRoaXMuY29udGFpbmVyLnggPSAwXG5cdFx0dGhpcy5jb250YWluZXIueSA9IDBcblx0fVxufVxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IFJlY3RhbmdsZUJ0biBmcm9tICdSZWN0YW5nbGVCdG4nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRpdGxlU3dpdGNoZXIge1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50LCByZWN0YW5nbGVFbCwgYnV5VHh0KSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudFxuXHRcdHRoaXMucmVjdEVsID0gcmVjdGFuZ2xlRWxcblx0XHR0aGlzLmJ1eVR4dCA9IGJ1eVR4dFxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMucHJvZHVjdFRpdGxlV3JhcHBlciA9IHRoaXMuZWxlbWVudC5maW5kKFwiLnByb2R1Y3QtdGl0bGUtd3JhcHBlclwiKVxuXHRcdHZhciBjb250YWluZXJBID0gdGhpcy5lbGVtZW50LmZpbmQoJy50aXRsZS1hJylcblx0XHR2YXIgY29udGFpbmVyQiA9IHRoaXMuZWxlbWVudC5maW5kKCcudGl0bGUtYicpXG5cdFx0dGhpcy5jb250YWluZXJzID0ge1xuXHRcdFx0J3RpdGxlLWEnOiB7XG5cdFx0XHRcdGVsOiBjb250YWluZXJBXG5cdFx0XHR9LFxuXHRcdFx0J3RpdGxlLWInOiB7XG5cdFx0XHRcdGVsOiBjb250YWluZXJCXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMud2lkdGggPSAxMDBcblx0XHR0aGlzLmhlaWdodCA9IEFwcENvbnN0YW50cy5HTE9CQUxfRk9OVF9TSVpFXG5cblx0XHR2YXIgcmVjdFdpZHRoID0gdGhpcy5idXlUeHQubGVuZ3RoICogMTBcblx0XHR0aGlzLnJlY3RhbmdsZUJvcmRlciA9IG5ldyBSZWN0YW5nbGVCdG4odGhpcy5yZWN0RWwsIG51bGwsIDExMCArIHJlY3RXaWR0aClcblx0XHR0aGlzLnJlY3RhbmdsZUJvcmRlci5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0dGhpcy5hbGxSZWN0U3ZnS25vdHMgPSB0aGlzLnJlY3RFbC5maW5kKCdzdmcgLmtub3QnKVxuXHRcdHRoaXMuYWxsUmVjdFN2Z0xpbmVzID0gdGhpcy5yZWN0RWwuZmluZCgnc3ZnIC5saW5lJylcblxuXHRcdGlmKHRoaXMub25DbGljayAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMub25DbGlja2VkID0gdGhpcy5vbkNsaWNrZWQuYmluZCh0aGlzKVxuXHRcdFx0dGhpcy5lbGVtZW50Lm9uKCdjbGljaycsIHRoaXMub25DbGlja2VkKVxuXHRcdH1cblx0XHR0aGlzLm9uT3ZlciA9IHRoaXMub25PdmVyLmJpbmQodGhpcylcblx0XHR0aGlzLm9uT3V0ID0gdGhpcy5vbk91dC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5lbGVtZW50Lm9uKCdtb3VzZWVudGVyJywgdGhpcy5vbk92ZXIpXG5cdFx0dGhpcy5lbGVtZW50Lm9uKCdtb3VzZWxlYXZlJywgdGhpcy5vbk91dClcblx0fVxuXHRvbk92ZXIoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMucmVjdGFuZ2xlQm9yZGVyLnJvbGxvdmVyKClcblx0fVxuXHRvbk91dChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5yZWN0YW5nbGVCb3JkZXIucm9sbG91dCgpXG5cdH1cblx0b25DbGlja2VkKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLm9uQ2xpY2soKVxuXHR9XG5cdHVwZGF0ZUNvbG9yKGNvbG9yKSB7XG5cdFx0dmFyIGMgPSBjb2xvclxuXHRcdGMgPSBjLnJlcGxhY2UoXCIweFwiLCBcIiNcIilcblx0XHR0aGlzLmFsbFJlY3RTdmdLbm90cy5jc3MoJ2ZpbGwnLCBjKVxuXHRcdHRoaXMuYWxsUmVjdFN2Z0xpbmVzLmNzcygnc3Ryb2tlJywgYylcblx0fVxuXHR1cGRhdGUobmFtZSkge1xuXHRcdHRoaXMuY3VycmVudFRpdGxlQ2xhc3MgPSAodGhpcy5jdXJyZW50VGl0bGVDbGFzcyA9PT0gJ3RpdGxlLWEnKSA/ICd0aXRsZS1iJyA6ICd0aXRsZS1hJ1xuXHRcdHRoaXMucHJldmlvdXNUaXRsZSA9IHRoaXMuY3VycmVudFRpdGxlXG5cdFx0dGhpcy5jdXJyZW50VGl0bGUgPSB0aGlzLmNvbnRhaW5lcnNbdGhpcy5jdXJyZW50VGl0bGVDbGFzc11cblx0XHR0aGlzLmN1cnJlbnRUaXRsZS5lbC50ZXh0KG5hbWUpXG5cblx0XHR0aGlzLnVwZGF0ZUNvbXBvbmVudFNpemUoKVxuXG5cdFx0dGhpcy5jdXJyZW50VGl0bGUuZWwucmVtb3ZlQ2xhc3MoJ2RpZC10cmFuc2l0aW9uLWluJykucmVtb3ZlQ2xhc3MoJ2RpZC10cmFuc2l0aW9uLW91dCcpLnJlbW92ZUNsYXNzKCd3aWxsLXRyYW5zaXRpb24tb3V0JykuYWRkQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1pbicpXG5cdFx0aWYodGhpcy5wcmV2aW91c1RpdGxlICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5wcmV2aW91c1RpdGxlLmVsLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1vdXQnKS5yZW1vdmVDbGFzcygnZGlkLXRyYW5zaXRpb24taW4nKS5yZW1vdmVDbGFzcygnd2lsbC10cmFuc2l0aW9uLWluJykuYWRkQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1vdXQnKVxuXHRcdH1cblx0fVxuXHRzaG93KCkge1xuXHRcdHRoaXMuZWxlbWVudC5jc3MoJ3dpZHRoJywgdGhpcy5jdXJyZW50VGl0bGUud2lkdGgpXG5cdFx0dGhpcy5jdXJyZW50VGl0bGUuZWwucmVtb3ZlQ2xhc3MoJ2RpZC10cmFuc2l0aW9uLW91dCcpLnJlbW92ZUNsYXNzKCd3aWxsLXRyYW5zaXRpb24taW4nKS5yZW1vdmVDbGFzcygnd2lsbC10cmFuc2l0aW9uLW91dCcpLmFkZENsYXNzKCdkaWQtdHJhbnNpdGlvbi1pbicpXG5cdFx0aWYodGhpcy5wcmV2aW91c1RpdGxlICE9IHVuZGVmaW5lZCl7XG5cdFx0XHR0aGlzLnByZXZpb3VzVGl0bGUuZWwucmVtb3ZlQ2xhc3MoJ2RpZC10cmFuc2l0aW9uLWluJykucmVtb3ZlQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1pbicpLnJlbW92ZUNsYXNzKCd3aWxsLXRyYW5zaXRpb24tb3V0JykuYWRkQ2xhc3MoJ2RpZC10cmFuc2l0aW9uLW91dCcpXG5cdFx0fVxuXHR9XG5cdHVwZGF0ZUNvbXBvbmVudFNpemUoKSB7XG5cdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dmFyIGN1cnJlbnRUaXRsZVcgPSB0aGlzLmN1cnJlbnRUaXRsZS5lbC53aWR0aCgpXG5cdFx0XHR0aGlzLmN1cnJlbnRUaXRsZS53aWR0aCA9IGN1cnJlbnRUaXRsZVdcblx0XHRcdHRoaXMud2lkdGggPSB0aGlzLnJlY3RhbmdsZUJvcmRlci53aWR0aFxuXHRcdH0sIDApXG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdFV0aWxzLlRyYW5zbGF0ZSh0aGlzLnByb2R1Y3RUaXRsZVdyYXBwZXIuZ2V0KDApLCAodGhpcy53aWR0aCA+PiAxKSAtICh0aGlzLmN1cnJlbnRUaXRsZS53aWR0aCA+PiAxKSwgMCwgMClcblx0XHRVdGlscy5UcmFuc2xhdGUodGhpcy5lbGVtZW50LmdldCgwKSwgeCwgeSwgMClcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGlmKHRoaXMub25DbGljayAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuZWxlbWVudC5vZmYoJ2NsaWNrJywgdGhpcy5vbkNsaWNrZWQpXG5cdFx0fVxuXHRcdHRoaXMuZWxlbWVudC5vZmYoJ21vdXNlZW50ZXInLCB0aGlzLm9uT3Zlcilcblx0XHR0aGlzLmVsZW1lbnQub2ZmKCdtb3VzZWxlYXZlJywgdGhpcy5vbk91dClcblx0XHR0aGlzLnJlY3RhbmdsZUJvcmRlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGFza2FYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKHBhcmVudENvbnRhaW5lcikge1xuXHRcdHN1cGVyKHBhcmVudENvbnRhaW5lcilcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5wYXJlbnRDb250YWluZXIgPSBwYXJlbnRDb250YWluZXJcblx0XHR0aGlzLnBhcmVudENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnB4Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHR9XG5cdHVwZGF0ZSgpIHtcblx0fVxuXHRyZXNpemUoKSB7XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5wYXJlbnRDb250YWluZXIucmVtb3ZlQ2hpbGQodGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLnB4Q29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuY29uc3QgZ2xzbGlmeSA9IHJlcXVpcmUoJ2dsc2xpZnknKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHZW1TdG9uZVhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0c3VwZXIocGFyZW50Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdC8vIHZhciBleHBsb3Npb25GcmFnID0gZ2xzbGlmeSgnLi4vc2hhZGVycy9nZW1zdG9uZS9kaWZmdXNpb24tbWl4LWZyYWcuZ2xzbCcpXG5cblx0XHQvLyB2YXIgaW1nVXJsID0gQXBwU3RvcmUuUHJlbG9hZGVyLmdldEltYWdlVVJMKCdnZW1zdG9uZS1leHBlcmllbmNlLW5vaXNlLWNvbG9yJylcblx0XHQvLyBjb25zb2xlLmxvZyhpbWdVcmwpXG5cdFx0Ly8gdmFyIHRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGltZ1VybClcblx0XHQvLyB0aGlzLnNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlKVxuXG5cdFx0Ly8gdGhpcy5zcHJpdGUuc2hhZGVyID0gbmV3IFBJWEkuQWJzdHJhY3RGaWx0ZXIobnVsbCwgZXhwbG9zaW9uRnJhZywgdGhpcy51bmlmb3JtcyA9IHtcblx0XHQvLyBcdHJlc29sdXRpb246IHsgdHlwZTogJzJmJywgdmFsdWU6IHsgeDogMCwgeTogMCB9IH0sXG5cdFx0Ly8gXHR1Tm9pc2U6IHt0eXBlOiAnc2FtcGxlcjJEJywgdmFsdWU6IHRleHR1cmV9LFxuXHRcdC8vIFx0dGltZToge3R5cGU6ICcxZicsIHZhbHVlOiAwfSxcblx0IC8vICAgIH0pXG5cblx0IC8vICAgIHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5zcHJpdGUpXG5cblx0XHQvLyBjb25zb2xlLmxvZyhleHBsb3Npb25GcmFnKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHRcdHRoaXMudW5pZm9ybXMudGltZS52YWx1ZSArPSAwLjFcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnNwcml0ZS53aWR0aCA9IHdpbmRvd1dcblx0XHR0aGlzLnNwcml0ZS5oZWlnaHQgPSB3aW5kb3dIXG5cdFx0dGhpcy51bmlmb3Jtcy5yZXNvbHV0aW9uLnZhbHVlLnggPSB3aW5kb3dXXG5cdFx0dGhpcy51bmlmb3Jtcy5yZXNvbHV0aW9uLnZhbHVlLnkgPSB3aW5kb3dIXG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNZXRhbFhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0c3VwZXIocGFyZW50Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuIiwiaW1wb3J0IEJhc2VYUCBmcm9tICdCYXNlWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNraVhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0c3VwZXIocGFyZW50Q29udGFpbmVyKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuIiwiaW1wb3J0IEJhc2VYUCBmcm9tICdCYXNlWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdvb2RYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKHBhcmVudENvbnRhaW5lcikge1xuXHRcdHN1cGVyKHBhcmVudENvbnRhaW5lcilcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBQYWdlIGZyb20gJ1BhZ2UnXG5pbXBvcnQgTGFuZGluZ1NsaWRlc2hvdyBmcm9tICdMYW5kaW5nU2xpZGVzaG93J1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3MgZnJvbSAnQ29tcGFzcydcbmltcG9ydCBBcnJvd0J0biBmcm9tICdBcnJvd0J0bidcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhbmRpbmcgZXh0ZW5kcyBQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRwcm9wcy5kYXRhLmlzTW9iaWxlID0gQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGVcblx0XHRpZihwcm9wcy5kYXRhLmlzTW9iaWxlKSB7XG5cdFx0XHR2YXIgbW9iaWxlU2NvcGUgPSBbXVxuXHRcdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHRcdHZhciBpbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIHBsYW5ldCA9IHBsYW5ldHNbaV1cblx0XHRcdFx0dmFyIGcgPSB7XG5cdFx0XHRcdFx0aWQ6IHBsYW5ldCxcblx0XHRcdFx0XHRwbGFuZXRUeHQ6IGluZm9zLnBsYW5ldC50b1VwcGVyQ2FzZSgpLFxuXHRcdFx0XHRcdHBsYW5ldE5hbWU6IHBsYW5ldC50b1VwcGVyQ2FzZSgpLFxuXHRcdFx0XHRcdGltZ3NyYzogQXBwU3RvcmUubWFpbkltYWdlVXJsKHBsYW5ldCwgQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpLFxuXHRcdFx0XHRcdHVybDogXCIjIS9wbGFuZXQvXCIgKyBwbGFuZXQgKyAnLzAnXG5cdFx0XHRcdH1cblx0XHRcdFx0bW9iaWxlU2NvcGVbaV0gPSBnXG5cdFx0XHR9O1xuXHRcdFx0cHJvcHMuZGF0YS5tb2JpbGVTY29wZSA9IG1vYmlsZVNjb3BlXG5cdFx0fVxuXG5cdFx0c3VwZXIocHJvcHMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSAhPSB0cnVlKSB7XG5cblx0XHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdyA9IG5ldyBMYW5kaW5nU2xpZGVzaG93KHRoaXMucHhDb250YWluZXIsIHRoaXMuY2hpbGQpXG5cdFx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0XHR0aGlzLmNvbXBhc3MgPSBuZXcgQ29tcGFzcyh0aGlzLnB4Q29udGFpbmVyKVxuXHRcdFx0dGhpcy5jb21wYXNzLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdFx0dGhpcy5hcnJvd0xlZnQgPSBuZXcgQXJyb3dCdG4odGhpcy5jaGlsZC5maW5kKCcucHJldmlvdXMtYnRuJyksIEFwcENvbnN0YW50cy5MRUZUKVxuXHRcdFx0dGhpcy5hcnJvd0xlZnQuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdFx0dGhpcy5hcnJvd1JpZ2h0ID0gbmV3IEFycm93QnRuKHRoaXMuY2hpbGQuZmluZCgnLm5leHQtYnRuJyksIEFwcENvbnN0YW50cy5SSUdIVClcblx0XHRcdHRoaXMuYXJyb3dSaWdodC5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHRcdHRoaXMub25LZXlQcmVzc2VkID0gdGhpcy5vbktleVByZXNzZWQuYmluZCh0aGlzKVxuXHRcdFx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCB0aGlzLm9uS2V5UHJlc3NlZClcblxuXHRcdFx0dGhpcy5hcnJvd0NsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0XHR0aGlzLmFycm93TW91c2VFbnRlciA9IHRoaXMuYXJyb3dNb3VzZUVudGVyLmJpbmQodGhpcylcblx0XHRcdHRoaXMuYXJyb3dNb3VzZUxlYXZlID0gdGhpcy5hcnJvd01vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHRcdFx0dGhpcy5taWRkbGVBcmVhTW91c2VFbnRlciA9IHRoaXMubWlkZGxlQXJlYU1vdXNlRW50ZXIuYmluZCh0aGlzKVxuXHRcdFx0dGhpcy5taWRkbGVBcmVhTW91c2VMZWF2ZSA9IHRoaXMubWlkZGxlQXJlYU1vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHRcdFx0dGhpcy5taWRkbGVBcmVhQ2xpY2sgPSB0aGlzLm1pZGRsZUFyZWFDbGljay5iaW5kKHRoaXMpXG5cblx0XHRcdHRoaXMucHJldmlvdXNBcmVhID0gdGhpcy5jaGlsZC5maW5kKCcuaW50ZXJmYWNlIC5wcmV2aW91cy1hcmVhJylcblx0XHRcdHRoaXMubmV4dEFyZWEgPSB0aGlzLmNoaWxkLmZpbmQoJy5pbnRlcmZhY2UgLm5leHQtYXJlYScpXG5cdFx0XHR0aGlzLm1pZGRsZUFyZWEgPSB0aGlzLmNoaWxkLmZpbmQoJy5pbnRlcmZhY2UgLm1pZGRsZS1hcmVhJylcblx0XHRcdHRoaXMucHJldmlvdXNBcmVhLm9uKCdjbGljaycsIHRoaXMuYXJyb3dDbGlja2VkKVxuXHRcdFx0dGhpcy5uZXh0QXJlYS5vbignY2xpY2snLCB0aGlzLmFycm93Q2xpY2tlZClcblx0XHRcdHRoaXMucHJldmlvdXNBcmVhLm9uKCdtb3VzZWVudGVyJywgdGhpcy5hcnJvd01vdXNlRW50ZXIpXG5cdFx0XHR0aGlzLm5leHRBcmVhLm9uKCdtb3VzZWVudGVyJywgdGhpcy5hcnJvd01vdXNlRW50ZXIpXG5cdFx0XHR0aGlzLm1pZGRsZUFyZWEub24oJ21vdXNlZW50ZXInLCB0aGlzLm1pZGRsZUFyZWFNb3VzZUVudGVyKVxuXHRcdFx0dGhpcy5wcmV2aW91c0FyZWEub24oJ21vdXNlbGVhdmUnLCB0aGlzLmFycm93TW91c2VMZWF2ZSlcblx0XHRcdHRoaXMubmV4dEFyZWEub24oJ21vdXNlbGVhdmUnLCB0aGlzLmFycm93TW91c2VMZWF2ZSlcblx0XHRcdHRoaXMubWlkZGxlQXJlYS5vbignbW91c2VsZWF2ZScsIHRoaXMubWlkZGxlQXJlYU1vdXNlTGVhdmUpXG5cblx0XHRcdHRoaXMubWlkZGxlQXJlYS5vbignY2xpY2snLCB0aGlzLm1pZGRsZUFyZWFDbGljaylcblxuXHRcdFx0dGhpcy50d2VlbkNvbXBhc3MgPSBUd2Vlbk1heC50byh0aGlzLmNvbXBhc3MuY29udGFpbmVyLnNjYWxlLCAwLjYsIHsgeDoxLjEsIHk6MS4xLCBlYXNlOkJhY2suZWFzZUluT3V0IH0pXG5cdFx0XHR0aGlzLnR3ZWVuQ29tcGFzcy5wYXVzZSgwKVxuXHRcdH1cblxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRtaWRkbGVBcmVhTW91c2VFbnRlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy50d2VlbkNvbXBhc3MudGltZVNjYWxlKDEpLnBsYXkoKVxuXHR9XG5cdG1pZGRsZUFyZWFNb3VzZUxlYXZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLnR3ZWVuQ29tcGFzcy50aW1lU2NhbGUoMS40KS5yZXZlcnNlKClcblx0fVxuXHRtaWRkbGVBcmVhQ2xpY2soZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciB1cmwgPSBcIi9wbGFuZXQvXCIgKyB0aGlzLmxhbmRpbmdTbGlkZXNob3cuY3VycmVudElkICsgJy8wJ1xuXHRcdFJvdXRlci5zZXRIYXNoKHVybClcblx0fVxuXHRhcnJvd0NsaWNrZWQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciBpZCA9IGUuY3VycmVudFRhcmdldC5pZFxuXHRcdHZhciBkaXJlY3Rpb24gPSBpZC50b1VwcGVyQ2FzZSgpXG5cdFx0c3dpdGNoKGRpcmVjdGlvbikge1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEVGVDpcblx0XHRcdFx0dGhpcy5wcmV2aW91cygpXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5SSUdIVDpcblx0XHRcdFx0dGhpcy5uZXh0KClcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdH1cblx0YXJyb3dNb3VzZUVudGVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgaWQgPSBlLmN1cnJlbnRUYXJnZXQuaWRcblx0XHR2YXIgZGlyZWN0aW9uID0gaWQudG9VcHBlckNhc2UoKVxuXHRcdHZhciBhcnJvdyA9IHRoaXMuZ2V0QXJyb3dCeURpcmVjdGlvbihkaXJlY3Rpb24pXG5cdFx0YXJyb3cubW91c2VPdmVyKClcblx0fVxuXHRhcnJvd01vdXNlTGVhdmUoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciBpZCA9IGUuY3VycmVudFRhcmdldC5pZFxuXHRcdHZhciBkaXJlY3Rpb24gPSBpZC50b1VwcGVyQ2FzZSgpXG5cdFx0dmFyIGFycm93ID0gdGhpcy5nZXRBcnJvd0J5RGlyZWN0aW9uKGRpcmVjdGlvbilcblx0XHRhcnJvdy5tb3VzZU91dCgpXG5cdH1cblx0Z2V0QXJyb3dCeURpcmVjdGlvbihkaXJlY3Rpb24pIHtcblx0XHRzd2l0Y2goZGlyZWN0aW9uKSB7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MRUZUOlxuXHRcdFx0XHRyZXR1cm4gdGhpcy5hcnJvd0xlZnRcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlJJR0hUOlxuXHRcdFx0XHRyZXR1cm4gdGhpcy5hcnJvd1JpZ2h0XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHR9XG5cdG9uS2V5UHJlc3NlZChlKSB7XG5cdCAgICBlLnByZXZlbnREZWZhdWx0KClcblx0XHRzd2l0Y2goZS53aGljaCkge1xuXHQgICAgICAgIGNhc2UgMzc6IC8vIGxlZnRcblx0ICAgICAgICBcdHRoaXMucHJldmlvdXMoKVxuXHQgICAgICAgIFx0YnJlYWtcblx0ICAgICAgICBjYXNlIDM5OiAvLyByaWdodFxuXHQgICAgICAgIFx0dGhpcy5uZXh0KClcblx0ICAgICAgICBcdGJyZWFrXG5cdCAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuXHQgICAgfVxuXHR9XG5cdHVwZGF0ZUNvbXBhc3NQbGFuZXQoKSB7XG5cdFx0aWYoQXBwU3RvcmUuRGV0ZWN0b3IuaXNNb2JpbGUpIHJldHVybiBcblx0XHRcblx0XHR2YXIgcGxhbmV0RGF0YSA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQodGhpcy5sYW5kaW5nU2xpZGVzaG93LmN1cnJlbnRJZClcblx0XHR0aGlzLmNvbXBhc3MudXBkYXRlRGF0YShwbGFuZXREYXRhKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdG5leHQoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93Lm5leHQoKVxuXHRcdHRoaXMudXBkYXRlQ29tcGFzc1BsYW5ldCgpXG5cdH1cblx0cHJldmlvdXMoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnByZXZpb3VzKClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRcblx0XHRpZihBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSkgcmV0dXJuIFxuXG5cdFx0Ly8gdmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdC8vIHZhciBtb3VzZVggPSBBcHBTdG9yZS5Nb3VzZS54XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnVwZGF0ZSgpXG5cdFx0dGhpcy5jb21wYXNzLnVwZGF0ZSgpXG5cdFx0Ly8gdGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTk9ORVxuXHRcdC8vIHZhciBhcmVhID0gd2luZG93VyAqIDAuMjVcblx0XHQvLyBpZihtb3VzZVggPiAoKHdpbmRvd1cgPj4gMSkgLSBhcmVhKSAmJiBtb3VzZVggPCAoKHdpbmRvd1cgPj4gMSkgKyBhcmVhKSkge1xuXHRcdC8vIFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuVE9QXG5cdFx0Ly8gfVxuXG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm4gXG5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5yZXNpemUoKVxuXHRcdHRoaXMuY29tcGFzcy5yZXNpemUoKVxuXHRcdHRoaXMuY29tcGFzcy5wb3NpdGlvbihcblx0XHRcdHdpbmRvd1cgPj4gMSxcblx0XHRcdCh3aW5kb3dIID4+IDEpICsgKHdpbmRvd0ggKiAwLjAzKVxuXHRcdClcblx0XHR0aGlzLmFycm93UmlnaHQucG9zaXRpb24oXG5cdFx0XHR3aW5kb3dXIC0gKCh3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UpID4+IDEpLFxuXHRcdFx0d2luZG93SCA+PiAxXG5cdFx0KVxuXHRcdHRoaXMuYXJyb3dMZWZ0LnBvc2l0aW9uKFxuXHRcdFx0KCh3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UpID4+IDEpIC0gdGhpcy5hcnJvd0xlZnQud2lkdGgsXG5cdFx0XHR3aW5kb3dIID4+IDFcblx0XHQpXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEuY3NzKHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UsXG5cdFx0XHRoZWlnaHQ6IHdpbmRvd0hcblx0XHR9KVxuXHRcdHRoaXMubmV4dEFyZWEuY3NzKHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UsXG5cdFx0XHRoZWlnaHQ6IHdpbmRvd0gsXG5cdFx0XHRsZWZ0OiB3aW5kb3dXIC0gKHdpbmRvd1cgKiBBcHBDb25zdGFudHMuTEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRSlcblx0XHR9KVxuXHRcdHRoaXMubWlkZGxlQXJlYS5jc3Moe1xuXHRcdFx0bGVmdDogd2luZG93VyAqIEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFLFxuXHRcdFx0d2lkdGg6IHdpbmRvd1cgLSAoKHdpbmRvd1cgKiBBcHBDb25zdGFudHMuTEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRSkgPDwgMSksXG5cdFx0XHRoZWlnaHQ6IHdpbmRvd0hcblx0XHR9KVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblxuXHRcdGlmKEFwcFN0b3JlLkRldGVjdG9yLmlzTW9iaWxlKSByZXR1cm4gXG5cblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuY29tcGFzcy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5hcnJvd0xlZnQuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuYXJyb3dSaWdodC5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0JChkb2N1bWVudCkub2ZmKCdrZXlkb3duJywgdGhpcy5vbktleVByZXNzZWQpXG5cblx0XHR0aGlzLnByZXZpb3VzQXJlYS5vZmYoJ2NsaWNrJywgdGhpcy5hcnJvd0NsaWNrZWQpXG5cdFx0dGhpcy5uZXh0QXJlYS5vZmYoJ2NsaWNrJywgdGhpcy5hcnJvd0NsaWNrZWQpXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEub2ZmKCdtb3VzZWVudGVyJywgdGhpcy5hcnJvd01vdXNlRW50ZXIpXG5cdFx0dGhpcy5uZXh0QXJlYS5vZmYoJ21vdXNlZW50ZXInLCB0aGlzLmFycm93TW91c2VFbnRlcilcblx0XHR0aGlzLnByZXZpb3VzQXJlYS5vZmYoJ21vdXNlbGVhdmUnLCB0aGlzLmFycm93TW91c2VMZWF2ZSlcblx0XHR0aGlzLm5leHRBcmVhLm9mZignbW91c2VsZWF2ZScsIHRoaXMuYXJyb3dNb3VzZUxlYXZlKVxuXG5cdFx0dGhpcy5taWRkbGVBcmVhLm9mZignbW91c2VlbnRlcicsIHRoaXMubWlkZGxlQXJlYU1vdXNlRW50ZXIpXG5cdFx0dGhpcy5taWRkbGVBcmVhLm9mZignbW91c2VsZWF2ZScsIHRoaXMubWlkZGxlQXJlYU1vdXNlTGVhdmUpXG5cdFx0dGhpcy5taWRkbGVBcmVhLm9mZignY2xpY2snLCB0aGlzLm1pZGRsZUFyZWFDbGljaylcblx0fVxufVxuXG4iLCJleHBvcnQgZGVmYXVsdCB7XG5cdFdJTkRPV19SRVNJWkU6ICdXSU5ET1dfUkVTSVpFJyxcblx0UEFHRV9IQVNIRVJfQ0hBTkdFRDogJ1BBR0VfSEFTSEVSX0NIQU5HRUQnLFxuXHRQQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0U6ICdQQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0UnLFxuXHRQWF9DT05UQUlORVJfSVNfUkVBRFk6ICdQWF9DT05UQUlORVJfSVNfUkVBRFknLFxuXHRQWF9DT05UQUlORVJfQUREX0NISUxEOiAnUFhfQ09OVEFJTkVSX0FERF9DSElMRCcsXG5cdFBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQ6ICdQWF9DT05UQUlORVJfUkVNT1ZFX0NISUxEJyxcblxuXHRMQU5ESU5HOiAnTEFORElORycsXG5cdEVYUEVSSUVOQ0U6ICdFWFBFUklFTkNFJyxcblx0Q0FNUEFJR046ICdDQU1QQUlHTicsXG5cdE5PTkU6ICdOT05FJyxcblxuXHRDT01QQVNTX1NJWkVfUEVSQ0VOVEFHRTogMC4xNixcblx0Q09NUEFTU19TTUFMTF9TSVpFX1BFUkNFTlRBR0U6IDAuMTgsXG5cblx0TEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRTogMC4yNCxcblxuXHRTTUFMTF9LTk9UX1JBRElVUzogMyxcblxuXHRPUEVOOiAnT1BFTicsXG5cdENMT1NFOiAnQ0xPU0UnLFxuXG5cdExFRlQ6ICdMRUZUJyxcblx0UklHSFQ6ICdSSUdIVCcsXG5cdFRPUDogJ1RPUCcsXG5cdEJPVFRPTTogJ0JPVFRPTScsXG5cblx0VE9UQUxfS05PVF9OVU06IDMsXG5cblx0UEFERElOR19BUk9VTkQ6IDQwLFxuXG5cdENBTVBBSUdOX0lNQUdFX1NJWkU6IFsxNDAwLCA5NDVdLFxuXG5cdFJFU1BPTlNJVkVfSU1BR0U6IFsxOTIwLCAxMjgwLCA2NDBdLFxuXG5cdEVOVklST05NRU5UUzoge1xuXHRcdFBSRVBST0Q6IHtcblx0XHRcdHN0YXRpYzogJydcblx0XHR9LFxuXHRcdFBST0Q6IHtcblx0XHRcdFwic3RhdGljXCI6IEpTX3VybF9zdGF0aWMgKyAnLydcblx0XHR9XG5cdH0sXG5cblx0TEFORFNDQVBFOiAnTEFORFNDQVBFJyxcblx0UE9SVFJBSVQ6ICdQT1JUUkFJVCcsXG5cblx0TUVESUFfR0xPQkFMX1c6IDE5MjAsXG5cdE1FRElBX0dMT0JBTF9IOiAxMDgwLFxuXG5cdEdMT0JBTF9GT05UX1NJWkU6IDE2LFxuXG5cdE1JTl9NSURETEVfVzogOTYwLFxuXHRNUV9YU01BTEw6IDMyMCxcblx0TVFfU01BTEw6IDQ4MCxcblx0TVFfTUVESVVNOiA3NjgsXG5cdE1RX0xBUkdFOiAxMDI0LFxuXHRNUV9YTEFSR0U6IDEyODAsXG5cdE1RX1hYTEFSR0U6IDE2ODAsXG59IiwiaW1wb3J0IEZsdXggZnJvbSAnZmx1eCdcbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbidcblxudmFyIEFwcERpc3BhdGNoZXIgPSBhc3NpZ24obmV3IEZsdXguRGlzcGF0Y2hlcigpLCB7XG5cdGhhbmRsZVZpZXdBY3Rpb246IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdHRoaXMuZGlzcGF0Y2goe1xuXHRcdFx0c291cmNlOiAnVklFV19BQ1RJT04nLFxuXHRcdFx0YWN0aW9uOiBhY3Rpb25cblx0XHR9KTtcblx0fVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IEFwcERpc3BhdGNoZXIiLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiXHRcdFxcblx0XHQ8ZGl2IGlkPVxcXCJtb2JpbGUtbWVudVxcXCI+XFxuXHRcdFx0PGEgaHJlZj1cXFwiIyEvbGFuZGluZ1xcXCIgY2xhc3M9XFxcImxvZ29cXFwiPlxcblx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIGlkPVxcXCJMYXllcl8xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDEzNi4wMTMgNDkuMzc1XFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAxMzYuMDEzIDQ5LjM3NVxcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIiBjbGlwLXJ1bGU9XFxcImV2ZW5vZGRcXFwiIGQ9XFxcIk04Mi4xNDEsOC4wMDJoMy4zNTRjMS4yMTMsMCwxLjcxNywwLjQ5OSwxLjcxNywxLjcyNXY3LjEzN2MwLDEuMjMxLTAuNTAxLDEuNzM2LTEuNzA1LDEuNzM2aC0zLjM2NVY4LjAwMnogTTgyLjUyMywyNC42MTd2OC40MjZsLTcuMDg3LTAuMzg0VjEuOTI1SDg3LjM5YzMuMjkyLDAsNS45NiwyLjcwNSw1Ljk2LDYuMDQ0djEwLjYwNGMwLDMuMzM4LTIuNjY4LDYuMDQ0LTUuOTYsNi4wNDRIODIuNTIzeiBNMzMuNDkxLDcuOTEzYy0xLjEzMiwwLTIuMDQ4LDEuMDY1LTIuMDQ4LDIuMzc5djExLjI1Nmg0LjQwOVYxMC4yOTJjMC0xLjMxNC0wLjkxNy0yLjM3OS0yLjA0Ny0yLjM3OUgzMy40OTF6IE0zMi45OTQsMC45NzRoMS4zMDhjNC43MDIsMCw4LjUxNCwzLjg2Niw4LjUxNCw4LjYzNHYyNS4yMjRsLTYuOTYzLDEuMjczdi03Ljg0OGgtNC40MDlsMC4wMTIsOC43ODdsLTYuOTc0LDIuMDE4VjkuNjA4QzI0LjQ4MSw0LjgzOSwyOC4yOTIsMC45NzQsMzIuOTk0LDAuOTc0IE0xMjEuOTMzLDcuOTIxaDMuNDIzYzEuMjE1LDAsMS43MTgsMC40OTcsMS43MTgsMS43MjR2OC4xOTRjMCwxLjIzMi0wLjUwMiwxLjczNi0xLjcwNSwxLjczNmgtMy40MzZWNy45MjF6IE0xMzMuNzE4LDMxLjA1NXYxNy40ODdsLTYuOTA2LTMuMzY4VjMxLjU5MWMwLTQuOTItNC41ODgtNS4wOC00LjU4OC01LjA4djE2Ljc3NGwtNi45ODMtMi45MTRWMS45MjVoMTIuMjMxYzMuMjkxLDAsNS45NTksMi43MDUsNS45NTksNi4wNDR2MTEuMDc3YzAsMi4yMDctMS4yMTcsNC4xNTMtMi45OTEsNS4xMTVDMTMxLjc2MSwyNC44OTQsMTMzLjcxOCwyNy4wNzcsMTMzLjcxOCwzMS4wNTUgTTEwLjgwOSwwLjgzM2MtNC43MDMsMC04LjUxNCwzLjg2Ni04LjUxNCw4LjYzNHYyNy45MzZjMCw0Ljc2OSw0LjAxOSw4LjYzNCw4LjcyMiw4LjYzNGwxLjMwNi0wLjA4NWM1LjY1NS0xLjA2Myw4LjMwNi00LjYzOSw4LjMwNi05LjQwN3YtOC45NGgtNi45OTZ2OC43MzZjMCwxLjQwOS0wLjA2NCwyLjY1LTEuOTk0LDIuOTkyYy0xLjIzMSwwLjIxOS0yLjQxNy0wLjgxNi0yLjQxNy0yLjEzMlYxMC4xNTFjMC0xLjMxNCwwLjkxNy0yLjM4MSwyLjA0Ny0yLjM4MWgwLjMxNWMxLjEzLDAsMi4wNDgsMS4wNjcsMi4wNDgsMi4zODF2OC40NjRoNi45OTZWOS40NjdjMC00Ljc2OC0zLjgxMi04LjYzNC04LjUxNC04LjYzNEgxMC44MDkgTTEwMy45NTMsMjMuMTYyaDYuOTc3di02Ljc0NGgtNi45NzdWOC40MjNsNy42NzYtMC4wMDJWMS45MjRIOTYuNzJ2MzMuMjc4YzAsMCw1LjIyNSwxLjE0MSw3LjUzMiwxLjY2NmMxLjUxNywwLjM0Niw3Ljc1MiwyLjI1Myw3Ljc1MiwyLjI1M3YtNy4wMTVsLTguMDUxLTEuNTA4VjIzLjE2MnogTTQ2Ljg3OSwxLjkyN2wwLjAwMywzMi4zNWw3LjEyMy0wLjg5NVYxOC45ODVsNS4xMjYsMTAuNDI2bDUuMTI2LTEwLjQ4NGwwLjAwMiwxMy42NjRsNy4wMjItMC4wNTRWMS44OTVoLTcuNTQ1TDU5LjEzLDE0LjZMNTQuNjYxLDEuOTI3SDQ2Ljg3OXpcXFwiLz48L3N2Zz5cXG5cdFx0XHQ8L2E+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiYnVyZ2VyIGJ0blxcXCI+XFxuXHRcdFx0XHQ8IURPQ1RZUEUgc3ZnIFBVQkxJQyBcXFwiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU5cXFwiIFxcXCJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGRcXFwiPjxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDYxLjU2NCA0OS4zNTZcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDYxLjU2NCA0OS4zNTZcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxnPjxwYXRoIGQ9XFxcIk00LjU2NCw4LjAwNmMxLjQ0MywwLDIuNjgyLTAuODU0LDMuMjY2LTIuMDc3aDE5LjY0OGMwLjU4NCwxLjIyMywxLjgyMywyLjA3NywzLjI2NywyLjA3N2MxLjQ0NCwwLDIuNjgzLTAuODU0LDMuMjY2LTIuMDc3aDE5LjY0OWMwLjU4MywxLjIyMywxLjgyMSwyLjA3NywzLjI2NiwyLjA3N2MwLjAxMywwLDAuMDI1LTAuMDAzLDAuMDM5LTAuMDAzYzAuMDEyLDAsMC4wMjMsMC4wMDMsMC4wMzUsMC4wMDNjMC4yNDMsMCwwLjQ4MS0wLjAyMywwLjcxNC0wLjA2OWMwLjY5Ni0wLjEzOCwxLjMzOC0wLjQ3OSwxLjg1My0wLjk5M2MxLjQxNC0xLjQxNCwxLjQxNC0zLjcxNS0wLjAwMS01LjEzMWMtMC40MTEtMC40MTEtMC45MTctMC42ODMtMS40NTctMC44NDhjLTAuMzcyLTAuMTI5LTAuNzY3LTAuMjE0LTEuMTgzLTAuMjE0Yy0xLjQ0MywwLTIuNjgyLDAuODUzLTMuMjY2LDIuMDc2SDM0LjAxMWMtMC41ODQtMS4yMjMtMS44MjItMi4wNzYtMy4yNjYtMi4wNzZzLTIuNjgyLDAuODUzLTMuMjY3LDIuMDc2SDcuODNDNy4yNDcsMS42MDMsNi4wMDcsMC43NSw0LjU2NCwwLjc1Yy0yLjAwMSwwLTMuNjI5LDEuNjI3LTMuNjI5LDMuNjI3QzAuOTM2LDYuMzc4LDIuNTYzLDguMDA2LDQuNTY0LDguMDA2elxcXCIvPjxwYXRoIGQ9XFxcIk00LjU2NCwyOC4xNjhjMS40NDMsMCwyLjY4Mi0wLjg1NCwzLjI2Ni0yLjA3NmgxOS42NDljMC41ODQsMS4yMjMsMS44MjMsMi4wNzYsMy4yNjcsMi4wNzZzMi42ODItMC44NTQsMy4yNjYtMi4wNzZoMTkuNjQ5YzAuNTg0LDEuMjIzLDEuODIyLDIuMDc2LDMuMjY2LDIuMDc2YzAuMDEyLDAsMC4wMjQtMC4wMDQsMC4wMzctMC4wMDRjMC4wMTIsMCwwLjAyNCwwLjAwNCwwLjAzNywwLjAwNGMwLjI0MywwLDAuNDgxLTAuMDIzLDAuNzE0LTAuMDdjMC42OTYtMC4xMzcsMS4zMzgtMC40NzgsMS44NTMtMC45OTJjMC4xNzYtMC4xNzUsMC4zMjktMC4zNjUsMC40NjItMC41NjhjMC4wMDQtMC4wMDYsMC4wMDYtMC4wMTIsMC4wMS0wLjAxOGMwLjM4My0wLjU4NCwwLjU5LTEuMjY1LDAuNTktMS45NzljMC0wLjcwMi0wLjIwMy0xLjM3MS0wLjU3My0xLjk0OGMtMC4wMS0wLjAxNi0wLjAxNi0wLjAzNC0wLjAyNy0wLjA1MWMtMC4xMzMtMC4yMDItMC4yODYtMC4zOTItMC40NjItMC41NjdjLTAuNjg2LTAuNjg1LTEuNTk3LTEuMDYyLTIuNTY1LTEuMDYyYy0wLjAxMywwLTAuMDI1LDAuMDAzLTAuMDM3LDAuMDAzYy0wLjAxMywwLTAuMDI1LTAuMDAzLTAuMDM3LTAuMDAzYy0xLjQ0NCwwLTIuNjgzLDAuODUzLTMuMjY2LDIuMDc2SDM0LjAxMWMtMC41ODMtMS4yMjMtMS44MjEtMi4wNzYtMy4yNjYtMi4wNzZjLTEuNDQzLDAtMi42ODMsMC44NTMtMy4yNjcsMi4wNzZINy44MzFjLTAuNTg0LTEuMjIzLTEuODIzLTIuMDc2LTMuMjY2LTIuMDc2Yy0yLjAwMSwwLTMuNjI5LDEuNjI3LTMuNjI5LDMuNjI3UzIuNTYzLDI4LjE2OCw0LjU2NCwyOC4xNjh6XFxcIi8+PHBhdGggZD1cXFwiTTU3LDQxLjM1MWMtMC4wMTMsMC0wLjAyNSwwLjAwNC0wLjAzNywwLjAwNGMtMC4wMTMsMC0wLjAyNS0wLjAwNC0wLjAzNy0wLjAwNGMtMS40NDMsMC0yLjY4MiwwLjg1My0zLjI2NiwyLjA3NUgzNC4wMTFjLTAuNTg0LTEuMjIzLTEuODIyLTIuMDc1LTMuMjY2LTIuMDc1cy0yLjY4MiwwLjg1My0zLjI2NywyLjA3NUg3LjgzYy0wLjU4My0xLjIyMy0xLjgyMy0yLjA3NS0zLjI2Ni0yLjA3NWMtMi4wMDEsMC0zLjYyOSwxLjYyNy0zLjYyOSwzLjYyNmMwLDIuMDAxLDEuNjI4LDMuNjI5LDMuNjI5LDMuNjI5YzEuNDQzLDAsMi42ODMtMC44NTQsMy4yNjYtMi4wNzdoMTkuNjQ4YzAuNTg0LDEuMjIzLDEuODIzLDIuMDc3LDMuMjY3LDIuMDc3YzEuNDQ0LDAsMi42ODMtMC44NTQsMy4yNjYtMi4wNzdoMTkuNjQ5YzAuNTgzLDEuMjIzLDEuODIxLDIuMDc3LDMuMjY2LDIuMDc3YzAuMDEyLDAsMC4wMjQtMC4wMDQsMC4wMzctMC4wMDRjMC4wMTIsMCwwLjAyNCwwLjAwNCwwLjAzNywwLjAwNGMwLjI0MywwLDAuNDgxLTAuMDIzLDAuNzE0LTAuMDdjMC42OTctMC4xMzgsMS4zMzktMC40NzksMS44NTMtMC45OTJjMS40MTQtMS40MTQsMS40MTQtMy43MTctMC4wMDEtNS4xMzFDNTguODgsNDEuNzI4LDU3Ljk2OSw0MS4zNTEsNTcsNDEuMzUxelxcXCIvPjwvZz48L3N2Zz5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJtZW51LXNsaWRlclxcXCI+XFxuXHRcdFx0XHQ8dWwgY2xhc3M9J21haW4tbWVudSc+XFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5tb2JpbGVNZW51IDogZGVwdGgwKSx7XCJuYW1lXCI6XCJlYWNoXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgyLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXHRcdFx0XHQ8L3VsPlxcblx0XHRcdFx0PHVsIGNsYXNzPSdzb2NpYWwtbWVudSc+XFxuXHRcdFx0XHRcdDxsaT5cXG5cdFx0XHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmZhY2Vib29rVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5mYWNlYm9va1VybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiZmFjZWJvb2tVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xNi4wMDEsMC4xNjdjLTguNzQ1LDAtMTUuODM0LDcuMDktMTUuODM0LDE1LjgzNGMwLDguNzQ1LDcuMDg5LDE1LjgzNSwxNS44MzQsMTUuODM1YzguNzQ1LDAsMTUuODM0LTcuMDksMTUuODM0LTE1LjgzNUMzMS44MzYsNy4yNTcsMjQuNzQ2LDAuMTY3LDE2LjAwMSwwLjE2NyBNMTkuNDk4LDEzLjMybC0wLjE4NCwyLjM2OWgtMi40Mjd2OC4yMjloLTMuMDY4di04LjIyOWgtMS42MzhWMTMuMzJoMS42Mzh2LTEuNTkyYzAtMC43MDEsMC4wMTctMS43ODIsMC41MjctMi40NTNjMC41MzYtMC43MDksMS4yNzMtMS4xOTEsMi41NDEtMS4xOTFjMi4wNjYsMCwyLjkzNSwwLjI5NSwyLjkzNSwwLjI5NWwtMC40MSwyLjQyNWMwLDAtMC42ODItMC4xOTYtMS4zMTgtMC4xOTZjLTAuNjM3LDAtMS4yMDcsMC4yMjctMS4yMDcsMC44NjN2MS44NUgxOS40OTh6XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHRcdFx0PC9hPlxcblx0XHRcdFx0XHQ8L2xpPlxcblx0XHRcdFx0XHQ8bGk+XFxuXHRcdFx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy50d2l0dGVyVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50d2l0dGVyVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJ0d2l0dGVyVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTYuMDAyLDAuMTY3Yy04Ljc0NiwwLTE1LjgzNSw3LjA5LTE1LjgzNSwxNS44MzRjMCw4Ljc0Niw3LjA4OSwxNS44MzUsMTUuODM1LDE1LjgzNWM4Ljc0NSwwLDE1LjgzNC03LjA4OSwxNS44MzQtMTUuODM1QzMxLjgzNiw3LjI1NywyNC43NDcsMC4xNjcsMTYuMDAyLDAuMTY3IE0yMi4zMjIsMTMuNTM5YzAuMDA3LDAuMTM4LDAuMDA5LDAuMjc5LDAuMDA5LDAuNDJjMCw0LjMwMi0zLjI3Miw5LjI1OS05LjI1OSw5LjI1OWMtMS44MzcsMC0zLjU0Ny0wLjUzOS00Ljk4Ny0xLjQ2MWMwLjI1MywwLjAzMSwwLjUxNCwwLjA0NCwwLjc3NiwwLjA0NGMxLjUyNSwwLDIuOTI4LTAuNTIsNC4wNDItMS4zOTRjLTEuNDI0LTAuMDIzLTIuNjI1LTAuOTY1LTMuMDM5LTIuMjU4YzAuMTk4LDAuMDM3LDAuNDAyLDAuMDU4LDAuNjExLDAuMDU4YzAuMjk4LDAsMC41ODUtMC4wMzgsMC44NTgtMC4xMTVjLTEuNDg5LTAuMjk3LTIuNjEyLTEuNjEyLTIuNjEyLTMuMTg5di0wLjA0MWMwLjQ0LDAuMjQyLDAuOTQyLDAuMzg5LDEuNDc1LDAuNDA3Yy0wLjg3My0wLjU4NS0xLjQ0Ny0xLjU4MS0xLjQ0Ny0yLjcwOWMwLTAuNTk3LDAuMTYtMS4xNTUsMC40NDEtMS42MzhjMS42MDUsMS45Nyw0LjAwMywzLjI2NCw2LjcwOCwzLjRjLTAuMDU3LTAuMjM4LTAuMDg1LTAuNDg1LTAuMDg1LTAuNzRjMC0xLjc5NywxLjQ1OC0zLjI1NCwzLjI1NC0zLjI1NGMwLjkzNywwLDEuNzgzLDAuMzk1LDIuMzc1LDEuMDI4YzAuNzQyLTAuMTQ2LDEuNDM4LTAuNDE3LDIuMDY3LTAuNzg5Yy0wLjI0MiwwLjc1OS0wLjc1OSwxLjM5Ni0xLjQzMiwxLjc5OWMwLjY1OC0wLjA3OSwxLjI4Ni0wLjI1MywxLjg2OS0wLjUxMUMyMy41MTEsMTIuNTA3LDIyLjk1OSwxMy4wNzksMjIuMzIyLDEzLjUzOVxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0XHRcdDwvYT5cXG5cdFx0XHRcdFx0PC9saT5cXG5cdFx0XHRcdFx0PGxpPlxcblx0XHRcdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW5zdGFncmFtVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbnN0YWdyYW1VcmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImluc3RhZ3JhbVVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE5LjQxMywxMi42MDJsLTAuMDA5LTIuNjg2bDIuNjg1LTAuMDA4djIuNjg0TDE5LjQxMywxMi42MDJ6IE0xNi4wMDQsMTguNzg4YzEuNTM2LDAsMi43ODctMS4yNSwyLjc4Ny0yLjc4N2MwLTAuNjA1LTAuMTk2LTEuMTY2LTAuNTI4LTEuNjI0Yy0wLjUwNy0wLjcwMy0xLjMyOS0xLjE2My0yLjI1OS0xLjE2M2MtMC45MzEsMC0xLjc1MywwLjQ2LTIuMjYsMS4xNjNjLTAuMzMsMC40NTgtMC41MjcsMS4wMTktMC41MjcsMS42MjRDMTMuMjE3LDE3LjUzOCwxNC40NjcsMTguNzg4LDE2LjAwNCwxOC43ODh6IE0yMC4zMzMsMTYuMDAxYzAsMi4zODctMS45NDIsNC4zMy00LjMyOSw0LjMzYy0yLjM4OCwwLTQuMzI5LTEuOTQzLTQuMzI5LTQuMzNjMC0wLjU3NSwwLjExNC0xLjEyMywwLjMxOC0xLjYyNEg5LjYyOXY2LjQ4MWMwLDAuODM2LDAuNjgxLDEuNTE4LDEuNTE4LDEuNTE4aDkuNzE0YzAuODM3LDAsMS41MTctMC42ODIsMS41MTctMS41MTh2LTYuNDgxaC0yLjM2M0MyMC4yMTcsMTQuODc4LDIwLjMzMywxNS40MjYsMjAuMzMzLDE2LjAwMXogTTMxLjgzNiwxNi4wMDFjMCw4Ljc0NC03LjA5LDE1LjgzNS0xNS44MzUsMTUuODM1UzAuMTY3LDI0Ljc0NSwwLjE2NywxNi4wMDFjMC04Ljc0NSw3LjA4OS0xNS44MzQsMTUuODM0LTE1LjgzNFMzMS44MzYsNy4yNTYsMzEuODM2LDE2LjAwMXogTTIzLjkyMSwxMS4xNDRjMC0xLjY4OC0xLjM3My0zLjA2LTMuMDYyLTMuMDZoLTkuNzEzYy0xLjY4NywwLTMuMDYsMS4zNzEtMy4wNiwzLjA2djkuNzE0YzAsMS42ODgsMS4zNzMsMy4wNiwzLjA2LDMuMDZoOS43MTNjMS42ODgsMCwzLjA2Mi0xLjM3MiwzLjA2Mi0zLjA2VjExLjE0NHpcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdFx0XHQ8L2E+XFxuXHRcdFx0XHRcdDwvbGk+XFxuXHRcdFx0XHQ8L3VsPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cXG5cIjtcbn0sXCIyXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHRcdFx0PGxpIGlkPSdcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaWQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlkIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJpZFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCInPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPSdcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51cmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcInVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCInPlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5uYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5uYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvYT48L2xpPlxcblwiO1xufSxcIjRcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyLCBhbGlhczE9dGhpcy5sYW1iZGEsIGFsaWFzMj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIGFsaWFzMz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzND1cImZ1bmN0aW9uXCI7XG5cbiAgcmV0dXJuIFwiXFxuXHRcdDxoZWFkZXIgaWQ9XFxcImhlYWRlclxcXCI+XFxuXHRcdFx0PGEgaHJlZj1cXFwiIyEvbGFuZGluZ1xcXCIgY2xhc3M9XFxcImxvZ29cXFwiPlxcblx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIGlkPVxcXCJMYXllcl8xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDEzNi4wMTMgNDkuMzc1XFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAxMzYuMDEzIDQ5LjM3NVxcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIiBjbGlwLXJ1bGU9XFxcImV2ZW5vZGRcXFwiIGQ9XFxcIk04Mi4xNDEsOC4wMDJoMy4zNTRjMS4yMTMsMCwxLjcxNywwLjQ5OSwxLjcxNywxLjcyNXY3LjEzN2MwLDEuMjMxLTAuNTAxLDEuNzM2LTEuNzA1LDEuNzM2aC0zLjM2NVY4LjAwMnogTTgyLjUyMywyNC42MTd2OC40MjZsLTcuMDg3LTAuMzg0VjEuOTI1SDg3LjM5YzMuMjkyLDAsNS45NiwyLjcwNSw1Ljk2LDYuMDQ0djEwLjYwNGMwLDMuMzM4LTIuNjY4LDYuMDQ0LTUuOTYsNi4wNDRIODIuNTIzeiBNMzMuNDkxLDcuOTEzYy0xLjEzMiwwLTIuMDQ4LDEuMDY1LTIuMDQ4LDIuMzc5djExLjI1Nmg0LjQwOVYxMC4yOTJjMC0xLjMxNC0wLjkxNy0yLjM3OS0yLjA0Ny0yLjM3OUgzMy40OTF6IE0zMi45OTQsMC45NzRoMS4zMDhjNC43MDIsMCw4LjUxNCwzLjg2Niw4LjUxNCw4LjYzNHYyNS4yMjRsLTYuOTYzLDEuMjczdi03Ljg0OGgtNC40MDlsMC4wMTIsOC43ODdsLTYuOTc0LDIuMDE4VjkuNjA4QzI0LjQ4MSw0LjgzOSwyOC4yOTIsMC45NzQsMzIuOTk0LDAuOTc0IE0xMjEuOTMzLDcuOTIxaDMuNDIzYzEuMjE1LDAsMS43MTgsMC40OTcsMS43MTgsMS43MjR2OC4xOTRjMCwxLjIzMi0wLjUwMiwxLjczNi0xLjcwNSwxLjczNmgtMy40MzZWNy45MjF6IE0xMzMuNzE4LDMxLjA1NXYxNy40ODdsLTYuOTA2LTMuMzY4VjMxLjU5MWMwLTQuOTItNC41ODgtNS4wOC00LjU4OC01LjA4djE2Ljc3NGwtNi45ODMtMi45MTRWMS45MjVoMTIuMjMxYzMuMjkxLDAsNS45NTksMi43MDUsNS45NTksNi4wNDR2MTEuMDc3YzAsMi4yMDctMS4yMTcsNC4xNTMtMi45OTEsNS4xMTVDMTMxLjc2MSwyNC44OTQsMTMzLjcxOCwyNy4wNzcsMTMzLjcxOCwzMS4wNTUgTTEwLjgwOSwwLjgzM2MtNC43MDMsMC04LjUxNCwzLjg2Ni04LjUxNCw4LjYzNHYyNy45MzZjMCw0Ljc2OSw0LjAxOSw4LjYzNCw4LjcyMiw4LjYzNGwxLjMwNi0wLjA4NWM1LjY1NS0xLjA2Myw4LjMwNi00LjYzOSw4LjMwNi05LjQwN3YtOC45NGgtNi45OTZ2OC43MzZjMCwxLjQwOS0wLjA2NCwyLjY1LTEuOTk0LDIuOTkyYy0xLjIzMSwwLjIxOS0yLjQxNy0wLjgxNi0yLjQxNy0yLjEzMlYxMC4xNTFjMC0xLjMxNCwwLjkxNy0yLjM4MSwyLjA0Ny0yLjM4MWgwLjMxNWMxLjEzLDAsMi4wNDgsMS4wNjcsMi4wNDgsMi4zODF2OC40NjRoNi45OTZWOS40NjdjMC00Ljc2OC0zLjgxMi04LjYzNC04LjUxNC04LjYzNEgxMC44MDkgTTEwMy45NTMsMjMuMTYyaDYuOTc3di02Ljc0NGgtNi45NzdWOC40MjNsNy42NzYtMC4wMDJWMS45MjRIOTYuNzJ2MzMuMjc4YzAsMCw1LjIyNSwxLjE0MSw3LjUzMiwxLjY2NmMxLjUxNywwLjM0Niw3Ljc1MiwyLjI1Myw3Ljc1MiwyLjI1M3YtNy4wMTVsLTguMDUxLTEuNTA4VjIzLjE2MnogTTQ2Ljg3OSwxLjkyN2wwLjAwMywzMi4zNWw3LjEyMy0wLjg5NVYxOC45ODVsNS4xMjYsMTAuNDI2bDUuMTI2LTEwLjQ4NGwwLjAwMiwxMy42NjRsNy4wMjItMC4wNTRWMS44OTVoLTcuNTQ1TDU5LjEzLDE0LjZMNTQuNjYxLDEuOTI3SDQ2Ljg3OXpcXFwiLz48L3N2Zz5cXG5cdFx0XHQ8L2E+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiaG9tZS1idG5cXFwiPjxhIGhyZWY9XFxcIiMhL2xhbmRpbmdcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5ob21lX3R4dCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJjYW1wZXItbGFiXFxcIj48YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmxhYlVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubGFiVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMyksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzNCA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJsYWJVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY2FtcGVyX2xhYiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzaG9wLXdyYXBwZXIgYnRuXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInNob3AtdGl0bGVcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX3RpdGxlIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiPC9kaXY+XFxuXHRcdFx0XHQ8dWwgY2xhc3M9XFxcInN1Ym1lbnUtd3JhcHBlclxcXCI+XFxuXHRcdFx0XHRcdDxsaSBjbGFzcz1cXFwic3ViLTBcXFwiPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPSdcIlxuICAgICsgYWxpYXMyKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubWVuU2hvcFVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubWVuU2hvcFVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwibWVuU2hvcFVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCInPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX21lbiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2xpPlxcblx0XHRcdFx0XHQ8bGkgY2xhc3M9XFxcInN1Yi0xXFxcIj48YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj0nXCJcbiAgICArIGFsaWFzMigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLndvbWVuU2hvcFVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAud29tZW5TaG9wVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMyksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzNCA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJ3b21lblNob3BVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiJz5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuc2hvcF93b21lbiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2xpPlxcblx0XHRcdFx0PC91bD5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9oZWFkZXI+XFxuXHRcdDxmb290ZXIgaWQ9XFxcImZvb3RlclxcXCIgY2xhc3M9XFxcImJ0blxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwibGVnYWxcXFwiPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubGVnYWxVcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmxlZ2FsVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMyksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzNCA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJsZWdhbFVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5sZWdhbCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGlkPVxcXCJzb2NpYWwtd3JhcHBlclxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzb2NpYWwtdGl0bGVcXFwiPlNPQ0lBTDwvZGl2Plxcblx0XHRcdFx0PHVsPlxcblx0XHRcdFx0XHQ8bGk+XFxuXHRcdFx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5mYWNlYm9va1VybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuZmFjZWJvb2tVcmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMzKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXM0ID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImZhY2Vib29rVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTYuMDAxLDAuMTY3Yy04Ljc0NSwwLTE1LjgzNCw3LjA5LTE1LjgzNCwxNS44MzRjMCw4Ljc0NSw3LjA4OSwxNS44MzUsMTUuODM0LDE1LjgzNWM4Ljc0NSwwLDE1LjgzNC03LjA5LDE1LjgzNC0xNS44MzVDMzEuODM2LDcuMjU3LDI0Ljc0NiwwLjE2NywxNi4wMDEsMC4xNjcgTTE5LjQ5OCwxMy4zMmwtMC4xODQsMi4zNjloLTIuNDI3djguMjI5aC0zLjA2OHYtOC4yMjloLTEuNjM4VjEzLjMyaDEuNjM4di0xLjU5MmMwLTAuNzAxLDAuMDE3LTEuNzgyLDAuNTI3LTIuNDUzYzAuNTM2LTAuNzA5LDEuMjczLTEuMTkxLDIuNTQxLTEuMTkxYzIuMDY2LDAsMi45MzUsMC4yOTUsMi45MzUsMC4yOTVsLTAuNDEsMi40MjVjMCwwLTAuNjgyLTAuMTk2LTEuMzE4LTAuMTk2Yy0wLjYzNywwLTEuMjA3LDAuMjI3LTEuMjA3LDAuODYzdjEuODVIMTkuNDk4elxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0XHRcdDwvYT5cXG5cdFx0XHRcdFx0PC9saT5cXG5cdFx0XHRcdFx0PGxpPlxcblx0XHRcdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudHdpdHRlclVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudHdpdHRlclVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwidHdpdHRlclVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE2LjAwMiwwLjE2N2MtOC43NDYsMC0xNS44MzUsNy4wOS0xNS44MzUsMTUuODM0YzAsOC43NDYsNy4wODksMTUuODM1LDE1LjgzNSwxNS44MzVjOC43NDUsMCwxNS44MzQtNy4wODksMTUuODM0LTE1LjgzNUMzMS44MzYsNy4yNTcsMjQuNzQ3LDAuMTY3LDE2LjAwMiwwLjE2NyBNMjIuMzIyLDEzLjUzOWMwLjAwNywwLjEzOCwwLjAwOSwwLjI3OSwwLjAwOSwwLjQyYzAsNC4zMDItMy4yNzIsOS4yNTktOS4yNTksOS4yNTljLTEuODM3LDAtMy41NDctMC41MzktNC45ODctMS40NjFjMC4yNTMsMC4wMzEsMC41MTQsMC4wNDQsMC43NzYsMC4wNDRjMS41MjUsMCwyLjkyOC0wLjUyLDQuMDQyLTEuMzk0Yy0xLjQyNC0wLjAyMy0yLjYyNS0wLjk2NS0zLjAzOS0yLjI1OGMwLjE5OCwwLjAzNywwLjQwMiwwLjA1OCwwLjYxMSwwLjA1OGMwLjI5OCwwLDAuNTg1LTAuMDM4LDAuODU4LTAuMTE1Yy0xLjQ4OS0wLjI5Ny0yLjYxMi0xLjYxMi0yLjYxMi0zLjE4OXYtMC4wNDFjMC40NCwwLjI0MiwwLjk0MiwwLjM4OSwxLjQ3NSwwLjQwN2MtMC44NzMtMC41ODUtMS40NDctMS41ODEtMS40NDctMi43MDljMC0wLjU5NywwLjE2LTEuMTU1LDAuNDQxLTEuNjM4YzEuNjA1LDEuOTcsNC4wMDMsMy4yNjQsNi43MDgsMy40Yy0wLjA1Ny0wLjIzOC0wLjA4NS0wLjQ4NS0wLjA4NS0wLjc0YzAtMS43OTcsMS40NTgtMy4yNTQsMy4yNTQtMy4yNTRjMC45MzcsMCwxLjc4MywwLjM5NSwyLjM3NSwxLjAyOGMwLjc0Mi0wLjE0NiwxLjQzOC0wLjQxNywyLjA2Ny0wLjc4OWMtMC4yNDIsMC43NTktMC43NTksMS4zOTYtMS40MzIsMS43OTljMC42NTgtMC4wNzksMS4yODYtMC4yNTMsMS44NjktMC41MTFDMjMuNTExLDEyLjUwNywyMi45NTksMTMuMDc5LDIyLjMyMiwxMy41MzlcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdFx0XHQ8L2E+XFxuXHRcdFx0XHRcdDwvbGk+XFxuXHRcdFx0XHRcdDxsaT5cXG5cdFx0XHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmluc3RhZ3JhbVVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5zdGFncmFtVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMyksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzNCA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJpbnN0YWdyYW1VcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xOS40MTMsMTIuNjAybC0wLjAwOS0yLjY4NmwyLjY4NS0wLjAwOHYyLjY4NEwxOS40MTMsMTIuNjAyeiBNMTYuMDA0LDE4Ljc4OGMxLjUzNiwwLDIuNzg3LTEuMjUsMi43ODctMi43ODdjMC0wLjYwNS0wLjE5Ni0xLjE2Ni0wLjUyOC0xLjYyNGMtMC41MDctMC43MDMtMS4zMjktMS4xNjMtMi4yNTktMS4xNjNjLTAuOTMxLDAtMS43NTMsMC40Ni0yLjI2LDEuMTYzYy0wLjMzLDAuNDU4LTAuNTI3LDEuMDE5LTAuNTI3LDEuNjI0QzEzLjIxNywxNy41MzgsMTQuNDY3LDE4Ljc4OCwxNi4wMDQsMTguNzg4eiBNMjAuMzMzLDE2LjAwMWMwLDIuMzg3LTEuOTQyLDQuMzMtNC4zMjksNC4zM2MtMi4zODgsMC00LjMyOS0xLjk0My00LjMyOS00LjMzYzAtMC41NzUsMC4xMTQtMS4xMjMsMC4zMTgtMS42MjRIOS42Mjl2Ni40ODFjMCwwLjgzNiwwLjY4MSwxLjUxOCwxLjUxOCwxLjUxOGg5LjcxNGMwLjgzNywwLDEuNTE3LTAuNjgyLDEuNTE3LTEuNTE4di02LjQ4MWgtMi4zNjNDMjAuMjE3LDE0Ljg3OCwyMC4zMzMsMTUuNDI2LDIwLjMzMywxNi4wMDF6IE0zMS44MzYsMTYuMDAxYzAsOC43NDQtNy4wOSwxNS44MzUtMTUuODM1LDE1LjgzNVMwLjE2NywyNC43NDUsMC4xNjcsMTYuMDAxYzAtOC43NDUsNy4wODktMTUuODM0LDE1LjgzNC0xNS44MzRTMzEuODM2LDcuMjU2LDMxLjgzNiwxNi4wMDF6IE0yMy45MjEsMTEuMTQ0YzAtMS42ODgtMS4zNzMtMy4wNi0zLjA2Mi0zLjA2aC05LjcxM2MtMS42ODcsMC0zLjA2LDEuMzcxLTMuMDYsMy4wNnY5LjcxNGMwLDEuNjg4LDEuMzczLDMuMDYsMy4wNiwzLjA2aDkuNzEzYzEuNjg4LDAsMy4wNjItMS4zNzIsMy4wNjItMy4wNlYxMS4xNDR6XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHRcdFx0PC9hPlxcblx0XHRcdFx0XHQ8L2xpPlxcblx0XHRcdFx0PC91bD5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9mb290ZXI+XFxuXFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCI8ZGl2PlxcblxcblxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzTW9iaWxlIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5wcm9ncmFtKDQsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBpZD0ncGFnZXMtY29udGFpbmVyJz5cXG5cdDxkaXYgaWQ9J3BhZ2UtYSc+PC9kaXY+XFxuXHQ8ZGl2IGlkPSdwYWdlLWInPjwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCJcXG5cIjtcbn0sXCIzXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIlx0XHQ8ZGl2IGlkPVxcXCJzY3JvbGxiYXItdmlld1xcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwicmVsYXRpdmVcXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwic2Nyb2xsLWdyYWIgYnRuXFxcIj48L2Rpdj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInNjcm9sbC1iZyBidG5cXFwiPjwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdFxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzTW9iaWxlIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5wcm9ncmFtKDMsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlxcblxcblxcblx0PGRpdiBjbGFzcz1cXFwiaW50ZXJmYWNlIGFic29sdXRlXFxcIj5cXG5cdFx0XFxuXHRcdDxkaXYgY2xhc3M9XFxcImRvd24tYnRuIGRvdHMtYXJyb3ctYnRuIGJ0blxcXCI+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdDwvc3ZnPlxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwic2xpZGVzaG93LXRpdGxlXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwbGFuZXQtdGl0bGVcXFwiPjwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInBsYW5ldC1uYW1lXFxcIj48L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcImNvbXBhc3Nlcy10ZXh0cy13cmFwcGVyXFxcIj48L2Rpdj5cXG5cdFx0XFxuXHRcdDxhIGhyZWY9XFxcIiNcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiYnV5LWJ0biBidG5cXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImRvdHMtcmVjdGFuZ2xlLWJ0biBidG5cXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiYnRuLXRpdGxlXFxcIj48L2Rpdj5cXG5cdFx0XHRcdDxzdmc+XFxuXHRcdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDwvc3ZnPlxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtdGl0bGUtd3JhcHBlclxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwcm9kdWN0LXRpdGxlIHRpdGxlLWFcXFwiPjwvZGl2Plxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwicHJvZHVjdC10aXRsZSB0aXRsZS1iXFxcIj48L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9hPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJwcm9kdWN0LWNvbnRhaW5lcnMtd3JhcHBlclxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwicHJvZHVjdC1jb250YWluZXIgcHJvZHVjdC1jb250YWluZXItYVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwb3N0ZXItd3JhcHBlclxcXCI+XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcInNwaW5uZXItaW1nIHNwaW5uZXItd3JhcHBlclxcXCI+XFxuXHRcdFx0XHRcdFx0PHN2ZyB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMwMCAzMDBcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCI+XFxuXHRcdFx0XHRcdFx0XHQ8cGF0aCBkPVxcXCJNIDE1MCwwIGEgMTUwLDE1MCAwIDAsMSAxMDYuMDY2LDI1Ni4wNjYgbCAtMzUuMzU1LC0zNS4zNTUgYSAtMTAwLC0xMDAgMCAwLDAgLTcwLjcxMSwtMTcwLjcxMSB6XFxcIiBmaWxsPVxcXCIjNzZmMTlhXFxcIj5cXG5cdFx0XHRcdFx0XHRcdFx0PGFuaW1hdGVUcmFuc2Zvcm0gYXR0cmlidXRlTmFtZT1cXFwidHJhbnNmb3JtXFxcIiBhdHRyaWJ1dGVUeXBlPVxcXCJYTUxcXFwiIHR5cGU9XFxcInJvdGF0ZVxcXCIgZnJvbT1cXFwiMCAxNTAgMTUwXFxcIiB0bz1cXFwiMzYwIDE1MCAxNTBcXFwiIGJlZ2luPVxcXCIwc1xcXCIgZHVyPVxcXCIwLjVzXFxcIiBmaWxsPVxcXCJmcmVlemVcXFwiIHJlcGVhdENvdW50PVxcXCJpbmRlZmluaXRlXFxcIj48L2FuaW1hdGVUcmFuc2Zvcm0+XFxuXHRcdFx0XHRcdFx0XHQ8L3BhdGg+XFxuXHRcdFx0XHRcdFx0PC9zdmc+XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHQ8aW1nIHNyYz1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzWydlbXB0eS1pbWFnZSddIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMFsnZW1wdHktaW1hZ2UnXSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiZW1wdHktaW1hZ2VcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwidmlkZW8td3JhcHBlciBidG5cXFwiPlxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ2aWRlby1jb250YWluZXIgYnRuXFxcIj48L2Rpdj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtY29udGFpbmVyIHByb2R1Y3QtY29udGFpbmVyLWJcXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwicG9zdGVyLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzcGlubmVyLWltZyBzcGlubmVyLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0XHRcdDxzdmcgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMDAgMzAwXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiPlxcblx0XHRcdFx0XHRcdFx0PHBhdGggZD1cXFwiTSAxNTAsMCBhIDE1MCwxNTAgMCAwLDEgMTA2LjA2NiwyNTYuMDY2IGwgLTM1LjM1NSwtMzUuMzU1IGEgLTEwMCwtMTAwIDAgMCwwIC03MC43MTEsLTE3MC43MTEgelxcXCIgZmlsbD1cXFwiIzc2ZjE5YVxcXCI+XFxuXHRcdFx0XHRcdFx0XHRcdDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9XFxcInRyYW5zZm9ybVxcXCIgYXR0cmlidXRlVHlwZT1cXFwiWE1MXFxcIiB0eXBlPVxcXCJyb3RhdGVcXFwiIGZyb209XFxcIjAgMTUwIDE1MFxcXCIgdG89XFxcIjM2MCAxNTAgMTUwXFxcIiBiZWdpbj1cXFwiMHNcXFwiIGR1cj1cXFwiMC41c1xcXCIgZmlsbD1cXFwiZnJlZXplXFxcIiByZXBlYXRDb3VudD1cXFwiaW5kZWZpbml0ZVxcXCI+PC9hbmltYXRlVHJhbnNmb3JtPlxcblx0XHRcdFx0XHRcdFx0PC9wYXRoPlxcblx0XHRcdFx0XHRcdDwvc3ZnPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0PGltZyBzcmM9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVyc1snZW1wdHktaW1hZ2UnXSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDBbJ2VtcHR5LWltYWdlJ10gOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImVtcHR5LWltYWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInZpZGVvLXdyYXBwZXIgYnRuXFxcIj5cXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwidmlkZW8tY29udGFpbmVyIGJ0blxcXCI+PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImludGVyZmFjZSBmaXhlZFxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInByZXZpb3VzLWJ0biBkb3RzLWFycm93LWJ0biBidG5cXFwiPlxcblx0XHRcdDxzdmc+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHQ8L3N2Zz5cXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcIm5leHQtYnRuIGRvdHMtYXJyb3ctYnRuIGJ0blxcXCI+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdDwvc3ZnPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcblxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdDxkaXYgY2xhc3M9XFxcImNvbXBhc3Nlcy10ZXh0cy13cmFwcGVyXFxcIj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwiaW50ZXJmYWNlXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiZ28tY2FtcGFpZ24tYnRuIGRvdHMtcmVjdGFuZ2xlLWJ0biBidG5cXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImJ0bi10aXRsZVxcXCI+PC9kaXY+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0PC9zdmc+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiXHRcXG5cdFx0PHVsIGNsYXNzPSdwbGFuZXRzLW1lbnUnPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubW9iaWxlU2NvcGUgOiBkZXB0aDApLHtcIm5hbWVcIjpcImVhY2hcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDIsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcdFx0PC91bD5cXG5cXG5cIjtcbn0sXCIyXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHQ8bGkgaWQ9J1wiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pZCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImlkXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIic+XFxuXHRcdFx0XHRcdDxhIGhyZWY9J1wiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy51cmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwidXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIic+XFxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW1nLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0XHRcdFx0PGltZyBzcmM9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbWdzcmMgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltZ3NyYyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaW1nc3JjXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgYWx0PVxcXCJcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaWQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlkIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJpZFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHQ8L2E+XFxuXHRcdFx0XHQ8L2xpPlxcblwiO1xufSxcIjRcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXFxuXHRcdDxkaXYgY2xhc3M9XFxcInNsaWRlc2hvdy10aXRsZVxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwicGxhbmV0LXRpdGxlXFxcIj48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwbGFuZXQtbmFtZVxcXCI+PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJpbnRlcmZhY2VcXFwiPlxcblxcblx0XHRcdDxkaXYgaWQ9XFxcImxlZnRcXFwiIGNsYXNzPVxcXCJwcmV2aW91cy1hcmVhIGFyZWEtYnRuXFxcIj48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGlkPVxcXCJyaWdodFxcXCIgY2xhc3M9XFxcIm5leHQtYXJlYSBhcmVhLWJ0blxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBpZD1cXFwibWlkZGxlXFxcIiBjbGFzcz1cXFwibWlkZGxlLWFyZWEgYXJlYS1idG5cXFwiPjwvZGl2Plxcblxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInByZXZpb3VzLWJ0biBkb3RzLWFycm93LWJ0blxcXCI+XFxuXHRcdFx0XHQ8c3ZnPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHQ8L3N2Zz5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJuZXh0LWJ0biBkb3RzLWFycm93LWJ0blxcXCI+XFxuXHRcdFx0XHQ8c3ZnPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHQ8L3N2Zz5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCI8ZGl2IGNsYXNzPSdwYWdlLXdyYXBwZXInPlxcblxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzTW9iaWxlIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5wcm9ncmFtKDQsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuICAgIFx0XG5jbGFzcyBHbG9iYWxFdmVudHMge1xuXHRpbml0KCkge1xuXHRcdCQod2luZG93KS5vbigncmVzaXplJywgdGhpcy5yZXNpemUpXG5cdFx0JCh3aW5kb3cpLm9uKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlKVxuXHRcdEFwcFN0b3JlLk1vdXNlID0gbmV3IFBJWEkuUG9pbnQoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRBcHBBY3Rpb25zLndpbmRvd1Jlc2l6ZSh3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0KVxuXHR9XG5cdG9uTW91c2VNb3ZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRBcHBTdG9yZS5Nb3VzZS54ID0gZS5wYWdlWFxuXHRcdEFwcFN0b3JlLk1vdXNlLnkgPSBlLnBhZ2VZXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2xvYmFsRXZlbnRzXG4iLCJpbXBvcnQgb3AgZnJvbSAnb2JqZWN0cG9vbCdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBTcHJpbmdHYXJkZW4gZnJvbSAnU3ByaW5nR2FyZGVuJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb29sIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHR2YXIgcHhDb250YWluZXJOdW0gPSAyMCArIChwbGFuZXRzLmxlbmd0aCAqIDEpXG5cdFx0dmFyIGdyYXBoaWNzTnVtID0gKHBsYW5ldHMubGVuZ3RoICogMykgLSAyXG5cdFx0dmFyIHNwcml0ZXNOdW0gPSBwbGFuZXRzLmxlbmd0aFxuXHRcdHZhciBzcHJpbmdHYXJkZW5zTnVtID0gMTBcblxuXHRcdHRoaXMudGltZWxpbmVzID0gb3AuZ2VuZXJhdGUoVGltZWxpbmVNYXgsIHsgY291bnQ6IDIwIH0pXG5cdFx0dGhpcy5weENvbnRhaW5lcnMgPSBvcC5nZW5lcmF0ZShQSVhJLkNvbnRhaW5lciwgeyBjb3VudDogcHhDb250YWluZXJOdW0gfSlcblx0XHR0aGlzLmdyYXBoaWNzID0gb3AuZ2VuZXJhdGUoUElYSS5HcmFwaGljcywgeyBjb3VudDogZ3JhcGhpY3NOdW0gfSlcblx0XHR0aGlzLnNwcml0ZXMgPSBvcC5nZW5lcmF0ZShQSVhJLlNwcml0ZSwgeyBjb3VudDogc3ByaXRlc051bSB9KVxuXHRcdHRoaXMuc3ByaW5nR2FyZGVucyA9IG9wLmdlbmVyYXRlKFNwcmluZ0dhcmRlbiwgeyBjb3VudDogc3ByaW5nR2FyZGVuc051bSB9KVxuXHR9XG5cdGdldFRpbWVsaW5lKCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdnZXQgPj4+Pj4+Pj4+Pj4+Pj4+Jylcblx0XHR2YXIgdGwgPSB0aGlzLnRpbWVsaW5lcy5nZXQoKVxuXHRcdHRsLmtpbGwoKVxuXHRcdHRsLmNsZWFyKClcblx0XHRyZXR1cm4gdGxcblx0fVxuXHRyZWxlYXNlVGltZWxpbmUoaXRlbSkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdyZWxlYXNlIDw8PDw8PDw8PDw8PDw8JywgaXRlbSlcblx0XHRpdGVtLmtpbGwoKVxuXHRcdGl0ZW0uY2xlYXIoKVxuXHRcdHRoaXMudGltZWxpbmVzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRDb250YWluZXIoKSB7XG5cdFx0dmFyIGNvbnRhaW5lciA9IHRoaXMucHhDb250YWluZXJzLmdldCgpXG5cdFx0Y29udGFpbmVyLnNjYWxlLnggPSAxXG5cdFx0Y29udGFpbmVyLnNjYWxlLnkgPSAxXG5cdFx0Y29udGFpbmVyLnBvc2l0aW9uLnggPSAwXG5cdFx0Y29udGFpbmVyLnBvc2l0aW9uLnkgPSAwXG5cdFx0Y29udGFpbmVyLnBpdm90LnggPSAwXG5cdFx0Y29udGFpbmVyLnBpdm90LnkgPSAwXG5cdFx0Y29udGFpbmVyLnJvdGF0aW9uID0gMFxuXHRcdGNvbnRhaW5lci5hbHBoYSA9IDFcblx0XHRyZXR1cm4gY29udGFpbmVyXG5cdH1cblx0cmVsZWFzZUNvbnRhaW5lcihpdGVtKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lcnMucmVsZWFzZShpdGVtKVxuXHR9XG5cdGdldEdyYXBoaWNzKCkge1xuXHRcdHZhciBnID0gdGhpcy5ncmFwaGljcy5nZXQoKVxuXHRcdGcuY2xlYXIoKVxuXHRcdGcuc2NhbGUueCA9IDFcblx0XHRnLnNjYWxlLnkgPSAxXG5cdFx0Zy5wb3NpdGlvbi54ID0gMFxuXHRcdGcucG9zaXRpb24ueSA9IDBcblx0XHRnLnBpdm90LnggPSAwXG5cdFx0Zy5waXZvdC55ID0gMFxuXHRcdGcucm90YXRpb24gPSAwXG5cdFx0cmV0dXJuIGdcblx0fVxuXHRyZWxlYXNlR3JhcGhpY3MoaXRlbSkge1xuXHRcdHRoaXMuZ3JhcGhpY3MucmVsZWFzZShpdGVtKVxuXHR9XG5cdGdldFNwcml0ZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zcHJpdGVzLmdldCgpXG5cdH1cblx0cmVsZWFzZVNwcml0ZShpdGVtKSB7XG5cdFx0dGhpcy5zcHJpdGVzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRTcHJpbmdHYXJkZW4oKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3ByaW5nR2FyZGVucy5nZXQoKVxuXHR9XG5cdHJlbGVhc2VTcHJpbmdHYXJkZW4oaXRlbSkge1xuXHRcdHRoaXMuc3ByaW5nR2FyZGVucy5yZWxlYXNlKGl0ZW0pXG5cdH1cbn1cbiIsImNsYXNzIFByZWxvYWRlciAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLnF1ZXVlID0gbmV3IGNyZWF0ZWpzLkxvYWRRdWV1ZSh0cnVlKVxuXHRcdHRoaXMucXVldWUub24oXCJjb21wbGV0ZVwiLCB0aGlzLm9uTWFuaWZlc3RMb2FkQ29tcGxldGVkLCB0aGlzKVxuXHRcdHRoaXMuY3VycmVudExvYWRlZENhbGxiYWNrID0gdW5kZWZpbmVkXG5cdH1cblx0bG9hZChtYW5pZmVzdCwgb25Mb2FkZWQpIHtcblx0XHR0aGlzLmN1cnJlbnRMb2FkZWRDYWxsYmFjayA9IG9uTG9hZGVkXG4gICAgICAgIHRoaXMucXVldWUubG9hZE1hbmlmZXN0KG1hbmlmZXN0KVxuXHR9XG5cdG9uTWFuaWZlc3RMb2FkQ29tcGxldGVkKCkge1xuXHRcdHRoaXMuY3VycmVudExvYWRlZENhbGxiYWNrKClcblx0fVxuXHRnZXRDb250ZW50QnlJZChpZCkge1xuXHRcdHJldHVybiB0aGlzLnF1ZXVlLmdldFJlc3VsdChpZClcblx0fVxuXHRnZXRTdmcoaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5nZXRDb250ZW50QnlJZChpZCtcIi1zdmdcIilcblx0fVxuXHRnZXRJbWFnZVVSTChpZCkge1xuXHRcdHJldHVybiB0aGlzLmdldENvbnRlbnRCeUlkKGlkKS5nZXRBdHRyaWJ1dGUoXCJzcmNcIilcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQcmVsb2FkZXJcbiIsImltcG9ydCBkYXRhIGZyb20gJ0dsb2JhbERhdGEnXG5pbXBvcnQgaGFzaGVyIGZyb20gJ2hhc2hlcidcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgY3Jvc3Nyb2FkcyBmcm9tICdjcm9zc3JvYWRzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5jbGFzcyBSb3V0ZXIge1xuXHRpbml0KCkge1xuXHRcdHRoaXMucm91dGluZyA9IGRhdGEucm91dGluZ1xuXHRcdHRoaXMuZGVmYXVsdFJvdXRlID0gdGhpcy5yb3V0aW5nWycvJ11cblx0XHR0aGlzLm5ld0hhc2hGb3VuZGVkID0gZmFsc2Vcblx0XHRoYXNoZXIubmV3SGFzaCA9IHVuZGVmaW5lZFxuXHRcdGhhc2hlci5vbGRIYXNoID0gdW5kZWZpbmVkXG5cdFx0aGFzaGVyLnByZXBlbmRIYXNoID0gJyEnXG5cdFx0aGFzaGVyLmluaXRpYWxpemVkLmFkZCh0aGlzLl9kaWRIYXNoZXJDaGFuZ2UuYmluZCh0aGlzKSlcblx0XHRoYXNoZXIuY2hhbmdlZC5hZGQodGhpcy5fZGlkSGFzaGVyQ2hhbmdlLmJpbmQodGhpcykpXG5cdFx0dGhpcy5fc2V0dXBDcm9zc3JvYWRzKClcblx0fVxuXHRiZWdpblJvdXRpbmcoKSB7XG5cdFx0aGFzaGVyLmluaXQoKVxuXHR9XG5cdF9zZXR1cENyb3Nzcm9hZHMoKSB7XG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHR2YXIgYmFzaWNTZWN0aW9uID0gY3Jvc3Nyb2Fkcy5hZGRSb3V0ZSgne3BhZ2V9JywgdGhpcy5fb25GaXJzdERlZ3JlZVVSTEhhbmRsZXIuYmluZCh0aGlzKSwgMylcblx0XHRiYXNpY1NlY3Rpb24ucnVsZXMgPSB7XG5cdCAgICAgICAgcGFnZSA6IFsnbGFuZGluZyddIC8vdmFsaWQgc2VjdGlvbnNcblx0ICAgIH1cblx0ICAgIHZhciBwbGFuZXRQcm9kdWN0U2VjdGlvbiA9IGNyb3Nzcm9hZHMuYWRkUm91dGUoJy9wbGFuZXQve3BsYW5ldElkfS97cHJvZHVjdElkfScsIHRoaXMuX29uUGxhbmV0UHJvZHVjdFVSTEhhbmRsZXIuYmluZCh0aGlzKSwgMilcblx0ICAgIHBsYW5ldFByb2R1Y3RTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgXHRwbGFuZXRJZDogcGxhbmV0cyxcblx0ICAgIFx0cHJvZHVjdElkIDogL15bMC02XS9cblx0ICAgIH1cblx0ICAgIHZhciBwbGFuZXRTZWN0aW9uID0gY3Jvc3Nyb2Fkcy5hZGRSb3V0ZSgnL3BsYW5ldC97cGxhbmV0SWR9JywgdGhpcy5fb25QbGFuZXRVUkxIYW5kbGVyLmJpbmQodGhpcyksIDIpXG5cdCAgICBwbGFuZXRTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgXHRwbGFuZXRJZDogcGxhbmV0c1xuXHQgICAgfVxuXHR9XG5cdF9vbkZpcnN0RGVncmVlVVJMSGFuZGxlcihwYWdlSWQpIHtcblx0XHR0aGlzLl9hc3NpZ25Sb3V0ZShwYWdlSWQpXG5cdH1cblx0X29uUGxhbmV0UHJvZHVjdFVSTEhhbmRsZXIocGxhbmV0SWQsIHByb2R1Y3RJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHByb2R1Y3RJZClcblx0fVxuXHRfb25QbGFuZXRVUkxIYW5kbGVyKHBsYW5ldElkKSB7XG5cdFx0dGhpcy5fYXNzaWduUm91dGUocGxhbmV0SWQpXG5cdH1cblx0X29uQmxvZ1Bvc3RVUkxIYW5kbGVyKHBvc3RJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHBvc3RJZClcblx0fVxuXHRfb25EZWZhdWx0VVJMSGFuZGxlcigpIHtcblx0XHR0aGlzLl9zZW5kVG9EZWZhdWx0KClcblx0fVxuXHRfYXNzaWduUm91dGUoaWQpIHtcblx0XHR2YXIgaGFzaCA9IGhhc2hlci5nZXRIYXNoKClcblx0XHR2YXIgcGFydHMgPSB0aGlzLl9nZXRVUkxQYXJ0cyhoYXNoKVxuXHRcdHRoaXMuX3VwZGF0ZVBhZ2VSb3V0ZShoYXNoLCBwYXJ0cywgcGFydHNbMF0sIGlkKVxuXHRcdHRoaXMubmV3SGFzaEZvdW5kZWQgPSB0cnVlXG5cdH1cblx0X2dldFVSTFBhcnRzKHVybCkge1xuXHRcdHZhciBoYXNoID0gdXJsXG5cdFx0aGFzaCA9IGhhc2guc3Vic3RyKDEpXG5cdFx0cmV0dXJuIGhhc2guc3BsaXQoJy8nKVxuXHR9XG5cdF91cGRhdGVQYWdlUm91dGUoaGFzaCwgcGFydHMsIHBhcmVudCwgdGFyZ2V0SWQpIHtcblx0XHRoYXNoZXIub2xkSGFzaCA9IGhhc2hlci5uZXdIYXNoXG5cdFx0aGFzaGVyLm5ld0hhc2ggPSB7XG5cdFx0XHRoYXNoOiBoYXNoLFxuXHRcdFx0cGFydHM6IHBhcnRzLFxuXHRcdFx0cGFyZW50OiBwYXJlbnQsXG5cdFx0XHR0YXJnZXRJZDogdGFyZ2V0SWRcblx0XHR9XG5cdFx0QXBwQWN0aW9ucy5wYWdlSGFzaGVyQ2hhbmdlZCgpXG5cdH1cblx0X2RpZEhhc2hlckNoYW5nZShuZXdIYXNoLCBvbGRIYXNoKSB7XG5cdFx0dGhpcy5uZXdIYXNoRm91bmRlZCA9IGZhbHNlXG5cdFx0Y3Jvc3Nyb2Fkcy5wYXJzZShuZXdIYXNoKVxuXHRcdGlmKHRoaXMubmV3SGFzaEZvdW5kZWQpIHJldHVyblxuXHRcdC8vIElmIFVSTCBkb24ndCBtYXRjaCBhIHBhdHRlcm4sIHNlbmQgdG8gZGVmYXVsdFxuXHRcdHRoaXMuX29uRGVmYXVsdFVSTEhhbmRsZXIoKVxuXHR9XG5cdF9zZW5kVG9EZWZhdWx0KCkge1xuXHRcdGhhc2hlci5zZXRIYXNoKEFwcFN0b3JlLmRlZmF1bHRSb3V0ZSgpKVxuXHR9XG5cdHN0YXRpYyBnZXRCYXNlVVJMKCkge1xuXHRcdHJldHVybiBkb2N1bWVudC5VUkwuc3BsaXQoXCIjXCIpWzBdXG5cdH1cblx0c3RhdGljIGdldEhhc2goKSB7XG5cdFx0cmV0dXJuIGhhc2hlci5nZXRIYXNoKClcblx0fVxuXHRzdGF0aWMgZ2V0Um91dGVzKCkge1xuXHRcdHJldHVybiBkYXRhLnJvdXRpbmdcblx0fVxuXHRzdGF0aWMgZ2V0TmV3SGFzaCgpIHtcblx0XHRyZXR1cm4gaGFzaGVyLm5ld0hhc2hcblx0fVxuXHRzdGF0aWMgZ2V0T2xkSGFzaCgpIHtcblx0XHRyZXR1cm4gaGFzaGVyLm9sZEhhc2hcblx0fVxuXHRzdGF0aWMgc2V0SGFzaChoYXNoKSB7XG5cdFx0aGFzaGVyLnNldEhhc2goaGFzaClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBSb3V0ZXJcbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG52YXIgVHJhbnNpdGlvbkFuaW1hdGlvbnMgPSB7XG5cblx0Ly8gRVhQRVJJRU5DRSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCdleHBlcmllbmNlLWluJzogZnVuY3Rpb24oc2NvcGUsIHRpbWVsaW5lKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMub2xkVHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHZhciBkaXJlY3Rpb24gPSAoQXBwU3RvcmUuZ2V0RXhwZXJpZW5jZUFuaW1hdGlvbkRpcmVjdGlvbigpID09IEFwcENvbnN0YW50cy5MRUZUKSA/IC0xIDogMVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeDp3aW5kb3dXKmRpcmVjdGlvbiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHg6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB4OndpbmRvd1cqZGlyZWN0aW9uLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeDowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdH0sXG5cdCdleHBlcmllbmNlLW91dCc6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGltZWxpbmUudG8od3JhcHBlciwgMSwgeyBvcGFjaXR5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHRcblx0XHRzd2l0Y2godHlwZXMubmV3VHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHZhciBkaXJlY3Rpb24gPSAoQXBwU3RvcmUuZ2V0RXhwZXJpZW5jZUFuaW1hdGlvbkRpcmVjdGlvbigpID09IEFwcENvbnN0YW50cy5MRUZUKSA/IC0xIDogMVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeDowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeDotd2luZG93VypkaXJlY3Rpb24sIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeDowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeDotd2luZG93VypkaXJlY3Rpb24sIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkNBTVBBSUdOOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0fSxcblxuXHQvLyBDQU1QQUlHTiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCdjYW1wYWlnbi1pbic6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMub2xkVHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0fSxcblx0J2NhbXBhaWduLW91dCc6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMubmV3VHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0fSxcblxuXHQvLyBMQU5ESU5HIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0J2xhbmRpbmctaW4nOiBmdW5jdGlvbihzY29wZSwgdGltZWxpbmUpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0c3dpdGNoKHR5cGVzLm9sZFR5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdH0sXG5cdCdsYW5kaW5nLW91dCc6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0c3dpdGNoKHR5cGVzLm5ld1R5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUudG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLnRvKHdyYXBwZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUudG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLnRvKHdyYXBwZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRyYW5zaXRpb25BbmltYXRpb25zXG4iLCJpbXBvcnQgQXBwRGlzcGF0Y2hlciBmcm9tICdBcHBEaXNwYXRjaGVyJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQge0V2ZW50RW1pdHRlcjJ9IGZyb20gJ2V2ZW50ZW1pdHRlcjInXG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nXG5pbXBvcnQgZGF0YSBmcm9tICdHbG9iYWxEYXRhJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5cbmZ1bmN0aW9uIF9nZXRQYWdlQ29udGVudCgpIHtcbiAgICB2YXIgc2NvcGUgPSBfZ2V0UGFnZUlkKClcbiAgICB2YXIgbGFuZ0NvbnRlbnQgPSBfZ2V0Q29udGVudEJ5TGFuZyhBcHBTdG9yZS5sYW5nKCkpXG4gICAgdmFyIHBhZ2VDb250ZW50ID0gbGFuZ0NvbnRlbnRbc2NvcGVdXG4gICAgcmV0dXJuIHBhZ2VDb250ZW50XG59XG5mdW5jdGlvbiBfZ2V0UGFnZUlkKCkge1xuICAgIHJldHVybiBfZ2V0Q29udGVudFNjb3BlKCkuaWRcbn1cbmZ1bmN0aW9uIF9nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKCkge1xuICAgIHZhciBuZXdIYXNoZXIgPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG4gICAgdmFyIG9sZEhhc2hlciA9IFJvdXRlci5nZXRPbGRIYXNoKClcbiAgICByZXR1cm4geyBuZXdUeXBlOiBfZ2V0VHlwZU9mUGFnZShuZXdIYXNoZXIpLCBvbGRUeXBlOiBfZ2V0VHlwZU9mUGFnZShvbGRIYXNoZXIpIH1cbn1cbmZ1bmN0aW9uIF9nZXRUeXBlT2ZQYWdlKGhhc2gpIHtcbiAgICB2YXIgaCA9IGhhc2ggfHwgUm91dGVyLmdldE5ld0hhc2goKVxuICAgIGlmKGggPT0gdW5kZWZpbmVkKSByZXR1cm4gQXBwQ29uc3RhbnRzLk5PTkVcbiAgICBpZihoLnBhcnRzLmxlbmd0aCA9PSAzKSByZXR1cm4gQXBwQ29uc3RhbnRzLkNBTVBBSUdOXG4gICAgZWxzZSBpZihoLnBhcnRzLmxlbmd0aCA9PSAyKSByZXR1cm4gQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0VcbiAgICBlbHNlIHJldHVybiBBcHBDb25zdGFudHMuTEFORElOR1xufVxuZnVuY3Rpb24gX2dldENvbnRlbnRTY29wZSgpIHtcbiAgICB2YXIgaGFzaE9iaiA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICB2YXIgcm91dGVTY29wZTtcbiAgICBpZihoYXNoT2JqLnBhcnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgdmFyIHBhcmVudFBhdGggPSBoYXNoT2JqLmhhc2gucmVwbGFjZSgnLycraGFzaE9iai50YXJnZXRJZCwgJycpXG4gICAgICAgIHJvdXRlU2NvcGUgPSBBcHBTdG9yZS5nZXRSb3V0ZVBhdGhTY29wZUJ5SWQocGFyZW50UGF0aClcbiAgICB9ZWxzZXtcbiAgICAgICAgcm91dGVTY29wZSA9IEFwcFN0b3JlLmdldFJvdXRlUGF0aFNjb3BlQnlJZChoYXNoT2JqLmhhc2gpXG4gICAgfVxuICAgIHJldHVybiByb3V0ZVNjb3BlXG59XG5mdW5jdGlvbiBfZ2V0UGFnZUFzc2V0c1RvTG9hZCgpIHtcbiAgICB2YXIgc2NvcGUgPSBfZ2V0Q29udGVudFNjb3BlKClcbiAgICB2YXIgaGFzaE9iaiA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICB2YXIgdGFyZ2V0SWQ7XG4gICAgdmFyIHR5cGUgPSBfZ2V0VHlwZU9mUGFnZSgpXG4gICAgdGFyZ2V0SWQgPSB0eXBlLnRvTG93ZXJDYXNlKCkgKyAnLWFzc2V0cydcbiAgICB2YXIgbWFuaWZlc3QgPSBfYWRkQmFzZVBhdGhzVG9VcmxzKHNjb3BlW3RhcmdldElkXSwgc2NvcGUuaWQsIHRhcmdldElkLCB0eXBlKVxuICAgIHJldHVybiBtYW5pZmVzdFxufVxuZnVuY3Rpb24gX2FkZEJhc2VQYXRoc1RvVXJscyh1cmxzLCBwYWdlSWQsIHRhcmdldElkLCB0eXBlKSB7XG4gICAgdmFyIGJhc2VQYXRoID0gX2dldFBhZ2VBc3NldHNCYXNlUGF0aEJ5SWQocGFnZUlkLCB0YXJnZXRJZClcbiAgICB2YXIgbWFuaWZlc3QgPSBbXVxuICAgIGlmKHVybHMgPT0gdW5kZWZpbmVkIHx8IHVybHMubGVuZ3RoIDwgMSkgcmV0dXJuIG1hbmlmZXN0XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB1cmxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzcGxpdHRlciA9IHVybHNbaV0uc3BsaXQoJy4nKVxuICAgICAgICB2YXIgZmlsZU5hbWUgPSBzcGxpdHRlclswXVxuICAgICAgICB2YXIgZXh0ZW5zaW9uID0gc3BsaXR0ZXJbMV1cbiAgICAgICAgbWFuaWZlc3RbaV0gPSB7XG4gICAgICAgICAgICBpZDogcGFnZUlkICsgJy0nICsgdHlwZS50b0xvd2VyQ2FzZSgpICsgJy0nICsgZmlsZU5hbWUsXG4gICAgICAgICAgICBzcmM6IGJhc2VQYXRoICsgZmlsZU5hbWUgKyAnLicgKyBleHRlbnNpb25cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWFuaWZlc3Rcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlQXNzZXRzQmFzZVBhdGhCeUlkKGlkLCBhc3NldEdyb3VwSWQpIHtcbiAgICByZXR1cm4gQXBwU3RvcmUuYmFzZU1lZGlhUGF0aCgpICsgJy9pbWFnZS9wbGFuZXRzLycgKyBpZCArICcvJyArIGFzc2V0R3JvdXBJZCArICcvJ1xufVxuZnVuY3Rpb24gX2dldE1lbnVDb250ZW50KCkge1xuICAgIHJldHVybiBkYXRhLm1lbnVcbn1cbmZ1bmN0aW9uIF9nZXRDb250ZW50QnlMYW5nKGxhbmcpIHtcbiAgICByZXR1cm4gZGF0YS5sYW5nW2xhbmddXG59XG5mdW5jdGlvbiBfZ2V0R2VuZXJhbEluZm9zKCkge1xuICAgIHJldHVybiBkYXRhLmluZm9zLmxhbmdbQXBwU3RvcmUubGFuZygpXVxufVxuZnVuY3Rpb24gX2dldEFwcERhdGEoKSB7XG4gICAgcmV0dXJuIGRhdGFcbn1cbmZ1bmN0aW9uIF9nZXREZWZhdWx0Um91dGUoKSB7XG4gICAgcmV0dXJuIGRhdGFbJ2RlZmF1bHQtcm91dGUnXVxufVxuZnVuY3Rpb24gX2dldEdsb2JhbENvbnRlbnQoKSB7XG4gICAgdmFyIGxhbmdDb250ZW50ID0gX2dldENvbnRlbnRCeUxhbmcoQXBwU3RvcmUubGFuZygpKVxuICAgIHJldHVybiBsYW5nQ29udGVudFsnZ2xvYmFsJ11cbn1cbmZ1bmN0aW9uIF93aW5kb3dXaWR0aEhlaWdodCgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB3OiB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgaDogd2luZG93LmlubmVySGVpZ2h0XG4gICAgfVxufVxudmFyIEFwcFN0b3JlID0gYXNzaWduKHt9LCBFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSwge1xuICAgIGVtaXRDaGFuZ2U6IGZ1bmN0aW9uKHR5cGUsIGl0ZW0pIHtcbiAgICAgICAgdGhpcy5lbWl0KHR5cGUsIGl0ZW0pXG4gICAgfSxcbiAgICBwYWdlQ29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0UGFnZUNvbnRlbnQoKVxuICAgIH0sXG4gICAgbWVudUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldE1lbnVDb250ZW50KClcbiAgICB9LFxuICAgIGNvdW50cmllczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmNvdW50cmllc1xuICAgIH0sXG4gICAgYXBwRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0QXBwRGF0YSgpXG4gICAgfSxcbiAgICBsYW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEpTX2xhbmdcbiAgICB9LFxuICAgIGRlZmF1bHRSb3V0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0RGVmYXVsdFJvdXRlKClcbiAgICB9LFxuICAgIGdsb2JhbENvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldEdsb2JhbENvbnRlbnQoKVxuICAgIH0sXG4gICAgZ2VuZXJhbEluZm9zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuaW5mb3NcbiAgICB9LFxuICAgIGdlbmVyYWxJbmZvc0xhbmdTY29wZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0R2VuZXJhbEluZm9zKClcbiAgICB9LFxuICAgIGdldEVtcHR5SW1nVXJsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLmdldEVudmlyb25tZW50KCkuc3RhdGljICsgJ2ltYWdlL2VtcHR5LnBuZydcbiAgICB9LFxuICAgIG1haW5JbWFnZVVybDogZnVuY3Rpb24oaWQsIHJlc3BvbnNpdmVBcnJheSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuYmFzZU1lZGlhUGF0aCgpICsgJ2ltYWdlL3BsYW5ldHMvJyArIGlkICsgJy9tYWluLScgKyBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VXaWR0aChyZXNwb25zaXZlQXJyYXkpICsgJy5qcGcnXG4gICAgfSxcbiAgICBtYWluSW1hZ2VNYXBVcmw6IGZ1bmN0aW9uKGlkLCByZXNwb25zaXZlQXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLmJhc2VNZWRpYVBhdGgoKSArICdpbWFnZS9wbGFuZXRzLycgKyBpZCArICcvbWFpbi1tYXAtJyArIEFwcFN0b3JlLnJlc3BvbnNpdmVJbWFnZVdpZHRoKHJlc3BvbnNpdmVBcnJheSkgKyAnLmpwZydcbiAgICB9LFxuICAgIGJhc2VNZWRpYVBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuZ2V0RW52aXJvbm1lbnQoKS5zdGF0aWNcbiAgICB9LFxuICAgIGdldFJvdXRlUGF0aFNjb3BlQnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEucm91dGluZ1tpZF1cbiAgICB9LFxuICAgIGdldFBhZ2VJZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0UGFnZUlkKClcbiAgICB9LFxuICAgIGdldFR5cGVPZk5ld0FuZE9sZFBhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuICAgIH0sXG4gICAgZ2V0VHlwZU9mUGFnZTogZnVuY3Rpb24oaGFzaCkge1xuICAgICAgICByZXR1cm4gX2dldFR5cGVPZlBhZ2UoaGFzaClcbiAgICB9LFxuICAgIGdldEVudmlyb25tZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcENvbnN0YW50cy5FTlZJUk9OTUVOVFNbRU5WXVxuICAgIH0sXG4gICAgZ2V0TGluZVdpZHRoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIDJcbiAgICB9LFxuICAgIHBhZ2VBc3NldHNUb0xvYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldFBhZ2VBc3NldHNUb0xvYWQoKVxuICAgIH0sXG4gICAgZ2V0RXhwZXJpZW5jZUFuaW1hdGlvbkRpcmVjdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBuZXdIYXNoZXIgPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG4gICAgICAgIHZhciBvbGRIYXNoZXIgPSBSb3V0ZXIuZ2V0T2xkSGFzaCgpXG4gICAgICAgIGlmKG9sZEhhc2hlciA9PSB1bmRlZmluZWQpIHJldHVybiBBcHBDb25zdGFudHMuUklHSFRcbiAgICAgICAgdmFyIG5ld0lkID0gbmV3SGFzaGVyLnRhcmdldElkXG4gICAgICAgIHZhciBvbGRJZCA9IG9sZEhhc2hlci50YXJnZXRJZFxuICAgICAgICB2YXIgbmV3SW5kZXgsIG9sZEluZGV4O1xuICAgICAgICB2YXIgcGxhbmV0cyA9IEFwcFN0b3JlLnBsYW5ldHMoKVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwbGFuZXQgPSBwbGFuZXRzW2ldXG4gICAgICAgICAgICBpZihwbGFuZXQgPT0gbmV3SWQpIG5ld0luZGV4ID0gaVxuICAgICAgICAgICAgaWYocGxhbmV0ID09IG9sZElkKSBvbGRJbmRleCA9IGlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKG5ld0luZGV4ID4gb2xkSW5kZXgpID8gQXBwQ29uc3RhbnRzLlJJR0hUIDogIEFwcENvbnN0YW50cy5MRUZUXG4gICAgfSxcbiAgICByZXNwb25zaXZlSW1hZ2VXaWR0aDogZnVuY3Rpb24ocmVzcG9uc2l2ZUFycmF5KSB7XG4gICAgICAgIHZhciB3aW5kb3dXID0gKEFwcFN0b3JlLldpbmRvdy53ID09IHVuZGVmaW5lZCkgPyB3aW5kb3cuaW5uZXJXaWR0aCA6IEFwcFN0b3JlLldpbmRvdy53XG4gICAgICAgIC8vIHZhciBzY2FsZSA9ICh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA9PSB1bmRlZmluZWQpID8gMSA6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvXG4gICAgICAgIHZhciBzY2FsZSA9IDFcbiAgICAgICAgcmV0dXJuIFV0aWxzLkNsb3Nlc3QocmVzcG9uc2l2ZUFycmF5LCB3aW5kb3dXICogc2NhbGUpXG4gICAgfSxcbiAgICByZXNwb25zaXZlSW1hZ2VTaXplOiBmdW5jdGlvbihyZXNwb25zaXZlQXJyYXksIGJhc2VXaWR0aCwgYmFzZUhlaWdodCkge1xuICAgICAgICB2YXIgYmFzZVcgPSBiYXNlV2lkdGggfHwgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9XXG4gICAgICAgIHZhciBiYXNlSCA9IGJhc2VIZWlnaHQgfHwgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9IXG4gICAgICAgIHZhciByZXNwb25zaXZlV2lkdGggPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VXaWR0aChyZXNwb25zaXZlQXJyYXkpXG4gICAgICAgIHZhciBzY2FsZSA9IChyZXNwb25zaXZlV2lkdGggLyBiYXNlVykgKiAxXG4gICAgICAgIHZhciByZXNwb25zaXZlSGVpZ2h0ID0gYmFzZUggKiBzY2FsZVxuICAgICAgICByZXR1cm4gWyByZXNwb25zaXZlV2lkdGgsIHJlc3BvbnNpdmVIZWlnaHQgXVxuICAgIH0sXG4gICAgcmVzcG9uc2l2ZVBvc3RlckltYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlc3BvbnNpdmVXID0gQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlV2lkdGgoQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpXG4gICAgICAgIHN3aXRjaChyZXNwb25zaXZlVykge1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRVswXTogcmV0dXJuIFwiTFwiXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFWzFdOiByZXR1cm4gXCJNXCJcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0VbMl06IHJldHVybiBcIlNcIlxuICAgICAgICB9XG4gICAgfSxcbiAgICBwbGFuZXRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEucGxhbmV0c1xuICAgIH0sXG4gICAgZ2V0TmV4dFBsYW5ldDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcbiAgICAgICAgdmFyIG5leHRQbGFuZXRJZDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGxhbmV0ID0gcGxhbmV0c1tpXVxuICAgICAgICAgICAgaWYocGxhbmV0ID09IGlkKSB7XG4gICAgICAgICAgICAgICAgbmV4dFBsYW5ldElkID0gcGxhbmV0c1tpKzFdIFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gKG5leHRQbGFuZXRJZCA9PSB1bmRlZmluZWQpID8gcGxhbmV0c1swXSA6IG5leHRQbGFuZXRJZFxuICAgIH0sXG4gICAgZ2V0UHJldmlvdXNQbGFuZXQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG4gICAgICAgIHZhciBwcmV2aW91c1BsYW5ldElkO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwbGFuZXQgPSBwbGFuZXRzW2ldXG4gICAgICAgICAgICBpZihwbGFuZXQgPT0gaWQpIHtcbiAgICAgICAgICAgICAgICBwcmV2aW91c1BsYW5ldElkID0gcGxhbmV0c1tpLTFdIFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gKHByZXZpb3VzUGxhbmV0SWQgPT0gdW5kZWZpbmVkKSA/IHBsYW5ldHNbcGxhbmV0cy5sZW5ndGgtMV0gOiBwcmV2aW91c1BsYW5ldElkXG4gICAgfSxcbiAgICBlbGVtZW50c09mTmF0dXJlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuZWxlbWVudHNcbiAgICB9LFxuICAgIGFsbEdlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmdlbmRlclxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGFbJ3Byb2R1Y3RzLWRhdGEnXVxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhQnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGEoKVxuICAgICAgICByZXR1cm4gZGF0YVtpZF1cbiAgICB9LFxuICAgIHBhbGV0dGVDb2xvcnNCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gZGF0YVsnY29sb3JzJ11baWRdXG4gICAgfSxcbiAgICBnZXRTcGVjaWZpY1Byb2R1Y3RCeUlkOiBmdW5jdGlvbihwbGFuZXRJZCwgcHJvZHVjdElkKSB7XG4gICAgICAgIHZhciBwbGFuZXRQcm9kdWN0cyA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQocGxhbmV0SWQpXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0UHJvZHVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKHByb2R1Y3RJZCA9PSBwbGFuZXRQcm9kdWN0c1tpXS5pZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwbGFuZXRQcm9kdWN0c1tpXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBXaW5kb3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX3dpbmRvd1dpZHRoSGVpZ2h0KClcbiAgICB9LFxuICAgIGFkZFBYQ2hpbGQ6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgQXBwU3RvcmUuUFhDb250YWluZXIuYWRkKGl0ZW0uY2hpbGQpXG4gICAgfSxcbiAgICByZW1vdmVQWENoaWxkOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIEFwcFN0b3JlLlBYQ29udGFpbmVyLnJlbW92ZShpdGVtLmNoaWxkKVxuICAgIH0sXG4gICAgZ2V0VGltZWxpbmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5nZXRUaW1lbGluZSgpXG4gICAgfSxcbiAgICByZWxlYXNlVGltZWxpbmU6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVRpbWVsaW5lKGl0ZW0pXG4gICAgfSxcbiAgICBnZXRDb250YWluZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5nZXRDb250YWluZXIoKVxuICAgIH0sXG4gICAgcmVsZWFzZUNvbnRhaW5lcjogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlQ29udGFpbmVyKGl0ZW0pXG4gICAgfSxcbiAgICBnZXRHcmFwaGljczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldEdyYXBoaWNzKClcbiAgICB9LFxuICAgIHJlbGVhc2VHcmFwaGljczogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlR3JhcGhpY3MoaXRlbSlcbiAgICB9LFxuICAgIGdldFNwcml0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldFNwcml0ZSgpXG4gICAgfSxcbiAgICByZWxlYXNlU3ByaXRlOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VTcHJpdGUoaXRlbSlcbiAgICB9LFxuICAgIGdldFNwcmluZ0dhcmRlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldFNwcmluZ0dhcmRlbigpXG4gICAgfSxcbiAgICByZWxlYXNlU3ByaW5nR2FyZGVuOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VTcHJpbmdHYXJkZW4oaXRlbSlcbiAgICB9LFxuICAgIERldGVjdG9yOiB7XG4gICAgICAgIGlzTW9iaWxlOiB1bmRlZmluZWRcbiAgICB9LFxuICAgIFBvb2w6IHVuZGVmaW5lZCxcbiAgICBQcmVsb2FkZXI6IHVuZGVmaW5lZCxcbiAgICBNb3VzZTogdW5kZWZpbmVkLFxuICAgIFBYQ29udGFpbmVyOiB1bmRlZmluZWQsXG4gICAgT3JpZW50YXRpb246IEFwcENvbnN0YW50cy5MQU5EU0NBUEUsXG4gICAgZGlzcGF0Y2hlckluZGV4OiBBcHBEaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpe1xuICAgICAgICB2YXIgYWN0aW9uID0gcGF5bG9hZC5hY3Rpb25cbiAgICAgICAgc3dpdGNoKGFjdGlvbi5hY3Rpb25UeXBlKSB7XG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VEOlxuXG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGNhdGNoIHRoZSBpbnRlcm5hbCBoYXNoIGNoYW5nZSBmb3IgdGhlIDMgcGFydHMgcGFnZXMgZXguIC9wbGFuZXQvd29vZC8wXG4gICAgICAgICAgICAgICAgdmFyIG5ld0hhc2hlciA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICAgICAgICAgICAgICB2YXIgb2xkSGFzaGVyID0gUm91dGVyLmdldE9sZEhhc2goKVxuICAgICAgICAgICAgICAgIHZhciBhY3Rpb25UeXBlID0gQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRURcbiAgICAgICAgICAgICAgICBpZihvbGRIYXNoZXIgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmKG5ld0hhc2hlci5wYXJ0cy5sZW5ndGggPT0gMyAmJiBvbGRIYXNoZXIucGFydHMubGVuZ3RoID09IDMgJiYgbmV3SGFzaGVyLnBhcnRzWzFdID09IG9sZEhhc2hlci5wYXJ0c1sxXSkge1xuICAgICAgICAgICAgICAgICAgICBpZihuZXdIYXNoZXIucGFydHMubGVuZ3RoID09IDMgJiYgb2xkSGFzaGVyLnBhcnRzLmxlbmd0aCA9PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25UeXBlID0gQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFOlxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy53ID0gYWN0aW9uLml0ZW0ud2luZG93V1xuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy5oID0gYWN0aW9uLml0ZW0ud2luZG93SFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLk9yaWVudGF0aW9uID0gKEFwcFN0b3JlLldpbmRvdy53ID4gQXBwU3RvcmUuV2luZG93LmgpID8gQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSA6IEFwcENvbnN0YW50cy5QT1JUUkFJVFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9JU19SRUFEWTpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5QWENvbnRhaW5lciA9IGFjdGlvbi5pdGVtXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb24uYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0FERF9DSElMRDpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5hZGRQWENoaWxkKGFjdGlvbi5pdGVtKVxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQ6XG4gICAgICAgICAgICAgICAgQXBwU3RvcmUucmVtb3ZlUFhDaGlsZChhY3Rpb24uaXRlbSlcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5lbWl0Q2hhbmdlKGFjdGlvbi5hY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH0pXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IEFwcFN0b3JlXG5cbiIsImltcG9ydCBpcyBmcm9tICdpcyc7XG5cbmZ1bmN0aW9uIGdldEFsbE1ldGhvZHMob2JqKSB7XG5cdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopXG5cdFx0LmZpbHRlcihrZXkgPT4gaXMuZm4ob2JqW2tleV0pKVxufVxuXG5mdW5jdGlvbiBhdXRvQmluZChvYmopIHtcblx0Ly8gY29uc29sZS5sb2coJ29iaiAtLS0tLScsIG9iailcbiAgXHRnZXRBbGxNZXRob2RzKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG5cdFx0LmZvckVhY2gobXRkID0+IHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKG10ZClcblx0XHRcdG9ialttdGRdID0gb2JqW210ZF0uYmluZChvYmopO1xuXHRcdH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGF1dG9CaW5kOyIsImltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5jbGFzcyBVdGlscyB7XG5cdHN0YXRpYyBOb3JtYWxpemVNb3VzZUNvb3JkcyhlLCBvYmpXcmFwcGVyKSB7XG5cdFx0dmFyIHBvc3ggPSAwO1xuXHRcdHZhciBwb3N5ID0gMDtcblx0XHRpZiAoIWUpIHZhciBlID0gd2luZG93LmV2ZW50O1xuXHRcdGlmIChlLnBhZ2VYIHx8IGUucGFnZVkpIFx0e1xuXHRcdFx0cG9zeCA9IGUucGFnZVg7XG5cdFx0XHRwb3N5ID0gZS5wYWdlWTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoZS5jbGllbnRYIHx8IGUuY2xpZW50WSkgXHR7XG5cdFx0XHRwb3N4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0XG5cdFx0XHRcdCsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XG5cdFx0XHRwb3N5ID0gZS5jbGllbnRZICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3Bcblx0XHRcdFx0KyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuXHRcdH1cblx0XHRvYmpXcmFwcGVyLnggPSBwb3N4XG5cdFx0b2JqV3JhcHBlci55ID0gcG9zeVxuXHRcdHJldHVybiBvYmpXcmFwcGVyXG5cdH1cblx0c3RhdGljIFJlc2l6ZVBvc2l0aW9uUHJvcG9ydGlvbmFsbHkod2luZG93Vywgd2luZG93SCwgY29udGVudFcsIGNvbnRlbnRILCBvcmllbnRhdGlvbikge1xuXHRcdHZhciBhc3BlY3RSYXRpbyA9IGNvbnRlbnRXIC8gY29udGVudEhcblxuXHRcdGlmKG9yaWVudGF0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmKG9yaWVudGF0aW9uID09IEFwcENvbnN0YW50cy5MQU5EU0NBUEUpIHtcblx0XHRcdFx0dmFyIHNjYWxlID0gKHdpbmRvd1cgLyBjb250ZW50VykgKiAxXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dmFyIHNjYWxlID0gKHdpbmRvd0ggLyBjb250ZW50SCkgKiAxXG5cdFx0XHR9XG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgc2NhbGUgPSAoKHdpbmRvd1cgLyB3aW5kb3dIKSA8IGFzcGVjdFJhdGlvKSA/ICh3aW5kb3dIIC8gY29udGVudEgpICogMSA6ICh3aW5kb3dXIC8gY29udGVudFcpICogMVxuXHRcdH1cblxuXHRcdHZhciBuZXdXID0gY29udGVudFcgKiBzY2FsZVxuXHRcdHZhciBuZXdIID0gY29udGVudEggKiBzY2FsZVxuXHRcdHZhciBjc3MgPSB7XG5cdFx0XHR3aWR0aDogbmV3Vyxcblx0XHRcdGhlaWdodDogbmV3SCxcblx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKG5ld1cgPj4gMSksXG5cdFx0XHR0b3A6ICh3aW5kb3dIID4+IDEpIC0gKG5ld0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcih3aW5kb3dXLCB3aW5kb3dILCBjb250ZW50VywgY29udGVudEgpIHtcblx0XHR2YXIgYXNwZWN0UmF0aW8gPSBjb250ZW50VyAvIGNvbnRlbnRIXG5cdFx0dmFyIHNjYWxlID0gKCh3aW5kb3dXIC8gd2luZG93SCkgPCBhc3BlY3RSYXRpbykgPyAod2luZG93SCAvIGNvbnRlbnRIKSAqIDEgOiAod2luZG93VyAvIGNvbnRlbnRXKSAqIDFcblx0XHR2YXIgbmV3VyA9IGNvbnRlbnRXICogc2NhbGVcblx0XHR2YXIgbmV3SCA9IGNvbnRlbnRIICogc2NhbGVcblx0XHR2YXIgY3NzID0ge1xuXHRcdFx0d2lkdGg6IG5ld1csXG5cdFx0XHRoZWlnaHQ6IG5ld0gsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSxcblx0XHRcdHRvcDogKHdpbmRvd0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSYW5kKG1pbiwgbWF4KSB7XG5cdFx0cmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pblxuXHR9XG5cdHN0YXRpYyBEZWdyZWVzVG9SYWRpYW5zKGRlZ3JlZXMpIHtcblx0XHRyZXR1cm4gZGVncmVlcyAqIChNYXRoLlBJIC8gMTgwKVxuXHR9XG4gICAgc3RhdGljIFJhZGlhbnNUb0RlZ3JlZXMocmFkaWFucykge1xuICAgICAgICByZXR1cm4gcmFkaWFucyAqICgxODAgLyBNYXRoLlBJKVxuICAgIH1cbiAgICBzdGF0aWMgTGltaXQodiwgbWluLCBtYXgpIHtcbiAgICBcdHJldHVybiAoTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHYpKSk7XG4gICAgfVxuXHRzdGF0aWMgQ2xvc2VzdChhcnJheSwgbnVtKSB7XG4gICAgICAgIHZhciBpPTA7XG5cdCAgICB2YXIgbWluRGlmZj0yMDAwO1xuXHQgICAgdmFyIGFucztcblx0ICAgIGZvcihpIGluIGFycmF5KXtcblx0XHRcdHZhciBtPU1hdGguYWJzKG51bS1hcnJheVtpXSk7XG5cdFx0XHRpZihtPG1pbkRpZmYpeyBcblx0XHRcdFx0bWluRGlmZj1tOyBcblx0XHRcdFx0YW5zPWFycmF5W2ldOyBcblx0XHRcdH1cblx0XHR9XG5cdCAgICByZXR1cm4gYW5zO1xuICAgIH1cbiAgICBzdGF0aWMgU3R5bGUoZGl2LCBzdHlsZSkge1xuICAgIFx0ZGl2LnN0eWxlLndlYmtpdFRyYW5zZm9ybSA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLm1velRyYW5zZm9ybSAgICA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLm1zVHJhbnNmb3JtICAgICA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLm9UcmFuc2Zvcm0gICAgICA9IHN0eWxlXG5cdFx0ZGl2LnN0eWxlLnRyYW5zZm9ybSAgICAgICA9IHN0eWxlXG4gICAgfVxuICAgIHN0YXRpYyBUcmFuc2xhdGUoZGl2LCB4LCB5LCB6KSB7XG4gICAgXHRVdGlscy5TdHlsZShkaXYsICd0cmFuc2xhdGUzZCgnK3grJ3B4LCcreSsncHgsJyt6KydweCknKVxuICAgIH1cbiAgICBzdGF0aWMgVVVJRCgpIHtcblx0XHRmdW5jdGlvbiBzNCgpIHtcblx0XHRcdHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxuXHRcdFx0XHQudG9TdHJpbmcoMTYpXG5cdFx0XHRcdC5zdWJzdHJpbmcoMSk7XG5cdFx0fVxuXHRcdHJldHVybiBzNCgpICsgczQoKTtcblx0fVxuICAgIHN0YXRpYyBTcHJpbmdUbyhpdGVtLCB0b1gsIHRvWSwgaW5kZXgsIHNwcmluZywgZnJpY3Rpb24sIHNwcmluZ0xlbmd0aCkge1xuICAgIFx0dmFyIGR4ID0gdG9YIC0gaXRlbS54XG4gICAgXHR2YXIgZHkgPSB0b1kgLSBpdGVtLnlcblx0XHR2YXIgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeClcblx0XHR2YXIgdGFyZ2V0WCA9IHRvWCAtIE1hdGguY29zKGFuZ2xlKSAqIChzcHJpbmdMZW5ndGggKiBpbmRleClcblx0XHR2YXIgdGFyZ2V0WSA9IHRvWSAtIE1hdGguc2luKGFuZ2xlKSAqIChzcHJpbmdMZW5ndGggKiBpbmRleClcblx0XHRpdGVtLnZ4ICs9ICh0YXJnZXRYIC0gaXRlbS54KSAqIHNwcmluZ1xuXHRcdGl0ZW0udnkgKz0gKHRhcmdldFkgLSBpdGVtLnkpICogc3ByaW5nXG5cdFx0aXRlbS52eCAqPSBmcmljdGlvblxuXHRcdGl0ZW0udnkgKj0gZnJpY3Rpb25cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFV0aWxzXG4iLCJjbGFzcyBWZWMyIHtcblx0Y29uc3RydWN0b3IoeCwgeSkge1xuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0ZGlzdGFuY2VUbyh2KSB7XG5cdFx0cmV0dXJuIE1hdGguc3FydCggdGhpcy5kaXN0YW5jZVRvU3F1YXJlZCggdiApIClcblx0fVxuXHRkaXN0YW5jZVRvU3F1YXJlZCh2KSB7XG5cdFx0dmFyIGR4ID0gdGhpcy54IC0gdi54LCBkeSA9IHRoaXMueSAtIHYueTtcblx0XHRyZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmVjMlxuIiwiLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cbi8vIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcbiBcbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcbiBcbi8vIE1JVCBsaWNlbnNlXG4gXG4oZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB2YXIgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XG4gICAgZm9yKHZhciB4ID0gMDsgeCA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK3gpIHtcbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ10gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2ZW5kb3JzW3hdKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICB9XG4gXG4gICAgaWYgKCF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2ssIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciBjdXJyVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgdmFyIHRpbWVUb0NhbGwgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyVGltZSAtIGxhc3RUaW1lKSk7XG4gICAgICAgICAgICB2YXIgaWQgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soY3VyclRpbWUgKyB0aW1lVG9DYWxsKTsgfSwgXG4gICAgICAgICAgICAgIHRpbWVUb0NhbGwpO1xuICAgICAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH07XG4gXG4gICAgaWYgKCF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXG4gICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xuICAgICAgICB9O1xufSgpKTsiLCJpbXBvcnQgRmx1eCBmcm9tICdmbHV4J1xuaW1wb3J0IHtFdmVudEVtaXR0ZXIyfSBmcm9tICdldmVudGVtaXR0ZXIyJ1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJ1xuXG4vLyBBY3Rpb25zXG52YXIgUGFnZXJBY3Rpb25zID0ge1xuICAgIG9uUGFnZVJlYWR5OiBmdW5jdGlvbihoYXNoKSB7XG4gICAgICAgIFBhZ2VyRGlzcGF0Y2hlci5oYW5kbGVQYWdlckFjdGlvbih7XG4gICAgICAgIFx0dHlwZTogUGFnZXJDb25zdGFudHMuUEFHRV9JU19SRUFEWSxcbiAgICAgICAgXHRpdGVtOiBoYXNoXG4gICAgICAgIH0pICBcbiAgICB9LFxuICAgIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICBcdFBhZ2VyRGlzcGF0Y2hlci5oYW5kbGVQYWdlckFjdGlvbih7XG4gICAgICAgIFx0dHlwZTogUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURSxcbiAgICAgICAgXHRpdGVtOiB1bmRlZmluZWRcbiAgICAgICAgfSkgIFxuICAgIH0sXG4gICAgcGFnZVRyYW5zaXRpb25EaWRGaW5pc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICBQYWdlckRpc3BhdGNoZXIuaGFuZGxlUGFnZXJBY3Rpb24oe1xuICAgICAgICBcdHR5cGU6IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNILFxuICAgICAgICBcdGl0ZW06IHVuZGVmaW5lZFxuICAgICAgICB9KSAgXG4gICAgfVxufVxuXG4vLyBDb25zdGFudHNcbnZhciBQYWdlckNvbnN0YW50cyA9IHtcblx0UEFHRV9JU19SRUFEWTogJ1BBR0VfSVNfUkVBRFknLFxuXHRQQUdFX1RSQU5TSVRJT05fSU46ICdQQUdFX1RSQU5TSVRJT05fSU4nLFxuXHRQQUdFX1RSQU5TSVRJT05fT1VUOiAnUEFHRV9UUkFOU0lUSU9OX09VVCcsXG5cdFBBR0VfVFJBTlNJVElPTl9PVVRfQ09NUExFVEU6ICdQQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFJyxcblx0UEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTOiAnUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTJyxcblx0UEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0g6ICdQQUdFX1RSQU5TSVRJT05fRElEX0ZJTklTSCcsXG59XG5cbi8vIERpc3BhdGNoZXJcbnZhciBQYWdlckRpc3BhdGNoZXIgPSBhc3NpZ24obmV3IEZsdXguRGlzcGF0Y2hlcigpLCB7XG5cdGhhbmRsZVBhZ2VyQWN0aW9uOiBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHR0aGlzLmRpc3BhdGNoKGFjdGlvbilcblx0fVxufSlcblxuLy8gU3RvcmVcbnZhciBQYWdlclN0b3JlID0gYXNzaWduKHt9LCBFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSwge1xuICAgIGZpcnN0UGFnZVRyYW5zaXRpb246IHRydWUsXG4gICAgcGFnZVRyYW5zaXRpb25TdGF0ZTogdW5kZWZpbmVkLCBcbiAgICBkaXNwYXRjaGVySW5kZXg6IFBhZ2VyRGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKXtcbiAgICAgICAgdmFyIGFjdGlvblR5cGUgPSBwYXlsb2FkLnR5cGVcbiAgICAgICAgdmFyIGl0ZW0gPSBwYXlsb2FkLml0ZW1cbiAgICAgICAgc3dpdGNoKGFjdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgUGFnZXJDb25zdGFudHMuUEFHRV9JU19SRUFEWTpcbiAgICAgICAgICAgIFx0UGFnZXJTdG9yZS5wYWdlVHJhbnNpdGlvblN0YXRlID0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTXG4gICAgICAgICAgICBcdHZhciB0eXBlID0gUGFnZXJTdG9yZS5maXJzdFBhZ2VUcmFuc2l0aW9uID8gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOIDogUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVFxuICAgICAgICAgICAgXHRQYWdlclN0b3JlLmVtaXQodHlwZSlcbiAgICAgICAgICAgIFx0YnJlYWtcbiAgICAgICAgICAgIGNhc2UgUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURTpcbiAgICAgICAgICAgIFx0dmFyIHR5cGUgPSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU5cbiAgICAgICAgICAgIFx0UGFnZXJTdG9yZS5lbWl0KHR5cGUpXG4gICAgICAgICAgICBcdGJyZWFrXG4gICAgICAgICAgICBjYXNlIFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIOlxuICAgICAgICAgICAgXHRpZiAoUGFnZXJTdG9yZS5maXJzdFBhZ2VUcmFuc2l0aW9uKSBQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24gPSBmYWxzZVxuICAgICAgICAgICAgICAgIFBhZ2VyU3RvcmUucGFnZVRyYW5zaXRpb25TdGF0ZSA9IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIXG4gICAgICAgICAgICAgICAgUGFnZXJTdG9yZS5lbWl0KGFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH0pXG59KVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFBhZ2VyU3RvcmU6IFBhZ2VyU3RvcmUsXG5cdFBhZ2VyQWN0aW9uczogUGFnZXJBY3Rpb25zLFxuXHRQYWdlckNvbnN0YW50czogUGFnZXJDb25zdGFudHMsXG5cdFBhZ2VyRGlzcGF0Y2hlcjogUGFnZXJEaXNwYXRjaGVyXG59XG4iLCJpbXBvcnQgYXV0b2JpbmQgZnJvbSAnQXV0b2JpbmQnXG5pbXBvcnQgc2x1ZyBmcm9tICd0by1zbHVnLWNhc2UnXG5cbmNsYXNzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRhdXRvYmluZCh0aGlzKVxuXHRcdHRoaXMuZG9tSXNSZWFkeSA9IGZhbHNlXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuZG9tSXNSZWFkeSA9IHRydWVcblx0fVxuXHRyZW5kZXIoY2hpbGRJZCwgcGFyZW50SWQsIHRlbXBsYXRlLCBvYmplY3QpIHtcblx0XHR0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdFx0dGhpcy5jaGlsZElkID0gY2hpbGRJZFxuXHRcdHRoaXMucGFyZW50SWQgPSBwYXJlbnRJZFxuXHRcdHRoaXMucGFyZW50ID0gKHBhcmVudElkIGluc3RhbmNlb2YgalF1ZXJ5KSA/IHBhcmVudElkIDogJCh0aGlzLnBhcmVudElkKVxuXHRcdHRoaXMuY2hpbGQgPSAodGVtcGxhdGUgPT0gdW5kZWZpbmVkKSA/ICQoJzxkaXY+PC9kaXY+JykgOiAkKHRlbXBsYXRlKG9iamVjdCkpXG5cdFx0aWYodGhpcy5jaGlsZC5hdHRyKCdpZCcpID09IHVuZGVmaW5lZCkgdGhpcy5jaGlsZC5hdHRyKCdpZCcsIHNsdWcoY2hpbGRJZCkpXG5cdFx0dGhpcy5jaGlsZC5yZWFkeSh0aGlzLmNvbXBvbmVudERpZE1vdW50KVxuXG5cdFx0Ly8gc2V0VGltZW91dCgoKT0+e1xuXHRcdC8vIFx0dGhpcy5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0Ly8gfSwgMClcblxuXHRcdHRoaXMucGFyZW50LmFwcGVuZCh0aGlzLmNoaWxkKVxuXHRcdC8vIGNvbnNvbGUubG9nKHRoaXMucGFyZW50LCB0aGlzLmNoaWxkKVxuXHR9XG5cdHJlbW92ZSgpIHtcblx0XHR0aGlzLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmNoaWxkLnJlbW92ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZUNvbXBvbmVudFxuXG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IFRyYW5zaXRpb25BbmltYXRpb25zIGZyb20gJ1RyYW5zaXRpb25BbmltYXRpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCYXNlUGFnZSBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKClcblx0XHR0aGlzLnByb3BzID0gcHJvcHNcblx0XHR0aGlzLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlID0gdGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUgPSB0aGlzLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZS5iaW5kKHRoaXMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5jaGlsZC5hZGRDbGFzcyh0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKSlcblx0XHR0aGlzLnJlc2l6ZSgpXG5cdFx0dGhpcy5zZXR1cEFuaW1hdGlvbnMoKVxuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wcm9wcy5pc1JlYWR5KHRoaXMucHJvcHMuaGFzaCksIDApXG5cdH1cblx0c2V0dXBBbmltYXRpb25zKCkge1xuXHRcdHZhciBrZXlOYW1lID0gdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLWluJ1xuXHRcdC8vIHRoaXMudGxJbiA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLnRsSW4gPSBuZXcgVGltZWxpbmVNYXgoKVxuXHRcdHRoaXMudGxJbi5ldmVudENhbGxiYWNrKCdvbkNvbXBsZXRlJywgdGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSlcblx0XHRUcmFuc2l0aW9uQW5pbWF0aW9uc1trZXlOYW1lXSh0aGlzLCB0aGlzLnRsSW4pXG5cdFx0dGhpcy50bEluLnBhdXNlKDApXG5cdH1cblx0d2lsbFRyYW5zaXRpb25JbigpIHtcblx0XHR0aGlzLnRsSW4ucGxheSgwKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHZhciBrZXlOYW1lID0gdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLW91dCdcblx0XHQvLyB0aGlzLnRsT3V0ID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdHRoaXMudGxPdXQgPSBuZXcgVGltZWxpbmVNYXgoKVxuXHRcdHRoaXMudGxPdXQuZXZlbnRDYWxsYmFjaygnb25Db21wbGV0ZScsIHRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKVxuXHRcdFRyYW5zaXRpb25BbmltYXRpb25zW2tleU5hbWVdKHRoaXMsIHRoaXMudGxPdXQpXG5cdFx0dGhpcy50bE91dC5wbGF5KDApXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0Ly8gY29uc29sZS5sb2coJ2RpZFRyYW5zaXRpb25JbkNvbXBsZXRlJywgdGhpcy5pZCwgdGhpcy5wcm9wcy50eXBlKVxuXHRcdHRoaXMucmVsZWFzZVRpbWVsaW5lSW4oKVxuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wcm9wcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpLCAwKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlJywgdGhpcy5pZCwgdGhpcy5wcm9wcy50eXBlKVxuXHRcdHRoaXMucmVsZWFzZVRpbWVsaW5lT3V0KClcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucHJvcHMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCksIDApXG5cdH1cblx0cmVzaXplKCkge1xuXHR9XG5cdGZvcmNlVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLnRsSW4gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsSW4ucGF1c2UoMClcblx0XHR9XG5cdFx0aWYodGhpcy50bE91dCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxPdXQucGF1c2UoMClcblx0XHR9XG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHJlbGVhc2VUaW1lbGluZUluKCkge1xuXHRcdGlmKHRoaXMudGxJbiAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxJbi5jbGVhcigpXG5cdFx0XHQvLyBBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bEluKVxuXHRcdFx0dGhpcy50bEluID0gbnVsbFxuXHRcdH1cblx0fVxuXHRyZWxlYXNlVGltZWxpbmVPdXQoKSB7XG5cdFx0aWYodGhpcy50bE91dCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxPdXQuY2xlYXIoKVxuXHRcdFx0Ly8gQXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdXQpXG5cdFx0XHR0aGlzLnRsSU91dCA9IG51bGxcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5yZWxlYXNlVGltZWxpbmVJbigpXG5cdFx0dGhpcy5yZWxlYXNlVGltZWxpbmVPdXQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IHtQYWdlclN0b3JlLCBQYWdlckFjdGlvbnMsIFBhZ2VyQ29uc3RhbnRzLCBQYWdlckRpc3BhdGNoZXJ9IGZyb20gJ1BhZ2VyJ1xuaW1wb3J0IF9jYXBpdGFsaXplIGZyb20gJ2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICdQYWdlc0NvbnRhaW5lcl9oYnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmNsYXNzIEJhc2VQYWdlciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5jdXJyZW50UGFnZURpdlJlZiA9ICdwYWdlLWInXG5cdFx0dGhpcy53aWxsUGFnZVRyYW5zaXRpb25JbiA9IHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uSW4uYmluZCh0aGlzKVxuXHRcdHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0ID0gdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlID0gdGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSA9IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5jb21wb25lbnRzID0ge1xuXHRcdFx0J25ldy1jb21wb25lbnQnOiB1bmRlZmluZWQsXG5cdFx0XHQnb2xkLWNvbXBvbmVudCc6IHVuZGVmaW5lZFxuXHRcdH1cblx0fVxuXHRyZW5kZXIocGFyZW50KSB7XG5cdFx0c3VwZXIucmVuZGVyKCdCYXNlUGFnZXInLCBwYXJlbnQsIHRlbXBsYXRlLCB1bmRlZmluZWQpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdFBhZ2VyU3RvcmUub24oUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOLCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluKVxuXHRcdFBhZ2VyU3RvcmUub24oUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVCwgdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHR3aWxsUGFnZVRyYW5zaXRpb25JbigpIHtcblx0XHRpZihQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24pIHtcblx0XHRcdHRoaXMuc3dpdGNoUGFnZXNEaXZJbmRleCgpXG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXS53aWxsVHJhbnNpdGlvbkluKClcblx0XHR9XG5cdH1cblx0d2lsbFBhZ2VUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHRoaXMuY29tcG9uZW50c1snb2xkLWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uT3V0KClcblx0XHR0aGlzLnN3aXRjaFBhZ2VzRGl2SW5kZXgoKVxuXHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uSW4oKVxuXHR9XG5cdGRpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlJylcblx0XHRQYWdlckFjdGlvbnMucGFnZVRyYW5zaXRpb25EaWRGaW5pc2goKVxuXHRcdHRoaXMudW5tb3VudENvbXBvbmVudCgnb2xkLWNvbXBvbmVudCcpXG5cdH1cblx0ZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZScpXG5cdFx0UGFnZXJBY3Rpb25zLm9uVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRzd2l0Y2hQYWdlc0RpdkluZGV4KCkge1xuXHRcdHZhciBuZXdDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHRcdHZhciBvbGRDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXVxuXHRcdGlmKG5ld0NvbXBvbmVudCAhPSB1bmRlZmluZWQpIG5ld0NvbXBvbmVudC5jaGlsZC5jc3MoJ3otaW5kZXgnLCAyKVxuXHRcdGlmKG9sZENvbXBvbmVudCAhPSB1bmRlZmluZWQpIG9sZENvbXBvbmVudC5jaGlsZC5jc3MoJ3otaW5kZXgnLCAxKVxuXHR9XG5cdHNldHVwTmV3Q29tcG9uZW50KGhhc2gsIHRlbXBsYXRlKSB7XG5cdFx0dmFyIGlkID0gX2NhcGl0YWxpemUoaGFzaC5yZXBsYWNlKFwiL1wiLCBcIlwiKSlcblx0XHR0aGlzLm9sZFBhZ2VEaXZSZWYgPSB0aGlzLmN1cnJlbnRQYWdlRGl2UmVmXG5cdFx0dGhpcy5jdXJyZW50UGFnZURpdlJlZiA9ICh0aGlzLmN1cnJlbnRQYWdlRGl2UmVmID09PSAncGFnZS1hJykgPyAncGFnZS1iJyA6ICdwYWdlLWEnXG5cdFx0dmFyIGVsID0gdGhpcy5jaGlsZC5maW5kKCcjJyt0aGlzLmN1cnJlbnRQYWdlRGl2UmVmKVxuXHRcdHZhciBwcm9wcyA9IHtcblx0XHRcdGlkOiB0aGlzLmN1cnJlbnRQYWdlRGl2UmVmLFxuXHRcdFx0aXNSZWFkeTogdGhpcy5vblBhZ2VSZWFkeSxcblx0XHRcdHR5cGU6IEFwcFN0b3JlLmdldFR5cGVPZlBhZ2UoKSxcblx0XHRcdGhhc2g6IGhhc2gsXG5cdFx0XHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZTogdGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUsXG5cdFx0XHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGU6IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSxcblx0XHRcdGRhdGE6IEFwcFN0b3JlLnBhZ2VDb250ZW50KClcblx0XHR9XG5cdFx0dmFyIHBhZ2UgPSBuZXcgdGVtcGxhdGUudHlwZShwcm9wcylcblx0XHRwYWdlLmlkID0gQXBwU3RvcmUuZ2V0UGFnZUlkKClcblx0XHRwYWdlLnJlbmRlcihpZCwgZWwsIHRlbXBsYXRlLnBhcnRpYWwsIHByb3BzLmRhdGEpXG5cdFx0dGhpcy5jb21wb25lbnRzWydvbGQtY29tcG9uZW50J10gPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddID0gcGFnZVxuXHRcdGlmKFBhZ2VyU3RvcmUucGFnZVRyYW5zaXRpb25TdGF0ZSA9PT0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTKSB7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXS5mb3JjZVVubW91bnQoKVxuXHRcdH1cblx0fVxuXHRvblBhZ2VSZWFkeShoYXNoKSB7XG5cdFx0UGFnZXJBY3Rpb25zLm9uUGFnZVJlYWR5KGhhc2gpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVubW91bnRDb21wb25lbnQocmVmKSB7XG5cdFx0aWYodGhpcy5jb21wb25lbnRzW3JlZl0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5jb21wb25lbnRzW3JlZl0ucmVtb3ZlKClcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0UGFnZXJTdG9yZS5vZmYoUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOLCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluKVxuXHRcdFBhZ2VyU3RvcmUub2ZmKFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9PVVQsIHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0KVxuXHRcdHRoaXMudW5tb3VudENvbXBvbmVudCgnb2xkLWNvbXBvbmVudCcpXG5cdFx0dGhpcy51bm1vdW50Q29tcG9uZW50KCduZXctY29tcG9uZW50Jylcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZVBhZ2VyXG5cbiIsIm1vZHVsZS5leHBvcnRzPXtcblx0XCJpbmZvc1wiOiB7XG5cdFx0XCJ0d2l0dGVyX3VybFwiOiBcImh0dHBzOi8vdHdpdHRlci5jb20vY2FtcGVyXCIsXG5cdFx0XCJmYWNlYm9va191cmxcIjogXCJodHRwczovL3d3dy5mYWNlYm9vay5jb20vQ2FtcGVyXCIsXG5cdFx0XCJpbnN0YWdyYW1fdXJsXCI6IFwiaHR0cHM6Ly9pbnN0YWdyYW0uY29tL2NhbXBlci9cIixcblx0XHRcImxhYl91cmxcIjogXCJodHRwOi8vd3d3LmNhbXBlci5jb20vbGFiXCIsXG5cdFx0XCJsYW5nXCI6IHtcblx0XHRcdFwiZW5cIjoge1xuXHRcdFx0XHRcImNhbXBlcl9sYWJcIjogXCJDYW1wZXIgTGFiXCIsXG5cdFx0XHRcdFwic2hvcF90aXRsZVwiOiBcIlNob3BcIixcblx0XHRcdFx0XCJzaG9wX21lblwiOiBcIk1lblwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5cIjogXCJXb21lblwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcIlBsYW5ldFwiLFxuXHRcdFx0XHRcImJ1eV90aXRsZVwiOiBcIkJ1eVwiLFxuXHRcdFx0XHRcImNhbXBhaWduX3RpdGxlXCI6IFwiU2VlIGNhbXBhaWduXCIsXG5cdFx0XHRcdFwibGVnYWxcIjogXCJMZWdhbFwiLFxuXHRcdFx0XHRcImhvbWVfdHh0XCI6IFwiSE9NRVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJmclwiOiB7XG5cdFx0XHRcdFwiY2FtcGVyX2xhYlwiOiBcIkNhbXBlciBMYWJcIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwiQWNoZXRlclwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwiaG9tbWVcIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwiZmVtbWVcIixcblx0XHRcdFx0XCJwbGFuZXRcIjogXCJQbGFuw6h0ZVwiLFxuXHRcdFx0XHRcImJ1eV90aXRsZVwiOiBcIkFjaGV0ZXJcIixcblx0XHRcdFx0XCJjYW1wYWlnbl90aXRsZVwiOiBcIlZvaXIgbGEgY2FtcGFnbmVcIixcblx0XHRcdFx0XCJsZWdhbFwiOiBcIkzDqWdhbFwiLFxuXHRcdFx0XHRcImhvbWVfdHh0XCI6IFwiSE9NRVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJlc1wiOiB7XG5cdFx0XHRcdFwiY2FtcGVyX2xhYlwiOiBcIkNhbXBlciBMYWJcIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwiQ29tcHJhclwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwiaG9tYnJlXCIsXG5cdFx0XHRcdFwic2hvcF93b21lblwiOiBcIm11amVyXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwiUGxhbmV0YVwiLFxuXHRcdFx0XHRcImJ1eV90aXRsZVwiOiBcIkNvbXByYXJcIixcblx0XHRcdFx0XCJjYW1wYWlnbl90aXRsZVwiOiBcIlZlciBjYW1wYcOxYVwiLFxuXHRcdFx0XHRcImxlZ2FsXCI6IFwiSW5mb3JtYWNpw7NuIGxlZ2FsXCIsXG5cdFx0XHRcdFwiaG9tZV90eHRcIjogXCJIT01FXCJcblx0XHRcdH0sXG5cdFx0XHRcIml0XCI6IHtcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiQ2FtcGVyIExhYlwiLFxuXHRcdFx0XHRcInNob3BfdGl0bGVcIjogXCJBY3F1aXN0aVwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwidW9tb1wiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5cIjogXCJkb25uYVwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcIlBpYW5ldGFcIixcblx0XHRcdFx0XCJidXlfdGl0bGVcIjogXCJBY3F1aXN0YVwiLFxuXHRcdFx0XHRcImNhbXBhaWduX3RpdGxlXCI6IFwiR3VhcmRhIGxhIGNhbXBhZ25hXCIsXG5cdFx0XHRcdFwibGVnYWxcIjogXCJMZWdhbGVcIixcblx0XHRcdFx0XCJob21lX3R4dFwiOiBcIkhPTUVcIlxuXHRcdFx0fSxcblx0XHRcdFwiZGVcIjoge1xuXHRcdFx0XHRcImNhbXBlcl9sYWJcIjogXCJDYW1wZXIgTGFiXCIsXG5cdFx0XHRcdFwic2hvcF90aXRsZVwiOiBcIlNob3BcIixcblx0XHRcdFx0XCJzaG9wX21lblwiOiBcIkhlcnJlblwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5cIjogXCJEYW1lblwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcIlBsYW5ldFwiLFxuXHRcdFx0XHRcImJ1eV90aXRsZVwiOiBcIkthdWZlblwiLFxuXHRcdFx0XHRcImNhbXBhaWduX3RpdGxlXCI6IFwiS2FtcGFnbmUgYW5zZWhlblwiLFxuXHRcdFx0XHRcImxlZ2FsXCI6IFwiSW1wcmVzc3VtXCIsXG5cdFx0XHRcdFwiaG9tZV90eHRcIjogXCJIT01FXCJcblx0XHRcdH0sXG5cdFx0XHRcInB0XCI6IHtcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiQ2FtcGVyIExhYlwiLFxuXHRcdFx0XHRcInNob3BfdGl0bGVcIjogXCJDb21wcmVcIixcblx0XHRcdFx0XCJzaG9wX21lblwiOiBcImhvbWVtXCIsXG5cdFx0XHRcdFwic2hvcF93b21lblwiOiBcIm11bGhlclwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcIlBsYW5ldGFcIixcblx0XHRcdFx0XCJidXlfdGl0bGVcIjogXCJDb21wcmFyXCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJWZXIgY2FtcGFuaGFcIixcblx0XHRcdFx0XCJsZWdhbFwiOiBcIkxlZ2FsXCIsXG5cdFx0XHRcdFwiaG9tZV90eHRcIjogXCJIT01FXCJcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0XCJwbGFuZXRzXCI6IFtcInNraVwiLCBcIm1ldGFsXCIsIFwiYWxhc2thXCIsIFwid29vZFwiLCBcImdlbXN0b25lXCJdLFxuXHRcImVsZW1lbnRzXCI6IFtcImZpcmVcIiwgXCJlYXJ0aFwiLCBcIm1ldGFsXCIsIFwid2F0ZXJcIiwgXCJ3b29kXCJdLFxuXHRcImdlbmRlclwiOiBbXCJtYWxlXCIsIFwiZmVtYWxlXCIsIFwiYW5pbWFsXCJdLFxuXG5cdFwiY29sb3JzXCI6IHtcblx0XHRcInNraVwiOiBbXCIweDYxODFhYVwiLCBcIjB4YzNkOWYxXCJdLFxuXHRcdFwibWV0YWxcIjogW1wiMHgwZDBkMGZcIiwgXCIweDU5NTk1OVwiXSxcblx0XHRcImFsYXNrYVwiOiBbXCIweGI3Y2FkYlwiLCBcIjB4NmY4Njk4XCJdLFxuXHRcdFwid29vZFwiOiBbXCIweDUwMjAxNlwiLCBcIjB4YzU4NTQ3XCJdLFxuXHRcdFwiZ2Vtc3RvbmVcIjogW1wiMHgzNjM4NjRcIiwgXCIweDQ3N2U5NFwiXVxuXHR9LFxuXG5cdFwicHJvZHVjdHMtZGF0YVwiOiB7XG5cdFx0XCJza2lcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkZJU1NcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4MzQzYTVjXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJtenM1eWMzaTV4XCIsXG5cdFx0XHRcdFwicHJvZHVjdC11cmxcIjogXCIvbWVuL3Nob2VzL2Zpc3MvY2FtcGVyLWZpc3MtSzEwMDAyMS0wMDJcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJuYW1lXCI6IFwiRklTU1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHgzNDNhNWNcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcIm16czV5YzNpNXhcIixcblx0XHRcdFx0XCJwcm9kdWN0LXVybFwiOiBcIi9tZW4vc2hvZXMvZmlzcy9jYW1wZXItZmlzcy1LMTAwMDIxLTAwMVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4yLCBcInlcIjowLjV9LFxuXHRcdFx0XHRcdHtcInhcIjowLjAsIFwieVwiOjAuM30sXG5cdFx0XHRcdFx0e1wieFwiOjAuMSwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAyLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGNmZjBmY1wiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiMGwxZHN3eXI0eFwiLFxuXHRcdFx0XHRcInByb2R1Y3QtdXJsXCI6IFwiL21lbi9zaG9lcy9maXNzL2NhbXBlci1maXNzLUszMDAwMjMtMDAyXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAzLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGU3ZTMzY1wiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiY3dqMDRhM3o1NVwiLFxuXHRcdFx0XHRcInByb2R1Y3QtdXJsXCI6IFwiL3dvbWVuL3Nob2VzL2Zpc3MvY2FtcGVyLWZpc3MtSzQwMDAyOS0wMDNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMSwgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuM30sXG5cdFx0XHRcdFx0e1wieFwiOjAuNSwgXCJ5XCI6LTAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogNCxcblx0XHRcdFx0XCJuYW1lXCI6IFwiRklTU1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhkYjMwNzZcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcIjhmYnAwcGJ3dzhcIixcblx0XHRcdFx0XCJwcm9kdWN0LXVybFwiOiBcIi93b21lbi9zaG9lcy9maXNzL2NhbXBlci1maXNzLUs0MDAwMjktMDAxXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDUsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkZJU1NcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4ZGIzMDc2XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCI4ZmJwMHBid3c4XCIsXG5cdFx0XHRcdFwicHJvZHVjdC11cmxcIjogXCIvd29tZW4vc2hvZXMvZmlzcy9jYW1wZXItZmlzcy1LNDAwMDMxLTAwM1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4wLCBcInlcIjotMC44fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC4yLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMSwgXCJ5XCI6LTAuMX1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogNixcblx0XHRcdFx0XCJuYW1lXCI6IFwiRklTU1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhmNGVjZGFcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcIjhmYnAwcGJ3dzhcIixcblx0XHRcdFx0XCJwcm9kdWN0LXVybFwiOiBcIi93b21lbi9zaG9lcy9sYWlrYS9jYW1wZXItbGFpa2EtSzQwMDAzNS0wMDFcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjEsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjIsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6MC41fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XSxcblx0XHRcIm1ldGFsXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJCRUxVR0FcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4ODE4MTgxXCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJnc3VuN2FtenE4XCIsXG5cdFx0XHRcdFwicHJvZHVjdC11cmxcIjogXCIvd29tZW4vc2hvZXMvYmVsdWdhL2NhbXBlci1iZWx1Z2EtSzQwMDAxNC0wMDFcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJuYW1lXCI6IFwiQkVMVUdBXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDgxODE4MVwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiZ3N1bjdhbXpxOFwiLFxuXHRcdFx0XHRcInByb2R1Y3QtdXJsXCI6IFwiL21lbi9zaG9lcy9iZWx1Z2EvY2FtcGVyLWJlbHVnYS1LMzAwMDA4LTAwMlwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4xLCBcInlcIjotMC43fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMSwgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNCwgXCJ5XCI6MH1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMixcblx0XHRcdFx0XCJuYW1lXCI6IFwiSEFSRFdPT0RcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4ZTgyYjE4XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJmZXZuc2Jzajg0XCIsXG5cdFx0XHRcdFwicHJvZHVjdC11cmxcIjogXCIvbWVuL3Nob2VzL2hhcmR3b29kL2NhbXBlci1oYXJkd29vZC1LMzAwMDI5LTAwMVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF0sXG5cdFx0XCJhbGFza2FcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwibmFtZVwiOiBcImdlbW1hXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGI2OTM3ZFwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwibGpydDYxaWNoYVwiLFxuXHRcdFx0XHRcInByb2R1Y3QtdXJsXCI6IFwiL3dvbWVuL3Nob2VzL2dlbW1hL2NhbXBlci1nZW1tYS1LNDAwMDMzLTAwMlwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMiwgXCJ5XCI6MC4zfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJnZW1tYVwiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhiNjkzN2RcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcImxqcnQ2MWljaGFcIixcblx0XHRcdFx0XCJwcm9kdWN0LXVybFwiOiBcIi93b21lbi9zaG9lcy9nZW1tYS9jYW1wZXItZ2VtbWEtSzQwMDAzMy0wMDJcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjIsIFwieVwiOi0wLjN9LFxuXHRcdFx0XHRcdHtcInhcIjowLjEsIFwieVwiOi0wLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOi0wLjF9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDIsXG5cdFx0XHRcdFwibmFtZVwiOiBcInBlbG90YXNcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4Yzk4ZTk0XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCJuMGtzdXkwd3VhXCIsXG5cdFx0XHRcdFwicHJvZHVjdC11cmxcIjogXCIvd29tZW4vc2hvZXMvcGVsb3Rhcy9jYW1wZXItcGVsb3Rhcy1LMjAwMDM4LTAwMVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMyxcblx0XHRcdFx0XCJuYW1lXCI6IFwiRU5EVVJPXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDYxNmE3MVwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiOHhwbnB5bnF1cFwiLFxuXHRcdFx0XHRcInByb2R1Y3QtdXJsXCI6IFwiL21lbi9zaG9lcy9lbmR1cm8vY2FtcGVyLWVuZHVyby1LMzAwMDIwLTAwMlwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDQsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkVORFVST1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHgwZTJlNjFcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcIm01MDlwMGl1NHVcIixcblx0XHRcdFx0XCJwcm9kdWN0LXVybFwiOiBcIi93b21lbi9zaG9lcy9lbmR1cm8vY2FtcGVyLWVuZHVyby1LNDAwMDI1LTAwMVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjF9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwid29vZFwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJuYW1lXCI6IFwiVklOVEFSXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGQ3OWI3YVwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwiZ2xkcnYyN2s3NlwiLFxuXHRcdFx0XHRcInByb2R1Y3QtdXJsXCI6IFwiL21lbi9zaG9lcy92aW50YXIvY2FtcGVyLXZpbnRhci1LMzAwMDQ4LTAwMVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJCRUxVR0FcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4ODhhMmM3XCIsXG5cdFx0XHRcdFwidmlkZW8taWRcIjogXCIxbWV2cnh6N3Y2XCIsXG5cdFx0XHRcdFwicHJvZHVjdC11cmxcIjogXCIvd29tZW4vc2hvZXMvYmVsdWdhL2NhbXBlci1iZWx1Z2EtSzQwMDAxNS0wMDFcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjMsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwiZ2Vtc3RvbmVcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkVORFVST1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHgyODkyYzFcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcIjlxYmhocGI4OWJcIixcblx0XHRcdFx0XCJwcm9kdWN0LXVybFwiOiBcIi9tZW4vc2hvZXMvZW5kdXJvL2NhbXBlci1lbmR1cm8tSzMwMDAyMC0wMDFcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjIsIFwieVwiOjAuM30sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJuYW1lXCI6IFwiRU5EVVJPXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDYyYThiYlwiLFxuXHRcdFx0XHRcInZpZGVvLWlkXCI6IFwicG5yODFyaTJ4b1wiLFxuXHRcdFx0XHRcInByb2R1Y3QtdXJsXCI6IFwiL3dvbWVuL3Nob2VzL2VuZHVyby9jYW1wZXItZW5kdXJvLUs0MDAwMjUtMDAyXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAyLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJnZW1tYVwiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHgwOTBiMzZcIixcblx0XHRcdFx0XCJ2aWRlby1pZFwiOiBcImNrZ3d6ZDNucHVcIixcblx0XHRcdFx0XCJwcm9kdWN0LXVybFwiOiBcIi93b21lbi9zaG9lcy9nZW1tYS9jYW1wZXItZ2VtbWEtSzIwMDA0Ni0wMDFcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjN9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC40fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXG5cdFwibGFuZ1wiOiB7XG5cdFx0XCJlblwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJmclwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGZyXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGZyXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImVzXCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgZXNcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgZXNcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiaXRcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBpdFwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBpdFwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJkZVwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGdlXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGdlXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcInB0XCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgcHRcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgcHRcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0XCJkZWZhdWx0LXJvdXRlXCI6IFwiL2xhbmRpbmdcIixcblxuXHRcInJvdXRpbmdcIjoge1xuXHRcdFwiL2xhbmRpbmdcIjoge1xuXHRcdFx0XCJpZFwiOiBcImxhbmRpbmdcIlxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L3NraVwiOiB7XG5cdFx0XHRcImlkXCI6IFwic2tpXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvbWV0YWxcIjoge1xuXHRcdFx0XCJpZFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvYWxhc2thXCI6IHtcblx0XHRcdFwiaWRcIjogXCJhbGFza2FcIixcblx0XHRcdFwiZXhwZXJpZW5jZS1hc3NldHNcIjogW1xuXHRcdFx0XSxcblx0XHRcdFwiY2FtcGFpZ24tYXNzZXRzXCI6IFtcblx0XHRcdF1cblx0XHR9LFxuXHRcdFwiL3BsYW5ldC93b29kXCI6IHtcblx0XHRcdFwiaWRcIjogXCJ3b29kXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XCJpZFwiOiBcImdlbXN0b25lXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRdXG5cdFx0fVxuXHR9XG59Il19
