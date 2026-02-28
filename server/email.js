const nodemailer = require('nodemailer');
const { SERVICE_LABELS } = require('./constants');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn(
      '[email] GMAIL_USER or GMAIL_APP_PASSWORD not set. ' +
      'Emails disabled — submissions still saved to DB.'
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  return transporter;
}

function getContactInfo() {
  return {
    email: process.env.CONTACT_EMAIL || process.env.GMAIL_USER,
    phone: process.env.CONTACT_PHONE || '(719) 287-8836',
  };
}

// Load a template from DB and replace {{variables}} with actual values
function renderTemplate(key, vars) {
  const { getDb } = require('./db');
  const db = getDb();
  const tpl = db.prepare('SELECT subject, body FROM email_templates WHERE key = ?').get(key);
  if (!tpl) return null;

  const fill = (str) => str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  return { subject: fill(tpl.subject), body: fill(tpl.body) };
}

// ── Internal notification to Paul ────────────────────────────────────────────

async function sendLeadEmail(lead) {
  const transport = getTransporter();
  if (!transport) return;

  const { email: contactEmail } = getContactInfo();

  const text = `
New lead from Tree Hoppers website:

Name:    ${lead.firstName} ${lead.lastName}
Phone:   ${lead.phone}
Email:   ${lead.email}
Service: ${SERVICE_LABELS[lead.service] || lead.service}
City:    ${lead.city}

Message:
${lead.message || '(none)'}

Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}
  `.trim();

  await transport.sendMail({
    from: `"Tree Hoppers Website" <${process.env.GMAIL_USER}>`,
    to: contactEmail,
    replyTo: lead.email,
    subject: `New Lead — ${lead.firstName} ${lead.lastName}`,
    text,
  });
}

async function sendAppointmentNotification(appt) {
  const transport = getTransporter();
  if (!transport) return;

  const { email: contactEmail } = getContactInfo();

  const text = `
New estimate appointment scheduled:

Name:    ${appt.firstName} ${appt.lastName}
Phone:   ${appt.phone}
Email:   ${appt.email}
Service: ${SERVICE_LABELS[appt.service] || appt.service}
City:    ${appt.city}
Date:    ${appt.preferredDate}
Time:    ${appt.preferredTime}

Message:
${appt.message || '(none)'}
  `.trim();

  await transport.sendMail({
    from: `"Tree Hoppers Website" <${process.env.GMAIL_USER}>`,
    to: contactEmail,
    replyTo: appt.email,
    subject: `New Appointment — ${appt.firstName} ${appt.lastName} on ${appt.preferredDate}`,
    text,
  });
}

// ── Customer-facing emails (sent after email verification) ───────────────────

async function sendVerificationEmail(contact, token) {
  const transport = getTransporter();
  if (!transport) return;

  const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const verifyLink = `${siteUrl}/api/verify/${token}`;

  const rendered = renderTemplate('email_verification', {
    firstName:  contact.firstName,
    lastName:   contact.lastName,
    verifyLink,
  });

  if (!rendered) return; // template missing, skip silently

  await transport.sendMail({
    from: `"Tree Hoppers" <${process.env.GMAIL_USER}>`,
    to: contact.email,
    subject: rendered.subject,
    text: rendered.body,
  });
}

async function sendConfirmationEmail(lead) {
  const transport = getTransporter();
  if (!transport) return;

  const { email: contactEmail, phone: contactPhone } = getContactInfo();

  const rendered = renderTemplate('quote_confirmation', {
    firstName:    lead.firstName,
    lastName:     lead.lastName,
    service:      SERVICE_LABELS[lead.service] || lead.service,
    city:         lead.city,
    contactPhone,
    contactEmail,
  });

  if (!rendered) return;

  await transport.sendMail({
    from: `"Tree Hoppers" <${process.env.GMAIL_USER}>`,
    to: lead.email,
    subject: rendered.subject,
    text: rendered.body,
  });
}

async function sendAppointmentConfirmation(appt) {
  const transport = getTransporter();
  if (!transport) return;

  const { email: contactEmail, phone: contactPhone } = getContactInfo();

  const rendered = renderTemplate('appointment_confirmation', {
    firstName:    appt.firstName,
    lastName:     appt.lastName,
    service:      SERVICE_LABELS[appt.service] || appt.service,
    city:         appt.city,
    date:         appt.preferredDate,
    time:         appt.preferredTime,
    contactPhone,
    contactEmail,
  });

  if (!rendered) return;

  await transport.sendMail({
    from: `"Tree Hoppers" <${process.env.GMAIL_USER}>`,
    to: appt.email,
    subject: rendered.subject,
    text: rendered.body,
  });
}

// Legacy alias — kept so any old callers still work
async function sendAppointmentEmail(appt) {
  await sendAppointmentNotification(appt);
  await sendAppointmentConfirmation(appt);
}

module.exports = {
  sendLeadEmail,
  sendAppointmentNotification,
  sendVerificationEmail,
  sendConfirmationEmail,
  sendAppointmentConfirmation,
  sendAppointmentEmail,
};
