const { contextBridge, ipcRenderer } = require('electron');

// We expose a safe dictionary of allowed functions to the frontend
contextBridge.exposeInMainWorld('electronAPI', {
    
    // 1. Safely grabbing the API key without exposing the whole 'process' object
    getApiKey: () => {
        const keyArg = process.argv.find(arg => arg.startsWith('--api-key='));
        return keyArg ? keyArg.split('=')[1] : "MISSING_KEY";
    },

    // 2. Sending commands TO the backend
    requestVitals: () => ipcRenderer.send('request-vitals'),
    requestPcInfo: () => ipcRenderer.send('request-pc-info'),
    requestSystemLogs: () => ipcRenderer.send('request-system-logs'),
    
    startStage1: () => ipcRenderer.send('start-stage-1'),
    startStage2Scan: () => ipcRenderer.send('start-stage-2-scan'),
    resolveThreat: () => ipcRenderer.send('resolve-threat'),
    startStage3Scan: () => ipcRenderer.send('start-stage-3-scan'),
    resolveUpdates: (selectedIds) => ipcRenderer.send('resolve-updates', selectedIds),

    // 3. Receiving data FROM the backend
    onVitalsUpdate: (callback) => ipcRenderer.on('vitals-update', (event, data) => callback(data)),
    onPcInfoData: (callback) => ipcRenderer.on('pc-info-data', (event, data) => callback(data)),
    onSystemLogsData: (callback) => ipcRenderer.on('system-logs-data', (event, logs) => callback(logs)),
    
    onStage1Progress: (callback) => ipcRenderer.on('stage-1-progress', (event, text) => callback(text)),
    onStage1Complete: (callback) => ipcRenderer.on('stage-1-complete', () => callback()),
    onThreatDetected: (callback) => ipcRenderer.on('threat-detected', (event, data) => callback(data)),
    onScan2Clean: (callback) => ipcRenderer.on('scan-2-clean', () => callback()),
    onThreatResolved: (callback) => ipcRenderer.on('threat-resolved', () => callback()),
    onUpdatesFound: (callback) => ipcRenderer.on('updates-found', (event, data) => callback(data)),
    onUpdatesResolved: (callback) => ipcRenderer.on('updates-resolved', () => callback())
});