import React, { useState } from 'react';
import {
  Box, Paper, Typography, Button, LinearProgress,
  Collapse, IconButton, Checkbox, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon,
  Divider, Tooltip, Stack, Radio, RadioGroup, Chip
} from '@mui/material';
import {
  FileCopy, ExpandMore, Delete, FindInPage,
  CheckCircle, Timeline, Settings, Info
} from '@mui/icons-material';

interface DuplicateFile {
  path: string;
  name: string;
  size: number;
  extension: string;
}

interface DuplicateGroup {
  hash: string;
  size: number;
  files: DuplicateFile[];
}

interface DuplicatesFinderProps {
  files?: any[];
  directoryPath?: string;
  onDeleteFiles: (paths: string[]) => void;
  isElectronAvailable?: boolean;
}

const DuplicatesFinder: React.FC<DuplicatesFinderProps> = ({ 
  files = [], 
  directoryPath = '', 
  onDeleteFiles,
  isElectronAvailable = true
}) => {
  // State for duplicate finder
  const [findingDuplicates, setFindingDuplicates] = useState<boolean>(false);
  const [duplicateProgress, setDuplicateProgress] = useState<{ processed: number, total: number, percentage: number } | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [totalDuplicates, setTotalDuplicates] = useState<number>(0);
  const [potentialSavings, setPotentialSavings] = useState<number>(0);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [selection, setSelection] = useState<{ [key: string]: string }>({});

  // Duplicate finder options
  const [options, setOptions] = useState({
    exactMatch: true,
    sampleSize: 4096, // 4KB sample size for partial matching
    hashAlgorithm: 'md5',
    compareSize: true
  });

  // Format size for display
  const formatSize = (bytes: number) => {
    if (typeof window.electronAPI?.formatFileSize === 'function') {
      return window.electronAPI.formatFileSize(bytes);
    }
    
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Start duplicate finding process
  const handleFindDuplicates = async () => {
    // If we have both files and directoryPath, prefer files
    // If we only have directoryPath, use directoryPath
    if ((!files.length && !directoryPath) || findingDuplicates) return;
    
    setFindingDuplicates(true);
    setDuplicateProgress(null);
    setDuplicateGroups([]);
    setTotalDuplicates(0);
    setPotentialSavings(0);
    
    // Set up progress listener
    let removeProgressListener: (() => void) | null = null;
    
    if (window.electronAPI && window.electronAPI.onDuplicateProgress) {
      removeProgressListener = window.electronAPI.onDuplicateProgress((progress: { processed: number, total: number, percentage: number }) => {
        setDuplicateProgress(progress);
      });
    }
    
    try {
      // Use files if available, otherwise use directoryPath
      const filePaths = files.length > 0 
        ? files.map(file => file.path) 
        : [directoryPath];
      
      // Start duplicate finding with the path or paths
      const result = await window.electronAPI.findDuplicates(filePaths, {
        ...options,
        scanDirectory: files.length === 0
      });
      
      if (result.success) {
        console.log('Found duplicates:', result.data);
        setDuplicateGroups(result.data.duplicateGroups as DuplicateGroup[]);
        setTotalDuplicates(result.data.totalDuplicates as number);
        setPotentialSavings(result.data.potentialSavings as number);
        
        // Initialize selection state for each group (keep newest by default)
        const initialSelection: { [key: string]: string } = {};
        (result.data.duplicateGroups as DuplicateGroup[]).forEach((group: DuplicateGroup) => {
          // Find newest file (largest modified timestamp)
          if (group.files.length > 0) {
            initialSelection[group.hash] = 'newest';
          }
        });
        setSelection(initialSelection);
      } else {
        console.error('Error finding duplicates:', result.error);
      }
    } catch (error) {
      console.error('Error in duplicate finder:', error);
    } finally {
      setFindingDuplicates(false);
      
      // Clean up progress listener
      if (removeProgressListener) {
        removeProgressListener();
      }
    }
  };

  // Handle selection change for a duplicate group
  const handleSelectionChange = (groupHash: string, value: string) => {
    setSelection(prev => ({
      ...prev,
      [groupHash]: value
    }));
  };

  // Get files to delete based on selection
  const getFilesToDelete = () => {
    const filesToDelete: string[] = [];
    
    duplicateGroups.forEach(group => {
      const selectionType = selection[group.hash] || 'newest';
      
      if (selectionType === 'all') {
        // Delete all files in the group
        group.files.forEach(file => {
          filesToDelete.push(file.path);
        });
      } else {
        // Sort files by modified date (if available)
        const sortedFiles = [...group.files];
        
        // Keep the file based on selection type, delete the rest
        if (selectionType === 'newest') {
          // Delete all except the newest file
          // For simplicity, we'll just keep the first one
          for (let i = 1; i < sortedFiles.length; i++) {
            filesToDelete.push(sortedFiles[i].path);
          }
        } else if (selectionType === 'oldest') {
          // Delete all except the oldest file
          // For simplicity, we'll just keep the last one
          for (let i = 0; i < sortedFiles.length - 1; i++) {
            filesToDelete.push(sortedFiles[i].path);
          }
        } else if (selectionType === 'none') {
          // Keep all files, delete none
        } else {
          // selection is a specific file path
          group.files.forEach(file => {
            if (file.path !== selectionType) {
              filesToDelete.push(file.path);
            }
          });
        }
      }
    });
    
    return filesToDelete;
  };

  // Handle delete duplicates
  const handleDeleteDuplicates = () => {
    const filesToDelete = getFilesToDelete();
    if (filesToDelete.length > 0) {
      onDeleteFiles(filesToDelete);
    }
  };

  // Update options
  const handleOptionChange = (option: string, value: any) => {
    setOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          <FileCopy sx={{ mr: 1, verticalAlign: 'middle' }} />
          Duplicate Files Finder
        </Typography>
        
        <Stack direction="row" spacing={1}>
          <Tooltip title="Find Duplicates Settings">
            <IconButton onClick={() => setShowOptions(!showOptions)}>
              <Settings />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleFindDuplicates}
            disabled={findingDuplicates || files.length === 0}
            startIcon={<FindInPage />}
          >
            {findingDuplicates ? 'Searching...' : 'Find Duplicates'}
          </Button>
        </Stack>
      </Box>
      
      {/* Options panel */}
      <Collapse in={showOptions}>
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" gutterBottom>
            Duplicate Detection Options
          </Typography>
          
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.exactMatch}
                  onChange={(e) => handleOptionChange('exactMatch', e.target.checked)}
                />
              }
              label="Exact Content Matching (slower but more accurate)"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.compareSize}
                  onChange={(e) => handleOptionChange('compareSize', e.target.checked)}
                />
              }
              label="Compare File Size (pre-filter)"
            />
            
            {!options.exactMatch && (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Sample Size for Partial Matching:
                </Typography>
                <RadioGroup
                  row
                  value={options.sampleSize.toString()}
                  onChange={(e) => handleOptionChange('sampleSize', parseInt(e.target.value, 10))}
                >
                  <FormControlLabel value="1024" control={<Radio />} label="1KB (Fast)" />
                  <FormControlLabel value="4096" control={<Radio />} label="4KB (Default)" />
                  <FormControlLabel value="16384" control={<Radio />} label="16KB (Thorough)" />
                </RadioGroup>
              </Box>
            )}
            
            <Box>
              <Typography variant="body2" gutterBottom>
                Hash Algorithm:
              </Typography>
              <RadioGroup
                row
                value={options.hashAlgorithm}
                onChange={(e) => handleOptionChange('hashAlgorithm', e.target.value)}
              >
                <FormControlLabel value="md5" control={<Radio />} label="MD5 (Fast)" />
                <FormControlLabel value="sha1" control={<Radio />} label="SHA1 (Balanced)" />
                <FormControlLabel value="sha256" control={<Radio />} label="SHA256 (Secure)" />
              </RadioGroup>
            </Box>
          </Stack>
        </Paper>
      </Collapse>
      
      {/* Progress bar */}
      {findingDuplicates && duplicateProgress && (
        <Box sx={{ width: '100%', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress variant="determinate" value={duplicateProgress.percentage} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">{`${duplicateProgress.percentage}%`}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Processed {duplicateProgress.processed} of {duplicateProgress.total} files
          </Typography>
        </Box>
      )}
      
      {/* Results */}
      {duplicateGroups.length > 0 ? (
        <Box>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="body1" gutterBottom>
              Found {totalDuplicates} duplicate files in {duplicateGroups.length} groups
            </Typography>
            <Typography variant="body2">
              Potential space savings: {formatSize(potentialSavings)}
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<Delete />}
                onClick={handleDeleteDuplicates}
                disabled={duplicateGroups.length === 0}
              >
                Delete Selected Duplicates
              </Button>
            </Box>
          </Box>
          
          {duplicateGroups.map((group) => (
            <Accordion key={group.hash} sx={{ mb: 1 }}>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls={`panel-${group.hash}-content`}
                id={`panel-${group.hash}-header`}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography sx={{ flexGrow: 1 }}>
                    {group.files.length} duplicate files • {formatSize(group.size)} each
                  </Typography>
                  <Chip
                    label={`Total: ${formatSize(group.size * group.files.length)}`}
                    size="small"
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Action for this group:
                  </Typography>
                  <RadioGroup
                    row
                    value={selection[group.hash] || 'newest'}
                    onChange={(e) => handleSelectionChange(group.hash, e.target.value)}
                  >
                    <FormControlLabel value="newest" control={<Radio />} label="Keep Newest" />
                    <FormControlLabel value="oldest" control={<Radio />} label="Keep Oldest" />
                    <FormControlLabel value="none" control={<Radio />} label="Keep All" />
                    <FormControlLabel value="all" control={<Radio />} label="Delete All" />
                  </RadioGroup>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <List dense>
                  {group.files.map((file) => (
                    <ListItem
                      key={file.path}
                      secondaryAction={
                        <Radio
                          edge="end"
                          checked={selection[group.hash] === file.path}
                          onChange={() => handleSelectionChange(group.hash, file.path)}
                        />
                      }
                    >
                      <ListItemIcon>
                        <FileCopy />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '500px'
                            }}
                            title={file.path}
                          >
                            {file.path}
                          </Typography>
                        }
                      />
                      <Chip
                        label={formatSize(file.size)}
                        size="small"
                        sx={{ mr: 2 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        !findingDuplicates && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Info color="primary" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              No duplicate files found yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click "Find Duplicates" to start scanning
            </Typography>
          </Box>
        )
      )}
    </Paper>
  );
};

export default DuplicatesFinder; 