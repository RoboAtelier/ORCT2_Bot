/** Manages hosted OpenRCT2 servers
 * @module orct2server
 * @requires child_process
 */
const { spawn, exec } = require('child_process');

let servers = {
  s1: '',
  s2: '',
};

/**
 * Runs a OpenRCT2 server with a given scenario and port
 * 
 * @async
 * @function
 * @param {string} scenario file to load
 * @param {string} server port number
 */
async function runServer(scenario, port) {
  const childProcess = await spawn(
    'openrct2',
    [
      'host',
      `/home/dev_user/Documents/botspace/ORCT2_Bot/scenarios/${scenario}`,
      '--port',
      port,
    ]
  );
  if (port === '5968') {
    servers.s1 = childProcess.pid;
  }
  else if (port === '4802') {
    servers.s2 = childProcess.pid;
  };
};

/**
 * Kills a running OpenRCT2 server
 * 
 * @async
 * @function
 * @param {number} server number to kill
 */
async function killServer(number) {
  if (number === 1) {
    await spawn(`kill`, [servers.s1]);
    servers.s1 = '';
  }
  else if (number === 2) {
    await spawn(`kill`, [servers.s2]);
    servers.s2 = '';
  };
};

module.exports = {
  run: runServer,
  kill: killServer,
};