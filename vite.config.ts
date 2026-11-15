import {defineConfig} from 'vite';
// 兩個頁面：index.html（進入庭院）與 showcase.html（3D 導覽）
export default defineConfig({base:'/xinan-garden-2026/',build:{rollupOptions:{input:{main:'index.html',showcase:'showcase.html'}}}});
