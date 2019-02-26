import {publish} from '../src/publish';
import {publishScoped} from '../src/publish-scoped';
import {logBlockOpen, logBlockClose, execCommand, readJsonFile, writeJsonFile} from '../src/utils';

const previousVersion = readJsonFile('package.json').version;
execCommand('npm run release --if-present');
const pkg = readJsonFile('package.json');
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
  if (pkg.name.indexOf('@wix/') === 0) {
    pkg.publishConfig = {registry: 'https://registry.npmjs.org/'};
    writeJsonFile('package.json', pkg);
  }
  runPublish();
}
