// Prospectoo Background Service Worker
class ProspectooBackground {
    constructor() {
        this.apiEndpoint = 'http://localhost:3000/api';
        this.channelCache = new Map();
        this.similarityCache = new Map();
        this.rateLimiter = new Map();
        
        this.setupEventListeners();
        this.initializeStorage();
    }

    setupEventListeners() {
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Handle messages from content scripts and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Handle tab updates to detect YouTube navigation
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // Handle storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            this.handleStorageChange(changes, namespace);
        });
    }

    async initializeStorage() {
        try {
            // Initialize default settings
            const defaultSettings = {
                realTimeMode: true,
                includeEmails: true,
                maxResults: 100,
                scanDelay: 1000,
                apiEndpoint: this.apiEndpoint,
                totalScanned: 0,
                totalEmails: 0
            };

            const stored = await chrome.storage.local.get(Object.keys(defaultSettings));
            const toSet = {};

            Object.keys(defaultSettings).forEach(key => {
                if (stored[key] === undefined) {
                    toSet[key] = defaultSettings[key];
                }
            });

            if (Object.keys(toSet).length > 0) {
                await chrome.storage.local.set(toSet);
            }
        } catch (error) {
            console.error('Error initializing storage:', error);
        }
    }

    handleInstallation(details) {
        if (details.reason === 'install') {
            // First time installation
            chrome.tabs.create({
                url: 'https://youtube.com',
                active: true
            });
        } else if (details.reason === 'update') {
            // Extension updated
            this.handleUpdate(details.previousVersion);
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.type) {
                case 'CHANNEL_DATA_EXTRACTED':
                    await this.handleChannelDataExtracted(request.data, sender);
                    sendResponse({ success: true });
                    break;

                case 'FIND_SIMILAR_CHANNELS':
                    const similarChannels = await this.findSimilarChannels(request.channelData, request.options);
                    sendResponse({ success: true, data: similarChannels });
                    break;

                case 'EXTRACT_EMAILS':
                    const emails = await this.extractEmailsFromChannels(request.channels);
                    sendResponse({ success: true, emails });
                    break;

                case 'SEARCH_CHANNELS':
                    const searchResults = await this.searchChannels(request.query, request.options);
                    sendResponse({ success: true, results: searchResults });
                    break;

                case 'GET_CACHED_DATA':
                    const cachedData = await this.getCachedData(request.key);
                    sendResponse({ success: true, data: cachedData });
                    break;

                case 'UPDATE_STATS':
                    await this.updateStats(request.stats);
                    sendResponse({ success: true });
                    break;

                case 'EXPORT_DATA':
                    const exportData = await this.exportData(request.format, request.data);
                    sendResponse({ success: true, data: exportData });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Background message error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleChannelDataExtracted(channelData, sender) {
        try {
            // Cache the channel data
            const cacheKey = channelData.id || channelData.url;
            if (cacheKey) {
                this.channelCache.set(cacheKey, {
                    ...channelData,
                    tabId: sender.tab?.id,
                    timestamp: Date.now()
                });
            }

            // Store in persistent storage
            await this.storeChannelData(channelData);

            // Update extension badge
            if (sender.tab?.id) {
                await this.updateBadge(sender.tab.id, channelData);
            }

        } catch (error) {
            console.error('Error handling channel data:', error);
        }
    }

    async findSimilarChannels(channelData, options = {}) {
        try {
            // Check rate limiting
            if (this.isRateLimited('similarity_search')) {
                throw new Error('Rate limit exceeded. Please wait before searching again.');
            }

            // Check cache first
            const cacheKey = `similarity_${channelData.id || channelData.name}`;
            const cached = this.similarityCache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
                return cached.data;
            }

            // Call AI similarity API
            const similarChannels = await this.callSimilarityAPI(channelData, options);

            // Extract emails if requested
            if (options.includeEmails) {
                const channelsWithEmails = await this.extractEmailsFromChannels(similarChannels);
                similarChannels.forEach((channel, index) => {
                    if (channelsWithEmails[index]?.email) {
                        channel.email = channelsWithEmails[index].email;
                    }
                });
            }

            // Cache results
            this.similarityCache.set(cacheKey, {
                data: similarChannels,
                timestamp: Date.now()
            });

            // Update stats
            await this.updateStats({
                totalScanned: similarChannels.length,
                totalEmails: similarChannels.filter(c => c.email).length
            });

            return similarChannels;

        } catch (error) {
            console.error('Error finding similar channels:', error);
            
            // Fallback to mock data for demo
            return this.generateMockSimilarChannels(channelData);
        }
    }

    async callSimilarityAPI(channelData, options) {
        const response = await fetch(`${this.apiEndpoint}/similarity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Extension-Version': chrome.runtime.getManifest().version
            },
            body: JSON.stringify({
                channel: channelData,
                options: {
                    maxResults: options.maxResults || 100,
                    minSimilarity: options.minSimilarity || 0.7,
                    includeMetrics: true,
                    realTime: options.realTime || false
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.similarChannels || [];
    }

    generateMockSimilarChannels(channelData) {
        // Generate mock similar channels for demo purposes
        const categories = ['Tech', 'Gaming', 'Education', 'Entertainment', 'Lifestyle'];
        const mockChannels = [];

        for (let i = 0; i < 100; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const similarity = Math.floor(Math.random() * 40) + 60; // 60-100% similarity
            
            mockChannels.push({
                id: `mock_channel_${i}`,
                name: `${category} Channel ${i + 1}`,
                handle: `@${category.toLowerCase()}channel${i + 1}`,
                subscribers: this.generateRandomSubscribers(),
                views: this.generateRandomViews(),
                avatar: `https://via.placeholder.com/88x88?text=${category[0]}${i + 1}`,
                url: `https://youtube.com/@${category.toLowerCase()}channel${i + 1}`,
                similarity: similarity,
                engagement: (Math.random() * 8 + 2).toFixed(1) + '%',
                email: Math.random() > 0.4 ? `contact@${category.toLowerCase()}channel${i + 1}.com` : null,
                verified: Math.random() > 0.7,
                category: category,
                recentVideos: Math.floor(Math.random() * 50) + 10,
                avgViews: this.generateRandomViews(),
                joinDate: this.generateRandomJoinDate()
            });
        }

        return mockChannels.sort((a, b) => b.similarity - a.similarity);
    }

    generateRandomSubscribers() {
        const num = Math.random();
        if (num > 0.9) return `${(Math.random() * 5 + 1).toFixed(1)}M subscribers`;
        if (num > 0.7) return `${Math.floor(Math.random() * 900 + 100)}K subscribers`;
        return `${Math.floor(Math.random() * 99 + 1)}K subscribers`;
    }

    generateRandomViews() {
        const num = Math.random();
        if (num > 0.8) return `${Math.floor(Math.random() * 100 + 10)}M views`;
        return `${Math.floor(Math.random() * 9900 + 100)}K views`;
    }

    generateRandomJoinDate() {
        const years = Math.floor(Math.random() * 15) + 2009; // YouTube started in 2005
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[Math.floor(Math.random() * 12)];
        return `Joined ${month} ${years}`;
    }

    async extractEmailsFromChannels(channels) {
        const results = [];
        
        for (const channel of channels.slice(0, 20)) { // Limit to prevent rate limiting
            try {
                const email = await this.extractEmailFromChannel(channel);
                results.push({ ...channel, email });
            } catch (error) {
                results.push({ ...channel, email: null });
            }
        }

        return results;
    }

    async extractEmailFromChannel(channel) {
        try {
            // In a real implementation, this would scrape the channel's about page
            // For demo purposes, return mock email based on probability
            if (Math.random() > 0.6) {
                const domain = channel.name.toLowerCase().replace(/\s+/g, '');
                return `contact@${domain}.com`;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async searchChannels(query, options = {}) {
        try {
            // Call search API
            const response = await fetch(`${this.apiEndpoint}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query,
                    options
                })
            });

            if (!response.ok) {
                throw new Error('Search API error');
            }

            const data = await response.json();
            return data.channels || [];

        } catch (error) {
            console.error('Search error:', error);
            // Return mock search results
            return this.generateMockSearchResults(query);
        }
    }

    generateMockSearchResults(query) {
        // Generate mock search results based on query
        const results = [];
        const queryTerms = query.toLowerCase().split(' ');
        
        for (let i = 0; i < 50; i++) {
            const name = `${query} Channel ${i + 1}`;
            results.push({
                id: `search_result_${i}`,
                name: name,
                handle: `@${name.replace(/\s+/g, '').toLowerCase()}`,
                subscribers: this.generateRandomSubscribers(),
                avatar: `https://via.placeholder.com/88x88?text=${query[0]}${i + 1}`,
                url: `https://youtube.com/@${name.replace(/\s+/g, '').toLowerCase()}`,
                description: `A channel about ${query} and related topics.`,
                verified: Math.random() > 0.8,
                relevance: Math.floor(Math.random() * 30) + 70
            });
        }

        return results.sort((a, b) => b.relevance - a.relevance);
    }

    async storeChannelData(channelData) {
        try {
            const stored = await chrome.storage.local.get(['channelHistory']);
            const history = stored.channelHistory || [];
            
            // Add new channel data
            history.unshift({
                ...channelData,
                timestamp: Date.now()
            });

            // Keep only last 100 channels
            const trimmed = history.slice(0, 100);

            await chrome.storage.local.set({ channelHistory: trimmed });
        } catch (error) {
            console.error('Error storing channel data:', error);
        }
    }

    async updateStats(newStats) {
        try {
            const current = await chrome.storage.local.get(['totalScanned', 'totalEmails']);
            
            const updated = {
                totalScanned: (current.totalScanned || 0) + (newStats.totalScanned || 0),
                totalEmails: (current.totalEmails || 0) + (newStats.totalEmails || 0)
            };

            await chrome.storage.local.set(updated);
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async updateBadge(tabId, channelData) {
        try {
            let badgeText = '';
            let badgeColor = '#667eea';

            if (channelData.email) {
                badgeText = '📧';
                badgeColor = '#28a745';
            } else if (channelData.verified) {
                badgeText = '✓';
                badgeColor = '#007bff';
            }

            await chrome.action.setBadgeText({ text: badgeText, tabId });
            await chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId });
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            // Clear badge if not on YouTube
            if (!tab.url.includes('youtube.com')) {
                chrome.action.setBadgeText({ text: '', tabId });
            }
        }
    }

    handleStorageChange(changes, namespace) {
        // Handle settings changes
        if (namespace === 'local') {
            Object.keys(changes).forEach(key => {
                if (key === 'apiEndpoint' && changes[key].newValue) {
                    this.apiEndpoint = changes[key].newValue;
                }
            });
        }
    }

    isRateLimited(operation) {
        const key = operation;
        const now = Date.now();
        const limit = this.rateLimiter.get(key);

        if (limit && now - limit < 5000) { // 5 second rate limit
            return true;
        }

        this.rateLimiter.set(key, now);
        return false;
    }

    async getCachedData(key) {
        if (key.startsWith('channel_')) {
            return this.channelCache.get(key.replace('channel_', ''));
        }
        if (key.startsWith('similarity_')) {
            return this.similarityCache.get(key);
        }
        return null;
    }

    async exportData(format, data) {
        try {
            switch (format) {
                case 'csv':
                    return this.generateCSV(data);
                case 'json':
                    return JSON.stringify(data, null, 2);
                case 'xlsx':
                    // Would require additional library for Excel export
                    return this.generateCSV(data);
                default:
                    throw new Error('Unsupported export format');
            }
        } catch (error) {
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    generateCSV(data) {
        if (!data || !Array.isArray(data)) return '';

        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    `"${(row[header] || '').toString().replace(/"/g, '""')}"`)
                .join(',')
            )
        ].join('\n');

        return csvContent;
    }

    async handleUpdate(previousVersion) {
        // Handle extension updates
        console.log(`Updated from version ${previousVersion}`);
        
        // Perform any necessary data migrations
        try {
            await this.migrateData(previousVersion);
        } catch (error) {
            console.error('Migration error:', error);
        }
    }

    async migrateData(fromVersion) {
        // Implement data migration logic if needed
        // This would handle changes in data structure between versions
    }
}

// Initialize background script
new ProspectooBackground();