import { readFileSync, createReadStream, existsSync } from 'fs';
import tar from 'tar';
import { S3 } from 'aws-sdk';
import tempy from 'tempy';
import { getAWSCredentials, getCurrentProjectUniqueIdentifier } from './utils';
import { reportOperationStarted, reportOperationEnded } from './bi';

const s3Client = new S3({
  credentials: getAWSCredentials(),
});

function getCICacheBucket(ciConfig) {
  const ciConfigBucketName = ciConfig.cache && ciConfig.cache.bucket;

  return (
    process.env.NPM_CI_CACHE_BUCKET || ciConfigBucketName || `wix-cache-ci`
  );
}

function getCacheKey() {
  return `${getCurrentProjectUniqueIdentifier()}/${process.env
    .NPM_CI_CACHE_KEY ||
    process.env.BRANCH ||
    'master'}`;
}

export async function extractCache() {
  if (!existsSync('.ci_config')) {
    console.log('No .ci_config file found. Skipping cache extraction.');
    return;
  }

  let cacheKey;
  try {
    cacheKey = getCacheKey();
  } catch (err) {
    console.log('Failed to get cache key, will skip cache.');
    console.log(err);
    return;
  }

  reportOperationStarted('CACHE_EXTRACTION');

  const ciConfig = JSON.parse(readFileSync('.ci_config', 'utf8'));

  console.log(`Starting to download and extract cache with key ${cacheKey}...`);

  await new Promise((resolve, reject) => {
    s3Client
      .getObject({
        Bucket: getCICacheBucket(ciConfig),
        Key: cacheKey,
      })
      .createReadStream()
      .on('error', err => reject(err))
      .pipe(tar.extract({}))
      .on('error', err => reject(err))
      .on('end', () => {
        console.log(`Finished downloading and extracting cache.`);
        resolve();
      });
  });

  reportOperationEnded('CACHE_EXTRACTION');
}

export async function saveCache() {
  if (!existsSync('.ci_config')) {
    console.log('No .ci_config file found. Skipping cache creation.');
    return;
  }

  let cacheKey;
  try {
    cacheKey = getCacheKey();
  } catch (err) {
    console.log('Failed to get cache key, will skip cache.');
    console.log(err);
    return;
  }

  const ciConfig = JSON.parse(readFileSync('.ci_config', 'utf8'));

  if (!ciConfig.cache) {
    console.log('No cache config in .ci_config. Skipping cache creation.');
  } else {
    reportOperationStarted('CACHE_SAVE');

    console.log('Found cache config for the following path globs:');
    ciConfig.cache.paths.forEach(console.log);

    // requiring globby here and not importing because globby doesn't support
    // node <= 5 and at the time of writing these lines, there are projects that need that support
    const pathsToCache = require('globby').sync(ciConfig.cache.paths, {
      onlyFiles: false,
      expandDirectories: false,
    });

    console.log('Expanded the globs to the following paths to cache:');
    pathsToCache.forEach(console.log);

    const tempFile = tempy.file({ extension: 'tar.gz' });

    console.log(`Creating tar.gz of cache paths at ${tempFile}...`);
    await tar.create(
      {
        gzip: true,
        file: tempFile,
      },
      pathsToCache,
    );
    console.log('Cache file created.');

    console.log(`Uploading cache to S3 under key ${cacheKey}...`);
    await new Promise((resolve, reject) => {
      s3Client.upload(
        {
          Body: createReadStream(tempFile),
          Bucket: getCICacheBucket(ciConfig),
          Key: cacheKey,
        },
        err => {
          if (err) {
            reject(err);
          } else {
            console.log(`Cache file uploaded successfully`);
            resolve();
          }
        },
      );
    });

    reportOperationEnded('CACHE_SAVE');
  }
}
