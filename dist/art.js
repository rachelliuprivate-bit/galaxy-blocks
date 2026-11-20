// A cached globe with a spherical ocean, continents, cloud bands and a sunlit limb.
function fitCanvas(canvas,maxDpr=2){
  const w=canvas.clientWidth,h=canvas.clientHeight,d=Math.min(devicePixelRatio||1,maxDpr);
  canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);
  const c=canvas.getContext('2d');c.scale(d,d);return {c,w,h};
}
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
const globe=(()=>{
  const size=512, image=document.createElement('canvas');
  image.width=image.height=size;
  const ctx=image.getContext('2d'),pixels=ctx.createImageData(size,size);
  const rand=seeded(186),grid=Float32Array.from({length:128*128},rand);
  function noise(x,y){
    const ix=Math.floor(x),iy=Math.floor(y);
    let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);
    const at=(a,b)=>grid[((iy+b)&127)*128+((ix+a)&127)];
    return (at(0,0)*(1-u)+at(1,0)*u)*(1-v)+(at(0,1)*(1-u)+at(1,1)*u)*v;
  }
  function texture(x,y){
    return .51*noise(x,y)+.26*noise(x*2.1,y*2.1)+.14*noise(x*4.3,y*4.3)+.09*noise(x*11,y*11);
  }
  // Coastline silhouettes in longitude/latitude; small-scale variation is procedural.
  const map=document.createElement('canvas');map.width=720;map.height=360;
  const m=map.getContext('2d');m.fillStyle='white';
  const land=[
    [[-17,15],[-16,28],[-6,36],[10,37],[31,31],[36,21],[44,12],[51,12],[49,3],[42,-2],[40,-14],[35,-26],[24,-35],[17,-33],[12,-18],[10,-6],[8,4],[-4,5],[-14,10]],
    [[-10,36],[-9,43],[-2,44],[-5,49],[7,54],[8,58],[18,60],[10,59],[6,61],[15,69],[28,71],[34,66],[55,68],[72,72],[101,78],[139,72],[172,63],[162,53],[143,49],[136,43],[129,40],[122,32],[120,23],[109,20],[107,11],[101,4],[98,12],[92,21],[87,22],[80,8],[76,11],[71,21],[61,25],[57,22],[53,17],[43,13],[36,28],[32,31],[29,37],[22,39],[24,35],[18,40],[13,44],[16,38],[10,43],[4,43],[0,41],[-2,37]],
    [[47,-13],[50,-16],[47,-25],[44,-24],[44,-18]],[[95,5],[105,-6],[101,-4]],[[114,-21],[122,-16],[132,-12],[140,-17],[145,-13],[153,-26],[147,-38],[133,-32],[116,-34]],[[130,32],[141,42],[144,44],[142,37]], [[-10,51],[-5,58],[1,52]]];
  for(const polygon of land){m.beginPath();polygon.forEach(([x,y],i)=>m[i?'lineTo':'moveTo']((180+x)*2,(90-y)*2));m.closePath();m.fill()}
  const mask=m.getImageData(0,0,720,360).data;
  const radius=size*.488;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=(x-size/2)/radius,ny=(size/2-y)/radius,rr=nx*nx+ny*ny;
    if(rr>=1)continue;
    const nz=Math.sqrt(1-rr),tilt=.28;
    const lat=Math.asin(ny*Math.cos(tilt)+nz*Math.sin(tilt));
    const lon=Math.atan2(nx,nz*Math.cos(tilt)-ny*Math.sin(tilt))+.63;
    const u=lon*7+45,v=lat*8+56,grain=texture(u,v);
    const mlon=((lon*180/Math.PI+180+(grain-.5)*4)%360+360)%360;
    const my=Math.min(359,Math.max(0,Math.floor((90-lat*180/Math.PI+(noise(u+20,v)-.5)*2)*2)));
    const isLand=mask[(my*720+Math.floor(mlon*2))*4+3]>120;
    const sandy=Math.exp(-Math.pow((lat-.39)*4.2,2));
    const ground=isLand?[69+95*sandy+45*grain,99+43*sandy+34*grain,82+12*sandy+25*grain]:
      [7+13*grain,58+56*grain,116+63*grain];
    const swirl=texture(u*.38,v*.38);
    const clouds=texture(u*1.8+swirl*9,v*3.4+2.8*Math.sin(u*.47+v*.5)+swirl*11);
    const cloud=Math.min(.96,Math.max(0,(clouds-.43)*3.6));
    const light=.19+.91*Math.max(0,-nx*.57+ny*.44+nz*.68);
    const rim=Math.pow(1-nz,5)*.88;
    const i=(y*size+x)*4;
    for(let k=0;k<3;k++)pixels.data[i+k]=((ground[k]*(1-cloud)+[233,242,247][k]*cloud)*light)*(1-rim)+[100,189,246][k]*rim;
    pixels.data[i+3]=Math.min(255,(1-Math.sqrt(rr))*radius*255);
  }
  ctx.putImageData(pixels,0,0);return image;
})();
function drawPlanet(c,x,y,r){
  const halo=c.createRadialGradient(x,y,r*.93,x,y,r*1.11);
  halo.addColorStop(0,'#5bafed88');halo.addColorStop(.45,'#248fda33');halo.addColorStop(1,'#0c427500');
  c.fillStyle=halo;c.fillRect(x-r*1.12,y-r*1.12,r*2.24,r*2.24);
  c.drawImage(globe,x-r*1.024,y-r*1.024,r*2.048,r*2.048);
}
function stars(c,w,h,rand,count){
  for(let i=0;i<count;i++){
    const x=rand()*w,y=rand()*h,a=rand();
    c.fillStyle='rgba(207,228,248,'+(.12+a*.64)+')';c.fillRect(x,y,.45+a,.45+a);
  }
}
let sky,scenery,points;
function layoutArt(){
  const {c,w,h}=fitCanvas(document.querySelector('#art'));
  c.fillStyle='#030812';c.fillRect(0,0,w,h);stars(c,w,h,seeded(6),w*.36);
  drawPlanet(c,w*.82,h*2.32,h*2.13);
  sky=fitCanvas(document.querySelector('#stars'),1);
  scenery=document.createElement('canvas');scenery.width=sky.w;scenery.height=sky.h;
  const back=scenery.getContext('2d');stars(back,sky.w,sky.h,seeded(16),sky.w*.41);
  const r=Math.min(sky.h*.39,sky.w*.31);
  drawPlanet(back,sky.w*.985,sky.h*.78,r);
  const rand=seeded(77);points=Array.from({length:Math.min(150,sky.w*.09)},()=>[rand()*sky.w,rand()*sky.h,rand()]);
}
function drawSky(time){
  const {c,w,h}=sky;c.clearRect(0,0,w,h);c.drawImage(scenery,0,0);
  for(const [x,y,r] of points){c.fillStyle='rgba(202,229,250,'+(.22+r*.54)+')';c.fillRect(x,(y+time*.0008*(1+r))%h,1+r,1+r)}
}
layoutArt();window.addEventListener('resize',layoutArt);
