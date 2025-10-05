import express from 'express';
import cors from 'cors';

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'FinBot V3 API is running',
    timestamp: new Date().toISOString(),
    version: '3.0.0'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 FinBot V3 API Server running on http://localhost:${port}`);
  console.log(`✅ Health check: http://localhost:${port}/api/health`);
  console.log(`✅ Test endpoint: http://localhost:${port}/api/test`);
});
