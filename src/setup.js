import {setApplitoolsId} from './applitoolsScripts';

export function setup() {
  if (process.env.APPLITOOLS_GITHUB_FT) {
    setApplitoolsId();
  }
}
