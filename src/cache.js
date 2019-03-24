import {readFileSync, createReadStream, existsSync} from 'fs';
import tar from 'tar';
import AWS from 'aws-sdk';
import {sync as globbySync} from 'globby';
import tempy from 'tempy';
import {getCurrentProjectUniqueIdentifier} from './utils';

AWS.config.credentials = process.env.NPM_CI_AWS_ACCESS_KEY ?
  new AWS.Credentials(process.env.NPM_CI_AWS_ACCESS_KEY, process.env.NPM_CI_AWS_SECRET_ACCESS_KEY) :
  new AWS.SharedIniFileCredentials({profile: process.env.NPM_CI_AWS_CREDENTIALS_PROFILE});

const cacheKey = `${getCurrentProjectUniqueIdentifier()}/${process.env.NPM_CI_CACHE_KEY || process.env.BRANCH}`;

const s3Client = new AWS.S3();

function getCICacheBucket(ciConfig) {
  const ciConfigBucketName = ciConfig.cache && ciConfig.cache.bucket;

  return process.env.NPM_CI_CACHE_BUCKET || ciConfigBucketName || `wix-cache-ci`;
}

export function extractCache() {
  if (!existsSync('.ci_config')) {
    console.log('No .ci_config file found. Skipping cache extraction.');
    return;
  }

  const ciConfig = JSON.parse(readFileSync('.ci_config', 'utf8'));

  console.log(`Starting to download and extract cache with key ${cacheKey}...`);

  return new Promise((resolve, reject) => {
    s3Client.getObject({
      Bucket: getCICacheBucket(ciConfig),
      Key: cacheKey
    }).createReadStream()
      .on('error', err => reject(err))
      .pipe(tar.extract({}))
      .on('error', err => reject(err))
      .on('end', () => {
        console.log(`Finished downloading and extracting cache.`);
        resolve();
      });
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
    ciConfig.cache.paths.forEach(console.log);

    const pathsToCache = globbySync(ciConfig.cache.paths, {
      onlyFiles: false,
      expandDirectories: false
    });

    console.log('Expanded the globs to the following paths to cache:');
    pathsToCache.forEach(console.log);

    const tempFile = tempy.file({extension: 'tar.gz'});

    console.log(`Creating tar.gz of cache paths at ${tempFile}...`);
    await tar.create({
      gzip: true,
      file: tempFile
    }, pathsToCache);
    console.log('Cache file created.');

    console.log(`Uploading cache to S3 under key ${cacheKey}...`);
    return new Promise((resolve, reject) => {
      s3Client.upload({
        Body: createReadStream(tempFile),
        Bucket: getCICacheBucket(ciConfig),
        Key: cacheKey
      }, err => {
        if (err) {
          reject(err);
        } else {
          console.log(`Cache file uploaded successfully`);
          resolve();
        }
      });
    });
  }
}
