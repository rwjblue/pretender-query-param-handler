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

server.get('/api/graphql?foo=bar', () => [ 200, {}, '{ "query": "bar" }'),
server.get('/api/graphql?foo=baz', () => [ 200, {}, '{ "query": "baz" }'),
server.get('/api/graphql', () => [ 200, {}, '{ "query": "none" }'),

let result;
result = await fetch('/api/graphql?foo=baz');
console.log(await result.json());
//=> { query: 'baz' }

result = await fetch('/api/graphql?foo=bar');
console.log(await result.json());
//=> { query: 'bar' }

result = await fetch('/api/graphql');
console.log(await result.json());
//=> { query: 'none' }
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


Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
