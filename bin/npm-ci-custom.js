import {execCommand} from '../src/utils';
const program = require('commander');

program.version(require('../../package').version)
  .usage('[script]')
  .parse(process.argv);

const script = program.args[0];

execCommand(`npm run ${script} --if-present`);
