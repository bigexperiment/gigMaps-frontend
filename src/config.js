// GigMaps Frontend Configuration
// This file manages Supabase credentials and app settings

// Default configuration
// IMPORTANT: Supabase credentials are now loaded from environment variables
const defaultConfig = {
    supabaseUrl: process.env.REACT_APP_SUPABASE_URL || '',
    supabaseKey: process.env.REACT_APP_SUPABASE_KEY || '',
    jobsLimit: 9,
    debug: false
};

// Debug: Log the Supabase URL
console.log('Supabase URL from env:', process.env.REACT_APP_SUPABASE_URL || 'UNDEFINED');
console.log('Supabase Key from env:', process.env.REACT_APP_SUPABASE_KEY ? process.env.REACT_APP_SUPABASE_KEY.substring(0, 20) + '...' : 'UNDEFINED');

// Load configuration from localStorage
function loadConfig() {
    try {
        const savedConfig = localStorage.getItem('gigmaps-config');
        if (savedConfig) {
            return { ...defaultConfig, ...JSON.parse(savedConfig) };
        }
    } catch (error) {
        console.warn('Error loading config from localStorage:', error);
    }
    return defaultConfig;
}

// Save configuration to localStorage
function saveConfig(config) {
    try {
        localStorage.setItem('gigmaps-config', JSON.stringify(config));
        return true;
    } catch (error) {
        console.error('Error saving config to localStorage:', error);
        return false;
    }
}

// Get current configuration
function getConfig() {
    return loadConfig();
}

// Update configuration
function updateConfig(newConfig) {
    const currentConfig = loadConfig();
    const updatedConfig = { ...currentConfig, ...newConfig };
    return saveConfig(updatedConfig);
}

// Test Supabase connection
async function testConnection() {
    const config = loadConfig();
    
    if (!config.supabaseUrl || !config.supabaseKey) {
        throw new Error('Supabase credentials not configured');
    }
    
    try {
        const response = await fetch(`${config.supabaseUrl}/rest/v1/instacart_jobs?select=count&limit=1`, {
            headers: {
                'apikey': config.supabaseKey,
                'Authorization': `Bearer ${config.supabaseKey}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return true;
    } catch (error) {
        throw new Error(`Connection failed: ${error.message}`);
    }
}

// Export for React
export { loadConfig, saveConfig, getConfig, updateConfig, testConnection, defaultConfig }; 