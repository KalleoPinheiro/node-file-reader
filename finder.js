const cliProgress = require('cli-progress')
const colors = require('colors')
const { join } = require('path')
const { readFileSync, readdir, createWriteStream } = require('fs')
const payments = require('./payments')
const inputDirectoryPath = join(__dirname, 'files')
const locatedDirectoryPath = join(__dirname, 'located')
const foundedPayments = []

const progressBar = files => {
  const progressBarLines = new cliProgress.SingleBar(
    {
      format: `Progress |${colors.cyan(
        '{bar}'
      )}| {percentage}% || {value}/{total}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    },
    cliProgress.Presets.shades_classic
  )
  progressBarLines.start(files.length * 2, 0)
  return progressBarLines
}

const diff = (setA, setB) => {
  var _diff = new Set(setA)
  for (var el of setB) {
    if (_diff.has(el)) {
      _diff.delete(el)
    } else {
      _diff.add(el)
    }
  }
  return _diff
}

const readFiles = (error, files) => {
  if (error) {
    handdleError()
  }
  try {
    const output = createWriteStream(`${locatedDirectoryPath}/found.txt`)
    const progressBarLines = progressBar(files)
    for (const file of files) {
      const dataFile = readFileSync(`${inputDirectoryPath}/${file}`, 'UTF-8')
      for (const payment of payments) {
        if (dataFile.includes(payment)) {
          foundedPayments.push(payment)
        }
      }
      progressBarLines.increment()
    }
    const foundSet = new Set(foundedPayments)
    const paymentsSet = new Set(payments)
    const diffSet = diff(paymentsSet, foundSet)
    const diffArray = [...diffSet]
    output.write(diffArray.map(diff => `${diff};;NÃO ENCONTRADO`).join('\n'))
    output.write(`\n`)

    for (const file of files) {
      for (const payment of foundedPayments) {
        const dataFile = readFileSync(`${inputDirectoryPath}/${file}`, 'UTF-8')
        if (dataFile.includes(payment)) {
          const lines = dataFile.split(/\r?\n/)
          for (const line of lines) {
            if (line.includes(payment)) {
              output.write(`${payment};${file};${line}\n`)
            }
          }
        }
      }
      progressBarLines.increment()
    }
    output.end()
    progressBarLines.stop()
  } catch (error) {
    handdleError(error)
  }
}

const handdleError = error => {
  return console.log(error)
}

readdir(inputDirectoryPath, readFiles)
