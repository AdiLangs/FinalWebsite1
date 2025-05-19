const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
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

// Order Schema
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        image: { type: String, required: true }
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Function to send order confirmation email
async function sendOrderConfirmationEmail(userEmail, orderDetails) {
    console.log('Attempting to send email to:', userEmail);
    console.log('Email configuration:', {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? 'Password is set' : 'Password is missing'
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Order Confirmation - Lalamig',
        html: `
            <h1>Thank you for your order!</h1>
            <h2>Order Summary:</h2>
            <table style="width:100%; border-collapse: collapse;">
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 8px; border: 1px solid #ddd;">Item</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Price</th>
                </tr>
                ${orderDetails.items.map(item => `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">₱${item.price}</td>
                    </tr>
                `).join('')}
                <tr style="font-weight: bold;">
                    <td colspan="2" style="padding: 8px; border: 1px solid #ddd;">Total</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">₱${orderDetails.totalAmount}</td>
                </tr>
            </table>
            <p>Order Date: ${new Date(orderDetails.createdAt).toLocaleString()}</p>
            <p>Order Status: ${orderDetails.status}</p>
            <p>Thank you for shopping with Lalamig!</p>
        `
    };

    try {
        console.log('Sending email with options:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

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

// Process Order Route
app.post('/api/orders', auth, async (req, res) => {
    try {
        console.log('Received order request from user:', req.user.email);
        const { items, totalAmount } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            console.error('Invalid order items:', items);
            return res.status(400).json({ message: 'Invalid order items' });
        }

        if (!totalAmount || typeof totalAmount !== 'number' || totalAmount <= 0) {
            console.error('Invalid total amount:', totalAmount);
            return res.status(400).json({ message: 'Invalid total amount' });
        }

        console.log('Creating new order with items:', items);
        
        // Create new order
        const order = new Order({
            userId: req.user._id,
            items,
            totalAmount
        });

        await order.save();
        console.log('Order saved successfully:', order._id);

        // Send confirmation email
        try {
            console.log('Attempting to send order confirmation email...');
            await sendOrderConfirmationEmail(req.user.email, order);
            console.log('Order confirmation email sent successfully');
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            // Don't fail the order if email fails
        }

        res.status(201).json({ 
            message: 'Order placed successfully',
            orderId: order._id
        });
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({ 
            message: 'Error processing order', 
            error: error.message 
        });
    }
});

// Get User Orders Route
app.get('/api/orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
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