import { execCommand } from './utils';
import { setApplitoolsId } from './applitoolsScripts';
import { install } from './install';
import { extractCache, saveCache } from './cache';
import { reportOperationStarted, reportOperationEnded } from './bi';

export async function build(buildType) {
  if (process.env.APPLITOOLS_GITHUB_FT) {
    setApplitoolsId();
  }

  try {
    await extractCache();
  } catch (err) {
    console.log(
      'An error occured while trying to extract cache. Build will continue without cache.',
    );
    if (process.env.CI_VERBOSE) {
      console.log(err);
    }
  }

  await install();

  reportOperationStarted('NPM_BUILD');
  execCommand('npm run build --if-present');
  reportOperationEnded('NPM_BUILD');

  if (process.env.agentType === 'pullrequest') {
    execCommand('npm run pr-postbuild --if-present');
  }

  reportOperationStarted(`test`);
  execCommand(`npm run ${buildType}`);
  reportOperationEnded('test');

  const repoStatusCLI = require.resolve(
    '@wix/perfer-repo-status-cli/bundle/index',
  );
  execCommand(`${repoStatusCLI} verify`);

  try {
    await saveCache();
  } catch (err) {
    console.log(
      'An error occured while trying to save cache. Cache will not be updated.',
    );
    if (process.env.CI_VERBOSE) {
      console.log(err);
    }
  }
}
