import {
  readJsonFile,
  execCommandAsync,
  execCommandAsyncNoFail,
  sendMessageToSlack,
  writeJsonFile,
} from './utils';
import { execSync } from 'child_process';
import chalk from 'chalk';
import semver from 'semver';
import { get } from 'lodash';
import { republishPackage } from '@wix/npm-republish';
import { reportOperationStarted, reportOperationEnded } from './bi';

/**
 * @typedef {"temp-publish" | "re-publish"} PublishType
 */

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
const LATEST_TAG = 'latest';
const NEXT_TAG = 'next';
const OLD_TAG = 'old';

function getPackageInfo(registry) {
  try {
    console.log(`Getting package info from ${registry}`);
    return JSON.parse(
      execSync(
        `npm show --json --registry=${registry} --@wix:registry=${registry}`,
        { stdio: 'pipe' },
      ).toString(),
    );
  } catch (error) {
    if (error.stderr.toString().includes('npm ERR! code E404')) {
      console.error(
        chalk.yellow(
          '\nWarning: package not found. Going to publish for the first time',
        ),
      );
      return {};
    }
    throw error;
  }
}

function shouldPublishPackage(info, version) {
  const remoteVersionsList = info.versions || [];
  const isVersionExists = remoteVersionsList.indexOf(version) > -1;
  console.log(
    `version ${version} ${
      isVersionExists ? 'exists' : 'does not exists'
    } on remote`,
  );
  return !isVersionExists;
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

function getUnverifiedVersion(version) {
  return `${version}-unverified`;
}

function stringHasForbiddenCantPublish(str) {
  return (
    str.indexOf('forbidden cannot modify pre-existing version') || // artifactory error
    str.indexOf('cannot publish over the previously published versions') // npmjs error
  );
}

async function execPublish(info, version, flags, tagOverride) {
  reportOperationStarted('NPM_PUBLISH');
  const publishCommand = `npm publish --tag=${tagOverride ||
    getTag(info, version)} ${flags}`.trim();
  console.log(
    chalk.magenta(`Running: "${publishCommand}" for ${info.name}@${version}`),
  );

  try {
    await execCommandAsyncNoFail(publishCommand);
  } catch (ex) {
    if (
      stringHasForbiddenCantPublish(ex.stderr.toString()) ||
      stringHasForbiddenCantPublish(ex.stdout.toString())
    ) {
      console.log('Ohh Ohh! Registry says we cant re-publish!');
      sendMessageToSlack(
        `FAILED: ${publishCommand} for ${get(info, 'name', 'unknown')}`,
      );
      const pkg = readJsonFile('package.json');
      pkg.version = semver.inc(pkg.version, 'patch');
      console.log('Retrying with', pkg.version);
      writeJsonFile('package.json', pkg);
      try {
        await execCommandAsyncNoFail(publishCommand);
        sendMessageToSlack(
          `SUCCESS: ${publishCommand} for ${get(
            info,
            'name',
            'unknown',
          )} with ${pkg.version}`,
        );
      } catch (ex) {
        console.log('didnt work', ex);
        sendMessageToSlack(
          `RETRY FAILED: ${publishCommand} for ${get(info, 'name', 'unknown')}`,
        );
        process.exit(1);
      }
    }
    reportOperationEnded('NPM_PUBLISH');
  }
}

/**
 * 1. verify that the package can be published by checking the registry.
 *  (Can only publish versions that doesn't already exist)
 * 2. choose a tag ->
 * `old` for a release that is less than latest (semver).
 * `next` for a prerelease (beta/alpha/rc).
 * `latest` as default.
 * 3. perform npm publish using the chosen tag.
 * @param {string} flags Flags to pass to npm publush
 * @param {PublishType} [publishType] The type of publish to perform
 */
export async function publish(flags = '', publishType) {
  const pkg = readJsonFile('package.json');
  const registry = get(pkg, 'publishConfig.registry', DEFAULT_REGISTRY);
  const info = getPackageInfo(registry);
  const { name, version } = pkg;

  console.log(`Starting the release process for ${chalk.bold(name)}\n`);

  if (!shouldPublishPackage(info, version)) {
    console.log(
      chalk.blue(`${name}@${version} already exists on registry ${registry}`),
    );
    console.log('\nNo publish performed');
    console.log(
      `##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; No publish']`,
    );
  } else {
    if (!publishType) {
      await execPublish(
        info,
        version,
        flags + ` --registry=${registry} --@wix:registry=${registry}`,
      );
      console.log(
        chalk.green(
          `\nPublish "${name}@${version}" successfully to ${registry}`,
        ),
      );
      console.log(
        `##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; Published: ${name}@${version}']`,
      );
    } else if (publishType === 'temp-publish') {
      // in case of a temp publish, we want to publish a prerelease version
      // that will later become the real version (using re-publish). For that
      // we also remove the postpublish step, becuase this is not the real publish
      const unverifiedVersion = getUnverifiedVersion(version);
      const pkgJson = readJsonFile('package.json');
      pkgJson.scripts && delete pkgJson.scripts.postPublish;
      pkgJson.version = unverifiedVersion;
      writeJsonFile('package.json', pkgJson);

      await execPublish(
        info,
        unverifiedVersion,
        flags + ` --registry=${registry} --@wix:registry=${registry}`,
        'unverified',
      );

      console.log(
        chalk.green(
          `\nPublish "${name}@${unverifiedVersion}" successfully to ${registry}`,
        ),
      );
      console.log(
        `##teamcity[buildStatus status='SUCCESS' text='{build.status.text}; Published unverified version: ${name}@${unverifiedVersion}']`,
      );
    } else if (publishType === 're-publish') {
      const pkgJson = readJsonFile('package.json');
      const unverifiedVersion = getUnverifiedVersion(pkgJson.version);

      republishPackage(
        `${pkgJson.name}@${unverifiedVersion}`,
        pkgJson.version,
        [
          flags.split(' '),
          `--registry=${registry}`,
          `--@wix:registry=${registry}`,
        ],
      );

      // Since we didn't run the postpublish script in the temp publish, we should run the postpublish
      // after a re-publish
      await execCommandAsync('npm run postpublish');
    } else {
      throw new Error(`Unknown publish type requested ${publishType}`);
    }
  }
}
