class SimplePatternMatchers {
  matchers = new /* <string, Handler> */ Map();
  patternMapByQueryString = new /* <string, Map<string, [queryParamName: string, pattern: string]>> */ Map();

  set(queryString, qpHandler) {
    this.matchers.set(queryString, qpHandler);
    this.patternMapByQueryString.set(
      queryString,
      this.queryStringToMap(queryString)
    );
  }

  get(queryString) {
    let handler = this.matchers.get(queryString);

    if (!handler && this.patternMapByQueryString.size > 0) {
      let testMap = this.queryStringToMap(queryString);
      for (let [qs, patternMap] of this.patternMapByQueryString.entries()) {
        if (this.match(patternMap, testMap)) {
          handler = this.matchers.get(qs);
          break;
        }
      }
    }

    return handler;
  }

  queryStringToMap(queryString) {
    let url = new URL(queryString, document.baseURI);
    return new Map(Array.from(url.searchParams));
  }

  /**
   * Tests if query string (testMap) matches the predefined
   * pattern (patternMap), e.g.:
   *
   * match(new Map[['foo', '*']], new Map[['foo', 'abc]]): returns true;
   * match(new Map[['foo', '*']], new Map[['bar', 'abc]]): returns false;
   */
  match(patternMap, testMap) {
    if (patternMap && testMap) {
      if ([...patternMap.keys()].join('&') === [...testMap.keys()].join('&')) {
        for (let [key, pattern] of patternMap.entries()) {
          if (pattern !== '*' && pattern !== testMap.get(key)) {
            return false;
          }
        }
        return true;
      }
    }
    return false;
  }
}

export default SimplePatternMatchers;
