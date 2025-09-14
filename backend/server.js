const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const multer = require('multer');
const cors = require('cors');

dotenv.config();
const app = express();


app.use(cors({
  origin: function (origin, callback) {
    
    const allowedOrigins = [
      'http://localhost:3000',  
      'https://personalfinanceassist.netlify.app',  
      // '*'/
    ];
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // For JWT cookies if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Explicitly allow OPTIONS for preflight
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']  // Common headers
}));

// Handle preflight OPTIONS requests globally (fallback)
app.options('*', cors());

app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

app.use('/api/auth', authRoutes);
app.use('/api/transactions', upload.single('file'), transactionRoutes);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.listen(5000, () => console.log('Server running on port 5000'));