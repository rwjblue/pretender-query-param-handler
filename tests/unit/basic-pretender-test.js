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
});
