// main.js - the heart and soul of our little mp3 metadata extractor
// honestly this started as a simple script and kinda grew into this whole thing...

const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

// ——— Helper functions ———
// these are the workhorses that do the boring stuff so we don't have to think about it

// Helper to send a log line back to renderer
// because console.log in the main process is invisible to users and that's just mean
function log(event, ...msgs) {
  const text = msgs.map(m => (typeof m === 'string' ? m : JSON.stringify(m))).join(' ');
  console.log(text);
  event.sender.send('export-log', text); // send it to the UI so people can see what's happening
}

// Title-case a string (for genres)
// you know how genres are always weirdly capitalized? this fixes that
// like "indie rock" becomes "Indie Rock" which looks way better
function titleCase(str) {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Strip ".mp3" and any leading "NN - " from filenames
// because who wants "01 - song.mp3" when you can just have "song"?
// this handles all the weird numbering schemes people use
function cleanTitle(filename) {
  return filename
    .replace(/\.mp3$/i, '') // bye bye .mp3
    .replace(/^\d+\s*-\s*/, '') // and bye bye track numbers
    .trim();
}

// Remove empty entries, dedupe, and Title-Case each genre
// genres are a mess in mp3 files - sometimes there's duplicates, sometimes empty ones
// this cleans up the chaos and makes everything look nice
function sanitizeGenres(genres) {
  if (!Array.isArray(genres)) return []; // safety first!
  const seen = new Set(); // keep track of what we've seen already
  return genres
    .map(g => g.trim()) // strip whitespace
    .filter(g => g) // remove empty strings
    .map(g => titleCase(g)) // make it pretty
    .filter(g => { // dedupe using the Set
      if (seen.has(g)) return false;
      seen.add(g);
      return true;
    });
}



// ——— Metadata parsing ———
// this is where the magic happens - reading all those ID3 tags
// Import music-metadata at the top level to avoid issues with packaged apps
// (learned this the hard way when the packaged version kept crashing)

let mm; // global reference to the music-metadata module
async function loadMusicMetadata() {
  if (mm) return mm; // already loaded? great, use it
  
  try {
    // Try requiring first (works in most cases)
    mm = require('music-metadata');
    return mm;
  } catch (error) {
    console.log('Require failed, trying import:', error.message);
    try {
      // Try dynamic import as fallback
      // because sometimes electron is weird about modules and this might work when require doesn't
      mm = await import('music-metadata');
      return mm;
    } catch (importError) {
      throw new Error(`Failed to load music-metadata: ${importError.message}`);
    }
  }
}

// this is the main worker function that extracts metadata from a single file
// it's async because reading files takes time and we don't want to freeze the UI
async function parseFileMetadata(filePath) {
  const mm = await loadMusicMetadata();
  
  try {
    // skipCovers because we don't need album art taking up memory
    const metadata = await mm.parseFile(filePath, { duration: true, skipCovers: true });
    
    // artist can be an array or string depending on the file... why? who knows
    // but we handle both cases here
    const artistVal = metadata.common.artist;
    const artist = Array.isArray(artistVal)
      ? artistVal.join(', ') // multiple artists get joined with commas
      : typeof artistVal === 'string'
        ? artistVal
        : ''; // fallback to empty string if it's weird
    
    return {
      path: filePath.split(/[\\/]/).pop(), // just the filename, not the full path
      title: metadata.common.title || filePath.split(/[\\/]/).pop().replace(/\.mp3$/i, ''), // use filename if no title
      artist,
      album: metadata.common.album || '', // empty string if no album
      genre: (Array.isArray(metadata.common.genre) ? metadata.common.genre : []).map(g => g.trim()).filter(g => g),
      year: metadata.common.year || null, // null instead of undefined because JSON
      track: metadata.common.track?.no || null, // optional chaining because track might not exist
      duration: metadata.format.duration || 0 // duration in seconds
    };
  } catch (err) {
    // sometimes files are corrupted or have weird metadata
    // instead of crashing, we return basic info and keep going
    return {
      path: filePath.split(/[\\/]/).pop(),
      title: filePath.split(/[\\/]/).pop().replace(/\.mp3$/i, ''),
      artist: '',
      album: '',
      genre: [],
      year: null,
      track: null,
      duration: 0
    };
  }
}

// Handle metadata parsing requests from renderer
// this is called when the user clicks "process all files"
// we loop through all files and send progress updates so they know we're not frozen
ipcMain.handle('parse-metadata', async (event, filePaths) => {
  const tracks = [];
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    // send progress so the user doesn't think we crashed
    event.sender.send('parse-progress', { current: i + 1, total: filePaths.length, file: filePath });
    const track = await parseFileMetadata(filePath);
    tracks.push(track);
  }
  return tracks;
});

// ——— Scanning for preview ———
// before processing hundreds of files, let's show a preview of what we'll get

function listMp3Files(dir) {
  // read directory and filter for .mp3 files
  // case insensitive because some people use .MP3 and that's fine too
  return fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.mp3'))
    .map(f => path.join(dir, f));
}

// remember the last directory the user selected so we can default to it
// because nobody wants to navigate to the same folder over and over
let lastSelectedMp3Dir = '';

ipcMain.handle('get-last-mp3-dir', () => lastSelectedMp3Dir);

// let user pick where to save the output JSON file
ipcMain.handle('browse-output-dir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled) return []; // user changed their mind
  return filePaths;
});

// main directory selection dialog
// also grabs a random sample of files for preview
ipcMain.handle('select-directory', async (event, sampleSize = 10) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled) return [];
  
  const dir = filePaths[0];
  lastSelectedMp3Dir = dir; // remember for next time
  
  const allFiles = listMp3Files(dir);
  const n = Math.min(sampleSize, allFiles.length);
  if (n === 0) return []; // no mp3 files found
  
  // Randomly sample N files for preview
  // because looking at the first 10 files might not be representative
  const sampled = [];
  const used = new Set();
  while (sampled.length < n) {
    const idx = Math.floor(Math.random() * allFiles.length);
    if (!used.has(idx)) {
      sampled.push(allFiles[idx]);
      used.add(idx);
    }
  }
  return sampled;
});

// ——— Exporting to JSON on disk ———
// the whole point of this app - saving the metadata to a file

ipcMain.handle('export-library', async (event, outputDir, tracks) => {
  log(event, '📂 Exporting metadata to JSON…');
  
  // if no output directory specified, use the source directory
  let dir = lastSelectedMp3Dir;
  if (!dir) {
    // this shouldn't happen but just in case...
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (canceled || !filePaths.length) {
      log(event, '⚠️ Export canceled.');
      return { canceled: true };
    }
    dir = filePaths[0];
    lastSelectedMp3Dir = dir;
  }
  
  // Use outputDir or default to source dir
  const outDir = outputDir || dir;
  const filePath = path.join(outDir, 'library.json');
  
  log(event, '→ Saving to:', filePath);
  
  // write the JSON file with nice formatting (2 space indentation)
  // because nobody likes minified JSON when they're trying to debug
  fs.writeFileSync(filePath, JSON.stringify(tracks, null, 2), 'utf8');
  
  log(event, '✅ Export complete!');
  return { canceled: false, savedTo: filePath };
});

// asset path helpers for icons and help files
// different paths for development vs packaged app because electron is... special
ipcMain.handle('get-asset-path', (event, asset) => {
  const path = require('path');
  if (asset === 'icon-navbar') {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'app', 'build', 'icon-navbar.png');
    } else {
      return path.join(__dirname, 'build', 'icon-navbar.png');
    }
  }
  if (asset === 'help') {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'app', 'help.html');
    } else {
      return path.join(__dirname, 'help.html');
    }
  }
  return '';
});

// get the navbar icon as a data URL so we can show it in the UI
// base64 encoding because that's how you embed images in HTML
ipcMain.handle('get-navbar-icon-dataurl', async () => {
  const fs = require('fs');
  const path = require('path');
  let iconPath;
  
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, 'app', 'build', 'icon-navbar.png');
  } else {
    iconPath = path.join(__dirname, 'build', 'icon-navbar.png');
  }
  
  try {
    const data = fs.readFileSync(iconPath);
    return 'data:image/png;base64,' + data.toString('base64');
  } catch (e) {
    // if we can't load the icon, return empty string and the UI will handle it
    return '';
  }
});


// ——— Menu creation ———
// because every desktop app needs a proper menu bar
// even if it's just File > Exit and Help > About

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q', // mac vs everyone else
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'User Guide',
          click: () => {
            // Open help file (works in dev and packaged)
            // we send a message to the renderer to open the help window
            const { BrowserWindow } = require('electron');
            const win = BrowserWindow.getFocusedWindow();
            win.webContents.send('open-help-file');
          }
        },
        {
          label: 'Visit Website',
          click: () => {
            // open external link in default browser
            shell.openExternal('https://fillll.com');
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            // direct link to github issues - hopefully people will actually use this
            shell.openExternal('https://github.com/fillll-music/mp3-metadata-exporter/issues');
          }
        },
        { type: 'separator' }, // visual separator in the menu
        {
          label: 'About MP3 Metadata Exporter',
          click: () => {
            // standard about dialog
            dialog.showMessageBox({
              type: 'info',
              title: 'About MP3 Metadata Exporter',
              message: 'MP3 Metadata Exporter',
              detail: 'Version 1.0.0\n\nExtract and export ID3 tag metadata from MP3 files to JSON format.\n\n© 2024 Fillll. All rights reserved.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ——— Window & auto‐update bootstrapping ———
// the main window creation and app startup stuff

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true, // needed for fs access in renderer
      contextIsolation: false // we trust our own code... probably should change this someday
    }
  });
  
  // load the main HTML file
  win.loadFile('index.html');
  
  // uncomment this if you want dev tools open by default
  // win.webContents.openDevTools();
}

// app startup sequence
app.whenReady().then(() => {
  createMenu(); // set up the menu first
  createWindow(); // then create the main window
  
  // check for updates (this is why we included electron-updater)
  // it'll handle everything automatically if there's a new version
  autoUpdater.checkForUpdatesAndNotify();

  // handle the case where all windows are closed but app is still running
  // this is mostly a mac thing but doesn't hurt to have it everywhere
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// quit when all windows are closed, except on mac where apps stay running
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// that's it! hopefully this all makes sense and doesn't break anything
// electron can be finicky sometimes but this setup has been pretty solid
