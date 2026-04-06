const express   = require('express');
const router    = express.Router();
const supabase  = require('../lib/supabase');
const adminAuth = require('../middleware/auth');

// كل الـ routes هنا محتاجة admin password
router.use(adminAuth);

// ────────────────────────────────────────────────────────────
// GET /admin/payments?status=under_review
// ────────────────────────────────────────────────────────────
router.get('/payments', async (req, res) => {
  try {
    const status = req.query.status || 'under_review';

    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, payments: data });

  } catch (err) {
    console.error('[GET /admin/payments]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /admin/stats
// ────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const statuses = ['pending', 'under_review', 'approved', 'rejected'];
    const counts   = {};

    for (const s of statuses) {
      const { count, error } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', s);
      if (error) throw error;
      counts[s] = count;
    }

    return res.json({ success: true, stats: counts });

  } catch (err) {
    console.error('[GET /admin/stats]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /admin/approve
// ────────────────────────────────────────────────────────────
router.post('/approve', async (req, res) => {
  try {
    const { payment_id } = req.body;
    if (!payment_id)
      return res.status(400).json({ success: false, error: 'payment_id required' });

    const { data: payment, error: fetchErr } = await supabase
      .from('payments')
      .select('id, user_id, status')
      .eq('id', payment_id)
      .single();

    if (fetchErr || !payment)
      return res.status(404).json({ success: false, error: 'Payment not found' });

    if (payment.status === 'approved')
      return res.status(409).json({ success: false, error: 'Already approved' });

    // 1) update payment
    const { error: payErr } = await supabase
      .from('payments')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', payment_id);
    if (payErr) throw payErr;

    // 2) activate user subscription
    const subEnd = new Date();
    subEnd.setMonth(subEnd.getMonth() + 1);

    const { error: subErr } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_start:  new Date().toISOString(),
        subscription_end:    subEnd.toISOString(),
      })
      .eq('id', payment.user_id);

    if (subErr) console.error('[Approve] Could not update user subscription:', subErr.message);

    return res.json({ success: true, message: 'Payment approved. Subscription activated.' });

  } catch (err) {
    console.error('[POST /admin/approve]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to approve' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /admin/reject
// ────────────────────────────────────────────────────────────
router.post('/reject', async (req, res) => {
  try {
    const { payment_id, reason } = req.body;
    if (!payment_id)
      return res.status(400).json({ success: false, error: 'payment_id required' });

    const { data: payment, error: fetchErr } = await supabase
      .from('payments')
      .select('id, status')
      .eq('id', payment_id)
      .single();

    if (fetchErr || !payment)
      return res.status(404).json({ success: false, error: 'Payment not found' });

    if (payment.status === 'rejected')
      return res.status(409).json({ success: false, error: 'Already rejected' });

    const { error } = await supabase
      .from('payments')
      .update({
        status:           'rejected',
        rejection_reason: reason ? String(reason).slice(0, 500) : null,
        reviewed_at:      new Date().toISOString(),
      })
      .eq('id', payment_id);
    if (error) throw error;

    return res.json({ success: true, message: 'Payment rejected.' });

  } catch (err) {
    console.error('[POST /admin/reject]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to reject' });
  }
});

module.exports = router;
