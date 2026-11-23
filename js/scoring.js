/* ================= SCORING: lap times, comparison, rewards ================= */
import { SCORE } from './config.js';

export function formatTime(sec){
  if(typeof sec!=='number'||!isFinite(sec)||sec<=0) return '--:--.--';
  const m=Math.floor(sec/60);
  const s=Math.floor(sec%60);
  const cs=Math.floor((sec%1)*100);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

export function deltaText(delta){
  if(typeof delta!=='number'||!isFinite(delta)) return {text:'—',cls:''};
  const sign=delta<0?'-':'+';
  const txt=`${sign}${Math.abs(delta).toFixed(2)}s ${delta<0?'FASTER':'SLOWER'}`;
  return {text:txt,cls:delta<0?'faster':'slower'};
}

export function computeRaceScore(stats){
  const {laps=0,beats=0,crystals=0,collisions=0,finished=false,newRecord=false}=stats;
  let score=0;
  score+=laps*SCORE.lap;
  score+=beats*SCORE.beat;
  score+=crystals*SCORE.crystal;
  if(finished){
    score+=SCORE.finish;
    if(collisions===0) score+=SCORE.flawless;
  }
  if(newRecord) score+=SCORE.record;
  const coins=Math.round(score/10)+Math.floor(laps/2);
  const medals=(newRecord?2:0)+(finished?1:0)+(collisions===0?1:0);
  return {score,coins,medals};
}
