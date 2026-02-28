const nodemailer = require('nodemailer');

let transporter = null;

const SERVICE_LABELS = {
  pruning: 'Tree Pruning', removal: 'Tree Removal', fire: 'Fire Mitigation',
  storm: 'Storm Damage', consultation: 'Consultation', other: 'Other',
};

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

async function sendLeadEmail(lead) {
  const transport = getTransporter();
  if (!transport) return;

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
    to: 'treehopperscos@gmail.com',
    replyTo: lead.email,
    subject: `New Lead — ${lead.firstName} ${lead.lastName}`,
    text,
  });
}

async function sendConfirmationEmail(lead) {
  const transport = getTransporter();
  if (!transport) return;

  const text = `
Hi ${lead.firstName},

Thanks for reaching out to Tree Hoppers! We've received your request and will be in touch within 24 hours.

Here's what you submitted:
  Service: ${SERVICE_LABELS[lead.service] || lead.service}
  City:    ${lead.city}

If you need to reach us sooner:
  Call/Text: (719) 287-8836
  Email:     treehopperscos@gmail.com

Talk soon,
Paul & the Tree Hoppers crew
  `.trim();

  await transport.sendMail({
    from: `"Tree Hoppers" <${process.env.GMAIL_USER}>`,
    to: lead.email,
    subject: `We got your request — Tree Hoppers`,
    text,
  });
}

async function sendAppointmentEmail(appt) {
  const transport = getTransporter();
  if (!transport) return;

  // Notify Paul
  const internalText = `
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
    to: 'treehopperscos@gmail.com',
    replyTo: appt.email,
    subject: `New Appointment — ${appt.firstName} ${appt.lastName} on ${appt.preferredDate}`,
    text: internalText,
  });

  // Confirm to customer
  const confirmText = `
Hi ${appt.firstName},

Your estimate appointment with Tree Hoppers has been scheduled!

  Service: ${SERVICE_LABELS[appt.service] || appt.service}
  Date:    ${appt.preferredDate}
  Time:    ${appt.preferredTime}
  City:    ${appt.city}

We'll call you the day before to confirm. If you need to reschedule:
  Call/Text: (719) 287-8836
  Email:     treehopperscos@gmail.com

See you soon,
Paul & the Tree Hoppers crew
  `.trim();

  await transport.sendMail({
    from: `"Tree Hoppers" <${process.env.GMAIL_USER}>`,
    to: appt.email,
    subject: `Appointment Confirmed — Tree Hoppers`,
    text: confirmText,
  });
}

module.exports = { sendLeadEmail, sendConfirmationEmail, sendAppointmentEmail };
