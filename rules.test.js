const {test}=require('node:test');
const assert=require('node:assert/strict');
const {GalaxyGame,cells,SHAPES}=require('./dist/engine.js');
test('100 consecutive seven-piece bags',()=>{
 const g=new GalaxyGame();
 for(let i=0;i<100;i++){const bag=new Set();for(let j=0;j<7;j++){bag.add(g.type);g.spawn()}assert.equal(bag.size,7)}
});
test('each orientation has four unique cells and remains inside walls',()=>{
 for(const type of Object.keys(SHAPES))for(const side of [-1,1]){
 const g=new GalaxyGame();g.spawn(type);
 for(let i=0;i<4;i++){assert.equal(new Set(cells(type,i).map(String)).size,4);
 for(let n=0;n<12;n++)g.move(side);assert(!g.fits(g.x+side,g.y,g.r));
 g.rotate(side);assert(g.fits(g.x,g.y,g.r))}}
});
test('I piece kicks away from left wall',()=>{const g=new GalaxyGame();g.spawn('I');g.r=1;g.x=-2;g.y=3;g.rotate(-1);assert.equal(g.r,0);assert.equal(g.x,0)});
test('hard drop stops on stack and scores distance',()=>{const g=new GalaxyGame();g.spawn('O');g.board[17][4]='L';const y=g.landing();assert.equal(y,15);g.hard();assert.equal(g.score,30);assert.equal(g.board[16][4],'O');assert.equal(g.board[17][4],'L')});
test('hold once per piece, swap after lock',()=>{const g=new GalaxyGame(),a=g.type,b=g.queue[0];g.hold();assert.equal(g.type,b);g.hold();assert.equal(g.held,a);g.hard();const c=g.type;g.hold();assert.equal(g.type,a);assert.equal(g.held,c)});
function clearRows(g,n){g.spawn('I');g.r=1;g.x=2;g.y=16;for(let y=20-n;y<20;y++){g.board[y].fill('T');g.board[y][4]=null}g.freeze()}
test('1–4 lines, scoring, level threshold and speed',()=>{for(let n=1;n<=4;n++){const g=new GalaxyGame();g.lines=9;const old=g.interval;clearRows(g,n);assert.equal(g.lines,9+n);assert.equal(g.score,[0,100,300,500,800][n]);assert.equal(g.level,2);assert(g.interval<old);assert.equal(g.board.length,20);assert(!g.board.some(row=>row.every(Boolean)))}});
test('combo, energy cap, pulse and mode isolation',()=>{for(const mode of ['classic','galaxy']){const g=new GalaxyGame(mode);clearRows(g,4);clearRows(g,4);assert.equal(g.score,1650);assert.equal(g.energy,mode==='classic'?0:100);g.board[19][0]='J';g.board[18][1]='L';g.pulse();assert.equal(g.board[19][mode==='classic'?0:1],mode==='classic'?'J':'L');assert.equal(g.lines,8);assert.equal(g.energy,0);g.hard();assert.equal(g.combo,-1)}});
test('gravity, soft drop, lock delay and pause freeze',()=>{const g=new GalaxyGame();g.spawn('O');g.tick(900);assert.equal(g.y,1);g.soft();assert.equal(g.score,1);g.y=g.landing();g.tick(200);g.pause();const before=JSON.stringify(g);g.tick(9999);g.move(1);g.hard();assert.equal(JSON.stringify(g),before);g.pause();g.tick(280);assert.equal(g.board[19][4],'O')});
test('top out and fresh run',()=>{const g=new GalaxyGame();for(let i=0;i<40&&g.state==='playing';i++)g.hard();assert.equal(g.state,'over');const fresh=new GalaxyGame();assert.equal(fresh.score,0);assert.equal(fresh.state,'playing');assert(fresh.board.flat().every(x=>x===null))});
