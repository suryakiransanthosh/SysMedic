const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const os = require('os'); // Node's built-in hardware reader

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false 
        }
    });
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

// ==========================================
// DEV B: THE VITALS ENGINE (Dashboard Logic)
// ==========================================

function getCpuUsage() {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    for (let cpu in cpus) {
        user += cpus[cpu].times.user;
        nice += cpus[cpu].times.nice;
        sys += cpus[cpu].times.sys;
        idle += cpus[cpu].times.idle;
        irq += cpus[cpu].times.irq;
    }
    const total = user + nice + sys + idle + irq;
    return { idle, total };
}

let startMeasure = getCpuUsage();

// Listen for the UI asking for vitals
ipcMain.on('request-vitals', (event) => {
    // 1. Calculate Real RAM
    const totalRamGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const freeRamGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
    const usedRamGB = (totalRamGB - freeRamGB).toFixed(1);
    const ramString = `${usedRamGB} / ${totalRamGB} GB`;

    // 2. Calculate Real CPU Load
    const endMeasure = getCpuUsage();
    const idleDifference = endMeasure.idle - startMeasure.idle;
    const totalDifference = endMeasure.total - startMeasure.total;
    const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
    startMeasure = endMeasure; // reset for next time
    const cpuString = `${percentageCPU}%`;

    // 3. Mock Temp Files
    const mockTempGB = (Math.random() * (3.5 - 1.2) + 1.2).toFixed(1) + " GB";

    // Send the real data back to Dev A's UI!
    event.reply('vitals-update', {
        cpu: cpuString,
        ram: ramString,
        temp: mockTempGB
    });
});

// ==========================================
// DEV B: THE SAFE BACKEND (Scanner Logic)
// ==========================================

// --- STAGE 1: Basic Fix ---
ipcMain.on('start-stage-1', (event) => {
    setTimeout(() => {
        event.reply('stage-1-complete', { success: true });
    }, 2000);
});

// --- STAGE 2: Virus Scan ---
ipcMain.on('start-stage-2-scan', (event) => {
    setTimeout(() => {
        event.reply('threat-detected', { threatName: 'Trojan:Win32/Malware' });
    }, 2000);
});

// --- STAGE 2: Resolve Threat ---
ipcMain.on('resolve-threat', (event) => {
    setTimeout(() => {
        event.reply('threat-resolved', { success: true });
    }, 1500);
});