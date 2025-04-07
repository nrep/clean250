import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Switch, FormControlLabel,
  Divider, Button, Slider, TextField, Select,
  MenuItem, InputLabel, FormControl, Alert,
  Accordion, AccordionSummary, AccordionDetails,
  Tooltip, IconButton, Snackbar, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Save, ExpandMore, RestoreFromTrash, 
  NotificationsActive, Storage, BugReport,
  Language, Schedule, Settings as SettingsIcon,
  RestartAlt
} from '@mui/icons-material';

interface SettingsProps {
  appSettings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

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

const defaultAppSettings: AppSettings = {
  general: {
    language: 'en',
    theme: 'system',
    startMinimized: false,
    minimizeToTray: true,
    closeToTray: true,
    checkForUpdates: true
  },
  scanning: {
    maxDepth: 10,
    ignoreDotFiles: true,
    includeHiddenFiles: false,
    scanSizeThreshold: 100,
    scanAgeThreshold: 180
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
};

const Settings: React.FC<SettingsProps> = ({ appSettings, onSaveSettings }) => {
  const [settings, setSettings] = useState<AppSettings>(appSettings);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false);
  
  useEffect(() => {
    // If appSettings change, update the state
    setSettings(appSettings);
  }, [appSettings]);
  
  const handleSave = () => {
    onSaveSettings(settings);
    setSaveSuccess(true);
  };
  
  const handleChange = (section: keyof AppSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };
  
  const handleCloseSnackbar = () => {
    setSaveSuccess(false);
  };
  
  const handleOpenResetDialog = () => {
    setResetDialogOpen(true);
  };
  
  const handleCloseResetDialog = () => {
    setResetDialogOpen(false);
  };
  
  const handleResetToDefaults = () => {
    setSettings(defaultAppSettings);
    setResetDialogOpen(false);
    setSaveSuccess(true);
    onSaveSettings(defaultAppSettings);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Application Settings
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<RestartAlt />}
            onClick={handleOpenResetDialog}
          >
            Reset to Defaults
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<Save />}
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Stack>
      </Box>
      
      <Snackbar
        open={saveSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Settings saved successfully
        </Alert>
      </Snackbar>
      
      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={handleCloseResetDialog}
      >
        <DialogTitle>Reset Settings</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reset all settings to their default values? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetDialog}>Cancel</Button>
          <Button onClick={handleResetToDefaults} color="warning">Reset</Button>
        </DialogActions>
      </Dialog>
      
      {/* General Settings */}
      <Accordion defaultExpanded>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="general-settings-content"
          id="general-settings-header"
        >
          <Typography variant="h6">General Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Language</InputLabel>
                <Select
                  value={settings.general.language}
                  label="Language"
                  onChange={(e) => handleChange('general', 'language', e.target.value)}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="de">German</MenuItem>
                  <MenuItem value="ru">Russian</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={settings.general.theme}
                  label="Theme"
                  onChange={(e) => handleChange('general', 'theme', e.target.value)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System Default</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.general.startMinimized}
                    onChange={(e) => handleChange('general', 'startMinimized', e.target.checked)}
                  />
                }
                label="Start Application Minimized"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.general.minimizeToTray}
                    onChange={(e) => handleChange('general', 'minimizeToTray', e.target.checked)}
                  />
                }
                label="Minimize to System Tray"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.general.closeToTray}
                    onChange={(e) => handleChange('general', 'closeToTray', e.target.checked)}
                  />
                }
                label="Close to System Tray"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.general.checkForUpdates}
                    onChange={(e) => handleChange('general', 'checkForUpdates', e.target.checked)}
                  />
                }
                label="Check for Updates Automatically"
              />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
      
      {/* Scanning Settings */}
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="scanning-settings-content"
          id="scanning-settings-header"
        >
          <Typography variant="h6">Scanning Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Maximum Folder Depth</Typography>
                <Slider
                  value={settings.scanning.maxDepth}
                  min={1}
                  max={20}
                  step={1}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 10, label: '10' },
                    { value: 20, label: '20' }
                  ]}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleChange('scanning', 'maxDepth', value as number)}
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Large File Threshold (MB)</Typography>
                <Slider
                  value={settings.scanning.scanSizeThreshold}
                  min={10}
                  max={1000}
                  step={10}
                  marks={[
                    { value: 10, label: '10MB' },
                    { value: 100, label: '100MB' },
                    { value: 1000, label: '1GB' }
                  ]}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleChange('scanning', 'scanSizeThreshold', value as number)}
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Old File Threshold (Days)</Typography>
                <Slider
                  value={settings.scanning.scanAgeThreshold}
                  min={30}
                  max={365}
                  step={30}
                  marks={[
                    { value: 30, label: '30d' },
                    { value: 180, label: '180d' },
                    { value: 365, label: '1y' }
                  ]}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleChange('scanning', 'scanAgeThreshold', value as number)}
                />
              </Box>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.scanning.ignoreDotFiles}
                    onChange={(e) => handleChange('scanning', 'ignoreDotFiles', e.target.checked)}
                  />
                }
                label="Ignore Dot Files (files starting with '.')"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.scanning.includeHiddenFiles}
                    onChange={(e) => handleChange('scanning', 'includeHiddenFiles', e.target.checked)}
                  />
                }
                label="Include Hidden Files"
              />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
      
      {/* Backup Settings */}
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="backup-settings-content"
          id="backup-settings-header"
        >
          <Typography variant="h6">Backup Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.backups.keepBackups}
                    onChange={(e) => handleChange('backups', 'keepBackups', e.target.checked)}
                  />
                }
                label="Keep Backup of Deleted Files"
              />
              
              <Box sx={{ mt: 3, mb: 3 }}>
                <Typography gutterBottom>Backup Retention Period (Days)</Typography>
                <Slider
                  value={settings.backups.backupRetentionDays}
                  min={1}
                  max={90}
                  step={1}
                  marks={[
                    { value: 1, label: '1d' },
                    { value: 30, label: '30d' },
                    { value: 90, label: '90d' }
                  ]}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleChange('backups', 'backupRetentionDays', value as number)}
                  disabled={!settings.backups.keepBackups}
                />
              </Box>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Maximum Backup Size (MB)</Typography>
                <Slider
                  value={settings.backups.maxBackupSize}
                  min={100}
                  max={10240}
                  step={100}
                  marks={[
                    { value: 100, label: '100MB' },
                    { value: 1024, label: '1GB' },
                    { value: 10240, label: '10GB' }
                  ]}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleChange('backups', 'maxBackupSize', value as number)}
                  disabled={!settings.backups.keepBackups}
                />
              </Box>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
      
      {/* Notification Settings */}
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="notification-settings-content"
          id="notification-settings-header"
        >
          <Typography variant="h6">Notification Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.showNotifications}
                    onChange={(e) => handleChange('notifications', 'showNotifications', e.target.checked)}
                  />
                }
                label="Show Desktop Notifications"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.notifyOnScanComplete}
                    onChange={(e) => handleChange('notifications', 'notifyOnScanComplete', e.target.checked)}
                    disabled={!settings.notifications.showNotifications}
                  />
                }
                label="Notify When Scan Completes"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.notifyOnCleanupComplete}
                    onChange={(e) => handleChange('notifications', 'notifyOnCleanupComplete', e.target.checked)}
                    disabled={!settings.notifications.showNotifications}
                  />
                }
                label="Notify When Cleanup Completes"
              />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
      
      {/* Advanced Settings */}
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="advanced-settings-content"
          id="advanced-settings-header"
        >
          <Typography variant="h6">Advanced Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.advanced.enableDebugging}
                    onChange={(e) => handleChange('advanced', 'enableDebugging', e.target.checked)}
                  />
                }
                label="Enable Debug Logging"
              />
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Concurrent Operations</Typography>
                <Slider
                  value={settings.advanced.concurrentOperations}
                  min={1}
                  max={8}
                  step={1}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 4, label: '4' },
                    { value: 8, label: '8' }
                  ]}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleChange('advanced', 'concurrentOperations', value as number)}
                />
              </Box>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default Settings; 