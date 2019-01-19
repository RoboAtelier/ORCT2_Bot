const Discord = require('discord.js');
const fs = require('fs');
const { logger, reader } = require('./functions');
const cmds = require('./commands');
const { config } = require('./config');

const bot = new Discord.Client();

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
      console.log(usrLog);
      await logger.writeLog(usrLog, usrPath);
      let cmdLog = '';
      try {
        if (['isup', 'up'].includes(cmd)) {
          cmd = 'isup';
          cmdLog = await cmds.isup.isUpCmd(msg, content);
        }
        else if (['devbuild', 'latest', 'dvb'].includes(cmd)) {
          cmd = 'devbuild';
          cmdLog = await cmds.checkver.checkVerCmd(msg, content, 'dev', config.devuri);
        }
        else if (['launcher', 'lnc'].includes(cmd)) {
          cmd = 'launcher';
          cmdLog = await cmds.checkver.checkVerCmd(msg, content, 'lnc', config.lncuri);
        }
        else if (['scenarios', 'maps'].includes(cmd)) {
          if (
            msg.member.roles.has(config.mod)
            || msg.member.roles.has(config.admin)
            || msg.member.roles.has(config.owner)
            || config.botchannels.includes(msg.channel.name)
          ) {
            cmd = 'scenarios';
            cmdLog = await cmds.scenarios.showScenarios(msg, content);
          };
        }
        else if (
          config.trustchannels.includes(msg.channel.name)
          || config.adminchannels.includes(msg.channel.name)
        ) {
          if (['discard', 'remove', 'delete', 'del', 'rm'].includes(cmd)) {
            cmd = 'move';
            cmdLog = await cmds.scenarios.moveScenario(msg, content, 'discard');
          }
          else if (['restore', 'res'].includes(cmd)) {
            cmd = 'move';
            cmdLog = await cmds.scenarios.moveScenario(msg, content, 'restore');
          }
          else if (['mapvote', 'votemap', 'vmap'].includes(cmd)) {
            cmd = 'vote';
            cmdLog = await cmds.vote.startScenarioVote(msg, content);
          }
          else if (['nomapvote', 'novotemap', 'novmap'].includes(cmd)) {
            cmd = 'vote';
            cmdLog = await cmds.vote.cancelScenarioVote(msg, content);
          }
          else if (
            msg.member.roles.has(config.mod)
            || msg.member.roles.has(config.admin)
            || msg.member.roles.has(config.owner)
          ) {
            if (['changemap', 'run'].includes(cmd)) {
              cmd = 'svr_ops';
              cmdLog = await cmds.svr_ops.run(msg, content);
            }
            else if (['restart'].includes(cmd)) {
              cmd = 'svr_ops';
              cmdLog = await cmds.svr_ops.run(msg, `-a ${content}`);
            }
            else if (['users', 'usrs'].includes(cmd)) {
              cmd = 'svr_config';
              cmdLog = await cmds.svr_config.showUsers(msg, content);
            }
            else if (['groups', 'grps'].includes(cmd)) {
              cmd = 'svr_config';
              cmdLog = await cmds.svr_config.showGroups(msg, content);
            }
            else if (
              msg.member.roles.has(config.admin)
              || msg.member.roles.has(config.owner)
            ) {
              if (['kill', 'stop'].includes(cmd)) {
                cmd = 'svr_ops';
                cmdLog = await cmds.svr_ops.stop(msg, content);
              }
              else if (['config', 'conf'].includes(cmd)) {
                cmd = 'svr_config';
                cmdLog = await cmds.svr_config.showConfig(msg, content);
              }
              else if (['editconfig', 'editconf', 'chconf'].includes(cmd)) {
                cmd = 'svr_config';
                cmdLog = await cmds.svr_config.editConfig(msg, content);
              };
            };
          };
        };
        if (cmdLog.length > 0) {
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
cmds.isup.loadGTWIPv4s([config.server1ipv4, config.server2ipv4]);
bot.login(config.token);