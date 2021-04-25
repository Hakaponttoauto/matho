// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, MenuItem} = require('electron')
const path = require('path')

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('src/app/index.html');
  mainWindow.setIcon(path.join(__dirname, '/icon.png'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

function createDisplay () {
   // Create the browser window.
   const displayWindow = new BrowserWindow({
     width: 500,
     height: 600,
     webPreferences: {
       preload: path.join(__dirname, 'preload.js'),
       nodeIntegration: true,
       contextIsolation: false,
       enableRemoteModule: true,
     }
   })
 
   // and load the index.html of the app.
   displayWindow.loadFile('src/app/display.html');
   displayWindow.removeMenu();
   displayWindow.setIcon(path.join(__dirname, '/icon.png'));
}

const template = [
  {
    label: 'Istunto',
    submenu: [
       {
          label: 'Tyhjennä',
          click: (item, mainWindow) => {
            mainWindow.webContents.send('command', 'clear');
          }
       },
       {
          label: 'Avaa',
          click: (item, mainWindow) => {
            mainWindow.webContents.send('command', 'load');
          }
       },
       {
         label: 'Tallenna',
         click: (item, mainWindow) => {
            mainWindow.webContents.send('command', 'save');
          }
      }
    ]
  },
  {
     label: 'Muokkaa',
     submenu: [
        {
           role: 'undo'
        },
        {
           role: 'redo'
        },
        {
           type: 'separator'
        },
        {
           role: 'cut'
        },
        {
           role: 'copy'
        },
        {
           role: 'paste'
        }
     ]
  },
  {
    label: 'Näytä',
    submenu: [
      {
         label: "Esikatsele tallennusta",
         click: (item, mainWindow) => {
            mainWindow.webContents.send('command', 'save');
            createDisplay();
          }
      },
       {
          role: 'reload'
       },
       {
          role: 'toggledevtools'
       }
    ]
 },
  {
      label: 'Ikkuna',
     role: 'window',
     submenu: [
         {
            label: 'Pidä päällimmäisenä',
            type: 'checkbox',
            click: (item, mainWindow) => {
               mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop()); 
            }

         },
        {
           role: 'minimize'
        },
        {
           role: 'close'
        }
     ]
  }
]

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)