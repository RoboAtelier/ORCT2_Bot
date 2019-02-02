/** Command module for checking OpenRCT2 build versions
 * @module checkbuild
 * @requires orct2web
 */
const { getBuildData } = require('../functions/orct2web');
const { config } = require('../config');

/**
 * Checks for the latest version of an OpenRCT2 application.
 * 
 * @async
 * @function checkBuildInformation
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {string} Log entry
 */
async function checkBuildInformation(msg, content) {
  let input = content;
  let uri = '';

  if (input.startsWith('-l') || input.startsWith('--link')) {
    input = input.slice(input.indexOf(' ') + 1).trim();
    if (input === 'dev') {
      msg.channel.send(config.devuri);
    }
    else if (input === 'lnc') {
      msg.channel.send(config.lncuri);
    };
    return 'Successfully posted build link.'
  }
  else {
    input = input.trim();
    let uri = '';
    if (input === 'dev') {
      uri = config.devuri;
    }
    else if (input === 'lnc') {
      uri = config.lncuri;
    };
    const details = await getBuildData(input, uri);
    await msg.channel.send(`${details}\n${uri}`);
    return 'Successfully searched and posted web page details and download link.';
  };
};

module.exports = {
  checkBuild: checkBuildInformation
};