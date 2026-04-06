const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../lib/supabase');
const { upload } = require('../lib/cloudinary');

// ── توليد reference code فريد ──────────────────────────────
function makeRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return `DTX-${code}`;
}

function clean(str, max = 255) {
  if (typeof str !== 'string') return null;
  return str.trim().slice(0, max);
}

// ────────────────────────────────────────────────────────────
// POST /create-payment
// بيتاستدعى من الـ mobile app عشان يعمل payment session
// ────────────────────────────────────────────────────────────
router.post('/create-payment', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id || typeof user_id !== 'string' || !user_id.trim()) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const payment_id = uuidv4();
    const reference  = makeRef();

    const { data, error } = await supabase
      .from('payments')
      .insert({
        id:        payment_id,
        user_id:   clean(user_id),
        reference,
        status:    'pending',
        amount:    parseFloat(process.env.SUBSCRIPTION_PRICE_USD || '20'),
        currency:  'USD',
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success:      true,
      payment_id:   data.id,
      reference:    data.reference,
      checkout_url: `${process.env.FRONTEND_URL}/checkout?payment_id=${data.id}`,
    });

  } catch (err) {
    console.error('[POST /create-payment]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create payment' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /payment/:payment_id
// بيتاستدعى من checkout.html عشان يجيب تفاصيل الـ payment
// ────────────────────────────────────────────────────────────
router.get('/payment/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;

    const { data, error } = await supabase
      .from('payments')
      .select('id, reference, status, amount, currency, created_at')
      .eq('id', payment_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    return res.json({
      success: true,
      payment: {
        id:               data.id,
        reference:        data.reference,
        status:           data.status,
        amount:           data.amount,
        currency:         data.currency,
        created_at:       data.created_at,
        instapay_account: process.env.INSTAPAY_ACCOUNT,
        instapay_holder:  process.env.INSTAPAY_HOLDER,
      },
    });

  } catch (err) {
    console.error('[GET /payment/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch payment' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /upload-proof
// بيتاستدعى لما المستخدم يسبمت الفورم مع الـ screenshot
// ────────────────────────────────────────────────────────────
router.post('/upload-proof', upload.single('proof_image'), async (req, res) => {
  try {
    const { payment_id, name, last4digits, transfer_time } = req.body;

    // Validation
    if (!payment_id)
      return res.status(400).json({ success: false, error: 'payment_id is required' });
    if (!name || name.trim().length < 2)
      return res.status(400).json({ success: false, error: 'Valid name is required' });
    if (!last4digits || !/^\d{4}$/.test(last4digits))
      return res.status(400).json({ success: false, error: 'last4digits must be 4 digits' });
    if (!transfer_time?.trim())
      return res.status(400).json({ success: false, error: 'transfer_time is required' });
    if (!req.file)
      return res.status(400).json({ success: false, error: 'Screenshot is required' });

    // تأكد إن الـ payment موجود وlسه pending
    const { data: payment, error: fetchErr } = await supabase
      .from('payments')
      .select('id, status')
      .eq('id', payment_id)
      .single();

    if (fetchErr || !payment)
      return res.status(404).json({ success: false, error: 'Payment not found' });

    if (payment.status !== 'pending')
      return res.status(409).json({ success: false, error: `Payment already ${payment.status}` });

    // req.file.path = Cloudinary URL
    const { error: updateErr } = await supabase
      .from('payments')
      .update({
        name:                clean(name, 100),
        last4digits:         last4digits.trim(),
        transfer_time:       clean(transfer_time, 50),
        proof_image_url:     req.file.path,
        proof_submitted_at:  new Date().toISOString(),
        status:              'under_review',
      })
      .eq('id', payment_id);

    if (updateErr) throw updateErr;

    return res.json({ success: true, message: 'Proof submitted. Awaiting review.' });

  } catch (err) {
    console.error('[POST /upload-proof]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to upload proof' });
  }
});

module.exports = router;
