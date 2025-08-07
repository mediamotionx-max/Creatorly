// Background Service Worker for Prospectoo Extension
class ProspectooBackground {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupContextMenus();
    }

    setupEventListeners() {
        // Extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // Messages from content scripts and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });

        // Context menu clicks
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });
    }

    async setupContextMenus() {
        try {
            // Remove all existing context menus
            await chrome.contextMenus.removeAll();

            // Add context menu for YouTube channel pages
            chrome.contextMenus.create({
                id: 'analyze-channel',
                title: 'Analyze with Prospectoo',
                contexts: ['page'],
                documentUrlPatterns: [
                    'https://*.youtube.com/c/*',
                    'https://*.youtube.com/channel/*',
                    'https://*.youtube.com/@*',
                    'https://*.youtube.com/user/*'
                ]
            });

            // Add context menu for selected text
            chrome.contextMenus.create({
                id: 'search-channels',
                title: 'Search YouTube channels for "%s"',
                contexts: ['selection']
            });
        } catch (error) {
            console.error('Failed to setup context menus:', error);
        }
    }

    handleInstallation(details) {
        console.log('Prospectoo extension installed:', details.reason);

        // Set default settings
        if (details.reason === 'install') {
            const defaultSettings = {
                youtubeApiKey: '',
                aiProvider: 'openai',
                aiApiKey: '',
                autoScan: false,
                emailNotifications: true
            };

            chrome.storage.sync.set(defaultSettings);

            // Open welcome page or show notification
            this.showWelcomeNotification();
        }
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        // Check if the tab finished loading and is a YouTube channel page
        if (changeInfo.status === 'complete' && tab.url) {
            const isYouTubeChannel = this.isYouTubeChannelPage(tab.url);
            
            if (isYouTubeChannel) {
                // Check if auto-scan is enabled
                const settings = await chrome.storage.sync.get(['autoScan']);
                
                if (settings.autoScan) {
                    // Inject content script and scan automatically
                    this.autoScanChannel(tabId);
                }

                // Update extension badge
                chrome.action.setBadgeText({
                    tabId: tabId,
                    text: '●'
                });
                chrome.action.setBadgeBackgroundColor({
                    tabId: tabId,
                    color: '#667eea'
                });
            } else {
                // Clear badge for non-YouTube pages
                chrome.action.setBadgeText({
                    tabId: tabId,
                    text: ''
                });
            }
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'scanChannel':
                    const channelData = await this.scanChannel(request.data);
                    sendResponse({ success: true, data: channelData });
                    break;

                case 'findSimilarChannels':
                    const similarChannels = await this.findSimilarChannels(request.data);
                    sendResponse({ success: true, data: similarChannels });
                    break;

                case 'searchChannels':
                    const searchResults = await this.searchChannels(request.data);
                    sendResponse({ success: true, data: searchResults });
                    break;

                case 'extractEmails':
                    const emails = await this.extractEmails(request.data);
                    sendResponse({ success: true, data: emails });
                    break;

                case 'getChannelMetrics':
                    const metrics = await this.getChannelMetrics(request.data);
                    sendResponse({ success: true, data: metrics });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleContextMenuClick(info, tab) {
        switch (info.menuItemId) {
            case 'analyze-channel':
                // Open popup or trigger analysis
                chrome.action.openPopup();
                break;

            case 'search-channels':
                // Search for channels based on selected text
                const query = info.selectionText;
                this.searchChannelsByText(query, tab);
                break;
        }
    }

    isYouTubeChannelPage(url) {
        const channelPatterns = [
            /youtube\.com\/c\/[^\/]+/,
            /youtube\.com\/channel\/[^\/]+/,
            /youtube\.com\/@[^\/]+/,
            /youtube\.com\/user\/[^\/]+/
        ];

        return channelPatterns.some(pattern => pattern.test(url));
    }

    async autoScanChannel(tabId) {
        try {
            // Inject content script to extract channel data
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: this.extractChannelDataScript
            });

            if (results && results[0] && results[0].result) {
                const channelData = results[0].result;
                
                // Store channel data for popup access
                await chrome.storage.local.set({
                    currentChannelData: channelData,
                    lastScanTime: Date.now()
                });

                // Show notification if email found
                if (channelData.email) {
                    const settings = await chrome.storage.sync.get(['emailNotifications']);
                    if (settings.emailNotifications) {
                        this.showEmailNotification(channelData.email, channelData.name);
                    }
                }
            }
        } catch (error) {
            console.error('Auto-scan failed:', error);
        }
    }

    extractChannelDataScript() {
        // This function runs in the context of the YouTube page
        try {
            const channelName = document.querySelector('#channel-name #text')?.textContent?.trim() ||
                              document.querySelector('.ytd-channel-name #text')?.textContent?.trim() ||
                              document.querySelector('h1.ytd-channel-name')?.textContent?.trim();

            const subscriberCount = document.querySelector('#subscriber-count')?.textContent?.trim() ||
                                   document.querySelector('.ytd-c4-tabbed-header-renderer #subscriber-count')?.textContent?.trim();

            const avatar = document.querySelector('#channel-header-container img')?.src ||
                          document.querySelector('.ytd-c4-tabbed-header-renderer img')?.src;

            const description = document.querySelector('#description')?.textContent?.trim() ||
                               document.querySelector('.ytd-channel-about-metadata-renderer #description')?.textContent?.trim();

            // Extract email from description
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const emails = description ? description.match(emailRegex) : null;

            // Get additional metrics
            const videoCount = document.querySelector('.ytd-channel-video-player-renderer .style-scope')?.textContent;
            const viewCount = document.querySelector('.view-count')?.textContent;

            return {
                name: channelName,
                subscribers: subscriberCount,
                avatar: avatar,
                description: description,
                email: emails ? emails[0] : null,
                videoCount: videoCount,
                viewCount: viewCount,
                url: window.location.href,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error extracting channel data:', error);
            return null;
        }
    }

    async scanChannel(channelData) {
        // Enhanced channel scanning with API integration
        try {
            const settings = await chrome.storage.sync.get(['youtubeApiKey']);
            
            if (settings.youtubeApiKey) {
                // Use YouTube API for more detailed information
                const apiData = await this.fetchChannelFromAPI(channelData.channelId, settings.youtubeApiKey);
                return { ...channelData, ...apiData };
            }

            return channelData;
        } catch (error) {
            console.error('Channel scan failed:', error);
            return channelData;
        }
    }

    async fetchChannelFromAPI(channelId, apiKey) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
            );

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                const channel = data.items[0];
                return {
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    subscriberCount: channel.statistics.subscriberCount,
                    videoCount: channel.statistics.videoCount,
                    viewCount: channel.statistics.viewCount,
                    publishedAt: channel.snippet.publishedAt,
                    thumbnails: channel.snippet.thumbnails
                };
            }

            return {};
        } catch (error) {
            console.error('YouTube API fetch failed:', error);
            return {};
        }
    }

    async findSimilarChannels(channelData) {
        // AI-powered similar channel discovery
        try {
            const settings = await chrome.storage.sync.get(['aiProvider', 'aiApiKey']);
            
            if (!settings.aiApiKey) {
                throw new Error('AI API key not configured');
            }

            // Call AI service to find similar channels
            const similarChannels = await this.callAIService(
                settings.aiProvider,
                settings.aiApiKey,
                'findSimilar',
                channelData
            );

            return similarChannels;
        } catch (error) {
            console.error('Similar channels search failed:', error);
            return this.getMockSimilarChannels(channelData);
        }
    }

    async searchChannels(searchQuery) {
        // Search for channels by topic/keyword
        try {
            const settings = await chrome.storage.sync.get(['youtubeApiKey']);
            
            if (settings.youtubeApiKey) {
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(searchQuery)}&key=${settings.youtubeApiKey}&maxResults=20`
                );

                const data = await response.json();
                return this.processSearchResults(data.items);
            }

            return this.getMockSearchResults(searchQuery);
        } catch (error) {
            console.error('Channel search failed:', error);
            return this.getMockSearchResults(searchQuery);
        }
    }

    async callAIService(provider, apiKey, action, data) {
        // Integration with AI services (OpenAI, Anthropic, etc.)
        const prompts = {
            findSimilar: `Find YouTube channels similar to "${data.name}" which has ${data.subscribers} subscribers and focuses on: ${data.description?.substring(0, 200)}. Return a JSON array of similar channels with name, estimated subscriber count, and reason for similarity.`
        };

        switch (provider) {
            case 'openai':
                return await this.callOpenAI(apiKey, prompts[action]);
            case 'anthropic':
                return await this.callAnthropic(apiKey, prompts[action]);
            default:
                throw new Error('Unsupported AI provider');
        }
    }

    async callOpenAI(apiKey, prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        try {
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            return [];
        }
    }

    async callAnthropic(apiKey, prompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        
        try {
            return JSON.parse(data.content[0].text);
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            return [];
        }
    }

    getMockSimilarChannels(channelData) {
        // Fallback mock data
        return [
            {
                name: "Similar Channel 1",
                subscribers: "150K",
                avatar: "https://via.placeholder.com/40",
                category: "Technology",
                similarity: 95,
                email: "contact@similar1.com"
            },
            {
                name: "Similar Channel 2",
                subscribers: "89K",
                avatar: "https://via.placeholder.com/40",
                category: "Technology",
                similarity: 88,
                email: null
            }
        ];
    }

    getMockSearchResults(query) {
        return [
            {
                name: `${query} Expert`,
                subscribers: "75K",
                avatar: "https://via.placeholder.com/40",
                category: "Education",
                email: `contact@${query.toLowerCase()}expert.com`
            }
        ];
    }

    processSearchResults(items) {
        if (!items) return [];

        return items.map(item => ({
            name: item.snippet.title,
            description: item.snippet.description,
            avatar: item.snippet.thumbnails?.default?.url,
            channelId: item.snippet.channelId,
            publishedAt: item.snippet.publishedAt
        }));
    }

    async extractEmails(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = text.match(emailRegex) || [];
        
        // Remove duplicates and validate
        const uniqueEmails = [...new Set(emails)].filter(email => 
            this.isValidEmail(email)
        );

        return uniqueEmails;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async getChannelMetrics(channelId) {
        // Get detailed channel metrics
        try {
            const settings = await chrome.storage.sync.get(['youtubeApiKey']);
            
            if (settings.youtubeApiKey) {
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${settings.youtubeApiKey}`
                );

                const data = await response.json();
                return data.items?.[0]?.statistics || {};
            }

            return {};
        } catch (error) {
            console.error('Failed to get channel metrics:', error);
            return {};
        }
    }

    showWelcomeNotification() {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Welcome to Prospectoo!',
            message: 'Your YouTube channel analyzer is ready. Visit any YouTube channel to get started.'
        });
    }

    showEmailNotification(email, channelName) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Email Found!',
            message: `Found email for ${channelName}: ${email}`
        });
    }

    async searchChannelsByText(query, tab) {
        // Search channels based on selected text
        const results = await this.searchChannels(query);
        
        // Store results and open popup
        await chrome.storage.local.set({
            searchResults: results,
            searchQuery: query
        });

        chrome.action.openPopup();
    }
}

// Initialize the background service
new ProspectooBackground();