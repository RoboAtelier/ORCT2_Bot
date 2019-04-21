/** Command module for checking OpenRCT2 server status
 * @module isup
 * @requires orct2web
 */
const { getServerStatus } = require('../functions/orct2web');
const { config } = require('../config');

/**
 * Checks for the status of an OpenRCT2 server (default GTW's servers).
 * 
 * @async
 * @function
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {string} log entry
 */
async function checkServerIsOnline(msg, content) {
  let input = content;
  let scenarioDir = config.scenarios;
  
  //Defaults: GTW IPv4
  let inputs = [`${config.defaultip}:${config.defaultport}`];
  
  //Get Option
  if (input.startsWith('-a') || input.startsWith('--all')) {
    inputs = [];
    input = input.slice(input.indexOf(' ') + 1).trim();
  }
  
  //Split Search by , or ; Delimiters
  else if (input.length > 0) {
    inputs = /[,;]/.test(input)
    ? input.split(/ *[,;]+ */)
    : input.split(/ +/);
  };
  
  //Get Server Status
  const results = await getServerStatus(inputs);
  let status = '';
  if (results.servers.length > 0) {
    if (inputs.length > 0) {
      
      //Create Message Body with Servers Found
      for (let i = 0; i < results.servers.length; i++) {
        status = `${status}*${results.servers[i].name}* is **UP**!\nServer version: **${results.servers[i].version}**\n`
        status = results.servers[i].players === 1
        ? `${status}There is 1 player on.\n\n`
        : `${status}There are ${results.servers[i].players} players on.\n\n`;
      };
      
      const fails = inputs.filter(input => results.matches.indexOf(input) === -1);
      for (let i = 0; i < fails.length; i++) {
        if (
          inputs.length === 1
          && fails.includes(`${config.defaultip}:${config.defaultport}`)
        ) {
          status = `${status}*${config.servername}* is not available.\n`;
        }
        else {
          status = `${status}Could not find servers with '*${fails[i]}*'\n`;
        };
      };
    }
    
    //Create Message Body with All Online Servers
    else {
      const pages = Math.ceil(results.servers.length/20);
      const page = /^[1-9][0-9]*$/.test(input)
      ? parseInt(input)
      : 1;
      if (page > pages || pages < 1) {
        await msg.channel.send(pages === 1
        ? 'There is only one page.'
        : `Valid pages are between 1 and ${pages}`);
        return 'Attempted to display server status. Invalid page entered.';
      };
      results.servers = results.servers.splice((20*(page - 1)), 20);
      //Create Message Body with All Online Servers
      for (let i = 0; i < results.servers.length; i++) {
        status = `${status}${i + 1}.) (${results.servers[i].players}P) *${results.servers[i].name}*\n`
      };
      status = `${status}\nPage: *${page}/${pages}*`;
    };
    await msg.channel.send(status);
    return 'Successfully searched and posted server status.';
  }
  else {
    status = inputs.length === 1
    && inputs.includes(`${config.defaultip}:${config.defaultport}`)
    ? `*${config.servername}* is not available.\n`
    : `Could not find servers with '*${inputs.join(' ')}*'\n`;
    await msg.channel.send(status);
    return 'Attempted to display server status. No servers found with given input(s).';
  };
};

module.exports = {
  isUp: checkServerIsOnline
};