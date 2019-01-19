/** Manages hosted OpenRCT2 servers
 * @module orct2server
 * @requires fs, child_process
 */
const { readFileSync, readdirSync, statSync } = require('fs');
const { spawn, exec } = require('child_process');
const { config } = require('../config');

let servers = {};

/**
 * Runs a OpenRCT2 server with a given scenario.
 * 
 * @async
 * @function
 * @param {string} scenario - Scenario file to load
 * @param {number} server - Server number
 * @param {string} [path] - Path to server directory containing config.ini
 */
async function runOpenRCT2Server(scenario, server, path=config.openrct2) {
  let options = [
    'host',
    `${config.scenarios}/${scenario}`,
    '--port',
  ];
  const serverConfig = readFileSync(`${path}/config.ini`, 'utf8').split(/\r\n|\n/);
  const port = serverConfig.find(line => {
    return line.startsWith('default_port')
  });
  options.push(port);
  if (scenario.startsWith('AUTOSAVE')) {
    const check = readdirSync(`${path}/save`, 'utf8').find(file => {
      return file === 'autosave';
    });
    if (check === undefined) {
      return false;
    };
    let latest = '';
    let latestTime = new Date(0);
    const autosaves = readdirSync(`${path}/save/autosave`, 'utf8');
    if (autosaves.length === 0) {
      return false;
    };
    for (let i = 0; i < autosaves.length; i++) {
      const time = statSync(`${path}/save/autosave/${autosaves[i]}`).ctime;
      if (time > latestTime) {
        latest = autosaves[i];
        latestTime = time;
      };
    };
    options[1] = `${path}/save/autosave/${latest}`;
  };
  if (server > 1) {
    options.push('--user-data-path');
    options.push(path);
  };
  const childProcess = await spawn('openrct2', options);
  servers[server] = childProcess.pid;
  servers[`${server}map`] = scenario.slice(0, scenario.length - 4);
  console.log(`Server #${server} PID -> ${servers[server]}`);
  return true;
};

/**
 * Kills a running OpenRCT2 server.
 * 
 * @async
 * @function
 * @param {number} server number to kill
 */
async function killOpenRCT2Server(server) {
  await spawn('kill', ['-s', '1', servers[server]]);
};

module.exports = {
  runServer: runOpenRCT2Server,
  killServer: killOpenRCT2Server,
};