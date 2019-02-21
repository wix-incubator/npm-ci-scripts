import {writeFileSync, readFileSync, statSync} from 'fs';
import {execSync, exec} from 'child_process';
import request from 'request';
import hostname from 'os';

export function logBlockOpen(log) {
  console.log('##teamcity[blockOpened name=\'' + log + '\']');
}

export function logBlockClose(log) {
  console.log('##teamcity[blockClosed name=\'' + log + '\']');
}

export function execCommand(cmd, log, retries, retryCmd) {
  log = log || cmd;
  logBlockOpen(log);
  try {
    console.log('running:', cmd);
    execSync(cmd, {stdio: 'inherit'});
    logBlockClose(log);
  } catch (e) {
    logBlockClose(log);
    if (retries > 0) {
      if (retryCmd) {
        console.log('running:', retryCmd);
        execSync(retryCmd, {stdio: 'inherit'});
      }
      const retry = parseInt((log.match(/ \(retry (\d+)\)/) || ['', '0'])[1], 10);
      log = log.replace(/ \(retry (\d+)\)/, '') + ' (retry ' + (retry + 1) + ')';
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

function readCompressedToBuffer(path) {
  return new Promise((resolve, reject) => {
      const gzipStream = fs.createReadStream(path).pipe(zlib.createGzip({
          level: zlib.constants.Z_BEST_COMPRESSION
      }));
      const buffers = [];

      gzipStream.on('data', (data) => { buffers.push(data); })
      gzipStream.on('error', (err) => { reject(err); })
      gzipStream.on('end', () => { resolve(Buffer.concat(buffers)) })
  });
}

function sendFileToSlack(path, title, filename) {
  console.log(`Sending ${path} as "${title}" - ${filename}.gz`)

  return readCompressedToBuffer(path).then(compressedFile => {
      return new Promise((resolve, reject) => {
          request.post({
              url: 'https://slack.com/api/files.upload',
              formData: {
                  token: 'NEED_A_TOKEN_HERE',
                  title,
                  channels: 'CFM2ER0DU',
                  file: {
                      value: compressedFile,
                      options: {
                          filename: filename + '.gz',
                          contentType: 'application/octet-stream',
                      }
                  }
              },
          }, function (err, response) {
              if (err) {
                return reject(err);
              }

              try {
                const body = JSON.parse(response.body);
                resolve(body);
              } catch(ex) {
                reject(ex);
              }
          });
        });
  });
}

const npmLogPathRegex = /(\/.+\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}_\d{1,3}Z-debug\.log)/g
export function execCommandAsync(cmd, log, retries, retryCmd) {
    return new Promise((resolve, reject) => {
      log = log || cmd;
      logBlockOpen(log);
      const childProcess = exec(cmd, {stdio: 'pipe'},  async (error, _, stderr) => {
        logBlockClose(log);
        if (error) {
          const match = npmLogPathRegex.exec(stderr.toString());
          if (match) {
            const logPath = match[0];
            console.log('NPM log path detected:', logPath);
            const pathParts = logPath.split('/');
            const filename = pathParts[pathParts.length -1];
            try {
              await sendFileToSlack(logPath, `NPM log from ${hostname()} building ${process.env.ARTIFACT_ID} (${process.env.BUILD_VCS_NUMBER})`, filename);
              console.log('npm log sent to slack!');
            } catch (error) {
              console.log('Sending npm log to slack failed', error);
            }
          }

          if (retries > 0) {
            if (retryCmd) {
              console.log('running:', retryCmd);
              execSync(retryCmd, {stdio: 'inherit'});
            }
            const retry = parseInt((log.match(/ \(retry (\d+)\)/) || ['', '0'])[1], 10);
            log = log.replace(/ \(retry (\d+)\)/, '') + ' (retry ' + (retry + 1) + ')';
            return asyncExec(cmd, log, retries - 1);
          }

          process.exit(error.code);
          return reject(error);
        };

        resolve();
      });

      console.log('running:', cmd);

      childProcess.stderr.pipe(process.stderr);
      childProcess.stdout.pipe(process.stdout);
    });
}
