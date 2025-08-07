// Popup JavaScript for Prospectoo Extension
class ProspectooPopup {
    constructor() {
        this.currentTab = 'scanner';
        this.currentChannel = null;
        this.similarChannels = [];
        this.searchResults = [];
        this.settings = {};
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.setupTabs();
        this.checkCurrentPage();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'youtubeApiKey',
                'aiProvider',
                'aiApiKey',
                'autoScan',
                'emailNotifications'
            ]);
            
            this.settings = {
                youtubeApiKey: result.youtubeApiKey || '',
                aiProvider: result.aiProvider || 'openai',
                aiApiKey: result.aiApiKey || '',
                autoScan: result.autoScan || false,
                emailNotifications: result.emailNotifications || true
            };
            
            this.updateSettingsUI();
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });

        // Scanner actions
        document.getElementById('findSimilarBtn').addEventListener('click', () => {
            this.findSimilarChannels();
        });

        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.analyzeChannel();
        });

        document.getElementById('copyEmailBtn').addEventListener('click', () => {
            this.copyEmail();
        });

        // Search functionality
        document.getElementById('topicSearchBtn').addEventListener('click', () => {
            this.searchByTopic();
        });

        document.getElementById('topicSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchByTopic();
            }
        });

        // Filter changes
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterResults();
        });

        document.getElementById('sizeFilter').addEventListener('change', () => {
            this.filterResults();
        });

        // Modal backdrop click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });
    }

    setupTabs() {
        this.switchTab('scanner');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;
    }

    async checkCurrentPage() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (currentTab.url && currentTab.url.includes('youtube.com')) {
                // Check if it's a channel page
                const channelMatch = currentTab.url.match(/youtube\.com\/(?:c\/|channel\/|@|user\/)([^\/\?]+)/);
                if (channelMatch) {
                    this.showLoadingState();
                    await this.scanCurrentChannel(currentTab);
                } else {
                    this.showNoChannelState();
                }
            } else {
                this.showNoChannelState();
            }
        } catch (error) {
            console.error('Failed to check current page:', error);
            this.showNoChannelState();
        }
    }

    async scanCurrentChannel(tab) {
        try {
            // Inject content script to extract channel data
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: this.extractChannelData
            });

            if (results && results[0] && results[0].result) {
                const channelData = results[0].result;
                await this.processChannelData(channelData);
            } else {
                this.showNoChannelState();
            }
        } catch (error) {
            console.error('Failed to scan channel:', error);
            this.showNoChannelState();
        }
    }

    extractChannelData() {
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

            // Get video count and view count if available
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
                url: window.location.href
            };
        } catch (error) {
            console.error('Error extracting channel data:', error);
            return null;
        }
    }

    async processChannelData(channelData) {
        if (!channelData || !channelData.name) {
            this.showNoChannelState();
            return;
        }

        this.currentChannel = channelData;
        this.showChannelData(channelData);
    }

    showChannelData(channelData) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('noChannel').style.display = 'none';
        document.getElementById('currentChannel').style.display = 'block';

        // Update channel info
        document.getElementById('channelName').textContent = channelData.name;
        document.getElementById('channelStats').textContent = channelData.subscribers || 'Subscriber count unavailable';
        
        if (channelData.avatar) {
            document.getElementById('channelAvatar').src = channelData.avatar;
        }

        // Update metrics
        document.getElementById('subscriberCount').textContent = this.formatNumber(channelData.subscribers);
        document.getElementById('videoCount').textContent = channelData.videoCount || '-';
        document.getElementById('viewCount').textContent = this.formatNumber(channelData.viewCount);

        // Show email if found
        if (channelData.email) {
            document.getElementById('emailText').textContent = channelData.email;
            document.getElementById('emailSection').style.display = 'block';
        } else {
            document.getElementById('emailSection').style.display = 'none';
        }
    }

    showLoadingState() {
        document.getElementById('currentChannel').style.display = 'none';
        document.getElementById('noChannel').style.display = 'none';
        document.getElementById('loadingState').style.display = 'block';
    }

    showNoChannelState() {
        document.getElementById('currentChannel').style.display = 'none';
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('noChannel').style.display = 'block';
    }

    async findSimilarChannels() {
        if (!this.currentChannel) return;

        try {
            this.switchTab('similar');
            this.showSimilarLoading();

            // Use AI to find similar channels
            const similarChannels = await this.callAIForSimilarChannels(this.currentChannel);
            
            if (similarChannels && similarChannels.length > 0) {
                this.similarChannels = similarChannels;
                this.displaySimilarChannels(similarChannels);
            } else {
                this.showNoSimilarChannels();
            }
        } catch (error) {
            console.error('Failed to find similar channels:', error);
            this.showNoSimilarChannels();
        }
    }

    async callAIForSimilarChannels(channelData) {
        // Mock implementation - replace with actual AI API calls
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockChannels = [
                    {
                        name: "Tech Review Pro",
                        subscribers: "250K",
                        avatar: "https://via.placeholder.com/40",
                        category: "Technology",
                        similarity: 95,
                        email: "contact@techreviewpro.com"
                    },
                    {
                        name: "Gadget Guru",
                        subscribers: "180K",
                        avatar: "https://via.placeholder.com/40",
                        category: "Technology",
                        similarity: 88,
                        email: null
                    },
                    {
                        name: "Innovation Hub",
                        subscribers: "320K",
                        avatar: "https://via.placeholder.com/40",
                        category: "Technology",
                        similarity: 82,
                        email: "hello@innovationhub.com"
                    }
                ];
                resolve(mockChannels);
            }, 2000);
        });
    }

    displaySimilarChannels(channels) {
        const container = document.getElementById('similarResults');
        container.innerHTML = '';

        channels.forEach(channel => {
            const channelElement = this.createChannelResultElement(channel);
            container.appendChild(channelElement);
        });
    }

    createChannelResultElement(channel) {
        const div = document.createElement('div');
        div.className = 'channel-result';
        
        div.innerHTML = `
            <img src="${channel.avatar}" alt="${channel.name}" class="result-avatar">
            <div class="result-info">
                <div class="result-name">${channel.name}</div>
                <div class="result-stats">${channel.subscribers} subscribers • ${channel.similarity}% match</div>
            </div>
            <div class="result-actions">
                ${channel.email ? `<button class="result-btn primary" onclick="prospectooPopup.copyChannelEmail('${channel.email}')">Copy Email</button>` : ''}
                <button class="result-btn" onclick="prospectooPopup.visitChannel('${channel.name}')">Visit</button>
            </div>
        `;

        return div;
    }

    showSimilarLoading() {
        document.getElementById('similarResults').innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Finding similar channels...</p>
            </div>
        `;
    }

    showNoSimilarChannels() {
        document.getElementById('similarResults').innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <h3>No Similar Channels Found</h3>
                <p>Unable to find similar channels at this time</p>
            </div>
        `;
    }

    async analyzeChannel() {
        if (!this.currentChannel) return;

        // Mock analysis - replace with actual AI analysis
        alert(`Analyzing ${this.currentChannel.name}...\n\nThis feature will provide deep insights about the channel's content strategy, audience demographics, and growth opportunities.`);
    }

    copyEmail() {
        if (this.currentChannel && this.currentChannel.email) {
            this.copyToClipboard(this.currentChannel.email);
        }
    }

    copyChannelEmail(email) {
        this.copyToClipboard(email);
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Email copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    }

    visitChannel(channelName) {
        // This would open the channel in a new tab
        chrome.tabs.create({
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}`
        });
    }

    async searchByTopic() {
        const query = document.getElementById('topicSearch').value.trim();
        if (!query) return;

        try {
            this.showSearchLoading();
            
            // Mock search results - replace with actual search API
            const results = await this.mockTopicSearch(query);
            
            if (results && results.length > 0) {
                this.searchResults = results;
                this.displaySearchResults(results);
            } else {
                this.showNoSearchResults();
            }
        } catch (error) {
            console.error('Search failed:', error);
            this.showNoSearchResults();
        }
    }

    async mockTopicSearch(query) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResults = [
                    {
                        name: `${query} Expert`,
                        subscribers: "150K",
                        avatar: "https://via.placeholder.com/40",
                        category: "Education",
                        email: `contact@${query.toLowerCase()}expert.com`
                    },
                    {
                        name: `${query} Academy`,
                        subscribers: "89K",
                        avatar: "https://via.placeholder.com/40",
                        category: "Education",
                        email: null
                    }
                ];
                resolve(mockResults);
            }, 1500);
        });
    }

    displaySearchResults(results) {
        const container = document.getElementById('searchResults');
        container.innerHTML = '';

        results.forEach(result => {
            const resultElement = this.createChannelResultElement(result);
            container.appendChild(resultElement);
        });
    }

    showSearchLoading() {
        document.getElementById('searchResults').innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Searching channels...</p>
            </div>
        `;
    }

    showNoSearchResults() {
        document.getElementById('searchResults').innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <h3>No Results Found</h3>
                <p>Try different keywords or filters</p>
            </div>
        `;
    }

    filterResults() {
        // Implement filtering logic for similar channels and search results
        const category = document.getElementById('categoryFilter').value;
        const size = document.getElementById('sizeFilter').value;
        
        // Apply filters to current results
        console.log('Filtering by category:', category, 'size:', size);
    }

    openSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
        this.updateSettingsUI();
    }

    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    updateSettingsUI() {
        document.getElementById('youtubeApiKey').value = this.settings.youtubeApiKey;
        document.getElementById('aiProvider').value = this.settings.aiProvider;
        document.getElementById('aiApiKey').value = this.settings.aiApiKey;
        document.getElementById('autoScan').checked = this.settings.autoScan;
        document.getElementById('emailNotifications').checked = this.settings.emailNotifications;
    }

    async saveSettings() {
        try {
            this.settings = {
                youtubeApiKey: document.getElementById('youtubeApiKey').value,
                aiProvider: document.getElementById('aiProvider').value,
                aiApiKey: document.getElementById('aiApiKey').value,
                autoScan: document.getElementById('autoScan').checked,
                emailNotifications: document.getElementById('emailNotifications').checked
            };

            await chrome.storage.sync.set(this.settings);
            this.showToast('Settings saved successfully!');
            this.closeSettings();
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showToast('Failed to save settings');
        }
    }

    async resetSettings() {
        try {
            await chrome.storage.sync.clear();
            this.settings = {
                youtubeApiKey: '',
                aiProvider: 'openai',
                aiApiKey: '',
                autoScan: false,
                emailNotifications: true
            };
            this.updateSettingsUI();
            this.showToast('Settings reset successfully!');
        } catch (error) {
            console.error('Failed to reset settings:', error);
        }
    }

    formatNumber(str) {
        if (!str) return '-';
        
        // Extract numbers from string like "1.5M subscribers"
        const match = str.match(/[\d.]+[KMB]?/);
        return match ? match[0] : str;
    }

    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.prospectooPopup = new ProspectooPopup();
});

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);