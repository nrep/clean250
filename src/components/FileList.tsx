import React, { useState, useMemo } from 'react';
import { 
  TableContainer, Paper, Checkbox, 
  Typography, Chip, Box, Stack, Table,
  TableBody, TableCell, TableHead, TableRow,
  TablePagination, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, CircularProgress,
  Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import { 
  InsertDriveFile, Warning, 
  AccessTime, Schedule, Visibility,
  Close, Image, PictureAsPdf, Code,
  TextSnippet, VideoFile, AudioFile,
  Sort, ArrowUpward, ArrowDownward,
  CalendarToday, Folder, Storage
} from '@mui/icons-material';

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

interface FileListProps {
  files: FileItem[];
  selectedFiles: string[];
  onSelectFile: (path: string, selected: boolean) => void;
}

// Helper function to get category color and label
const getCategoryInfo = (category: string) => {
  switch (category) {
    case 'largeUnused':
      return { 
        color: 'warning', 
        label: 'Large Unused',
        icon: <AccessTime fontSize="small" />
      };
    case 'temporary':
      return { 
        color: 'info', 
        label: 'Temporary',
        icon: <Schedule fontSize="small" />
      };
    case 'installer':
      return { 
        color: 'success', 
        label: 'Installer',
        icon: <InsertDriveFile fontSize="small" />
      };
    case 'potentialDuplicate':
      return { 
        color: 'error', 
        label: 'Duplicate',
        icon: <Warning fontSize="small" />
      };
    default:
      return { 
        color: 'default', 
        label: category,
        icon: undefined
      };
  }
};

// Add a new FilePreview component
interface FilePreviewProps {
  open: boolean;
  onClose: () => void;
  file: FileItem | null;
}

const FilePreview: React.FC<FilePreviewProps> = ({ open, onClose, file }) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Determine file type based on extension
  const getFileType = (extension: string): 'image' | 'text' | 'pdf' | 'video' | 'audio' | 'other' => {
    const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
    const textTypes = ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.htm', '.css', '.js', '.ts', '.jsx', '.tsx', '.log'];
    const pdfTypes = ['.pdf'];
    const videoTypes = ['.mp4', '.webm', '.avi', '.mov', '.wmv'];
    const audioTypes = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
    
    if (imageTypes.includes(extension.toLowerCase())) return 'image';
    if (textTypes.includes(extension.toLowerCase())) return 'text';
    if (pdfTypes.includes(extension.toLowerCase())) return 'pdf';
    if (videoTypes.includes(extension.toLowerCase())) return 'video';
    if (audioTypes.includes(extension.toLowerCase())) return 'audio';
    return 'other';
  };
  
  // Load file content when dialog opens
  React.useEffect(() => {
    if (open && file) {
      setLoading(true);
      setContent(null);
      setError(null);
      
      // Use the Electron API to load file content
      if (window.electronAPI?.previewFile) {
        window.electronAPI.previewFile(file.path)
          .then((result: { success: boolean; data?: string; error?: string; }) => {
            if (result.success && result.data) {
              setContent(result.data);
            } else {
              setError(result.error || 'Failed to load file preview');
            }
          })
          .catch((err: Error) => {
            setError(`Error loading file: ${err.message || 'Unknown error'}`);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setError('File preview is not supported in this environment');
        setLoading(false);
      }
    }
  }, [open, file]);
  
  // Render appropriate preview based on file type
  const renderPreview = () => {
    if (!file) return null;
    
    const fileType = getFileType(file.extension);
    
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }
    
    switch (fileType) {
      case 'image':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <img 
              src={`data:image/jpeg;base64,${content}`} 
              alt={file.name}
              style={{ maxWidth: '100%', maxHeight: '60vh' }}
            />
          </Box>
        );
      
      case 'text':
        return (
          <Box sx={{ p: 2, maxHeight: '60vh', overflow: 'auto' }}>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {content}
            </pre>
          </Box>
        );
        
      case 'pdf':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <PictureAsPdf sx={{ fontSize: 60, color: '#f44336' }} />
            <Typography>PDF preview is not available</Typography>
          </Box>
        );
        
      case 'video':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <VideoFile sx={{ fontSize: 60, color: '#2196f3' }} />
            <Typography>Video preview is not available</Typography>
          </Box>
        );
        
      case 'audio':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <AudioFile sx={{ fontSize: 60, color: '#4caf50' }} />
            <Typography>Audio preview is not available</Typography>
          </Box>
        );
        
      default:
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <InsertDriveFile sx={{ fontSize: 60, color: '#9e9e9e' }} />
            <Typography>Preview not available for this file type</Typography>
          </Box>
        );
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {file?.name || 'File Preview'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {renderPreview()}
      </DialogContent>
      <DialogActions>
        <Typography variant="body2" sx={{ flexGrow: 1, pl: 2 }}>
          {file?.path}
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const FileList: React.FC<FileListProps> = ({ files, selectedFiles, onSelectFile }) => {
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  // Add sort menu state
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const sortMenuOpen = Boolean(sortMenuAnchor);
  
  // Enhanced sort configuration to include more options
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({
    key: 'name',
    direction: 'asc'
  });

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
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

  // Enhanced memoized sorted data with more sort options
  const sortedData = useMemo(() => {
    // Create a copy of the array to avoid mutating props
    const dataCopy = [...files];
    
    dataCopy.sort((a, b) => {
      let comparison = 0;
      
      // Sort based on the selected key
      switch (sortConfig.key) {
        case 'size':
          comparison = a.size - b.size;
          break;
          
        case 'modified':
          comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
          
        case 'accessed':
          comparison = new Date(a.accessed).getTime() - new Date(b.accessed).getTime();
          break;
          
        case 'created':
          comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
          break;
          
        case 'extension':
          comparison = a.extension.localeCompare(b.extension);
          break;
          
        case 'path':
          comparison = a.path.localeCompare(b.path);
          break;
          
        case 'name':
        default:
          comparison = a.name.localeCompare(b.name);
          break;
      }
      
      // Apply sort direction
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    
    return dataCopy;
  }, [files, sortConfig]);

  // Get current page of data
  const currentPageData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  // Open sort menu
  const handleSortMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSortMenuAnchor(event.currentTarget);
  };
  
  // Close sort menu
  const handleSortMenuClose = () => {
    setSortMenuAnchor(null);
  };
  
  // Handle sort selection from menu
  const handleSortSelect = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    handleSortMenuClose();
  };

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Add state for preview
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Add functions to handle preview
  const handleOpenPreview = (file: FileItem) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };
  
  const handleClosePreview = () => {
    setPreviewOpen(false);
  };
  
  if (files.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No files found matching the current filters
        </Typography>
      </Box>
    );
  }
  
  return (
    <Paper sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
        <Button
          startIcon={<Sort />}
          endIcon={sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
          onClick={handleSortMenuOpen}
          variant="outlined"
          size="small"
        >
          Sort by: {sortConfig.key.charAt(0).toUpperCase() + sortConfig.key.slice(1)}
        </Button>
      </Box>
      
      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={sortMenuOpen}
        onClose={handleSortMenuClose}
      >
        <MenuItem 
          onClick={() => handleSortSelect('name')}
          selected={sortConfig.key === 'name'}
        >
          <ListItemIcon>
            <InsertDriveFile fontSize="small" />
          </ListItemIcon>
          <ListItemText>Name</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleSortSelect('size')}
          selected={sortConfig.key === 'size'}
        >
          <ListItemIcon>
            <Storage fontSize="small" />
          </ListItemIcon>
          <ListItemText>Size</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleSortSelect('modified')}
          selected={sortConfig.key === 'modified'}
        >
          <ListItemIcon>
            <CalendarToday fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modified Date</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleSortSelect('accessed')}
          selected={sortConfig.key === 'accessed'}
        >
          <ListItemIcon>
            <AccessTime fontSize="small" />
          </ListItemIcon>
          <ListItemText>Last Accessed</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleSortSelect('created')}
          selected={sortConfig.key === 'created'}
        >
          <ListItemIcon>
            <CalendarToday fontSize="small" />
          </ListItemIcon>
          <ListItemText>Created Date</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleSortSelect('extension')}
          selected={sortConfig.key === 'extension'}
        >
          <ListItemIcon>
            <InsertDriveFile fontSize="small" />
          </ListItemIcon>
          <ListItemText>File Type</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleSortSelect('path')}
          selected={sortConfig.key === 'path'}
        >
          <ListItemIcon>
            <Folder fontSize="small" />
          </ListItemIcon>
          <ListItemText>Path</ListItemText>
        </MenuItem>
      </Menu>
      
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table sx={{ minWidth: 650 }} size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  indeterminate={selectedFiles.length > 0 && selectedFiles.length < currentPageData.length}
                  checked={currentPageData.length > 0 && currentPageData.every(file => selectedFiles.includes(file.path))}
                  onChange={(event) => {
                    if (event.target.checked) {
                      // Select all files on current page
                      currentPageData.forEach(file => {
                        if (!selectedFiles.includes(file.path)) {
                          onSelectFile(file.path, true);
                        }
                      });
                    } else {
                      // Deselect all files on current page
                      currentPageData.forEach(file => {
                        if (selectedFiles.includes(file.path)) {
                          onSelectFile(file.path, false);
                        }
                      });
                    }
                  }}
                />
              </TableCell>
              <TableCell 
                onClick={() => handleSortSelect('name')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                File Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell>Categories</TableCell>
              <TableCell 
                align="right"
                onClick={() => handleSortSelect('size')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                Size {sortConfig.key === 'size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                align="right"
                onClick={() => handleSortSelect('modified')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                Modified {sortConfig.key === 'modified' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentPageData.map((file) => (
              <TableRow key={file.path} hover>
                <TableCell padding="checkbox">
                  <Checkbox 
                    checked={selectedFiles.includes(file.path)}
                    onChange={(event) => onSelectFile(file.path, event.target.checked)}
                  />
                </TableCell>
                <TableCell component="th" scope="row">
                  {file.name}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                    {file.categories.map((category) => {
                      const { color, label, icon } = getCategoryInfo(category);
                      return (
                        <Chip 
                          key={category}
                          size="small"
                          label={label}
                          color={color as any}
                          icon={icon}
                          sx={{ mb: 0.5, mr: 0.5 }}
                        />
                      );
                    })}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {file.formattedSize || formatSize(file.size)}
                </TableCell>
                <TableCell align="right">
                  {formatDate(file.modified)}
                </TableCell>
                <TableCell align="center">
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenPreview(file)}
                    title="Preview file"
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={files.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100, 500]}
      />
      
      {/* Add the file preview dialog */}
      <FilePreview 
        open={previewOpen}
        onClose={handleClosePreview}
        file={previewFile}
      />
    </Paper>
  );
};

export default FileList; 