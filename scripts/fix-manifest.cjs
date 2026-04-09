const fs = require('fs')

const manifestPath = './build/manifest.json'
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

if (manifest.content_scripts && manifest.content_scripts[0]) {
  manifest.content_scripts[0].matches = ['*://*/', '*://*/console*']
}

if (manifest.web_accessible_resources) {
  manifest.web_accessible_resources = [
    {
      matches: ['<all_urls>'],
      resources: [
        'img/*',
        'src/contentScript/script-injector.js',
        'assets/*'
      ],
      use_dynamic_url: false
    }
  ]
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

console.log('manifest.json fixed')
