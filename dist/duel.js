// A match has two independent boards driven by one clock. Seed their bags
// identically so a faster player never changes the other player's sequence.
const duelBindings = [
  {KeyA:'left',KeyD:'right',KeyS:'soft',KeyW:'cw',KeyQ:'ccw',Space:'hard',KeyE:'hold'},
  {ArrowLeft:'left',ArrowRight:'right',ArrowDown:'soft',ArrowUp:'cw',Slash:'ccw',Enter:'hard',ShiftRight:'hold'}
];
const instructions = [
  'A / D 移动 · S 软降 · W / Q 旋转 · 空格硬降 · E 暂存',
  '← / → 移动 · ↓ 软降 · ↑ / 斜杠旋转 · 回车硬降 · 右 Shift 暂存'
];
const duelActions = {
  left:g=>g.move(-1), right:g=>g.move(1), soft:g=>g.soft(),
  cw:g=>g.rotate(1), ccw:g=>g.rotate(-1), hard:g=>g.hard(), hold:g=>g.hold()
};
let duelGames=[], duelState='ready', duelLast=0, duelFrame=0;
const duelPressed=new Map();
const panels=instructions.map((guide,i)=>{
  const card=document.createElement('article');
  card.className='duelPlayer';
  card.innerHTML='<h2>玩家 '+(i+1)+' <b>0 分</b></h2><canvas class="duelCanvas" width="320" height="640" aria-label="玩家 '+(i+1)+'的棋盘"></canvas><div class="duelMeta"><span></span><span></span></div><p class="duelKeys"></p>';
  card.querySelector('p').textContent=guide;
  $('duelBoards').append(card);
  return {ctx:card.querySelector('canvas').getContext('2d'),score:card.querySelector('b'),meta:card.querySelectorAll('.duelMeta span')};
});
function paintDuel(){
  panels.forEach((panel,i)=>{
    const player=duelGames[i];
    drawField(panel.ctx,player);
    panel.score.textContent=(player?.score||0)+' 分';
    panel.meta[0].textContent='消行 '+(player?.lines||0);
    panel.meta[1].textContent='预告 '+(player?.queue[0]||'—')+'　暂存 '+(player?.held||'—');
  });
}
function switchPlayers(two){
  if(two===document.body.classList.contains('duelMode')||game?.state==='playing'||duelState==='playing')return;
  game=null;resetFx();sync();duelState='ready';duelGames=[];duelPressed.clear();
  document.body.classList.toggle('duelMode',two);
  $('duel').hidden=!two;
  $('soloMode').setAttribute('aria-pressed',String(!two));
  $('duoMode').setAttribute('aria-pressed',String(two));
  if(two){duelUI();paintDuel()}
}
$('soloMode').onclick=()=>switchPlayers(false);
$('duoMode').onclick=()=>switchPlayers(true);
function duelUI(){
  $('duelStart').textContent={ready:'开始对战',playing:'暂停对战',paused:'继续对战',over:'再战一局'}[duelState];
  $('soloMode').disabled=duelState==='playing';
  $('duelStatus').classList.toggle('result',duelState==='over');
  let message={ready:'准备就绪',playing:'对战中 · P 键暂停',paused:'双方已暂停 · 按 P 继续'}[duelState];
  if(duelState==='over'){
    const lost=duelGames.map(g=>g.state==='over');
    message=lost[0]&&lost[1]?'双方同时触顶，平局':'玩家 '+(lost[0]?2:1)+' 获胜';
  }
  $('duelStatus').textContent=message;
}
function toggleDuel(){
  if(duelState==='ready'||duelState==='over'){
    const seed=Math.floor(Math.random()*4294967296);
    duelGames=panels.map(()=>new GalaxyGame('classic',tone,seeded(seed)));
    unlock();tone('start');duelState='playing';
  }else{
    duelGames.forEach(g=>g.pause());
    duelState=duelState==='playing'?'paused':'playing';
  }
  duelPressed.clear();duelLast=performance.now();cancelAnimationFrame(duelFrame);
  duelUI();paintDuel();
  if(duelState==='playing')duelFrame=requestAnimationFrame(stepDuel);
}
function finishDuel(){
  if(!duelGames.some(g=>g.state==='over'))return false;
  duelState='over';duelPressed.clear();duelUI();paintDuel();return true;
}
function stepDuel(t){
  if(duelState!=='playing')return;
  const dt=Math.min(50,t-duelLast);duelLast=t;
  for(const key of duelPressed.values()){
    key.wait-=dt;
    if(key.wait<=0){duelActions[key.action](duelGames[key.player]);key.wait=key.action==='soft'?32:55}
  }
  duelGames.forEach(g=>g.tick(dt));
  if(!finishDuel()){paintDuel();duelFrame=requestAnimationFrame(stepDuel)}
}
$('duelStart').onclick=toggleDuel;
window.addEventListener('keydown',e=>{
  if($('duel').hidden||dialog.open||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.code==='KeyP'&&['playing','paused'].includes(duelState)){
    e.preventDefault();if(!e.repeat)toggleDuel();return;
  }
  if(duelState!=='playing')return;
  const player=duelBindings.findIndex(binding=>binding[e.code]);
  if(player<0)return;
  e.preventDefault();if(e.repeat)return;
  const action=duelBindings[player][e.code];
  duelActions[action](duelGames[player]);
  if(finishDuel())return;
  if(['left','right','soft'].includes(action))duelPressed.set(e.code,{action,player,wait:action==='soft'?40:150});
  paintDuel();
});
window.addEventListener('keyup',e=>duelPressed.delete(e.code));
function pauseDuel(){if(duelState==='playing')toggleDuel()}
window.addEventListener('blur',pauseDuel);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseDuel()});
$('help').addEventListener('click',pauseDuel);
