import {publish} from '../src/publish';
import {publishScoped} from '../src/publish-scoped';
import {logBlockOpen, logBlockClose, execCommand} from '../src/utils';

execCommand('npm run release --if-present');

logBlockOpen('npm publish');
publish();
logBlockClose('npm publish');

if (process.env.PUBLISH_SCOPED) {
  logBlockOpen('npm publish to wix scope');
  publishScoped();
  logBlockClose('npm publish to wix scope');
}
