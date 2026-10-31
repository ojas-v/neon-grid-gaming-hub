'use strict';
/* ===== helpers ===== */
const $=(s,r=document)=>r.querySelector(s),R=Math.random;
const G=()=>Math.sqrt(-2*Math.log(1-R()))*Math.cos(6.2832*R());
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const rmse=(a,b)=>Math.sqrt(mean(a.map((v,i)=>(v-b[i])**2)));
const win_=(a,i,k)=>a.slice(Math.max(0,i-(k>>1)),i+(k>>1)+1);
const mav=(a,k)=>a.map((_,i)=>mean(win_(a,i,k)));
const med=(a,k)=>a.map((_,i)=>{const s=win_(a,i,k).sort((x,y)=>x-y);return s[s.length>>1]});
function erf(x){const s=Math.sign(x);x=Math.abs(x);const t=1/(1+.3275911*x);return s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x))}
const Q=x=>.5*(1-erf(x/Math.SQRT2)),pdf=(x,m)=>Math.exp(-.5*(x-m)**2)/2.5066;
function cv(p,h=200,w=800){const c=document.createElement('canvas');c.width=w;c.height=h;c.className='plot';p.appendChild(c);return c.getContext('2d')}
function grid(x,lo=-2,hi=2){const c=x.canvas;x.clearRect(0,0,c.width,c.height);x.lineWidth=1;x.strokeStyle='#4df3ff14';
 for(let i=1;i<8;i++){x.beginPath();x.moveTo(0,i*c.height/8);x.lineTo(c.width,i*c.height/8);x.stroke()}
 const y0=c.height-(0-lo)/(hi-lo)*c.height;x.strokeStyle='#ffffff44';x.setLineDash([5,5]);x.beginPath();x.moveTo(0,y0);x.lineTo(c.width,y0);x.stroke();x.setLineDash([])}
function trace(x,a,col,lo=-2,hi=2,w=1.8,dash=[]){const c=x.canvas,n=a.length;x.beginPath();x.strokeStyle=col;x.lineWidth=w;x.setLineDash(dash);x.shadowColor=col;x.shadowBlur=6;
 a.forEach((v,i)=>{const X=i/(n-1)*c.width,Y=c.height-(v-lo)/(hi-lo)*c.height;i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke();x.setLineDash([]);x.shadowBlur=0}
const xy=(e,c)=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};

/* ===== audio + fx ===== */
let AC;const S={lvl:0,fuel:100,score:0,done:false,timer:null,name:'Rookie',mute:false,kit:new Set(),l5:null};
function beep(f=600,d=.12,t='sine',v=.05){if(S.mute)return;try{AC=AC||new AudioContext;const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(1e-4,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}}
const sfx={ok:()=>{beep(660,.1);setTimeout(()=>beep(990,.2),90)},bad:()=>beep(140,.25,'sawtooth',.07),tick:()=>beep(1200,.03,'square',.015),ping:()=>beep(1500,.15)};
const P=[];function burst(){for(let i=0;i<70;i++){const a=R()*6.28,v=2+R()*6;P.push({x:innerWidth/2,y:innerHeight/3,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:70,c:['#4df3ff','#ff4fd8','#ffb020','#6dffb0'][i%4]})}}

/* ===== telemetry: dashboard logs these to Supabase (see dashboard/dashboard-snippet.js) ===== */
const SID=Math.random().toString(36).slice(2,10);let LS={t:Date.now(),m:0};
function emit(msg){try{if(parent!==window)parent.postMessage(Object.assign({gameId:'pipeline-quest',sid:SID},msg),location.origin)}catch(e){}}
const FX={'Remove DC':a=>{const m=mean(a);return a.map(v=>v-m)},'Median (5)':a=>med(a,5),'Low-pass (7)':a=>mav(a,7),'Heavy smooth (41)':a=>mav(a,41)};
const HELP='<div class="obj" style="text-align:left;margin:16px auto;max-width:62ch"><b>How to play.</b> Ten sectors walk the 9-stage data science pipeline. Each sector gives an objective; you act by clicking, dragging or sliding, and NOVA reacts to every mistake. Mistakes burn fuel; at 0% the mission is lost. Your cargo choice in sector 2 matters later: a missing library costs fuel to resupply. Data is randomised every run, so answers cannot be memorised. Press Continue to skip NOVA\'s typing.</div>';
/* ===== HUD + NOVA ===== */
const NAMES=['Problem framing','Toolkit','Acquisition','Pre-profiling','Preprocessing','Post-profiling','EDA','Modeling','Generalisation','Deployment'];
function HUD(){$('#fuel').innerHTML=Array.from({length:10},(_,i)=>`<s class="${i<Math.ceil(S.fuel/10)?'on':''}"></s>`).join('');$('#fuel').className=S.fuel<=30?'low':'';
 $('#fuelv').textContent=S.fuel+'%';$('#score').textContent=S.score;
 $('#steps').innerHTML=NAMES.map((n,i)=>`<i class="${i<S.lvl?'done':i==S.lvl?'cur':''}" title="${n}">${i+1}</i>`).join('')}
function nova(t,cls=''){clearInterval(S.tt);const c=$('.comm');if(!c)return;c.className='comm panel '+cls;$('#nt').textContent=t;$('#orb').classList.remove('talk')}
function burn(n,why){LS.m++;S.fuel=Math.max(0,S.fuel-n);HUD();sfx.bad();const s=$('#stage');s.classList.remove('shake');void s.offsetWidth;s.classList.add('shake');
 if(S.fuel==0){clearInterval(S.timer);emit({type:'GAME_SCORE',score:S.score,maxScore:null,detail:'Signal lost · partial run'});return screen(`<div class="hero"><h1>Signal lost</h1><p class="tag">Kestrel-9 drifts out of range with the uplink still dead. Score ${S.score}.</p><button class="btn big" id="re">Restart mission</button></div>`,()=>$('#re').onclick=restart)}
 why&&nova(`−${n} fuel. ${why}`,'bad')}
function say(lines,done){let i=0,typing=false,L='';const tx=$('#nt'),nc=$('#nc'),orb=$('#orb');$('.comm').className='comm panel';
 const fin=()=>{clearInterval(S.tt);typing=false;tx.textContent=L;orb.classList.remove('talk');nc.textContent=i>=lines.length?'Understood':'Continue'};
 const next=()=>{if(i>=lines.length){nc.style.display='none';return done&&done()}
  L=lines[i++].replace(/\{n\}/g,S.name);let k=0;typing=true;nc.textContent='Skip';orb.classList.add('talk');
  S.tt=setInterval(()=>{tx.textContent=L.slice(0,++k);k%4||sfx.tick();k>=L.length&&fin()},20)};
 nc.style.display='';nc.onclick=()=>typing?fin():next();next()}
const shell=inner=>`<div class="comm panel"><div id="orb"></div><div class="ct"><b>NOVA · station AI</b><p id="nt"></p></div><button class="btn alt" id="nc">Skip</button></div>${inner}<div id="msg"></div>`;
function need(libs,p,go){const m=[].concat(libs).filter(l=>!S.kit.has(l));if(!m.length)return go();
 p.innerHTML=`<p>Missing from your cargo bay: <b>${m.join(', ')}</b>. This sector needs ${m.length>1?'them':'it'}.</p><button class="btn" id="rsup">Request resupply (−${10*m.length} fuel)</button>`;
 $('#rsup').onclick=()=>{burn(10*m.length,'Resupply drone launched.');if(S.fuel>0){m.forEach(l=>S.kit.add(l));p.innerHTML='';go()}}}
function screen(html,after){clearInterval(S.timer);clearInterval(S.tt);$('#stage').innerHTML=`<div class="panel">${html}</div>`;after&&after()}
function restart(){Object.assign(S,{lvl:0,fuel:100,score:0,kit:new Set(),l5:null});load()}
function load(){clearInterval(S.timer);document.onkeydown=null;S.done=false;HUD();if(S.lvl>=LEVELS.length)return finale();LS={t:Date.now(),m:0};emit({type:'GAME_EVENT',event:'level_start',level:S.lvl+1});const L=LEVELS[S.lvl];
 $('#stage').innerHTML=shell(`<div class="panel lock" id="pl"><h2>Sector ${S.lvl+1}: ${L.name}</h2><p class="obj">${L.brief}</p><div id="play"></div></div>`);
 say(L.intro,()=>{$('#pl').classList.remove('lock');L.run($('#play'))})}
function win(pts,extra=''){if(S.done||!$('#pl'))return;S.done=true;S.score+=pts;HUD();sfx.ok();burst();clearInterval(S.timer);const L=LEVELS[S.lvl];emit({type:'GAME_EVENT',event:'level_clear',level:S.lvl+1,mistakes:LS.m,ms:Date.now()-LS.t,meta:{pts}});
 say([L.outro],()=>{$('#msg').innerHTML=`<div class="debrief panel"><b>Sector cleared · +${pts}</b><p>${L.lesson} ${extra}</p><button class="btn" id="next">${S.lvl==LEVELS.length-1?'Incoming transmission':'Next sector'}</button></div>`;$('#next').onclick=()=>{S.lvl++;load()}})}
function finale(){$('#stage').innerHTML=shell('<div class="panel lock" id="pl"><h2>Final transmission</h2><p class="obj">Your call, {n}.</p><div class="opts" id="ch"></div></div>'.replace('{n}',S.name));
 say(['Detector holding. Uplink is back, {n}.','But I decoded the sweep. It repeats: "KESTREL, THIS IS HELIOS-7. HULL BREACH. ANYONE."','It was never a jammer. It is a distress beacon from a lost probe crew. We can notch it out and keep the link clean, or burn 15 fuel to answer them.'],()=>{
  $('#pl').classList.remove('lock');$('#ch').innerHTML='<button class="opt" data-c="a"><b>Notch it out</b><small>Safe. Link stays clean. The beacon fades behind us.</small></button><button class="opt" data-c="b"><b>Decode and reply</b><small>Costs 15 fuel. Worth +150 points.</small></button>';
  document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{const rep=b.dataset.c=='b';if(rep){S.fuel=Math.max(1,S.fuel-15);S.score+=150}HUD();sfx.ok();burst();emit({type:'GAME_SCORE',score:S.score,maxScore:null,detail:rep?'Finale complete · distress beacon answered':'Finale complete · link restored'});
   const rank=S.fuel>=70?'Flight director':S.fuel>=35?'Senior signal engineer':'Rookie who survived';
   screen(`<div class="hero"><h1>${rep?'Helios-7 answered':'Comms restored'}</h1><p class="tag">${rep?'Their crew heard you. A rescue tug is already burning toward them. You kept the pipeline honest and a crew alive.':'The link is clean and stable. Somewhere behind you, a beacon keeps repeating into the dark.'}</p>
   <p>Rank <b class="stat">${rank}</b></p><p>Score <span class="stat">${S.score}</span> &nbsp; Fuel <span class="stat">${S.fuel}%</span></p><p class="obj" style="margin:12px auto">${NAMES.map((n,i)=>(i+1)+' '+n).join(' → ')}</p><button class="btn big" id="re">Fly again</button></div>`,()=>$('#re').onclick=restart)})})}

/* ===== levels ===== */
const LEVELS=[
{name:'Problem framing',brief:'Four candidate detectors were tested on 1000 frames. Ship one that catches at least 80% of jammer frames with at most 15% false alarms. Open each confusion matrix before you decide.',
 intro:['{n}. Wake up. Kestrel-9 lost its deep-space uplink four minutes ago.','A jammer hits only some frames. Four candidate detectors were tested on 1000 of them, and the cards below are ranked by accuracy.','Do not trust a ranking until you know what it measures.'],
 outro:'Right. The top card by accuracy never caught a single jammer. Detection means Pd and Pfa, not accuracy.',
 lesson:'With rare positives, accuracy rewards a detector that always says "clear". Frame the task as detection and judge it by Pd and Pfa.',
 run(p){const N=1000,pr=.06+R()*.06,y=Array.from({length:N},()=>R()<pr?1:0),
  M=[['Always clear',()=>0],['Coin flip',()=>+(R()<.5)],['Detector A',t=>+(2.8*t+G()>1.3)],['Detector B',t=>+(2.8*t+G()>2.8)]].sort(()=>R()-.5);
  const rs=M.map(([n,f])=>{let tp=0,fp=0,fn=0,tn=0;y.forEach(t=>{const h=f(t);h&&t?tp++:h?fp++:t?fn++:tn++});return{n,tp,fp,fn,tn,acc:(tp+tn)/N,pd:tp/Math.max(1,tp+fn),pf:fp/(fp+tn)}}).sort((a,b)=>b.acc-a.acc);
  p.innerHTML=`<div class="opts">${rs.map((r,i)=>`<div class="opt" style="cursor:default"><b>${r.n}</b><span class="stat">${(r.acc*100).toFixed(1)}%</span> accuracy<div id="cm${i}" style="margin:8px 0;color:var(--dim)"></div><button class="btn alt" data-m="${i}">Confusion matrix</button> <button class="btn" data-s="${i}">Ship</button></div>`).join('')}</div>`;
  p.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const r=rs[b.dataset.m];$('#cm'+b.dataset.m).innerHTML=`Caught ${r.tp} of ${r.tp+r.fn} jammer frames (Pd ${(r.pd*100).toFixed(0)}%)<br>False alarms: ${r.fp} of ${r.fp+r.tn} clear frames (Pfa ${(r.pf*100).toFixed(0)}%)`;sfx.tick()});
  p.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{const r=rs[b.dataset.s];if(r.pd>=.8&&r.pf<=.15)return win(100);burn(15,`${r.n}: Pd ${(r.pd*100).toFixed(0)}%, Pfa ${(r.pf*100).toFixed(0)}%. It missed ${r.fn} of ${r.tp+r.fn} jammer frames or raised too many false alarms. Accuracy hid that.`)})}},
{name:'Toolkit',brief:'The cargo bay holds exactly 4 libraries. Click or drag to load it. Anything missing later costs fuel to resupply.',
 intro:['Good. Cargo bay check. It holds four libraries, no more.','Ahead of us: array maths and FFTs, filter design, detector training, spectrogram plots. Load what you will actually use.'],
 outro:'Cargo sealed. Every missing tool costs fuel to resupply later, so remember what you chose.',
 lesson:'NumPy for arrays and FFT, SciPy for filters and PSD, scikit-learn for models, Matplotlib for plots. The other libraries are dead weight here.',
 run(p){const U=['NumPy','SciPy','scikit-learn','Matplotlib'],all=U.concat(['Pygame','Django','BeautifulSoup','Flask']).sort(()=>R()-.5);let drag;
  p.innerHTML='<div class="pool" id="pp"></div><b>Cargo bay <span id="bc">0</span>/4</b><div class="pool" id="bb" style="min-height:58px;border:1px dashed var(--cy);padding:8px;margin-top:6px"></div><button class="btn" id="go">Seal cargo</button>';
  const pp=$('#pp'),bb=$('#bb'),mv=(d,to)=>{if(to==bb&&d.parentNode!=bb&&bb.children.length>=4)return nova('Bay is full. Remove one first.','bad');to.appendChild(d);$('#bc').textContent=bb.children.length;sfx.tick()};
  all.forEach(n=>{const d=document.createElement('div');d.className='lib';d.textContent=n;d.draggable=true;d.ondragstart=()=>{drag=d};d.onclick=()=>mv(d,d.parentNode==pp?bb:pp);pp.appendChild(d)});
  [pp,bb].forEach(z=>{z.ondragover=e=>e.preventDefault();z.ondrop=e=>{e.preventDefault();drag&&mv(drag,z)}});
  $('#go').onclick=()=>{const got=[...bb.children].map(d=>d.textContent);if(got.length<4)return nova('Fill all four slots first.');
   S.kit=new Set(got);const ok=got.filter(n=>U.includes(n)).length,miss=U.filter(n=>!got.includes(n));win(25*ok,miss.length?`Left behind: ${miss.join(', ')}. Expect resupply costs.`:'Perfect load. No resupply needed.')}}},
{name:'Acquisition',brief:'',
 intro:['Time to listen. I will capture 256 samples and run a spectrum on them.','The station logs say where the jammer really is. Choose a sampling rate so that my spectrum agrees.'],
 outro:'Spectrum matches the logs. A bad rate would have put the jammer at the wrong frequency, and nothing downstream could fix that.',
 lesson:'Sampling at fs folds any tone above fs/2 back to |f − k·fs|. After capture an alias is indistinguishable from a real tone, so fs must be right at acquisition.',
 run(p){const f0=2400+100*Math.floor(R()*13),fc=700,N=256,f=t=>.6*Math.sin(6.2832*f0*t)+.5*Math.sin(6.2832*fc*t);let fails=0,pk=0;
  $('#pl .obj').textContent=`Station logs: jammer at ${f0} Hz, comms tone at ${fc} Hz. Set the sampling rate, then capture. Your spectrum must put the jammer where the logs say.`;
  p.innerHTML='<div class="row"><span>Sampling rate</span><b class="stat" id="fv"></b><span id="al"></span></div><input type="range" id="fs" min="2000" max="16000" step="500" value="5000"><div class="row"><button class="btn" id="go">Capture</button></div>';
  const tx=cv(p,170),sx=cv(p,170),sl=$('#fs');
  const draw=()=>{const fs=+sl.value,x=Array.from({length:N},(_,i)=>f(i/fs)),T=.006,n6=Math.floor(T*fs)+1;
   const mag=Array.from({length:N/2},(_,k)=>{let re=0,im=0;x.forEach((v,i)=>{const w=v*(.5-.5*Math.cos(6.2832*i/(N-1))),a=6.2832*k*i/N;re+=w*Math.cos(a);im-=w*Math.sin(a)});return Math.hypot(re,im)});
   const m=Math.max(...mag),kb=mag.indexOf(m);pk=Math.round(kb*fs/N);
   grid(tx,-1.5,1.5);trace(tx,Array.from({length:500},(_,i)=>f(i/499*T)),'#ffffff40',-1.5,1.5,1.2);
   const Y=v=>170-(v+1.5)/3*170;tx.beginPath();tx.strokeStyle='#4df3ff';tx.lineWidth=2;for(let i=0;i<n6;i++){const X=i/fs/T*800;i?tx.lineTo(X,Y(x[i])):tx.moveTo(X,Y(x[i]))}tx.stroke();
   for(let i=0;i<n6;i++){tx.fillStyle='#ffb020';tx.beginPath();tx.arc(i/fs/T*800,Y(x[i]),3.5,0,6.3);tx.fill()}
   sx.clearRect(0,0,800,170);sx.strokeStyle='#4df3ff22';sx.strokeRect(0,0,800,170);const bw=800/mag.length;
   mag.forEach((v,k)=>{const h=v/m*140;sx.fillStyle=k==kb?'#ff4fd8':'#4df3ff99';sx.fillRect(k*bw,170-h,bw-1,h)});
   const hx=f0/(fs/2)*800;if(f0<=fs/2){sx.strokeStyle='#fff';sx.setLineDash([4,4]);sx.beginPath();sx.moveTo(hx,0);sx.lineTo(hx,170);sx.stroke();sx.setLineDash([])}
   sx.fillStyle='#fff';sx.font='12px Exo 2';sx.fillText('0 Hz',4,12);sx.fillText(fs/2+' Hz (fs/2)',690,12);sx.fillText(f0<=fs/2?'logs: '+f0+' Hz':'logs: '+f0+' Hz is above fs/2',Math.min(hx+5,600),28);
   $('#fv').textContent=fs+' Hz';$('#al').textContent='Spectrum peak at '+pk+' Hz'};
  sl.oninput=()=>{draw();sfx.tick()};draw();
  $('#go').onclick=()=>{const fs=+sl.value;if(Math.abs(pk-f0)<=Math.max(60,2*fs/N)){if(fs>12000){burn(5);return win(70,'Oversampling wasted storage. About 2.5 times the jammer frequency is plenty.')}return win(100)}
   fails++;burn(20,`Your spectrum puts the jammer at ${pk} Hz. The logs say ${f0} Hz. Something folded it.`+(fails>1?` Compare fs/2 = ${fs/2} Hz with ${f0} Hz.`:''))}}},
{name:'Pre-profiling',brief:'Scan the capture. Click a dropout, the clipped peaks, and the DC offset shift. Wrong clicks cost fuel.',
 intro:['Capture is in, but raw data lies. Hardware leaves fingerprints.','Scan the waveform and tag three faults before we trust a single sample.'],outro:'Dropout, clipping, DC shift. Three different faults, three different fixes.',
 lesson:'Profile before cleaning: dropouts (zeros), clipping (flat peaks) and level shifts (DC offset) each need a different fix.',
 run(p){const a1=100+Math.floor(R()*150),a2=330+Math.floor(R()*150),a3=680+Math.floor(R()*150),N=1000,s=Array.from({length:N},(_,i)=>{let v=.8*Math.sin(6.2832*i/50)+.3*Math.sin(6.2832*i/17)+.05*G();if(i>=a2&&i<a2+70)v=Math.max(-1,Math.min(1,v*2.5));if(i>=a1&&i<a1+60)v=0;if(i>=a3)v+=.6;return v});
  const F=[{n:'Dropout',a:a1,b:a1+60},{n:'Clipping',a:a2,b:a2+70},{n:'DC offset',a:a3,b:1000}],got=[];p.innerHTML='<div class="row" id="ck"></div>';const x=cv(p,260);
  const draw=()=>{grid(x,-2,2);trace(x,s,'#4df3ff');got.forEach(k=>{x.fillStyle='#ffb02033';x.fillRect(F[k].a*.8,0,(F[k].b-F[k].a)*.8,260);x.fillStyle='#ffb020';x.font='14px Orbitron';x.fillText(F[k].n,F[k].a*.8+6,20)});
   $('#ck').innerHTML=F.map((f,i)=>`<span class="btn alt ${got.includes(i)?'on':''}">${got.includes(i)?'✓ ':''}${f.n}</span>`).join('')};draw();
  x.canvas.onclick=e=>{if(S.done)return;const i=xy(e,x.canvas)[0]/.8,k=F.findIndex(f=>i>=f.a-15&&i<f.b+15);
   if(k<0||got.includes(k))return burn(5,'Nothing new there. Look for flat tops, zeros, and a shifted baseline.');got.push(k);sfx.ping();draw();got.length==3?win(100):nova(`${F[k].n} tagged. ${3-got.length} to go.`,'ok')}}},
{name:'Preprocessing',brief:'Build a filter chain. Click a chain item to remove it. Reach a cleanup score of 80. Dashed green is the reference signal.',
 intro:['Now we clean. Raw data has a DC offset, Gaussian noise, and impulse spikes, and they change every run.','Order matters. Try things. The plot updates live.'],outro:'Signal recovered. Look at what heavy smoothing did to the higher tone.',
 lesson:'Median first kills impulses; a low-pass first would smear them. Over-smoothing removes real signal.',
 run(p){need(['NumPy','SciPy'],p,()=>{const N=500,f1=4+Math.floor(R()*3),f2=11+Math.floor(R()*3),sg=.2+R()*.2,dc=.5+R()*.7,ns=6+Math.floor(R()*9),
  cl=Array.from({length:N},(_,i)=>Math.sin(6.2832*f1*i/N)+.5*Math.sin(6.2832*f2*i/N)),raw=cl.map(v=>v+dc+sg*G());for(let k=0;k<ns;k++)raw[10+Math.floor(R()*480)]+=R()<.5?3:-3;
  let ch=[],sc=0;S.l5={raw,cl,f2,ch:[]};
  p.innerHTML=`<div class="row">${Object.keys(FX).map(k=>`<button class="btn alt" data-k="${k}">+ ${k}</button>`).join('')}<button class="btn alt" id="rs">Reset</button></div><div>Chain: <span id="chn"></span></div><div class="row">Cleanup score <b class="stat" id="sc"></b></div><div class="meter"><div id="mb"></div><i></i></div>`;const x=cv(p,280);
  const draw=()=>{let o=raw;ch.forEach(k=>o=FX[k](o));sc=Math.max(0,Math.round(100*(1-rmse(o,cl)/rmse(raw,cl))));grid(x,-4,4.5);trace(x,raw,'#7e8bb8',-4,4.5,1);trace(x,cl,'#6dffb0',-4,4.5,1.6,[6,5]);trace(x,o,'#4df3ff',-4,4.5,2.2);
   $('#chn').innerHTML=ch.length?ch.map((k,i)=>`<button class="chip" data-i="${i}">${k} ✕</button>`).join(''):'(empty)';$('#sc').textContent=sc;$('#mb').style.width=sc+'%';
   p.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ch.splice(+c.dataset.i,1);draw()})};
  p.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ch.push(b.dataset.k);sfx.tick();draw()});$('#rs').onclick=()=>{ch=[];draw()};draw();
  const b=document.createElement('button');b.className='btn';b.textContent='Ship cleaned data';p.appendChild(b);
  b.onclick=()=>sc>=80?(S.l5.ch=[...ch],win(sc)):burn(6,`Score ${sc}, need 80. Try different orders. Does a smoothing step before the median help or hurt?`)})}},
{name:'Post-profiling',brief:'Four pipelines processed the same capture. Every number below is measured from the actual output. Ship one that passes all four gates.',
 intro:['Cleaned data is not proven data. I ran four pipelines on your capture and measured each one.','Gates: DC offset below 0.08, high-frequency noise below 0.10, zero spikes, at least 60 percent of the tone power kept. Ship a pipeline that clears every gate.'],
 outro:'Good audit. The noise number alone would have shipped the heavy smoother.',
 lesson:'Re-run the same diagnostics after cleaning, on every property you care about. Lower noise alone proves nothing: over-smoothing deletes the tone, and skipping DC removal leaves an offset.',
 run(p){const{raw,f2,ch}=S.l5,sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)**2)))},
  bin=(x,k)=>{let re=0,im=0;x.forEach((v,i)=>{const a=6.2832*k*i/x.length;re+=v*Math.cos(a);im-=v*Math.sin(a)});return re*re+im*im},
  C=[['Your pipeline',ch],['DC + heavy smooth',['Remove DC','Heavy smooth (41)']],['Median + low-pass, no DC',['Median (5)','Low-pass (7)']],['Station default',['Remove DC','Median (5)','Low-pass (7)']]].sort(()=>R()-.5),GN=['DC offset','HF noise','Spikes','Tone kept'];
  const rows=C.map(([n,c])=>{let o=raw;c.forEach(k=>o=FX[k](o));const sm=mav(o,9),md=med(o,5),v=[Math.abs(mean(o)),sd(o.map((x,i)=>x-sm[i])),o.filter((x,i)=>Math.abs(x-md[i])>.8).length,bin(o,f2)/bin(raw,f2)];return{n,c,v,g:[v[0]<.08,v[1]<.1,v[2]==0,v[3]>=.6]}});
  p.innerHTML=`<table><tr><th>Pipeline</th><th>DC offset</th><th>HF noise σ</th><th>Spikes</th><th>Tone kept</th><th></th></tr>${rows.map((r,i)=>`<tr><td>${r.n}<br><small style="color:var(--dim)">${r.c.join(' → ')}</small></td><td>${r.v[0].toFixed(3)}</td><td>${r.v[1].toFixed(3)}</td><td>${r.v[2]}</td><td>${(r.v[3]*100).toFixed(0)}%</td><td><button class="btn" data-i="${i}">Ship</button></td></tr>`).join('')}</table>`;
  p.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const r=rows[b.dataset.i],bad=GN.filter((n,i)=>!r.g[i]);bad.length?burn(10,`${r.n} fails: ${bad.join(', ')}.`):win(100)})}},
{name:'Exploratory analysis',brief:'Spectrogram: time runs along x, frequency up y. Tag all three emitters in 25 seconds: the steady carrier, the pulsed beacon, and the swept jammer.',
 intro:['Now we look. Spectrogram incoming. Three emitters share this band.','Tag each one. Not every bright line is hostile.'],outro:'Swept jammers are deterministic, so a clean diagonal is normal. But this one repeats with a message-like rhythm. Odd.',
 lesson:'Spectrograms separate signals by structure: steady lines are carriers, on/off blocks are beacons, a diagonal sweep is a chirp.',
 run(p){need('Matplotlib',p,()=>{const CF=10+Math.floor(R()*10),BF=44+Math.floor(R()*10),PP=60+Math.floor(R()*40),F=64,T=160,d=[];for(let t=0;t<T;t++){d[t]=[];for(let f=0;f<F;f++){let v=-Math.log(1-R())*.25;if(f==CF)v+=.9;if(f==BF&&Math.floor(t/20)%2==0)v+=.9;if(Math.abs(f-(8+(t%PP)/PP*48))<1)v+=1.2;d[t][f]=v}}
  const o=document.createElement('canvas');o.width=T;o.height=F;const oc=o.getContext('2d'),im=oc.createImageData(T,F);
  for(let t=0;t<T;t++)for(let f=0;f<F;f++){const u=Math.min(1,d[t][f]/1.8);im.data.set([30+225*u**1.3,10+170*u**2.4,90+140*Math.sin(u*3.14),255],((F-1-f)*T+t)*4)}oc.putImageData(im,0,0);
  p.innerHTML='<div class="meter"><div id="tb" style="width:100%;background:var(--am)"></div></div><div class="row" id="ck"></div>';const x=cv(p,320);x.imageSmoothingEnabled=false;x.drawImage(o,0,0,800,320);
  const found=new Set(),lab={c:'Carrier',b:'Beacon',j:'Jammer'};let left=25;
  const chips=()=>$('#ck').innerHTML=Object.keys(lab).map(k=>`<span class="btn alt ${found.has(k)?'on':''}">${found.has(k)?'✓ ':''}${lab[k]}</span>`).join('');chips();
  S.timer=setInterval(()=>{left-=.1;$('#tb').style.width=left/25*100+'%';if(left<=0){clearInterval(S.timer);burn(15,'Time up.');win(found.size*15)}},100);
  x.canvas.onclick=e=>{if(S.done)return;const[X,Y]=xy(e,x.canvas),t=Math.floor(X/5),f=F-1-Math.floor(Y/5);let k=null;
   if(Math.abs(f-(8+(t%PP)/PP*48))<=3)k='j';else if(Math.abs(f-CF)<=2)k='c';else if(Math.abs(f-BF)<=2){if(Math.floor(t/20)%2==0)k='b';else return burn(3,'The beacon is silent here. It pulses on and off.')}
   if(!k||found.has(k))return burn(5,'Noise, or already tagged. Look for structured tracks.');
   found.add(k);sfx.ping();x.strokeStyle='#6dffb0';x.lineWidth=2;x.beginPath();x.arc(X,Y,14,0,6.3);x.stroke();x.fillStyle='#6dffb0';x.font='13px Orbitron';x.fillText(lab[k],X+18,Y+4);chips();
   found.size==3?win(Math.round(40+left*2.4)):nova(`${lab[k]} tagged.`,'ok')}})}},
{name:'Modeling',brief:'Detector scores: noise ~ N(0,1), jammer ~ N(3,1). Set the threshold so Pd ≥ 90% and Pfa ≤ 10%. The green box on the ROC is the target.',
 intro:['Time to automate. My detector scores each frame.','Place the threshold. Catch 90 percent of hits with at most 10 percent false alarms.'],outro:'Operating point set. Every threshold is a tradeoff. No free lunch.',
 lesson:'The threshold trades Pd against Pfa along the ROC curve. Pick the operating point your mission needs.',
 run(p){const D=2.8+R()*.6;$('#pl .obj').textContent=`Detector scores: noise ~ N(0,1), jammer ~ N(${D.toFixed(1)},1). Set the threshold so Pd ≥ 90% and Pfa ≤ 10%. The green box on the ROC is the target.`;p.innerHTML='<div class="row"><canvas class="plot" id="pd" width="520" height="260" style="width:62%"></canvas><canvas class="plot" id="roc" width="260" height="260" style="width:33%"></canvas></div><input type="range" id="th" min="-1" max="4.5" step="0.01" value="0.2"><div class="row">Threshold <b class="stat" id="tv"></b> Pd <b class="stat" id="pdv"></b> Pfa <b class="stat" id="pfv"></b></div><button class="btn" id="go">Lock threshold</button>';
  const a=$('#pd').getContext('2d'),r=$('#roc').getContext('2d'),sl=$('#th');let pd,pf;
  const draw=()=>{const th=+sl.value;pd=Q(th-D);pf=Q(th);a.clearRect(0,0,520,260);const X=v=>(v+4)/11*520,Y=v=>255-v*560;
   [[0,'#4df3ff'],[D,'#ff4fd8']].forEach(([m,c])=>{a.beginPath();for(let v=-4;v<=7;v+=.05)a.lineTo(X(v),Y(pdf(v,m)));a.strokeStyle=c;a.lineWidth=2;a.stroke();
    a.beginPath();a.moveTo(X(th),255);for(let v=th;v<=7;v+=.05)a.lineTo(X(v),Y(pdf(v,m)));a.lineTo(X(7),255);a.fillStyle=c+'55';a.fill()});
   a.strokeStyle='#ffb020';a.lineWidth=2;a.beginPath();a.moveTo(X(th),0);a.lineTo(X(th),260);a.stroke();
   r.clearRect(0,0,260,260);r.strokeStyle='#4df3ff44';r.strokeRect(0,0,260,260);r.fillStyle='#6dffb033';r.fillRect(0,0,26,26);r.strokeStyle='#6dffb0';r.strokeRect(0,0,26,26);
   r.beginPath();for(let t=-4;t<=7;t+=.05)r.lineTo(Q(t)*260,260-Q(t-D)*260);r.strokeStyle='#4df3ff';r.lineWidth=2;r.stroke();r.fillStyle='#ffb020';r.beginPath();r.arc(pf*260,260-pd*260,6,0,6.3);r.fill();
   $('#tv').textContent=th.toFixed(2);$('#pdv').textContent=(pd*100).toFixed(1)+'%';$('#pfv').textContent=(pf*100).toFixed(1)+'%'};
  sl.oninput=draw;draw();$('#go').onclick=()=>pd>=.9&&pf<=.1?win(100):burn(6,`Pd ${(pd*100).toFixed(1)}%, Pfa ${(pf*100).toFixed(1)}%. Lower threshold raises both; higher lowers both.`)}},
{name:'Generalisation',brief:'Fit a curve to 20 measured points. Slide model complexity (polynomial degree), compare training error with validation error, then deploy. The test set stays hidden until you deploy.',
 intro:['Detector is tuned, but a threshold is not the whole model. We also predict link power from range with a fitted curve.','More complexity always fits the training points better. Find out whether it fits the next points better.'],
 outro:'Deployed. Training error alone would have picked the wildest curve. Validation error found the sweet spot.',
 lesson:'Training error keeps falling with complexity; validation error falls, then climbs. That U-shape is overfitting. Choose complexity on validation data, report on a held-out test set, and note that more data moves the optimum.',
 run(p){need('scikit-learn',p,()=>{const sg=.2+R()*.15,g=x=>Math.sin(3*x)+.5*Math.cos(7*x),mk=n=>Array.from({length:n},()=>{const x=R()*2-1;return[x,g(x)+sg*G()]}),va=mk(200),te=mk(200),DM=14;let tr=mk(20),M,seen=new Set();
  const bas=(x,d)=>{const b=[1,x];for(let k=2;k<=d;k++)b.push(2*x*b[k-1]-b[k-2]);return b.slice(0,d+1)},pr=(w,x)=>bas(x,w.length-1).reduce((s,b,i)=>s+b*w[i],0),er=(w,D)=>Math.sqrt(mean(D.map(([x,y])=>(pr(w,x)-y)**2)));
  const fit=(D,d)=>{const m=d+1,A=Array.from({length:m},()=>Array(m+1).fill(0));D.forEach(([x,y])=>{const b=bas(x,d);for(let i=0;i<m;i++){for(let j=0;j<m;j++)A[i][j]+=b[i]*b[j];A[i][m]+=b[i]*y}});for(let i=0;i<m;i++)A[i][i]+=1e-6;
   for(let i=0;i<m;i++){let q=i;for(let r=i+1;r<m;r++)if(Math.abs(A[r][i])>Math.abs(A[q][i]))q=r;[A[i],A[q]]=[A[q],A[i]];for(let r=i+1;r<m;r++){const f=A[r][i]/A[i][i];for(let c=i;c<=m;c++)A[r][c]-=f*A[i][c]}}
   const w=Array(m).fill(0);for(let i=m-1;i>=0;i--){let s=A[i][m];for(let j=i+1;j<m;j++)s-=A[i][j]*w[j];w[i]=s/A[i][i]}return w};
  const build=()=>{M=Array.from({length:DM},(_,i)=>{const w=fit(tr,i+1);return{d:i+1,w,tr:er(w,tr),va:er(w,va),te:er(w,te)}})};build();
  p.innerHTML='<div class="row">Degree <b class="stat" id="dv"></b> Train RMSE <b class="stat" id="trv"></b> Validation RMSE <b class="stat" id="vrv"></b></div><input type="range" id="dg" min="1" max="14" value="1"><div class="row"><button class="btn" id="dp">Deploy this model</button><button class="btn alt" id="mo">Collect 30 more samples (−8 fuel)</button></div>';
  const fx=cv(p,250),ex=cv(p,170),sl=$('#dg');
  const draw=()=>{const d=+sl.value,m=M[d-1];seen.add(d);grid(fx,-2.5,2.5);
   va.slice(0,80).forEach(([x,y])=>{fx.fillStyle='#ff4fd866';fx.fillRect((x+1)*400-1,125-y*50-1,3,3)});
   tr.forEach(([x,y])=>{fx.fillStyle='#4df3ff';fx.beginPath();fx.arc((x+1)*400,125-y*50,4,0,6.3);fx.fill()});
   fx.beginPath();fx.strokeStyle='#ffb020';fx.lineWidth=2.5;for(let i=0;i<=200;i++){const x=i/100-1,y=Math.max(-3,Math.min(3,pr(m.w,x)));i?fx.lineTo(i*4,125-y*50):fx.moveTo(i*4,125-y*50)}fx.stroke();
   ex.clearRect(0,0,800,170);ex.strokeStyle='#4df3ff22';ex.strokeRect(0,0,800,170);const X=k=>30+(k-1)*(740/13),Y=v=>165-Math.min(v,1.2)/1.2*140,pts=M.filter(q=>seen.has(q.d));
   [['tr','#4df3ff'],['va','#ff4fd8']].forEach(([key,c])=>{ex.beginPath();ex.strokeStyle=c;ex.lineWidth=2;pts.forEach((q,i)=>i?ex.lineTo(X(q.d),Y(q[key])):ex.moveTo(X(q.d),Y(q[key])));ex.stroke();pts.forEach(q=>{ex.fillStyle=c;ex.beginPath();ex.arc(X(q.d),Y(q[key]),4,0,6.3);ex.fill()})});
   ex.fillStyle='#fff';ex.font='12px Exo 2';ex.fillText('RMSE vs degree. Cyan: train. Pink: validation. Only degrees you tried are plotted.',8,14);
   $('#dv').textContent=d;$('#trv').textContent=m.tr.toFixed(3);$('#vrv').textContent=m.va.toFixed(3)};
  sl.oninput=()=>{draw();sfx.tick()};draw();
  $('#dp').onclick=()=>{const m=M[+sl.value-1],best=M.reduce((a,b)=>b.te<a.te?b:a);if(m.te<=best.te*1.25+.005)return win(100,`Test RMSE ${m.te.toFixed(3)}; best possible ${best.te.toFixed(3)} at degree ${best.d}.`);
   burn(8,m.d<best.d?`Degree ${m.d}: train ${m.tr.toFixed(2)} and validation ${m.va.toFixed(2)} are both high. Too simple, so it underfits.`:`Degree ${m.d}: train ${m.tr.toFixed(2)} but validation ${m.va.toFixed(2)}. It memorised the noise, so it overfits.`)};
  $('#mo').onclick=()=>{burn(8,'Survey drone dispatched: 30 more samples collected.');if(S.fuel>0){tr=tr.concat(mk(30));seen=new Set();build();draw()}}})}},
{name:'Deployment',brief:'Live stream, 20 seconds. False alarm costs 1, a missed jammer tick costs 3. Drag the slider or use the arrow keys. Keep total cost at 45 or less.',
 intro:['Going live. A false alarm wastes a crew check. A miss lets corrupted data through, three times worse.','Tune the threshold while the stream runs. Arrow keys work too.'],outro:'Link is stable under live traffic. I am reading the sweep one more time...',
 lesson:'In production the threshold is set by costs: a miss costs more than a false alarm, so the optimum sits below the equal-error point.',
 run(p){p.innerHTML='<canvas class="plot" width="800" height="200"></canvas><input type="range" id="th" min="-1" max="5" step="0.05" value="0.5"><div class="row">Threshold <b class="stat" id="tv"></b> False alarms <b class="stat" id="fa">0</b> Misses <b class="stat" id="ms">0</b> Cost <b class="stat" id="cs">0</b> Time <b class="stat" id="tm">0s</b></div><div class="meter"><div id="mb"></div></div><button class="btn" id="go">Start stream</button>';
  const x=$('canvas',p).getContext('2d'),sl=$('#th'),draw=()=>$('#tv').textContent=(+sl.value).toFixed(2);sl.oninput=draw;draw();
  document.onkeydown=e=>{if(e.key=='ArrowUp'||e.key=='ArrowRight')sl.value=+sl.value+.1;if(e.key=='ArrowDown'||e.key=='ArrowLeft')sl.value=+sl.value-.1;draw()};
  const go=()=>{let buf=[],fa=0,ms=0,t=0,burstL=0,gap=15;$('#go').style.display='none';
   S.timer=setInterval(()=>{t++;if(burstL>0)burstL--;else if(--gap<=0){burstL=10+Math.floor(R()*15);gap=20+Math.floor(R()*30)}
    const h1=burstL>0,v=(h1?3:0)+G(),th=+sl.value,al=v>th;if(al&&!h1)fa++;if(!al&&h1)ms++;buf.push({v,h1,al});if(buf.length>160)buf.shift();
    grid(x,-3,7);buf.forEach((b,i)=>{x.fillStyle=b.al?(b.h1?'#6dffb0':'#ff5470'):(b.h1?'#ffb020':'#4df3ff');x.fillRect(i*5,200-(b.v+3)/10*200-2,4,4)});
    const ty=200-(th+3)/10*200;x.strokeStyle='#ffffff';x.beginPath();x.moveTo(0,ty);x.lineTo(800,ty);x.stroke();const c=fa+3*ms;
    $('#fa').textContent=fa;$('#ms').textContent=ms;$('#cs').textContent=c;$('#tm').textContent=Math.floor(t/10)+'s';$('#mb').style.width=Math.min(100,c/45*100)+'%';
    if(t>=200){clearInterval(S.timer);if(c<=45)win(Math.max(20,300-4*c),`Final cost ${c}.`);else{burn(10,`Cost ${c}. Over budget. Orange dots are missed jammer ticks, red are false alarms.`);$('#go').style.display='';$('#go').textContent='Re-run stream'}}},100)};
  $('#go').onclick=go}}
];

/* ===== starfield + boot ===== */
(()=>{const c=$('#stars'),x=c.getContext('2d');let W,H;const st=Array.from({length:130},()=>({x:R(),y:R(),z:R()*1.8+.3}));
 const rs=()=>{W=c.width=innerWidth;H=c.height=innerHeight};rs();addEventListener('resize',rs);
 (function f(){x.clearRect(0,0,W,H);st.forEach(s=>{s.x=(s.x+s.z*.00015)%1;x.fillStyle=`rgba(190,220,255,${.25+s.z*.3})`;x.fillRect(s.x*W,s.y*H,s.z,s.z)});
  for(let i=P.length-1;i>=0;i--){const q=P[i];q.x+=q.vx;q.y+=q.vy;q.vy+=.08;if(--q.l<=0){P.splice(i,1);continue}x.globalAlpha=q.l/70;x.fillStyle=q.c;x.fillRect(q.x,q.y,3,3)}x.globalAlpha=1;requestAnimationFrame(f)})()})();
$('#mute').onclick=e=>{S.mute=!S.mute;e.target.textContent=S.mute?'Sound off':'Sound on'};
HUD();
screen(`<div class="hero"><div class="planet"></div><h1>Pipeline Quest</h1><p class="tag">Kestrel-9, relay station above Kepler-442b. The uplink is dead and something is screaming across the band. Work the data pipeline from problem statement to live alerting.</p><input id="nm" placeholder="Your callsign" maxlength="14"><button class="btn big" id="st">Initiate mission</button> <button class="btn alt big" id="hp">How to play</button><div id="hpb"></div></div>`,
 ()=>{$('#nm').value=(new URLSearchParams(location.search).get('player')||'').slice(0,14);$('#hp').onclick=()=>{$('#hpb').innerHTML=HELP};$('#st').onclick=()=>{S.name=$('#nm').value.trim()||'Rookie';beep(440,.1);load()}});
