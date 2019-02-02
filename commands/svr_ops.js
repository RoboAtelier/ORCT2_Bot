/** Command module to perform server operations
 * @module svrops
 * @requires fs
 */
const { readdirSync, readFileSync } = require('fs');
const { config } = require ('../config');
const { runServer, killServer } = require('../functions/orct2server');
const { getScenarios, getServerDir } = require('../functions/reader');

/**
 * Run a new scenario for a server.
 * 
 * @async
 * @function
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {string} Log entry
 */
async function runNewServerScenario(msg, content) {
  let option = '';
  let search = '';
  let server = 1;
  let serverDir = config.openrct2;
  let input = content;
  
  //Get Option
  if (input.startsWith('-')) {
    if (input.includes(' ')) {
      option = input.slice(0, input.indexOf(' '));
      input = input.slice(input.indexOf(' ') + 1).trim();
    }
    else {
      option = input;
      input = '';
    };
  };

  //Get Server Directory
  if (/^[1-9][0-9]* /.test(input)) {
    server = parseInt(input.slice(0, input.indexOf(' ')));
    input = input.slice(content.indexOf(' ') + 1).trim();
  }
  else if (/^[1-9][0-9]*$/.test(input)) {
    server = parseInt(input);
    input = '';
  };
  if (server > 1) {
    serverDir = await getServerDir(server);
    if (serverDir.length === 0) {
      await msg.channel.send(`Server #${server} folder doesn't exist. You can make one using the 'config' command.`);
      return 'Attempted to run a server. Selected server directory does not exist.';
    };
  };
  
  //Run Last Autosave
  if (option.includes('a')) {
    await killServer(server);
    const scenario = option.includes('h')
    ? await runServer('AUTOSAVE', server, serverDir, true)
    : await runServer('AUTOSAVE', server, serverDir);
    if (scenario.length > 0) {
      await msg.channel.send(`Starting up last autosave on Server #${server}.`);
      await msg.guild.channels.get(config.mainchannel).send(`Now resuming last autosave on Server #${server}!`);
      return `Successfully loaded last autosave on Server #${server}.`;
    }
    else {
      await msg.channel.send(`No autosaves found for Server #${server}.`);
      return 'Attempted to run an autosave. No autosaves were found.';
    };
  }
  
  //Catch Missing Input
  else if (input === '' && !option.includes('r')) {
    await msg.channel.send('You must specify a scenario to run.');
    return 'Attempted to run a new map. No input was given.';
  };
  
  //Scenario Filtering
  let results = [];
  if (/^'[^']+'$|^"[^"]+"$/.test(input)) {
    let search = '';
    if (input.includes('\'')) {
      search = input.slice(1, input.slice(1).indexOf('\'') + 1);
    }
    else if (input.includes('"')) {
      search = input.slice(1, input.slice(1).indexOf('"') + 1);
    };
    const scenarios = await getScenarios();
    results = scenarios.filter(scenario => {
      return scenario.slice(0, scenario.length - 4).toLowerCase() === search.toLowerCase();
    });
  }
  else {
    if (option.includes('r')) {
      const scenarios = await getScenarios();
      results = scenarios.splice(Math.floor(Math.random()*scenarios.length), 1);
    }
    else {
      results = await getScenarios(config.scenarios, input);
    };
  };
  if (results.length > 1) {
    await msg.channel.send(`'${input}' returned multiple scenarios:\n\n${results.splice(0, 20).join('\n')}\n\nPlease enter a more exact name.`);
    return 'Attempted to run a new map. Search input returned multiple scenarios.';
  }
  else if (results.length === 0) {
    await msg.channel.send(`No scenario found with '${input}'.`);
    return 'Attempted to run a new map. Search input did not return a scenario.';
  }
  else {
      
    //Start Server with New Map
    await killServer(server);
    option.includes('h')
    ? await runServer(results[0], server, serverDir, true)
    : await runServer(results[0], server, serverDir);
    await msg.channel.send(`Starting up **${results[0].substring(0, results[0].length - 4)}** on Server #${server}.`);
    await msg.guild.channels.get(config.mainchannel).send(`Now running **${results[0].substring(0, results[0].length - 4)}** on Server #${server}!`);
    return `Successfully loaded '${results[0].substring(0, results[0].length - 4)}' on Server #${server}.`;
  };
};

/**
 * Signals a server to stop running.
 * 
 * @async
 * @function
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {string} Log entry
 */
async function stopRunningServer(msg, content) {
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
  return `Successfully signalled force kill on Server #${server}.`;
};

module.exports = {
  run: runNewServerScenario,
  stop: stopRunningServer,
};