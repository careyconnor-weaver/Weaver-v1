# Weaver - Networking Services for Students

## Setup Instructions

### 1. Install Node.js (Required First Step)

**If you don't have Node.js installed:**

- **Option A (Recommended)**: Download from https://nodejs.org/
  - Download the LTS version for macOS
  - Run the installer
  - Restart your terminal

- **Option B**: Install via Homebrew (if you have it):
  ```bash
  brew install node
  ```

**Verify installation:**
```bash
node --version
npm --version
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory with the following format:

```
OPENAI_API_KEY=your_openai_api_key_here
```

**Example `.env` file format:**

```
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

### 4. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will run on `http://localhost:3000`

### 5. Access the Application

Open your browser and navigate to:
- Frontend: `http://localhost:3000`
- API Health Check: `http://localhost:3000/api/health`

## Features

- Upload networking spreadsheets
- Manage contacts and track interactions
- Visual network map
- Web search integration with OpenAI
- **AI-Powered Call Notes**: Upload photos of call notes - the system will:
  - Extract all text from images using OpenAI Vision API (OCR)
  - Automatically summarize the notes using AI
  - Store both the full extracted text and summary
- Automated follow-up recommendations

## API Endpoints

- `POST /api/search` - Search the web with OpenAI processing
- `GET /api/health` - Health check endpoint

## Notes

- The `.env` file is gitignored for security
- Make sure your OpenAI API key has sufficient credits
- The web search uses DuckDuckGo as a free search provider

