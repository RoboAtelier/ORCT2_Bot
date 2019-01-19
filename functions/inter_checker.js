/** Runs and monitors interval checking processes
 * @module inter_checker
 */
const { readBotData } = require('./reader');
const { editBotData } = require('./writer');

let devChecker = null;
let launcherChecker = null;
let serverCheckers = {};

/**
 * Creates a checker that performs interval checks for specific conditions
 * and performs an action when a condition is met or changed.
 * 
 * @async
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
async function createNewIntervalChecker(msg, content) {
  let server = 1;
  let option = '';
  
  //Get specific server directory
  if (content.startsWith('-')) {
    option = content;
  }
  else if (/^[1-9][0-9]*$/.test(content)) {
    server = parseInt(content);
  };
  if (option.length > 0) {
    console.log('TODO');
  }
  else {
    const serverChecker = setInterval(() => {
      console.log('TODO');
    }, 3000)
  }
};

module.exports = {
  readBotData,
  editBotData,
};