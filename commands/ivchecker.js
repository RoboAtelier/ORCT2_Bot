/** Runs and monitors interval checking processes
 * @module ivchecker
 */
const { getServerDir, readBotData, readServerConfig } = require('../functions/reader');
const { writeBotData } = require('../functions/writer');
const { getBuildHash, getBuildData, getServerStatus } = require('../functions/orct2web');
const { checkHeadless, killServer, runServer } = require('../functions/orct2server');
const { config } = require('../config');

let devChecker = undefined;
let lncChecker = undefined;
let serverCheckers = {};
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
  let server = 1;
  let option = '';
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
  
  if (option.includes('s')) {
    return await stopIntervalChecker(msg, input, option);
  }
  else if (option.includes('d') || input.startsWith('dev')) {
    if (devChecker !== undefined) {
      await msg.channel.send(`I am already checking develop builds.`);
      return 'Attempted to start interval checker. Checker already running for develop builds.';
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
      await msg.channel.send(`I am already checking launcher builds.`);
      return 'Attempted to start interval checker. Checker already running for launcher builds.';
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
    let serverDir = config.openrct2;
    if (/^[1-9][0-9]*$/.test(input)) {
      server = parseInt(input);
    };
    if (server > 1) {
      serverDir = await getServerDir(server);
      if (serverDir.length === 0) {
        serverDir = `${serverDir}/s${server}-Server${server}`;
      };
    };
    if (serverCheckers[server] !== undefined) {
      await msg.channel.send(`I am already checking for Server #${server}.`);
      return 'Attempted to start interval checker. Checker already running for server.';
    };
    const port = await readServerConfig(serverDir, 'default_port');
    const ip = `${config.defaultip}:${port}`;
    const serverChecker = setInterval(async () => {
      const check = await getServerStatus([ip]);
      if (check.servers.length === 0) {
        serverDownCount[server] === undefined
        ? serverDownCount[server] = 1
        : serverDownCount[server] = serverDownCount[server] + 1;
        if (serverDownCount[server] < 3) {
          await msg.guild.channels.get(config.mainchannel).send(`Hmm... Server #${server} appears to be down, restarting!`);
          await killServer(server);
          await checkHeadless(server)
          ? await runServer('AUTOSAVE', server, serverDir, true)
          : await runServer('AUTOSAVE', server, serverDir);
        }
        else if (serverDownCount[server] === 3) {
          await msg.guild.channels.get(config.mainchannel).send(`Server #${server} is not working properly or the master server is down.`);
        };
      }
      else {
        serverDownCount[server] = 0;
      };
    }, 90000);
    serverCheckers[server] = serverChecker;
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
    if (serverCheckers[server] !== undefined) {
      clearInterval(serverCheckers[server]);
      serverCheckers[server] = undefined;
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