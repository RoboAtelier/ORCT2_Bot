/** Command module that installs new builds for OpenRCT2
 * @module install
 * @requires child_process, fs, http, orct2server, orct2web, config
 */
const { spawn } = require('child_process');
const { createWriteStream, createReadStream, unlink } = require('fs');
const { get } = require('http');
const { runServer, killServer, getServers } = require('../functions/orct2server');
const { getDownloadLink } = require('../functions/orct2web');
const { config } = require ('../config');

let loading = false;
let confirming = false;

/**
 * Installs a new/different build of OpenRCT2 on the system.
 * 
 * @function installNewOpenRCT2GameBuild
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {Promise<string>} Log entry
 */
async function installNewOpenRCT2GameBuild(msg, content) {
  
  //Prevent installation interruptions
  if (loading === false) {
    
    //Confirm user request
    if (confirming === false) {
      confirming = true;
      content.startsWith('-l')
      ? await msg.channel.send('All running servers will be shutdown to update to the latest build. Type `,update` or `,install -l` to confirm update.')
      : await msg.channel.send('All running servers will be shutdown to install a build. Type `,install (hash)` confirm update.');
      setTimeout(() => {
        confirming = false;
      }, 15000);
      return 'Attempted to install an OpenRCT2 build. Sent confirmation prompt.';
    }
    else {
      
      //Begin process
      loading = true;
      confirming = false;
      if (content.length === 0) {
        loading = false;
        await msg.channel.send('You must enter the build hash you want to install.');
        return 'Attempted to install an OpenRCT2 build. No input was given.'
      };
      
      //Shutdown any running servers
      const servers = getServers();
      if (servers.length > 0) {
        await msg.guild.channels.get(config.mainchannel).send('We\'re updating our OpenRCT2 build soon! Please save your current progress then disconnect.');
        await new Promise((resolve, reject) => {
          setTimeout(() => resolve(), 30000);
        });
        const shutMsg = await msg.channel.send('Shutting down all servers...');
        for (let i = 0; i < servers.length; i++) {
          await killServer(servers[i]);
        };
        await shutMsg.edit('All servers closed!');
      };
      
      //Get build uri
      const uri = content.startsWith('-l')
      ? config.devuri
      : config.devuri.replace('latest', content);
      let dl = undefined;
      try {
        dl = await getDownloadLink('linux', uri);
      }
      catch(err) {
        loading = false;
        await msg.channel.send('Bad build hash. Confirm the hash on the downloads page: https://openrct2.org/downloads');
        return 'Attempted to install an OpenRCT2 build. Bad hash given.';
      };
      if (dl === undefined) {
        await msg.channel.send('Build for Linux not available. Check the downloads page: https://openrct2.org/downloads');
        return 'Attempted to install an OpenRCT2 build. Linux build not available.';
      };
      await msg.channel.send(`Build found: *${dl.slice(dl.lastIndexOf('/') + 1)}*`)
      const dlPath = `${config.devbuilds}/${dl.slice(dl.lastIndexOf('/') + 1)}`;
      
      //Download preparation
      const ws = createWriteStream(dlPath);
      const loadMsg = await msg.channel.send(`**0%** | Downloading...`);
      let fileSize = 0;
      let loadCheck = undefined;
      
      //Begin download request
      const request = await get(dl, response => {
        fileSize = response.headers['content-length'];
        let loaded = 0;
        loadCheck = setInterval(() => {
          loadMsg.edit(loadMsg.content.replace(/[0-9]+%/, `${Math.floor(loaded/fileSize*100)}%`));
        }, 1500);
        response.on('data', async chunk => {
          loaded += chunk.length;
        })
        .pipe(ws);
      })
      .on('error', err => {
        loading = false;
        unlink(dlPath);
        throw err;
      });
      
      //Download entire package before continuing
      await new Promise((resolve, reject) => {
        ws.on('finish', async () => {
          clearTimeout(loadCheck);
          ws.close();
          await loadMsg.edit('**100%** | Downloaded!');
          resolve();
        })
        .on('error', err => {
          loading = false;
          ws.close();
          reject(err);
        });
      }).catch(err => {
        throw err;
      });
      
      //Installation preparation
      const installMsg = await msg.channel.send(`**0%** | Installing...`);
      const countProcess = await spawn('sh', ['-c', `tar -tf ${dlPath} | grep -vc '/$'`]);
      const fileCount = await new Promise((resolve, reject) => {
        countProcess.stdout.on('data', count => {
          resolve(count.toString().replace('\n', ''));
        })
        .on('error', err => {
          reject(err);
        });
      }).catch(err => {
        loading = false;
        throw err;
      });
      
      //Begin extraction and installation
      const extractProcess = await spawn (
        'tar',
        [
          '-xvzf',
          dlPath,
          '-C',
          process.env.HOME
          || process.env.HOMEPATH
          || process.env.USERPROFILE
        ]
      );

      //Complete extraction and installation before continuing
      await new Promise((resolve, reject) => {
        let files = 0;
        extractCheck = setInterval(() => {
          installMsg.edit(installMsg.content.replace(/[0-9]+%/, `${Math.floor(files/fileCount*100)}%`));
        }, 1500);
        extractProcess.on('exit', async () => {
          clearTimeout(extractCheck);
          await installMsg.edit('**100%** | Installed!');
          resolve();
        })
        .stdout.on('data', file => {
          files += 1;
        })
        .on('error', err => {
          reject(err);
        });
      }).catch(err => {
        loading = false;
        throw err;
      });
      
      //Restart any servers that were shutdown
      if (servers.length > 0) {
        const restartMsg = await msg.channel.send('Restarting all servers...');
        for (let i = 0; i < servers.length; i++) {
          await runServer('AUTOSAVE', servers[i]);
        };
        await restartMsg.edit('All servers restarted!');
        await msg.guild.channels.get(config.mainchannel).send('Our OpenRCT2 build has been installed! Check that you are on our version. If not: https://openrct2.org/downloads');
      };
      loading = false;
      await msg.channel.send('Build update successful!');
      return 'Successfully installed desired develop build of OpenRCT2.'
    };
  }
  else {
    await msg.channel.send('Process running. Please wait.');
    return 'Attempted to install an OpenRCT2 build. Process is currently running.';
  };
};

/**
 * Checks if an OpenRCT2 build installation is in progress.
 * 
 * @function checkOpenRCT2IsInstalling
 * @returns {boolean} Installation process state
 */
function checkOpenRCT2IsInstalling() {
  return loading;
};

module.exports = {
  installOpenRCT2: installNewOpenRCT2GameBuild,
  checkInstallation: checkOpenRCT2IsInstalling,
};