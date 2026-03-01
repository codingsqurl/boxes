const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { getDb } = require('../db');
const { sendVerificationEmail } = require('../email');
const { notifyPaulForAppt } = require('../notify');
const { validateContact, VALID_SERVICES } = require('../constants');

const TIME_SLOTS = [
  '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM',
];

// GET /api/schedule/availability?date=YYYY-MM-DD
router.get('/availability', (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Provide date as YYYY-MM-DD' });
  }

  const day = new Date(date + 'T00:00:00').getDay(); // 0=Sun, 6=Sat
  if (day === 0) return res.json({ available: [] }); // Closed Sundays

  const db = getDb();
  const booked = db.prepare(`
    SELECT preferred_time FROM appointments
    WHERE preferred_date = ? AND status != 'cancelled'
  `).all(date).map(r => r.preferred_time);

  const available = TIME_SLOTS.filter(t => !booked.includes(t));
  res.json({ available });
});

// POST /api/schedule
router.post('/', async (req, res, next) => {
  try {
    const { firstName, lastName, phone, email, service, city, preferredDate, preferredTime, message } = req.body;

    const errors = validateContact({ firstName, lastName, phone, email, service, city });
    if (!preferredDate?.trim()) errors.push('preferredDate is required');
    if (!preferredTime?.trim()) errors.push('preferredTime is required');
    if (preferredTime && !TIME_SLOTS.includes(preferredTime)) errors.push('invalid time slot');

    if (errors.length > 0) return res.status(400).json({ errors });

    const db = getDb();

    // Wrap check + insert in a transaction to prevent double-booking race conditions
    const book = db.transaction(() => {
      const conflict = db.prepare(`
        SELECT id FROM appointments
        WHERE preferred_date = ? AND preferred_time = ? AND status != 'cancelled'
      `).get(preferredDate, preferredTime);

      if (conflict) return null;

      return db.prepare(`
        INSERT INTO appointments (first_name, last_name, phone, email, service, city, preferred_date, preferred_time, message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        firstName.trim(), lastName.trim(), phone.trim(),
        email.trim(), service, city.trim(),
        preferredDate, preferredTime, (message || '').trim()
      );
    });

    const result = book();
    if (!result) return res.status(409).json({ error: 'That time slot is no longer available. Please pick another.' });

    const appt = { firstName, lastName, phone, email, service, city, preferredDate, preferredTime, message };

    // Notify Paul during business hours (9:30 AM – 7:00 PM MT); held until then if outside window
    notifyPaulForAppt(result.lastInsertRowid);

    // Send verification email to customer — confirmation is sent after they click the link
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare(
      'INSERT INTO email_verifications (token, type, record_id) VALUES (?, ?, ?)'
    ).run(token, 'appointment', result.lastInsertRowid);

    sendVerificationEmail(appt, token).catch(err => console.error('[email] Verification email failed:', err.message));

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
