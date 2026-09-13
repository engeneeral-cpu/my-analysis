const https = require('https');
const http = require('http');
const { processQuery } = require('./tara-intelligence-engine');
const { normalizeLanguage, extractSymbol, detectIntent, nativeReply } = require('./tara-chat-intent');

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url); const lib = target.protocol === 'https:' ? https : http; const payload = JSON.stringify(body);
    const req = lib.request(target,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Content-Length':Buffer.byteLength(payload),...headers}},res=>{let text='';res.setEncoding('utf8');res.on('data',c=>text+=c);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300){const e=new Error(`AI provider HTTP ${res.statusCode}`);e.statusCode=res.statusCode;reject(e);return;}try{resolve(JSON.parse(text));}catch{reject(new Error('AI provider returned non-JSON data'));}});});
    req.setTimeout(30000,()=>req.destroy(new Error('AI provider timeout'))); req.on('error',reject); req.write(payload); req.end();
  });
}
function cleanKey(value){let key=String(value||'').trim();const m=key.match(/^export\s+(?:TARA_AI_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY)\s*=\s*(.+)$/i);if(m)key=m[1].trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();return !key||key.startsWith('<')||['OPENAI_API_KEY','GEMINI_API_KEY'].includes(key)?'':key;}
function getExternalProvider(){const key=cleanKey(process.env.GEMINI_API_KEY);if(!key)return null;return {provider:'gemini',key,url:process.env.TARA_AI_API_URL||'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',model:process.env.TARA_AI_MODEL||'gemini-2.5-flash-lite'};}
function extract(raw){if(typeof raw?.output_text==='string')return raw.output_text.trim();return raw?.choices?.[0]?.message?.content||raw?.response||'';}
const LANG_NAMES={en:'English',hi:'Hindi',te:'Telugu',mr:'Marathi',ta:'Tamil',bn:'Bengali',gu:'Gujarati',kn:'Kannada',ml:'Malayalam',pa:'Punjabi',or:'Odia',as:'Assamese',ur:'Urdu',gom:'Konkani',ne:'Nepali'};
const SYSTEM='You are Tara AI, a market-intelligence assistant. Focus on market intelligence, finance education and company research. Never invent live/historical market data, sources or financial numbers. Distinguish facts, analysis, scenarios and uncertainty. Never guarantee profit or give harmful instructions.';

function registerAIChatRoutes(app){
  app.get('/api/ai/status',(req,res)=>{const external=getExternalProvider();res.set('Cache-Control','no-store');res.json({success:true,nativeEngine:true,nativeMode:'primary',externalFallback:Boolean(external),provider:external?.provider||'native',model:external?.model||'native-rule-engine',voice:'browser-speech-ready',languages:Object.keys(LANG_NAMES)});});
  app.post('/api/ai/chat',async(req,res)=>{
    const messages=(Array.isArray(req.body?.messages)?req.body.messages:[]).slice(-20).map(m=>({role:m?.role==='assistant'?'assistant':'user',content:String(m?.content||'').slice(0,4000)})).filter(m=>m.content);
    const single=String(req.body?.message||'').trim();
    if(single) messages.push({role:'user',content:single.slice(0,4000)});
    if(!messages.length)return res.status(400).json({success:false,error:'Message is required'});
    const latest=messages[messages.length-1].content;
    const language=normalizeLanguage(req.body?.language||req.body?.lang||'en');
    const symbol=String(req.body?.stockContext?.symbol||extractSymbol(latest)||'').toUpperCase();
    const intent=detectIntent(latest);
    const stockContext={...(req.body?.stockContext||{}),symbol};
    const nativeBase=processQuery(latest,stockContext);
    const native={...nativeBase,intent,symbol,language,text:nativeReply(intent,symbol,language)};
    const external=getExternalProvider();
    if(!external)return res.json({success:true,ai:true,native:true,provider:'native',reply:native.text,analysis:native,model:'native-rule-engine',language,intent,symbol,asOf:new Date().toISOString()});
    try{
      const languageName=LANG_NAMES[language]||'English';
      const languageInstruction=`Reply ONLY in ${languageName}. The user selected language code ${language}. Do not switch to Telugu unless the selected language is Telugu. Preserve stock symbols, numbers and financial terminology.`;
      const raw=await postJson(external.url,{model:external.model,messages:[{role:'system',content:`${SYSTEM}\n${languageInstruction}`},...messages],max_tokens:900,temperature:.4},{Authorization:`Bearer ${external.key}`});
      const text=extract(raw); if(!text)throw new Error('No external response');
      res.set('Cache-Control','no-store');res.json({success:true,ai:true,native:true,provider:'gemini-fallback',reply:text,nativeAnalysis:native,analysis:native,model:external.model,language,intent,symbol,asOf:new Date().toISOString()});
    }catch(e){
      console.error('[Tara AI] optional provider unavailable:',e.message);
      res.json({success:true,ai:true,native:true,provider:'native',fallbackFrom:'gemini',reply:native.text,analysis:native,model:'native-rule-engine',language,intent,symbol,asOf:new Date().toISOString()});
    }
  });
}
module.exports={registerAIChatRoutes};
