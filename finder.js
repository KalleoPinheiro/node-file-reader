const { join } = require('path')
const { readFileSync, readdir, createWriteStream } = require('fs')
const payments = require('./payments')
const finder = []
const inputDirectoryPath = join(__dirname, 'files')
const locatedDirectoryPath = join(__dirname, 'located')

const readFiles = (error, files) => {
  if (error) {
    handdleError()
  }
  try {
    const output = createWriteStream(`${locatedDirectoryPath}/found.txt`)
    const storageSet = new Set()
    for (const file of files) {
      const dataFile = readFileSync(`${inputDirectoryPath}/${file}`, 'UTF-8')
      const lines = dataFile.split(/\r?\n/)
      for (const payment of payments) {
        for (const line of lines) {
          if (line.includes(payment)) {
            storageSet.add(`${payment};${file};${line}`)
          }
        }
      }
    }
    output.write(`${[...storageSet].join('\n')}`)
    output.end()
  } catch (error) {
    handdleError(error)
  }
}

const handdleError = error => {
  return console.log(error)
}

readdir(inputDirectoryPath, readFiles)
