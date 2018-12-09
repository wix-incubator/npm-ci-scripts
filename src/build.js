import {execCommand} from './utils';
import {setup} from './setup';

export function build() {
  setup();
  execCommand('npm run build --if-present');
  if (process.env.agentType === 'pullrequest') {
    execCommand('npm run pr-postbuild --if-present');
  }
}
