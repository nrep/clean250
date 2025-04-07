# Clean250 Architecture

This document provides an overview of the Clean250 application architecture, including component structure, data flow, and key technologies.

## Application Structure

The application is built using Electron with React, allowing it to run as a native desktop application while leveraging web technologies for the user interface.

```
clean250/
├── public/              # Public assets and Electron main process
│   ├── electron.js      # Main Electron process
│   ├── preload.js       # Preload script for secure IPC
│   └── index.html       # HTML template
├── src/                 # React source code
│   ├── components/      # UI components
│   │   ├── CategoryFilters.tsx  # File category filters
│   │   ├── FileList.tsx         # File listing table
│   │   └── ScanSummary.tsx      # Summary and statistics
│   ├── App.tsx          # Main application component
│   └── index.tsx        # Entry point
└── package.json         # Dependencies and scripts
```

## Process Architecture

Clean250 uses Electron's multi-process architecture:

1. **Main Process (electron.js)**
   - Manages native OS interactions
   - Handles file system operations
   - Coordinates IPC with renderer process
   - Controls application lifecycle

2. **Renderer Process (React application)**
   - Renders the user interface
   - Manages application state
   - Communicates with main process via IPC

3. **Preload Script (preload.js)**
   - Securely exposes main process APIs to renderer
   - Provides context isolation for security
   - Implements helper functions for file analysis

## Data Flow

1. User selects a directory to scan via UI
2. Request is sent to main process via IPC
3. Main process scans directory and returns file data
4. Renderer process analyzes files and updates UI
5. User selects files for deletion
6. Deletion request sent to main process via IPC
7. Main process performs deletion and returns results
8. UI updates to reflect changes

## Key Technologies

### Electron
- Provides cross-platform desktop capabilities
- Manages native OS interactions
- Handles file system operations

### React & TypeScript
- Component-based UI architecture
- Strong typing for improved reliability
- State management for application data

### Material UI
- Consistent, modern UI components
- Responsive design capabilities
- Dark mode theme

### Recharts
- Data visualization for storage analytics
- Pie charts for space usage representation

## Security Considerations

- **Context Isolation**: The preload script uses context isolation to prevent direct access to Node.js or Electron APIs
- **Content Security Policy**: Restricts what resources can be loaded
- **File System Access**: Limited to explicit user actions
- **Safe Deletion**: Confirmation before file deletion

## Performance Optimizations

- **Async File Scanning**: Directory scanning is performed asynchronously to prevent UI blocking
- **Virtualized Lists**: File lists use virtualization for handling large datasets
- **Lazy Loading**: Components are loaded only when needed
- **Throttled Analysis**: File analysis is performed in batches to maintain responsiveness 