# GhostOnTheSearchBar

Source code for the Chrome extension "GhostOnTheSearchBar".

## Overview

GhostOnTheSearchBar is a Chrome extension that adds selected text to a search toolbar and executes Google searches when text is selected on web pages.

## Main Features

- **Text Selection Detection**: Ghost interface appears when text is selected on the page
- **Scroll Up**: Add selected text to search toolbar
- **Scroll Down**: Execute Google search immediately with selected text
- **Search Toolbar**: Accumulate multiple search terms for searching
- **Multi-language Support**: Japanese and English UI support
- **Customization**: Theme settings and drag-to-move functionality

## Installation

### From Chrome Web Store
1. Search for "GhostOnTheSearchBar" on [Chrome Web Store](https://chrome.google.com/webstore/)
2. Click "Add to Chrome"
3. Installation complete

### From Developer Mode
1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode"
3. Click "Load unpacked extension"
4. Select this folder

## How to Use

1. **Text Selection**: Drag to select text on web pages
2. **Ghost Interface**: Semi-transparent interface appears over selected area
3. **Scroll Up**: Scroll mouse wheel up to add to search toolbar
4. **Scroll Down**: Scroll mouse wheel down to search immediately
5. **Search Toolbar**: Accumulate multiple words for searching

## Technical Specifications

- **Manifest Version**: 3
- **Supported Browser**: Google Chrome
- **Permissions**: activeTab, storage
- **Host Permissions**: https://www.google.com/*
- **Multi-language Support**: Japanese and English

## File Structure

```
GhostOnTheSearchBar/
├── manifest.json          # Extension configuration
├── content.js            # Main logic
├── content.css           # Stylesheet
├── background.js         # Background processing
├── popup.html           # Popup UI
├── popup.js             # Popup logic
├── _locales/            # Multi-language support
│   ├── en/              # English
│   └── ja/              # Japanese
├── icons/               # Icon files
├── privacy-policy.html  # Privacy policy
└── README.md            # This file
```

## Privacy

This extension respects user privacy and strives to protect personal information.

- **Data Collection**: Only selected text and usage statistics
- **External Transmission**: Only when executing Google searches
- **Data Storage**: Local device only

Please check the [Privacy Policy](privacy-policy.html) for details.

## For Developers

### Required Environment
- Google Chrome
- Text editor

### Development Process
1. Clone the repository
2. Enable developer mode at `chrome://extensions/`
3. Select folder with "Load unpacked extension"
4. Edit code and save
5. Click "Update" button on the extension

### How to Contribute
1. Fork this repository
2. Create a branch for feature additions or bug fixes
3. Commit changes
4. Create a pull request

## License

This project is released under the MIT License.

## Contact

Please report bugs or feature requests on the GitHub Issues page.

## Update History

- **v1.0.2**: Multi-language support, privacy policy added
- **v1.0.1**: Bug fixes and improvements
- **v1.0.0**: Initial release

---

© 2024 GhostOnTheSearchBar. All rights reserved.


