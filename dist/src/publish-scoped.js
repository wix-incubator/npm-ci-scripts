'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.publishScoped = publishScoped;

var _publish = require('./publish');

var _child_process = require('child_process');

var _utils = require('./utils');

function publishToRegistry(pkg, to) {
  pkg.publishConfig.registry = to;
  pkg.publishConfig['@wix:registry'] = to;
  (0, _utils.writeJsonFile)('package.json', pkg);
  console.log('Publishing', pkg.name, 'to', to);
  (0, _publish.publish)('--ignore-scripts');
}

function validate(pkg) {
  if (isScoped(pkg.name)) {
    if (!isWixScoped(pkg.name)) {
      return 'package uses unsupported scope: ' + pkg.name;
    }
  } else if (!isWixRegistry(pkg.publishConfig.registry)) {
    return 'package is being published outside wix registry: ' + pkg.publishConfig.registry;
  }
  if (pkg.publishScoped === false || (0, _utils.fileExists)('publish-scoped.ignore')) {
    return 'developer switched a feature off';
  }
  return true;
}

function isWixRegistry(registry) {
  return registry.indexOf('.dev.wix') >= 0;
}

function isWixScoped(name) {
  return name.indexOf('@wix/') >= 0;
}

function isScoped(name) {
  return name.indexOf('@') >= 0;
}

function getScopedName(name) {
  return '@wix/' + name;
}

function run(cmd) {
  (0, _child_process.execSync)(cmd, { stdio: 'inherit' });
}

function updateLockFileIfExists(fileName, packageName) {
  if ((0, _utils.fileExists)(fileName)) {
    console.log('Updating lock file', fileName, 'to use', packageName);
    var json = (0, _utils.readJsonFile)(fileName);
    json.name = packageName;
    (0, _utils.writeJsonFile)(fileName, json);
  }
}

function updateLockFiles(packageName) {
  updateLockFileIfExists('npm-shrinkwrap.json', packageName);
  updateLockFileIfExists('package-lock.json', packageName);
}

function publishScoped() {
  var pkg = (0, _utils.readJsonFile)('package.json');
  var bkp = (0, _utils.readJsonFile)('package.json');

  var result = validate(pkg);
  if (result === true) {
    pkg.name = isScoped(pkg.name) ? pkg.name : getScopedName(pkg.name);
    try {
      updateLockFiles(pkg.name);

      publishToRegistry(pkg, 'http://npm.dev.wixpress.com/');
      publishToRegistry(pkg, 'https://registry.npmjs.org/');

      console.log('Granting access to "readonly" group to access', pkg.name);
      run('npm access grant read-only wix:readonly ' + pkg.name + ' --@wix:registry=https://registry.npmjs.org/');

      updateLockFiles(bkp.name);
      (0, _utils.writeJsonFile)('package.json', bkp);
    } catch (error) {
      console.log('Failed to publish a scoped package, cause:', error);
      updateLockFiles(bkp.name);
      (0, _utils.writeJsonFile)('package.json', bkp);
      process.exit(1);
    }
  } else {
    console.log('Current package is not publishable with scoped name, cause:', result);
  }
}