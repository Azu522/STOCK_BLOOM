import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    VitePWA({
registerType: 'autoUpdate',
manifest: {
name: 'STOCK BLOOM',
short_name: 'SB',
description: 'Aplicación Web Progresiva con React y Vite',
theme_color: '#ffffff',
background_color: '#ffffff',
display: 'standalone',
start_url: '/stockbloom',
icons: [
{
src: 'logo2.png',
sizes: '192x192',
type: 'image/png'
},
{
src: 'logo2.png',
sizes: '512x512',
type: 'image/png'
}
]
}
})
  ],
  base: '/stockbloom/'
})
