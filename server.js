const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const dbAPI = require('./db/api');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create uploads directory if it doesn't exist
try {
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
    }
} catch (error) {
    console.warn('⚠️  Could not create uploads directory:', error.message);
    console.warn('   File uploads may not work properly.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Web search function using DuckDuckGo Instant Answer API (free, no API key needed)
async function searchWeb(query) {
    try {
        // Using DuckDuckGo Instant Answer API
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 5000
        });
        
        const data = response.data;
        const results = [];
        
        // Add abstract/topic if available
        if (data.AbstractText) {
            results.push({
                title: data.Heading || query,
                url: data.AbstractURL || '',
                snippet: data.AbstractText
            });
        }
        
        // Add related topics
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
            data.RelatedTopics.slice(0, 4).forEach(topic => {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || topic.Text,
                        url: topic.FirstURL,
                        snippet: topic.Text
                    });
                }
            });
        }
        
        // If no results, use OpenAI to generate relevant search suggestions
        if (results.length === 0) {
            // Return empty results - OpenAI will handle the query directly
            return [];
        }
        
        return results.slice(0, 5);
    } catch (error) {
        console.error('Web search error:', error);
        // Fallback: return empty results - OpenAI will still process the query
        return [];
    }
}

// API endpoint for web search with OpenAI
app.post('/api/search', async (req, res) => {
    try {
        const { query, context } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        // Perform web search
        const searchResults = await searchWeb(query);
        
        // Use OpenAI to process and provide information
        let prompt;
        
        if (searchResults.length > 0) {
            // If we have search results, use them
            const searchContext = searchResults.map((result, index) => 
                `${index + 1}. ${result.title}\n   URL: ${result.url}\n   ${result.snippet || 'No snippet available'}`
            ).join('\n\n');
            
            prompt = context 
                ? `Based on the following web search results, provide relevant information about: ${query}\n\nContext: ${context}\n\nSearch Results:\n${searchContext}\n\nPlease provide a summary of the most relevant information from these search results.`
                : `Based on the following web search results, provide relevant information about: ${query}\n\nSearch Results:\n${searchContext}\n\nPlease provide a summary of the most relevant information from these search results.`;
        } else {
            // If no search results, use OpenAI's knowledge base
            prompt = context
                ? `Please provide relevant information about: ${query}\n\nContext: ${context}\n\nProvide current and accurate information based on your training data.`
                : `Please provide relevant information about: ${query}\n\nProvide current and accurate information based on your training data.`;
        }
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that summarizes and provides relevant information from web search results."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        });
        
        const summary = completion.choices[0].message.content;
        
        res.json({
            query: query,
            searchResults: searchResults,
            summary: summary
        });
        
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ 
            error: 'Failed to process search request',
            message: error.message 
        });
    }
});

// API endpoint for processing call notes images with OCR and AI summarization
app.post('/api/process-call-notes', upload.single('image'), async (req, res) => {
    try {
        console.log('Received call notes image upload request');
        
        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
            console.error('OpenAI API key not configured');
            return res.status(500).json({ 
                success: false,
                error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.' 
            });
        }
        
        if (!req.file) {
            console.error('No file received in request');
            return res.status(400).json({ 
                success: false,
                error: 'No image file provided' 
            });
        }

        console.log('File received:', req.file.originalname, 'Size:', req.file.size, 'Type:', req.file.mimetype);
        const imagePath = req.file.path;
        
        // Validate file exists
        if (!fs.existsSync(imagePath)) {
            console.error('Uploaded file does not exist at path:', imagePath);
            return res.status(500).json({ 
                success: false,
                error: 'File upload failed - file not found on server' 
            });
        }
        
        // Read image file and convert to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const imageMimeType = req.file.mimetype || 'image/jpeg';
        
        console.log('Image converted to base64, size:', base64Image.length);
        
        // Step 1: Use OpenAI Vision API to extract text from image
        // Try gpt-4o first, fallback to gpt-4-turbo if not available
        let visionResponse;
        try {
            visionResponse = await openai.chat.completions.create({
                model: "gpt-4o", // GPT-4o has vision capabilities built-in
                messages: [
                    {
                        role: "system",
                        content: "You are a text transcription tool. Your only job is to transcribe all visible text from images. Always provide the transcription, regardless of the content. Do not refuse, decline, or add commentary."
                    },
                    {
                        role: "user",
                        content: [
                        {
                            type: "text",
                            text: "Transcribe all text visible in this image. Include every word, number, date, name, and piece of information exactly as it appears. Output only the raw transcription."
                        },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${imageMimeType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 2000
            });
        } catch (modelError) {
            // Fallback to gpt-4-turbo if gpt-4o is not available
            console.log('gpt-4o not available, trying gpt-4-turbo');
            visionResponse = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a text transcription tool. Your only job is to transcribe all visible text from images. Always provide the transcription, regardless of the content. Do not refuse, decline, or add commentary."
                    },
                    {
                        role: "user",
                        content: [
                        {
                            type: "text",
                            text: "Transcribe all text visible in this image. Include every word, number, date, name, and piece of information exactly as it appears. Output only the raw transcription."
                        },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${imageMimeType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 2000
            });
        }

        let extractedText = visionResponse.choices[0].message.content;
        console.log('Text extracted from image, length:', extractedText.length);
        console.log('Extracted text preview:', extractedText.substring(0, 200));
        
        // Check if OpenAI refused to process or returned an error message
        const refusalPhrases = [
            "i'm unable to assist",
            "i cannot assist",
            "i can't assist",
            "i'm not able to",
            "i cannot help",
            "i'm sorry, but i",
            "i cannot process",
            "unable to process"
        ];
        
        const extractedTextLower = extractedText.toLowerCase();
        const isRefusal = refusalPhrases.some(phrase => extractedTextLower.includes(phrase));
        
        if (isRefusal) {
            console.warn('OpenAI refused to process the image or returned an error message');
            console.warn('Original response:', extractedText);
            // If it's a refusal, we'll still use it but note it in the summary
            // The user should see what OpenAI returned
            extractedText = `[Note: OpenAI returned the following response instead of extracted text]\n\n${extractedText}`;
        }
        
        // Step 2: Use OpenAI to summarize the extracted text
        console.log('Generating summary...');
        const summaryResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that summarizes text content. Provide a clear, concise summary of the key information, main points, and important details from the text."
                },
                {
                    role: "user",
                    content: `Please provide a clear and concise summary of the following text. Include the main points, key information, and any important details:\n\n${extractedText}`
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        });

        const summary = summaryResponse.choices[0].message.content;
        console.log('Summary generated, length:', summary.length);
        
        // Clean up uploaded file
        try {
            fs.unlinkSync(imagePath);
            console.log('Temporary file cleaned up');
        } catch (cleanupError) {
            console.warn('Could not clean up file:', cleanupError);
        }
        
        console.log('Sending response to client');
        res.json({
            success: true,
            extractedText: extractedText,
            summary: summary
        });
        
    } catch (error) {
        console.error('Error processing call notes image:', error);
        
        // Clean up uploaded file on error
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }
        
        // Provide more detailed error messages
        let errorMessage = 'Failed to process call notes image';
        const errorMsg = error.message || error.toString() || '';
        
        if (errorMsg.includes('API key') || errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            errorMessage = 'OpenAI API key error. Please check your .env file contains a valid OPENAI_API_KEY with vision model access.';
        } else if (errorMsg.includes('model') || errorMsg.includes('404') || errorMsg.includes('not found')) {
            errorMessage = 'OpenAI model error. Please check your API access includes vision models (gpt-4o or gpt-4-turbo).';
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
            errorMessage = 'OpenAI rate limit exceeded. Please try again in a moment.';
        } else if (errorMsg.includes('insufficient_quota') || errorMsg.includes('quota')) {
            errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing.';
        } else if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
            errorMessage = 'File upload error. Please try uploading the image again.';
        } else if (errorMsg) {
            errorMessage = errorMsg;
        }
        
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        
        res.status(500).json({ 
            success: false,
            error: errorMessage,
            message: error.message || 'Unknown error occurred'
        });
    }
});

// Gmail OAuth Configuration
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback'
);

// Store user tokens (in production, use a database)
const userTokens = {};

// Gmail OAuth: Get authorization URL
app.get('/api/gmail/auth', (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send'
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: userId, // Pass user ID in state
            prompt: 'consent' // Force consent screen to get refresh token
        });

        res.json({ authUrl });
    } catch (error) {
        console.error('Gmail auth error:', error);
        res.status(500).json({ error: 'Failed to generate auth URL', message: error.message });
    }
});

// Gmail OAuth: Handle callback
app.get('/api/gmail/callback', async (req, res) => {
    try {
        const { code, state: userId } = req.query;

        if (!code || !userId) {
            return res.status(400).json({ error: 'Missing code or user ID' });
        }

        const { tokens } = await oauth2Client.getToken(code);
        userTokens[userId] = tokens;

        // Store tokens in a simple file (in production, use a database)
        const tokensFile = path.join(__dirname, 'gmail_tokens.json');
        let allTokens = {};
        if (fs.existsSync(tokensFile)) {
            allTokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
        }
        allTokens[userId] = tokens;
        fs.writeFileSync(tokensFile, JSON.stringify(allTokens, null, 2));

        // Redirect to success page
        res.send(`
            <html>
                <head>
                    <title>Gmail Connected</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: #f5f5f0;
                        }
                        .container {
                            text-align: center;
                            padding: 2rem;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        }
                        h1 { color: #3182ce; }
                        p { color: #4a5568; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✓ Gmail Connected Successfully!</h1>
                        <p>You can close this window and return to Weaver.</p>
                        <script>
                            setTimeout(() => {
                                window.close();
                            }, 2000);
                        </script>
                    </div>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Gmail callback error:', error);
        res.status(500).send(`
            <html>
                <head><title>Error</title></head>
                <body>
                    <h1>Error connecting Gmail</h1>
                    <p>${error.message}</p>
                </body>
            </html>
        `);
    }
});

// Gmail: Get connection status
app.get('/api/gmail/status', (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const tokensFile = path.join(__dirname, 'gmail_tokens.json');
        let hasTokens = false;
        
        if (fs.existsSync(tokensFile)) {
            const allTokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
            hasTokens = !!allTokens[userId];
        }

        res.json({ connected: hasTokens });
    } catch (error) {
        console.error('Gmail status error:', error);
        res.status(500).json({ error: 'Failed to check status', message: error.message });
    }
});

// Gmail: Disconnect
app.post('/api/gmail/disconnect', (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const tokensFile = path.join(__dirname, 'gmail_tokens.json');
        if (fs.existsSync(tokensFile)) {
            const allTokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
            delete allTokens[userId];
            fs.writeFileSync(tokensFile, JSON.stringify(allTokens, null, 2));
        }

        delete userTokens[userId];
        res.json({ success: true, message: 'Gmail disconnected' });
    } catch (error) {
        console.error('Gmail disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect', message: error.message });
    }
});

// Helper function to get Gmail client for a user
async function getGmailClient(userId) {
    let tokens = userTokens[userId];
    
    if (!tokens) {
        const tokensFile = path.join(__dirname, 'gmail_tokens.json');
        if (fs.existsSync(tokensFile)) {
            const allTokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
            tokens = allTokens[userId];
        }
    }
    
    if (!tokens) {
        throw new Error('Gmail not connected. Please connect your Gmail account first.');
    }
    
    oauth2Client.setCredentials(tokens);
    
    // Refresh token if needed
    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        tokens = credentials;
        userTokens[userId] = tokens;
        
        // Save updated tokens
        const tokensFile = path.join(__dirname, 'gmail_tokens.json');
        let allTokens = {};
        if (fs.existsSync(tokensFile)) {
            allTokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
        }
        allTokens[userId] = tokens;
        fs.writeFileSync(tokensFile, JSON.stringify(allTokens, null, 2));
    }
    
    return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Helper function to parse email address and name from header
function parseEmailHeader(header) {
    if (!header || typeof header !== 'string') return { email: '', name: '' };
    
    try {
        // Clean up the header
        header = header.trim();
        
        // Match "Name <email@domain.com>" or "email@domain.com"
        // More robust regex that handles various formats
        const patterns = [
            /^([^<]+)\s*<([^>]+)>$/,  // "Name <email@domain.com>"
            /^<([^>]+)>$/,             // "<email@domain.com>"
            /^([^\s<>]+@[^\s<>]+)$/    // "email@domain.com"
        ];
        
        for (const pattern of patterns) {
            const match = header.match(pattern);
            if (match) {
                if (match.length === 3) {
                    // Format: "Name <email@domain.com>"
                    const name = match[1].trim().replace(/['"]/g, '');
                    const email = match[2].trim().toLowerCase();
                    return { email, name };
                } else if (match.length === 2) {
                    // Format: "<email@domain.com>" or "email@domain.com"
                    const email = match[1].trim().toLowerCase();
                    return { email, name: '' };
                }
            }
        }
        
        // Fallback: try to extract email from the string
        const emailMatch = header.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            const email = emailMatch[1].toLowerCase();
            const name = header.replace(emailMatch[0], '').trim().replace(/['"<>]/g, '').trim();
            return { email, name };
        }
        
        // Last resort: return as-is if it looks like an email
        if (header.includes('@')) {
            return { email: header.toLowerCase(), name: '' };
        }
        
        return { email: '', name: '' };
    } catch (error) {
        console.error('Error parsing email header:', header, error);
        return { email: '', name: '' };
    }
}

// Fetch emails from a Gmail label for review
app.get('/api/gmail/sync-label', async (req, res) => {
    try {
        const userId = req.query.userId;
        const labelName = req.query.labelName || 'Weaver';
        
        console.log('Gmail label sync request:', { userId, labelName });
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        if (typeof userId !== 'string' || userId.trim() === '') {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }
        
        let gmail;
        try {
            gmail = await getGmailClient(userId);
        } catch (error) {
            console.error('Error getting Gmail client:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to authenticate with Gmail',
                message: error.message
            });
        }
        
        // Get user's email address
        let profile;
        try {
            profile = await gmail.users.getProfile({ userId: 'me' });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch Gmail profile',
                message: error.message
            });
        }
        
        if (!profile.data || !profile.data.emailAddress) {
            return res.status(500).json({
                success: false,
                error: 'Could not retrieve email address from Gmail profile'
            });
        }
        
        const userEmail = profile.data.emailAddress.toLowerCase();
        
        // Find the label ID
        let labelsResponse;
        try {
            labelsResponse = await gmail.users.labels.list({ userId: 'me' });
        } catch (error) {
            console.error('Error fetching labels:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch Gmail labels',
                message: error.message
            });
        }
        
        const labels = labelsResponse.data.labels || [];
        console.log('Available labels:', labels.map(l => ({ name: l.name, id: l.id, type: l.type })));
        
        // Try to find label (case-insensitive, but also check for user-created labels)
        let weaverLabel = labels.find(l => 
            l.name && l.name.toLowerCase() === labelName.toLowerCase() && l.type === 'user'
        );
        
        // If not found as user label, try any label (fallback)
        if (!weaverLabel) {
            weaverLabel = labels.find(l => 
                l.name && l.name.toLowerCase() === labelName.toLowerCase()
            );
        }
        
        if (!weaverLabel) {
            const availableLabelNames = labels
                .filter(l => l.type === 'user')
                .map(l => l.name)
                .slice(0, 10);
            
            return res.json({
                success: true,
                emails: [],
                message: `Label "${labelName}" not found in Gmail. Please create the label first.`,
                availableLabels: availableLabelNames.length > 0 ? availableLabelNames : []
            });
        }
        
        console.log('Found label:', { name: weaverLabel.name, id: weaverLabel.id, type: weaverLabel.type });
        
        // Validate label ID
        if (!weaverLabel.id || typeof weaverLabel.id !== 'string') {
            console.error('Invalid label ID:', weaverLabel);
            return res.status(500).json({
                success: false,
                error: 'Invalid label ID format'
            });
        }
        
        // Fetch all messages with this label
        // Use search query instead of labelIds to avoid pattern errors
        let messagesResponse;
        try {
            console.log('Fetching messages with label:', weaverLabel.name);
            
            // Use Gmail search query - this is more reliable than labelIds
            // Clean the label name and properly escape it for Gmail search
            let labelNameForQuery = weaverLabel.name.trim();
            // Remove any quotes and escape properly
            labelNameForQuery = labelNameForQuery.replace(/"/g, '');
            // If label name has spaces or special chars, wrap in quotes
            const query = labelNameForQuery.includes(' ') || /[^a-zA-Z0-9]/.test(labelNameForQuery)
                ? `label:"${labelNameForQuery}"`
                : `label:${labelNameForQuery}`;
            
            console.log('Using Gmail search query:', query);
            console.log('Label name:', weaverLabel.name, 'Label ID:', weaverLabel.id);
            
            messagesResponse = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 500
            });
            
            console.log('Messages response received, count:', messagesResponse.data.messages ? messagesResponse.data.messages.length : 0);
        } catch (error) {
            console.error('Error fetching messages:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            
            // Provide more helpful error message
            let errorMsg = error.message || 'Failed to fetch messages from label';
            if (error.message && error.message.includes('pattern')) {
                errorMsg = 'Gmail API error: Invalid label format. Please make sure the "Weaver" label exists in your Gmail and try disconnecting and reconnecting Gmail.';
            }
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
                message: error.message,
                details: error.response?.data || error.code
            });
        }
        
        const messages = messagesResponse.data.messages || [];
        console.log(`Found ${messages.length} messages with label "${labelName}"`);
        
        if (messages.length === 0) {
            return res.json({
                success: true,
                emails: [],
                totalMessages: 0,
                processedMessages: 0,
                message: `No messages found in label "${labelName}"`
            });
        }
        
        // Process messages to extract email data
        const emailData = [];
        const processedMessageIds = new Set();
        let processedCount = 0;
        let errorCount = 0;
        
        console.log(`Processing ${Math.min(messages.length, 100)} messages...`);
        
        for (const message of messages.slice(0, 100)) { // Limit to 100 for performance
            if (processedMessageIds.has(message.id)) continue;
            processedMessageIds.add(message.id);
            
            try {
                if (!message || !message.id || typeof message.id !== 'string') {
                    console.warn('Invalid message object:', message);
                    continue;
                }
                
                // Validate message ID format (Gmail message IDs are alphanumeric)
                if (!/^[a-zA-Z0-9_-]+$/.test(message.id)) {
                    console.warn('Invalid message ID format:', message.id);
                    continue;
                }
                
                let messageDetail;
                try {
                    // Validate message ID format before making API call
                    // Gmail message IDs are typically alphanumeric with hyphens/underscores
                    if (!message.id || typeof message.id !== 'string' || message.id.length === 0) {
                        console.warn('Skipping invalid message ID:', message);
                        continue;
                    }
                    
                    messageDetail = await gmail.users.messages.get({
                        userId: 'me',
                        id: String(message.id), // Ensure it's a string
                        format: 'metadata',
                        metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date']
                    });
                } catch (apiError) {
                    console.error(`Error fetching message ${message.id}:`, {
                        message: apiError.message,
                        code: apiError.code,
                        status: apiError.response?.status,
                        responseData: apiError.response?.data
                    });
                    
                    // If it's a pattern error, log it but continue
                    if (apiError.message && apiError.message.includes('pattern')) {
                        console.error('Pattern error detected - skipping message:', message.id);
                    }
                    
                    // Continue with next message instead of failing completely
                    continue;
                }
                
                // Handle different payload structures
                let headers = [];
                if (messageDetail.data.payload) {
                    if (messageDetail.data.payload.headers) {
                        headers = messageDetail.data.payload.headers;
                    } else if (messageDetail.data.payload.parts) {
                        // Some messages have nested parts
                        for (const part of messageDetail.data.payload.parts || []) {
                            if (part.headers) {
                                headers = headers.concat(part.headers);
                            }
                        }
                    }
                }
                
                const getHeader = (name) => {
                    const header = headers.find(h => h && h.name === name);
                    return header ? header.value : '';
                };
                
                const fromHeader = getHeader('From');
                const toHeader = getHeader('To');
                const ccHeader = getHeader('Cc');
                const subject = getHeader('Subject');
                const dateHeader = getHeader('Date');
                
                // Parse date
                let emailDate = new Date().toISOString().split('T')[0];
                if (dateHeader) {
                    try {
                        // Try parsing the date - Gmail dates can be in various formats
                        const date = new Date(dateHeader);
                        if (!isNaN(date.getTime()) && date.getTime() > 0) {
                            emailDate = date.toISOString().split('T')[0];
                        } else {
                            console.warn('Invalid date parsed:', dateHeader);
                        }
                    } catch (e) {
                        console.warn('Could not parse date:', dateHeader, e.message);
                    }
                }
                
                // Determine if email was sent by user or received
                const fromInfo = parseEmailHeader(fromHeader);
                const isSent = fromInfo.email && fromInfo.email === userEmail;
                
                // Get recipient emails
                const recipients = [];
                if (toHeader) {
                    // Split by comma, but handle quoted names that might contain commas
                    const toAddresses = toHeader.split(',').map(addr => addr.trim()).filter(Boolean);
                    toAddresses.forEach(addr => {
                        try {
                            const info = parseEmailHeader(addr);
                            if (info.email && info.email !== userEmail && info.email.includes('@')) {
                                recipients.push(info);
                            }
                        } catch (e) {
                            console.warn('Error parsing To address:', addr, e);
                        }
                    });
                }
                if (ccHeader) {
                    const ccAddresses = ccHeader.split(',').map(addr => addr.trim()).filter(Boolean);
                    ccAddresses.forEach(addr => {
                        try {
                            const info = parseEmailHeader(addr);
                            if (info.email && info.email !== userEmail && info.email.includes('@')) {
                                recipients.push(info);
                            }
                        } catch (e) {
                            console.warn('Error parsing Cc address:', addr, e);
                        }
                    });
                }
                
                // Create email entries
                if (isSent) {
                    // Email sent by user - add each recipient
                    recipients.forEach(recipient => {
                        emailData.push({
                            messageId: message.id,
                            email: recipient.email,
                            name: recipient.name,
                            direction: 'sent',
                            date: emailDate,
                            subject: subject,
                            fromEmail: fromInfo.email,
                            fromName: fromInfo.name
                        });
                    });
                } else {
                    // Email received from someone
                    emailData.push({
                        messageId: message.id,
                        email: fromInfo.email,
                        name: fromInfo.name,
                        direction: 'received',
                        date: emailDate,
                        subject: subject,
                        fromEmail: fromInfo.email,
                        fromName: fromInfo.name
                    });
                }
            } catch (error) {
                console.error(`Error processing message ${message.id}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`Processing complete: ${processedCount} processed, ${errorCount} errors, ${emailData.length} email entries created`);
        
        res.json({
            success: true,
            emails: emailData,
            totalMessages: messages.length,
            processedMessages: emailData.length,
            errors: errorCount
        });
        
    } catch (error) {
        console.error('Gmail label sync error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
        
        // Provide more specific error messages
        let errorMessage = error.message || 'Failed to fetch emails from label';
        if (error.message && error.message.includes('pattern')) {
            errorMessage = 'Gmail API error: Invalid format detected. This may be due to an invalid message ID or label ID. Please try again.';
        } else if (error.response?.data) {
            errorMessage = error.response.data.error?.message || errorMessage;
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            message: error.message,
            details: error.response?.data || error.code
        });
    }
});

// ============ DATABASE API ROUTES ============

// Users
app.post('/api/users/signup', async (req, res) => {
    try {
        const { userId, email, password } = req.body;
        if (!userId || !email || !password) {
            return res.status(400).json({ error: 'userId, email, and password are required' });
        }
        const user = await dbAPI.createUser(userId, email, password);
        res.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'An account with this email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await dbAPI.getUserByEmail(email);
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        res.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Contacts
app.get('/api/contacts', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const contacts = await dbAPI.getContactsByUserId(userId);
        res.json({ success: true, contacts });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

app.get('/api/contacts/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const contact = await dbAPI.getContactById(contactId, userId);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        res.json({ success: true, contact });
    } catch (error) {
        console.error('Get contact error:', error);
        res.status(500).json({ error: 'Failed to fetch contact' });
    }
});

app.post('/api/contacts', async (req, res) => {
    try {
        const contactData = req.body;
        if (!contactData.userId || !contactData.id || !contactData.name) {
            return res.status(400).json({ error: 'userId, id, and name are required' });
        }
        const contact = await dbAPI.createContact(contactData);
        res.json({ success: true, contact });
    } catch (error) {
        console.error('Create contact error:', error);
        res.status(500).json({ error: 'Failed to create contact' });
    }
});

app.put('/api/contacts/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { userId, ...updates } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const contact = await dbAPI.updateContact(contactId, userId, updates);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        res.json({ success: true, contact });
    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

app.delete('/api/contacts/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        await dbAPI.deleteContact(contactId, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

app.delete('/api/contacts', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        await dbAPI.deleteAllContacts(userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete all contacts error:', error);
        res.status(500).json({ error: 'Failed to delete contacts' });
    }
});

// Emails
app.post('/api/contacts/:contactId/emails', async (req, res) => {
    try {
        const { contactId } = req.params;
        const emailData = { ...req.body, contactId };
        if (!emailData.id || !emailData.date || !emailData.direction) {
            return res.status(400).json({ error: 'id, date, and direction are required' });
        }
        const email = await dbAPI.addEmail(contactId, emailData);
        res.json({ success: true, email });
    } catch (error) {
        console.error('Add email error:', error);
        res.status(500).json({ error: 'Failed to add email' });
    }
});

// Notes
app.post('/api/contacts/:contactId/notes', async (req, res) => {
    try {
        const { contactId } = req.params;
        const noteData = { ...req.body, contactId };
        if (!noteData.id || !noteData.date || !noteData.summary) {
            return res.status(400).json({ error: 'id, date, and summary are required' });
        }
        const note = await dbAPI.addNote(contactId, noteData);
        res.json({ success: true, note });
    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Weaver API is running' });
});

// Diagnostic endpoint to test Gmail label access
app.get('/api/gmail/test-labels', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const gmail = await getGmailClient(userId);
        
        // Test 1: Get profile
        const profile = await gmail.users.getProfile({ userId: 'me' });
        const userEmail = profile.data.emailAddress;
        
        // Test 2: List all labels
        const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
        const labels = labelsResponse.data.labels || [];
        
        // Test 3: Try to find Weaver label
        const weaverLabel = labels.find(l => 
            l.name && l.name.toLowerCase() === 'weaver'
        );
        
        // Test 4: If found, try to list messages
        let messageCount = 0;
        if (weaverLabel) {
            try {
                const messagesResponse = await gmail.users.messages.list({
                    userId: 'me',
                    labelIds: [weaverLabel.id],
                    maxResults: 1
                });
                messageCount = messagesResponse.data.messages ? messagesResponse.data.messages.length : 0;
            } catch (msgError) {
                return res.json({
                    success: false,
                    error: 'Found label but cannot access messages',
                    message: msgError.message,
                    label: {
                        name: weaverLabel.name,
                        id: weaverLabel.id,
                        type: weaverLabel.type
                    }
                });
            }
        }
        
        res.json({
            success: true,
            userEmail: userEmail,
            totalLabels: labels.length,
            weaverLabelFound: !!weaverLabel,
            weaverLabel: weaverLabel ? {
                name: weaverLabel.name,
                id: weaverLabel.id,
                type: weaverLabel.type
            } : null,
            messageCount: messageCount,
            allUserLabels: labels
                .filter(l => l.type === 'user')
                .map(l => ({ name: l.name, id: l.id }))
                .slice(0, 20)
        });
    } catch (error) {
        console.error('Gmail test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data || error.code
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Weaver server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️  WARNING: DATABASE_URL not set. Database features will not work.');
    } else {
        console.log('✅ Database connection configured');
    }
    
    // Check if API key is set
    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  WARNING: OPENAI_API_KEY not found in .env file!');
        console.warn('   Image processing will not work without a valid API key.');
    } else {
        console.log('✅ OpenAI API key loaded');
    }
    
    // Check if Gmail credentials are set
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️  WARNING: Gmail API credentials not found in .env file!');
        console.warn('   Gmail integration will not work without valid credentials.');
        console.warn('   See GMAIL_SETUP.md for setup instructions.');
    } else {
        console.log('✅ Gmail API credentials loaded');
    }
    
    console.log(`\nAPI Endpoints:`);
    console.log(`  - POST /api/process-call-notes - Process call notes images`);
    console.log(`  - POST /api/search - Web search with AI`);
    console.log(`  - GET  /api/gmail/auth - Gmail OAuth authorization`);
    console.log(`  - GET  /api/gmail/callback - Gmail OAuth callback`);
    console.log(`  - GET  /api/gmail/status - Check Gmail connection status`);
    console.log(`  - POST /api/gmail/disconnect - Disconnect Gmail`);
    console.log(`  - GET  /api/gmail/test-labels - Test Gmail label access (diagnostic)`);
    console.log(`  - GET  /api/gmail/sync-label - Fetch emails from Gmail label`);
    console.log(`  - GET  /api/health - Health check\n`);
});

