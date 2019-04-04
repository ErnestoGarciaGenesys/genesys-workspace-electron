# PureEngage Workspace Web on Electron

## Features

### Tray icon

The tray icon displayed depends on current state, and has a contextual menu with actions. The state icon is rendered dynamically, based on the actual icon shown by Workspace Web.

### Windows Thumbnail Toolbar buttons

Buttons for changing state are also shown in the Windows Thumbnail Toolbar.

### Taskbar application icon with state overlay

An icon overlay is shown with current state. (The same as the tray icon).

### Shortcuts

Global shortcuts 'Windows + Alt + Up Arrow' and 'Windows + Alt + Down Arrow' will pop up the tray contextual menu for easy access to frequent actions.

### Notifications

Notifications are shown when state changes while the main window is not in focus.

Currently, the standard Web Notifications API is used. It would be possible to use existing wrapper libraries for closer integration with native desktop notification APIs.

### Installation package

Generating an installation package is configured through [electron-builder](https://www.electron.build/).

## Others

Menu bar is hidden, but it could potentially be used for application actions.

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Install dependencies
npm install
# Run the app
npm start
# Run the app in development mode
npm run dev
# Package app in distributable format
npm run dist
```

When enabled, development mode:
- Enables default menu bar, useful for reloads.
- Opens Developer Tools automatically from start.
- Enables BrowserWindow nodeIntegration. This enables testing native features from the developer console easily.
