# Gmail API Setup Instructions

This guide will walk you through setting up Gmail API integration for Weaver.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Weaver Gmail Integration")
5. Click "Create"

## Step 2: Enable Gmail API

1. In your Google Cloud project, go to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" (unless you have a Google Workspace)
   - Fill in the required fields:
     - App name: "Weaver"
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - On "Scopes" page, click "Save and Continue"
   - On "Test users" page, add your Gmail address as a test user
   - Click "Save and Continue" then "Back to Dashboard"

4. Now create the OAuth client:
   - Application type: "Web application"
   - Name: "Weaver Gmail Integration"
   - Authorized redirect URIs: 
     - For local development: `http://localhost:3000/api/gmail/callback`
     - For production: Add your production URL (e.g., `https://yourdomain.com/api/gmail/callback`)
   - Click "Create"

5. **Important**: Copy your Client ID and Client Secret - you'll need these!

## Step 4: Add Credentials to .env File

1. Open your `.env` file in the Weaver project
2. Add the following lines:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

3. Replace `your_client_id_here` and `your_client_secret_here` with the values from Step 3

## Step 5: Install Dependencies

Run the following command to install the Google APIs package:

```bash
npm install
```

This will install the `googleapis` package that was added to `package.json`.

## Step 6: Start the Server

Make sure your Node.js server is running:

```bash
npm start
```

## Step 7: Connect Gmail in Weaver

1. Open Weaver in your browser
2. Log in to your account
3. Click the profile icon in the top right
4. Click "Connect Gmail"
5. A popup window will open asking you to sign in with Google
6. Select your Gmail account and grant permissions
7. The window will close automatically when connected

## How It Works

Once connected, Weaver can:
- Read your sent emails to automatically detect contacts
- Monitor a specific Gmail label/folder (future feature)
- Sync contacts periodically

## Security Notes

- Your Gmail tokens are stored locally in `gmail_tokens.json` (not committed to git)
- Tokens are encrypted by Google and only accessible by your server
- You can disconnect Gmail at any time from the profile menu
- In production, consider using a database instead of JSON files for token storage

## Troubleshooting

**"Failed to get Gmail authorization URL"**
- Make sure the server is running (`npm start`)
- Check that your `.env` file has the correct credentials

**"Error connecting to Gmail"**
- Verify your Client ID and Client Secret in `.env`
- Make sure the redirect URI matches exactly: `http://localhost:3000/api/gmail/callback`
- Check that Gmail API is enabled in Google Cloud Console

**"Gmail not connected" after authorization**
- Check the browser console for errors
- Verify the callback URL is correct in Google Cloud Console
- Make sure you added your email as a test user (if using External app type)

## Next Steps

After connecting Gmail, you can:
- Manually sync contacts from sent emails (future feature)
- Set up automatic syncing (future feature)
- Monitor specific Gmail labels/folders (future feature)

