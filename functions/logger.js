/** Logs application activity
 * @module logger
 * @requires fs
 */
const { createWriteStream } = require('fs');

/**
 * Write to log file.
 * @function
 * @param {string} log contents
 * @param {string} path to log file
 * @returns {number} indicates successful action
 */
async function writeToLogFile(log, path) {
  try {
    let ws = createWriteStream(path, { flags: 'a' });
    ws.write(`[${new Date().toISOString().replace('T', ' ').substring(0, 19)}] ${log}\n`);
    ws.end();
    return 1;
  }
  catch(err) {
    throw err;
  };
};

/**
 * Write log contents to multiple log files.
 * @function
 * @param {string} log contents
 * @param {string[]} paths to log files
 * @returns {number} number of successful actions
 */
async function writeToMultipleLogFiles(log, paths) {
  try {
    let successes = 0;
    for (let i = 0; i < paths.length; i++) {
      let ws = createWriteStream(path, { flags: 'a' });
      ws.write(`[${new Date().toISOString().replace('T', ' ').substring(0, 19)}] ${log}\n`);
      ws.end();
      successes = successes + 1;
    };
    return successes;
  }
  catch(err) {
    throw err;
  };
};

module.exports = {
  writeLog: writeToLogFile,
  writeMany: writeToMultipleLogFiles,
}