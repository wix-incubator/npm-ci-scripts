'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.publish = publish;

var _utils = require('./utils');

var _child_process = require('child_process');

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _semver = require('semver');

var _semver2 = _interopRequireDefault(_semver);

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
var LATEST_TAG = 'latest';
var NEXT_TAG = 'next';
var OLD_TAG = 'old';

function getPackageInfo(name, registry) {
  try {
    return JSON.parse((0, _child_process.execSync)('npm show ' + name + ' --registry=' + registry + ' --json'));
  } catch (error) {
    if (error.stderr.toString().includes('npm ERR! code E404')) {
      console.error(_chalk2.default.yellow('\nWarning: package not found. Possibly not published yet'));
      return {};
    }
    throw error;
  }
}

function shouldPublishPackage(info, version) {
  var remoteVersionsList = info.versions || [];
  return !remoteVersionsList.includes(version);
}

function getTag(info, version) {
  var isLessThanLatest = function isLessThanLatest() {
    return _semver2.default.lt(version, (0, _lodash.get)(info, 'dist-tags.latest'));
  };
  var isPreRelease = function isPreRelease() {
    return _semver2.default.prerelease(version) !== null;
  };

  if (isLessThanLatest()) {
    return OLD_TAG;
  } else if (isPreRelease()) {
    return NEXT_TAG;
  } else {
    return LATEST_TAG;
  }
}

function execPublish(info, version, flags) {
  var publishCommand = 'npm publish --tag=' + getTag(info, version) + ' ' + flags;
  console.log(_chalk2.default.magenta('Running: "' + publishCommand + '" for ' + info.name + '@' + version));
  (0, _child_process.execSync)(publishCommand);
}

// 1. verify that the package can be published by checking the registry.
//   (Can only publish versions that doesn't already exist)
// 2. choose a tag ->
// * `old` for a release that is less than latest (semver).
// * `next` for a prerelease (beta/alpha/rc).
// * `latest` as default.
// 3. perform npm publish using the chosen tag.
function publish() {
  var flags = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

  var pkg = (0, _utils.readJsonFile)('package.json');
  var registry = (0, _lodash.get)(pkg, 'publishConfig.registry', DEFAULT_REGISTRY);
  var name = pkg.name,
      version = pkg.version;

  var info = getPackageInfo(name, registry);

  console.log('Starting the release process for ' + _chalk2.default.bold(name) + '\n');

  if (!shouldPublishPackage(info, version)) {
    console.log(_chalk2.default.blue(name + '@' + version + ' is already exist on registry ' + registry));
    console.log('\nNo publish performed');
  } else {
    execPublish(info, version, flags);
    console.log(_chalk2.default.green('\nPublish "' + name + '@' + version + '" successfully to ' + registry));
  }
}