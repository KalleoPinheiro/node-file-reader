const { join } = require('path')
const {
  readFileSync,
  appendFile,
  readdir,
  stat,
  closeSync,
  openSync
} = require('fs')
const cliProgress = require('cli-progress')
const colors = require('colors')
const customers = require('./customers')
const { columns, kind, regex } = require('./constants')

const inputDirectoryPath = join(__dirname, 'files')
const alteredDirectoryPath = join(__dirname, 'altered')

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
      kindAction = checkFileName(file)
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
  if (name.toUpperCase().match(regex.adhesion)) return kind.adhesion
  if (name.toUpperCase().match(regex.purchase)) return kind.purchase
  if (name.toUpperCase().match(regex.registerChange)) return kind.registerChange
}

const fileReader = file => {
  try {
    const dataFile = readFileSync(`${inputDirectoryPath}/${file}`, 'UTF-8')
    const lines = dataFile.split(/\r?\n/)
    dataTransformation(lines)
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
          throw new Error('Falha ao gravar arquivo!')
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

const dataTransformation = lines => {
  const progressBarLines = progressBar(currentFile, lines)
  for (const line of lines) {
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
    progressBarLines.increment()
  }
  progressBarLines.stop()
}

const handdleError = error => {
  return console.log(error)
}

readdir(inputDirectoryPath, readFiles)
