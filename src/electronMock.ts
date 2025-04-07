// Mock implementation of the Electron API for browser development

// Sample file data
const generateMockFiles = (count: number) => {
  const files = [];
  const extensions = ['.txt', '.jpg', '.png', '.pdf', '.mp4', '.mp3', '.zip', '.exe', '.dmg', '.iso', '.tmp', '.log'];
  const dates = [
    new Date('2023-01-05'),
    new Date('2023-03-12'),
    new Date('2022-11-30'),
    new Date('2023-10-15'),
    new Date('2022-05-20'),
    new Date('2021-12-25')
  ];
  
  for (let i = 0; i < count; i++) {
    const extension = extensions[Math.floor(Math.random() * extensions.length)];
    const size = Math.floor(Math.random() * 1000000000); // Random size up to ~1GB
    const accessedDate = dates[Math.floor(Math.random() * dates.length)];
    const modifiedDate = new Date(accessedDate);
    modifiedDate.setDate(modifiedDate.getDate() - Math.floor(Math.random() * 30));
    const createdDate = new Date(modifiedDate);
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
    
    files.push({
      path: `/mock/path/to/file${i}${extension}`,
      name: `file${i}${extension}`,
      size: size,
      accessed: accessedDate,
      modified: modifiedDate,
      created: createdDate,
      extension: extension
    });
  }
  
  return files;
};

// Helper for file size formatting
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

// Helper for identifying potentially unneeded files
const analyzeFile = (file: any) => {
  const OLD_FILE_THRESHOLD_DAYS = 180; // 6 months
  const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100 MB
  
  const now = new Date();
  const lastAccessed = new Date(file.accessed);
  const daysSinceAccessed = Math.floor((now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24));
  
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
    formattedSize: formatFileSize(file.size)
  };
};

// Mock implementation that can be used in browser
export const mockElectronAPI = {
  scanDirectory: async (directoryPath: string) => {
    console.log('[MOCK] Scanning directory:', directoryPath);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate mock files
    const files = generateMockFiles(50);
    
    return { success: true, data: files };
  },
  
  deleteFiles: async (filePaths: string[]) => {
    console.log('[MOCK] Deleting files:', filePaths);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate some failures for testing
    const results = filePaths.map(path => ({
      path,
      success: Math.random() > 0.05, // 5% chance of failure
      error: Math.random() > 0.05 ? undefined : 'Permission denied'
    }));
    
    return { success: true, data: results };
  },
  
  selectDirectory: async () => {
    console.log('[MOCK] Selecting directory');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return { 
      selected: true, 
      path: '/Users/mockuser/Documents'
    };
  },
  
  formatFileSize,
  analyzeFile
};

// Set up global mock if running in browser
if (typeof window !== 'undefined') {
  console.log('Mock module loaded, checking Electron API availability');
  
  // Force applying the mock API - we'll use the mock in the browser regardless
  if (!window.electronAPI) {
    console.log('Setting up mock Electron API for browser development');
    (window as any).electronAPI = mockElectronAPI;
    console.log('Mock API applied, window.electronAPI:', (window as any).electronAPI);
  } else {
    console.log('Electron API already available, not applying mock');
  }
} 