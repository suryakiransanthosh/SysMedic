const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const os = require('os'); // Node's built-in hardware reader
const path = require('path');

// 1. Load the secret .env file
require('dotenv').config(); 

// New PowerShell query that includes Manufacturer
const psCommand = `
    $sys = Get-CimInstance Win32_ComputerSystem;
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'";
    $gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1;
    $diskTotal = [math]::Round($disk.Size / 1GB, 0);
    $diskFree = [math]::Round($disk.FreeSpace / 1GB, 0);
    Write-Output "$($sys.Manufacturer)|$($gpu.Name)|$($diskTotal)|$($diskFree)"
`;


// --- FETCH RECENT WINDOWS SYSTEM ERRORS ---
ipcMain.on('request-system-logs', (event) => {
    // Updated to use -replace '[\\r\\n]' to safely strip newlines without quote conflicts
    const psLogCommand = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $ErrorActionPreference = 'Stop'; try { $events = Get-WinEvent -FilterHashtable @{LogName='System'; Level=2} -MaxEvents 5 -ErrorAction Stop; if ($events) { $events | ForEach-Object { $_.TimeCreated.ToString('MM-dd HH:mm') + ' - ID ' + $_.Id + ': ' + ($_.Message -replace '[\\r\\n]', ' ') } } else { Write-Output 'No recent system errors found.' } } catch { Write-Output 'PS_ERROR: ' + $_.Exception.Message }";

    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psLogCommand}"`, (error, stdout, stderr) => {
        let cleanLogs = stdout ? stdout.trim() : "No critical logs detected.";
        if (error || stderr || cleanLogs.includes("PS_ERROR:")) {
            cleanLogs = `Failed to read system logs. Reason: ${stderr || cleanLogs}`;
        }
        
        event.reply('system-logs-data', cleanLogs);
    });
});

ipcMain.on('email-support-ticket', (event, { ticketContent, manufacturer, userEmail, userPass }) => {
    const supportDirectory = {
        'Lenovo': 'support@lenovo.com',
        'Dell Inc.': 'support@dell.com',
        'HP': 'support@hp.com'
    };

    const targetEmail = supportDirectory[manufacturer] || 'general-support@sysmedic.local';

    // Use the user's account details provided from the frontend
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Or 'outlook', 'yahoo', etc.
        auth: {
            user: userEmail,
            pass: userPass 
        }
    });

    const mailOptions = {
        from: `SysMedic [${userEmail}]`,
        to: targetEmail,
        subject: `Diagnostic Report - ${os.hostname()}`,
        text: ticketContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            event.reply('email-sent-status', { success: false, error: error.message });
        } else {
            event.reply('email-sent-status', { success: true });
        }
    });
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,  // SECURED: Frontend cannot run Node
            contextIsolation: true,  // SECURED: Protects against XSS attacks
            preload: path.join(__dirname, 'preload.js'), // Loads the bridge
            additionalArguments: [`--api-key=${process.env.GEMINI_API_KEY}`]
        }
    });
    win.removeMenu();
    win.loadFile('index.html');

    win.webContents.openDevTools();
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

// --- STAGE 1: REAL VIRTUAL MACHINE FIXES ---
ipcMain.on('start-stage-1', (event) => {
    console.log("Starting real Stage 1 fixes on VM...");
    const { exec } = require('child_process');

    // Step 1
    event.reply('stage-1-progress', 'Flushing DNS Cache...');
    exec('powershell.exe -NoProfile -Command "ipconfig /flushdns"', (err1) => {
        if (err1) console.log("DNS Flush failed:", err1);

        // Step 2
        event.reply('stage-1-progress', 'Resetting Network Sockets...');
        exec('powershell.exe -NoProfile -Command "netsh winsock reset"', (err2) => {
            if (err2) console.log("Winsock reset failed:", err2);

            // Step 3
            event.reply('stage-1-progress', 'Restarting Windows Audio Service...');
            exec('powershell.exe -NoProfile -Command "Restart-Service Audiosrv -Force"', (err3) => {
                if (err3) console.log("Audio service restart failed:", err3);

                // All done! Safely move to Stage 2
                console.log("Stage 1 completed.");
                event.reply('stage-1-complete');
            });
        });
    });
});

// --- STAGE 2: REAL VIRUS SCAN ---
ipcMain.on('start-stage-2-scan', (event) => {
    console.log("Starting real Stage 2 Defender Scan on VM...");

    // The real PowerShell command
    const psCommand = `
        Start-MpScan -ScanType QuickScan; 
        $threat = Get-MpThreat | Select-Object -First 1; 
        if ($threat) { 
            Write-Output "$($threat.ThreatName)|$($threat.Resources)" 
        } else { 
            Write-Output "CLEAN" 
        }
    `;
    
    // Increased buffer and added execution bypass for safety
    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, 
        { maxBuffer: 1024 * 1024 * 10 }, 
        (error, stdout, stderr) => {
            
            if (error && !stdout) {
                console.log("Scan execution error:", error);
                event.reply('threat-detected', { 
                    threatName: 'Scan Engine Error', 
                    threatLocation: 'Windows Defender Service' 
                });
                return;
            }

            const result = stdout ? stdout.trim() : "CLEAN";
            
            if (result !== "CLEAN" && result !== "") {
                const parts = result.split('|');
                event.reply('threat-detected', { 
                    threatName: parts[0] || 'Unknown Threat', 
                    threatLocation: parts[1] || 'Unknown location' 
                });
            } else {
                console.log("Scan completely clean.");
                event.reply('scan-2-clean');
            }
    });
});

// --- STAGE 2: REAL RESOLVE THREAT ---
ipcMain.on('resolve-threat', (event) => {
    console.log("Starting real threat removal on VM...");
    
    exec('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Remove-MpThreat"', 
        (error, stdout, stderr) => {
            if (error) {
                console.log("Warning: Could not remove threat automatically:", error);
            } else {
                console.log("Threat neutralized.");
            }
            
            // Notice we removed the { success: true } payload because our secure 
            // window.electronAPI.onThreatResolved wrapper no longer expects it!
            event.reply('threat-resolved'); 
    });
});
// --- STAGE 3: REAL OS UPDATES CHECK ---
ipcMain.on('start-stage-3-scan', (event) => {
    console.log("Starting real Stage 3 Update check on VM...");

    const psSearch = `
        $Session = New-Object -ComObject Microsoft.Update.Session; 
        $Searcher = $Session.CreateUpdateSearcher(); 
        $Result = $Searcher.Search("IsInstalled=0 and Type='Software'"); 
        $updates = @(); 
        foreach ($update in $Result.Updates) { 
            # Note: Changed 'name' to 'title' to perfectly match your frontend HTML
            $updates += @{ id = $update.Identity.UpdateID; title = $update.Title } 
        }; 
        Write-Output ($updates | ConvertTo-Json -Compress -Depth 2)
    `;

    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psSearch}"`, 
        { maxBuffer: 1024 * 1024 * 10 }, 
        (error, stdout, stderr) => {
            if (error) {
                console.log("Update Check Error:", error);
                return event.reply('updates-resolved'); // Failsafe skip
            }

            try {
                if (!stdout.trim()) {
                    console.log("No updates found.");
                    return event.reply('updates-resolved');
                }
                
                const parsedUpdates = JSON.parse(stdout.trim());
                const updatesArray = Array.isArray(parsedUpdates) ? parsedUpdates : [parsedUpdates];
                
                if (updatesArray.length > 0) {
                    // Send the raw array directly to match your frontend logic!
                    event.reply('updates-found', updatesArray);
                } else {
                    event.reply('updates-resolved');
                }
            } catch (e) {
                console.error("Failed to parse updates array", e);
                event.reply('updates-resolved'); // Failsafe skip
            }
    });
});

// --- STAGE 3: REAL INSTALL UPDATES ---
ipcMain.on('resolve-updates', (event, selectedUpdateIds) => {
    console.log("Installing specific updates on VM: ", selectedUpdateIds);
    
    const idsString = selectedUpdateIds.join(',');
    
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

    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psInstall}"`, 
        { maxBuffer: 1024 * 1024 * 10 }, 
        (error, stdout, stderr) => {
            console.log("Update Installation Result:", stdout);
            
            // Notice we removed { success: true } because our secure bridge
            // window.electronAPI.onUpdatesResolved no longer expects it!
            event.reply('updates-resolved'); 
    });
});

ipcMain.on('request-pc-info', (event) => {
    // 1. Basic Node.js info
    const ramSize = (os.totalmem() / (1024 ** 3)).toFixed(0) + " GB";
    const cores = os.cpus().length + " Threads";
    const platformName = `${os.type()} ${os.release()}`; 

    // 2. Safely formatted, single-line PowerShell command
    const psCommand = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $sys = Get-CimInstance Win32_ComputerSystem; $disk = Get-CimInstance Win32_LogicalDisk -Filter 'DeviceID=''C:'''; $gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1; Write-Output ($sys.Manufacturer + '|' + $gpu.Name + '|' + [math]::Round($disk.Size/1GB,0) + '|' + [math]::Round($disk.FreeSpace/1GB,0))";

    // 3. Added -ExecutionPolicy Bypass to prevent Windows from blocking the script
    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, (error, stdout, stderr) => {
        if (error) {
            console.error("SysMedic Background Error:", stderr || error.message);
        }

        const parts = (stdout || "").trim().split('|');
        
        // Grab the manufacturer, fallback to generic if it fails
        const manufacturer = parts[0] ? parts[0].trim() : "Unknown Manufacturer";
        const gpuName = parts[1] ? parts[1].trim() : "Integrated Graphics";
        const ssdTotal = parts[2] ? parts[2].trim() + " GB" : "Detecting...";
        const ssdUsed = parts[2] ? (parseInt(parts[2]) - parseInt(parts[3] || 0)) : 0;

        // Note for IPv4: Node 18+ sometimes returns the number 4 instead of the string 'IPv4'
        const ipAddress = Object.values(os.networkInterfaces())
            .flat()
            .find(i => (i.family === 'IPv4' || i.family === 4) && !i.internal)?.address || "Offline";

        const info = {
            manufacturer: manufacturer,
            model: os.hostname(),
            serial: "SYS-" + os.hostname().split('-').pop(), 
            processor: os.cpus()[0].model,
            cores: cores,
            arch: os.arch(),
            platform: platformName,
            ram: ramSize,
            gpu: gpuName,
            vram: "Shared",
            ssd: ssdTotal,
            ssdUsed: ssdUsed,
            ip: ipAddress,
            uptime: (os.uptime() / 3600).toFixed(1) + " hours"
        };
        event.reply('pc-info-data', info);
    });
});