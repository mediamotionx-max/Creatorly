// Content Script for Prospectoo Extension - Runs on YouTube pages
class ProspectooContent {
    constructor() {
        this.channelData = null;
        this.observer = null;
        this.isChannelPage = false;
        
        this.init();
    }

    init() {
        this.checkPageType();
        this.setupObserver();
        this.setupMessageListener();
        this.injectUI();
    }

    checkPageType() {
        const url = window.location.href;
        this.isChannelPage = this.isYouTubeChannelPage(url);
        
        if (this.isChannelPage) {
            this.extractChannelData();
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

    setupObserver() {
        // Watch for page navigation changes (YouTube is a SPA)
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    this.handlePageChange();
                }
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also listen for URL changes
        window.addEventListener('popstate', () => {
            setTimeout(() => this.handlePageChange(), 1000);
        });

        // Override pushState to catch programmatic navigation
        const originalPushState = history.pushState;
        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(() => {
                window.dispatchEvent(new Event('prospectoo-navigation'));
            }, 100);
        };

        window.addEventListener('prospectoo-navigation', () => {
            setTimeout(() => this.handlePageChange(), 1000);
        });
    }

    handlePageChange() {
        const wasChannelPage = this.isChannelPage;
        this.checkPageType();
        
        if (this.isChannelPage && !wasChannelPage) {
            // Navigated to a channel page
            setTimeout(() => {
                this.extractChannelData();
                this.updateUI();
            }, 2000); // Wait for page to fully load
        } else if (!this.isChannelPage && wasChannelPage) {
            // Navigated away from channel page
            this.removeUI();
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.action) {
                case 'extractChannelData':
                    const data = this.extractChannelData();
                    sendResponse({ success: true, data: data });
                    break;
                    
                case 'highlightEmails':
                    this.highlightEmails();
                    sendResponse({ success: true });
                    break;
                    
                case 'getPageContent':
                    sendResponse({ 
                        success: true, 
                        data: {
                            url: window.location.href,
                            title: document.title,
                            content: document.body.innerText
                        }
                    });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
            return true;
        });
    }

    extractChannelData() {
        try {
            // Channel name - multiple selectors for different YouTube layouts
            const channelName = this.getTextContent([
                '#channel-name #text',
                '.ytd-channel-name #text',
                'h1.ytd-channel-name',
                '.ytd-c4-tabbed-header-renderer h1',
                '[class*="channel-name"]'
            ]);

            // Subscriber count
            const subscriberCount = this.getTextContent([
                '#subscriber-count',
                '.ytd-c4-tabbed-header-renderer #subscriber-count',
                '[class*="subscriber-count"]',
                '.ytd-subscription-notification-toggle-button-renderer-next-to #subscriber-count'
            ]);

            // Channel avatar
            const avatar = this.getImageSrc([
                '#channel-header-container img',
                '.ytd-c4-tabbed-header-renderer img',
                '.ytd-channel-avatar-editor img',
                '[class*="channel-header"] img'
            ]);

            // Channel description - try to get from About page or main page
            const description = this.getChannelDescription();

            // Extract emails from description
            const emails = this.extractEmails(description);

            // Video count
            const videoCount = this.getTextContent([
                '.ytd-channel-video-player-renderer .style-scope',
                '[class*="video-count"]'
            ]);

            // View count (total channel views)
            const viewCount = this.getTextContent([
                '.view-count',
                '[class*="view-count"]'
            ]);

            // Channel ID from URL or page data
            const channelId = this.extractChannelId();

            // Additional metadata
            const joinDate = this.getTextContent([
                '.ytd-channel-about-metadata-renderer .style-scope',
                '[class*="join-date"]'
            ]);

            const channelData = {
                name: channelName,
                subscribers: subscriberCount,
                avatar: avatar,
                description: description,
                email: emails.length > 0 ? emails[0] : null,
                allEmails: emails,
                videoCount: videoCount,
                viewCount: viewCount,
                channelId: channelId,
                joinDate: joinDate,
                url: window.location.href,
                timestamp: Date.now()
            };

            this.channelData = channelData;
            
            // Notify background script
            chrome.runtime.sendMessage({
                action: 'channelDataExtracted',
                data: channelData
            });

            return channelData;
        } catch (error) {
            console.error('Error extracting channel data:', error);
            return null;
        }
    }

    getTextContent(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
                return element.textContent.trim();
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

    getChannelDescription() {
        // Try multiple methods to get channel description
        let description = '';

        // Method 1: From About tab if available
        const aboutDescription = this.getTextContent([
            '#description',
            '.ytd-channel-about-metadata-renderer #description',
            '.ytd-expandable-metadata-renderer #content'
        ]);

        if (aboutDescription) {
            description = aboutDescription;
        } else {
            // Method 2: Try to navigate to About tab and extract
            description = this.tryExtractFromAboutTab();
        }

        // Method 3: From meta tags
        if (!description) {
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                description = metaDescription.getAttribute('content');
            }
        }

        return description;
    }

    tryExtractFromAboutTab() {
        // Check if About tab exists and try to extract from it
        const aboutTab = document.querySelector('a[href*="/about"]');
        if (aboutTab) {
            // This would require additional logic to navigate and extract
            // For now, return empty string
            return '';
        }
        return '';
    }

    extractChannelId() {
        const url = window.location.href;
        
        // Extract from URL patterns
        const patterns = [
            /youtube\.com\/channel\/([^\/\?]+)/,
            /youtube\.com\/c\/([^\/\?]+)/,
            /youtube\.com\/@([^\/\?]+)/,
            /youtube\.com\/user\/([^\/\?]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        // Try to extract from page data
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            if (script.textContent.includes('channelId')) {
                const match = script.textContent.match(/"channelId":"([^"]+)"/);
                if (match) {
                    return match[1];
                }
            }
        }

        return null;
    }

    extractEmails(text) {
        if (!text) return [];
        
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = text.match(emailRegex) || [];
        
        // Remove duplicates and filter out common false positives
        const uniqueEmails = [...new Set(emails)].filter(email => {
            return this.isValidEmail(email) && !this.isCommonFalsePositive(email);
        });

        return uniqueEmails;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isCommonFalsePositive(email) {
        const falsePositives = [
            '@youtube.com',
            '@google.com',
            'noreply@',
            'support@youtube.com'
        ];
        
        return falsePositives.some(fp => email.includes(fp));
    }

    highlightEmails() {
        if (!this.channelData || !this.channelData.allEmails.length) return;

        const emails = this.channelData.allEmails;
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            emails.forEach(email => {
                if (textNode.textContent.includes(email)) {
                    const parent = textNode.parentNode;
                    const html = parent.innerHTML;
                    const highlightedHtml = html.replace(
                        new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                        `<span class="prospectoo-email-highlight" style="background: yellow; padding: 2px; border-radius: 3px;">${email}</span>`
                    );
                    parent.innerHTML = highlightedHtml;
                }
            });
        });
    }

    injectUI() {
        if (!this.isChannelPage) return;

        // Create floating action button
        this.createFloatingButton();
    }

    createFloatingButton() {
        // Remove existing button if any
        const existingButton = document.getElementById('prospectoo-fab');
        if (existingButton) {
            existingButton.remove();
        }

        const fab = document.createElement('div');
        fab.id = 'prospectoo-fab';
        fab.innerHTML = `
            <div class="prospectoo-fab-content">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
            </div>
        `;

        fab.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        fab.addEventListener('mouseenter', () => {
            fab.style.transform = 'scale(1.1)';
            fab.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
        });

        fab.addEventListener('mouseleave', () => {
            fab.style.transform = 'scale(1)';
            fab.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });

        fab.addEventListener('click', () => {
            this.openProspectooPopup();
        });

        document.body.appendChild(fab);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (fab.parentNode) {
                fab.style.opacity = '0.7';
            }
        }, 5000);
    }

    openProspectooPopup() {
        // Send message to background script to open popup
        chrome.runtime.sendMessage({
            action: 'openPopup',
            data: this.channelData
        });
    }

    updateUI() {
        if (this.isChannelPage) {
            this.injectUI();
        }
    }

    removeUI() {
        const fab = document.getElementById('prospectoo-fab');
        if (fab) {
            fab.remove();
        }
    }

    // Method to be called by popup for fresh data extraction
    getFreshChannelData() {
        return this.extractChannelData();
    }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ProspectooContent();
    });
} else {
    new ProspectooContent();
}

// Make it globally accessible for debugging
window.prospectooContent = new ProspectooContent();