/** Command module to perform server operations
 * @module svrops
 * @requires fs
 */
const { readdirSync, readFileSync } = require('fs');
const { config } = require ('../config');
const { runServer, killServer } = require('../functions/orct2server');

let scenarioChange = {
  active: false,
  session: null,
};

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
    let server = 1;
    let serverDir = config.openrct2;
    let input = '';
    
    //Get specific server directory
    if (/^[1-9][0-9]* /.test(content)) {
      server = parseInt(content.slice(0, content.indexOf(' ')));
      input = content.slice(content.indexOf(' ') + 1).trim();
    }
    else if (/^[1-9][0-9]*$/.test(content)) {
      server = parseInt(content);
      input = '';
    };
    if (server > 1) {
      const results = readdirSync(serverDir).filter(item => {
        return item.startsWith(`s${server}-`);
      });
      if (results.length === 0) {
        await msg.channel.send(`Server #${server} folder doesn't exist. You can make one using the 'config' command.`);
        return 'Attempted to run a server. Selected server directory does not exist.'
      }
      else {
        serverDir = `${serverDir}/${results[0]}`;
      };
    };
    
    const scenarios = readdirSync(config.scenarios).filter(scenario => {
      return /\.s[vc][46]$/i.test(scenario);
    });
    if (input === '') {
      await msg.channel.send('You must specify a scenario to run.');
      return 'Attempted to run a new map. No input was given.';
    };
    const results = scenarios.filter(scenario => {
      return scenario.toLowerCase().includes(input.toLowerCase());
    });
    if (results.length > 1) {
      await msg.channel.send(`Search input returned multiple scenarios:\n\n${results.splice(0, 20).join('\n')}\n\nPlease enter a more exact name.`);
      return 'Attempted to run a new map. Search input returned multiple scenarios.';
    }
    else if (results.length === 0) {
      await msg.channel.send(`No scenario found with the given input \'${input}\'.`);
      return 'Attempted to run a new map. Search input did not return a scenario.';
    }
    else {
      if (msg.member.roles.has(config.entrepreneur)) {
        scenarioChange.active = true;
        scenarioChange.session = setTimeout(async () => {
          scenarioChange.active = false;
          scenarioChange.session = null;
          await killServer(1);
          await runServer(results[0], server, serverDir);
          //msg.guild.channels.get(config.mainchannel).send('Starting **${results[0].substring(0, results[0].length - 4)}** on server #${server}!');
          await msg.channel.send(`Now running **${results[0].substring(0, results[0].length - 4)}** on Server #${server}.`);
        }, 10000);
        //await msg.guild.channels.get(config.mainchannel).send('Server map will change in 10 seconds.');
        await msg.channel.send('Server map will change in 10 seconds.');
        return `Successfully entered intermission to change server scenario to \'${results[0].substring(0, results[0].length - 4)}\' on Server #${server}.`;
      }
      else if (
        msg.member.roles.has(config.gatekeeper)
        || msg.member.roles.has(config.operator)
      ) {
        if (scenarioChange.active === true) {
          scenarioChange.active = false;
          scenarioChange.session = null;
        };
        await killServer(1);
        await runServer(results[0], server, serverDir);
        //await msg.guild.channels.get(config.mainchannel).send('Starting **${results[0].substring(0, results[0].length - 4)}** on server #${server}!');
        await msg.channel.send(`Running **${results[0].substring(0, results[0].length - 4)}** on Server #${server}.`);
        return `Successfully loaded \'${results[0].substring(0, results[0].length - 4)}\' on Server #${server}.`;
      };
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