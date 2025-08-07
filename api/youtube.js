// YouTube API Integration for Prospectoo Extension
class YouTubeAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    }

    async getChannelDetails(channelId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${this.apiKey}`
            );

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                throw new Error('Channel not found');
            }

            const channel = data.items[0];
            return this.formatChannelData(channel);
        } catch (error) {
            console.error('Failed to get channel details:', error);
            throw error;
        }
    }

    async getChannelByUsername(username) {
        try {
            const response = await fetch(
                `${this.baseUrl}/channels?part=snippet,statistics&forUsername=${username}&key=${this.apiKey}`
            );

            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                return this.formatChannelData(data.items[0]);
            }

            return null;
        } catch (error) {
            console.error('Failed to get channel by username:', error);
            return null;
        }
    }

    async searchChannels(query, maxResults = 20, options = {}) {
        try {
            const params = new URLSearchParams({
                part: 'snippet',
                type: 'channel',
                q: query,
                maxResults: maxResults,
                key: this.apiKey
            });

            // Add optional parameters
            if (options.regionCode) {
                params.append('regionCode', options.regionCode);
            }
            if (options.relevanceLanguage) {
                params.append('relevanceLanguage', options.relevanceLanguage);
            }
            if (options.order) {
                params.append('order', options.order);
            }

            const response = await fetch(`${this.baseUrl}/search?${params}`);
            
            if (!response.ok) {
                throw new Error(`Search request failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.items) {
                return [];
            }

            // Get detailed information for each channel
            const channelIds = data.items.map(item => item.snippet.channelId);
            const detailedChannels = await this.getMultipleChannels(channelIds);

            return detailedChannels;
        } catch (error) {
            console.error('Channel search failed:', error);
            throw error;
        }
    }

    async getMultipleChannels(channelIds) {
        try {
            const ids = channelIds.join(',');
            const response = await fetch(
                `${this.baseUrl}/channels?part=snippet,statistics&id=${ids}&key=${this.apiKey}`
            );

            const data = await response.json();
            
            if (!data.items) {
                return [];
            }

            return data.items.map(channel => this.formatChannelData(channel));
        } catch (error) {
            console.error('Failed to get multiple channels:', error);
            return [];
        }
    }

    async getChannelVideos(channelId, maxResults = 10) {
        try {
            // First get the uploads playlist ID
            const channelResponse = await fetch(
                `${this.baseUrl}/channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`
            );

            const channelData = await channelResponse.json();
            
            if (!channelData.items || channelData.items.length === 0) {
                return [];
            }

            const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            // Get videos from uploads playlist
            const videosResponse = await fetch(
                `${this.baseUrl}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${this.apiKey}`
            );

            const videosData = await videosResponse.json();
            
            if (!videosData.items) {
                return [];
            }

            return videosData.items.map(item => ({
                videoId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                publishedAt: item.snippet.publishedAt,
                thumbnail: item.snippet.thumbnails.medium?.url
            }));
        } catch (error) {
            console.error('Failed to get channel videos:', error);
            return [];
        }
    }

    async getVideoDetails(videoIds) {
        try {
            const ids = Array.isArray(videoIds) ? videoIds.join(',') : videoIds;
            const response = await fetch(
                `${this.baseUrl}/videos?part=snippet,statistics&id=${ids}&key=${this.apiKey}`
            );

            const data = await response.json();
            
            if (!data.items) {
                return [];
            }

            return data.items.map(video => ({
                videoId: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                publishedAt: video.snippet.publishedAt,
                viewCount: parseInt(video.statistics.viewCount),
                likeCount: parseInt(video.statistics.likeCount || 0),
                commentCount: parseInt(video.statistics.commentCount || 0),
                duration: video.contentDetails?.duration,
                thumbnail: video.snippet.thumbnails.medium?.url
            }));
        } catch (error) {
            console.error('Failed to get video details:', error);
            return [];
        }
    }

    formatChannelData(channel) {
        return {
            channelId: channel.id,
            title: channel.snippet.title,
            description: channel.snippet.description,
            customUrl: channel.snippet.customUrl,
            publishedAt: channel.snippet.publishedAt,
            thumbnails: channel.snippet.thumbnails,
            country: channel.snippet.country,
            viewCount: parseInt(channel.statistics?.viewCount || 0),
            subscriberCount: parseInt(channel.statistics?.subscriberCount || 0),
            videoCount: parseInt(channel.statistics?.videoCount || 0),
            hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount || false,
            keywords: channel.brandingSettings?.channel?.keywords,
            bannerImageUrl: channel.brandingSettings?.image?.bannerExternalUrl
        };
    }

    formatSubscriberCount(count) {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }

    formatViewCount(count) {
        if (count >= 1000000000) {
            return `${(count / 1000000000).toFixed(1)}B`;
        } else if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }

    extractChannelIdFromUrl(url) {
        const patterns = [
            /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
            /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
            /youtube\.com\/@([a-zA-Z0-9_-]+)/,
            /youtube\.com\/user\/([a-zA-Z0-9_-]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    async resolveChannelUrl(url) {
        const identifier = this.extractChannelIdFromUrl(url);
        
        if (!identifier) {
            return null;
        }

        // If it looks like a channel ID (starts with UC), use it directly
        if (identifier.startsWith('UC')) {
            return identifier;
        }

        // Otherwise, try to resolve it
        try {
            const channel = await this.getChannelByUsername(identifier);
            return channel ? channel.channelId : null;
        } catch (error) {
            console.error('Failed to resolve channel URL:', error);
            return null;
        }
    }

    // Rate limiting helper
    async rateLimitedRequest(requestFunction, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                return await requestFunction();
            } catch (error) {
                if (error.message.includes('quotaExceeded') || error.message.includes('429')) {
                    if (i < retries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                        continue;
                    }
                }
                throw error;
            }
        }
    }

    // Batch processing for multiple requests
    async batchProcess(items, processor, batchSize = 5, delay = 200) {
        const results = [];
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchPromises = batch.map(processor);
            
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            } catch (error) {
                console.error('Batch processing error:', error);
                // Continue with next batch
            }

            // Add delay between batches to respect rate limits
            if (i + batchSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeAPI;
} else {
    window.YouTubeAPI = YouTubeAPI;
}