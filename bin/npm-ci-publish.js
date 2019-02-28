import {publish} from '../src/publish';
import {publishScoped} from '../src/publish-scoped';
import {logBlockOpen, logBlockClose, execCommandAsync, readJsonFile, writeJsonFile} from '../src/utils';
import {writeFileSync, unlinkSync} from 'fs';
import {execSync} from 'child_process';

function latest(registry) {
  try {
    const result = JSON.parse(execSync(`npm show --json --registry=${registry} --@wix:registry=${registry}`, {stdio: 'pipe'}).toString());
    return result['dist-tags'].latest;
  } catch (error) {
    return null;
  }
}

async function runPublish() {
  logBlockOpen('npm publish');
  await publish();
  logBlockClose('npm publish');

  if (process.env.PUBLISH_SCOPED) {
    logBlockOpen('npm publish to wix scope');
    await publishScoped();
    logBlockClose('npm publish to wix scope');
  }
}

let pkg = readJsonFile('package.json');
const previousVersion = pkg.version;
let shouldUnlink = false;
if (pkg.name.indexOf('@wix/') === 0) {
  pkg.publishConfig = {registry: 'https://registry.npmjs.org/'};
  writeJsonFile('package.json', pkg);
  if (latest('http://npm.dev.wixpress.com/') !== latest('https://registry.npmjs.org/')) {
    console.log('forcing npmjs to trust latest from npmjs');
    writeFileSync('.npmrc', '@wix:registry=https://registry.npmjs.org/'); //trust latest from npmjs
    shouldUnlink = true;
  }
}

execCommandAsync('npm run release --if-present').then(({stdio}) => {
  if (shouldUnlink) {
    unlinkSync('.npmrc');
  }
  pkg = readJsonFile('package.json');
  if (pkg.private && previousVersion !== pkg.version) {
    console.log('forcing republish in order to sync versions');
    delete pkg.private;
    writeJsonFile('package.json', pkg);
  }

  // eslint-disable-next-line no-div-regex
  const npmPublishRegex = /=== Tarball Details ===[\s\\n]+.*name:\s+([^\s]+)[\s\\n]*.*version:\s+([^\s]+)/gm;
  const stdoutString = stdio.stdout.toString();
  let stdOutMatch;
  let skipPublish = false;
  while (stdOutMatch = npmPublishRegex.exec(stdoutString)) { // eslint-disable-line no-cond-assign
    const [pkgName, pkgVersion] = stdOutMatch;
    console.log(`Seems like 'release' command published a package ${pkgName} ${pkgVersion}`);
    skipPublish = true;
  }

  if (pkg.private || skipPublish) {
    skipPublish && console.log('Skipping publish because release published something');
    console.log('Skipping publish (probably no change in tarball)');
    console.log(`##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; No publish']`);
  } else {
    runPublish();
  }
});
