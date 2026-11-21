(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const startPanel = document.getElementById('startPanel');
  const overPanel = document.getElementById('gameOverPanel');
  const pausePanel = document.getElementById('pausePanel');
  const finalScore = document.getElementById('finalScore');
  const flash = document.getElementById('flash');

  let W = 0, H = 0, dpr = 1, best = +localStorage.getItem('voidShiftBest') || 0;
  let state = 'menu', score = 0, elapsed = 0, spawnTimer = 0, shake = 0;
  let keys = {}, enemies = [], particles = [], stars = [];
  const player = { x:0, y:0, r:9, px:0, py:0, trail:[] };
  bestEl.textContent = pad(best);

  function pad(n){ return String(Math.floor(n)).padStart(5,'0'); }
  function resize(){
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W*dpr; canvas.height = H*dpr;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (!player.x){ player.x=W/2; player.y=H*.68; }
    stars = Array.from({length:Math.min(110,Math.floor(W*H/9000))},()=>({x:Math.random()*W,y:Math.random()*H,z:Math.random(),a:Math.random()*0.7+0.15}));
  }
  addEventListener('resize', resize); resize();

  function reset(){
    score=0; elapsed=0; spawnTimer=.5; shake=0; enemies=[]; particles=[]; player.trail=[];
    player.x=W/2; player.y=H*.68; player.px=player.x; player.py=player.y;
    scoreEl.textContent='00000';
  }
  function start(){ reset(); state='playing'; startPanel.classList.add('hidden'); overPanel.classList.add('hidden'); pausePanel.classList.add('hidden'); }
  document.getElementById('startBtn').onclick=start;
  document.getElementById('restartBtn').onclick=start;
  document.getElementById('resumeBtn').onclick=()=>{ state='playing'; pausePanel.classList.add('hidden'); };
  document.getElementById('pauseBtn').onclick=()=>{ if(state==='playing'){state='paused';pausePanel.classList.remove('hidden')} else if(state==='paused'){state='playing';pausePanel.classList.add('hidden')} };

  addEventListener('keydown',e=>{ keys[e.key.toLowerCase()] = true; if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventPrevent; if(e.key==='Escape'||e.key.toLowerCase()==='p')document.getElementById('pauseBtn').click(); if((e.key==='Enter'||e.key===' ')&&state==='menu')start(); if((e.key==='Enter'||e.key===' ')&&state==='over')start(); });
  addEventListener('keyup',e=>{ keys[e.key.toLowerCase()] = false; });

  let pointerDown=false;
  canvas.addEventListener('pointerdown',e=>{pointerDown=true;movePointer(e)});
  canvas.addEventListener('pointermove',e=>{if(pointerDown)movePointer(e)});
  addEventListener('pointerup',()=>pointerDown=false);
  function movePointer(e){ if(state==='playing'){ const r=canvas.getBoundingClientRect(); player.x=e.clientX-r.left; player.y=e.clientY-r.top; } }

  function spawn(){
    const side=Math.floor(Math.random()*4), pad=25;
    let x,y,vx,vy;
    if(side===0){x=Math.random()*W;y=-pad;vx=(Math.random()-.5)*60;vy=170+elapsed*3}
    else if(side===1){x=W+pad;y=Math.random()*H*.75;vx=-180-elapsed*3;vy=(Math.random()-.5)*70}
    else if(side===2){x=Math.random()*W;y=H+pad;vx=(Math.random()-.5)*60;vy=-170-elapsed*3}
    else{x=-pad;y=Math.random()*H*.75;vx=180+elapsed*3;vy=(Math.random()-.5)*70}
    const size=7+Math.random()*9;
    enemies.push({x,y,vx,vy,r:size,spin:Math.random()*6,vr:(Math.random()<.5?-1:1)*(1+Math.random()*2)});
  }
  function burst(x,y,color,count=12){ for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=Math.random()*180+40;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,size:Math.random()*2+1,color});} }
  function die(){
    state='over'; shake=18; burst(player.x,player.y,'#ff496c',38); flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit');
    if(score>best){best=Math.floor(score);localStorage.setItem('voidShiftBest',best)}
    bestEl.textContent=pad(best); finalScore.textContent='SCORE '+pad(score); setTimeout(()=>overPanel.classList.remove('hidden'),350);
  }

  let last=performance.now();
  function update(dt){
    elapsed+=dt; score+=dt*(10+elapsed*.35); scoreEl.textContent=pad(score);
    stars.forEach(s=>{ s.y+=dt*(12+s.z*30); if(s.y>H)s.y=-3; });
    if(state==='playing'){
      const speed=300;
      if(keys.w||keys.arrowup)player.y-=speed*dt;
      if(keys.s||keys.arrowdown)player.y+=speed*dt;
      if(keys.a||keys.arrowleft)player.x-=speed*dt;
      if(keys.d||keys.arrowright)player.x+=speed*dt;
      player.x=Math.max(18,Math.min(W-18,player.x)); player.y=Math.max(84,Math.min(H-18,player.y));
      player.trail.push({x:player.x,y:player.y,life:1}); if(player.trail.length>16)player.trail.shift();
      spawnTimer-=dt;
      if(spawnTimer<=0){spawn();spawnTimer=Math.max(.18,.72-elapsed*.012)*(0.75+Math.random()*0.5)}
      enemies.forEach(e=>{e.x+=e.vx*dt;e.y+=e.vy*dt;e.spin+=e.vr*dt;if(Math.hypot(e.x-player.x,e.y-player.y)<e.r+player.r)die()});
      enemies=enemies.filter(e=>e.x>-80&&e.x<W+80&&e.y>-80&&e.y<H+80);
    }
    if(state==='over') enemies.forEach(e=>{e.x+=e.vx*dt*.35;e.y+=e.vy*dt*.35});
    player.trail.forEach(t=>t.life-=dt*2.8); player.trail=player.trail.filter(t=>t.life>0);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;p.life-=dt*1.8});particles=particles.filter(p=>p.life>0);
    shake*=.86;
  }

  function draw(){
    ctx.save();
    if(shake>0)ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
    ctx.fillStyle='#05080d';ctx.fillRect(-20,-20,W+40,H+40);
    ctx.strokeStyle='rgba(105,229,255,.035)';ctx.lineWidth=1;
    const grid=48, ox=(elapsed*8)%grid, oy=(elapsed*18)%grid;
    ctx.beginPath(); for(let x=-grid+ox;x<W;x+=grid){ctx.moveTo(x,0);ctx.lineTo(x,H)} for(let y=-grid+oy;y<H;y+=grid){ctx.moveTo(0,y);ctx.lineTo(W,y)}ctx.stroke();
    stars.forEach(s=>{ctx.globalAlpha=s.a;ctx.fillStyle=s.z>.7?'#69e5ff':'#73909e';ctx.fillRect(s.x,s.y,s.z>.8?1.5:1,s.z>.8?1.5:1)});ctx.globalAlpha=1;

    player.trail.forEach((t,i)=>{ctx.globalAlpha=t.life*.18*(i/player.trail.length);ctx.fillStyle='#69e5ff';ctx.beginPath();ctx.arc(t.x,t.y,player.r*(.35+t.life*.5),0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;

    enemies.forEach(e=>{
      ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.spin);
      ctx.shadowBlur=18;ctx.shadowColor='#ff496c';ctx.fillStyle='#a91638';ctx.strokeStyle='#ff496c';ctx.lineWidth=2;
      ctx.beginPath(); for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?e.r*.58:e.r;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    });

    if(state!=='over'||particles.length){
      ctx.save();ctx.translate(player.x,player.y);ctx.rotate(elapsed*1.4);ctx.shadowBlur=22;ctx.shadowColor='#69e5ff';ctx.strokeStyle='#69e5ff';ctx.fillStyle='rgba(105,229,255,.12)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(player.r,0);ctx.lineTo(-player.r*.7,-player.r*.7);ctx.lineTo(-player.r*.4,0);ctx.lineTo(-player.r*.7,player.r*.7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      ctx.fillStyle='#eaffff';ctx.beginPath();ctx.arc(player.x,player.y,2.2,0,Math.PI*2);ctx.fill();
    }
    particles.forEach(p=>{ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)});ctx.globalAlpha=1;
    ctx.restore();
  }
  function loop(now){const dt=Math.min((now-last)/1000,.035);last=now;update(dt);draw();requestAnimationFrame(loop)}
  requestAnimationFrame(loop);
})();
