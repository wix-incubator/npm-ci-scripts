import {build} from '../src/build';
import {release} from '../src/release';

const program = require('commander');

program.version(require('../../package').version)
  .usage('[build-type]')
  .parse(process.argv);

const buildType = program.args[0];

(async function () {
  if (buildType) {
    await build(buildType);
  } else {
    await build('test');
    release();
  }
})();
