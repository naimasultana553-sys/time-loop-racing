/* ================= CONFIG: cars, tracks, modes, constants ================= */

export const SAVE_KEY = 'tlr.save.v1';
export const MAX_VISIBLE_GHOSTS = 8;
export const GHOST_SAMPLE_RATE = 30; // frames per second recorded

export const BODY_COLORS = ['#1e6cff', '#22e6ff', '#a45cff', '#ff4fd8', '#37f5a5', '#ffb347', '#f2f6ff', '#ff5470'];
export const NEON_COLORS = ['#22e6ff', '#a45cff', '#ff4fd8', '#37f5a5', '#ffd35c', '#3b82ff'];

export const CARS = [
  { id:'speedster', name:'SPEEDSTER', desc:'Maximum velocity. Long straights are yours.',
    stats:{speed:5,handling:2,nitro:3}, accel:340, maxSpeed:470, turnRate:2.5, nitroPower:1.55, nitroRegen:9 },
  { id:'drifter', name:'DRIFTER', desc:'Sharp steering and precise corner control.',
    stats:{speed:3,handling:5,nitro:3}, accel:300, maxSpeed:410, turnRate:3.9, nitroPower:1.4, nitroRegen:9 },
  { id:'balanced', name:'BALANCED', desc:'Even performance in every situation.',
    stats:{speed:4,handling:4,nitro:3}, accel:320, maxSpeed:440, turnRate:3.2, nitroPower:1.48, nitroRegen:10 },
  { id:'phantom', name:'PHANTOM', desc:'Nitro recharges fast. Boost again and again.',
    stats:{speed:3,handling:3,nitro:5}, accel:310, maxSpeed:425, turnRate:3.1, nitroPower:1.5, nitroRegen:17 }
];

export const TRACKS = [
  { id:'neon', name:'NEON CITY', difficulty:1, desc:'Wide roads and gentle turns. Perfect for learning.',
    width:250, theme:'city', unlockAfter:null, unlocks:'desert', bestHint:'Get a feel for the loop.' },
  { id:'desert', name:'DESERT CIRCUIT', difficulty:2, desc:'Sharp corners and long straights. Stay focused.',
    width:205, theme:'desert', unlockAfter:'neon', unlocks:'space', bestHint:'Finish any Neon City race.' },
  { id:'space', name:'SPACE TRACK', difficulty:3, desc:'Futuristic layout with sweeping high-speed arcs.',
    width:195, theme:'space', unlockAfter:'desert', unlocks:'tunnel', bestHint:'Finish a Desert Circuit race.' },
  { id:'tunnel', name:'DARK TUNNEL', difficulty:3, desc:'Narrow, technical and unforgiving. No room to drift.',
    width:155, theme:'tunnel', unlockAfter:'space', unlocks:null, bestHint:'Finish a Space Track race.' }
];

/* closed-loop centerlines in world units */
export const TRACK_POINTS = {
  neon:[[400,300],[850,220],[1400,220],[1900,300],[2100,620],[2100,1020],[1900,1320],[1400,1400],[850,1400],[400,1320],[220,1020],[220,620]],
  desert:[[420,260],[900,250],[900,600],[1500,600],[1500,250],[2030,280],[2200,700],[1900,1020],[1900,1340],[1200,1340],[1200,1040],[600,1040],[300,780]],
  space:[[300,420],[620,250],[1020,320],[1320,180],[1720,320],[2120,470],[2220,820],[1950,1120],[1580,1260],[1200,1140],[900,1360],[500,1200],[250,840]],
  tunnel:[[420,320],[820,210],[1200,360],[1620,210],[2020,360],[2120,720],[1800,860],[2020,1120],[1600,1360],[1200,1140],[800,1360],[400,1140],[260,800],[520,560]]
};

export const MODES = [
  { id:'timeloop', icon:'&#9835;', name:'TIME LOOP', main:true, tag:'MAIN MODE',
    desc:'Every completed lap becomes a ghost rival. Beat your previous lap or the race ends.' },
  { id:'trial', icon:'&#9201;', name:'TIME TRIAL', tag:'NO GHOSTS',
    desc:'Pure lap racing against the clock. Set your personal best with no rivals.' },
  { id:'ghost', icon:'&#128120;', name:'GHOST BATTLE', tag:'SAVED RIVALS',
    desc:'Race against ghosts saved from your previous sessions on this track.' },
  { id:'survival', icon:'&#9889;', name:'SURVIVAL RACE', tag:'OBSTACLES',
    desc:'Dodge the energy mines on the track. One hit and the run is over.' }
];

export const SCORE = { lap:100, beat:50, crystal:25, finish:200, flawless:100, record:150 };

export const DEFAULT_SETTINGS = { music:40, sfx:70, quality:'high', laps:5, endless:false };

export function trackById(id){ return TRACKS.find(t=>t.id===id) || TRACKS[0]; }
export function carById(id){ return CARS.find(c=>c.id===id) || CARS[2]; }
export function modeById(id){ return MODES.find(m=>m.id===id) || MODES[0]; }
