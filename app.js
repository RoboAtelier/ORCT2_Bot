const Discord = require('discord.js');
const fs = require('fs');
const { logger, reader } = require('./functions');
const cmds = require('./commands');
const { config } = require('./config');

const bot = new Discord.Client();

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

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', async msg => {
  try {
    const prefix = await reader.readBotData('prefix');
    let cmd = '';
    let content = '';
    if (
      msg.author.id !== bot.user.id
      && msg.content.startsWith(prefix)
    ) {
      cmd = msg.content.replace(prefix, '').split(' ', 1)[0];
      content = msg.content.replace(`${prefix}${cmd}`, '').trim();
      const usrLog = `${msg.author.username} called '${cmd}' on #${msg.channel.name} (${msg.channel.id}).`;
      const usrPath = `${config.userlogs}/${msg.author.id}-${msg.author.username.split('/').join('_')}`;
      await logger.writeLog(usrLog, usrPath);
      let cmdLog = '';
      permLvl = getPermissionLevel(msg.member);
      try {
        
        //Admin Level Commands
        if (permLvl > 2) {
          
          //Show Server Configuration
          if (['config', 'conf'].includes(cmd)) {
            cmd = 'svr_config';
            cmdLog = await cmds.svr_config.showConfig(msg, content);
          }
          
          //Edit Server Configuration
          else if (['editconfig', 'editconf', 'chconf'].includes(cmd)) {
            cmd = 'svr_config';
            cmdLog = await cmds.svr_config.editConfig(msg, content);
          }
          
          else if (['preview', 'pvw'].includes(cmd)) {
            cmd = 'screenshot';
            cmdLog = await cmds.screenshot.previewMap(msg, content);
          }
          
          else if (['screenshot', 'peek'].includes(cmd)) {
            cmd = 'screenshot';
            cmdLog = await cmds.screenshot.peekServer(msg, content);
          }
          
          else if (['finalize', 'fin'].includes(cmd)) {
            cmd = 'screenshot';
            cmdLog = await cmds.screenshot.finalize(msg, content);
          }
          
          //Create Autochecker
          else if (['autocheck', 'achk'].includes(cmd)) {
            cmd = 'ivchecker';
            cmdLog = await cmds.ivchecker.createChecker(msg, content);
          }
          
          //Stop Autochecker
          else if (['stopcheck', 'schk'].includes(cmd)) {
            cmd = 'ivchecker';
            cmdLog = await cmds.ivchecker.stopChecker(msg, content);
          };
        };
        
        //Mod Level Commands
        if (permLvl > 1 && cmdLog === '') {
          
          //Run OpenRCT2 Scenario on Server
          if (['changemap', 'chmap', 'run'].includes(cmd)) {
            cmd = 'svr_ops';
            cmdLog = await cmds.svr_ops.run(msg, content);
          }
          
          //Stop OpenRCT2 Server
          else if (['kill', 'stop'].includes(cmd)) {
            cmd = 'svr_ops';
            cmdLog = await cmds.svr_ops.stop(msg, content);
          }
          
          //Restart OpenRCT2 Server
          else if (['restart'].includes(cmd)) {
            cmd = 'svr_ops';
            cmdLog = await cmds.svr_ops.run(msg, `-a ${content}`);
          }
          
          //Show Registered Users
          else if (['users', 'usrs'].includes(cmd)) {
            cmd = 'svr_config';
            cmdLog = await cmds.svr_config.showUsers(msg, content);
          }
          
          //Show Server Groups
          else if (['groups', 'grps'].includes(cmd)) {
            cmd = 'svr_config';
            cmdLog = await cmds.svr_config.showGroups(msg, content);
          }
          
          //Discard Scenarios
          else if (['remove', 'delete', 'del', 'rm'].includes(cmd)) {
            cmd = 'move';
            cmdLog = await cmds.scenarios.moveScenario(msg, content, 'discard');
          }
          
          //Restore Discarded Scenarios
          else if (['restore', 'res'].includes(cmd)) {
            cmd = 'move';
            cmdLog = await cmds.scenarios.moveScenario(msg, content, 'restore');
          };
        };
        
        //Trusted Level Commands
        if (
          (permLvl > 1
          || (
            permLvl === 1
            && config.botchannels.includes(msg.channel.name)
          ))
          && cmdLog === ''
        ) {
          
          //Vote for New Scenario
          if (['mapvote', 'votemap', 'vmap'].includes(cmd)) {
            cmd = 'vote';
            cmdLog = await cmds.vote.startScenarioVote(msg, content);
          }
          
          //Cancel Map Vote
          else if (['nomapvote', 'novotemap', 'novmap'].includes(cmd)) {
            cmd = 'vote';
            cmdLog = await cmds.vote.cancelScenarioVote(msg, content);
          };
        };
        
        //Public Commands
        if (cmdLog === '') {

          //Ping GTW
          if (['gtw'].includes(cmd)) {
            await msg.channel.send(`<@${config.gtw}>`);
          }
          
          //Get Latest Build Link
          else if (['devbuild', 'latest', 'dvb'].includes(cmd)) {
            cmd = 'devbuild';
            cmdLog = await cmds.checkbuild.checkBuild(msg, `${content} dev`);
          }
          
          //Get Latest Launcher Linnk
          else if (['launcher', 'lnc'].includes(cmd)) {
            cmd = 'launcher';
            cmdLog = await cmds.checkbuild.checkBuild(msg, `${content} lnc`);
          }
          
          //Check Server Status
          else if (['isup', 'up'].includes(cmd)) {
            cmd = 'isup';
            cmdLog = await cmds.isup.isUp(msg, content);
          }
          
          //Show Available Scenarios
          else if (['scenarios', 'maps'].includes(cmd)) {
            if (permLvl > 0 || config.botchannels.includes(msg.channel.name)) {
              cmd = 'scenarios';
              cmdLog = await cmds.scenarios.showScenarios(msg, content);
            };
          };
        };
        if (cmdLog !== undefined && cmdLog.length > 0) {
          console.log(cmdLog);
          await logger.writeLog(cmdLog, usrPath);
        };
      }
      catch(err) {
        console.log(err);
        await logger.writeLog(err, `${config.errlogs}/cmd`);
      };
    };
  }
  catch(err) {
    console.log(err);
    await logger.writeLog(err, `${config.errlogs}/bot`);
  };
});

bot.on('error', err => {
  console.log(err);
});

//Load config parameters
bot.login(config.token);