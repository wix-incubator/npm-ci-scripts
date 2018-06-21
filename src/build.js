import {execSync} from 'child_process';
import {fileExists, execCommand} from './utils';

function npmVersion() {
  return parseFloat(execSync('npm --version | cut -d. -f1,2').toString());
}

function setApplitoolsId() {
  let batchId = '';

  try {
    const headHash = execSync('git rev-parse --verify HEAD');
    const parentHashes = execSync(`git rev-list --parents -n 1 ${headHash.toString()}`);
    const hashes = parentHashes.toString().split(' ');
    const hasTwoParents = hashes.length === 3;
    const hashIndex = hasTwoParents ? 2 : 0;

    batchId = hashes[hashIndex].trim();
  } catch (e) {
    batchId = process.env.BUILD_VCS_NUMBER;
  }

  process.env.APPLITOOLS_BATCH_ID = batchId;
}

export function build() {
  setApplitoolsId();

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

  if (process.env.agentType === 'pullrequest') {
    execCommand('npm run pr-postbuild --if-present');
  }

  execCommand('npm test');
}
