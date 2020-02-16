

// const checkDuplication = lines => {
//   const output = createWriteStream(`${outputDirectoryPath}/${currentFile}`);
//   const outputDiscarded = createWriteStream(`${discardedDirectoryPath}/${currentFile}`);
//   const progressBarLines = progressBar(currentFile, lines);

//   let columns = isAdhesion() ? { ...adhesionColumns } : { ...purchaseColumns };

//   const groupingLineArray = [];

//   for (const line of lines) {
//     const splitedLine = line.split('|');
//     groupingLineArray.push({ key: `${splitedLine[columns.customer]}-${splitedLine[columns.payment]}`, line });
//   }

//   const groupedArrayLine = groupBy(groupingLineArray, 'key');
//   const customersID = Object.keys(groupedArrayLine);
//   for (let customer in customersID) {
//     const obj = groupedArrayLine[customersID[customer]];
//     const mapped = obj.map(item => item.line.split('|'));
//     const preenchido = mapped.filter(item => item[columns.ocs_activation] !== '');
//     const vazios = mapped.filter(item => item[columns.ocs_activation] === '');

//     if(preenchido.length){
//       const line = preenchido.map(el => el.join('|'))[0];
//       if(line){
//         linesAvailable.push(line);
//       }
//     }

//     if(vazios.length) {
//       const line = vazios.map(el => el.join('|'))[0];
//       if(line){
//         linesPending.push(line);
//       }
//     }
//   }

//   for (let discartedLine of linesPending) {
//     outputDiscarded.write(`${discartedLine}\n`);
//     progressBarLines.increment();
//   }

//   for (let line of linesAvailable) {
//     const newLine = isAdhesion() ? dataTransformation(line) : line;
//     output.write(`${newLine}\n`);
//     progressBarLines.increment();
//   }
  
//   output.end();
//   outputDiscarded.end();
//   progressBarLines.stop();
//   countFiles++;
// }
