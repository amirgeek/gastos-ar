export default async function handler(req, res) {
  res.status(503).json({
    error: 'Webhook disabled',
    detail: 'Automatic subscription activation was hidden until the provider payload and validation flow are verified in production.',
  });
}
