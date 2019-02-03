#!/usr/bin/env node

const program = require('commander');

program.version(require('../../package').version)
  .command('build', 'build the package')
  .command('publish', 'publish the package')
  .parse(process.argv);
