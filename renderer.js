// renderer.js - this is where all the UI magic happens
// basically everything the user sees and clicks on is handled here

const { ipcRenderer } = require('electron');

// grab all the DOM elements we need - doing this at the top so we don't have to hunt for them later
const previewBtn = document.getElementById('previewBtn');
const exportBtn = document.getElementById('exportBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsPreviewCount = document.getElementById('settingsPreviewCount');
const settingsOutputDir = document.getElementById('settingsOutputDir');
const settingsBrowseBtn = document.getElementById('settingsBrowseBtn');
const status = document.getElementById('status');
const progress = document.getElementById('progressBar');
const logOutput = document.getElementById('logOutput');
const tableBody = document.getElementById('previewTableBody');
const previewContainer = document.getElementById('previewContainer');
const logContainer = document.getElementById('logContainer');

// Settings state - keeping it simple with just the stuff users actually care about
let settings = {
  previewCount: 10, // how many files to show in preview
  outputDir: '' // where to save the JSON file
};

// Load settings from localStorage or use defaults
// localStorage is perfect for this - survives app restarts and doesn't clutter up the filesystem
function loadSettings() {
  const saved = localStorage.getItem('mp3ExporterSettings');
  if (saved) {
    settings = { ...settings, ...JSON.parse(saved) }; // merge with defaults in case we added new settings
  }
  // update the form fields with loaded values
  settingsPreviewCount.value = settings.previewCount;
  settingsOutputDir.value = settings.outputDir;
}

// Save settings to localStorage
// called whenever user clicks save in the settings modal
function saveSettings() {
  settings.previewCount = parseInt(settingsPreviewCount.value, 10) || 10; // fallback to 10 if parsing fails
  settings.outputDir = settingsOutputDir.value;
  localStorage.setItem('mp3ExporterSettings', JSON.stringify(settings));
}

// Settings modal functions
// these control the little popup window for settings
function openSettings() {
  loadSettings(); // refresh settings from storage first
  settingsModal.classList.remove('hidden');
}

function closeSettings() {
  settingsModal.classList.add('hidden');
}

// helper to enable/disable both buttons
// because nothing's worse than clicking a button and having it do nothing
// better to disable them when we're processing so users know what's happening
function setButtonsDisabled(state) {
    previewBtn.disabled = state;
    exportBtn.disabled = state;
}

// Settings event listeners - wire up all the buttons
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
cancelSettingsBtn.addEventListener('click', closeSettings);

saveSettingsBtn.addEventListener('click', () => {
  saveSettings();
  closeSettings();
});

// Validate preview count input
// people love to type weird stuff into number inputs, so we gotta clamp it
settingsPreviewCount.addEventListener('blur', () => {
  const value = parseInt(settingsPreviewCount.value, 10);
  if (value > 100) {
    settingsPreviewCount.value = 100; // nobody needs to preview more than 100 files
  } else if (value < 1) {
    settingsPreviewCount.value = 1; // and you need at least 1
  }
});

// browse button for output directory
// opens a folder picker dialog
settingsBrowseBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('browse-output-dir');
  if (result && result.length > 0) {
    settingsOutputDir.value = result[0];
  }
});

// Close modal when clicking outside
// this is just good UX - people expect this behavior
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    closeSettings();
  }
});

// Listen for log messages from the main process
// this is how we get those nice status messages during export
ipcRenderer.on('export-log', (_, text) => {
    logOutput.textContent += text + '\n';
    logOutput.scrollTop = logOutput.scrollHeight; // auto-scroll to bottom
});

// Listen for progress updates from main
// this was for an older version but keeping it just in case
ipcRenderer.on('scan-progress', (_, { current, total, file }) => {
    progress.max = total;
    progress.value = current;
    status.innerText = `Exporting ${file} (${current}/${total})…`;
});

// Listen for metadata parsing progress
// this is the real progress indicator - shows which file we're currently processing
ipcRenderer.on('parse-progress', (_, { current, total, file }) => {
    progress.max = total;
    progress.value = current;
    const fileName = file.split(/[\\/]/).pop(); // just show filename, not full path
    status.innerText = `Processing ${fileName} (${current}/${total})…`;
});

// Helper to parse metadata for a list of files using IPC
// this just forwards the request to the main process where the heavy lifting happens
async function parseTracks(filePaths, progressCb) {
  return await ipcRenderer.invoke('parse-metadata', filePaths);
}

// Preview flow - this is what happens when user clicks "Preview Sample"
// shows a few files so they can see what the metadata looks like before processing everything
previewBtn.addEventListener('click', async () => {
    setButtonsDisabled(true); // disable buttons so user can't click them again
    status.innerText = 'Starting preview…';
    progress.value = 0;
    logOutput.textContent = '';
    tableBody.innerHTML = ''; // clear any previous results
    previewContainer.classList.add('hidden');
    logContainer.style.display = 'none'; // Hide log window during preview - it's not needed here

    try {
        // make sure preview count is reasonable
        const sampleSize = Math.max(1, Math.min(100, settings.previewCount));
        
        // ask main process to show directory picker and get sample files
        const filePaths = await ipcRenderer.invoke('select-directory', sampleSize);
        if (filePaths.length === 0) {
            status.innerText = 'No files selected or directory empty.';
            return;
        }
        
        // Set output directory to the selected folder if not already set
        // this is a nice UX touch - auto-fill the output dir with the source dir
        if (filePaths[0]) {
            const mp3Dir = filePaths[0].split(/[\\/]/).slice(0, -1).join('/');
            if (mp3Dir && !settings.outputDir) {
                settings.outputDir = mp3Dir;
                settingsOutputDir.value = mp3Dir;
                saveSettings();
            }
        }
        
        // Parse metadata via IPC - this is where the magic happens
        const tracks = await parseTracks(filePaths);
        
        // Populate table with results
        // creating HTML rows dynamically because it's easier than template systems for this simple case
        tracks.forEach((t, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${t.title}</td>
        <td>${t.artist}</td>
        <td>${t.album}</td>
        <td>${t.genre.join(', ')}</td>
        <td>${Math.round(t.duration)}s</td>
      `;
            tableBody.appendChild(tr);
        });
        
        // show the results table
        previewContainer.classList.remove('hidden');
        status.innerText = `Preview complete: ${tracks.length} tracks.`;
        progress.value = progress.max;
        
    } catch (err) {
        status.innerText = `Error during preview: ${err.message}`;
    } finally {
        setButtonsDisabled(false); // always re-enable buttons, even if there was an error
    }
});

// Export flow - the main event! this processes ALL files and saves to JSON
exportBtn.addEventListener('click', async () => {
    // hide preview stuff since we're doing the real deal now
    previewContainer.classList.add('hidden');
    tableBody.innerHTML = '';
    setButtonsDisabled(true);
    status.innerText = 'Starting export…';
    progress.value = 0;
    logOutput.textContent = '';
    logContainer.style.display = 'block'; // show log window so user can see what's happening

    try {
        // Get all file paths for export
        // using a big number to get all files instead of just a sample
        const filePaths = await ipcRenderer.invoke('select-directory', 1000000); // Large number to get all
        if (filePaths.length === 0) {
            status.innerText = 'No files selected or directory empty.';
            logContainer.style.display = 'none';
            return;
        }
        
        // Parse all metadata via IPC - this is where the progress bar really matters
        const tracks = await parseTracks(filePaths);
        
        // Save to JSON file
        const outputDir = settings.outputDir;
        const res = await ipcRenderer.invoke('export-library', outputDir, tracks);
        if (res.canceled) {
            status.innerText = 'Export canceled.';
            logContainer.style.display = 'none';
        } else {
            status.innerText = `Saved to: ${res.savedTo}`;
            progress.value = progress.max;
        }
        
    } catch (err) {
        status.innerText = `Error: ${err.message}`;
    } finally {
        setButtonsDisabled(false); // always re-enable buttons
    }
});

// Load settings on page load
// this runs when the app first starts up
loadSettings();

// Dynamically set navbar icon src to data URL
// we have to do this because the icon path is different in dev vs packaged app
// and also because we want to embed it as base64 to avoid path issues
(async function setNavbarIcon() {
  const dataUrl = await ipcRenderer.invoke('get-navbar-icon-dataurl');
  const img = document.querySelector('nav img[src*="icon-navbar"]');
  if (img && dataUrl) {
    img.src = dataUrl;
  }
})();

// Function to open help file from renderer (for future use if needed)
// this gets called when user clicks Help > User Guide in the menu
async function openHelpFile() {
  const helpPath = await ipcRenderer.invoke('get-asset-path', 'help');
  if (helpPath) {
    require('electron').shell.openPath(helpPath);
  }
}

// listen for help file requests from the main process
ipcRenderer.on('open-help-file', openHelpFile);

// that's it! the renderer is basically just a fancy form that talks to the main process
// all the real work happens in main.js, this just handles the UI and user interactions