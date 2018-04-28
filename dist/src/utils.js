'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

exports.logBlockOpen = logBlockOpen;
exports.logBlockClose = logBlockClose;
exports.execCommand = execCommand;
exports.fileExists = fileExists;
exports.writeJsonFile = writeJsonFile;
exports.readJsonFile = readJsonFile;

var _fs = require('fs');

var _child_process = require('child_process');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function logBlockOpen(log) {
  console.log('##teamcity[blockOpened name=\'' + log + '\']');
}

function logBlockClose(log) {
  console.log('##teamcity[blockClosed name=\'' + log + '\']');
}

function execCommand(cmd, log, retries) {
  log = log || cmd;
  logBlockOpen(log);
  try {
    (0, _child_process.execSync)(cmd, { stdio: 'inherit' });
    logBlockClose(log);
  } catch (e) {
    logBlockClose(log);
    if (retries > 0) {
      var retry = parseInt((log.match(/ \(retry (\d+)\)/) || ['', '0'])[1], 10);
      log = log.replace(/ \(retry (\d+)\)/, '') + ' (retry ' + (retry + 1) + ')';
      execCommand(cmd, log, retries - 1);
    } else {
      process.exit(e.status);
    }
  }
}

function fileExists(name) {
  try {
    (0, _fs.statSync)(name);
    return true;
  } catch (e) {
    return false;
  }
}

function writeJsonFile(name, pkg) {
  (0, _fs.writeFileSync)(name, (0, _stringify2.default)(pkg, null, 2), 'utf8');
}

function readJsonFile(name) {
  return JSON.parse((0, _fs.readFileSync)(name, 'utf8'));
}