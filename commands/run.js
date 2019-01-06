const { readdir } = require('fs');
const { config } = require ('../config');
const { run, kill } = require('../functions/orct2server');

let scenarioChange = {
  active: false,
  session: null,
};

async function runNewServerScenario(msg, content) {
  try {
    if (content.length === 0) {
      msg.channel.send('Please give the scenario name that you wish to change to!');
      throw 'No input was given when it was required.';
    };
    const results = await new Promise((resolve, reject) => {
      readdir(config.scenarios, (err, files) => {
        if (err) {
          msg.channel.send('Something went wrong while reading files.');
          reject(err);
        };
        resolve(
          files.filter(file => {
            if (file.toLowerCase().includes(content.toLowerCase())) {
              return true;
            };
          })
        );
      });
    });
    if (results.length > 1) {
      msg.channel.send(`Search input returned multiple scenarios:\n\n${results.splice(0, 40).join('\n')}\n\nPlease enter a more exact name.`);
    }
    else if (results.length === 0) {
      msg.channel.send(`No scenario found with the given input \'${content}\'`);
    }
    else {
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