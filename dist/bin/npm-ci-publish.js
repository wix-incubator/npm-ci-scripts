'use strict';

var _publish = require('../src/publish');

var _publishScoped = require('../src/publish-scoped');

var _utils = require('../src/utils');

(0, _utils.logBlockOpen)('npm publish');
(0, _publish.publish)();
(0, _utils.logBlockClose)('npm publish');

if (process.env.PUBLISH_SCOPED) {
  (0, _utils.logBlockOpen)('npm publish to wix scope');
  (0, _publishScoped.publishScoped)();
  (0, _utils.logBlockClose)('npm publish to wix scope');
}