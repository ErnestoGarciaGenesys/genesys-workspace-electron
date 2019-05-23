console.debug('Executing preload.js...')
console.debug('Electron version is ' + process.versions.electron)

function checkAppParam(paramName, valueToCheck) {
  console.debug(`Checking application parameter "${paramName}" for value "${valueToCheck}". Actual value is "${process.env[paramName]}".`)
  return (typeof process.env[paramName] !== 'undefined') && (process.env[paramName].trim() == valueToCheck)
}

DEV = checkAppParam('NODE_ENV', 'development')
WIDGET = checkAppParam('WORKSPACE_ELECTRON_UI_MODE', 'WIDGET')

electron = require('electron')

function getActionForState(stateName) {
  switch (stateName) {
    case 'READY': return 'Ready'
    case 'NOT_READY': return 'NotReady'
    case 'NOT_READY_ACTION_CODE': return 'NotReadyReason'
    case 'NOT_READY_AFTER_CALLWORK': return 'AfterCallWork'
    case 'NOT_READY_AFTER_CALLWORK_ACTION_CODE': return 'AfterCallWorkReason'
    case 'DND_ON': return 'Dnd'
    case 'LOGOUT': return 'LogOff'
    default: return null
  }
}

function getAgentStatePosition(stateName) {
  var agentStatusActions =
    genesys.wwe.configuration.get('agent-status.enabled-actions-global') ||
    [
      'Ready',
      'NotReady',
      'NotReadyReason',
      'AfterCallWork',
      'AfterCallWorkReason',
      'Dnd',
      'LogOff',
    ];
  
  var result = agentStatusActions.indexOf(getActionForState(stateName))

  return result == -1 ?
    agentStatusActions.length :
    result
}

function getSortedAgentStates() {
  return genesys.wwe.agent.get('statesList').chain()
    .sortBy(s => s.get('displayName'))
    .sortBy(s => getAgentStatePosition(s.get('state')))
    .value()
}

function getIconCharForState(state) {
  var iconClass = state.get('iconClass')
  var iconElem = document.getElementsByClassName('state-color ' + iconClass)[0]

  if (!iconElem) return null

  var style = window.getComputedStyle(iconElem, '::before')
  var result = {
    // ::before content will contain a '"X"' string, where X is the icon character.
    // X is in the second position of the string due to the quotes contained in the string.
    char: style.content[1],
    font: style.font,
    color: style.color,
  }

  return !result.char || !result.font ?
    null :
    result;
}

function getIconDataUrlForState(state, size) {
  var icon = getIconCharForState(state)
  if (!icon) return null  

  var canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  var context = canvas.getContext('2d')
  context.font = size + 'px wwe-icons'
  context.fillStyle = icon.color
  // TODO: set size programmatically, according to Windows expected icon size
  context.fillText(icon.char, 0, size - (size / 16 * 2)); // size of text is 16px 

  return canvas.toDataURL('image/png')
}

function getNativeIconForState(state, size) {
  var iconDataUrl = getIconDataUrlForState(state, size)

  return iconDataUrl ?
    electron.remote.nativeImage.createFromDataURL(iconDataUrl) :
    'icons/agent.png';
}

function setupTray() {
  tray = electron.remote.getGlobal('tray')

  if (!WIDGET) {
    tray.on('click', () => tray.popUpContextMenu())
  }
}

function showAgentStateNotification() {
  // We could use document.hidden, for when the document is totally hidden.
  // It has been preferred to notify whenever it has no focus.
  if (!document.hasFocus()) {
    if (this.lastNotification)
      this.lastNotification.close()

    currentState = genesys.wwe.agent.get('state')

    this.lastNotification = new Notification(
      currentState.get('displayName'),
      {
        body: 'Agent state changed',
        icon: getIconDataUrlForState(currentState, 128),
        silent: true,
      });
  }
}

function updateAppIcon() {
  var currentState = genesys.wwe.agent.get('state')

  electron.remote.getCurrentWindow().setOverlayIcon(
    // 32 pixels look nice on Windows 10
    getNativeIconForState(currentState, 32),
    currentState.get('displayName')
  )
}

function updateTrayIcon() {
  var currentState = genesys.wwe.agent.get('state')

  tray.setToolTip(currentState.get('displayName'))

  // 32 pixels look nice on Windows 10
  tray.setImage(getNativeIconForState(currentState, 32))
}

function updateTrayMenu() {
  var currentState = genesys.wwe.agent.get('state')

  var menuItems = getSortedAgentStates().map(s => (
    {
      label: s.get('displayName'),
      click() { genesys.wwe.agent.changeState(s) },
      type: 'radio',
      checked: s.get('state') == currentState.get('state')
        && s.get('reason') === currentState.get('reason'),
      icon: getNativeIconForState(s, 24), // A bit bigger than 16 for easier click
    }
  ))

  tray.setContextMenu(electron.remote.Menu.buildFromTemplate(menuItems));
}

function updateThumbarButtons() {
  thumbarButtons = getSortedAgentStates()
    .filter(s => !s.get('reason'))
    .map(s => (
      {
        tooltip: s.get('displayName'),
        click() { genesys.wwe.agent.changeState(s) },
        icon: getNativeIconForState(s, 32),
      }
    ));

  var success = electron.remote.getCurrentWindow().setThumbarButtons(thumbarButtons);

  if (!success)
    console.error("Failed adding " + thumbarButtons.length + " thumbar buttons");
}

function registerShortcuts() {
  for (var accelerator of ['Super+Alt+Up', 'Super+Alt+Down']) {
    electron.remote.globalShortcut.unregister(accelerator)

    registered = electron.remote.globalShortcut.register(accelerator, tray.popUpContextMenu)
  
    if (!registered)
      console.warn("Shortcut not registered for " + accelerator)
  }
}

function onWorkspaceReady() {
  setupTray()
  registerShortcuts()

  genesys.wwe.agent.on('change:state', function () {
    console.debug('Handling agent stated changed to ' + 
      genesys.wwe.agent.get('state').get('displayName'))
    
    showAgentStateNotification()
    updateTrayIcon()
    updateTrayMenu()
    updateAppIcon()
    updateThumbarButtons()
  });
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
