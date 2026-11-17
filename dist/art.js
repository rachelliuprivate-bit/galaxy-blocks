// Original procedural space illustration. Render the panorama only when it resizes.
function fitCanvas(canvas,maxDpr=2){
 const w=canvas.clientWidth,h=canvas.clientHeight,d=Math.min(devicePixelRatio||1,maxDpr);
 canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);const c=canvas.getContext('2d');c.scale(d,d);return {c,w,h};
}
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function panorama(){
 const {c,w,h}=fitCanvas(document.querySelector('#art')),rand=seeded(93);
 let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#4a332c');g.addColorStop(.58,'#86583b');g.addColorStop(1,'#714236');c.fillStyle=g;c.fillRect(0,0,w,h);
 for(let i=0;i<w*.34;i++){const x=rand()*w,y=rand()*h,r=rand();c.fillStyle='rgba(255,229,186,'+(.15+r*.65)+')';c.fillRect(x,y,r*1.7+.4,r*1.7+.4);if(r>.985){c.fillRect(x-3,y,7,1);c.fillRect(x,y-3,1,7)}}
 const cx=w*.8,cy=h*.45,R=Math.min(w*.105,h*.35);
 c.save();c.translate(cx,cy);c.rotate(-.25);
 const glow=c.createRadialGradient(0,0,R*.55,0,0,R*1.8);glow.addColorStop(0,'#ffd99588');glow.addColorStop(1,'#ffbb6900');c.fillStyle=glow;c.fillRect(-2*R,-2*R,4*R,4*R);
 function rings(front){for(let i=0;i<23;i++){c.beginPath();c.ellipse(0,0,R*(1.34+i*.045),R*(.23+i*.009),0,front?0:Math.PI,front?Math.PI:2*Math.PI);c.strokeStyle=['#b98556','#e4b880','#9e704c','#fff0bf','#c19673'][i%5];c.lineWidth=R*.017;c.stroke()}}
 rings(false);c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();g=c.createLinearGradient(0,-R,0,R);g.addColorStop(0,'#ffe9b3');g.addColorStop(.33,'#e2ab71');g.addColorStop(.6,'#c8855d');g.addColorStop(1,'#85503f');c.fillStyle=g;c.fillRect(-R,-R,R*2,R*2);
 for(let i=0;i<120;i++){let y=(rand()*2-1)*R;c.beginPath();c.moveTo(-R,y);c.bezierCurveTo(-R*.3,y+R*.17,R*.7,y+R*.2,R,y+R*.06);c.strokeStyle=rand()>.5?'#fff0c735':'#87432e45';c.lineWidth=rand()*R*.055+.4;c.stroke()}c.restore();rings(true);c.restore();
 for(let layer=0;layer<2;layer++){c.fillStyle=layer?'#50392e':'#755142';c.beginPath();c.moveTo(0,h);for(let x=0;x<=w+5;x+=5){let y=h*(layer?.96:.89)-Math.abs(Math.sin(x/w*11+.7*layer)*Math.cos(x/w*17))*h*.16-rand()*3;c.lineTo(x,y)}c.lineTo(w,h);c.fill()}
}
// Cache the distant planet, orbit paths and dust. Only the foreground stars move.
function distantSpace(w,h){
 const layer=document.createElement('canvas');
 layer.width=w;layer.height=h;
 const c=layer.getContext('2d'),rand=seeded(165);
 for(let i=0;i<Math.min(w*3,4200);i++){
   const x=rand()*w,y=h*(.9-.7*x/w)+(rand()+rand()+rand()-1.5)*h*.22;
   c.fillStyle='rgba(255,221,174,'+(.06+rand()*.32)+')';
   const size=.4+rand()*1.25;c.fillRect(x,y,size,size);
 }
 const r=Math.min(w*.16,h*.29),x=w*.99,y=h*.71;
 c.save();c.translate(x,y);c.rotate(-.36);
 const halo=c.createRadialGradient(0,0,r*.85,0,0,r*1.22);
 halo.addColorStop(0,'#ffe3a48a');halo.addColorStop(1,'#f4bc7400');
 c.fillStyle=halo;c.fillRect(-r*1.22,-r*1.22,r*2.44,r*2.44);
 c.save();c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();
 const disk=c.createRadialGradient(-r*.6,-r*.6,0,0,0,r*1.07);
 disk.addColorStop(0,'#f4c38b');disk.addColorStop(.6,'#ca895d');disk.addColorStop(1,'#88553f');
 c.fillStyle=disk;c.fillRect(-r,-r,2*r,2*r);
 for(let n=0;n<150;n++){
   const py=(rand()*2-1)*r;c.beginPath();c.moveTo(-r,py);
   c.bezierCurveTo(-r*.32,py+r*.23,r*.65,py+r*.14,r,py-r*.02);
   c.strokeStyle=n%3?'#fff0bd24':'#934c3638';c.lineWidth=.5+rand()*r*.05;c.stroke();
 }
 c.restore();
 for(let n=0;n<4;n++){
   c.beginPath();c.ellipse(-w*.42,-h*.35,w*(.43+n*.045),h*(.3+n*.03),.1,0,Math.PI*2);
   c.strokeStyle='#f8dba42b';c.lineWidth=n===0?1.2:.7;c.stroke();
 }
 c.restore();return layer;
}
let sky,points,scenery;function layoutArt(){panorama();sky=fitCanvas(document.querySelector('#stars'),1);scenery=distantSpace(sky.w,sky.h);const rand=seeded(77);points=Array.from({length:Math.min(220,sky.w*.16)},()=>[rand()*sky.w,rand()*sky.h,rand()])}
function drawSky(time){const {c,w,h}=sky;c.clearRect(0,0,w,h);c.drawImage(scenery,0,0);for(const [x,y,r] of points){c.fillStyle='rgba(255,233,189,'+(.18+r*.48)+')';c.fillRect(x,(y+time*.0008*(1+r))%h,1+r,1+r)}}
layoutArt();window.addEventListener('resize',layoutArt);
