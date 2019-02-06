/** Command module that monitors certains processes
 * @module ivchecker
 * @requires reader, writer, orct2web, orct2server
 */
const { getServerDir, readBotData, readServerConfig } = require('../functions/reader');
const { writeBotData } = require('../functions/writer');
const { getBuildHash, getBuildData, getServerStatus } = require('../functions/orct2web');
const { killServer, runServer } = require('../functions/orct2server');
const { config } = require('../config');

let devChecker = undefined;
let lncChecker = undefined;
let serverChecker = undefined;
let serverQueue = [];
let serverDownCount = {};

/**
 * Creates a checker that performs interval checks for specific conditions
 * and performs an action when a condition is met or changed.
 * 
 * @async
 * @function createNewIntervalChecker
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {string} Log entry
 */
async function createNewIntervalChecker(msg, content) {
  let input = content;
  let server = 1;
  let option = '';
  
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
  
  if (option.includes('s')) {
    return await stopIntervalChecker(msg, input, option);
  }
  else if (option.includes('d') || input.startsWith('dev')) {
    if (devChecker !== undefined) {
      clearInterval(devChecker);
    };
    devChecker = setInterval(async () => {
      const curHash = await getBuildHash('dev', config.devuri);
      const oldHash = await readBotData('devhash');
      if (curHash !== oldHash) {
        await writeBotData('devhash', curHash);
        const details = await getBuildData('dev', config.devuri);
        await msg.guild.channels.get(config.mainchannel).send(`*BREAKING NEWS*\nThere's a **NEW OPENRCT2 BUILD**!\n\n${details}\n${config.devuri}`);
      };
    }, 300000);
    await msg.channel.send('Running interval checker for develop builds.');
    return 'Successfully created new interval checker for develop builds.';
  }
  else if (
    option.includes('l')
    || input === 'lnc'
    || input.startsWith('lau')
  ) {
    if (lncChecker !== undefined) {
      clearInterval(lncChecker);
    };
    lncChecker = setInterval(async () => {
      const curHash = await getBuildHash('lnc', config.lncuri);
      const oldHash = await readBotData('lnchash');
      if (curHash !== oldHash) {
        await writeBotData('lnchash', curHash);
        const details = await getBuildData('lnc', config.lncuri);
        await msg.guild.channels.get(config.mainchannel).send(`*BREAKING NEWS*\nThere's a **NEW LAUNCHER BUILD**!\n\n${details}\n${config.lncuri}`);
      };
    }, 300000);
    await msg.channel.send('Running interval checker for launcher builds.');
    return 'Successfully created new interval checker for launcher builds.';
  }
  else {
    if (/^[1-9][0-9]*$/.test(input)) {
      server = parseInt(input);
    };
    if (server > 1) {
      const dirCheck = await getServerDir(server);
      if (dirCheck.length === 0) {
        await msg.channel.send(`Server #${server} folder doesn't exist. You can make one using the 'config' command.`);
        return 'Attempted to start interval checker. Selected server directory does not exist.';
      };
    };
    if (serverQueue.includes(server)) {
      clearInterval(serverChecker);
    };
    serverQueue.push(server);
    serverChecker = setInterval(async () => {
      let ips = [];
      let ipKeys = {};
      for (let i = 0; i < serverQueue.length; i++) {
        const serverDir = await getServerDir(server);
        const port = await readServerConfig(serverDir, 'default_port');
        const ip = `${config.defaultip}:${port}`;
        ipKeys[ip] = server;
        ips.push(ip);
      };
      const check = await getServerStatus(ips);
      if (check.matches.length !== ips.length) {
        for (let i = 0; i < ips.length; i++) {
          if (check.matches.includes(ips[i])) {
            serverDownCount[server] = 0;
          }
          else {
            serverDownCount[server] === undefined
            ? serverDownCount[server] = 1
            : serverDownCount[server] = serverDownCount[server] + 1;
            if (serverDownCount[server] < 3) {
              await killServer(server);
              await runServer('AUTOSAVE', server, serverDir);
              await msg.guild.channels.get(config.mainchannel).send(`Hmm... Server #${server} appears to be down, restarting!`);
            }
            else if (serverDownCount[server] === 3) {
              await msg.guild.channels.get(config.mainchannel).send(`Server #${server} is not working properly or the master server is down.`);
            };
          };
        };
      };
    }, 300000);
    await msg.channel.send(`Running interval checker for Server #${server}.`);
    return 'Successfully created new interval checker for a server.';
  };
};

/**
 * Stops an interval checker and removes it.
 * 
 * @async
 * @function stopIntervalChecker
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @param {string} [option] - Option that determines function behavior
 * @returns {string} Log entry
 */
async function stopIntervalChecker(msg, content, option='') {
  if (option.includes('d') || content.startsWith('dev')) {
    if (devChecker !== undefined) {
      clearInterval(devChecker);
      devChecker = undefined;
      await msg.channel.send('Stopped checking for develop builds.');
      return 'Successfully stopped interval checker for develop builds.';
    }
    else {
      await msg.channel.send('I am not currently checking for develop builds.');
      return 'Attempted to stop interval checker. Checker for devbuild not running.';
    };
  }
  else if (
    option.includes('l')
    || content === 'lnc'
    || content.startsWith('lau')
  ) {
    if (lncChecker !== undefined) {
      clearInterval(lncChecker);
      lncChecker = undefined;
      await msg.channel.send('Stopped checking for launcher builds.');
      return 'Successfully stopped interval checker for launcher builds.';
    }
    else {
      await msg.channel.send('There is no interval checker running for launcher builds.');
      return 'Attempted to stop interval checker. Checker for launcher not running.';
    };
  }
  else if (/^[1-9][0-9]*$/.test(content)) {
    server = parseInt(content);
    if (serverQueue.includes(server)) {
      serverQueue.splice(serverQueue.indexOf(server), 1);
      serverDownCount[server] = undefined;
      if (serverQueue.length === 0) {
        clearInterval(serverChecker);
        serverChecker = undefined;
      };
      await msg.channel.send(`Stopped checking for status of Server #${server}.`);
      return 'Successfully stopped interval checker for a server.';
    }
    else {
      await msg.channel.send(`I am not checking for Server #${server}.`);
      return 'Attempted to stop interval checker. Checker for a server not running.';
    };
  }
  else if (content === '') {
    await msg.channel.send('You must provide the type of checker to stop.');
    return 'Attempted to stop interval checker. No input was given.';
  }
  else {
    await msg.channel.send(`Invalid input: '${content}'`);
    return 'Attempted to stop interval checker. Invalid input received.';
  };
};

module.exports = {
  createChecker: createNewIntervalChecker,
  stopChecker: stopIntervalChecker,
};