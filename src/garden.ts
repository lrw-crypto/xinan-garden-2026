import Phaser from 'phaser';
export type Player={name:string;color:string;style:string;x:number;y:number;state:string;updatedAt:number;emoji?:string};
export const spots=[{name:'心願祈福樹',x:270,y:270},{name:'暖心求籤',x:735,y:250},{name:'靜心亭子',x:490,y:170},{name:'補運小屋',x:790,y:400},{name:'休息長椅',x:350,y:440}];
export class Garden extends Phaser.Scene{
 players:Record<string,Player>={}; uid=''; target?:{x:number;y:number}; moved:(x:number,y:number)=>void=()=>{}; interact:(i:number)=>void=()=>{}; private chars=new Map<string,Phaser.GameObjects.Container>();
 constructor(){super('garden')}
 create(){
 const g=this.add.graphics();g.fillStyle(0xe4edcf);g.fillEllipse(500,340,930,540);
 for(let i=0;i<35;i++){g.fillStyle(i%2?0xcbdcb9:0xd5e2c0);g.fillCircle(80+(i*137)%840,190+(i*73)%340,3)}
 g.lineStyle(55,0xf7edd6);g.beginPath();g.moveTo(190,420);g.lineTo(460,320);g.lineTo(765,340);g.strokePath();
 for(let i=0;i<16;i++){g.fillStyle(0xd9d2ba);g.fillEllipse(200+i*36,418-i*5,26,13)}
 g.fillStyle(0xabcfc6);g.fillEllipse(560,430,190,85);g.lineStyle(4,0xc7dbb8);g.strokeEllipse(560,430,198,92);
 g.lineStyle(2,0xe1f1df);g.strokeEllipse(550,426,70,15);
 const tree=(x:number,y:number,pink:boolean)=>{g.fillStyle(0x9a7958);g.fillRoundedRect(x-9,y-80,18,90,5);g.fillStyle(pink?0xedb8bf:0xb0c795);g.fillCircle(x,y-105,55);g.fillCircle(x-38,y-88,34);g.fillCircle(x+38,y-88,34);g.fillStyle(pink?0xf6d2d5:0xc5d6a5);g.fillCircle(x-15,y-125,30)};
 tree(140,270,true);tree(270,270,false);tree(880,240,true);tree(100,470,true);
 for(let i=0;i<7;i++){g.fillStyle(i%2?0xedbdad:0xffefd0);g.fillRect(230+i*12,184+(i%3)*16,9,21)}
 const hut=(x:number,y:number,w:number)=>{g.fillStyle(0xa68b65);g.fillRoundedRect(x-w/2,y-65,w,70,5);g.fillStyle(0x745f49);g.fillRect(x-15,y-35,30,40);g.fillStyle(0x819a7c);g.fillTriangle(x-w/2-17,y-65,x+w/2+17,y-65,x,y-117);g.fillStyle(0xe7cda0);g.fillRect(x-w/2+8,y-56,20,22)};
 hut(735,250,95);hut(790,400,115);
 g.fillStyle(0xb89b71);g.fillEllipse(490,175,160,65);g.fillStyle(0x927754);g.fillRect(425,90,8,85);g.fillRect(547,90,8,85);g.fillStyle(0x839a7a);g.fillTriangle(395,95,585,95,490,35);
 for(let i=0;i<3;i++){g.fillStyle(0xe5c5b4);g.fillEllipse(453+i*37,165,28,16)}
 g.fillStyle(0xa58a64);g.fillRoundedRect(307,418,90,17,5);g.fillRect(315,435,7,17);g.fillRect(380,435,7,17);
 spots.forEach((s,i)=>{this.add.text(s.x,s.y+24,s.name,{fontSize:'15px',color:'#665b45',backgroundColor:'#fff8e5',padding:{x:10,y:5}}).setOrigin(.5).setInteractive().on('pointerdown',()=>this.interact(i))});
 this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:unknown[])=>{if(!objects.length)this.target={x:Phaser.Math.Clamp(p.x,55,945),y:Phaser.Math.Clamp(p.y,235,535)}});
 this.add.text(500,555,'點一下石板路，讓心慢慢走。',{fontSize:'13px',color:'#818767'}).setOrigin(.5);
 }
 update(_t:number,dt:number){
 const me=this.players[this.uid];if(me&&this.target){const d=Phaser.Math.Distance.Between(me.x,me.y,this.target.x,this.target.y);if(d<3)this.target=undefined;else{const step=Math.min(150*dt/1000,d);me.x+=(this.target.x-me.x)/d*step;me.y+=(this.target.y-me.y)/d*step;this.moved(me.x,me.y)}}
 for(const [id,p]of Object.entries(this.players)){let c=this.chars.get(id);if(!c){c=this.add.container(p.x,p.y);this.chars.set(id,c)}c.removeAll(true);const g=this.add.graphics();g.fillStyle(0x69775b,.15);g.fillEllipse(0,7,32,12);g.fillStyle(parseInt(p.color.slice(1),16));g.fillRoundedRect(-11,-24,22,p.state==='walking'?25:17,8);g.fillStyle(0xf6d6b3);g.fillCircle(0,-35,14);g.fillStyle(p.style==='bear'?0x87664e:0x554837);g.fillEllipse(0,-44,28,14);if(p.style==='bear'){g.fillCircle(-12,-49,6);g.fillCircle(12,-49,6)}g.fillStyle(0x514439);g.fillCircle(-5,-35,1.5);g.fillCircle(5,-35,1.5);c.add(g);c.add(this.add.text(0,-75,p.name,{fontSize:'12px',color:'#4f5947',backgroundColor:'#fff8e9',padding:{x:5,y:3}}).setOrigin(.5));if(p.state!=='walking'||p.emoji)c.add(this.add.text(0,-99,p.emoji||({meditating:'🌿 靜心中',praying:'✨ 祈福中',queue:'🌟 等候中',blessing:'💫 補運中',resting:'🍵 休息中'}[p.state]||''),{fontSize:'12px',color:'#695941'}).setOrigin(.5));c.setPosition(p.x,p.y).setDepth(p.y)}
 for(const[id,c]of this.chars)if(!this.players[id]){c.destroy();this.chars.delete(id)}
 }
}
