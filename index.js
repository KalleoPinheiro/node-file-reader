const { join } = require('path')
const {
  readFileSync,
  appendFile,
  readdir,
  stat,
  closeSync,
  openSync,
  createWriteStream
} = require('fs')
const cliProgress = require('cli-progress')
const colors = require('colors')
const customers = require('./customers.js')
const { columns, regex, kind } = require('./constants')

const inputDirectoryPath = join(__dirname, 'files')
const outputDirectoryPath = join(__dirname, 'out')
const alteredDirectoryPath = join(__dirname, 'altered')
const discardedDirectoryPath = join(__dirname, 'discarded')
const linesPending = []
const linesAvailable = []

let countFiles = 1
let currentFile
let kindAction

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
  switch (name) {
    case name.match(regex.adhesion):
      kindAction = kind.adhesion
      break
    case name.match(regex.purchase):
      kindAction = kind.purchase
      break
    case name.match(regex.registerChange):
      kindAction = kind.registerChange
      break
  }
}

const isAdhesion = () => {
  return !!(kindAction === kind.adhesion)
}

const isRegisterChange = () => {
  return !!(kindAction === kind.registerChange)
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
  stat(fileName, exist => {
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

const setColumns = () => {
  switch (kindAction) {
    case kind.adhesion:
      return { ...columns.adhesion }
    case kind.purchase:
      return { ...columns.purchase }
    case kind.registerChange:
      return { ...columns.registerChange }
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
  const columnKind = setColumns()

  for (const line of lines) {
    const arrLines = line.split('|')
    const indexRoot = `${arrLines[columnKind.customer]}_${
      arrLines[columnKind.payment]
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
        item => checkIsPending(item, columnKind.ocs_activation) !== null
      ),
      ...groupLines[group].filter(
        item => checkIsPending(item, columnKind.ocs_activation) === null
      )
    ]
    full.reduce((_, el) => {
      if (
        linesAvailable.length &&
        linesAvailable.find(
          line =>
            line.split('|')[columnKind.description] ===
            el.split('|')[columnKind.description]
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
      const newLine =
        isAdhesion() || isRegisterChange() ? dataTransformation(line) : line
      output.write(`${newLine}\n`)
      progressBarLines.increment()
    }
  }
  output.end()
  outputDiscarded.end()
  progressBarLines.stop()
  countFiles++
}

const dataTransformation = line => {
  const dataLine = line.split('|')
  const columns = setColumns()
  const customerIdOfLine = dataLine[columns.customer]
  dataLine[columns.city_code] = ''
  dataLine[columns.uf_code] = ''
  dataLine[columns.uf] =
    dataLine[columns.uf] && dataLine[columns.uf].toUpperCase()

  const findedCustomer = customers.find(
    customer => customer.customer_id === customerIdOfLine
  )
  if (findedCustomer) {
    dataLine[columns.uf] = findedCustomer.uf.toUpperCase()
    writeLine(dataLine.join('|'))
  }
  return dataLine.join('|')
}

const handdleError = error => {
  return console.log(error)
}

readdir(inputDirectoryPath, readFiles)
