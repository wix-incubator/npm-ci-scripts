import {execCommand} from './utils';
import {setup} from './setup';

export function test(args) {
  setup();
  const command = `npm run test${args ? `:${args}` : ''} --if-present`;
  execCommand(command);
}
