# Deployment Troubleshooting Guide

## Common Deployment Issues

### Issue: "Exited with status 1"

This usually means the server crashed on startup. Common causes:

1. **Missing Environment Variables**
   - Make sure ALL environment variables are set in Render dashboard
   - Check that `DATABASE_URL` uses the **Internal Database URL** (not external)

2. **Database Connection Issues**
   - Internal Database URL format: `postgresql://user:pass@host/database?sslmode=require`
   - Make sure `?sslmode=require` is at the end
   - Verify database is running in Render dashboard

3. **Port Configuration**
   - Must set `PORT=10000` in environment variables
   - Server uses `process.env.PORT || 3000`

4. **Missing Dependencies**
   - Check build logs for npm install errors
   - All dependencies should be in `package.json`

5. **File System Issues**
   - Render has read-only filesystem in some areas
   - Uploads directory is created automatically

## How to Check Deployment Logs

1. Go to your Render dashboard
2. Click on your web service
3. Click "Logs" tab
4. Look for error messages

## Common Error Messages

### "Cannot find module"
- **Fix**: Check that all dependencies are in `package.json`
- Run `npm install` locally to verify

### "Database connection failed"
- **Fix**: Verify `DATABASE_URL` is set correctly
- Use Internal Database URL (from database dashboard)
- Add `?sslmode=require` at the end

### "Port already in use"
- **Fix**: Set `PORT=10000` in environment variables
- Render automatically assigns ports, but you must use `process.env.PORT`

### "EADDRINUSE"
- **Fix**: Same as above - set `PORT=10000`

### "DATABASE_URL not set"
- **Fix**: Add `DATABASE_URL` environment variable in Render
- Use Internal Database URL format

## Environment Variables Checklist

Make sure these are ALL set in Render:

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] `DATABASE_URL` = `postgresql://user:pass@host/db?sslmode=require` (Internal URL)
- [ ] `GOOGLE_CLIENT_ID` = Your Google Client ID
- [ ] `GOOGLE_CLIENT_SECRET` = Your Google Client Secret
- [ ] `GOOGLE_REDIRECT_URI` = `https://your-app.onrender.com/api/gmail/callback`
- [ ] `OPENAI_API_KEY` = Your OpenAI API Key

## Testing Locally Before Deploying

1. Set all environment variables in `.env`
2. Run `npm install`
3. Run `npm start`
4. Test that server starts without errors
5. Test database connection

## Still Having Issues?

1. Check Render logs for specific error message
2. Verify all environment variables are set
3. Make sure database is running
4. Check that code was pushed to GitHub successfully
5. Try redeploying (Render will auto-redeploy on new commits)

