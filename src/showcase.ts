import './style.css';
import {Garden3D,spots} from './garden3d.js';
import {figures} from './student-appearance';
// 3D 導覽頁：同一座庭院，沒有人物與登入，鏡頭自動環繞，可拖曳、縮放、點選景點
const base=import.meta.env.BASE_URL;
const scene=new Garden3D(document.querySelector<HTMLElement>('#stage')!,{assetBase:base,figures,showcase:true});
const notes=['把願望寫下來，掛上滿開的櫻花樹。','六十支只說好話的籤，每支附一件今天做得到的小事。','走進亭子坐上蒲團，跟著呼吸慢下來。','站到花苞下，滑兩下，讓聖光把勇氣補滿。','說出卡住你的事，上神轉身替你算算陰影面積。'];
const ui=document.querySelector<HTMLElement>('#ui')!;
ui.innerHTML=`<header class="sc-head"><div><p class="sc-kicker">A GARDEN FOR YOUR HEART</p><h1>輔導寺</h1><p class="sc-tag">青松伴梅樹——輕鬆，沒事。</p></div><a class="sc-cta" href="${base}">走進輔導寺 →</a></header>
<nav class="sc-nav" aria-label="景點導覽"><button type="button" data-view="-1" aria-pressed="true">全景</button>${spots.map((s,i)=>`<button type="button" data-view="${i}" aria-pressed="false">${s.name}</button>`).join('')}</nav>
<p class="sc-note" role="status">拖曳旋轉・滾輪或雙指縮放・點選景點靠近看看</p>`;
const note=ui.querySelector<HTMLElement>('.sc-note')!;
function go(i:number){scene.tour(i);ui.querySelectorAll<HTMLElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.view)===i)));note.textContent=i<0?'拖曳旋轉・滾輪或雙指縮放・點選景點靠近看看':notes[i]}
ui.querySelector('.sc-nav')!.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-view]');if(b)go(Number(b.dataset.view))});
document.querySelector('#stage')!.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-spot]');if(b)go(Number(b.dataset.spot))});
if(!scene.ok)note.textContent='這個瀏覽器無法顯示 3D 畫面，請改用較新的瀏覽器，或直接走進輔導寺。';
