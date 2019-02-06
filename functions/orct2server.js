/** Manages hosted OpenRCT2 servers
 * @module orct2server
 * @requires fs, child_process, reader
 */
const { readFileSync, readdirSync, statSync } = require('fs');
const { spawn } = require('child_process');
const { getLatestAutosave, getServerDir } = require('./reader');
const { config } = require('../config');

let servers = {};
let serverMaps = {};

/**
 * Runs a OpenRCT2 server with a given scenario.
 * 
 * @async
 * @function runOpenRCT2Server
 * @param {string} scenario - Scenario file to load
 * @param {number} server - Server number
 * @param {string} [path] - Path to server directory containing config.ini
 * @param {boolean} [headless] - Specify if running headless server
 * @return {string} - Name of scenario hosted or an empty string.
 */
async function runOpenRCT2Server(scenario, server, path=config.openrct2, headless=false) {
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
    let dir = config.openrct2;
    if (server > 1) {
      dir = await getServerDir(server);
    };
    const autosave = await getLatestAutosave(dir);
    if (autosave.length > 0) {
      options[1] = `${path}/save/autosave/${autosave}`
    }
    else {
      return '';
    };
  };
  if (server > 1) {
    options.push('--user-data-path');
    options.push(path);
  };
  if (headless === true) {
    options.push('--headless');
  };
  const childProcess = await spawn(`${process.env.HOME
  || process.env.HOMEPATH
  || process.env.USERPROFILE}/OpenRCT2/openrct2`, options);
  servers[server] = childProcess.pid;
  if (!scenario.startsWith('AUTOSAVE')) {
    serverMaps[server] = scenario.slice(0, scenario.length - 4);
  };
  console.log(`Server #${server} PID -> ${servers[server]}`);
  return serverMaps[server] === undefined ? 'AUTOSAVE' : serverMaps[server];
};

/**
 * Kills a running OpenRCT2 server.
 * 
 * @async
 * @function killOpenRCT2Server
 * @param {number} server - Server number to kill
 */
async function killOpenRCT2Server(server) {
  await spawn('kill', ['-s', '1', servers[server]]);
  servers[server] = undefined;
};

async function getServerScenario(server) {
  return serverMaps[server];
};

module.exports = {
  getScenario: getServerScenario,
  killServer: killOpenRCT2Server,
  runServer: runOpenRCT2Server,
};