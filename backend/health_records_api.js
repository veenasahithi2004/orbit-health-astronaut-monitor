const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');
const DATA_FILE = path.join(PROJECT_ROOT, 'data', 'synthetic_astronaut_health_records.csv');
const PORT = Number(process.env.PORT || 3000);
const COLUMNS = ['record_id','astronaut_id','mission_day','date','heart_rate_bpm','blood_pressure_systolic_mmhg','blood_pressure_diastolic_mmhg','blood_glucose_mg_dl','body_temperature_c','sleep_hours','mood','radiation_dose_msv','gravity_phase','exercise_minutes','symptoms','crew_note','data_type'];
const CONTENT_TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8' };

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (!lines[0]) return [];
  const headers = lines.shift().split(',').map(value => value.replace(/^"|"$/g, ''));
  return lines.filter(Boolean).map(line => {
    const values = line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g).filter(Boolean).map(value => value.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    return Object.fromEntries(headers.map((header,index) => [header,values[index]]));
  });
}
function readRecords() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return parseCsv(fs.readFileSync(DATA_FILE, 'utf8')).map(record => ({
    ...record, mission_day:+record.mission_day, heart_rate_bpm:+record.heart_rate_bpm,
    blood_pressure_systolic_mmhg:+record.blood_pressure_systolic_mmhg,
    blood_pressure_diastolic_mmhg:+record.blood_pressure_diastolic_mmhg,
    blood_glucose_mg_dl:+record.blood_glucose_mg_dl, body_temperature_c:+record.body_temperature_c,
    sleep_hours:+record.sleep_hours,
  }));
}
function sendJson(response,status,payload) {
  response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});
  response.end(JSON.stringify(payload));
}
function readJsonBody(request) {
  return new Promise((resolve,reject) => {
    let body='';
    request.on('data',chunk => { body+=chunk; if(body.length>10000) reject(new Error('Request too large')); });
    request.on('end',() => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    request.on('error',reject);
  });
}
function validateReading(reading) {
  const ranges={heart_rate_bpm:[30,220],blood_pressure_systolic_mmhg:[50,260],blood_pressure_diastolic_mmhg:[30,160],blood_glucose_mg_dl:[20,600],body_temperature_c:[30,45],sleep_hours:[0,24]};
  for(const [field,[min,max]] of Object.entries(ranges)) if(!Number.isFinite(Number(reading[field]))||Number(reading[field])<min||Number(reading[field])>max) return `${field} must be between ${min} and ${max}`;
  if(!['positive','neutral','low'].includes(reading.mood)) return 'mood must be positive, neutral, or low';
  return null;
}
function getDemoGuidance(reading) {
  const guidance=[];
  if(reading.heart_rate_bpm<50||reading.heart_rate_bpm>100) guidance.push('Heart rate is outside the broad demo reference band. Recheck at rest and follow your mission medical protocol.');
  if(reading.blood_pressure_systolic_mmhg>=140||reading.blood_pressure_diastolic_mmhg>=90||reading.blood_pressure_systolic_mmhg<90) guidance.push('Blood pressure may need attention. Repeat the measurement as instructed and consult crew medical guidance.');
  if(reading.blood_glucose_mg_dl<70||reading.blood_glucose_mg_dl>180) guidance.push('Blood glucose is outside the demo reference band. Confirm timing and measurement, then follow your care plan.');
  if(reading.body_temperature_c>=38||reading.body_temperature_c<36) guidance.push('Temperature is outside the demo reference band. Recheck and consult mission medical guidance if it persists or you feel unwell.');
  if(reading.sleep_hours<6) guidance.push('Sleep was under 6 hours. Consider your planned rest routine and note contributing factors.');
  if(reading.mood==='low') guidance.push('You reported low mood. Consider a check-in with a crewmate or behavioral health support.');
  if(!guidance.length) guidance.push('No demo thresholds were crossed. Continue routine monitoring and note any symptoms or concerns.');
  return guidance;
}
function writeRecords(records) {
  const escapeCsv=value=>{const text=String(value??'');return /[",\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;};
  fs.writeFileSync(DATA_FILE,[COLUMNS.join(','),...records.map(record=>COLUMNS.map(column=>escapeCsv(record[column])).join(','))].join('\n')+'\n','utf8');
}
const server=http.createServer(async(request,response)=>{
  const url=new URL(request.url,'http://localhost');
  if(request.method==='OPTIONS'){response.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return response.end();}
  if(url.pathname==='/api/health'&&request.method==='GET') return sendJson(response,200,{status:'ok',dataset:'synthetic'});
  if(url.pathname==='/api/records'&&request.method==='GET') {
    let records=readRecords();const astronaut=url.searchParams.get('astronaut');
    if(astronaut) records=records.filter(record=>record.astronaut_id===astronaut);
    const limit=Math.min(500,Math.max(1,Number(url.searchParams.get('limit')||500)));
    return sendJson(response,200,{records:records.slice(-limit),astronauts:[...new Set(readRecords().map(record=>record.astronaut_id))],source:'synthetic demo data'});
  }
  if(url.pathname==='/api/records'&&request.method==='POST') {
    try {
      const input=await readJsonBody(request);const error=validateReading(input);if(error)return sendJson(response,400,{error});
      if(input.radiation_dose_msv!==''&&input.radiation_dose_msv!=null&&(!Number.isFinite(Number(input.radiation_dose_msv))||Number(input.radiation_dose_msv)<0||Number(input.radiation_dose_msv)>1000)) return sendJson(response,400,{error:'radiation_dose_msv must be between 0 and 1000, or left blank'});
      if(input.exercise_minutes!==''&&input.exercise_minutes!=null&&(!Number.isFinite(Number(input.exercise_minutes))||Number(input.exercise_minutes)<0||Number(input.exercise_minutes)>600)) return sendJson(response,400,{error:'exercise_minutes must be between 0 and 600'});
      if(input.gravity_phase&&!['microgravity','lunar','martian','transition','not recorded'].includes(input.gravity_phase)) return sendJson(response,400,{error:'gravity_phase is not a supported option'});
      const records=readRecords();const astronaut=String(input.astronaut_id||'ASTRONAUT-01').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32);
      const record={record_id:randomUUID(),astronaut_id:astronaut,mission_day:Number(input.mission_day)||1,date:new Date().toISOString().slice(0,10),heart_rate_bpm:Number(input.heart_rate_bpm),blood_pressure_systolic_mmhg:Number(input.blood_pressure_systolic_mmhg),blood_pressure_diastolic_mmhg:Number(input.blood_pressure_diastolic_mmhg),blood_glucose_mg_dl:Number(input.blood_glucose_mg_dl),body_temperature_c:Number(input.body_temperature_c),sleep_hours:Number(input.sleep_hours),mood:input.mood,radiation_dose_msv:input.radiation_dose_msv===''||input.radiation_dose_msv==null?'':Number(input.radiation_dose_msv),gravity_phase:input.gravity_phase||'not recorded',exercise_minutes:input.exercise_minutes===''||input.exercise_minutes==null?'':Number(input.exercise_minutes),symptoms:String(input.symptoms||'').slice(0,240),crew_note:String(input.crew_note||'').slice(0,500),data_type:'user-entered demo'};
      records.push(record);writeRecords(records);
      return sendJson(response,201,{record,guidance:getDemoGuidance(record),notice:'Saved to the local demo dataset. Guidance uses illustrative thresholds only.'});
    } catch(error){return sendJson(response,400,{error:error.message});}
  }
  const files={'/':'astronaut_health_dashboard.html','/index.html':'astronaut_health_dashboard.html','/astronaut_health_dashboard.html':'astronaut_health_dashboard.html','/astronaut_health_dashboard.css':'astronaut_health_dashboard.css','/astronaut_health_dashboard.js':'astronaut_health_dashboard.js'};
  const filename=files[url.pathname];if(!filename){response.writeHead(404);return response.end('Not found');}
  fs.readFile(path.join(FRONTEND_DIR,filename),(error,data)=>{if(error){response.writeHead(404);return response.end('Not found');}response.writeHead(200,{'Content-Type':CONTENT_TYPES[path.extname(filename)]});response.end(data);});
});
server.listen(PORT,'127.0.0.1',()=>console.log(`Astronaut health dashboard: http://localhost:${PORT}`));
