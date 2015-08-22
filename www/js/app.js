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

if (!window.console) console = { log: function log() {} };

window.jQuery = window.$ = _jquery2['default'];

// Start App
var app = new _App2['default']();
app.init();

},{"./app/App":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/App.js","./app/utils/raf":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/raf.js","gsap":"gsap","jquery":"jquery","pixi.js":"pixi.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/App.js":[function(require,module,exports){
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
			// TweenMax.to(knotsEl, 1, { scale:2, transformOrigin:'50% 50%' })

			this.lineSize = _AppStore2['default'].getLineWidth();
			var radius = 3;
			var margin = 30;

			for (var i = 0; i < knotsEl.length; i++) {
				var knot = $(knotsEl[i]);
				knot.attr('r', radius);
			};
			for (var i = 0; i < linesEl.length; i++) {
				var line = $(linesEl[i]);
				line.css('stroke-width', this.lineSize);
			};

			var startX = 4;
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

			this.tlOver.to(knotsEl[0], 1, { x: -6, force3D: true, ease: Elastic.easeInOut }, 0);
			this.tlOver.to(knotsEl[1], 1, { x: -6, force3D: true, ease: Elastic.easeInOut }, 0);
			this.tlOver.to(knotsEl[2], 1, { x: -6, force3D: true, ease: Elastic.easeInOut }, 0);
			// this.tlOver.to(knotsEl[3], 1, { x:6, force3D:true, ease:Elastic.easeInOut }, 0)
			// this.tlOver.to(knotsEl[4], 1, { x:6, force3D:true, ease:Elastic.easeInOut }, 0)

			// this.tlOver.to(linesEl[0], 1, { scaleX:1.1, force3D:true, transformOrigin:'0% 100%', ease:Elastic.easeInOut }, 0)

			switch (this.direction) {
				case _AppConstants2['default'].LEFT:
					// this.container.rotation = Utils.DegreesToRadians(180)
					break;
				case _AppConstants2['default'].RIGHT:
					break;
				case _AppConstants2['default'].TOP:
					// this.container.rotation = Utils.DegreesToRadians(-90)
					break;
				case _AppConstants2['default'].BOTTOM:
					// this.container.rotation = Utils.DegreesToRadians(90)
					break;
			}

			this.tlOver.pause(0);

			this.rollover = this.rollover.bind(this);
			this.element.on('mouseenter', this.rollover);
			console.log(this.element);

			this.width = margin * 3;
			this.height = margin * 2;
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			this.container.x = x;
			this.container.y = y;
		}
	}, {
		key: 'rollout',
		value: function rollout() {
			// this.updateStrings('fromX', 'fromY')
		}
	}, {
		key: 'rollover',
		value: function rollover() {
			console.log('over');
			this.tlOver.play(0);
			// this.updateStrings('toX', 'toY')
		}
	}, {
		key: 'updateStrings',
		value: function updateStrings(dirX, dirY) {
			var spring = this.config.spring;
			var friction = this.config.friction;
			var springLength = this.config.springLength;
			var knotsLine = this.knotsLine;
			var knotsTriangle = this.knotsTriangle;
			for (var i = 0; i < knotsLine.length; i++) {
				var knot = knotsLine[i];
				_Utils2['default'].SpringTo(knot, knot[dirX], knot[dirY], i, spring, friction, springLength);
				knot.position(knot.x + knot.vx, knot.y + knot.vy);
			}
			for (i = 0; i < knotsTriangle.length; i++) {
				var knot = knotsTriangle[i];
				_Utils2['default'].SpringTo(knot, knot[dirX], knot[dirY], i, spring, friction, springLength);
				knot.position(knot.x + knot.vx, knot.y + knot.vy);
			}
			this.drawLines(this.g);
		}
	}, {
		key: 'drawLines',
		value: function drawLines(g) {
			g.clear();
			g.lineStyle(this.lineSize, 0xffffff);

			g.moveTo(this.knotsLine[0].x, this.knotsLine[0].y);
			g.lineTo(this.knotsLine[1].x, this.knotsLine[1].y);
			g.lineTo(this.knotsLine[2].x, this.knotsLine[2].y);

			g.moveTo(this.knotsTriangle[0].x, this.knotsTriangle[0].y);
			g.lineTo(this.knotsLine[2].x, this.knotsLine[2].y);

			g.moveTo(this.knotsTriangle[1].x, this.knotsTriangle[1].y);
			g.lineTo(this.knotsLine[2].x, this.knotsLine[2].y);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_AppStore2['default'].releaseTimeline(this.tlOver);
			_AppStore2['default'].releaseTimeline(this.tlOut);
		}
	}]);

	return ArrowBtn;
})();

exports['default'] = ArrowBtn;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js":[function(require,module,exports){
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
			var springGardenIsInteractive = this.type == _AppConstants2['default'].EXPERIENCE ? true : false;
			for (var i = 0; i < data.length; i++) {
				var springGarden = _AppStore2['default'].getSpringGarden();
				var product = data[i];
				springGarden.id = this.id;
				springGarden.radius = this.radius;
				springGarden.knotRadius = this.knotRadius;
				springGarden.componentDidMount(product, springGardenWithFill, springGardenIsInteractive);
				this.container.addChild(springGarden.container);
				this.springGardens[i] = springGarden;
			}
		}
	}, {
		key: 'removePreviousSpringGardens',
		value: function removePreviousSpringGardens() {
			for (var i = 0; i < this.springGardens.length; i++) {
				var springGarden = this.springGardens[i];
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
		key: 'resize',
		value: function resize() {
			this.getRadius();
			this.rings.resize(this.radius);

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
			this.genderContainer = _AppStore2['default'].getContainer();
			this.container.addChild(this.ringsContainer);
			this.container.addChild(this.titlesContainer);
			this.container.addChild(this.genderContainer);

			this.circles = [];
			var ciclesLen = 6;
			for (var i = 0; i < ciclesLen; i++) {
				var g = new PIXI.Graphics();
				this.circles[i] = g;
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
			var offset = this.radius / 270 * 44;
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
		key: 'drawGenders',
		value: function drawGenders(r, color) {
			var genders = this.genders;
			var offset = this.radius / 270 * 34;
			var scale = this.radius / 270 * 1;
			var r = r + offset;
			for (var i = 0; i < genders.length; i++) {
				var gender = genders[i];
				var angle = _Utils2['default'].DegreesToRadians(gender.degBegin);
				gender.txt.rotation = angle + _Utils2['default'].DegreesToRadians(90);
				gender.txt.x = r * Math.cos(angle);
				gender.txt.y = r * Math.sin(angle);
				gender.txt.scale.x = scale;
				gender.txt.scale.y = scale;
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
			this.genderContainer.removeChildren();
			_AppStore2['default'].releaseContainer(this.ringsContainer);
			_AppStore2['default'].releaseContainer(this.titlesContainer);
			_AppStore2['default'].releaseContainer(this.genderContainer);
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
	}

	_createClass(CompassesContainer, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.container = _AppStore2['default'].getContainer();
			this.pxContainer.addChild(this.container);

			this.compasses = [];

			var mainCompass = new _Compass2['default'](this.container, _AppConstants2['default'].EXPERIENCE);
			mainCompass.knotRadius = _AppConstants2['default'].SMALL_KNOT_RADIUS;
			mainCompass.componentDidMount();

			var planets = _AppStore2['default'].planets();
			for (var i = 0; i < planets.length; i++) {
				var planet = planets[i];
				if (planet == this.id) {
					this.compasses[i] = mainCompass;
					this.compasses[i].id = planet;
					this.compasses[i].state = _AppConstants2['default'].OPEN;
					this.openedCompassIndex = i;
				} else {
					var smallCompass = new _SmallCompass2['default'](this.container, _AppConstants2['default'].EXPERIENCE);
					var planetData = _AppStore2['default'].productsDataById(planet);
					smallCompass.state = _AppConstants2['default'].CLOSE;
					smallCompass.id = planet;
					smallCompass.componentDidMount(planetData, planet, this.parentEl);
					this.compasses[i] = smallCompass;
				}
			}
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			var planetData = _AppStore2['default'].productsDataById(this.id);
			this.compasses[this.openedCompassIndex].updateData(planetData);

			for (var i = 0; i < this.compasses.length; i++) {
				this.compasses[i].didTransitionInComplete();
			};
		}
	}, {
		key: 'willTransitionOut',
		value: function willTransitionOut() {
			for (var i = 0; i < this.compasses.length; i++) {
				this.compasses[i].willTransitionOut();
			};
		}
	}, {
		key: 'update',
		value: function update() {
			for (var i = 0; i < this.compasses.length; i++) {
				this.compasses[i].update();
			};
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
			}

			for (i = 0; i < compasses.length; i++) {
				var compass = compasses[i];
				compass.positionElement(compass.posX + (windowW >> 1) - (totalW >> 1), windowH - biggestRadius - windowH * 0.1);
			}

			this.container.position.x = (windowW >> 1) - (totalW >> 1);
			this.container.position.y = windowH - biggestRadius - windowH * 0.1;
		}
	}, {
		key: 'getCompassMargin',
		value: function getCompassMargin(compass) {
			return compass.state == _AppConstants2['default'].OPEN ? 160 : 100;
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			for (var i = 0; i < this.compasses.length; i++) {
				this.compasses[i].componentWillUnmount();
			}
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

			var countries = _AppStore2['default'].countries();
			var lang = _AppStore2['default'].lang();
			var currentLang;
			var restCountries = [];
			var fullnameCountries = scope.infos.countries;
			for (var i = 0; i < countries.length; i++) {
				var country = countries[i];
				if (country.lang == lang) {
					currentLang = fullnameCountries[country.id];
				} else {
					country.name = fullnameCountries[country.id];
					restCountries.push(country);
				}
			}
			scope.countries = restCountries;
			scope.current_lang = currentLang;

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
			this.$legal = this.child.find('.legal');
			this.$camperLab = this.child.find('.camper-lab');
			this.$shop = this.child.find('.shop-wrapper');
			this.$lang = this.child.find(".lang-wrapper");
			this.$langCurrentTitle = this.$lang.find(".current-lang");
			this.$countries = this.$lang.find(".countries-wrapper");
			this.countriesH = 0;

			this.onLangMouseEnter = this.onLangMouseEnter.bind(this);
			this.onLangMouseLeave = this.onLangMouseLeave.bind(this);
			this.$lang.on('mouseenter', this.onLangMouseEnter);
			this.$lang.on('mouseleave', this.onLangMouseLeave);

			this.resize();
			this.$lang.css('height', this.countriesTitleH);
		}
	}, {
		key: 'onLangMouseEnter',
		value: function onLangMouseEnter(e) {
			e.preventDefault();
			this.$lang.addClass('hovered');
			this.$lang.css('height', this.countriesH + this.countriesTitleH);
		}
	}, {
		key: 'onLangMouseLeave',
		value: function onLangMouseLeave(e) {
			e.preventDefault();
			this.$lang.removeClass('hovered');
			this.$lang.css('height', this.countriesTitleH);
		}
	}, {
		key: 'resize',
		value: function resize() {
			if (!this.domIsReady) return;
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.countriesH = this.$countries.height() + 20;
			this.countriesTitleH = this.$langCurrentTitle.height();

			var socialCss = {
				left: windowW - _AppConstants2['default'].PADDING_AROUND - this.$socialWrapper.width(),
				top: windowH - _AppConstants2['default'].PADDING_AROUND - this.$socialWrapper.height()
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
				left: camperLabCss.left - this.$shop.width() - (_AppConstants2['default'].PADDING_AROUND << 1),
				top: _AppConstants2['default'].PADDING_AROUND - 2
			};
			var langCss = {
				left: shopCss.left - this.$langCurrentTitle.width() - (_AppConstants2['default'].PADDING_AROUND << 1),
				top: _AppConstants2['default'].PADDING_AROUND
			};

			this.$socialWrapper.css(socialCss);
			this.$legal.css(legalCss);
			this.$camperLab.css(camperLabCss);
			this.$shop.css(shopCss);
			this.$lang.css(langCss);
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

		this.radius = r || 8;
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
			this.radius = radius || 8;
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
			this.slideshowContainer = new PIXI.Container();
			// this.slideshowContainer = AppStore.getContainer()
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
		key: 'positionTitlesContainer',
		value: function positionTitlesContainer() {
			var _this = this;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			clearTimeout(this.titleTimeout);
			this.titleTimeout = setTimeout(function () {
				var topOffset = (windowH >> 1) + windowH * _AppConstants2['default'].COMPASS_SIZE_PERCENTAGE - (_this.titleContainer.parent.height() >> 1);
				var titlesContainerCss = {
					top: topOffset + (windowH - topOffset >> 1),
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

			// TODO clear that and put it back to pool
			// 	delete this.slideshowContainer.scaleXY
			// 	delete this.slideshowContainer.baseY
			// 	this.slideshowContainer.scale.x = 1
			// 	this.slideshowContainer.scale.y = 1
			this.slideshowContainer.removeChildren();
			// AppStore.releaseContainer(this.slideshowContainer)

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

var _BasePlanetPage2 = require('./BasePlanetPage');

var _BasePlanetPage3 = _interopRequireDefault(_BasePlanetPage2);

var _AppActions = require('./../actions/AppActions');

var _AppActions2 = _interopRequireDefault(_AppActions);

var _AppStore = require('./../stores/AppStore');

var _AppStore2 = _interopRequireDefault(_AppStore);

var _Router = require('./../services/Router');

var _Router2 = _interopRequireDefault(_Router);

// import Compass from 'Compass'

var _AppConstants = require('./../constants/AppConstants');

var _AppConstants2 = _interopRequireDefault(_AppConstants);

var _Utils = require('./../utils/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _ArrowBtn = require('./ArrowBtn');

var _ArrowBtn2 = _interopRequireDefault(_ArrowBtn);

var PlanetCampaignPage = (function (_BasePlanetPage) {
	_inherits(PlanetCampaignPage, _BasePlanetPage);

	function PlanetCampaignPage(props) {
		_classCallCheck(this, PlanetCampaignPage);

		props.data['empty-image'] = _AppStore2['default'].getEmptyImgUrl();
		_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'constructor', this).call(this, props);
		this.productId = undefined;
		this.fromInternalChange = false;
		this.currentIndex = 0;
		this.direction = _AppConstants2['default'].LEFT;
		this.currentProductContainerClass = 'product-container-b';
	}

	_createClass(PlanetCampaignPage, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.animations = {
				oldContainerAnimation: undefined,
				newContainerAnimation: undefined
			};

			var productContainersWrapper = this.child.find('.product-containers-wrapper');
			var containerA = productContainersWrapper.find('.product-container-a');
			var containerB = productContainersWrapper.find('.product-container-b');
			this.containers = {
				'product-container-a': {
					el: containerA,
					posterWrapper: containerA.find('.poster-wrapper'),
					posterImg: containerA.find('img'),
					videoWrapper: containerA.find('.video-wrapper')
				},
				'product-container-b': {
					el: containerB,
					posterWrapper: containerB.find('.poster-wrapper'),
					posterImg: containerB.find('img'),
					videoWrapper: containerB.find('.video-wrapper')
				}
			};

			this.previousBtn = new _ArrowBtn2['default'](this.child.find('.previous-btn'), _AppConstants2['default'].LEFT);
			this.previousBtn.componentDidMount();

			// this.compass = new Compass(this.pxContainer, AppConstants.CAMPAIGN)
			// this.compass.knotRadius = AppConstants.SMALL_KNOT_RADIUS
			// this.compass.componentDidMount()

			this.products = _AppStore2['default'].productsDataById(this.id);

			this.checkCurrentProductByUrl();
			$(document).on('keydown', this.onKeyPressed);

			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'onKeyPressed',
		value: function onKeyPressed(e) {
			if (this.animationRunning) return;
			e.preventDefault();
			switch (e.which) {
				case 37:
					// left
					this.previous();
					this.updateHasher();
					break;
				case 39:
					// right
					this.next();
					this.updateHasher();
					break;
				default:
					return;
			}
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
			this.currentIndex = this.currentIndex > this.products.length - 1 ? 0 : this.currentIndex;
		}
	}, {
		key: 'previous',
		value: function previous() {
			this.direction = _AppConstants2['default'].RIGHT;
			this.currentIndex -= 1;
			this.currentIndex = this.currentIndex < 0 ? this.products.length - 1 : this.currentIndex;
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
			this.fromInternalChange = true;
			this.checkCurrentProductByUrl();
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
		key: 'showProductById',
		value: function showProductById(id) {
			this.animationRunning = true;
			this.productId = id;
			this.currentProductContainerClass = this.currentProductContainerClass === 'product-container-a' ? 'product-container-b' : 'product-container-a';
			this.previousContainer = this.currentContainer;
			this.currentContainer = this.containers[this.currentProductContainerClass];

			this.assignAssetsToNewContainer();
			this.resizeMediaWrappers();
			this.animateContainers();
		}
	}, {
		key: 'assignAssetsToNewContainer',
		value: function assignAssetsToNewContainer() {
			var productScope = _AppStore2['default'].getSpecificProductById(this.id, this.productId);
			var imgSrc = _AppStore2['default'].getEnvironment()['static'] + '/image/planets/' + this.id + '/' + productScope['visual-id'] + '-XL' + '.jpg';
			this.currentContainer.posterImg.attr('src', imgSrc);
		}
	}, {
		key: 'assignVideoToNewContainer',
		value: function assignVideoToNewContainer() {
			var videoId = 136080598;
			var videoW = '100%';
			var videoH = '100%';
			var iframeStr = '<iframe src="https://player.vimeo.com/video/' + videoId + '?title=0&byline=0&portrait=0" width="' + videoW + '" height="' + videoH + '" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
			this.currentContainer.videoWrapper.html(iframeStr);
		}
	}, {
		key: 'animateContainers',
		value: function animateContainers() {
			var _this = this;

			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			var dir = this.direction == _AppConstants2['default'].LEFT ? 1 : -1;
			if (this.previousContainer != undefined) TweenMax.fromTo(this.previousContainer.el, 1, { x: 0, opacity: 1 }, { x: -windowW * dir, opacity: 1, force3D: true, ease: Expo.easeInOut });
			TweenMax.fromTo(this.currentContainer.el, 1, { x: windowW * dir, opacity: 1 }, { x: 0, opacity: 1, force3D: true, ease: Expo.easeInOut });
			clearTimeout(this.videoAssignTimeout);
			setTimeout(function () {
				_this.animationRunning = false;
			}, 900);
			this.videoAssignTimeout = setTimeout(function () {
				_this.assignVideoToNewContainer();
			}, 1300);
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			// var planetData = AppStore.productsDataById(this.id)
			// this.compass.updateData(planetData)
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'didTransitionInComplete', this).call(this);
		}
	}, {
		key: 'didTransitionOutComplete',
		value: function didTransitionOutComplete() {
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'didTransitionOutComplete', this).call(this);
		}
	}, {
		key: 'update',
		value: function update() {
			// this.compass.update()
		}
	}, {
		key: 'resizeMediaWrappers',
		value: function resizeMediaWrappers() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			var imageResize = _Utils2['default'].ResizePositionProportionally(windowW * 0.6, windowH * 0.6, _AppConstants2['default'].CAMPAIGN_IMAGE_SIZE[0], _AppConstants2['default'].CAMPAIGN_IMAGE_SIZE[1]);
			var videoResize = _Utils2['default'].ResizePositionProportionally(windowW * 0.6, windowH * 0.6, _AppConstants2['default'].MEDIA_GLOBAL_W, _AppConstants2['default'].MEDIA_GLOBAL_H);
			var posterImgCss = {
				width: imageResize.width,
				height: imageResize.height,
				top: (windowH >> 1) - (imageResize.height >> 1),
				left: (windowW >> 1) - (imageResize.width >> 1)
			};
			var videoCss = {
				width: videoResize.width,
				height: videoResize.height,
				top: windowH + (windowH >> 1) - (videoResize.height >> 1),
				left: (windowW >> 1) - (videoResize.width >> 1)
			};

			if (this.previousContainer != undefined) this.previousContainer.el.css('z-index', 1);
			this.currentContainer.el.css('z-index', 2);
			this.currentContainer.posterWrapper.css(posterImgCss);
			this.currentContainer.videoWrapper.css(videoCss);
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			// this.compass.resize()
			// this.compass.position(
			// 	windowW >> 1, windowH * 0.16
			// )

			this.resizeMediaWrappers();

			var childCss = {
				width: windowW,
				height: windowH
			};
			this.child.css(childCss);

			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			$(document).off('keydown', this.onKeyPressed);
			// this.compass.componentWillUnmount()
		}
	}]);

	return PlanetCampaignPage;
})(_BasePlanetPage3['default']);

exports['default'] = PlanetCampaignPage;
module.exports = exports['default'];

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./ArrowBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ArrowBtn.js","./BasePlanetPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlanetExperiencePage.js":[function(require,module,exports){
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
			// var bunnyUrl = this.getImageUrlById('bunny')
			// var texture = PIXI.Texture.fromImage(bunnyUrl)
			// var bunny = new PIXI.Sprite(texture)

			this.g = new PIXI.Graphics();
			this.pxContainer.addChild(this.g);
			// this.pxContainer.addChild(bunny)

			this.compassesContainer = new _CompassesContainer2['default'](this.pxContainer, this.child);
			this.compassesContainer.id = this.id;
			this.compassesContainer.componentDidMount();

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
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.experience.resize();
			this.compassesContainer.resize();

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
			this.compassesContainer.componentWillUnmount();
			_get(Object.getPrototypeOf(PlanetExperiencePage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return PlanetExperiencePage;
})(_BasePlanetPage3['default']);

exports['default'] = PlanetExperiencePage;
module.exports = exports['default'];

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./BasePlanetPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js","./CompassesContainer":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassesContainer.js","./experiences/AlaskaXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/AlaskaXP.js","./experiences/GemStoneXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/GemStoneXP.js","./experiences/MetalXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/MetalXP.js","./experiences/SkiXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/SkiXP.js","./experiences/WoodXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/WoodXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SmallCompass.js":[function(require,module,exports){
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
		value: function componentDidMount(data, name, parentEl) {
			this.parentEl = parentEl;
			this.container = _AppStore2['default'].getContainer();
			this.pxContainer.addChild(this.container);

			this.bgCircle = new PIXI.Graphics();
			this.container.addChild(this.bgCircle);

			var knotRadius = _AppConstants2['default'].SMALL_KNOT_RADIUS;
			this.radius = 30;
			this.radiusLimit = this.radius * 0.8 - (knotRadius >> 1);
			var gray = 0x575756;
			this.width = this.radius;
			this.height = this.radius;

			var compassName = name.toUpperCase();
			this.element = this.parentEl.find('.compasses-texts-wrapper');
			var containerEl = $('<div class="texts-container btn"></div>');
			this.element.append(containerEl);
			var titleTop = $('<div class="top-title"></div');
			var titleBottom = $('<div class="bottom-title"></div');

			this.circleRad = 90;
			var circlepath = 'M0,' + this.circleRad / 2 + 'a' + this.circleRad / 2 + ',' + this.circleRad / 2 + ' 0 1,0 ' + this.circleRad + ',0a' + this.circleRad / 2 + ',' + this.circleRad / 2 + ' 0 1,0 -' + this.circleRad + ',0';
			var svgStr = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <defs> <path id="path1" d="' + circlepath + '" > </path> </defs> <text fill="white" id="myText"> <textPath xlink:href="#path1"> <tspan dx="0px" dy="0px">' + compassName + '</tspan> </textPath> </text></svg>';
			var titleTopSvg = $(svgStr);
			var titleBottomSvg = $(svgStr);
			titleTop.append(titleTopSvg);
			titleBottom.append(titleBottomSvg);
			containerEl.append(titleTop);
			containerEl.append(titleBottom);
			titleTopSvg.css({
				width: this.circleRad,
				height: this.circleRad
			});
			titleBottomSvg.css({
				width: this.circleRad,
				height: this.circleRad
			});
			this.titles = {
				container: containerEl,
				titleTop: titleTop,
				titleBottom: titleBottom
			};

			this.onClicked = this.onClicked.bind(this);
			this.titles.container.on('click', this.onClicked);

			this.knots = [];
			for (var i = 0; i < data.length; i++) {
				var d = data[i];
				var knot = new _Knot2['default'](this.container, knotRadius, gray).componentDidMount();
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

			// draw a rectangle
			this.bgCircle.clear();
			this.bgCircle.beginFill(0xffffff);
			this.bgCircle.drawCircle(0, 0, this.radius);
			this.bgCircle.endFill();
		}
	}, {
		key: 'onClicked',
		value: function onClicked(e) {
			e.preventDefault();
			var url = "/planet/" + this.id;
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
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowH = _AppStore2['default'].Window.h;
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
		value: function componentDidMount(data, withFill, isInteractive) {
			this.params = data;
			this.withFill = withFill || false;
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
				this.areaPolygon.beginFill(this.params.color);
				this.areaPolygon.lineStyle(0);
				this.areaPolygon.moveTo(this.knots[0].x, this.knots[0].y);
			} else {
				this.areaPolygon.lineStyle(this.lineW, this.params.color, 0.8);
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

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/AlaskaXP.js":[function(require,module,exports){
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

		_get(Object.getPrototypeOf(Landing.prototype), 'constructor', this).call(this, props);
	}

	_createClass(Landing, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.landingSlideshow = new _LandingSlideshow2['default'](this.pxContainer, this.child);
			this.landingSlideshow.componentDidMount();

			this.compass = new _Compass2['default'](this.pxContainer);
			this.compass.componentDidMount();

			this.arrowLeft = new _ArrowBtn2['default'](this.pxContainer, _AppConstants2['default'].LEFT);
			this.arrowLeft.componentDidMount();

			this.arrowRight = new _ArrowBtn2['default'](this.pxContainer, _AppConstants2['default'].RIGHT);
			this.arrowRight.componentDidMount();

			this.onKeyPressed = this.onKeyPressed.bind(this);
			$(document).on('keydown', this.onKeyPressed);

			this.onStageClicked = this.onStageClicked.bind(this);
			this.parent.on('click', this.onStageClicked);

			_get(Object.getPrototypeOf(Landing.prototype), 'componentDidMount', this).call(this);
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
					var url = "/planet/" + this.landingSlideshow.currentId;
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
			this.landingSlideshow.update();
			this.compass.update();

			var windowW = _AppStore2['default'].Window.w;
			var mouseX = _AppStore2['default'].Mouse.x;
			if (mouseX < windowW * 0.25) {
				this.direction = _AppConstants2['default'].LEFT;
				this.arrowLeft.rollover();
			} else if (mouseX > windowW * 0.75) {
				this.direction = _AppConstants2['default'].RIGHT;
				this.arrowRight.rollover();
			} else {
				this.direction = _AppConstants2['default'].NONE;
				this.arrowLeft.rollout();
				this.arrowRight.rollout();
			}

			var area = windowW * 0.25;
			if (mouseX > (windowW >> 1) - area && mouseX < (windowW >> 1) + area) {
				this.direction = _AppConstants2['default'].TOP;
			}

			_get(Object.getPrototypeOf(Landing.prototype), 'update', this).call(this);
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.landingSlideshow.resize();
			this.compass.resize();

			this.compass.position(windowW >> 1, (windowH >> 1) - windowH * 0.05);

			this.arrowRight.position(windowW - (_AppConstants2['default'].PADDING_AROUND << 2), windowH >> 1);

			this.arrowLeft.position(_AppConstants2['default'].PADDING_AROUND << 2, windowH >> 1);

			_get(Object.getPrototypeOf(Landing.prototype), 'resize', this).call(this);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.landingSlideshow.componentWillUnmount();
			this.compass.componentWillUnmount();
			this.arrowLeft.componentWillUnmount();
			this.arrowRight.componentWillUnmount();
			$(document).off('keydown', this.onKeyPressed);
			this.parent.off('click', this.onStageClicked);
			_get(Object.getPrototypeOf(Landing.prototype), 'componentWillUnmount', this).call(this);
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

	COMPASS_SIZE_PERCENTAGE: 0.24,

	COMPASS_SMALL_SIZE_PERCENTAGE: 0.1,

	SMALL_KNOT_RADIUS: 3,

	OPEN: 'OPEN',
	CLOSE: 'CLOSE',

	LEFT: 'LEFT',
	RIGHT: 'RIGHT',
	TOP: 'TOP',
	BOTTOM: 'BOTTOM',

	TOTAL_KNOT_NUM: 3,

	PADDING_AROUND: 20,

	CAMPAIGN_IMAGE_SIZE: [1604, 1040],

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

  return "					<li class=\"country-"
    + alias3(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"index","hash":{},"data":data}) : helper)))
    + "\"><a href='#"
    + alias3(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"url","hash":{},"data":data}) : helper)))
    + "'>"
    + alias3(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"name","hash":{},"data":data}) : helper)))
    + "</a></li>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=this.lambda, alias2=this.escapeExpression, alias3=helpers.helperMissing, alias4="function";

  return "<div>\n	<header id=\"header\">\n		<a href=\"#!/landing\" class=\"logo\">\n			<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"136.013px\" viewBox=\"0 0 136.013 49.375\" enable-background=\"new 0 0 136.013 49.375\" xml:space=\"preserve\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M82.141,8.002h3.354c1.213,0,1.717,0.499,1.717,1.725v7.137c0,1.231-0.501,1.736-1.705,1.736h-3.365V8.002z M82.523,24.617v8.426l-7.087-0.384V1.925H87.39c3.292,0,5.96,2.705,5.96,6.044v10.604c0,3.338-2.668,6.044-5.96,6.044H82.523z M33.491,7.913c-1.132,0-2.048,1.065-2.048,2.379v11.256h4.409V10.292c0-1.314-0.917-2.379-2.047-2.379H33.491z M32.994,0.974h1.308c4.702,0,8.514,3.866,8.514,8.634v25.224l-6.963,1.273v-7.848h-4.409l0.012,8.787l-6.974,2.018V9.608C24.481,4.839,28.292,0.974,32.994,0.974 M121.933,7.921h3.423c1.215,0,1.718,0.497,1.718,1.724v8.194c0,1.232-0.502,1.736-1.705,1.736h-3.436V7.921z M133.718,31.055v17.487l-6.906-3.368V31.591c0-4.92-4.588-5.08-4.588-5.08v16.774l-6.983-2.914V1.925h12.231c3.291,0,5.959,2.705,5.959,6.044v11.077c0,2.207-1.217,4.153-2.991,5.115C131.761,24.894,133.718,27.077,133.718,31.055 M10.809,0.833c-4.703,0-8.514,3.866-8.514,8.634v27.936c0,4.769,4.019,8.634,8.722,8.634l1.306-0.085c5.655-1.063,8.306-4.639,8.306-9.407v-8.94h-6.996v8.736c0,1.409-0.064,2.65-1.994,2.992c-1.231,0.219-2.417-0.816-2.417-2.132V10.151c0-1.314,0.917-2.381,2.047-2.381h0.315c1.13,0,2.048,1.067,2.048,2.381v8.464h6.996V9.467c0-4.768-3.812-8.634-8.514-8.634H10.809 M103.953,23.162h6.977v-6.744h-6.977V8.423l7.676-0.002V1.924H96.72v33.278c0,0,5.225,1.141,7.532,1.666c1.517,0.346,7.752,2.253,7.752,2.253v-7.015l-8.051-1.508V23.162z M46.879,1.927l0.003,32.35l7.123-0.895V18.985l5.126,10.426l5.126-10.484l0.002,13.664l7.022-0.054V1.895h-7.545L59.13,14.6L54.661,1.927H46.879z\"/></svg>\n		</a>\n		<div class=\"camper-lab\"><a target=\"_blank\" href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.camper_lab_url : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.camper_lab : stack1), depth0))
    + "</a></div>\n		<div class=\"shop-wrapper\">\n			<div class=\"shop-title\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_title : stack1), depth0))
    + "</div>\n			<div class=\"gender-wrapper\">\n				<div class=\"men\"><a target=\"_blank\" href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_men_url : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_men : stack1), depth0))
    + "</a></div>\n				<div class=\"separator\"></div>\n				<div class=\"women\"><a target=\"_blank\" href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_women_url : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.shop_women : stack1), depth0))
    + "</a></div>\n			</div>\n		</div>\n		<div class=\"lang-wrapper btn\">\n			<div class=\"current-lang\">"
    + alias2(((helper = (helper = helpers.current_lang || (depth0 != null ? depth0.current_lang : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"current_lang","hash":{},"data":data}) : helper)))
    + "</div>\n			<ul class=\"countries-wrapper\">\n"
    + ((stack1 = helpers.each.call(depth0,(depth0 != null ? depth0.countries : depth0),{"name":"each","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "			</ul>\n		</div>\n	</header>\n	<footer id=\"footer\">\n		<div class=\"legal\"><a target=\"_blank\" href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.legal_url : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.infos : depth0)) != null ? stack1.legal : stack1), depth0))
    + "</a></div>\n		<ul id=\"social-wrapper\">\n			<li>\n				<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.facebookUrl || (depth0 != null ? depth0.facebookUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"facebookUrl","hash":{},"data":data}) : helper)))
    + "\">\n					<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.002,0.167c-8.746,0-15.835,7.09-15.835,15.834c0,8.746,7.089,15.835,15.835,15.835c8.745,0,15.834-7.089,15.834-15.835C31.836,7.257,24.747,0.167,16.002,0.167 M22.322,13.539c0.007,0.138,0.009,0.279,0.009,0.42c0,4.302-3.272,9.259-9.259,9.259c-1.837,0-3.547-0.539-4.987-1.461c0.253,0.031,0.514,0.044,0.776,0.044c1.525,0,2.928-0.52,4.042-1.394c-1.424-0.023-2.625-0.965-3.039-2.258c0.198,0.037,0.402,0.058,0.611,0.058c0.298,0,0.585-0.038,0.858-0.115c-1.489-0.297-2.612-1.612-2.612-3.189v-0.041c0.44,0.242,0.942,0.389,1.475,0.407c-0.873-0.585-1.447-1.581-1.447-2.709c0-0.597,0.16-1.155,0.441-1.638c1.605,1.97,4.003,3.264,6.708,3.4c-0.057-0.238-0.085-0.485-0.085-0.74c0-1.797,1.458-3.254,3.254-3.254c0.937,0,1.783,0.395,2.375,1.028c0.742-0.146,1.438-0.417,2.067-0.789c-0.242,0.759-0.759,1.396-1.432,1.799c0.658-0.079,1.286-0.253,1.869-0.511C23.511,12.507,22.959,13.079,22.322,13.539\"/></svg>\n				</a>\n			</li>\n			<li>\n				<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.twitterUrl || (depth0 != null ? depth0.twitterUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"twitterUrl","hash":{},"data":data}) : helper)))
    + "\">\n					<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" viewBox=\"0 0 32.003 32.003\" enable-background=\"new 0 0 32.003 32.003\" xml:space=\"preserve\"><path d=\"M16.001,0.167c-8.745,0-15.834,7.09-15.834,15.834c0,8.745,7.089,15.835,15.834,15.835c8.745,0,15.834-7.09,15.834-15.835C31.836,7.257,24.746,0.167,16.001,0.167 M19.498,13.32l-0.184,2.369h-2.427v8.229h-3.068v-8.229h-1.638V13.32h1.638v-1.592c0-0.701,0.017-1.782,0.527-2.453c0.536-0.709,1.273-1.191,2.541-1.191c2.066,0,2.935,0.295,2.935,0.295l-0.41,2.425c0,0-0.682-0.196-1.318-0.196c-0.637,0-1.207,0.227-1.207,0.863v1.85H19.498z\"/></svg>\n				</a>\n			</li>\n			<li>\n				<a target=\"_blank\" href=\""
    + alias2(((helper = (helper = helpers.instagramUrl || (depth0 != null ? depth0.instagramUrl : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(depth0,{"name":"instagramUrl","hash":{},"data":data}) : helper)))
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
    var helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "<div class='page-wrapper'>\n	<div class=\"interface\">\n		<div class=\"previous-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n	</div>\n\n	<div class=\"product-containers-wrapper\">\n		<div class=\"product-container product-container-a\">\n			<div class=\"poster-wrapper\">\n				<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n			</div>\n			<div class=\"video-wrapper\">\n			</div>\n		</div>\n		<div class=\"product-container product-container-b\">\n			<div class=\"poster-wrapper\">\n				<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n			</div>\n			<div class=\"video-wrapper\">\n			</div>\n		</div>\n	</div>\n</div>";
},"useData":true});

},{"hbsfy/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/PlanetExperiencePage.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class='page-wrapper'>\n	<div class=\"compasses-texts-wrapper\">\n	</div>\n</div>";
},"useData":true});

},{"hbsfy/runtime":"/Users/panagiotisthomoglou/Projects/camper/node_modules/hbsfy/runtime.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/partials/pages/Landing.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class='page-wrapper'>\n	<div class=\"slideshow-title\">\n		<div class=\"planet-title\">PLANET</div>\n		<div class=\"planet-name\">GEMSTONE</div>\n	</div>\n</div>";
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

		this.timelines = _objectpool2['default'].generate(TimelineMax, { count: 10 });
		this.pxContainers = _objectpool2['default'].generate(PIXI.Container, { count: pxContainerNum });
		this.graphics = _objectpool2['default'].generate(PIXI.Graphics, { count: graphicsNum });
		this.sprites = _objectpool2['default'].generate(PIXI.Sprite, { count: spritesNum });
		this.springGardens = _objectpool2['default'].generate(_SpringGarden2['default'], { count: springGardensNum });
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
			var container = this.pxContainers.get();
			container.scale.x = 1;
			container.scale.y = 1;
			container.position.x = 0;
			container.position.y = 0;
			container.skew.x = 0;
			container.skew.y = 0;
			container.pivot.x = 0;
			container.pivot.y = 0;
			container.rotation = 0;
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

		switch (types.oldType) {
			case _AppConstants2['default'].LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y: windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { x: windowW, ease: Expo.easeInOut }, { x: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { x: windowW, ease: Expo.easeInOut }, { x: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: -windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
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
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { x: 0, ease: Expo.easeInOut }, { x: -windowH, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { x: 0, ease: Expo.easeInOut }, { x: -windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: -windowH, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: -windowH, ease: Expo.easeInOut }, 0);
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

		switch (types.oldType) {
			case _AppConstants2['default'].LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y: windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y: windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
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

		switch (types.newType) {
			case _AppConstants2['default'].LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: 0, ease: Expo.easeInOut }, { y: windowH, ease: Expo.easeInOut }, 0);
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

		switch (types.oldType) {
			case _AppConstants2['default'].LANDING:
				break;
			case _AppConstants2['default'].EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: -windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
				timeline.fromTo(wrapper, 1, { y: -windowH, ease: Expo.easeInOut }, { y: 0, ease: Expo.easeInOut }, 0);
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

		switch (types.newType) {
			case _AppConstants2['default'].EXPERIENCE:
				timeline.to(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, 0);
				timeline.to(wrapper, 1, { y: -windowH, ease: Expo.easeInOut }, 0);
				break;
			case _AppConstants2['default'].CAMPAIGN:
				timeline.to(scope.pxContainer, 1, { y: -windowH, ease: Expo.easeInOut }, 0);
				timeline.to(wrapper, 1, { y: -windowH, ease: Expo.easeInOut }, 0);
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
        return AppStore.getEnvironment()['static'] + '/image/empty.png';
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
				"planet": "planet"
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
				"planet": "planet"
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
				"planet": "planet"
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
				"planet": "planet"
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
				"planet": "planet"
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
				"planet": "planet"
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

	"products-data": {
		"ski": [
			{
				"id": 0,
				"visual-id": "gemma-dog",
				"color": "0x75b7fc",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"visual-id": "gemma-hero",
				"color": "0xc3fb63",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			},{
				"id": 2,
				"visual-id": "inuit-boy",
				"color": "0xc1fbad",
				"knots": [
					{"x":0.3, "y":-0.1},
					{"x":0.6, "y":-0.4},
					{"x":0.6, "y":-0.6}
				]
			}
		],
		"metal": [
			{
				"id": 0,
				"visual-id": "gemma-dog",
				"color": "0x75b7fc",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"visual-id": "gemma-hero",
				"color": "0xc3fb63",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			},{
				"id": 2,
				"visual-id": "inuit-boy",
				"color": "0xc1fbad",
				"knots": [
					{"x":0.3, "y":-0.1},
					{"x":0.6, "y":-0.4},
					{"x":0.6, "y":-0.6}
				]
			}
		],
		"alaska": [
			{
				"id": 0,
				"visual-id": "gemma-dog",
				"color": "0x75b7fc",
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6}
				]
			},{
				"id": 1,
				"visual-id": "gemma-hero",
				"color": "0xc3fb63",
				"knots": [
					{"x":0.3, "y":-0.6},
					{"x":0.6, "y":0.4},
					{"x":0.4, "y":0.7}
				]
			},{
				"id": 2,
				"visual-id": "inuit-boy",
				"color": "0xc1fbad",
				"knots": [
					{"x":-0.3, "y":0.1},
					{"x":-0.6, "y":-0.1},
					{"x":-0.6, "y":-0.6}
				]
			},{
				"id": 3,
				"visual-id": "inuit-girl",
				"color": "0xc1fbad",
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
				"visual-id": "gemma-dog",
				"color": "0x75b7fc",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"visual-id": "gemma-hero",
				"color": "0xc3fb63",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			},{
				"id": 2,
				"visual-id": "inuit-boy",
				"color": "0xc1fbad",
				"knots": [
					{"x":0.3, "y":-0.1},
					{"x":0.6, "y":-0.4},
					{"x":0.6, "y":-0.6}
				]
			}
		],
		"gemstone": [
			{
				"id": 0,
				"visual-id": "gemma-dog",
				"color": "0x75b7fc",
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6}
				]
			},{
				"id": 1,
				"visual-id": "gemma-hero",
				"color": "0xc3fb63",
				"knots": [
					{"x":0.3, "y":-0.6},
					{"x":0.6, "y":0.4},
					{"x":0.4, "y":0.7}
				]
			},{
				"id": 2,
				"visual-id": "inuit-boy",
				"color": "0xc1fbad",
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmx1eC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L2xpYi9EaXNwYXRjaGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvbGliL2ludmFyaWFudC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvYmFzZVRvU3RyaW5nLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9NYWluLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwVGVtcGxhdGUuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9hY3Rpb25zL0FwcEFjdGlvbnMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Fycm93QnRuLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9CYXNlUGxhbmV0UGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzcy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzc1JpbmdzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Db21wYXNzZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Zyb250Q29udGFpbmVyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Lbm90LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9MYW5kaW5nU2xpZGVzaG93LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9QWENvbnRhaW5lci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1BsYW5ldENhbXBhaWduUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1NtYWxsQ29tcGFzcy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvU3ByaW5nR2FyZGVuLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9BbGFza2FYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvQmFzZVhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9HZW1TdG9uZVhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9NZXRhbFhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9Ta2lYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvV29vZFhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9wYWdlcy9MYW5kaW5nLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29uc3RhbnRzL0FwcENvbnN0YW50cy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2Rpc3BhdGNoZXJzL0FwcERpc3BhdGNoZXIuanMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL0Zyb250Q29udGFpbmVyLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGFnZXNDb250YWluZXIuaGJzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9QbGFuZXRDYW1wYWlnblBhZ2UuaGJzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9QbGFuZXRFeHBlcmllbmNlUGFnZS5oYnMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL3BhZ2VzL0xhbmRpbmcuaGJzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvc2VydmljZXMvR2xvYmFsRXZlbnRzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvc2VydmljZXMvUG9vbC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1ByZWxvYWRlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1JvdXRlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1RyYW5zaXRpb25BbmltYXRpb25zLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvc3RvcmVzL0FwcFN0b3JlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvQXV0b2JpbmQuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC91dGlscy9VdGlscy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3V0aWxzL1ZlYzIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC91dGlscy9yYWYuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL3BhZ2VyL1BhZ2VyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VDb21wb25lbnQuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL3BhZ2VyL2NvbXBvbmVudHMvQmFzZVBhZ2UuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL3BhZ2VyL2NvbXBvbmVudHMvQmFzZVBhZ2VyLmpzIiwid3d3L2RhdGEvZGF0YS5qc29uIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFD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QUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQyxRQUFJLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDM0IsdUJBQU0sUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFBO0FBQy9FLFFBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ2pEO0FBQ0QsT0FBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FDdEI7OztTQUNRLG1CQUFDLENBQUMsRUFBRTtBQUNaLElBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtBQUNULElBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTs7QUFFcEMsSUFBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2pELElBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNsRCxJQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7O0FBRWxELElB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QyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDakQsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQzdELFFBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTs7O0FBR25FLFFBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQzdDLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUEsR0FBSSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQSxJQUFLLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7QUFDM0gsU0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBOzs7QUFHekMsU0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDakMsU0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7OztBQUdqQyxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUMzRSxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTs7O0FBRzNFLFNBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNwQyxTQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDcEMsU0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLFNBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzs7O0FBR3BDLFFBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQzNFLFFBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBOztBQUUzRSxTQUFLLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLFNBQUss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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMuRGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vbGliL0Rpc3BhdGNoZXInKVxuIiwiLypcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBEaXNwYXRjaGVyXG4gKiBAdHlwZWNoZWNrc1xuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnLi9pbnZhcmlhbnQnKTtcblxudmFyIF9sYXN0SUQgPSAxO1xudmFyIF9wcmVmaXggPSAnSURfJztcblxuLyoqXG4gKiBEaXNwYXRjaGVyIGlzIHVzZWQgdG8gYnJvYWRjYXN0IHBheWxvYWRzIHRvIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLiBUaGlzIGlzXG4gKiBkaWZmZXJlbnQgZnJvbSBnZW5lcmljIHB1Yi1zdWIgc3lzdGVtcyBpbiB0d28gd2F5czpcbiAqXG4gKiAgIDEpIENhbGxiYWNrcyBhcmUgbm90IHN1YnNjcmliZWQgdG8gcGFydGljdWxhciBldmVudHMuIEV2ZXJ5IHBheWxvYWQgaXNcbiAqICAgICAgZGlzcGF0Y2hlZCB0byBldmVyeSByZWdpc3RlcmVkIGNhbGxiYWNrLlxuICogICAyKSBDYWxsYmFja3MgY2FuIGJlIGRlZmVycmVkIGluIHdob2xlIG9yIHBhcnQgdW50aWwgb3RoZXIgY2FsbGJhY2tzIGhhdmVcbiAqICAgICAgYmVlbiBleGVjdXRlZC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgY29uc2lkZXIgdGhpcyBoeXBvdGhldGljYWwgZmxpZ2h0IGRlc3RpbmF0aW9uIGZvcm0sIHdoaWNoXG4gKiBzZWxlY3RzIGEgZGVmYXVsdCBjaXR5IHdoZW4gYSBjb3VudHJ5IGlzIHNlbGVjdGVkOlxuICpcbiAqICAgdmFyIGZsaWdodERpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpO1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2Ygd2hpY2ggY291bnRyeSBpcyBzZWxlY3RlZFxuICogICB2YXIgQ291bnRyeVN0b3JlID0ge2NvdW50cnk6IG51bGx9O1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2Ygd2hpY2ggY2l0eSBpcyBzZWxlY3RlZFxuICogICB2YXIgQ2l0eVN0b3JlID0ge2NpdHk6IG51bGx9O1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2YgdGhlIGJhc2UgZmxpZ2h0IHByaWNlIG9mIHRoZSBzZWxlY3RlZCBjaXR5XG4gKiAgIHZhciBGbGlnaHRQcmljZVN0b3JlID0ge3ByaWNlOiBudWxsfVxuICpcbiAqIFdoZW4gYSB1c2VyIGNoYW5nZXMgdGhlIHNlbGVjdGVkIGNpdHksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NpdHktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENpdHk6ICdwYXJpcydcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGBDaXR5U3RvcmVgOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NpdHktdXBkYXRlJykge1xuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBwYXlsb2FkLnNlbGVjdGVkQ2l0eTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIHVzZXIgc2VsZWN0cyBhIGNvdW50cnksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NvdW50cnktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENvdW50cnk6ICdhdXN0cmFsaWEnXG4gKiAgIH0pO1xuICpcbiAqIFRoaXMgcGF5bG9hZCBpcyBkaWdlc3RlZCBieSBib3RoIHN0b3JlczpcbiAqXG4gKiAgICBDb3VudHJ5U3RvcmUuZGlzcGF0Y2hUb2tlbiA9IGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjb3VudHJ5LXVwZGF0ZScpIHtcbiAqICAgICAgIENvdW50cnlTdG9yZS5jb3VudHJ5ID0gcGF5bG9hZC5zZWxlY3RlZENvdW50cnk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBXaGVuIHRoZSBjYWxsYmFjayB0byB1cGRhdGUgYENvdW50cnlTdG9yZWAgaXMgcmVnaXN0ZXJlZCwgd2Ugc2F2ZSBhIHJlZmVyZW5jZVxuICogdG8gdGhlIHJldHVybmVkIHRva2VuLiBVc2luZyB0aGlzIHRva2VuIHdpdGggYHdhaXRGb3IoKWAsIHdlIGNhbiBndWFyYW50ZWVcbiAqIHRoYXQgYENvdW50cnlTdG9yZWAgaXMgdXBkYXRlZCBiZWZvcmUgdGhlIGNhbGxiYWNrIHRoYXQgdXBkYXRlcyBgQ2l0eVN0b3JlYFxuICogbmVlZHMgdG8gcXVlcnkgaXRzIGRhdGEuXG4gKlxuICogICBDaXR5U3RvcmUuZGlzcGF0Y2hUb2tlbiA9IGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjb3VudHJ5LXVwZGF0ZScpIHtcbiAqICAgICAgIC8vIGBDb3VudHJ5U3RvcmUuY291bnRyeWAgbWF5IG5vdCBiZSB1cGRhdGVkLlxuICogICAgICAgZmxpZ2h0RGlzcGF0Y2hlci53YWl0Rm9yKFtDb3VudHJ5U3RvcmUuZGlzcGF0Y2hUb2tlbl0pO1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBpcyBub3cgZ3VhcmFudGVlZCB0byBiZSB1cGRhdGVkLlxuICpcbiAqICAgICAgIC8vIFNlbGVjdCB0aGUgZGVmYXVsdCBjaXR5IGZvciB0aGUgbmV3IGNvdW50cnlcbiAqICAgICAgIENpdHlTdG9yZS5jaXR5ID0gZ2V0RGVmYXVsdENpdHlGb3JDb3VudHJ5KENvdW50cnlTdG9yZS5jb3VudHJ5KTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFRoZSB1c2FnZSBvZiBgd2FpdEZvcigpYCBjYW4gYmUgY2hhaW5lZCwgZm9yIGV4YW1wbGU6XG4gKlxuICogICBGbGlnaHRQcmljZVN0b3JlLmRpc3BhdGNoVG9rZW4gPVxuICogICAgIGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgICAgc3dpdGNoIChwYXlsb2FkLmFjdGlvblR5cGUpIHtcbiAqICAgICAgICAgY2FzZSAnY291bnRyeS11cGRhdGUnOlxuICogICAgICAgICAgIGZsaWdodERpc3BhdGNoZXIud2FpdEZvcihbQ2l0eVN0b3JlLmRpc3BhdGNoVG9rZW5dKTtcbiAqICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlLnByaWNlID1cbiAqICAgICAgICAgICAgIGdldEZsaWdodFByaWNlU3RvcmUoQ291bnRyeVN0b3JlLmNvdW50cnksIENpdHlTdG9yZS5jaXR5KTtcbiAqICAgICAgICAgICBicmVhaztcbiAqXG4gKiAgICAgICAgIGNhc2UgJ2NpdHktdXBkYXRlJzpcbiAqICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlLnByaWNlID1cbiAqICAgICAgICAgICAgIEZsaWdodFByaWNlU3RvcmUoQ291bnRyeVN0b3JlLmNvdW50cnksIENpdHlTdG9yZS5jaXR5KTtcbiAqICAgICAgICAgICBicmVhaztcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFRoZSBgY291bnRyeS11cGRhdGVgIHBheWxvYWQgd2lsbCBiZSBndWFyYW50ZWVkIHRvIGludm9rZSB0aGUgc3RvcmVzJ1xuICogcmVnaXN0ZXJlZCBjYWxsYmFja3MgaW4gb3JkZXI6IGBDb3VudHJ5U3RvcmVgLCBgQ2l0eVN0b3JlYCwgdGhlblxuICogYEZsaWdodFByaWNlU3RvcmVgLlxuICovXG5cbiAgZnVuY3Rpb24gRGlzcGF0Y2hlcigpIHtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcyA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWQgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggZXZlcnkgZGlzcGF0Y2hlZCBwYXlsb2FkLiBSZXR1cm5zXG4gICAqIGEgdG9rZW4gdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGB3YWl0Rm9yKClgLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5yZWdpc3Rlcj1mdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciBpZCA9IF9wcmVmaXggKyBfbGFzdElEKys7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdID0gY2FsbGJhY2s7XG4gICAgcmV0dXJuIGlkO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY2FsbGJhY2sgYmFzZWQgb24gaXRzIHRva2VuLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaWRcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLnVucmVnaXN0ZXI9ZnVuY3Rpb24oaWQpIHtcbiAgICBpbnZhcmlhbnQoXG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0sXG4gICAgICAnRGlzcGF0Y2hlci51bnJlZ2lzdGVyKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLFxuICAgICAgaWRcbiAgICApO1xuICAgIGRlbGV0ZSB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF07XG4gIH07XG5cbiAgLyoqXG4gICAqIFdhaXRzIGZvciB0aGUgY2FsbGJhY2tzIHNwZWNpZmllZCB0byBiZSBpbnZva2VkIGJlZm9yZSBjb250aW51aW5nIGV4ZWN1dGlvblxuICAgKiBvZiB0aGUgY3VycmVudCBjYWxsYmFjay4gVGhpcyBtZXRob2Qgc2hvdWxkIG9ubHkgYmUgdXNlZCBieSBhIGNhbGxiYWNrIGluXG4gICAqIHJlc3BvbnNlIHRvIGEgZGlzcGF0Y2hlZCBwYXlsb2FkLlxuICAgKlxuICAgKiBAcGFyYW0ge2FycmF5PHN0cmluZz59IGlkc1xuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUud2FpdEZvcj1mdW5jdGlvbihpZHMpIHtcbiAgICBpbnZhcmlhbnQoXG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcsXG4gICAgICAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IE11c3QgYmUgaW52b2tlZCB3aGlsZSBkaXNwYXRjaGluZy4nXG4gICAgKTtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgaWRzLmxlbmd0aDsgaWkrKykge1xuICAgICAgdmFyIGlkID0gaWRzW2lpXTtcbiAgICAgIGlmICh0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgaW52YXJpYW50KFxuICAgICAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkW2lkXSxcbiAgICAgICAgICAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IENpcmN1bGFyIGRlcGVuZGVuY3kgZGV0ZWN0ZWQgd2hpbGUgJyArXG4gICAgICAgICAgJ3dhaXRpbmcgZm9yIGAlc2AuJyxcbiAgICAgICAgICBpZFxuICAgICAgICApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGludmFyaWFudChcbiAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdLFxuICAgICAgICAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLFxuICAgICAgICBpZFxuICAgICAgKTtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2soaWQpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGlzcGF0Y2hlcyBhIHBheWxvYWQgdG8gYWxsIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcGF5bG9hZFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2g9ZnVuY3Rpb24ocGF5bG9hZCkge1xuICAgIGludmFyaWFudChcbiAgICAgICF0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcsXG4gICAgICAnRGlzcGF0Y2guZGlzcGF0Y2goLi4uKTogQ2Fubm90IGRpc3BhdGNoIGluIHRoZSBtaWRkbGUgb2YgYSBkaXNwYXRjaC4nXG4gICAgKTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3N0YXJ0RGlzcGF0Y2hpbmcocGF5bG9hZCk7XG4gICAgdHJ5IHtcbiAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzKSB7XG4gICAgICAgIGlmICh0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrKGlkKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9zdG9wRGlzcGF0Y2hpbmcoKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIElzIHRoaXMgRGlzcGF0Y2hlciBjdXJyZW50bHkgZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5pc0Rpc3BhdGNoaW5nPWZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmc7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGwgdGhlIGNhbGxiYWNrIHN0b3JlZCB3aXRoIHRoZSBnaXZlbiBpZC4gQWxzbyBkbyBzb21lIGludGVybmFsXG4gICAqIGJvb2trZWVwaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjaz1mdW5jdGlvbihpZCkge1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSA9IHRydWU7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdKHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQpO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkW2lkXSA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCB1cCBib29ra2VlcGluZyBuZWVkZWQgd2hlbiBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHBheWxvYWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS4kRGlzcGF0Y2hlcl9zdGFydERpc3BhdGNoaW5nPWZ1bmN0aW9uKHBheWxvYWQpIHtcbiAgICBmb3IgKHZhciBpZCBpbiB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcykge1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdID0gZmFsc2U7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0gPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IHBheWxvYWQ7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gdHJ1ZTtcbiAgfTtcblxuICAvKipcbiAgICogQ2xlYXIgYm9va2tlZXBpbmcgdXNlZCBmb3IgZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfc3RvcERpc3BhdGNoaW5nPWZ1bmN0aW9uKCkge1xuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBudWxsO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IGZhbHNlO1xuICB9O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gRGlzcGF0Y2hlcjtcbiIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIGludmFyaWFudFxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFVzZSBpbnZhcmlhbnQoKSB0byBhc3NlcnQgc3RhdGUgd2hpY2ggeW91ciBwcm9ncmFtIGFzc3VtZXMgdG8gYmUgdHJ1ZS5cbiAqXG4gKiBQcm92aWRlIHNwcmludGYtc3R5bGUgZm9ybWF0IChvbmx5ICVzIGlzIHN1cHBvcnRlZCkgYW5kIGFyZ3VtZW50c1xuICogdG8gcHJvdmlkZSBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IGJyb2tlIGFuZCB3aGF0IHlvdSB3ZXJlXG4gKiBleHBlY3RpbmcuXG4gKlxuICogVGhlIGludmFyaWFudCBtZXNzYWdlIHdpbGwgYmUgc3RyaXBwZWQgaW4gcHJvZHVjdGlvbiwgYnV0IHRoZSBpbnZhcmlhbnRcbiAqIHdpbGwgcmVtYWluIHRvIGVuc3VyZSBsb2dpYyBkb2VzIG5vdCBkaWZmZXIgaW4gcHJvZHVjdGlvbi5cbiAqL1xuXG52YXIgaW52YXJpYW50ID0gZnVuY3Rpb24oY29uZGl0aW9uLCBmb3JtYXQsIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgaWYgKGZhbHNlKSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFyaWFudCByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgJ01pbmlmaWVkIGV4Y2VwdGlvbiBvY2N1cnJlZDsgdXNlIHRoZSBub24tbWluaWZpZWQgZGV2IGVudmlyb25tZW50ICcgK1xuICAgICAgICAnZm9yIHRoZSBmdWxsIGVycm9yIG1lc3NhZ2UgYW5kIGFkZGl0aW9uYWwgaGVscGZ1bCB3YXJuaW5ncy4nXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgJ0ludmFyaWFudCBWaW9sYXRpb246ICcgK1xuICAgICAgICBmb3JtYXQucmVwbGFjZSgvJXMvZywgZnVuY3Rpb24oKSB7IHJldHVybiBhcmdzW2FyZ0luZGV4KytdOyB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBlcnJvci5mcmFtZXNUb1BvcCA9IDE7IC8vIHdlIGRvbid0IGNhcmUgYWJvdXQgaW52YXJpYW50J3Mgb3duIGZyYW1lXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfaW1wb3J0ID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL2Jhc2UnKTtcblxudmFyIGJhc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0KTtcblxuLy8gRWFjaCBvZiB0aGVzZSBhdWdtZW50IHRoZSBIYW5kbGViYXJzIG9iamVjdC4gTm8gbmVlZCB0byBzZXR1cCBoZXJlLlxuLy8gKFRoaXMgaXMgZG9uZSB0byBlYXNpbHkgc2hhcmUgY29kZSBiZXR3ZWVuIGNvbW1vbmpzIGFuZCBicm93c2UgZW52cylcblxudmFyIF9TYWZlU3RyaW5nID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL3NhZmUtc3RyaW5nJyk7XG5cbnZhciBfU2FmZVN0cmluZzIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfU2FmZVN0cmluZyk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIF9pbXBvcnQyID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL3V0aWxzJyk7XG5cbnZhciBVdGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQyKTtcblxudmFyIF9pbXBvcnQzID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL3J1bnRpbWUnKTtcblxudmFyIHJ1bnRpbWUgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0Myk7XG5cbnZhciBfbm9Db25mbGljdCA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9uby1jb25mbGljdCcpO1xuXG52YXIgX25vQ29uZmxpY3QyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX25vQ29uZmxpY3QpO1xuXG4vLyBGb3IgY29tcGF0aWJpbGl0eSBhbmQgdXNhZ2Ugb3V0c2lkZSBvZiBtb2R1bGUgc3lzdGVtcywgbWFrZSB0aGUgSGFuZGxlYmFycyBvYmplY3QgYSBuYW1lc3BhY2VcbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIGhiID0gbmV3IGJhc2UuSGFuZGxlYmFyc0Vudmlyb25tZW50KCk7XG5cbiAgVXRpbHMuZXh0ZW5kKGhiLCBiYXNlKTtcbiAgaGIuU2FmZVN0cmluZyA9IF9TYWZlU3RyaW5nMlsnZGVmYXVsdCddO1xuICBoYi5FeGNlcHRpb24gPSBfRXhjZXB0aW9uMlsnZGVmYXVsdCddO1xuICBoYi5VdGlscyA9IFV0aWxzO1xuICBoYi5lc2NhcGVFeHByZXNzaW9uID0gVXRpbHMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICBoYi5WTSA9IHJ1bnRpbWU7XG4gIGhiLnRlbXBsYXRlID0gZnVuY3Rpb24gKHNwZWMpIHtcbiAgICByZXR1cm4gcnVudGltZS50ZW1wbGF0ZShzcGVjLCBoYik7XG4gIH07XG5cbiAgcmV0dXJuIGhiO1xufVxuXG52YXIgaW5zdCA9IGNyZWF0ZSgpO1xuaW5zdC5jcmVhdGUgPSBjcmVhdGU7XG5cbl9ub0NvbmZsaWN0MlsnZGVmYXVsdCddKGluc3QpO1xuXG5pbnN0WydkZWZhdWx0J10gPSBpbnN0O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBpbnN0O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLkhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IEhhbmRsZWJhcnNFbnZpcm9ubWVudDtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBVdGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgVkVSU0lPTiA9ICczLjAuMSc7XG5leHBvcnRzLlZFUlNJT04gPSBWRVJTSU9OO1xudmFyIENPTVBJTEVSX1JFVklTSU9OID0gNjtcblxuZXhwb3J0cy5DT01QSUxFUl9SRVZJU0lPTiA9IENPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPT0gMS54LngnLFxuICA1OiAnPT0gMi4wLjAtYWxwaGEueCcsXG4gIDY6ICc+PSAyLjAuMC1iZXRhLjEnXG59O1xuXG5leHBvcnRzLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xudmFyIGlzQXJyYXkgPSBVdGlscy5pc0FycmF5LFxuICAgIGlzRnVuY3Rpb24gPSBVdGlscy5pc0Z1bmN0aW9uLFxuICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5mdW5jdGlvbiBIYW5kbGViYXJzRW52aXJvbm1lbnQoaGVscGVycywgcGFydGlhbHMpIHtcbiAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xuXG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59XG5cbkhhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXG5cbiAgbG9nZ2VyOiBsb2dnZXIsXG4gIGxvZzogbG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbiByZWdpc3RlckhlbHBlcihuYW1lLCBmbikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoZm4pIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpO1xuICAgICAgfVxuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlckhlbHBlcjogZnVuY3Rpb24gdW5yZWdpc3RlckhlbHBlcihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuaGVscGVyc1tuYW1lXTtcbiAgfSxcblxuICByZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uIHJlZ2lzdGVyUGFydGlhbChuYW1lLCBwYXJ0aWFsKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBwYXJ0aWFsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnQXR0ZW1wdGluZyB0byByZWdpc3RlciBhIHBhcnRpYWwgYXMgdW5kZWZpbmVkJyk7XG4gICAgICB9XG4gICAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gcGFydGlhbDtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbiB1bnJlZ2lzdGVyUGFydGlhbChuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMucGFydGlhbHNbbmFtZV07XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIC8vIEEgbWlzc2luZyBmaWVsZCBpbiBhIHt7Zm9vfX0gY29uc3R1Y3QuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTb21lb25lIGlzIGFjdHVhbGx5IHRyeWluZyB0byBjYWxsIHNvbWV0aGluZywgYmxvdyB1cC5cbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdNaXNzaW5nIGhlbHBlcjogXCInICsgYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXS5uYW1lICsgJ1wiJyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICBpZiAoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmlkcykge1xuICAgICAgICAgIG9wdGlvbnMuaWRzID0gW29wdGlvbnMubmFtZV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgICAgICBvcHRpb25zID0geyBkYXRhOiBkYXRhIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdNdXN0IHBhc3MgaXRlcmF0b3IgdG8gI2VhY2gnKTtcbiAgICB9XG5cbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuLFxuICAgICAgICBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgcmV0ID0gJycsXG4gICAgICAgIGRhdGEgPSB1bmRlZmluZWQsXG4gICAgICAgIGNvbnRleHRQYXRoID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKSArICcuJztcbiAgICB9XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkge1xuICAgICAgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleGVjSXRlcmF0aW9uKGZpZWxkLCBpbmRleCwgbGFzdCkge1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgZGF0YS5rZXkgPSBmaWVsZDtcbiAgICAgICAgZGF0YS5pbmRleCA9IGluZGV4O1xuICAgICAgICBkYXRhLmZpcnN0ID0gaW5kZXggPT09IDA7XG4gICAgICAgIGRhdGEubGFzdCA9ICEhbGFzdDtcblxuICAgICAgICBpZiAoY29udGV4dFBhdGgpIHtcbiAgICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gY29udGV4dFBhdGggKyBmaWVsZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ZpZWxkXSwge1xuICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICBibG9ja1BhcmFtczogVXRpbHMuYmxvY2tQYXJhbXMoW2NvbnRleHRbZmllbGRdLCBmaWVsZF0sIFtjb250ZXh0UGF0aCArIGZpZWxkLCBudWxsXSlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG4gICAgICAgICAgZXhlY0l0ZXJhdGlvbihpLCBpLCBpID09PSBjb250ZXh0Lmxlbmd0aCAtIDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcHJpb3JLZXkgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZiAoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAvLyBXZSdyZSBydW5uaW5nIHRoZSBpdGVyYXRpb25zIG9uZSBzdGVwIG91dCBvZiBzeW5jIHNvIHdlIGNhbiBkZXRlY3RcbiAgICAgICAgICAgIC8vIHRoZSBsYXN0IGl0ZXJhdGlvbiB3aXRob3V0IGhhdmUgdG8gc2NhbiB0aGUgb2JqZWN0IHR3aWNlIGFuZCBjcmVhdGVcbiAgICAgICAgICAgIC8vIGFuIGl0ZXJtZWRpYXRlIGtleXMgYXJyYXkuXG4gICAgICAgICAgICBpZiAocHJpb3JLZXkpIHtcbiAgICAgICAgICAgICAgZXhlY0l0ZXJhdGlvbihwcmlvcktleSwgaSAtIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpb3JLZXkgPSBrZXk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwcmlvcktleSkge1xuICAgICAgICAgIGV4ZWNJdGVyYXRpb24ocHJpb3JLZXksIGkgLSAxLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uIChjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbmRpdGlvbmFsKSkge1xuICAgICAgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgaXMgdG8gcmVuZGVyIHRoZSBwb3NpdGl2ZSBwYXRoIGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgYW5kIG5vdCBlbXB0eS5cbiAgICAvLyBUaGUgYGluY2x1ZGVaZXJvYCBvcHRpb24gbWF5IGJlIHNldCB0byB0cmVhdCB0aGUgY29uZHRpb25hbCBhcyBwdXJlbHkgbm90IGVtcHR5IGJhc2VkIG9uIHRoZVxuICAgIC8vIGJlaGF2aW9yIG9mIGlzRW1wdHkuIEVmZmVjdGl2ZWx5IHRoaXMgZGV0ZXJtaW5lcyBpZiAwIGlzIGhhbmRsZWQgYnkgdGhlIHBvc2l0aXZlIHBhdGggb3IgbmVnYXRpdmUuXG4gICAgaWYgKCFvcHRpb25zLmhhc2guaW5jbHVkZVplcm8gJiYgIWNvbmRpdGlvbmFsIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbiAoY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7IGZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaCB9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoIVV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSk7XG4gICAgICAgIG9wdGlvbnMgPSB7IGRhdGE6IGRhdGEgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uIChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgbWVzc2FnZSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb29rdXAnLCBmdW5jdGlvbiAob2JqLCBmaWVsZCkge1xuICAgIHJldHVybiBvYmogJiYgb2JqW2ZpZWxkXTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMSxcblxuICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uIGxvZyhsZXZlbCwgbWVzc2FnZSkge1xuICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICAoY29uc29sZVttZXRob2RdIHx8IGNvbnNvbGUubG9nKS5jYWxsKGNvbnNvbGUsIG1lc3NhZ2UpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xudmFyIGxvZyA9IGxvZ2dlci5sb2c7XG5cbmV4cG9ydHMubG9nID0gbG9nO1xuXG5mdW5jdGlvbiBjcmVhdGVGcmFtZShvYmplY3QpIHtcbiAgdmFyIGZyYW1lID0gVXRpbHMuZXh0ZW5kKHt9LCBvYmplY3QpO1xuICBmcmFtZS5fcGFyZW50ID0gb2JqZWN0O1xuICByZXR1cm4gZnJhbWU7XG59XG5cbi8qIFthcmdzLCBdb3B0aW9ucyAqLyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xuICB2YXIgbG9jID0gbm9kZSAmJiBub2RlLmxvYyxcbiAgICAgIGxpbmUgPSB1bmRlZmluZWQsXG4gICAgICBjb2x1bW4gPSB1bmRlZmluZWQ7XG4gIGlmIChsb2MpIHtcbiAgICBsaW5lID0gbG9jLnN0YXJ0LmxpbmU7XG4gICAgY29sdW1uID0gbG9jLnN0YXJ0LmNvbHVtbjtcblxuICAgIG1lc3NhZ2UgKz0gJyAtICcgKyBsaW5lICsgJzonICsgY29sdW1uO1xuICB9XG5cbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxuXG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEV4Y2VwdGlvbik7XG4gIH1cblxuICBpZiAobG9jKSB7XG4gICAgdGhpcy5saW5lTnVtYmVyID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IGNvbHVtbjtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IEV4Y2VwdGlvbjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbi8qZ2xvYmFsIHdpbmRvdyAqL1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBmdW5jdGlvbiAoSGFuZGxlYmFycykge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICB2YXIgcm9vdCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93LFxuICAgICAgJEhhbmRsZWJhcnMgPSByb290LkhhbmRsZWJhcnM7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIEhhbmRsZWJhcnMubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAocm9vdC5IYW5kbGViYXJzID09PSBIYW5kbGViYXJzKSB7XG4gICAgICByb290LkhhbmRsZWJhcnMgPSAkSGFuZGxlYmFycztcbiAgICB9XG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247XG5cbi8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXG5cbmV4cG9ydHMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbmV4cG9ydHMud3JhcFByb2dyYW0gPSB3cmFwUHJvZ3JhbTtcbmV4cG9ydHMucmVzb2x2ZVBhcnRpYWwgPSByZXNvbHZlUGFydGlhbDtcbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7XG5leHBvcnRzLm5vb3AgPSBub29wO1xuXG52YXIgX2ltcG9ydCA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZSA9IHJlcXVpcmUoJy4vYmFzZScpO1xuXG5mdW5jdGlvbiBjaGVja1JldmlzaW9uKGNvbXBpbGVySW5mbykge1xuICB2YXIgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mbyAmJiBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiAnICsgJ1BsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKCcgKyBydW50aW1lVmVyc2lvbnMgKyAnKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKCcgKyBjb21waWxlclZlcnNpb25zICsgJykuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gJyArICdQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKCcgKyBjb21waWxlckluZm9bMV0gKyAnKS4nKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlJyk7XG4gIH1cbiAgaWYgKCF0ZW1wbGF0ZVNwZWMgfHwgIXRlbXBsYXRlU3BlYy5tYWluKSB7XG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1Vua25vd24gdGVtcGxhdGUgb2JqZWN0OiAnICsgdHlwZW9mIHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICAvLyBOb3RlOiBVc2luZyBlbnYuVk0gcmVmZXJlbmNlcyByYXRoZXIgdGhhbiBsb2NhbCB2YXIgcmVmZXJlbmNlcyB0aHJvdWdob3V0IHRoaXMgc2VjdGlvbiB0byBhbGxvd1xuICAvLyBmb3IgZXh0ZXJuYWwgdXNlcnMgdG8gb3ZlcnJpZGUgdGhlc2UgYXMgcHN1ZWRvLXN1cHBvcnRlZCBBUElzLlxuICBlbnYuVk0uY2hlY2tSZXZpc2lvbih0ZW1wbGF0ZVNwZWMuY29tcGlsZXIpO1xuXG4gIGZ1bmN0aW9uIGludm9rZVBhcnRpYWxXcmFwcGVyKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5oYXNoKSB7XG4gICAgICBjb250ZXh0ID0gVXRpbHMuZXh0ZW5kKHt9LCBjb250ZXh0LCBvcHRpb25zLmhhc2gpO1xuICAgIH1cblxuICAgIHBhcnRpYWwgPSBlbnYuVk0ucmVzb2x2ZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcblxuICAgIGlmIChyZXN1bHQgPT0gbnVsbCAmJiBlbnYuY29tcGlsZSkge1xuICAgICAgb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgdGVtcGxhdGVTcGVjLmNvbXBpbGVyT3B0aW9ucywgZW52KTtcbiAgICAgIHJlc3VsdCA9IG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7XG4gICAgICBpZiAob3B0aW9ucy5pbmRlbnQpIHtcbiAgICAgICAgdmFyIGxpbmVzID0gcmVzdWx0LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaW5lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICBpZiAoIWxpbmVzW2ldICYmIGkgKyAxID09PSBsKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaW5lc1tpXSA9IG9wdGlvbnMuaW5kZW50ICsgbGluZXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gbGluZXMuam9pbignXFxuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGhlIHBhcnRpYWwgJyArIG9wdGlvbnMubmFtZSArICcgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZScpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEp1c3QgYWRkIHdhdGVyXG4gIHZhciBjb250YWluZXIgPSB7XG4gICAgc3RyaWN0OiBmdW5jdGlvbiBzdHJpY3Qob2JqLCBuYW1lKSB7XG4gICAgICBpZiAoIShuYW1lIGluIG9iaikpIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1wiJyArIG5hbWUgKyAnXCIgbm90IGRlZmluZWQgaW4gJyArIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqW25hbWVdO1xuICAgIH0sXG4gICAgbG9va3VwOiBmdW5jdGlvbiBsb29rdXAoZGVwdGhzLCBuYW1lKSB7XG4gICAgICB2YXIgbGVuID0gZGVwdGhzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKGRlcHRoc1tpXSAmJiBkZXB0aHNbaV1bbmFtZV0gIT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBkZXB0aHNbaV1bbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGxhbWJkYTogZnVuY3Rpb24gbGFtYmRhKGN1cnJlbnQsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgY3VycmVudCA9PT0gJ2Z1bmN0aW9uJyA/IGN1cnJlbnQuY2FsbChjb250ZXh0KSA6IGN1cnJlbnQ7XG4gICAgfSxcblxuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG5cbiAgICBmbjogZnVuY3Rpb24gZm4oaSkge1xuICAgICAgcmV0dXJuIHRlbXBsYXRlU3BlY1tpXTtcbiAgICB9LFxuXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uIHByb2dyYW0oaSwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSxcbiAgICAgICAgICBmbiA9IHRoaXMuZm4oaSk7XG4gICAgICBpZiAoZGF0YSB8fCBkZXB0aHMgfHwgYmxvY2tQYXJhbXMgfHwgZGVjbGFyZWRCbG9ja1BhcmFtcykge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHdyYXBQcm9ncmFtKHRoaXMsIGksIGZuLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IHdyYXBQcm9ncmFtKHRoaXMsIGksIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICB9LFxuXG4gICAgZGF0YTogZnVuY3Rpb24gZGF0YSh2YWx1ZSwgZGVwdGgpIHtcbiAgICAgIHdoaWxlICh2YWx1ZSAmJiBkZXB0aC0tKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuX3BhcmVudDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbiBtZXJnZShwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgb2JqID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIHBhcmFtICE9PSBjb21tb24pIHtcbiAgICAgICAgb2JqID0gVXRpbHMuZXh0ZW5kKHt9LCBjb21tb24sIHBhcmFtKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9LFxuXG4gICAgbm9vcDogZW52LlZNLm5vb3AsXG4gICAgY29tcGlsZXJJbmZvOiB0ZW1wbGF0ZVNwZWMuY29tcGlsZXJcbiAgfTtcblxuICBmdW5jdGlvbiByZXQoY29udGV4dCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1sxXTtcblxuICAgIHZhciBkYXRhID0gb3B0aW9ucy5kYXRhO1xuXG4gICAgcmV0Ll9zZXR1cChvcHRpb25zKTtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCAmJiB0ZW1wbGF0ZVNwZWMudXNlRGF0YSkge1xuICAgICAgZGF0YSA9IGluaXREYXRhKGNvbnRleHQsIGRhdGEpO1xuICAgIH1cbiAgICB2YXIgZGVwdGhzID0gdW5kZWZpbmVkLFxuICAgICAgICBibG9ja1BhcmFtcyA9IHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyA/IFtdIDogdW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzKSB7XG4gICAgICBkZXB0aHMgPSBvcHRpb25zLmRlcHRocyA/IFtjb250ZXh0XS5jb25jYXQob3B0aW9ucy5kZXB0aHMpIDogW2NvbnRleHRdO1xuICAgIH1cblxuICAgIHJldHVybiB0ZW1wbGF0ZVNwZWMubWFpbi5jYWxsKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gIH1cbiAgcmV0LmlzVG9wID0gdHJ1ZTtcblxuICByZXQuX3NldHVwID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5oZWxwZXJzLCBlbnYuaGVscGVycyk7XG5cbiAgICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlUGFydGlhbCkge1xuICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5wYXJ0aWFscywgZW52LnBhcnRpYWxzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBjb250YWluZXIucGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgfTtcblxuICByZXQuX2NoaWxkID0gZnVuY3Rpb24gKGksIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZUJsb2NrUGFyYW1zICYmICFibG9ja1BhcmFtcykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ211c3QgcGFzcyBibG9jayBwYXJhbXMnKTtcbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMgJiYgIWRlcHRocykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ211c3QgcGFzcyBwYXJlbnQgZGVwdGhzJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdyYXBQcm9ncmFtKGNvbnRhaW5lciwgaSwgdGVtcGxhdGVTcGVjW2ldLCBkYXRhLCAwLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgfTtcbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICBmdW5jdGlvbiBwcm9nKGNvbnRleHQpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMV07XG5cbiAgICByZXR1cm4gZm4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIG9wdGlvbnMuZGF0YSB8fCBkYXRhLCBibG9ja1BhcmFtcyAmJiBbb3B0aW9ucy5ibG9ja1BhcmFtc10uY29uY2F0KGJsb2NrUGFyYW1zKSwgZGVwdGhzICYmIFtjb250ZXh0XS5jb25jYXQoZGVwdGhzKSk7XG4gIH1cbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IGRlcHRocyA/IGRlcHRocy5sZW5ndGggOiAwO1xuICBwcm9nLmJsb2NrUGFyYW1zID0gZGVjbGFyZWRCbG9ja1BhcmFtcyB8fCAwO1xuICByZXR1cm4gcHJvZztcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVBhcnRpYWwocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICBpZiAoIXBhcnRpYWwpIHtcbiAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdO1xuICB9IGVsc2UgaWYgKCFwYXJ0aWFsLmNhbGwgJiYgIW9wdGlvbnMubmFtZSkge1xuICAgIC8vIFRoaXMgaXMgYSBkeW5hbWljIHBhcnRpYWwgdGhhdCByZXR1cm5lZCBhIHN0cmluZ1xuICAgIG9wdGlvbnMubmFtZSA9IHBhcnRpYWw7XG4gICAgcGFydGlhbCA9IG9wdGlvbnMucGFydGlhbHNbcGFydGlhbF07XG4gIH1cbiAgcmV0dXJuIHBhcnRpYWw7XG59XG5cbmZ1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICBvcHRpb25zLnBhcnRpYWwgPSB0cnVlO1xuXG4gIGlmIChwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGhlIHBhcnRpYWwgJyArIG9wdGlvbnMubmFtZSArICcgY291bGQgbm90IGJlIGZvdW5kJyk7XG4gIH0gZWxzZSBpZiAocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9vcCgpIHtcbiAgcmV0dXJuICcnO1xufVxuXG5mdW5jdGlvbiBpbml0RGF0YShjb250ZXh0LCBkYXRhKSB7XG4gIGlmICghZGF0YSB8fCAhKCdyb290JyBpbiBkYXRhKSkge1xuICAgIGRhdGEgPSBkYXRhID8gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuY3JlYXRlRnJhbWUoZGF0YSkgOiB7fTtcbiAgICBkYXRhLnJvb3QgPSBjb250ZXh0O1xuICB9XG4gIHJldHVybiBkYXRhO1xufSIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBTYWZlU3RyaW5nLnByb3RvdHlwZS50b0hUTUwgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAnJyArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gU2FmZVN0cmluZztcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO1xuXG4vLyBPbGRlciBJRSB2ZXJzaW9ucyBkbyBub3QgZGlyZWN0bHkgc3VwcG9ydCBpbmRleE9mIHNvIHdlIG11c3QgaW1wbGVtZW50IG91ciBvd24sIHNhZGx5LlxuZXhwb3J0cy5pbmRleE9mID0gaW5kZXhPZjtcbmV4cG9ydHMuZXNjYXBlRXhwcmVzc2lvbiA9IGVzY2FwZUV4cHJlc3Npb247XG5leHBvcnRzLmlzRW1wdHkgPSBpc0VtcHR5O1xuZXhwb3J0cy5ibG9ja1BhcmFtcyA9IGJsb2NrUGFyYW1zO1xuZXhwb3J0cy5hcHBlbmRDb250ZXh0UGF0aCA9IGFwcGVuZENvbnRleHRQYXRoO1xudmFyIGVzY2FwZSA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmcXVvdDsnLFxuICAnXFwnJzogJyYjeDI3OycsXG4gICdgJzogJyYjeDYwOydcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZyxcbiAgICBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG5mdW5jdGlvbiBlc2NhcGVDaGFyKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl07XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmogLyogLCAuLi5zb3VyY2UgKi8pIHtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmV4cG9ydHMudG9TdHJpbmcgPSB0b1N0cmluZztcbi8vIFNvdXJjZWQgZnJvbSBsb2Rhc2hcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcbi8qZXNsaW50LWRpc2FibGUgZnVuYy1zdHlsZSwgbm8tdmFyICovXG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb24gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9O1xufVxudmFyIGlzRnVuY3Rpb247XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuLyplc2xpbnQtZW5hYmxlIGZ1bmMtc3R5bGUsIG5vLXZhciAqL1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O2V4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGluZGV4T2YoYXJyYXksIHZhbHVlKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnJheS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChhcnJheVtpXSA9PT0gdmFsdWUpIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgICBpZiAoc3RyaW5nICYmIHN0cmluZy50b0hUTUwpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9IVE1MKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH0gZWxzZSBpZiAoIXN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZyArICcnO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nO1xuICB9XG5cbiAgaWYgKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nO1xuICB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBibG9ja1BhcmFtcyhwYXJhbXMsIGlkcykge1xuICBwYXJhbXMucGF0aCA9IGlkcztcbiAgcmV0dXJuIHBhcmFtcztcbn1cblxuZnVuY3Rpb24gYXBwZW5kQ29udGV4dFBhdGgoY29udGV4dFBhdGgsIGlkKSB7XG4gIHJldHVybiAoY29udGV4dFBhdGggPyBjb250ZXh0UGF0aCArICcuJyA6ICcnKSArIGlkO1xufSIsIi8vIENyZWF0ZSBhIHNpbXBsZSBwYXRoIGFsaWFzIHRvIGFsbG93IGJyb3dzZXJpZnkgdG8gcmVzb2x2ZVxuLy8gdGhlIHJ1bnRpbWUgb24gYSBzdXBwb3J0ZWQgcGF0aC5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9kaXN0L2Nqcy9oYW5kbGViYXJzLnJ1bnRpbWUnKVsnZGVmYXVsdCddO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpW1wiZGVmYXVsdFwiXTtcbiIsInZhciBiYXNlVG9TdHJpbmcgPSByZXF1aXJlKCcuLi9pbnRlcm5hbC9iYXNlVG9TdHJpbmcnKTtcblxuLyoqXG4gKiBDYXBpdGFsaXplcyB0aGUgZmlyc3QgY2hhcmFjdGVyIG9mIGBzdHJpbmdgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgU3RyaW5nXG4gKiBAcGFyYW0ge3N0cmluZ30gW3N0cmluZz0nJ10gVGhlIHN0cmluZyB0byBjYXBpdGFsaXplLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgY2FwaXRhbGl6ZWQgc3RyaW5nLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmNhcGl0YWxpemUoJ2ZyZWQnKTtcbiAqIC8vID0+ICdGcmVkJ1xuICovXG5mdW5jdGlvbiBjYXBpdGFsaXplKHN0cmluZykge1xuICBzdHJpbmcgPSBiYXNlVG9TdHJpbmcoc3RyaW5nKTtcbiAgcmV0dXJuIHN0cmluZyAmJiAoc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjYXBpdGFsaXplO1xuIiwiLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgc3RyaW5nIGlmIGl0J3Mgbm90IG9uZS4gQW4gZW1wdHkgc3RyaW5nIGlzIHJldHVybmVkXG4gKiBmb3IgYG51bGxgIG9yIGB1bmRlZmluZWRgIHZhbHVlcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gYmFzZVRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PSBudWxsID8gJycgOiAodmFsdWUgKyAnJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYmFzZVRvU3RyaW5nO1xuIiwiLy8gQXZvaWQgY29uc29sZSBlcnJvcnMgZm9yIHRoZSBJRSBjcmFwcHkgYnJvd3NlcnNcbmlmICggISB3aW5kb3cuY29uc29sZSApIGNvbnNvbGUgPSB7IGxvZzogZnVuY3Rpb24oKXt9IH07XG5cbmltcG9ydCBBcHAgZnJvbSAnQXBwJ1xuaW1wb3J0ICQgZnJvbSAnanF1ZXJ5J1xuaW1wb3J0IFR3ZWVuTWF4IGZyb20gJ2dzYXAnXG5pbXBvcnQgcmFmIGZyb20gJ3JhZidcbmltcG9ydCBwaXhpIGZyb20gJ3BpeGkuanMnXG5cbndpbmRvdy5qUXVlcnkgPSB3aW5kb3cuJCA9ICRcblxuLy8gU3RhcnQgQXBwXG52YXIgYXBwID0gbmV3IEFwcCgpXG5hcHAuaW5pdCgpXG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IEFwcFRlbXBsYXRlIGZyb20gJ0FwcFRlbXBsYXRlJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5pbXBvcnQgR0V2ZW50cyBmcm9tICdHbG9iYWxFdmVudHMnXG5pbXBvcnQgUG9vbCBmcm9tICdQb29sJ1xuaW1wb3J0IFByZWxvYWRlciBmcm9tICdQcmVsb2FkZXInXG5cbmNsYXNzIEFwcCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHR9XG5cdGluaXQoKSB7XG5cblx0XHQvLyBJbml0IFByZWxvYWRlclxuXHRcdEFwcFN0b3JlLlByZWxvYWRlciA9IG5ldyBQcmVsb2FkZXIoKVxuXG5cdFx0Ly8gSW5pdCBQb29sXG5cdFx0QXBwU3RvcmUuUG9vbCA9IG5ldyBQb29sKClcblxuXHRcdC8vIEluaXQgcm91dGVyXG5cdFx0dGhpcy5yb3V0ZXIgPSBuZXcgUm91dGVyKClcblx0XHR0aGlzLnJvdXRlci5pbml0KClcblxuXHRcdC8vIEluaXQgZ2xvYmFsIGV2ZW50c1xuXHRcdHdpbmRvdy5HbG9iYWxFdmVudHMgPSBuZXcgR0V2ZW50cygpXG5cdFx0R2xvYmFsRXZlbnRzLmluaXQoKVxuXG5cdFx0dmFyIGFwcFRlbXBsYXRlID0gbmV3IEFwcFRlbXBsYXRlKClcblx0XHR0aGlzLnRlbXBsYXRlSXNSZWFkeSA9IHRoaXMudGVtcGxhdGVJc1JlYWR5LmJpbmQodGhpcylcblx0XHRhcHBUZW1wbGF0ZS5pc1JlYWR5ID0gdGhpcy50ZW1wbGF0ZUlzUmVhZHlcblx0XHRhcHBUZW1wbGF0ZS5yZW5kZXIoJyNhcHAtY29udGFpbmVyJylcblx0fVxuXHR0ZW1wbGF0ZUlzUmVhZHkoKSB7XG5cdFx0Ly8gU3RhcnQgcm91dGluZ1xuXHRcdHRoaXMucm91dGVyLmJlZ2luUm91dGluZygpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQXBwXG4gICAgXHRcbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQgRnJvbnRDb250YWluZXIgZnJvbSAnRnJvbnRDb250YWluZXInXG5pbXBvcnQgUGFnZXNDb250YWluZXIgZnJvbSAnUGFnZXNDb250YWluZXInXG5pbXBvcnQgUFhDb250YWluZXIgZnJvbSAnUFhDb250YWluZXInXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5cbmNsYXNzIEFwcFRlbXBsYXRlIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0XHR0aGlzLmlzUmVhZHkgPSB1bmRlZmluZWRcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuV0lORE9XX1JFU0laRSwgdGhpcy5yZXNpemUpXG5cdH1cblx0cmVuZGVyKHBhcmVudCkge1xuXHRcdHN1cGVyLnJlbmRlcignQXBwVGVtcGxhdGUnLCBwYXJlbnQsIHVuZGVmaW5lZClcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHR0aGlzLmZyb250Q29udGFpbmVyID0gbmV3IEZyb250Q29udGFpbmVyKClcblx0XHR0aGlzLmZyb250Q29udGFpbmVyLnJlbmRlcignI2FwcC10ZW1wbGF0ZScpXG5cblx0XHR0aGlzLnBhZ2VzQ29udGFpbmVyID0gbmV3IFBhZ2VzQ29udGFpbmVyKClcblx0XHR0aGlzLnBhZ2VzQ29udGFpbmVyLnJlbmRlcignI2FwcC10ZW1wbGF0ZScpXG5cblx0XHR0aGlzLnB4Q29udGFpbmVyID0gbmV3IFBYQ29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmluaXQoJyNhcHAtdGVtcGxhdGUnKVxuXHRcdEFwcEFjdGlvbnMucHhDb250YWluZXJJc1JlYWR5KHRoaXMucHhDb250YWluZXIpXG5cblx0XHRHbG9iYWxFdmVudHMucmVzaXplKClcblxuXHRcdHRoaXMuYW5pbWF0ZSgpXG5cblx0XHRzZXRUaW1lb3V0KCgpPT57dGhpcy5pc1JlYWR5KCl9LCAwKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxuXHRhbmltYXRlKCkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdGUpXG5cdCAgICB0aGlzLnB4Q29udGFpbmVyLnVwZGF0ZSgpXG5cdCAgICB0aGlzLnBhZ2VzQ29udGFpbmVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuZnJvbnRDb250YWluZXIucmVzaXplKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLnJlc2l6ZSgpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQXBwVGVtcGxhdGVcbiIsImltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcERpc3BhdGNoZXIgZnJvbSAnQXBwRGlzcGF0Y2hlcidcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZnVuY3Rpb24gX3Byb2NlZWRIYXNoZXJDaGFuZ2VBY3Rpb24ocGFnZUlkKSB7XG4gICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQsXG4gICAgICAgIGl0ZW06IHBhZ2VJZFxuICAgIH0pICBcbn1cbnZhciBBcHBBY3Rpb25zID0ge1xuICAgIHBhZ2VIYXNoZXJDaGFuZ2VkOiBmdW5jdGlvbihwYWdlSWQpIHtcbiAgICAgICAgdmFyIG1hbmlmZXN0ID0gQXBwU3RvcmUucGFnZUFzc2V0c1RvTG9hZCgpXG4gICAgICAgIGlmKG1hbmlmZXN0Lmxlbmd0aCA8IDEpIHtcbiAgICAgICAgICAgIF9wcm9jZWVkSGFzaGVyQ2hhbmdlQWN0aW9uKHBhZ2VJZClcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBBcHBTdG9yZS5QcmVsb2FkZXIubG9hZChtYW5pZmVzdCwgKCk9PntcbiAgICAgICAgICAgICAgICBfcHJvY2VlZEhhc2hlckNoYW5nZUFjdGlvbihwYWdlSWQpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfSxcbiAgICB3aW5kb3dSZXNpemU6IGZ1bmN0aW9uKHdpbmRvd1csIHdpbmRvd0gpIHtcbiAgICAgICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLFxuICAgICAgICAgICAgaXRlbTogeyB3aW5kb3dXOndpbmRvd1csIHdpbmRvd0g6d2luZG93SCB9XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBweENvbnRhaW5lcklzUmVhZHk6IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9JU19SRUFEWSxcbiAgICAgICAgICAgIGl0ZW06IGNvbXBvbmVudFxuICAgICAgICB9KSAgICAgICAgICAgIFxuICAgIH0sXG4gICAgcHhBZGRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfQUREX0NISUxELFxuICAgICAgICAgICAgaXRlbToge2NoaWxkOiBjaGlsZH1cbiAgICAgICAgfSkgICAgICAgICAgICBcbiAgICB9LFxuICAgIHB4UmVtb3ZlQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX1JFTU9WRV9DSElMRCxcbiAgICAgICAgICAgIGl0ZW06IHtjaGlsZDogY2hpbGR9XG4gICAgICAgIH0pICAgICAgICAgICAgXG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBBY3Rpb25zXG5cblxuICAgICAgXG4iLCJpbXBvcnQgS25vdCBmcm9tICdLbm90J1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFycm93QnRuIHtcblx0Y29uc3RydWN0b3IoZWxlbWVudCwgZGlyZWN0aW9uKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudFxuXHRcdHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy50bE92ZXIgPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdFx0dGhpcy50bE91dCA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR2YXIga25vdHNFbCA9IHRoaXMuZWxlbWVudC5maW5kKFwiLmtub3RcIilcblx0XHR2YXIgbGluZXNFbCA9IHRoaXMuZWxlbWVudC5maW5kKFwiLmxpbmVcIilcblx0XHQvLyBUd2Vlbk1heC50byhrbm90c0VsLCAxLCB7IHNjYWxlOjIsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScgfSlcblxuXHRcdHRoaXMubGluZVNpemUgPSBBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKVxuXHRcdHZhciByYWRpdXMgPSAzXG5cdFx0dmFyIG1hcmdpbiA9IDMwXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtub3RzRWwubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0gJChrbm90c0VsW2ldKVxuXHRcdFx0a25vdC5hdHRyKCdyJywgcmFkaXVzKVxuXHRcdH07XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lc0VsLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbGluZSA9ICQobGluZXNFbFtpXSlcblx0XHRcdGxpbmUuY3NzKCdzdHJva2Utd2lkdGgnLCB0aGlzLmxpbmVTaXplKVxuXHRcdH07XG5cblx0XHR2YXIgc3RhcnRYID0gNFxuXHRcdHZhciBzdGFydFkgPSBtYXJnaW5cblx0XHR2YXIgb2Zmc2V0VXBEb3duID0gMC42XG5cdFx0JChrbm90c0VsLmdldCgwKSkuYXR0cih7XG5cdFx0XHQnY3gnOiBzdGFydFggKyAwLFxuXHRcdFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdH0pXG5cdFx0JChrbm90c0VsLmdldCgxKSkuYXR0cih7XG5cdFx0XHQnY3gnOiBzdGFydFggKyBtYXJnaW4sXG5cdFx0XHQnY3knOiBzdGFydFkgKyAwXG5cdFx0fSlcblx0XHQkKGtub3RzRWwuZ2V0KDIpKS5hdHRyKHtcblx0XHRcdCdjeCc6IHN0YXJ0WCArIChtYXJnaW4qMiksXG5cdFx0XHQnY3knOiBzdGFydFkgKyAwXG5cdFx0fSlcblx0XHQkKGtub3RzRWwuZ2V0KDMpKS5hdHRyKHtcblx0XHRcdCdjeCc6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdFx0J2N5Jzogc3RhcnRZIC0gKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHR9KVxuXHRcdCQoa25vdHNFbC5nZXQoNCkpLmF0dHIoe1xuXHRcdFx0J2N4Jzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0XHQnY3knOiBzdGFydFkgKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdH0pXG5cdFx0JChsaW5lc0VsLmdldCgwKSkuYXR0cih7XG5cdFx0XHQneDEnOiBzdGFydFggKyAwLFxuXHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdCd4Mic6IHN0YXJ0WCArIG1hcmdpbixcblx0XHRcdCd5Mic6IHN0YXJ0WSArIDBcblx0XHR9KVxuXHRcdCQobGluZXNFbC5nZXQoMSkpLmF0dHIoe1xuXHRcdFx0J3gxJzogc3RhcnRYICsgbWFyZ2luLFxuXHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdCd4Mic6IHN0YXJ0WCArIChtYXJnaW4qMiksXG5cdFx0XHQneTInOiBzdGFydFkgKyAwXG5cdFx0fSlcblx0XHQkKGxpbmVzRWwuZ2V0KDIpKS5hdHRyKHtcblx0XHRcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0XHQneTEnOiBzdGFydFkgKyAwLFxuXHRcdFx0J3gyJzogc3RhcnRYICsgKG1hcmdpbiAqIG9mZnNldFVwRG93biksXG5cdFx0XHQneTInOiBzdGFydFkgLSAobWFyZ2luICogb2Zmc2V0VXBEb3duKVxuXHRcdH0pXG5cdFx0JChsaW5lc0VsLmdldCgzKSkuYXR0cih7XG5cdFx0XHQneDEnOiBzdGFydFggKyAwLFxuXHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdCd4Mic6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdFx0J3kyJzogc3RhcnRZICsgKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHR9KVxuXG5cdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFswXSwgMSwgeyB4Oi02LCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlSW5PdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzFdLCAxLCB7IHg6LTYsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VJbk91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMl0sIDEsIHsgeDotNiwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZUluT3V0IH0sIDApXG5cdFx0Ly8gdGhpcy50bE92ZXIudG8oa25vdHNFbFszXSwgMSwgeyB4OjYsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VJbk91dCB9LCAwKVxuXHRcdC8vIHRoaXMudGxPdmVyLnRvKGtub3RzRWxbNF0sIDEsIHsgeDo2LCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlSW5PdXQgfSwgMClcblx0XHRcblx0XHQvLyB0aGlzLnRsT3Zlci50byhsaW5lc0VsWzBdLCAxLCB7IHNjYWxlWDoxLjEsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAxMDAlJywgZWFzZTpFbGFzdGljLmVhc2VJbk91dCB9LCAwKVxuXG5cdFx0c3dpdGNoKHRoaXMuZGlyZWN0aW9uKSB7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MRUZUOlxuXHRcdFx0XHQvLyB0aGlzLmNvbnRhaW5lci5yb3RhdGlvbiA9IFV0aWxzLkRlZ3JlZXNUb1JhZGlhbnMoMTgwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuUklHSFQ6XG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5UT1A6XG5cdFx0XHRcdC8vIHRoaXMuY29udGFpbmVyLnJvdGF0aW9uID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucygtOTApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5CT1RUT006XG5cdFx0XHRcdC8vIHRoaXMuY29udGFpbmVyLnJvdGF0aW9uID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucyg5MClcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHR0aGlzLnRsT3Zlci5wYXVzZSgwKVxuXG5cdFx0dGhpcy5yb2xsb3ZlciA9IHRoaXMucm9sbG92ZXIuYmluZCh0aGlzKVxuXHRcdHRoaXMuZWxlbWVudC5vbignbW91c2VlbnRlcicsIHRoaXMucm9sbG92ZXIpXG5cdFx0Y29uc29sZS5sb2codGhpcy5lbGVtZW50KVxuXG5cdFx0dGhpcy53aWR0aCA9IG1hcmdpbiAqIDNcblx0XHR0aGlzLmhlaWdodCA9IG1hcmdpbiAqIDJcblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0dGhpcy5jb250YWluZXIueCA9IHhcblx0XHR0aGlzLmNvbnRhaW5lci55ID0geVxuXHR9XG5cdHJvbGxvdXQoKSB7XG5cdFx0Ly8gdGhpcy51cGRhdGVTdHJpbmdzKCdmcm9tWCcsICdmcm9tWScpXG5cdH1cblx0cm9sbG92ZXIoKSB7XG5cdFx0Y29uc29sZS5sb2coJ292ZXInKVxuXHRcdHRoaXMudGxPdmVyLnBsYXkoMClcblx0XHQvLyB0aGlzLnVwZGF0ZVN0cmluZ3MoJ3RvWCcsICd0b1knKVxuXHR9XG5cdHVwZGF0ZVN0cmluZ3MoZGlyWCwgZGlyWSkge1xuXHRcdHZhciBzcHJpbmcgPSB0aGlzLmNvbmZpZy5zcHJpbmdcblx0XHR2YXIgZnJpY3Rpb24gPSB0aGlzLmNvbmZpZy5mcmljdGlvblxuXHRcdHZhciBzcHJpbmdMZW5ndGggPSB0aGlzLmNvbmZpZy5zcHJpbmdMZW5ndGhcblx0XHR2YXIga25vdHNMaW5lID0gdGhpcy5rbm90c0xpbmVcblx0XHR2YXIga25vdHNUcmlhbmdsZSA9IHRoaXMua25vdHNUcmlhbmdsZVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwga25vdHNMaW5lLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IGtub3RzTGluZVtpXVxuXHRcdFx0VXRpbHMuU3ByaW5nVG8oa25vdCwga25vdFtkaXJYXSwga25vdFtkaXJZXSwgaSwgc3ByaW5nLCBmcmljdGlvbiwgc3ByaW5nTGVuZ3RoKVxuXHRcdFx0a25vdC5wb3NpdGlvbihrbm90LnggKyBrbm90LnZ4LCBrbm90LnkgKyBrbm90LnZ5KVxuXHRcdH1cblx0XHRmb3IgKGkgPSAwOyBpIDwga25vdHNUcmlhbmdsZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSBrbm90c1RyaWFuZ2xlW2ldXG5cdFx0XHRVdGlscy5TcHJpbmdUbyhrbm90LCBrbm90W2RpclhdLCBrbm90W2RpclldLCBpLCBzcHJpbmcsIGZyaWN0aW9uLCBzcHJpbmdMZW5ndGgpXG5cdFx0XHRrbm90LnBvc2l0aW9uKGtub3QueCArIGtub3QudngsIGtub3QueSArIGtub3QudnkpXG5cdFx0fVxuXHRcdHRoaXMuZHJhd0xpbmVzKHRoaXMuZylcblx0fVxuXHRkcmF3TGluZXMoZykge1xuXHRcdGcuY2xlYXIoKVxuXHRcdGcubGluZVN0eWxlKHRoaXMubGluZVNpemUsIDB4ZmZmZmZmKVxuXG5cdFx0Zy5tb3ZlVG8odGhpcy5rbm90c0xpbmVbMF0ueCx0aGlzLmtub3RzTGluZVswXS55KVxuXHRcdGcubGluZVRvKHRoaXMua25vdHNMaW5lWzFdLngsIHRoaXMua25vdHNMaW5lWzFdLnkpXG5cdFx0Zy5saW5lVG8odGhpcy5rbm90c0xpbmVbMl0ueCwgdGhpcy5rbm90c0xpbmVbMl0ueSlcblxuXHRcdGcubW92ZVRvKHRoaXMua25vdHNUcmlhbmdsZVswXS54LHRoaXMua25vdHNUcmlhbmdsZVswXS55KVxuXHRcdGcubGluZVRvKHRoaXMua25vdHNMaW5lWzJdLngsIHRoaXMua25vdHNMaW5lWzJdLnkpXG5cblx0XHRnLm1vdmVUbyh0aGlzLmtub3RzVHJpYW5nbGVbMV0ueCx0aGlzLmtub3RzVHJpYW5nbGVbMV0ueSlcblx0XHRnLmxpbmVUbyh0aGlzLmtub3RzTGluZVsyXS54LCB0aGlzLmtub3RzTGluZVsyXS55KVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEFwcFN0b3JlLnJlbGVhc2VUaW1lbGluZSh0aGlzLnRsT3Zlcilcblx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bE91dClcblx0fVxufVxuIiwiaW1wb3J0IFBhZ2UgZnJvbSAnUGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJhc2VQbGFuZXRQYWdlIGV4dGVuZHMgUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdFx0dGhpcy5leHBlcmllbmNlID0gdW5kZWZpbmVkXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGlmKHRoaXMuZXhwZXJpZW5jZSAhPSB1bmRlZmluZWQpIHRoaXMuZXhwZXJpZW5jZS5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBTcHJpbmdHYXJkZW4gZnJvbSAnU3ByaW5nR2FyZGVuJ1xuaW1wb3J0IENvbXBhc3NSaW5ncyBmcm9tICdDb21wYXNzUmluZ3MnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbXBhc3Mge1xuXHRjb25zdHJ1Y3RvcihweENvbnRhaW5lciwgdHlwZSkge1xuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHRcdHRoaXMudHlwZSA9IHR5cGUgfHwgQXBwQ29uc3RhbnRzLkxBTkRJTkdcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmNvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmNvbnRhaW5lcilcblxuIFx0XHR0aGlzLnJpbmdzID0gbmV3IENvbXBhc3NSaW5ncyh0aGlzLmNvbnRhaW5lcilcblx0IFx0dGhpcy5yaW5ncy5jb21wb25lbnREaWRNb3VudCgpXG5cblx0IFx0dGhpcy5zcHJpbmdHYXJkZW5zID0gW11cblx0IFx0dGhpcy5nZXRSYWRpdXMoKVxuXHR9XG5cdHVwZGF0ZURhdGEoZGF0YSkge1xuXHRcdHRoaXMucmVtb3ZlUHJldmlvdXNTcHJpbmdHYXJkZW5zKClcblx0XHR0aGlzLnNwcmluZ0dhcmRlbnMgPSBbXVxuXHRcdHZhciBzcHJpbmdHYXJkZW5XaXRoRmlsbCA9ICh0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UpID8gdHJ1ZSA6IGZhbHNlXG5cdFx0dmFyIHNwcmluZ0dhcmRlbklzSW50ZXJhY3RpdmUgPSAodGhpcy50eXBlID09IEFwcENvbnN0YW50cy5FWFBFUklFTkNFKSA/IHRydWUgOiBmYWxzZVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IEFwcFN0b3JlLmdldFNwcmluZ0dhcmRlbigpXG5cdFx0XHR2YXIgcHJvZHVjdCA9IGRhdGFbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi5pZCA9IHRoaXMuaWRcblx0XHRcdHNwcmluZ0dhcmRlbi5yYWRpdXMgPSB0aGlzLnJhZGl1c1xuXHRcdFx0c3ByaW5nR2FyZGVuLmtub3RSYWRpdXMgPSB0aGlzLmtub3RSYWRpdXNcblx0XHRcdHNwcmluZ0dhcmRlbi5jb21wb25lbnREaWRNb3VudChwcm9kdWN0LCBzcHJpbmdHYXJkZW5XaXRoRmlsbCwgc3ByaW5nR2FyZGVuSXNJbnRlcmFjdGl2ZSlcblx0XHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHNwcmluZ0dhcmRlbi5jb250YWluZXIpXG5cdFx0XHR0aGlzLnNwcmluZ0dhcmRlbnNbaV0gPSBzcHJpbmdHYXJkZW5cblx0XHR9XG5cdH1cblx0cmVtb3ZlUHJldmlvdXNTcHJpbmdHYXJkZW5zKCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zcHJpbmdHYXJkZW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc3ByaW5nR2FyZGVuID0gdGhpcy5zcHJpbmdHYXJkZW5zW2ldXG5cdFx0XHRzcHJpbmdHYXJkZW4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdFx0QXBwU3RvcmUucmVsZWFzZVNwcmluZ0dhcmRlbihzcHJpbmdHYXJkZW4pXG5cdFx0fVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoIDwgMSkgcmV0dXJuIFxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc3ByaW5nR2FyZGVucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IHRoaXMuc3ByaW5nR2FyZGVuc1tpXVxuXHRcdFx0c3ByaW5nR2FyZGVuLnVwZGF0ZSgpXG5cdFx0fVxuXHR9XG5cdGdldFJhZGl1cygpIHtcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIHNpemVQZXJjZW50YWdlID0gKHRoaXMudHlwZSA9PSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRSB8fCB0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkNBTVBBSUdOKSA/IEFwcENvbnN0YW50cy5DT01QQVNTX1NNQUxMX1NJWkVfUEVSQ0VOVEFHRSA6IEFwcENvbnN0YW50cy5DT01QQVNTX1NJWkVfUEVSQ0VOVEFHRVxuXHRcdHRoaXMucmFkaXVzID0gd2luZG93SCAqIHNpemVQZXJjZW50YWdlXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5nZXRSYWRpdXMoKVxuXHRcdHRoaXMucmluZ3MucmVzaXplKHRoaXMucmFkaXVzKVxuXG5cdFx0aWYodGhpcy5zcHJpbmdHYXJkZW5zLmxlbmd0aCA8IDEpIHJldHVybiBcblx0IFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSB0aGlzLnNwcmluZ0dhcmRlbnNbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi5yZXNpemUodGhpcy5yYWRpdXMpXG5cdFx0fVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLmNvbnRhaW5lci54ID0geFxuXHRcdHRoaXMuY29udGFpbmVyLnkgPSB5XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRwb3NpdGlvbkVsZW1lbnQoeCwgeSkge1xuXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5jb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5jb250YWluZXIpXG5cdFx0dGhpcy5yZW1vdmVQcmV2aW91c1NwcmluZ0dhcmRlbnMoKVxuXHRcdHRoaXMucmluZ3MuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGFzc1JpbmdzIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0dGhpcy5jb250YWluZXIgPSBwYXJlbnRDb250YWluZXJcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnJpbmdzQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnRpdGxlc0NvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5nZW5kZXJDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMucmluZ3NDb250YWluZXIpXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy50aXRsZXNDb250YWluZXIpXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5nZW5kZXJDb250YWluZXIpXG5cblx0XHR0aGlzLmNpcmNsZXMgPSBbXVxuXHRcdHZhciBjaWNsZXNMZW4gPSA2XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjaWNsZXNMZW47IGkrKykge1xuXHRcdFx0dmFyIGcgPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0XHR0aGlzLmNpcmNsZXNbaV0gPSBnXG5cdFx0XHR0aGlzLnJpbmdzQ29udGFpbmVyLmFkZENoaWxkKGcpXG5cdFx0fVxuXG5cdFx0dGhpcy50aXRsZXMgPSBbXVxuXHRcdHRoaXMuZ2VuZGVycyA9IFtdXG5cdFx0dmFyIGdsb2JhbENvbnRlbnQgPSBBcHBTdG9yZS5nbG9iYWxDb250ZW50KClcblx0XHR2YXIgZWxlbWVudHMgPSBBcHBTdG9yZS5lbGVtZW50c09mTmF0dXJlKClcblx0XHR2YXIgYWxsR2VuZGVyID0gQXBwU3RvcmUuYWxsR2VuZGVyKClcblx0XHR2YXIgZWxlbWVudHNUZXh0cyA9IGdsb2JhbENvbnRlbnQuZWxlbWVudHNcblx0XHR2YXIgZ2VuZGVyVGV4dHMgPSBnbG9iYWxDb250ZW50LmdlbmRlclxuXHRcdHZhciBmb250U2l6ZSA9IDMwXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZWxlbWVudElkID0gZWxlbWVudHNbaV1cblx0XHRcdHZhciBlbGVtZW50VGl0bGUgPSBlbGVtZW50c1RleHRzW2VsZW1lbnRJZF0udG9VcHBlckNhc2UoKVxuXHRcdFx0dmFyIHR4dCA9IG5ldyBQSVhJLlRleHQoZWxlbWVudFRpdGxlLCB7IGZvbnQ6IGZvbnRTaXplICsgJ3B4IEZ1dHVyYUJvbGQnLCBmaWxsOiAnd2hpdGUnLCBhbGlnbjogJ2NlbnRlcicgfSlcblx0XHRcdHR4dC5hbmNob3IueCA9IDAuNVxuXHRcdFx0dHh0LmFuY2hvci55ID0gMC41XG5cdFx0XHR0aGlzLnRpdGxlc0NvbnRhaW5lci5hZGRDaGlsZCh0eHQpXG5cdFx0XHR0aGlzLnRpdGxlcy5wdXNoKHtcblx0XHRcdFx0dHh0OiB0eHQsXG5cdFx0XHRcdGRlZ0JlZ2luOiB0aGlzLmdldERlZ3JlZXNCZWdpbkZvclRpdGxlc0J5SWQoZWxlbWVudElkKSxcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhbGxHZW5kZXIubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBnZW5kZXJJZCA9IGFsbEdlbmRlcltpXVxuXHRcdFx0dmFyIGdlbmRlclRpdGxlID0gZ2VuZGVyVGV4dHNbZ2VuZGVySWRdLnRvVXBwZXJDYXNlKClcblx0XHRcdHZhciB0eHQgPSBuZXcgUElYSS5UZXh0KGdlbmRlclRpdGxlLCB7IGZvbnQ6IGZvbnRTaXplICsgJ3B4IEZ1dHVyYUJvbGQnLCBmaWxsOiAnd2hpdGUnLCBhbGlnbjogJ2NlbnRlcicgfSlcblx0XHRcdHR4dC5hbmNob3IueCA9IDAuNVxuXHRcdFx0dHh0LmFuY2hvci55ID0gMC41XG5cdFx0XHR0aGlzLmdlbmRlckNvbnRhaW5lci5hZGRDaGlsZCh0eHQpXG5cdFx0XHR0aGlzLmdlbmRlcnMucHVzaCh7XG5cdFx0XHRcdHR4dDogdHh0LFxuXHRcdFx0XHRkZWdCZWdpbjogdGhpcy5nZXREZWdyZWVzQmVnaW5Gb3JHZW5kZXJCeUlkKGdlbmRlcklkKSxcblx0XHRcdH0pXG5cdFx0fVxuXHR9XG5cdGdldERlZ3JlZXNCZWdpbkZvclRpdGxlc0J5SWQoaWQpIHtcblx0XHQvLyBiZSBjYXJlZnVsIHN0YXJ0cyBmcm9tIGNlbnRlciAtOTBkZWdcblx0XHRzd2l0Y2goaWQpIHtcblx0XHRcdGNhc2UgJ2ZpcmUnOiByZXR1cm4gLTEzMFxuXHRcdFx0Y2FzZSAnZWFydGgnOiByZXR1cm4gLTUwXG5cdFx0XHRjYXNlICdtZXRhbCc6IHJldHVybiAxNVxuXHRcdFx0Y2FzZSAnd2F0ZXInOiByZXR1cm4gOTBcblx0XHRcdGNhc2UgJ3dvb2QnOiByZXR1cm4gMTY1XG5cdFx0fVxuXHR9XG5cdGdldERlZ3JlZXNCZWdpbkZvckdlbmRlckJ5SWQoaWQpIHtcblx0XHQvLyBiZSBjYXJlZnVsIHN0YXJ0cyBmcm9tIGNlbnRlciAtOTBkZWdcblx0XHRzd2l0Y2goaWQpIHtcblx0XHRcdGNhc2UgJ21hbGUnOiByZXR1cm4gLTE1MFxuXHRcdFx0Y2FzZSAnZmVtYWxlJzogcmV0dXJuIC0zMFxuXHRcdFx0Y2FzZSAnYW5pbWFsJzogcmV0dXJuIDkwXG5cdFx0fVxuXHR9XG5cdGRyYXdSaW5ncygpIHtcblx0XHR2YXIgcmFkaXVzTWFyZ2luID0gdGhpcy5yYWRpdXMgLyB0aGlzLmNpcmNsZXMubGVuZ3RoXG5cdFx0dmFyIGxlbiA9IHRoaXMuY2lyY2xlcy5sZW5ndGggKyAxXG5cdFx0dmFyIGxhc3RSO1xuXHRcdHZhciBsaW5lVyA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0dmFyIGNvbG9yID0gMHhmZmZmZmZcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHR2YXIgZyA9IHRoaXMuY2lyY2xlc1tpLTFdXG5cdFx0XHR2YXIgcjtcblxuXHRcdFx0Zy5jbGVhcigpXG5cblx0XHRcdC8vIHJhZGl1cyBkaWZmZXJlbmNlc1xuXHRcdFx0aWYoaSA9PSAxKSByID0gcmFkaXVzTWFyZ2luICogMC4xOFxuXHRcdFx0ZWxzZSBpZihpID09IDQpIHIgPSAobGFzdFIgKyByYWRpdXNNYXJnaW4pICogMS4xNlxuXHRcdFx0ZWxzZSByID0gbGFzdFIgKyByYWRpdXNNYXJnaW5cblxuXHRcdFx0Ly8gbGluZXNcblx0XHRcdGlmKGk9PTMpIHtcblx0XHRcdFx0dGhpcy5kcmF3QXJvdW5kVGhyZWVHcm91cExpbmVzKGxhc3RSLCByLCBnLCBsaW5lVywgY29sb3IpXG5cdFx0XHRcdHRoaXMuZHJhd0dlbmRlcnMociwgY29sb3IpXG5cdFx0XHR9XG5cdFx0XHRpZihpPT02KSB7XG5cdFx0XHRcdHRoaXMuZHJhd0Fyb3VuZEZvdXJHcm91cExpbmVzKGxhc3RSLCByLCBnLCBsaW5lVywgY29sb3IpXG5cdFx0XHRcdHRoaXMuZHJhd1RpdGxlcyhyLCBjb2xvcilcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2lyY2xlXG5cdFx0XHR0aGlzLmRyYXdDaXJjbGUoZywgcilcblxuXHRcdFx0bGFzdFIgPSByXG5cdFx0fVxuXHR9XG5cdGRyYXdBcm91bmRUaHJlZUdyb3VwTGluZXMobGFzdFIsIG5ld1IsIGcsIGxpbmVXLCBjb2xvcikge1xuXHRcdHZhciBsZWZ0VGhldGEgPSAoNyAqIE1hdGguUEkpIC8gNlxuXHRcdHZhciByaWdodFRoZXRhID0gKDExICogTWF0aC5QSSkgLyA2XG5cdFx0XG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIDAsIC1uZXdSLCAwLCAtbGFzdFIpXG5cdFx0XG5cdFx0dmFyIGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRUaGV0YSlcblx0XHR2YXIgZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRUaGV0YSlcblx0XHR2YXIgdG9YID0gbGFzdFIgKiBNYXRoLmNvcyhsZWZ0VGhldGEpXG5cdFx0dmFyIHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0VGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0VGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodFRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0VGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cdH1cblx0ZHJhd0Fyb3VuZEZvdXJHcm91cExpbmVzKGxhc3RSLCBuZXdSLCBnLCBsaW5lVywgY29sb3IpIHtcblx0XHR2YXIgbGVmdFRvcFRoZXRhID0gKDExICogTWF0aC5QSSkgLyAxMlxuXHRcdHZhciByaWdodFRvcFRoZXRhID0gTWF0aC5QSSAvIDEyXG5cblx0XHR2YXIgbGVmdEJvdHRvbVRoZXRhID0gKDUgKiBNYXRoLlBJKSAvIDRcblx0XHR2YXIgcmlnaHRCb3R0b21UaGV0YSA9ICg3ICogTWF0aC5QSSkgLyA0XG5cdFx0XG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIDAsIC1uZXdSLCAwLCAtbGFzdFIpXG5cdFx0XG5cdFx0dmFyIGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgdG9YID0gbGFzdFIgKiBNYXRoLmNvcyhsZWZ0VG9wVGhldGEpXG5cdFx0dmFyIHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRUb3BUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0VG9wVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0VG9wVGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodFRvcFRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0VG9wVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhsZWZ0Qm90dG9tVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0b1ggPSBsYXN0UiAqIE1hdGguY29zKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihsZWZ0Qm90dG9tVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhyaWdodEJvdHRvbVRoZXRhKVxuXHRcdGZyb21ZID0gLW5ld1IgKiBNYXRoLnNpbihyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRvWCA9IGxhc3RSICogTWF0aC5jb3MocmlnaHRCb3R0b21UaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXHR9XG5cdGRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSkge1xuXHRcdGcubGluZVN0eWxlKGxpbmVXLCBjb2xvciwgMSlcblx0XHRnLmJlZ2luRmlsbChjb2xvciwgMClcblx0XHRnLm1vdmVUbyhmcm9tWCwgZnJvbVkpXG5cdFx0Zy5saW5lVG8odG9YLCB0b1kpXG5cdFx0Zy5lbmRGaWxsKClcblx0fVxuXHRkcmF3Q2lyY2xlKGcsIHIpIHtcblx0XHRnLmxpbmVTdHlsZShBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKSwgMHhmZmZmZmYsIDEpXG5cdFx0Zy5iZWdpbkZpbGwoMHhmZmZmZmYsIDApXG5cdFx0XG5cdFx0Zy5tb3ZlVG8ociwgMClcblxuXHRcdHZhciBhbmdsZSA9IDBcblx0XHR2YXIgeCA9IDBcblx0XHR2YXIgeSA9IDBcblx0XHR2YXIgZ2FwID0gTWF0aC5taW4oKDMwMCAvIHRoaXMucmFkaXVzKSAqIDUsIDEwKVxuXHRcdHZhciBzdGVwcyA9IE1hdGgucm91bmQoMzYwIC8gZ2FwKVxuXHRcdGZvciAodmFyIGkgPSAtMTsgaSA8IHN0ZXBzOyBpKyspIHtcblx0XHRcdGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucyhpICogZ2FwKVxuXHRcdFx0eCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHRcdHkgPSByICogTWF0aC5zaW4oYW5nbGUpXG5cdFx0XHRnLmxpbmVUbyh4LCB5KVxuXHRcdH07XG5cblx0XHQvLyBjbG9zZSBpdFxuXHRcdGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucygzNjApXG5cdFx0eCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHR5ID0gciAqIE1hdGguc2luKGFuZ2xlKVxuXHRcdGcubGluZVRvKHgsIHkpXG5cblx0XHRnLmVuZEZpbGwoKVxuXHR9XG5cdGRyYXdUaXRsZXMociwgY29sb3IpIHtcblx0XHR2YXIgdGl0bGVzID0gdGhpcy50aXRsZXNcblx0XHR2YXIgb2Zmc2V0ID0gKHRoaXMucmFkaXVzIC8gMjcwKSAqIDQ0XG5cdFx0dmFyIHNjYWxlID0gKHRoaXMucmFkaXVzIC8gMjcwKSAqIDFcblx0XHR2YXIgciA9IHIgKyBvZmZzZXRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRpdGxlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHRpdGxlID0gdGl0bGVzW2ldXG5cdFx0XHR2YXIgYW5nbGUgPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKHRpdGxlLmRlZ0JlZ2luKVxuXHRcdFx0dGl0bGUudHh0LnJvdGF0aW9uID0gYW5nbGUgKyBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKDkwKVxuXHRcdFx0dGl0bGUudHh0LnggPSByICogTWF0aC5jb3MoYW5nbGUpXG5cdFx0XHR0aXRsZS50eHQueSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRcdHRpdGxlLnR4dC5zY2FsZS54ID0gc2NhbGVcblx0XHRcdHRpdGxlLnR4dC5zY2FsZS55ID0gc2NhbGVcblx0XHR9XG5cdH1cblx0ZHJhd0dlbmRlcnMociwgY29sb3IpIHtcblx0XHR2YXIgZ2VuZGVycyA9IHRoaXMuZ2VuZGVyc1xuXHRcdHZhciBvZmZzZXQgPSAodGhpcy5yYWRpdXMgLyAyNzApICogMzRcblx0XHR2YXIgc2NhbGUgPSAodGhpcy5yYWRpdXMgLyAyNzApICogMVxuXHRcdHZhciByID0gciArIG9mZnNldFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZGVycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGdlbmRlciA9IGdlbmRlcnNbaV1cblx0XHRcdHZhciBhbmdsZSA9IFV0aWxzLkRlZ3JlZXNUb1JhZGlhbnMoZ2VuZGVyLmRlZ0JlZ2luKVxuXHRcdFx0Z2VuZGVyLnR4dC5yb3RhdGlvbiA9IGFuZ2xlICsgVXRpbHMuRGVncmVlc1RvUmFkaWFucyg5MClcblx0XHRcdGdlbmRlci50eHQueCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHRcdGdlbmRlci50eHQueSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRcdGdlbmRlci50eHQuc2NhbGUueCA9IHNjYWxlXG5cdFx0XHRnZW5kZXIudHh0LnNjYWxlLnkgPSBzY2FsZVxuXHRcdH1cblx0fVxuXHRyZXNpemUocmFkaXVzKSB7XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmFkaXVzID0gcmFkaXVzXG5cdFx0dGhpcy5kcmF3UmluZ3MoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMucmluZ3NDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdHRoaXMudGl0bGVzQ29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHR0aGlzLmdlbmRlckNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnJpbmdzQ29udGFpbmVyKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy50aXRsZXNDb250YWluZXIpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLmdlbmRlckNvbnRhaW5lcilcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3MgZnJvbSAnQ29tcGFzcydcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFNtYWxsQ29tcGFzcyBmcm9tICdTbWFsbENvbXBhc3MnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbXBhc3Nlc0NvbnRhaW5lciB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCBwYXJlbnRFbCkge1xuXHRcdHRoaXMucGFyZW50RWwgPSBwYXJlbnRFbFxuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuY29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKVxuXG5cdFx0dGhpcy5jb21wYXNzZXMgPSBbXVxuXG5cdFx0dmFyIG1haW5Db21wYXNzID0gbmV3IENvbXBhc3ModGhpcy5jb250YWluZXIsIEFwcENvbnN0YW50cy5FWFBFUklFTkNFKVxuXHRcdG1haW5Db21wYXNzLmtub3RSYWRpdXMgPSBBcHBDb25zdGFudHMuU01BTExfS05PVF9SQURJVVNcblx0XHRtYWluQ29tcGFzcy5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHR2YXIgcGxhbmV0cyA9IEFwcFN0b3JlLnBsYW5ldHMoKVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHBsYW5ldCA9IHBsYW5ldHNbaV1cblx0XHRcdGlmKHBsYW5ldCA9PSB0aGlzLmlkKSB7XG5cdFx0XHRcdHRoaXMuY29tcGFzc2VzW2ldID0gbWFpbkNvbXBhc3Ncblx0XHRcdFx0dGhpcy5jb21wYXNzZXNbaV0uaWQgPSBwbGFuZXRcblx0XHRcdFx0dGhpcy5jb21wYXNzZXNbaV0uc3RhdGUgPSBBcHBDb25zdGFudHMuT1BFTlxuXHRcdFx0XHR0aGlzLm9wZW5lZENvbXBhc3NJbmRleCA9IGlcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR2YXIgc21hbGxDb21wYXNzID0gbmV3IFNtYWxsQ29tcGFzcyh0aGlzLmNvbnRhaW5lciwgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UpXG5cdFx0XHRcdHZhciBwbGFuZXREYXRhID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZChwbGFuZXQpXG5cdFx0XHRcdHNtYWxsQ29tcGFzcy5zdGF0ZSA9IEFwcENvbnN0YW50cy5DTE9TRVxuXHRcdFx0XHRzbWFsbENvbXBhc3MuaWQgPSBwbGFuZXRcblx0XHRcdFx0c21hbGxDb21wYXNzLmNvbXBvbmVudERpZE1vdW50KHBsYW5ldERhdGEsIHBsYW5ldCwgdGhpcy5wYXJlbnRFbClcblx0XHRcdFx0dGhpcy5jb21wYXNzZXNbaV0gPSBzbWFsbENvbXBhc3Ncblx0XHRcdH1cblx0XHR9XG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0dmFyIHBsYW5ldERhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHRoaXMuaWQpXG5cdFx0dGhpcy5jb21wYXNzZXNbdGhpcy5vcGVuZWRDb21wYXNzSW5kZXhdLnVwZGF0ZURhdGEocGxhbmV0RGF0YSlcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0XHR9O1xuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLndpbGxUcmFuc2l0aW9uT3V0KClcblx0XHR9O1x0XG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLnVwZGF0ZSgpXG5cdFx0fTtcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHZhciBjb21wYXNzZXMgPSB0aGlzLmNvbXBhc3Nlc1xuXHRcdHZhciB0b3RhbFcgPSAwXG5cdFx0dmFyIGJpZ2dlc3RSYWRpdXMgPSAwXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjb21wYXNzID0gY29tcGFzc2VzW2ldXG5cdFx0XHR2YXIgc2l6ZSA9IChjb21wYXNzLnJhZGl1cyA8PCAxKVxuXHRcdFx0dmFyIHByZXZpb3VzQ21wID0gY29tcGFzc2VzW2ktMV1cblx0XHRcdHZhciBuZXh0Q21wID0gY29tcGFzc2VzW2krMV1cblx0XHRcdHZhciBjeCA9IHRvdGFsVyArIHRoaXMuZ2V0Q29tcGFzc01hcmdpbihjb21wYXNzKVxuXHRcdFx0Y29tcGFzcy5yZXNpemUoKVxuXHRcdFx0YmlnZ2VzdFJhZGl1cyA9IGJpZ2dlc3RSYWRpdXMgPCBjb21wYXNzLnJhZGl1cyA/IGNvbXBhc3MucmFkaXVzIDogYmlnZ2VzdFJhZGl1c1xuXHRcdFx0Y29tcGFzcy5wb3NpdGlvbihjeCwgMClcblx0XHRcdGNvbXBhc3MucG9zWCA9IGN4XG5cdFx0XHR0b3RhbFcgPSBjeCArIHRoaXMuZ2V0Q29tcGFzc01hcmdpbihjb21wYXNzKVxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDA7IGkgPCBjb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjb21wYXNzID0gY29tcGFzc2VzW2ldXG5cdFx0XHRjb21wYXNzLnBvc2l0aW9uRWxlbWVudChjb21wYXNzLnBvc1ggKyAod2luZG93VyA+PiAxKSAtICh0b3RhbFc+PjEpLCAod2luZG93SCkgLSBiaWdnZXN0UmFkaXVzIC0gKHdpbmRvd0ggKiAwLjEpKVxuXHRcdH1cblxuXHRcdHRoaXMuY29udGFpbmVyLnBvc2l0aW9uLnggPSAod2luZG93VyA+PiAxKSAtICh0b3RhbFcgPj4gMSlcblx0XHR0aGlzLmNvbnRhaW5lci5wb3NpdGlvbi55ID0gKHdpbmRvd0gpIC0gYmlnZ2VzdFJhZGl1cyAtICh3aW5kb3dIICogMC4xKVxuXHR9XG5cdGdldENvbXBhc3NNYXJnaW4oY29tcGFzcykge1xuXHRcdHJldHVybiAoY29tcGFzcy5zdGF0ZSA9PSBBcHBDb25zdGFudHMuT1BFTikgPyAxNjAgOiAxMDBcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29tcGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc1tpXS5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0fVxuXHRcdHRoaXMuY29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMuY29udGFpbmVyKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJ0Zyb250Q29udGFpbmVyX2hicydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5jbGFzcyBGcm9udENvbnRhaW5lciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0cmVuZGVyKHBhcmVudCkge1xuXHRcdHZhciBzY29wZSA9IHt9XG5cdFx0dmFyIGdlbmVyYUluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zKClcblx0XHRzY29wZS5pbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0c2NvcGUuZmFjZWJvb2tVcmwgPSBnZW5lcmFJbmZvc1snZmFjZWJvb2tfdXJsJ11cblx0XHRzY29wZS50d2l0dGVyVXJsID0gZ2VuZXJhSW5mb3NbJ3R3aXR0ZXJfdXJsJ11cblx0XHRzY29wZS5pbnN0YWdyYW1VcmwgPSBnZW5lcmFJbmZvc1snaW5zdGFncmFtX3VybCddXG5cblx0XHR2YXIgY291bnRyaWVzID0gQXBwU3RvcmUuY291bnRyaWVzKClcblx0XHR2YXIgbGFuZyA9IEFwcFN0b3JlLmxhbmcoKVxuXHRcdHZhciBjdXJyZW50TGFuZztcblx0XHR2YXIgcmVzdENvdW50cmllcyA9IFtdXG5cdFx0dmFyIGZ1bGxuYW1lQ291bnRyaWVzID0gc2NvcGUuaW5mb3MuY291bnRyaWVzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudHJpZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjb3VudHJ5ID0gY291bnRyaWVzW2ldXG5cdFx0XHRpZihjb3VudHJ5LmxhbmcgPT0gbGFuZykge1xuXHRcdFx0XHRjdXJyZW50TGFuZyA9IGZ1bGxuYW1lQ291bnRyaWVzW2NvdW50cnkuaWRdXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0Y291bnRyeS5uYW1lID0gZnVsbG5hbWVDb3VudHJpZXNbY291bnRyeS5pZF1cblx0XHRcdFx0cmVzdENvdW50cmllcy5wdXNoKGNvdW50cnkpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHNjb3BlLmNvdW50cmllcyA9IHJlc3RDb3VudHJpZXNcblx0XHRzY29wZS5jdXJyZW50X2xhbmcgPSBjdXJyZW50TGFuZ1xuXG5cdFx0c3VwZXIucmVuZGVyKCdGcm9udENvbnRhaW5lcicsIHBhcmVudCwgdGVtcGxhdGUsIHNjb3BlKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0XHR0aGlzLiRzb2NpYWxXcmFwcGVyID0gdGhpcy5jaGlsZC5maW5kKCcjc29jaWFsLXdyYXBwZXInKVxuXHRcdHRoaXMuJGxlZ2FsID0gdGhpcy5jaGlsZC5maW5kKCcubGVnYWwnKVxuXHRcdHRoaXMuJGNhbXBlckxhYiA9IHRoaXMuY2hpbGQuZmluZCgnLmNhbXBlci1sYWInKVxuXHRcdHRoaXMuJHNob3AgPSB0aGlzLmNoaWxkLmZpbmQoJy5zaG9wLXdyYXBwZXInKVxuXHRcdHRoaXMuJGxhbmcgPSB0aGlzLmNoaWxkLmZpbmQoXCIubGFuZy13cmFwcGVyXCIpXG5cdFx0dGhpcy4kbGFuZ0N1cnJlbnRUaXRsZSA9IHRoaXMuJGxhbmcuZmluZChcIi5jdXJyZW50LWxhbmdcIilcblx0XHR0aGlzLiRjb3VudHJpZXMgPSB0aGlzLiRsYW5nLmZpbmQoXCIuY291bnRyaWVzLXdyYXBwZXJcIilcblx0XHR0aGlzLmNvdW50cmllc0ggPSAwXG5cblx0XHR0aGlzLm9uTGFuZ01vdXNlRW50ZXIgPSB0aGlzLm9uTGFuZ01vdXNlRW50ZXIuYmluZCh0aGlzKVxuXHRcdHRoaXMub25MYW5nTW91c2VMZWF2ZSA9IHRoaXMub25MYW5nTW91c2VMZWF2ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy4kbGFuZy5vbignbW91c2VlbnRlcicsIHRoaXMub25MYW5nTW91c2VFbnRlcilcblx0XHR0aGlzLiRsYW5nLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5vbkxhbmdNb3VzZUxlYXZlKVxuXG5cdFx0dGhpcy5yZXNpemUoKVxuXHRcdHRoaXMuJGxhbmcuY3NzKCdoZWlnaHQnLCB0aGlzLmNvdW50cmllc1RpdGxlSClcblx0fVxuXHRvbkxhbmdNb3VzZUVudGVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLiRsYW5nLmFkZENsYXNzKCdob3ZlcmVkJylcblx0XHR0aGlzLiRsYW5nLmNzcygnaGVpZ2h0JywgdGhpcy5jb3VudHJpZXNIICsgdGhpcy5jb3VudHJpZXNUaXRsZUgpXG5cdH1cblx0b25MYW5nTW91c2VMZWF2ZShlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy4kbGFuZy5yZW1vdmVDbGFzcygnaG92ZXJlZCcpXG5cdFx0dGhpcy4kbGFuZy5jc3MoJ2hlaWdodCcsIHRoaXMuY291bnRyaWVzVGl0bGVIKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRpZighdGhpcy5kb21Jc1JlYWR5KSByZXR1cm5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGhpcy5jb3VudHJpZXNIID0gdGhpcy4kY291bnRyaWVzLmhlaWdodCgpICsgMjBcblx0XHR0aGlzLmNvdW50cmllc1RpdGxlSCA9IHRoaXMuJGxhbmdDdXJyZW50VGl0bGUuaGVpZ2h0KClcblxuXHRcdHZhciBzb2NpYWxDc3MgPSB7XG5cdFx0XHRsZWZ0OiB3aW5kb3dXIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kc29jaWFsV3JhcHBlci53aWR0aCgpLFxuXHRcdFx0dG9wOiB3aW5kb3dIIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kc29jaWFsV3JhcHBlci5oZWlnaHQoKSxcblx0XHR9XG5cdFx0dmFyIGxlZ2FsQ3NzID0ge1xuXHRcdFx0bGVmdDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdFx0dG9wOiB3aW5kb3dIIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kbGVnYWwuaGVpZ2h0KCksXHRcblx0XHR9XG5cdFx0dmFyIGNhbXBlckxhYkNzcyA9IHtcblx0XHRcdGxlZnQ6IHdpbmRvd1cgLSBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgLSB0aGlzLiRjYW1wZXJMYWIud2lkdGgoKSxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdH1cblx0XHR2YXIgc2hvcENzcyA9IHtcblx0XHRcdGxlZnQ6IGNhbXBlckxhYkNzcy5sZWZ0IC0gdGhpcy4kc2hvcC53aWR0aCgpIC0gKEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCA8PCAxKSxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gMixcblx0XHR9XG5cdFx0dmFyIGxhbmdDc3MgPSB7XG5cdFx0XHRsZWZ0OiBzaG9wQ3NzLmxlZnQgLSB0aGlzLiRsYW5nQ3VycmVudFRpdGxlLndpZHRoKCkgLSAoQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIDw8IDEpLFxuXHRcdFx0dG9wOiBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQsXG5cdFx0fVxuXG5cdFx0dGhpcy4kc29jaWFsV3JhcHBlci5jc3Moc29jaWFsQ3NzKVxuXHRcdHRoaXMuJGxlZ2FsLmNzcyhsZWdhbENzcylcblx0XHR0aGlzLiRjYW1wZXJMYWIuY3NzKGNhbXBlckxhYkNzcylcblx0XHR0aGlzLiRzaG9wLmNzcyhzaG9wQ3NzKVxuXHRcdHRoaXMuJGxhbmcuY3NzKGxhbmdDc3MpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZyb250Q29udGFpbmVyXG5cblxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBLbm90IHtcblx0Y29uc3RydWN0b3Ioc3ByaW5nQ29udGFpbmVyLCByLCBjb2xvcikge1xuXHRcdHRoaXMucmFkaXVzID0gciB8fCA4XG5cdFx0dGhpcy5jb2xvciA9IGNvbG9yIHx8IDB4ZmZmZmZmXG5cdFx0dGhpcy5zcHJpbmdDb250YWluZXIgPSBzcHJpbmdDb250YWluZXJcblx0XHR0aGlzLnZ4ID0gMFxuXHRcdHRoaXMudnkgPSAwXG5cdFx0dGhpcy54ID0gMFxuXHRcdHRoaXMueSA9IDBcblx0XHR0aGlzLnRvWCA9IDBcblx0XHR0aGlzLnRvWSA9IDBcblx0XHR0aGlzLmZyb21YID0gMFxuXHRcdHRoaXMuZnJvbVkgPSAwXG5cdFx0dGhpcy5zY2FsZVggPSAxXG5cdFx0dGhpcy5zY2FsZVkgPSAxXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5nID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMuc3ByaW5nQ29udGFpbmVyLmFkZENoaWxkKHRoaXMuZylcblx0XHR0aGlzLmRyYXcoKVxuXHRcdHJldHVybiB0aGlzXG5cdH1cblx0Y2hhbmdlU2l6ZShyYWRpdXMpIHtcblx0XHR0aGlzLnJhZGl1cyA9IHJhZGl1cyB8fCA4XG5cdFx0dGhpcy5kcmF3KClcblx0fVxuXHRkcmF3KCkge1xuXHRcdHRoaXMuZy5jbGVhcigpXG5cdFx0dGhpcy5nLmxpbmVTdHlsZShBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKSwgdGhpcy5jb2xvciwgMSk7XG5cdFx0dGhpcy5nLmJlZ2luRmlsbCh0aGlzLmNvbG9yLCAxKTtcblx0XHR0aGlzLmcuZHJhd0NpcmNsZSgwLCAwLCB0aGlzLnJhZGl1cyk7XG5cdFx0dGhpcy5nLmVuZEZpbGwoKVx0XG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMuZy54ID0geFxuXHRcdHRoaXMuZy55ID0geVxuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0c2NhbGUoeCwgeSkge1xuXHRcdHRoaXMuZy5zY2FsZS54ID0geFxuXHRcdHRoaXMuZy5zY2FsZS55ID0geVxuXHRcdHRoaXMuc2NhbGVYID0geFxuXHRcdHRoaXMuc2NhbGVZID0geVxuXHR9XG5cdHZlbG9jaXR5KHgsIHkpIHtcblx0XHR0aGlzLnZ4ID0geFxuXHRcdHRoaXMudnkgPSB5XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5nLmNsZWFyKClcblx0XHR0aGlzLmcgPSBudWxsXG5cdH1cbn1cbiIsImltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IFZlYzIgZnJvbSAnVmVjMidcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBCZXppZXJFYXNpbmcgZnJvbSAnYmV6aWVyLWVhc2luZydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGFuZGluZ1NsaWRlc2hvdyB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCBwYXJlbnRFbCkge1xuXHRcdHRoaXMucGFyZW50RWwgPSBwYXJlbnRFbFxuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHRcdHRoaXMuY3VycmVudElkID0gJ2FsYXNrYSdcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR2YXIgaW5mb3MgPSBBcHBTdG9yZS5nZW5lcmFsSW5mb3NMYW5nU2NvcGUoKVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0XHQvLyB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdCBcdHRoaXMuc2xpZGVzaG93V3JhcHBlciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdCBcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5zbGlkZXNob3dDb250YWluZXIpXG5cdCBcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuc2xpZGVzaG93V3JhcHBlcilcblx0IFx0dGhpcy5jb3VudGVyID0gMFxuXHQgXHR0aGlzLnBsYW5ldFRpdGxlVHh0ID0gaW5mb3MucGxhbmV0LnRvVXBwZXJDYXNlKClcblxuXHRcdHZhciBzbGlkZXNob3dUaXRsZSA9IHRoaXMucGFyZW50RWwuZmluZCgnLnNsaWRlc2hvdy10aXRsZScpXG5cdFx0dmFyIHBsYW5ldFRpdGxlID0gc2xpZGVzaG93VGl0bGUuZmluZCgnLnBsYW5ldC10aXRsZScpXG5cdFx0dmFyIHBsYW5ldE5hbWUgPSBzbGlkZXNob3dUaXRsZS5maW5kKCcucGxhbmV0LW5hbWUnKVxuXHQgXHR0aGlzLnRpdGxlQ29udGFpbmVyID0ge1xuXHQgXHRcdHBhcmVudDogc2xpZGVzaG93VGl0bGUsXG5cdCBcdFx0cGxhbmV0VGl0bGU6IHBsYW5ldFRpdGxlLFxuXHQgXHRcdHBsYW5ldE5hbWU6IHBsYW5ldE5hbWVcblx0IFx0fVxuXHQgXHRcblx0IFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0IFx0dGhpcy5zbGlkZXMgPSBbXVxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHBsYW5ldHMubGVuZ3RoOyBpKyspIHtcblx0IFx0XHR2YXIgcyA9IHt9XG5cdCBcdFx0dmFyIGlkID0gcGxhbmV0c1tpXVxuXHQgXHRcdHZhciB3cmFwcGVyQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0XHR2YXIgbWFza1JlY3QgPSB7XG5cdCBcdFx0XHRnOiBBcHBTdG9yZS5nZXRHcmFwaGljcygpLFxuXHQgXHRcdFx0bmV3VzogMCxcblx0IFx0XHRcdHdpZHRoOiAwLFxuXHQgXHRcdFx0eDogMFxuXHQgXHRcdH1cblx0IFx0XHR2YXIgaW1nVXJsID0gQXBwU3RvcmUubWFpbkltYWdlVXJsKGlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0IFx0XHR2YXIgdGV4dHVyZSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1nVXJsKVxuXHQgXHRcdHZhciBzcHJpdGUgPSBBcHBTdG9yZS5nZXRTcHJpdGUoKVxuXHQgXHRcdHNwcml0ZS50ZXh0dXJlID0gdGV4dHVyZVxuXHQgXHRcdHNwcml0ZS5wYXJhbXMgPSB7fVxuXHQgXHRcdHRoaXMuc2xpZGVzaG93V3JhcHBlci5hZGRDaGlsZCh3cmFwcGVyQ29udGFpbmVyKVxuXHQgXHRcdHdyYXBwZXJDb250YWluZXIuYWRkQ2hpbGQoc3ByaXRlKVxuXHQgXHRcdHdyYXBwZXJDb250YWluZXIuYWRkQ2hpbGQobWFza1JlY3QuZylcblx0IFx0XHRzcHJpdGUubWFzayA9IG1hc2tSZWN0Lmdcblx0IFx0XHRzLm9sZFBvc2l0aW9uID0gbmV3IFZlYzIoMCwgMClcblx0IFx0XHRzLm5ld1Bvc2l0aW9uID0gbmV3IFZlYzIoMCwgMClcblx0IFx0XHRzLndyYXBwZXJDb250YWluZXIgPSB3cmFwcGVyQ29udGFpbmVyXG5cdCBcdFx0cy5zcHJpdGUgPSBzcHJpdGVcblx0IFx0XHRzLnRleHR1cmUgPSB0ZXh0dXJlXG5cdCBcdFx0cy5tYXNrUmVjdCA9IG1hc2tSZWN0XG5cdCBcdFx0cy5wbGFuZXROYW1lID0gaWQudG9VcHBlckNhc2UoKVxuXHQgXHRcdHMuaW1nUmVzcG9uc2l2ZVNpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VTaXplKEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHQgXHRcdHMuaW1nVXJsID0gaW1nVXJsXG5cdCBcdFx0cy5pZCA9IHBsYW5ldHNbaV1cblx0IFx0XHR0aGlzLnNsaWRlc1tpXSA9IHNcblx0IFx0fVxuXG5cdCBcdHRoaXMubWFza0Vhc2luZyA9IEJlemllckVhc2luZyguMjEsMS40NywuNTIsMSlcblx0IFx0dGhpcy5jaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KClcblx0fVxuXHR1cGRhdGVUaXRsZXModGl0bGUsIG5hbWUpIHtcblx0XHR2YXIgcGxhbmV0VGl0bGUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldFRpdGxlXG5cdFx0dmFyIHBsYW5ldE5hbWUgPSB0aGlzLnRpdGxlQ29udGFpbmVyLnBsYW5ldE5hbWVcblx0IFx0cGxhbmV0VGl0bGUudGV4dCh0aXRsZSlcblx0IFx0cGxhbmV0TmFtZS50ZXh0KG5hbWUpXG5cdCB9XG5cdGRyYXdDZW50ZXJlZE1hc2tSZWN0KGdyYXBoaWNzLCB4LCB5LCB3LCBoKSB7XG5cdFx0Z3JhcGhpY3MuY2xlYXIoKVxuXHRcdGdyYXBoaWNzLmJlZ2luRmlsbCgweGZmZmYwMCwgMSlcblx0XHRncmFwaGljcy5kcmF3UmVjdCh4LCB5LCB3LCBoKVxuXHRcdGdyYXBoaWNzLmVuZEZpbGwoKVxuXHR9XG5cdG5leHQoKSB7XG5cdFx0dmFyIGZpcnN0RWxlbWVudCA9IHRoaXMuc2xpZGVzLnNoaWZ0KClcblx0XHR0aGlzLnNsaWRlcy5wdXNoKGZpcnN0RWxlbWVudClcblx0XHR0aGlzLmVsZW1lbnRUaGF0TW92ZWRJblNsaWRlc0FycmF5ID0gZmlyc3RFbGVtZW50XG5cdFx0dGhpcy5jaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KClcblx0XHR0aGlzLmFwcGx5VmFsdWVzVG9TbGlkZXMoKVxuXHR9XG5cdHByZXZpb3VzKCkge1xuXHRcdHZhciBsYXN0RWxlbWVudCA9IHRoaXMuc2xpZGVzLnBvcCgpXG5cdFx0dGhpcy5zbGlkZXMudW5zaGlmdChsYXN0RWxlbWVudClcblx0XHR0aGlzLmVsZW1lbnRUaGF0TW92ZWRJblNsaWRlc0FycmF5ID0gbGFzdEVsZW1lbnRcblx0XHR0aGlzLmNob29zZVNsaWRlVG9IaWdobGlnaHQoKVxuXHRcdHRoaXMuYXBwbHlWYWx1ZXNUb1NsaWRlcygpXG5cdH1cblx0Y2hvb3NlU2xpZGVUb0hpZ2hsaWdodCgpIHtcblx0XHR2YXIgdG90YWxMZW4gPSB0aGlzLnNsaWRlcy5sZW5ndGgtMVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zbGlkZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzbGlkZSA9IHRoaXMuc2xpZGVzW2ldXG5cdFx0XHRpZihpID09IDIpIHtcblx0XHRcdFx0c2xpZGUuaGlnaGxpZ2h0ID0gdHJ1ZSAvLyBIaWdobGlnaHQgdGhlIG1pZGRsZSBlbGVtZW50c1xuXHRcdFx0XHR0aGlzLmN1cnJlbnRJZCA9IHNsaWRlLmlkXG5cdFx0XHRcdHRoaXMuc2xpZGVzaG93V3JhcHBlci5zZXRDaGlsZEluZGV4KHNsaWRlLndyYXBwZXJDb250YWluZXIsIHRvdGFsTGVuKVxuXHRcdFx0XHR0aGlzLnVwZGF0ZVRpdGxlcyh0aGlzLnBsYW5ldFRpdGxlVHh0LCBzbGlkZS5wbGFuZXROYW1lKVxuXHRcdFx0XHR0aGlzLnBvc2l0aW9uVGl0bGVzQ29udGFpbmVyKClcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRzbGlkZS5oaWdobGlnaHQgPSBmYWxzZVxuXHRcdFx0XHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIuc2V0Q2hpbGRJbmRleChzbGlkZS53cmFwcGVyQ29udGFpbmVyLCBpKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRhcHBseVJlc3BvbnNpdmVJbWdUb1NsaWRlRGVwZW5kc1dpbmRvdyhzbGlkZSkge1xuXHRcdHZhciBzID0gc2xpZGVcblx0XHR2YXIgaW1nVXJsID0gQXBwU3RvcmUubWFpbkltYWdlVXJsKHMuaWQsIEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHRcdGlmKHMuaW1nVXJsICE9IGltZ1VybCkge1xuXHRcdFx0cy5pbWdSZXNwb25zaXZlU2l6ZSA9IEFwcFN0b3JlLnJlc3BvbnNpdmVJbWFnZVNpemUoQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpXG5cdFx0XHRzLnRleHR1cmUuZGVzdHJveSh0cnVlKVxuXHRcdFx0cy50ZXh0dXJlID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZShpbWdVcmwpXG5cdFx0XHRzLnNwcml0ZS50ZXh0dXJlID0gcy50ZXh0dXJlXG5cdFx0XHRzLmltZ1VybCA9IGltZ1VybFxuXHRcdH1cblx0fVxuXHRyZXNpemVBbmRQb3NpdGlvbkltZ1Nwcml0ZShzbGlkZSwgbWFza1NsaWRlVywgd2luZG93Vywgd2luZG93SCkge1xuXHRcdHZhciBzID0gc2xpZGVcblx0XHR2YXIgcmVzaXplVmFycyA9IFV0aWxzLlJlc2l6ZVBvc2l0aW9uUHJvcG9ydGlvbmFsbHlXaXRoQW5jaG9yQ2VudGVyKG1hc2tTbGlkZVcsIHdpbmRvd0gsIHMuaW1nUmVzcG9uc2l2ZVNpemVbMF0sIHMuaW1nUmVzcG9uc2l2ZVNpemVbMV0pXG5cdFx0cy5zcHJpdGUuYW5jaG9yLnggPSAwLjVcblx0XHRzLnNwcml0ZS5hbmNob3IueSA9IDAuNVxuXHRcdHMuc3ByaXRlLnNjYWxlLnggPSByZXNpemVWYXJzLnNjYWxlXG5cdFx0cy5zcHJpdGUuc2NhbGUueSA9IHJlc2l6ZVZhcnMuc2NhbGVcblx0XHRzLnNwcml0ZS53aWR0aCA9IHJlc2l6ZVZhcnMud2lkdGhcblx0XHRzLnNwcml0ZS5oZWlnaHQgPSByZXNpemVWYXJzLmhlaWdodFxuXHRcdHMuc3ByaXRlLnggPSByZXNpemVWYXJzLmxlZnRcblx0XHRzLnNwcml0ZS55ID0gcmVzaXplVmFycy50b3Bcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dmFyIHNsaWRlcyA9IHRoaXMuc2xpZGVzXG5cdFx0dGhpcy5jb3VudGVyICs9IDAuMDEyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzbGlkZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzID0gc2xpZGVzW2ldXG5cdFx0XHRzLm1hc2tSZWN0LnZhbHVlU2NhbGUgKz0gKDAuNCAtIHMubWFza1JlY3QudmFsdWVTY2FsZSkgKiAwLjA1XG5cdFx0XHR2YXIgZWFzZSA9IHRoaXMubWFza0Vhc2luZy5nZXQocy5tYXNrUmVjdC52YWx1ZVNjYWxlKVxuXHRcdFx0cy53cmFwcGVyQ29udGFpbmVyLnggKz0gKHMubmV3UG9zaXRpb24ueCAtIHMud3JhcHBlckNvbnRhaW5lci54KSAqIGVhc2Vcblx0XHRcdHMubWFza1JlY3Qud2lkdGggPSBzLm1hc2tSZWN0Lm5ld1cgKiBlYXNlXG5cdFx0XHR2YXIgbWFza1JlY3RYID0gKDEgLSBlYXNlKSAqIHMubWFza1JlY3QubmV3WFxuXHRcdFx0dGhpcy5kcmF3Q2VudGVyZWRNYXNrUmVjdChzLm1hc2tSZWN0LmcsIG1hc2tSZWN0WCwgMCwgcy5tYXNrUmVjdC53aWR0aCwgcy5tYXNrUmVjdC5oZWlnaHQpXG5cdFx0XHRzLnNwcml0ZS5za2V3LnggPSBNYXRoLmNvcyh0aGlzLmNvdW50ZXIpICogMC4wMjBcblx0XHRcdHMuc3ByaXRlLnNrZXcueSA9IE1hdGguc2luKHRoaXMuY291bnRlcikgKiAwLjAyMFxuXHRcdH1cblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54ICs9ICh0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZVhZIC0gdGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueCkgKiAwLjA4XG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueSArPSAodGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGVYWSAtIHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLngpICogMC4wOFxuXHRcdC8vIHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnkgPSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5iYXNlWSArIE1hdGguc2luKHRoaXMuY291bnRlcikgKiA0XG5cdH1cblx0cG9zaXRpb25TbGlkZXNob3dDb250YWluZXIoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR2YXIgbGFzdFNsaWRlID0gdGhpcy5zbGlkZXNbdGhpcy5zbGlkZXMubGVuZ3RoLTFdXG5cdFx0dmFyIGNvbnRhaW5lclRvdGFsVyA9IGxhc3RTbGlkZS5uZXdQb3NpdGlvbi54ICsgbGFzdFNsaWRlLm1hc2tSZWN0Lm5ld1dcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5waXZvdC54ID0gY29udGFpbmVyVG90YWxXID4+IDFcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5waXZvdC55ID0gd2luZG93SCA+PiAxXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIueCA9ICh3aW5kb3dXID4+IDEpXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIueSA9ICh3aW5kb3dIID4+IDEpXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuYmFzZVkgPSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci55XG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueCA9IDEuM1xuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnkgPSAxLjNcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZVhZID0gMS4wNVxuXHR9XG5cdGFwcGx5VmFsdWVzVG9TbGlkZXMoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR2YXIgY3VycmVudFBvc1ggPSAwXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNsaWRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHMgPSB0aGlzLnNsaWRlc1tpXVxuXHRcdFx0dGhpcy5hcHBseVJlc3BvbnNpdmVJbWdUb1NsaWRlRGVwZW5kc1dpbmRvdyhzKVxuXHRcdFx0dmFyIGhpZ2h0bGlnaHRlZFNsaWRlVyA9IHdpbmRvd1cgKiAwLjdcblx0XHRcdHZhciBub3JtYWxTbGlkZVcgPSB3aW5kb3dXICogMC4xNVxuXHRcdFx0dmFyIHNsaWRlVyA9IDBcblx0XHRcdGlmKHMuaGlnaGxpZ2h0KSBzbGlkZVcgPSBoaWdodGxpZ2h0ZWRTbGlkZVdcblx0XHRcdGVsc2Ugc2xpZGVXID0gbm9ybWFsU2xpZGVXXG5cdFx0XHR0aGlzLnJlc2l6ZUFuZFBvc2l0aW9uSW1nU3ByaXRlKHMsIHNsaWRlVywgd2luZG93Vywgd2luZG93SClcblx0XHRcdHMubWFza1JlY3QubmV3VyA9IHNsaWRlV1xuXHRcdFx0cy5tYXNrUmVjdC5oZWlnaHQgPSB3aW5kb3dIXG5cdFx0XHRzLm1hc2tSZWN0Lm5ld1ggPSBzbGlkZVcgPj4gMVxuXHRcdFx0cy5tYXNrUmVjdC52YWx1ZVNjYWxlID0gMlxuXHRcdFx0cy5vbGRQb3NpdGlvbi54ID0gcy5uZXdQb3NpdGlvbi54XG5cdFx0XHRzLm5ld1Bvc2l0aW9uLnggPSBjdXJyZW50UG9zWFxuXHRcdFx0aWYodGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSAhPSB1bmRlZmluZWQgJiYgdGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheS5pZCA9PSBzLmlkKXtcblx0XHRcdFx0cy53cmFwcGVyQ29udGFpbmVyLnggPSBzLm5ld1Bvc2l0aW9uLnhcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRQb3NYICs9IHNsaWRlV1xuXHRcdH1cblx0XHR0aGlzLnBvc2l0aW9uU2xpZGVzaG93Q29udGFpbmVyKClcblx0fVxuXHRwb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdGNsZWFyVGltZW91dCh0aGlzLnRpdGxlVGltZW91dClcblx0XHR0aGlzLnRpdGxlVGltZW91dCA9IHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHZhciB0b3BPZmZzZXQgPSAod2luZG93SCA+PiAxKSArICh3aW5kb3dIICogQXBwQ29uc3RhbnRzLkNPTVBBU1NfU0laRV9QRVJDRU5UQUdFKSAtICh0aGlzLnRpdGxlQ29udGFpbmVyLnBhcmVudC5oZWlnaHQoKSA+PiAxKVxuXHRcdFx0dmFyIHRpdGxlc0NvbnRhaW5lckNzcyA9IHtcblx0XHRcdFx0dG9wOiB0b3BPZmZzZXQgKyAoKHdpbmRvd0ggLSB0b3BPZmZzZXQpID4+IDEpLFxuXHRcdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtICh0aGlzLnRpdGxlQ29udGFpbmVyLnBhcmVudC53aWR0aCgpID4+IDEpLFxuXHRcdFx0fVxuXHRcdFx0dGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQuY3NzKHRpdGxlc0NvbnRhaW5lckNzcylcblx0XHR9LCAwKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR0aGlzLmFwcGx5VmFsdWVzVG9TbGlkZXMoKVxuXHRcdHRoaXMucG9zaXRpb25UaXRsZXNDb250YWluZXIoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXG5cdFx0dmFyIHNsaWRlcyA9IHRoaXMuc2xpZGVzXG5cdCBcdGZvciAodmFyIGkgPSAwOyBpIDwgc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdCBcdFx0dmFyIHMgPSBzbGlkZXNbaV1cblxuXHQgXHRcdHMubWFza1JlY3QuZy5jbGVhcigpXG5cdCBcdFx0QXBwU3RvcmUucmVsZWFzZUdyYXBoaWNzKHMubWFza1JlY3QuZylcblxuXHQgXHRcdHMuc3ByaXRlLnRleHR1cmUuZGVzdHJveSh0cnVlKVxuXHQgXHRcdEFwcFN0b3JlLnJlbGVhc2VTcHJpdGUocy5zcHJpdGUpXG5cblx0IFx0XHRzLndyYXBwZXJDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHQgXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIocy53cmFwcGVyQ29udGFpbmVyKVxuXHQgXHR9XG5cblx0IFx0dGhpcy5zbGlkZXMubGVuZ3RoID0gMFxuXG5cdCBcdC8vIFRPRE8gY2xlYXIgdGhhdCBhbmQgcHV0IGl0IGJhY2sgdG8gcG9vbFxuXHQgLy8gXHRkZWxldGUgdGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGVYWVxuXHQgLy8gXHRkZWxldGUgdGhpcy5zbGlkZXNob3dDb250YWluZXIuYmFzZVlcblx0IC8vIFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueCA9IDFcblx0IC8vIFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueSA9IDFcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0Ly8gQXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnNsaWRlc2hvd0NvbnRhaW5lcilcblxuXHRcdHRoaXMuc2xpZGVzaG93V3JhcHBlci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnNsaWRlc2hvd1dyYXBwZXIpXG5cdFx0XG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUFhDb250YWluZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0fVxuXHRpbml0KGVsZW1lbnRJZCkge1xuXHRcdC8vIHRoaXMucmVuZGVyZXIgPSBuZXcgUElYSS5DYW52YXNSZW5kZXJlcig4MDAsIDYwMClcblx0XHR0aGlzLnJlbmRlcmVyID0gbmV3IFBJWEkuYXV0b0RldGVjdFJlbmRlcmVyKDgwMCwgNjAwLCB7IGFudGlhbGlhczogdHJ1ZSB9KVxuXG5cdFx0dmFyIGVsID0gJChlbGVtZW50SWQpXG5cdFx0JCh0aGlzLnJlbmRlcmVyLnZpZXcpLmF0dHIoJ2lkJywgJ3B4LWNvbnRhaW5lcicpXG5cdFx0ZWwuYXBwZW5kKHRoaXMucmVuZGVyZXIudmlldylcblxuXHRcdHRoaXMuc3RhZ2UgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHR9XG5cdGFkZChjaGlsZCkge1xuXHRcdHRoaXMuc3RhZ2UuYWRkQ2hpbGQoY2hpbGQpXG5cdH1cblx0cmVtb3ZlKGNoaWxkKSB7XG5cdFx0dGhpcy5zdGFnZS5yZW1vdmVDaGlsZChjaGlsZClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdCAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnN0YWdlKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmVuZGVyZXIucmVzaXplKHdpbmRvd1csIHdpbmRvd0gpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlUGFnZSBmcm9tICdCYXNlUGFnZSdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZSBleHRlbmRzIEJhc2VQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcylcblx0XHR0aGlzLnJlc2l6ZSA9IHRoaXMucmVzaXplLmJpbmQodGhpcylcblx0XHR0aGlzLnB4Q29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblxuXHRcdGlmKHRoaXMucHJvcHMudHlwZSA9PSBBcHBDb25zdGFudHMuTEFORElORykgdGhpcy5wYXJlbnQuY3NzKCdjdXJzb3InLCAncG9pbnRlcicpXG5cdFx0ZWxzZSB0aGlzLnBhcmVudC5jc3MoJ2N1cnNvcicsICdhdXRvJylcblxuXHRcdHNldFRpbWVvdXQoKCk9PntBcHBBY3Rpb25zLnB4QWRkQ2hpbGQodGhpcy5weENvbnRhaW5lcil9LCAwKVxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdFx0QXBwU3RvcmUub24oQXBwQ29uc3RhbnRzLldJTkRPV19SRVNJWkUsIHRoaXMucmVzaXplKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHNldFRpbWVvdXQoKCk9PntBcHBBY3Rpb25zLnB4UmVtb3ZlQ2hpbGQodGhpcy5weENvbnRhaW5lcil9LCAwKVxuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0c2V0dXBBbmltYXRpb25zKCkge1xuXHRcdHN1cGVyLnNldHVwQW5pbWF0aW9ucygpXG5cdH1cblx0Z2V0SW1hZ2VVcmxCeUlkKGlkKSB7XG5cdFx0cmV0dXJuIEFwcFN0b3JlLlByZWxvYWRlci5nZXRJbWFnZVVSTCh0aGlzLmlkICsgJy0nICsgdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLScgKyBpZClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnB4Q29udGFpbmVyKVxuXHRcdEFwcFN0b3JlLm9mZihBcHBDb25zdGFudHMuV0lORE9XX1JFU0laRSwgdGhpcy5yZXNpemUpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQmFzZVBhZ2VyIGZyb20gJ0Jhc2VQYWdlcidcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuaW1wb3J0IExhbmRpbmcgZnJvbSAnTGFuZGluZydcbmltcG9ydCBMYW5kaW5nVGVtcGxhdGUgZnJvbSAnTGFuZGluZ19oYnMnXG5pbXBvcnQgUGxhbmV0RXhwZXJpZW5jZVBhZ2UgZnJvbSAnUGxhbmV0RXhwZXJpZW5jZVBhZ2UnXG5pbXBvcnQgUGxhbmV0RXhwZXJpZW5jZVBhZ2VUZW1wbGF0ZSBmcm9tICdQbGFuZXRFeHBlcmllbmNlUGFnZV9oYnMnXG5pbXBvcnQgUGxhbmV0Q2FtcGFpZ25QYWdlIGZyb20gJ1BsYW5ldENhbXBhaWduUGFnZSdcbmltcG9ydCBQbGFuZXRDYW1wYWlnblBhZ2VUZW1wbGF0ZSBmcm9tICdQbGFuZXRDYW1wYWlnblBhZ2VfaGJzJ1xuXG5jbGFzcyBQYWdlc0NvbnRhaW5lciBleHRlbmRzIEJhc2VQYWdlciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0XHR0aGlzLnN3YWxsb3dIYXNoZXJDaGFuZ2UgPSBmYWxzZVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCwgdGhpcy5kaWRIYXNoZXJDaGFuZ2UpXG5cdFx0QXBwU3RvcmUub24oQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRSwgdGhpcy5kaWRIYXNoZXJJbnRlcm5hbENoYW5nZSlcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRBcHBTdG9yZS5vZmYoQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQsIHRoaXMuZGlkSGFzaGVyQ2hhbmdlKVxuXHRcdEFwcFN0b3JlLm9mZihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfSU5URVJOQUxfQ0hBTkdFLCB0aGlzLmRpZEhhc2hlckludGVybmFsQ2hhbmdlKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxuXHRkaWRIYXNoZXJJbnRlcm5hbENoYW5nZSgpIHtcblx0XHR0aGlzLmN1cnJlbnRDb21wb25lbnQuaW50ZXJuYWxIYXNoZXJDaGFuZ2VkKClcblx0fVxuXHRkaWRIYXNoZXJDaGFuZ2UoKSB7XG5cdFx0Ly8gU3dhbGxvdyBoYXNoZXIgY2hhbmdlIGlmIHRoZSBjaGFuZ2UgaXMgZmFzdCBhcyAxc2VjXG5cdFx0aWYodGhpcy5zd2FsbG93SGFzaGVyQ2hhbmdlKSByZXR1cm4gXG5cdFx0ZWxzZSB0aGlzLnNldHVwTmV3Ym9ybkNvbXBvbmVudHMoKVxuXHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IHRydWVcblx0XHR0aGlzLmhhc2hlckNoYW5nZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR0aGlzLnN3YWxsb3dIYXNoZXJDaGFuZ2UgPSBmYWxzZVxuXHRcdH0sIDEwMDApXG5cdH1cblx0c2V0dXBOZXdib3JuQ29tcG9uZW50cygpIHtcblx0XHR2YXIgaGFzaCA9IFJvdXRlci5nZXROZXdIYXNoKClcblx0XHR2YXIgdGVtcGxhdGUgPSB7IHR5cGU6IHVuZGVmaW5lZCwgcGFydGlhbDogdW5kZWZpbmVkIH1cblx0XHRzd2l0Y2goaGFzaC5wYXJ0cy5sZW5ndGgpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcGxhdGUudHlwZSA9IExhbmRpbmdcblx0XHRcdFx0dGVtcGxhdGUucGFydGlhbCA9IExhbmRpbmdUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gUGxhbmV0RXhwZXJpZW5jZVBhZ2Vcblx0XHRcdFx0dGVtcGxhdGUucGFydGlhbCA9IFBsYW5ldEV4cGVyaWVuY2VQYWdlVGVtcGxhdGVcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMzpcblx0XHRcdFx0dGVtcGxhdGUudHlwZSA9IFBsYW5ldENhbXBhaWduUGFnZVxuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gUGxhbmV0Q2FtcGFpZ25QYWdlVGVtcGxhdGVcblx0XHRcdFx0YnJlYWtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRlbXBsYXRlLnR5cGUgPSBMYW5kaW5nXG5cdFx0XHRcdHRlbXBsYXRlLnBhcnRpYWwgPSBMYW5kaW5nVGVtcGxhdGVcdFx0XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXR1cE5ld0NvbXBvbmVudChoYXNoLnBhcmVudCwgdGVtcGxhdGUpXG5cdFx0dGhpcy5jdXJyZW50Q29tcG9uZW50ID0gdGhpcy5jb21wb25lbnRzWyduZXctY29tcG9uZW50J11cblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0aWYodGhpcy5jdXJyZW50Q29tcG9uZW50ICE9IHVuZGVmaW5lZCkgdGhpcy5jdXJyZW50Q29tcG9uZW50LnVwZGF0ZSgpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUGFnZXNDb250YWluZXJcblxuXG5cbiIsImltcG9ydCBCYXNlUGxhbmV0UGFnZSBmcm9tICdCYXNlUGxhbmV0UGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbi8vIGltcG9ydCBDb21wYXNzIGZyb20gJ0NvbXBhc3MnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcnJvd0J0biBmcm9tICdBcnJvd0J0bidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxhbmV0Q2FtcGFpZ25QYWdlIGV4dGVuZHMgQmFzZVBsYW5ldFBhZ2Uge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHByb3BzLmRhdGFbJ2VtcHR5LWltYWdlJ10gPSBBcHBTdG9yZS5nZXRFbXB0eUltZ1VybCgpXG5cdFx0c3VwZXIocHJvcHMpXG5cdFx0dGhpcy5wcm9kdWN0SWQgPSB1bmRlZmluZWRcblx0XHR0aGlzLmZyb21JbnRlcm5hbENoYW5nZSA9IGZhbHNlXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggPSAwXG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTEVGVFxuXHRcdHRoaXMuY3VycmVudFByb2R1Y3RDb250YWluZXJDbGFzcyA9ICdwcm9kdWN0LWNvbnRhaW5lci1iJ1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuYW5pbWF0aW9ucyA9IHtcblx0XHRcdG9sZENvbnRhaW5lckFuaW1hdGlvbjogdW5kZWZpbmVkLFxuXHRcdFx0bmV3Q29udGFpbmVyQW5pbWF0aW9uOiB1bmRlZmluZWRcblx0XHR9XG5cblx0XHR2YXIgcHJvZHVjdENvbnRhaW5lcnNXcmFwcGVyID0gdGhpcy5jaGlsZC5maW5kKCcucHJvZHVjdC1jb250YWluZXJzLXdyYXBwZXInKVxuXHRcdHZhciBjb250YWluZXJBID0gcHJvZHVjdENvbnRhaW5lcnNXcmFwcGVyLmZpbmQoJy5wcm9kdWN0LWNvbnRhaW5lci1hJylcblx0XHR2YXIgY29udGFpbmVyQiA9IHByb2R1Y3RDb250YWluZXJzV3JhcHBlci5maW5kKCcucHJvZHVjdC1jb250YWluZXItYicpXG5cdFx0dGhpcy5jb250YWluZXJzID0ge1xuXHRcdFx0J3Byb2R1Y3QtY29udGFpbmVyLWEnOiB7XG5cdFx0XHRcdGVsOiBjb250YWluZXJBLFxuXHRcdFx0XHRwb3N0ZXJXcmFwcGVyOiBjb250YWluZXJBLmZpbmQoJy5wb3N0ZXItd3JhcHBlcicpLFxuXHRcdFx0XHRwb3N0ZXJJbWc6IGNvbnRhaW5lckEuZmluZCgnaW1nJyksXG5cdFx0XHRcdHZpZGVvV3JhcHBlcjogY29udGFpbmVyQS5maW5kKCcudmlkZW8td3JhcHBlcicpXG5cdFx0XHR9LFxuXHRcdFx0J3Byb2R1Y3QtY29udGFpbmVyLWInOiB7XG5cdFx0XHRcdGVsOiBjb250YWluZXJCLFxuXHRcdFx0XHRwb3N0ZXJXcmFwcGVyOiBjb250YWluZXJCLmZpbmQoJy5wb3N0ZXItd3JhcHBlcicpLFxuXHRcdFx0XHRwb3N0ZXJJbWc6IGNvbnRhaW5lckIuZmluZCgnaW1nJyksXG5cdFx0XHRcdHZpZGVvV3JhcHBlcjogY29udGFpbmVyQi5maW5kKCcudmlkZW8td3JhcHBlcicpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5wcmV2aW91c0J0biA9IG5ldyBBcnJvd0J0bih0aGlzLmNoaWxkLmZpbmQoJy5wcmV2aW91cy1idG4nKSwgQXBwQ29uc3RhbnRzLkxFRlQpXG5cdFx0dGhpcy5wcmV2aW91c0J0bi5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHQvLyB0aGlzLmNvbXBhc3MgPSBuZXcgQ29tcGFzcyh0aGlzLnB4Q29udGFpbmVyLCBBcHBDb25zdGFudHMuQ0FNUEFJR04pXG5cdFx0Ly8gdGhpcy5jb21wYXNzLmtub3RSYWRpdXMgPSBBcHBDb25zdGFudHMuU01BTExfS05PVF9SQURJVVNcblx0XHQvLyB0aGlzLmNvbXBhc3MuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5wcm9kdWN0cyA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQodGhpcy5pZClcblxuXHRcdHRoaXMuY2hlY2tDdXJyZW50UHJvZHVjdEJ5VXJsKClcblx0XHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIHRoaXMub25LZXlQcmVzc2VkKVxuXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdG9uS2V5UHJlc3NlZChlKSB7XG5cdFx0aWYodGhpcy5hbmltYXRpb25SdW5uaW5nKSByZXR1cm5cblx0ICAgIGUucHJldmVudERlZmF1bHQoKVxuXHRcdHN3aXRjaChlLndoaWNoKSB7XG5cdCAgICAgICAgY2FzZSAzNzogLy8gbGVmdFxuXHQgICAgICAgIFx0dGhpcy5wcmV2aW91cygpXG5cdCAgICAgICAgXHR0aGlzLnVwZGF0ZUhhc2hlcigpXG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgICAgY2FzZSAzOTogLy8gcmlnaHRcblx0ICAgICAgICBcdHRoaXMubmV4dCgpXG5cdCAgICAgICAgXHR0aGlzLnVwZGF0ZUhhc2hlcigpXG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuXHQgICAgfVxuXHR9XG5cdHVwZGF0ZUhhc2hlcigpIHtcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZCArICcvJyArIHRoaXMuY3VycmVudEluZGV4XG5cdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHR9XG5cdG5leHQoKSB7XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTEVGVFxuXHRcdHRoaXMuY3VycmVudEluZGV4ICs9IDFcblx0XHR0aGlzLmN1cnJlbnRJbmRleCA9ICh0aGlzLmN1cnJlbnRJbmRleCA+IHRoaXMucHJvZHVjdHMubGVuZ3RoLTEpID8gMCA6IHRoaXMuY3VycmVudEluZGV4XG5cdH1cblx0cHJldmlvdXMoKSB7XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuUklHSFRcblx0XHR0aGlzLmN1cnJlbnRJbmRleCAtPSAxXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggPSAodGhpcy5jdXJyZW50SW5kZXggPCAwKSA/IHRoaXMucHJvZHVjdHMubGVuZ3RoLTEgOiB0aGlzLmN1cnJlbnRJbmRleFxuXHR9XG5cdGdldEN1cnJlbnRJbmRleEZyb21Qcm9kdWN0SWQocHJvZHVjdElkKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnByb2R1Y3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZih0aGlzLnByb2R1Y3RzW2ldLmlkID09IHByb2R1Y3RJZCkge1xuXHRcdFx0XHRyZXR1cm4gaVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRpbnRlcm5hbEhhc2hlckNoYW5nZWQoKSB7XG5cdFx0dGhpcy5mcm9tSW50ZXJuYWxDaGFuZ2UgPSB0cnVlXG5cdFx0dGhpcy5jaGVja0N1cnJlbnRQcm9kdWN0QnlVcmwoKVxuXHR9XG5cdGNoZWNrQ3VycmVudFByb2R1Y3RCeVVybCgpIHtcblx0XHR2YXIgbmV3SGFzaGVyID0gUm91dGVyLmdldE5ld0hhc2goKVxuXHRcdHZhciBwcm9kdWN0SWQgPSBwYXJzZUludChuZXdIYXNoZXIudGFyZ2V0SWQsIDEwKVxuXHRcdHRoaXMuY3VycmVudEluZGV4ID0gdGhpcy5nZXRDdXJyZW50SW5kZXhGcm9tUHJvZHVjdElkKHByb2R1Y3RJZClcblx0XHR0aGlzLnNob3dQcm9kdWN0QnlJZChwcm9kdWN0SWQpXG5cdH1cblx0c2hvd1Byb2R1Y3RCeUlkKGlkKSB7XG5cdFx0dGhpcy5hbmltYXRpb25SdW5uaW5nID0gdHJ1ZVxuXHRcdHRoaXMucHJvZHVjdElkID0gaWRcblx0XHR0aGlzLmN1cnJlbnRQcm9kdWN0Q29udGFpbmVyQ2xhc3MgPSAodGhpcy5jdXJyZW50UHJvZHVjdENvbnRhaW5lckNsYXNzID09PSAncHJvZHVjdC1jb250YWluZXItYScpID8gJ3Byb2R1Y3QtY29udGFpbmVyLWInIDogJ3Byb2R1Y3QtY29udGFpbmVyLWEnXG5cdFx0dGhpcy5wcmV2aW91c0NvbnRhaW5lciA9IHRoaXMuY3VycmVudENvbnRhaW5lclxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyc1t0aGlzLmN1cnJlbnRQcm9kdWN0Q29udGFpbmVyQ2xhc3NdXG5cdFx0XG5cdFx0dGhpcy5hc3NpZ25Bc3NldHNUb05ld0NvbnRhaW5lcigpXG5cdFx0dGhpcy5yZXNpemVNZWRpYVdyYXBwZXJzKClcblx0XHR0aGlzLmFuaW1hdGVDb250YWluZXJzKClcblx0fVxuXHRhc3NpZ25Bc3NldHNUb05ld0NvbnRhaW5lcigpIHtcblx0XHR2YXIgcHJvZHVjdFNjb3BlID0gQXBwU3RvcmUuZ2V0U3BlY2lmaWNQcm9kdWN0QnlJZCh0aGlzLmlkLCB0aGlzLnByb2R1Y3RJZClcblx0XHR2YXIgaW1nU3JjID0gQXBwU3RvcmUuZ2V0RW52aXJvbm1lbnQoKS5zdGF0aWMgKyAnL2ltYWdlL3BsYW5ldHMvJyArIHRoaXMuaWQgKyAnLycgKyBwcm9kdWN0U2NvcGVbJ3Zpc3VhbC1pZCddICsgJy1YTCcgKyAnLmpwZydcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIucG9zdGVySW1nLmF0dHIoJ3NyYycsIGltZ1NyYylcblx0fVxuXHRhc3NpZ25WaWRlb1RvTmV3Q29udGFpbmVyKCkge1xuXHRcdHZhciB2aWRlb0lkID0gMTM2MDgwNTk4XG5cdFx0dmFyIHZpZGVvVyA9ICcxMDAlJ1xuXHRcdHZhciB2aWRlb0ggPSAnMTAwJSdcblx0XHR2YXIgaWZyYW1lU3RyID0gJzxpZnJhbWUgc3JjPVwiaHR0cHM6Ly9wbGF5ZXIudmltZW8uY29tL3ZpZGVvLycrdmlkZW9JZCsnP3RpdGxlPTAmYnlsaW5lPTAmcG9ydHJhaXQ9MFwiIHdpZHRoPVwiJyt2aWRlb1crJ1wiIGhlaWdodD1cIicrdmlkZW9IKydcIiBmcmFtZWJvcmRlcj1cIjBcIiB3ZWJraXRhbGxvd2Z1bGxzY3JlZW4gbW96YWxsb3dmdWxsc2NyZWVuIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT4nXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvV3JhcHBlci5odG1sKGlmcmFtZVN0cilcblx0fVxuXHRhbmltYXRlQ29udGFpbmVycygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBkaXIgPSAodGhpcy5kaXJlY3Rpb24gPT0gQXBwQ29uc3RhbnRzLkxFRlQpID8gMSA6IC0xXG5cdFx0aWYodGhpcy5wcmV2aW91c0NvbnRhaW5lciAhPSB1bmRlZmluZWQpIFR3ZWVuTWF4LmZyb21Ubyh0aGlzLnByZXZpb3VzQ29udGFpbmVyLmVsLCAxLCB7eDowLCBvcGFjaXR5OiAxfSwgeyB4Oi13aW5kb3dXKmRpciwgb3BhY2l0eTogMSwgZm9yY2UzRDp0cnVlLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0pXG5cdFx0VHdlZW5NYXguZnJvbVRvKHRoaXMuY3VycmVudENvbnRhaW5lci5lbCwgMSwge3g6d2luZG93VypkaXIsIG9wYWNpdHk6IDF9LCB7IHg6MCwgb3BhY2l0eTogMSwgZm9yY2UzRDp0cnVlLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0pXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMudmlkZW9Bc3NpZ25UaW1lb3V0KVxuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuYW5pbWF0aW9uUnVubmluZyA9IGZhbHNlXG5cdFx0fSwgOTAwKVxuXHRcdHRoaXMudmlkZW9Bc3NpZ25UaW1lb3V0ID0gc2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dGhpcy5hc3NpZ25WaWRlb1RvTmV3Q29udGFpbmVyKClcblx0XHR9LCAxMzAwKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdC8vIHZhciBwbGFuZXREYXRhID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZCh0aGlzLmlkKVxuXHRcdC8vIHRoaXMuY29tcGFzcy51cGRhdGVEYXRhKHBsYW5ldERhdGEpXG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHQvLyB0aGlzLmNvbXBhc3MudXBkYXRlKClcblx0fVxuXHRyZXNpemVNZWRpYVdyYXBwZXJzKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR2YXIgaW1hZ2VSZXNpemUgPSBVdGlscy5SZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5KHdpbmRvd1cgKiAwLjYsIHdpbmRvd0ggKiAwLjYsIEFwcENvbnN0YW50cy5DQU1QQUlHTl9JTUFHRV9TSVpFWzBdLCBBcHBDb25zdGFudHMuQ0FNUEFJR05fSU1BR0VfU0laRVsxXSlcblx0XHR2YXIgdmlkZW9SZXNpemUgPSBVdGlscy5SZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5KHdpbmRvd1cgKiAwLjYsIHdpbmRvd0ggKiAwLjYsIEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfVywgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9IKVxuXHRcdHZhciBwb3N0ZXJJbWdDc3MgPSB7XG5cdFx0XHR3aWR0aDogaW1hZ2VSZXNpemUud2lkdGgsXG5cdFx0XHRoZWlnaHQ6IGltYWdlUmVzaXplLmhlaWdodCxcblx0XHRcdHRvcDogKHdpbmRvd0ggPj4gMSkgLSAoaW1hZ2VSZXNpemUuaGVpZ2h0ID4+IDEpLFxuXHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAoaW1hZ2VSZXNpemUud2lkdGggPj4gMSlcblx0XHR9XG5cdFx0dmFyIHZpZGVvQ3NzID0ge1xuXHRcdFx0d2lkdGg6IHZpZGVvUmVzaXplLndpZHRoLFxuXHRcdFx0aGVpZ2h0OiB2aWRlb1Jlc2l6ZS5oZWlnaHQsXG5cdFx0XHR0b3A6IHdpbmRvd0ggKyAod2luZG93SCA+PiAxKSAtICh2aWRlb1Jlc2l6ZS5oZWlnaHQgPj4gMSksXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtICh2aWRlb1Jlc2l6ZS53aWR0aCA+PiAxKVx0XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5wcmV2aW91c0NvbnRhaW5lciAhPSB1bmRlZmluZWQpIHRoaXMucHJldmlvdXNDb250YWluZXIuZWwuY3NzKCd6LWluZGV4JywgMSlcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIuZWwuY3NzKCd6LWluZGV4JywgMilcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIucG9zdGVyV3JhcHBlci5jc3MocG9zdGVySW1nQ3NzKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlb1dyYXBwZXIuY3NzKHZpZGVvQ3NzKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0Ly8gdGhpcy5jb21wYXNzLnJlc2l6ZSgpXG5cdFx0Ly8gdGhpcy5jb21wYXNzLnBvc2l0aW9uKFxuXHRcdC8vIFx0d2luZG93VyA+PiAxLCB3aW5kb3dIICogMC4xNlxuXHRcdC8vIClcblx0XHRcblx0XHR0aGlzLnJlc2l6ZU1lZGlhV3JhcHBlcnMoKVxuXHRcdFxuXHRcdHZhciBjaGlsZENzcyA9IHtcblx0XHRcdHdpZHRoOiB3aW5kb3dXLFxuXHRcdFx0aGVpZ2h0OiB3aW5kb3dIXG5cdFx0fVxuXHRcdHRoaXMuY2hpbGQuY3NzKGNoaWxkQ3NzKVxuXG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHQkKGRvY3VtZW50KS5vZmYoJ2tleWRvd24nLCB0aGlzLm9uS2V5UHJlc3NlZClcblx0XHQvLyB0aGlzLmNvbXBhc3MuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVBsYW5ldFBhZ2UgZnJvbSAnQmFzZVBsYW5ldFBhZ2UnXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3Nlc0NvbnRhaW5lciBmcm9tICdDb21wYXNzZXNDb250YWluZXInXG5pbXBvcnQgQWxhc2thWFAgZnJvbSAnQWxhc2thWFAnXG5pbXBvcnQgU2tpWFAgZnJvbSAnU2tpWFAnXG5pbXBvcnQgTWV0YWxYUCBmcm9tICdNZXRhbFhQJ1xuaW1wb3J0IFdvb2RYUCBmcm9tICdXb29kWFAnXG5pbXBvcnQgR2VtU3RvbmVYUCBmcm9tICdHZW1TdG9uZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGFuZXRFeHBlcmllbmNlUGFnZSBleHRlbmRzIEJhc2VQbGFuZXRQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcylcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHQvLyB2YXIgYnVubnlVcmwgPSB0aGlzLmdldEltYWdlVXJsQnlJZCgnYnVubnknKVxuXHRcdC8vIHZhciB0ZXh0dXJlID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZShidW5ueVVybClcblx0XHQvLyB2YXIgYnVubnkgPSBuZXcgUElYSS5TcHJpdGUodGV4dHVyZSlcblxuXHRcdHRoaXMuZyA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuZylcblx0XHQvLyB0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKGJ1bm55KVxuXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIgPSBuZXcgQ29tcGFzc2VzQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIsIHRoaXMuY2hpbGQpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuaWQgPSB0aGlzLmlkXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dmFyIFhwQ2xhenogPSB0aGlzLmdldEV4cGVyaWVuY2VCeUlkKHRoaXMuaWQpXG5cdFx0dGhpcy5leHBlcmllbmNlID0gbmV3IFhwQ2xhenooKVxuXHRcdHRoaXMuZXhwZXJpZW5jZS5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0Z2V0RXhwZXJpZW5jZUJ5SWQoaWQpIHtcblx0XHRzd2l0Y2goaWQpe1xuXHRcdFx0Y2FzZSAnc2tpJzogcmV0dXJuIFNraVhQXG5cdFx0XHRjYXNlICdtZXRhbCc6IHJldHVybiBNZXRhbFhQXG5cdFx0XHRjYXNlICdhbGFza2EnOiByZXR1cm4gQWxhc2thWFBcblx0XHRcdGNhc2UgJ3dvb2QnOiByZXR1cm4gV29vZFhQXG5cdFx0XHRjYXNlICdnZW1zdG9uZSc6IHJldHVybiBHZW1TdG9uZVhQXG5cdFx0fVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcdFxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0XHRzdXBlci53aWxsVHJhbnNpdGlvbk91dCgpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIud2lsbFRyYW5zaXRpb25PdXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR0aGlzLmV4cGVyaWVuY2UudXBkYXRlKClcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGhpcy5leHBlcmllbmNlLnJlc2l6ZSgpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIucmVzaXplKClcblxuXHRcdC8vIGRyYXcgYSByZWN0YW5nbGVcblx0XHR0aGlzLmcuY2xlYXIoKVxuXHRcdHRoaXMuZy5iZWdpbkZpbGwoTWF0aC5yYW5kb20oKSAqIDB4ZmZmZmZmKVxuXHRcdHRoaXMuZy5kcmF3UmVjdCgwLCAwLCB3aW5kb3dXLCB3aW5kb3dIKVxuXHRcdHRoaXMuZy5lbmRGaWxsKClcblxuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgS25vdCBmcm9tICdLbm90J1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IFZlYzIgZnJvbSAnVmVjMidcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTbWFsbENvbXBhc3Mge1xuXHRjb25zdHJ1Y3RvcihweENvbnRhaW5lciwgdHlwZSkge1xuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHRcdHRoaXMudHlwZSA9IHR5cGUgfHwgQXBwQ29uc3RhbnRzLkxBTkRJTkdcblx0XHR0aGlzLmJvdW5jZSA9IC0xXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoZGF0YSwgbmFtZSwgcGFyZW50RWwpIHtcblx0XHR0aGlzLnBhcmVudEVsID0gcGFyZW50RWxcblx0XHR0aGlzLmNvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmNvbnRhaW5lcilcblxuXHRcdHRoaXMuYmdDaXJjbGUgPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5iZ0NpcmNsZSlcblxuXHRcdHZhciBrbm90UmFkaXVzID0gQXBwQ29uc3RhbnRzLlNNQUxMX0tOT1RfUkFESVVTXG5cdFx0dGhpcy5yYWRpdXMgPSAzMFxuXHRcdHRoaXMucmFkaXVzTGltaXQgPSAodGhpcy5yYWRpdXMqMC44KSAtIChrbm90UmFkaXVzPj4xKVxuXHRcdHZhciBncmF5ID0gMHg1NzU3NTZcblx0XHR0aGlzLndpZHRoID0gdGhpcy5yYWRpdXNcblx0XHR0aGlzLmhlaWdodCA9IHRoaXMucmFkaXVzXG5cblx0XHR2YXIgY29tcGFzc05hbWUgPSBuYW1lLnRvVXBwZXJDYXNlKClcblx0XHR0aGlzLmVsZW1lbnQgPSB0aGlzLnBhcmVudEVsLmZpbmQoJy5jb21wYXNzZXMtdGV4dHMtd3JhcHBlcicpXG5cdFx0dmFyIGNvbnRhaW5lckVsID0gJCgnPGRpdiBjbGFzcz1cInRleHRzLWNvbnRhaW5lciBidG5cIj48L2Rpdj4nKVxuXHRcdHRoaXMuZWxlbWVudC5hcHBlbmQoY29udGFpbmVyRWwpXG5cdFx0dmFyIHRpdGxlVG9wID0gJCgnPGRpdiBjbGFzcz1cInRvcC10aXRsZVwiPjwvZGl2Jylcblx0XHR2YXIgdGl0bGVCb3R0b20gPSAkKCc8ZGl2IGNsYXNzPVwiYm90dG9tLXRpdGxlXCI+PC9kaXYnKVxuXG5cdFx0dGhpcy5jaXJjbGVSYWQgPSA5MFxuXHRcdHZhciBjaXJjbGVwYXRoID0gJ00wLCcrdGhpcy5jaXJjbGVSYWQvMisnYScrdGhpcy5jaXJjbGVSYWQvMisnLCcrdGhpcy5jaXJjbGVSYWQvMisnIDAgMSwwICcrdGhpcy5jaXJjbGVSYWQrJywwYScrdGhpcy5jaXJjbGVSYWQvMisnLCcrdGhpcy5jaXJjbGVSYWQvMisnIDAgMSwwIC0nK3RoaXMuY2lyY2xlUmFkKycsMCdcblx0XHR2YXIgc3ZnU3RyID0gJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiPiA8ZGVmcz4gPHBhdGggaWQ9XCJwYXRoMVwiIGQ9XCInK2NpcmNsZXBhdGgrJ1wiID4gPC9wYXRoPiA8L2RlZnM+IDx0ZXh0IGZpbGw9XCJ3aGl0ZVwiIGlkPVwibXlUZXh0XCI+IDx0ZXh0UGF0aCB4bGluazpocmVmPVwiI3BhdGgxXCI+IDx0c3BhbiBkeD1cIjBweFwiIGR5PVwiMHB4XCI+JyArIGNvbXBhc3NOYW1lICsgJzwvdHNwYW4+IDwvdGV4dFBhdGg+IDwvdGV4dD48L3N2Zz4nXG5cdFx0dmFyIHRpdGxlVG9wU3ZnID0gJChzdmdTdHIpXG5cdFx0dmFyIHRpdGxlQm90dG9tU3ZnID0gJChzdmdTdHIpXG5cdFx0dGl0bGVUb3AuYXBwZW5kKHRpdGxlVG9wU3ZnKVxuXHRcdHRpdGxlQm90dG9tLmFwcGVuZCh0aXRsZUJvdHRvbVN2Zylcblx0XHRjb250YWluZXJFbC5hcHBlbmQodGl0bGVUb3ApXG5cdFx0Y29udGFpbmVyRWwuYXBwZW5kKHRpdGxlQm90dG9tKVxuXHRcdHRpdGxlVG9wU3ZnLmNzcyh7XG5cdFx0XHR3aWR0aDogdGhpcy5jaXJjbGVSYWQsXG5cdFx0XHRoZWlnaHQ6IHRoaXMuY2lyY2xlUmFkXG5cdFx0fSlcblx0XHR0aXRsZUJvdHRvbVN2Zy5jc3Moe1xuXHRcdFx0d2lkdGg6IHRoaXMuY2lyY2xlUmFkLFxuXHRcdFx0aGVpZ2h0OiB0aGlzLmNpcmNsZVJhZFxuXHRcdH0pXG5cdFx0dGhpcy50aXRsZXMgPSB7XG5cdFx0XHRjb250YWluZXI6IGNvbnRhaW5lckVsLFxuXHRcdFx0dGl0bGVUb3A6IHRpdGxlVG9wLFxuXHRcdFx0dGl0bGVCb3R0b206IHRpdGxlQm90dG9tXG5cdFx0fVxuXG5cdFx0dGhpcy5vbkNsaWNrZWQgPSB0aGlzLm9uQ2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0dGhpcy50aXRsZXMuY29udGFpbmVyLm9uKCdjbGljaycsIHRoaXMub25DbGlja2VkKVxuXG5cdFx0dGhpcy5rbm90cyA9IFtdXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZCA9IGRhdGFbaV1cblx0XHRcdHZhciBrbm90ID0gbmV3IEtub3QodGhpcy5jb250YWluZXIsIGtub3RSYWRpdXMsIGdyYXkpLmNvbXBvbmVudERpZE1vdW50KClcblx0XHRcdGtub3QubWFzcyA9IGtub3RSYWRpdXNcblx0XHRcdGtub3QudnggPSBNYXRoLnJhbmRvbSgpICogMC44XG4gICAgICAgICAgICBrbm90LnZ5ID0gTWF0aC5yYW5kb20oKSAqIDAuOFxuICAgICAgICAgICAga25vdC5wb3NWZWMgPSBuZXcgUElYSS5Qb2ludCgwLCAwKVxuICAgICAgICAgICAga25vdC5wb3NGVmVjID0gbmV3IFBJWEkuUG9pbnQoMCwgMClcbiAgICAgICAgICAgIGtub3QudmVsVmVjID0gbmV3IFBJWEkuUG9pbnQoMCwgMClcbiAgICAgICAgICAgIGtub3QudmVsRlZlYyA9IG5ldyBQSVhJLlBvaW50KDAsIDApXG5cdFx0XHRrbm90LnBvc2l0aW9uKFV0aWxzLlJhbmQoLXRoaXMucmFkaXVzTGltaXQsIHRoaXMucmFkaXVzTGltaXQpLCBVdGlscy5SYW5kKC10aGlzLnJhZGl1c0xpbWl0LCB0aGlzLnJhZGl1c0xpbWl0KSlcblx0XHRcdHRoaXMua25vdHNbaV0gPSBrbm90XG5cdFx0fVxuXG5cdFx0Ly8gZHJhdyBhIHJlY3RhbmdsZVxuXHRcdHRoaXMuYmdDaXJjbGUuY2xlYXIoKVxuXHRcdHRoaXMuYmdDaXJjbGUuYmVnaW5GaWxsKDB4ZmZmZmZmKVxuXHRcdHRoaXMuYmdDaXJjbGUuZHJhd0NpcmNsZSgwLCAwLCB0aGlzLnJhZGl1cylcblx0XHR0aGlzLmJnQ2lyY2xlLmVuZEZpbGwoKVxuXHR9XG5cdG9uQ2xpY2tlZChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dmFyIHVybCA9IFwiL3BsYW5ldC9cIiArIHRoaXMuaWRcblx0XHRSb3V0ZXIuc2V0SGFzaCh1cmwpXG5cdH1cblx0Y2hlY2tXYWxscyhrbm90KSB7XG5cdFx0aWYoa25vdC54ICsga25vdC5yYWRpdXMgPiB0aGlzLnJhZGl1c0xpbWl0KSB7XG5cdCAgICAgICAga25vdC54ID0gdGhpcy5yYWRpdXNMaW1pdCAtIGtub3QucmFkaXVzO1xuXHQgICAgICAgIGtub3QudnggKj0gdGhpcy5ib3VuY2U7XG5cdCAgICB9ZWxzZSBpZihrbm90LnggLSBrbm90LnJhZGl1cyA8IC10aGlzLnJhZGl1c0xpbWl0LWtub3QucmFkaXVzKSB7XG5cdCAgICAgICAga25vdC54ID0gLXRoaXMucmFkaXVzTGltaXQgKyBrbm90LnJhZGl1cy1rbm90LnJhZGl1cztcblx0ICAgICAgICBrbm90LnZ4ICo9IHRoaXMuYm91bmNlO1xuXHQgICAgfVxuXHQgICAgaWYoa25vdC55ICsga25vdC5yYWRpdXMgPiB0aGlzLnJhZGl1c0xpbWl0KSB7XG5cdCAgICAgICAga25vdC55ID0gdGhpcy5yYWRpdXNMaW1pdCAtIGtub3QucmFkaXVzO1xuXHQgICAgICAgIGtub3QudnkgKj0gdGhpcy5ib3VuY2U7XG5cdCAgICB9ZWxzZSBpZihrbm90LnkgLSBrbm90LnJhZGl1cyA8IC10aGlzLnJhZGl1c0xpbWl0KSB7XG5cdCAgICAgICAga25vdC55ID0gLXRoaXMucmFkaXVzTGltaXQgKyBrbm90LnJhZGl1cztcblx0ICAgICAgICBrbm90LnZ5ICo9IHRoaXMuYm91bmNlO1xuXHQgICAgfVxuXHR9XG5cdGNoZWNrQ29sbGlzaW9uKGtub3RBLCBrbm90Qikge1xuXHRcdHZhciBkeCA9IGtub3RCLnggLSBrbm90QS54O1xuXHQgICAgdmFyIGR5ID0ga25vdEIueSAtIGtub3RBLnk7XG5cdCAgICB2YXIgZGlzdCA9IE1hdGguc3FydChkeCpkeCArIGR5KmR5KTtcblx0ICAgIGlmKGRpc3QgPCBrbm90QS5yYWRpdXMgKyBrbm90Qi5yYWRpdXMpIHtcblx0ICAgICAgICB2YXIgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeClcblx0ICAgICAgICB2YXIgc2luID0gTWF0aC5zaW4oYW5nbGUpXG5cdCAgICAgICAgdmFyIGNvcyA9IE1hdGguY29zKGFuZ2xlKVxuXHQgICAgICAgIGtub3RBLnBvc1ZlYy54ID0gMFxuXHQgICAgICAgIGtub3RBLnBvc1ZlYy55ID0gMFxuXHQgICAgICAgIHRoaXMucm90YXRlKGtub3RCLnBvc1ZlYywgZHgsIGR5LCBzaW4sIGNvcywgdHJ1ZSlcblx0ICAgICAgICB0aGlzLnJvdGF0ZShrbm90QS52ZWxWZWMsIGtub3RBLnZ4LCBrbm90QS52eSwgc2luLCBjb3MsIHRydWUpXG5cdCAgICAgICAgdGhpcy5yb3RhdGUoa25vdEIudmVsVmVjLCBrbm90Qi52eCwga25vdEIudnksIHNpbiwgY29zLCB0cnVlKVxuXG5cdCAgICAgICAgLy8gY29sbGlzaW9uIHJlYWN0aW9uXG5cdFx0XHR2YXIgdnhUb3RhbCA9IGtub3RBLnZlbFZlYy54IC0ga25vdEIudmVsVmVjLnhcblx0XHRcdGtub3RBLnZlbFZlYy54ID0gKChrbm90QS5tYXNzIC0ga25vdEIubWFzcykgKiBrbm90QS52ZWxWZWMueCArIDIgKiBrbm90Qi5tYXNzICoga25vdEIudmVsVmVjLngpIC8gKGtub3RBLm1hc3MgKyBrbm90Qi5tYXNzKVxuXHRcdFx0a25vdEIudmVsVmVjLnggPSB2eFRvdGFsICsga25vdEEudmVsVmVjLnhcblxuXHRcdFx0Ly8gdXBkYXRlIHBvc2l0aW9uXG5cdFx0XHRrbm90QS5wb3NWZWMueCArPSBrbm90QS52ZWxWZWMueDtcblx0XHRcdGtub3RCLnBvc1ZlYy54ICs9IGtub3RCLnZlbFZlYy54O1xuXG5cdFx0XHQvLyByb3RhdGUgcG9zaXRpb25zIGJhY2tcblx0XHRcdHRoaXMucm90YXRlKGtub3RBLnBvc0ZWZWMsIGtub3RBLnBvc1ZlYy54LCBrbm90QS5wb3NWZWMueSwgc2luLCBjb3MsIGZhbHNlKVxuXHRcdFx0dGhpcy5yb3RhdGUoa25vdEIucG9zRlZlYywga25vdEIucG9zVmVjLngsIGtub3RCLnBvc1ZlYy55LCBzaW4sIGNvcywgZmFsc2UpXG5cblx0XHRcdC8vIGFkanVzdCBwb3NpdGlvbnMgdG8gYWN0dWFsIHNjcmVlbiBwb3NpdGlvbnNcblx0XHRcdGtub3RCLnggPSBrbm90QS54ICsga25vdEIucG9zRlZlYy54O1xuXHRcdFx0a25vdEIueSA9IGtub3RBLnkgKyBrbm90Qi5wb3NGVmVjLnk7XG5cdFx0XHRrbm90QS54ID0ga25vdEEueCArIGtub3RBLnBvc0ZWZWMueDtcblx0XHRcdGtub3RBLnkgPSBrbm90QS55ICsga25vdEEucG9zRlZlYy55O1xuXG5cdFx0XHQvLyByb3RhdGUgdmVsb2NpdGllcyBiYWNrXG5cdFx0XHR0aGlzLnJvdGF0ZShrbm90QS52ZWxGVmVjLCBrbm90QS52ZWxWZWMueCwga25vdEEudmVsVmVjLnksIHNpbiwgY29zLCBmYWxzZSlcblx0XHRcdHRoaXMucm90YXRlKGtub3RCLnZlbEZWZWMsIGtub3RCLnZlbFZlYy54LCBrbm90Qi52ZWxWZWMueSwgc2luLCBjb3MsIGZhbHNlKVxuXG5cdFx0XHRrbm90QS52eCA9IGtub3RBLnZlbEZWZWMueDtcblx0ICAgICAgICBrbm90QS52eSA9IGtub3RBLnZlbEZWZWMueTtcblx0ICAgICAgICBrbm90Qi52eCA9IGtub3RCLnZlbEZWZWMueDtcblx0ICAgICAgICBrbm90Qi52eSA9IGtub3RCLnZlbEZWZWMueTtcblx0ICAgIH1cblx0fVxuXHRyb3RhdGUocG9pbnQsIHgsIHksIHNpbiwgY29zLCByZXZlcnNlKSB7XG5cdFx0aWYocmV2ZXJzZSkge1xuXHRcdFx0cG9pbnQueCA9IHggKiBjb3MgKyB5ICogc2luO1xuXHRcdFx0cG9pbnQueSA9IHkgKiBjb3MgLSB4ICogc2luO1xuXHRcdH1lbHNle1xuXHRcdFx0cG9pbnQueCA9IHggKiBjb3MgLSB5ICogc2luO1xuXHRcdFx0cG9pbnQueSA9IHkgKiBjb3MgKyB4ICogc2luO1xuXHRcdH1cblx0fVxuXHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHQvLyB0aGlzLnRpdGxlcy5jb250YWluZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cdH1cblx0d2lsbFRyYW5zaXRpb25PdXQoKSB7XG5cdFx0Ly8gdGhpcy50aXRsZXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVx0XG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHZhciBrbm90cyA9IHRoaXMua25vdHNcblx0XHR2YXIga25vdHNOdW0gPSBrbm90cy5sZW5ndGhcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtub3RzTnVtOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0ga25vdHNbaV1cblx0XHRcdGtub3QucG9zaXRpb24oa25vdC54ICsga25vdC52eCwga25vdC55ICsga25vdC52eSlcblx0XHRcdHRoaXMuY2hlY2tXYWxscyhrbm90KVxuXHRcdH1cblx0XHRmb3IgKGkgPSAwOyBpIDwga25vdHNOdW0gLSAxOyBpKyspIHtcblx0XHRcdHZhciBrbm90QSA9IGtub3RzW2ldXG5cdFx0XHRmb3IgKHZhciBqID0gaSArIDE7IGogPCBrbm90c051bTsgaisrKSB7XG5cdFx0XHRcdHZhciBrbm90QiA9IGtub3RzW2pdXG5cdFx0XHRcdHRoaXMuY2hlY2tDb2xsaXNpb24oa25vdEEsIGtub3RCKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLmNvbnRhaW5lci54ID0geFxuXHRcdHRoaXMuY29udGFpbmVyLnkgPSB5XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRwb3NpdGlvbkVsZW1lbnQoeCwgeSkge1xuXHRcdHRoaXMudGl0bGVzLmNvbnRhaW5lci5jc3Moe1xuXHRcdFx0bGVmdDogeCAtICh0aGlzLmNpcmNsZVJhZD4+MSksXG5cdFx0XHR0b3A6IHkgLSAodGhpcy5jaXJjbGVSYWQ+PjEpLFxuXHRcdFx0d2lkdGg6IHRoaXMuY2lyY2xlUmFkLFxuXHRcdFx0aGVpZ2h0OiB0aGlzLmNpcmNsZVJhZCxcblx0XHR9KVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5rbm90cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5rbm90c1tpXS5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0fVxuXHRcdHRoaXMudGl0bGVzLmNvbnRhaW5lci5vZmYoJ2NsaWNrJywgdGhpcy5vbkNsaWNrZWQpXG5cdFx0dGhpcy5rbm90cy5sZW5ndGggPSAwXG5cdFx0dGhpcy5iZ0NpcmNsZS5jbGVhcigpXG5cdFx0dGhpcy5iZ0NpcmNsZSA9IG51bGxcblx0XHR0aGlzLmNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLmNvbnRhaW5lcilcblx0fVxufVxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNwcmluZ0dhcmRlbiB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuY29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0XHR0aGlzLmFyZWFQb2x5Z29uID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIuYWRkQ2hpbGQodGhpcy5hcmVhUG9seWdvbilcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyKVxuXHRcdFxuXHRcdHRoaXMubGluZVcgPSBBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKVxuXHRcdHRoaXMucGF1c2VkID0gdHJ1ZVxuXHRcdHRoaXMub3BlbmVkID0gZmFsc2VcblxuXHRcdHRoaXMua25vdHMgPSBbXVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgQXBwQ29uc3RhbnRzLlRPVEFMX0tOT1RfTlVNOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0gbmV3IEtub3QodGhpcy5jb250YWluZXIpLmNvbXBvbmVudERpZE1vdW50KClcblx0XHRcdHRoaXMua25vdHNbaV0gPSBrbm90XG5cdFx0fVxuXG5cdFx0dGhpcy5jb25maWcgPSB7XG5cdFx0XHRzcHJpbmc6IDAsXG5cdFx0XHRmcmljdGlvbjogMCxcblx0XHRcdHNwcmluZ0xlbmd0aDogMFxuXHRcdH1cblx0fVxuXHRjb21wb25lbnREaWRNb3VudChkYXRhLCB3aXRoRmlsbCwgaXNJbnRlcmFjdGl2ZSkge1xuXHRcdHRoaXMucGFyYW1zID0gZGF0YVxuXHRcdHRoaXMud2l0aEZpbGwgPSB3aXRoRmlsbCB8fCBmYWxzZVxuXHRcdHRoaXMuaXNJbnRlcmFjdGl2ZSA9IGlzSW50ZXJhY3RpdmUgfHwgZmFsc2Vcblx0XHR2YXIga25vdHNEYXRhID0gdGhpcy5wYXJhbXMua25vdHNcblxuXHRcdHRoaXMub25DbGlja2VkID0gdGhpcy5vbkNsaWNrZWQuYmluZCh0aGlzKVxuXHRcdGlmKHRoaXMuaXNJbnRlcmFjdGl2ZSkge1xuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5idXR0b25Nb2RlID0gdHJ1ZVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5pbnRlcmFjdGl2ZSA9IHRydWVcblx0XHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIub24oJ2NsaWNrJywgdGhpcy5vbkNsaWNrZWQpXG5cdFx0fWVsc2V7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmJ1dHRvbk1vZGUgPSBmYWxzZVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5pbnRlcmFjdGl2ZSA9IGZhbHNlXG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmtub3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbmV3S25vdFNjYWxlID0ga25vdHNEYXRhW2ldXG5cdFx0XHR2YXIga25vdCA9IHRoaXMua25vdHNbaV1cblx0XHRcdGtub3QuY2hhbmdlU2l6ZSh0aGlzLmtub3RSYWRpdXMpXG5cdFx0XHRrbm90LnRvWCA9IG5ld0tub3RTY2FsZS54ICogKHRoaXMucmFkaXVzKVxuXHRcdFx0a25vdC50b1kgPSBuZXdLbm90U2NhbGUueSAqICh0aGlzLnJhZGl1cylcblx0XHR9XG5cdFx0dGhpcy5jb250YWluZXIucm90YXRpb24gPSBVdGlscy5SYW5kKC00LCA0KVxuXHRcdHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCA9IDIwMFxuXHRcdHRoaXMuYXNzaWduT3BlbmVkQ29uZmlnKClcblx0fVxuXHRvbkNsaWNrZWQoKSB7XG5cdFx0dmFyIHVybCA9IFwiL3BsYW5ldC9cIiArIHRoaXMuaWQgKyAnLycgKyB0aGlzLnBhcmFtcy5pZFxuXHRcdFJvdXRlci5zZXRIYXNoKHVybClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dGhpcy5hcmVhUG9seWdvbi5jbGVhcigpXG5cdFx0aWYodGhpcy53aXRoRmlsbCkge1xuXHRcdFx0dGhpcy5hcmVhUG9seWdvbi5iZWdpbkZpbGwodGhpcy5wYXJhbXMuY29sb3IpXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uLmxpbmVTdHlsZSgwKVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbi5tb3ZlVG8odGhpcy5rbm90c1swXS54LCB0aGlzLmtub3RzWzBdLnkpXG5cdFx0fWVsc2V7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uLmxpbmVTdHlsZSh0aGlzLmxpbmVXLCB0aGlzLnBhcmFtcy5jb2xvciwgMC44KVxuXHRcdH1cblx0XHR2YXIgbGVuID0gdGhpcy5rbm90cy5sZW5ndGhcblx0XHR2YXIgc3ByaW5nID0gdGhpcy5jb25maWcuc3ByaW5nXG5cdFx0dmFyIGZyaWN0aW9uID0gdGhpcy5jb25maWcuZnJpY3Rpb25cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IHRoaXMua25vdHNbaV1cblx0XHRcdHZhciBwcmV2aW91c0tub3QgPSB0aGlzLmtub3RzW2ktMV1cblx0XHRcdHByZXZpb3VzS25vdCA9IChwcmV2aW91c0tub3QgPT0gdW5kZWZpbmVkKSA/IHRoaXMua25vdHNbbGVuLTFdIDogcHJldmlvdXNLbm90XG5cblx0XHRcdFV0aWxzLlNwcmluZ1RvKGtub3QsIGtub3QudG9YLCBrbm90LnRvWSwgaSwgc3ByaW5nLCBmcmljdGlvbiwgdGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoKVxuXHRcdFx0a25vdC5wb3NpdGlvbihrbm90LnggKyBrbm90LnZ4LCBrbm90LnkgKyBrbm90LnZ5KVxuXG5cdFx0XHRpZih0aGlzLndpdGhGaWxsKSB7XG5cdFx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubGluZVRvKGtub3QueCwga25vdC55KVxuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubW92ZVRvKHByZXZpb3VzS25vdC54LCBwcmV2aW91c0tub3QueSlcblx0XHRcdFx0dGhpcy5hcmVhUG9seWdvbi5saW5lVG8oa25vdC54LCBrbm90LnkpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKHRoaXMud2l0aEZpbGwpIHtcblx0XHRcdHRoaXMuYXJlYVBvbHlnb24uZW5kRmlsbCgpXG5cdFx0fVxuXHRcdHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCAtPSAodGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoKSAqIDAuMVxuXHRcdHRoaXMuY29udGFpbmVyLnJvdGF0aW9uIC09ICh0aGlzLmNvbnRhaW5lci5yb3RhdGlvbikgKiAwLjFcblx0fVxuXHRhc3NpZ25PcGVuZWRDb25maWcoKSB7XG5cdFx0dGhpcy5jb25maWcuc3ByaW5nID0gMC4wM1xuXHRcdHRoaXMuY29uZmlnLmZyaWN0aW9uID0gMC45MlxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGlmKHRoaXMuaXNJbnRlcmFjdGl2ZSkge1xuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5idXR0b25Nb2RlID0gZmFsc2Vcblx0XHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIuaW50ZXJhY3RpdmUgPSBmYWxzZVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5vZmYoJ2NsaWNrJywgdGhpcy5vbkNsaWNrZWQpXG5cdFx0fVxuXHR9XG5cdHJlc2l6ZShyYWRpdXMpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmFkaXVzID0gcmFkaXVzXG5cdFx0dGhpcy5jb250YWluZXIueCA9IDBcblx0XHR0aGlzLmNvbnRhaW5lci55ID0gMFxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWxhc2thWFAgZXh0ZW5kcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0fVxuXHR1cGRhdGUoKSB7XG5cdH1cblx0cmVzaXplKCkge1xuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2VtU3RvbmVYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWV0YWxYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTa2lYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXb29kWFAgZXh0ZW5kcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG4iLCJpbXBvcnQgUGFnZSBmcm9tICdQYWdlJ1xuaW1wb3J0IExhbmRpbmdTbGlkZXNob3cgZnJvbSAnTGFuZGluZ1NsaWRlc2hvdydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBDb21wYXNzIGZyb20gJ0NvbXBhc3MnXG5pbXBvcnQgQXJyb3dCdG4gZnJvbSAnQXJyb3dCdG4nXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMYW5kaW5nIGV4dGVuZHMgUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93ID0gbmV3IExhbmRpbmdTbGlkZXNob3codGhpcy5weENvbnRhaW5lciwgdGhpcy5jaGlsZClcblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5jb21wYXNzID0gbmV3IENvbXBhc3ModGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLmNvbXBhc3MuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5hcnJvd0xlZnQgPSBuZXcgQXJyb3dCdG4odGhpcy5weENvbnRhaW5lciwgQXBwQ29uc3RhbnRzLkxFRlQpXG5cdFx0dGhpcy5hcnJvd0xlZnQuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5hcnJvd1JpZ2h0ID0gbmV3IEFycm93QnRuKHRoaXMucHhDb250YWluZXIsIEFwcENvbnN0YW50cy5SSUdIVClcblx0XHR0aGlzLmFycm93UmlnaHQuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5vbktleVByZXNzZWQgPSB0aGlzLm9uS2V5UHJlc3NlZC5iaW5kKHRoaXMpXG5cdFx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCB0aGlzLm9uS2V5UHJlc3NlZClcblxuXHRcdHRoaXMub25TdGFnZUNsaWNrZWQgPSB0aGlzLm9uU3RhZ2VDbGlja2VkLmJpbmQodGhpcylcblx0XHR0aGlzLnBhcmVudC5vbignY2xpY2snLCB0aGlzLm9uU3RhZ2VDbGlja2VkKVxuXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdG9uU3RhZ2VDbGlja2VkKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRzd2l0Y2godGhpcy5kaXJlY3Rpb24pIHtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxFRlQ6XG5cdFx0XHRcdHRoaXMucHJldmlvdXMoKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuUklHSFQ6XG5cdFx0XHRcdHRoaXMubmV4dCgpXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5UT1A6XG5cdFx0XHRcdHZhciB1cmwgPSBcIi9wbGFuZXQvXCIgKyB0aGlzLmxhbmRpbmdTbGlkZXNob3cuY3VycmVudElkXG5cdFx0XHRcdFJvdXRlci5zZXRIYXNoKHVybClcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdH1cblx0b25LZXlQcmVzc2VkKGUpIHtcblx0ICAgIGUucHJldmVudERlZmF1bHQoKVxuXHRcdHN3aXRjaChlLndoaWNoKSB7XG5cdCAgICAgICAgY2FzZSAzNzogLy8gbGVmdFxuXHQgICAgICAgIFx0dGhpcy5wcmV2aW91cygpXG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgICAgY2FzZSAzOTogLy8gcmlnaHRcblx0ICAgICAgICBcdHRoaXMubmV4dCgpXG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuXHQgICAgfVxuXHR9XG5cdHVwZGF0ZUNvbXBhc3NQbGFuZXQoKSB7XG5cdFx0dmFyIHBsYW5ldERhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHRoaXMubGFuZGluZ1NsaWRlc2hvdy5jdXJyZW50SWQpXG5cdFx0dGhpcy5jb21wYXNzLnVwZGF0ZURhdGEocGxhbmV0RGF0YSlcblx0fVxuXHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpXG5cdFx0dGhpcy51cGRhdGVDb21wYXNzUGxhbmV0KClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRuZXh0KCkge1xuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5uZXh0KClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdHByZXZpb3VzKCkge1xuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5wcmV2aW91cygpXG5cdFx0dGhpcy51cGRhdGVDb21wYXNzUGxhbmV0KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnVwZGF0ZSgpXG5cdFx0dGhpcy5jb21wYXNzLnVwZGF0ZSgpXG5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIG1vdXNlWCA9IEFwcFN0b3JlLk1vdXNlLnhcblx0XHRpZihtb3VzZVggPCB3aW5kb3dXICogMC4yNSkge1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTEVGVFxuXHRcdFx0dGhpcy5hcnJvd0xlZnQucm9sbG92ZXIoKVxuXHRcdH1lbHNlIGlmKG1vdXNlWCA+IHdpbmRvd1cgKiAwLjc1KSB7XG5cdFx0XHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5SSUdIVFxuXHRcdFx0dGhpcy5hcnJvd1JpZ2h0LnJvbGxvdmVyKClcblx0XHR9ZWxzZXtcblx0XHRcdHRoaXMuZGlyZWN0aW9uID0gQXBwQ29uc3RhbnRzLk5PTkVcblx0XHRcdHRoaXMuYXJyb3dMZWZ0LnJvbGxvdXQoKVxuXHRcdFx0dGhpcy5hcnJvd1JpZ2h0LnJvbGxvdXQoKVxuXHRcdH1cblxuXHRcdHZhciBhcmVhID0gd2luZG93VyAqIDAuMjVcblx0XHRpZihtb3VzZVggPiAoKHdpbmRvd1cgPj4gMSkgLSBhcmVhKSAmJiBtb3VzZVggPCAoKHdpbmRvd1cgPj4gMSkgKyBhcmVhKSkge1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuVE9QXG5cdFx0fVxuXG5cdFx0c3VwZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cucmVzaXplKClcblx0XHR0aGlzLmNvbXBhc3MucmVzaXplKClcblxuXHRcdHRoaXMuY29tcGFzcy5wb3NpdGlvbihcblx0XHRcdHdpbmRvd1cgPj4gMSxcblx0XHRcdCh3aW5kb3dIID4+IDEpIC0gKHdpbmRvd0ggKiAwLjA1KVxuXHRcdClcblxuXHRcdHRoaXMuYXJyb3dSaWdodC5wb3NpdGlvbihcblx0XHRcdHdpbmRvd1cgLSAoQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIDw8IDIpLFxuXHRcdFx0d2luZG93SCA+PiAxXG5cdFx0KVxuXG5cdFx0dGhpcy5hcnJvd0xlZnQucG9zaXRpb24oXG5cdFx0XHQoQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIDw8IDIpLFxuXHRcdFx0d2luZG93SCA+PiAxXG5cdFx0KVxuXG5cdFx0c3VwZXIucmVzaXplKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuY29tcGFzcy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5hcnJvd0xlZnQuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuYXJyb3dSaWdodC5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0JChkb2N1bWVudCkub2ZmKCdrZXlkb3duJywgdGhpcy5vbktleVByZXNzZWQpXG5cdFx0dGhpcy5wYXJlbnQub2ZmKCdjbGljaycsIHRoaXMub25TdGFnZUNsaWNrZWQpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImV4cG9ydCBkZWZhdWx0IHtcblx0V0lORE9XX1JFU0laRTogJ1dJTkRPV19SRVNJWkUnLFxuXHRQQUdFX0hBU0hFUl9DSEFOR0VEOiAnUEFHRV9IQVNIRVJfQ0hBTkdFRCcsXG5cdFBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRTogJ1BBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRScsXG5cdFBYX0NPTlRBSU5FUl9JU19SRUFEWTogJ1BYX0NPTlRBSU5FUl9JU19SRUFEWScsXG5cdFBYX0NPTlRBSU5FUl9BRERfQ0hJTEQ6ICdQWF9DT05UQUlORVJfQUREX0NISUxEJyxcblx0UFhfQ09OVEFJTkVSX1JFTU9WRV9DSElMRDogJ1BYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQnLFxuXG5cdExBTkRJTkc6ICdMQU5ESU5HJyxcblx0RVhQRVJJRU5DRTogJ0VYUEVSSUVOQ0UnLFxuXHRDQU1QQUlHTjogJ0NBTVBBSUdOJyxcblx0Tk9ORTogJ05PTkUnLFxuXG5cdENPTVBBU1NfU0laRV9QRVJDRU5UQUdFOiAwLjI0LFxuXG5cdENPTVBBU1NfU01BTExfU0laRV9QRVJDRU5UQUdFOiAwLjEsXG5cblx0U01BTExfS05PVF9SQURJVVM6IDMsXG5cblx0T1BFTjogJ09QRU4nLFxuXHRDTE9TRTogJ0NMT1NFJyxcblxuXHRMRUZUOiAnTEVGVCcsXG5cdFJJR0hUOiAnUklHSFQnLFxuXHRUT1A6ICdUT1AnLFxuXHRCT1RUT006ICdCT1RUT00nLFxuXG5cdFRPVEFMX0tOT1RfTlVNOiAzLFxuXG5cdFBBRERJTkdfQVJPVU5EOiAyMCxcblxuXHRDQU1QQUlHTl9JTUFHRV9TSVpFOiBbMTYwNCwgMTA0MF0sXG5cblx0UkVTUE9OU0lWRV9JTUFHRTogWzE5MjAsIDEyODAsIDY0MF0sXG5cblx0RU5WSVJPTk1FTlRTOiB7XG5cdFx0UFJFUFJPRDoge1xuXHRcdFx0c3RhdGljOiAnJ1xuXHRcdH0sXG5cdFx0UFJPRDoge1xuXHRcdFx0XCJzdGF0aWNcIjogSlNfdXJsX3N0YXRpY1xuXHRcdH1cblx0fSxcblxuXHRMQU5EU0NBUEU6ICdMQU5EU0NBUEUnLFxuXHRQT1JUUkFJVDogJ1BPUlRSQUlUJyxcblxuXHRNRURJQV9HTE9CQUxfVzogMTkyMCxcblx0TUVESUFfR0xPQkFMX0g6IDEwODAsXG5cblx0TUlOX01JRERMRV9XOiA5NjAsXG5cdE1RX1hTTUFMTDogMzIwLFxuXHRNUV9TTUFMTDogNDgwLFxuXHRNUV9NRURJVU06IDc2OCxcblx0TVFfTEFSR0U6IDEwMjQsXG5cdE1RX1hMQVJHRTogMTI4MCxcblx0TVFfWFhMQVJHRTogMTY4MCxcbn0iLCJpbXBvcnQgRmx1eCBmcm9tICdmbHV4J1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJ1xuXG52YXIgQXBwRGlzcGF0Y2hlciA9IGFzc2lnbihuZXcgRmx1eC5EaXNwYXRjaGVyKCksIHtcblx0aGFuZGxlVmlld0FjdGlvbjogZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0dGhpcy5kaXNwYXRjaCh7XG5cdFx0XHRzb3VyY2U6ICdWSUVXX0FDVElPTicsXG5cdFx0XHRhY3Rpb246IGFjdGlvblxuXHRcdH0pO1xuXHR9XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgQXBwRGlzcGF0Y2hlciIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHRcdDxsaSBjbGFzcz1cXFwiY291bnRyeS1cIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW5kZXggfHwgKGRhdGEgJiYgZGF0YS5pbmRleCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaW5kZXhcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj48YSBocmVmPScjXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJ1cmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiJz5cIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwibmFtZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI8L2E+PC9saT5cXG5cIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT10aGlzLmxhbWJkYSwgYWxpYXMyPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgYWxpYXMzPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXM0PVwiZnVuY3Rpb25cIjtcblxuICByZXR1cm4gXCI8ZGl2Plxcblx0PGhlYWRlciBpZD1cXFwiaGVhZGVyXFxcIj5cXG5cdFx0PGEgaHJlZj1cXFwiIyEvbGFuZGluZ1xcXCIgY2xhc3M9XFxcImxvZ29cXFwiPlxcblx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiBpZD1cXFwiTGF5ZXJfMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEzNi4wMTNweFxcXCIgdmlld0JveD1cXFwiMCAwIDEzNi4wMTMgNDkuMzc1XFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAxMzYuMDEzIDQ5LjM3NVxcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIiBjbGlwLXJ1bGU9XFxcImV2ZW5vZGRcXFwiIGQ9XFxcIk04Mi4xNDEsOC4wMDJoMy4zNTRjMS4yMTMsMCwxLjcxNywwLjQ5OSwxLjcxNywxLjcyNXY3LjEzN2MwLDEuMjMxLTAuNTAxLDEuNzM2LTEuNzA1LDEuNzM2aC0zLjM2NVY4LjAwMnogTTgyLjUyMywyNC42MTd2OC40MjZsLTcuMDg3LTAuMzg0VjEuOTI1SDg3LjM5YzMuMjkyLDAsNS45NiwyLjcwNSw1Ljk2LDYuMDQ0djEwLjYwNGMwLDMuMzM4LTIuNjY4LDYuMDQ0LTUuOTYsNi4wNDRIODIuNTIzeiBNMzMuNDkxLDcuOTEzYy0xLjEzMiwwLTIuMDQ4LDEuMDY1LTIuMDQ4LDIuMzc5djExLjI1Nmg0LjQwOVYxMC4yOTJjMC0xLjMxNC0wLjkxNy0yLjM3OS0yLjA0Ny0yLjM3OUgzMy40OTF6IE0zMi45OTQsMC45NzRoMS4zMDhjNC43MDIsMCw4LjUxNCwzLjg2Niw4LjUxNCw4LjYzNHYyNS4yMjRsLTYuOTYzLDEuMjczdi03Ljg0OGgtNC40MDlsMC4wMTIsOC43ODdsLTYuOTc0LDIuMDE4VjkuNjA4QzI0LjQ4MSw0LjgzOSwyOC4yOTIsMC45NzQsMzIuOTk0LDAuOTc0IE0xMjEuOTMzLDcuOTIxaDMuNDIzYzEuMjE1LDAsMS43MTgsMC40OTcsMS43MTgsMS43MjR2OC4xOTRjMCwxLjIzMi0wLjUwMiwxLjczNi0xLjcwNSwxLjczNmgtMy40MzZWNy45MjF6IE0xMzMuNzE4LDMxLjA1NXYxNy40ODdsLTYuOTA2LTMuMzY4VjMxLjU5MWMwLTQuOTItNC41ODgtNS4wOC00LjU4OC01LjA4djE2Ljc3NGwtNi45ODMtMi45MTRWMS45MjVoMTIuMjMxYzMuMjkxLDAsNS45NTksMi43MDUsNS45NTksNi4wNDR2MTEuMDc3YzAsMi4yMDctMS4yMTcsNC4xNTMtMi45OTEsNS4xMTVDMTMxLjc2MSwyNC44OTQsMTMzLjcxOCwyNy4wNzcsMTMzLjcxOCwzMS4wNTUgTTEwLjgwOSwwLjgzM2MtNC43MDMsMC04LjUxNCwzLjg2Ni04LjUxNCw4LjYzNHYyNy45MzZjMCw0Ljc2OSw0LjAxOSw4LjYzNCw4LjcyMiw4LjYzNGwxLjMwNi0wLjA4NWM1LjY1NS0xLjA2Myw4LjMwNi00LjYzOSw4LjMwNi05LjQwN3YtOC45NGgtNi45OTZ2OC43MzZjMCwxLjQwOS0wLjA2NCwyLjY1LTEuOTk0LDIuOTkyYy0xLjIzMSwwLjIxOS0yLjQxNy0wLjgxNi0yLjQxNy0yLjEzMlYxMC4xNTFjMC0xLjMxNCwwLjkxNy0yLjM4MSwyLjA0Ny0yLjM4MWgwLjMxNWMxLjEzLDAsMi4wNDgsMS4wNjcsMi4wNDgsMi4zODF2OC40NjRoNi45OTZWOS40NjdjMC00Ljc2OC0zLjgxMi04LjYzNC04LjUxNC04LjYzNEgxMC44MDkgTTEwMy45NTMsMjMuMTYyaDYuOTc3di02Ljc0NGgtNi45NzdWOC40MjNsNy42NzYtMC4wMDJWMS45MjRIOTYuNzJ2MzMuMjc4YzAsMCw1LjIyNSwxLjE0MSw3LjUzMiwxLjY2NmMxLjUxNywwLjM0Niw3Ljc1MiwyLjI1Myw3Ljc1MiwyLjI1M3YtNy4wMTVsLTguMDUxLTEuNTA4VjIzLjE2MnogTTQ2Ljg3OSwxLjkyN2wwLjAwMywzMi4zNWw3LjEyMy0wLjg5NVYxOC45ODVsNS4xMjYsMTAuNDI2bDUuMTI2LTEwLjQ4NGwwLjAwMiwxMy42NjRsNy4wMjItMC4wNTRWMS44OTVoLTcuNTQ1TDU5LjEzLDE0LjZMNTQuNjYxLDEuOTI3SDQ2Ljg3OXpcXFwiLz48L3N2Zz5cXG5cdFx0PC9hPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJjYW1wZXItbGFiXFxcIj48YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmNhbXBlcl9sYWJfdXJsIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY2FtcGVyX2xhYiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwic2hvcC13cmFwcGVyXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzaG9wLXRpdGxlXFxcIj5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuc2hvcF90aXRsZSA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImdlbmRlci13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcIm1lblxcXCI+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX21lbl91cmwgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX21lbiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInNlcGFyYXRvclxcXCI+PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ3b21lblxcXCI+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX3dvbWVuX3VybCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLnNob3Bfd29tZW4gOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCI8L2E+PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJsYW5nLXdyYXBwZXIgYnRuXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJjdXJyZW50LWxhbmdcXFwiPlwiXG4gICAgKyBhbGlhczIoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5jdXJyZW50X2xhbmcgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmN1cnJlbnRfbGFuZyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiY3VycmVudF9sYW5nXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvZGl2Plxcblx0XHRcdDx1bCBjbGFzcz1cXFwiY291bnRyaWVzLXdyYXBwZXJcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuY291bnRyaWVzIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJlYWNoXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXHRcdFx0PC91bD5cXG5cdFx0PC9kaXY+XFxuXHQ8L2hlYWRlcj5cXG5cdDxmb290ZXIgaWQ9XFxcImZvb3RlclxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcImxlZ2FsXFxcIj48YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmxlZ2FsX3VybCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmxlZ2FsIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiPC9hPjwvZGl2Plxcblx0XHQ8dWwgaWQ9XFxcInNvY2lhbC13cmFwcGVyXFxcIj5cXG5cdFx0XHQ8bGk+XFxuXHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmZhY2Vib29rVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5mYWNlYm9va1VybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiZmFjZWJvb2tVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE2LjAwMiwwLjE2N2MtOC43NDYsMC0xNS44MzUsNy4wOS0xNS44MzUsMTUuODM0YzAsOC43NDYsNy4wODksMTUuODM1LDE1LjgzNSwxNS44MzVjOC43NDUsMCwxNS44MzQtNy4wODksMTUuODM0LTE1LjgzNUMzMS44MzYsNy4yNTcsMjQuNzQ3LDAuMTY3LDE2LjAwMiwwLjE2NyBNMjIuMzIyLDEzLjUzOWMwLjAwNywwLjEzOCwwLjAwOSwwLjI3OSwwLjAwOSwwLjQyYzAsNC4zMDItMy4yNzIsOS4yNTktOS4yNTksOS4yNTljLTEuODM3LDAtMy41NDctMC41MzktNC45ODctMS40NjFjMC4yNTMsMC4wMzEsMC41MTQsMC4wNDQsMC43NzYsMC4wNDRjMS41MjUsMCwyLjkyOC0wLjUyLDQuMDQyLTEuMzk0Yy0xLjQyNC0wLjAyMy0yLjYyNS0wLjk2NS0zLjAzOS0yLjI1OGMwLjE5OCwwLjAzNywwLjQwMiwwLjA1OCwwLjYxMSwwLjA1OGMwLjI5OCwwLDAuNTg1LTAuMDM4LDAuODU4LTAuMTE1Yy0xLjQ4OS0wLjI5Ny0yLjYxMi0xLjYxMi0yLjYxMi0zLjE4OXYtMC4wNDFjMC40NCwwLjI0MiwwLjk0MiwwLjM4OSwxLjQ3NSwwLjQwN2MtMC44NzMtMC41ODUtMS40NDctMS41ODEtMS40NDctMi43MDljMC0wLjU5NywwLjE2LTEuMTU1LDAuNDQxLTEuNjM4YzEuNjA1LDEuOTcsNC4wMDMsMy4yNjQsNi43MDgsMy40Yy0wLjA1Ny0wLjIzOC0wLjA4NS0wLjQ4NS0wLjA4NS0wLjc0YzAtMS43OTcsMS40NTgtMy4yNTQsMy4yNTQtMy4yNTRjMC45MzcsMCwxLjc4MywwLjM5NSwyLjM3NSwxLjAyOGMwLjc0Mi0wLjE0NiwxLjQzOC0wLjQxNywyLjA2Ny0wLjc4OWMtMC4yNDIsMC43NTktMC43NTksMS4zOTYtMS40MzIsMS43OTljMC42NTgtMC4wNzksMS4yODYtMC4yNTMsMS44NjktMC41MTFDMjMuNTExLDEyLjUwNywyMi45NTksMTMuMDc5LDIyLjMyMiwxMy41MzlcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdDwvYT5cXG5cdFx0XHQ8L2xpPlxcblx0XHRcdDxsaT5cXG5cdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudHdpdHRlclVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudHdpdHRlclVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwidHdpdHRlclVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTYuMDAxLDAuMTY3Yy04Ljc0NSwwLTE1LjgzNCw3LjA5LTE1LjgzNCwxNS44MzRjMCw4Ljc0NSw3LjA4OSwxNS44MzUsMTUuODM0LDE1LjgzNWM4Ljc0NSwwLDE1LjgzNC03LjA5LDE1LjgzNC0xNS44MzVDMzEuODM2LDcuMjU3LDI0Ljc0NiwwLjE2NywxNi4wMDEsMC4xNjcgTTE5LjQ5OCwxMy4zMmwtMC4xODQsMi4zNjloLTIuNDI3djguMjI5aC0zLjA2OHYtOC4yMjloLTEuNjM4VjEzLjMyaDEuNjM4di0xLjU5MmMwLTAuNzAxLDAuMDE3LTEuNzgyLDAuNTI3LTIuNDUzYzAuNTM2LTAuNzA5LDEuMjczLTEuMTkxLDIuNTQxLTEuMTkxYzIuMDY2LDAsMi45MzUsMC4yOTUsMi45MzUsMC4yOTVsLTAuNDEsMi40MjVjMCwwLTAuNjgyLTAuMTk2LTEuMzE4LTAuMTk2Yy0wLjYzNywwLTEuMjA3LDAuMjI3LTEuMjA3LDAuODYzdjEuODVIMTkuNDk4elxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0PC9hPlxcblx0XHRcdDwvbGk+XFxuXHRcdFx0PGxpPlxcblx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbnN0YWdyYW1VcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluc3RhZ3JhbVVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaW5zdGFncmFtVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xOS40MTMsMTIuNjAybC0wLjAwOS0yLjY4NmwyLjY4NS0wLjAwOHYyLjY4NEwxOS40MTMsMTIuNjAyeiBNMTYuMDA0LDE4Ljc4OGMxLjUzNiwwLDIuNzg3LTEuMjUsMi43ODctMi43ODdjMC0wLjYwNS0wLjE5Ni0xLjE2Ni0wLjUyOC0xLjYyNGMtMC41MDctMC43MDMtMS4zMjktMS4xNjMtMi4yNTktMS4xNjNjLTAuOTMxLDAtMS43NTMsMC40Ni0yLjI2LDEuMTYzYy0wLjMzLDAuNDU4LTAuNTI3LDEuMDE5LTAuNTI3LDEuNjI0QzEzLjIxNywxNy41MzgsMTQuNDY3LDE4Ljc4OCwxNi4wMDQsMTguNzg4eiBNMjAuMzMzLDE2LjAwMWMwLDIuMzg3LTEuOTQyLDQuMzMtNC4zMjksNC4zM2MtMi4zODgsMC00LjMyOS0xLjk0My00LjMyOS00LjMzYzAtMC41NzUsMC4xMTQtMS4xMjMsMC4zMTgtMS42MjRIOS42Mjl2Ni40ODFjMCwwLjgzNiwwLjY4MSwxLjUxOCwxLjUxOCwxLjUxOGg5LjcxNGMwLjgzNywwLDEuNTE3LTAuNjgyLDEuNTE3LTEuNTE4di02LjQ4MWgtMi4zNjNDMjAuMjE3LDE0Ljg3OCwyMC4zMzMsMTUuNDI2LDIwLjMzMywxNi4wMDF6IE0zMS44MzYsMTYuMDAxYzAsOC43NDQtNy4wOSwxNS44MzUtMTUuODM1LDE1LjgzNVMwLjE2NywyNC43NDUsMC4xNjcsMTYuMDAxYzAtOC43NDUsNy4wODktMTUuODM0LDE1LjgzNC0xNS44MzRTMzEuODM2LDcuMjU2LDMxLjgzNiwxNi4wMDF6IE0yMy45MjEsMTEuMTQ0YzAtMS42ODgtMS4zNzMtMy4wNi0zLjA2Mi0zLjA2aC05LjcxM2MtMS42ODcsMC0zLjA2LDEuMzcxLTMuMDYsMy4wNnY5LjcxNGMwLDEuNjg4LDEuMzczLDMuMDYsMy4wNiwzLjA2aDkuNzEzYzEuNjg4LDAsMy4wNjItMS4zNzIsMy4wNjItMy4wNlYxMS4xNDR6XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHQ8L2E+XFxuXHRcdFx0PC9saT5cXG5cdFx0PC91bD5cXG5cdDwvZm9vdGVyPlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBpZD0ncGFnZXMtY29udGFpbmVyJz5cXG5cdDxkaXYgaWQ9J3BhZ2UtYSc+PC9kaXY+XFxuXHQ8ZGl2IGlkPSdwYWdlLWInPjwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlciwgYWxpYXMxPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMyPVwiZnVuY3Rpb25cIiwgYWxpYXMzPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICByZXR1cm4gXCI8ZGl2IGNsYXNzPSdwYWdlLXdyYXBwZXInPlxcblx0PGRpdiBjbGFzcz1cXFwiaW50ZXJmYWNlXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwicHJldmlvdXMtYnRuIGJ0blxcXCI+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdDwvc3ZnPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblxcblx0PGRpdiBjbGFzcz1cXFwicHJvZHVjdC1jb250YWluZXJzLXdyYXBwZXJcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJwcm9kdWN0LWNvbnRhaW5lciBwcm9kdWN0LWNvbnRhaW5lci1hXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwb3N0ZXItd3JhcHBlclxcXCI+XFxuXHRcdFx0XHQ8aW1nIHNyYz1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzWydlbXB0eS1pbWFnZSddIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMFsnZW1wdHktaW1hZ2UnXSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiZW1wdHktaW1hZ2VcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ2aWRlby13cmFwcGVyXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtY29udGFpbmVyIHByb2R1Y3QtY29udGFpbmVyLWJcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInBvc3Rlci13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdDxpbWcgc3JjPVxcXCJcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnNbJ2VtcHR5LWltYWdlJ10gfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwWydlbXB0eS1pbWFnZSddIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJlbXB0eS1pbWFnZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInZpZGVvLXdyYXBwZXJcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdDxkaXYgY2xhc3M9XFxcImNvbXBhc3Nlcy10ZXh0cy13cmFwcGVyXFxcIj5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdDxkaXYgY2xhc3M9XFxcInNsaWRlc2hvdy10aXRsZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInBsYW5ldC10aXRsZVxcXCI+UExBTkVUPC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInBsYW5ldC1uYW1lXFxcIj5HRU1TVE9ORTwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG4gICAgXHRcbmNsYXNzIEdsb2JhbEV2ZW50cyB7XG5cdGluaXQoKSB7XG5cdFx0JCh3aW5kb3cpLm9uKCdyZXNpemUnLCB0aGlzLnJlc2l6ZSlcblx0XHQkKHdpbmRvdykub24oJ21vdXNlbW92ZScsIHRoaXMub25Nb3VzZU1vdmUpXG5cdFx0QXBwU3RvcmUuTW91c2UgPSBuZXcgUElYSS5Qb2ludCgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdEFwcEFjdGlvbnMud2luZG93UmVzaXplKHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQpXG5cdH1cblx0b25Nb3VzZU1vdmUoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdEFwcFN0b3JlLk1vdXNlLnggPSBlLnBhZ2VYXG5cdFx0QXBwU3RvcmUuTW91c2UueSA9IGUucGFnZVlcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBHbG9iYWxFdmVudHNcbiIsImltcG9ydCBvcCBmcm9tICdvYmplY3Rwb29sJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IFNwcmluZ0dhcmRlbiBmcm9tICdTcHJpbmdHYXJkZW4nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvb2wge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR2YXIgcGxhbmV0cyA9IEFwcFN0b3JlLnBsYW5ldHMoKVxuXHRcdHZhciBweENvbnRhaW5lck51bSA9IDIwICsgKHBsYW5ldHMubGVuZ3RoICogMSlcblx0XHR2YXIgZ3JhcGhpY3NOdW0gPSAocGxhbmV0cy5sZW5ndGggKiAzKSAtIDJcblx0XHR2YXIgc3ByaXRlc051bSA9IHBsYW5ldHMubGVuZ3RoXG5cdFx0dmFyIHNwcmluZ0dhcmRlbnNOdW0gPSAxMFxuXG5cdFx0dGhpcy50aW1lbGluZXMgPSBvcC5nZW5lcmF0ZShUaW1lbGluZU1heCwgeyBjb3VudDogMTAgfSlcblx0XHR0aGlzLnB4Q29udGFpbmVycyA9IG9wLmdlbmVyYXRlKFBJWEkuQ29udGFpbmVyLCB7IGNvdW50OiBweENvbnRhaW5lck51bSB9KVxuXHRcdHRoaXMuZ3JhcGhpY3MgPSBvcC5nZW5lcmF0ZShQSVhJLkdyYXBoaWNzLCB7IGNvdW50OiBncmFwaGljc051bSB9KVxuXHRcdHRoaXMuc3ByaXRlcyA9IG9wLmdlbmVyYXRlKFBJWEkuU3ByaXRlLCB7IGNvdW50OiBzcHJpdGVzTnVtIH0pXG5cdFx0dGhpcy5zcHJpbmdHYXJkZW5zID0gb3AuZ2VuZXJhdGUoU3ByaW5nR2FyZGVuLCB7IGNvdW50OiBzcHJpbmdHYXJkZW5zTnVtIH0pXG5cdH1cblx0Z2V0VGltZWxpbmUoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGltZWxpbmVzLmdldCgpXG5cdH1cblx0cmVsZWFzZVRpbWVsaW5lKGl0ZW0pIHtcblx0XHR0aGlzLnRpbWVsaW5lcy5yZWxlYXNlKGl0ZW0pXG5cdH1cblx0Z2V0Q29udGFpbmVyKCkge1xuXHRcdHZhciBjb250YWluZXIgPSB0aGlzLnB4Q29udGFpbmVycy5nZXQoKVxuXHRcdGNvbnRhaW5lci5zY2FsZS54ID0gMVxuXHRcdGNvbnRhaW5lci5zY2FsZS55ID0gMVxuXHRcdGNvbnRhaW5lci5wb3NpdGlvbi54ID0gMFxuXHRcdGNvbnRhaW5lci5wb3NpdGlvbi55ID0gMFxuXHRcdGNvbnRhaW5lci5za2V3LnggPSAwXG5cdFx0Y29udGFpbmVyLnNrZXcueSA9IDBcblx0XHRjb250YWluZXIucGl2b3QueCA9IDBcblx0XHRjb250YWluZXIucGl2b3QueSA9IDBcblx0XHRjb250YWluZXIucm90YXRpb24gPSAwXG5cdFx0cmV0dXJuIGNvbnRhaW5lclxuXHR9XG5cdHJlbGVhc2VDb250YWluZXIoaXRlbSkge1xuXHRcdHRoaXMucHhDb250YWluZXJzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRHcmFwaGljcygpIHtcblx0XHR2YXIgZyA9IHRoaXMuZ3JhcGhpY3MuZ2V0KClcblx0XHRnLmNsZWFyKClcblx0XHRnLnNjYWxlLnggPSAxXG5cdFx0Zy5zY2FsZS55ID0gMVxuXHRcdGcucG9zaXRpb24ueCA9IDBcblx0XHRnLnBvc2l0aW9uLnkgPSAwXG5cdFx0Zy5za2V3LnggPSAwXG5cdFx0Zy5za2V3LnkgPSAwXG5cdFx0Zy5waXZvdC54ID0gMFxuXHRcdGcucGl2b3QueSA9IDBcblx0XHRnLnJvdGF0aW9uID0gMFxuXHRcdHJldHVybiBnXG5cdH1cblx0cmVsZWFzZUdyYXBoaWNzKGl0ZW0pIHtcblx0XHR0aGlzLmdyYXBoaWNzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRTcHJpdGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3ByaXRlcy5nZXQoKVxuXHR9XG5cdHJlbGVhc2VTcHJpdGUoaXRlbSkge1xuXHRcdHRoaXMuc3ByaXRlcy5yZWxlYXNlKGl0ZW0pXG5cdH1cblx0Z2V0U3ByaW5nR2FyZGVuKCkge1xuXHRcdHJldHVybiB0aGlzLnNwcmluZ0dhcmRlbnMuZ2V0KClcblx0fVxuXHRyZWxlYXNlU3ByaW5nR2FyZGVuKGl0ZW0pIHtcblx0XHR0aGlzLnNwcmluZ0dhcmRlbnMucmVsZWFzZShpdGVtKVxuXHR9XG59XG4iLCJjbGFzcyBQcmVsb2FkZXIgIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5xdWV1ZSA9IG5ldyBjcmVhdGVqcy5Mb2FkUXVldWUoKVxuXHRcdHRoaXMucXVldWUub24oXCJjb21wbGV0ZVwiLCB0aGlzLm9uTWFuaWZlc3RMb2FkQ29tcGxldGVkLCB0aGlzKVxuXHRcdHRoaXMuY3VycmVudExvYWRlZENhbGxiYWNrID0gdW5kZWZpbmVkXG5cdH1cblx0bG9hZChtYW5pZmVzdCwgb25Mb2FkZWQpIHtcblx0XHR0aGlzLmN1cnJlbnRMb2FkZWRDYWxsYmFjayA9IG9uTG9hZGVkXG4gICAgICAgIHRoaXMucXVldWUubG9hZE1hbmlmZXN0KG1hbmlmZXN0KVxuXHR9XG5cdG9uTWFuaWZlc3RMb2FkQ29tcGxldGVkKCkge1xuXHRcdHRoaXMuY3VycmVudExvYWRlZENhbGxiYWNrKClcblx0fVxuXHRnZXRDb250ZW50QnlJZChpZCkge1xuXHRcdHJldHVybiB0aGlzLnF1ZXVlLmdldFJlc3VsdChpZClcblx0fVxuXHRnZXRTdmcoaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5nZXRDb250ZW50QnlJZChpZCtcIi1zdmdcIilcblx0fVxuXHRnZXRJbWFnZVVSTChpZCkge1xuXHRcdHJldHVybiB0aGlzLmdldENvbnRlbnRCeUlkKGlkKS5nZXRBdHRyaWJ1dGUoXCJzcmNcIilcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQcmVsb2FkZXJcbiIsImltcG9ydCBkYXRhIGZyb20gJ0dsb2JhbERhdGEnXG5pbXBvcnQgaGFzaGVyIGZyb20gJ2hhc2hlcidcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgY3Jvc3Nyb2FkcyBmcm9tICdjcm9zc3JvYWRzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5jbGFzcyBSb3V0ZXIge1xuXHRpbml0KCkge1xuXHRcdHRoaXMucm91dGluZyA9IGRhdGEucm91dGluZ1xuXHRcdHRoaXMuZGVmYXVsdFJvdXRlID0gdGhpcy5yb3V0aW5nWycvJ11cblx0XHR0aGlzLm5ld0hhc2hGb3VuZGVkID0gZmFsc2Vcblx0XHRoYXNoZXIubmV3SGFzaCA9IHVuZGVmaW5lZFxuXHRcdGhhc2hlci5vbGRIYXNoID0gdW5kZWZpbmVkXG5cdFx0aGFzaGVyLnByZXBlbmRIYXNoID0gJyEnXG5cdFx0aGFzaGVyLmluaXRpYWxpemVkLmFkZCh0aGlzLl9kaWRIYXNoZXJDaGFuZ2UuYmluZCh0aGlzKSlcblx0XHRoYXNoZXIuY2hhbmdlZC5hZGQodGhpcy5fZGlkSGFzaGVyQ2hhbmdlLmJpbmQodGhpcykpXG5cdFx0dGhpcy5fc2V0dXBDcm9zc3JvYWRzKClcblx0fVxuXHRiZWdpblJvdXRpbmcoKSB7XG5cdFx0aGFzaGVyLmluaXQoKVxuXHR9XG5cdF9zZXR1cENyb3Nzcm9hZHMoKSB7XG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHR2YXIgYmFzaWNTZWN0aW9uID0gY3Jvc3Nyb2Fkcy5hZGRSb3V0ZSgne3BhZ2V9JywgdGhpcy5fb25GaXJzdERlZ3JlZVVSTEhhbmRsZXIuYmluZCh0aGlzKSwgMylcblx0XHRiYXNpY1NlY3Rpb24ucnVsZXMgPSB7XG5cdCAgICAgICAgcGFnZSA6IFsnbGFuZGluZyddIC8vdmFsaWQgc2VjdGlvbnNcblx0ICAgIH1cblx0ICAgIHZhciBwbGFuZXRQcm9kdWN0U2VjdGlvbiA9IGNyb3Nzcm9hZHMuYWRkUm91dGUoJy9wbGFuZXQve3BsYW5ldElkfS97cHJvZHVjdElkfScsIHRoaXMuX29uUGxhbmV0UHJvZHVjdFVSTEhhbmRsZXIuYmluZCh0aGlzKSwgMilcblx0ICAgIHBsYW5ldFByb2R1Y3RTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgXHRwbGFuZXRJZDogcGxhbmV0cyxcblx0ICAgIFx0cHJvZHVjdElkIDogL15bMC01XS9cblx0ICAgIH1cblx0ICAgIHZhciBwbGFuZXRTZWN0aW9uID0gY3Jvc3Nyb2Fkcy5hZGRSb3V0ZSgnL3BsYW5ldC97cGxhbmV0SWR9JywgdGhpcy5fb25QbGFuZXRVUkxIYW5kbGVyLmJpbmQodGhpcyksIDIpXG5cdCAgICBwbGFuZXRTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgXHRwbGFuZXRJZDogcGxhbmV0c1xuXHQgICAgfVxuXHR9XG5cdF9vbkZpcnN0RGVncmVlVVJMSGFuZGxlcihwYWdlSWQpIHtcblx0XHR0aGlzLl9hc3NpZ25Sb3V0ZShwYWdlSWQpXG5cdH1cblx0X29uUGxhbmV0UHJvZHVjdFVSTEhhbmRsZXIocGxhbmV0SWQsIHByb2R1Y3RJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHByb2R1Y3RJZClcblx0fVxuXHRfb25QbGFuZXRVUkxIYW5kbGVyKHBsYW5ldElkKSB7XG5cdFx0dGhpcy5fYXNzaWduUm91dGUocGxhbmV0SWQpXG5cdH1cblx0X29uQmxvZ1Bvc3RVUkxIYW5kbGVyKHBvc3RJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHBvc3RJZClcblx0fVxuXHRfb25EZWZhdWx0VVJMSGFuZGxlcigpIHtcblx0XHR0aGlzLl9zZW5kVG9EZWZhdWx0KClcblx0fVxuXHRfYXNzaWduUm91dGUoaWQpIHtcblx0XHR2YXIgaGFzaCA9IGhhc2hlci5nZXRIYXNoKClcblx0XHR2YXIgcGFydHMgPSB0aGlzLl9nZXRVUkxQYXJ0cyhoYXNoKVxuXHRcdHRoaXMuX3VwZGF0ZVBhZ2VSb3V0ZShoYXNoLCBwYXJ0cywgcGFydHNbMF0sIGlkKVxuXHRcdHRoaXMubmV3SGFzaEZvdW5kZWQgPSB0cnVlXG5cdH1cblx0X2dldFVSTFBhcnRzKHVybCkge1xuXHRcdHZhciBoYXNoID0gdXJsXG5cdFx0aGFzaCA9IGhhc2guc3Vic3RyKDEpXG5cdFx0cmV0dXJuIGhhc2guc3BsaXQoJy8nKVxuXHR9XG5cdF91cGRhdGVQYWdlUm91dGUoaGFzaCwgcGFydHMsIHBhcmVudCwgdGFyZ2V0SWQpIHtcblx0XHRoYXNoZXIub2xkSGFzaCA9IGhhc2hlci5uZXdIYXNoXG5cdFx0aGFzaGVyLm5ld0hhc2ggPSB7XG5cdFx0XHRoYXNoOiBoYXNoLFxuXHRcdFx0cGFydHM6IHBhcnRzLFxuXHRcdFx0cGFyZW50OiBwYXJlbnQsXG5cdFx0XHR0YXJnZXRJZDogdGFyZ2V0SWRcblx0XHR9XG5cdFx0QXBwQWN0aW9ucy5wYWdlSGFzaGVyQ2hhbmdlZCgpXG5cdH1cblx0X2RpZEhhc2hlckNoYW5nZShuZXdIYXNoLCBvbGRIYXNoKSB7XG5cdFx0dGhpcy5uZXdIYXNoRm91bmRlZCA9IGZhbHNlXG5cdFx0Y3Jvc3Nyb2Fkcy5wYXJzZShuZXdIYXNoKVxuXHRcdGlmKHRoaXMubmV3SGFzaEZvdW5kZWQpIHJldHVyblxuXHRcdC8vIElmIFVSTCBkb24ndCBtYXRjaCBhIHBhdHRlcm4sIHNlbmQgdG8gZGVmYXVsdFxuXHRcdHRoaXMuX29uRGVmYXVsdFVSTEhhbmRsZXIoKVxuXHR9XG5cdF9zZW5kVG9EZWZhdWx0KCkge1xuXHRcdGhhc2hlci5zZXRIYXNoKEFwcFN0b3JlLmRlZmF1bHRSb3V0ZSgpKVxuXHR9XG5cdHN0YXRpYyBnZXRCYXNlVVJMKCkge1xuXHRcdHJldHVybiBkb2N1bWVudC5VUkwuc3BsaXQoXCIjXCIpWzBdXG5cdH1cblx0c3RhdGljIGdldEhhc2goKSB7XG5cdFx0cmV0dXJuIGhhc2hlci5nZXRIYXNoKClcblx0fVxuXHRzdGF0aWMgZ2V0Um91dGVzKCkge1xuXHRcdHJldHVybiBkYXRhLnJvdXRpbmdcblx0fVxuXHRzdGF0aWMgZ2V0TmV3SGFzaCgpIHtcblx0XHRyZXR1cm4gaGFzaGVyLm5ld0hhc2hcblx0fVxuXHRzdGF0aWMgZ2V0T2xkSGFzaCgpIHtcblx0XHRyZXR1cm4gaGFzaGVyLm9sZEhhc2hcblx0fVxuXHRzdGF0aWMgc2V0SGFzaChoYXNoKSB7XG5cdFx0aGFzaGVyLnNldEhhc2goaGFzaClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBSb3V0ZXJcbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5mdW5jdGlvbiBfZ2V0VGltZWxpbmUoYXJncykge1xuXHR2YXIgdGwgPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdHRsLmV2ZW50Q2FsbGJhY2soXCJvbkNvbXBsZXRlXCIsIGFyZ3Mub25Db21wbGV0ZSlcblx0cmV0dXJuIHRsXG59XG5cbnZhciBUcmFuc2l0aW9uQW5pbWF0aW9ucyA9IHtcblxuXHQvLyBFWFBFUklFTkNFIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0J2V4cGVyaWVuY2UtaW4nOiBmdW5jdGlvbihzY29wZSwgYXJncykge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgdGltZWxpbmUgPSBfZ2V0VGltZWxpbmUoYXJncylcblxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMub2xkVHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTp3aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHg6d2luZG93VywgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHg6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB4OndpbmRvd1csIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB4OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkNBTVBBSUdOOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5Oi13aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHRcdHJldHVybiB0aW1lbGluZVxuXHR9LFxuXHQnZXhwZXJpZW5jZS1vdXQnOiBmdW5jdGlvbihzY29wZSwgYXJncykge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgdGltZWxpbmUgPSBfZ2V0VGltZWxpbmUoYXJncylcblxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR0aW1lbGluZS50byh3cmFwcGVyLCAxLCB7IG9wYWNpdHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9KVxuXHRcdFxuXHRcdHN3aXRjaCh0eXBlcy5uZXdUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxBTkRJTkc6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeDowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeDotd2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB4OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB4Oi13aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTotd2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0XHRyZXR1cm4gdGltZWxpbmVcblx0fSxcblxuXHQvLyBDQU1QQUlHTiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCdjYW1wYWlnbi1pbic6IGZ1bmN0aW9uKHNjb3BlLCBhcmdzKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB0aW1lbGluZSA9IF9nZXRUaW1lbGluZShhcmdzKVxuXG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0c3dpdGNoKHR5cGVzLm9sZFR5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OndpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OndpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTp3aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHRcdHJldHVybiB0aW1lbGluZVxuXHR9LFxuXHQnY2FtcGFpZ24tb3V0JzogZnVuY3Rpb24oc2NvcGUsIGFyZ3MpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHRpbWVsaW5lID0gX2dldFRpbWVsaW5lKGFyZ3MpXG5cblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMubmV3VHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdFx0cmV0dXJuIHRpbWVsaW5lXG5cdH0sXG5cblx0Ly8gTEFORElORyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCdsYW5kaW5nLWluJzogZnVuY3Rpb24oc2NvcGUsIGFyZ3MpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHRpbWVsaW5lID0gX2dldFRpbWVsaW5lKGFyZ3MpXG5cblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMub2xkVHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTotd2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuQ0FNUEFJR046XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdFx0cmV0dXJuIHRpbWVsaW5lXG5cdH0sXG5cdCdsYW5kaW5nLW91dCc6IGZ1bmN0aW9uKHNjb3BlLCBhcmdzKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB0aW1lbGluZSA9IF9nZXRUaW1lbGluZShhcmdzKVxuXG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHN3aXRjaCh0eXBlcy5uZXdUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLnRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUudG8od3JhcHBlciwgMSwgeyB5Oi13aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUudG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS50byh3cmFwcGVyLCAxLCB7IHk6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdFx0cmV0dXJuIHRpbWVsaW5lXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVHJhbnNpdGlvbkFuaW1hdGlvbnNcbiIsImltcG9ydCBBcHBEaXNwYXRjaGVyIGZyb20gJ0FwcERpc3BhdGNoZXInXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCB7RXZlbnRFbWl0dGVyMn0gZnJvbSAnZXZlbnRlbWl0dGVyMidcbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbidcbmltcG9ydCBkYXRhIGZyb20gJ0dsb2JhbERhdGEnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcblxuZnVuY3Rpb24gX2dldFBhZ2VDb250ZW50KCkge1xuICAgIHZhciBzY29wZSA9IF9nZXRQYWdlSWQoKVxuICAgIHZhciBsYW5nQ29udGVudCA9IF9nZXRDb250ZW50QnlMYW5nKEFwcFN0b3JlLmxhbmcoKSlcbiAgICB2YXIgcGFnZUNvbnRlbnQgPSBsYW5nQ29udGVudFtzY29wZV1cbiAgICByZXR1cm4gcGFnZUNvbnRlbnRcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlSWQoKSB7XG4gICAgcmV0dXJuIF9nZXRDb250ZW50U2NvcGUoKS5pZFxufVxuZnVuY3Rpb24gX2dldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKSB7XG4gICAgdmFyIG5ld0hhc2hlciA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICB2YXIgb2xkSGFzaGVyID0gUm91dGVyLmdldE9sZEhhc2goKVxuICAgIHJldHVybiB7IG5ld1R5cGU6IF9nZXRUeXBlT2ZQYWdlKG5ld0hhc2hlciksIG9sZFR5cGU6IF9nZXRUeXBlT2ZQYWdlKG9sZEhhc2hlcikgfVxufVxuZnVuY3Rpb24gX2dldFR5cGVPZlBhZ2UoaGFzaCkge1xuICAgIHZhciBoID0gaGFzaCB8fCBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG4gICAgaWYoaCA9PSB1bmRlZmluZWQpIHJldHVybiBBcHBDb25zdGFudHMuTk9ORVxuICAgIGlmKGgucGFydHMubGVuZ3RoID09IDMpIHJldHVybiBBcHBDb25zdGFudHMuQ0FNUEFJR05cbiAgICBlbHNlIGlmKGgucGFydHMubGVuZ3RoID09IDIpIHJldHVybiBBcHBDb25zdGFudHMuRVhQRVJJRU5DRVxuICAgIGVsc2UgcmV0dXJuIEFwcENvbnN0YW50cy5MQU5ESU5HXG59XG5mdW5jdGlvbiBfZ2V0Q29udGVudFNjb3BlKCkge1xuICAgIHZhciBoYXNoT2JqID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgIHZhciByb3V0ZVNjb3BlO1xuICAgIGlmKGhhc2hPYmoucGFydHMubGVuZ3RoID4gMikge1xuICAgICAgICB2YXIgcGFyZW50UGF0aCA9IGhhc2hPYmouaGFzaC5yZXBsYWNlKCcvJytoYXNoT2JqLnRhcmdldElkLCAnJylcbiAgICAgICAgcm91dGVTY29wZSA9IEFwcFN0b3JlLmdldFJvdXRlUGF0aFNjb3BlQnlJZChwYXJlbnRQYXRoKVxuICAgIH1lbHNle1xuICAgICAgICByb3V0ZVNjb3BlID0gQXBwU3RvcmUuZ2V0Um91dGVQYXRoU2NvcGVCeUlkKGhhc2hPYmouaGFzaClcbiAgICB9XG4gICAgcmV0dXJuIHJvdXRlU2NvcGVcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlQXNzZXRzVG9Mb2FkKCkge1xuICAgIHZhciBzY29wZSA9IF9nZXRDb250ZW50U2NvcGUoKVxuICAgIHZhciBoYXNoT2JqID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgIHZhciB0YXJnZXRJZDtcbiAgICB2YXIgdHlwZSA9IF9nZXRUeXBlT2ZQYWdlKClcbiAgICB0YXJnZXRJZCA9IHR5cGUudG9Mb3dlckNhc2UoKSArICctYXNzZXRzJ1xuICAgIHZhciBtYW5pZmVzdCA9IF9hZGRCYXNlUGF0aHNUb1VybHMoc2NvcGVbdGFyZ2V0SWRdLCBzY29wZS5pZCwgdGFyZ2V0SWQsIHR5cGUpXG4gICAgcmV0dXJuIG1hbmlmZXN0XG59XG5mdW5jdGlvbiBfYWRkQmFzZVBhdGhzVG9VcmxzKHVybHMsIHBhZ2VJZCwgdGFyZ2V0SWQsIHR5cGUpIHtcbiAgICB2YXIgYmFzZVBhdGggPSBfZ2V0UGFnZUFzc2V0c0Jhc2VQYXRoQnlJZChwYWdlSWQsIHRhcmdldElkKVxuICAgIHZhciBtYW5pZmVzdCA9IFtdXG4gICAgaWYodXJscyA9PSB1bmRlZmluZWQgfHwgdXJscy5sZW5ndGggPCAxKSByZXR1cm4gbWFuaWZlc3RcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHVybHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNwbGl0dGVyID0gdXJsc1tpXS5zcGxpdCgnLicpXG4gICAgICAgIHZhciBmaWxlTmFtZSA9IHNwbGl0dGVyWzBdXG4gICAgICAgIHZhciBleHRlbnNpb24gPSBzcGxpdHRlclsxXVxuICAgICAgICBtYW5pZmVzdFtpXSA9IHtcbiAgICAgICAgICAgIGlkOiBwYWdlSWQgKyAnLScgKyB0eXBlLnRvTG93ZXJDYXNlKCkgKyAnLScgKyBmaWxlTmFtZSxcbiAgICAgICAgICAgIHNyYzogYmFzZVBhdGggKyBmaWxlTmFtZSArICcuJyArIGV4dGVuc2lvblxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYW5pZmVzdFxufVxuZnVuY3Rpb24gX2dldFBhZ2VBc3NldHNCYXNlUGF0aEJ5SWQoaWQsIGFzc2V0R3JvdXBJZCkge1xuICAgIHJldHVybiBBcHBTdG9yZS5iYXNlTWVkaWFQYXRoKCkgKyAnL2ltYWdlL3BsYW5ldHMvJyArIGlkICsgJy8nICsgYXNzZXRHcm91cElkICsgJy8nXG59XG5mdW5jdGlvbiBfZ2V0TWVudUNvbnRlbnQoKSB7XG4gICAgcmV0dXJuIGRhdGEubWVudVxufVxuZnVuY3Rpb24gX2dldENvbnRlbnRCeUxhbmcobGFuZykge1xuICAgIHJldHVybiBkYXRhLmxhbmdbbGFuZ11cbn1cbmZ1bmN0aW9uIF9nZXRHZW5lcmFsSW5mb3MoKSB7XG4gICAgcmV0dXJuIGRhdGEuaW5mb3MubGFuZ1tBcHBTdG9yZS5sYW5nKCldXG59XG5mdW5jdGlvbiBfZ2V0QXBwRGF0YSgpIHtcbiAgICByZXR1cm4gZGF0YVxufVxuZnVuY3Rpb24gX2dldERlZmF1bHRSb3V0ZSgpIHtcbiAgICByZXR1cm4gZGF0YVsnZGVmYXVsdC1yb3V0ZSddXG59XG5mdW5jdGlvbiBfZ2V0R2xvYmFsQ29udGVudCgpIHtcbiAgICB2YXIgbGFuZ0NvbnRlbnQgPSBfZ2V0Q29udGVudEJ5TGFuZyhBcHBTdG9yZS5sYW5nKCkpXG4gICAgcmV0dXJuIGxhbmdDb250ZW50WydnbG9iYWwnXVxufVxuZnVuY3Rpb24gX3dpbmRvd1dpZHRoSGVpZ2h0KCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHc6IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICBoOiB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICB9XG59XG52YXIgQXBwU3RvcmUgPSBhc3NpZ24oe30sIEV2ZW50RW1pdHRlcjIucHJvdG90eXBlLCB7XG4gICAgZW1pdENoYW5nZTogZnVuY3Rpb24odHlwZSwgaXRlbSkge1xuICAgICAgICB0aGlzLmVtaXQodHlwZSwgaXRlbSlcbiAgICB9LFxuICAgIHBhZ2VDb250ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRQYWdlQ29udGVudCgpXG4gICAgfSxcbiAgICBtZW51Q29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0TWVudUNvbnRlbnQoKVxuICAgIH0sXG4gICAgY291bnRyaWVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuY291bnRyaWVzXG4gICAgfSxcbiAgICBhcHBEYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRBcHBEYXRhKClcbiAgICB9LFxuICAgIGxhbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gSlNfbGFuZ1xuICAgIH0sXG4gICAgZGVmYXVsdFJvdXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXREZWZhdWx0Um91dGUoKVxuICAgIH0sXG4gICAgZ2xvYmFsQ29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0R2xvYmFsQ29udGVudCgpXG4gICAgfSxcbiAgICBnZW5lcmFsSW5mb3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGF0YS5pbmZvc1xuICAgIH0sXG4gICAgZ2VuZXJhbEluZm9zTGFuZ1Njb3BlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRHZW5lcmFsSW5mb3MoKVxuICAgIH0sXG4gICAgZ2V0RW1wdHlJbWdVcmw6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuZ2V0RW52aXJvbm1lbnQoKS5zdGF0aWMgKyAnL2ltYWdlL2VtcHR5LnBuZydcbiAgICB9LFxuICAgIG1haW5JbWFnZVVybDogZnVuY3Rpb24oaWQsIHJlc3BvbnNpdmVBcnJheSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuYmFzZU1lZGlhUGF0aCgpICsgJy9pbWFnZS9wbGFuZXRzLycgKyBpZCArICcvbWFpbi0nICsgQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlV2lkdGgocmVzcG9uc2l2ZUFycmF5KSArICcuanBnJ1xuICAgIH0sXG4gICAgYmFzZU1lZGlhUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5nZXRFbnZpcm9ubWVudCgpLnN0YXRpY1xuICAgIH0sXG4gICAgZ2V0Um91dGVQYXRoU2NvcGVCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gZGF0YS5yb3V0aW5nW2lkXVxuICAgIH0sXG4gICAgZ2V0UGFnZUlkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRQYWdlSWQoKVxuICAgIH0sXG4gICAgZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG4gICAgfSxcbiAgICBnZXRUeXBlT2ZQYWdlOiBmdW5jdGlvbihoYXNoKSB7XG4gICAgICAgIHJldHVybiBfZ2V0VHlwZU9mUGFnZShoYXNoKVxuICAgIH0sXG4gICAgZ2V0RW52aXJvbm1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwQ29uc3RhbnRzLkVOVklST05NRU5UU1tFTlZdXG4gICAgfSxcbiAgICBnZXRMaW5lV2lkdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gM1xuICAgIH0sXG4gICAgcGFnZUFzc2V0c1RvTG9hZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0UGFnZUFzc2V0c1RvTG9hZCgpXG4gICAgfSxcbiAgICByZXNwb25zaXZlSW1hZ2VXaWR0aDogZnVuY3Rpb24ocmVzcG9uc2l2ZUFycmF5KSB7XG4gICAgICAgIHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93LndcbiAgICAgICAgcmV0dXJuIFV0aWxzLkNsb3Nlc3QocmVzcG9uc2l2ZUFycmF5LCB3aW5kb3dXKVxuICAgIH0sXG4gICAgcmVzcG9uc2l2ZUltYWdlU2l6ZTogZnVuY3Rpb24ocmVzcG9uc2l2ZUFycmF5LCBiYXNlV2lkdGgsIGJhc2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIGJhc2VXID0gYmFzZVdpZHRoIHx8IEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfV1xuICAgICAgICB2YXIgYmFzZUggPSBiYXNlSGVpZ2h0IHx8IEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfSFxuICAgICAgICB2YXIgcmVzcG9uc2l2ZVdpZHRoID0gQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlV2lkdGgocmVzcG9uc2l2ZUFycmF5KVxuICAgICAgICB2YXIgc2NhbGUgPSAocmVzcG9uc2l2ZVdpZHRoIC8gYmFzZVcpICogMVxuICAgICAgICB2YXIgcmVzcG9uc2l2ZUhlaWdodCA9IGJhc2VIICogc2NhbGVcbiAgICAgICAgcmV0dXJuIFsgcmVzcG9uc2l2ZVdpZHRoLCByZXNwb25zaXZlSGVpZ2h0IF1cbiAgICB9LFxuICAgIHBsYW5ldHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGF0YS5wbGFuZXRzXG4gICAgfSxcbiAgICBlbGVtZW50c09mTmF0dXJlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuZWxlbWVudHNcbiAgICB9LFxuICAgIGFsbEdlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmdlbmRlclxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGFbJ3Byb2R1Y3RzLWRhdGEnXVxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhQnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGEoKVxuICAgICAgICByZXR1cm4gZGF0YVtpZF1cbiAgICB9LFxuICAgIGdldFNwZWNpZmljUHJvZHVjdEJ5SWQ6IGZ1bmN0aW9uKHBsYW5ldElkLCBwcm9kdWN0SWQpIHtcbiAgICAgICAgdmFyIHBsYW5ldFByb2R1Y3RzID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZChwbGFuZXRJZClcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRQcm9kdWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYocHJvZHVjdElkID09IHBsYW5ldFByb2R1Y3RzW2ldLmlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBsYW5ldFByb2R1Y3RzW2ldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFdpbmRvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfd2luZG93V2lkdGhIZWlnaHQoKVxuICAgIH0sXG4gICAgYWRkUFhDaGlsZDogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBBcHBTdG9yZS5QWENvbnRhaW5lci5hZGQoaXRlbS5jaGlsZClcbiAgICB9LFxuICAgIHJlbW92ZVBYQ2hpbGQ6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgQXBwU3RvcmUuUFhDb250YWluZXIucmVtb3ZlKGl0ZW0uY2hpbGQpXG4gICAgfSxcbiAgICBnZXRUaW1lbGluZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldFRpbWVsaW5lKClcbiAgICB9LFxuICAgIHJlbGVhc2VUaW1lbGluZTogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlVGltZWxpbmUoaXRlbSlcbiAgICB9LFxuICAgIGdldENvbnRhaW5lcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldENvbnRhaW5lcigpXG4gICAgfSxcbiAgICByZWxlYXNlQ29udGFpbmVyOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VDb250YWluZXIoaXRlbSlcbiAgICB9LFxuICAgIGdldEdyYXBoaWNzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wuZ2V0R3JhcGhpY3MoKVxuICAgIH0sXG4gICAgcmVsZWFzZUdyYXBoaWNzOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VHcmFwaGljcyhpdGVtKVxuICAgIH0sXG4gICAgZ2V0U3ByaXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wuZ2V0U3ByaXRlKClcbiAgICB9LFxuICAgIHJlbGVhc2VTcHJpdGU6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVNwcml0ZShpdGVtKVxuICAgIH0sXG4gICAgZ2V0U3ByaW5nR2FyZGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wuZ2V0U3ByaW5nR2FyZGVuKClcbiAgICB9LFxuICAgIHJlbGVhc2VTcHJpbmdHYXJkZW46IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVNwcmluZ0dhcmRlbihpdGVtKVxuICAgIH0sXG4gICAgUG9vbDogdW5kZWZpbmVkLFxuICAgIFByZWxvYWRlcjogdW5kZWZpbmVkLFxuICAgIE1vdXNlOiB1bmRlZmluZWQsXG4gICAgUFhDb250YWluZXI6IHVuZGVmaW5lZCxcbiAgICBPcmllbnRhdGlvbjogQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSxcbiAgICBkaXNwYXRjaGVySW5kZXg6IEFwcERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCl7XG4gICAgICAgIHZhciBhY3Rpb24gPSBwYXlsb2FkLmFjdGlvblxuICAgICAgICBzd2l0Y2goYWN0aW9uLmFjdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQ6XG5cbiAgICAgICAgICAgICAgICAvLyBUcnkgdG8gY2F0Y2ggdGhlIGludGVybmFsIGhhc2ggY2hhbmdlIGZvciB0aGUgMyBwYXJ0cyBwYWdlcyBleC4gL3BsYW5ldC93b29kLzBcbiAgICAgICAgICAgICAgICB2YXIgbmV3SGFzaGVyID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgICAgICAgICAgICAgIHZhciBvbGRIYXNoZXIgPSBSb3V0ZXIuZ2V0T2xkSGFzaCgpXG4gICAgICAgICAgICAgICAgdmFyIGFjdGlvblR5cGUgPSBBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRFxuICAgICAgICAgICAgICAgIGlmKG9sZEhhc2hlciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobmV3SGFzaGVyLnBhcnRzLmxlbmd0aCA9PSAzICYmIG9sZEhhc2hlci5wYXJ0cy5sZW5ndGggPT0gMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uVHlwZSA9IEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuV0lORE9XX1JFU0laRTpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5XaW5kb3cudyA9IGFjdGlvbi5pdGVtLndpbmRvd1dcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5XaW5kb3cuaCA9IGFjdGlvbi5pdGVtLndpbmRvd0hcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5PcmllbnRhdGlvbiA9IChBcHBTdG9yZS5XaW5kb3cudyA+IEFwcFN0b3JlLldpbmRvdy5oKSA/IEFwcENvbnN0YW50cy5MQU5EU0NBUEUgOiBBcHBDb25zdGFudHMuUE9SVFJBSVRcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5lbWl0Q2hhbmdlKGFjdGlvbi5hY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfSVNfUkVBRFk6XG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuUFhDb250YWluZXIgPSBhY3Rpb24uaXRlbVxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9BRERfQ0hJTEQ6XG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuYWRkUFhDaGlsZChhY3Rpb24uaXRlbSlcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5lbWl0Q2hhbmdlKGFjdGlvbi5hY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfUkVNT1ZFX0NISUxEOlxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLnJlbW92ZVBYQ2hpbGQoYWN0aW9uLml0ZW0pXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb24uYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICB9KVxufSlcblxuXG5leHBvcnQgZGVmYXVsdCBBcHBTdG9yZVxuXG4iLCJpbXBvcnQgaXMgZnJvbSAnaXMnO1xuXG5mdW5jdGlvbiBnZXRBbGxNZXRob2RzKG9iaikge1xuXHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqKVxuXHRcdC5maWx0ZXIoa2V5ID0+IGlzLmZuKG9ialtrZXldKSlcbn1cblxuZnVuY3Rpb24gYXV0b0JpbmQob2JqKSB7XG5cdC8vIGNvbnNvbGUubG9nKCdvYmogLS0tLS0nLCBvYmopXG4gIFx0Z2V0QWxsTWV0aG9kcyhvYmouY29uc3RydWN0b3IucHJvdG90eXBlKVxuXHRcdC5mb3JFYWNoKG10ZCA9PiB7XG5cdFx0XHQvLyBjb25zb2xlLmxvZyhtdGQpXG5cdFx0XHRvYmpbbXRkXSA9IG9ialttdGRdLmJpbmQob2JqKTtcblx0XHR9KVxufVxuXG5leHBvcnQgZGVmYXVsdCBhdXRvQmluZDsiLCJpbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcblxuY2xhc3MgVXRpbHMge1xuXHRzdGF0aWMgTm9ybWFsaXplTW91c2VDb29yZHMoZSwgb2JqV3JhcHBlcikge1xuXHRcdHZhciBwb3N4ID0gMDtcblx0XHR2YXIgcG9zeSA9IDA7XG5cdFx0aWYgKCFlKSB2YXIgZSA9IHdpbmRvdy5ldmVudDtcblx0XHRpZiAoZS5wYWdlWCB8fCBlLnBhZ2VZKSBcdHtcblx0XHRcdHBvc3ggPSBlLnBhZ2VYO1xuXHRcdFx0cG9zeSA9IGUucGFnZVk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKGUuY2xpZW50WCB8fCBlLmNsaWVudFkpIFx0e1xuXHRcdFx0cG9zeCA9IGUuY2xpZW50WCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdFxuXHRcdFx0XHQrIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xuXHRcdFx0cG9zeSA9IGUuY2xpZW50WSArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wXG5cdFx0XHRcdCsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcblx0XHR9XG5cdFx0b2JqV3JhcHBlci54ID0gcG9zeFxuXHRcdG9ialdyYXBwZXIueSA9IHBvc3lcblx0XHRyZXR1cm4gb2JqV3JhcHBlclxuXHR9XG5cdHN0YXRpYyBSZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5KHdpbmRvd1csIHdpbmRvd0gsIGNvbnRlbnRXLCBjb250ZW50SCwgb3JpZW50YXRpb24pIHtcblx0XHR2YXIgYXNwZWN0UmF0aW8gPSBjb250ZW50VyAvIGNvbnRlbnRIXG5cblx0XHRpZihvcmllbnRhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRpZihvcmllbnRhdGlvbiA9PSBBcHBDb25zdGFudHMuTEFORFNDQVBFKSB7XG5cdFx0XHRcdHZhciBzY2FsZSA9ICh3aW5kb3dXIC8gY29udGVudFcpICogMVxuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHZhciBzY2FsZSA9ICh3aW5kb3dIIC8gY29udGVudEgpICogMVxuXHRcdFx0fVxuXHRcdH1lbHNle1xuXHRcdFx0dmFyIHNjYWxlID0gKCh3aW5kb3dXIC8gd2luZG93SCkgPCBhc3BlY3RSYXRpbykgPyAod2luZG93SCAvIGNvbnRlbnRIKSAqIDEgOiAod2luZG93VyAvIGNvbnRlbnRXKSAqIDFcblx0XHR9XG5cblx0XHR2YXIgbmV3VyA9IGNvbnRlbnRXICogc2NhbGVcblx0XHR2YXIgbmV3SCA9IGNvbnRlbnRIICogc2NhbGVcblx0XHR2YXIgY3NzID0ge1xuXHRcdFx0d2lkdGg6IG5ld1csXG5cdFx0XHRoZWlnaHQ6IG5ld0gsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtIChuZXdXID4+IDEpLFxuXHRcdFx0dG9wOiAod2luZG93SCA+PiAxKSAtIChuZXdIID4+IDEpLFxuXHRcdFx0c2NhbGU6IHNjYWxlXG5cdFx0fVxuXHRcdHJldHVybiBjc3Ncblx0fVxuXHRzdGF0aWMgUmVzaXplUG9zaXRpb25Qcm9wb3J0aW9uYWxseVdpdGhBbmNob3JDZW50ZXIod2luZG93Vywgd2luZG93SCwgY29udGVudFcsIGNvbnRlbnRIKSB7XG5cdFx0dmFyIGFzcGVjdFJhdGlvID0gY29udGVudFcgLyBjb250ZW50SFxuXHRcdHZhciBzY2FsZSA9ICgod2luZG93VyAvIHdpbmRvd0gpIDwgYXNwZWN0UmF0aW8pID8gKHdpbmRvd0ggLyBjb250ZW50SCkgKiAxIDogKHdpbmRvd1cgLyBjb250ZW50VykgKiAxXG5cdFx0dmFyIG5ld1cgPSBjb250ZW50VyAqIHNjYWxlXG5cdFx0dmFyIG5ld0ggPSBjb250ZW50SCAqIHNjYWxlXG5cdFx0dmFyIGNzcyA9IHtcblx0XHRcdHdpZHRoOiBuZXdXLFxuXHRcdFx0aGVpZ2h0OiBuZXdILFxuXHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSksXG5cdFx0XHR0b3A6ICh3aW5kb3dIID4+IDEpLFxuXHRcdFx0c2NhbGU6IHNjYWxlXG5cdFx0fVxuXHRcdHJldHVybiBjc3Ncblx0fVxuXHRzdGF0aWMgUmFuZChtaW4sIG1heCkge1xuXHRcdHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW5cblx0fVxuXHRzdGF0aWMgRGVncmVlc1RvUmFkaWFucyhkZWdyZWVzKSB7XG5cdFx0cmV0dXJuIGRlZ3JlZXMgKiAoTWF0aC5QSSAvIDE4MClcblx0fVxuICAgIHN0YXRpYyBSYWRpYW5zVG9EZWdyZWVzKHJhZGlhbnMpIHtcbiAgICAgICAgcmV0dXJuIHJhZGlhbnMgKiAoMTgwIC8gTWF0aC5QSSlcbiAgICB9XG4gICAgc3RhdGljIExpbWl0KHYsIG1pbiwgbWF4KSB7XG4gICAgXHRyZXR1cm4gKE1hdGgubWluKG1heCwgTWF0aC5tYXgobWluLCB2KSkpO1xuICAgIH1cblx0c3RhdGljIENsb3Nlc3QoYXJyYXksIG51bSkge1xuICAgICAgICB2YXIgaT0wO1xuXHQgICAgdmFyIG1pbkRpZmY9MjAwMDtcblx0ICAgIHZhciBhbnM7XG5cdCAgICBmb3IoaSBpbiBhcnJheSl7XG5cdFx0XHR2YXIgbT1NYXRoLmFicyhudW0tYXJyYXlbaV0pO1xuXHRcdFx0aWYobTxtaW5EaWZmKXsgXG5cdFx0XHRcdG1pbkRpZmY9bTsgXG5cdFx0XHRcdGFucz1hcnJheVtpXTsgXG5cdFx0XHR9XG5cdFx0fVxuXHQgICAgcmV0dXJuIGFucztcbiAgICB9XG4gICAgc3RhdGljIFNwcmluZ1RvKGl0ZW0sIHRvWCwgdG9ZLCBpbmRleCwgc3ByaW5nLCBmcmljdGlvbiwgc3ByaW5nTGVuZ3RoKSB7XG4gICAgXHR2YXIgZHggPSB0b1ggLSBpdGVtLnhcbiAgICBcdHZhciBkeSA9IHRvWSAtIGl0ZW0ueVxuXHRcdHZhciBhbmdsZSA9IE1hdGguYXRhbjIoZHksIGR4KVxuXHRcdHZhciB0YXJnZXRYID0gdG9YIC0gTWF0aC5jb3MoYW5nbGUpICogKHNwcmluZ0xlbmd0aCAqIGluZGV4KVxuXHRcdHZhciB0YXJnZXRZID0gdG9ZIC0gTWF0aC5zaW4oYW5nbGUpICogKHNwcmluZ0xlbmd0aCAqIGluZGV4KVxuXHRcdGl0ZW0udnggKz0gKHRhcmdldFggLSBpdGVtLngpICogc3ByaW5nXG5cdFx0aXRlbS52eSArPSAodGFyZ2V0WSAtIGl0ZW0ueSkgKiBzcHJpbmdcblx0XHRpdGVtLnZ4ICo9IGZyaWN0aW9uXG5cdFx0aXRlbS52eSAqPSBmcmljdGlvblxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVXRpbHNcbiIsImNsYXNzIFZlYzIge1xuXHRjb25zdHJ1Y3Rvcih4LCB5KSB7XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRkaXN0YW5jZVRvKHYpIHtcblx0XHRyZXR1cm4gTWF0aC5zcXJ0KCB0aGlzLmRpc3RhbmNlVG9TcXVhcmVkKCB2ICkgKVxuXHR9XG5cdGRpc3RhbmNlVG9TcXVhcmVkKHYpIHtcblx0XHR2YXIgZHggPSB0aGlzLnggLSB2LngsIGR5ID0gdGhpcy55IC0gdi55O1xuXHRcdHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBWZWMyXG4iLCIvLyBodHRwOi8vcGF1bGlyaXNoLmNvbS8yMDExL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtYW5pbWF0aW5nL1xuLy8gaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xuIFxuLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxuIFxuLy8gTUlUIGxpY2Vuc2VcbiBcbihmdW5jdGlvbigpIHtcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgIHZhciB2ZW5kb3JzID0gWydtcycsICdtb3onLCAnd2Via2l0JywgJ28nXTtcbiAgICBmb3IodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsreCkge1xuICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgIH1cbiBcbiAgICBpZiAoIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCkge1xuICAgICAgICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcbiAgICAgICAgICAgIHZhciBpZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LCBcbiAgICAgICAgICAgICAgdGltZVRvQ2FsbCk7XG4gICAgICAgICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfTtcbiBcbiAgICBpZiAoIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSlcbiAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChpZCk7XG4gICAgICAgIH07XG59KCkpOyIsImltcG9ydCBGbHV4IGZyb20gJ2ZsdXgnXG5pbXBvcnQge0V2ZW50RW1pdHRlcjJ9IGZyb20gJ2V2ZW50ZW1pdHRlcjInXG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nXG5cbi8vIEFjdGlvbnNcbnZhciBQYWdlckFjdGlvbnMgPSB7XG4gICAgb25QYWdlUmVhZHk6IGZ1bmN0aW9uKGhhc2gpIHtcbiAgICAgICAgUGFnZXJEaXNwYXRjaGVyLmhhbmRsZVBhZ2VyQWN0aW9uKHtcbiAgICAgICAgXHR0eXBlOiBQYWdlckNvbnN0YW50cy5QQUdFX0lTX1JFQURZLFxuICAgICAgICBcdGl0ZW06IGhhc2hcbiAgICAgICAgfSkgIFxuICAgIH0sXG4gICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgIFx0UGFnZXJEaXNwYXRjaGVyLmhhbmRsZVBhZ2VyQWN0aW9uKHtcbiAgICAgICAgXHR0eXBlOiBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFLFxuICAgICAgICBcdGl0ZW06IHVuZGVmaW5lZFxuICAgICAgICB9KSAgXG4gICAgfSxcbiAgICBwYWdlVHJhbnNpdGlvbkRpZEZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgICAgIFBhZ2VyRGlzcGF0Y2hlci5oYW5kbGVQYWdlckFjdGlvbih7XG4gICAgICAgIFx0dHlwZTogUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0gsXG4gICAgICAgIFx0aXRlbTogdW5kZWZpbmVkXG4gICAgICAgIH0pICBcbiAgICB9XG59XG5cbi8vIENvbnN0YW50c1xudmFyIFBhZ2VyQ29uc3RhbnRzID0ge1xuXHRQQUdFX0lTX1JFQURZOiAnUEFHRV9JU19SRUFEWScsXG5cdFBBR0VfVFJBTlNJVElPTl9JTjogJ1BBR0VfVFJBTlNJVElPTl9JTicsXG5cdFBBR0VfVFJBTlNJVElPTl9PVVQ6ICdQQUdFX1RSQU5TSVRJT05fT1VUJyxcblx0UEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURTogJ1BBR0VfVFJBTlNJVElPTl9PVVRfQ09NUExFVEUnLFxuXHRQQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1M6ICdQQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1MnLFxuXHRQQUdFX1RSQU5TSVRJT05fRElEX0ZJTklTSDogJ1BBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIJyxcbn1cblxuLy8gRGlzcGF0Y2hlclxudmFyIFBhZ2VyRGlzcGF0Y2hlciA9IGFzc2lnbihuZXcgRmx1eC5EaXNwYXRjaGVyKCksIHtcblx0aGFuZGxlUGFnZXJBY3Rpb246IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdHRoaXMuZGlzcGF0Y2goYWN0aW9uKVxuXHR9XG59KVxuXG4vLyBTdG9yZVxudmFyIFBhZ2VyU3RvcmUgPSBhc3NpZ24oe30sIEV2ZW50RW1pdHRlcjIucHJvdG90eXBlLCB7XG4gICAgZmlyc3RQYWdlVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICBwYWdlVHJhbnNpdGlvblN0YXRlOiB1bmRlZmluZWQsIFxuICAgIGRpc3BhdGNoZXJJbmRleDogUGFnZXJEaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpe1xuICAgICAgICB2YXIgYWN0aW9uVHlwZSA9IHBheWxvYWQudHlwZVxuICAgICAgICB2YXIgaXRlbSA9IHBheWxvYWQuaXRlbVxuICAgICAgICBzd2l0Y2goYWN0aW9uVHlwZSkge1xuICAgICAgICAgICAgY2FzZSBQYWdlckNvbnN0YW50cy5QQUdFX0lTX1JFQURZOlxuICAgICAgICAgICAgXHRQYWdlclN0b3JlLnBhZ2VUcmFuc2l0aW9uU3RhdGUgPSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1NcbiAgICAgICAgICAgIFx0dmFyIHR5cGUgPSBQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24gPyBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU4gOiBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VUXG4gICAgICAgICAgICBcdFBhZ2VyU3RvcmUuZW1pdCh0eXBlKVxuICAgICAgICAgICAgXHRicmVha1xuICAgICAgICAgICAgY2FzZSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFOlxuICAgICAgICAgICAgXHR2YXIgdHlwZSA9IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9JTlxuICAgICAgICAgICAgXHRQYWdlclN0b3JlLmVtaXQodHlwZSlcbiAgICAgICAgICAgIFx0YnJlYWtcbiAgICAgICAgICAgIGNhc2UgUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0g6XG4gICAgICAgICAgICBcdGlmIChQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24pIFBhZ2VyU3RvcmUuZmlyc3RQYWdlVHJhbnNpdGlvbiA9IGZhbHNlXG4gICAgICAgICAgICAgICAgUGFnZXJTdG9yZS5wYWdlVHJhbnNpdGlvblN0YXRlID0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0hcbiAgICAgICAgICAgICAgICBQYWdlclN0b3JlLmVtaXQoYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgfSlcbn0pXG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0UGFnZXJTdG9yZTogUGFnZXJTdG9yZSxcblx0UGFnZXJBY3Rpb25zOiBQYWdlckFjdGlvbnMsXG5cdFBhZ2VyQ29uc3RhbnRzOiBQYWdlckNvbnN0YW50cyxcblx0UGFnZXJEaXNwYXRjaGVyOiBQYWdlckRpc3BhdGNoZXJcbn1cbiIsImltcG9ydCBhdXRvYmluZCBmcm9tICdBdXRvYmluZCdcbmltcG9ydCBzbHVnIGZyb20gJ3RvLXNsdWctY2FzZSdcblxuY2xhc3MgQmFzZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdGF1dG9iaW5kKHRoaXMpXG5cdFx0dGhpcy5kb21Jc1JlYWR5ID0gZmFsc2Vcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5kb21Jc1JlYWR5ID0gdHJ1ZVxuXHR9XG5cdHJlbmRlcihjaGlsZElkLCBwYXJlbnRJZCwgdGVtcGxhdGUsIG9iamVjdCkge1xuXHRcdHRoaXMuY29tcG9uZW50V2lsbE1vdW50KClcblx0XHR0aGlzLmNoaWxkSWQgPSBjaGlsZElkXG5cdFx0dGhpcy5wYXJlbnRJZCA9IHBhcmVudElkXG5cdFx0dGhpcy5wYXJlbnQgPSAocGFyZW50SWQgaW5zdGFuY2VvZiBqUXVlcnkpID8gcGFyZW50SWQgOiAkKHRoaXMucGFyZW50SWQpXG5cdFx0dGhpcy5jaGlsZCA9ICh0ZW1wbGF0ZSA9PSB1bmRlZmluZWQpID8gJCgnPGRpdj48L2Rpdj4nKSA6ICQodGVtcGxhdGUob2JqZWN0KSlcblx0XHRpZih0aGlzLmNoaWxkLmF0dHIoJ2lkJykgPT0gdW5kZWZpbmVkKSB0aGlzLmNoaWxkLmF0dHIoJ2lkJywgc2x1ZyhjaGlsZElkKSlcblx0XHR0aGlzLmNoaWxkLnJlYWR5KHRoaXMuY29tcG9uZW50RGlkTW91bnQpXG5cdFx0dGhpcy5wYXJlbnQuYXBwZW5kKHRoaXMuY2hpbGQpXG5cdH1cblx0cmVtb3ZlKCkge1xuXHRcdHRoaXMuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuY2hpbGQucmVtb3ZlKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBCYXNlQ29tcG9uZW50XG5cbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQgVHJhbnNpdGlvbkFuaW1hdGlvbnMgZnJvbSAnVHJhbnNpdGlvbkFuaW1hdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJhc2VQYWdlIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMucHJvcHMgPSBwcm9wc1xuXHRcdHRoaXMuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUgPSB0aGlzLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlLmJpbmQodGhpcylcblx0XHR0aGlzLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSA9IHRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlLmJpbmQodGhpcylcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmNoaWxkLmFkZENsYXNzKHRoaXMucHJvcHMudHlwZS50b0xvd2VyQ2FzZSgpKVxuXHRcdHRoaXMucmVzaXplKClcblx0XHR0aGlzLnNldHVwQW5pbWF0aW9ucygpXG5cdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLnByb3BzLmlzUmVhZHkodGhpcy5wcm9wcy5oYXNoKSwgMClcblx0fVxuXHRzZXR1cEFuaW1hdGlvbnMoKSB7XG5cdFx0dmFyIGtleU5hbWUgPSB0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKSArICctaW4nXG5cdFx0dGhpcy50bEluID0gVHJhbnNpdGlvbkFuaW1hdGlvbnNba2V5TmFtZV0odGhpcywge29uQ29tcGxldGU6dGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZX0pXG5cdH1cblx0d2lsbFRyYW5zaXRpb25JbigpIHtcblx0XHR0aGlzLnRsSW4ucGxheSgwKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHZhciBrZXlOYW1lID0gdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLW91dCdcblx0XHR0aGlzLnRsT3V0ID0gVHJhbnNpdGlvbkFuaW1hdGlvbnNba2V5TmFtZV0odGhpcywge29uQ29tcGxldGU6dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGV9KVxuXHRcdHRoaXMudGxPdXQucGxheSgwKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wcm9wcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpLCAwKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucHJvcHMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCksIDApXG5cdH1cblx0cmVzaXplKCkge1xuXHR9XG5cdGZvcmNlVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLnRsSW4gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsSW4ucGF1c2UoMClcblx0XHR9XG5cdFx0aWYodGhpcy50bE91dCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxPdXQucGF1c2UoMClcblx0XHR9XG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGlmKHRoaXMudGxJbiAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxJbi5jbGVhcigpXG5cdFx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bEluKVxuXHRcdH1cblx0XHRpZih0aGlzLnRsT3V0ICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy50bE91dC5jbGVhcigpXG5cdFx0XHRBcHBTdG9yZS5yZWxlYXNlVGltZWxpbmUodGhpcy50bE91dClcblx0XHR9XG5cdH1cbn1cbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQge1BhZ2VyU3RvcmUsIFBhZ2VyQWN0aW9ucywgUGFnZXJDb25zdGFudHMsIFBhZ2VyRGlzcGF0Y2hlcn0gZnJvbSAnUGFnZXInXG5pbXBvcnQgX2NhcGl0YWxpemUgZnJvbSAnbG9kYXNoL1N0cmluZy9jYXBpdGFsaXplJ1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJ1BhZ2VzQ29udGFpbmVyX2hicydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuY2xhc3MgQmFzZVBhZ2VyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0XHR0aGlzLmN1cnJlbnRQYWdlRGl2UmVmID0gJ3BhZ2UtYidcblx0XHR0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluID0gdGhpcy53aWxsUGFnZVRyYW5zaXRpb25Jbi5iaW5kKHRoaXMpXG5cdFx0dGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQgPSB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbk91dC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUgPSB0aGlzLmRpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5kaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlID0gdGhpcy5kaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlLmJpbmQodGhpcylcblx0XHR0aGlzLmNvbXBvbmVudHMgPSB7XG5cdFx0XHQnbmV3LWNvbXBvbmVudCc6IHVuZGVmaW5lZCxcblx0XHRcdCdvbGQtY29tcG9uZW50JzogdW5kZWZpbmVkXG5cdFx0fVxuXHR9XG5cdHJlbmRlcihwYXJlbnQpIHtcblx0XHRzdXBlci5yZW5kZXIoJ0Jhc2VQYWdlcicsIHBhcmVudCwgdGVtcGxhdGUsIHVuZGVmaW5lZClcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdFx0UGFnZXJTdG9yZS5vbihQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU4sIHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uSW4pXG5cdFx0UGFnZXJTdG9yZS5vbihQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VULCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbk91dClcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdHdpbGxQYWdlVHJhbnNpdGlvbkluKCkge1xuXHRcdGlmKFBhZ2VyU3RvcmUuZmlyc3RQYWdlVHJhbnNpdGlvbikge1xuXHRcdFx0dGhpcy5zd2l0Y2hQYWdlc0RpdkluZGV4KClcblx0XHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uSW4oKVxuXHRcdH1cblx0fVxuXHR3aWxsUGFnZVRyYW5zaXRpb25PdXQoKSB7XG5cdFx0dGhpcy5jb21wb25lbnRzWydvbGQtY29tcG9uZW50J10ud2lsbFRyYW5zaXRpb25PdXQoKVxuXHRcdHRoaXMuc3dpdGNoUGFnZXNEaXZJbmRleCgpXG5cdFx0dGhpcy5jb21wb25lbnRzWyduZXctY29tcG9uZW50J10ud2lsbFRyYW5zaXRpb25JbigpXG5cdH1cblx0ZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdkaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUnKVxuXHRcdFBhZ2VyQWN0aW9ucy5wYWdlVHJhbnNpdGlvbkRpZEZpbmlzaCgpXG5cdFx0dGhpcy51bm1vdW50Q29tcG9uZW50KCdvbGQtY29tcG9uZW50Jylcblx0fVxuXHRkaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdkaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlJylcblx0XHRQYWdlckFjdGlvbnMub25UcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdHN3aXRjaFBhZ2VzRGl2SW5kZXgoKSB7XG5cdFx0dmFyIG5ld0NvbXBvbmVudCA9IHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddXG5cdFx0dmFyIG9sZENvbXBvbmVudCA9IHRoaXMuY29tcG9uZW50c1snb2xkLWNvbXBvbmVudCddXG5cdFx0aWYobmV3Q29tcG9uZW50ICE9IHVuZGVmaW5lZCkgbmV3Q29tcG9uZW50LmNoaWxkLmNzcygnei1pbmRleCcsIDIpXG5cdFx0aWYob2xkQ29tcG9uZW50ICE9IHVuZGVmaW5lZCkgb2xkQ29tcG9uZW50LmNoaWxkLmNzcygnei1pbmRleCcsIDEpXG5cdH1cblx0c2V0dXBOZXdDb21wb25lbnQoaGFzaCwgdGVtcGxhdGUpIHtcblx0XHR2YXIgaWQgPSBfY2FwaXRhbGl6ZShoYXNoLnJlcGxhY2UoXCIvXCIsIFwiXCIpKVxuXHRcdHRoaXMub2xkUGFnZURpdlJlZiA9IHRoaXMuY3VycmVudFBhZ2VEaXZSZWZcblx0XHR0aGlzLmN1cnJlbnRQYWdlRGl2UmVmID0gKHRoaXMuY3VycmVudFBhZ2VEaXZSZWYgPT09ICdwYWdlLWEnKSA/ICdwYWdlLWInIDogJ3BhZ2UtYSdcblx0XHR2YXIgZWwgPSB0aGlzLmNoaWxkLmZpbmQoJyMnK3RoaXMuY3VycmVudFBhZ2VEaXZSZWYpXG5cdFx0dmFyIHByb3BzID0ge1xuXHRcdFx0aWQ6IHRoaXMuY3VycmVudFBhZ2VEaXZSZWYsXG5cdFx0XHRpc1JlYWR5OiB0aGlzLm9uUGFnZVJlYWR5LFxuXHRcdFx0dHlwZTogQXBwU3RvcmUuZ2V0VHlwZU9mUGFnZSgpLFxuXHRcdFx0aGFzaDogaGFzaCxcblx0XHRcdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlOiB0aGlzLmRpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZSxcblx0XHRcdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZTogdGhpcy5kaWRQYWdlVHJhbnNpdGlvbk91dENvbXBsZXRlLFxuXHRcdFx0ZGF0YTogQXBwU3RvcmUucGFnZUNvbnRlbnQoKVxuXHRcdH1cblx0XHR2YXIgcGFnZSA9IG5ldyB0ZW1wbGF0ZS50eXBlKHByb3BzKVxuXHRcdHBhZ2UuaWQgPSBBcHBTdG9yZS5nZXRQYWdlSWQoKVxuXHRcdHBhZ2UucmVuZGVyKGlkLCBlbCwgdGVtcGxhdGUucGFydGlhbCwgcHJvcHMuZGF0YSlcblx0XHR0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXSA9IHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddXG5cdFx0dGhpcy5jb21wb25lbnRzWyduZXctY29tcG9uZW50J10gPSBwYWdlXG5cdFx0aWYoUGFnZXJTdG9yZS5wYWdlVHJhbnNpdGlvblN0YXRlID09PSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1MpIHtcblx0XHRcdHRoaXMuY29tcG9uZW50c1snb2xkLWNvbXBvbmVudCddLmZvcmNlVW5tb3VudCgpXG5cdFx0fVxuXHR9XG5cdG9uUGFnZVJlYWR5KGhhc2gpIHtcblx0XHRQYWdlckFjdGlvbnMub25QYWdlUmVhZHkoaGFzaClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dW5tb3VudENvbXBvbmVudChyZWYpIHtcblx0XHRpZih0aGlzLmNvbXBvbmVudHNbcmVmXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbcmVmXS5yZW1vdmUoKVxuXHRcdH1cblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRQYWdlclN0b3JlLm9mZihQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU4sIHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uSW4pXG5cdFx0UGFnZXJTdG9yZS5vZmYoUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVCwgdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQpXG5cdFx0dGhpcy51bm1vdW50Q29tcG9uZW50KCdvbGQtY29tcG9uZW50Jylcblx0XHR0aGlzLnVubW91bnRDb21wb25lbnQoJ25ldy1jb21wb25lbnQnKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBCYXNlUGFnZXJcblxuIiwibW9kdWxlLmV4cG9ydHM9e1xuXHRcImluZm9zXCI6IHtcblx0XHRcInR3aXR0ZXJfdXJsXCI6IFwiaHR0cDovL3R3aXR0ZXIuY29tXCIsXG5cdFx0XCJmYWNlYm9va191cmxcIjogXCJodHRwOi8vZmFjZWJvb2suY29tXCIsXG5cdFx0XCJpbnN0YWdyYW1fdXJsXCI6IFwiaHR0cDovL2luc3RhZ3JhbS5jb21cIixcblx0XHRcImxhbmdcIjoge1xuXHRcdFx0XCJlblwiOiB7XG5cdFx0XHRcdFwiY291bnRyaWVzXCI6IHtcblx0XHRcdFx0XHRcIkdCUlwiOiBcImVuZ2xpc2hcIixcblx0XHRcdFx0XHRcIkZSQVwiOiBcImZyZW5jaFwiLFxuXHRcdFx0XHRcdFwiRVNQXCI6IFwic3BhbmlzaFwiLFxuXHRcdFx0XHRcdFwiSVRBXCI6IFwiaXRhbGlhblwiLFxuXHRcdFx0XHRcdFwiREVVXCI6IFwiZ2VybWFuXCIsXG5cdFx0XHRcdFx0XCJQUlRcIjogXCJwb3J0dWdlc2VcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImxlZ2FsXCI6IFwibGVnYWxcIixcblx0XHRcdFx0XCJsZWdhbF91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJcIjogXCJjYW1wZXIgbGFiXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3BfdGl0bGVcIjogXCJzaG9wXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5cIjogXCJtYW5cIixcblx0XHRcdFx0XCJzaG9wX21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5cIjogXCJ3b21hblwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJwbGFuZXRcIjogXCJwbGFuZXRcIlxuXHRcdFx0fSxcblx0XHRcdFwiZnJcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCJcblx0XHRcdH0sXG5cdFx0XHRcImVzXCI6IHtcblx0XHRcdFx0XCJjb3VudHJpZXNcIjoge1xuXHRcdFx0XHRcdFwiR0JSXCI6IFwiZW5nbGlzaFwiLFxuXHRcdFx0XHRcdFwiRlJBXCI6IFwiZnJlbmNoXCIsXG5cdFx0XHRcdFx0XCJFU1BcIjogXCJzcGFuaXNoXCIsXG5cdFx0XHRcdFx0XCJJVEFcIjogXCJpdGFsaWFuXCIsXG5cdFx0XHRcdFx0XCJERVVcIjogXCJnZXJtYW5cIixcblx0XHRcdFx0XHRcIlBSVFwiOiBcInBvcnR1Z2VzZVwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibGVnYWxcIjogXCJsZWdhbFwiLFxuXHRcdFx0XHRcImxlZ2FsX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYlwiOiBcImNhbXBlciBsYWJcIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF90aXRsZVwiOiBcInNob3BcIixcblx0XHRcdFx0XCJzaG9wX21lblwiOiBcIm1hblwiLFxuXHRcdFx0XHRcInNob3BfbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF93b21lblwiOiBcIndvbWFuXCIsXG5cdFx0XHRcdFwic2hvcF93b21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcInBsYW5ldFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJpdFwiOiB7XG5cdFx0XHRcdFwiY291bnRyaWVzXCI6IHtcblx0XHRcdFx0XHRcIkdCUlwiOiBcImVuZ2xpc2hcIixcblx0XHRcdFx0XHRcIkZSQVwiOiBcImZyZW5jaFwiLFxuXHRcdFx0XHRcdFwiRVNQXCI6IFwic3BhbmlzaFwiLFxuXHRcdFx0XHRcdFwiSVRBXCI6IFwiaXRhbGlhblwiLFxuXHRcdFx0XHRcdFwiREVVXCI6IFwiZ2VybWFuXCIsXG5cdFx0XHRcdFx0XCJQUlRcIjogXCJwb3J0dWdlc2VcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImxlZ2FsXCI6IFwibGVnYWxcIixcblx0XHRcdFx0XCJsZWdhbF91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJcIjogXCJjYW1wZXIgbGFiXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3BfdGl0bGVcIjogXCJzaG9wXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5cIjogXCJtYW5cIixcblx0XHRcdFx0XCJzaG9wX21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5cIjogXCJ3b21hblwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJwbGFuZXRcIjogXCJwbGFuZXRcIlxuXHRcdFx0fSxcblx0XHRcdFwiZGVcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCJcblx0XHRcdH0sXG5cdFx0XHRcInB0XCI6IHtcblx0XHRcdFx0XCJjb3VudHJpZXNcIjoge1xuXHRcdFx0XHRcdFwiR0JSXCI6IFwiZW5nbGlzaFwiLFxuXHRcdFx0XHRcdFwiRlJBXCI6IFwiZnJlbmNoXCIsXG5cdFx0XHRcdFx0XCJFU1BcIjogXCJzcGFuaXNoXCIsXG5cdFx0XHRcdFx0XCJJVEFcIjogXCJpdGFsaWFuXCIsXG5cdFx0XHRcdFx0XCJERVVcIjogXCJnZXJtYW5cIixcblx0XHRcdFx0XHRcIlBSVFwiOiBcInBvcnR1Z2VzZVwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibGVnYWxcIjogXCJsZWdhbFwiLFxuXHRcdFx0XHRcImxlZ2FsX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYlwiOiBcImNhbXBlciBsYWJcIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF90aXRsZVwiOiBcInNob3BcIixcblx0XHRcdFx0XCJzaG9wX21lblwiOiBcIm1hblwiLFxuXHRcdFx0XHRcInNob3BfbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF93b21lblwiOiBcIndvbWFuXCIsXG5cdFx0XHRcdFwic2hvcF93b21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcInBsYW5ldFwiXG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdFwiY291bnRyaWVzXCI6IFtcblx0XHR7XG5cdFx0XHRcImlkXCI6IFwiR0JSXCIsXG5cdFx0XHRcImxhbmdcIjogXCJlblwiLFxuXHRcdFx0XCJ1cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiXG5cdFx0fSx7XG5cdFx0XHRcImlkXCI6IFwiRlJBXCIsXG5cdFx0XHRcImxhbmdcIjogXCJmclwiLFxuXHRcdFx0XCJ1cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiXG5cdFx0fSx7XG5cdFx0XHRcImlkXCI6IFwiRVNQXCIsXG5cdFx0XHRcImxhbmdcIjogXCJlc1wiLFxuXHRcdFx0XCJ1cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiXG5cdFx0fSx7XG5cdFx0XHRcImlkXCI6IFwiSVRBXCIsXG5cdFx0XHRcImxhbmdcIjogXCJpdFwiLFxuXHRcdFx0XCJ1cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiXG5cdFx0fSx7XG5cdFx0XHRcImlkXCI6IFwiREVVXCIsXG5cdFx0XHRcImxhbmdcIjogXCJkZVwiLFxuXHRcdFx0XCJ1cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiXG5cdFx0fSx7XG5cdFx0XHRcImlkXCI6IFwiUFJUXCIsXG5cdFx0XHRcImxhbmdcIjogXCJwdFwiLFxuXHRcdFx0XCJ1cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiXG5cdFx0fVxuXHRdLFxuXHRcInBsYW5ldHNcIjogW1wic2tpXCIsIFwibWV0YWxcIiwgXCJhbGFza2FcIiwgXCJ3b29kXCIsIFwiZ2Vtc3RvbmVcIl0sXG5cdFwiZWxlbWVudHNcIjogW1wiZmlyZVwiLCBcImVhcnRoXCIsIFwibWV0YWxcIiwgXCJ3YXRlclwiLCBcIndvb2RcIl0sXG5cdFwiZ2VuZGVyXCI6IFtcIm1hbGVcIiwgXCJmZW1hbGVcIiwgXCJhbmltYWxcIl0sXG5cblx0XCJwcm9kdWN0cy1kYXRhXCI6IHtcblx0XHRcInNraVwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJ2aXN1YWwtaWRcIjogXCJnZW1tYS1kb2dcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NzViN2ZjXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwidmlzdWFsLWlkXCI6IFwiZ2VtbWEtaGVyb1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjM2ZiNjNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjMsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDIsXG5cdFx0XHRcdFwidmlzdWFsLWlkXCI6IFwiaW51aXQtYm95XCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMxZmJhZFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XSxcblx0XHRcIm1ldGFsXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcInZpc3VhbC1pZFwiOiBcImdlbW1hLWRvZ1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg3NWI3ZmNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJ2aXN1YWwtaWRcIjogXCJnZW1tYS1oZXJvXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMzZmI2M1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMixcblx0XHRcdFx0XCJ2aXN1YWwtaWRcIjogXCJpbnVpdC1ib3lcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YzFmYmFkXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwiYWxhc2thXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcInZpc3VhbC1pZFwiOiBcImdlbW1hLWRvZ1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg3NWI3ZmNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjIsIFwieVwiOjAuM30sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJ2aXN1YWwtaWRcIjogXCJnZW1tYS1oZXJvXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMzZmI2M1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMixcblx0XHRcdFx0XCJ2aXN1YWwtaWRcIjogXCJpbnVpdC1ib3lcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YzFmYmFkXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMyxcblx0XHRcdFx0XCJ2aXN1YWwtaWRcIjogXCJpbnVpdC1naXJsXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMxZmJhZFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjF9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwid29vZFwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJ2aXN1YWwtaWRcIjogXCJnZW1tYS1kb2dcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NzViN2ZjXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwidmlzdWFsLWlkXCI6IFwiZ2VtbWEtaGVyb1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjM2ZiNjNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjMsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDIsXG5cdFx0XHRcdFwidmlzdWFsLWlkXCI6IFwiaW51aXQtYm95XCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMxZmJhZFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XSxcblx0XHRcImdlbXN0b25lXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcInZpc3VhbC1pZFwiOiBcImdlbW1hLWRvZ1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg3NWI3ZmNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjIsIFwieVwiOjAuM30sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJ2aXN1YWwtaWRcIjogXCJnZW1tYS1oZXJvXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMzZmI2M1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMixcblx0XHRcdFx0XCJ2aXN1YWwtaWRcIjogXCJpbnVpdC1ib3lcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YzFmYmFkXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC4zfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuNH1cblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblxuXHRcImxhbmdcIjoge1xuXHRcdFwiZW5cIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlclwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlclwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImxhbmRpbmcgcGFnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJza2kgcGFnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIm1ldGFsIHBhZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiYWxhc2thIHBhZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIndvb2QgcGFnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImdlbXN0b25lIHBhZ2VcIlxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJmclwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGZyXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGZyXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibGFuZGluZyBwYWdlIGZyXCJcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcInNraSBwYWdlIGZyXCJcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibWV0YWwgcGFnZSBmclwiXG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJhbGFza2EgcGFnZSBmclwiXG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwid29vZCBwYWdlIGZyXCJcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiZ2Vtc3RvbmUgcGFnZSBmclwiXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImVzXCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgZXNcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgZXNcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJsYW5kaW5nIHBhZ2UgZXNcIlxuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwic2tpIHBhZ2UgZXNcIlxuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJtZXRhbCBwYWdlIGVzXCJcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImFsYXNrYSBwYWdlIGVzXCJcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJ3b29kIHBhZ2UgZXNcIlxuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJnZW1zdG9uZSBwYWdlIGVzXCJcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiaXRcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBpdFwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBpdFwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImxhbmRpbmcgcGFnZSBpdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJza2kgcGFnZSBpdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIm1ldGFsIHBhZ2UgaXRcIlxuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiYWxhc2thIHBhZ2UgaXRcIlxuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIndvb2QgcGFnZSBpdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImdlbXN0b25lIHBhZ2UgaXRcIlxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJkZVwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGdlXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGdlXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibGFuZGluZyBwYWdlIGdlXCJcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcInNraSBwYWdlIGdlXCJcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibWV0YWwgcGFnZSBnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJhbGFza2EgcGFnZSBnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwid29vZCBwYWdlIGdlXCJcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiZ2Vtc3RvbmUgcGFnZSBnZVwiXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcInB0XCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgcHRcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgcHRcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJsYW5kaW5nIHBhZ2UgcHRcIlxuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwic2tpIHBhZ2UgcHRcIlxuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJtZXRhbCBwYWdlIHB0XCJcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImFsYXNrYSBwYWdlIHB0XCJcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJ3b29kIHBhZ2UgcHRcIlxuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJnZW1zdG9uZSBwYWdlIHB0XCJcblx0XHRcdH1cblx0XHR9LFxuXHR9LFxuXG5cdFwiZGVmYXVsdC1yb3V0ZVwiOiBcIi9sYW5kaW5nXCIsXG5cblx0XCJyb3V0aW5nXCI6IHtcblx0XHRcIi9sYW5kaW5nXCI6IHtcblx0XHRcdFwiaWRcIjogXCJsYW5kaW5nXCJcblx0XHR9LFxuXHRcdFwiL3BsYW5ldC9za2lcIjoge1xuXHRcdFx0XCJpZFwiOiBcInNraVwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF1cblx0XHR9LFxuXHRcdFwiL3BsYW5ldC9tZXRhbFwiOiB7XG5cdFx0XHRcImlkXCI6IFwibWV0YWxcIixcblx0XHRcdFwiZXhwZXJpZW5jZS1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvYWxhc2thXCI6IHtcblx0XHRcdFwiaWRcIjogXCJhbGFza2FcIixcblx0XHRcdFwiZXhwZXJpZW5jZS1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvd29vZFwiOiB7XG5cdFx0XHRcImlkXCI6IFwid29vZFwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF1cblx0XHR9LFxuXHRcdFwiL3BsYW5ldC9nZW1zdG9uZVwiOiB7XG5cdFx0XHRcImlkXCI6IFwiZ2Vtc3RvbmVcIixcblx0XHRcdFwiZXhwZXJpZW5jZS1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdXG5cdFx0fVxuXHR9XG59Il19
