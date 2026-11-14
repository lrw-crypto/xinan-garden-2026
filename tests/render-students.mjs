// Isolated rendering fixtures. This does not authenticate or verify multiplayer.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,headless:true,args:['--no-sandbox']});
try {
const page=await browser.newPage({viewport:{width:1280,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.GARDEN_TEST_URL||'http://127.0.0.1:5180/xinan-garden-2026/');
await page.waitForFunction(()=>[...document.querySelectorAll('.student-choice img')].every(i=>i.complete&&i.naturalWidth>0));
await page.getByRole('button',{name:'選擇長髮眼鏡同學'}).click();
assert.equal(await page.locator('#style').inputValue(),'bear');
const result=await page.evaluate(async()=>{
const phaserURL=performance.getEntriesByType('resource').find(e=>e.name.includes('/phaser.js')).name;
const Phaser=(await import(phaserURL)).default;
const {Garden}=await import('/xinan-garden-2026/src/garden.ts');
document.querySelector('dialog').close();
const host=document.createElement('div');document.querySelector('main').replaceChildren(host);
const label=document.createElement('p');label.textContent='角色顯示測試・示例資料（非真實在線）';host.before(label);
const scene=new Garden();
const game=new Phaser.Game({type:Phaser.CANVAS,parent:host,width:1000,height:590,scene});
for(let i=0;i<100;i++){if(scene.sys?.isActive()&&scene.textures.exists('long-seated'))break;await new Promise(r=>setTimeout(r,50))}
if(!scene.sys?.isActive())throw Error('Scene not ready');
scene.uid='short';
scene.players={short:{name:'短髮測試',style:'human',color:'#80a891',x:440,y:300,state:'walking',updatedAt:Date.now()},long:{name:'長髮測試',style:'bear',color:'#d398a6',x:510,y:300,state:'meditating',updatedAt:Date.now()}};
await new Promise(r=>setTimeout(r,100));
const keys=[...scene.chars.values()].map(a=>a.body.texture.key);
scene.target={x:470,y:300};
await new Promise(r=>setTimeout(r,300));
const moved=scene.players.short.x>440;
scene.target=undefined;scene.players.short.state='meditating';
await new Promise(r=>setTimeout(r,100));
return {keys,moved,seated:[...scene.chars.values()].map(a=>a.body.texture.key)};
});
assert.deepEqual(result.keys,['short-standing','long-seated']);
assert(result.moved);
assert.deepEqual(result.seated,['short-seated','long-seated']);
assert.deepEqual(errors,[]);
await page.screenshot({path:'/tmp/student-prayer-render-test.png',fullPage:true});
console.log('PASS student selection, asset loading, standing/seated switch and movement; rendering fixtures only');
}finally{await browser.close()}
