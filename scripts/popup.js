// Prospectoo Popup Script
class ProspectooPopup {
    constructor() {
        this.currentChannel = null;
        this.results = [];
        this.isScanning = false;
        this.apiEndpoint = 'http://localhost:3000/api';
        this.totalScanned = 0;
        this.totalEmails = 0;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadInitialData();
    }

    initializeElements() {
        // Header elements
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusDot = this.statusIndicator.querySelector('.status-dot');
        this.statusText = this.statusIndicator.querySelector('.status-text');

        // Channel elements
        this.currentChannelSection = document.getElementById('currentChannel');
        this.channelAvatar = document.getElementById('channelAvatar');
        this.channelName = document.getElementById('channelName');
        this.channelStats = document.getElementById('channelStats');
        this.channelEmail = document.getElementById('channelEmail');
        this.scanBtn = document.getElementById('scanBtn');

        // Search elements
        this.searchSection = document.getElementById('searchSection');
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.includeEmails = document.getElementById('includeEmails');
        this.realTimeMode = document.getElementById('realTimeMode');

        // Loading elements
        this.loadingContainer = document.getElementById('loadingContainer');
        this.loadingText = document.getElementById('loadingText');
        this.progressBar = document.getElementById('progressBar');
        this.loadingStats = document.getElementById('loadingStats');

        // Results elements
        this.resultsSection = document.getElementById('resultsSection');
        this.sortDropdown = document.getElementById('sortDropdown');
        this.exportBtn = document.getElementById('exportBtn');
        this.resultsList = document.getElementById('resultsList');
        this.loadMoreBtn = document.getElementById('loadMoreBtn');

        // Other elements
        this.noChannel = document.getElementById('noChannel');
        this.totalScannedEl = document.getElementById('totalScanned');
        this.totalEmailsEl = document.getElementById('totalEmails');
    }

    attachEventListeners() {
        // Scan button
        this.scanBtn.addEventListener('click', () => this.startScanning());
        
        // Search functionality
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Results actions
        this.sortDropdown.addEventListener('change', () => this.sortResults());
        this.exportBtn.addEventListener('click', () => this.exportResults());
        this.loadMoreBtn.addEventListener('click', () => this.loadMoreResults());

        // Real-time mode toggle
        this.realTimeMode.addEventListener('change', (e) => {
            if (e.target.checked && this.currentChannel) {
                this.enableRealTimeMode();
            } else {
                this.disableRealTimeMode();
            }
        });
    }

    async loadInitialData() {
        try {
            // Get current tab info
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (this.isYouTubeChannel(tab.url)) {
                await this.loadCurrentChannel(tab.url);
            } else {
                this.showNoChannel();
            }

            // Load stored stats
            const stats = await chrome.storage.local.get(['totalScanned', 'totalEmails']);
            this.updateStats(stats.totalScanned || 0, stats.totalEmails || 0);

        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load channel data');
        }
    }

    isYouTubeChannel(url) {
        return url && (
            url.includes('youtube.com/channel/') ||
            url.includes('youtube.com/c/') ||
            url.includes('youtube.com/@') ||
            url.includes('youtube.com/user/')
        );
    }

    async loadCurrentChannel(url) {
        try {
            this.updateStatus('Loading channel...', 'loading');
            
            // Extract channel data from current page
            const channelData = await this.extractChannelData(url);
            
            if (channelData) {
                this.currentChannel = channelData;
                this.displayCurrentChannel();
                this.updateStatus('Ready', 'ready');
            } else {
                this.showNoChannel();
            }
        } catch (error) {
            console.error('Error loading current channel:', error);
            this.showError('Failed to load channel');
        }
    }

    async extractChannelData(url) {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        // Extract channel information from YouTube page
                        const channelName = document.querySelector('#channel-name')?.textContent?.trim() ||
                                          document.querySelector('.ytd-channel-name')?.textContent?.trim() ||
                                          document.querySelector('h1.ytd-c4-tabbed-header-renderer')?.textContent?.trim();
                        
                        const subscriberCount = document.querySelector('#subscriber-count')?.textContent?.trim() ||
                                              document.querySelector('.yt-subscription-button-subscriber-count-branded-horizontal')?.textContent?.trim();
                        
                        const avatar = document.querySelector('#channel-header-container img')?.src ||
                                     document.querySelector('.ytd-c4-tabbed-header-renderer img')?.src;
                        
                        // Try to extract email from about section
                        const aboutLinks = Array.from(document.querySelectorAll('a[href*="mailto:"]'));
                        const email = aboutLinks.length > 0 ? aboutLinks[0].href.replace('mailto:', '') : null;
                        
                        // Get channel URL
                        const channelUrl = window.location.href;
                        const channelId = channelUrl.match(/channel\/([^\/\?]+)/)?.[1] ||
                                        channelUrl.match(/@([^\/\?]+)/)?.[1];

                        if (channelName) {
                            return {
                                name: channelName,
                                subscribers: subscriberCount || 'Unknown',
                                avatar: avatar || 'icons/default-avatar.png',
                                email: email,
                                url: channelUrl,
                                id: channelId
                            };
                        }
                        return null;
                    }
                }, (results) => {
                    resolve(results?.[0]?.result || null);
                });
            });
        });
    }

    displayCurrentChannel() {
        if (!this.currentChannel) return;

        this.channelAvatar.src = this.currentChannel.avatar;
        this.channelName.textContent = this.currentChannel.name;
        this.channelStats.textContent = `${this.currentChannel.subscribers} subscribers`;
        
        if (this.currentChannel.email) {
            this.channelEmail.textContent = `📧 ${this.currentChannel.email}`;
            this.channelEmail.style.display = 'block';
        }

        this.currentChannelSection.style.display = 'block';
        this.noChannel.style.display = 'none';
        this.currentChannelSection.classList.add('fade-in');
    }

    showNoChannel() {
        this.currentChannelSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.noChannel.style.display = 'block';
        this.updateStatus('No channel detected', 'idle');
    }

    async startScanning() {
        if (this.isScanning || !this.currentChannel) return;

        this.isScanning = true;
        this.showLoading('Initializing AI scanner...');
        
        try {
            // Start the scanning process
            await this.performAIScan();
        } catch (error) {
            console.error('Scanning error:', error);
            this.showError('Scanning failed. Please try again.');
        } finally {
            this.isScanning = false;
        }
    }

    async performAIScan() {
        const steps = [
            'Analyzing channel content...',
            'Generating similarity vectors...',
            'Searching YouTube database...',
            'Extracting channel data...',
            'Finding email addresses...',
            'Ranking by similarity...'
        ];

        let progress = 0;
        const progressIncrement = 100 / steps.length;

        for (let i = 0; i < steps.length; i++) {
            this.updateLoading(steps[i], progress);
            
            // Simulate AI processing with actual API calls
            await this.simulateProcessingStep(i);
            
            progress += progressIncrement;
        }

        // Get final results
        const results = await this.fetchSimilarChannels();
        this.displayResults(results);
    }

    async simulateProcessingStep(step) {
        // Simulate different processing times for each step
        const delays = [1000, 1500, 2000, 1800, 1200, 800];
        await new Promise(resolve => setTimeout(resolve, delays[step] || 1000));

        // Update stats during scanning
        const foundChannels = Math.floor(Math.random() * 20) + step * 15;
        this.loadingStats.textContent = `Found ${foundChannels} channels`;
    }

    async fetchSimilarChannels() {
        try {
            // In a real implementation, this would call your backend API
            // For demo purposes, we'll generate mock data
            return this.generateMockResults();
        } catch (error) {
            console.error('API Error:', error);
            return this.generateMockResults(); // Fallback to mock data
        }
    }

    generateMockResults() {
        const mockChannels = [
            {
                name: 'Tech Reviews Pro',
                subscribers: '1.2M subscribers',
                views: '15M views',
                engagement: '4.8%',
                email: 'contact@techreviewspro.com',
                avatar: 'https://via.placeholder.com/40',
                similarity: 94,
                url: 'https://youtube.com/@techreviewspro'
            },
            {
                name: 'Digital Nomad Life',
                subscribers: '850K subscribers',
                views: '12M views',
                engagement: '5.2%',
                email: 'hello@digitalnomadlife.com',
                avatar: 'https://via.placeholder.com/40',
                similarity: 91,
                url: 'https://youtube.com/@digitalnomadlife'
            },
            {
                name: 'Startup Stories',
                subscribers: '650K subscribers',
                views: '8M views',
                engagement: '6.1%',
                email: null,
                avatar: 'https://via.placeholder.com/40',
                similarity: 88,
                url: 'https://youtube.com/@startupstories'
            },
            {
                name: 'Creative Minds',
                subscribers: '2.1M subscribers',
                views: '25M views',
                engagement: '3.9%',
                email: 'team@creativeminds.co',
                avatar: 'https://via.placeholder.com/40',
                similarity: 85,
                url: 'https://youtube.com/@creativeminds'
            },
            {
                name: 'Future Tech',
                subscribers: '450K subscribers',
                views: '6M views',
                engagement: '7.3%',
                email: 'info@futuretech.io',
                avatar: 'https://via.placeholder.com/40',
                similarity: 82,
                url: 'https://youtube.com/@futuretech'
            }
        ];

        // Generate more results (up to 100+)
        const additionalResults = [];
        for (let i = 0; i < 95; i++) {
            additionalResults.push({
                name: `Channel ${i + 6}`,
                subscribers: `${Math.floor(Math.random() * 500) + 50}K subscribers`,
                views: `${Math.floor(Math.random() * 10) + 1}M views`,
                engagement: `${(Math.random() * 8 + 2).toFixed(1)}%`,
                email: Math.random() > 0.6 ? `contact@channel${i + 6}.com` : null,
                avatar: 'https://via.placeholder.com/40',
                similarity: Math.floor(Math.random() * 30) + 50,
                url: `https://youtube.com/@channel${i + 6}`
            });
        }

        return [...mockChannels, ...additionalResults];
    }

    displayResults(results) {
        this.results = results;
        this.hideLoading();
        this.resultsSection.style.display = 'block';
        this.resultsSection.classList.add('slide-up');

        this.renderResults(results.slice(0, 20)); // Show first 20 results
        this.updateStats(this.totalScanned + results.length, this.totalEmails + results.filter(r => r.email).length);
        this.updateStatus(`Found ${results.length} similar channels`, 'success');
    }

    renderResults(results) {
        this.resultsList.innerHTML = '';

        results.forEach((result, index) => {
            const resultElement = this.createResultElement(result, index);
            this.resultsList.appendChild(resultElement);
        });
    }

    createResultElement(result, index) {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <img src="${result.avatar}" alt="${result.name}" class="result-avatar" onerror="this.src='icons/default-avatar.png'">
            <div class="result-info">
                <div class="result-name">${result.name}</div>
                <div class="result-stats">${result.subscribers} • ${result.views} • ${result.engagement} ER</div>
                ${result.email ? `<div class="result-email">📧 ${result.email}</div>` : ''}
            </div>
            <div class="result-similarity">
                <div class="similarity-score">${result.similarity}%</div>
                <div class="similarity-label">Match</div>
            </div>
        `;

        div.addEventListener('click', () => {
            chrome.tabs.create({ url: result.url });
        });

        return div;
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        this.showLoading('Searching channels...');

        try {
            // Simulate search API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            const results = this.generateMockResults();
            this.displayResults(results);
        } catch (error) {
            this.showError('Search failed');
        }
    }

    sortResults() {
        const sortBy = this.sortDropdown.value;
        const sorted = [...this.results].sort((a, b) => {
            switch (sortBy) {
                case 'similarity':
                    return b.similarity - a.similarity;
                case 'subscribers':
                    return this.parseNumber(b.subscribers) - this.parseNumber(a.subscribers);
                case 'engagement':
                    return parseFloat(b.engagement) - parseFloat(a.engagement);
                case 'views':
                    return this.parseNumber(b.views) - this.parseNumber(a.views);
                default:
                    return 0;
            }
        });

        this.renderResults(sorted.slice(0, 20));
    }

    parseNumber(str) {
        const num = parseFloat(str);
        if (str.includes('K')) return num * 1000;
        if (str.includes('M')) return num * 1000000;
        return num;
    }

    exportResults() {
        if (!this.results.length) return;

        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `prospectoo-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    generateCSV() {
        const headers = ['Channel Name', 'Subscribers', 'Views', 'Engagement Rate', 'Email', 'Similarity Score', 'URL'];
        const rows = this.results.map(result => [
            result.name,
            result.subscribers,
            result.views,
            result.engagement,
            result.email || '',
            result.similarity + '%',
            result.url
        ]);

        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    loadMoreResults() {
        const currentCount = this.resultsList.children.length;
        const nextBatch = this.results.slice(currentCount, currentCount + 20);
        
        nextBatch.forEach((result, index) => {
            const resultElement = this.createResultElement(result, currentCount + index);
            this.resultsList.appendChild(resultElement);
        });

        if (currentCount + nextBatch.length >= this.results.length) {
            this.loadMoreBtn.style.display = 'none';
        }
    }

    enableRealTimeMode() {
        // Set up real-time monitoring
        this.realTimeInterval = setInterval(() => {
            if (this.currentChannel) {
                this.performBackgroundScan();
            }
        }, 30000); // Scan every 30 seconds
    }

    disableRealTimeMode() {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
        }
    }

    async performBackgroundScan() {
        // Perform lightweight background scanning
        try {
            const newResults = await this.fetchSimilarChannels();
            // Update results if new channels are found
            if (newResults.length > this.results.length) {
                this.results = newResults;
                this.updateStatus(`Found ${newResults.length - this.results.length} new channels`, 'success');
            }
        } catch (error) {
            console.error('Background scan error:', error);
        }
    }

    showLoading(text) {
        this.loadingText.textContent = text;
        this.progressBar.style.width = '0%';
        this.loadingStats.textContent = 'Initializing...';
        
        this.currentChannelSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.noChannel.style.display = 'none';
        this.loadingContainer.style.display = 'block';
        
        this.updateStatus('Scanning...', 'loading');
    }

    updateLoading(text, progress) {
        this.loadingText.textContent = text;
        this.progressBar.style.width = `${progress}%`;
    }

    hideLoading() {
        this.loadingContainer.style.display = 'none';
    }

    updateStatus(text, type = 'ready') {
        this.statusText.textContent = text;
        
        // Update status dot color
        this.statusDot.style.background = {
            'ready': '#4CAF50',
            'loading': '#FF9800',
            'success': '#4CAF50',
            'error': '#F44336',
            'idle': '#9E9E9E'
        }[type] || '#4CAF50';
    }

    updateStats(scanned, emails) {
        this.totalScanned = scanned;
        this.totalEmails = emails;
        
        this.totalScannedEl.textContent = scanned.toLocaleString();
        this.totalEmailsEl.textContent = emails.toLocaleString();

        // Store stats
        chrome.storage.local.set({
            totalScanned: scanned,
            totalEmails: emails
        });
    }

    showError(message) {
        this.updateStatus(message, 'error');
        this.hideLoading();
        
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #F44336;
            color: white;
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 1000;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProspectooPopup();
});

// Add CSS for error notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(style);