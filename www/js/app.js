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
	function ArrowBtn(parentContainer, direction) {
		_classCallCheck(this, ArrowBtn);

		this.parentContainer = parentContainer;
		this.direction = direction;
		this.isRollover = false;

		this.config = {
			spring: 0,
			friction: 0,
			springLength: 0
		};
		this.config.spring = 0.1;
		this.config.friction = 0.8;
		this.config.springLength = 0;
	}

	_createClass(ArrowBtn, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.container = new PIXI.Container();
			this.parentContainer.addChild(this.container);
			this.lineSize = _AppStore2['default'].getLineWidth();
			var radius = 3;
			var margin = 30;
			this.knotsLine = [new _Knot2['default'](this.container, radius).componentDidMount(), new _Knot2['default'](this.container, radius).componentDidMount(), new _Knot2['default'](this.container, radius).componentDidMount()];
			this.knotsTriangle = [new _Knot2['default'](this.container, radius).componentDidMount(), new _Knot2['default'](this.container, radius).componentDidMount()];

			// mouseout positions
			this.knotsLine[0].position(-margin * 2, 0);
			this.knotsLine[0].fromX = -margin * 2;
			this.knotsLine[1].position(-margin, 0);
			this.knotsLine[1].fromX = -margin;
			this.knotsTriangle[0].position(-margin * 0.6, -margin * 0.7);
			this.knotsTriangle[0].fromX = -margin * 0.6;
			this.knotsTriangle[0].fromY = -margin * 0.7;
			this.knotsTriangle[1].position(-margin * 0.6, margin * 0.7);
			this.knotsTriangle[1].fromX = -margin * 0.6;
			this.knotsTriangle[1].fromY = margin * 0.7;

			// mouseover positions
			this.knotsLine[0].toX = this.knotsLine[0].x - margin * 0.6;
			this.knotsLine[1].toX = this.knotsLine[1].x - margin * 0.2;
			this.knotsLine[2].toX = this.knotsLine[2].x + margin * 0.2;

			this.knotsTriangle[0].toX = this.knotsTriangle[0].fromX;
			this.knotsTriangle[0].toY = this.knotsTriangle[0].fromY + margin * 0.1;

			this.knotsTriangle[1].toX = this.knotsTriangle[1].fromX;
			this.knotsTriangle[1].toY = this.knotsTriangle[1].fromY - margin * 0.1;

			this.g = new PIXI.Graphics();
			this.container.addChild(this.g);
			this.drawLines(this.g);

			switch (this.direction) {
				case _AppConstants2['default'].LEFT:
					this.container.rotation = _Utils2['default'].DegreesToRadians(180);
					break;
				case _AppConstants2['default'].RIGHT:
					break;
				case _AppConstants2['default'].TOP:
					this.container.rotation = _Utils2['default'].DegreesToRadians(-90);
					break;
				case _AppConstants2['default'].BOTTOM:
					this.container.rotation = _Utils2['default'].DegreesToRadians(90);
					break;
			}

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
			this.updateStrings('fromX', 'fromY');
		}
	}, {
		key: 'rollover',
		value: function rollover() {
			this.updateStrings('toX', 'toY');
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
			for (var i = 0; i < this.knotsLine.length; i++) {
				this.knotsLine[i].componentWillUnmount();
			}
			for (var i = 0; i < this.knotsTriangle.length; i++) {
				this.knotsTriangle[i].componentWillUnmount();
			}
			this.container.removeChildren();
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
		}
	}, {
		key: 'updateData',
		value: function updateData(data) {
			this.removePreviousSpringGardens();
			this.springGardens = [];
			for (var i = 0; i < data.length; i++) {
				var springGarden = _AppStore2['default'].getSpringGarden();
				var product = data[i];
				springGarden.radius = this.radius;
				springGarden.componentDidMount(product.knots, product.color);
				this.container.addChild(springGarden.container);
				this.springGardens[i] = springGarden;
			}
		}
	}, {
		key: 'removePreviousSpringGardens',
		value: function removePreviousSpringGardens() {
			for (var i = 0; i < this.springGardens.length; i++) {
				var springGarden = this.springGardens[i];
				this.container.removeChild(springGarden.container);
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
		key: 'resize',
		value: function resize() {
			var windowH = _AppStore2['default'].Window.h;
			var sizePercentage = this.type == _AppConstants2['default'].EXPERIENCE || this.type == _AppConstants2['default'].CAMPAIGN ? _AppConstants2['default'].COMPASS_SMALL_SIZE_PERCENTAGE : _AppConstants2['default'].COMPASS_SIZE_PERCENTAGE;
			this.radius = windowH * sizePercentage;
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

var CompassesContainer = (function () {
	function CompassesContainer(pxContainer) {
		_classCallCheck(this, CompassesContainer);

		this.pxContainer = pxContainer;
	}

	_createClass(CompassesContainer, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.container = _AppStore2['default'].getContainer();
			this.pxContainer.addChild(this.container);

			this.compass = new _Compass2['default'](this.container, _AppConstants2['default'].EXPERIENCE);
			this.compass.componentDidMount();
		}
	}, {
		key: 'didTransitionInComplete',
		value: function didTransitionInComplete() {
			var planetData = _AppStore2['default'].productsDataById(this.id);
			this.compass.updateData(planetData);
		}
	}, {
		key: 'update',
		value: function update() {
			this.compass.update();
		}
	}, {
		key: 'resize',
		value: function resize() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;

			this.compass.resize();

			this.compass.position(windowW >> 1, (windowH >> 1) - windowH * 0.05);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.compass.componentWillUnmount();
			this.container.removeChildren();
			_AppStore2['default'].releaseContainer(this.container);
		}
	}]);

	return CompassesContainer;
})();

exports['default'] = CompassesContainer;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./Compass":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Compass.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/FrontContainer.js":[function(require,module,exports){
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
	function Knot(springContainer, r) {
		_classCallCheck(this, Knot);

		this.radius = r || 8;
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

			this.g.lineStyle(_AppStore2['default'].getLineWidth(), 0xffffff, 1);
			this.g.beginFill(0xffffff, 1);
			this.g.drawCircle(0, 0, this.radius);
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
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			this.g.clear();
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
			var bunnyUrl = this.getImageUrlById('bunny');
			var texture = PIXI.Texture.fromImage(bunnyUrl);
			var bunny = new PIXI.Sprite(texture);

			this.g = new PIXI.Graphics();
			this.pxContainer.addChild(this.g);
			this.pxContainer.addChild(bunny);

			this.compassesContainer = new _CompassesContainer2['default'](this.pxContainer);
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

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./BasePlanetPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js","./CompassesContainer":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/CompassesContainer.js","./experiences/AlaskaXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/AlaskaXP.js","./experiences/GemStoneXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/GemStoneXP.js","./experiences/MetalXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/MetalXP.js","./experiences/SkiXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/SkiXP.js","./experiences/WoodXP":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/WoodXP.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SpringGarden.js":[function(require,module,exports){
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

var SpringGarden = (function () {
	function SpringGarden() {
		_classCallCheck(this, SpringGarden);

		this.container = new PIXI.Container();
		this.outlineContainer = new PIXI.Container();
		this.filledContainer = new PIXI.Container();
		this.outlinePolygon = new PIXI.Graphics();
		this.filledPolygon = new PIXI.Graphics();
		this.outlineContainer.addChild(this.outlinePolygon);
		this.container.addChild(this.outlineContainer);
		this.filledContainer.addChild(this.filledPolygon);
		this.container.addChild(this.filledContainer);

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
		value: function componentDidMount(knots, color) {
			this.color = color;

			for (var i = 0; i < this.knots.length; i++) {
				var newKnotScale = knots[i];
				var knot = this.knots[i];
				knot.toX = newKnotScale.x * this.radius;
				knot.toY = newKnotScale.y * this.radius;
			}
			this.container.rotation = _Utils2['default'].Rand(-4, 4);
			this.config.springLength = 200;
			this.assignOpenedConfig();
		}
	}, {
		key: 'update',
		value: function update() {
			this.outlinePolygon.clear();
			this.filledPolygon.clear();
			this.filledPolygon.beginFill(this.color);
			this.filledPolygon.lineStyle(0);
			this.filledPolygon.moveTo(this.knots[0].x, this.knots[0].y);
			var len = this.knots.length;
			var spring = this.config.spring;
			var friction = this.config.friction;
			for (var i = 0; i < len; i++) {
				var knot = this.knots[i];
				var previousKnot = this.knots[i - 1];
				previousKnot = previousKnot == undefined ? this.knots[len - 1] : previousKnot;

				_Utils2['default'].SpringTo(knot, knot.toX, knot.toY, i, spring, friction, this.config.springLength);
				knot.position(knot.x + knot.vx, knot.y + knot.vy);

				// outline
				this.outlinePolygon.lineStyle(this.lineW, this.color, 0.8);
				this.outlinePolygon.moveTo(previousKnot.x, previousKnot.y);
				this.outlinePolygon.lineTo(knot.x, knot.y);
			}
			this.filledPolygon.endFill();
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
		key: 'resize',
		value: function resize(radius) {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.radius = radius;
			// this.assignToGoValues()
			this.container.x = 0;
			this.container.y = 0;
		}
	}]);

	return SpringGarden;
})();

exports['default'] = SpringGarden;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/experiences/AlaskaXP.js":[function(require,module,exports){
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

			this.parent.css('cursor', 'pointer');

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
	PX_CONTAINER_IS_READY: 'PX_CONTAINER_IS_READY',
	PX_CONTAINER_ADD_CHILD: 'PX_CONTAINER_ADD_CHILD',
	PX_CONTAINER_REMOVE_CHILD: 'PX_CONTAINER_REMOVE_CHILD',

	LANDING: 'LANDING',
	EXPERIENCE: 'EXPERIENCE',
	CAMPAIGN: 'CAMPAIGN',
	NONE: 'NONE',

	COMPASS_SIZE_PERCENTAGE: 0.24,

	COMPASS_SMALL_SIZE_PERCENTAGE: 0.1,

	LEFT: 'LEFT',
	RIGHT: 'RIGHT',
	TOP: 'TOP',
	BOTTOM: 'BOTTOM',

	TOTAL_KNOT_NUM: 3,

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

  return "					<li class=\"country-"
    + alias3(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"index","hash":{},"data":data}) : helper)))
    + "\"><a href='#"
    + alias3(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"url","hash":{},"data":data}) : helper)))
    + "'>"
    + alias3(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"name","hash":{},"data":data}) : helper)))
    + "</a></li>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=this.lambda, alias2=this.escapeExpression, alias3=helpers.helperMissing, alias4="function";

  return "<div>\n	<header id=\"header\">\n		<div class=\"logo\">\n			<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"136.013px\" viewBox=\"0 0 136.013 49.375\" enable-background=\"new 0 0 136.013 49.375\" xml:space=\"preserve\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M82.141,8.002h3.354c1.213,0,1.717,0.499,1.717,1.725v7.137c0,1.231-0.501,1.736-1.705,1.736h-3.365V8.002z M82.523,24.617v8.426l-7.087-0.384V1.925H87.39c3.292,0,5.96,2.705,5.96,6.044v10.604c0,3.338-2.668,6.044-5.96,6.044H82.523z M33.491,7.913c-1.132,0-2.048,1.065-2.048,2.379v11.256h4.409V10.292c0-1.314-0.917-2.379-2.047-2.379H33.491z M32.994,0.974h1.308c4.702,0,8.514,3.866,8.514,8.634v25.224l-6.963,1.273v-7.848h-4.409l0.012,8.787l-6.974,2.018V9.608C24.481,4.839,28.292,0.974,32.994,0.974 M121.933,7.921h3.423c1.215,0,1.718,0.497,1.718,1.724v8.194c0,1.232-0.502,1.736-1.705,1.736h-3.436V7.921z M133.718,31.055v17.487l-6.906-3.368V31.591c0-4.92-4.588-5.08-4.588-5.08v16.774l-6.983-2.914V1.925h12.231c3.291,0,5.959,2.705,5.959,6.044v11.077c0,2.207-1.217,4.153-2.991,5.115C131.761,24.894,133.718,27.077,133.718,31.055 M10.809,0.833c-4.703,0-8.514,3.866-8.514,8.634v27.936c0,4.769,4.019,8.634,8.722,8.634l1.306-0.085c5.655-1.063,8.306-4.639,8.306-9.407v-8.94h-6.996v8.736c0,1.409-0.064,2.65-1.994,2.992c-1.231,0.219-2.417-0.816-2.417-2.132V10.151c0-1.314,0.917-2.381,2.047-2.381h0.315c1.13,0,2.048,1.067,2.048,2.381v8.464h6.996V9.467c0-4.768-3.812-8.634-8.514-8.634H10.809 M103.953,23.162h6.977v-6.744h-6.977V8.423l7.676-0.002V1.924H96.72v33.278c0,0,5.225,1.141,7.532,1.666c1.517,0.346,7.752,2.253,7.752,2.253v-7.015l-8.051-1.508V23.162z M46.879,1.927l0.003,32.35l7.123-0.895V18.985l5.126,10.426l5.126-10.484l0.002,13.664l7.022-0.054V1.895h-7.545L59.13,14.6L54.661,1.927H46.879z\"/></svg>\n		</div>\n		<div class=\"camper-lab\"><a target=\"_blank\" href=\""
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
		var graphicsNum = planets.length;
		var spritesNum = planets.length;
		var springGardensNum = 10;

		this.timelines = _objectpool2['default'].generate(TimelineMax, { count: 4 });
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
			return this.graphics.get();
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
	}, {
		key: "SpringTo",
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
				"color": "0x75b7fc",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
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
					{"x":0.6, "y":-0.6}
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
					{"x":0.6, "y":0.6}
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
					{"x":0.6, "y":-0.6}
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
					{"x":-0.6, "y":0.6}
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
					{"x":-0.6, "y":-0.1},
					{"x":-0.6, "y":-0.6}
				]
			},{
				"id": 1,
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
				"color": "0x75b7fc",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
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
					{"x":0.6, "y":-0.6}
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
					{"x":-0.6, "y":0.6}
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmx1eC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L2xpYi9EaXNwYXRjaGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvbGliL2ludmFyaWFudC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvYmFzZVRvU3RyaW5nLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9NYWluLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwVGVtcGxhdGUuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9hY3Rpb25zL0FwcEFjdGlvbnMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Fycm93QnRuLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9CYXNlUGxhbmV0UGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzcy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzc1JpbmdzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Db21wYXNzZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Zyb250Q29udGFpbmVyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Lbm90LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9MYW5kaW5nU2xpZGVzaG93LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9QWENvbnRhaW5lci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1BsYW5ldENhbXBhaWduUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1NwcmluZ0dhcmRlbi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvQWxhc2thWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL0Jhc2VYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvR2VtU3RvbmVYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvTWV0YWxYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvZXhwZXJpZW5jZXMvU2tpWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL1dvb2RYUC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvcGFnZXMvTGFuZGluZy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbnN0YW50cy9BcHBDb25zdGFudHMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9kaXNwYXRjaGVycy9BcHBEaXNwYXRjaGVyLmpzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9Gcm9udENvbnRhaW5lci5oYnMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL1BhZ2VzQ29udGFpbmVyLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGxhbmV0Q2FtcGFpZ25QYWdlLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuaGJzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9wYWdlcy9MYW5kaW5nLmhicyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL0dsb2JhbEV2ZW50cy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3NlcnZpY2VzL1Bvb2wuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9QcmVsb2FkZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9Sb3V0ZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9UcmFuc2l0aW9uQW5pbWF0aW9ucy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3N0b3Jlcy9BcHBTdG9yZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3V0aWxzL0F1dG9iaW5kLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvVXRpbHMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC91dGlscy9WZWMyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvcmFmLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9QYWdlci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvcGFnZXIvY29tcG9uZW50cy9CYXNlQ29tcG9uZW50LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VQYWdlLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9wYWdlci9jb21wb25lbnRzL0Jhc2VQYWdlci5qcyIsInd3dy9kYXRhL2RhdGEuanNvbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7bUJDVmdCLEtBQUs7Ozs7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QUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDckMsT0FBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDdEMsT0FBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUE7QUFDakMsT0FBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEdBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ3hELE9BQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxHQUFDLEdBQUcsQ0FBQTtBQUN6QyxPQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sR0FBQyxHQUFHLENBQUE7QUFDekMsT0FBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEdBQUMsR0FBRyxFQUFFLE1BQU0sR0FBQyxHQUFHLENBQUMsQ0FBQTtBQUN2RCxPQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sR0FBQyxHQUFHLENBQUE7QUFDekMsT0FBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxHQUFDLEdBQUcsQ0FBQTs7O0FBR3hDLE9BQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFJLE1BQU0sR0FBRyxHQUFHLEFBQUMsQ0FBQTtBQUM1RCxPQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMs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QUUsUUFBUSxDQUFDLENBQUE7O0FBRXBDLElBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNqRCxJQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDbEQsSUFBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBOztBQUVsRCxJQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDekQsSUFBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBOztBQUVsRCxJQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDekQsSUFBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQ2xEOzs7U0FDbUIsZ0NBQUc7QUFDdEIsUUFBSyxJ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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMuRGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vbGliL0Rpc3BhdGNoZXInKVxuIiwiLypcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBEaXNwYXRjaGVyXG4gKiBAdHlwZWNoZWNrc1xuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnLi9pbnZhcmlhbnQnKTtcblxudmFyIF9sYXN0SUQgPSAxO1xudmFyIF9wcmVmaXggPSAnSURfJztcblxuLyoqXG4gKiBEaXNwYXRjaGVyIGlzIHVzZWQgdG8gYnJvYWRjYXN0IHBheWxvYWRzIHRvIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLiBUaGlzIGlzXG4gKiBkaWZmZXJlbnQgZnJvbSBnZW5lcmljIHB1Yi1zdWIgc3lzdGVtcyBpbiB0d28gd2F5czpcbiAqXG4gKiAgIDEpIENhbGxiYWNrcyBhcmUgbm90IHN1YnNjcmliZWQgdG8gcGFydGljdWxhciBldmVudHMuIEV2ZXJ5IHBheWxvYWQgaXNcbiAqICAgICAgZGlzcGF0Y2hlZCB0byBldmVyeSByZWdpc3RlcmVkIGNhbGxiYWNrLlxuICogICAyKSBDYWxsYmFja3MgY2FuIGJlIGRlZmVycmVkIGluIHdob2xlIG9yIHBhcnQgdW50aWwgb3RoZXIgY2FsbGJhY2tzIGhhdmVcbiAqICAgICAgYmVlbiBleGVjdXRlZC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgY29uc2lkZXIgdGhpcyBoeXBvdGhldGljYWwgZmxpZ2h0IGRlc3RpbmF0aW9uIGZvcm0sIHdoaWNoXG4gKiBzZWxlY3RzIGEgZGVmYXVsdCBjaXR5IHdoZW4gYSBjb3VudHJ5IGlzIHNlbGVjdGVkOlxuICpcbiAqICAgdmFyIGZsaWdodERpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpO1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2Ygd2hpY2ggY291bnRyeSBpcyBzZWxlY3RlZFxuICogICB2YXIgQ291bnRyeVN0b3JlID0ge2NvdW50cnk6IG51bGx9O1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2Ygd2hpY2ggY2l0eSBpcyBzZWxlY3RlZFxuICogICB2YXIgQ2l0eVN0b3JlID0ge2NpdHk6IG51bGx9O1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2YgdGhlIGJhc2UgZmxpZ2h0IHByaWNlIG9mIHRoZSBzZWxlY3RlZCBjaXR5XG4gKiAgIHZhciBGbGlnaHRQcmljZVN0b3JlID0ge3ByaWNlOiBudWxsfVxuICpcbiAqIFdoZW4gYSB1c2VyIGNoYW5nZXMgdGhlIHNlbGVjdGVkIGNpdHksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NpdHktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENpdHk6ICdwYXJpcydcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGBDaXR5U3RvcmVgOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NpdHktdXBkYXRlJykge1xuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBwYXlsb2FkLnNlbGVjdGVkQ2l0eTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIHVzZXIgc2VsZWN0cyBhIGNvdW50cnksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NvdW50cnktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENvdW50cnk6ICdhdXN0cmFsaWEnXG4gKiAgIH0pO1xuICpcbiAqIFRoaXMgcGF5bG9hZCBpcyBkaWdlc3RlZCBieSBib3RoIHN0b3JlczpcbiAqXG4gKiAgICBDb3VudHJ5U3RvcmUuZGlzcGF0Y2hUb2tlbiA9IGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjb3VudHJ5LXVwZGF0ZScpIHtcbiAqICAgICAgIENvdW50cnlTdG9yZS5jb3VudHJ5ID0gcGF5bG9hZC5zZWxlY3RlZENvdW50cnk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBXaGVuIHRoZSBjYWxsYmFjayB0byB1cGRhdGUgYENvdW50cnlTdG9yZWAgaXMgcmVnaXN0ZXJlZCwgd2Ugc2F2ZSBhIHJlZmVyZW5jZVxuICogdG8gdGhlIHJldHVybmVkIHRva2VuLiBVc2luZyB0aGlzIHRva2VuIHdpdGggYHdhaXRGb3IoKWAsIHdlIGNhbiBndWFyYW50ZWVcbiAqIHRoYXQgYENvdW50cnlTdG9yZWAgaXMgdXBkYXRlZCBiZWZvcmUgdGhlIGNhbGxiYWNrIHRoYXQgdXBkYXRlcyBgQ2l0eVN0b3JlYFxuICogbmVlZHMgdG8gcXVlcnkgaXRzIGRhdGEuXG4gKlxuICogICBDaXR5U3RvcmUuZGlzcGF0Y2hUb2tlbiA9IGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjb3VudHJ5LXVwZGF0ZScpIHtcbiAqICAgICAgIC8vIGBDb3VudHJ5U3RvcmUuY291bnRyeWAgbWF5IG5vdCBiZSB1cGRhdGVkLlxuICogICAgICAgZmxpZ2h0RGlzcGF0Y2hlci53YWl0Rm9yKFtDb3VudHJ5U3RvcmUuZGlzcGF0Y2hUb2tlbl0pO1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBpcyBub3cgZ3VhcmFudGVlZCB0byBiZSB1cGRhdGVkLlxuICpcbiAqICAgICAgIC8vIFNlbGVjdCB0aGUgZGVmYXVsdCBjaXR5IGZvciB0aGUgbmV3IGNvdW50cnlcbiAqICAgICAgIENpdHlTdG9yZS5jaXR5ID0gZ2V0RGVmYXVsdENpdHlGb3JDb3VudHJ5KENvdW50cnlTdG9yZS5jb3VudHJ5KTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFRoZSB1c2FnZSBvZiBgd2FpdEZvcigpYCBjYW4gYmUgY2hhaW5lZCwgZm9yIGV4YW1wbGU6XG4gKlxuICogICBGbGlnaHRQcmljZVN0b3JlLmRpc3BhdGNoVG9rZW4gPVxuICogICAgIGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgICAgc3dpdGNoIChwYXlsb2FkLmFjdGlvblR5cGUpIHtcbiAqICAgICAgICAgY2FzZSAnY291bnRyeS11cGRhdGUnOlxuICogICAgICAgICAgIGZsaWdodERpc3BhdGNoZXIud2FpdEZvcihbQ2l0eVN0b3JlLmRpc3BhdGNoVG9rZW5dKTtcbiAqICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlLnByaWNlID1cbiAqICAgICAgICAgICAgIGdldEZsaWdodFByaWNlU3RvcmUoQ291bnRyeVN0b3JlLmNvdW50cnksIENpdHlTdG9yZS5jaXR5KTtcbiAqICAgICAgICAgICBicmVhaztcbiAqXG4gKiAgICAgICAgIGNhc2UgJ2NpdHktdXBkYXRlJzpcbiAqICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlLnByaWNlID1cbiAqICAgICAgICAgICAgIEZsaWdodFByaWNlU3RvcmUoQ291bnRyeVN0b3JlLmNvdW50cnksIENpdHlTdG9yZS5jaXR5KTtcbiAqICAgICAgICAgICBicmVhaztcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFRoZSBgY291bnRyeS11cGRhdGVgIHBheWxvYWQgd2lsbCBiZSBndWFyYW50ZWVkIHRvIGludm9rZSB0aGUgc3RvcmVzJ1xuICogcmVnaXN0ZXJlZCBjYWxsYmFja3MgaW4gb3JkZXI6IGBDb3VudHJ5U3RvcmVgLCBgQ2l0eVN0b3JlYCwgdGhlblxuICogYEZsaWdodFByaWNlU3RvcmVgLlxuICovXG5cbiAgZnVuY3Rpb24gRGlzcGF0Y2hlcigpIHtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcyA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWQgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggZXZlcnkgZGlzcGF0Y2hlZCBwYXlsb2FkLiBSZXR1cm5zXG4gICAqIGEgdG9rZW4gdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGB3YWl0Rm9yKClgLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5yZWdpc3Rlcj1mdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciBpZCA9IF9wcmVmaXggKyBfbGFzdElEKys7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdID0gY2FsbGJhY2s7XG4gICAgcmV0dXJuIGlkO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY2FsbGJhY2sgYmFzZWQgb24gaXRzIHRva2VuLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaWRcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLnVucmVnaXN0ZXI9ZnVuY3Rpb24oaWQpIHtcbiAgICBpbnZhcmlhbnQoXG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0sXG4gICAgICAnRGlzcGF0Y2hlci51bnJlZ2lzdGVyKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLFxuICAgICAgaWRcbiAgICApO1xuICAgIGRlbGV0ZSB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF07XG4gIH07XG5cbiAgLyoqXG4gICAqIFdhaXRzIGZvciB0aGUgY2FsbGJhY2tzIHNwZWNpZmllZCB0byBiZSBpbnZva2VkIGJlZm9yZSBjb250aW51aW5nIGV4ZWN1dGlvblxuICAgKiBvZiB0aGUgY3VycmVudCBjYWxsYmFjay4gVGhpcyBtZXRob2Qgc2hvdWxkIG9ubHkgYmUgdXNlZCBieSBhIGNhbGxiYWNrIGluXG4gICAqIHJlc3BvbnNlIHRvIGEgZGlzcGF0Y2hlZCBwYXlsb2FkLlxuICAgKlxuICAgKiBAcGFyYW0ge2FycmF5PHN0cmluZz59IGlkc1xuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUud2FpdEZvcj1mdW5jdGlvbihpZHMpIHtcbiAgICBpbnZhcmlhbnQoXG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcsXG4gICAgICAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IE11c3QgYmUgaW52b2tlZCB3aGlsZSBkaXNwYXRjaGluZy4nXG4gICAgKTtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgaWRzLmxlbmd0aDsgaWkrKykge1xuICAgICAgdmFyIGlkID0gaWRzW2lpXTtcbiAgICAgIGlmICh0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgaW52YXJpYW50KFxuICAgICAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkW2lkXSxcbiAgICAgICAgICAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IENpcmN1bGFyIGRlcGVuZGVuY3kgZGV0ZWN0ZWQgd2hpbGUgJyArXG4gICAgICAgICAgJ3dhaXRpbmcgZm9yIGAlc2AuJyxcbiAgICAgICAgICBpZFxuICAgICAgICApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGludmFyaWFudChcbiAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdLFxuICAgICAgICAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLFxuICAgICAgICBpZFxuICAgICAgKTtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2soaWQpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGlzcGF0Y2hlcyBhIHBheWxvYWQgdG8gYWxsIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcGF5bG9hZFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2g9ZnVuY3Rpb24ocGF5bG9hZCkge1xuICAgIGludmFyaWFudChcbiAgICAgICF0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcsXG4gICAgICAnRGlzcGF0Y2guZGlzcGF0Y2goLi4uKTogQ2Fubm90IGRpc3BhdGNoIGluIHRoZSBtaWRkbGUgb2YgYSBkaXNwYXRjaC4nXG4gICAgKTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3N0YXJ0RGlzcGF0Y2hpbmcocGF5bG9hZCk7XG4gICAgdHJ5IHtcbiAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzKSB7XG4gICAgICAgIGlmICh0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrKGlkKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9zdG9wRGlzcGF0Y2hpbmcoKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIElzIHRoaXMgRGlzcGF0Y2hlciBjdXJyZW50bHkgZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5pc0Rpc3BhdGNoaW5nPWZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmc7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGwgdGhlIGNhbGxiYWNrIHN0b3JlZCB3aXRoIHRoZSBnaXZlbiBpZC4gQWxzbyBkbyBzb21lIGludGVybmFsXG4gICAqIGJvb2trZWVwaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjaz1mdW5jdGlvbihpZCkge1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSA9IHRydWU7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdKHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQpO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkW2lkXSA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCB1cCBib29ra2VlcGluZyBuZWVkZWQgd2hlbiBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHBheWxvYWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS4kRGlzcGF0Y2hlcl9zdGFydERpc3BhdGNoaW5nPWZ1bmN0aW9uKHBheWxvYWQpIHtcbiAgICBmb3IgKHZhciBpZCBpbiB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcykge1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdID0gZmFsc2U7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0gPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IHBheWxvYWQ7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gdHJ1ZTtcbiAgfTtcblxuICAvKipcbiAgICogQ2xlYXIgYm9va2tlZXBpbmcgdXNlZCBmb3IgZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfc3RvcERpc3BhdGNoaW5nPWZ1bmN0aW9uKCkge1xuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBudWxsO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IGZhbHNlO1xuICB9O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gRGlzcGF0Y2hlcjtcbiIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIGludmFyaWFudFxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFVzZSBpbnZhcmlhbnQoKSB0byBhc3NlcnQgc3RhdGUgd2hpY2ggeW91ciBwcm9ncmFtIGFzc3VtZXMgdG8gYmUgdHJ1ZS5cbiAqXG4gKiBQcm92aWRlIHNwcmludGYtc3R5bGUgZm9ybWF0IChvbmx5ICVzIGlzIHN1cHBvcnRlZCkgYW5kIGFyZ3VtZW50c1xuICogdG8gcHJvdmlkZSBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IGJyb2tlIGFuZCB3aGF0IHlvdSB3ZXJlXG4gKiBleHBlY3RpbmcuXG4gKlxuICogVGhlIGludmFyaWFudCBtZXNzYWdlIHdpbGwgYmUgc3RyaXBwZWQgaW4gcHJvZHVjdGlvbiwgYnV0IHRoZSBpbnZhcmlhbnRcbiAqIHdpbGwgcmVtYWluIHRvIGVuc3VyZSBsb2dpYyBkb2VzIG5vdCBkaWZmZXIgaW4gcHJvZHVjdGlvbi5cbiAqL1xuXG52YXIgaW52YXJpYW50ID0gZnVuY3Rpb24oY29uZGl0aW9uLCBmb3JtYXQsIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgaWYgKGZhbHNlKSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFyaWFudCByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgJ01pbmlmaWVkIGV4Y2VwdGlvbiBvY2N1cnJlZDsgdXNlIHRoZSBub24tbWluaWZpZWQgZGV2IGVudmlyb25tZW50ICcgK1xuICAgICAgICAnZm9yIHRoZSBmdWxsIGVycm9yIG1lc3NhZ2UgYW5kIGFkZGl0aW9uYWwgaGVscGZ1bCB3YXJuaW5ncy4nXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgJ0ludmFyaWFudCBWaW9sYXRpb246ICcgK1xuICAgICAgICBmb3JtYXQucmVwbGFjZSgvJXMvZywgZnVuY3Rpb24oKSB7IHJldHVybiBhcmdzW2FyZ0luZGV4KytdOyB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBlcnJvci5mcmFtZXNUb1BvcCA9IDE7IC8vIHdlIGRvbid0IGNhcmUgYWJvdXQgaW52YXJpYW50J3Mgb3duIGZyYW1lXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfaW1wb3J0ID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL2Jhc2UnKTtcblxudmFyIGJhc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0KTtcblxuLy8gRWFjaCBvZiB0aGVzZSBhdWdtZW50IHRoZSBIYW5kbGViYXJzIG9iamVjdC4gTm8gbmVlZCB0byBzZXR1cCBoZXJlLlxuLy8gKFRoaXMgaXMgZG9uZSB0byBlYXNpbHkgc2hhcmUgY29kZSBiZXR3ZWVuIGNvbW1vbmpzIGFuZCBicm93c2UgZW52cylcblxudmFyIF9TYWZlU3RyaW5nID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL3NhZmUtc3RyaW5nJyk7XG5cbnZhciBfU2FmZVN0cmluZzIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfU2FmZVN0cmluZyk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIF9pbXBvcnQyID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL3V0aWxzJyk7XG5cbnZhciBVdGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQyKTtcblxudmFyIF9pbXBvcnQzID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL3J1bnRpbWUnKTtcblxudmFyIHJ1bnRpbWUgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0Myk7XG5cbnZhciBfbm9Db25mbGljdCA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9uby1jb25mbGljdCcpO1xuXG52YXIgX25vQ29uZmxpY3QyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX25vQ29uZmxpY3QpO1xuXG4vLyBGb3IgY29tcGF0aWJpbGl0eSBhbmQgdXNhZ2Ugb3V0c2lkZSBvZiBtb2R1bGUgc3lzdGVtcywgbWFrZSB0aGUgSGFuZGxlYmFycyBvYmplY3QgYSBuYW1lc3BhY2VcbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIGhiID0gbmV3IGJhc2UuSGFuZGxlYmFyc0Vudmlyb25tZW50KCk7XG5cbiAgVXRpbHMuZXh0ZW5kKGhiLCBiYXNlKTtcbiAgaGIuU2FmZVN0cmluZyA9IF9TYWZlU3RyaW5nMlsnZGVmYXVsdCddO1xuICBoYi5FeGNlcHRpb24gPSBfRXhjZXB0aW9uMlsnZGVmYXVsdCddO1xuICBoYi5VdGlscyA9IFV0aWxzO1xuICBoYi5lc2NhcGVFeHByZXNzaW9uID0gVXRpbHMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICBoYi5WTSA9IHJ1bnRpbWU7XG4gIGhiLnRlbXBsYXRlID0gZnVuY3Rpb24gKHNwZWMpIHtcbiAgICByZXR1cm4gcnVudGltZS50ZW1wbGF0ZShzcGVjLCBoYik7XG4gIH07XG5cbiAgcmV0dXJuIGhiO1xufVxuXG52YXIgaW5zdCA9IGNyZWF0ZSgpO1xuaW5zdC5jcmVhdGUgPSBjcmVhdGU7XG5cbl9ub0NvbmZsaWN0MlsnZGVmYXVsdCddKGluc3QpO1xuXG5pbnN0WydkZWZhdWx0J10gPSBpbnN0O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBpbnN0O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLkhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IEhhbmRsZWJhcnNFbnZpcm9ubWVudDtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBVdGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgVkVSU0lPTiA9ICczLjAuMSc7XG5leHBvcnRzLlZFUlNJT04gPSBWRVJTSU9OO1xudmFyIENPTVBJTEVSX1JFVklTSU9OID0gNjtcblxuZXhwb3J0cy5DT01QSUxFUl9SRVZJU0lPTiA9IENPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPT0gMS54LngnLFxuICA1OiAnPT0gMi4wLjAtYWxwaGEueCcsXG4gIDY6ICc+PSAyLjAuMC1iZXRhLjEnXG59O1xuXG5leHBvcnRzLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xudmFyIGlzQXJyYXkgPSBVdGlscy5pc0FycmF5LFxuICAgIGlzRnVuY3Rpb24gPSBVdGlscy5pc0Z1bmN0aW9uLFxuICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5mdW5jdGlvbiBIYW5kbGViYXJzRW52aXJvbm1lbnQoaGVscGVycywgcGFydGlhbHMpIHtcbiAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xuXG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59XG5cbkhhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXG5cbiAgbG9nZ2VyOiBsb2dnZXIsXG4gIGxvZzogbG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbiByZWdpc3RlckhlbHBlcihuYW1lLCBmbikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoZm4pIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpO1xuICAgICAgfVxuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlckhlbHBlcjogZnVuY3Rpb24gdW5yZWdpc3RlckhlbHBlcihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuaGVscGVyc1tuYW1lXTtcbiAgfSxcblxuICByZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uIHJlZ2lzdGVyUGFydGlhbChuYW1lLCBwYXJ0aWFsKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBwYXJ0aWFsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnQXR0ZW1wdGluZyB0byByZWdpc3RlciBhIHBhcnRpYWwgYXMgdW5kZWZpbmVkJyk7XG4gICAgICB9XG4gICAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gcGFydGlhbDtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbiB1bnJlZ2lzdGVyUGFydGlhbChuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMucGFydGlhbHNbbmFtZV07XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIC8vIEEgbWlzc2luZyBmaWVsZCBpbiBhIHt7Zm9vfX0gY29uc3R1Y3QuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTb21lb25lIGlzIGFjdHVhbGx5IHRyeWluZyB0byBjYWxsIHNvbWV0aGluZywgYmxvdyB1cC5cbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdNaXNzaW5nIGhlbHBlcjogXCInICsgYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXS5uYW1lICsgJ1wiJyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICBpZiAoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmlkcykge1xuICAgICAgICAgIG9wdGlvbnMuaWRzID0gW29wdGlvbnMubmFtZV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgICAgICBvcHRpb25zID0geyBkYXRhOiBkYXRhIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdNdXN0IHBhc3MgaXRlcmF0b3IgdG8gI2VhY2gnKTtcbiAgICB9XG5cbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuLFxuICAgICAgICBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgcmV0ID0gJycsXG4gICAgICAgIGRhdGEgPSB1bmRlZmluZWQsXG4gICAgICAgIGNvbnRleHRQYXRoID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKSArICcuJztcbiAgICB9XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkge1xuICAgICAgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleGVjSXRlcmF0aW9uKGZpZWxkLCBpbmRleCwgbGFzdCkge1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgZGF0YS5rZXkgPSBmaWVsZDtcbiAgICAgICAgZGF0YS5pbmRleCA9IGluZGV4O1xuICAgICAgICBkYXRhLmZpcnN0ID0gaW5kZXggPT09IDA7XG4gICAgICAgIGRhdGEubGFzdCA9ICEhbGFzdDtcblxuICAgICAgICBpZiAoY29udGV4dFBhdGgpIHtcbiAgICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gY29udGV4dFBhdGggKyBmaWVsZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ZpZWxkXSwge1xuICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICBibG9ja1BhcmFtczogVXRpbHMuYmxvY2tQYXJhbXMoW2NvbnRleHRbZmllbGRdLCBmaWVsZF0sIFtjb250ZXh0UGF0aCArIGZpZWxkLCBudWxsXSlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG4gICAgICAgICAgZXhlY0l0ZXJhdGlvbihpLCBpLCBpID09PSBjb250ZXh0Lmxlbmd0aCAtIDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcHJpb3JLZXkgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZiAoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAvLyBXZSdyZSBydW5uaW5nIHRoZSBpdGVyYXRpb25zIG9uZSBzdGVwIG91dCBvZiBzeW5jIHNvIHdlIGNhbiBkZXRlY3RcbiAgICAgICAgICAgIC8vIHRoZSBsYXN0IGl0ZXJhdGlvbiB3aXRob3V0IGhhdmUgdG8gc2NhbiB0aGUgb2JqZWN0IHR3aWNlIGFuZCBjcmVhdGVcbiAgICAgICAgICAgIC8vIGFuIGl0ZXJtZWRpYXRlIGtleXMgYXJyYXkuXG4gICAgICAgICAgICBpZiAocHJpb3JLZXkpIHtcbiAgICAgICAgICAgICAgZXhlY0l0ZXJhdGlvbihwcmlvcktleSwgaSAtIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpb3JLZXkgPSBrZXk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwcmlvcktleSkge1xuICAgICAgICAgIGV4ZWNJdGVyYXRpb24ocHJpb3JLZXksIGkgLSAxLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uIChjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbmRpdGlvbmFsKSkge1xuICAgICAgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgaXMgdG8gcmVuZGVyIHRoZSBwb3NpdGl2ZSBwYXRoIGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgYW5kIG5vdCBlbXB0eS5cbiAgICAvLyBUaGUgYGluY2x1ZGVaZXJvYCBvcHRpb24gbWF5IGJlIHNldCB0byB0cmVhdCB0aGUgY29uZHRpb25hbCBhcyBwdXJlbHkgbm90IGVtcHR5IGJhc2VkIG9uIHRoZVxuICAgIC8vIGJlaGF2aW9yIG9mIGlzRW1wdHkuIEVmZmVjdGl2ZWx5IHRoaXMgZGV0ZXJtaW5lcyBpZiAwIGlzIGhhbmRsZWQgYnkgdGhlIHBvc2l0aXZlIHBhdGggb3IgbmVnYXRpdmUuXG4gICAgaWYgKCFvcHRpb25zLmhhc2guaW5jbHVkZVplcm8gJiYgIWNvbmRpdGlvbmFsIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbiAoY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7IGZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaCB9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoIVV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSk7XG4gICAgICAgIG9wdGlvbnMgPSB7IGRhdGE6IGRhdGEgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uIChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgbWVzc2FnZSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb29rdXAnLCBmdW5jdGlvbiAob2JqLCBmaWVsZCkge1xuICAgIHJldHVybiBvYmogJiYgb2JqW2ZpZWxkXTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMSxcblxuICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uIGxvZyhsZXZlbCwgbWVzc2FnZSkge1xuICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICAoY29uc29sZVttZXRob2RdIHx8IGNvbnNvbGUubG9nKS5jYWxsKGNvbnNvbGUsIG1lc3NhZ2UpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xudmFyIGxvZyA9IGxvZ2dlci5sb2c7XG5cbmV4cG9ydHMubG9nID0gbG9nO1xuXG5mdW5jdGlvbiBjcmVhdGVGcmFtZShvYmplY3QpIHtcbiAgdmFyIGZyYW1lID0gVXRpbHMuZXh0ZW5kKHt9LCBvYmplY3QpO1xuICBmcmFtZS5fcGFyZW50ID0gb2JqZWN0O1xuICByZXR1cm4gZnJhbWU7XG59XG5cbi8qIFthcmdzLCBdb3B0aW9ucyAqLyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xuICB2YXIgbG9jID0gbm9kZSAmJiBub2RlLmxvYyxcbiAgICAgIGxpbmUgPSB1bmRlZmluZWQsXG4gICAgICBjb2x1bW4gPSB1bmRlZmluZWQ7XG4gIGlmIChsb2MpIHtcbiAgICBsaW5lID0gbG9jLnN0YXJ0LmxpbmU7XG4gICAgY29sdW1uID0gbG9jLnN0YXJ0LmNvbHVtbjtcblxuICAgIG1lc3NhZ2UgKz0gJyAtICcgKyBsaW5lICsgJzonICsgY29sdW1uO1xuICB9XG5cbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxuXG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEV4Y2VwdGlvbik7XG4gIH1cblxuICBpZiAobG9jKSB7XG4gICAgdGhpcy5saW5lTnVtYmVyID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IGNvbHVtbjtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IEV4Y2VwdGlvbjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbi8qZ2xvYmFsIHdpbmRvdyAqL1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBmdW5jdGlvbiAoSGFuZGxlYmFycykge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICB2YXIgcm9vdCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93LFxuICAgICAgJEhhbmRsZWJhcnMgPSByb290LkhhbmRsZWJhcnM7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIEhhbmRsZWJhcnMubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAocm9vdC5IYW5kbGViYXJzID09PSBIYW5kbGViYXJzKSB7XG4gICAgICByb290LkhhbmRsZWJhcnMgPSAkSGFuZGxlYmFycztcbiAgICB9XG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247XG5cbi8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXG5cbmV4cG9ydHMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbmV4cG9ydHMud3JhcFByb2dyYW0gPSB3cmFwUHJvZ3JhbTtcbmV4cG9ydHMucmVzb2x2ZVBhcnRpYWwgPSByZXNvbHZlUGFydGlhbDtcbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7XG5leHBvcnRzLm5vb3AgPSBub29wO1xuXG52YXIgX2ltcG9ydCA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZSA9IHJlcXVpcmUoJy4vYmFzZScpO1xuXG5mdW5jdGlvbiBjaGVja1JldmlzaW9uKGNvbXBpbGVySW5mbykge1xuICB2YXIgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mbyAmJiBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiAnICsgJ1BsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKCcgKyBydW50aW1lVmVyc2lvbnMgKyAnKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKCcgKyBjb21waWxlclZlcnNpb25zICsgJykuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gJyArICdQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKCcgKyBjb21waWxlckluZm9bMV0gKyAnKS4nKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlJyk7XG4gIH1cbiAgaWYgKCF0ZW1wbGF0ZVNwZWMgfHwgIXRlbXBsYXRlU3BlYy5tYWluKSB7XG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1Vua25vd24gdGVtcGxhdGUgb2JqZWN0OiAnICsgdHlwZW9mIHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICAvLyBOb3RlOiBVc2luZyBlbnYuVk0gcmVmZXJlbmNlcyByYXRoZXIgdGhhbiBsb2NhbCB2YXIgcmVmZXJlbmNlcyB0aHJvdWdob3V0IHRoaXMgc2VjdGlvbiB0byBhbGxvd1xuICAvLyBmb3IgZXh0ZXJuYWwgdXNlcnMgdG8gb3ZlcnJpZGUgdGhlc2UgYXMgcHN1ZWRvLXN1cHBvcnRlZCBBUElzLlxuICBlbnYuVk0uY2hlY2tSZXZpc2lvbih0ZW1wbGF0ZVNwZWMuY29tcGlsZXIpO1xuXG4gIGZ1bmN0aW9uIGludm9rZVBhcnRpYWxXcmFwcGVyKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5oYXNoKSB7XG4gICAgICBjb250ZXh0ID0gVXRpbHMuZXh0ZW5kKHt9LCBjb250ZXh0LCBvcHRpb25zLmhhc2gpO1xuICAgIH1cblxuICAgIHBhcnRpYWwgPSBlbnYuVk0ucmVzb2x2ZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcblxuICAgIGlmIChyZXN1bHQgPT0gbnVsbCAmJiBlbnYuY29tcGlsZSkge1xuICAgICAgb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgdGVtcGxhdGVTcGVjLmNvbXBpbGVyT3B0aW9ucywgZW52KTtcbiAgICAgIHJlc3VsdCA9IG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7XG4gICAgICBpZiAob3B0aW9ucy5pbmRlbnQpIHtcbiAgICAgICAgdmFyIGxpbmVzID0gcmVzdWx0LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaW5lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICBpZiAoIWxpbmVzW2ldICYmIGkgKyAxID09PSBsKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaW5lc1tpXSA9IG9wdGlvbnMuaW5kZW50ICsgbGluZXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gbGluZXMuam9pbignXFxuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGhlIHBhcnRpYWwgJyArIG9wdGlvbnMubmFtZSArICcgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZScpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEp1c3QgYWRkIHdhdGVyXG4gIHZhciBjb250YWluZXIgPSB7XG4gICAgc3RyaWN0OiBmdW5jdGlvbiBzdHJpY3Qob2JqLCBuYW1lKSB7XG4gICAgICBpZiAoIShuYW1lIGluIG9iaikpIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1wiJyArIG5hbWUgKyAnXCIgbm90IGRlZmluZWQgaW4gJyArIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqW25hbWVdO1xuICAgIH0sXG4gICAgbG9va3VwOiBmdW5jdGlvbiBsb29rdXAoZGVwdGhzLCBuYW1lKSB7XG4gICAgICB2YXIgbGVuID0gZGVwdGhzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKGRlcHRoc1tpXSAmJiBkZXB0aHNbaV1bbmFtZV0gIT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBkZXB0aHNbaV1bbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGxhbWJkYTogZnVuY3Rpb24gbGFtYmRhKGN1cnJlbnQsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgY3VycmVudCA9PT0gJ2Z1bmN0aW9uJyA/IGN1cnJlbnQuY2FsbChjb250ZXh0KSA6IGN1cnJlbnQ7XG4gICAgfSxcblxuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG5cbiAgICBmbjogZnVuY3Rpb24gZm4oaSkge1xuICAgICAgcmV0dXJuIHRlbXBsYXRlU3BlY1tpXTtcbiAgICB9LFxuXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uIHByb2dyYW0oaSwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSxcbiAgICAgICAgICBmbiA9IHRoaXMuZm4oaSk7XG4gICAgICBpZiAoZGF0YSB8fCBkZXB0aHMgfHwgYmxvY2tQYXJhbXMgfHwgZGVjbGFyZWRCbG9ja1BhcmFtcykge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHdyYXBQcm9ncmFtKHRoaXMsIGksIGZuLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IHdyYXBQcm9ncmFtKHRoaXMsIGksIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICB9LFxuXG4gICAgZGF0YTogZnVuY3Rpb24gZGF0YSh2YWx1ZSwgZGVwdGgpIHtcbiAgICAgIHdoaWxlICh2YWx1ZSAmJiBkZXB0aC0tKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuX3BhcmVudDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbiBtZXJnZShwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgb2JqID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIHBhcmFtICE9PSBjb21tb24pIHtcbiAgICAgICAgb2JqID0gVXRpbHMuZXh0ZW5kKHt9LCBjb21tb24sIHBhcmFtKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9LFxuXG4gICAgbm9vcDogZW52LlZNLm5vb3AsXG4gICAgY29tcGlsZXJJbmZvOiB0ZW1wbGF0ZVNwZWMuY29tcGlsZXJcbiAgfTtcblxuICBmdW5jdGlvbiByZXQoY29udGV4dCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1sxXTtcblxuICAgIHZhciBkYXRhID0gb3B0aW9ucy5kYXRhO1xuXG4gICAgcmV0Ll9zZXR1cChvcHRpb25zKTtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCAmJiB0ZW1wbGF0ZVNwZWMudXNlRGF0YSkge1xuICAgICAgZGF0YSA9IGluaXREYXRhKGNvbnRleHQsIGRhdGEpO1xuICAgIH1cbiAgICB2YXIgZGVwdGhzID0gdW5kZWZpbmVkLFxuICAgICAgICBibG9ja1BhcmFtcyA9IHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyA/IFtdIDogdW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzKSB7XG4gICAgICBkZXB0aHMgPSBvcHRpb25zLmRlcHRocyA/IFtjb250ZXh0XS5jb25jYXQob3B0aW9ucy5kZXB0aHMpIDogW2NvbnRleHRdO1xuICAgIH1cblxuICAgIHJldHVybiB0ZW1wbGF0ZVNwZWMubWFpbi5jYWxsKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gIH1cbiAgcmV0LmlzVG9wID0gdHJ1ZTtcblxuICByZXQuX3NldHVwID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5oZWxwZXJzLCBlbnYuaGVscGVycyk7XG5cbiAgICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlUGFydGlhbCkge1xuICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5wYXJ0aWFscywgZW52LnBhcnRpYWxzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBjb250YWluZXIucGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgfTtcblxuICByZXQuX2NoaWxkID0gZnVuY3Rpb24gKGksIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZUJsb2NrUGFyYW1zICYmICFibG9ja1BhcmFtcykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ211c3QgcGFzcyBibG9jayBwYXJhbXMnKTtcbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMgJiYgIWRlcHRocykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ211c3QgcGFzcyBwYXJlbnQgZGVwdGhzJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdyYXBQcm9ncmFtKGNvbnRhaW5lciwgaSwgdGVtcGxhdGVTcGVjW2ldLCBkYXRhLCAwLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgfTtcbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICBmdW5jdGlvbiBwcm9nKGNvbnRleHQpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMV07XG5cbiAgICByZXR1cm4gZm4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIG9wdGlvbnMuZGF0YSB8fCBkYXRhLCBibG9ja1BhcmFtcyAmJiBbb3B0aW9ucy5ibG9ja1BhcmFtc10uY29uY2F0KGJsb2NrUGFyYW1zKSwgZGVwdGhzICYmIFtjb250ZXh0XS5jb25jYXQoZGVwdGhzKSk7XG4gIH1cbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IGRlcHRocyA/IGRlcHRocy5sZW5ndGggOiAwO1xuICBwcm9nLmJsb2NrUGFyYW1zID0gZGVjbGFyZWRCbG9ja1BhcmFtcyB8fCAwO1xuICByZXR1cm4gcHJvZztcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVBhcnRpYWwocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICBpZiAoIXBhcnRpYWwpIHtcbiAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdO1xuICB9IGVsc2UgaWYgKCFwYXJ0aWFsLmNhbGwgJiYgIW9wdGlvbnMubmFtZSkge1xuICAgIC8vIFRoaXMgaXMgYSBkeW5hbWljIHBhcnRpYWwgdGhhdCByZXR1cm5lZCBhIHN0cmluZ1xuICAgIG9wdGlvbnMubmFtZSA9IHBhcnRpYWw7XG4gICAgcGFydGlhbCA9IG9wdGlvbnMucGFydGlhbHNbcGFydGlhbF07XG4gIH1cbiAgcmV0dXJuIHBhcnRpYWw7XG59XG5cbmZ1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICBvcHRpb25zLnBhcnRpYWwgPSB0cnVlO1xuXG4gIGlmIChwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGhlIHBhcnRpYWwgJyArIG9wdGlvbnMubmFtZSArICcgY291bGQgbm90IGJlIGZvdW5kJyk7XG4gIH0gZWxzZSBpZiAocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9vcCgpIHtcbiAgcmV0dXJuICcnO1xufVxuXG5mdW5jdGlvbiBpbml0RGF0YShjb250ZXh0LCBkYXRhKSB7XG4gIGlmICghZGF0YSB8fCAhKCdyb290JyBpbiBkYXRhKSkge1xuICAgIGRhdGEgPSBkYXRhID8gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuY3JlYXRlRnJhbWUoZGF0YSkgOiB7fTtcbiAgICBkYXRhLnJvb3QgPSBjb250ZXh0O1xuICB9XG4gIHJldHVybiBkYXRhO1xufSIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBTYWZlU3RyaW5nLnByb3RvdHlwZS50b0hUTUwgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAnJyArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gU2FmZVN0cmluZztcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO1xuXG4vLyBPbGRlciBJRSB2ZXJzaW9ucyBkbyBub3QgZGlyZWN0bHkgc3VwcG9ydCBpbmRleE9mIHNvIHdlIG11c3QgaW1wbGVtZW50IG91ciBvd24sIHNhZGx5LlxuZXhwb3J0cy5pbmRleE9mID0gaW5kZXhPZjtcbmV4cG9ydHMuZXNjYXBlRXhwcmVzc2lvbiA9IGVzY2FwZUV4cHJlc3Npb247XG5leHBvcnRzLmlzRW1wdHkgPSBpc0VtcHR5O1xuZXhwb3J0cy5ibG9ja1BhcmFtcyA9IGJsb2NrUGFyYW1zO1xuZXhwb3J0cy5hcHBlbmRDb250ZXh0UGF0aCA9IGFwcGVuZENvbnRleHRQYXRoO1xudmFyIGVzY2FwZSA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmcXVvdDsnLFxuICAnXFwnJzogJyYjeDI3OycsXG4gICdgJzogJyYjeDYwOydcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZyxcbiAgICBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG5mdW5jdGlvbiBlc2NhcGVDaGFyKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl07XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmogLyogLCAuLi5zb3VyY2UgKi8pIHtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmV4cG9ydHMudG9TdHJpbmcgPSB0b1N0cmluZztcbi8vIFNvdXJjZWQgZnJvbSBsb2Rhc2hcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcbi8qZXNsaW50LWRpc2FibGUgZnVuYy1zdHlsZSwgbm8tdmFyICovXG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb24gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9O1xufVxudmFyIGlzRnVuY3Rpb247XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuLyplc2xpbnQtZW5hYmxlIGZ1bmMtc3R5bGUsIG5vLXZhciAqL1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O2V4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGluZGV4T2YoYXJyYXksIHZhbHVlKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnJheS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChhcnJheVtpXSA9PT0gdmFsdWUpIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgICBpZiAoc3RyaW5nICYmIHN0cmluZy50b0hUTUwpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9IVE1MKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH0gZWxzZSBpZiAoIXN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZyArICcnO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nO1xuICB9XG5cbiAgaWYgKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nO1xuICB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBibG9ja1BhcmFtcyhwYXJhbXMsIGlkcykge1xuICBwYXJhbXMucGF0aCA9IGlkcztcbiAgcmV0dXJuIHBhcmFtcztcbn1cblxuZnVuY3Rpb24gYXBwZW5kQ29udGV4dFBhdGgoY29udGV4dFBhdGgsIGlkKSB7XG4gIHJldHVybiAoY29udGV4dFBhdGggPyBjb250ZXh0UGF0aCArICcuJyA6ICcnKSArIGlkO1xufSIsIi8vIENyZWF0ZSBhIHNpbXBsZSBwYXRoIGFsaWFzIHRvIGFsbG93IGJyb3dzZXJpZnkgdG8gcmVzb2x2ZVxuLy8gdGhlIHJ1bnRpbWUgb24gYSBzdXBwb3J0ZWQgcGF0aC5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9kaXN0L2Nqcy9oYW5kbGViYXJzLnJ1bnRpbWUnKVsnZGVmYXVsdCddO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpW1wiZGVmYXVsdFwiXTtcbiIsInZhciBiYXNlVG9TdHJpbmcgPSByZXF1aXJlKCcuLi9pbnRlcm5hbC9iYXNlVG9TdHJpbmcnKTtcblxuLyoqXG4gKiBDYXBpdGFsaXplcyB0aGUgZmlyc3QgY2hhcmFjdGVyIG9mIGBzdHJpbmdgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgU3RyaW5nXG4gKiBAcGFyYW0ge3N0cmluZ30gW3N0cmluZz0nJ10gVGhlIHN0cmluZyB0byBjYXBpdGFsaXplLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgY2FwaXRhbGl6ZWQgc3RyaW5nLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmNhcGl0YWxpemUoJ2ZyZWQnKTtcbiAqIC8vID0+ICdGcmVkJ1xuICovXG5mdW5jdGlvbiBjYXBpdGFsaXplKHN0cmluZykge1xuICBzdHJpbmcgPSBiYXNlVG9TdHJpbmcoc3RyaW5nKTtcbiAgcmV0dXJuIHN0cmluZyAmJiAoc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjYXBpdGFsaXplO1xuIiwiLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgc3RyaW5nIGlmIGl0J3Mgbm90IG9uZS4gQW4gZW1wdHkgc3RyaW5nIGlzIHJldHVybmVkXG4gKiBmb3IgYG51bGxgIG9yIGB1bmRlZmluZWRgIHZhbHVlcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gYmFzZVRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PSBudWxsID8gJycgOiAodmFsdWUgKyAnJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYmFzZVRvU3RyaW5nO1xuIiwiLy8gQXZvaWQgY29uc29sZSBlcnJvcnMgZm9yIHRoZSBJRSBjcmFwcHkgYnJvd3NlcnNcbmlmICggISB3aW5kb3cuY29uc29sZSApIGNvbnNvbGUgPSB7IGxvZzogZnVuY3Rpb24oKXt9IH07XG5cbmltcG9ydCBBcHAgZnJvbSAnQXBwJ1xuaW1wb3J0ICQgZnJvbSAnanF1ZXJ5J1xuaW1wb3J0IFR3ZWVuTWF4IGZyb20gJ2dzYXAnXG5pbXBvcnQgcmFmIGZyb20gJ3JhZidcbmltcG9ydCBwaXhpIGZyb20gJ3BpeGkuanMnXG5pbXBvcnQgUHJlbG9hZGVyIGZyb20gJ1ByZWxvYWRlcidcblxud2luZG93LlByZWxvYWRlciA9IG5ldyBQcmVsb2FkZXIoKVxud2luZG93LmpRdWVyeSA9IHdpbmRvdy4kID0gJFxuXG4vLyBTdGFydCBBcHBcbnZhciBhcHAgPSBuZXcgQXBwKClcbmFwcC5pbml0KClcbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwVGVtcGxhdGUgZnJvbSAnQXBwVGVtcGxhdGUnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBHRXZlbnRzIGZyb20gJ0dsb2JhbEV2ZW50cydcbmltcG9ydCBQb29sIGZyb20gJ1Bvb2wnXG5cbmNsYXNzIEFwcCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHR9XG5cdGluaXQoKSB7XG5cblx0XHQvLyBJbml0IFBvb2xcblx0XHRBcHBTdG9yZS5Qb29sID0gbmV3IFBvb2woKVxuXG5cdFx0Ly8gSW5pdCByb3V0ZXJcblx0XHR0aGlzLnJvdXRlciA9IG5ldyBSb3V0ZXIoKVxuXHRcdHRoaXMucm91dGVyLmluaXQoKVxuXG5cdFx0Ly8gSW5pdCBnbG9iYWwgZXZlbnRzXG5cdFx0d2luZG93Lkdsb2JhbEV2ZW50cyA9IG5ldyBHRXZlbnRzKClcblx0XHRHbG9iYWxFdmVudHMuaW5pdCgpXG5cblx0XHR2YXIgYXBwVGVtcGxhdGUgPSBuZXcgQXBwVGVtcGxhdGUoKVxuXHRcdHRoaXMudGVtcGxhdGVJc1JlYWR5ID0gdGhpcy50ZW1wbGF0ZUlzUmVhZHkuYmluZCh0aGlzKVxuXHRcdGFwcFRlbXBsYXRlLmlzUmVhZHkgPSB0aGlzLnRlbXBsYXRlSXNSZWFkeVxuXHRcdGFwcFRlbXBsYXRlLnJlbmRlcignI2FwcC1jb250YWluZXInKVxuXHR9XG5cdHRlbXBsYXRlSXNSZWFkeSgpIHtcblx0XHQvLyBTdGFydCByb3V0aW5nXG5cdFx0dGhpcy5yb3V0ZXIuYmVnaW5Sb3V0aW5nKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBcbiAgICBcdFxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCBGcm9udENvbnRhaW5lciBmcm9tICdGcm9udENvbnRhaW5lcidcbmltcG9ydCBQYWdlc0NvbnRhaW5lciBmcm9tICdQYWdlc0NvbnRhaW5lcidcbmltcG9ydCBQWENvbnRhaW5lciBmcm9tICdQWENvbnRhaW5lcidcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuY2xhc3MgQXBwVGVtcGxhdGUgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMuaXNSZWFkeSA9IHVuZGVmaW5lZFxuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0fVxuXHRyZW5kZXIocGFyZW50KSB7XG5cdFx0c3VwZXIucmVuZGVyKCdBcHBUZW1wbGF0ZScsIHBhcmVudCwgdW5kZWZpbmVkKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHRoaXMuZnJvbnRDb250YWluZXIgPSBuZXcgRnJvbnRDb250YWluZXIoKVxuXHRcdHRoaXMuZnJvbnRDb250YWluZXIucmVuZGVyKCcjYXBwLXRlbXBsYXRlJylcblxuXHRcdHRoaXMucGFnZXNDb250YWluZXIgPSBuZXcgUGFnZXNDb250YWluZXIoKVxuXHRcdHRoaXMucGFnZXNDb250YWluZXIucmVuZGVyKCcjYXBwLXRlbXBsYXRlJylcblxuXHRcdHRoaXMucHhDb250YWluZXIgPSBuZXcgUFhDb250YWluZXIoKVxuXHRcdHRoaXMucHhDb250YWluZXIuaW5pdCgnI2FwcC10ZW1wbGF0ZScpXG5cdFx0QXBwQWN0aW9ucy5weENvbnRhaW5lcklzUmVhZHkodGhpcy5weENvbnRhaW5lcilcblxuXHRcdEdsb2JhbEV2ZW50cy5yZXNpemUoKVxuXG5cdFx0dGhpcy5hbmltYXRlKClcblxuXHRcdHNldFRpbWVvdXQoKCk9Pnt0aGlzLmlzUmVhZHkoKX0sIDApXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG5cdGFuaW1hdGUoKSB7XG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0ZSlcblx0ICAgIHRoaXMucHhDb250YWluZXIudXBkYXRlKClcblx0ICAgIHRoaXMucGFnZXNDb250YWluZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5mcm9udENvbnRhaW5lci5yZXNpemUoKVxuXHRcdHRoaXMucHhDb250YWluZXIucmVzaXplKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBUZW1wbGF0ZVxuIiwiaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwRGlzcGF0Y2hlciBmcm9tICdBcHBEaXNwYXRjaGVyJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5mdW5jdGlvbiBfcHJvY2VlZEhhc2hlckNoYW5nZUFjdGlvbihwYWdlSWQpIHtcbiAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCxcbiAgICAgICAgaXRlbTogcGFnZUlkXG4gICAgfSkgIFxufVxudmFyIEFwcEFjdGlvbnMgPSB7XG4gICAgcGFnZUhhc2hlckNoYW5nZWQ6IGZ1bmN0aW9uKHBhZ2VJZCkge1xuICAgICAgICB2YXIgbWFuaWZlc3QgPSBBcHBTdG9yZS5wYWdlQXNzZXRzVG9Mb2FkKClcbiAgICAgICAgaWYobWFuaWZlc3QubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgX3Byb2NlZWRIYXNoZXJDaGFuZ2VBY3Rpb24ocGFnZUlkKVxuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIFByZWxvYWRlci5sb2FkKG1hbmlmZXN0LCAoKT0+e1xuICAgICAgICAgICAgICAgIF9wcm9jZWVkSGFzaGVyQ2hhbmdlQWN0aW9uKHBhZ2VJZClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHdpbmRvd1Jlc2l6ZTogZnVuY3Rpb24od2luZG93Vywgd2luZG93SCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLldJTkRPV19SRVNJWkUsXG4gICAgICAgICAgICBpdGVtOiB7IHdpbmRvd1c6d2luZG93Vywgd2luZG93SDp3aW5kb3dIIH1cbiAgICAgICAgfSlcbiAgICB9LFxuICAgIHB4Q29udGFpbmVySXNSZWFkeTogZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0lTX1JFQURZLFxuICAgICAgICAgICAgaXRlbTogY29tcG9uZW50XG4gICAgICAgIH0pICAgICAgICAgICAgXG4gICAgfSxcbiAgICBweEFkZENoaWxkOiBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9BRERfQ0hJTEQsXG4gICAgICAgICAgICBpdGVtOiB7Y2hpbGQ6IGNoaWxkfVxuICAgICAgICB9KSAgICAgICAgICAgIFxuICAgIH0sXG4gICAgcHhSZW1vdmVDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfUkVNT1ZFX0NISUxELFxuICAgICAgICAgICAgaXRlbToge2NoaWxkOiBjaGlsZH1cbiAgICAgICAgfSkgICAgICAgICAgICBcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFwcEFjdGlvbnNcblxuXG4gICAgICBcbiIsImltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJyb3dCdG4ge1xuXHRjb25zdHJ1Y3RvcihwYXJlbnRDb250YWluZXIsIGRpcmVjdGlvbikge1xuXHRcdHRoaXMucGFyZW50Q29udGFpbmVyID0gcGFyZW50Q29udGFpbmVyXG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb25cblx0XHR0aGlzLmlzUm9sbG92ZXIgPSBmYWxzZVxuXG5cdFx0dGhpcy5jb25maWcgPSB7XG5cdFx0XHRzcHJpbmc6IDAsXG5cdFx0XHRmcmljdGlvbjogMCxcblx0XHRcdHNwcmluZ0xlbmd0aDogMFxuXHRcdH1cblx0XHR0aGlzLmNvbmZpZy5zcHJpbmcgPSAwLjFcblx0XHR0aGlzLmNvbmZpZy5mcmljdGlvbiA9IDAuOFxuXHRcdHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCA9IDBcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmNvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0dGhpcy5wYXJlbnRDb250YWluZXIuYWRkQ2hpbGQodGhpcy5jb250YWluZXIpXG5cdFx0dGhpcy5saW5lU2l6ZSA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0dmFyIHJhZGl1cyA9IDNcblx0XHR2YXIgbWFyZ2luID0gMzBcblx0XHR0aGlzLmtub3RzTGluZSA9IFtcblx0XHRcdG5ldyBLbm90KHRoaXMuY29udGFpbmVyLCByYWRpdXMpLmNvbXBvbmVudERpZE1vdW50KCksXG5cdFx0XHRuZXcgS25vdCh0aGlzLmNvbnRhaW5lciwgcmFkaXVzKS5jb21wb25lbnREaWRNb3VudCgpLFxuXHRcdFx0bmV3IEtub3QodGhpcy5jb250YWluZXIsIHJhZGl1cykuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdF1cblx0XHR0aGlzLmtub3RzVHJpYW5nbGUgPSBbXG5cdFx0XHRuZXcgS25vdCh0aGlzLmNvbnRhaW5lciwgcmFkaXVzKS5jb21wb25lbnREaWRNb3VudCgpLFxuXHRcdFx0bmV3IEtub3QodGhpcy5jb250YWluZXIsIHJhZGl1cykuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdF1cblxuXHRcdC8vIG1vdXNlb3V0IHBvc2l0aW9uc1xuXHRcdHRoaXMua25vdHNMaW5lWzBdLnBvc2l0aW9uKC1tYXJnaW4gKiAyLCAwKVxuXHRcdHRoaXMua25vdHNMaW5lWzBdLmZyb21YID0gLW1hcmdpbiAqIDJcblx0XHR0aGlzLmtub3RzTGluZVsxXS5wb3NpdGlvbigtbWFyZ2luLCAwKVxuXHRcdHRoaXMua25vdHNMaW5lWzFdLmZyb21YID0gLW1hcmdpblxuXHRcdHRoaXMua25vdHNUcmlhbmdsZVswXS5wb3NpdGlvbigtbWFyZ2luKjAuNiwgLW1hcmdpbiowLjcpXG5cdFx0dGhpcy5rbm90c1RyaWFuZ2xlWzBdLmZyb21YID0gLW1hcmdpbiowLjZcblx0XHR0aGlzLmtub3RzVHJpYW5nbGVbMF0uZnJvbVkgPSAtbWFyZ2luKjAuN1xuXHRcdHRoaXMua25vdHNUcmlhbmdsZVsxXS5wb3NpdGlvbigtbWFyZ2luKjAuNiwgbWFyZ2luKjAuNylcblx0XHR0aGlzLmtub3RzVHJpYW5nbGVbMV0uZnJvbVggPSAtbWFyZ2luKjAuNlxuXHRcdHRoaXMua25vdHNUcmlhbmdsZVsxXS5mcm9tWSA9IG1hcmdpbiowLjdcblxuXHRcdC8vIG1vdXNlb3ZlciBwb3NpdGlvbnNcblx0XHR0aGlzLmtub3RzTGluZVswXS50b1ggPSB0aGlzLmtub3RzTGluZVswXS54IC0gKG1hcmdpbiAqIDAuNilcblx0XHR0aGlzLmtub3RzTGluZVsxXS50b1ggPSB0aGlzLmtub3RzTGluZVsxXS54IC0gKG1hcmdpbiAqIDAuMilcblx0XHR0aGlzLmtub3RzTGluZVsyXS50b1ggPSB0aGlzLmtub3RzTGluZVsyXS54ICsgKG1hcmdpbiAqIDAuMilcblxuXHRcdHRoaXMua25vdHNUcmlhbmdsZVswXS50b1ggPSB0aGlzLmtub3RzVHJpYW5nbGVbMF0uZnJvbVhcblx0XHR0aGlzLmtub3RzVHJpYW5nbGVbMF0udG9ZID0gdGhpcy5rbm90c1RyaWFuZ2xlWzBdLmZyb21ZICsgKG1hcmdpbiowLjEpXG5cblx0XHR0aGlzLmtub3RzVHJpYW5nbGVbMV0udG9YID0gdGhpcy5rbm90c1RyaWFuZ2xlWzFdLmZyb21YXG5cdFx0dGhpcy5rbm90c1RyaWFuZ2xlWzFdLnRvWSA9IHRoaXMua25vdHNUcmlhbmdsZVsxXS5mcm9tWSAtIChtYXJnaW4qMC4xKVxuXG5cdFx0dGhpcy5nID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuZylcblx0XHR0aGlzLmRyYXdMaW5lcyh0aGlzLmcpXG5cblx0XHRzd2l0Y2godGhpcy5kaXJlY3Rpb24pIHtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxFRlQ6XG5cdFx0XHRcdHRoaXMuY29udGFpbmVyLnJvdGF0aW9uID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucygxODApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5SSUdIVDpcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlRPUDpcblx0XHRcdFx0dGhpcy5jb250YWluZXIucm90YXRpb24gPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKC05MClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkJPVFRPTTpcblx0XHRcdFx0dGhpcy5jb250YWluZXIucm90YXRpb24gPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKDkwKVxuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHRoaXMud2lkdGggPSBtYXJnaW4gKiAzXG5cdFx0dGhpcy5oZWlnaHQgPSBtYXJnaW4gKiAyXG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMuY29udGFpbmVyLnggPSB4XG5cdFx0dGhpcy5jb250YWluZXIueSA9IHlcblx0fVxuXHRyb2xsb3V0KCkge1xuXHRcdHRoaXMudXBkYXRlU3RyaW5ncygnZnJvbVgnLCAnZnJvbVknKVxuXHR9XG5cdHJvbGxvdmVyKCkge1xuXHRcdHRoaXMudXBkYXRlU3RyaW5ncygndG9YJywgJ3RvWScpXG5cdH1cblx0dXBkYXRlU3RyaW5ncyhkaXJYLCBkaXJZKSB7XG5cdFx0dmFyIHNwcmluZyA9IHRoaXMuY29uZmlnLnNwcmluZ1xuXHRcdHZhciBmcmljdGlvbiA9IHRoaXMuY29uZmlnLmZyaWN0aW9uXG5cdFx0dmFyIHNwcmluZ0xlbmd0aCA9IHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aFxuXHRcdHZhciBrbm90c0xpbmUgPSB0aGlzLmtub3RzTGluZVxuXHRcdHZhciBrbm90c1RyaWFuZ2xlID0gdGhpcy5rbm90c1RyaWFuZ2xlXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrbm90c0xpbmUubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0ga25vdHNMaW5lW2ldXG5cdFx0XHRVdGlscy5TcHJpbmdUbyhrbm90LCBrbm90W2RpclhdLCBrbm90W2RpclldLCBpLCBzcHJpbmcsIGZyaWN0aW9uLCBzcHJpbmdMZW5ndGgpXG5cdFx0XHRrbm90LnBvc2l0aW9uKGtub3QueCArIGtub3QudngsIGtub3QueSArIGtub3QudnkpXG5cdFx0fVxuXHRcdGZvciAoaSA9IDA7IGkgPCBrbm90c1RyaWFuZ2xlLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IGtub3RzVHJpYW5nbGVbaV1cblx0XHRcdFV0aWxzLlNwcmluZ1RvKGtub3QsIGtub3RbZGlyWF0sIGtub3RbZGlyWV0sIGksIHNwcmluZywgZnJpY3Rpb24sIHNwcmluZ0xlbmd0aClcblx0XHRcdGtub3QucG9zaXRpb24oa25vdC54ICsga25vdC52eCwga25vdC55ICsga25vdC52eSlcblx0XHR9XG5cdFx0dGhpcy5kcmF3TGluZXModGhpcy5nKVxuXHR9XG5cdGRyYXdMaW5lcyhnKSB7XG5cdFx0Zy5jbGVhcigpXG5cdFx0Zy5saW5lU3R5bGUodGhpcy5saW5lU2l6ZSwgMHhmZmZmZmYpXG5cblx0XHRnLm1vdmVUbyh0aGlzLmtub3RzTGluZVswXS54LHRoaXMua25vdHNMaW5lWzBdLnkpXG5cdFx0Zy5saW5lVG8odGhpcy5rbm90c0xpbmVbMV0ueCwgdGhpcy5rbm90c0xpbmVbMV0ueSlcblx0XHRnLmxpbmVUbyh0aGlzLmtub3RzTGluZVsyXS54LCB0aGlzLmtub3RzTGluZVsyXS55KVxuXG5cdFx0Zy5tb3ZlVG8odGhpcy5rbm90c1RyaWFuZ2xlWzBdLngsdGhpcy5rbm90c1RyaWFuZ2xlWzBdLnkpXG5cdFx0Zy5saW5lVG8odGhpcy5rbm90c0xpbmVbMl0ueCwgdGhpcy5rbm90c0xpbmVbMl0ueSlcblxuXHRcdGcubW92ZVRvKHRoaXMua25vdHNUcmlhbmdsZVsxXS54LHRoaXMua25vdHNUcmlhbmdsZVsxXS55KVxuXHRcdGcubGluZVRvKHRoaXMua25vdHNMaW5lWzJdLngsIHRoaXMua25vdHNMaW5lWzJdLnkpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmtub3RzTGluZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5rbm90c0xpbmVbaV0uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdH1cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMua25vdHNUcmlhbmdsZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5rbm90c1RyaWFuZ2xlW2ldLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR9XG5cdFx0dGhpcy5jb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHR9XG59XG4iLCJpbXBvcnQgUGFnZSBmcm9tICdQYWdlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZVBsYW5ldFBhZ2UgZXh0ZW5kcyBQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcylcblx0XHR0aGlzLmV4cGVyaWVuY2UgPSB1bmRlZmluZWRcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5leHBlcmllbmNlLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFNwcmluZ0dhcmRlbiBmcm9tICdTcHJpbmdHYXJkZW4nXG5pbXBvcnQgQ29tcGFzc1JpbmdzIGZyb20gJ0NvbXBhc3NSaW5ncydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGFzcyB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCB0eXBlKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lciA9IHB4Q29udGFpbmVyXG5cdFx0dGhpcy50eXBlID0gdHlwZSB8fCBBcHBDb25zdGFudHMuTEFORElOR1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuY29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKVxuXG4gXHRcdHRoaXMucmluZ3MgPSBuZXcgQ29tcGFzc1JpbmdzKHRoaXMuY29udGFpbmVyKVxuXHQgXHR0aGlzLnJpbmdzLmNvbXBvbmVudERpZE1vdW50KClcblxuXHQgXHR0aGlzLnNwcmluZ0dhcmRlbnMgPSBbXVxuXHR9XG5cdHVwZGF0ZURhdGEoZGF0YSkge1xuXHRcdHRoaXMucmVtb3ZlUHJldmlvdXNTcHJpbmdHYXJkZW5zKClcblx0XHR0aGlzLnNwcmluZ0dhcmRlbnMgPSBbXVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IEFwcFN0b3JlLmdldFNwcmluZ0dhcmRlbigpXG5cdFx0XHR2YXIgcHJvZHVjdCA9IGRhdGFbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi5yYWRpdXMgPSB0aGlzLnJhZGl1c1xuXHRcdFx0c3ByaW5nR2FyZGVuLmNvbXBvbmVudERpZE1vdW50KHByb2R1Y3Qua25vdHMsIHByb2R1Y3QuY29sb3IpXG5cdFx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZChzcHJpbmdHYXJkZW4uY29udGFpbmVyKVxuXHRcdFx0dGhpcy5zcHJpbmdHYXJkZW5zW2ldID0gc3ByaW5nR2FyZGVuXG5cdFx0fVxuXHR9XG5cdHJlbW92ZVByZXZpb3VzU3ByaW5nR2FyZGVucygpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc3ByaW5nR2FyZGVucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IHRoaXMuc3ByaW5nR2FyZGVuc1tpXVxuXHRcdFx0dGhpcy5jb250YWluZXIucmVtb3ZlQ2hpbGQoc3ByaW5nR2FyZGVuLmNvbnRhaW5lcilcblx0XHRcdEFwcFN0b3JlLnJlbGVhc2VTcHJpbmdHYXJkZW4oc3ByaW5nR2FyZGVuKVxuXHRcdH1cblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0aWYodGhpcy5zcHJpbmdHYXJkZW5zLmxlbmd0aCA8IDEpIHJldHVybiBcblx0IFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSB0aGlzLnNwcmluZ0dhcmRlbnNbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi51cGRhdGUoKVxuXHRcdH1cblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBzaXplUGVyY2VudGFnZSA9ICh0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UgfHwgdGhpcy50eXBlID09IEFwcENvbnN0YW50cy5DQU1QQUlHTikgPyBBcHBDb25zdGFudHMuQ09NUEFTU19TTUFMTF9TSVpFX1BFUkNFTlRBR0UgOiBBcHBDb25zdGFudHMuQ09NUEFTU19TSVpFX1BFUkNFTlRBR0Vcblx0XHR0aGlzLnJhZGl1cyA9IHdpbmRvd0ggKiBzaXplUGVyY2VudGFnZVxuXHRcdHRoaXMucmluZ3MucmVzaXplKHRoaXMucmFkaXVzKVxuXG5cdFx0aWYodGhpcy5zcHJpbmdHYXJkZW5zLmxlbmd0aCA8IDEpIHJldHVybiBcblx0IFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSB0aGlzLnNwcmluZ0dhcmRlbnNbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi5yZXNpemUodGhpcy5yYWRpdXMpXG5cdFx0fVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLmNvbnRhaW5lci54ID0geFxuXHRcdHRoaXMuY29udGFpbmVyLnkgPSB5XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLmNvbnRhaW5lcilcblx0XHR0aGlzLnJlbW92ZVByZXZpb3VzU3ByaW5nR2FyZGVucygpXG5cdFx0dGhpcy5yaW5ncy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb21wYXNzUmluZ3Mge1xuXHRjb25zdHJ1Y3RvcihwYXJlbnRDb250YWluZXIpIHtcblx0XHR0aGlzLmNvbnRhaW5lciA9IHBhcmVudENvbnRhaW5lclxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMucmluZ3NDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHRcdHRoaXMudGl0bGVzQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLmdlbmRlckNvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5yaW5nc0NvbnRhaW5lcilcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnRpdGxlc0NvbnRhaW5lcilcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmdlbmRlckNvbnRhaW5lcilcblxuXHRcdHRoaXMuY2lyY2xlcyA9IFtdXG5cdFx0dmFyIGNpY2xlc0xlbiA9IDZcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNpY2xlc0xlbjsgaSsrKSB7XG5cdFx0XHR2YXIgZyA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHRcdHRoaXMuY2lyY2xlcy5wdXNoKGcpXG5cdFx0XHR0aGlzLnJpbmdzQ29udGFpbmVyLmFkZENoaWxkKGcpXG5cdFx0fVxuXG5cdFx0dGhpcy50aXRsZXMgPSBbXVxuXHRcdHRoaXMuZ2VuZGVycyA9IFtdXG5cdFx0dmFyIGdsb2JhbENvbnRlbnQgPSBBcHBTdG9yZS5nbG9iYWxDb250ZW50KClcblx0XHR2YXIgZWxlbWVudHMgPSBBcHBTdG9yZS5lbGVtZW50c09mTmF0dXJlKClcblx0XHR2YXIgYWxsR2VuZGVyID0gQXBwU3RvcmUuYWxsR2VuZGVyKClcblx0XHR2YXIgZWxlbWVudHNUZXh0cyA9IGdsb2JhbENvbnRlbnQuZWxlbWVudHNcblx0XHR2YXIgZ2VuZGVyVGV4dHMgPSBnbG9iYWxDb250ZW50LmdlbmRlclxuXHRcdHZhciBmb250U2l6ZSA9IDMwXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZWxlbWVudElkID0gZWxlbWVudHNbaV1cblx0XHRcdHZhciBlbGVtZW50VGl0bGUgPSBlbGVtZW50c1RleHRzW2VsZW1lbnRJZF0udG9VcHBlckNhc2UoKVxuXHRcdFx0dmFyIHR4dCA9IG5ldyBQSVhJLlRleHQoZWxlbWVudFRpdGxlLCB7IGZvbnQ6IGZvbnRTaXplICsgJ3B4IEZ1dHVyYUJvbGQnLCBmaWxsOiAnd2hpdGUnLCBhbGlnbjogJ2NlbnRlcicgfSlcblx0XHRcdHR4dC5hbmNob3IueCA9IDAuNVxuXHRcdFx0dHh0LmFuY2hvci55ID0gMC41XG5cdFx0XHR0aGlzLnRpdGxlc0NvbnRhaW5lci5hZGRDaGlsZCh0eHQpXG5cdFx0XHR0aGlzLnRpdGxlcy5wdXNoKHtcblx0XHRcdFx0dHh0OiB0eHQsXG5cdFx0XHRcdGRlZ0JlZ2luOiB0aGlzLmdldERlZ3JlZXNCZWdpbkZvclRpdGxlc0J5SWQoZWxlbWVudElkKSxcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhbGxHZW5kZXIubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBnZW5kZXJJZCA9IGFsbEdlbmRlcltpXVxuXHRcdFx0dmFyIGdlbmRlclRpdGxlID0gZ2VuZGVyVGV4dHNbZ2VuZGVySWRdLnRvVXBwZXJDYXNlKClcblx0XHRcdHZhciB0eHQgPSBuZXcgUElYSS5UZXh0KGdlbmRlclRpdGxlLCB7IGZvbnQ6IGZvbnRTaXplICsgJ3B4IEZ1dHVyYUJvbGQnLCBmaWxsOiAnd2hpdGUnLCBhbGlnbjogJ2NlbnRlcicgfSlcblx0XHRcdHR4dC5hbmNob3IueCA9IDAuNVxuXHRcdFx0dHh0LmFuY2hvci55ID0gMC41XG5cdFx0XHR0aGlzLmdlbmRlckNvbnRhaW5lci5hZGRDaGlsZCh0eHQpXG5cdFx0XHR0aGlzLmdlbmRlcnMucHVzaCh7XG5cdFx0XHRcdHR4dDogdHh0LFxuXHRcdFx0XHRkZWdCZWdpbjogdGhpcy5nZXREZWdyZWVzQmVnaW5Gb3JHZW5kZXJCeUlkKGdlbmRlcklkKSxcblx0XHRcdH0pXG5cdFx0fVxuXHR9XG5cdGdldERlZ3JlZXNCZWdpbkZvclRpdGxlc0J5SWQoaWQpIHtcblx0XHQvLyBiZSBjYXJlZnVsIHN0YXJ0cyBmcm9tIGNlbnRlciAtOTBkZWdcblx0XHRzd2l0Y2goaWQpIHtcblx0XHRcdGNhc2UgJ2ZpcmUnOiByZXR1cm4gLTEzMFxuXHRcdFx0Y2FzZSAnZWFydGgnOiByZXR1cm4gLTUwXG5cdFx0XHRjYXNlICdtZXRhbCc6IHJldHVybiAxNVxuXHRcdFx0Y2FzZSAnd2F0ZXInOiByZXR1cm4gOTBcblx0XHRcdGNhc2UgJ3dvb2QnOiByZXR1cm4gMTY1XG5cdFx0fVxuXHR9XG5cdGdldERlZ3JlZXNCZWdpbkZvckdlbmRlckJ5SWQoaWQpIHtcblx0XHQvLyBiZSBjYXJlZnVsIHN0YXJ0cyBmcm9tIGNlbnRlciAtOTBkZWdcblx0XHRzd2l0Y2goaWQpIHtcblx0XHRcdGNhc2UgJ21hbGUnOiByZXR1cm4gLTE1MFxuXHRcdFx0Y2FzZSAnZmVtYWxlJzogcmV0dXJuIC0zMFxuXHRcdFx0Y2FzZSAnYW5pbWFsJzogcmV0dXJuIDkwXG5cdFx0fVxuXHR9XG5cdGRyYXdSaW5ncygpIHtcblx0XHR2YXIgcmFkaXVzTWFyZ2luID0gdGhpcy5yYWRpdXMgLyB0aGlzLmNpcmNsZXMubGVuZ3RoXG5cdFx0dmFyIGxlbiA9IHRoaXMuY2lyY2xlcy5sZW5ndGggKyAxXG5cdFx0dmFyIGxhc3RSO1xuXHRcdHZhciBsaW5lVyA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0dmFyIGNvbG9yID0gMHhmZmZmZmZcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHR2YXIgZyA9IHRoaXMuY2lyY2xlc1tpLTFdXG5cdFx0XHR2YXIgcjtcblxuXHRcdFx0Zy5jbGVhcigpXG5cblx0XHRcdC8vIHJhZGl1cyBkaWZmZXJlbmNlc1xuXHRcdFx0aWYoaSA9PSAxKSByID0gcmFkaXVzTWFyZ2luICogMC4xOFxuXHRcdFx0ZWxzZSBpZihpID09IDQpIHIgPSAobGFzdFIgKyByYWRpdXNNYXJnaW4pICogMS4xNlxuXHRcdFx0ZWxzZSByID0gbGFzdFIgKyByYWRpdXNNYXJnaW5cblxuXHRcdFx0Ly8gbGluZXNcblx0XHRcdGlmKGk9PTMpIHtcblx0XHRcdFx0dGhpcy5kcmF3QXJvdW5kVGhyZWVHcm91cExpbmVzKGxhc3RSLCByLCBnLCBsaW5lVywgY29sb3IpXG5cdFx0XHRcdHRoaXMuZHJhd0dlbmRlcnMociwgY29sb3IpXG5cdFx0XHR9XG5cdFx0XHRpZihpPT02KSB7XG5cdFx0XHRcdHRoaXMuZHJhd0Fyb3VuZEZvdXJHcm91cExpbmVzKGxhc3RSLCByLCBnLCBsaW5lVywgY29sb3IpXG5cdFx0XHRcdHRoaXMuZHJhd1RpdGxlcyhyLCBjb2xvcilcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2lyY2xlXG5cdFx0XHR0aGlzLmRyYXdDaXJjbGUoZywgcilcblxuXHRcdFx0bGFzdFIgPSByXG5cdFx0fVxuXHR9XG5cdGRyYXdBcm91bmRUaHJlZUdyb3VwTGluZXMobGFzdFIsIG5ld1IsIGcsIGxpbmVXLCBjb2xvcikge1xuXHRcdHZhciBsZWZ0VGhldGEgPSAoNyAqIE1hdGguUEkpIC8gNlxuXHRcdHZhciByaWdodFRoZXRhID0gKDExICogTWF0aC5QSSkgLyA2XG5cdFx0XG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIDAsIC1uZXdSLCAwLCAtbGFzdFIpXG5cdFx0XG5cdFx0dmFyIGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRUaGV0YSlcblx0XHR2YXIgZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRUaGV0YSlcblx0XHR2YXIgdG9YID0gbGFzdFIgKiBNYXRoLmNvcyhsZWZ0VGhldGEpXG5cdFx0dmFyIHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0VGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0VGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodFRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0VGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cdH1cblx0ZHJhd0Fyb3VuZEZvdXJHcm91cExpbmVzKGxhc3RSLCBuZXdSLCBnLCBsaW5lVywgY29sb3IpIHtcblx0XHR2YXIgbGVmdFRvcFRoZXRhID0gKDExICogTWF0aC5QSSkgLyAxMlxuXHRcdHZhciByaWdodFRvcFRoZXRhID0gTWF0aC5QSSAvIDEyXG5cblx0XHR2YXIgbGVmdEJvdHRvbVRoZXRhID0gKDUgKiBNYXRoLlBJKSAvIDRcblx0XHR2YXIgcmlnaHRCb3R0b21UaGV0YSA9ICg3ICogTWF0aC5QSSkgLyA0XG5cdFx0XG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIDAsIC1uZXdSLCAwLCAtbGFzdFIpXG5cdFx0XG5cdFx0dmFyIGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgdG9YID0gbGFzdFIgKiBNYXRoLmNvcyhsZWZ0VG9wVGhldGEpXG5cdFx0dmFyIHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRUb3BUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0VG9wVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0VG9wVGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodFRvcFRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0VG9wVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhsZWZ0Qm90dG9tVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0b1ggPSBsYXN0UiAqIE1hdGguY29zKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihsZWZ0Qm90dG9tVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhyaWdodEJvdHRvbVRoZXRhKVxuXHRcdGZyb21ZID0gLW5ld1IgKiBNYXRoLnNpbihyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRvWCA9IGxhc3RSICogTWF0aC5jb3MocmlnaHRCb3R0b21UaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXHR9XG5cdGRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSkge1xuXHRcdGcubGluZVN0eWxlKGxpbmVXLCBjb2xvciwgMSlcblx0XHRnLmJlZ2luRmlsbChjb2xvciwgMClcblx0XHRnLm1vdmVUbyhmcm9tWCwgZnJvbVkpXG5cdFx0Zy5saW5lVG8odG9YLCB0b1kpXG5cdFx0Zy5lbmRGaWxsKClcblx0fVxuXHRkcmF3Q2lyY2xlKGcsIHIpIHtcblx0XHRnLmxpbmVTdHlsZShBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKSwgMHhmZmZmZmYsIDEpXG5cdFx0Zy5iZWdpbkZpbGwoMHhmZmZmZmYsIDApXG5cdFx0XG5cdFx0Zy5tb3ZlVG8ociwgMClcblxuXHRcdHZhciBhbmdsZSA9IDBcblx0XHR2YXIgeCA9IDBcblx0XHR2YXIgeSA9IDBcblx0XHR2YXIgZ2FwID0gTWF0aC5taW4oKDMwMCAvIHRoaXMucmFkaXVzKSAqIDUsIDEwKVxuXHRcdHZhciBzdGVwcyA9IE1hdGgucm91bmQoMzYwIC8gZ2FwKVxuXHRcdGZvciAodmFyIGkgPSAtMTsgaSA8IHN0ZXBzOyBpKyspIHtcblx0XHRcdGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucyhpICogZ2FwKVxuXHRcdFx0eCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHRcdHkgPSByICogTWF0aC5zaW4oYW5nbGUpXG5cdFx0XHRnLmxpbmVUbyh4LCB5KVxuXHRcdH07XG5cblx0XHQvLyBjbG9zZSBpdFxuXHRcdGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucygzNjApXG5cdFx0eCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHR5ID0gciAqIE1hdGguc2luKGFuZ2xlKVxuXHRcdGcubGluZVRvKHgsIHkpXG5cblx0XHRnLmVuZEZpbGwoKVxuXHR9XG5cdGRyYXdUaXRsZXMociwgY29sb3IpIHtcblx0XHR2YXIgdGl0bGVzID0gdGhpcy50aXRsZXNcblx0XHR2YXIgb2Zmc2V0ID0gKHRoaXMucmFkaXVzIC8gMjcwKSAqIDQ0XG5cdFx0dmFyIHNjYWxlID0gKHRoaXMucmFkaXVzIC8gMjcwKSAqIDFcblx0XHR2YXIgciA9IHIgKyBvZmZzZXRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRpdGxlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHRpdGxlID0gdGl0bGVzW2ldXG5cdFx0XHR2YXIgYW5nbGUgPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKHRpdGxlLmRlZ0JlZ2luKVxuXHRcdFx0dGl0bGUudHh0LnJvdGF0aW9uID0gYW5nbGUgKyBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKDkwKVxuXHRcdFx0dGl0bGUudHh0LnggPSByICogTWF0aC5jb3MoYW5nbGUpXG5cdFx0XHR0aXRsZS50eHQueSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRcdHRpdGxlLnR4dC5zY2FsZS54ID0gc2NhbGVcblx0XHRcdHRpdGxlLnR4dC5zY2FsZS55ID0gc2NhbGVcblx0XHR9XG5cdH1cblx0ZHJhd0dlbmRlcnMociwgY29sb3IpIHtcblx0XHR2YXIgZ2VuZGVycyA9IHRoaXMuZ2VuZGVyc1xuXHRcdHZhciBvZmZzZXQgPSAodGhpcy5yYWRpdXMgLyAyNzApICogMzRcblx0XHR2YXIgc2NhbGUgPSAodGhpcy5yYWRpdXMgLyAyNzApICogMVxuXHRcdHZhciByID0gciArIG9mZnNldFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZGVycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGdlbmRlciA9IGdlbmRlcnNbaV1cblx0XHRcdHZhciBhbmdsZSA9IFV0aWxzLkRlZ3JlZXNUb1JhZGlhbnMoZ2VuZGVyLmRlZ0JlZ2luKVxuXHRcdFx0Z2VuZGVyLnR4dC5yb3RhdGlvbiA9IGFuZ2xlICsgVXRpbHMuRGVncmVlc1RvUmFkaWFucyg5MClcblx0XHRcdGdlbmRlci50eHQueCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHRcdGdlbmRlci50eHQueSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRcdGdlbmRlci50eHQuc2NhbGUueCA9IHNjYWxlXG5cdFx0XHRnZW5kZXIudHh0LnNjYWxlLnkgPSBzY2FsZVxuXHRcdH1cblx0fVxuXHRyZXNpemUocmFkaXVzKSB7XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmFkaXVzID0gcmFkaXVzXG5cdFx0dGhpcy5kcmF3UmluZ3MoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMucmluZ3NDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdHRoaXMudGl0bGVzQ29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHR0aGlzLmdlbmRlckNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnJpbmdzQ29udGFpbmVyKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy50aXRsZXNDb250YWluZXIpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLmdlbmRlckNvbnRhaW5lcilcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3MgZnJvbSAnQ29tcGFzcydcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb21wYXNzZXNDb250YWluZXIge1xuXHRjb25zdHJ1Y3RvcihweENvbnRhaW5lcikge1xuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuY29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKVxuXG5cdFx0dGhpcy5jb21wYXNzID0gbmV3IENvbXBhc3ModGhpcy5jb250YWluZXIsIEFwcENvbnN0YW50cy5FWFBFUklFTkNFKVxuXHRcdHRoaXMuY29tcGFzcy5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0dmFyIHBsYW5ldERhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHRoaXMuaWQpXG5cdFx0dGhpcy5jb21wYXNzLnVwZGF0ZURhdGEocGxhbmV0RGF0YSlcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dGhpcy5jb21wYXNzLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR0aGlzLmNvbXBhc3MucmVzaXplKClcblxuXHRcdHRoaXMuY29tcGFzcy5wb3NpdGlvbihcblx0XHRcdHdpbmRvd1cgPj4gMSxcblx0XHRcdCh3aW5kb3dIID4+IDEpIC0gKHdpbmRvd0ggKiAwLjA1KVxuXHRcdClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmNvbXBhc3MuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuY29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMuY29udGFpbmVyKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJ0Zyb250Q29udGFpbmVyX2hicydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5jbGFzcyBGcm9udENvbnRhaW5lciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0cmVuZGVyKHBhcmVudCkge1xuXHRcdHZhciBzY29wZSA9IHt9XG5cdFx0dmFyIGdlbmVyYUluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zKClcblx0XHRzY29wZS5pbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0c2NvcGUuZmFjZWJvb2tVcmwgPSBnZW5lcmFJbmZvc1snZmFjZWJvb2tfdXJsJ11cblx0XHRzY29wZS50d2l0dGVyVXJsID0gZ2VuZXJhSW5mb3NbJ3R3aXR0ZXJfdXJsJ11cblx0XHRzY29wZS5pbnN0YWdyYW1VcmwgPSBnZW5lcmFJbmZvc1snaW5zdGFncmFtX3VybCddXG5cblx0XHR2YXIgY291bnRyaWVzID0gQXBwU3RvcmUuY291bnRyaWVzKClcblx0XHR2YXIgbGFuZyA9IEFwcFN0b3JlLmxhbmcoKVxuXHRcdHZhciBjdXJyZW50TGFuZztcblx0XHR2YXIgcmVzdENvdW50cmllcyA9IFtdXG5cdFx0dmFyIGZ1bGxuYW1lQ291bnRyaWVzID0gc2NvcGUuaW5mb3MuY291bnRyaWVzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudHJpZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjb3VudHJ5ID0gY291bnRyaWVzW2ldXG5cdFx0XHRpZihjb3VudHJ5LmxhbmcgPT0gbGFuZykge1xuXHRcdFx0XHRjdXJyZW50TGFuZyA9IGZ1bGxuYW1lQ291bnRyaWVzW2NvdW50cnkuaWRdXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0Y291bnRyeS5uYW1lID0gZnVsbG5hbWVDb3VudHJpZXNbY291bnRyeS5pZF1cblx0XHRcdFx0cmVzdENvdW50cmllcy5wdXNoKGNvdW50cnkpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHNjb3BlLmNvdW50cmllcyA9IHJlc3RDb3VudHJpZXNcblx0XHRzY29wZS5jdXJyZW50X2xhbmcgPSBjdXJyZW50TGFuZ1xuXG5cdFx0c3VwZXIucmVuZGVyKCdGcm9udENvbnRhaW5lcicsIHBhcmVudCwgdGVtcGxhdGUsIHNjb3BlKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0XHR0aGlzLiRzb2NpYWxXcmFwcGVyID0gdGhpcy5jaGlsZC5maW5kKCcjc29jaWFsLXdyYXBwZXInKVxuXHRcdHRoaXMuJGxlZ2FsID0gdGhpcy5jaGlsZC5maW5kKCcubGVnYWwnKVxuXHRcdHRoaXMuJGNhbXBlckxhYiA9IHRoaXMuY2hpbGQuZmluZCgnLmNhbXBlci1sYWInKVxuXHRcdHRoaXMuJHNob3AgPSB0aGlzLmNoaWxkLmZpbmQoJy5zaG9wLXdyYXBwZXInKVxuXHRcdHRoaXMuJGxhbmcgPSB0aGlzLmNoaWxkLmZpbmQoXCIubGFuZy13cmFwcGVyXCIpXG5cdFx0dGhpcy4kbGFuZ0N1cnJlbnRUaXRsZSA9IHRoaXMuJGxhbmcuZmluZChcIi5jdXJyZW50LWxhbmdcIilcblx0XHR0aGlzLiRjb3VudHJpZXMgPSB0aGlzLiRsYW5nLmZpbmQoXCIuY291bnRyaWVzLXdyYXBwZXJcIilcblx0XHR0aGlzLmNvdW50cmllc0ggPSAwXG5cblx0XHR0aGlzLm9uTGFuZ01vdXNlRW50ZXIgPSB0aGlzLm9uTGFuZ01vdXNlRW50ZXIuYmluZCh0aGlzKVxuXHRcdHRoaXMub25MYW5nTW91c2VMZWF2ZSA9IHRoaXMub25MYW5nTW91c2VMZWF2ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy4kbGFuZy5vbignbW91c2VlbnRlcicsIHRoaXMub25MYW5nTW91c2VFbnRlcilcblx0XHR0aGlzLiRsYW5nLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5vbkxhbmdNb3VzZUxlYXZlKVxuXG5cdFx0dGhpcy5yZXNpemUoKVxuXHRcdHRoaXMuJGxhbmcuY3NzKCdoZWlnaHQnLCB0aGlzLmNvdW50cmllc1RpdGxlSClcblx0fVxuXHRvbkxhbmdNb3VzZUVudGVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLiRsYW5nLmFkZENsYXNzKCdob3ZlcmVkJylcblx0XHR0aGlzLiRsYW5nLmNzcygnaGVpZ2h0JywgdGhpcy5jb3VudHJpZXNIICsgdGhpcy5jb3VudHJpZXNUaXRsZUgpXG5cdH1cblx0b25MYW5nTW91c2VMZWF2ZShlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy4kbGFuZy5yZW1vdmVDbGFzcygnaG92ZXJlZCcpXG5cdFx0dGhpcy4kbGFuZy5jc3MoJ2hlaWdodCcsIHRoaXMuY291bnRyaWVzVGl0bGVIKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRpZighdGhpcy5kb21Jc1JlYWR5KSByZXR1cm5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGhpcy5jb3VudHJpZXNIID0gdGhpcy4kY291bnRyaWVzLmhlaWdodCgpICsgMjBcblx0XHR0aGlzLmNvdW50cmllc1RpdGxlSCA9IHRoaXMuJGxhbmdDdXJyZW50VGl0bGUuaGVpZ2h0KClcblxuXHRcdHZhciBzb2NpYWxDc3MgPSB7XG5cdFx0XHRsZWZ0OiB3aW5kb3dXIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kc29jaWFsV3JhcHBlci53aWR0aCgpLFxuXHRcdFx0dG9wOiB3aW5kb3dIIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kc29jaWFsV3JhcHBlci5oZWlnaHQoKSxcblx0XHR9XG5cdFx0dmFyIGxlZ2FsQ3NzID0ge1xuXHRcdFx0bGVmdDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdFx0dG9wOiB3aW5kb3dIIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kbGVnYWwuaGVpZ2h0KCksXHRcblx0XHR9XG5cdFx0dmFyIGNhbXBlckxhYkNzcyA9IHtcblx0XHRcdGxlZnQ6IHdpbmRvd1cgLSBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgLSB0aGlzLiRjYW1wZXJMYWIud2lkdGgoKSxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdH1cblx0XHR2YXIgc2hvcENzcyA9IHtcblx0XHRcdGxlZnQ6IGNhbXBlckxhYkNzcy5sZWZ0IC0gdGhpcy4kc2hvcC53aWR0aCgpIC0gKEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCA8PCAxKSxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gMixcblx0XHR9XG5cdFx0dmFyIGxhbmdDc3MgPSB7XG5cdFx0XHRsZWZ0OiBzaG9wQ3NzLmxlZnQgLSB0aGlzLiRsYW5nQ3VycmVudFRpdGxlLndpZHRoKCkgLSAoQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIDw8IDEpLFxuXHRcdFx0dG9wOiBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQsXG5cdFx0fVxuXG5cdFx0dGhpcy4kc29jaWFsV3JhcHBlci5jc3Moc29jaWFsQ3NzKVxuXHRcdHRoaXMuJGxlZ2FsLmNzcyhsZWdhbENzcylcblx0XHR0aGlzLiRjYW1wZXJMYWIuY3NzKGNhbXBlckxhYkNzcylcblx0XHR0aGlzLiRzaG9wLmNzcyhzaG9wQ3NzKVxuXHRcdHRoaXMuJGxhbmcuY3NzKGxhbmdDc3MpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZyb250Q29udGFpbmVyXG5cblxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBLbm90IHtcblx0Y29uc3RydWN0b3Ioc3ByaW5nQ29udGFpbmVyLCByKSB7XG5cdFx0dGhpcy5yYWRpdXMgPSByIHx8IDhcblx0XHR0aGlzLnNwcmluZ0NvbnRhaW5lciA9IHNwcmluZ0NvbnRhaW5lclxuXHRcdHRoaXMudnggPSAwXG5cdFx0dGhpcy52eSA9IDBcblx0XHR0aGlzLnggPSAwXG5cdFx0dGhpcy55ID0gMFxuXHRcdHRoaXMudG9YID0gMFxuXHRcdHRoaXMudG9ZID0gMFxuXHRcdHRoaXMuZnJvbVggPSAwXG5cdFx0dGhpcy5mcm9tWSA9IDBcblx0XHR0aGlzLnNjYWxlWCA9IDFcblx0XHR0aGlzLnNjYWxlWSA9IDFcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmcgPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0dGhpcy5zcHJpbmdDb250YWluZXIuYWRkQ2hpbGQodGhpcy5nKVxuXHRcdFxuXHRcdHRoaXMuZy5saW5lU3R5bGUoQXBwU3RvcmUuZ2V0TGluZVdpZHRoKCksIDB4ZmZmZmZmLCAxKTtcblx0XHR0aGlzLmcuYmVnaW5GaWxsKDB4ZmZmZmZmLCAxKTtcblx0XHR0aGlzLmcuZHJhd0NpcmNsZSgwLCAwLCB0aGlzLnJhZGl1cyk7XG5cdFx0dGhpcy5nLmVuZEZpbGwoKVxuXG5cdFx0cmV0dXJuIHRoaXNcblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0dGhpcy5nLnggPSB4XG5cdFx0dGhpcy5nLnkgPSB5XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRzY2FsZSh4LCB5KSB7XG5cdFx0dGhpcy5nLnNjYWxlLnggPSB4XG5cdFx0dGhpcy5nLnNjYWxlLnkgPSB5XG5cdFx0dGhpcy5zY2FsZVggPSB4XG5cdFx0dGhpcy5zY2FsZVkgPSB5XG5cdH1cblx0dmVsb2NpdHkoeCwgeSkge1xuXHRcdHRoaXMudnggPSB4XG5cdFx0dGhpcy52eSA9IHlcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmcuY2xlYXIoKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBWZWMyIGZyb20gJ1ZlYzInXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5pbXBvcnQgQmV6aWVyRWFzaW5nIGZyb20gJ2Jlemllci1lYXNpbmcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhbmRpbmdTbGlkZXNob3cge1xuXHRjb25zdHJ1Y3RvcihweENvbnRhaW5lciwgcGFyZW50RWwpIHtcblx0XHR0aGlzLnBhcmVudEVsID0gcGFyZW50RWxcblx0XHR0aGlzLnB4Q29udGFpbmVyID0gcHhDb250YWluZXJcblx0XHR0aGlzLmN1cnJlbnRJZCA9ICdhbGFza2EnXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dmFyIGluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zTGFuZ1Njb3BlKClcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0Ly8gdGhpcy5zbGlkZXNob3dDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHQgXHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHQgXHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyKVxuXHQgXHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnNsaWRlc2hvd1dyYXBwZXIpXG5cdCBcdHRoaXMuY291bnRlciA9IDBcblx0IFx0dGhpcy5wbGFuZXRUaXRsZVR4dCA9IGluZm9zLnBsYW5ldC50b1VwcGVyQ2FzZSgpXG5cblx0XHR2YXIgc2xpZGVzaG93VGl0bGUgPSB0aGlzLnBhcmVudEVsLmZpbmQoJy5zbGlkZXNob3ctdGl0bGUnKVxuXHRcdHZhciBwbGFuZXRUaXRsZSA9IHNsaWRlc2hvd1RpdGxlLmZpbmQoJy5wbGFuZXQtdGl0bGUnKVxuXHRcdHZhciBwbGFuZXROYW1lID0gc2xpZGVzaG93VGl0bGUuZmluZCgnLnBsYW5ldC1uYW1lJylcblx0IFx0dGhpcy50aXRsZUNvbnRhaW5lciA9IHtcblx0IFx0XHRwYXJlbnQ6IHNsaWRlc2hvd1RpdGxlLFxuXHQgXHRcdHBsYW5ldFRpdGxlOiBwbGFuZXRUaXRsZSxcblx0IFx0XHRwbGFuZXROYW1lOiBwbGFuZXROYW1lXG5cdCBcdH1cblx0IFx0XG5cdCBcdHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG5cdCBcdHRoaXMuc2xpZGVzID0gW11cblx0IFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRzLmxlbmd0aDsgaSsrKSB7XG5cdCBcdFx0dmFyIHMgPSB7fVxuXHQgXHRcdHZhciBpZCA9IHBsYW5ldHNbaV1cblx0IFx0XHR2YXIgd3JhcHBlckNvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdCBcdFx0dmFyIG1hc2tSZWN0ID0ge1xuXHQgXHRcdFx0ZzogQXBwU3RvcmUuZ2V0R3JhcGhpY3MoKSxcblx0IFx0XHRcdG5ld1c6IDAsXG5cdCBcdFx0XHR3aWR0aDogMCxcblx0IFx0XHRcdHg6IDBcblx0IFx0XHR9XG5cdCBcdFx0dmFyIGltZ1VybCA9IEFwcFN0b3JlLm1haW5JbWFnZVVybChpZCwgQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpXG5cdCBcdFx0dmFyIHRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGltZ1VybClcblx0IFx0XHR2YXIgc3ByaXRlID0gQXBwU3RvcmUuZ2V0U3ByaXRlKClcblx0IFx0XHRzcHJpdGUudGV4dHVyZSA9IHRleHR1cmVcblx0IFx0XHRzcHJpdGUucGFyYW1zID0ge31cblx0IFx0XHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIuYWRkQ2hpbGQod3JhcHBlckNvbnRhaW5lcilcblx0IFx0XHR3cmFwcGVyQ29udGFpbmVyLmFkZENoaWxkKHNwcml0ZSlcblx0IFx0XHR3cmFwcGVyQ29udGFpbmVyLmFkZENoaWxkKG1hc2tSZWN0LmcpXG5cdCBcdFx0c3ByaXRlLm1hc2sgPSBtYXNrUmVjdC5nXG5cdCBcdFx0cy5vbGRQb3NpdGlvbiA9IG5ldyBWZWMyKDAsIDApXG5cdCBcdFx0cy5uZXdQb3NpdGlvbiA9IG5ldyBWZWMyKDAsIDApXG5cdCBcdFx0cy53cmFwcGVyQ29udGFpbmVyID0gd3JhcHBlckNvbnRhaW5lclxuXHQgXHRcdHMuc3ByaXRlID0gc3ByaXRlXG5cdCBcdFx0cy50ZXh0dXJlID0gdGV4dHVyZVxuXHQgXHRcdHMubWFza1JlY3QgPSBtYXNrUmVjdFxuXHQgXHRcdHMucGxhbmV0TmFtZSA9IGlkLnRvVXBwZXJDYXNlKClcblx0IFx0XHRzLmltZ1Jlc3BvbnNpdmVTaXplID0gQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlU2l6ZShBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0IFx0XHRzLmltZ1VybCA9IGltZ1VybFxuXHQgXHRcdHMuaWQgPSBwbGFuZXRzW2ldXG5cdCBcdFx0dGhpcy5zbGlkZXNbaV0gPSBzXG5cdCBcdH1cblxuXHQgXHR0aGlzLm1hc2tFYXNpbmcgPSBCZXppZXJFYXNpbmcoLjIxLDEuNDcsLjUyLDEpXG5cdCBcdHRoaXMuY2hvb3NlU2xpZGVUb0hpZ2hsaWdodCgpXG5cdH1cblx0dXBkYXRlVGl0bGVzKHRpdGxlLCBuYW1lKSB7XG5cdFx0dmFyIHBsYW5ldFRpdGxlID0gdGhpcy50aXRsZUNvbnRhaW5lci5wbGFuZXRUaXRsZVxuXHRcdHZhciBwbGFuZXROYW1lID0gdGhpcy50aXRsZUNvbnRhaW5lci5wbGFuZXROYW1lXG5cdCBcdHBsYW5ldFRpdGxlLnRleHQodGl0bGUpXG5cdCBcdHBsYW5ldE5hbWUudGV4dChuYW1lKVxuXHQgfVxuXHRkcmF3Q2VudGVyZWRNYXNrUmVjdChncmFwaGljcywgeCwgeSwgdywgaCkge1xuXHRcdGdyYXBoaWNzLmNsZWFyKClcblx0XHRncmFwaGljcy5iZWdpbkZpbGwoMHhmZmZmMDAsIDEpXG5cdFx0Z3JhcGhpY3MuZHJhd1JlY3QoeCwgeSwgdywgaClcblx0XHRncmFwaGljcy5lbmRGaWxsKClcblx0fVxuXHRuZXh0KCkge1xuXHRcdHZhciBmaXJzdEVsZW1lbnQgPSB0aGlzLnNsaWRlcy5zaGlmdCgpXG5cdFx0dGhpcy5zbGlkZXMucHVzaChmaXJzdEVsZW1lbnQpXG5cdFx0dGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSA9IGZpcnN0RWxlbWVudFxuXHRcdHRoaXMuY2hvb3NlU2xpZGVUb0hpZ2hsaWdodCgpXG5cdFx0dGhpcy5hcHBseVZhbHVlc1RvU2xpZGVzKClcblx0fVxuXHRwcmV2aW91cygpIHtcblx0XHR2YXIgbGFzdEVsZW1lbnQgPSB0aGlzLnNsaWRlcy5wb3AoKVxuXHRcdHRoaXMuc2xpZGVzLnVuc2hpZnQobGFzdEVsZW1lbnQpXG5cdFx0dGhpcy5lbGVtZW50VGhhdE1vdmVkSW5TbGlkZXNBcnJheSA9IGxhc3RFbGVtZW50XG5cdFx0dGhpcy5jaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KClcblx0XHR0aGlzLmFwcGx5VmFsdWVzVG9TbGlkZXMoKVxuXHR9XG5cdGNob29zZVNsaWRlVG9IaWdobGlnaHQoKSB7XG5cdFx0dmFyIHRvdGFsTGVuID0gdGhpcy5zbGlkZXMubGVuZ3RoLTFcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2xpZGUgPSB0aGlzLnNsaWRlc1tpXVxuXHRcdFx0aWYoaSA9PSAyKSB7XG5cdFx0XHRcdHNsaWRlLmhpZ2hsaWdodCA9IHRydWUgLy8gSGlnaGxpZ2h0IHRoZSBtaWRkbGUgZWxlbWVudHNcblx0XHRcdFx0dGhpcy5jdXJyZW50SWQgPSBzbGlkZS5pZFxuXHRcdFx0XHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIuc2V0Q2hpbGRJbmRleChzbGlkZS53cmFwcGVyQ29udGFpbmVyLCB0b3RhbExlbilcblx0XHRcdFx0dGhpcy51cGRhdGVUaXRsZXModGhpcy5wbGFuZXRUaXRsZVR4dCwgc2xpZGUucGxhbmV0TmFtZSlcblx0XHRcdFx0dGhpcy5wb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0c2xpZGUuaGlnaGxpZ2h0ID0gZmFsc2Vcblx0XHRcdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLnNldENoaWxkSW5kZXgoc2xpZGUud3JhcHBlckNvbnRhaW5lciwgaSlcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0YXBwbHlSZXNwb25zaXZlSW1nVG9TbGlkZURlcGVuZHNXaW5kb3coc2xpZGUpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIGltZ1VybCA9IEFwcFN0b3JlLm1haW5JbWFnZVVybChzLmlkLCBBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0XHRpZihzLmltZ1VybCAhPSBpbWdVcmwpIHtcblx0XHRcdHMuaW1nUmVzcG9uc2l2ZVNpemUgPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VTaXplKEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHRcdFx0cy50ZXh0dXJlLmRlc3Ryb3kodHJ1ZSlcblx0XHRcdHMudGV4dHVyZSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1nVXJsKVxuXHRcdFx0cy5zcHJpdGUudGV4dHVyZSA9IHMudGV4dHVyZVxuXHRcdFx0cy5pbWdVcmwgPSBpbWdVcmxcblx0XHR9XG5cdH1cblx0cmVzaXplQW5kUG9zaXRpb25JbWdTcHJpdGUoc2xpZGUsIG1hc2tTbGlkZVcsIHdpbmRvd1csIHdpbmRvd0gpIHtcblx0XHR2YXIgcyA9IHNsaWRlXG5cdFx0dmFyIHJlc2l6ZVZhcnMgPSBVdGlscy5SZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcihtYXNrU2xpZGVXLCB3aW5kb3dILCBzLmltZ1Jlc3BvbnNpdmVTaXplWzBdLCBzLmltZ1Jlc3BvbnNpdmVTaXplWzFdKVxuXHRcdHMuc3ByaXRlLmFuY2hvci54ID0gMC41XG5cdFx0cy5zcHJpdGUuYW5jaG9yLnkgPSAwLjVcblx0XHRzLnNwcml0ZS5zY2FsZS54ID0gcmVzaXplVmFycy5zY2FsZVxuXHRcdHMuc3ByaXRlLnNjYWxlLnkgPSByZXNpemVWYXJzLnNjYWxlXG5cdFx0cy5zcHJpdGUud2lkdGggPSByZXNpemVWYXJzLndpZHRoXG5cdFx0cy5zcHJpdGUuaGVpZ2h0ID0gcmVzaXplVmFycy5oZWlnaHRcblx0XHRzLnNwcml0ZS54ID0gcmVzaXplVmFycy5sZWZ0XG5cdFx0cy5zcHJpdGUueSA9IHJlc2l6ZVZhcnMudG9wXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHZhciBzbGlkZXMgPSB0aGlzLnNsaWRlc1xuXHRcdHRoaXMuY291bnRlciArPSAwLjAxMlxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcyA9IHNsaWRlc1tpXVxuXHRcdFx0cy5tYXNrUmVjdC52YWx1ZVNjYWxlICs9ICgwLjQgLSBzLm1hc2tSZWN0LnZhbHVlU2NhbGUpICogMC4wNVxuXHRcdFx0dmFyIGVhc2UgPSB0aGlzLm1hc2tFYXNpbmcuZ2V0KHMubWFza1JlY3QudmFsdWVTY2FsZSlcblx0XHRcdHMud3JhcHBlckNvbnRhaW5lci54ICs9IChzLm5ld1Bvc2l0aW9uLnggLSBzLndyYXBwZXJDb250YWluZXIueCkgKiBlYXNlXG5cdFx0XHRzLm1hc2tSZWN0LndpZHRoID0gcy5tYXNrUmVjdC5uZXdXICogZWFzZVxuXHRcdFx0dmFyIG1hc2tSZWN0WCA9ICgxIC0gZWFzZSkgKiBzLm1hc2tSZWN0Lm5ld1hcblx0XHRcdHRoaXMuZHJhd0NlbnRlcmVkTWFza1JlY3Qocy5tYXNrUmVjdC5nLCBtYXNrUmVjdFgsIDAsIHMubWFza1JlY3Qud2lkdGgsIHMubWFza1JlY3QuaGVpZ2h0KVxuXHRcdFx0cy5zcHJpdGUuc2tldy54ID0gTWF0aC5jb3ModGhpcy5jb3VudGVyKSAqIDAuMDIwXG5cdFx0XHRzLnNwcml0ZS5za2V3LnkgPSBNYXRoLnNpbih0aGlzLmNvdW50ZXIpICogMC4wMjBcblx0XHR9XG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueCArPSAodGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGVYWSAtIHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLngpICogMC4wOFxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnkgKz0gKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFkgLSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54KSAqIDAuMDhcblx0XHQvLyB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci55ID0gdGhpcy5zbGlkZXNob3dDb250YWluZXIuYmFzZVkgKyBNYXRoLnNpbih0aGlzLmNvdW50ZXIpICogNFxuXHR9XG5cdHBvc2l0aW9uU2xpZGVzaG93Q29udGFpbmVyKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIGxhc3RTbGlkZSA9IHRoaXMuc2xpZGVzW3RoaXMuc2xpZGVzLmxlbmd0aC0xXVxuXHRcdHZhciBjb250YWluZXJUb3RhbFcgPSBsYXN0U2xpZGUubmV3UG9zaXRpb24ueCArIGxhc3RTbGlkZS5tYXNrUmVjdC5uZXdXXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIucGl2b3QueCA9IGNvbnRhaW5lclRvdGFsVyA+PiAxXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIucGl2b3QueSA9IHdpbmRvd0ggPj4gMVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnggPSAod2luZG93VyA+PiAxKVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnkgPSAod2luZG93SCA+PiAxKVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLmJhc2VZID0gdGhpcy5zbGlkZXNob3dDb250YWluZXIueVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnggPSAxLjNcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS55ID0gMS4zXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGVYWSA9IDEuMDVcblx0fVxuXHRhcHBseVZhbHVlc1RvU2xpZGVzKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIGN1cnJlbnRQb3NYID0gMFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zbGlkZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzID0gdGhpcy5zbGlkZXNbaV1cblx0XHRcdHRoaXMuYXBwbHlSZXNwb25zaXZlSW1nVG9TbGlkZURlcGVuZHNXaW5kb3cocylcblx0XHRcdHZhciBoaWdodGxpZ2h0ZWRTbGlkZVcgPSB3aW5kb3dXICogMC43XG5cdFx0XHR2YXIgbm9ybWFsU2xpZGVXID0gd2luZG93VyAqIDAuMTVcblx0XHRcdHZhciBzbGlkZVcgPSAwXG5cdFx0XHRpZihzLmhpZ2hsaWdodCkgc2xpZGVXID0gaGlnaHRsaWdodGVkU2xpZGVXXG5cdFx0XHRlbHNlIHNsaWRlVyA9IG5vcm1hbFNsaWRlV1xuXHRcdFx0dGhpcy5yZXNpemVBbmRQb3NpdGlvbkltZ1Nwcml0ZShzLCBzbGlkZVcsIHdpbmRvd1csIHdpbmRvd0gpXG5cdFx0XHRzLm1hc2tSZWN0Lm5ld1cgPSBzbGlkZVdcblx0XHRcdHMubWFza1JlY3QuaGVpZ2h0ID0gd2luZG93SFxuXHRcdFx0cy5tYXNrUmVjdC5uZXdYID0gc2xpZGVXID4+IDFcblx0XHRcdHMubWFza1JlY3QudmFsdWVTY2FsZSA9IDJcblx0XHRcdHMub2xkUG9zaXRpb24ueCA9IHMubmV3UG9zaXRpb24ueFxuXHRcdFx0cy5uZXdQb3NpdGlvbi54ID0gY3VycmVudFBvc1hcblx0XHRcdGlmKHRoaXMuZWxlbWVudFRoYXRNb3ZlZEluU2xpZGVzQXJyYXkgIT0gdW5kZWZpbmVkICYmIHRoaXMuZWxlbWVudFRoYXRNb3ZlZEluU2xpZGVzQXJyYXkuaWQgPT0gcy5pZCl7XG5cdFx0XHRcdHMud3JhcHBlckNvbnRhaW5lci54ID0gcy5uZXdQb3NpdGlvbi54XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50UG9zWCArPSBzbGlkZVdcblx0XHR9XG5cdFx0dGhpcy5wb3NpdGlvblNsaWRlc2hvd0NvbnRhaW5lcigpXG5cdH1cblx0cG9zaXRpb25UaXRsZXNDb250YWluZXIoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHRjbGVhclRpbWVvdXQodGhpcy50aXRsZVRpbWVvdXQpXG5cdFx0dGhpcy50aXRsZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR2YXIgdG9wT2Zmc2V0ID0gKHdpbmRvd0ggPj4gMSkgKyAod2luZG93SCAqIEFwcENvbnN0YW50cy5DT01QQVNTX1NJWkVfUEVSQ0VOVEFHRSkgLSAodGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQuaGVpZ2h0KCkgPj4gMSlcblx0XHRcdHZhciB0aXRsZXNDb250YWluZXJDc3MgPSB7XG5cdFx0XHRcdHRvcDogdG9wT2Zmc2V0ICsgKCh3aW5kb3dIIC0gdG9wT2Zmc2V0KSA+PiAxKSxcblx0XHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAodGhpcy50aXRsZUNvbnRhaW5lci5wYXJlbnQud2lkdGgoKSA+PiAxKSxcblx0XHRcdH1cblx0XHRcdHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LmNzcyh0aXRsZXNDb250YWluZXJDc3MpXG5cdFx0fSwgMClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5hcHBseVZhbHVlc1RvU2xpZGVzKClcblx0XHR0aGlzLnBvc2l0aW9uVGl0bGVzQ29udGFpbmVyKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblxuXHRcdHZhciBzbGlkZXMgPSB0aGlzLnNsaWRlc1xuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHNsaWRlcy5sZW5ndGg7IGkrKykge1xuXHQgXHRcdHZhciBzID0gc2xpZGVzW2ldXG5cblx0IFx0XHRzLm1hc2tSZWN0LmcuY2xlYXIoKVxuXHQgXHRcdEFwcFN0b3JlLnJlbGVhc2VHcmFwaGljcyhzLm1hc2tSZWN0LmcpXG5cblx0IFx0XHRzLnNwcml0ZS50ZXh0dXJlLmRlc3Ryb3kodHJ1ZSlcblx0IFx0XHRBcHBTdG9yZS5yZWxlYXNlU3ByaXRlKHMuc3ByaXRlKVxuXG5cdCBcdFx0cy53cmFwcGVyQ29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0IFx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHMud3JhcHBlckNvbnRhaW5lcilcblx0IFx0fVxuXG5cdCBcdHRoaXMuc2xpZGVzLmxlbmd0aCA9IDBcblxuXHQgXHQvLyBUT0RPIGNsZWFyIHRoYXQgYW5kIHB1dCBpdCBiYWNrIHRvIHBvb2xcblx0IC8vIFx0ZGVsZXRlIHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFlcblx0IC8vIFx0ZGVsZXRlIHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLmJhc2VZXG5cdCAvLyBcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnggPSAxXG5cdCAvLyBcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnkgPSAxXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdC8vIEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5zbGlkZXNob3dDb250YWluZXIpXG5cblx0XHR0aGlzLnNsaWRlc2hvd1dyYXBwZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5zbGlkZXNob3dXcmFwcGVyKVxuXHRcdFxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBYQ29udGFpbmVyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdH1cblx0aW5pdChlbGVtZW50SWQpIHtcblx0XHQvLyB0aGlzLnJlbmRlcmVyID0gbmV3IFBJWEkuQ2FudmFzUmVuZGVyZXIoODAwLCA2MDApXG5cdFx0dGhpcy5yZW5kZXJlciA9IG5ldyBQSVhJLmF1dG9EZXRlY3RSZW5kZXJlcig4MDAsIDYwMCwgeyBhbnRpYWxpYXM6IHRydWUgfSlcblxuXHRcdHZhciBlbCA9ICQoZWxlbWVudElkKVxuXHRcdCQodGhpcy5yZW5kZXJlci52aWV3KS5hdHRyKCdpZCcsICdweC1jb250YWluZXInKVxuXHRcdGVsLmFwcGVuZCh0aGlzLnJlbmRlcmVyLnZpZXcpXG5cblx0XHR0aGlzLnN0YWdlID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0fVxuXHRhZGQoY2hpbGQpIHtcblx0XHR0aGlzLnN0YWdlLmFkZENoaWxkKGNoaWxkKVxuXHR9XG5cdHJlbW92ZShjaGlsZCkge1xuXHRcdHRoaXMuc3RhZ2UucmVtb3ZlQ2hpbGQoY2hpbGQpXG5cdH1cblx0dXBkYXRlKCkge1xuXHQgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy5zdGFnZSlcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnJlbmRlcmVyLnJlc2l6ZSh3aW5kb3dXLCB3aW5kb3dIKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVBhZ2UgZnJvbSAnQmFzZVBhZ2UnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhZ2UgZXh0ZW5kcyBCYXNlUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdFx0dGhpcy5yZXNpemUgPSB0aGlzLnJlc2l6ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5weENvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c2V0VGltZW91dCgoKT0+e0FwcEFjdGlvbnMucHhBZGRDaGlsZCh0aGlzLnB4Q29udGFpbmVyKX0sIDApXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuV0lORE9XX1JFU0laRSwgdGhpcy5yZXNpemUpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c2V0VGltZW91dCgoKT0+e0FwcEFjdGlvbnMucHhSZW1vdmVDaGlsZCh0aGlzLnB4Q29udGFpbmVyKX0sIDApXG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRzZXR1cEFuaW1hdGlvbnMoKSB7XG5cdFx0c3VwZXIuc2V0dXBBbmltYXRpb25zKClcblx0fVxuXHRnZXRJbWFnZVVybEJ5SWQoaWQpIHtcblx0XHRyZXR1cm4gUHJlbG9hZGVyLmdldEltYWdlVVJMKHRoaXMuaWQgKyAnLScgKyB0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKSArICctJyArIGlkKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLnB4Q29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIpXG5cdFx0QXBwU3RvcmUub2ZmKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBCYXNlUGFnZXIgZnJvbSAnQmFzZVBhZ2VyJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5pbXBvcnQgTGFuZGluZyBmcm9tICdMYW5kaW5nJ1xuaW1wb3J0IExhbmRpbmdUZW1wbGF0ZSBmcm9tICdMYW5kaW5nX2hicydcbmltcG9ydCBQbGFuZXRFeHBlcmllbmNlUGFnZSBmcm9tICdQbGFuZXRFeHBlcmllbmNlUGFnZSdcbmltcG9ydCBQbGFuZXRFeHBlcmllbmNlUGFnZVRlbXBsYXRlIGZyb20gJ1BsYW5ldEV4cGVyaWVuY2VQYWdlX2hicydcbmltcG9ydCBQbGFuZXRDYW1wYWlnblBhZ2UgZnJvbSAnUGxhbmV0Q2FtcGFpZ25QYWdlJ1xuaW1wb3J0IFBsYW5ldENhbXBhaWduUGFnZVRlbXBsYXRlIGZyb20gJ1BsYW5ldENhbXBhaWduUGFnZV9oYnMnXG5cbmNsYXNzIFBhZ2VzQ29udGFpbmVyIGV4dGVuZHMgQmFzZVBhZ2VyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IGZhbHNlXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VELCB0aGlzLmRpZEhhc2hlckNoYW5nZSlcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRBcHBTdG9yZS5vZmYoQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQsIHRoaXMuZGlkSGFzaGVyQ2hhbmdlKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxuXHRkaWRIYXNoZXJDaGFuZ2UoKSB7XG5cdFx0Ly8gU3dhbGxvdyBoYXNoZXIgY2hhbmdlIGlmIHRoZSBjaGFuZ2UgaXMgZmFzdCBhcyAxc2VjXG5cdFx0aWYodGhpcy5zd2FsbG93SGFzaGVyQ2hhbmdlKSByZXR1cm4gXG5cdFx0ZWxzZSB0aGlzLnNldHVwTmV3Ym9ybkNvbXBvbmVudHMoKVxuXHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IHRydWVcblx0XHR0aGlzLmhhc2hlckNoYW5nZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR0aGlzLnN3YWxsb3dIYXNoZXJDaGFuZ2UgPSBmYWxzZVxuXHRcdH0sIDEwMDApXG5cdH1cblx0c2V0dXBOZXdib3JuQ29tcG9uZW50cygpIHtcblx0XHR2YXIgaGFzaCA9IFJvdXRlci5nZXROZXdIYXNoKClcblx0XHR2YXIgdGVtcGxhdGUgPSB7IHR5cGU6IHVuZGVmaW5lZCwgcGFydGlhbDogdW5kZWZpbmVkIH1cblx0XHRzd2l0Y2goaGFzaC5wYXJ0cy5sZW5ndGgpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcGxhdGUudHlwZSA9IExhbmRpbmdcblx0XHRcdFx0dGVtcGxhdGUucGFydGlhbCA9IExhbmRpbmdUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gUGxhbmV0RXhwZXJpZW5jZVBhZ2Vcblx0XHRcdFx0dGVtcGxhdGUucGFydGlhbCA9IFBsYW5ldEV4cGVyaWVuY2VQYWdlVGVtcGxhdGVcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMzpcblx0XHRcdFx0dGVtcGxhdGUudHlwZSA9IFBsYW5ldENhbXBhaWduUGFnZVxuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gUGxhbmV0Q2FtcGFpZ25QYWdlVGVtcGxhdGVcblx0XHRcdFx0YnJlYWtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRlbXBsYXRlLnR5cGUgPSBMYW5kaW5nXG5cdFx0XHRcdHRlbXBsYXRlLnBhcnRpYWwgPSBMYW5kaW5nVGVtcGxhdGVcdFx0XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXR1cE5ld0NvbXBvbmVudChoYXNoLnBhcmVudCwgdGVtcGxhdGUpXG5cdFx0dGhpcy5jdXJyZW50Q29tcG9uZW50ID0gdGhpcy5jb21wb25lbnRzWyduZXctY29tcG9uZW50J11cblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0aWYodGhpcy5jdXJyZW50Q29tcG9uZW50ICE9IHVuZGVmaW5lZCkgdGhpcy5jdXJyZW50Q29tcG9uZW50LnVwZGF0ZSgpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUGFnZXNDb250YWluZXJcblxuXG5cbiIsImltcG9ydCBCYXNlUGxhbmV0UGFnZSBmcm9tICdCYXNlUGxhbmV0UGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBsYW5ldENhbXBhaWduUGFnZSBleHRlbmRzIEJhc2VQbGFuZXRQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcylcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR2YXIgYnVubnlVcmwgPSB0aGlzLmdldEltYWdlVXJsQnlJZCgnYnVubnknKVxuXHRcdHZhciB0ZXh0dXJlID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZShidW5ueVVybClcblx0XHR2YXIgYnVubnkgPSBuZXcgUElYSS5TcHJpdGUodGV4dHVyZSlcblxuXHRcdHRoaXMuZyA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuZylcblxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQoYnVubnkpXG5cdFx0YnVubnkueCA9IDUwMFxuXHRcdGJ1bm55LnkgPSA1MDBcblxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdC8vIGRyYXcgYSByZWN0YW5nbGVcblx0XHR0aGlzLmcuY2xlYXIoKVxuXHRcdHRoaXMuZy5iZWdpbkZpbGwoTWF0aC5yYW5kb20oKSAqIDB4ZmZmZmZmKVxuXHRcdHRoaXMuZy5kcmF3UmVjdCgwLCAwLCB3aW5kb3dXLCB3aW5kb3dIKVxuXHRcdHRoaXMuZy5lbmRGaWxsKClcblxuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlUGxhbmV0UGFnZSBmcm9tICdCYXNlUGxhbmV0UGFnZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQ29tcGFzc2VzQ29udGFpbmVyIGZyb20gJ0NvbXBhc3Nlc0NvbnRhaW5lcidcbmltcG9ydCBBbGFza2FYUCBmcm9tICdBbGFza2FYUCdcbmltcG9ydCBTa2lYUCBmcm9tICdTa2lYUCdcbmltcG9ydCBNZXRhbFhQIGZyb20gJ01ldGFsWFAnXG5pbXBvcnQgV29vZFhQIGZyb20gJ1dvb2RYUCdcbmltcG9ydCBHZW1TdG9uZVhQIGZyb20gJ0dlbVN0b25lWFAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBsYW5ldEV4cGVyaWVuY2VQYWdlIGV4dGVuZHMgQmFzZVBsYW5ldFBhZ2Uge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHZhciBidW5ueVVybCA9IHRoaXMuZ2V0SW1hZ2VVcmxCeUlkKCdidW5ueScpXG5cdFx0dmFyIHRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGJ1bm55VXJsKVxuXHRcdHZhciBidW5ueSA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlKVxuXG5cdFx0dGhpcy5nID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQodGhpcy5nKVxuXHRcdHRoaXMucHhDb250YWluZXIuYWRkQ2hpbGQoYnVubnkpXG5cblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lciA9IG5ldyBDb21wYXNzZXNDb250YWluZXIodGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5pZCA9IHRoaXMuaWRcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHR2YXIgWHBDbGF6eiA9IHRoaXMuZ2V0RXhwZXJpZW5jZUJ5SWQodGhpcy5pZClcblx0XHR0aGlzLmV4cGVyaWVuY2UgPSBuZXcgWHBDbGF6eigpXG5cdFx0dGhpcy5leHBlcmllbmNlLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHRnZXRFeHBlcmllbmNlQnlJZChpZCkge1xuXHRcdHN3aXRjaChpZCl7XG5cdFx0XHRjYXNlICdza2knOiByZXR1cm4gU2tpWFBcblx0XHRcdGNhc2UgJ21ldGFsJzogcmV0dXJuIE1ldGFsWFBcblx0XHRcdGNhc2UgJ2FsYXNrYSc6IHJldHVybiBBbGFza2FYUFxuXHRcdFx0Y2FzZSAnd29vZCc6IHJldHVybiBXb29kWFBcblx0XHRcdGNhc2UgJ2dlbXN0b25lJzogcmV0dXJuIEdlbVN0b25lWFBcblx0XHR9XG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVx0XG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR0aGlzLmV4cGVyaWVuY2UudXBkYXRlKClcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGhpcy5leHBlcmllbmNlLnJlc2l6ZSgpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIucmVzaXplKClcblxuXHRcdC8vIGRyYXcgYSByZWN0YW5nbGVcblx0XHR0aGlzLmcuY2xlYXIoKVxuXHRcdHRoaXMuZy5iZWdpbkZpbGwoTWF0aC5yYW5kb20oKSAqIDB4ZmZmZmZmKVxuXHRcdHRoaXMuZy5kcmF3UmVjdCgwLCAwLCB3aW5kb3dXLCB3aW5kb3dIKVxuXHRcdHRoaXMuZy5lbmRGaWxsKClcblxuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTcHJpbmdHYXJkZW4ge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLmNvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0dGhpcy5vdXRsaW5lQ29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKClcblx0XHR0aGlzLmZpbGxlZENvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpXG5cdFx0dGhpcy5vdXRsaW5lUG9seWdvbiA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHR0aGlzLmZpbGxlZFBvbHlnb24gPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0dGhpcy5vdXRsaW5lQ29udGFpbmVyLmFkZENoaWxkKHRoaXMub3V0bGluZVBvbHlnb24pXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5vdXRsaW5lQ29udGFpbmVyKVxuXHRcdHRoaXMuZmlsbGVkQ29udGFpbmVyLmFkZENoaWxkKHRoaXMuZmlsbGVkUG9seWdvbilcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmZpbGxlZENvbnRhaW5lcilcblx0XHRcblx0XHR0aGlzLmxpbmVXID0gQXBwU3RvcmUuZ2V0TGluZVdpZHRoKClcblx0XHR0aGlzLnBhdXNlZCA9IHRydWVcblx0XHR0aGlzLm9wZW5lZCA9IGZhbHNlXG5cblx0XHR0aGlzLmtub3RzID0gW11cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IEFwcENvbnN0YW50cy5UT1RBTF9LTk9UX05VTTsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IG5ldyBLbm90KHRoaXMuY29udGFpbmVyKS5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0XHR0aGlzLmtub3RzW2ldID0ga25vdFxuXHRcdH1cblxuXHRcdHRoaXMuY29uZmlnID0ge1xuXHRcdFx0c3ByaW5nOiAwLFxuXHRcdFx0ZnJpY3Rpb246IDAsXG5cdFx0XHRzcHJpbmdMZW5ndGg6IDBcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoa25vdHMsIGNvbG9yKSB7XG5cdFx0dGhpcy5jb2xvciA9IGNvbG9yXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMua25vdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBuZXdLbm90U2NhbGUgPSBrbm90c1tpXVxuXHRcdFx0dmFyIGtub3QgPSB0aGlzLmtub3RzW2ldXG5cdFx0XHRrbm90LnRvWCA9IG5ld0tub3RTY2FsZS54ICogKHRoaXMucmFkaXVzKVxuXHRcdFx0a25vdC50b1kgPSBuZXdLbm90U2NhbGUueSAqICh0aGlzLnJhZGl1cylcblx0XHR9XG5cdFx0dGhpcy5jb250YWluZXIucm90YXRpb24gPSBVdGlscy5SYW5kKC00LCA0KVxuXHRcdHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCA9IDIwMFxuXHRcdHRoaXMuYXNzaWduT3BlbmVkQ29uZmlnKClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dGhpcy5vdXRsaW5lUG9seWdvbi5jbGVhcigpXG5cdFx0dGhpcy5maWxsZWRQb2x5Z29uLmNsZWFyKClcblx0XHR0aGlzLmZpbGxlZFBvbHlnb24uYmVnaW5GaWxsKHRoaXMuY29sb3IpXG5cdFx0dGhpcy5maWxsZWRQb2x5Z29uLmxpbmVTdHlsZSgwKVxuXHRcdHRoaXMuZmlsbGVkUG9seWdvbi5tb3ZlVG8odGhpcy5rbm90c1swXS54LCB0aGlzLmtub3RzWzBdLnkpXG5cdFx0dmFyIGxlbiA9IHRoaXMua25vdHMubGVuZ3RoXG5cdFx0dmFyIHNwcmluZyA9IHRoaXMuY29uZmlnLnNwcmluZ1xuXHRcdHZhciBmcmljdGlvbiA9IHRoaXMuY29uZmlnLmZyaWN0aW9uXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSB0aGlzLmtub3RzW2ldXG5cdFx0XHR2YXIgcHJldmlvdXNLbm90ID0gdGhpcy5rbm90c1tpLTFdXG5cdFx0XHRwcmV2aW91c0tub3QgPSAocHJldmlvdXNLbm90ID09IHVuZGVmaW5lZCkgPyB0aGlzLmtub3RzW2xlbi0xXSA6IHByZXZpb3VzS25vdFxuXG5cdFx0XHRVdGlscy5TcHJpbmdUbyhrbm90LCBrbm90LnRvWCwga25vdC50b1ksIGksIHNwcmluZywgZnJpY3Rpb24sIHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aClcblx0XHRcdGtub3QucG9zaXRpb24oa25vdC54ICsga25vdC52eCwga25vdC55ICsga25vdC52eSlcblxuXHRcdFx0Ly8gb3V0bGluZVxuXHRcdFx0dGhpcy5vdXRsaW5lUG9seWdvbi5saW5lU3R5bGUodGhpcy5saW5lVywgdGhpcy5jb2xvciwgMC44KVxuXHRcdFx0dGhpcy5vdXRsaW5lUG9seWdvbi5tb3ZlVG8ocHJldmlvdXNLbm90LngsIHByZXZpb3VzS25vdC55KVxuXHRcdFx0dGhpcy5vdXRsaW5lUG9seWdvbi5saW5lVG8oa25vdC54LCBrbm90LnkpXG5cdFx0fVxuXHRcdHRoaXMuZmlsbGVkUG9seWdvbi5lbmRGaWxsKClcblx0XHR0aGlzLmNvbmZpZy5zcHJpbmdMZW5ndGggLT0gKHRoaXMuY29uZmlnLnNwcmluZ0xlbmd0aCkgKiAwLjFcblx0XHR0aGlzLmNvbnRhaW5lci5yb3RhdGlvbiAtPSAodGhpcy5jb250YWluZXIucm90YXRpb24pICogMC4xXG5cdH1cblx0YXNzaWduT3BlbmVkQ29uZmlnKCkge1xuXHRcdHRoaXMuY29uZmlnLnNwcmluZyA9IDAuMDNcblx0XHR0aGlzLmNvbmZpZy5mcmljdGlvbiA9IDAuOTJcblx0fVxuXHRyZXNpemUocmFkaXVzKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnJhZGl1cyA9IHJhZGl1c1xuXHRcdC8vIHRoaXMuYXNzaWduVG9Hb1ZhbHVlcygpXG5cdFx0dGhpcy5jb250YWluZXIueCA9IDBcblx0XHR0aGlzLmNvbnRhaW5lci55ID0gMFxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWxhc2thWFAgZXh0ZW5kcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0fVxuXHR1cGRhdGUoKSB7XG5cdH1cblx0cmVzaXplKCkge1xuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2VtU3RvbmVYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWV0YWxYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTa2lYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXb29kWFAgZXh0ZW5kcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG4iLCJpbXBvcnQgUGFnZSBmcm9tICdQYWdlJ1xuaW1wb3J0IExhbmRpbmdTbGlkZXNob3cgZnJvbSAnTGFuZGluZ1NsaWRlc2hvdydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBDb21wYXNzIGZyb20gJ0NvbXBhc3MnXG5pbXBvcnQgQXJyb3dCdG4gZnJvbSAnQXJyb3dCdG4nXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMYW5kaW5nIGV4dGVuZHMgUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93ID0gbmV3IExhbmRpbmdTbGlkZXNob3codGhpcy5weENvbnRhaW5lciwgdGhpcy5jaGlsZClcblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5jb21wYXNzID0gbmV3IENvbXBhc3ModGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLmNvbXBhc3MuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5hcnJvd0xlZnQgPSBuZXcgQXJyb3dCdG4odGhpcy5weENvbnRhaW5lciwgQXBwQ29uc3RhbnRzLkxFRlQpXG5cdFx0dGhpcy5hcnJvd0xlZnQuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5hcnJvd1JpZ2h0ID0gbmV3IEFycm93QnRuKHRoaXMucHhDb250YWluZXIsIEFwcENvbnN0YW50cy5SSUdIVClcblx0XHR0aGlzLmFycm93UmlnaHQuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5vbktleVByZXNzZWQgPSB0aGlzLm9uS2V5UHJlc3NlZC5iaW5kKHRoaXMpXG5cdFx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCB0aGlzLm9uS2V5UHJlc3NlZClcblxuXHRcdHRoaXMucGFyZW50LmNzcygnY3Vyc29yJywgJ3BvaW50ZXInKVxuXG5cdFx0dGhpcy5vblN0YWdlQ2xpY2tlZCA9IHRoaXMub25TdGFnZUNsaWNrZWQuYmluZCh0aGlzKVxuXHRcdHRoaXMucGFyZW50Lm9uKCdjbGljaycsIHRoaXMub25TdGFnZUNsaWNrZWQpXG5cblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0b25TdGFnZUNsaWNrZWQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHN3aXRjaCh0aGlzLmRpcmVjdGlvbikge1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEVGVDpcblx0XHRcdFx0dGhpcy5wcmV2aW91cygpXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5SSUdIVDpcblx0XHRcdFx0dGhpcy5uZXh0KClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlRPUDpcblx0XHRcdFx0dmFyIHVybCA9IFwiL3BsYW5ldC9cIiArIHRoaXMubGFuZGluZ1NsaWRlc2hvdy5jdXJyZW50SWRcblx0XHRcdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0fVxuXHRvbktleVByZXNzZWQoZSkge1xuXHQgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0c3dpdGNoKGUud2hpY2gpIHtcblx0ICAgICAgICBjYXNlIDM3OiAvLyBsZWZ0XG5cdCAgICAgICAgXHR0aGlzLnByZXZpb3VzKClcblx0ICAgICAgICBicmVhaztcblx0ICAgICAgICBjYXNlIDM5OiAvLyByaWdodFxuXHQgICAgICAgIFx0dGhpcy5uZXh0KClcblx0ICAgICAgICBicmVhaztcblx0ICAgICAgICBkZWZhdWx0OiByZXR1cm47XG5cdCAgICB9XG5cdH1cblx0dXBkYXRlQ29tcGFzc1BsYW5ldCgpIHtcblx0XHR2YXIgcGxhbmV0RGF0YSA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQodGhpcy5sYW5kaW5nU2xpZGVzaG93LmN1cnJlbnRJZClcblx0XHR0aGlzLmNvbXBhc3MudXBkYXRlRGF0YShwbGFuZXREYXRhKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdG5leHQoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93Lm5leHQoKVxuXHRcdHRoaXMudXBkYXRlQ29tcGFzc1BsYW5ldCgpXG5cdH1cblx0cHJldmlvdXMoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnByZXZpb3VzKClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cudXBkYXRlKClcblx0XHR0aGlzLmNvbXBhc3MudXBkYXRlKClcblxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgbW91c2VYID0gQXBwU3RvcmUuTW91c2UueFxuXHRcdGlmKG1vdXNlWCA8IHdpbmRvd1cgKiAwLjI1KSB7XG5cdFx0XHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5MRUZUXG5cdFx0XHR0aGlzLmFycm93TGVmdC5yb2xsb3ZlcigpXG5cdFx0fWVsc2UgaWYobW91c2VYID4gd2luZG93VyAqIDAuNzUpIHtcblx0XHRcdHRoaXMuZGlyZWN0aW9uID0gQXBwQ29uc3RhbnRzLlJJR0hUXG5cdFx0XHR0aGlzLmFycm93UmlnaHQucm9sbG92ZXIoKVxuXHRcdH1lbHNle1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTk9ORVxuXHRcdFx0dGhpcy5hcnJvd0xlZnQucm9sbG91dCgpXG5cdFx0XHR0aGlzLmFycm93UmlnaHQucm9sbG91dCgpXG5cdFx0fVxuXG5cdFx0dmFyIGFyZWEgPSB3aW5kb3dXICogMC4yNVxuXHRcdGlmKG1vdXNlWCA+ICgod2luZG93VyA+PiAxKSAtIGFyZWEpICYmIG1vdXNlWCA8ICgod2luZG93VyA+PiAxKSArIGFyZWEpKSB7XG5cdFx0XHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5UT1Bcblx0XHR9XG5cblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5yZXNpemUoKVxuXHRcdHRoaXMuY29tcGFzcy5yZXNpemUoKVxuXG5cdFx0dGhpcy5jb21wYXNzLnBvc2l0aW9uKFxuXHRcdFx0d2luZG93VyA+PiAxLFxuXHRcdFx0KHdpbmRvd0ggPj4gMSkgLSAod2luZG93SCAqIDAuMDUpXG5cdFx0KVxuXG5cdFx0dGhpcy5hcnJvd1JpZ2h0LnBvc2l0aW9uKFxuXHRcdFx0d2luZG93VyAtIChBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgPDwgMiksXG5cdFx0XHR3aW5kb3dIID4+IDFcblx0XHQpXG5cblx0XHR0aGlzLmFycm93TGVmdC5wb3NpdGlvbihcblx0XHRcdChBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgPDwgMiksXG5cdFx0XHR3aW5kb3dIID4+IDFcblx0XHQpXG5cblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5jb21wYXNzLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmFycm93TGVmdC5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5hcnJvd1JpZ2h0LmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHQkKGRvY3VtZW50KS5vZmYoJ2tleWRvd24nLCB0aGlzLm9uS2V5UHJlc3NlZClcblx0XHR0aGlzLnBhcmVudC5vZmYoJ2NsaWNrJywgdGhpcy5vblN0YWdlQ2xpY2tlZClcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuIiwiZXhwb3J0IGRlZmF1bHQge1xuXHRXSU5ET1dfUkVTSVpFOiAnV0lORE9XX1JFU0laRScsXG5cdFBBR0VfSEFTSEVSX0NIQU5HRUQ6ICdQQUdFX0hBU0hFUl9DSEFOR0VEJyxcblx0UFhfQ09OVEFJTkVSX0lTX1JFQURZOiAnUFhfQ09OVEFJTkVSX0lTX1JFQURZJyxcblx0UFhfQ09OVEFJTkVSX0FERF9DSElMRDogJ1BYX0NPTlRBSU5FUl9BRERfQ0hJTEQnLFxuXHRQWF9DT05UQUlORVJfUkVNT1ZFX0NISUxEOiAnUFhfQ09OVEFJTkVSX1JFTU9WRV9DSElMRCcsXG5cblx0TEFORElORzogJ0xBTkRJTkcnLFxuXHRFWFBFUklFTkNFOiAnRVhQRVJJRU5DRScsXG5cdENBTVBBSUdOOiAnQ0FNUEFJR04nLFxuXHROT05FOiAnTk9ORScsXG5cblx0Q09NUEFTU19TSVpFX1BFUkNFTlRBR0U6IDAuMjQsXG5cblx0Q09NUEFTU19TTUFMTF9TSVpFX1BFUkNFTlRBR0U6IDAuMSxcblxuXHRMRUZUOiAnTEVGVCcsXG5cdFJJR0hUOiAnUklHSFQnLFxuXHRUT1A6ICdUT1AnLFxuXHRCT1RUT006ICdCT1RUT00nLFxuXG5cdFRPVEFMX0tOT1RfTlVNOiAzLFxuXG5cdFBBRERJTkdfQVJPVU5EOiAyMCxcblxuXHRSRVNQT05TSVZFX0lNQUdFOiBbMTkyMCwgMTI4MCwgNjQwXSxcblxuXHRFTlZJUk9OTUVOVFM6IHtcblx0XHRQUkVQUk9EOiB7XG5cdFx0XHRzdGF0aWM6ICcnXG5cdFx0fSxcblx0XHRQUk9EOiB7XG5cdFx0XHRcInN0YXRpY1wiOiBKU191cmxfc3RhdGljXG5cdFx0fVxuXHR9LFxuXG5cdExBTkRTQ0FQRTogJ0xBTkRTQ0FQRScsXG5cdFBPUlRSQUlUOiAnUE9SVFJBSVQnLFxuXG5cdE1FRElBX0dMT0JBTF9XOiAxOTIwLFxuXHRNRURJQV9HTE9CQUxfSDogMTA4MCxcblxuXHRNSU5fTUlERExFX1c6IDk2MCxcblx0TVFfWFNNQUxMOiAzMjAsXG5cdE1RX1NNQUxMOiA0ODAsXG5cdE1RX01FRElVTTogNzY4LFxuXHRNUV9MQVJHRTogMTAyNCxcblx0TVFfWExBUkdFOiAxMjgwLFxuXHRNUV9YWExBUkdFOiAxNjgwLFxufSIsImltcG9ydCBGbHV4IGZyb20gJ2ZsdXgnXG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nXG5cbnZhciBBcHBEaXNwYXRjaGVyID0gYXNzaWduKG5ldyBGbHV4LkRpc3BhdGNoZXIoKSwge1xuXHRoYW5kbGVWaWV3QWN0aW9uOiBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHR0aGlzLmRpc3BhdGNoKHtcblx0XHRcdHNvdXJjZTogJ1ZJRVdfQUNUSU9OJyxcblx0XHRcdGFjdGlvbjogYWN0aW9uXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBBcHBEaXNwYXRjaGVyIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlciwgYWxpYXMxPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMyPVwiZnVuY3Rpb25cIiwgYWxpYXMzPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICByZXR1cm4gXCJcdFx0XHRcdFx0PGxpIGNsYXNzPVxcXCJjb3VudHJ5LVwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbmRleCB8fCAoZGF0YSAmJiBkYXRhLmluZGV4KSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJpbmRleFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPjxhIGhyZWY9JyNcIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51cmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcInVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCInPlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5uYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5uYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvYT48L2xpPlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazEsIGhlbHBlciwgYWxpYXMxPXRoaXMubGFtYmRhLCBhbGlhczI9dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBhbGlhczM9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczQ9XCJmdW5jdGlvblwiO1xuXG4gIHJldHVybiBcIjxkaXY+XFxuXHQ8aGVhZGVyIGlkPVxcXCJoZWFkZXJcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJsb2dvXFxcIj5cXG5cdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgaWQ9XFxcIkxheWVyXzFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMzYuMDEzcHhcXFwiIHZpZXdCb3g9XFxcIjAgMCAxMzYuMDEzIDQ5LjM3NVxcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMTM2LjAxMyA0OS4zNzVcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCIgY2xpcC1ydWxlPVxcXCJldmVub2RkXFxcIiBkPVxcXCJNODIuMTQxLDguMDAyaDMuMzU0YzEuMjEzLDAsMS43MTcsMC40OTksMS43MTcsMS43MjV2Ny4xMzdjMCwxLjIzMS0wLjUwMSwxLjczNi0xLjcwNSwxLjczNmgtMy4zNjVWOC4wMDJ6IE04Mi41MjMsMjQuNjE3djguNDI2bC03LjA4Ny0wLjM4NFYxLjkyNUg4Ny4zOWMzLjI5MiwwLDUuOTYsMi43MDUsNS45Niw2LjA0NHYxMC42MDRjMCwzLjMzOC0yLjY2OCw2LjA0NC01Ljk2LDYuMDQ0SDgyLjUyM3ogTTMzLjQ5MSw3LjkxM2MtMS4xMzIsMC0yLjA0OCwxLjA2NS0yLjA0OCwyLjM3OXYxMS4yNTZoNC40MDlWMTAuMjkyYzAtMS4zMTQtMC45MTctMi4zNzktMi4wNDctMi4zNzlIMzMuNDkxeiBNMzIuOTk0LDAuOTc0aDEuMzA4YzQuNzAyLDAsOC41MTQsMy44NjYsOC41MTQsOC42MzR2MjUuMjI0bC02Ljk2MywxLjI3M3YtNy44NDhoLTQuNDA5bDAuMDEyLDguNzg3bC02Ljk3NCwyLjAxOFY5LjYwOEMyNC40ODEsNC44MzksMjguMjkyLDAuOTc0LDMyLjk5NCwwLjk3NCBNMTIxLjkzMyw3LjkyMWgzLjQyM2MxLjIxNSwwLDEuNzE4LDAuNDk3LDEuNzE4LDEuNzI0djguMTk0YzAsMS4yMzItMC41MDIsMS43MzYtMS43MDUsMS43MzZoLTMuNDM2VjcuOTIxeiBNMTMzLjcxOCwzMS4wNTV2MTcuNDg3bC02LjkwNi0zLjM2OFYzMS41OTFjMC00LjkyLTQuNTg4LTUuMDgtNC41ODgtNS4wOHYxNi43NzRsLTYuOTgzLTIuOTE0VjEuOTI1aDEyLjIzMWMzLjI5MSwwLDUuOTU5LDIuNzA1LDUuOTU5LDYuMDQ0djExLjA3N2MwLDIuMjA3LTEuMjE3LDQuMTUzLTIuOTkxLDUuMTE1QzEzMS43NjEsMjQuODk0LDEzMy43MTgsMjcuMDc3LDEzMy43MTgsMzEuMDU1IE0xMC44MDksMC44MzNjLTQuNzAzLDAtOC41MTQsMy44NjYtOC41MTQsOC42MzR2MjcuOTM2YzAsNC43NjksNC4wMTksOC42MzQsOC43MjIsOC42MzRsMS4zMDYtMC4wODVjNS42NTUtMS4wNjMsOC4zMDYtNC42MzksOC4zMDYtOS40MDd2LTguOTRoLTYuOTk2djguNzM2YzAsMS40MDktMC4wNjQsMi42NS0xLjk5NCwyLjk5MmMtMS4yMzEsMC4yMTktMi40MTctMC44MTYtMi40MTctMi4xMzJWMTAuMTUxYzAtMS4zMTQsMC45MTctMi4zODEsMi4wNDctMi4zODFoMC4zMTVjMS4xMywwLDIuMDQ4LDEuMDY3LDIuMDQ4LDIuMzgxdjguNDY0aDYuOTk2VjkuNDY3YzAtNC43NjgtMy44MTItOC42MzQtOC41MTQtOC42MzRIMTAuODA5IE0xMDMuOTUzLDIzLjE2Mmg2Ljk3N3YtNi43NDRoLTYuOTc3VjguNDIzbDcuNjc2LTAuMDAyVjEuOTI0SDk2LjcydjMzLjI3OGMwLDAsNS4yMjUsMS4xNDEsNy41MzIsMS42NjZjMS41MTcsMC4zNDYsNy43NTIsMi4yNTMsNy43NTIsMi4yNTN2LTcuMDE1bC04LjA1MS0xLjUwOFYyMy4xNjJ6IE00Ni44NzksMS45MjdsMC4wMDMsMzIuMzVsNy4xMjMtMC44OTVWMTguOTg1bDUuMTI2LDEwLjQyNmw1LjEyNi0xMC40ODRsMC4wMDIsMTMuNjY0bDcuMDIyLTAuMDU0VjEuODk1aC03LjU0NUw1OS4xMywxNC42TDU0LjY2MSwxLjkyN0g0Ni44Nzl6XFxcIi8+PC9zdmc+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJjYW1wZXItbGFiXFxcIj48YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmNhbXBlcl9sYWJfdXJsIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY2FtcGVyX2xhYiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwic2hvcC13cmFwcGVyXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzaG9wLXRpdGxlXFxcIj5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuc2hvcF90aXRsZSA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvZGl2Plxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImdlbmRlci13cmFwcGVyXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcIm1lblxcXCI+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX21lbl91cmwgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX21lbiA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInNlcGFyYXRvclxcXCI+PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ3b21lblxcXCI+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX3dvbWVuX3VybCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLnNob3Bfd29tZW4gOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCI8L2E+PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJsYW5nLXdyYXBwZXIgYnRuXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJjdXJyZW50LWxhbmdcXFwiPlwiXG4gICAgKyBhbGlhczIoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5jdXJyZW50X2xhbmcgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmN1cnJlbnRfbGFuZyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiY3VycmVudF9sYW5nXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvZGl2Plxcblx0XHRcdDx1bCBjbGFzcz1cXFwiY291bnRyaWVzLXdyYXBwZXJcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuY291bnRyaWVzIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJlYWNoXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXHRcdFx0PC91bD5cXG5cdFx0PC9kaXY+XFxuXHQ8L2hlYWRlcj5cXG5cdDxmb290ZXIgaWQ9XFxcImZvb3RlclxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcImxlZ2FsXFxcIj48YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmxlZ2FsX3VybCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmxlZ2FsIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiPC9hPjwvZGl2Plxcblx0XHQ8dWwgaWQ9XFxcInNvY2lhbC13cmFwcGVyXFxcIj5cXG5cdFx0XHQ8bGk+XFxuXHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmZhY2Vib29rVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5mYWNlYm9va1VybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiZmFjZWJvb2tVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE2LjAwMiwwLjE2N2MtOC43NDYsMC0xNS44MzUsNy4wOS0xNS44MzUsMTUuODM0YzAsOC43NDYsNy4wODksMTUuODM1LDE1LjgzNSwxNS44MzVjOC43NDUsMCwxNS44MzQtNy4wODksMTUuODM0LTE1LjgzNUMzMS44MzYsNy4yNTcsMjQuNzQ3LDAuMTY3LDE2LjAwMiwwLjE2NyBNMjIuMzIyLDEzLjUzOWMwLjAwNywwLjEzOCwwLjAwOSwwLjI3OSwwLjAwOSwwLjQyYzAsNC4zMDItMy4yNzIsOS4yNTktOS4yNTksOS4yNTljLTEuODM3LDAtMy41NDctMC41MzktNC45ODctMS40NjFjMC4yNTMsMC4wMzEsMC41MTQsMC4wNDQsMC43NzYsMC4wNDRjMS41MjUsMCwyLjkyOC0wLjUyLDQuMDQyLTEuMzk0Yy0xLjQyNC0wLjAyMy0yLjYyNS0wLjk2NS0zLjAzOS0yLjI1OGMwLjE5OCwwLjAzNywwLjQwMiwwLjA1OCwwLjYxMSwwLjA1OGMwLjI5OCwwLDAuNTg1LTAuMDM4LDAuODU4LTAuMTE1Yy0xLjQ4OS0wLjI5Ny0yLjYxMi0xLjYxMi0yLjYxMi0zLjE4OXYtMC4wNDFjMC40NCwwLjI0MiwwLjk0MiwwLjM4OSwxLjQ3NSwwLjQwN2MtMC44NzMtMC41ODUtMS40NDctMS41ODEtMS40NDctMi43MDljMC0wLjU5NywwLjE2LTEuMTU1LDAuNDQxLTEuNjM4YzEuNjA1LDEuOTcsNC4wMDMsMy4yNjQsNi43MDgsMy40Yy0wLjA1Ny0wLjIzOC0wLjA4NS0wLjQ4NS0wLjA4NS0wLjc0YzAtMS43OTcsMS40NTgtMy4yNTQsMy4yNTQtMy4yNTRjMC45MzcsMCwxLjc4MywwLjM5NSwyLjM3NSwxLjAyOGMwLjc0Mi0wLjE0NiwxLjQzOC0wLjQxNywyLjA2Ny0wLjc4OWMtMC4yNDIsMC43NTktMC43NTksMS4zOTYtMS40MzIsMS43OTljMC42NTgtMC4wNzksMS4yODYtMC4yNTMsMS44NjktMC41MTFDMjMuNTExLDEyLjUwNywyMi45NTksMTMuMDc5LDIyLjMyMiwxMy41MzlcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdDwvYT5cXG5cdFx0XHQ8L2xpPlxcblx0XHRcdDxsaT5cXG5cdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudHdpdHRlclVybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudHdpdHRlclVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwidHdpdHRlclVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTYuMDAxLDAuMTY3Yy04Ljc0NSwwLTE1LjgzNCw3LjA5LTE1LjgzNCwxNS44MzRjMCw4Ljc0NSw3LjA4OSwxNS44MzUsMTUuODM0LDE1LjgzNWM4Ljc0NSwwLDE1LjgzNC03LjA5LDE1LjgzNC0xNS44MzVDMzEuODM2LDcuMjU3LDI0Ljc0NiwwLjE2NywxNi4wMDEsMC4xNjcgTTE5LjQ5OCwxMy4zMmwtMC4xODQsMi4zNjloLTIuNDI3djguMjI5aC0zLjA2OHYtOC4yMjloLTEuNjM4VjEzLjMyaDEuNjM4di0xLjU5MmMwLTAuNzAxLDAuMDE3LTEuNzgyLDAuNTI3LTIuNDUzYzAuNTM2LTAuNzA5LDEuMjczLTEuMTkxLDIuNTQxLTEuMTkxYzIuMDY2LDAsMi45MzUsMC4yOTUsMi45MzUsMC4yOTVsLTAuNDEsMi40MjVjMCwwLTAuNjgyLTAuMTk2LTEuMzE4LTAuMTk2Yy0wLjYzNywwLTEuMjA3LDAuMjI3LTEuMjA3LDAuODYzdjEuODVIMTkuNDk4elxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0PC9hPlxcblx0XHRcdDwvbGk+XFxuXHRcdFx0PGxpPlxcblx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbnN0YWdyYW1VcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluc3RhZ3JhbVVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczMpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczQgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaW5zdGFncmFtVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xOS40MTMsMTIuNjAybC0wLjAwOS0yLjY4NmwyLjY4NS0wLjAwOHYyLjY4NEwxOS40MTMsMTIuNjAyeiBNMTYuMDA0LDE4Ljc4OGMxLjUzNiwwLDIuNzg3LTEuMjUsMi43ODctMi43ODdjMC0wLjYwNS0wLjE5Ni0xLjE2Ni0wLjUyOC0xLjYyNGMtMC41MDctMC43MDMtMS4zMjktMS4xNjMtMi4yNTktMS4xNjNjLTAuOTMxLDAtMS43NTMsMC40Ni0yLjI2LDEuMTYzYy0wLjMzLDAuNDU4LTAuNTI3LDEuMDE5LTAuNTI3LDEuNjI0QzEzLjIxNywxNy41MzgsMTQuNDY3LDE4Ljc4OCwxNi4wMDQsMTguNzg4eiBNMjAuMzMzLDE2LjAwMWMwLDIuMzg3LTEuOTQyLDQuMzMtNC4zMjksNC4zM2MtMi4zODgsMC00LjMyOS0xLjk0My00LjMyOS00LjMzYzAtMC41NzUsMC4xMTQtMS4xMjMsMC4zMTgtMS42MjRIOS42Mjl2Ni40ODFjMCwwLjgzNiwwLjY4MSwxLjUxOCwxLjUxOCwxLjUxOGg5LjcxNGMwLjgzNywwLDEuNTE3LTAuNjgyLDEuNTE3LTEuNTE4di02LjQ4MWgtMi4zNjNDMjAuMjE3LDE0Ljg3OCwyMC4zMzMsMTUuNDI2LDIwLjMzMywxNi4wMDF6IE0zMS44MzYsMTYuMDAxYzAsOC43NDQtNy4wOSwxNS44MzUtMTUuODM1LDE1LjgzNVMwLjE2NywyNC43NDUsMC4xNjcsMTYuMDAxYzAtOC43NDUsNy4wODktMTUuODM0LDE1LjgzNC0xNS44MzRTMzEuODM2LDcuMjU2LDMxLjgzNiwxNi4wMDF6IE0yMy45MjEsMTEuMTQ0YzAtMS42ODgtMS4zNzMtMy4wNi0zLjA2Mi0zLjA2aC05LjcxM2MtMS42ODcsMC0zLjA2LDEuMzcxLTMuMDYsMy4wNnY5LjcxNGMwLDEuNjg4LDEuMzczLDMuMDYsMy4wNiwzLjA2aDkuNzEzYzEuNjg4LDAsMy4wNjItMS4zNzIsMy4wNjItMy4wNlYxMS4xNDR6XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHQ8L2E+XFxuXHRcdFx0PC9saT5cXG5cdFx0PC91bD5cXG5cdDwvZm9vdGVyPlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBpZD0ncGFnZXMtY29udGFpbmVyJz5cXG5cdDxkaXYgaWQ9J3BhZ2UtYSc+PC9kaXY+XFxuXHQ8ZGl2IGlkPSdwYWdlLWInPjwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdDxkaXYgY2xhc3M9XFxcInZlcnRpY2FsLWNlbnRlci1wYXJlbnRcXFwiPlxcblx0XHQ8cCBjbGFzcz1cXFwidmVydGljYWwtY2VudGVyLWNoaWxkXFxcIj5cXG5cdFx0XHRwbGFuZXQgY2FtcGFpZ24gcGFnZVxcblx0XHQ8L3A+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIjxkaXYgY2xhc3M9J3BhZ2Utd3JhcHBlcic+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJ2ZXJ0aWNhbC1jZW50ZXItcGFyZW50XFxcIj5cXG5cdFx0PHAgY2xhc3M9XFxcInZlcnRpY2FsLWNlbnRlci1jaGlsZFxcXCI+XFxuXHRcdFx0cGxhbmV0IGV4cGVyaWVuY2UgcGFnZVxcblx0XHQ8L3A+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIjxkaXYgY2xhc3M9J3BhZ2Utd3JhcHBlcic+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJzbGlkZXNob3ctdGl0bGVcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJwbGFuZXQtdGl0bGVcXFwiPlBMQU5FVDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJwbGFuZXQtbmFtZVxcXCI+R0VNU1RPTkU8L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuICAgIFx0XG5jbGFzcyBHbG9iYWxFdmVudHMge1xuXHRpbml0KCkge1xuXHRcdCQod2luZG93KS5vbigncmVzaXplJywgdGhpcy5yZXNpemUpXG5cdFx0JCh3aW5kb3cpLm9uKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlKVxuXHRcdEFwcFN0b3JlLk1vdXNlID0gbmV3IFBJWEkuUG9pbnQoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRBcHBBY3Rpb25zLndpbmRvd1Jlc2l6ZSh3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0KVxuXHR9XG5cdG9uTW91c2VNb3ZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRBcHBTdG9yZS5Nb3VzZS54ID0gZS5wYWdlWFxuXHRcdEFwcFN0b3JlLk1vdXNlLnkgPSBlLnBhZ2VZXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2xvYmFsRXZlbnRzXG4iLCJpbXBvcnQgb3AgZnJvbSAnb2JqZWN0cG9vbCdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBTcHJpbmdHYXJkZW4gZnJvbSAnU3ByaW5nR2FyZGVuJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb29sIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHR2YXIgcHhDb250YWluZXJOdW0gPSAyMCArIChwbGFuZXRzLmxlbmd0aCAqIDEpXG5cdFx0dmFyIGdyYXBoaWNzTnVtID0gcGxhbmV0cy5sZW5ndGhcblx0XHR2YXIgc3ByaXRlc051bSA9IHBsYW5ldHMubGVuZ3RoXG5cdFx0dmFyIHNwcmluZ0dhcmRlbnNOdW0gPSAxMFxuXG5cdFx0dGhpcy50aW1lbGluZXMgPSBvcC5nZW5lcmF0ZShUaW1lbGluZU1heCwgeyBjb3VudDogNCB9KVxuXHRcdHRoaXMucHhDb250YWluZXJzID0gb3AuZ2VuZXJhdGUoUElYSS5Db250YWluZXIsIHsgY291bnQ6IHB4Q29udGFpbmVyTnVtIH0pXG5cdFx0dGhpcy5ncmFwaGljcyA9IG9wLmdlbmVyYXRlKFBJWEkuR3JhcGhpY3MsIHsgY291bnQ6IGdyYXBoaWNzTnVtIH0pXG5cdFx0dGhpcy5zcHJpdGVzID0gb3AuZ2VuZXJhdGUoUElYSS5TcHJpdGUsIHsgY291bnQ6IHNwcml0ZXNOdW0gfSlcblx0XHR0aGlzLnNwcmluZ0dhcmRlbnMgPSBvcC5nZW5lcmF0ZShTcHJpbmdHYXJkZW4sIHsgY291bnQ6IHNwcmluZ0dhcmRlbnNOdW0gfSlcblx0fVxuXHRnZXRUaW1lbGluZSgpIHtcblx0XHRyZXR1cm4gdGhpcy50aW1lbGluZXMuZ2V0KClcblx0fVxuXHRyZWxlYXNlVGltZWxpbmUoaXRlbSkge1xuXHRcdHRoaXMudGltZWxpbmVzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRDb250YWluZXIoKSB7XG5cdFx0dmFyIGNvbnRhaW5lciA9IHRoaXMucHhDb250YWluZXJzLmdldCgpXG5cdFx0Y29udGFpbmVyLnNjYWxlLnggPSAxXG5cdFx0Y29udGFpbmVyLnNjYWxlLnkgPSAxXG5cdFx0Y29udGFpbmVyLnBvc2l0aW9uLnggPSAwXG5cdFx0Y29udGFpbmVyLnBvc2l0aW9uLnkgPSAwXG5cdFx0Y29udGFpbmVyLnNrZXcueCA9IDBcblx0XHRjb250YWluZXIuc2tldy55ID0gMFxuXHRcdGNvbnRhaW5lci5waXZvdC54ID0gMFxuXHRcdGNvbnRhaW5lci5waXZvdC55ID0gMFxuXHRcdGNvbnRhaW5lci5yb3RhdGlvbiA9IDBcblx0XHRyZXR1cm4gY29udGFpbmVyXG5cdH1cblx0cmVsZWFzZUNvbnRhaW5lcihpdGVtKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lcnMucmVsZWFzZShpdGVtKVxuXHR9XG5cdGdldEdyYXBoaWNzKCkge1xuXHRcdHJldHVybiB0aGlzLmdyYXBoaWNzLmdldCgpXG5cdH1cblx0cmVsZWFzZUdyYXBoaWNzKGl0ZW0pIHtcblx0XHR0aGlzLmdyYXBoaWNzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRTcHJpdGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3ByaXRlcy5nZXQoKVxuXHR9XG5cdHJlbGVhc2VTcHJpdGUoaXRlbSkge1xuXHRcdHRoaXMuc3ByaXRlcy5yZWxlYXNlKGl0ZW0pXG5cdH1cblx0Z2V0U3ByaW5nR2FyZGVuKCkge1xuXHRcdHJldHVybiB0aGlzLnNwcmluZ0dhcmRlbnMuZ2V0KClcblx0fVxuXHRyZWxlYXNlU3ByaW5nR2FyZGVuKGl0ZW0pIHtcblx0XHR0aGlzLnNwcmluZ0dhcmRlbnMucmVsZWFzZShpdGVtKVxuXHR9XG59XG4iLCJjbGFzcyBQcmVsb2FkZXIgIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5xdWV1ZSA9IG5ldyBjcmVhdGVqcy5Mb2FkUXVldWUoKVxuXHRcdHRoaXMucXVldWUub24oXCJjb21wbGV0ZVwiLCB0aGlzLm9uTWFuaWZlc3RMb2FkQ29tcGxldGVkLCB0aGlzKVxuXHRcdHRoaXMuY3VycmVudExvYWRlZENhbGxiYWNrID0gdW5kZWZpbmVkXG5cdH1cblx0bG9hZChtYW5pZmVzdCwgb25Mb2FkZWQpIHtcblx0XHR0aGlzLmN1cnJlbnRMb2FkZWRDYWxsYmFjayA9IG9uTG9hZGVkXG4gICAgICAgIHRoaXMucXVldWUubG9hZE1hbmlmZXN0KG1hbmlmZXN0KVxuXHR9XG5cdG9uTWFuaWZlc3RMb2FkQ29tcGxldGVkKCkge1xuXHRcdHRoaXMuY3VycmVudExvYWRlZENhbGxiYWNrKClcblx0fVxuXHRnZXRDb250ZW50QnlJZChpZCkge1xuXHRcdHJldHVybiB0aGlzLnF1ZXVlLmdldFJlc3VsdChpZClcblx0fVxuXHRnZXRTdmcoaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5nZXRDb250ZW50QnlJZChpZCtcIi1zdmdcIilcblx0fVxuXHRnZXRJbWFnZVVSTChpZCkge1xuXHRcdHJldHVybiB0aGlzLmdldENvbnRlbnRCeUlkKGlkKS5nZXRBdHRyaWJ1dGUoXCJzcmNcIilcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQcmVsb2FkZXJcbiIsImltcG9ydCBkYXRhIGZyb20gJ0dsb2JhbERhdGEnXG5pbXBvcnQgaGFzaGVyIGZyb20gJ2hhc2hlcidcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgY3Jvc3Nyb2FkcyBmcm9tICdjcm9zc3JvYWRzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5jbGFzcyBSb3V0ZXIge1xuXHRpbml0KCkge1xuXHRcdHRoaXMucm91dGluZyA9IGRhdGEucm91dGluZ1xuXHRcdHRoaXMuZGVmYXVsdFJvdXRlID0gdGhpcy5yb3V0aW5nWycvJ11cblx0XHR0aGlzLm5ld0hhc2hGb3VuZGVkID0gZmFsc2Vcblx0XHRoYXNoZXIubmV3SGFzaCA9IHVuZGVmaW5lZFxuXHRcdGhhc2hlci5vbGRIYXNoID0gdW5kZWZpbmVkXG5cdFx0aGFzaGVyLnByZXBlbmRIYXNoID0gJyEnXG5cdFx0aGFzaGVyLmluaXRpYWxpemVkLmFkZCh0aGlzLl9kaWRIYXNoZXJDaGFuZ2UuYmluZCh0aGlzKSlcblx0XHRoYXNoZXIuY2hhbmdlZC5hZGQodGhpcy5fZGlkSGFzaGVyQ2hhbmdlLmJpbmQodGhpcykpXG5cdFx0dGhpcy5fc2V0dXBDcm9zc3JvYWRzKClcblx0fVxuXHRiZWdpblJvdXRpbmcoKSB7XG5cdFx0aGFzaGVyLmluaXQoKVxuXHR9XG5cdF9zZXR1cENyb3Nzcm9hZHMoKSB7XG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHR2YXIgYmFzaWNTZWN0aW9uID0gY3Jvc3Nyb2Fkcy5hZGRSb3V0ZSgne3BhZ2V9JywgdGhpcy5fb25GaXJzdERlZ3JlZVVSTEhhbmRsZXIuYmluZCh0aGlzKSwgMylcblx0XHRiYXNpY1NlY3Rpb24ucnVsZXMgPSB7XG5cdCAgICAgICAgcGFnZSA6IFsnbGFuZGluZyddIC8vdmFsaWQgc2VjdGlvbnNcblx0ICAgIH1cblx0ICAgIHZhciBwbGFuZXRQcm9kdWN0U2VjdGlvbiA9IGNyb3Nzcm9hZHMuYWRkUm91dGUoJy9wbGFuZXQve3BsYW5ldElkfS97cHJvZHVjdElkfScsIHRoaXMuX29uUGxhbmV0UHJvZHVjdFVSTEhhbmRsZXIuYmluZCh0aGlzKSwgMilcblx0ICAgIHBsYW5ldFByb2R1Y3RTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgXHRwbGFuZXRJZDogcGxhbmV0cyxcblx0ICAgIFx0cHJvZHVjdElkIDogL15bMC0yXS9cblx0ICAgIH1cblx0ICAgIHZhciBwbGFuZXRTZWN0aW9uID0gY3Jvc3Nyb2Fkcy5hZGRSb3V0ZSgnL3BsYW5ldC97cGxhbmV0SWR9JywgdGhpcy5fb25QbGFuZXRVUkxIYW5kbGVyLmJpbmQodGhpcyksIDIpXG5cdCAgICBwbGFuZXRTZWN0aW9uLnJ1bGVzID0ge1xuXHQgICAgXHRwbGFuZXRJZDogcGxhbmV0c1xuXHQgICAgfVxuXHR9XG5cdF9vbkZpcnN0RGVncmVlVVJMSGFuZGxlcihwYWdlSWQpIHtcblx0XHR0aGlzLl9hc3NpZ25Sb3V0ZShwYWdlSWQpXG5cdH1cblx0X29uUGxhbmV0UHJvZHVjdFVSTEhhbmRsZXIocGxhbmV0SWQsIHByb2R1Y3RJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHByb2R1Y3RJZClcblx0fVxuXHRfb25QbGFuZXRVUkxIYW5kbGVyKHBsYW5ldElkKSB7XG5cdFx0dGhpcy5fYXNzaWduUm91dGUocGxhbmV0SWQpXG5cdH1cblx0X29uQmxvZ1Bvc3RVUkxIYW5kbGVyKHBvc3RJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHBvc3RJZClcblx0fVxuXHRfb25EZWZhdWx0VVJMSGFuZGxlcigpIHtcblx0XHR0aGlzLl9zZW5kVG9EZWZhdWx0KClcblx0fVxuXHRfYXNzaWduUm91dGUoaWQpIHtcblx0XHR2YXIgaGFzaCA9IGhhc2hlci5nZXRIYXNoKClcblx0XHR2YXIgcGFydHMgPSB0aGlzLl9nZXRVUkxQYXJ0cyhoYXNoKVxuXHRcdHRoaXMuX3VwZGF0ZVBhZ2VSb3V0ZShoYXNoLCBwYXJ0cywgcGFydHNbMF0sIGlkKVxuXHRcdHRoaXMubmV3SGFzaEZvdW5kZWQgPSB0cnVlXG5cdH1cblx0X2dldFVSTFBhcnRzKHVybCkge1xuXHRcdHZhciBoYXNoID0gdXJsXG5cdFx0aGFzaCA9IGhhc2guc3Vic3RyKDEpXG5cdFx0cmV0dXJuIGhhc2guc3BsaXQoJy8nKVxuXHR9XG5cdF91cGRhdGVQYWdlUm91dGUoaGFzaCwgcGFydHMsIHBhcmVudCwgdGFyZ2V0SWQpIHtcblx0XHRoYXNoZXIub2xkSGFzaCA9IGhhc2hlci5uZXdIYXNoXG5cdFx0aGFzaGVyLm5ld0hhc2ggPSB7XG5cdFx0XHRoYXNoOiBoYXNoLFxuXHRcdFx0cGFydHM6IHBhcnRzLFxuXHRcdFx0cGFyZW50OiBwYXJlbnQsXG5cdFx0XHR0YXJnZXRJZDogdGFyZ2V0SWRcblx0XHR9XG5cdFx0QXBwQWN0aW9ucy5wYWdlSGFzaGVyQ2hhbmdlZCgpXG5cdH1cblx0X2RpZEhhc2hlckNoYW5nZShuZXdIYXNoLCBvbGRIYXNoKSB7XG5cdFx0dGhpcy5uZXdIYXNoRm91bmRlZCA9IGZhbHNlXG5cdFx0Y3Jvc3Nyb2Fkcy5wYXJzZShuZXdIYXNoKVxuXHRcdGlmKHRoaXMubmV3SGFzaEZvdW5kZWQpIHJldHVyblxuXHRcdC8vIElmIFVSTCBkb24ndCBtYXRjaCBhIHBhdHRlcm4sIHNlbmQgdG8gZGVmYXVsdFxuXHRcdHRoaXMuX29uRGVmYXVsdFVSTEhhbmRsZXIoKVxuXHR9XG5cdF9zZW5kVG9EZWZhdWx0KCkge1xuXHRcdGhhc2hlci5zZXRIYXNoKEFwcFN0b3JlLmRlZmF1bHRSb3V0ZSgpKVxuXHR9XG5cdHN0YXRpYyBnZXRCYXNlVVJMKCkge1xuXHRcdHJldHVybiBkb2N1bWVudC5VUkwuc3BsaXQoXCIjXCIpWzBdXG5cdH1cblx0c3RhdGljIGdldEhhc2goKSB7XG5cdFx0cmV0dXJuIGhhc2hlci5nZXRIYXNoKClcblx0fVxuXHRzdGF0aWMgZ2V0Um91dGVzKCkge1xuXHRcdHJldHVybiBkYXRhLnJvdXRpbmdcblx0fVxuXHRzdGF0aWMgZ2V0TmV3SGFzaCgpIHtcblx0XHRyZXR1cm4gaGFzaGVyLm5ld0hhc2hcblx0fVxuXHRzdGF0aWMgZ2V0T2xkSGFzaCgpIHtcblx0XHRyZXR1cm4gaGFzaGVyLm9sZEhhc2hcblx0fVxuXHRzdGF0aWMgc2V0SGFzaChoYXNoKSB7XG5cdFx0aGFzaGVyLnNldEhhc2goaGFzaClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBSb3V0ZXJcbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5mdW5jdGlvbiBfZ2V0VGltZWxpbmUoYXJncykge1xuXHR2YXIgdGwgPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdHRsLmV2ZW50Q2FsbGJhY2soXCJvbkNvbXBsZXRlXCIsIGFyZ3Mub25Db21wbGV0ZSlcblx0cmV0dXJuIHRsXG59XG5cbnZhciBUcmFuc2l0aW9uQW5pbWF0aW9ucyA9IHtcblxuXHQvLyBFWFBFUklFTkNFIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0J2V4cGVyaWVuY2UtaW4nOiBmdW5jdGlvbihzY29wZSwgYXJncykge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgdGltZWxpbmUgPSBfZ2V0VGltZWxpbmUoYXJncylcblxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR0aW1lbGluZS5mcm9tKHdyYXBwZXIsIDEsIHsgb3BhY2l0eTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0pXG5cblx0XHRzd2l0Y2godHlwZXMub2xkVHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTp3aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeDp3aW5kb3dXLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeDowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5DQU1QQUlHTjpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdFx0cmV0dXJuIHRpbWVsaW5lXG5cdH0sXG5cdCdleHBlcmllbmNlLW91dCc6IGZ1bmN0aW9uKHNjb3BlLCBhcmdzKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB0aW1lbGluZSA9IF9nZXRUaW1lbGluZShhcmdzKVxuXG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHRpbWVsaW5lLnRvKHdyYXBwZXIsIDEsIHsgb3BhY2l0eTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0pXG5cdFx0XG5cdFx0c3dpdGNoKHR5cGVzLm5ld1R5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHg6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHg6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkNBTVBBSUdOOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTotd2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0XHRyZXR1cm4gdGltZWxpbmVcblx0fSxcblxuXHQvLyBDQU1QQUlHTiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCdjYW1wYWlnbi1pbic6IGZ1bmN0aW9uKHNjb3BlLCBhcmdzKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB0aW1lbGluZSA9IF9nZXRUaW1lbGluZShhcmdzKVxuXG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGltZWxpbmUuZnJvbSh3cmFwcGVyLCAxLCB7IG9wYWNpdHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9KVxuXG5cdFx0c3dpdGNoKHR5cGVzLm9sZFR5cGUpe1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEFORElORzpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6d2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0XHRyZXR1cm4gdGltZWxpbmVcblx0fSxcblx0J2NhbXBhaWduLW91dCc6IGZ1bmN0aW9uKHNjb3BlLCBhcmdzKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB0aW1lbGluZSA9IF9nZXRUaW1lbGluZShhcmdzKVxuXG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGltZWxpbmUudG8od3JhcHBlciwgMSwgeyBvcGFjaXR5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHRcblx0XHRzd2l0Y2godHlwZXMubmV3VHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTp3aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHRcdHJldHVybiB0aW1lbGluZVxuXHR9LFxuXG5cdC8vIExBTkRJTkcgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQnbGFuZGluZy1pbic6IGZ1bmN0aW9uKHNjb3BlLCBhcmdzKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB0aW1lbGluZSA9IF9nZXRUaW1lbGluZShhcmdzKVxuXG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRpbWVsaW5lLmZyb20od3JhcHBlciwgMSwgeyBvcGFjaXR5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblxuXHRcdHN3aXRjaCh0eXBlcy5vbGRUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxBTkRJTkc6XG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuQ0FNUEFJR046XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHRcdHJldHVybiB0aW1lbGluZVxuXHR9LFxuXHQnbGFuZGluZy1vdXQnOiBmdW5jdGlvbihzY29wZSwgYXJncykge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgdGltZWxpbmUgPSBfZ2V0VGltZWxpbmUoYXJncylcblxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR0aW1lbGluZS50byh3cmFwcGVyLCAxLCB7IG9wYWNpdHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9KVxuXHRcdFxuXHRcdHN3aXRjaCh0eXBlcy5uZXdUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0U6XG5cdFx0XHRcdHRpbWVsaW5lLnRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0gsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkNBTVBBSUdOOlxuXHRcdFx0XHR0aW1lbGluZS50byhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dILCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHRcdHJldHVybiB0aW1lbGluZVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRyYW5zaXRpb25BbmltYXRpb25zXG4iLCJpbXBvcnQgQXBwRGlzcGF0Y2hlciBmcm9tICdBcHBEaXNwYXRjaGVyJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQge0V2ZW50RW1pdHRlcjJ9IGZyb20gJ2V2ZW50ZW1pdHRlcjInXG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nXG5pbXBvcnQgZGF0YSBmcm9tICdHbG9iYWxEYXRhJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5cbmZ1bmN0aW9uIF9wYWdlUm91dGVJZENoYW5nZWQoaWQpIHtcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlQ29udGVudCgpIHtcbiAgICB2YXIgc2NvcGUgPSBfZ2V0UGFnZUlkKClcbiAgICB2YXIgbGFuZ0NvbnRlbnQgPSBfZ2V0Q29udGVudEJ5TGFuZyhBcHBTdG9yZS5sYW5nKCkpXG4gICAgdmFyIHBhZ2VDb250ZW50ID0gbGFuZ0NvbnRlbnRbc2NvcGVdXG4gICAgcmV0dXJuIHBhZ2VDb250ZW50XG59XG5mdW5jdGlvbiBfZ2V0UGFnZUlkKCkge1xuICAgIHJldHVybiBfZ2V0Q29udGVudFNjb3BlKCkuaWRcbn1cbmZ1bmN0aW9uIF9nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKCkge1xuICAgIHZhciBuZXdIYXNoZXIgPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG4gICAgdmFyIG9sZEhhc2hlciA9IFJvdXRlci5nZXRPbGRIYXNoKClcbiAgICByZXR1cm4geyBuZXdUeXBlOiBfZ2V0VHlwZU9mUGFnZShuZXdIYXNoZXIpLCBvbGRUeXBlOiBfZ2V0VHlwZU9mUGFnZShvbGRIYXNoZXIpIH1cbn1cbmZ1bmN0aW9uIF9nZXRUeXBlT2ZQYWdlKGhhc2gpIHtcbiAgICB2YXIgaCA9IGhhc2ggfHwgUm91dGVyLmdldE5ld0hhc2goKVxuICAgIGlmKGggPT0gdW5kZWZpbmVkKSByZXR1cm4gQXBwQ29uc3RhbnRzLk5PTkVcbiAgICBpZihoLnBhcnRzLmxlbmd0aCA9PSAzKSByZXR1cm4gQXBwQ29uc3RhbnRzLkNBTVBBSUdOXG4gICAgZWxzZSBpZihoLnBhcnRzLmxlbmd0aCA9PSAyKSByZXR1cm4gQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0VcbiAgICBlbHNlIHJldHVybiBBcHBDb25zdGFudHMuTEFORElOR1xufVxuZnVuY3Rpb24gX2dldENvbnRlbnRTY29wZSgpIHtcbiAgICB2YXIgaGFzaE9iaiA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICB2YXIgcm91dGVTY29wZTtcbiAgICBpZihoYXNoT2JqLnBhcnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgdmFyIHBhcmVudFBhdGggPSBoYXNoT2JqLmhhc2gucmVwbGFjZSgnLycraGFzaE9iai50YXJnZXRJZCwgJycpXG4gICAgICAgIHJvdXRlU2NvcGUgPSBBcHBTdG9yZS5nZXRSb3V0ZVBhdGhTY29wZUJ5SWQocGFyZW50UGF0aClcbiAgICB9ZWxzZXtcbiAgICAgICAgcm91dGVTY29wZSA9IEFwcFN0b3JlLmdldFJvdXRlUGF0aFNjb3BlQnlJZChoYXNoT2JqLmhhc2gpXG4gICAgfVxuICAgIHJldHVybiByb3V0ZVNjb3BlXG59XG5mdW5jdGlvbiBfZ2V0UGFnZUFzc2V0c1RvTG9hZCgpIHtcbiAgICB2YXIgc2NvcGUgPSBfZ2V0Q29udGVudFNjb3BlKClcbiAgICB2YXIgaGFzaE9iaiA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICB2YXIgdGFyZ2V0SWQ7XG4gICAgdmFyIHR5cGUgPSBfZ2V0VHlwZU9mUGFnZSgpXG4gICAgdGFyZ2V0SWQgPSB0eXBlLnRvTG93ZXJDYXNlKCkgKyAnLWFzc2V0cydcbiAgICB2YXIgbWFuaWZlc3QgPSBfYWRkQmFzZVBhdGhzVG9VcmxzKHNjb3BlW3RhcmdldElkXSwgc2NvcGUuaWQsIHRhcmdldElkLCB0eXBlKVxuICAgIHJldHVybiBtYW5pZmVzdFxufVxuZnVuY3Rpb24gX2FkZEJhc2VQYXRoc1RvVXJscyh1cmxzLCBwYWdlSWQsIHRhcmdldElkLCB0eXBlKSB7XG4gICAgdmFyIGJhc2VQYXRoID0gX2dldFBhZ2VBc3NldHNCYXNlUGF0aEJ5SWQocGFnZUlkLCB0YXJnZXRJZClcbiAgICB2YXIgbWFuaWZlc3QgPSBbXVxuICAgIGlmKHVybHMgPT0gdW5kZWZpbmVkIHx8IHVybHMubGVuZ3RoIDwgMSkgcmV0dXJuIG1hbmlmZXN0XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB1cmxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzcGxpdHRlciA9IHVybHNbaV0uc3BsaXQoJy4nKVxuICAgICAgICB2YXIgZmlsZU5hbWUgPSBzcGxpdHRlclswXVxuICAgICAgICB2YXIgZXh0ZW5zaW9uID0gc3BsaXR0ZXJbMV1cbiAgICAgICAgbWFuaWZlc3RbaV0gPSB7XG4gICAgICAgICAgICBpZDogcGFnZUlkICsgJy0nICsgdHlwZS50b0xvd2VyQ2FzZSgpICsgJy0nICsgZmlsZU5hbWUsXG4gICAgICAgICAgICBzcmM6IGJhc2VQYXRoICsgZmlsZU5hbWUgKyAnLicgKyBleHRlbnNpb25cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWFuaWZlc3Rcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlQXNzZXRzQmFzZVBhdGhCeUlkKGlkLCBhc3NldEdyb3VwSWQpIHtcbiAgICByZXR1cm4gQXBwU3RvcmUuYmFzZU1lZGlhUGF0aCgpICsgJy9pbWFnZS9wbGFuZXRzLycgKyBpZCArICcvJyArIGFzc2V0R3JvdXBJZCArICcvJ1xufVxuZnVuY3Rpb24gX2dldE1lbnVDb250ZW50KCkge1xuICAgIHJldHVybiBkYXRhLm1lbnVcbn1cbmZ1bmN0aW9uIF9nZXRDb250ZW50QnlMYW5nKGxhbmcpIHtcbiAgICByZXR1cm4gZGF0YS5sYW5nW2xhbmddXG59XG5mdW5jdGlvbiBfZ2V0R2VuZXJhbEluZm9zKCkge1xuICAgIHJldHVybiBkYXRhLmluZm9zLmxhbmdbQXBwU3RvcmUubGFuZygpXVxufVxuZnVuY3Rpb24gX2dldEFwcERhdGEoKSB7XG4gICAgcmV0dXJuIGRhdGFcbn1cbmZ1bmN0aW9uIF9nZXREZWZhdWx0Um91dGUoKSB7XG4gICAgcmV0dXJuIGRhdGFbJ2RlZmF1bHQtcm91dGUnXVxufVxuZnVuY3Rpb24gX2dldEdsb2JhbENvbnRlbnQoKSB7XG4gICAgdmFyIGxhbmdDb250ZW50ID0gX2dldENvbnRlbnRCeUxhbmcoQXBwU3RvcmUubGFuZygpKVxuICAgIHJldHVybiBsYW5nQ29udGVudFsnZ2xvYmFsJ11cbn1cbmZ1bmN0aW9uIF93aW5kb3dXaWR0aEhlaWdodCgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB3OiB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgaDogd2luZG93LmlubmVySGVpZ2h0XG4gICAgfVxufVxudmFyIEFwcFN0b3JlID0gYXNzaWduKHt9LCBFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSwge1xuICAgIGVtaXRDaGFuZ2U6IGZ1bmN0aW9uKHR5cGUsIGl0ZW0pIHtcbiAgICAgICAgdGhpcy5lbWl0KHR5cGUsIGl0ZW0pXG4gICAgfSxcbiAgICBwYWdlQ29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0UGFnZUNvbnRlbnQoKVxuICAgIH0sXG4gICAgbWVudUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldE1lbnVDb250ZW50KClcbiAgICB9LFxuICAgIGNvdW50cmllczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmNvdW50cmllc1xuICAgIH0sXG4gICAgYXBwRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0QXBwRGF0YSgpXG4gICAgfSxcbiAgICBsYW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEpTX2xhbmdcbiAgICB9LFxuICAgIGRlZmF1bHRSb3V0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0RGVmYXVsdFJvdXRlKClcbiAgICB9LFxuICAgIGdsb2JhbENvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2dldEdsb2JhbENvbnRlbnQoKVxuICAgIH0sXG4gICAgZ2VuZXJhbEluZm9zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuaW5mb3NcbiAgICB9LFxuICAgIGdlbmVyYWxJbmZvc0xhbmdTY29wZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0R2VuZXJhbEluZm9zKClcbiAgICB9LFxuICAgIG1haW5JbWFnZVVybDogZnVuY3Rpb24oaWQsIHJlc3BvbnNpdmVBcnJheSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuYmFzZU1lZGlhUGF0aCgpICsgJy9pbWFnZS9wbGFuZXRzLycgKyBpZCArICcvbWFpbi0nICsgQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlV2lkdGgocmVzcG9uc2l2ZUFycmF5KSArICcuanBnJ1xuICAgIH0sXG4gICAgYmFzZU1lZGlhUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5nZXRFbnZpcm9ubWVudCgpLnN0YXRpY1xuICAgIH0sXG4gICAgZ2V0Um91dGVQYXRoU2NvcGVCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gZGF0YS5yb3V0aW5nW2lkXVxuICAgIH0sXG4gICAgZ2V0UGFnZUlkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRQYWdlSWQoKVxuICAgIH0sXG4gICAgZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG4gICAgfSxcbiAgICBnZXRUeXBlT2ZQYWdlOiBmdW5jdGlvbihoYXNoKSB7XG4gICAgICAgIHJldHVybiBfZ2V0VHlwZU9mUGFnZShoYXNoKVxuICAgIH0sXG4gICAgZ2V0RW52aXJvbm1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwQ29uc3RhbnRzLkVOVklST05NRU5UU1tFTlZdXG4gICAgfSxcbiAgICBnZXRMaW5lV2lkdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gM1xuICAgIH0sXG4gICAgcGFnZUFzc2V0c1RvTG9hZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0UGFnZUFzc2V0c1RvTG9hZCgpXG4gICAgfSxcbiAgICByZXNwb25zaXZlSW1hZ2VXaWR0aDogZnVuY3Rpb24ocmVzcG9uc2l2ZUFycmF5KSB7XG4gICAgICAgIHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93LndcbiAgICAgICAgcmV0dXJuIFV0aWxzLkNsb3Nlc3QocmVzcG9uc2l2ZUFycmF5LCB3aW5kb3dXKVxuICAgIH0sXG4gICAgcmVzcG9uc2l2ZUltYWdlU2l6ZTogZnVuY3Rpb24ocmVzcG9uc2l2ZUFycmF5LCBiYXNlV2lkdGgsIGJhc2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIGJhc2VXID0gYmFzZVdpZHRoIHx8IEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfV1xuICAgICAgICB2YXIgYmFzZUggPSBiYXNlSGVpZ2h0IHx8IEFwcENvbnN0YW50cy5NRURJQV9HTE9CQUxfSFxuICAgICAgICB2YXIgcmVzcG9uc2l2ZVdpZHRoID0gQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlV2lkdGgocmVzcG9uc2l2ZUFycmF5KVxuICAgICAgICB2YXIgc2NhbGUgPSAocmVzcG9uc2l2ZVdpZHRoIC8gYmFzZVcpICogMVxuICAgICAgICB2YXIgcmVzcG9uc2l2ZUhlaWdodCA9IGJhc2VIICogc2NhbGVcbiAgICAgICAgcmV0dXJuIFsgcmVzcG9uc2l2ZVdpZHRoLCByZXNwb25zaXZlSGVpZ2h0IF1cbiAgICB9LFxuICAgIHBsYW5ldHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGF0YS5wbGFuZXRzXG4gICAgfSxcbiAgICBlbGVtZW50c09mTmF0dXJlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuZWxlbWVudHNcbiAgICB9LFxuICAgIGFsbEdlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLmdlbmRlclxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGFbJ3Byb2R1Y3RzLWRhdGEnXVxuICAgIH0sXG4gICAgcHJvZHVjdHNEYXRhQnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGEoKVxuICAgICAgICByZXR1cm4gZGF0YVtpZF1cbiAgICB9LFxuICAgIFdpbmRvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfd2luZG93V2lkdGhIZWlnaHQoKVxuICAgIH0sXG4gICAgYWRkUFhDaGlsZDogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBBcHBTdG9yZS5QWENvbnRhaW5lci5hZGQoaXRlbS5jaGlsZClcbiAgICB9LFxuICAgIHJlbW92ZVBYQ2hpbGQ6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgQXBwU3RvcmUuUFhDb250YWluZXIucmVtb3ZlKGl0ZW0uY2hpbGQpXG4gICAgfSxcbiAgICBnZXRUaW1lbGluZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldFRpbWVsaW5lKClcbiAgICB9LFxuICAgIHJlbGVhc2VUaW1lbGluZTogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlVGltZWxpbmUoaXRlbSlcbiAgICB9LFxuICAgIGdldENvbnRhaW5lcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldENvbnRhaW5lcigpXG4gICAgfSxcbiAgICByZWxlYXNlQ29udGFpbmVyOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VDb250YWluZXIoaXRlbSlcbiAgICB9LFxuICAgIGdldEdyYXBoaWNzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wuZ2V0R3JhcGhpY3MoKVxuICAgIH0sXG4gICAgcmVsZWFzZUdyYXBoaWNzOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VHcmFwaGljcyhpdGVtKVxuICAgIH0sXG4gICAgZ2V0U3ByaXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wuZ2V0U3ByaXRlKClcbiAgICB9LFxuICAgIHJlbGVhc2VTcHJpdGU6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVNwcml0ZShpdGVtKVxuICAgIH0sXG4gICAgZ2V0U3ByaW5nR2FyZGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wuZ2V0U3ByaW5nR2FyZGVuKClcbiAgICB9LFxuICAgIHJlbGVhc2VTcHJpbmdHYXJkZW46IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVNwcmluZ0dhcmRlbihpdGVtKVxuICAgIH0sXG4gICAgUG9vbDogdW5kZWZpbmVkLFxuICAgIE1vdXNlOiB1bmRlZmluZWQsXG4gICAgUFhDb250YWluZXI6IHVuZGVmaW5lZCxcbiAgICBPcmllbnRhdGlvbjogQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSxcbiAgICBkaXNwYXRjaGVySW5kZXg6IEFwcERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCl7XG4gICAgICAgIHZhciBhY3Rpb24gPSBwYXlsb2FkLmFjdGlvblxuICAgICAgICBzd2l0Y2goYWN0aW9uLmFjdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQ6XG4gICAgICAgICAgICAgICAgX3BhZ2VSb3V0ZUlkQ2hhbmdlZChhY3Rpb24uaXRlbSlcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5lbWl0Q2hhbmdlKGFjdGlvbi5hY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFOlxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy53ID0gYWN0aW9uLml0ZW0ud2luZG93V1xuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy5oID0gYWN0aW9uLml0ZW0ud2luZG93SFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLk9yaWVudGF0aW9uID0gKEFwcFN0b3JlLldpbmRvdy53ID4gQXBwU3RvcmUuV2luZG93LmgpID8gQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSA6IEFwcENvbnN0YW50cy5QT1JUUkFJVFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9JU19SRUFEWTpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5QWENvbnRhaW5lciA9IGFjdGlvbi5pdGVtXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb24uYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0FERF9DSElMRDpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5hZGRQWENoaWxkKGFjdGlvbi5pdGVtKVxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQ6XG4gICAgICAgICAgICAgICAgQXBwU3RvcmUucmVtb3ZlUFhDaGlsZChhY3Rpb24uaXRlbSlcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5lbWl0Q2hhbmdlKGFjdGlvbi5hY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH0pXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IEFwcFN0b3JlXG5cbiIsImltcG9ydCBpcyBmcm9tICdpcyc7XG5cbmZ1bmN0aW9uIGdldEFsbE1ldGhvZHMob2JqKSB7XG5cdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopXG5cdFx0LmZpbHRlcihrZXkgPT4gaXMuZm4ob2JqW2tleV0pKVxufVxuXG5mdW5jdGlvbiBhdXRvQmluZChvYmopIHtcblx0Ly8gY29uc29sZS5sb2coJ29iaiAtLS0tLScsIG9iailcbiAgXHRnZXRBbGxNZXRob2RzKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG5cdFx0LmZvckVhY2gobXRkID0+IHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKG10ZClcblx0XHRcdG9ialttdGRdID0gb2JqW210ZF0uYmluZChvYmopO1xuXHRcdH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGF1dG9CaW5kOyIsImNsYXNzIFV0aWxzIHtcblx0c3RhdGljIE5vcm1hbGl6ZU1vdXNlQ29vcmRzKGUsIG9ialdyYXBwZXIpIHtcblx0XHR2YXIgcG9zeCA9IDA7XG5cdFx0dmFyIHBvc3kgPSAwO1xuXHRcdGlmICghZSkgdmFyIGUgPSB3aW5kb3cuZXZlbnQ7XG5cdFx0aWYgKGUucGFnZVggfHwgZS5wYWdlWSkgXHR7XG5cdFx0XHRwb3N4ID0gZS5wYWdlWDtcblx0XHRcdHBvc3kgPSBlLnBhZ2VZO1xuXHRcdH1cblx0XHRlbHNlIGlmIChlLmNsaWVudFggfHwgZS5jbGllbnRZKSBcdHtcblx0XHRcdHBvc3ggPSBlLmNsaWVudFggKyBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnRcblx0XHRcdFx0KyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdDtcblx0XHRcdHBvc3kgPSBlLmNsaWVudFkgKyBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcFxuXHRcdFx0XHQrIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XG5cdFx0fVxuXHRcdG9ialdyYXBwZXIueCA9IHBvc3hcblx0XHRvYmpXcmFwcGVyLnkgPSBwb3N5XG5cdFx0cmV0dXJuIG9ialdyYXBwZXJcblx0fVxuXHRzdGF0aWMgUmVzaXplUG9zaXRpb25Qcm9wb3J0aW9uYWxseSh3aW5kb3dXLCB3aW5kb3dILCBjb250ZW50VywgY29udGVudEgpIHtcblx0XHR2YXIgYXNwZWN0UmF0aW8gPSBjb250ZW50VyAvIGNvbnRlbnRIXG5cdFx0dmFyIHNjYWxlID0gKCh3aW5kb3dXIC8gd2luZG93SCkgPCBhc3BlY3RSYXRpbykgPyAod2luZG93SCAvIGNvbnRlbnRIKSAqIDEgOiAod2luZG93VyAvIGNvbnRlbnRXKSAqIDFcblx0XHR2YXIgbmV3VyA9IGNvbnRlbnRXICogc2NhbGVcblx0XHR2YXIgbmV3SCA9IGNvbnRlbnRIICogc2NhbGVcblx0XHR2YXIgY3NzID0ge1xuXHRcdFx0d2lkdGg6IG5ld1csXG5cdFx0XHRoZWlnaHQ6IG5ld0gsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtIChuZXdXID4+IDEpLFxuXHRcdFx0dG9wOiAod2luZG93SCA+PiAxKSAtIChuZXdIID4+IDEpLFxuXHRcdFx0c2NhbGU6IHNjYWxlXG5cdFx0fVxuXHRcdHJldHVybiBjc3Ncblx0fVxuXHRzdGF0aWMgUmVzaXplUG9zaXRpb25Qcm9wb3J0aW9uYWxseVdpdGhBbmNob3JDZW50ZXIod2luZG93Vywgd2luZG93SCwgY29udGVudFcsIGNvbnRlbnRIKSB7XG5cdFx0dmFyIGFzcGVjdFJhdGlvID0gY29udGVudFcgLyBjb250ZW50SFxuXHRcdHZhciBzY2FsZSA9ICgod2luZG93VyAvIHdpbmRvd0gpIDwgYXNwZWN0UmF0aW8pID8gKHdpbmRvd0ggLyBjb250ZW50SCkgKiAxIDogKHdpbmRvd1cgLyBjb250ZW50VykgKiAxXG5cdFx0dmFyIG5ld1cgPSBjb250ZW50VyAqIHNjYWxlXG5cdFx0dmFyIG5ld0ggPSBjb250ZW50SCAqIHNjYWxlXG5cdFx0dmFyIGNzcyA9IHtcblx0XHRcdHdpZHRoOiBuZXdXLFxuXHRcdFx0aGVpZ2h0OiBuZXdILFxuXHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSksXG5cdFx0XHR0b3A6ICh3aW5kb3dIID4+IDEpLFxuXHRcdFx0c2NhbGU6IHNjYWxlXG5cdFx0fVxuXHRcdHJldHVybiBjc3Ncblx0fVxuXHRzdGF0aWMgUmFuZChtaW4sIG1heCkge1xuXHRcdHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW5cblx0fVxuXHRzdGF0aWMgRGVncmVlc1RvUmFkaWFucyhkZWdyZWVzKSB7XG5cdFx0cmV0dXJuIGRlZ3JlZXMgKiAoTWF0aC5QSSAvIDE4MClcblx0fVxuICAgIHN0YXRpYyBSYWRpYW5zVG9EZWdyZWVzKHJhZGlhbnMpIHtcbiAgICAgICAgcmV0dXJuIHJhZGlhbnMgKiAoMTgwIC8gTWF0aC5QSSlcbiAgICB9XG4gICAgc3RhdGljIExpbWl0KHYsIG1pbiwgbWF4KSB7XG4gICAgXHRyZXR1cm4gKE1hdGgubWluKG1heCwgTWF0aC5tYXgobWluLCB2KSkpO1xuICAgIH1cblx0c3RhdGljIENsb3Nlc3QoYXJyYXksIG51bSkge1xuICAgICAgICB2YXIgaT0wO1xuXHQgICAgdmFyIG1pbkRpZmY9MjAwMDtcblx0ICAgIHZhciBhbnM7XG5cdCAgICBmb3IoaSBpbiBhcnJheSl7XG5cdFx0XHR2YXIgbT1NYXRoLmFicyhudW0tYXJyYXlbaV0pO1xuXHRcdFx0aWYobTxtaW5EaWZmKXsgXG5cdFx0XHRcdG1pbkRpZmY9bTsgXG5cdFx0XHRcdGFucz1hcnJheVtpXTsgXG5cdFx0XHR9XG5cdFx0fVxuXHQgICAgcmV0dXJuIGFucztcbiAgICB9XG4gICAgc3RhdGljIFNwcmluZ1RvKGl0ZW0sIHRvWCwgdG9ZLCBpbmRleCwgc3ByaW5nLCBmcmljdGlvbiwgc3ByaW5nTGVuZ3RoKSB7XG4gICAgXHR2YXIgZHggPSB0b1ggLSBpdGVtLnhcbiAgICBcdHZhciBkeSA9IHRvWSAtIGl0ZW0ueVxuXHRcdHZhciBhbmdsZSA9IE1hdGguYXRhbjIoZHksIGR4KVxuXHRcdHZhciB0YXJnZXRYID0gdG9YIC0gTWF0aC5jb3MoYW5nbGUpICogKHNwcmluZ0xlbmd0aCAqIGluZGV4KVxuXHRcdHZhciB0YXJnZXRZID0gdG9ZIC0gTWF0aC5zaW4oYW5nbGUpICogKHNwcmluZ0xlbmd0aCAqIGluZGV4KVxuXHRcdGl0ZW0udnggKz0gKHRhcmdldFggLSBpdGVtLngpICogc3ByaW5nXG5cdFx0aXRlbS52eSArPSAodGFyZ2V0WSAtIGl0ZW0ueSkgKiBzcHJpbmdcblx0XHRpdGVtLnZ4ICo9IGZyaWN0aW9uXG5cdFx0aXRlbS52eSAqPSBmcmljdGlvblxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVXRpbHNcbiIsImNsYXNzIFZlYzIge1xuXHRjb25zdHJ1Y3Rvcih4LCB5KSB7XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRkaXN0YW5jZVRvKHYpIHtcblx0XHRyZXR1cm4gTWF0aC5zcXJ0KCB0aGlzLmRpc3RhbmNlVG9TcXVhcmVkKCB2ICkgKVxuXHR9XG5cdGRpc3RhbmNlVG9TcXVhcmVkKHYpIHtcblx0XHR2YXIgZHggPSB0aGlzLnggLSB2LngsIGR5ID0gdGhpcy55IC0gdi55O1xuXHRcdHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBWZWMyXG4iLCIvLyBodHRwOi8vcGF1bGlyaXNoLmNvbS8yMDExL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtYW5pbWF0aW5nL1xuLy8gaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xuIFxuLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxuIFxuLy8gTUlUIGxpY2Vuc2VcbiBcbihmdW5jdGlvbigpIHtcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgIHZhciB2ZW5kb3JzID0gWydtcycsICdtb3onLCAnd2Via2l0JywgJ28nXTtcbiAgICBmb3IodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsreCkge1xuICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgIH1cbiBcbiAgICBpZiAoIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCkge1xuICAgICAgICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcbiAgICAgICAgICAgIHZhciBpZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LCBcbiAgICAgICAgICAgICAgdGltZVRvQ2FsbCk7XG4gICAgICAgICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfTtcbiBcbiAgICBpZiAoIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSlcbiAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChpZCk7XG4gICAgICAgIH07XG59KCkpOyIsImltcG9ydCBGbHV4IGZyb20gJ2ZsdXgnXG5pbXBvcnQge0V2ZW50RW1pdHRlcjJ9IGZyb20gJ2V2ZW50ZW1pdHRlcjInXG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nXG5cbi8vIEFjdGlvbnNcbnZhciBQYWdlckFjdGlvbnMgPSB7XG4gICAgb25QYWdlUmVhZHk6IGZ1bmN0aW9uKGhhc2gpIHtcbiAgICAgICAgUGFnZXJEaXNwYXRjaGVyLmhhbmRsZVBhZ2VyQWN0aW9uKHtcbiAgICAgICAgXHR0eXBlOiBQYWdlckNvbnN0YW50cy5QQUdFX0lTX1JFQURZLFxuICAgICAgICBcdGl0ZW06IGhhc2hcbiAgICAgICAgfSkgIFxuICAgIH0sXG4gICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgIFx0UGFnZXJEaXNwYXRjaGVyLmhhbmRsZVBhZ2VyQWN0aW9uKHtcbiAgICAgICAgXHR0eXBlOiBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFLFxuICAgICAgICBcdGl0ZW06IHVuZGVmaW5lZFxuICAgICAgICB9KSAgXG4gICAgfSxcbiAgICBwYWdlVHJhbnNpdGlvbkRpZEZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgICAgIFBhZ2VyRGlzcGF0Y2hlci5oYW5kbGVQYWdlckFjdGlvbih7XG4gICAgICAgIFx0dHlwZTogUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0gsXG4gICAgICAgIFx0aXRlbTogdW5kZWZpbmVkXG4gICAgICAgIH0pICBcbiAgICB9XG59XG5cbi8vIENvbnN0YW50c1xudmFyIFBhZ2VyQ29uc3RhbnRzID0ge1xuXHRQQUdFX0lTX1JFQURZOiAnUEFHRV9JU19SRUFEWScsXG5cdFBBR0VfVFJBTlNJVElPTl9JTjogJ1BBR0VfVFJBTlNJVElPTl9JTicsXG5cdFBBR0VfVFJBTlNJVElPTl9PVVQ6ICdQQUdFX1RSQU5TSVRJT05fT1VUJyxcblx0UEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURTogJ1BBR0VfVFJBTlNJVElPTl9PVVRfQ09NUExFVEUnLFxuXHRQQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1M6ICdQQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1MnLFxuXHRQQUdFX1RSQU5TSVRJT05fRElEX0ZJTklTSDogJ1BBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIJyxcbn1cblxuLy8gRGlzcGF0Y2hlclxudmFyIFBhZ2VyRGlzcGF0Y2hlciA9IGFzc2lnbihuZXcgRmx1eC5EaXNwYXRjaGVyKCksIHtcblx0aGFuZGxlUGFnZXJBY3Rpb246IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdHRoaXMuZGlzcGF0Y2goYWN0aW9uKVxuXHR9XG59KVxuXG4vLyBTdG9yZVxudmFyIFBhZ2VyU3RvcmUgPSBhc3NpZ24oe30sIEV2ZW50RW1pdHRlcjIucHJvdG90eXBlLCB7XG4gICAgZmlyc3RQYWdlVHJhbnNpdGlvbjogdHJ1ZSxcbiAgICBwYWdlVHJhbnNpdGlvblN0YXRlOiB1bmRlZmluZWQsIFxuICAgIGRpc3BhdGNoZXJJbmRleDogUGFnZXJEaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpe1xuICAgICAgICB2YXIgYWN0aW9uVHlwZSA9IHBheWxvYWQudHlwZVxuICAgICAgICB2YXIgaXRlbSA9IHBheWxvYWQuaXRlbVxuICAgICAgICBzd2l0Y2goYWN0aW9uVHlwZSkge1xuICAgICAgICAgICAgY2FzZSBQYWdlckNvbnN0YW50cy5QQUdFX0lTX1JFQURZOlxuICAgICAgICAgICAgXHRQYWdlclN0b3JlLnBhZ2VUcmFuc2l0aW9uU3RhdGUgPSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU5fUFJPR1JFU1NcbiAgICAgICAgICAgIFx0dmFyIHR5cGUgPSBQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24gPyBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fSU4gOiBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VUXG4gICAgICAgICAgICBcdFBhZ2VyU3RvcmUuZW1pdCh0eXBlKVxuICAgICAgICAgICAgXHRicmVha1xuICAgICAgICAgICAgY2FzZSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFOlxuICAgICAgICAgICAgXHR2YXIgdHlwZSA9IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9JTlxuICAgICAgICAgICAgXHRQYWdlclN0b3JlLmVtaXQodHlwZSlcbiAgICAgICAgICAgIFx0YnJlYWtcbiAgICAgICAgICAgIGNhc2UgUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0g6XG4gICAgICAgICAgICBcdGlmIChQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24pIFBhZ2VyU3RvcmUuZmlyc3RQYWdlVHJhbnNpdGlvbiA9IGZhbHNlXG4gICAgICAgICAgICAgICAgUGFnZXJTdG9yZS5wYWdlVHJhbnNpdGlvblN0YXRlID0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0hcbiAgICAgICAgICAgICAgICBQYWdlclN0b3JlLmVtaXQoYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgfSlcbn0pXG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0UGFnZXJTdG9yZTogUGFnZXJTdG9yZSxcblx0UGFnZXJBY3Rpb25zOiBQYWdlckFjdGlvbnMsXG5cdFBhZ2VyQ29uc3RhbnRzOiBQYWdlckNvbnN0YW50cyxcblx0UGFnZXJEaXNwYXRjaGVyOiBQYWdlckRpc3BhdGNoZXJcbn1cbiIsImltcG9ydCBhdXRvYmluZCBmcm9tICdBdXRvYmluZCdcbmltcG9ydCBzbHVnIGZyb20gJ3RvLXNsdWctY2FzZSdcblxuY2xhc3MgQmFzZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdGF1dG9iaW5kKHRoaXMpXG5cdFx0dGhpcy5kb21Jc1JlYWR5ID0gZmFsc2Vcblx0fVxuXHRjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5kb21Jc1JlYWR5ID0gdHJ1ZVxuXHR9XG5cdHJlbmRlcihjaGlsZElkLCBwYXJlbnRJZCwgdGVtcGxhdGUsIG9iamVjdCkge1xuXHRcdHRoaXMuY29tcG9uZW50V2lsbE1vdW50KClcblx0XHR0aGlzLmNoaWxkSWQgPSBjaGlsZElkXG5cdFx0dGhpcy5wYXJlbnRJZCA9IHBhcmVudElkXG5cdFx0dGhpcy5wYXJlbnQgPSAocGFyZW50SWQgaW5zdGFuY2VvZiBqUXVlcnkpID8gcGFyZW50SWQgOiAkKHRoaXMucGFyZW50SWQpXG5cdFx0dGhpcy5jaGlsZCA9ICh0ZW1wbGF0ZSA9PSB1bmRlZmluZWQpID8gJCgnPGRpdj48L2Rpdj4nKSA6ICQodGVtcGxhdGUob2JqZWN0KSlcblx0XHRpZih0aGlzLmNoaWxkLmF0dHIoJ2lkJykgPT0gdW5kZWZpbmVkKSB0aGlzLmNoaWxkLmF0dHIoJ2lkJywgc2x1ZyhjaGlsZElkKSlcblx0XHR0aGlzLmNoaWxkLnJlYWR5KHRoaXMuY29tcG9uZW50RGlkTW91bnQpXG5cdFx0dGhpcy5wYXJlbnQuYXBwZW5kKHRoaXMuY2hpbGQpXG5cdH1cblx0cmVtb3ZlKCkge1xuXHRcdHRoaXMuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuY2hpbGQucmVtb3ZlKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBCYXNlQ29tcG9uZW50XG5cbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQgVHJhbnNpdGlvbkFuaW1hdGlvbnMgZnJvbSAnVHJhbnNpdGlvbkFuaW1hdGlvbnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJhc2VQYWdlIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMucHJvcHMgPSBwcm9wc1xuXHRcdHRoaXMuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUgPSB0aGlzLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlLmJpbmQodGhpcylcblx0XHR0aGlzLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSA9IHRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlLmJpbmQodGhpcylcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnJlc2l6ZSgpXG5cdFx0dGhpcy5zZXR1cEFuaW1hdGlvbnMoKVxuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wcm9wcy5pc1JlYWR5KHRoaXMucHJvcHMuaGFzaCksIDApXG5cdH1cblx0c2V0dXBBbmltYXRpb25zKCkge1xuXHRcdHZhciBrZXlOYW1lID0gdGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkgKyAnLWluJ1xuXHRcdHRoaXMudGxJbiA9IFRyYW5zaXRpb25BbmltYXRpb25zW2tleU5hbWVdKHRoaXMsIHtvbkNvbXBsZXRlOnRoaXMuZGlkVHJhbnNpdGlvbkluQ29tcGxldGV9KVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uSW4oKSB7XG5cdFx0dGhpcy50bEluLnBsYXkoMClcblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0XHR2YXIga2V5TmFtZSA9IHRoaXMucHJvcHMudHlwZS50b0xvd2VyQ2FzZSgpICsgJy1vdXQnXG5cdFx0dGhpcy50bE91dCA9IFRyYW5zaXRpb25BbmltYXRpb25zW2tleU5hbWVdKHRoaXMsIHtvbkNvbXBsZXRlOnRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlfSlcblx0XHR0aGlzLnRsT3V0LnBsYXkoMClcblx0fVxuXHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucHJvcHMuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSwgMClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLnByb3BzLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpLCAwKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0fVxuXHRmb3JjZVVubW91bnQoKSB7XG5cdFx0aWYodGhpcy50bEluICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy50bEluLnBhdXNlKDApXG5cdFx0fVxuXHRcdGlmKHRoaXMudGxPdXQgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsT3V0LnBhdXNlKDApXG5cdFx0fVxuXHRcdHRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLnRsSW4gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsSW4uY2xlYXIoKVxuXHRcdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxJbilcblx0XHR9XG5cdFx0aWYodGhpcy50bE91dCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMudGxPdXQuY2xlYXIoKVxuXHRcdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdXQpXG5cdFx0fVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IHtQYWdlclN0b3JlLCBQYWdlckFjdGlvbnMsIFBhZ2VyQ29uc3RhbnRzLCBQYWdlckRpc3BhdGNoZXJ9IGZyb20gJ1BhZ2VyJ1xuaW1wb3J0IF9jYXBpdGFsaXplIGZyb20gJ2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICdQYWdlc0NvbnRhaW5lcl9oYnMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmNsYXNzIEJhc2VQYWdlciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5jdXJyZW50UGFnZURpdlJlZiA9ICdwYWdlLWInXG5cdFx0dGhpcy53aWxsUGFnZVRyYW5zaXRpb25JbiA9IHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uSW4uYmluZCh0aGlzKVxuXHRcdHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0ID0gdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlID0gdGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSA9IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy5jb21wb25lbnRzID0ge1xuXHRcdFx0J25ldy1jb21wb25lbnQnOiB1bmRlZmluZWQsXG5cdFx0XHQnb2xkLWNvbXBvbmVudCc6IHVuZGVmaW5lZFxuXHRcdH1cblx0fVxuXHRyZW5kZXIocGFyZW50KSB7XG5cdFx0c3VwZXIucmVuZGVyKCdCYXNlUGFnZXInLCBwYXJlbnQsIHRlbXBsYXRlLCB1bmRlZmluZWQpXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdFBhZ2VyU3RvcmUub24oUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOLCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluKVxuXHRcdFBhZ2VyU3RvcmUub24oUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX09VVCwgdGhpcy53aWxsUGFnZVRyYW5zaXRpb25PdXQpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHR3aWxsUGFnZVRyYW5zaXRpb25JbigpIHtcblx0XHRpZihQYWdlclN0b3JlLmZpcnN0UGFnZVRyYW5zaXRpb24pIHtcblx0XHRcdHRoaXMuc3dpdGNoUGFnZXNEaXZJbmRleCgpXG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXS53aWxsVHJhbnNpdGlvbkluKClcblx0XHR9XG5cdH1cblx0d2lsbFBhZ2VUcmFuc2l0aW9uT3V0KCkge1xuXHRcdHRoaXMuY29tcG9uZW50c1snb2xkLWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uT3V0KClcblx0XHR0aGlzLnN3aXRjaFBhZ2VzRGl2SW5kZXgoKVxuXHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddLndpbGxUcmFuc2l0aW9uSW4oKVxuXHR9XG5cdGRpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlJylcblx0XHRQYWdlckFjdGlvbnMucGFnZVRyYW5zaXRpb25EaWRGaW5pc2goKVxuXHRcdHRoaXMudW5tb3VudENvbXBvbmVudCgnb2xkLWNvbXBvbmVudCcpXG5cdH1cblx0ZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZScpXG5cdFx0UGFnZXJBY3Rpb25zLm9uVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRzd2l0Y2hQYWdlc0RpdkluZGV4KCkge1xuXHRcdHZhciBuZXdDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHRcdHZhciBvbGRDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXVxuXHRcdGlmKG5ld0NvbXBvbmVudCAhPSB1bmRlZmluZWQpIG5ld0NvbXBvbmVudC5jaGlsZC5jc3MoJ3otaW5kZXgnLCAyKVxuXHRcdGlmKG9sZENvbXBvbmVudCAhPSB1bmRlZmluZWQpIG9sZENvbXBvbmVudC5jaGlsZC5jc3MoJ3otaW5kZXgnLCAxKVxuXHR9XG5cdHNldHVwTmV3Q29tcG9uZW50KGhhc2gsIHRlbXBsYXRlKSB7XG5cdFx0dmFyIGlkID0gX2NhcGl0YWxpemUoaGFzaC5yZXBsYWNlKFwiL1wiLCBcIlwiKSlcblx0XHR0aGlzLm9sZFBhZ2VEaXZSZWYgPSB0aGlzLmN1cnJlbnRQYWdlRGl2UmVmXG5cdFx0dGhpcy5jdXJyZW50UGFnZURpdlJlZiA9ICh0aGlzLmN1cnJlbnRQYWdlRGl2UmVmID09PSAncGFnZS1hJykgPyAncGFnZS1iJyA6ICdwYWdlLWEnXG5cdFx0dmFyIGVsID0gdGhpcy5jaGlsZC5maW5kKCcjJyt0aGlzLmN1cnJlbnRQYWdlRGl2UmVmKVxuXHRcdHZhciBwcm9wcyA9IHtcblx0XHRcdGlkOiB0aGlzLmN1cnJlbnRQYWdlRGl2UmVmLFxuXHRcdFx0aXNSZWFkeTogdGhpcy5vblBhZ2VSZWFkeSxcblx0XHRcdHR5cGU6IEFwcFN0b3JlLmdldFR5cGVPZlBhZ2UoKSxcblx0XHRcdGhhc2g6IGhhc2gsXG5cdFx0XHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZTogdGhpcy5kaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUsXG5cdFx0XHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGU6IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25PdXRDb21wbGV0ZSxcblx0XHRcdGRhdGE6IEFwcFN0b3JlLnBhZ2VDb250ZW50KClcblx0XHR9XG5cdFx0dmFyIHBhZ2UgPSBuZXcgdGVtcGxhdGUudHlwZShwcm9wcylcblx0XHRwYWdlLmlkID0gQXBwU3RvcmUuZ2V0UGFnZUlkKClcblx0XHRwYWdlLnJlbmRlcihpZCwgZWwsIHRlbXBsYXRlLnBhcnRpYWwsIHByb3BzLmRhdGEpXG5cdFx0dGhpcy5jb21wb25lbnRzWydvbGQtY29tcG9uZW50J10gPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHRcdHRoaXMuY29tcG9uZW50c1snbmV3LWNvbXBvbmVudCddID0gcGFnZVxuXHRcdGlmKFBhZ2VyU3RvcmUucGFnZVRyYW5zaXRpb25TdGF0ZSA9PT0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOX1BST0dSRVNTKSB7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXS5mb3JjZVVubW91bnQoKVxuXHRcdH1cblx0fVxuXHRvblBhZ2VSZWFkeShoYXNoKSB7XG5cdFx0UGFnZXJBY3Rpb25zLm9uUGFnZVJlYWR5KGhhc2gpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVubW91bnRDb21wb25lbnQocmVmKSB7XG5cdFx0aWYodGhpcy5jb21wb25lbnRzW3JlZl0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5jb21wb25lbnRzW3JlZl0ucmVtb3ZlKClcblx0XHR9XG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0UGFnZXJTdG9yZS5vZmYoUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOLCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluKVxuXHRcdFBhZ2VyU3RvcmUub2ZmKFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9PVVQsIHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0KVxuXHRcdHRoaXMudW5tb3VudENvbXBvbmVudCgnb2xkLWNvbXBvbmVudCcpXG5cdFx0dGhpcy51bm1vdW50Q29tcG9uZW50KCduZXctY29tcG9uZW50Jylcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZVBhZ2VyXG5cbiIsIm1vZHVsZS5leHBvcnRzPXtcblx0XCJpbmZvc1wiOiB7XG5cdFx0XCJ0d2l0dGVyX3VybFwiOiBcImh0dHA6Ly90d2l0dGVyLmNvbVwiLFxuXHRcdFwiZmFjZWJvb2tfdXJsXCI6IFwiaHR0cDovL2ZhY2Vib29rLmNvbVwiLFxuXHRcdFwiaW5zdGFncmFtX3VybFwiOiBcImh0dHA6Ly9pbnN0YWdyYW0uY29tXCIsXG5cdFx0XCJsYW5nXCI6IHtcblx0XHRcdFwiZW5cIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCJcblx0XHRcdH0sXG5cdFx0XHRcImZyXCI6IHtcblx0XHRcdFx0XCJjb3VudHJpZXNcIjoge1xuXHRcdFx0XHRcdFwiR0JSXCI6IFwiZW5nbGlzaFwiLFxuXHRcdFx0XHRcdFwiRlJBXCI6IFwiZnJlbmNoXCIsXG5cdFx0XHRcdFx0XCJFU1BcIjogXCJzcGFuaXNoXCIsXG5cdFx0XHRcdFx0XCJJVEFcIjogXCJpdGFsaWFuXCIsXG5cdFx0XHRcdFx0XCJERVVcIjogXCJnZXJtYW5cIixcblx0XHRcdFx0XHRcIlBSVFwiOiBcInBvcnR1Z2VzZVwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibGVnYWxcIjogXCJsZWdhbFwiLFxuXHRcdFx0XHRcImxlZ2FsX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYlwiOiBcImNhbXBlciBsYWJcIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF90aXRsZVwiOiBcInNob3BcIixcblx0XHRcdFx0XCJzaG9wX21lblwiOiBcIm1hblwiLFxuXHRcdFx0XHRcInNob3BfbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF93b21lblwiOiBcIndvbWFuXCIsXG5cdFx0XHRcdFwic2hvcF93b21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcInBsYW5ldFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJlc1wiOiB7XG5cdFx0XHRcdFwiY291bnRyaWVzXCI6IHtcblx0XHRcdFx0XHRcIkdCUlwiOiBcImVuZ2xpc2hcIixcblx0XHRcdFx0XHRcIkZSQVwiOiBcImZyZW5jaFwiLFxuXHRcdFx0XHRcdFwiRVNQXCI6IFwic3BhbmlzaFwiLFxuXHRcdFx0XHRcdFwiSVRBXCI6IFwiaXRhbGlhblwiLFxuXHRcdFx0XHRcdFwiREVVXCI6IFwiZ2VybWFuXCIsXG5cdFx0XHRcdFx0XCJQUlRcIjogXCJwb3J0dWdlc2VcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImxlZ2FsXCI6IFwibGVnYWxcIixcblx0XHRcdFx0XCJsZWdhbF91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJcIjogXCJjYW1wZXIgbGFiXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3BfdGl0bGVcIjogXCJzaG9wXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5cIjogXCJtYW5cIixcblx0XHRcdFx0XCJzaG9wX21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5cIjogXCJ3b21hblwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJwbGFuZXRcIjogXCJwbGFuZXRcIlxuXHRcdFx0fSxcblx0XHRcdFwiaXRcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCJcblx0XHRcdH0sXG5cdFx0XHRcImRlXCI6IHtcblx0XHRcdFx0XCJjb3VudHJpZXNcIjoge1xuXHRcdFx0XHRcdFwiR0JSXCI6IFwiZW5nbGlzaFwiLFxuXHRcdFx0XHRcdFwiRlJBXCI6IFwiZnJlbmNoXCIsXG5cdFx0XHRcdFx0XCJFU1BcIjogXCJzcGFuaXNoXCIsXG5cdFx0XHRcdFx0XCJJVEFcIjogXCJpdGFsaWFuXCIsXG5cdFx0XHRcdFx0XCJERVVcIjogXCJnZXJtYW5cIixcblx0XHRcdFx0XHRcIlBSVFwiOiBcInBvcnR1Z2VzZVwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibGVnYWxcIjogXCJsZWdhbFwiLFxuXHRcdFx0XHRcImxlZ2FsX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYlwiOiBcImNhbXBlciBsYWJcIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF90aXRsZVwiOiBcInNob3BcIixcblx0XHRcdFx0XCJzaG9wX21lblwiOiBcIm1hblwiLFxuXHRcdFx0XHRcInNob3BfbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF93b21lblwiOiBcIndvbWFuXCIsXG5cdFx0XHRcdFwic2hvcF93b21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcInBsYW5ldFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJwdFwiOiB7XG5cdFx0XHRcdFwiY291bnRyaWVzXCI6IHtcblx0XHRcdFx0XHRcIkdCUlwiOiBcImVuZ2xpc2hcIixcblx0XHRcdFx0XHRcIkZSQVwiOiBcImZyZW5jaFwiLFxuXHRcdFx0XHRcdFwiRVNQXCI6IFwic3BhbmlzaFwiLFxuXHRcdFx0XHRcdFwiSVRBXCI6IFwiaXRhbGlhblwiLFxuXHRcdFx0XHRcdFwiREVVXCI6IFwiZ2VybWFuXCIsXG5cdFx0XHRcdFx0XCJQUlRcIjogXCJwb3J0dWdlc2VcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImxlZ2FsXCI6IFwibGVnYWxcIixcblx0XHRcdFx0XCJsZWdhbF91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJcIjogXCJjYW1wZXIgbGFiXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3BfdGl0bGVcIjogXCJzaG9wXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5cIjogXCJtYW5cIixcblx0XHRcdFx0XCJzaG9wX21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5cIjogXCJ3b21hblwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJwbGFuZXRcIjogXCJwbGFuZXRcIlxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRcImNvdW50cmllc1wiOiBbXG5cdFx0e1xuXHRcdFx0XCJpZFwiOiBcIkdCUlwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZW5cIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIkZSQVwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZnJcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIkVTUFwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZXNcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIklUQVwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiaXRcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIkRFVVwiLFxuXHRcdFx0XCJsYW5nXCI6IFwiZGVcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH0se1xuXHRcdFx0XCJpZFwiOiBcIlBSVFwiLFxuXHRcdFx0XCJsYW5nXCI6IFwicHRcIixcblx0XHRcdFwidXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIlxuXHRcdH1cblx0XSxcblx0XCJwbGFuZXRzXCI6IFtcInNraVwiLCBcIm1ldGFsXCIsIFwiYWxhc2thXCIsIFwid29vZFwiLCBcImdlbXN0b25lXCJdLFxuXHRcImVsZW1lbnRzXCI6IFtcImZpcmVcIiwgXCJlYXJ0aFwiLCBcIm1ldGFsXCIsIFwid2F0ZXJcIiwgXCJ3b29kXCJdLFxuXHRcImdlbmRlclwiOiBbXCJtYWxlXCIsIFwiZmVtYWxlXCIsIFwiYW5pbWFsXCJdLFxuXG5cdFwicHJvZHVjdHMtZGF0YVwiOiB7XG5cdFx0XCJza2lcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDc1YjdmY1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjM2ZiNjNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjMsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMxZmJhZFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjotMC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XSxcblx0XHRcIm1ldGFsXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg3NWI3ZmNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YzNmYjYzXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNCwgXCJ5XCI6MC43fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjMWZiYWRcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF0sXG5cdFx0XCJhbGFza2FcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDc1YjdmY1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMiwgXCJ5XCI6MC4zfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjM2ZiNjNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMxZmJhZFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMxZmJhZFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjF9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwid29vZFwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NzViN2ZjXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMzZmI2M1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4YzFmYmFkXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOi0wLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwiZ2Vtc3RvbmVcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDc1YjdmY1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMiwgXCJ5XCI6MC4zfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6MC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjM2ZiNjNcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweGMxZmJhZFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuM30sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjR9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cblx0XCJsYW5nXCI6IHtcblx0XHRcImVuXCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXJcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXJcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJsYW5kaW5nIHBhZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwic2tpIHBhZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJtZXRhbCBwYWdlXCJcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImFsYXNrYSBwYWdlXCJcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJ3b29kIHBhZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJnZW1zdG9uZSBwYWdlXCJcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiZnJcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBmclwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBmclwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImxhbmRpbmcgcGFnZSBmclwiXG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJza2kgcGFnZSBmclwiXG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIm1ldGFsIHBhZ2UgZnJcIlxuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiYWxhc2thIHBhZ2UgZnJcIlxuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIndvb2QgcGFnZSBmclwiXG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImdlbXN0b25lIHBhZ2UgZnJcIlxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJlc1wiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGVzXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGVzXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibGFuZGluZyBwYWdlIGVzXCJcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcInNraSBwYWdlIGVzXCJcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibWV0YWwgcGFnZSBlc1wiXG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJhbGFza2EgcGFnZSBlc1wiXG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwid29vZCBwYWdlIGVzXCJcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiZ2Vtc3RvbmUgcGFnZSBlc1wiXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcIml0XCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgaXRcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgaXRcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJsYW5kaW5nIHBhZ2UgaXRcIlxuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwic2tpIHBhZ2UgaXRcIlxuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJtZXRhbCBwYWdlIGl0XCJcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImFsYXNrYSBwYWdlIGl0XCJcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJ3b29kIHBhZ2UgaXRcIlxuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJnZW1zdG9uZSBwYWdlIGl0XCJcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiZGVcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBnZVwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBnZVwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImxhbmRpbmcgcGFnZSBnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJza2kgcGFnZSBnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIm1ldGFsIHBhZ2UgZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiYWxhc2thIHBhZ2UgZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIndvb2QgcGFnZSBnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImdlbXN0b25lIHBhZ2UgZ2VcIlxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJwdFwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIHB0XCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIHB0XCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibGFuZGluZyBwYWdlIHB0XCJcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcInNraSBwYWdlIHB0XCJcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibWV0YWwgcGFnZSBwdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJhbGFza2EgcGFnZSBwdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwid29vZCBwYWdlIHB0XCJcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiZ2Vtc3RvbmUgcGFnZSBwdFwiXG5cdFx0XHR9XG5cdFx0fSxcblx0fSxcblxuXHRcImRlZmF1bHQtcm91dGVcIjogXCIvbGFuZGluZ1wiLFxuXG5cdFwicm91dGluZ1wiOiB7XG5cdFx0XCIvbGFuZGluZ1wiOiB7XG5cdFx0XHRcImlkXCI6IFwibGFuZGluZ1wiXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvc2tpXCI6IHtcblx0XHRcdFwiaWRcIjogXCJza2lcIixcblx0XHRcdFwiZXhwZXJpZW5jZS1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvbWV0YWxcIjoge1xuXHRcdFx0XCJpZFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XSxcblx0XHRcdFwiY2FtcGFpZ24tYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L2FsYXNrYVwiOiB7XG5cdFx0XHRcImlkXCI6IFwiYWxhc2thXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XSxcblx0XHRcdFwiY2FtcGFpZ24tYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCIvcGxhbmV0L3dvb2RcIjoge1xuXHRcdFx0XCJpZFwiOiBcIndvb2RcIixcblx0XHRcdFwiZXhwZXJpZW5jZS1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XCJpZFwiOiBcImdlbXN0b25lXCIsXG5cdFx0XHRcImV4cGVyaWVuY2UtYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XSxcblx0XHRcdFwiY2FtcGFpZ24tYXNzZXRzXCI6IFtcblx0XHRcdFx0XCJidW5ueS5wbmdcIlxuXHRcdFx0XVxuXHRcdH1cblx0fVxufSJdfQ==
