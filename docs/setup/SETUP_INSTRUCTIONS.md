# Setup Instructions for Weaver

## Step 1: Install Node.js

You need to install Node.js to run the server. Choose one of these methods:

### Option A: Download from Node.js Website (Easiest)

1. Go to https://nodejs.org/
2. Download the LTS (Long Term Support) version for macOS
3. Run the installer and follow the instructions
4. Restart your terminal after installation

### Option B: Install via Homebrew (If you have it)

If you have Homebrew installed, run:
```bash
brew install node
```

### Verify Installation

After installing, verify it worked by running:
```bash
node --version
npm --version
```

You should see version numbers for both.

## Step 2: Install Project Dependencies

Once Node.js is installed, run:
```bash
cd /Users/connorcarey/Desktop/Weaver
npm install
```

This will install all required packages (express, openai, multer, etc.)

## Step 3: Start the Server

```bash
npm start
```

You should see:
```
Weaver server running on http://localhost:3000
✅ OpenAI API key loaded
```

**Keep this terminal window open** - the server needs to keep running.

## Step 4: Access the Website

Open your browser and go to:
- **http://localhost:3000** (if server is running)
- OR **http://localhost:8000** (if using Python's simple server)

## Troubleshooting

### If you see "npm: command not found"
- Node.js is not installed. Follow Step 1 above.

### If you see "Cannot connect to server" when uploading images
- Make sure the server is running (Step 3)
- Check that you see "Weaver server running" in the terminal

### If you see API key errors
- Make sure your `.env` file exists in the Weaver folder
- Check that it contains: `OPENAI_API_KEY=your_key_here`

## Quick Start Commands

```bash
# Navigate to project
cd /Users/connorcarey/Desktop/Weaver

# Install dependencies (first time only)
npm install

# Start the server
npm start
```

