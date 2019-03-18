import {execCommand} from './utils';
import {setApplitoolsId} from './applitoolsScripts';
import {install} from './install';
import {extractCache, saveCache} from './cache';

export async function build(buildType) {
  if (process.env.APPLITOOLS_GITHUB_FT) {
    setApplitoolsId();
  }

  try {
    await extractCache();
  } catch (err) {
    console.log('An error occured while trying to extract cache. Build will continue without cache.');
    console.log(err);
  }

  await install();
  execCommand('npm run build --if-present');

  if (process.env.agentType === 'pullrequest') {
    execCommand('npm run pr-postbuild --if-present');
  }

  execCommand(`npm run ${buildType}`);

  try {
    await saveCache();
  } catch (err) {
    console.log('An error occured while trying to save cache. Cache will not be updated.');
    console.log(err);
  }

}


