# Step-by-Step: Adding Environment Variables in Render

## Visual Guide to Adding GOOGLE_REDIRECT_URI

### Step 1: Navigate to Environment Variables

1. Go to **https://render.com** and log in
2. Click on your **Weaver web service** (the one you deployed)
3. Look for **"Environment"** in the left sidebar menu
4. Click on **"Environment"**

### Step 2: Find the Add Button

You'll see a list of your current environment variables. Look for:
- A button that says **"+ Add Environment Variable"** or **"Add Environment Variable"**
- It's usually at the **top** of the list or **bottom** of the page

### Step 3: Add GOOGLE_REDIRECT_URI

1. **Click the "+ Add Environment Variable" button**

2. **A form will appear with two fields:**
   - **Key** (or **Name**)
   - **Value**

3. **Fill in the form:**
   - **Key**: Type exactly: `GOOGLE_REDIRECT_URI`
     - All caps
     - Use underscores (not dashes)
     - No spaces
   
   - **Value**: Type your production callback URL
     - Format: `https://your-render-service-url.onrender.com/api/gmail/callback`
     - **To find your service URL:**
       - Look at the top of your Render service page
       - It shows something like: `https://weaver-abc123.onrender.com`
       - Use that exact URL, then add `/api/gmail/callback` at the end
     - **Example**: If your service URL is `https://weaver-abc123.onrender.com`, then enter:
       ```
       https://weaver-abc123.onrender.com/api/gmail/callback
       ```

4. **Click "Save Changes"** or **"Add"**

### Step 4: Verify It Was Added

After saving, you should see `GOOGLE_REDIRECT_URI` in your environment variables list with the value you entered.

### Step 5: Wait for Redeploy

Render will automatically redeploy your service (you'll see a notification). This takes 2-5 minutes.

## Complete List of Required Environment Variables

Make sure ALL of these are set in Render:

| Variable Name | Example Value | Where to Get It |
|--------------|---------------|-----------------|
| `NODE_ENV` | `production` | Set this manually |
| `PORT` | `10000` | Set this manually |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | From your Render database dashboard (Internal URL) |
| `GOOGLE_CLIENT_ID` | `203620464756-xxxxx.apps.googleusercontent.com` | From Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | From Google Cloud Console → Credentials |
| `GOOGLE_REDIRECT_URI` | `https://weaver-abc123.onrender.com/api/gmail/callback` | Your Render URL + `/api/gmail/callback` |
| `OPENAI_API_KEY` | `sk-proj-xxxxx` | From OpenAI dashboard |

## Troubleshooting

### "I don't see the Add button"
- Make sure you're on the **Environment** tab (not Settings, Events, or Logs)
- Scroll down - the button might be at the bottom
- Try refreshing the page

### "I can't edit environment variables"
- Make sure you're the owner/admin of the Render service
- Check that the service isn't currently deploying (wait for it to finish)

### "The variable isn't saving"
- Make sure there are no extra spaces before/after the key or value
- Make sure the key is exactly `GOOGLE_REDIRECT_URI` (all caps, underscores)
- Make sure the value starts with `https://` (not `http://`)

### "How do I find my Render service URL?"
- Look at the top of your service page in Render
- It's displayed prominently, usually with a "Visit Site" button
- Or check the Settings tab → Service URL

## Quick Checklist

- [ ] Found the Environment tab in Render
- [ ] Clicked "+ Add Environment Variable"
- [ ] Added `GOOGLE_REDIRECT_URI` as the key
- [ ] Added `https://my-render-url.onrender.com/api/gmail/callback` as the value
- [ ] Saved the changes
- [ ] Verified it appears in the list
- [ ] Waited for Render to redeploy

