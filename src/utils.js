import { writeFileSync, readFileSync, statSync, createReadStream } from 'fs';
import { execSync, exec } from 'child_process';
import request from 'request';
import tar from 'tar';
import { createHash } from 'crypto';
import { resolve as pathResolve } from 'path';
import { Credentials, SharedIniFileCredentials } from 'aws-sdk';
import { XmlDocument } from 'xmldoc';

export function logBlockOpen(log) {
  console.log("##teamcity[blockOpened name='" + log + "']");
}

export function logBlockClose(log) {
  console.log("##teamcity[blockClosed name='" + log + "']");
}

export function execCommand(cmd, log, retries, retryCmd) {
  log = log || cmd;
  logBlockOpen(log);
  try {
    console.log('running:', cmd);
    execSync(cmd, { stdio: 'inherit' });
    logBlockClose(log);
  } catch (e) {
    logBlockClose(log);
    if (retries > 0) {
      if (retryCmd) {
        console.log('running:', retryCmd);
        execSync(retryCmd, { stdio: 'inherit' });
      }
      const retry = parseInt(
        (log.match(/ \(retry (\d+)\)/) || ['', '0'])[1],
        10,
      );
      log =
        log.replace(/ \(retry (\d+)\)/, '') + ' (retry ' + (retry + 1) + ')';
      execCommand(cmd, log, retries - 1);
    } else {
      process.exit(e.status);
    }
  }
}

export function fileExists(name) {
  try {
    statSync(name);
    return true;
  } catch (e) {
    return false;
  }
}

export function writeJsonFile(name, pkg) {
  writeFileSync(name, JSON.stringify(pkg, null, 2), 'utf8');
}

export function readJsonFile(name) {
  return JSON.parse(readFileSync(name, 'utf8'));
}

export function sendMessageToSlack(msg) {
  if (!process.env.NPM_CI_SLACK_TOKEN) {
    return Promise.reject(
      new Error(
        'Unable to send message to slack because env NPM_CI_SLACK_TOKEN is not set',
      ),
    );
  }

  return new Promise((resolve, reject) => {
    request.post(
      {
        url: 'https://slack.com/api/chat.postMessage',
        headers: {
          Authorization: `Bearer ${process.env.NPM_CI_SLACK_TOKEN}`,
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          channel: 'CFM2ER0DU',
          text: msg,
        }),
      },
      (err, response) => {
        if (err) {
          return reject(err);
        }

        try {
          const body = JSON.parse(response.body);
          resolve(body);
        } catch (ex) {
          reject(ex);
        }
      },
    );
  });
}

function streamToBuffer(path) {
  return new Promise((resolve, reject) => {
    const gzipStream = createReadStream(path);
    const buffers = [];

    gzipStream.on('data', data => {
      buffers.push(data);
    });
    gzipStream.on('error', err => {
      reject(err);
    });
    gzipStream.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
}

function sendFileToSlack(path, title, filename) {
  if (!process.env.NPM_CI_SLACK_TOKEN) {
    return Promise.reject(
      new Error(
        'Unable to send file to slack because env NPM_CI_SLACK_TOKEN is not set',
      ),
    );
  }

  console.log(`Sending ${path} as "${title}" - ${filename}`);

  return streamToBuffer(path).then(fileData => {
    const npmLogErrorMsgRegex = /\d+ error (.*)\n\d+ verbose exit/gm;
    const fileDataString = fileData.toString();
    const errorMessageMatch = npmLogErrorMsgRegex.exec(fileDataString);

    if (errorMessageMatch) {
      const errorMessage = errorMessageMatch[1];
      sendMessageToSlack(`Error: ${errorMessage} in ${title} - ${filename}`);
    } else {
      console.log(`Could not locate error message in ${filename}`);
    }

    return new Promise((resolve, reject) => {
      request.post(
        {
          url: 'https://slack.com/api/files.upload',
          form: {
            token: process.env.NPM_CI_SLACK_TOKEN,
            title,
            channels: 'CFM2ER0DU',
            content: fileDataString,
            filetype: 'text',
          },
        },
        (err, response) => {
          if (err) {
            return reject(err);
          }

          try {
            const body = JSON.parse(response.body);
            resolve(body);
          } catch (ex) {
            reject(ex);
          }
        },
      );
    });
  });
}

const TEN_MEGABYTES = 10 * 1024 * 1024;
export function execCommandAsync(cmd, log, retries, retryCmd) {
  return new Promise((resolve, reject) => {
    log = log || cmd;
    logBlockOpen(log);
    const childProcess = exec(
      cmd,
      { stdio: 'pipe', maxBuffer: TEN_MEGABYTES },
      async (error, stdout, stderr) => {
        logBlockClose(log);
        if (error) {
          const npmLogPathRegex = /(\/.+\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}_\d{1,3}Z-debug\.log)/g;
          const match = npmLogPathRegex.exec(stderr.toString());
          if (match) {
            const logPath = match[0];
            console.log('NPM log path detected:', logPath);
            const pathParts = logPath.split('/');
            const filename = pathParts[pathParts.length - 1];
            try {
              await sendFileToSlack(
                logPath,
                `NPM log from ${process.env.HOSTNAME} building ${
                  process.env.ARTIFACT_ID
                } (${process.env.BUILD_VCS_NUMBER})`,
                filename,
              );
              console.log('npm log sent to slack!');
            } catch (error) {
              console.log('Sending npm log to slack failed', error);
            }
          } else {
            console.log(
              `Error executing '${cmd}', no npm log detected.`,
              error,
            );
          }

          if (retries > 0) {
            if (retryCmd) {
              console.log('running:', retryCmd);
              execSync(retryCmd, { stdio: 'inherit' });
            }
            const retry = parseInt(
              (log.match(/ \(retry (\d+)\)/) || ['', '0'])[1],
              10,
            );
            log =
              log.replace(/ \(retry (\d+)\)/, '') +
              ' (retry ' +
              (retry + 1) +
              ')';
            return execCommandAsync(cmd, log, retries - 1)
              .then(resolve)
              .catch(reject);
          }

          process.exit(error.code || 1);
          return reject(error);
        }

        resolve({
          stdio: {
            stderr,
            stdout,
          },
        });
      },
    );

    console.log('running:', cmd);

    childProcess.stderr.pipe(process.stderr);
    childProcess.stdout.pipe(process.stdout);
  });
}

export function execCommandAsyncNoFail(cmd) {
  return new Promise((resolve, reject) => {
    logBlockOpen(cmd);
    const childProcess = exec(
      cmd,
      { stdio: 'pipe', maxBuffer: TEN_MEGABYTES },
      async (error, stdout, stderr) => {
        logBlockClose(cmd);
        if (error) {
          const npmLogPathRegex = /(\/.+\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}_\d{1,3}Z-debug\.log)/g;
          const match = npmLogPathRegex.exec(stderr.toString());
          if (match) {
            const logPath = match[0];
            console.log('NPM log path detected:', logPath);
            const pathParts = logPath.split('/');
            const filename = pathParts[pathParts.length - 1];
            try {
              await sendFileToSlack(
                logPath,
                `NPM log from ${process.env.HOSTNAME} building ${
                  process.env.ARTIFACT_ID
                } (${process.env.BUILD_VCS_NUMBER})`,
                filename,
              );
              console.log('npm log sent to slack!');
            } catch (sendToSlackError) {
              console.log('Sending npm log to slack failed', sendToSlackError);
            }
          } else {
            console.log(
              `Error executing '${cmd}', no npm log detected.`,
              error,
            );
          }

          error.stderr = stderr;
          error.stdout = stdout;

          return reject(error);
        }

        resolve({
          stdio: {
            stderr,
            stdout,
          },
        });
      },
    );

    console.log('running:', cmd);

    childProcess.stderr.pipe(process.stderr);
    childProcess.stdout.pipe(process.stdout);
  });
}

export function getCurrentProjectUniqueIdentifier() {
  if (process.env.ARTIFACT_ID) {
    return process.env.ARTIFACT_ID;
  } else if (fileExists('pom.xml')) {
    const artifactId = new XmlDocument(readFileSync('pom.xml')).valueWithPath(
      'artifactId',
    );

    return artifactId;
  } else {
    throw new Error(
      'Failed to get a unique identifier for project! no ARTIFACT_ID env var, and no pom.xml',
    );
  }
}

export function getHashForCWD() {
  return new Promise(resolve => {
    const tarStream = tar.create(
      {
        portable: true,
        noMtime: true,
        filter: path => pathResolve(path) !== pathResolve('.git'),
      },
      ['.'],
    );

    const hash = createHash('sha256');
    hash.setEncoding('hex');

    tarStream.on('end', () => {
      hash.end();
      resolve(hash.read());
    });

    tarStream.pipe(hash);
  });
}

export function getAWSCredentials() {
  return process.env.NPM_CI_AWS_ACCESS_KEY
    ? new Credentials(
        process.env.NPM_CI_AWS_ACCESS_KEY,
        process.env.NPM_CI_AWS_SECRET_ACCESS_KEY,
      )
    : new SharedIniFileCredentials({
        profile: process.env.NPM_CI_AWS_CREDENTIALS_PROFILE || 'cache-aws',
      });
}
