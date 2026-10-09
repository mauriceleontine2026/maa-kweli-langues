import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default () => {
  return defineConfig({
    plugins: [
      react(),
    ],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, 'src') }
      ],
      extensions: ['.js', '.cjs', '.mjs', '.ts', '.jsx', '.tsx', '.json', '.JSON']
    },
    server: {
      open: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    optimizeDeps: {
      include: ['framer-motion']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('/node_modules/')) return undefined

            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
            if (/\/node_modules\/(react-router|react-router-dom)\//.test(id)) return 'router-vendor'
            if (id.includes('/node_modules/@supabase/')) return 'supabase-vendor'
            if (/\/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion-vendor'
            if (id.includes('/node_modules/@tanstack/')) return 'query-vendor'

            return undefined
          },
        },
      },
    }
  })
}

