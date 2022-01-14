pretender-query-param-handler
==============================================================================

This package provides a helper function and wrapped `Pretender` class with support
for matching query params as part of a registered handler.


Installation
------------------------------------------------------------------------------

```
# npm
npm install pretender-query-param-handler

# yarn
yarn add pretender-query-param-handler
```


Usage
------------------------------------------------------------------------------

Nothing beats a quick demo:

```js
import { QueryParamAwarePretender } from 'pretender-query-param-handler';

let server = new QueryParamAwarePretender();

server.get('/api/graphql?foo=bar', () => [ 200, {}, '{ "query": "bar" }']);
server.get('/api/graphql?foo=baz', () => [ 200, {}, '{ "query": "baz" }']);
server.get('/api/graphql?foo=*', () => [ 200, {}, '{ "query": "xyz" }']);
server.get('/api/graphql', () => [ 200, {}, '{ "query": "none" }']);

let result;
result = await fetch('/api/graphql?foo=baz');
console.log(await result.json());
//=> { query: 'baz' }

result = await fetch('/api/graphql?foo=xyz');
console.log(await result.json());
//=> { query: 'xyz' }

result = await fetch('/api/graphql?foo=bar');
console.log(await result.json());
//=> { query: 'bar' }

result = await fetch('/api/graphql?foo=xyz&bar=123');
console.log(await result.json());
//=> { query: 'none' }

result = await fetch('/api/graphql');
console.log(await result.json());
//=> { query: 'none' }
```

Pattern Matching
------------------------------------------------------------------------------
Simple pattern based matching is supported in query string. Currently the only
pattern suported is '*', which matches anything, even an empty string. Multiple
patterns can be used in a query string, e.g.:

```js
'/api/graphql?foo=*&bar=*&var=1234'
```   

Please note: any other forms of paterns, including regular expressions, are not
supported.

Fallback
------------------------------------------------------------------------------
Fallback means doing pathname based matching while ignoring the query string altogether, that is, '/api/graphql?foo=abc&...' is equivalent to '/api/graphql' for the purpose of matching.  

`pretender-query-param-handler` performs URL matching in the following stages:
1) Returns an error message if no handler found for the pathname. 
2) Performs a search against pre-registered query string literals and returns the handler if there's a match.
3) Performa a search against a pre-registered query string patterns and returns the handler if there's a match.
4) Returns the handler for pathname.

E.g.:

```js
server.get('/api/graphql?foo=abc', /* handlerA */ () => [ 200, {}, '{ "query": "abc" }']);
server.get('/api/graphql?foo=*', /* handlerB */ () => [ 200, {}, '{ "query": "xyz" }']);
server.get('/api/graphql', /* handlerC */ () => [ 200, {}, '{ "query": "none" }']);

result = await fetch('/api/graphql?foo=abc');  // matches handlerA
console.log(await result.json());
//=> { query: 'abc' }

result = await fetch('/api/graphql?foo=xyz'); // matches handlerB
console.log(await result.json());
//=> { query: 'xyz' }

result = await fetch('/api/graphql?bar=xyz'); // fallback: matches handlerC
console.log(await result.json());
//=> { query: 'none' }

result = await fetch('/api/graphql?foo=xyz&bar=1234'); // fallback: matches handlerC
console.log(await result.json());
//=> { query: 'none' }

result = await fetch('/api/json?foo=xyz'); // no match
console.log(await result.json());
//=> Error message

```
Normalize URLs
------------------------------------------------------------------------------

In some cases, the order of the query params doesn't matter. Then you can set
`normalizeURLs` to true and the server will normalize (sort) the query params while mocking and matching

```js
import { QueryParamAwarePretender } from 'pretender-query-param-handler';

let server = new QueryParamAwarePretender({
  normalizeURLs: true
});

server.get('/api/graphql?foo=bar&bar=baz', () => [ 200, {}, '{ "query": { "foo": "bar", "bar": "baz" } }'),

let result;
result = await fetch('/api/graphql?bar=baz&foo=bar');
console.log(await result.json());
//=> { query: { foo: 'bar', bar: 'baz' } }

```

Limitations
------------------------------------------------------------------------------
Internet Explorer/IE is not supported due to the lack of proper Api support.

Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
