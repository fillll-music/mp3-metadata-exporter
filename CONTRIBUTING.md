# Contributing to MP3 Metadata Exporter

Thank you for your interest in contributing to MP3 Metadata Exporter! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:

- A clear description of the problem
- Steps to reproduce the issue
- Your operating system and version
- Electron version (if applicable)
- Any relevant error messages or screenshots

### Suggesting Features

We welcome feature suggestions! Please create an issue with:

- A clear description of the feature
- Why you think it would be useful
- How you think it should work
- Any relevant mockups or examples

### Code Contributions

1. **Fork the repository** and create a new branch for your feature or bug fix
2. **Make your changes** following the coding standards below
3. **Test your changes** thoroughly
4. **Submit a pull request** with a clear description of your changes

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mp3-metadata-exporter.git
   cd mp3-metadata-exporter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Project Structure

```
mp3-metadata-exporter/
├── main.js           # Main Electron process
├── renderer.js       # Renderer process (UI logic)
├── index.html        # Main application window
├── help.html         # Help/documentation window
├── package.json      # Project configuration
├── build/            # Build resources (icons, etc.)
└── dist/             # Built application files (generated)
```

## Coding Standards

### JavaScript

- Use ES6+ features where appropriate
- Follow consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add comments for complex logic
- Use async/await for asynchronous operations

### HTML/CSS

- Use semantic HTML elements
- Follow consistent indentation
- Use meaningful class names
- Ensure accessibility (ARIA labels, proper headings)

### Electron-specific

- Keep main process code in `main.js`
- Keep renderer process code in `renderer.js`
- Use IPC (Inter-Process Communication) appropriately
- Handle errors gracefully

## Testing

### Manual Testing

Before submitting a pull request, please test:

1. **Basic functionality**: Can you select a directory and extract metadata?
2. **Error handling**: Test with invalid directories or corrupted files
3. **UI responsiveness**: Does the interface work smoothly?
4. **Cross-platform**: Test on different operating systems if possible

### Automated Testing

Currently, the project relies on manual testing. We welcome contributions to add automated testing!

## Building

Test that your changes work in the built application:

```bash
# Build for current platform
npm run dist

# Test the built application
# Navigate to dist/ directory and run the executable
```

## Pull Request Guidelines

### Before Submitting

- [ ] Test your changes thoroughly
- [ ] Ensure your code follows the coding standards
- [ ] Write clear commit messages
- [ ] Update documentation if needed
- [ ] Make sure the build works

### Pull Request Description

Include in your PR description:

- What changes you made
- Why you made them
- How to test the changes
- Any breaking changes
- Screenshots (if UI changes)

### Example PR Template

```
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested on Windows
- [ ] Tested on macOS
- [ ] Tested on Linux
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]
```

## Code of Conduct

Please note that this project follows a Code of Conduct. We expect all contributors to be respectful and professional in their interactions.

### Our Standards

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn and contribute
- Keep discussions focused on the project

## Getting Help

If you need help with development:

- Check existing issues and discussions
- Create a new issue with the "question" label
- Reach out to maintainers

## Recognition

Contributors will be recognized in:

- The project's README
- Release notes for significant contributions
- GitHub's contributor statistics

Thank you for contributing to MP3 Metadata Exporter! 🎵 