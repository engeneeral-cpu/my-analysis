const express = require('express');
const { registerAuthRoutes } = require('./auth-routes');
const { registerCompanyRoutes } = require('./company-routes');
const { registerLiveMarketRoutes } = require('./live-market-routes');

const originalListen = express.application.listen;
express.application.listen = function patchedListen(...args) {
  registerAuthRoutes(this);
  registerCompanyRoutes(this);
  registerLiveMarketRoutes(this);
  return originalListen.apply(this, args);
};

require('./server');
