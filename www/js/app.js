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

var _Preloader = require('./app/services/Preloader');

var _Preloader2 = _interopRequireDefault(_Preloader);

if (!window.console) console = { log: function log() {} };

window.Preloader = new _Preloader2['default']();
window.jQuery = window.$ = _jquery2['default'];

// Start App
var app = new _App2['default']();
app.init();

},{"./app/App":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/App.js","./app/services/Preloader":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Preloader.js","./app/utils/raf":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/raf.js","gsap":"gsap","jquery":"jquery","pixi.js":"pixi.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/App.js":[function(require,module,exports){
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

var App = (function () {
	function App() {
		_classCallCheck(this, App);
	}

	_createClass(App, [{
		key: 'init',
		value: function init() {

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

},{"./AppTemplate":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/AppTemplate.js","./actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./services/GlobalEvents":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/GlobalEvents.js","./services/Pool":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Pool.js","./services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/AppTemplate.js":[function(require,module,exports){
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
            Preloader.load(manifest, function () {
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../dispatchers/AppDispatcher":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/dispatchers/AppDispatcher.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js":[function(require,module,exports){
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
			this.experience.componentWillUnmount();
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

var _ExplosionEffect = require('./ExplosionEffect');

var _ExplosionEffect2 = _interopRequireDefault(_ExplosionEffect);

var _SpringGarden = require('./SpringGarden');

var _SpringGarden2 = _interopRequireDefault(_SpringGarden);

var _CompassRings = require('./CompassRings');

var _CompassRings2 = _interopRequireDefault(_CompassRings);

var Compass = (function () {
	function Compass(pxContainer) {
		_classCallCheck(this, Compass);

		this.pxContainer = pxContainer;
	}

	_createClass(Compass, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this = this;

			this.container = new PIXI.Container();
			this.pxContainer.addChild(this.container);

			var imgUrl = 'image/compass.png';
			var texture = PIXI.Texture.fromImage(imgUrl);
			this.sprite = new PIXI.Sprite(texture);
			this.spriteSize = [997, 1019];
			this.sprite.originalW = this.spriteSize[0];
			this.sprite.originalH = this.spriteSize[1];
			// this.sprite.anchor.set(0.5, 0.5)
			// this.container.addChild(this.sprite)
			var scale = 0.5;
			this.sprite.width = this.sprite.originalW * scale;
			this.sprite.height = this.sprite.originalH * scale;

			this.rings = new _CompassRings2['default'](this.container);
			this.rings.componentDidMount();

			var skiData = _AppStore2['default'].productsDataById('ski');
			var planets = _AppStore2['default'].planets();

			this.planets = [];
			for (var i = 0; i < planets.length; i++) {
				var p = {};
				var planetId = planets[i];
				var planetData = _AppStore2['default'].productsDataById(planetId);
				p.products = [];
				for (var j = 0; j < planetData.length; j++) {
					var product = planetData[j];
					var springGarden = new _SpringGarden2['default'](this.container, product.knots, product.color);
					springGarden.componentDidMount();
					p.products[j] = springGarden;
				};
				p.id = planetId;
				this.planets[i] = p;
			}

			// var products = skiData
			// for (var i = 0; i < products.length; i++) {
			// 	var product = products[i]
			// 	var springGarden = new SpringGarden(this.container, product.knots, product.color)
			// 	springGarden.componentDidMount()
			// 	this.productSpringGardens[i] = springGarden
			// }

			setTimeout(function () {
				_this.highlightPlanet('alaska');
			}, 1000);

			// 	this.explosionConfig = {
			//     animation: 0,
			//     wave: 0.1,
			//     shake: 0.0,
			//     screenEffect: 0.4,
			//     sprite: this.sprite,
			//     shoot: ()=> {
			//         TweenMax.fromTo(this.explosionConfig, 4, {animation: 0}, {animation: 1, ease:Expo.easeOut});
			//     },
			//     hoverAnimation: 0
			// }
			// 	this.explosionEffect = new ExplosionEffect(this.explosionConfig)
			// 	this.explosionEffect.componentDidMount()

			// setInterval(()=>{
			// 	this.explosionConfig.shoot()
			// }, 4000)
		}
	}, {
		key: 'highlightPlanet',
		value: function highlightPlanet(id) {
			for (var i = 0; i < this.planets.length; i++) {
				var planet = this.planets[i];
				var len = planet.products.length;
				if (planet.id == id) {

					for (var j = 0; j < len; j++) {
						var garden = planet.products[j];
						garden.open();
					}
				} else {

					for (var j = 0; j < len; j++) {
						var garden = planet.products[j];
						garden.close();
					}
				}
			}
		}
	}, {
		key: 'update',
		value: function update() {
			// this.explosionEffect.update()
			for (var i = 0; i < this.planets.length; i++) {
				var planet = this.planets[i];
				var len = planet.products.length;
				for (var j = 0; j < len; j++) {
					var garden = planet.products[j];
					garden.update();
				}
			}
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var sizePercentage = 0.3;
			// var radius = (AppStore.Orientation == AppConstants.LANDSCAPE) ? (windowW * sizePercentage) : (windowH * sizePercentage)
			// this.explosionEffect.resize()
			var radius = windowH * sizePercentage;
			this.rings.resize(radius);

			for (var i = 0; i < this.planets.length; i++) {
				var planet = this.planets[i];
				var len = planet.products.length;
				for (var j = 0; j < len; j++) {
					var garden = planet.products[j];
					garden.resize(radius);
				}
			}

			this.container.x = windowW >> 1;
			this.container.y = windowH >> 1;

			// this.sprite.x = (windowW >> 1) - (this.sprite.width >> 1)
			// this.sprite.y = (windowH >> 1) - (this.sprite.height >> 1)
			// this.sprite.x = (windowW >> 1)
			// this.sprite.y = (windowH >> 1)
		}
	}]);

	return Compass;
})();

exports['default'] = Compass;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./CompassRings":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassRings.js","./ExplosionEffect":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ExplosionEffect.js","./SpringGarden":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SpringGarden.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassRings.js":[function(require,module,exports){
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
			this.ringsContainer = new PIXI.Container();
			this.titlesContainer = new PIXI.Container();
			this.genderContainer = new PIXI.Container();
			this.container.addChild(this.ringsContainer);
			this.container.addChild(this.titlesContainer);
			this.container.addChild(this.genderContainer);

			this.circles = [];
			var ciclesLen = 6;
			for (var i = 0; i < ciclesLen; i++) {
				var g = new PIXI.Graphics();
				this.circles.push(g);
				this.ringsContainer.addChild(g);
			}

			this.titles = [];
			this.genders = [];
			var globalContent = _AppStore2['default'].globalContent();
			var elements = _AppStore2['default'].elementsOfNature();
			var allGender = _AppStore2['default'].allGender();
			var elementsTexts = globalContent.elements;
			var genderTexts = globalContent.gender;
			var fontSize = 30;

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

			for (var i = 0; i < allGender.length; i++) {
				var genderId = allGender[i];
				var genderTitle = genderTexts[genderId].toUpperCase();
				var txt = new PIXI.Text(genderTitle, { font: fontSize + 'px FuturaBold', fill: 'white', align: 'center' });
				txt.anchor.x = 0.5;
				txt.anchor.y = 0.5;
				this.genderContainer.addChild(txt);
				this.genders.push({
					txt: txt,
					degBegin: this.getDegreesBeginForGenderById(genderId)
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
		key: 'getDegreesBeginForGenderById',
		value: function getDegreesBeginForGenderById(id) {
			// be careful starts from center -90deg
			switch (id) {
				case 'male':
					return -150;
				case 'female':
					return -30;
				case 'animal':
					return 90;
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
				if (i == 1) r = radiusMargin * 0.18;else if (i == 4) r = (lastR + radiusMargin) * 1.16;else r = lastR + radiusMargin;

				// lines
				if (i == 3) {
					this.drawAroundThreeGroupLines(lastR, r, g, lineW, color);
					this.drawGenders(r, color);
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
			var r = r + 44;
			for (var i = 0; i < titles.length; i++) {
				var title = titles[i];
				var angle = _Utils2['default'].DegreesToRadians(title.degBegin);
				title.txt.rotation = angle + _Utils2['default'].DegreesToRadians(90);
				title.txt.x = r * Math.cos(angle);
				title.txt.y = r * Math.sin(angle);
			}
		}
	}, {
		key: 'drawGenders',
		value: function drawGenders(r, color) {
			var genders = this.genders;
			var r = r + 34;
			for (var i = 0; i < genders.length; i++) {
				var gender = genders[i];
				var angle = _Utils2['default'].DegreesToRadians(gender.degBegin);
				gender.txt.rotation = angle + _Utils2['default'].DegreesToRadians(90);
				gender.txt.x = r * Math.cos(angle);
				gender.txt.y = r * Math.sin(angle);
			}
		}
	}, {
		key: 'resize',
		value: function resize(radius) {
			var windowH = _AppStore2['default'].Window.h;
			this.radius = radius;
			this.drawRings();
		}
	}]);

	return CompassRings;
})();

exports['default'] = CompassRings;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ExplosionEffect.js":[function(require,module,exports){
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



var ExplosionEffect = (function () {
	function ExplosionEffect(config) {
		_classCallCheck(this, ExplosionEffect);

		this.config = config;
		this.sprite = this.config.sprite;
		this.spriteScale = 0;
	}

	_createClass(ExplosionEffect, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var explosionFrag = "#define GLSLIFY 1\nprecision mediump float;\n\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform sampler2D uSampler;\nuniform sampler2D uOverlay;\n\nuniform float uScreenEffect;\nuniform float uAnimation;\nuniform float alpha;\nuniform float uTime;\nuniform float uWave;\nuniform float uShake;\n\n#define PI 3.1415926535\n\nfloat rand(vec2 co){\n    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\n\n/**\n * Overlay shader by @Jam3\n * https://github.com/Jam3/glsl-blend-overlay\n **/\nvec3 blendOverlay(vec3 base, vec3 blend) {\n    return mix(1.0 - 2.0 * (1.0 - base) * (1.0 - blend), 2.0 * base * blend, step(base, vec3(0.5)));\n}\n\nvoid main(void) {\n\n    float shootRatio = sin(pow(uAnimation, 2.1) * PI);\n\n    vec2 gunPoint = vec2(0.5, 0.5);\n\n    vec2 coord = vTextureCoord - gunPoint;\n\n    coord += vec2(\n        rand(vec2(0.1, uTime)),\n        rand(vec2(0.2, uTime))\n    ) * uShake * 0.2 * (1.0 - uAnimation) * step(0.1, uAnimation);\n\n    float d = length(coord);\n    float a = atan(coord.y, coord.x);\n\n    float delta = sin((d + (1.0 - uAnimation)) * 30.0) * uWave * 0.05 * shootRatio;\n\n    d += delta * 5.0;\n\n    coord = vec2(cos(a), sin(a)) * d + gunPoint;\n\n    vec4 diffuseColor = texture2D(uSampler, coord);\n    vec4 overlayColor = texture2D(uOverlay, coord);\n\n    // vec4 color = mix(diffuseColor, overlayColor, shootRatio);\n    vec4 color = diffuseColor;\n\n    // color.rgb = blendOverlay(color.rgb, vec3(mix(0.5, 1.0, uScreenEffect + shootRatio)));\n    // color.rgb = blendOverlay(color.rgb, vec3(mix(0.5, 1.0, uScreenEffect + shootRatio)));\n    // color.rgb = blendOverlay(color.rgb, vec3(0.45 + rand(vTextureCoord + vec2(0.0, uTime)) * 0.1  )) - delta * pow(1.0, 0.1 + uAnimation);\n\n    gl_FragColor = color;\n}";
			var texture = this.sprite.texture;
			this.sprite.shader = new PIXI.AbstractFilter(null, explosionFrag, this.uniforms = {
				uOverlay: { type: 'sampler2D', value: texture },
				uTime: { type: '1f', value: 0 },
				uWave: { type: '1f', value: 0 },
				uShake: { type: '1f', value: 0 },
				uAnimation: { type: '1f', value: 0 },
				uScreenEffect: { type: '1f', value: 0 }
			});
		}
	}, {
		key: 'update',
		value: function update() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.uniforms.uAnimation.value = this.config.animation;
			this.uniforms.uScreenEffect.value = this.config.screenEffect + this.config.hoverAnimation * 0.3;
			var time = this.uniforms.uTime.value += 0.001;
			var shake = this.uniforms.uShake.value = this.config.shake;
			this.uniforms.uWave.value = this.config.wave;

			var spriteOffsetX = this.sprite.position.x = windowW / 2 + 0;
			var spriteOffsetY = this.sprite.position.y = windowH / 2 + 0;

			var shootRatio = Math.sin(Math.pow(this.config.animation, 0.5) * Math.PI);

			var offsetX = this.spriteScale * 320 + spriteOffsetX * 1.5 + shootRatio * Math.random() * 150 * shake;
			var offsetY = this.spriteScale * -180 + spriteOffsetY * 1.5 - shootRatio * Math.random() * 150 * shake;
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.spriteScale = Math.max(windowW / _AppConstants2['default'].MEDIA_GLOBAL_W, windowH / _AppConstants2['default'].MEDIA_GLOBAL_H);
			// this.sprite.scale.set(this.spriteScale, this.spriteScale);
		}
	}]);

	return ExplosionEffect;
})();

exports['default'] = ExplosionEffect;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/FrontContainer.js":[function(require,module,exports){
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
			var generaInfos = _AppStore2['default'].generalInfos();
			var scope = _AppStore2['default'].globalContent();
			scope.facebookUrl = generaInfos['facebook_url'];
			scope.twitterUrl = generaInfos['twitter_url'];
			scope.instagramUrl = generaInfos['instagram_url'];
			scope.menu = _AppStore2['default'].menuContent();
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
			this.$socialWrapper = this.child.find('#social-wrapper');
			this.resize();
		}
	}, {
		key: 'resize',
		value: function resize() {
			if (!this.domIsReady) return;
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.$socialWrapper.css({
				left: windowW - _AppConstants2['default'].PADDING_AROUND - this.$socialWrapper.width(),
				top: windowH - _AppConstants2['default'].PADDING_AROUND - this.$socialWrapper.height()
			});
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
	function Knot(springContainer) {
		_classCallCheck(this, Knot);

		this.springContainer = springContainer;
		this.vx = 0;
		this.vy = 0;
		this.x = 0;
		this.y = 0;
		this.scaleX = 1;
		this.scaleY = 1;
	}

	_createClass(Knot, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.g = new PIXI.Graphics();
			this.springContainer.addChild(this.g);

			var radius = 8;
			this.g.lineStyle(_AppStore2['default'].getLineWidth(), 0xffffff, 1);
			this.g.beginFill(0xffffff, 1);
			this.g.drawCircle(0, 0, radius);
			this.g.endFill();

			return this;
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
	function LandingSlideshow(pxContainer) {
		_classCallCheck(this, LandingSlideshow);

		this.pxContainer = pxContainer;
		this.currentId = 'alaska';
	}

	_createClass(LandingSlideshow, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.slideshowContainer = new PIXI.Container();
			this.slideshowWrapper = new PIXI.Container();
			this.pxContainer.addChild(this.slideshowContainer);
			this.slideshowContainer.addChild(this.slideshowWrapper);
			this.counter = 0;

			var planets = _AppStore2['default'].planets();
			this.slides = [];
			for (var i = 0; i < planets.length; i++) {
				var s = {};
				var id = planets[i];
				var wrapperContainer = new PIXI.Container();
				var maskRect = {
					g: new PIXI.Graphics(),
					newW: 0,
					width: 0,
					x: 0
				};
				var imgUrl = _AppStore2['default'].mainImageUrl(id, _AppConstants2['default'].RESPONSIVE_IMAGE);
				var texture = PIXI.Texture.fromImage(imgUrl);
				var sprite = new PIXI.Sprite(texture);
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
				s.imgResponsiveSize = _AppStore2['default'].responsiveImageSize(_AppConstants2['default'].RESPONSIVE_IMAGE);
				s.imgUrl = imgUrl;
				s.id = planets[i];
				this.slides[i] = s;
			}

			this.maskEasing = (0, _bezierEasing2['default'])(.21, 1.47, .52, 1);
			this.chooseSlideToHighlight();
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
			// this.slideshowContainer.y = this.slideshowContainer.baseY + Math.sin(this.counter) * 4
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
				var hightlightedSlideW = windowW * 0.7;
				var normalSlideW = windowW * 0.15;
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
		key: 'resize',
		value: function resize() {
			this.applyValuesToSlides();
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

var PXContainer = (function () {
	function PXContainer() {
		_classCallCheck(this, PXContainer);
	}

	_createClass(PXContainer, [{
		key: 'init',
		value: function init(elementId) {
			// this.renderer = new PIXI.CanvasRenderer(800, 600)
			this.renderer = new PIXI.autoDetectRenderer(800, 600, { antialias: true });

			var el = $(elementId);
			$(this.renderer.view).attr('id', 'px-container');
			el.append(this.renderer.view);

			this.stage = new PIXI.Container();
		}
	}, {
		key: 'add',
		value: function add(child) {
			this.stage.addChild(child);
		}
	}, {
		key: 'remove',
		value: function remove(child) {
			this.stage.removeChild(child);
		}
	}, {
		key: 'update',
		value: function update() {
			this.renderer.render(this.stage);
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.renderer.resize(windowW, windowH);
		}
	}]);

	return PXContainer;
})();

exports['default'] = PXContainer;
module.exports = exports['default'];

},{"./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Page.js":[function(require,module,exports){
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
			return Preloader.getImageURL(this.id + '-' + this.props.type.toLowerCase() + '-' + id);
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
			_get(Object.getPrototypeOf(PagesContainer.prototype), 'componentWillUnmount', this).call(this);
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

var _BasePlanetPage2 = require('./BasePlanetPage');

var _BasePlanetPage3 = _interopRequireDefault(_BasePlanetPage2);

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var PlanetCampaignPage = (function (_BasePlanetPage) {
	_inherits(PlanetCampaignPage, _BasePlanetPage);

	function PlanetCampaignPage(props) {
		_classCallCheck(this, PlanetCampaignPage);

		_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'constructor', this).call(this, props);
	}

	_createClass(PlanetCampaignPage, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var bunnyUrl = this.getImageUrlById('bunny');
			var texture = PIXI.Texture.fromImage(bunnyUrl);
			var bunny = new PIXI.Sprite(texture);

			this.g = new PIXI.Graphics();
			this.pxContainer.addChild(this.g);

			this.pxContainer.addChild(bunny);
			bunny.x = 500;
			bunny.y = 500;

			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'didTransitionOutComplete', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			// draw a rectangle
			this.g.clear();
			this.g.beginFill(Math.random() * 0xffffff);
			this.g.drawRect(0, 0, windowW, windowH);
			this.g.endFill();

			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'resize', this).call(this);
		}
	}]);

	return PlanetCampaignPage;
})(_BasePlanetPage3['default']);

exports['default'] = PlanetCampaignPage;
module.exports = exports['default'];

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./BasePlanetPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlanetExperiencePage.js":[function(require,module,exports){
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
			var bunnyUrl = this.getImageUrlById('bunny');
			var texture = PIXI.Texture.fromImage(bunnyUrl);
			var bunny = new PIXI.Sprite(texture);

			this.g = new PIXI.Graphics();
			this.pxContainer.addChild(this.g);
			this.pxContainer.addChild(bunny);

			var XpClazz = this.getExperienceById(this.id);
			this.experience = new XpClazz();
			this.experience.componentDidMount();

			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'componentDidMount', this).call(this);
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
		key: 'update',
		value: function update() {
			this.experience.update();
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.experience.resize();

			// draw a rectangle
			this.g.clear();
			this.g.beginFill(Math.random() * 0xffffff);
			this.g.drawRect(0, 0, windowW, windowH);
			this.g.endFill();

			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return PlanetExperiencePage;
})(_BasePlanetPage3['default']);

exports['default'] = PlanetExperiencePage;
module.exports = exports['default'];

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./BasePlanetPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js","./experiences/AlaskaXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/AlaskaXP.js","./experiences/GemStoneXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/GemStoneXP.js","./experiences/MetalXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/MetalXP.js","./experiences/SkiXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/SkiXP.js","./experiences/WoodXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/WoodXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SpringGarden.js":[function(require,module,exports){
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

var SpringGarden = (function () {
	function SpringGarden(pxContainer, garden, color) {
		_classCallCheck(this, SpringGarden);

		this.pxContainer = pxContainer;
		this.garden = garden;
		this.color = color;
		this.lineW = _AppStore2['default'].getLineWidth();
		this.paused = true;
		this.opened = false;

		this.config = {
			spring: 0,
			friction: 0,
			springLength: 0
		};
	}

	_createClass(SpringGarden, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.container = new PIXI.Container();
			this.pxContainer.addChild(this.container);

			this.outlineContainer = new PIXI.Container();
			this.outlinePolygon = new PIXI.Graphics();
			this.outlineContainer.addChild(this.outlinePolygon);
			this.container.addChild(this.outlineContainer);

			this.filledContainer = new PIXI.Container();
			this.filledPolygon = new PIXI.Graphics();
			this.filledContainer.addChild(this.filledPolygon);
			this.container.addChild(this.filledContainer);

			for (var i = 0; i < this.garden.length; i++) {
				var knot = this.garden[i];
				knot.k = new _Knot2['default'](this.container).componentDidMount();
			}
		}
	}, {
		key: 'update',
		value: function update() {
			if (this.paused) return;
			this.outlinePolygon.clear();
			this.filledPolygon.clear();
			this.filledPolygon.beginFill(this.color);
			this.filledPolygon.lineStyle(0);
			this.filledPolygon.moveTo(this.garden[0].k.x, this.garden[0].k.y);
			var len = this.garden.length;
			for (var i = 0; i < len; i++) {
				var knot = this.garden[i];
				var previousKnot = this.garden[i - 1];
				previousKnot = previousKnot == undefined ? this.garden[len - 1] : previousKnot;
				this.springTo(knot.k, knot.toX, knot.toY, i);

				// outline
				this.outlinePolygon.lineStyle(this.lineW, this.color, 0.8);
				this.outlinePolygon.moveTo(previousKnot.k.x, previousKnot.k.y);
				this.outlinePolygon.lineTo(knot.k.x, knot.k.y);

				// this.filledPolygon.lineTo(knot.k.x, knot.k.y)
			}
			this.filledPolygon.endFill();
			this.config.springLength -= this.config.springLength * 0.1;
			this.container.rotation -= this.container.rotation * 0.1;
			// if(this.config.springLength < 0.0001) {
			// 	this.paused = true
			// }
		}
	}, {
		key: 'open',
		value: function open() {
			for (var i = 0; i < this.garden.length; i++) {
				var knot = this.garden[i];
				knot.k.position(0, 0);
			}
			this.container.rotation = _Utils2['default'].Rand(-2, 2);
			this.config.springLength = 200;
			this.paused = false;
			this.opened = true;
			this.assignToGoValues();
			this.assignOpenedConfig();
		}
	}, {
		key: 'close',
		value: function close() {
			this.opened = false;
			this.assignToGoValues();
			this.assignClosedConfig();
		}
	}, {
		key: 'springTo',
		value: function springTo(knotA, toX, toY, index) {
			var dx = toX - knotA.x;
			var dy = toY - knotA.y;
			var angle = Math.atan2(dy, dx);
			var targetX = toX - Math.cos(angle) * (this.config.springLength * index);
			var targetY = toY - Math.sin(angle) * (this.config.springLength * index);
			knotA.vx += (targetX - knotA.x) * this.config.spring;
			knotA.vy += (targetY - knotA.y) * this.config.spring;
			knotA.vx *= this.config.friction;
			knotA.vy *= this.config.friction;
			knotA.position(knotA.x + knotA.vx, knotA.y + knotA.vy);
		}
	}, {
		key: 'getToX',
		value: function getToX(knot) {
			if (this.opened) return knot.x * this.radius;else return 0;
		}
	}, {
		key: 'getToY',
		value: function getToY(knot) {
			if (this.opened) return knot.y * this.radius;else return 0;
		}
	}, {
		key: 'assignToGoValues',
		value: function assignToGoValues() {
			for (var i = 0; i < this.garden.length; i++) {
				var knot = this.garden[i];
				knot.toX = this.getToX(knot);
				knot.toY = this.getToY(knot);
			}
		}
	}, {
		key: 'assignOpenedConfig',
		value: function assignOpenedConfig() {
			this.config.spring = 0.03;
			this.config.friction = 0.92;
			this.config.springLength = 0;
		}
	}, {
		key: 'assignClosedConfig',
		value: function assignClosedConfig() {
			this.config.spring = 10;
			this.config.friction = 0.1;
			this.config.springLength = 0;
		}
	}, {
		key: 'resize',
		value: function resize(radius) {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.radius = radius;
			this.assignToGoValues();
			this.container.x = 0;
			this.container.y = 0;
		}
	}]);

	return SpringGarden;
})();

exports['default'] = SpringGarden;
module.exports = exports['default'];

},{"./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/AlaskaXP.js":[function(require,module,exports){
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

	function AlaskaXP() {
		_classCallCheck(this, AlaskaXP);

		_get(Object.getPrototypeOf(AlaskaXP.prototype), 'constructor', this).call(this);
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
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BaseXP = (function () {
	function BaseXP() {
		_classCallCheck(this, BaseXP);
	}

	_createClass(BaseXP, [{
		key: "componentDidMount",
		value: function componentDidMount() {}
	}, {
		key: "update",
		value: function update() {}
	}, {
		key: "resize",
		value: function resize() {}
	}, {
		key: "componentWillUnmount",
		value: function componentWillUnmount() {}
	}]);

	return BaseXP;
})();

exports["default"] = BaseXP;
module.exports = exports["default"];

},{}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/GemStoneXP.js":[function(require,module,exports){
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

var GemStoneXP = (function (_BaseXP) {
	_inherits(GemStoneXP, _BaseXP);

	function GemStoneXP() {
		_classCallCheck(this, GemStoneXP);

		_get(Object.getPrototypeOf(GemStoneXP.prototype), 'constructor', this).call(this);
	}

	_createClass(GemStoneXP, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {
			_get(Object.getPrototypeOf(GemStoneXP.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
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

},{"./BaseXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/BaseXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/MetalXP.js":[function(require,module,exports){
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

	function MetalXP() {
		_classCallCheck(this, MetalXP);

		_get(Object.getPrototypeOf(MetalXP.prototype), 'constructor', this).call(this);
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

	function SkiXP() {
		_classCallCheck(this, SkiXP);

		_get(Object.getPrototypeOf(SkiXP.prototype), 'constructor', this).call(this);
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

	function WoodXP() {
		_classCallCheck(this, WoodXP);

		_get(Object.getPrototypeOf(WoodXP.prototype), 'constructor', this).call(this);
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

var Landing = (function (_Page) {
	_inherits(Landing, _Page);

	function Landing(props) {
		_classCallCheck(this, Landing);

		_get(Object.getPrototypeOf(Landing.prototype), 'constructor', this).call(this, props);
	}

	_createClass(Landing, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.landingSlideshow = new _LandingSlideshow2['default'](this.pxContainer);
			this.landingSlideshow.componentDidMount();

			this.compass = new _Compass2['default'](this.pxContainer);
			this.compass.componentDidMount();

			this.onKeyPressed = this.onKeyPressed.bind(this);
			$(document).keydown(this.onKeyPressed);

			_get(Object.getPrototypeOf(Landing.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'onKeyPressed',
		value: function onKeyPressed(e) {
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
			e.preventDefault();
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			_get(Object.getPrototypeOf(Landing.prototype), 'didTransitionInComplete', this).call(this);
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
			this.compass.highlightPlanet(this.landingSlideshow.currentId);
		}
	}, {
		key: 'previous',
		value: function previous() {
			this.landingSlideshow.previous();
			this.compass.highlightPlanet(this.landingSlideshow.currentId);
		}
	}, {
		key: 'update',
		value: function update() {
			this.landingSlideshow.update();
			this.compass.update();
			_get(Object.getPrototypeOf(Landing.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.landingSlideshow.resize();
			this.compass.resize();
			_get(Object.getPrototypeOf(Landing.prototype), 'resize', this).call(this);
		}
	}]);

	return Landing;
})(_Page3['default']);

exports['default'] = Landing;
module.exports = exports['default'];

},{"./../../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../Compass":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Compass.js","./../LandingSlideshow":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/LandingSlideshow.js","./../Page":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Page.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = {
	WINDOW_RESIZE: 'WINDOW_RESIZE',
	PAGE_HASHER_CHANGED: 'PAGE_HASHER_CHANGED',
	PX_CONTAINER_IS_READY: 'PX_CONTAINER_IS_READY',
	PX_CONTAINER_ADD_CHILD: 'PX_CONTAINER_ADD_CHILD',
	PX_CONTAINER_REMOVE_CHILD: 'PX_CONTAINER_REMOVE_CHILD',

	LANDING: 'LANDING',
	EXPERIENCE: 'EXPERIENCE',
	CAMPAIGN: 'CAMPAIGN',
	NONE: 'NONE',

	PADDING_AROUND: 20,

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
    var helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "				<li><a href='#"
    + alias3(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"url","hash":{},"data":data}) : helper)))
    + "'>"
    + alias3(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"name","hash":{},"data":data}) : helper)))
    + "</a></li>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "<div>\n	<header id=\"header\">\n		<ul>\n"
    + ((stack1 = helpers.each.call(depth0,(depth0 != null ? depth0.menu : depth0),{"name":"each","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "		</ul>\n	</header>\n	<footer id=\"footer\">\n		<ul id=\"social-wrapper\">\n			<li>\n				<a target=\"_blank\" href=\""
    + alias3(((helper = (helper = helpers.facebookUrl || (depth0 != null ? depth0.facebookUrl : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"facebookUrl","hash":{},"data":data}) : helper)))
    + "\">\n					<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.002,0.167c-8.746,0-15.835,7.09-15.835,15.834c0,8.746,7.089,15.835,15.835,15.835c8.745,0,15.834-7.089,15.834-15.835C31.836,7.257,24.747,0.167,16.002,0.167 M22.322,13.539c0.007,0.138,0.009,0.279,0.009,0.42c0,4.302-3.272,9.259-9.259,9.259c-1.837,0-3.547-0.539-4.987-1.461c0.253,0.031,0.514,0.044,0.776,0.044c1.525,0,2.928-0.52,4.042-1.394c-1.424-0.023-2.625-0.965-3.039-2.258c0.198,0.037,0.402,0.058,0.611,0.058c0.298,0,0.585-0.038,0.858-0.115c-1.489-0.297-2.612-1.612-2.612-3.189v-0.041c0.44,0.242,0.942,0.389,1.475,0.407c-0.873-0.585-1.447-1.581-1.447-2.709c0-0.597,0.16-1.155,0.441-1.638c1.605,1.97,4.003,3.264,6.708,3.4c-0.057-0.238-0.085-0.485-0.085-0.74c0-1.797,1.458-3.254,3.254-3.254c0.937,0,1.783,0.395,2.375,1.028c0.742-0.146,1.438-0.417,2.067-0.789c-0.242,0.759-0.759,1.396-1.432,1.799c0.658-0.079,1.286-0.253,1.869-0.511C23.511,12.507,22.959,13.079,22.322,13.539\"/></svg>\n				</a>\n			</li>\n			<li>\n				<a target=\"_blank\" href=\""
    + alias3(((helper = (helper = helpers.twitterUrl || (depth0 != null ? depth0.twitterUrl : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"twitterUrl","hash":{},"data":data}) : helper)))
    + "\">\n					<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.001,0.167c-8.745,0-15.834,7.09-15.834,15.834c0,8.745,7.089,15.835,15.834,15.835c8.745,0,15.834-7.09,15.834-15.835C31.836,7.257,24.746,0.167,16.001,0.167 M19.498,13.32l-0.184,2.369h-2.427v8.229h-3.068v-8.229h-1.638V13.32h1.638v-1.592c0-0.701,0.017-1.782,0.527-2.453c0.536-0.709,1.273-1.191,2.541-1.191c2.066,0,2.935,0.295,2.935,0.295l-0.41,2.425c0,0-0.682-0.196-1.318-0.196c-0.637,0-1.207,0.227-1.207,0.863v1.85H19.498z\"/></svg>\n				</a>\n			</li>\n			<li>\n				<a target=\"_blank\" href=\""
    + alias3(((helper = (helper = helpers.instagramUrl || (depth0 != null ? depth0.instagramUrl : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"instagramUrl","hash":{},"data":data}) : helper)))
    + "\">\n					<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M19.413,12.602l-0.009-2.686l2.685-0.008v2.684L19.413,12.602z M16.004,18.788c1.536,0,2.787-1.25,2.787-2.787c0-0.605-0.196-1.166-0.528-1.624c-0.507-0.703-1.329-1.163-2.259-1.163c-0.931,0-1.753,0.46-2.26,1.163c-0.33,0.458-0.527,1.019-0.527,1.624C13.217,17.538,14.467,18.788,16.004,18.788z M20.333,16.001c0,2.387-1.942,4.33-4.329,4.33c-2.388,0-4.329-1.943-4.329-4.33c0-0.575,0.114-1.123,0.318-1.624H9.629v6.481c0,0.836,0.681,1.518,1.518,1.518h9.714c0.837,0,1.517-0.682,1.517-1.518v-6.481h-2.363C20.217,14.878,20.333,15.426,20.333,16.001z M31.836,16.001c0,8.744-7.09,15.835-15.835,15.835S0.167,24.745,0.167,16.001c0-8.745,7.089-15.834,15.834-15.834S31.836,7.256,31.836,16.001z M23.921,11.144c0-1.688-1.373-3.06-3.062-3.06h-9.713c-1.687,0-3.06,1.371-3.06,3.06v9.714c0,1.688,1.373,3.06,3.06,3.06h9.713c1.688,0,3.062-1.372,3.062-3.06V11.144z\"/></svg>\n				</a>\n			</li>\n		</ul>\n	</footer>\n</div>";
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
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class='page-wrapper'>\n	<div class=\"vertical-center-parent\">\n		<p class=\"vertical-center-child\">\n			planet campaign page\n		</p>\n	</div>\n</div>";
},"useData":true});

},{"hbsfy/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/PlanetExperiencePage.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class='page-wrapper'>\n	<div class=\"vertical-center-parent\">\n		<p class=\"vertical-center-child\">\n			planet experience page\n		</p>\n	</div>\n</div>";
},"useData":true});

},{"hbsfy/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/pages/Landing.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class='page-wrapper'>\n	<div class=\"vertical-center-parent\">\n		<p class=\"vertical-center-child\">\n			\n		</p>\n	</div>\n</div>";
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

var Pool = (function () {
	function Pool() {
		_classCallCheck(this, Pool);

		this.timelines = _objectpool2['default'].generate(TimelineMax, { count: 4 });
		this.pxContainers = _objectpool2['default'].generate(PIXI.Container, { count: 2 });
	}

	_createClass(Pool, [{
		key: 'getTimeline',
		value: function getTimeline() {
			return this.timelines.get();
		}
	}, {
		key: 'releaseTimeline',
		value: function releaseTimeline(item) {
			this.timelines.release(item);
		}
	}, {
		key: 'getContainer',
		value: function getContainer() {
			return this.pxContainers.get();
		}
	}, {
		key: 'releaseContainer',
		value: function releaseContainer(item) {
			this.pxContainers.release(item);
		}
	}]);

	return Pool;
})();

exports['default'] = Pool;
module.exports = exports['default'];

},{"objectpool":"objectpool"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Preloader.js":[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Preloader = (function () {
	function Preloader() {
		_classCallCheck(this, Preloader);

		this.queue = new createjs.LoadQueue();
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
				productId: /^[0-2]/
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

function _getTimeline(args) {
	var tl = _AppStore2['default'].getTimeline();
	tl.eventCallback("onComplete", args.onComplete);
	return tl;
}

var TransitionAnimations = {

	// EXPERIENCE -------------------------------
	'experience-in': function experienceIn(scope, args) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var timeline = _getTimeline(args);

		var windowW = _AppStore2['default'].Window.w;
		var windowH = _AppStore2['default'].Window.h;

		timeline.from(wrapper, 1, { opacity: 0, ease: Expo.easeInOut });

		switch (types.oldType) {
			case _AppConstants2['default'].LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y: windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { x: windowW, ease: Expo.easeInOut }, { x: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
		return timeline;
	},
	'experience-out': function experienceOut(scope, args) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var timeline = _getTimeline(args);

		var windowW = _AppStore2['default'].Window.w;
		var windowH = _AppStore2['default'].Window.h;

		timeline.to(wrapper, 1, { opacity: 0, ease: Expo.easeInOut });

		switch (types.newType) {
			case _AppConstants2['default'].LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { x: 0, ease: Expo.easeInOut }, { x: -windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: -windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
		return timeline;
	},

	// CAMPAIGN -------------------------------
	'campaign-in': function campaignIn(scope, args) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var timeline = _getTimeline(args);

		var windowH = _AppStore2['default'].Window.h;

		timeline.from(wrapper, 1, { opacity: 0, ease: Expo.easeInOut });

		switch (types.oldType) {
			case _AppConstants2['default'].LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y: windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y: windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
		return timeline;
	},
	'campaign-out': function campaignOut(scope, args) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var timeline = _getTimeline(args);

		var windowH = _AppStore2['default'].Window.h;

		timeline.to(wrapper, 1, { opacity: 0, ease: Expo.easeInOut });

		switch (types.newType) {
			case _AppConstants2['default'].LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
		return timeline;
	},

	// LANDING -------------------------------
	'landing-in': function landingIn(scope, args) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var timeline = _getTimeline(args);

		var windowH = _AppStore2['default'].Window.h;
		timeline.from(wrapper, 1, { opacity: 0, ease: Expo.easeInOut });

		switch (types.oldType) {
			case _AppConstants2['default'].LANDING:
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
		return timeline;
	},
	'landing-out': function landingOut(scope, args) {
		var wrapper = scope.child;
		var types = _AppStore2['default'].getTypeOfNewAndOldPage();
		var timeline = _getTimeline(args);

		var windowW = _AppStore2['default'].Window.w;
		var windowH = _AppStore2['default'].Window.h;

		timeline.to(wrapper, 1, { opacity: 0, ease: Expo.easeInOut });

		switch (types.newType) {
			case _AppConstants2['default'].EXPERIENCE:
				timeline.to(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.to(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].NONE:
				break;
		}
		timeline.pause(0);
		return timeline;
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

function _pageRouteIdChanged(id) {}
function _getPageContent() {
    var scope = _getPageId();
    var langContent = _getContentByLang(JS_lang);
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
function _getAppData() {
    return _GlobalData2['default'];
}
function _getDefaultRoute() {
    return _GlobalData2['default']['default-route'];
}
function _getGlobalContent() {
    var langContent = _getContentByLang(JS_lang);
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
    appData: function appData() {
        return _getAppData();
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
    mainImageUrl: function mainImageUrl(id, responsiveArray) {
        return AppStore.baseMediaPath() + '/image/planets/' + id + '/main-' + AppStore.responsiveImageWidth(responsiveArray) + '.jpg';
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
        return 3;
    },
    pageAssetsToLoad: function pageAssetsToLoad() {
        return _getPageAssetsToLoad();
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
    planets: function planets() {
        return _GlobalData2['default'].planets;
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
    Pool: undefined,
    Mouse: undefined,
    PXContainer: undefined,
    Orientation: _AppConstants2['default'].LANDSCAPE,
    dispatcherIndex: _AppDispatcher2['default'].register(function (payload) {
        var action = payload.action;
        switch (action.actionType) {
            case _AppConstants2['default'].PAGE_HASHER_CHANGED:
                _pageRouteIdChanged(action.item);
                AppStore.emitChange(action.actionType);
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
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Utils = (function () {
	function Utils() {
		_classCallCheck(this, Utils);
	}

	_createClass(Utils, null, [{
		key: "NormalizeMouseCoords",
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
		key: "ResizePositionProportionally",
		value: function ResizePositionProportionally(windowW, windowH, contentW, contentH) {
			var aspectRatio = contentW / contentH;
			var scale = windowW / windowH < aspectRatio ? windowH / contentH * 1 : windowW / contentW * 1;
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
		key: "ResizePositionProportionallyWithAnchorCenter",
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
		key: "Rand",
		value: function Rand(min, max) {
			return Math.random() * (max - min) + min;
		}
	}, {
		key: "DegreesToRadians",
		value: function DegreesToRadians(degrees) {
			return degrees * (Math.PI / 180);
		}
	}, {
		key: "RadiansToDegrees",
		value: function RadiansToDegrees(radians) {
			return radians * (180 / Math.PI);
		}
	}, {
		key: "Limit",
		value: function Limit(v, min, max) {
			return Math.min(max, Math.max(min, v));
		}
	}, {
		key: "Closest",
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
	}]);

	return Utils;
})();

exports["default"] = Utils;
module.exports = exports["default"];

},{}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Vec2.js":[function(require,module,exports){
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
			// console.log(this.childId, 'removed from', this.parentId)
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
			this.tlIn = _TransitionAnimations2['default'][keyName](this, { onComplete: this.didTransitionInComplete });
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
			this.tlOut = _TransitionAnimations2['default'][keyName](this, { onComplete: this.didTransitionOutComplete });
			this.tlOut.play(0);
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			var _this2 = this;

			setTimeout(function () {
				return _this2.props.didTransitionInComplete();
			}, 0);
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			var _this3 = this;

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
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			if (this.tlIn != undefined) {
				this.tlIn.clear();
				_AppStore2['default'].releaseTimeline(this.tlIn);
			}
			if (this.tlOut != undefined) {
				this.tlOut.clear();
				_AppStore2['default'].releaseTimeline(this.tlOut);
			}
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
		"instagram_url": "http://instagram.com"
	},

	"menu": [
		{
			"id": "landing",
			"name": "Landing",
			"url": "/landing"
		}
	],

	"planets": ["ski", "metal", "alaska", "wood", "gemstone"],
	"elements": ["fire", "earth", "metal", "water", "wood"],
	"gender": ["male", "female", "animal"],

	"products-data": {
		"ski": [
			{
				"id": 0,
				"color": "0x75b7fc",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6},
					{"x":0.4, "y":0.8}
				]
			},{
				"id": 1,
				"color": "0xc3fb63",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			},{
				"id": 1,
				"color": "0xc1fbad",
				"knots": [
					{"x":0.3, "y":-0.1},
					{"x":0.6, "y":-0.4},
					{"x":0.6, "y":-0.6},
					{"x":-0.1, "y":-0.7}
				]
			}
		],
		"metal": [
			{
				"id": 0,
				"color": "0x75b7fc",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6},
					{"x":0.4, "y":0.8}
				]
			},{
				"id": 1,
				"color": "0xc3fb63",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			},{
				"id": 1,
				"color": "0xc1fbad",
				"knots": [
					{"x":0.3, "y":-0.1},
					{"x":0.6, "y":-0.4},
					{"x":0.6, "y":-0.6},
					{"x":-0.1, "y":-0.7}
				]
			}
		],
		"alaska": [
			{
				"id": 0,
				"color": "0x75b7fc",
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6},
					{"x":-0.4, "y":0.8}
				]
			},{
				"id": 1,
				"color": "0xc3fb63",
				"knots": [
					{"x":0.3, "y":-0.6},
					{"x":0.6, "y":0.4},
					{"x":0.4, "y":0.7}
				]
			},{
				"id": 1,
				"color": "0xc1fbad",
				"knots": [
					{"x":-0.3, "y":0.1},
					{"x":-0.6, "y":-0.3},
					{"x":-0.6, "y":-0.4},
					{"x":-0.1, "y":-0.7}
				]
			}
		],
		"wood": [
			{
				"id": 0,
				"color": "0x75b7fc",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6},
					{"x":0.4, "y":0.8}
				]
			},{
				"id": 1,
				"color": "0xc3fb63",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			},{
				"id": 1,
				"color": "0xc1fbad",
				"knots": [
					{"x":0.3, "y":-0.1},
					{"x":0.6, "y":-0.4},
					{"x":0.6, "y":-0.6},
					{"x":-0.1, "y":-0.7}
				]
			}
		],
		"gemstone": [
			{
				"id": 0,
				"color": "0x75b7fc",
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6},
					{"x":-0.4, "y":0.8}
				]
			},{
				"id": 1,
				"color": "0xc3fb63",
				"knots": [
					{"x":0.3, "y":-0.6},
					{"x":0.6, "y":0.4},
					{"x":0.4, "y":0.7}
				]
			},{
				"id": 1,
				"color": "0xc1fbad",
				"knots": [
					{"x":-0.3, "y":0.1},
					{"x":-0.6, "y":-0.3},
					{"x":-0.6, "y":-0.4},
					{"x":-0.1, "y":-0.7}
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
				"main-title": "landing page"
			},
			"ski": {
				"main-title": "ski page"
			},
			"metal": {
				"main-title": "metal page"
			},
			"alaska": {
				"main-title": "alaska page"
			},
			"wood": {
				"main-title": "wood page"
			},
			"gemstone": {
				"main-title": "gemstone page"
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
				"main-title": "landing page fr"
			},
			"ski": {
				"main-title": "ski page fr"
			},
			"metal": {
				"main-title": "metal page fr"
			},
			"alaska": {
				"main-title": "alaska page fr"
			},
			"wood": {
				"main-title": "wood page fr"
			},
			"gemstone": {
				"main-title": "gemstone page fr"
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
				"main-title": "landing page es"
			},
			"ski": {
				"main-title": "ski page es"
			},
			"metal": {
				"main-title": "metal page es"
			},
			"alaska": {
				"main-title": "alaska page es"
			},
			"wood": {
				"main-title": "wood page es"
			},
			"gemstone": {
				"main-title": "gemstone page es"
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
				"main-title": "landing page it"
			},
			"ski": {
				"main-title": "ski page it"
			},
			"metal": {
				"main-title": "metal page it"
			},
			"alaska": {
				"main-title": "alaska page it"
			},
			"wood": {
				"main-title": "wood page it"
			},
			"gemstone": {
				"main-title": "gemstone page it"
			}
		},
		"ge": {
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
				"main-title": "landing page ge"
			},
			"ski": {
				"main-title": "ski page ge"
			},
			"metal": {
				"main-title": "metal page ge"
			},
			"alaska": {
				"main-title": "alaska page ge"
			},
			"wood": {
				"main-title": "wood page ge"
			},
			"gemstone": {
				"main-title": "gemstone page ge"
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
				"main-title": "landing page pt"
			},
			"ski": {
				"main-title": "ski page pt"
			},
			"metal": {
				"main-title": "metal page pt"
			},
			"alaska": {
				"main-title": "alaska page pt"
			},
			"wood": {
				"main-title": "wood page pt"
			},
			"gemstone": {
				"main-title": "gemstone page pt"
			}
		},
	},

	"default-route": "/landing",

	"routing": {
		"/landing": {
			"id": "landing"
		},
		"/planet/ski": {
			"id": "ski",
			"experience-assets": [
				"bunny.png"
			],
			"campaign-assets": [
				"bunny.png"
			]
		},
		"/planet/metal": {
			"id": "metal",
			"experience-assets": [
				"bunny.png"
			],
			"campaign-assets": [
				"bunny.png"
			]
		},
		"/planet/alaska": {
			"id": "alaska",
			"experience-assets": [
				"bunny.png"
			],
			"campaign-assets": [
				"bunny.png"
			]
		},
		"/planet/wood": {
			"id": "wood",
			"experience-assets": [
				"bunny.png"
			],
			"campaign-assets": [
				"bunny.png"
			]
		},
		"/planet/gemstone": {
			"id": "gemstone",
			"experience-assets": [
				"bunny.png"
			],
			"campaign-assets": [
				"bunny.png"
			]
		}
	}
}
},{}]},{},["/Users/panagiotisthomoglou/Projects/camper/src/js/Main.js"])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmx1eC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L2xpYi9EaXNwYXRjaGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvbGliL2ludmFyaWFudC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvYmFzZVRvU3RyaW5nLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9NYWluLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwVGVtcGxhdGUuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9hY3Rpb25zL0FwcEFjdGlvbnMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Jhc2VQbGFuZXRQYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Db21wYXNzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Db21wYXNzUmluZ3MuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0V4cGxvc2lvbkVmZmVjdC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvRnJvbnRDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0tub3QuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0xhbmRpbmdTbGlkZXNob3cuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1BYQ29udGFpbmVyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9QYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9QYWdlc0NvbnRhaW5lci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGxhbmV0Q2FtcGFpZ25QYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9QbGFuZXRFeHBlcmllbmNlUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvU3ByaW5nR2FyZGVuLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9BbGFza2FYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvQmFzZVhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9HZW1TdG9uZVhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9NZXRhbFhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9Ta2lYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvV29vZFhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9wYWdlcy9MYW5kaW5nLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29uc3RhbnRzL0FwcENvbnN0YW50cy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2Rpc3BhdGNoZXJzL0FwcERpc3BhdGNoZXIuanMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL0Zyb250Q29udGFpbmVyLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGFnZXNDb250YWluZXIuaGJzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9QbGFuZXRDYW1wYWlnblBhZ2UuaGJzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9QbGFuZXRFeHBlcmllbmNlUGFnZS5oYnMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL3BhZ2VzL0xhbmRpbmcuaGJzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvc2VydmljZXMvR2xvYmFsRXZlbnRzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvc2VydmljZXMvUG9vbC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1ByZWxvYWRlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1JvdXRlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1RyYW5zaXRpb25BbmltYXRpb25zLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvc3RvcmVzL0FwcFN0b3JlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvQXV0b2JpbmQuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC91dGlscy9VdGlscy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3V0aWxzL1ZlYzIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC91dGlscy9yYWYuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL3BhZ2VyL1BhZ2VyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VDb21wb25lbnQuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL3BhZ2VyL2NvbXBvbmVudHMvQmFzZVBhZ2UuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL3BhZ2VyL2NvbXBvbmVudHMvQmFzZVBhZ2VyLmpzIiwid3d3L2RhdGEvZGF0YS5qc29uIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUN6QyxPQUFJLEtBQUssR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQzFDLE9BQUksR0FBRyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQ3hDLE9BQUksR0FBRyxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDekMsT0FBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTs7QUFFNUQsUUFBSyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBQ3RDLFFBQUssR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBQ3ZDLE1BQUcsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUNyQyxNQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUN0QyxPQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBOztBQUU1RCxRQUFLLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7QUFDeEMsUUFBSyxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7QUFDekMsTUFBRyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQ3ZDLE1BQUcsR0FBRyxDQUFDLEtB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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cy5EaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9saWIvRGlzcGF0Y2hlcicpXG4iLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIERpc3BhdGNoZXJcbiAqIEB0eXBlY2hlY2tzXG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCcuL2ludmFyaWFudCcpO1xuXG52YXIgX2xhc3RJRCA9IDE7XG52YXIgX3ByZWZpeCA9ICdJRF8nO1xuXG4vKipcbiAqIERpc3BhdGNoZXIgaXMgdXNlZCB0byBicm9hZGNhc3QgcGF5bG9hZHMgdG8gcmVnaXN0ZXJlZCBjYWxsYmFja3MuIFRoaXMgaXNcbiAqIGRpZmZlcmVudCBmcm9tIGdlbmVyaWMgcHViLXN1YiBzeXN0ZW1zIGluIHR3byB3YXlzOlxuICpcbiAqICAgMSkgQ2FsbGJhY2tzIGFyZSBub3Qgc3Vic2NyaWJlZCB0byBwYXJ0aWN1bGFyIGV2ZW50cy4gRXZlcnkgcGF5bG9hZCBpc1xuICogICAgICBkaXNwYXRjaGVkIHRvIGV2ZXJ5IHJlZ2lzdGVyZWQgY2FsbGJhY2suXG4gKiAgIDIpIENhbGxiYWNrcyBjYW4gYmUgZGVmZXJyZWQgaW4gd2hvbGUgb3IgcGFydCB1bnRpbCBvdGhlciBjYWxsYmFja3MgaGF2ZVxuICogICAgICBiZWVuIGV4ZWN1dGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGlzIGh5cG90aGV0aWNhbCBmbGlnaHQgZGVzdGluYXRpb24gZm9ybSwgd2hpY2hcbiAqIHNlbGVjdHMgYSBkZWZhdWx0IGNpdHkgd2hlbiBhIGNvdW50cnkgaXMgc2VsZWN0ZWQ6XG4gKlxuICogICB2YXIgZmxpZ2h0RGlzcGF0Y2hlciA9IG5ldyBEaXNwYXRjaGVyKCk7XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjb3VudHJ5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDb3VudHJ5U3RvcmUgPSB7Y291bnRyeTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjaXR5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDaXR5U3RvcmUgPSB7Y2l0eTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgYmFzZSBmbGlnaHQgcHJpY2Ugb2YgdGhlIHNlbGVjdGVkIGNpdHlcbiAqICAgdmFyIEZsaWdodFByaWNlU3RvcmUgPSB7cHJpY2U6IG51bGx9XG4gKlxuICogV2hlbiBhIHVzZXIgY2hhbmdlcyB0aGUgc2VsZWN0ZWQgY2l0eSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY2l0eS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ2l0eTogJ3BhcmlzJ1xuICogICB9KTtcbiAqXG4gKiBUaGlzIHBheWxvYWQgaXMgZGlnZXN0ZWQgYnkgYENpdHlTdG9yZWA6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY2l0eS11cGRhdGUnKSB7XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IHBheWxvYWQuc2VsZWN0ZWRDaXR5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgdXNlciBzZWxlY3RzIGEgY291bnRyeSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY291bnRyeS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ291bnRyeTogJ2F1c3RyYWxpYSdcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGJvdGggc3RvcmVzOlxuICpcbiAqICAgIENvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgQ291bnRyeVN0b3JlLmNvdW50cnkgPSBwYXlsb2FkLnNlbGVjdGVkQ291bnRyeTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIGNhbGxiYWNrIHRvIHVwZGF0ZSBgQ291bnRyeVN0b3JlYCBpcyByZWdpc3RlcmVkLCB3ZSBzYXZlIGEgcmVmZXJlbmNlXG4gKiB0byB0aGUgcmV0dXJuZWQgdG9rZW4uIFVzaW5nIHRoaXMgdG9rZW4gd2l0aCBgd2FpdEZvcigpYCwgd2UgY2FuIGd1YXJhbnRlZVxuICogdGhhdCBgQ291bnRyeVN0b3JlYCBpcyB1cGRhdGVkIGJlZm9yZSB0aGUgY2FsbGJhY2sgdGhhdCB1cGRhdGVzIGBDaXR5U3RvcmVgXG4gKiBuZWVkcyB0byBxdWVyeSBpdHMgZGF0YS5cbiAqXG4gKiAgIENpdHlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBtYXkgbm90IGJlIHVwZGF0ZWQuXG4gKiAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIGlzIG5vdyBndWFyYW50ZWVkIHRvIGJlIHVwZGF0ZWQuXG4gKlxuICogICAgICAgLy8gU2VsZWN0IHRoZSBkZWZhdWx0IGNpdHkgZm9yIHRoZSBuZXcgY291bnRyeVxuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBnZXREZWZhdWx0Q2l0eUZvckNvdW50cnkoQ291bnRyeVN0b3JlLmNvdW50cnkpO1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogVGhlIHVzYWdlIG9mIGB3YWl0Rm9yKClgIGNhbiBiZSBjaGFpbmVkLCBmb3IgZXhhbXBsZTpcbiAqXG4gKiAgIEZsaWdodFByaWNlU3RvcmUuZGlzcGF0Y2hUb2tlbiA9XG4gKiAgICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgICBzd2l0Y2ggKHBheWxvYWQuYWN0aW9uVHlwZSkge1xuICogICAgICAgICBjYXNlICdjb3VudHJ5LXVwZGF0ZSc6XG4gKiAgICAgICAgICAgZmxpZ2h0RGlzcGF0Y2hlci53YWl0Rm9yKFtDaXR5U3RvcmUuZGlzcGF0Y2hUb2tlbl0pO1xuICogICAgICAgICAgIEZsaWdodFByaWNlU3RvcmUucHJpY2UgPVxuICogICAgICAgICAgICAgZ2V0RmxpZ2h0UHJpY2VTdG9yZShDb3VudHJ5U3RvcmUuY291bnRyeSwgQ2l0eVN0b3JlLmNpdHkpO1xuICogICAgICAgICAgIGJyZWFrO1xuICpcbiAqICAgICAgICAgY2FzZSAnY2l0eS11cGRhdGUnOlxuICogICAgICAgICAgIEZsaWdodFByaWNlU3RvcmUucHJpY2UgPVxuICogICAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZShDb3VudHJ5U3RvcmUuY291bnRyeSwgQ2l0eVN0b3JlLmNpdHkpO1xuICogICAgICAgICAgIGJyZWFrO1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogVGhlIGBjb3VudHJ5LXVwZGF0ZWAgcGF5bG9hZCB3aWxsIGJlIGd1YXJhbnRlZWQgdG8gaW52b2tlIHRoZSBzdG9yZXMnXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcyBpbiBvcmRlcjogYENvdW50cnlTdG9yZWAsIGBDaXR5U3RvcmVgLCB0aGVuXG4gKiBgRmxpZ2h0UHJpY2VTdG9yZWAuXG4gKi9cblxuICBmdW5jdGlvbiBEaXNwYXRjaGVyKCkge1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmcgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZCA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IGZhbHNlO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCBldmVyeSBkaXNwYXRjaGVkIHBheWxvYWQuIFJldHVybnNcbiAgICogYSB0b2tlbiB0aGF0IGNhbiBiZSB1c2VkIHdpdGggYHdhaXRGb3IoKWAuXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLnJlZ2lzdGVyPWZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIGlkID0gX3ByZWZpeCArIF9sYXN0SUQrKztcbiAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0gPSBjYWxsYmFjaztcbiAgICByZXR1cm4gaWQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBjYWxsYmFjayBiYXNlZCBvbiBpdHMgdG9rZW4uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpZFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUudW5yZWdpc3Rlcj1mdW5jdGlvbihpZCkge1xuICAgIGludmFyaWFudChcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSxcbiAgICAgICdEaXNwYXRjaGVyLnVucmVnaXN0ZXIoLi4uKTogYCVzYCBkb2VzIG5vdCBtYXAgdG8gYSByZWdpc3RlcmVkIGNhbGxiYWNrLicsXG4gICAgICBpZFxuICAgICk7XG4gICAgZGVsZXRlIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXTtcbiAgfTtcblxuICAvKipcbiAgICogV2FpdHMgZm9yIHRoZSBjYWxsYmFja3Mgc3BlY2lmaWVkIHRvIGJlIGludm9rZWQgYmVmb3JlIGNvbnRpbnVpbmcgZXhlY3V0aW9uXG4gICAqIG9mIHRoZSBjdXJyZW50IGNhbGxiYWNrLiBUaGlzIG1ldGhvZCBzaG91bGQgb25seSBiZSB1c2VkIGJ5IGEgY2FsbGJhY2sgaW5cbiAgICogcmVzcG9uc2UgdG8gYSBkaXNwYXRjaGVkIHBheWxvYWQuXG4gICAqXG4gICAqIEBwYXJhbSB7YXJyYXk8c3RyaW5nPn0gaWRzXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS53YWl0Rm9yPWZ1bmN0aW9uKGlkcykge1xuICAgIGludmFyaWFudChcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyxcbiAgICAgICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogTXVzdCBiZSBpbnZva2VkIHdoaWxlIGRpc3BhdGNoaW5nLidcbiAgICApO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBpZHMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICB2YXIgaWQgPSBpZHNbaWldO1xuICAgICAgaWYgKHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSkge1xuICAgICAgICBpbnZhcmlhbnQoXG4gICAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdLFxuICAgICAgICAgICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogQ2lyY3VsYXIgZGVwZW5kZW5jeSBkZXRlY3RlZCB3aGlsZSAnICtcbiAgICAgICAgICAnd2FpdGluZyBmb3IgYCVzYC4nLFxuICAgICAgICAgIGlkXG4gICAgICAgICk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW52YXJpYW50KFxuICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0sXG4gICAgICAgICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogYCVzYCBkb2VzIG5vdCBtYXAgdG8gYSByZWdpc3RlcmVkIGNhbGxiYWNrLicsXG4gICAgICAgIGlkXG4gICAgICApO1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEaXNwYXRjaGVzIGEgcGF5bG9hZCB0byBhbGwgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXlsb2FkXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaD1mdW5jdGlvbihwYXlsb2FkKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgIXRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyxcbiAgICAgICdEaXNwYXRjaC5kaXNwYXRjaCguLi4pOiBDYW5ub3QgZGlzcGF0Y2ggaW4gdGhlIG1pZGRsZSBvZiBhIGRpc3BhdGNoLidcbiAgICApO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfc3RhcnREaXNwYXRjaGluZyhwYXlsb2FkKTtcbiAgICB0cnkge1xuICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MpIHtcbiAgICAgICAgaWYgKHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2soaWQpO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX3N0b3BEaXNwYXRjaGluZygpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogSXMgdGhpcyBEaXNwYXRjaGVyIGN1cnJlbnRseSBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmlzRGlzcGF0Y2hpbmc9ZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZztcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbCB0aGUgY2FsbGJhY2sgc3RvcmVkIHdpdGggdGhlIGdpdmVuIGlkLiBBbHNvIGRvIHNvbWUgaW50ZXJuYWxcbiAgICogYm9va2tlZXBpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrPWZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdID0gdHJ1ZTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0odGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCk7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdID0gdHJ1ZTtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IHVwIGJvb2trZWVwaW5nIG5lZWRlZCB3aGVuIGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcGF5bG9hZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX3N0YXJ0RGlzcGF0Y2hpbmc9ZnVuY3Rpb24ocGF5bG9hZCkge1xuICAgIGZvciAodmFyIGlkIGluIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzKSB7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0gPSBmYWxzZTtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkW2lkXSA9IGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gcGF5bG9hZDtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDbGVhciBib29ra2VlcGluZyB1c2VkIGZvciBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS4kRGlzcGF0Y2hlcl9zdG9wRGlzcGF0Y2hpbmc9ZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IG51bGw7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gIH07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBEaXNwYXRjaGVyO1xuIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgaW52YXJpYW50XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogVXNlIGludmFyaWFudCgpIHRvIGFzc2VydCBzdGF0ZSB3aGljaCB5b3VyIHByb2dyYW0gYXNzdW1lcyB0byBiZSB0cnVlLlxuICpcbiAqIFByb3ZpZGUgc3ByaW50Zi1zdHlsZSBmb3JtYXQgKG9ubHkgJXMgaXMgc3VwcG9ydGVkKSBhbmQgYXJndW1lbnRzXG4gKiB0byBwcm92aWRlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgYnJva2UgYW5kIHdoYXQgeW91IHdlcmVcbiAqIGV4cGVjdGluZy5cbiAqXG4gKiBUaGUgaW52YXJpYW50IG1lc3NhZ2Ugd2lsbCBiZSBzdHJpcHBlZCBpbiBwcm9kdWN0aW9uLCBidXQgdGhlIGludmFyaWFudFxuICogd2lsbCByZW1haW4gdG8gZW5zdXJlIGxvZ2ljIGRvZXMgbm90IGRpZmZlciBpbiBwcm9kdWN0aW9uLlxuICovXG5cbnZhciBpbnZhcmlhbnQgPSBmdW5jdGlvbihjb25kaXRpb24sIGZvcm1hdCwgYSwgYiwgYywgZCwgZSwgZikge1xuICBpZiAoZmFsc2UpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YXJpYW50IHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQnKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHZhciBlcnJvcjtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAnTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArXG4gICAgICAgICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLidcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhcmdzID0gW2EsIGIsIGMsIGQsIGUsIGZdO1xuICAgICAgdmFyIGFyZ0luZGV4ID0gMDtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAnSW52YXJpYW50IFZpb2xhdGlvbjogJyArXG4gICAgICAgIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107IH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIGVycm9yLmZyYW1lc1RvUG9wID0gMTsgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBpbnZhcmlhbnQncyBvd24gZnJhbWVcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbnZhcmlhbnQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvYmFzZScpO1xuXG52YXIgYmFzZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG4vLyBFYWNoIG9mIHRoZXNlIGF1Z21lbnQgdGhlIEhhbmRsZWJhcnMgb2JqZWN0LiBObyBuZWVkIHRvIHNldHVwIGhlcmUuXG4vLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxuXG52YXIgX1NhZmVTdHJpbmcgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcnKTtcblxudmFyIF9TYWZlU3RyaW5nMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9TYWZlU3RyaW5nKTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgX2ltcG9ydDIgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydDIpO1xuXG52YXIgX2ltcG9ydDMgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvcnVudGltZScpO1xuXG52YXIgcnVudGltZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQzKTtcblxudmFyIF9ub0NvbmZsaWN0ID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL25vLWNvbmZsaWN0Jyk7XG5cbnZhciBfbm9Db25mbGljdDIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfbm9Db25mbGljdCk7XG5cbi8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxuZnVuY3Rpb24gY3JlYXRlKCkge1xuICB2YXIgaGIgPSBuZXcgYmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoaGIsIGJhc2UpO1xuICBoYi5TYWZlU3RyaW5nID0gX1NhZmVTdHJpbmcyWydkZWZhdWx0J107XG4gIGhiLkV4Y2VwdGlvbiA9IF9FeGNlcHRpb24yWydkZWZhdWx0J107XG4gIGhiLlV0aWxzID0gVXRpbHM7XG4gIGhiLmVzY2FwZUV4cHJlc3Npb24gPSBVdGlscy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIGhiLlZNID0gcnVudGltZTtcbiAgaGIudGVtcGxhdGUgPSBmdW5jdGlvbiAoc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgfTtcblxuICByZXR1cm4gaGI7XG59XG5cbnZhciBpbnN0ID0gY3JlYXRlKCk7XG5pbnN0LmNyZWF0ZSA9IGNyZWF0ZTtcblxuX25vQ29uZmxpY3QyWydkZWZhdWx0J10oaW5zdCk7XG5cbmluc3RbJ2RlZmF1bHQnXSA9IGluc3Q7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGluc3Q7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O1xuZXhwb3J0cy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lO1xuXG52YXIgX2ltcG9ydCA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBWRVJTSU9OID0gJzMuMC4xJztcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSA2O1xuXG5leHBvcnRzLkNPTVBJTEVSX1JFVklTSU9OID0gQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc9PSAxLngueCcsXG4gIDU6ICc9PSAyLjAuMC1hbHBoYS54JyxcbiAgNjogJz49IDIuMC4wLWJldGEuMSdcbn07XG5cbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uIHJlZ2lzdGVySGVscGVyKG5hbWUsIGZuKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChmbikge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7XG4gICAgICB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbiB1bnJlZ2lzdGVySGVscGVyKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5oZWxwZXJzW25hbWVdO1xuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24gcmVnaXN0ZXJQYXJ0aWFsKG5hbWUsIHBhcnRpYWwpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHBhcnRpYWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdBdHRlbXB0aW5nIHRvIHJlZ2lzdGVyIGEgcGFydGlhbCBhcyB1bmRlZmluZWQnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBwYXJ0aWFsO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uIHVucmVnaXN0ZXJQYXJ0aWFsKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5wYXJ0aWFsc1tuYW1lXTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0SGVscGVycyhpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gQSBtaXNzaW5nIGZpZWxkIGluIGEge3tmb299fSBjb25zdHVjdC5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ01pc3NpbmcgaGVscGVyOiBcIicgKyBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdLm5hbWUgKyAnXCInKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmIChjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgICAgICAgb3B0aW9ucy5pZHMgPSBbb3B0aW9ucy5uYW1lXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMubmFtZSk7XG4gICAgICAgIG9wdGlvbnMgPSB7IGRhdGE6IGRhdGEgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ011c3QgcGFzcyBpdGVyYXRvciB0byAjZWFjaCcpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sXG4gICAgICAgIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICByZXQgPSAnJyxcbiAgICAgICAgZGF0YSA9IHVuZGVmaW5lZCxcbiAgICAgICAgY29udGV4dFBhdGggPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICBjb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pICsgJy4nO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4ZWNJdGVyYXRpb24oZmllbGQsIGluZGV4LCBsYXN0KSB7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICBkYXRhLmtleSA9IGZpZWxkO1xuICAgICAgICBkYXRhLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGRhdGEuZmlyc3QgPSBpbmRleCA9PT0gMDtcbiAgICAgICAgZGF0YS5sYXN0ID0gISFsYXN0O1xuXG4gICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBjb250ZXh0UGF0aCArIGZpZWxkO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbZmllbGRdLCB7XG4gICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIGJsb2NrUGFyYW1zOiBVdGlscy5ibG9ja1BhcmFtcyhbY29udGV4dFtmaWVsZF0sIGZpZWxkXSwgW2NvbnRleHRQYXRoICsgZmllbGQsIG51bGxdKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IgKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGkgPCBqOyBpKyspIHtcbiAgICAgICAgICBleGVjSXRlcmF0aW9uKGksIGksIGkgPT09IGNvbnRleHQubGVuZ3RoIC0gMSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwcmlvcktleSA9IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIC8vIFdlJ3JlIHJ1bm5pbmcgdGhlIGl0ZXJhdGlvbnMgb25lIHN0ZXAgb3V0IG9mIHN5bmMgc28gd2UgY2FuIGRldGVjdFxuICAgICAgICAgICAgLy8gdGhlIGxhc3QgaXRlcmF0aW9uIHdpdGhvdXQgaGF2ZSB0byBzY2FuIHRoZSBvYmplY3QgdHdpY2UgYW5kIGNyZWF0ZVxuICAgICAgICAgICAgLy8gYW4gaXRlcm1lZGlhdGUga2V5cyBhcnJheS5cbiAgICAgICAgICAgIGlmIChwcmlvcktleSkge1xuICAgICAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpIC0gMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcmlvcktleSA9IGtleTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByaW9yS2V5KSB7XG4gICAgICAgICAgZXhlY0l0ZXJhdGlvbihwcmlvcktleSwgaSAtIDEsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24gKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7XG4gICAgICBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwgfHwgVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uIChjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHsgZm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNoIH0pO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKTtcbiAgICAgICAgb3B0aW9ucyA9IHsgZGF0YTogZGF0YSB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24gKG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBtZXNzYWdlKTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvb2t1cCcsIGZ1bmN0aW9uIChvYmosIGZpZWxkKSB7XG4gICAgcmV0dXJuIG9iaiAmJiBvYmpbZmllbGRdO1xuICB9KTtcbn1cblxudmFyIGxvZ2dlciA9IHtcbiAgbWV0aG9kTWFwOiB7IDA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InIH0sXG5cbiAgLy8gU3RhdGUgZW51bVxuICBERUJVRzogMCxcbiAgSU5GTzogMSxcbiAgV0FSTjogMixcbiAgRVJST1I6IDMsXG4gIGxldmVsOiAxLFxuXG4gIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24gbG9nKGxldmVsLCBtZXNzYWdlKSB7XG4gICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBsb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBsb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIChjb25zb2xlW21ldGhvZF0gfHwgY29uc29sZS5sb2cpLmNhbGwoY29uc29sZSwgbWVzc2FnZSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc29sZVxuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0cy5sb2dnZXIgPSBsb2dnZXI7XG52YXIgbG9nID0gbG9nZ2VyLmxvZztcblxuZXhwb3J0cy5sb2cgPSBsb2c7XG5cbmZ1bmN0aW9uIGNyZWF0ZUZyYW1lKG9iamVjdCkge1xuICB2YXIgZnJhbWUgPSBVdGlscy5leHRlbmQoe30sIG9iamVjdCk7XG4gIGZyYW1lLl9wYXJlbnQgPSBvYmplY3Q7XG4gIHJldHVybiBmcmFtZTtcbn1cblxuLyogW2FyZ3MsIF1vcHRpb25zICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbmZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlLCBub2RlKSB7XG4gIHZhciBsb2MgPSBub2RlICYmIG5vZGUubG9jLFxuICAgICAgbGluZSA9IHVuZGVmaW5lZCxcbiAgICAgIGNvbHVtbiA9IHVuZGVmaW5lZDtcbiAgaWYgKGxvYykge1xuICAgIGxpbmUgPSBsb2Muc3RhcnQubGluZTtcbiAgICBjb2x1bW4gPSBsb2Muc3RhcnQuY29sdW1uO1xuXG4gICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBjb2x1bW47XG4gIH1cblxuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgRXhjZXB0aW9uKTtcbiAgfVxuXG4gIGlmIChsb2MpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gY29sdW1uO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gRXhjZXB0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuLypnbG9iYWwgd2luZG93ICovXG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGZ1bmN0aW9uIChIYW5kbGViYXJzKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIHZhciByb290ID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3csXG4gICAgICAkSGFuZGxlYmFycyA9IHJvb3QuSGFuZGxlYmFycztcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgSGFuZGxlYmFycy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChyb290LkhhbmRsZWJhcnMgPT09IEhhbmRsZWJhcnMpIHtcbiAgICAgIHJvb3QuSGFuZGxlYmFycyA9ICRIYW5kbGViYXJzO1xuICAgIH1cbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5jaGVja1JldmlzaW9uID0gY2hlY2tSZXZpc2lvbjtcblxuLy8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuZXhwb3J0cy53cmFwUHJvZ3JhbSA9IHdyYXBQcm9ncmFtO1xuZXhwb3J0cy5yZXNvbHZlUGFydGlhbCA9IHJlc29sdmVQYXJ0aWFsO1xuZXhwb3J0cy5pbnZva2VQYXJ0aWFsID0gaW52b2tlUGFydGlhbDtcbmV4cG9ydHMubm9vcCA9IG5vb3A7XG5cbnZhciBfaW1wb3J0ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgVXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0KTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbmZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvICYmIGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgY3VycmVudFJldmlzaW9uID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuICcgKyAnUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIHJ1bnRpbWVWZXJzaW9ucyArICcpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVyVmVyc2lvbnMgKyAnKS4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiAnICsgJ1BsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVySW5mb1sxXSArICcpLicpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAoIWVudikge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdObyBlbnZpcm9ubWVudCBwYXNzZWQgdG8gdGVtcGxhdGUnKTtcbiAgfVxuICBpZiAoIXRlbXBsYXRlU3BlYyB8fCAhdGVtcGxhdGVTcGVjLm1haW4pIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVW5rbm93biB0ZW1wbGF0ZSBvYmplY3Q6ICcgKyB0eXBlb2YgdGVtcGxhdGVTcGVjKTtcbiAgfVxuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIGVudi5WTS5jaGVja1JldmlzaW9uKHRlbXBsYXRlU3BlYy5jb21waWxlcik7XG5cbiAgZnVuY3Rpb24gaW52b2tlUGFydGlhbFdyYXBwZXIocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICAgIGNvbnRleHQgPSBVdGlscy5leHRlbmQoe30sIGNvbnRleHQsIG9wdGlvbnMuaGFzaCk7XG4gICAgfVxuXG4gICAgcGFydGlhbCA9IGVudi5WTS5yZXNvbHZlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIHZhciByZXN1bHQgPSBlbnYuVk0uaW52b2tlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHJlc3VsdCA9PSBudWxsICYmIGVudi5jb21waWxlKSB7XG4gICAgICBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB0ZW1wbGF0ZVNwZWMuY29tcGlsZXJPcHRpb25zLCBlbnYpO1xuICAgICAgcmVzdWx0ID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHtcbiAgICAgIGlmIChvcHRpb25zLmluZGVudCkge1xuICAgICAgICB2YXIgbGluZXMgPSByZXN1bHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpbmVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGlmICghbGluZXNbaV0gJiYgaSArIDEgPT09IGwpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpbmVzW2ldID0gb3B0aW9ucy5pbmRlbnQgKyBsaW5lc1tpXTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSBsaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUaGUgcGFydGlhbCAnICsgb3B0aW9ucy5uYW1lICsgJyBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBzdHJpY3Q6IGZ1bmN0aW9uIHN0cmljdChvYmosIG5hbWUpIHtcbiAgICAgIGlmICghKG5hbWUgaW4gb2JqKSkge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnXCInICsgbmFtZSArICdcIiBub3QgZGVmaW5lZCBpbiAnICsgb2JqKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmpbbmFtZV07XG4gICAgfSxcbiAgICBsb29rdXA6IGZ1bmN0aW9uIGxvb2t1cChkZXB0aHMsIG5hbWUpIHtcbiAgICAgIHZhciBsZW4gPSBkZXB0aHMubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoZGVwdGhzW2ldICYmIGRlcHRoc1tpXVtuYW1lXSAhPSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIGRlcHRoc1tpXVtuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgbGFtYmRhOiBmdW5jdGlvbiBsYW1iZGEoY3VycmVudCwgY29udGV4dCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBjdXJyZW50ID09PSAnZnVuY3Rpb24nID8gY3VycmVudC5jYWxsKGNvbnRleHQpIDogY3VycmVudDtcbiAgICB9LFxuXG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcblxuICAgIGZuOiBmdW5jdGlvbiBmbihpKSB7XG4gICAgICByZXR1cm4gdGVtcGxhdGVTcGVjW2ldO1xuICAgIH0sXG5cbiAgICBwcm9ncmFtczogW10sXG4gICAgcHJvZ3JhbTogZnVuY3Rpb24gcHJvZ3JhbShpLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldLFxuICAgICAgICAgIGZuID0gdGhpcy5mbihpKTtcbiAgICAgIGlmIChkYXRhIHx8IGRlcHRocyB8fCBibG9ja1BhcmFtcyB8fCBkZWNsYXJlZEJsb2NrUGFyYW1zKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gd3JhcFByb2dyYW0odGhpcywgaSwgZm4sIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gd3JhcFByb2dyYW0odGhpcywgaSwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH0sXG5cbiAgICBkYXRhOiBmdW5jdGlvbiBkYXRhKHZhbHVlLCBkZXB0aCkge1xuICAgICAgd2hpbGUgKHZhbHVlICYmIGRlcHRoLS0pIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5fcGFyZW50O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uIG1lcmdlKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIHZhciBvYmogPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgcGFyYW0gIT09IGNvbW1vbikge1xuICAgICAgICBvYmogPSBVdGlscy5leHRlbmQoe30sIGNvbW1vbiwgcGFyYW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG5cbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IHRlbXBsYXRlU3BlYy5jb21waWxlclxuICB9O1xuXG4gIGZ1bmN0aW9uIHJldChjb250ZXh0KSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzFdO1xuXG4gICAgdmFyIGRhdGEgPSBvcHRpb25zLmRhdGE7XG5cbiAgICByZXQuX3NldHVwKG9wdGlvbnMpO1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsICYmIHRlbXBsYXRlU3BlYy51c2VEYXRhKSB7XG4gICAgICBkYXRhID0gaW5pdERhdGEoY29udGV4dCwgZGF0YSk7XG4gICAgfVxuICAgIHZhciBkZXB0aHMgPSB1bmRlZmluZWQsXG4gICAgICAgIGJsb2NrUGFyYW1zID0gdGVtcGxhdGVTcGVjLnVzZUJsb2NrUGFyYW1zID8gW10gOiB1bmRlZmluZWQ7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMpIHtcbiAgICAgIGRlcHRocyA9IG9wdGlvbnMuZGVwdGhzID8gW2NvbnRleHRdLmNvbmNhdChvcHRpb25zLmRlcHRocykgOiBbY29udGV4dF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRlbXBsYXRlU3BlYy5tYWluLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgfVxuICByZXQuaXNUb3AgPSB0cnVlO1xuXG4gIHJldC5fc2V0dXAgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBjb250YWluZXIuaGVscGVycyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLmhlbHBlcnMsIGVudi5oZWxwZXJzKTtcblxuICAgICAgaWYgKHRlbXBsYXRlU3BlYy51c2VQYXJ0aWFsKSB7XG4gICAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLnBhcnRpYWxzLCBlbnYucGFydGlhbHMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuaGVscGVycyA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IG9wdGlvbnMucGFydGlhbHM7XG4gICAgfVxuICB9O1xuXG4gIHJldC5fY2hpbGQgPSBmdW5jdGlvbiAoaSwgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlQmxvY2tQYXJhbXMgJiYgIWJsb2NrUGFyYW1zKSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnbXVzdCBwYXNzIGJsb2NrIHBhcmFtcycpO1xuICAgIH1cbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocyAmJiAhZGVwdGhzKSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnbXVzdCBwYXNzIHBhcmVudCBkZXB0aHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCB0ZW1wbGF0ZVNwZWNbaV0sIGRhdGEsIDAsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICB9O1xuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiB3cmFwUHJvZ3JhbShjb250YWluZXIsIGksIGZuLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gIGZ1bmN0aW9uIHByb2coY29udGV4dCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1sxXTtcblxuICAgIHJldHVybiBmbi5jYWxsKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgb3B0aW9ucy5kYXRhIHx8IGRhdGEsIGJsb2NrUGFyYW1zICYmIFtvcHRpb25zLmJsb2NrUGFyYW1zXS5jb25jYXQoYmxvY2tQYXJhbXMpLCBkZXB0aHMgJiYgW2NvbnRleHRdLmNvbmNhdChkZXB0aHMpKTtcbiAgfVxuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gZGVwdGhzID8gZGVwdGhzLmxlbmd0aCA6IDA7XG4gIHByb2cuYmxvY2tQYXJhbXMgPSBkZWNsYXJlZEJsb2NrUGFyYW1zIHx8IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlUGFydGlhbChwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gIGlmICghcGFydGlhbCkge1xuICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV07XG4gIH0gZWxzZSBpZiAoIXBhcnRpYWwuY2FsbCAmJiAhb3B0aW9ucy5uYW1lKSB7XG4gICAgLy8gVGhpcyBpcyBhIGR5bmFtaWMgcGFydGlhbCB0aGF0IHJldHVybmVkIGEgc3RyaW5nXG4gICAgb3B0aW9ucy5uYW1lID0gcGFydGlhbDtcbiAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1twYXJ0aWFsXTtcbiAgfVxuICByZXR1cm4gcGFydGlhbDtcbn1cblxuZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMucGFydGlhbCA9IHRydWU7XG5cbiAgaWYgKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUaGUgcGFydGlhbCAnICsgb3B0aW9ucy5uYW1lICsgJyBjb3VsZCBub3QgYmUgZm91bmQnKTtcbiAgfSBlbHNlIGlmIChwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBub29wKCkge1xuICByZXR1cm4gJyc7XG59XG5cbmZ1bmN0aW9uIGluaXREYXRhKGNvbnRleHQsIGRhdGEpIHtcbiAgaWYgKCFkYXRhIHx8ICEoJ3Jvb3QnIGluIGRhdGEpKSB7XG4gICAgZGF0YSA9IGRhdGEgPyBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5jcmVhdGVGcmFtZShkYXRhKSA6IHt9O1xuICAgIGRhdGEucm9vdCA9IGNvbnRleHQ7XG4gIH1cbiAgcmV0dXJuIGRhdGE7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbmZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufVxuXG5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IFNhZmVTdHJpbmcucHJvdG90eXBlLnRvSFRNTCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICcnICsgdGhpcy5zdHJpbmc7XG59O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBTYWZlU3RyaW5nO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7XG5cbi8vIE9sZGVyIElFIHZlcnNpb25zIGRvIG5vdCBkaXJlY3RseSBzdXBwb3J0IGluZGV4T2Ygc28gd2UgbXVzdCBpbXBsZW1lbnQgb3VyIG93biwgc2FkbHkuXG5leHBvcnRzLmluZGV4T2YgPSBpbmRleE9mO1xuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtcbmV4cG9ydHMuaXNFbXB0eSA9IGlzRW1wdHk7XG5leHBvcnRzLmJsb2NrUGFyYW1zID0gYmxvY2tQYXJhbXM7XG5leHBvcnRzLmFwcGVuZENvbnRleHRQYXRoID0gYXBwZW5kQ29udGV4dFBhdGg7XG52YXIgZXNjYXBlID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gICdcXCcnOiAnJiN4Mjc7JyxcbiAgJ2AnOiAnJiN4NjA7J1xufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nLFxuICAgIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKG9iaiAvKiAsIC4uLnNvdXJjZSAqLykge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZXhwb3J0cy50b1N0cmluZyA9IHRvU3RyaW5nO1xuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxuLyplc2xpbnQtZGlzYWJsZSBmdW5jLXN0eWxlLCBuby12YXIgKi9cbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG4vKmVzbGludC1lbmFibGUgZnVuYy1zdHlsZSwgbm8tdmFyICovXG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07ZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGFycmF5W2ldID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgJiYgc3RyaW5nLnRvSFRNTCkge1xuICAgICAgcmV0dXJuIHN0cmluZy50b0hUTUwoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nICsgJyc7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmc7XG4gIH1cblxuICBpZiAoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmc7XG4gIH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSkge1xuICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJsb2NrUGFyYW1zKHBhcmFtcywgaWRzKSB7XG4gIHBhcmFtcy5wYXRoID0gaWRzO1xuICByZXR1cm4gcGFyYW1zO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRDb250ZXh0UGF0aChjb250ZXh0UGF0aCwgaWQpIHtcbiAgcmV0dXJuIChjb250ZXh0UGF0aCA/IGNvbnRleHRQYXRoICsgJy4nIDogJycpICsgaWQ7XG59IiwiLy8gQ3JlYXRlIGEgc2ltcGxlIHBhdGggYWxpYXMgdG8gYWxsb3cgYnJvd3NlcmlmeSB0byByZXNvbHZlXG4vLyB0aGUgcnVudGltZSBvbiBhIHN1cHBvcnRlZCBwYXRoLlxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZScpWydkZWZhdWx0J107XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIilbXCJkZWZhdWx0XCJdO1xuIiwidmFyIGJhc2VUb1N0cmluZyA9IHJlcXVpcmUoJy4uL2ludGVybmFsL2Jhc2VUb1N0cmluZycpO1xuXG4vKipcbiAqIENhcGl0YWxpemVzIHRoZSBmaXJzdCBjaGFyYWN0ZXIgb2YgYHN0cmluZ2AuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBTdHJpbmdcbiAqIEBwYXJhbSB7c3RyaW5nfSBbc3RyaW5nPScnXSBUaGUgc3RyaW5nIHRvIGNhcGl0YWxpemUuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBjYXBpdGFsaXplZCBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uY2FwaXRhbGl6ZSgnZnJlZCcpO1xuICogLy8gPT4gJ0ZyZWQnXG4gKi9cbmZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7XG4gIHN0cmluZyA9IGJhc2VUb1N0cmluZyhzdHJpbmcpO1xuICByZXR1cm4gc3RyaW5nICYmIChzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc2xpY2UoMSkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNhcGl0YWxpemU7XG4iLCIvKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBzdHJpbmcgaWYgaXQncyBub3Qgb25lLiBBbiBlbXB0eSBzdHJpbmcgaXMgcmV0dXJuZWRcbiAqIGZvciBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgdmFsdWVzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBiYXNlVG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6ICh2YWx1ZSArICcnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlVG9TdHJpbmc7XG4iLCIvLyBBdm9pZCBjb25zb2xlIGVycm9ycyBmb3IgdGhlIElFIGNyYXBweSBicm93c2Vyc1xuaWYgKCAhIHdpbmRvdy5jb25zb2xlICkgY29uc29sZSA9IHsgbG9nOiBmdW5jdGlvbigpe30gfTtcblxuaW1wb3J0IEFwcCBmcm9tICdBcHAnXG5pbXBvcnQgJCBmcm9tICdqcXVlcnknXG5pbXBvcnQgVHdlZW5NYXggZnJvbSAnZ3NhcCdcbmltcG9ydCByYWYgZnJvbSAncmFmJ1xuaW1wb3J0IHBpeGkgZnJvbSAncGl4aS5qcydcbmltcG9ydCBQcmVsb2FkZXIgZnJvbSAnUHJlbG9hZGVyJ1xuXG53aW5kb3cuUHJlbG9hZGVyID0gbmV3IFByZWxvYWRlcigpXG53aW5kb3cualF1ZXJ5ID0gd2luZG93LiQgPSAkXG5cbi8vIFN0YXJ0IEFwcFxudmFyIGFwcCA9IG5ldyBBcHAoKVxuYXBwLmluaXQoKVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBUZW1wbGF0ZSBmcm9tICdBcHBUZW1wbGF0ZSdcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuaW1wb3J0IEdFdmVudHMgZnJvbSAnR2xvYmFsRXZlbnRzJ1xuaW1wb3J0IFBvb2wgZnJvbSAnUG9vbCdcblxuY2xhc3MgQXBwIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdH1cblx0aW5pdCgpIHtcblxuXHRcdC8vIEluaXQgUG9vbFxuXHRcdEFwcFN0b3JlLlBvb2wgPSBuZXcgUG9vbCgpXG5cblx0XHQvLyBJbml0IHJvdXRlclxuXHRcdHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpXG5cdFx0dGhpcy5yb3V0ZXIuaW5pdCgpXG5cblx0XHQvLyBJbml0IGdsb2JhbCBldmVudHNcblx0XHR3aW5kb3cuR2xvYmFsRXZlbnRzID0gbmV3IEdFdmVudHMoKVxuXHRcdEdsb2JhbEV2ZW50cy5pbml0KClcblxuXHRcdHZhciBhcHBUZW1wbGF0ZSA9IG5ldyBBcHBUZW1wbGF0ZSgpXG5cdFx0dGhpcy50ZW1wbGF0ZUlzUmVhZHkgPSB0aGlzLnRlbXBsYXRlSXNSZWFkeS5iaW5kKHRoaXMpXG5cdFx0YXBwVGVtcGxhdGUuaXNSZWFkeSA9IHRoaXMudGVtcGxhdGVJc1JlYWR5XG5cdFx0YXBwVGVtcGxhdGUucmVuZGVyKCcjYXBwLWNvbnRhaW5lcicpXG5cdH1cblx0dGVtcGxhdGVJc1JlYWR5KCkge1xuXHRcdC8vIFN0YXJ0IHJvdXRpbmdcblx0XHR0aGlzLnJvdXRlci5iZWdpblJvdXRpbmcoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFwcFxuICAgIFx0XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IEZyb250Q29udGFpbmVyIGZyb20gJ0Zyb250Q29udGFpbmVyJ1xuaW1wb3J0IFBhZ2VzQ29udGFpbmVyIGZyb20gJ1BhZ2VzQ29udGFpbmVyJ1xuaW1wb3J0IFBYQ29udGFpbmVyIGZyb20gJ1BYQ29udGFpbmVyJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuXG5jbGFzcyBBcHBUZW1wbGF0ZSBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5pc1JlYWR5ID0gdW5kZWZpbmVkXG5cdFx0QXBwU3RvcmUub24oQXBwQ29uc3RhbnRzLldJTkRPV19SRVNJWkUsIHRoaXMucmVzaXplKVxuXHR9XG5cdHJlbmRlcihwYXJlbnQpIHtcblx0XHRzdXBlci5yZW5kZXIoJ0FwcFRlbXBsYXRlJywgcGFyZW50LCB1bmRlZmluZWQpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5mcm9udENvbnRhaW5lciA9IG5ldyBGcm9udENvbnRhaW5lcigpXG5cdFx0dGhpcy5mcm9udENvbnRhaW5lci5yZW5kZXIoJyNhcHAtdGVtcGxhdGUnKVxuXG5cdFx0dGhpcy5wYWdlc0NvbnRhaW5lciA9IG5ldyBQYWdlc0NvbnRhaW5lcigpXG5cdFx0dGhpcy5wYWdlc0NvbnRhaW5lci5yZW5kZXIoJyNhcHAtdGVtcGxhdGUnKVxuXG5cdFx0dGhpcy5weENvbnRhaW5lciA9IG5ldyBQWENvbnRhaW5lcigpXG5cdFx0dGhpcy5weENvbnRhaW5lci5pbml0KCcjYXBwLXRlbXBsYXRlJylcblx0XHRBcHBBY3Rpb25zLnB4Q29udGFpbmVySXNSZWFkeSh0aGlzLnB4Q29udGFpbmVyKVxuXG5cdFx0R2xvYmFsRXZlbnRzLnJlc2l6ZSgpXG5cblx0XHR0aGlzLmFuaW1hdGUoKVxuXG5cdFx0c2V0VGltZW91dCgoKT0+e3RoaXMuaXNSZWFkeSgpfSwgMClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cblx0YW5pbWF0ZSgpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRlKVxuXHQgICAgdGhpcy5weENvbnRhaW5lci51cGRhdGUoKVxuXHQgICAgdGhpcy5wYWdlc0NvbnRhaW5lci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR0aGlzLmZyb250Q29udGFpbmVyLnJlc2l6ZSgpXG5cdFx0dGhpcy5weENvbnRhaW5lci5yZXNpemUoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFwcFRlbXBsYXRlXG4iLCJpbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBEaXNwYXRjaGVyIGZyb20gJ0FwcERpc3BhdGNoZXInXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmZ1bmN0aW9uIF9wcm9jZWVkSGFzaGVyQ2hhbmdlQWN0aW9uKHBhZ2VJZCkge1xuICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VELFxuICAgICAgICBpdGVtOiBwYWdlSWRcbiAgICB9KSAgXG59XG52YXIgQXBwQWN0aW9ucyA9IHtcbiAgICBwYWdlSGFzaGVyQ2hhbmdlZDogZnVuY3Rpb24ocGFnZUlkKSB7XG4gICAgICAgIHZhciBtYW5pZmVzdCA9IEFwcFN0b3JlLnBhZ2VBc3NldHNUb0xvYWQoKVxuICAgICAgICBpZihtYW5pZmVzdC5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICBfcHJvY2VlZEhhc2hlckNoYW5nZUFjdGlvbihwYWdlSWQpXG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgUHJlbG9hZGVyLmxvYWQobWFuaWZlc3QsICgpPT57XG4gICAgICAgICAgICAgICAgX3Byb2NlZWRIYXNoZXJDaGFuZ2VBY3Rpb24ocGFnZUlkKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH0sXG4gICAgd2luZG93UmVzaXplOiBmdW5jdGlvbih3aW5kb3dXLCB3aW5kb3dIKSB7XG4gICAgICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuV0lORE9XX1JFU0laRSxcbiAgICAgICAgICAgIGl0ZW06IHsgd2luZG93Vzp3aW5kb3dXLCB3aW5kb3dIOndpbmRvd0ggfVxuICAgICAgICB9KVxuICAgIH0sXG4gICAgcHhDb250YWluZXJJc1JlYWR5OiBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfSVNfUkVBRFksXG4gICAgICAgICAgICBpdGVtOiBjb21wb25lbnRcbiAgICAgICAgfSkgICAgICAgICAgICBcbiAgICB9LFxuICAgIHB4QWRkQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0FERF9DSElMRCxcbiAgICAgICAgICAgIGl0ZW06IHtjaGlsZDogY2hpbGR9XG4gICAgICAgIH0pICAgICAgICAgICAgXG4gICAgfSxcbiAgICBweFJlbW92ZUNoaWxkOiBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQsXG4gICAgICAgICAgICBpdGVtOiB7Y2hpbGQ6IGNoaWxkfVxuICAgICAgICB9KSAgICAgICAgICAgIFxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQXBwQWN0aW9uc1xuXG5cbiAgICAgIFxuIiwiaW1wb3J0IFBhZ2UgZnJvbSAnUGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJhc2VQbGFuZXRQYWdlIGV4dGVuZHMgUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdFx0dGhpcy5leHBlcmllbmNlID0gdW5kZWZpbmVkXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMuZXhwZXJpZW5jZS5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBFeHBsb3Npb25FZmZlY3QgZnJvbSAnRXhwbG9zaW9uRWZmZWN0J1xuaW1wb3J0IFNwcmluZ0dhcmRlbiBmcm9tICdTcHJpbmdHYXJkZW4nXG5pbXBvcnQgQ29tcGFzc1JpbmdzIGZyb20gJ0NvbXBhc3NSaW5ncydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGFzcyB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lciA9IHB4Q29udGFpbmVyXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cblx0XHR0aGlzLmNvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmNvbnRhaW5lcilcblxuXHRcdHZhciBpbWdVcmwgPSAnaW1hZ2UvY29tcGFzcy5wbmcnXG4gXHRcdHZhciB0ZXh0dXJlID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZShpbWdVcmwpXG4gXHRcdHRoaXMuc3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKHRleHR1cmUpXG4gXHRcdHRoaXMuc3ByaXRlU2l6ZSA9IFs5OTcsIDEwMTldXG4gXHRcdHRoaXMuc3ByaXRlLm9yaWdpbmFsVyA9IHRoaXMuc3ByaXRlU2l6ZVswXVxuIFx0XHR0aGlzLnNwcml0ZS5vcmlnaW5hbEggPSB0aGlzLnNwcml0ZVNpemVbMV1cbiBcdFx0Ly8gdGhpcy5zcHJpdGUuYW5jaG9yLnNldCgwLjUsIDAuNSlcbiBcdFx0Ly8gdGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5zcHJpdGUpXG4gXHRcdHZhciBzY2FsZSA9IDAuNVxuIFx0XHR0aGlzLnNwcml0ZS53aWR0aCA9IHRoaXMuc3ByaXRlLm9yaWdpbmFsVyAqIHNjYWxlXG4gXHRcdHRoaXMuc3ByaXRlLmhlaWdodCA9IHRoaXMuc3ByaXRlLm9yaWdpbmFsSCAqIHNjYWxlXG5cbiBcdFx0dGhpcy5yaW5ncyA9IG5ldyBDb21wYXNzUmluZ3ModGhpcy5jb250YWluZXIpXG5cdCBcdHRoaXMucmluZ3MuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdCBcdHZhciBza2lEYXRhID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZCgnc2tpJylcblx0IFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblxuIFx0XHR0aGlzLnBsYW5ldHMgPSBbXVxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0IFx0XHR2YXIgcCA9IHt9XG5cdCBcdFx0dmFyIHBsYW5ldElkID0gcGxhbmV0c1tpXVxuXHQgXHRcdHZhciBwbGFuZXREYXRhID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZChwbGFuZXRJZClcblx0IFx0XHRwLnByb2R1Y3RzID0gW11cblx0IFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHBsYW5ldERhdGEubGVuZ3RoOyBqKyspIHtcblx0IFx0XHRcdHZhciBwcm9kdWN0ID0gcGxhbmV0RGF0YVtqXVxuXHQgXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IG5ldyBTcHJpbmdHYXJkZW4odGhpcy5jb250YWluZXIsIHByb2R1Y3Qua25vdHMsIHByb2R1Y3QuY29sb3IpXG4gXHRcdFx0XHRzcHJpbmdHYXJkZW4uY29tcG9uZW50RGlkTW91bnQoKVxuIFx0XHRcdFx0cC5wcm9kdWN0c1tqXSA9IHNwcmluZ0dhcmRlblxuXHQgXHRcdH07XG5cdCBcdFx0cC5pZCA9IHBsYW5ldElkXG5cdCBcdFx0dGhpcy5wbGFuZXRzW2ldID0gcFxuXHQgXHR9XG5cbiBcdFx0Ly8gdmFyIHByb2R1Y3RzID0gc2tpRGF0YVxuIFx0XHQvLyBmb3IgKHZhciBpID0gMDsgaSA8IHByb2R1Y3RzLmxlbmd0aDsgaSsrKSB7XG4gXHRcdC8vIFx0dmFyIHByb2R1Y3QgPSBwcm9kdWN0c1tpXVxuIFx0XHQvLyBcdHZhciBzcHJpbmdHYXJkZW4gPSBuZXcgU3ByaW5nR2FyZGVuKHRoaXMuY29udGFpbmVyLCBwcm9kdWN0Lmtub3RzLCBwcm9kdWN0LmNvbG9yKVxuIFx0XHQvLyBcdHNwcmluZ0dhcmRlbi5jb21wb25lbnREaWRNb3VudCgpXG4gXHRcdC8vIFx0dGhpcy5wcm9kdWN0U3ByaW5nR2FyZGVuc1tpXSA9IHNwcmluZ0dhcmRlblxuIFx0XHQvLyB9XG5cbiBcdFx0c2V0VGltZW91dCgoKT0+e1xuIFx0XHRcdHRoaXMuaGlnaGxpZ2h0UGxhbmV0KCdhbGFza2EnKVxuIFx0XHR9LCAxMDAwKVxuXG5cbiBcdC8vIFx0dGhpcy5leHBsb3Npb25Db25maWcgPSB7XG5cdFx0Ly8gICAgIGFuaW1hdGlvbjogMCxcblx0XHQvLyAgICAgd2F2ZTogMC4xLFxuXHRcdC8vICAgICBzaGFrZTogMC4wLFxuXHRcdC8vICAgICBzY3JlZW5FZmZlY3Q6IDAuNCxcblx0XHQvLyAgICAgc3ByaXRlOiB0aGlzLnNwcml0ZSxcblx0XHQvLyAgICAgc2hvb3Q6ICgpPT4ge1xuXHRcdC8vICAgICAgICAgVHdlZW5NYXguZnJvbVRvKHRoaXMuZXhwbG9zaW9uQ29uZmlnLCA0LCB7YW5pbWF0aW9uOiAwfSwge2FuaW1hdGlvbjogMSwgZWFzZTpFeHBvLmVhc2VPdXR9KTtcblx0XHQvLyAgICAgfSxcblx0XHQvLyAgICAgaG92ZXJBbmltYXRpb246IDBcblx0XHQvLyB9XG4gXHQvLyBcdHRoaXMuZXhwbG9zaW9uRWZmZWN0ID0gbmV3IEV4cGxvc2lvbkVmZmVjdCh0aGlzLmV4cGxvc2lvbkNvbmZpZylcbiBcdC8vIFx0dGhpcy5leHBsb3Npb25FZmZlY3QuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdCAgICAvLyBzZXRJbnRlcnZhbCgoKT0+e1xuXHQgICAgLy8gXHR0aGlzLmV4cGxvc2lvbkNvbmZpZy5zaG9vdCgpXG5cdCAgICAvLyB9LCA0MDAwKVxuXHR9XG5cdGhpZ2hsaWdodFBsYW5ldChpZCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcGxhbmV0ID0gdGhpcy5wbGFuZXRzW2ldXG5cdFx0XHR2YXIgbGVuID0gcGxhbmV0LnByb2R1Y3RzLmxlbmd0aFxuXHRcdFx0aWYocGxhbmV0LmlkID09IGlkKSB7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGxlbjsgaisrKSB7XG5cdFx0XHRcdFx0dmFyIGdhcmRlbiA9IHBsYW5ldC5wcm9kdWN0c1tqXVxuXHRcdFx0XHRcdGdhcmRlbi5vcGVuKClcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdH1lbHNle1xuXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgbGVuOyBqKyspIHtcblx0XHRcdFx0XHR2YXIgZ2FyZGVuID0gcGxhbmV0LnByb2R1Y3RzW2pdXG5cdFx0XHRcdFx0Z2FyZGVuLmNsb3NlKClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHQvLyB0aGlzLmV4cGxvc2lvbkVmZmVjdC51cGRhdGUoKVxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucGxhbmV0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHBsYW5ldCA9IHRoaXMucGxhbmV0c1tpXVxuXHRcdFx0dmFyIGxlbiA9IHBsYW5ldC5wcm9kdWN0cy5sZW5ndGhcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgbGVuOyBqKyspIHtcblx0XHRcdFx0dmFyIGdhcmRlbiA9IHBsYW5ldC5wcm9kdWN0c1tqXVxuXHRcdFx0XHRnYXJkZW4udXBkYXRlKClcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIHNpemVQZXJjZW50YWdlID0gMC4zXG5cdFx0Ly8gdmFyIHJhZGl1cyA9IChBcHBTdG9yZS5PcmllbnRhdGlvbiA9PSBBcHBDb25zdGFudHMuTEFORFNDQVBFKSA/ICh3aW5kb3dXICogc2l6ZVBlcmNlbnRhZ2UpIDogKHdpbmRvd0ggKiBzaXplUGVyY2VudGFnZSlcblx0XHQvLyB0aGlzLmV4cGxvc2lvbkVmZmVjdC5yZXNpemUoKVxuXHRcdHZhciByYWRpdXMgPSB3aW5kb3dIICogc2l6ZVBlcmNlbnRhZ2Vcblx0XHR0aGlzLnJpbmdzLnJlc2l6ZShyYWRpdXMpXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucGxhbmV0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHBsYW5ldCA9IHRoaXMucGxhbmV0c1tpXVxuXHRcdFx0dmFyIGxlbiA9IHBsYW5ldC5wcm9kdWN0cy5sZW5ndGhcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgbGVuOyBqKyspIHtcblx0XHRcdFx0dmFyIGdhcmRlbiA9IHBsYW5ldC5wcm9kdWN0c1tqXVxuXHRcdFx0XHRnYXJkZW4ucmVzaXplKHJhZGl1cylcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLmNvbnRhaW5lci54ID0gKHdpbmRvd1cgPj4gMSlcblx0XHR0aGlzLmNvbnRhaW5lci55ID0gKHdpbmRvd0ggPj4gMSlcblxuXHRcdC8vIHRoaXMuc3ByaXRlLnggPSAod2luZG93VyA+PiAxKSAtICh0aGlzLnNwcml0ZS53aWR0aCA+PiAxKVxuXHRcdC8vIHRoaXMuc3ByaXRlLnkgPSAod2luZG93SCA+PiAxKSAtICh0aGlzLnNwcml0ZS5oZWlnaHQgPj4gMSlcblx0XHQvLyB0aGlzLnNwcml0ZS54ID0gKHdpbmRvd1cgPj4gMSlcblx0XHQvLyB0aGlzLnNwcml0ZS55ID0gKHdpbmRvd0ggPj4gMSlcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbXBhc3NSaW5ncyB7XG5cdGNvbnN0cnVjdG9yKHBhcmVudENvbnRhaW5lcikge1xuXHRcdHRoaXMuY29udGFpbmVyID0gcGFyZW50Q29udGFpbmVyXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5yaW5nc0NvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0dGhpcy50aXRsZXNDb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHRcdHRoaXMuZ2VuZGVyQ29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnJpbmdzQ29udGFpbmVyKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMudGl0bGVzQ29udGFpbmVyKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuZ2VuZGVyQ29udGFpbmVyKVxuXG5cdFx0dGhpcy5jaXJjbGVzID0gW11cblx0XHR2YXIgY2ljbGVzTGVuID0gNlxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY2ljbGVzTGVuOyBpKyspIHtcblx0XHRcdHZhciBnID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdFx0dGhpcy5jaXJjbGVzLnB1c2goZylcblx0XHRcdHRoaXMucmluZ3NDb250YWluZXIuYWRkQ2hpbGQoZylcblx0XHR9XG5cblx0XHR0aGlzLnRpdGxlcyA9IFtdXG5cdFx0dGhpcy5nZW5kZXJzID0gW11cblx0XHR2YXIgZ2xvYmFsQ29udGVudCA9IEFwcFN0b3JlLmdsb2JhbENvbnRlbnQoKVxuXHRcdHZhciBlbGVtZW50cyA9IEFwcFN0b3JlLmVsZW1lbnRzT2ZOYXR1cmUoKVxuXHRcdHZhciBhbGxHZW5kZXIgPSBBcHBTdG9yZS5hbGxHZW5kZXIoKVxuXHRcdHZhciBlbGVtZW50c1RleHRzID0gZ2xvYmFsQ29udGVudC5lbGVtZW50c1xuXHRcdHZhciBnZW5kZXJUZXh0cyA9IGdsb2JhbENvbnRlbnQuZ2VuZGVyXG5cdFx0dmFyIGZvbnRTaXplID0gMzBcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBlbGVtZW50SWQgPSBlbGVtZW50c1tpXVxuXHRcdFx0dmFyIGVsZW1lbnRUaXRsZSA9IGVsZW1lbnRzVGV4dHNbZWxlbWVudElkXS50b1VwcGVyQ2FzZSgpXG5cdFx0XHR2YXIgdHh0ID0gbmV3IFBJWEkuVGV4dChlbGVtZW50VGl0bGUsIHsgZm9udDogZm9udFNpemUgKyAncHggRnV0dXJhQm9sZCcsIGZpbGw6ICd3aGl0ZScsIGFsaWduOiAnY2VudGVyJyB9KVxuXHRcdFx0dHh0LmFuY2hvci54ID0gMC41XG5cdFx0XHR0eHQuYW5jaG9yLnkgPSAwLjVcblx0XHRcdHRoaXMudGl0bGVzQ29udGFpbmVyLmFkZENoaWxkKHR4dClcblx0XHRcdHRoaXMudGl0bGVzLnB1c2goe1xuXHRcdFx0XHR0eHQ6IHR4dCxcblx0XHRcdFx0ZGVnQmVnaW46IHRoaXMuZ2V0RGVncmVlc0JlZ2luRm9yVGl0bGVzQnlJZChlbGVtZW50SWQpLFxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFsbEdlbmRlci5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGdlbmRlcklkID0gYWxsR2VuZGVyW2ldXG5cdFx0XHR2YXIgZ2VuZGVyVGl0bGUgPSBnZW5kZXJUZXh0c1tnZW5kZXJJZF0udG9VcHBlckNhc2UoKVxuXHRcdFx0dmFyIHR4dCA9IG5ldyBQSVhJLlRleHQoZ2VuZGVyVGl0bGUsIHsgZm9udDogZm9udFNpemUgKyAncHggRnV0dXJhQm9sZCcsIGZpbGw6ICd3aGl0ZScsIGFsaWduOiAnY2VudGVyJyB9KVxuXHRcdFx0dHh0LmFuY2hvci54ID0gMC41XG5cdFx0XHR0eHQuYW5jaG9yLnkgPSAwLjVcblx0XHRcdHRoaXMuZ2VuZGVyQ29udGFpbmVyLmFkZENoaWxkKHR4dClcblx0XHRcdHRoaXMuZ2VuZGVycy5wdXNoKHtcblx0XHRcdFx0dHh0OiB0eHQsXG5cdFx0XHRcdGRlZ0JlZ2luOiB0aGlzLmdldERlZ3JlZXNCZWdpbkZvckdlbmRlckJ5SWQoZ2VuZGVySWQpLFxuXHRcdFx0fSlcblx0XHR9XG5cdH1cblx0Z2V0RGVncmVlc0JlZ2luRm9yVGl0bGVzQnlJZChpZCkge1xuXHRcdC8vIGJlIGNhcmVmdWwgc3RhcnRzIGZyb20gY2VudGVyIC05MGRlZ1xuXHRcdHN3aXRjaChpZCkge1xuXHRcdFx0Y2FzZSAnZmlyZSc6IHJldHVybiAtMTMwXG5cdFx0XHRjYXNlICdlYXJ0aCc6IHJldHVybiAtNTBcblx0XHRcdGNhc2UgJ21ldGFsJzogcmV0dXJuIDE1XG5cdFx0XHRjYXNlICd3YXRlcic6IHJldHVybiA5MFxuXHRcdFx0Y2FzZSAnd29vZCc6IHJldHVybiAxNjVcblx0XHR9XG5cdH1cblx0Z2V0RGVncmVlc0JlZ2luRm9yR2VuZGVyQnlJZChpZCkge1xuXHRcdC8vIGJlIGNhcmVmdWwgc3RhcnRzIGZyb20gY2VudGVyIC05MGRlZ1xuXHRcdHN3aXRjaChpZCkge1xuXHRcdFx0Y2FzZSAnbWFsZSc6IHJldHVybiAtMTUwXG5cdFx0XHRjYXNlICdmZW1hbGUnOiByZXR1cm4gLTMwXG5cdFx0XHRjYXNlICdhbmltYWwnOiByZXR1cm4gOTBcblx0XHR9XG5cdH1cblx0ZHJhd1JpbmdzKCkge1xuXHRcdHZhciByYWRpdXNNYXJnaW4gPSB0aGlzLnJhZGl1cyAvIHRoaXMuY2lyY2xlcy5sZW5ndGhcblx0XHR2YXIgbGVuID0gdGhpcy5jaXJjbGVzLmxlbmd0aCArIDFcblx0XHR2YXIgbGFzdFI7XG5cdFx0dmFyIGxpbmVXID0gQXBwU3RvcmUuZ2V0TGluZVdpZHRoKClcblx0XHR2YXIgY29sb3IgPSAweGZmZmZmZlxuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdHZhciBnID0gdGhpcy5jaXJjbGVzW2ktMV1cblx0XHRcdHZhciByO1xuXG5cdFx0XHRnLmNsZWFyKClcblxuXHRcdFx0Ly8gcmFkaXVzIGRpZmZlcmVuY2VzXG5cdFx0XHRpZihpID09IDEpIHIgPSByYWRpdXNNYXJnaW4gKiAwLjE4XG5cdFx0XHRlbHNlIGlmKGkgPT0gNCkgciA9IChsYXN0UiArIHJhZGl1c01hcmdpbikgKiAxLjE2XG5cdFx0XHRlbHNlIHIgPSBsYXN0UiArIHJhZGl1c01hcmdpblxuXG5cdFx0XHQvLyBsaW5lc1xuXHRcdFx0aWYoaT09Mykge1xuXHRcdFx0XHR0aGlzLmRyYXdBcm91bmRUaHJlZUdyb3VwTGluZXMobGFzdFIsIHIsIGcsIGxpbmVXLCBjb2xvcilcblx0XHRcdFx0dGhpcy5kcmF3R2VuZGVycyhyLCBjb2xvcilcblx0XHRcdH1cblx0XHRcdGlmKGk9PTYpIHtcblx0XHRcdFx0dGhpcy5kcmF3QXJvdW5kRm91ckdyb3VwTGluZXMobGFzdFIsIHIsIGcsIGxpbmVXLCBjb2xvcilcblx0XHRcdFx0dGhpcy5kcmF3VGl0bGVzKHIsIGNvbG9yKVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBjaXJjbGVcblx0XHRcdHRoaXMuZHJhd0NpcmNsZShnLCByKVxuXG5cdFx0XHRsYXN0UiA9IHJcblx0XHR9XG5cdH1cblx0ZHJhd0Fyb3VuZFRocmVlR3JvdXBMaW5lcyhsYXN0UiwgbmV3UiwgZywgbGluZVcsIGNvbG9yKSB7XG5cdFx0dmFyIGxlZnRUaGV0YSA9ICg3ICogTWF0aC5QSSkgLyA2XG5cdFx0dmFyIHJpZ2h0VGhldGEgPSAoMTEgKiBNYXRoLlBJKSAvIDZcblx0XHRcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgMCwgLW5ld1IsIDAsIC1sYXN0Uilcblx0XHRcblx0XHR2YXIgZnJvbVggPSBuZXdSICogTWF0aC5jb3MobGVmdFRoZXRhKVxuXHRcdHZhciBmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4obGVmdFRoZXRhKVxuXHRcdHZhciB0b1ggPSBsYXN0UiAqIE1hdGguY29zKGxlZnRUaGV0YSlcblx0XHR2YXIgdG9ZID0gLWxhc3RSICogTWF0aC5zaW4obGVmdFRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXG5cdFx0ZnJvbVggPSBuZXdSICogTWF0aC5jb3MocmlnaHRUaGV0YSlcblx0XHRmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4ocmlnaHRUaGV0YSlcblx0XHR0b1ggPSBsYXN0UiAqIE1hdGguY29zKHJpZ2h0VGhldGEpXG5cdFx0dG9ZID0gLWxhc3RSICogTWF0aC5zaW4ocmlnaHRUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblx0fVxuXHRkcmF3QXJvdW5kRm91ckdyb3VwTGluZXMobGFzdFIsIG5ld1IsIGcsIGxpbmVXLCBjb2xvcikge1xuXHRcdHZhciBsZWZ0VG9wVGhldGEgPSAoMTEgKiBNYXRoLlBJKSAvIDEyXG5cdFx0dmFyIHJpZ2h0VG9wVGhldGEgPSBNYXRoLlBJIC8gMTJcblxuXHRcdHZhciBsZWZ0Qm90dG9tVGhldGEgPSAoNSAqIE1hdGguUEkpIC8gNFxuXHRcdHZhciByaWdodEJvdHRvbVRoZXRhID0gKDcgKiBNYXRoLlBJKSAvIDRcblx0XHRcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgMCwgLW5ld1IsIDAsIC1sYXN0Uilcblx0XHRcblx0XHR2YXIgZnJvbVggPSBuZXdSICogTWF0aC5jb3MobGVmdFRvcFRoZXRhKVxuXHRcdHZhciBmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4obGVmdFRvcFRoZXRhKVxuXHRcdHZhciB0b1ggPSBsYXN0UiAqIE1hdGguY29zKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgdG9ZID0gLWxhc3RSICogTWF0aC5zaW4obGVmdFRvcFRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXG5cdFx0ZnJvbVggPSBuZXdSICogTWF0aC5jb3MocmlnaHRUb3BUaGV0YSlcblx0XHRmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4ocmlnaHRUb3BUaGV0YSlcblx0XHR0b1ggPSBsYXN0UiAqIE1hdGguY29zKHJpZ2h0VG9wVGhldGEpXG5cdFx0dG9ZID0gLWxhc3RSICogTWF0aC5zaW4ocmlnaHRUb3BUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRCb3R0b21UaGV0YSlcblx0XHRmcm9tWSA9IC1uZXdSICogTWF0aC5zaW4obGVmdEJvdHRvbVRoZXRhKVxuXHRcdHRvWCA9IGxhc3RSICogTWF0aC5jb3MobGVmdEJvdHRvbVRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0Qm90dG9tVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0Qm90dG9tVGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0Qm90dG9tVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cdH1cblx0ZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKSB7XG5cdFx0Zy5saW5lU3R5bGUobGluZVcsIGNvbG9yLCAxKVxuXHRcdGcuYmVnaW5GaWxsKGNvbG9yLCAwKVxuXHRcdGcubW92ZVRvKGZyb21YLCBmcm9tWSlcblx0XHRnLmxpbmVUbyh0b1gsIHRvWSlcblx0XHRnLmVuZEZpbGwoKVxuXHR9XG5cdGRyYXdDaXJjbGUoZywgcikge1xuXHRcdGcubGluZVN0eWxlKEFwcFN0b3JlLmdldExpbmVXaWR0aCgpLCAweGZmZmZmZiwgMSlcblx0XHRnLmJlZ2luRmlsbCgweGZmZmZmZiwgMClcblx0XHRcblx0XHRnLm1vdmVUbyhyLCAwKVxuXG5cdFx0dmFyIGFuZ2xlID0gMFxuXHRcdHZhciB4ID0gMFxuXHRcdHZhciB5ID0gMFxuXHRcdHZhciBnYXAgPSBNYXRoLm1pbigoMzAwIC8gdGhpcy5yYWRpdXMpICogNSwgMTApXG5cdFx0dmFyIHN0ZXBzID0gTWF0aC5yb3VuZCgzNjAgLyBnYXApXG5cdFx0Zm9yICh2YXIgaSA9IC0xOyBpIDwgc3RlcHM7IGkrKykge1xuXHRcdFx0YW5nbGUgPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKGkgKiBnYXApXG5cdFx0XHR4ID0gciAqIE1hdGguY29zKGFuZ2xlKVxuXHRcdFx0eSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRcdGcubGluZVRvKHgsIHkpXG5cdFx0fTtcblxuXHRcdC8vIGNsb3NlIGl0XG5cdFx0YW5nbGUgPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKDM2MClcblx0XHR4ID0gciAqIE1hdGguY29zKGFuZ2xlKVxuXHRcdHkgPSByICogTWF0aC5zaW4oYW5nbGUpXG5cdFx0Zy5saW5lVG8oeCwgeSlcblxuXHRcdGcuZW5kRmlsbCgpXG5cdH1cblx0ZHJhd1RpdGxlcyhyLCBjb2xvcikge1xuXHRcdHZhciB0aXRsZXMgPSB0aGlzLnRpdGxlc1xuXHRcdHZhciByID0gciArIDQ0XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aXRsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciB0aXRsZSA9IHRpdGxlc1tpXVxuXHRcdFx0dmFyIGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucyh0aXRsZS5kZWdCZWdpbilcblx0XHRcdHRpdGxlLnR4dC5yb3RhdGlvbiA9IGFuZ2xlICsgVXRpbHMuRGVncmVlc1RvUmFkaWFucyg5MClcblx0XHRcdHRpdGxlLnR4dC54ID0gciAqIE1hdGguY29zKGFuZ2xlKVxuXHRcdFx0dGl0bGUudHh0LnkgPSByICogTWF0aC5zaW4oYW5nbGUpXG5cdFx0fVxuXHR9XG5cdGRyYXdHZW5kZXJzKHIsIGNvbG9yKSB7XG5cdFx0dmFyIGdlbmRlcnMgPSB0aGlzLmdlbmRlcnNcblx0XHR2YXIgciA9IHIgKyAzNFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZGVycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGdlbmRlciA9IGdlbmRlcnNbaV1cblx0XHRcdHZhciBhbmdsZSA9IFV0aWxzLkRlZ3JlZXNUb1JhZGlhbnMoZ2VuZGVyLmRlZ0JlZ2luKVxuXHRcdFx0Z2VuZGVyLnR4dC5yb3RhdGlvbiA9IGFuZ2xlICsgVXRpbHMuRGVncmVlc1RvUmFkaWFucyg5MClcblx0XHRcdGdlbmRlci50eHQueCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHRcdGdlbmRlci50eHQueSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHR9XG5cdH1cblx0cmVzaXplKHJhZGl1cykge1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnJhZGl1cyA9IHJhZGl1c1xuXHRcdHRoaXMuZHJhd1JpbmdzKClcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5jb25zdCBnbHNsaWZ5ID0gcmVxdWlyZSgnZ2xzbGlmeScpXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4cGxvc2lvbkVmZmVjdCB7XG5cdGNvbnN0cnVjdG9yKGNvbmZpZykge1xuXHRcdHRoaXMuY29uZmlnID0gY29uZmlnXG5cdFx0dGhpcy5zcHJpdGUgPSB0aGlzLmNvbmZpZy5zcHJpdGVcblx0XHR0aGlzLnNwcml0ZVNjYWxlID0gMFxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHZhciBleHBsb3Npb25GcmFnID0gZ2xzbGlmeShfX2Rpcm5hbWUgKyAnL3NoYWRlcnMvZXhwbG9zaW9uLmdsc2wnKVxuXHRcdHZhciB0ZXh0dXJlID0gdGhpcy5zcHJpdGUudGV4dHVyZVxuXHRcdHRoaXMuc3ByaXRlLnNoYWRlciA9IG5ldyBQSVhJLkFic3RyYWN0RmlsdGVyKG51bGwsIGV4cGxvc2lvbkZyYWcsIHRoaXMudW5pZm9ybXMgPSB7XG5cdCAgICAgICAgdU92ZXJsYXk6IHsgdHlwZTogJ3NhbXBsZXIyRCcsIHZhbHVlOiB0ZXh0dXJlIH0sXG5cdCAgICAgICAgdVRpbWU6IHsgdHlwZTogJzFmJywgdmFsdWU6IDAgfSxcblx0ICAgICAgICB1V2F2ZTogeyB0eXBlOiAnMWYnLCB2YWx1ZTogMCB9LFxuXHQgICAgICAgIHVTaGFrZTogeyB0eXBlOiAnMWYnLCB2YWx1ZTogMCB9LFxuXHQgICAgICAgIHVBbmltYXRpb246IHsgdHlwZTogJzFmJywgdmFsdWU6IDAgfSxcblx0ICAgICAgICB1U2NyZWVuRWZmZWN0OiB7IHR5cGU6ICcxZicsIHZhbHVlOiAwIH1cblx0ICAgIH0pO1xuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMudW5pZm9ybXMudUFuaW1hdGlvbi52YWx1ZSA9IHRoaXMuY29uZmlnLmFuaW1hdGlvbjtcblx0ICAgIHRoaXMudW5pZm9ybXMudVNjcmVlbkVmZmVjdC52YWx1ZSA9IHRoaXMuY29uZmlnLnNjcmVlbkVmZmVjdCArIHRoaXMuY29uZmlnLmhvdmVyQW5pbWF0aW9uICogMC4zO1xuXHQgICAgdmFyIHRpbWUgPSB0aGlzLnVuaWZvcm1zLnVUaW1lLnZhbHVlICs9IDAuMDAxO1xuXHQgICAgdmFyIHNoYWtlID0gdGhpcy51bmlmb3Jtcy51U2hha2UudmFsdWUgPSB0aGlzLmNvbmZpZy5zaGFrZTtcblx0ICAgIHRoaXMudW5pZm9ybXMudVdhdmUudmFsdWUgPSB0aGlzLmNvbmZpZy53YXZlO1xuXG5cdCAgICB2YXIgc3ByaXRlT2Zmc2V0WCA9IHRoaXMuc3ByaXRlLnBvc2l0aW9uLnggPSB3aW5kb3dXIC8gMiArIDA7XG5cdCAgICB2YXIgc3ByaXRlT2Zmc2V0WSA9IHRoaXMuc3ByaXRlLnBvc2l0aW9uLnkgPSB3aW5kb3dIIC8gMiArIDA7XG5cblx0ICAgIHZhciBzaG9vdFJhdGlvID0gTWF0aC5zaW4oTWF0aC5wb3codGhpcy5jb25maWcuYW5pbWF0aW9uLCAwLjUpICogTWF0aC5QSSk7XG5cblx0ICAgIHZhciBvZmZzZXRYID0gdGhpcy5zcHJpdGVTY2FsZSAqIDMyMCArIHNwcml0ZU9mZnNldFggKiAxLjUgKyBzaG9vdFJhdGlvICogTWF0aC5yYW5kb20oKSAqIDE1MCAqIHNoYWtlO1xuXHQgICAgdmFyIG9mZnNldFkgPSB0aGlzLnNwcml0ZVNjYWxlICogLTE4MCArIHNwcml0ZU9mZnNldFkgKiAxLjUgLSBzaG9vdFJhdGlvICogTWF0aC5yYW5kb20oKSAqIDE1MCAqIHNoYWtlO1xuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMuc3ByaXRlU2NhbGUgPSBNYXRoLm1heCggd2luZG93VyAvIEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfVywgd2luZG93SCAvIEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfSCk7XG5cdFx0Ly8gdGhpcy5zcHJpdGUuc2NhbGUuc2V0KHRoaXMuc3ByaXRlU2NhbGUsIHRoaXMuc3ByaXRlU2NhbGUpO1xuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJ0Zyb250Q29udGFpbmVyX2hicydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5jbGFzcyBGcm9udENvbnRhaW5lciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0cmVuZGVyKHBhcmVudCkge1xuXHRcdHZhciBnZW5lcmFJbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvcygpXG5cdFx0dmFyIHNjb3BlID0gQXBwU3RvcmUuZ2xvYmFsQ29udGVudCgpXG5cdFx0c2NvcGUuZmFjZWJvb2tVcmwgPSBnZW5lcmFJbmZvc1snZmFjZWJvb2tfdXJsJ11cblx0XHRzY29wZS50d2l0dGVyVXJsID0gZ2VuZXJhSW5mb3NbJ3R3aXR0ZXJfdXJsJ11cblx0XHRzY29wZS5pbnN0YWdyYW1VcmwgPSBnZW5lcmFJbmZvc1snaW5zdGFncmFtX3VybCddXG5cdFx0c2NvcGUubWVudSA9IEFwcFN0b3JlLm1lbnVDb250ZW50KClcblx0XHRzdXBlci5yZW5kZXIoJ0Zyb250Q29udGFpbmVyJywgcGFyZW50LCB0ZW1wbGF0ZSwgc2NvcGUpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdHRoaXMuJHNvY2lhbFdyYXBwZXIgPSB0aGlzLmNoaWxkLmZpbmQoJyNzb2NpYWwtd3JhcHBlcicpXG5cdFx0dGhpcy5yZXNpemUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRpZighdGhpcy5kb21Jc1JlYWR5KSByZXR1cm5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMuJHNvY2lhbFdyYXBwZXIuY3NzKHtcblx0XHRcdGxlZnQ6IHdpbmRvd1cgLSBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgLSB0aGlzLiRzb2NpYWxXcmFwcGVyLndpZHRoKCksXG5cdFx0XHR0b3A6IHdpbmRvd0ggLSBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgLSB0aGlzLiRzb2NpYWxXcmFwcGVyLmhlaWdodCgpLFxuXHRcdH0pXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZyb250Q29udGFpbmVyXG5cblxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBLbm90IHtcblx0Y29uc3RydWN0b3Ioc3ByaW5nQ29udGFpbmVyKSB7XG5cdFx0dGhpcy5zcHJpbmdDb250YWluZXIgPSBzcHJpbmdDb250YWluZXJcblx0XHR0aGlzLnZ4ID0gMFxuXHRcdHRoaXMudnkgPSAwXG5cdFx0dGhpcy54ID0gMFxuXHRcdHRoaXMueSA9IDBcblx0XHR0aGlzLnNjYWxlWCA9IDFcblx0XHR0aGlzLnNjYWxlWSA9IDFcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmcgPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0dGhpcy5zcHJpbmdDb250YWluZXIuYWRkQ2hpbGQodGhpcy5nKVxuXHRcdFxuXHRcdHZhciByYWRpdXMgPSA4XG5cdFx0dGhpcy5nLmxpbmVTdHlsZShBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKSwgMHhmZmZmZmYsIDEpO1xuXHRcdHRoaXMuZy5iZWdpbkZpbGwoMHhmZmZmZmYsIDEpO1xuXHRcdHRoaXMuZy5kcmF3Q2lyY2xlKDAsIDAsIHJhZGl1cyk7XG5cdFx0dGhpcy5nLmVuZEZpbGwoKVxuXG5cdFx0cmV0dXJuIHRoaXNcblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0dGhpcy5nLnggPSB4XG5cdFx0dGhpcy5nLnkgPSB5XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRzY2FsZSh4LCB5KSB7XG5cdFx0dGhpcy5nLnNjYWxlLnggPSB4XG5cdFx0dGhpcy5nLnNjYWxlLnkgPSB5XG5cdFx0dGhpcy5zY2FsZVggPSB4XG5cdFx0dGhpcy5zY2FsZVkgPSB5XG5cdH1cblx0dmVsb2NpdHkoeCwgeSkge1xuXHRcdHRoaXMudnggPSB4XG5cdFx0dGhpcy52eSA9IHlcblx0fVxufVxuIiwiaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgVmVjMiBmcm9tICdWZWMyJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEJlemllckVhc2luZyBmcm9tICdiZXppZXItZWFzaW5nJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMYW5kaW5nU2xpZGVzaG93IHtcblx0Y29uc3RydWN0b3IocHhDb250YWluZXIpIHtcblx0XHR0aGlzLnB4Q29udGFpbmVyID0gcHhDb250YWluZXJcblx0XHR0aGlzLmN1cnJlbnRJZCA9ICdhbGFza2EnXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHQgXHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHQgXHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyKVxuXHQgXHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnNsaWRlc2hvd1dyYXBwZXIpXG5cdCBcdHRoaXMuY291bnRlciA9IDBcblx0IFx0XG5cdCBcdHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG5cdCBcdHRoaXMuc2xpZGVzID0gW11cblx0IFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG5cdCBcdFx0dmFyIHMgPSB7fVxuXHQgXHRcdHZhciBpZCA9IHBsYW5ldHNbaV1cblx0IFx0XHR2YXIgd3JhcHBlckNvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdCBcdFx0dmFyIG1hc2tSZWN0ID0ge1xuXHQgXHRcdFx0ZzogbmV3IFBJWEkuR3JhcGhpY3MoKSxcblx0IFx0XHRcdG5ld1c6IDAsXG5cdCBcdFx0XHR3aWR0aDogMCxcblx0IFx0XHRcdHg6IDBcblx0IFx0XHR9XG5cdCBcdFx0dmFyIGltZ1VybCA9IEFwcFN0b3JlLm1haW5JbWFnZVVybChpZCwgQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpXG5cdCBcdFx0dmFyIHRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGltZ1VybClcblx0IFx0XHR2YXIgc3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKHRleHR1cmUpXG5cdCBcdFx0c3ByaXRlLnBhcmFtcyA9IHt9XG5cdCBcdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLmFkZENoaWxkKHdyYXBwZXJDb250YWluZXIpXG5cdCBcdFx0d3JhcHBlckNvbnRhaW5lci5hZGRDaGlsZChzcHJpdGUpXG5cdCBcdFx0d3JhcHBlckNvbnRhaW5lci5hZGRDaGlsZChtYXNrUmVjdC5nKVxuXHQgXHRcdHNwcml0ZS5tYXNrID0gbWFza1JlY3QuZ1xuXHQgXHRcdHMub2xkUG9zaXRpb24gPSBuZXcgVmVjMigwLCAwKVxuXHQgXHRcdHMubmV3UG9zaXRpb24gPSBuZXcgVmVjMigwLCAwKVxuXHQgXHRcdHMud3JhcHBlckNvbnRhaW5lciA9IHdyYXBwZXJDb250YWluZXJcblx0IFx0XHRzLnNwcml0ZSA9IHNwcml0ZVxuXHQgXHRcdHMudGV4dHVyZSA9IHRleHR1cmVcblx0IFx0XHRzLm1hc2tSZWN0ID0gbWFza1JlY3Rcblx0IFx0XHRzLmltZ1Jlc3BvbnNpdmVTaXplID0gQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlU2l6ZShBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0IFx0XHRzLmltZ1VybCA9IGltZ1VybFxuXHQgXHRcdHMuaWQgPSBwbGFuZXRzW2ldXG5cdCBcdFx0dGhpcy5zbGlkZXNbaV0gPSBzXG5cdCBcdH1cblxuXHQgXHR0aGlzLm1hc2tFYXNpbmcgPSBCZXppZXJFYXNpbmcoLjIxLDEuNDcsLjUyLDEpXG5cdCBcdHRoaXMuY2hvb3NlU2xpZGVUb0hpZ2hsaWdodCgpXG5cdH1cblx0ZHJhd0NlbnRlcmVkTWFza1JlY3QoZ3JhcGhpY3MsIHgsIHksIHcsIGgpIHtcblx0XHRncmFwaGljcy5jbGVhcigpXG5cdFx0Z3JhcGhpY3MuYmVnaW5GaWxsKDB4ZmZmZjAwLCAxKVxuXHRcdGdyYXBoaWNzLmRyYXdSZWN0KHgsIHksIHcsIGgpXG5cdFx0Z3JhcGhpY3MuZW5kRmlsbCgpXG5cdH1cblx0bmV4dCgpIHtcblx0XHR2YXIgZmlyc3RFbGVtZW50ID0gdGhpcy5zbGlkZXMuc2hpZnQoKVxuXHRcdHRoaXMuc2xpZGVzLnB1c2goZmlyc3RFbGVtZW50KVxuXHRcdHRoaXMuZWxlbWVudFRoYXRNb3ZlZEluU2xpZGVzQXJyYXkgPSBmaXJzdEVsZW1lbnRcblx0XHR0aGlzLmNob29zZVNsaWRlVG9IaWdobGlnaHQoKVxuXHRcdHRoaXMuYXBwbHlWYWx1ZXNUb1NsaWRlcygpXG5cdH1cblx0cHJldmlvdXMoKSB7XG5cdFx0dmFyIGxhc3RFbGVtZW50ID0gdGhpcy5zbGlkZXMucG9wKClcblx0XHR0aGlzLnNsaWRlcy51bnNoaWZ0KGxhc3RFbGVtZW50KVxuXHRcdHRoaXMuZWxlbWVudFRoYXRNb3ZlZEluU2xpZGVzQXJyYXkgPSBsYXN0RWxlbWVudFxuXHRcdHRoaXMuY2hvb3NlU2xpZGVUb0hpZ2hsaWdodCgpXG5cdFx0dGhpcy5hcHBseVZhbHVlc1RvU2xpZGVzKClcblx0fVxuXHRjaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KCkge1xuXHRcdHZhciB0b3RhbExlbiA9IHRoaXMuc2xpZGVzLmxlbmd0aC0xXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNsaWRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNsaWRlID0gdGhpcy5zbGlkZXNbaV1cblx0XHRcdGlmKGkgPT0gMikge1xuXHRcdFx0XHRzbGlkZS5oaWdobGlnaHQgPSB0cnVlIC8vIEhpZ2hsaWdodCB0aGUgbWlkZGxlIGVsZW1lbnRzXG5cdFx0XHRcdHRoaXMuY3VycmVudElkID0gc2xpZGUuaWRcblx0XHRcdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLnNldENoaWxkSW5kZXgoc2xpZGUud3JhcHBlckNvbnRhaW5lciwgdG90YWxMZW4pXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0c2xpZGUuaGlnaGxpZ2h0ID0gZmFsc2Vcblx0XHRcdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLnNldENoaWxkSW5kZXgoc2xpZGUud3JhcHBlckNvbnRhaW5lciwgaSlcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0YXBwbHlSZXNwb25zaXZlSW1nVG9TbGlkZURlcGVuZHNXaW5kb3coc2xpZGUpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIGltZ1VybCA9IEFwcFN0b3JlLm1haW5JbWFnZVVybChzLmlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0XHRpZihzLmltZ1VybCAhPSBpbWdVcmwpIHtcblx0XHRcdHMuaW1nUmVzcG9uc2l2ZVNpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VTaXplKEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHRcdFx0cy50ZXh0dXJlLmRlc3Ryb3kodHJ1ZSlcblx0XHRcdHMudGV4dHVyZSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1nVXJsKVxuXHRcdFx0cy5zcHJpdGUudGV4dHVyZSA9IHMudGV4dHVyZVxuXHRcdFx0cy5pbWdVcmwgPSBpbWdVcmxcblx0XHR9XG5cdH1cblx0cmVzaXplQW5kUG9zaXRpb25JbWdTcHJpdGUoc2xpZGUsIG1hc2tTbGlkZVcsIHdpbmRvd1csIHdpbmRvd0gpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIHJlc2l6ZVZhcnMgPSBVdGlscy5SZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcihtYXNrU2xpZGVXLCB3aW5kb3dILCBzLmltZ1Jlc3BvbnNpdmVTaXplWzBdLCBzLmltZ1Jlc3BvbnNpdmVTaXplWzFdKVxuXHRcdHMuc3ByaXRlLmFuY2hvci54ID0gMC41XG5cdFx0cy5zcHJpdGUuYW5jaG9yLnkgPSAwLjVcblx0XHRzLnNwcml0ZS5zY2FsZS54ID0gcmVzaXplVmFycy5zY2FsZVxuXHRcdHMuc3ByaXRlLnNjYWxlLnkgPSByZXNpemVWYXJzLnNjYWxlXG5cdFx0cy5zcHJpdGUud2lkdGggPSByZXNpemVWYXJzLndpZHRoXG5cdFx0cy5zcHJpdGUuaGVpZ2h0ID0gcmVzaXplVmFycy5oZWlnaHRcblx0XHRzLnNwcml0ZS54ID0gcmVzaXplVmFycy5sZWZ0XG5cdFx0cy5zcHJpdGUueSA9IHJlc2l6ZVZhcnMudG9wXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHZhciBzbGlkZXMgPSB0aGlzLnNsaWRlc1xuXHRcdHRoaXMuY291bnRlciArPSAwLjAxMlxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcyA9IHNsaWRlc1tpXVxuXHRcdFx0cy5tYXNrUmVjdC52YWx1ZVNjYWxlICs9ICgwLjQgLSBzLm1hc2tSZWN0LnZhbHVlU2NhbGUpICogMC4wNVxuXHRcdFx0dmFyIGVhc2UgPSB0aGlzLm1hc2tFYXNpbmcuZ2V0KHMubWFza1JlY3QudmFsdWVTY2FsZSlcblx0XHRcdHMud3JhcHBlckNvbnRhaW5lci54ICs9IChzLm5ld1Bvc2l0aW9uLnggLSBzLndyYXBwZXJDb250YWluZXIueCkgKiBlYXNlXG5cdFx0XHRzLm1hc2tSZWN0LndpZHRoID0gcy5tYXNrUmVjdC5uZXdXICogZWFzZVxuXHRcdFx0dmFyIG1hc2tSZWN0WCA9ICgxIC0gZWFzZSkgKiBzLm1hc2tSZWN0Lm5ld1hcblx0XHRcdHRoaXMuZHJhd0NlbnRlcmVkTWFza1JlY3Qocy5tYXNrUmVjdC5nLCBtYXNrUmVjdFgsIDAsIHMubWFza1JlY3Qud2lkdGgsIHMubWFza1JlY3QuaGVpZ2h0KVxuXHRcdFx0cy5zcHJpdGUuc2tldy54ID0gTWF0aC5jb3ModGhpcy5jb3VudGVyKSAqIDAuMDIwXG5cdFx0XHRzLnNwcml0ZS5za2V3LnkgPSBNYXRoLnNpbih0aGlzLmNvdW50ZXIpICogMC4wMjBcblx0XHR9XG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueCArPSAodGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGVYWSAtIHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLngpICogMC4wOFxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnkgKz0gKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFkgLSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54KSAqIDAuMDhcblx0XHQvLyB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci55ID0gdGhpcy5zbGlkZXNob3dDb250YWluZXIuYmFzZVkgKyBNYXRoLnNpbih0aGlzLmNvdW50ZXIpICogNFxuXHR9XG5cdHBvc2l0aW9uU2xpZGVzaG93Q29udGFpbmVyKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIGxhc3RTbGlkZSA9IHRoaXMuc2xpZGVzW3RoaXMuc2xpZGVzLmxlbmd0aC0xXVxuXHRcdHZhciBjb250YWluZXJUb3RhbFcgPSBsYXN0U2xpZGUubmV3UG9zaXRpb24ueCArIGxhc3RTbGlkZS5tYXNrUmVjdC5uZXdXXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIucGl2b3QueCA9IGNvbnRhaW5lclRvdGFsVyA+PiAxXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIucGl2b3QueSA9IHdpbmRvd0ggPj4gMVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnggPSAod2luZG93VyA+PiAxKVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnkgPSAod2luZG93SCA+PiAxKVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLmJhc2VZID0gdGhpcy5zbGlkZXNob3dDb250YWluZXIueVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnggPSAxLjNcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS55ID0gMS4zXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGVYWSA9IDEuMDVcblx0fVxuXHRhcHBseVZhbHVlc1RvU2xpZGVzKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIGN1cnJlbnRQb3NYID0gMFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zbGlkZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzID0gdGhpcy5zbGlkZXNbaV1cblx0XHRcdHRoaXMuYXBwbHlSZXNwb25zaXZlSW1nVG9TbGlkZURlcGVuZHNXaW5kb3cocylcblx0XHRcdHZhciBoaWdodGxpZ2h0ZWRTbGlkZVcgPSB3aW5kb3dXICogMC43XG5cdFx0XHR2YXIgbm9ybWFsU2xpZGVXID0gd2luZG93VyAqIDAuMTVcblx0XHRcdHZhciBzbGlkZVcgPSAwXG5cdFx0XHRpZihzLmhpZ2hsaWdodCkgc2xpZGVXID0gaGlnaHRsaWdodGVkU2xpZGVXXG5cdFx0XHRlbHNlIHNsaWRlVyA9IG5vcm1hbFNsaWRlV1xuXHRcdFx0dGhpcy5yZXNpemVBbmRQb3NpdGlvbkltZ1Nwcml0ZShzLCBzbGlkZVcsIHdpbmRvd1csIHdpbmRvd0gpXG5cdFx0XHRzLm1hc2tSZWN0Lm5ld1cgPSBzbGlkZVdcblx0XHRcdHMubWFza1JlY3QuaGVpZ2h0ID0gd2luZG93SFxuXHRcdFx0cy5tYXNrUmVjdC5uZXdYID0gc2xpZGVXID4+IDFcblx0XHRcdHMubWFza1JlY3QudmFsdWVTY2FsZSA9IDJcblx0XHRcdHMub2xkUG9zaXRpb24ueCA9IHMubmV3UG9zaXRpb24ueFxuXHRcdFx0cy5uZXdQb3NpdGlvbi54ID0gY3VycmVudFBvc1hcblx0XHRcdGlmKHRoaXMuZWxlbWVudFRoYXRNb3ZlZEluU2xpZGVzQXJyYXkgIT0gdW5kZWZpbmVkICYmIHRoaXMuZWxlbWVudFRoYXRNb3ZlZEluU2xpZGVzQXJyYXkuaWQgPT0gcy5pZCl7XG5cdFx0XHRcdHMud3JhcHBlckNvbnRhaW5lci54ID0gcy5uZXdQb3NpdGlvbi54XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50UG9zWCArPSBzbGlkZVdcblx0XHR9XG5cdFx0dGhpcy5wb3NpdGlvblNsaWRlc2hvd0NvbnRhaW5lcigpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuYXBwbHlWYWx1ZXNUb1NsaWRlcygpXG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUFhDb250YWluZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0fVxuXHRpbml0KGVsZW1lbnRJZCkge1xuXHRcdC8vIHRoaXMucmVuZGVyZXIgPSBuZXcgUElYSS5DYW52YXNSZW5kZXJlcig4MDAsIDYwMClcblx0XHR0aGlzLnJlbmRlcmVyID0gbmV3IFBJWEkuYXV0b0RldGVjdFJlbmRlcmVyKDgwMCwgNjAwLCB7IGFudGlhbGlhczogdHJ1ZSB9KVxuXG5cdFx0dmFyIGVsID0gJChlbGVtZW50SWQpXG5cdFx0JCh0aGlzLnJlbmRlcmVyLnZpZXcpLmF0dHIoJ2lkJywgJ3B4LWNvbnRhaW5lcicpXG5cdFx0ZWwuYXBwZW5kKHRoaXMucmVuZGVyZXIudmlldylcblxuXHRcdHRoaXMuc3RhZ2UgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHR9XG5cdGFkZChjaGlsZCkge1xuXHRcdHRoaXMuc3RhZ2UuYWRkQ2hpbGQoY2hpbGQpXG5cdH1cblx0cmVtb3ZlKGNoaWxkKSB7XG5cdFx0dGhpcy5zdGFnZS5yZW1vdmVDaGlsZChjaGlsZClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdCAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnN0YWdlKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmVuZGVyZXIucmVzaXplKHdpbmRvd1csIHdpbmRvd0gpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlUGFnZSBmcm9tICdCYXNlUGFnZSdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZSBleHRlbmRzIEJhc2VQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcylcblx0XHR0aGlzLnJlc2l6ZSA9IHRoaXMucmVzaXplLmJpbmQodGhpcylcblx0XHR0aGlzLnB4Q29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzZXRUaW1lb3V0KCgpPT57QXBwQWN0aW9ucy5weEFkZENoaWxkKHRoaXMucHhDb250YWluZXIpfSwgMClcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzZXRUaW1lb3V0KCgpPT57QXBwQWN0aW9ucy5weFJlbW92ZUNoaWxkKHRoaXMucHhDb250YWluZXIpfSwgMClcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHNldHVwQW5pbWF0aW9ucygpIHtcblx0XHRzdXBlci5zZXR1cEFuaW1hdGlvbnMoKVxuXHR9XG5cdGdldEltYWdlVXJsQnlJZChpZCkge1xuXHRcdHJldHVybiBQcmVsb2FkZXIuZ2V0SW1hZ2VVUkwodGhpcy5pZCArICctJyArIHRoaXMucHJvcHMudHlwZS50b0xvd2VyQ2FzZSgpICsgJy0nICsgaWQpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMucHhDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5weENvbnRhaW5lcilcblx0XHRBcHBTdG9yZS5vZmYoQXBwQ29uc3RhbnRzLldJTkRPV19SRVNJWkUsIHRoaXMucmVzaXplKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEJhc2VQYWdlciBmcm9tICdCYXNlUGFnZXInXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBMYW5kaW5nIGZyb20gJ0xhbmRpbmcnXG5pbXBvcnQgTGFuZGluZ1RlbXBsYXRlIGZyb20gJ0xhbmRpbmdfaGJzJ1xuaW1wb3J0IFBsYW5ldEV4cGVyaWVuY2VQYWdlIGZyb20gJ1BsYW5ldEV4cGVyaWVuY2VQYWdlJ1xuaW1wb3J0IFBsYW5ldEV4cGVyaWVuY2VQYWdlVGVtcGxhdGUgZnJvbSAnUGxhbmV0RXhwZXJpZW5jZVBhZ2VfaGJzJ1xuaW1wb3J0IFBsYW5ldENhbXBhaWduUGFnZSBmcm9tICdQbGFuZXRDYW1wYWlnblBhZ2UnXG5pbXBvcnQgUGxhbmV0Q2FtcGFpZ25QYWdlVGVtcGxhdGUgZnJvbSAnUGxhbmV0Q2FtcGFpZ25QYWdlX2hicydcblxuY2xhc3MgUGFnZXNDb250YWluZXIgZXh0ZW5kcyBCYXNlUGFnZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5zd2FsbG93SGFzaGVyQ2hhbmdlID0gZmFsc2Vcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdFx0QXBwU3RvcmUub24oQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQsIHRoaXMuZGlkSGFzaGVyQ2hhbmdlKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9mZihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCwgdGhpcy5kaWRIYXNoZXJDaGFuZ2UpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG5cdGRpZEhhc2hlckNoYW5nZSgpIHtcblx0XHQvLyBTd2FsbG93IGhhc2hlciBjaGFuZ2UgaWYgdGhlIGNoYW5nZSBpcyBmYXN0IGFzIDFzZWNcblx0XHRpZih0aGlzLnN3YWxsb3dIYXNoZXJDaGFuZ2UpIHJldHVybiBcblx0XHRlbHNlIHRoaXMuc2V0dXBOZXdib3JuQ29tcG9uZW50cygpXG5cdFx0dGhpcy5zd2FsbG93SGFzaGVyQ2hhbmdlID0gdHJ1ZVxuXHRcdHRoaXMuaGFzaGVyQ2hhbmdlVGltZW91dCA9IHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IGZhbHNlXG5cdFx0fSwgMTAwMClcblx0fVxuXHRzZXR1cE5ld2Jvcm5Db21wb25lbnRzKCkge1xuXHRcdHZhciBoYXNoID0gUm91dGVyLmdldE5ld0hhc2goKVxuXHRcdHZhciB0ZW1wbGF0ZSA9IHsgdHlwZTogdW5kZWZpbmVkLCBwYXJ0aWFsOiB1bmRlZmluZWQgfVxuXHRcdHN3aXRjaChoYXNoLnBhcnRzLmxlbmd0aCkge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gTGFuZGluZ1xuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gTGFuZGluZ1RlbXBsYXRlXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXBsYXRlLnR5cGUgPSBQbGFuZXRFeHBlcmllbmNlUGFnZVxuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gUGxhbmV0RXhwZXJpZW5jZVBhZ2VUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gUGxhbmV0Q2FtcGFpZ25QYWdlXG5cdFx0XHRcdHRlbXBsYXRlLnBhcnRpYWwgPSBQbGFuZXRDYW1wYWlnblBhZ2VUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGVtcGxhdGUudHlwZSA9IExhbmRpbmdcblx0XHRcdFx0dGVtcGxhdGUucGFydGlhbCA9IExhbmRpbmdUZW1wbGF0ZVx0XHRcblx0XHR9XG5cblx0XHR0aGlzLnNldHVwTmV3Q29tcG9uZW50KGhhc2gucGFyZW50LCB0ZW1wbGF0ZSlcblx0XHR0aGlzLmN1cnJlbnRDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLmN1cnJlbnRDb21wb25lbnQgIT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJlbnRDb21wb25lbnQudXBkYXRlKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQYWdlc0NvbnRhaW5lclxuXG5cblxuIiwiaW1wb3J0IEJhc2VQbGFuZXRQYWdlIGZyb20gJ0Jhc2VQbGFuZXRQYWdlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxhbmV0Q2FtcGFpZ25QYWdlIGV4dGVuZHMgQmFzZVBsYW5ldFBhZ2Uge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHZhciBidW5ueVVybCA9IHRoaXMuZ2V0SW1hZ2VVcmxCeUlkKCdidW5ueScpXG5cdFx0dmFyIHRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGJ1bm55VXJsKVxuXHRcdHZhciBidW5ueSA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlKVxuXG5cdFx0dGhpcy5nID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5nKVxuXG5cdFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZChidW5ueSlcblx0XHRidW5ueS54ID0gNTAwXG5cdFx0YnVubnkueSA9IDUwMFxuXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0Ly8gZHJhdyBhIHJlY3RhbmdsZVxuXHRcdHRoaXMuZy5jbGVhcigpXG5cdFx0dGhpcy5nLmJlZ2luRmlsbChNYXRoLnJhbmRvbSgpICogMHhmZmZmZmYpXG5cdFx0dGhpcy5nLmRyYXdSZWN0KDAsIDAsIHdpbmRvd1csIHdpbmRvd0gpXG5cdFx0dGhpcy5nLmVuZEZpbGwoKVxuXG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VQbGFuZXRQYWdlIGZyb20gJ0Jhc2VQbGFuZXRQYWdlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBbGFza2FYUCBmcm9tICdBbGFza2FYUCdcbmltcG9ydCBTa2lYUCBmcm9tICdTa2lYUCdcbmltcG9ydCBNZXRhbFhQIGZyb20gJ01ldGFsWFAnXG5pbXBvcnQgV29vZFhQIGZyb20gJ1dvb2RYUCdcbmltcG9ydCBHZW1TdG9uZVhQIGZyb20gJ0dlbVN0b25lWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBsYW5ldEV4cGVyaWVuY2VQYWdlIGV4dGVuZHMgQmFzZVBsYW5ldFBhZ2Uge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHZhciBidW5ueVVybCA9IHRoaXMuZ2V0SW1hZ2VVcmxCeUlkKCdidW5ueScpXG5cdFx0dmFyIHRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGJ1bm55VXJsKVxuXHRcdHZhciBidW5ueSA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlKVxuXG5cdFx0dGhpcy5nID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5nKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQoYnVubnkpXG5cblx0XHR2YXIgWHBDbGF6eiA9IHRoaXMuZ2V0RXhwZXJpZW5jZUJ5SWQodGhpcy5pZClcblx0XHR0aGlzLmV4cGVyaWVuY2UgPSBuZXcgWHBDbGF6eigpXG5cdFx0dGhpcy5leHBlcmllbmNlLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRnZXRFeHBlcmllbmNlQnlJZChpZCkge1xuXHRcdHN3aXRjaChpZCl7XG5cdFx0XHRjYXNlICdza2knOiByZXR1cm4gU2tpWFBcblx0XHRcdGNhc2UgJ21ldGFsJzogcmV0dXJuIE1ldGFsWFBcblx0XHRcdGNhc2UgJ2FsYXNrYSc6IHJldHVybiBBbGFza2FYUFxuXHRcdFx0Y2FzZSAnd29vZCc6IHJldHVybiBXb29kWFBcblx0XHRcdGNhc2UgJ2dlbXN0b25lJzogcmV0dXJuIEdlbVN0b25lWFBcblx0XHR9XG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHRoaXMuZXhwZXJpZW5jZS51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGhpcy5leHBlcmllbmNlLnJlc2l6ZSgpXG5cblx0XHQvLyBkcmF3IGEgcmVjdGFuZ2xlXG5cdFx0dGhpcy5nLmNsZWFyKClcblx0XHR0aGlzLmcuYmVnaW5GaWxsKE1hdGgucmFuZG9tKCkgKiAweGZmZmZmZilcblx0XHR0aGlzLmcuZHJhd1JlY3QoMCwgMCwgd2luZG93Vywgd2luZG93SClcblx0XHR0aGlzLmcuZW5kRmlsbCgpXG5cblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3ByaW5nR2FyZGVuIHtcblx0Y29uc3RydWN0b3IocHhDb250YWluZXIsIGdhcmRlbiwgY29sb3IpIHtcblx0XHR0aGlzLnB4Q29udGFpbmVyID0gcHhDb250YWluZXJcblx0XHR0aGlzLmdhcmRlbiA9IGdhcmRlblxuXHRcdHRoaXMuY29sb3IgPSBjb2xvclxuXHRcdHRoaXMubGluZVcgPSBBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKVxuXHRcdHRoaXMucGF1c2VkID0gdHJ1ZVxuXHRcdHRoaXMub3BlbmVkID0gZmFsc2VcblxuXHRcdHRoaXMuY29uZmlnID0ge1xuXHRcdFx0c3ByaW5nOiAwLFxuXHRcdFx0ZnJpY3Rpb246IDAsXG5cdFx0XHRzcHJpbmdMZW5ndGg6IDBcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5jb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5jb250YWluZXIpXG5cdFx0XG5cdFx0dGhpcy5vdXRsaW5lQ29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0XHR0aGlzLm91dGxpbmVQb2x5Z29uID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMub3V0bGluZUNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLm91dGxpbmVQb2x5Z29uKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMub3V0bGluZUNvbnRhaW5lcilcblxuXHRcdHRoaXMuZmlsbGVkQ29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0XHR0aGlzLmZpbGxlZFBvbHlnb24gPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0dGhpcy5maWxsZWRDb250YWluZXIuYWRkQ2hpbGQodGhpcy5maWxsZWRQb2x5Z29uKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuZmlsbGVkQ29udGFpbmVyKVxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmdhcmRlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSB0aGlzLmdhcmRlbltpXVxuXHRcdFx0a25vdC5rID0gbmV3IEtub3QodGhpcy5jb250YWluZXIpLmNvbXBvbmVudERpZE1vdW50KClcblx0XHR9XG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdGlmKHRoaXMucGF1c2VkKSByZXR1cm5cblx0XHR0aGlzLm91dGxpbmVQb2x5Z29uLmNsZWFyKClcblx0XHR0aGlzLmZpbGxlZFBvbHlnb24uY2xlYXIoKVxuXHRcdHRoaXMuZmlsbGVkUG9seWdvbi5iZWdpbkZpbGwodGhpcy5jb2xvcilcblx0XHR0aGlzLmZpbGxlZFBvbHlnb24ubGluZVN0eWxlKDApXG5cdFx0dGhpcy5maWxsZWRQb2x5Z29uLm1vdmVUbyh0aGlzLmdhcmRlblswXS5rLngsIHRoaXMuZ2FyZGVuWzBdLmsueSlcblx0XHR2YXIgbGVuID0gdGhpcy5nYXJkZW4ubGVuZ3RoXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSB0aGlzLmdhcmRlbltpXVxuXHRcdFx0dmFyIHByZXZpb3VzS25vdCA9IHRoaXMuZ2FyZGVuW2ktMV1cblx0XHRcdHByZXZpb3VzS25vdCA9IChwcmV2aW91c0tub3QgPT0gdW5kZWZpbmVkKSA/IHRoaXMuZ2FyZGVuW2xlbi0xXSA6IHByZXZpb3VzS25vdFxuXHRcdFx0dGhpcy5zcHJpbmdUbyhrbm90LmssIGtub3QudG9YLCBrbm90LnRvWSwgaSlcblxuXHRcdFx0Ly8gb3V0bGluZVxuXHRcdFx0dGhpcy5vdXRsaW5lUG9seWdvbi5saW5lU3R5bGUodGhpcy5saW5lVywgdGhpcy5jb2xvciwgMC44KVxuXHRcdFx0dGhpcy5vdXRsaW5lUG9seWdvbi5tb3ZlVG8ocHJldmlvdXNLbm90LmsueCwgcHJldmlvdXNLbm90LmsueSlcblx0XHRcdHRoaXMub3V0bGluZVBvbHlnb24ubGluZVRvKGtub3Quay54LCBrbm90LmsueSlcblxuXHRcdFx0Ly8gdGhpcy5maWxsZWRQb2x5Z29uLmxpbmVUbyhrbm90LmsueCwga25vdC5rLnkpXG5cdFx0fVxuXHRcdHRoaXMuZmlsbGVkUG9seWdvbi5lbmRGaWxsKClcblx0XHR0aGlzLmNvbmZpZy5zcHJpbmdMZW5ndGggLT0gKHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCkgKiAwLjFcblx0XHR0aGlzLmNvbnRhaW5lci5yb3RhdGlvbiAtPSAodGhpcy5jb250YWluZXIucm90YXRpb24pICogMC4xXG5cdFx0Ly8gaWYodGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoIDwgMC4wMDAxKSB7XG5cdFx0Ly8gXHR0aGlzLnBhdXNlZCA9IHRydWVcblx0XHQvLyB9XG5cdH1cblx0b3BlbigpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZ2FyZGVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IHRoaXMuZ2FyZGVuW2ldXG5cdFx0XHRrbm90LmsucG9zaXRpb24oMCwgMClcblx0XHR9XG5cdFx0dGhpcy5jb250YWluZXIucm90YXRpb24gPSBVdGlscy5SYW5kKC0yLCAyKVxuXHRcdHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCA9IDIwMFxuXHRcdHRoaXMucGF1c2VkID0gZmFsc2Vcblx0XHR0aGlzLm9wZW5lZCA9IHRydWVcblx0XHR0aGlzLmFzc2lnblRvR29WYWx1ZXMoKVxuXHRcdHRoaXMuYXNzaWduT3BlbmVkQ29uZmlnKClcblx0fVxuXHRjbG9zZSgpIHtcblx0XHR0aGlzLm9wZW5lZCA9IGZhbHNlXG5cdFx0dGhpcy5hc3NpZ25Ub0dvVmFsdWVzKClcblx0XHR0aGlzLmFzc2lnbkNsb3NlZENvbmZpZygpXG5cdH1cblx0c3ByaW5nVG8oa25vdEEsIHRvWCwgdG9ZLCBpbmRleCkge1xuXHRcdHZhciBkeCA9IHRvWCAtIGtub3RBLnhcbiAgICBcdHZhciBkeSA9IHRvWSAtIGtub3RBLnlcblx0XHR2YXIgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeClcblx0XHR2YXIgdGFyZ2V0WCA9IHRvWCAtIE1hdGguY29zKGFuZ2xlKSAqICh0aGlzLmNvbmZpZy5zcHJpbmdMZW5ndGggKiBpbmRleClcblx0XHR2YXIgdGFyZ2V0WSA9IHRvWSAtIE1hdGguc2luKGFuZ2xlKSAqICh0aGlzLmNvbmZpZy5zcHJpbmdMZW5ndGggKiBpbmRleClcblx0XHRrbm90QS52eCArPSAodGFyZ2V0WCAtIGtub3RBLngpICogdGhpcy5jb25maWcuc3ByaW5nXG5cdFx0a25vdEEudnkgKz0gKHRhcmdldFkgLSBrbm90QS55KSAqIHRoaXMuY29uZmlnLnNwcmluZ1xuXHRcdGtub3RBLnZ4ICo9IHRoaXMuY29uZmlnLmZyaWN0aW9uXG5cdFx0a25vdEEudnkgKj0gdGhpcy5jb25maWcuZnJpY3Rpb25cblx0XHRrbm90QS5wb3NpdGlvbihrbm90QS54ICsga25vdEEudngsIGtub3RBLnkgKyBrbm90QS52eSlcblx0fVxuXHRnZXRUb1goa25vdCkge1xuXHRcdGlmKHRoaXMub3BlbmVkKSByZXR1cm4ga25vdC54ICogKHRoaXMucmFkaXVzKVxuXHRcdGVsc2UgcmV0dXJuIDBcblx0fVxuXHRnZXRUb1koa25vdCkge1xuXHRcdGlmKHRoaXMub3BlbmVkKSByZXR1cm4ga25vdC55ICogKHRoaXMucmFkaXVzKVxuXHRcdGVsc2UgcmV0dXJuIDBcblx0fVxuXHRhc3NpZ25Ub0dvVmFsdWVzKCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5nYXJkZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0gdGhpcy5nYXJkZW5baV1cblx0XHRcdGtub3QudG9YID0gdGhpcy5nZXRUb1goa25vdClcblx0XHRcdGtub3QudG9ZID0gdGhpcy5nZXRUb1koa25vdClcblx0XHR9XG5cdH1cblx0YXNzaWduT3BlbmVkQ29uZmlnKCkge1xuXHRcdHRoaXMuY29uZmlnLnNwcmluZyA9IDAuMDNcblx0XHR0aGlzLmNvbmZpZy5mcmljdGlvbiA9IDAuOTJcblx0XHR0aGlzLmNvbmZpZy5zcHJpbmdMZW5ndGggPSAwXG5cdH1cblx0YXNzaWduQ2xvc2VkQ29uZmlnKCkge1xuXHRcdHRoaXMuY29uZmlnLnNwcmluZyA9IDEwXG5cdFx0dGhpcy5jb25maWcuZnJpY3Rpb24gPSAwLjFcblx0XHR0aGlzLmNvbmZpZy5zcHJpbmdMZW5ndGggPSAwXG5cdH1cblx0cmVzaXplKHJhZGl1cykge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dGhpcy5yYWRpdXMgPSByYWRpdXNcblx0XHR0aGlzLmFzc2lnblRvR29WYWx1ZXMoKVxuXHRcdHRoaXMuY29udGFpbmVyLnggPSAwXG5cdFx0dGhpcy5jb250YWluZXIueSA9IDBcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VYUCBmcm9tICdCYXNlWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFsYXNrYVhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdH1cblx0dXBkYXRlKCkge1xuXHR9XG5cdHJlc2l6ZSgpIHtcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VYUCBmcm9tICdCYXNlWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdlbVN0b25lWFAgZXh0ZW5kcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VYUCBmcm9tICdCYXNlWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1ldGFsWFAgZXh0ZW5kcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2tpWFAgZXh0ZW5kcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgV29vZFhQIGV4dGVuZHMgQmFzZVhQIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuIiwiaW1wb3J0IFBhZ2UgZnJvbSAnUGFnZSdcbmltcG9ydCBMYW5kaW5nU2xpZGVzaG93IGZyb20gJ0xhbmRpbmdTbGlkZXNob3cnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQ29tcGFzcyBmcm9tICdDb21wYXNzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMYW5kaW5nIGV4dGVuZHMgUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93ID0gbmV3IExhbmRpbmdTbGlkZXNob3codGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5jb21wYXNzID0gbmV3IENvbXBhc3ModGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLmNvbXBhc3MuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5vbktleVByZXNzZWQgPSB0aGlzLm9uS2V5UHJlc3NlZC5iaW5kKHRoaXMpXG5cdFx0JChkb2N1bWVudCkua2V5ZG93bih0aGlzLm9uS2V5UHJlc3NlZClcblxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRvbktleVByZXNzZWQoZSkge1xuXHRcdHN3aXRjaChlLndoaWNoKSB7XG5cdCAgICAgICAgY2FzZSAzNzogLy8gbGVmdFxuXHQgICAgICAgIFx0dGhpcy5wcmV2aW91cygpXG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgICAgY2FzZSAzOTogLy8gcmlnaHRcblx0ICAgICAgICBcdHRoaXMubmV4dCgpXG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuXHQgICAgfVxuXHQgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRuZXh0KCkge1xuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5uZXh0KClcblx0XHR0aGlzLmNvbXBhc3MuaGlnaGxpZ2h0UGxhbmV0KHRoaXMubGFuZGluZ1NsaWRlc2hvdy5jdXJyZW50SWQpXG5cdH1cblx0cHJldmlvdXMoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnByZXZpb3VzKClcblx0XHR0aGlzLmNvbXBhc3MuaGlnaGxpZ2h0UGxhbmV0KHRoaXMubGFuZGluZ1NsaWRlc2hvdy5jdXJyZW50SWQpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy51cGRhdGUoKVxuXHRcdHRoaXMuY29tcGFzcy51cGRhdGUoKVxuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnJlc2l6ZSgpXG5cdFx0dGhpcy5jb21wYXNzLnJlc2l6ZSgpXG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxufVxuXG4iLCJleHBvcnQgZGVmYXVsdCB7XG5cdFdJTkRPV19SRVNJWkU6ICdXSU5ET1dfUkVTSVpFJyxcblx0UEFHRV9IQVNIRVJfQ0hBTkdFRDogJ1BBR0VfSEFTSEVSX0NIQU5HRUQnLFxuXHRQWF9DT05UQUlORVJfSVNfUkVBRFk6ICdQWF9DT05UQUlORVJfSVNfUkVBRFknLFxuXHRQWF9DT05UQUlORVJfQUREX0NISUxEOiAnUFhfQ09OVEFJTkVSX0FERF9DSElMRCcsXG5cdFBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQ6ICdQWF9DT05UQUlORVJfUkVNT1ZFX0NISUxEJyxcblxuXHRMQU5ESU5HOiAnTEFORElORycsXG5cdEVYUEVSSUVOQ0U6ICdFWFBFUklFTkNFJyxcblx0Q0FNUEFJR046ICdDQU1QQUlHTicsXG5cdE5PTkU6ICdOT05FJyxcblxuXHRQQURESU5HX0FST1VORDogMjAsXG5cblx0UkVTUE9OU0lWRV9JTUFHRTogWzE5MjAsIDEyODAsIDY0MF0sXG5cblx0RU5WSVJPTk1FTlRTOiB7XG5cdFx0UFJFUFJPRDoge1xuXHRcdFx0c3RhdGljOiAnJ1xuXHRcdH0sXG5cdFx0UFJPRDoge1xuXHRcdFx0XCJzdGF0aWNcIjogSlNfdXJsX3N0YXRpY1xuXHRcdH1cblx0fSxcblxuXHRMQU5EU0NBUEU6ICdMQU5EU0NBUEUnLFxuXHRQT1JUUkFJVDogJ1BPUlRSQUlUJyxcblxuXHRNRURJQV9HTE9CQUxfVzogMTkyMCxcblx0TUVESUFfR0xPQkFMX0g6IDEwODAsXG5cblx0TUlOX01JRERMRV9XOiA5NjAsXG5cdE1RX1hTTUFMTDogMzIwLFxuXHRNUV9TTUFMTDogNDgwLFxuXHRNUV9NRURJVU06IDc2OCxcblx0TVFfTEFSR0U6IDEwMjQsXG5cdE1RX1hMQVJHRTogMTI4MCxcblx0TVFfWFhMQVJHRTogMTY4MCxcbn0iLCJpbXBvcnQgRmx1eCBmcm9tICdmbHV4J1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJ1xuXG52YXIgQXBwRGlzcGF0Y2hlciA9IGFzc2lnbihuZXcgRmx1eC5EaXNwYXRjaGVyKCksIHtcblx0aGFuZGxlVmlld0FjdGlvbjogZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0dGhpcy5kaXNwYXRjaCh7XG5cdFx0XHRzb3VyY2U6ICdWSUVXX0FDVElPTicsXG5cdFx0XHRhY3Rpb246IGFjdGlvblxuXHRcdH0pO1xuXHR9XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgQXBwRGlzcGF0Y2hlciIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHQ8bGk+PGEgaHJlZj0nI1wiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy51cmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwidXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIic+XCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm5hbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcIm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9hPjwvbGk+XFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyLCBhbGlhczE9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczI9XCJmdW5jdGlvblwiLCBhbGlhczM9dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIHJldHVybiBcIjxkaXY+XFxuXHQ8aGVhZGVyIGlkPVxcXCJoZWFkZXJcXFwiPlxcblx0XHQ8dWw+XFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5tZW51IDogZGVwdGgwKSx7XCJuYW1lXCI6XCJlYWNoXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXHRcdDwvdWw+XFxuXHQ8L2hlYWRlcj5cXG5cdDxmb290ZXIgaWQ9XFxcImZvb3RlclxcXCI+XFxuXHRcdDx1bCBpZD1cXFwic29jaWFsLXdyYXBwZXJcXFwiPlxcblx0XHRcdDxsaT5cXG5cdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZmFjZWJvb2tVcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmZhY2Vib29rVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJmYWNlYm9va1VybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTYuMDAyLDAuMTY3Yy04Ljc0NiwwLTE1LjgzNSw3LjA5LTE1LjgzNSwxNS44MzRjMCw4Ljc0Niw3LjA4OSwxNS44MzUsMTUuODM1LDE1LjgzNWM4Ljc0NSwwLDE1LjgzNC03LjA4OSwxNS44MzQtMTUuODM1QzMxLjgzNiw3LjI1NywyNC43NDcsMC4xNjcsMTYuMDAyLDAuMTY3IE0yMi4zMjIsMTMuNTM5YzAuMDA3LDAuMTM4LDAuMDA5LDAuMjc5LDAuMDA5LDAuNDJjMCw0LjMwMi0zLjI3Miw5LjI1OS05LjI1OSw5LjI1OWMtMS44MzcsMC0zLjU0Ny0wLjUzOS00Ljk4Ny0xLjQ2MWMwLjI1MywwLjAzMSwwLjUxNCwwLjA0NCwwLjc3NiwwLjA0NGMxLjUyNSwwLDIuOTI4LTAuNTIsNC4wNDItMS4zOTRjLTEuNDI0LTAuMDIzLTIuNjI1LTAuOTY1LTMuMDM5LTIuMjU4YzAuMTk4LDAuMDM3LDAuNDAyLDAuMDU4LDAuNjExLDAuMDU4YzAuMjk4LDAsMC41ODUtMC4wMzgsMC44NTgtMC4xMTVjLTEuNDg5LTAuMjk3LTIuNjEyLTEuNjEyLTIuNjEyLTMuMTg5di0wLjA0MWMwLjQ0LDAuMjQyLDAuOTQyLDAuMzg5LDEuNDc1LDAuNDA3Yy0wLjg3My0wLjU4NS0xLjQ0Ny0xLjU4MS0xLjQ0Ny0yLjcwOWMwLTAuNTk3LDAuMTYtMS4xNTUsMC40NDEtMS42MzhjMS42MDUsMS45Nyw0LjAwMywzLjI2NCw2LjcwOCwzLjRjLTAuMDU3LTAuMjM4LTAuMDg1LTAuNDg1LTAuMDg1LTAuNzRjMC0xLjc5NywxLjQ1OC0zLjI1NCwzLjI1NC0zLjI1NGMwLjkzNywwLDEuNzgzLDAuMzk1LDIuMzc1LDEuMDI4YzAuNzQyLTAuMTQ2LDEuNDM4LTAuNDE3LDIuMDY3LTAuNzg5Yy0wLjI0MiwwLjc1OS0wLjc1OSwxLjM5Ni0xLjQzMiwxLjc5OWMwLjY1OC0wLjA3OSwxLjI4Ni0wLjI1MywxLjg2OS0wLjUxMUMyMy41MTEsMTIuNTA3LDIyLjk1OSwxMy4wNzksMjIuMzIyLDEzLjUzOVxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0PC9hPlxcblx0XHRcdDwvbGk+XFxuXHRcdFx0PGxpPlxcblx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy50d2l0dGVyVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50d2l0dGVyVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJ0d2l0dGVyVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xNi4wMDEsMC4xNjdjLTguNzQ1LDAtMTUuODM0LDcuMDktMTUuODM0LDE1LjgzNGMwLDguNzQ1LDcuMDg5LDE1LjgzNSwxNS44MzQsMTUuODM1YzguNzQ1LDAsMTUuODM0LTcuMDksMTUuODM0LTE1LjgzNUMzMS44MzYsNy4yNTcsMjQuNzQ2LDAuMTY3LDE2LjAwMSwwLjE2NyBNMTkuNDk4LDEzLjMybC0wLjE4NCwyLjM2OWgtMi40Mjd2OC4yMjloLTMuMDY4di04LjIyOWgtMS42MzhWMTMuMzJoMS42Mzh2LTEuNTkyYzAtMC43MDEsMC4wMTctMS43ODIsMC41MjctMi40NTNjMC41MzYtMC43MDksMS4yNzMtMS4xOTEsMi41NDEtMS4xOTFjMi4wNjYsMCwyLjkzNSwwLjI5NSwyLjkzNSwwLjI5NWwtMC40MSwyLjQyNWMwLDAtMC42ODItMC4xOTYtMS4zMTgtMC4xOTZjLTAuNjM3LDAtMS4yMDcsMC4yMjctMS4yMDcsMC44NjN2MS44NUgxOS40OTh6XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHQ8L2E+XFxuXHRcdFx0PC9saT5cXG5cdFx0XHQ8bGk+XFxuXHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmluc3RhZ3JhbVVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5zdGFncmFtVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJpbnN0YWdyYW1VcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE5LjQxMywxMi42MDJsLTAuMDA5LTIuNjg2bDIuNjg1LTAuMDA4djIuNjg0TDE5LjQxMywxMi42MDJ6IE0xNi4wMDQsMTguNzg4YzEuNTM2LDAsMi43ODctMS4yNSwyLjc4Ny0yLjc4N2MwLTAuNjA1LTAuMTk2LTEuMTY2LTAuNTI4LTEuNjI0Yy0wLjUwNy0wLjcwMy0xLjMyOS0xLjE2My0yLjI1OS0xLjE2M2MtMC45MzEsMC0xLjc1MywwLjQ2LTIuMjYsMS4xNjNjLTAuMzMsMC40NTgtMC41MjcsMS4wMTktMC41MjcsMS42MjRDMTMuMjE3LDE3LjUzOCwxNC40NjcsMTguNzg4LDE2LjAwNCwxOC43ODh6IE0yMC4zMzMsMTYuMDAxYzAsMi4zODctMS45NDIsNC4zMy00LjMyOSw0LjMzYy0yLjM4OCwwLTQuMzI5LTEuOTQzLTQuMzI5LTQuMzNjMC0wLjU3NSwwLjExNC0xLjEyMywwLjMxOC0xLjYyNEg5LjYyOXY2LjQ4MWMwLDAuODM2LDAuNjgxLDEuNTE4LDEuNTE4LDEuNTE4aDkuNzE0YzAuODM3LDAsMS41MTctMC42ODIsMS41MTctMS41MTh2LTYuNDgxaC0yLjM2M0MyMC4yMTcsMTQuODc4LDIwLjMzMywxNS40MjYsMjAuMzMzLDE2LjAwMXogTTMxLjgzNiwxNi4wMDFjMCw4Ljc0NC03LjA5LDE1LjgzNS0xNS44MzUsMTUuODM1UzAuMTY3LDI0Ljc0NSwwLjE2NywxNi4wMDFjMC04Ljc0NSw3LjA4OS0xNS44MzQsMTUuODM0LTE1LjgzNFMzMS44MzYsNy4yNTYsMzEuODM2LDE2LjAwMXogTTIzLjkyMSwxMS4xNDRjMC0xLjY4OC0xLjM3My0zLjA2LTMuMDYyLTMuMDZoLTkuNzEzYy0xLjY4NywwLTMuMDYsMS4zNzEtMy4wNiwzLjA2djkuNzE0YzAsMS42ODgsMS4zNzMsMy4wNiwzLjA2LDMuMDZoOS43MTNjMS42ODgsMCwzLjA2Mi0xLjM3MiwzLjA2Mi0zLjA2VjExLjE0NHpcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdDwvYT5cXG5cdFx0XHQ8L2xpPlxcblx0XHQ8L3VsPlxcblx0PC9mb290ZXI+XFxuPC9kaXY+XCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGlkPSdwYWdlcy1jb250YWluZXInPlxcblx0PGRpdiBpZD0ncGFnZS1hJz48L2Rpdj5cXG5cdDxkaXYgaWQ9J3BhZ2UtYic+PC9kaXY+XFxuPC9kaXY+XCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGNsYXNzPSdwYWdlLXdyYXBwZXInPlxcblx0PGRpdiBjbGFzcz1cXFwidmVydGljYWwtY2VudGVyLXBhcmVudFxcXCI+XFxuXHRcdDxwIGNsYXNzPVxcXCJ2ZXJ0aWNhbC1jZW50ZXItY2hpbGRcXFwiPlxcblx0XHRcdHBsYW5ldCBjYW1wYWlnbiBwYWdlXFxuXHRcdDwvcD5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdDxkaXYgY2xhc3M9XFxcInZlcnRpY2FsLWNlbnRlci1wYXJlbnRcXFwiPlxcblx0XHQ8cCBjbGFzcz1cXFwidmVydGljYWwtY2VudGVyLWNoaWxkXFxcIj5cXG5cdFx0XHRwbGFuZXQgZXhwZXJpZW5jZSBwYWdlXFxuXHRcdDwvcD5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdDxkaXYgY2xhc3M9XFxcInZlcnRpY2FsLWNlbnRlci1wYXJlbnRcXFwiPlxcblx0XHQ8cCBjbGFzcz1cXFwidmVydGljYWwtY2VudGVyLWNoaWxkXFxcIj5cXG5cdFx0XHRcXG5cdFx0PC9wPlxcblx0PC9kaXY+XFxuPC9kaXY+XCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG4gICAgXHRcbmNsYXNzIEdsb2JhbEV2ZW50cyB7XG5cdGluaXQoKSB7XG5cdFx0JCh3aW5kb3cpLm9uKCdyZXNpemUnLCB0aGlzLnJlc2l6ZSlcblx0XHQkKHdpbmRvdykub24oJ21vdXNlbW92ZScsIHRoaXMub25Nb3VzZU1vdmUpXG5cdFx0QXBwU3RvcmUuTW91c2UgPSBuZXcgUElYSS5Qb2ludCgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdEFwcEFjdGlvbnMud2luZG93UmVzaXplKHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQpXG5cdH1cblx0b25Nb3VzZU1vdmUoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdEFwcFN0b3JlLk1vdXNlLnggPSBlLnBhZ2VYXG5cdFx0QXBwU3RvcmUuTW91c2UueSA9IGUucGFnZVlcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBHbG9iYWxFdmVudHNcbiIsImltcG9ydCBvcCBmcm9tICdvYmplY3Rwb29sJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb29sIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy50aW1lbGluZXMgPSBvcC5nZW5lcmF0ZShUaW1lbGluZU1heCwgeyBjb3VudDogNH0pXG5cdFx0dGhpcy5weENvbnRhaW5lcnMgPSBvcC5nZW5lcmF0ZShQSVhJLkNvbnRhaW5lciwgeyBjb3VudDogMn0pXG5cdH1cblx0Z2V0VGltZWxpbmUoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGltZWxpbmVzLmdldCgpXG5cdH1cblx0cmVsZWFzZVRpbWVsaW5lKGl0ZW0pIHtcblx0XHR0aGlzLnRpbWVsaW5lcy5yZWxlYXNlKGl0ZW0pXG5cdH1cblx0Z2V0Q29udGFpbmVyKCkge1xuXHRcdHJldHVybiB0aGlzLnB4Q29udGFpbmVycy5nZXQoKVxuXHR9XG5cdHJlbGVhc2VDb250YWluZXIoaXRlbSkge1xuXHRcdHRoaXMucHhDb250YWluZXJzLnJlbGVhc2UoaXRlbSlcblx0fVxufVxuIiwiY2xhc3MgUHJlbG9hZGVyICB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMucXVldWUgPSBuZXcgY3JlYXRlanMuTG9hZFF1ZXVlKClcblx0XHR0aGlzLnF1ZXVlLm9uKFwiY29tcGxldGVcIiwgdGhpcy5vbk1hbmlmZXN0TG9hZENvbXBsZXRlZCwgdGhpcylcblx0XHR0aGlzLmN1cnJlbnRMb2FkZWRDYWxsYmFjayA9IHVuZGVmaW5lZFxuXHR9XG5cdGxvYWQobWFuaWZlc3QsIG9uTG9hZGVkKSB7XG5cdFx0dGhpcy5jdXJyZW50TG9hZGVkQ2FsbGJhY2sgPSBvbkxvYWRlZFxuICAgICAgICB0aGlzLnF1ZXVlLmxvYWRNYW5pZmVzdChtYW5pZmVzdClcblx0fVxuXHRvbk1hbmlmZXN0TG9hZENvbXBsZXRlZCgpIHtcblx0XHR0aGlzLmN1cnJlbnRMb2FkZWRDYWxsYmFjaygpXG5cdH1cblx0Z2V0Q29udGVudEJ5SWQoaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5xdWV1ZS5nZXRSZXN1bHQoaWQpXG5cdH1cblx0Z2V0U3ZnKGlkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0Q29udGVudEJ5SWQoaWQrXCItc3ZnXCIpXG5cdH1cblx0Z2V0SW1hZ2VVUkwoaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5nZXRDb250ZW50QnlJZChpZCkuZ2V0QXR0cmlidXRlKFwic3JjXCIpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUHJlbG9hZGVyXG4iLCJpbXBvcnQgZGF0YSBmcm9tICdHbG9iYWxEYXRhJ1xuaW1wb3J0IGhhc2hlciBmcm9tICdoYXNoZXInXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IGNyb3Nzcm9hZHMgZnJvbSAnY3Jvc3Nyb2FkcydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuY2xhc3MgUm91dGVyIHtcblx0aW5pdCgpIHtcblx0XHR0aGlzLnJvdXRpbmcgPSBkYXRhLnJvdXRpbmdcblx0XHR0aGlzLmRlZmF1bHRSb3V0ZSA9IHRoaXMucm91dGluZ1snLyddXG5cdFx0dGhpcy5uZXdIYXNoRm91bmRlZCA9IGZhbHNlXG5cdFx0aGFzaGVyLm5ld0hhc2ggPSB1bmRlZmluZWRcblx0XHRoYXNoZXIub2xkSGFzaCA9IHVuZGVmaW5lZFxuXHRcdGhhc2hlci5wcmVwZW5kSGFzaCA9ICchJ1xuXHRcdGhhc2hlci5pbml0aWFsaXplZC5hZGQodGhpcy5fZGlkSGFzaGVyQ2hhbmdlLmJpbmQodGhpcykpXG5cdFx0aGFzaGVyLmNoYW5nZWQuYWRkKHRoaXMuX2RpZEhhc2hlckNoYW5nZS5iaW5kKHRoaXMpKVxuXHRcdHRoaXMuX3NldHVwQ3Jvc3Nyb2FkcygpXG5cdH1cblx0YmVnaW5Sb3V0aW5nKCkge1xuXHRcdGhhc2hlci5pbml0KClcblx0fVxuXHRfc2V0dXBDcm9zc3JvYWRzKCkge1xuXHRcdHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG5cdFx0dmFyIGJhc2ljU2VjdGlvbiA9IGNyb3Nzcm9hZHMuYWRkUm91dGUoJ3twYWdlfScsIHRoaXMuX29uRmlyc3REZWdyZWVVUkxIYW5kbGVyLmJpbmQodGhpcyksIDMpXG5cdFx0YmFzaWNTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgICAgIHBhZ2UgOiBbJ2xhbmRpbmcnXSAvL3ZhbGlkIHNlY3Rpb25zXG5cdCAgICB9XG5cdCAgICB2YXIgcGxhbmV0UHJvZHVjdFNlY3Rpb24gPSBjcm9zc3JvYWRzLmFkZFJvdXRlKCcvcGxhbmV0L3twbGFuZXRJZH0ve3Byb2R1Y3RJZH0nLCB0aGlzLl9vblBsYW5ldFByb2R1Y3RVUkxIYW5kbGVyLmJpbmQodGhpcyksIDIpXG5cdCAgICBwbGFuZXRQcm9kdWN0U2VjdGlvbi5ydWxlcyA9IHtcblx0ICAgIFx0cGxhbmV0SWQ6IHBsYW5ldHMsXG5cdCAgICBcdHByb2R1Y3RJZCA6IC9eWzAtMl0vXG5cdCAgICB9XG5cdCAgICB2YXIgcGxhbmV0U2VjdGlvbiA9IGNyb3Nzcm9hZHMuYWRkUm91dGUoJy9wbGFuZXQve3BsYW5ldElkfScsIHRoaXMuX29uUGxhbmV0VVJMSGFuZGxlci5iaW5kKHRoaXMpLCAyKVxuXHQgICAgcGxhbmV0U2VjdGlvbi5ydWxlcyA9IHtcblx0ICAgIFx0cGxhbmV0SWQ6IHBsYW5ldHNcblx0ICAgIH1cblx0fVxuXHRfb25GaXJzdERlZ3JlZVVSTEhhbmRsZXIocGFnZUlkKSB7XG5cdFx0dGhpcy5fYXNzaWduUm91dGUocGFnZUlkKVxuXHR9XG5cdF9vblBsYW5ldFByb2R1Y3RVUkxIYW5kbGVyKHBsYW5ldElkLCBwcm9kdWN0SWQpIHtcblx0XHR0aGlzLl9hc3NpZ25Sb3V0ZShwcm9kdWN0SWQpXG5cdH1cblx0X29uUGxhbmV0VVJMSGFuZGxlcihwbGFuZXRJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHBsYW5ldElkKVxuXHR9XG5cdF9vbkJsb2dQb3N0VVJMSGFuZGxlcihwb3N0SWQpIHtcblx0XHR0aGlzLl9hc3NpZ25Sb3V0ZShwb3N0SWQpXG5cdH1cblx0X29uRGVmYXVsdFVSTEhhbmRsZXIoKSB7XG5cdFx0dGhpcy5fc2VuZFRvRGVmYXVsdCgpXG5cdH1cblx0X2Fzc2lnblJvdXRlKGlkKSB7XG5cdFx0dmFyIGhhc2ggPSBoYXNoZXIuZ2V0SGFzaCgpXG5cdFx0dmFyIHBhcnRzID0gdGhpcy5fZ2V0VVJMUGFydHMoaGFzaClcblx0XHR0aGlzLl91cGRhdGVQYWdlUm91dGUoaGFzaCwgcGFydHMsIHBhcnRzWzBdLCBpZClcblx0XHR0aGlzLm5ld0hhc2hGb3VuZGVkID0gdHJ1ZVxuXHR9XG5cdF9nZXRVUkxQYXJ0cyh1cmwpIHtcblx0XHR2YXIgaGFzaCA9IHVybFxuXHRcdGhhc2ggPSBoYXNoLnN1YnN0cigxKVxuXHRcdHJldHVybiBoYXNoLnNwbGl0KCcvJylcblx0fVxuXHRfdXBkYXRlUGFnZVJvdXRlKGhhc2gsIHBhcnRzLCBwYXJlbnQsIHRhcmdldElkKSB7XG5cdFx0aGFzaGVyLm9sZEhhc2ggPSBoYXNoZXIubmV3SGFzaFxuXHRcdGhhc2hlci5uZXdIYXNoID0ge1xuXHRcdFx0aGFzaDogaGFzaCxcblx0XHRcdHBhcnRzOiBwYXJ0cyxcblx0XHRcdHBhcmVudDogcGFyZW50LFxuXHRcdFx0dGFyZ2V0SWQ6IHRhcmdldElkXG5cdFx0fVxuXHRcdEFwcEFjdGlvbnMucGFnZUhhc2hlckNoYW5nZWQoKVxuXHR9XG5cdF9kaWRIYXNoZXJDaGFuZ2UobmV3SGFzaCwgb2xkSGFzaCkge1xuXHRcdHRoaXMubmV3SGFzaEZvdW5kZWQgPSBmYWxzZVxuXHRcdGNyb3Nzcm9hZHMucGFyc2UobmV3SGFzaClcblx0XHRpZih0aGlzLm5ld0hhc2hGb3VuZGVkKSByZXR1cm5cblx0XHQvLyBJZiBVUkwgZG9uJ3QgbWF0Y2ggYSBwYXR0ZXJuLCBzZW5kIHRvIGRlZmF1bHRcblx0XHR0aGlzLl9vbkRlZmF1bHRVUkxIYW5kbGVyKClcblx0fVxuXHRfc2VuZFRvRGVmYXVsdCgpIHtcblx0XHRoYXNoZXIuc2V0SGFzaChBcHBTdG9yZS5kZWZhdWx0Um91dGUoKSlcblx0fVxuXHRzdGF0aWMgZ2V0QmFzZVVSTCgpIHtcblx0XHRyZXR1cm4gZG9jdW1lbnQuVVJMLnNwbGl0KFwiI1wiKVswXVxuXHR9XG5cdHN0YXRpYyBnZXRIYXNoKCkge1xuXHRcdHJldHVybiBoYXNoZXIuZ2V0SGFzaCgpXG5cdH1cblx0c3RhdGljIGdldFJvdXRlcygpIHtcblx0XHRyZXR1cm4gZGF0YS5yb3V0aW5nXG5cdH1cblx0c3RhdGljIGdldE5ld0hhc2goKSB7XG5cdFx0cmV0dXJuIGhhc2hlci5uZXdIYXNoXG5cdH1cblx0c3RhdGljIGdldE9sZEhhc2goKSB7XG5cdFx0cmV0dXJuIGhhc2hlci5vbGRIYXNoXG5cdH1cblx0c3RhdGljIHNldEhhc2goaGFzaCkge1xuXHRcdGhhc2hlci5zZXRIYXNoKGhhc2gpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUm91dGVyXG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcblxuZnVuY3Rpb24gX2dldFRpbWVsaW5lKGFyZ3MpIHtcblx0dmFyIHRsID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHR0bC5ldmVudENhbGxiYWNrKFwib25Db21wbGV0ZVwiLCBhcmdzLm9uQ29tcGxldGUpXG5cdHJldHVybiB0bFxufVxuXG52YXIgVHJhbnNpdGlvbkFuaW1hdGlvbnMgPSB7XG5cblx0Ly8gRVhQRVJJRU5DRSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCdleHBlcmllbmNlLWluJzogZnVuY3Rpb24oc2NvcGUsIGFyZ3MpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHRpbWVsaW5lID0gX2dldFRpbWVsaW5lKGFyZ3MpXG5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGltZWxpbmUuZnJvbSh3cmFwcGVyLCAxLCB7IG9wYWNpdHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9KVxuXG5cdFx0c3dpdGNoKHR5cGVzLm9sZFR5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHg6d2luZG93VywgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHg6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuQ0FNUEFJR046XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHRcdHJldHVybiB0aW1lbGluZVxuXHR9LFxuXHQnZXhwZXJpZW5jZS1vdXQnOiBmdW5jdGlvbihzY29wZSwgYXJncykge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgdGltZWxpbmUgPSBfZ2V0VGltZWxpbmUoYXJncylcblxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR0aW1lbGluZS50byh3cmFwcGVyLCAxLCB7IG9wYWNpdHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9KVxuXHRcdFxuXHRcdHN3aXRjaCh0eXBlcy5uZXdUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxBTkRJTkc6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB4OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB4Oi13aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdFx0cmV0dXJuIHRpbWVsaW5lXG5cdH0sXG5cblx0Ly8gQ0FNUEFJR04gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQnY2FtcGFpZ24taW4nOiBmdW5jdGlvbihzY29wZSwgYXJncykge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgdGltZWxpbmUgPSBfZ2V0VGltZWxpbmUoYXJncylcblxuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHRpbWVsaW5lLmZyb20od3JhcHBlciwgMSwgeyBvcGFjaXR5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblxuXHRcdHN3aXRjaCh0eXBlcy5vbGRUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxBTkRJTkc6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OndpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OndpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdFx0cmV0dXJuIHRpbWVsaW5lXG5cdH0sXG5cdCdjYW1wYWlnbi1vdXQnOiBmdW5jdGlvbihzY29wZSwgYXJncykge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgdGltZWxpbmUgPSBfZ2V0VGltZWxpbmUoYXJncylcblxuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHRpbWVsaW5lLnRvKHdyYXBwZXIsIDEsIHsgb3BhY2l0eTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0pXG5cdFx0XG5cdFx0c3dpdGNoKHR5cGVzLm5ld1R5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0XHRyZXR1cm4gdGltZWxpbmVcblx0fSxcblxuXHQvLyBMQU5ESU5HIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0J2xhbmRpbmctaW4nOiBmdW5jdGlvbihzY29wZSwgYXJncykge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgdGltZWxpbmUgPSBfZ2V0VGltZWxpbmUoYXJncylcblxuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aW1lbGluZS5mcm9tKHdyYXBwZXIsIDEsIHsgb3BhY2l0eTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0pXG5cblx0XHRzd2l0Y2godHlwZXMub2xkVHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkNBTVBBSUdOOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0XHRyZXR1cm4gdGltZWxpbmVcblx0fSxcblx0J2xhbmRpbmctb3V0JzogZnVuY3Rpb24oc2NvcGUsIGFyZ3MpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHRpbWVsaW5lID0gX2dldFRpbWVsaW5lKGFyZ3MpXG5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGltZWxpbmUudG8od3JhcHBlciwgMSwgeyBvcGFjaXR5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHRcblx0XHRzd2l0Y2godHlwZXMubmV3VHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR0aW1lbGluZS50byhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUudG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0XHRyZXR1cm4gdGltZWxpbmVcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBUcmFuc2l0aW9uQW5pbWF0aW9uc1xuIiwiaW1wb3J0IEFwcERpc3BhdGNoZXIgZnJvbSAnQXBwRGlzcGF0Y2hlcidcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IHtFdmVudEVtaXR0ZXIyfSBmcm9tICdldmVudGVtaXR0ZXIyJ1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJ1xuaW1wb3J0IGRhdGEgZnJvbSAnR2xvYmFsRGF0YSdcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuXG5mdW5jdGlvbiBfcGFnZVJvdXRlSWRDaGFuZ2VkKGlkKSB7XG59XG5mdW5jdGlvbiBfZ2V0UGFnZUNvbnRlbnQoKSB7XG4gICAgdmFyIHNjb3BlID0gX2dldFBhZ2VJZCgpXG4gICAgdmFyIGxhbmdDb250ZW50ID0gX2dldENvbnRlbnRCeUxhbmcoSlNfbGFuZylcbiAgICB2YXIgcGFnZUNvbnRlbnQgPSBsYW5nQ29udGVudFtzY29wZV1cbiAgICByZXR1cm4gcGFnZUNvbnRlbnRcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlSWQoKSB7XG4gICAgcmV0dXJuIF9nZXRDb250ZW50U2NvcGUoKS5pZFxufVxuZnVuY3Rpb24gX2dldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKSB7XG4gICAgdmFyIG5ld0hhc2hlciA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICB2YXIgb2xkSGFzaGVyID0gUm91dGVyLmdldE9sZEhhc2goKVxuICAgIHJldHVybiB7IG5ld1R5cGU6IF9nZXRUeXBlT2ZQYWdlKG5ld0hhc2hlciksIG9sZFR5cGU6IF9nZXRUeXBlT2ZQYWdlKG9sZEhhc2hlcikgfVxufVxuZnVuY3Rpb24gX2dldFR5cGVPZlBhZ2UoaGFzaCkge1xuICAgIHZhciBoID0gaGFzaCB8fCBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG4gICAgaWYoaCA9PSB1bmRlZmluZWQpIHJldHVybiBBcHBDb25zdGFudHMuTk9ORVxuICAgIGlmKGgucGFydHMubGVuZ3RoID09IDMpIHJldHVybiBBcHBDb25zdGFudHMuQ0FNUEFJR05cbiAgICBlbHNlIGlmKGgucGFydHMubGVuZ3RoID09IDIpIHJldHVybiBBcHBDb25zdGFudHMuRVhQRVJJRU5DRVxuICAgIGVsc2UgcmV0dXJuIEFwcENvbnN0YW50cy5MQU5ESU5HXG59XG5mdW5jdGlvbiBfZ2V0Q29udGVudFNjb3BlKCkge1xuICAgIHZhciBoYXNoT2JqID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgIHZhciByb3V0ZVNjb3BlO1xuICAgIGlmKGhhc2hPYmoucGFydHMubGVuZ3RoID4gMikge1xuICAgICAgICB2YXIgcGFyZW50UGF0aCA9IGhhc2hPYmouaGFzaC5yZXBsYWNlKCcvJytoYXNoT2JqLnRhcmdldElkLCAnJylcbiAgICAgICAgcm91dGVTY29wZSA9IEFwcFN0b3JlLmdldFJvdXRlUGF0aFNjb3BlQnlJZChwYXJlbnRQYXRoKVxuICAgIH1lbHNle1xuICAgICAgICByb3V0ZVNjb3BlID0gQXBwU3RvcmUuZ2V0Um91dGVQYXRoU2NvcGVCeUlkKGhhc2hPYmouaGFzaClcbiAgICB9XG4gICAgcmV0dXJuIHJvdXRlU2NvcGVcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlQXNzZXRzVG9Mb2FkKCkge1xuICAgIHZhciBzY29wZSA9IF9nZXRDb250ZW50U2NvcGUoKVxuICAgIHZhciBoYXNoT2JqID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgIHZhciB0YXJnZXRJZDtcbiAgICB2YXIgdHlwZSA9IF9nZXRUeXBlT2ZQYWdlKClcbiAgICB0YXJnZXRJZCA9IHR5cGUudG9Mb3dlckNhc2UoKSArICctYXNzZXRzJ1xuICAgIHZhciBtYW5pZmVzdCA9IF9hZGRCYXNlUGF0aHNUb1VybHMoc2NvcGVbdGFyZ2V0SWRdLCBzY29wZS5pZCwgdGFyZ2V0SWQsIHR5cGUpXG4gICAgcmV0dXJuIG1hbmlmZXN0XG59XG5mdW5jdGlvbiBfYWRkQmFzZVBhdGhzVG9VcmxzKHVybHMsIHBhZ2VJZCwgdGFyZ2V0SWQsIHR5cGUpIHtcbiAgICB2YXIgYmFzZVBhdGggPSBfZ2V0UGFnZUFzc2V0c0Jhc2VQYXRoQnlJZChwYWdlSWQsIHRhcmdldElkKVxuICAgIHZhciBtYW5pZmVzdCA9IFtdXG4gICAgaWYodXJscyA9PSB1bmRlZmluZWQgfHwgdXJscy5sZW5ndGggPCAxKSByZXR1cm4gbWFuaWZlc3RcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHVybHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNwbGl0dGVyID0gdXJsc1tpXS5zcGxpdCgnLicpXG4gICAgICAgIHZhciBmaWxlTmFtZSA9IHNwbGl0dGVyWzBdXG4gICAgICAgIHZhciBleHRlbnNpb24gPSBzcGxpdHRlclsxXVxuICAgICAgICBtYW5pZmVzdFtpXSA9IHtcbiAgICAgICAgICAgIGlkOiBwYWdlSWQgKyAnLScgKyB0eXBlLnRvTG93ZXJDYXNlKCkgKyAnLScgKyBmaWxlTmFtZSxcbiAgICAgICAgICAgIHNyYzogYmFzZVBhdGggKyBmaWxlTmFtZSArICcuJyArIGV4dGVuc2lvblxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYW5pZmVzdFxufVxuZnVuY3Rpb24gX2dldFBhZ2VBc3NldHNCYXNlUGF0aEJ5SWQoaWQsIGFzc2V0R3JvdXBJZCkge1xuICAgIHJldHVybiBBcHBTdG9yZS5iYXNlTWVkaWFQYXRoKCkgKyAnL2ltYWdlL3BsYW5ldHMvJyArIGlkICsgJy8nICsgYXNzZXRHcm91cElkICsgJy8nXG59XG5mdW5jdGlvbiBfZ2V0TWVudUNvbnRlbnQoKSB7XG4gICAgcmV0dXJuIGRhdGEubWVudVxufVxuZnVuY3Rpb24gX2dldENvbnRlbnRCeUxhbmcobGFuZykge1xuICAgIHJldHVybiBkYXRhLmxhbmdbbGFuZ11cbn1cbmZ1bmN0aW9uIF9nZXRBcHBEYXRhKCkge1xuICAgIHJldHVybiBkYXRhXG59XG5mdW5jdGlvbiBfZ2V0RGVmYXVsdFJvdXRlKCkge1xuICAgIHJldHVybiBkYXRhWydkZWZhdWx0LXJvdXRlJ11cbn1cbmZ1bmN0aW9uIF9nZXRHbG9iYWxDb250ZW50KCkge1xuICAgIHZhciBsYW5nQ29udGVudCA9IF9nZXRDb250ZW50QnlMYW5nKEpTX2xhbmcpXG4gICAgcmV0dXJuIGxhbmdDb250ZW50WydnbG9iYWwnXVxufVxuZnVuY3Rpb24gX3dpbmRvd1dpZHRoSGVpZ2h0KCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHc6IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICBoOiB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICB9XG59XG52YXIgQXBwU3RvcmUgPSBhc3NpZ24oe30sIEV2ZW50RW1pdHRlcjIucHJvdG90eXBlLCB7XG4gICAgZW1pdENoYW5nZTogZnVuY3Rpb24odHlwZSwgaXRlbSkge1xuICAgICAgICB0aGlzLmVtaXQodHlwZSwgaXRlbSlcbiAgICB9LFxuICAgIHBhZ2VDb250ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRQYWdlQ29udGVudCgpXG4gICAgfSxcbiAgICBtZW51Q29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0TWVudUNvbnRlbnQoKVxuICAgIH0sXG4gICAgYXBwRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0QXBwRGF0YSgpXG4gICAgfSxcbiAgICBkZWZhdWx0Um91dGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldERlZmF1bHRSb3V0ZSgpXG4gICAgfSxcbiAgICBnbG9iYWxDb250ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRHbG9iYWxDb250ZW50KClcbiAgICB9LFxuICAgIGdlbmVyYWxJbmZvczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmluZm9zXG4gICAgfSxcbiAgICBtYWluSW1hZ2VVcmw6IGZ1bmN0aW9uKGlkLCByZXNwb25zaXZlQXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLmJhc2VNZWRpYVBhdGgoKSArICcvaW1hZ2UvcGxhbmV0cy8nICsgaWQgKyAnL21haW4tJyArIEFwcFN0b3JlLnJlc3BvbnNpdmVJbWFnZVdpZHRoKHJlc3BvbnNpdmVBcnJheSkgKyAnLmpwZydcbiAgICB9LFxuICAgIGJhc2VNZWRpYVBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuZ2V0RW52aXJvbm1lbnQoKS5zdGF0aWNcbiAgICB9LFxuICAgIGdldFJvdXRlUGF0aFNjb3BlQnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEucm91dGluZ1tpZF1cbiAgICB9LFxuICAgIGdldFBhZ2VJZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0UGFnZUlkKClcbiAgICB9LFxuICAgIGdldFR5cGVPZk5ld0FuZE9sZFBhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuICAgIH0sXG4gICAgZ2V0VHlwZU9mUGFnZTogZnVuY3Rpb24oaGFzaCkge1xuICAgICAgICByZXR1cm4gX2dldFR5cGVPZlBhZ2UoaGFzaClcbiAgICB9LFxuICAgIGdldEVudmlyb25tZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcENvbnN0YW50cy5FTlZJUk9OTUVOVFNbRU5WXVxuICAgIH0sXG4gICAgZ2V0TGluZVdpZHRoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIDNcbiAgICB9LFxuICAgIHBhZ2VBc3NldHNUb0xvYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldFBhZ2VBc3NldHNUb0xvYWQoKVxuICAgIH0sXG4gICAgcmVzcG9uc2l2ZUltYWdlV2lkdGg6IGZ1bmN0aW9uKHJlc3BvbnNpdmVBcnJheSkge1xuICAgICAgICB2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG4gICAgICAgIHJldHVybiBVdGlscy5DbG9zZXN0KHJlc3BvbnNpdmVBcnJheSwgd2luZG93VylcbiAgICB9LFxuICAgIHJlc3BvbnNpdmVJbWFnZVNpemU6IGZ1bmN0aW9uKHJlc3BvbnNpdmVBcnJheSwgYmFzZVdpZHRoLCBiYXNlSGVpZ2h0KSB7XG4gICAgICAgIHZhciBiYXNlVyA9IGJhc2VXaWR0aCB8fCBBcHBDb25zdGFudHMuTUVESUFfR0xPQkFMX1dcbiAgICAgICAgdmFyIGJhc2VIID0gYmFzZUhlaWdodCB8fCBBcHBDb25zdGFudHMuTUVESUFfR0xPQkFMX0hcbiAgICAgICAgdmFyIHJlc3BvbnNpdmVXaWR0aCA9IEFwcFN0b3JlLnJlc3BvbnNpdmVJbWFnZVdpZHRoKHJlc3BvbnNpdmVBcnJheSlcbiAgICAgICAgdmFyIHNjYWxlID0gKHJlc3BvbnNpdmVXaWR0aCAvIGJhc2VXKSAqIDFcbiAgICAgICAgdmFyIHJlc3BvbnNpdmVIZWlnaHQgPSBiYXNlSCAqIHNjYWxlXG4gICAgICAgIHJldHVybiBbIHJlc3BvbnNpdmVXaWR0aCwgcmVzcG9uc2l2ZUhlaWdodCBdXG4gICAgfSxcbiAgICBwbGFuZXRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEucGxhbmV0c1xuICAgIH0sXG4gICAgZWxlbWVudHNPZk5hdHVyZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmVsZW1lbnRzXG4gICAgfSxcbiAgICBhbGxHZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGF0YS5nZW5kZXJcbiAgICB9LFxuICAgIHByb2R1Y3RzRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhWydwcm9kdWN0cy1kYXRhJ11cbiAgICB9LFxuICAgIHByb2R1Y3RzRGF0YUJ5SWQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBkYXRhID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhKClcbiAgICAgICAgcmV0dXJuIGRhdGFbaWRdXG4gICAgfSxcbiAgICBXaW5kb3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX3dpbmRvd1dpZHRoSGVpZ2h0KClcbiAgICB9LFxuICAgIGFkZFBYQ2hpbGQ6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgQXBwU3RvcmUuUFhDb250YWluZXIuYWRkKGl0ZW0uY2hpbGQpXG4gICAgfSxcbiAgICByZW1vdmVQWENoaWxkOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIEFwcFN0b3JlLlBYQ29udGFpbmVyLnJlbW92ZShpdGVtLmNoaWxkKVxuICAgIH0sXG4gICAgZ2V0VGltZWxpbmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5nZXRUaW1lbGluZSgpXG4gICAgfSxcbiAgICByZWxlYXNlVGltZWxpbmU6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVRpbWVsaW5lKGl0ZW0pXG4gICAgfSxcbiAgICBnZXRDb250YWluZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5nZXRDb250YWluZXIoKVxuICAgIH0sXG4gICAgcmVsZWFzZUNvbnRhaW5lcjogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlQ29udGFpbmVyKGl0ZW0pXG4gICAgfSxcbiAgICBQb29sOiB1bmRlZmluZWQsXG4gICAgTW91c2U6IHVuZGVmaW5lZCxcbiAgICBQWENvbnRhaW5lcjogdW5kZWZpbmVkLFxuICAgIE9yaWVudGF0aW9uOiBBcHBDb25zdGFudHMuTEFORFNDQVBFLFxuICAgIGRpc3BhdGNoZXJJbmRleDogQXBwRGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKXtcbiAgICAgICAgdmFyIGFjdGlvbiA9IHBheWxvYWQuYWN0aW9uXG4gICAgICAgIHN3aXRjaChhY3Rpb24uYWN0aW9uVHlwZSkge1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRDpcbiAgICAgICAgICAgICAgICBfcGFnZVJvdXRlSWRDaGFuZ2VkKGFjdGlvbi5pdGVtKVxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLldJTkRPV19SRVNJWkU6XG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuV2luZG93LncgPSBhY3Rpb24uaXRlbS53aW5kb3dXXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuV2luZG93LmggPSBhY3Rpb24uaXRlbS53aW5kb3dIXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuT3JpZW50YXRpb24gPSAoQXBwU3RvcmUuV2luZG93LncgPiBBcHBTdG9yZS5XaW5kb3cuaCkgPyBBcHBDb25zdGFudHMuTEFORFNDQVBFIDogQXBwQ29uc3RhbnRzLlBPUlRSQUlUXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb24uYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0lTX1JFQURZOlxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLlBYQ29udGFpbmVyID0gYWN0aW9uLml0ZW1cbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5lbWl0Q2hhbmdlKGFjdGlvbi5hY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfQUREX0NISUxEOlxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmFkZFBYQ2hpbGQoYWN0aW9uLml0ZW0pXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb24uYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX1JFTU9WRV9DSElMRDpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5yZW1vdmVQWENoaWxkKGFjdGlvbi5pdGVtKVxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgfSlcbn0pXG5cblxuZXhwb3J0IGRlZmF1bHQgQXBwU3RvcmVcblxuIiwiaW1wb3J0IGlzIGZyb20gJ2lzJztcblxuZnVuY3Rpb24gZ2V0QWxsTWV0aG9kcyhvYmopIHtcblx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iailcblx0XHQuZmlsdGVyKGtleSA9PiBpcy5mbihvYmpba2V5XSkpXG59XG5cbmZ1bmN0aW9uIGF1dG9CaW5kKG9iaikge1xuXHQvLyBjb25zb2xlLmxvZygnb2JqIC0tLS0tJywgb2JqKVxuICBcdGdldEFsbE1ldGhvZHMob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSlcblx0XHQuZm9yRWFjaChtdGQgPT4ge1xuXHRcdFx0Ly8gY29uc29sZS5sb2cobXRkKVxuXHRcdFx0b2JqW210ZF0gPSBvYmpbbXRkXS5iaW5kKG9iaik7XG5cdFx0fSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXV0b0JpbmQ7IiwiY2xhc3MgVXRpbHMge1xuXHRzdGF0aWMgTm9ybWFsaXplTW91c2VDb29yZHMoZSwgb2JqV3JhcHBlcikge1xuXHRcdHZhciBwb3N4ID0gMDtcblx0XHR2YXIgcG9zeSA9IDA7XG5cdFx0aWYgKCFlKSB2YXIgZSA9IHdpbmRvdy5ldmVudDtcblx0XHRpZiAoZS5wYWdlWCB8fCBlLnBhZ2VZKSBcdHtcblx0XHRcdHBvc3ggPSBlLnBhZ2VYO1xuXHRcdFx0cG9zeSA9IGUucGFnZVk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKGUuY2xpZW50WCB8fCBlLmNsaWVudFkpIFx0e1xuXHRcdFx0cG9zeCA9IGUuY2xpZW50WCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdFxuXHRcdFx0XHQrIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xuXHRcdFx0cG9zeSA9IGUuY2xpZW50WSArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wXG5cdFx0XHRcdCsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcblx0XHR9XG5cdFx0b2JqV3JhcHBlci54ID0gcG9zeFxuXHRcdG9ialdyYXBwZXIueSA9IHBvc3lcblx0XHRyZXR1cm4gb2JqV3JhcHBlclxuXHR9XG5cdHN0YXRpYyBSZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5KHdpbmRvd1csIHdpbmRvd0gsIGNvbnRlbnRXLCBjb250ZW50SCkge1xuXHRcdHZhciBhc3BlY3RSYXRpbyA9IGNvbnRlbnRXIC8gY29udGVudEhcblx0XHR2YXIgc2NhbGUgPSAoKHdpbmRvd1cgLyB3aW5kb3dIKSA8IGFzcGVjdFJhdGlvKSA/ICh3aW5kb3dIIC8gY29udGVudEgpICogMSA6ICh3aW5kb3dXIC8gY29udGVudFcpICogMVxuXHRcdHZhciBuZXdXID0gY29udGVudFcgKiBzY2FsZVxuXHRcdHZhciBuZXdIID0gY29udGVudEggKiBzY2FsZVxuXHRcdHZhciBjc3MgPSB7XG5cdFx0XHR3aWR0aDogbmV3Vyxcblx0XHRcdGhlaWdodDogbmV3SCxcblx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKG5ld1cgPj4gMSksXG5cdFx0XHR0b3A6ICh3aW5kb3dIID4+IDEpIC0gKG5ld0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcih3aW5kb3dXLCB3aW5kb3dILCBjb250ZW50VywgY29udGVudEgpIHtcblx0XHR2YXIgYXNwZWN0UmF0aW8gPSBjb250ZW50VyAvIGNvbnRlbnRIXG5cdFx0dmFyIHNjYWxlID0gKCh3aW5kb3dXIC8gd2luZG93SCkgPCBhc3BlY3RSYXRpbykgPyAod2luZG93SCAvIGNvbnRlbnRIKSAqIDEgOiAod2luZG93VyAvIGNvbnRlbnRXKSAqIDFcblx0XHR2YXIgbmV3VyA9IGNvbnRlbnRXICogc2NhbGVcblx0XHR2YXIgbmV3SCA9IGNvbnRlbnRIICogc2NhbGVcblx0XHR2YXIgY3NzID0ge1xuXHRcdFx0d2lkdGg6IG5ld1csXG5cdFx0XHRoZWlnaHQ6IG5ld0gsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSxcblx0XHRcdHRvcDogKHdpbmRvd0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSYW5kKG1pbiwgbWF4KSB7XG5cdFx0cmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pblxuXHR9XG5cdHN0YXRpYyBEZWdyZWVzVG9SYWRpYW5zKGRlZ3JlZXMpIHtcblx0XHRyZXR1cm4gZGVncmVlcyAqIChNYXRoLlBJIC8gMTgwKVxuXHR9XG4gICAgc3RhdGljIFJhZGlhbnNUb0RlZ3JlZXMocmFkaWFucykge1xuICAgICAgICByZXR1cm4gcmFkaWFucyAqICgxODAgLyBNYXRoLlBJKVxuICAgIH1cbiAgICBzdGF0aWMgTGltaXQodiwgbWluLCBtYXgpIHtcbiAgICBcdHJldHVybiAoTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHYpKSk7XG4gICAgfVxuXHRzdGF0aWMgQ2xvc2VzdChhcnJheSwgbnVtKSB7XG4gICAgICAgIHZhciBpPTA7XG5cdCAgICB2YXIgbWluRGlmZj0yMDAwO1xuXHQgICAgdmFyIGFucztcblx0ICAgIGZvcihpIGluIGFycmF5KXtcblx0XHRcdHZhciBtPU1hdGguYWJzKG51bS1hcnJheVtpXSk7XG5cdFx0XHRpZihtPG1pbkRpZmYpeyBcblx0XHRcdFx0bWluRGlmZj1tOyBcblx0XHRcdFx0YW5zPWFycmF5W2ldOyBcblx0XHRcdH1cblx0XHR9XG5cdCAgICByZXR1cm4gYW5zO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVXRpbHNcbiIsImNsYXNzIFZlYzIge1xuXHRjb25zdHJ1Y3Rvcih4LCB5KSB7XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRkaXN0YW5jZVRvKHYpIHtcblx0XHRyZXR1cm4gTWF0aC5zcXJ0KCB0aGlzLmRpc3RhbmNlVG9TcXVhcmVkKCB2ICkgKVxuXHR9XG5cdGRpc3RhbmNlVG9TcXVhcmVkKHYpIHtcblx0XHR2YXIgZHggPSB0aGlzLnggLSB2LngsIGR5ID0gdGhpcy55IC0gdi55O1xuXHRcdHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBWZWMyXG4iLCIvLyBodHRwOi8vcGF1bGlyaXNoLmNvbS8yMDExL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtYW5pbWF0aW5nL1xuLy8gaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xuIFxuLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxuIFxuLy8gTUlUIGxpY2Vuc2VcbiBcbihmdW5jdGlvbigpIHtcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgIHZhciB2ZW5kb3JzID0gWydtcycsICdtb3onLCAnd2Via2l0JywgJ28nXTtcbiAgICBmb3IodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsreCkge1xuICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgIH1cbiBcbiAgICBpZiAoIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCkge1xuICAgICAgICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcbiAgICAgICAgICAgIHZhciBpZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LCBcbiAgICAgICAgICAgICAgdGltZVRvQ2FsbCk7XG4gICAgICAgICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfTtcbiBcbiAgICBpZiAoIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSlcbiAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChpZCk7XG4gICAgICAgIH07XG59KCkpOyIsImltcG9ydCBGbHV4IGZyb20gJ2ZsdXgnXG5pbXBvcnQge0V2ZW50RW1pdHRlcjJ9IGZyb20gJ2V2ZW50ZW1pdHRlcjInXG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nXG5cbi8vIEFjdGlvbnNcbnZhciBQYWdlckFjdGlvbnMgPSB7XG4gICAgb25QYWdlUmVhZHk6IGZ1bmN0aW9uKGhhc2gpIHtcbiAgICAgICAgUGFnZXJEaXNwYXRjaGVyLmhhbmRsZVBhZ2VyQWN0aW9uKHtcbiAgICAgICAgXHR0eXBlOiBQYWdlckNvbnN0YW50cy5QQUdFX0lTX1JFQURZLFxuICAgICAgICBcdGl0ZW06IGhhc2hcbiAgICAgICAgfSkgIFxuICAgIH0sXG4gICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgIFx0UGFnZXJEaXNwYXRjaGVyLmhhbmRsZVBhZ2VyQWN0aW9uKHtcbiAgICAgICAgXHR0eXBlOiBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFLFxuICAgICAgICBcdGl0ZW06IHVuZGVmaW5lZFxuICAgICAgICB9KSAgXG4gICAgfSxcbiAgICBwYWdlVHJhbnNpdGlvbkRpZEZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgICAgIFBhZ2VyRGlzcGF0Y2hlci5oYW5kbGVQYWdlckFjdGlvbih7XG4gICAgICAgIFx0dHlwZTogUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0gsXG4gICAgICAgIFx0aXRlbTogdW5kZWZpbmVkXG4gICAgICAgIH0pICBcbiAgICB9XG59XG5cbi8vIENvbnN0YW50c1xudmFyIFBhZ2VyQ29uc3RhbnRzID0ge1xuXHRQQUdFX0lTX1JFQURZOiAnUEFHRV9JU19SRUFEWScsXG5cdFBBR0VfVFJBTlNJVElPTl9JTjogJ1BBR0VfVFJBTlNJVElPTl9JTicsXG5cdFBBR0VfVFJBTlNJVElPTl9PVVQ6ICdQQUdFX1RSQU5TSVRJT05fT1VUJyxcblx0UEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURTogJ1BBR0VfVFJBTlNJVElPTl9PVVRfQ09NUExFVEUnLFxuXHRQQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1M6ICdQQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1MnLFxuXHRQQUdFX1RSQU5TSVRJT05fRElEX0ZJTklTSDogJ1BBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIJyxcbn1cblxuLy8gRGlzcGF0Y2hlclxudmFyIFBhZ2VyRGlzcGF0Y2hlciA9IGFzc2lnbihuZXcgRmx1eC5EaXNwYXRjaGVyKCksIHtcblx0aGFuZGxlUGFnZXJBY3Rpb246IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdHRoaXMuZGlzcGF0Y2goYWN0aW9uKVxuXHR9XG59KVxuXG4vLyBTdG9yZVxudmFyIFBhZ2VyU3RvcmUgPSBhc3NpZ24oe30sIEV2ZW50RW1pdHRlcjIucHJvdG90eXBlLCB7XG4gICAgZmlyc3RQYWdlVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICBwYWdlVHJhbnNpdGlvblN0YXRlOiB1bmRlZmluZWQsIFxuICAgIGRpc3BhdGNoZXJJbmRleDogUGFnZXJEaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpe1xuICAgICAgICB2YXIgYWN0aW9uVHlwZSA9IHBheWxvYWQudHlwZVxuICAgICAgICB2YXIgaXRlbSA9IHBheWxvYWQuaXRlbVxuICAgICAgICBzd2l0Y2goYWN0aW9uVHlwZSkge1xuICAgICAgICAgICAgY2FzZSBQYWdlckNvbnN0YW50cy5QQUdFX0lTX1JFQURZOlxuICAgICAgICAgICAgXHRQYWdlclN0b3JlLnBhZ2VUcmFuc2l0aW9uU3RhdGUgPSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1NcbiAgICAgICAgICAgIFx0dmFyIHR5cGUgPSBQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24gPyBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU4gOiBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VUXG4gICAgICAgICAgICBcdFBhZ2VyU3RvcmUuZW1pdCh0eXBlKVxuICAgICAgICAgICAgXHRicmVha1xuICAgICAgICAgICAgY2FzZSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFOlxuICAgICAgICAgICAgXHR2YXIgdHlwZSA9IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9JTlxuICAgICAgICAgICAgXHRQYWdlclN0b3JlLmVtaXQodHlwZSlcbiAgICAgICAgICAgIFx0YnJlYWtcbiAgICAgICAgICAgIGNhc2UgUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0g6XG4gICAgICAgICAgICBcdGlmIChQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24pIFBhZ2VyU3RvcmUuZmlyc3RQYWdlVHJhbnNpdGlvbiA9IGZhbHNlXG4gICAgICAgICAgICAgICAgUGFnZXJTdG9yZS5wYWdlVHJhbnNpdGlvblN0YXRlID0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0hcbiAgICAgICAgICAgICAgICBQYWdlclN0b3JlLmVtaXQoYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgfSlcbn0pXG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0UGFnZXJTdG9yZTogUGFnZXJTdG9yZSxcblx0UGFnZXJBY3Rpb25zOiBQYWdlckFjdGlvbnMsXG5cdFBhZ2VyQ29uc3RhbnRzOiBQYWdlckNvbnN0YW50cyxcblx0UGFnZXJEaXNwYXRjaGVyOiBQYWdlckRpc3BhdGNoZXJcbn1cbiIsImltcG9ydCBhdXRvYmluZCBmcm9tICdBdXRvYmluZCdcbmltcG9ydCBzbHVnIGZyb20gJ3RvLXNsdWctY2FzZSdcblxuY2xhc3MgQmFzZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdGF1dG9iaW5kKHRoaXMpXG5cdFx0dGhpcy5kb21Jc1JlYWR5ID0gZmFsc2Vcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5kb21Jc1JlYWR5ID0gdHJ1ZVxuXHR9XG5cdHJlbmRlcihjaGlsZElkLCBwYXJlbnRJZCwgdGVtcGxhdGUsIG9iamVjdCkge1xuXHRcdHRoaXMuY29tcG9uZW50V2lsbE1vdW50KClcblx0XHR0aGlzLmNoaWxkSWQgPSBjaGlsZElkXG5cdFx0dGhpcy5wYXJlbnRJZCA9IHBhcmVudElkXG5cdFx0dGhpcy5wYXJlbnQgPSAocGFyZW50SWQgaW5zdGFuY2VvZiBqUXVlcnkpID8gcGFyZW50SWQgOiAkKHRoaXMucGFyZW50SWQpXG5cdFx0dGhpcy5jaGlsZCA9ICh0ZW1wbGF0ZSA9PSB1bmRlZmluZWQpID8gJCgnPGRpdj48L2Rpdj4nKSA6ICQodGVtcGxhdGUob2JqZWN0KSlcblx0XHRpZih0aGlzLmNoaWxkLmF0dHIoJ2lkJykgPT0gdW5kZWZpbmVkKSB0aGlzLmNoaWxkLmF0dHIoJ2lkJywgc2x1ZyhjaGlsZElkKSlcblx0XHR0aGlzLmNoaWxkLnJlYWR5KHRoaXMuY29tcG9uZW50RGlkTW91bnQpXG5cdFx0dGhpcy5wYXJlbnQuYXBwZW5kKHRoaXMuY2hpbGQpXG5cdH1cblx0cmVtb3ZlKCkge1xuXHRcdHRoaXMuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuY2hpbGQucmVtb3ZlKClcblx0XHQvLyBjb25zb2xlLmxvZyh0aGlzLmNoaWxkSWQsICdyZW1vdmVkIGZyb20nLCB0aGlzLnBhcmVudElkKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEJhc2VDb21wb25lbnRcblxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCBUcmFuc2l0aW9uQW5pbWF0aW9ucyBmcm9tICdUcmFuc2l0aW9uQW5pbWF0aW9ucydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZVBhZ2UgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5wcm9wcyA9IHByb3BzXG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSA9IHRoaXMuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlID0gdGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUuYmluZCh0aGlzKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMucmVzaXplKClcblx0XHR0aGlzLnNldHVwQW5pbWF0aW9ucygpXG5cdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLnByb3BzLmlzUmVhZHkodGhpcy5wcm9wcy5oYXNoKSwgMClcblx0fVxuXHRzZXR1cEFuaW1hdGlvbnMoKSB7XG5cdFx0dmFyIGtleU5hbWUgPSB0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKSArICctaW4nXG5cdFx0dGhpcy50bEluID0gVHJhbnNpdGlvbkFuaW1hdGlvbnNba2V5TmFtZV0odGhpcywge29uQ29tcGxldGU6dGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZX0pXG5cdH1cblx0d2lsbFRyYW5zaXRpb25JbigpIHtcblx0XHR0aGlzLnRsSW4ucGxheSgwKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHZhciBrZXlOYW1lID0gdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLW91dCdcblx0XHR0aGlzLnRsT3V0ID0gVHJhbnNpdGlvbkFuaW1hdGlvbnNba2V5TmFtZV0odGhpcywge29uQ29tcGxldGU6dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGV9KVxuXHRcdHRoaXMudGxPdXQucGxheSgwKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wcm9wcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpLCAwKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucHJvcHMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCksIDApXG5cdH1cblx0cmVzaXplKCkge1xuXHR9XG5cdGZvcmNlVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLnRsSW4gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsSW4ucGF1c2UoMClcblx0XHR9XG5cdFx0aWYodGhpcy50bE91dCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxPdXQucGF1c2UoMClcblx0XHR9XG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGlmKHRoaXMudGxJbiAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxJbi5jbGVhcigpXG5cdFx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bEluKVxuXHRcdH1cblx0XHRpZih0aGlzLnRsT3V0ICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy50bE91dC5jbGVhcigpXG5cdFx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bE91dClcblx0XHR9XG5cdH1cbn1cbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQge1BhZ2VyU3RvcmUsIFBhZ2VyQWN0aW9ucywgUGFnZXJDb25zdGFudHMsIFBhZ2VyRGlzcGF0Y2hlcn0gZnJvbSAnUGFnZXInXG5pbXBvcnQgX2NhcGl0YWxpemUgZnJvbSAnbG9kYXNoL1N0cmluZy9jYXBpdGFsaXplJ1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJ1BhZ2VzQ29udGFpbmVyX2hicydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuY2xhc3MgQmFzZVBhZ2VyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0XHR0aGlzLmN1cnJlbnRQYWdlRGl2UmVmID0gJ3BhZ2UtYidcblx0XHR0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluID0gdGhpcy53aWxsUGFnZVRyYW5zaXRpb25Jbi5iaW5kKHRoaXMpXG5cdFx0dGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQgPSB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbk91dC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUgPSB0aGlzLmRpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5kaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlID0gdGhpcy5kaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlLmJpbmQodGhpcylcblx0XHR0aGlzLmNvbXBvbmVudHMgPSB7XG5cdFx0XHQnbmV3LWNvbXBvbmVudCc6IHVuZGVmaW5lZCxcblx0XHRcdCdvbGQtY29tcG9uZW50JzogdW5kZWZpbmVkXG5cdFx0fVxuXHR9XG5cdHJlbmRlcihwYXJlbnQpIHtcblx0XHRzdXBlci5yZW5kZXIoJ0Jhc2VQYWdlcicsIHBhcmVudCwgdGVtcGxhdGUsIHVuZGVmaW5lZClcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdFx0UGFnZXJTdG9yZS5vbihQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU4sIHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uSW4pXG5cdFx0UGFnZXJTdG9yZS5vbihQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VULCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbk91dClcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdHdpbGxQYWdlVHJhbnNpdGlvbkluKCkge1xuXHRcdGlmKFBhZ2VyU3RvcmUuZmlyc3RQYWdlVHJhbnNpdGlvbikge1xuXHRcdFx0dGhpcy5zd2l0Y2hQYWdlc0RpdkluZGV4KClcblx0XHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uSW4oKVxuXHRcdH1cblx0fVxuXHR3aWxsUGFnZVRyYW5zaXRpb25PdXQoKSB7XG5cdFx0dGhpcy5jb21wb25lbnRzWydvbGQtY29tcG9uZW50J10ud2lsbFRyYW5zaXRpb25PdXQoKVxuXHRcdHRoaXMuc3dpdGNoUGFnZXNEaXZJbmRleCgpXG5cdFx0dGhpcy5jb21wb25lbnRzWyduZXctY29tcG9uZW50J10ud2lsbFRyYW5zaXRpb25JbigpXG5cdH1cblx0ZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdkaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUnKVxuXHRcdFBhZ2VyQWN0aW9ucy5wYWdlVHJhbnNpdGlvbkRpZEZpbmlzaCgpXG5cdFx0dGhpcy51bm1vdW50Q29tcG9uZW50KCdvbGQtY29tcG9uZW50Jylcblx0fVxuXHRkaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdkaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlJylcblx0XHRQYWdlckFjdGlvbnMub25UcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHN3aXRjaFBhZ2VzRGl2SW5kZXgoKSB7XG5cdFx0dmFyIG5ld0NvbXBvbmVudCA9IHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddXG5cdFx0dmFyIG9sZENvbXBvbmVudCA9IHRoaXMuY29tcG9uZW50c1snb2xkLWNvbXBvbmVudCddXG5cdFx0aWYobmV3Q29tcG9uZW50ICE9IHVuZGVmaW5lZCkgbmV3Q29tcG9uZW50LmNoaWxkLmNzcygnei1pbmRleCcsIDIpXG5cdFx0aWYob2xkQ29tcG9uZW50ICE9IHVuZGVmaW5lZCkgb2xkQ29tcG9uZW50LmNoaWxkLmNzcygnei1pbmRleCcsIDEpXG5cdH1cblx0c2V0dXBOZXdDb21wb25lbnQoaGFzaCwgdGVtcGxhdGUpIHtcblx0XHR2YXIgaWQgPSBfY2FwaXRhbGl6ZShoYXNoLnJlcGxhY2UoXCIvXCIsIFwiXCIpKVxuXHRcdHRoaXMub2xkUGFnZURpdlJlZiA9IHRoaXMuY3VycmVudFBhZ2VEaXZSZWZcblx0XHR0aGlzLmN1cnJlbnRQYWdlRGl2UmVmID0gKHRoaXMuY3VycmVudFBhZ2VEaXZSZWYgPT09ICdwYWdlLWEnKSA/ICdwYWdlLWInIDogJ3BhZ2UtYSdcblx0XHR2YXIgZWwgPSB0aGlzLmNoaWxkLmZpbmQoJyMnK3RoaXMuY3VycmVudFBhZ2VEaXZSZWYpXG5cdFx0dmFyIHByb3BzID0ge1xuXHRcdFx0aWQ6IHRoaXMuY3VycmVudFBhZ2VEaXZSZWYsXG5cdFx0XHRpc1JlYWR5OiB0aGlzLm9uUGFnZVJlYWR5LFxuXHRcdFx0dHlwZTogQXBwU3RvcmUuZ2V0VHlwZU9mUGFnZSgpLFxuXHRcdFx0aGFzaDogaGFzaCxcblx0XHRcdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlOiB0aGlzLmRpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZSxcblx0XHRcdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZTogdGhpcy5kaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlLFxuXHRcdFx0ZGF0YTogQXBwU3RvcmUucGFnZUNvbnRlbnQoKVxuXHRcdH1cblx0XHR2YXIgcGFnZSA9IG5ldyB0ZW1wbGF0ZS50eXBlKHByb3BzKVxuXHRcdHBhZ2UuaWQgPSBBcHBTdG9yZS5nZXRQYWdlSWQoKVxuXHRcdHBhZ2UucmVuZGVyKGlkLCBlbCwgdGVtcGxhdGUucGFydGlhbCwgcHJvcHMuZGF0YSlcblx0XHR0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXSA9IHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddXG5cdFx0dGhpcy5jb21wb25lbnRzWyduZXctY29tcG9uZW50J10gPSBwYWdlXG5cdFx0aWYoUGFnZXJTdG9yZS5wYWdlVHJhbnNpdGlvblN0YXRlID09PSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1MpIHtcblx0XHRcdHRoaXMuY29tcG9uZW50c1snb2xkLWNvbXBvbmVudCddLmZvcmNlVW5tb3VudCgpXG5cdFx0fVxuXHR9XG5cdG9uUGFnZVJlYWR5KGhhc2gpIHtcblx0XHRQYWdlckFjdGlvbnMub25QYWdlUmVhZHkoaGFzaClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dW5tb3VudENvbXBvbmVudChyZWYpIHtcblx0XHRpZih0aGlzLmNvbXBvbmVudHNbcmVmXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbcmVmXS5yZW1vdmUoKVxuXHRcdH1cblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRQYWdlclN0b3JlLm9mZihQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU4sIHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uSW4pXG5cdFx0UGFnZXJTdG9yZS5vZmYoUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVCwgdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQpXG5cdFx0dGhpcy51bm1vdW50Q29tcG9uZW50KCdvbGQtY29tcG9uZW50Jylcblx0XHR0aGlzLnVubW91bnRDb21wb25lbnQoJ25ldy1jb21wb25lbnQnKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBCYXNlUGFnZXJcblxuIiwibW9kdWxlLmV4cG9ydHM9e1xuXHRcImluZm9zXCI6IHtcblx0XHRcInR3aXR0ZXJfdXJsXCI6IFwiaHR0cDovL3R3aXR0ZXIuY29tXCIsXG5cdFx0XCJmYWNlYm9va191cmxcIjogXCJodHRwOi8vZmFjZWJvb2suY29tXCIsXG5cdFx0XCJpbnN0YWdyYW1fdXJsXCI6IFwiaHR0cDovL2luc3RhZ3JhbS5jb21cIlxuXHR9LFxuXG5cdFwibWVudVwiOiBbXG5cdFx0e1xuXHRcdFx0XCJpZFwiOiBcImxhbmRpbmdcIixcblx0XHRcdFwibmFtZVwiOiBcIkxhbmRpbmdcIixcblx0XHRcdFwidXJsXCI6IFwiL2xhbmRpbmdcIlxuXHRcdH1cblx0XSxcblxuXHRcInBsYW5ldHNcIjogW1wic2tpXCIsIFwibWV0YWxcIiwgXCJhbGFza2FcIiwgXCJ3b29kXCIsIFwiZ2Vtc3RvbmVcIl0sXG5cdFwiZWxlbWVudHNcIjogW1wiZmlyZVwiLCBcImVhcnRoXCIsIFwibWV0YWxcIiwgXCJ3YXRlclwiLCBcIndvb2RcIl0sXG5cdFwiZ2VuZGVyXCI6IFtcIm1hbGVcIiwgXCJmZW1hbGVcIiwgXCJhbmltYWxcIl0sXG5cblx0XCJwcm9kdWN0cy1kYXRhXCI6IHtcblx0XHRcInNraVwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NzViN2ZjXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjowLjQsIFwieVwiOjAuOH1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YzNmYjYzXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjMWZiYWRcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjEsIFwieVwiOi0wLjd9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwibWV0YWxcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDc1YjdmY1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC40LCBcInlcIjowLjh9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMzZmI2M1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YzFmYmFkXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjotMC4xLCBcInlcIjotMC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XSxcblx0XHRcImFsYXNrYVwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NzViN2ZjXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4yLCBcInlcIjowLjN9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjotMC40LCBcInlcIjowLjh9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMzZmI2M1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YzFmYmFkXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC4zfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjEsIFwieVwiOi0wLjd9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwid29vZFwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NzViN2ZjXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjowLjQsIFwieVwiOjAuOH1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YzNmYjYzXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjMWZiYWRcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjEsIFwieVwiOi0wLjd9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwiZ2Vtc3RvbmVcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDc1YjdmY1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMiwgXCJ5XCI6MC4zfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC44fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjM2ZiNjNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMxZmJhZFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuM30sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC4xLCBcInlcIjotMC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXG5cdFwibGFuZ1wiOiB7XG5cdFx0XCJlblwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibGFuZGluZyBwYWdlXCJcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcInNraSBwYWdlXCJcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibWV0YWwgcGFnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJhbGFza2EgcGFnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwid29vZCBwYWdlXCJcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiZ2Vtc3RvbmUgcGFnZVwiXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImZyXCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgZnJcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgZnJcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJsYW5kaW5nIHBhZ2UgZnJcIlxuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwic2tpIHBhZ2UgZnJcIlxuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJtZXRhbCBwYWdlIGZyXCJcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImFsYXNrYSBwYWdlIGZyXCJcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJ3b29kIHBhZ2UgZnJcIlxuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJnZW1zdG9uZSBwYWdlIGZyXCJcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiZXNcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBlc1wiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBlc1wiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImxhbmRpbmcgcGFnZSBlc1wiXG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJza2kgcGFnZSBlc1wiXG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIm1ldGFsIHBhZ2UgZXNcIlxuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiYWxhc2thIHBhZ2UgZXNcIlxuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIndvb2QgcGFnZSBlc1wiXG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImdlbXN0b25lIHBhZ2UgZXNcIlxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJpdFwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGl0XCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGl0XCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibGFuZGluZyBwYWdlIGl0XCJcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcInNraSBwYWdlIGl0XCJcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibWV0YWwgcGFnZSBpdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJhbGFza2EgcGFnZSBpdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwid29vZCBwYWdlIGl0XCJcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiZ2Vtc3RvbmUgcGFnZSBpdFwiXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImdlXCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgZ2VcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgZ2VcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJsYW5kaW5nIHBhZ2UgZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwic2tpIHBhZ2UgZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJtZXRhbCBwYWdlIGdlXCJcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImFsYXNrYSBwYWdlIGdlXCJcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJ3b29kIHBhZ2UgZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJnZW1zdG9uZSBwYWdlIGdlXCJcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwicHRcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBwdFwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBwdFwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImxhbmRpbmcgcGFnZSBwdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJza2kgcGFnZSBwdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIm1ldGFsIHBhZ2UgcHRcIlxuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiYWxhc2thIHBhZ2UgcHRcIlxuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIndvb2QgcGFnZSBwdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImdlbXN0b25lIHBhZ2UgcHRcIlxuXHRcdFx0fVxuXHRcdH0sXG5cdH0sXG5cblx0XCJkZWZhdWx0LXJvdXRlXCI6IFwiL2xhbmRpbmdcIixcblxuXHRcInJvdXRpbmdcIjoge1xuXHRcdFwiL2xhbmRpbmdcIjoge1xuXHRcdFx0XCJpZFwiOiBcImxhbmRpbmdcIlxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L3NraVwiOiB7XG5cdFx0XHRcImlkXCI6IFwic2tpXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XSxcblx0XHRcdFwiY2FtcGFpZ24tYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L21ldGFsXCI6IHtcblx0XHRcdFwiaWRcIjogXCJtZXRhbFwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF1cblx0XHR9LFxuXHRcdFwiL3BsYW5ldC9hbGFza2FcIjoge1xuXHRcdFx0XCJpZFwiOiBcImFsYXNrYVwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF1cblx0XHR9LFxuXHRcdFwiL3BsYW5ldC93b29kXCI6IHtcblx0XHRcdFwiaWRcIjogXCJ3b29kXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XSxcblx0XHRcdFwiY2FtcGFpZ24tYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L2dlbXN0b25lXCI6IHtcblx0XHRcdFwiaWRcIjogXCJnZW1zdG9uZVwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF1cblx0XHR9XG5cdH1cbn0iXX0=
