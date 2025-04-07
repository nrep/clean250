import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, 
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert
} from '@mui/material';
import {
  RestoreFromTrash, DeleteForever, 
  FolderOpen, Search, Refresh
} from '@mui/icons-material';

interface BackupItem {
  id: string;
  originalPath: string;
  backupPath: string;
  fileName: string;
  size: number;
  backupDate: Date;
  formattedSize: string;
}

interface BackupManagerProps {
  onRestoreComplete?: () => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ onRestoreComplete }) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState<boolean>(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null);
  const [customPath, setCustomPath] = useState<string>('');

  // Load backups when component mounts
  useEffect(() => {
    loadBackups();
  }, []);

  // Function to load backups from electron backend
  const loadBackups = async () => {
    setLoading(true);
    setError(null);

    if (!window.electronAPI?.getBackups) {
      setError('Backup feature is not available in this environment');
      setLoading(false);
      return;
    }

    try {
      const result = await window.electronAPI.getBackups();
      
      if (result.success) {
        // Format dates from string to Date objects
        const formattedBackups = result.data.map((backup: any) => ({
          ...backup,
          backupDate: new Date(backup.backupDate)
        }));
        
        setBackups(formattedBackups);
      } else {
        setError(result.error || 'Failed to load backups');
      }
    } catch (err) {
      setError(`Error loading backups: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle opening restore dialog
  const handleRestoreClick = (backup: BackupItem) => {
    setSelectedBackup(backup);
    setCustomPath(backup.originalPath);
    setRestoreDialogOpen(true);
  };

  // Handle restore operation
  const handleRestore = async () => {
    if (!selectedBackup) return;
    
    try {
      setLoading(true);
      
      const result = await window.electronAPI.restoreBackup(
        selectedBackup.id,
        customPath !== selectedBackup.originalPath ? customPath : undefined
      );
      
      if (result.success) {
        setRestoreDialogOpen(false);
        setSelectedBackup(null);
        setCustomPath('');
        
        if (onRestoreComplete) {
          onRestoreComplete();
        }
      } else {
        setError(result.error || 'Failed to restore file');
      }
    } catch (err) {
      setError(`Error restoring file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle browsing for custom restore location
  const handleBrowseForRestoreLocation = async () => {
    if (!window.electronAPI?.selectDirectory) return;
    
    try {
      const result = await window.electronAPI.selectDirectory();
      
      if (result.selected && result.path && selectedBackup) {
        // Combine the selected directory with the original filename
        const fileName = selectedBackup.fileName;
        // Use a cross-platform way to join paths
        setCustomPath(`${result.path}/${fileName}`);
      }
    } catch (err) {
      setError(`Error selecting directory: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (!window.electronAPI?.getBackups) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography>
          Backup and restore features are only available in the desktop app.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h6">Deleted Files</Typography>
        <Button 
          startIcon={<Refresh />} 
          onClick={loadBackups}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : backups.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No backup files found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Deleted On</TableCell>
                <TableCell>Original Path</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id} hover>
                  <TableCell>{backup.fileName}</TableCell>
                  <TableCell>{backup.formattedSize}</TableCell>
                  <TableCell>{formatDate(backup.backupDate)}</TableCell>
                  <TableCell 
                    sx={{ 
                      maxWidth: 250, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' 
                    }}
                    title={backup.originalPath}
                  >
                    {backup.originalPath}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      size="small" 
                      onClick={() => handleRestoreClick(backup)}
                      title="Restore file"
                    >
                      <RestoreFromTrash fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Restore dialog */}
      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Restore File</DialogTitle>
        <DialogContent>
          {selectedBackup && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                {selectedBackup.fileName}
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                Deleted on: {formatDate(selectedBackup.backupDate)}
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Restore to:
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <TextField
                    fullWidth
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="Specify path to restore to"
                    size="small"
                    variant="outlined"
                  />
                  <IconButton 
                    onClick={handleBrowseForRestoreLocation}
                    title="Browse"
                    sx={{ ml: 1 }}
                  >
                    <FolderOpen />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRestore} 
            color="primary"
            variant="contained"
            disabled={!customPath || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupManager; 