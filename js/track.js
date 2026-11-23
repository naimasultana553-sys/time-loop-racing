/* ================= TRACK: geometry, collisions, rendering ================= */
import { TRACK_POINTS } from './config.js';

const THEME = {
  city:   { road:'#0d1730', edge:'#22e6ff', accent:'#a45cff', bg1:'#070c1c', bg2:'#0b1430' },
  desert: { road:'#241a20', edge:'#ffb347', accent:'#ff4fd8', bg1:'#140c12', bg2:'#26141c' },
  space:  { road:'#0b1228', edge:'#3b82ff', accent:'#ff4fd8', bg1:'#040614', bg2:'#0a0c28' },
  tunnel: { road:'#0a0d18', edge:'#a45cff', accent:'#22e6ff', bg1:'#03040a', bg2:'#090a16' }
};

export class Track{
  constructor(def){
    this.def=def;
    this.id=def.id;
    this.width=def.width;
    this.theme=THEME[def.theme]||THEME.city;
    this.points=(TRACK_POINTS[def.id]||TRACK_POINTS.neon).map(p=>[p[0],p[1]]);
    this.segments=[];
    let cum=0;
    for(let i=0;i<this.points.length;i++){
      const a=this.points[i], b=this.points[(i+1)%this.points.length];
      const dx=b[0]-a[0], dy=b[1]-a[1], len=Math.hypot(dx,dy);
      this.segments.push({x1:a[0],y1:a[1],x2:b[0],y2:b[1],dx,dy,len,cum});
      cum+=len;
    }
    this.length=cum;
    const s=this.segments[0];
    this.start={x:s.x1,y:s.y1,angle:Math.atan2(s.dy,s.dx)};
    this.crystalSpots=[.16,.38,.61,.83].map(p=>this.getPointAt(p));
    this.obstacleSpots=[.12,.24,.35,.47,.58,.7,.81,.92].map((p,i)=>this.getPointAt((p+ (i%2)*.012)%1));
    this.bounds={
      minX:Math.min(...this.points.map(p=>p[0]))-this.width,
      maxX:Math.max(...this.points.map(p=>p[0]))+this.width,
      minY:Math.min(...this.points.map(p=>p[1]))-this.width,
      maxY:Math.max(...this.points.map(p=>p[1]))+this.width
    };
    this.texture=this._makeTexture();
    this.pattern=null;
  }

  /* procedural asphalt: speckles, wear and cracks */
  _makeTexture(){
    const c=document.createElement('canvas');
    c.width=c.height=160;
    const x=c.getContext('2d');
    x.fillStyle=this.theme.road;
    x.fillRect(0,0,160,160);
    // aggregate speckles
    for(let i=0;i<2600;i++){
      const v=Math.random();
      x.fillStyle=v>.5?`rgba(255,255,255,${.012+Math.random()*.035})`:`rgba(0,0,0,${.02+Math.random()*.05})`;
      const s=Math.random()<.85?1:2;
      x.fillRect(Math.random()*160,Math.random()*160,s,s);
    }
    // worn patches
    for(let i=0;i<10;i++){
      x.fillStyle=`rgba(120,140,170,${.01+Math.random()*.02})`;
      x.beginPath();
      x.ellipse(Math.random()*160,Math.random()*160,10+Math.random()*28,6+Math.random()*16,Math.random()*3,0,Math.PI*2);
      x.fill();
    }
    // hairline cracks
    x.strokeStyle='rgba(0,0,0,.35)'; x.lineWidth=1;
    for(let i=0;i<7;i++){
      x.beginPath();
      let px=Math.random()*160, py=Math.random()*160;
      x.moveTo(px,py);
      for(let k=0;k<5;k++){ px+=(Math.random()-.5)*30; py+=(Math.random()-.5)*30; x.lineTo(px,py); }
      x.stroke();
    }
    return c;
  }

  getPointAt(progress){
    let p=((progress%1)+1)%1;
    const target=p*this.length;
    let seg=this.segments[this.segments.length-1];
    for(const s of this.segments){ if(target>=s.cum && target<s.cum+s.len){ seg=s; break; } }
    const t=seg.len? (target-seg.cum)/seg.len : 0;
    return {x:seg.x1+seg.dx*t, y:seg.y1+seg.dy*t, angle:Math.atan2(seg.dy,seg.dx)};
  }

  closest(x,y){
    let best=null;
    for(const s of this.segments){
      const l2=s.dx*s.dx+s.dy*s.dy;
      let t=l2? ((x-s.x1)*s.dx+(y-s.y1)*s.dy)/l2 : 0;
      t=Math.max(0,Math.min(1,t));
      const cx=s.x1+s.dx*t, cy=s.y1+s.dy*t;
      const d=Math.hypot(x-cx,y-cy);
      if(!best||d<best.dist) best={x:cx,y:cy,dist:d,progress:(s.cum+s.len*t)/this.length,seg:s,t};
    }
    return best;
  }

  progressAt(x,y){ return this.closest(x,y).progress%1; }

  clampToRoad(x,y,radius=16){
    const c=this.closest(x,y);
    const limit=this.width/2-radius;
    if(c.dist<=limit) return {x,y,hit:false};
    let nx=(x-c.x)/(c.dist||1), ny=(y-c.y)/(c.dist||1);
    if(c.dist<0.001){ nx=-c.seg.dy/(c.seg.len||1); ny=c.seg.dx/(c.seg.len||1); }
    return {x:c.x+nx*limit, y:c.y+ny*limit, hit:true};
  }

  /* ---------- rendering ---------- */
  render(ctx,view,time,quality='high'){
    const t=this.theme;
    const glow=quality==='low'?0:(quality==='medium'?14:28);

    // background
    const g=ctx.createLinearGradient(0,0,view.w,view.h);
    g.addColorStop(0,t.bg1); g.addColorStop(1,t.bg2);
    ctx.fillStyle=g; ctx.fillRect(0,0,view.w,view.h);
    this._sky(ctx,view,time,quality);

    ctx.save();
    ctx.translate(view.w/2,view.h/2);
    ctx.scale(view.zoom,view.zoom);
    ctx.translate(-view.cx,-view.cy);

    this._ground(ctx,view,quality);
    this._scenery(ctx,time,quality);

    // road: glow halo, curbs, asphalt, texture, markings
    ctx.lineJoin='round'; ctx.lineCap='round';
    this._path(ctx);
    ctx.save();
    ctx.shadowColor=t.edge; ctx.shadowBlur=glow;
    ctx.strokeStyle=hexA(t.edge,.55); ctx.lineWidth=this.width+22; ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.setLineDash([18,18]); ctx.lineDashOffset=-(time*.012)%36;
    ctx.strokeStyle='rgba(255,72,112,.85)'; ctx.lineWidth=this.width+13; ctx.stroke();
    ctx.lineDashOffset=18-(time*.012)%36;
    ctx.strokeStyle='rgba(240,248,255,.9)'; ctx.stroke();
    ctx.restore();

    this._path(ctx);
    ctx.strokeStyle=t.road; ctx.lineWidth=this.width; ctx.stroke();

    // real asphalt texture + wear marks, clipped to the road
    ctx.save();
    this._path(ctx); ctx.clip();
    if(!this.pattern) this.pattern=ctx.createPattern(this.texture,'repeat');
    if(this.pattern){
      ctx.globalAlpha=.95;
      ctx.fillStyle=this.pattern;
      ctx.fillRect(this.bounds.minX,this.bounds.minY,this.bounds.maxX-this.bounds.minX,this.bounds.maxY-this.bounds.minY);
      ctx.globalAlpha=1;
    }
    this._skidMarks(ctx);
    ctx.restore();

    this._laneLines(ctx,time);
    this._guardrails(ctx,time,quality);

    ctx.save();
    ctx.setLineDash([26,38]); ctx.lineDashOffset=-(time*.03)%64;
    ctx.strokeStyle=hexA(t.accent,.65); ctx.lineWidth=2;
    ctx.shadowColor=t.accent; ctx.shadowBlur=glow*.6;
    this._path(ctx); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.lineWidth=1.5;
    this._path(ctx); ctx.stroke();
    ctx.restore();

    this._startLine(ctx,time,glow);
    ctx.restore();

    // screen-space film overlay
    ctx.save();
    const vg=ctx.createRadialGradient(view.w/2,view.h/2,view.h*.28,view.w/2,view.h/2,Math.max(view.w,view.h)*.75);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,view.w,view.h);
    ctx.restore();
  }

  _path(ctx){
    ctx.beginPath();
    ctx.moveTo(this.points[0][0],this.points[0][1]);
    for(let i=1;i<this.points.length;i++) ctx.lineTo(this.points[i][0],this.points[i][1]);
    ctx.closePath();
  }

  /* dark rubber marks on the racing line */
  _skidMarks(ctx){
    ctx.save();
    ctx.strokeStyle='rgba(0,0,0,.32)'; ctx.lineWidth=7; ctx.lineCap='round';
    for(let i=0;i<this.segments.length;i++){
      if(i%3!==0) continue;
      const s=this.segments[i];
      const nx=-s.dy/(s.len||1), ny=s.dx/(s.len||1);
      for(const side of [-1,1]){
        const off=side*this.width*.13;
        ctx.beginPath();
        ctx.moveTo(s.x1+nx*off,s.y1+ny*off);
        ctx.lineTo(s.x1+s.dx*.72+nx*off,s.y1+s.dy*.72+ny*off);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* painted lane dividers offset from the centre line */
  _laneLines(ctx,time){
    ctx.save();
    ctx.setLineDash([20,30]);
    ctx.lineDashOffset=-(time*.022)%50;
    ctx.strokeStyle='rgba(235,248,255,.34)';
    ctx.lineWidth=2;
    for(const off of [-this.width*.25,this.width*.25]){
      ctx.beginPath();
      for(const s of this.segments){
        const nx=-s.dy/(s.len||1), ny=s.dx/(s.len||1);
        ctx.moveTo(s.x1+nx*off,s.y1+ny*off);
        ctx.lineTo(s.x2+nx*off,s.y2+ny*off);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* metal guardrails with posts along both edges */
  _guardrails(ctx,time,quality){
    if(quality==='low') return;
    ctx.save();
    ctx.lineCap='round';
    for(const s of this.segments){
      const nx=-s.dy/(s.len||1), ny=s.dx/(s.len||1);
      const steps=Math.max(2,Math.floor(s.len/70));
      for(const side of [-1,1]){
        const off=side*(this.width/2+11);
        let prev=null;
        for(let k=0;k<=steps;k++){
          const f=k/steps;
          const px=s.x1+s.dx*f+nx*off, py=s.y1+s.dy*f+ny*off;
          if(prev){
            ctx.strokeStyle='rgba(150,175,205,.45)'; ctx.lineWidth=4;
            ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(px,py); ctx.stroke();
            ctx.strokeStyle=hexA(this.theme.edge,.35); ctx.lineWidth=1.2;
            ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(px,py); ctx.stroke();
          }
          ctx.fillStyle='rgba(90,110,140,.7)';
          ctx.fillRect(px-3,py-3,6,6);
          prev={x:px,y:py};
        }
      }
    }
    ctx.restore();
  }

  _sky(ctx,view,time,quality){
    if(quality==='low') return;
    ctx.save();
    const t=this.theme;
    if(this.id==='space'){
      for(let i=0;i<90;i++){
        const x=((i*7919)%1000)/1000*view.w;
        const y=((i*3571)%1000)/1000*view.h;
        const tw=.4+Math.abs(Math.sin(time*.001+i))*.6;
        ctx.fillStyle=`rgba(190,225,255,${tw*.7})`;
        ctx.fillRect(x,y,i%9===0?2:1,i%9===0?2:1);
      }
    }else if(this.id==='city'){
      const glow=ctx.createLinearGradient(0,view.h,0,view.h*.4);
      glow.addColorStop(0,hexA(t.accent,.16)); glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow; ctx.fillRect(0,0,view.w,view.h);
    }
    ctx.restore();
  }

  _ground(ctx,view,quality){
    if(quality==='low') return;
    const step=140;
    const x0=Math.floor((view.cx-view.w/view.zoom/2)/step)*step;
    const x1=view.cx+view.w/view.zoom/2+step;
    const y0=Math.floor((view.cy-view.h/view.zoom/2)/step)*step;
    const y1=view.cy+view.h/view.zoom/2+step;
    ctx.save();
    ctx.strokeStyle=hexA(this.theme.edge,.07); ctx.lineWidth=1;
    for(let x=x0;x<x1;x+=step){ ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke(); }
    for(let y=y0;y<y1;y+=step){ ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke(); }
    ctx.restore();
  }

  _scenery(ctx,time,quality){
    const t=this.theme;
    const detail=quality==='low'?0:(quality==='medium'?1:2);
    ctx.save();
    for(let i=0;i<this.segments.length;i++){
      const s=this.segments[i];
      const mx=(s.x1+s.x2)/2,my=(s.y1+s.y2)/2;
      const nx=-s.dy/(s.len||1),ny=s.dx/(s.len||1);
      const ang=Math.atan2(s.dy,s.dx);
      for(const side of [-1,1]){
        const off=this.width/2+62+(i%3)*22;
        const px=mx+nx*off*side, py=my+ny*off*side;
        ctx.save(); ctx.translate(px,py); ctx.rotate(ang);

        if(this.id==='city'){
          const w=48+(i%4)*16, h=54+((i*7)%5)*18;
          ctx.fillStyle='#070c1a'; ctx.strokeStyle=hexA(t.edge,.35); ctx.lineWidth=1.5;
          ctx.fillRect(-w/2,-h/2,w,h); ctx.strokeRect(-w/2,-h/2,w,h);
          ctx.fillStyle=hexA(i%2?t.edge:t.accent,.55);
          for(let wy=-h/2+8;wy<h/2-6;wy+=12)
            for(let wx=-w/2+7;wx<w/2-6;wx+=11)
              if((i+wx+wy)%3!==0) ctx.fillRect(wx,wy,4,5);
          if(detail>1){
            ctx.fillStyle=hexA(t.accent,.7); ctx.fillRect(-w/2+4,-h/2+4,w-8,2);
          }
        }else if(this.id==='desert'){
          ctx.fillStyle='rgba(60,30,28,.55)';
          ctx.beginPath(); ctx.moveTo(-50,18); ctx.lineTo(-18,-12); ctx.lineTo(6,18); ctx.closePath(); ctx.fill();
          ctx.fillStyle='rgba(120,60,40,.5)';
          ctx.beginPath(); ctx.moveTo(8,18); ctx.lineTo(34,-6); ctx.lineTo(56,18); ctx.closePath(); ctx.fill();
          ctx.strokeStyle=hexA(t.accent,.3); ctx.beginPath(); ctx.moveTo(-18,-12); ctx.lineTo(6,18); ctx.stroke();
        }else if(this.id==='space'){
          ctx.strokeStyle=hexA(i%2?t.edge:t.accent,.5); ctx.lineWidth=2;
          ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=detail>1?18:0;
          ctx.beginPath(); ctx.arc(0,0,14+(i%4)*6,0,Math.PI*2); ctx.stroke();
          ctx.globalAlpha=.35; ctx.beginPath(); ctx.arc(0,0,26+(i%3)*8,time*.0004+i,time*.0004+i+Math.PI*1.2); ctx.stroke();
        }else{
          ctx.strokeStyle=hexA(t.edge,.35); ctx.lineWidth=3;
          ctx.beginPath(); ctx.arc(0,0,this.width/2+40,Math.PI*.15,Math.PI*.85); ctx.stroke();
          ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(-8,-this.width/2-30,16,this.width+60);
        }
        ctx.restore();
      }

      if(this.id==='tunnel'&&detail>0){
        // tunnel ribs over the road
        for(let k=0;k<3;k++){
          const f=(k+.5)/3;
          ctx.save();
          ctx.translate(s.x1+s.dx*f,s.y1+s.dy*f); ctx.rotate(ang);
          ctx.strokeStyle=hexA(t.edge,.22); ctx.lineWidth=4;
          ctx.beginPath(); ctx.arc(0,0,this.width*.62,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  _startLine(ctx,time,glow){
    const {x,y,angle}=this.start;
    const half=this.width/2;
    ctx.save();
    ctx.translate(x,y); ctx.rotate(angle);

    // checkered strip
    for(let i=-4;i<4;i++){
      ctx.fillStyle=i%2?'rgba(8,12,24,.95)':'rgba(255,255,255,.92)';
      ctx.fillRect(-6,i*(half/4),12,half/4);
    }
    ctx.fillStyle='rgba(34,230,255,.95)'; ctx.shadowColor='#22e6ff'; ctx.shadowBlur=glow;
    ctx.fillRect(-10,-half,3,half*2); ctx.fillRect(7,-half,3,half*2);

    // gantry
    ctx.fillStyle='rgba(8,14,30,.95)'; ctx.strokeStyle='rgba(120,220,255,.8)'; ctx.lineWidth=2;
    ctx.shadowColor='#22e6ff'; ctx.shadowBlur=glow*.7;
    ctx.fillRect(-14,-half-26,10,26); ctx.strokeRect(-14,-half-26,10,26);
    ctx.fillRect(4,half+16,10,26); ctx.strokeRect(4,half+16,10,26);
    ctx.fillRect(-14,-half-32,46,9); ctx.strokeRect(-14,-half-32,46,9);
    ctx.shadowBlur=0;
    ctx.fillStyle='#bff4ff'; ctx.font='bold 8px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('START / FINISH',9,-half-27);
    const pulse=.5+Math.sin(time*.004)*.3;
    ctx.fillStyle=`rgba(55,245,165,${pulse})`;
    ctx.beginPath(); ctx.arc(-9,-half-27,2.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  drawCrystal(ctx,spot,time,collected){
    if(collected) return;
    const pulse=1+Math.sin(time*.004+spot.x)*.15;
    ctx.save();
    ctx.translate(spot.x,spot.y); ctx.rotate(time*.0015); ctx.scale(pulse,pulse);
    ctx.shadowColor='#37f5a5'; ctx.shadowBlur=18;
    ctx.fillStyle='rgba(55,245,165,.85)'; ctx.strokeStyle='#eafff6'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(11,0); ctx.lineTo(0,14); ctx.lineTo(-11,0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  drawObstacle(ctx,spot,time){
    const pulse=1+Math.sin(time*.005+spot.x)*.12;
    ctx.save();
    ctx.translate(spot.x,spot.y); ctx.rotate(time*.001); ctx.scale(pulse,pulse);
    ctx.shadowColor='#ff5470'; ctx.shadowBlur=22;
    ctx.strokeStyle='#ff5470'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,17,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fillStyle='rgba(255,84,112,.6)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-24,0); ctx.lineTo(24,0); ctx.moveTo(0,-24); ctx.lineTo(0,24); ctx.stroke();
    ctx.restore();
  }
}

function hexA(hex,a){
  const c=String(hex).replace('#','');
  const n=parseInt(c.length===3?c.split('').map(x=>x+x).join(''):c,16)||0;
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
