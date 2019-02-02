/** Command module for scenarios for multiplayer
 * @module scenarios
 * @requires fs
 */
const { readdirSync, renameSync } = require('fs');
const { config } = require('../config');
const { getScenarios } = require('../functions/reader');

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
  let option = '';
  let search = '';
  let page = 1;
  let input = content;
  let scenarioDir = config.scenarios;

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
      search = input.slice(1, input.slice(1).indexOf('\'') + 1);
      input = input.slice(input.slice(1).indexOf(' ') + 1).trim();
    }
    else if (/^"[^"]+" /.test(input)) {
      search = input.slice(1, input.slice(1).input.indexOf('"') + 1);
      input = input.slice(input.slice(1).indexOf(' ') + 1).trim();
    }
    else if (input.includes('\'')) {
      search = input.slice(1, input.slice(1).indexOf('\'') + 1);
    }
    else if (input.includes('"')) {
      search = input.slice(1, input.slice(1).indexOf('"') + 1);
    };
    let scenarios = await getScenarios(scenarioDir);
    results = scenarios.filter(scenario => {
      return scenario.slice(0, scenario.length - 4).toLowerCase() === search.toLowerCase();
    });
    if (results.length === 0) {
      results = await getScenarios(scenarioDir, search);
    };
  }
  else if (input.includes(' ')) {
    search = input.slice(0, input.indexOf(' '));
    input = input.slice(input.substring(1).indexOf(' ') + 1).trim();
    results = await getScenarios(scenarioDir, search);
  }
  else if (/^[^1-9][^0-9]*/.test(input)) {
    search = input;
    input = '';
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
  const search = content.toLowerCase().split('_').join(' ');
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
  if (search.length === 0) {
    await msg.channel.send('No search string given.');
    return 'Attempted to move scenarios. No input was given.';
  };
  const scenarios = await getScenarios(startDir, search);
    
  if (scenarios.length > 1) {
    await msg.channel.send(`'${search}' returned multiple results:\n\n*${scenarios.join('*\n*')}*\n\nPlease enter a more exact name of the scenario.`);
    return 'Attempted to move scenarios. Input returned multiple results.';
  }
  else if (scenarios.length === 0) {
    await msg.channel.send(`No scenarios found with '${search}'.`);
    return 'Attempted to move scenarios. No scenarios found with given input.';
  }
  renameSync(
    `${startDir}/${scenarios[0]}`,
    `${endDir}/${scenarios[0]}`,
  );
  if (endDir === config.discard) {
    msg.channel.send(`Successfully moved ${scenarios[0]} into the discard pile.`);
  }
  else if (endDir === config.scenarios) {
    msg.channel.send(`Successfully moved ${scenarios[0]} into the scenario pile.`);
  };
  return `Successfully moved a scenario: \'${scenarios[0]}\'`;
};

module.exports = {
  showScenarios,
  moveScenario,
};