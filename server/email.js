const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn(
      '[email] GMAIL_USER or GMAIL_APP_PASSWORD not set. ' +
      'Contact form submissions will be saved to DB but NOT emailed.'
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

async function sendLeadEmail(lead) {
  const transport = getTransporter();
  if (!transport) return;

  const subject = `New Contact Form Lead — ${lead.firstName} ${lead.lastName}`;
  const text = `
New lead from Tree Hoppers website:

Name:    ${lead.firstName} ${lead.lastName}
Phone:   ${lead.phone}
Email:   ${lead.email}
Service: ${lead.service}
City:    ${lead.city}

Message:
${lead.message || '(none)'}

Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}
  `.trim();

  await transport.sendMail({
    from: `"Tree Hoppers Website" <${process.env.GMAIL_USER}>`,
    to: 'treehopperscos@gmail.com',
    replyTo: lead.email,
    subject,
    text,
  });
}

module.exports = { sendLeadEmail };
