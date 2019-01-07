/** Command module to forcibly stop a server
 * @module kill
 * @requires fs
 */
const { config } = require ('../config');
const { kill } = require('../functions/orct2server');

/**
 * Signals a server to stop running
 * 
 * @async
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
async function killRunningServer(msg, content) {
  try {
    let server = 1;
    if (content.length > 0) {
      if (/^[1-2]$/.test(content)) {
        server = parseInt(content);
      }
      else {
        msg.channel.send('Invalid input. Must be either \'1\' or \'2\'.');
        throw 'Invalid input was received by \'kill\' command.'
      };
    };
    await kill(server);
    msg.channel.send(`Successfully sent signal to stop server #${server}`);
    return `Successfully signalled force kill on server #${server}.`
  }
  catch(err){
    throw err;
  };
};

module.exports = {
  killServer: killRunningServer,
};