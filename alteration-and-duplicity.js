const { join } = require('path')
const {
  readFileSync,
  appendFile,
  readdir,
  exists,
  closeSync,
  openSync,
  createWriteStream
} = require('fs')
const cliProgress = require('cli-progress')
const colors = require('colors')
const customers = require('./customers.js')

const inputDirectoryPath = join(__dirname, 'files')
const outputDirectoryPath = join(__dirname, 'out')
const alteredDirectoryPath = join(__dirname, 'altered')
const discardedDirectoryPath = join(__dirname, 'discarded')

let countFiles = 1
let currentFile
const adhesionColumns = {
  customer: 1,
  uf: 30,
  payment: 62,
  ocs_activation: 40,
  description: 41,
  adress_number: 24
}
const purchaseColumns = {
  customer: 1,
  uf: null,
  payment: 28,
  ocs_activation: 12,
  description: 13
}
let kind_action
let linesPending = []
let linesAvailable = []

const readFiles = (error, files) => {
  if (error) {
    handdleError()
  }
  try {
    for (const file of files) {
      currentFile = file
      checkFileName(file)
      fileReader(file)
    }
  } catch (error) {
    handdleError(error)
  }
}

const progressBar = (file, lines) => {
  console.log(
    '-----------------------------------------------------------------------------'
  )
  console.log(`File ${file}`)
  const progressBarLines = new cliProgress.SingleBar(
    {
      format: `Progress |${colors.cyan(
        '{bar}'
      )}| {percentage}% || {value}/{total} || File ${countFiles} - ${currentFile}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    },
    cliProgress.Presets.shades_classic
  )
  progressBarLines.start(lines.length, 0)
  return progressBarLines
}

const checkFileName = name => {
  kind_action = name.match(/ADESAO_PRIMEIRA_COMPRA/g) ? 'adhesion' : 'purchase'
}

const isAdhesion = () => {
  return !!(kind_action === 'adhesion')
}

const fileReader = file => {
  try {
    const dataFile = readFileSync(`${inputDirectoryPath}/${file}`, 'UTF-8')
    const lines = dataFile.split(/\r?\n/)
    checkIsDuplicate(lines)
  } catch (error) {
    handdleError(error)
  }
}

const checkFileExists = fileName => {
  exists(fileName, exist => {
    return exist
  })
}

const writeLine = line => {
  try {
    if (!checkFileExists(`${alteredDirectoryPath}/${currentFile}`)) {
      closeSync(openSync(`${alteredDirectoryPath}/${currentFile}`, 'w'))
    }
    appendFile(
      `${alteredDirectoryPath}/${currentFile}`,
      `${line}\n`,
      { encoding: 'UTF-8' },
      error => {
        if (error) {
          throw new Error('Falha!')
        }
      }
    )
  } catch (error) {
    handdleError(error)
  }
}

const checkIsPending = (line, column) => {
  const arrLine = line.split('|')
  return arrLine[column] || null
}

const checkIsDuplicate = lines => {
  const output = createWriteStream(`${outputDirectoryPath}/${currentFile}`)
  const outputDiscarded = createWriteStream(
    `${discardedDirectoryPath}/${currentFile}`
  )
  const progressBarLines = progressBar(currentFile, lines)

  const groupLines = {}
  const columns = isAdhesion() ? { ...adhesionColumns } : { ...purchaseColumns }

  for (const line of lines) {
    const arrLines = line.split('|')
    const indexRoot = `${arrLines[columns.customer]}_${
      arrLines[columns.payment]
    }`
    if (groupLines[indexRoot] === undefined) {
      groupLines[indexRoot] = [line]
    } else {
      groupLines[indexRoot].push(line)
    }
  }

  for (const group in groupLines) {
    const full = [
      ...groupLines[group].filter(
        item => checkIsPending(item, columns.ocs_activation) !== null
      ),
      ...groupLines[group].filter(
        item => checkIsPending(item, columns.ocs_activation) === null
      )
    ]
    full.reduce((_, el) => {
      if (
        linesAvailable.length &&
        linesAvailable.find(
          line =>
            line.split('|')[columns.description] ===
            el.split('|')[columns.description]
        )
      ) {
        linesPending.push(el)
      } else {
        linesAvailable.push(el)
        return el
      }
    }, [])

    for (const discartedLine of linesPending) {
      outputDiscarded.write(`${discartedLine}\n`)
      progressBarLines.increment()
    }

    for (const line of linesAvailable) {
      const newLine = isAdhesion() ? dataTransformation(line) : line
      output.write(`${newLine}\n`)
      progressBarLines.increment()
    }
    linesAvailable = []
    linesPending = []
    fullArray = []
    discardedArray = []
    limitedArray = []
  }
  output.end()
  outputDiscarded.end()
  progressBarLines.stop()
  countFiles++
}

const dataTransformation = line => {
  const dataLine = line.split('|')
  const customerIdOfLine = dataLine[1]
  dataLine[27] = ''
  dataLine[29] = ''
  dataLine[29] = ''
  dataLine[24] =
    dataLine[adhesionColumns.adress_number] &&
    dataLine[adhesionColumns.adress_number].trim().toLocaleUpperCase() === 'S/N'
      ? '00000'
      : dataLine[adhesionColumns.adress_number]
  dataLine[adhesionColumns.uf] =
    dataLine[adhesionColumns.uf] && dataLine[adhesionColumns.uf].toUpperCase()

  const findedCustomer = customers.find(
    customer => customer.customer_id === customerIdOfLine
  )
  if (findedCustomer) {
    dataLine[adhesionColumns.uf] = findedCustomer.uf.toUpperCase()
    writeLine(dataLine.join('|'))
  }
  return dataLine.join('|')
}

const handdleError = error => {
  return console.log(error)
}

readdir(inputDirectoryPath, readFiles)
