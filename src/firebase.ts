import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator} from 'firebase/database';
const emulatorMode=import.meta.env.VITE_EMULATORS==='true';
const firebaseConfig={apiKey:"AIzaSyAOLdQKorjcxP1LpjsAek4D4qT8D8M3z-s",authDomain:"xinan-garden-2026.firebaseapp.com",databaseURL:"https://xinan-garden-2026-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"xinan-garden-2026",storageBucket:"xinan-garden-2026.firebasestorage.app",messagingSenderId:"864838322206",appId:"1:864838322206:web:93b943661c6c313880460f",measurementId:"G-9K1CBX5JBS"};
export const app=initializeApp(emulatorMode?{...firebaseConfig,projectId:"demo-garden",databaseURL:"https://demo-garden-default-rtdb.firebaseio.com"}:firebaseConfig);
export const auth=getAuth(app), database=getDatabase(app);
if(emulatorMode){connectAuthEmulator(auth,'http://127.0.0.1:9099');connectDatabaseEmulator(database,'127.0.0.1',9000);}
