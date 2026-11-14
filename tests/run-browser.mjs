import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],{
  env:{...process.env,VITE_EMULATORS:'true'},stdio:'inherit'
});
let exited=false;
server.on('exit',()=>{exited=true});
try {
  let ready=false;
  for(let i=0;i<100;i++){
    if(exited)throw Error('Test Vite server exited before readiness');
    try {
      const response=await fetch('http://127.0.0.1:5174/xinan-garden-2026/');
      if(response.ok&&(await response.text()).includes('/src/main.ts')){ready=true;break}
    } catch {}
    await delay(100);
  }
  if(!ready)throw Error('Test Vite server did not become ready');
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['tests/browser.mjs'],{stdio:'inherit'});
    child.on('error',reject);
    child.on('exit',resolve);
  });
  if(code!==0)throw Error('Browser tests failed with exit code '+code);
} finally {
  server.kill('SIGTERM');
}
