const { config } = require('../config');

/**
 * Get permission level of the Discord guild member.
 * 
 * @function getPermissionLevel
 * @param {Member} member - Discord member object
 * @returns {number} Permission level of the guild member.
 */
function getPermissionLevel(member) {
  if (member.roles.has(config.owner) || member.roles.has(config.admin)) {
    return 3;
  }
  else if (member.roles.has(config.mod)) {
    return 2;
  }
  else if (member.roles.has(config.trusted)) {
    return 1;
  }
  return 0;
};

module.exports = {
  getPermLvl: getPermissionLevel
};