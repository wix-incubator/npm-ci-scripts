import {execCommand, readJsonFile} from '../src/utils';
import {build} from '../src/build';
import {get} from 'lodash';

const pkg = readJsonFile('package.json');

if (get(pkg, 'scripts.customPublish') && process.env.agentType !== 'pullrequest') {
  execCommand('npm run release --if-present');
}

build();
