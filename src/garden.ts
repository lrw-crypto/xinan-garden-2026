import Phaser from 'phaser';
import {schoolEmblemUrl,studentAppearance,type StudentTexture} from './student-appearance';
export type Player={name:string;color:string;style:string;x:number;y:number;state:string;updatedAt:number;emoji?:string};
export const spots=[{name:'心願祈福樹',x:270,y:270},{name:'暖心求籤',x:735,y:215},{name:'靜心亭子',x:490,y:170},{name:'補運小屋',x:850,y:365},{name:'休息長椅',x:320,y:405}];
// The courtyard is always 1000 × 590 world units. Narrow screens show a
// 560-unit-wide window that follows the local student, so figures stay legible.
export const WORLD={w:1000,h:590};
const STANDING=100,SEATED=74;
type Actor={container:Phaser.GameObjects.Container;fig:Phaser.GameObjects.Container;body:Phaser.GameObjects.Image;emblem:Phaser.GameObjects.Image;name:Phaser.GameObjects.Text;status:Phaser.GameObjects.Text;marker:Phaser.GameObjects.Graphics;stars:Phaser.GameObjects.Text[];broom:Phaser.GameObjects.Text;x:number;y:number;movingUntil:number;seed:number};
export class Garden extends Phaser.Scene{
 players:Record<string,Player>={}; uid=''; target?:{x:number;y:number}; moved:(x:number,y:number)=>void=()=>{}; interact:(i:number)=>void=()=>{};
 private chars=new Map<string,Actor>();
 private wishCards:Phaser.GameObjects.Container[]=[];
 private wishCount=0;
 private reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(){super('garden')}
 preload(){
 this.load.image('school-emblem',schoolEmblemUrl);
 for(const hair of ['short','long'])for(const pose of ['standing','seated'])this.load.image(hair+'-'+pose,import.meta.env.BASE_URL+'art/students/'+hair+'-'+pose+'.webp');
 this.load.image('courtyard',import.meta.env.BASE_URL+'art/temple-courtyard.webp');
 }
 create(){
 const cam=this.cameras.main;
 cam.setBounds(0,0,WORLD.w,WORLD.h);
 cam.centerOn(470,WORLD.h/2);
 if(this.textures.exists('courtyard'))this.add.image(500,295,'courtyard').setDisplaySize(WORLD.w,WORLD.h);
 else {cam.setBackgroundColor('#e7edd3');this.add.text(500,295,'庭院圖片未載入，請重新整理。',{color:'#62523d',fontSize:'18px'}).setOrigin(.5)}
 // Falling petals are a live layer above the illustrated backdrop.
 for(let i=0;i<(this.reduceMotion?0:22);i++){
 const petal=this.add.ellipse((i*137)%WORLD.w,(i*67)%WORLD.h-40,6,3.5,i%3?0xffd4e0:0xffb7cc,.85).setDepth(600).setAngle(i*40);
 this.tweens.add({targets:petal,x:petal.x+55+(i%4)*12,y:petal.y+110,angle:petal.angle+200,alpha:0,duration:5200+i*170,delay:i*140,repeat:-1});
 }
 spots.forEach((s,i)=>{this.add.text(s.x,s.y+24,s.name,{fontSize:'14px',fontFamily:'sans-serif',fontStyle:'bold',color:'#6a4057',backgroundColor:'#fff8f1',padding:{x:14,y:8}}).setOrigin(.5).setDepth(650).setResolution(2).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.interact(i))});
 this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:unknown[])=>{if(!objects.length)this.target={x:Phaser.Math.Clamp(p.worldX,55,945),y:Phaser.Math.Clamp(p.worldY,235,535)}});
 const narrow=this.scale.width<WORLD.w;
 this.add.text(this.scale.width/2,560,narrow?'點一下地面走過去，庭院會跟著你移動。':'點一下石板路，讓心慢慢走。',{fontSize:'13px',color:'#66563f',backgroundColor:'#fff8e9',padding:{x:12,y:5}}).setOrigin(.5).setScrollFactor(0).setDepth(660).setResolution(2);
 }
 /** A wish card floats from the local student up to the wishing tree and stays there, swaying. */
 hangWish(){
 if(!this.sys.isActive())return;
 const me=this.players[this.uid];
 const slot=this.wishCount++%7;
 const tx=150+slot*30,ty=228+(slot%3)*9;
 const card=this.add.container(me?me.x:tx,me?me.y-70:ty+120).setDepth(640);
 const g=this.add.graphics();
 g.lineStyle(1.5,0xc0504d,1).lineBetween(0,-16,0,0);
 g.fillStyle(0xffe3ea,1).fillRoundedRect(-7,0,14,22,3);
 g.lineStyle(1,0xe59aae,1).strokeRoundedRect(-7,0,14,22,3);
 card.add(g);
 if(this.reduceMotion)card.setPosition(tx,ty);
 else this.tweens.add({targets:card,x:tx,y:ty,duration:1100,ease:'Sine.easeInOut',onComplete:()=>{this.tweens.add({targets:card,angle:{from:-7,to:7},duration:1700,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})}});
 this.wishCards.push(card);
 if(this.wishCards.length>7){const old=this.wishCards.shift()!;this.tweens.killTweensOf(old);old.destroy()}
 }
 update(t:number,dt:number){
 const me=this.players[this.uid];
 if(me&&this.target){const d=Phaser.Math.Distance.Between(me.x,me.y,this.target.x,this.target.y);if(d<3)this.target=undefined;else{const step=Math.min(150*dt/1000,d);me.x+=(this.target.x-me.x)/d*step;me.y+=(this.target.y-me.y)/d*step;this.moved(me.x,me.y)}}
 const cam=this.cameras.main;
 if(me&&cam.width<WORLD.w){const want=Phaser.Math.Clamp(me.x-cam.width/2,0,WORLD.w-cam.width);cam.scrollX+=(want-cam.scrollX)*Math.min(1,dt/180)}

 for(const [id,p] of Object.entries(this.players)){
 let actor=this.chars.get(id);
 if(!actor){
 const container=this.add.container(p.x,p.y);
 const marker=this.add.graphics();
 const body=this.add.image(0,0,'short-standing').setOrigin(.5,1);
 const emblem=this.add.image(0,0,'school-emblem');
 // Body and emblem share one pivot at the feet so the emblem stays glued to the chest while walking.
 const fig=this.add.container(0,0,[body,emblem]);
 const name=this.add.text(0,0,'',{fontSize:'13px',color:'#51403f',backgroundColor:'#fff9ed',padding:{x:6,y:3}}).setOrigin(.5).setResolution(2);
 const status=this.add.text(0,0,'',{fontSize:'12px',color:'#6b4560',backgroundColor:'#fff6e9',padding:{x:4,y:2}}).setOrigin(.5).setResolution(2);
 const stars=[0,1,2].map(()=>this.add.text(0,0,'✦',{fontSize:'22px',color:'#ffe28c'}).setOrigin(.5));
 const broom=this.add.text(0,0,'🧹',{fontSize:'22px'}).setOrigin(.5,.9);
 container.add([marker,fig,broom,name,status,...stars]);
 actor={container,fig,body,emblem,name,status,marker,stars,broom,x:p.x,y:p.y,movingUntil:0,seed:this.chars.size*1.7};this.chars.set(id,actor);
 }
 // Remote students arrive as ~5 updates per second; glide between them instead of jumping.
 const gap=Phaser.Math.Distance.Between(actor.x,actor.y,p.x,p.y);
 let nx=p.x,ny=p.y;
 if(id!==this.uid&&gap>1&&gap<260){const step=Math.min(gap,190*dt/1000);nx=actor.x+(p.x-actor.x)/gap*step;ny=actor.y+(p.y-actor.y)/gap*step}
 const dx=nx-actor.x,dy=ny-actor.y;
 if(Math.abs(dx)+Math.abs(dy)>.2){actor.movingUntil=t+250;if(Math.abs(dx)>.1)actor.body.setFlipX(dx<0)}
 const seated=p.state==='meditating'||p.state==='resting';
 const key=((p.style==='bear'?'long':'short')+'-'+(seated?'seated':'standing')) as StudentTexture;
 const height=seated?SEATED:STANDING;
 if(this.textures.exists(key)){
 actor.body.setTexture(key);
 actor.body.setDisplaySize(height*actor.body.frame.realWidth/actor.body.frame.realHeight,height);
 }
 // Walking: a side-to-side waddle with a small hop on each step. Standing still: gentle breathing.
 const walking=!this.reduceMotion&&!seated&&actor.movingUntil>t;
 const phase=t/95+actor.seed;
 actor.fig.setY(walking?-Math.abs(Math.sin(phase))*5:0).setRotation(walking?Math.sin(phase)*.085:0);
 actor.fig.setScale(1,walking||this.reduceMotion?1:1+Math.sin(t/650+actor.seed)*.012);
 const anchor=studentAppearance[key];
 const emblemSize=actor.body.displayWidth*anchor.size;
 actor.emblem.setDisplaySize(emblemSize,emblemSize).setPosition(
 (anchor.x-.5)*actor.body.displayWidth*(actor.body.flipX?-1:1),
 (anchor.y-1)*actor.body.displayHeight
 ).setFlipX(false).setFlipY(false);

 actor.marker.clear().fillStyle(0x3e352d,.22).fillEllipse(0,2,seated?54:36,11);
 actor.marker.lineStyle(2,Phaser.Display.Color.HexStringToColor(p.color).color,.9).strokeEllipse(0,4,seated?60:42,14);
 actor.name.setText(p.name).setY(-height-12);
 const status=p.emoji||({meditating:'🌿 靜心中',praying:'✨ 祈福中',queue:'🌟 等候中',blessing:'💫 補運中',resting:'🍵 休息中'}[p.state]||'');
 actor.status.setText(status).setVisible(Boolean(status)).setY(-height-36);
 // Blessing: a broom sweeps worries away while three stars circle the student.
 const blessing=p.state==='blessing';
 actor.stars.forEach((star,i)=>{const a=t/400+i*2.094;star.setVisible(blessing).setPosition(Math.cos(a)*36,-height*.5+Math.sin(a)*32)});
 actor.broom.setVisible(blessing).setPosition(Math.sin(t/170)*24,2).setRotation(Math.sin(t/170)*.45);
 actor.container.setPosition(nx,ny).setDepth(ny);
 actor.x=nx;actor.y=ny;
 }
 for(const [id,actor] of this.chars)if(!this.players[id]){actor.container.destroy();this.chars.delete(id)}
 }
}
