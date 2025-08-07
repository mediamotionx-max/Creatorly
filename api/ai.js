// AI Integration Module for Prospectoo Extension
class AIService {
    constructor(provider, apiKey) {
        this.provider = provider;
        this.apiKey = apiKey;
        this.baseUrls = {
            openai: 'https://api.openai.com/v1',
            anthropic: 'https://api.anthropic.com/v1',
            google: 'https://generativelanguage.googleapis.com/v1beta'
        };
    }

    async findSimilarChannels(channelData, options = {}) {
        const prompt = this.buildSimilarChannelsPrompt(channelData, options);
        
        try {
            const response = await this.callAI(prompt, {
                maxTokens: 1500,
                temperature: 0.7
            });

            return this.parseSimilarChannelsResponse(response);
        } catch (error) {
            console.error('AI similar channels request failed:', error);
            throw error;
        }
    }

    async analyzeChannel(channelData, videoData = []) {
        const prompt = this.buildChannelAnalysisPrompt(channelData, videoData);
        
        try {
            const response = await this.callAI(prompt, {
                maxTokens: 2000,
                temperature: 0.3
            });

            return this.parseChannelAnalysisResponse(response);
        } catch (error) {
            console.error('AI channel analysis request failed:', error);
            throw error;
        }
    }

    async categorizeChannel(channelData) {
        const prompt = this.buildCategorizationPrompt(channelData);
        
        try {
            const response = await this.callAI(prompt, {
                maxTokens: 500,
                temperature: 0.2
            });

            return this.parseCategoryResponse(response);
        } catch (error) {
            console.error('AI categorization request failed:', error);
            throw error;
        }
    }

    async generateSearchKeywords(topic, options = {}) {
        const prompt = this.buildKeywordPrompt(topic, options);
        
        try {
            const response = await this.callAI(prompt, {
                maxTokens: 800,
                temperature: 0.5
            });

            return this.parseKeywordsResponse(response);
        } catch (error) {
            console.error('AI keyword generation failed:', error);
            throw error;
        }
    }

    async extractEmails(text) {
        const prompt = this.buildEmailExtractionPrompt(text);
        
        try {
            const response = await this.callAI(prompt, {
                maxTokens: 500,
                temperature: 0.1
            });

            return this.parseEmailsResponse(response);
        } catch (error) {
            console.error('AI email extraction failed:', error);
            return this.fallbackEmailExtraction(text);
        }
    }

    buildSimilarChannelsPrompt(channelData, options) {
        const { maxChannels = 10, focusArea = 'content' } = options;
        
        return `Find ${maxChannels} YouTube channels similar to the following channel:

Channel Name: ${channelData.title}
Subscribers: ${channelData.subscriberCount || 'Unknown'}
Description: ${channelData.description?.substring(0, 500) || 'No description'}
Video Count: ${channelData.videoCount || 'Unknown'}
Country: ${channelData.country || 'Unknown'}

Focus on: ${focusArea}

Return a JSON array with the following structure for each similar channel:
{
  "name": "Channel Name",
  "estimatedSubscribers": "100K",
  "category": "Technology",
  "similarity": 85,
  "reason": "Brief explanation of similarity",
  "niche": "Specific niche within category",
  "contentType": "Educational/Entertainment/Reviews/etc",
  "targetAudience": "Description of target audience"
}

Only return valid JSON, no additional text.`;
    }

    buildChannelAnalysisPrompt(channelData, videoData) {
        const recentVideos = videoData.slice(0, 5).map(video => 
            `- ${video.title} (${video.viewCount} views)`
        ).join('\n');

        return `Analyze this YouTube channel and provide detailed insights:

Channel: ${channelData.title}
Subscribers: ${channelData.subscriberCount || 'Unknown'}
Total Views: ${channelData.viewCount || 'Unknown'}
Video Count: ${channelData.videoCount || 'Unknown'}
Description: ${channelData.description?.substring(0, 800) || 'No description'}

Recent Videos:
${recentVideos || 'No video data available'}

Provide analysis in JSON format:
{
  "contentStrategy": "Analysis of content approach",
  "audienceEngagement": "Assessment of audience interaction",
  "growthPotential": "Evaluation of growth opportunities",
  "strengths": ["strength1", "strength2"],
  "improvements": ["suggestion1", "suggestion2"],
  "niche": "Specific niche identification",
  "competitorLevel": "Assessment vs competitors",
  "monetizationPotential": "Revenue generation assessment",
  "contentConsistency": "Upload frequency and consistency",
  "brandingQuality": "Channel branding assessment"
}

Only return valid JSON.`;
    }

    buildCategorizationPrompt(channelData) {
        return `Categorize this YouTube channel into specific categories:

Channel: ${channelData.title}
Description: ${channelData.description?.substring(0, 500) || 'No description'}

Return JSON with:
{
  "primaryCategory": "Main category",
  "secondaryCategories": ["category1", "category2"],
  "niche": "Specific niche",
  "contentType": "Educational/Entertainment/etc",
  "targetAudience": "Audience description",
  "tags": ["tag1", "tag2", "tag3"]
}

Only return valid JSON.`;
    }

    buildKeywordPrompt(topic, options) {
        const { language = 'en', region = 'US', intent = 'discovery' } = options;
        
        return `Generate YouTube search keywords for: "${topic}"

Parameters:
- Language: ${language}
- Region: ${region}
- Intent: ${intent}

Return JSON with:
{
  "primaryKeywords": ["keyword1", "keyword2"],
  "longTailKeywords": ["longer keyword phrase 1"],
  "relatedTopics": ["topic1", "topic2"],
  "channelKeywords": ["keywords for finding channels"],
  "videoKeywords": ["keywords for finding videos"]
}

Only return valid JSON.`;
    }

    buildEmailExtractionPrompt(text) {
        return `Extract and validate email addresses from this text:

"${text.substring(0, 1000)}"

Return JSON with:
{
  "emails": ["email1@domain.com", "email2@domain.com"],
  "confidence": "high/medium/low",
  "businessEmails": ["business emails only"],
  "personalEmails": ["personal emails only"]
}

Only return valid JSON. Filter out obvious spam/fake emails.`;
    }

    async callAI(prompt, options = {}) {
        switch (this.provider) {
            case 'openai':
                return await this.callOpenAI(prompt, options);
            case 'anthropic':
                return await this.callAnthropic(prompt, options);
            case 'google':
                return await this.callGoogleAI(prompt, options);
            default:
                throw new Error(`Unsupported AI provider: ${this.provider}`);
        }
    }

    async callOpenAI(prompt, options) {
        const response = await fetch(`${this.baseUrls.openai}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a YouTube analytics expert. Always return valid JSON responses.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: options.maxTokens || 1000,
                temperature: options.temperature || 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callAnthropic(prompt, options) {
        const response = await fetch(`${this.baseUrls.anthropic}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: options.maxTokens || 1000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    async callGoogleAI(prompt, options) {
        const response = await fetch(
            `${this.baseUrls.google}/models/gemini-pro:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: options.temperature || 0.7,
                        maxOutputTokens: options.maxTokens || 1000
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Google AI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    parseSimilarChannelsResponse(response) {
        try {
            const parsed = JSON.parse(response);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to parse similar channels response:', error);
            return [];
        }
    }

    parseChannelAnalysisResponse(response) {
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error('Failed to parse channel analysis response:', error);
            return {
                contentStrategy: 'Analysis unavailable',
                strengths: [],
                improvements: []
            };
        }
    }

    parseCategoryResponse(response) {
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error('Failed to parse category response:', error);
            return {
                primaryCategory: 'Unknown',
                niche: 'Unknown'
            };
        }
    }

    parseKeywordsResponse(response) {
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error('Failed to parse keywords response:', error);
            return {
                primaryKeywords: [],
                longTailKeywords: []
            };
        }
    }

    parseEmailsResponse(response) {
        try {
            const parsed = JSON.parse(response);
            return parsed.emails || [];
        } catch (error) {
            console.error('Failed to parse emails response:', error);
            return [];
        }
    }

    fallbackEmailExtraction(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = text.match(emailRegex) || [];
        
        return [...new Set(emails)].filter(email => {
            return this.isValidEmail(email) && !this.isCommonFalsePositive(email);
        });
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
            'no-reply@',
            'support@youtube.com',
            'support@google.com'
        ];
        
        return falsePositives.some(fp => email.toLowerCase().includes(fp));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
} else {
    window.AIService = AIService;
}