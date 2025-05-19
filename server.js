const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

// Debug: Log environment variables
console.log('MongoDB URI:', process.env.MONGODB_URI);
console.log('JWT Secret:', process.env.JWT_SECRET);
console.log('Port:', process.env.PORT);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Authentication Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId });
        
        if (!user) {
            throw new Error();
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Please authenticate' });
    }
};

// Register Route
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({ message: 'User registered successfully', token });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        // Verify database connection
        if (mongoose.connection.readyState !== 1) {
            console.error('Database not connected. Current state:', mongoose.connection.readyState);
            return res.status(500).json({ message: 'Database connection error' });
        }

        // Find user and log the query
        console.log('Searching for user with email:', email);
        const user = await User.findOne({ email: email });
        console.log('Database query result:', user ? 'User found' : 'No user found');

        if (!user) {
            console.log('Login failed: User not found in database');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password verification result:', isMatch ? 'Password matches' : 'Password does not match');

        if (!isMatch) {
            console.log('Login failed: Password mismatch');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        console.log('Login successful for user:', user.email);

        res.json({ 
            message: 'Login successful', 
            token,
            user: {
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// Verify Token Route
app.get('/api/verify', auth, async (req, res) => {
    res.json({ message: 'Token is valid', user: { name: req.user.name, email: req.user.email } });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Database connection test endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        // Check if we can connect to the database
        if (mongoose.connection.readyState === 1) {
            res.json({ 
                message: 'Database connection successful!',
                status: 'connected',
                details: {
                    host: mongoose.connection.host,
                    name: mongoose.connection.name,
                    port: mongoose.connection.port
                }
            });
        } else {
            res.status(500).json({ 
                message: 'Database not connected',
                status: 'disconnected',
                state: mongoose.connection.readyState
            });
        }
    } catch (error) {
        res.status(500).json({ 
            message: 'Database test failed',
            error: error.message
        });
    }
});

// Add a test route to check database connection and user collection
app.get('/api/debug/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json({
            connectionState: mongoose.connection.readyState,
            userCount: users.length,
            users: users.map(u => ({ email: u.email, name: u.name }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// MongoDB Connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jeremyadriancacho1:6OHlBTKEqTaGI1gY@lalamigstore.fwlrmec.mongodb.net/?retryWrites=true&w=majority&appName=LalamigStore';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Successfully connected to MongoDB Atlas');
    console.log('Connection details:', {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        port: mongoose.connection.port
    });
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if cannot connect to database
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// ... rest of your existing code ... 