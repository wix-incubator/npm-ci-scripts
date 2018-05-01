import {publish} from '../src/publish';
import {publishScoped} from '../src/publish-scoped';
import {logBlockOpen, logBlockClose, execCommand, readJsonFile} from '../src/utils';

execCommand('npm run release --if-present');

const pkg = readJsonFile('package.json');
if (pkg.private) {
  console.log('Skipping publish (probably no change in tarball)');
} else {
  logBlockOpen('npm publish');
  publish();
  logBlockClose('npm publish');

  if (process.env.PUBLISH_SCOPED) {
    logBlockOpen('npm publish to wix scope');
    publishScoped();
    logBlockClose('npm publish to wix scope');
  }
}
