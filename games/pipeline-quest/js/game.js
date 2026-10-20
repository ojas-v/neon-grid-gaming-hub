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
let AC;const S={lvl:0,fuel:100,score:0,done:false,timer:null,name:'Rookie',mute:false};
function beep(f=600,d=.12,t='sine',v=.05){if(S.mute)return;try{AC=AC||new AudioContext;const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(1e-4,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}}
const sfx={ok:()=>{beep(660,.1);setTimeout(()=>beep(990,.2),90)},bad:()=>beep(140,.25,'sawtooth',.07),tick:()=>beep(1200,.03,'square',.015),ping:()=>beep(1500,.15)};
// HUB INTEGRATION: report completed/failed run scores to the parent dashboard.
function reportHubScore(detail) {
 try {
  if (window.parent && window.parent !== window) {
   window.parent.postMessage({
    type: 'GAME_SCORE',
    gameId: 'pipeline-quest',
    score: Number(S.score) || 0,
    maxScore: null,
    detail: String(detail || 'Pipeline Quest run').slice(0, 180)
   }, window.location.origin);
  }
 } catch (err) { console.warn('Hub score report failed', err); }
}
const P=[];function burst(){for(let i=0;i<70;i++){const a=R()*6.28,v=2+R()*6;P.push({x:innerWidth/2,y:innerHeight/3,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:70,c:['#4df3ff','#ff4fd8','#ffb020','#6dffb0'][i%4]})}}

/* ===== HUD + NOVA ===== */
const NAMES=['Problem framing','Toolkit','Acquisition','Pre-profiling','Preprocessing','Post-profiling','EDA','Modeling','Deployment'];
function HUD(){$('#fuel').innerHTML=Array.from({length:10},(_,i)=>`<s class="${i<Math.ceil(S.fuel/10)?'on':''}"></s>`).join('');$('#fuel').className=S.fuel<=30?'low':'';
 $('#fuelv').textContent=S.fuel+'%';$('#score').textContent=S.score;
 $('#steps').innerHTML=NAMES.map((n,i)=>`<i class="${i<S.lvl?'done':i==S.lvl?'cur':''}" title="${n}">${i+1}</i>`).join('')}
function nova(t,cls=''){clearInterval(S.tt);const c=$('.comm');if(!c)return;c.className='comm panel '+cls;$('#nt').textContent=t;$('#orb').classList.remove('talk')}
function burn(n,why){S.fuel=Math.max(0,S.fuel-n);HUD();sfx.bad();const s=$('#stage');s.classList.remove('shake');void s.offsetWidth;s.classList.add('shake');
 if(S.fuel==0){clearInterval(S.timer);reportHubScore('Signal lost · partial run');return screen(`<div class="hero"><h1>Signal lost</h1><p class="tag">Kestrel-9 drifts out of range with the uplink still dead. Score ${S.score}.</p><button class="btn big" id="re">Restart mission</button></div>`,()=>$('#re').onclick=restart)}
 why&&nova(`−${n} fuel. ${why}`,'bad')}
function say(lines,done){let i=0,typing=false,L='';const tx=$('#nt'),nc=$('#nc'),orb=$('#orb');$('.comm').className='comm panel';
 const fin=()=>{clearInterval(S.tt);typing=false;tx.textContent=L;orb.classList.remove('talk');nc.textContent=i>=lines.length?'Understood':'Continue'};
 const next=()=>{if(i>=lines.length){nc.style.display='none';return done&&done()}
  L=lines[i++].replace(/\{n\}/g,S.name);let k=0;typing=true;nc.textContent='Skip';orb.classList.add('talk');
  S.tt=setInterval(()=>{tx.textContent=L.slice(0,++k);k%4||sfx.tick();k>=L.length&&fin()},20)};
 nc.style.display='';nc.onclick=()=>typing?fin():next();next()}
const shell=inner=>`<div class="comm panel"><div id="orb"></div><div class="ct"><b>NOVA · station AI</b><p id="nt"></p></div><button class="btn alt" id="nc">Skip</button></div>${inner}<div id="msg"></div>`;
function screen(html,after){clearInterval(S.timer);clearInterval(S.tt);$('#stage').innerHTML=`<div class="panel">${html}</div>`;after&&after()}
function restart(){Object.assign(S,{lvl:0,fuel:100,score:0});load()}
function load(){clearInterval(S.timer);document.onkeydown=null;S.done=false;HUD();if(S.lvl>=9)return finale();const L=LEVELS[S.lvl];
 $('#stage').innerHTML=shell(`<div class="panel lock" id="pl"><h2>Sector ${S.lvl+1}: ${L.name}</h2><p class="obj">${L.brief}</p><div id="play"></div></div>`);
 say(L.intro,()=>{$('#pl').classList.remove('lock');L.run($('#play'))})}
function win(pts,extra=''){if(S.done||!$('#pl'))return;S.done=true;S.score+=pts;HUD();sfx.ok();burst();clearInterval(S.timer);const L=LEVELS[S.lvl];
 say([L.outro],()=>{$('#msg').innerHTML=`<div class="debrief panel"><b>Sector cleared · +${pts}</b><p>${L.lesson} ${extra}</p><button class="btn" id="next">${S.lvl==8?'Incoming transmission':'Next sector'}</button></div>`;$('#next').onclick=()=>{S.lvl++;load()}})}
function finale(){$('#stage').innerHTML=shell('<div class="panel lock" id="pl"><h2>Final transmission</h2><p class="obj">Your call, {n}.</p><div class="opts" id="ch"></div></div>'.replace('{n}',S.name));
 say(['Detector holding. Uplink is back, {n}.','But I decoded the sweep. It repeats: "KESTREL, THIS IS HELIOS-7. HULL BREACH. ANYONE."','It was never a jammer. It is a distress beacon from a lost probe crew. We can notch it out and keep the link clean, or burn 15 fuel to answer them.'],()=>{
  $('#pl').classList.remove('lock');$('#ch').innerHTML='<button class="opt" data-c="a"><b>Notch it out</b><small>Safe. Link stays clean. The beacon fades behind us.</small></button><button class="opt" data-c="b"><b>Decode and reply</b><small>Costs 15 fuel. Worth +150 points.</small></button>';
  document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{const rep=b.dataset.c=='b';if(rep){S.fuel=Math.max(1,S.fuel-15);S.score+=150}HUD();sfx.ok();burst();
   const rank=S.fuel>=70?'Flight director':S.fuel>=35?'Senior signal engineer':'Rookie who survived';
   reportHubScore(rep?'Finale complete · distress beacon answered':'Finale complete · link restored');
   screen(`<div class="hero"><h1>${rep?'Helios-7 answered':'Comms restored'}</h1><p class="tag">${rep?'Their crew heard you. A rescue tug is already burning toward them. You kept the pipeline honest and a crew alive.':'The link is clean and stable. Somewhere behind you, a beacon keeps repeating into the dark.'}</p>
   <p>Rank <b class="stat">${rank}</b></p><p>Score <span class="stat">${S.score}</span> &nbsp; Fuel <span class="stat">${S.fuel}%</span></p><p class="obj" style="margin:12px auto">${NAMES.map((n,i)=>(i+1)+' '+n).join(' → ')}</p><button class="btn big" id="re">Fly again</button></div>`,()=>$('#re').onclick=restart)})})}

/* ===== levels ===== */
const LEVELS=[
{name:'Problem framing',brief:'Pick the question the pipeline must answer first. Wrong picks waste fuel.',
 intro:['{n}. Wake up. Kestrel-9 lost its deep-space uplink four minutes ago.','Spectrum logs show something hammering our band. Before we touch any data, we need the right question.'],
 outro:'Right. Detection first. Everything else depends on knowing a jammer is there.',
 lesson:'A well-framed problem fixes the metric and the data you need: per-frame binary detection at a controlled false-alarm rate.',
 run(p){const O=[['Classification','Label each jammer as CW, chirp or pulsed.',0,'That comes after we know a jammer exists in a frame.'],['Regression','Predict jammer power in dBm.',0,'Power estimation presumes a jammer is already there.'],['Detection','Per frame: jammer present, yes or no, at a fixed false-alarm rate.',1],['Clustering','Group frames without labels.',0,'We have labels and a concrete decision. Supervised detection fits better.']];
  p.innerHTML='<div class="opts">'+O.map((o,i)=>`<button class="opt" data-i="${i}"><b>${o[0]}</b><small>${o[1]}</small></button>`).join('')+'</div>';
  p.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{const o=O[b.dataset.i];if(o[2])return win(100);b.classList.add('dead');burn(15,o[3])})}},

{name:'Toolkit',brief:'Drag each library onto the job it fits (or click a library, then a job). Decoys exist.',
 intro:['Good. Now gear up. Four jobs, eight libraries, and only four belong.'],outro:'Toolbox loaded. Never import what you will not use.',
 lesson:'NumPy for arrays and FFT, SciPy for filters and PSD, scikit-learn for models, Matplotlib for plots.',
 run(p){const T=[['Crunch IQ samples and run FFTs','NumPy'],['Design filters and compute Welch PSD','SciPy'],['Train the jammer detector','scikit-learn'],['Plot spectrograms','Matplotlib']];
  const libs=T.map(t=>t[1]).concat(['Pygame','Django','BeautifulSoup','Flask']).sort(()=>R()-.5);let sel,n=0;
  p.innerHTML=`<div class="pool"></div>${T.map((t,i)=>`<div class="slot" data-i="${i}"><span>${t[0]}</span><div class="drop">drop library</div></div>`).join('')}`;
  libs.forEach(l=>{const d=document.createElement('div');d.className='lib';d.textContent=l;d.draggable=true;d.ondragstart=()=>{sel=d};
   d.onclick=()=>{p.querySelectorAll('.lib').forEach(x=>x.classList.remove('sel'));sel=d;d.classList.add('sel')};$('.pool',p).appendChild(d)});
  p.querySelectorAll('.slot').forEach(s=>{const put=()=>{if(!sel||s.classList.contains('ok'))return;const t=T[s.dataset.i];
   if(sel.textContent==t[1]){$('.drop',s).textContent=sel.textContent;s.classList.add('ok');sel.remove();sel=null;sfx.ok();nova('Locked in.','ok');++n==4&&win(100)}
   else{const w=sel.textContent;sel.classList.remove('sel');sel=null;burn(6,`${w} is the wrong tool for "${t[0].toLowerCase()}".`)}};
   s.ondragover=e=>e.preventDefault();s.ondrop=e=>{e.preventDefault();put()};s.onclick=put})}},

{name:'Acquisition',brief:'The jammer is a 3200 Hz tone. Set the sampling rate, then capture. The top strip shows where the jammer appears in the spectrum.',
 intro:['Time to listen. The jammer sits at 3200 Hz, riding with our 700 Hz comms tone.','Pick my sampling rate. Too low and the spectrum lies to us.'],outro:'Clean capture. Aliasing would have shown the jammer at the wrong frequency.',
 lesson:'Nyquist: sample above twice the highest frequency. Below that, energy folds back as an alias at |f − k·fs|, and no later step can undo it.',
 run(p){p.innerHTML='<canvas class="plot" width="800" height="230"></canvas><div class="row"><span>Sampling rate</span><b class="stat" id="fv"></b><span id="al"></span></div><input type="range" id="fs" min="2000" max="16000" step="500" value="5000"><div class="row"><button class="btn" id="go">Capture</button></div>';
  const x=$('canvas',p).getContext('2d'),sl=$('#fs'),T=.006,f=t=>Math.sin(6.2832*3200*t)*.6+Math.sin(6.2832*700*t)*.5,hx=h=>h/8000*800;
  const draw=()=>{const fs=+sl.value,n=Math.floor(T*fs)+1,al=Math.abs(3200-fs*Math.round(3200/fs));grid(x,-1.5,1.5);
   trace(x,Array.from({length:600},(_,i)=>f(i/599*T)),'#ffffff40',-1.5,1.5,1.2);
   const pts=Array.from({length:n},(_,i)=>f(i/fs)),Y=v=>230-(v+1.5)/3*230;x.beginPath();x.strokeStyle='#4df3ff';x.lineWidth=2;pts.forEach((v,i)=>{const X=i/fs/T*800;i?x.lineTo(X,Y(v)):x.moveTo(X,Y(v))});x.stroke();
   pts.forEach((v,i)=>{x.fillStyle='#ffb020';x.beginPath();x.arc(i/fs/T*800,Y(v),3.5,0,6.3);x.fill()});
   x.fillStyle='#000a';x.fillRect(0,0,800,30);x.strokeStyle='#4df3ff66';x.beginPath();x.moveTo(0,22);x.lineTo(800,22);x.stroke();
   x.strokeStyle='#fff';x.setLineDash([3,3]);x.beginPath();x.moveTo(hx(3200),4);x.lineTo(hx(3200),24);x.stroke();x.setLineDash([]);
   x.fillStyle='#fff';x.font='11px Exo 2';x.fillText('true 3200',hx(3200)+5,12);x.fillStyle=fs>6400?'#6dffb0':'#ff5470';x.beginPath();x.arc(hx(al),22,6,0,6.3);x.fill();x.fillText('seen '+al,hx(al)+9,34>12?12:12);
   $('#fv').textContent=fs+' Hz';$('#al').textContent=fs>6400?'Unambiguous.':'Alias!'};
  sl.oninput=()=>{draw();sfx.tick()};draw();
  $('#go').onclick=()=>{const fs=+sl.value;if(fs<=6400)burn(20,`At ${fs} Hz the 3200 Hz jammer aliases to ${Math.abs(3200-fs*Math.round(3200/fs))} Hz. Need fs above 6400 Hz.`);
   else if(fs>12000){burn(5);win(70,'Oversampling wasted storage. 2.5 to 3 times fmax is typical.')}else win(100)}}},

{name:'Pre-profiling',brief:'Scan the capture. Click a dropout, the clipped peaks, and the DC offset shift. Wrong clicks cost fuel.',
 intro:['Capture is in, but raw data lies. Hardware leaves fingerprints.','Scan the waveform and tag three faults before we trust a single sample.'],outro:'Dropout, clipping, DC shift. Three different faults, three different fixes.',
 lesson:'Profile before cleaning: dropouts (zeros), clipping (flat peaks) and level shifts (DC offset) each need a different fix.',
 run(p){const N=1000,s=Array.from({length:N},(_,i)=>{let v=.8*Math.sin(6.2832*i/50)+.3*Math.sin(6.2832*i/17)+.05*G();if(i>=400&&i<470)v=Math.max(-1,Math.min(1,v*2.5));if(i>=150&&i<210)v=0;if(i>=700)v+=.6;return v});
  const F=[{n:'Dropout',a:150,b:210},{n:'Clipping',a:400,b:470},{n:'DC offset',a:700,b:1000}],got=[];p.innerHTML='<div class="row" id="ck"></div>';const x=cv(p,260);
  const draw=()=>{grid(x,-2,2);trace(x,s,'#4df3ff');got.forEach(k=>{x.fillStyle='#ffb02033';x.fillRect(F[k].a*.8,0,(F[k].b-F[k].a)*.8,260);x.fillStyle='#ffb020';x.font='14px Orbitron';x.fillText(F[k].n,F[k].a*.8+6,20)});
   $('#ck').innerHTML=F.map((f,i)=>`<span class="btn alt ${got.includes(i)?'on':''}">${got.includes(i)?'✓ ':''}${f.n}</span>`).join('')};draw();
  x.canvas.onclick=e=>{if(S.done)return;const i=xy(e,x.canvas)[0]/.8,k=F.findIndex(f=>i>=f.a-15&&i<f.b+15);
   if(k<0||got.includes(k))return burn(5,'Nothing new there. Look for flat tops, zeros, and a shifted baseline.');got.push(k);sfx.ping();draw();got.length==3?win(100):nova(`${F[k].n} tagged. ${3-got.length} to go.`,'ok')}}},

{name:'Preprocessing',brief:'Build a filter chain. Click a chain item to remove it. Reach a cleanup score of 80. Dashed green is the reference signal.',
 intro:['Now we clean. Raw data has a DC offset, Gaussian noise, and impulse spikes.','Order matters. Try things. The plot updates live.'],outro:'Signal recovered. Look at what heavy smoothing did to the 12 Hz tone.',
 lesson:'Median first kills impulses; a low-pass first would smear them. Over-smoothing removes real signal.',
 run(p){const N=500,cl=Array.from({length:N},(_,i)=>Math.sin(6.2832*5*i/N)+.5*Math.sin(6.2832*12*i/N)),raw=cl.map(v=>v+.8+.3*G());for(let k=0;k<10;k++)raw[10+Math.floor(R()*480)]+=R()<.5?3:-3;
  const FX={'Remove DC':a=>{const m=mean(a);return a.map(v=>v-m)},'Median (5)':a=>med(a,5),'Low-pass (7)':a=>mav(a,7),'Heavy smooth (41)':a=>mav(a,41)};let ch=[],sc=0;
  p.innerHTML=`<div class="row">${Object.keys(FX).map(k=>`<button class="btn alt" data-k="${k}">+ ${k}</button>`).join('')}<button class="btn alt" id="rs">Reset</button></div><div>Chain: <span id="chn"></span></div><div class="row">Cleanup score <b class="stat" id="sc"></b></div><div class="meter"><div id="mb"></div><i></i></div>`;const x=cv(p,280);
  const draw=()=>{let o=raw;ch.forEach(k=>o=FX[k](o));sc=Math.max(0,Math.round(100*(1-rmse(o,cl)/rmse(raw,cl))));grid(x,-4,4.5);trace(x,raw,'#7e8bb8',-4,4.5,1);trace(x,cl,'#6dffb0',-4,4.5,1.6,[6,5]);trace(x,o,'#4df3ff',-4,4.5,2.2);
   $('#chn').innerHTML=ch.length?ch.map((k,i)=>`<button class="chip" data-i="${i}">${k} ✕</button>`).join(''):'(empty)';$('#sc').textContent=sc;$('#mb').style.width=sc+'%';
   p.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ch.splice(+c.dataset.i,1);draw()})};
  p.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ch.push(b.dataset.k);sfx.tick();draw()});$('#rs').onclick=()=>{ch=[];draw()};draw();
  const b=document.createElement('button');b.className='btn';b.textContent='Ship cleaned data';p.appendChild(b);
  b.onclick=()=>sc>=80?win(sc):burn(6,`Score ${sc}, need 80. Hint: remove DC, then median, then a light low-pass. Avoid heavy smoothing.`)}},

{name:'Post-profiling',brief:'Audit the cleaned data against the acceptance thresholds. Mark each check as pass or fail.',
 intro:['Cleaned data is not proven data. Compare before and after against the acceptance gates.'],outro:'Good audit. A lower noise floor alone would have fooled us.',
 lesson:'Re-run the same diagnostics after cleaning. This pipeline over-smoothed (tone gone) and left DC behind, even though noise dropped.',
 run(p){const rows=[['Residual DC offset','0.80','0.31','below 0.05',0],['Noise floor σ','0.30','0.07','below 0.15',1],['Impulse spikes','10','0','exactly 0',1],['12 Hz tone power kept','100%','38%','at least 80%',0]],ans=[];
  p.innerHTML=`<table><tr><th>Check</th><th>Before</th><th>After</th><th>Gate</th><th>Verdict</th></tr>${rows.map((r,i)=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td><td>${r[3]}</td><td><button class="btn alt" data-i="${i}" data-v="1">Pass</button> <button class="btn alt" data-i="${i}" data-v="0">Fail</button></td></tr>`).join('')}</table><button class="btn" id="go">Submit audit</button>`;
  p.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{ans[b.dataset.i]=+b.dataset.v;sfx.tick();p.querySelectorAll(`[data-i="${b.dataset.i}"]`).forEach(o=>o.classList.toggle('on',o==b))});
  $('#go').onclick=()=>{if([0,1,2,3].some(i=>ans[i]===undefined))return nova('Mark all four checks first.');const bad=rows.filter((r,i)=>ans[i]!==r[4]).length;bad?burn(8*bad,`${bad} verdict${bad>1?'s':''} wrong. Compare each After value to its gate.`):win(100)}}},

{name:'Exploratory analysis',brief:'Spectrogram: time runs along x, frequency up y. Tag all three emitters in 25 seconds: the steady carrier, the pulsed beacon, and the swept jammer.',
 intro:['Now we look. Spectrogram incoming. Three emitters share this band.','Tag each one. Not every bright line is hostile.'],outro:'The sweep repeats every 80 frames. Jammers are random. That is structured. Odd.',
 lesson:'Spectrograms separate signals by structure: steady lines are carriers, on/off blocks are beacons, a diagonal sweep is a chirp.',
 run(p){const F=64,T=160,d=[];for(let t=0;t<T;t++){d[t]=[];for(let f=0;f<F;f++){let v=-Math.log(1-R())*.25;if(f==14)v+=.9;if(f==50&&Math.floor(t/20)%2==0)v+=.9;if(Math.abs(f-(8+(t%80)/80*48))<1)v+=1.2;d[t][f]=v}}
  const o=document.createElement('canvas');o.width=T;o.height=F;const oc=o.getContext('2d'),im=oc.createImageData(T,F);
  for(let t=0;t<T;t++)for(let f=0;f<F;f++){const u=Math.min(1,d[t][f]/1.8);im.data.set([30+225*u**1.3,10+170*u**2.4,90+140*Math.sin(u*3.14),255],((F-1-f)*T+t)*4)}oc.putImageData(im,0,0);
  p.innerHTML='<div class="meter"><div id="tb" style="width:100%;background:var(--am)"></div></div><div class="row" id="ck"></div>';const x=cv(p,320);x.imageSmoothingEnabled=false;x.drawImage(o,0,0,800,320);
  const found=new Set(),lab={c:'Carrier',b:'Beacon',j:'Jammer'};let left=25;
  const chips=()=>$('#ck').innerHTML=Object.keys(lab).map(k=>`<span class="btn alt ${found.has(k)?'on':''}">${found.has(k)?'✓ ':''}${lab[k]}</span>`).join('');chips();
  S.timer=setInterval(()=>{left-=.1;$('#tb').style.width=left/25*100+'%';if(left<=0){clearInterval(S.timer);burn(15,'Time up.');win(found.size*15)}},100);
  x.canvas.onclick=e=>{if(S.done)return;const[X,Y]=xy(e,x.canvas),t=Math.floor(X/5),f=F-1-Math.floor(Y/5);let k=null;
   if(Math.abs(f-(8+(t%80)/80*48))<=3)k='j';else if(Math.abs(f-14)<=2)k='c';else if(Math.abs(f-50)<=2){if(Math.floor(t/20)%2==0)k='b';else return burn(3,'The beacon is silent here. It pulses on and off.')}
   if(!k||found.has(k))return burn(5,'Noise, or already tagged. Look for structured tracks.');
   found.add(k);sfx.ping();x.strokeStyle='#6dffb0';x.lineWidth=2;x.beginPath();x.arc(X,Y,14,0,6.3);x.stroke();x.fillStyle='#6dffb0';x.font='13px Orbitron';x.fillText(lab[k],X+18,Y+4);chips();
   found.size==3?win(Math.round(40+left*2.4)):nova(`${lab[k]} tagged.`,'ok')}}},

{name:'Modeling',brief:'Detector scores: noise ~ N(0,1), jammer ~ N(3,1). Set the threshold so Pd ≥ 90% and Pfa ≤ 10%. The green box on the ROC is the target.',
 intro:['Time to automate. My detector scores each frame.','Place the threshold. Catch 90 percent of hits with at most 10 percent false alarms.'],outro:'Operating point set. Every threshold is a tradeoff. No free lunch.',
 lesson:'The threshold trades Pd against Pfa along the ROC curve. Pick the operating point your mission needs.',
 run(p){p.innerHTML='<div class="row"><canvas class="plot" id="pd" width="520" height="260" style="width:62%"></canvas><canvas class="plot" id="roc" width="260" height="260" style="width:33%"></canvas></div><input type="range" id="th" min="-1" max="4.5" step="0.01" value="0.2"><div class="row">Threshold <b class="stat" id="tv"></b> Pd <b class="stat" id="pdv"></b> Pfa <b class="stat" id="pfv"></b></div><button class="btn" id="go">Lock threshold</button>';
  const a=$('#pd').getContext('2d'),r=$('#roc').getContext('2d'),sl=$('#th');let pd,pf;
  const draw=()=>{const th=+sl.value;pd=Q(th-3);pf=Q(th);a.clearRect(0,0,520,260);const X=v=>(v+4)/11*520,Y=v=>255-v*560;
   [[0,'#4df3ff'],[3,'#ff4fd8']].forEach(([m,c])=>{a.beginPath();for(let v=-4;v<=7;v+=.05)a.lineTo(X(v),Y(pdf(v,m)));a.strokeStyle=c;a.lineWidth=2;a.stroke();
    a.beginPath();a.moveTo(X(th),255);for(let v=th;v<=7;v+=.05)a.lineTo(X(v),Y(pdf(v,m)));a.lineTo(X(7),255);a.fillStyle=c+'55';a.fill()});
   a.strokeStyle='#ffb020';a.lineWidth=2;a.beginPath();a.moveTo(X(th),0);a.lineTo(X(th),260);a.stroke();
   r.clearRect(0,0,260,260);r.strokeStyle='#4df3ff44';r.strokeRect(0,0,260,260);r.fillStyle='#6dffb033';r.fillRect(0,0,26,26);r.strokeStyle='#6dffb0';r.strokeRect(0,0,26,26);
   r.beginPath();for(let t=-4;t<=7;t+=.05)r.lineTo(Q(t)*260,260-Q(t-3)*260);r.strokeStyle='#4df3ff';r.lineWidth=2;r.stroke();r.fillStyle='#ffb020';r.beginPath();r.arc(pf*260,260-pd*260,6,0,6.3);r.fill();
   $('#tv').textContent=th.toFixed(2);$('#pdv').textContent=(pd*100).toFixed(1)+'%';$('#pfv').textContent=(pf*100).toFixed(1)+'%'};
  sl.oninput=draw;draw();$('#go').onclick=()=>pd>=.9&&pf<=.1?win(100):burn(6,`Pd ${(pd*100).toFixed(1)}%, Pfa ${(pf*100).toFixed(1)}%. Lower threshold raises both; higher lowers both.`)}},

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
const hubPlayerName = new URLSearchParams(window.location.search).get('player');
screen(`<div class="hero"><div class="planet"></div><h1>Pipeline Quest</h1><p class="tag">Kestrel-9, relay station above Kepler-442b. The uplink is dead and something is screaming across the band. Work the data pipeline from problem statement to live alerting.</p><input id="nm" placeholder="Your callsign" maxlength="14"><button class="btn big" id="st">Initiate mission</button></div>`,
 ()=>{if(hubPlayerName){$('#nm').value=hubPlayerName;S.name=hubPlayerName;} $('#st').onclick=()=>{S.name=$('#nm').value.trim()||S.name||'Rookie';beep(440,.1);load()}});