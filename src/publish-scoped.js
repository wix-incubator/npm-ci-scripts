import {publish} from './publish';
import {execSync} from 'child_process';
import {writeJsonFile, readJsonFile, fileExists} from './utils';

function publishToRegistry(pkg, to) {
  pkg.publishConfig.registry = to;
  pkg.publishConfig['@wix:registry'] = to;
  writeJsonFile('package.json', pkg);
  console.log('Publishing', pkg.name, 'to', to);
  publish('--ignore-scripts');
}

function validate(pkg) {
  if (isScoped(pkg.name)) {
    if (!isWixScoped(pkg.name)) {
      return 'package uses unsupported scope: ' + pkg.name;
    }
  } else if (!isWixRegistry(pkg.publishConfig.registry)) {
    return 'package is being published outside wix registry: ' + pkg.publishConfig.registry;
  }
  if (pkg.publishScoped === false || fileExists('publish-scoped.ignore')) {
    return 'developer switched a feature off';
  }
  return true;
}

function isWixRegistry(registry) {
  return registry.indexOf('.dev.wix') >= 0;
}

function isWixScoped(name) {
  return name.indexOf('@wix/') >= 0;
}

function isScoped(name) {
  return name.indexOf('@') >= 0;
}

function getScopedName(name) {
  return '@wix/' + name;
}

function run(cmd) {
  execSync(cmd, {stdio: 'inherit'});
}

function updateLockFileIfExists(fileName, packageName) {
  if (fileExists(fileName)) {
    console.log('Updating lock file', fileName, 'to use', packageName);
    const json = readJsonFile(fileName);
    json.name = packageName;
    writeJsonFile(fileName, json);
  }
}

function updateLockFiles(packageName) {
  updateLockFileIfExists('npm-shrinkwrap.json', packageName);
  updateLockFileIfExists('package-lock.json', packageName);
}

export function publishScoped() {
  const pkg = readJsonFile('package.json');
  const bkp = readJsonFile('package.json');

  const result = validate(pkg);
  if (result === true) {
    pkg.name = isScoped(pkg.name) ? pkg.name : getScopedName(pkg.name);
    try {
      updateLockFiles(pkg.name);

      publishToRegistry(pkg, 'http://npm.dev.wixpress.com/');
      publishToRegistry(pkg, 'https://registry.npmjs.org/');

      console.log('Granting access to "readonly" group to access', pkg.name);
      run('npm access grant read-only wix:readonly ' + pkg.name + ' --@wix:registry=https://registry.npmjs.org/');

      updateLockFiles(bkp.name);
      writeJsonFile('package.json', bkp);
    } catch (error) {
      console.log('Failed to publish a scoped package, cause:', error);
      updateLockFiles(bkp.name);
      writeJsonFile('package.json', bkp);
      process.exit(1);
    }
  } else {
    console.log('Current package is not publishable with scoped name, cause:', result);
  }
}
