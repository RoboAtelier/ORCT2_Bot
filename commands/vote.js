/** Command module to host votes
 * @module vote
 * @requires fs
 */
const { readdir } = require('fs');
const { config } = require ('../config');
const { run, kill } = require('../functions/orct2server');

let scenarioVote = {
  active: false,
  scenarios: [],
  msg: null,
  session: null,
};
let generalVoteSessions = [];

async function cancelScenarioVote(msg) {
  try {
    if (scenarioVote.active === true) {
      clearTimeout(scenarioVote.session);
      scenarioVote.active = false;
      scenarioVote.scenarios = [];
      await scenarioVote.msg.channel.send('Scenario voting cancelled!');
      await scenarioVote.msg.delete();
      scenarioVote.msg = null;
      scenarioVote.session = null;
    }
  }
  catch(err) {
    throw err;
  }
};

/**
 * Starts a vote for changing the server scenario.
 * 
 * @async
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
async function startScenarioVote(msg, content) {
  try {
    const voteEmojis = [
      '\u0031\u20E3',
      '\u0032\u20E3',
      '\u0033\u20E3',
      '\u0034\u20E3',
      '\u0035\u20E3',
      '\u0036\u20E3',
      '\u0037\u20E3',
      '\u0038\u20E3',
      '\u0039\u20E3',
      '\u{1F51F}'
    ];
    let scenarios = [];
    let voteChoices = [];
    
    //Restart vote with different scenario choices
    if (scenarioVote.active === true) {
      scenarios = scenarioVote.scenarios;
      clearTimeout(scenarioVote.session);
      await scenarioVote.msg.delete();
    }
    
    //Start new scenario vote
    else {
      scenarios = await new Promise((resolve, reject) => {
        readdir(config.scenarios, (err, files) => {
          if (err) {
            msg.channel.send('Something went wrong while reading files.');
            reject(err);
          };
          resolve(files);
        });
      });
    };
    
    //Message formatting
    for (let i = 0; i < 10; i++) {
      voteChoices.push(
        scenarios.splice(Math.floor(Math.random()*scenarios.length), 1)[0]
      );
    };
    let choiceString = '';
    for (let i = 0; i < 10; i++) {
      choiceString = `${choiceString}${voteEmojis[i]} | ${voteChoices[i].substring(0, voteChoices[i].length - 4)}\n`
    };
    const voteMsg = await msg.channel.send(`Choose the next scenario:\n\n${choiceString}`);
    
    //Initiate voting
    scenarioVote.active = true;
    scenarioVote.scenarios = scenarios;
    scenarioVote.msg = voteMsg;
    let interrupt = false;
    for (let i = 0; i < 10; i++) {
      try {
        await voteMsg.react(voteEmojis[i]);
      }
      catch {
        interrupt = true;
        break;
      };
    };
    if (interrupt === false) {
      scenarioVote.session = setTimeout(async () => {
        
        const reactions = voteMsg.reactions;
        let top = [];
        let highest = 1;
        let scenario = '';
        reactions.forEach((reaction, key, map) => {
          if (voteEmojis.includes(reaction.emoji.name)) {
            if (reaction.count > highest) {
              top = [];
              highest = reaction.count;
            };
            if (highest > 1 && reaction.count === highest) {
              top.push(reaction);
            };
          };
        });
        if (top.length === 0) {
          msg.channel.send('Scenario change cancelled. No votes were submitted!');
        }
        else if (top.length > 1) {
          const reaction = top[Math.floor(Math.random()*top.length)];
          scenario = voteChoices[voteEmojis.indexOf(reaction.emoji.name)];
          await msg.channel.edit(`${voteMsg.content}\n\nThere was a tie! Randomly picked: **${scenario.substring(0, scenario.length - 4)}** (${highest} votes)\n\nMap change in 10 seconds.`);
        }
        else {
          scenario = voteChoices[voteEmojis.indexOf(top[0].emoji.name)];
          await msg.channel.send(`${voteMsg.content}\n\nSelected scenario: **${scenario.substring(0, scenario.length - 4)}** (${highest} votes)\n\nMap change in 10 seconds.`);
        };
        if (scenario.length > 0) {
          scenarioVote.session = setTimeout(async () => {
            scenarioVote.active = false;
            scenarioVote.scenarios = [];
            scenarioVote.session = null;
            await kill(1);
            await run(scenario, config.server1port);
          }, 10000);
        }
        else {
          scenarioVote.active = false;
          scenarioVote.scenarios = [];
          scenarioVote.session = null;
        };
      }, 3000);
      await voteMsg.edit(`${voteMsg.content}\n\n**Voting will end in 30 seconds! Please take this time to save as well.**`);
      return 'Successfully started new scenario vote.';
    };
  }
  catch(err) {
    scenarioVote.active = false;
    scenarioVote.scenarios = [];
    scenarioVote.msg = null;
    scenarioVote.session = null;
    throw err;
  };
};

async function startGenericVote(msg, content) {
  try {
    let params = content;
    let option = '';
    if (params.length > 0) {
      
      //Load option
      if (params.startsWith('-')) {
        let paramSlice = content.split(' ');
        let optionSlice = paramSlice.splice(0, 1);
        params = paramSlice.join(' ');
        option = optionSlice[0];
      };
    };
    let totalTime = 60000;
    if (/^[0-9]+[smh]$/.test(params[params.length - 1])) {
      const time = params.splice(params.length - 1, 1).toLowerCase();
      const timeLength = parseInt(time.substring(0, time.length - 1));
      const timeUnit = time.substring(timeLength);
      let multiplier = 1000;
      if (timeUnit === 'h') {
        multiplier = 3600000;
      }
      else if (timeUnit === 'm') {
        multiplier = 60000;
      };
      totalTime = multiplier*timeLength;
      if (totalTime > 86400000) {
        msg.channel.send('Voting time cannot exceed more than 24 hours.')
        throw 'Voting interval input too large.';
      }
      else if (totalTime < 15000) {
        msg.channel.send('Voting time must be at least 15 seconds.')
        throw 'Voting interval input too small.';
      };
    };
    if (option === '-c') {
      let inputs = [];
      if (!/[^,;]/.test(params)) {
        inputs = params.split(/[,;]+/);
      }
      else {
        inputs = params.split(' ');
      };
      const emojis = msg.guild.emojis;
      let voteEmojis = [];
      for (let i = 0; i < inputs.length(); i++) {
        voteEmojis.push(emojis.splice(Math.random(0, emojis.length - 1), 1));
      };
      
    }
  }
  catch(err) {
    return err;
  };
};

module.exports = {
  startScenarioVote,
  startVote: startGenericVote,
}