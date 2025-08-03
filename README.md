# gigMaps Frontend

A modern, minimal frontend for displaying Instacart job listings from your Supabase database.

## 🚀 Features

- **Modern Design**: Clean, minimal UI with gradient backgrounds and glassmorphism effects
- **Responsive**: Works perfectly on desktop, tablet, and mobile
- **Real-time Data**: Fetches latest 5 job postings from Supabase
- **Interactive**: Refresh button, loading states, and error handling
- **Beautiful Cards**: Each job displayed in an attractive card format

## 📁 Files

- `index.html` - Main HTML structure
- `styles.css` - Modern CSS with animations and responsive design
- `script.js` - JavaScript for data fetching and interactivity
- `README.md` - This file

## 🛠️ Setup

### ✅ Pre-configured

This app is already configured with Supabase credentials and ready to use!

### 1. Test the App

1. Open `frontend/index.html` in your browser
2. The app will automatically connect to your Supabase database
3. Click **Refresh Jobs** to load the latest data

### 2. Customize (Optional)

If you want to change the configuration:
1. Click the **⚙️ gear icon** in the top right
2. Modify the settings as needed
3. Click **Save Configuration**

### 3. Find Your Supabase Credentials (if needed)

1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy your "Project URL" and "anon public" key

### 3. Enable Row Level Security (RLS)

Make sure your `gigtable` allows public read access:

```sql
-- Allow public read access to gigtable
CREATE POLICY "Allow public read access" ON gigtable
FOR SELECT USING (true);
```

### 4. Test the Frontend

1. Open `index.html` in your browser
2. The app will show mock data initially
3. Update the Supabase credentials in `script.js`
4. Refresh to see real data from your database

## 🎨 Customization

### Colors
The app uses a purple gradient theme. You can customize colors in `styles.css`:

```css
/* Main gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Accent colors */
color: #667eea; /* Primary blue */
color: #764ba2; /* Secondary purple */
```

### Layout
- Grid layout automatically adjusts based on screen size
- Cards are minimum 350px wide on desktop
- Single column on mobile devices

### Data Display
Each job card shows:
- Job title
- Company name
- Location with map icon
- Time posted with clock icon
- Apply and Details buttons

## 🔧 Development

### Adding More Features

1. **Pagination**: Modify the Supabase query to include offset/limit
2. **Filtering**: Add location or date filters
3. **Search**: Implement job title search functionality
4. **Details Modal**: Replace the alert with a proper modal
5. **Real-time Updates**: Use Supabase real-time subscriptions

### Performance Tips

- The app loads only 5 recent jobs for fast performance
- Images and fonts are loaded from CDNs
- CSS uses efficient selectors and minimal repaints
- JavaScript is optimized for modern browsers

## 📱 Mobile Responsive

The frontend is fully responsive:
- **Desktop**: Multi-column grid layout
- **Tablet**: Adjusted spacing and font sizes
- **Mobile**: Single column, optimized touch targets

## 🚀 Deployment

You can deploy this frontend to:
- **GitHub Pages**: Free static hosting
- **Netlify**: Drag and drop deployment
- **Vercel**: Fast deployment with Git integration
- **Firebase Hosting**: Google's hosting solution

### Quick Deploy to Netlify

1. Upload the `frontend` folder to Netlify
2. Your site will be live instantly
3. Update Supabase credentials in the deployed files

## 🔗 Integration

This frontend works with your existing:
- **Backend**: Google Cloud Run scraper
- **Database**: Supabase PostgreSQL
- **API**: REST endpoints for job data

## 📊 Data Structure

The frontend expects job data in this format:

```javascript
{
  id: 'uuid',
  title: 'Job Title',
  job_name: 'Company Name',
  location: 'City, State',
  city: 'City',
  state: 'State',
  posted_at: '2024-01-01T00:00:00Z',
  source_url: 'https://google.com/jobs/...'
}
```

## 🎯 Next Steps

1. **Connect to Real Data**: Update Supabase credentials
2. **Deploy**: Host the frontend online
3. **Customize**: Adjust colors, layout, or add features
4. **Monitor**: Check browser console for any errors
5. **Optimize**: Add caching, loading states, or animations

---

**Built with**: HTML5, CSS3, Vanilla JavaScript  
**Design**: Modern minimal with glassmorphism effects  
**Compatibility**: All modern browsers 