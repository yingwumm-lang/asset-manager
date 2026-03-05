import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 注意：这里的 'asset-manager' 必须和你在 GitHub 上创建的仓库名字一模一样！
  base: '/asset-manager/', 
})