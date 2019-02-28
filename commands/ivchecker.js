/** Command module that monitors certains processes
 * @module ivchecker
 * @requires install, orct2web, orct2server, reader, writer, config
 */
const { unlinkSync } = require('fs');
const { checkInstallation } = require('./install');
const { getBuildHash, getBuildData, getServerStatus } = require('../functions/orct2web');
const { killServer, runServer } = require('../functions/orct2server');
const {
  getAutosaveCount,
  getLatestAutosave,
  getServerDir,
  readBotData,
  readServerConfig
} = require('../functions/reader');
const { writeBotData } = require('../functions/writer');
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
 * @function createNewIntervalChecker
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {Promise<string>} Log entry
 */
async function createNewIntervalChecker(msg, content) {
  
  //Defaults and parameters
  let input = content;
  let option = '';
  let server = 1;
  let interval = 300000;
  
  //Get option
  if (input.startsWith('-')) {
    if (input.includes(' ')) {
      option = input.slice(0, input.indexOf(' '));
      input = input.slice(input.indexOf(' ') + 1).trim();
    }
    else {
      option = input;
      input = '';
    };
  }
  
  //Set interval
  else if (/ [1-9][0-9]*$/.test(input)) {
    interval = parseInt(input.slice(input.indexOf(' ') + 1)) * 60000;
    input = input.slice(0, input.lastIndexOf(' '));
  };
  
  //Stop interval checkers
  if (option.includes('s')) {
    return await stopIntervalChecker(msg, input, option);
  }
  
  //Start dev checker
  else if (option.includes('d') || input.startsWith('dev')) {
    if (devChecker !== undefined) {
      await msg.channel.send(`I'm already checking for develop builds.`);
      return 'Attempted to start interval checker. Already checking for develop builds.';
    };
    
    //Check and record new hashes
    devChecker = setInterval(async () => {
      let latestHash = '';
      try {
        latestHash = await getBuildHash('dev', config.devuri);
      }
      catch(err) {
        console.log('Unsuccessful web request.');
        return;
      };
      const curHash = await readBotData('curdevhash');
      if (latestHash !== curHash) {
        await writeBotData('lastdevhash', curHash);
        await writeBotData('curdevhash', latestHash);
        const details = await getBuildData('dev', config.devuri);
        await msg.guild.channels.get(config.alertchannel).send(`*BREAKING NEWS*\nThere's a **NEW OPENRCT2 BUILD**!\n\n${details}\n${config.devuri}`);
      };
    }, interval);
    interval === 60000
    ? await msg.channel.send('Checking for develop builds every minute.')
    : await msg.channel.send(`Checking for develop builds every ${interval/60000} minutes.`);
    return 'Successfully created new interval checker for develop builds.';
  }
  
  //Start launcher checker
  else if (
    option.includes('l')
    || input === 'lnc'
    || input.startsWith('lau')
  ) {
    if (lncChecker !== undefined) {
      await msg.channel.send(`I'm already checking for launcher builds.`);
      return 'Attempted to start interval checker. Already checking for launcher builds.';
    };
    
    //Check and record new hashes
    lncChecker = setInterval(async () => {
      let latestHash = '';
      try {
        latestHash = await getBuildHash('lnc', config.lncuri);
      }
      catch(err) {
        console.log('Unsuccessful web request.');
        return;
      };
      const curHash = await readBotData('curlnchash');
      if (latestHash !== curHash) {
        await writeBotData('lastlnchash', curHash);
        await writeBotData('curlnchash', latestHash);
        const details = await getBuildData('lnc', config.lncuri);
        await msg.guild.channels.get(config.alertchannel).send(`*BREAKING NEWS*\nThere's a **NEW LAUNCHER BUILD**!\n\n${details}\n${config.lncuri}`);
      };
    }, interval);
    interval === 60000
    ? await msg.channel.send('Checking for launcher builds every minute.')
    : await msg.channel.send(`Checking for launcher builds every ${interval/60000} minutes.`);
    return 'Successfully created new interval checker for launcher builds.';
  }
  
  //Start server checker
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
      await msg.channel.send(`I'm already checking for Server #${server}.`);
      return 'Attempted to start interval checker. Already checking for a particular server.';
    };
    
    //Push server into check queue
    serverQueue.push(server);
    if (serverChecker === undefined) {
      
      //Check and restart servers if down
      serverChecker = setInterval(async () => {
        
        //Prevent Server Launch during Installation
        if (checkInstallation()) {
          return;
        };
        let ips = [];
        let ipKeys = {};
        let serverDir = '';
        for (let i = 0; i < serverQueue.length; i++) {
          serverDir = serverQueue[i] === 1
          ? config.openrct2
          : await getServerDir(serverQueue[i]);
          const port = await readServerConfig(serverDir, 'default_port');
          const ip = `${config.defaultip}:${port}`;
          ipKeys[ip] = serverQueue[i];
          ips.push(ip);
        };
        let check = [];
        try {
          check = await getServerStatus(ips);
        }
        catch(err) {
          console.log('Unsuccessful master server request.');
          return;
        };
        
        //Any downed servers are restarted
        if (check.matches.length !== ips.length) {
          for (let i = 0; i < ips.length; i++) {
            if (check.matches.includes(ips[i])) {
              serverDownCount[serverQueue[i]] = 0;
            }
            else {
              serverDownCount[serverQueue[i]] === undefined
              ? serverDownCount[serverQueue[i]] = 1
              : serverDownCount[serverQueue[i]] = serverDownCount[serverQueue[i]] + 1;
              if (serverDownCount[serverQueue[i]] < 3) {
                await killServer(serverQueue[i]);
                await runServer('AUTOSAVE', serverQueue[i], serverDir);
                await msg.guild.channels.get(config.alertchannel).send(`Hmm... Server #${serverQueue[i]} appears to be down, restarting!`);
              }
              else if (serverDownCount[serverQueue[i]] >= 3) {
                const autoCount = await getAutosaveCount(serverDir);
                if (autoCount > 1) {
                  const autosave = await getLatestAutosave(serverDir);
                  renameSync(
                    `${serverDir}/save/autosave/${autosave}`,
                    `${serverDir}/save/autosave/dsc_${autosave}`
                  );
                }
                await killServer(serverQueue[i]);
                await runServer('AUTOSAVE', serverQueue[i], serverDir);
                if (serverDownCount[serverQueue[i]] == 3) {
                  await msg.guild.channels.get(config.alertchannel).send(`Server #${serverQueue[i]} is not working properly, changing autosaves.`); 
                }
              };
            };
          };
        }
        else {
          for (let i = 0; i < ips.length; i++) {
            serverDownCount[serverQueue[i]] = 0;
          }
        }
      }, interval);
    };
    await msg.channel.send(`I'm now monitoring the status of Server #${server}.`);
    return 'Successfully created new interval checker for a server.';
  };
};

/**
 * Stops an interval checker and removes it.
 * 
 * @function stopIntervalChecker
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @param {string} [option] - Option that determines function behavior
 * @returns {Promise<string>} Log entry
 */
async function stopIntervalChecker(msg, content, option='') {
  
  //Dev checker
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
  
  //Launcher checker
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
  
  //Server checker
  else if (/^[1-9][0-9]*$/.test(content)) {
    server = parseInt(content);
    
    //Clear checker when queue is empty
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