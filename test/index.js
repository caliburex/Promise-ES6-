const CaliburPromise = require('../src/index.js');

function deferred() {
  let dfd = {};

  dfd.promise = new CaliburPromise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });

  return dfd;
}

CaliburPromise.deferred = deferred;

module.exports = CaliburPromise;