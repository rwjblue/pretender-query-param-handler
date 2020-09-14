'use strict';

module.exports = async function () {
  return {
    scenarios: [
      {
        name: 'pretender-3.4',
        npm: {
          devDependencies: {
            pretender: '~3.4.2',
          },
        },
      },
    ],
  };
};
