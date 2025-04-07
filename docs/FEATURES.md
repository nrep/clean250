# Clean250 Features

This document details the key features of Clean250 and provides Cursor prompts for implementing each feature.

## 1. Smart File Scanning

The file scanning system recursively examines directories to collect comprehensive information about all files.

### Implementation Details
- Recursive directory traversal
- Permission handling for system files
- Skip system directories to avoid permission issues
- Collect metadata: size, dates, extension, path

### Cursor Prompt for File Scanning Feature
```
Implement a recursive file scanning system using Node.js file system APIs that:
1. Traverses directories recursively
2. Collects file metadata (size, creation date, last accessed date, file type)
3. Handles permissions gracefully, skipping inaccessible directories
4. Avoids system directories that might cause issues
5. Returns a structured dataset of all files found
6. Works asynchronously to prevent UI blocking
7. Uses Electron's IPC for communication between main and renderer processes
```

## 2. Intelligent File Analysis

Analyzes files to identify potentially unnecessary ones that could be safely removed.

### Implementation Details
- Categorization based on various criteria
- Detection algorithms for each category
- Size and age thresholds for large unused files
- Pattern matching for temporary files
- Extension identification for installers and archives

### Cursor Prompt for File Analysis
```
Create an intelligent file analysis system in JavaScript/TypeScript that:
1. Identifies large files that haven't been accessed in 6+ months
2. Detects common temporary file extensions (.tmp, .temp, .bak, .cache, .log)
3. Recognizes installer and archive files (.dmg, .exe, .pkg, .iso, .zip, etc.)
4. Finds potential duplicates based on naming patterns
5. Assigns files to multiple categories if applicable
6. Calculates potential space savings
7. Returns enriched file data with analysis results
```

## 3. Modern User Interface

A responsive, intuitive interface for managing files and storage.

### Implementation Details
- Material UI components for consistent design
- Dark mode theme for reduced eye strain
- Responsive layout for various screen sizes
- Interactive elements for selection and filtering
- Data visualization for space usage

### Cursor Prompt for UI Implementation
```
Design a modern, responsive React UI with Material UI components that:
1. Has a clean, dark-themed interface
2. Includes a directory selector and scan button
3. Shows a loading indicator during scanning operations
4. Displays a summary of scan results with statistics
5. Provides file filtering by category with tabs and chips
6. Shows files in a sortable, selectable table with metadata
7. Includes a pie chart showing space usage by category
8. Has a deletion button with count and size indicators
9. Features responsive design for different screen sizes
10. Includes alerts and notifications for important actions
```

## 4. File Listing and Selection

Displays files with rich metadata and allows multi-selection for operations.

### Implementation Details
- Sortable table with comprehensive file information
- Multi-select functionality
- Visual indicators for categorized files
- File path and metadata display

### Cursor Prompt for File Listing
```
Implement a React component for file listing that:
1. Displays files in a sortable table with columns for name, size, date, categories
2. Allows selecting multiple files via checkboxes
3. Shows file details including full path in a compact way
4. Visually highlights different file categories with appropriate colors
5. Supports "select all" functionality
6. Calculates total size of selected files
7. Truncates long paths with ellipsis but shows full path on hover
8. Efficiently handles large numbers of files
```

## 5. Category Filtering

Allows users to filter files by category for easier management.

### Implementation Details
- Category chips with counts and size information
- Toggle filtering by category
- Visual indicators for active filters
- Automatic calculation of filtered file statistics

### Cursor Prompt for Category Filters
```
Create a file category filtering system in React that:
1. Shows available categories as interactive chips
2. Displays the count of files in each category
3. Shows total size of files in each category
4. Allows toggling filters on/off by clicking
5. Visually indicates active filters
6. Updates the file list in real-time when filters change
7. Calculates and displays statistics for the currently filtered set
8. Uses appropriate icons for each category type
```

## 6. Storage Analytics

Visual representation of storage usage and potential savings.

### Implementation Details
- Pie chart for space usage visualization
- Statistics calculations for total and cleanable storage
- Dynamic updates based on selection and filtering

### Cursor Prompt for Storage Analytics
```
Implement storage analytics visualization using Recharts that:
1. Shows a pie chart of storage usage by category
2. Displays total size and file count statistics
3. Indicates potential space savings from cleanable files
4. Updates dynamically based on current selection
5. Includes tooltips with detailed information on hover
6. Uses appropriate colors to distinguish different categories
7. Shows percentage calculations for better context
```

## 7. Safe File Deletion

Securely removes selected files with proper error handling.

### Implementation Details
- Batch deletion with progress feedback
- Error handling for locked or permission-restricted files
- Success/failure reporting
- UI updates after deletion

### Cursor Prompt for File Deletion
```
Create a safe file deletion system using Electron's file system APIs that:
1. Deletes multiple files in batch mode
2. Handles errors gracefully for each file
3. Reports success and failure counts
4. Updates the UI after deletion
5. Prevents accidental deletion with confirmation
6. Gracefully handles permission issues
7. Provides detailed error messages for debugging
8. Removes deleted files from the UI immediately
```

## 8. Directory Selection

Allows users to choose which directory to scan.

### Implementation Details
- Native file system dialog integration
- Path validation and display
- User-friendly directory selection experience

### Cursor Prompt for Directory Selection
```
Implement a directory selection feature using Electron's dialog API that:
1. Opens a native file system dialog for selecting directories
2. Displays the selected path in the UI
3. Validates the selection for readability
4. Prepares the system for scanning after selection
5. Resets previous scan results when a new directory is selected
6. Handles cancellation gracefully
7. Shows common locations as quick-access options
``` 