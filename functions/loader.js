/** @module loader */
const { createReadStream } = require('fs');
const { createInterface } = require('readline');

/**
 * Gets all configuration parameters for the bot.
 * @function
 * @returns {Object.<string, string>} config object with grouped settings
 */
async function getAllConfigurationParameters() {
  return await new Promise((resolve, reject) => {
    const config = {};
    const rl = createInterface({
      input: createReadStream('config')
    });
    rl.on('line', line => {
      if (line.includes('=')) {
        const lineparts = line.split('=', 2);
        config[lineparts[0]] = lineparts[1];
      };
    })
    rl.on('close', () => {
      resolve(config);
    });
  });
};

module.exports = {
  getAllConfig: getAllConfigurationParameters,
}