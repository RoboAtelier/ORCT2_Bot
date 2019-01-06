/** Command module for moving scenarios
 * @module move
 * @requires fs
 */
const fs = require('fs');

let scenarioDir = '';
let discardDir = '';

/**
 * Load scenario directory paths
 * @function
 * @param {string} scenario directory path
 * @param {string} discard directory path
 */
function loadScenarioDirectoryPaths(spath, dpath) {
  scenarioDir = spath;
  discardDir = dpath;
};

/**
 * Removes a scenario from the scenario directory
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @param {string} action to perform
 * @returns {string} log entry
 */
function moveScenario(msg, content, action) {
  const search = content.toLowerCase();
  let startDir = '';
  let endDir = '';
  if (action === 'discard') {
    startDir = scenarioDir;
    endDir = discardDir;
  }
  else if (action === 'restore') {
    startDir = discardDir;
    endDir = scenarioDir;
  }
  return new Promise((resolve, reject) => {
    if (search.length === 0) {
      msg.channel.send('No search string given.');
      reject(`No search string given by ${msg.author.username}.`)
    }
    fs.readdir(startDir, (err, files) => {
      if (err) {
        msg.channel.send('Something went wrong while reading files.');
        reject(err);
      };
      resolve(
      
        //Return only subset of files with search string
        files.filter(file => {
          return file.toLowerCase().replace('_', ' ').includes(search);
        })
      );
    });
  })
  .then(files => {
    const scenarios = files.filter(file => {
      return (
        file.toLowerCase().endsWith('.sc6')
        || file.toLowerCase().endsWith('.sv6')
        || file.toLowerCase().endsWith('.sc4')
      );
    })
    
    //Only move one file at a time
    if (scenarios.length > 1) {
      msg.channel.send(`Input returned multiple results:\n\n*${scenarios.join('*\n*')}*\n\nPlease enter a more exact name of the scenario.`);
      return 'Successfully attempted to move a scenario.';
    }
    else if (scenarios.length === 0) {
      msg.channel.send('Input could not match a specific scenario.');
      return 'Successfully attempted to move a scenario.';
    }
    else {
      fs.rename(
        `${startDir}/${scenarios[0]}`,
        `${endDir}/${scenarios[0]}`,
        err => {
          if (err) {
            msg.channel.send('Something went wrong with file the file transfer.');
            throw err;
          };
        }
      );
      if (endDir === discardDir) {
        msg.channel.send(`Successfully moved ${scenarios[0]} into the discard pile.`);
      }
      else if (endDir === scenarioDir) {
        msg.channel.send(`Successfully moved ${scenarios[0]} into the scenario pile.`);
      };
      return `Successfully moved a scenario: \'${scenarios[0]}\'`;
    };
  })
};

module.exports = {
  loadPaths: loadScenarioDirectoryPaths,
  moveScenario,
};