const express = require('express');
const { registerAuthRoutes } = require('./auth-routes');

const originalListen = express.application.listen;
express.application.listen = function patchedListen(...args) {
  registerAuthRoutes(this);
  return originalListen.apply(this, args);
};

require('./server');
