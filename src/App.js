import React, { useState, useEffect } from 'react';
import './App.css';

// Import your existing config
import { getConfig } from './config.js';

function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentApp, setCurrentApp] = useState('instacart');
  const [config, setConfig] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [zipcodes, setZipcodes] = useState({});

  useEffect(() => {
    // Load config
    const appConfig = getConfig();
    setConfig(appConfig);
    console.log('Config loaded:', appConfig);
    
    // Load jobs
    loadJobs(appConfig, currentApp);
  }, [currentApp]);

  const loadJobs = async (appConfig, app) => {
    setLoading(true);
    console.log('Loading jobs for app:', app);
    
    if (!appConfig.supabaseUrl || !appConfig.supabaseKey) {
      console.log('No Supabase credentials found, returning empty');
      setJobs([]);
      setLoading(false);
      return;
    }

    const tableName = `${app}_jobs`;
    const url = `${appConfig.supabaseUrl}/rest/v1/${tableName}?select=*&order=posted_at.desc&limit=50`;
    
    console.log('Fetching from URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': appConfig.supabaseKey,
          'Authorization': `Bearer ${appConfig.supabaseKey}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const jobsData = await response.json();
      console.log('Raw jobs from Supabase:', jobsData.length);
      
      // Filter jobs with posted_at and sort by newest first
      const validJobs = jobsData
        .filter(job => job.posted_at)
        .sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at))
        .slice(0, 9);
      
      console.log('Valid jobs after filtering:', validJobs.length);
      setJobs(validJobs);
      
      // Fetch ZIP codes for each job
      fetchZipcodesForJobs(validJobs);
    } catch (error) {
      console.error('Supabase fetch error:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchZipcodesForJobs = async (jobs) => {
    const newZipcodes = {};
    
    for (const job of jobs) {
      const city = job.city;
      const state = job.state;
      
      if (city && state) {
        try {
          const response = await fetch(`https://api.zippopotam.us/us/${state}/${encodeURIComponent(city)}`);
          if (response.ok) {
            const data = await response.json();
            const zipcode = data.places[0]['post code'];
            newZipcodes[`${city}-${state}`] = zipcode;
          }
        } catch (error) {
          console.log(`Could not fetch zipcode for ${city}, ${state}:`, error);
        }
      }
    }
    
    setZipcodes(prev => ({ ...prev, ...newZipcodes }));
  };

  const handleAppChange = (app) => {
    setCurrentApp(app);
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getZipcode = (city, state) => {
    if (!city || !state) return '';
    const key = `${city}-${state}`;
    return zipcodes[key] || '';
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="App-header">
        <div className="header-content">
          <div className="logo-section">
            <h1>GigMaps</h1>
            <p>Find the best gig jobs near you</p>
          </div>
          <nav className="main-nav">
            <button className="menu-toggle" onClick={() => setShowMenu(!showMenu)}>
              ☰
            </button>
            <div className={`nav-menu ${showMenu ? 'show' : ''}`}>
              <a href="#jobs">Jobs</a>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
            </div>
          </nav>
        </div>
      </header>

      {/* App Tabs */}
      <nav className="app-tabs">
        <button 
          className={`app-tab ${currentApp === 'instacart' ? 'active' : ''}`}
          onClick={() => handleAppChange('instacart')}
        >
          🛒 Instacart
        </button>
        <button 
          className={`app-tab ${currentApp === 'doordash' ? 'active' : ''}`}
          onClick={() => handleAppChange('doordash')}
        >
          🚗 DoorDash
        </button>
        <button 
          className={`app-tab ${currentApp === 'caviar' ? 'active' : ''}`}
          onClick={() => handleAppChange('caviar')}
        >
          🍽️ Caviar
        </button>
        <button 
          className={`app-tab ${currentApp === 'spark_delivery' ? 'active' : ''}`}
          onClick={() => handleAppChange('spark_delivery')}
        >
          🛒 Spark Delivery
        </button>
      </nav>

      {/* Jobs Section */}
      <main className="jobs-section" id="jobs">
        <div className="section-header">
          <h2>{currentApp.charAt(0).toUpperCase() + currentApp.slice(1)} Jobs</h2>
          <p>Found {jobs.length} jobs in your area</p>
        </div>
        
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading jobs...</p>
          </div>
        ) : jobs.length > 0 ? (
          <div className="jobs-grid">
            {jobs.map((job, index) => {
              const zipcode = getZipcode(job.city, job.state);
              return (
                <div key={index} className="job-card">
                  <h3 className="job-title">{job.title || job.job_name || 'Delivery Driver'}</h3>
                  <p className="job-location">
                    {job.city || 'City'}, {job.state || 'State'}
                  </p>
                  <p className="job-zipcode">
                    Zipcode: {zipcode ? zipcode : 'Loading...'}
                  </p>
                  <p className="job-time">
                    {formatTimeAgo(job.posted_at)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No jobs found</h3>
            <p>No {currentApp} jobs found in your area. Try adjusting your location or check back later.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="App-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>GigMaps</h4>
            <p>Find the best gig jobs near you</p>
          </div>
          <div className="footer-section">
            <h4>Platforms</h4>
            <ul>
              <li><a href="#instacart">Instacart</a></li>
              <li><a href="#doordash">DoorDash</a></li>
              <li><a href="#caviar">Caviar</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-links">
              <a href="#twitter">Twitter</a>
              <a href="#linkedin">LinkedIn</a>
              <a href="#github">GitHub</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 GigMaps. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App; 