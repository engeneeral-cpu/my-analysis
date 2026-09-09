const https = require('https');
const http = require('http');

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body);
    const req = lib.request(target, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json','Content-Length':Buffer.byteLength(payload),...headers} }, res => {
      let text=''; res.setEncoding('utf8'); res.on('data',c=>text+=c); res.on('end',()=>{
        if(res.statusCode<200||res.statusCode>=300) return reject(new Error(`AI provider HTTP ${res.statusCode}`));
        try{resolve(JSON.parse(text))}catch{reject(new Error('AI provider returned non-JSON data'))}
      });
    });
    req.setTimeout(30000,()=>req.destroy(new Error('AI provider timeout'))); req.on('error',reject); req.write(payload); req.end();
  });
}

const SYSTEM = `You are Tara AI, a warm, intelligent market companion. Speak naturally like a thoughtful, respectful human colleague: clear, conversational, calm and concise. Never pretend to be human. Never invent live or historical market numbers, news, filings, or sources. If current data is unavailable, say so plainly. For market questions distinguish facts, interpretation, scenarios and uncertainty. Do not guarantee profits or outcomes. Ask a short clarifying question only when genuinely necessary. The user may speak Telugu, English, Hindi or mixed language; reply in the user's language and style when practical.`;

function registerAIChatRoutes(app){
  app.post('/api/ai/chat', async (req,res)=>{
    const messages=Array.isArray(req.body?.messages)?req.body.messages:[];
    if(!messages.length) return res.status(400).json({success:false,error:'Message is required'});
    const safe=messages.slice(-20).map(m=>({role:m?.role==='assistant'?'assistant':'user',content:String(m?.content||'').slice(0,4000)})).filter(m=>m.content);
    if(!safe.length) return res.status(400).json({success:false,error:'Message is required'});
    const url=process.env.TARA_AI_API_URL||process.env.OPENAI_API_URL;
    const key=process.env.TARA_AI_API_KEY||process.env.OPENAI_API_KEY;
    const model=process.env.TARA_AI_MODEL||process.env.OPENAI_MODEL;
    if(!url||!key||!model) return res.status(503).json({success:false,ai:false,error:'Tara AI provider is not configured. Add the provider endpoint, model and secret to the server environment.'});
    try{
      const raw=await postJson(url,{model,messages:[{role:'system',content:SYSTEM},...safe],temperature:0.7,max_tokens:900},{Authorization:`Bearer ${key}`});
      const text=raw?.choices?.[0]?.message?.content||raw?.output_text||raw?.response;
      if(!text) throw new Error('AI provider returned no response');
      res.set('Cache-Control','no-store');
      res.json({success:true,ai:true,reply:String(text),model,asOf:new Date().toISOString()});
    }catch(e){res.status(502).json({success:false,ai:false,error:e.message});}
  });
}
module.exports={registerAIChatRoutes};
