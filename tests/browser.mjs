import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,headless:true,args:['--no-sandbox']});
try{
const a=await browser.newContext({viewport:{width:1280,height:900}});
const b=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const pages=await Promise.all([a.newPage(),b.newPage()]);
for(let i=0;i<2;i++){await pages[i].goto('http://127.0.0.1:5174/xinan-garden-2026/');await pages[i].locator('#name').fill(['測試小光','測試小花'][i]);await pages[i].getByRole('button',{name:i===0?'選擇短髮眼鏡同學':'選擇長髮眼鏡同學'}).click();assert.equal(await pages[i].locator('#style').inputValue(),i===0?'human':'bear');await pages[i].waitForFunction(()=>[...document.querySelectorAll('.student-choice img')].every(img=>img.complete&&img.naturalWidth>0));await pages[i].getByRole('button',{name:'帶著希望進入庭院'}).click();await pages[i].locator('dialog').waitFor({state:'hidden'});}
for(const p of pages)await p.getByText('2 位同學在線',{exact:false}).waitFor();
const p=pages[0];await p.locator('[data-place="1"]').click();await p.locator('#draw').click();await p.locator('#result .card').waitFor();await p.locator('.close').click();
await p.locator('[data-place="0"]').click();await p.locator('#wish').fill('每天進步一點點');await p.locator('#send').click();await p.getByText('心願已掛上樹梢',{exact:false}).waitFor();await p.locator('.close').click();
await pages[1].locator('[data-place="2"]').click();await pages[1].getByRole('button',{name:'30 秒',exact:true}).click();await pages[1].getByText(/^剩餘 \d+ 秒$/).waitFor();await pages[1].locator('.close').click();
await pages[1].locator('[data-place="3"]').click();await pages[1].locator('#join').click();await pages[1].getByText('輪到你了',{exact:false}).waitFor();await pages[1].getByText('煩惱輕一點',{exact:false}).waitFor({timeout:15000});await pages[1].locator('.close').click();
for(const page of pages){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
mkdirSync('test-results',{recursive:true});
await pages[1].screenshot({path:'test-results/garden-mobile.png',fullPage:true});
await pages[0].screenshot({path:'test-results/garden-desktop.png',fullPage:true});
console.log('PASS: two independent browser sessions, mobile layout, wishes, fortune, meditation, queue completion');
}finally{await browser.close()}
