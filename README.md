# Prospectoo - YouTube Channel Analyzer & Email Finder

A powerful Chrome extension that analyzes YouTube channels, finds similar channels using AI, and extracts contact emails - all without requiring user sign-in or subscription fees.

## 🚀 Features

### Core Features
- **Real-time Channel Scanning**: Automatically detects and analyzes YouTube channels as you browse
- **AI-Powered Similar Channel Discovery**: Uses advanced AI algorithms to find channels with similar content and audience
- **Email Extraction**: Automatically finds and extracts contact emails from channel descriptions
- **Topic-based Search**: Search for channels by keywords, topics, or niches
- **Advanced Filtering**: Filter results by subscriber count, category, language, and region

### UI/UX Features
- **Modern Interface**: Clean, intuitive design inspired by leading influencer marketing tools
- **Tabbed Navigation**: Easy switching between Scanner, Similar Channels, and Search functions
- **Real-time Updates**: Live data extraction and analysis
- **Responsive Design**: Works perfectly on all screen sizes
- **Dark Mode Support**: Automatic theme switching based on system preferences

### Technical Features
- **Multiple AI Providers**: Support for OpenAI, Anthropic Claude, and Google AI
- **YouTube API Integration**: Enhanced data accuracy with official YouTube API
- **Content Script Integration**: Seamless integration with YouTube pages
- **Local Storage**: Secure storage of settings and preferences
- **Rate Limiting**: Intelligent API usage to prevent quota exhaustion

## 📦 Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/prospectoo.git
   cd prospectoo
   ```

2. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the project folder
   - The extension will appear in your extensions list

3. **Configure API Keys**
   - Click the Prospectoo icon in your Chrome toolbar
   - Go to Settings (gear icon)
   - Add your API keys:
     - **YouTube API Key**: For enhanced channel data
     - **AI Provider API Key**: For similar channel recommendations

### Getting API Keys

#### YouTube Data API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Restrict the key to YouTube Data API v3

#### AI Provider API Keys
- **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
- **Google AI**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🎯 Usage

### Basic Usage

1. **Navigate to any YouTube channel**
   - The extension automatically detects channel pages
   - A floating action button appears on channel pages

2. **View Channel Analysis**
   - Click the extension icon or floating button
   - View detailed channel metrics and information
   - See extracted email addresses (if available)

3. **Find Similar Channels**
   - Click "Find Similar Channels" button
   - AI analyzes the channel and finds similar creators
   - Browse results with similarity scores and contact info

4. **Search by Topic**
   - Switch to the "Search" tab
   - Enter keywords or topics
   - Apply filters for better results
   - Find channels in your specific niche

### Advanced Features

#### Custom Filters
- **Subscriber Range**: Filter by subscriber count (1K-10K, 10K-100K, etc.)
- **Category**: Filter by content category (Gaming, Tech, Lifestyle, etc.)
- **Language**: Filter by channel language
- **Region**: Filter by channel's country

#### Batch Operations
- **Export Results**: Export channel lists to CSV
- **Bulk Email Extraction**: Extract emails from multiple channels
- **Comparison Mode**: Compare multiple channels side-by-side

## ⚙️ Configuration

### Settings Options

#### API Configuration
- **YouTube API Key**: Required for enhanced channel data
- **AI Provider**: Choose between OpenAI, Anthropic, or Google AI
- **AI API Key**: Required for similar channel recommendations

#### Behavior Settings
- **Auto-scan Channels**: Automatically analyze channels when visiting
- **Email Notifications**: Show notifications when emails are found
- **Cache Duration**: How long to store channel data locally

#### Privacy Settings
- **Data Storage**: All data is stored locally on your device
- **No Tracking**: Extension doesn't track your browsing activity
- **No Sign-in Required**: Use all features without creating accounts

## 🔧 Development

### Project Structure
```
prospectoo/
├── manifest.json          # Extension manifest
├── popup.html             # Main popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── background.js          # Service worker
├── content.js             # Content script for YouTube pages
├── content.css            # Content script styles
├── api/
│   ├── youtube.js         # YouTube API integration
│   └── ai.js              # AI service integration
├── icons/                 # Extension icons
└── README.md              # This file
```

### Building from Source

1. **Install dependencies**
   ```bash
   # No build process required - pure JavaScript
   ```

2. **Development mode**
   - Load the extension in Chrome as described above
   - Make changes to the code
   - Reload the extension in Chrome to see changes

3. **Testing**
   - Test on various YouTube channels
   - Verify API integrations work correctly
   - Test UI responsiveness on different screen sizes

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📊 API Usage & Limits

### YouTube Data API
- **Free Quota**: 10,000 units per day
- **Cost per Request**: ~1-5 units depending on data requested
- **Rate Limits**: 100 requests per 100 seconds per user

### AI Provider Limits
- **OpenAI**: Pay-per-use, ~$0.002 per 1K tokens
- **Anthropic**: Pay-per-use, ~$0.008 per 1K tokens
- **Google AI**: Free tier available, then pay-per-use

## 🛡️ Privacy & Security

### Data Handling
- **Local Storage Only**: All data stored on your device
- **No External Servers**: Direct API calls to YouTube and AI providers
- **No User Tracking**: Extension doesn't collect personal information
- **Secure API Keys**: Keys stored securely in Chrome's sync storage

### Permissions Explained
- **activeTab**: Access current tab to analyze YouTube channels
- **storage**: Store settings and preferences locally
- **scripting**: Inject content scripts on YouTube pages
- **host permissions**: Access YouTube and API endpoints

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Working
- Check if you're on a YouTube channel page
- Verify the extension is enabled in Chrome
- Check browser console for error messages

#### No Similar Channels Found
- Ensure AI API key is configured correctly
- Check if you have sufficient API quota
- Try with a different channel

#### Email Extraction Not Working
- Emails must be in channel description or About section
- Some channels may not have public contact information
- Check if channel has recent activity

### Getting Help

1. **Check Console Logs**
   - Press F12 in Chrome
   - Look for error messages in Console tab

2. **Verify API Keys**
   - Test API keys independently
   - Check quota usage in respective consoles

3. **Report Issues**
   - Create an issue on GitHub with detailed description
   - Include browser version and error messages

## 📈 Roadmap

### Version 1.1
- [ ] Bulk channel analysis
- [ ] Export functionality (CSV, JSON)
- [ ] Channel comparison features
- [ ] Advanced analytics dashboard

### Version 1.2
- [ ] Instagram and TikTok support
- [ ] Automated outreach templates
- [ ] CRM integration
- [ ] Team collaboration features

### Version 2.0
- [ ] Web application version
- [ ] API for third-party integrations
- [ ] Advanced AI models
- [ ] Enterprise features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by nanoinfluencer.ai and similartube.co
- Built with modern web technologies
- Thanks to the open-source community

## 📞 Support

- **Email**: support@prospectoo.com
- **GitHub Issues**: [Create an issue](https://github.com/yourusername/prospectoo/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/prospectoo/wiki)

---

**Made with ❤️ for content creators and marketers**