import {execSync} from 'child_process';
import {fileExists, execCommand} from './utils';

function npmVersion() {
  return parseFloat(execSync('npm --version | cut -d. -f1,2').toString());
}

function npmInstallExec(cmd) {
  const params = '--cache ~/.npm.$(npm --version)';
  execCommand(`${cmd} ${params}`, 'npm install', 2, `npm cache clean ${params} --force`);
}


export function install() {
  if (fileExists('yarn.lock')) {
    execCommand('yarn install --frozen-lockfile', 'yarn install', 2);
  } else if (fileExists('.yarnrc')) {
    execCommand('yarn install', 'yarn install', 2);
  } else if (fileExists('package-lock.json')) {
    if (npmVersion() >= 5.7) {
      npmInstallExec('npm ci');
    } else {
      npmInstallExec('npm install');
    }
  } else {
    npmInstallExec('npm install --no-package-lock');
  }
}
