'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

class CustomAddon extends EmberAddon {
  // there is no way to disable ember-cli's build pipeline from trying to import jQuery if you don't have ember-source
  _addJqueryInLegacyEmber() {}
}

module.exports = function (defaults) {
  const app = new CustomAddon(defaults, {
    // Add options here
    trees: {
      public: null,
    },

    vendorFiles: {
      'ember.js': null,
      'handlebars.js': null,
    },
  });

  app.registry.add('template', {
    name: 'fake-template-compiler',
    toTree: (tree) => tree,
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  app.import('node_modules/qunit/qunit/qunit.css', { type: 'test' });

  const { maybeEmbroider } = require('@embroider/test-setup');
  return maybeEmbroider(app, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
  });
};
