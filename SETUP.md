# Frontend Setup Guide

## Quick Setup

### 1. Update Credentials

Open `frontend/config.js` and replace the credentials with your own:

```javascript
const defaultConfig = {
    supabaseUrl: 'https://your-project.supabase.co',        // ← Your Supabase URL
    supabaseKey: 'your_anon_public_key_here',              // ← Your anon key
    jobsLimit: 9,
    debug: false
};
```

### 2. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy your **Project URL** and **anon public** key

### 3. Security Notes

- ✅ The `SUPABASE_ANON_KEY` is safe to use in frontend (it's public)
- ✅ Keep your service role key secret (backend only)
- ⚠️ For production, consider using environment variables on your hosting platform

### 4. Alternative: Environment Variables

For production deployments, you can set environment variables on your hosting platform:

**Netlify/Vercel:**
- Go to your project settings
- Add environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

**GitHub Pages:**
- Use meta tags in HTML:
```html
<meta name="SUPABASE_URL" content="https://your-project.supabase.co">
<meta name="SUPABASE_ANON_KEY" content="your_key_here">
```

### 5. Testing

After setup, the app should:
- Load without console errors
- Display jobs from your Supabase database
- Show only enabled platforms (Instacart, DoorDash, Caviar)

## Troubleshooting

**No jobs showing?**
- Check browser console (F12) for errors
- Verify your Supabase credentials are correct
- Ensure your database has job data
- Check that the scraper has run recently 