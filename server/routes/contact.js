const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { sendLeadEmail, sendConfirmationEmail } = require('../email');
const { sendLeadSms } = require('../sms');

const VALID_SERVICES = ['pruning', 'removal', 'fire', 'storm', 'consultation', 'other'];

router.post('/', async (req, res, next) => {
  try {
    const { firstName, lastName, phone, email, service, city, message } = req.body;

    const errors = [];
    if (!firstName?.trim()) errors.push('firstName is required');
    if (!lastName?.trim())  errors.push('lastName is required');
    if (!phone?.trim())     errors.push('phone is required');
    if (!email?.trim())     errors.push('email is required');
    if (!service || !VALID_SERVICES.includes(service)) errors.push('valid service is required');
    if (!city?.trim())      errors.push('city is required');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) errors.push('email format is invalid');

    const phoneDigits = (phone || '').replace(/\D/g, '');
    if (phone && phoneDigits.length !== 10) errors.push('phone must be 10 digits');

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
    sendLeadEmail(lead).catch(err => console.error('[email] Lead email failed:', err.message));
    sendConfirmationEmail(lead).catch(err => console.error('[email] Confirmation email failed:', err.message));
    sendLeadSms(lead).catch(err => console.error('[sms] Lead SMS failed:', err.message));

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
