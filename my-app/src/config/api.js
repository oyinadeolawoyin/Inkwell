// API Configuration
// This automatically uses the correct API URL based on environment

export const API_URL = import.meta.env.VITE_API_URL || "https://inkwellbackend.onrender.com/api"

// Helper function for making API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  return response;
};

// Log which environment we're in (only in development)
if (import.meta.env.DEV) {
  console.log('🌐 API URL:', API_URL);
  console.log('🔧 Environment:', import.meta.env.MODE);
}

export default API_URL;