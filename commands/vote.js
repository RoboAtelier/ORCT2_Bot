/** Command module to host votes
 * @module vote
 * @requires fs
 */
const { readdirSync } = require('fs');
const { config } = require ('../config');
const { runServer, killServer } = require('../functions/orct2server');

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
  '\u{1F51F}',
  '\u274C',
];

let scenarioVote = {
  active: false,
  scenarios: [],
  msg: null,
  session: null,
};
let generalVoteSessions = [];
let lastChange = new Date(0);

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
      return 'Successfully ended a scenario vote.';
    }
    else {
      await msg.channel.send('A scenario voting session isn\'t active right now.');
      return 'Attempted to cancel scenario vote. A vote is not currently running.';
    }
  }
  catch(err) {
    throw err;
  };
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
    
    //Vote cooldown - 5 minutes
    const diff = (new Date() - lastChange)/60000;
    if (diff < 5) {
      let timeString = '';
      if (diff >= 4) {
        timeString = 'minute';
      }
      else {
        timeString = 'minutes';
      };
      await msg.channel.send(`Scenario voting already happened recently. You must wait about ${5 - Math.floor(diff)} ${timeString} before starting a new vote.`);
      return 'Attempted to start a scenario vote. Scenario vote already finished recently.'
    };

    let page = 0;
    let index = 1;
    let input = content;
    let scenarios = [];
    let voteChoices = [];
    
    //Restart vote with different scenario choices
    if (scenarioVote.active === true) {
      input = '';
      scenarios = scenarioVote.scenarios;
      clearTimeout(scenarioVote.session);
      await scenarioVote.msg.delete();
    };
    
    //Start new scenario vote
    if (scenarios.length < 10) {
      scenarios = readdirSync(config.scenarios).filter(scenario => {
        return /\.s[vc][46]$/i.test(scenario);
      });
    };
    
    //Pick list of scenarios
    if (input === '') {
      for (let i = 0; i < 10; i++) {
        voteChoices.push(
          scenarios.splice(Math.floor(Math.random()*scenarios.length), 1)[0]
        );
      };
    }
    else {
      if (/^[1-9][0-9]* +([1]?[0-9]|20)$/.test(input)) {
        page = parseInt(input.slice(0, input.indexOf(' ')));
        index = parseInt(input.slice(input.indexOf(' ') + 1).trim());
      }
      else if (/^[1-9][0-9]*$/.test(input)) {
        page = parseInt(input);
      }
      else {
        await msg.channel.send('You can only input up to two numbers.');
        return 'Attempted to start scenario vote. Invalid input was given.';
      };
      if (page > Math.ceil(scenarios.length/20) || page < 1) {
        if (scenarios.length < 20) {
          await msg.channel.send('There is only a single page of scenarios.');
        }
        else {
          await msg.channel.send(`You can only choose a page between 1-${Math.ceil(scenarios.length/20)}`);
        };
        return 'Attempted to start scenario vote. Invalid page was given.';
      }
      else if (index > 20 || index < 1) {
        await msg.channel.send('You can only select an index between 1-20.');
        return 'Attempted to start scenario vote. Invalid index was given.';
      };
      let left = scenarios.length - (20*(page - 1) + (index - 1));
      if (left < 10) {
        if (left < 0) {
          left = scenarios.length - 20*(page - 1);
        };
        const fill = 10 - left;
        voteChoices = scenarios.splice((page - 1)*20 + (index - 1), left);
        voteChoices = voteChoices.concat(scenarios.splice(0, fill));
      }
      else {
        voteChoices = scenarios.splice((page - 1)*20 + (index - 1), 10);
      };
      page = 0;
    };

    //Format new message
    let choiceString = '';
    for (let i = 0; i < 10; i++) {
      choiceString = `${choiceString}${voteEmojis[i]} | ${voteChoices[i].substring(0, voteChoices[i].length - 4)}\n`
    };
    const voteMsg = await msg.guild.channels.get(config.mainchannel).send(`Choose the next scenario:\n\n${choiceString}${voteEmojis[10]} | New selection of maps`);
    await msg.channel.send(`Started vote at #main-lobby.`);
    
    //Initiate voting
    scenarioVote.active = true;
    scenarioVote.scenarios = scenarios;
    scenarioVote.msg = voteMsg;
    let interrupt = false;
    for (let i = 0; i < 11; i++) {
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
          await voteMsg.delete();
          await msg.channel.send('Scenario change cancelled. No votes were submitted!');
          return false;
        }
        else if (top[0].emoji.name === voteEmojis[10]) {
          startScenarioVote(msg, content);
          return false;
        }
        else if (top.length > 1) {
          top = top.filter(reaction => {
            return (reaction.emoji.name !== voteEmojis[10]);
          });
          const reaction = top[Math.floor(Math.random()*top.length)];
          scenario = voteChoices[voteEmojis.indexOf(reaction.emoji.name)];
          await voteMsg.edit(`${voteMsg.content}\n\nThere was a tie! Randomly picked: **${scenario.substring(0, scenario.length - 4)}** (${highest} votes)\n\nMap change in 10 seconds.`);
        }
        else {
          scenario = voteChoices[voteEmojis.indexOf(top[0].emoji.name)];
          await voteMsg.edit(`${voteMsg.content}\n\nSelected scenario: **${scenario.substring(0, scenario.length - 4)}** (${highest} votes)\n\nMap change in 10 seconds.`);
        };
        if (scenario.length > 0) {
          scenarioVote.session = setTimeout(async () => {
            lastChange = new Date();
            scenarioVote.active = false;
            scenarioVote.scenarios = [];
            scenarioVote.session = null;
            await killServer(1);
            await runServer(scenario, 1);
          }, 10000);
        }
        else {
          scenarioVote.active = false;
          scenarioVote.scenarios = [];
          scenarioVote.session = null;
        };
      }, 30000);
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

/*
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
};*/

module.exports = {
  startScenarioVote,
  cancelScenarioVote,
}