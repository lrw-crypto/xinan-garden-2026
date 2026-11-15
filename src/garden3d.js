// 草商輔導寺 3D 庭院：以程式建模的黏土風小院，鏡頭跟隨人物，可平移、旋轉、縮放。
// 所有模型都由基本幾何體組成，沒有使用任何外部模型或他人素材。
// 型別宣告在 garden3d.d.ts；本檔是純 JavaScript，方便在沒有建置工具時直接預覽。
import * as THREE from './vendor/three.module.min.js';

// ── 座標：資料庫沿用舊規則的範圍 (x 55–945, y 150–535)，在 3D 世界換算成 44 × 31 的地面 ──
const toWorld=(x,y)=>[(x-500)*.05,(y-342.5)*.08];
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
const toDb=(X,Z)=>({x:Math.round(clamp(500+X*20,55,945)),y:Math.round(clamp(342.5+Z*12.5,150,535))});
const BOUND={x:21.2,zMin:-14.6,zMax:15};

const PAV={x:0,z:-9};            // 靜心亭
const POND={x:4.5,z:3.2,rx:5.6,rz:3.7,bridge:4.9}; // 錦鯉池與拱橋（橋沿南北向）
const TREE={x:-14,z:-6};         // 祈福樹
const EMA={x:-9.2,z:-3.2};       // 繪馬架
const FORTUNE={x:12.5,z:-10};    // 求籤屋
const HUT={x:17,z:4.2};          // 補運光苗的根部；莖向西彎，花苞垂在補運台正上方
const ALTAR={x:13.3,z:4.2};     // 補運台：在光苗花苞的正下方
const CUSHIONS=[[-1.2,-8],[1.2,-8],[-1.2,-10.2],[1.2,-10.2]];

// 站位（世界座標）：人物走到這裡就會開啟互動
const STAND=[[-11.2,-1.2],[12.5,-6.6],[0,-4.2],[13.3,6.3]];
const NAMES=['心願祈福樹','暖心求籤','靜心亭子','補運光苗'];
const TAG_AT=[[-11.5,5.2,-4.5],[12.5,5.6,-10],[0,7.4,-9],[15.6,9.6,4.2]];
export const spots=NAMES.map((name,i)=>({name,...toDb(STAND[i][0],STAND[i][1])}));
export const places={
 spawn:toDb(0,10),
 hutDoor:toDb(ALTAR.x,ALTAR.z),
 queue:i=>toDb(ALTAR.x,ALTAR.z+1.5+Math.min(i,6)*1.25)
};

// ── 地形高度與碰撞 ──
function bridgeY(Z){const u=(Z-POND.z)/POND.bridge;return Math.abs(u)>=1?0:1.05*Math.cos(u*Math.PI/2)}
function groundY(X,Z){
 if(Math.abs(X-PAV.x)<3.3&&Math.abs(Z-PAV.z)<3.3)return .5;
 if(Math.abs(X-PAV.x)<1.7&&Z>=PAV.z+3.3&&Z<PAV.z+4.5)return .5*(1-(Z-PAV.z-3.3)/1.2);
 if(Math.abs(X-POND.x)<1.15)return bridgeY(Z);
 return 0;
}
const SOLIDS=[[TREE.x,TREE.z,1.3],[EMA.x,EMA.z,1.5],[FORTUNE.x,FORTUNE.z,3],[HUT.x,HUT.z,1.1],[0,-9,.9]];
function blocked(X,Z){
 if(Math.abs(X)>BOUND.x||Z<BOUND.zMin||Z>BOUND.zMax)return true;
 for(const [x,z,r] of SOLIDS)if((X-x)**2+(Z-z)**2<r*r)return true;
 const px=(X-POND.x)/(POND.rx+.3),pz=(Z-POND.z)/(POND.rz+.3);
 if(px*px+pz*pz<1&&Math.abs(X-POND.x)>1.05)return true;
 return false;
}

// ── 尋路：半格為單位的網格，從目的地做廣度優先搜尋，再把路徑拉直 ──
const G=.5,GW=Math.floor(2*BOUND.x/G)+1,GH=Math.floor((BOUND.zMax-BOUND.zMin)/G)+1;
const cx=i=>-BOUND.x+i*G,cz=j=>BOUND.zMin+j*G;
let grid;
function nearestFree(X,Z){
 let best=-1,bd=1e9;const i0=Math.round((X+BOUND.x)/G),j0=Math.round((Z-BOUND.zMin)/G);
 for(let r=0;r<14&&best<0;r++)for(let j=j0-r;j<=j0+r;j++)for(let i=i0-r;i<=i0+r;i++){if(i<0||j<0||i>=GW||j>=GH||!grid[j*GW+i])continue;const d=(cx(i)-X)**2+(cz(j)-Z)**2;if(d<bd){bd=d;best=j*GW+i}}
 return best}
function lineFree(a,b){const d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(d/.2);for(let i=1;i<n;i++)if(blocked(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n))return false;return true}
function route(from,to){
 if(!grid){grid=new Uint8Array(GW*GH);for(let j=0;j<GH;j++)for(let i=0;i<GW;i++)grid[j*GW+i]=blocked(cx(i),cz(j))?0:1}
 if(!blocked(to[0],to[1])&&lineFree(from,to))return[to];
 const goal=nearestFree(to[0],to[1]),start=nearestFree(from[0],from[1]);if(goal<0||start<0)return[to];
 const dist=new Int32Array(GW*GH).fill(-1),queue=new Int32Array(GW*GH);let head=0,tail=0;dist[goal]=0;queue[tail++]=goal;
 const step=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 while(head<tail){const c=queue[head++];if(c===start)break;const i=c%GW,j=(c-i)/GW;for(const [di,dj] of step){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=GW||nj>=GH)continue;const n=nj*GW+ni;if(!grid[n]||dist[n]>=0)continue;if(di&&dj&&(!grid[j*GW+ni]||!grid[nj*GW+i]))continue;dist[n]=dist[c]+1;queue[tail++]=n}}
 if(dist[start]<0)return[to];
 const cells=[];let c=start;while(c!==goal){const i=c%GW,j=(c-i)/GW;let next=-1;for(const [di,dj] of step){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=GW||nj>=GH)continue;const n=nj*GW+ni;if(dist[n]<0||dist[n]>=dist[c])continue;if(di&&dj&&(!grid[j*GW+ni]||!grid[nj*GW+i]))continue;if(next<0||dist[n]<dist[next])next=n}if(next<0)break;c=next;cells.push([cx(c%GW),cz((c-c%GW)/GW)])}
 if(!blocked(to[0],to[1]))cells.push(to);
 // 拉直：能直線走到的中繼點就略過
 const out=[];let at=from,k=0;while(k<cells.length){let far=k;for(let m=cells.length-1;m>k;m--)if(lineFree(at,cells[m])){far=m;break}out.push(cells[far]);at=cells[far];k=far+1}
 return out.length?out:[to]}

// ── 人物分件：站姿圖沿褲腳切成上半身與左右腿，三片共用同一張貼圖，腿繞髖部擺動 ──
// 數值是各站姿圖的比例座標（cut：褲腳高度；split：兩腿之間；l、r：左右腿的中心）
const LEGS={'short-standing':{cut:.735,split:.528,l:.478,r:.59},'long-standing':{cut:.735,split:.455,l:.405,r:.515},'pony-standing':{cut:.799,split:.505,l:.377,r:.621}};
// 造型代碼 → 立牌圖的名稱。human、bear 是最早的代碼；之後新增的造型直接用自己的名字（可帶 +g、+f 等旗標）
const spriteBase=style=>{const b=String(style||'').split('+')[0];return b==='bear'?'long':b==='human'?'short':LEGS[b+'-standing']?b:'short'};
// 走近就自動開啟的範圍：[景點編號, x, z, 半徑]（靜心亭另外處理）
const AUTO=[[0,STAND[0][0],STAND[0][1],1.9],[1,STAND[1][0],STAND[1][1],1.9],[3,ALTAR.x,ALTAR.z,2.4]];
const STRIDE=.8,SPEED=3.9; // 一步的距離與走路速度（世界單位）；步伐由實際走過的距離推動，腳不會打滑
function partGeo(u0,u1,v0,v1,px,py){
 const g=new THREE.PlaneGeometry(u1-u0,v1-v0);g.translate((u0+u1)/2-px,py-(v0+v1)/2,0);
 g.setAttribute('uv',new THREE.Float32BufferAttribute([u0,1-v0,u1,1-v0,u0,1-v1,u1,1-v1],2));return g}

// ── 小工具 ──
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const mats=new Map();
function mat(color,extra){const key=color+JSON.stringify(extra||'');let m=mats.get(key);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0,...extra});mats.set(key,m)}return m}
function put(parent,geo,material,x,y,z,o={}){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);if(o.rx)m.rotation.x=o.rx;if(o.ry)m.rotation.y=o.ry;if(o.rz)m.rotation.z=o.rz;if(o.s)m.scale.set(...o.s);m.castShadow=o.cast!==false;m.receiveShadow=true;parent.add(m);return m}
const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const cyl=(a,b,h,n=20)=>new THREE.CylinderGeometry(a,b,h,n);
const ball=(r,d=2)=>new THREE.IcosahedronGeometry(r,d);
function mergeGeo(list){
 const pos=[],nor=[];for(const [g0,m] of list){const g=g0.toNonIndexed();g.applyMatrix4(m);pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array)}
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));return out}
function stick(parent,a,b,r,material){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),m=put(parent,cyl(r,r,A.distanceTo(B),8),material,(A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());return m}
function signTexture(text,fg,bg){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle=bg;g.beginPath();g.arc(64,64,62,0,7);g.fill();g.fillStyle=fg;g.font='bold 78px "Noto Sans TC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,64,70);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}

const C={grass:'#aadca6',grass2:'#9bd19a',base:'#8d5f80',stone:'#f6e8cf',stone2:'#f4cdd9',rock:'#b9add9',rock2:'#cdbfe6',trunk:'#8a5a48',wood:'#dc9a6b',woodDark:'#b9744d',column:'#cf6650',wall:'#fcf0de',roof:'#62b6ae',roofDark:'#4c9f98',trim:'#f6dfa9',gold:'#f2c14e',lantern:'#e8553f',water:'#8fd8e2',water2:'#b9ebef',pink:'#f8b9d4',pink2:'#fbd0e2',pink3:'#f29cc2',leaf:'#7fbf7a',leaf2:'#9bd18c',cushion:'#b79ad6',white:'#fffaf2'};

export class Garden3D{
 players={};uid='';target=undefined;moved=()=>{};interact=()=>{};cheer=()=>{};ok=false;
 constructor(host,opts){
 this.host=host;this.opts=opts;this.actors=new Map();this.keys=new Set();this.pointers=new Map();
 this.reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 this.cam={yaw:.5,pitch:.8,dist:host.clientWidth<600?24:27,follow:true,mode:'pan',t:new THREE.Vector3(0,0,6)};
 this.jump={y:0,v:0};this.pendingSpot=-1;this.wishSlot=0;this.swayers=[];this.animated=[];
 host.classList.add('g3');
 host.innerHTML='<canvas class="g3-canvas" aria-label="草商輔導寺 3D 庭院"></canvas><div class="g3-labels"></div><div class="g3-hint"></div><button type="button" class="g3-prompt" hidden></button><div class="g3-toast" role="status" hidden></div><div class="g3-cheer" hidden><p></p><div><button type="button" data-cheer="💪 加油">加油</button><button type="button" data-cheer="💛 謝謝">謝謝</button><button type="button" data-cheer="🌷 陪伴">陪伴</button><button type="button" data-cheer="" aria-label="取消">×</button></div></div><div class="g3-swipe" hidden><p></p><div class="g3-pips" aria-hidden="true"></div><button type="button">接引聖光</button></div><div class="g3-hud"><button type="button" data-act="jump" aria-label="跳躍">跳躍</button><button type="button" data-act="home" aria-label="找自己">找自己</button><button type="button" data-act="mode" aria-label="切換拖曳方式">拖曳：平移</button><button type="button" data-act="spin" aria-label="旋轉視角">⟳</button><button type="button" data-act="in" aria-label="放大">＋</button><button type="button" data-act="out" aria-label="縮小">－</button></div>';
 this.canvas=host.querySelector('canvas');this.labels=host.querySelector('.g3-labels');this.prompt=host.querySelector('.g3-prompt');this.hint=host.querySelector('.g3-hint');
 this.hint.textContent=matchMedia('(pointer: coarse)').matches?'點地面走路・拖曳平移・雙指縮放與旋轉':'點地面或 WASD 走路・空白鍵跳躍・E 互動・滾輪縮放・右鍵拖曳旋轉';
 try{this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'low-power'})}
 catch(e){this.hint.textContent='這個瀏覽器無法顯示 3D 庭院，仍可使用右側（下方）的五個按鈕互動。';host.classList.add('g3-failed');return}
 this.ok=true;
 const r=this.renderer;r.outputColorSpace=THREE.SRGBColorSpace;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
 this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#fdeee6');this.scene.fog=new THREE.Fog('#fdeee6',55,110);
 this.camera=new THREE.PerspectiveCamera(30,1,.5,200);
 this.build();this.bindInput();
 new ResizeObserver(()=>this.resize()).observe(host);this.resize();
 this.last=performance.now();
 const loop=now=>{this.raf=requestAnimationFrame(loop);const dt=Math.min(.1,(now-this.last)/1000);this.last=now;if(!document.hidden)this.frame(now/1000,dt)};
 this.raf=requestAnimationFrame(loop);
 }
 resize(){const w=this.host.clientWidth||800,h=this.host.clientHeight||500;this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,w<600?1.75:2));this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.w=w;this.h=h}

 // ── 場景建模 ──
 build(){
 const s=this.scene,rand=rng(20261114);
 s.add(new THREE.HemisphereLight('#fff6ea','#ecc9d6',1.45));
 const sun=new THREE.DirectionalLight('#fff0d2',1.55);sun.position.set(-18,30,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 Object.assign(sun.shadow.camera,{left:-32,right:32,top:26,bottom:-26,near:1,far:90});sun.shadow.bias=-.0006;sun.shadow.normalBias=.04;s.add(sun);
 // 底座：圓角草地，側面是莓紫色，像桌上的小模型
 const shape=new THREE.Shape(),W=24.5,D=18.5,R=4;
 shape.moveTo(-W+R,-D);shape.lineTo(W-R,-D);shape.quadraticCurveTo(W,-D,W,-D+R);shape.lineTo(W,D-R);shape.quadraticCurveTo(W,D,W-R,D);shape.lineTo(-W+R,D);shape.quadraticCurveTo(-W,D,-W,D-R);shape.lineTo(-W,-D+R);shape.quadraticCurveTo(-W,-D,-W+R,-D);
 const base=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:2.2,bevelEnabled:true,bevelSize:.35,bevelThickness:.35,bevelSegments:4,curveSegments:10}),[mat(C.grass),mat(C.base)]);
 base.rotation.x=-Math.PI/2;base.position.y=-2.55;base.receiveShadow=true;s.add(base);
 this.ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({visible:false}));this.ground.rotation.x=-Math.PI/2;s.add(this.ground);
 // 草地色塊
 for(let i=0;i<26;i++)put(s,cyl(1,1,.04,24),mat(i%2?C.grass2:'#b4dfa8'),(rand()-.5)*44,.01,(rand()-.5)*32,{s:[1.5+rand()*2.5,1,1+rand()*2],cast:false});
 this.buildPaths(rand);this.buildPond(rand);this.buildPavilion();this.buildWishTree(rand);this.buildEma();this.buildFortune();this.buildHut();this.buildGate();this.buildWalls();this.buildNature(rand);this.buildPetals(rand);
 }
 buildPaths(rand){
 const stones=[];const line=(a,b,gap=1.25)=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.round(d/gap));for(let i=0;i<=n;i++){const X=a[0]+(b[0]-a[0])*i/n,Z=a[1]+(b[1]-a[1])*i/n;if(!blocked(X,Z)||Math.abs(X-POND.x)<1.2)stones.push([X+(rand()-.5)*.35,Z+(rand()-.5)*.35])}};
 // 廣場與通往各處的石板路
 for(let a=0;a<3;a++)for(let i=0;i<10+a*7;i++){const t=i/(10+a*7)*Math.PI*2,r=1.1+a*1.15;stones.push([Math.cos(t)*r*1.25,8.6+Math.sin(t)*r*.8])}
 line([0,15],[0,10.6]);line([-1.4,7],[-3,-2.2]);line([-3,-2.2],[0,-4.4]);line([-3.4,-2],[-10.6,-1.2]);line([2.6,8.8],[4.5,8.6]);line([4.5,-2.3],[2,-4.4]);line([4.5,-2.3],[11.6,-6.2]);line([6,8.9],[13.6,5.4]);line([12.6,-5.6],[14.2,3.4]);
 const geo=cyl(.52,.56,.12,10),m1=new THREE.InstancedMesh(geo,mat(C.stone),stones.length),m2=new THREE.InstancedMesh(geo,mat(C.stone2),stones.length);
 const d=new THREE.Object3D();let a=0,b=0;
 for(const [X,Z] of stones){if(Math.abs(X-POND.x)<1.2&&Math.abs(Z-POND.z)<POND.bridge)continue;d.position.set(X,groundY(X,Z)+.05,Z);d.rotation.y=rand()*3;const k=.8+rand()*.5;d.scale.set(k,1,k*(.8+rand()*.3));d.updateMatrix();if(rand()<.72)m1.setMatrixAt(a++,d.matrix);else m2.setMatrixAt(b++,d.matrix)}
 m1.count=a;m2.count=b;for(const m of [m1,m2]){m.receiveShadow=true;this.scene.add(m)}
 }
 buildPond(rand){
 const s=this.scene,g=new THREE.Group();g.position.set(POND.x,0,POND.z);s.add(g);
 put(g,cyl(1,1,.1,48),mat('#e9dcc6'),0,.02,0,{s:[POND.rx+.35,1,POND.rz+.35],cast:false});
 put(g,cyl(1,1,.1,48),mat(C.water,{roughness:.25}),0,.05,0,{s:[POND.rx,1,POND.rz],cast:false});
 put(g,cyl(1,1,.1,32),mat(C.water2,{roughness:.25}),-1.5,.07,.4,{s:[2.2,1,1.3],cast:false});
 for(let i=0;i<26;i++){const t=i/26*Math.PI*2+rand()*.1;if(Math.abs(Math.cos(t)*POND.rx)<1.6)continue;put(g,ball(.42+rand()*.3,1),mat(i%3?C.rock:C.rock2),Math.cos(t)*(POND.rx+.2),.12,Math.sin(t)*(POND.rz+.2),{s:[1.1,.6,1]})}
 for(let i=0;i<7;i++){const X=(rand()-.5)*POND.rx*1.4,Z=(rand()-.5)*POND.rz*1.3;if(Math.abs(X)<1.6)continue;put(g,cyl(.42,.42,.04,14),mat(C.leaf),X,.11,Z,{cast:false});if(i%2)put(g,ball(.16,1),mat(C.pink3),X,.22,Z)}
 // 錦鯉：紡錘形的身體、會擺動的尾鰭、背鰭、胸鰭與花斑
 this.koi=[];const looks=[['#f58a3c','#fff3e6'],['#fff6ea','#f0502d'],['#f5b23c','#fff6ea'],['#fff6ea','#3b3a45'],['#f0502d','#fff3e6'],['#f7c9a0','#f58a3c']];
 for(let i=0;i<6;i++){const [main,patch]=looks[i],f=new THREE.Group(),k=.85+(i%3)*.15,o={cast:false};
 put(f,ball(.5,2),mat(main,{roughness:.45}),0,0,0,{s:[1,.34,.38],...o});           // 身體
 put(f,ball(.26,2),mat(main,{roughness:.45}),.36,0,0,{s:[1,.5,.62],...o});          // 頭
 put(f,ball(.2,1),mat(patch,{roughness:.45}),.08,.11,.02,{s:[1.1,.3,.7],...o});put(f,ball(.13,1),mat(patch,{roughness:.45}),-.2,.1,-.03,{s:[1,.3,.8],...o}); // 花斑
 put(f,ball(.03,0),mat('#2b2530'),.5,.06,.1,o);put(f,ball(.03,0),mat('#2b2530'),.5,.06,-.1,o); // 眼睛
 put(f,new THREE.ConeGeometry(.1,.3,4),mat(main),0,.14,0,{s:[1.6,.5,.15],...o});   // 背鰭
 const finL=put(f,ball(.14,1),mat(patch),.16,-.02,.2,{s:[.9,.12,.55],ry:.6,...o}),finR=put(f,ball(.14,1),mat(patch),.16,-.02,-.2,{s:[.9,.12,.55],ry:-.6,...o});
 const tail=new THREE.Group();tail.position.x=-.44;f.add(tail);
 put(tail,ball(.2,1),mat(main),-.1,0,0,{s:[.9,.3,.32],...o});put(tail,new THREE.ConeGeometry(.24,.42,4),mat(patch),-.36,0,0,{rz:-Math.PI/2,s:[1,1,.18],...o});
 f.scale.setScalar(k);f.position.y=.14;g.add(f);this.koi.push({f,tail,finL,finR,a:i*1.1,r:.42+.08*(i%4),side:i%2?1:-1,sp:.22+.05*i})}
 // 拱橋：木板沿著弧線鋪
 const n=14;for(let i=0;i<n;i++){const z0=-POND.bridge+(i+.5)*2*POND.bridge/n,Z=POND.z+z0,y=bridgeY(Z),slope=Math.atan2(bridgeY(Z+.1)-bridgeY(Z-.1),.2);put(g,box(2.3,.16,2*POND.bridge/n+.06),mat(i%2?C.wood:'#e6a878'),0,y-.02,z0,{rx:-slope})}
 for(const sx of [-1,1]){const pts=[];for(let i=0;i<=n;i++){const z0=-POND.bridge+i*2*POND.bridge/n;pts.push(new THREE.Vector3(sx*1.12,bridgeY(POND.z+z0)+.75,z0));if(i%2===0)put(g,cyl(.09,.09,.85,8),mat(C.column),sx*1.12,bridgeY(POND.z+z0)+.36,z0)}
 const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),28,.08,6),mat(C.column));rail.castShadow=true;g.add(rail);
 for(const e of [-1,1])put(g,ball(.16,1),mat(C.gold),sx*1.12,.95,e*POND.bridge)}
 }
 hipRoof(parent,y,size){
 const q=Math.PI/4;
 put(parent,new THREE.ConeGeometry(size*.98,size*.2,4),mat(C.roofDark),0,y+size*.1,0,{ry:q});
 put(parent,new THREE.ConeGeometry(size*.78,size*.46,4),mat(C.roof),0,y+size*.3,0,{ry:q});
 for(let i=0;i<4;i++){const a=q+i*Math.PI/2,cx=Math.cos(a),cz=Math.sin(a);
 stick(parent,[0,y+size*.53,0],[cx*size*.74,y+size*.1,cz*size*.74],.11,mat(C.trim));stick(parent,[cx*size*.74,y+size*.1,cz*size*.74],[cx*size*.99,y+.06,cz*size*.99],.11,mat(C.trim));
 put(parent,ball(.2,1),mat(C.trim),cx*size*.99,y+.12,cz*size*.99);put(parent,new THREE.ConeGeometry(.13,.5,8),mat(C.trim),cx*size*1.02,y+.4,cz*size*1.02)}
 put(parent,cyl(.2,.3,.4,10),mat(C.trim),0,y+size*.55,0);put(parent,ball(.3,2),mat(C.gold,{roughness:.4}),0,y+size*.55+.42,0);
 }
 gableRoof(parent,y,w,d,rise){
 const half=d/2+.5,len=Math.hypot(half,rise),ang=Math.atan2(rise,half);
 for(const sd of [-1,1]){put(parent,box(w+1,.26,len),mat(C.roof),0,y+rise/2,sd*half/2,{rx:sd*ang});
 for(let i=0;i<7;i++)put(parent,cyl(.1,.1,len,6),mat(C.roofDark),-w/2-.3+i*(w+.6)/6,y+rise/2+.12,sd*half/2,{rx:Math.PI/2+sd*ang})}
 put(parent,cyl(.2,.2,w+1.3,10),mat(C.trim),0,y+rise+.1,0,{rz:Math.PI/2});
 for(const e of [-1,1]){put(parent,ball(.26,1),mat(C.trim),e*(w/2+.65),y+rise+.1,0);
 const tri=new THREE.Shape();tri.moveTo(-d/2,0);tri.lineTo(d/2,0);tri.lineTo(0,rise*.86);tri.closePath();
 const m=new THREE.Mesh(new THREE.ExtrudeGeometry(tri,{depth:.2,bevelEnabled:false}),mat(C.wall));m.rotation.y=Math.PI/2;m.position.set(e*w/2-(e>0?.2:0),y,0);m.castShadow=true;parent.add(m)}
 }
 lantern(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
 put(g,cyl(.02,.02,.5,4),mat('#7a4b3a'),0,.45,0,{cast:false});put(g,cyl(.14,.14,.08,10),mat(C.gold),0,.24,0);
 put(g,ball(.3,2),mat(C.lantern,{emissive:'#ff8a4a',emissiveIntensity:.55}),0,0,0,{s:[1,1.15,1]});put(g,cyl(.14,.14,.08,10),mat(C.gold),0,-.3,0);put(g,cyl(.03,.03,.3,4),mat(C.lantern),0,-.48,0,{cast:false});
 this.swayers.push({o:g,amp:.07,sp:1.1,ph:x+z});return g}
 stoneLamp(x,z){const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);SOLIDS.push([x,z,.45]);
 put(g,cyl(.16,.22,.8,8),mat('#d9cfc4'),0,.4,0);put(g,box(.5,.42,.5),mat('#fff1c2',{emissive:'#ffd27a',emissiveIntensity:.9}),0,1,0);put(g,new THREE.ConeGeometry(.5,.34,4),mat('#cfc3d6'),0,1.38,0,{ry:Math.PI/4})}
 buildPavilion(){
 const g=new THREE.Group();g.position.set(PAV.x,0,PAV.z);this.scene.add(g);g.updateMatrixWorld();
 put(g,box(6.8,.5,6.8),mat('#efe3d2'),0,.25,0);put(g,box(6,.06,6),mat('#e8b48a'),0,.52,0,{cast:false});
 for(let i=0;i<3;i++)put(g,box(3.2,.5-i*.17,.42),mat('#efe3d2'),0,(.5-i*.17)/2,3.6+i*.4);
 for(const sx of [-1,1])for(const sz of [-1,1]){put(g,cyl(.22,.24,3.4,12),mat(C.column),sx*2.8,2.2,sz*2.8);put(g,cyl(.32,.34,.2,12),mat('#efe3d2'),sx*2.8,.6,sz*2.8)}
 for(const sd of [-1,1]){put(g,box(6.2,.3,.3),mat(C.woodDark),0,3.85,sd*2.8);put(g,box(.3,.3,6.2),mat(C.woodDark),sd*2.8,3.85,0)}
 for(const sx of [-1,1])put(g,box(.12,.7,5.2),mat(C.column),sx*2.8,.95,0);put(g,box(5.2,.7,.12),mat(C.column),0,.95,-2.8);
 const roof=new THREE.Group();g.add(roof);this.hipRoof(roof,4,5.2);this.pavRoof=[];roof.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;this.pavRoof.push(o.material)}});this.roofOpacity=1;
 for(const [X,Z] of [[-1.2,1],[1.2,1],[-1.2,-1.2],[1.2,-1.2]]){put(g,cyl(.55,.6,.16,16),mat(C.cushion),X,.62,Z);put(g,cyl(.4,.4,.05,16),mat('#d8c4ee'),X,.71,Z,{cast:false})}
 put(g,cyl(.5,.42,.36,12),mat(C.woodDark),0,.72,-.1);put(g,ball(.2,1),mat(C.pink3),0,1.02,-.1);
 this.lantern(g,-2.8,3.2,3.3);this.lantern(g,2.8,3.2,3.3);
 const sign=put(g,new THREE.CircleGeometry(.5,24),new THREE.MeshBasicMaterial({map:signTexture('靜','#fff8ec','#62b6ae')}),0,3.86,2.98,{cast:false});sign.renderOrder=1;
 }
 // 櫻花樹（祈福樹專用）：粗壯的樹幹，滿樹粉紅花球——「櫻櫻沒帶事」
 cherryTree(x,z,scale,rand){
 const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);
 const h=3.4*scale;
 put(g,cyl(.48*scale,.8*scale,h,10),mat(C.trunk),0,h/2,0,{rz:.08});
 for(const [dx,dz,rz,rx] of [[.9,0,-.75,0],[-.9,.1,.75,0],[0,.9,0,.75],[.1,-.9,0,-.75]])put(g,cyl(.16*scale,.26*scale,h*.62,6),mat(C.trunk),dx*scale,h*.98,dz*scale,{rz,rx});
 const n=96,spread=3.8*scale;
 for(let i=0;i<n;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*spread,y=h+1.4*scale+(rand()-.35)*spread*.6-r*r/spread*.32,k=.78*scale*(.7+rand()*.55);
 this.blossoms.push([new THREE.Vector3(x+Math.cos(a)*r,y,z+Math.sin(a)*r),k,k,k,7+Math.floor(rand()*3)])}
 return g}
 // 梅樹（沒事）：近黑色的老幹彎曲多節，枝條曲折、末端有筆直向上的新枝；沒有葉子，
 // 五瓣圓花帶黃色花蕊直接開在枝條上，旁邊還有深紅色的花苞
 plumTree(x,z,scale,rand,big){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=big?0:rand()*6;this.scene.add(g);g.updateMatrixWorld();
 const k=scale*(big?1.9:1),bark=mat('#4d3833'),limbs=[];
 const limb=(a,b,r,bloom)=>{stick(g,a,b,r,bark);put(g,ball(r*1.25,1),bark,b[0],b[1],b[2]);if(bloom)limbs.push([a,b])};
 const knee=[.38*k,1.05*k,.12*k],top=[.08*k,2.05*k,-.1*k];limb([0,0,0],knee,.34*k);limb(knee,top,.27*k);put(g,ball(.2*k,1),bark,knee[0]+.22*k,knee[1]-.1*k,knee[2]);
 const n=big?7:5;for(let i=0;i<n;i++){const a=i/n*Math.PI*2+rand()*.5,len=(1.5+rand()*.7)*k,dir=(a2,d,up)=>[Math.cos(a2)*d,up,Math.sin(a2)*d];
 const m1=dir(a,len*.5,len*.34),mid=[top[0]+m1[0],top[1]+m1[1],top[2]+m1[2]],e1=dir(a+.75,len*.5,len*.12),end=[mid[0]+e1[0],mid[1]+e1[1],mid[2]+e1[2]];
 limb(top,mid,.15*k,true);limb(mid,end,.09*k,true);
 const t1=dir(a-.9,len*.42,len*.22);limb(mid,[mid[0]+t1[0],mid[1]+t1[1],mid[2]+t1[2]],.07*k,true);
 limb(end,[end[0]+(rand()-.5)*.2*k,end[1]+(.7+rand()*.5)*k,end[2]+(rand()-.5)*.2*k],.045*k,true);limb(mid,[mid[0]+(rand()-.5)*.2*k,mid[1]+(.6+rand()*.4)*k,mid[2]+(rand()-.5)*.2*k],.04*k,true)}
 const up=new THREE.Vector3(0,1,0);
 for(const [a,b] of limbs){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),axis=B.clone().sub(A).normalize(),count=Math.max(2,Math.round(A.distanceTo(B)/(big?.42:.36)/Math.max(k,1)*1.1));
 for(let m=0;m<count;m++){const t=(m+.3+rand()*.5)/count,side=new THREE.Vector3(rand()-.5,rand()*.9+.25,rand()-.5).normalize();
 // 花朵貼著枝條，朝外偏上
 const normal=side.clone().addScaledVector(axis,-side.dot(axis)).normalize().lerp(up,.35).normalize(),r=(.25+rand()*.1)*(big?1.1:1),p=A.clone().lerp(B,t).addScaledVector(normal,r*.35);
 g.localToWorld(p);normal.transformDirection(g.matrixWorld);
 if(rand()<.24)this.blossoms.push([p,r*.36,r*.36,r*.36,6]);else this.flowers.push([p,r,normal,Math.floor(rand()*3),rand()*6])}}
 return g}
 // 青松（輕鬆）：微彎的樹幹，一層層扁平的松針雲片
 pineTree(x,z,scale,rand){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rand()*6;this.scene.add(g);g.updateMatrixWorld();
 const k=scale,bark=mat('#8a5a48'),lean=(rand()-.5)*.5,h=4.2*k,mid=[lean*k,h*.5,0],top=[lean*1.6*k,h,.15*k];
 stick(g,[0,0,0],mid,.3*k,bark);stick(g,mid,top,.22*k,bark);
 const pad=(px,py,pz,r)=>{const p=new THREE.Vector3(px,py,pz);g.localToWorld(p);this.blossoms.push([p,r*1.25,r*.42,r,3+Math.floor(rand()*3)])};
 [[.42,1.5],[.6,1.3],[.78,1.05],[.95,.8]].forEach(([t,r],lv)=>{const y=h*t,cx=lean*(lv<2?1:1.6)*k*t*1.6;const arms=lv===3?1:2+(lv%2);
 for(let i=0;i<arms;i++){const a=i/arms*Math.PI*2+lv*1.3+rand()*.4,d=lv===3?0:(1.25-lv*.22)*k;if(d)stick(g,[cx,y-.25*k,0],[cx+Math.cos(a)*d,y,Math.sin(a)*d],.08*k,bark);pad(cx+Math.cos(a)*d,y+.18*k,Math.sin(a)*d,r*k);pad(cx+Math.cos(a+.6)*d*.55,y+.42*k,Math.sin(a+.6)*d*.55,r*k*.7)}});
 return g}
 buildWishTree(rand){
 this.blossoms=[];this.flowers=[];const g=this.cherryTree(TREE.x,TREE.z,1.25,rand);
 put(g,cyl(1.9,2.1,.3,20),mat('#efe3d2'),0,.15,0);put(g,cyl(1.7,1.7,.32,20),mat(C.grass2),0,.16,0,{cast:false});
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=2.4+(i%3)*.5,card=new THREE.Group();card.position.set(Math.cos(a)*r,4.1+(i%2)*.4,Math.sin(a)*r);g.add(card);
 put(card,cyl(.015,.015,.7,4),mat('#d2504a'),0,-.35,0,{cast:false});put(card,box(.34,.56,.04),mat(i%3?'#ffe1ea':'#fff3d6'),0,-.95,0,{ry:a});this.swayers.push({o:card,amp:.16,sp:1.4,ph:i})}
 this.wishTree=g;
 }
 buildEma(){
 const g=new THREE.Group();g.position.set(EMA.x,0,EMA.z);g.rotation.y=.35;this.scene.add(g);this.ema=g;
 for(const sx of [-1,1]){put(g,box(.18,2.5,.18),mat(C.white),sx*1.5,1.25,0);put(g,box(.3,.16,.7),mat(C.white),sx*1.5,.08,0)}
 for(let i=0;i<3;i++)put(g,box(3.2,.1,.1),mat(C.white),0,.75+i*.6,0);
 for(const sd of [-1,1])put(g,box(3.8,.14,.9),mat(C.pink),0,2.75,sd*.36,{rx:sd*.5});put(g,cyl(.1,.1,3.9,8),mat(C.pink2),0,2.96,0,{rz:Math.PI/2});
 this.plaques=[];for(let r=0;r<3;r++)for(let c=0;c<5;c++){const p=put(g,box(.42,.34,.05),mat(c%2?'#f3cf8f':'#f8dca8'),-1.1+c*.55,.5+r*.6,.09);put(g,box(.04,.18,.02),mat('#e8798f'),-1.1+c*.55,.72+r*.6,.09,{cast:false});this.plaques.push(p)}
 const sign=put(g,new THREE.CircleGeometry(.34,20),new THREE.MeshBasicMaterial({map:signTexture('願','#fff8ec','#f29cc2')}),0,2.6,.62,{cast:false});sign.renderOrder=1;
 }
 house(x,z,ry,w,d,h,sign,color){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;this.scene.add(g);
 put(g,box(w+.8,.3,d+.8),mat('#efe3d2'),0,.15,0);put(g,box(w,h,d),mat(C.wall),0,.3+h/2,0);
 for(const sx of [-1,1])for(const sz of [-1,1])put(g,box(.26,h,.26),mat(C.column),sx*w/2,.3+h/2,sz*d/2);
 put(g,box(w+.2,.24,d+.2),mat(C.woodDark),0,.3+h,0);
 this.gableRoof(g,.4+h,w,d,1.5);
 put(g,box(1.9,.28,.5),mat('#efe3d2'),0,.14,d/2+.6);
 this.lantern(g,-w/2-.1,h-.1,d/2+.45);this.lantern(g,w/2+.1,h-.1,d/2+.45);
 const s=put(g,new THREE.CircleGeometry(.48,24),new THREE.MeshBasicMaterial({map:signTexture(sign,'#fff8ec',color)}),0,h+.75,d/2+.62,{cast:false});s.renderOrder=1;
 return g}
 buildFortune(){
 const g=this.house(FORTUNE.x,FORTUNE.z,0,5,3.4,2.6,'籤','#e8553f'),d=1.7;
 put(g,box(3.4,1.5,.3),mat('#7a4b3a'),0,1.75,d-.1,{cast:false});put(g,box(3.8,.24,1),mat(C.wood),0,1,d+.3);put(g,box(3.6,.7,.5),mat(C.woodDark),0,.62,d+.2);
 put(g,cyl(.3,.26,.6,12),mat('#c9764d'),-.6,1.42,d+.35);for(let i=0;i<5;i++)put(g,box(.05,.6,.05),mat('#f6e2b0'),-.75+i*.075,1.85,d+.3+(i%2)*.08,{rz:(i-2)*.09});
 put(g,cyl(.22,.22,.1,12),mat(C.pink2),.6,1.17,d+.35);put(g,ball(.16,1),mat(C.pink3),.6,1.3,d+.35);
 for(const sx of [-1,1]){put(g,cyl(.34,.28,.5,10),mat('#d98a66'),sx*3.3,.25,d+.3);for(let i=0;i<3;i++){put(g,cyl(.07,.07,1.7+i*.35,6),mat(C.leaf),sx*3.3+(i-1)*.16,1.2+i*.17,d+.3);put(g,ball(.2,0),mat(C.leaf2),sx*3.3+(i-1)*.16,2.1+i*.35,d+.3,{s:[1.4,.5,.7]})}}
 }
 buildHut(){
 // 補運光苗：原創設計的大花苗。淡綠色的莖從地面長出後向補運台彎下，末端是一朵會發光的蓮花苞。
 const g=new THREE.Group();g.position.set(HUT.x,0,HUT.z);this.scene.add(g);this.sprout=g;
 const pts=[[0,0,0],[.25,2.2,0],[.1,4.6,0],[-.7,6.9,0],[-2.2,8.3,0],[-3.4,8.3,0],[-3.7,7.7,0]].map(p=>new THREE.Vector3(...p));
 const stem=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.3,10),mat('#bfe9d0'));stem.castShadow=true;g.add(stem);
 put(g,cyl(1.5,1.7,.3,24),mat('#efe3d2'),0,.15,0);put(g,cyl(1.3,1.3,.34,24),mat(C.grass2),0,.16,0,{cast:false});
 const leaf=(x,y,z,ry,rz,k)=>put(g,ball(1,2),mat('#8fd6aa'),x,y,z,{s:[1.5*k,.16*k,.62*k],ry,rz});
 leaf(1.2,1,.3,.3,.5,1);leaf(-1.1,.8,-.3,2.9,.45,.9);leaf(1.05,3.6,0,0,.6,.7);leaf(-.75,5.3,.1,3.1,.5,.6);
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2;put(g,ball(.16,1),mat([C.pink3,'#fff3d6','#c9b3ee'][i%3]),Math.cos(a)*1.15,.42,Math.sin(a)*1.15,{cast:false})}
 const bud=new THREE.Group();bud.position.set(-3.7,7.5,0);g.add(bud);this.bud=bud;
 this.budMat=new THREE.MeshStandardMaterial({color:'#fff4c4',emissive:'#ffd76a',emissiveIntensity:.7,roughness:.5});
 const core=new THREE.Mesh(ball(.55,2),this.budMat);core.scale.set(1,1.15,1);bud.add(core);
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2,pt=put(bud,ball(.42,1),mat('#ffd9e6',{emissive:'#ffb3cf',emissiveIntensity:.25}),Math.cos(a)*.5,.12,Math.sin(a)*.5,{s:[.55,1.1,.3],ry:-a+Math.PI/2});pt.rotation.z=.45}
 put(bud,cyl(.34,.2,.3,10),mat('#8fd6aa'),0,.72,0);
 for(let i=0;i<6;i++){const st=put(g,new THREE.OctahedronGeometry(.15),mat(C.gold,{emissive:'#ffd66b',emissiveIntensity:.8}),0,0,0,{cast:false});this.animated.push(t=>{const a=t*.8+i*1.047;st.position.set(-3.7+Math.cos(a)*1.3,7.5+Math.sin(t*2+i)*.35,Math.sin(a)*1.3);st.rotation.y=t*2})}
 // 排隊的小地墊
 for(let i=1;i<=5;i++)put(this.scene,cyl(.42,.42,.04,14),mat('#fbe2ea'),ALTAR.x,.03,ALTAR.z+1.5+i*1.25,{cast:false});
 // 補運台：金色圓台，外圈一圈小星
 put(this.scene,cyl(1.25,1.35,.14,28),mat('#fff1c9'),ALTAR.x,.07,ALTAR.z,{cast:false});put(this.scene,cyl(.95,.95,.16,28),mat('#ffe08a',{emissive:'#ffd466',emissiveIntensity:.45}),ALTAR.x,.08,ALTAR.z,{cast:false});
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;put(this.scene,new THREE.OctahedronGeometry(.09),mat(C.gold,{emissive:'#ffd66b',emissiveIntensity:.7}),ALTAR.x+Math.cos(a)*1.12,.2,ALTAR.z+Math.sin(a)*1.12,{cast:false})}
 }
 buildGate(){
 const g=new THREE.Group();g.position.set(0,0,16.6);this.scene.add(g);this.gate=g;
 for(const sx of [-1,1]){put(g,cyl(.3,.32,4,12),mat(C.column),sx*2.6,2,0);put(g,box(.9,.4,.9),mat('#efe3d2'),sx*2.6,.2,0);this.lantern(g,sx*1.8,3,.1)}
 put(g,box(6.6,.36,.5),mat(C.woodDark),0,3.7,0);put(g,box(3.2,.7,.2),mat(C.wall),0,3.15,0);
 this.gableRoof(g,4,6,1.6,1);
 const s=put(g,new THREE.PlaneGeometry(3,.62),new THREE.MeshBasicMaterial({map:(()=>{const c=document.createElement('canvas');c.width=512;c.height=106;const x=c.getContext('2d');x.fillStyle='#fcf0de';x.fillRect(0,0,512,106);x.fillStyle='#8a4a5e';x.font='bold 70px "Noto Sans TC",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('草商輔導寺',256,58);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})()}),0,3.15,.11,{cast:false});
 const back=s.clone();back.rotation.y=Math.PI;back.position.z=-.11;g.add(back);
 }
 buildWalls(){
 // 四面矮牆各自成組：鏡頭繞到牆外時，把擋住視線的那一面收起來
 this.walls={n:new THREE.Group(),s:new THREE.Group(),e:new THREE.Group(),w:new THREE.Group()};
 const seg=(s,x,z,w,d)=>{put(s,box(w,1.3,d),mat(C.wall),x,.65,z);put(s,box(w+.3,.24,d+.3),mat(C.roof),x,1.4,z);put(s,cyl(.14,.14,Math.max(w,d)+.3,8),mat(C.roofDark),x,1.58,z,w>d?{rz:Math.PI/2}:{rx:Math.PI/2})};
 seg(this.walls.n,0,-16.6,44,.6);seg(this.walls.w,-22.6,0,.6,33.8);seg(this.walls.e,22.6,0,.6,33.8);seg(this.walls.s,-12.9,16.6,19.4,.6);seg(this.walls.s,12.9,16.6,19.4,.6);
 this.walls.s.add(this.gate);for(const g of Object.values(this.walls))this.scene.add(g);
 }
 buildNature(rand){
 const s=this.scene;
 const trees=[[-19.5,-13.5,1.25],[-7,-14,1.1],[7.5,-14.2,1],[19.5,-13.5,1.3],[-20,2,1.15],[-19.5,13,1.3],[-15.2,6.4,1.05],[-9.5,14,1],[11,14,1.05],[19.8,13,1.25],[20,-3,1.1],[19.6,9.4,.95],[-5.5,-7.5,.9],[6.2,-6.4,.85],[-18.5,-6.5,.9]];
 // 青松與梅樹交錯種植：輕鬆、沒事
 trees.forEach(([x,z,k],i)=>{if(i%2)this.plumTree(x,z,k*1.15,rand,false);else this.pineTree(x,z,k,rand);SOLIDS.push([x,z,.55])});
 // 梅花（三種紅粉白）與松針雲片（三種綠）各用一個實例化網格畫完
 const geo=ball(1,2),groups=['#f08fb4','#fde3ec','#e2567f','#4f9a6a','#3f8a5e','#6bb37f','#c8325f',C.pink,C.pink2,C.pink3].map(c=>new THREE.InstancedMesh(geo,mat(c),this.blossoms.length)),counts=groups.map(()=>0),d=new THREE.Object3D();
 for(const [p,sx,sy,sz,c] of this.blossoms){d.position.copy(p);d.scale.set(sx,sy,sz);d.updateMatrix();groups[c].setMatrixAt(counts[c]++,d.matrix)}
 groups.forEach((m,i)=>{m.count=counts[i];m.castShadow=true;m.receiveShadow=true;s.add(m)});
 // 梅花：五片圓花瓣合成一個幾何體，三種花色各一個實例化網格；黃色花蕊另成一組
 const petal=new THREE.SphereGeometry(1,7,4),parts=[];
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2;d.position.set(Math.cos(a)*.56,.05,Math.sin(a)*.56);d.rotation.set(0,-a,0);d.rotateZ(.32);d.scale.set(.46,.13,.42);d.updateMatrix();parts.push([petal,d.matrix.clone()])}
 const flowerGeo=mergeGeo(parts),n=Math.max(1,this.flowers.length),fl=['#fff4f6','#f9a8c4','#e8517c'].map(c=>new THREE.InstancedMesh(flowerGeo,mat(c,{roughness:.7}),n)),hearts=new THREE.InstancedMesh(ball(.26,1),mat('#f6c945',{emissive:'#e0a020',emissiveIntensity:.25}),n),fc=[0,0,0],yAxis=new THREE.Vector3(0,1,0),spin=new THREE.Quaternion();
 this.flowers.forEach(([p,r,normal,c,turn],i)=>{d.position.copy(p);d.quaternion.setFromUnitVectors(yAxis,normal).multiply(spin.setFromAxisAngle(yAxis,turn));d.scale.setScalar(r);d.updateMatrix();fl[c].setMatrixAt(fc[c]++,d.matrix);d.position.addScaledVector(normal,r*.12);d.updateMatrix();hearts.setMatrixAt(i,d.matrix)});
 fl.forEach((m,i)=>{m.count=fc[i];m.castShadow=true;s.add(m)});hearts.count=this.flowers.length;s.add(hearts);
 const rocks=[[-17,-10.5,1.3],[-16,-11.8,.8],[17,-12,1.2],[9,-12.6,.8],[-20,8,1],[-9.5,5,.75],[20,9.5,1.1],[-3,13.5,.7],[15,12,.9],[-20,-2,.8],[9.6,-2.4,.6],[-17,-9,.6]];
 for(const [x,z,r] of rocks){put(s,ball(r,1),mat(rand()<.5?C.rock:C.rock2),x,r*.45,z,{s:[1.15,.8,1],ry:rand()*3});SOLIDS.push([x,z,r*.9])}
 for(let i=0;i<46;i++){const x=(rand()-.5)*42,z=(rand()-.5)*30;if(blocked(x,z)||Math.hypot(x,z-8.6)<5||Math.abs(x)<2.2)continue;
 if(i%3===0){put(s,ball(.55+rand()*.3,1),mat(i%2?C.leaf:C.leaf2),x,.3,z,{s:[1.2,.75,1.1]});for(let k=0;k<4;k++)put(s,ball(.11,0),mat([C.pink3,'#fff3d6','#c9b3ee'][k%3]),x+(rand()-.5)*.9,.62+rand()*.15,z+(rand()-.5)*.8,{cast:false})}
 else for(let k=0;k<5;k++)put(s,new THREE.ConeGeometry(.07,.5+rand()*.3,4),mat(C.leaf),x+(rand()-.5)*.5,.25,z+(rand()-.5)*.5,{rz:(rand()-.5)*.5,cast:false})}
 for(const [x,z] of [[-2.4,12.6],[2.4,12.6],[-4.2,-3.8],[4.2,-3.8],[-7.6,9.2],[11.2,7.2],[9.4,-5.4],[-8,-.2],[15.2,1.2],[-15.5,10.6]])this.stoneLamp(x,z);
 }
 buildPetals(rand){
 const n=this.reduceMotion?0:110,geo=new THREE.CircleGeometry(.11,5);this.petals=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:'#ffc4da',side:THREE.DoubleSide}),Math.max(n,1));this.petals.count=n;this.petals.frustumCulled=false;this.scene.add(this.petals);
 this.petalData=Array.from({length:n},()=>({x:(rand()-.5)*50,y:rand()*11,z:(rand()-.5)*38,v:.5+rand()*.7,ph:rand()*6,sp:.6+rand()}));this.dummy=new THREE.Object3D();
 }

 /** 新的心願：一塊繪馬掛上架子，祈福樹也多一張卡片（只在自己的畫面上）。 */
 hangWish(){
 if(!this.ok)return;const p=this.plaques[this.wishSlot++%this.plaques.length];p.material=mat('#ffd0de',{emissive:'#ff9dbb',emissiveIntensity:.35});
 const y0=p.position.y,start=performance.now();
 if(!this.reduceMotion)this.animated.push(t=>{const k=Math.min(1,(performance.now()-start)/900);p.position.y=y0+(1-k)*(1-k)*2.2;p.rotation.z=Math.sin(k*9)*(1-k)*.5;return k<1});
 }

 // ── 操作：點地面走路、拖曳平移／旋轉、雙指縮放旋轉、滾輪縮放、鍵盤 ──
 bindInput(){
 const c=this.canvas,ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 const groundAt=e=>{const b=c.getBoundingClientRect();ndc.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(ndc,this.camera);const hit=ray.intersectObject(this.ground)[0];return hit&&hit.point};
 const pair=()=>{const [a,b]=[...this.pointers.values()];return{d:Math.hypot(a.x-b.x,a.y-b.y),a:Math.atan2(b.y-a.y,b.x-a.x)}};
 c.addEventListener('contextmenu',e=>e.preventDefault());
 c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now(),drag:false,rot:e.button===2||e.shiftKey});if(this.pointers.size===2)this.pinch=pair()});
 c.addEventListener('pointermove',e=>{const p=this.pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(this.pointers.size===2){const now=pair();if(this.pinch){this.cam.dist=clamp(this.cam.dist*this.pinch.d/Math.max(now.d,1),9,46);let da=now.a-this.pinch.a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;this.cam.yaw-=da}this.pinch=now;for(const q of this.pointers.values())q.drag=true;return}
 if(!p.drag&&Math.hypot(e.clientX-p.sx,e.clientY-p.sy)<8)return;p.drag=true;if(this.swipe)return;
 if(p.rot||this.cam.mode==='rotate'){this.cam.yaw-=dx*.007;this.cam.pitch=clamp(this.cam.pitch+dy*.004,.35,1.15)}
 else{const k=2*this.cam.dist*Math.tan(this.camera.fov*Math.PI/360)/this.h,sy=Math.sin(this.cam.yaw),cy=Math.cos(this.cam.yaw);this.cam.follow=false;this.cam.t.x+=(-cy*dx-sy*dy/Math.sin(this.cam.pitch))*k;this.cam.t.z+=(sy*dx-cy*dy/Math.sin(this.cam.pitch))*k;this.cam.t.x=clamp(this.cam.t.x,-24,24);this.cam.t.z=clamp(this.cam.t.z,-18,18)}});
 const up=e=>{const p=this.pointers.get(e.pointerId);this.pointers.delete(e.pointerId);this.pinch=undefined;if(p&&this.swipe&&p.drag&&Math.hypot(e.clientX-p.sx,e.clientY-p.sy)>45){this.addSwipe();return}if(!p||p.drag||e.type==='pointercancel'||performance.now()-p.t>600||p.rot)return;const who=this.pickActor(e);if(who){this.openCheer(who);return}this.closeCheer();const pt=groundAt(e);if(pt)this.walkTo(pt.x,pt.z)};
 c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
 c.addEventListener('wheel',e=>{e.preventDefault();this.cam.dist=clamp(this.cam.dist*(e.deltaY>0?1.1:.9),9,46)},{passive:false});
 const typing=()=>document.querySelector('dialog[open]')||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'');
 const KEY={ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r'};
 window.addEventListener('keydown',e=>{if(typing()||!this.uid||e.ctrlKey||e.metaKey||e.altKey)return;if(KEY[e.code]){this.keys.add(KEY[e.code]);e.preventDefault()}else if(e.code==='Space'){this.doJump();e.preventDefault()}else if(e.code==='KeyE'&&this.near>=0)this.interact(this.near)});
 window.addEventListener('keyup',e=>{if(KEY[e.code])this.keys.delete(KEY[e.code])});
 window.addEventListener('blur',()=>this.keys.clear());
 this.host.querySelector('.g3-hud').addEventListener('click',e=>{const act=e.target.closest('button')?.dataset.act;if(!act)return;
 if(act==='jump')this.doJump();if(act==='home'){this.cam.follow=true}if(act==='in')this.cam.dist=clamp(this.cam.dist*.82,9,46);if(act==='out')this.cam.dist=clamp(this.cam.dist*1.2,9,46);if(act==='spin')this.spinTo=(this.spinTo??this.cam.yaw)+Math.PI/4;
 if(act==='mode'){this.cam.mode=this.cam.mode==='pan'?'rotate':'pan';e.target.closest('button').textContent=this.cam.mode==='pan'?'拖曳：平移':'拖曳：旋轉'}});
 this.cheerBox=this.host.querySelector('.g3-cheer');
 this.cheerBox.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=this.cheerTo;this.closeCheer();if(b.dataset.cheer&&id&&this.players[id])this.cheer(id,b.dataset.cheer)});
 this.prompt.addEventListener('click',()=>{if(this.near>=0)this.interact(this.near)});
 this.labels.addEventListener('click',e=>{const i=e.target.closest('[data-spot]')?.dataset.spot;if(i!==undefined)this.goSpot(Number(i))});
 }
 walkTo(X,Z){const me=this.players[this.uid];if(!me)return;const from=this.pos?[this.pos.x,this.pos.z]:toWorld(me.x,me.y);this.path=route(from,[clamp(X,-BOUND.x,BOUND.x),clamp(Z,BOUND.zMin,BOUND.zMax)]);const [x,z]=this.path.shift();this.target={x,z};this.pendingSpot=-1;this.cam.follow=true;this.stuck=0}
 /** 走到某個互動點，抵達後自動開啟。 */
 goSpot(i){const me=this.players[this.uid];if(!me){this.interact(i);return}const [X,Z]=toWorld(me.x,me.y);const to=STAND[i];
 if(Math.hypot(X-to[0],Z-to[1])<2.4){this.interact(i);return}this.walkTo(to[0],to[1]);this.pendingSpot=i;this.spotGoal=to}
 /** 請玩家在畫面上滑動 needed 下（也可以按按鈕），完成後呼叫 done。滑動期間不會平移或旋轉鏡頭。 */
 beginSwipe(needed,done){
 const box=this.host.querySelector('.g3-swipe');this.swipe={needed,count:0,done};box.hidden=false;
 box.querySelector('p').textContent='輪到你了！在畫面上滑 '+needed+' 下，接引聖光';box.querySelector('button').onclick=()=>this.addSwipe();this.drawPips()}
 cancelSwipe(){this.swipe=undefined;this.host.querySelector('.g3-swipe').hidden=true}
 drawPips(){const sw=this.swipe;this.host.querySelector('.g3-pips').textContent=sw?'●'.repeat(sw.count)+'○'.repeat(sw.needed-sw.count):''}
 addSwipe(){
 const sw=this.swipe;if(!sw)return;sw.count++;this.drawPips();
 // 每滑一下，光苗晃一晃、花苞亮一下
 if(this.ok){const start=performance.now();this.animated.push(()=>{const k=Math.min(1,(performance.now()-start)/700);this.sprout.rotation.z=this.reduceMotion?0:Math.sin(k*18)*(1-k)*.05;this.budMat.emissiveIntensity=.7+(1-k)*1.6;return k<1})}
 if(sw.count>=sw.needed){this.cancelSwipe();sw.done()}}
 /** 找一個空的蒲團（靜心亭共四個）。坐滿時回傳 null。 */
 findSeat(){
 const seats=CUSHIONS.map(([X,Z])=>toDb(PAV.x+X,Z));
 const taken=p=>Object.entries(this.players).some(([id,o])=>id!==this.uid&&o.state==='meditating'&&Math.abs(o.x-p.x)<=8&&Math.abs(o.y-p.y)<=6);
 return seats.find(p=>!taken(p))||null}
 /** 點到的是哪一位同學（不含自己）；沒有點到人則回傳 undefined。 */
 pickActor(e){
 const b=this.canvas.getBoundingClientRect(),px=e.clientX-b.left,py=e.clientY-b.top,v=new THREE.Vector3();let best,bd=1e9;
 for(const [id,a] of this.actors){if(id===this.uid||!this.players[id])continue;
 v.copy(a.root.position);v.y+=a.h;v.project(this.camera);const topY=(1-v.y)/2*this.h;
 v.copy(a.root.position);v.project(this.camera);if(v.z>1)continue;const x=(v.x+1)/2*this.w,footY=(1-v.y)/2*this.h,half=Math.max(18,(footY-topY)*.42);
 if(Math.abs(px-x)<half&&py>topY-10&&py<footY+8){const d=Math.abs(px-x);if(d<bd){bd=d;best=id}}}
 return best}
 openCheer(id){this.cheerTo=id;this.cheerBox.firstChild.textContent='給「'+this.players[id].name+'」一句打氣';this.cheerBox.hidden=false}
 closeCheer(){this.cheerTo=undefined;if(this.cheerBox)this.cheerBox.hidden=true}
 /** 從某個景點走出來，停在它前方的空地（不會再開啟互動）。 */
 walkOut(i){this.walkTo(STAND[i][0],STAND[i][1]+.9)}
 /** 在庭院上方跳出一則短訊息，幾秒後自動消失。 */
 toast(text){const el=this.host.querySelector('.g3-toast');el.textContent=text;el.hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>{el.hidden=true},3500)}
 /** 停止自動行走（例如被安排坐下或排隊時）。 */
 stop(){this.target=undefined;this.path=undefined;this.pendingSpot=-1}
 doJump(){if(this.jump.y===0&&this.players[this.uid])this.jump.v=6.2}

 // ── 人物：面向鏡頭的立牌，胸口疊上原始校徽 ──
 actor(id){
 let a=this.actors.get(id);if(a)return a;
 const tl=new THREE.TextureLoader(),o=this.opts;
 if(!this.tex){this.tex={};for(const k of Object.keys(o.anchors)){const t=tl.load(o.assetBase+'art/students/'+k+'.webp');t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;this.tex[k]=new THREE.MeshBasicMaterial({map:t,alphaTest:.5,side:THREE.DoubleSide})}
 // 背面圖：往遠離鏡頭的方向走時使用，和站姿圖同尺寸（後腦勺是頭髮、沒有校徽）
 for(const k of Object.keys(LEGS)){const t=tl.load(o.assetBase+'art/students/'+k.replace('-standing','-back')+'.webp');t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;this.tex[k.replace('-standing','-back')]=new THREE.MeshBasicMaterial({map:t,alphaTest:.5,side:THREE.DoubleSide})}
 const e=tl.load(o.emblemUrl);e.colorSpace=THREE.SRGBColorSpace;e.anisotropy=8;this.emblemMat=new THREE.MeshBasicMaterial({map:e,transparent:true,alphaTest:.3});
 this.unit=new THREE.PlaneGeometry(1,1);this.unit.translate(0,.5,0);this.unitC=new THREE.PlaneGeometry(1,1);
 this.parts={};for(const [k,L] of Object.entries(LEGS))this.parts[k]={upper:partGeo(0,1,0,L.cut+.012,.5,1),legL:partGeo(0,L.split,L.cut-.02,1,L.l,L.cut+.01),legR:partGeo(L.split,1,L.cut-.02,1,L.r,L.cut+.01)}}
 const root=new THREE.Group(),bill=new THREE.Group(),fig=new THREE.Group();
 // rig 內的座標以「腳底中央」為原點、圖高為 1；body 是上半身（坐姿時是整張圖），兩條腿各自以髖部為支點
 const rig=new THREE.Group(),body=new THREE.Mesh(this.unit,this.tex['short-standing']),legL=new THREE.Mesh(this.unit,this.tex['short-standing']),legR=new THREE.Mesh(this.unit,this.tex['short-standing']),emblem=new THREE.Mesh(this.unitC,this.emblemMat);emblem.renderOrder=2;
 body.position.z=.004;rig.add(legL,legR,body);fig.add(rig,emblem);bill.add(fig);root.add(bill);
 const shadow=put(root,new THREE.CircleGeometry(.5,20),new THREE.MeshBasicMaterial({color:'#3e352d',transparent:true,opacity:.2,depthWrite:false}),0,.03,0,{rx:-Math.PI/2,cast:false});
 const ring=put(root,new THREE.RingGeometry(.52,.62,28),new THREE.MeshBasicMaterial({color:'#fff',transparent:true,opacity:.95,depthWrite:false}),0,.04,0,{rx:-Math.PI/2,cast:false});
 const stars=[0,1,2,3,4,5,6,7].map(()=>put(root,new THREE.OctahedronGeometry(.13),mat(C.gold,{emissive:'#ffd66b',emissiveIntensity:1}),0,1,0,{cast:false}));
 // 聖光：從上方灑下的光柱與腳下的光暈，補運時才顯示
 const glow=(o,add)=>new THREE.MeshBasicMaterial({color:add?'#fff3b8':'#ffe27a',transparent:true,opacity:o,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
 const beam=new THREE.Group();beam.visible=false;root.add(beam);
 const outer=new THREE.Mesh(new THREE.CylinderGeometry(.5,1.35,7,28,1,true),glow(.1)),inner=new THREE.Mesh(new THREE.CylinderGeometry(.2,.8,7,24,1,true),glow(.12)),halo=new THREE.Mesh(new THREE.CircleGeometry(1.5,32),glow(.3,true));
 outer.position.y=inner.position.y=3.5;halo.rotation.x=-Math.PI/2;halo.position.y=.2;beam.add(outer,inner,halo);beam.userData={outer,inner,halo};
 const tag=document.createElement('div');tag.className='g3-tag';tag.innerHTML='<span class="g3-status" hidden></span><span class="g3-name"></span>';this.labels.append(tag);
 this.scene.add(root);
 a={root,bill,fig,rig,beam,body,legL,legR,phase:0,walk:0,side:1,key:'',emblem,shadow,ring,stars,tag,X:NaN,Z:0,y:0,flip:1,movingUntil:0,seed:this.actors.size*1.7,name:'',status:''};this.actors.set(id,a);return a}

 frame(t,dt){
 const cam=this.cam,me=this.players[this.uid];
 // 自己的移動：鍵盤優先，其次走向點擊的位置
 if(me){
 let [X,Z]=toWorld(me.x,me.y);
 // this.pos 保留小數位置；若資料庫座標被其他程式改動（例如坐上蒲團），以資料庫為準
 if(this.pos){const db=toDb(this.pos.x,this.pos.z);if(db.x===Math.round(me.x)&&db.y===Math.round(me.y)){X=this.pos.x;Z=this.pos.z}else this.pos=undefined}
 let vx=0,vz=0;const k=this.keys,sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw);
 if(k.size){const f=(k.has('u')?1:0)-(k.has('d')?1:0),r=(k.has('r')?1:0)-(k.has('l')?1:0);vx=-sy*f+cy*r;vz=-cy*f-sy*r;const n=Math.hypot(vx,vz);if(n){vx/=n;vz/=n;this.target=undefined;this.path=undefined;this.pendingSpot=-1;cam.follow=true}}
 else if(this.target){const dx=this.target.x-X,dz=this.target.z-Z,d=Math.hypot(dx,dz);if(d<.15&&this.path?.length){const [x,z]=this.path.shift();this.target={x,z}}else if(d<.15){this.target=undefined;if(this.pendingSpot>=0){const i=this.pendingSpot;this.pendingSpot=-1;this.interact(i)}}else{vx=dx/d;vz=dz/d}}
 if(vx||vz){const step=SPEED*dt;let nx=X+vx*step,nz=Z+vz*step;
 if(blocked(nx,nz)&&!blocked(X,Z)){if(!blocked(nx,Z))nz=Z;else if(!blocked(X,nz))nx=X;else{nx=X;nz=Z}}
 if(Math.hypot(nx-X,nz-Z)<step*.2){this.stuck=(this.stuck||0)+dt;if(this.stuck>.5&&this.target){const i=this.pendingSpot;this.target=undefined;this.pendingSpot=-1;if(i>=0&&Math.hypot(X-this.spotGoal[0],Z-this.spotGoal[1])<3.2)this.interact(i)}}else this.stuck=0;
 // 靜心亭：走進去就自動開始選時間；四個蒲團都有人時進不去
 const inPav=(x,z)=>Math.abs(x-PAV.x)<3.4&&Math.abs(z-PAV.z)<3.4;let entered=false;
 if(inPav(nx,nz)&&!inPav(X,Z)&&me.state!=='meditating'){if(this.findSeat())entered=true;else{nx=X;nz=Z;this.stop();if(!this.fullAt||t-this.fullAt>3){this.fullAt=t;this.toast('現在蒲團滿位，請排隊稍等。')}}}
 if(nx!==X||nz!==Z){this.pos={x:nx,z:nz};const db=toDb(nx,nz);me.x=db.x;me.y=db.y;this.moved(db.x,db.y)}
 // 祈福樹、求籤屋、補運台：走進範圍就自動開啟詢問視窗（排隊或補運進行中不重複開啟）
 let auto=-1;if(!entered&&me.state!=='queue'&&me.state!=='blessing')for(const [i,cx,cz,r] of AUTO)if(Math.hypot(nx-cx,nz-cz)<r&&Math.hypot(X-cx,Z-cz)>=r){auto=i;break}
 if(entered||auto>=0){this.stop();this.keys.clear();this.interact(entered?2:auto)}}

 // 跳躍只是自己畫面上的動作，不會同步給別人
 if(this.jump.v||this.jump.y){this.jump.y+=this.jump.v*dt;this.jump.v-=18*dt;if(this.jump.y<=0){this.jump.y=0;this.jump.v=0}}
 }
 // 所有人物
 const camRight={x:Math.cos(cam.yaw),z:-Math.sin(cam.yaw)};
 for(const [id,p] of Object.entries(this.players)){
 const a=this.actor(id),local=id===this.uid;let [tx,tz]=toWorld(p.x,p.y);if(local&&this.pos){tx=this.pos.x;tz=this.pos.z}
 if(Number.isNaN(a.X)){a.X=tx;a.Z=tz}
 const gap=Math.hypot(tx-a.X,tz-a.Z);let nx=tx,nz=tz;
 if(!local&&gap>.05&&gap<12){const step=Math.min(gap,Math.max(gap*5,1.2)*dt);nx=a.X+(tx-a.X)/gap*step;nz=a.Z+(tz-a.Z)/gap*step}
 const dx=nx-a.X,dz=nz-a.Z;const moved=Math.hypot(dx,dz),speed=dt>0?moved/dt:0;
 if(moved>.0005){const side=dx*camRight.x+dz*camRight.z,away=-(dx*Math.sin(cam.yaw)+dz*Math.cos(cam.yaw));if(Math.abs(side)>moved*.25)a.flip=side<0?-1:1;
 // 面向：往鏡頭遠處走時轉身露出背面，往鏡頭走或橫向走時是正面（留一點緩衝，避免在臨界角度來回翻面）
 if(away>moved*.45)a.back=true;else if(away<moved*.2)a.back=false;a.side+=(Math.min(1,Math.abs(side)/moved)-a.side)*Math.min(1,dt*8);a.phase+=moved/STRIDE*Math.PI}
 a.walk+=((speed>.5?1:0)-a.walk)*Math.min(1,dt*(speed>.5?14:9));
 a.X=nx;a.Z=nz;
 const seated=p.state==='meditating'||p.state==='resting',base=spriteBase(p.style);
 // 沒有坐姿圖的造型：坐下時沿用站姿圖，收起雙腿、把上半身放到蒲團上
 const tucked=seated&&!this.opts.anchors[base+'-seated'],key=base+'-'+(seated&&!tucked?'seated':'standing'),an=this.opts.anchors[key];
 const full=(seated&&!tucked?1.45:1.95)*(an.scale||1),drop=tucked?(1-LEGS[key].cut)*full-.08:0,h=full-drop,w=full*an.width/an.height,lift=p.state==='resting'?.6:0;
 const gy=groundY(nx,nz)+lift;a.y+=(gy-a.y)*Math.min(1,dt*14);
 a.root.position.set(nx,a.y+(local?this.jump.y:0),nz);
 a.bill.quaternion.copy(this.camera.quaternion);
 // 立牌面向鏡頭時頭會往後仰，容易插進椅背或牆面；沿視線把立牌往鏡頭方向挪一點（畫面上的位置與大小幾乎不變），就不會被身後的東西切掉一半
 const toCam=this.camera.position.clone().sub(a.root.position).normalize();a.bill.position.copy(toCam.multiplyScalar(h*Math.sin(cam.pitch)*.95));
 const showBack=Boolean(a.back)&&!seated,texKey=showBack?key.replace('-standing','-back'):key;if(a.texKey!==texKey){a.texKey=texKey;a.body.material=a.legL.material=a.legR.material=this.tex[texKey]}
 if(a.key!==key){a.key=key;const P=this.parts[key];
 if(P){const L=LEGS[key];a.body.geometry=P.upper;a.body.position.set(0,0,.004);a.legL.geometry=P.legL;a.legL.position.set(L.l-.5,1-L.cut-.01,0);a.legR.geometry=P.legR;a.legR.position.set(L.r-.5,1-L.cut-.01,0)}else{a.body.geometry=this.unit;a.body.position.set(0,0,.004)}}
 a.legL.visible=a.legR.visible=Boolean(this.parts[key])&&!tucked;const face=showBack?-a.flip:a.flip;a.rig.scale.set(w*face,full,1);a.rig.position.y=-drop;a.emblem.visible=!showBack;
 const es=w*an.size;a.emblem.scale.set(es,es,1);a.emblem.position.set((an.x-.5)*w*a.flip,(1-an.y)*full-drop,.02);
 // 走路：兩腿交替。橫向移動時前後擺腿，朝鏡頭或遠離鏡頭時改為交替抬腳；身體每一步輕輕起伏。
 const k=seated||this.reduceMotion?0:a.walk,sw=Math.sin(a.phase),swing=.5*a.side*k,raise=(.07+.11*(1-a.side))*k;
 a.legL.rotation.z=sw*swing;a.legR.rotation.z=-sw*swing;a.legL.scale.y=1-Math.max(0,sw)*raise;a.legR.scale.y=1-Math.max(0,-sw)*raise;
 a.fig.position.y=Math.abs(Math.cos(a.phase))*.035*k;a.fig.rotation.z=sw*.03*k*(1-a.side*.6);a.fig.scale.y=k>.05||this.reduceMotion?1:1+Math.sin(t*1.5+a.seed)*.012;
 const air=local?this.jump.y:0;a.shadow.position.y=.03-air;a.ring.position.y=.04-air;a.shadow.scale.setScalar(seated?1.25:1);a.ring.scale.setScalar(seated?1.25:1);a.ring.material.color.set(p.color);
 const bless=p.state==='blessing';a.beam.visible=bless;
 if(bless){const pulse=this.reduceMotion?1:.85+Math.sin(t*3)*.15,u=a.beam.userData;u.outer.material.opacity=.1*pulse;u.inner.material.opacity=.13*pulse;u.halo.material.opacity=.32*pulse;u.outer.rotation.y=t*.4;u.halo.scale.setScalar(1+Math.sin(t*2)*.06)}
 // 星星沿螺旋緩緩上升並閃爍
 a.stars.forEach((st,i)=>{st.visible=bless;if(!bless)return;const rise=((t*.35+i/8)%1),ang=t*1.6+i*.785,rad=1.15-rise*.35,tw=this.reduceMotion?1:.55+Math.abs(Math.sin(t*5+i*1.7))*.75;st.position.set(Math.cos(ang)*rad,.3+rise*3.4,Math.sin(ang)*rad);st.rotation.y=t*3+i;st.scale.setScalar(tw*(1-rise*.4))});
 // 打氣的話顯示在送出者自己的頭上，只留下兩個字
 const word=p.emoji?p.emoji.split(' ').pop():'',status=word||({meditating:'🌿 靜心中',praying:'✨ 祈福中',queue:'🌟 等候中',blessing:'💫 補運中',resting:'🍵 休息中'}[p.state]||'');
 if(a.name!==p.name){a.name=p.name;a.tag.lastChild.textContent=p.name}if(a.status!==status){a.status=status;a.tag.firstChild.textContent=status;a.tag.firstChild.hidden=!status}a.tag.firstChild.classList.toggle('g3-word',Boolean(word));
 a.h=h;
 }
 for(const [id,a] of this.actors)if(!this.players[id]){this.scene.remove(a.root);a.tag.remove();this.actors.delete(id)}
 // 鏡頭
 const mine=this.actors.get(this.uid);
 if(mine&&cam.follow){const k=Math.min(1,dt*6);cam.t.x+=(mine.X-cam.t.x)*k;cam.t.z+=(mine.Z-cam.t.z)*k;cam.t.y+=(mine.y-cam.t.y)*k}
 if(this.spinTo!==undefined){cam.yaw+=(this.spinTo-cam.yaw)*Math.min(1,dt*7);if(Math.abs(this.spinTo-cam.yaw)<.005){cam.yaw=this.spinTo;this.spinTo=undefined}}
 // 自己補運時鏡頭回到人物身上並拉近一些
 const blessed=me&&me.state==='blessing';if(blessed)cam.follow=true;const want=blessed?Math.min(cam.dist,15):cam.dist;this.distNow=this.distNow===undefined?want:this.distNow+(want-this.distNow)*Math.min(1,dt*4);
 const cp=Math.cos(cam.pitch),cd=this.distNow;this.camera.position.set(cam.t.x+Math.sin(cam.yaw)*cp*cd,cam.t.y+1+Math.sin(cam.pitch)*cd,cam.t.z+Math.cos(cam.yaw)*cp*cd);this.camera.lookAt(cam.t.x,cam.t.y+1,cam.t.z);
 const cpos=this.camera.position;this.walls.n.visible=cpos.z>-16;this.walls.s.visible=cpos.z<16;this.walls.w.visible=cpos.x>-22;this.walls.e.visible=cpos.x<22;
 // 自己走進或靠近靜心亭時，屋頂變透明，才看得到亭子裡的人
 const underRoof=mine&&Math.hypot(mine.X-PAV.x,mine.Z-PAV.z)<5.2?.18:1;if(Math.abs(underRoof-this.roofOpacity)>.01){this.roofOpacity+=(underRoof-this.roofOpacity)*Math.min(1,dt*6);for(const m of this.pavRoof){m.opacity=this.roofOpacity;m.depthWrite=this.roofOpacity>.9}}
 // 場景動態
 for(const sw of this.swayers)sw.o.rotation.z=this.reduceMotion?0:Math.sin(t*sw.sp+sw.ph)*sw.amp;
 this.animated=this.animated.filter(fn=>fn(t)!==false);
 for(const f of this.koi){f.a+=dt*f.sp*f.side;const rx=1.5*f.r*2,rz=2*f.r*2;f.f.position.x=f.side*3+Math.cos(f.a)*rx;f.f.position.z=Math.sin(f.a)*rz;f.f.rotation.y=Math.atan2(-Math.cos(f.a)*rz*f.side,-Math.sin(f.a)*rx*f.side)+Math.sin(t*5+f.a)*.08;f.tail.rotation.y=Math.sin(t*6+f.a*3)*.55;f.finL.rotation.y=.6+Math.sin(t*4+f.a)*.25;f.finR.rotation.y=-.6-Math.sin(t*4+f.a)*.25;f.f.position.y=.14+Math.sin(t*1.3+f.a)*.015}
 if(this.petals.count){const d=this.dummy;this.petalData.forEach((p,i)=>{p.y-=p.v*dt;p.x+=Math.sin(t*p.sp+p.ph)*dt*.7+dt*.35;if(p.y<0){p.y=9+Math.random()*3;p.x=cam.t.x+(Math.random()-.5)*44;p.z=cam.t.z+(Math.random()-.5)*34}d.position.set(p.x,p.y,p.z);d.rotation.set(t*p.sp+p.ph,p.ph,t*p.sp*.7);d.updateMatrix();this.petals.setMatrixAt(i,d.matrix)});this.petals.instanceMatrix.needsUpdate=true}
 this.renderer.render(this.scene,this.camera);
 this.updateLabels(mine);
 }
 updateLabels(mine){
 const v=new THREE.Vector3(),place=(el,x,y,z)=>{v.set(x,y,z).project(this.camera);const show=v.z<1&&Math.abs(v.x)<1.15&&Math.abs(v.y)<1.2;el.style.display=show?'':'none';if(show)el.style.transform='translate(-50%,-100%) translate('+((v.x+1)/2*this.w).toFixed(1)+'px,'+((1-v.y)/2*this.h).toFixed(1)+'px)'};
 for(const a of this.actors.values())place(a.tag,a.root.position.x,a.root.position.y+a.h+.25,a.root.position.z);
 if(!this.spotTags){this.spotTags=NAMES.map((n,i)=>{const b=document.createElement('button');b.type='button';b.className='g3-spot';b.dataset.spot=String(i);b.textContent=['🌸','🎋','🌿','✨'][i]+' '+n;this.labels.append(b);return b})}
 this.spotTags.forEach((b,i)=>place(b,TAG_AT[i][0],TAG_AT[i][1],TAG_AT[i][2]));
 let near=-1;const busy=this.players[this.uid]?.state;if(mine&&busy!=='blessing'&&busy!=='queue'){let best=2.6;const check=(X,Z,i)=>{const d=Math.hypot(mine.X-X,mine.Z-Z);if(d<best){best=d;near=i}};STAND.forEach(([X,Z],i)=>check(X,Z,i))}
 if(near!==this.near){this.near=near;this.prompt.hidden=near<0;if(near>=0)this.prompt.textContent='進入 '+NAMES[near]+(matchMedia('(pointer: coarse)').matches?'':'（E）')}
 }
}
