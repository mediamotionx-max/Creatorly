# 🚀 Prospectoo - Quick Start Guide

Get up and running with Prospectoo in just 5 minutes!

## 📋 Prerequisites

- **Chrome Browser** (latest version)
- **Node.js** 18+ and **npm** 9+
- **OpenAI API Key** (get one at [platform.openai.com](https://platform.openai.com))

## ⚡ Quick Installation

### Step 1: Download & Setup
```bash
# Clone or download the project
git clone https://github.com/prospectoo/chrome-extension.git
cd prospectoo-chrome-extension

# Install backend dependencies
npm run setup
```

### Step 2: Configure API Keys
```bash
# Navigate to backend folder
cd backend

# Copy environment template
cp .env.example .env

# Edit .env file with your OpenAI API key
# Replace 'your_openai_api_key_here' with your actual API key
```

### Step 3: Start the Backend
```bash
# Start the API server
npm run dev
```
You should see: `🚀 Prospectoo API server running on port 3000`

### Step 4: Load Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `prospectoo-chrome-extension` folder
5. The Prospectoo icon should appear in your toolbar! 🎉

## 🎯 First Use

### Find Similar Channels
1. **Go to any YouTube channel** (e.g., https://youtube.com/@mkbhd)
2. **Click the Prospectoo extension icon** in your toolbar
3. **Click "Find Similar Channels"**
4. **Wait 2-5 seconds** for AI processing
5. **Browse 100+ similar channels** with similarity scores and emails!

### Search by Topic
1. **Click the Prospectoo icon**
2. **Enter keywords** in the search box (e.g., "tech review")
3. **Enable "Include email extraction"**
4. **Click search** and get relevant channels instantly

### Export Data
1. **After getting results**, click **"Export"**
2. **Download CSV file** with all channel data
3. **Import into your CRM** or email marketing tool

## 🔧 Troubleshooting

### Extension Not Loading?
```bash
# Check if you're in the right directory
ls -la
# You should see manifest.json, popup.html, etc.

# Reload the extension
# Go to chrome://extensions/ and click the reload icon
```

### Backend Not Starting?
```bash
# Check Node.js version
node --version  # Should be 18+

# Check if port 3000 is available
lsof -i :3000

# Try a different port
PORT=3001 npm run dev
```

### No Results Found?
- ✅ Make sure you're on a YouTube **channel page** (not a video)
- ✅ Verify the backend server is running (check terminal)
- ✅ Check your OpenAI API key in `.env` file
- ✅ Ensure you have API credits available

### API Errors?
```bash
# Check your OpenAI API key
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.openai.com/v1/models

# Check backend logs
# Look at the terminal where you ran 'npm run dev'
```

## 🎨 UI Overview

### Main Popup
- **Header**: Logo, status indicator
- **Current Channel**: Shows detected YouTube channel
- **Search Box**: Find channels by keywords
- **Results List**: Similar channels with similarity scores
- **Export Button**: Download data as CSV

### Key Features
- 🔍 **Real-time scanning**: Background processing
- 📧 **Email extraction**: Automatic contact detection  
- 📊 **Similarity scoring**: AI-powered matching
- 📈 **Channel metrics**: Subscribers, views, engagement
- 🎯 **Export options**: CSV download for campaigns

## 📚 Next Steps

### Customize Settings
- Enable/disable real-time mode
- Adjust similarity thresholds  
- Configure email extraction preferences

### Explore Advanced Features
- **Bulk Processing**: Process multiple channels
- **Advanced Filters**: Filter by subscribers, engagement
- **Analytics Dashboard**: Detailed channel insights

### Get More Channels
- Try different search keywords
- Lower similarity thresholds for more results
- Use the real-time mode for continuous discovery

## 💡 Pro Tips

### Maximize Results
- **Use specific keywords**: "tech review" vs just "tech"
- **Try channel variations**: Different channel types in your niche
- **Check competitor channels**: Find their similar channels
- **Export regularly**: Build your influencer database over time

### Email Success
- **Check multiple sources**: Emails from bio, videos, social links
- **Verify emails**: Always double-check before outreach
- **Respect privacy**: Only use publicly available information
- **Follow up appropriately**: Professional outreach practices

### Performance Optimization  
- **Close unused tabs**: Better extension performance
- **Regular updates**: Keep extension and backend updated
- **Monitor API usage**: Track OpenAI API consumption
- **Clear cache**: Refresh data periodically

## 🆘 Need Help?

### Quick Fixes
- **Restart Chrome** if extension becomes unresponsive
- **Reload extension** at chrome://extensions/
- **Check console** (F12) for error messages
- **Restart backend server** if API calls fail

### Community Support
- 📧 **Email**: support@prospectoo.com
- 💬 **Discord**: [Join our community](https://discord.gg/prospectoo)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/prospectoo/issues)
- 📖 **Documentation**: Full README.md for detailed info

## 🎉 You're Ready!

Congratulations! You now have a powerful AI-driven YouTube channel discovery tool at your fingertips. 

**Start finding amazing channels and growing your network! 🚀**

---

**Happy channel hunting!** 🎯

*Made with ❤️ by the Prospectoo Team*