/* ================= GHOST: lap recorder + timestamped playback ================= */
import { GHOST_SAMPLE_RATE, MAX_VISIBLE_GHOSTS } from './config.js';
import { drawCar } from './car.js';

const GHOST_COLORS=['#22e6ff','#a45cff','#ff4fd8','#37f5a5','#ffd35c','#3b82ff','#7cffcb','#ff8a3d'];

export class GhostRecorder{
  constructor(){
    this.frames=[];
    this.interval=1/GHOST_SAMPLE_RATE;
    this.next=0;
  }
  reset(){ this.frames=[]; this.next=0; }
  sample(t,car){
    if(t<this.next && this.frames.length) return;
    this.next=t+this.interval;
    this.frames.push({t:+t.toFixed(4),x:+car.x.toFixed(2),y:+car.y.toFixed(2),a:+car.angle.toFixed(4),s:+car.speed.toFixed(1),b:car.nitroActive?1:0});
  }
  finish(t,car){
    this.sample(t,car);
    const last=this.frames[this.frames.length-1];
    if(!last || Math.abs(last.t-t)>0.001){
      this.frames.push({t:+t.toFixed(4),x:+car.x.toFixed(2),y:+car.y.toFixed(2),a:+car.angle.toFixed(4),s:+car.speed.toFixed(1),b:0});
    }
    return this.frames.slice();
  }
}

export class Ghost{
  constructor(recording,index=0){
    this.frames=Array.isArray(recording?.frames)?recording.frames:(Array.isArray(recording)?recording:[]);
    this.lapTime=recording?.lapTime || (this.frames.length?this.frames[this.frames.length-1].t:0);
    this.color=GHOST_COLORS[index%GHOST_COLORS.length];
    this.x=this.frames.length?this.frames[0].x:0;
    this.y=this.frames.length?this.frames[0].y:0;
    this.angle=0; this.boost=false; this.speed=0;
    this.trail=[];
    this.trailTimer=0;
    this.age=0;
  }

  update(dt,lapElapsed){
    this.age+=dt;
    if(this.frames.length<2) return;
    const target=Math.max(0,Math.min(lapElapsed,this.lapTime));
    const f=this.frames;
    let lo=0, hi=f.length-1;
    while(lo<hi-1){ const mid=(lo+hi)>>1; if(f[mid].t<=target) lo=mid; else hi=mid; }
    const a=f[lo], b=f[hi];
    const span=b.t-a.t;
    const k=span>0?Math.max(0,Math.min(1,(target-a.t)/span)):0;
    this.x=a.x+(b.x-a.x)*k;
    this.y=a.y+(b.y-a.y)*k;
    this.speed=a.s+(b.s-a.s)*k;
    let diff=b.a-a.a;
    while(diff>Math.PI) diff-=Math.PI*2;
    while(diff<-Math.PI) diff+=Math.PI*2;
    this.angle=a.a+diff*k;
    this.boost=!!b.b;

    this.trailTimer+=dt;
    if(this.trailTimer>.045){
      this.trailTimer=0;
      this.trail.push({x:this.x,y:this.y,age:0});
      if(this.trail.length>28) this.trail.shift();
    }
    this.trail.forEach(p=>p.age+=dt);
    this.trail=this.trail.filter(p=>p.age<.9);
  }

  draw(ctx,time){
    if(this.frames.length<2) return;
    const fade=Math.min(1,this.age/.8);
    // trail
    if(this.trail.length>1){
      ctx.save(); ctx.lineCap='round';
      for(let i=1;i<this.trail.length;i++){
        const p0=this.trail[i-1],p1=this.trail[i];
        const a=(1-p1.age/.9)*.55*fade*(i/this.trail.length);
        ctx.globalAlpha=a; ctx.strokeStyle=this.color; ctx.lineWidth=2+(i/this.trail.length)*5;
        ctx.shadowColor=this.color; ctx.shadowBlur=10;
        ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke();
      }
      ctx.restore();
    }
    drawCar(ctx,{x:this.x,y:this.y,angle:this.angle,body:'#0a1830',neon:this.color,
      alpha:.55*fade,ghost:true,time,scale:.95});
  }
}

export function buildGhosts(recordings){
  return recordings.slice(-MAX_VISIBLE_GHOSTS).map((r,i)=>new Ghost(r,i));
}

export function recordingFromFrames(frames,lapTime){
  return {frames,lapTime:+lapTime.toFixed(3)};
}
