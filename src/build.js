import {execSync} from 'child_process';
import {fileExists, execCommand} from './utils';

function npmVersion() {
  return parseFloat(execSync('npm --version | cut -d. -f1,2').toString());
}

export function build() {
  if (fileExists('yarn.lock')) {
    execCommand('yarn install --frozen-lockfile', 'yarn install', 2);
  } else if (fileExists('.yarnrc')) {
    execCommand('yarn install', 'yarn install', 2);
  } else if (fileExists('package-lock.json')) {
    if (npmVersion() >= 5.7) {
      execCommand('npm ci --cache ~/.npm.$(npm --version)', 'npm ci', 2);
    } else {
      execCommand('npm install --cache ~/.npm.$(npm --version)', 'npm install', 2);
    }
  } else {
    execCommand('npm install --no-package-lock --cache ~/.npm.$(npm --version)', 'npm install', 2);
  }
  execCommand('npm run build --if-present');
  execCommand('npm test');
}
