import { saveSuccessfulRun } from '../src/run-results';

const program = require('commander');

program
  .version(require('../../package').version) // eslint-disable-line
  .usage('hash command')
  .parse(process.argv);

const hash = program.args[0];
const command = program.args[1];

saveSuccessfulRun(hash, command).then(didSave => process.exit(didSave ? 0 : 1));
