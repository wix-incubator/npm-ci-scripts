const {readFileSync, createReadStream, existsSync} = require('fs');
const tar = require('tar');
const AWS = require('aws-sdk');
const {sync: globbySync} = require('globby');
const tempy = require('tempy');

AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: 'automation-aws'});

const cacheKey = process.env.NPM_CI_CACHE_KEY || `${process.env.TEAMCITY_PROJECT_NAME}__${process.env.BRANCH}`;

const s3Client = new AWS.S3();

function getCICacheBucket(ciConfig) {
  const ciConfigBucketName = ciConfig.cache && ciConfig.cache.bucket;

  return process.env.NPM_CI_CACHE_BUCKET || ciConfigBucketName || `ci-cache`;
}

export async function extractCache() {
  if (!existsSync('.ci_config')) {
    console.log('No .ci_config file found. Skipping cache extraction.');
    return;
  }

  const ciConfig = JSON.parse(readFileSync('.ci_config', 'utf8'));

  console.log(`Starting to download and extract cache with key ${cacheKey}...`);
  s3Client.getObject({
    Bucket: getCICacheBucket(ciConfig),
    Key: cacheKey
  }).createReadStream()
    .pipe(tar.extract({}))
    .on('error', err => console.log('error while downloading and extracting cache', err))
    .on('end', () => {
      console.log(`Finished downloading and extracting cache.`);
    });
}

export async function saveCache() {
  if (!existsSync('.ci_config')) {
    console.log('No .ci_config file found. Skipping cache creation.');
    return;
  }

  const ciConfig = JSON.parse(readFileSync('.ci_config', 'utf8'));

  if (!ciConfig.cache) {
    console.log('No cache config in .ci_config. Skipping cache creation.');
  } else {
    console.log('Found cache config for the following path globs:');
    ciConfig.cache.paths.forEach(console.log.bind(console));

    const pathsToCache = globbySync(ciConfig.cache.paths, {
      onlyFiles: false,
      expandDirectories: false
    });

    console.log('Expanded the globs to the following paths to cache:');
    pathsToCache.forEach(console.log.bind(console));

    const tempFile = tempy.file({extension: 'tar.gz'});

    console.log(`Creating tar.gz of cache paths at ${tempFile}...`);
    await tar.create({
      gzip: true,
      file: tempFile
    }, pathsToCache);
    console.log('Cache file created.');

    const cacheKey = process.env.NPM_CI_CACHE_KEY;

    console.log(`Uploading cache to S3 under key ${cacheKey}...`);
    s3Client.upload({
      Body: createReadStream(tempFile),
      Bucket: getCICacheBucket(ciConfig),
      Key: cacheKey
    }, err => {
      if (err) {
        console.log('Encountered an error when uploading cache to s3.');
        console.error(err);
      } else {
        console.log(`Cache file uploaded successfully`);
      }
    });
  }
}
