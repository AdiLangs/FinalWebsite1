// API base URL
const API_BASE_URL = 'http://localhost:3000';

// Add debug logging function
function debugLog(message, data = null) {
    console.log(`[Auth Debug] ${message}`, data || '');
}

// Test server connection
async function testServerConnection() {
    try {
        debugLog('Testing server connection...');
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        debugLog('Server health check response:', data);
        return data.status === 'ok';
    } catch (error) {
        debugLog('Server connection test failed:', error);
        return false;
    }
}

// Check if user is already logged in
async function checkAuth() {
    // First test server connection
    const isServerConnected = await testServerConnection();
    if (!isServerConnected) {
        debugLog('Server is not accessible');
        alert('Unable to connect to the server. Please try again later.');
        return;
    }

    debugLog('Checking authentication status');
    const token = localStorage.getItem('token');
    if (token) {
        try {
            debugLog('Found token, verifying with server');
            const response = await fetch(`${API_BASE_URL}/api/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            debugLog('Server response:', response);
            if (response.ok) {
                debugLog('Token valid, redirecting to homepage');
                window.location.href = 'homepage.html';
            } else {
                debugLog('Token invalid, removing from storage');
                localStorage.removeItem('token');
            }
        } catch (error) {
            debugLog('Auth check error:', error);
            localStorage.removeItem('token');
        }
    } else {
        debugLog('No token found');
    }
}

// Authentication functions
async function register(name, email, password) {
    debugLog('Attempting registration:', { name, email });
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        debugLog('Registration response:', response);
        const data = await response.json();
        debugLog('Registration data:', data);

        if (response.ok) {
            debugLog('Registration successful, storing token');
            localStorage.setItem('token', data.token);
            return true;
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        debugLog('Registration error:', error);
        throw error;
    }
}

async function login(email, password) {
    debugLog('Attempting login:', { email });
    try {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        debugLog('Login response:', response);
        const data = await response.json();
        debugLog('Login data:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        if (!data.token) {
            throw new Error('Invalid server response: No token received');
        }

        if (!data.user) {
            throw new Error('Invalid server response: No user data received');
        }

        debugLog('Login successful, storing data');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
    } catch (error) {
        debugLog('Login error:', error);
        throw error;
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// Update the sign-in form submission
document.getElementById('signin-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    try {
        const success = await login(email, password);
        if (success) {
            window.location.href = 'homepage.html';
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert(error.message);
    }
});

// Update the sign-up form submission
document.getElementById('signup-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    try {
        await register(name, email, password);
        window.location.href = 'homepage.html';
    } catch (error) {
        alert(error.message);
    }
});

// Check authentication status when page loads
document.addEventListener('DOMContentLoaded', checkAuth); 