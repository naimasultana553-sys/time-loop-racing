/* ================= UI: DOM screens, lists, HUD, overlays ================= */
import { CARS, TRACKS, MODES, TRACK_POINTS, BODY_COLORS, NEON_COLORS, trackById } from './config.js';
import * as store from './storage.js';
import { formatTime, deltaText } from './scoring.js';
import { drawCar } from './car.js';

const $=id=>document.getElementById(id);
const screens=['home','mode','garage','tracks','records','settings','pause','results'];
let current='home';

export function showScreen(name){
  current=name;
  screens.forEach(s=>$('screen-'+s)?.classList.toggle('active',s===name));
  showGameView(name==='game'||name==='pause'||name==='results');
  if(name==='home') startHomeArt(); else stopHomeArt();
}
export function showGameView(show){ $('gameView').classList.toggle('hidden',!show); }
export function currentScreen(){ return current; }

export function renderHomeStats(){
  const s=store.getState();
  $('statLevel').textContent=store.getLevel();
  $('statRaces').textContent=s.totalRaces;
  $('statCoins').textContent=s.coins;
  let best=null;
  for(const t of TRACKS){
    for(const m of ['timeloop','trial','ghost']){
      const r=store.getRecord(t.id,m);
      if(r?.bestLap&&(best===null||r.bestLap<best)) best=r.bestLap;
    }
  }
  $('statBest').textContent=formatTime(best);
}

/* ---------------- modes ---------------- */
export function renderModes(){
  const s=store.getSettings();
  $('modeList').innerHTML=MODES.map(m=>`
    <button class="mode-card ${m.main?'main':''}" data-mode="${m.id}">
      <div class="mode-icon">${m.icon}</div>
      <h3>${m.name}</h3>
      <p>${m.desc}</p>
      <span class="mode-tag">${m.tag}</span>
    </button>`).join('');
  $('endlessToggle').checked=!!s.endless;
  $('modeLaps').value=String(s.laps||5);
  $('modeLaps').disabled=!!s.endless;
}

/* ---------------- garage ---------------- */
export function renderGarage(){
  const selected=store.getSelectedCar();
  $('carList').innerHTML=CARS.map(c=>{
    const colors=store.getColors(c.id);
    return `<div class="car-card ${c.id===selected?'selected':''}" data-car="${c.id}">
      <div class="car-preview"><div class="mini-car" style="--body:${colors.body};--glow:${colors.neon}">
        <div class="body"></div><div class="cockpit"></div><div class="glowline"></div></div></div>
      <h3>${c.name}</h3><p>${c.desc}</p>
      ${['speed','handling','nitro'].map(k=>`<div class="stat"><span>${k.toUpperCase()}</span><div class="bar"><i style="width:${c.stats[k]*20}%"></i></div></div>`).join('')}
      <button class="btn ${c.id===selected?'selected':''}" data-select="${c.id}">${c.id===selected?'SELECTED':'SELECT'}</button>
    </div>`;
  }).join('');
  renderSwatches();
}
function renderSwatches(){
  const car=store.getSelectedCar();
  const colors=store.getColors(car);
  $('bodyColors').innerHTML=BODY_COLORS.map(c=>`<button class="swatch ${c.toLowerCase()===colors.body.toLowerCase()?'selected':''}"
    data-type="body" data-value="${c}" style="background:${c};color:${c}" aria-label="Body color"></button>`).join('');
  $('neonColors').innerHTML=NEON_COLORS.map(c=>`<button class="swatch ${c.toLowerCase()===colors.neon.toLowerCase()?'selected':''}"
    data-type="neon" data-value="${c}" style="background:${c};color:${c}" aria-label="Neon color"></button>`).join('');
}
export function refreshGarageSelection(){ renderGarage(); }

/* ---------------- tracks ---------------- */
function trackSvg(def){
  const pts=TRACK_POINTS[def.id]||[];
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const sc=Math.min(210/(maxX-minX),92/(maxY-minY));
  const mapped=pts.map(([x,y])=>`${((x-minX)*sc)+5},${((y-minY)*sc)+5}`).join(' ');
  const col=def.theme==='desert'?'#ffb347':def.theme==='space'?'#3b82ff':def.theme==='tunnel'?'#a45cff':'#22e6ff';
  return `<svg viewBox="0 0 220 100" preserveAspectRatio="xMidYMid meet"><polyline points="${mapped} ${mapped.split(' ')[0]}"
    fill="none" stroke="${col}" stroke-width="9" stroke-opacity=".2" stroke-linejoin="round"/>
    <polyline points="${mapped} ${mapped.split(' ')[0]}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
export function renderTracks(){
  $('trackList').innerHTML=TRACKS.map(t=>{
    const unlocked=store.isUnlocked(t.id);
    const rec=store.getRecord(t.id,'timeloop');
    return `<div class="track-card ${unlocked?'':'locked'}">
      <div class="track-preview">${trackSvg(t)}${unlocked?'':'<div class="lock-badge">&#128274; LOCKED</div>'}</div>
      <div class="track-card-body">
        <h3>${t.name}</h3>
        <div class="difficulty ${t.difficulty>=3?'hard':''}">${[1,2,3].map(i=>`<i class="${i<=t.difficulty?'on':''}"></i>`).join('')}</div>
        <small>${unlocked?t.desc:'Unlock: '+t.bestHint}</small>
        <small>BEST LAP: ${formatTime(rec?.bestLap)}</small>
        <button class="btn ${unlocked?'btn-primary':''}" data-track="${t.id}" ${unlocked?'':'disabled'}>${unlocked?'RACE HERE':'LOCKED'}</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------------- records ---------------- */
export function renderRecords(){
  const s=store.getState();
  const rows=store.allLapRecords().sort((a,b)=>a.bestLap-b.bestLap);
  $('recordsContent').innerHTML=`
    <div class="rec-head"><span>TRACK / MODE</span><span>BEST LAP</span><span>BEST RACE</span><span>RACES</span></div>
    ${rows.length?rows.map(r=>`<div class="rec-row">
       <span>${trackById(r.track).name} <small style="color:var(--muted)">/ ${r.mode.toUpperCase()}</small></span>
       <b>${formatTime(r.bestLap)}</b><b>${formatTime(r.bestRace)}</b><b>${r.races}</b></div>`).join('')
     :'<div class="rec-row"><span colspan="4" style="color:var(--muted)">No records yet. Finish a race to set one.</span></div>'}
    <div class="rec-total"><span>COINS <b>${s.coins}</b></span><span>SCORE <b>${s.score}</b></span>
      <span>MEDALS <b>${s.medals}</b></span><span>RACES <b>${s.totalRaces}</b></span><span>LEVEL <b>${store.getLevel()}</b></span></div>`;
}

/* ---------------- settings ---------------- */
export function setSettingsUI(s){
  $('musicVol').value=s.music; $('musicVal').textContent=s.music+'%';
  $('sfxVol').value=s.sfx; $('sfxVal').textContent=s.sfx+'%';
  $('qualitySel').value=s.quality;
}

/* ---------------- HUD ---------------- */
export function updateHud(d){
  $('hudLap').textContent=d.lapText;
  $('hudStatus').textContent=d.status;
  $('hudTimer').textContent=d.timer;
  $('speedVal').textContent=d.speed;
  $('speedFill').style.width=d.speedPct+'%';
  $('nitroFill').style.width=d.nitroPct+'%';
  $('nitroFill').classList.toggle('low',d.nitroPct<25);
  $('hudBest').textContent=d.best;
  $('hudPrev').textContent=d.prev;
  $('hudGhosts').textContent=d.ghosts;
  $('hudDelta').textContent=d.delta;
  $('hudDelta').className='hud-delta '+d.deltaCls;
}

let toastTimer=0;
export function toast(msg,type=''){
  const el=$('toast');
  el.textContent=msg;
  el.className='toast '+type;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.add('hidden'),1800);
}
export function countdown(text){
  const el=$('countdown');
  if(!text){ el.classList.add('hidden'); return; }
  el.textContent=text;
  el.className='countdown'+(text==='GO!'?' go':'');
  void el.offsetWidth;
  el.classList.remove('hidden');
}

/* ---------------- results ---------------- */
export function renderResult(result,rewards,recordInfo){
  $('resultBanner').textContent=result.stats.finished?'RACE COMPLETED':
    (result.stats.reason==='SLOWER THAN PREVIOUS LAP'?'ELIMINATED — TOO SLOW':'RUN OVER');
  $('resultBanner').classList.toggle('fail',!result.stats.finished);
  $('resultRecord').classList.toggle('hidden',!recordInfo.isLapRecord);
  $('resultTotal').textContent=formatTime(result.totalTime);
  $('resultBest').textContent=formatTime(result.bestLap);
  $('resultPrev').textContent=formatTime(result.previousLap);
  $('resultGhosts').textContent=result.ghostsCreated;
  $('resultCollisions').textContent=result.stats.collisions;
  $('resultScore').textContent=rewards.score;
  $('resultCoins').textContent=rewards.coins;
  const d=deltaText(result.lastDelta);
  $('resultDelta').textContent=d.text;
  $('resultDelta').style.color=d.cls==='faster'?'var(--green)':d.cls==='slower'?'var(--red)':'#fff';
}

/* ================= HOME HERO ART (canvas, not static placeholder) ================= */
let homeArtRaf=0;

export function startHomeArt(){
  const canvas=$('homeArt');
  if(!canvas||homeArtRaf) return;
  const ctx=canvas.getContext('2d');
  const draw=(ts)=>{
    if(!canvas.isConnected){ homeArtRaf=0; return; }
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=canvas.clientWidth||600, h=canvas.clientHeight||200;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    const time=ts||performance.now();
    const carId=store.getSelectedCar();
    const cols=store.getColors(carId);

    // sky / floor
    const bg=ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'rgba(8,14,32,0)');
    bg.addColorStop(.55,'rgba(10,22,52,.35)');
    bg.addColorStop(1,'rgba(4,8,20,.85)');
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);

    // horizon glow
    const hg=ctx.createRadialGradient(w*.5,h*.72,5,w*.5,h*.72,w*.55);
    hg.addColorStop(0,'rgba(34,230,255,.22)');
    hg.addColorStop(1,'rgba(34,230,255,0)');
    ctx.fillStyle=hg; ctx.fillRect(0,0,w,h);

    // road ribbons receding to horizon
    ctx.save();
    ctx.lineCap='round';
    for(let k=0;k<3;k++){
      const yBase=h*(.72+k*.13);
      ctx.beginPath();
      ctx.moveTo(w*.5-w*.42,yBase+h*.35);
      ctx.quadraticCurveTo(w*.5-w*.12,h*.68,w*.5-w*.055,h*.5);
      ctx.strokeStyle=k===1?'rgba(164,92,255,.35)':'rgba(34,230,255,.30)';
      ctx.lineWidth=2+k; ctx.shadowColor=k===1?'#a45cff':'#22e6ff'; ctx.shadowBlur=14; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w*.5+w*.42,yBase+h*.35);
      ctx.quadraticCurveTo(w*.5+w*.12,h*.68,w*.5+w*.055,h*.5);
      ctx.stroke();
    }
    ctx.setLineDash([12,16]);
    ctx.lineDashOffset=-(time*.09)%28;
    ctx.strokeStyle='rgba(180,240,255,.5)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(w*.5,h*1.05); ctx.lineTo(w*.5,h*.48); ctx.stroke();
    ctx.restore();

    // ghost rivals behind
    const ghosts=[
      {x:w*.27,y:h*.63,c:'#a45cff',phase:0},
      {x:w*.74,y:h*.59,c:'#22e6ff',phase:2.1}
    ];
    ghosts.forEach(g=>{
      const bob=Math.sin(time*.0015+g.phase)*5;
      ctx.save();
      ctx.globalAlpha=.6;
      ctx.strokeStyle=g.c; ctx.lineWidth=2; ctx.shadowColor=g.c; ctx.shadowBlur=18;
      for(let i=1;i<5;i++){
        ctx.globalAlpha=.3-i*.045;
        ctx.beginPath();
        ctx.ellipse(g.x-i*18,g.y+bob+i*2,26-i*3,8-i,0,0,Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
      drawCar(ctx,{x:g.x,y:g.y+bob,angle:-.1+Math.sin(time*.001+g.phase)*.04,
        body:'#0a1830',neon:g.c,alpha:.55,ghost:true,time,scale:1.0});
    });

    // headlight cone + hero car
    const hx=w*.5, hy=h*.66+Math.sin(time*.002)*4;
    ctx.save();
    ctx.translate(hx,hy); ctx.rotate(-.05);
    ctx.globalCompositeOperation='lighter';
    const cone=ctx.createLinearGradient(0,0,0,-h*.55);
    cone.addColorStop(0,'rgba(180,240,255,.20)'); cone.addColorStop(1,'rgba(120,200,255,0)');
    ctx.fillStyle=cone;
    ctx.beginPath(); ctx.moveTo(-16,-8); ctx.lineTo(-w*.16,-h*.55); ctx.lineTo(w*.16,-h*.55); ctx.lineTo(16,-8); ctx.closePath(); ctx.fill();
    ctx.restore();

    const boost=Math.sin(time*.003)>.55;
    drawCar(ctx,{x:hx,y:hy,angle:-.05+Math.sin(time*.0012)*.018,
      body:cols.body,neon:cols.neon,alpha:1,boost,time,scale:1.75,steer:Math.sin(time*.0008)*.15});

    // speed streaks
    ctx.save();
    ctx.globalAlpha=.18; ctx.strokeStyle='#bfefff'; ctx.lineWidth=1;
    for(let i=0;i<18;i++){
      const x=((i*137+time*.35)%w);
      const y=((i*53)%h);
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+20+(i%4)*12,y-3); ctx.stroke();
    }
    ctx.restore();

    homeArtRaf=requestAnimationFrame(draw);
  };
  homeArtRaf=requestAnimationFrame(draw);
}

export function stopHomeArt(){
  if(homeArtRaf) cancelAnimationFrame(homeArtRaf);
  homeArtRaf=0;
}
