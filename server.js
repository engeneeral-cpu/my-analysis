const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { registerAuthRoutes } = require('./auth-routes');
const { registerCompanyRoutes } = require('./company-routes');
const { registerCompanyIntelligenceRoutes } = require('./company-intelligence-routes');
const { registerCompany360Routes } = require('./company-360-routes');
const { registerLiveMarketRoutes } = require('./live-market-routes');
const { registerMarketPipelineRoutes } = require('./market-pipeline-routes');
const { registerMarketResilienceRoutes } = require('./market-resilience-routes');
const { registerMarketHistoryRoutes } = require('./market-history-routes');
const { registerHistoricalOHLCVRoutes } = require('./historical-ohlcv-routes');
const { registerExchangeCalendarRoutes } = require('./exchange-calendar');
const { registerAIChatRoutes } = require('./ai-chat-routes');
const { providerStatus, targetStatus, analyze: analyzeTara } = require('./tara-intelligence-engine');
const { answer: answerKnowledge } = require('./tara-knowledge-engine');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
const RELEASE = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'local';
app.disable('x-powered-by'); app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy:false, crossOriginEmbedderPolicy:false, referrerPolicy:{policy:'strict-origin-when-cross-origin'}, frameguard:{action:'deny'}, hsts:isProduction?{maxAge:31536000,includeSubDomains:true,preload:true}:false }));
const allowedOrigins=String(process.env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);
app.use(cors({origin(origin,cb){if(!origin||allowedOrigins.length===0||allowedOrigins.includes(origin))return cb(null,true);return cb(new Error('CORS origin denied'));},credentials:true,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization','X-Requested-With']}));
app.use(express.json({limit:'100kb',strict:true})); app.use(express.urlencoded({extended:false,limit:'50kb'}));
const apiLimiter=rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false,message:{success:false,error:'Too many requests. Please try again later.'}}); app.use('/api',apiLimiter);
const authLimiter=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,message:{success:false,error:'Too many authentication attempts. Please try again later.'}}); app.use('/api/auth',authLimiter);
app.use(express.static(__dirname,{dotfiles:'deny',etag:true,maxAge:0,setHeaders(res,filePath){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Permissions-Policy','camera=(), microphone=(self), geolocation=()');if(/\.(?:html?|js|css)$/.test(filePath))res.setHeader('Cache-Control','no-cache');else res.setHeader('Cache-Control','public, max-age=3600');}}));
registerAuthRoutes(app); registerCompanyRoutes(app); registerCompanyIntelligenceRoutes(app); registerCompany360Routes(app); registerLiveMarketRoutes(app); registerMarketPipelineRoutes(app); registerMarketResilienceRoutes(app); registerMarketHistoryRoutes(app); registerHistoricalOHLCVRoutes(app); registerExchangeCalendarRoutes(app); registerAIChatRoutes(app);
let verifiedMarketData={nifty:null,equities:[]}; function validateMarketDataset(d){return !!d&&Array.isArray(d.equities);}
app.get('/api/health',(req,res)=>res.json({success:true,service:'tara-ai',status:'ok',release:RELEASE,time:new Date().toISOString()}));
app.get('/api/security-status',(req,res)=>res.json({success:true,security:{headers:true,rateLimiting:true,strictBodyLimits:true,poweredByHidden:true,productionHsts:isProduction,secretsInEnvironmentOnly:true,microphonePolicy:'self'},release:RELEASE,note:'Security controls are enabled; independent penetration testing is still required before production launch.'}));
app.get('/api/tara-intelligence/status',(req,res)=>res.json({success:true,engine:'Tara Intelligence Engine',release:RELEASE,providers:providerStatus(),targets:targetStatus(),policy:'verified-data-only'}));
app.post('/api/tara-intelligence/analyze',(req,res)=>{try{const symbol=String(req.body?.symbol||'').trim();if(!symbol)return res.status(400).json({success:false,error:'Company symbol is required.'});return res.json(analyzeTara(req.body));}catch(e){return res.status(400).json({success:false,error:e.message});}});
app.post('/api/tara-knowledge/answer',(req,res)=>{const query=String(req.body?.query||'').trim().slice(0,500);if(!query)return res.status(400).json({success:false,error:'Query is required.'});return res.json({success:true,...answerKnowledge(query)});});
app.get('/api/tara-knowledge/status',(req,res)=>res.json({success:true,engine:'Tara Finance Knowledge Engine',mode:'native-educational',verified:true,topics:'core finance concepts',investmentAdvice:false}));
app.get('/api/market-data',(req,res)=>validateMarketDataset(verifiedMarketData)?res.json({success:true,timestamp:new Date().toISOString(),data:verifiedMarketData}):res.status(500).json({success:false,error:'Market data validation failed'}));
app.post('/api/analyze',(req,res)=>{const query=String(req.body?.query||'').trim().slice(0,500);if(!query)return res.status(400).json({success:false,error:'Query is required'});res.json({success:true,aiName:'Tara AI',found:false,text:`Tara AI is ready to research \"${query}\". Source-backed company intelligence is served through the company API.`});
});
app.use('/api',(req,res)=>res.status(404).json({success:false,error:'Tara AI API endpoint not found.'}));
app.use((err,req,res,next)=>{if(err?.message==='CORS origin denied')return res.status(403).json({success:false,error:'Origin not allowed'});console.error('[Tara Security] Request error:',err?.message||'Unknown error');return res.status(500).json({success:false,error:'Internal server error'});});
app.use((req,res)=>res.status(404).sendFile(path.join(__dirname,'404.html')));

const server = app.listen(PORT, HOST, () => {
  console.log(`[Tara AI Engine] Active on ${HOST}:${PORT} • release ${RELEASE}`);
});
server.on('error', error => {
  console.error(`[Tara AI Engine] Failed to bind ${HOST}:${PORT}:`, error);
  process.exitCode = 1;
});

process.on('uncaughtException', error => {
  console.error('[Tara AI Engine] Uncaught exception:', error);
  process.exitCode = 1;
});
process.on('unhandledRejection', reason => {
  console.error('[Tara AI Engine] Unhandled rejection:', reason);
  process.exitCode = 1;
});
