import { publish } from './publish';
import { execSync } from 'child_process';
import {
  writeJsonFile,
  readJsonFile,
  fileExists,
  isWixScoped,
  INTERNAL_REGISTRY,
} from './utils';

function publishToRegistry(name, to, publishType, sourceMD5) {
  const pkg = readJsonFile('package.json');
  pkg.name = name;
  pkg.publishConfig.registry = to;
  writeJsonFile('package.json', pkg);
  updateLockFiles(name);
  console.log('Publishing', pkg.name, 'to', to);
  return publish('--ignore-scripts', publishType, sourceMD5);
}

function validate(pkg) {
  if (isScoped(pkg.name)) {
    if (!isWixScoped(pkg.name)) {
      return 'package uses unsupported scope: ' + pkg.name;
    }
  } else if (!isWixRegistry(pkg.publishConfig.registry)) {
    return (
      'package is being published outside wix registry: ' +
      pkg.publishConfig.registry
    );
  }
  if (pkg.publishScoped === false || fileExists('publish-scoped.ignore')) {
    return 'developer switched a feature off';
  }
  return true;
}

function isWixRegistry(registry) {
  return registry.indexOf('.dev.wix') >= 0;
}

function isScoped(name) {
  return name.indexOf('@') >= 0;
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

// Verifies if a given package name is an internal Wix package
// by looking into the latest version `publishConfig.registry` configuration
// in `package.json`
//
// Examples:
//   > verifyWixPackage('this-package-surely-doesnt-exist')
//   false
//
//   > verifyWixPackage('react')
//   false
//
//   > verifyWixPackage('santa-core-utils')
//   true
function verifyWixPackage(packageName) {
  try {
    const result = execSync(
      `npm view --registry=${INTERNAL_REGISTRY} ${packageName} publishConfig.registry`,
      { stdio: 'pipe' },
    ).toString();
    return isWixRegistry(result);
  } catch (error) {
    if (error.stderr.toString().includes('npm ERR! code E404')) {
      console.log(`Package ${packageName} not found in registry. aborting.`);
    } else {
      console.error(
        `An error occured while looking for ${packageName} in Wix's registry:`,
        error,
      );
    }
    return false;
  }
}

/**
 * @param {import("./publish").PublishType} [publishType]
 * @param {string} sourceMD5
 */
export async function publishScoped(publishType, sourceMD5) {
  const pkg = readJsonFile('package.json');
  const restore = (bkp => () => {
    updateLockFiles(bkp.name);
    writeJsonFile('package.json', bkp);
  })(readJsonFile('package.json'));

  const result = validate(pkg);
  if (result === true) {
    try {
      if (isScoped(pkg.name)) {
        const unscopedName = pkg.name.replace('@wix/', '');
        if (pkg.publishUnscoped !== false && verifyWixPackage(unscopedName)) {
          await publishToRegistry(
            unscopedName,
            INTERNAL_REGISTRY,
            publishType,
            sourceMD5,
          );
        }
      } else {
        const scopedName = `@wix/${pkg.name}`;
        await publishToRegistry(
          scopedName,
          INTERNAL_REGISTRY,
          publishType,
          sourceMD5,
        );
      }
      restore();
    } catch (error) {
      console.log('Failed to publish a scoped package, cause:', error);
      restore();
      process.exit(1);
    }
  } else {
    console.log(
      'Current package is not publishable with scoped name, cause:',
      result,
    );
  }
}
