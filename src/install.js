import {fileExists, execCommand, npmInstallExec, npmVersion} from './utils';
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
