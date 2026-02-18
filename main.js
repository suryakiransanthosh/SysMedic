const { app, BrowserWindow } = require('electron');
const path = require('path');

// 1. Load the secret .env file
require('dotenv').config(); 

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // 2. Pass the key securely to the frontend
            additionalArguments: [`--api-key=${process.env.GEMINI_API_KEY}`] 
        }
    });

    win.loadFile('index.html');
    
    // Optional: Hide menu bar if you want a cleaner look
    // win.setMenuBarVisibility(false); 
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});