/** Command module to manage and see server configuration files
 * @module svrconfig
 * @requires fs
 */
const {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  copyFileSync
} = require('fs');
const { config } = require('../config');
const { getServerDir } = require('../functions/reader');

const configurations = [
  'autosave',
  'debugging_tools',
  'test_unfinished_tracks',
  'last_run_version',
  'player_name',
  'default_port',
  'default_password',
  'advertise',
  'maxplayers',
  'server_name',
  'server_description',
  'provider_name',
  'provider_email',
  'provider_website',
  'known_keys_only',
  'log_chat',
  'log_server_actions',
];
const permissions = [
  'PERMISSION_CHAT',
  'PERMISSION_TERRAFORM',
  'PERMISSION_SET_WATER_LEVEL',
  'PERMISSION_TOGGLE_PAUSE',
  'PERMISSION_CREATE_RIDE',
  'PERMISSION_REMOVE_RIDE',
  'PERMISSION_BUILD_RIDE',
  'PERMISSION_RIDE_PROPERTIES',
  'PERMISSION_SCENERY',
  'PERMISSION_PATH',
  'PERMISSION_CLEAR_LANDSCAPE',
  'PERMISSION_GUEST',
  'PERMISSION_STAFF',
  'PERMISSION_PARK_PROPERTIES',
  'PERMISSION_PARK_FUNDING',
  'PERMISSION_KICK_PLAYER',
  'PERMISSION_MODIFY_GROUPS',
  'PERMISSION_SET_PLAYER_GROUP',
  'PERMISSION_CHEAT',
  'PERMISSION_TOGGLE_SCENERY_CLUSTER',
  'PERMISSION_PASSWORDLESS_LOGIN',
  'PERMISSION_MODIFY_TILE',
  'PERMISSION_EDIT_SCENARIO_OPTIONS',
];

/**
 * Creates a new server directory for hosting additional OpenRCT2 servers.
 * 
 * @async
 * @function
 * @param {string} Server directory to make
 */
async function createNewServerDirectory(path) {
  mkdirSync(path);
  mkdirSync(`${path}/save`);
  copyFileSync(`${config.resources}/groups.json`, `${path}/groups.json`);
  copyFileSync(`${config.resources}/users.json`, `${path}/users.json`);
  copyFileSync(`${config.resources}/config.ini`, `${path}/config.ini`);
};

/**
 * getS that the new value is valid with the configuration setting.
 * 
 * @async
 * @function
 * @param {string} setting being edited
 * @param {string} the net value to set
 */
async function testConfigurationSettingInput(setting, value) {
  if (setting === 'autosave') {
    if (/^[0-5]$/.test(value)) {
      return true;
    };
    return false;
  }
  else if (
    [
      'test_unfinished_tracks',
      'advertise',
      'known_keys_only',
      'log_chat',
      'log_server_actions',
    ].includes(setting)
  ) {
    if (['t', 'f', 'true', 'false'].includes(value)) {
      return true;
    };
    return false;
  }
  else if (setting === 'default_port') {
    if (/^[1-9][0-9]{3,4}$/.test(value)
      && !/^10[0-2][0-4]$/.test(value)
      && !/^[4-9][8-9][0-9][0-9][1-9]$/.test(value)
    ) {
      return true;
    };
    return false;
  }
  else if (setting === 'maxplayers') {
    if (
      /^[1-9][0-9]{0,2}$/.test(value)
      && !/^[2-9][5-9][6-9]$/.test(value)
    ) {
      return true;
    };
    return false;
  };
  return true;
};

/**
 * Shows information inside the config.ini file of a OpenRCT2 server directory.
 * 
 * @async
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
async function showServerConfiguration(msg, content) {
  let server = 1;
  let serverDir = config.openrct2;
  
  //Get specific server directory
  if (/^[1-9][0-9]*$/.test(content)) {
    server = parseInt(content);
  };
  if (server > 1) {
    serverDir = await getServerDir(server);
    if (serverDir.length === 0) {
      serverDir = `${serverDir}/s${server}-Server${server}`;
      await createNewServerDirectory(serverDir);
    };
  };
  
  //Read config file and filter
  const rawLines = readFileSync(`${serverDir}/config.ini`, 'utf8').split(/\r\n|\n/);
  const lines = rawLines.filter(line => {
    return line !== '';
  });
  const serverConfigs = lines.filter(line => {
    return configurations.includes(line.substring(0, line.indexOf('=') - 1));
  });
  for (let i = 0; i < serverConfigs.length; i++) {
    const setting = serverConfigs[i]
    .substring(0, serverConfigs[i]
    .indexOf(' '))
    .split('_')
    .map(word => `${word.charAt(0).toUpperCase()}${word.substring(1)}`)
    .join(' ');
    serverConfigs[i] = `**${setting}**${serverConfigs[i].substring(serverConfigs[i].indexOf(' '))}`;
    if (serverConfigs[i].startsWith('**Autosave**')) {
      if (serverConfigs[i].includes('0')) {
        serverConfigs[i] = `${serverConfigs[i]} (every minute)`;
      }
      else if (serverConfigs[i].includes('1')) {
        serverConfigs[i] = `${serverConfigs[i]} (every 5 minutes)`;
      }
      else if (serverConfigs[i].includes('2')) {
        serverConfigs[i] = `${serverConfigs[i]} (every 15 minutes)`;
      }
      else if (serverConfigs[i].includes('3')) {
        serverConfigs[i] = `${serverConfigs[i]} (every half hour)`;
      }
      else if (serverConfigs[i].includes('4')) {
        serverConfigs[i] = `${serverConfigs[i]} (every hour)`;
      }
      else {
        serverConfigs[i] = `${serverConfigs[i]} (never)`;
      };
    };
  };
  await msg.channel.send(`Server #${server} config.ini:\n\n${serverConfigs.join('\n')}`);
  return 'Successfully displayed server configuration information.';
};

/**
 * Shows information inside the users.json file of a OpenRCT2 server directory.
 * 
 * @async
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
async function showUserFileInformation(msg, content) {
  let search = '';
  let server = 1;
  let page = 1;
  let serverDir = config.openrct2;
  let input = content;
  
  //Get specific server directory
  if (/^[1-9][0-9]* /.test(input)) {
    server = parseInt(input.slice(0, input.indexOf(' ')));
    input = input.slice(input.indexOf(' ') + 1).trim();
  }
  else if (/^[1-9][0-9]*$/.test(input)) {
    server = parseInt(input);
    input = '';
  };
  if (server > 1) {
    serverDir = await getServerDir(server);
    if (serverDir.length === 0) {
      serverDir = `${serverDir}/s${server}-Server${server}`;
      await createNewServerDirectory(serverDir);
    };
  };
  
  //Get users
  const users = JSON.parse(readFileSync(`${serverDir}/users.json`, 'utf8'));
  if (users.length === 0) {
    await msg.channel.send(`There are no registered users for Server #${server}!`);
    return 'Attempted to display registered users. No users found in a server.';
  };
  const groups = JSON.parse(readFileSync(`${serverDir}/groups.json`, 'utf8')).groups;
  let results = [];
  if (/^'[^']+'|^"[^"]+"/.test(input)) {
    if (/^'[^']+' /.test(input)) {
      search = input.slice(1, input.indexOf('\'') + 1);
      input = input.slice(input.substring(1).indexOf('\'') + 1).trim();
    }
    else if (/^"[^"]+" /.test(input)) {
      search = input.slice(1, input.indexOf('"') + 1);
      input = input.slice(input.substring(1).indexOf('"') + 1).trim();
    }
    else if (input.includes('\'')) {
      search = input.slice(1, input.substring(1).indexOf('\'') + 1);
    }
    else if (input.includes('"')) {
      search = input.slice(1, input.substring(1).indexOf('"') + 1);
    };
    results = users.filter(user => {
      return user.name.toLowerCase().includes(search.toLowerCase());
    });
  }
  else if (input.includes(' ')) {
    search = input.slice(0, input.indexOf(' '));
    input = input.slice(input.substring(1).indexOf(' ') + 1).trim();
    results = users.filter(user => {
      return user.name.toLowerCase().includes(search.toLowerCase());
    });
  }
  else if (/^[^1-9][^0-9]*/.test(input)) {
    search = input;
    input = '';
    results = users.filter(user => {
      return user.name.toLowerCase().includes(search.toLowerCase());
    });
  }
  else {
    results = users;
  };
  if (results.length === 0) {
    await msg.channel.send(`There are no users with '${search}' on Server #${server}!`);
    return 'Attempted to display registered users. No users found in a server.';
  };
  
  //Get user set by page
  if (/^[1-9][0-9]*$/.test(input)) {
    page = parseInt(input);
  };
  const pages = Math.ceil(results.length/20);
  if (page > pages || page < 1) {
    await msg.channel.send(pages === 1
    ? 'There is only one page.'
    : `Valid pages are between 1 and ${pages} for Server #${server}.`);
    return 'Attempted to display registered users. Invalid page entered.';
  };
  const userString = results.splice(20*(page - 1), 20)
  .map(user => {
    return `**${user.name}** (${groups[user.groupId].name})\n`;
  })
  .join('\n');
  await msg.channel.send(`Registered Users on Server #${server}:\n\n${userString}\n*Page ${page}/${pages}*`);
  return 'Successfully displayed registered users in a server.';
};

/**
 * Shows information inside the groups.json file of a OpenRCT2 server directory.
 * 
 * @async
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
async function showGroupFileInformation(msg, content) {
  let server = 1;
  let serverDir = config.openrct2;
  let input = content;
  
  //Get specific server directory
  if (/^[1-9][0-9]* /.test(input)) {
    server = parseInt(input.slice(0, input.indexOf(' ')));
    input = input.slice(input.indexOf(' ') + 1).trim();
  }
  else if (/^[1-9][0-9]*$/.test(input)) {
    server = parseInt(input);
    input = '';
  };
  if (server > 1) {
    serverDir = await getServerDir(server);
    if (serverDir.length === 0) {
      serverDir = `${serverDir}/s${server}-Server${server}`;
      await createNewServerDirectory(serverDir);
    };
  };
  
  //Process input
  const groupData = JSON.parse(readFileSync(`${serverDir}/groups.json`, 'utf8'));
  if (input === '') {
    const defaultGroup = groupData.groups.filter(group => {
      return group.id === groupData.default_group;
    })[0].name;
    let groupString = '';
    for (let i = 0; i < groupData.groups.length; i++) {
      groupString = `${groupString}**${groupData.groups[i].name}** (ID: ${groupData.groups[i].id})\n`;
    };
    await msg.channel.send(`Default Group:\n\n**${defaultGroup}**\n\nGroups on Server #${server}:\n\n${groupString}`);
    return 'Successfully displayed groups in a server.';
  }
  else {
    if (/^'[^']+'$|^"[^"]+"$/.test(input)) {
      input = input.substring(1, input.length - 1);
    };
    const group = groupData.groups.filter(group => {
      return group.name.toLowerCase().includes(input);
    });
    if (group.length === 0) {
      await msg.channel.send(`No groups found with '${input}'.`);
      return 'Attempted to display group info. No groups found with given input.';
    };
    let permString = '';
    for (let i = 0; i < group[0].permissions.length; i++) {
      permString = `${permString}*${group[0]
      .permissions[i]
      .substring(11)
      .split('_')
      .map(word => `${word.charAt(0)}${word.substring(1).toLowerCase()}`)
      .join(' ')}*\n`;
    };
    await msg.channel.send(`Permissions for **${group[0].name}** (ID: ${group[0].id}) on Server #${server}:\n\n${permString}`);
    return 'Successfully displayed registered groups in a server.';
  };
};

/**
 * Edits the config.ini file in the desired server directory.
 * 
 * @async
 * @function
 * @param {Message} Discord message object
 * @param {string} message contents
 * @returns {string} log entry
 */
async function editServerConfiguration(msg, content) {
  let server = 1;
  let serverDir = config.openrct2;
  let input = content;
  
  //Get specific server directory
  if (/^[1-9][0-9]* /.test(input)) {
    server = parseInt(input.slice(0, input.indexOf(' ')));
    input = input.slice(input.indexOf(' ') + 1).trim();
  }
  else if (/^[1-9][0-9]*$/.test(input)) {
    server = parseInt(input);
    input = '';
  };
  if (server > 1) {
    const results = readdirSync(serverDir).filter(item => {
      return item.startsWith(`s${server}-`);
    });
    if (results.length === 0) {
      serverDir = `${serverDir}/s${server}-Server${server}`;
      await createNewServerDirectory(serverDir);
    }
    else {
      serverDir = `${serverDir}/${results[0]}`;
    };
  };
  
  //Read config file
  const serverConfig = readFileSync(`${serverDir}/config.ini`, 'utf8').split(/\r\n|\n/);
  if (input === '') {
    await msg.channel.send('You must enter the configuration setting to edit.');
    return 'Attempted to edit server configuration. No input was given for searching.';
  }
  
  //Accept quote and space delimiters
  else if (/^'[^']+' |^"[^"]+" |^[^ ]+ /.test(input)) {
    let search = '';
    let value = '';
    if (input.includes('\'')) {
      search = input.slice(1, input.slice(1).indexOf('\'') + 1);
      value = input.slice(input.slice(1).indexOf('\'') + 2).trim();
    }
    else if (input.includes('"')) {
      search = input.slice(1, input.slice(1).indexOf('"') + 1);
      value = input.slice(input.slice(1).indexOf('"') + 2).trim();
    }
    else {
      search = input.slice(1, input.slice(1).indexOf(' ') + 1);
      value = input.slice(input.slice(1).indexOf(' ') + 2).trim();
    };
    search = search.split(' ').join('_').toLowerCase();
    let setting = configurations.find(configName => {
      return configName.includes(search);
    });
    console.log(search);
    if (await testConfigurationSettingInput(setting, value)) {
      
      //Finalization before writing
      for (let i = 0; i < serverConfig.length; i++) {
        if (serverConfig[i].startsWith(setting)) {
          if (
            [
              'autosave',
              'debugging_tools',
              'test_unfinished_tracks',
              'advertise',
              'known_keys_only',
              'log_chat',
              'log_server_actions',
              'default_port',
              'maxplayers',
            ].includes(setting)
          ) {
            if (value === 't') {
              value = 'true';
            }
            else if (value === 'f') {
              value = 'false';
            };
            serverConfig[i] = `${setting} = ${value}`;
          }
          else {
            serverConfig[i] = `${setting} = "${value}"`;
          };
          break;
        };
      };
      writeFileSync(`${serverDir}/config.ini`, serverConfig.join('\n'));
      await msg.channel.send(`Successfully set **${setting
      .split('_')
      .map(word => `${word.charAt(0).toUpperCase()}${word.substring(1)}`)
      .join(' ')}** to *${value}* for Server #${server}.`);
      return 'Successfully updated the server configuration file.';
    }
    else {
      if (setting === 'autosave') {
        await msg.channel.send('You must enter a value between 0-5.');
      }
      else if (
        [
          'debugging_tools',
          'test_unfinished tracks',
          'advertise',
          'known_keys_only',
          'log_chat',
          'log_server_actions',
        ].includes(setting)
      ) {
        await msg.channel.send('You must enter either \'true\' or \'false\'.');
      }
      else if (setting === 'default_port') {
        await msg.channel.send('You must enter a value between 1025-48000.');
      }
      else if (setting === 'maxplayers') {
        await msg.channel.send('You must enter a value between 1-255.');
      };
      return 'Attempted to edit server configuration. Invalid input was given.';
    };
  }
  else {
    await msg.channel.send('You must enter the new value to set.');
    return 'Attempted to edit server configuration. No value was given to set.';
  };
};

/*
async function editUserFileContents(msg, content) {
  
};

async function editGroupFileContents(msg, content) {
  try {
    let server = 1;
    let option = '';
    let serverDir = config.openrct2;
    let input = content;

    //Get parameters
    if (/^-[a-zA-Z] |^--[a-zA-Z]+ /.test(content)) {
      option = content.slice(0, content.indexOf(' '));
      input = content.slice(content.indexOf(' ') + 1);
    };
    if (/^[1-2] /.test(input)) {
      server = parseInt(input.slice(0, input.indexOf(' ')));
      input = input.slice(input.indexOf(' ') + 1);
    };
    if (server > 1) {
      const results = readdirSync(serverDir).filter(item => {
        return item.startsWith(`s${server}-`);
      });
      if (results.length === 0) {
        serverDir = `${serverDir}/s2-Server2`;
        await createNewServerDirectory(serverDir);
      }
      else {
        serverDir = `${serverDir}/${results[0]}`;
      };
    };
    let groupData = JSON.parse(readFileSync(`${serverDir}/groups.json`, 'utf8'));
    if (input.length === 0) {
      msg.channel.send('You must provide a name of a group to edit.');
      return 'Attempted to edit groups. No input was given for group searching.';
    };
    let name = '';
    if (/^'.+' /.test(input)) {
      name = input.slice(1, input.indexOf('\''));
      input = input.slice(input.substring(1).indexOf('\'') + 1);
    }
    else if (/^".+" /.test(input)) {
      name = input.slice(1, input.indexOf('"'));
      input = input.slice(input.substring(1).indexOf('"') + 1);
    }
    else {
      if (!input.includes(' ')) {
        let permString = '';
        for (let i = 0; i < permissions.length; i++) {
          permString = `${permString}*${permissions[i].substring(11).split('_').join(' ')}*\n`;
        };
        await msg.channel.send(`You must enter permissions to process.\n\nPermission list:\n${permString}`);
        return 'Attempted to edit groups. No input was given for permission setting.';
      };
      name = input.slice(0, input.indexOf(' '));
      input = input.slice(input.indexOf(' ') + 1);
    };
    const group = groupData.groups.filter(group => {
      return group.name.toLowerCase().includes(name.toLowerCase());
    });
    if (group.length === 0) {
      await msg.channel.send(`No groups found with the given input: \'${name}\'`);
      return 'Attempted to edit groups. No groups were found with given input.';
    };
    
    if (['', '--add', '-a', '--remove', '-r'].includes(option)) {
      let perms = [];
      if (/^[0-1]+$/.test(input)) {
        perms = permissions.filter((perm, i) => {
          if (i < input.length) {
            return input[i] === '1';
          };
        });
      }
      else {
        let inputSplit = [];
        if (input.includes(';')) {
          inputSplit = input.split(';');
        }
        else if (input.includes(',')) {
          inputSplit = input.split(',');
        }
        else {
          inputSplit = input.split(' ');
        };
        for (let i = 0; i < inputSplit.length; i++) {
          const perm = permissions.find(permission => {
            return permission.toLowerCase().includes(inputSplit[i].toLowerCase());
          });
          if (perm !== undefined && !perms.includes(perm)) {
            perms.push(perm);
          };
        };
      };
      
      //Edit user permissions
      if (option === '') {
        let permString = '';
        groupData.groups[group[0].id].permissions = perms;
        writeFileSync(`${serverDir}/groups.json`, JSON.stringify(groupData, null, '\t'));
        if (perms.length === 0) {
          permString = '*NO PERMISSIONS!*';
        }
        else {
          for (let i = 0; i < perms.length; i++) {
            permString = `${permString}*${perms[i].substring(11).split('_').join(' ')}*\n`;
          };
        };
        await msg.channel.send(`Permissions set for **${group[0].name}** on Server #${server}:\n\n${permString}`);
      }
      
      //Add/append permissions to a group
      else if (['--add', '-a'].includes(option)) {
        const addPerms = perms.filter(perm => {
          return !group[0].permissions.includes(perm);
        });
        
        if (addPerms.length === 0) {
          await msg.channel.send('*NO NEW PERMISSIONS ADDED!*');
        }
        else {
          groupData.groups[group[0].id].permissions = groupData.groups[group[0].id].permissions.concat(addPerms);
          writeFileSync(`${serverDir}/groups.json`, JSON.stringify(groupData, null, '\t'));
          let permString = '';
          for (let i = 0; i < addPerms.length; i++) {
            permString = `${permString}*${addPerms[i].substring(11).split('_').join(' ')}*\n`;
          };
          await msg.channel.send(`Permissions added for **${group[0].name}** on Server #${server}:\n\n${permString}`);
        };
      }
      
      //Remove permissions from a group
      else if (['--remove', '-r'].includes(option)) {
        const newPerms = group[0].permissions.filter(oldPerm => {
          return !perms.includes(oldPerm);
        });
        if (newPerms.length === group[0].permissions.length) {
          await msg.channel.send('*NO PERMISSIONS WERE DELETED!*');
        }
        else {
          groupData.groups[group[0].id].permissions = newPerms;
          writeFileSync(`${serverDir}/groups.json`, JSON.stringify(groupData, null, '\t'));
          const deletedPerms = group[0].permissions.filter(oldPerm => {
            return perms.includes(oldPerm);
          });
          let permString = '';
          for (let i = 0; i < newPerms.length; i++) {
            permString = `${permString}*${newPerms[i].substring(11).split('_').join(' ')}*\n`;
          };
          permString = `${permString}\nDeleted permissions:\n\n`;
          for (let i = 0; i < deletedPerms.length; i++) {
            permString = `${permString}*${deletedPerms[i].substring(11).split('_').join(' ')}*\n`;
          };
          await msg.channel.send(`Updated permissions for **${group[0].name}** on Server #${server}:\n\n${permString}`);
        };
      };
    }
    else if (['--name', '-n'].includes(option)) {
      const oldName = group[0].name;
      groupData.groups[group[0].id].name = input;
      writeFileSync(`${serverDir}/groups.json`, JSON.stringify(groupData, null, '\t'));
      await msg.channel.send(`Changed group name from **${oldName}** to **${input}** on Server #${server}`);
    };
  }
  catch(err) {
    throw err;
  };
};
*/

module.exports = {
  showConfig: showServerConfiguration,
  showUsers: showUserFileInformation,
  showGroups: showGroupFileInformation,
  editConfig: editServerConfiguration,
};