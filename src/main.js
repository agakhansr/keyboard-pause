const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const appIcon = path.join(__dirname, 'assets', 'keyboard.png');

function logStartupError(error) {
  const message = error && error.stack ? error.stack : String(error);
  try {
    const logDir = app?.isReady() ? app.getPath('userData') : path.join(__dirname, '..');
    fs.appendFileSync(path.join(logDir, 'startup-error.log'), `[${new Date().toISOString()}]\n${message}\n\n`);
  } catch {
    // Nothing useful to do if logging itself fails during startup.
  }
}

process.on('uncaughtException', logStartupError);
process.on('unhandledRejection', logStartupError);

let mainWindow;
let helper;
let helperBuffer = '';
let lastStatus = {
  keyboardBlocked: false,
  pointerBlocked: false,
  helperReady: false,
  error: null
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 620,
    minWidth: 760,
    minHeight: 520,
    title: 'Keyboard Cleaner',
    icon: appIcon,
    backgroundColor: '#f7f8fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function startHelper() {
  const helperPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'native', 'InputLock.ps1')
    : path.join(__dirname, '..', 'native', 'InputLock.ps1');

  helper = spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    helperPath
  ], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    helperBuffer += chunk;
    const lines = helperBuffer.split(/\r?\n/);
    helperBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        handleHelperMessage(message);
      } catch {
        sendStatus({ error: `Unexpected helper output: ${line}` });
      }
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    const message = chunk.trim();
    if (message) sendStatus({ error: message });
  });

  helper.on('exit', (code) => {
    helper = null;
    sendStatus({
      keyboardBlocked: false,
      pointerBlocked: false,
      helperReady: false,
      error: code === 0 ? null : `Input helper exited with code ${code}`
    });
  });
}

function handleHelperMessage(message) {
  if (message.type === 'ready') {
    sendStatus({ helperReady: true, error: null });
    sendCommand('status');
    return;
  }

  if (message.type === 'status') {
    sendStatus({
      keyboardBlocked: Boolean(message.keyboardBlocked),
      pointerBlocked: Boolean(message.pointerBlocked),
      error: null
    });
    return;
  }

  if (message.type === 'shortcut-unlocked') {
    sendStatus({
      keyboardBlocked: false,
      pointerBlocked: false,
      error: null
    });
    mainWindow?.webContents.send('lock:shortcutUnlocked');
  }

  if (message.type === 'error') {
    sendStatus({ error: message.message || 'Unknown helper error' });
  }
}

function sendStatus(partial) {
  lastStatus = { ...lastStatus, ...partial };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('lock:status', lastStatus);
  }
}

function sendCommand(command) {
  if (!helper || !helper.stdin.writable) {
    sendStatus({ error: 'Input helper is not running.' });
    return false;
  }

  helper.stdin.write(`${command}\n`);
  return true;
}

app.whenReady().then(() => {
  app.setAppUserModelId('keyboard-cleaner');
  createWindow();
  startHelper();

  globalShortcut.register('CommandOrControl+Alt+U', () => {
    sendCommand('unlock-all');
  });

  if (process.env.KEYBOARD_CLEANER_SMOKE === '1') {
    setTimeout(() => app.quit(), 1500);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle('lock:getStatus', () => lastStatus);

ipcMain.handle('lock:setKeyboard', (_event, enabled) => {
  sendCommand(enabled ? 'keyboard on' : 'keyboard off');
});

ipcMain.handle('lock:setPointer', (_event, enabled) => {
  sendCommand(enabled ? 'pointer on' : 'pointer off');
});

ipcMain.handle('lock:unlockAll', () => {
  sendCommand('unlock-all');
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  if (helper && helper.stdin.writable) {
    helper.stdin.write('unlock-all\nquit\n');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
