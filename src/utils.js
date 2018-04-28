import {writeFileSync, readFileSync, statSync} from 'fs';
import {execSync} from 'child_process';

export function logBlockOpen(log) {
  console.log('##teamcity[blockOpened name=\'' + log + '\']');
}

export function logBlockClose(log) {
  console.log('##teamcity[blockClosed name=\'' + log + '\']');
}

export function execCommand(cmd, log, retries) {
  log = log || cmd;
  logBlockOpen(log);
  try {
    execSync(cmd, {stdio: 'inherit'});
    logBlockClose(log);
  } catch (e) {
    logBlockClose(log);
    if (retries > 0) {
      const retry = parseInt((log.match(/ \(retry (\d+)\)/) || ['', '0'])[1], 10);
      log = log.replace(/ \(retry (\d+)\)/, '') + ' (retry ' + (retry + 1) + ')';
      execCommand(cmd, log, retries - 1);
    } else {
      process.exit(e.status);
    }
  }
}

export function fileExists(name) {
  try {
    statSync(name);
    return true;
  } catch (e) {
    return false;
  }
}

export function writeJsonFile(name, pkg) {
  writeFileSync(name, JSON.stringify(pkg, null, 2), 'utf8');
}

export function readJsonFile(name) {
  return JSON.parse(readFileSync(name, 'utf8'));
}

