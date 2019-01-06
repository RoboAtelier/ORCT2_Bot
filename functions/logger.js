/** Logs application activity
 * @module logger
 * @requires fs
 */
const fs = require('fs');

/**
 * Write to log file.
 * @function
 * @param {string} log contents
 * @param {string} path to log file
 * @returns {number} indicates successful action
 */
function writeToLogFile(log, path) {
  return new Promise((resolve, reject) => {
    let ws = fs.createWriteStream(path, { flags: 'a' });
    ws.write(`[${new Date().toISOString().replace('T', ' ').substring(0, 19)}] ${log}\n`);
    ws.end();
    resolve(1);
  })
};

/**
 * Write log contents to multiple log files.
 * @function
 * @param {string} log contents
 * @param {string[]} paths to log files
 * @returns {number} number of successful actions
 */
function writeToMultipleLogFiles(log, paths) {
  let successes = 0;
  return new Promise((resolve, reject) => {
    paths.forEach(path => {
      let ws = fs.createWriteStream(path, { flags: 'a' });
      ws.write(`[${new Date().toISOString().replace('T', ' ').substring(0, 19)}] ${log}\n`);
      ws.end();
      successes = successes + 1;
    });
    resolve(successes);
  })
};

module.exports = {
  writeLog: writeToLogFile,
  writeMany: writeToMultipleLogFiles,
}