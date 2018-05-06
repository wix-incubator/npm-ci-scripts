import {execCommand, readJsonFile} from '../src/utils';
import {build} from '../src/build';
import {get} from 'lodash';

const pkg = readJsonFile('package.json');

build();

if (process.env.agentType === 'pullrequest') {
  execCommand('npm run pr-release --if-present');
} else if (get(pkg, 'scripts.customPublish')) {
  execCommand('npm run release --if-present');
}
