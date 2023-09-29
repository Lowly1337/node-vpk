var jBinary = require('jbinary')

const TYPESET = {
    'jBinary.littleEndian': true,
    vpkHeader: jBinary.Type({
        read: function () {
            const header = {}

            const signature = this.binary.read('uint32')
            if (signature !== 0x55aa1234) {
                throw new Error('VPK signature is invalid')
            }

            header.version = this.binary.read('uint32')
            if (header.version !== 1 && header.version !== 2) {
                throw new Error('VPK version is invalid')
            }

            header.treeLength = this.binary.read('uint32')

            if (header.version === 2) {
                header.unknown1 = this.binary.read('uint32')
                header.footerLength = this.binary.read('uint32')
                header.unknown3 = this.binary.read('uint32')
                header.unknown4 = this.binary.read('uint32')
            }

            return header
        },
    }),
    vpkDirectoryEntry: jBinary.Type({
        read: function () {
            const entry = this.binary.read({
                crc: 'uint32',
                preloadBytes: 'uint16',
                archiveIndex: 'uint16',
                entryOffset: 'uint32',
                entryLength: 'uint32',
            })

            const terminator = this.binary.read('uint16')
            if (terminator !== 0xffff) {
                throw new Error('directory terminator is invalid')
            }

            return entry
        },
    }),
    vpkTree: jBinary.Type({
        read: function () {
            const files = {}

            while (true) {
                const extension = this.binary.read('string0')

                if (extension === '') {
                    break
                }

                while (true) {
                    const directory = this.binary.read('string0')

                    if (directory === '') {
                        break
                    }

                    while (true) {
                        const filename = this.binary.read('string0')

                        if (filename === '') {
                            break
                        }

                        let fullPath = filename
                        if (fullPath === ' ') {
                            fullPath = ''
                        }
                        if (extension !== ' ') {
                            fullPath += '.' + extension
                        }
                        if (directory !== ' ') {
                            fullPath = directory + '/' + fullPath
                        }

                        const entry = this.binary.read('vpkDirectoryEntry')
                        entry.preloadOffset = this.binary.tell()

                        this.binary.skip(entry.preloadBytes)

                        files[fullPath] = entry
                    }
                }
            }

            return files
        },
    }),
}

module.exports = TYPESET
