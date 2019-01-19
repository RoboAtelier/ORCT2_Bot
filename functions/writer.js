/** Contains methods that writes to files and directories
 * @module writer
 * @requires fs
 */
const { readFileSync, writeFileSync } = require('fs');

/**
 * Writes into the bot data file.
 * 
 * @async
 * @function
 * @param {string} field - Field to write to
 * @param {string} value - New value to set for the field
 */
async function editBotData(field, value) {
  let data = readFileSync('./botdata', 'utf8').split(/\r\n|\n/);
  for (let i = 0; i < data.length; i++) {
    if (data[i].startsWith(field)) {
      data[i] = `${field}=${value}`;
      botdata[field] = value;
      break;
    };
  };
  writeFileSync('./botdata', data.join('\n'));
};

module.exports = {
  editBotData
};