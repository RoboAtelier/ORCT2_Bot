/** Contains methods that reads files and directories
 * @module reader
 * @requires fs
 */
const { readFileSync, readdirSync } = require('fs');
const { config } = require('../config');

/**
 * Gets the server directory of a server if it exists.
 * 
 * @async
 * @function getServerDirectory
 * @param {number} server - Server number
 * @returns {string} Path to server directory or a blank string.
 */
async function getServerDirectory(server) {
  const serverDir = readdirSync(config.openrct2).find(item => {
    return item.startsWith(`s${server}-`);
  });
  return serverDir === undefined ? '' : `${config.openrct2}/${serverDir}`;
};

/**
 * Gets scenarios in a directory.
 * 
 * @async
 * @function getScenarios
 * @param {string} [path] - Path to scenario directory
 * @param {string} [search] - Search string
 * @returns {string[]} Array of all or matched scenarios in a directory.
 */
async function getScenarios(path = config.scenarios, search = '') {
  let scenarios = readdirSync(path).filter(scenario => {
    return /\.s[vc][46]$/i.test(scenario);
  });
  if (search.length > 0) {
    scenarios = scenarios.filter(scenario => {
      return scenario.slice(0, scenario.length - 4).toLowerCase().includes(search.toLowerCase());
    });
  }
  return scenarios;
};

/**
 * Reads the bot data file.
 * 
 * @async
 * @function readBotData
 * @param {string} [field] - Field to match
 * @returns {string|string[]} Matched field value or all bot data in an array of lines.
 */
async function readBotData(field = '') {
  const data = readFileSync('./botdata', 'utf8').split(/\r\n|\n/);
  if (field.length > 0) {
    const result = data.find(line => {
      return line.slice(0, line.indexOf('=')) === field;
    });
    const value = result.slice(result.indexOf('=') + 1);
    return value;
  };
  return data;
};

/**
 * Reads the config.ini file in a OpenRCT2 server directory.
 * 
 * @async
 * @function readServerConfig
 * @param {string} [dir] - OpenRCT2 server directory
 * @param {string} [field] - Field to match
 * @returns {string|string[]} Matched field value or all configurations in an array of lines.
 */
async function readServerConfig(dir = config.openrct2, field = '') {
  const data = readFileSync(`${dir}/config.ini`, 'utf8').split(/\r\n|\n/);
  if (field.length > 0) {
    const result = data.find(line => {
      return line.slice(0, line.indexOf(' ')) === field;
    });
    const value = result.slice(result.indexOf('=') + 2);
    return value;
  };
  return data.filter(line => {
    return line !== '';
  });
};

module.exports = {
  getScenarios,
  getServerDir: getServerDirectory,
  readBotData,
  readServerConfig,
};