const $=id=>document.getElementById(id);
const palette={I:'#fff0cd',J:'#adb69c',L:'#f19749',O:'#ffcf57',S:'#b6d47d',T:'#eea7a1',Z:'#f16e5b'};
const board=$('board').getContext('2d'),tile=32;
let game=null,mode='classic',audio=null,last=0,skyTime=0,fx=[],flashes=[],messageTime=0,keys=new Map();
const memory={};
function read(key,fallback){try{return localStorage.getItem('gb.'+key)??memory[key]??fallback}catch{return memory[key]??fallback}}
function save(key,value){memory[key]=String(value);try{localStorage.setItem('gb.'+key,value)}catch{}}
let sound=read('sound','on')==='on',best=Number(read(mode,0))||0;
function unlock(){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{})}catch{}}
function tone(event){if(!audio||!sound)return;const notes={move:[260,.035],rotate:[490,.07],lock:[145,.09],clear:[660,.2],pulse:[290,.32],over:[104,.4],hold:[360,.1],start:[523,.13]}[event];if(!notes)return;
 const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;osc.type='sine';osc.frequency.setValueAtTime(notes[0],t);osc.frequency.exponentialRampToValueAtTime(notes[0]*(event==='clear'?2:.73),t+notes[1]);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.045,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+notes[1]);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(t+notes[1]+.01)}
function block(c,x,y,size,type,ghost=false){const color=palette[type];x+=1;y+=1;size-=2;c.save();c.strokeStyle=color;
 if(ghost){c.globalAlpha=.48;c.setLineDash([4,3]);c.strokeRect(x+2,y+2,size-4,size-4);c.restore();return}
 c.fillStyle=color;c.fillRect(x,y,size,size);c.fillStyle='#59372366';c.fillRect(x+2,y+3,size-4,size-5);c.fillStyle=color;c.fillRect(x+4,y+4,size-8,size-9);
 c.fillStyle='#ffffff88';c.fillRect(x+2,y+1,size-4,2);c.fillStyle='#ffffff33';c.fillRect(x+2,y+3,2,size-6);c.fillStyle='#ffffff30';c.beginPath();c.moveTo(x+4,y+4);c.lineTo(x+size-4,y+4);c.lineTo(x+4,y+size*.68);c.fill();c.fillStyle='#56301d36';c.fillRect(x+3,y+size-5,size-6,3);c.restore()}
function piece(c,type,r,x,y,size,ghost=false){cells(type,r).forEach(([a,b])=>block(c,x+a*size,y+b*size,size,type,ghost))}
function preview(id,type){const canvas=$(id),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
 if(!type){c.strokeStyle='#a18166';c.setLineDash([3,4]);c.strokeRect(w/2-20,h/2-11,40,22);c.setLineDash([]);return}
 const list=cells(type),xs=list.map(v=>v[0]),ys=list.map(v=>v[1]),s=23;
 piece(c,type,0,(w-(Math.max(...xs)+Math.min(...xs)+1)*s)/2,(h-(Math.max(...ys)+Math.min(...ys)+1)*s)/2,s)}
const demo=['...T......','..TTT...SS','.OOJJ..SS.','.OOJ..LLL.','ZZ.J..LTTT','.ZZIIII.T.','LLLSS.JJOO','L.SS.JJ.OO'];
function drawField(board,game,flashes=[],fx=[]){
 board.clearRect(0,0,320,640);board.fillStyle='#443329';board.fillRect(0,0,320,640);
 board.strokeStyle='#594337';board.lineWidth=.8;board.beginPath();for(let i=1;i<20;i++){board.moveTo(0,i*32+.5);board.lineTo(320,i*32+.5);if(i<10){board.moveTo(i*32+.5,0);board.lineTo(i*32+.5,640)}}board.stroke();
 if(!game){demo.forEach((row,i)=>[...row].forEach((p,x)=>{if(p!=='.')block(board,x*32,(20-demo.length+i)*32,32,p)}));piece(board,'T',0,96,96,32);piece(board,'T',0,96,320,32,true)}
 else{game.board.forEach((row,y)=>row.forEach((p,x)=>{if(p)block(board,x*32,y*32,32,p)}));if(game.state!=='over'){piece(board,game.type,game.r,game.x*32,game.landing()*32,32,true);piece(board,game.type,game.r,game.x*32,game.y*32,32)}}
 for(const f of flashes){board.fillStyle='rgba(255,232,182,'+(f.life/260*.65)+')';board.fillRect(0,f.y*32,320,32)}
 for(const p of fx){board.globalAlpha=Math.min(1,p.life/200);board.fillStyle=p.color;board.fillRect(p.x,p.y,p.s,p.s)}board.globalAlpha=1;
}
function feedback(name,rows=[]){tone(name);if(name==='clear'||name==='pulse'){
 for(const y of rows){flashes.push({y,life:260});for(let i=0;i<20;i++)fx.push({x:Math.random()*320,y:y*32+16,vx:(Math.random()-.5)*.18,vy:-Math.random()*.19,s:Math.random()*3+2,color:i%2?'#fff4bd':'#ffc18b',life:340})}
 $('notice').textContent=name==='pulse'?'✦ 星际冲击':rows.length===4?'✦ 四行全消 ✦':game.combo>0?'COMBO × '+(game.combo+1):'+'+rows.length+' 行';const notice=$('notice');notice.classList.remove('pop');void notice.offsetWidth;notice.classList.add('pop');messageTime=720}}
function put(id,value){const el=$(id),s=String(value);if(el.textContent!==s)el.textContent=s}
let lastPreview='';
function sync(){
 const score=game?.score||0,state=game?.state||'ready';
 $('duoMode').disabled=state==='playing';
 if(score>best){best=score;save(mode,best)}
 put('best',best.toLocaleString());put('score',String(score).padStart(6,'0'));put('level',String(game?.level||1).padStart(2,'0'));put('lines',String(game?.lines||0).padStart(2,'0'));
 put('sound',sound?'◖))　音效开启':'◖×　音效关闭');put('start',state==='playing'?'Ⅱ　暂停游戏':state==='paused'?'▶　继续游戏':state==='over'?'▶　再玩一次':'▶　开始游戏');put('status',{ready:'准备就绪',playing:'游戏进行中',paused:'已暂停',over:'游戏结束'}[state]);
 for(const m of ['classic','galaxy']){$(m).classList.toggle('selected',mode===m);$(m).setAttribute('aria-pressed',mode===m);$(m).disabled=state==='playing'||state==='paused'}
 put('desc',mode==='classic'?'消除整行提升等级，挑战个人最高分。':'消行蓄积星能，释放冲击清除底行。');
 const energy=game?.energy||0;$('charge').style.width=energy+'%';$('pulse').disabled=mode!=='galaxy'||energy<100||state!=='playing';put('pulse',mode==='classic'?'银河挑战专属':energy===100?'释放星际冲击　✦':energy+' / 100');
 const next=game?.queue[0]||'S',held=game?.held||'';if(lastPreview!==next+held){preview('held',held);preview('next',next);lastPreview=next+held}
 const layer=$('overlay');if(layer.dataset.state!==state){layer.dataset.state=state;layer.hidden=!['paused','over'].includes(state);layer.replaceChildren();if(!layer.hidden){
 const title=document.createElement('strong'),summary=document.createElement('small'),button=document.createElement('button');title.textContent=state==='paused'?'游戏暂停':'航程结束';summary.textContent=state==='paused'?'准备好后继续挑战':'最终得分 '+score+'　·　最高纪录 '+best;button.className='primary';button.textContent=state==='paused'?'继续游戏':'再玩一次';button.onclick=startOrPause;layer.append(title,summary,button);
 if(state==='paused'){const quit=document.createElement('button');quit.textContent='返回模式选择';quit.className='primary';quit.onclick=()=>{game=null;resetFx();sync()};layer.append(quit)}
 }}}
function resetFx(){fx=[];flashes=[];messageTime=0;$('notice').textContent='';keys.clear()}
function startOrPause(){unlock();if(!game||game.state==='over'){resetFx();game=new GalaxyGame(mode,feedback);tone('start')}else{game.pause();keys.clear()}last=performance.now();sync()}
for(const m of ['classic','galaxy'])$(m).onclick=()=>{mode=m;best=Number(read(mode,0))||0;game=null;resetFx();sync()};
$('start').onclick=startOrPause;$('pulse').onclick=()=>{game?.pulse();sync()};$('sound').onclick=()=>{sound=!sound;save('sound',sound?'on':'off');unlock();tone('start');sync()};
const dialog=document.querySelector('dialog');let resumeHelp=false;$('help').onclick=()=>{resumeHelp=game?.state==='playing';if(resumeHelp)game.pause();keys.clear();sync();dialog.showModal()};
$('closeHelp').onclick=()=>dialog.close();dialog.onclose=()=>{if(resumeHelp&&game?.state==='paused'&&!document.hidden)game.pause();resumeHelp=false;last=performance.now();sync()};
function act(k){if(!game)return;if(k==='P'){if(game.state!=='over')startOrPause();return}
 const actions={Left:()=>game.move(-1),Right:()=>game.move(1),Down:()=>game.soft(),X:()=>game.rotate(1),Z:()=>game.rotate(-1),Space:()=>game.hard(),C:()=>game.hold(),F:()=>game.pulse()};actions[k]?.();sync()}
const mapping={ArrowLeft:'Left',ArrowRight:'Right',ArrowDown:'Down',ArrowUp:'X',KeyX:'X',KeyZ:'Z',Space:'Space',KeyC:'C',KeyP:'P',KeyF:'F'};
function press(k){act(k);if(game?.state==='playing'&&['Left','Right','Down'].includes(k))keys.set(k,k==='Down'?40:150)}
window.addEventListener('keydown',e=>{const k=mapping[e.code];if(!k||dialog.open||e.ctrlKey||e.altKey||e.metaKey)return;if(!game||game.state==='over')return;e.preventDefault();if(!e.repeat)press(k)});
window.addEventListener('keyup',e=>keys.delete(mapping[e.code]));
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);press(b.dataset.key)};b.onlostpointercapture=()=>keys.delete(b.dataset.key);b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);b.onclick=e=>{if(e.detail===0)act(b.dataset.key)}});
function autoPause(){keys.clear();if(game?.state==='playing'){game.pause();sync()}}window.addEventListener('blur',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden){resumeHelp=false;autoPause()}});
function frame(t){const dt=Math.min(50,Math.max(0,t-last));last=t;if(t-skyTime>48){drawSky(t);skyTime=t}
 if(game?.state==='playing'){for(const [k,delay] of keys){if(delay<=dt){act(k);keys.set(k,k==='Down'?32:55)}else keys.set(k,delay-dt)}game.tick(dt);
 for(const f of flashes)f.life-=dt;flashes=flashes.filter(f=>f.life>0);
 for(const p of fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*.00045}fx=fx.filter(p=>p.life>0);messageTime-=dt;if(messageTime<=0)$('notice').textContent='';sync()}
 if(!document.body.classList.contains('duelMode'))drawField(board,game,flashes,fx);requestAnimationFrame(frame)}
sync();requestAnimationFrame(frame);
