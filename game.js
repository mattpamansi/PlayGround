const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
let W,H,scale=1,last=0,mode='menu',level=0,paused=false,dialog=null,buildOpen=false;
const keys={};
const mats={madeira:0,pedra:0,metal:0,corda:0,engrenagem:0};
const SAVE='abdias-save-v1';let save=JSON.parse(localStorage.getItem(SAVE)||'{}');save.unlocked=save.unlocked||1;save.done=save.done||[];
const names=['O Começo de Tudo','A Floresta das Engrenagens','A Vila dos Inventores','O Primeiro Ataque','O Vale das Máquinas','A Fortaleza de Fadson','A Grande Construção','O Confronto Final'];
const themes=[['#74b9cf','#f0a24b','#4f8d62'],['#4b8c74','#9ab86b','#315c52'],['#d78a58','#f1bd69','#6c6a64'],['#7186a4','#b75d53','#4a4f63'],['#56849a','#d3a35b','#68715a'],['#5c5a78','#b05b50','#34344d'],['#7c9d91','#e3b35a','#4d6c62'],['#4d6682','#dc714f','#24273e']];
const player={x:70,y:0,vx:0,vy:0,w:34,h:54,on:false,face:1,anim:0};
let world,entities,particles=[],camera=0,goal=false,check={x:70,y:0},fadsonTimer=0;
function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight;scale=Math.min(W/1100,H/650)}addEventListener('resize',resize);resize();
function ground(y){return {x:-100,y,w:2200,h:800,type:'ground'}}
function makeWorld(n){
 const gap=n>=1?[780,980]:[];const groundRects=[{x:-100,y:560,w:2200,h:140,type:'ground'}];
 if(n===0){} else if(n===1){groundRects.splice(0,1,{x:-100,y:560,w:620,h:140,type:'ground'},{x:980,y:560,w:1220,h:140,type:'ground'})}
 else if(n===2){groundRects[0].w=2200}
 else if(n===3){groundRects.splice(0,1,{x:-100,y:560,w:520,h:140,type:'ground'},{x:760,y:560,w:1440,h:140,type:'ground'})}
 else if(n===4){groundRects.splice(0,1,{x:-100,y:560,w:700,h:140,type:'ground'},{x:900,y:560,w:1300,h:140,type:'ground'})}
 else if(n===5){groundRects.splice(0,1,{x:-100,y:560,w:420,h:140,type:'ground'},{x:650,y:560,w:1550,h:140,type:'ground'})}
 else if(n===6){groundRects[0].w=2200}
 else groundRects[0].w=2200;
 world={grounds:groundRects,platforms:[],gates:[{x:2050,y:410,w:55,h:150,open:false}],resources:[],buildings:[],n};
 for(let i=0;i<5;i++){world.resources.push({x:280+i*210+(n%3)*35,y:500-(i%2)*70,t:['madeira','pedra','metal','corda','engrenagem'][i%5],got:false})}
 if(n>=2) world.platforms.push({x:1100,y:420,w:150,h:22,type:'plat'});
 if(n>=4) world.platforms.push({x:1450,y:350,w:170,h:22,type:'plat'});
 if(n>=6) world.resources.push({x:1750,y:500,t:'engrenagem',got:false});
 player.x=70;player.y=410;player.vx=0;player.vy=0;camera=0;goal=false;check={x:70,y:410};particles=[];
 updateHUD();
}
function startLevel(n){level=n;makeWorld(n);mode='game';document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));document.getElementById('hud').classList.remove('hidden');document.getElementById('bottomHud').classList.remove('hidden');document.getElementById('pause').classList.add('hidden');showBanner(n);narration(n)}
function showBanner(n){const b=document.getElementById('banner');b.innerHTML=`<small>FASE ${n+1}</small><br><b>${names[n]}</b>`;b.classList.remove('hidden');setTimeout(()=>b.classList.add('hidden'),4000)}
function narration(n){const lines=[['Abdias','Fanel','Abdias'],['Helena','Abdias','Helena'],['Fanel','Joel','Jorge'],['Fadson','Abdias','Fadson'],['Jorge','Abdias','Jorge'],['Fadson','Abdias','Helena'],['Abdias','Fanel','Helena'],['Fadson','Abdias','Fadson']];
 if(n<4){const seq=[['Abdias','Todo sonho começa com uma ideia. E eu trouxe corda, madeira e coragem!'],['Helena','Observe primeiro: cada mecanismo tem um ponto certo para trabalhar.'],['Fanel','Vila dos Inventores pronta para receber o construtor mais alto da região. Joel já perdeu três martelos.'],['Fadson','Abdias... dormir é um direito humano. Construir é uma afronta pessoal.']][n];openDialog(seq)}
 if(n===2) openDialog(['Jorge','Há algo no passado de Fadson que ninguém contou...']);if(n===6)openDialog(['Abdias','Quero construir uma máquina para mostrar que unir peças pode unir pessoas.']);if(n===7)openDialog(['Fadson','Prepare-se. Desta vez vou derrubar não só sua construção, mas a promessa inteira.']);}
function openDialog(pair){dialog={name:pair[0],text:pair[1],index:0};document.getElementById('dialogue').classList.remove('hidden');document.getElementById('dialogueText').innerHTML=`<strong>${dialog.name}:</strong> ${dialog.text}`}
function closeDialog(){document.getElementById('dialogue').classList.add('hidden');dialog=null}
document.getElementById('nextDialog').onclick=closeDialog;
function updateHUD(){document.getElementById('levelName').textContent=`${level+1}. ${names[level]}`;document.getElementById('objective').textContent=level===7?'Derrote Fadson e alcance o portão':'Leve os materiais ao portão azul';const el=document.getElementById('materials');el.innerHTML=Object.entries(mats).map(([k,v])=>`<span class="mat">${k==='madeira'?'▥':k==='pedra'?'◆':k==='metal'?'⬟':k==='corda'?'⌁':'⚙'} ${v}</span>`).join('')}
function drawCloud(x,y,s){ctx.fillStyle='rgba(255,245,220,.45)';ctx.beginPath();ctx.arc(x,y,18*s,0,7);ctx.arc(x+24*s,y-8*s,25*s,0,7);ctx.arc(x+50*s,y,18*s,0,7);ctx.fill()}
function rect(x,y,w,h,c,r=0){ctx.fillStyle=c;if(r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}else ctx.fillRect(x,y,w,h)}
function draw(){let th=themes[level]||themes[0];ctx.fillStyle=th[0];ctx.fillRect(0,0,W,H);ctx.fillStyle=th[1];ctx.fillRect(0,H*.58,W,H*.42);
 for(let i=-1;i<5;i++){drawCloud(((i*310-camera*.12)%1550+1550)%1550,100+(i%3)*55,1)}
 ctx.save();ctx.translate(-camera,0);ctx.fillStyle='rgba(20,30,45,.12)';for(let i=0;i<6;i++)ctx.fillRect(300+i*330,180,160,380);
 world.grounds.forEach(g=>{rect(g.x,g.y,g.w,g.h,'#4c6d55');rect(g.x,g.y,g.w,14,'#78ad64');for(let x=g.x;x<g.x+g.w;x+=38)rect(x,g.y+14,18,8,'#355844')});
 world.platforms.forEach(p=>{rect(p.x,p.y,p.w,p.h,'#8a5a32',8);for(let x=p.x;x<p.x+p.w;x+=28)rect(x+5,p.y+5,18,5,'#d6a264')});
 world.resources.forEach(r=>{if(r.got)return;const c={madeira:'#d69a50',pedra:'#9aabb1',metal:'#cbd1d0',corda:'#dfb85b',engrenagem:'#e7c45c'}[r.t];ctx.save();ctx.translate(r.x,r.y);ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,14,0,7);ctx.fill();ctx.fillStyle='#fff4bd';ctx.fillText(r.t[0].toUpperCase(),-5,5);ctx.restore()});
 world.buildings.forEach(b=>{rect(b.x,b.y,b.w,b.h,b.type==='bridge'?'#bc7a45':'#70a0a0',6)});world.gates.forEach(g=>{rect(g.x,g.y,g.w,g.h,g.open?'#55bdb3':'#5c668c',8);ctx.fillStyle='#bde3d8';ctx.fillText(g.open?'ABERTO':'PORTÃO',g.x-5,g.y-12)});
 drawPlayer();drawFadson();particles.forEach(p=>{ctx.globalAlpha=p.life;rect(p.x,p.y,p.s,p.s,p.c);ctx.globalAlpha=1});ctx.restore();
}
function drawPlayer(){ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h/2);ctx.scale(player.face,1);ctx.fillStyle='#5b3328';ctx.beginPath();ctx.arc(0,-20,15,0,7);ctx.fill();ctx.fillStyle='#75c4d8';ctx.beginPath();ctx.arc(-5,-23,3,0,7);ctx.arc(5,-23,3,0,7);ctx.fill();ctx.fillStyle='#c77a3c';ctx.beginPath();ctx.moveTo(-14,-5);ctx.lineTo(14,-5);ctx.lineTo(18,18);ctx.lineTo(-18,18);ctx.fill();ctx.fillStyle='#e1a05a';ctx.fillRect(-20,2,40,8);ctx.fillStyle='#3f2d42';ctx.fillRect(-13,18,9,20);ctx.fillRect(4,18,9,20);ctx.fillStyle='#26313c';ctx.fillRect(-15,34,14,7);ctx.fillRect(3,34,14,7);ctx.restore()}
function drawFadson(){if(level<3)return;const x=1740-Math.sin(fadsonTimer)*25;ctx.save();ctx.translate(x,500);ctx.fillStyle='#3a2a24';ctx.beginPath();ctx.arc(0,-36,23,0,7);ctx.fill();ctx.fillStyle='#b55f68';ctx.fillRect(-24,-15,48,42);ctx.fillStyle='#e3aa79';ctx.beginPath();ctx.arc(-8,-39,3,0,7);ctx.arc(8,-39,3,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='16px Trebuchet MS';ctx.fillText('Zzz',-16,-68);ctx.restore()}
function update(dt){if(mode!=='game'||paused||dialog)return;const left=keys.ArrowLeft||keys.a,right=keys.ArrowRight||keys.d;const speed=keys.ShiftLeft||keys.ShiftRight?330:220;if(left){player.vx-=1700*dt;player.face=-1}if(right){player.vx+=1700*dt;player.face=1}if(!left&&!right)player.vx*=Math.pow(.002,dt);player.vx=Math.max(-speed,Math.min(speed,player.vx));player.vy+=1100*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;player.on=false;
 world.grounds.forEach(g=>{if(player.x+player.w>g.x&&player.x<g.x+g.w&&player.y+player.h>g.y&&player.y+player.h<g.y+70&&player.vy>=0){player.y=g.y-player.h;player.vy=0;player.on=true}});
 world.platforms.concat(world.buildings.filter(b=>b.solid)).forEach(p=>{if(player.x+player.w>p.x&&player.x<p.x+p.w&&player.y+player.h>p.y&&player.y+player.h<p.y+28&&player.vy>=0){player.y=p.y-player.h;player.vy=0;player.on=true}});
 if(player.y>720){player.x=check.x;player.y=check.y;player.vx=0;player.vy=0}
 world.resources.forEach(r=>{if(!r.got&&Math.abs(player.x-r.x)<35&&Math.abs(player.y+27-r.y)<55){r.got=true;mats[r.t]=(mats[r.t]||0)+1;updateHUD();burst(r.x,r.y,'#f3ca70')}});
 camera+=(player.x-W*.38-camera)*Math.min(1,dt*4);camera=Math.max(0,Math.min(1500,W<800?900:1500));
 world.gates.forEach(g=>{if(g.open&&player.x>g.x-30){completeLevel()}});fadsonTimer+=dt;
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt*.8});particles=particles.filter(p=>p.life>0);
}
function burst(x,y,c){for(let i=0;i<14;i++)particles.push({x,y,vx:(Math.random()-.5)*220,vy:-Math.random()*180,s:3+Math.random()*6,c,life:1})}
function jump(){if(mode==='game'&&!paused&&!dialog&&player.on){player.vy=-520;player.on=false}}
addEventListener('keydown',e=>{keys[e.key.toLower?e.key.toLower():e.key]=true;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.prevent.prevent?e.prevent.preventDefault():e.preventDefault&&e.preventDefault();if(e.key===' '||e.key==='ArrowUp'||e.key==='w')jump();if(e.key==='e')toggleBuild();if(e.key==='Escape')togglePause()});
addEventListener('keyup',e=>{keys[e.key.toLower?e.key.toLower():e.key]=false});
function togglePause(){if(mode!=='game')return;paused=!paused;document.getElementById('pause').classList.toggle('hidden',!paused)}
document.getElementById('resume').onclick=togglePause;document.getElementById('restart').onclick=()=>startLevel(level);document.getElementById('menu').onclick=()=>{mode='menu';paused=false;document.getElementById('pause').classList.add('hidden');document.getElementById('hud').classList.add('hidden');document.getElementById('bottomHud').classList.add('hidden');document.getElementById('mainMenu').classList.remove('hidden')};
function toggleBuild(){if(mode!=='game'||dialog)return;buildOpen=!buildOpen;const menu=document.getElementById('buildMenu');menu.classList.toggle('hidden',!buildOpen);const defs=[['Plataforma', 'madeira',5,120],['Ponte','madeira',8,180],['Escada','madeira',4,110],['Elevador','metal',6,160],['Catapulta','engrenagem',3,150],['Engrenagem','engrenagem',2,100]];const unlocked=['Plataforma','Ponte','Escada','Elevador','Catapulta','Engrenagem'].slice(0,2+Math.floor(level/1.2));menu.innerHTML=unlocked.map((name,i)=>{const d=defs.find(v=>v[0]===name);const en=mats[d[1]]>=d[2];return `<button class="build-card ${en?'':'off'}" data-i="${i}" data-name="${name}"><span>${name}<br><small>${d[2]} ${d[1]}</small></span><b>＋</b></button>`}).join('')||'<small>Conduza as peças ao portão.</small>';menu.querySet=undefined}
 document.getElementById('buildBtn').onclick=toggleBuild;
document.getElementById('buildMenu').addEventListener('click',e=>{const b=e.target.closest('.build-card');if(!b)return;build(b.dataset.name)});
function build(name){const defs={Plataforma:['madeira',5,120,22],Ponte:['madeira',8,180,22],Escada:['madeira',4,70,180],Elevador:['metal',6,120,180],Catapulta:['engrenagem',3,140,45],Engrenagem:['engrenagem',2,100,100]};const d=defs[name];if(!d||mats[d[0]]<d[1])return;mats[d[0]]-=d[1];const x=Math.round(player.x+player.face*100);const y=name==='Escada'?player.y+10:name==='Elevador'?player.y-20:player.y+player.h-d[3];world.buildings.push({x,y,w:d[2],h:d[3],type:name==='Ponte'?'bridge':'plat',solid:true});burst(x,y,'#eaa45a');updateHUD();toggleBuild();}
function completeLevel(){if(goal)return;goal=true;save.done=Array.from(new Set([...(save.done||[]),level+1]));save.unlocked=Math.max(save.unlocked||1,Math.min(8,level+2));localStorage.setItem(SAVE,JSON.stringify(save));
 world.gates.forEach(g=>g.open=true);if(level===7) victory();else setTimeout(()=>{const box=document.getElementById('victory');box.classList.remove('hidden');document.getElementById('victoryBox').innerHTML=`<h2>Fase concluída!</h2><p>${names[level]} foi superada.</p><div class="menu-actions"><button class="primary" id="next">Próxima fase</button><button class="secondary" id="retry">Repetir fase</button></div>`;document.getElementById('next').onclick=()=>{box.classList.add('hidden');startLevel(level+1)};document.getElementById('retry').onclick=()=>{box.classList.add('hidden');startLevel(level)}},350)}
function victory(){const box=document.getElementById('victory');box.classList.remove('hidden');document.getElementById('victoryBox').innerHTML=`<h2>Você venceu a campanha</h2><p>Fadson revelou seu passado: uma oficina destruída havia feito dele um inimigo de tudo que se criava. Abdias mostrou que reconstruir é mais forte que destruir.</p><p>Nos créditos, uma nova engenhoca pisca no horizonte...</p><div class="menu-actions"><button class="primary" id="again">Jogar novamente</button><button class="secondary" id="main">Menu principal</button></div>`;document.getElementById('again').onclick=()=>{box.classList.add('hidden');startLevel(0)};document.getElementById('main').onclick=()=>{box.classList.add('hidden');mode='menu';document.getElementById('hud').classList.add('hidden');document.getElementById('bottomHud').classList.add('hidden');document.getElementById('mainMenu').classList.remove('hidden')}}
document.getElementById('start').onclick=()=>startLevel(Math.max(0,(save.unlocked||1)-1));
document.getElementById('levels').onclick=()=>{renderMap();document.getElementById('map').classList.remove('hidden')};document.getElementById('closeMap').onclick=()=>document.getElementById('map').classList.add('hidden');
function renderMap(){document.getElementById('levelGrid').innerHTML=names.map((n,i)=>`<button class="${save.done.includes(i+1)?'done':''} ${i+1<=save.unlocked?'':'lock'}" data-level="${i}">${i+1}<br><small>${n}</small></button>`).join('');document.querySelectorAll('.level-grid button').forEach(b=>b.onclick=()=>{const i=+b.dataset.level;if(i+1<=save.unlocked){document.getElementById('map').classList.add('hidden');startLevel(i)}})}
document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key,bind=(on)=>{e=>{}; if(k==='jump'&&on)jump();else if(k==='use'&&on)toggleBuild();else if(k==='build'&&on)toggleBuild();else keys[k==='left'?'ArrowLeft':k==='right'?'ArrowRight':k]=on};b.addEventListener('touchstart',e=>{e.preventDefault();bind(true)});b.addEventListener('touchend',e=>{e.preventDefault();bind(false)})});
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;if(mode==='game')update(dt);draw();requestAnimationFrame(loop)}makeWorld(0);requestAnimationFrame(loop);