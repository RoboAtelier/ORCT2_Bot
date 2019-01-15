/** Command module to perform server operations
 * @module svrops
 * @requires fs
 */
const { readdirSync, readFileSync } = require('fs');
const { config } = require ('../config');
const { runServer, killServer } = require('../functions/orct2server');

/**
 * Run a new scenario for a server.
 * 
 * @async
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
async function runNewServerScenario(msg, content) {
  try {
    let option = '';
    let server = 1;
    let serverDir = config.openrct2;
    let input = content;
    
    //Get option
    if (input.startsWith('-a ') || input.startsWith('--autosave ')) {
      option = input.slice(0, input.indexOf(' '));
      input = input.slice(input.indexOf(' ') + 1).trim();
    }
    else if (input === '-a' || input === '--autosave') {
      option = input;
      input = '';
    };
    
    //Get specific server directory
    if (/^[1-9][0-9]* /.test(input)) {
      server = parseInt(input.slice(0, input.indexOf(' ')));
      input = input.slice(content.indexOf(' ') + 1).trim();
    }
    else if (/^[1-9][0-9]*$/.test(input)) {
      server = parseInt(input);
      input = '';
    };
    if (server > 1) {
      const dir = readdirSync(serverDir).filter(item => {
        return item.startsWith(`s${server}-`);
      });
      if (dir.length === 0) {
        await msg.channel.send(`Server #${server} folder doesn't exist. You can make one using the 'config' command.`);
        return 'Attempted to run a server. Selected server directory does not exist.'
      }
      else {
        serverDir = `${serverDir}/${dir[0]}`;
      };
    };
    
    //Run last autosave
    if (option === '-a' || option === '--autosave') {
      await killServer(server);
      const status = await runServer('AUTOSAVE', server, serverDir);
      if (status === true) {
        await msg.channel.send(`Starting up last autosave on Server #${server}.`);
        //await msg.guild.channels.get(config.mainchannel).send(`Now resuming latest map on Server #${server}!`);
        return `Successfully loaded last autosave on Server #${server}.`;
      }
      else {
        await msg.channel.send(`No autosaves found for Server #${server}.`);
        return 'Attempted to run an autosave. No autosaves were found.';
      };
    }
    
    //Scenario filtering
    const scenarios = readdirSync(config.scenarios).filter(scenario => {
      return /\.s[vc][46]$/i.test(scenario);
    });
    if (input === '') {
      await msg.channel.send('You must specify a scenario to run.');
      return 'Attempted to run a new map. No input was given.';
    };
    let pick = '';
    if (/^'[^']+'$|^"[^"]+"$/.test(input)) {
      let name = '';
      if (input.includes('\'')) {
        name = input.slice(1, input.slice(1).indexOf('\'') + 1);
      }
      else if (input.includes('"')) {
        name = input.slice(1, input.slice(1).indexOf('"') + 1);
      };
      pick = scenarios.filter(scenario => {
        return scenario.slice(0, scenario.length - 4).toLowerCase() === name.toLowerCase();
      });
    }
    else {
      const pick = scenarios.filter(scenario => {
        return scenario.toLowerCase().includes(input.toLowerCase());
      });
    };
    if (pick.length > 1) {
      await msg.channel.send(`Search input returned multiple scenarios:\n\n${pick.splice(0, 20).join('\n')}\n\nPlease enter a more exact name.`);
      return 'Attempted to run a new map. Search input returned multiple scenarios.';
    }
    else if (pick.length === 0) {
      await msg.channel.send(`No scenario found with the given input \'${input}\'.`);
      return 'Attempted to run a new map. Search input did not return a scenario.';
    }
    else {
        
      //Restart server with new map
      await killServer(server);
      await runServer(pick[0], server, serverDir);
      await msg.channel.send(`Starting up **${pick[0].substring(0, pick[0].length - 4)}** on Server #${server}.`);
      //await msg.guild.channels.get(config.mainchannel).send(`Now running **${pick[0].substring(0, pick[0].length - 4)}** on Server #${server}!`);
      return `Successfully loaded '${pick[0].substring(0, pick[0].length - 4)}' on Server #${server}.`;
    };
  }
  catch(err){
    throw err;
  };
};

/**
 * Signals a server to stop running.
 * 
 * @async
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
async function killRunningServer(msg, content) {
  try {
    let server = 1;
    if (content.length > 0) {
      if (/^[1-9][0-9]*$/.test(content)) {
        server = parseInt(content);
      }
      else {
        msg.channel.send('Invalid input. Must be a number.');
        return 'Attempted to kill a server. Invalid input was sent.'
      };
    };
    await killServer(server);
    msg.channel.send(`Successfully sent signal to stop Server #${server}`);
    return `Successfully signalled force kill on Server #${server}.`
  }
  catch(err){
    throw err;
  };
};

module.exports = {
  run: runNewServerScenario,
  kill: killRunningServer,
};