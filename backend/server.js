const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { checkRequiredConfig } = require('./services/configService');
const chatRoutes = require('./routes/chat');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/config', configRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check configuration on startup
checkRequiredConfig();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
