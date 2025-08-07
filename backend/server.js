// Prospectoo Backend API Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { OpenAI } = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
const { createHash } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI (replace with your API key)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key'
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: ['chrome-extension://*', 'http://localhost:*'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// In-memory cache (in production, use Redis)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// YouTube Data API (replace with your API key)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'your-youtube-api-key';

class ProspectooAI {
    constructor() {
        this.vectorCache = new Map();
        this.channelDatabase = new Map();
        this.emailPatterns = [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            /\b[A-Za-z0-9._%+-]+\s*\[at\]\s*[A-Za-z0-9.-]+\s*\[dot\]\s*[A-Z|a-z]{2,}\b/g,
            /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b/g
        ];
    }

    async generateChannelEmbedding(channelData) {
        try {
            // Create a comprehensive text representation of the channel
            const channelText = this.createChannelTextRepresentation(channelData);
            
            // Generate embedding using OpenAI
            const response = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: channelText,
                encoding_format: "float"
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            // Fallback to simple hash-based similarity
            return this.generateSimpleEmbedding(channelData);
        }
    }

    createChannelTextRepresentation(channelData) {
        const parts = [
            channelData.name || '',
            channelData.description || '',
            channelData.handle || '',
            (channelData.videos || []).map(v => v.title).join(' '),
            Object.values(channelData.socialLinks || {}).filter(Boolean).join(' '),
            channelData.metrics?.category || ''
        ];

        return parts.filter(Boolean).join(' ').toLowerCase();
    }

    generateSimpleEmbedding(channelData) {
        // Fallback: create a simple numerical representation
        const text = this.createChannelTextRepresentation(channelData);
        const hash = createHash('sha256').update(text).digest('hex');
        
        // Convert hash to numerical vector
        const vector = [];
        for (let i = 0; i < hash.length; i += 4) {
            const chunk = hash.slice(i, i + 4);
            vector.push(parseInt(chunk, 16) / 0xFFFF - 1); // Normalize to [-1, 1]
        }
        
        return vector.slice(0, 128); // Limit to 128 dimensions
    }

    calculateCosineSimilarity(vectorA, vectorB) {
        if (vectorA.length !== vectorB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async findSimilarChannels(targetChannel, options = {}) {
        try {
            const maxResults = options.maxResults || 100;
            const minSimilarity = options.minSimilarity || 0.7;

            // Generate embedding for target channel
            const targetEmbedding = await this.generateChannelEmbedding(targetChannel);
            
            // In a real implementation, you would search through a database
            // For demo purposes, we'll generate mock similar channels
            const similarChannels = await this.generateSimilarChannels(
                targetChannel, 
                targetEmbedding, 
                maxResults,
                minSimilarity
            );

            return similarChannels;
        } catch (error) {
            console.error('Error finding similar channels:', error);
            throw new Error('Failed to find similar channels');
        }
    }

    async generateSimilarChannels(targetChannel, targetEmbedding, maxResults, minSimilarity) {
        const categories = this.inferChannelCategory(targetChannel);
        const similarChannels = [];

        // Generate channels based on inferred categories
        for (let i = 0; i < maxResults; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const mockChannel = this.createMockChannel(category, i, targetChannel);
            
            // Calculate similarity
            const mockEmbedding = await this.generateChannelEmbedding(mockChannel);
            const similarity = this.calculateCosineSimilarity(targetEmbedding, mockEmbedding);
            
            if (similarity >= minSimilarity) {
                mockChannel.similarity = Math.round(similarity * 100);
                mockChannel.similarityScore = similarity;
                similarChannels.push(mockChannel);
            }
        }

        // Sort by similarity
        return similarChannels
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .slice(0, maxResults);
    }

    inferChannelCategory(channel) {
        const text = this.createChannelTextRepresentation(channel).toLowerCase();
        const categories = [];

        // Technology keywords
        if (/tech|software|programming|coding|developer|ai|computer|digital/.test(text)) {
            categories.push('Technology', 'Programming', 'AI & Tech');
        }

        // Gaming keywords
        if (/gaming|game|gamer|play|stream|twitch|esports/.test(text)) {
            categories.push('Gaming', 'Streaming', 'Esports');
        }

        // Education keywords
        if (/education|tutorial|learn|teach|course|school|university/.test(text)) {
            categories.push('Education', 'Tutorial', 'Learning');
        }

        // Entertainment keywords
        if (/entertainment|funny|comedy|music|movie|show/.test(text)) {
            categories.push('Entertainment', 'Comedy', 'Music');
        }

        // Business keywords
        if (/business|entrepreneur|startup|marketing|finance|money/.test(text)) {
            categories.push('Business', 'Entrepreneurship', 'Finance');
        }

        // Lifestyle keywords
        if (/lifestyle|vlog|travel|food|fitness|health|fashion/.test(text)) {
            categories.push('Lifestyle', 'Vlog', 'Travel', 'Health');
        }

        return categories.length > 0 ? categories : ['General', 'Entertainment'];
    }

    createMockChannel(category, index, targetChannel) {
        const names = {
            'Technology': ['Tech Insights', 'Code Masters', 'Digital Trends', 'Innovation Hub'],
            'Gaming': ['Game Central', 'Pro Gamer', 'Gaming Universe', 'Stream Kings'],
            'Education': ['Learn Hub', 'Knowledge Base', 'Study Guide', 'Edu Central'],
            'Entertainment': ['Fun Times', 'Comedy Central', 'Entertainment Plus', 'Show Time'],
            'Business': ['Biz Talk', 'Startup Stories', 'Money Matters', 'Success Path'],
            'Lifestyle': ['Life Style', 'Daily Vlogs', 'Living Well', 'Life Journey']
        };

        const categoryNames = names[category] || names['Entertainment'];
        const baseName = categoryNames[index % categoryNames.length];
        const channelName = `${baseName} ${Math.floor(index / categoryNames.length) + 1}`;

        return {
            id: `mock_${category.toLowerCase()}_${index}`,
            name: channelName,
            handle: `@${channelName.replace(/\s+/g, '').toLowerCase()}`,
            subscribers: this.generateRandomSubscribers(),
            views: this.generateRandomViews(),
            avatar: `https://via.placeholder.com/88x88/667eea/ffffff?text=${category[0]}${index + 1}`,
            url: `https://youtube.com/@${channelName.replace(/\s+/g, '').toLowerCase()}`,
            description: `A ${category.toLowerCase()} channel focused on ${this.generateChannelDescription(category)}`,
            category: category,
            verified: Math.random() > 0.8,
            engagement: (Math.random() * 8 + 2).toFixed(1) + '%',
            avgViews: this.generateRandomViews(),
            recentVideos: Math.floor(Math.random() * 50) + 10,
            joinDate: this.generateRandomJoinDate(),
            language: 'en',
            country: this.generateRandomCountry(),
            tags: this.generateChannelTags(category),
            socialLinks: this.generateSocialLinks(channelName)
        };
    }

    generateChannelDescription(category) {
        const descriptions = {
            'Technology': 'cutting-edge tech reviews, programming tutorials, and digital innovation',
            'Gaming': 'gameplay videos, reviews, and gaming community content',
            'Education': 'educational content, tutorials, and learning resources',
            'Entertainment': 'entertaining videos, comedy, and fun content',
            'Business': 'business insights, entrepreneurship tips, and success stories',
            'Lifestyle': 'lifestyle content, vlogs, and personal experiences'
        };
        return descriptions[category] || 'diverse and engaging content';
    }

    generateChannelTags(category) {
        const tags = {
            'Technology': ['tech', 'programming', 'coding', 'software', 'ai', 'innovation'],
            'Gaming': ['gaming', 'gameplay', 'review', 'stream', 'esports', 'gamer'],
            'Education': ['education', 'tutorial', 'learning', 'teach', 'course', 'study'],
            'Entertainment': ['entertainment', 'funny', 'comedy', 'fun', 'show', 'music'],
            'Business': ['business', 'entrepreneur', 'startup', 'marketing', 'finance', 'success'],
            'Lifestyle': ['lifestyle', 'vlog', 'daily', 'personal', 'life', 'experience']
        };
        return tags[category] || ['general', 'content'];
    }

    generateSocialLinks(channelName) {
        const baseHandle = channelName.replace(/\s+/g, '').toLowerCase();
        const hasInstagram = Math.random() > 0.6;
        const hasTwitter = Math.random() > 0.5;
        const hasWebsite = Math.random() > 0.7;

        return {
            instagram: hasInstagram ? `https://instagram.com/${baseHandle}` : null,
            twitter: hasTwitter ? `https://twitter.com/${baseHandle}` : null,
            website: hasWebsite ? `https://${baseHandle}.com` : null
        };
    }

    generateRandomSubscribers() {
        const num = Math.random();
        if (num > 0.95) return `${(Math.random() * 10 + 1).toFixed(1)}M subscribers`;
        if (num > 0.8) return `${Math.floor(Math.random() * 900 + 100)}K subscribers`;
        if (num > 0.5) return `${Math.floor(Math.random() * 99 + 10)}K subscribers`;
        return `${Math.floor(Math.random() * 9999 + 1000)} subscribers`;
    }

    generateRandomViews() {
        const num = Math.random();
        if (num > 0.9) return `${Math.floor(Math.random() * 500 + 50)}M views`;
        if (num > 0.7) return `${Math.floor(Math.random() * 50 + 5)}M views`;
        return `${Math.floor(Math.random() * 999 + 100)}K views`;
    }

    generateRandomJoinDate() {
        const currentYear = new Date().getFullYear();
        const year = Math.floor(Math.random() * (currentYear - 2009)) + 2009;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[Math.floor(Math.random() * 12)];
        return `Joined ${month} ${year}`;
    }

    generateRandomCountry() {
        const countries = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'IN', 'BR', 'MX'];
        return countries[Math.floor(Math.random() * countries.length)];
    }

    async extractEmailFromChannel(channelData) {
        try {
            // Try multiple methods to extract email
            let email = null;

            // Method 1: Check description and about section
            const text = [
                channelData.description || '',
                channelData.name || '',
                (channelData.videos || []).map(v => v.title).join(' ')
            ].join(' ');

            for (const pattern of this.emailPatterns) {
                const matches = text.match(pattern);
                if (matches && matches.length > 0) {
                    email = matches[0].replace(/\s*\[at\]\s*/g, '@').replace(/\s*\[dot\]\s*/g, '.');
                    break;
                }
            }

            // Method 2: Generate probable email based on channel name
            if (!email && Math.random() > 0.4) {
                const domain = channelData.name.toLowerCase()
                    .replace(/[^a-z0-9]/g, '')
                    .substring(0, 15);
                const domains = ['gmail.com', 'outlook.com', 'yahoo.com', `${domain}.com`];
                const selectedDomain = domains[Math.floor(Math.random() * domains.length)];
                email = `contact@${selectedDomain}`;
            }

            return email;
        } catch (error) {
            console.error('Error extracting email:', error);
            return null;
        }
    }
}

// Initialize AI engine
const prospectooAI = new ProspectooAI();

// Helper functions
function getCacheKey(prefix, data) {
    const hash = createHash('md5').update(JSON.stringify(data)).digest('hex');
    return `${prefix}_${hash}`;
}

function isValidCacheEntry(entry) {
    return entry && (Date.now() - entry.timestamp) < CACHE_TTL;
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Find similar channels
app.post('/api/similarity', async (req, res) => {
    try {
        const { channel, options = {} } = req.body;

        if (!channel || !channel.name) {
            return res.status(400).json({
                error: 'Channel data is required with at least a name'
            });
        }

        // Check cache
        const cacheKey = getCacheKey('similarity', { channel: channel.id || channel.name, options });
        const cached = cache.get(cacheKey);

        if (isValidCacheEntry(cached)) {
            return res.json({
                similarChannels: cached.data,
                cached: true,
                timestamp: cached.timestamp
            });
        }

        // Find similar channels using AI
        const similarChannels = await prospectooAI.findSimilarChannels(channel, options);

        // Extract emails if requested
        if (options.includeEmails !== false) {
            for (const similarChannel of similarChannels.slice(0, 20)) {
                const email = await prospectooAI.extractEmailFromChannel(similarChannel);
                if (email) {
                    similarChannel.email = email;
                }
            }
        }

        // Cache results
        cache.set(cacheKey, {
            data: similarChannels,
            timestamp: Date.now()
        });

        res.json({
            similarChannels,
            cached: false,
            timestamp: Date.now(),
            totalFound: similarChannels.length
        });

    } catch (error) {
        console.error('Similarity API error:', error);
        res.status(500).json({
            error: 'Failed to find similar channels',
            message: error.message
        });
    }
});

// Search channels
app.post('/api/search', async (req, res) => {
    try {
        const { query, options = {} } = req.body;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                error: 'Search query is required'
            });
        }

        // Check cache
        const cacheKey = getCacheKey('search', { query, options });
        const cached = cache.get(cacheKey);

        if (isValidCacheEntry(cached)) {
            return res.json({
                channels: cached.data,
                cached: true,
                timestamp: cached.timestamp
            });
        }

        // Perform search (mock implementation)
        const channels = await searchChannels(query, options);

        // Cache results
        cache.set(cacheKey, {
            data: channels,
            timestamp: Date.now()
        });

        res.json({
            channels,
            cached: false,
            timestamp: Date.now(),
            query,
            totalFound: channels.length
        });

    } catch (error) {
        console.error('Search API error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: error.message
        });
    }
});

// Extract emails from channels
app.post('/api/emails', async (req, res) => {
    try {
        const { channels } = req.body;

        if (!channels || !Array.isArray(channels)) {
            return res.status(400).json({
                error: 'Channels array is required'
            });
        }

        const results = [];
        const maxChannels = Math.min(channels.length, 50); // Limit to prevent abuse

        for (let i = 0; i < maxChannels; i++) {
            const channel = channels[i];
            const email = await prospectooAI.extractEmailFromChannel(channel);
            results.push({
                ...channel,
                email,
                emailFound: !!email
            });
        }

        res.json({
            channels: results,
            totalProcessed: results.length,
            emailsFound: results.filter(r => r.email).length,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Email extraction error:', error);
        res.status(500).json({
            error: 'Email extraction failed',
            message: error.message
        });
    }
});

// Get channel analytics
app.post('/api/analytics', async (req, res) => {
    try {
        const { channelId, metrics } = req.body;

        if (!channelId) {
            return res.status(400).json({
                error: 'Channel ID is required'
            });
        }

        // Mock analytics data
        const analytics = {
            channelId,
            metrics: {
                subscribers: Math.floor(Math.random() * 1000000) + 10000,
                totalViews: Math.floor(Math.random() * 10000000) + 100000,
                videoCount: Math.floor(Math.random() * 500) + 50,
                avgViewsPerVideo: Math.floor(Math.random() * 50000) + 5000,
                engagementRate: (Math.random() * 8 + 2).toFixed(2) + '%',
                uploadFrequency: Math.floor(Math.random() * 10) + 1 + ' videos/month',
                topCountries: ['US', 'UK', 'CA', 'AU', 'DE'],
                ageGroups: {
                    '13-17': Math.floor(Math.random() * 20) + 5,
                    '18-24': Math.floor(Math.random() * 30) + 15,
                    '25-34': Math.floor(Math.random() * 25) + 20,
                    '35-44': Math.floor(Math.random() * 20) + 10,
                    '45+': Math.floor(Math.random() * 15) + 5
                }
            },
            timestamp: Date.now()
        };

        res.json(analytics);

    } catch (error) {
        console.error('Analytics API error:', error);
        res.status(500).json({
            error: 'Analytics failed',
            message: error.message
        });
    }
});

// Mock search function
async function searchChannels(query, options) {
    const maxResults = options.maxResults || 50;
    const channels = [];
    
    // Generate mock search results based on query
    const queryWords = query.toLowerCase().split(' ');
    
    for (let i = 0; i < maxResults; i++) {
        const category = queryWords[Math.floor(Math.random() * queryWords.length)];
        const channelName = `${query} Channel ${i + 1}`;
        
        channels.push({
            id: `search_${Date.now()}_${i}`,
            name: channelName,
            handle: `@${channelName.replace(/\s+/g, '').toLowerCase()}`,
            subscribers: prospectooAI.generateRandomSubscribers(),
            views: prospectooAI.generateRandomViews(),
            avatar: `https://via.placeholder.com/88x88/667eea/ffffff?text=${query[0]}${i + 1}`,
            url: `https://youtube.com/@${channelName.replace(/\s+/g, '').toLowerCase()}`,
            description: `A channel about ${query} and related topics`,
            relevance: Math.floor(Math.random() * 30) + 70,
            verified: Math.random() > 0.8,
            category: category,
            joinDate: prospectooAI.generateRandomJoinDate()
        });
    }
    
    return channels.sort((a, b) => b.relevance - a.relevance);
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Prospectoo API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔍 Similarity API: http://localhost:${PORT}/api/similarity`);
    console.log(`📧 Email API: http://localhost:${PORT}/api/emails`);
});

module.exports = app;