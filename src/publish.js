import {execSync} from 'child_process';
import chalk from 'chalk';
import semver from 'semver';
import {get} from 'lodash';
import {readJsonFile} from './utils';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
const LATEST_TAG = 'latest';
const NEXT_TAG = 'next';
const OLD_TAG = 'old';

function getPackageInfo() {
  try {
    return JSON.parse(
      execSync(`npm show --json`, {stdio: 'pipe'}).toString()
    );
  } catch (error) {
    if (error.stderr.toString().indexOf('npm ERR! code E404') !== -1) {
      console.error(
        chalk.yellow(
          '\nWarning: package not found. Going to publish for the first time'
        )
      );
      return {};
    }
    throw error;
  }
}

function shouldPublishPackage(info, version) {
  const remoteVersionsList = info.versions || [];
  return remoteVersionsList.indexOf(version) === -1;
}

function getTag(info, version) {
  const isLessThanLatest = () =>
    semver.lt(version, get(info, 'dist-tags.latest', '0.0.0'));
  const isPreRelease = () => semver.prerelease(version) !== null;

  if (isLessThanLatest()) {
    return OLD_TAG;
  } else if (isPreRelease()) {
    return NEXT_TAG;
  } else {
    return LATEST_TAG;
  }
}

function execPublish(info, version, flags) {
  const publishCommand = `npm publish --tag=${getTag(
    info,
    version
  )} ${flags}`.trim();
  console.log(
    chalk.magenta(`Running: "${publishCommand}" for ${info.name}@${version}`)
  );
  execSync(publishCommand);
}

// 1. verify that the package can be published by checking the registry.
//   (Can only publish versions that doesn't already exist)
// 2. choose a tag ->
// * `old` for a release that is less than latest (semver).
// * `next` for a prerelease (beta/alpha/rc).
// * `latest` as default.
// 3. perform npm publish using the chosen tag.
export function publish(flags = '') {
  const pkg = readJsonFile('package.json');
  const registry = get(pkg, 'publishConfig.registry', DEFAULT_REGISTRY);
  const info = getPackageInfo();
  const {name, version} = pkg;

  console.log(`Starting the release process for ${chalk.bold(name)}\n`);

  if (!shouldPublishPackage(info, version)) {
    console.log(
      chalk.blue(`${name}@${version} already exists on registry ${registry}`)
    );
    console.log('\nNo publish performed');
    console.log(
      `##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; No publish']`
    );
  } else {
    execPublish(info, version, flags);
    console.log(
      chalk.green(`\nPublish "${name}@${version}" successfully to ${registry}`)
    );
    console.log(
      `##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; Published: ${name}@${version}']`
    );
  }
}
