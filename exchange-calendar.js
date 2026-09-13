const INDIA_TZ = 'Asia/Kolkata';

// Official NSE 2026 capital-market holidays. Keep this list versioned and update it
// whenever NSE publishes the next annual calendar or a special-session circular.
const NSE_HOLIDAYS = new Map([
  ['2026-01-15','Municipal Corporation Election in Maharashtra'],
  ['2026-01-26','Republic Day'],
  ['2026-02-19','Chhatrapati Shivaji Maharaj Jayanti'],
  ['2026-03-03','Holi'],
  ['2026-03-19','Gudhi Padwa'],
  ['2026-03-26','Ram Navami'],
  ['2026-03-31','Mahavir Jayanti'],
  ['2026-04-01','Annual Bank Closing'],
  ['2026-04-03','Good Friday'],
  ['2026-04-14','Dr. Babasaheb Ambedkar Jayanti'],
  ['2026-05-01','Maharashtra Din / Buddha Pournima'],
  ['2026-05-28','Bakri Id (Id-Uz-Zuha)'],
  ['2026-06-26','Muharram'],
  ['2026-08-26','Id-E-Milad'],
  ['2026-09-14','Ganesh Chaturthi'],
  ['2026-10-02','Mahatma Gandhi Jayanti'],
  ['2026-10-20','Dussehra'],
  ['2026-11-10','Diwali (Bali Pratipada)'],
  ['2026-11-24','Guru Nanak Jayanti'],
  ['2026-12-25','Christmas']
]);

const SPECIAL_SESSIONS = new Map([
  ['2026-11-08',{name:'Diwali Laxmi Pujan / Muhurat Trading',status:'special',open:null,close:null,timingPending:true}]
]);

function dateInIndia(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:INDIA_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function weekday(dateString) {
  return new Intl.DateTimeFormat('en-US',{timeZone:INDIA_TZ,weekday:'short'}).format(new Date(`${dateString}T12:00:00+05:30`));
}
function validateDate(value) {
  const d=String(value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const x=new Date(`${d}T12:00:00+05:30`);
  return Number.isNaN(x.getTime())?null:d;
}
function sessionFor(dateString, exchange='NSE') {
  const date=validateDate(dateString); if(!date) throw new Error('Invalid date. Use YYYY-MM-DD.');
  const day=weekday(date);
  if(day==='Sat'||day==='Sun') return {exchange,date,status:'closed',reason:'Weekend',regular:false};
  const holiday=NSE_HOLIDAYS.get(date);
  if(holiday) return {exchange,date,status:'closed',reason:holiday,regular:false};
  const special=SPECIAL_SESSIONS.get(date);
  if(special) return {exchange,date,...special,regular:false};
  return {exchange,date,status:'open',reason:null,regular:true,preOpen:'09:00',regularOpen:'09:15',regularClose:'15:30',timezone:INDIA_TZ};
}
function nextTradingSession(fromDate=dateInIndia(), exchange='NSE') {
  let d=new Date(`${fromDate}T12:00:00+05:30`);
  for(let i=0;i<370;i++){
    d.setUTCDate(d.getUTCDate()+1);
    const key=new Intl.DateTimeFormat('en-CA',{timeZone:INDIA_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
    const s=sessionFor(key,exchange);
    if(s.status==='open'||s.status==='special') return s;
  }
  throw new Error('No next trading session found in the supported calendar horizon.');
}
function previousTradingSession(fromDate=dateInIndia(), exchange='NSE') {
  let d=new Date(`${fromDate}T12:00:00+05:30`);
  for(let i=0;i<370;i++){
    d.setUTCDate(d.getUTCDate()-1);
    const key=new Intl.DateTimeFormat('en-CA',{timeZone:INDIA_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
    const s=sessionFor(key,exchange);
    if(s.status==='open'||s.status==='special') return s;
  }
  throw new Error('No previous trading session found in the supported calendar horizon.');
}
function registerExchangeCalendarRoutes(app){
  app.get('/api/exchange-calendar/status',(req,res)=>{try{const date=validateDate(req.query.date)||dateInIndia();const exchange=String(req.query.exchange||'NSE').toUpperCase();const session=sessionFor(date,exchange);const now=dateInIndia();const next=session.status==='closed'?nextTradingSession(date,exchange):null;res.json({success:true,exchange,date,today:date===now,session,nextSession:next,source:'NSE official exchange calendar',updatedAt:new Date().toISOString()});}catch(e){res.status(400).json({success:false,error:e.message});}});
  app.get('/api/exchange-calendar/next-session',(req,res)=>{try{const date=validateDate(req.query.from)||dateInIndia();const exchange=String(req.query.exchange||'NSE').toUpperCase();res.json({success:true,exchange,from:date,nextSession:nextTradingSession(date,exchange),source:'NSE official exchange calendar',updatedAt:new Date().toISOString()});}catch(e){res.status(400).json({success:false,error:e.message});}});
  app.get('/api/exchange-calendar/previous-session',(req,res)=>{try{const date=validateDate(req.query.from)||dateInIndia();const exchange=String(req.query.exchange||'NSE').toUpperCase();res.json({success:true,exchange,from:date,previousSession:previousTradingSession(date,exchange),source:'NSE official exchange calendar',updatedAt:new Date().toISOString()});}catch(e){res.status(400).json({success:false,error:e.message});}});
}
module.exports={registerExchangeCalendarRoutes,sessionFor,nextTradingSession,previousTradingSession,dateInIndia};
