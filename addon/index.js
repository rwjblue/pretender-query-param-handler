const UNHANDLED_REQUEST_MSG_DEFAULT =
  'but no handler was defined for this type of request';

import Pretender from 'pretender';
import SimplePatternMatchers, {
  MATCH_FOUND,
  PARAM_NAME_NOT_MATCH,
} from './pattern-matchers';

function normalizeQueryString(requestUrl) {
  let url = new URL(requestUrl, document.baseURI);

  // ensure stable sort
  url.searchParams.sort();

  let sortedSearch = url.searchParams.toString();

  return sortedSearch === '' ? '' : `?${sortedSearch}`;
}

const QueryParamHandlers = new WeakMap();
const requestRejectionReasons = new WeakMap();

export function buildQueryParamHandler() {
  let matchers = new SimplePatternMatchers();

  function handler(request) {
    let queryString = normalizeQueryString(request.url);
    let { handler } = matchers.get(queryString);

    if (handler) {
      return handler(...arguments);
    } else {
      // TODO: hook into Pretender's unhandledRequest system when a full Pretender instance is present
      throw new Error(
        `pretender-query-param-handler: no handler was defined for \`${queryString}\``
      );
    }
  }

  function add(queryString, qpHandler, async) {
    qpHandler.numberOfCalls = 0;

    // async property only works when using Pretender subclass
    qpHandler.async = async;

    matchers.set(queryString, qpHandler);
  }

  let result = {
    add,
    handler,
    matchers,
  };

  QueryParamHandlers.set(handler, result);

  return result;
}

export class QueryParamAwarePretender extends Pretender {
  pathnameHandlersMap = {
    GET: new Map(),
    POST: new Map(),
    PUT: new Map(),
    DELETE: new Map(),
    PATCH: new Map(),
    HEAD: new Map(),
    OPTIONS: new Map(),
  };

  normalizeURLs = false;

  constructor(options) {
    super(arguments);

    if (
      typeof options === 'object' &&
      options !== null &&
      typeof options.normalizeURLs === 'boolean'
    ) {
      this.normalizeURLs = options.normalizeURLs;
    }
  }

  register(verb, url, qpHandler, async) {
    let { pathname, search } = new URL(url, document.baseURI);

    let pathnameHandlersMap = this.pathnameHandlersMap[verb];

    let handler = pathnameHandlersMap.get(pathname);
    if (handler === undefined) {
      handler = buildQueryParamHandler();
      pathnameHandlersMap.set(pathname, handler);
    }

    // sort query params so that the order doesn't matter
    search = this.normalizeURLs ? normalizeQueryString(url) : search;

    // qpHandler's call count is set up in the add function
    handler.add(search, qpHandler, async);
    super.register(verb, pathname, handler.handler, async);

    return qpHandler;
  }

  // instrumented to provide a nicer error message when a handler for a given queryString is not found
  _handlerFor(verb, url, request) {
    let { pathname, search } = new URL(url, document.baseURI);

    search = this.normalizeURLs ? normalizeQueryString(url) : search;

    let handlerFound = super._handlerFor(verb, pathname, request);

    if (handlerFound !== null) {
      let { matchers } = QueryParamHandlers.get(handlerFound.handler);

      let { result, message, handler } = matchers.get(search);

      if (result !== MATCH_FOUND) {
        requestRejectionReasons.set(request, message);
        // no fallback if param values don't match
        if (result && result === PARAM_NAME_NOT_MATCH) {
          handler = matchers.get('').handler; // fallback
        }
      }

      return handler ? { handler: handler } : null;
    }

    return null;
  }

  // Overrides parent method to provide a more meaningful error message
  unhandledRequest(verb, path, _request) {
    const msg =
      requestRejectionReasons.get(_request) || UNHANDLED_REQUEST_MSG_DEFAULT;
    throw new Error(`Pretender intercepted ${verb} ${path} ${msg}`);
  }

  // Overrides parent method to reinstate passthrough support
  checkPassthrough(request) {
    let isPassthrough = false;

    const verb = request.method.toUpperCase();
    const url = request.url;
    let { pathname, search } = new URL(url, document.baseURI);
    search = this.normalizeURLs ? normalizeQueryString(url) : search;

    let handlerFound = super._handlerFor(verb, pathname, request);
    if (handlerFound !== null) {
      let { matchers } = QueryParamHandlers.get(handlerFound.handler);
      let { result, handler } = matchers.get(search);
      isPassthrough = result === MATCH_FOUND && handler === this.passthrough;
    }

    if (isPassthrough) {
      this.passthroughRequests.push(request);
      this.passthroughRequest(verb, pathname, request);
    }
    return isPassthrough;
  }
}
