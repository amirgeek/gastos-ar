import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return res.status(500).json({ error: 'Missing Supabase server env vars' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload = req.body || {};

    // Adaptar según payload real de Galio una vez que llegue el primer webhook.
    const referenceId = payload.referenceId || payload.reference_id || payload.external_reference || null;
    const status = payload.status || payload.paymentStatus || payload.payment_status || 'unknown';

    if (!referenceId) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'No referenceId found' });
    }

    // referenceId esperado: pesito-<userId>-<timestamp>
    const parts = String(referenceId).split('-');
    const userId = parts.length >= 3 ? parts.slice(1, -1).join('-') : null;

    if (!userId || userId === 'guest') {
      return res.status(200).json({ ok: true, ignored: true, reason: 'No valid user id' });
    }

    const paidStatuses = ['approved', 'paid', 'success', 'succeeded', 'completed'];
    const isPaid = paidStatuses.includes(String(status).toLowerCase());

    const update = {
      subscription_status: String(status).toLowerCase(),
      subscription_provider: 'galio',
      subscription_reference: referenceId,
      updated_at: new Date().toISOString(),
    };

    if (isPaid) {
      update.plan = 'pro';
    }

    const { error } = await supabase.from('profiles').update(update).eq('id', userId);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, userId, status: update.subscription_status, plan: update.plan || 'unchanged' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Webhook failed' });
  }
}
