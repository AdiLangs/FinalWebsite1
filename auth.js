// Check if user is already logged in
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch('http://localhost:3000/api/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                // User is authenticated, redirect to homepage
                window.location.href = 'homepage.html';
            } else {
                // Token is invalid, remove it
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Auth check error:', error);
            localStorage.removeItem('token');
        }
    }
}

// Authentication functions
async function register(name, email, password) {
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            return true;
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

async function login(email, password) {
    try {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        console.log('Attempting login for:', email);
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('Server response:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        if (!data.token) {
            throw new Error('Invalid server response: No token received');
        }

        if (!data.user) {
            throw new Error('Invalid server response: No user data received');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Login successful for:', data.user.email);
        return true;
    } catch (error) {
        console.error('Login error:', error);
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