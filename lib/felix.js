'use strict';
const Aws = require('./aws'),
  fs = require('fs'),
  path = require('path');

function checkKeyState (keys) {
  const activeKeys = keys.filter(k => k.Status === 'Active');
  if (activeKeys.length > 1) {
    throw new Error(`User has multiple active keys! Skipping...`);
  } else if (activeKeys.length === 1) {
    return activeKeys[0];
  } else {
    return {};
  }
}

function loadPlugin (plugin, config) {
  return new Promise((resolve, reject) => {
    if (!config.hasOwnProperty('plugins') || !config.plugins.hasOwnProperty(plugin)) {
      return reject(new Error(`Plugin ${plugin} has no configuration!`));
    }

    fs.readdir(path.resolve(__dirname, './plugins'), (err, files) => {
      if (files.map(p => p.replace('.js', '')).indexOf(plugin) === -1) {
        return reject(new Error(`Unable to find requested plugin ${plugin}.`), err);
      } else {
        const Plugin = require(`./plugins/${plugin}`);
        return resolve(new Plugin(config.plugins[plugin]));
      }
    });
  });
}

function parseMetadata (user) {
  let service = user.Path.split('/')[2],
    userMetadata = user.UserName,
    metadata = user.Path + userMetadata;

  return {
    service,
    metadata
  };
}

module.exports.rotateKeyForUser = function rotate (user, config) {
  let {service, metadata} = parseMetadata(user),
    plugin = {}, keys = {}, activeKey = {},
    iam = new Aws(),
    report = {
      status: 'started',
      user: user.Arn,
      startedAt: new Date()
    };

  return loadPlugin(service, config)
    .then(discoveredPlugin => {
      plugin = discoveredPlugin;
      iam.deleteDeactivatedKeysForUser(user.UserName);
    })
    .then(() => {
      return iam.getKeysForUser(user.UserName);
    })
    .then(k => {
      keys = k;
      return checkKeyState(keys);
    })
    .then(aKey => {
      activeKey = aKey;
      if (activeKey.hasOwnProperty('AccessKeyId')) {
        report.oldKey = activeKey.AccessKeyId;
        return plugin.checkForActiveKey(metadata, activeKey.AccessKeyId);
      } else {
        return {};
      }
    })
    .then(() => {
      return iam.generateKey(user.UserName);
    })
    .then(newKey => {
      report.newKey = newKey.AccessKeyId;
      return plugin.createOrUpdateKey(metadata, newKey);
    })
    .then(() => {
      if (activeKey.hasOwnProperty('AccessKeyId')) {
        return iam.deactivateKey(user.UserName, activeKey);
      } else {
        return {};
      }
    })
    .then(() => {
      report.finishedAt = new Date();
      report.status = 'success';
      return report;
    })
    .catch(err => {
      report.finishedAt = new Date();
      report.error = err.message;
      report.status = 'error';
      return report;
    });
};

if (process.env.NODE_ENV === 'test') {
  module.exports.checkKeyState = checkKeyState;
  module.exports.loadPlugin = loadPlugin;
  module.exports.parseMetadata = parseMetadata;
}
