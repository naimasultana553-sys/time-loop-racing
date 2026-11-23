/* ================= AUDIO: generated WebAudio SFX (no asset files needed) ================= */

let ctx=null, masterMusic=null, masterSfx=null, engineOsc=null, engineGain=null, engineFilter=null, musicNodes=[];
let sfxVol=0.7, musicVol=0.4, started=false, enabled=true;

export function init(){
  if(started) return;
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC){ enabled=false; return; }
    ctx = new AC();
    masterMusic = ctx.createGain();
    masterSfx = ctx.createGain();
    masterMusic.gain.value = musicVol*0.35;
    masterSfx.gain.value = sfxVol;
    masterMusic.connect(ctx.destination);
    masterSfx.connect(ctx.destination);
    started=true;
  }catch(e){ enabled=false; }
}

export function setVolumes(music,sfx){
  musicVol=Math.max(0,Math.min(1,(music||0)/100));
  sfxVol=Math.max(0,Math.min(1,(sfx||0)/100));
  if(masterMusic&&ctx) masterMusic.gain.setTargetAtTime(musicVol*0.35,ctx.currentTime,.05);
  if(masterSfx&&ctx) masterSfx.gain.setTargetAtTime(sfxVol,ctx.currentTime,.05);
}

export function resume(){ if(ctx&&ctx.state==='suspended') ctx.resume().catch(()=>{}); }
export function suspend(){ if(ctx&&ctx.state==='running') ctx.suspend().catch(()=>{}); }

function tone({freq=440,dur=.15,type='sine',gain=.3,slide=0,delay=0,dest=null}){
  if(!enabled||!ctx||!started) return;
  try{
    const t=ctx.currentTime+delay;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+dur);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002,gain),t+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(dest||masterSfx);
    o.start(t); o.stop(t+dur+0.03);
  }catch(e){}
}

function noise({dur=.2,gain=.2,filterFreq=1200,delay=0}){
  if(!enabled||!ctx||!started) return;
  try{
    const len=Math.floor(ctx.sampleRate*dur);
    const buf=ctx.createBuffer(1,len,ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const src=ctx.createBufferSource(); src.buffer=buf;
    const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=filterFreq; f.Q.value=.8;
    const g=ctx.createGain(); g.gain.value=gain;
    src.connect(f); f.connect(g); g.connect(masterSfx);
    src.start(ctx.currentTime+delay);
  }catch(e){}
}

export function play(name){
  if(!enabled||!started) return;
  resume();
  switch(name){
    case 'click': tone({freq:660,dur:.07,type:'triangle',gain:.18,slide:220}); break;
    case 'confirm': tone({freq:440,dur:.1,type:'square',gain:.14,slide:300}); tone({freq:880,dur:.14,type:'sine',gain:.12,delay:.07}); break;
    case 'lap': tone({freq:660,dur:.16,type:'triangle',gain:.25}); tone({freq:990,dur:.22,type:'triangle',gain:.2,delay:.12}); break;
    case 'ghost': tone({freq:240,dur:.5,type:'sine',gain:.18,slide:620}); tone({freq:480,dur:.4,type:'sine',gain:.1,slide:-200,delay:.08}); break;
    case 'boost': noise({dur:.35,gain:.22,filterFreq:1800}); tone({freq:180,dur:.35,type:'sawtooth',gain:.16,slide:420}); break;
    case 'crash': noise({dur:.22,gain:.3,filterFreq:500}); tone({freq:120,dur:.18,type:'square',gain:.14,slide:-60}); break;
    case 'crystal': tone({freq:1200,dur:.1,type:'sine',gain:.18}); tone({freq:1800,dur:.14,type:'sine',gain:.14,delay:.07}); break;
    case 'finish': [523,659,784,1047].forEach((f,i)=>tone({freq:f,dur:.3,type:'triangle',gain:.2,delay:i*.12})); break;
    case 'fail': tone({freq:300,dur:.4,type:'sawtooth',gain:.2,slide:-220}); tone({freq:150,dur:.5,type:'square',gain:.12,delay:.12}); break;
    case 'count': tone({freq:520,dur:.1,type:'sine',gain:.2}); break;
  }
}

/* ---------- engine loop ---------- */
export function startEngine(){
  if(!enabled||!started||engineOsc) return;
  try{
    engineOsc=ctx.createOscillator();
    engineFilter=ctx.createBiquadFilter();
    engineGain=ctx.createGain();
    engineOsc.type='sawtooth';
    engineOsc.frequency.value=60;
    engineFilter.type='lowpass'; engineFilter.frequency.value=320;
    engineGain.gain.value=0.0001;
    engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(masterSfx);
    engineOsc.start();
  }catch(e){}
}
export function updateEngine(speedRatio,nitro){
  if(!engineOsc||!ctx) return;
  try{
    const t=ctx.currentTime;
    engineOsc.frequency.setTargetAtTime(55+speedRatio*180+(nitro?70:0),t,.08);
    engineFilter.frequency.setTargetAtTime(260+speedRatio*900+(nitro?500:0),t,.08);
    engineGain.gain.setTargetAtTime(0.035+speedRatio*0.07,t,.1);
  }catch(e){}
}
export function stopEngine(){
  if(!engineOsc) return;
  try{ engineOsc.stop(); }catch(e){}
  engineOsc.disconnect?.(); engineGain?.disconnect?.(); engineFilter?.disconnect?.();
  engineOsc=null; engineGain=null; engineFilter=null;
}

/* ---------- subtle ambient music ---------- */
export function startMusic(){
  if(!enabled||!started||musicNodes.length) return;
  try{
    [55,82.4,110].forEach((f,i)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type=i===2?'triangle':'sine'; o.frequency.value=f;
      g.gain.value=i===2?0.05:0.09;
      o.connect(g); g.connect(masterMusic); o.start();
      musicNodes.push(o,g);
    });
  }catch(e){}
}
export function stopMusic(){
  musicNodes.forEach(n=>{ try{n.stop?.(); n.disconnect?.();}catch(e){} });
  musicNodes=[];
}
