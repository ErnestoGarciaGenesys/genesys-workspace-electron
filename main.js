function checkAppParam(paramName, valueToCheck) {
  console.debug(`Checking application parameter "${paramName}" for value "${valueToCheck}". Actual value is "${process.env[paramName]}".`)
  return (typeof process.env[paramName] !== 'undefined') && (process.env[paramName].trim() == valueToCheck)
}

DEV = checkAppParam('NODE_ENV', 'development')
WIDGET = checkAppParam('WORKSPACE_ELECTRON_UI_MODE', 'WIDGET')

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
  // Alternatives for app options:
  // - Command line switch: app.commandLine.hasSwitch(switch), app.commandLine.getSwitchValue(switch)
  // - Environment.
  // - package.json
  // Any of those.
  
  if (WIDGET) {
    width = 400
    if (DEV) width += 600
    height = 600

    mainWindow = new BrowserWindow({
      width: width,
      x: electron.screen.getPrimaryDisplay().bounds.width - width - 40,
      height: height,
      y: electron.screen.getPrimaryDisplay().bounds.height - height - 40,
      // frame: false,
      alwaysOnTop: true,
      maximizable: false,
      fullscreenable: false,

      icon: "icons/agent.png",

      show: false,
  
      webPreferences: {
        preload: require('path').join(__dirname, 'preload.js'),
        nodeIntegration: DEV,
  
        // This is needed for preload.js callbacks to work propertly.
        // But it is recommended to be true for security purposes!!!
        contextIsolation: false, 
      }
    })

    // mainWindow.loadFile('widget/workspace-widget.html')
    mainWindow.loadURL('http://genprim.com/my/workspace-widget.html')
  }
  else {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      icon: "icons/agent.png",
      show: false,
  
      webPreferences: {
        preload: require('path').join(__dirname, 'preload.js'),
        nodeIntegration: DEV,
  
        // This is needed for preload.js callbacks to work propertly.
        // But it is recommended to be true for security purposes!!!
        contextIsolation: false, 
      }
    })

    mainWindow.loadURL('https://gwa-use1.genesyscloud.com/ui/wwe/index.html')
  }

  mainWindow.setMenuBarVisibility(DEV)

  if (DEV)
    mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  mainWindow.show()
}

function createTray() {
  tray = new electron.Tray("icons/agent16.png")

  if (WIDGET) {
    tray.on('click', () => {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
    })
  }

  app.on('quit', function() {
    tray.destroy();
  });

  return tray
}

app.on('ready', () => {
  global.tray = createTray()
  createWindow()
})

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, argv, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()      
      mainWindow.focus()
    }
  })
}

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
