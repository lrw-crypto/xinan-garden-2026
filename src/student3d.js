// 學生人物：以程式建模的 3D 黏土風 Q 版公仔，全部穿藍白運動服，胸口貼上原始校徽圖檔。
// 造型：短髮、長髮、馬尾、刺蝟頭、熊貓、浣熊、小兔子；另可加眼鏡與雀斑。
// 全部是原創造型，由基本幾何體組成，沒有使用任何遊戲或他人的角色。
// 型別宣告在 student3d.d.ts。
import * as THREE from './vendor/three.module.min.js';

export const BASES=['short','long','pony','spiky','panda','raccoon','bunny'];
export const BASE_NAMES={short:'短髮',long:'長髮',pony:'馬尾',spiky:'刺蝟頭',panda:'熊貓',raccoon:'浣熊',bunny:'小兔子'};
/** 造型字串：<基本造型>[+g 眼鏡][+f 雀斑]。舊資料的 human、bear 對應到戴眼鏡的短髮、長髮。 */
export function parseStyle(style){
 let s=String(style||'');if(s==='human')s='short+g';if(s==='bear')s='long+g';
 const [base,...flags]=s.split('+');
 return{base:BASES.includes(base)?base:'short',glasses:flags.includes('g'),freckles:flags.includes('f')}}
export const makeStyle=(base,glasses,freckles)=>(BASES.includes(base)?base:'short')+(glasses?'+g':'')+(freckles?'+f':'');
/** 資料庫規則尚未更新時可用的舊造型代碼。 */
export const legacyStyle=style=>['long','pony','bunny'].includes(parseStyle(style).base)?'bear':'human';

const cache=new Map();
// 帶一點自發光，讓膚色與白上衣在陰影裡也保持明亮的黏土感
function mat(color,extra){const key=color+JSON.stringify(extra||'');let m=cache.get(key);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.8,metalness:0,emissive:color,emissiveIntensity:.16,...extra});cache.set(key,m)}return m}
const geo=new Map();
const G=(key,make)=>{let g=geo.get(key);if(!g){g=make();geo.set(key,g)}return g};
const ball=()=>G('ball',()=>new THREE.SphereGeometry(1,20,14));
const cap=(r,l)=>G('cap'+r+'_'+l,()=>new THREE.CapsuleGeometry(r,l,4,10));
function put(parent,geometry,material,x,y,z,o={}){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);if(o.s)m.scale.set(...(Array.isArray(o.s)?o.s:[o.s,o.s,o.s]));if(o.rx)m.rotation.x=o.rx;if(o.ry)m.rotation.y=o.ry;if(o.rz)m.rotation.z=o.rz;m.castShadow=o.cast!==false;parent.add(m);return m}
const sphere=(parent,color,x,y,z,s,o={})=>put(parent,ball(),typeof color==='string'?mat(color):color,x,y,z,{...o,s});

const HEAD_R=.45,HEAD_Z=.95;
// 臉部表面在 (x,y) 的 z 值，讓五官貼在頭上
const faceZ=(x,y)=>HEAD_Z*Math.sqrt(Math.max(0,HEAD_R*HEAD_R-x*x-y*y));
const WHITE='#fdfbf6',BLUE='#2f61d2',RED='#d9483e',DARK='#2b2530';

/**
 * 建立一個人物。回傳的 group 以腳底中央為原點、面向 +Z，高約 1.95。
 * emblemMaterial 是貼上原始校徽圖檔的材質，只縮放、不重畫。
 */
export function buildStudent(style,emblemMaterial){
 const o=parseStyle(style),animal=['panda','raccoon','bunny'].includes(o.base);
 const skin={panda:'#fbf8f2',raccoon:'#bfae9f',bunny:'#fff5ec'}[o.base]||'#ffe2cf';
 const limb={panda:'#3a3538',raccoon:'#8f7d72',bunny:'#fff5ec'}[o.base]||skin;
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 // 腿：以髖部為支點，連同白襪與白鞋
 // 大腿與小腿在膝蓋分開，走路時後腳會彎、打坐時可以盤腿
 const legs=[-1,1].map(sd=>{const leg=new THREE.Group();leg.position.set(sd*.14,.52,0);leg.rotation.order='YXZ';body.add(leg);
 put(leg,cap(.108,.07),mat(limb),0,-.12,0);
 const shin=new THREE.Group();shin.position.y=-.23;shin.rotation.order='ZYX';leg.add(shin);leg.userData.shin=shin;
 put(shin,cap(.1,.04),mat(limb),0,-.07,0);put(shin,G('sock',()=>new THREE.CylinderGeometry(.11,.11,.1,12)),mat(WHITE),0,-.14,0);
 sphere(shin,WHITE,0,-.215,.045,[.135,.085,.2]);sphere(shin,BLUE,sd*.02,-.205,.13,[.1,.05,.06],{cast:false});return leg});
 // 藍色短褲與紅白側條
 put(body,G('shorts',()=>new THREE.CylinderGeometry(.3,.33,.27,18)),mat(BLUE),0,.57,0,{s:[1,1,.8]});
 for(const sd of [-1,1]){put(body,G('stripe',()=>new THREE.BoxGeometry(.03,.25,.09)),mat(RED),sd*.315,.57,0);put(body,G('stripe2',()=>new THREE.BoxGeometry(.032,.25,.035)),mat(WHITE),sd*.316,.57,.062)}
 // 白色上衣、藍色領口與拉克蘭袖
 sphere(body,WHITE,0,.9,0,[.31,.33,.255]);
 put(body,G('collar',()=>new THREE.TorusGeometry(.125,.036,8,18)),mat(BLUE),0,1.155,0,{rx:Math.PI/2});
 const arms=[-1,1].map(sd=>{const arm=new THREE.Group();arm.position.set(sd*.3,1.04,0);body.add(arm);
 sphere(arm,BLUE,sd*.02,-.03,0,[.135,.14,.135]);put(arm,cap(.075,.2),mat(limb),sd*.04,-.24,0);sphere(arm,limb,sd*.04,-.4,0,.085);return arm});
 // 校徽：原始圖檔貼在左胸，只做等比例縮放
 const emblem=put(body,G('emblem',()=>new THREE.PlaneGeometry(.15,.15)),emblemMaterial,.125,.98,.243,{ry:.42,rx:-.12,cast:false});emblem.renderOrder=2;
 // 頭
 const head=new THREE.Group();head.position.y=1.5;body.add(head);
 sphere(head,skin,0,0,0,[HEAD_R,HEAD_R*.96,HEAD_R*HEAD_Z]);
 const eyeY=animal?.03:.0,eyeX=.165;
 if(o.base==='panda')for(const sd of [-1,1])sphere(head,DARK,sd*.17,.02,faceZ(.17,.02)-.03,[.115,.14,.05],{rz:sd*.4});
 if(o.base==='raccoon'){for(const sd of [-1,1])sphere(head,'#4d4248',sd*.18,.03,faceZ(.18,.03)-.035,[.17,.105,.06],{rz:sd*-.25});sphere(head,'#f6ead8',0,-.13,faceZ(0,-.13)-.07,[.19,.13,.1]);sphere(head,'#4d4248',0,.2,faceZ(0,.2)-.03,[.05,.16,.04])}
 for(const sd of [-1,1]){const dark=o.base==='panda'||o.base==='raccoon';
 sphere(head,dark?'#ffffff':DARK,sd*eyeX,eyeY,faceZ(eyeX,eyeY)-.012,[.048,.06,.03],{cast:false});
 if(dark)sphere(head,DARK,sd*eyeX,eyeY,faceZ(eyeX,eyeY)+.005,[.03,.038,.02],{cast:false});
 sphere(head,'#ffffff',sd*eyeX+.014,eyeY+.022,faceZ(eyeX,eyeY)+.012,.014,{cast:false});
 sphere(head,'#f6a3ae',sd*.275,-.1,faceZ(.275,-.1)-.022,[.075,.05,.03],{cast:false})}
 if(animal)sphere(head,o.base==='bunny'?'#f08fa8':DARK,0,-.07,faceZ(0,-.07)+(o.base==='raccoon'?.035:.0),[.05,.036,.035],{cast:false});
 const smileZ=faceZ(0,-.15)+(o.base==='raccoon'?.03:-.005);
 put(head,G('smile',()=>new THREE.TorusGeometry(.075,.016,6,14,Math.PI)),mat('#8a4b3c'),0,-.13,smileZ,{rz:Math.PI,cast:false});
 if(o.base==='bunny')put(head,G('teeth',()=>new THREE.BoxGeometry(.05,.045,.02)),mat('#ffffff'),0,-.215,faceZ(0,-.2),{cast:false});
 if(o.freckles)for(const sd of [-1,1])for(const [dx,dy] of [[0,0],[.045,.03],[-.04,.035],[.01,.065]])sphere(head,animal?'#9a7a66':'#b5754f',sd*(.25+dx),-.04+dy,faceZ(.25+dx,-.04+dy)+.002,.013,{cast:false});
 if(o.glasses){for(const sd of [-1,1])put(head,G('lens',()=>new THREE.TorusGeometry(.115,.017,8,22)),mat('#2a2327'),sd*eyeX,eyeY,faceZ(eyeX,eyeY)+.04,{ry:sd*.3,cast:false});
 put(head,G('bridge',()=>new THREE.BoxGeometry(.1,.02,.02)),mat('#2a2327'),0,eyeY+.01,faceZ(.05,eyeY)+.05,{cast:false});
 for(const sd of [-1,1])put(head,G('temple',()=>new THREE.BoxGeometry(.02,.02,.3)),mat('#2a2327'),sd*.31,eyeY+.01,.2,{ry:sd*-.25,cast:false})}
 let top=1.95;
 if(!animal){
 for(const sd of [-1,1])sphere(head,skin,sd*.43,-.03,0,[.06,.08,.06]);
 const hair=mat({short:'#2a2523',long:'#6f4636',pony:'#4a3229',spiky:'#1e1b1d'}[o.base]);
 // 髮帽往後傾，露出額頭
 put(head,G('haircap',()=>new THREE.SphereGeometry(.478,24,14,0,Math.PI*2,0,Math.PI*.55)),hair,0,.015,-.01,{rx:-.36});
 const bang=(x,y,sx,rz)=>sphere(head,hair,x,y,faceZ(x,y)-.02,[sx,.1,.09],{rz});
 if(o.base==='short'){bang(-.2,.3,.17,.5);bang(.02,.33,.19,.05);bang(.23,.29,.15,-.55)}
 if(o.base==='long'){bang(-.22,.29,.17,.6);bang(0,.33,.18,0);bang(.22,.29,.17,-.6);
 sphere(head,hair,0,-.3,-.2,[.47,.62,.3]);for(const sd of [-1,1])put(head,cap(.085,.42),hair,sd*.41,-.26,.04,{rz:sd*.06})}
 if(o.base==='pony'){bang(-.2,.3,.18,.45);bang(.08,.33,.2,-.1);bang(.26,.27,.13,-.7);
 put(head,G('band',()=>new THREE.TorusGeometry(.085,.035,8,14)),mat('#f08fa8'),0,.14,-.47,{rx:.5});sphere(head,hair,0,-.12,-.6,[.14,.36,.15],{rx:.42});sphere(head,hair,0,-.42,-.66,[.09,.14,.1])}
 if(o.base==='spiky'){const cone=G('spike',()=>new THREE.ConeGeometry(.115,.34,7));
 for(const [x,y,z] of [[0,.5,.02],[-.24,.43,.05],[.24,.43,.05],[-.38,.27,-.04],[.38,.27,-.04],[0,.42,-.26],[-.26,.3,-.3],[.26,.3,-.3],[-.14,.4,.24],[.15,.4,.24],[0,.14,-.46]]){const s=put(head,cone,hair,x*1.02,y*1.02,z*1.02);s.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(x,y+.12,z).normalize())}
 top=2.12}
 }else if(o.base==='panda'){for(const sd of [-1,1])sphere(head,DARK,sd*.3,.37,-.02,[.15,.15,.09]);top=2.05}
 else if(o.base==='raccoon'){for(const sd of [-1,1]){sphere(head,'#8f7d72',sd*.3,.37,-.02,[.14,.17,.08],{rz:sd*-.25});sphere(head,'#f3c9cf',sd*.3,.36,.03,[.075,.1,.04],{rz:sd*-.25,cast:false})}
 // 條紋尾巴
 const tail=new THREE.Group();tail.position.set(0,.6,-.24);tail.rotation.x=-.7;body.add(tail);[['#bfae9f',.13],['#4d4248',.14],['#bfae9f',.13],['#4d4248',.1]].forEach(([c,r],i)=>sphere(tail,c,0,.1+i*.13,0,[r,.09,r]));top=2.07}
 else{for(const sd of [-1,1]){const ear=new THREE.Group();ear.position.set(sd*.17,.36,-.03);ear.rotation.z=sd*-.16;head.add(ear);put(ear,cap(.085,.4),mat(skin),0,.26,0);put(ear,cap(.045,.3),mat('#f7bfcb'),0,.26,.05,{cast:false})}
 sphere(body,'#ffffff',0,.6,-.28,.1);top=2.5}
 root.userData={body,head,legs,arms,top,style:String(style||'')};
 return root}

/**
 * 擺姿勢。phase 由實際走過的距離推動；walk 是 0–1 的走路強度；seated 為打坐；air 為離地高度。
 */
export function poseStudent(model,{phase=0,walk=0,seated=false,t=0,air=0,seed=0,still=false}={}){
 const {body,head,legs,arms}=model.userData,sw=Math.sin(phase),k=still?0:walk;
 if(seated){
 // 盤腿：雙腿向前收攏、身體放低，雙手放在膝上
 body.position.y=-.36;body.rotation.set(0,0,0);
 legs.forEach((leg,i)=>{const sd=i?1:-1;leg.rotation.set(-1.5,sd*.85,0);leg.userData.shin.rotation.set(0,sd*1.5,sd*-2.05)});
 arms.forEach((arm,i)=>{const sd=i?1:-1;arm.rotation.set(-.75,0,sd*-.28)});
 head.rotation.set(still?0:Math.sin(t*.8+seed)*.025+.04,0,0);
 return}
 legs.forEach((leg,i)=>{const a=(i?-sw:sw);leg.rotation.set(a*.8*k,0,0);leg.userData.shin.rotation.set(Math.max(0,a)*.75*k+Math.min(1,air*2)*.5,0,0)});
 const lift=Math.min(1,air*1.6);
 arms.forEach((arm,i)=>{const sd=i?1:-1;arm.rotation.set((i?sw:-sw)*.65*k,0,sd*(.1+lift*2.2))});
 body.position.y=Math.abs(Math.cos(phase))*.04*k+(still||k>.05?0:Math.sin(t*1.6+seed)*.008);
 body.rotation.set(.06*k,0,sw*.035*k);
 head.rotation.set(0,still?0:Math.sin(t*.5+seed)*.05*(1-k),0)}

/** 登入畫面的人物預覽：小畫布上慢慢轉動的公仔。 */
export class StudentPreview{
 constructor(canvas,emblemUrl){
 this.canvas=canvas;this.ok=false;
 try{this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true})}catch(e){canvas.hidden=true;return}
 this.ok=true;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.renderer.setSize(canvas.clientWidth||220,canvas.clientHeight||250,false);
 this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight('#fff6ea','#ecc9d6',1.5));const sun=new THREE.DirectionalLight('#fff0d2',1.5);sun.position.set(-2,4,5);this.scene.add(sun);
 this.camera=new THREE.PerspectiveCamera(28,(canvas.clientWidth||220)/(canvas.clientHeight||250),.1,50);this.camera.position.set(0,1.6,5.7);this.camera.lookAt(0,1.12,0);
 const tex=new THREE.TextureLoader().load(emblemUrl);tex.colorSpace=THREE.SRGBColorSpace;this.emblem=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.3});
 const still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const loop=now=>{this.raf=requestAnimationFrame(loop);if(!this.model||document.hidden)return;const t=now/1000;this.model.rotation.y=still?.35:Math.sin(t*.7)*.55+.15;poseStudent(this.model,{t,still});this.renderer.render(this.scene,this.camera)};
 this.raf=requestAnimationFrame(loop)}
 set(style){if(!this.ok)return;if(this.model)this.scene.remove(this.model);this.model=buildStudent(style,this.emblem);this.scene.add(this.model)}
 dispose(){if(!this.ok)return;cancelAnimationFrame(this.raf);this.renderer.dispose();this.ok=false}
}
