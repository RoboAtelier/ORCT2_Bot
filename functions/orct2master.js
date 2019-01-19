/** Communicates with the master server API
 * @module orct2master
 * @requires request-promise
 */
const rp = require('request-promise')

/**
 * Makes a JSON request to OpenRCT2 master server to check server status.
 * 
 * @function
 * @param {string[]} inputs to check
 * @returns {Object.<string, Object[]>} public servers found and input
 */
async function getServerStatus(inputs) {

  //Header necessary to make JSON requests
  let options = {
    uri: 'https://servers.openrct2.io',
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true
  };
  let json = await rp(options);
  if (inputs.length > 0) {
    let successes = [];
    const servers = json.servers.filter(server => {
      if (inputs.includes(server.ip.v4[0])) {
        successes.push(server.ip.v4[0]);
        return true;
      }
      else if (inputs.includes(`${server.ip.v4[0]}:${String(server.port)}`)) {
        successes.push(`${server.ip.v4[0]}:${server.port}`)
        return true;
      }
      else {
        let found = false;
        for (let i = 0; i < inputs.length; i++) {
          if (server.name.toLowerCase().includes(inputs[i])) {
            successes.push(inputs[i]);
            found = true;
            break;
          }
        }
        if (found === true) {
          return true;
        };
      };
    });
    return {
      servers,
      successes,
    };
  }
  else {
    return {
      servers: [],
      successes: [],
    };
  };
};

module.exports = {
  getServerStatus
};