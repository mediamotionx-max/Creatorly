// Prospectoo Content Script - YouTube Channel Data Extraction
class ProspectooContentScript {
    constructor() {
        this.isYouTubeChannel = false;
        this.channelData = null;
        this.observer = null;
        this.emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        
        this.init();
    }

    init() {
        // Check if we're on a YouTube channel page
        if (this.isChannelPage()) {
            this.isYouTubeChannel = true;
            this.setupChannelMonitoring();
            this.extractChannelData();
        }

        // Listen for navigation changes (SPA routing)
        this.setupNavigationListener();
        
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
        });
    }

    isChannelPage() {
        const url = window.location.href;
        return url.includes('/channel/') || 
               url.includes('/c/') || 
               url.includes('/@') || 
               url.includes('/user/');
    }

    setupNavigationListener() {
        // Monitor URL changes for SPA navigation
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(() => {
                    if (this.isChannelPage()) {
                        this.isYouTubeChannel = true;
                        this.setupChannelMonitoring();
                        this.extractChannelData();
                    } else {
                        this.isYouTubeChannel = false;
                        this.channelData = null;
                        this.disconnectObserver();
                    }
                }, 1000); // Wait for page to load
            }
        }).observe(document, { subtree: true, childList: true });
    }

    setupChannelMonitoring() {
        // Set up mutation observer to monitor channel page changes
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if channel info was updated
                    const hasChannelContent = mutation.addedNodes.length > 0 && 
                        Array.from(mutation.addedNodes).some(node => 
                            node.nodeType === Node.ELEMENT_NODE &&
                            (node.querySelector('#channel-name') || 
                             node.querySelector('.ytd-channel-name') ||
                             node.id === 'channel-header' ||
                             node.classList?.contains('ytd-c4-tabbed-header-renderer'))
                        );
                    
                    if (hasChannelContent) {
                        shouldUpdate = true;
                    }
                }
            });

            if (shouldUpdate) {
                setTimeout(() => this.extractChannelData(), 500);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    disconnectObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    async extractChannelData() {
        try {
            const channelInfo = this.getChannelBasicInfo();
            const socialLinks = this.extractSocialLinks();
            const email = await this.extractEmailFromChannel();
            const metrics = this.extractChannelMetrics();
            const videoData = this.extractRecentVideos();

            this.channelData = {
                ...channelInfo,
                socialLinks,
                email,
                metrics,
                videos: videoData,
                extractedAt: Date.now(),
                url: window.location.href
            };

            // Notify background script
            chrome.runtime.sendMessage({
                type: 'CHANNEL_DATA_EXTRACTED',
                data: this.channelData
            });

        } catch (error) {
            console.error('Error extracting channel data:', error);
        }
    }

    getChannelBasicInfo() {
        // Channel name extraction with multiple selectors
        const channelName = this.getTextContent([
            '#channel-name',
            '.ytd-channel-name',
            'h1.ytd-c4-tabbed-header-renderer',
            '.ytd-c4-tabbed-header-renderer #text',
            '#owner-name a',
            '.ytd-video-owner-renderer .ytd-channel-name'
        ]);

        // Subscriber count extraction
        const subscriberCount = this.getTextContent([
            '#subscriber-count',
            '.yt-subscription-button-subscriber-count-branded-horizontal',
            '.ytd-c4-tabbed-header-renderer #subscribers-count',
            '#owner-sub-count',
            '.ytd-video-owner-renderer #subscribers-count'
        ]);

        // Channel avatar extraction
        const avatar = this.getImageSrc([
            '#channel-header-container img',
            '.ytd-c4-tabbed-header-renderer img',
            '#avatar img',
            '.ytd-video-owner-renderer img'
        ]);

        // Channel handle/ID extraction
        const channelHandle = this.getTextContent([
            '.ytd-c4-tabbed-header-renderer #handle',
            '#channel-handle',
            '.ytd-channel-name .ytd-badge-supported-renderer'
        ]);

        // Channel description
        const description = this.getTextContent([
            '#description',
            '.ytd-channel-about-metadata-renderer #description',
            '.about-description'
        ]);

        return {
            name: channelName,
            handle: channelHandle,
            subscribers: this.normalizeSubscriberCount(subscriberCount),
            avatar: avatar,
            description: description,
            id: this.extractChannelId()
        };
    }

    extractChannelId() {
        const url = window.location.href;
        
        // Extract from URL patterns
        let channelId = url.match(/\/channel\/([^\/\?]+)/)?.[1];
        if (channelId) return channelId;

        channelId = url.match(/@([^\/\?]+)/)?.[1];
        if (channelId) return channelId;

        channelId = url.match(/\/c\/([^\/\?]+)/)?.[1];
        if (channelId) return channelId;

        channelId = url.match(/\/user\/([^\/\?]+)/)?.[1];
        if (channelId) return channelId;

        // Try to extract from page elements
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        if (canonicalLink) {
            const match = canonicalLink.href.match(/\/channel\/([^\/\?]+)/);
            if (match) return match[1];
        }

        return null;
    }

    extractSocialLinks() {
        const socialLinks = {
            instagram: null,
            twitter: null,
            facebook: null,
            tiktok: null,
            website: null,
            other: []
        };

        // Look for social links in about section and description
        const links = document.querySelectorAll('a[href]');
        
        links.forEach(link => {
            const href = link.href.toLowerCase();
            const text = link.textContent.trim();

            if (href.includes('instagram.com')) {
                socialLinks.instagram = link.href;
            } else if (href.includes('twitter.com') || href.includes('x.com')) {
                socialLinks.twitter = link.href;
            } else if (href.includes('facebook.com')) {
                socialLinks.facebook = link.href;
            } else if (href.includes('tiktok.com')) {
                socialLinks.tiktok = link.href;
            } else if (href.includes('mailto:')) {
                // Email links handled separately
            } else if (this.isExternalWebsite(href)) {
                if (!socialLinks.website) {
                    socialLinks.website = link.href;
                } else {
                    socialLinks.other.push(link.href);
                }
            }
        });

        return socialLinks;
    }

    async extractEmailFromChannel() {
        let email = null;

        // Method 1: Direct mailto links
        const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
        if (mailtoLinks.length > 0) {
            email = mailtoLinks[0].href.replace('mailto:', '');
        }

        // Method 2: Email patterns in text content
        if (!email) {
            const textContent = document.body.textContent || '';
            const emailMatches = textContent.match(this.emailRegex);
            if (emailMatches && emailMatches.length > 0) {
                // Filter out common false positives
                const validEmails = emailMatches.filter(e => 
                    !e.includes('example.com') && 
                    !e.includes('test.com') &&
                    !e.includes('youtube.com') &&
                    !e.includes('google.com')
                );
                if (validEmails.length > 0) {
                    email = validEmails[0];
                }
            }
        }

        // Method 3: Check about section if available
        if (!email) {
            try {
                email = await this.checkAboutSectionForEmail();
            } catch (error) {
                console.log('Could not access about section:', error);
            }
        }

        // Method 4: Check video descriptions
        if (!email) {
            email = this.extractEmailFromVideoDescriptions();
        }

        return email;
    }

    async checkAboutSectionForEmail() {
        // Try to navigate to about section and extract email
        const aboutTab = document.querySelector('a[href*="/about"]');
        if (!aboutTab) return null;

        // If we're not already on about page, we can't directly access it
        // This would require additional navigation which is complex in content script
        return null;
    }

    extractEmailFromVideoDescriptions() {
        // Check recent video descriptions for email addresses
        const videoDescriptions = document.querySelectorAll('#description, .ytd-video-secondary-info-renderer #description');
        
        for (const desc of videoDescriptions) {
            const text = desc.textContent || '';
            const emailMatches = text.match(this.emailRegex);
            if (emailMatches && emailMatches.length > 0) {
                const validEmails = emailMatches.filter(e => 
                    !e.includes('example.com') && 
                    !e.includes('test.com') &&
                    !e.includes('youtube.com')
                );
                if (validEmails.length > 0) {
                    return validEmails[0];
                }
            }
        }

        return null;
    }

    extractChannelMetrics() {
        // Extract view counts, video counts, join date, etc.
        const metrics = {
            totalViews: null,
            videoCount: null,
            joinDate: null,
            verified: false,
            hasCustomUrl: false
        };

        // Check for verification badge
        const verificationBadge = document.querySelector('.ytd-badge-supported-renderer');
        metrics.verified = !!verificationBadge;

        // Extract total views and video count from about section if visible
        const statsElements = document.querySelectorAll('.ytd-channel-about-metadata-renderer .style-scope');
        statsElements.forEach(el => {
            const text = el.textContent.trim();
            if (text.includes('views')) {
                metrics.totalViews = text;
            } else if (text.includes('videos')) {
                metrics.videoCount = text;
            } else if (text.includes('Joined')) {
                metrics.joinDate = text;
            }
        });

        return metrics;
    }

    extractRecentVideos() {
        // Extract information about recent videos
        const videos = [];
        const videoElements = document.querySelectorAll('ytd-grid-video-renderer, ytd-rich-item-renderer');

        videoElements.forEach((videoEl, index) => {
            if (index >= 10) return; // Limit to 10 recent videos

            const titleEl = videoEl.querySelector('#video-title');
            const viewsEl = videoEl.querySelector('#metadata-line span:first-child');
            const dateEl = videoEl.querySelector('#metadata-line span:last-child');
            const thumbnailEl = videoEl.querySelector('img');
            const linkEl = videoEl.querySelector('a#video-title-link');

            if (titleEl && linkEl) {
                videos.push({
                    title: titleEl.textContent.trim(),
                    views: viewsEl?.textContent.trim() || null,
                    publishedDate: dateEl?.textContent.trim() || null,
                    thumbnail: thumbnailEl?.src || null,
                    url: linkEl.href,
                    videoId: this.extractVideoId(linkEl.href)
                });
            }
        });

        return videos;
    }

    extractVideoId(url) {
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
    }

    getTextContent(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent?.trim();
                if (text) return text;
            }
        }
        return null;
    }

    getImageSrc(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.src) {
                return element.src;
            }
        }
        return null;
    }

    normalizeSubscriberCount(subCount) {
        if (!subCount) return 'Unknown';
        
        // Remove extra text and normalize format
        return subCount.replace(/subscribers?/i, '').trim() + ' subscribers';
    }

    isExternalWebsite(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.toLowerCase();
            
            // Exclude YouTube domains and common social media
            const excludedDomains = [
                'youtube.com', 'youtu.be', 'm.youtube.com',
                'instagram.com', 'twitter.com', 'x.com',
                'facebook.com', 'tiktok.com', 'linkedin.com'
            ];
            
            return !excludedDomains.some(excluded => domain.includes(excluded));
        } catch {
            return false;
        }
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.type) {
            case 'GET_CHANNEL_DATA':
                sendResponse({
                    success: true,
                    data: this.channelData,
                    isYouTubeChannel: this.isYouTubeChannel
                });
                break;

            case 'EXTRACT_FRESH_DATA':
                this.extractChannelData().then(() => {
                    sendResponse({
                        success: true,
                        data: this.channelData
                    });
                });
                return true; // Keep message channel open for async response

            case 'FIND_SIMILAR_CHANNELS':
                this.findSimilarChannelsOnPage().then(results => {
                    sendResponse({
                        success: true,
                        similarChannels: results
                    });
                });
                return true;

            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    }

    async findSimilarChannelsOnPage() {
        // Extract similar channels from YouTube's recommendations
        const similarChannels = [];
        
        // Look for recommended channels in sidebar or end screens
        const channelElements = document.querySelectorAll([
            '.ytd-compact-video-renderer .ytd-channel-name',
            '.ytd-video-secondary-info-renderer .ytd-channel-name',
            '.ytd-shelf-renderer .ytd-channel-name'
        ].join(', '));

        channelElements.forEach(el => {
            const channelLink = el.closest('a');
            const channelName = el.textContent?.trim();
            
            if (channelLink && channelName && this.isChannelLink(channelLink.href)) {
                similarChannels.push({
                    name: channelName,
                    url: channelLink.href,
                    avatar: this.findChannelAvatar(el),
                    source: 'youtube_recommendations'
                });
            }
        });

        return similarChannels;
    }

    isChannelLink(url) {
        return url && (
            url.includes('/channel/') ||
            url.includes('/c/') ||
            url.includes('/@') ||
            url.includes('/user/')
        );
    }

    findChannelAvatar(channelElement) {
        // Try to find associated avatar image
        const container = channelElement.closest('.ytd-compact-video-renderer, .ytd-video-secondary-info-renderer');
        const avatar = container?.querySelector('img');
        return avatar?.src || null;
    }

    // Utility method to inject scanning indicator
    showScanningIndicator() {
        if (document.getElementById('prospectoo-scanning-indicator')) return;

        const indicator = document.createElement('div');
        indicator.id = 'prospectoo-scanning-indicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: prospectooSlideIn 0.3s ease;
            ">
                🔍 Prospectoo: Scanning for similar channels...
            </div>
        `;

        // Add animation CSS
        if (!document.getElementById('prospectoo-styles')) {
            const styles = document.createElement('style');
            styles.id = 'prospectoo-styles';
            styles.textContent = `
                @keyframes prospectooSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(indicator);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            const el = document.getElementById('prospectoo-scanning-indicator');
            if (el) el.remove();
        }, 3000);
    }

    hideScanningIndicator() {
        const indicator = document.getElementById('prospectoo-scanning-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
}

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ProspectooContentScript();
    });
} else {
    new ProspectooContentScript();
}