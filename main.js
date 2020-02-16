const { join } = require('path');
const { readFileSync, appendFile, readdir, exists, closeSync, openSync, createWriteStream } = require('fs');
const cliProgress = require('cli-progress');
const colors = require('colors');
const customers = require('./customers.js');

const inputDirectoryPath = join(__dirname, 'files');
const outputDirectoryPath = join(__dirname, 'out');
const alteredDirectoryPath = join(__dirname, 'altered');
const discardedDirectoryPath = join(__dirname, 'discarded');
// const limitLines = 9;

let limitLines;
let countFiles = 1;
let currentFile;
let adhesionColumns = { customer: 1, uf: 30, payment: 62, ocs_activation: 40 };
let purchaseColumns = { customer: 1, uf: null, payment: 28, ocs_activation: 12 };
let kind_action;

const readFiles = (error, files) => {
  if (error) {
    handdleError();
  }
  try {
    for (const file of files) {
      currentFile = file;
      checkFileName(file);
      fileReader(file);
    }
  } catch (error) {
    handdleError(error);
  }
}

const getColumn = (line, column) => {
  const arrLine = line.split('|');
  return arrLine[column] || null;
}

const progressBar = (file, lines) => {
  console.log('-----------------------------------------------------------------------------');
  console.log(`File ${file}`);
  const progressBarLines = new cliProgress.SingleBar({
    format: `Progress |${colors.cyan('{bar}')}| {percentage}% || {value}/{total} || File ${countFiles}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  progressBarLines.start(lines.length, 0);
  return progressBarLines;
}

const checkFileName = name => {
  kind_action = name.match(/ADESAO_PRIMEIRA_COMPRA/g) ? 'adhesion' : 'purchase';
}

const isAdhesion = () => {
  return !!(kind_action === 'adhesion');
}

const fileReader = file => {
  try {
    const dataFile = readFileSync(`${inputDirectoryPath}/${file}`, 'UTF-8');
    const lines = dataFile.split(/\r?\n/);
    checkDuplication(lines);

  } catch (error) {
    handdleError(error);
  }
}

const checkFileExists = fileName => {
  exists(fileName, exist => {
    return exist;
  });
}

const writeLine = line => {
  try {
    if (!checkFileExists(`${alteredDirectoryPath}/${currentFile}`)) {
      closeSync(openSync(`${alteredDirectoryPath}/${currentFile}`, 'w'));
    }
    appendFile(`${alteredDirectoryPath}/${currentFile}`, `${line}\n`, { encoding: 'UTF-8' }, error => {
      if (error) {
        throw new Error('Falha!');
      }
    });
  } catch (error) {
    handdleError(error);
  }
}

const groupBy = (array, property) => {
  return array.reduce((acc, obj) => {
    const key = obj[property];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
}

const checkDuplication = lines => {
  const output = createWriteStream(`${outputDirectoryPath}/${currentFile}`);
  const outputDiscarded = createWriteStream(`${discardedDirectoryPath}/${currentFile}`);
  const progressBarLines = progressBar(currentFile, lines);

  let groupLines = {};
  let columns = isAdhesion() ? { ...adhesionColumns } : { ...purchaseColumns };

  const groupingLineArray = [];

  for (const line of lines) {
    const splitedLine = line.split('|');
    groupingLineArray.push({ key: `${splitedLine[columns.customer]}-${splitedLine[columns.payment]}`, line });
  }

  const groupedArrayLine = groupBy(groupingLineArray, 'key');
  console.log(groupedArrayLine);

  groupedArrayLine.fi

  // Group
  // for (let line of lines) {
  //     const arrLines = line.split('|');
  //     const indexRoot = `${arrLines[columns.customer]}_${arrLines[columns.payment]}`;
  //     if (groupLines[indexRoot] === undefined) {
  //       groupLines[indexRoot] = [line];
  //     } else {
  //       groupLines[indexRoot].push(line);
  //     }
  //   }

  //   // Output
  //   for (let group in groupLines) {
  //     const linesAvailable = groupLines[group].filter(line => getColumn(line, columns.ocs_activation) !== '');
  //     const linesPending = groupLines[group].filter(line => getColumn(line, columns.ocs_activation) === '');
  //     limitLines = linesAvailable.length;

  //   const fullArray = [...linesAvailable, ...linesPending];

  //   const discardedArray = fullArray.slice(limitLines, fullArray.length);
  //   for (let discartedLine of discardedArray) {
  //     outputDiscarded.write(`${discartedLine}\n`);
  //     progressBarLines.increment(fullArray.length - limitLines);
  //   }

  //   const limitedArray = fullArray.slice(0, limitLines);
  //   for (let line of limitedArray) {
  //     const newLine = isAdhesion() ? dataTransformation(line) : line;
  //     output.write(`${newLine}\n`);
  //     progressBarLines.increment();
  //   }
  // }

  output.end();
  outputDiscarded.end();
  progressBarLines.stop();
  countFiles++;
}
const dataTransformation = line => {
  const dataLine = line.split('|');
  const customerIdOfLine = dataLine[1];
  dataLine[27] = '';
  dataLine[29] = '';
  dataLine[adhesionColumns.uf] = dataLine[adhesionColumns.uf] && dataLine[adhesionColumns.uf].toUpperCase();

  const findedCustomer = customers.find(customer => customer.customer_id === customerIdOfLine);
  if (findedCustomer) {
    dataLine[adhesionColumns.uf] = findedCustomer.uf.toUpperCase();
    writeLine(dataLine.join('|'));
  }

  return dataLine.join('|');
}

const handdleError = error => {
  return console.log(error);
}

readdir(inputDirectoryPath, readFiles);