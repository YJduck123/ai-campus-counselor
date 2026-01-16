const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { checkRequiredConfig } = require('./services/configService');
const { initializeFromKnowledge, getStats } = require('./services/vectorStore');
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

// Health check with RAG status
app.get('/health', (req, res) => {
    const vectorStats = getStats();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        rag: {
            initialized: vectorStats.isInitialized,
            documentCount: vectorStats.documentCount,
            categories: vectorStats.categories
        }
    });
});

// RAG status endpoint
app.get('/api/rag/status', (req, res) => {
    const stats = getStats();
    res.json({
        success: true,
        ...stats
    });
});

// Check configuration on startup
checkRequiredConfig();

// Initialize vector store with knowledge base
async function initializeRAG() {
    console.log('\n========================================');
    console.log('🚀 Initializing RAG System...');
    console.log('========================================\n');

    try {
        const result = await initializeFromKnowledge();

        if (result.success) {
            console.log(`✅ RAG initialized successfully!`);
            console.log(`   - Documents loaded: ${result.count}`);
            const stats = getStats();
            console.log(`   - Categories: ${stats.categories.join(', ')}`);
        } else {
            console.warn(`⚠️  RAG initialization warning: ${result.message}`);
            console.log('   - The system will continue without RAG capabilities');
        }
    } catch (error) {
        console.error('❌ RAG initialization failed:', error.message);
        console.log('   - The system will continue without RAG capabilities');
    }

    console.log('\n========================================\n');
}

// Start server
async function startServer() {
    // Initialize RAG first
    await initializeRAG();

    // Then start listening
    app.listen(PORT, () => {
        console.log(`🌐 Server is running on http://localhost:${PORT}`);
        console.log(`📚 RAG System: ${getStats().isInitialized ? 'Active' : 'Inactive'}`);
        console.log(`🤖 Multi-Agent Router: Active`);
        console.log('\nAvailable endpoints:');
        console.log(`   - POST /api/chat        (Chat with AI)`);
        console.log(`   - GET  /api/config/xmov (Digital Human config)`);
        console.log(`   - GET  /api/rag/status  (RAG system status)`);
        console.log(`   - GET  /health          (Health check)`);
    });
}

startServer();
