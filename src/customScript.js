import {execCommand} from './utils';
export function customScript(npmScript) {
  execCommand(`npm run ${npmScript}`);
}
