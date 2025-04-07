const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is running');

// Create a simple function to log calls
const logCall = (name, ...args) => {
  console.log(`API Call: ${name}`, ...args);
  return args;
};

// API object that will be exposed to the renderer
const api = {
  scanDirectory: (directoryPath, config = {}) => {
    console.log('Scan directory called:', directoryPath, 'with config:', config);
    return ipcRenderer.invoke('scan-directory', directoryPath, config);
  },
  
  deleteFiles: (filePaths) => {
    console.log('Delete files called:', filePaths);
    return ipcRenderer.invoke('delete-files', filePaths);
  },
  
  selectDirectory: () => {
    console.log('Select directory called from renderer');
    return ipcRenderer.invoke('select-directory');
  },
  
  // Add duplicate finder functionality
  findDuplicates: (filePaths, options = {}) => {
    console.log('Find duplicates called with', filePaths.length, 'files');
    return ipcRenderer.invoke('find-duplicates', filePaths, options);
  },
  
  // Add duplicate finder progress reporting
  onDuplicateProgress: (callback) => {
    console.log('Setting up duplicate finder progress listener');
    // Remove any existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners('duplicate-progress');
    // Add the new listener
    ipcRenderer.on('duplicate-progress', (event, progress) => {
      console.log('Duplicate finder progress:', progress);
      callback(progress);
    });
    
    // Return a function to remove the listener
    return () => {
      console.log('Removing duplicate finder progress listener');
      ipcRenderer.removeAllListeners('duplicate-progress');
    };
  },
  
  // Add batch processing
  onScanBatch: (callback) => {
    console.log('Setting up scan batch listener');
    // Remove any existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners('scan-batch');
    // Add the new listener
    ipcRenderer.on('scan-batch', (event, batchData) => {
      console.log(`Received batch with ${batchData.files.length} files, isDone: ${batchData.isDone}`);
      callback(batchData);
    });
    
    // Return a function to remove the listener
    return () => {
      console.log('Removing scan batch listener');
      ipcRenderer.removeAllListeners('scan-batch');
    };
  },
  
  // Add progress reporting
  onScanProgress: (callback) => {
    console.log('Setting up scan progress listener');
    // Remove any existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners('scan-progress');
    // Add the new listener
    ipcRenderer.on('scan-progress', (event, progress) => {
      console.log('Scan progress:', progress);
      callback(progress);
    });
    
    // Return a function to remove the listener
    return () => {
      console.log('Removing scan progress listener');
      ipcRenderer.removeAllListeners('scan-progress');
    };
  },
    
  // Helper for file size formatting
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  },
  
  // Helper for identifying potentially unneeded files
  analyzeFile: (file) => {
    // Large files that haven't been accessed in a long time
    const OLD_FILE_THRESHOLD_DAYS = 180; // 6 months
    const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100 MB
    
    const now = new Date();
    const lastAccessed = new Date(file.accessed);
    const daysSinceAccessed = Math.floor((now - lastAccessed) / (1000 * 60 * 60 * 24));
    
    const categories = [];
    
    // Check if it's a large file that hasn't been accessed in 6 months
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
    
    // Check for common duplicate indicators in filename
    if (file.name.match(/copy|копия|\(\d+\)|_\d+/i)) {
      categories.push('potentialDuplicate');
    }
    
    return {
      ...file,
      categories,
      isUnneeded: categories.length > 0,
      formattedSize: (bytes) => {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
      }
    };
  },
  
  // Add a simple testing method to verify API is working
  testConnection: () => {
    console.log('Test connection called');
    return 'Connection successful';
  },
  
  // Add file preview functionality
  previewFile: (filePath) => {
    console.log('Preview file called:', filePath);
    return ipcRenderer.invoke('preview-file', filePath);
  },
  
  // Add backup management functionality
  getBackups: () => {
    console.log('Get backups called');
    return ipcRenderer.invoke('get-backups');
  },
  
  restoreBackup: (backupId, targetPath) => {
    console.log('Restore backup called:', backupId, targetPath);
    return ipcRenderer.invoke('restore-backup', backupId, targetPath);
  },
  
  // Add quick scan functionality
  quickScan: (directoryPath) => {
    console.log('Quick scan called for:', directoryPath);
    return ipcRenderer.invoke('quick-scan', directoryPath);
  },
  
  // Add listener for tray quick scan request
  onQuickScanRequest: (callback) => {
    console.log('Setting up quick scan request listener');
    // Remove any existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners('run-quick-scan');
    // Add the new listener
    ipcRenderer.on('run-quick-scan', () => {
      console.log('Quick scan request received from tray');
      callback();
    });
    
    // Return a function to remove the listener
    return () => {
      console.log('Removing quick scan request listener');
      ipcRenderer.removeAllListeners('run-quick-scan');
    };
  },
};

// Log that we're about to expose the API
console.log('Exposing electronAPI to main world');

// Expose the API
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('API exposed successfully');
} catch (error) {
  console.error('Failed to expose API:', error);
} 