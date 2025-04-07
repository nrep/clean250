# Clean250 Usage Guide

This document provides detailed instructions on how to use the Clean250 Storage Optimizer application.

## Getting Started

### Installation

1. Download the latest release for your operating system from the releases page.
2. Install the application:
   - **Windows**: Run the installer (.exe) and follow the prompts
   - **macOS**: Mount the disk image (.dmg) and drag the app to Applications
   - **Linux**: Use the package manager to install the .deb or .rpm file

### First Launch

When you first launch Clean250, you'll see the main interface with a prompt to select a directory to scan.

## Basic Usage

### Scanning a Directory

1. Click the **Select Directory** button in the main interface.
2. Use the native file browser to navigate to the directory you want to scan.
3. Click "Open" to select the directory.
4. Click the **Scan Now** button to begin scanning.
5. A progress indicator will appear during scanning.
6. Once complete, you'll see a summary of the scan results.

### Understanding the Results

After scanning, you'll see:

- A summary showing total files and storage space
- Potential space savings from cleanable files
- A pie chart visualization of space usage
- A table listing all files found in the scan

### Filtering Files

You can filter the file list in two ways:

1. **Tab Filters**:
   - **All Files**: Shows every file found in the scan
   - **Cleanable Files**: Shows only files identified as potentially unnecessary

2. **Category Filters**:
   - Use the category chips on the left sidebar to filter by specific types
   - Each chip shows the category name and count of files
   - Active filters are highlighted
   - You can combine multiple category filters

### Selecting Files for Deletion

1. Use the checkboxes in the file list to select individual files
2. Use the checkbox in the column header to select/deselect all files
3. The total size of selected files is shown below the Delete button
4. Selected files remain highlighted until deleted or deselected

### Deleting Files

1. After selecting files, click the **Delete Selected** button
2. Confirm the deletion when prompted
3. The application will attempt to delete all selected files
4. A notification will show the results of the deletion
5. The file list will update automatically to reflect changes

## Advanced Features

### Understanding File Categories

Clean250 categorizes files into several types:

- **Large Unused Files**: Files over 100MB that haven't been accessed in 6+ months
- **Temporary Files**: Files with extensions like .tmp, .temp, .bak, .cache, .log
- **Installers & Archives**: Files with extensions like .dmg, .exe, .pkg, .iso, .zip
- **Potential Duplicates**: Files with naming patterns that suggest they might be duplicates

### Interpreting File Data

The file list provides detailed information about each file:

- **Name**: The filename
- **Path**: The full file path (truncated with hover to see more)
- **Size**: The file size in human-readable format
- **Categories**: Tags showing which categories the file belongs to
- **Last Modified**: When the file was last changed

### Storage Analytics

The summary section provides important storage analytics:

- **Total Files**: Number of files found in the scan
- **Total Size**: Combined size of all files
- **Potential Savings**: Space that could be freed by removing cleanable files
- **Percentage**: What percentage of total space could be saved
- **Pie Chart**: Visual representation of needed vs. cleanable space

## Tips for Effective Use

- Start with smaller directories before scanning entire drives
- Pay special attention to large unused files for maximum space savings
- Be cautious when deleting system files or files in system directories
- Use the category filters to focus on specific types of unnecessary files
- Consider your needs before deleting installer files (you might need them later)
- For potential duplicates, verify they are truly duplicates before deletion
- Periodically re-scan directories to find newly accumulated unnecessary files

## Troubleshooting

### Common Issues

- **Slow Scanning**: Large directories with many files will take longer to scan
- **Permission Errors**: Some files may not be accessible due to system permissions
- **Failed Deletions**: Files in use by the system cannot be deleted

### Solutions

- For slow scanning, try scanning smaller subdirectories instead of entire drives
- Run the application with administrator/root privileges for better access
- Close applications that might be using files before attempting deletion
- Restart the application if it becomes unresponsive during a scan

## Getting Help

If you encounter issues not covered in this guide:

- Check the project's GitHub repository for known issues
- Submit a new issue with details about your problem
- Contact the developer at support@clean250.com 