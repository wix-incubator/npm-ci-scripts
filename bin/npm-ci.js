#!/usr/bin/env node

const program = require('commander');

program.version(require('../../package').version)
  .command('build', 'build the package')
  .command('save-cache', 'save the project cache')
  .command('extract-cache', 'extract the project cache')
  .command('publish', 'publish the package')
  .command('install', 'installs dependencies')
  .command('custom', 'run custom npm command')
  .parse(process.argv);
