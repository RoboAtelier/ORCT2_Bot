/** Command module to run new scenario for the server
 * @module run
 * @requires fs
 */
const { readdir } = require('fs');
const { config } = require ('../config');
const { run, kill } = require('../functions/orct2server');

let scenarioChange = {
  active: false,
  session: null,
};

/**
 * Run a new scenario for a server
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
    let input = content;
    if (content.length === 0) {
      msg.channel.send('Please give the scenario name that you wish to change to!');
      throw 'No input was given for \'run\' command when it was required.';
    }
    else {
      if (/^[1-2] /.test(content)) {
        server = parseInt(content.substring(0, 1));
        input = content.substring(2);
      };
    };
    const results = await new Promise((resolve, reject) => {
      readdir(config.scenarios, (err, files) => {
        if (err) {
          msg.channel.send('Something went wrong while reading files.');
          reject(err);
        };
        resolve(
          files.filter(file => {
            if (file.toLowerCase().includes(input.toLowerCase())) {
              return true;
            };
          })
        );
      });
    });
    if (results.length > 1) {
      msg.channel.send(`Search input returned multiple scenarios:\n\n${results.splice(0, 40).join('\n')}\n\nPlease enter a more exact name.`);
      return 'Successfully attempted to run a new scenario for server.'
    }
    else if (results.length === 0) {
      msg.channel.send(`No scenario found with the given input \'${input}\'`);
    }
    else {
      let port = config.server1port;
      if (server === 2) {
        port = config.server2port;
      };
      if (msg.member.roles.has(config.entrepreneur)) {
        scenarioChange.active = true;
        scenarioChange.session = setTimeout(async () => {
          scenarioChange.active = false;
          scenarioChange.session = null;
          await kill(1);
          await run(results[0], config.server1port);
          //msg.guild.channels.get(config.mainchannel).send('Starting **${results[0].substring(0, results[0].length - 4)}**!');
          msg.channel.send(`Changed scenario to: **${results[0].substring(0, results[0].length - 4)}**`);
        }, 10000);
        //await msg.guild.channels.get(config.mainchannel).send('Server map will change in 10 seconds.');
        msg.channel.send('Server map will change in 10 seconds.');
        return `Successfully entered intermission to change server scenario to \'${results[0].substring(0, results[0].length - 4)}\' on server #${server}`;
      }
      else if (msg.member.roles.has(config.gatekeeper)) {
        if (scenarioChange.active === true) {
          scenarioChange.active = false;
          scenarioChange.session = null;
        };
        await kill(1);
        await run(results[0], config.server1port);
        //await msg.guild.channels.get(config.mainchannel).send('Starting **${results[0].substring(0, results[0].length - 4)}**!');
        msg.channel.send(`Changed scenario to: **${results[0].substring(0, results[0].length - 4)}**`);
        return `Successfully changed server scenario to \'${results[0].substring(0, results[0].length - 4)}\' on server #${server}`;
      };
    };
  }
  catch(err){
    throw err;
  };
};

module.exports = {
  runScenario: runNewServerScenario
};