import { module, test } from 'qunit';
import Pretender from 'pretender';
import {
  buildQueryParamHandler,
  QueryParamAwarePretender,
} from 'pretender-query-param-handler';

module('pretender-query-params-handler', function () {
  module('pretender subclass', function (hooks) {
    hooks.beforeEach(function () {
      this.server = new QueryParamAwarePretender();
    });

    hooks.afterEach(function () {
      this.server.shutdown();
    });

    test('it basically works', async function (assert) {
      const handler = this.server.get('/api/graphql?foo=bar', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);

      assert.equal(
        handler.numberOfCalls,
        0,
        'the call count is initialized to 0 for the handler for the specific url and query param'
      );

      let result = await fetch('/api/graphql?foo=bar');

      assert.deepEqual(await result.json(), { query: 'bar' });
      assert.equal(
        handler.numberOfCalls,
        1,
        'the call count is updated for the handler for the specific url and query param'
      );
    });

    test('triggers unhandledRequest', async function (assert) {
      assert.expect(3);

      this.server.unhandledRequest = (verb, path) => {
        assert.equal(verb, 'GET', 'unhandledRequest for the correct HTTP verb');
        assert.equal(
          path,
          '/api/graphql?foo=baz',
          'unhandledRequest has full path'
        );

        throw new Error('Special Unhandled Error!!!');
      };

      this.server.get('/api/graphql?foo=bar', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);

      await assert.rejects(
        fetch('/api/graphql?foo=baz'),
        /Special Unhandled Error!!!/,
        'invokes the custom unhandledRequest'
      );
    });

    test('can match a get request with specific query params independently', async function (assert) {
      const fooBarHandler = this.server.get('/api/graphql?foo=bar', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);
      const fooBazHandler = this.server.get('/api/graphql?foo=baz', () => [
        200,
        {},
        JSON.stringify({ query: 'baz' }),
      ]);
      const noQueryParamHandler = this.server.get('/api/graphql', () => [
        200,
        {},
        JSON.stringify({ query: 'none' }),
      ]);

      let result = await fetch('/api/graphql?foo=baz');
      assert.deepEqual(await result.json(), { query: 'baz' }, 'can access baz');

      result = await fetch('/api/graphql?foo=bar');
      assert.deepEqual(await result.json(), { query: 'bar' }, 'can access bar');

      result = await fetch('/api/graphql');
      assert.deepEqual(
        await result.json(),
        { query: 'none' },
        'can request without QPs'
      );

      assert.equal(
        fooBarHandler.numberOfCalls,
        1,
        'the call count is updated for the handler for foo=bar'
      );

      assert.equal(
        fooBazHandler.numberOfCalls,
        1,
        'the call count is updated for the handler for foo=baz'
      );

      await fetch('/api/graphql');
      assert.equal(
        noQueryParamHandler.numberOfCalls,
        2,
        'the call count is 2 after requesting it twice updated for the handler for no query params'
      );

      await assert.rejects(
        fetch('/api/graphql?foo=derp'),
        /Pretender intercepted GET \/api\/graphql\?foo=derp \nbut found no handler for it because/,
        'throws when query param values do not match'
      );
    });

    test('should not fallback if no base handler defined', async function (assert) {
      this.server.get('/api/graphql?foo=bar', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);
      this.server.get('/api/graphql?foo=baz', () => [
        200,
        {},
        JSON.stringify({ query: 'baz' }),
      ]);

      let result = await fetch('/api/graphql?foo=baz');
      assert.deepEqual(await result.json(), { query: 'baz' }, 'can access baz');

      result = await fetch('/api/graphql?foo=bar');
      assert.deepEqual(await result.json(), { query: 'bar' }, 'can access bar');

      await assert.rejects(
        fetch('/api/graphql?foo=derp'),
        /Pretender intercepted GET \/api\/graphql\?foo=derp/,
        'throws when query values do not match'
      );
    });

    test('it allows clobbering', async function (assert) {
      this.server.get('/api/graphql?foo=bar', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);

      let result = await fetch('/api/graphql?foo=bar');
      assert.deepEqual(await result.json(), { query: 'bar' });

      this.server.get('/api/graphql?foo=bar', () => [
        200,
        {},
        JSON.stringify({ lol: 'not it' }),
      ]);

      result = await fetch('/api/graphql?foo=bar');
      assert.deepEqual(await result.json(), { lol: 'not it' });
    });
  });

  module('buildQueryParamHandler', function (hooks) {
    hooks.beforeEach(function () {
      this.server = new Pretender();
    });

    hooks.afterEach(function () {
      this.server.shutdown();
    });

    test('it basically works', async function (assert) {
      let handler = buildQueryParamHandler();

      handler.add('?foo=bar', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);
      this.server.get('/api/graphql', handler.handler);

      let result = await fetch('/api/graphql?foo=bar');
      assert.deepEqual(await result.json(), { query: 'bar' });
    });

    test('it matches strictly by default', async function (assert) {
      let handler = buildQueryParamHandler();

      handler.add('?foo=bar', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);
      this.server.get('/api/graphql', handler.handler);

      await assert.rejects(
        fetch('/api/graphql?foo=bar&derp=huzzah'),
        /pretender-query-param-handler: no handler was defined for `\?derp=huzzah&foo=bar`/
      );
    });

    test('can match a get request with specific query params independently', async function (assert) {
      let handler = buildQueryParamHandler();

      handler.add('?foo=bar', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);
      handler.add('?foo=baz', () => [
        200,
        {},
        JSON.stringify({ query: 'baz' }),
      ]);
      handler.add('', () => [200, {}, JSON.stringify({ query: 'none' })]);

      this.server.get('/api/graphql', handler.handler);

      let result = await fetch('/api/graphql?foo=baz');
      assert.deepEqual(await result.json(), { query: 'baz' }, 'can access baz');

      result = await fetch('/api/graphql?foo=bar');
      assert.deepEqual(await result.json(), { query: 'bar' }, 'can access bar');

      result = await fetch('/api/graphql');
      assert.deepEqual(
        await result.json(),
        { query: 'none' },
        'can request without QPs'
      );

      await assert.rejects(
        fetch('/api/graphql?foo=derp'),
        /pretender-query-param-handler: no handler was defined for `\?foo=derp`/,
        'throws when missing a match'
      );
    });

    test('it allows clobbering', async function (assert) {
      let handler = buildQueryParamHandler();

      handler.add('?foo=bar', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);
      this.server.get('/api/graphql', handler.handler);

      let result = await fetch('/api/graphql?foo=bar');
      assert.deepEqual(await result.json(), { query: 'bar' });

      handler.add('?foo=bar', () => [
        200,
        {},
        JSON.stringify({ lol: 'not it' }),
      ]);

      result = await fetch('/api/graphql?foo=bar');
      assert.deepEqual(await result.json(), { lol: 'not it' });
    });

    test('it works for paths with dynamic segments', async function (assert) {
      let handler = buildQueryParamHandler();

      handler.add('?foo=bar', (request) => [
        200,
        {},
        JSON.stringify({ postId: request.params.id, query: 'bar' }),
      ]);
      this.server.get('/api/posts/:id', handler.handler);

      let result = await fetch('/api/posts/1?foo=bar');
      assert.deepEqual(
        await result.json(),
        { postId: '1', query: 'bar' },
        'posts/1'
      );

      result = await fetch('/api/posts/2?foo=bar');
      assert.deepEqual(
        await result.json(),
        { postId: '2', query: 'bar' },
        'posts/2'
      );
    });
  });

  module('pattern match', function (hooks) {
    hooks.beforeEach(function () {
      this.server = new QueryParamAwarePretender();
    });

    hooks.afterEach(function () {
      this.server.shutdown();
    });

    test('pattern match should work', async function (assert) {
      const handler = this.server.get('/api/graphql?foo=*', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);

      assert.equal(
        handler.numberOfCalls,
        0,
        'the call count is initialized to 0 for the handler for the specific url and query param'
      );

      let result = await fetch('/api/graphql?foo=bar');

      assert.deepEqual(await result.json(), { query: 'bar' });
      assert.equal(
        handler.numberOfCalls,
        1,
        'the call count is updated for the handler for the specific url and query param'
      );
    });

    test('number of params does not match', async function (assert) {
      this.server.get('/api/graphql?foo=*', () => [
        200,
        {},
        JSON.stringify({ query: 'bar' }),
      ]);

      await assert.rejects(
        fetch('/api/graphql?foo=45&variable=123'),
        /Pretender intercepted GET \/api\/graphql\?foo=45&variable=123 \nbut found no handler for it/,
        'should return an error message'
      );
    });

    test('query string with multiple patterns should work', async function (assert) {
      this.server.get('/api/graphql?foo=*&bar=*&var=1234', () => [
        200,
        {},
        JSON.stringify({ foo: 'bar', bar: 'xyz' }),
      ]);

      let result = await fetch('/api/graphql?foo=abc&bar=xyz&var=1234');
      assert.deepEqual(await result.json(), { foo: 'bar', bar: 'xyz' });

      await assert.rejects(
        fetch('/api/graphql?foo=abc&bar=xyz&var=999'),
        /Pretender intercepted GET \/api\/graphql\?foo=abc&bar=xyz&var=999 \nbut found no handler for it/,
        'should return an error message'
      );
    });

    test('query string with incorrect order should fail', async function (assert) {
      this.server.get('/api/graphql?bar=*&foo=*&var=1234', () => [
        200,
        {},
        JSON.stringify({ foo: 'bar', bar: 'xyz' }),
      ]);

      await assert.rejects(
        fetch('/api/graphql?foo=abc&bar=xyz&var=1234'),
        /Pretender intercepted GET \/api\/graphql\?foo=abc&bar=xyz&var=1234 \nbut found no handler for it/,
        'should return an error message'
      );
    });
  });

  module('search string ordering', function (hooks) {
    hooks.beforeEach(function () {
      this.server = new QueryParamAwarePretender({ normalizeURLs: true });
    });

    hooks.afterEach(function () {
      this.server.shutdown();
    });

    test('query string with same order should work', async function (assert) {
      this.server.get('/api/graphql?foo=*&bar=*&var=1234', () => [
        200,
        {},
        JSON.stringify({ foo: 'bar', bar: 'xyz' }),
      ]);

      let result = await fetch('/api/graphql?foo=abc&bar=xyz&var=1234');
      assert.deepEqual(await result.json(), { foo: 'bar', bar: 'xyz' });

      await assert.rejects(
        fetch('/api/graphql?foo=abc&bar=xyz&var=999'),
        /Pretender intercepted GET \/api\/graphql\?foo=abc&bar=xyz&var=999 \nbut found no handler for it/,
        'should return an error message'
      );
    });

    test('query string with different order should work', async function (assert) {
      this.server.get('/api/graphql?bar=*&foo=*&var=1234', () => [
        200,
        {},
        JSON.stringify({ foo: 'bar', bar: 'xyz' }),
      ]);

      let result = await fetch('/api/graphql?foo=abc&bar=xyz&var=1234');
      assert.deepEqual(await result.json(), { foo: 'bar', bar: 'xyz' });

      await assert.rejects(
        fetch('/api/graphql?foo=abc&bar=xyz&var=999'),
        /Pretender intercepted GET \/api\/graphql\?foo=abc&bar=xyz&var=999 \nbut found no handler for it/,
        'should return an error message'
      );
    });
  });

  module('fallback', function (hooks) {
    hooks.beforeEach(function () {
      this.server = new QueryParamAwarePretender({ normalizeURLs: true });
    });

    hooks.afterEach(function () {
      this.server.shutdown();
    });

    test('fallback should work', async function (assert) {
      this.server.get('/api/graphql?foo=123&bar=456&var=1000', () => [
        200,
        {},
        JSON.stringify({ hint: 'all match' }),
      ]);
      this.server.get('/api/graphql?foo=*&bar=456&var=1000', () => [
        200,
        {},
        JSON.stringify({ hint: 'pattern match' }),
      ]);
      this.server.get('/api/graphql', () => [
        200,
        {},
        JSON.stringify({ hint: 'fallback' }),
      ]);

      let result = await fetch('/api/graphql?foo=123&bar=456&var=1000');
      assert.deepEqual(await result.json(), { hint: 'all match' });

      result = await fetch('/api/graphql?foo=xyz&bar=456&var=1000');
      assert.deepEqual(await result.json(), { hint: 'pattern match' });

      result = await fetch('/api/graphql?bar=hello&var=999');
      assert.deepEqual(await result.json(), { hint: 'fallback' });

      await assert.rejects(
        fetch('/api/graphql?foo=123&bar=456&var=999'),
        /Pretender intercepted GET \/api\/graphql\?foo=123&bar=456&var=999 \nbut found no handler for it/,
        'throws this error when query values do not match'
      );
    });
  });

  module('better error message', function (hooks) {
    hooks.beforeEach(function () {
      this.server = new QueryParamAwarePretender({ normalizeURLs: true });
    });

    hooks.afterEach(function () {
      this.server.shutdown();
    });

    test('should error out with values not match', async function (assert) {
      this.server.get('/api/graphql?foo=123&bar=456&var=1000', () => [
        200,
        {},
        JSON.stringify({ foo: '123', bar: '456', var: '1000' }),
      ]);
      this.server.get('/api/graphql?foo=john&bar=world&var=hello', () => [
        200,
        {},
        JSON.stringify({ foo: '123', bar: '456', var: '1000' }),
      ]);

      await assert.rejects(
        fetch('/api/graphql?foo=123&bar=456&var=999'),
        /query parameter values of:\n\t\{\n\t\tbar=456\n\t\tfoo=123\n\t\tvar=999\n\t\}/,
        'throws this error when query values do not match'
      );
    });

    test('should error out with names not match', async function (assert) {
      this.server.get('/api/graphql?foo=123&bar=456&variable=1000', () => [
        200,
        {},
        JSON.stringify({ foo: '123', bar: '456', variable: '1000' }),
      ]);

      await assert.rejects(
        fetch('/api/graphql?foo=123&bar=456&var=999'),
        /query parameter names of:\n\t\[bar,foo,var\]/,
        'throws this error when query names do not match'
      );
    });
  });

  module('paththrough', function (hooks) {
    hooks.beforeEach(function () {
      this.server = new QueryParamAwarePretender({ normalizeURLs: true });
    });

    hooks.afterEach(function () {
      this.server.shutdown();
    });

    test('basic case without query parameters', async function (assert) {
      this.server.get(
        'http://worldtimeapi.org/api/timezone/Etc/UTC',
        this.server.passthrough
      );

      let now = new Date();
      let result = await fetch('http://worldtimeapi.org/api/timezone/Etc/UTC');

      assert.equal((await result.json()).day_of_week, now.getUTCDay());
    });

    test('should work if query params match', async function (assert) {
      this.server.get(
        'http://worldtimeapi.org/api/timezone/Etc/UTC?__nonpassthrough__=nonpassthrough',
        () => [200, {}, JSON.stringify({ day_of_week: 100 })]
      );
      this.server.get(
        'http://worldtimeapi.org/api/timezone/Etc/UTC?__passthrough___=passthrough',
        this.server.passthrough
      );

      let result = await fetch(
        'http://worldtimeapi.org/api/timezone/Etc/UTC?__nonpassthrough__=nonpassthrough'
      );
      assert.equal((await result.json()).day_of_week, 100);

      let now = new Date();
      result = await fetch(
        'http://worldtimeapi.org/api/timezone/Etc/UTC?__passthrough___=passthrough'
      );
      assert.equal((await result.json()).day_of_week, now.getUTCDay());
    });
  });

  module('pretender arguments', function (hooks) {
    hooks.beforeEach(function () {
      this.server = new QueryParamAwarePretender(() => {}, {
        forcePassthrough: true,
      });
    });

    hooks.afterEach(function () {
      this.server.shutdown();
    });

    test('passing in arguments to pretender-query-param-handler works', async function (assert) {
      assert.ok(
        this.server.forcePassthrough,
        'arguments are passed along as expected'
      );
    });
  });

  module('query params for handlerFound', function (hooks) {
    hooks.beforeEach(function () {
      this.server = new QueryParamAwarePretender(() => {}, {
        forcePassthrough: true,
      });
    });

    hooks.afterEach(function () {
      this.server.shutdown();
    });

    test('query params are used to find the handler', async function (assert) {
      assert.expect(1)
      const handler = this.server.get('/api/graphql?foo=bar', (request) => {

        assert.deepEqual(request.queryParams, { foo : 'bar' }, 'query params do exist on the request');

        return [
          200,
          {},
          JSON.stringify({ query: 'bar' }),
        ]
      }
    );

    await fetch('/api/graphql?foo=bar');
    });
  });
});
