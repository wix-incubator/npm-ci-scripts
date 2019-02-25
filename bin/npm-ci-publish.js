import {publish} from '../src/publish';
import {writeFileSync, unlinkSync} from 'fs';
import {publishScoped} from '../src/publish-scoped';
import {fileExists, logBlockOpen, logBlockClose, execCommand, readJsonFile} from '../src/utils';

let unlinkWhenDone = false;
if (!fileExists('.npmrc')) {
  writeFileSync('.npmrc', '@wix:registry=http://npm.dev.wixpress.com');
  unlinkWhenDone = true;
}
execCommand('npm run release --if-present');
if (unlinkWhenDone) {
  unlinkSync('.npmrc');
}

async function runPublish() {
  logBlockOpen('npm publish');
  await publish();
  logBlockClose('npm publish');

  if (process.env.PUBLISH_SCOPED) {
    logBlockOpen('npm publish to wix scope');
    await publishScoped();
    logBlockClose('npm publish to wix scope');
  }
}

const pkg = readJsonFile('package.json');
if (pkg.private) {
  console.log('Skipping publish (probably no change in tarball)');
  console.log(`##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; No publish']`);
} else {
  runPublish();
}
