import {execSync} from 'child_process';
import {fileExists, execCommand} from './utils';
import {setApplitoolsId} from './applitoolsScripts';

function npmVersion() {
  return parseFloat(execSync('npm --version | cut -d. -f1,2').toString());
}

export function build(buildType) {
  if (process.env.APPLITOOLS_GITHUB_FT) {
    setApplitoolsId();
  }

  if (fileExists('yarn.lock')) {
    console.log('yarn.lock exists, runing `yarn install`');
    execCommand('yarn install --frozen-lockfile', 'yarn install', 2);

  } else if (fileExists('.yarnrc')) {
    console.log('.yarnrc exists, runing `yarn install`');
    execCommand('yarn install', 'yarn install', 2);

  } else if (fileExists('package-lock.json')) {
    const currentNpmVersion = npmVersion();
    if (currentNpmVersion >= 5.7) {
      console.log(`package-lock.json exists and npm version is ${currentNpmVersion}, running \`npm ci\``);
      execCommand('npm ci --cache ~/.npm.$(npm --version)', 'npm ci', 2);
    } else {
      console.log(`package-lock.json exists but npm version ${currentNpmVersion} is smaller than 5.7, running \`npm install\``);
      execCommand('npm install --cache ~/.npm.$(npm --version)', 'npm install', 2);
    }
    
  } else {
    console.log('there is no lock-files, running `npm install`');
    execCommand('npm install --no-package-lock --cache ~/.npm.$(npm --version)', 'npm install', 2);
  }
  execCommand('npm run build --if-present');

  if (process.env.agentType === 'pullrequest') {
    execCommand('npm run pr-postbuild --if-present');
  }

  execCommand(`npm run ${buildType}`);
}
