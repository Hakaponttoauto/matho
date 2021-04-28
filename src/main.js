// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, nativeTheme} = require('electron')
const path = require('path');
const fs = require('fs');
const userDataPath = app.getPath('userData');


function set(setting,value) {
   let data={};
   try {
      data = JSON.parse(fs.readFileSync(path.join(userDataPath,'settings.json'), 'utf8'));
   } catch {
      //GUESS WHAT I AM GOING TO DO TO THIS ERROR? NOTHING, SUCKER!
   }
   data[setting]=value;
   fs.writeFileSync(path.join(userDataPath,'settings.json'), JSON.stringify(data), (err) => {
       // throws an error, you could also catch it here
       if (err) throw err;
   });
}

function get(setting) {
   try {
      let data = JSON.parse(fs.readFileSync(path.join(userDataPath,'settings.json'), 'utf8'));
      if (setting in data) {
         return data[setting]
      } else {
         return false
      }
   } catch {
      fs.writeFileSync(path.join(userDataPath,'settings.json'), "{}", (err) => {
         if (err) throw err;
      });
      return false
   }
}

function createWindow() {
   // Create the browser window.
   const mainWindow = new BrowserWindow({
      width: 400,
      height: 600,
      webPreferences: {
         preload: path.join(__dirname, 'preload.js'),
         nodeIntegration: true,
         contextIsolation: false,
         enableRemoteModule: true,
         show: false,
      }
   })

   // and load the index.html of the app.
   mainWindow.loadFile('src/app/index.html');
   mainWindow.setIcon(path.join(__dirname, '/icon.png'));

   mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.setAlwaysOnTop(get("alwaysontop"));
      if (get("lightmode")) {
         mainWindow.webContents.send('command', 'light');
         nativeTheme.themeSource = "light";
      } else {
         mainWindow.webContents.send('command', 'dark');
         nativeTheme.themeSource = "dark";
      }
   })

   // Open the DevTools.
   // mainWindow.webContents.openDevTools()
}

function createDisplay() {
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
            accelerator: "CmdOrCtrl+N",
            click: (item, mainWindow) => {
               mainWindow.webContents.send('command', 'clear');
            }
         },
         {
            label: 'Avaa',
            accelerator: "CmdOrCtrl+O",
            click: (item, mainWindow) => {
               mainWindow.webContents.send('command', 'load');
            }
         },
         {
            label: 'Tallenna',
            accelerator: "CmdOrCtrl+S",
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
            accelerator: "CmdOrCtrl+P",
            click: (item, mainWindow) => {
               mainWindow.webContents.send('command', 'save');
               createDisplay();
            }
         },
         {
            role: 'resetzoom'
         },
         {
            role: 'zoomin'
         },
         {
            role: 'zoomout'
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
            checked: get("alwaysontop"),
            click: (item, mainWindow) => {
               mainWindow.setAlwaysOnTop(item.checked);
               set("alwaysontop",item.checked);
            }

         },
         {
            label: 'Vaalea teema',
            type: 'checkbox',
            checked: get("lightmode"),
            click: (item, mainWindow) => {
               if (item.checked) {
                  mainWindow.webContents.send('command', 'light');
                  nativeTheme.themeSource = "light";
               } else {
                  mainWindow.webContents.send('command', 'dark');
                  nativeTheme.themeSource = "dark";
               }
               set("lightmode",item.checked);
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