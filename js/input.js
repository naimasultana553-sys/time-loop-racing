/* ================= INPUT: keyboard + touch mapping ================= */

export const input = { accel:false, brake:false, left:false, right:false, nitro:false };

const KEYMAP = {
  ArrowUp:'accel', KeyW:'accel',
  ArrowDown:'brake', KeyS:'brake',
  ArrowLeft:'left', KeyA:'left',
  ArrowRight:'right', KeyD:'right',
  Space:'nitro'
};

let handlers = {};

export function initInput(h={}){
  handlers=h;
  if(window.matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints>0){
    document.body.classList.add('touch');
  }
  window.addEventListener('keydown',e=>{
    const mapped=KEYMAP[e.code];
    if(mapped){ input[mapped]=true; e.preventDefault(); return; }
    if(e.code==='Escape'){ e.preventDefault(); handlers.onPause?.(); }
    if(e.code==='KeyR'){ e.preventDefault(); handlers.onRestart?.(); }
  });
  window.addEventListener('keyup',e=>{
    const mapped=KEYMAP[e.code];
    if(mapped){ input[mapped]=false; e.preventDefault(); }
  });
  window.addEventListener('blur',clearInput);

  document.querySelectorAll('#touchControls button[data-key]').forEach(btn=>{
    const key=btn.dataset.key;
    const down=e=>{
      e.preventDefault();
      input[key]=true;
      try{ btn.setPointerCapture(e.pointerId); }catch(_){}
    };
    const up=e=>{ e.preventDefault(); input[key]=false; };
    btn.addEventListener('pointerdown',down);
    btn.addEventListener('pointerup',up);
    btn.addEventListener('pointercancel',up);
    btn.addEventListener('lostpointercapture',up);
    btn.addEventListener('contextmenu',e=>e.preventDefault());
  });

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ clearInput(); handlers.onHidden?.(); }
  });
  window.addEventListener('orientationchange',()=>{ clearInput(); handlers.onRotate?.(); });
}

export function clearInput(){
  input.accel=input.brake=input.left=input.right=input.nitro=false;
}
