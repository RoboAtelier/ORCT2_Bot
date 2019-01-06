/** Communicates with the master server API
 * @module orct2master
 * @requires request-promise
 */
const rp = require('request-promise')

/**
 * Makes a JSON request to OpenRCT2 master server
 * to check server status.
 * @function
 * @param {string[]} inputs to check
 * @returns {Object.<string, Object[]>} public servers found and input
 */
function checkServerStatus (inputs) {

  //Header necessary to make JSON requests
  let options = {
    uri: 'https://servers.openrct2.io',
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true
  };
  return rp(options)
  .then(json => {
    if (inputs.length > 0) {
      let successes = [];
      const servers = json.servers.filter(server => {
        
        //Search by IPv4
        if (
          inputs.includes(server.ip.v4[0])
          || inputs.includes(`${server.ip.v4[0]}:${String(server.port)}`)
        ) {
          if (inputs.includes(server.ip.v4[0]) && !successes.includes(server.ip.v4[0])) {
            successes.push(server.ip.v4[0]);
          }
          else if (
            inputs.includes(`${server.ip.v4[0]}:${server.port}`)
            && !successes.includes(`${server.ip.v4[0]}:${server.port}`)
          ) {
            successes.push(`${server.ip.v4[0]}:${server.port}`);
          };
          return true;
        }
        else {
          
          //Search by (part of a) name
          return inputs.filter(input => {
            if (server.name.toLowerCase().includes(input)) {
              if (!successes.includes(input)) {
                successes.push(input);
              };
              return true;
            };
          })[0];
        };
      });
      return {
        servers,
        successes,
      };
    };
    
    //If no inputs are sent
    return {
      servers: [],
      successes: [],
    };
  });
};

module.exports = {
  checkServer: checkServerStatus
};