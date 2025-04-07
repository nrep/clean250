import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ScanSummaryProps {
  totalFiles: number;
  totalSize: number;
  cleanableFiles: number;
  cleanableSize: number;
}

const ScanSummary: React.FC<ScanSummaryProps> = ({
  totalFiles,
  totalSize,
  cleanableFiles,
  cleanableSize
}) => {
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
  
  // Calculate percentages
  const cleanablePercentage = totalSize > 0 ? Math.round((cleanableSize / totalSize) * 100) : 0;
  
  // Data for the pie chart
  const data = [
    { name: 'Needed', value: totalSize - cleanableSize, color: '#2196f3' },
    { name: 'Cleanable', value: cleanableSize, color: '#f50057' }
  ].filter(item => item.value > 0);
  
  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper elevation={3} sx={{ p: 1.5, bgcolor: 'background.paper' }}>
          <Typography variant="body2">{`${payload[0].name}: ${formatSize(payload[0].value)}`}</Typography>
          <Typography variant="caption" color="text.secondary">
            {`${Math.round((payload[0].value / totalSize) * 100)}% of total`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };
  
  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ flex: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total Files: {totalFiles}
          </Typography>
          <Typography variant="body1" fontWeight="500">
            Total Size: {formatSize(totalSize)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Potential Savings:
          </Typography>
          <Typography variant="body1" color="error" fontWeight="500">
            {formatSize(cleanableSize)} ({cleanablePercentage}% of total)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {cleanableFiles} files can be safely removed
          </Typography>
        </Box>
        
        <Box sx={{ flex: 1 }}>
          {data.length > 0 && (
            <Box sx={{ height: 110, width: '100%' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default ScanSummary; 