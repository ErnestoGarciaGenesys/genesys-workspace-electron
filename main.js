DEV = (typeof process.env.NODE_ENV !== 'undefined') && (process.env.NODE_ENV.trim() == 'development')

console.info(
  'process.env.NODE_ENV="' + process.env.NODE_ENV + '", ' + 
  'development mode is ' + DEV)

const electron = require('electron')
const {app, BrowserWindow} = electron

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

// Required for showing notifications on Windows 10
app.setAppUserModelId(DEV ? process.execPath : 'com.genesys.workspace-electron')

console.info("Process executing " + process.execPath)

// Info on embedding existing webapps into Electron:
// https://slack.engineering/interops-labyrinth-sharing-code-between-web-electron-apps-f9474d62eccc

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: "icons/agent.png",

    webPreferences: {
      preload: require('path').join(__dirname, 'preload.js'),
      nodeIntegration: DEV,
      // contextIsolation: true,
    }
  })

  mainWindow.setMenuBarVisibility(DEV)

  if (DEV)
    mainWindow.webContents.openDevTools()

  mainWindow.loadURL('https://gwa-use1.genesyscloud.com/ui/wwe/index.html')

  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

function createTray() {
  tray = new electron.Tray("icons/agent16.png")

  app.on('quit', function() {
    tray.destroy();
  });

  return tray
}

app.on('ready', () => {
  global.tray = createTray()
  createWindow()
})

app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
