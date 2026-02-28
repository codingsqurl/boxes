const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { sendAppointmentEmail } = require('../email');
const { sendAppointmentSms } = require('../sms');

const VALID_SERVICES = ['pruning', 'removal', 'fire', 'storm', 'consultation', 'other'];

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

    const errors = [];
    if (!firstName?.trim())    errors.push('firstName is required');
    if (!lastName?.trim())     errors.push('lastName is required');
    if (!phone?.trim())        errors.push('phone is required');
    if (!email?.trim())        errors.push('email is required');
    if (!service || !VALID_SERVICES.includes(service)) errors.push('valid service is required');
    if (!city?.trim())         errors.push('city is required');
    if (!preferredDate?.trim()) errors.push('preferredDate is required');
    if (!preferredTime?.trim()) errors.push('preferredTime is required');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) errors.push('email format is invalid');

    const phoneDigits = (phone || '').replace(/\D/g, '');
    if (phone && phoneDigits.length !== 10) errors.push('phone must be 10 digits');

    if (!TIME_SLOTS.includes(preferredTime)) errors.push('invalid time slot');

    if (errors.length > 0) return res.status(400).json({ errors });

    // Check slot is still available
    const db = getDb();
    const conflict = db.prepare(`
      SELECT id FROM appointments
      WHERE preferred_date = ? AND preferred_time = ? AND status != 'cancelled'
    `).get(preferredDate, preferredTime);

    if (conflict) return res.status(409).json({ error: 'That time slot is no longer available. Please pick another.' });

    const result = db.prepare(`
      INSERT INTO appointments (first_name, last_name, phone, email, service, city, preferred_date, preferred_time, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      firstName.trim(), lastName.trim(), phone.trim(),
      email.trim(), service, city.trim(),
      preferredDate, preferredTime, (message || '').trim()
    );

    const appt = { firstName, lastName, phone, email, service, city, preferredDate, preferredTime, message };
    sendAppointmentEmail(appt).catch(err => console.error('[email] Appointment email failed:', err.message));
    sendAppointmentSms(appt).catch(err => console.error('[sms] Appointment SMS failed:', err.message));

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
