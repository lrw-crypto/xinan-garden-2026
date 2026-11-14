import Phaser from 'phaser';
export type Player={name:string;color:string;style:string;x:number;y:number;state:string;updatedAt:number;emoji?:string};
export const spots=[{name:'心願祈福樹',x:270,y:270},{name:'暖心求籤',x:735,y:215},{name:'靜心亭子',x:490,y:170},{name:'補運小屋',x:850,y:365},{name:'休息長椅',x:320,y:405}];
export class Garden extends Phaser.Scene{
 players:Record<string,Player>={}; uid=''; target?:{x:number;y:number}; moved:(x:number,y:number)=>void=()=>{}; interact:(i:number)=>void=()=>{}; private chars=new Map<string,Phaser.GameObjects.Container>();
 constructor(){super('garden')}
 preload(){
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
 for(const [id,p]of Object.entries(this.players)){let c=this.chars.get(id);if(!c){c=this.add.container(p.x,p.y);this.chars.set(id,c)}c.removeAll(true);const g=this.add.graphics();g.fillStyle(0x443c38,.22);g.fillEllipse(0,7,32,12);g.fillStyle(0x614938);g.fillRoundedRect(-10,-2,8,10,3);g.fillRoundedRect(2,-2,8,10,3);g.fillStyle(parseInt(p.color.slice(1),16));g.fillRoundedRect(-11,-24,22,p.state==='walking'?25:17,8);g.fillStyle(0xffffff,.45);g.fillRoundedRect(-7,-21,4,14,2);g.fillStyle(0xf6d6b3);g.fillCircle(0,-35,14);g.fillStyle(0xefad99,.7);g.fillEllipse(-9,-31,5,3);g.fillEllipse(9,-31,5,3);g.fillStyle(p.style==='bear'?0x87664e:0x554837);g.fillEllipse(0,-44,28,14);if(p.style==='bear'){g.fillCircle(-12,-49,6);g.fillCircle(12,-49,6)}g.fillStyle(0x514439);g.fillCircle(-5,-35,1.5);g.fillCircle(5,-35,1.5);c.add(g);c.add(this.add.text(0,-75,p.name,{fontSize:'12px',color:'#4f5947',backgroundColor:'#fff8e9',padding:{x:5,y:3}}).setOrigin(.5));if(p.state!=='walking'||p.emoji)c.add(this.add.text(0,-99,p.emoji||({meditating:'🌿 靜心中',praying:'✨ 祈福中',queue:'🌟 等候中',blessing:'💫 補運中',resting:'🍵 休息中'}[p.state]||''),{fontSize:'12px',color:'#695941'}).setOrigin(.5));if(p.state==='blessing'){for(let i=0;i<5;i++){const angle=_t/450+i*1.256;c.add(this.add.text(Math.cos(angle)*26,-25+Math.sin(angle)*22,'✦',{fontSize:'17px',color:'#c69c41'}).setOrigin(.5))}}c.setPosition(p.x,p.y).setDepth(p.y)}
 for(const[id,c]of this.chars)if(!this.players[id]){c.destroy();this.chars.delete(id)}
 }
}
