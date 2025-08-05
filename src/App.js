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
  
  // Pro Data Unlock state
  const [isPro, setIsPro] = useState(false);
  const [proExpiresAt, setProExpiresAt] = useState(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  useEffect(() => {
    // Load config
    const appConfig = getConfig();
    setConfig(appConfig);
    console.log('Config loaded:', appConfig);
    
    // Load pro status from localStorage
    loadProStatus();
    
    // Load jobs
    loadJobs(appConfig, currentApp);
  }, [currentApp]);

  // Load pro status from localStorage
  const loadProStatus = () => {
    try {
      const savedProData = localStorage.getItem('gigmaps-pro-status');
      if (savedProData) {
        const proData = JSON.parse(savedProData);
        const now = new Date();
        const expiresAt = new Date(proData.expiresAt);
        
        if (expiresAt > now) {
          setIsPro(true);
          setProExpiresAt(expiresAt);
        } else {
          // Pro access expired, clean up
          localStorage.removeItem('gigmaps-pro-status');
          setIsPro(false);
          setProExpiresAt(null);
        }
      }
    } catch (error) {
      console.warn('Error loading pro status:', error);
    }
  };

  // Check if a job is recent (< 10 hours old)
  const isJobRecent = (postedAt) => {
    const now = new Date();
    const jobDate = new Date(postedAt);
    const diffInHours = (now - jobDate) / (1000 * 60 * 60);
    return diffInHours < 10;
  };

  // Check if location data should be blurred
  const shouldBlurLocation = (job, index) => {
    // Only blur the first 4 jobs (which are the pro-gated recent jobs)
    // and only if user is not pro and job is recent
    return !isPro && index < 4 && isJobRecent(job.posted_at);
  };



  // Handle pro upgrade (mocked payment for now)
  const handleProUpgrade = async () => {
    try {
      // Mock payment process - in real implementation, integrate with Stripe/LemonSqueezy
      console.log('Processing payment...');
      
      // Simulate payment success after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set pro access for 3 days
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days
      
      const proData = {
        purchasedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        plan: 'pro-3-day'
      };
      
      localStorage.setItem('gigmaps-pro-status', JSON.stringify(proData));
      
      setIsPro(true);
      setProExpiresAt(expiresAt);
      setShowUnlockModal(false);
      
      console.log('Pro access activated until:', expiresAt);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    }
  };

  // Handle show unlock button click
  const handleShowUnlock = () => {
    setShowUnlockModal(true);
  };

  // Format time remaining for pro access
  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expired';
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

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
    const url = `${appConfig.supabaseUrl}/rest/v1/${tableName}?select=*&order=posted_at.desc&limit=100`;
    
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
      const allValidJobs = jobsData
        .filter(job => job.posted_at)
        .sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
      
      // Separate recent jobs (< 10 hours) and older jobs (>= 10 hours)
      const now = new Date();
      const recentJobs = [];
      const olderJobs = [];
      
      allValidJobs.forEach(job => {
        const jobDate = new Date(job.posted_at);
        const diffInHours = (now - jobDate) / (1000 * 60 * 60);
        
        if (diffInHours < 10) {
          recentJobs.push(job);
        } else {
          olderJobs.push(job);
        }
      });
      
      // Strategic card distribution: 4 recent (pro) + 6 older (free)
      // But ensure we always show 10 cards total
      const selectedRecentJobs = recentJobs.slice(0, 4);
      const selectedOlderJobs = olderJobs.slice(0, 6);
      
      // If we don't have enough older jobs, fill with more recent jobs
      const remainingSlots = 10 - selectedRecentJobs.length - selectedOlderJobs.length;
      let additionalJobs = [];
      
      if (remainingSlots > 0) {
        // Get additional recent jobs (starting from index 4 to avoid duplicates)
        additionalJobs = recentJobs.slice(4, 4 + remainingSlots);
      }
      
      // Combine: recent jobs first, then older jobs, then additional jobs if needed
      const strategicJobs = [...selectedRecentJobs, ...selectedOlderJobs, ...additionalJobs];
      
      console.log('Strategic job distribution:');
      console.log(`- Recent jobs available: ${recentJobs.length}`);
      console.log(`- Older jobs available: ${olderJobs.length}`);
      console.log(`- Selected recent jobs (Pro): ${selectedRecentJobs.length}/4`);
      console.log(`- Selected older jobs (Free): ${selectedOlderJobs.length}/6`);
      console.log(`- Additional jobs to fill: ${additionalJobs.length}`);
      console.log(`- Total jobs shown: ${strategicJobs.length}/10`);
      
      setJobs(strategicJobs);
      
      // Fetch ZIP codes for each job
      fetchZipcodesForJobs(strategicJobs);
    } catch (error) {
      console.error('Supabase fetch error:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchZipcodesForJobs = async (jobs) => {
    const newZipcodes = {};
    
    // City name corrections/variations
    const cityCorrections = {
      'Fairlawn': 'Fairfield',
      'Fair Lawn': 'Fairfield',
      'Saint': 'St',  // St. Louis vs Saint Louis
      'Mount': 'Mt',  // Mt. Vernon vs Mount Vernon
      // Add more corrections as needed
    };
    
    // Function to fetch with timeout
    const fetchWithTimeout = (url, timeout = 5000) => {
      return Promise.race([
        fetch(url),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);
    };
    
    for (const job of jobs) {
      let city = job.city;
      const state = job.state;
      
      if (city && state) {
        // Apply city name corrections
        const correctedCity = cityCorrections[city] || city;
        
        try {
          const response = await fetchWithTimeout(`https://api.zippopotam.us/us/${state}/${encodeURIComponent(correctedCity)}`, 3000);
          if (response.ok) {
            const data = await response.json();
            if (data.places && data.places.length > 0) {
              const zipcode = data.places[0]['post code'];
              newZipcodes[`${city}-${state}`] = zipcode; // Use original city name as key
              console.log(`✅ Found ZIP code ${zipcode} for ${city}, ${state} (corrected to ${correctedCity})`);
            }
          } else {
            console.log(`❌ No ZIP code found for ${city}, ${state} (tried ${correctedCity})`);
            // Mark as not found so we don't keep trying
            newZipcodes[`${city}-${state}`] = 'N/A';
          }
        } catch (error) {
          console.log(`❌ Error fetching zipcode for ${city}, ${state}:`, error.message);
          // Mark as failed so we don't keep trying
          newZipcodes[`${city}-${state}`] = 'N/A';
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
          <span className="tab-icon">🛒</span>
          <span className="tab-name">Instacart</span>
        </button>
        <button 
          className={`app-tab ${currentApp === 'doordash' ? 'active' : ''}`}
          onClick={() => handleAppChange('doordash')}
        >
          <span className="tab-icon">🚗</span>
          <span className="tab-name">DoorDash</span>
        </button>
        <button 
          className={`app-tab ${currentApp === 'caviar' ? 'active' : ''}`}
          onClick={() => handleAppChange('caviar')}
        >
          <span className="tab-icon">🍽️</span>
          <span className="tab-name">Caviar</span>
        </button>
        <button 
          className={`app-tab ${currentApp === 'spark_delivery' ? 'active' : ''}`}
          onClick={() => handleAppChange('spark_delivery')}
        >
          <span className="tab-icon">⚡</span>
          <span className="tab-name">Spark Delivery</span>
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
              const shouldBlur = shouldBlurLocation(job, index);
              const isRecent = isJobRecent(job.posted_at);
              
              return (
                <div key={index} className="job-card">
                  <h3 className="job-title">{job.title || job.job_name || 'Delivery Driver'}</h3>
                  
                  {/* Location with conditional blur */}
                  <p className={`job-location ${shouldBlur ? 'location-blurred' : ''}`}>
                    {job.city || 'City'}, {job.state || 'State'}
                  </p>
                  
                  {/* Zipcode with conditional blur */}
                  <div className="zipcode-section">
                    <p className={`job-zipcode ${shouldBlur ? 'location-blurred' : ''}`}>
                      Zipcode: {zipcode === 'N/A' ? 'Not Found' : (zipcode || 'Searching...')}
                    </p>
                    
                    {/* Show zipcode button for blurred content */}
                    {shouldBlur && (
                      <button className="show-zipcode-button" onClick={handleShowUnlock}>
                        Show Zipcode
                      </button>
                    )}
                  </div>

                  {/* Time is always visible */}
                  <p className="job-time">
                    {formatTimeAgo(job.posted_at)}
                    {isRecent && <span className="recent-badge">🔥 Fresh</span>}
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

      {/* Pro Access Banner */}
      {isPro && proExpiresAt && (
        <div className="pro-access-banner">
          <div className="pro-banner-content">
            <span className="pro-icon">⭐</span>
            <span className="pro-text">Pro access active: {formatTimeRemaining(proExpiresAt)}</span>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="modal-overlay" onClick={() => setShowUnlockModal(false)}>
          <div className="unlock-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowUnlockModal(false)}>×</button>
            
            <div className="modal-header">
              <h3>🔓 Unlock Fresh Gig Data</h3>
            </div>
            
            <div className="modal-content">
              <p className="modal-description">
                This info is only available to Pro users for the first 10 hours after posting. 
                Unlock all fresh gig jobs and zip codes for just <strong>$19.99</strong>.
              </p>
              
              <div className="modal-features">
                <div className="feature-item">✓ See all fresh job locations instantly</div>
                <div className="feature-item">✓ Access to all zip codes and city data</div>
                <div className="feature-item">✓ 3-day unlimited access</div>
                <div className="feature-item">✓ No gigs in your area? Full refund, no risk</div>
              </div>
              
              <p className="modal-disclaimer">
                You'll always see jobs after 10 hours for free. No pressure!
              </p>
            </div>
            
            <div className="modal-actions">
              <button className="upgrade-button" onClick={handleProUpgrade}>
                Unlock Pro Access - $19.99
              </button>
              <button className="cancel-button" onClick={() => setShowUnlockModal(false)}>
                Not now, thanks
              </button>
            </div>
          </div>
        </div>
      )}

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