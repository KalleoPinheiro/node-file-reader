const { join } = require('path');
const { readFileSync, appendFile, readdir, exists, closeSync, openSync, createWriteStream } = require('fs');
const cliProgress = require('cli-progress');
const colors = require('colors');
const customers = require('./customers.js');

const inputDirectoryPath = join(__dirname, 'files');
const outputDirectoryPath = join(__dirname, 'out');
const alteredDirectoryPath = join(__dirname, 'altered');
const discardedDirectoryPath = join(__dirname, 'discarded');
const limitLines = 9;

let countFiles = 1;
let currentFile;
let adhesionColumns = { customer: 1, uf: 30, payment: 62, ocs_activation: 40 };
let purchaseColumns = { customer: 1, uf: null, payment: 28, ocs_activation: 12 };
let kind_action;
let linesPending = [];
let linesAvailable = [];

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

const writeLine = (line, path = alteredDirectoryPath) => {
  try {
    if (!checkFileExists(`${path}/${currentFile}`)) {
      closeSync(openSync(`${path}/${currentFile}`, 'w'));
    }
    appendFile(`${path}/${currentFile}`, `${line}\n`, { encoding: 'UTF-8' }, error => {
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

const checkIsAvailable = (line, column) => {
  return getColumn(line, column);
}

let toRemove = [];
let toStore = [];
let splitedNewLines = [];
let newLines;
let unique;

const checkDuplication = lines => {
  const storage = createWriteStream(`toStore/${currentFile}`);
  const removed = createWriteStream(`toRemove/${currentFile}`);
  const progressBarLines = progressBar(currentFile, lines);

  for (const line of lines) {
    const splitedOriginalLines = line.split('|');
    splitedNewLines.push([...splitedOriginalLines.slice(0, 12), ...splitedOriginalLines.slice(13, splitedOriginalLines.length)].join('|'));
  }

  for (const line of splitedNewLines) {
    if (toStore.includes(line)) {
      toRemove.push(line);
      removed.write(`${line}\n`);
      progressBarLines.increment();
    }
    if (splitedNewLines.includes(line)) {
      toStore.push(line);
      // storage.write(`${line}\n`);
      progressBarLines.increment();
    }
  }

  const storageSet = new Set(toStore);
  // const removedSet = new Set(toRemove);
  // var meuArr = [...diff(storageSet, removedSet)];
  storage.write(`${[...storageSet].join('|\n')}`);

  removed.end();
  storage.end();
  progressBarLines.stop();
}

const diff = (setA, setB) => {
  var _diff = new Set(setA);
  for (var elem of setB) {
    if (_diff.has(elem)) {
      _diff.delete(elem);
    } else {
      _diff.add(elem);
    }
  }
  return _diff;
}

// console.log(toRemove.length);
// console.log(toStore.length);

//   const output = createWriteStream(`${outputDirectoryPath}/${currentFile}`);
//   const outputDiscarded = createWriteStream(`${discardedDirectoryPath}/${currentFile}`);
//   const  progressBarLines = progressBar(currentFile, lines);

//   let groupLines = {};
//   let columns = isAdhesion() ? {...adhesionColumns} : {...purchaseColumns};

//   // Group
//   for (let line of lines) {
//       const arrLines = line.split('|');
//       const indexRoot = `${arrLines[columns.customer]}_${arrLines[columns.payment]}`;
//       if (groupLines[indexRoot] === undefined) {
//         groupLines[indexRoot] = [line];
//       } else {
//         groupLines[indexRoot].push(line);
//       }
//     }

//     // Output
//     for (let group in groupLines) {
//     const linesAvailable = groupLines[group].filter(line => checkIsAvailable(line, columns.ocs_activation));
//     const linesPending = groupLines[group].filter(line => !checkIsAvailable(line, columns.ocs_activation));

//     const fullArray = [...linesAvailable, ...linesPending];

//     const discardedArray = fullArray.slice((linesAvailable.length));

//     const toDiscart = discardedArray.length > 9 ? discardedArray : [];

//     for (let discartedLine of toDiscart) {
//       outputDiscarded.write(`${discartedLine}\n`);
//       progressBarLines.increment();
//     }

//     const limitedArray = fullArray.slice(-(linesAvailable.length + toDiscart.length));

//     for (let line of limitedArray) {
//       const newLine = isAdhesion() ? dataTransformation(line) : line;
//       output.write(`${newLine}\n`);
//       progressBarLines.increment();
//     }
//   }
//   output.end();
//   outputDiscarded.end();
//   progressBarLines.stop();
//   countFiles++;
// }

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