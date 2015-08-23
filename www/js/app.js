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

			var mobilecheck = function mobilecheck() {
				var check = false;
				(function (a) {
					if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
				})(navigator.userAgent || navigator.vendor || window.opera);
				return check;
			};

			_AppStore2['default'].Detector.isMobile = mobilecheck();
			console.log(_AppStore2['default'].Detector);

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
			var margin = 22;
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

			this.tlOver.to(knotsEl[0], 1, { x: -6, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOver.to(knotsEl[1], 1, { x: -6, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOver.to(knotsEl[2], 1, { x: -6, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOver.to(linesEl[0], 1, { scaleX: 1.1, x: -6, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
			this.tlOver.to(linesEl[1], 1, { scaleX: 1.1, x: -6, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
			this.tlOver.to(linesEl[2], 1, { x: -6, rotation: '10deg', force3D: true, transformOrigin: '0% 100%', ease: Elastic.easeOut }, 0);
			this.tlOver.to(linesEl[3], 1, { x: -6, rotation: '-10deg', force3D: true, transformOrigin: '0% 0%', ease: Elastic.easeOut }, 0);
			this.tlOver.to(knotsEl[3], 1, { x: -3, y: 2, force3D: true, ease: Elastic.easeOut }, 0);
			this.tlOver.to(knotsEl[4], 1, { x: -3, y: -2, force3D: true, ease: Elastic.easeOut }, 0);

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
				compass.positionElement(compass.posX + (windowW >> 1) - (totalW >> 1), windowH - biggestRadius - windowH * 0.15);
			}

			this.container.position.x = (windowW >> 1) - (totalW >> 1);
			this.container.position.y = windowH - biggestRadius - windowH * 0.15;
			this.y = this.container.position.y;
			this.height = biggestRadius;
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
	}, {
		key: 'didHasherChange',
		value: function didHasherChange() {
			var pageId = _AppStore2['default'].getPageId();
			var palette = _AppStore2['default'].paletteColorsById(pageId);
			if (palette != undefined) this.renderer.backgroundColor = palette[0];
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

var _RectangleBtn = require('./RectangleBtn');

var _RectangleBtn2 = _interopRequireDefault(_RectangleBtn);

var _TitleSwitcher = require('./TitleSwitcher');

var _TitleSwitcher2 = _interopRequireDefault(_TitleSwitcher);

var _wheel = require('wheel');

var _wheelInertia = require('wheel-inertia');

var _wheelInertia2 = _interopRequireDefault(_wheelInertia);

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
		this.isInVideo = false;
		this.timeoutTime = 900;
	}

	_createClass(PlanetCampaignPage, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.animations = {
				oldContainerAnimation: undefined,
				newContainerAnimation: undefined
			};

			this.products = _AppStore2['default'].productsDataById(this.id);

			var infos = _AppStore2['default'].generalInfosLangScope();
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

			this.arrowClicked = this.arrowClicked.bind(this);
			this.onDownClicked = this.onDownClicked.bind(this);
			this.onBuyClicked = this.onBuyClicked.bind(this);
			this.onPlanetClicked = this.onPlanetClicked.bind(this);

			this.previousBtn = new _ArrowBtn2['default'](this.child.find('.previous-btn'), _AppConstants2['default'].LEFT);
			this.previousBtn.btnClicked = this.arrowClicked;
			this.previousBtn.componentDidMount();
			this.nextBtn = new _ArrowBtn2['default'](this.child.find('.next-btn'), _AppConstants2['default'].RIGHT);
			this.nextBtn.btnClicked = this.arrowClicked;
			this.nextBtn.componentDidMount();
			this.downBtn = new _ArrowBtn2['default'](this.child.find('.down-btn'), _AppConstants2['default'].BOTTOM);
			this.downBtn.btnClicked = this.onDownClicked;
			this.downBtn.componentDidMount();

			this.buyBtn = new _RectangleBtn2['default'](this.child.find('.buy-btn'), infos.buy_title);
			this.buyBtn.btnClicked = this.onBuyClicked;
			this.buyBtn.componentDidMount();

			this.planetBtn = new _RectangleBtn2['default'](this.child.find('.planet-btn'), this.id);
			this.planetBtn.btnClicked = this.onPlanetClicked;
			this.planetBtn.componentDidMount();

			this.productTitle = new _TitleSwitcher2['default'](this.child.find('.product-title-wrapper'));
			this.productTitle.componentDidMount();

			// this.compass = new Compass(this.pxContainer, AppConstants.CAMPAIGN)
			// this.compass.knotRadius = AppConstants.SMALL_KNOT_RADIUS
			// this.compass.componentDidMount()

			this.onWheel = this.onWheel.bind(this);
			(0, _wheel.addWheelListener)(this.child.get(0), this.onWheel);
			_wheelInertia2['default'].addCallback(this.onInertia);

			this.checkCurrentProductByUrl();
			$(document).on('keydown', this.onKeyPressed);

			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'componentDidMount', this).call(this);
		}
	}, {
		key: 'onInertia',
		value: function onInertia(direction) {
			this.onDownClicked();
		}
	}, {
		key: 'onWheel',
		value: function onWheel(e) {
			e.preventDefault();
			var delta = e.wheelDelta;
			_wheelInertia2['default'].update(delta);
		}
	}, {
		key: 'onPlanetClicked',
		value: function onPlanetClicked() {
			var url = "/planet/" + this.id;
			_Router2['default'].setHash(url);
		}
	}, {
		key: 'onDownClicked',
		value: function onDownClicked() {
			var _this = this;

			if (this.animationRunning) return;
			this.animationRunning = true;
			var windowH = _AppStore2['default'].Window.h;
			if (this.isInVideo) {
				this.isInVideo = false;
				TweenMax.to(this.currentContainer.el, 1, { y: 0, force3D: true, ease: Expo.easeInOut });
				TweenMax.to(this.downBtn.element, 1, { rotation: '-90deg', force3D: true, ease: Expo.easeInOut });
			} else {
				this.isInVideo = true;
				TweenMax.to(this.currentContainer.el, 1, { y: -windowH, force3D: true, ease: Expo.easeInOut });
				TweenMax.to(this.downBtn.element, 1, { rotation: '90deg', force3D: true, ease: Expo.easeInOut });
			}
			clearTimeout(this.videoAssignTimeout);
			setTimeout(function () {
				_this.animationRunning = false;
			}, this.timeoutTime);
			if (this.currentContainer.videoIsAdded != true) {
				this.videoAssignTimeout = setTimeout(function () {
					_this.assignVideoToNewContainer();
				}, this.timeoutTime);
			}
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
			switch (direction) {
				case _AppConstants2['default'].LEFT:
					this.previous();
					break;
				case _AppConstants2['default'].RIGHT:
					this.next();
					break;
			}
			this.updateHasher();
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
				case 38:
					// up
					this.onDownClicked();
					break;
				case 40:
					// down
					this.onDownClicked();
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
			var imgSrc = _AppStore2['default'].getEnvironment()['static'] + '/image/planets/' + this.id + '/' + productScope['id'] + '-XL' + '.jpg';
			this.currentContainer.posterImg.attr('src', imgSrc);
			this.productTitle.update(productScope.name);
		}
	}, {
		key: 'assignVideoToNewContainer',
		value: function assignVideoToNewContainer() {
			var videoId = 136080598;
			var iframeStr = '<iframe src="https://player.vimeo.com/video/' + videoId + '?title=0&byline=0&portrait=0" width="100%" height="100%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
			this.currentContainer.videoWrapper.html(iframeStr);
			this.currentContainer.videoIsAdded = true;
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
				_this2.productTitle.show();
			}, 200);

			setTimeout(function () {
				_this2.animationRunning = false;
				_this2.removePreviousContainerAssets();
			}, this.timeoutTime);
			clearTimeout(this.videoAssignTimeout);
			if (this.isInVideo) {
				this.videoAssignTimeout = setTimeout(function () {
					_this2.assignVideoToNewContainer();
				}, this.timeoutTime);
			}
		}
	}, {
		key: 'removePreviousContainerAssets',
		value: function removePreviousContainerAssets() {
			if (this.previousContainer == undefined) return;
			this.previousContainer.videoWrapper.html('');
			this.currentContainer.videoIsAdded = false;
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
			this.posterImgCss = {
				width: imageResize.width,
				height: imageResize.height,
				top: windowH * 0.51 - (imageResize.height >> 1),
				left: (windowW >> 1) - (imageResize.width >> 1)
			};
			var videoCss = {
				width: videoResize.width,
				height: videoResize.height,
				top: windowH + windowH * 0.51 - (videoResize.height >> 1),
				left: (windowW >> 1) - (videoResize.width >> 1)
			};
			if (this.isInVideo) TweenMax.set(this.currentContainer.el, { y: -windowH });else TweenMax.set(this.currentContainer.el, { y: 0 });
			if (this.previousContainer != undefined) this.previousContainer.el.css('z-index', 1);
			this.currentContainer.el.css('z-index', 2);
			this.currentContainer.posterWrapper.css(this.posterImgCss);
			this.currentContainer.videoWrapper.css(videoCss);
		}
	}, {
		key: 'updateTopButtonsPositions',
		value: function updateTopButtonsPositions() {
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.productTitle.position((windowW >> 1) - (this.productTitle.width >> 1), (this.posterImgCss.top >> 1) - this.productTitle.height * 0.4);
			this.planetBtn.position(this.productTitle.x - this.planetBtn.width - (_AppConstants2['default'].PADDING_AROUND << 1), this.productTitle.y);
			this.buyBtn.position(this.productTitle.x + this.productTitle.width + (_AppConstants2['default'].PADDING_AROUND << 1), this.productTitle.y);
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

			this.previousBtn.position((this.posterImgCss.left >> 1) - (this.previousBtn.width >> 1) - 4, (windowH >> 1) - (this.previousBtn.width >> 1));
			this.nextBtn.position(this.posterImgCss.left + this.posterImgCss.width + (windowW - (this.posterImgCss.left + this.posterImgCss.width) >> 1) - (this.nextBtn.width >> 1) + 4, (windowH >> 1) - (this.previousBtn.height >> 1));
			this.downBtn.position((windowW >> 1) - (this.downBtn.width >> 1), this.posterImgCss.top + this.posterImgCss.height + (windowH - (this.posterImgCss.top + this.posterImgCss.height) >> 1) - (this.downBtn.height >> 1));

			this.updateTopButtonsPositions();

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
			clearTimeout(this.videoAssignTimeout);
			(0, _wheel.removeWheelListener)(this.child.get(0), this.onWheel);
			_wheelInertia2['default'].addCallback(null);
			// this.compass.componentWillUnmount()
			this.previousBtn.componentWillUnmount();
			this.nextBtn.componentWillUnmount();
			this.downBtn.componentWillUnmount();
			this.buyBtn.componentWillUnmount();
			this.planetBtn.componentWillUnmount();
			_get(Object.getPrototypeOf(PlanetCampaignPage.prototype), 'componentWillUnmount', this).call(this);
		}
	}]);

	return PlanetCampaignPage;
})(_BasePlanetPage3['default']);

exports['default'] = PlanetCampaignPage;
module.exports = exports['default'];

},{"./../actions/AppActions":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/actions/AppActions.js","./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../services/Router":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/services/Router.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./ArrowBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/ArrowBtn.js","./BasePlanetPage":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/BasePlanetPage.js","./RectangleBtn":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/RectangleBtn.js","./TitleSwitcher":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/TitleSwitcher.js","wheel":"wheel","wheel-inertia":"wheel-inertia"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/PlanetExperiencePage.js":[function(require,module,exports){
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

			this.compassesContainer = new _CompassesContainer2['default'](this.pxContainer, this.child);
			this.compassesContainer.id = this.id;
			this.compassesContainer.componentDidMount();

			var XpClazz = this.getExperienceById(this.id);
			this.experience = new XpClazz();
			this.experience.componentDidMount();

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
	function RectangleBtn(element, titleTxt) {
		_classCallCheck(this, RectangleBtn);

		this.element = element;
		this.titleTxt = titleTxt;
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
			titleEl.text(this.titleTxt);

			setTimeout(function () {

				var titleW = titleEl.width();
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
				_this.tlOver.to(linesEl[0], 1, { scaleX: 1.1, y: -3, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				_this.tlOver.to(linesEl[1], 1, { scaleY: 1.1, x: 3, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				_this.tlOver.to(linesEl[2], 1, { scaleX: 1.1, y: 3, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);
				_this.tlOver.to(linesEl[3], 1, { scaleY: 1.1, x: -3, force3D: true, transformOrigin: '50% 50%', ease: Elastic.easeOut }, 0);

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

				_this.rollover = _this.rollover.bind(_this);
				_this.rollout = _this.rollout.bind(_this);
				_this.click = _this.click.bind(_this);
				_this.element.on('mouseenter', _this.rollover);
				_this.element.on('mouseleave', _this.rollout);
				_this.element.on('click', _this.click);
			}, 0);
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			TweenMax.set(this.element, { x: x, y: y, force3D: true });
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
		value: function rollout(e) {
			e.preventDefault();
			this.tlOver.kill();
			this.tlOut.play(0);
		}
	}, {
		key: 'rollover',
		value: function rollover(e) {
			e.preventDefault();
			this.tlOut.kill();
			this.tlOver.play(0);
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

	return RectangleBtn;
})();

exports['default'] = RectangleBtn;
module.exports = exports['default'];

},{"./../constants/AppConstants":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/constants/AppConstants.js","./../stores/AppStore":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/stores/AppStore.js","./../utils/Utils":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/utils/Utils.js","./Knot":"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/Knot.js"}],"/Users/panagiotisthomoglou/Projects/camper/src/js/app/components/SmallCompass.js":[function(require,module,exports){
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

var TitleSwitcher = (function () {
	function TitleSwitcher(element) {
		_classCallCheck(this, TitleSwitcher);

		this.element = element;
	}

	_createClass(TitleSwitcher, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
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
				_this.width = currentTitleW;
			}, 0);
		}
	}, {
		key: 'position',
		value: function position(x, y) {
			TweenMax.set(this.element, { x: x, y: y, force3D: true });
			this.x = x;
			this.y = y;
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {}
	}]);

	return TitleSwitcher;
})();

exports['default'] = TitleSwitcher;
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
			var windowW = _AppStore2['default'].Window.w;
			var mouseX = _AppStore2['default'].Mouse.x;
			this.landingSlideshow.update();
			this.compass.update();

			// if(mouseX < windowW * 0.25) {
			// 	this.direction = AppConstants.LEFT
			// 	// this.arrowLeft.rollover()
			// }else if(mouseX > windowW * 0.75) {
			// 	this.direction = AppConstants.RIGHT
			// 	// this.arrowRight.rollover()
			// }else{
			// 	this.direction = AppConstants.NONE
			// 	// this.arrowLeft.rollout()
			// 	// this.arrowRight.rollout()
			// }
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
			var windowW = _AppStore2['default'].Window.w;
			var windowH = _AppStore2['default'].Window.h;
			this.landingSlideshow.resize();
			this.compass.resize();

			this.compass.position(windowW >> 1, (windowH >> 1) - windowH * 0.05);

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

			this.previousArea.off('click', this.arrowClicked);
			this.nextArea.off('click', this.arrowClicked);
			this.previousArea.off('mouseenter', this.arrowMouseEnter);
			this.nextArea.off('mouseenter', this.arrowMouseEnter);
			this.previousArea.off('mouseleave', this.arrowMouseLeave);
			this.nextArea.off('mouseleave', this.arrowMouseLeave);

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
	LANDING_NORMAL_SLIDE_PERCENTAGE: 0.24,

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

  return "<div class='page-wrapper'>\n	<div class=\"interface\">\n		<div class=\"previous-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"next-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"down-btn dots-arrow-btn btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"buy-btn dots-rectangle-btn btn\">\n			<div class=\"btn-title\"></div>\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"planet-btn dots-rectangle-btn btn\">\n			<div class=\"btn-title\"></div>\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"product-title-wrapper\">\n			<div class=\"product-title title-a\"></div>\n			<div class=\"product-title title-b\"></div>\n		</div>\n	</div>\n\n	<div class=\"product-containers-wrapper\">\n		<div class=\"product-container product-container-a\">\n			<div class=\"poster-wrapper\">\n				<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n			</div>\n			<div class=\"video-wrapper\">\n			</div>\n		</div>\n		<div class=\"product-container product-container-b\">\n			<div class=\"poster-wrapper\">\n				<img src=\""
    + alias3(((helper = (helper = helpers['empty-image'] || (depth0 != null ? depth0['empty-image'] : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"empty-image","hash":{},"data":data}) : helper)))
    + "\">\n			</div>\n			<div class=\"video-wrapper\">\n			</div>\n		</div>\n	</div>\n</div>";
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
module.exports = HandlebarsCompiler.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class='page-wrapper'>\n	<div class=\"slideshow-title\">\n		<div class=\"planet-title\">PLANET</div>\n		<div class=\"planet-name\">GEMSTONE</div>\n	</div>\n	<div class=\"interface\">\n\n		<div id=\"left\" class=\"previous-area area-btn\"></div>\n		<div id=\"right\" class=\"next-area area-btn\"></div>\n\n		<div class=\"previous-btn dots-arrow-btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n		<div class=\"next-btn dots-arrow-btn\">\n			<svg>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\"/>\n				<line class=\"line\"/>\n				<circle class=\"knot\" />\n				<circle class=\"knot\" />\n				<line class=\"line\" />\n				<line class=\"line\" />\n			</svg>\n		</div>\n	</div>\n</div>";
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
                    if (newHasher.parts.length == 3 && oldHasher.parts.length == 3 && newHasher.parts[1] == oldHasher.parts[1]) {
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
				"campaign_title": "campaign"
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
				"campaign_title": "campaign"
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
				"campaign_title": "campaign"
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
				"campaign_title": "campaign"
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
				"campaign_title": "campaign"
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
				"campaign_title": "campaign"
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
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "FISS",
				"color": "0x7b7b7d",
				"knots": [
					{"x":-0.3, "y":-0.6},
					{"x":-0.6, "y":0.4},
					{"x":-0.4, "y":0.7}
				]
			},{
				"id": 2,
				"name": "FISS",
				"color": "0xe7e33c",
				"knots": [
					{"x":0.3, "y":-0.1},
					{"x":0.6, "y":-0.4},
					{"x":0.6, "y":-0.6}
				]
			},{
				"id": 3,
				"name": "FISS",
				"color": "0xdb3076",
				"knots": [
					{"x":-0.3, "y":-0.1},
					{"x":-0.6, "y":-0.4},
					{"x":-0.6, "y":-0.6}
				]
			},{
				"id": 4,
				"name": "FISS",
				"color": "0x4073da",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			}
		],
		"metal": [
			{
				"id": 0,
				"name": "BELUGA",
				"color": "0x0f0f11",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "HARDWOOD",
				"color": "0xe82b18",
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
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "pelotas",
				"color": "0xc98e94",
				"knots": [
					{"x":0.3, "y":-0.6},
					{"x":0.6, "y":0.4},
					{"x":0.4, "y":0.7}
				]
			},{
				"id": 2,
				"name": "ENDURO",
				"color": "0x616a71",
				"knots": [
					{"x":-0.3, "y":0.1},
					{"x":-0.6, "y":-0.1},
					{"x":-0.6, "y":-0.6}
				]
			},{
				"id": 3,
				"name": "ENDURO",
				"color": "0x0e2e61",
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
				"color": "0x5b2f24",
				"knots": [
					{"x":0.3, "y":0.1},
					{"x":0.6, "y":0.4},
					{"x":0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "BELUGA",
				"color": "0x88a2c7",
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
				"color": "0x3a3b6b",
				"knots": [
					{"x":-0.2, "y":0.3},
					{"x":-0.6, "y":0.4},
					{"x":-0.6, "y":0.6}
				]
			},{
				"id": 1,
				"name": "ENDURO",
				"color": "0x62a8bb",
				"knots": [
					{"x":0.3, "y":-0.6},
					{"x":0.6, "y":0.4},
					{"x":0.4, "y":0.7}
				]
			},{
				"id": 2,
				"name": "gemma",
				"color": "0x477e93",
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmx1eC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L2xpYi9EaXNwYXRjaGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvbGliL2ludmFyaWFudC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9TdHJpbmcvY2FwaXRhbGl6ZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvYmFzZVRvU3RyaW5nLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9NYWluLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvQXBwVGVtcGxhdGUuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9hY3Rpb25zL0FwcEFjdGlvbnMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Fycm93QnRuLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9CYXNlUGxhbmV0UGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzcy5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvQ29tcGFzc1JpbmdzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Db21wYXNzZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL0Zyb250Q29udGFpbmVyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9Lbm90LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9MYW5kaW5nU2xpZGVzaG93LmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9QWENvbnRhaW5lci5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGFnZXNDb250YWluZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1BsYW5ldENhbXBhaWduUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvUGxhbmV0RXhwZXJpZW5jZVBhZ2UuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1JlY3RhbmdsZUJ0bi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL2NvbXBvbmVudHMvU21hbGxDb21wYXNzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9TcHJpbmdHYXJkZW4uanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL1RpdGxlU3dpdGNoZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL0FsYXNrYVhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9CYXNlWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL0dlbVN0b25lWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL01ldGFsWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL2V4cGVyaWVuY2VzL1NraVhQLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvY29tcG9uZW50cy9leHBlcmllbmNlcy9Xb29kWFAuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb21wb25lbnRzL3BhZ2VzL0xhbmRpbmcuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9jb25zdGFudHMvQXBwQ29uc3RhbnRzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvZGlzcGF0Y2hlcnMvQXBwRGlzcGF0Y2hlci5qcyIsInNyYy9qcy9hcHAvcGFydGlhbHMvRnJvbnRDb250YWluZXIuaGJzIiwic3JjL2pzL2FwcC9wYXJ0aWFscy9QYWdlc0NvbnRhaW5lci5oYnMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL1BsYW5ldENhbXBhaWduUGFnZS5oYnMiLCJzcmMvanMvYXBwL3BhcnRpYWxzL1BsYW5ldEV4cGVyaWVuY2VQYWdlLmhicyIsInNyYy9qcy9hcHAvcGFydGlhbHMvcGFnZXMvTGFuZGluZy5oYnMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9HbG9iYWxFdmVudHMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zZXJ2aWNlcy9Qb29sLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvc2VydmljZXMvUHJlbG9hZGVyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvc2VydmljZXMvUm91dGVyLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvc2VydmljZXMvVHJhbnNpdGlvbkFuaW1hdGlvbnMuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC9zdG9yZXMvQXBwU3RvcmUuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL2FwcC91dGlscy9BdXRvYmluZC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3V0aWxzL1V0aWxzLmpzIiwiL1VzZXJzL3BhbmFnaW90aXN0aG9tb2dsb3UvUHJvamVjdHMvY2FtcGVyL3NyYy9qcy9hcHAvdXRpbHMvVmVjMi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvYXBwL3V0aWxzL3JhZi5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvcGFnZXIvUGFnZXIuanMiLCIvVXNlcnMvcGFuYWdpb3Rpc3Rob21vZ2xvdS9Qcm9qZWN0cy9jYW1wZXIvc3JjL2pzL3BhZ2VyL2NvbXBvbmVudHMvQmFzZUNvbXBvbmVudC5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvcGFnZXIvY29tcG9uZW50cy9CYXNlUGFnZS5qcyIsIi9Vc2Vycy9wYW5hZ2lvdGlzdGhvbW9nbG91L1Byb2plY3RzL2NhbXBlci9zcmMvanMvcGFnZXIvY29tcG9uZW50cy9CYXNlUGFnZXIuanMiLCJ3d3cvZGF0YS9kYXRhLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQzlFLE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNySCxPQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDckgsT0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQzNILE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMxSCxPQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ25GLE9BQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTs7QUFFcEYsT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQzVFLE9BQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUM1RSxPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDNUUsT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNqSCxPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pILE9BQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDeEgsT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsUUFBUSxFQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUN0SCxPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNqRixPQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTs7QUFFakYsV0FBTyxJQUFJLENBQUMsU0FBUztBQUNwQixTQUFLLDBCQUFhLElBQUk7QUFDckIsV0FBSztBQUFBLEFBQ04sU0FBSywwQkFBYSxLQUFLO0FBQ3RCLGFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBQyxRQUFRLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7QUFDN0UsV0FBSztBQUFBLEFBQ04sU0FBSywwQkFBYSxHQUFHO0FBQ3BCLGFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7QUFDNUUsV0FBSztBQUFBLEFBQ04sU0FBSywwQkFBYSxNQUFNO0FBQ3ZCLGFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBQyxRQUFRLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7QUFDN0UsV0FBSztBQUFBLElBQ047O0FBRUQsT0FBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDcEIsT0FBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7O0FBRW5CLE9BQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDeEMsT0FBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUN0QyxPQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2xDLE9BQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDNUMsT0FBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUMzQyxPQUFHLElBQUksQ0FBQyxVQUFVLElBQUksU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7O0FBRXJFLE9BQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUN2QixPQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDeEIsT0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFDaEIsU0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0FBQ2pCLFVBQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtJQUNuQixDQUFDLENBQUE7R0FDRjs7O1NBQ08sa0JBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNkLE9BQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ2hCLFFBQUksRUFBRSxDQUFDO0FBQ1AsT0FBRyxFQUFFLENBQUM7SUFDTixDQUFDLENBQUE7R0FDRjs7O1NBQ0ksZUFBQyxDQUFDLEVBQUU7QUFDUixJQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7QUFDbEIsT0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FDL0I7OztTQUNNLGlCQUFDLENBQUMsRUFBRTtBQUNWLElBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtBQUNsQixPQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7R0FDZjs7O1NBQ08sa0JBQUMsQ0FBQyxFQUFFO0FBQ1gsSUFBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO0FBQ2xCLE9BQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtHQUNoQjs7O1NBQ1EscUJBQUc7QUFDWCxPQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBO0FBQ2pCLE9BQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQ25COzs7U0FDTyxvQkFBRztBQUNWLE9BQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7QUFDbEIsT0FBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FDbEI7OztTQUNtQixnQ0FBRztBQUN0Qix5QkFBUyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ3JDLHlCQUFTLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDcEMsT0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUM3QyxPQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQzVDLE9BQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7R0FDckM7OztRQTFKbUIsUUFBUTs7O3FCQUFSLFFBQVE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3FCQ0xaLE1BQU07Ozs7MEJBQ0EsWUFBWTs7OztJQUVkLGNBQWM7V0FBZCxjQUFjOztBQUN2QixVQURTLGNBQWMsQ0FDdEIsS0FBSyxFQUFFO3dCQURDLGNBQWM7O0FBRWpDLDZCQUZtQixjQUFjLDZDQUUzQixLQUFLLEVBQUM7QUFDWixNQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtFQUMzQjs7Y0FKbUIsY0FBYzs7U0FLakIsNkJBQUc7QUFDbkIsOEJBTm1CLGNBQWMsbURBTVI7R0FDekI7OztTQUN1QixvQ0FBRztBQUMxQiw4QkFUbUIsY0FBYywwREFTRDtHQUNoQzs7O1NBQ21CLGdDQUFHO0FBQ3RCLE9BQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0FBQ3ZFLDhCQWJtQixjQUFjLHNEQWFMO0dBQzVCOzs7UUFkbUIsY0FBYzs7O3FCQUFkLGNBQWM7Ozs7Ozs7Ozs7Ozs7Ozs7d0JDSGQsVUFBVTs7Ozs0QkFDTixjQUFjOzs7OzRCQUNkLGNBQWM7Ozs7NEJBQ2QsY0FBYzs7OztJQUVsQixPQUFPO0FBQ2hCLFVBRFMsT0FBTyxDQUNmLFdBQVcsRUFBRSxJQUFJLEVBQUU7d0JBRFgsT0FBTzs7QUFFMUIsTUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7QUFDOUIsTUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksMEJBQWEsT0FBTyxDQUFBO0VBQ3hDOztjQUptQixPQUFPOztTQUtWLDZCQUFHO0FBQ25CLE9BQUksQ0FBQyxTQUFTLEdBQUcsc0JBQVMsWUFBWSxFQUFFLENBQUE7QUFDeEMsT0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBOztBQUV4QyxPQUFJLENBQUMsS0FBSyxHQUFHLDhCQUFpQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDN0MsT0FBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxDQUFBOztBQUU5QixPQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQTtBQUN2QixPQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7R0FDakI7OztTQUNTLG9CQUFDLElBQUksRUFBRTtBQUNoQixPQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtBQUNsQyxPQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQTtBQUN2QixPQUFJLG9CQUFvQixHQUFHLEFBQUMsSUFBSSxDQUFDLElBQUksSUFBSSwwQkFBYSxVQUFVLEdBQUksSUFBSSxHQUFHLEtBQUssQ0FBQTtBQUNoRixPQUFJLHlCQUF5QixHQUFHLEFBQUMsSUFBSSxDQUFDLElBQUksSUFBSSwwQkFBYSxVQUFVLEdBQUksSUFBSSxHQUFHLEtBQUssQ0FBQTtBQUNyRixRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNyQyxRQUFJLFlBQVksR0FBRyxzQkFBUyxlQUFlLEVBQUUsQ0FBQTtBQUM3QyxRQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDckIsZ0JBQVksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtBQUN6QixnQkFBWSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO0FBQ2pDLGdCQUFZLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7QUFDekMsZ0JBQVksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtBQUN4RixRQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDL0MsUUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUE7SUFDcEM7R0FDRDs7O1NBQzBCLHVDQUFHO0FBQzdCLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNuRCxRQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3hDLGdCQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDcEIsZ0JBQVksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0FBQ25DLDBCQUFTLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzFDO0dBQ0Q7OztTQUNLLGtCQUFHO0FBQ1IsT0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsT0FBTTtBQUN2QyxRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDcEQsUUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN4QyxnQkFBWSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3JCO0dBQ0Q7OztTQUNRLHFCQUFHO0FBQ1gsT0FBSSxPQUFPLEdBQUcsc0JBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUMvQixPQUFJLGNBQWMsR0FBRyxBQUFDLElBQUksQ0FBQyxJQUFJLElBQUksMEJBQWEsVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksMEJBQWEsUUFBUSxHQUFJLDBCQUFhLDZCQUE2QixHQUFHLDBCQUFhLHVCQUF1QixDQUFBO0FBQ3JMLE9BQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxHQUFHLGNBQWMsQ0FBQTtHQUN0Qzs7O1NBQ3NCLG1DQUFHLEVBRXpCOzs7U0FDZ0IsNkJBQUcsRUFDbkI7OztTQUNLLGtCQUFHO0FBQ1IsT0FBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO0FBQ2hCLE9BQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTs7QUFFOUIsT0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsT0FBTTtBQUN2QyxRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDcEQsUUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN4QyxnQkFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDaEM7R0FDRDs7O1NBQ08sa0JBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNkLE9BQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNwQixPQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDcEIsT0FBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDVixPQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtHQUNWOzs7U0FDYyx5QkFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBRXJCOzs7U0FDbUIsZ0NBQUc7QUFDdEIsT0FBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtBQUMvQix5QkFBUyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDekMsT0FBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7QUFDbEMsT0FBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0dBQ2pDOzs7UUFoRm1CLE9BQU87OztxQkFBUCxPQUFPOzs7Ozs7Ozs7Ozs7Ozs7O3dCQ0xQLFVBQVU7Ozs7NEJBQ04sY0FBYzs7OztxQkFDckIsT0FBTzs7OztJQUVKLFlBQVk7QUFDckIsVUFEUyxZQUFZLENBQ3BCLGVBQWUsRUFBRTt3QkFEVCxZQUFZOztBQUUvQixNQUFJLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQTtFQUNoQzs7Y0FIbUIsWUFBWTs7U0FJZiw2QkFBRztBQUNuQixPQUFJLENBQUMsY0FBYyxHQUFHLHNCQUFTLFlBQVksRUFBRSxDQUFBO0FBQzdDLE9BQUksQ0FBQyxlQUFlLEdBQUcsc0JBQVMsWUFBWSxFQUFFLENBQUE7QUFDOUMsT0FBSSxDQUFDLGVBQWUsR0FBRyxzQkFBUyxZQUFZLEVBQUUsQ0FBQTtBQUM5QyxPQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDNUMsT0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQzdDLE9BQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTs7QUFFN0MsT0FBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7QUFDakIsT0FBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO0FBQ2pCLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDbkMsUUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7QUFDM0IsUUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDbkIsUUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0I7O0FBRUQsT0FBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUE7QUFDaEIsT0FBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7QUFDakIsT0FBSSxhQUFhLEdBQUcsc0JBQVMsYUFBYSxFQUFFLENBQUE7QUFDNUMsT0FBSSxRQUFRLEdBQUcsc0JBQVMsZ0JBQWdCLEVBQUUsQ0FBQTtBQUMxQyxPQUFJLFNBQVMsR0FBRyxzQkFBUyxTQUFTLEVBQUUsQ0FBQTtBQUNwQyxPQUFJLGFBQWEsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFBO0FBQzFDLE9BQUksV0FBVyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUE7QUFDdEMsT0FBSSxRQUFRLEdBQUcsRUFBRSxDQUFBOztBQUVqQixRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN6QyxRQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDM0IsUUFBSSxZQUFZLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBO0FBQ3pELFFBQUksR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxHQUFHLGVBQWUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0FBQzNHLE9BQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtBQUNsQixPQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7QUFDbEIsUUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDbEMsUUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDaEIsUUFBRyxFQUFFLEdBQUc7QUFDUixhQUFRLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQztLQUN0RCxDQUFDLENBQUE7SUFDRjs7QUFFRCxRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQyxRQUFJLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDM0IsUUFBSSxXQUFXLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBO0FBQ3JELFFBQUksR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxHQUFHLGVBQWUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0FBQzFHLE9BQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtBQUNsQixPQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7QUFDbEIsUUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDbEMsUUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDakIsUUFBRyxFQUFFLEdBQUc7QUFDUixhQUFRLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQztLQUNyRCxDQUFDLENBQUE7SUFDRjtHQUNEOzs7U0FDMkIsc0NBQUMsRUFBRSxFQUFFOztBQUVoQyxXQUFPLEVBQUU7QUFDUixTQUFLLE1BQU07QUFBRSxZQUFPLENBQUMsR0FBRyxDQUFBO0FBQUEsQUFDeEIsU0FBSyxPQUFPO0FBQUUsWUFBTyxDQUFDLEVBQUUsQ0FBQTtBQUFBLEFBQ3hCLFNBQUssT0FBTztBQUFFLFlBQU8sRUFBRSxDQUFBO0FBQUEsQUFDdkIsU0FBSyxPQUFPO0FBQUUsWUFBTyxFQUFFLENBQUE7QUFBQSxBQUN2QixTQUFLLE1BQU07QUFBRSxZQUFPLEdBQUcsQ0FBQTtBQUFBLElBQ3ZCO0dBQ0Q7OztTQUMyQixzQ0FBQyxFQUFFLEVBQUU7O0FBRWhDLFdBQU8sRUFBRTtBQUNSLFNBQUssTUFBTTtBQUFFLFlBQU8sQ0FBQyxHQUFHLENBQUE7QUFBQSxBQUN4QixTQUFLLFFBQVE7QUFBRSxZQUFPLENBQUMsRUFBRSxDQUFBO0FBQUEsQUFDekIsU0FBSyxRQUFRO0FBQUUsWUFBTyxFQUFFLENBQUE7QUFBQSxJQUN4QjtHQUNEOzs7U0FDUSxxQkFBRztBQUNYLE9BQUksWUFBWSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7QUFDcEQsT0FBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ2pDLE9BQUksS0FBSyxDQUFDO0FBQ1YsT0FBSSxLQUFLLEdBQUcsc0JBQVMsWUFBWSxFQUFFLENBQUE7QUFDbkMsT0FBSSxLQUFLLEdBQUcsUUFBUSxDQUFBO0FBQ3BCLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDN0IsUUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7QUFDekIsUUFBSSxDQUFDLENBQUM7O0FBRU4sS0FBQyxDQUFDLEtBQUssRUFBRSxDQUFBOzs7QUFHVCxRQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksR0FBRyxJQUFJLENBQUEsS0FDN0IsSUFBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUEsR0FBSSxJQUFJLENBQUEsS0FDNUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxZQUFZLENBQUE7OztBQUc3QixRQUFHLENBQUMsSUFBRSxDQUFDLEVBQUU7QUFDUixTQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ3pELFNBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0tBQzFCO0FBQ0QsUUFBRyxDQUFDLElBQUUsQ0FBQyxFQUFFO0FBQ1IsU0FBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUN4RCxTQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtLQUN6Qjs7O0FBR0QsUUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7O0FBRXJCLFNBQUssR0FBRyxDQUFDLENBQUE7SUFDVDtHQUNEOzs7U0FDd0IsbUNBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtBQUN2RCxPQUFJLFNBQVMsR0FBRyxBQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFJLENBQUMsQ0FBQTtBQUNqQyxPQUFJLFVBQVUsR0FBRyxBQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFJLENBQUMsQ0FBQTs7QUFFbkMsT0FBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7O0FBRXpELE9BQUksS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQ3RDLE9BQUksS0FBSyxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDdkMsT0FBSSxHQUFHLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDckMsT0FBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUN0QyxPQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBOztBQUU1RCxRQUFLLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7QUFDbkMsUUFBSyxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7QUFDcEMsTUFBRyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0FBQ2xDLE1BQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0FBQ25DLE9BQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7R0FDNUQ7OztTQUN1QixrQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO0FBQ3RELE9BQUksWUFBWSxHQUFHLEFBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUksRUFBRSxDQUFBO0FBQ3RDLE9BQUksYUFBYSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBOztBQUVoQyxPQUFJLGVBQWUsR0FBRyxBQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFJLENBQUMsQ0FBQTtBQUN2QyxPQUFJLGdCQUFnQixHQUFHLEFBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUksQ0FBQyxDQUFBOztBQUV4QyxPQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTs7QUFFekQsT0FBSSxLQUFLLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDekMsT0FBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUMxQyxPQUFJLEdBQUcsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUN4QyxPQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQ3pDLE9BQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7O0FBRTVELFFBQUssR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUN0QyxRQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUN2QyxNQUFHLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7QUFDckMsTUFBRyxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7QUFDdEMsT0FBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTs7QUFFNUQsUUFBSyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQ3hDLFFBQUssR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQ3pDLE1BQUcsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQUN2QyxNQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQUN4QyxPQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBOztBQUU1RCxRQUFLLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtBQUN6QyxRQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBQzFDLE1BQUcsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3hDLE1BQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7QUFDekMsT0FBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtHQUM1RDs7O1NBQ2Esd0JBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQ3ZELElBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUM1QixJQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNyQixJQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUN0QixJQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUNsQixJQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7R0FDWDs7O1NBQ1Msb0JBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNoQixJQUFDLENBQUMsU0FBUyxDQUFDLHNCQUFTLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNqRCxJQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTs7QUFFeEIsSUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7O0FBRWQsT0FBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO0FBQ2IsT0FBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ1QsT0FBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ1QsT0FBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxBQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUMvQyxPQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQTtBQUNqQyxRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDaEMsU0FBSyxHQUFHLG1CQUFNLGdCQUFnQixDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQTtBQUN2QyxLQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDdkIsS0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ3ZCLEtBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2QsQ0FBQzs7O0FBR0YsUUFBSyxHQUFHLG1CQUFNLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ25DLElBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUN2QixJQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDdkIsSUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7O0FBRWQsSUFBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0dBQ1g7OztTQUNTLG9CQUFDLENBQUMsRUFBRSxLQUFLLEVBQUU7QUFDcEIsT0FBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtBQUN4QixPQUFJLE1BQU0sR0FBRyxBQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFJLEVBQUUsQ0FBQTtBQUNyQyxPQUFJLEtBQUssR0FBRyxBQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFJLENBQUMsQ0FBQTtBQUNuQyxPQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFBO0FBQ2xCLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3ZDLFFBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNyQixRQUFJLEtBQUssR0FBRyxtQkFBTSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDbEQsU0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsS0FBSyxHQUFHLG1CQUFNLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQ3ZELFNBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ2pDLFNBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ2pDLFNBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUE7QUFDekIsU0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQTtJQUN6QjtHQUNEOzs7U0FDVSxxQkFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFO0FBQ3JCLE9BQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7QUFDMUIsT0FBSSxNQUFNLEdBQUcsQUFBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBSSxFQUFFLENBQUE7QUFDckMsT0FBSSxLQUFLLEdBQUcsQUFBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBSSxDQUFDLENBQUE7QUFDbkMsT0FBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQTtBQUNsQixRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN4QyxRQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDdkIsUUFBSSxLQUFLLEdBQUcsbUJBQU0sZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQ25ELFVBQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLEtBQUssR0FBRyxtQkFBTSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtBQUN4RCxVQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNsQyxVQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNsQyxVQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFBO0FBQzFCLFVBQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUE7SUFDMUI7R0FDRDs7O1NBQ0ssZ0JBQUMsTUFBTSxFQUFFO0FBQ2QsT0FBSSxPQUFPLEdBQUcsc0JBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUMvQixPQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtBQUNwQixPQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7R0FDaEI7OztTQUNtQixnQ0FBRztBQUN0QixPQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFBO0FBQ3BDLE9BQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLENBQUE7QUFDckMsT0FBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtBQUNyQyx5QkFBUyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDOUMseUJBQVMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQy9DLHlCQUFTLGdCQUFnQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtHQUMvQzs7O1FBeE9tQixZQUFZOzs7cUJBQVosWUFBWTs7Ozs7Ozs7Ozs7Ozs7Ozt3QkNKWixVQUFVOzs7O3VCQUNYLFNBQVM7Ozs7NEJBQ0osY0FBYzs7Ozs0QkFDZCxjQUFjOzs7O0lBRWxCLGtCQUFrQjtBQUMzQixVQURTLGtCQUFrQixDQUMxQixXQUFXLEVBQUUsUUFBUSxFQUFFO3dCQURmLGtCQUFrQjs7QUFFckMsTUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7QUFDeEIsTUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7RUFDOUI7O2NBSm1CLGtCQUFrQjs7U0FLckIsNkJBQUc7QUFDbkIsT0FBSSxDQUFDLFNBQVMsR0FBRyxzQkFBUyxZQUFZLEVBQUUsQ0FBQTtBQUN4QyxPQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7O0FBRXpDLE9BQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBOztBQUVuQixPQUFJLFdBQVcsR0FBRyx5QkFBWSxJQUFJLENBQUMsU0FBUyxFQUFFLDBCQUFhLFVBQVUsQ0FBQyxDQUFBO0FBQ3RFLGNBQVcsQ0FBQyxVQUFVLEdBQUcsMEJBQWEsaUJBQWlCLENBQUE7QUFDdkQsY0FBVyxDQUFDLGlCQUFpQixFQUFFLENBQUE7O0FBRS9CLE9BQUksT0FBTyxHQUFHLHNCQUFTLE9BQU8sRUFBRSxDQUFBO0FBQ2hDLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3hDLFFBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN2QixRQUFHLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFO0FBQ3JCLFNBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFBO0FBQy9CLFNBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQTtBQUM3QixTQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRywwQkFBYSxJQUFJLENBQUE7QUFDM0MsU0FBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtLQUMzQixNQUFJO0FBQ0osU0FBSSxZQUFZLEdBQUcsOEJBQWlCLElBQUksQ0FBQyxTQUFTLEVBQUUsMEJBQWEsVUFBVSxDQUFDLENBQUE7QUFDNUUsU0FBSSxVQUFVLEdBQUcsc0JBQVMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDbEQsaUJBQVksQ0FBQyxLQUFLLEdBQUcsMEJBQWEsS0FBSyxDQUFBO0FBQ3ZDLGlCQUFZLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQTtBQUN4QixpQkFBWSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQ2pFLFNBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFBO0tBQ2hDO0lBQ0Q7R0FDRDs7O1NBQ3NCLG1DQUFHO0FBQ3pCLE9BQUksVUFBVSxHQUFHLHNCQUFTLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtBQUNuRCxPQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQTs7QUFFOUQsUUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQy9DLFFBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtJQUMzQyxDQUFDO0dBQ0Y7OztTQUNnQiw2QkFBRztBQUNuQixRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDL0MsUUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3JDLENBQUM7R0FDRjs7O1NBQ0ssa0JBQUc7QUFDUixRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDL0MsUUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0dBQ0Y7OztTQUNLLGtCQUFHO0FBQ1IsT0FBSSxPQUFPLEdBQUcsc0JBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUMvQixPQUFJLE9BQU8sR0FBRyxzQkFBUyxNQUFNLENBQUMsQ0FBQyxDQUFBOztBQUUvQixPQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBO0FBQzlCLE9BQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUNkLE9BQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtBQUNyQixRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQyxRQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDMUIsUUFBSSxJQUFJLEdBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEFBQUMsQ0FBQTtBQUNoQyxRQUFJLFdBQVcsR0FBRyxTQUFTLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2hDLFFBQUksT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7QUFDNUIsUUFBSSxFQUFFLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUNoRCxXQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7QUFDaEIsaUJBQWEsR0FBRyxhQUFhLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLGFBQWEsQ0FBQTtBQUMvRSxXQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUN2QixXQUFPLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtBQUNqQixVQUFNLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUM1Qzs7QUFFRCxRQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDdEMsUUFBSSxPQUFPLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQzFCLFdBQU8sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksQ0FBQyxDQUFBLEFBQUMsSUFBSSxNQUFNLElBQUUsQ0FBQyxDQUFBLEFBQUMsRUFBRSxBQUFDLE9BQU8sR0FBSSxhQUFhLEdBQUksT0FBTyxHQUFHLElBQUksQUFBQyxDQUFDLENBQUE7SUFDbEg7O0FBRUQsT0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQSxJQUFLLE1BQU0sSUFBSSxDQUFDLENBQUEsQUFBQyxDQUFBO0FBQzFELE9BQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxBQUFDLE9BQU8sR0FBSSxhQUFhLEdBQUksT0FBTyxHQUFHLElBQUksQUFBQyxDQUFBO0FBQ3hFLE9BQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0FBQ2xDLE9BQUksQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFBO0dBQzNCOzs7U0FDZSwwQkFBQyxPQUFPLEVBQUU7QUFDekIsVUFBTyxBQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksMEJBQWEsSUFBSSxHQUFJLEdBQUcsR0FBRyxHQUFHLENBQUE7R0FDdkQ7OztTQUNtQixnQ0FBRztBQUN0QixRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDL0MsUUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0lBQ3hDO0FBQ0QsT0FBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtBQUMvQix5QkFBUyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FDekM7OztRQTFGbUIsa0JBQWtCOzs7cUJBQWxCLGtCQUFrQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OEJDTGIsZUFBZTs7OztrQ0FDcEIsb0JBQW9COzs7O3dCQUNwQixVQUFVOzs7OzRCQUNOLGNBQWM7Ozs7SUFFakMsY0FBYztXQUFkLGNBQWM7O0FBQ1IsVUFETixjQUFjLEdBQ0w7d0JBRFQsY0FBYzs7QUFFbEIsNkJBRkksY0FBYyw2Q0FFWDtFQUNQOztjQUhJLGNBQWM7O1NBSWIsZ0JBQUMsTUFBTSxFQUFFO0FBQ2QsT0FBSSxLQUFLLEdBQUcsRUFBRSxDQUFBO0FBQ2QsT0FBSSxXQUFXLEdBQUcsc0JBQVMsWUFBWSxFQUFFLENBQUE7QUFDekMsUUFBSyxDQUFDLEtBQUssR0FBRyxzQkFBUyxxQkFBcUIsRUFBRSxDQUFBO0FBQzlDLFFBQUssQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQy9DLFFBQUssQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBQzdDLFFBQUssQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFBOztBQUVqRCxPQUFJLFNBQVMsR0FBRyxzQkFBUyxTQUFTLEVBQUUsQ0FBQTtBQUNwQyxPQUFJLElBQUksR0FBRyxzQkFBUyxJQUFJLEVBQUUsQ0FBQTtBQUMxQixPQUFJLFdBQVcsQ0FBQztBQUNoQixPQUFJLGFBQWEsR0FBRyxFQUFFLENBQUE7QUFDdEIsT0FBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQTtBQUM3QyxRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQyxRQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDMUIsUUFBRyxPQUFPLENBQUMsSUFBSSxJQUFJLElBQUksRUFBRTtBQUN4QixnQkFBVyxHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUMzQyxNQUFJO0FBQ0osWUFBTyxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDNUMsa0JBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7S0FDM0I7SUFDRDtBQUNELFFBQUssQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFBO0FBQy9CLFFBQUssQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFBOztBQUVoQyw4QkE3QkksY0FBYyx3Q0E2QkwsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBWSxLQUFLLEVBQUM7R0FDdkQ7OztTQUNpQiw4QkFBRztBQUNwQiw4QkFoQ0ksY0FBYyxvREFnQ1E7R0FDMUI7OztTQUNnQiw2QkFBRztBQUNuQiw4QkFuQ0ksY0FBYyxtREFtQ087QUFDekIsT0FBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0FBQ3hELE9BQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDdkMsT0FBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUNoRCxPQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQzdDLE9BQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7QUFDN0MsT0FBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQ3pELE9BQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUN2RCxPQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTs7QUFFbkIsT0FBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDeEQsT0FBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDeEQsT0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ2xELE9BQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTs7QUFFbEQsT0FBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0FBQ2IsT0FBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtHQUM5Qzs7O1NBQ2UsMEJBQUMsQ0FBQyxFQUFFO0FBQ25CLElBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtBQUNsQixPQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUM5QixPQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7R0FDaEU7OztTQUNlLDBCQUFDLENBQUMsRUFBRTtBQUNuQixJQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7QUFDbEIsT0FBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDakMsT0FBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtHQUM5Qzs7O1NBQ0ssa0JBQUc7QUFDUixPQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxPQUFNO0FBQzNCLE9BQUksT0FBTyxHQUFHLHNCQUFTLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDL0IsT0FBSSxPQUFPLEdBQUcsc0JBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQTs7QUFFL0IsT0FBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQTtBQUMvQyxPQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQTs7QUFFdEQsT0FBSSxTQUFTLEdBQUc7QUFDZixRQUFJLEVBQUUsT0FBTyxHQUFHLDBCQUFhLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRTtBQUN6RSxPQUFHLEVBQUUsT0FBTyxHQUFHLDBCQUFhLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRTtJQUN6RSxDQUFBO0FBQ0QsT0FBSSxRQUFRLEdBQUc7QUFDZCxRQUFJLEVBQUUsMEJBQWEsY0FBYztBQUNqQyxPQUFHLEVBQUUsT0FBTyxHQUFHLDBCQUFhLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtJQUNqRSxDQUFBO0FBQ0QsT0FBSSxZQUFZLEdBQUc7QUFDbEIsUUFBSSxFQUFFLE9BQU8sR0FBRywwQkFBYSxjQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUU7QUFDckUsT0FBRyxFQUFFLDBCQUFhLGNBQWM7SUFDaEMsQ0FBQTtBQUNELE9BQUksT0FBTyxHQUFHO0FBQ2IsUUFBSSxFQUFFLFlBQVksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSwwQkFBYSxjQUFjLElBQUksQ0FBQyxDQUFBLEFBQUM7QUFDakYsT0FBRyxFQUFFLDBCQUFhLGNBQWMsR0FBRyxDQUFDO0lBQ3BDLENBQUE7QUFDRCxPQUFJLE9BQU8sR0FBRztBQUNiLFFBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSwwQkFBYSxjQUFjLElBQUksQ0FBQyxDQUFBLEFBQUM7QUFDeEYsT0FBRyxFQUFFLDBCQUFhLGNBQWM7SUFDaEMsQ0FBQTs7QUFFRCxPQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUNsQyxPQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUN6QixPQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUNqQyxPQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUN2QixPQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUN2Qjs7O1NBQ21CLGdDQUFHO0FBQ3RCLDhCQW5HSSxjQUFjLHNEQW1HVTtHQUM1Qjs7O1FBcEdJLGNBQWM7OztxQkF1R0wsY0FBYzs7Ozs7Ozs7Ozs7Ozs7Ozt3QkM1R1IsVUFBVTs7OztJQUVWLElBQUk7QUFDYixVQURTLElBQUksQ0FDWixlQUFlLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRTt3QkFEbkIsSUFBSTs7QUFFdkIsTUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3BCLE1BQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxJQUFJLFFBQVEsQ0FBQTtBQUM5QixNQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtBQUN0QyxNQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUNYLE1BQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ1gsTUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDVixNQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNWLE1BQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFBO0FBQ1osTUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7QUFDWixNQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtBQUNkLE1BQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO0FBQ2QsTUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDZixNQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtFQUNmOztjQWZtQixJQUFJOztTQWdCUCw2QkFBRztBQUNuQixPQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0FBQzVCLE9BQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNyQyxPQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7QUFDWCxVQUFPLElBQUksQ0FBQTtHQUNYOzs7U0FDUyxvQkFBQyxNQUFNLEVBQUU7QUFDbEIsT0FBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxDQUFBO0FBQ3pCLE9BQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtHQUNYOzs7U0FDRyxnQkFBRztBQUNOLE9BQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDZCxPQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxzQkFBUyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pELE9BQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEMsT0FBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDckMsT0FBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtHQUNoQjs7O1NBQ08sa0JBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNkLE9BQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNaLE9BQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNaLE9BQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ1YsT0FBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7R0FDVjs7O1NBQ0ksaUJBQUc7QUFDUCxPQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFBO0dBQ2Q7OztTQUNJLGVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNYLE9BQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDbEIsT0FBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNsQixPQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUNmLE9BQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0dBQ2Y7OztTQUNPLGtCQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDZCxPQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUNYLE9BQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0dBQ1g7OztTQUNtQixnQ0FBRztBQUN0QixPQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFBO0FBQ2QsT0FBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUE7R0FDYjs7O1FBdkRtQixJQUFJOzs7cUJBQUosSUFBSTs7Ozs7Ozs7Ozs7Ozs7Ozs0QkNGQSxjQUFjOzs7O3dCQUNsQixVQUFVOzs7O29CQUNkLE1BQU07Ozs7cUJBQ0wsT0FBTzs7Ozs0QkFDQSxlQUFlOzs7O0lBRW5CLGdCQUFnQjtBQUN6QixVQURTLGdCQUFnQixDQUN4QixXQUFXLEVBQUUsUUFBUSxFQUFFO3dCQURmLGdCQUFnQjs7QUFFbkMsTUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7QUFDeEIsTUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7QUFDOUIsTUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUE7RUFDekI7O2NBTG1CLGdCQUFnQjs7U0FNbkIsNkJBQUc7QUFDbkIsT0FBSSxLQUFLLEdBQUcsc0JBQVMscUJBQXFCLEVBQUUsQ0FBQTtBQUM1QyxPQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7O0FBRTdDLE9BQUksQ0FBQyxnQkFBZ0IsR0FBRyxzQkFBUyxZQUFZLEVBQUUsQ0FBQTtBQUMvQyxPQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtBQUNsRCxPQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3ZELE9BQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFBO0FBQ2hCLE9BQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQTs7QUFFakQsT0FBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtBQUMzRCxPQUFJLFdBQVcsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQ3RELE9BQUksVUFBVSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDbkQsT0FBSSxDQUFDLGNBQWMsR0FBRztBQUNyQixVQUFNLEVBQUUsY0FBYztBQUN0QixlQUFXLEVBQUUsV0FBVztBQUN4QixjQUFVLEVBQUUsVUFBVTtJQUN0QixDQUFBOztBQUVELE9BQUksT0FBTyxHQUFHLHNCQUFTLE9BQU8sRUFBRSxDQUFBO0FBQ2hDLE9BQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO0FBQ2hCLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3hDLFFBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtBQUNWLFFBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNuQixRQUFJLGdCQUFnQixHQUFHLHNCQUFTLFlBQVksRUFBRSxDQUFBO0FBQzlDLFFBQUksUUFBUSxHQUFHO0FBQ2QsTUFBQyxFQUFFLHNCQUFTLFdBQVcsRUFBRTtBQUN6QixTQUFJLEVBQUUsQ0FBQztBQUNQLFVBQUssRUFBRSxDQUFDO0FBQ1IsTUFBQyxFQUFFLENBQUM7S0FDSixDQUFBO0FBQ0QsUUFBSSxNQUFNLEdBQUcsc0JBQVMsWUFBWSxDQUFDLEVBQUUsRUFBRSwwQkFBYSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JFLFFBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQzVDLFFBQUksTUFBTSxHQUFHLHNCQUFTLFNBQVMsRUFBRSxDQUFBO0FBQ2pDLFVBQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO0FBQ3hCLFVBQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO0FBQ2xCLFFBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtBQUNoRCxvQkFBZ0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDakMsb0JBQWdCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNyQyxVQUFNLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUE7QUFDeEIsS0FBQyxDQUFDLFdBQVcsR0FBRyxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDOUIsS0FBQyxDQUFDLFdBQVcsR0FBRyxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDOUIsS0FBQyxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFBO0FBQ3JDLEtBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO0FBQ2pCLEtBQUMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO0FBQ25CLEtBQUMsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO0FBQ3JCLEtBQUMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFBO0FBQy9CLEtBQUMsQ0FBQyxpQkFBaUIsR0FBRyxzQkFBUyxtQkFBbUIsQ0FBQywwQkFBYSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ2pGLEtBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO0FBQ2pCLEtBQUMsQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2pCLFFBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2xCOztBQUVELE9BQUksQ0FBQyxVQUFVLEdBQUcsK0JBQWEsR0FBRyxFQUFDLElBQUksRUFBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUE7QUFDOUMsT0FBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7R0FDOUI7OztTQUNXLHNCQUFDLEtBQUssRUFBRSxJQUFJLEVBQUU7QUFDekIsT0FBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUE7QUFDakQsT0FBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUE7QUFDOUMsY0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUN2QixhQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0dBQ3JCOzs7U0FDa0IsOEJBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMxQyxXQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDaEIsV0FBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDL0IsV0FBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUM3QixXQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7R0FDbEI7OztTQUNHLGdCQUFHO0FBQ04sT0FBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtBQUN0QyxPQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUM5QixPQUFJLENBQUMsNkJBQTZCLEdBQUcsWUFBWSxDQUFBO0FBQ2pELE9BQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO0FBQzdCLE9BQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO0dBQzFCOzs7U0FDTyxvQkFBRztBQUNWLE9BQUksV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUE7QUFDbkMsT0FBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7QUFDaEMsT0FBSSxDQUFDLDZCQUE2QixHQUFHLFdBQVcsQ0FBQTtBQUNoRCxPQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtBQUM3QixPQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtHQUMxQjs7O1NBQ3FCLGtDQUFHO0FBQ3hCLE9BQUksUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQTtBQUNuQyxRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDNUMsUUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUMxQixRQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDVixVQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtBQUN0QixTQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUE7QUFDekIsU0FBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFDckUsU0FBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtBQUN4RCxTQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtLQUM5QixNQUFJO0FBQ0osVUFBSyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUE7QUFDdkIsU0FBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FDOUQ7SUFDRDtHQUNEOzs7U0FDcUMsZ0RBQUMsS0FBSyxFQUFFO0FBQzdDLE9BQUksQ0FBQyxHQUFHLEtBQUssQ0FBQTtBQUNiLE9BQUksTUFBTSxHQUFHLHNCQUFTLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLDBCQUFhLGdCQUFnQixDQUFDLENBQUE7QUFDdkUsT0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLE1BQU0sRUFBRTtBQUN0QixLQUFDLENBQUMsaUJBQWlCLEdBQUcsc0JBQVMsbUJBQW1CLENBQUMsMEJBQWEsZ0JBQWdCLENBQUMsQ0FBQTtBQUNqRixLQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUN2QixLQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQzFDLEtBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUE7QUFDNUIsS0FBQyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7SUFDakI7R0FDRDs7O1NBQ3lCLG9DQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRTtBQUMvRCxPQUFJLENBQUMsR0FBRyxLQUFLLENBQUE7QUFDYixPQUFJLFVBQVUsR0FBRyxtQkFBTSw0Q0FBNEMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN4SSxJQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO0FBQ3ZCLElBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7QUFDdkIsSUFBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUE7QUFDbkMsSUFBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUE7QUFDbkMsSUFBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQTtBQUNqQyxJQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFBO0FBQ25DLElBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7QUFDNUIsSUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQTtHQUMzQjs7O1NBQ0ssa0JBQUc7QUFDUixPQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO0FBQ3hCLE9BQUksQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFBO0FBQ3JCLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3ZDLFFBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNqQixLQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQSxHQUFJLElBQUksQ0FBQTtBQUM3RCxRQUFJLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0FBQ3JELEtBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBLEdBQUksSUFBSSxDQUFBO0FBQ3ZFLEtBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtBQUN6QyxRQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUEsR0FBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQTtBQUM1QyxRQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQzFGLEtBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUE7QUFDaEQsS0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQTtJQUNoRDtBQUNELE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQSxHQUFJLElBQUksQ0FBQTtBQUM3RyxPQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUEsR0FBSSxJQUFJLENBQUE7O0dBRTdHOzs7U0FDeUIsc0NBQUc7QUFDNUIsT0FBSSxPQUFPLEdBQUcsc0JBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUMvQixPQUFJLE9BQU8sR0FBRyxzQkFBUyxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQy9CLE9BQUksU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUE7QUFDakQsT0FBSSxlQUFlLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUE7QUFDdkUsT0FBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsZUFBZSxJQUFJLENBQUMsQ0FBQTtBQUN0RCxPQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxPQUFPLElBQUksQ0FBQyxDQUFBO0FBQzlDLE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEdBQUksT0FBTyxJQUFJLENBQUMsQUFBQyxDQUFBO0FBQzFDLE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEdBQUksT0FBTyxJQUFJLENBQUMsQUFBQyxDQUFBO0FBQzFDLE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtBQUN6RCxPQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7QUFDckMsT0FBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO0FBQ3JDLE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO0dBQ3RDOzs7U0FDa0IsK0JBQUc7QUFDckIsT0FBSSxPQUFPLEdBQUcsc0JBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUMvQixPQUFJLE9BQU8sR0FBRyxzQkFBUyxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQy9CLE9BQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtBQUNuQixRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDNUMsUUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN0QixRQUFJLENBQUMsc0NBQXNDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDOUMsUUFBSSxrQkFBa0IsR0FBRyxPQUFPLElBQUksQ0FBQyxHQUFJLDBCQUFhLCtCQUErQixHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUE7QUFDM0YsUUFBSSxZQUFZLEdBQUcsT0FBTyxHQUFHLDBCQUFhLCtCQUErQixDQUFBO0FBQ3pFLFFBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUNkLFFBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxNQUFNLEdBQUcsa0JBQWtCLENBQUEsS0FDdEMsTUFBTSxHQUFHLFlBQVksQ0FBQTtBQUMxQixRQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDNUQsS0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFBO0FBQ3hCLEtBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQTtBQUMzQixLQUFDLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxDQUFBO0FBQzdCLEtBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTtBQUN6QixLQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtBQUNqQyxLQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUE7QUFDN0IsUUFBRyxJQUFJLENBQUMsNkJBQTZCLElBQUksU0FBUyxJQUFJLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQztBQUNuRyxNQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO0tBQ3RDO0FBQ0QsZUFBVyxJQUFJLE1BQU0sQ0FBQTtJQUNyQjtBQUNELE9BQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFBO0dBQ2pDOzs7U0FDc0IsbUNBQUc7OztBQUN6QixPQUFJLE9BQU8sR0FBRyxzQkFBUyxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQy9CLE9BQUksT0FBTyxHQUFHLHNCQUFTLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDL0IsZUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUMvQixPQUFJLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxZQUFJO0FBQ2xDLFFBQUksU0FBUyxHQUFHLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQSxHQUFLLE9BQU8sR0FBRywwQkFBYSx1QkFBdUIsQUFBQyxJQUFJLE1BQUssY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUEsQUFBQyxDQUFBO0FBQzlILFFBQUksa0JBQWtCLEdBQUc7QUFDeEIsUUFBRyxFQUFFLFNBQVMsSUFBSSxBQUFDLE9BQU8sR0FBRyxTQUFTLElBQUssQ0FBQyxDQUFBLEFBQUM7QUFDN0MsU0FBSSxFQUFFLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQSxJQUFLLE1BQUssY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUEsQUFBQztLQUNoRSxDQUFBO0FBQ0QsVUFBSyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQ2xELEVBQUUsQ0FBQyxDQUFDLENBQUE7R0FDTDs7O1NBQ0ssa0JBQUc7QUFDUixPQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtBQUMxQixPQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtHQUM5Qjs7O1NBQ21CLGdDQUFHOztBQUV0QixPQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO0FBQ3ZCLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3ZDLFFBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTs7QUFFakIsS0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDcEIsMEJBQVMsZUFBZSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7O0FBRXRDLEtBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUM5QiwwQkFBUyxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBOztBQUVoQyxLQUFDLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLENBQUE7QUFDbkMsMEJBQVMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDN0M7O0FBRUQsT0FBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBOzs7Ozs7O0FBT3ZCLE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQTs7O0FBR3hDLE9BQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtBQUN0Qyx5QkFBUyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtHQUVoRDs7O1FBdk9tQixnQkFBZ0I7OztxQkFBaEIsZ0JBQWdCOzs7Ozs7Ozs7Ozs7Ozs7O3dCQ05oQixVQUFVOzs7OzRCQUNOLGNBQWM7Ozs7SUFFbEIsV0FBVztBQUNwQixVQURTLFdBQVcsR0FDakI7d0JBRE0sV0FBVztFQUU5Qjs7Y0FGbUIsV0FBVzs7U0FHM0IsY0FBQyxTQUFTLEVBQUU7O0FBRWYsT0FBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUN0RCx5QkFBUyxFQUFFLENBQUMsMEJBQWEsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBOzs7QUFHbkUsT0FBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7O0FBRTFFLE9BQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUNyQixJQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0FBQ2hELEtBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTs7QUFFN0IsT0FBSSxDQUFDLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtHQUNqQzs7O1NBQ0UsYUFBQyxLQUFLLEVBQUU7QUFDVixPQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtHQUMxQjs7O1NBQ0ssZ0JBQUMsS0FBSyxFQUFFO0FBQ2IsT0FBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7R0FDN0I7OztTQUNLLGtCQUFHO0FBQ0wsT0FBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0dBQ25DOzs7U0FDSyxrQkFBRztBQUNSLE9BQUksT0FBTyxHQUFHLHNCQUFTLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDL0IsT0FBSSxPQUFPLEdBQUcsc0JBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUMvQixPQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7R0FDdEM7OztTQUNjLDJCQUFHO0FBQ2pCLE9BQUksTUFBTSxHQUFHLHNCQUFTLFNBQVMsRUFBRSxDQUFBO0FBQ2pDLE9BQUksT0FBTyxHQUFHLHNCQUFTLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ2hELE9BQUcsT0FBTyxJQUFJLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FDbkU7OztRQW5DbUIsV0FBVzs7O3FCQUFYLFdBQVc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3lCQ0hYLFVBQVU7Ozs7d0JBQ1YsVUFBVTs7Ozs0QkFDTixjQUFjOzs7OzBCQUNoQixZQUFZOzs7O0lBRWQsSUFBSTtXQUFKLElBQUk7O0FBQ2IsVUFEUyxJQUFJLENBQ1osS0FBSyxFQUFFO3dCQURDLElBQUk7O0FBRXZCLDZCQUZtQixJQUFJLDZDQUVqQixLQUFLLEVBQUM7QUFDWixNQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3BDLE1BQUksQ0FBQyxXQUFXLEdBQUcsc0JBQVMsWUFBWSxFQUFFLENBQUE7RUFDMUM7O2NBTG1CLElBQUk7O1NBTVAsNkJBQUc7OztBQUVuQixPQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLDBCQUFhLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUEsS0FDM0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBOztBQUV0QyxhQUFVLENBQUMsWUFBSTtBQUFDLDRCQUFXLFVBQVUsQ0FBQyxNQUFLLFdBQVcsQ0FBQyxDQUFBO0lBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUM1RCw4QkFabUIsSUFBSSxtREFZRTtHQUN6Qjs7O1NBQ2lCLDhCQUFHO0FBQ3BCLHlCQUFTLEVBQUUsQ0FBQywwQkFBYSxhQUFhLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ3BELDhCQWhCbUIsSUFBSSxvREFnQkc7R0FDMUI7OztTQUN1QixvQ0FBRzs7O0FBQzFCLGFBQVUsQ0FBQyxZQUFJO0FBQUMsNEJBQVcsYUFBYSxDQUFDLE9BQUssV0FBVyxDQUFDLENBQUE7SUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQy9ELDhCQXBCbUIsSUFBSSwwREFvQlM7R0FDaEM7OztTQUNjLDJCQUFHO0FBQ2pCLDhCQXZCbUIsSUFBSSxpREF1QkE7R0FDdkI7OztTQUNjLHlCQUFDLEVBQUUsRUFBRTtBQUNuQixVQUFPLHNCQUFTLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFBO0dBQy9GOzs7U0FDSyxrQkFBRztBQUNSLDhCQTdCbUIsSUFBSSx3Q0E2QlQ7R0FDZDs7O1NBQ0ssa0JBQUcsRUFDUjs7O1NBQ21CLGdDQUFHO0FBQ3RCLE9BQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUE7QUFDakMseUJBQVMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQzNDLHlCQUFTLEdBQUcsQ0FBQywwQkFBYSxhQUFhLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ3JELDhCQXJDbUIsSUFBSSxzREFxQ0s7R0FDNUI7OztRQXRDbUIsSUFBSTs7O3FCQUFKLElBQUk7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzZCQ0xDLGVBQWU7Ozs7NEJBQ2hCLGNBQWM7Ozs7d0JBQ2xCLFVBQVU7Ozs7MEJBQ1QsV0FBVzs7OztzQkFDZCxRQUFROzs7O3VCQUNQLFNBQVM7Ozs7MkJBQ0QsYUFBYTs7OztvQ0FDUixzQkFBc0I7Ozs7d0NBQ2QsMEJBQTBCOzs7O2tDQUNwQyxvQkFBb0I7Ozs7c0NBQ1osd0JBQXdCOzs7O0lBRXpELGNBQWM7V0FBZCxjQUFjOztBQUNSLFVBRE4sY0FBYyxHQUNMO3dCQURULGNBQWM7O0FBRWxCLDZCQUZJLGNBQWMsNkNBRVg7QUFDUCxNQUFJLENBQUMsbUJBQW1CLEdBQUcsS0FBSyxDQUFBO0VBQ2hDOztjQUpJLGNBQWM7O1NBS0QsOEJBQUc7QUFDcEIseUJBQVMsRUFBRSxDQUFDLDBCQUFhLG1CQUFtQixFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQUNuRSx5QkFBUyxFQUFFLENBQUMsMEJBQWEsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUE7QUFDbkYsOEJBUkksY0FBYyxvREFRUTtHQUMxQjs7O1NBQ2dCLDZCQUFHO0FBQ25CLDhCQVhJLGNBQWMsbURBV087R0FDekI7OztTQUNtQixnQ0FBRztBQUN0Qix5QkFBUyxHQUFHLENBQUMsMEJBQWEsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQ3BFLHlCQUFTLEdBQUcsQ0FBQywwQkFBYSwyQkFBMkIsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtBQUNwRiw4QkFoQkksY0FBYyxzREFnQlU7R0FDNUI7OztTQUNzQixtQ0FBRztBQUN6QixPQUFJLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtHQUM3Qzs7O1NBQ2MsMkJBQUc7Ozs7QUFFakIsT0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsT0FBTSxLQUM5QixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtBQUNsQyxPQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFBO0FBQy9CLE9BQUksQ0FBQyxtQkFBbUIsR0FBRyxVQUFVLENBQUMsWUFBSTtBQUN6QyxVQUFLLG1CQUFtQixHQUFHLEtBQUssQ0FBQTtJQUNoQyxFQUFFLElBQUksQ0FBQyxDQUFBO0dBQ1I7OztTQUNxQixrQ0FBRztBQUN4QixPQUFJLElBQUksR0FBRyxvQkFBTyxVQUFVLEVBQUUsQ0FBQTtBQUM5QixPQUFJLFFBQVEsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFBO0FBQ3RELFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO0FBQ3ZCLFNBQUssQ0FBQztBQUNMLGFBQVEsQ0FBQyxJQUFJLHVCQUFVLENBQUE7QUFDdkIsYUFBUSxDQUFDLE9BQU8sMkJBQWtCLENBQUE7QUFDbEMsV0FBSztBQUFBLEFBQ04sU0FBSyxDQUFDO0FBQ0wsYUFBUSxDQUFDLElBQUksb0NBQXVCLENBQUE7QUFDcEMsYUFBUSxDQUFDLE9BQU8sd0NBQStCLENBQUE7QUFDL0MsV0FBSztBQUFBLEFBQ04sU0FBSyxDQUFDO0FBQ0wsYUFBUSxDQUFDLElBQUksa0NBQXFCLENBQUE7QUFDbEMsYUFBUSxDQUFDLE9BQU8sc0NBQTZCLENBQUE7QUFDN0MsV0FBSztBQUFBLEFBQ047QUFDQyxhQUFRLENBQUMsSUFBSSx1QkFBVSxDQUFBO0FBQ3ZCLGFBQVEsQ0FBQyxPQUFPLDJCQUFrQixDQUFBO0FBQUEsSUFDbkM7O0FBRUQsT0FBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFDN0MsT0FBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUE7R0FDeEQ7OztTQUNLLGtCQUFHO0FBQ1IsT0FBRyxJQUFJLENBQUMsZ0JBQWdCLElBQUksU0FBUyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtHQUNyRTs7O1FBeERJLGNBQWM7OztxQkEyREwsY0FBYzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7K0JDdkVGLGdCQUFnQjs7OzswQkFDcEIsWUFBWTs7Ozt3QkFDZCxVQUFVOzs7O3NCQUNaLFFBQVE7Ozs7Ozs0QkFFRixjQUFjOzs7O3FCQUNyQixPQUFPOzs7O3dCQUNKLFVBQVU7Ozs7NEJBQ04sY0FBYzs7Ozs2QkFDYixlQUFlOzs7O3FCQUNWLE9BQU87OzRCQUVsQixlQUFlOzs7O0lBRWQsa0JBQWtCO1dBQWxCLGtCQUFrQjs7QUFDM0IsVUFEUyxrQkFBa0IsQ0FDMUIsS0FBSyxFQUFFO3dCQURDLGtCQUFrQjs7QUFFckMsT0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxzQkFBUyxjQUFjLEVBQUUsQ0FBQTtBQUNyRCw2QkFIbUIsa0JBQWtCLDZDQUcvQixLQUFLLEVBQUM7QUFDWixNQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtBQUMxQixNQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO0FBQy9CLE1BQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFBO0FBQ3JCLE1BQUksQ0FBQyxTQUFTLEdBQUcsMEJBQWEsSUFBSSxDQUFBO0FBQ2xDLE1BQUksQ0FBQyw0QkFBNEIsR0FBRyxxQkFBcUIsQ0FBQTtBQUN6RCxNQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtBQUN0QixNQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQTtFQUN0Qjs7Y0FYbUIsa0JBQWtCOztTQVlyQiw2QkFBRztBQUNuQixPQUFJLENBQUMsVUFBVSxHQUFHO0FBQ2pCLHlCQUFxQixFQUFFLFNBQVM7QUFDaEMseUJBQXFCLEVBQUUsU0FBUztJQUNoQyxDQUFBOztBQUVELE9BQUksQ0FBQyxRQUFRLEdBQUcsc0JBQVMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBOztBQUVsRCxPQUFJLEtBQUssR0FBRyxzQkFBUyxxQkFBcUIsRUFBRSxDQUFBO0FBQzVDLE9BQUksd0JBQXdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtBQUM3RSxPQUFJLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtBQUN0RSxPQUFJLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtBQUN0RSxPQUFJLENBQUMsVUFBVSxHQUFHO0FBQ2pCLHlCQUFxQixFQUFFO0FBQ3RCLE9BQUUsRUFBRSxVQUFVO0FBQ2Qsa0JBQWEsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO0FBQ2pELGNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNqQyxpQkFBWSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7S0FDL0M7QUFDRCx5QkFBcUIsRUFBRTtBQUN0QixPQUFFLEVBQUUsVUFBVTtBQUNkLGtCQUFhLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztBQUNqRCxjQUFTLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDakMsaUJBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO0tBQy9DO0lBQ0QsQ0FBQTs7QUFFRCxPQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2hELE9BQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDbEQsT0FBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNoRCxPQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBOztBQUV0RCxPQUFJLENBQUMsV0FBVyxHQUFHLDBCQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLDBCQUFhLElBQUksQ0FBQyxDQUFBO0FBQ3BGLE9BQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7QUFDL0MsT0FBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0FBQ3BDLE9BQUksQ0FBQyxPQUFPLEdBQUcsMEJBQWEsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsMEJBQWEsS0FBSyxDQUFDLENBQUE7QUFDN0UsT0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQTtBQUMzQyxPQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUE7QUFDaEMsT0FBSSxDQUFDLE9BQU8sR0FBRywwQkFBYSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSwwQkFBYSxNQUFNLENBQUMsQ0FBQTtBQUM5RSxPQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFBO0FBQzVDLE9BQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTs7QUFFaEMsT0FBSSxDQUFDLE1BQU0sR0FBRyw4QkFBaUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzVFLE9BQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7QUFDMUMsT0FBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFBOztBQUUvQixPQUFJLENBQUMsU0FBUyxHQUFHLDhCQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDMUUsT0FBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQTtBQUNoRCxPQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLENBQUE7O0FBRWxDLE9BQUksQ0FBQyxZQUFZLEdBQUcsK0JBQWtCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtBQUNoRixPQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLENBQUE7Ozs7OztBQU1yQyxPQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3RDLGdDQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDakQsNkJBQVEsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTs7QUFFbkMsT0FBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7QUFDL0IsSUFBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBOztBQUU1Qyw4QkE1RW1CLGtCQUFrQixtREE0RVo7R0FDekI7OztTQUNRLG1CQUFDLFNBQVMsRUFBRTtBQUNwQixPQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7R0FDcEI7OztTQUNNLGlCQUFDLENBQUMsRUFBRTtBQUNWLElBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtBQUNsQixPQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFBO0FBQ3hCLDZCQUFRLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtHQUNyQjs7O1NBQ2MsMkJBQUc7QUFDakIsT0FBSSxHQUFHLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUE7QUFDOUIsdUJBQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQ25COzs7U0FDWSx5QkFBRzs7O0FBQ2YsT0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsT0FBTTtBQUNoQyxPQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO0FBQzVCLE9BQUksT0FBTyxHQUFHLHNCQUFTLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDL0IsT0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ2xCLFFBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFBO0FBQ3RCLFlBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO0FBQ3JGLFlBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtJQUMvRixNQUFJO0FBQ0osUUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7QUFDckIsWUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtBQUM1RixZQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7SUFDOUY7QUFDRCxlQUFZLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDckMsYUFBVSxDQUFDLFlBQUk7QUFDZCxVQUFLLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtJQUM3QixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQUNwQixPQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLElBQUksSUFBSSxFQUFFO0FBQzlDLFFBQUksQ0FBQyxrQkFBa0IsR0FBRyxVQUFVLENBQUMsWUFBSTtBQUN4QyxXQUFLLHlCQUF5QixFQUFFLENBQUE7S0FDaEMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDcEI7R0FDRDs7O1NBQ1csd0JBQUc7QUFDZCxVQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0dBQ2xCOzs7U0FDVyxzQkFBQyxTQUFTLEVBQUU7QUFDdkIsT0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsT0FBTTtBQUNoQyxXQUFPLFNBQVM7QUFDZixTQUFLLDBCQUFhLElBQUk7QUFDckIsU0FBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0FBQ2YsV0FBSztBQUFBLEFBQ04sU0FBSywwQkFBYSxLQUFLO0FBQ3RCLFNBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtBQUNYLFdBQUs7QUFBQSxJQUNOO0FBQ0QsT0FBSSxDQUFDLFlBQVksRUFBRSxDQUFBO0dBQ25COzs7U0FDVyxzQkFBQyxDQUFDLEVBQUU7QUFDZixPQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxPQUFNO0FBQzdCLElBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtBQUNyQixXQUFPLENBQUMsQ0FBQyxLQUFLO0FBQ1AsU0FBSyxFQUFFOztBQUNOLFNBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtBQUNmLFNBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtBQUNuQixXQUFNO0FBQUEsQUFDUCxTQUFLLEVBQUU7O0FBQ04sU0FBSSxDQUFDLElBQUksRUFBRSxDQUFBO0FBQ1gsU0FBSSxDQUFDLFlBQVksRUFBRSxDQUFBO0FBQ25CLFdBQU07QUFBQSxBQUNQLFNBQUssRUFBRTs7QUFDTixTQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7QUFDcEIsV0FBTTtBQUFBLEFBQ1AsU0FBSyxFQUFFOztBQUNOLFNBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtBQUNwQixXQUFNO0FBQUEsQUFDUDtBQUFTLFlBQU87QUFBQSxJQUNuQjtHQUNKOzs7U0FDVyx3QkFBRztBQUNkLE9BQUksR0FBRyxHQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO0FBQ3hELHVCQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtHQUNuQjs7O1NBQ0csZ0JBQUc7QUFDTixPQUFJLENBQUMsU0FBUyxHQUFHLDBCQUFhLElBQUksQ0FBQTtBQUNsQyxPQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQTtBQUN0QixPQUFJLENBQUMsWUFBWSxHQUFHLEFBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7R0FDeEY7OztTQUNPLG9CQUFHO0FBQ1YsT0FBSSxDQUFDLFNBQVMsR0FBRywwQkFBYSxLQUFLLENBQUE7QUFDbkMsT0FBSSxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUE7QUFDdEIsT0FBSSxDQUFDLFlBQVksR0FBRyxBQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxHQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO0dBQ3hGOzs7U0FDMkIsc0NBQUMsU0FBUyxFQUFFO0FBQ3ZDLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM5QyxRQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsRUFBRTtBQUNwQyxZQUFPLENBQUMsQ0FBQTtLQUNSO0lBQ0Q7R0FDRDs7O1NBQ29CLGlDQUFHO0FBQ3ZCLE9BQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7QUFDOUIsT0FBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7R0FDL0I7OztTQUN1QixvQ0FBRztBQUMxQixPQUFJLFNBQVMsR0FBRyxvQkFBTyxVQUFVLEVBQUUsQ0FBQTtBQUNuQyxPQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUNoRCxPQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUNoRSxPQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQy9COzs7U0FDYyx5QkFBQyxFQUFFLEVBQUU7QUFDbkIsT0FBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQTtBQUM1QixPQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtBQUNuQixPQUFJLENBQUMsNEJBQTRCLEdBQUcsQUFBQyxJQUFJLENBQUMsNEJBQTRCLEtBQUsscUJBQXFCLEdBQUkscUJBQXFCLEdBQUcscUJBQXFCLENBQUE7QUFDakosT0FBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtBQUM5QyxPQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQTs7QUFFMUUsT0FBSSxDQUFDLDBCQUEwQixFQUFFLENBQUE7QUFDakMsT0FBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7QUFDMUIsT0FBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7R0FDeEI7OztTQUN5QixzQ0FBRztBQUM1QixPQUFJLFlBQVksR0FBRyxzQkFBUyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUMzRSxPQUFJLE1BQU0sR0FBRyxzQkFBUyxjQUFjLEVBQUUsVUFBTyxHQUFHLGlCQUFpQixHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsTUFBTSxDQUFBO0FBQ3ZILE9BQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtBQUNuRCxPQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7R0FDM0M7OztTQUN3QixxQ0FBRztBQUMzQixPQUFJLE9BQU8sR0FBRyxTQUFTLENBQUE7QUFDdkIsT0FBSSxTQUFTLEdBQUcsOENBQThDLEdBQUMsT0FBTyxHQUFDLDZJQUE2SSxDQUFBO0FBQ3BOLE9BQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQ2xELE9BQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO0dBQ3pDOzs7U0FDZ0IsNkJBQUc7OztBQUNuQixPQUFJLE9BQU8sR0FBRyxzQkFBUyxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQy9CLE9BQUksT0FBTyxHQUFHLHNCQUFTLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDL0IsT0FBSSxHQUFHLEdBQUcsQUFBQyxJQUFJLENBQUMsU0FBUyxJQUFJLDBCQUFhLElBQUksR0FBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDeEQsT0FBSSxJQUFJLEdBQUcsQUFBQyxJQUFJLENBQUMsaUJBQWlCLElBQUksU0FBUyxHQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDeEQsT0FBRyxJQUFJLENBQUMsaUJBQWlCLElBQUksU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE9BQU8sR0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtBQUMzSyxXQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxFQUFDLE9BQU8sR0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBOztBQUVwSSxhQUFVLENBQUMsWUFBSTtBQUNkLFdBQUsseUJBQXlCLEVBQUUsQ0FBQTtBQUNoQyxXQUFLLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN4QixFQUFFLEdBQUcsQ0FBQyxDQUFBOztBQUVQLGFBQVUsQ0FBQyxZQUFJO0FBQ2QsV0FBSyxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7QUFDN0IsV0FBSyw2QkFBNkIsRUFBRSxDQUFBO0lBQ3BDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQ3BCLGVBQVksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtBQUNyQyxPQUFHLElBQUksQ0FBQyxTQUFTLEVBQUU7QUFDbEIsUUFBSSxDQUFDLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxZQUFJO0FBQ3hDLFlBQUsseUJBQXlCLEVBQUUsQ0FBQTtLQUNoQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUNwQjtHQUNEOzs7U0FDNEIseUNBQUc7QUFDL0IsT0FBRyxJQUFJLENBQUMsaUJBQWlCLElBQUksU0FBUyxFQUFFLE9BQU07QUFDOUMsT0FBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDNUMsT0FBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksR0FBRyxLQUFLLENBQUE7R0FDMUM7OztTQUNzQixtQ0FBRzs7O0FBR3pCLDhCQTNPbUIsa0JBQWtCLHlEQTJPTjtHQUMvQjs7O1NBQ3VCLG9DQUFHO0FBQzFCLDhCQTlPbUIsa0JBQWtCLDBEQThPTDtHQUNoQzs7O1NBQ0ssa0JBQUc7O0dBRVI7OztTQUNrQiwrQkFBRztBQUNyQixPQUFJLE9BQU8sR0FBRyxzQkFBUyxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQy9CLE9BQUksT0FBTyxHQUFHLHNCQUFTLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDL0IsT0FBSSxXQUFXLEdBQUcsbUJBQU0sNEJBQTRCLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxPQUFPLEdBQUcsR0FBRyxFQUFFLDBCQUFhLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLDBCQUFhLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDNUosT0FBSSxXQUFXLEdBQUcsbUJBQU0sNEJBQTRCLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxPQUFPLEdBQUcsR0FBRyxFQUFFLDBCQUFhLGNBQWMsRUFBRSwwQkFBYSxjQUFjLENBQUMsQ0FBQTtBQUM1SSxPQUFJLENBQUMsWUFBWSxHQUFHO0FBQ25CLFNBQUssRUFBRSxXQUFXLENBQUMsS0FBSztBQUN4QixVQUFNLEVBQUUsV0FBVyxDQUFDLE1BQU07QUFDMUIsT0FBRyxFQUFFLEFBQUMsT0FBTyxHQUFHLElBQUksSUFBSyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQSxBQUFDO0FBQ2pELFFBQUksRUFBRSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUEsSUFBSyxXQUFXLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQSxBQUFDO0lBQy9DLENBQUE7QUFDRCxPQUFJLFFBQVEsR0FBRztBQUNkLFNBQUssRUFBRSxXQUFXLENBQUMsS0FBSztBQUN4QixVQUFNLEVBQUUsV0FBVyxDQUFDLE1BQU07QUFDMUIsT0FBRyxFQUFFLE9BQU8sR0FBSSxPQUFPLEdBQUcsSUFBSSxBQUFDLElBQUksV0FBVyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUEsQUFBQztBQUMzRCxRQUFJLEVBQUUsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFBLElBQUssV0FBVyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUEsQUFBQztJQUMvQyxDQUFBO0FBQ0QsT0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUEsS0FDcEUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDcEQsT0FBRyxJQUFJLENBQUMsaUJBQWlCLElBQUksU0FBUyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNuRixPQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDMUMsT0FBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQzFELE9BQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0dBQ2hEOzs7U0FDd0IscUNBQUc7QUFDM0IsT0FBSSxPQUFPLEdBQUcsc0JBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUMvQixPQUFJLE9BQU8sR0FBRyxzQkFBUyxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQy9CLE9BQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUN6QixDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUEsSUFBSyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUEsQUFBQyxFQUMvQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQSxHQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLEdBQUcsQUFBQyxDQUMvRCxDQUFBO0FBQ0QsT0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQ3RCLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLDBCQUFhLGNBQWMsSUFBSSxDQUFDLENBQUEsQUFBQyxFQUMvRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FDbkIsQ0FBQTtBQUNELE9BQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSwwQkFBYSxjQUFjLElBQUksQ0FBQyxDQUFBLEFBQUMsRUFDbEYsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQ25CLENBQUE7R0FDRDs7O1NBQ0ssa0JBQUc7QUFDUixPQUFJLE9BQU8sR0FBRyxzQkFBUyxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQy9CLE9BQUksT0FBTyxHQUFHLHNCQUFTLE1BQU0sQ0FBQyxDQUFDLENBQUE7Ozs7Ozs7QUFPL0IsT0FBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7O0FBRTFCLE9BQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUN4QixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQSxJQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQSxBQUFDLEdBQUcsQ0FBQyxFQUNqRSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUEsSUFBSyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUEsQUFBQyxDQUM5QyxDQUFBO0FBQ0QsT0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQ3BCLEFBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLElBQUssQUFBQyxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUEsQUFBQyxJQUFLLENBQUMsQ0FBQSxBQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFBLEFBQUMsR0FBRyxDQUFDLEVBQzFKLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQSxJQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQSxBQUFDLENBQy9DLENBQUE7QUFDRCxPQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FDcEIsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFBLElBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFBLEFBQUMsRUFDMUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLElBQUksQUFBQyxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUEsQUFBQyxJQUFLLENBQUMsQ0FBQSxBQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFBLEFBQUMsQ0FDckosQ0FBQTs7QUFFRCxPQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQTs7QUFFaEMsT0FBSSxRQUFRLEdBQUc7QUFDZCxTQUFLLEVBQUUsT0FBTztBQUNkLFVBQU0sRUFBRSxPQUFPO0lBQ2YsQ0FBQTtBQUNELE9BQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBOztBQUV4Qiw4QkEzVG1CLGtCQUFrQix3Q0EyVHZCO0dBQ2Q7OztTQUNtQixnQ0FBRztBQUN0QixJQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDN0MsZUFBWSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0FBQ3JDLG1DQUFvQixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDcEQsNkJBQVEsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBOztBQUV6QixPQUFJLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLENBQUE7QUFDdkMsT0FBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0FBQ25DLE9BQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtBQUNuQyxPQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLENBQUE7QUFDbEMsT0FBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0FBQ3JDLDhCQXhVbUIsa0JBQWtCLHNEQXdVVDtHQUM1Qjs7O1FBelVtQixrQkFBa0I7OztxQkFBbEIsa0JBQWtCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrQkNkWixnQkFBZ0I7Ozs7MEJBQ3BCLFlBQVk7Ozs7d0JBQ2QsVUFBVTs7OztrQ0FDQSxvQkFBb0I7Ozs7NEJBQzFCLGNBQWM7Ozs7c0JBQ3BCLFFBQVE7Ozs7d0JBQ04sVUFBVTs7OztxQkFDYixPQUFPOzs7O3VCQUNMLFNBQVM7Ozs7c0JBQ1YsUUFBUTs7OzswQkFDSixZQUFZOzs7O0lBRWQsb0JBQW9CO1dBQXBCLG9CQUFvQjs7QUFDN0IsVUFEUyxvQkFBb0IsQ0FDNUIsS0FBSyxFQUFFO3dCQURDLG9CQUFvQjs7QUFFdkMsNkJBRm1CLG9CQUFvQiw2Q0FFakMsS0FBSyxFQUFDO0VBQ1o7O2NBSG1CLG9CQUFvQjs7U0FJdkIsNkJBQUc7O0FBRW5CLE9BQUksS0FBSyxHQUFHLHNCQUFTLHFCQUFxQixFQUFFLENBQUE7O0FBRTVDLE9BQUksQ0FBQyxrQkFBa0IsR0FBRyxvQ0FBdUIsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDOUUsT0FBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFBO0FBQ3BDLE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBOztBQUUzQyxPQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQzdDLE9BQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQTtBQUMvQixPQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUE7O0FBRW5DLE9BQUksQ0FBQyxhQUFhLEdBQUcsOEJBQWlCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQ2hHLE9BQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtBQUN4RCxPQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUFFLENBQUE7O0FBRXRDLDhCQXBCbUIsb0JBQW9CLG1EQW9CZDtHQUN6Qjs7O1NBQ2tCLCtCQUFHO0FBQ3JCLE9BQUksR0FBRyxHQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQTtBQUNyQyx1QkFBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7R0FDbkI7OztTQUNnQiwyQkFBQyxFQUFFLEVBQUU7QUFDckIsV0FBTyxFQUFFO0FBQ1IsU0FBSyxLQUFLO0FBQUUsK0JBQVk7QUFBQSxBQUN4QixTQUFLLE9BQU87QUFBRSxpQ0FBYztBQUFBLEFBQzVCLFNBQUssUUFBUTtBQUFFLGtDQUFlO0FBQUEsQUFDOUIsU0FBSyxNQUFNO0FBQUUsZ0NBQWE7QUFBQSxBQUMxQixTQUFLLFVBQVU7QUFBRSxvQ0FBaUI7QUFBQSxJQUNsQztHQUNEOzs7U0FDdUIsb0NBQUc7QUFDMUIsOEJBcENtQixvQkFBb0IsMERBb0NQO0dBQ2hDOzs7U0FDc0IsbUNBQUc7QUFDekIsOEJBdkNtQixvQkFBb0IseURBdUNSO0FBQy9CLE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO0dBQ2pEOzs7U0FDZ0IsNkJBQUc7QUFDbkIsOEJBM0NtQixvQkFBb0IsbURBMkNkO0FBQ3pCLE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0dBQzNDOzs7U0FDSyxrQkFBRztBQUNSLE9BQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUE7QUFDeEIsT0FBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxDQUFBO0dBQ2hDOzs7U0FDSyxrQkFBRzs7O0FBQ1IsT0FBSSxPQUFPLEdBQUcsc0JBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUMvQixPQUFJLE9BQU8sR0FBRyxzQkFBUyxNQUFNLENBQUMsQ0FBQyxDQUFBOztBQUUvQixPQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFBO0FBQ3hCLE9BQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTs7QUFFaEMsYUFBVSxDQUFDLFlBQUk7QUFDZCxRQUFJLHNCQUFzQixHQUFHLE1BQUssa0JBQWtCLENBQUMsQ0FBQyxHQUFHLE1BQUssa0JBQWtCLENBQUMsTUFBTSxDQUFBO0FBQ3ZGLFVBQUssYUFBYSxDQUFDLFFBQVEsQ0FDMUIsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFBLElBQUssTUFBSyxhQUFhLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQSxBQUFDLEVBQ2hELHNCQUFzQixJQUFJLE1BQUssYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUEsQUFBQyxDQUN6RCxDQUFBO0lBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQTs7QUFFTCw4QkFqRW1CLG9CQUFvQix3Q0FpRXpCO0dBQ2Q7OztTQUNtQixnQ0FBRztBQUN0QixPQUFJLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtBQUM5QyxPQUFJLENBQUMsYUFBYSxDQUFDLG9CQUFvQixFQUFFLENBQUE7QUFDekMsOEJBdEVtQixvQkFBb0Isc0RBc0VYO0dBQzVCOzs7UUF2RW1CLG9CQUFvQjs7O3FCQUFwQixvQkFBb0I7Ozs7Ozs7Ozs7Ozs7Ozs7b0JDWnhCLE1BQU07Ozs7NEJBQ0UsY0FBYzs7OztxQkFDckIsT0FBTzs7Ozt3QkFDSixVQUFVOzs7O0lBRVYsWUFBWTtBQUNyQixVQURTLFlBQVksQ0FDcEIsT0FBTyxFQUFFLFFBQVEsRUFBRTt3QkFEWCxZQUFZOztBQUUvQixNQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtBQUN0QixNQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtFQUN4Qjs7Y0FKbUIsWUFBWTs7U0FLZiw2QkFBRzs7O0FBQ25CLE9BQUksQ0FBQyxNQUFNLEdBQUcsc0JBQVMsV0FBVyxFQUFFLENBQUE7QUFDcEMsT0FBSSxDQUFDLEtBQUssR0FBRyxzQkFBUyxXQUFXLEVBQUUsQ0FBQTtBQUNuQyxPQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtBQUNkLE9BQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ2YsT0FBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDeEMsT0FBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDeEMsT0FBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDN0MsT0FBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ2QsT0FBSSxRQUFRLEdBQUcsRUFBRSxDQUFBO0FBQ2pCLE9BQUksUUFBUSxHQUFHLEVBQUUsQ0FBQTtBQUNqQixPQUFJLENBQUMsUUFBUSxHQUFHLHNCQUFTLFlBQVksRUFBRSxDQUFBO0FBQ3ZDLFVBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBOztBQUUzQixhQUFVLENBQUMsWUFBSTs7QUFFZCxRQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDNUIsUUFBSSxNQUFNLEdBQUcsMEJBQWEsZ0JBQWdCLENBQUE7O0FBRTFDLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3hDLFNBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN4QixTQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtLQUN0QixDQUFDO0FBQ0YsU0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDeEMsU0FBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3hCLFNBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLE1BQUssUUFBUSxDQUFDLENBQUE7S0FDdkMsQ0FBQzs7QUFFRixVQUFLLEtBQUssR0FBRyxNQUFNLElBQUksUUFBUSxJQUFJLENBQUMsQ0FBQSxBQUFDLENBQUE7QUFDckMsVUFBSyxNQUFNLEdBQUcsTUFBTSxJQUFJLFFBQVEsSUFBSSxDQUFDLENBQUEsQUFBQyxDQUFBO0FBQ3RDLFdBQU8sQ0FBQyxHQUFHLENBQUM7QUFDWCxTQUFJLEVBQUUsQ0FBQyxNQUFLLEtBQUssSUFBSSxDQUFDLENBQUEsSUFBSyxNQUFNLElBQUksQ0FBQyxDQUFBLEFBQUM7QUFDdkMsUUFBRyxFQUFFLENBQUMsTUFBSyxNQUFNLElBQUksQ0FBQyxDQUFBLElBQUssTUFBTSxJQUFJLENBQUMsQ0FBQSxBQUFDO0tBQ3ZDLENBQUMsQ0FBQTtBQUNGLFVBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUNoQixVQUFLLEVBQUUsTUFBSyxLQUFLO0FBQ2pCLFdBQU0sRUFBRSxNQUFLLE1BQU07S0FDbkIsQ0FBQyxDQUFBOztBQUVGLFFBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsUUFBSSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUN2QixRQUFJLFlBQVksR0FBRyxHQUFHLENBQUE7QUFDdEIsS0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdEIsU0FBSSxFQUFFLE1BQU0sR0FBRyxDQUFDO0FBQ2hCLFNBQUksRUFBRSxNQUFNLEdBQUcsQ0FBQztLQUNoQixDQUFDLENBQUE7QUFDRixLQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN0QixTQUFJLEVBQUUsTUFBSyxLQUFLLEdBQUcsTUFBTTtBQUN6QixTQUFJLEVBQUUsTUFBTSxHQUFHLENBQUM7S0FDaEIsQ0FBQyxDQUFBO0FBQ0YsS0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdEIsU0FBSSxFQUFFLE1BQU0sR0FBRyxDQUFDO0FBQ2hCLFNBQUksRUFBRSxNQUFLLE1BQU0sR0FBRyxNQUFNO0tBQzFCLENBQUMsQ0FBQTtBQUNGLEtBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3RCLFNBQUksRUFBRSxNQUFLLEtBQUssR0FBRyxNQUFNO0FBQ3pCLFNBQUksRUFBRSxNQUFLLE1BQU0sR0FBRyxNQUFNO0tBQzFCLENBQUMsQ0FBQTtBQUNGLEtBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3RCLFNBQUksRUFBRSxNQUFNLEdBQUcsQ0FBQztBQUNoQixTQUFJLEVBQUUsTUFBTSxHQUFHLENBQUM7QUFDaEIsU0FBSSxFQUFFLE1BQUssS0FBSyxHQUFHLE1BQU07QUFDekIsU0FBSSxFQUFFLE1BQU0sR0FBRyxDQUFDO0tBQ2hCLENBQUMsQ0FBQTtBQUNGLEtBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3RCLFNBQUksRUFBRSxNQUFLLEtBQUssR0FBRyxNQUFNO0FBQ3pCLFNBQUksRUFBRSxNQUFNLEdBQUcsQ0FBQztBQUNoQixTQUFJLEVBQUUsTUFBSyxLQUFLLEdBQUcsTUFBTTtBQUN6QixTQUFJLEVBQUUsTUFBSyxNQUFNLEdBQUcsTUFBTTtLQUMxQixDQUFDLENBQUE7QUFDRixLQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN0QixTQUFJLEVBQUUsTUFBSyxLQUFLLEdBQUcsTUFBTTtBQUN6QixTQUFJLEVBQUUsTUFBSyxNQUFNLEdBQUcsTUFBTTtBQUMxQixTQUFJLEVBQUUsTUFBTSxHQUFHLENBQUM7QUFDaEIsU0FBSSxFQUFFLE1BQUssTUFBTSxHQUFHLE1BQU07S0FDMUIsQ0FBQyxDQUFBO0FBQ0YsS0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdEIsU0FBSSxFQUFFLE1BQU0sR0FBRyxDQUFDO0FBQ2hCLFNBQUksRUFBRSxNQUFNLEdBQUcsQ0FBQztBQUNoQixTQUFJLEVBQUUsTUFBTSxHQUFHLENBQUM7QUFDaEIsU0FBSSxFQUFFLE1BQUssTUFBTSxHQUFHLE1BQU07S0FDMUIsQ0FBQyxDQUFBOztBQUVGLFVBQUssTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDcEYsVUFBSyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDbkYsVUFBSyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDbkYsVUFBSyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2xGLFVBQUssTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDckgsVUFBSyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDcEgsVUFBSyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxlQUFlLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDcEgsVUFBSyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTs7QUFFckgsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pGLFVBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNqRixVQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakYsVUFBSyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pGLFVBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pILFVBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pILFVBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2pILFVBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBOztBQUVqSCxVQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDcEIsVUFBSyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBOztBQUVuQixVQUFLLFFBQVEsR0FBRyxNQUFLLFFBQVEsQ0FBQyxJQUFJLE9BQU0sQ0FBQTtBQUN4QyxVQUFLLE9BQU8sR0FBRyxNQUFLLE9BQU8sQ0FBQyxJQUFJLE9BQU0sQ0FBQTtBQUN0QyxVQUFLLEtBQUssR0FBRyxNQUFLLEtBQUssQ0FBQyxJQUFJLE9BQU0sQ0FBQTtBQUNsQyxVQUFLLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLE1BQUssUUFBUSxDQUFDLENBQUE7QUFDNUMsVUFBSyxPQUFP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LE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUM3RCxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7OztBQUduRSxRQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUM3QyxTQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBLEdBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUEsSUFBSyxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0FBQzNILFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTs7O0FBR3pDLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLFNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7QUFHakMsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDM0UsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7OztBQUczRSxTQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDcEMsU0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLFNBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNwQyxTQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7OztBQUdwQyxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUMzRSxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTs7QUFFM0UsU0FBSyxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNyQixTQUFLLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzNCLFNBQUssQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDM0IsU0FBSyxDQUFDLEVBQUUs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QUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUM3QyxRQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUM3QixRQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pELE1BQUk7QUFDSixRQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQzlEO0FBQ0QsT0FBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUE7QUFDM0IsT0FBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7QUFDL0IsT0FBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUE7QUFDbkMsUUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM3QixRQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3hCLFFBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2xDLGdCQUFZLEdBQUcsQUFBQyxZQUFZLElBQUksU0FBUyxHQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQTs7QUFFN0UsdUJBQU0sUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVB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Q0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQUN0QyxPQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUE7QUFDdEMsOEJBdEZJLFNBQVMsc0RBc0ZlO0dBQzVCOzs7UUF2RkksU0FBUzs7O3FCQTBGQSxTQUFTOzs7O0FDaEd4QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cy5EaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9saWIvRGlzcGF0Y2hlcicpXG4iLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIERpc3BhdGNoZXJcbiAqIEB0eXBlY2hlY2tzXG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCcuL2ludmFyaWFudCcpO1xuXG52YXIgX2xhc3RJRCA9IDE7XG52YXIgX3ByZWZpeCA9ICdJRF8nO1xuXG4vKipcbiAqIERpc3BhdGNoZXIgaXMgdXNlZCB0byBicm9hZGNhc3QgcGF5bG9hZHMgdG8gcmVnaXN0ZXJlZCBjYWxsYmFja3MuIFRoaXMgaXNcbiAqIGRpZmZlcmVudCBmcm9tIGdlbmVyaWMgcHViLXN1YiBzeXN0ZW1zIGluIHR3byB3YXlzOlxuICpcbiAqICAgMSkgQ2FsbGJhY2tzIGFyZSBub3Qgc3Vic2NyaWJlZCB0byBwYXJ0aWN1bGFyIGV2ZW50cy4gRXZlcnkgcGF5bG9hZCBpc1xuICogICAgICBkaXNwYXRjaGVkIHRvIGV2ZXJ5IHJlZ2lzdGVyZWQgY2FsbGJhY2suXG4gKiAgIDIpIENhbGxiYWNrcyBjYW4gYmUgZGVmZXJyZWQgaW4gd2hvbGUgb3IgcGFydCB1bnRpbCBvdGhlciBjYWxsYmFja3MgaGF2ZVxuICogICAgICBiZWVuIGV4ZWN1dGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGlzIGh5cG90aGV0aWNhbCBmbGlnaHQgZGVzdGluYXRpb24gZm9ybSwgd2hpY2hcbiAqIHNlbGVjdHMgYSBkZWZhdWx0IGNpdHkgd2hlbiBhIGNvdW50cnkgaXMgc2VsZWN0ZWQ6XG4gKlxuICogICB2YXIgZmxpZ2h0RGlzcGF0Y2hlciA9IG5ldyBEaXNwYXRjaGVyKCk7XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjb3VudHJ5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDb3VudHJ5U3RvcmUgPSB7Y291bnRyeTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjaXR5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDaXR5U3RvcmUgPSB7Y2l0eTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgYmFzZSBmbGlnaHQgcHJpY2Ugb2YgdGhlIHNlbGVjdGVkIGNpdHlcbiAqICAgdmFyIEZsaWdodFByaWNlU3RvcmUgPSB7cHJpY2U6IG51bGx9XG4gKlxuICogV2hlbiBhIHVzZXIgY2hhbmdlcyB0aGUgc2VsZWN0ZWQgY2l0eSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY2l0eS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ2l0eTogJ3BhcmlzJ1xuICogICB9KTtcbiAqXG4gKiBUaGlzIHBheWxvYWQgaXMgZGlnZXN0ZWQgYnkgYENpdHlTdG9yZWA6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY2l0eS11cGRhdGUnKSB7XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IHBheWxvYWQuc2VsZWN0ZWRDaXR5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgdXNlciBzZWxlY3RzIGEgY291bnRyeSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY291bnRyeS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ291bnRyeTogJ2F1c3RyYWxpYSdcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGJvdGggc3RvcmVzOlxuICpcbiAqICAgIENvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgQ291bnRyeVN0b3JlLmNvdW50cnkgPSBwYXlsb2FkLnNlbGVjdGVkQ291bnRyeTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIGNhbGxiYWNrIHRvIHVwZGF0ZSBgQ291bnRyeVN0b3JlYCBpcyByZWdpc3RlcmVkLCB3ZSBzYXZlIGEgcmVmZXJlbmNlXG4gKiB0byB0aGUgcmV0dXJuZWQgdG9rZW4uIFVzaW5nIHRoaXMgdG9rZW4gd2l0aCBgd2FpdEZvcigpYCwgd2UgY2FuIGd1YXJhbnRlZVxuICogdGhhdCBgQ291bnRyeVN0b3JlYCBpcyB1cGRhdGVkIGJlZm9yZSB0aGUgY2FsbGJhY2sgdGhhdCB1cGRhdGVzIGBDaXR5U3RvcmVgXG4gKiBuZWVkcyB0byBxdWVyeSBpdHMgZGF0YS5cbiAqXG4gKiAgIENpdHlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBtYXkgbm90IGJlIHVwZGF0ZWQuXG4gKiAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIGlzIG5vdyBndWFyYW50ZWVkIHRvIGJlIHVwZGF0ZWQuXG4gKlxuICogICAgICAgLy8gU2VsZWN0IHRoZSBkZWZhdWx0IGNpdHkgZm9yIHRoZSBuZXcgY291bnRyeVxuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBnZXREZWZhdWx0Q2l0eUZvckNvdW50cnkoQ291bnRyeVN0b3JlLmNvdW50cnkpO1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogVGhlIHVzYWdlIG9mIGB3YWl0Rm9yKClgIGNhbiBiZSBjaGFpbmVkLCBmb3IgZXhhbXBsZTpcbiAqXG4gKiAgIEZsaWdodFByaWNlU3RvcmUuZGlzcGF0Y2hUb2tlbiA9XG4gKiAgICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgICBzd2l0Y2ggKHBheWxvYWQuYWN0aW9uVHlwZSkge1xuICogICAgICAgICBjYXNlICdjb3VudHJ5LXVwZGF0ZSc6XG4gKiAgICAgICAgICAgZmxpZ2h0RGlzcGF0Y2hlci53YWl0Rm9yKFtDaXR5U3RvcmUuZGlzcGF0Y2hUb2tlbl0pO1xuICogICAgICAgICAgIEZsaWdodFByaWNlU3RvcmUucHJpY2UgPVxuICogICAgICAgICAgICAgZ2V0RmxpZ2h0UHJpY2VTdG9yZShDb3VudHJ5U3RvcmUuY291bnRyeSwgQ2l0eVN0b3JlLmNpdHkpO1xuICogICAgICAgICAgIGJyZWFrO1xuICpcbiAqICAgICAgICAgY2FzZSAnY2l0eS11cGRhdGUnOlxuICogICAgICAgICAgIEZsaWdodFByaWNlU3RvcmUucHJpY2UgPVxuICogICAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZShDb3VudHJ5U3RvcmUuY291bnRyeSwgQ2l0eVN0b3JlLmNpdHkpO1xuICogICAgICAgICAgIGJyZWFrO1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogVGhlIGBjb3VudHJ5LXVwZGF0ZWAgcGF5bG9hZCB3aWxsIGJlIGd1YXJhbnRlZWQgdG8gaW52b2tlIHRoZSBzdG9yZXMnXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcyBpbiBvcmRlcjogYENvdW50cnlTdG9yZWAsIGBDaXR5U3RvcmVgLCB0aGVuXG4gKiBgRmxpZ2h0UHJpY2VTdG9yZWAuXG4gKi9cblxuICBmdW5jdGlvbiBEaXNwYXRjaGVyKCkge1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmcgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZCA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IGZhbHNlO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCBldmVyeSBkaXNwYXRjaGVkIHBheWxvYWQuIFJldHVybnNcbiAgICogYSB0b2tlbiB0aGF0IGNhbiBiZSB1c2VkIHdpdGggYHdhaXRGb3IoKWAuXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLnJlZ2lzdGVyPWZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIGlkID0gX3ByZWZpeCArIF9sYXN0SUQrKztcbiAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0gPSBjYWxsYmFjaztcbiAgICByZXR1cm4gaWQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBjYWxsYmFjayBiYXNlZCBvbiBpdHMgdG9rZW4uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpZFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUudW5yZWdpc3Rlcj1mdW5jdGlvbihpZCkge1xuICAgIGludmFyaWFudChcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSxcbiAgICAgICdEaXNwYXRjaGVyLnVucmVnaXN0ZXIoLi4uKTogYCVzYCBkb2VzIG5vdCBtYXAgdG8gYSByZWdpc3RlcmVkIGNhbGxiYWNrLicsXG4gICAgICBpZFxuICAgICk7XG4gICAgZGVsZXRlIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXTtcbiAgfTtcblxuICAvKipcbiAgICogV2FpdHMgZm9yIHRoZSBjYWxsYmFja3Mgc3BlY2lmaWVkIHRvIGJlIGludm9rZWQgYmVmb3JlIGNvbnRpbnVpbmcgZXhlY3V0aW9uXG4gICAqIG9mIHRoZSBjdXJyZW50IGNhbGxiYWNrLiBUaGlzIG1ldGhvZCBzaG91bGQgb25seSBiZSB1c2VkIGJ5IGEgY2FsbGJhY2sgaW5cbiAgICogcmVzcG9uc2UgdG8gYSBkaXNwYXRjaGVkIHBheWxvYWQuXG4gICAqXG4gICAqIEBwYXJhbSB7YXJyYXk8c3RyaW5nPn0gaWRzXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS53YWl0Rm9yPWZ1bmN0aW9uKGlkcykge1xuICAgIGludmFyaWFudChcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyxcbiAgICAgICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogTXVzdCBiZSBpbnZva2VkIHdoaWxlIGRpc3BhdGNoaW5nLidcbiAgICApO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBpZHMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICB2YXIgaWQgPSBpZHNbaWldO1xuICAgICAgaWYgKHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSkge1xuICAgICAgICBpbnZhcmlhbnQoXG4gICAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdLFxuICAgICAgICAgICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogQ2lyY3VsYXIgZGVwZW5kZW5jeSBkZXRlY3RlZCB3aGlsZSAnICtcbiAgICAgICAgICAnd2FpdGluZyBmb3IgYCVzYC4nLFxuICAgICAgICAgIGlkXG4gICAgICAgICk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW52YXJpYW50KFxuICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0sXG4gICAgICAgICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogYCVzYCBkb2VzIG5vdCBtYXAgdG8gYSByZWdpc3RlcmVkIGNhbGxiYWNrLicsXG4gICAgICAgIGlkXG4gICAgICApO1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEaXNwYXRjaGVzIGEgcGF5bG9hZCB0byBhbGwgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXlsb2FkXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaD1mdW5jdGlvbihwYXlsb2FkKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgIXRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyxcbiAgICAgICdEaXNwYXRjaC5kaXNwYXRjaCguLi4pOiBDYW5ub3QgZGlzcGF0Y2ggaW4gdGhlIG1pZGRsZSBvZiBhIGRpc3BhdGNoLidcbiAgICApO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfc3RhcnREaXNwYXRjaGluZyhwYXlsb2FkKTtcbiAgICB0cnkge1xuICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MpIHtcbiAgICAgICAgaWYgKHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2soaWQpO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX3N0b3BEaXNwYXRjaGluZygpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogSXMgdGhpcyBEaXNwYXRjaGVyIGN1cnJlbnRseSBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmlzRGlzcGF0Y2hpbmc9ZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZztcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbCB0aGUgY2FsbGJhY2sgc3RvcmVkIHdpdGggdGhlIGdpdmVuIGlkLiBBbHNvIGRvIHNvbWUgaW50ZXJuYWxcbiAgICogYm9va2tlZXBpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrPWZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdID0gdHJ1ZTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0odGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCk7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdID0gdHJ1ZTtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IHVwIGJvb2trZWVwaW5nIG5lZWRlZCB3aGVuIGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcGF5bG9hZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX3N0YXJ0RGlzcGF0Y2hpbmc9ZnVuY3Rpb24ocGF5bG9hZCkge1xuICAgIGZvciAodmFyIGlkIGluIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzKSB7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0gPSBmYWxzZTtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkW2lkXSA9IGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gcGF5bG9hZDtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDbGVhciBib29ra2VlcGluZyB1c2VkIGZvciBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS4kRGlzcGF0Y2hlcl9zdG9wRGlzcGF0Y2hpbmc9ZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IG51bGw7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gIH07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBEaXNwYXRjaGVyO1xuIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgaW52YXJpYW50XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogVXNlIGludmFyaWFudCgpIHRvIGFzc2VydCBzdGF0ZSB3aGljaCB5b3VyIHByb2dyYW0gYXNzdW1lcyB0byBiZSB0cnVlLlxuICpcbiAqIFByb3ZpZGUgc3ByaW50Zi1zdHlsZSBmb3JtYXQgKG9ubHkgJXMgaXMgc3VwcG9ydGVkKSBhbmQgYXJndW1lbnRzXG4gKiB0byBwcm92aWRlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgYnJva2UgYW5kIHdoYXQgeW91IHdlcmVcbiAqIGV4cGVjdGluZy5cbiAqXG4gKiBUaGUgaW52YXJpYW50IG1lc3NhZ2Ugd2lsbCBiZSBzdHJpcHBlZCBpbiBwcm9kdWN0aW9uLCBidXQgdGhlIGludmFyaWFudFxuICogd2lsbCByZW1haW4gdG8gZW5zdXJlIGxvZ2ljIGRvZXMgbm90IGRpZmZlciBpbiBwcm9kdWN0aW9uLlxuICovXG5cbnZhciBpbnZhcmlhbnQgPSBmdW5jdGlvbihjb25kaXRpb24sIGZvcm1hdCwgYSwgYiwgYywgZCwgZSwgZikge1xuICBpZiAoZmFsc2UpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YXJpYW50IHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQnKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHZhciBlcnJvcjtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAnTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArXG4gICAgICAgICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLidcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhcmdzID0gW2EsIGIsIGMsIGQsIGUsIGZdO1xuICAgICAgdmFyIGFyZ0luZGV4ID0gMDtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAnSW52YXJpYW50IFZpb2xhdGlvbjogJyArXG4gICAgICAgIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107IH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIGVycm9yLmZyYW1lc1RvUG9wID0gMTsgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBpbnZhcmlhbnQncyBvd24gZnJhbWVcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbnZhcmlhbnQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvYmFzZScpO1xuXG52YXIgYmFzZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG4vLyBFYWNoIG9mIHRoZXNlIGF1Z21lbnQgdGhlIEhhbmRsZWJhcnMgb2JqZWN0LiBObyBuZWVkIHRvIHNldHVwIGhlcmUuXG4vLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxuXG52YXIgX1NhZmVTdHJpbmcgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcnKTtcblxudmFyIF9TYWZlU3RyaW5nMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9TYWZlU3RyaW5nKTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgX2ltcG9ydDIgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydDIpO1xuXG52YXIgX2ltcG9ydDMgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvcnVudGltZScpO1xuXG52YXIgcnVudGltZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQzKTtcblxudmFyIF9ub0NvbmZsaWN0ID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL25vLWNvbmZsaWN0Jyk7XG5cbnZhciBfbm9Db25mbGljdDIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfbm9Db25mbGljdCk7XG5cbi8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxuZnVuY3Rpb24gY3JlYXRlKCkge1xuICB2YXIgaGIgPSBuZXcgYmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoaGIsIGJhc2UpO1xuICBoYi5TYWZlU3RyaW5nID0gX1NhZmVTdHJpbmcyWydkZWZhdWx0J107XG4gIGhiLkV4Y2VwdGlvbiA9IF9FeGNlcHRpb24yWydkZWZhdWx0J107XG4gIGhiLlV0aWxzID0gVXRpbHM7XG4gIGhiLmVzY2FwZUV4cHJlc3Npb24gPSBVdGlscy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIGhiLlZNID0gcnVudGltZTtcbiAgaGIudGVtcGxhdGUgPSBmdW5jdGlvbiAoc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgfTtcblxuICByZXR1cm4gaGI7XG59XG5cbnZhciBpbnN0ID0gY3JlYXRlKCk7XG5pbnN0LmNyZWF0ZSA9IGNyZWF0ZTtcblxuX25vQ29uZmxpY3QyWydkZWZhdWx0J10oaW5zdCk7XG5cbmluc3RbJ2RlZmF1bHQnXSA9IGluc3Q7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGluc3Q7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O1xuZXhwb3J0cy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lO1xuXG52YXIgX2ltcG9ydCA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBWRVJTSU9OID0gJzMuMC4xJztcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSA2O1xuXG5leHBvcnRzLkNPTVBJTEVSX1JFVklTSU9OID0gQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc9PSAxLngueCcsXG4gIDU6ICc9PSAyLjAuMC1hbHBoYS54JyxcbiAgNjogJz49IDIuMC4wLWJldGEuMSdcbn07XG5cbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uIHJlZ2lzdGVySGVscGVyKG5hbWUsIGZuKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChmbikge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7XG4gICAgICB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbiB1bnJlZ2lzdGVySGVscGVyKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5oZWxwZXJzW25hbWVdO1xuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24gcmVnaXN0ZXJQYXJ0aWFsKG5hbWUsIHBhcnRpYWwpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHBhcnRpYWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdBdHRlbXB0aW5nIHRvIHJlZ2lzdGVyIGEgcGFydGlhbCBhcyB1bmRlZmluZWQnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBwYXJ0aWFsO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uIHVucmVnaXN0ZXJQYXJ0aWFsKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5wYXJ0aWFsc1tuYW1lXTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0SGVscGVycyhpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gQSBtaXNzaW5nIGZpZWxkIGluIGEge3tmb299fSBjb25zdHVjdC5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ01pc3NpbmcgaGVscGVyOiBcIicgKyBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdLm5hbWUgKyAnXCInKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmIChjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgICAgICAgb3B0aW9ucy5pZHMgPSBbb3B0aW9ucy5uYW1lXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMubmFtZSk7XG4gICAgICAgIG9wdGlvbnMgPSB7IGRhdGE6IGRhdGEgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ011c3QgcGFzcyBpdGVyYXRvciB0byAjZWFjaCcpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sXG4gICAgICAgIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICByZXQgPSAnJyxcbiAgICAgICAgZGF0YSA9IHVuZGVmaW5lZCxcbiAgICAgICAgY29udGV4dFBhdGggPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICBjb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pICsgJy4nO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4ZWNJdGVyYXRpb24oZmllbGQsIGluZGV4LCBsYXN0KSB7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICBkYXRhLmtleSA9IGZpZWxkO1xuICAgICAgICBkYXRhLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGRhdGEuZmlyc3QgPSBpbmRleCA9PT0gMDtcbiAgICAgICAgZGF0YS5sYXN0ID0gISFsYXN0O1xuXG4gICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBjb250ZXh0UGF0aCArIGZpZWxkO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbZmllbGRdLCB7XG4gICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIGJsb2NrUGFyYW1zOiBVdGlscy5ibG9ja1BhcmFtcyhbY29udGV4dFtmaWVsZF0sIGZpZWxkXSwgW2NvbnRleHRQYXRoICsgZmllbGQsIG51bGxdKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IgKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGkgPCBqOyBpKyspIHtcbiAgICAgICAgICBleGVjSXRlcmF0aW9uKGksIGksIGkgPT09IGNvbnRleHQubGVuZ3RoIC0gMSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwcmlvcktleSA9IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIC8vIFdlJ3JlIHJ1bm5pbmcgdGhlIGl0ZXJhdGlvbnMgb25lIHN0ZXAgb3V0IG9mIHN5bmMgc28gd2UgY2FuIGRldGVjdFxuICAgICAgICAgICAgLy8gdGhlIGxhc3QgaXRlcmF0aW9uIHdpdGhvdXQgaGF2ZSB0byBzY2FuIHRoZSBvYmplY3QgdHdpY2UgYW5kIGNyZWF0ZVxuICAgICAgICAgICAgLy8gYW4gaXRlcm1lZGlhdGUga2V5cyBhcnJheS5cbiAgICAgICAgICAgIGlmIChwcmlvcktleSkge1xuICAgICAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpIC0gMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcmlvcktleSA9IGtleTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByaW9yS2V5KSB7XG4gICAgICAgICAgZXhlY0l0ZXJhdGlvbihwcmlvcktleSwgaSAtIDEsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24gKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7XG4gICAgICBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwgfHwgVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uIChjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHsgZm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNoIH0pO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKTtcbiAgICAgICAgb3B0aW9ucyA9IHsgZGF0YTogZGF0YSB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24gKG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBtZXNzYWdlKTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvb2t1cCcsIGZ1bmN0aW9uIChvYmosIGZpZWxkKSB7XG4gICAgcmV0dXJuIG9iaiAmJiBvYmpbZmllbGRdO1xuICB9KTtcbn1cblxudmFyIGxvZ2dlciA9IHtcbiAgbWV0aG9kTWFwOiB7IDA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InIH0sXG5cbiAgLy8gU3RhdGUgZW51bVxuICBERUJVRzogMCxcbiAgSU5GTzogMSxcbiAgV0FSTjogMixcbiAgRVJST1I6IDMsXG4gIGxldmVsOiAxLFxuXG4gIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24gbG9nKGxldmVsLCBtZXNzYWdlKSB7XG4gICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBsb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBsb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIChjb25zb2xlW21ldGhvZF0gfHwgY29uc29sZS5sb2cpLmNhbGwoY29uc29sZSwgbWVzc2FnZSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc29sZVxuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0cy5sb2dnZXIgPSBsb2dnZXI7XG52YXIgbG9nID0gbG9nZ2VyLmxvZztcblxuZXhwb3J0cy5sb2cgPSBsb2c7XG5cbmZ1bmN0aW9uIGNyZWF0ZUZyYW1lKG9iamVjdCkge1xuICB2YXIgZnJhbWUgPSBVdGlscy5leHRlbmQoe30sIG9iamVjdCk7XG4gIGZyYW1lLl9wYXJlbnQgPSBvYmplY3Q7XG4gIHJldHVybiBmcmFtZTtcbn1cblxuLyogW2FyZ3MsIF1vcHRpb25zICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbmZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlLCBub2RlKSB7XG4gIHZhciBsb2MgPSBub2RlICYmIG5vZGUubG9jLFxuICAgICAgbGluZSA9IHVuZGVmaW5lZCxcbiAgICAgIGNvbHVtbiA9IHVuZGVmaW5lZDtcbiAgaWYgKGxvYykge1xuICAgIGxpbmUgPSBsb2Muc3RhcnQubGluZTtcbiAgICBjb2x1bW4gPSBsb2Muc3RhcnQuY29sdW1uO1xuXG4gICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBjb2x1bW47XG4gIH1cblxuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgRXhjZXB0aW9uKTtcbiAgfVxuXG4gIGlmIChsb2MpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gY29sdW1uO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gRXhjZXB0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuLypnbG9iYWwgd2luZG93ICovXG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGZ1bmN0aW9uIChIYW5kbGViYXJzKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIHZhciByb290ID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3csXG4gICAgICAkSGFuZGxlYmFycyA9IHJvb3QuSGFuZGxlYmFycztcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgSGFuZGxlYmFycy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChyb290LkhhbmRsZWJhcnMgPT09IEhhbmRsZWJhcnMpIHtcbiAgICAgIHJvb3QuSGFuZGxlYmFycyA9ICRIYW5kbGViYXJzO1xuICAgIH1cbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5jaGVja1JldmlzaW9uID0gY2hlY2tSZXZpc2lvbjtcblxuLy8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuZXhwb3J0cy53cmFwUHJvZ3JhbSA9IHdyYXBQcm9ncmFtO1xuZXhwb3J0cy5yZXNvbHZlUGFydGlhbCA9IHJlc29sdmVQYXJ0aWFsO1xuZXhwb3J0cy5pbnZva2VQYXJ0aWFsID0gaW52b2tlUGFydGlhbDtcbmV4cG9ydHMubm9vcCA9IG5vb3A7XG5cbnZhciBfaW1wb3J0ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgVXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0KTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbmZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvICYmIGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgY3VycmVudFJldmlzaW9uID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuICcgKyAnUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIHJ1bnRpbWVWZXJzaW9ucyArICcpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVyVmVyc2lvbnMgKyAnKS4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiAnICsgJ1BsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVySW5mb1sxXSArICcpLicpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAoIWVudikge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdObyBlbnZpcm9ubWVudCBwYXNzZWQgdG8gdGVtcGxhdGUnKTtcbiAgfVxuICBpZiAoIXRlbXBsYXRlU3BlYyB8fCAhdGVtcGxhdGVTcGVjLm1haW4pIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVW5rbm93biB0ZW1wbGF0ZSBvYmplY3Q6ICcgKyB0eXBlb2YgdGVtcGxhdGVTcGVjKTtcbiAgfVxuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIGVudi5WTS5jaGVja1JldmlzaW9uKHRlbXBsYXRlU3BlYy5jb21waWxlcik7XG5cbiAgZnVuY3Rpb24gaW52b2tlUGFydGlhbFdyYXBwZXIocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICAgIGNvbnRleHQgPSBVdGlscy5leHRlbmQoe30sIGNvbnRleHQsIG9wdGlvbnMuaGFzaCk7XG4gICAgfVxuXG4gICAgcGFydGlhbCA9IGVudi5WTS5yZXNvbHZlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIHZhciByZXN1bHQgPSBlbnYuVk0uaW52b2tlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHJlc3VsdCA9PSBudWxsICYmIGVudi5jb21waWxlKSB7XG4gICAgICBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB0ZW1wbGF0ZVNwZWMuY29tcGlsZXJPcHRpb25zLCBlbnYpO1xuICAgICAgcmVzdWx0ID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHtcbiAgICAgIGlmIChvcHRpb25zLmluZGVudCkge1xuICAgICAgICB2YXIgbGluZXMgPSByZXN1bHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpbmVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGlmICghbGluZXNbaV0gJiYgaSArIDEgPT09IGwpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpbmVzW2ldID0gb3B0aW9ucy5pbmRlbnQgKyBsaW5lc1tpXTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSBsaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUaGUgcGFydGlhbCAnICsgb3B0aW9ucy5uYW1lICsgJyBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBzdHJpY3Q6IGZ1bmN0aW9uIHN0cmljdChvYmosIG5hbWUpIHtcbiAgICAgIGlmICghKG5hbWUgaW4gb2JqKSkge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnXCInICsgbmFtZSArICdcIiBub3QgZGVmaW5lZCBpbiAnICsgb2JqKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmpbbmFtZV07XG4gICAgfSxcbiAgICBsb29rdXA6IGZ1bmN0aW9uIGxvb2t1cChkZXB0aHMsIG5hbWUpIHtcbiAgICAgIHZhciBsZW4gPSBkZXB0aHMubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoZGVwdGhzW2ldICYmIGRlcHRoc1tpXVtuYW1lXSAhPSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIGRlcHRoc1tpXVtuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgbGFtYmRhOiBmdW5jdGlvbiBsYW1iZGEoY3VycmVudCwgY29udGV4dCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBjdXJyZW50ID09PSAnZnVuY3Rpb24nID8gY3VycmVudC5jYWxsKGNvbnRleHQpIDogY3VycmVudDtcbiAgICB9LFxuXG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcblxuICAgIGZuOiBmdW5jdGlvbiBmbihpKSB7XG4gICAgICByZXR1cm4gdGVtcGxhdGVTcGVjW2ldO1xuICAgIH0sXG5cbiAgICBwcm9ncmFtczogW10sXG4gICAgcHJvZ3JhbTogZnVuY3Rpb24gcHJvZ3JhbShpLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldLFxuICAgICAgICAgIGZuID0gdGhpcy5mbihpKTtcbiAgICAgIGlmIChkYXRhIHx8IGRlcHRocyB8fCBibG9ja1BhcmFtcyB8fCBkZWNsYXJlZEJsb2NrUGFyYW1zKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gd3JhcFByb2dyYW0odGhpcywgaSwgZm4sIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gd3JhcFByb2dyYW0odGhpcywgaSwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH0sXG5cbiAgICBkYXRhOiBmdW5jdGlvbiBkYXRhKHZhbHVlLCBkZXB0aCkge1xuICAgICAgd2hpbGUgKHZhbHVlICYmIGRlcHRoLS0pIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5fcGFyZW50O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uIG1lcmdlKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIHZhciBvYmogPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgcGFyYW0gIT09IGNvbW1vbikge1xuICAgICAgICBvYmogPSBVdGlscy5leHRlbmQoe30sIGNvbW1vbiwgcGFyYW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG5cbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IHRlbXBsYXRlU3BlYy5jb21waWxlclxuICB9O1xuXG4gIGZ1bmN0aW9uIHJldChjb250ZXh0KSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzFdO1xuXG4gICAgdmFyIGRhdGEgPSBvcHRpb25zLmRhdGE7XG5cbiAgICByZXQuX3NldHVwKG9wdGlvbnMpO1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsICYmIHRlbXBsYXRlU3BlYy51c2VEYXRhKSB7XG4gICAgICBkYXRhID0gaW5pdERhdGEoY29udGV4dCwgZGF0YSk7XG4gICAgfVxuICAgIHZhciBkZXB0aHMgPSB1bmRlZmluZWQsXG4gICAgICAgIGJsb2NrUGFyYW1zID0gdGVtcGxhdGVTcGVjLnVzZUJsb2NrUGFyYW1zID8gW10gOiB1bmRlZmluZWQ7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMpIHtcbiAgICAgIGRlcHRocyA9IG9wdGlvbnMuZGVwdGhzID8gW2NvbnRleHRdLmNvbmNhdChvcHRpb25zLmRlcHRocykgOiBbY29udGV4dF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRlbXBsYXRlU3BlYy5tYWluLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgfVxuICByZXQuaXNUb3AgPSB0cnVlO1xuXG4gIHJldC5fc2V0dXAgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBjb250YWluZXIuaGVscGVycyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLmhlbHBlcnMsIGVudi5oZWxwZXJzKTtcblxuICAgICAgaWYgKHRlbXBsYXRlU3BlYy51c2VQYXJ0aWFsKSB7XG4gICAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLnBhcnRpYWxzLCBlbnYucGFydGlhbHMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuaGVscGVycyA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IG9wdGlvbnMucGFydGlhbHM7XG4gICAgfVxuICB9O1xuXG4gIHJldC5fY2hpbGQgPSBmdW5jdGlvbiAoaSwgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlQmxvY2tQYXJhbXMgJiYgIWJsb2NrUGFyYW1zKSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnbXVzdCBwYXNzIGJsb2NrIHBhcmFtcycpO1xuICAgIH1cbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocyAmJiAhZGVwdGhzKSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnbXVzdCBwYXNzIHBhcmVudCBkZXB0aHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCB0ZW1wbGF0ZVNwZWNbaV0sIGRhdGEsIDAsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICB9O1xuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiB3cmFwUHJvZ3JhbShjb250YWluZXIsIGksIGZuLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gIGZ1bmN0aW9uIHByb2coY29udGV4dCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1sxXTtcblxuICAgIHJldHVybiBmbi5jYWxsKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgb3B0aW9ucy5kYXRhIHx8IGRhdGEsIGJsb2NrUGFyYW1zICYmIFtvcHRpb25zLmJsb2NrUGFyYW1zXS5jb25jYXQoYmxvY2tQYXJhbXMpLCBkZXB0aHMgJiYgW2NvbnRleHRdLmNvbmNhdChkZXB0aHMpKTtcbiAgfVxuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gZGVwdGhzID8gZGVwdGhzLmxlbmd0aCA6IDA7XG4gIHByb2cuYmxvY2tQYXJhbXMgPSBkZWNsYXJlZEJsb2NrUGFyYW1zIHx8IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlUGFydGlhbChwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gIGlmICghcGFydGlhbCkge1xuICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV07XG4gIH0gZWxzZSBpZiAoIXBhcnRpYWwuY2FsbCAmJiAhb3B0aW9ucy5uYW1lKSB7XG4gICAgLy8gVGhpcyBpcyBhIGR5bmFtaWMgcGFydGlhbCB0aGF0IHJldHVybmVkIGEgc3RyaW5nXG4gICAgb3B0aW9ucy5uYW1lID0gcGFydGlhbDtcbiAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1twYXJ0aWFsXTtcbiAgfVxuICByZXR1cm4gcGFydGlhbDtcbn1cblxuZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMucGFydGlhbCA9IHRydWU7XG5cbiAgaWYgKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUaGUgcGFydGlhbCAnICsgb3B0aW9ucy5uYW1lICsgJyBjb3VsZCBub3QgYmUgZm91bmQnKTtcbiAgfSBlbHNlIGlmIChwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBub29wKCkge1xuICByZXR1cm4gJyc7XG59XG5cbmZ1bmN0aW9uIGluaXREYXRhKGNvbnRleHQsIGRhdGEpIHtcbiAgaWYgKCFkYXRhIHx8ICEoJ3Jvb3QnIGluIGRhdGEpKSB7XG4gICAgZGF0YSA9IGRhdGEgPyBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5jcmVhdGVGcmFtZShkYXRhKSA6IHt9O1xuICAgIGRhdGEucm9vdCA9IGNvbnRleHQ7XG4gIH1cbiAgcmV0dXJuIGRhdGE7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbmZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufVxuXG5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IFNhZmVTdHJpbmcucHJvdG90eXBlLnRvSFRNTCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICcnICsgdGhpcy5zdHJpbmc7XG59O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBTYWZlU3RyaW5nO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7XG5cbi8vIE9sZGVyIElFIHZlcnNpb25zIGRvIG5vdCBkaXJlY3RseSBzdXBwb3J0IGluZGV4T2Ygc28gd2UgbXVzdCBpbXBsZW1lbnQgb3VyIG93biwgc2FkbHkuXG5leHBvcnRzLmluZGV4T2YgPSBpbmRleE9mO1xuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtcbmV4cG9ydHMuaXNFbXB0eSA9IGlzRW1wdHk7XG5leHBvcnRzLmJsb2NrUGFyYW1zID0gYmxvY2tQYXJhbXM7XG5leHBvcnRzLmFwcGVuZENvbnRleHRQYXRoID0gYXBwZW5kQ29udGV4dFBhdGg7XG52YXIgZXNjYXBlID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gICdcXCcnOiAnJiN4Mjc7JyxcbiAgJ2AnOiAnJiN4NjA7J1xufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nLFxuICAgIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKG9iaiAvKiAsIC4uLnNvdXJjZSAqLykge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZXhwb3J0cy50b1N0cmluZyA9IHRvU3RyaW5nO1xuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxuLyplc2xpbnQtZGlzYWJsZSBmdW5jLXN0eWxlLCBuby12YXIgKi9cbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG4vKmVzbGludC1lbmFibGUgZnVuYy1zdHlsZSwgbm8tdmFyICovXG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07ZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGFycmF5W2ldID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgJiYgc3RyaW5nLnRvSFRNTCkge1xuICAgICAgcmV0dXJuIHN0cmluZy50b0hUTUwoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nICsgJyc7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmc7XG4gIH1cblxuICBpZiAoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmc7XG4gIH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSkge1xuICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJsb2NrUGFyYW1zKHBhcmFtcywgaWRzKSB7XG4gIHBhcmFtcy5wYXRoID0gaWRzO1xuICByZXR1cm4gcGFyYW1zO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRDb250ZXh0UGF0aChjb250ZXh0UGF0aCwgaWQpIHtcbiAgcmV0dXJuIChjb250ZXh0UGF0aCA/IGNvbnRleHRQYXRoICsgJy4nIDogJycpICsgaWQ7XG59IiwiLy8gQ3JlYXRlIGEgc2ltcGxlIHBhdGggYWxpYXMgdG8gYWxsb3cgYnJvd3NlcmlmeSB0byByZXNvbHZlXG4vLyB0aGUgcnVudGltZSBvbiBhIHN1cHBvcnRlZCBwYXRoLlxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZScpWydkZWZhdWx0J107XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIilbXCJkZWZhdWx0XCJdO1xuIiwidmFyIGJhc2VUb1N0cmluZyA9IHJlcXVpcmUoJy4uL2ludGVybmFsL2Jhc2VUb1N0cmluZycpO1xuXG4vKipcbiAqIENhcGl0YWxpemVzIHRoZSBmaXJzdCBjaGFyYWN0ZXIgb2YgYHN0cmluZ2AuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBTdHJpbmdcbiAqIEBwYXJhbSB7c3RyaW5nfSBbc3RyaW5nPScnXSBUaGUgc3RyaW5nIHRvIGNhcGl0YWxpemUuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBjYXBpdGFsaXplZCBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uY2FwaXRhbGl6ZSgnZnJlZCcpO1xuICogLy8gPT4gJ0ZyZWQnXG4gKi9cbmZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7XG4gIHN0cmluZyA9IGJhc2VUb1N0cmluZyhzdHJpbmcpO1xuICByZXR1cm4gc3RyaW5nICYmIChzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc2xpY2UoMSkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNhcGl0YWxpemU7XG4iLCIvKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBzdHJpbmcgaWYgaXQncyBub3Qgb25lLiBBbiBlbXB0eSBzdHJpbmcgaXMgcmV0dXJuZWRcbiAqIGZvciBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgdmFsdWVzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBiYXNlVG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6ICh2YWx1ZSArICcnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlVG9TdHJpbmc7XG4iLCIvLyBBdm9pZCBjb25zb2xlIGVycm9ycyBmb3IgdGhlIElFIGNyYXBweSBicm93c2Vyc1xuaWYgKCAhIHdpbmRvdy5jb25zb2xlICkgY29uc29sZSA9IHsgbG9nOiBmdW5jdGlvbigpe30gfTtcblxuaW1wb3J0IEFwcCBmcm9tICdBcHAnXG5pbXBvcnQgJCBmcm9tICdqcXVlcnknXG5pbXBvcnQgVHdlZW5NYXggZnJvbSAnZ3NhcCdcbmltcG9ydCByYWYgZnJvbSAncmFmJ1xuaW1wb3J0IHBpeGkgZnJvbSAncGl4aS5qcydcblxud2luZG93LmpRdWVyeSA9IHdpbmRvdy4kID0gJFxuXG4vLyBTdGFydCBBcHBcbnZhciBhcHAgPSBuZXcgQXBwKClcbmFwcC5pbml0KClcbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBBY3Rpb25zIGZyb20gJ0FwcEFjdGlvbnMnXG5pbXBvcnQgQXBwVGVtcGxhdGUgZnJvbSAnQXBwVGVtcGxhdGUnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBHRXZlbnRzIGZyb20gJ0dsb2JhbEV2ZW50cydcbmltcG9ydCBQb29sIGZyb20gJ1Bvb2wnXG5pbXBvcnQgUHJlbG9hZGVyIGZyb20gJ1ByZWxvYWRlcidcblxuY2xhc3MgQXBwIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdH1cblx0aW5pdCgpIHtcblxuXHRcdHZhciBtb2JpbGVjaGVjayA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGNoZWNrID0gZmFsc2U7XG5cdFx0XHQoZnVuY3Rpb24oYSl7aWYoLyhhbmRyb2lkfGJiXFxkK3xtZWVnbykuK21vYmlsZXxhdmFudGdvfGJhZGFcXC98YmxhY2tiZXJyeXxibGF6ZXJ8Y29tcGFsfGVsYWluZXxmZW5uZWN8aGlwdG9wfGllbW9iaWxlfGlwKGhvbmV8b2QpfGlyaXN8a2luZGxlfGxnZSB8bWFlbW98bWlkcHxtbXB8bW9iaWxlLitmaXJlZm94fG5ldGZyb250fG9wZXJhIG0ob2J8aW4paXxwYWxtKCBvcyk/fHBob25lfHAoaXhpfHJlKVxcL3xwbHVja2VyfHBvY2tldHxwc3B8c2VyaWVzKDR8NikwfHN5bWJpYW58dHJlb3x1cFxcLihicm93c2VyfGxpbmspfHZvZGFmb25lfHdhcHx3aW5kb3dzIGNlfHhkYXx4aWluby9pLnRlc3QoYSl8fC8xMjA3fDYzMTB8NjU5MHwzZ3NvfDR0aHB8NTBbMS02XWl8Nzcwc3w4MDJzfGEgd2F8YWJhY3xhYyhlcnxvb3xzXFwtKXxhaShrb3xybil8YWwoYXZ8Y2F8Y28pfGFtb2l8YW4oZXh8bnl8eXcpfGFwdHV8YXIoY2h8Z28pfGFzKHRlfHVzKXxhdHR3fGF1KGRpfFxcLW18ciB8cyApfGF2YW58YmUoY2t8bGx8bnEpfGJpKGxifHJkKXxibChhY3xheil8YnIoZXx2KXd8YnVtYnxid1xcLShufHUpfGM1NVxcL3xjYXBpfGNjd2F8Y2RtXFwtfGNlbGx8Y2h0bXxjbGRjfGNtZFxcLXxjbyhtcHxuZCl8Y3Jhd3xkYShpdHxsbHxuZyl8ZGJ0ZXxkY1xcLXN8ZGV2aXxkaWNhfGRtb2J8ZG8oY3xwKW98ZHMoMTJ8XFwtZCl8ZWwoNDl8YWkpfGVtKGwyfHVsKXxlcihpY3xrMCl8ZXNsOHxleihbNC03XTB8b3N8d2F8emUpfGZldGN8Zmx5KFxcLXxfKXxnMSB1fGc1NjB8Z2VuZXxnZlxcLTV8Z1xcLW1vfGdvKFxcLnd8b2QpfGdyKGFkfHVuKXxoYWllfGhjaXR8aGRcXC0obXxwfHQpfGhlaVxcLXxoaShwdHx0YSl8aHAoIGl8aXApfGhzXFwtY3xodChjKFxcLXwgfF98YXxnfHB8c3x0KXx0cCl8aHUoYXd8dGMpfGlcXC0oMjB8Z298bWEpfGkyMzB8aWFjKCB8XFwtfFxcLyl8aWJyb3xpZGVhfGlnMDF8aWtvbXxpbTFrfGlubm98aXBhcXxpcmlzfGphKHR8dilhfGpicm98amVtdXxqaWdzfGtkZGl8a2VqaXxrZ3QoIHxcXC8pfGtsb258a3B0IHxrd2NcXC18a3lvKGN8ayl8bGUobm98eGkpfGxnKCBnfFxcLyhrfGx8dSl8NTB8NTR8XFwtW2Etd10pfGxpYnd8bHlueHxtMVxcLXd8bTNnYXxtNTBcXC98bWEodGV8dWl8eG8pfG1jKDAxfDIxfGNhKXxtXFwtY3J8bWUocmN8cmkpfG1pKG84fG9hfHRzKXxtbWVmfG1vKDAxfDAyfGJpfGRlfGRvfHQoXFwtfCB8b3x2KXx6eil8bXQoNTB8cDF8diApfG13YnB8bXl3YXxuMTBbMC0yXXxuMjBbMi0zXXxuMzAoMHwyKXxuNTAoMHwyfDUpfG43KDAoMHwxKXwxMCl8bmUoKGN8bSlcXC18b258dGZ8d2Z8d2d8d3QpfG5vayg2fGkpfG56cGh8bzJpbXxvcCh0aXx3dil8b3Jhbnxvd2cxfHA4MDB8cGFuKGF8ZHx0KXxwZHhnfHBnKDEzfFxcLShbMS04XXxjKSl8cGhpbHxwaXJlfHBsKGF5fHVjKXxwblxcLTJ8cG8oY2t8cnR8c2UpfHByb3h8cHNpb3xwdFxcLWd8cWFcXC1hfHFjKDA3fDEyfDIxfDMyfDYwfFxcLVsyLTddfGlcXC0pfHF0ZWt8cjM4MHxyNjAwfHJha3N8cmltOXxybyh2ZXx6byl8czU1XFwvfHNhKGdlfG1hfG1tfG1zfG55fHZhKXxzYygwMXxoXFwtfG9vfHBcXC0pfHNka1xcL3xzZShjKFxcLXwwfDEpfDQ3fG1jfG5kfHJpKXxzZ2hcXC18c2hhcnxzaWUoXFwtfG0pfHNrXFwtMHxzbCg0NXxpZCl8c20oYWx8YXJ8YjN8aXR8dDUpfHNvKGZ0fG55KXxzcCgwMXxoXFwtfHZcXC18diApfHN5KDAxfG1iKXx0MigxOHw1MCl8dDYoMDB8MTB8MTgpfHRhKGd0fGxrKXx0Y2xcXC18dGRnXFwtfHRlbChpfG0pfHRpbVxcLXx0XFwtbW98dG8ocGx8c2gpfHRzKDcwfG1cXC18bTN8bTUpfHR4XFwtOXx1cChcXC5ifGcxfHNpKXx1dHN0fHY0MDB8djc1MHx2ZXJpfHZpKHJnfHRlKXx2ayg0MHw1WzAtM118XFwtdil8dm00MHx2b2RhfHZ1bGN8dngoNTJ8NTN8NjB8NjF8NzB8ODB8ODF8ODN8ODV8OTgpfHczYyhcXC18ICl8d2ViY3x3aGl0fHdpKGcgfG5jfG53KXx3bWxifHdvbnV8eDcwMHx5YXNcXC18eW91cnx6ZXRvfHp0ZVxcLS9pLnRlc3QoYS5zdWJzdHIoMCw0KSkpY2hlY2sgPSB0cnVlfSkobmF2aWdhdG9yLnVzZXJBZ2VudHx8bmF2aWdhdG9yLnZlbmRvcnx8d2luZG93Lm9wZXJhKTtcblx0XHRcdHJldHVybiBjaGVjaztcblx0XHR9XG5cblx0XHRBcHBTdG9yZS5EZXRlY3Rvci5pc01vYmlsZSA9IG1vYmlsZWNoZWNrKClcblx0XHRjb25zb2xlLmxvZyhBcHBTdG9yZS5EZXRlY3RvcilcblxuXHRcdC8vIEluaXQgUHJlbG9hZGVyXG5cdFx0QXBwU3RvcmUuUHJlbG9hZGVyID0gbmV3IFByZWxvYWRlcigpXG5cblx0XHQvLyBJbml0IFBvb2xcblx0XHRBcHBTdG9yZS5Qb29sID0gbmV3IFBvb2woKVxuXG5cdFx0Ly8gSW5pdCByb3V0ZXJcblx0XHR0aGlzLnJvdXRlciA9IG5ldyBSb3V0ZXIoKVxuXHRcdHRoaXMucm91dGVyLmluaXQoKVxuXG5cdFx0Ly8gSW5pdCBnbG9iYWwgZXZlbnRzXG5cdFx0d2luZG93Lkdsb2JhbEV2ZW50cyA9IG5ldyBHRXZlbnRzKClcblx0XHRHbG9iYWxFdmVudHMuaW5pdCgpXG5cblx0XHR2YXIgYXBwVGVtcGxhdGUgPSBuZXcgQXBwVGVtcGxhdGUoKVxuXHRcdHRoaXMudGVtcGxhdGVJc1JlYWR5ID0gdGhpcy50ZW1wbGF0ZUlzUmVhZHkuYmluZCh0aGlzKVxuXHRcdGFwcFRlbXBsYXRlLmlzUmVhZHkgPSB0aGlzLnRlbXBsYXRlSXNSZWFkeVxuXHRcdGFwcFRlbXBsYXRlLnJlbmRlcignI2FwcC1jb250YWluZXInKVxuXHR9XG5cdHRlbXBsYXRlSXNSZWFkeSgpIHtcblx0XHQvLyBTdGFydCByb3V0aW5nXG5cdFx0dGhpcy5yb3V0ZXIuYmVnaW5Sb3V0aW5nKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBcbiAgICBcdFxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCBGcm9udENvbnRhaW5lciBmcm9tICdGcm9udENvbnRhaW5lcidcbmltcG9ydCBQYWdlc0NvbnRhaW5lciBmcm9tICdQYWdlc0NvbnRhaW5lcidcbmltcG9ydCBQWENvbnRhaW5lciBmcm9tICdQWENvbnRhaW5lcidcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuY2xhc3MgQXBwVGVtcGxhdGUgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMuaXNSZWFkeSA9IHVuZGVmaW5lZFxuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0fVxuXHRyZW5kZXIocGFyZW50KSB7XG5cdFx0c3VwZXIucmVuZGVyKCdBcHBUZW1wbGF0ZScsIHBhcmVudCwgdW5kZWZpbmVkKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHRoaXMuZnJvbnRDb250YWluZXIgPSBuZXcgRnJvbnRDb250YWluZXIoKVxuXHRcdHRoaXMuZnJvbnRDb250YWluZXIucmVuZGVyKCcjYXBwLXRlbXBsYXRlJylcblxuXHRcdHRoaXMucGFnZXNDb250YWluZXIgPSBuZXcgUGFnZXNDb250YWluZXIoKVxuXHRcdHRoaXMucGFnZXNDb250YWluZXIucmVuZGVyKCcjYXBwLXRlbXBsYXRlJylcblxuXHRcdHRoaXMucHhDb250YWluZXIgPSBuZXcgUFhDb250YWluZXIoKVxuXHRcdHRoaXMucHhDb250YWluZXIuaW5pdCgnI2FwcC10ZW1wbGF0ZScpXG5cdFx0QXBwQWN0aW9ucy5weENvbnRhaW5lcklzUmVhZHkodGhpcy5weENvbnRhaW5lcilcblxuXHRcdEdsb2JhbEV2ZW50cy5yZXNpemUoKVxuXG5cdFx0dGhpcy5hbmltYXRlKClcblxuXHRcdHNldFRpbWVvdXQoKCk9Pnt0aGlzLmlzUmVhZHkoKX0sIDApXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG5cdGFuaW1hdGUoKSB7XG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0ZSlcblx0ICAgIHRoaXMucHhDb250YWluZXIudXBkYXRlKClcblx0ICAgIHRoaXMucGFnZXNDb250YWluZXIudXBkYXRlKClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5mcm9udENvbnRhaW5lci5yZXNpemUoKVxuXHRcdHRoaXMucHhDb250YWluZXIucmVzaXplKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBUZW1wbGF0ZVxuIiwiaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwRGlzcGF0Y2hlciBmcm9tICdBcHBEaXNwYXRjaGVyJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5mdW5jdGlvbiBfcHJvY2VlZEhhc2hlckNoYW5nZUFjdGlvbihwYWdlSWQpIHtcbiAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCxcbiAgICAgICAgaXRlbTogcGFnZUlkXG4gICAgfSkgIFxufVxudmFyIEFwcEFjdGlvbnMgPSB7XG4gICAgcGFnZUhhc2hlckNoYW5nZWQ6IGZ1bmN0aW9uKHBhZ2VJZCkge1xuICAgICAgICB2YXIgbWFuaWZlc3QgPSBBcHBTdG9yZS5wYWdlQXNzZXRzVG9Mb2FkKClcbiAgICAgICAgaWYobWFuaWZlc3QubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgX3Byb2NlZWRIYXNoZXJDaGFuZ2VBY3Rpb24ocGFnZUlkKVxuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIEFwcFN0b3JlLlByZWxvYWRlci5sb2FkKG1hbmlmZXN0LCAoKT0+e1xuICAgICAgICAgICAgICAgIF9wcm9jZWVkSGFzaGVyQ2hhbmdlQWN0aW9uKHBhZ2VJZClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHdpbmRvd1Jlc2l6ZTogZnVuY3Rpb24od2luZG93Vywgd2luZG93SCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLldJTkRPV19SRVNJWkUsXG4gICAgICAgICAgICBpdGVtOiB7IHdpbmRvd1c6d2luZG93Vywgd2luZG93SDp3aW5kb3dIIH1cbiAgICAgICAgfSlcbiAgICB9LFxuICAgIHB4Q29udGFpbmVySXNSZWFkeTogZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIEFwcERpc3BhdGNoZXIuaGFuZGxlVmlld0FjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0lTX1JFQURZLFxuICAgICAgICAgICAgaXRlbTogY29tcG9uZW50XG4gICAgICAgIH0pICAgICAgICAgICAgXG4gICAgfSxcbiAgICBweEFkZENoaWxkOiBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICBBcHBEaXNwYXRjaGVyLmhhbmRsZVZpZXdBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9BRERfQ0hJTEQsXG4gICAgICAgICAgICBpdGVtOiB7Y2hpbGQ6IGNoaWxkfVxuICAgICAgICB9KSAgICAgICAgICAgIFxuICAgIH0sXG4gICAgcHhSZW1vdmVDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgQXBwRGlzcGF0Y2hlci5oYW5kbGVWaWV3QWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IEFwcENvbnN0YW50cy5QWF9DT05UQUlORVJfUkVNT1ZFX0NISUxELFxuICAgICAgICAgICAgaXRlbToge2NoaWxkOiBjaGlsZH1cbiAgICAgICAgfSkgICAgICAgICAgICBcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFwcEFjdGlvbnNcblxuXG4gICAgICBcbiIsImltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJyb3dCdG4ge1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50LCBkaXJlY3Rpb24pIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb25cblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnRsT3ZlciA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLnRsT3V0ID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdHZhciBrbm90c0VsID0gdGhpcy5lbGVtZW50LmZpbmQoXCIua25vdFwiKVxuXHRcdHZhciBsaW5lc0VsID0gdGhpcy5lbGVtZW50LmZpbmQoXCIubGluZVwiKVxuXHRcdHZhciByYWRpdXMgPSAzXG5cdFx0dmFyIG1hcmdpbiA9IDIyXG5cdFx0dGhpcy5saW5lU2l6ZSA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtub3RzRWwubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0gJChrbm90c0VsW2ldKVxuXHRcdFx0a25vdC5hdHRyKCdyJywgcmFkaXVzKVxuXHRcdH07XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lc0VsLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbGluZSA9ICQobGluZXNFbFtpXSlcblx0XHRcdGxpbmUuY3NzKCdzdHJva2Utd2lkdGgnLCB0aGlzLmxpbmVTaXplKVxuXHRcdH07XG5cblx0XHR2YXIgc3RhcnRYID0gbWFyZ2luID4+IDFcblx0XHR2YXIgc3RhcnRZID0gbWFyZ2luXG5cdFx0dmFyIG9mZnNldFVwRG93biA9IDAuNlxuXHRcdCQoa25vdHNFbC5nZXQoMCkpLmF0dHIoe1xuXHRcdFx0J2N4Jzogc3RhcnRYICsgMCxcblx0XHRcdCdjeSc6IHN0YXJ0WSArIDBcblx0XHR9KVxuXHRcdCQoa25vdHNFbC5nZXQoMSkpLmF0dHIoe1xuXHRcdFx0J2N4Jzogc3RhcnRYICsgbWFyZ2luLFxuXHRcdFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdH0pXG5cdFx0JChrbm90c0VsLmdldCgyKSkuYXR0cih7XG5cdFx0XHQnY3gnOiBzdGFydFggKyAobWFyZ2luKjIpLFxuXHRcdFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdH0pXG5cdFx0JChrbm90c0VsLmdldCgzKSkuYXR0cih7XG5cdFx0XHQnY3gnOiBzdGFydFggKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKSxcblx0XHRcdCdjeSc6IHN0YXJ0WSAtIChtYXJnaW4gKiBvZmZzZXRVcERvd24pXG5cdFx0fSlcblx0XHQkKGtub3RzRWwuZ2V0KDQpKS5hdHRyKHtcblx0XHRcdCdjeCc6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdFx0J2N5Jzogc3RhcnRZICsgKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHR9KVxuXHRcdCQobGluZXNFbC5nZXQoMCkpLmF0dHIoe1xuXHRcdFx0J3gxJzogc3RhcnRYICsgMCxcblx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHQneDInOiBzdGFydFggKyBtYXJnaW4sXG5cdFx0XHQneTInOiBzdGFydFkgKyAwXG5cdFx0fSlcblx0XHQkKGxpbmVzRWwuZ2V0KDEpKS5hdHRyKHtcblx0XHRcdCd4MSc6IHN0YXJ0WCArIG1hcmdpbixcblx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHQneDInOiBzdGFydFggKyAobWFyZ2luKjIpLFxuXHRcdFx0J3kyJzogc3RhcnRZICsgMFxuXHRcdH0pXG5cdFx0JChsaW5lc0VsLmdldCgyKSkuYXR0cih7XG5cdFx0XHQneDEnOiBzdGFydFggKyAwLFxuXHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdCd4Mic6IHN0YXJ0WCArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pLFxuXHRcdFx0J3kyJzogc3RhcnRZIC0gKG1hcmdpbiAqIG9mZnNldFVwRG93bilcblx0XHR9KVxuXHRcdCQobGluZXNFbC5nZXQoMykpLmF0dHIoe1xuXHRcdFx0J3gxJzogc3RhcnRYICsgMCxcblx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHQneDInOiBzdGFydFggKyAobWFyZ2luICogb2Zmc2V0VXBEb3duKSxcblx0XHRcdCd5Mic6IHN0YXJ0WSArIChtYXJnaW4gKiBvZmZzZXRVcERvd24pXG5cdFx0fSlcblxuXHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMF0sIDEsIHsgeDotNiwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMV0sIDEsIHsgeDotNiwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMl0sIDEsIHsgeDotNiwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMF0sIDEsIHsgc2NhbGVYOjEuMSwgeDotNiwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMV0sIDEsIHsgc2NhbGVYOjEuMSwgeDotNiwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbMl0sIDEsIHsgeDotNiwgcm90YXRpb246JzEwZGVnJywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzAlIDEwMCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbM10sIDEsIHsgeDotNiwgcm90YXRpb246Jy0xMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFszXSwgMSwgeyB4Oi0zLCB5OjIsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzRdLCAxLCB7IHg6LTMsIHk6LTIsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblxuXHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFswXSwgMSwgeyB4OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbMV0sIDEsIHsgeDowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhrbm90c0VsWzJdLCAxLCB7IHg6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdHRoaXMudGxPdXQudG8obGluZXNFbFswXSwgMSwgeyBzY2FsZVg6MSwgeDowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzFdLCAxLCB7IHNjYWxlWDoxLCB4OjAsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMl0sIDEsIHsgeDowLCByb3RhdGlvbjonMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAxMDAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbM10sIDEsIHsgeDowLCByb3RhdGlvbjonMGRlZycsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOicwJSAwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhrbm90c0VsWzNdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0dGhpcy50bE91dC50byhrbm90c0VsWzRdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cblx0XHRzd2l0Y2godGhpcy5kaXJlY3Rpb24pIHtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxFRlQ6XG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5SSUdIVDpcblx0XHRcdFx0VHdlZW5NYXguc2V0KHRoaXMuZWxlbWVudCwgeyByb3RhdGlvbjonMTgwZGVnJywgdHJhbnNmb3JtT3JpZ2luOiAnNTAlIDUwJScgfSlcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlRPUDpcblx0XHRcdFx0VHdlZW5NYXguc2V0KHRoaXMuZWxlbWVudCwgeyByb3RhdGlvbjonOTBkZWcnLCB0cmFuc2Zvcm1PcmlnaW46ICc1MCUgNTAlJyB9KVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuQk9UVE9NOlxuXHRcdFx0XHRUd2Vlbk1heC5zZXQodGhpcy5lbGVtZW50LCB7IHJvdGF0aW9uOictOTBkZWcnLCB0cmFuc2Zvcm1PcmlnaW46ICc1MCUgNTAlJyB9KVxuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHRoaXMudGxPdmVyLnBhdXNlKDApXG5cdFx0dGhpcy50bE91dC5wYXVzZSgwKVxuXG5cdFx0dGhpcy5yb2xsb3ZlciA9IHRoaXMucm9sbG92ZXIuYmluZCh0aGlzKVxuXHRcdHRoaXMucm9sbG91dCA9IHRoaXMucm9sbG91dC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5jbGljayA9IHRoaXMuY2xpY2suYmluZCh0aGlzKVxuXHRcdHRoaXMuZWxlbWVudC5vbignbW91c2VlbnRlcicsIHRoaXMucm9sbG92ZXIpXG5cdFx0dGhpcy5lbGVtZW50Lm9uKCdtb3VzZWxlYXZlJywgdGhpcy5yb2xsb3V0KVxuXHRcdGlmKHRoaXMuYnRuQ2xpY2tlZCAhPSB1bmRlZmluZWQpIHRoaXMuZWxlbWVudC5vbignY2xpY2snLCB0aGlzLmNsaWNrKVxuXG5cdFx0dGhpcy53aWR0aCA9IG1hcmdpbiAqIDNcblx0XHR0aGlzLmhlaWdodCA9IG1hcmdpbiAqIDJcblx0XHR0aGlzLmVsZW1lbnQuY3NzKHtcblx0XHRcdHdpZHRoOiB0aGlzLndpZHRoLFxuXHRcdFx0aGVpZ2h0OiB0aGlzLmhlaWdodFxuXHRcdH0pXG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMuZWxlbWVudC5jc3Moe1xuXHRcdFx0bGVmdDogeCxcblx0XHRcdHRvcDogeVxuXHRcdH0pXG5cdH1cblx0Y2xpY2soZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHRoaXMuYnRuQ2xpY2tlZCh0aGlzLmRpcmVjdGlvbilcblx0fVxuXHRyb2xsb3V0KGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLm1vdXNlT3V0KClcdFxuXHR9XG5cdHJvbGxvdmVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLm1vdXNlT3ZlcigpXHRcblx0fVxuXHRtb3VzZU92ZXIoKSB7XG5cdFx0dGhpcy50bE91dC5raWxsKClcblx0XHR0aGlzLnRsT3Zlci5wbGF5KDApXG5cdH1cblx0bW91c2VPdXQoKSB7XG5cdFx0dGhpcy50bE92ZXIua2lsbCgpXG5cdFx0dGhpcy50bE91dC5wbGF5KDApXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdmVyKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VUaW1lbGluZSh0aGlzLnRsT3V0KVxuXHRcdHRoaXMuZWxlbWVudC5vZmYoJ21vdXNlZW50ZXInLCB0aGlzLnJvbGxvdmVyKVxuXHRcdHRoaXMuZWxlbWVudC5vZmYoJ21vdXNlbGVhdmUnLCB0aGlzLnJvbGxvdXQpXG5cdFx0dGhpcy5lbGVtZW50Lm9mZignY2xpY2snLCB0aGlzLmNsaWNrKVxuXHR9XG59XG4iLCJpbXBvcnQgUGFnZSBmcm9tICdQYWdlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZVBsYW5ldFBhZ2UgZXh0ZW5kcyBQYWdlIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcylcblx0XHR0aGlzLmV4cGVyaWVuY2UgPSB1bmRlZmluZWRcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0aWYodGhpcy5leHBlcmllbmNlICE9IHVuZGVmaW5lZCkgdGhpcy5leHBlcmllbmNlLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFNwcmluZ0dhcmRlbiBmcm9tICdTcHJpbmdHYXJkZW4nXG5pbXBvcnQgQ29tcGFzc1JpbmdzIGZyb20gJ0NvbXBhc3NSaW5ncydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGFzcyB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCB0eXBlKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lciA9IHB4Q29udGFpbmVyXG5cdFx0dGhpcy50eXBlID0gdHlwZSB8fCBBcHBDb25zdGFudHMuTEFORElOR1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuY29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKVxuXG4gXHRcdHRoaXMucmluZ3MgPSBuZXcgQ29tcGFzc1JpbmdzKHRoaXMuY29udGFpbmVyKVxuXHQgXHR0aGlzLnJpbmdzLmNvbXBvbmVudERpZE1vdW50KClcblxuXHQgXHR0aGlzLnNwcmluZ0dhcmRlbnMgPSBbXVxuXHQgXHR0aGlzLmdldFJhZGl1cygpXG5cdH1cblx0dXBkYXRlRGF0YShkYXRhKSB7XG5cdFx0dGhpcy5yZW1vdmVQcmV2aW91c1NwcmluZ0dhcmRlbnMoKVxuXHRcdHRoaXMuc3ByaW5nR2FyZGVucyA9IFtdXG5cdFx0dmFyIHNwcmluZ0dhcmRlbldpdGhGaWxsID0gKHRoaXMudHlwZSA9PSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRSkgPyB0cnVlIDogZmFsc2Vcblx0XHR2YXIgc3ByaW5nR2FyZGVuSXNJbnRlcmFjdGl2ZSA9ICh0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UpID8gdHJ1ZSA6IGZhbHNlXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc3ByaW5nR2FyZGVuID0gQXBwU3RvcmUuZ2V0U3ByaW5nR2FyZGVuKClcblx0XHRcdHZhciBwcm9kdWN0ID0gZGF0YVtpXVxuXHRcdFx0c3ByaW5nR2FyZGVuLmlkID0gdGhpcy5pZFxuXHRcdFx0c3ByaW5nR2FyZGVuLnJhZGl1cyA9IHRoaXMucmFkaXVzXG5cdFx0XHRzcHJpbmdHYXJkZW4ua25vdFJhZGl1cyA9IHRoaXMua25vdFJhZGl1c1xuXHRcdFx0c3ByaW5nR2FyZGVuLmNvbXBvbmVudERpZE1vdW50KHByb2R1Y3QsIHNwcmluZ0dhcmRlbldpdGhGaWxsLCBzcHJpbmdHYXJkZW5Jc0ludGVyYWN0aXZlKVxuXHRcdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQoc3ByaW5nR2FyZGVuLmNvbnRhaW5lcilcblx0XHRcdHRoaXMuc3ByaW5nR2FyZGVuc1tpXSA9IHNwcmluZ0dhcmRlblxuXHRcdH1cblx0fVxuXHRyZW1vdmVQcmV2aW91c1NwcmluZ0dhcmRlbnMoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSB0aGlzLnNwcmluZ0dhcmRlbnNbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi5jbGVhcigpXG5cdFx0XHRzcHJpbmdHYXJkZW4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdFx0QXBwU3RvcmUucmVsZWFzZVNwcmluZ0dhcmRlbihzcHJpbmdHYXJkZW4pXG5cdFx0fVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoIDwgMSkgcmV0dXJuIFxuXHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc3ByaW5nR2FyZGVucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNwcmluZ0dhcmRlbiA9IHRoaXMuc3ByaW5nR2FyZGVuc1tpXVxuXHRcdFx0c3ByaW5nR2FyZGVuLnVwZGF0ZSgpXG5cdFx0fVxuXHR9XG5cdGdldFJhZGl1cygpIHtcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIHNpemVQZXJjZW50YWdlID0gKHRoaXMudHlwZSA9PSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRSB8fCB0aGlzLnR5cGUgPT0gQXBwQ29uc3RhbnRzLkNBTVBBSUdOKSA/IEFwcENvbnN0YW50cy5DT01QQVNTX1NNQUxMX1NJWkVfUEVSQ0VOVEFHRSA6IEFwcENvbnN0YW50cy5DT01QQVNTX1NJWkVfUEVSQ0VOVEFHRVxuXHRcdHRoaXMucmFkaXVzID0gd2luZG93SCAqIHNpemVQZXJjZW50YWdlXG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5nZXRSYWRpdXMoKVxuXHRcdHRoaXMucmluZ3MucmVzaXplKHRoaXMucmFkaXVzKVxuXG5cdFx0aWYodGhpcy5zcHJpbmdHYXJkZW5zLmxlbmd0aCA8IDEpIHJldHVybiBcblx0IFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNwcmluZ0dhcmRlbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzcHJpbmdHYXJkZW4gPSB0aGlzLnNwcmluZ0dhcmRlbnNbaV1cblx0XHRcdHNwcmluZ0dhcmRlbi5yZXNpemUodGhpcy5yYWRpdXMpXG5cdFx0fVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHR0aGlzLmNvbnRhaW5lci54ID0geFxuXHRcdHRoaXMuY29udGFpbmVyLnkgPSB5XG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRwb3NpdGlvbkVsZW1lbnQoeCwgeSkge1xuXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5jb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy5jb250YWluZXIpXG5cdFx0dGhpcy5yZW1vdmVQcmV2aW91c1NwcmluZ0dhcmRlbnMoKVxuXHRcdHRoaXMucmluZ3MuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGFzc1JpbmdzIHtcblx0Y29uc3RydWN0b3IocGFyZW50Q29udGFpbmVyKSB7XG5cdFx0dGhpcy5jb250YWluZXIgPSBwYXJlbnRDb250YWluZXJcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnJpbmdzQ29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnRpdGxlc0NvbnRhaW5lciA9IEFwcFN0b3JlLmdldENvbnRhaW5lcigpXG5cdFx0dGhpcy5nZW5kZXJDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMucmluZ3NDb250YWluZXIpXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy50aXRsZXNDb250YWluZXIpXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5nZW5kZXJDb250YWluZXIpXG5cblx0XHR0aGlzLmNpcmNsZXMgPSBbXVxuXHRcdHZhciBjaWNsZXNMZW4gPSA2XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjaWNsZXNMZW47IGkrKykge1xuXHRcdFx0dmFyIGcgPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0XHR0aGlzLmNpcmNsZXNbaV0gPSBnXG5cdFx0XHR0aGlzLnJpbmdzQ29udGFpbmVyLmFkZENoaWxkKGcpXG5cdFx0fVxuXG5cdFx0dGhpcy50aXRsZXMgPSBbXVxuXHRcdHRoaXMuZ2VuZGVycyA9IFtdXG5cdFx0dmFyIGdsb2JhbENvbnRlbnQgPSBBcHBTdG9yZS5nbG9iYWxDb250ZW50KClcblx0XHR2YXIgZWxlbWVudHMgPSBBcHBTdG9yZS5lbGVtZW50c09mTmF0dXJlKClcblx0XHR2YXIgYWxsR2VuZGVyID0gQXBwU3RvcmUuYWxsR2VuZGVyKClcblx0XHR2YXIgZWxlbWVudHNUZXh0cyA9IGdsb2JhbENvbnRlbnQuZWxlbWVudHNcblx0XHR2YXIgZ2VuZGVyVGV4dHMgPSBnbG9iYWxDb250ZW50LmdlbmRlclxuXHRcdHZhciBmb250U2l6ZSA9IDMwXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZWxlbWVudElkID0gZWxlbWVudHNbaV1cblx0XHRcdHZhciBlbGVtZW50VGl0bGUgPSBlbGVtZW50c1RleHRzW2VsZW1lbnRJZF0udG9VcHBlckNhc2UoKVxuXHRcdFx0dmFyIHR4dCA9IG5ldyBQSVhJLlRleHQoZWxlbWVudFRpdGxlLCB7IGZvbnQ6IGZvbnRTaXplICsgJ3B4IEZ1dHVyYUJvbGQnLCBmaWxsOiAnd2hpdGUnLCBhbGlnbjogJ2NlbnRlcicgfSlcblx0XHRcdHR4dC5hbmNob3IueCA9IDAuNVxuXHRcdFx0dHh0LmFuY2hvci55ID0gMC41XG5cdFx0XHR0aGlzLnRpdGxlc0NvbnRhaW5lci5hZGRDaGlsZCh0eHQpXG5cdFx0XHR0aGlzLnRpdGxlcy5wdXNoKHtcblx0XHRcdFx0dHh0OiB0eHQsXG5cdFx0XHRcdGRlZ0JlZ2luOiB0aGlzLmdldERlZ3JlZXNCZWdpbkZvclRpdGxlc0J5SWQoZWxlbWVudElkKSxcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhbGxHZW5kZXIubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBnZW5kZXJJZCA9IGFsbEdlbmRlcltpXVxuXHRcdFx0dmFyIGdlbmRlclRpdGxlID0gZ2VuZGVyVGV4dHNbZ2VuZGVySWRdLnRvVXBwZXJDYXNlKClcblx0XHRcdHZhciB0eHQgPSBuZXcgUElYSS5UZXh0KGdlbmRlclRpdGxlLCB7IGZvbnQ6IGZvbnRTaXplICsgJ3B4IEZ1dHVyYUJvbGQnLCBmaWxsOiAnd2hpdGUnLCBhbGlnbjogJ2NlbnRlcicgfSlcblx0XHRcdHR4dC5hbmNob3IueCA9IDAuNVxuXHRcdFx0dHh0LmFuY2hvci55ID0gMC41XG5cdFx0XHR0aGlzLmdlbmRlckNvbnRhaW5lci5hZGRDaGlsZCh0eHQpXG5cdFx0XHR0aGlzLmdlbmRlcnMucHVzaCh7XG5cdFx0XHRcdHR4dDogdHh0LFxuXHRcdFx0XHRkZWdCZWdpbjogdGhpcy5nZXREZWdyZWVzQmVnaW5Gb3JHZW5kZXJCeUlkKGdlbmRlcklkKSxcblx0XHRcdH0pXG5cdFx0fVxuXHR9XG5cdGdldERlZ3JlZXNCZWdpbkZvclRpdGxlc0J5SWQoaWQpIHtcblx0XHQvLyBiZSBjYXJlZnVsIHN0YXJ0cyBmcm9tIGNlbnRlciAtOTBkZWdcblx0XHRzd2l0Y2goaWQpIHtcblx0XHRcdGNhc2UgJ2ZpcmUnOiByZXR1cm4gLTEzMFxuXHRcdFx0Y2FzZSAnZWFydGgnOiByZXR1cm4gLTUwXG5cdFx0XHRjYXNlICdtZXRhbCc6IHJldHVybiAxNVxuXHRcdFx0Y2FzZSAnd2F0ZXInOiByZXR1cm4gOTBcblx0XHRcdGNhc2UgJ3dvb2QnOiByZXR1cm4gMTY1XG5cdFx0fVxuXHR9XG5cdGdldERlZ3JlZXNCZWdpbkZvckdlbmRlckJ5SWQoaWQpIHtcblx0XHQvLyBiZSBjYXJlZnVsIHN0YXJ0cyBmcm9tIGNlbnRlciAtOTBkZWdcblx0XHRzd2l0Y2goaWQpIHtcblx0XHRcdGNhc2UgJ21hbGUnOiByZXR1cm4gLTE1MFxuXHRcdFx0Y2FzZSAnZmVtYWxlJzogcmV0dXJuIC0zMFxuXHRcdFx0Y2FzZSAnYW5pbWFsJzogcmV0dXJuIDkwXG5cdFx0fVxuXHR9XG5cdGRyYXdSaW5ncygpIHtcblx0XHR2YXIgcmFkaXVzTWFyZ2luID0gdGhpcy5yYWRpdXMgLyB0aGlzLmNpcmNsZXMubGVuZ3RoXG5cdFx0dmFyIGxlbiA9IHRoaXMuY2lyY2xlcy5sZW5ndGggKyAxXG5cdFx0dmFyIGxhc3RSO1xuXHRcdHZhciBsaW5lVyA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0dmFyIGNvbG9yID0gMHhmZmZmZmZcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHR2YXIgZyA9IHRoaXMuY2lyY2xlc1tpLTFdXG5cdFx0XHR2YXIgcjtcblxuXHRcdFx0Zy5jbGVhcigpXG5cblx0XHRcdC8vIHJhZGl1cyBkaWZmZXJlbmNlc1xuXHRcdFx0aWYoaSA9PSAxKSByID0gcmFkaXVzTWFyZ2luICogMC4xOFxuXHRcdFx0ZWxzZSBpZihpID09IDQpIHIgPSAobGFzdFIgKyByYWRpdXNNYXJnaW4pICogMS4xNlxuXHRcdFx0ZWxzZSByID0gbGFzdFIgKyByYWRpdXNNYXJnaW5cblxuXHRcdFx0Ly8gbGluZXNcblx0XHRcdGlmKGk9PTMpIHtcblx0XHRcdFx0dGhpcy5kcmF3QXJvdW5kVGhyZWVHcm91cExpbmVzKGxhc3RSLCByLCBnLCBsaW5lVywgY29sb3IpXG5cdFx0XHRcdHRoaXMuZHJhd0dlbmRlcnMociwgY29sb3IpXG5cdFx0XHR9XG5cdFx0XHRpZihpPT02KSB7XG5cdFx0XHRcdHRoaXMuZHJhd0Fyb3VuZEZvdXJHcm91cExpbmVzKGxhc3RSLCByLCBnLCBsaW5lVywgY29sb3IpXG5cdFx0XHRcdHRoaXMuZHJhd1RpdGxlcyhyLCBjb2xvcilcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2lyY2xlXG5cdFx0XHR0aGlzLmRyYXdDaXJjbGUoZywgcilcblxuXHRcdFx0bGFzdFIgPSByXG5cdFx0fVxuXHR9XG5cdGRyYXdBcm91bmRUaHJlZUdyb3VwTGluZXMobGFzdFIsIG5ld1IsIGcsIGxpbmVXLCBjb2xvcikge1xuXHRcdHZhciBsZWZ0VGhldGEgPSAoNyAqIE1hdGguUEkpIC8gNlxuXHRcdHZhciByaWdodFRoZXRhID0gKDExICogTWF0aC5QSSkgLyA2XG5cdFx0XG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIDAsIC1uZXdSLCAwLCAtbGFzdFIpXG5cdFx0XG5cdFx0dmFyIGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRUaGV0YSlcblx0XHR2YXIgZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRUaGV0YSlcblx0XHR2YXIgdG9YID0gbGFzdFIgKiBNYXRoLmNvcyhsZWZ0VGhldGEpXG5cdFx0dmFyIHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0VGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0VGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodFRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0VGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cdH1cblx0ZHJhd0Fyb3VuZEZvdXJHcm91cExpbmVzKGxhc3RSLCBuZXdSLCBnLCBsaW5lVywgY29sb3IpIHtcblx0XHR2YXIgbGVmdFRvcFRoZXRhID0gKDExICogTWF0aC5QSSkgLyAxMlxuXHRcdHZhciByaWdodFRvcFRoZXRhID0gTWF0aC5QSSAvIDEyXG5cblx0XHR2YXIgbGVmdEJvdHRvbVRoZXRhID0gKDUgKiBNYXRoLlBJKSAvIDRcblx0XHR2YXIgcmlnaHRCb3R0b21UaGV0YSA9ICg3ICogTWF0aC5QSSkgLyA0XG5cdFx0XG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIDAsIC1uZXdSLCAwLCAtbGFzdFIpXG5cdFx0XG5cdFx0dmFyIGZyb21YID0gbmV3UiAqIE1hdGguY29zKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRUb3BUaGV0YSlcblx0XHR2YXIgdG9YID0gbGFzdFIgKiBNYXRoLmNvcyhsZWZ0VG9wVGhldGEpXG5cdFx0dmFyIHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKGxlZnRUb3BUaGV0YSlcblx0XHR0aGlzLmRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSlcblxuXHRcdGZyb21YID0gbmV3UiAqIE1hdGguY29zKHJpZ2h0VG9wVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKHJpZ2h0VG9wVGhldGEpXG5cdFx0dG9YID0gbGFzdFIgKiBNYXRoLmNvcyhyaWdodFRvcFRoZXRhKVxuXHRcdHRvWSA9IC1sYXN0UiAqIE1hdGguc2luKHJpZ2h0VG9wVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhsZWZ0Qm90dG9tVGhldGEpXG5cdFx0ZnJvbVkgPSAtbmV3UiAqIE1hdGguc2luKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0b1ggPSBsYXN0UiAqIE1hdGguY29zKGxlZnRCb3R0b21UaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihsZWZ0Qm90dG9tVGhldGEpXG5cdFx0dGhpcy5kcmF3QXJvdW5kTGluZShnLCBsaW5lVywgY29sb3IsIGZyb21YLCBmcm9tWSwgdG9YLCB0b1kpXG5cblx0XHRmcm9tWCA9IG5ld1IgKiBNYXRoLmNvcyhyaWdodEJvdHRvbVRoZXRhKVxuXHRcdGZyb21ZID0gLW5ld1IgKiBNYXRoLnNpbihyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRvWCA9IGxhc3RSICogTWF0aC5jb3MocmlnaHRCb3R0b21UaGV0YSlcblx0XHR0b1kgPSAtbGFzdFIgKiBNYXRoLnNpbihyaWdodEJvdHRvbVRoZXRhKVxuXHRcdHRoaXMuZHJhd0Fyb3VuZExpbmUoZywgbGluZVcsIGNvbG9yLCBmcm9tWCwgZnJvbVksIHRvWCwgdG9ZKVxuXHR9XG5cdGRyYXdBcm91bmRMaW5lKGcsIGxpbmVXLCBjb2xvciwgZnJvbVgsIGZyb21ZLCB0b1gsIHRvWSkge1xuXHRcdGcubGluZVN0eWxlKGxpbmVXLCBjb2xvciwgMSlcblx0XHRnLmJlZ2luRmlsbChjb2xvciwgMClcblx0XHRnLm1vdmVUbyhmcm9tWCwgZnJvbVkpXG5cdFx0Zy5saW5lVG8odG9YLCB0b1kpXG5cdFx0Zy5lbmRGaWxsKClcblx0fVxuXHRkcmF3Q2lyY2xlKGcsIHIpIHtcblx0XHRnLmxpbmVTdHlsZShBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKSwgMHhmZmZmZmYsIDEpXG5cdFx0Zy5iZWdpbkZpbGwoMHhmZmZmZmYsIDApXG5cdFx0XG5cdFx0Zy5tb3ZlVG8ociwgMClcblxuXHRcdHZhciBhbmdsZSA9IDBcblx0XHR2YXIgeCA9IDBcblx0XHR2YXIgeSA9IDBcblx0XHR2YXIgZ2FwID0gTWF0aC5taW4oKDMwMCAvIHRoaXMucmFkaXVzKSAqIDUsIDEwKVxuXHRcdHZhciBzdGVwcyA9IE1hdGgucm91bmQoMzYwIC8gZ2FwKVxuXHRcdGZvciAodmFyIGkgPSAtMTsgaSA8IHN0ZXBzOyBpKyspIHtcblx0XHRcdGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucyhpICogZ2FwKVxuXHRcdFx0eCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHRcdHkgPSByICogTWF0aC5zaW4oYW5nbGUpXG5cdFx0XHRnLmxpbmVUbyh4LCB5KVxuXHRcdH07XG5cblx0XHQvLyBjbG9zZSBpdFxuXHRcdGFuZ2xlID0gVXRpbHMuRGVncmVlc1RvUmFkaWFucygzNjApXG5cdFx0eCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHR5ID0gciAqIE1hdGguc2luKGFuZ2xlKVxuXHRcdGcubGluZVRvKHgsIHkpXG5cblx0XHRnLmVuZEZpbGwoKVxuXHR9XG5cdGRyYXdUaXRsZXMociwgY29sb3IpIHtcblx0XHR2YXIgdGl0bGVzID0gdGhpcy50aXRsZXNcblx0XHR2YXIgb2Zmc2V0ID0gKHRoaXMucmFkaXVzIC8gMjcwKSAqIDQ0XG5cdFx0dmFyIHNjYWxlID0gKHRoaXMucmFkaXVzIC8gMjcwKSAqIDFcblx0XHR2YXIgciA9IHIgKyBvZmZzZXRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRpdGxlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHRpdGxlID0gdGl0bGVzW2ldXG5cdFx0XHR2YXIgYW5nbGUgPSBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKHRpdGxlLmRlZ0JlZ2luKVxuXHRcdFx0dGl0bGUudHh0LnJvdGF0aW9uID0gYW5nbGUgKyBVdGlscy5EZWdyZWVzVG9SYWRpYW5zKDkwKVxuXHRcdFx0dGl0bGUudHh0LnggPSByICogTWF0aC5jb3MoYW5nbGUpXG5cdFx0XHR0aXRsZS50eHQueSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRcdHRpdGxlLnR4dC5zY2FsZS54ID0gc2NhbGVcblx0XHRcdHRpdGxlLnR4dC5zY2FsZS55ID0gc2NhbGVcblx0XHR9XG5cdH1cblx0ZHJhd0dlbmRlcnMociwgY29sb3IpIHtcblx0XHR2YXIgZ2VuZGVycyA9IHRoaXMuZ2VuZGVyc1xuXHRcdHZhciBvZmZzZXQgPSAodGhpcy5yYWRpdXMgLyAyNzApICogMzRcblx0XHR2YXIgc2NhbGUgPSAodGhpcy5yYWRpdXMgLyAyNzApICogMVxuXHRcdHZhciByID0gciArIG9mZnNldFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZGVycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGdlbmRlciA9IGdlbmRlcnNbaV1cblx0XHRcdHZhciBhbmdsZSA9IFV0aWxzLkRlZ3JlZXNUb1JhZGlhbnMoZ2VuZGVyLmRlZ0JlZ2luKVxuXHRcdFx0Z2VuZGVyLnR4dC5yb3RhdGlvbiA9IGFuZ2xlICsgVXRpbHMuRGVncmVlc1RvUmFkaWFucyg5MClcblx0XHRcdGdlbmRlci50eHQueCA9IHIgKiBNYXRoLmNvcyhhbmdsZSlcblx0XHRcdGdlbmRlci50eHQueSA9IHIgKiBNYXRoLnNpbihhbmdsZSlcblx0XHRcdGdlbmRlci50eHQuc2NhbGUueCA9IHNjYWxlXG5cdFx0XHRnZW5kZXIudHh0LnNjYWxlLnkgPSBzY2FsZVxuXHRcdH1cblx0fVxuXHRyZXNpemUocmFkaXVzKSB7XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmFkaXVzID0gcmFkaXVzXG5cdFx0dGhpcy5kcmF3UmluZ3MoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMucmluZ3NDb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKVxuXHRcdHRoaXMudGl0bGVzQ29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHR0aGlzLmdlbmRlckNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLnJpbmdzQ29udGFpbmVyKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VDb250YWluZXIodGhpcy50aXRsZXNDb250YWluZXIpXG5cdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcih0aGlzLmdlbmRlckNvbnRhaW5lcilcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3MgZnJvbSAnQ29tcGFzcydcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFNtYWxsQ29tcGFzcyBmcm9tICdTbWFsbENvbXBhc3MnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbXBhc3Nlc0NvbnRhaW5lciB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCBwYXJlbnRFbCkge1xuXHRcdHRoaXMucGFyZW50RWwgPSBwYXJlbnRFbFxuXHRcdHRoaXMucHhDb250YWluZXIgPSBweENvbnRhaW5lclxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuY29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKVxuXG5cdFx0dGhpcy5jb21wYXNzZXMgPSBbXVxuXG5cdFx0dmFyIG1haW5Db21wYXNzID0gbmV3IENvbXBhc3ModGhpcy5jb250YWluZXIsIEFwcENvbnN0YW50cy5FWFBFUklFTkNFKVxuXHRcdG1haW5Db21wYXNzLmtub3RSYWRpdXMgPSBBcHBDb25zdGFudHMuU01BTExfS05PVF9SQURJVVNcblx0XHRtYWluQ29tcGFzcy5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHR2YXIgcGxhbmV0cyA9IEFwcFN0b3JlLnBsYW5ldHMoKVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHBsYW5ldCA9IHBsYW5ldHNbaV1cblx0XHRcdGlmKHBsYW5ldCA9PSB0aGlzLmlkKSB7XG5cdFx0XHRcdHRoaXMuY29tcGFzc2VzW2ldID0gbWFpbkNvbXBhc3Ncblx0XHRcdFx0dGhpcy5jb21wYXNzZXNbaV0uaWQgPSBwbGFuZXRcblx0XHRcdFx0dGhpcy5jb21wYXNzZXNbaV0uc3RhdGUgPSBBcHBDb25zdGFudHMuT1BFTlxuXHRcdFx0XHR0aGlzLm9wZW5lZENvbXBhc3NJbmRleCA9IGlcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR2YXIgc21hbGxDb21wYXNzID0gbmV3IFNtYWxsQ29tcGFzcyh0aGlzLmNvbnRhaW5lciwgQXBwQ29uc3RhbnRzLkVYUEVSSUVOQ0UpXG5cdFx0XHRcdHZhciBwbGFuZXREYXRhID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZChwbGFuZXQpXG5cdFx0XHRcdHNtYWxsQ29tcGFzcy5zdGF0ZSA9IEFwcENvbnN0YW50cy5DTE9TRVxuXHRcdFx0XHRzbWFsbENvbXBhc3MuaWQgPSBwbGFuZXRcblx0XHRcdFx0c21hbGxDb21wYXNzLmNvbXBvbmVudERpZE1vdW50KHBsYW5ldERhdGEsIHBsYW5ldCwgdGhpcy5wYXJlbnRFbClcblx0XHRcdFx0dGhpcy5jb21wYXNzZXNbaV0gPSBzbWFsbENvbXBhc3Ncblx0XHRcdH1cblx0XHR9XG5cdH1cblx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0dmFyIHBsYW5ldERhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHRoaXMuaWQpXG5cdFx0dGhpcy5jb21wYXNzZXNbdGhpcy5vcGVuZWRDb21wYXNzSW5kZXhdLnVwZGF0ZURhdGEocGxhbmV0RGF0YSlcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0XHR9O1xuXHR9XG5cdHdpbGxUcmFuc2l0aW9uT3V0KCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLndpbGxUcmFuc2l0aW9uT3V0KClcblx0XHR9O1x0XG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY29tcGFzc2VzW2ldLnVwZGF0ZSgpXG5cdFx0fTtcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHZhciBjb21wYXNzZXMgPSB0aGlzLmNvbXBhc3Nlc1xuXHRcdHZhciB0b3RhbFcgPSAwXG5cdFx0dmFyIGJpZ2dlc3RSYWRpdXMgPSAwXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjb21wYXNzID0gY29tcGFzc2VzW2ldXG5cdFx0XHR2YXIgc2l6ZSA9IChjb21wYXNzLnJhZGl1cyA8PCAxKVxuXHRcdFx0dmFyIHByZXZpb3VzQ21wID0gY29tcGFzc2VzW2ktMV1cblx0XHRcdHZhciBuZXh0Q21wID0gY29tcGFzc2VzW2krMV1cblx0XHRcdHZhciBjeCA9IHRvdGFsVyArIHRoaXMuZ2V0Q29tcGFzc01hcmdpbihjb21wYXNzKVxuXHRcdFx0Y29tcGFzcy5yZXNpemUoKVxuXHRcdFx0YmlnZ2VzdFJhZGl1cyA9IGJpZ2dlc3RSYWRpdXMgPCBjb21wYXNzLnJhZGl1cyA/IGNvbXBhc3MucmFkaXVzIDogYmlnZ2VzdFJhZGl1c1xuXHRcdFx0Y29tcGFzcy5wb3NpdGlvbihjeCwgMClcblx0XHRcdGNvbXBhc3MucG9zWCA9IGN4XG5cdFx0XHR0b3RhbFcgPSBjeCArIHRoaXMuZ2V0Q29tcGFzc01hcmdpbihjb21wYXNzKVxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDA7IGkgPCBjb21wYXNzZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjb21wYXNzID0gY29tcGFzc2VzW2ldXG5cdFx0XHRjb21wYXNzLnBvc2l0aW9uRWxlbWVudChjb21wYXNzLnBvc1ggKyAod2luZG93VyA+PiAxKSAtICh0b3RhbFc+PjEpLCAod2luZG93SCkgLSBiaWdnZXN0UmFkaXVzIC0gKHdpbmRvd0ggKiAwLjE1KSlcblx0XHR9XG5cblx0XHR0aGlzLmNvbnRhaW5lci5wb3NpdGlvbi54ID0gKHdpbmRvd1cgPj4gMSkgLSAodG90YWxXID4+IDEpXG5cdFx0dGhpcy5jb250YWluZXIucG9zaXRpb24ueSA9ICh3aW5kb3dIKSAtIGJpZ2dlc3RSYWRpdXMgLSAod2luZG93SCAqIDAuMTUpXG5cdFx0dGhpcy55ID0gdGhpcy5jb250YWluZXIucG9zaXRpb24ueVxuXHRcdHRoaXMuaGVpZ2h0ID0gYmlnZ2VzdFJhZGl1c1xuXHR9XG5cdGdldENvbXBhc3NNYXJnaW4oY29tcGFzcykge1xuXHRcdHJldHVybiAoY29tcGFzcy5zdGF0ZSA9PSBBcHBDb25zdGFudHMuT1BFTikgPyAxNjAgOiAxMDBcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29tcGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmNvbXBhc3Nlc1tpXS5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0fVxuXHRcdHRoaXMuY29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMuY29udGFpbmVyKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICdCYXNlQ29tcG9uZW50J1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJ0Zyb250Q29udGFpbmVyX2hicydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5jbGFzcyBGcm9udENvbnRhaW5lciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0cmVuZGVyKHBhcmVudCkge1xuXHRcdHZhciBzY29wZSA9IHt9XG5cdFx0dmFyIGdlbmVyYUluZm9zID0gQXBwU3RvcmUuZ2VuZXJhbEluZm9zKClcblx0XHRzY29wZS5pbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0c2NvcGUuZmFjZWJvb2tVcmwgPSBnZW5lcmFJbmZvc1snZmFjZWJvb2tfdXJsJ11cblx0XHRzY29wZS50d2l0dGVyVXJsID0gZ2VuZXJhSW5mb3NbJ3R3aXR0ZXJfdXJsJ11cblx0XHRzY29wZS5pbnN0YWdyYW1VcmwgPSBnZW5lcmFJbmZvc1snaW5zdGFncmFtX3VybCddXG5cblx0XHR2YXIgY291bnRyaWVzID0gQXBwU3RvcmUuY291bnRyaWVzKClcblx0XHR2YXIgbGFuZyA9IEFwcFN0b3JlLmxhbmcoKVxuXHRcdHZhciBjdXJyZW50TGFuZztcblx0XHR2YXIgcmVzdENvdW50cmllcyA9IFtdXG5cdFx0dmFyIGZ1bGxuYW1lQ291bnRyaWVzID0gc2NvcGUuaW5mb3MuY291bnRyaWVzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudHJpZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBjb3VudHJ5ID0gY291bnRyaWVzW2ldXG5cdFx0XHRpZihjb3VudHJ5LmxhbmcgPT0gbGFuZykge1xuXHRcdFx0XHRjdXJyZW50TGFuZyA9IGZ1bGxuYW1lQ291bnRyaWVzW2NvdW50cnkuaWRdXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0Y291bnRyeS5uYW1lID0gZnVsbG5hbWVDb3VudHJpZXNbY291bnRyeS5pZF1cblx0XHRcdFx0cmVzdENvdW50cmllcy5wdXNoKGNvdW50cnkpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHNjb3BlLmNvdW50cmllcyA9IHJlc3RDb3VudHJpZXNcblx0XHRzY29wZS5jdXJyZW50X2xhbmcgPSBjdXJyZW50TGFuZ1xuXG5cdFx0c3VwZXIucmVuZGVyKCdGcm9udENvbnRhaW5lcicsIHBhcmVudCwgdGVtcGxhdGUsIHNjb3BlKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0XHR0aGlzLiRzb2NpYWxXcmFwcGVyID0gdGhpcy5jaGlsZC5maW5kKCcjc29jaWFsLXdyYXBwZXInKVxuXHRcdHRoaXMuJGxlZ2FsID0gdGhpcy5jaGlsZC5maW5kKCcubGVnYWwnKVxuXHRcdHRoaXMuJGNhbXBlckxhYiA9IHRoaXMuY2hpbGQuZmluZCgnLmNhbXBlci1sYWInKVxuXHRcdHRoaXMuJHNob3AgPSB0aGlzLmNoaWxkLmZpbmQoJy5zaG9wLXdyYXBwZXInKVxuXHRcdHRoaXMuJGxhbmcgPSB0aGlzLmNoaWxkLmZpbmQoXCIubGFuZy13cmFwcGVyXCIpXG5cdFx0dGhpcy4kbGFuZ0N1cnJlbnRUaXRsZSA9IHRoaXMuJGxhbmcuZmluZChcIi5jdXJyZW50LWxhbmdcIilcblx0XHR0aGlzLiRjb3VudHJpZXMgPSB0aGlzLiRsYW5nLmZpbmQoXCIuY291bnRyaWVzLXdyYXBwZXJcIilcblx0XHR0aGlzLmNvdW50cmllc0ggPSAwXG5cblx0XHR0aGlzLm9uTGFuZ01vdXNlRW50ZXIgPSB0aGlzLm9uTGFuZ01vdXNlRW50ZXIuYmluZCh0aGlzKVxuXHRcdHRoaXMub25MYW5nTW91c2VMZWF2ZSA9IHRoaXMub25MYW5nTW91c2VMZWF2ZS5iaW5kKHRoaXMpXG5cdFx0dGhpcy4kbGFuZy5vbignbW91c2VlbnRlcicsIHRoaXMub25MYW5nTW91c2VFbnRlcilcblx0XHR0aGlzLiRsYW5nLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5vbkxhbmdNb3VzZUxlYXZlKVxuXG5cdFx0dGhpcy5yZXNpemUoKVxuXHRcdHRoaXMuJGxhbmcuY3NzKCdoZWlnaHQnLCB0aGlzLmNvdW50cmllc1RpdGxlSClcblx0fVxuXHRvbkxhbmdNb3VzZUVudGVyKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLiRsYW5nLmFkZENsYXNzKCdob3ZlcmVkJylcblx0XHR0aGlzLiRsYW5nLmNzcygnaGVpZ2h0JywgdGhpcy5jb3VudHJpZXNIICsgdGhpcy5jb3VudHJpZXNUaXRsZUgpXG5cdH1cblx0b25MYW5nTW91c2VMZWF2ZShlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy4kbGFuZy5yZW1vdmVDbGFzcygnaG92ZXJlZCcpXG5cdFx0dGhpcy4kbGFuZy5jc3MoJ2hlaWdodCcsIHRoaXMuY291bnRyaWVzVGl0bGVIKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRpZighdGhpcy5kb21Jc1JlYWR5KSByZXR1cm5cblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGhpcy5jb3VudHJpZXNIID0gdGhpcy4kY291bnRyaWVzLmhlaWdodCgpICsgMjBcblx0XHR0aGlzLmNvdW50cmllc1RpdGxlSCA9IHRoaXMuJGxhbmdDdXJyZW50VGl0bGUuaGVpZ2h0KClcblxuXHRcdHZhciBzb2NpYWxDc3MgPSB7XG5cdFx0XHRsZWZ0OiB3aW5kb3dXIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kc29jaWFsV3JhcHBlci53aWR0aCgpLFxuXHRcdFx0dG9wOiB3aW5kb3dIIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kc29jaWFsV3JhcHBlci5oZWlnaHQoKSxcblx0XHR9XG5cdFx0dmFyIGxlZ2FsQ3NzID0ge1xuXHRcdFx0bGVmdDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdFx0dG9wOiB3aW5kb3dIIC0gQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gdGhpcy4kbGVnYWwuaGVpZ2h0KCksXHRcblx0XHR9XG5cdFx0dmFyIGNhbXBlckxhYkNzcyA9IHtcblx0XHRcdGxlZnQ6IHdpbmRvd1cgLSBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQgLSB0aGlzLiRjYW1wZXJMYWIud2lkdGgoKSxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5ELFxuXHRcdH1cblx0XHR2YXIgc2hvcENzcyA9IHtcblx0XHRcdGxlZnQ6IGNhbXBlckxhYkNzcy5sZWZ0IC0gdGhpcy4kc2hvcC53aWR0aCgpIC0gKEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCA8PCAxKSxcblx0XHRcdHRvcDogQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIC0gMixcblx0XHR9XG5cdFx0dmFyIGxhbmdDc3MgPSB7XG5cdFx0XHRsZWZ0OiBzaG9wQ3NzLmxlZnQgLSB0aGlzLiRsYW5nQ3VycmVudFRpdGxlLndpZHRoKCkgLSAoQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIDw8IDEpLFxuXHRcdFx0dG9wOiBBcHBDb25zdGFudHMuUEFERElOR19BUk9VTkQsXG5cdFx0fVxuXG5cdFx0dGhpcy4kc29jaWFsV3JhcHBlci5jc3Moc29jaWFsQ3NzKVxuXHRcdHRoaXMuJGxlZ2FsLmNzcyhsZWdhbENzcylcblx0XHR0aGlzLiRjYW1wZXJMYWIuY3NzKGNhbXBlckxhYkNzcylcblx0XHR0aGlzLiRzaG9wLmNzcyhzaG9wQ3NzKVxuXHRcdHRoaXMuJGxhbmcuY3NzKGxhbmdDc3MpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZyb250Q29udGFpbmVyXG5cblxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBLbm90IHtcblx0Y29uc3RydWN0b3Ioc3ByaW5nQ29udGFpbmVyLCByLCBjb2xvcikge1xuXHRcdHRoaXMucmFkaXVzID0gciB8fCA4XG5cdFx0dGhpcy5jb2xvciA9IGNvbG9yIHx8IDB4ZmZmZmZmXG5cdFx0dGhpcy5zcHJpbmdDb250YWluZXIgPSBzcHJpbmdDb250YWluZXJcblx0XHR0aGlzLnZ4ID0gMFxuXHRcdHRoaXMudnkgPSAwXG5cdFx0dGhpcy54ID0gMFxuXHRcdHRoaXMueSA9IDBcblx0XHR0aGlzLnRvWCA9IDBcblx0XHR0aGlzLnRvWSA9IDBcblx0XHR0aGlzLmZyb21YID0gMFxuXHRcdHRoaXMuZnJvbVkgPSAwXG5cdFx0dGhpcy5zY2FsZVggPSAxXG5cdFx0dGhpcy5zY2FsZVkgPSAxXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5nID0gbmV3IFBJWEkuR3JhcGhpY3MoKVxuXHRcdHRoaXMuc3ByaW5nQ29udGFpbmVyLmFkZENoaWxkKHRoaXMuZylcblx0XHR0aGlzLmRyYXcoKVxuXHRcdHJldHVybiB0aGlzXG5cdH1cblx0Y2hhbmdlU2l6ZShyYWRpdXMpIHtcblx0XHR0aGlzLnJhZGl1cyA9IHJhZGl1cyB8fCA4XG5cdFx0dGhpcy5kcmF3KClcblx0fVxuXHRkcmF3KCkge1xuXHRcdHRoaXMuZy5jbGVhcigpXG5cdFx0dGhpcy5nLmxpbmVTdHlsZShBcHBTdG9yZS5nZXRMaW5lV2lkdGgoKSwgdGhpcy5jb2xvciwgMSk7XG5cdFx0dGhpcy5nLmJlZ2luRmlsbCh0aGlzLmNvbG9yLCAxKTtcblx0XHR0aGlzLmcuZHJhd0NpcmNsZSgwLCAwLCB0aGlzLnJhZGl1cyk7XG5cdFx0dGhpcy5nLmVuZEZpbGwoKVx0XG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMuZy54ID0geFxuXHRcdHRoaXMuZy55ID0geVxuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnkgPSB5XG5cdH1cblx0Y2xlYXIoKSB7XG5cdFx0dGhpcy5nLmNsZWFyKClcblx0fVxuXHRzY2FsZSh4LCB5KSB7XG5cdFx0dGhpcy5nLnNjYWxlLnggPSB4XG5cdFx0dGhpcy5nLnNjYWxlLnkgPSB5XG5cdFx0dGhpcy5zY2FsZVggPSB4XG5cdFx0dGhpcy5zY2FsZVkgPSB5XG5cdH1cblx0dmVsb2NpdHkoeCwgeSkge1xuXHRcdHRoaXMudnggPSB4XG5cdFx0dGhpcy52eSA9IHlcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmcuY2xlYXIoKVxuXHRcdHRoaXMuZyA9IG51bGxcblx0fVxufVxuIiwiaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgVmVjMiBmcm9tICdWZWMyJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEJlemllckVhc2luZyBmcm9tICdiZXppZXItZWFzaW5nJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMYW5kaW5nU2xpZGVzaG93IHtcblx0Y29uc3RydWN0b3IocHhDb250YWluZXIsIHBhcmVudEVsKSB7XG5cdFx0dGhpcy5wYXJlbnRFbCA9IHBhcmVudEVsXG5cdFx0dGhpcy5weENvbnRhaW5lciA9IHB4Q29udGFpbmVyXG5cdFx0dGhpcy5jdXJyZW50SWQgPSAnYWxhc2thJ1xuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHZhciBpbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHRcdC8vIHRoaXMuc2xpZGVzaG93Q29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0IFx0dGhpcy5weENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnNsaWRlc2hvd0NvbnRhaW5lcilcblx0IFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuYWRkQ2hpbGQodGhpcy5zbGlkZXNob3dXcmFwcGVyKVxuXHQgXHR0aGlzLmNvdW50ZXIgPSAwXG5cdCBcdHRoaXMucGxhbmV0VGl0bGVUeHQgPSBpbmZvcy5wbGFuZXQudG9VcHBlckNhc2UoKVxuXG5cdFx0dmFyIHNsaWRlc2hvd1RpdGxlID0gdGhpcy5wYXJlbnRFbC5maW5kKCcuc2xpZGVzaG93LXRpdGxlJylcblx0XHR2YXIgcGxhbmV0VGl0bGUgPSBzbGlkZXNob3dUaXRsZS5maW5kKCcucGxhbmV0LXRpdGxlJylcblx0XHR2YXIgcGxhbmV0TmFtZSA9IHNsaWRlc2hvd1RpdGxlLmZpbmQoJy5wbGFuZXQtbmFtZScpXG5cdCBcdHRoaXMudGl0bGVDb250YWluZXIgPSB7XG5cdCBcdFx0cGFyZW50OiBzbGlkZXNob3dUaXRsZSxcblx0IFx0XHRwbGFuZXRUaXRsZTogcGxhbmV0VGl0bGUsXG5cdCBcdFx0cGxhbmV0TmFtZTogcGxhbmV0TmFtZVxuXHQgXHR9XG5cdCBcdFxuXHQgXHR2YXIgcGxhbmV0cyA9IEFwcFN0b3JlLnBsYW5ldHMoKVxuXHQgXHR0aGlzLnNsaWRlcyA9IFtdXG5cdCBcdGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0cy5sZW5ndGg7IGkrKykge1xuXHQgXHRcdHZhciBzID0ge31cblx0IFx0XHR2YXIgaWQgPSBwbGFuZXRzW2ldXG5cdCBcdFx0dmFyIHdyYXBwZXJDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHQgXHRcdHZhciBtYXNrUmVjdCA9IHtcblx0IFx0XHRcdGc6IEFwcFN0b3JlLmdldEdyYXBoaWNzKCksXG5cdCBcdFx0XHRuZXdXOiAwLFxuXHQgXHRcdFx0d2lkdGg6IDAsXG5cdCBcdFx0XHR4OiAwXG5cdCBcdFx0fVxuXHQgXHRcdHZhciBpbWdVcmwgPSBBcHBTdG9yZS5tYWluSW1hZ2VVcmwoaWQsIEFwcENvbnN0YW50cy5SRVNQT05TSVZFX0lNQUdFKVxuXHQgXHRcdHZhciB0ZXh0dXJlID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZShpbWdVcmwpXG5cdCBcdFx0dmFyIHNwcml0ZSA9IEFwcFN0b3JlLmdldFNwcml0ZSgpXG5cdCBcdFx0c3ByaXRlLnRleHR1cmUgPSB0ZXh0dXJlXG5cdCBcdFx0c3ByaXRlLnBhcmFtcyA9IHt9XG5cdCBcdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLmFkZENoaWxkKHdyYXBwZXJDb250YWluZXIpXG5cdCBcdFx0d3JhcHBlckNvbnRhaW5lci5hZGRDaGlsZChzcHJpdGUpXG5cdCBcdFx0d3JhcHBlckNvbnRhaW5lci5hZGRDaGlsZChtYXNrUmVjdC5nKVxuXHQgXHRcdHNwcml0ZS5tYXNrID0gbWFza1JlY3QuZ1xuXHQgXHRcdHMub2xkUG9zaXRpb24gPSBuZXcgVmVjMigwLCAwKVxuXHQgXHRcdHMubmV3UG9zaXRpb24gPSBuZXcgVmVjMigwLCAwKVxuXHQgXHRcdHMud3JhcHBlckNvbnRhaW5lciA9IHdyYXBwZXJDb250YWluZXJcblx0IFx0XHRzLnNwcml0ZSA9IHNwcml0ZVxuXHQgXHRcdHMudGV4dHVyZSA9IHRleHR1cmVcblx0IFx0XHRzLm1hc2tSZWN0ID0gbWFza1JlY3Rcblx0IFx0XHRzLnBsYW5ldE5hbWUgPSBpZC50b1VwcGVyQ2FzZSgpXG5cdCBcdFx0cy5pbWdSZXNwb25zaXZlU2l6ZSA9IEFwcFN0b3JlLnJlc3BvbnNpdmVJbWFnZVNpemUoQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpXG5cdCBcdFx0cy5pbWdVcmwgPSBpbWdVcmxcblx0IFx0XHRzLmlkID0gcGxhbmV0c1tpXVxuXHQgXHRcdHRoaXMuc2xpZGVzW2ldID0gc1xuXHQgXHR9XG5cblx0IFx0dGhpcy5tYXNrRWFzaW5nID0gQmV6aWVyRWFzaW5nKC4yMSwxLjQ3LC41MiwxKVxuXHQgXHR0aGlzLmNob29zZVNsaWRlVG9IaWdobGlnaHQoKVxuXHR9XG5cdHVwZGF0ZVRpdGxlcyh0aXRsZSwgbmFtZSkge1xuXHRcdHZhciBwbGFuZXRUaXRsZSA9IHRoaXMudGl0bGVDb250YWluZXIucGxhbmV0VGl0bGVcblx0XHR2YXIgcGxhbmV0TmFtZSA9IHRoaXMudGl0bGVDb250YWluZXIucGxhbmV0TmFtZVxuXHQgXHRwbGFuZXRUaXRsZS50ZXh0KHRpdGxlKVxuXHQgXHRwbGFuZXROYW1lLnRleHQobmFtZSlcblx0IH1cblx0ZHJhd0NlbnRlcmVkTWFza1JlY3QoZ3JhcGhpY3MsIHgsIHksIHcsIGgpIHtcblx0XHRncmFwaGljcy5jbGVhcigpXG5cdFx0Z3JhcGhpY3MuYmVnaW5GaWxsKDB4ZmZmZjAwLCAxKVxuXHRcdGdyYXBoaWNzLmRyYXdSZWN0KHgsIHksIHcsIGgpXG5cdFx0Z3JhcGhpY3MuZW5kRmlsbCgpXG5cdH1cblx0bmV4dCgpIHtcblx0XHR2YXIgZmlyc3RFbGVtZW50ID0gdGhpcy5zbGlkZXMuc2hpZnQoKVxuXHRcdHRoaXMuc2xpZGVzLnB1c2goZmlyc3RFbGVtZW50KVxuXHRcdHRoaXMuZWxlbWVudFRoYXRNb3ZlZEluU2xpZGVzQXJyYXkgPSBmaXJzdEVsZW1lbnRcblx0XHR0aGlzLmNob29zZVNsaWRlVG9IaWdobGlnaHQoKVxuXHRcdHRoaXMuYXBwbHlWYWx1ZXNUb1NsaWRlcygpXG5cdH1cblx0cHJldmlvdXMoKSB7XG5cdFx0dmFyIGxhc3RFbGVtZW50ID0gdGhpcy5zbGlkZXMucG9wKClcblx0XHR0aGlzLnNsaWRlcy51bnNoaWZ0KGxhc3RFbGVtZW50KVxuXHRcdHRoaXMuZWxlbWVudFRoYXRNb3ZlZEluU2xpZGVzQXJyYXkgPSBsYXN0RWxlbWVudFxuXHRcdHRoaXMuY2hvb3NlU2xpZGVUb0hpZ2hsaWdodCgpXG5cdFx0dGhpcy5hcHBseVZhbHVlc1RvU2xpZGVzKClcblx0fVxuXHRjaG9vc2VTbGlkZVRvSGlnaGxpZ2h0KCkge1xuXHRcdHZhciB0b3RhbExlbiA9IHRoaXMuc2xpZGVzLmxlbmd0aC0xXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNsaWRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHNsaWRlID0gdGhpcy5zbGlkZXNbaV1cblx0XHRcdGlmKGkgPT0gMikge1xuXHRcdFx0XHRzbGlkZS5oaWdobGlnaHQgPSB0cnVlIC8vIEhpZ2hsaWdodCB0aGUgbWlkZGxlIGVsZW1lbnRzXG5cdFx0XHRcdHRoaXMuY3VycmVudElkID0gc2xpZGUuaWRcblx0XHRcdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLnNldENoaWxkSW5kZXgoc2xpZGUud3JhcHBlckNvbnRhaW5lciwgdG90YWxMZW4pXG5cdFx0XHRcdHRoaXMudXBkYXRlVGl0bGVzKHRoaXMucGxhbmV0VGl0bGVUeHQsIHNsaWRlLnBsYW5ldE5hbWUpXG5cdFx0XHRcdHRoaXMucG9zaXRpb25UaXRsZXNDb250YWluZXIoKVxuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHNsaWRlLmhpZ2hsaWdodCA9IGZhbHNlXG5cdFx0XHRcdHRoaXMuc2xpZGVzaG93V3JhcHBlci5zZXRDaGlsZEluZGV4KHNsaWRlLndyYXBwZXJDb250YWluZXIsIGkpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGFwcGx5UmVzcG9uc2l2ZUltZ1RvU2xpZGVEZXBlbmRzV2luZG93KHNsaWRlKSB7XG5cdFx0dmFyIHMgPSBzbGlkZVxuXHRcdHZhciBpbWdVcmwgPSBBcHBTdG9yZS5tYWluSW1hZ2VVcmwocy5pZCwgQXBwQ29uc3RhbnRzLlJFU1BPTlNJVkVfSU1BR0UpXG5cdFx0aWYocy5pbWdVcmwgIT0gaW1nVXJsKSB7XG5cdFx0XHRzLmltZ1Jlc3BvbnNpdmVTaXplID0gQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlU2l6ZShBcHBDb25zdGFudHMuUkVTUE9OU0lWRV9JTUFHRSlcblx0XHRcdHMudGV4dHVyZS5kZXN0cm95KHRydWUpXG5cdFx0XHRzLnRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGltZ1VybClcblx0XHRcdHMuc3ByaXRlLnRleHR1cmUgPSBzLnRleHR1cmVcblx0XHRcdHMuaW1nVXJsID0gaW1nVXJsXG5cdFx0fVxuXHR9XG5cdHJlc2l6ZUFuZFBvc2l0aW9uSW1nU3ByaXRlKHNsaWRlLCBtYXNrU2xpZGVXLCB3aW5kb3dXLCB3aW5kb3dIKSB7XG5cdFx0dmFyIHMgPSBzbGlkZVxuXHRcdHZhciByZXNpemVWYXJzID0gVXRpbHMuUmVzaXplUG9zaXRpb25Qcm9wb3J0aW9uYWxseVdpdGhBbmNob3JDZW50ZXIobWFza1NsaWRlVywgd2luZG93SCwgcy5pbWdSZXNwb25zaXZlU2l6ZVswXSwgcy5pbWdSZXNwb25zaXZlU2l6ZVsxXSlcblx0XHRzLnNwcml0ZS5hbmNob3IueCA9IDAuNVxuXHRcdHMuc3ByaXRlLmFuY2hvci55ID0gMC41XG5cdFx0cy5zcHJpdGUuc2NhbGUueCA9IHJlc2l6ZVZhcnMuc2NhbGVcblx0XHRzLnNwcml0ZS5zY2FsZS55ID0gcmVzaXplVmFycy5zY2FsZVxuXHRcdHMuc3ByaXRlLndpZHRoID0gcmVzaXplVmFycy53aWR0aFxuXHRcdHMuc3ByaXRlLmhlaWdodCA9IHJlc2l6ZVZhcnMuaGVpZ2h0XG5cdFx0cy5zcHJpdGUueCA9IHJlc2l6ZVZhcnMubGVmdFxuXHRcdHMuc3ByaXRlLnkgPSByZXNpemVWYXJzLnRvcFxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR2YXIgc2xpZGVzID0gdGhpcy5zbGlkZXNcblx0XHR0aGlzLmNvdW50ZXIgKz0gMC4wMTJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNsaWRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHMgPSBzbGlkZXNbaV1cblx0XHRcdHMubWFza1JlY3QudmFsdWVTY2FsZSArPSAoMC40IC0gcy5tYXNrUmVjdC52YWx1ZVNjYWxlKSAqIDAuMDVcblx0XHRcdHZhciBlYXNlID0gdGhpcy5tYXNrRWFzaW5nLmdldChzLm1hc2tSZWN0LnZhbHVlU2NhbGUpXG5cdFx0XHRzLndyYXBwZXJDb250YWluZXIueCArPSAocy5uZXdQb3NpdGlvbi54IC0gcy53cmFwcGVyQ29udGFpbmVyLngpICogZWFzZVxuXHRcdFx0cy5tYXNrUmVjdC53aWR0aCA9IHMubWFza1JlY3QubmV3VyAqIGVhc2Vcblx0XHRcdHZhciBtYXNrUmVjdFggPSAoMSAtIGVhc2UpICogcy5tYXNrUmVjdC5uZXdYXG5cdFx0XHR0aGlzLmRyYXdDZW50ZXJlZE1hc2tSZWN0KHMubWFza1JlY3QuZywgbWFza1JlY3RYLCAwLCBzLm1hc2tSZWN0LndpZHRoLCBzLm1hc2tSZWN0LmhlaWdodClcblx0XHRcdHMuc3ByaXRlLnNrZXcueCA9IE1hdGguY29zKHRoaXMuY291bnRlcikgKiAwLjAyMFxuXHRcdFx0cy5zcHJpdGUuc2tldy55ID0gTWF0aC5zaW4odGhpcy5jb3VudGVyKSAqIDAuMDIwXG5cdFx0fVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlLnggKz0gKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFkgLSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54KSAqIDAuMDhcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS55ICs9ICh0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZVhZIC0gdGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueCkgKiAwLjA4XG5cdFx0Ly8gdGhpcy5zbGlkZXNob3dDb250YWluZXIueSA9IHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLmJhc2VZICsgTWF0aC5zaW4odGhpcy5jb3VudGVyKSAqIDRcblx0fVxuXHRwb3NpdGlvblNsaWRlc2hvd0NvbnRhaW5lcigpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBsYXN0U2xpZGUgPSB0aGlzLnNsaWRlc1t0aGlzLnNsaWRlcy5sZW5ndGgtMV1cblx0XHR2YXIgY29udGFpbmVyVG90YWxXID0gbGFzdFNsaWRlLm5ld1Bvc2l0aW9uLnggKyBsYXN0U2xpZGUubWFza1JlY3QubmV3V1xuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnBpdm90LnggPSBjb250YWluZXJUb3RhbFcgPj4gMVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnBpdm90LnkgPSB3aW5kb3dIID4+IDFcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci54ID0gKHdpbmRvd1cgPj4gMSlcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci55ID0gKHdpbmRvd0ggPj4gMSlcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5iYXNlWSA9IHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnlcblx0XHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54ID0gMS4zXG5cdFx0dGhpcy5zbGlkZXNob3dDb250YWluZXIuc2NhbGUueSA9IDEuM1xuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnNjYWxlWFkgPSAxLjA1XG5cdH1cblx0YXBwbHlWYWx1ZXNUb1NsaWRlcygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBjdXJyZW50UG9zWCA9IDBcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2xpZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcyA9IHRoaXMuc2xpZGVzW2ldXG5cdFx0XHR0aGlzLmFwcGx5UmVzcG9uc2l2ZUltZ1RvU2xpZGVEZXBlbmRzV2luZG93KHMpXG5cdFx0XHR2YXIgaGlnaHRsaWdodGVkU2xpZGVXID0gd2luZG93VyAqICgxIC0gKEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFICogMikpXG5cdFx0XHR2YXIgbm9ybWFsU2xpZGVXID0gd2luZG93VyAqIEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFXG5cdFx0XHR2YXIgc2xpZGVXID0gMFxuXHRcdFx0aWYocy5oaWdobGlnaHQpIHNsaWRlVyA9IGhpZ2h0bGlnaHRlZFNsaWRlV1xuXHRcdFx0ZWxzZSBzbGlkZVcgPSBub3JtYWxTbGlkZVdcblx0XHRcdHRoaXMucmVzaXplQW5kUG9zaXRpb25JbWdTcHJpdGUocywgc2xpZGVXLCB3aW5kb3dXLCB3aW5kb3dIKVxuXHRcdFx0cy5tYXNrUmVjdC5uZXdXID0gc2xpZGVXXG5cdFx0XHRzLm1hc2tSZWN0LmhlaWdodCA9IHdpbmRvd0hcblx0XHRcdHMubWFza1JlY3QubmV3WCA9IHNsaWRlVyA+PiAxXG5cdFx0XHRzLm1hc2tSZWN0LnZhbHVlU2NhbGUgPSAyXG5cdFx0XHRzLm9sZFBvc2l0aW9uLnggPSBzLm5ld1Bvc2l0aW9uLnhcblx0XHRcdHMubmV3UG9zaXRpb24ueCA9IGN1cnJlbnRQb3NYXG5cdFx0XHRpZih0aGlzLmVsZW1lbnRUaGF0TW92ZWRJblNsaWRlc0FycmF5ICE9IHVuZGVmaW5lZCAmJiB0aGlzLmVsZW1lbnRUaGF0TW92ZWRJblNsaWRlc0FycmF5LmlkID09IHMuaWQpe1xuXHRcdFx0XHRzLndyYXBwZXJDb250YWluZXIueCA9IHMubmV3UG9zaXRpb24ueFxuXHRcdFx0fVxuXHRcdFx0Y3VycmVudFBvc1ggKz0gc2xpZGVXXG5cdFx0fVxuXHRcdHRoaXMucG9zaXRpb25TbGlkZXNob3dDb250YWluZXIoKVxuXHR9XG5cdHBvc2l0aW9uVGl0bGVzQ29udGFpbmVyKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGl0bGVUaW1lb3V0KVxuXHRcdHRoaXMudGl0bGVUaW1lb3V0ID0gc2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dmFyIHRvcE9mZnNldCA9ICh3aW5kb3dIID4+IDEpICsgKHdpbmRvd0ggKiBBcHBDb25zdGFudHMuQ09NUEFTU19TSVpFX1BFUkNFTlRBR0UpIC0gKHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LmhlaWdodCgpID4+IDEpXG5cdFx0XHR2YXIgdGl0bGVzQ29udGFpbmVyQ3NzID0ge1xuXHRcdFx0XHR0b3A6IHRvcE9mZnNldCArICgod2luZG93SCAtIHRvcE9mZnNldCkgPj4gMSksXG5cdFx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKHRoaXMudGl0bGVDb250YWluZXIucGFyZW50LndpZHRoKCkgPj4gMSksXG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRpdGxlQ29udGFpbmVyLnBhcmVudC5jc3ModGl0bGVzQ29udGFpbmVyQ3NzKVxuXHRcdH0sIDApXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuYXBwbHlWYWx1ZXNUb1NsaWRlcygpXG5cdFx0dGhpcy5wb3NpdGlvblRpdGxlc0NvbnRhaW5lcigpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cblx0XHR2YXIgc2xpZGVzID0gdGhpcy5zbGlkZXNcblx0IFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzbGlkZXMubGVuZ3RoOyBpKyspIHtcblx0IFx0XHR2YXIgcyA9IHNsaWRlc1tpXVxuXG5cdCBcdFx0cy5tYXNrUmVjdC5nLmNsZWFyKClcblx0IFx0XHRBcHBTdG9yZS5yZWxlYXNlR3JhcGhpY3Mocy5tYXNrUmVjdC5nKVxuXG5cdCBcdFx0cy5zcHJpdGUudGV4dHVyZS5kZXN0cm95KHRydWUpXG5cdCBcdFx0QXBwU3RvcmUucmVsZWFzZVNwcml0ZShzLnNwcml0ZSlcblxuXHQgXHRcdHMud3JhcHBlckNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpXG5cdCBcdFx0QXBwU3RvcmUucmVsZWFzZUNvbnRhaW5lcihzLndyYXBwZXJDb250YWluZXIpXG5cdCBcdH1cblxuXHQgXHR0aGlzLnNsaWRlcy5sZW5ndGggPSAwXG5cblx0IFx0Ly8gVE9ETyBjbGVhciB0aGF0IGFuZCBwdXQgaXQgYmFjayB0byBwb29sXG5cdCAvLyBcdGRlbGV0ZSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZVhZXG5cdCAvLyBcdGRlbGV0ZSB0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5iYXNlWVxuXHQgLy8gXHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS54ID0gMVxuXHQgLy8gXHR0aGlzLnNsaWRlc2hvd0NvbnRhaW5lci5zY2FsZS55ID0gMVxuXHRcdHRoaXMuc2xpZGVzaG93Q29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHQvLyBBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMuc2xpZGVzaG93Q29udGFpbmVyKVxuXG5cdFx0dGhpcy5zbGlkZXNob3dXcmFwcGVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMuc2xpZGVzaG93V3JhcHBlcilcblx0XHRcblx0fVxufVxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBYQ29udGFpbmVyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdH1cblx0aW5pdChlbGVtZW50SWQpIHtcblxuXHRcdHRoaXMuZGlkSGFzaGVyQ2hhbmdlID0gdGhpcy5kaWRIYXNoZXJDaGFuZ2UuYmluZCh0aGlzKVxuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VELCB0aGlzLmRpZEhhc2hlckNoYW5nZSlcblxuXHRcdC8vIHRoaXMucmVuZGVyZXIgPSBuZXcgUElYSS5DYW52YXNSZW5kZXJlcig4MDAsIDYwMClcblx0XHR0aGlzLnJlbmRlcmVyID0gbmV3IFBJWEkuYXV0b0RldGVjdFJlbmRlcmVyKDgwMCwgNjAwLCB7IGFudGlhbGlhczogdHJ1ZSB9KVxuXG5cdFx0dmFyIGVsID0gJChlbGVtZW50SWQpXG5cdFx0JCh0aGlzLnJlbmRlcmVyLnZpZXcpLmF0dHIoJ2lkJywgJ3B4LWNvbnRhaW5lcicpXG5cdFx0ZWwuYXBwZW5kKHRoaXMucmVuZGVyZXIudmlldylcblxuXHRcdHRoaXMuc3RhZ2UgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHR9XG5cdGFkZChjaGlsZCkge1xuXHRcdHRoaXMuc3RhZ2UuYWRkQ2hpbGQoY2hpbGQpXG5cdH1cblx0cmVtb3ZlKGNoaWxkKSB7XG5cdFx0dGhpcy5zdGFnZS5yZW1vdmVDaGlsZChjaGlsZClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdCAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnN0YWdlKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHRoaXMucmVuZGVyZXIucmVzaXplKHdpbmRvd1csIHdpbmRvd0gpXG5cdH1cblx0ZGlkSGFzaGVyQ2hhbmdlKCkge1xuXHRcdHZhciBwYWdlSWQgPSBBcHBTdG9yZS5nZXRQYWdlSWQoKVxuXHRcdHZhciBwYWxldHRlID0gQXBwU3RvcmUucGFsZXR0ZUNvbG9yc0J5SWQocGFnZUlkKVxuXHRcdGlmKHBhbGV0dGUgIT0gdW5kZWZpbmVkKSB0aGlzLnJlbmRlcmVyLmJhY2tncm91bmRDb2xvciA9IHBhbGV0dGVbMF1cblx0fVxufVxuIiwiaW1wb3J0IEJhc2VQYWdlIGZyb20gJ0Jhc2VQYWdlJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYWdlIGV4dGVuZHMgQmFzZVBhZ2Uge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKVxuXHRcdHRoaXMucmVzaXplID0gdGhpcy5yZXNpemUuYmluZCh0aGlzKVxuXHRcdHRoaXMucHhDb250YWluZXIgPSBBcHBTdG9yZS5nZXRDb250YWluZXIoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXG5cdFx0aWYodGhpcy5wcm9wcy50eXBlID09IEFwcENvbnN0YW50cy5MQU5ESU5HKSB0aGlzLnBhcmVudC5jc3MoJ2N1cnNvcicsICdwb2ludGVyJylcblx0XHRlbHNlIHRoaXMucGFyZW50LmNzcygnY3Vyc29yJywgJ2F1dG8nKVxuXG5cdFx0c2V0VGltZW91dCgoKT0+e0FwcEFjdGlvbnMucHhBZGRDaGlsZCh0aGlzLnB4Q29udGFpbmVyKX0sIDApXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuV0lORE9XX1JFU0laRSwgdGhpcy5yZXNpemUpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbE1vdW50KClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c2V0VGltZW91dCgoKT0+e0FwcEFjdGlvbnMucHhSZW1vdmVDaGlsZCh0aGlzLnB4Q29udGFpbmVyKX0sIDApXG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRzZXR1cEFuaW1hdGlvbnMoKSB7XG5cdFx0c3VwZXIuc2V0dXBBbmltYXRpb25zKClcblx0fVxuXHRnZXRJbWFnZVVybEJ5SWQoaWQpIHtcblx0XHRyZXR1cm4gQXBwU3RvcmUuUHJlbG9hZGVyLmdldEltYWdlVVJMKHRoaXMuaWQgKyAnLScgKyB0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKSArICctJyArIGlkKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLnB4Q29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIpXG5cdFx0QXBwU3RvcmUub2ZmKEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFLCB0aGlzLnJlc2l6ZSlcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdH1cbn1cbiIsImltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJ0Jhc2VDb21wb25lbnQnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBCYXNlUGFnZXIgZnJvbSAnQmFzZVBhZ2VyJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5pbXBvcnQgTGFuZGluZyBmcm9tICdMYW5kaW5nJ1xuaW1wb3J0IExhbmRpbmdUZW1wbGF0ZSBmcm9tICdMYW5kaW5nX2hicydcbmltcG9ydCBQbGFuZXRFeHBlcmllbmNlUGFnZSBmcm9tICdQbGFuZXRFeHBlcmllbmNlUGFnZSdcbmltcG9ydCBQbGFuZXRFeHBlcmllbmNlUGFnZVRlbXBsYXRlIGZyb20gJ1BsYW5ldEV4cGVyaWVuY2VQYWdlX2hicydcbmltcG9ydCBQbGFuZXRDYW1wYWlnblBhZ2UgZnJvbSAnUGxhbmV0Q2FtcGFpZ25QYWdlJ1xuaW1wb3J0IFBsYW5ldENhbXBhaWduUGFnZVRlbXBsYXRlIGZyb20gJ1BsYW5ldENhbXBhaWduUGFnZV9oYnMnXG5cbmNsYXNzIFBhZ2VzQ29udGFpbmVyIGV4dGVuZHMgQmFzZVBhZ2VyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IGZhbHNlXG5cdH1cblx0Y29tcG9uZW50V2lsbE1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9uKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9DSEFOR0VELCB0aGlzLmRpZEhhc2hlckNoYW5nZSlcblx0XHRBcHBTdG9yZS5vbihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfSU5URVJOQUxfQ0hBTkdFLCB0aGlzLmRpZEhhc2hlckludGVybmFsQ2hhbmdlKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEFwcFN0b3JlLm9mZihBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRCwgdGhpcy5kaWRIYXNoZXJDaGFuZ2UpXG5cdFx0QXBwU3RvcmUub2ZmKEFwcENvbnN0YW50cy5QQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0UsIHRoaXMuZGlkSGFzaGVySW50ZXJuYWxDaGFuZ2UpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG5cdGRpZEhhc2hlckludGVybmFsQ2hhbmdlKCkge1xuXHRcdHRoaXMuY3VycmVudENvbXBvbmVudC5pbnRlcm5hbEhhc2hlckNoYW5nZWQoKVxuXHR9XG5cdGRpZEhhc2hlckNoYW5nZSgpIHtcblx0XHQvLyBTd2FsbG93IGhhc2hlciBjaGFuZ2UgaWYgdGhlIGNoYW5nZSBpcyBmYXN0IGFzIDFzZWNcblx0XHRpZih0aGlzLnN3YWxsb3dIYXNoZXJDaGFuZ2UpIHJldHVybiBcblx0XHRlbHNlIHRoaXMuc2V0dXBOZXdib3JuQ29tcG9uZW50cygpXG5cdFx0dGhpcy5zd2FsbG93SGFzaGVyQ2hhbmdlID0gdHJ1ZVxuXHRcdHRoaXMuaGFzaGVyQ2hhbmdlVGltZW91dCA9IHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuc3dhbGxvd0hhc2hlckNoYW5nZSA9IGZhbHNlXG5cdFx0fSwgMTAwMClcblx0fVxuXHRzZXR1cE5ld2Jvcm5Db21wb25lbnRzKCkge1xuXHRcdHZhciBoYXNoID0gUm91dGVyLmdldE5ld0hhc2goKVxuXHRcdHZhciB0ZW1wbGF0ZSA9IHsgdHlwZTogdW5kZWZpbmVkLCBwYXJ0aWFsOiB1bmRlZmluZWQgfVxuXHRcdHN3aXRjaChoYXNoLnBhcnRzLmxlbmd0aCkge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gTGFuZGluZ1xuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gTGFuZGluZ1RlbXBsYXRlXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXBsYXRlLnR5cGUgPSBQbGFuZXRFeHBlcmllbmNlUGFnZVxuXHRcdFx0XHR0ZW1wbGF0ZS5wYXJ0aWFsID0gUGxhbmV0RXhwZXJpZW5jZVBhZ2VUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHR0ZW1wbGF0ZS50eXBlID0gUGxhbmV0Q2FtcGFpZ25QYWdlXG5cdFx0XHRcdHRlbXBsYXRlLnBhcnRpYWwgPSBQbGFuZXRDYW1wYWlnblBhZ2VUZW1wbGF0ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGVtcGxhdGUudHlwZSA9IExhbmRpbmdcblx0XHRcdFx0dGVtcGxhdGUucGFydGlhbCA9IExhbmRpbmdUZW1wbGF0ZVx0XHRcblx0XHR9XG5cblx0XHR0aGlzLnNldHVwTmV3Q29tcG9uZW50KGhhc2gucGFyZW50LCB0ZW1wbGF0ZSlcblx0XHR0aGlzLmN1cnJlbnRDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLmN1cnJlbnRDb21wb25lbnQgIT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJlbnRDb21wb25lbnQudXBkYXRlKClcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQYWdlc0NvbnRhaW5lclxuXG5cblxuIiwiaW1wb3J0IEJhc2VQbGFuZXRQYWdlIGZyb20gJ0Jhc2VQbGFuZXRQYWdlJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuLy8gaW1wb3J0IENvbXBhc3MgZnJvbSAnQ29tcGFzcydcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFycm93QnRuIGZyb20gJ0Fycm93QnRuJ1xuaW1wb3J0IFJlY3RhbmdsZUJ0biBmcm9tICdSZWN0YW5nbGVCdG4nXG5pbXBvcnQgVGl0bGVTd2l0Y2hlciBmcm9tICdUaXRsZVN3aXRjaGVyJ1xuaW1wb3J0IHthZGRXaGVlbExpc3RlbmVyfSBmcm9tICd3aGVlbCdcbmltcG9ydCB7cmVtb3ZlV2hlZWxMaXN0ZW5lcn0gZnJvbSAnd2hlZWwnXG5pbXBvcnQgaW5lcnRpYSBmcm9tICd3aGVlbC1pbmVydGlhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGFuZXRDYW1wYWlnblBhZ2UgZXh0ZW5kcyBCYXNlUGxhbmV0UGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0cHJvcHMuZGF0YVsnZW1wdHktaW1hZ2UnXSA9IEFwcFN0b3JlLmdldEVtcHR5SW1nVXJsKClcblx0XHRzdXBlcihwcm9wcylcblx0XHR0aGlzLnByb2R1Y3RJZCA9IHVuZGVmaW5lZFxuXHRcdHRoaXMuZnJvbUludGVybmFsQ2hhbmdlID0gZmFsc2Vcblx0XHR0aGlzLmN1cnJlbnRJbmRleCA9IDBcblx0XHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5MRUZUXG5cdFx0dGhpcy5jdXJyZW50UHJvZHVjdENvbnRhaW5lckNsYXNzID0gJ3Byb2R1Y3QtY29udGFpbmVyLWInXG5cdFx0dGhpcy5pc0luVmlkZW8gPSBmYWxzZVxuXHRcdHRoaXMudGltZW91dFRpbWUgPSA5MDBcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmFuaW1hdGlvbnMgPSB7XG5cdFx0XHRvbGRDb250YWluZXJBbmltYXRpb246IHVuZGVmaW5lZCxcblx0XHRcdG5ld0NvbnRhaW5lckFuaW1hdGlvbjogdW5kZWZpbmVkXG5cdFx0fVxuXG5cdFx0dGhpcy5wcm9kdWN0cyA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQodGhpcy5pZClcblxuXHRcdHZhciBpbmZvcyA9IEFwcFN0b3JlLmdlbmVyYWxJbmZvc0xhbmdTY29wZSgpXG5cdFx0dmFyIHByb2R1Y3RDb250YWluZXJzV3JhcHBlciA9IHRoaXMuY2hpbGQuZmluZCgnLnByb2R1Y3QtY29udGFpbmVycy13cmFwcGVyJylcblx0XHR2YXIgY29udGFpbmVyQSA9IHByb2R1Y3RDb250YWluZXJzV3JhcHBlci5maW5kKCcucHJvZHVjdC1jb250YWluZXItYScpXG5cdFx0dmFyIGNvbnRhaW5lckIgPSBwcm9kdWN0Q29udGFpbmVyc1dyYXBwZXIuZmluZCgnLnByb2R1Y3QtY29udGFpbmVyLWInKVxuXHRcdHRoaXMuY29udGFpbmVycyA9IHtcblx0XHRcdCdwcm9kdWN0LWNvbnRhaW5lci1hJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQSxcblx0XHRcdFx0cG9zdGVyV3JhcHBlcjogY29udGFpbmVyQS5maW5kKCcucG9zdGVyLXdyYXBwZXInKSxcblx0XHRcdFx0cG9zdGVySW1nOiBjb250YWluZXJBLmZpbmQoJ2ltZycpLFxuXHRcdFx0XHR2aWRlb1dyYXBwZXI6IGNvbnRhaW5lckEuZmluZCgnLnZpZGVvLXdyYXBwZXInKVxuXHRcdFx0fSxcblx0XHRcdCdwcm9kdWN0LWNvbnRhaW5lci1iJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQixcblx0XHRcdFx0cG9zdGVyV3JhcHBlcjogY29udGFpbmVyQi5maW5kKCcucG9zdGVyLXdyYXBwZXInKSxcblx0XHRcdFx0cG9zdGVySW1nOiBjb250YWluZXJCLmZpbmQoJ2ltZycpLFxuXHRcdFx0XHR2aWRlb1dyYXBwZXI6IGNvbnRhaW5lckIuZmluZCgnLnZpZGVvLXdyYXBwZXInKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuYXJyb3dDbGlja2VkID0gdGhpcy5hcnJvd0NsaWNrZWQuYmluZCh0aGlzKVxuXHRcdHRoaXMub25Eb3duQ2xpY2tlZCA9IHRoaXMub25Eb3duQ2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vbkJ1eUNsaWNrZWQgPSB0aGlzLm9uQnV5Q2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0dGhpcy5vblBsYW5ldENsaWNrZWQgPSB0aGlzLm9uUGxhbmV0Q2xpY2tlZC5iaW5kKHRoaXMpXG5cblx0XHR0aGlzLnByZXZpb3VzQnRuID0gbmV3IEFycm93QnRuKHRoaXMuY2hpbGQuZmluZCgnLnByZXZpb3VzLWJ0bicpLCBBcHBDb25zdGFudHMuTEVGVClcblx0XHR0aGlzLnByZXZpb3VzQnRuLmJ0bkNsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZFxuXHRcdHRoaXMucHJldmlvdXNCdG4uY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdHRoaXMubmV4dEJ0biA9IG5ldyBBcnJvd0J0bih0aGlzLmNoaWxkLmZpbmQoJy5uZXh0LWJ0bicpLCBBcHBDb25zdGFudHMuUklHSFQpXG5cdFx0dGhpcy5uZXh0QnRuLmJ0bkNsaWNrZWQgPSB0aGlzLmFycm93Q2xpY2tlZFxuXHRcdHRoaXMubmV4dEJ0bi5jb21wb25lbnREaWRNb3VudCgpXG5cdFx0dGhpcy5kb3duQnRuID0gbmV3IEFycm93QnRuKHRoaXMuY2hpbGQuZmluZCgnLmRvd24tYnRuJyksIEFwcENvbnN0YW50cy5CT1RUT00pXG5cdFx0dGhpcy5kb3duQnRuLmJ0bkNsaWNrZWQgPSB0aGlzLm9uRG93bkNsaWNrZWRcblx0XHR0aGlzLmRvd25CdG4uY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5idXlCdG4gPSBuZXcgUmVjdGFuZ2xlQnRuKHRoaXMuY2hpbGQuZmluZCgnLmJ1eS1idG4nKSwgaW5mb3MuYnV5X3RpdGxlKVxuXHRcdHRoaXMuYnV5QnRuLmJ0bkNsaWNrZWQgPSB0aGlzLm9uQnV5Q2xpY2tlZFxuXHRcdHRoaXMuYnV5QnRuLmNvbXBvbmVudERpZE1vdW50KClcblxuXHRcdHRoaXMucGxhbmV0QnRuID0gbmV3IFJlY3RhbmdsZUJ0bih0aGlzLmNoaWxkLmZpbmQoJy5wbGFuZXQtYnRuJyksIHRoaXMuaWQpXG5cdFx0dGhpcy5wbGFuZXRCdG4uYnRuQ2xpY2tlZCA9IHRoaXMub25QbGFuZXRDbGlja2VkXG5cdFx0dGhpcy5wbGFuZXRCdG4uY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5wcm9kdWN0VGl0bGUgPSBuZXcgVGl0bGVTd2l0Y2hlcih0aGlzLmNoaWxkLmZpbmQoJy5wcm9kdWN0LXRpdGxlLXdyYXBwZXInKSlcblx0XHR0aGlzLnByb2R1Y3RUaXRsZS5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHQvLyB0aGlzLmNvbXBhc3MgPSBuZXcgQ29tcGFzcyh0aGlzLnB4Q29udGFpbmVyLCBBcHBDb25zdGFudHMuQ0FNUEFJR04pXG5cdFx0Ly8gdGhpcy5jb21wYXNzLmtub3RSYWRpdXMgPSBBcHBDb25zdGFudHMuU01BTExfS05PVF9SQURJVVNcblx0XHQvLyB0aGlzLmNvbXBhc3MuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5vbldoZWVsID0gdGhpcy5vbldoZWVsLmJpbmQodGhpcylcblx0XHRhZGRXaGVlbExpc3RlbmVyKHRoaXMuY2hpbGQuZ2V0KDApLCB0aGlzLm9uV2hlZWwpXG5cdFx0aW5lcnRpYS5hZGRDYWxsYmFjayh0aGlzLm9uSW5lcnRpYSlcblxuXHRcdHRoaXMuY2hlY2tDdXJyZW50UHJvZHVjdEJ5VXJsKClcblx0XHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIHRoaXMub25LZXlQcmVzc2VkKVxuXG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdG9uSW5lcnRpYShkaXJlY3Rpb24pIHtcblx0XHR0aGlzLm9uRG93bkNsaWNrZWQoKVxuXHR9XG5cdG9uV2hlZWwoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdHZhciBkZWx0YSA9IGUud2hlZWxEZWx0YVxuXHRcdGluZXJ0aWEudXBkYXRlKGRlbHRhKVxuXHR9XG5cdG9uUGxhbmV0Q2xpY2tlZCgpIHtcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZFxuXHRcdFJvdXRlci5zZXRIYXNoKHVybClcblx0fVxuXHRvbkRvd25DbGlja2VkKCkge1xuXHRcdGlmKHRoaXMuYW5pbWF0aW9uUnVubmluZykgcmV0dXJuXG5cdFx0dGhpcy5hbmltYXRpb25SdW5uaW5nID0gdHJ1ZVxuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHRpZih0aGlzLmlzSW5WaWRlbykge1xuXHRcdFx0dGhpcy5pc0luVmlkZW8gPSBmYWxzZVxuXHRcdFx0VHdlZW5NYXgudG8odGhpcy5jdXJyZW50Q29udGFpbmVyLmVsLCAxLCB7IHk6MCwgZm9yY2UzRDogdHJ1ZSwgZWFzZTpFeHBvLmVhc2VJbk91dCB9KVxuXHRcdFx0VHdlZW5NYXgudG8odGhpcy5kb3duQnRuLmVsZW1lbnQsIDEsIHsgcm90YXRpb246Jy05MGRlZycsIGZvcmNlM0Q6IHRydWUsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHR9ZWxzZXtcblx0XHRcdHRoaXMuaXNJblZpZGVvID0gdHJ1ZVxuXHRcdFx0VHdlZW5NYXgudG8odGhpcy5jdXJyZW50Q29udGFpbmVyLmVsLCAxLCB7IHk6LXdpbmRvd0gsIGZvcmNlM0Q6IHRydWUsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHRcdFR3ZWVuTWF4LnRvKHRoaXMuZG93bkJ0bi5lbGVtZW50LCAxLCB7IHJvdGF0aW9uOic5MGRlZycsIGZvcmNlM0Q6IHRydWUsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSlcblx0XHR9XG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMudmlkZW9Bc3NpZ25UaW1lb3V0KVxuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuYW5pbWF0aW9uUnVubmluZyA9IGZhbHNlXG5cdFx0fSwgdGhpcy50aW1lb3V0VGltZSlcblx0XHRpZih0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW9Jc0FkZGVkICE9IHRydWUpIHtcblx0XHRcdHRoaXMudmlkZW9Bc3NpZ25UaW1lb3V0ID0gc2V0VGltZW91dCgoKT0+e1xuXHRcdFx0XHR0aGlzLmFzc2lnblZpZGVvVG9OZXdDb250YWluZXIoKVxuXHRcdFx0fSwgdGhpcy50aW1lb3V0VGltZSlcblx0XHR9XG5cdH1cblx0b25CdXlDbGlja2VkKCkge1xuXHRcdGNvbnNvbGUubG9nKCdidXknKVxuXHR9XG5cdGFycm93Q2xpY2tlZChkaXJlY3Rpb24pIHtcblx0XHRpZih0aGlzLmFuaW1hdGlvblJ1bm5pbmcpIHJldHVyblxuXHRcdHN3aXRjaChkaXJlY3Rpb24pIHtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxFRlQ6XG5cdFx0XHRcdHRoaXMucHJldmlvdXMoKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuUklHSFQ6XG5cdFx0XHRcdHRoaXMubmV4dCgpXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRoaXMudXBkYXRlSGFzaGVyKClcblx0fVxuXHRvbktleVByZXNzZWQoZSkge1xuXHRcdGlmKHRoaXMuYW5pbWF0aW9uUnVubmluZykgcmV0dXJuXG5cdCAgICBlLnByZXZlbnREZWZhdWx0KClcblx0XHRzd2l0Y2goZS53aGljaCkge1xuXHQgICAgICAgIGNhc2UgMzc6IC8vIGxlZnRcblx0ICAgICAgICBcdHRoaXMucHJldmlvdXMoKVxuXHQgICAgICAgIFx0dGhpcy51cGRhdGVIYXNoZXIoKVxuXHQgICAgICAgIFx0YnJlYWs7XG5cdCAgICAgICAgY2FzZSAzOTogLy8gcmlnaHRcblx0ICAgICAgICBcdHRoaXMubmV4dCgpXG5cdCAgICAgICAgXHR0aGlzLnVwZGF0ZUhhc2hlcigpXG5cdCAgICAgICAgXHRicmVhaztcblx0ICAgICAgICBjYXNlIDM4OiAvLyB1cFxuXHQgICAgICAgIFx0dGhpcy5vbkRvd25DbGlja2VkKClcblx0ICAgICAgICBcdGJyZWFrO1xuXHQgICAgICAgIGNhc2UgNDA6IC8vIGRvd25cblx0ICAgICAgICBcdHRoaXMub25Eb3duQ2xpY2tlZCgpXG5cdCAgICAgICAgXHRicmVhaztcblx0ICAgICAgICBkZWZhdWx0OiByZXR1cm47XG5cdCAgICB9XG5cdH1cblx0dXBkYXRlSGFzaGVyKCkge1xuXHRcdHZhciB1cmwgPSBcIi9wbGFuZXQvXCIgKyB0aGlzLmlkICsgJy8nICsgdGhpcy5jdXJyZW50SW5kZXhcblx0XHRSb3V0ZXIuc2V0SGFzaCh1cmwpXG5cdH1cblx0bmV4dCgpIHtcblx0XHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5MRUZUXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggKz0gMVxuXHRcdHRoaXMuY3VycmVudEluZGV4ID0gKHRoaXMuY3VycmVudEluZGV4ID4gdGhpcy5wcm9kdWN0cy5sZW5ndGgtMSkgPyAwIDogdGhpcy5jdXJyZW50SW5kZXhcblx0fVxuXHRwcmV2aW91cygpIHtcblx0XHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5SSUdIVFxuXHRcdHRoaXMuY3VycmVudEluZGV4IC09IDFcblx0XHR0aGlzLmN1cnJlbnRJbmRleCA9ICh0aGlzLmN1cnJlbnRJbmRleCA8IDApID8gdGhpcy5wcm9kdWN0cy5sZW5ndGgtMSA6IHRoaXMuY3VycmVudEluZGV4XG5cdH1cblx0Z2V0Q3VycmVudEluZGV4RnJvbVByb2R1Y3RJZChwcm9kdWN0SWQpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucHJvZHVjdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmKHRoaXMucHJvZHVjdHNbaV0uaWQgPT0gcHJvZHVjdElkKSB7XG5cdFx0XHRcdHJldHVybiBpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGludGVybmFsSGFzaGVyQ2hhbmdlZCgpIHtcblx0XHR0aGlzLmZyb21JbnRlcm5hbENoYW5nZSA9IHRydWVcblx0XHR0aGlzLmNoZWNrQ3VycmVudFByb2R1Y3RCeVVybCgpXG5cdH1cblx0Y2hlY2tDdXJyZW50UHJvZHVjdEJ5VXJsKCkge1xuXHRcdHZhciBuZXdIYXNoZXIgPSBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG5cdFx0dmFyIHByb2R1Y3RJZCA9IHBhcnNlSW50KG5ld0hhc2hlci50YXJnZXRJZCwgMTApXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggPSB0aGlzLmdldEN1cnJlbnRJbmRleEZyb21Qcm9kdWN0SWQocHJvZHVjdElkKVxuXHRcdHRoaXMuc2hvd1Byb2R1Y3RCeUlkKHByb2R1Y3RJZClcblx0fVxuXHRzaG93UHJvZHVjdEJ5SWQoaWQpIHtcblx0XHR0aGlzLmFuaW1hdGlvblJ1bm5pbmcgPSB0cnVlXG5cdFx0dGhpcy5wcm9kdWN0SWQgPSBpZFxuXHRcdHRoaXMuY3VycmVudFByb2R1Y3RDb250YWluZXJDbGFzcyA9ICh0aGlzLmN1cnJlbnRQcm9kdWN0Q29udGFpbmVyQ2xhc3MgPT09ICdwcm9kdWN0LWNvbnRhaW5lci1hJykgPyAncHJvZHVjdC1jb250YWluZXItYicgOiAncHJvZHVjdC1jb250YWluZXItYSdcblx0XHR0aGlzLnByZXZpb3VzQ29udGFpbmVyID0gdGhpcy5jdXJyZW50Q29udGFpbmVyXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyID0gdGhpcy5jb250YWluZXJzW3RoaXMuY3VycmVudFByb2R1Y3RDb250YWluZXJDbGFzc11cblx0XHRcblx0XHR0aGlzLmFzc2lnbkFzc2V0c1RvTmV3Q29udGFpbmVyKClcblx0XHR0aGlzLnJlc2l6ZU1lZGlhV3JhcHBlcnMoKVxuXHRcdHRoaXMuYW5pbWF0ZUNvbnRhaW5lcnMoKVxuXHR9XG5cdGFzc2lnbkFzc2V0c1RvTmV3Q29udGFpbmVyKCkge1xuXHRcdHZhciBwcm9kdWN0U2NvcGUgPSBBcHBTdG9yZS5nZXRTcGVjaWZpY1Byb2R1Y3RCeUlkKHRoaXMuaWQsIHRoaXMucHJvZHVjdElkKVxuXHRcdHZhciBpbWdTcmMgPSBBcHBTdG9yZS5nZXRFbnZpcm9ubWVudCgpLnN0YXRpYyArICcvaW1hZ2UvcGxhbmV0cy8nICsgdGhpcy5pZCArICcvJyArIHByb2R1Y3RTY29wZVsnaWQnXSArICctWEwnICsgJy5qcGcnXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnBvc3RlckltZy5hdHRyKCdzcmMnLCBpbWdTcmMpXG5cdFx0dGhpcy5wcm9kdWN0VGl0bGUudXBkYXRlKHByb2R1Y3RTY29wZS5uYW1lKVxuXHR9XG5cdGFzc2lnblZpZGVvVG9OZXdDb250YWluZXIoKSB7XG5cdFx0dmFyIHZpZGVvSWQgPSAxMzYwODA1OThcblx0XHR2YXIgaWZyYW1lU3RyID0gJzxpZnJhbWUgc3JjPVwiaHR0cHM6Ly9wbGF5ZXIudmltZW8uY29tL3ZpZGVvLycrdmlkZW9JZCsnP3RpdGxlPTAmYnlsaW5lPTAmcG9ydHJhaXQ9MFwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiBmcmFtZWJvcmRlcj1cIjBcIiB3ZWJraXRhbGxvd2Z1bGxzY3JlZW4gbW96YWxsb3dmdWxsc2NyZWVuIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT4nXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnZpZGVvV3JhcHBlci5odG1sKGlmcmFtZVN0cilcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW9Jc0FkZGVkID0gdHJ1ZVxuXHR9XG5cdGFuaW1hdGVDb250YWluZXJzKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dmFyIGRpciA9ICh0aGlzLmRpcmVjdGlvbiA9PSBBcHBDb25zdGFudHMuTEVGVCkgPyAxIDogLTFcblx0XHR2YXIgdGltZSA9ICh0aGlzLnByZXZpb3VzQ29udGFpbmVyID09IHVuZGVmaW5lZCkgPyAwIDogMVxuXHRcdGlmKHRoaXMucHJldmlvdXNDb250YWluZXIgIT0gdW5kZWZpbmVkKSBUd2Vlbk1heC5mcm9tVG8odGhpcy5wcmV2aW91c0NvbnRhaW5lci5lbCwgMSwge3g6MCwgb3BhY2l0eTogMX0sIHsgeDotd2luZG93VypkaXIsIG9wYWNpdHk6IDEsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFeHBvLmVhc2VJbk91dCB9KVxuXHRcdFR3ZWVuTWF4LmZyb21Ubyh0aGlzLmN1cnJlbnRDb250YWluZXIuZWwsIHRpbWUsIHt4OndpbmRvd1cqZGlyLCBvcGFjaXR5OiAxfSwgeyB4OjAsIG9wYWNpdHk6IDEsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFeHBvLmVhc2VJbk91dCB9KVxuXG5cdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0dGhpcy51cGRhdGVUb3BCdXR0b25zUG9zaXRpb25zKClcblx0XHRcdHRoaXMucHJvZHVjdFRpdGxlLnNob3coKVxuXHRcdH0sIDIwMClcblxuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHRoaXMuYW5pbWF0aW9uUnVubmluZyA9IGZhbHNlXG5cdFx0XHR0aGlzLnJlbW92ZVByZXZpb3VzQ29udGFpbmVyQXNzZXRzKClcblx0XHR9LCB0aGlzLnRpbWVvdXRUaW1lKVxuXHRcdGNsZWFyVGltZW91dCh0aGlzLnZpZGVvQXNzaWduVGltZW91dClcblx0XHRpZih0aGlzLmlzSW5WaWRlbykge1xuXHRcdFx0dGhpcy52aWRlb0Fzc2lnblRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRcdHRoaXMuYXNzaWduVmlkZW9Ub05ld0NvbnRhaW5lcigpXG5cdFx0XHR9LCB0aGlzLnRpbWVvdXRUaW1lKVxuXHRcdH1cblx0fVxuXHRyZW1vdmVQcmV2aW91c0NvbnRhaW5lckFzc2V0cygpIHtcblx0XHRpZih0aGlzLnByZXZpb3VzQ29udGFpbmVyID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cdFx0dGhpcy5wcmV2aW91c0NvbnRhaW5lci52aWRlb1dyYXBwZXIuaHRtbCgnJylcblx0XHR0aGlzLmN1cnJlbnRDb250YWluZXIudmlkZW9Jc0FkZGVkID0gZmFsc2Vcblx0fVxuXHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHQvLyB2YXIgcGxhbmV0RGF0YSA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YUJ5SWQodGhpcy5pZClcblx0XHQvLyB0aGlzLmNvbXBhc3MudXBkYXRlRGF0YShwbGFuZXREYXRhKVxuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0Ly8gdGhpcy5jb21wYXNzLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplTWVkaWFXcmFwcGVycygpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXHRcdHZhciBpbWFnZVJlc2l6ZSA9IFV0aWxzLlJlc2l6ZVBvc2l0aW9uUHJvcG9ydGlvbmFsbHkod2luZG93VyAqIDAuNiwgd2luZG93SCAqIDAuNiwgQXBwQ29uc3RhbnRzLkNBTVBBSUdOX0lNQUdFX1NJWkVbMF0sIEFwcENvbnN0YW50cy5DQU1QQUlHTl9JTUFHRV9TSVpFWzFdKVxuXHRcdHZhciB2aWRlb1Jlc2l6ZSA9IFV0aWxzLlJlc2l6ZVBvc2l0aW9uUHJvcG9ydGlvbmFsbHkod2luZG93VyAqIDAuNiwgd2luZG93SCAqIDAuNiwgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9XLCBBcHBDb25zdGFudHMuTUVESUFfR0xPQkFMX0gpXG5cdFx0dGhpcy5wb3N0ZXJJbWdDc3MgPSB7XG5cdFx0XHR3aWR0aDogaW1hZ2VSZXNpemUud2lkdGgsXG5cdFx0XHRoZWlnaHQ6IGltYWdlUmVzaXplLmhlaWdodCxcblx0XHRcdHRvcDogKHdpbmRvd0ggKiAwLjUxKSAtIChpbWFnZVJlc2l6ZS5oZWlnaHQgPj4gMSksXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSAtIChpbWFnZVJlc2l6ZS53aWR0aCA+PiAxKVxuXHRcdH1cblx0XHR2YXIgdmlkZW9Dc3MgPSB7XG5cdFx0XHR3aWR0aDogdmlkZW9SZXNpemUud2lkdGgsXG5cdFx0XHRoZWlnaHQ6IHZpZGVvUmVzaXplLmhlaWdodCxcblx0XHRcdHRvcDogd2luZG93SCArICh3aW5kb3dIICogMC41MSkgLSAodmlkZW9SZXNpemUuaGVpZ2h0ID4+IDEpLFxuXHRcdFx0bGVmdDogKHdpbmRvd1cgPj4gMSkgLSAodmlkZW9SZXNpemUud2lkdGggPj4gMSlcdFxuXHRcdH1cblx0XHRpZih0aGlzLmlzSW5WaWRlbykgVHdlZW5NYXguc2V0KHRoaXMuY3VycmVudENvbnRhaW5lci5lbCwgeyB5Oi13aW5kb3dIIH0pXG5cdFx0ZWxzZSBUd2Vlbk1heC5zZXQodGhpcy5jdXJyZW50Q29udGFpbmVyLmVsLCB7IHk6MCB9KVxuXHRcdGlmKHRoaXMucHJldmlvdXNDb250YWluZXIgIT0gdW5kZWZpbmVkKSB0aGlzLnByZXZpb3VzQ29udGFpbmVyLmVsLmNzcygnei1pbmRleCcsIDEpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLmVsLmNzcygnei1pbmRleCcsIDIpXG5cdFx0dGhpcy5jdXJyZW50Q29udGFpbmVyLnBvc3RlcldyYXBwZXIuY3NzKHRoaXMucG9zdGVySW1nQ3NzKVxuXHRcdHRoaXMuY3VycmVudENvbnRhaW5lci52aWRlb1dyYXBwZXIuY3NzKHZpZGVvQ3NzKVxuXHR9XG5cdHVwZGF0ZVRvcEJ1dHRvbnNQb3NpdGlvbnMoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnByb2R1Y3RUaXRsZS5wb3NpdGlvbihcblx0XHRcdCh3aW5kb3dXID4+IDEpIC0gKHRoaXMucHJvZHVjdFRpdGxlLndpZHRoID4+IDEpLFxuXHRcdFx0KHRoaXMucG9zdGVySW1nQ3NzLnRvcCA+PiAxKSAtICh0aGlzLnByb2R1Y3RUaXRsZS5oZWlnaHQgKiAwLjQpXG5cdFx0KVxuXHRcdHRoaXMucGxhbmV0QnRuLnBvc2l0aW9uKFxuXHRcdFx0dGhpcy5wcm9kdWN0VGl0bGUueCAtIHRoaXMucGxhbmV0QnRuLndpZHRoIC0gKEFwcENvbnN0YW50cy5QQURESU5HX0FST1VORCA8PCAxKSxcblx0XHRcdHRoaXMucHJvZHVjdFRpdGxlLnlcblx0XHQpXG5cdFx0dGhpcy5idXlCdG4ucG9zaXRpb24oXG5cdFx0XHR0aGlzLnByb2R1Y3RUaXRsZS54ICsgdGhpcy5wcm9kdWN0VGl0bGUud2lkdGggKyAoQXBwQ29uc3RhbnRzLlBBRERJTkdfQVJPVU5EIDw8IDEpLFxuXHRcdFx0dGhpcy5wcm9kdWN0VGl0bGUueVxuXHRcdClcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdC8vIHRoaXMuY29tcGFzcy5yZXNpemUoKVxuXHRcdC8vIHRoaXMuY29tcGFzcy5wb3NpdGlvbihcblx0XHQvLyBcdHdpbmRvd1cgPj4gMSwgd2luZG93SCAqIDAuMTZcblx0XHQvLyApXG5cblx0XHR0aGlzLnJlc2l6ZU1lZGlhV3JhcHBlcnMoKVxuXG5cdFx0dGhpcy5wcmV2aW91c0J0bi5wb3NpdGlvbihcblx0XHRcdCh0aGlzLnBvc3RlckltZ0Nzcy5sZWZ0ID4+IDEpIC0gKHRoaXMucHJldmlvdXNCdG4ud2lkdGggPj4gMSkgLSA0LFxuXHRcdFx0KHdpbmRvd0ggPj4gMSkgLSAodGhpcy5wcmV2aW91c0J0bi53aWR0aCA+PiAxKVxuXHRcdClcblx0XHR0aGlzLm5leHRCdG4ucG9zaXRpb24oXG5cdFx0XHQodGhpcy5wb3N0ZXJJbWdDc3MubGVmdCArIHRoaXMucG9zdGVySW1nQ3NzLndpZHRoKSArICgod2luZG93VyAtICh0aGlzLnBvc3RlckltZ0Nzcy5sZWZ0ICsgdGhpcy5wb3N0ZXJJbWdDc3Mud2lkdGgpKSA+PiAxKSAtICh0aGlzLm5leHRCdG4ud2lkdGggPj4gMSkgKyA0LFxuXHRcdFx0KHdpbmRvd0ggPj4gMSkgLSAodGhpcy5wcmV2aW91c0J0bi5oZWlnaHQgPj4gMSlcblx0XHQpXG5cdFx0dGhpcy5kb3duQnRuLnBvc2l0aW9uKFxuXHRcdFx0KHdpbmRvd1cgPj4gMSkgLSAodGhpcy5kb3duQnRuLndpZHRoID4+IDEpLFxuXHRcdFx0dGhpcy5wb3N0ZXJJbWdDc3MudG9wICsgdGhpcy5wb3N0ZXJJbWdDc3MuaGVpZ2h0ICsgKCh3aW5kb3dIIC0gKHRoaXMucG9zdGVySW1nQ3NzLnRvcCArIHRoaXMucG9zdGVySW1nQ3NzLmhlaWdodCkpID4+IDEpIC0gKHRoaXMuZG93bkJ0bi5oZWlnaHQgPj4gMSlcblx0XHQpXG5cblx0XHR0aGlzLnVwZGF0ZVRvcEJ1dHRvbnNQb3NpdGlvbnMoKVxuXG5cdFx0dmFyIGNoaWxkQ3NzID0ge1xuXHRcdFx0d2lkdGg6IHdpbmRvd1csXG5cdFx0XHRoZWlnaHQ6IHdpbmRvd0hcblx0XHR9XG5cdFx0dGhpcy5jaGlsZC5jc3MoY2hpbGRDc3MpXG5cblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdCQoZG9jdW1lbnQpLm9mZigna2V5ZG93bicsIHRoaXMub25LZXlQcmVzc2VkKVxuXHRcdGNsZWFyVGltZW91dCh0aGlzLnZpZGVvQXNzaWduVGltZW91dClcblx0XHRyZW1vdmVXaGVlbExpc3RlbmVyKHRoaXMuY2hpbGQuZ2V0KDApLCB0aGlzLm9uV2hlZWwpXG5cdFx0aW5lcnRpYS5hZGRDYWxsYmFjayhudWxsKVxuXHRcdC8vIHRoaXMuY29tcGFzcy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5wcmV2aW91c0J0bi5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5uZXh0QnRuLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmRvd25CdG4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuYnV5QnRuLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLnBsYW5ldEJ0bi5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVBsYW5ldFBhZ2UgZnJvbSAnQmFzZVBsYW5ldFBhZ2UnXG5pbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IENvbXBhc3Nlc0NvbnRhaW5lciBmcm9tICdDb21wYXNzZXNDb250YWluZXInXG5pbXBvcnQgUmVjdGFuZ2xlQnRuIGZyb20gJ1JlY3RhbmdsZUJ0bidcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuaW1wb3J0IEFsYXNrYVhQIGZyb20gJ0FsYXNrYVhQJ1xuaW1wb3J0IFNraVhQIGZyb20gJ1NraVhQJ1xuaW1wb3J0IE1ldGFsWFAgZnJvbSAnTWV0YWxYUCdcbmltcG9ydCBXb29kWFAgZnJvbSAnV29vZFhQJ1xuaW1wb3J0IEdlbVN0b25lWFAgZnJvbSAnR2VtU3RvbmVYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxhbmV0RXhwZXJpZW5jZVBhZ2UgZXh0ZW5kcyBCYXNlUGxhbmV0UGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cblx0XHR2YXIgaW5mb3MgPSBBcHBTdG9yZS5nZW5lcmFsSW5mb3NMYW5nU2NvcGUoKVxuXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIgPSBuZXcgQ29tcGFzc2VzQ29udGFpbmVyKHRoaXMucHhDb250YWluZXIsIHRoaXMuY2hpbGQpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuaWQgPSB0aGlzLmlkXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dmFyIFhwQ2xhenogPSB0aGlzLmdldEV4cGVyaWVuY2VCeUlkKHRoaXMuaWQpXG5cdFx0dGhpcy5leHBlcmllbmNlID0gbmV3IFhwQ2xhenooKVxuXHRcdHRoaXMuZXhwZXJpZW5jZS5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHR0aGlzLmdvQ2FtcGFpZ25CdG4gPSBuZXcgUmVjdGFuZ2xlQnRuKHRoaXMuY2hpbGQuZmluZCgnLmdvLWNhbXBhaWduLWJ0bicpLCBpbmZvcy5jYW1wYWlnbl90aXRsZSlcblx0XHR0aGlzLmdvQ2FtcGFpZ25CdG4uYnRuQ2xpY2tlZCA9IHRoaXMub25Hb0NhbXBhaWduQ2xpY2tlZFxuXHRcdHRoaXMuZ29DYW1wYWlnbkJ0bi5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0b25Hb0NhbXBhaWduQ2xpY2tlZCgpIHtcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZCArICcvMCdcblx0XHRSb3V0ZXIuc2V0SGFzaCh1cmwpXG5cdH1cblx0Z2V0RXhwZXJpZW5jZUJ5SWQoaWQpIHtcblx0XHRzd2l0Y2goaWQpe1xuXHRcdFx0Y2FzZSAnc2tpJzogcmV0dXJuIFNraVhQXG5cdFx0XHRjYXNlICdtZXRhbCc6IHJldHVybiBNZXRhbFhQXG5cdFx0XHRjYXNlICdhbGFza2EnOiByZXR1cm4gQWxhc2thWFBcblx0XHRcdGNhc2UgJ3dvb2QnOiByZXR1cm4gV29vZFhQXG5cdFx0XHRjYXNlICdnZW1zdG9uZSc6IHJldHVybiBHZW1TdG9uZVhQXG5cdFx0fVxuXHR9XG5cdGRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdHN1cGVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcdFxuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKClcblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0XHRzdXBlci53aWxsVHJhbnNpdGlvbk91dCgpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIud2lsbFRyYW5zaXRpb25PdXQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR0aGlzLmV4cGVyaWVuY2UudXBkYXRlKClcblx0XHR0aGlzLmNvbXBhc3Nlc0NvbnRhaW5lci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93VyA9IEFwcFN0b3JlLldpbmRvdy53XG5cdFx0dmFyIHdpbmRvd0ggPSBBcHBTdG9yZS5XaW5kb3cuaFxuXG5cdFx0dGhpcy5leHBlcmllbmNlLnJlc2l6ZSgpXG5cdFx0dGhpcy5jb21wYXNzZXNDb250YWluZXIucmVzaXplKClcblxuXHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdHZhciBjb21wYXNzQ29udGFpbmVyQm90dG9tID0gdGhpcy5jb21wYXNzZXNDb250YWluZXIueSArIHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmhlaWdodFxuXHRcdFx0dGhpcy5nb0NhbXBhaWduQnRuLnBvc2l0aW9uKFxuXHRcdFx0XHQod2luZG93VyA+PiAxKSAtICh0aGlzLmdvQ2FtcGFpZ25CdG4ud2lkdGggPj4gMSksXG5cdFx0XHRcdGNvbXBhc3NDb250YWluZXJCb3R0b20gKyAodGhpcy5nb0NhbXBhaWduQnRuLmhlaWdodCA+PiAxKVxuXHRcdFx0KVxuXHRcdH0sIDApXG5cblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMuY29tcGFzc2VzQ29udGFpbmVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmdvQ2FtcGFpZ25CdG4uY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVCdG4ge1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50LCB0aXRsZVR4dCkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcblx0XHR0aGlzLnRpdGxlVHh0ID0gdGl0bGVUeHRcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnRsT3ZlciA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLnRsT3V0ID0gQXBwU3RvcmUuZ2V0VGltZWxpbmUoKVxuXHRcdHRoaXMud2lkdGggPSAwXG5cdFx0dGhpcy5oZWlnaHQgPSAwXG5cdFx0dmFyIGtub3RzRWwgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5rbm90XCIpXG5cdFx0dmFyIGxpbmVzRWwgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5saW5lXCIpXG5cdFx0dmFyIHRpdGxlRWwgPSB0aGlzLmVsZW1lbnQuZmluZChcIi5idG4tdGl0bGVcIilcblx0XHR2YXIgcmFkaXVzID0gM1xuXHRcdHZhciBwYWRkaW5nWCA9IDI0XG5cdFx0dmFyIHBhZGRpbmdZID0gMjBcblx0XHR0aGlzLmxpbmVTaXplID0gQXBwU3RvcmUuZ2V0TGluZVdpZHRoKClcblx0XHR0aXRsZUVsLnRleHQodGhpcy50aXRsZVR4dClcblxuXHRcdHNldFRpbWVvdXQoKCk9PntcblxuXHRcdFx0dmFyIHRpdGxlVyA9IHRpdGxlRWwud2lkdGgoKVxuXHRcdFx0dmFyIHRpdGxlSCA9IEFwcENvbnN0YW50cy5HTE9CQUxfRk9OVF9TSVpFXG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga25vdHNFbC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIga25vdCA9ICQoa25vdHNFbFtpXSlcblx0XHRcdFx0a25vdC5hdHRyKCdyJywgcmFkaXVzKVxuXHRcdFx0fTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXNFbC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgbGluZSA9ICQobGluZXNFbFtpXSlcblx0XHRcdFx0bGluZS5jc3MoJ3N0cm9rZS13aWR0aCcsIHRoaXMubGluZVNpemUpXG5cdFx0XHR9O1xuXG5cdFx0XHR0aGlzLndpZHRoID0gdGl0bGVXICsgKHBhZGRpbmdYIDw8IDEpXG5cdFx0XHR0aGlzLmhlaWdodCA9IHRpdGxlSCArIChwYWRkaW5nWSA8PCAxKVxuXHRcdFx0dGl0bGVFbC5jc3Moe1xuXHRcdFx0XHRsZWZ0OiAodGhpcy53aWR0aCA+PiAxKSAtICh0aXRsZVcgPj4gMSksXG5cdFx0XHRcdHRvcDogKHRoaXMuaGVpZ2h0ID4+IDEpIC0gKHRpdGxlSCA+PiAxKVxuXHRcdFx0fSlcblx0XHRcdHRoaXMuZWxlbWVudC5jc3Moe1xuXHRcdFx0XHR3aWR0aDogdGhpcy53aWR0aCxcblx0XHRcdFx0aGVpZ2h0OiB0aGlzLmhlaWdodFxuXHRcdFx0fSlcblxuXHRcdFx0dmFyIHN0YXJ0WCA9IHJhZGl1cyAqIDNcblx0XHRcdHZhciBzdGFydFkgPSByYWRpdXMgKiAzXG5cdFx0XHR2YXIgb2Zmc2V0VXBEb3duID0gMC42XG5cdFx0XHQkKGtub3RzRWwuZ2V0KDApKS5hdHRyKHtcblx0XHRcdFx0J2N4Jzogc3RhcnRYICsgMCxcblx0XHRcdFx0J2N5Jzogc3RhcnRZICsgMFxuXHRcdFx0fSlcblx0XHRcdCQoa25vdHNFbC5nZXQoMSkpLmF0dHIoe1xuXHRcdFx0XHQnY3gnOiB0aGlzLndpZHRoIC0gc3RhcnRYLFxuXHRcdFx0XHQnY3knOiBzdGFydFkgKyAwXG5cdFx0XHR9KVxuXHRcdFx0JChrbm90c0VsLmdldCgyKSkuYXR0cih7XG5cdFx0XHRcdCdjeCc6IHN0YXJ0WCArIDAsXG5cdFx0XHRcdCdjeSc6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZXG5cdFx0XHR9KVxuXHRcdFx0JChrbm90c0VsLmdldCgzKSkuYXR0cih7XG5cdFx0XHRcdCdjeCc6IHRoaXMud2lkdGggLSBzdGFydFgsXG5cdFx0XHRcdCdjeSc6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZXG5cdFx0XHR9KVxuXHRcdFx0JChsaW5lc0VsLmdldCgwKSkuYXR0cih7XG5cdFx0XHRcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHRcdCd4Mic6IHRoaXMud2lkdGggLSBzdGFydFgsXG5cdFx0XHRcdCd5Mic6IHN0YXJ0WSArIDBcblx0XHRcdH0pXG5cdFx0XHQkKGxpbmVzRWwuZ2V0KDEpKS5hdHRyKHtcblx0XHRcdFx0J3gxJzogdGhpcy53aWR0aCAtIHN0YXJ0WCxcblx0XHRcdFx0J3kxJzogc3RhcnRZICsgMCxcblx0XHRcdFx0J3gyJzogdGhpcy53aWR0aCAtIHN0YXJ0WCxcblx0XHRcdFx0J3kyJzogdGhpcy5oZWlnaHQgLSBzdGFydFlcblx0XHRcdH0pXG5cdFx0XHQkKGxpbmVzRWwuZ2V0KDIpKS5hdHRyKHtcblx0XHRcdFx0J3gxJzogdGhpcy53aWR0aCAtIHN0YXJ0WCxcblx0XHRcdFx0J3kxJzogdGhpcy5oZWlnaHQgLSBzdGFydFksXG5cdFx0XHRcdCd4Mic6IHN0YXJ0WSArIDAsXG5cdFx0XHRcdCd5Mic6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZXG5cdFx0XHR9KVxuXHRcdFx0JChsaW5lc0VsLmdldCgzKSkuYXR0cih7XG5cdFx0XHRcdCd4MSc6IHN0YXJ0WCArIDAsXG5cdFx0XHRcdCd5MSc6IHN0YXJ0WSArIDAsXG5cdFx0XHRcdCd4Mic6IHN0YXJ0WCArIDAsXG5cdFx0XHRcdCd5Mic6IHRoaXMuaGVpZ2h0IC0gc3RhcnRZXG5cdFx0XHR9KVxuXG5cdFx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzBdLCAxLCB7IHg6LTMsIHk6LTMsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdmVyLnRvKGtub3RzRWxbMV0sIDEsIHsgeDozLCB5Oi0zLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3Zlci50byhrbm90c0VsWzJdLCAxLCB7IHg6LTMsIHk6MywgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8oa25vdHNFbFszXSwgMSwgeyB4OjMsIHk6MywgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFswXSwgMSwgeyBzY2FsZVg6MS4xLCB5Oi0zLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3Zlci50byhsaW5lc0VsWzFdLCAxLCB7IHNjYWxlWToxLjEsIHg6MywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE92ZXIudG8obGluZXNFbFsyXSwgMSwgeyBzY2FsZVg6MS4xLCB5OjMsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdmVyLnRvKGxpbmVzRWxbM10sIDEsIHsgc2NhbGVZOjEuMSwgeDotMywgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbMF0sIDEsIHsgeDowLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8oa25vdHNFbFsxXSwgMSwgeyB4OjAsIHk6MCwgZm9yY2UzRDp0cnVlLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE91dC50byhrbm90c0VsWzJdLCAxLCB7IHg6MCwgeTowLCBmb3JjZTNEOnRydWUsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGtub3RzRWxbM10sIDEsIHsgeDowLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8obGluZXNFbFswXSwgMSwgeyBzY2FsZVg6MSwgeTowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cdFx0XHR0aGlzLnRsT3V0LnRvKGxpbmVzRWxbMV0sIDEsIHsgc2NhbGVZOjEsIHg6MCwgZm9yY2UzRDp0cnVlLCB0cmFuc2Zvcm1PcmlnaW46JzUwJSA1MCUnLCBlYXNlOkVsYXN0aWMuZWFzZU91dCB9LCAwKVxuXHRcdFx0dGhpcy50bE91dC50byhsaW5lc0VsWzJdLCAxLCB7IHNjYWxlWDoxLCB5OjAsIGZvcmNlM0Q6dHJ1ZSwgdHJhbnNmb3JtT3JpZ2luOic1MCUgNTAlJywgZWFzZTpFbGFzdGljLmVhc2VPdXQgfSwgMClcblx0XHRcdHRoaXMudGxPdXQudG8obGluZXNFbFszXSwgMSwgeyBzY2FsZVk6MSwgeDowLCBmb3JjZTNEOnRydWUsIHRyYW5zZm9ybU9yaWdpbjonNTAlIDUwJScsIGVhc2U6RWxhc3RpYy5lYXNlT3V0IH0sIDApXG5cblx0XHRcdHRoaXMudGxPdmVyLnBhdXNlKDApXG5cdFx0XHR0aGlzLnRsT3V0LnBhdXNlKDApXG5cblx0XHRcdHRoaXMucm9sbG92ZXIgPSB0aGlzLnJvbGxvdmVyLmJpbmQodGhpcylcblx0XHRcdHRoaXMucm9sbG91dCA9IHRoaXMucm9sbG91dC5iaW5kKHRoaXMpXG5cdFx0XHR0aGlzLmNsaWNrID0gdGhpcy5jbGljay5iaW5kKHRoaXMpXG5cdFx0XHR0aGlzLmVsZW1lbnQub24oJ21vdXNlZW50ZXInLCB0aGlzLnJvbGxvdmVyKVxuXHRcdFx0dGhpcy5lbGVtZW50Lm9uKCdtb3VzZWxlYXZlJywgdGhpcy5yb2xsb3V0KVxuXHRcdFx0dGhpcy5lbGVtZW50Lm9uKCdjbGljaycsIHRoaXMuY2xpY2spXG5cdFx0fSwgMClcblx0fVxuXHRwb3NpdGlvbih4LCB5KSB7XG5cdFx0VHdlZW5NYXguc2V0KHRoaXMuZWxlbWVudCwgeyB4OiB4LCB5OiB5LCBmb3JjZTNEOiB0cnVlIH0pXG5cdFx0dGhpcy54ID0geFxuXHRcdHRoaXMueSA9IHlcblx0fVxuXHRjbGljayhlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy5idG5DbGlja2VkKClcblx0fVxuXHRyb2xsb3V0KGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR0aGlzLnRsT3Zlci5raWxsKClcblx0XHR0aGlzLnRsT3V0LnBsYXkoMClcblx0fVxuXHRyb2xsb3ZlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dGhpcy50bE91dC5raWxsKClcblx0XHR0aGlzLnRsT3Zlci5wbGF5KDApXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0QXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxPdmVyKVxuXHRcdEFwcFN0b3JlLnJlbGVhc2VUaW1lbGluZSh0aGlzLnRsT3V0KVxuXHRcdHRoaXMuZWxlbWVudC5vZmYoJ21vdXNlZW50ZXInLCB0aGlzLnJvbGxvdmVyKVxuXHRcdHRoaXMuZWxlbWVudC5vZmYoJ21vdXNlbGVhdmUnLCB0aGlzLnJvbGxvdXQpXG5cdFx0dGhpcy5lbGVtZW50Lm9mZignY2xpY2snLCB0aGlzLmNsaWNrKVxuXHR9XG59XG4iLCJpbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBLbm90IGZyb20gJ0tub3QnXG5pbXBvcnQgVXRpbHMgZnJvbSAnVXRpbHMnXG5pbXBvcnQgVmVjMiBmcm9tICdWZWMyJ1xuaW1wb3J0IFJvdXRlciBmcm9tICdSb3V0ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNtYWxsQ29tcGFzcyB7XG5cdGNvbnN0cnVjdG9yKHB4Q29udGFpbmVyLCB0eXBlKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lciA9IHB4Q29udGFpbmVyXG5cdFx0dGhpcy50eXBlID0gdHlwZSB8fCBBcHBDb25zdGFudHMuTEFORElOR1xuXHRcdHRoaXMuYm91bmNlID0gLTFcblx0fVxuXHRjb21wb25lbnREaWRNb3VudChkYXRhLCBuYW1lLCBwYXJlbnRFbCkge1xuXHRcdHRoaXMucGFyZW50RWwgPSBwYXJlbnRFbFxuXHRcdHRoaXMuY29udGFpbmVyID0gQXBwU3RvcmUuZ2V0Q29udGFpbmVyKClcblx0XHR0aGlzLnB4Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKVxuXG5cdFx0dGhpcy5iZ0NpcmNsZSA9IG5ldyBQSVhJLkdyYXBoaWNzKClcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmJnQ2lyY2xlKVxuXG5cdFx0dmFyIGtub3RSYWRpdXMgPSBBcHBDb25zdGFudHMuU01BTExfS05PVF9SQURJVVNcblx0XHR0aGlzLnJhZGl1cyA9IDMwXG5cdFx0dGhpcy5yYWRpdXNMaW1pdCA9ICh0aGlzLnJhZGl1cyowLjgpIC0gKGtub3RSYWRpdXM+PjEpXG5cdFx0dmFyIGdyYXkgPSAweDU3NTc1NlxuXHRcdHRoaXMud2lkdGggPSB0aGlzLnJhZGl1c1xuXHRcdHRoaXMuaGVpZ2h0ID0gdGhpcy5yYWRpdXNcblxuXHRcdHZhciBjb21wYXNzTmFtZSA9IG5hbWUudG9VcHBlckNhc2UoKVxuXHRcdHRoaXMuZWxlbWVudCA9IHRoaXMucGFyZW50RWwuZmluZCgnLmNvbXBhc3Nlcy10ZXh0cy13cmFwcGVyJylcblx0XHR2YXIgY29udGFpbmVyRWwgPSAkKCc8ZGl2IGNsYXNzPVwidGV4dHMtY29udGFpbmVyIGJ0blwiPjwvZGl2PicpXG5cdFx0dGhpcy5lbGVtZW50LmFwcGVuZChjb250YWluZXJFbClcblx0XHR2YXIgdGl0bGVUb3AgPSAkKCc8ZGl2IGNsYXNzPVwidG9wLXRpdGxlXCI+PC9kaXYnKVxuXHRcdHZhciB0aXRsZUJvdHRvbSA9ICQoJzxkaXYgY2xhc3M9XCJib3R0b20tdGl0bGVcIj48L2RpdicpXG5cblx0XHR0aGlzLmNpcmNsZVJhZCA9IDkwXG5cdFx0dmFyIGNpcmNsZXBhdGggPSAnTTAsJyt0aGlzLmNpcmNsZVJhZC8yKydhJyt0aGlzLmNpcmNsZVJhZC8yKycsJyt0aGlzLmNpcmNsZVJhZC8yKycgMCAxLDAgJyt0aGlzLmNpcmNsZVJhZCsnLDBhJyt0aGlzLmNpcmNsZVJhZC8yKycsJyt0aGlzLmNpcmNsZVJhZC8yKycgMCAxLDAgLScrdGhpcy5jaXJjbGVSYWQrJywwJ1xuXHRcdHZhciBzdmdTdHIgPSAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI+IDxkZWZzPiA8cGF0aCBpZD1cInBhdGgxXCIgZD1cIicrY2lyY2xlcGF0aCsnXCIgPiA8L3BhdGg+IDwvZGVmcz4gPHRleHQgZmlsbD1cIndoaXRlXCIgaWQ9XCJteVRleHRcIj4gPHRleHRQYXRoIHhsaW5rOmhyZWY9XCIjcGF0aDFcIj4gPHRzcGFuIGR4PVwiMHB4XCIgZHk9XCIwcHhcIj4nICsgY29tcGFzc05hbWUgKyAnPC90c3Bhbj4gPC90ZXh0UGF0aD4gPC90ZXh0Pjwvc3ZnPidcblx0XHR2YXIgdGl0bGVUb3BTdmcgPSAkKHN2Z1N0cilcblx0XHR2YXIgdGl0bGVCb3R0b21TdmcgPSAkKHN2Z1N0cilcblx0XHR0aXRsZVRvcC5hcHBlbmQodGl0bGVUb3BTdmcpXG5cdFx0dGl0bGVCb3R0b20uYXBwZW5kKHRpdGxlQm90dG9tU3ZnKVxuXHRcdGNvbnRhaW5lckVsLmFwcGVuZCh0aXRsZVRvcClcblx0XHRjb250YWluZXJFbC5hcHBlbmQodGl0bGVCb3R0b20pXG5cdFx0dGl0bGVUb3BTdmcuY3NzKHtcblx0XHRcdHdpZHRoOiB0aGlzLmNpcmNsZVJhZCxcblx0XHRcdGhlaWdodDogdGhpcy5jaXJjbGVSYWRcblx0XHR9KVxuXHRcdHRpdGxlQm90dG9tU3ZnLmNzcyh7XG5cdFx0XHR3aWR0aDogdGhpcy5jaXJjbGVSYWQsXG5cdFx0XHRoZWlnaHQ6IHRoaXMuY2lyY2xlUmFkXG5cdFx0fSlcblx0XHR0aGlzLnRpdGxlcyA9IHtcblx0XHRcdGNvbnRhaW5lcjogY29udGFpbmVyRWwsXG5cdFx0XHR0aXRsZVRvcDogdGl0bGVUb3AsXG5cdFx0XHR0aXRsZUJvdHRvbTogdGl0bGVCb3R0b21cblx0XHR9XG5cblx0XHR0aGlzLm9uQ2xpY2tlZCA9IHRoaXMub25DbGlja2VkLmJpbmQodGhpcylcblx0XHR0aGlzLnRpdGxlcy5jb250YWluZXIub24oJ2NsaWNrJywgdGhpcy5vbkNsaWNrZWQpXG5cblx0XHR0aGlzLmtub3RzID0gW11cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBkID0gZGF0YVtpXVxuXHRcdFx0dmFyIGtub3QgPSBuZXcgS25vdCh0aGlzLmNvbnRhaW5lciwga25vdFJhZGl1cywgZ3JheSkuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdFx0a25vdC5tYXNzID0ga25vdFJhZGl1c1xuXHRcdFx0a25vdC52eCA9IE1hdGgucmFuZG9tKCkgKiAwLjhcbiAgICAgICAgICAgIGtub3QudnkgPSBNYXRoLnJhbmRvbSgpICogMC44XG4gICAgICAgICAgICBrbm90LnBvc1ZlYyA9IG5ldyBQSVhJLlBvaW50KDAsIDApXG4gICAgICAgICAgICBrbm90LnBvc0ZWZWMgPSBuZXcgUElYSS5Qb2ludCgwLCAwKVxuICAgICAgICAgICAga25vdC52ZWxWZWMgPSBuZXcgUElYSS5Qb2ludCgwLCAwKVxuICAgICAgICAgICAga25vdC52ZWxGVmVjID0gbmV3IFBJWEkuUG9pbnQoMCwgMClcblx0XHRcdGtub3QucG9zaXRpb24oVXRpbHMuUmFuZCgtdGhpcy5yYWRpdXNMaW1pdCwgdGhpcy5yYWRpdXNMaW1pdCksIFV0aWxzLlJhbmQoLXRoaXMucmFkaXVzTGltaXQsIHRoaXMucmFkaXVzTGltaXQpKVxuXHRcdFx0dGhpcy5rbm90c1tpXSA9IGtub3Rcblx0XHR9XG5cblx0XHQvLyBkcmF3IGEgcmVjdGFuZ2xlXG5cdFx0dGhpcy5iZ0NpcmNsZS5jbGVhcigpXG5cdFx0dGhpcy5iZ0NpcmNsZS5iZWdpbkZpbGwoMHhmZmZmZmYpXG5cdFx0dGhpcy5iZ0NpcmNsZS5kcmF3Q2lyY2xlKDAsIDAsIHRoaXMucmFkaXVzKVxuXHRcdHRoaXMuYmdDaXJjbGUuZW5kRmlsbCgpXG5cdH1cblx0b25DbGlja2VkKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZFxuXHRcdFJvdXRlci5zZXRIYXNoKHVybClcblx0fVxuXHRjaGVja1dhbGxzKGtub3QpIHtcblx0XHRpZihrbm90LnggKyBrbm90LnJhZGl1cyA+IHRoaXMucmFkaXVzTGltaXQpIHtcblx0ICAgICAgICBrbm90LnggPSB0aGlzLnJhZGl1c0xpbWl0IC0ga25vdC5yYWRpdXM7XG5cdCAgICAgICAga25vdC52eCAqPSB0aGlzLmJvdW5jZTtcblx0ICAgIH1lbHNlIGlmKGtub3QueCAtIGtub3QucmFkaXVzIDwgLXRoaXMucmFkaXVzTGltaXQta25vdC5yYWRpdXMpIHtcblx0ICAgICAgICBrbm90LnggPSAtdGhpcy5yYWRpdXNMaW1pdCArIGtub3QucmFkaXVzLWtub3QucmFkaXVzO1xuXHQgICAgICAgIGtub3QudnggKj0gdGhpcy5ib3VuY2U7XG5cdCAgICB9XG5cdCAgICBpZihrbm90LnkgKyBrbm90LnJhZGl1cyA+IHRoaXMucmFkaXVzTGltaXQpIHtcblx0ICAgICAgICBrbm90LnkgPSB0aGlzLnJhZGl1c0xpbWl0IC0ga25vdC5yYWRpdXM7XG5cdCAgICAgICAga25vdC52eSAqPSB0aGlzLmJvdW5jZTtcblx0ICAgIH1lbHNlIGlmKGtub3QueSAtIGtub3QucmFkaXVzIDwgLXRoaXMucmFkaXVzTGltaXQpIHtcblx0ICAgICAgICBrbm90LnkgPSAtdGhpcy5yYWRpdXNMaW1pdCArIGtub3QucmFkaXVzO1xuXHQgICAgICAgIGtub3QudnkgKj0gdGhpcy5ib3VuY2U7XG5cdCAgICB9XG5cdH1cblx0Y2hlY2tDb2xsaXNpb24oa25vdEEsIGtub3RCKSB7XG5cdFx0dmFyIGR4ID0ga25vdEIueCAtIGtub3RBLng7XG5cdCAgICB2YXIgZHkgPSBrbm90Qi55IC0ga25vdEEueTtcblx0ICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KGR4KmR4ICsgZHkqZHkpO1xuXHQgICAgaWYoZGlzdCA8IGtub3RBLnJhZGl1cyArIGtub3RCLnJhZGl1cykge1xuXHQgICAgICAgIHZhciBhbmdsZSA9IE1hdGguYXRhbjIoZHksIGR4KVxuXHQgICAgICAgIHZhciBzaW4gPSBNYXRoLnNpbihhbmdsZSlcblx0ICAgICAgICB2YXIgY29zID0gTWF0aC5jb3MoYW5nbGUpXG5cdCAgICAgICAga25vdEEucG9zVmVjLnggPSAwXG5cdCAgICAgICAga25vdEEucG9zVmVjLnkgPSAwXG5cdCAgICAgICAgdGhpcy5yb3RhdGUoa25vdEIucG9zVmVjLCBkeCwgZHksIHNpbiwgY29zLCB0cnVlKVxuXHQgICAgICAgIHRoaXMucm90YXRlKGtub3RBLnZlbFZlYywga25vdEEudngsIGtub3RBLnZ5LCBzaW4sIGNvcywgdHJ1ZSlcblx0ICAgICAgICB0aGlzLnJvdGF0ZShrbm90Qi52ZWxWZWMsIGtub3RCLnZ4LCBrbm90Qi52eSwgc2luLCBjb3MsIHRydWUpXG5cblx0ICAgICAgICAvLyBjb2xsaXNpb24gcmVhY3Rpb25cblx0XHRcdHZhciB2eFRvdGFsID0ga25vdEEudmVsVmVjLnggLSBrbm90Qi52ZWxWZWMueFxuXHRcdFx0a25vdEEudmVsVmVjLnggPSAoKGtub3RBLm1hc3MgLSBrbm90Qi5tYXNzKSAqIGtub3RBLnZlbFZlYy54ICsgMiAqIGtub3RCLm1hc3MgKiBrbm90Qi52ZWxWZWMueCkgLyAoa25vdEEubWFzcyArIGtub3RCLm1hc3MpXG5cdFx0XHRrbm90Qi52ZWxWZWMueCA9IHZ4VG90YWwgKyBrbm90QS52ZWxWZWMueFxuXG5cdFx0XHQvLyB1cGRhdGUgcG9zaXRpb25cblx0XHRcdGtub3RBLnBvc1ZlYy54ICs9IGtub3RBLnZlbFZlYy54O1xuXHRcdFx0a25vdEIucG9zVmVjLnggKz0ga25vdEIudmVsVmVjLng7XG5cblx0XHRcdC8vIHJvdGF0ZSBwb3NpdGlvbnMgYmFja1xuXHRcdFx0dGhpcy5yb3RhdGUoa25vdEEucG9zRlZlYywga25vdEEucG9zVmVjLngsIGtub3RBLnBvc1ZlYy55LCBzaW4sIGNvcywgZmFsc2UpXG5cdFx0XHR0aGlzLnJvdGF0ZShrbm90Qi5wb3NGVmVjLCBrbm90Qi5wb3NWZWMueCwga25vdEIucG9zVmVjLnksIHNpbiwgY29zLCBmYWxzZSlcblxuXHRcdFx0Ly8gYWRqdXN0IHBvc2l0aW9ucyB0byBhY3R1YWwgc2NyZWVuIHBvc2l0aW9uc1xuXHRcdFx0a25vdEIueCA9IGtub3RBLnggKyBrbm90Qi5wb3NGVmVjLng7XG5cdFx0XHRrbm90Qi55ID0ga25vdEEueSArIGtub3RCLnBvc0ZWZWMueTtcblx0XHRcdGtub3RBLnggPSBrbm90QS54ICsga25vdEEucG9zRlZlYy54O1xuXHRcdFx0a25vdEEueSA9IGtub3RBLnkgKyBrbm90QS5wb3NGVmVjLnk7XG5cblx0XHRcdC8vIHJvdGF0ZSB2ZWxvY2l0aWVzIGJhY2tcblx0XHRcdHRoaXMucm90YXRlKGtub3RBLnZlbEZWZWMsIGtub3RBLnZlbFZlYy54LCBrbm90QS52ZWxWZWMueSwgc2luLCBjb3MsIGZhbHNlKVxuXHRcdFx0dGhpcy5yb3RhdGUoa25vdEIudmVsRlZlYywga25vdEIudmVsVmVjLngsIGtub3RCLnZlbFZlYy55LCBzaW4sIGNvcywgZmFsc2UpXG5cblx0XHRcdGtub3RBLnZ4ID0ga25vdEEudmVsRlZlYy54O1xuXHQgICAgICAgIGtub3RBLnZ5ID0ga25vdEEudmVsRlZlYy55O1xuXHQgICAgICAgIGtub3RCLnZ4ID0ga25vdEIudmVsRlZlYy54O1xuXHQgICAgICAgIGtub3RCLnZ5ID0ga25vdEIudmVsRlZlYy55O1xuXHQgICAgfVxuXHR9XG5cdHJvdGF0ZShwb2ludCwgeCwgeSwgc2luLCBjb3MsIHJldmVyc2UpIHtcblx0XHRpZihyZXZlcnNlKSB7XG5cdFx0XHRwb2ludC54ID0geCAqIGNvcyArIHkgKiBzaW47XG5cdFx0XHRwb2ludC55ID0geSAqIGNvcyAtIHggKiBzaW47XG5cdFx0fWVsc2V7XG5cdFx0XHRwb2ludC54ID0geCAqIGNvcyAtIHkgKiBzaW47XG5cdFx0XHRwb2ludC55ID0geSAqIGNvcyArIHggKiBzaW47XG5cdFx0fVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdC8vIHRoaXMudGl0bGVzLmNvbnRhaW5lci5hZGRDbGFzcygnYWN0aXZlJylcblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0XHQvLyB0aGlzLnRpdGxlcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXHRcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dmFyIGtub3RzID0gdGhpcy5rbm90c1xuXHRcdHZhciBrbm90c051bSA9IGtub3RzLmxlbmd0aFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwga25vdHNOdW07IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSBrbm90c1tpXVxuXHRcdFx0a25vdC5wb3NpdGlvbihrbm90LnggKyBrbm90LnZ4LCBrbm90LnkgKyBrbm90LnZ5KVxuXHRcdFx0dGhpcy5jaGVja1dhbGxzKGtub3QpXG5cdFx0fVxuXHRcdGZvciAoaSA9IDA7IGkgPCBrbm90c051bSAtIDE7IGkrKykge1xuXHRcdFx0dmFyIGtub3RBID0ga25vdHNbaV1cblx0XHRcdGZvciAodmFyIGogPSBpICsgMTsgaiA8IGtub3RzTnVtOyBqKyspIHtcblx0XHRcdFx0dmFyIGtub3RCID0ga25vdHNbal1cblx0XHRcdFx0dGhpcy5jaGVja0NvbGxpc2lvbihrbm90QSwga25vdEIpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdH1cblx0cG9zaXRpb24oeCwgeSkge1xuXHRcdHRoaXMuY29udGFpbmVyLnggPSB4XG5cdFx0dGhpcy5jb250YWluZXIueSA9IHlcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHR9XG5cdHBvc2l0aW9uRWxlbWVudCh4LCB5KSB7XG5cdFx0dGhpcy50aXRsZXMuY29udGFpbmVyLmNzcyh7XG5cdFx0XHRsZWZ0OiB4IC0gKHRoaXMuY2lyY2xlUmFkPj4xKSxcblx0XHRcdHRvcDogeSAtICh0aGlzLmNpcmNsZVJhZD4+MSksXG5cdFx0XHR3aWR0aDogdGhpcy5jaXJjbGVSYWQsXG5cdFx0XHRoZWlnaHQ6IHRoaXMuY2lyY2xlUmFkLFxuXHRcdH0pXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmtub3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmtub3RzW2ldLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR9XG5cdFx0dGhpcy50aXRsZXMuY29udGFpbmVyLm9mZignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblx0XHR0aGlzLmtub3RzLmxlbmd0aCA9IDBcblx0XHR0aGlzLmJnQ2lyY2xlLmNsZWFyKClcblx0XHR0aGlzLmJnQ2lyY2xlID0gbnVsbFxuXHRcdHRoaXMuY29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKClcblx0XHRBcHBTdG9yZS5yZWxlYXNlQ29udGFpbmVyKHRoaXMuY29udGFpbmVyKVxuXHR9XG59XG4iLCJpbXBvcnQgS25vdCBmcm9tICdLbm90J1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3ByaW5nR2FyZGVuIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5jb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKVxuXHRcdHRoaXMuYXJlYVBvbHlnb24gPSBuZXcgUElYSS5HcmFwaGljcygpXG5cdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmFyZWFQb2x5Z29uKVxuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIpXG5cdFx0XG5cdFx0dGhpcy5saW5lVyA9IEFwcFN0b3JlLmdldExpbmVXaWR0aCgpXG5cdFx0dGhpcy5wYXVzZWQgPSB0cnVlXG5cdFx0dGhpcy5vcGVuZWQgPSBmYWxzZVxuXG5cdFx0dGhpcy5rbm90cyA9IFtdXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBBcHBDb25zdGFudHMuVE9UQUxfS05PVF9OVU07IGkrKykge1xuXHRcdFx0dmFyIGtub3QgPSBuZXcgS25vdCh0aGlzLmNvbnRhaW5lcikuY29tcG9uZW50RGlkTW91bnQoKVxuXHRcdFx0dGhpcy5rbm90c1tpXSA9IGtub3Rcblx0XHR9XG5cblx0XHR0aGlzLmNvbmZpZyA9IHtcblx0XHRcdHNwcmluZzogMCxcblx0XHRcdGZyaWN0aW9uOiAwLFxuXHRcdFx0c3ByaW5nTGVuZ3RoOiAwXG5cdFx0fVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KGRhdGEsIHdpdGhGaWxsLCBpc0ludGVyYWN0aXZlKSB7XG5cdFx0dGhpcy5wYXJhbXMgPSBkYXRhXG5cdFx0dGhpcy53aXRoRmlsbCA9IHdpdGhGaWxsIHx8IGZhbHNlXG5cdFx0dGhpcy5pc0ludGVyYWN0aXZlID0gaXNJbnRlcmFjdGl2ZSB8fCBmYWxzZVxuXHRcdHZhciBrbm90c0RhdGEgPSB0aGlzLnBhcmFtcy5rbm90c1xuXG5cdFx0dGhpcy5vbkNsaWNrZWQgPSB0aGlzLm9uQ2xpY2tlZC5iaW5kKHRoaXMpXG5cdFx0aWYodGhpcy5pc0ludGVyYWN0aXZlKSB7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmJ1dHRvbk1vZGUgPSB0cnVlXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmludGVyYWN0aXZlID0gdHJ1ZVxuXHRcdFx0dGhpcy5hcmVhUG9seWdvbkNvbnRhaW5lci5vbignY2xpY2snLCB0aGlzLm9uQ2xpY2tlZClcblx0XHR9ZWxzZXtcblx0XHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIuYnV0dG9uTW9kZSA9IGZhbHNlXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmludGVyYWN0aXZlID0gZmFsc2Vcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMua25vdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBuZXdLbm90U2NhbGUgPSBrbm90c0RhdGFbaV1cblx0XHRcdHZhciBrbm90ID0gdGhpcy5rbm90c1tpXVxuXHRcdFx0a25vdC5jaGFuZ2VTaXplKHRoaXMua25vdFJhZGl1cylcblx0XHRcdGtub3QudG9YID0gbmV3S25vdFNjYWxlLnggKiAodGhpcy5yYWRpdXMpXG5cdFx0XHRrbm90LnRvWSA9IG5ld0tub3RTY2FsZS55ICogKHRoaXMucmFkaXVzKVxuXHRcdH1cblx0XHR0aGlzLmNvbnRhaW5lci5yb3RhdGlvbiA9IFV0aWxzLlJhbmQoLTQsIDQpXG5cdFx0dGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoID0gMjAwXG5cdFx0dGhpcy5hc3NpZ25PcGVuZWRDb25maWcoKVxuXHR9XG5cdG9uQ2xpY2tlZCgpIHtcblx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5pZCArICcvJyArIHRoaXMucGFyYW1zLmlkXG5cdFx0Um91dGVyLnNldEhhc2godXJsKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHR0aGlzLmFyZWFQb2x5Z29uLmNsZWFyKClcblx0XHRpZih0aGlzLndpdGhGaWxsKSB7XG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uLmJlZ2luRmlsbCh0aGlzLnBhcmFtcy5jb2xvcilcblx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubGluZVN0eWxlKDApXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uLm1vdmVUbyh0aGlzLmtub3RzWzBdLngsIHRoaXMua25vdHNbMF0ueSlcblx0XHR9ZWxzZXtcblx0XHRcdHRoaXMuYXJlYVBvbHlnb24ubGluZVN0eWxlKHRoaXMubGluZVcsIHRoaXMucGFyYW1zLmNvbG9yLCAwLjgpXG5cdFx0fVxuXHRcdHZhciBsZW4gPSB0aGlzLmtub3RzLmxlbmd0aFxuXHRcdHZhciBzcHJpbmcgPSB0aGlzLmNvbmZpZy5zcHJpbmdcblx0XHR2YXIgZnJpY3Rpb24gPSB0aGlzLmNvbmZpZy5mcmljdGlvblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdHZhciBrbm90ID0gdGhpcy5rbm90c1tpXVxuXHRcdFx0dmFyIHByZXZpb3VzS25vdCA9IHRoaXMua25vdHNbaS0xXVxuXHRcdFx0cHJldmlvdXNLbm90ID0gKHByZXZpb3VzS25vdCA9PSB1bmRlZmluZWQpID8gdGhpcy5rbm90c1tsZW4tMV0gOiBwcmV2aW91c0tub3RcblxuXHRcdFx0VXRpbHMuU3ByaW5nVG8oa25vdCwga25vdC50b1gsIGtub3QudG9ZLCBpLCBzcHJpbmcsIGZyaWN0aW9uLCB0aGlzLmNvbmZpZy5zcHJpbmdMZW5ndGgpXG5cdFx0XHRrbm90LnBvc2l0aW9uKGtub3QueCArIGtub3QudngsIGtub3QueSArIGtub3QudnkpXG5cblx0XHRcdGlmKHRoaXMud2l0aEZpbGwpIHtcblx0XHRcdFx0dGhpcy5hcmVhUG9seWdvbi5saW5lVG8oa25vdC54LCBrbm90LnkpXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dGhpcy5hcmVhUG9seWdvbi5tb3ZlVG8ocHJldmlvdXNLbm90LngsIHByZXZpb3VzS25vdC55KVxuXHRcdFx0XHR0aGlzLmFyZWFQb2x5Z29uLmxpbmVUbyhrbm90LngsIGtub3QueSlcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYodGhpcy53aXRoRmlsbCkge1xuXHRcdFx0dGhpcy5hcmVhUG9seWdvbi5lbmRGaWxsKClcblx0XHR9XG5cdFx0dGhpcy5jb25maWcuc3ByaW5nTGVuZ3RoIC09ICh0aGlzLmNvbmZpZy5zcHJpbmdMZW5ndGgpICogMC4xXG5cdFx0dGhpcy5jb250YWluZXIucm90YXRpb24gLT0gKHRoaXMuY29udGFpbmVyLnJvdGF0aW9uKSAqIDAuMVxuXHR9XG5cdGFzc2lnbk9wZW5lZENvbmZpZygpIHtcblx0XHR0aGlzLmNvbmZpZy5zcHJpbmcgPSAwLjAzXG5cdFx0dGhpcy5jb25maWcuZnJpY3Rpb24gPSAwLjkyXG5cdH1cblx0Y2xlYXIoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmtub3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIga25vdCA9IHRoaXMua25vdHNbaV1cblx0XHRcdGtub3QuY2xlYXIoKVxuXHRcdH1cblx0XHR0aGlzLmFyZWFQb2x5Z29uLmNsZWFyKClcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpZih0aGlzLmlzSW50ZXJhY3RpdmUpIHtcblx0XHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIuYnV0dG9uTW9kZSA9IGZhbHNlXG5cdFx0XHR0aGlzLmFyZWFQb2x5Z29uQ29udGFpbmVyLmludGVyYWN0aXZlID0gZmFsc2Vcblx0XHRcdHRoaXMuYXJlYVBvbHlnb25Db250YWluZXIub2ZmKCdjbGljaycsIHRoaXMub25DbGlja2VkKVxuXHRcdH1cblx0fVxuXHRyZXNpemUocmFkaXVzKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93Lmhcblx0XHR0aGlzLnJhZGl1cyA9IHJhZGl1c1xuXHRcdHRoaXMuY29udGFpbmVyLnggPSAwXG5cdFx0dGhpcy5jb250YWluZXIueSA9IDBcblx0fVxufVxuIiwiaW1wb3J0IEtub3QgZnJvbSAnS25vdCdcbmltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuaW1wb3J0IFV0aWxzIGZyb20gJ1V0aWxzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUaXRsZVN3aXRjaGVyIHtcblx0Y29uc3RydWN0b3IoZWxlbWVudCkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR2YXIgY29udGFpbmVyQSA9IHRoaXMuZWxlbWVudC5maW5kKCcudGl0bGUtYScpXG5cdFx0dmFyIGNvbnRhaW5lckIgPSB0aGlzLmVsZW1lbnQuZmluZCgnLnRpdGxlLWInKVxuXHRcdHRoaXMuY29udGFpbmVycyA9IHtcblx0XHRcdCd0aXRsZS1hJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQVxuXHRcdFx0fSxcblx0XHRcdCd0aXRsZS1iJzoge1xuXHRcdFx0XHRlbDogY29udGFpbmVyQlxuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLndpZHRoID0gMTAwXG5cdFx0dGhpcy5oZWlnaHQgPSBBcHBDb25zdGFudHMuR0xPQkFMX0ZPTlRfU0laRVxuXHR9XG5cdHVwZGF0ZShuYW1lKSB7XG5cdFx0dGhpcy5jdXJyZW50VGl0bGVDbGFzcyA9ICh0aGlzLmN1cnJlbnRUaXRsZUNsYXNzID09PSAndGl0bGUtYScpID8gJ3RpdGxlLWInIDogJ3RpdGxlLWEnXG5cdFx0dGhpcy5wcmV2aW91c1RpdGxlID0gdGhpcy5jdXJyZW50VGl0bGVcblx0XHR0aGlzLmN1cnJlbnRUaXRsZSA9IHRoaXMuY29udGFpbmVyc1t0aGlzLmN1cnJlbnRUaXRsZUNsYXNzXVxuXHRcdHRoaXMuY3VycmVudFRpdGxlLmVsLnRleHQobmFtZSlcblxuXHRcdHRoaXMudXBkYXRlQ29tcG9uZW50U2l6ZSgpXG5cblx0XHR0aGlzLmN1cnJlbnRUaXRsZS5lbC5yZW1vdmVDbGFzcygnZGlkLXRyYW5zaXRpb24taW4nKS5yZW1vdmVDbGFzcygnZGlkLXRyYW5zaXRpb24tb3V0JykucmVtb3ZlQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1vdXQnKS5hZGRDbGFzcygnd2lsbC10cmFuc2l0aW9uLWluJylcblx0XHRpZih0aGlzLnByZXZpb3VzVGl0bGUgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnByZXZpb3VzVGl0bGUuZWwucmVtb3ZlQ2xhc3MoJ2RpZC10cmFuc2l0aW9uLW91dCcpLnJlbW92ZUNsYXNzKCdkaWQtdHJhbnNpdGlvbi1pbicpLnJlbW92ZUNsYXNzKCd3aWxsLXRyYW5zaXRpb24taW4nKS5hZGRDbGFzcygnd2lsbC10cmFuc2l0aW9uLW91dCcpXG5cdFx0fVxuXHR9XG5cdHNob3coKSB7XG5cdFx0dGhpcy5lbGVtZW50LmNzcygnd2lkdGgnLCB0aGlzLmN1cnJlbnRUaXRsZS53aWR0aClcblx0XHR0aGlzLmN1cnJlbnRUaXRsZS5lbC5yZW1vdmVDbGFzcygnZGlkLXRyYW5zaXRpb24tb3V0JykucmVtb3ZlQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1pbicpLnJlbW92ZUNsYXNzKCd3aWxsLXRyYW5zaXRpb24tb3V0JykuYWRkQ2xhc3MoJ2RpZC10cmFuc2l0aW9uLWluJylcblx0XHRpZih0aGlzLnByZXZpb3VzVGl0bGUgIT0gdW5kZWZpbmVkKXtcblx0XHRcdHRoaXMucHJldmlvdXNUaXRsZS5lbC5yZW1vdmVDbGFzcygnZGlkLXRyYW5zaXRpb24taW4nKS5yZW1vdmVDbGFzcygnd2lsbC10cmFuc2l0aW9uLWluJykucmVtb3ZlQ2xhc3MoJ3dpbGwtdHJhbnNpdGlvbi1vdXQnKS5hZGRDbGFzcygnZGlkLXRyYW5zaXRpb24tb3V0Jylcblx0XHR9XG5cdH1cblx0dXBkYXRlQ29tcG9uZW50U2l6ZSgpIHtcblx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHR2YXIgY3VycmVudFRpdGxlVyA9IHRoaXMuY3VycmVudFRpdGxlLmVsLndpZHRoKClcblx0XHRcdHRoaXMuY3VycmVudFRpdGxlLndpZHRoID0gY3VycmVudFRpdGxlV1xuXHRcdFx0dGhpcy53aWR0aCA9IGN1cnJlbnRUaXRsZVdcblx0XHR9LCAwKVxuXHR9XG5cdHBvc2l0aW9uKHgsIHkpIHtcblx0XHRUd2Vlbk1heC5zZXQodGhpcy5lbGVtZW50LCB7IHg6IHgsIHk6IHksIGZvcmNlM0Q6IHRydWUgfSlcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWxhc2thWFAgZXh0ZW5kcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0fVxuXHR1cGRhdGUoKSB7XG5cdH1cblx0cmVzaXplKCkge1xuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2VtU3RvbmVYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG4iLCJpbXBvcnQgQmFzZVhQIGZyb20gJ0Jhc2VYUCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWV0YWxYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTa2lYUCBleHRlbmRzIEJhc2VYUCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKClcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbiIsImltcG9ydCBCYXNlWFAgZnJvbSAnQmFzZVhQJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXb29kWFAgZXh0ZW5kcyBCYXNlWFAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKVxuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRzdXBlci51cGRhdGUoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRzdXBlci5yZXNpemUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG4iLCJpbXBvcnQgUGFnZSBmcm9tICdQYWdlJ1xuaW1wb3J0IExhbmRpbmdTbGlkZXNob3cgZnJvbSAnTGFuZGluZ1NsaWRlc2hvdydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBDb21wYXNzIGZyb20gJ0NvbXBhc3MnXG5pbXBvcnQgQXJyb3dCdG4gZnJvbSAnQXJyb3dCdG4nXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCBSb3V0ZXIgZnJvbSAnUm91dGVyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMYW5kaW5nIGV4dGVuZHMgUGFnZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpXG5cdH1cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93ID0gbmV3IExhbmRpbmdTbGlkZXNob3codGhpcy5weENvbnRhaW5lciwgdGhpcy5jaGlsZClcblx0XHR0aGlzLmxhbmRpbmdTbGlkZXNob3cuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5jb21wYXNzID0gbmV3IENvbXBhc3ModGhpcy5weENvbnRhaW5lcilcblx0XHR0aGlzLmNvbXBhc3MuY29tcG9uZW50RGlkTW91bnQoKVxuXG5cdFx0dGhpcy5hcnJvd0xlZnQgPSBuZXcgQXJyb3dCdG4odGhpcy5jaGlsZC5maW5kKCcucHJldmlvdXMtYnRuJyksIEFwcENvbnN0YW50cy5MRUZUKVxuXHRcdHRoaXMuYXJyb3dMZWZ0LmNvbXBvbmVudERpZE1vdW50KClcblx0XHR0aGlzLmFycm93UmlnaHQgPSBuZXcgQXJyb3dCdG4odGhpcy5jaGlsZC5maW5kKCcubmV4dC1idG4nKSwgQXBwQ29uc3RhbnRzLlJJR0hUKVxuXHRcdHRoaXMuYXJyb3dSaWdodC5jb21wb25lbnREaWRNb3VudCgpXG5cblx0XHR0aGlzLm9uS2V5UHJlc3NlZCA9IHRoaXMub25LZXlQcmVzc2VkLmJpbmQodGhpcylcblx0XHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIHRoaXMub25LZXlQcmVzc2VkKVxuXG5cdFx0dGhpcy5vblN0YWdlQ2xpY2tlZCA9IHRoaXMub25TdGFnZUNsaWNrZWQuYmluZCh0aGlzKVxuXHRcdHRoaXMucGFyZW50Lm9uKCdjbGljaycsIHRoaXMub25TdGFnZUNsaWNrZWQpXG5cblx0XHR0aGlzLmFycm93Q2xpY2tlZCA9IHRoaXMuYXJyb3dDbGlja2VkLmJpbmQodGhpcylcblx0XHR0aGlzLmFycm93TW91c2VFbnRlciA9IHRoaXMuYXJyb3dNb3VzZUVudGVyLmJpbmQodGhpcylcblx0XHR0aGlzLmFycm93TW91c2VMZWF2ZSA9IHRoaXMuYXJyb3dNb3VzZUxlYXZlLmJpbmQodGhpcylcblxuXHRcdHRoaXMucHJldmlvdXNBcmVhID0gdGhpcy5jaGlsZC5maW5kKCcuaW50ZXJmYWNlIC5wcmV2aW91cy1hcmVhJylcblx0XHR0aGlzLm5leHRBcmVhID0gdGhpcy5jaGlsZC5maW5kKCcuaW50ZXJmYWNlIC5uZXh0LWFyZWEnKVxuXHRcdHRoaXMucHJldmlvdXNBcmVhLm9uKCdjbGljaycsIHRoaXMuYXJyb3dDbGlja2VkKVxuXHRcdHRoaXMubmV4dEFyZWEub24oJ2NsaWNrJywgdGhpcy5hcnJvd0NsaWNrZWQpXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEub24oJ21vdXNlZW50ZXInLCB0aGlzLmFycm93TW91c2VFbnRlcilcblx0XHR0aGlzLm5leHRBcmVhLm9uKCdtb3VzZWVudGVyJywgdGhpcy5hcnJvd01vdXNlRW50ZXIpXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEub24oJ21vdXNlbGVhdmUnLCB0aGlzLmFycm93TW91c2VMZWF2ZSlcblx0XHR0aGlzLm5leHRBcmVhLm9uKCdtb3VzZWxlYXZlJywgdGhpcy5hcnJvd01vdXNlTGVhdmUpXG5cblx0XHRzdXBlci5jb21wb25lbnREaWRNb3VudCgpXG5cdH1cblx0YXJyb3dDbGlja2VkKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgaWQgPSBlLmN1cnJlbnRUYXJnZXQuaWRcblx0XHR2YXIgZGlyZWN0aW9uID0gaWQudG9VcHBlckNhc2UoKVxuXHRcdHN3aXRjaChkaXJlY3Rpb24pIHtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxFRlQ6XG5cdFx0XHRcdHRoaXMucHJldmlvdXMoKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuUklHSFQ6XG5cdFx0XHRcdHRoaXMubmV4dCgpXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHR9XG5cdGFycm93TW91c2VFbnRlcihlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0dmFyIGlkID0gZS5jdXJyZW50VGFyZ2V0LmlkXG5cdFx0dmFyIGRpcmVjdGlvbiA9IGlkLnRvVXBwZXJDYXNlKClcblx0XHR2YXIgYXJyb3cgPSB0aGlzLmdldEFycm93QnlEaXJlY3Rpb24oZGlyZWN0aW9uKVxuXHRcdGFycm93Lm1vdXNlT3ZlcigpXG5cdH1cblx0YXJyb3dNb3VzZUxlYXZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHR2YXIgaWQgPSBlLmN1cnJlbnRUYXJnZXQuaWRcblx0XHR2YXIgZGlyZWN0aW9uID0gaWQudG9VcHBlckNhc2UoKVxuXHRcdHZhciBhcnJvdyA9IHRoaXMuZ2V0QXJyb3dCeURpcmVjdGlvbihkaXJlY3Rpb24pXG5cdFx0YXJyb3cubW91c2VPdXQoKVxuXHR9XG5cdGdldEFycm93QnlEaXJlY3Rpb24oZGlyZWN0aW9uKSB7XG5cdFx0c3dpdGNoKGRpcmVjdGlvbikge1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTEVGVDpcblx0XHRcdFx0cmV0dXJuIHRoaXMuYXJyb3dMZWZ0XG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5SSUdIVDpcblx0XHRcdFx0cmV0dXJuIHRoaXMuYXJyb3dSaWdodFxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0fVxuXHRvblN0YWdlQ2xpY2tlZChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0c3dpdGNoKHRoaXMuZGlyZWN0aW9uKSB7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MRUZUOlxuXHRcdFx0XHR0aGlzLnByZXZpb3VzKClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLlJJR0hUOlxuXHRcdFx0XHR0aGlzLm5leHQoKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuVE9QOlxuXHRcdFx0XHR2YXIgdXJsID0gXCIvcGxhbmV0L1wiICsgdGhpcy5sYW5kaW5nU2xpZGVzaG93LmN1cnJlbnRJZFxuXHRcdFx0XHRSb3V0ZXIuc2V0SGFzaCh1cmwpXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHR9XG5cdG9uS2V5UHJlc3NlZChlKSB7XG5cdCAgICBlLnByZXZlbnREZWZhdWx0KClcblx0XHRzd2l0Y2goZS53aGljaCkge1xuXHQgICAgICAgIGNhc2UgMzc6IC8vIGxlZnRcblx0ICAgICAgICBcdHRoaXMucHJldmlvdXMoKVxuXHQgICAgICAgIFx0YnJlYWtcblx0ICAgICAgICBjYXNlIDM5OiAvLyByaWdodFxuXHQgICAgICAgIFx0dGhpcy5uZXh0KClcblx0ICAgICAgICBcdGJyZWFrXG5cdCAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuXHQgICAgfVxuXHR9XG5cdHVwZGF0ZUNvbXBhc3NQbGFuZXQoKSB7XG5cdFx0dmFyIHBsYW5ldERhdGEgPSBBcHBTdG9yZS5wcm9kdWN0c0RhdGFCeUlkKHRoaXMubGFuZGluZ1NsaWRlc2hvdy5jdXJyZW50SWQpXG5cdFx0dGhpcy5jb21wYXNzLnVwZGF0ZURhdGEocGxhbmV0RGF0YSlcblx0fVxuXHRkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpIHtcblx0XHRzdXBlci5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSgpXG5cdFx0dGhpcy51cGRhdGVDb21wYXNzUGxhbmV0KClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0c3VwZXIuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRuZXh0KCkge1xuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5uZXh0KClcblx0XHR0aGlzLnVwZGF0ZUNvbXBhc3NQbGFuZXQoKVxuXHR9XG5cdHByZXZpb3VzKCkge1xuXHRcdHRoaXMubGFuZGluZ1NsaWRlc2hvdy5wcmV2aW91cygpXG5cdFx0dGhpcy51cGRhdGVDb21wYXNzUGxhbmV0KClcblx0fVxuXHR1cGRhdGUoKSB7XG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciBtb3VzZVggPSBBcHBTdG9yZS5Nb3VzZS54XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnVwZGF0ZSgpXG5cdFx0dGhpcy5jb21wYXNzLnVwZGF0ZSgpXG5cblx0XHQvLyBpZihtb3VzZVggPCB3aW5kb3dXICogMC4yNSkge1xuXHRcdC8vIFx0dGhpcy5kaXJlY3Rpb24gPSBBcHBDb25zdGFudHMuTEVGVFxuXHRcdC8vIFx0Ly8gdGhpcy5hcnJvd0xlZnQucm9sbG92ZXIoKVxuXHRcdC8vIH1lbHNlIGlmKG1vdXNlWCA+IHdpbmRvd1cgKiAwLjc1KSB7XG5cdFx0Ly8gXHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5SSUdIVFxuXHRcdC8vIFx0Ly8gdGhpcy5hcnJvd1JpZ2h0LnJvbGxvdmVyKClcblx0XHQvLyB9ZWxzZXtcblx0XHQvLyBcdHRoaXMuZGlyZWN0aW9uID0gQXBwQ29uc3RhbnRzLk5PTkVcblx0XHQvLyBcdC8vIHRoaXMuYXJyb3dMZWZ0LnJvbGxvdXQoKVxuXHRcdC8vIFx0Ly8gdGhpcy5hcnJvd1JpZ2h0LnJvbGxvdXQoKVxuXHRcdC8vIH1cblx0XHR0aGlzLmRpcmVjdGlvbiA9IEFwcENvbnN0YW50cy5OT05FXG5cblx0XHR2YXIgYXJlYSA9IHdpbmRvd1cgKiAwLjI1XG5cdFx0aWYobW91c2VYID4gKCh3aW5kb3dXID4+IDEpIC0gYXJlYSkgJiYgbW91c2VYIDwgKCh3aW5kb3dXID4+IDEpICsgYXJlYSkpIHtcblx0XHRcdHRoaXMuZGlyZWN0aW9uID0gQXBwQ29uc3RhbnRzLlRPUFxuXHRcdH1cblxuXHRcdHN1cGVyLnVwZGF0ZSgpXG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LnJlc2l6ZSgpXG5cdFx0dGhpcy5jb21wYXNzLnJlc2l6ZSgpXG5cblx0XHR0aGlzLmNvbXBhc3MucG9zaXRpb24oXG5cdFx0XHR3aW5kb3dXID4+IDEsXG5cdFx0XHQod2luZG93SCA+PiAxKSAtICh3aW5kb3dIICogMC4wNSlcblx0XHQpXG5cblx0XHR0aGlzLmFycm93UmlnaHQucG9zaXRpb24oXG5cdFx0XHR3aW5kb3dXIC0gKCh3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UpID4+IDEpLFxuXHRcdFx0d2luZG93SCA+PiAxXG5cdFx0KVxuXG5cdFx0dGhpcy5hcnJvd0xlZnQucG9zaXRpb24oXG5cdFx0XHQoKHdpbmRvd1cgKiBBcHBDb25zdGFudHMuTEFORElOR19OT1JNQUxfU0xJREVfUEVSQ0VOVEFHRSkgPj4gMSkgLSB0aGlzLmFycm93TGVmdC53aWR0aCxcblx0XHRcdHdpbmRvd0ggPj4gMVxuXHRcdClcblxuXHRcdHRoaXMucHJldmlvdXNBcmVhLmNzcyh7XG5cdFx0XHR3aWR0aDogd2luZG93VyAqIEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFLFxuXHRcdFx0aGVpZ2h0OiB3aW5kb3dIXG5cdFx0fSlcblx0XHR0aGlzLm5leHRBcmVhLmNzcyh7XG5cdFx0XHR3aWR0aDogd2luZG93VyAqIEFwcENvbnN0YW50cy5MQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFLFxuXHRcdFx0aGVpZ2h0OiB3aW5kb3dILFxuXHRcdFx0bGVmdDogd2luZG93VyAtICh3aW5kb3dXICogQXBwQ29uc3RhbnRzLkxBTkRJTkdfTk9STUFMX1NMSURFX1BFUkNFTlRBR0UpXG5cdFx0fSlcblxuXHRcdHN1cGVyLnJlc2l6ZSgpXG5cdH1cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0dGhpcy5sYW5kaW5nU2xpZGVzaG93LmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmNvbXBhc3MuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdHRoaXMuYXJyb3dMZWZ0LmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0XHR0aGlzLmFycm93UmlnaHQuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHRcdCQoZG9jdW1lbnQpLm9mZigna2V5ZG93bicsIHRoaXMub25LZXlQcmVzc2VkKVxuXHRcdHRoaXMucGFyZW50Lm9mZignY2xpY2snLCB0aGlzLm9uU3RhZ2VDbGlja2VkKVxuXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEub2ZmKCdjbGljaycsIHRoaXMuYXJyb3dDbGlja2VkKVxuXHRcdHRoaXMubmV4dEFyZWEub2ZmKCdjbGljaycsIHRoaXMuYXJyb3dDbGlja2VkKVxuXHRcdHRoaXMucHJldmlvdXNBcmVhLm9mZignbW91c2VlbnRlcicsIHRoaXMuYXJyb3dNb3VzZUVudGVyKVxuXHRcdHRoaXMubmV4dEFyZWEub2ZmKCdtb3VzZWVudGVyJywgdGhpcy5hcnJvd01vdXNlRW50ZXIpXG5cdFx0dGhpcy5wcmV2aW91c0FyZWEub2ZmKCdtb3VzZWxlYXZlJywgdGhpcy5hcnJvd01vdXNlTGVhdmUpXG5cdFx0dGhpcy5uZXh0QXJlYS5vZmYoJ21vdXNlbGVhdmUnLCB0aGlzLmFycm93TW91c2VMZWF2ZSlcblxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KClcblx0fVxufVxuXG4iLCJleHBvcnQgZGVmYXVsdCB7XG5cdFdJTkRPV19SRVNJWkU6ICdXSU5ET1dfUkVTSVpFJyxcblx0UEFHRV9IQVNIRVJfQ0hBTkdFRDogJ1BBR0VfSEFTSEVSX0NIQU5HRUQnLFxuXHRQQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0U6ICdQQUdFX0hBU0hFUl9JTlRFUk5BTF9DSEFOR0UnLFxuXHRQWF9DT05UQUlORVJfSVNfUkVBRFk6ICdQWF9DT05UQUlORVJfSVNfUkVBRFknLFxuXHRQWF9DT05UQUlORVJfQUREX0NISUxEOiAnUFhfQ09OVEFJTkVSX0FERF9DSElMRCcsXG5cdFBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQ6ICdQWF9DT05UQUlORVJfUkVNT1ZFX0NISUxEJyxcblxuXHRMQU5ESU5HOiAnTEFORElORycsXG5cdEVYUEVSSUVOQ0U6ICdFWFBFUklFTkNFJyxcblx0Q0FNUEFJR046ICdDQU1QQUlHTicsXG5cdE5PTkU6ICdOT05FJyxcblxuXHRDT01QQVNTX1NJWkVfUEVSQ0VOVEFHRTogMC4yNCxcblxuXHRDT01QQVNTX1NNQUxMX1NJWkVfUEVSQ0VOVEFHRTogMC4xLFxuXHRMQU5ESU5HX05PUk1BTF9TTElERV9QRVJDRU5UQUdFOiAwLjI0LFxuXG5cdFNNQUxMX0tOT1RfUkFESVVTOiAzLFxuXG5cdE9QRU46ICdPUEVOJyxcblx0Q0xPU0U6ICdDTE9TRScsXG5cblx0TEVGVDogJ0xFRlQnLFxuXHRSSUdIVDogJ1JJR0hUJyxcblx0VE9QOiAnVE9QJyxcblx0Qk9UVE9NOiAnQk9UVE9NJyxcblxuXHRUT1RBTF9LTk9UX05VTTogMyxcblxuXHRQQURESU5HX0FST1VORDogMjAsXG5cblx0Q0FNUEFJR05fSU1BR0VfU0laRTogWzE2MDQsIDEwNDBdLFxuXG5cdFJFU1BPTlNJVkVfSU1BR0U6IFsxOTIwLCAxMjgwLCA2NDBdLFxuXG5cdEVOVklST05NRU5UUzoge1xuXHRcdFBSRVBST0Q6IHtcblx0XHRcdHN0YXRpYzogJydcblx0XHR9LFxuXHRcdFBST0Q6IHtcblx0XHRcdFwic3RhdGljXCI6IEpTX3VybF9zdGF0aWNcblx0XHR9XG5cdH0sXG5cblx0TEFORFNDQVBFOiAnTEFORFNDQVBFJyxcblx0UE9SVFJBSVQ6ICdQT1JUUkFJVCcsXG5cblx0TUVESUFfR0xPQkFMX1c6IDE5MjAsXG5cdE1FRElBX0dMT0JBTF9IOiAxMDgwLFxuXG5cdEdMT0JBTF9GT05UX1NJWkU6IDE2LFxuXG5cdE1JTl9NSURETEVfVzogOTYwLFxuXHRNUV9YU01BTEw6IDMyMCxcblx0TVFfU01BTEw6IDQ4MCxcblx0TVFfTUVESVVNOiA3NjgsXG5cdE1RX0xBUkdFOiAxMDI0LFxuXHRNUV9YTEFSR0U6IDEyODAsXG5cdE1RX1hYTEFSR0U6IDE2ODAsXG59IiwiaW1wb3J0IEZsdXggZnJvbSAnZmx1eCdcbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbidcblxudmFyIEFwcERpc3BhdGNoZXIgPSBhc3NpZ24obmV3IEZsdXguRGlzcGF0Y2hlcigpLCB7XG5cdGhhbmRsZVZpZXdBY3Rpb246IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdHRoaXMuZGlzcGF0Y2goe1xuXHRcdFx0c291cmNlOiAnVklFV19BQ1RJT04nLFxuXHRcdFx0YWN0aW9uOiBhY3Rpb25cblx0XHR9KTtcblx0fVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IEFwcERpc3BhdGNoZXIiLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgaGVscGVyLCBhbGlhczE9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczI9XCJmdW5jdGlvblwiLCBhbGlhczM9dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIHJldHVybiBcIlx0XHRcdFx0XHQ8bGkgY2xhc3M9XFxcImNvdW50cnktXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmluZGV4IHx8IChkYXRhICYmIGRhdGEuaW5kZXgpKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImluZGV4XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+PGEgaHJlZj0nI1wiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy51cmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwidXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIic+XCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm5hbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcIm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9hPjwvbGk+XFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyLCBhbGlhczE9dGhpcy5sYW1iZGEsIGFsaWFzMj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIGFsaWFzMz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzND1cImZ1bmN0aW9uXCI7XG5cbiAgcmV0dXJuIFwiPGRpdj5cXG5cdDxoZWFkZXIgaWQ9XFxcImhlYWRlclxcXCI+XFxuXHRcdDxhIGhyZWY9XFxcIiMhL2xhbmRpbmdcXFwiIGNsYXNzPVxcXCJsb2dvXFxcIj5cXG5cdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgaWQ9XFxcIkxheWVyXzFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMzYuMDEzcHhcXFwiIHZpZXdCb3g9XFxcIjAgMCAxMzYuMDEzIDQ5LjM3NVxcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMTM2LjAxMyA0OS4zNzVcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCIgY2xpcC1ydWxlPVxcXCJldmVub2RkXFxcIiBkPVxcXCJNODIuMTQxLDguMDAyaDMuMzU0YzEuMjEzLDAsMS43MTcsMC40OTksMS43MTcsMS43MjV2Ny4xMzdjMCwxLjIzMS0wLjUwMSwxLjczNi0xLjcwNSwxLjczNmgtMy4zNjVWOC4wMDJ6IE04Mi41MjMsMjQuNjE3djguNDI2bC03LjA4Ny0wLjM4NFYxLjkyNUg4Ny4zOWMzLjI5MiwwLDUuOTYsMi43MDUsNS45Niw2LjA0NHYxMC42MDRjMCwzLjMzOC0yLjY2OCw2LjA0NC01Ljk2LDYuMDQ0SDgyLjUyM3ogTTMzLjQ5MSw3LjkxM2MtMS4xMzIsMC0yLjA0OCwxLjA2NS0yLjA0OCwyLjM3OXYxMS4yNTZoNC40MDlWMTAuMjkyYzAtMS4zMTQtMC45MTctMi4zNzktMi4wNDctMi4zNzlIMzMuNDkxeiBNMzIuOTk0LDAuOTc0aDEuMzA4YzQuNzAyLDAsOC41MTQsMy44NjYsOC41MTQsOC42MzR2MjUuMjI0bC02Ljk2MywxLjI3M3YtNy44NDhoLTQuNDA5bDAuMDEyLDguNzg3bC02Ljk3NCwyLjAxOFY5LjYwOEMyNC40ODEsNC44MzksMjguMjkyLDAuOTc0LDMyLjk5NCwwLjk3NCBNMTIxLjkzMyw3LjkyMWgzLjQyM2MxLjIxNSwwLDEuNzE4LDAuNDk3LDEuNzE4LDEuNzI0djguMTk0YzAsMS4yMzItMC41MDIsMS43MzYtMS43MDUsMS43MzZoLTMuNDM2VjcuOTIxeiBNMTMzLjcxOCwzMS4wNTV2MTcuNDg3bC02LjkwNi0zLjM2OFYzMS41OTFjMC00LjkyLTQuNTg4LTUuMDgtNC41ODgtNS4wOHYxNi43NzRsLTYuOTgzLTIuOTE0VjEuOTI1aDEyLjIzMWMzLjI5MSwwLDUuOTU5LDIuNzA1LDUuOTU5LDYuMDQ0djExLjA3N2MwLDIuMjA3LTEuMjE3LDQuMTUzLTIuOTkxLDUuMTE1QzEzMS43NjEsMjQuODk0LDEzMy43MTgsMjcuMDc3LDEzMy43MTgsMzEuMDU1IE0xMC44MDksMC44MzNjLTQuNzAzLDAtOC41MTQsMy44NjYtOC41MTQsOC42MzR2MjcuOTM2YzAsNC43NjksNC4wMTksOC42MzQsOC43MjIsOC42MzRsMS4zMDYtMC4wODVjNS42NTUtMS4wNjMsOC4zMDYtNC42MzksOC4zMDYtOS40MDd2LTguOTRoLTYuOTk2djguNzM2YzAsMS40MDktMC4wNjQsMi42NS0xLjk5NCwyLjk5MmMtMS4yMzEsMC4yMTktMi40MTctMC44MTYtMi40MTctMi4xMzJWMTAuMTUxYzAtMS4zMTQsMC45MTctMi4zODEsMi4wNDctMi4zODFoMC4zMTVjMS4xMywwLDIuMDQ4LDEuMDY3LDIuMDQ4LDIuMzgxdjguNDY0aDYuOTk2VjkuNDY3YzAtNC43NjgtMy44MTItOC42MzQtOC41MTQtOC42MzRIMTAuODA5IE0xMDMuOTUzLDIzLjE2Mmg2Ljk3N3YtNi43NDRoLTYuOTc3VjguNDIzbDcuNjc2LTAuMDAyVjEuOTI0SDk2LjcydjMzLjI3OGMwLDAsNS4yMjUsMS4xNDEsNy41MzIsMS42NjZjMS41MTcsMC4zNDYsNy43NTIsMi4yNTMsNy43NTIsMi4yNTN2LTcuMDE1bC04LjA1MS0xLjUwOFYyMy4xNjJ6IE00Ni44NzksMS45MjdsMC4wMDMsMzIuMzVsNy4xMjMtMC44OTVWMTguOTg1bDUuMTI2LDEwLjQyNmw1LjEyNi0xMC40ODRsMC4wMDIsMTMuNjY0bDcuMDIyLTAuMDU0VjEuODk1aC03LjU0NUw1OS4xMywxNC42TDU0LjY2MSwxLjkyN0g0Ni44Nzl6XFxcIi8+PC9zdmc+XFxuXHRcdDwvYT5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiY2FtcGVyLWxhYlxcXCI+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5jYW1wZXJfbGFiX3VybCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmNhbXBlcl9sYWIgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCI8L2E+PC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInNob3Atd3JhcHBlclxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwic2hvcC10aXRsZVxcXCI+XCJcbiAgICArIGFsaWFzMihhbGlhczEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW5mb3MgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLnNob3BfdGl0bGUgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCI8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJnZW5kZXItd3JhcHBlclxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJtZW5cXFwiPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuc2hvcF9tZW5fdXJsIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuc2hvcF9tZW4gOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCI8L2E+PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJzZXBhcmF0b3JcXFwiPjwvZGl2Plxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwid29tZW5cXFwiPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKGFsaWFzMSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbmZvcyA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuc2hvcF93b21lbl91cmwgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zaG9wX3dvbWVuIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiPC9hPjwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwibGFuZy13cmFwcGVyIGJ0blxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiY3VycmVudC1sYW5nXFxcIj5cIlxuICAgICsgYWxpYXMyKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuY3VycmVudF9sYW5nIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5jdXJyZW50X2xhbmcgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMzKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXM0ID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImN1cnJlbnRfbGFuZ1wiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI8L2Rpdj5cXG5cdFx0XHQ8dWwgY2xhc3M9XFxcImNvdW50cmllcy13cmFwcGVyXFxcIj5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNvdW50cmllcyA6IGRlcHRoMCkse1wibmFtZVwiOlwiZWFjaFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlx0XHRcdDwvdWw+XFxuXHRcdDwvZGl2Plxcblx0PC9oZWFkZXI+XFxuXHQ8Zm9vdGVyIGlkPVxcXCJmb290ZXJcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJsZWdhbFxcXCI+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5sZWdhbF91cmwgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBhbGlhczIoYWxpYXMxKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmluZm9zIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5sZWdhbCA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIjwvYT48L2Rpdj5cXG5cdFx0PHVsIGlkPVxcXCJzb2NpYWwtd3JhcHBlclxcXCI+XFxuXHRcdFx0PGxpPlxcblx0XHRcdFx0PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczIoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5mYWNlYm9va1VybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuZmFjZWJvb2tVcmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMzKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXM0ID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImZhY2Vib29rVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0XHRcdDxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiMTAwJVxcXCIgdmlld0JveD1cXFwiMCAwIDMyLjAwMyAzMi4wMDNcXFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVxcXCJuZXcgMCAwIDMyLjAwMyAzMi4wMDNcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiPjxwYXRoIGQ9XFxcIk0xNi4wMDIsMC4xNjdjLTguNzQ2LDAtMTUuODM1LDcuMDktMTUuODM1LDE1LjgzNGMwLDguNzQ2LDcuMDg5LDE1LjgzNSwxNS44MzUsMTUuODM1YzguNzQ1LDAsMTUuODM0LTcuMDg5LDE1LjgzNC0xNS44MzVDMzEuODM2LDcuMjU3LDI0Ljc0NywwLjE2NywxNi4wMDIsMC4xNjcgTTIyLjMyMiwxMy41MzljMC4wMDcsMC4xMzgsMC4wMDksMC4yNzksMC4wMDksMC40MmMwLDQuMzAyLTMuMjcyLDkuMjU5LTkuMjU5LDkuMjU5Yy0xLjgzNywwLTMuNTQ3LTAuNTM5LTQuOTg3LTEuNDYxYzAuMjUzLDAuMDMxLDAuNTE0LDAuMDQ0LDAuNzc2LDAuMDQ0YzEuNTI1LDAsMi45MjgtMC41Miw0LjA0Mi0xLjM5NGMtMS40MjQtMC4wMjMtMi42MjUtMC45NjUtMy4wMzktMi4yNThjMC4xOTgsMC4wMzcsMC40MDIsMC4wNTgsMC42MTEsMC4wNThjMC4yOTgsMCwwLjU4NS0wLjAzOCwwLjg1OC0wLjExNWMtMS40ODktMC4yOTctMi42MTItMS42MTItMi42MTItMy4xODl2LTAuMDQxYzAuNDQsMC4yNDIsMC45NDIsMC4zODksMS40NzUsMC40MDdjLTAuODczLTAuNTg1LTEuNDQ3LTEuNTgxLTEuNDQ3LTIuNzA5YzAtMC41OTcsMC4xNi0xLjE1NSwwLjQ0MS0xLjYzOGMxLjYwNSwxLjk3LDQuMDAzLDMuMjY0LDYuNzA4LDMuNGMtMC4wNTctMC4yMzgtMC4wODUtMC40ODUtMC4wODUtMC43NGMwLTEuNzk3LDEuNDU4LTMuMjU0LDMuMjU0LTMuMjU0YzAuOTM3LDAsMS43ODMsMC4zOTUsMi4zNzUsMS4wMjhjMC43NDItMC4xNDYsMS40MzgtMC40MTcsMi4wNjctMC43ODljLTAuMjQyLDAuNzU5LTAuNzU5LDEuMzk2LTEuNDMyLDEuNzk5YzAuNjU4LTAuMDc5LDEuMjg2LTAuMjUzLDEuODY5LTAuNTExQzIzLjUxMSwxMi41MDcsMjIuOTU5LDEzLjA3OSwyMi4zMjIsMTMuNTM5XFxcIi8+PC9zdmc+XFxuXHRcdFx0XHQ8L2E+XFxuXHRcdFx0PC9saT5cXG5cdFx0XHQ8bGk+XFxuXHRcdFx0XHQ8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzMigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnR3aXR0ZXJVcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnR3aXR0ZXJVcmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMzKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXM0ID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcInR3aXR0ZXJVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHRcdFx0PHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiIHdpZHRoPVxcXCIxMDAlXFxcIiB2aWV3Qm94PVxcXCIwIDAgMzIuMDAzIDMyLjAwM1xcXCIgZW5hYmxlLWJhY2tncm91bmQ9XFxcIm5ldyAwIDAgMzIuMDAzIDMyLjAwM1xcXCIgeG1sOnNwYWNlPVxcXCJwcmVzZXJ2ZVxcXCI+PHBhdGggZD1cXFwiTTE2LjAwMSwwLjE2N2MtOC43NDUsMC0xNS44MzQsNy4wOS0xNS44MzQsMTUuODM0YzAsOC43NDUsNy4wODksMTUuODM1LDE1LjgzNCwxNS44MzVjOC43NDUsMCwxNS44MzQtNy4wOSwxNS44MzQtMTUuODM1QzMxLjgzNiw3LjI1NywyNC43NDYsMC4xNjcsMTYuMDAxLDAuMTY3IE0xOS40OTgsMTMuMzJsLTAuMTg0LDIuMzY5aC0yLjQyN3Y4LjIyOWgtMy4wNjh2LTguMjI5aC0xLjYzOFYxMy4zMmgxLjYzOHYtMS41OTJjMC0wLjcwMSwwLjAxNy0xLjc4MiwwLjUyNy0yLjQ1M2MwLjUzNi0wLjcwOSwxLjI3My0xLjE5MSwyLjU0MS0xLjE5MWMyLjA2NiwwLDIuOTM1LDAuMjk1LDIuOTM1LDAuMjk1bC0wLjQxLDIuNDI1YzAsMC0wLjY4Mi0wLjE5Ni0xLjMxOC0wLjE5NmMtMC42MzcsMC0xLjIwNywwLjIyNy0xLjIwNywwLjg2M3YxLjg1SDE5LjQ5OHpcXFwiLz48L3N2Zz5cXG5cdFx0XHRcdDwvYT5cXG5cdFx0XHQ8L2xpPlxcblx0XHRcdDxsaT5cXG5cdFx0XHRcdDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBocmVmPVxcXCJcIlxuICAgICsgYWxpYXMyKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW5zdGFncmFtVXJsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbnN0YWdyYW1VcmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMzKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXM0ID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImluc3RhZ3JhbVVybFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcblx0XHRcdFx0XHQ8c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjEwMCVcXFwiIHZpZXdCb3g9XFxcIjAgMCAzMi4wMDMgMzIuMDAzXFxcIiBlbmFibGUtYmFja2dyb3VuZD1cXFwibmV3IDAgMCAzMi4wMDMgMzIuMDAzXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIj48cGF0aCBkPVxcXCJNMTkuNDEzLDEyLjYwMmwtMC4wMDktMi42ODZsMi42ODUtMC4wMDh2Mi42ODRMMTkuNDEzLDEyLjYwMnogTTE2LjAwNCwxOC43ODhjMS41MzYsMCwyLjc4Ny0xLjI1LDIuNzg3LTIuNzg3YzAtMC42MDUtMC4xOTYtMS4xNjYtMC41MjgtMS42MjRjLTAuNTA3LTAuNzAzLTEuMzI5LTEuMTYzLTIuMjU5LTEuMTYzYy0wLjkzMSwwLTEuNzUzLDAuNDYtMi4yNiwxLjE2M2MtMC4zMywwLjQ1OC0wLjUyNywxLjAxOS0wLjUyNywxLjYyNEMxMy4yMTcsMTcuNTM4LDE0LjQ2NywxOC43ODgsMTYuMDA0LDE4Ljc4OHogTTIwLjMzMywxNi4wMDFjMCwyLjM4Ny0xLjk0Miw0LjMzLTQuMzI5LDQuMzNjLTIuMzg4LDAtNC4zMjktMS45NDMtNC4zMjktNC4zM2MwLTAuNTc1LDAuMTE0LTEuMTIzLDAuMzE4LTEuNjI0SDkuNjI5djYuNDgxYzAsMC44MzYsMC42ODEsMS41MTgsMS41MTgsMS41MThoOS43MTRjMC44MzcsMCwxLjUxNy0wLjY4MiwxLjUxNy0xLjUxOHYtNi40ODFoLTIuMzYzQzIwLjIxNywxNC44NzgsMjAuMzMzLDE1LjQyNiwyMC4zMzMsMTYuMDAxeiBNMzEuODM2LDE2LjAwMWMwLDguNzQ0LTcuMDksMTUuODM1LTE1LjgzNSwxNS44MzVTMC4xNjcsMjQuNzQ1LDAuMTY3LDE2LjAwMWMwLTguNzQ1LDcuMDg5LTE1LjgzNCwxNS44MzQtMTUuODM0UzMxLjgzNiw3LjI1NiwzMS44MzYsMTYuMDAxeiBNMjMuOTIxLDExLjE0NGMwLTEuNjg4LTEuMzczLTMuMDYtMy4wNjItMy4wNmgtOS43MTNjLTEuNjg3LDAtMy4wNiwxLjM3MS0zLjA2LDMuMDZ2OS43MTRjMCwxLjY4OCwxLjM3MywzLjA2LDMuMDYsMy4wNmg5LjcxM2MxLjY4OCwwLDMuMDYyLTEuMzcyLDMuMDYyLTMuMDZWMTEuMTQ0elxcXCIvPjwvc3ZnPlxcblx0XHRcdFx0PC9hPlxcblx0XHRcdDwvbGk+XFxuXHRcdDwvdWw+XFxuXHQ8L2Zvb3Rlcj5cXG48L2Rpdj5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIjxkaXYgaWQ9J3BhZ2VzLWNvbnRhaW5lcic+XFxuXHQ8ZGl2IGlkPSdwYWdlLWEnPjwvZGl2Plxcblx0PGRpdiBpZD0ncGFnZS1iJz48L2Rpdj5cXG48L2Rpdj5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdDxkaXYgY2xhc3M9XFxcImludGVyZmFjZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInByZXZpb3VzLWJ0biBkb3RzLWFycm93LWJ0biBidG5cXFwiPlxcblx0XHRcdDxzdmc+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHQ8L3N2Zz5cXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcIm5leHQtYnRuIGRvdHMtYXJyb3ctYnRuIGJ0blxcXCI+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdDwvc3ZnPlxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiZG93bi1idG4gZG90cy1hcnJvdy1idG4gYnRuXFxcIj5cXG5cdFx0XHQ8c3ZnPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0PC9zdmc+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJidXktYnRuIGRvdHMtcmVjdGFuZ2xlLWJ0biBidG5cXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImJ0bi10aXRsZVxcXCI+PC9kaXY+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0PC9zdmc+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJwbGFuZXQtYnRuIGRvdHMtcmVjdGFuZ2xlLWJ0biBidG5cXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImJ0bi10aXRsZVxcXCI+PC9kaXY+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0PC9zdmc+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJwcm9kdWN0LXRpdGxlLXdyYXBwZXJcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtdGl0bGUgdGl0bGUtYVxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwicHJvZHVjdC10aXRsZSB0aXRsZS1iXFxcIj48L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcInByb2R1Y3QtY29udGFpbmVycy13cmFwcGVyXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwicHJvZHVjdC1jb250YWluZXIgcHJvZHVjdC1jb250YWluZXItYVxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwicG9zdGVyLXdyYXBwZXJcXFwiPlxcblx0XHRcdFx0PGltZyBzcmM9XFxcIlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVyc1snZW1wdHktaW1hZ2UnXSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDBbJ2VtcHR5LWltYWdlJ10gOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImVtcHR5LWltYWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidmlkZW8td3JhcHBlclxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJwcm9kdWN0LWNvbnRhaW5lciBwcm9kdWN0LWNvbnRhaW5lci1iXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJwb3N0ZXItd3JhcHBlclxcXCI+XFxuXHRcdFx0XHQ8aW1nIHNyYz1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzWydlbXB0eS1pbWFnZSddIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMFsnZW1wdHktaW1hZ2UnXSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiZW1wdHktaW1hZ2VcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ2aWRlby13cmFwcGVyXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIjxkaXYgY2xhc3M9J3BhZ2Utd3JhcHBlcic+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJjb21wYXNzZXMtdGV4dHMtd3JhcHBlclxcXCI+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcImludGVyZmFjZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcImdvLWNhbXBhaWduLWJ0biBkb3RzLXJlY3RhbmdsZS1idG4gYnRuXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJidG4tdGl0bGVcXFwiPjwvZGl2Plxcblx0XHRcdDxzdmc+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdDwvc3ZnPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz0ncGFnZS13cmFwcGVyJz5cXG5cdDxkaXYgY2xhc3M9XFxcInNsaWRlc2hvdy10aXRsZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInBsYW5ldC10aXRsZVxcXCI+UExBTkVUPC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInBsYW5ldC1uYW1lXFxcIj5HRU1TVE9ORTwvZGl2Plxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJpbnRlcmZhY2VcXFwiPlxcblxcblx0XHQ8ZGl2IGlkPVxcXCJsZWZ0XFxcIiBjbGFzcz1cXFwicHJldmlvdXMtYXJlYSBhcmVhLWJ0blxcXCI+PC9kaXY+XFxuXHRcdDxkaXYgaWQ9XFxcInJpZ2h0XFxcIiBjbGFzcz1cXFwibmV4dC1hcmVhIGFyZWEtYnRuXFxcIj48L2Rpdj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwicHJldmlvdXMtYnRuIGRvdHMtYXJyb3ctYnRuXFxcIj5cXG5cdFx0XHQ8c3ZnPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdFx0PGxpbmUgY2xhc3M9XFxcImxpbmVcXFwiIC8+XFxuXHRcdFx0PC9zdmc+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJuZXh0LWJ0biBkb3RzLWFycm93LWJ0blxcXCI+XFxuXHRcdFx0PHN2Zz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8Y2lyY2xlIGNsYXNzPVxcXCJrbm90XFxcIiAvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIi8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIvPlxcblx0XHRcdFx0PGNpcmNsZSBjbGFzcz1cXFwia25vdFxcXCIgLz5cXG5cdFx0XHRcdDxjaXJjbGUgY2xhc3M9XFxcImtub3RcXFwiIC8+XFxuXHRcdFx0XHQ8bGluZSBjbGFzcz1cXFwibGluZVxcXCIgLz5cXG5cdFx0XHRcdDxsaW5lIGNsYXNzPVxcXCJsaW5lXFxcIiAvPlxcblx0XHRcdDwvc3ZnPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQXBwQWN0aW9ucyBmcm9tICdBcHBBY3Rpb25zJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuICAgIFx0XG5jbGFzcyBHbG9iYWxFdmVudHMge1xuXHRpbml0KCkge1xuXHRcdCQod2luZG93KS5vbigncmVzaXplJywgdGhpcy5yZXNpemUpXG5cdFx0JCh3aW5kb3cpLm9uKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlKVxuXHRcdEFwcFN0b3JlLk1vdXNlID0gbmV3IFBJWEkuUG9pbnQoKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHRBcHBBY3Rpb25zLndpbmRvd1Jlc2l6ZSh3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0KVxuXHR9XG5cdG9uTW91c2VNb3ZlKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRBcHBTdG9yZS5Nb3VzZS54ID0gZS5wYWdlWFxuXHRcdEFwcFN0b3JlLk1vdXNlLnkgPSBlLnBhZ2VZXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2xvYmFsRXZlbnRzXG4iLCJpbXBvcnQgb3AgZnJvbSAnb2JqZWN0cG9vbCdcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcbmltcG9ydCBTcHJpbmdHYXJkZW4gZnJvbSAnU3ByaW5nR2FyZGVuJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb29sIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dmFyIHBsYW5ldHMgPSBBcHBTdG9yZS5wbGFuZXRzKClcblx0XHR2YXIgcHhDb250YWluZXJOdW0gPSAyMCArIChwbGFuZXRzLmxlbmd0aCAqIDEpXG5cdFx0dmFyIGdyYXBoaWNzTnVtID0gKHBsYW5ldHMubGVuZ3RoICogMykgLSAyXG5cdFx0dmFyIHNwcml0ZXNOdW0gPSBwbGFuZXRzLmxlbmd0aFxuXHRcdHZhciBzcHJpbmdHYXJkZW5zTnVtID0gMTBcblxuXHRcdHRoaXMudGltZWxpbmVzID0gb3AuZ2VuZXJhdGUoVGltZWxpbmVNYXgsIHsgY291bnQ6IDIwIH0pXG5cdFx0dGhpcy5weENvbnRhaW5lcnMgPSBvcC5nZW5lcmF0ZShQSVhJLkNvbnRhaW5lciwgeyBjb3VudDogcHhDb250YWluZXJOdW0gfSlcblx0XHR0aGlzLmdyYXBoaWNzID0gb3AuZ2VuZXJhdGUoUElYSS5HcmFwaGljcywgeyBjb3VudDogZ3JhcGhpY3NOdW0gfSlcblx0XHR0aGlzLnNwcml0ZXMgPSBvcC5nZW5lcmF0ZShQSVhJLlNwcml0ZSwgeyBjb3VudDogc3ByaXRlc051bSB9KVxuXHRcdHRoaXMuc3ByaW5nR2FyZGVucyA9IG9wLmdlbmVyYXRlKFNwcmluZ0dhcmRlbiwgeyBjb3VudDogc3ByaW5nR2FyZGVuc051bSB9KVxuXHR9XG5cdGdldFRpbWVsaW5lKCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdnZXQgPj4+Pj4+Pj4+Pj4+Pj4+Jylcblx0XHR2YXIgdGwgPSB0aGlzLnRpbWVsaW5lcy5nZXQoKVxuXHRcdHRsLmtpbGwoKVxuXHRcdHRsLmNsZWFyKClcblx0XHRyZXR1cm4gdGxcblx0fVxuXHRyZWxlYXNlVGltZWxpbmUoaXRlbSkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdyZWxlYXNlIDw8PDw8PDw8PDw8PDw8JywgaXRlbSlcblx0XHRpdGVtLmtpbGwoKVxuXHRcdGl0ZW0uY2xlYXIoKVxuXHRcdHRoaXMudGltZWxpbmVzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRDb250YWluZXIoKSB7XG5cdFx0dmFyIGNvbnRhaW5lciA9IHRoaXMucHhDb250YWluZXJzLmdldCgpXG5cdFx0Y29udGFpbmVyLnNjYWxlLnggPSAxXG5cdFx0Y29udGFpbmVyLnNjYWxlLnkgPSAxXG5cdFx0Y29udGFpbmVyLnBvc2l0aW9uLnggPSAwXG5cdFx0Y29udGFpbmVyLnBvc2l0aW9uLnkgPSAwXG5cdFx0Y29udGFpbmVyLnNrZXcueCA9IDBcblx0XHRjb250YWluZXIuc2tldy55ID0gMFxuXHRcdGNvbnRhaW5lci5waXZvdC54ID0gMFxuXHRcdGNvbnRhaW5lci5waXZvdC55ID0gMFxuXHRcdGNvbnRhaW5lci5yb3RhdGlvbiA9IDBcblx0XHRyZXR1cm4gY29udGFpbmVyXG5cdH1cblx0cmVsZWFzZUNvbnRhaW5lcihpdGVtKSB7XG5cdFx0dGhpcy5weENvbnRhaW5lcnMucmVsZWFzZShpdGVtKVxuXHR9XG5cdGdldEdyYXBoaWNzKCkge1xuXHRcdHZhciBnID0gdGhpcy5ncmFwaGljcy5nZXQoKVxuXHRcdGcuY2xlYXIoKVxuXHRcdGcuc2NhbGUueCA9IDFcblx0XHRnLnNjYWxlLnkgPSAxXG5cdFx0Zy5wb3NpdGlvbi54ID0gMFxuXHRcdGcucG9zaXRpb24ueSA9IDBcblx0XHRnLnNrZXcueCA9IDBcblx0XHRnLnNrZXcueSA9IDBcblx0XHRnLnBpdm90LnggPSAwXG5cdFx0Zy5waXZvdC55ID0gMFxuXHRcdGcucm90YXRpb24gPSAwXG5cdFx0cmV0dXJuIGdcblx0fVxuXHRyZWxlYXNlR3JhcGhpY3MoaXRlbSkge1xuXHRcdHRoaXMuZ3JhcGhpY3MucmVsZWFzZShpdGVtKVxuXHR9XG5cdGdldFNwcml0ZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zcHJpdGVzLmdldCgpXG5cdH1cblx0cmVsZWFzZVNwcml0ZShpdGVtKSB7XG5cdFx0dGhpcy5zcHJpdGVzLnJlbGVhc2UoaXRlbSlcblx0fVxuXHRnZXRTcHJpbmdHYXJkZW4oKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3ByaW5nR2FyZGVucy5nZXQoKVxuXHR9XG5cdHJlbGVhc2VTcHJpbmdHYXJkZW4oaXRlbSkge1xuXHRcdHRoaXMuc3ByaW5nR2FyZGVucy5yZWxlYXNlKGl0ZW0pXG5cdH1cbn1cbiIsImNsYXNzIFByZWxvYWRlciAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLnF1ZXVlID0gbmV3IGNyZWF0ZWpzLkxvYWRRdWV1ZSgpXG5cdFx0dGhpcy5xdWV1ZS5vbihcImNvbXBsZXRlXCIsIHRoaXMub25NYW5pZmVzdExvYWRDb21wbGV0ZWQsIHRoaXMpXG5cdFx0dGhpcy5jdXJyZW50TG9hZGVkQ2FsbGJhY2sgPSB1bmRlZmluZWRcblx0fVxuXHRsb2FkKG1hbmlmZXN0LCBvbkxvYWRlZCkge1xuXHRcdHRoaXMuY3VycmVudExvYWRlZENhbGxiYWNrID0gb25Mb2FkZWRcbiAgICAgICAgdGhpcy5xdWV1ZS5sb2FkTWFuaWZlc3QobWFuaWZlc3QpXG5cdH1cblx0b25NYW5pZmVzdExvYWRDb21wbGV0ZWQoKSB7XG5cdFx0dGhpcy5jdXJyZW50TG9hZGVkQ2FsbGJhY2soKVxuXHR9XG5cdGdldENvbnRlbnRCeUlkKGlkKSB7XG5cdFx0cmV0dXJuIHRoaXMucXVldWUuZ2V0UmVzdWx0KGlkKVxuXHR9XG5cdGdldFN2ZyhpZCkge1xuXHRcdHJldHVybiB0aGlzLmdldENvbnRlbnRCeUlkKGlkK1wiLXN2Z1wiKVxuXHR9XG5cdGdldEltYWdlVVJMKGlkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0Q29udGVudEJ5SWQoaWQpLmdldEF0dHJpYnV0ZShcInNyY1wiKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFByZWxvYWRlclxuIiwiaW1wb3J0IGRhdGEgZnJvbSAnR2xvYmFsRGF0YSdcbmltcG9ydCBoYXNoZXIgZnJvbSAnaGFzaGVyJ1xuaW1wb3J0IEFwcEFjdGlvbnMgZnJvbSAnQXBwQWN0aW9ucydcbmltcG9ydCBjcm9zc3JvYWRzIGZyb20gJ2Nyb3Nzcm9hZHMnXG5pbXBvcnQgQXBwU3RvcmUgZnJvbSAnQXBwU3RvcmUnXG5cbmNsYXNzIFJvdXRlciB7XG5cdGluaXQoKSB7XG5cdFx0dGhpcy5yb3V0aW5nID0gZGF0YS5yb3V0aW5nXG5cdFx0dGhpcy5kZWZhdWx0Um91dGUgPSB0aGlzLnJvdXRpbmdbJy8nXVxuXHRcdHRoaXMubmV3SGFzaEZvdW5kZWQgPSBmYWxzZVxuXHRcdGhhc2hlci5uZXdIYXNoID0gdW5kZWZpbmVkXG5cdFx0aGFzaGVyLm9sZEhhc2ggPSB1bmRlZmluZWRcblx0XHRoYXNoZXIucHJlcGVuZEhhc2ggPSAnISdcblx0XHRoYXNoZXIuaW5pdGlhbGl6ZWQuYWRkKHRoaXMuX2RpZEhhc2hlckNoYW5nZS5iaW5kKHRoaXMpKVxuXHRcdGhhc2hlci5jaGFuZ2VkLmFkZCh0aGlzLl9kaWRIYXNoZXJDaGFuZ2UuYmluZCh0aGlzKSlcblx0XHR0aGlzLl9zZXR1cENyb3Nzcm9hZHMoKVxuXHR9XG5cdGJlZ2luUm91dGluZygpIHtcblx0XHRoYXNoZXIuaW5pdCgpXG5cdH1cblx0X3NldHVwQ3Jvc3Nyb2FkcygpIHtcblx0XHR2YXIgcGxhbmV0cyA9IEFwcFN0b3JlLnBsYW5ldHMoKVxuXHRcdHZhciBiYXNpY1NlY3Rpb24gPSBjcm9zc3JvYWRzLmFkZFJvdXRlKCd7cGFnZX0nLCB0aGlzLl9vbkZpcnN0RGVncmVlVVJMSGFuZGxlci5iaW5kKHRoaXMpLCAzKVxuXHRcdGJhc2ljU2VjdGlvbi5ydWxlcyA9IHtcblx0ICAgICAgICBwYWdlIDogWydsYW5kaW5nJ10gLy92YWxpZCBzZWN0aW9uc1xuXHQgICAgfVxuXHQgICAgdmFyIHBsYW5ldFByb2R1Y3RTZWN0aW9uID0gY3Jvc3Nyb2Fkcy5hZGRSb3V0ZSgnL3BsYW5ldC97cGxhbmV0SWR9L3twcm9kdWN0SWR9JywgdGhpcy5fb25QbGFuZXRQcm9kdWN0VVJMSGFuZGxlci5iaW5kKHRoaXMpLCAyKVxuXHQgICAgcGxhbmV0UHJvZHVjdFNlY3Rpb24ucnVsZXMgPSB7XG5cdCAgICBcdHBsYW5ldElkOiBwbGFuZXRzLFxuXHQgICAgXHRwcm9kdWN0SWQgOiAvXlswLTVdL1xuXHQgICAgfVxuXHQgICAgdmFyIHBsYW5ldFNlY3Rpb24gPSBjcm9zc3JvYWRzLmFkZFJvdXRlKCcvcGxhbmV0L3twbGFuZXRJZH0nLCB0aGlzLl9vblBsYW5ldFVSTEhhbmRsZXIuYmluZCh0aGlzKSwgMilcblx0ICAgIHBsYW5ldFNlY3Rpb24ucnVsZXMgPSB7XG5cdCAgICBcdHBsYW5ldElkOiBwbGFuZXRzXG5cdCAgICB9XG5cdH1cblx0X29uRmlyc3REZWdyZWVVUkxIYW5kbGVyKHBhZ2VJZCkge1xuXHRcdHRoaXMuX2Fzc2lnblJvdXRlKHBhZ2VJZClcblx0fVxuXHRfb25QbGFuZXRQcm9kdWN0VVJMSGFuZGxlcihwbGFuZXRJZCwgcHJvZHVjdElkKSB7XG5cdFx0dGhpcy5fYXNzaWduUm91dGUocHJvZHVjdElkKVxuXHR9XG5cdF9vblBsYW5ldFVSTEhhbmRsZXIocGxhbmV0SWQpIHtcblx0XHR0aGlzLl9hc3NpZ25Sb3V0ZShwbGFuZXRJZClcblx0fVxuXHRfb25CbG9nUG9zdFVSTEhhbmRsZXIocG9zdElkKSB7XG5cdFx0dGhpcy5fYXNzaWduUm91dGUocG9zdElkKVxuXHR9XG5cdF9vbkRlZmF1bHRVUkxIYW5kbGVyKCkge1xuXHRcdHRoaXMuX3NlbmRUb0RlZmF1bHQoKVxuXHR9XG5cdF9hc3NpZ25Sb3V0ZShpZCkge1xuXHRcdHZhciBoYXNoID0gaGFzaGVyLmdldEhhc2goKVxuXHRcdHZhciBwYXJ0cyA9IHRoaXMuX2dldFVSTFBhcnRzKGhhc2gpXG5cdFx0dGhpcy5fdXBkYXRlUGFnZVJvdXRlKGhhc2gsIHBhcnRzLCBwYXJ0c1swXSwgaWQpXG5cdFx0dGhpcy5uZXdIYXNoRm91bmRlZCA9IHRydWVcblx0fVxuXHRfZ2V0VVJMUGFydHModXJsKSB7XG5cdFx0dmFyIGhhc2ggPSB1cmxcblx0XHRoYXNoID0gaGFzaC5zdWJzdHIoMSlcblx0XHRyZXR1cm4gaGFzaC5zcGxpdCgnLycpXG5cdH1cblx0X3VwZGF0ZVBhZ2VSb3V0ZShoYXNoLCBwYXJ0cywgcGFyZW50LCB0YXJnZXRJZCkge1xuXHRcdGhhc2hlci5vbGRIYXNoID0gaGFzaGVyLm5ld0hhc2hcblx0XHRoYXNoZXIubmV3SGFzaCA9IHtcblx0XHRcdGhhc2g6IGhhc2gsXG5cdFx0XHRwYXJ0czogcGFydHMsXG5cdFx0XHRwYXJlbnQ6IHBhcmVudCxcblx0XHRcdHRhcmdldElkOiB0YXJnZXRJZFxuXHRcdH1cblx0XHRBcHBBY3Rpb25zLnBhZ2VIYXNoZXJDaGFuZ2VkKClcblx0fVxuXHRfZGlkSGFzaGVyQ2hhbmdlKG5ld0hhc2gsIG9sZEhhc2gpIHtcblx0XHR0aGlzLm5ld0hhc2hGb3VuZGVkID0gZmFsc2Vcblx0XHRjcm9zc3JvYWRzLnBhcnNlKG5ld0hhc2gpXG5cdFx0aWYodGhpcy5uZXdIYXNoRm91bmRlZCkgcmV0dXJuXG5cdFx0Ly8gSWYgVVJMIGRvbid0IG1hdGNoIGEgcGF0dGVybiwgc2VuZCB0byBkZWZhdWx0XG5cdFx0dGhpcy5fb25EZWZhdWx0VVJMSGFuZGxlcigpXG5cdH1cblx0X3NlbmRUb0RlZmF1bHQoKSB7XG5cdFx0aGFzaGVyLnNldEhhc2goQXBwU3RvcmUuZGVmYXVsdFJvdXRlKCkpXG5cdH1cblx0c3RhdGljIGdldEJhc2VVUkwoKSB7XG5cdFx0cmV0dXJuIGRvY3VtZW50LlVSTC5zcGxpdChcIiNcIilbMF1cblx0fVxuXHRzdGF0aWMgZ2V0SGFzaCgpIHtcblx0XHRyZXR1cm4gaGFzaGVyLmdldEhhc2goKVxuXHR9XG5cdHN0YXRpYyBnZXRSb3V0ZXMoKSB7XG5cdFx0cmV0dXJuIGRhdGEucm91dGluZ1xuXHR9XG5cdHN0YXRpYyBnZXROZXdIYXNoKCkge1xuXHRcdHJldHVybiBoYXNoZXIubmV3SGFzaFxuXHR9XG5cdHN0YXRpYyBnZXRPbGRIYXNoKCkge1xuXHRcdHJldHVybiBoYXNoZXIub2xkSGFzaFxuXHR9XG5cdHN0YXRpYyBzZXRIYXNoKGhhc2gpIHtcblx0XHRoYXNoZXIuc2V0SGFzaChoYXNoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJvdXRlclxuIiwiaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuaW1wb3J0IEFwcENvbnN0YW50cyBmcm9tICdBcHBDb25zdGFudHMnXG5cbnZhciBUcmFuc2l0aW9uQW5pbWF0aW9ucyA9IHtcblxuXHQvLyBFWFBFUklFTkNFIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0J2V4cGVyaWVuY2UtaW4nOiBmdW5jdGlvbihzY29wZSwgdGltZWxpbmUpIHtcblx0XHR2YXIgd3JhcHBlciA9IHNjb3BlLmNoaWxkXG5cdFx0dmFyIHR5cGVzID0gQXBwU3RvcmUuZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG5cdFx0dmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHN3aXRjaCh0eXBlcy5vbGRUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxBTkRJTkc6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dmFyIGRpcmVjdGlvbiA9IChBcHBTdG9yZS5nZXRFeHBlcmllbmNlQW5pbWF0aW9uRGlyZWN0aW9uKCkgPT0gQXBwQ29uc3RhbnRzLkxFRlQpID8gLTEgOiAxXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB4OndpbmRvd1cqZGlyZWN0aW9uLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeDowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHg6d2luZG93VypkaXJlY3Rpb24sIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB4OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkNBTVBBSUdOOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0fSxcblx0J2V4cGVyaWVuY2Utb3V0JzogZnVuY3Rpb24oc2NvcGUsIHRpbWVsaW5lKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHR0aW1lbGluZS50byh3cmFwcGVyLCAxLCB7IG9wYWNpdHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9KVxuXHRcdFxuXHRcdHN3aXRjaCh0eXBlcy5uZXdUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxBTkRJTkc6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dmFyIGRpcmVjdGlvbiA9IChBcHBTdG9yZS5nZXRFeHBlcmllbmNlQW5pbWF0aW9uRGlyZWN0aW9uKCkgPT0gQXBwQ29uc3RhbnRzLkxFRlQpID8gLTEgOiAxXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB4OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB4Oi13aW5kb3dXKmRpcmVjdGlvbiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB4OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB4Oi13aW5kb3dXKmRpcmVjdGlvbiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuQ0FNUEFJR046XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHdyYXBwZXIsIDEsIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHR9LFxuXG5cdC8vIENBTVBBSUdOIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0J2NhbXBhaWduLWluJzogZnVuY3Rpb24oc2NvcGUsIHRpbWVsaW5lKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHN3aXRjaCh0eXBlcy5vbGRUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxBTkRJTkc6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHR9LFxuXHQnY2FtcGFpZ24tb3V0JzogZnVuY3Rpb24oc2NvcGUsIHRpbWVsaW5lKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB3aW5kb3dIID0gQXBwU3RvcmUuV2luZG93LmhcblxuXHRcdHN3aXRjaCh0eXBlcy5uZXdUeXBlKXtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkxBTkRJTkc6XG5cdFx0XHRcdHRpbWVsaW5lLmZyb21UbyhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OndpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6d2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5OT05FOlxuXHRcdFx0XHRicmVha1xuXHRcdH1cblx0XHR0aW1lbGluZS5wYXVzZSgwKVxuXHR9LFxuXG5cdC8vIExBTkRJTkcgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQnbGFuZGluZy1pbic6IGZ1bmN0aW9uKHNjb3BlLCB0aW1lbGluZSkge1xuXHRcdHZhciB3cmFwcGVyID0gc2NvcGUuY2hpbGRcblx0XHR2YXIgdHlwZXMgPSBBcHBTdG9yZS5nZXRUeXBlT2ZOZXdBbmRPbGRQYWdlKClcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMub2xkVHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5MQU5ESU5HOlxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuRVhQRVJJRU5DRTpcblx0XHRcdFx0dGltZWxpbmUuZnJvbVRvKHNjb3BlLnB4Q29udGFpbmVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8od3JhcHBlciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgeyB5OjAsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkNBTVBBSUdOOlxuXHRcdFx0XHR0aW1lbGluZS5mcm9tVG8oc2NvcGUucHhDb250YWluZXIsIDEsIHsgeTotd2luZG93SCA8PCAyLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIHsgeTowLCBlYXNlOkV4cG8uZWFzZUluT3V0IH0sIDApXG5cdFx0XHRcdHRpbWVsaW5lLmZyb21Ubyh3cmFwcGVyLCAxLCB7IHk6LXdpbmRvd0ggPDwgMiwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCB7IHk6MCwgZWFzZTpFeHBvLmVhc2VJbk91dCB9LCAwKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSBBcHBDb25zdGFudHMuTk9ORTpcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cdFx0dGltZWxpbmUucGF1c2UoMClcblx0fSxcblx0J2xhbmRpbmctb3V0JzogZnVuY3Rpb24oc2NvcGUsIHRpbWVsaW5lKSB7XG5cdFx0dmFyIHdyYXBwZXIgPSBzY29wZS5jaGlsZFxuXHRcdHZhciB0eXBlcyA9IEFwcFN0b3JlLmdldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKVxuXHRcdHZhciB3aW5kb3dXID0gQXBwU3RvcmUuV2luZG93Lndcblx0XHR2YXIgd2luZG93SCA9IEFwcFN0b3JlLldpbmRvdy5oXG5cblx0XHRzd2l0Y2godHlwZXMubmV3VHlwZSl7XG5cdFx0XHRjYXNlIEFwcENvbnN0YW50cy5FWFBFUklFTkNFOlxuXHRcdFx0XHR0aW1lbGluZS50byhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUudG8od3JhcHBlciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLkNBTVBBSUdOOlxuXHRcdFx0XHR0aW1lbGluZS50byhzY29wZS5weENvbnRhaW5lciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0dGltZWxpbmUudG8od3JhcHBlciwgMSwgeyB5Oi13aW5kb3dIIDw8IDIsIGVhc2U6RXhwby5lYXNlSW5PdXQgfSwgMClcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgQXBwQ29uc3RhbnRzLk5PTkU6XG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXHRcdHRpbWVsaW5lLnBhdXNlKDApXG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVHJhbnNpdGlvbkFuaW1hdGlvbnNcbiIsImltcG9ydCBBcHBEaXNwYXRjaGVyIGZyb20gJ0FwcERpc3BhdGNoZXInXG5pbXBvcnQgQXBwQ29uc3RhbnRzIGZyb20gJ0FwcENvbnN0YW50cydcbmltcG9ydCB7RXZlbnRFbWl0dGVyMn0gZnJvbSAnZXZlbnRlbWl0dGVyMidcbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbidcbmltcG9ydCBkYXRhIGZyb20gJ0dsb2JhbERhdGEnXG5pbXBvcnQgUm91dGVyIGZyb20gJ1JvdXRlcidcbmltcG9ydCBVdGlscyBmcm9tICdVdGlscydcblxuZnVuY3Rpb24gX2dldFBhZ2VDb250ZW50KCkge1xuICAgIHZhciBzY29wZSA9IF9nZXRQYWdlSWQoKVxuICAgIHZhciBsYW5nQ29udGVudCA9IF9nZXRDb250ZW50QnlMYW5nKEFwcFN0b3JlLmxhbmcoKSlcbiAgICB2YXIgcGFnZUNvbnRlbnQgPSBsYW5nQ29udGVudFtzY29wZV1cbiAgICByZXR1cm4gcGFnZUNvbnRlbnRcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlSWQoKSB7XG4gICAgcmV0dXJuIF9nZXRDb250ZW50U2NvcGUoKS5pZFxufVxuZnVuY3Rpb24gX2dldFR5cGVPZk5ld0FuZE9sZFBhZ2UoKSB7XG4gICAgdmFyIG5ld0hhc2hlciA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICB2YXIgb2xkSGFzaGVyID0gUm91dGVyLmdldE9sZEhhc2goKVxuICAgIHJldHVybiB7IG5ld1R5cGU6IF9nZXRUeXBlT2ZQYWdlKG5ld0hhc2hlciksIG9sZFR5cGU6IF9nZXRUeXBlT2ZQYWdlKG9sZEhhc2hlcikgfVxufVxuZnVuY3Rpb24gX2dldFR5cGVPZlBhZ2UoaGFzaCkge1xuICAgIHZhciBoID0gaGFzaCB8fCBSb3V0ZXIuZ2V0TmV3SGFzaCgpXG4gICAgaWYoaCA9PSB1bmRlZmluZWQpIHJldHVybiBBcHBDb25zdGFudHMuTk9ORVxuICAgIGlmKGgucGFydHMubGVuZ3RoID09IDMpIHJldHVybiBBcHBDb25zdGFudHMuQ0FNUEFJR05cbiAgICBlbHNlIGlmKGgucGFydHMubGVuZ3RoID09IDIpIHJldHVybiBBcHBDb25zdGFudHMuRVhQRVJJRU5DRVxuICAgIGVsc2UgcmV0dXJuIEFwcENvbnN0YW50cy5MQU5ESU5HXG59XG5mdW5jdGlvbiBfZ2V0Q29udGVudFNjb3BlKCkge1xuICAgIHZhciBoYXNoT2JqID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgIHZhciByb3V0ZVNjb3BlO1xuICAgIGlmKGhhc2hPYmoucGFydHMubGVuZ3RoID4gMikge1xuICAgICAgICB2YXIgcGFyZW50UGF0aCA9IGhhc2hPYmouaGFzaC5yZXBsYWNlKCcvJytoYXNoT2JqLnRhcmdldElkLCAnJylcbiAgICAgICAgcm91dGVTY29wZSA9IEFwcFN0b3JlLmdldFJvdXRlUGF0aFNjb3BlQnlJZChwYXJlbnRQYXRoKVxuICAgIH1lbHNle1xuICAgICAgICByb3V0ZVNjb3BlID0gQXBwU3RvcmUuZ2V0Um91dGVQYXRoU2NvcGVCeUlkKGhhc2hPYmouaGFzaClcbiAgICB9XG4gICAgcmV0dXJuIHJvdXRlU2NvcGVcbn1cbmZ1bmN0aW9uIF9nZXRQYWdlQXNzZXRzVG9Mb2FkKCkge1xuICAgIHZhciBzY29wZSA9IF9nZXRDb250ZW50U2NvcGUoKVxuICAgIHZhciBoYXNoT2JqID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgIHZhciB0YXJnZXRJZDtcbiAgICB2YXIgdHlwZSA9IF9nZXRUeXBlT2ZQYWdlKClcbiAgICB0YXJnZXRJZCA9IHR5cGUudG9Mb3dlckNhc2UoKSArICctYXNzZXRzJ1xuICAgIHZhciBtYW5pZmVzdCA9IF9hZGRCYXNlUGF0aHNUb1VybHMoc2NvcGVbdGFyZ2V0SWRdLCBzY29wZS5pZCwgdGFyZ2V0SWQsIHR5cGUpXG4gICAgcmV0dXJuIG1hbmlmZXN0XG59XG5mdW5jdGlvbiBfYWRkQmFzZVBhdGhzVG9VcmxzKHVybHMsIHBhZ2VJZCwgdGFyZ2V0SWQsIHR5cGUpIHtcbiAgICB2YXIgYmFzZVBhdGggPSBfZ2V0UGFnZUFzc2V0c0Jhc2VQYXRoQnlJZChwYWdlSWQsIHRhcmdldElkKVxuICAgIHZhciBtYW5pZmVzdCA9IFtdXG4gICAgaWYodXJscyA9PSB1bmRlZmluZWQgfHwgdXJscy5sZW5ndGggPCAxKSByZXR1cm4gbWFuaWZlc3RcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHVybHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNwbGl0dGVyID0gdXJsc1tpXS5zcGxpdCgnLicpXG4gICAgICAgIHZhciBmaWxlTmFtZSA9IHNwbGl0dGVyWzBdXG4gICAgICAgIHZhciBleHRlbnNpb24gPSBzcGxpdHRlclsxXVxuICAgICAgICBtYW5pZmVzdFtpXSA9IHtcbiAgICAgICAgICAgIGlkOiBwYWdlSWQgKyAnLScgKyB0eXBlLnRvTG93ZXJDYXNlKCkgKyAnLScgKyBmaWxlTmFtZSxcbiAgICAgICAgICAgIHNyYzogYmFzZVBhdGggKyBmaWxlTmFtZSArICcuJyArIGV4dGVuc2lvblxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYW5pZmVzdFxufVxuZnVuY3Rpb24gX2dldFBhZ2VBc3NldHNCYXNlUGF0aEJ5SWQoaWQsIGFzc2V0R3JvdXBJZCkge1xuICAgIHJldHVybiBBcHBTdG9yZS5iYXNlTWVkaWFQYXRoKCkgKyAnL2ltYWdlL3BsYW5ldHMvJyArIGlkICsgJy8nICsgYXNzZXRHcm91cElkICsgJy8nXG59XG5mdW5jdGlvbiBfZ2V0TWVudUNvbnRlbnQoKSB7XG4gICAgcmV0dXJuIGRhdGEubWVudVxufVxuZnVuY3Rpb24gX2dldENvbnRlbnRCeUxhbmcobGFuZykge1xuICAgIHJldHVybiBkYXRhLmxhbmdbbGFuZ11cbn1cbmZ1bmN0aW9uIF9nZXRHZW5lcmFsSW5mb3MoKSB7XG4gICAgcmV0dXJuIGRhdGEuaW5mb3MubGFuZ1tBcHBTdG9yZS5sYW5nKCldXG59XG5mdW5jdGlvbiBfZ2V0QXBwRGF0YSgpIHtcbiAgICByZXR1cm4gZGF0YVxufVxuZnVuY3Rpb24gX2dldERlZmF1bHRSb3V0ZSgpIHtcbiAgICByZXR1cm4gZGF0YVsnZGVmYXVsdC1yb3V0ZSddXG59XG5mdW5jdGlvbiBfZ2V0R2xvYmFsQ29udGVudCgpIHtcbiAgICB2YXIgbGFuZ0NvbnRlbnQgPSBfZ2V0Q29udGVudEJ5TGFuZyhBcHBTdG9yZS5sYW5nKCkpXG4gICAgcmV0dXJuIGxhbmdDb250ZW50WydnbG9iYWwnXVxufVxuZnVuY3Rpb24gX3dpbmRvd1dpZHRoSGVpZ2h0KCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHc6IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICBoOiB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICB9XG59XG52YXIgQXBwU3RvcmUgPSBhc3NpZ24oe30sIEV2ZW50RW1pdHRlcjIucHJvdG90eXBlLCB7XG4gICAgZW1pdENoYW5nZTogZnVuY3Rpb24odHlwZSwgaXRlbSkge1xuICAgICAgICB0aGlzLmVtaXQodHlwZSwgaXRlbSlcbiAgICB9LFxuICAgIHBhZ2VDb250ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRQYWdlQ29udGVudCgpXG4gICAgfSxcbiAgICBtZW51Q29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0TWVudUNvbnRlbnQoKVxuICAgIH0sXG4gICAgY291bnRyaWVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuY291bnRyaWVzXG4gICAgfSxcbiAgICBhcHBEYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRBcHBEYXRhKClcbiAgICB9LFxuICAgIGxhbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gSlNfbGFuZ1xuICAgIH0sXG4gICAgZGVmYXVsdFJvdXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXREZWZhdWx0Um91dGUoKVxuICAgIH0sXG4gICAgZ2xvYmFsQ29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0R2xvYmFsQ29udGVudCgpXG4gICAgfSxcbiAgICBnZW5lcmFsSW5mb3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGF0YS5pbmZvc1xuICAgIH0sXG4gICAgZ2VuZXJhbEluZm9zTGFuZ1Njb3BlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRHZW5lcmFsSW5mb3MoKVxuICAgIH0sXG4gICAgZ2V0RW1wdHlJbWdVcmw6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuZ2V0RW52aXJvbm1lbnQoKS5zdGF0aWMgKyAnL2ltYWdlL2VtcHR5LnBuZydcbiAgICB9LFxuICAgIG1haW5JbWFnZVVybDogZnVuY3Rpb24oaWQsIHJlc3BvbnNpdmVBcnJheSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuYmFzZU1lZGlhUGF0aCgpICsgJy9pbWFnZS9wbGFuZXRzLycgKyBpZCArICcvbWFpbi0nICsgQXBwU3RvcmUucmVzcG9uc2l2ZUltYWdlV2lkdGgocmVzcG9uc2l2ZUFycmF5KSArICcuanBnJ1xuICAgIH0sXG4gICAgYmFzZU1lZGlhUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5nZXRFbnZpcm9ubWVudCgpLnN0YXRpY1xuICAgIH0sXG4gICAgZ2V0Um91dGVQYXRoU2NvcGVCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gZGF0YS5yb3V0aW5nW2lkXVxuICAgIH0sXG4gICAgZ2V0UGFnZUlkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRQYWdlSWQoKVxuICAgIH0sXG4gICAgZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0VHlwZU9mTmV3QW5kT2xkUGFnZSgpXG4gICAgfSxcbiAgICBnZXRUeXBlT2ZQYWdlOiBmdW5jdGlvbihoYXNoKSB7XG4gICAgICAgIHJldHVybiBfZ2V0VHlwZU9mUGFnZShoYXNoKVxuICAgIH0sXG4gICAgZ2V0RW52aXJvbm1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXBwQ29uc3RhbnRzLkVOVklST05NRU5UU1tFTlZdXG4gICAgfSxcbiAgICBnZXRMaW5lV2lkdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gM1xuICAgIH0sXG4gICAgcGFnZUFzc2V0c1RvTG9hZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfZ2V0UGFnZUFzc2V0c1RvTG9hZCgpXG4gICAgfSxcbiAgICBnZXRFeHBlcmllbmNlQW5pbWF0aW9uRGlyZWN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG5ld0hhc2hlciA9IFJvdXRlci5nZXROZXdIYXNoKClcbiAgICAgICAgdmFyIG9sZEhhc2hlciA9IFJvdXRlci5nZXRPbGRIYXNoKClcbiAgICAgICAgaWYob2xkSGFzaGVyID09IHVuZGVmaW5lZCkgcmV0dXJuIEFwcENvbnN0YW50cy5SSUdIVFxuICAgICAgICB2YXIgbmV3SWQgPSBuZXdIYXNoZXIudGFyZ2V0SWRcbiAgICAgICAgdmFyIG9sZElkID0gb2xkSGFzaGVyLnRhcmdldElkXG4gICAgICAgIHZhciBuZXdJbmRleCwgb2xkSW5kZXg7XG4gICAgICAgIHZhciBwbGFuZXRzID0gQXBwU3RvcmUucGxhbmV0cygpXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGxhbmV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBsYW5ldCA9IHBsYW5ldHNbaV1cbiAgICAgICAgICAgIGlmKHBsYW5ldCA9PSBuZXdJZCkgbmV3SW5kZXggPSBpXG4gICAgICAgICAgICBpZihwbGFuZXQgPT0gb2xkSWQpIG9sZEluZGV4ID0gaVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAobmV3SW5kZXggPiBvbGRJbmRleCkgPyBBcHBDb25zdGFudHMuUklHSFQgOiAgQXBwQ29uc3RhbnRzLkxFRlRcbiAgICB9LFxuICAgIHJlc3BvbnNpdmVJbWFnZVdpZHRoOiBmdW5jdGlvbihyZXNwb25zaXZlQXJyYXkpIHtcbiAgICAgICAgdmFyIHdpbmRvd1cgPSBBcHBTdG9yZS5XaW5kb3cud1xuICAgICAgICByZXR1cm4gVXRpbHMuQ2xvc2VzdChyZXNwb25zaXZlQXJyYXksIHdpbmRvd1cpXG4gICAgfSxcbiAgICByZXNwb25zaXZlSW1hZ2VTaXplOiBmdW5jdGlvbihyZXNwb25zaXZlQXJyYXksIGJhc2VXaWR0aCwgYmFzZUhlaWdodCkge1xuICAgICAgICB2YXIgYmFzZVcgPSBiYXNlV2lkdGggfHwgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9XXG4gICAgICAgIHZhciBiYXNlSCA9IGJhc2VIZWlnaHQgfHwgQXBwQ29uc3RhbnRzLk1FRElBX0dMT0JBTF9IXG4gICAgICAgIHZhciByZXNwb25zaXZlV2lkdGggPSBBcHBTdG9yZS5yZXNwb25zaXZlSW1hZ2VXaWR0aChyZXNwb25zaXZlQXJyYXkpXG4gICAgICAgIHZhciBzY2FsZSA9IChyZXNwb25zaXZlV2lkdGggLyBiYXNlVykgKiAxXG4gICAgICAgIHZhciByZXNwb25zaXZlSGVpZ2h0ID0gYmFzZUggKiBzY2FsZVxuICAgICAgICByZXR1cm4gWyByZXNwb25zaXZlV2lkdGgsIHJlc3BvbnNpdmVIZWlnaHQgXVxuICAgIH0sXG4gICAgcGxhbmV0czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhLnBsYW5ldHNcbiAgICB9LFxuICAgIGVsZW1lbnRzT2ZOYXR1cmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGF0YS5lbGVtZW50c1xuICAgIH0sXG4gICAgYWxsR2VuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEuZ2VuZGVyXG4gICAgfSxcbiAgICBwcm9kdWN0c0RhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGF0YVsncHJvZHVjdHMtZGF0YSddXG4gICAgfSxcbiAgICBwcm9kdWN0c0RhdGFCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgZGF0YSA9IEFwcFN0b3JlLnByb2R1Y3RzRGF0YSgpXG4gICAgICAgIHJldHVybiBkYXRhW2lkXVxuICAgIH0sXG4gICAgcGFsZXR0ZUNvbG9yc0J5SWQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiBkYXRhWydjb2xvcnMnXVtpZF1cbiAgICB9LFxuICAgIGdldFNwZWNpZmljUHJvZHVjdEJ5SWQ6IGZ1bmN0aW9uKHBsYW5ldElkLCBwcm9kdWN0SWQpIHtcbiAgICAgICAgdmFyIHBsYW5ldFByb2R1Y3RzID0gQXBwU3RvcmUucHJvZHVjdHNEYXRhQnlJZChwbGFuZXRJZClcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwbGFuZXRQcm9kdWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYocHJvZHVjdElkID09IHBsYW5ldFByb2R1Y3RzW2ldLmlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBsYW5ldFByb2R1Y3RzW2ldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFdpbmRvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfd2luZG93V2lkdGhIZWlnaHQoKVxuICAgIH0sXG4gICAgYWRkUFhDaGlsZDogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBBcHBTdG9yZS5QWENvbnRhaW5lci5hZGQoaXRlbS5jaGlsZClcbiAgICB9LFxuICAgIHJlbW92ZVBYQ2hpbGQ6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgQXBwU3RvcmUuUFhDb250YWluZXIucmVtb3ZlKGl0ZW0uY2hpbGQpXG4gICAgfSxcbiAgICBnZXRUaW1lbGluZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldFRpbWVsaW5lKClcbiAgICB9LFxuICAgIHJlbGVhc2VUaW1lbGluZTogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gQXBwU3RvcmUuUG9vbC5yZWxlYXNlVGltZWxpbmUoaXRlbSlcbiAgICB9LFxuICAgIGdldENvbnRhaW5lcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLmdldENvbnRhaW5lcigpXG4gICAgfSxcbiAgICByZWxlYXNlQ29udGFpbmVyOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VDb250YWluZXIoaXRlbSlcbiAgICB9LFxuICAgIGdldEdyYXBoaWNzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wuZ2V0R3JhcGhpY3MoKVxuICAgIH0sXG4gICAgcmVsZWFzZUdyYXBoaWNzOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBBcHBTdG9yZS5Qb29sLnJlbGVhc2VHcmFwaGljcyhpdGVtKVxuICAgIH0sXG4gICAgZ2V0U3ByaXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wuZ2V0U3ByaXRlKClcbiAgICB9LFxuICAgIHJlbGVhc2VTcHJpdGU6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVNwcml0ZShpdGVtKVxuICAgIH0sXG4gICAgZ2V0U3ByaW5nR2FyZGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wuZ2V0U3ByaW5nR2FyZGVuKClcbiAgICB9LFxuICAgIHJlbGVhc2VTcHJpbmdHYXJkZW46IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIEFwcFN0b3JlLlBvb2wucmVsZWFzZVNwcmluZ0dhcmRlbihpdGVtKVxuICAgIH0sXG4gICAgRGV0ZWN0b3I6IHtcbiAgICAgICAgaXNNb2JpbGU6IHVuZGVmaW5lZFxuICAgIH0sXG4gICAgUG9vbDogdW5kZWZpbmVkLFxuICAgIFByZWxvYWRlcjogdW5kZWZpbmVkLFxuICAgIE1vdXNlOiB1bmRlZmluZWQsXG4gICAgUFhDb250YWluZXI6IHVuZGVmaW5lZCxcbiAgICBPcmllbnRhdGlvbjogQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSxcbiAgICBkaXNwYXRjaGVySW5kZXg6IEFwcERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCl7XG4gICAgICAgIHZhciBhY3Rpb24gPSBwYXlsb2FkLmFjdGlvblxuICAgICAgICBzd2l0Y2goYWN0aW9uLmFjdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0NIQU5HRUQ6XG5cbiAgICAgICAgICAgICAgICAvLyBUcnkgdG8gY2F0Y2ggdGhlIGludGVybmFsIGhhc2ggY2hhbmdlIGZvciB0aGUgMyBwYXJ0cyBwYWdlcyBleC4gL3BsYW5ldC93b29kLzBcbiAgICAgICAgICAgICAgICB2YXIgbmV3SGFzaGVyID0gUm91dGVyLmdldE5ld0hhc2goKVxuICAgICAgICAgICAgICAgIHZhciBvbGRIYXNoZXIgPSBSb3V0ZXIuZ2V0T2xkSGFzaCgpXG4gICAgICAgICAgICAgICAgdmFyIGFjdGlvblR5cGUgPSBBcHBDb25zdGFudHMuUEFHRV9IQVNIRVJfQ0hBTkdFRFxuICAgICAgICAgICAgICAgIGlmKG9sZEhhc2hlciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobmV3SGFzaGVyLnBhcnRzLmxlbmd0aCA9PSAzICYmIG9sZEhhc2hlci5wYXJ0cy5sZW5ndGggPT0gMyAmJiBuZXdIYXNoZXIucGFydHNbMV0gPT0gb2xkSGFzaGVyLnBhcnRzWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25UeXBlID0gQXBwQ29uc3RhbnRzLlBBR0VfSEFTSEVSX0lOVEVSTkFMX0NIQU5HRVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlIEFwcENvbnN0YW50cy5XSU5ET1dfUkVTSVpFOlxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy53ID0gYWN0aW9uLml0ZW0ud2luZG93V1xuICAgICAgICAgICAgICAgIEFwcFN0b3JlLldpbmRvdy5oID0gYWN0aW9uLml0ZW0ud2luZG93SFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLk9yaWVudGF0aW9uID0gKEFwcFN0b3JlLldpbmRvdy53ID4gQXBwU3RvcmUuV2luZG93LmgpID8gQXBwQ29uc3RhbnRzLkxBTkRTQ0FQRSA6IEFwcENvbnN0YW50cy5QT1JUUkFJVFxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9JU19SRUFEWTpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5QWENvbnRhaW5lciA9IGFjdGlvbi5pdGVtXG4gICAgICAgICAgICAgICAgQXBwU3RvcmUuZW1pdENoYW5nZShhY3Rpb24uYWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSBBcHBDb25zdGFudHMuUFhfQ09OVEFJTkVSX0FERF9DSElMRDpcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5hZGRQWENoaWxkKGFjdGlvbi5pdGVtKVxuICAgICAgICAgICAgICAgIEFwcFN0b3JlLmVtaXRDaGFuZ2UoYWN0aW9uLmFjdGlvblR5cGUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgQXBwQ29uc3RhbnRzLlBYX0NPTlRBSU5FUl9SRU1PVkVfQ0hJTEQ6XG4gICAgICAgICAgICAgICAgQXBwU3RvcmUucmVtb3ZlUFhDaGlsZChhY3Rpb24uaXRlbSlcbiAgICAgICAgICAgICAgICBBcHBTdG9yZS5lbWl0Q2hhbmdlKGFjdGlvbi5hY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH0pXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IEFwcFN0b3JlXG5cbiIsImltcG9ydCBpcyBmcm9tICdpcyc7XG5cbmZ1bmN0aW9uIGdldEFsbE1ldGhvZHMob2JqKSB7XG5cdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopXG5cdFx0LmZpbHRlcihrZXkgPT4gaXMuZm4ob2JqW2tleV0pKVxufVxuXG5mdW5jdGlvbiBhdXRvQmluZChvYmopIHtcblx0Ly8gY29uc29sZS5sb2coJ29iaiAtLS0tLScsIG9iailcbiAgXHRnZXRBbGxNZXRob2RzKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG5cdFx0LmZvckVhY2gobXRkID0+IHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKG10ZClcblx0XHRcdG9ialttdGRdID0gb2JqW210ZF0uYmluZChvYmopO1xuXHRcdH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGF1dG9CaW5kOyIsImltcG9ydCBBcHBDb25zdGFudHMgZnJvbSAnQXBwQ29uc3RhbnRzJ1xuXG5jbGFzcyBVdGlscyB7XG5cdHN0YXRpYyBOb3JtYWxpemVNb3VzZUNvb3JkcyhlLCBvYmpXcmFwcGVyKSB7XG5cdFx0dmFyIHBvc3ggPSAwO1xuXHRcdHZhciBwb3N5ID0gMDtcblx0XHRpZiAoIWUpIHZhciBlID0gd2luZG93LmV2ZW50O1xuXHRcdGlmIChlLnBhZ2VYIHx8IGUucGFnZVkpIFx0e1xuXHRcdFx0cG9zeCA9IGUucGFnZVg7XG5cdFx0XHRwb3N5ID0gZS5wYWdlWTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoZS5jbGllbnRYIHx8IGUuY2xpZW50WSkgXHR7XG5cdFx0XHRwb3N4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0XG5cdFx0XHRcdCsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XG5cdFx0XHRwb3N5ID0gZS5jbGllbnRZICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3Bcblx0XHRcdFx0KyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuXHRcdH1cblx0XHRvYmpXcmFwcGVyLnggPSBwb3N4XG5cdFx0b2JqV3JhcHBlci55ID0gcG9zeVxuXHRcdHJldHVybiBvYmpXcmFwcGVyXG5cdH1cblx0c3RhdGljIFJlc2l6ZVBvc2l0aW9uUHJvcG9ydGlvbmFsbHkod2luZG93Vywgd2luZG93SCwgY29udGVudFcsIGNvbnRlbnRILCBvcmllbnRhdGlvbikge1xuXHRcdHZhciBhc3BlY3RSYXRpbyA9IGNvbnRlbnRXIC8gY29udGVudEhcblxuXHRcdGlmKG9yaWVudGF0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmKG9yaWVudGF0aW9uID09IEFwcENvbnN0YW50cy5MQU5EU0NBUEUpIHtcblx0XHRcdFx0dmFyIHNjYWxlID0gKHdpbmRvd1cgLyBjb250ZW50VykgKiAxXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dmFyIHNjYWxlID0gKHdpbmRvd0ggLyBjb250ZW50SCkgKiAxXG5cdFx0XHR9XG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgc2NhbGUgPSAoKHdpbmRvd1cgLyB3aW5kb3dIKSA8IGFzcGVjdFJhdGlvKSA/ICh3aW5kb3dIIC8gY29udGVudEgpICogMSA6ICh3aW5kb3dXIC8gY29udGVudFcpICogMVxuXHRcdH1cblxuXHRcdHZhciBuZXdXID0gY29udGVudFcgKiBzY2FsZVxuXHRcdHZhciBuZXdIID0gY29udGVudEggKiBzY2FsZVxuXHRcdHZhciBjc3MgPSB7XG5cdFx0XHR3aWR0aDogbmV3Vyxcblx0XHRcdGhlaWdodDogbmV3SCxcblx0XHRcdGxlZnQ6ICh3aW5kb3dXID4+IDEpIC0gKG5ld1cgPj4gMSksXG5cdFx0XHR0b3A6ICh3aW5kb3dIID4+IDEpIC0gKG5ld0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSZXNpemVQb3NpdGlvblByb3BvcnRpb25hbGx5V2l0aEFuY2hvckNlbnRlcih3aW5kb3dXLCB3aW5kb3dILCBjb250ZW50VywgY29udGVudEgpIHtcblx0XHR2YXIgYXNwZWN0UmF0aW8gPSBjb250ZW50VyAvIGNvbnRlbnRIXG5cdFx0dmFyIHNjYWxlID0gKCh3aW5kb3dXIC8gd2luZG93SCkgPCBhc3BlY3RSYXRpbykgPyAod2luZG93SCAvIGNvbnRlbnRIKSAqIDEgOiAod2luZG93VyAvIGNvbnRlbnRXKSAqIDFcblx0XHR2YXIgbmV3VyA9IGNvbnRlbnRXICogc2NhbGVcblx0XHR2YXIgbmV3SCA9IGNvbnRlbnRIICogc2NhbGVcblx0XHR2YXIgY3NzID0ge1xuXHRcdFx0d2lkdGg6IG5ld1csXG5cdFx0XHRoZWlnaHQ6IG5ld0gsXG5cdFx0XHRsZWZ0OiAod2luZG93VyA+PiAxKSxcblx0XHRcdHRvcDogKHdpbmRvd0ggPj4gMSksXG5cdFx0XHRzY2FsZTogc2NhbGVcblx0XHR9XG5cdFx0cmV0dXJuIGNzc1xuXHR9XG5cdHN0YXRpYyBSYW5kKG1pbiwgbWF4KSB7XG5cdFx0cmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pblxuXHR9XG5cdHN0YXRpYyBEZWdyZWVzVG9SYWRpYW5zKGRlZ3JlZXMpIHtcblx0XHRyZXR1cm4gZGVncmVlcyAqIChNYXRoLlBJIC8gMTgwKVxuXHR9XG4gICAgc3RhdGljIFJhZGlhbnNUb0RlZ3JlZXMocmFkaWFucykge1xuICAgICAgICByZXR1cm4gcmFkaWFucyAqICgxODAgLyBNYXRoLlBJKVxuICAgIH1cbiAgICBzdGF0aWMgTGltaXQodiwgbWluLCBtYXgpIHtcbiAgICBcdHJldHVybiAoTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHYpKSk7XG4gICAgfVxuXHRzdGF0aWMgQ2xvc2VzdChhcnJheSwgbnVtKSB7XG4gICAgICAgIHZhciBpPTA7XG5cdCAgICB2YXIgbWluRGlmZj0yMDAwO1xuXHQgICAgdmFyIGFucztcblx0ICAgIGZvcihpIGluIGFycmF5KXtcblx0XHRcdHZhciBtPU1hdGguYWJzKG51bS1hcnJheVtpXSk7XG5cdFx0XHRpZihtPG1pbkRpZmYpeyBcblx0XHRcdFx0bWluRGlmZj1tOyBcblx0XHRcdFx0YW5zPWFycmF5W2ldOyBcblx0XHRcdH1cblx0XHR9XG5cdCAgICByZXR1cm4gYW5zO1xuICAgIH1cbiAgICBzdGF0aWMgU3ByaW5nVG8oaXRlbSwgdG9YLCB0b1ksIGluZGV4LCBzcHJpbmcsIGZyaWN0aW9uLCBzcHJpbmdMZW5ndGgpIHtcbiAgICBcdHZhciBkeCA9IHRvWCAtIGl0ZW0ueFxuICAgIFx0dmFyIGR5ID0gdG9ZIC0gaXRlbS55XG5cdFx0dmFyIGFuZ2xlID0gTWF0aC5hdGFuMihkeSwgZHgpXG5cdFx0dmFyIHRhcmdldFggPSB0b1ggLSBNYXRoLmNvcyhhbmdsZSkgKiAoc3ByaW5nTGVuZ3RoICogaW5kZXgpXG5cdFx0dmFyIHRhcmdldFkgPSB0b1kgLSBNYXRoLnNpbihhbmdsZSkgKiAoc3ByaW5nTGVuZ3RoICogaW5kZXgpXG5cdFx0aXRlbS52eCArPSAodGFyZ2V0WCAtIGl0ZW0ueCkgKiBzcHJpbmdcblx0XHRpdGVtLnZ5ICs9ICh0YXJnZXRZIC0gaXRlbS55KSAqIHNwcmluZ1xuXHRcdGl0ZW0udnggKj0gZnJpY3Rpb25cblx0XHRpdGVtLnZ5ICo9IGZyaWN0aW9uXG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBVdGlsc1xuIiwiY2xhc3MgVmVjMiB7XG5cdGNvbnN0cnVjdG9yKHgsIHkpIHtcblx0XHR0aGlzLnggPSB4XG5cdFx0dGhpcy55ID0geVxuXHR9XG5cdGRpc3RhbmNlVG8odikge1xuXHRcdHJldHVybiBNYXRoLnNxcnQoIHRoaXMuZGlzdGFuY2VUb1NxdWFyZWQoIHYgKSApXG5cdH1cblx0ZGlzdGFuY2VUb1NxdWFyZWQodikge1xuXHRcdHZhciBkeCA9IHRoaXMueCAtIHYueCwgZHkgPSB0aGlzLnkgLSB2Lnk7XG5cdFx0cmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFZlYzJcbiIsIi8vIGh0dHA6Ly9wYXVsaXJpc2guY29tLzIwMTEvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1hbmltYXRpbmcvXG4vLyBodHRwOi8vbXkub3BlcmEuY29tL2Vtb2xsZXIvYmxvZy8yMDExLzEyLzIwL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtZXItYW5pbWF0aW5nXG4gXG4vLyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyLiBmaXhlcyBmcm9tIFBhdWwgSXJpc2ggYW5kIFRpbm8gWmlqZGVsXG4gXG4vLyBNSVQgbGljZW5zZVxuIFxuKGZ1bmN0aW9uKCkge1xuICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgdmFyIHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xuICAgIGZvcih2YXIgeCA9IDA7IHggPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKyt4KSB7XG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSsnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdKydDYW5jZWxBbmltYXRpb25GcmFtZSddIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3dbdmVuZG9yc1t4XSsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgfVxuIFxuICAgIGlmICghd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSlcbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBlbGVtZW50KSB7XG4gICAgICAgICAgICB2YXIgY3VyclRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIHZhciB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpO1xuICAgICAgICAgICAgdmFyIGlkID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGN1cnJUaW1lICsgdGltZVRvQ2FsbCk7IH0sIFxuICAgICAgICAgICAgICB0aW1lVG9DYWxsKTtcbiAgICAgICAgICAgIGxhc3RUaW1lID0gY3VyclRpbWUgKyB0aW1lVG9DYWxsO1xuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9O1xuIFxuICAgIGlmICghd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcbiAgICAgICAgfTtcbn0oKSk7IiwiaW1wb3J0IEZsdXggZnJvbSAnZmx1eCdcbmltcG9ydCB7RXZlbnRFbWl0dGVyMn0gZnJvbSAnZXZlbnRlbWl0dGVyMidcbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbidcblxuLy8gQWN0aW9uc1xudmFyIFBhZ2VyQWN0aW9ucyA9IHtcbiAgICBvblBhZ2VSZWFkeTogZnVuY3Rpb24oaGFzaCkge1xuICAgICAgICBQYWdlckRpc3BhdGNoZXIuaGFuZGxlUGFnZXJBY3Rpb24oe1xuICAgICAgICBcdHR5cGU6IFBhZ2VyQ29uc3RhbnRzLlBBR0VfSVNfUkVBRFksXG4gICAgICAgIFx0aXRlbTogaGFzaFxuICAgICAgICB9KSAgXG4gICAgfSxcbiAgICBvblRyYW5zaXRpb25PdXRDb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgXHRQYWdlckRpc3BhdGNoZXIuaGFuZGxlUGFnZXJBY3Rpb24oe1xuICAgICAgICBcdHR5cGU6IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9PVVRfQ09NUExFVEUsXG4gICAgICAgIFx0aXRlbTogdW5kZWZpbmVkXG4gICAgICAgIH0pICBcbiAgICB9LFxuICAgIHBhZ2VUcmFuc2l0aW9uRGlkRmluaXNoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgUGFnZXJEaXNwYXRjaGVyLmhhbmRsZVBhZ2VyQWN0aW9uKHtcbiAgICAgICAgXHR0eXBlOiBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fRElEX0ZJTklTSCxcbiAgICAgICAgXHRpdGVtOiB1bmRlZmluZWRcbiAgICAgICAgfSkgIFxuICAgIH1cbn1cblxuLy8gQ29uc3RhbnRzXG52YXIgUGFnZXJDb25zdGFudHMgPSB7XG5cdFBBR0VfSVNfUkVBRFk6ICdQQUdFX0lTX1JFQURZJyxcblx0UEFHRV9UUkFOU0lUSU9OX0lOOiAnUEFHRV9UUkFOU0lUSU9OX0lOJyxcblx0UEFHRV9UUkFOU0lUSU9OX09VVDogJ1BBR0VfVFJBTlNJVElPTl9PVVQnLFxuXHRQQUdFX1RSQU5TSVRJT05fT1VUX0NPTVBMRVRFOiAnUEFHRV9UUkFOU0lUSU9OX09VVF9DT01QTEVURScsXG5cdFBBR0VfVFJBTlNJVElPTl9JTl9QUk9HUkVTUzogJ1BBR0VfVFJBTlNJVElPTl9JTl9QUk9HUkVTUycsXG5cdFBBR0VfVFJBTlNJVElPTl9ESURfRklOSVNIOiAnUEFHRV9UUkFOU0lUSU9OX0RJRF9GSU5JU0gnLFxufVxuXG4vLyBEaXNwYXRjaGVyXG52YXIgUGFnZXJEaXNwYXRjaGVyID0gYXNzaWduKG5ldyBGbHV4LkRpc3BhdGNoZXIoKSwge1xuXHRoYW5kbGVQYWdlckFjdGlvbjogZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0dGhpcy5kaXNwYXRjaChhY3Rpb24pXG5cdH1cbn0pXG5cbi8vIFN0b3JlXG52YXIgUGFnZXJTdG9yZSA9IGFzc2lnbih7fSwgRXZlbnRFbWl0dGVyMi5wcm90b3R5cGUsIHtcbiAgICBmaXJzdFBhZ2VUcmFuc2l0aW9uOiB0cnVlLFxuICAgIHBhZ2VUcmFuc2l0aW9uU3RhdGU6IHVuZGVmaW5lZCwgXG4gICAgZGlzcGF0Y2hlckluZGV4OiBQYWdlckRpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCl7XG4gICAgICAgIHZhciBhY3Rpb25UeXBlID0gcGF5bG9hZC50eXBlXG4gICAgICAgIHZhciBpdGVtID0gcGF5bG9hZC5pdGVtXG4gICAgICAgIHN3aXRjaChhY3Rpb25UeXBlKSB7XG4gICAgICAgICAgICBjYXNlIFBhZ2VyQ29uc3RhbnRzLlBBR0VfSVNfUkVBRFk6XG4gICAgICAgICAgICBcdFBhZ2VyU3RvcmUucGFnZVRyYW5zaXRpb25TdGF0ZSA9IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9JTl9QUk9HUkVTU1xuICAgICAgICAgICAgXHR2YXIgdHlwZSA9IFBhZ2VyU3RvcmUuZmlyc3RQYWdlVHJhbnNpdGlvbiA/IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9JTiA6IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9PVVRcbiAgICAgICAgICAgIFx0UGFnZXJTdG9yZS5lbWl0KHR5cGUpXG4gICAgICAgICAgICBcdGJyZWFrXG4gICAgICAgICAgICBjYXNlIFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9PVVRfQ09NUExFVEU6XG4gICAgICAgICAgICBcdHZhciB0eXBlID0gUGFnZXJDb25zdGFudHMuUEFHRV9UUkFOU0lUSU9OX0lOXG4gICAgICAgICAgICBcdFBhZ2VyU3RvcmUuZW1pdCh0eXBlKVxuICAgICAgICAgICAgXHRicmVha1xuICAgICAgICAgICAgY2FzZSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fRElEX0ZJTklTSDpcbiAgICAgICAgICAgIFx0aWYgKFBhZ2VyU3RvcmUuZmlyc3RQYWdlVHJhbnNpdGlvbikgUGFnZXJTdG9yZS5maXJzdFBhZ2VUcmFuc2l0aW9uID0gZmFsc2VcbiAgICAgICAgICAgICAgICBQYWdlclN0b3JlLnBhZ2VUcmFuc2l0aW9uU3RhdGUgPSBQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fRElEX0ZJTklTSFxuICAgICAgICAgICAgICAgIFBhZ2VyU3RvcmUuZW1pdChhY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICB9KVxufSlcblxuZXhwb3J0IGRlZmF1bHQge1xuXHRQYWdlclN0b3JlOiBQYWdlclN0b3JlLFxuXHRQYWdlckFjdGlvbnM6IFBhZ2VyQWN0aW9ucyxcblx0UGFnZXJDb25zdGFudHM6IFBhZ2VyQ29uc3RhbnRzLFxuXHRQYWdlckRpc3BhdGNoZXI6IFBhZ2VyRGlzcGF0Y2hlclxufVxuIiwiaW1wb3J0IGF1dG9iaW5kIGZyb20gJ0F1dG9iaW5kJ1xuaW1wb3J0IHNsdWcgZnJvbSAndG8tc2x1Zy1jYXNlJ1xuXG5jbGFzcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0YXV0b2JpbmQodGhpcylcblx0XHR0aGlzLmRvbUlzUmVhZHkgPSBmYWxzZVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0fVxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmRvbUlzUmVhZHkgPSB0cnVlXG5cdH1cblx0cmVuZGVyKGNoaWxkSWQsIHBhcmVudElkLCB0ZW1wbGF0ZSwgb2JqZWN0KSB7XG5cdFx0dGhpcy5jb21wb25lbnRXaWxsTW91bnQoKVxuXHRcdHRoaXMuY2hpbGRJZCA9IGNoaWxkSWRcblx0XHR0aGlzLnBhcmVudElkID0gcGFyZW50SWRcblx0XHR0aGlzLnBhcmVudCA9IChwYXJlbnRJZCBpbnN0YW5jZW9mIGpRdWVyeSkgPyBwYXJlbnRJZCA6ICQodGhpcy5wYXJlbnRJZClcblx0XHR0aGlzLmNoaWxkID0gKHRlbXBsYXRlID09IHVuZGVmaW5lZCkgPyAkKCc8ZGl2PjwvZGl2PicpIDogJCh0ZW1wbGF0ZShvYmplY3QpKVxuXHRcdGlmKHRoaXMuY2hpbGQuYXR0cignaWQnKSA9PSB1bmRlZmluZWQpIHRoaXMuY2hpbGQuYXR0cignaWQnLCBzbHVnKGNoaWxkSWQpKVxuXHRcdHRoaXMuY2hpbGQucmVhZHkodGhpcy5jb21wb25lbnREaWRNb3VudClcblx0XHR0aGlzLnBhcmVudC5hcHBlbmQodGhpcy5jaGlsZClcblx0fVxuXHRyZW1vdmUoKSB7XG5cdFx0dGhpcy5jb21wb25lbnRXaWxsVW5tb3VudCgpXG5cdFx0dGhpcy5jaGlsZC5yZW1vdmUoKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEJhc2VDb21wb25lbnRcblxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCBUcmFuc2l0aW9uQW5pbWF0aW9ucyBmcm9tICdUcmFuc2l0aW9uQW5pbWF0aW9ucydcbmltcG9ydCBBcHBTdG9yZSBmcm9tICdBcHBTdG9yZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZVBhZ2UgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcigpXG5cdFx0dGhpcy5wcm9wcyA9IHByb3BzXG5cdFx0dGhpcy5kaWRUcmFuc2l0aW9uSW5Db21wbGV0ZSA9IHRoaXMuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUuYmluZCh0aGlzKVxuXHRcdHRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlID0gdGhpcy5kaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUuYmluZCh0aGlzKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuY2hpbGQuYWRkQ2xhc3ModGhpcy5wcm9wcy50eXBlLnRvTG93ZXJDYXNlKCkpXG5cdFx0dGhpcy5yZXNpemUoKVxuXHRcdHRoaXMuc2V0dXBBbmltYXRpb25zKClcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucHJvcHMuaXNSZWFkeSh0aGlzLnByb3BzLmhhc2gpLCAwKVxuXHR9XG5cdHNldHVwQW5pbWF0aW9ucygpIHtcblx0XHR2YXIga2V5TmFtZSA9IHRoaXMucHJvcHMudHlwZS50b0xvd2VyQ2FzZSgpICsgJy1pbidcblx0XHQvLyB0aGlzLnRsSW4gPSBBcHBTdG9yZS5nZXRUaW1lbGluZSgpXG5cdFx0dGhpcy50bEluID0gbmV3IFRpbWVsaW5lTWF4KClcblx0XHR0aGlzLnRsSW4uZXZlbnRDYWxsYmFjaygnb25Db21wbGV0ZScsIHRoaXMuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUpXG5cdFx0VHJhbnNpdGlvbkFuaW1hdGlvbnNba2V5TmFtZV0odGhpcywgdGhpcy50bEluKVxuXHRcdHRoaXMudGxJbi5wYXVzZSgwKVxuXHR9XG5cdHdpbGxUcmFuc2l0aW9uSW4oKSB7XG5cdFx0dGhpcy50bEluLnBsYXkoMClcblx0fVxuXHR3aWxsVHJhbnNpdGlvbk91dCgpIHtcblx0XHR2YXIga2V5TmFtZSA9IHRoaXMucHJvcHMudHlwZS50b0xvd2VyQ2FzZSgpICsgJy1vdXQnXG5cdFx0Ly8gdGhpcy50bE91dCA9IEFwcFN0b3JlLmdldFRpbWVsaW5lKClcblx0XHR0aGlzLnRsT3V0ID0gbmV3IFRpbWVsaW5lTWF4KClcblx0XHR0aGlzLnRsT3V0LmV2ZW50Q2FsbGJhY2soJ29uQ29tcGxldGUnLCB0aGlzLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSlcblx0XHRUcmFuc2l0aW9uQW5pbWF0aW9uc1trZXlOYW1lXSh0aGlzLCB0aGlzLnRsT3V0KVxuXHRcdHRoaXMudGxPdXQucGxheSgwKVxuXHR9XG5cdGRpZFRyYW5zaXRpb25JbkNvbXBsZXRlKCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdkaWRUcmFuc2l0aW9uSW5Db21wbGV0ZScsIHRoaXMuaWQsIHRoaXMucHJvcHMudHlwZSlcblx0XHR0aGlzLnJlbGVhc2VUaW1lbGluZUluKClcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucHJvcHMuZGlkVHJhbnNpdGlvbkluQ29tcGxldGUoKSwgMClcblx0fVxuXHRkaWRUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0Ly8gY29uc29sZS5sb2coJ2RpZFRyYW5zaXRpb25PdXRDb21wbGV0ZScsIHRoaXMuaWQsIHRoaXMucHJvcHMudHlwZSlcblx0XHR0aGlzLnJlbGVhc2VUaW1lbGluZU91dCgpXG5cdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLnByb3BzLmRpZFRyYW5zaXRpb25PdXRDb21wbGV0ZSgpLCAwKVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0fVxuXHRmb3JjZVVubW91bnQoKSB7XG5cdFx0aWYodGhpcy50bEluICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy50bEluLnBhdXNlKDApXG5cdFx0fVxuXHRcdGlmKHRoaXMudGxPdXQgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsT3V0LnBhdXNlKDApXG5cdFx0fVxuXHRcdHRoaXMuZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlKClcblx0fVxuXHRyZWxlYXNlVGltZWxpbmVJbigpIHtcblx0XHRpZih0aGlzLnRsSW4gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsSW4uY2xlYXIoKVxuXHRcdFx0Ly8gQXBwU3RvcmUucmVsZWFzZVRpbWVsaW5lKHRoaXMudGxJbilcblx0XHRcdHRoaXMudGxJbiA9IG51bGxcblx0XHR9XG5cdH1cblx0cmVsZWFzZVRpbWVsaW5lT3V0KCkge1xuXHRcdGlmKHRoaXMudGxPdXQgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnRsT3V0LmNsZWFyKClcblx0XHRcdC8vIEFwcFN0b3JlLnJlbGVhc2VUaW1lbGluZSh0aGlzLnRsT3V0KVxuXHRcdFx0dGhpcy50bElPdXQgPSBudWxsXG5cdFx0fVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMucmVsZWFzZVRpbWVsaW5lSW4oKVxuXHRcdHRoaXMucmVsZWFzZVRpbWVsaW5lT3V0KClcblx0fVxufVxuIiwiaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnQmFzZUNvbXBvbmVudCdcbmltcG9ydCB7UGFnZXJTdG9yZSwgUGFnZXJBY3Rpb25zLCBQYWdlckNvbnN0YW50cywgUGFnZXJEaXNwYXRjaGVyfSBmcm9tICdQYWdlcidcbmltcG9ydCBfY2FwaXRhbGl6ZSBmcm9tICdsb2Rhc2gvU3RyaW5nL2NhcGl0YWxpemUnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnUGFnZXNDb250YWluZXJfaGJzJ1xuaW1wb3J0IEFwcFN0b3JlIGZyb20gJ0FwcFN0b3JlJ1xuXG5jbGFzcyBCYXNlUGFnZXIgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKVxuXHRcdHRoaXMuY3VycmVudFBhZ2VEaXZSZWYgPSAncGFnZS1iJ1xuXHRcdHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uSW4gPSB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbkluLmJpbmQodGhpcylcblx0XHR0aGlzLndpbGxQYWdlVHJhbnNpdGlvbk91dCA9IHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0LmJpbmQodGhpcylcblx0XHR0aGlzLmRpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZSA9IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlLmJpbmQodGhpcylcblx0XHR0aGlzLmRpZFBhZ2VUcmFuc2l0aW9uT3V0Q29tcGxldGUgPSB0aGlzLmRpZFBhZ2VUcmFuc2l0aW9uT3V0Q29tcGxldGUuYmluZCh0aGlzKVxuXHRcdHRoaXMuY29tcG9uZW50cyA9IHtcblx0XHRcdCduZXctY29tcG9uZW50JzogdW5kZWZpbmVkLFxuXHRcdFx0J29sZC1jb21wb25lbnQnOiB1bmRlZmluZWRcblx0XHR9XG5cdH1cblx0cmVuZGVyKHBhcmVudCkge1xuXHRcdHN1cGVyLnJlbmRlcignQmFzZVBhZ2VyJywgcGFyZW50LCB0ZW1wbGF0ZSwgdW5kZWZpbmVkKVxuXHR9XG5cdGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRQYWdlclN0b3JlLm9uKFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9JTiwgdGhpcy53aWxsUGFnZVRyYW5zaXRpb25Jbilcblx0XHRQYWdlclN0b3JlLm9uKFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9PVVQsIHRoaXMud2lsbFBhZ2VUcmFuc2l0aW9uT3V0KVxuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxNb3VudCgpXG5cdH1cblx0d2lsbFBhZ2VUcmFuc2l0aW9uSW4oKSB7XG5cdFx0aWYoUGFnZXJTdG9yZS5maXJzdFBhZ2VUcmFuc2l0aW9uKSB7XG5cdFx0XHR0aGlzLnN3aXRjaFBhZ2VzRGl2SW5kZXgoKVxuXHRcdFx0dGhpcy5jb21wb25lbnRzWyduZXctY29tcG9uZW50J10ud2lsbFRyYW5zaXRpb25JbigpXG5cdFx0fVxuXHR9XG5cdHdpbGxQYWdlVHJhbnNpdGlvbk91dCgpIHtcblx0XHR0aGlzLmNvbXBvbmVudHNbJ29sZC1jb21wb25lbnQnXS53aWxsVHJhbnNpdGlvbk91dCgpXG5cdFx0dGhpcy5zd2l0Y2hQYWdlc0RpdkluZGV4KClcblx0XHR0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXS53aWxsVHJhbnNpdGlvbkluKClcblx0fVxuXHRkaWRQYWdlVHJhbnNpdGlvbkluQ29tcGxldGUoKSB7XG5cdFx0Ly8gY29uc29sZS5sb2coJ2RpZFBhZ2VUcmFuc2l0aW9uSW5Db21wbGV0ZScpXG5cdFx0UGFnZXJBY3Rpb25zLnBhZ2VUcmFuc2l0aW9uRGlkRmluaXNoKClcblx0XHR0aGlzLnVubW91bnRDb21wb25lbnQoJ29sZC1jb21wb25lbnQnKVxuXHR9XG5cdGRpZFBhZ2VUcmFuc2l0aW9uT3V0Q29tcGxldGUoKSB7XG5cdFx0Ly8gY29uc29sZS5sb2coJ2RpZFBhZ2VUcmFuc2l0aW9uT3V0Q29tcGxldGUnKVxuXHRcdFBhZ2VyQWN0aW9ucy5vblRyYW5zaXRpb25PdXRDb21wbGV0ZSgpXG5cdH1cblx0c3dpdGNoUGFnZXNEaXZJbmRleCgpIHtcblx0XHR2YXIgbmV3Q29tcG9uZW50ID0gdGhpcy5jb21wb25lbnRzWyduZXctY29tcG9uZW50J11cblx0XHR2YXIgb2xkQ29tcG9uZW50ID0gdGhpcy5jb21wb25lbnRzWydvbGQtY29tcG9uZW50J11cblx0XHRpZihuZXdDb21wb25lbnQgIT0gdW5kZWZpbmVkKSBuZXdDb21wb25lbnQuY2hpbGQuY3NzKCd6LWluZGV4JywgMilcblx0XHRpZihvbGRDb21wb25lbnQgIT0gdW5kZWZpbmVkKSBvbGRDb21wb25lbnQuY2hpbGQuY3NzKCd6LWluZGV4JywgMSlcblx0fVxuXHRzZXR1cE5ld0NvbXBvbmVudChoYXNoLCB0ZW1wbGF0ZSkge1xuXHRcdHZhciBpZCA9IF9jYXBpdGFsaXplKGhhc2gucmVwbGFjZShcIi9cIiwgXCJcIikpXG5cdFx0dGhpcy5vbGRQYWdlRGl2UmVmID0gdGhpcy5jdXJyZW50UGFnZURpdlJlZlxuXHRcdHRoaXMuY3VycmVudFBhZ2VEaXZSZWYgPSAodGhpcy5jdXJyZW50UGFnZURpdlJlZiA9PT0gJ3BhZ2UtYScpID8gJ3BhZ2UtYicgOiAncGFnZS1hJ1xuXHRcdHZhciBlbCA9IHRoaXMuY2hpbGQuZmluZCgnIycrdGhpcy5jdXJyZW50UGFnZURpdlJlZilcblx0XHR2YXIgcHJvcHMgPSB7XG5cdFx0XHRpZDogdGhpcy5jdXJyZW50UGFnZURpdlJlZixcblx0XHRcdGlzUmVhZHk6IHRoaXMub25QYWdlUmVhZHksXG5cdFx0XHR0eXBlOiBBcHBTdG9yZS5nZXRUeXBlT2ZQYWdlKCksXG5cdFx0XHRoYXNoOiBoYXNoLFxuXHRcdFx0ZGlkVHJhbnNpdGlvbkluQ29tcGxldGU6IHRoaXMuZGlkUGFnZVRyYW5zaXRpb25JbkNvbXBsZXRlLFxuXHRcdFx0ZGlkVHJhbnNpdGlvbk91dENvbXBsZXRlOiB0aGlzLmRpZFBhZ2VUcmFuc2l0aW9uT3V0Q29tcGxldGUsXG5cdFx0XHRkYXRhOiBBcHBTdG9yZS5wYWdlQ29udGVudCgpXG5cdFx0fVxuXHRcdHZhciBwYWdlID0gbmV3IHRlbXBsYXRlLnR5cGUocHJvcHMpXG5cdFx0cGFnZS5pZCA9IEFwcFN0b3JlLmdldFBhZ2VJZCgpXG5cdFx0cGFnZS5yZW5kZXIoaWQsIGVsLCB0ZW1wbGF0ZS5wYXJ0aWFsLCBwcm9wcy5kYXRhKVxuXHRcdHRoaXMuY29tcG9uZW50c1snb2xkLWNvbXBvbmVudCddID0gdGhpcy5jb21wb25lbnRzWyduZXctY29tcG9uZW50J11cblx0XHR0aGlzLmNvbXBvbmVudHNbJ25ldy1jb21wb25lbnQnXSA9IHBhZ2Vcblx0XHRpZihQYWdlclN0b3JlLnBhZ2VUcmFuc2l0aW9uU3RhdGUgPT09IFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9JTl9QUk9HUkVTUykge1xuXHRcdFx0dGhpcy5jb21wb25lbnRzWydvbGQtY29tcG9uZW50J10uZm9yY2VVbm1vdW50KClcblx0XHR9XG5cdH1cblx0b25QYWdlUmVhZHkoaGFzaCkge1xuXHRcdFBhZ2VyQWN0aW9ucy5vblBhZ2VSZWFkeShoYXNoKVxuXHR9XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KClcblx0fVxuXHR1bm1vdW50Q29tcG9uZW50KHJlZikge1xuXHRcdGlmKHRoaXMuY29tcG9uZW50c1tyZWZdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuY29tcG9uZW50c1tyZWZdLnJlbW92ZSgpXG5cdFx0fVxuXHR9XG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdFBhZ2VyU3RvcmUub2ZmKFBhZ2VyQ29uc3RhbnRzLlBBR0VfVFJBTlNJVElPTl9JTiwgdGhpcy53aWxsUGFnZVRyYW5zaXRpb25Jbilcblx0XHRQYWdlclN0b3JlLm9mZihQYWdlckNvbnN0YW50cy5QQUdFX1RSQU5TSVRJT05fT1VULCB0aGlzLndpbGxQYWdlVHJhbnNpdGlvbk91dClcblx0XHR0aGlzLnVubW91bnRDb21wb25lbnQoJ29sZC1jb21wb25lbnQnKVxuXHRcdHRoaXMudW5tb3VudENvbXBvbmVudCgnbmV3LWNvbXBvbmVudCcpXG5cdFx0c3VwZXIuY29tcG9uZW50V2lsbFVubW91bnQoKVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEJhc2VQYWdlclxuXG4iLCJtb2R1bGUuZXhwb3J0cz17XG5cdFwiaW5mb3NcIjoge1xuXHRcdFwidHdpdHRlcl91cmxcIjogXCJodHRwOi8vdHdpdHRlci5jb21cIixcblx0XHRcImZhY2Vib29rX3VybFwiOiBcImh0dHA6Ly9mYWNlYm9vay5jb21cIixcblx0XHRcImluc3RhZ3JhbV91cmxcIjogXCJodHRwOi8vaW5zdGFncmFtLmNvbVwiLFxuXHRcdFwibGFuZ1wiOiB7XG5cdFx0XHRcImVuXCI6IHtcblx0XHRcdFx0XCJjb3VudHJpZXNcIjoge1xuXHRcdFx0XHRcdFwiR0JSXCI6IFwiZW5nbGlzaFwiLFxuXHRcdFx0XHRcdFwiRlJBXCI6IFwiZnJlbmNoXCIsXG5cdFx0XHRcdFx0XCJFU1BcIjogXCJzcGFuaXNoXCIsXG5cdFx0XHRcdFx0XCJJVEFcIjogXCJpdGFsaWFuXCIsXG5cdFx0XHRcdFx0XCJERVVcIjogXCJnZXJtYW5cIixcblx0XHRcdFx0XHRcIlBSVFwiOiBcInBvcnR1Z2VzZVwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibGVnYWxcIjogXCJsZWdhbFwiLFxuXHRcdFx0XHRcImxlZ2FsX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYlwiOiBcImNhbXBlciBsYWJcIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF90aXRsZVwiOiBcInNob3BcIixcblx0XHRcdFx0XCJzaG9wX21lblwiOiBcIm1hblwiLFxuXHRcdFx0XHRcInNob3BfbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF93b21lblwiOiBcIndvbWFuXCIsXG5cdFx0XHRcdFwic2hvcF93b21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcInBsYW5ldFwiLFxuXHRcdFx0XHRcImJ1eV90aXRsZVwiOiBcImJ1eVwiLFxuXHRcdFx0XHRcImNhbXBhaWduX3RpdGxlXCI6IFwiY2FtcGFpZ25cIlxuXHRcdFx0fSxcblx0XHRcdFwiZnJcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJjYW1wYWlnblwiXG5cdFx0XHR9LFxuXHRcdFx0XCJlc1wiOiB7XG5cdFx0XHRcdFwiY291bnRyaWVzXCI6IHtcblx0XHRcdFx0XHRcIkdCUlwiOiBcImVuZ2xpc2hcIixcblx0XHRcdFx0XHRcIkZSQVwiOiBcImZyZW5jaFwiLFxuXHRcdFx0XHRcdFwiRVNQXCI6IFwic3BhbmlzaFwiLFxuXHRcdFx0XHRcdFwiSVRBXCI6IFwiaXRhbGlhblwiLFxuXHRcdFx0XHRcdFwiREVVXCI6IFwiZ2VybWFuXCIsXG5cdFx0XHRcdFx0XCJQUlRcIjogXCJwb3J0dWdlc2VcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImxlZ2FsXCI6IFwibGVnYWxcIixcblx0XHRcdFx0XCJsZWdhbF91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJcIjogXCJjYW1wZXIgbGFiXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3BfdGl0bGVcIjogXCJzaG9wXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5cIjogXCJtYW5cIixcblx0XHRcdFx0XCJzaG9wX21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5cIjogXCJ3b21hblwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJwbGFuZXRcIjogXCJwbGFuZXRcIixcblx0XHRcdFx0XCJidXlfdGl0bGVcIjogXCJidXlcIixcblx0XHRcdFx0XCJjYW1wYWlnbl90aXRsZVwiOiBcImNhbXBhaWduXCJcblx0XHRcdH0sXG5cdFx0XHRcIml0XCI6IHtcblx0XHRcdFx0XCJjb3VudHJpZXNcIjoge1xuXHRcdFx0XHRcdFwiR0JSXCI6IFwiZW5nbGlzaFwiLFxuXHRcdFx0XHRcdFwiRlJBXCI6IFwiZnJlbmNoXCIsXG5cdFx0XHRcdFx0XCJFU1BcIjogXCJzcGFuaXNoXCIsXG5cdFx0XHRcdFx0XCJJVEFcIjogXCJpdGFsaWFuXCIsXG5cdFx0XHRcdFx0XCJERVVcIjogXCJnZXJtYW5cIixcblx0XHRcdFx0XHRcIlBSVFwiOiBcInBvcnR1Z2VzZVwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibGVnYWxcIjogXCJsZWdhbFwiLFxuXHRcdFx0XHRcImxlZ2FsX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYlwiOiBcImNhbXBlciBsYWJcIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF90aXRsZVwiOiBcInNob3BcIixcblx0XHRcdFx0XCJzaG9wX21lblwiOiBcIm1hblwiLFxuXHRcdFx0XHRcInNob3BfbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwic2hvcF93b21lblwiOiBcIndvbWFuXCIsXG5cdFx0XHRcdFwic2hvcF93b21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInBsYW5ldFwiOiBcInBsYW5ldFwiLFxuXHRcdFx0XHRcImJ1eV90aXRsZVwiOiBcImJ1eVwiLFxuXHRcdFx0XHRcImNhbXBhaWduX3RpdGxlXCI6IFwiY2FtcGFpZ25cIlxuXHRcdFx0fSxcblx0XHRcdFwiZGVcIjoge1xuXHRcdFx0XHRcImNvdW50cmllc1wiOiB7XG5cdFx0XHRcdFx0XCJHQlJcIjogXCJlbmdsaXNoXCIsXG5cdFx0XHRcdFx0XCJGUkFcIjogXCJmcmVuY2hcIixcblx0XHRcdFx0XHRcIkVTUFwiOiBcInNwYW5pc2hcIixcblx0XHRcdFx0XHRcIklUQVwiOiBcIml0YWxpYW5cIixcblx0XHRcdFx0XHRcIkRFVVwiOiBcImdlcm1hblwiLFxuXHRcdFx0XHRcdFwiUFJUXCI6IFwicG9ydHVnZXNlXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJsZWdhbFwiOiBcImxlZ2FsXCIsXG5cdFx0XHRcdFwibGVnYWxfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJjYW1wZXJfbGFiXCI6IFwiY2FtcGVyIGxhYlwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJfdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3RpdGxlXCI6IFwic2hvcFwiLFxuXHRcdFx0XHRcInNob3BfbWVuXCI6IFwibWFuXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuXCI6IFwid29tYW5cIixcblx0XHRcdFx0XCJzaG9wX3dvbWVuX3VybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCIsXG5cdFx0XHRcdFwicGxhbmV0XCI6IFwicGxhbmV0XCIsXG5cdFx0XHRcdFwiYnV5X3RpdGxlXCI6IFwiYnV5XCIsXG5cdFx0XHRcdFwiY2FtcGFpZ25fdGl0bGVcIjogXCJjYW1wYWlnblwiXG5cdFx0XHR9LFxuXHRcdFx0XCJwdFwiOiB7XG5cdFx0XHRcdFwiY291bnRyaWVzXCI6IHtcblx0XHRcdFx0XHRcIkdCUlwiOiBcImVuZ2xpc2hcIixcblx0XHRcdFx0XHRcIkZSQVwiOiBcImZyZW5jaFwiLFxuXHRcdFx0XHRcdFwiRVNQXCI6IFwic3BhbmlzaFwiLFxuXHRcdFx0XHRcdFwiSVRBXCI6IFwiaXRhbGlhblwiLFxuXHRcdFx0XHRcdFwiREVVXCI6IFwiZ2VybWFuXCIsXG5cdFx0XHRcdFx0XCJQUlRcIjogXCJwb3J0dWdlc2VcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImxlZ2FsXCI6IFwibGVnYWxcIixcblx0XHRcdFx0XCJsZWdhbF91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcImNhbXBlcl9sYWJcIjogXCJjYW1wZXIgbGFiXCIsXG5cdFx0XHRcdFwiY2FtcGVyX2xhYl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3BfdGl0bGVcIjogXCJzaG9wXCIsXG5cdFx0XHRcdFwic2hvcF9tZW5cIjogXCJtYW5cIixcblx0XHRcdFx0XCJzaG9wX21lbl91cmxcIjogXCJodHRwOi8vZ29vZ2xlLmNvbVwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5cIjogXCJ3b21hblwiLFxuXHRcdFx0XHRcInNob3Bfd29tZW5fdXJsXCI6IFwiaHR0cDovL2dvb2dsZS5jb21cIixcblx0XHRcdFx0XCJwbGFuZXRcIjogXCJwbGFuZXRcIixcblx0XHRcdFx0XCJidXlfdGl0bGVcIjogXCJidXlcIixcblx0XHRcdFx0XCJjYW1wYWlnbl90aXRsZVwiOiBcImNhbXBhaWduXCJcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0XCJjb3VudHJpZXNcIjogW1xuXHRcdHtcblx0XHRcdFwiaWRcIjogXCJHQlJcIixcblx0XHRcdFwibGFuZ1wiOiBcImVuXCIsXG5cdFx0XHRcInVybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCJcblx0XHR9LHtcblx0XHRcdFwiaWRcIjogXCJGUkFcIixcblx0XHRcdFwibGFuZ1wiOiBcImZyXCIsXG5cdFx0XHRcInVybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCJcblx0XHR9LHtcblx0XHRcdFwiaWRcIjogXCJFU1BcIixcblx0XHRcdFwibGFuZ1wiOiBcImVzXCIsXG5cdFx0XHRcInVybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCJcblx0XHR9LHtcblx0XHRcdFwiaWRcIjogXCJJVEFcIixcblx0XHRcdFwibGFuZ1wiOiBcIml0XCIsXG5cdFx0XHRcInVybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCJcblx0XHR9LHtcblx0XHRcdFwiaWRcIjogXCJERVVcIixcblx0XHRcdFwibGFuZ1wiOiBcImRlXCIsXG5cdFx0XHRcInVybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCJcblx0XHR9LHtcblx0XHRcdFwiaWRcIjogXCJQUlRcIixcblx0XHRcdFwibGFuZ1wiOiBcInB0XCIsXG5cdFx0XHRcInVybFwiOiBcImh0dHA6Ly9nb29nbGUuY29tXCJcblx0XHR9XG5cdF0sXG5cdFwicGxhbmV0c1wiOiBbXCJza2lcIiwgXCJtZXRhbFwiLCBcImFsYXNrYVwiLCBcIndvb2RcIiwgXCJnZW1zdG9uZVwiXSxcblx0XCJlbGVtZW50c1wiOiBbXCJmaXJlXCIsIFwiZWFydGhcIiwgXCJtZXRhbFwiLCBcIndhdGVyXCIsIFwid29vZFwiXSxcblx0XCJnZW5kZXJcIjogW1wibWFsZVwiLCBcImZlbWFsZVwiLCBcImFuaW1hbFwiXSxcblxuXHRcImNvbG9yc1wiOiB7XG5cdFx0XCJza2lcIjogW1wiMHg2MTgxYWFcIiwgXCIweGMzZDlmMVwiXSxcblx0XHRcIm1ldGFsXCI6IFtcIjB4MGQwZDBmXCIsIFwiMHg1OTU5NTlcIl0sXG5cdFx0XCJhbGFza2FcIjogW1wiMHhiN2NhZGJcIiwgXCIweDZmODY5OFwiXSxcblx0XHRcIndvb2RcIjogW1wiMHg1MDIwMTZcIiwgXCIweGM1ODU0N1wiXSxcblx0XHRcImdlbXN0b25lXCI6IFtcIjB4MzYzODY0XCIsIFwiMHg0NzdlOTRcIl1cblx0fSxcblxuXHRcInByb2R1Y3RzLWRhdGFcIjoge1xuXHRcdFwic2tpXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDM0M2E1Y1wiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJGSVNTXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDdiN2I3ZFwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6LTAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMixcblx0XHRcdFx0XCJuYW1lXCI6IFwiRklTU1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhlN2UzM2NcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMyxcblx0XHRcdFx0XCJuYW1lXCI6IFwiRklTU1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhkYjMwNzZcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjMsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogNCxcblx0XHRcdFx0XCJuYW1lXCI6IFwiRklTU1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg0MDczZGFcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6MC4xfSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF0sXG5cdFx0XCJtZXRhbFwiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogMCxcblx0XHRcdFx0XCJuYW1lXCI6IFwiQkVMVUdBXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDBmMGYxMVwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjowLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAxLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJIQVJEV09PRFwiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhlODJiMThcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjMsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwiYWxhc2thXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJnZW1tYVwiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhiNjkzN2RcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjIsIFwieVwiOjAuM30sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJuYW1lXCI6IFwicGVsb3Rhc1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHhjOThlOTRcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOjAuMywgXCJ5XCI6LTAuNn0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDIsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkVORFVST1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg2MTZhNzFcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOi0wLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC42fVxuXHRcdFx0XHRdXG5cdFx0XHR9LHtcblx0XHRcdFx0XCJpZFwiOiAzLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJFTkRVUk9cIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4MGUyZTYxXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6LTAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuMX1cblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF0sXG5cdFx0XCJ3b29kXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiAwLFxuXHRcdFx0XHRcIm5hbWVcIjogXCJWSU5UQVJcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NWIyZjI0XCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjowLjMsIFwieVwiOjAuMX0sXG5cdFx0XHRcdFx0e1wieFwiOjAuNiwgXCJ5XCI6MC40fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjZ9XG5cdFx0XHRcdF1cblx0XHRcdH0se1xuXHRcdFx0XHRcImlkXCI6IDEsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkJFTFVHQVwiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHg4OGEyYzdcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjMsIFwieVwiOi0wLjZ9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjotMC40LCBcInlcIjowLjd9XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdLFxuXHRcdFwiZ2Vtc3RvbmVcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcImlkXCI6IDAsXG5cdFx0XHRcdFwibmFtZVwiOiBcIkVORFVST1wiLFxuXHRcdFx0XHRcImNvbG9yXCI6IFwiMHgzYTNiNmJcIixcblx0XHRcdFx0XCJrbm90c1wiOiBbXG5cdFx0XHRcdFx0e1wieFwiOi0wLjIsIFwieVwiOjAuM30sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNH0sXG5cdFx0XHRcdFx0e1wieFwiOi0wLjYsIFwieVwiOjAuNn1cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMSxcblx0XHRcdFx0XCJuYW1lXCI6IFwiRU5EVVJPXCIsXG5cdFx0XHRcdFwiY29sb3JcIjogXCIweDYyYThiYlwiLFxuXHRcdFx0XHRcImtub3RzXCI6IFtcblx0XHRcdFx0XHR7XCJ4XCI6MC4zLCBcInlcIjotMC42fSxcblx0XHRcdFx0XHR7XCJ4XCI6MC42LCBcInlcIjowLjR9LFxuXHRcdFx0XHRcdHtcInhcIjowLjQsIFwieVwiOjAuN31cblx0XHRcdFx0XVxuXHRcdFx0fSx7XG5cdFx0XHRcdFwiaWRcIjogMixcblx0XHRcdFx0XCJuYW1lXCI6IFwiZ2VtbWFcIixcblx0XHRcdFx0XCJjb2xvclwiOiBcIjB4NDc3ZTkzXCIsXG5cdFx0XHRcdFwia25vdHNcIjogW1xuXHRcdFx0XHRcdHtcInhcIjotMC4zLCBcInlcIjowLjF9LFxuXHRcdFx0XHRcdHtcInhcIjotMC42LCBcInlcIjotMC4zfSxcblx0XHRcdFx0XHR7XCJ4XCI6LTAuNiwgXCJ5XCI6LTAuNH1cblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblxuXHRcImxhbmdcIjoge1xuXHRcdFwiZW5cIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlclwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlclwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImxhbmRpbmcgcGFnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJza2kgcGFnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIm1ldGFsIHBhZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiYWxhc2thIHBhZ2VcIlxuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIndvb2QgcGFnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImdlbXN0b25lIHBhZ2VcIlxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJmclwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGZyXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGZyXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibGFuZGluZyBwYWdlIGZyXCJcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcInNraSBwYWdlIGZyXCJcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibWV0YWwgcGFnZSBmclwiXG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJhbGFza2EgcGFnZSBmclwiXG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwid29vZCBwYWdlIGZyXCJcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiZ2Vtc3RvbmUgcGFnZSBmclwiXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImVzXCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgZXNcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgZXNcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJsYW5kaW5nIHBhZ2UgZXNcIlxuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwic2tpIHBhZ2UgZXNcIlxuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJtZXRhbCBwYWdlIGVzXCJcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImFsYXNrYSBwYWdlIGVzXCJcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJ3b29kIHBhZ2UgZXNcIlxuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJnZW1zdG9uZSBwYWdlIGVzXCJcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiaXRcIjoge1xuXHRcdFx0XCJnbG9iYWxcIjoge1xuXHRcdFx0XHRcImhlYWRlci10aXRsZVwiOiBcIkhlYWRlciBpdFwiLFxuXHRcdFx0XHRcImZvb3Rlci10aXRsZVwiOiBcIkZvb3RlciBpdFwiLFxuXHRcdFx0XHRcImVsZW1lbnRzXCI6IHtcblx0XHRcdFx0XHRcImZpcmVcIjogXCJmaXJlXCIsXG5cdFx0XHRcdFx0XCJlYXJ0aFwiOiBcImVhcnRoXCIsXG5cdFx0XHRcdFx0XCJtZXRhbFwiOiBcIm1ldGFsXCIsXG5cdFx0XHRcdFx0XCJ3YXRlclwiOiBcIndhdGVyXCIsXG5cdFx0XHRcdFx0XCJ3b29kXCI6IFwid29vZFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZ2VuZGVyXCI6IHtcblx0XHRcdFx0XHRcIm1hbGVcIjogXCJtXCIsXG5cdFx0XHRcdFx0XCJmZW1hbGVcIjogXCJmXCIsXG5cdFx0XHRcdFx0XCJhbmltYWxcIjogXCJhXCJcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwibGFuZGluZ1wiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImxhbmRpbmcgcGFnZSBpdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJza2lcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJza2kgcGFnZSBpdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJtZXRhbFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIm1ldGFsIHBhZ2UgaXRcIlxuXHRcdFx0fSxcblx0XHRcdFwiYWxhc2thXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiYWxhc2thIHBhZ2UgaXRcIlxuXHRcdFx0fSxcblx0XHRcdFwid29vZFwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcIndvb2QgcGFnZSBpdFwiXG5cdFx0XHR9LFxuXHRcdFx0XCJnZW1zdG9uZVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImdlbXN0b25lIHBhZ2UgaXRcIlxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJkZVwiOiB7XG5cdFx0XHRcImdsb2JhbFwiOiB7XG5cdFx0XHRcdFwiaGVhZGVyLXRpdGxlXCI6IFwiSGVhZGVyIGdlXCIsXG5cdFx0XHRcdFwiZm9vdGVyLXRpdGxlXCI6IFwiRm9vdGVyIGdlXCIsXG5cdFx0XHRcdFwiZWxlbWVudHNcIjoge1xuXHRcdFx0XHRcdFwiZmlyZVwiOiBcImZpcmVcIixcblx0XHRcdFx0XHRcImVhcnRoXCI6IFwiZWFydGhcIixcblx0XHRcdFx0XHRcIm1ldGFsXCI6IFwibWV0YWxcIixcblx0XHRcdFx0XHRcIndhdGVyXCI6IFwid2F0ZXJcIixcblx0XHRcdFx0XHRcIndvb2RcIjogXCJ3b29kXCJcblx0XHRcdFx0fSxcblx0XHRcdFx0XCJnZW5kZXJcIjoge1xuXHRcdFx0XHRcdFwibWFsZVwiOiBcIm1cIixcblx0XHRcdFx0XHRcImZlbWFsZVwiOiBcImZcIixcblx0XHRcdFx0XHRcImFuaW1hbFwiOiBcImFcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJsYW5kaW5nXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibGFuZGluZyBwYWdlIGdlXCJcblx0XHRcdH0sXG5cdFx0XHRcInNraVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcInNraSBwYWdlIGdlXCJcblx0XHRcdH0sXG5cdFx0XHRcIm1ldGFsXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwibWV0YWwgcGFnZSBnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJhbGFza2FcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJhbGFza2EgcGFnZSBnZVwiXG5cdFx0XHR9LFxuXHRcdFx0XCJ3b29kXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwid29vZCBwYWdlIGdlXCJcblx0XHRcdH0sXG5cdFx0XHRcImdlbXN0b25lXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwiZ2Vtc3RvbmUgcGFnZSBnZVwiXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcInB0XCI6IHtcblx0XHRcdFwiZ2xvYmFsXCI6IHtcblx0XHRcdFx0XCJoZWFkZXItdGl0bGVcIjogXCJIZWFkZXIgcHRcIixcblx0XHRcdFx0XCJmb290ZXItdGl0bGVcIjogXCJGb290ZXIgcHRcIixcblx0XHRcdFx0XCJlbGVtZW50c1wiOiB7XG5cdFx0XHRcdFx0XCJmaXJlXCI6IFwiZmlyZVwiLFxuXHRcdFx0XHRcdFwiZWFydGhcIjogXCJlYXJ0aFwiLFxuXHRcdFx0XHRcdFwibWV0YWxcIjogXCJtZXRhbFwiLFxuXHRcdFx0XHRcdFwid2F0ZXJcIjogXCJ3YXRlclwiLFxuXHRcdFx0XHRcdFwid29vZFwiOiBcIndvb2RcIlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRcImdlbmRlclwiOiB7XG5cdFx0XHRcdFx0XCJtYWxlXCI6IFwibVwiLFxuXHRcdFx0XHRcdFwiZmVtYWxlXCI6IFwiZlwiLFxuXHRcdFx0XHRcdFwiYW5pbWFsXCI6IFwiYVwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcImxhbmRpbmdcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJsYW5kaW5nIHBhZ2UgcHRcIlxuXHRcdFx0fSxcblx0XHRcdFwic2tpXCI6IHtcblx0XHRcdFx0XCJtYWluLXRpdGxlXCI6IFwic2tpIHBhZ2UgcHRcIlxuXHRcdFx0fSxcblx0XHRcdFwibWV0YWxcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJtZXRhbCBwYWdlIHB0XCJcblx0XHRcdH0sXG5cdFx0XHRcImFsYXNrYVwiOiB7XG5cdFx0XHRcdFwibWFpbi10aXRsZVwiOiBcImFsYXNrYSBwYWdlIHB0XCJcblx0XHRcdH0sXG5cdFx0XHRcIndvb2RcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJ3b29kIHBhZ2UgcHRcIlxuXHRcdFx0fSxcblx0XHRcdFwiZ2Vtc3RvbmVcIjoge1xuXHRcdFx0XHRcIm1haW4tdGl0bGVcIjogXCJnZW1zdG9uZSBwYWdlIHB0XCJcblx0XHRcdH1cblx0XHR9LFxuXHR9LFxuXG5cdFwiZGVmYXVsdC1yb3V0ZVwiOiBcIi9sYW5kaW5nXCIsXG5cblx0XCJyb3V0aW5nXCI6IHtcblx0XHRcIi9sYW5kaW5nXCI6IHtcblx0XHRcdFwiaWRcIjogXCJsYW5kaW5nXCJcblx0XHR9LFxuXHRcdFwiL3BsYW5ldC9za2lcIjoge1xuXHRcdFx0XCJpZFwiOiBcInNraVwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF1cblx0XHR9LFxuXHRcdFwiL3BsYW5ldC9tZXRhbFwiOiB7XG5cdFx0XHRcImlkXCI6IFwibWV0YWxcIixcblx0XHRcdFwiZXhwZXJpZW5jZS1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvYWxhc2thXCI6IHtcblx0XHRcdFwiaWRcIjogXCJhbGFza2FcIixcblx0XHRcdFwiZXhwZXJpZW5jZS1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRcIi9wbGFuZXQvd29vZFwiOiB7XG5cdFx0XHRcImlkXCI6IFwid29vZFwiLFxuXHRcdFx0XCJleHBlcmllbmNlLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF0sXG5cdFx0XHRcImNhbXBhaWduLWFzc2V0c1wiOiBbXG5cdFx0XHRcdFwiYnVubnkucG5nXCJcblx0XHRcdF1cblx0XHR9LFxuXHRcdFwiL3BsYW5ldC9nZW1zdG9uZVwiOiB7XG5cdFx0XHRcImlkXCI6IFwiZ2Vtc3RvbmVcIixcblx0XHRcdFwiZXhwZXJpZW5jZS1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdLFxuXHRcdFx0XCJjYW1wYWlnbi1hc3NldHNcIjogW1xuXHRcdFx0XHRcImJ1bm55LnBuZ1wiXG5cdFx0XHRdXG5cdFx0fVxuXHR9XG59Il19
