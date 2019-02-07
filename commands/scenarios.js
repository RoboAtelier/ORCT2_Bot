/** Command module for scenarios for multiplayer
 * @module scenarios
 * @requires fs, reader
 */
const { renameSync } = require('fs');
const { getScenarios } = require('../functions/reader');
const { config } = require('../config');

/**
 * Shows multiplayer scenarios in a directory separated by groups of 20.
 * 
 * @async
 * @function showScenarios
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {string} Log entry.
 */
async function showScenarios(msg, content) {
  let input = content;
  let scenarioDir = config.scenarios;
  let option = '';
  let search = '';
  let page = 1;

  //Get option
  if (input.startsWith('-d') || input.startsWith('--discarded')) {
    if (input.includes(' ')) {
      option = input.slice(0, input.indexOf(' '));
      input = input.slice(input.indexOf(' ') + 1).trim();
    }
    else {
      option = input;
      input = '';
    };
    scenarioDir = config.discard;
  };

  //Find scenarios
  let results = [];
  if (/^'[^']+'|^"[^"]+"/.test(input)) {
    if (/^'[^']+' /.test(input)) {
      search = input.slice(0, input.slice(1).indexOf('\'') + 1);
      input = input.slice(input.slice(1).indexOf('\'') + 2).trim();
    }
    else if (/^"[^"]+" /.test(input)) {
      search = input.slice(0, input.slice(1).indexOf('"') + 1);
      input = input.slice(input.slice(1).indexOf('"') + 2).trim();
    }
    else {
      search = input;
    };
    results = await getScenarios(scenarioDir, search);
  }
  else if (/[0-9][1-9]*$/.test(input)) {
    search = input.slice(0, input.lastIndexOf(' '));
    input = input.slice(input.lastIndexOf(' ') + 1);
    results = await getScenarios(scenarioDir, search);
  }
  else if (/^[^1-9][^0-9]*$/.test(input)) {
    search = input;
    results = await getScenarios(scenarioDir, search);
  }
  else {
    results = await getScenarios(scenarioDir);
  };
  if (results.length === 0) {
    await msg.channel.send(`No scenarios found with '${search}'.`);
    return 'Attempted to retrieve scenarios. No scenarios found with given input.';
  };

  //Get scenario set page
  if (/^[1-9][0-9]*$/.test(input)) {
    page = parseInt(input);
  };
  const pages = Math.ceil(results.length/20);
  if (page > pages || pages < 1) {
    await msg.channel.send(pages === 1
    ? 'There is only one page.'
    : `Valid pages are between 1 and ${pages} for '${search}'.`);
    return 'Attempted to display scenarios. Invalid page entered.';
  };

  //Format message
  let count = 0;
  let scenarioString = results.splice((20*(page - 1)), 20)
  .map(scenario => {
    count = count + 1;
    return `${count}.) ${scenario}`;
  })
  .join('\n');
  scenarioString = option === '-d' || option === '--discarded'
  ? `Discarded Scenarios:\n\n${scenarioString}`
  : `Available Scenarios:\n\n${scenarioString}`;
  await msg.channel.send(`${scenarioString}\n\nPage: *${page}/${pages}*`);
  return 'Successfully retrieved scenarios.';
};

/**
 * Moves scenarios between the scenario and discard directories
 * 
 * @async
 * @function moveScenario
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @param {string} action - Action to perform
 * @returns {string} Log entry.
 */
async function moveScenario(msg, content, action) {
  let startDir = '';
  let endDir = '';
  if (action === 'discard') {
    startDir = config.scenarios;
    endDir = config.discard;
  }
  else if (action === 'restore') {
    startDir = config.discard;
    endDir = config.scenarios;
  };
  if (content.length === 0) {
    await msg.channel.send('No search string given.');
    return 'Attempted to move scenarios. No input was given.';
  };

  const results = await getScenarios(startDir, content);
  if (results.length > 1) {
    await msg.channel.send(`'${content}' returned multiple results:\n\n*${results.join('*\n*')}*\n\nPlease enter a more exact name of the scenario.`);
    return 'Attempted to move scenarios. Input returned multiple results.';
  }
  else if (results.length === 0) {
    await msg.channel.send(`No scenarios found with '${content}'.`);
    return 'Attempted to move scenarios. No scenarios found with given input.';
  }
  renameSync(
    `${startDir}/${results[0]}`,
    `${endDir}/${results[0]}`,
  );
  if (endDir === config.discard) {
    await msg.channel.send(`Successfully moved ${results[0]} into the discard pile.`);
  }
  else if (endDir === config.scenarios) {
    await msg.channel.send(`Successfully moved ${results[0]} into the scenario pile.`);
  };
  return `Successfully moved a scenario: \'${results[0]}\'`;
};

module.exports = {
  showScenarios,
  moveScenario,
};