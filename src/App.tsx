import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { 
  Box, Container, Typography, Button, Paper, 
  CircularProgress, Snackbar, Alert,
  Tabs, Tab, Stack, LinearProgress,
  Collapse, IconButton, Slider, FormControlLabel, 
  Checkbox as MUICheckbox, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import { 
  Storage, DeleteOutline, FolderOpen, 
  Refresh, WarningAmber, Settings as SettingsIcon,
  ExpandLess, Schedule as ScheduleIcon
} from '@mui/icons-material';
import FileList from './components/FileList';
import ScanSummary from './components/ScanSummary';
import CategoryFilters from './components/CategoryFilters';
import DuplicatesFinder from './components/DuplicatesFinder';
import BackupManager from './components/BackupManager';
import SettingsPanel from './components/Settings';

// Define the file interface 
interface FileItem {
  path: string;
  name: string;
  size: number;
  accessed: Date;
  modified: Date;
  created: Date;
  extension: string;
  categories: string[];
  isUnneeded: boolean;
  formattedSize: string;
}

// Add a new BackupItem interface
interface BackupItem {
  id: string;
  originalPath: string;
  backupPath: string;
  fileName: string;
  size: number;
  backupDate: Date;
  formattedSize: string;
}

// Add AppSettings interface to store application settings
export interface AppSettings {
  general: {
    language: string;
    theme: 'light' | 'dark' | 'system';
    startMinimized: boolean;
    minimizeToTray: boolean;
    closeToTray: boolean;
    checkForUpdates: boolean;
  };
  scanning: {
    maxDepth: number;
    ignoreDotFiles: boolean;
    includeHiddenFiles: boolean;
    scanSizeThreshold: number; // in MB
    scanAgeThreshold: number; // in days
  };
  backups: {
    keepBackups: boolean;
    backupRetentionDays: number;
    maxBackupSize: number; // in MB
  };
  notifications: {
    showNotifications: boolean;
    notifyOnScanComplete: boolean;
    notifyOnCleanupComplete: boolean;
  };
  advanced: {
    enableDebugging: boolean;
    concurrentOperations: number;
  };
}

// Declare the window electron API interface
declare global {
  interface Window {
    electronAPI: {
      scanDirectory: (path: string, config?: any) => Promise<{success: boolean, data: any[], error?: string}>;
      deleteFiles: (paths: string[]) => Promise<{success: boolean, data: any[], error?: string}>;
      selectDirectory: () => Promise<{selected: boolean, path?: string}>;
      formatFileSize: (bytes: number) => string;
      analyzeFile: (file: any) => FileItem;
      onScanProgress: (callback: (progress: {processed: number, total: number, percentage: number}) => void) => () => void;
      onScanBatch: (callback: (batchData: {files: FileItem[], isDone: boolean}) => void) => () => void;
      findDuplicates: (filePaths: string[], options?: any) => Promise<{success: boolean, data: any, error?: string}>;
      onDuplicateProgress: (callback: (progress: {processed: number, total: number, percentage: number}) => void) => () => void;
      previewFile: (filePath: string) => Promise<{success: boolean, data?: string, error?: string, type?: string}>;
      getBackups: () => Promise<{success: boolean, data: BackupItem[], error?: string}>;
      restoreBackup: (backupId: string, targetPath?: string) => Promise<{success: boolean, error?: string}>;
      quickScan: (directoryPath: string) => Promise<{success: boolean, data?: any, error?: string}>;
      onQuickScanRequest: (callback: () => void) => () => void;
      saveSettings: (settings: AppSettings) => Promise<{success: boolean, error?: string}>;
      loadSettings: () => Promise<{success: boolean, data?: AppSettings, error?: string}>;
      testConnection?: () => string;
    }
  }
}

// Create a dynamic theme that can change based on user preferences
const createAppTheme = (mode: 'light' | 'dark' | 'system') => {
  // Determine if we should use dark mode
  const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const themeMode = mode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : mode;
  
  return createTheme({
    palette: {
      mode: themeMode as 'light' | 'dark',
      primary: {
        main: themeMode === 'dark' ? '#2196f3' : '#1976d2',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: themeMode === 'dark' ? '#121212' : '#f5f5f5',
        paper: themeMode === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
  });
};

function App() {
  // Check if running in Electron environment
  const [isElectronAvailable, setIsElectronAvailable] = useState<boolean>(false);
  
  // Check if the Electron API is available
  useEffect(() => {
    const checkElectron = () => {
      if (window.electronAPI) {
        setIsElectronAvailable(true);
      } else {
        setIsElectronAvailable(false);
      }
    };
    
    // Check immediately
    checkElectron();
    
    // Also check after a delay (in case the API loads asynchronously)
    const timer = setTimeout(() => {
      checkElectron();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const [directoryPath, setDirectoryPath] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{processed: number, total: number, percentage: number} | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [activeTab, setActiveTab] = useState<number>(0);
  const [scannerSubTab, setScannerSubTab] = useState<number>(0);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [cleanableSize, setCleanableSize] = useState<number>(0);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [showScanOptions, setShowScanOptions] = useState<boolean>(false);
  
  // Scan configuration options
  const [scanConfig, setScanConfig] = useState({
    maxDepth: 10,
    ignoreDotFiles: true,
    ignoreSizeAbove: 1024, // Size in MB
    ignoreFilesOlderThan: 365, // Days
    includeHiddenFiles: false,
    scanSizeThreshold: 100, // Size in MB for marking large files
    scanAgeThreshold: 180, // Days for marking old files
  });
  
  // Add state for scheduling
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState<boolean>(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: false,
    interval: 'weekly', // 'daily', 'weekly', 'monthly'
    dayOfWeek: 0, // 0-6 (Sunday-Saturday) - for weekly
    dayOfMonth: 1, // 1-31 - for monthly
    hour: 3, // 0-23
    minute: 0, // 0-59
    lastRun: null as Date | null,
    nextRun: null as Date | null
  });
  
  // Add state for application settings
  const [appSettings, setAppSettings] = useState<AppSettings>({
    general: {
      language: 'en',
      theme: 'system',
      startMinimized: false,
      minimizeToTray: true,
      closeToTray: true,
      checkForUpdates: true
    },
    scanning: {
      maxDepth: scanConfig.maxDepth,
      ignoreDotFiles: scanConfig.ignoreDotFiles,
      includeHiddenFiles: scanConfig.includeHiddenFiles,
      scanSizeThreshold: scanConfig.scanSizeThreshold,
      scanAgeThreshold: scanConfig.scanAgeThreshold
    },
    backups: {
      keepBackups: true,
      backupRetentionDays: 30,
      maxBackupSize: 1024 // 1GB
    },
    notifications: {
      showNotifications: true,
      notifyOnScanComplete: true,
      notifyOnCleanupComplete: true
    },
    advanced: {
      enableDebugging: false,
      concurrentOperations: 2
    }
  });
  
  // Update the dynamic theme when app settings change
  const [theme, setTheme] = useState(createAppTheme('system'));
  
  // Update theme when settings change
  useEffect(() => {
    setTheme(createAppTheme(appSettings.general.theme));
    
    // Set up a listener for system theme changes if using system theme
    if (appSettings.general.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        setTheme(createAppTheme('system'));
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appSettings.general.theme]);
  
  // Load application settings from localStorage on mount
  useEffect(() => {
    // First try to load from electron API if available
    if (isElectronAvailable && window.electronAPI.loadSettings) {
      window.electronAPI.loadSettings()
        .then(result => {
          if (result.success && result.data) {
            const settingsData = result.data;
            setAppSettings(settingsData);
            
            // Also update scan config with saved settings
            setScanConfig(prev => ({
              ...prev,
              maxDepth: settingsData.scanning?.maxDepth || prev.maxDepth,
              ignoreDotFiles: settingsData.scanning?.ignoreDotFiles || prev.ignoreDotFiles,
              includeHiddenFiles: settingsData.scanning?.includeHiddenFiles || prev.includeHiddenFiles,
              scanSizeThreshold: settingsData.scanning?.scanSizeThreshold || prev.scanSizeThreshold,
              scanAgeThreshold: settingsData.scanning?.scanAgeThreshold || prev.scanAgeThreshold
            }));
            return;
          }
        })
        .catch(error => {
          console.error('Error loading settings from electron:', error);
        });
    }
    
    // Fallback to localStorage
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setAppSettings(parsedSettings);
        
        // Also update scan config with saved settings
        setScanConfig(prev => ({
          ...prev,
          maxDepth: parsedSettings.scanning.maxDepth,
          ignoreDotFiles: parsedSettings.scanning.ignoreDotFiles,
          includeHiddenFiles: parsedSettings.scanning.includeHiddenFiles,
          scanSizeThreshold: parsedSettings.scanning.scanSizeThreshold,
          scanAgeThreshold: parsedSettings.scanning.scanAgeThreshold
        }));
      } catch (error) {
        console.error('Error parsing saved application settings:', error);
      }
    }
  }, [isElectronAvailable]);
  
  // Save application settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
  }, [appSettings]);
  
  // Calculate statistics when files or selected files change
  useEffect(() => {
    if (files.length) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const total = files.reduce((acc, file) => acc + file.size, 0);
      setTotalSize(total);
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cleanable = files
        .filter(file => file.isUnneeded)
        .reduce((acc, file) => acc + file.size, 0);
      setCleanableSize(cleanable);
    } else {
      setTotalSize(0);
      setCleanableSize(0);
    }
  }, [files]);
  
  // Handle directory selection
  const handleSelectDirectory = async () => {
    if (!isElectronAvailable) {
      setNotification({
        open: true,
        message: 'Electron API is not available. This feature requires the desktop app.',
        severity: 'error'
      });
      return;
    }
    
    try {
      console.log('Calling selectDirectory');
      const result = await window.electronAPI.selectDirectory();
      console.log('Result:', result);
      
      if (result.selected && result.path) {
        setDirectoryPath(result.path);
        setFiles([]);
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      setNotification({
        open: true,
        message: `Error selecting directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };
  
  // Handle directory scanning with batch processing
  const handleScan = async () => {
    if (!directoryPath) return;
    
    if (!isElectronAvailable) {
      setNotification({
        open: true,
        message: 'Electron API is not available. This feature requires the desktop app.',
        severity: 'error'
      });
      return;
    }
    
    setScanning(true);
    setFiles([]);
    setScanProgress(null);
    
    // Set up the progress listener
    let removeProgressListener: (() => void) | null = null;
    let removeBatchListener: (() => void) | null = null;
    
    // Listen for scan progress updates
    if (window.electronAPI && window.electronAPI.onScanProgress) {
      removeProgressListener = window.electronAPI.onScanProgress((progress) => {
        setScanProgress(progress);
      });
    }
    
    // Listen for file batches
    if (window.electronAPI && window.electronAPI.onScanBatch) {
      removeBatchListener = window.electronAPI.onScanBatch((batchData) => {
        setIsProcessingBatch(true);
        
        // Add this batch of files to our state
        setFiles(prevFiles => {
          // Create a Map for O(1) lookups to avoid duplicates
          const fileMap = new Map(prevFiles.map(file => [file.path, file]));
          
          // Add new files to the map, replacing any with same path
          batchData.files.forEach(file => {
            fileMap.set(file.path, file);
          });
          
          // Convert map back to array
          return Array.from(fileMap.values());
        });
        
        // Mark batch processing as complete if this is the final batch
        if (batchData.isDone) {
          setIsProcessingBatch(false);
        }
      });
    }
    
    try {
      console.log('Calling scanDirectory with config:', scanConfig);
      const result = await window.electronAPI.scanDirectory(directoryPath, scanConfig);
      console.log('Scan result:', result);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // If no batches were received, use the result directly
      if (files.length === 0 && result.data && result.data.length > 0) {
        setFiles(result.data);
      }
      
      setNotification({
        open: true,
        message: `Scan complete: Found ${files.length} files`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error scanning directory:', error);
      setNotification({
        open: true,
        message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setScanning(false);
      setScanProgress(null);
      setIsProcessingBatch(false);
      
      // Clean up the listeners
      if (removeProgressListener) {
        removeProgressListener();
      }
      
      if (removeBatchListener) {
        removeBatchListener();
      }
    }
  };
  
  // Handle file deletion
  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    
    if (!isElectronAvailable) {
      setNotification({
        open: true,
        message: 'Electron API is not available. This feature requires the desktop app.',
        severity: 'error'
      });
      return;
    }
    
    // Calculate total size of files to be deleted
    const totalSizeToDelete = files
      .filter(file => selectedFiles.includes(file.path))
      .reduce((total, file) => total + file.size, 0);
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedFiles.length} files (${window.electronAPI.formatFileSize(totalSizeToDelete)})?` +
      '\n\nThis action cannot be undone.'
    );
    
    if (!confirmed) {
      return;
    }
    
    // Use the shared handleDeleteFiles function
    await handleDeleteFiles(selectedFiles);
  };
  
  // Handle file selection
  const handleSelectFile = (path: string, selected: boolean) => {
    if (selected) {
      setSelectedFiles(prev => [...prev, path]);
    } else {
      setSelectedFiles(prev => prev.filter(p => p !== path));
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (category: string) => {
    setActiveFilters(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };
  
  // Define activeTab enum/constants
  const TabTypes = {
    SCANNER: 0,
    DUPLICATES: 1,
    TRASH: 2,
    SETTINGS: 3
  };

  // Define scanner sub-tab enum/constants
  const ScannerTabTypes = {
    ALL_FILES: 0,
    CLEANABLE: 1,
    DUPLICATES: 2
  };

  // Filter files based on active filters and tab
  const filteredFiles = files.filter(file => {
    // Filter by tab first
    if (scannerSubTab === ScannerTabTypes.ALL_FILES) {
      // All files
      return true;
    } else if (scannerSubTab === ScannerTabTypes.CLEANABLE) {
      // Unneeded files
      if (!file.isUnneeded) return false;
    }
    
    // Then apply category filters if any are active
    if (activeFilters.length === 0) {
      return true;
    }
    
    // Check if file has at least one of the active categories
    return file.categories.some(category => activeFilters.includes(category));
  });
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({...prev, open: false}));
  };

  // Handle scan config change
  const handleScanConfigChange = (key: string, value: any) => {
    setScanConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Function to calculate next run time
  const calculateNextRun = (config: typeof scheduleConfig) => {
    if (!config.enabled) return null;
    
    const now = new Date();
    let nextRun = new Date(now);
    
    // Reset seconds and milliseconds
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);
    
    // Set the configured hour and minute
    nextRun.setHours(config.hour);
    nextRun.setMinutes(config.minute);
    
    // If the time is in the past, move to the next occurrence
    if (nextRun <= now) {
      // For daily schedule, just add one day
      if (config.interval === 'daily') {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      // For weekly schedule
      else if (config.interval === 'weekly') {
        const currentDay = nextRun.getDay();
        const daysUntilTarget = (config.dayOfWeek - currentDay + 7) % 7;
        nextRun.setDate(nextRun.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
      }
      // For monthly schedule
      else if (config.interval === 'monthly') {
        nextRun.setDate(config.dayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        
        // Check if the day is valid for the month (e.g., February 30)
        const month = nextRun.getMonth();
        nextRun.setDate(config.dayOfMonth);
        if (nextRun.getMonth() !== month) {
          // If day is invalid, set to last day of the previous month
          nextRun.setDate(0);
        }
      }
    }
    
    return nextRun;
  };
  
  // Load schedule config from local storage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('scheduleConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        if (parsedConfig.lastRun) {
          parsedConfig.lastRun = new Date(parsedConfig.lastRun);
        }
        setScheduleConfig({
          ...parsedConfig,
          nextRun: calculateNextRun(parsedConfig)
        });
      } catch (error) {
        console.error('Error parsing saved schedule config:', error);
      }
    }
  }, []);
  
  // Save schedule config to local storage
  useEffect(() => {
    localStorage.setItem('scheduleConfig', JSON.stringify(scheduleConfig));
  }, [scheduleConfig]);
  
  // Check if a scheduled scan is due
  useEffect(() => {
    if (!isElectronAvailable || !scheduleConfig.enabled || !scheduleConfig.nextRun) return;
    
    const checkSchedule = () => {
      const now = new Date();
      if (scheduleConfig.nextRun && scheduleConfig.nextRun <= now) {
        // Time to run the scheduled scan
        if (directoryPath && !scanning) {
          console.log('Running scheduled scan');
          handleScan();
          
          // Update last run and calculate next run
          setScheduleConfig(prev => ({
            ...prev,
            lastRun: now,
            nextRun: calculateNextRun({ ...prev, lastRun: now })
          }));
        } else {
          console.log('Scheduled scan due but directory not set or already scanning');
        }
      }
    };
    
    // Check every minute
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [scheduleConfig, directoryPath, scanning, isElectronAvailable]);
  
  // Handle scheduling dialog
  const handleOpenScheduleDialog = () => {
    setScheduleDialogOpen(true);
  };
  
  const handleCloseScheduleDialog = () => {
    setScheduleDialogOpen(false);
  };
  
  const handleSaveSchedule = () => {
    const nextRun = calculateNextRun(scheduleConfig);
    setScheduleConfig(prev => ({
      ...prev,
      nextRun
    }));
    setScheduleDialogOpen(false);
    
    setNotification({
      open: true,
      message: scheduleConfig.enabled 
        ? `Scheduled scan set for ${nextRun?.toLocaleString()}` 
        : 'Scheduled scanning disabled',
      severity: 'info'
    });
  };
  
  const handleScheduleConfigChange = (key: string, value: any) => {
    setScheduleConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Format a date for display
  const formatScheduleDate = (date: Date | null) => {
    if (!date) return 'Not scheduled';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Handle deleting selected files from DuplicatesFinder
  const handleDeleteSelectedFiles = (filePaths: string[]) => {
    if (filePaths.length === 0) return;
    
    // Calculate total size of files to be deleted
    const totalSizeToDelete = filePaths.length > 0 ? 
      files.filter(file => filePaths.includes(file.path))
        .reduce((total, file) => total + file.size, 0) : 0;
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete ${filePaths.length} files (${window.electronAPI.formatFileSize(totalSizeToDelete)})?` +
      '\n\nThis action cannot be undone.'
    );
    
    if (!confirmed) {
      return;
    }
    
    // Call the deleteFiles function
    handleDeleteFiles(filePaths);
  };
  
  // Extract the delete functionality to a reusable function
  const handleDeleteFiles = async (filePaths: string[]) => {
    try {
      console.log('Calling deleteFiles with:', filePaths);
      const result = await window.electronAPI.deleteFiles(filePaths);
      console.log('Delete result:', result);
      
      if (result.success) {
        const successCount = result.data.filter(r => r.success).length;
        const failCount = result.data.filter(r => !r.success).length;
        
        // Remove deleted files from the list
        setFiles(prev => prev.filter(file => !filePaths.includes(file.path) || 
          result.data.find(r => r.path === file.path && !r.success)));
        
        setSelectedFiles([]);
        
        setNotification({
          open: true,
          message: `Deleted ${successCount} files${failCount > 0 ? `, failed to delete ${failCount} files` : ''}`,
          severity: successCount > 0 ? 'success' : 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      setNotification({
        open: true,
        message: `Error deleting files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  // Update the tab labels array
  const tabLabels = ['All Files', 'Cleanable Files', 'Duplicates', 'Trash', 'Settings'];

  // Listen for quick scan requests from the system tray
  useEffect(() => {
    if (!isElectronAvailable || !window.electronAPI.onQuickScanRequest) return;
    
    // Set up listener for quick scan requests
    const removeListener = window.electronAPI.onQuickScanRequest(() => {
      console.log('Quick scan requested from system tray');
      
      // Check if we have a directory path
      if (directoryPath) {
        // Perform the scan
        handleScan();
        
        // Show a notification
        new Notification('Clean250', {
          body: 'Quick scan started in the background'
        });
      } else {
        // Show error notification
        new Notification('Clean250', {
          body: 'Cannot run quick scan: No directory selected'
        });
        
        // Open directory picker
        handleSelectDirectory();
      }
    });
    
    return () => {
      if (removeListener) removeListener();
    };
  }, [isElectronAvailable, directoryPath]);

  // Update handleSaveSettings to also save to electron API if available
  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    
    // Update scan config with new settings
    setScanConfig({
      ...scanConfig,
      maxDepth: newSettings.scanning.maxDepth,
      ignoreDotFiles: newSettings.scanning.ignoreDotFiles,
      includeHiddenFiles: newSettings.scanning.includeHiddenFiles,
      scanSizeThreshold: newSettings.scanning.scanSizeThreshold,
      scanAgeThreshold: newSettings.scanning.scanAgeThreshold
    });
    
    // Save to electron API if available
    if (isElectronAvailable && window.electronAPI.saveSettings) {
      window.electronAPI.saveSettings(newSettings)
        .catch(error => {
          console.error('Error saving settings to electron:', error);
        });
    }
    
    // Show notification
    setNotification({
      open: true,
      message: 'Settings saved successfully',
      severity: 'success'
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Clean250 Storage Optimizer
          </Typography>
          
          <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
            <Button 
              variant="contained" 
              startIcon={<FolderOpen />} 
              onClick={handleSelectDirectory}
              disabled={scanning}
            >
              Select Directory
            </Button>
            
            {directoryPath && (
              <>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={scanning ? <CircularProgress size={20} color="inherit" /> : <Refresh />} 
                  onClick={handleScan}
                  disabled={scanning || !directoryPath}
                >
                  {scanning ? 'Scanning...' : 'Scan Now'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={handleOpenScheduleDialog}
                  disabled={scanning || !directoryPath}
                >
                  {scheduleConfig.enabled ? 'Edit Schedule' : 'Schedule Scan'}
                </Button>
                
                <Tooltip title="Scan Options">
                  <IconButton 
                    color="primary" 
                    onClick={() => setShowScanOptions(!showScanOptions)}
                    disabled={scanning}
                  >
                    <SettingsIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
          
          {/* Display next scheduled scan if enabled */}
          {scheduleConfig.enabled && scheduleConfig.nextRun && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Next scheduled scan: {formatScheduleDate(scheduleConfig.nextRun)}
                {scheduleConfig.lastRun && ` (Last run: ${formatScheduleDate(scheduleConfig.lastRun)})`}
              </Typography>
            </Box>
          )}
          
          {directoryPath ? (
            <Typography variant="body1" sx={{ mb: 2 }}>
              Selected directory: {directoryPath}
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ mb: 2 }}>
              Please select a directory to scan.
            </Typography>
          )}
          
          {/* Scan Options Panel */}
          <Collapse in={showScanOptions}>
            <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Scan Options</Typography>
                <IconButton onClick={() => setShowScanOptions(false)} size="small">
                  <ExpandLess />
                </IconButton>
              </Box>
              
              <Stack spacing={3}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography gutterBottom>Max Scan Depth</Typography>
                    <Slider
                      value={scanConfig.maxDepth}
                      min={1}
                      max={20}
                      step={1}
                      marks={[
                        { value: 1, label: '1' },
                        { value: 10, label: '10' },
                        { value: 20, label: '20' }
                      ]}
                      valueLabelDisplay="auto"
                      onChange={(_, value) => handleScanConfigChange('maxDepth', value as number)}
                    />
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography gutterBottom>Ignore Files Larger Than (MB)</Typography>
                    <Slider
                      value={scanConfig.ignoreSizeAbove}
                      min={100}
                      max={10000}
                      step={100}
                      marks={[
                        { value: 100, label: '100MB' },
                        { value: 1000, label: '1GB' },
                        { value: 10000, label: '10GB' }
                      ]}
                      valueLabelDisplay="auto"
                      onChange={(_, value) => handleScanConfigChange('ignoreSizeAbove', value as number)}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography gutterBottom>Large File Threshold (MB)</Typography>
                    <Slider
                      value={scanConfig.scanSizeThreshold}
                      min={10}
                      max={1000}
                      step={10}
                      marks={[
                        { value: 10, label: '10MB' },
                        { value: 100, label: '100MB' },
                        { value: 1000, label: '1GB' }
                      ]}
                      valueLabelDisplay="auto"
                      onChange={(_, value) => handleScanConfigChange('scanSizeThreshold', value as number)}
                    />
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography gutterBottom>Old File Threshold (Days)</Typography>
                    <Slider
                      value={scanConfig.scanAgeThreshold}
                      min={30}
                      max={365}
                      step={30}
                      marks={[
                        { value: 30, label: '30d' },
                        { value: 180, label: '180d' },
                        { value: 365, label: '1y' }
                      ]}
                      valueLabelDisplay="auto"
                      onChange={(_, value) => handleScanConfigChange('scanAgeThreshold', value as number)}
                    />
                  </Box>
                </Box>
                
                <Box>
                  <Stack direction="row" spacing={2}>
                    <FormControlLabel
                      control={
                        <MUICheckbox
                          checked={scanConfig.ignoreDotFiles}
                          onChange={(e) => handleScanConfigChange('ignoreDotFiles', e.target.checked)}
                        />
                      }
                      label="Ignore Dot Files"
                    />
                    
                    <FormControlLabel
                      control={
                        <MUICheckbox
                          checked={scanConfig.includeHiddenFiles}
                          onChange={(e) => handleScanConfigChange('includeHiddenFiles', e.target.checked)}
                        />
                      }
                      label="Include Hidden Files"
                    />
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Collapse>
          
          {scanning && scanProgress && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress variant="determinate" value={scanProgress.percentage} />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">{`${scanProgress.percentage}%`}</Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Processed {scanProgress.processed} of {scanProgress.total} files
              </Typography>
            </Box>
          )}
          
          {/* Main Tabs - Add Trash tab */}
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Scanner" />
            <Tab label="Duplicates" />
            <Tab label="Trash" />
            <Tab label="Settings" />
          </Tabs>
          
          {/* Scanner Tab Content */}
          {activeTab === TabTypes.SCANNER && (
            <>
              <Box sx={{ mb: 3 }}>
                <ScanSummary 
                  totalFiles={files.length}
                  totalSize={totalSize}
                  cleanableFiles={files.filter(f => f.isUnneeded).length}
                  cleanableSize={cleanableSize}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Tabs 
                  value={scannerSubTab} 
                  onChange={(_, newValue) => setScannerSubTab(newValue)}
                  indicatorColor="primary"
                  textColor="primary"
                >
                  <Tab label={`All Files (${files.length})`} />
                  <Tab 
                    label={`Cleanable Files (${files.filter(f => f.isUnneeded).length})`}
                    icon={<WarningAmber fontSize="small" />}
                    iconPosition="start"
                  />
                  <Tab
                    label="Find Duplicates"
                    icon={<Storage fontSize="small" />}
                    iconPosition="start"
                  />
                </Tabs>
              </Box>
              
              {/* All Files or Cleanable Files tab */}
              {(scannerSubTab === ScannerTabTypes.ALL_FILES || scannerSubTab === ScannerTabTypes.CLEANABLE) && (
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                  <Box sx={{ width: { xs: '100%', md: '25%' } }}>
                    <CategoryFilters 
                      files={files}
                      activeFilters={activeFilters}
                      onFilterChange={handleFilterChange}
                    />
                    
                    <Box sx={{ mt: 4 }}>
                      <Button 
                        variant="contained" 
                        color="error"
                        startIcon={<DeleteOutline />}
                        fullWidth
                        disabled={selectedFiles.length === 0}
                        onClick={handleDeleteSelected}
                      >
                        Delete Selected ({selectedFiles.length})
                      </Button>
                      
                      {selectedFiles.length > 0 && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Selected size: {window.electronAPI.formatFileSize(
                            files
                              .filter(file => selectedFiles.includes(file.path))
                              .reduce((total, file) => total + file.size, 0)
                          )}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', md: '75%' } }}>
                    <FileList 
                      files={filteredFiles}
                      selectedFiles={selectedFiles}
                      onSelectFile={handleSelectFile}
                    />
                  </Box>
                </Box>
              )}
              
              {/* Duplicates sub-tab */}
              {scannerSubTab === ScannerTabTypes.DUPLICATES && (
                <DuplicatesFinder 
                  files={files}
                  onDeleteFiles={handleDeleteSelectedFiles}
                />
              )}
            </>
          )}
          
          {/* Duplicates Tab Content */}
          {activeTab === TabTypes.DUPLICATES && (
            <Box>
              <DuplicatesFinder 
                directoryPath={directoryPath}
                onDeleteFiles={handleDeleteFiles}
                isElectronAvailable={isElectronAvailable}
              />
            </Box>
          )}
          
          {/* Trash Tab Content */}
          {activeTab === TabTypes.TRASH && (
            <Box>
              <BackupManager 
                onRestoreComplete={() => {
                  setNotification({
                    open: true,
                    message: 'File restored successfully',
                    severity: 'success'
                  });
                }}
              />
            </Box>
          )}
          
          {/* Settings Tab Content */}
          {activeTab === TabTypes.SETTINGS && (
            <Box>
              <SettingsPanel 
                appSettings={appSettings}
                onSaveSettings={handleSaveSettings}
              />
            </Box>
          )}
        </Paper>
        
        <Snackbar 
          open={notification.open} 
          autoHideDuration={6000}
          onClose={handleCloseNotification}
        >
          <Alert onClose={handleCloseNotification} severity={notification.severity}>
            {notification.message}
          </Alert>
        </Snackbar>
        
        {/* Add Schedule Dialog */}
        <Dialog open={scheduleDialogOpen} onClose={handleCloseScheduleDialog}>
          <DialogTitle>Schedule Automatic Scanning</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <FormControlLabel
                control={
                  <MUICheckbox
                    checked={scheduleConfig.enabled}
                    onChange={(e) => handleScheduleConfigChange('enabled', e.target.checked)}
                  />
                }
                label="Enable scheduled scanning"
              />
              
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={scheduleConfig.interval}
                    label="Frequency"
                    onChange={(e) => handleScheduleConfigChange('interval', e.target.value)}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Day of Week</InputLabel>
                  <Select
                    value={scheduleConfig.dayOfWeek.toString()}
                    label="Day of Week"
                    onChange={(e) => handleScheduleConfigChange('dayOfWeek', parseInt(e.target.value))}
                  >
                    <MenuItem value="0">Sunday</MenuItem>
                    <MenuItem value="1">Monday</MenuItem>
                    <MenuItem value="2">Tuesday</MenuItem>
                    <MenuItem value="3">Wednesday</MenuItem>
                    <MenuItem value="4">Thursday</MenuItem>
                    <MenuItem value="5">Friday</MenuItem>
                    <MenuItem value="6">Saturday</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Day of Month</InputLabel>
                  <Select
                    value={scheduleConfig.dayOfMonth.toString()}
                    label="Day of Month"
                    onChange={(e) => handleScheduleConfigChange('dayOfMonth', parseInt(e.target.value))}
                  >
                    <MenuItem value="1">1</MenuItem>
                    <MenuItem value="2">2</MenuItem>
                    <MenuItem value="3">3</MenuItem>
                    <MenuItem value="4">4</MenuItem>
                    <MenuItem value="5">5</MenuItem>
                    <MenuItem value="6">6</MenuItem>
                    <MenuItem value="7">7</MenuItem>
                    <MenuItem value="8">8</MenuItem>
                    <MenuItem value="9">9</MenuItem>
                    <MenuItem value="10">10</MenuItem>
                    <MenuItem value="11">11</MenuItem>
                    <MenuItem value="12">12</MenuItem>
                    <MenuItem value="13">13</MenuItem>
                    <MenuItem value="14">14</MenuItem>
                    <MenuItem value="15">15</MenuItem>
                    <MenuItem value="16">16</MenuItem>
                    <MenuItem value="17">17</MenuItem>
                    <MenuItem value="18">18</MenuItem>
                    <MenuItem value="19">19</MenuItem>
                    <MenuItem value="20">20</MenuItem>
                    <MenuItem value="21">21</MenuItem>
                    <MenuItem value="22">22</MenuItem>
                    <MenuItem value="23">23</MenuItem>
                    <MenuItem value="24">24</MenuItem>
                    <MenuItem value="25">25</MenuItem>
                    <MenuItem value="26">26</MenuItem>
                    <MenuItem value="27">27</MenuItem>
                    <MenuItem value="28">28</MenuItem>
                    <MenuItem value="29">29</MenuItem>
                    <MenuItem value="30">30</MenuItem>
                    <MenuItem value="31">31</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Hour</InputLabel>
                  <Select
                    value={scheduleConfig.hour.toString()}
                    label="Hour"
                    onChange={(e) => handleScheduleConfigChange('hour', parseInt(e.target.value))}
                  >
                    <MenuItem value="0">0</MenuItem>
                    <MenuItem value="1">1</MenuItem>
                    <MenuItem value="2">2</MenuItem>
                    <MenuItem value="3">3</MenuItem>
                    <MenuItem value="4">4</MenuItem>
                    <MenuItem value="5">5</MenuItem>
                    <MenuItem value="6">6</MenuItem>
                    <MenuItem value="7">7</MenuItem>
                    <MenuItem value="8">8</MenuItem>
                    <MenuItem value="9">9</MenuItem>
                    <MenuItem value="10">10</MenuItem>
                    <MenuItem value="11">11</MenuItem>
                    <MenuItem value="12">12</MenuItem>
                    <MenuItem value="13">13</MenuItem>
                    <MenuItem value="14">14</MenuItem>
                    <MenuItem value="15">15</MenuItem>
                    <MenuItem value="16">16</MenuItem>
                    <MenuItem value="17">17</MenuItem>
                    <MenuItem value="18">18</MenuItem>
                    <MenuItem value="19">19</MenuItem>
                    <MenuItem value="20">20</MenuItem>
                    <MenuItem value="21">21</MenuItem>
                    <MenuItem value="22">22</MenuItem>
                    <MenuItem value="23">23</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Minute</InputLabel>
                  <Select
                    value={scheduleConfig.minute.toString()}
                    label="Minute"
                    onChange={(e) => handleScheduleConfigChange('minute', parseInt(e.target.value))}
                  >
                    <MenuItem value="0">0</MenuItem>
                    <MenuItem value="1">1</MenuItem>
                    <MenuItem value="2">2</MenuItem>
                    <MenuItem value="3">3</MenuItem>
                    <MenuItem value="4">4</MenuItem>
                    <MenuItem value="5">5</MenuItem>
                    <MenuItem value="6">6</MenuItem>
                    <MenuItem value="7">7</MenuItem>
                    <MenuItem value="8">8</MenuItem>
                    <MenuItem value="9">9</MenuItem>
                    <MenuItem value="10">10</MenuItem>
                    <MenuItem value="11">11</MenuItem>
                    <MenuItem value="12">12</MenuItem>
                    <MenuItem value="13">13</MenuItem>
                    <MenuItem value="14">14</MenuItem>
                    <MenuItem value="15">15</MenuItem>
                    <MenuItem value="16">16</MenuItem>
                    <MenuItem value="17">17</MenuItem>
                    <MenuItem value="18">18</MenuItem>
                    <MenuItem value="19">19</MenuItem>
                    <MenuItem value="20">20</MenuItem>
                    <MenuItem value="21">21</MenuItem>
                    <MenuItem value="22">22</MenuItem>
                    <MenuItem value="23">23</MenuItem>
                    <MenuItem value="24">24</MenuItem>
                    <MenuItem value="25">25</MenuItem>
                    <MenuItem value="26">26</MenuItem>
                    <MenuItem value="27">27</MenuItem>
                    <MenuItem value="28">28</MenuItem>
                    <MenuItem value="29">29</MenuItem>
                    <MenuItem value="30">30</MenuItem>
                    <MenuItem value="31">31</MenuItem>
                    <MenuItem value="32">32</MenuItem>
                    <MenuItem value="33">33</MenuItem>
                    <MenuItem value="34">34</MenuItem>
                    <MenuItem value="35">35</MenuItem>
                    <MenuItem value="36">36</MenuItem>
                    <MenuItem value="37">37</MenuItem>
                    <MenuItem value="38">38</MenuItem>
                    <MenuItem value="39">39</MenuItem>
                    <MenuItem value="40">40</MenuItem>
                    <MenuItem value="41">41</MenuItem>
                    <MenuItem value="42">42</MenuItem>
                    <MenuItem value="43">43</MenuItem>
                    <MenuItem value="44">44</MenuItem>
                    <MenuItem value="45">45</MenuItem>
                    <MenuItem value="46">46</MenuItem>
                    <MenuItem value="47">47</MenuItem>
                    <MenuItem value="48">48</MenuItem>
                    <MenuItem value="49">49</MenuItem>
                    <MenuItem value="50">50</MenuItem>
                    <MenuItem value="51">51</MenuItem>
                    <MenuItem value="52">52</MenuItem>
                    <MenuItem value="53">53</MenuItem>
                    <MenuItem value="54">54</MenuItem>
                    <MenuItem value="55">55</MenuItem>
                    <MenuItem value="56">56</MenuItem>
                    <MenuItem value="57">57</MenuItem>
                    <MenuItem value="58">58</MenuItem>
                    <MenuItem value="59">59</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseScheduleDialog}>Cancel</Button>
            <Button onClick={handleSaveSchedule}>Save</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}

export default App;
