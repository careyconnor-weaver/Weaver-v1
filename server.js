const express = require('express');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const cron = require('node-cron');
const dbAPI = require('./db/api');
const { Resend } = require('resend');
const stripeRoutes = require('./routes/stripe');
const { pool } = require('./db/index');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const crypto = require('crypto');
const auth = require('./lib/auth');
const { resolvePlan } = require('./lib/plans');
const usage = require('./lib/usage');
const { selectRelevant } = require('./lib/context');
const { PLAYBOOK: WEAVER_PLAYBOOK } = require('./lib/playbook');
const SCHEMA_SQL = require('./lib/schema-sql');
const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspace');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Render (and most hosts) sit behind a proxy: trust it so req.ip and https detection work.
app.set('trust proxy', 1);
app.disable('x-powered-by');

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// The user's plan (contact limit, AI budget) from their subscription and club memberships.
async function planForUser(user) {
    let orgs = [];
    try { orgs = await dbAPI.getOrgsForUser(user.id); } catch (e) { /* org tables optional */ }
    return resolvePlan(user, orgs);
}

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

// ---------- Security headers ----------
app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// ---------- Error responses never expose internals ----------
// Many older routes put error.message / stack / provider responses into 5xx JSON.
// Strip those fields centrally; the user-facing "error" text is kept (and length-capped).
app.use('/api', (req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 500 && body && typeof body === 'object' && !Array.isArray(body)) {
            const { message, details, stack, code, hint, fixUrl, instructions, ...rest } = body;
            if (typeof rest.error === 'string') rest.error = rest.error.slice(0, 300);
            return json(rest);
        }
        return json(body);
    };
    next();
});

// ---------- Public files ----------
// Only these files are served. (Previously the whole project folder was public, which
// exposed server code, config files and the Gmail token backup.)
const PUBLIC_FILES = new Set([
    'index.html', 'privacy.html', 'terms.html', 'cookies.html', 'success.html', 'cancel.html',
    'script.js', 'assistant.js', 'workspace-ui.js', 'api.js', 'styles.css', 'app-theme.css',
    'weaver-badge.png', 'hero-network.jpg', 'networking-event.jpg', 'student-laptop.jpg',
    'favicon.ico', 'favicon.png', 'apple-touch-icon.png',
]);
app.use('/assets', express.static(path.join(__dirname, 'assets'), { dotfiles: 'deny', index: false, maxAge: '7d' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/:file', (req, res, next) => {
    const file = req.params.file;
    if (!PUBLIC_FILES.has(file)) return next();
    const isPage = file.endsWith('.html');
    res.sendFile(path.join(__dirname, file), { headers: { 'Cache-Control': isPage ? 'no-cache' : 'public, max-age=300' } });
});

// ---------- Sessions ----------
// Every /api route requires a signed-in user except the few below.
const PUBLIC_API = new Set([
    'POST /api/auth/signup', 'POST /api/auth/login', 'POST /api/auth/logout',
    'POST /api/users/signup', 'POST /api/users/login',
    'GET /api/auth/me', 'GET /api/health', 'GET /api/stripe/pricing',
    'POST /api/stripe/webhook', 'GET /api/gmail/callback',
]);
app.use('/api', async (req, res, next) => {
    try {
        const token = auth.sessionToken(req);
        if (token && pool) {
            const userId = await auth.getSessionUserId(pool, token);
            if (userId) {
                const u = await dbAPI.getUserById(userId);
                if (u) { const { password, ...safe } = u; req.user = safe; }
            }
        }
    } catch (e) {
        console.error('Session lookup failed:', e.message);
    }
    const key = `${req.method} ${req.baseUrl}${req.path}`.replace(/\/$/, '');
    if (PUBLIC_API.has(key)) return next();
    if (!req.user) return res.status(401).json({ error: 'Please log in again.', code: 'auth_required' });
    next();
});

// Stripe routes (must be before express.json() to handle webhooks properly)
// The webhook endpoint uses express.raw() for body parsing
app.use('/api/stripe', stripeRoutes);

// JSON parsing middleware (after Stripe routes to avoid interfering with webhooks)
app.use(express.json({ limit: '5mb' }));

// A signed-in user can only act on their own account. Older client code still sends
// userId in the query/body; it must match the session, and is then normalized to it.
app.use('/api', (req, res, next) => {
    if (!req.user) return next();
    const claimed = [req.query && req.query.userId, req.body && typeof req.body === 'object' ? req.body.userId : undefined]
        .filter((v) => v !== undefined && v !== null && v !== '');
    if (claimed.some((v) => String(v) !== req.user.id)) {
        return res.status(403).json({ error: 'You can only access your own account.' });
    }
    if (req.query) req.query.userId = req.user.id;
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) req.body.userId = req.user.id;
    next();
});

// Accounts, plans and workspace features
app.use('/api', authRoutes({ pool, dbAPI }));
app.use('/api', workspaceRoutes({ pool, openai: null, dbAPI, getOpenAI: () => openai }));

// Initialize OpenAI (optional - only if API key is provided)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    } catch (error) {
        console.warn('⚠️  Failed to initialize OpenAI client:', error.message);
    }
} else {
    console.warn('⚠️  OPENAI_API_KEY not set. AI features (call notes processing) will not work.');
}

// Initialize Resend email service
let resend = null;
if (process.env.RESEND_API_KEY) {
    try {
        resend = new Resend(process.env.RESEND_API_KEY);
        console.log('✅ Resend email service initialized');
    } catch (error) {
        console.warn('⚠️  Failed to initialize Resend:', error.message);
    }
} else {
    console.warn('⚠️  RESEND_API_KEY not set. Email reminders will not work.');
    console.warn('   Get your API key at https://resend.com/api-keys');
}

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
        if (!openai) {
            return res.status(503).json({ error: 'OpenAI API key not configured. AI search features are unavailable.' });
        }
        
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
        
        const completion = await usage.meteredCompletion({
            pool, openai, user: req.user, plan: await planForUser(req.user), feature: 'search',
            model: usage.DEFAULT_MODEL, maxTokens: 500,
            params: {
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that summarizes and provides relevant information from web search results.' },
                    { role: 'user', content: String(prompt).slice(0, 8000) }
                ],
                temperature: 0.5
            }
        });
        
        const summary = completion.choices[0].message.content;
        
        res.json({
            query: query,
            searchResults: searchResults,
            summary: summary
        });
        
    } catch (error) {
        if (usage.sendUsageError(res, error)) return;
        console.error('API error:', error);
        res.status(500).json({ error: 'Search failed. Try again.' });
    }
});

// API endpoint for processing call notes images with OCR and AI summarization
app.post('/api/process-call-notes', upload.single('image'), async (req, res) => {
    try {
        console.log('Received call notes image upload request');
        
        // Check if OpenAI is available
        if (!openai) {
            console.error('OpenAI client not initialized');
            return res.status(503).json({ 
                success: false,
                error: 'OpenAI API key not configured. AI image processing is unavailable.' 
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
        
        if (!/^image\/(png|jpe?g|webp|gif|heic|heif)$/i.test(imageMimeType)) {
            try { fs.unlinkSync(imagePath); } catch (e) { /* ignore */ }
            return res.status(400).json({ success: false, error: 'Upload a photo (PNG, JPG, WEBP or HEIC).' });
        }
        const plan = await planForUser(req.user);

        // Step 1: transcribe the photo (vision model), metered against the user's plan.
        const visionResponse = await usage.meteredCompletion({
            pool, openai, user: req.user, plan, feature: 'notes_photo', model: usage.VISION_MODEL, maxTokens: 1500,
            params: {
                messages: [
                    { role: 'system', content: 'You are a text transcription tool. Your only job is to transcribe all visible text from images. Always provide the transcription, regardless of the content. Do not refuse, decline, or add commentary.' },
                    { role: 'user', content: [
                        { type: 'text', text: 'Transcribe all text visible in this image. Include every word, number, date, name, and piece of information exactly as it appears. Output only the raw transcription.' },
                        { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${base64Image}` } }
                    ] }
                ]
            }
        });

        let extractedText = visionResponse.choices[0].message.content || '';
        console.log('Text extracted from image, length:', extractedText.length);

        // Step 2: summarize with the small model.
        const summaryResponse = await usage.meteredCompletion({
            pool, openai, user: req.user, plan, feature: 'notes_summary', model: usage.DEFAULT_MODEL, maxTokens: 400,
            params: {
                messages: [
                    { role: 'system', content: 'Summarize networking call notes for a student: who they spoke with, what was discussed, advice given, and any next steps or promises. Plain sentences, no emoji, under 120 words.' },
                    { role: 'user', content: extractedText.slice(0, 12000) }
                ],
                temperature: 0.3
            }
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
        if (req.file && req.file.path) { try { fs.unlinkSync(req.file.path); } catch (e) { /* already removed */ } }
        if (usage.sendUsageError(res, error)) return;
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

// Helper: detect company/firm name from email domain (used by /api/detect-firm and Gmail sync).
// Metered against the user's AI allowance; results are cached per domain for everyone.
const firmByDomain = new Map();
async function detectFirmFromDomain(user, email, name) {
    if (!openai || !user) return null;
    if (!email || typeof email !== 'string') return null;
    const domain = email.split('@')[1];
    if (!domain) return null;
    const freeProviders = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
        'zoho.com', 'yandex.com', 'gmx.com', 'inbox.com'
    ];
    if (freeProviders.includes(domain.toLowerCase())) return null;
    const cacheKey = domain.toLowerCase();
    if (firmByDomain.has(cacheKey)) return firmByDomain.get(cacheKey);
    const prompt = `Given the email domain "${domain}"${name ? ` and the person's name "${name}"` : ''}, identify the company or organization name.

Rules:
1. Return ONLY the formal company name (e.g., "Goldman Sachs", "Morgan Stanley", "Bain Capital")
2. Use proper capitalization and spacing
3. Remove common suffixes like LLC, Inc, Corp, LP unless they're part of the brand (e.g., "J.P. Morgan" not "J.P. Morgan & Co.")
4. For investment firms, include the full name (e.g., "New Mountain Capital" not "New Mountain")
5. If the domain is clearly a company (e.g., "newmountaincapital.com" → "New Mountain Capital")
6. If uncertain or if it's a personal/unclear domain, respond with "UNKNOWN"

Email domain: ${domain}
${name ? `Person's name: ${name}` : ''}

Company name:`;
    try {
        const completion = await usage.meteredCompletion({
            pool, openai, user, plan: await planForUser(user), feature: 'detect_firm',
            model: usage.DEFAULT_MODEL, maxTokens: 30,
            params: {
                temperature: 0,
                messages: [
                    { role: 'system', content: 'You identify company names from email domains. Respond with just the company name or UNKNOWN.' },
                    { role: 'user', content: prompt }
                ],
            },
        });
        let firmName = (completion.choices[0].message.content || '').trim();
        firmName = firmName.replace(/^["']|["']$/g, '').replace(/\.$/, '').slice(0, 120);
        if (firmName.toUpperCase() === 'UNKNOWN' || firmName.toUpperCase() === 'N/A' || firmName.toUpperCase() === 'NONE' || firmName.length < 2) firmName = null;
        if (firmByDomain.size > 5000) firmByDomain.clear();
        firmByDomain.set(cacheKey, firmName);
        return firmName;
    } catch (err) {
        console.error('detectFirmFromDomain error:', err.message);
        return null;
    }
}

// API endpoint for detecting firm/company name from email address
app.post('/api/detect-firm', async (req, res) => {
    try {
        if (!openai) {
            return res.status(503).json({ error: 'OpenAI API key not configured.' });
        }
        const { email, name } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const domain = email.split('@')[1];
        if (!domain) {
            return res.json({ firm: null });
        }
        const freeProviders = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
            'zoho.com', 'yandex.com', 'gmx.com', 'inbox.com'
        ];
        if (freeProviders.includes(domain.toLowerCase())) {
            console.log('Free email provider detected, no firm');
            return res.json({ firm: null });
        }
        const firm = await detectFirmFromDomain(req.user, email, name);
        res.json({ firm: firm });
    } catch (error) {
        console.error('Firm detection error:', error);
        res.status(500).json({ error: 'Failed to detect firm', message: error.message });
    }
});

// Gmail OAuth Configuration
// Create a fresh OAuth2 client per user to avoid shared-state race conditions
function createOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback'
    );
}

// In-memory token cache (backed by database for persistence across restarts)
const userTokensCache = {};

// Pending Gmail connections: state -> { userId, expires }
const gmailStates = new Map();
setInterval(() => { const now = Date.now(); for (const [k, v] of gmailStates) if (v.expires < now) gmailStates.delete(k); }, 300000).unref();

// Gmail OAuth: Get authorization URL
app.get('/api/gmail/auth', (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const client = createOAuth2Client();
        const scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send'
        ];

        // Signed, single-use state: the callback can only attach Gmail to the account that
        // started the flow (previously the state was the raw user id, which anyone could forge).
        const state = crypto.randomBytes(24).toString('base64url');
        gmailStates.set(state, { userId: req.user.id, expires: Date.now() + 10 * 60000 });
        const authUrl = client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state,
            prompt: 'consent' // Force consent to always get a refresh token
        });

        res.json({ authUrl });
    } catch (error) {
        console.error('Gmail auth error:', error);
        res.status(500).json({ error: 'Failed to generate auth URL', message: error.message });
    }
});

// Gmail OAuth: Handle callback - store tokens in database for persistence
app.get('/api/gmail/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        const pending = state ? gmailStates.get(String(state)) : null;
        if (pending) gmailStates.delete(String(state));
        if (!code || !pending || pending.expires < Date.now()) {
            return res.status(400).send('<!doctype html><title>Weaver</title><p style="font-family:system-ui;padding:2rem">This Gmail connection link has expired. Close this window and connect again from Weaver.</p>');
        }
        const userId = pending.userId;

        const client = createOAuth2Client();
        const { tokens } = await client.getToken(code);

        console.log('Gmail OAuth callback - received tokens for user:', userId);
        console.log('  Has refresh_token:', !!tokens.refresh_token);
        console.log('  Has access_token:', !!tokens.access_token);
        console.log('  Expiry:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none');

        // Store tokens in database (persistent across deploys/restarts)
        try {
            await dbAPI.saveGmailToken(userId, {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                tokenType: tokens.token_type,
                scope: tokens.scope
            });
            console.log('Gmail tokens saved to database for user:', userId);
        } catch (dbErr) {
            console.error('Failed to save Gmail tokens to database:', dbErr);
            // Fallback: still cache in memory so the current session works
        }

        // Also cache in memory for fast access
        userTokensCache[userId] = tokens;

        res.send(`
            <html>
                <head>
                    <title>Gmail Connected</title>
                    <style>
                        body {
                            font-family: 'IBM Plex Sans', system-ui, sans-serif;
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
                        h1 { color: #16203A; font-size: 20px; font-weight: 600; }
                        p { color: #4a5568; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Gmail connected</h1>
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
                    <h1>Gmail could not be connected</h1>
                    <p>Close this window and try again from Weaver.</p>
                </body>
            </html>
        `);
    }
});

// Gmail: Get connection status - checks database for persistent tokens
app.get('/api/gmail/status', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check database first (persistent)
        try {
            const dbToken = await dbAPI.getGmailToken(userId);
            if (dbToken && (dbToken.refreshToken || dbToken.accessToken)) {
                return res.json({ connected: true });
            }
        } catch (dbErr) {
            console.log('DB check failed, falling back to cache/file:', dbErr.message);
        }

        // Fallback: check in-memory cache
        if (userTokensCache[userId]) {
            return res.json({ connected: true });
        }

        // Fallback: check file
        try {
            const tokensFile = path.join(__dirname, 'gmail_tokens.json');
            if (fs.existsSync(tokensFile)) {
                const allTokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
                if (allTokens[userId]) {
                    return res.json({ connected: true });
                }
            }
        } catch (fileErr) {
            // ignore file errors
        }

        res.json({ connected: false });
    } catch (error) {
        console.error('Gmail status error:', error);
        res.status(500).json({ error: 'Failed to check status', message: error.message });
    }
});

// Gmail: Disconnect - removes from all storage locations
app.post('/api/gmail/disconnect', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Remove from database
        try {
            await dbAPI.deleteGmailToken(userId);
            console.log('Gmail tokens deleted from database for user:', userId);
        } catch (dbErr) {
            console.error('Failed to delete Gmail tokens from database:', dbErr);
        }

        // Remove from memory cache
        delete userTokensCache[userId];

        // Remove from file backup
        try {
            const tokensFile = path.join(__dirname, 'gmail_tokens.json');
            if (fs.existsSync(tokensFile)) {
                const allTokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
                delete allTokens[userId];
                fs.writeFileSync(tokensFile, JSON.stringify(allTokens, null, 2));
            }
        } catch (fileErr) {
            // ignore file errors
        }

        res.json({ success: true, message: 'Gmail disconnected' });
    } catch (error) {
        console.error('Gmail disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect', message: error.message });
    }
});

// Helper: Load tokens from all storage layers (DB > cache > file)
async function loadUserTokens(userId) {
    // 1. Check in-memory cache first (fastest)
    if (userTokensCache[userId]) {
        return userTokensCache[userId];
    }

    // 2. Check database (persistent across restarts/deploys)
    try {
        const dbToken = await dbAPI.getGmailToken(userId);
        if (dbToken) {
            const tokens = {
                access_token: dbToken.accessToken,
                refresh_token: dbToken.refreshToken,
                expiry_date: dbToken.expiryDate ? new Date(dbToken.expiryDate).getTime() : null,
                token_type: dbToken.tokenType || 'Bearer',
                scope: dbToken.scope
            };
            userTokensCache[userId] = tokens; // Populate cache
            console.log('Gmail tokens loaded from database for user:', userId);
            return tokens;
        }
    } catch (dbErr) {
        console.log('DB token load failed, trying file fallback:', dbErr.message);
    }

    // 3. Fallback to file (legacy/backup)
    try {
        const tokensFile = path.join(__dirname, 'gmail_tokens.json');
        if (fs.existsSync(tokensFile)) {
            const allTokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
            if (allTokens[userId]) {
                userTokensCache[userId] = allTokens[userId];
                // Migrate file tokens to database for future persistence
                try {
                    const t = allTokens[userId];
                    await dbAPI.saveGmailToken(userId, {
                        accessToken: t.access_token,
                        refreshToken: t.refresh_token,
                        expiryDate: t.expiry_date ? new Date(t.expiry_date) : null,
                        tokenType: t.token_type,
                        scope: t.scope
                    });
                    console.log('Migrated file-based Gmail tokens to database for user:', userId);
                } catch (migrateErr) {
                    console.log('Token migration to DB failed (non-critical):', migrateErr.message);
                }
                return allTokens[userId];
            }
        }
    } catch (fileErr) {
        // ignore
    }

    return null;
}

// Helper: Save updated tokens to all storage layers
async function saveUserTokens(userId, tokens) {
    // Update memory cache
    userTokensCache[userId] = tokens;

    // Save to database
    try {
        await dbAPI.saveGmailToken(userId, {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            tokenType: tokens.token_type,
            scope: tokens.scope
        });
    } catch (dbErr) {
        console.error('Failed to save refreshed tokens to database:', dbErr);
    }

    // Save to file backup
    try {
        const tokensFile = path.join(__dirname, 'gmail_tokens.json');
        let allTokens = {};
        if (fs.existsSync(tokensFile)) {
            allTokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
        }
        allTokens[userId] = tokens;
        fs.writeFileSync(tokensFile, JSON.stringify(allTokens, null, 2));
    } catch (fileErr) {
        // non-critical
    }
}

// Helper function to get Gmail client for a user (per-user OAuth2 client)
async function getGmailClient(userId) {
    let tokens = await loadUserTokens(userId);

    if (!tokens) {
        throw new Error('Gmail not connected. Please connect your Gmail account first.');
    }

    // Create a fresh OAuth2 client for this user (avoids shared-state issues)
    const client = createOAuth2Client();
    client.setCredentials(tokens);

    // Check if access token is expired or about to expire (within 5 minutes)
    const bufferMs = 5 * 60 * 1000;
    const isExpired = tokens.expiry_date && (tokens.expiry_date <= Date.now() + bufferMs);

    if (isExpired && tokens.refresh_token) {
        try {
            console.log('Gmail access token expired for user:', userId, '- refreshing...');
            const { credentials } = await client.refreshAccessToken();

            // Preserve the refresh token (Google may not return it on refresh)
            if (!credentials.refresh_token && tokens.refresh_token) {
                credentials.refresh_token = tokens.refresh_token;
            }

            tokens = credentials;
            client.setCredentials(tokens);

            // Save refreshed tokens to all storage layers
            await saveUserTokens(userId, tokens);
            console.log('Gmail tokens refreshed and saved for user:', userId);
        } catch (refreshErr) {
            console.error('Gmail token refresh failed for user:', userId, refreshErr.message);
            // If refresh fails, try to use existing token anyway - it might still work
            // Don't delete the tokens; let the actual API call fail if needed
        }
    }

    // Set up automatic token refresh listener
    client.on('tokens', async (newTokens) => {
        console.log('Gmail auto-refresh triggered for user:', userId);
        // Preserve refresh token
        if (!newTokens.refresh_token && tokens.refresh_token) {
            newTokens.refresh_token = tokens.refresh_token;
        }
        await saveUserTokens(userId, newTokens);
    });

    return google.gmail({ version: 'v1', auth: client });
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

        // Detect firms for unique email addresses (internal helper, no HTTP)
        const uniqueEmails = [...new Set(emailData.map(e => e.email))];
        const firmDetections = {};
        if (openai) {
            console.log(`Detecting firms for ${uniqueEmails.length} unique email addresses...`);
            for (const email of uniqueEmails) {
                try {
                    const emailEntry = emailData.find(e => e.email === email);
                    const name = emailEntry ? emailEntry.name : null;
                    const firm = await detectFirmFromDomain(req.user, email, name);
                    if (firm) {
                        firmDetections[email] = firm;
                        console.log(`Detected firm for ${email}: ${firm}`);
                    }
                } catch (err) {
                    console.error(`Error detecting firm for ${email}:`, err.message);
                }
            }
        }
        emailData.forEach(entry => {
            if (firmDetections[entry.email]) entry.firm = firmDetections[entry.email];
        });

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

// Clean password: remove whitespace and invisible characters (fixes cross-browser login)
// ============ DATABASE API ROUTES ============
// Signup/login/logout live in routes/auth.js.

// Contacts
// Whitelisted, length-limited contact fields (column sizes match db/schema.js).
function contactFields(c, partial) {
    const str = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n));
    const out = {
        name: str(c.name, 255),
        email: str(c.email, 255),
        firm: str(c.firm, 255),
        company: str(c.company, 255),
        position: str(c.position, 255),
        phone: str(c.phone, 50),
        location: str(c.location, 255),
        priority: ['low', 'medium', 'high'].includes(c.priority) ? c.priority : null,
        vip: !!c.vip,
        firstEmailDate: str(c.firstEmailDate, 50),
        generalNotes: str(c.generalNotes, 20000),
    };
    if (partial) {
        Object.keys(out).forEach((k) => { if (!(k in c)) delete out[k]; });
        if ('name' in out && !out.name) delete out.name;
    }
    return out;
}

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
        const plan = await planForUser(req.user);
        const { rows: cnt } = await pool.query('SELECT COUNT(*)::int AS n FROM contacts WHERE user_id = $1', [req.user.id]);
        if (cnt[0].n >= plan.contactLimit) {
            return res.status(403).json({ error: `The ${plan.label} plan includes ${plan.contactLimit} contacts. Upgrade to add more.`, code: 'contact_limit' });
        }
        const contact = await dbAPI.createContact({ id: String(contactData.id).slice(0, 100), userId: req.user.id, ...contactFields(contactData, false) });
        res.json({ success: true, contact });
    } catch (error) {
        console.error('Create contact error:', error);
        res.status(500).json({ error: 'Failed to create contact' });
    }
});

app.put('/api/contacts/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        // Only editable fields; ids, owners and timestamps can't be changed from the client.
        const updates = contactFields(req.body, true);
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

// Sync contact list: MERGE only – add/update contacts, never delete contacts not in the payload.
// Contacts are permanent per user; they are only removed by explicit Delete Contact or Delete All.
app.post('/api/contacts/sync', async (req, res) => {
    try {
        const { userId, contacts } = req.body;
        if (!userId || !Array.isArray(contacts)) {
            return res.status(400).json({ error: 'userId and contacts array are required' });
        }
        const plan = await planForUser(req.user);
        // The limit counts what the user would have after this merge (sync never deletes),
        // so it can't be bypassed by syncing in small batches.
        const { rows: ownRows } = await pool.query('SELECT id FROM contacts WHERE user_id = $1', [req.user.id]);
        const own = new Set(ownRows.map((r) => String(r.id)));
        const incoming = new Set(contacts.filter((c) => c && c.id && c.name).map((c) => String(c.id)));
        const added = [...incoming].filter((id) => !own.has(id)).length;
        if (added > 0 && own.size + added > plan.contactLimit) {
            return res.status(403).json({ error: `The ${plan.label} plan includes ${plan.contactLimit} contacts. Upgrade to sync more.`, code: 'contact_limit' });
        }
        let skipped = 0;
        for (const c of contacts) {
            if (!c || !c.id || !c.name) continue;
            const id = String(c.id).slice(0, 100);
            const emails = Array.isArray(c.emails) ? c.emails.slice(0, 500) : [];
            const notes = Array.isArray(c.notes) ? c.notes.slice(0, 500) : [];
            const contactPayload = contactFields(c, false);
            if (own.has(id)) {
                await dbAPI.updateContact(id, userId, contactPayload);
                await dbAPI.deleteEmailsByContactId(id);
                await dbAPI.deleteNotesByContactId(id);
            } else {
                try {
                    await dbAPI.createContact({ id, userId, ...contactPayload });
                } catch (err) {
                    // An id already used by another account: skip it rather than fail the whole sync.
                    skipped++;
                    continue;
                }
            }
            c.id = id;
            for (const e of emails) {
                if (e && e.id != null && e.date && e.direction) {
                    try { await dbAPI.addEmail(c.id, { id: String(e.id).slice(0, 100), date: String(e.date).slice(0, 50), direction: e.direction === 'received' ? 'received' : 'sent', type: e.type ? String(e.type).slice(0, 20) : null, subject: e.subject ? String(e.subject).slice(0, 1000) : null }); } catch (err) { /* duplicate id */ }
                }
            }
            for (const n of notes) {
                if (n && n.id != null && n.date && n.summary != null) {
                    try { await dbAPI.addNote(c.id, { id: String(n.id).slice(0, 100), date: String(n.date).slice(0, 50), summary: String(n.summary).slice(0, 20000), extractedText: n.extractedText ? String(n.extractedText).slice(0, 40000) : null, imageUrl: null, isTextNote: !!n.isTextNote }); } catch (err) { /* duplicate id */ }
                }
            }
        }
        res.json({ success: true, skipped });
    } catch (error) {
        console.error('Sync contacts error:', error);
        res.status(500).json({ error: 'Failed to sync contacts' });
    }
});

// Emails
app.post('/api/contacts/:contactId/emails', async (req, res) => {
    try {
        const { contactId } = req.params;
        if (!(await dbAPI.getContactById(contactId, req.user.id))) return res.status(404).json({ error: 'Contact not found' });
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
        if (!(await dbAPI.getContactById(contactId, req.user.id))) return res.status(404).json({ error: 'Contact not found' });
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

// Manual database migration endpoint (for immediate fixes)
app.get('/api/migrate', async (req, res) => {
    if (!auth.isAdmin(req.user)) return res.status(404).json({ error: 'Not found' });
    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: 'Database not configured', details: 'DATABASE_URL not set' });
    }

    // Use the existing pool from db/index.js which is already configured correctly
    const { pool } = require('./db/index');
    
    if (!pool) {
        return res.status(500).json({ error: 'Database pool not initialized', details: 'Database connection failed' });
    }

    try {
        const client = await pool.connect();
        try {
            // Check if Stripe columns exist
            const checkColumns = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_plan', 'subscription_current_period_end')
            `);
            
            const existingColumns = checkColumns.rows.map(row => row.column_name);
            const neededColumns = ['stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_plan', 'subscription_current_period_end'];
            const missingColumns = neededColumns.filter(col => !existingColumns.includes(col));

            if (missingColumns.length === 0) {
                return res.json({ 
                    success: true, 
                    message: 'All Stripe columns already exist',
                    existingColumns: existingColumns
                });
            }

            console.log('🔄 Adding missing Stripe columns:', missingColumns);
            
            const columnsToAdd = [
                { name: 'stripe_customer_id', type: 'text' },
                { name: 'stripe_subscription_id', type: 'text' },
                { name: 'subscription_status', type: 'text DEFAULT \'free\'' },
                { name: 'subscription_plan', type: 'text' },
                { name: 'subscription_current_period_end', type: 'timestamp' }
            ];

            const addedColumns = [];
            for (const column of columnsToAdd) {
                if (missingColumns.includes(column.name)) {
                    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
                    addedColumns.push(column.name);
                    console.log(`  ✅ Added column: ${column.name}`);
                }
            }
            
            return res.json({ 
                success: true, 
                message: 'Migration completed successfully',
                addedColumns: addedColumns,
                existingColumns: existingColumns
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Migration error:', error);
        console.error('Full error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return res.status(500).json({ 
            error: 'Migration failed', 
            message: error.message,
            details: error.code || 'Unknown error',
            hint: error.message.includes('certificate') ? 'SSL certificate issue - ensure DATABASE_URL is correct' : ''
        });
    }
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

// Track last email sent time per user to avoid duplicates
const lastEmailSent = new Map();

// Schedule cron job - runs every 5 minutes (after routes are defined)
cron.schedule('*/5 * * * *', () => {
    processReminderEmails();
});

console.log('📅 Email reminder cron job scheduled (runs every 5 minutes)');

// ============ CLUB SEAT SYNC (per-active-member billing) ============
// Daily: set each paying club's seat quantity to its members active in the trailing
// 30 days. No proration — the renewal invoice simply bills the current active count,
// so clubs pay only for members who actually networked.
async function syncClubSeats() {
    if (!stripe || !process.env.DATABASE_URL) return;
    let orgs = [];
    try { orgs = await dbAPI.getOrgsWithActivePlans(); } catch (e) { console.warn('Seat sync: could not list orgs:', e.message); return; }
    const since = new Date(Date.now() - 30 * 86400000);
    for (const org of orgs) {
        if (!org.stripeSubscriptionId) continue;
        try {
            const { active } = await dbAPI.getOrgActiveMemberCount(org.id, since);
            const seats = Math.max(1, active);
            const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
            const item = sub.items?.data?.[0];
            if (item && item.quantity !== seats) {
                await stripe.subscriptionItems.update(item.id, { quantity: seats, proration_behavior: 'none' });
                console.log(`Seat sync: ${org.name} ${item.quantity} -> ${seats} active seats`);
            }
            await dbAPI.setOrgBilling(org.id, { lastBilledSeats: seats });
        } catch (e) {
            console.error(`Seat sync failed for org ${org.id}:`, e.message);
        }
    }
}
cron.schedule('15 3 * * *', () => { syncClubSeats(); });
// Also sync shortly after every start (idempotent) so a sleeping instance never skips a day entirely.
setTimeout(() => { syncClubSeats(); }, 2 * 60 * 1000);
console.log('📅 Club seat sync scheduled (daily 03:15 + 2 min after startup)');

// Check and migrate database schema on startup
async function checkAndMigrateDatabase() {
    if (!process.env.DATABASE_URL || !pool) {
        return;
    }

    try {
        const client = await pool.connect();
        try {
            // Check if Stripe columns exist
            const checkColumns = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_plan', 'subscription_current_period_end')
            `);
            
            const existingColumns = checkColumns.rows.map(row => row.column_name);
            const neededColumns = ['stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_plan', 'subscription_current_period_end'];
            const missingColumns = neededColumns.filter(col => !existingColumns.includes(col));

            if (missingColumns.length > 0) {
                console.log('🔄 Adding missing Stripe columns to users table...');
                
                const columnsToAdd = [
                    { name: 'stripe_customer_id', type: 'text' },
                    { name: 'stripe_subscription_id', type: 'text' },
                    { name: 'subscription_status', type: 'text DEFAULT \'free\'' },
                    { name: 'subscription_plan', type: 'text' },
                    { name: 'subscription_current_period_end', type: 'timestamp' }
                ];

                for (const column of columnsToAdd) {
                    if (missingColumns.includes(column.name)) {
                        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
                        console.log(`  ✅ Added column: ${column.name}`);
                    }
                }
                
                console.log('✅ Database migration completed!');
            } else {
                console.log('✅ Database schema is up to date');
            }

            // Everything added since the original schema (clubs, sessions, usage ledger,
            // outcomes, reviews, checklists, documents). Idempotent.
            for (const statement of SCHEMA_SQL) {
                await client.query(statement);
            }
            console.log('Database schema is up to date');
        } finally {
            client.release();
        }
    } catch (error) {
        console.warn('⚠️  Could not check/migrate database schema:', error.message);
        console.warn('   This is okay if migrations run during build. If you see Stripe errors, check migrations.');
    }
}

// Accounts created before passwords were hashed stored them in plaintext. Hash them
// once, in the background, a few at a time. (Logins also re-hash on success.)
async function hashLegacyPasswords() {
    if (!pool) return;
    const { rows } = await pool.query("SELECT id, password FROM users WHERE password NOT LIKE 'scrypt$%'");
    if (!rows.length) return;
    let done = 0;
    for (const row of rows) {
        const plain = authRoutes.cleanPassword(row.password || '');
        if (!plain) continue;
        const hash = await auth.hashPassword(plain);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2 AND password = $3', [hash, row.id, row.password]);
        done += 1;
    }
    console.log(`Hashed ${done} legacy password(s)`);
}

// Expired sessions are removed daily.
cron.schedule('40 3 * * *', () => {
    if (pool) pool.query('DELETE FROM sessions WHERE expires_at < now()').catch(() => {});
});

// Start server
app.listen(PORT, async () => {
    console.log(`Weaver server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️  WARNING: DATABASE_URL not set. Database features will not work.');
    } else {
        console.log('✅ Database connection configured');
        // Check and migrate database schema
        await checkAndMigrateDatabase();
        hashLegacyPasswords().catch((e) => console.error('Password hashing pass failed:', e.message));
    }
    
    // Check if OpenAI is initialized
    if (!openai) {
        console.warn('⚠️  WARNING: OpenAI client not initialized!');
        console.warn('   AI features (call notes processing, search) will not work.');
        console.warn('   Set OPENAI_API_KEY environment variable to enable AI features.');
    } else {
        console.log('✅ OpenAI client initialized');
    }
    
    // Check if Gmail credentials are set
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️  WARNING: Gmail API credentials not found in .env file!');
        console.warn('   Gmail integration will not work without valid credentials.');
        console.warn('   See GMAIL_SETUP.md for setup instructions.');
    } else {
        console.log('✅ Gmail API credentials loaded');
    }
    
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️  WARNING: RESEND_API_KEY not set!');
        console.warn('   Email reminders will not work without Resend API key.');
        console.warn('   Get your API key at https://resend.com/api-keys');
        console.warn('   See RESEND_SETUP.md for setup instructions.');
    } else {
        console.log('✅ Resend email service configured');
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Weaver <reminders@studentweaver.com>';
        console.log(`   Emails will be sent from: ${fromEmail}`);
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
    console.log(`  - GET  /api/health - Health check`);
    console.log(`  - POST /api/assistant/settings - Save assistant settings`);
    console.log(`  - GET  /api/assistant/settings/:userId - Get assistant settings`);
    console.log(`  - GET  /api/test/send-reminder/:userId - Test send reminder email (uses Resend)\n`);
});

// Duplicate cron job removed - already scheduled above

// Email template- DS

function generateEmailBody(contacts) {
    const sorted = contacts.slice().sort((a, b) => b.daysSinceLastContact - a.daysSinceLastContact);
    const weaverUrl = process.env.WEAVER_URL || 'https://studentweaver.com';
    const count = sorted.length;
    const rows = sorted.slice(0, 25).map((c, i) => {
        const border = i === Math.min(sorted.length, 25) - 1 ? '' : 'border-bottom:1px solid #E3E6EB;';
        const priority = c.priority === 'high' ? 'High' : c.priority === 'low' ? 'Low' : 'Medium';
        return `<tr>
            <td style="padding:12px 16px;${border}">
              <div style="font-weight:600;color:#16203A;font-size:14px;">${escapeHtml(c.name)}${c.vip ? ' <span style="font-weight:500;color:#1E6A55;font-size:12px;">VIP</span>' : ''}</div>
              ${c.firm ? `<div style="color:#5B6474;font-size:13px;margin-top:2px;">${escapeHtml(c.firm)}</div>` : ''}
            </td>
            <td align="right" style="padding:12px 16px;${border}color:#16203A;font-size:14px;white-space:nowrap;">${Number(c.daysSinceLastContact) || 0} days</td>
            <td align="right" style="padding:12px 16px;${border}color:#5B6474;font-size:13px;white-space:nowrap;">${priority}</td>
          </tr>`;
    }).join('');
    const more = count > 25 ? `<p style="margin:12px 0 0;color:#5B6474;font-size:13px;">And ${count - 25} more in Weaver.</p>` : '';
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Follow-ups due</title></head>
<body style="margin:0;padding:0;background:#F6F7F9;font-family:'IBM Plex Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#16203A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F7F9;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E6EB;border-radius:8px;">
        <tr><td style="padding:24px 24px 8px;">
          <div style="font-size:13px;color:#5B6474;">Weaver</div>
          <h1 style="margin:6px 0 4px;font-size:20px;font-weight:600;line-height:1.3;color:#16203A;">${count} ${count === 1 ? 'contact is' : 'contacts are'} due for a follow-up</h1>
          <p style="margin:0;color:#5B6474;font-size:14px;line-height:1.5;">Sorted by time since your last touch. Open Weaver to draft each follow-up in a click.</p>
        </td></tr>
        <tr><td style="padding:16px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E3E6EB;border-radius:6px;">
            <tr>
              <th align="left" style="padding:10px 16px;border-bottom:1px solid #E3E6EB;font-size:12px;font-weight:500;color:#5B6474;">Contact</th>
              <th align="right" style="padding:10px 16px;border-bottom:1px solid #E3E6EB;font-size:12px;font-weight:500;color:#5B6474;">Since last touch</th>
              <th align="right" style="padding:10px 16px;border-bottom:1px solid #E3E6EB;font-size:12px;font-weight:500;color:#5B6474;">Priority</th>
            </tr>
            ${rows}
          </table>
          ${more}
        </td></tr>
        <tr><td style="padding:24px;">
          <a href="${escapeHtml(weaverUrl)}/#strengthening-net" style="display:inline-block;background:#1E6A55;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:6px;">Open follow-ups</a>
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #E3E6EB;color:#5B6474;font-size:12px;line-height:1.5;">
          You get these reminders because they are turned on in Weaver. Change the time or turn them off in Settings.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendReminderEmail(userId, userEmail, contacts) {
    try {
        // Check if Resend is initialized
        if (!resend) {
            console.error('Resend not initialized. Please set RESEND_API_KEY environment variable.');
            return false;
        }
        
        // Validate email address
        if (!userEmail || !userEmail.includes('@')) {
            console.error(`Invalid email address: ${userEmail}`);
            return false;
        }
        
        // Generate email content
        const emailSubject = `${contacts.length} ${contacts.length === 1 ? 'contact is' : 'contacts are'} due for a follow-up`;
        const emailBody = generateEmailBody(contacts);
        
        // Get from email (should be verified domain in Resend)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Weaver <reminders@studentweaver.com>';
        const fromName = process.env.RESEND_FROM_NAME || 'Weaver';
        
        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [userEmail],
            subject: emailSubject,
            html: emailBody,
        });
        
        if (error) {
            console.error(`Error sending reminder email to ${userEmail}:`, error);
            return false;
        }
        
        console.log(`✅ Sent reminder email to ${userEmail} with ${contacts.length} contacts (Resend ID: ${data?.id})`);
        return true;
    } catch (error) {
        console.error(`Error sending reminder email to ${userEmail}:`, error);
        return false;
    }
}

// Check if email should be sent now based on user settings
function shouldSendEmailNow(settings, userId) {
    const now = new Date();
    const userTimezone = settings.emailTimezone || 'America/New_York';
    
    // Get current time in user's timezone using Intl.DateTimeFormat
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    });
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        weekday: 'short'
    });
    
    const timeParts = timeFormatter.formatToParts(now);
    const dateParts = dateFormatter.formatToParts(now);
    
    const currentHour = parseInt(timeParts.find(p => p.type === 'hour').value);
    const currentMinute = parseInt(timeParts.find(p => p.type === 'minute').value);
    const dayOfWeek = dateParts.find(p => p.type === 'weekday').value;
    const day = dateParts.find(p => p.type === 'day').value;
    const month = dateParts.find(p => p.type === 'month').value;
    const year = dateParts.find(p => p.type === 'year').value;
    
    // Create a date key for tracking (YYYY-MM-DD format)
    const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Check if we already sent an email today for this user
    const lastSentKey = `${userId}_${dateKey}`;
    if (lastEmailSent.has(lastSentKey)) {
        console.log(`[shouldSendEmailNow] Already sent email to user ${userId} today (${dateKey})`);
        return false; // Already sent today
    }
    
    const [hours, minutes] = settings.emailTime.split(':');
    const targetHour = parseInt(hours);
    const targetMinute = parseInt(minutes);
    
    if (settings.emailFrequency === 'weekly') {
        // Send once per week (Monday at specified time)
        // dayOfWeek will be 'Mon', 'Tue', etc.
        const isMonday = dayOfWeek === 'Mon' || dayOfWeek === 'Monday';
        const isTargetTime = currentHour === targetHour && 
                            currentMinute >= targetMinute && 
                            currentMinute < targetMinute + 5; // 5-minute window
        
        if (isMonday && isTargetTime) {
            console.log(`[shouldSendEmailNow] Weekly email time matched for user ${userId}: ${currentHour}:${currentMinute.toString().padStart(2, '0')} (target: ${targetHour}:${targetMinute.toString().padStart(2, '0')})`);
        }
        
        return isMonday && isTargetTime;
    } else {
        // Real-time: Send daily at specified time
        // Check if we're within the 5-minute window
        const isTargetTime = currentHour === targetHour && 
                            currentMinute >= targetMinute && 
                            currentMinute < targetMinute + 5;
        
        if (isTargetTime) {
            console.log(`[shouldSendEmailNow] Daily email time matched for user ${userId}: ${currentHour}:${currentMinute.toString().padStart(2, '0')} (target: ${targetHour}:${targetMinute.toString().padStart(2, '0')})`);
        } else {
            console.log(`[shouldSendEmailNow] Daily email time NOT matched for user ${userId}: ${currentHour}:${currentMinute.toString().padStart(2, '0')} (target: ${targetHour}:${targetMinute.toString().padStart(2, '0')})`);
        }
        
        return isTargetTime;
    }
}

// Process reminder emails for all users
async function processReminderEmails() {
    console.log('🔄 Processing reminder emails...');
    
    try {
        // Get all users with enabled assistant settings
        const users = await dbAPI.getAllUsersWithAssistantSettings();
        
        for (const user of users) {
            const settings = await dbAPI.getAssistantSettings(user.id);
            if (!settings || !settings.enabled) continue;
            
            // Check if it's time to send email based on frequency
            const shouldSend = shouldSendEmailNow(settings, user.id);
            if (!shouldSend) continue;
            
            // Get contacts needing follow-up (includes ALL overdue contacts)
            const contacts = await dbAPI.getContactsNeedingFollowup(user.id, settings);
            
            if (contacts.length > 0) {
                const sent = await sendReminderEmail(user.id, user.email, contacts);
                if (sent) {
                    // Mark that we sent an email today for this user
                    const now = new Date();
                    const userTimezone = settings.emailTimezone || 'America/New_York';
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: userTimezone,
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric'
                    });
                    const parts = formatter.formatToParts(now);
                    const day = parts.find(p => p.type === 'day').value;
                    const month = parts.find(p => p.type === 'month').value;
                    const year = parts.find(p => p.type === 'year').value;
                    const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    lastEmailSent.set(`${user.id}_${dateKey}`, true);
                    
                    // Clean up old entries (keep only last 7 days)
                    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    for (const [key, value] of lastEmailSent.entries()) {
                        // Extract date from key and check if it's older than 7 days
                        const keyDate = key.split('_')[1];
                        if (keyDate && new Date(keyDate) < sevenDaysAgo) {
                            lastEmailSent.delete(key);
                        }
                    }
                }
            }
        }
        
        console.log('✅ Finished processing reminder emails');
    } catch (error) {
        console.error('❌ Error processing reminder emails:', error);
    }
}

// ============ ASSISTANT SETTINGS API ENDPOINTS ============

// Save assistant settings
app.post('/api/assistant/settings', async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }
        
        const settings = {
            coldContactDays: req.body.coldContactDays || 12,
            establishedContactDays: req.body.establishedContactDays || 90,
            reminderColdContacts: req.body.reminderColdContacts !== undefined ? req.body.reminderColdContacts : true,
            reminderEstablishedContacts: req.body.reminderEstablishedContacts !== undefined ? req.body.reminderEstablishedContacts : true,
            vipOnly: req.body.vipOnly || false,
            emailFrequency: req.body.emailFrequency || 'realtime',
            emailTime: req.body.emailTime || '09:00',
            emailTimezone: req.body.emailTimezone || 'America/New_York',
            enabled: req.body.enabled !== undefined ? req.body.enabled : true
        };
        
        // Ensure userId is a string when saving settings
        const userIdString = String(userId);
        const saved = await dbAPI.saveAssistantSettings(userIdString, settings);
        
        if (saved) {
            res.json({ success: true, settings: saved });
        } else {
            console.error('Failed to save settings - saveAssistantSettings returned null');
            res.status(500).json({ error: 'Failed to save settings', message: 'Database operation failed. Please try again.' });
        }
    } catch (error) {
        console.error('Error saving assistant settings:', error);
        
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

// Get assistant settings
app.get('/api/assistant/settings/:userId', async (req, res) => {
    try {
        const userId = req.user.id;
        const settings = await dbAPI.getAssistantSettings(userId);
        
        if (settings) {
            res.json({ success: true, settings });
        } else {
            res.json({ success: true, settings: null });
        }
    } catch (error) {
        console.error('Error getting assistant settings:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============ USER PROFILE SETTINGS API ENDPOINTS ============

app.get('/api/users/settings/:userId', async (req, res) => {
    try {
        const userId = req.user.id;
        const settings = await dbAPI.getUserSettingsById(userId);
        res.json({ success: true, settings: settings || null });
    } catch (error) {
        console.error('Error getting user settings:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users/settings', async (req, res) => {
    try {
        const { userId, firstName, lastName, profilePhoto } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }
        // Photos must be a real image data URL under ~1.5 MB; names are length-limited.
        const photo = typeof profilePhoto === 'string' && profilePhoto.length <= 4000000 && /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+\/=]+$/.test(profilePhoto) ? profilePhoto : null;
        const saved = await dbAPI.saveUserSettingsToDb(userId, {
            firstName: firstName ? String(firstName).trim().slice(0, 100) : null,
            lastName: lastName ? String(lastName).trim().slice(0, 100) : null,
            profilePhoto: photo,
        });
        res.json({ success: true, settings: saved });
    } catch (error) {
        console.error('Error saving user settings:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

// ============ WEAVER AGENT (AI-native assistant) ============
// The client sends a compact snapshot of the user's network (it is the source of
// truth for contacts); the server adds club data, asks the model for a grounded
// reply + structured actions, validates them, and returns them for the client to
// apply (with undo). The server never writes contacts directly, so local and
// server state cannot diverge.

function clip(s, n) { s = (s == null ? '' : String(s)); return s.length > n ? s.slice(0, n) : s; }

// Whitelist + sanitize model-proposed actions before they reach the client.
function sanitizeAssistantActions(actions) {
    if (!Array.isArray(actions)) return [];
    const out = [];
    const kinds = ['call', 'coffee_chat', 'meeting', 'email_sent', 'email_received'];
    for (const a of actions.slice(0, 15)) {
        if (!a || typeof a !== 'object') continue;
        if (a.type === 'log_interaction' && a.contact_name) {
            out.push({
                type: 'log_interaction',
                contact_name: clip(a.contact_name, 120),
                firm: a.firm ? clip(a.firm, 120) : null,
                position: a.position ? clip(a.position, 120) : null,
                email: a.email ? clip(a.email, 200) : null,
                kind: kinds.includes(a.kind) ? a.kind : 'meeting',
                date: /^\d{4}-\d{2}-\d{2}$/.test(a.date || '') ? a.date : new Date().toISOString().slice(0, 10),
                summary: clip(a.summary, 1200),
            });
        } else if (a.type === 'update_contact' && a.contact_name && a.fields && typeof a.fields === 'object') {
            const f = {};
            if (['low', 'medium', 'high'].includes(a.fields.priority)) f.priority = a.fields.priority;
            if (typeof a.fields.vip === 'boolean') f.vip = a.fields.vip;
            ['firm', 'position', 'email'].forEach(k => { if (a.fields[k]) f[k] = clip(a.fields[k], 200); });
            if (Object.keys(f).length) out.push({ type: 'update_contact', contact_name: clip(a.contact_name, 120), fields: f });
        } else if (a.type === 'draft_email' && a.body) {
            out.push({
                type: 'draft_email',
                contact_name: clip(a.contact_name || '', 120),
                to_email: a.to_email ? clip(a.to_email, 200) : null,
                subject: clip(a.subject || '', 200),
                body: clip(a.body, 3000),
            });
        }
    }
    return out;
}

async function buildClubContext(userId) {
    try {
        const orgs = await dbAPI.getOrgsForUser(userId);
        if (!orgs.length) return null;
        const org = orgs[0];
        const roster = await dbAPI.getOrgRosterWithStats(org.id);
        const now = Date.now();
        return {
            club: org.name,
            your_role: org.role,
            member_count: roster.length,
            members: roster.slice(0, 200).map(m => ({
                name: m.name, rank: m.rank, calls: m.calls, outreach_sent: m.emailsSent,
                replies: m.emailsReceived, contacts: m.contactsCount, response_rate: m.responseRate + '%',
                activity_score: m.activityScore,
                days_since_active: m.lastActivityAt ? Math.floor((now - new Date(m.lastActivityAt)) / 86400000) : null,
            })),
        };
    } catch (e) {
        console.warn('Assistant club context unavailable:', e.message);
        return null;
    }
}

app.post('/api/assistant/chat', async (req, res) => {
    try {
        if (!openai) return res.status(503).json({ error: 'The assistant is not available right now.' });
        const { message, history, sources, network, profile } = req.body || {};
        const userId = req.user.id;
        if (!message || !String(message).trim()) return res.status(400).json({ error: 'Type a request first.' });
        const plan = await planForUser(req.user);

        const src = Array.isArray(sources) ? sources : ['network', 'followups'];
        const club = src.includes('club') ? await buildClubContext(userId) : null;
        let web = null;
        if (src.includes('web')) {
            try {
                const results = await Promise.race([searchWeb(clip(message, 300)), new Promise(r => setTimeout(() => r([]), 6000))]);
                web = (results || []).slice(0, 6).map(r => ({ title: clip(r.title, 200), url: r.url, snippet: clip(r.snippet, 400) }));
            } catch (e) { web = []; }
        }
        const today = new Date().toISOString().slice(0, 10);
        const name = clip(profile && profile.name, 80) || 'the user';

        const system = `You are the Weaver Agent, the AI assistant inside Weaver — a networking CRM for college students and student clubs recruiting into finance, consulting and tech.
Today is ${today}. You are helping ${name}${profile && profile.accountType === 'org' ? ', who runs a club on Weaver' : ''}.

Respond ONLY with a JSON object of the form {"reply": string, "actions": array}.
"reply" is GitHub-flavored markdown shown to the user. "actions" lists changes/drafts for the app to apply:
1. {"type":"log_interaction","contact_name":str,"firm":str|null,"position":str|null,"email":str|null,"kind":"call"|"coffee_chat"|"meeting"|"email_sent"|"email_received","date":"YYYY-MM-DD","summary":str}
   Use whenever the user describes a networking interaction that happened (one action per person). The summary captures what was discussed and any next steps in 1-3 sentences.
2. {"type":"update_contact","contact_name":str,"fields":{"priority":"low"|"medium"|"high","vip":bool,"firm":str,"position":str,"email":str}}
3. {"type":"draft_email","contact_name":str,"to_email":str|null,"subject":str,"body":str}
   Use for outreach, follow-ups and thank-you notes: concise (under 150 words), warm but professional student voice, reference specific details from the notes, one clear ask, signed with the user's first name.

Rules:
- Ground every statement in the provided data. Never invent contacts, meetings, numbers or employers. If data is missing, say so plainly.
- Follow-up plans: prioritize VIP/high-priority and the most overdue contacts, give a one-line reason for each, and include draft_email actions for the top ones (max 5).
- Keep replies short and scannable: one-line lead, then bullets or a compact table, then next steps. Do not repeat draft text in the reply — drafts render as cards. When you log something, confirm it in one line.
- If who/when is ambiguous, make a sensible assumption (e.g. today's date) and state it.
- "playbook", when present, is Weaver's recruiting guidance; apply it to advice and drafts. "web_results", when present, are web search results; cite them by title/URL and never treat them as the user's own data.
- Club data, when present, describes members' activity. For club questions, name top performers, flag stalling members (14+ days inactive or near-zero score) and suggest concrete actions for the club leader.
- Use an empty actions array when nothing should change.`;

        const context = {
            sources_enabled: src,
            network: src.includes('network') || src.includes('followups') ? selectRelevant(network, message, plan.key === 'starter' ? 15 : 40) : null,
            club,
            playbook: src.includes('playbook') ? WEAVER_PLAYBOOK : null,
            web_results: web,
        };

        const msgs = [{ role: 'system', content: system }];
        (Array.isArray(history) ? history : []).slice(-6).forEach(h => {
            if (h && (h.role === 'user' || h.role === 'assistant') && h.content) msgs.push({ role: h.role, content: clip(h.content, 2000) });
        });
        msgs.push({ role: 'user', content: `DATA:\n${JSON.stringify(context).slice(0, 40000)}\n\nREQUEST:\n${clip(message, 4000)}` });

        const completion = await usage.meteredCompletion({
            pool, openai, user: req.user, plan, feature: 'assistant', model: usage.DEFAULT_MODEL, maxTokens: 1400,
            params: { messages: msgs, temperature: 0.3, response_format: { type: 'json_object' } },
        });
        let parsed = {};
        try { parsed = JSON.parse(completion.choices[0].message.content || '{}'); } catch (e) { parsed = { reply: completion.choices[0].message.content || '' }; }
        res.json({
            success: true,
            reply: clip(parsed.reply || 'Done.', 20000),
            actions: sanitizeAssistantActions(parsed.actions),
        });
    } catch (error) {
        if (usage.sendUsageError(res, error)) return;
        console.error('Assistant error:', error.message);
        res.status(500).json({ error: 'The assistant hit an error. Try again.' });
    }
});

// "Improve prompt" — rewrite a rough request into a specific, well-scoped one.
app.post('/api/assistant/improve', async (req, res) => {
    try {
        if (!openai) return res.status(503).json({ error: 'Assistant not configured' });
        const { prompt } = req.body || {};
        if (!prompt || !String(prompt).trim()) return res.status(400).json({ error: 'prompt is required' });
        const completion = await usage.meteredCompletion({
            pool, openai, user: req.user, plan: await planForUser(req.user), feature: 'improve', model: usage.DEFAULT_MODEL, maxTokens: 160,
            params: {
                temperature: 0.4,
                messages: [
                    { role: 'system', content: 'Rewrite the user\'s request to the Weaver networking assistant so it is specific and actionable: who, what outcome, timeframe, format. Keep their intent and any names. Max 2 sentences. Return only the rewritten request.' },
                    { role: 'user', content: clip(prompt, 2000) },
                ],
            },
        });
        res.json({ success: true, improved: (completion.choices[0].message.content || '').trim() });
    } catch (error) {
        if (usage.sendUsageError(res, error)) return;
        console.error('Improve prompt error:', error.message);
        res.status(500).json({ error: 'Could not improve the prompt' });
    }
});

// ============ ACCOUNT TYPE / ONBOARDING ============

// Persist the onboarding choice: 'student' or 'org'
app.post('/api/users/account-type', async (req, res) => {
    try {
        const { userId, accountType } = req.body;
        if (!userId || !['student', 'org'].includes(accountType)) {
            return res.status(400).json({ error: "userId and accountType ('student' | 'org') are required" });
        }
        const user = await dbAPI.setUserAccountType(userId, accountType);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Error setting account type:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

// ============ CLUB / ORGANIZATION API ============
// Owners and admins are "managers". Members can see the roster and leaderboard;
// only managers see member emails, billing and invites.

function stripOrg(o) {
    const { stripeCustomerId, stripeSubscriptionId, billingEmail, ...rest } = o;
    return rest;
}

async function membershipFor(userId, orgId) {
    const orgs = await dbAPI.getOrgsForUser(userId);
    return orgs.find((o) => o.id === orgId) || null;
}

function isManagerRole(role) {
    return role === 'owner' || role === 'admin';
}

// Create a club or career-center workspace. The creator becomes the owner.
app.post('/api/orgs', async (req, res) => {
    try {
        const name = String((req.body && req.body.name) || '').trim().slice(0, 120);
        const school = String((req.body && req.body.school) || '').trim().slice(0, 120) || null;
        const orgType = req.body && req.body.orgType === 'career_center' ? 'career_center' : 'club';
        if (!name) return res.status(400).json({ error: 'Enter your club’s name.' });
        const owned = (await dbAPI.getOrgsForUser(req.user.id)).filter((o) => o.role === 'owner');
        if (owned.length >= 3) return res.status(400).json({ error: 'You can run up to 3 clubs. Contact us if you need more.' });
        const org = await dbAPI.createOrganization({
            id: 'org_' + crypto.randomBytes(9).toString('base64url'),
            name,
            ownerId: req.user.id,
            school,
        });
        if (orgType === 'career_center') await dbAPI.setOrgBilling(org.id, { orgType });
        await dbAPI.setUserAccountType(req.user.id, 'org');
        res.json({ success: true, org: stripOrg({ ...org, orgType, role: 'owner' }) });
    } catch (error) {
        console.error('Error creating organization:', error.message);
        res.status(500).json({ error: 'Could not create the club. Try again.' });
    }
});

// Orgs the current user belongs to (with their role in each)
app.get('/api/orgs/mine', async (req, res) => {
    try {
        const orgs = (await dbAPI.getOrgsForUser(req.user.id)).map(stripOrg);
        res.json({ success: true, orgs });
    } catch (error) {
        console.error('Error listing user orgs:', error.message);
        res.status(500).json({ error: 'Could not load your clubs.' });
    }
});

// Club billing status: plan + how many members count as active (billable) right now
app.get('/api/orgs/:orgId/billing', async (req, res) => {
    try {
        const me = await membershipFor(req.user.id, req.params.orgId);
        if (!me) return res.status(404).json({ error: 'Club not found.' });
        if (!isManagerRole(me.role)) return res.status(403).json({ error: 'Only club owners and admins can see billing.' });
        const since = new Date(Date.now() - 30 * 86400000);
        const { total, active, activeMembers } = await dbAPI.getOrgActiveMemberCount(me.id, since);
        res.json({
            success: true,
            planStatus: me.planStatus || 'none',
            license: me.license || 'none',
            licenseExpiresAt: me.licenseExpiresAt || null,
            verified: !!me.verified,
            totalMembers: total,
            activeMembers: active,
            billableSeats: Math.max(1, active),
            activeWindowDays: 30,
            active: activeMembers.map(m => ({ name: m.name, lastActivityAt: m.lastActivityAt })),
        });
    } catch (error) {
        console.error('Error getting org billing:', error.message);
        res.status(500).json({ error: 'Could not load billing.' });
    }
});

// Join an organization by its share code. Attempts are rate limited so codes can't be guessed.
app.post('/api/orgs/join', async (req, res) => {
    try {
        const joinCode = String((req.body && req.body.joinCode) || '').trim();
        const displayName = String((req.body && req.body.displayName) || '').trim().slice(0, 80) || null;
        if (!joinCode) return res.status(400).json({ error: 'Enter your club code.' });
        const limit = auth.hit('join:' + req.user.id, 10, 3600000);
        if (!limit.allowed) return res.status(429).json({ error: 'Too many attempts. Try again in an hour, or ask your club leader for the code.' });
        const org = await dbAPI.getOrganizationByJoinCode(joinCode);
        if (!org) return res.status(404).json({ error: 'No club found with that code. Check the code and try again.' });
        await dbAPI.addOrgMember({ orgId: org.id, userId: req.user.id, role: 'member', displayName });
        try { await pool.query("UPDATE org_invites SET status = 'accepted' WHERE org_id = $1 AND email = $2", [org.id, req.user.email]); } catch (e) { /* invites optional */ }
        res.json({ success: true, org: stripOrg(org) });
    } catch (error) {
        console.error('Error joining organization:', error.message);
        res.status(500).json({ error: 'Could not join the club. Try again.' });
    }
});

// Org details (members only)
app.get('/api/orgs/:orgId', async (req, res) => {
    try {
        const me = await membershipFor(req.user.id, req.params.orgId);
        if (!me) return res.status(404).json({ error: 'Club not found.' });
        res.json({ success: true, org: stripOrg(me) });
    } catch (error) {
        console.error('Error getting organization:', error.message);
        res.status(500).json({ error: 'Could not load the club.' });
    }
});

// Roster + leaderboard (members only). Emails are visible to managers only.
app.get('/api/orgs/:orgId/members', async (req, res) => {
    try {
        const me = await membershipFor(req.user.id, req.params.orgId);
        if (!me) return res.status(404).json({ error: 'Club not found.' });
        const roster = await dbAPI.getOrgRosterWithStats(me.id);
        const manager = isManagerRole(me.role);
        res.json({ success: true, members: roster.map((m) => (manager ? m : { ...m, email: undefined })) });
    } catch (error) {
        console.error('Error getting org roster:', error.message);
        res.status(500).json({ error: 'Could not load the roster.' });
    }
});

// Invite a member by email (managers only). Records the invite and emails it if Resend is configured.
app.post('/api/orgs/:orgId/invite', async (req, res) => {
    try {
        const me = await membershipFor(req.user.id, req.params.orgId);
        if (!me) return res.status(404).json({ error: 'Club not found.' });
        if (!isManagerRole(me.role)) return res.status(403).json({ error: 'Only club owners and admins can invite members.' });
        const email = String((req.body && req.body.email) || '').trim().toLowerCase();
        if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
        const limit = auth.hit('invite:' + me.id, 200, 86400000);
        if (!limit.allowed) return res.status(429).json({ error: 'Your club has sent 200 invites today. Try again tomorrow.' });

        const invite = await dbAPI.createOrgInvite({
            id: 'inv_' + crypto.randomBytes(9).toString('base64url'),
            orgId: me.id,
            email,
            invitedBy: req.user.id,
        });

        let emailed = false;
        if (resend) {
            try {
                const fromEmail = process.env.RESEND_FROM_EMAIL || 'Weaver <reminders@studentweaver.com>';
                const weaverUrl = process.env.WEAVER_URL || 'https://studentweaver.com';
                const orgName = escapeHtml(me.name);
                await resend.emails.send({
                    from: fromEmail,
                    to: email,
                    subject: `Join ${me.name} on Weaver`,
                    html: `<div style="font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#16203A;">
                        <p style="font-size:16px;margin:0 0 16px;">You’ve been invited to join <strong>${orgName}</strong> on Weaver, the recruiting workspace your club uses to track networking and share progress.</p>
                        <p style="font-size:15px;margin:0 0 8px;">Create an account, choose <strong>Student</strong>, and enter this club code:</p>
                        <p style="font-size:20px;font-weight:600;letter-spacing:2px;background:#F6F7F9;border:1px solid #E3E6EB;padding:12px 16px;border-radius:6px;text-align:center;margin:0 0 20px;">${escapeHtml(me.joinCode)}</p>
                        <p style="margin:0 0 24px;"><a href="${escapeHtml(weaverUrl)}" style="display:inline-block;background:#1E6A55;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Open Weaver</a></p>
                        <p style="font-size:12px;color:#5B6474;margin:0;">You received this because a leader of ${orgName} invited this address. If you weren’t expecting it, you can ignore this email.</p>
                    </div>`,
                });
                emailed = true;
            } catch (mailErr) {
                console.error('Invite email failed (invite still recorded):', mailErr.message);
            }
        }

        res.json({ success: true, invite: { email: invite.email, createdAt: invite.createdAt }, emailed, joinCode: me.joinCode });
    } catch (error) {
        console.error('Error inviting member:', error.message);
        res.status(500).json({ error: 'Could not send the invite. Try again.' });
    }
});

// Test endpoint to manually trigger reminder email
app.get('/api/test/send-reminder/:userId', async (req, res) => {
    try {
        if (!auth.isAdmin(req.user)) return res.status(404).json({ error: 'Not found' });
        const userId = req.user.id;
        const settings = await dbAPI.getAssistantSettings(userId);
        
        if (!settings) {
            return res.status(404).json({ error: 'Assistant settings not found for user' });
        }
        
        const user = await dbAPI.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const contacts = await dbAPI.getContactsNeedingFollowup(userId, settings);
        const sent = await sendReminderEmail(userId, user.email, contacts);
        
        res.json({ 
            success: sent, 
            contactsCount: contacts.length,
            message: sent ? `Email sent with ${contacts.length} contacts` : 'Failed to send email'
        });
    } catch (error) {
        console.error('Error in test send reminder:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

// Refresh user subscription status from Stripe (called after payment or on demand)
app.post('/api/users/refresh-subscription', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        const user = await dbAPI.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Refresh from the Stripe customer saved on this account only. (Matching by email
        // would let someone claim another person's subscription by signing up with their address.)
        if (stripe) {
            try {
                // Try by customer ID first
                if (user.stripeCustomerId) {
                    const subs = await stripe.subscriptions.list({ 
                        customer: user.stripeCustomerId, 
                        status: 'all', 
                        limit: 10 
                    });
                    const active = (subs.data || []).find(s => s.status === 'active' || s.status === 'trialing');
                    if (active) {
                        await dbAPI.updateUserSubscription(user.stripeCustomerId, active);
                        const updated = await dbAPI.getUserById(userId);
                        const { password: _, ...userWithoutPassword } = updated;
                        return res.json({ success: true, user: userWithoutPassword });
                    }
                }
                
            } catch (stripeError) {
                console.error('Error refreshing subscription from Stripe:', stripeError);
                // Continue to return current user data even if Stripe refresh fails
            }
        }
        
        // Return current user data (subscription may not be updated yet if webhook hasn't fired)
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Error refreshing subscription:', error);
        res.status(500).json({ error: 'Failed to refresh subscription', message: error.message });
    }
});

