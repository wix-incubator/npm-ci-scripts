import {execCommand, readJsonFile} from './utils';
import {get} from 'lodash';

const pkg = readJsonFile('package.json');

export function release() {
  if (process.env.agentType === 'pullrequest') {
    execCommand('npm run pr-release --if-present');
  } else if (get(pkg, 'scripts.customPublish')) {
    execCommand('npm run release --if-present');
  }
}
