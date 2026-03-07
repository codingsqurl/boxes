const { sendLeadEmail, sendAppointmentNotification } = require('./email');
const { sendLeadSms, sendAppointmentSms } = require('./sms');
const { getDb } = require('./db');

const MAX_NOTIFY_ATTEMPTS = 3;

// Returns true if the current Mountain Time is between 9:30 AM and 7:00 PM
function isInNotificationWindow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hour   = parseInt(parts.find(p => p.type === 'hour').value);
  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  const total  = hour * 60 + minute;
  return total >= 9 * 60 + 30 && total < 19 * 60;
}

async function notifyPaulForLead(leadId) {
  if (!isInNotificationWindow()) return;
  const db  = getDb();
  const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!row) return;

  db.prepare('UPDATE leads SET notify_attempts = notify_attempts + 1 WHERE id = ?').run(leadId);

  const lead = {
    firstName: row.first_name, lastName: row.last_name,
    phone: row.phone, email: row.email,
    service: row.service, city: row.city, message: row.message,
  };

  const results = await Promise.allSettled([
    sendLeadEmail(lead).catch(e => { console.error('[notify] lead email:', e.message); return null; }),
    sendLeadSms(lead).catch(e => { console.error('[notify] lead sms:', e.message); return null; }),
  ]);

  const anySucceeded = results.some(r => r.status === 'fulfilled' && r.value !== null);
  const attempts = (row.notify_attempts || 0) + 1;

  if (anySucceeded) {
    db.prepare('UPDATE leads SET paul_notified = 1 WHERE id = ?').run(leadId);
  } else if (attempts >= MAX_NOTIFY_ATTEMPTS) {
    console.error(`[notify] Lead #${leadId} — gave up after ${attempts} attempts. Check email/SMS credentials.`);
    db.prepare('UPDATE leads SET paul_notified = 1 WHERE id = ?').run(leadId);
  }
}

async function notifyPaulForAppt(apptId) {
  if (!isInNotificationWindow()) return;
  const db  = getDb();
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(apptId);
  if (!row) return;

  db.prepare('UPDATE appointments SET notify_attempts = notify_attempts + 1 WHERE id = ?').run(apptId);

  const appt = {
    firstName: row.first_name, lastName: row.last_name,
    phone: row.phone, email: row.email,
    service: row.service, city: row.city,
    preferredDate: row.preferred_date, preferredTime: row.preferred_time,
    message: row.message,
  };

  const results = await Promise.allSettled([
    sendAppointmentNotification(appt).catch(e => { console.error('[notify] appt email:', e.message); return null; }),
    sendAppointmentSms(appt).catch(e => { console.error('[notify] appt sms:', e.message); return null; }),
  ]);

  const anySucceeded = results.some(r => r.status === 'fulfilled' && r.value !== null);
  const attempts = (row.notify_attempts || 0) + 1;

  if (anySucceeded) {
    db.prepare('UPDATE appointments SET paul_notified = 1 WHERE id = ?').run(apptId);
  } else if (attempts >= MAX_NOTIFY_ATTEMPTS) {
    console.error(`[notify] Appointment #${apptId} — gave up after ${attempts} attempts. Check email/SMS credentials.`);
    db.prepare('UPDATE appointments SET paul_notified = 1 WHERE id = ?').run(apptId);
  }
}

// Called every minute — sends any held notifications if the window is now open
async function processPendingNotifications() {
  if (!isInNotificationWindow()) return;
  const db    = getDb();
  const leads = db.prepare('SELECT id FROM leads WHERE paul_notified = 0').all();
  const appts = db.prepare('SELECT id FROM appointments WHERE paul_notified = 0').all();
  for (const { id } of leads) await notifyPaulForLead(id);
  for (const { id } of appts) await notifyPaulForAppt(id);
}

module.exports = { notifyPaulForLead, notifyPaulForAppt, processPendingNotifications };
