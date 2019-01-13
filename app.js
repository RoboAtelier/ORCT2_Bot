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
    let content = contentSlice.join(' ').trim();
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
          cmds.scenarios.moveScenario(msg, content, 'discard')
          .then(log => {
            logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
          })
          .catch(err => {
            console.log(err);
            logger.writeLog(err, `${config.errlogs}/move`);
          });
        }
        else if (['restore', 'res'].includes(cmd)) {
          cmds.scenarios.moveScenario(msg, content, 'restore')
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
        else if (['cancelmap', 'cncmap'].includes(cmd)) {
          cmds.vote.cancelScenarioVote(msg, content)
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
            msg.member.roles.has(config.entrepreneur)
            || msg.member.roles.has(config.gatekeeper)
            || msg.member.roles.has(config.operator)
          ) {
            cmds.svrops.runScenario(msg, content)
            .then((log) => {
              console.log(log);
              logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
            })
            .catch(err => {
              console.log(err);
              logger.writeLog(err, `${config.errlogs}/serverops`);
            });
          };
        }
        else if (['kill', 'stop'].includes(cmd)) {
          if (
            msg.member.roles.has(config.gatekeeper)
            || msg.member.roles.has(config.operator)
          ) {
            cmds.svrops.killServer(msg, content)
            .then((log) => {
              console.log(log);
              logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
            })
            .catch(err => {
              console.log(err);
              logger.writeLog(err, `${config.errlogs}/serverops`);
            });
          }
        }
        else if (['config', 'conf'].includes(cmd)) {
          if (
            msg.member.roles.has(config.gatekeeper)
            || msg.member.roles.has(config.operator)
          ) {
            cmds.svrconfig.showConfig(msg, content)
            .then((log) => {
              console.log(log);
              logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
            })
            .catch(err => {
              console.log(err);
              logger.writeLog(err, `${config.errlogs}/serverfiles`)
            });
          }
        }
        else if (['editconfig', 'editconf', 'chconf'].includes(cmd)) {
          if (
            msg.member.roles.has(config.gatekeeper)
            || msg.member.roles.has(config.operator)
          ) {
            cmds.svrconfig.editServer(msg, content)
            .then((log) => {
              console.log(log);
              logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
            })
            .catch(err => {
              console.log(err);
              logger.writeLog(err, `${config.errlogs}/serverfiles`)
            });
          }
        }
        else if (['users', 'usrs'].includes(cmd)) {
          if (
            msg.member.roles.has(config.gatekeeper)
            || msg.member.roles.has(config.operator)
          ) {
            cmds.svrfiles.showUsers(msg, content)
            .then((log) => {
              console.log(log);
              logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
            })
            .catch(err => {
              console.log(err);
              logger.writeLog(err, `${config.errlogs}/serverfiles`)
            });
          }
        }
        else if (['groups', 'grps'].includes(cmd)) {
          if (
            msg.member.roles.has(config.gatekeeper)
            || msg.member.roles.has(config.operator)
          ) {
            cmds.svrfiles.showGroups(msg, content)
            .then((log) => {
              console.log(log);
              logger.writeLog(log, `${config.userlogs}/${msg.author.id}-${msg.author.username}`);
            })
            .catch(err => {
              console.log(err);
              logger.writeLog(err, `${config.errlogs}/serverfiles`)
            });
          };
        };
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
bot.login(config.token);