/* globals requirejs */
import require from 'require';
import QUnit from 'qunit';

QUnit.config.autostart = false;

function loadTests() {
  for (let moduleName in requirejs.entries) {
    if (moduleName.endsWith('test')) {
      require(moduleName);
    }
  }
}

loadTests();
QUnit.start();
