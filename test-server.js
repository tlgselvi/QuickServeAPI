import express from 'express';

const app = express();
const port = 5000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server is running' });
});

app.listen(port, () => {
  console.log(`✅ Test server running on http://localhost:${port}`);
  console.log(`✅ Health check: http://localhost:${port}/api/health`);
});
