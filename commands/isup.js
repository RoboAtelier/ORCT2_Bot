/** Command module for checking OpenRCT2 server status
 * @module isup
 * @requires orct2master
 */
const orct2master = require('../functions/orct2master')

let gtwIPv4s = [];

/**
 * Load default GTW server IPs
 * @function
 * @param {string[]} GTW server ipv4s
 */
function loadGTWServerIPv4s(ipv4s) {
  gtwIPv4s = ipv4s;
};

/**
 * Create server status message based on search results
 * @function
 * @param {Object.<string, Object[]>} server search results
 * @param {string[]} inputs used to search
 * @returns {string} status message
 */
const makeStatusMsg = function createServerStatusMessage(results, inputs) {
  if (results.servers.length > 0) {
    let status = '';

    //Create body with successful servers found
    results.servers.forEach(server => {
      if (server.players === 1) {
        status = `${status}*${server.name}* is **UP**!\nServer version: **${server.version}**\nThere is 1 player on.\n\n`;
      }
      else {
        status = `${status}*${server.name}* is **UP**!\nServer version: **${server.version}**\nThere are ${server.players} players on.\n\n`;
      };
    });
    
    //Create remaining body with unsuccessful search input
    const fails = inputs.filter(input => results.successes.indexOf(input) === -1)
    fails.forEach(fail => {
      if (fails.includes(gtwIPv4s[0])) {
        status = `${status}*(GTW\'s Nostalgia Server)* is not available.\n`;
      }
      else if (fails.includes(gtwIPv4s[1])) {
        status = `${status}*(GTW\'s Nostalgia Server) #2* is not available.\n`;
      }
      else {
        status = `${status}Could not find servers with \'*${fail}*\'\n`;
      };
    });
    return status;
  };
  return('**No servers found with given input!**');
};

/**
 * Checks for the status of an OpenRCT2 server
 * (default GTW's servers)
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry 
 */
function isServerUpCommand(msg, content) {
  
  //Default input is GTW IPv4s
  let inputs = gtwIPv4s;
  
  //Search input is given
  if (content.length > 0) {
    if (!/[^,;]/.test(content)) {
      inputs = content.toLowerCase().split(/[,;]+/);
    }
    else {
      inputs = content.toLowerCase().split(' ');
    };
  };
  return orct2master.getServerStatus(inputs)
  .then(results => {
    return makeStatusMsg(results, inputs);
  })
  .then(status => {
    msg.channel.send(status);
    return('Successfully searched and posted server status.');
  });
};

module.exports = {
  isUpCmd: isServerUpCommand,
  loadGTWIPv4s: loadGTWServerIPv4s,
};