/** Command module for scenarios for multiplayer
 * @module scenarios
 * @requires fs
 */
const { readdir, rename } = require('fs');
const { config } = require('../config');

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
 * Lists multiplayer scenarios in a directory
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
function listScenarios(msg, content) {
  let page = 1;
  let pages = 1;
  let params = content;
  let search = '';
  let option = '';
  let startDir = scenarioDir;
  if (params.length > 0) {
    
    //Load option
    if (params.startsWith('-')) {
      let paramSlice = content.split(' ');
      let optionSlice = paramSlice.splice(0, 1);
      params = paramSlice.join(' ');
      option = optionSlice[0];
    };
    
    //Search by page
    if (/^[0-9]+$/.test(params)) {
      page = parseInt(params);
    }
    
    //Search by name
    else if (params.length > 0) {
      search = params.toLowerCase();
    };
  };
  if (option === '-d') {
    startDir = discardDir;
  }
  return new Promise((resolve, reject) => {
    readdir(startDir, (err, files) => {
      if (err) {
        msg.channel.send('Something went wrong while reading files.');
        reject(err);
      };
      
      //Get first 40 potential matches
      if (search.length > 0) {
        let total = 0;
        resolve(
          files.filter(file => {
            if (file.toLowerCase().includes(search) && total < 40) {
              total = total + 1;
              return true;
            };
          })
        );
      };
      pages = Math.ceil(files.length / 20);
      if (page > pages || page < 1) {
        msg.channel.send(`Invalid page index. Must be between within 1 and ${pages}`);
        reject(`Invalid page index given by ${msg.author.username}.`)
      };
      
      //Retrieve sections of 20 scenarios (pages)
      resolve(files.splice((20*(page - 1)), 20));
    });
  })
  .then(files => {
    let count = 0;
    let scenarios = files.filter(file => {
      return (
        file.toLowerCase().endsWith('.sc6')
        || file.toLowerCase().endsWith('.sv6')
        || file.toLowerCase().endsWith('.sc4')
      );
    })
    .map(scenario => {
      count = count + 1;
      return `${count}.) ${scenario}`;
    })
    .join('\n');
    if (scenarios.length === 0) {
      msg.channel.send('No scenarios found!');
      return 'Successfully attempted to retrieve scenarios.';
    }
    else {
      if (option === '-d') {
        scenarios = `Discarded Scenarios:\n\n${scenarios}`;
      }
      else {
        scenarios = `Available Scenarios:\n\n${scenarios}`;
      };
      if (search.length > 0) {
        msg.channel.send(`${scenarios}\n\nNote: *40 search results maximum*`);
      }
      else {
        msg.channel.send(`${scenarios}\n\nPage: *${page}/${pages}*`);
      };
      return 'Successfully retrieved scenarios.';
    };
  });
};

/**
 * Moves scenarios between the scenario and discard directories
 * 
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
    startDir = config.scenarios;
    endDir = config.discard;
  }
  else if (action === 'restore') {
    startDir = config.discard;
    endDir = config.scenarios;
  }
  return new Promise((resolve, reject) => {
    if (search.length === 0) {
      msg.channel.send('No search string given.');
      reject(`No search string given by ${msg.author.username}.`)
    }
    readdir(startDir, (err, files) => {
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
      rename(
        `${startDir}/${scenarios[0]}`,
        `${endDir}/${scenarios[0]}`,
        err => {
          if (err) {
            msg.channel.send('Something went wrong with the file transfer.');
            throw err;
          };
        }
      );
      if (endDir === config.discard) {
        msg.channel.send(`Successfully moved ${scenarios[0]} into the discard pile.`);
      }
      else if (endDir === config.scenarios) {
        msg.channel.send(`Successfully moved ${scenarios[0]} into the scenario pile.`);
      };
      return `Successfully moved a scenario: \'${scenarios[0]}\'`;
    };
  })
};

module.exports = {
  loadPaths: loadScenarioDirectoryPaths,
  listScenarios,
  moveScenario,
};