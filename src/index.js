'use strict'

const crc = require('crc')
const fs = require('fs')
const jBinary = require('jbinary')
const TYPESET = require('./typeset.js')

const HEADER_1_LENGTH = 12
const HEADER_2_LENGTH = 28

class VPK {
    constructor(path) {
        this.directoryPath = path
    }

    isValid() {
        const header = new Buffer.alloc(HEADER_2_LENGTH)
        const directoryFile = fs.openSync(this.directoryPath, 'r')
        fs.readSync(directoryFile, header, 0, HEADER_2_LENGTH, 0)
        const binary = new jBinary(header, TYPESET)

        try {
            binary.read('vpkHeader')

            return true
        } catch (e) {
            return false
        }
    }

    load() {
        const binary = new jBinary(fs.readFileSync(this.directoryPath), TYPESET)

        this.header = binary.read('vpkHeader')
        this.tree = binary.read('vpkTree')
    }

    get files() {
        return Object.keys(this.tree)
    }

    getFile(path) {
        const entry = this.tree[path]

        if (!entry) {
            return null
        }

        const file = new Buffer.alloc(entry.preloadBytes + entry.entryLength)

        let fileDescriptor = undefined

        if (entry.preloadBytes > 0) {
            fileDescriptor = fs.openSync(this.directoryPath, 'r')
            fs.readSync(fileDescriptor, file, 0, entry.preloadBytes, entry.preloadOffset)
        }

        if (entry.entryLength > 0) {
            if (entry.archiveIndex === 0x7fff) {
                let offset = this.header.treeLength

                if (this.header.version === 1) {
                    offset += HEADER_1_LENGTH
                } else if (this.header.version === 2) {
                    offset += HEADER_2_LENGTH
                }

                fileDescriptor = fs.openSync(this.directoryPath, 'r')
                fs.readSync(
                    fileDescriptor,
                    file,
                    entry.preloadBytes,
                    entry.entryLength,
                    offset + entry.entryOffset
                )
            } else {
                const fileIndex = ('000' + entry.archiveIndex).slice(-3)
                const archivePath = this.directoryPath.replace(
                    /_dir\.vpk$/,
                    '_' + fileIndex + '.vpk'
                )

                fileDescriptor = fs.openSync(archivePath, 'r')
                fs.readSync(
                    fileDescriptor,
                    file,
                    entry.preloadBytes,
                    entry.entryLength,
                    entry.entryOffset
                )
            }
        }

        if (fileDescriptor) fs.closeSync(fileDescriptor)

        if (crc.crc32(file) !== entry.crc) {
            throw new Error('CRC does not match')
        }

        return file
    }
}

module.exports = VPK
