/**
 * SimplePatternMatchers supports handler matching based on
 * either string liberals or a simple pattern.
 */

const SEPARATOR = '&';
export const MATCH_FOUND = 'MATCH_FOUND';
export const PARAM_NAME_NOT_MATCH = 'PARAM_NAME_NOT_MATCH';
export const PARAM_VALUE_NOT_MATCH = 'PARAM_VALUE_NOT_MATCH';
class SimplePatternMatchers {
  matchers = new /* <string, Handler> */ Map();
  patternMapByQueryString = new /* <string, Map<string, [queryParamName: string, pattern: string]>> */ Map();

  /**
   * Saves the handler for a query string. It'll overwrite
   * the one that has already existed if applicable.
   * @param {string} queryString the query/search string.
   * @param {Function} qpHandler the handler for the query string.
   */
  set(queryString, qpHandler) {
    this.matchers.set(queryString, qpHandler);
    this.patternMapByQueryString.set(
      queryString,
      this.queryStringToMap(queryString)
    );
  }

  /**
   * Gets the handler for a query/search string.
   * @param {string} queryString the query/search to get handler for.
   * @return {
   *  {
   *    result: string,
   *    message: string,
   *    handler: Function
   *  }
   * } the match result.
   */
  get(queryString) {
    let handler = this.matchers.get(queryString);

    let testMap = this.queryStringToMap(queryString);
    if (!handler && this.patternMapByQueryString.size > 0) {
      for (let [qs, patternMap] of this.patternMapByQueryString.entries()) {
        if (this.match(patternMap, testMap)) {
          handler = this.matchers.get(qs);
          break;
        }
      }
    }

    let matchResult = { result: MATCH_FOUND };
    if (!handler) {
      matchResult = this.generateReasonForNoMatching(testMap);
    }

    return { ...matchResult, handler };
  }

  /**
   * Converts a query/search string to a Map object.
   * @param {string} queryString the query/search string to be converted.
   * @return {Map<string, string>} the Map object converted to.
   */
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
      if (
        [...patternMap.keys()].join(SEPARATOR) ===
        [...testMap.keys()].join(SEPARATOR)
      ) {
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

  /**
   * Generates a message indicating why no match was found.
   * @param {Map<string, string>} testMap
   * @return {
   *  {
   *    result: string,
   *    message: string
   *  }
   * }
   */
  generateReasonForNoMatching(testMap /* <Map<string, string>> */) {
    const paramNames = [...testMap.keys()].join(SEPARATOR);
    let message = `\nbut found no handler for it because\n`;
    let result = null;

    let paramNameMatches = [];
    for (let paramMap of this.patternMapByQueryString.values()) {
      if ([...paramMap.keys()].join(SEPARATOR) === paramNames) {
        paramNameMatches.push(paramMap);
      }
    }

    let requested = null;
    let existing = null;

    if (paramNameMatches.length > 0) {
      requested = this.mapToText(testMap);
      existing = [];
      paramNameMatches.forEach((paramMap) =>
        existing.push(this.mapToText(paramMap))
      );

      result = PARAM_VALUE_NOT_MATCH;
      message = `${message}query parameter values of:\n`;
    } else {
      requested = this.arryToText([...testMap.keys()]);
      existing = [];
      for (let paramMap of this.patternMapByQueryString.values()) {
        existing.push(this.arryToText([...paramMap.keys()]));
      }

      result = PARAM_NAME_NOT_MATCH;
      message = `${message}query parameter names of:\n`;
    }

    message =
      `${message}\t${requested}\n` +
      `don't match any of:\n[\n\t${existing.join(',\n\t')}\n]`;

    return { result, message };
  }

  /**
   * Converts a Map object to a string in certain format, e.g.:
   *  {
   *      foo=bar
   *      baz=123
   *  }
   * @param {Map<string, string>} the map object to be converted.
   * @return {string} the string converted to.
   */
  mapToText(map /* <string, string> */) {
    let res =
      (map &&
        [...map.entries()].reduce((accu, entry) => {
          accu.push(entry.join('='));
          return accu;
        }, [])) ||
      [];

    return `{\n\t\t${res.join('\n\t\t')}\n\t}`;
  }

  /**
   * Converts an array to a string in certain format, e.g.:
   * ['a', 'b', 'c'] => [a, b, c]
   * @param {string[]} the string array to be converted.
   * @return {string} the string converted to.
   */
  arryToText(arr /* string[] */) {
    return (arr && `[${arr}]`) || '[]';
  }
}

export default SimplePatternMatchers;
