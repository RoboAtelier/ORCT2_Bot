/** Contains methods that reads files and directories
 * @module reader
 * @requires fs
 */
const { readFileSync, readdirSync, statSync } = require('fs');
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
  const dir = readdirSync(config.openrct2).find(item => {
    return item.startsWith(`s${server}-`);
  });
  return dir === undefined ? '' : `${config.openrct2}/${dir}`;
};

/**
 * Gets the premade preview screenshot of a scenario if it exists.
 * 
 * @async
 * @function getScenarioPreviewScreenshot
 * @param {string} scenario - Scenario name
 * @returns {string} Preview .png name or a blank string.
 */
async function getScenarioPreviewScreenshot(scenario) {
  const preview = readdirSync(`${config.scenarios}/previews`).find(item => {
    return item.slice(0, item.length - 4).toLowerCase() === scenario.slice(0, scenario.length - 4).toLowerCase();
  });
  return preview === undefined ? '' : preview;
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
  if (/^'[^']+'$|^"[^"]+"$/.test(search)) {
    let exact = '';
    if (search.includes('\'')) {
      exact = search.slice(1, search.slice(1).indexOf('\'') + 1);
    }
    else if (search.includes('"')) {
      exact = search.slice(1, search.slice(1).indexOf('"') + 1);
    };
    scenarios = scenarios.filter(scenario => {
      return (scenario === exact || scenario.slice(0, scenario.length - 4) === exact);
    });
  }
  else if (search.length > 0) {
    scenarios = scenarios.filter(scenario => {
      return scenario.slice(0, scenario.length - 4).toLowerCase().includes(search.toLowerCase());
    });
  };
  return scenarios;
};

/**
 * Gets latest autosave in a server directory.
 * 
 * @function getLatestAutosave
 * @param {string} dir - Server directory to look in
 * @returns {string} Name of matched autosave if found.
 */
async function getLatestAutosave(dir) {
  let path = `${dir}/save`;
  const check = readdirSync(`${path}`, 'utf8').find(file => {
    return file === 'autosave';
  });
  if (check === undefined) {
    return '';
  };
  const autosaves = readdirSync(`${path}/autosave`, 'utf8');
  if (autosaves.length == 0) {
    return '';
  };
  let latest = '';
  let latestTime = new Date(0);
  for (let i = 0; i < autosaves.length; i++) {
    const time = statSync(`${path}/autosave/${autosaves[i]}`).ctime;
    if (time > latestTime) {
      latest = autosaves[i];
      latestTime = time;
    };
  };
  return latest;
};

/**
 * Gets number of autosaves in a server directory.
 * 
 * @function getAutosaveCount
 * @param {string} dir - Server directory to look in
 * @returns {number} Number of autosaves in the folder.
 */
async function getAutosaveCount(dir) {
  let path = `${dir}/save`;
  const check = readdirSync(`${path}`, 'utf8').find(file => {
    return file === 'autosave';
  });
  if (check === undefined) {
    return '';
  };
  const autosaves = readdirSync(`${path}/autosave`, 'utf8');
  return autosaves.count;
}

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
  getAutosaveCount,
  getLatestAutosave,
  getPreview: getScenarioPreviewScreenshot,
  getScenarios,
  getServerDir: getServerDirectory,
  readBotData,
  readServerConfig,
};