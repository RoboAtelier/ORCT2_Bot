/** Retrieves OpenRCT2-related data and files through the internet
 * @module orct2web
 * @requires request-promise, cheerio
 */
const rp = require('request-promise');
const cheerio = require('cheerio');

/**
 * Gets web page information about OpenRCT2 applications.
 * 
 * @async
 * @function getOpenRCT2BuildPageDetails
 * @param {string} page - Page to get
 * @param {string} uri - URI to page
 * @returns {string} Data from the page retrieved.
 */
async function getOpenRCT2BuildPageDetails(page, uri) {
  let details = '';
  
  //Transform Data for Cheerio
  let options = {
    uri,
    transform: function (body) {
      return cheerio.load(body, { decodeEntities: false });
    },
  };
  
  //Latest OpenRCT2 Build Details
  if (page === 'dev') {
    const $ = await rp(options);
    $('ul').first().children().each((i, el) => {
      if (i === 1) {
        details = `${details}Git Hash: **${$('a', el).text()}**\n`;
      }
      else if (i === 2) {
        details = `Was released **${$('span', el).first().text()} ago**\n${details}`;
        details = `Release Date: **${$('span', el).next().text()}**\n${details}`;
      };
    });
    details = `*${$('h1').first().text()}*\n\n${details}`;
  }
  
  //OpenRCT2 Game Launcher Details
  else if (page === 'lnc') {
    const $ = await rp(options);
    details = `${details}*Latest OpenRCT2 launcher download*\n\n`
    const maindiv = $('.release-entry').first();
    const header = $('.release-header', maindiv).first();
    $('p', header).first().children().each((i, el) => {
      if (i === 1) {
        details = `${details}Creator: **${$(el).text()}**\n`;
      }
      else if (i === 2) {
        details = `${details}Release Date: **${$(el).text()}**\n`;
      }
      else if (i === 3) {
        details = `${details}Version: **${$('a', header).first().text()}**\n`;
        details = `${details}Git Hash: **${$('code', maindiv).first().text()}**\n`;
        details = `${details}${$(el).text().trim()} since last release\n`;
      };
    });
  };
  return details;
};

/**
 * Gets the Github hash of the desired build.
 * 
 * @async
 * @function getOpenRCT2BuildHash
 * @param {string} build - Build to get
 * @param {string} uri - URI to page
 * @returns {string} Build hash
 */
async function getOpenRCT2BuildHash(build, uri) {
  
  //Transform Data for Cheerio
  const options = {
    uri,
    transform: function (body) {
      return cheerio.load(body, { decodeEntities: false });
    },
  };
  
  //Latest OpenRCT2 Build Hash
  if (build === 'dev') {
    const $ = await rp(options);
    return $('li').find('span').first().text();
  }
  
  //OpenRCT2 game Launcher Hash
  else if (build === 'lnc') {
    const $ = await rp(options);
    return $('code').first().text();
  };
};

async function getOpenRCT2DownloadFileLink(type, uri) {
  
  //Transform Data for Cheerio
  const options = {
    uri,
    transform: function (body) {
      return cheerio.load(body, { decodeEntities: false });
    },
  };
  
  const $ = await rp(options);
  return $('main').find('a', 'table').filter((i, el) => {
    return $(el).attr('href').includes(type);
  }).attr('href');
};

/**
 * Makes a JSON request to the OpenRCT2 master server to check server status.
 * 
 * @async
 * @function getServerStatus
 * @param {string[]} inputs - Array of inputs to to check
 * @returns {Object.<Object[], string[]>} Array of servers matched with given inputs.
 */
async function getServerStatus(inputs) {

  //Header for JSON Requests
  const options = {
    uri: 'https://servers.openrct2.io',
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true
  };

  //JSON Data of Servers
  const json = await rp(options);
  let servers = json.servers;
  
  //Find Matches
  let matches = [];
  if (inputs.length > 0) {
    servers = json.servers.filter(server => {
      
      //Filter by IPv4
      if (inputs.includes(server.ip.v4[0])) {
        if (!matches.includes(server.ip.v4[0])) {
          matches.push(server.ip.v4[0]);
        };
        return true;
      }
      else if (inputs.includes(`${server.ip.v4[0]}:${server.port}`)) {
        if (!matches.includes(`${server.ip.v4[0]}:${server.port}`)) {
          matches.push(`${server.ip.v4[0]}:${server.port}`);
        };
        return true;
      }
      else {
        
        //Filter by Name Substring
        let found = false;
        for (let i = 0; i < inputs.length; i++) {
          if (server.name.toLowerCase().includes(inputs[i])) {
            matches.push(inputs[i]);
            found = true;
            break;
          }
        };
        return found;
      };
    });
  };
  return {
    servers,
    matches,
  };
};

module.exports = {
  getBuildHash: getOpenRCT2BuildHash,
  getBuildData: getOpenRCT2BuildPageDetails,
  getDownloadLink: getOpenRCT2DownloadFileLink,
  getServerStatus,
};