import {publish} from '../src/publish';
import {publishScoped} from '../src/publish-scoped';
import {logBlockOpen, logBlockClose, execCommand, readJsonFile, writeJsonFile} from '../src/utils';

execCommand('npm run release --if-present');

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
  if (pkg.name.indexOf('@wix/') === 0) {
    pkg.publishConfig = {registry: 'https://registry.npmjs.org/'};
    writeJsonFile('package.json', pkg);
  }
  runPublish();
}
