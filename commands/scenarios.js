/** Command module for listing available scenarios for multiplayer
 * @module scenarios
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
    fs.readdir(startDir, (err, files) => {
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

module.exports = {
  loadPaths: loadScenarioDirectoryPaths,
  listScenarios
};