import {publish} from '../src/publish';
import {publishScoped} from '../src/publish-scoped';
import {logBlockOpen, logBlockClose, execCommand, readJsonFile, writeJsonFile} from '../src/utils';
import {writeFileSync, unlinkSync} from 'fs';

let pkg = readJsonFile('package.json');
const previousVersion = pkg.version;
if (pkg.name.indexOf('@wix/') === 0) {
  pkg.publishConfig = {registry: 'https://registry.npmjs.org/'};
  writeJsonFile('package.json', pkg);
  writeFileSync('.npmrc', '@wix:registry=https://registry.npmjs.org/'); //trust latest from npmjs
}
execCommand('npm run release --if-present');
unlinkSync('.npmrc');
pkg = readJsonFile('package.json');
if (pkg.private && previousVersion !== pkg.version) {
  console.log('forcing republish in order to sync versions');
  delete pkg.private;
  writeJsonFile('package.json', pkg);
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

if (pkg.private) {
  console.log('Skipping publish (probably no change in tarball)');
  console.log(`##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; No publish']`);
} else {
  runPublish();
}
