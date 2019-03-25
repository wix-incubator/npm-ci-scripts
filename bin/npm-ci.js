#!/usr/bin/env node

const program = require('commander');

program.version(require('../../package').version)
  .command('build', 'build the package')
  .command('save-cache', 'save the project cache')
  .command('extract-cache', 'extract the project cache')
  .command('publish', 'publish the package')
  .command('install', 'installs dependencies')
  .command('custom', 'run custom npm command')
  .command('hash-folder', 'print the calculated hash for the folder and it\'s contents')
  .command('check-run-result', 'exit with 0 if provided hash and command was previously successful, 1 otherwise')
  .command('save-successful-run', 'save a successful run with a provided hash and command')
  .parse(process.argv);
