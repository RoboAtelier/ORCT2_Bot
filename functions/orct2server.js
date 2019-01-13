/** Manages hosted OpenRCT2 servers
 * @module orct2server
 * @requires fs, child_process
 */
const { readFileSync } = require('fs');
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
  try {
    let options = [
      'host',
      `/home/dev_user/Documents/botspace/ORCT2_Bot/scenarios/${scenario}`,
      '--port',
    ];
    const serverConfig = readFileSync(`${path}/config.ini`, 'utf8').split(/\r\n|\n/);
    const port = serverConfig.find(line => {
      return line.startsWith('default_port')
    });
    options.push(port);
    if (server > 1) {
      options.push('--user-data-path');
      options.push(path);
    };
    const childProcess = await spawn('openrct2', options);
    servers[server] = childProcess.pid;
    console.log(servers[server]);
  }
  catch(err) {
    throw err;
  }
};

/**
 * Kills a running OpenRCT2 server.
 * 
 * @async
 * @function
 * @param {number} server number to kill
 */
async function killOpenRCT2Server(server) {
  try {
    await spawn(`kill`, [servers[server]]);
  }
  catch(err) {
    throw err;
  };
};

module.exports = {
  runServer: runOpenRCT2Server,
  killServer: killOpenRCT2Server,
};