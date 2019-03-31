import { execCommand } from '../src/utils';

const program = require('commander');

// eslint-disable-next-line
program.version(require('../../package').version)
  .usage('[script]')
  .parse(process.argv);

const script = program.args[0];

execCommand(`npm run ${script} --if-present`);
