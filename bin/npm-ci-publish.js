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

console.log('DANGER! Warnning: publish is force in `npm-ci-scripts` blame @yury');
const pkg = readJsonFile('package.json');
delete pkg.private;
writeJsonFile('package.json', pkg);
runPublish();
// const pkg = readJsonFile('package.json');
// if (pkg.private) {
//   console.log('Skipping publish (probably no change in tarball)');
//   console.log(`##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; No publish']`);
// } else {
//   runPublish();
// }
