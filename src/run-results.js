import { S3 } from 'aws-sdk';
import { getAWSCredentials, getCurrentProjectUniqueIdentifier } from './utils';

const s3Client = new S3({
  credentials: getAWSCredentials(),
});

const CI_RESULTS_BUCKET = process.env.NPM_CI_RESULTS_BUCKET || 'wix-ci-results';

export async function checkRunResult(hash, command) {
  let buildHistoryKey;
  try {
    buildHistoryKey = `${getCurrentProjectUniqueIdentifier()}/${hash}/${command}`;
  } catch (err) {
    console.log(err);
    console.log(
      'Failed to build history key, assuming run result as a failure.',
    );
    return false;
  }

  let didPass;

  try {
    await s3Client
      .headObject({
        Bucket: CI_RESULTS_BUCKET,
        Key: buildHistoryKey,
      })
      .promise();

    didPass = true;
  } catch (err) {
    didPass = false;
  }

  return didPass;
}

export async function saveSuccessfulRun(hash, command) {
  let buildHistoryKey;
  try {
    buildHistoryKey = `${getCurrentProjectUniqueIdentifier()}/${hash}/${command}`;
  } catch (err) {
    console.log(err);
    console.log('Failed to build history key, build result will not be saved.');
    return;
  }

  let didSave;

  try {
    await s3Client
      .putObject({
        Bucket: CI_RESULTS_BUCKET,
        Key: buildHistoryKey,
        Body: 'true',
      })
      .promise();

    didSave = true;
  } catch (err) {
    didSave = false;
  }
  return didSave;
}
