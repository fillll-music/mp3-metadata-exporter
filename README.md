# MP3 Metadata Exporter

A desktop application built with Electron for extracting and exporting ID3 tag metadata from MP3 files to JSON format.

## Features

- 🎵 **Extract ID3 metadata** from MP3 files including title, artist, album, genre, year, and track number
- 📁 **Batch processing** - scan entire directories of MP3 files
- 🔍 **Preview mode** - sample a subset of files before full processing
- 📊 **Progress tracking** - real-time progress updates during metadata extraction
- 💾 **JSON export** - save metadata to structured JSON files
- 🖥️ **Cross-platform** - works on Windows, macOS, and Linux
- 🚀 **Auto-updates** - automatic updates when new versions are available

## Screenshots

![MP3 Metadata Exporter Interface](https://via.placeholder.com/800x600?text=MP3+Metadata+Exporter+Interface)

## Installation

### Download Pre-built Binaries

Download the latest release for your operating system from the [Releases](https://github.com/fillll-music/mp3-metadata-exporter/releases) page:

- **Windows**: `mp3-metadata-exporter-setup.exe` or `mp3-metadata-exporter-portable.exe`
- **macOS**: `mp3-metadata-exporter.dmg`
- **Linux**: `mp3-metadata-exporter.AppImage` or `mp3-metadata-exporter.deb`

### Build from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/fillll-music/mp3-metadata-exporter.git
   cd mp3-metadata-exporter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

4. **Build for production**
   ```bash
   npm run dist
   ```

## Usage

1. **Launch the application**
2. **Select a directory** containing MP3 files
3. **Preview metadata** from a sample of files to verify extraction
4. **Process all files** in the directory
5. **Export to JSON** - choose output location and save metadata

### Command Line Interface

The application also supports basic command-line usage:

```bash
# Start the application
electron .

# Build distributables
npm run dist
```

## Supported Metadata Fields

The application extracts the following ID3 tag information:

- **Title** - Song title
- **Artist** - Artist name(s)
- **Album** - Album name
- **Genre** - Music genre(s)
- **Year** - Release year
- **Track** - Track number
- **Duration** - Song duration in seconds
- **File Path** - Original file location

## JSON Output Format

```json
[
  {
    "path": "song.mp3",
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "genre": ["Pop", "Rock"],
    "year": 2024,
    "track": 1,
    "duration": 180.5
  }
]
```

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm start`

### Project Structure

```
mp3-metadata-exporter/
├── main.js           # Main Electron process
├── renderer.js       # Renderer process (UI logic)
├── index.html        # Main application window
├── help.html         # Help/documentation window
├── package.json      # Project configuration
├── build/            # Build resources (icons, etc.)
└── dist/             # Built application files
```

### Building

```bash
# Build for current platform
npm run dist

# Build for specific platforms
npm run dist -- --win
npm run dist -- --mac
npm run dist -- --linux
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Support

- 🌐 **Website**: [fillll.com](https://fillll.com)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/fillll-music/mp3-metadata-exporter/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/fillll-music/mp3-metadata-exporter/discussions)

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Metadata extraction powered by [music-metadata](https://github.com/borewit/music-metadata)
- Auto-updates via [electron-updater](https://github.com/electron-userland/electron-updater)

---

**© 2024 Fillll. All rights reserved.** 