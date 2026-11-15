import './style.css';
import {studentPreview,schoolEmblemUrl,figures,studentChoices} from './student-appearance';
import {signInAnonymously} from 'firebase/auth';
import {ref,onValue,onDisconnect,set,update,remove,push,runTransaction,serverTimestamp} from 'firebase/database';
import {auth,database} from './firebase';
import {Garden3D,spots,places,type Player} from './garden3d.js';
import {fortunes} from './fortunes';
import {checkWish} from './moderation.js';
import {sageReply} from './sage.js';
document.querySelector('#app')!.innerHTML=`<header><div class="brand"><img class="brand-emblem" src="${schoolEmblemUrl}" alt="草商校徽"><div><h1>草商輔導寺</h1><small>有心誠則靈，努力自有光。</small></div></div><div id="status">尚未進入庭院</div></header><main><div class="intro"><div><div class="eyebrow">CAOSHANG · A GARDEN FOR YOUR HEART</div><h2>青松伴梅樹——輕鬆，沒事。<span>花開有時，心安有處。</span></h2></div><p class="muted">穿過花影與古亭，<br>為今天的自己留一份溫柔。</p></div><div id="garden"></div><div class="places">${spots.map((s,i)=>`<button data-place="${i}">${['🌸','🎋','🌿','✨','📐'][i]} ${s.name}<span>${['留下一個小小願望','領取今天的鼓勵','跟著呼吸慢下來','為勇氣充充電','說出煩惱，算算陰影面積'][i]}</span></button>`).join('')}<figure class="qr"><img src="${import.meta.env.BASE_URL}art/qr.svg" alt="掃描進入輔導寺的 QR Code" width="180" height="180"><figcaption>掃描進入輔導寺</figcaption></figure></div><p id="notice" role="status"></p></main><footer>不必急著成為誰，今天也請好好照顧自己。<br>匿名陪伴・沒有自由聊天・請勿填寫個人資料</footer><dialog id="modal"></dialog>`;
const $=(s:string)=>document.querySelector(s) as HTMLElement;
const modal=$('#modal') as HTMLDialogElement;
const scene=new Garden3D($('#garden'),{assetBase:import.meta.env.BASE_URL,emblemUrl:schoolEmblemUrl,figures});
let uid='',me:Player,connected=false,lastSent=0,queue:Record<string,{joinedAt:number}>={},queueTimer:ReturnType<typeof setTimeout>|undefined,stageTimer:ReturnType<typeof setInterval>|undefined,blessStart=0,lastQueuePos=-1,awaitingSwipe=false,swipeTimer:ReturnType<typeof setTimeout>|undefined,breathTimer:ReturnType<typeof setInterval>|undefined;
const tell=(s:string)=>{$('#notice').textContent=s};
const fail=(e:unknown)=>tell('操作未完成：'+(e instanceof Error?e.message:String(e))+'。若為權限錯誤，請先依 README 發布已測試規則。');
const safe=(fn:()=>Promise<unknown>)=>void fn().catch(fail);
function show(html:string){modal.innerHTML='<button class="close" aria-label="關閉">×</button>'+html;modal.querySelector('.close')!.addEventListener('click',()=>modal.close());if(!modal.open)modal.showModal()}
modal.addEventListener('cancel',e=>{if(!uid)e.preventDefault()});
modal.addEventListener('close',()=>{// 打坐與坐長椅在關閉視窗後仍維持坐姿，直到自己走開
if(me&&me.state==='praying')state('walking')});
function state(s:string){if(!uid)return;me.state=s;safe(()=>update(ref(database,'players/'+uid),{state:s,updatedAt:Date.now()}))}
scene.moved=(x,y)=>{if(!connected)return;if(!medPanel.hidden)stopMeditation();me.x=x;me.y=y;me.state='walking';if(Date.now()-lastSent>200){lastSent=Date.now();safe(()=>update(ref(database,'players/'+uid),{x:Math.round(x),y:Math.round(y),state:'walking',updatedAt:Date.now()}))}};
let wantStyle='short+g';
let saved:{name?:string;color?:string;style?:string}={};try{saved=JSON.parse(localStorage.getItem('garden-profile')||'{}')}catch{}
show(`<div class="eyebrow">WELCOME HOME</div><h2>歡迎來到草商輔導寺</h2><p>穿上藍白運動服，一起走進小院。</p><div class="student-options">${studentChoices.map(([code,key,label])=>`<button type="button" class="student-choice" data-student="${code}" aria-label="選擇${label}">${studentPreview(key,label+"，藍白運動服")}<span>${label}</span></button>`).join("")}</div><form id="login"><label>暱稱（1–12 字）<input id="name" maxlength="12" required autocomplete="nickname"></label><input type="hidden" id="style" value="short+g"><label>個人光圈顏色<select id="color"><option value="#d398a6">櫻花粉</option><option value="#80a891">薄荷綠</option><option value="#b4a1cb">薰衣草紫</option><option value="#c9a560">奶油黃</option></select></label><button>帶著希望進入庭院 →</button><p class="muted">匿名登入，暱稱與外觀會保留在這個瀏覽器。</p><p id="login-error" role="alert"></p></form>`);
($('#name') as HTMLInputElement).value=saved.name||'';($('#style') as HTMLInputElement).value=studentChoices.some(c=>c[0]===saved.style)?saved.style!:saved.style==='bear'?'long+g':'short+g';($('#color') as HTMLSelectElement).value=saved.color||'#d398a6';
(modal.querySelector('.close') as HTMLElement).style.display='none';
function highlightStudent(){modal.querySelectorAll<HTMLElement>('[data-student]').forEach(b=>{const selected=b.dataset.student===($('#style') as HTMLInputElement).value;b.setAttribute('aria-pressed',String(selected))})}
modal.querySelectorAll<HTMLElement>('[data-student]').forEach(b=>b.addEventListener('click',()=>{($('#style') as HTMLInputElement).value=b.dataset.student!;highlightStudent()}));
highlightStudent();

$('#login').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{const name=($('#name') as HTMLInputElement).value.trim(),style=($('#style') as HTMLInputElement).value,color=($('#color') as HTMLSelectElement).value;if(!name||/[<>\u0000-\u001f]/.test(name))throw Error('請使用合適的暱稱');try{const user=await signInAnonymously(auth);uid=user.user.uid;wantStyle=style;me={name,style,color,x:places.spawn.x,y:places.spawn.y,state:'walking',updatedAt:Date.now()};scene.uid=uid;localStorage.setItem('garden-profile',JSON.stringify({name,style,color}));
onValue(ref(database,'.info/connected'),snap=>{connected=snap.val()===true;if(connected)safe(async()=>{await onDisconnect(ref(database,'players/'+uid)).remove();await onDisconnect(ref(database,'queue/'+uid)).remove();const mine=ref(database,'players/'+uid);try{await set(mine,me)}catch(err){if(me.style==='human'||me.style==='bear')throw err;me={...me,style:/^(long|pony)/.test(wantStyle)?'bear':'human'};await set(mine,me);tell('這個造型需要先更新資料庫規則；在那之前，其他同學會看到你是短髮或長髮同學。')}});else $('#status').textContent='連線中斷・正在重新連線'});
onValue(ref(database,'players'),snap=>{const all=snap.val()||{};if(all[uid])all[uid]={...all[uid],x:me.x,y:me.y,style:wantStyle};scene.players=all;$('#status').textContent='● '+Object.keys(all).length+' 位同學在線'},fail);
onValue(ref(database,'queue'),snap=>{queue=snap.val()||{};processQueue()},fail);
void sweepPublicWishes().catch(()=>{});scheduleSweep();
modal.close();}catch(err){$('#login-error').textContent=String(err);throw err}})});
scene.interact=openPlace;
// 點同學送一句打氣的話：選完後選單自動關閉，那兩個字顯示在自己頭上 5 秒
let cheerTimer:ReturnType<typeof setTimeout>|undefined;
scene.cheer=(_to,emoji)=>{if(!uid||!connected)return;safe(async()=>{const mine=ref(database,'players/'+uid);
await update(mine,{emoji});
clearTimeout(cheerTimer);cheerTimer=setTimeout(()=>safe(()=>update(mine,{emoji:null})),5000)})};document.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',()=>openPlace(Number((b as HTMLElement).dataset.place))));
function openPlace(i:number){if(!uid){tell('請先完成匿名登入。');return}if(!connected){tell('等待重新連線後再試一次。');return}if(i===0)wish();if(i===1)fortune();if(i===2)meditate();if(i===3)blessing();if(i===4)sage()}
// 公開心願只保留到當天：台灣時間凌晨 0 點以前寫的一律不顯示，並從資料庫刪除。
// 沒有後端排程，所以由午夜後第一個開著或打開網站的人代為清除；規則只允許刪除「今天 0 點以前」的公開心願。
const taipeiMidnight=()=>{const now=Date.now();return now-((now+28800000)%86400000)};
async function sweepPublicWishes(){
const {get}=await import('firebase/database');const all:Record<string,{text?:string;createdAt?:number}>=(await get(ref(database,'publicWishes'))).val()||{},cutoff=taipeiMidnight(),today:typeof all={};
for(const [id,w] of Object.entries(all)){if(typeof w?.createdAt==='number'&&w.createdAt>=cutoff)today[id]=w;else void remove(ref(database,'publicWishes/'+id)).catch(()=>{})}
return today}
let sweepTimer:ReturnType<typeof setTimeout>|undefined;
function scheduleSweep(){clearTimeout(sweepTimer);sweepTimer=setTimeout(()=>{if(uid&&connected)void sweepPublicWishes().catch(()=>{});scheduleSweep()},taipeiMidnight()+86400000-Date.now()+5000)}
function wish(){state('praying');show('<h2>🌸 心願祈福樹</h2><p>把希望寫下，也給努力一個方向。</p><div class="branch" id="branch" aria-hidden="true"></div><textarea id="wish" maxlength="120" rows="3" placeholder="120 字以內。請寫給自己或大家的祝福；不留姓名、聯絡方式，不告白"></textarea><label><select id="privacy"><option value="private">私密・只有自己能讀取</option><option value="public">公開・讓小院陪你一起祝福（當天凌晨 0 點清空）</option></select></label><p id="wish-msg" role="alert"></p><button id="send">掛上心願卡</button><div id="wishes"></div>');
$('#send').onclick=()=>safe(async()=>{const text=($('#wish') as HTMLTextAreaElement).value.trim(),publicWish=($('#privacy') as HTMLSelectElement).value==='public';const verdict=checkWish(text);const msg=$('#wish-msg');if(!verdict.ok){if(msg){msg.textContent=verdict.reason;msg.className=verdict.care?'care':''}return}if(msg)msg.textContent='';await set(push(ref(database,publicWish?'publicWishes':'privateWishes/'+uid)),{uid,text,createdAt:serverTimestamp()});const hung=document.createElement('span');hung.className='hung';hung.textContent=publicWish?'願':'心';const branch=$('#branch');if(branch){if(branch.children.length>=7)branch.firstElementChild!.remove();hung.style.left=(8+branch.children.length*13)+'%';branch.append(hung)}scene.hangWish();tell('心願已掛上樹梢，願你帶著希望前進。');($('#wish') as HTMLTextAreaElement).value='';});
safe(async()=>{const {get}=await import('firebase/database');const [today,b]=await Promise.all([sweepPublicWishes(),get(ref(database,'privateWishes/'+uid))]);if(!$('#wishes'))return;$('#wishes').textContent='今天的公開心願與自己的私密心願（公開心願每天凌晨 0 點清空）';Object.values({...today,...b.val()}).filter((v:any)=>typeof v?.text==='string'&&checkWish(v.text).ok).slice(-15).reverse().forEach((v:any)=>{const el=document.createElement('div');el.className='wish';el.textContent='✿ '+v.text;$('#wishes').append(el)})})}
function fortune(){show('<h2>🎋 暖心求籤</h2><div class="tube-wrap"><div id="tube" class="tube" aria-hidden="true"><i></i><i></i><i></i><i></i><b>籤</b></div></div><p>沒有好壞之分，每一支籤都是一份陪伴。</p><button id="draw">搖一支暖心籤</button><div id="result"></div>');$('#draw').onclick=()=>{($('#draw') as HTMLButtonElement).disabled=true;$('#tube').classList.remove('drawn');$('#tube').classList.add('shake');setTimeout(()=>{if(!$('#result'))return;const f=fortunes[crypto.getRandomValues(new Uint32Array(1))[0]%fortunes.length];$('#tube').classList.remove('shake');$('#tube').classList.add('drawn');$('#result').innerHTML=`<div class="card"><b>第 ${f.id} 籤・${f.title}</b><p>${f.poem}</p><p><b>白話解釋</b><br>${f.meaning}。</p><p><b>給你的鼓勵</b><br>${f.encourage}</p><b>今日小行動</b><br>${f.action}。</div>`;($('#draw') as HTMLButtonElement).disabled=false},900)}}
// 靜心：選好時間後視窗自動關閉，回到庭院打坐；倒數與呼吸提示顯示在庭院上方的小面板
const medPanel=document.createElement('div');medPanel.className='g3-med';medPanel.hidden=true;medPanel.innerHTML='<div class="breath"></div><div><b>🌿 靜心中</b><p id="clock"></p></div><button type="button" id="med-stop">結束</button>';$('#garden').append(medPanel);
function stopMeditation(){if(breathTimer){clearInterval(breathTimer);breathTimer=undefined}medPanel.hidden=true}
// 時間到或按「結束」：起身，自己走出靜心亭，把蒲團讓給下一位
function finishMeditation(message:string){stopMeditation();if(me?.state==='meditating'){state('walking');scene.walkOut(2)}tell(message)}
$('#med-stop').addEventListener('click',()=>finishMeditation('已結束靜心，慢慢走出亭子。'));
function meditate(){if(me?.state==='meditating'&&!medPanel.hidden)return;const c=scene.findSeat();if(!c){scene.toast('現在蒲團滿位，請排隊稍等。');return}stopMeditation();place(c.x,c.y);state('meditating');show('<h2>🌿 靜心修行</h2><p>吸氣四秒、吐氣四秒。選好時間後會回到庭院開始打坐，隨時可以按「結束」。</p><div class="actions">'+[30,60,180].map(n=>'<button data-time="'+n+'">'+(n<60?n+' 秒':n/60+' 分鐘')+'</button>').join('')+'</div>');modal.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{let remaining=Number((b as HTMLElement).dataset.time);modal.close();medPanel.hidden=false;$('#clock').textContent='剩餘 '+remaining+' 秒';breathTimer=setInterval(()=>{remaining--;if(remaining>0)$('#clock').textContent='剩餘 '+remaining+' 秒';else finishMeditation('🌿 時間到了。謝謝你，給自己這段安靜的時間。')},1000)}))}
// 數學上神：留言不寫入資料庫，只在自己的瀏覽器處理
let sageBusy=false;
function sage(){if(sageBusy)return;show('<h2>📐 數學上神解惑</h2><p>把卡住你的事說給上神聽（100 字以內）。留言只有你自己看得到，不會被儲存。</p><textarea id="ask" maxlength="100" rows="4" placeholder="例如：模擬考數學又考差了，覺得怎麼讀都沒用……"></textarea><p id="wish-msg" role="alert"></p><button id="ask-send">請上神指點</button>');
$('#ask-send').addEventListener('click',()=>{const text=($('#ask') as HTMLTextAreaElement).value.trim(),verdict=checkWish(text,{vent:true}),msg=$('#wish-msg');
if(!verdict.ok){msg.textContent=verdict.reason;msg.className=verdict.care?'care':'';return}
const r=sageReply(text);sageBusy=true;modal.close();scene.toast('上神：「讓本上神幫你計算陰影面積。」');
setTimeout(()=>{void scene.sageWrite(r.board,5000).then(()=>{sageBusy=false;show('<h2>📐 數學上神</h2><p class="muted">'+r.opener+'</p><div class="card sage-'+({驚恐:'shock',嚴肅:'firm',安慰:'warm'}[r.tone])+'"><b>'+r.tone+'地說：</b><br>「'+r.reply+'」</div><p class="muted">上神的話是依你留言裡的字詞挑選的鼓勵，不是真人或 AI 的回覆。若心裡真的很難受，請找輔導老師聊聊，好嗎？</p>')})},1600)})}
function blessing(){show('<h2>✨ 排隊補運</h2><p>掃走一點煩惱，裝滿一點勇氣。</p><p id="queue-info"></p><div id="queue-line" class="queue-line" aria-label="排隊中的同學"></div><div id="bless-card"></div><div class="actions"><button id="join">排隊補運</button><button id="leave">離開隊伍</button></div><p class="muted">以伺服器時間排序。純前端版本無法保證抵抗惡意插隊；每位同學只能更動自己的紀錄。</p>');$('#join').onclick=()=>safe(async()=>{await onDisconnect(ref(database,'queue/'+uid)).remove();const q=places.queue(1);place(q.x,q.y);state('queue');await runTransaction(ref(database,'queue/'+uid),current=>current||{joinedAt:serverTimestamp()})});$('#leave').onclick=()=>safe(async()=>{await remove(ref(database,'queue/'+uid));state('walking')});processQueue()}
const blessings=['你不必完美，也能勇敢向前。今天試著肯定自己一次。','煩惱掃一掃，心裡就多出放勇氣的位置。慢慢來，你可以的。','星光記得你每一次的努力。累的時候，記得這裡有人陪你。','勇氣不是不害怕，而是帶著害怕也願意再試一次。','今天的你已經很努力了。回去好好吃飯、好好睡覺。','願你讀書時專心，休息時安心，面對考卷時有一顆平靜的心。'];
const stageText=()=>{const t=Date.now()-blessStart;return t<2400?'🧹 聖光灑下，正在掃走煩惱……':t<4800?'💪 正在補充勇氣……':'✨ 星光環繞中……'};
function place(x:number,y:number){scene.stop();me.x=x;me.y=y;safe(()=>update(ref(database,'players/'+uid),{x,y}))}
function processQueue(){
const ordered=Object.entries(queue).sort((a,b)=>a[1].joinedAt-b[1].joinedAt||a[0].localeCompare(b[0]));
const pos=ordered.findIndex(([id])=>id===uid);
if($('#queue-info'))$('#queue-info').textContent=pos<0?'目前 '+ordered.length+' 人等候':pos===0?'補運進行中，請看庭院裡的光苗。':'你的順位：'+(pos+1)+' / '+ordered.length;
const line=$('#queue-line');
if(line){line.replaceChildren();ordered.slice(0,8).forEach(([id],n)=>{const el=document.createElement('span');el.className='queue-person'+(id===uid?' me':'');el.textContent=(n+1)+'. '+(scene.players[id]?.name||'同學');line.append(el)})}
// Waiting students stand in a visible line along the path, nearest the hut first.
if(pos>0&&pos!==lastQueuePos&&me){const q=places.queue(pos);place(q.x,q.y)}
lastQueuePos=pos;
if(pos===0&&!queueTimer&&!awaitingSwipe){
// 輪到自己：關掉排隊視窗，站上補運台，在畫面上滑兩下接引聖光
awaitingSwipe=true;place(places.hutDoor.x,places.hutDoor.y);state('queue');
if(modal.open&&$('#queue-info'))modal.close();
scene.beginSwipe(2,startLight);
// 25 秒內沒有滑動就自動開始，避免後面的同學一直等
swipeTimer=setTimeout(()=>{scene.cancelSwipe();startLight()},25000)}
if(pos!==0){if(awaitingSwipe){awaitingSwipe=false;clearTimeout(swipeTimer);scene.cancelSwipe()}if(queueTimer){clearTimeout(queueTimer);clearInterval(stageTimer);queueTimer=undefined}}}
function startLight(){
if(!awaitingSwipe)return;awaitingSwipe=false;clearTimeout(swipeTimer);
state('blessing');blessStart=Date.now();tell(stageText());stageTimer=setInterval(()=>tell(stageText()),400);
queueTimer=setTimeout(()=>{queueTimer=undefined;clearInterval(stageTimer);safe(async()=>{await remove(ref(database,'queue/'+uid));state('walking');const card=blessings[crypto.getRandomValues(new Uint32Array(1))[0]%blessings.length];tell('✨ 祝福卡：'+card);if(!modal.open)show('<h2>✨ 補運完成</h2><div class="card bless">💫 煩惱輕一點，勇氣多一點。'+card+'</div><p class="muted">帶著這份祝福，慢慢走回自己的路上。</p>')})},7000)}
window.addEventListener('pagehide',()=>{if(uid){void remove(ref(database,'players/'+uid));void remove(ref(database,'queue/'+uid))}});
