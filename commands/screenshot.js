/** Command module that takes scenario screenshots
 * @module screenshot
 * @requires fs, child_process
 */
const { spawn, exec } = require('child_process');
const {
  copyFileSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
} = require('fs');
const {
  getLatestAutosave,
  getScenarios,
  getServerDir,
  getPreview,
} = require('../functions/reader');
const { getScenario } = require('../functions/orct2server');
const { config } = require('../config');

const UNNAMED_MAP_PHRASES = [
  'an unnamed map',
  'an unnamed scenario',
  'some map',
  'some scenario',
  'a map that I can\'t find the name of',
  'a map... what else do you want',
  'an autosave',
  'an autosave I just picked randomly',
  'undefined',
  'null',
  'ACCESS_VIOLATION at 80081E35'
];
let loading = false;
let finalizing = false;

/**
 * Creates a new screenshot engine process.
 * 
 * @async
 * @function createScreenshotProcess
 * @param {string} dir - Directory of scenario
 * @param {string} dirout - Output directory
 * @param {string} scenario - Scenario file to screenshot
 * @param {string} [pngout] - Output name of .png file
 * @returns {Promise<ChildProcess>} Child process of screenshot engine.
 */
async function createScreenshotProcess(dir, dirout, scenario, pngout = '') {
  
  //Screenshot engine parameters
  const options = [
    'screenshot',
    `${dir}/${scenario}`,
    `${dirout}/${scenario.slice(0, scenario.length - 4)}.png`,
    'giant',
    '1',
    '0'
  ];
  
  //Specify screenshot output name
  if (pngout.length > 0) {
    options[2] = `${dirout}/${pngout}.png`;
  };
  
  //Create child process
  const child = await spawn(`${
  process.env.HOME
  || process.env.HOMEPATH
  || process.env.USERPROFILE
  }/OpenRCT2/openrct2`, options);
  return child;
};

/**
 * Creates a new preview screenshot for an OpenRCT2 scenario.
 * 
 * @async
 * @function createScenarioPreviewScreenshot
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {Promise<string>} Log entry
 */
async function createPreviewScreenshot(msg, content) {
  
  //Only run with a single screenshot process at a time
  if (loading === false) {
    loading = true;
    
    //Find specific scenario
    const scenarios = await getScenarios(config.scenarios, content);
    if (scenarios.length > 1) {
      await msg.channel.send(`'${content}' returned multiple scenarios:\n\n${scenarios.splice(0, 20).join('\n')}\n\nPlease enter a more exact name.`);
      loading = false;
      return 'Attempted to preview a scenario. Search input returned multiple scenarios.';
    }
    else if (scenarios.length === 0) {
      await msg.channel.send(`No scenario found with '${content}'.`);
      loading = false;
      return 'Attempted to preview a scenario. Search input did not return a scenario.';
    };
    
    //Check for cached preview screenshot
    const loadMsg = await msg.channel.send('Loading screenshot...');
    const preview = await getPreview(scenarios[0]);
    if (preview.length > 0) {
      await loadMsg.delete();
      await msg.channel.send(`**${preview.slice(0, preview.length - 4)}**`, {
        files: [{
          attachment: `${config.previews}/${preview}`,
          name: 'preview.png',
        }]
      });
      loading = false;
      return 'Successfully loaded preview image of scenario.';
    }
    
    //Create new preview screenshot
    else {
      const scrnProcess = await createScreenshotProcess(
        config.scenarios,
        `${config.scenarios}/previews`,
        scenarios[0],
      );
      const png = `${scenarios[0].slice(0, scenarios[0].length - 4)}.png`;
      let timeout = undefined;
      
      //Wait for screenshot engine to finish
      const success = await new Promise((resolve, reject) => {
        scrnProcess.on('exit', async (code, signal) => {
          await loadMsg.delete();
          await msg.channel.send(
            `**${scenarios[0].slice(0, scenarios[0].length - 4)}**`,
            {
              files: [{
                attachment: `${config.previews}/${png}`,
                name: 'preview.png'
              }]
            }
          );
          resolve(true);
        });
        scrnProcess.on('error', async (err) => {
          reject(err);
        });
        timeout = setTimeout(async () => {
          await loadMsg.edit(`Screenshot took too long to load.`);
          resolve(false);
        }, 10000);
      });
      
      //Cleanup and post results
      clearTimeout(timeout);
      loading = false;
      return success
      ? 'Successfully loaded preview image of scenario.'
      : 'Attempted to preview a scenario. Screenshot took too long to load.';
    };
  }
  else {
    await msg.channel.send('There is a screenshot being loaded. Please wait.');
    return 'Attempted to preview a scenario. Different screenshot is currently loading.';
  };
};

/**
 * Creates a new screenshot for the latest running scenario in an OpenRCT2 server.
 * May not always show the most current progress, depending on autosave frequency.
 * 
 * @async
 * @function createServerScenarioScreenshot
 * @param {Message} msg - Discord message object
 * @param {string} content - Message contents
 * @returns {Promise<string>} Log entry
 */
async function createServerScreenshot(msg, content) {
  
  //Only run with a single screenshot process at a time
  if (loading === false) {
    loading = true;
    
    //Get desired server directory
    let server = 1;
    let serverDir = config.openrct2;
    if (/^[1-9][0-9]*$/.test(content)) {
      server = parseInt(content);
    };
    if (server > 1) {
      serverDir = await getServerDir(server);
      if (serverDir.length === 0) {
        await msg.channel.send(`Server #${server} folder doesn't exist.`);
        loading = false;
        return 'Attempted to screenshot server scenario. Selected server directory does not exist.';
      };
    };
    
    //Create new screenshot
    const loadMsg = await msg.channel.send('Loading screenshot...');
    const autosave = await getLatestAutosave(serverDir);
    if (autosave.length > 0) {
      const scrnProcess = await createScreenshotProcess(
        `${serverDir}/save/autosave`,
        './',
        autosave,
        `s${server}`,
      );
      let timeout = undefined;
      
      //Wait for screenshot engine to finish
      const success = await new Promise((resolve, reject) => {
        scrnProcess.on('exit', async (code, signal) => {
          await loadMsg.delete();
          await msg.channel.send(
            `**Server #${server} Latest Progress** *Note: may not be current*`,
            {
              files: [{
                attachment: `./s${server}.png`,
                name: `s${server}.png`,
              }]
            }
          );
          resolve(true);
        });
        scrnProcess.on('error', async (err) => {
          reject(err);
        });
        timeout = setTimeout(async () => {
          await loadMsg.edit(`Screenshot took too long to load.`);
          resolve(false);
        }, 10000);
      });
      
      //Cleanup and post results
      clearTimeout(timeout);
      loading = false;
      return success
      ? 'Successfully loaded server scenario screenshot.'
      : 'Attempted to screenshot server scenario. Screenshot took too long to load.';
    }
    else {
      await loadMsg.edit(`There are no autosaves for Server #${server}!`);
      loading = false;
      return 'Attempted to screenshot server scenario. No autosaves found.';
    };
  }
  else {
    await msg.channel.send('There is a screenshot being loaded. Please wait.');
    return 'Attempted to screenshot server scenario. Different screenshot is currently loading.';
  };
};

async function createFinalScenarioDownload(msg, content) {
  let input = content;
  
  //Only run with a single screenshot process at a time
  if (finalizing === false) {
    finalizing = true;
    
    //Get desired server directory
    let server = 1;
    let serverDir = config.openrct2;
    if (/^[1-9][0-9] /.test(input)) {
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
        await msg.channel.send(`Server #${server} folder doesn't exist.`);
        loading = false;
        return 'Attempted to create final scenario post. Selected server directory does not exist.';
      };
    };
    
    //Copy autosave and rename it for posting
    const loadMsg = await msg.channel.send('Finalizing...');
    const autosave = await getLatestAutosave(serverDir);
    const serverMap = await getScenario(server);
    if (autosave.length > 0) {
      let saveName = input;
      if (input.length === 0) {
        saveName = serverMap === undefined
        ? 'AUTOSAVE'
        : serverMap;
      };
      const dateOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      };
      const curDate = new Date()
      .toLocaleDateString('en-EN')
      .split('/')
      .join('-')
      .replace(',', '');
      copyFileSync(
        `${serverDir}/save/autosave/${autosave}`,
        `${config.finals}/${saveName}_FINAL_${curDate}.sv6`,
      );
      
      //Create new screenshot
      const scrnProcess = await createScreenshotProcess(
        `${serverDir}/save/autosave`,
        './',
        autosave,
        'final',
      );
      let timeout = undefined;
      
      //Wait for screenshot engine to finish
      const success = await new Promise((resolve, reject) => {
        scrnProcess.on('exit', async (code, signal) => {
          await loadMsg.delete();
          await msg.guild.channels.get(config.mapdlchannel).send(
            serverMap === undefined
            ? `Finalized Map of **${serverMap}**`
            : `Finalized Map of *{UNNAMED_MAP_PHRASES[Math.floor(Math.random()*UNNAMED_MAP_PHRASES.length)]}*.`,
            {
              files: [{
                attachment: './final.png',
                name: 'final.png',
              }]
            }
          );
          resolve(true);
        });
        scrnProcess.on('error', async (err) => {
          reject(err);
        });
        timeout = setTimeout(async () => {
          await loadMsg.edit(`Screenshot took too long to load.`);
          resolve(false);
        }, 10000);
      });
      
      //Cleanup and post results
      clearTimeout(timeout);
      finalizing = false;
      if (success === true) {
        await msg.guild.channels.get(config.mapdlchannel).send({
          files: [{
            attachment: `${config.finals}/${saveName}_FINAL_${curDate}.sv6`,
            name: `${saveName}_FINAL_${curDate}.sv6`,
          }]
        });
        return 'Successfully posted finalized autosave of current server scenario.';
      };
      return 'Attempted to create final scenario post. Screenshot took too long to load.';
    }
    else {
      await loadMsg.edit(`There are no autosaves for Server #${server}!`);
      finalizing = false;
      return 'Attempted to create final scenario post. No autosaves found.';
    };
  }
  else {
    await msg.channel.send('Finalization already in progress. Please wait.');
    return 'Attempted to create final scenario post. Different screenshot is currently loading.';
  };
};

module.exports = {
  finalize: createFinalScenarioDownload,
  previewMap: createPreviewScreenshot,
  peekServer: createServerScreenshot,
};