'use strict';

const validatePeerDependencies = require('validate-peer-dependencies');

module.exports = {
  name: require('./package').name,

  init() {
    this._super.init.apply(this, arguments);

    validatePeerDependencies(__dirname, {
      resolvePeerDependenciesFrom: this.parent.root,
    });
  },
};
