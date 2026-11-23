/* ================= RACING: game loop, laps, modes, HUD ================= */
import { trackById, carById, MAX_VISIBLE_GHOSTS } from './config.js';
import { Track } from './track.js';
import { Car, drawCar, drawHeadlights } from './car.js';
import { GhostRecorder, buildGhosts, recordingFromFrames } from './ghost.js';
import { Effects } from './effects.js';
import { formatTime, deltaText } from './scoring.js';
import { input, clearInput } from './input.js';
import * as audio from './audio.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class RacingGame{
  constructor(canvas,callbacks={}){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.cb=callbacks;
    this.effects=new Effects();
    this.recorder=new GhostRecorder();
    this.view={w:0,h:0,cx:0,cy:0,zoom:1};
    this.running=false;
    this.raf=0;
    this.last=0;
    this.loop=this.loop.bind(this);
    this.resize=this.resize.bind(this);
    window.addEventListener('resize',this.resize);
    window.addEventListener('orientationchange',this.resize);
    if(window.visualViewport) window.visualViewport.addEventListener('resize',this.resize);
    this.resize();
  }

  resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=this.canvas.clientWidth||window.innerWidth;
    const h=this.canvas.clientHeight||window.innerHeight;
    this.canvas.width=Math.round(w*dpr);
    this.canvas.height=Math.round(h*dpr);
    this.view.w=w; this.view.h=h;
    this.view.zoom=clamp(Math.min(w/1100,h/750),.42,1.05);
    this.dpr=dpr;
  }

  start(config){
    this.stop();
    this.resize(); // canvas may have been hidden while a menu was open
    this.config={...config};
    const def=trackById(config.trackId);
    this.track=new Track(def);
    const spec=carById(config.carId||'balanced');
    const colors=config.colors||{body:'#1e6cff',neon:'#22e6ff'};
    this.car=new Car(spec,colors,this.track.start.x,this.track.start.y,this.track.start.angle);
    this.mode=config.mode||'timeloop';
    this.lapsTotal=this.mode==='survival'?Infinity:(config.endless?Infinity:(config.laps||5));
    this.phase='countdown';
    this.countdown=3.4;
    this.lastCount=4;
    this.raceTime=0;
    this.lapElapsed=0;
    this.lapIndex=1;
    this.totalProgress=0;
    this.prevProgress=0;
    this.lapStartProgress=0;
    this.bestLap=null;
    this.lastLapTime=null;
    this.lastDelta=null;
    this.savedRecordings=[];
    this.ghosts=[];
    if(this.mode==='timeloop'){
      // fresh run: ghosts are created by this race
    }else if(this.mode==='ghost'){
      this.ghosts=buildGhosts(config.savedGhosts||[]);
    }
    this.recorder.reset();
    this.crystalTaken=new Set();
    this.obstacles=this.mode==='survival'?this.track.obstacleSpots:[];
    this.stats={laps:0,beats:0,crystals:0,collisions:0,finished:false,newRecord:false,reason:null};
    this.collisionCooldown=0;
    this.effects.particles=[]; this.effects.shake=0;
    this.endTimer=0;
    this.pendingResult=null;
    clearInput();
    this.view.cx=this.car.x; this.view.cy=this.car.y;
    this.running=true;
    this.last=performance.now();
    audio.init(); audio.resume(); audio.startEngine(); audio.startMusic();
    audio.setVolumes(config.settings?.music??40,config.settings?.sfx??70);
    this.cb.onCountdown?.('3');
    this.raf=requestAnimationFrame(this.loop);
  }

  stop(){
    this.running=false;
    if(this.raf) cancelAnimationFrame(this.raf);
    this.raf=0;
    audio.stopEngine();
    clearInput();
  }

  pause(){
    if(!this.running||this.phase==='ended') return;
    this.running=false;
    if(this.raf) cancelAnimationFrame(this.raf);
    this.raf=0;
    audio.stopEngine(); audio.suspend();
    clearInput();
  }

  resume(){
    if(this.running||this.phase==='ended') return;
    this.running=true;
    this.last=performance.now();
    audio.resume(); audio.startEngine();
    this.raf=requestAnimationFrame(this.loop);
  }

  restart(){ if(this.config) this.start(this.config); }

  /* ---------------- MAIN LOOP ---------------- */
  loop(ts){
    if(!this.running) return;
    const dt=Math.min(.05,Math.max(0,(ts-this.last)/1000));
    this.last=ts;
    this.update(dt);
    this.render(ts);
    if(this.running) this.raf=requestAnimationFrame(this.loop);
  }

  update(dt){
    const time=performance.now();
    if(this.phase==='countdown'){
      this.countdown-=dt;
      const n=Math.ceil(this.countdown-.4);
      const label=n>0?String(n):'GO!';
      if(label!==this._lastLabel){
        this._lastLabel=label;
        this.cb.onCountdown?.(label);
        audio.play(label==='GO!'?'confirm':'count');
      }
      if(this.countdown<=0){
        this.phase='racing';
        this.cb.onCountdown?.(null);
        this._lastLabel=null;
      }
      this._updateCamera(dt);
      return;
    }

    if(this.phase==='ended'){
      this.endTimer-=dt;
      this.effects.update(dt);
      this._updateCamera(dt);
      if(this.endTimer<=0){ this.running=false; this.cb.onFinish?.(this.pendingResult); }
      return;
    }

    /* ---- active racing ---- */
    this.raceTime+=dt;
    this.lapElapsed+=dt;
    this.collisionCooldown=Math.max(0,this.collisionCooldown-dt);

    const hit=this.car.update(dt,input,this.track);
    if(hit&&this.collisionCooldown<=0){
      this.collisionCooldown=.75;
      this.stats.collisions++;
      this.effects.emit('spark',this.car.x,this.car.y,this.car.angle,'#ffb347');
      this.effects.addShake(8);
      audio.play('crash');
    }

    if(this.car.nitroActive){
      this.effects.emit('boost',this.car.x,this.car.y,this.car.angle,'#22e6ff');
      if(Math.random()<.05) audio.play('boost');
    }

    this.recorder.sample(this.lapElapsed,this.car);
    this.ghosts.forEach(g=>g.update(dt,this.lapElapsed));

    // crystals
    this.track.crystalSpots.forEach((spot,i)=>{
      if(this.crystalTaken.has(i)) return;
      if(Math.hypot(spot.x-this.car.x,spot.y-this.car.y)<26){
        this.crystalTaken.add(i);
        this.stats.crystals++;
        this.car.nitro=Math.min(100,this.car.nitro+24);
        this.effects.emit('crystal',spot.x,spot.y,0,'#37f5a5');
        audio.play('crystal');
        this.cb.onToast?.('+25  TIME CRYSTAL','gold');
      }
    });

    // survival mines
    for(const spot of this.obstacles){
      if(Math.hypot(spot.x-this.car.x,spot.y-this.car.y)<27){
        this.effects.emit('spark',spot.x,spot.y,0,'#ff5470');
        this.effects.addShake(18);
        this._endRace(false,'MINE STRIKE');
        return;
      }
    }

    // ---- lap detection via unwrapped centerline progress ----
    const p=this.track.progressAt(this.car.x,this.car.y);
    let d=p-this.prevProgress;
    if(d<-.5) d+=1;
    if(d>.5) d-=1;
    d=clamp(d,-.08,.08);
    this.totalProgress+=d;
    this.prevProgress=p;
    if(this.totalProgress-this.lapStartProgress>=1) this._completeLap();

    this.effects.update(dt);
    this._updateCamera(dt);
    audio.updateEngine(Math.min(1,Math.abs(this.car.speed)/this.car.spec.maxSpeed),this.car.nitroActive);
    this.cb.onHud?.(this._hudData());
  }

  _updateCamera(dt){
    const k=Math.min(1,dt*5);
    this.view.cx+=(this.car.x-this.view.cx)*k;
    this.view.cy+=(this.car.y-this.view.cy)*k;
  }

  _completeLap(){
    const lapTime=this.lapElapsed;
    const frames=this.recorder.finish(lapTime,this.car);
    const recording=recordingFromFrames(frames,lapTime);
    this.savedRecordings.push(recording);
    if(this.savedRecordings.length>MAX_VISIBLE_GHOSTS) this.savedRecordings.shift();

    const prev=this.lastLapTime;
    this.lastLapTime=lapTime;
    if(this.bestLap===null||lapTime<this.bestLap) this.bestLap=lapTime;
    this.stats.laps++;

    if(prev!==null){
      const delta=lapTime-prev;
      this.lastDelta=delta;
      if(delta<0){
        this.stats.beats++;
        this.cb.onToast?.(`${Math.abs(delta).toFixed(2)}s FASTER!`,'gold');
      }else{
        this.cb.onToast?.(`${delta.toFixed(2)}s SLOWER`,'negative');
        if(this.mode==='timeloop'){
          this._endRace(false,'SLOWER THAN PREVIOUS LAP');
          return;
        }
      }
    }else{
      this.cb.onToast?.('LAP 1 COMPLETE','gold');
    }

    // spawn ghost for next lap (Time Loop core mechanic)
    if(this.mode==='timeloop'){
      this.ghosts=buildGhosts(this.savedRecordings);
      audio.play('ghost');
    }
    audio.play('lap');
    this.effects.emit('finish',this.car.x,this.car.y,0,'#22e6ff');

    this.lapIndex++;
    this.lapElapsed=0;
    this.recorder.reset();
    this.crystalTaken.clear();
    this.lapStartProgress=this.totalProgress;

    if(isFinite(this.lapsTotal)&&this.lapIndex>this.lapsTotal){
      this._endRace(true,null);
    }
  }

  _endRace(finished,reason){
    if(this.phase==='ended') return;
    this.phase='ended';
    this.endTimer=.85;
    this.stats.finished=finished;
    this.stats.reason=reason;
    if(finished){
      audio.play('finish');
      this.effects.emit('finish',this.car.x,this.car.y,0,'#a45cff');
    }else{
      audio.play('fail');
    }
    audio.stopEngine();
    this.cb.onCountdown?.(null);
    const result={
      trackId:this.config.trackId,
      mode:this.mode,
      totalTime:this.raceTime,
      bestLap:this.bestLap,
      lastLap:this.lastLapTime,
      previousLap:prevLapForResult(this.lastDelta,this.lastLapTime),
      lastDelta:this.lastDelta,
      ghostsCreated:this.savedRecordings.length,
      stats:{...this.stats},
      recordings:this.savedRecordings.slice(),
      isEndless:!isFinite(this.lapsTotal)
    };
    this.pendingResult=result;
  }

  _hudData(){
    const d=deltaText(this.lastDelta);
    const lapDisplay=isFinite(this.lapsTotal)?`${Math.min(this.lapIndex,this.lapsTotal)} / ${this.lapsTotal}`:`${this.lapIndex} / ∞`;
    return {
      lapText:lapDisplay,
      status:this.mode==='survival'?'SURVIVAL':`RIVALS: ${this.ghosts.length}`,
      timer:formatTime(this.raceTime),
      speed:Math.round(Math.abs(this.car.speed)*.62),
      speedPct:Math.min(100,Math.abs(this.car.speed)/this.car.spec.maxSpeed*100),
      nitroPct:this.car.nitro,
      best:formatTime(this.bestLap),
      prev:formatTime(this.lastLapTime),
      delta:d.text, deltaCls:d.cls,
      ghosts:this.ghosts.length,
      lapTime:formatTime(this.lapElapsed)
    };
  }

  /* ---------------- RENDER ---------------- */
  render(ts){
    const ctx=this.ctx, view=this.view, time=ts||performance.now();
    let quality=this.config?.settings?.quality||'high';
    if(window.matchMedia('(pointer:coarse)').matches && quality==='high') quality='medium';
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    ctx.clearRect(0,0,view.w,view.h);
    this.track.render(ctx,view,time,quality);

    const shake=this.effects.getShakeOffset();
    ctx.save();
    ctx.translate(view.w/2+shake.x,view.h/2+shake.y);
    ctx.scale(view.zoom,view.zoom);
    ctx.translate(-view.cx,-view.cy);

    this.track.crystalSpots.forEach((s,i)=>this.track.drawCrystal(ctx,s,time,this.crystalTaken.has(i)));
    this.obstacles.forEach(s=>this.track.drawObstacle(ctx,s,time));
    if(this.car) drawHeadlights(ctx,this.car,time);
    this.ghosts.forEach(g=>g.draw(ctx,time));

    if(this.car){
      drawCar(ctx,{x:this.car.x,y:this.car.y,angle:this.car.angle,body:this.car.colors.body,
        neon:this.car.colors.neon,boost:this.car.nitroActive,brake:input.brake,
        steer:this.car.steer,time,alpha:1});
    }
    this.effects.draw(ctx);
    ctx.restore();

    this.effects.drawSpeedLines(ctx,view,Math.abs(this.car?.speed||0)/this.car?.spec.maxSpeed||0,time,quality);

    if(this.car?.nitroActive){
      ctx.save(); ctx.globalAlpha=.08; ctx.fillStyle='#ff4fd8';
      ctx.fillRect(0,0,view.w,view.h); ctx.restore();
    }
  }
}

function prevLapForResult(delta,lastLap){
  if(typeof delta!=='number'||typeof lastLap!=='number') return null;
  return lastLap-delta;
}
