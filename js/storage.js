/* ================= STORAGE: safe versioned localStorage save ================= */
import { SAVE_KEY, DEFAULT_SETTINGS, BODY_COLORS, NEON_COLORS, CARS, TRACKS } from './config.js';

function fresh(){
  return {
    version:1,
    coins:0, score:0, medals:0, totalRaces:0,
    selectedCar:'balanced',
    colorsByCar:{},
    unlockedTracks:['neon'],
    records:{},
    ghosts:{},
    settings:{...DEFAULT_SETTINGS}
  };
}

let state = fresh();

function safeParse(raw){
  try{ return JSON.parse(raw); }catch(e){ return null; }
}

export function load(){
  let raw=null;
  try{ raw = localStorage.getItem(SAVE_KEY); }catch(e){ /* private mode */ }
  const parsed = raw ? safeParse(raw) : null;
  if(!parsed || typeof parsed!=='object' || parsed.version!==1){
    state = fresh();
  }else{
    const f = fresh();
    state = {
      ...f, ...parsed,
      settings:{...f.settings, ...(parsed.settings||{})},
      colorsByCar:(parsed.colorsByCar && typeof parsed.colorsByCar==='object') ? parsed.colorsByCar : {},
      unlockedTracks:Array.isArray(parsed.unlockedTracks) && parsed.unlockedTracks.length ? parsed.unlockedTracks : ['neon'],
      records:(parsed.records && typeof parsed.records==='object') ? parsed.records : {},
      ghosts:(parsed.ghosts && typeof parsed.ghosts==='object') ? parsed.ghosts : {}
    };
  }
  return state;
}

export function save(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }catch(e){ /* ignore quota / private */ }
}

export function getState(){ return state; }

/* ---------- settings ---------- */
export function getSettings(){ return state.settings; }
export function setSetting(key,value){ state.settings[key]=value; save(); }

/* ---------- car / colors ---------- */
export function getSelectedCar(){ return state.selectedCar; }
export function selectCar(id){
  if(!CARS.some(c=>c.id===id)) return;
  state.selectedCar=id; save();
}
export function getColors(carId){
  const c = state.colorsByCar[carId];
  const fallbackCar = CARS.find(x=>x.id===carId) || CARS[2];
  return {
    body:(c && c.body) || BODY_COLORS[0],
    neon:(c && c.neon) || NEON_COLORS[0],
    _fallback:fallbackCar
  };
}
export function setColor(carId,type,value){
  if(!state.colorsByCar[carId]) state.colorsByCar[carId]={};
  state.colorsByCar[carId][type]=value; save();
}

/* ---------- tracks ---------- */
export function isUnlocked(trackId){
  return state.unlockedTracks.includes(trackId);
}
export function unlockTrack(trackId){
  if(!TRACKS.some(t=>t.id===trackId) || state.unlockedTracks.includes(trackId)) return false;
  state.unlockedTracks.push(trackId); save(); return true;
}
export function unlockNextAfter(trackId){
  const track = TRACKS.find(t=>t.id===trackId);
  if(!track || !track.unlocks) return null;
  return unlockTrack(track.unlocks);
}

/* ---------- records ---------- */
export function recordKey(trackId,mode){ return `${trackId}:${mode}`; }
export function getRecord(trackId,mode){ return state.records[recordKey(trackId,mode)] || null; }

export function updateRecord(trackId,mode,{bestLap,bestRace,lastLap}){
  const key = recordKey(trackId,mode);
  const prev = state.records[key] || {bestLap:null,bestRace:null,lastLap:null,races:0};
  let isLapRecord=false, isRaceRecord=false;
  if(typeof bestLap==='number' && bestLap>0 && (prev.bestLap===null || bestLap<prev.bestLap)){
    prev.bestLap=bestLap; isLapRecord=true;
  }
  if(typeof bestRace==='number' && bestRace>0 && (prev.bestRace===null || bestRace<prev.bestRace)){
    prev.bestRace=bestRace; isRaceRecord=true;
  }
  if(typeof lastLap==='number' && lastLap>0) prev.lastLap=lastLap;
  prev.races=(prev.races||0)+1;
  state.records[key]=prev; save();
  return {isLapRecord,isRaceRecord,record:prev};
}

export function allLapRecords(){
  const out=[];
  for(const t of TRACKS){
    for(const m of ['timeloop','trial','ghost','survival']){
      const r=state.records[recordKey(t.id,m)];
      if(r && r.bestLap) out.push({track:t.id,mode:m,...r});
    }
  }
  return out;
}

/* ---------- saved ghosts for Ghost Battle ---------- */
export function getGhosts(trackId,mode){ const g=state.ghosts[recordKey(trackId,mode)]; return Array.isArray(g)?g:[]; }
export function saveGhost(trackId,mode,recording){
  const key=recordKey(trackId,mode);
  if(!Array.isArray(state.ghosts[key])) state.ghosts[key]=[];
  state.ghosts[key].push(recording);
  if(state.ghosts[key].length>4) state.ghosts[key].shift();
  save();
}

/* ---------- rewards / progression ---------- */
export function addRewards({coins=0,score=0,medals=0,races=0}={}){
  state.coins+=coins; state.score+=score; state.medals+=medals; state.totalRaces+=races; save();
}
export function getLevel(){ return 1 + Math.floor(state.score/1000) + Math.floor(state.totalRaces/4); }

export function resetProgress(){
  state=fresh(); save();
}
