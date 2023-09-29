const fs = require('fs')
const vpk = require('../src/index')

// 
const vpkDir = new vpk('./example/cs2_pak01_dir.vpk')
vpkDir.load()

const vpkFileNames = []

for (const fileName of vpkDir.files) {
    vpkFileNames.push(fileName)
}

fs.writeFileSync('./example/out.json', JSON.stringify(vpkFileNames), 'utf8')
