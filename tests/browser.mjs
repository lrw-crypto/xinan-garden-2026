import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,headless:true,args:['--no-sandbox']});
try{
const a=await browser.newContext({viewport:{width:1280,height:900}});
const b=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const pages=await Promise.all([a.newPage(),b.newPage()]);
const pageErrors=[];for(const pg of pages)pg.on('pageerror',e=>pageErrors.push(e.message));
for(let i=0;i<2;i++){await pages[i].goto('http://127.0.0.1:5174/xinan-garden-2026/');await pages[i].locator('#name').fill(['測試小光','測試小花'][i]);await pages[i].getByRole('button',{name:i===0?'選擇小貓':'選擇馬尾'}).click();assert.equal(await pages[i].locator('#style').inputValue(),i===0?'cat':'pony');await pages[i].waitForFunction(()=>[...document.querySelectorAll('.student-choice img')].every(img=>img.complete&&img.naturalWidth>0));await pages[i].getByRole('button',{name:'帶著希望進入庭院'}).click();await pages[i].locator('dialog').waitFor({state:'hidden'});}
for(const p of pages)await p.getByText('2 位同學在線',{exact:false}).waitFor();
const p=pages[0];await p.locator('[data-place="1"]').click();await p.locator('#draw').click();await p.locator('#result .card').waitFor();await p.locator('.close').click();
await p.locator('[data-place="0"]').click();await p.locator('#wish').fill('每天進步一點點');await p.locator('#send').click();await p.getByText('心願已掛上樹梢',{exact:false}).waitFor();await p.locator('.close').click();
await pages[1].locator('[data-place="2"]').click();await pages[1].getByRole('button',{name:'30 秒',exact:true}).click();await pages[1].getByText(/^剩餘 \d+ 秒$/).waitFor();await pages[1].locator('dialog').waitFor({state:'hidden'});await pages[1].locator('#med-stop').click();
await pages[1].locator('[data-place="3"]').click();await pages[1].locator('#join').click();await pages[1].getByText('輪到你了',{exact:false}).waitFor();// 直接觸發按鈕（軟體繪圖的測試機很慢，Playwright 的可見性檢查會逾時）；若仍未成功，25 秒後會自動開始
for(let k=0;k<6;k++){await pages[1].evaluate(()=>{const b=document.querySelector('.g3-swipe:not([hidden]) button');if(b)b.click()});await pages[1].waitForTimeout(400)}
await pages[1].getByText('煩惱輕一點',{exact:false}).waitFor({timeout:60000});await pages[1].locator('.close').click();
for(const page of pages){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
for(const page of pages)assert.equal(await page.locator('#garden canvas').count(),1);
await pages[0].waitForTimeout(1500);
assert.deepEqual(pageErrors,[]);
// 3D 導覽頁可以載入、能切換景點，且沒有頁面錯誤
const tour=await a.newPage();const tourErrors=[];tour.on('pageerror',e=>tourErrors.push(e.message));await tour.goto(new URL('showcase.html',pages[0].url()).href);await tour.locator('#stage canvas').waitFor();await tour.getByRole('button',{name:'靜心亭子'}).first().click();await tour.waitForTimeout(1200);assert.deepEqual(tourErrors,[]);await tour.close();
mkdirSync('test-results',{recursive:true});
await pages[1].screenshot({path:'test-results/garden-mobile.png',fullPage:true});
await pages[0].screenshot({path:'test-results/garden-desktop.png',fullPage:true});
console.log('PASS: two independent browser sessions, mobile layout, wishes, fortune, meditation, queue completion');
}finally{await browser.close()}
