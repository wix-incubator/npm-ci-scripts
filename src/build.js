import {execSync} from 'child_process';
import {fileExists, execCommand} from './utils';
import {setApplitoolsId} from './applitoolsScripts';

function npmVersion() {
  return parseFloat(execSync('npm --version | cut -d. -f1,2').toString());
}

function getNpmConfigFlags(shouldRunInDebug) {
  return [
    '--cache ~/.npm.$(npm --version)',
    ...(shouldRunInDebug ? ['--prefer-online', '--loglevel verbose'] : [])
  ].join(' ');
}

export function build() {
  const shouldRunInDebug = process.env.NPM_CI_DEBUG === 'true';
  console.log(`build in debug mode: ${shouldRunInDebug}`);

  if (process.env.APPLITOOLS_GITHUB_FT) {
    setApplitoolsId();
  }

  if (fileExists('yarn.lock') || fileExists('.yarnrc')) {
    if (shouldRunInDebug) {
      execCommand('yarn cache clean');
    }
    const yarnConfigFlag = shouldRunInDebug ? '--verbose' : '';
    if (fileExists('yarn.lock')) {
      execCommand(`yarn install --frozen-lockfile ${yarnConfigFlag}`, 'yarn install', 2);
    } else {
      execCommand(`yarn install ${yarnConfigFlag}`, 'yarn install', 2);
    }
  } else {
    const npmConfigFlags = getNpmConfigFlags(shouldRunInDebug);
    if (fileExists('package-lock.json')) {
      if (npmVersion() >= 5.7) {
        execCommand(`npm ci ${npmConfigFlags}`, 'npm ci', 2);
      } else {
        execCommand(`npm install ${npmConfigFlags}`, 'npm install', 2);
      }
    } else {
      execCommand(`npm install --no-package-lock ${npmConfigFlags}`, 'npm install', 2);
    }
  }

  execCommand('npm run build --if-present');

  if (process.env.agentType === 'pullrequest') {
    execCommand('npm run pr-postbuild --if-present');
  }

  execCommand('npm test');
}
