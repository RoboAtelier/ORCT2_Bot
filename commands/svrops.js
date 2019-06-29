/** Command module to perform server operations
 * @module svr_ops
 * @requires fs, reader, orct2server, orct2web
 */
const { readdirSync, readFileSync } = require('fs');
const { checkInstallation } = require('./install');
const { runServer, killServer } = require('../functions/orct2server');
const { getServerStatus } = require('../functions/orct2web');
const { getScenarios, getServerDir } = require('../functions/reader');
const { config } = require ('../config');

let lastChange = new Date(0);
let notified = false;
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
  
  //Prevent Server Launches during Installation
  if (checkInstallation()) {
    await msg.channel.send('Cannot run server at this time. Installing new OpenRCT2 build.');
    return 'Attempted to run a server. Build installation in progress.';
  };
  
  if (!(
    msg.member.roles.has(config.mod)
    || msg.member.roles.has(config.admin)
    || msg.member.roles.has(config.owner)
  )) {
    
    //Vote cooldown if not Moderator+ - 2 minutes
    const diff = (new Date() - lastChange)/60000;
    if (diff < 2) {
      const timeString = diff === 1 ? 'minute' : 'minutes';
      await msg.channel.send(`Scenario voting just finished recently. You must wait about ${2 - Math.floor(diff)} ${timeString} before starting a new vote.`);
      return 'Attempted to start a scenario vote. Scenario vote already finished recently.'
    };
  };
  
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
    input = input.slice(input.indexOf(' ') + 1).trim();
  }
  else if (/^[1-9][0-9]*$/.test(input)) {
    server = parseInt(input);
    input = '';
  };
  if (server > 1) {
    serverDir = await getServerDir(server);
    if (serverDir.length === 0) {
      await msg.channel.send(`Server #${server} folder doesn't exist.`);
      return 'Attempted to run a server. Selected server directory does not exist.';
    };
  };
  
  //Run Last Autosave
  if (option.includes('a')) {
    if (!(
      msg.member.roles.has(config.trusted)
      || msg.member.roles.has(config.mod)
      || msg.member.roles.has(config.admin)
      || msg.member.roles.has(config.owner)
    )) {
      const diff = (new Date() - lastChange)/60000;
      if (diff < 2 && !notified) {
        notified = true;
        const timeString = diff === 1 ? 'minute' : 'minutes';
        await msg.channel.send(`There was a restart attempt recently. You must wait about ${2 - Math.floor(diff)} ${timeString} before starting a new vote.`);
        return 'Attempted to restart the server. Server restart attempt already happened recently.'
      };
      const results = await getServerStatus([`${config.defaultip}:${config.defaultport}`]);
      if (results.servers.length === 1) {
        await msg.channel.send('The server is already active.');
        return 'Attempted to restart the server. Server restart attempt already happened recently.'
      }
    }
    await killServer(server);
    const scenario = option.includes('h')
    ? await runServer('AUTOSAVE', server, serverDir, true)
    : await runServer('AUTOSAVE', server, serverDir);
    if (scenario.length > 0) {
      await msg.channel.send(`Starting up last autosave on Server #${server}.`);
      await msg.guild.channels.get(config.alertchannel).send(`Now resuming last autosave on Server #${server}!`);
      lastChange = new Date();
      notified = false;
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
  if (option.includes('r')) {
    const scenarios = await getScenarios();
    results = scenarios.splice(Math.floor(Math.random()*scenarios.length), 1);
  }
  else {
    results = await getScenarios(config.scenarios, input);
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
    await msg.guild.channels.get(config.alertchannel).send(`Now running **${results[0].substring(0, results[0].length - 4)}** on Server #${server}!`);
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