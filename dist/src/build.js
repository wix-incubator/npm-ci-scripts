'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.build = build;

var _child_process = require('child_process');

var _utils = require('./utils');

function npmVersion() {
  return parseFloat((0, _child_process.execSync)('npm --version | cut -d. -f1,2').toString());
}

function build() {
  if ((0, _utils.fileExists)('yarn.lock')) {
    (0, _utils.execCommand)('yarn install --frozen-lockfile', 'yarn install', 2);
  } else if ((0, _utils.fileExists)('.yarnrc')) {
    (0, _utils.execCommand)('yarn install', 'yarn install', 2);
  } else if ((0, _utils.fileExists)('package-lock.json')) {
    if (npmVersion() >= 5.7) {
      (0, _utils.execCommand)('npm ci --cache ~/.npm.$(npm --version)', 'npm ci', 2);
    } else {
      (0, _utils.execCommand)('npm install --cache ~/.npm.$(npm --version)', 'npm install', 2);
    }
  } else {
    (0, _utils.execCommand)('npm install --no-package-lock --cache ~/.npm.$(npm --version)', 'npm install', 2);
  }
  (0, _utils.execCommand)('npm run build --if-present');
  (0, _utils.execCommand)('npm test');
  (0, _utils.execCommand)('npm run release --if-present');
}