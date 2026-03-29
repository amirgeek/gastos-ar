export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GALIO_API_KEY;
    const clientId = process.env.GALIO_CLIENT_ID;
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';

    if (!apiKey || !clientId) {
      return res.status(500).json({ error: 'Missing GALIO env vars' });
    }

    const { email, userId } = req.body || {};

    const payload = {
      items: [
        {
          title: 'Suscripción mensual pesito.ar',
          quantity: 1,
          unitPrice: 6000,
          currencyId: 'ARS',
        },
      ],
      referenceId: `pesito-${userId || 'guest'}-${Date.now()}`,
      backUrl: {
        success: `${baseUrl}?subscription=success`,
        failure: `${baseUrl}?subscription=failure`,
      },
      notificationUrl: process.env.GALIO_NOTIFICATION_URL || undefined,
      sandbox: process.env.GALIO_SANDBOX === 'true',
      metadata: {
        app: 'pesito.ar',
        email: email || '',
        userId: userId || '',
      },
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

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to create payment link' });
  }
}
