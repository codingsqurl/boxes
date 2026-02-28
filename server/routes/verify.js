const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { sendConfirmationEmail, sendAppointmentConfirmation } = require('../email');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// GET /api/verify/:token
router.get('/:token', (req, res) => {
  const { token } = req.params;

  // Tokens are 64 hex chars — reject anything else upfront
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.redirect('/pages/verify.html?status=invalid');
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM email_verifications WHERE token = ?').get(token);

  if (!row) return res.redirect('/pages/verify.html?status=invalid');
  if (row.used_at) return res.redirect('/pages/verify.html?status=already');

  const age = Date.now() - new Date(row.created_at).getTime();
  if (age > TOKEN_TTL_MS) return res.redirect('/pages/verify.html?status=expired');

  // Mark token as consumed
  db.prepare(`UPDATE email_verifications SET used_at = datetime('now') WHERE token = ?`).run(token);

  if (row.type === 'lead') {
    db.prepare('UPDATE leads SET email_verified = 1 WHERE id = ?').run(row.record_id);

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(row.record_id);
    if (lead) {
      sendConfirmationEmail({
        firstName: lead.first_name,
        lastName:  lead.last_name,
        email:     lead.email,
        service:   lead.service,
        city:      lead.city,
      }).catch(err => console.error('[email] Post-verify confirmation failed:', err.message));
    }

  } else if (row.type === 'appointment') {
    db.prepare('UPDATE appointments SET email_verified = 1 WHERE id = ?').run(row.record_id);

    const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(row.record_id);
    if (appt) {
      sendAppointmentConfirmation({
        firstName:    appt.first_name,
        lastName:     appt.last_name,
        email:        appt.email,
        service:      appt.service,
        city:         appt.city,
        preferredDate: appt.preferred_date,
        preferredTime: appt.preferred_time,
      }).catch(err => console.error('[email] Post-verify appt confirmation failed:', err.message));
    }
  }

  return res.redirect('/pages/verify.html?status=success');
});

module.exports = router;
