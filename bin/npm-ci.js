#!/usr/bin/env node

const program = require('commander');
const {build} = require('../src/build');
const {install} = require('../src/install');
const {test} = require('../src/test');
const {release} = require('../src/release');
const {customScript} = require('../src/customScript');
const {publishCli} = require('./publish-cli');

program.version(require('../../package').version);

program
  .command('no-publish [batch]')
  .description('runs install, build, test/batch')
  .action(batch => {
    install();
    build();
    if (batch) {
      // backward support of previous api of running batches
      // remove when santa stops using this feature
      customScript(batch);
    } else {
      test();
    }
  });

program
  .command('install')
  .description('installs dependencies')
  .action(install);

program
  .command('build')
  .description('builds the package')
  .action(build);

program
  .command('test')
  .arguments('[batch]')
  .description('executes tests')
  .action(test);

program
  .command('release')
  .description('mark a new release of the package')
  .action(release);

program
  .command('custom [script]')
  .description('runs a custom npm script')
  .action(customScript);

program
  .command('publish')
  .description('publish the package')
  .action(publishCli);

program.parse(process.argv);

if (!program.args.length) {
  install();
  build();
  test();
  release();
}
