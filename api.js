// API functions for web search with OpenAI

// Use relative URL to work in both development and production
const API_BASE_URL = '/api';

/**
 * Search the web using OpenAI
 * @param {string} query - Search query
 * @param {string} context - Optional context about the contact/query
 * @returns {Promise<Object>} Search results and AI summary
 */
async function searchWeb(query, context = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                context: context
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Web search error:', error);
        throw error;
    }
}

/**
 * Get relevant news articles for a contact
 * @param {string} contactName - Name of the contact
 * @param {string} firm - Company/firm name
 * @param {string} position - Job position
 * @param {string} industry - Industry or notes context
 * @returns {Promise<Array>} Array of relevant articles
 */
async function getRelevantArticles(contactName, firm, position, industry = '') {
    try {
        const query = `${contactName} ${firm} ${position} ${industry} news articles`;
        const context = `Find recent news articles relevant to ${contactName} at ${firm} (${position}). Focus on industry news, company updates, and professional developments.`;
        
        const results = await searchWeb(query, context);
        
        // Return top 3 articles
        return results.searchResults.slice(0, 3).map((result, index) => ({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            summary: results.summary
        }));
    } catch (error) {
        console.error('Error fetching articles:', error);
        return [];
    }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { searchWeb, getRelevantArticles };
}

