import { publish } from '../src/publish';
import { publishScoped } from '../src/publish-scoped';
import {
  logBlockOpen,
  logBlockClose,
  execCommandAsync,
  readJsonFile,
  writeJsonFile,
} from '../src/utils';
import { unlinkSync } from 'fs';

const program = require('commander');

// eslint-disable-next-line
program.version(require('../../package').version)
  .usage('[publish-type]')
  .parse(process.argv);

const requestedPublishType = program.args[0];
const providedSourceMD5 = process.env.SRC_MD5;

/**
 * @param {import("../src/publish").PublishType} [publishType] The type of publish to perform
 * @param {string} sourceMD5 The MD5 of the repository source
 */
async function runPublish(publishType, sourceMD5) {
  logBlockOpen('npm publish');
  await publish(undefined, publishType, sourceMD5);
  logBlockClose('npm publish');

  if (process.env.PUBLISH_SCOPED) {
    logBlockOpen('npm publish to wix scope');
    await publishScoped(publishType, sourceMD5);
    logBlockClose('npm publish to wix scope');
  }
}

let pkg = readJsonFile('package.json');
const previousVersion = pkg.version;
const shouldUnlink = false;

execCommandAsync('npm run release --if-present').then(({ stdio }) => {
  if (shouldUnlink) {
    unlinkSync('.npmrc');
  }
  pkg = readJsonFile('package.json');
  if (
    pkg.scripts &&
    pkg.scripts.release &&
    pkg.scripts.release.indexOf('mltci') > -1
  ) {
    console.log(
      'Detected release mltci, it might publish, so skipping publishing myself',
    );
  } else if (pkg.private && previousVersion !== pkg.version) {
    console.log('forcing republish in order to sync versions');
    delete pkg.private;
    writeJsonFile('package.json', pkg);
  }

  // eslint-disable-next-line no-div-regex
  const npmPublishRegex = /[\s\S]*?npm publish[\s\S]*?=== Tarball Details ===[\s\\n]+.*name:\s+([^\s]+)[\s\\n]*.*version:\s+([^\s]+)/gm;
  const stdoutString = stdio.stdout.toString();
  let stdOutMatch;
  let skipPublish = false;
  while ((stdOutMatch = npmPublishRegex.exec(stdoutString))) {
    // eslint-disable-line no-cond-assign
    const [_, pkgName, pkgVersion] = stdOutMatch;
    console.log(
      `Seems like 'release' command published a package ${pkgName} ${pkgVersion}`,
    );
    skipPublish = true;
  }

  if (pkg.private || skipPublish) {
    skipPublish &&
      console.log('Skipping publish because release published something');
    console.log('Skipping publish (probably no change in tarball)');
    console.log(
      `##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; No publish']`,
    );
  } else {
    runPublish(requestedPublishType, providedSourceMD5);
  }
});
