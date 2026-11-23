/* ================= EFFECTS: particles, speed lines, screen shake ================= */

export class Effects{
  constructor(){ this.particles=[]; this.shake=0; }

  emit(type,x,y,angle=0,color='#22e6ff'){
    if(type==='boost'){
      for(let i=0;i<3;i++){
        this.particles.push({x,y,vx:-Math.cos(angle)*(70+Math.random()*90)+(Math.random()-.5)*30,
          vy:-Math.sin(angle)*(70+Math.random()*90)+(Math.random()-.5)*30,
          life:.28+Math.random()*.22,max:.5,color:i===0?'#fff3a0':color,size:3+Math.random()*4});
      }
    }else if(type==='spark'){
      for(let i=0;i<9;i++){
        const a=Math.random()*Math.PI*2, sp=40+Math.random()*120;
        this.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
          life:.2+Math.random()*.3,max:.5,color:'#ffb347',size:2+Math.random()*3});
      }
    }else if(type==='crystal'){
      for(let i=0;i<14;i++){
        const a=Math.random()*Math.PI*2, sp=50+Math.random()*140;
        this.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
          life:.3+Math.random()*.35,max:.65,color:'#37f5a5',size:2+Math.random()*4});
      }
    }else if(type==='finish'){
      for(let i=0;i<50;i++){
        const a=Math.random()*Math.PI*2, sp=80+Math.random()*260;
        this.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
          life:.5+Math.random()*.7,max:1.2,color:i%2?'#22e6ff':'#a45cff',size:3+Math.random()*5});
      }
    }
  }

  addShake(amount){ this.shake=Math.min(22,this.shake+amount); }

  update(dt){
    this.particles.forEach(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=.97; p.vy*=.97; p.life-=dt; });
    this.particles=this.particles.filter(p=>p.life>0);
    this.shake=Math.max(0,this.shake-dt*36);
  }

  getShakeOffset(){
    return {x:(Math.random()-.5)*this.shake,y:(Math.random()-.5)*this.shake};
  }

  draw(ctx){
    ctx.save();
    this.particles.forEach(p=>{
      ctx.globalAlpha=Math.max(0,p.life/p.max);
      ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  drawSpeedLines(ctx,view,speedRatio,time,quality){
    if(quality==='low'||speedRatio<.65) return;
    const strength=(speedRatio-.65)/.35;
    const count=quality==='medium'?14:26;
    ctx.save();
    ctx.globalAlpha=.16*strength;
    ctx.strokeStyle='#9fe9ff'; ctx.lineWidth=1.5;
    for(let i=0;i<count;i++){
      const seed=(i*97.13)%1;
      const y=((seed*view.h)+time*.35*(1+seed))%view.h;
      const len=60+seed*160*strength;
      const x=(i%2?0:view.w)+((i*53)%200);
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+(i%2?len:-len),y-8*strength); ctx.stroke();
    }
    ctx.restore();
  }
}
