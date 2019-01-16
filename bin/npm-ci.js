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
  .command('no-publish')
  .description('runs install, build, test')
  .action(() => {
    install();
    build();
    test();
  });

program
  .command('install')
  .description('installs dependencies')
  .action(install);

program
  .command('build [batch]')
  .description('builds the package')
  .action(batch => {
    if (!batch) {
      build();
    } else {
      // backward support of previous api of running batches
      // remove when santa stops using this feature
      install();
      build();
      customScript(batch);
    }
  });

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
