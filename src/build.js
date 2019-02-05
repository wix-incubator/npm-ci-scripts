import {execCommand} from './utils';
import {setApplitoolsId} from './applitoolsScripts';
import {install} from './install';

export function build(buildType) {
  if (process.env.APPLITOOLS_GITHUB_FT) {
    setApplitoolsId();
  }

  install();
  execCommand('npm run build --if-present');

  if (process.env.agentType === 'pullrequest') {
    execCommand('npm run pr-postbuild --if-present');
  }

  execCommand(`npm run ${buildType}`);
}


