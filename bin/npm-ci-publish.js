import {get} from 'lodash';
import {publish} from '../src/publish';
import {publishScoped} from '../src/publish-scoped';
import {logBlockOpen, logBlockClose, execCommand, readJsonFile, fileExists} from '../src/utils';

const pkg = readJsonFile('package.json');

if (fileExists('yarn.lock') && get(pkg, 'scripts.release')) {
  execCommand('yarn release');
} else {
  execCommand('npm run release --if-present');
}

if (pkg.private) {
  console.log('Skipping publish (probably no change in tarball)');
  console.log(`##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; No publish']`);
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
