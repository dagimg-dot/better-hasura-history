import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json'

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-32.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: {
      16: 'img/logo-16.png',
      32: 'img/logo-32.png',
      48: 'img/logo-48.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['*://*/console*'],
      js: ['src/contentScript/index.ts'],
      all_frames: true,
    },
  ],
  web_accessible_resources: [
    {
      resources: ['img/*', 'src/contentScript/main-world.js'],
      matches: ['<all_urls>'],
    },
  ],
  permissions: ['storage'],
})
