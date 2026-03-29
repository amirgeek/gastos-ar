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

app.post('/api/create-subscription-link', async (req, res) => {
  try {
    const apiKey = process.env.GALIO_API_KEY;
    const clientId = process.env.GALIO_CLIENT_ID;
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';

    if (!apiKey || !clientId) {
      return res.status(500).json({ error: 'Missing GALIO_API_KEY or GALIO_CLIENT_ID env vars' });
    }

    const { email } = req.body || {};

    const payload = {
      items: [
        {
          title: 'Suscripción mensual pesito.ar',
          quantity: 1,
          unitPrice: 6000,
          currencyId: 'ARS',
        },
      ],
      referenceId: `pesito-${Date.now()}`,
      backUrl: {
        success: `${baseUrl}?subscription=success`,
        failure: `${baseUrl}?subscription=failure`,
      },
      notificationUrl: process.env.GALIO_NOTIFICATION_URL || undefined,
      sandbox: process.env.GALIO_SANDBOX === 'true',
      customer: email ? { email } : undefined,
    };

    const response = await fetch('https://pay.galio.app/api/payment-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-client-id': clientId,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create payment link' });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`pesito.ar server listening on http://localhost:${port}`);
});
