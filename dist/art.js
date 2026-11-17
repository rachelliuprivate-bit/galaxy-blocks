// Original procedural space illustration. Render the panorama only when it resizes.
function fitCanvas(canvas,maxDpr=2){
 const w=canvas.clientWidth,h=canvas.clientHeight,d=Math.min(devicePixelRatio||1,maxDpr);
 canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);const c=canvas.getContext('2d');c.scale(d,d);return {c,w,h};
}
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function panorama(){
 const {c,w,h}=fitCanvas(document.querySelector('#art')),rand=seeded(93);
 let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#19152e');g.addColorStop(.58,'#322249');g.addColorStop(1,'#151a3c');c.fillStyle=g;c.fillRect(0,0,w,h);
 for(let i=0;i<w*.34;i++){const x=rand()*w,y=rand()*h,r=rand();c.fillStyle='rgba(222,213,255,'+(.15+r*.65)+')';c.fillRect(x,y,r*1.7+.4,r*1.7+.4);if(r>.985){c.fillRect(x-3,y,7,1);c.fillRect(x,y-3,1,7)}}
 const cx=w*.8,cy=h*.45,R=Math.min(w*.105,h*.35);
 c.save();c.translate(cx,cy);c.rotate(-.25);
 const glow=c.createRadialGradient(0,0,R*.55,0,0,R*1.8);glow.addColorStop(0,'#b287d566');glow.addColorStop(1,'#9d69da00');c.fillStyle=glow;c.fillRect(-2*R,-2*R,4*R,4*R);
 function rings(front){for(let i=0;i<23;i++){c.beginPath();c.ellipse(0,0,R*(1.34+i*.045),R*(.23+i*.009),0,front?0:Math.PI,front?Math.PI:2*Math.PI);c.strokeStyle=['#9a79b8','#ba97d0','#6d628e','#e5c7e1','#696f98'][i%5];c.lineWidth=R*.017;c.stroke()}}
 rings(false);c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();g=c.createLinearGradient(0,-R,0,R);g.addColorStop(0,'#bde8ed');g.addColorStop(.33,'#9db8dc');g.addColorStop(.6,'#a494c8');g.addColorStop(1,'#533e7e');c.fillStyle=g;c.fillRect(-R,-R,R*2,R*2);
 for(let i=0;i<120;i++){let y=(rand()*2-1)*R;c.beginPath();c.moveTo(-R,y);c.bezierCurveTo(-R*.3,y+R*.17,R*.7,y+R*.2,R,y+R*.06);c.strokeStyle=rand()>.5?'#e4d1ee25':'#544b9833';c.lineWidth=rand()*R*.055+.4;c.stroke()}c.restore();rings(true);c.restore();
 for(let layer=0;layer<2;layer++){c.fillStyle=layer?'#101322':'#26203d';c.beginPath();c.moveTo(0,h);for(let x=0;x<=w+5;x+=5){let y=h*(layer?.96:.89)-Math.abs(Math.sin(x/w*11+.7*layer)*Math.cos(x/w*17))*h*.16-rand()*3;c.lineTo(x,y)}c.lineTo(w,h);c.fill()}
}
let sky,points;function layoutArt(){panorama();sky=fitCanvas(document.querySelector('#stars'),1);const rand=seeded(77);points=Array.from({length:Math.min(220,sky.w*.16)},()=>[rand()*sky.w,rand()*sky.h,rand()])}
function drawSky(time){const {c,w,h}=sky;c.clearRect(0,0,w,h);for(const [x,y,r] of points){c.fillStyle='rgba(191,177,238,'+(.18+r*.48)+')';c.fillRect(x,(y+time*.0008*(1+r))%h,1+r,1+r)}}
layoutArt();window.addEventListener('resize',layoutArt);
