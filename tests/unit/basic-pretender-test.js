import { module, test } from 'qunit';
import Pretender from 'pretender';

module('basic pretender functionality', function (hooks) {
  hooks.beforeEach(function () {
    this.server = new Pretender();
  });

  hooks.afterEach(function () {
    this.server.shutdown();
  });

  test('can mock a get request', async function (assert) {
    this.server.get('/api/posts/:id', (request) => [
      200,
      {},
      JSON.stringify({ id: request.params.id }),
    ]);

    let result = await fetch('/api/posts/3');

    assert.deepEqual(await result.json(), { id: '3' });
  });

  test('can match a get request with specific query params independently', async function (assert) {
    this.server.get('/api/graphql', (request) => {
      switch (request.queryParams.foo) {
        case 'bar':
          return [200, {}, JSON.stringify({ query: 'bar' })];
        case 'baz':
          return [200, {}, JSON.stringify({ query: 'baz' })];
      }
    });

    let result = await fetch('/api/graphql?foo=baz');
    assert.deepEqual(await result.json(), { query: 'baz' }, 'can access baz');

    result = await fetch('/api/graphql?foo=bar');
    assert.deepEqual(await result.json(), { query: 'bar' }, 'can access bar');

    await assert.rejects(
      (async () => {
        result = await fetch('/api/graphql?foo=derp');

        assert.deepEqual(
          await result.json(),
          { query: 'bar' },
          'can access bar'
        );
      })(),
      /Nothing returned by handler for \/api\/graphql\?foo=derp/,
      'throws when missing a match'
    );
  });
});
