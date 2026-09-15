import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ base:process.env.KIDDIE_LOG_BASE||'/', plugins: [react()], server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:4174' } } });
