import Phaser from 'phaser';
export type Player={name:string;color:string;style:string;x:number;y:number;state:string;updatedAt:number;emoji?:string};
export const spots=[{name:'心願祈福樹',x:270,y:270},{name:'暖心求籤',x:735,y:215},{name:'靜心亭子',x:490,y:170},{name:'補運小屋',x:850,y:365},{name:'休息長椅',x:320,y:405}];
export class Garden extends Phaser.Scene{
 players:Record<string,Player>={}; uid=''; target?:{x:number;y:number}; moved:(x:number,y:number)=>void=()=>{}; interact:(i:number)=>void=()=>{}; private chars=new Map<string,{container:Phaser.GameObjects.Container;body:Phaser.GameObjects.Image;name:Phaser.GameObjects.Text;status:Phaser.GameObjects.Text;marker:Phaser.GameObjects.Graphics;stars:Phaser.GameObjects.Text;x:number;y:number;movingUntil:number}>();
 private reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(){super('garden')}
 preload(){
 for(const hair of ['short','long'])for(const pose of ['standing','seated'])this.load.image(hair+'-'+pose,import.meta.env.BASE_URL+'art/students/'+hair+'-'+pose+'.webp');
 this.load.image('courtyard',import.meta.env.BASE_URL+'art/temple-courtyard.webp');
 }
 create(){
 if(this.textures.exists('courtyard'))this.add.image(500,295,'courtyard').setDisplaySize(1000,590);
 else {this.cameras.main.setBackgroundColor('#e7edd3');this.add.text(500,295,'庭院圖片未載入，請重新整理。',{color:'#62523d',fontSize:'18px'}).setOrigin(.5)}
 // Gentle foreground petals keep the live scene distinct from its illustrated backdrop.
 for(let i=0;i<(window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:16);i++){
 const petal=this.add.ellipse((i*137)%1000,(i*67)%590,5,3,0xffd4e0,.8).setDepth(600);
 this.tweens.add({targets:petal,x:petal.x+45,y:petal.y+80,alpha:0,duration:5000+i*170,delay:i*150,repeat:-1});
 }
 spots.forEach((s,i)=>{this.add.text(s.x,s.y+24,s.name,{fontSize:'14px',fontFamily:'sans-serif',fontStyle:'bold',color:'#6a4057',backgroundColor:'#fff8f1',padding:{x:14,y:8}}).setOrigin(.5).setDepth(650).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.interact(i))});
 this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:unknown[])=>{if(!objects.length)this.target={x:Phaser.Math.Clamp(p.x,55,945),y:Phaser.Math.Clamp(p.y,235,535)}});
 this.add.text(500,555,'點一下石板路，讓心慢慢走。',{fontSize:'13px',color:'#66563f',backgroundColor:'#fff8e9',padding:{x:12,y:5}}).setOrigin(.5);
 }
 update(_t:number,dt:number){
 const me=this.players[this.uid];if(me&&this.target){const d=Phaser.Math.Distance.Between(me.x,me.y,this.target.x,this.target.y);if(d<3)this.target=undefined;else{const step=Math.min(150*dt/1000,d);me.x+=(this.target.x-me.x)/d*step;me.y+=(this.target.y-me.y)/d*step;this.moved(me.x,me.y)}}

 for(const [id,p] of Object.entries(this.players)){
 let actor=this.chars.get(id);
 if(!actor){
 const container=this.add.container(p.x,p.y);
 const marker=this.add.graphics();
 const body=this.add.image(0,0,'short-standing').setOrigin(.5,1);
 const name=this.add.text(0,-86,'',{fontSize:'12px',color:'#51403f',backgroundColor:'#fff9ed',padding:{x:6,y:3}}).setOrigin(.5);
 const status=this.add.text(0,-109,'',{fontSize:'12px',color:'#6b4560',backgroundColor:'#fff6e9',padding:{x:4,y:2}}).setOrigin(.5);
 const stars=this.add.text(0,-35,'✦',{fontSize:'24px',color:'#ffe28c'}).setOrigin(.5);
 container.add([marker,body,name,status,stars]);
 actor={container,body,name,status,marker,stars,x:p.x,y:p.y,movingUntil:0};this.chars.set(id,actor);
 }
 const dx=p.x-actor.x,dy=p.y-actor.y;
 if(Math.abs(dx)+Math.abs(dy)>.2){actor.movingUntil=_t+250;if(Math.abs(dx)>.1)actor.body.setFlipX(dx<0)}
 const seated=p.state==='meditating'||p.state==='resting';
 const key=(p.style==='bear'?'long':'short')+'-'+(seated?'seated':'standing');
 if(this.textures.exists(key)){
 actor.body.setTexture(key);
 const height=seated?57:76;
 actor.body.setDisplaySize(height*actor.body.frame.realWidth/actor.body.frame.realHeight,height);
 }
 const bob=!this.reduceMotion&&!seated&&actor.movingUntil>_t?Math.sin(_t/85)*2:0;
 actor.body.setY(bob);
 actor.marker.clear().fillStyle(0x3e352d,.22).fillEllipse(0,2,seated?42:27,9);
 actor.marker.lineStyle(2,Phaser.Display.Color.HexStringToColor(p.color).color,.9).strokeEllipse(0,4,seated?46:32,12);
 actor.name.setText(p.name).setY(seated?-67:-86);
 const status=p.emoji||({meditating:'🌿 靜心中',praying:'✨ 祈福中',queue:'🌟 等候中',blessing:'💫 補運中',resting:'🍵 休息中'}[p.state]||'');
 actor.status.setText(status).setVisible(Boolean(status)).setY(seated?-91:-109);
 actor.stars.setVisible(p.state==='blessing').setPosition(Math.cos(_t/400)*28,-35+Math.sin(_t/400)*25);
 actor.container.setPosition(p.x,p.y).setDepth(p.y);
 actor.x=p.x;actor.y=p.y;
 }
 for(const [id,actor] of this.chars)if(!this.players[id]){actor.container.destroy();this.chars.delete(id)}
 }
}
