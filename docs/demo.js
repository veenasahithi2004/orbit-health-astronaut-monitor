const $=s=>document.querySelector(s);let allRecords=[],selectedAstronaut='';
const fmtDate=d=>new Date(`${d}T00:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const avg=(rows,key)=>rows.length?rows.reduce((s,r)=>s+Number(r[key]||0),0)/rows.length:0;
function render(rows){const latest=rows.reduce((a,b)=>!a||b.mission_day>a.mission_day?b:a,null);if(!latest)return;const cards=[['Heart rate','♥',latest.heart_rate_bpm,'bpm','BPM · RESTING','var(--gold)'],['Blood pressure','⌁',`${latest.blood_pressure_systolic_mmhg}/${latest.blood_pressure_diastolic_mmhg}`,'mmHg','SYSTOLIC / DIASTOLIC','var(--lavender)'],['Blood glucose','◉',latest.blood_glucose_mg_dl,'mg/dL','LATEST READING','var(--gold-soft)'],['Body temperature','♨',latest.body_temperature_c,'°C','CORE TEMPERATURE','var(--purple)'],['Sleep','☾',latest.sleep_hours,'hrs','LAST SLEEP PERIOD','var(--blue)'],['Mood','✳',latest.mood,'','SELF-REPORTED','var(--green)']];$('#metrics').innerHTML=cards.map(([n,i,v,u,f,c])=>`<article class="metric-card" style="--accent:${c};--glow:${c}"><div class="metric-top"><span class="metric-icon">${i}</span><i class="status-dot"></i></div><div class="metric-label">${n}</div><div class="metric-value">${v} <small>${u}</small></div><div class="metric-foot">${f}</div></article>`).join('');renderChart(rows);renderBaseline(rows);renderInsight(latest);renderHistory(rows);renderContext(latest)}
function renderChart(rows){const data=rows.slice(-12);if(!data.length)return;const pts=data.map((r,i)=>({x:8+i*664/Math.max(1,data.length-1),y:12+(100-Math.min(100,Math.max(50,r.heart_rate_bpm)))/50*106,sy:12+(10-Math.min(10,r.sleep_hours))/10*106}));const line=p=>p.map((q,i)=>`${i?'L':'M'} ${q.x} ${q.y}`).join(' ');$('#trend-chart').innerHTML=`<defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e7c36a" stop-opacity=".2"/><stop offset="1" stop-color="#e7c36a" stop-opacity="0"/></linearGradient></defs><path d="${line(pts)} L ${pts.at(-1).x} 135 L ${pts[0].x} 135 Z" fill="url(#area)"/><path d="${line(pts)}" fill="none" stroke="#e7c36a" stroke-width="2" vector-effect="non-scaling-stroke"/>${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="#0f1927" stroke="#f2d98a" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`).join('')}<path d="${pts.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.sy}`).join(' ')}" fill="none" stroke="#b995f5" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" opacity=".8"/>`;$('#x-labels').innerHTML=[data[0],data[Math.floor((data.length-1)/2)],data.at(-1)].map(r=>`<span>${fmtDate(r.date)}</span>`).join('')}
function renderBaseline(rows){const d=rows.slice(-12);$('#baseline-summary').innerHTML=`<span>12 check-in avg · <b>${avg(d,'heart_rate_bpm').toFixed(0)} bpm</b></span><span><b>${avg(d,'sleep_hours').toFixed(1)} hrs</b> sleep avg</span>`}
function renderInsight(r){const low=r.sleep_hours<6||r.mood==='low',summary=low?'Your check-in suggests a moment to <strong>pause and check in.</strong>':'Your latest signals are <strong>steady in this snapshot.</strong>',details=low?`${r.sleep_hours} hours sleep · mood: ${r.mood}. Consider your rest routine and a crew check-in if this continues.`:`${r.heart_rate_bpm} bpm · ${r.sleep_hours} hours sleep · mood: ${r.mood}. Compare with your own pattern and note anything that feels different.`;$('#insight').innerHTML=`<div class="insight-summary">${summary}</div><div class="insight-details">${details}</div><div class="demo-guidance">Demo prompt only · Follow mission medical procedures.</div>`}
function safeText(s){const e=document.createElement('span');e.textContent=s||'';return e.innerHTML}
function renderContext(r){const rad=r.radiation_dose_msv!==''&&r.radiation_dose_msv!=null?`${r.radiation_dose_msv} mSv recorded`:'No radiation reading logged',ex=r.exercise_minutes!==''&&r.exercise_minutes!=null?`${r.exercise_minutes} min exercise`:'Exercise not recorded',p=[`<span class="context-chip">${r.gravity_phase||'not recorded'} gravity</span>`,`<span class="context-chip">${rad}</span>`,`<span class="context-chip">${ex}</span>`];if(r.symptoms)p.push(`<span class="context-chip">Symptoms: ${safeText(r.symptoms)}</span>`);if(r.crew_note)p.push(`<span class="context-chip">Note: ${safeText(r.crew_note)}</span>`);$('#context-summary').innerHTML=p.join('')}
function renderHistory(rows){$('#history-list').innerHTML=rows.slice(-4).reverse().map(r=>`<div class="history-item"><div><div class="history-date">${fmtDate(r.date)} <span style="color:#5f738d">· Day ${r.mission_day}</span></div><div class="history-sub">♥ ${r.heart_rate_bpm} BPM&nbsp;&nbsp; ☾ ${r.sleep_hours} HRS</div></div><div><div class="history-values">${r.blood_pressure_systolic_mmhg}/${r.blood_pressure_diastolic_mmhg}</div><div class="history-mood">${r.mood}</div></div></div>`).join('')}
function parseCsv(text){
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}
    else if(c===','&&!quoted){row.push(value);value=''}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(cell=>cell!==''))rows.push(row);row=[];value=''}
    else value+=c
  }
  if(value!==''||row.length){row.push(value);rows.push(row)}
  const headers=rows.shift()||[];
  return rows.map(cells=>Object.fromEntries(headers.map((key,i)=>[key,cells[i]??''])))
}
async function load(){
  const response=await fetch('demo-data.csv');
  if(!response.ok)throw Error('Could not load the public demo data.');
  allRecords=parseCsv(await response.text());
  const numeric=['mission_day','heart_rate_bpm','blood_pressure_systolic_mmhg','blood_pressure_diastolic_mmhg','blood_glucose_mg_dl','body_temperature_c','sleep_hours','radiation_dose_msv','exercise_minutes'];
  allRecords.forEach(record=>numeric.forEach(key=>{if(record[key]!==''&&record[key]!=null)record[key]=Number(record[key])}));
  const astronauts=[...new Set(allRecords.map(record=>record.astronaut_id))];
  const select=$('#astronaut-select');
  select.innerHTML=astronauts.map(id=>'<option value="'+id+'">'+id.replace('ASTRONAUT-','Crew ')+'</option>').join('');
  selectedAstronaut=select.value;
  render(allRecords.filter(record=>record.astronaut_id===selectedAstronaut));
  select.addEventListener('change',()=>{selectedAstronaut=select.value;render(allRecords.filter(record=>record.astronaut_id===selectedAstronaut))})
}
$('#today').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
$('#reading-form').addEventListener('submit',e=>{
  e.preventDefault();
  const form=e.currentTarget,reading=Object.fromEntries(new FormData(form).entries());
  reading.astronaut_id=selectedAstronaut;
  reading.mission_day=Math.max(...allRecords.filter(r=>r.astronaut_id===selectedAstronaut).map(r=>r.mission_day),0)+1;
  reading.record_id='preview-'+Date.now();
  reading.date=new Date().toISOString().slice(0,10);
  reading.data_type='temporary public demo entry';
  for(const key of ['heart_rate_bpm','blood_pressure_systolic_mmhg','blood_pressure_diastolic_mmhg','blood_glucose_mg_dl','body_temperature_c','sleep_hours'])reading[key]=Number(reading[key]);
  if(reading.radiation_dose_msv!=='')reading.radiation_dose_msv=Number(reading.radiation_dose_msv);
  if(reading.exercise_minutes!=='')reading.exercise_minutes=Number(reading.exercise_minutes);
  allRecords.push(reading);
  render(allRecords.filter(record=>record.astronaut_id===selectedAstronaut));
  const msg=$('#form-message');msg.style.color='';msg.textContent='Preview only: this check-in is not uploaded or saved. Reload to restore the sample data.';
  const toast=$('#toast');toast.textContent='Preview updated · not saved';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),4000);
  form.reset()
});
load().catch(()=>{$('#insight').textContent='Could not load the local demo data. Start the app with npm start.'});
function startGalaxy(){const canvas=$('#galaxy-canvas'),ctx=canvas?.getContext('2d',{alpha:true});if(!ctx)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let w=0,h=0,stars=[],frame=0,seed=71421;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};function resize(){const ratio=Math.min(devicePixelRatio||1,1.5);w=innerWidth;h=innerHeight;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);const n=Math.max(45,Math.min(130,Math.round(w*h/11500)));stars=Array.from({length:n},()=>({x:rand()*w,y:rand()*h,r:.45+rand()*1.25,phase:rand()*6.28,speed:.004+rand()*.007,driftX:(rand()-.5)*.075,driftY:(rand()-.5)*.075,tone:rand()}))}function draw(){ctx.clearRect(0,0,w,h);frame++;for(const s of stars){const alpha=reduced ? .72 : .38+.48*(.5+.5*Math.sin(frame*s.speed+s.phase));if(!reduced){s.x+=s.driftX;s.y+=s.driftY;if(s.x>w+2)s.x=-2;if(s.x< -2)s.x=w+2;if(s.y>h+2)s.y=-2;if(s.y< -2)s.y=h+2;}ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.28);ctx.fillStyle=s.tone>.84?`rgba(238,207,126,${alpha*.88})`:`rgba(207,182,255,${alpha*.83})`;ctx.fill();if(s.r>1.25){ctx.beginPath();ctx.arc(s.x,s.y,s.r*3,0,6.28);ctx.fillStyle=s.tone>.84?'rgba(231,195,106,.055)':'rgba(185,149,245,.06)';ctx.fill()}}const reach=Math.min(185,Math.max(125,w*.16));for(let i=0;i<stars.length;i++){let links=0;for(let j=i+1;j<stars.length&&links<2;j++){const a=stars[i],b=stars[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<reach){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(183,145,238,${(1-d/reach)*(.24+.2*(.5+.5*Math.sin(frame*.014+a.phase+b.phase)))})`;ctx.lineWidth=.65;ctx.stroke();links++}}}if(!reduced)requestAnimationFrame(draw)}resize();draw();addEventListener('resize',resize,{passive:true})}startGalaxy();
document.querySelectorAll('.nav-item').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active','beam-pulse'));link.classList.add('active');void link.offsetWidth;link.classList.add('beam-pulse');setTimeout(()=>link.classList.remove('beam-pulse'),2300)}));
