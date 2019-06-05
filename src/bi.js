import { spawnSync } from 'child_process';

const { join } = require('path');

const biReporterScript = join(process.env.SCRIPT_DIR, 'bi_reporter.sh');

function createReportFunction(suffix) {
  return operation => {
    try {
      spawnSync(
        biReporterScript,
        [
          `${operation}_${suffix}`,
          process.env.BUILD_ID,
          'null',
          'null',
          'null',
          'null',
          process.cwd(),
        ],
        process.env.CI_VERBOSE
          ? {
              stdio: 'inherit',
            }
          : undefined,
      );
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
