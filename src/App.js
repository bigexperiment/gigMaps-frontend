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
  const [username, setUsername] = useState('');
  
  // License key verification state
  const [licenseKey, setLicenseKey] = useState('');
  const [verifyingLicense, setVerifyingLicense] = useState(false);
  const [licenseError, setLicenseError] = useState('');
  
  // Page state
  const [currentPage, setCurrentPage] = useState('home'); // home, privacy, terms, contact
  const [expandedFaq, setExpandedFaq] = useState(null);
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submittingForm, setSubmittingForm] = useState(false);

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
        
        // Calculate expiration based on purchase date + 3 days
        let expiresAt;
        if (proData.purchasedAt) {
          const purchaseDate = new Date(proData.purchasedAt);
          expiresAt = new Date(purchaseDate.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days from purchase
        } else {
          // Fallback to stored expiresAt if purchasedAt is not available
          expiresAt = new Date(proData.expiresAt);
        }
        
        console.log('Checking pro status:', {
          purchasedAt: proData.purchasedAt,
          expiresAt: expiresAt.toISOString(),
          now: now.toISOString(),
          daysPassed: (now - new Date(proData.purchasedAt)) / (1000 * 60 * 60 * 24)
        });
        
        if (expiresAt > now) {
          setIsPro(true);
          setProExpiresAt(expiresAt);
          setUsername(proData.username || '');
          console.log('Pro access still valid until:', expiresAt);
        } else {
          // Pro access expired, clean up
          console.log('Pro access expired, cleaning up');
          localStorage.removeItem('gigmaps-pro-status');
          setIsPro(false);
          setProExpiresAt(null);
          setUsername('');
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



  // Verify Gumroad license key
  const verifyLicenseKey = async (key) => {
    setVerifyingLicense(true);
    setLicenseError('');
    
    try {
      const body = new URLSearchParams({
        product_id: 'zLwu9esmUk0UaCnzP-BMOw==', // Your Gumroad product ID
        license_key: key.trim(),
      });

      const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      const data = await response.json();
      console.log('Gumroad verification response:', data);

      if (data.success && data.purchase && data.purchase.license_key === key.trim()) {
        // License is valid - activate pro access for 3 days
        const purchaseDate = new Date(data.purchase.created_at || Date.now());
        const expiresAt = new Date(purchaseDate.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days from purchase
        
        // Extract username from email (part before @)
        const email = data.purchase.email || '';
        const extractedUsername = email.split('@')[0] || 'User';
        
        const proData = {
          licenseKey: key.trim(),
          username: extractedUsername,
          email: email,
          purchasedAt: data.purchase.created_at || new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          plan: 'gumroad-pro-3-day',
          gumroadData: data.purchase
        };
        
        localStorage.setItem('gigmaps-pro-status', JSON.stringify(proData));
        
        setIsPro(true);
        setProExpiresAt(expiresAt);
        setUsername(extractedUsername);
        setShowUnlockModal(false);
        setLicenseKey('');
        
        console.log('Pro access activated via license key:', {
          username: extractedUsername,
          email: email,
          purchasedAt: data.purchase.created_at,
          expiresAt: expiresAt.toISOString()
        });
      } else {
        setLicenseError('Invalid license key. Please check and try again.');
      }
    } catch (error) {
      console.error('License verification error:', error);
      setLicenseError('Failed to verify license key. Please try again.');
    } finally {
      setVerifyingLicense(false);
    }
  };

  // Handle license key submission
  const handleLicenseSubmit = (e) => {
    e.preventDefault();
    if (licenseKey.trim()) {
      verifyLicenseKey(licenseKey.trim());
    }
  };

  // Handle Gumroad purchase (opens in new tab)
  const handleGumroadPurchase = () => {
    window.open('https://mazepool.gumroad.com/l/gigmaps', '_blank');
  };

  // Handle contact form input changes
  const handleContactFormChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle contact form submission
  const handleContactFormSubmit = async (e) => {
    e.preventDefault();
    setSubmittingForm(true);

    try {
      // Send to Formspree
      const formspreeResponse = await fetch('https://formspree.io/f/xovlkdal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm)
      });

      // Send notification to ntfy.sh
      const ntfyMessage = `${contactForm.email} sent a message about "${contactForm.subject}"\n\nFrom: ${contactForm.name}\nMessage: ${contactForm.message}`;
      
      await fetch('https://ntfy.sh/dhikurpokhari', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: ntfyMessage
      });

      // Reset form on success
      setContactForm({
        name: '',
        email: '',
        subject: '',
        message: ''
      });

      alert('Message sent successfully! We\'ll get back to you within 24 hours.');
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('There was an error sending your message. Please try again or email us directly at hi@gigmaps.co');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Handle show unlock button click
  const handleShowUnlock = () => {
    setShowUnlockModal(true);
    // Clear any previous license key state
    setLicenseKey('');
    setLicenseError('');
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowUnlockModal(false);
    setLicenseKey('');
    setLicenseError('');
  };

  // Page navigation
  const navigateToPage = (page) => {
    setCurrentPage(page);
    setShowMenu(false);
  };

  // FAQ toggle
  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // FAQ data
  const faqs = [
    {
      question: "What is GigMaps Pro?",
      answer: "GigMaps Pro gives you instant access to fresh gig job locations within the first 10 hours of posting. See exact zip codes, cities, and states before other drivers do."
    },
    {
      question: "How long does Pro access last?",
      answer: "Pro access lasts for 3 full days from your purchase date. You'll see a countdown timer at the top of your screen."
    },
    {
      question: "What if there are no jobs in my area?",
      answer: "We offer a full refund if your zip code has no job listings at the time of purchase. No questions asked."
    },
    {
      question: "Do I need to create an account?",
      answer: "No! Simply purchase through Gumroad, enter your license key, and you're ready to go. No signups or personal info required."
    },
    {
      question: "Which gig platforms do you support?",
      answer: "We currently support Instacart, DoorDash, Caviar, and Spark Delivery, with more platforms being added regularly."
    },
    {
      question: "Can I use my license key on multiple devices?",
      answer: "Yes, you can use your license key on any device. Just enter it on each device you want to use."
    }
  ];

  // Format time remaining for pro access (days and hours only)
  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expired';
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h remaining`;
    } else {
      return 'Less than 1h remaining';
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

  // Render different pages
  const renderHomePage = () => (
    <>
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

      {/* About Section */}
      <section className="about-section">
        <div className="section-content">
          <h2>Why GigMaps?</h2>
          <p>
            We built GigMaps because gig workers deserved better. While everyone else sees stale job postings, 
            our Pro users get the competitive edge with fresh location data. Know exactly where the opportunities 
            are before they're gone.
          </p>
          <div className="stats">
            <div className="stat">
              <span className="stat-number">10hrs</span>
              <span className="stat-label">Exclusive Access Window</span>
            </div>
            <div className="stat">
              <span className="stat-number">4+</span>
              <span className="stat-label">Gig Platforms Supported</span>
            </div>
            <div className="stat">
              <span className="stat-number">3 days</span>
              <span className="stat-label">Full Pro Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="section-content">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <button 
                  className={`faq-question ${expandedFaq === index ? 'expanded' : ''}`}
                  onClick={() => toggleFaq(index)}
                >
                  {faq.question}
                  <span className="faq-icon">{expandedFaq === index ? '−' : '+'}</span>
                </button>
                {expandedFaq === index && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  const renderContactPage = () => (
    <main className="page-content">
      <div className="section-content">
        <h2>Contact Us</h2>
        <p>Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
        
        <div className="contact-container">
          <div className="contact-info">
            <h3>Get in Touch</h3>
            <div className="contact-item">
              <span className="contact-icon">📧</span>
              <div>
                <strong>Email</strong>
                <p>hi@gigmaps.co</p>
              </div>
            </div>
            <div className="contact-item">
              <span className="contact-icon">⚡</span>
              <div>
                <strong>Response Time</strong>
                <p>Usually within 24 hours</p>
              </div>
            </div>
          </div>
          
          <form className="contact-form" onSubmit={handleContactFormSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                value={contactForm.name}
                onChange={handleContactFormChange}
                required 
                disabled={submittingForm}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={contactForm.email}
                onChange={handleContactFormChange}
                required 
                disabled={submittingForm}
              />
            </div>
            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <input 
                type="text" 
                id="subject" 
                name="subject" 
                value={contactForm.subject}
                onChange={handleContactFormChange}
                required 
                disabled={submittingForm}
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea 
                id="message" 
                name="message" 
                rows="5" 
                value={contactForm.message}
                onChange={handleContactFormChange}
                required 
                disabled={submittingForm}
              ></textarea>
            </div>
            <button type="submit" className="submit-button" disabled={submittingForm}>
              {submittingForm ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );

  const renderPrivacyPage = () => (
    <main className="page-content">
      <div className="section-content">
        <h2>Privacy Policy</h2>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="policy-content">
          <h3>Information We Collect</h3>
          <p>We collect minimal information to provide our service:</p>
          <ul>
            <li>License key and email address (through Gumroad purchase)</li>
            <li>Usage data to improve our service</li>
            <li>No personal browsing history or location tracking</li>
          </ul>

          <h3>How We Use Your Information</h3>
          <ul>
            <li>Verify your Pro access through license keys</li>
            <li>Provide customer support</li>
            <li>Improve our job data accuracy</li>
          </ul>

          <h3>Data Storage</h3>
          <p>Your license key is stored locally on your device. We don't maintain user accounts or store personal data on our servers.</p>

          <h3>Third-Party Services</h3>
          <p>We use Gumroad for payment processing. Please review their privacy policy for payment-related data handling.</p>

          <h3>Contact Us</h3>
          <p>For privacy questions, email us at hi@gigmaps.co</p>
        </div>
      </div>
    </main>
  );

  const renderTermsPage = () => (
    <main className="page-content">
      <div className="section-content">
        <h2>Terms of Service</h2>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="policy-content">
          <h3>Service Description</h3>
          <p>GigMaps Pro provides early access to gig job location data for supported platforms. Access lasts 3 days from purchase.</p>

          <h3>Refund Policy</h3>
          <p>Full refund available if your zip code has no job listings at time of purchase. Contact hi@gigmaps.co within 24 hours.</p>

          <h3>Usage Terms</h3>
          <ul>
            <li>License keys are for personal use only</li>
            <li>No reselling or sharing of access</li>
            <li>We reserve the right to revoke access for misuse</li>
          </ul>

          <h3>Data Accuracy</h3>
          <p>Job data is provided as-is. We strive for accuracy but cannot guarantee job availability or details.</p>

          <h3>Limitation of Liability</h3>
          <p>GigMaps is not responsible for job application outcomes or gig platform decisions.</p>

          <h3>Contact</h3>
          <p>Questions about these terms? Email hi@gigmaps.co</p>
        </div>
      </div>
    </main>
  );

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
    <div className={`App ${isPro ? 'pro-active' : ''}`}>
      {/* Header */}
      <header className="App-header">
        <div className="header-content">
          <div className="logo-section" onClick={() => navigateToPage('home')}>
            <h1>GigMaps</h1>
            <p>Find the best gig jobs near you</p>
          </div>
          <nav className="main-nav">
            <button className="menu-toggle" onClick={() => setShowMenu(!showMenu)}>
              ☰
            </button>
            <div className={`nav-menu ${showMenu ? 'show' : ''}`}>
              <button onClick={() => navigateToPage('home')} className={currentPage === 'home' ? 'active' : ''}>
                Home
              </button>
              <button onClick={() => navigateToPage('contact')} className={currentPage === 'contact' ? 'active' : ''}>
                Contact
              </button>
              <button onClick={() => navigateToPage('privacy')} className={currentPage === 'privacy' ? 'active' : ''}>
                Privacy
              </button>
              <button onClick={() => navigateToPage('terms')} className={currentPage === 'terms' ? 'active' : ''}>
                Terms
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Page Content */}
      {currentPage === 'home' && renderHomePage()}
      {currentPage === 'contact' && renderContactPage()}
      {currentPage === 'privacy' && renderPrivacyPage()}
      {currentPage === 'terms' && renderTermsPage()}

      {/* Pro Access Banner */}
      {isPro && proExpiresAt && (
        <div className="pro-access-banner">
          <div className="pro-banner-content">
            <span className="pro-icon">⭐</span>
            <span className="pro-text">
              Hi {username || 'User'}! {formatTimeRemaining(proExpiresAt)}
            </span>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="unlock-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleModalClose}>×</button>
            
            <div className="modal-header">
              <h3>🔓 Unlock Fresh Gig Data</h3>
            </div>
            
            <div className="modal-content">
              <p className="modal-description">
                Get instant access to fresh job locations for the first 10 hours after posting. 
                Unlock all zip codes and city data for just <strong>$19.99</strong>.
              </p>
              
              <div className="modal-features">
                <div className="feature-item">✓ See all fresh job locations instantly</div>
                <div className="feature-item">✓ Access to all zip codes and city data</div>
                <div className="feature-item">✓ 3-day unlimited access</div>
                <div className="feature-item">✓ No gigs in your area? Full refund, no risk</div>
                <div className="feature-item">✓ App waitlisted you? Guaranteed refund or new code</div>
              </div>
              
              <p className="modal-disclaimer">
                You'll always see jobs after 10 hours for free. No pressure!
              </p>
              
              <div className="modal-legal">
                <p>
                  By purchasing, you agree to our{' '}
                  <button className="legal-link" onClick={() => { setShowUnlockModal(false); navigateToPage('terms'); }}>
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button className="legal-link" onClick={() => { setShowUnlockModal(false); navigateToPage('privacy'); }}>
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>
            
            <div className="modal-actions">
              {/* Gumroad Purchase Option */}
              <button className="upgrade-button" onClick={handleGumroadPurchase}>
                Pay now with Gumroad - $19.99
              </button>
              
              {/* License Key Section */}
              <div className="license-section">
                <p className="license-text">Already purchased? Enter your license key:</p>
                <form onSubmit={handleLicenseSubmit} className="license-form">
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="Enter license key..."
                    className="license-input"
                    disabled={verifyingLicense}
                  />
                  <button 
                    type="submit" 
                    className="verify-button"
                    disabled={verifyingLicense || !licenseKey.trim()}
                  >
                    {verifyingLicense ? 'Verifying...' : 'Verify'}
                  </button>
                </form>
                {licenseError && <p className="license-error">{licenseError}</p>}
              </div>
              
              <button className="cancel-button" onClick={handleModalClose}>
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
              <li><button onClick={() => navigateToPage('contact')}>Contact Us</button></li>
              <li><button onClick={() => navigateToPage('privacy')}>Privacy Policy</button></li>
              <li><button onClick={() => navigateToPage('terms')}>Terms of Service</button></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <div className="contact-info">
              <p>Email: hi@gigmaps.co</p>
              <p>Response time: 24 hours</p>
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