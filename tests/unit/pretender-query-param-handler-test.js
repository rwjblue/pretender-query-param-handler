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
        /Pretender intercepted GET \/api\/graphql\?foo=derp but no handler was defined for this type of request/,
        'throws when missing a match'
      );
    });

    test('can match a request with query params in any order', async function (assert) {
      this.server = new QueryParamAwarePretender({
        normalizeURLs: true,
      });
      this.server.get('/api/graphql?foo=bar&bar=baz', () => [
        200,
        {},
        JSON.stringify({ query: { foo: 'bar', bar: 'baz' } }),
      ]);

      let result = await fetch('/api/graphql?bar=baz&foo=bar');
      assert.deepEqual(await result.json(), {
        query: { foo: 'bar', bar: 'baz' },
      });

      result = await fetch('/api/graphql?foo=bar&bar=baz');
      assert.deepEqual(await result.json(), {
        query: { foo: 'bar', bar: 'baz' },
      });

      await assert.rejects(
        fetch('/api/graphql?foo=derp'),
        /Pretender intercepted GET \/api\/graphql\?foo=derp but no handler was defined for this type of request/,
        'throws when missing a match'
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
});
