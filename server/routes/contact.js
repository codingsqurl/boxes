const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { getDb } = require('../db');
const { sendVerificationEmail } = require('../email');
const { notifyPaulForLead } = require('../notify');
const { validateContact } = require('../constants');

router.post('/', async (req, res, next) => {
  try {
    const { firstName, lastName, phone, email, service, city, message } = req.body;

    const errors = validateContact({ firstName, lastName, phone, email, service, city });
    if (errors.length > 0) return res.status(400).json({ errors });

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO leads (first_name, last_name, phone, email, service, city, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      firstName.trim(), lastName.trim(), phone.trim(),
      email.trim(), service, city.trim(), (message || '').trim()
    );

    const lead = { firstName, lastName, phone, email, service, city, message };

    // Notify Paul during business hours (9:30 AM – 7:00 PM MT); held until then if outside window
    notifyPaulForLead(result.lastInsertRowid);

    // Send verification email to customer — confirmation is sent after they click the link
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare(
      'INSERT INTO email_verifications (token, type, record_id) VALUES (?, ?, ?)'
    ).run(token, 'lead', result.lastInsertRowid);

    sendVerificationEmail(lead, token).catch(err => console.error('[email] Verification email failed:', err.message));

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
