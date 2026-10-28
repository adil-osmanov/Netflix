const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// CSS для полного удаления системного UI YouTube из любых фреймов
const YOUTUBE_CLEAN_CSS = `
  .ytp-chrome-top,
  .ytp-show-cards-title,
  .ytp-share-button-visible,
  .ytp-watermark,
  .ytp-pause-overlay,
  .ytp-ce-element,
  .ytp-paid-content-overlay,
  .ytp-gradient-top,
  .ytp-impression-link,
  .ytp-contextmenu {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: 'hiddenInset', // Нативный светофор macOS
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#09090b',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Разрешает доступ и инъекцию CSS в iframe YouTube
    }
  });

  // Автоматическая инъекция стилей в фреймы YouTube при загрузке
  win.webContents.on('did-frame-finish-load', async () => {
    try {
      await win.webContents.insertCSS(YOUTUBE_CLEAN_CSS);
    } catch (e) {
      // Игнорируем предупреждения внутренних вызовов
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadURL('https://netflix-henna-psi.vercel.app');
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
