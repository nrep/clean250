const { app, BrowserWindow, ipcMain, dialog, Menu, session, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const http = require('http');
const crypto = require('crypto');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

let mainWindow;
let tray = null; // Add tray reference

// Define preloadPath
const preloadPath = path.join(__dirname, 'preload.js');

// Store file hashes for duplicate detection
const fileHashes = new Map();
// Store potential duplicates
const potentialDuplicates = new Map();

// Function to check if dev server is running
function checkDevServer(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    
    const req = http.get({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/',
      timeout: 1000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Create system tray
function createTray() {
  // Use app icon for the tray
  const iconPath = path.join(__dirname, process.platform === 'darwin' ? 'logo192.png' : 'favicon.ico');
  let trayIcon;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch (error) {
    console.error('Error creating tray icon:', error);
    // Fallback to a smaller icon if needed
    trayIcon = nativeImage.createFromPath(path.join(__dirname, 'favicon.ico'));
  }
  
  // Optimize icon size for different platforms
  if (process.platform === 'darwin') {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Clean250 Storage Optimizer');
  
  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Clean250', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      }
    },
    { 
      label: 'Run Quick Scan', 
      click: () => {
        // Send message to renderer to trigger scan
        if (mainWindow) {
          mainWindow.webContents.send('run-quick-scan');
        } else {
          createWindow();
          // Wait for window to finish loading
          mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('run-quick-scan');
          });
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // Handle click (behavior differs by platform)
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
}

// Function to load user settings
function loadUserSettings() {
  try {
    // Default settings
    const defaultSettings = {
      general: {
        startMinimized: false,
        minimizeToTray: true,
        closeToTray: true,
      }
    };
    
    // Try to load settings from localStorage
    if (typeof localStorage !== 'undefined') {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    }
    
    // If that fails, try to load settings from a file
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(settingsData);
    }
    
    return defaultSettings;
  } catch (error) {
    console.error('Error loading user settings:', error);
    return {
      general: {
        startMinimized: false,
        minimizeToTray: true,
        closeToTray: true,
      }
    };
  }
}

// Modify the createWindow function to handle minimizing to tray
function createWindow() {
  console.log('Creating main window');
  
  // Load user settings
  const settings = loadUserSettings();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      worldSafeExecuteJavaScript: true,
      // Make sure preload can access Node.js modules
      sandbox: false,
      // Add content security policy
      webSecurity: true
    },
    icon: path.join(__dirname, process.platform === 'darwin' ? 'logo512.png' : 'favicon.ico'),
    show: !settings.general.startMinimized // Only show window if not set to start minimized
  });

  // Set content security policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data:; " +
          "connect-src 'self'; " +
          "font-src 'self'; " +
          "object-src 'none'; " +
          "media-src 'self'; " +
          "child-src 'none'; "
        ]
      }
    });
  });

  // For production, comment this out
  // mainWindow.webContents.openDevTools();

  // Check if the app is running in development or production mode
  const loadApp = async () => {
    let startUrl;
    const devServerUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    
    // Check if we're in dev mode and the server is running
    if (process.env.ELECTRON_START_URL) {
      console.log('Development URL specified:', devServerUrl);
      
      // Verify that the development server is running
      const devServerRunning = await checkDevServer(devServerUrl);
      
      if (devServerRunning) {
        console.log('Development server is running, using dev server URL');
        startUrl = devServerUrl;
      } else {
        console.log('Development server is NOT running, falling back to build');
        const buildPath = path.join(__dirname, '../build/index.html');
        if (fs.existsSync(buildPath)) {
          startUrl = `file://${buildPath}`;
        } else {
          console.error('Neither dev server nor build found!');
          app.quit();
          return;
        }
      }
    } else {
      // Production mode - check if build directory exists
      const buildPath = path.join(__dirname, '../build/index.html');
      if (fs.existsSync(buildPath)) {
        startUrl = `file://${buildPath}`;
        console.log('Production mode - loading from:', startUrl);
      } else {
        // Fallback to dev server if build doesn't exist
        console.log('Production mode - build not found, checking dev server');
        const devServerRunning = await checkDevServer(devServerUrl);
        
        if (devServerRunning) {
          startUrl = devServerUrl;
          console.log('Development server is running, falling back to:', startUrl);
        } else {
          console.error('Neither build directory nor dev server found! Exiting.');
          app.quit();
          return;
        }
      }
    }
    
    console.log('Loading URL:', startUrl);
    console.log('Preload path:', path.join(__dirname, 'preload.js'));
    
    // Configure file protocol for local file loading
    if (startUrl.startsWith('file://')) {
      // Log the build directory location
      const buildDir = path.join(__dirname, '../build');
      console.log('Build directory:', buildDir);
      
      // List files in build directory for debugging
      try {
        const buildFiles = fs.readdirSync(buildDir);
        console.log('Build directory contents:', buildFiles);
        
        // Check static directory
        const staticDir = path.join(buildDir, 'static');
        if (fs.existsSync(staticDir)) {
          const staticFiles = fs.readdirSync(staticDir);
          console.log('Static directory contents:', staticFiles);
        }
      } catch (err) {
        console.error('Error listing build files:', err);
      }
    }
    
    // Add delay before loading URL to ensure dev server is ready
    setTimeout(() => {
      console.log('Attempting to load URL after delay:', startUrl);
      mainWindow.loadURL(startUrl);
    }, 1000);
  };
  
  loadApp();
  
  // Add event listener for when content has finished loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Main window content loaded successfully');
  });

  // Log any load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load URL:', errorCode, errorDescription);
    
    // If loading fails, try the alternative URL
    if (startUrl && startUrl.includes('localhost')) {
      // If dev server fails, try build
      const buildPath = path.join(__dirname, '../build/index.html');
      if (fs.existsSync(buildPath)) {
        console.log('Attempting to load from build directory...');
        mainWindow.loadURL(`file://${buildPath}`);
      }
    } else if (startUrl) {
      // If build fails, try dev server
      console.log('Attempting to load from development server...');
      mainWindow.loadURL('http://localhost:3000');
    }
  });

  // Add new window event listeners for tray functionality
  mainWindow.on('minimize', function(event) {
    // Load the latest settings
    const currentSettings = loadUserSettings();
    
    // Store user preference in app settings
    const minimizeToTray = currentSettings.general.minimizeToTray;
    
    if (minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  
  mainWindow.on('close', function(event) {
    // Load the latest settings
    const currentSettings = loadUserSettings();
    
    // Only minimize to tray if we're not quitting the app and closeToTray is enabled
    if (!app.isQuiting && currentSettings.general.closeToTray) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    
    return true;
  });
}

// Initialize both window and tray when the app is ready
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Add file preview handler
  ipcMain.handle('preview-file', async (event, filePath) => {
    console.log('Preview file request for:', filePath);
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File not found'
        };
      }
      
      // Get file stats
      const stats = await stat(filePath);
      
      // Check if it's a directory
      if (stats.isDirectory()) {
        return {
          success: false,
          error: 'Cannot preview a directory'
        };
      }
      
      // Check file size to prevent loading too large files
      const MAX_PREVIEW_SIZE = 5 * 1024 * 1024; // 5MB
      if (stats.size > MAX_PREVIEW_SIZE) {
        return {
          success: false,
          error: 'File is too large to preview (max 5MB)'
        };
      }
      
      // Determine file type based on extension
      const ext = path.extname(filePath).toLowerCase();
      
      // Handle image files - return base64 data
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
      if (imageExts.includes(ext)) {
        const data = await readFile(filePath);
        return {
          success: true,
          data: data.toString('base64'),
          type: 'image'
        };
      }
      
      // Handle text files - return text content
      const textExts = ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.htm', 
                       '.css', '.js', '.ts', '.jsx', '.tsx', '.log'];
      if (textExts.includes(ext)) {
        const data = await readFile(filePath, 'utf8');
        return {
          success: true,
          data: data,
          type: 'text'
        };
      }
      
      // For other files, just return info that preview is not supported
      return {
        success: false,
        error: 'File type not supported for preview',
        type: 'unknown'
      };
    } catch (error) {
      console.error('Error previewing file:', error);
      return {
        success: false,
        error: `Error previewing file: ${error.message}`
      };
    }
  });
  
  // Add handler for getting backups list
  ipcMain.handle('get-backups', async () => {
    try {
      const backups = await getBackupsList();
      return {
        success: true,
        data: backups
      };
    } catch (error) {
      console.error('Error handling get-backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Add handler for restoring a backup
  ipcMain.handle('restore-backup', async (event, backupId, targetPath) => {
    return await restoreBackup(backupId, targetPath);
  });
  
  // Add handler for quick-scan requests from renderer
  ipcMain.handle('quick-scan', async (event, directoryPath) => {
    // Perform quick scan with default settings
    if (!directoryPath) {
      return {
        success: false,
        error: 'No directory specified for quick scan'
      };
    }
    
    // This is a simplified version of scan-directory handler
    // In a real implementation, you would call your existing scan logic with default parameters
    try {
      const defaultConfig = {
        maxDepth: 5,
        ignoreDotFiles: true,
        includeHiddenFiles: false,
        scanSizeThreshold: 100,
        scanAgeThreshold: 180
      };
      
      return await scanDirectory(directoryPath, defaultConfig);
    } catch (error) {
      console.error('Error performing quick scan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // This ensures the app activates correctly on macOS
  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Prevent the app from closing when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit the app when all windows are closed
    // This keeps it running in the system tray
    // app.quit(); // Comment this out to keep app in tray
  }
});

// Cleanup when actually quitting
app.on('before-quit', function() {
  app.isQuiting = true;
  if (tray) {
    tray.destroy();
  }
});

// IPC handlers for file system operations
ipcMain.handle('scan-directory', async (event, directoryPath, scanConfig = {}) => {
  try {
    console.log('Scan config:', scanConfig);
    
    // Set default scan configuration
    const config = {
      maxDepth: scanConfig.maxDepth || 10,
      ignoreDotFiles: scanConfig.ignoreDotFiles !== false, // Default to true
      ignoreSizeAbove: (scanConfig.ignoreSizeAbove || 1024) * 1024 * 1024, // Convert MB to bytes
      includeHiddenFiles: !!scanConfig.includeHiddenFiles,
      scanSizeThreshold: (scanConfig.scanSizeThreshold || 100) * 1024 * 1024, // Convert MB to bytes
      scanAgeThreshold: scanConfig.scanAgeThreshold || 180 // Days
    };
    
    // Create a progress reporter
    const progressReporter = {
      totalFiles: 0,
      processedFiles: 0,
      report: () => {
        if (mainWindow) {
          mainWindow.webContents.send('scan-progress', {
            processed: progressReporter.processedFiles,
            total: progressReporter.totalFiles,
            percentage: progressReporter.totalFiles > 0 
              ? Math.round((progressReporter.processedFiles / progressReporter.totalFiles) * 100) 
              : 0
          });
        }
      }
    };
    
    // Initial count of files (rough estimate)
    try {
      progressReporter.totalFiles = await countFiles(directoryPath, config.maxDepth);
      progressReporter.report();
    } catch (error) {
      console.error('Error counting files:', error);
    }
    
    // Start the scan with progress reporting
    const results = await scanDirectory(directoryPath, progressReporter, config);
    
    // Final progress report (100%)
    progressReporter.processedFiles = progressReporter.totalFiles;
    progressReporter.report();
    
    // Analyze files in the main process to reduce renderer workload
    const analyzedResults = analyzeFiles(results, config);
    
    // Send the final batch if any files are left
    if (mainWindow && results.length > 0) {
      mainWindow.webContents.send('scan-batch', {
        files: analyzedResults,
        isDone: true
      });
    }
    
    return { success: true, data: analyzedResults };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Add function to get/create trash directory
async function getTrashDirectory() {
  const appDataPath = app.getPath('userData');
  const trashPath = path.join(appDataPath, 'trash');
  
  // Create trash directory if it doesn't exist
  if (!fs.existsSync(trashPath)) {
    await mkdir(trashPath, { recursive: true });
  }
  
  return trashPath;
}

// Add function to backup file before deletion
async function backupFile(filePath) {
  try {
    const trashPath = await getTrashDirectory();
    
    // Create a unique filename for the backup
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFileName = `${timestamp}_${fileName}`;
    const backupPath = path.join(trashPath, backupFileName);
    
    // Create metadata for the backup
    const stats = await stat(filePath);
    const metadata = {
      originalPath: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      backupDate: new Date(),
    };
    
    // Copy the file
    await copyFile(filePath, backupPath);
    
    // Save metadata
    const metadataPath = `${backupPath}.meta.json`;
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    return {
      success: true,
      backupPath
    };
  } catch (error) {
    console.error('Error backing up file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Modify the delete files handler to backup files first
ipcMain.handle('delete-files', async (event, filePaths) => {
  console.log('Delete files request for:', filePaths);
  
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return { 
      success: false, 
      data: [], 
      error: 'No files provided for deletion' 
    };
  }
  
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        results.push({
          path: filePath,
          deleted: false,
          error: 'File not found'
        });
        continue;
      }
      
      // Backup file before deletion
      const backupResult = await backupFile(filePath);
      
      if (!backupResult.success) {
        results.push({
          path: filePath,
          deleted: false,
          error: `Backup failed: ${backupResult.error}`,
          backupFailed: true
        });
        continue;
      }
      
      // Delete the file
      await unlink(filePath);
      
      results.push({
        path: filePath,
        deleted: true,
        backupPath: backupResult.backupPath
      });
    } catch (error) {
      console.error('Error deleting file:', filePath, error);
      results.push({
        path: filePath,
        deleted: false,
        error: error.message
      });
    }
  }
  
  return {
    success: results.every(r => r.deleted),
    data: results
  };
});

ipcMain.handle('select-directory', async () => {
  console.log('Select directory called');
  
  // Get common locations based on OS
  const homeDir = app.getPath('home');
  const documentsDir = app.getPath('documents');
  const downloadsDir = app.getPath('downloads');
  const desktopDir = app.getPath('desktop');
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Directory to Scan',
    defaultPath: homeDir,
    buttonLabel: 'Select Directory',
    message: 'Select a directory to scan for unnecessary files',
    // Add common locations as quick access
    bookmarks: [
      { path: homeDir, name: 'Home' },
      { path: documentsDir, name: 'Documents' },
      { path: downloadsDir, name: 'Downloads' },
      { path: desktopDir, name: 'Desktop' }
    ]
  });
  
  console.log('Dialog result:', result);
  
  if (result.canceled) {
    return { selected: false };
  }
  
  return { selected: true, path: result.filePaths[0] };
});

// Helper function to estimate file count (for progress reporting)
async function countFiles(directoryPath, maxDepth = 3, currentDepth = 0) {
  try {
    if (currentDepth > maxDepth) {
      // Use an estimate for deeper directories to avoid too much overhead
      return 10;
    }
    
    const entries = await readdir(directoryPath, { withFileTypes: true });
    let count = 0;
    
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      
      // Skip system directories
      if (entryPath.includes('node_modules') || 
          entryPath.includes('.git') ||
          entryPath.startsWith('/System') ||
          entryPath.startsWith('/Library/System')) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Recursively count files in subdirectory
        count += await countFiles(entryPath, maxDepth, currentDepth + 1);
      } else {
        count += 1;
      }
    }
    
    return count;
  } catch (error) {
    console.error(`Error counting files in ${directoryPath}:`, error);
    return 0;
  }
}

// Helper function to scan directories
async function scanDirectory(directoryPath, progressReporter = null, config = {}) {
  // Use a generator-like approach with batched processing
  const MAX_BATCH_SIZE = 500; // Process files in batches of 500
  const pendingDirectories = [directoryPath];
  const fileStats = [];
  let batchCount = 0;
  let currentDepth = 0;

  // Keep track of visited directories to avoid cycles
  const visitedDirs = new Set();

  while (pendingDirectories.length > 0 && currentDepth <= config.maxDepth) {
    const currentDir = pendingDirectories.shift();
    
    // Check if we've already visited this directory
    if (visitedDirs.has(currentDir)) {
      continue;
    }
    
    // Mark directory as visited
    visitedDirs.add(currentDir);
    
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip dot files if configured
        if (config.ignoreDotFiles && entry.name.startsWith('.') && !config.includeHiddenFiles) {
          continue;
        }
        
        const entryPath = path.join(currentDir, entry.name);
        
        try {
          const stats = await stat(entryPath);
          
          if (stats.isDirectory()) {
            // Skip scanning certain system directories to avoid permission issues
            if (!entryPath.includes('node_modules') && 
                !entryPath.includes('.git') &&
                !entryPath.startsWith('/System') &&
                !entryPath.startsWith('/Library/System')) {
              // Instead of recursing, add to the queue with depth info
              pendingDirectories.push(entryPath);
            }
          } else {
            // Skip files larger than the configured size limit
            if (config.ignoreSizeAbove > 0 && stats.size > config.ignoreSizeAbove) {
              continue;
            }
            
            // Directly analyze files in the main process, only collecting essential data
            const fileData = {
              path: entryPath,
              name: entry.name,
              size: stats.size,
              accessed: stats.atime,
              modified: stats.mtime,
              created: stats.birthtime,
              extension: path.extname(entry.name).toLowerCase()
            };
            
            fileStats.push(fileData);
            
            // Report progress
            if (progressReporter) {
              progressReporter.processedFiles += 1;
              // Report progress every 10 files to avoid too many events
              if (progressReporter.processedFiles % 10 === 0) {
                progressReporter.report();
              }
            }
            
            // If we've hit our batch size and there are still items to process,
            // send the current batch to the renderer and start a new batch
            batchCount++;
            if (batchCount >= MAX_BATCH_SIZE && pendingDirectories.length > 0) {
              if (mainWindow) {
                mainWindow.webContents.send('scan-batch', {
                  files: analyzeFiles(fileStats.splice(0, fileStats.length), config),
                  isDone: false
                });
              }
              batchCount = 0;
              
              // Allow event loop to process other events
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
        } catch (error) {
          console.error(`Error processing entry ${entryPath}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentDir}:`, error);
    }
    
    // Increment depth after processing all entries at current level
    currentDepth++;
  }

  return fileStats;
}

// Helper function to calculate file hash (for duplicate detection)
async function calculateFileHash(filePath, algorithm = 'md5', sampleSize = null) {
  try {
    // For very large files, we can optionally hash just the beginning, middle and end
    // to improve performance while still having good duplicate detection
    if (sampleSize && (await stat(filePath)).size > sampleSize * 3) {
      const fd = await promisify(fs.open)(filePath, 'r');
      const buffer1 = Buffer.alloc(sampleSize);
      const buffer2 = Buffer.alloc(sampleSize);
      const buffer3 = Buffer.alloc(sampleSize);
      
      const fileSize = (await stat(filePath)).size;
      const middlePosition = Math.floor(fileSize / 2) - Math.floor(sampleSize / 2);
      const endPosition = fileSize - sampleSize;
      
      await promisify(fs.read)(fd, buffer1, 0, sampleSize, 0);
      await promisify(fs.read)(fd, buffer2, 0, sampleSize, middlePosition);
      await promisify(fs.read)(fd, buffer3, 0, sampleSize, endPosition);
      
      await promisify(fs.close)(fd);
      
      const hash = crypto.createHash(algorithm);
      hash.update(buffer1);
      hash.update(buffer2);
      hash.update(buffer3);
      
      return hash.digest('hex');
    } else {
      // For smaller files, hash the entire content
      const data = await readFile(filePath);
      return crypto.createHash(algorithm).update(data).digest('hex');
    }
  } catch (error) {
    console.error(`Error calculating hash for ${filePath}:`, error);
    return null;
  }
}

// Add or modify the find-duplicates handler
ipcMain.handle('find-duplicates', async (event, filePaths, options = {}) => {
  console.log('Find duplicates request for', filePaths.length, 'files with options:', options);
  
  try {
    // If scanDirectory option is set, we should scan the directory first
    if (options.scanDirectory && filePaths.length === 1) {
      const directoryPath = filePaths[0];
      console.log('Scanning directory for duplicates:', directoryPath);
      
      // Validate the directory exists
      if (!fs.existsSync(directoryPath)) {
        return {
          success: false,
          error: 'Directory does not exist'
        };
      }
      
      // Get all files in the directory recursively
      const allFiles = await getAllFiles(directoryPath, {
        maxDepth: options.maxDepth || 10,
        ignoreHidden: !options.includeHiddenFiles,
        ignoreDotFiles: options.ignoreDotFiles !== false
      });
      
      console.log(`Found ${allFiles.length} files in directory to check for duplicates`);
      
      // Now use these files for duplicate detection
      filePaths = allFiles.map(file => file.path);
    }
    
    // Initialize data for keeping track of duplicates
    const fileHashes = new Map();
    const potentialDuplicates = new Map();
    const duplicateGroups = [];
    
    // ... existing duplicate finding code ...
    
    // Initialize progress reporting
    const total = filePaths.length;
    let processed = 0;
    
    // Report initial progress
    event.sender.send('duplicate-progress', {
      processed: 0,
      total,
      percentage: 0
    });
    
    // Process files in batches to avoid blocking the main thread
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
      const batch = filePaths.slice(i, i + BATCH_SIZE);
      
      // Process batch
      await Promise.all(batch.map(async (filePath) => {
        try {
          // Skip directories
          const stats = await stat(filePath);
          if (stats.isDirectory()) {
            processed++;
            return;
          }
          
          // Skip files that are too large or small if configured
          if (options.minSize && stats.size < options.minSize) {
            processed++;
            return;
          }
          
          if (options.maxSize && stats.size > options.maxSize) {
            processed++;
            return;
          }
          
          // Generate hash of the file
          let fileHash;
          
          if (options.exactMatch !== false) {
            // Full file hash
            fileHash = await calculateFileHash(filePath, options.hashAlgorithm || 'md5');
          } else {
            // Partial file hash (first X bytes)
            const sampleSize = options.sampleSize || 4096; // Default to 4KB
            fileHash = await calculateFileHash(filePath, options.hashAlgorithm || 'md5', sampleSize);
          }
          
          // If we have a size-based pre-check
          if (options.compareSize !== false) {
            const sizeKey = `${stats.size}`;
            
            if (!fileHashes.has(sizeKey)) {
              fileHashes.set(sizeKey, []);
            }
            
            fileHashes.get(sizeKey).push({
              path: filePath,
              hash: fileHash,
              size: stats.size,
              name: path.basename(filePath),
              extension: path.extname(filePath).toLowerCase()
            });
          } else {
            // If no size-based pre-check, use hash directly
            if (!potentialDuplicates.has(fileHash)) {
              potentialDuplicates.set(fileHash, []);
            }
            
            potentialDuplicates.get(fileHash).push({
              path: filePath,
              size: stats.size,
              name: path.basename(filePath),
              extension: path.extname(filePath).toLowerCase()
            });
          }
          
          processed++;
          
          // Report progress periodically
          if (processed % 10 === 0 || processed === total) {
            event.sender.send('duplicate-progress', {
              processed,
              total,
              percentage: Math.round((processed / total) * 100)
            });
          }
        } catch (error) {
          console.error('Error processing file for duplicates:', filePath, error);
          processed++;
        }
      }));
      
      // Yield execution to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // If we used size-based pre-check, now check hashes for matching sizes
    if (options.compareSize !== false) {
      for (const [sizeKey, files] of fileHashes.entries()) {
        // Skip files with unique sizes
        if (files.length <= 1) continue;
        
        // Group by hash
        for (const file of files) {
          if (!potentialDuplicates.has(file.hash)) {
            potentialDuplicates.set(file.hash, []);
          }
          
          potentialDuplicates.get(file.hash).push({
            path: file.path,
            size: file.size,
            name: file.name,
            extension: file.extension
          });
        }
      }
    }
    
    // Extract duplicate groups (2+ files with same hash)
    let totalDuplicates = 0;
    let potentialSavings = 0;
    
    for (const [hash, files] of potentialDuplicates.entries()) {
      if (files.length > 1) {
        const groupSize = files[0].size; // All files in group have same size
        duplicateGroups.push({
          hash,
          size: groupSize,
          files
        });
        
        totalDuplicates += files.length - 1; // -1 because one file is the original
        potentialSavings += groupSize * (files.length - 1); // Size that could be saved
      }
    }
    
    // Sort groups by size (largest duplicate groups first)
    duplicateGroups.sort((a, b) => (b.size * b.files.length) - (a.size * a.files.length));
    
    return {
      success: true,
      data: {
        duplicateGroups,
        totalDuplicates,
        potentialSavings
      }
    };
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Modify analyzeFiles to use the hash-based duplicate detection
function analyzeFiles(files, config = {}) {
  // Large files that haven't been accessed in a long time
  const OLD_FILE_THRESHOLD_DAYS = config.scanAgeThreshold || 180; // Default to 6 months
  const LARGE_FILE_THRESHOLD = config.scanSizeThreshold || 100 * 1024 * 1024; // Default to 100 MB
  
  return files.map(file => {
    const now = new Date();
    const lastAccessed = new Date(file.accessed);
    const daysSinceAccessed = Math.floor((now - lastAccessed) / (1000 * 60 * 60 * 24));
    
    const categories = [];
    
    // Check if it's a large file that hasn't been accessed in X days
    if (file.size > LARGE_FILE_THRESHOLD && daysSinceAccessed > OLD_FILE_THRESHOLD_DAYS) {
      categories.push('largeUnused');
    }
    
    // Check for common temporary file extensions
    const tempExtensions = ['.tmp', '.temp', '.bak', '.cache', '.log'];
    if (tempExtensions.includes(file.extension)) {
      categories.push('temporary');
    }
    
    // Check for common download file extensions
    const downloadExtensions = ['.dmg', '.exe', '.pkg', '.iso', '.zip', '.tar', '.gz', '.rar'];
    if (downloadExtensions.includes(file.extension)) {
      categories.push('installer');
    }
    
    // Check for common duplicate indicators in filename (simple check)
    if (file.name.match(/copy|копия|\(\d+\)|_\d+/i)) {
      categories.push('potentialDuplicate');
    }
    
    return {
      ...file,
      categories,
      isUnneeded: categories.length > 0,
      formattedSize: formatFileSize(file.size)
    };
  });
}

// Helper function for file size formatting
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Add function to get list of backups
async function getBackupsList() {
  try {
    const trashPath = await getTrashDirectory();
    
    // Get all files in the trash directory
    const files = await readdir(trashPath);
    
    // Filter to only include actual backup files (not metadata)
    const backupFiles = files.filter(file => !file.endsWith('.meta.json'));
    
    // Map each backup file to its metadata and details
    const backups = await Promise.all(
      backupFiles.map(async file => {
        try {
          const backupPath = path.join(trashPath, file);
          const metadataPath = `${backupPath}.meta.json`;
          const fileStats = await stat(backupPath);
          
          let metadata = {};
          // Try to read metadata if it exists
          if (fs.existsSync(metadataPath)) {
            const metadataContent = await readFile(metadataPath, 'utf8');
            metadata = JSON.parse(metadataContent);
          }
          
          // Generate a unique ID for the backup
          const id = crypto.createHash('md5').update(`${backupPath}${fileStats.mtime}`).digest('hex');
          
          return {
            id,
            originalPath: metadata.originalPath || 'Unknown',
            backupPath,
            fileName: path.basename(backupPath).replace(/^[0-9\-TZ_]+_/, ''), // Remove timestamp prefix
            size: fileStats.size,
            backupDate: metadata.backupDate ? new Date(metadata.backupDate) : fileStats.mtime,
            formattedSize: formatFileSize(fileStats.size)
          };
        } catch (error) {
          console.error('Error processing backup file:', file, error);
          return null;
        }
      })
    );
    
    // Filter out any null results
    return backups.filter(Boolean);
  } catch (error) {
    console.error('Error getting backups list:', error);
    return [];
  }
}

// Add function to restore a backup
async function restoreBackup(backupId, targetPath = null) {
  try {
    const backups = await getBackupsList();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return {
        success: false,
        error: 'Backup not found'
      };
    }
    
    // Determine target path
    const restorationPath = targetPath || backup.originalPath;
    
    // If no target path provided and original path doesn't exist, return error
    if (!targetPath && !backup.originalPath) {
      return {
        success: false,
        error: 'Original path not found. Please specify a target path.'
      };
    }
    
    // Check if target directory exists
    const targetDir = path.dirname(restorationPath);
    if (!fs.existsSync(targetDir)) {
      return {
        success: false,
        error: `Target directory does not exist: ${targetDir}`
      };
    }
    
    // Warn if destination file already exists
    if (fs.existsSync(restorationPath)) {
      // Prompt user about overwrite
      const response = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Cancel', 'Overwrite'],
        defaultId: 0,
        title: 'File Exists',
        message: 'The destination file already exists. Do you want to overwrite it?',
        detail: `Target path: ${restorationPath}`,
        cancelId: 0
      });
      
      if (response.response === 0) {
        return {
          success: false,
          error: 'Restoration cancelled by user'
        };
      }
    }
    
    // Copy backup file to target location
    await copyFile(backup.backupPath, restorationPath);
    
    return {
      success: true,
      restoredTo: restorationPath
    };
  } catch (error) {
    console.error('Error restoring backup:', error);
    return {
      success: false,
      error: `Error restoring backup: ${error.message}`
    };
  }
}

// Add a function to save settings to a file
function saveSettingsToFile(settings) {
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    // Make sure the settings object has all required properties
    const validatedSettings = {
      general: {
        language: settings.general?.language || 'en',
        theme: settings.general?.theme || 'system',
        startMinimized: settings.general?.startMinimized || false,
        minimizeToTray: settings.general?.minimizeToTray || true,
        closeToTray: settings.general?.closeToTray || true,
        checkForUpdates: settings.general?.checkForUpdates || true
      },
      scanning: {
        maxDepth: settings.scanning?.maxDepth || 10,
        ignoreDotFiles: settings.scanning?.ignoreDotFiles || true,
        includeHiddenFiles: settings.scanning?.includeHiddenFiles || false,
        scanSizeThreshold: settings.scanning?.scanSizeThreshold || 100,
        scanAgeThreshold: settings.scanning?.scanAgeThreshold || 180
      },
      backups: {
        keepBackups: settings.backups?.keepBackups || true,
        backupRetentionDays: settings.backups?.backupRetentionDays || 30,
        maxBackupSize: settings.backups?.maxBackupSize || 1024
      },
      notifications: {
        showNotifications: settings.notifications?.showNotifications || true,
        notifyOnScanComplete: settings.notifications?.notifyOnScanComplete || true,
        notifyOnCleanupComplete: settings.notifications?.notifyOnCleanupComplete || true
      },
      advanced: {
        enableDebugging: settings.advanced?.enableDebugging || false,
        concurrentOperations: settings.advanced?.concurrentOperations || 2
      }
    };
    
    fs.writeFileSync(settingsPath, JSON.stringify(validatedSettings, null, 2));
    console.log('Settings saved to file:', settingsPath);
    return true;
  } catch (error) {
    console.error('Error saving settings to file:', error);
    return false;
  }
}

// Register IPC handlers for settings
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const success = saveSettingsToFile(settings);
    return { success };
  } catch (error) {
    console.error('Error in save-settings handler:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-settings', async (event) => {
  try {
    const settings = loadUserSettings();
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error in load-settings handler:', error);
    return { success: false, error: error.message };
  }
}); 