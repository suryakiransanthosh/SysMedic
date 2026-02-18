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
    win.removeMenu();
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

ipcMain.on('request-vitals', (event) => {
    // RAM
    const totalRamGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const freeRamGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
    const usedRamGB = (totalRamGB - freeRamGB).toFixed(1);
    const ramString = `${usedRamGB} / ${totalRamGB} GB`;

    // CPU
    const endMeasure = getCpuUsage();
    const idleDifference = endMeasure.idle - startMeasure.idle;
    const totalDifference = endMeasure.total - startMeasure.total;
    const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
    startMeasure = endMeasure; 
    const cpuString = `${percentageCPU}%`;

    // Temp
    const mockTempGB = (Math.random() * (3.5 - 1.2) + 1.2).toFixed(1) + " GB";

    event.reply('vitals-update', { cpu: cpuString, ram: ramString, temp: mockTempGB });
});

// ==========================================
// DEV B: THE SCANNER ENGINE 
// (Real commands commented out for PC safety. Uncomment in VM.)
// ==========================================

// --- STAGE 1: Basic Command Fixes ---
ipcMain.on('start-stage-1', (event) => {
    console.log("Backend received: Starting Stage 1 multi-step fixes...");

    /* ⚠️ DANGER ZONE ⚠️
    // A single PowerShell script that chains multiple fixes together.
    const psStage1 = `
        ipconfig /flushdns | Out-Null;
        netsh winsock reset | Out-Null;
        Restart-Service Audiosrv -Force;
    `;
    exec(\`powershell.exe -Command "\${psStage1}"\`, (error, stdout) => {
        // In a real VM, this entire block would run and then trigger 'complete'
        event.reply('stage-1-complete', { success: true });
    });
    */

    // 🟢 SAFE DEV MODE (Active) - Simulating real-time progress updates!
    event.reply('stage-1-progress', 'Flushing DNS Cache...');

    setTimeout(() => {
        event.reply('stage-1-progress', 'Resetting Network Sockets...');
    }, 1500);

    setTimeout(() => {
        event.reply('stage-1-progress', 'Restarting Windows Audio Service...');
    }, 3000);

    setTimeout(() => {
        event.reply('stage-1-complete', { success: true });
    }, 4500);
});
// --- STAGE 2: Virus Scan ---
ipcMain.on('start-stage-2-scan', (event) => {
    /* ⚠️ DANGER ZONE ⚠️
    // Updated PowerShell to grab both the Name and the Location (Resources), separated by a "|"
    const psCommand = `
        Start-MpScan -ScanType QuickScan; 
        $threat = Get-MpThreat | Select-Object -First 1; 
        if ($threat) { 
            Write-Output "$($threat.ThreatName)|$($threat.Resources)" 
        } else { 
            Write-Output "CLEAN" 
        }
    `;
    
    exec(`powershell.exe -Command "${psCommand}"`, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
        const result = stdout.trim();
        if (result !== "CLEAN" && result !== "") {
            // Split the output into [Name, Location]
            const parts = result.split('|');
            event.reply('threat-detected', { 
                threatName: parts[0], 
                threatLocation: parts[1] || 'Unknown location' 
            });
        } else {
            event.reply('scan-2-clean');
        }
    });
    */
    
    // 🟢 SAFE DEV MODE (Active)
    setTimeout(() => { 
        event.reply('threat-detected', { 
            threatName: 'Trojan:Win32/Malware',
            threatLocation: 'C:\\Users\\Admin\\Downloads\\infected_app.exe' // Fake location sent from backend!
        }); 
    }, 2000);
});

// --- STAGE 2: Resolve Threat ---
ipcMain.on('resolve-threat', (event) => {
    /* ⚠️ DANGER ZONE ⚠️
    exec('powershell.exe -Command "Remove-MpThreat"', () => {
        event.reply('threat-resolved', { success: true });
    });
    */
    setTimeout(() => { event.reply('threat-resolved', { success: true }); }, 1500);
});

// --- STAGE 3: OS Updates Check ---
ipcMain.on('start-stage-3-scan', (event) => {
    /* ⚠️ DANGER ZONE ⚠️
    // 1. Create the COM object to search for uninstalled updates.
    // 2. Format the output into a JSON array containing the UpdateID and Title.
    const psSearch = `
        $Session = New-Object -ComObject Microsoft.Update.Session; 
        $Searcher = $Session.CreateUpdateSearcher(); 
        $Result = $Searcher.Search("IsInstalled=0 and Type='Software'"); 
        $updates = @(); 
        foreach ($update in $Result.Updates) { 
            $updates += @{ id = $update.Identity.UpdateID; name = $update.Title } 
        }; 
        Write-Output ($updates | ConvertTo-Json -Compress -Depth 2)
    `;

    exec(`powershell.exe -NoProfile -Command "${psSearch}"`, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
        try {
            if (!stdout.trim()) {
                return event.reply('updates-resolved', { success: true }); // No updates found
            }
            
            const parsedUpdates = JSON.parse(stdout.trim());
            // Ensure it's an array (if PowerShell returns a single object, wrap it)
            const updatesArray = Array.isArray(parsedUpdates) ? parsedUpdates : [parsedUpdates];
            
            if (updatesArray.length > 0) {
                event.reply('updates-found', { updates: updatesArray });
            } else {
                event.reply('updates-resolved', { success: true });
            }
        } catch (e) {
            console.error("Failed to parse updates array", e);
            event.reply('updates-resolved', { success: true }); // Failsafe
        }
    });
    */
    
    // 🟢 SAFE DEV MODE (Active)
    setTimeout(() => { 
        const mockUpdatesList = [
            { id: 'KB5031455', name: 'Cumulative Update for Windows 11' },
            { id: 'INTEL-SYS', name: 'Intel - System - 2.0.1.9' },
            { id: 'KB5032541', name: 'Security Intelligence Update for Defender' }
        ];
        event.reply('updates-found', { updates: mockUpdatesList }); 
    }, 2000);
});

// --- STAGE 3: Install Specific Updates ---
ipcMain.on('resolve-updates', (event, selectedUpdateIds) => {
    console.log("Backend received command to install specific updates: ", selectedUpdateIds);
    
    /* ⚠️ DANGER ZONE ⚠️
    // Convert the JS array of IDs into a string PowerShell can use
    const idsString = selectedUpdateIds.join(',');
    
    // 1. Create an empty UpdateCollection.
    // 2. Loop through all updates. If the ID matches what the user selected, add it to the collection.
    // 3. Download and Install the collection.
    const psInstall = `
        $TargetIDs = '${idsString}' -split ','; 
        $Session = New-Object -ComObject Microsoft.Update.Session; 
        $Searcher = $Session.CreateUpdateSearcher(); 
        $Result = $Searcher.Search("IsInstalled=0"); 
        $ToInstall = New-Object -ComObject Microsoft.Update.UpdateColl; 
        foreach ($upd in $Result.Updates) { 
            if ($TargetIDs -contains $upd.Identity.UpdateID) { 
                $ToInstall.Add($upd) | Out-Null 
            } 
        }; 
        if ($ToInstall.Count -gt 0) { 
            $Downloader = $Session.CreateUpdateDownloader(); 
            $Downloader.Updates = $ToInstall; 
            $Downloader.Download(); 
            $Installer = $Session.CreateUpdateInstaller(); 
            $Installer.Updates = $ToInstall; 
            $Installer.Install() 
        }; 
        Write-Output 'DONE'
    `;

    // Note: Actual Windows Updates can take 10+ minutes to download and install.
    exec(`powershell.exe -NoProfile -Command "${psInstall}"`, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
        console.log("Update Installation Result:", stdout);
        event.reply('updates-resolved', { success: true });
    });
    */
    
    // 🟢 SAFE DEV MODE (Active)
    setTimeout(() => { event.reply('updates-resolved', { success: true }); }, 2500);
});