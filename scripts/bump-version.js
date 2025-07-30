import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const bumpType = process.argv[2]
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Error: Invalid bump type. Use "patch", "minor", or "major".')
  process.exit(1)
}

try {
  // Bump version in package.json
  execSync(`npm version ${bumpType} --no-git-tag-version`, { stdio: 'inherit' })

  // Read new version
  const pkgPath = path.join(process.cwd(), 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const newVersion = pkg.version

  // Commit, tag, and push
  execSync('git add package.json', { stdio: 'inherit' })
  execSync(`git commit -m "Bump version to v${newVersion}"`, { stdio: 'inherit' })
  execSync(`git tag v${newVersion}`, { stdio: 'inherit' })
  execSync('git push origin HEAD:main', { stdio: 'inherit' })
  execSync('git push origin --tags', { stdio: 'inherit' })

  console.log(`Version bumped to v${newVersion} and pushed successfully.`)
} catch (error) {
  console.error('Error during version bump:', error.message)
  process.exit(1)
}
