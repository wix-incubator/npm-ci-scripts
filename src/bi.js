import { spawn } from 'child_process';

const { join } = require('path');

const biReporterScript = join(process.env.SCRIPT_DIR, 'bi_reporter.sh');

function createReportFunction(suffix) {
  return operation => {
    try {
      spawn(biReporterScript, [`${operation}_${suffix}`, process.env.BUILD_ID]);
    } catch (err) {
      if (process.env.CI_VERBOSE) {
        console.error('An error occurred trying to send bi event.');
        console.log(err.stack || err);
      }
    }
  };
}

export const reportOperationStarted = createReportFunction('STARTED');
export const reportOperationEnded = createReportFunction('END');
