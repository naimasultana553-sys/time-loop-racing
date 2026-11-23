/* ================= MAIN: app bootstrap, state machine, wiring ================= */
import { TRACKS } from './config.js';
import * as store from './storage.js';
import * as audio from './audio.js';
import { initInput } from './input.js';
import { RacingGame } from './racing.js';
import { computeRaceScore } from './scoring.js';
import * as ui from './ui.js';

const $=id=>document.getElementById(id);

let selectedMode='timeloop';
let selectedTrack='neon';
let settingsFromPause=false;
let game;

/* ---------------- bootstrap ---------------- */
store.load();
const settings=store.getSettings();
audio.setVolumes(settings.music,settings.sfx);

game=new RacingGame($('gameCanvas'),{
  onHud:d=>ui.updateHud(d),
  onToast:(m,t)=>ui.toast(m,t),
  onCountdown:t=>ui.countdown(t),
  onFinish:r=>finishRace(r)
});

initInput({
  onPause:()=>{
    if(ui.currentScreen()==='game') pauseGame();
    else if(ui.currentScreen()==='pause') resumeGame();
  },
  onRestart:()=>{
    if(ui.currentScreen()==='game'||ui.currentScreen()==='pause') restartRace();
  },
  onHidden:()=>{ if(ui.currentScreen()==='game') pauseGame(); },
  onRotate:()=>{ game.resize(); }
});

/* mobile orientation notice (dismissible, session-only) */
if(window.matchMedia('(pointer:coarse)').matches){
  let dismissed=false;
  try{ dismissed=sessionStorage.getItem('tlr.rotateDismissed')==='1'; }catch(e){}
  if(!dismissed) document.body.classList.add('rotate-ask');
}
$('rotateContinue').addEventListener('click',()=>{
  document.body.classList.remove('rotate-ask');
  try{ sessionStorage.setItem('tlr.rotateDismissed','1'); }catch(e){}
  audio.play('click');
  game.resize();
});

ui.renderHomeStats();
ui.showScreen('home');

/* ---------------- race flow ---------------- */
function readModeSettings(){
  const laps=parseInt($('modeLaps').value,10)||5;
  const endless=$('endlessToggle').checked;
  store.setSetting('laps',laps);
  store.setSetting('endless',endless);
}

function startRace(){
  const s=store.getSettings();
  const carId=store.getSelectedCar();
  const colors=store.getColors(carId);
  const savedGhosts=selectedMode==='ghost'
    ? [...store.getGhosts(selectedTrack,'timeloop'),...store.getGhosts(selectedTrack,'ghost')]
    : [];
  selectedTrack=store.isUnlocked(selectedTrack)?selectedTrack:'neon';
  ui.showScreen('game');
  audio.init(); audio.resume(); audio.play('confirm');
  game.start({
    trackId:selectedTrack,
    mode:selectedMode,
    laps:s.laps,
    endless:s.endless&&selectedMode==='timeloop',
    carId,
    colors:{body:colors.body,neon:colors.neon},
    savedGhosts,
    settings:s
  });
}

function pauseGame(){
  game.pause();
  ui.showScreen('pause');
}
function resumeGame(){
  ui.showScreen('game');
  game.resume();
}
function restartRace(){
  ui.showScreen('game');
  game.restart();
}

function finishRace(result){
  const rewards=computeRaceScore({...result.stats});
  const rec=store.updateRecord(result.trackId,result.mode,{
    bestLap:result.bestLap,
    bestRace:result.totalTime,
    lastLap:result.lastLap
  });
  store.addRewards({coins:rewards.coins,score:rewards.score,medals:rewards.medals,races:1});
  if(result.recordings.length){
    store.saveGhost(result.trackId,'timeloop',result.recordings[result.recordings.length-1]);
    if(result.mode==='ghost') store.saveGhost(result.trackId,'ghost',result.recordings[result.recordings.length-1]);
  }
  if(result.stats.laps>0) store.unlockNextAfter(result.trackId);
  result.stats.newRecord=rec.isLapRecord;
  ui.renderResult(result,rewards,rec);
  ui.showScreen('results');
}

/* ---------------- button wiring ---------------- */
$('btnPlay').addEventListener('click',()=>{ audio.play('click'); ui.renderModes(); ui.showScreen('mode'); });
$('btnGarage').addEventListener('click',()=>{ audio.play('click'); ui.renderGarage(); ui.showScreen('garage'); });
$('btnTracks').addEventListener('click',()=>{ audio.play('click'); ui.renderTracks(); ui.showScreen('tracks'); });
$('btnRecords').addEventListener('click',()=>{ audio.play('click'); ui.renderRecords(); ui.showScreen('records'); });
$('btnSettings').addEventListener('click',()=>{ audio.play('click'); settingsFromPause=false; ui.setSettingsUI(store.getSettings()); ui.showScreen('settings'); });

document.querySelectorAll('[data-back="home"]').forEach(b=>b.addEventListener('click',()=>{
  audio.play('click'); ui.renderHomeStats(); ui.showScreen('home');
}));

/* mode screen */
$('modeList').addEventListener('click',e=>{
  const card=e.target.closest('[data-mode]');
  if(!card) return;
  selectedMode=card.dataset.mode;
  readModeSettings();
  audio.play('confirm');
  ui.renderTracks();
  ui.showScreen('tracks');
});
$('endlessToggle').addEventListener('change',e=>{
  store.setSetting('endless',e.target.checked);
  $('modeLaps').disabled=e.target.checked;
  audio.play('click');
});
$('modeLaps').addEventListener('change',e=>{ store.setSetting('laps',parseInt(e.target.value,10)||5); audio.play('click'); });

/* garage */
$('carList').addEventListener('click',e=>{
  const select=e.target.closest('[data-select]');
  if(select){
    store.selectCar(select.dataset.select);
    audio.play('confirm');
    ui.renderGarage();
    return;
  }
  const card=e.target.closest('[data-car]');
  if(card && card.dataset.car!==store.getSelectedCar()){
    store.selectCar(card.dataset.car); audio.play('click'); ui.renderGarage();
  }
});
[$('bodyColors'),$('neonColors')].forEach(el=>el.addEventListener('click',e=>{
  const sw=e.target.closest('[data-value]');
  if(!sw) return;
  store.setColor(store.getSelectedCar(),sw.dataset.type,sw.dataset.value);
  audio.play('click');
  ui.renderGarage();
}));

/* tracks */
$('trackList').addEventListener('click',e=>{
  const btn=e.target.closest('[data-track]');
  if(!btn||btn.disabled) return;
  selectedTrack=btn.dataset.track;
  audio.play('confirm');
  startRace();
});

/* pause */
$('btnPause').addEventListener('click',()=>{ audio.play('click'); pauseGame(); });
$('btnResume').addEventListener('click',()=>{ audio.play('click'); resumeGame(); });
$('btnRestart').addEventListener('click',()=>{ audio.play('click'); restartRace(); });
$('btnPauseSettings').addEventListener('click',()=>{
  audio.play('click'); settingsFromPause=true; ui.setSettingsUI(store.getSettings()); ui.showScreen('settings');
});
$('btnPauseMenu').addEventListener('click',()=>{
  audio.play('click'); game.stop(); audio.stopMusic(); ui.renderHomeStats(); ui.showScreen('home');
});

/* settings */
$('settingsBack').addEventListener('click',()=>{
  audio.play('click');
  ui.showScreen(settingsFromPause?'pause':'home');
  if(!settingsFromPause) ui.renderHomeStats();
  settingsFromPause=false;
});
function bindSlider(id,valId,key){
  $(id).addEventListener('input',e=>{
    const v=parseInt(e.target.value,10);
    $(valId).textContent=v+'%';
    store.setSetting(key,v);
    audio.setVolumes(store.getSettings().music,store.getSettings().sfx);
  });
}
bindSlider('musicVol','musicVal','music');
bindSlider('sfxVol','sfxVal','sfx');
$('qualitySel').addEventListener('change',e=>{ store.setSetting('quality',e.target.value); audio.play('click'); });
$('btnReset').addEventListener('click',()=>{
  if(!window.confirm('Reset all progress, records and unlocked tracks?')) return;
  store.resetProgress();
  audio.setVolumes(store.getSettings().music,store.getSettings().sfx);
  ui.renderHomeStats(); ui.setSettingsUI(store.getSettings());
  ui.showScreen('home');
  audio.play('fail');
});

/* results */
$('btnAgain').addEventListener('click',()=>{ audio.play('click'); startRace(); });
$('btnNext').addEventListener('click',()=>{
  audio.play('click');
  const i=TRACKS.findIndex(t=>t.id===selectedTrack);
  const next=TRACKS[(i+1)%TRACKS.length];
  selectedTrack=store.isUnlocked(next.id)?next.id:'neon';
  startRace();
});
$('btnResultGarage').addEventListener('click',()=>{ audio.play('click'); ui.renderGarage(); ui.showScreen('garage'); });
$('btnResultMenu').addEventListener('click',()=>{ audio.play('click'); audio.stopMusic(); ui.renderHomeStats(); ui.showScreen('home'); });

/* expose a small debug hook for testing */
window.__TLR_DEBUG={game,store,ui,startRace,get screen(){return ui.currentScreen();}};
