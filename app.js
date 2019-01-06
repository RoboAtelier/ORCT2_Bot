const Discord = require('discord.js');
const fs = require('fs');
const { logger } = require('./functions');
const cmds = require('./commands');
const { config } = require('./config');

const bot = new Discord.Client();

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', msg => {
  if (
    msg.author.id !== bot.user.id
    && msg.content.startsWith(config.prefix)
  ) {
    let contentSlice = msg.content.split(' ');
    let cmdSlice = contentSlice.splice(0, 1);
    let content = contentSlice.join(' ');
    let cmd = cmdSlice[0].substring(1).toLowerCase();
    
    logger.writeLog(
      `${msg.author.username} attempted to call \'${cmd}\' on #${msg.channel.name} (ID:${msg.channel.id}).`,
      `${config.userlogs}/${msg.author.id}-${msg.author.username}`
    )
    .then(() => {
      if (['isup', 'up'].includes(cmd)) {
        cmds.isup.isUpCmd(msg, content)
        .then(log => {
          logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
        })
        .catch(err => {
          console.log(err);
          logger.writeLog(err, `${config.errlogs}/isup`);
          msg.channel.send('Could not successfully check server status.');
        });
      }
      else if (['devbuild', 'latest', 'dvb'].includes(cmd)) {
        cmds.checkver.checkVerCmd(msg, content, 'dev', config.devuri)
        .then(log => {
          logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
        })
        .catch(err => {
          console.log(err);
          logger.writeLog(err, `${config.errlogs}/checkver`);
          msg.channel.send('Could not find details about the latest OpenRCT2 build.');
        });
      }
      else if (['launcher', 'lnc'].includes(cmd)) {
        cmds.checkver.checkVerCmd(msg, content, 'lnc', config.lncuri)
        .then(log => {
          logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
        })
        .catch(err => {
          console.log(err);
          logger.writeLog(err, `${config.errlogs}/checkver`);
          msg.channel.send('Could not find details about the latest OpenRCT2 launcher.');
        });
      }
      else if (
        config.trustchannels.includes(msg.channel.name)
        || config.adminchannels.includes(msg.channel.name)
      ) {
        if (['scenarios', 'maps'].includes(cmd)) {
          cmds.scenarios.listScenarios(msg, content)
          .then(log => {
            logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
          })
          .catch(err => {
            console.log(err);
            logger.writeLog(err, `${config.errlogs}/scenarios`);
          });
        }
        else if (['discard', 'remove', 'delete', 'del', 'rm'].includes(cmd)) {
          cmds.move.moveScenario(msg, content, 'discard')
          .then(log => {
            logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
          })
          .catch(err => {
            console.log(err);
            logger.writeLog(err, `${config.errlogs}/move`);
          });
        }
        else if (['restore', 'res'].includes(cmd)) {
          cmds.move.moveScenario(msg, content, 'restore')
          .then(log => {
            logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
          })
          .catch(err => {
            console.log(err);
            logger.writeLog(err, `${config.errlogs}/move`);
          });
        }
        else if (['mapvote', 'votemap', 'vmap'].includes(cmd)) {
          cmds.vote.startScenarioVote(msg, content)
          .then((log) => {
            console.log(log);
            logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
          })
          .catch(err => {
            console.log(err);
            logger.writeLog(err, `${config.errlogs}/vote`);
          });
        }
        else if (['changemap', 'run'].includes(cmd)) {
          if (
            msg.member.roles.has('445404235190894613')
            || msg.member.roles.has('345445124580442113')
          ) {
            cmds.run.runScenario(msg, content);
          };
        }
        /**else if (['devcheck', 'check'].includes(cmd)) {
          orct2web.getHash('lnc', config.lncuri)
          .then((hash) => {console.log(hash);})
          .catch((err) => {console.log(err);});
        };*/
      };
    })
    .catch(err => {
      console.log(err);
    });
  };
});

bot.on('error', err => {
  console.log(err);
});

//Load config parameters
cmds.isup.loadGTWIPv4s([config.server1ipv4, config.server2ipv4]);
cmds.scenarios.loadPaths(config.scenarios, config.discard);
cmds.move.loadPaths(config.scenarios, config.discard);
bot.login(config.token);