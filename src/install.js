import {execSync} from 'child_process';
import {fileExists, execCommand, execCommandAsync} from './utils';

function npmVersion() {
  return parseFloat(execSync('npm --version | cut -d. -f1,2').toString());
}

function npmInstallExec(cmd) {
  const params = '--cache ~/.npm.$(npm --version)';
  return execCommandAsync(`${cmd} ${params}`, 'npm install', 2, `npm cache clean ${params} --force`);
}


export async function install() {
  if (fileExists('yarn.lock')) {
    await execCommand('yarn install --frozen-lockfile', 'yarn install', 2);
  } else if (fileExists('.yarnrc')) {
    await execCommand('yarn install', 'yarn install', 2);
  } else if (fileExists('package-lock.json')) {
    if (npmVersion() >= 5.7) {
      await npmInstallExec('npm ci');
    } else {
      await npmInstallExec('npm install');
    }
  } else {
    await npmInstallExec('npm install --no-package-lock');
  }
}
