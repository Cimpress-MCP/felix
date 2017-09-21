const sinon = require('sinon'),
  fs = require('fs'),
  path = require('path');

var options = {};

const spy = sinon.spy(function (params) {
  return new Promise((resolve, reject) => {
    resolve(JSON.parse(fs.readFileSync(path.resolve(__dirname, 'request/gitlab' + params.uri.replace(/\//g, '-')), 'utf8').trim()));
  });
});

module.exports.defaults = function request (opt) {
  options = opt;
  return spy;
};

module.exports.options = options;
module.exports.spy = spy;
