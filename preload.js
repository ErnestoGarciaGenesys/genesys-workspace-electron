console.debug("Executing preload.js...")
console.debug("This is the electron version" + process.versions.electron)
DEV = (process.env.NODE_ENV.trim() == 'development')

window.interop = {
  testing: "Testing 1-2-3",
}

electron = require('electron')

lastNotification = null

function setupTray() {
  tray = electron.remote.getGlobal('tray')
  tray.on('click', () => tray.popUpContextMenu())
}

function notifyOnAgentStateChanges() {
  genesys.wwe.agent.on("change:state", function () {
    console.debug("Agent change:state")

    if (lastNotification)
      lastNotification.close()

    currentState = genesys.wwe.agent.get("state")

    lastNotification = new Notification(
      currentState.get("displayName"),
      {
        body: "Agent state changed",
        silent: true,
      });
  });
}

function onWorkspaceReady() {
  setupTray()
  notifyOnAgentStateChanges()
}

function loopUntilWorkspaceReady() {
  var timer = setInterval(() => {
    if (window.genesys &&
        genesys.wwe &&
        genesys.wwe.agent &&
        genesys.wwe.agent.on) {
      try {
        console.debug('Workspace is ready')
        onWorkspaceReady()
      } finally {
        clearInterval(timer)
      }
    }
  }, 200)
}

// Workspace' beforeunload listener is blocked by Chromium,
// and this causes the window not to close nor reload.
// Chromium shows the following console error:
// [Intervention] Blocked attempt to show a 'beforeunload' confirmation panel for a frame that never had a user gesture since its load. https://www.chromestatus.com/feature/5082396709879808
function loopForRemovingBeforeUnload() {
  var timer = setInterval(() => {
    if (window.Backbone &&
        Backbone.$._data(window, 'events') &&
        Backbone.$._data(window, 'events').beforeunload &&
        Backbone.$._data(window, 'events').beforeunload.length > 0) {
      try {
        console.debug('Removing window beforeunload listener')
        Backbone.$(window).off('beforeunload')
      } finally {
        clearInterval(timer)
      }
    }
  }, 200)
}

process.once('loaded', () => {
  loopUntilWorkspaceReady()
  loopForRemovingBeforeUnload()
})
