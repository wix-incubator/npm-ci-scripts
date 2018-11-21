import {publish} from './publish';
import {execSync, spawnSync} from 'child_process';
import {writeFileSync, unlinkSync} from 'fs';
import {writeJsonFile, readJsonFile, fileExists} from './utils';

function publishToRegistry(pkg, to) {
  pkg.publishConfig.registry = to;
  pkg.publishConfig['@wix:registry'] = to;
  writeJsonFile('package.json', pkg);
  writeFileSync('.npmrc', `@wix:registry=${to}`);
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

function unscope(name) {
  return name.split('/')[1];
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

function fetchJSONSync(url) {
  const result = spawnSync('curl', ['--silent', url], {encoding: 'utf8'}).stdout;
  return JSON.parse(result);
}

function verifyWixPackage(packageName) {
  try {
    const packageContents = fetchJSONSync(`http://npm.dev.wixpress.com/${packageName}/latest`);
    const result = packageContents.publishConfig && packageContents.publishConfig.registry;
    return Boolean(
      result && (
        result.includes('npm.dev.wixpress.com') ||
        result.match(/https?:\/\/repo.dev.wix\//)
      )
    );
  } catch (e) {
    console.error(`An error occured while looking for ${packageName} in Wix's registry:`, e);
    return false;
  }
}

function publishUnscopedPackage(originalPackage) {
  const unscopedPackage = {...originalPackage, name: unscope(originalPackage.name)};
  updateLockFiles(unscopedPackage.name);
  if (!verifyWixPackage(unscopedPackage.name)) {
    console.log('Skipping publishing unscoped package: not a Wix package');
  } else {
    console.log(`Publishing unscoped package ${unscopedPackage.name}`);
    publishToRegistry(unscopedPackage, 'http://npm.dev.wixpress.com');
  }
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
      if (!isScoped(bkp.name)) {
        publishToRegistry(pkg, 'https://registry.npmjs.org/');
      } else if (process.env.PUBLISH_UNSCOPED === 'true') {
        publishUnscopedPackage(bkp);
      }

      console.log('Granting access to "readonly" group to access', pkg.name);
      run('npm access grant read-only wix:readonly ' + pkg.name + ' --@wix:registry=https://registry.npmjs.org/');

      updateLockFiles(bkp.name);
      writeJsonFile('package.json', bkp);
      unlinkSync('.npmrc');
    } catch (error) {
      console.log('Failed to publish a scoped package, cause:', error);
      updateLockFiles(bkp.name);
      writeJsonFile('package.json', bkp);
      unlinkSync('.npmrc');
      process.exit(1);
    }
  } else {
    console.log('Current package is not publishable with scoped name, cause:', result);
  }
}
