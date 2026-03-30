export default async function handler(req, res) {
  res.status(503).json({
    error: 'Subscriptions are temporarily unavailable',
    detail: 'Public checkout is disabled until billing activation is fully validated end-to-end.',
  });
}
