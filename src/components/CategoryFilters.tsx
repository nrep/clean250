import React, { useMemo } from 'react';
import { 
  Box, Typography, Paper, Chip, Stack, Divider 
} from '@mui/material';
import { 
  InsertDriveFile, Warning, 
  AccessTime, Schedule
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

interface CategoryFiltersProps {
  files: FileItem[];
  activeFilters: string[];
  onFilterChange: (category: string) => void;
}

// Helper function to get category icon, label and color
const getCategoryInfo = (category: string) => {
  switch (category) {
    case 'largeUnused':
      return { 
        color: 'warning', 
        label: 'Large Unused Files',
        icon: <AccessTime fontSize="small" />
      };
    case 'temporary':
      return { 
        color: 'info', 
        label: 'Temporary Files',
        icon: <Schedule fontSize="small" />
      };
    case 'installer':
      return { 
        color: 'success', 
        label: 'Installers & Archives',
        icon: <InsertDriveFile fontSize="small" />
      };
    case 'potentialDuplicate':
      return { 
        color: 'error', 
        label: 'Potential Duplicates',
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

const CategoryFilters: React.FC<CategoryFiltersProps> = ({ 
  files, 
  activeFilters,
  onFilterChange 
}) => {
  // Get all unique categories with their counts
  const categories = useMemo(() => {
    const categoryCounts: Record<string, { count: number, size: number }> = {};
    
    files.forEach(file => {
      file.categories.forEach(category => {
        if (!categoryCounts[category]) {
          categoryCounts[category] = { count: 0, size: 0 };
        }
        categoryCounts[category].count += 1;
        categoryCounts[category].size += file.size;
      });
    });
    
    // Convert to array and sort by count (descending)
    return Object.entries(categoryCounts)
      .map(([category, stats]) => ({
        category,
        ...stats,
        ...getCategoryInfo(category)
      }))
      .sort((a, b) => b.count - a.count);
  }, [files]);
  
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

  if (categories.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No categories found
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Filter by Category
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Stack spacing={1}>
        {categories.map(({ category, count, size, color, label, icon }) => (
          <Chip
            key={category}
            label={`${label} (${count})`}
            icon={icon}
            color={activeFilters.includes(category) ? color as any : 'default'}
            onClick={() => onFilterChange(category)}
            variant={activeFilters.includes(category) ? 'filled' : 'outlined'}
            sx={{ justifyContent: 'space-between' }}
          />
        ))}
      </Stack>
      
      {activeFilters.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Total selected: {
              formatSize(
                files
                  .filter(file => 
                    file.categories.some(c => activeFilters.includes(c))
                  )
                  .reduce((acc, file) => acc + file.size, 0)
              )
            }
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CategoryFilters; 