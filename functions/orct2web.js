/** Retrieves web page details related to OpenRCT2
 * @module orct2web
 * @requires request-promise
 * @requires cheerio
 */
const rp = require('request-promise');
const cheerio = require('cheerio');

/**
 * Gets web page information about OpenRCT2 applications.
 * @function
 * @param {string} page to get
 * @param {string} uri to page
 * @returns {string} details from the page retrieved
 */
function getOpenRCT2PageDetails(page, uri) {
  let details = '';
  let options = {
    uri,
    transform: function (body) {
      return cheerio.load(body, { decodeEntities: false });
    },
  };
  
  //Latest OpenRCT2 build details
  if (page === 'dev') {
    return rp(options)
      .then($ => {
        $('ul').first().children().each((i, ielem) => {
          if (i === 1) {
            details = `${details}Git Hash: **${$('a', ielem).text()}**\n`;
          }
          else if (i === 2) {
            details = `Was released **${$('span', ielem).first().text()} ago**\n${details}`;
            details = `Release Date: **${$('span', ielem).next().text()}**\n${details}`;
          };
        });
        details = `*${$('h1').first().text()}*\n\n${details}`;
        return details;
      });
  }
  
  //OpenRCT2 game launcher details
  else if (page === 'lnc') {
    return rp(options)
      .then($ => {
        details = `${details}*Latest OpenRCT2 launcher download*\n\n`
        const maindiv = $('.release-entry').first();
        const header = $('.release-header', maindiv).first();
        $('p', header).first().children().each((i, ielem) => {
          if (i === 1) {
            details = `${details}Creator: **${$(ielem).text()}**\n`;
          }
          else if (i === 2) {
            details = `${details}Release Date: **${$(ielem).text()}**\n`;
          }
          else if (i === 3) {
            details = `${details}Version: **${$('a', header).first().text()}**\n`;
            details = `${details}Git Hash: **${$('code', maindiv).first().text()}**\n`;
            details = `${details}${$(ielem).text().trim()} since last release\n`;
          };
        });
        return details;
      });
  };
};

/**
 * Gets the Github hash of the desired build.
 * @function
 * 
 * @param {string} build to get
 * @param {string} uri to page
 * @returns {string} build hash
 */
function getOpenRCT2BuildHash(build, uri) {
  let options = {
    uri,
    transform: function (body) {
      return cheerio.load(body, { decodeEntities: false });
    },
  };
  
  //Latest OpenRCT2 build hash
  if (build === 'dev') {
    return rp(options)
      .then(($) => {
        return $('ul').first().next().text();
      });
  }
  
  //OpenRCT2 game launcher hash
  else if (build === 'lnc') {
    return rp(options)
      .then(($) => {
        return $('code').first().text();
      });
  };
};

module.exports = {
  getPage: getOpenRCT2PageDetails,
  getHash: getOpenRCT2BuildHash,
};