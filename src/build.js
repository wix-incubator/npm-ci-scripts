import {execSync} from 'child_process';
import {fileExists, execCommand} from './utils';
import {setApplitoolsId} from './applitoolsScripts';

function getYarnFlags(frozenLockfile, shouldRunInDebug) {
  return [
    ...(frozenLockfile ? ['--frozen-lockfile'] : []),
    ...(shouldRunInDebug ? ['--verbose'] : [])
  ].join(' ');
}

function yarnInstall(shouldRunInDebug) {
  if (shouldRunInDebug) {
    execCommand('yarn cache clean');
  }
  const yarnConfigFlags = getYarnFlags(fileExists('yarn.lock'), shouldRunInDebug);
  execCommand(`yarn install ${yarnConfigFlags}`, 'yarn install', 2);
}

function npmVersion() {
  return parseFloat(execSync('npm --version | cut -d. -f1,2').toString());
}

function getNpmFlags(shouldRunInDebug) {
  return [
    '--cache ~/.npm.$(npm --version)',
    ...(shouldRunInDebug ? ['--prefer-online', '--loglevel verbose'] : [])
  ].join(' ');
}

function npmInstall(shouldRunInDebug) {
  const npmFlags = getNpmFlags(shouldRunInDebug);
  if (fileExists('package-lock.json')) {
    if (npmVersion() >= 5.7) {
      execCommand(`npm ci ${npmFlags}`, 'npm ci', 2);
    } else {
      execCommand(`npm install ${npmFlags}`, 'npm install', 2);
    }
  } else {
    execCommand(`npm install --no-package-lock ${npmFlags}`, 'npm install', 2);
  }
}

export function build(buildType) {
  const shouldRunInDebug = process.env.NPM_CI_DEBUG === 'true';
  console.log(`build in debug mode: ${shouldRunInDebug}`);

  if (process.env.APPLITOOLS_GITHUB_FT) {
    setApplitoolsId();
  }

  if (fileExists('yarn.lock') || fileExists('.yarnrc')) {
    yarnInstall(shouldRunInDebug);
  } else {
    npmInstall(shouldRunInDebug);
  }

  execCommand('npm run build --if-present');

  if (process.env.agentType === 'pullrequest') {
    execCommand('npm run pr-postbuild --if-present');
  }

  execCommand(`npm run ${buildType}`);
}
