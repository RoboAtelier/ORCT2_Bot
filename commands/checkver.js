/** Command module for checking OpenRCT2 build versions
 * @module checkver
 * @requires orct2web
 */
const orct2web = require('../functions/orct2web')

/**
 * Checks for the latest version of an OpenRCT2 application.
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @param {string} type of application
 * @param {string} link to application page
 * @returns {string} log entry 
 */
function checkVersionCommand(msg, content, type, uri) {
  if (content.startsWith('-l')) {
    return new Promise((resolve, reject) => {
      msg.channel.send(uri);
      resolve('Successfully posted download link.');
    });
  };
  return orct2web.getPage(type, uri)
  .then(details => {
    msg.channel.send(`${details}\n${uri}`);
    return('Successfully searched and posted web page details and download link.');
  });
};

module.exports = {
  checkVerCmd: checkVersionCommand
};