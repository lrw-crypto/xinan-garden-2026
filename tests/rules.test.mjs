import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {test,after,beforeEach} from 'node:test';
import {ref,set,get,runTransaction,serverTimestamp} from 'firebase/database';
const env=await initializeTestEnvironment({projectId:'demo-garden',database:{rules:readFileSync('database.rules.json','utf8')}});
after(()=>env.cleanup());beforeEach(()=>env.clearDatabase());
const db=u=>env.authenticatedContext(u).database();
const player={name:'小光',color:'#80a891',style:'human',x:400,y:300,state:'walking',updatedAt:Date.now()};
test('own character allowed; other UID and malformed fields denied',async()=>{await assertSucceeds(set(ref(db('a'),'players/a'),player));await assertFails(set(ref(db('b'),'players/a'),player));await assertFails(set(ref(db('a'),'players/a'),{...player,x:9999}));await assertFails(set(ref(db('a'),'players/a'),{...player,admin:true}));});
test('cheer words are limited to the fixed list and to the own record',async()=>{const {update}=await import('firebase/database');await set(ref(db('a'),'players/a'),player);await set(ref(db('b'),'players/b'),player);await assertSucceeds(update(ref(db('a'),'players/a'),{emoji:'💪 加油'}));await assertSucceeds(update(ref(db('a'),'players/a'),{emoji:null}));await assertFails(update(ref(db('a'),'players/a'),{emoji:'隨便寫'}));await assertFails(update(ref(db('a'),'players/b'),{emoji:'💪 加油'}));});
test('anonymous unauthenticated reads denied; root remains locked',async()=>{await assertFails(get(ref(env.unauthenticatedContext().database(),'players')));await assertFails(get(ref(db('a'),'/')));});
test('private wishes only owner; public content validation',async()=>{const w={uid:'a',text:'希望我每天進步',createdAt:serverTimestamp()};await assertSucceeds(set(ref(db('a'),'privateWishes/a/one'),w));await assertFails(get(ref(db('b'),'privateWishes/a')));await assertFails(set(ref(db('b'),'privateWishes/a/two'),{...w,uid:'b'}));await assertSucceeds(set(ref(db('a'),'publicWishes/one'),w));await assertFails(set(ref(db('b'),'publicWishes/one'),{...w,uid:'b'}));await assertFails(set(ref(db('a'),'publicWishes/bad'),{...w,text:'去死'}));});
test('public wishes from before Taipei midnight can be cleared by anyone; today\'s cannot',async()=>{const now=Date.now(),midnight=now-((now+28800000)%86400000);await env.withSecurityRulesDisabled(async c=>{await set(ref(c.database(),'publicWishes/old'),{uid:'a',text:'昨天的心願',createdAt:midnight-1000});await set(ref(c.database(),'publicWishes/new'),{uid:'a',text:'今天的心願',createdAt:midnight+1});});await assertFails(set(ref(db('b'),'publicWishes/new'),null));await assertSucceeds(set(ref(db('b'),'publicWishes/old'),null));await assertFails(set(ref(db('b'),'publicWishes'),null));});
test('student styles: the seven bases with optional glasses and freckles',async()=>{for(const style of ['short','pony+g','spiky+f','panda+g+f','raccoon','bunny+f','human','bear'])await assertSucceeds(set(ref(db('a'),'players/a'),{...player,style}));for(const style of ['dragon','panda+x','short+f+g','<b>',''])await assertFails(set(ref(db('a'),'players/a'),{...player,style}));});
test('queue uses transactions, prevents other UID writes and backdating',async()=>{await assertSucceeds(runTransaction(ref(db('a'),'queue/a'),()=>({joinedAt:serverTimestamp()})));await assertFails(set(ref(db('b'),'queue/a'),null));await assertFails(set(ref(db('b'),'queue/b'),{joinedAt:1}));});
test('two authenticated clients receive real realtime presence and movement', async () => {
  const a = db('a'), b = db('b');
  await set(ref(a, 'players/a'), player);
  await set(ref(b, 'players/b'), {...player, name: '小花'});
  const {onValue, update} = await import('firebase/database');
  let unsubscribe = () => {};
  let timer;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(Error('sync timeout')), 5000);
      unsubscribe = onValue(ref(b, 'players'), snap => {
        if (snap.child('a/x').val() === 430 && snap.size === 2) resolve();
      }, reject);
      update(ref(a, 'players/a'), {x: 430}).catch(reject);
    });
  } finally {
    clearTimeout(timer);
    unsubscribe();
  }
});
