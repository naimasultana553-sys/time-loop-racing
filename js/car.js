/* ================= CAR: detailed arcade racer rendering + physics ================= */

function rr(ctx,x,y,w,h,r){
  r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function poly(ctx,pts){
  ctx.beginPath();
  ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
  ctx.closePath();
}

function lighten(hex,amt){
  const c=hex.replace('#','');
  const n=parseInt(c.length===3?c.split('').map(x=>x+x).join(''):c,16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.min(255,Math.round(r+(255-r)*amt));
  g=Math.min(255,Math.round(g+(255-g)*amt));
  b=Math.min(255,Math.round(b+(255-b)*amt));
  return `rgb(${r},${g},${b})`;
}
function darken(hex,amt){
  const c=hex.replace('#','');
  const n=parseInt(c.length===3?c.split('').map(x=>x+x).join(''):c,16);
  return `rgb(${Math.round(((n>>16)&255)*amt)},${Math.round(((n>>8)&255)*amt)},${Math.round((n&255)*amt)})`;
}

export class Car{
  constructor(spec,colors,x,y,angle){
    this.spec=spec;
    this.colors=colors;
    this.x=x; this.y=y; this.angle=angle;
    this.speed=0;
    this.nitro=100;
    this.nitroActive=false;
    this.steer=0;
    this.radius=16;
  }

  update(dt,input,track){
    const s=this.spec;
    const wantsNitro=!!input.nitro&&this.nitro>0.5;
    this.nitroActive=wantsNitro;
    if(wantsNitro) this.nitro=Math.max(0,this.nitro-28*dt);
    else this.nitro=Math.min(100,this.nitro+s.nitroRegen*dt);

    const maxSpeed=s.maxSpeed*(wantsNitro?s.nitroPower:1);
    const accel=s.accel*(wantsNitro?1.65:1);

    if(input.accel) this.speed+=accel*dt;
    else if(input.brake){
      if(this.speed>0) this.speed-=accel*1.45*dt;
      else this.speed=Math.max(this.speed-accel*.5*dt,-s.maxSpeed*.35);
    }else{
      this.speed*=Math.pow(.35,dt);
      if(Math.abs(this.speed)<2) this.speed=0;
    }
    this.speed=Math.min(this.speed,maxSpeed);

    this.steer=(input.right?1:0)-(input.left?1:0);
    if(this.steer!==0){
      const grip=Math.min(1,Math.abs(this.speed)/(s.maxSpeed*.28));
      const dir=this.speed>=0?1:-1;
      this.angle+=this.steer*s.turnRate*grip*dir*dt*(wantsNitro?.88:1);
    }

    this.x+=Math.cos(this.angle)*this.speed*dt;
    this.y+=Math.sin(this.angle)*this.speed*dt;

    const clamped=track.clampToRoad(this.x,this.y,this.radius);
    let hit=false;
    if(clamped.hit){
      this.x=clamped.x; this.y=clamped.y;
      this.speed*=Math.pow(.12,dt);
      hit=true;
    }
    return hit;
  }
}

/* ---------------- detailed car drawing ---------------- */
export function drawCar(ctx,o){
  const {
    x,y,angle,body='#1e6cff',neon='#22e6ff',
    alpha=1,ghost=false,boost=false,brake=false,time=0,scale=1,steer=0
  }=o;

  ctx.save();
  ctx.translate(x,y); ctx.rotate(angle); ctx.scale(scale,scale);
  ctx.globalAlpha=alpha;

  /* ground shadow + underglow */
  if(!ghost){
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,.55)';
    ctx.filter='blur(7px)';
    ctx.beginPath(); ctx.ellipse(1,6,32,17,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
    const ug=ctx.createRadialGradient(0,0,4,0,0,34);
    ug.addColorStop(0,hexA(neon,.42)); ug.addColorStop(1,hexA(neon,0));
    ctx.fillStyle=ug;
    ctx.beginPath(); ctx.ellipse(0,2,34,20,0,0,Math.PI*2); ctx.fill();
  }

  /* wheels */
  const wheel=(wx,wy,front)=>{
    ctx.save(); ctx.translate(wx,wy);
    if(front) ctx.rotate(steer*.28);
    ctx.fillStyle='#05070c';
    rr(ctx,-10,-6,20,12,4); ctx.fill();
    ctx.strokeStyle=ghost?neon:'rgba(150,190,230,.35)'; ctx.lineWidth=1; ctx.stroke();
    if(!ghost){
      ctx.fillStyle='#151b2b';
      rr(ctx,-6,-4,12,8,3); ctx.fill();
      // tyre tread
      ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=1;
      for(let t=-7;t<=7;t+=4){
        ctx.beginPath(); ctx.moveTo(t,-6); ctx.lineTo(t,-4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(t,4); ctx.lineTo(t,6); ctx.stroke();
      }
      // brake caliper + rim
      ctx.strokeStyle=front?'rgba(255,90,120,.8)':'rgba(150,190,230,.5)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,5,front?-1.2:1.9,front?1.2:4.5); ctx.stroke();
      ctx.strokeStyle=neon; ctx.globalAlpha=alpha*.85; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.ellipse(0,0,4.5,3,0,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=alpha;
      ctx.fillStyle=neon; ctx.fillRect(-1,-1,2,2);
    }
    ctx.restore();
  };
  wheel(16,-14,true); wheel(16,14,true); wheel(-16,-14,false); wheel(-16,14,false);

  /* main body shell */
  const shell=[[30,0],[25,-8],[14,-12],[2,-13],[-14,-13],[-24,-10],[-27,-5],[-27,5],[-24,10],[-14,13],[2,13],[14,12],[25,8]];
  poly(ctx,shell);
  if(ghost){
    ctx.fillStyle='rgba(10,40,80,.22)';
    ctx.strokeStyle=neon; ctx.lineWidth=2.6;
    ctx.shadowColor=neon; ctx.shadowBlur=20; ctx.fill(); ctx.stroke();
    ctx.shadowBlur=0;
    // scanline detail
    ctx.save(); ctx.clip();
    ctx.globalAlpha=alpha*.35; ctx.strokeStyle=neon; ctx.lineWidth=1;
    for(let i=-24;i<28;i+=5){ ctx.beginPath(); ctx.moveTo(i,-14); ctx.lineTo(i,14); ctx.stroke(); }
    ctx.restore();
  }else{
    const g=ctx.createLinearGradient(-27,-13,30,13);
    g.addColorStop(0,darken(body,.42));
    g.addColorStop(.32,body);
    g.addColorStop(.55,lighten(body,.18));
    g.addColorStop(.78,darken(body,.55));
    g.addColorStop(1,'#070b16');
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle=neon; ctx.lineWidth=1.8;
    ctx.shadowColor=neon; ctx.shadowBlur=14; ctx.stroke(); ctx.shadowBlur=0;
  }

  if(!ghost){
    /* hood with air vents */
    poly(ctx,[[8,-10],[24,-7],[28,0],[24,7],[8,10]]);
    const hg=ctx.createLinearGradient(8,-10,28,10);
    hg.addColorStop(0,lighten(body,.28)); hg.addColorStop(.5,body); hg.addColorStop(1,darken(body,.5));
    ctx.fillStyle=hg; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.45)';
    rr(ctx,14,-5,8,2.4,1); ctx.fill();
    rr(ctx,14,2.6,8,2.4,1); ctx.fill();

    /* racing stripes */
    ctx.fillStyle=hexA(neon,.75);
    ctx.fillRect(-22,-2.2,44,1.8);
    ctx.fillRect(-22,.4,44,1.8);

    /* rear deck + diffuser */
    poly(ctx,[[-27,-8],[-14,-11],[-14,11],[-27,8]]);
    ctx.fillStyle='rgba(4,8,18,.55)'; ctx.fill();
    ctx.strokeStyle='rgba(160,200,255,.18)'; ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.7)';
    for(let i=-8;i<9;i+=5) ctx.fillRect(-25,i,4,2);

    /* carbon side skirts */
    ctx.fillStyle='rgba(6,10,20,.85)';
    rr(ctx,-20,-15,38,3,1); ctx.fill();
    rr(ctx,-20,12,38,3,1); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.08)';
    for(let i=-18;i<18;i+=6){
      ctx.beginPath(); ctx.moveTo(i,-15); ctx.lineTo(i+3,-12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i,12); ctx.lineTo(i+3,15); ctx.stroke();
    }

    /* mirrors */
    ctx.fillStyle=darken(body,.5);
    rr(ctx,4,-17,7,4,2); ctx.fill();
    rr(ctx,4,13,7,4,2); ctx.fill();
    ctx.fillStyle=neon;
    ctx.fillRect(5,-16,4,1.5); ctx.fillRect(5,14.5,4,1.5);
  }

  /* cockpit glass */
  poly(ctx,[[7,-7.5],[-8,-8],[-13,-5],[-13,5],[-8,8],[7,7.5]]);
  if(ghost){
    ctx.fillStyle='rgba(120,220,255,.16)';
    ctx.strokeStyle=neon; ctx.lineWidth=1.6; ctx.fill(); ctx.stroke();
  }else{
    const wg=ctx.createLinearGradient(-10,-8,7,8);
    wg.addColorStop(0,'rgba(180,240,255,.85)');
    wg.addColorStop(.35,'rgba(40,110,180,.85)');
    wg.addColorStop(1,'rgba(6,18,40,.95)');
    ctx.fillStyle=wg; ctx.fill();
    ctx.strokeStyle='rgba(190,245,255,.85)'; ctx.lineWidth=1.4; ctx.stroke();
    // glass reflection
    ctx.save(); ctx.clip();
    ctx.fillStyle='rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.moveTo(-12,-8); ctx.lineTo(-2,-8); ctx.lineTo(-9,8); ctx.lineTo(-13,8); ctx.closePath(); ctx.fill();
    ctx.restore();
    // roof air intake
    ctx.fillStyle='rgba(3,8,18,.8)'; rr(ctx,-4,-3,7,6,2); ctx.fill();
    ctx.strokeStyle='rgba(150,210,255,.35)'; ctx.lineWidth=1; ctx.stroke();
  }

  if(!ghost){
    /* wipers */
    ctx.strokeStyle='rgba(5,12,24,.85)'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(4,-6); ctx.lineTo(-5,-3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4,6); ctx.lineTo(-5,3); ctx.stroke();

    /* panel gaps / door shut lines */
    ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(6,-11); ctx.lineTo(6,-8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6,8); ctx.lineTo(6,11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12,-11); ctx.lineTo(-12,11); ctx.stroke();

    /* antenna + number plate */
    ctx.strokeStyle='rgba(200,225,255,.6)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-9,-5); ctx.lineTo(-16,-9); ctx.stroke();
    ctx.fillStyle='rgba(230,240,255,.85)'; rr(ctx,-25,-3.5,4,7,1); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(-24.5,-2,3,1); ctx.fillRect(-24.5,1,3,1);

    /* front splitter + rear wing */
    poly(ctx,[[29,-9],[33,-7],[33,7],[29,9]]);
    ctx.fillStyle='rgba(6,10,20,.9)'; ctx.fill();
    ctx.strokeStyle=hexA(neon,.7); ctx.lineWidth=1.2; ctx.stroke();
    ctx.fillStyle='rgba(10,16,30,.95)';
    rr(ctx,-31,-17,5,34,2); ctx.fill();
    ctx.strokeStyle=hexA(neon,.8); ctx.lineWidth=1.3; ctx.stroke();
    ctx.fillStyle='rgba(20,30,50,.9)';
    ctx.fillRect(-28,-14,3,4); ctx.fillRect(-28,10,3,4);
  }

  /* lights */
  if(ghost){
    ctx.fillStyle=neon; ctx.shadowColor=neon; ctx.shadowBlur=14;
    ctx.fillRect(27,-8,4,5); ctx.fillRect(27,3,4,5);
    ctx.fillRect(-29,-7,3,4); ctx.fillRect(-29,3,3,4);
    ctx.shadowBlur=0;
  }else{
    ctx.save();
    ctx.shadowColor='#d8fbff'; ctx.shadowBlur=16;
    const hl=ctx.createLinearGradient(26,0,31,0);
    hl.addColorStop(0,'#ffffff'); hl.addColorStop(1,'#9fe9ff');
    ctx.fillStyle=hl;
    poly(ctx,[[25,-9],[30,-7],[30,-3],[25,-4]]); ctx.fill();
    poly(ctx,[[25,9],[30,7],[30,3],[25,4]]); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.shadowColor=brake?'#ff2d55':'#ff5f7a'; ctx.shadowBlur=brake?22:12;
    ctx.fillStyle=brake?'#ff2d55':'#d63b5f';
    rr(ctx,-29,-8,4,5,1); ctx.fill();
    rr(ctx,-29,3,4,5,1); ctx.fill();
    ctx.restore();
    // exhausts
    ctx.fillStyle='#202838';
    ctx.beginPath(); ctx.arc(-27,-3,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-27,3,2,0,Math.PI*2); ctx.fill();
  }

  /* nitro flame */
  if(boost){
    const flick=1+Math.sin(time*.06)*.28;
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const fg=ctx.createLinearGradient(-27,0,-58*flick,0);
    fg.addColorStop(0,'rgba(255,255,230,.95)');
    fg.addColorStop(.25,'rgba(120,220,255,.9)');
    fg.addColorStop(.6,'rgba(164,92,255,.65)');
    fg.addColorStop(1,'rgba(255,79,216,0)');
    ctx.fillStyle=fg; ctx.shadowColor='#8ceaff'; ctx.shadowBlur=24;
    [-4,0,4].forEach((oy,i)=>{
      poly(ctx,[[-27,oy-3],[-58*flick*(1-i*.12),oy],[-27,oy+3]]); ctx.fill();
    });
    ctx.restore();
  }

  ctx.restore();
}

/* headlight beams drawn in world space before the car */
export function drawHeadlights(ctx,car,time){
  const a=car.angle;
  ctx.save();
  ctx.translate(car.x,car.y); ctx.rotate(a);
  ctx.globalCompositeOperation='lighter';
  const flick=.94+Math.sin(time*.01)*.06;
  [-1,1].forEach(side=>{
    const x=28, y=side*6;
    const grad=ctx.createLinearGradient(x,y,x+230*flick,y+side*70);
    grad.addColorStop(0,'rgba(190,240,255,.20)');
    grad.addColorStop(.45,'rgba(120,200,255,.09)');
    grad.addColorStop(1,'rgba(80,160,255,0)');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(x,y-4);
    ctx.lineTo(x+230*flick,y+side*70);
    ctx.lineTo(x+230*flick,y+side*96);
    ctx.lineTo(x,y+4);
    ctx.closePath(); ctx.fill();
  });
  ctx.restore();
}

function hexA(hex,a){
  const c=hex.replace('#','');
  const n=parseInt(c.length===3?c.split('').map(x=>x+x).join(''):c,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
