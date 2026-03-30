import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'pesito-ar-server' });
});

app.post('/api/create-subscription-link', async (_req, res) => {
  res.status(503).json({
    error: 'Subscriptions are temporarily unavailable',
    detail: 'Public checkout is disabled until billing activation is fully validated end-to-end.',
  });
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`pesito.ar server listening on http://localhost:${port}`);
});
