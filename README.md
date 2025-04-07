# Clean250 Storage Optimizer

A powerful desktop application that helps users identify and remove unnecessary files to optimize storage space.

## Features

- **Smart File Scanning**: Recursively scan directories to identify all files
- **Intelligent Analysis**: Automatically detect potentially unnecessary files based on:
  - Large files that haven't been accessed in a long time
  - Temporary files
  - Installation packages and archives
  - Potential duplicates
- **Interactive UI**: Modern, user-friendly interface with filters, sorting, and visualizations
- **Safe Deletion**: Secure file deletion with confirmation and recovery information
- **Storage Analytics**: Visual representation of space usage and potential savings

## Technology Stack

- **Electron**: Cross-platform desktop application framework
- **React**: User interface library
- **TypeScript**: Type-safe JavaScript
- **Material UI**: Modern UI components
- **Recharts**: Data visualization

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/clean250.git

# Navigate to the project directory
cd clean250

# Install dependencies
npm install

# Start the application in development mode
npm run electron:dev

# Build the application for production
npm run electron:build
```

## Usage

1. Launch the application
2. Click "Select Directory" to choose which directory to scan
3. Click "Scan Now" to analyze the directory
4. Use the tabs and category filters to browse through the files
5. Select unnecessary files and click "Delete Selected" to remove them

## Development

### Available Scripts

- `npm start`: Start the React development server
- `npm run electron:dev`: Start Electron with React in development mode
- `npm run electron:start`: Start Electron with the current build
- `npm run electron:build`: Build the application for production
- `npm test`: Run tests
- `npm run build`: Build the React application

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
