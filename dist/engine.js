// Rules use screen coordinates: x increases rightward, y downward.
const SHAPES = { I:['....','IIII','....','....'], J:['J..','JJJ','...'], L:['..L','LLL','...'], O:['OO','OO'], S:['.SS','SS.','...'], T:['.T.','TTT','...'], Z:['ZZ.','.ZZ','...'] };
const normalKicks = {
 '01':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], '12':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
 '23':[[0,0],[1,0],[1,-1],[0,2],[1,2]], '30':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]]
};
const longKicks = {
 '01':[[0,0],[-2,0],[1,0],[-2,1],[1,-2]], '12':[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
 '23':[[0,0],[2,0],[-1,0],[2,-1],[-1,2]], '30':[[0,0],[1,0],[-2,0],[1,2],[-2,-1]]
};
function cells(type,r=0){
 const shape=SHAPES[type], out=[];
 shape.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='.'){
 let a=x,b=y;
 for(let i=0;i<r;i++) [a,b]=[shape.length-1-b,a];
 out.push([a,b]);
 }}));return out;
}
const emptyRow=()=>Array(10).fill(null);
class GalaxyGame {
 constructor(mode='classic',emit=()=>{},random=Math.random){
 Object.assign(this,{mode,emit,random,board:Array.from({length:20},emptyRow),queue:[],score:0,lines:0,combo:-1,energy:0,held:null,used:false,state:'playing'});
 this.spawn();
 }
 get level(){return 1+Math.floor(this.lines/10)}
 get interval(){return Math.max(75,900*Math.pow(.84,this.level-1))}
 fill(){while(this.queue.length<5){const bag=Object.keys(SHAPES);for(let i=6;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}this.queue.push(...bag)}}
 spawn(type){this.fill();this.type=type||this.queue.shift();this.fill();this.x=this.type==='O'?4:3;this.y=this.type==='I'?-1:0;this.r=0;this.gravity=this.lock=this.resets=0;
 if(!this.fits(this.x,this.y,this.r))this.end()}
 end(){this.state='over';this.emit('over')}
 fits(x,y,r){return cells(this.type,r).every(([a,b])=>x+a>=0&&x+a<10&&y+b<20&&(y+b<0||!this.board[y+b][x+a]))}
 landing(){let y=this.y;while(this.fits(this.x,y+1,this.r))y++;return y}
 adjust(x,y,r){if(!this.fits(x,y,r))return false;
 if(!this.fits(this.x,this.y+1,this.r)&&this.resets<15){this.lock=0;this.resets++}
 Object.assign(this,{x,y,r});return true}
 move(dx){if(this.state==='playing'&&this.adjust(this.x+dx,this.y,this.r))this.emit('move')}
 rotate(dir){if(this.state!=='playing')return;const next=(this.r+dir+4)%4,data=this.type==='I'?longKicks:normalKicks;
 const offsets=this.type==='O'?[[0,0]]:data[''+this.r+next]||data[''+next+this.r].map(([a,b])=>[-a,-b]);
 for(const [a,b] of offsets)if(this.adjust(this.x+a,this.y+b,next)){this.emit('rotate');break}}
 soft(){if(this.state==='playing'&&this.fits(this.x,this.y+1,this.r)){this.y++;this.score++;this.gravity=0}}
 hard(){if(this.state!=='playing')return;const y=this.landing();this.score+=2*(y-this.y);this.y=y;this.freeze()}
 hold(){if(this.used||this.state!=='playing')return;const old=this.held;this.held=this.type;this.used=true;this.spawn(old);this.emit('hold')}
 freeze(){const blocks=cells(this.type,this.r).map(([a,b])=>[a+this.x,b+this.y]);if(blocks.some(([,y])=>y<0)){this.end();return}
 for(const [x,y] of blocks)this.board[y][x]=this.type;
 const rows=[];this.board.forEach((row,y)=>{if(row.every(Boolean))rows.push(y)});
 if(rows.length){this.combo++;this.score+=([0,100,300,500,800][rows.length]+50*this.combo)*this.level;this.lines+=rows.length;
 if(this.mode==='galaxy')this.energy=Math.min(100,this.energy+18*rows.length+8*this.combo+(rows.length===4?20:0));
 this.board=this.board.filter((_,y)=>!rows.includes(y));while(this.board.length<20)this.board.unshift(emptyRow());this.emit('clear',rows)
 }else{this.combo=-1;this.emit('lock')}
 this.used=false;this.spawn()}
 pulse(){if(this.mode!=='galaxy'||this.state!=='playing'||this.energy<100)return;
 let y=19;while(y>=0&&!this.board[y].some(Boolean))y--;if(y<0)return;
 this.board.splice(y,1);this.board.unshift(emptyRow());this.energy=0;
 // Settled cells above the cleared row move down; an active piece in a cavity follows if necessary.
 if(!this.fits(this.x,this.y,this.r))this.y++;
 this.emit('pulse',[y])}
 tick(dt){if(this.state!=='playing')return;this.gravity+=dt;if(this.gravity>=this.interval){this.gravity%=this.interval;if(this.fits(this.x,this.y+1,this.r))this.y++}
 if(!this.fits(this.x,this.y+1,this.r)){this.lock+=dt;if(this.lock>=480)this.freeze()}}
 pause(){if(this.state==='playing')this.state='paused';else if(this.state==='paused')this.state='playing'}
}
if(typeof module!=='undefined')module.exports={GalaxyGame,cells,SHAPES};
