let client = null;

function getClient() {
  if (client) return client;

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('[sms] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — SMS notifications disabled.');
    return null;
  }

  client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
}

async function sendLeadSms(lead) {
  const twilio = getClient();
  if (!twilio) return;

  const { TWILIO_FROM, TWILIO_TO } = process.env;
  if (!TWILIO_FROM || !TWILIO_TO) {
    console.warn('[sms] TWILIO_FROM or TWILIO_TO not set — skipping SMS.');
    return;
  }

  const serviceLabels = {
    pruning: 'Tree Pruning', removal: 'Tree Removal', fire: 'Fire Mitigation',
    storm: 'Storm Damage', consultation: 'Consultation', other: 'Other',
  };

  const body = [
    '🌲 New Tree Hoppers Lead!',
    `Name: ${lead.firstName} ${lead.lastName}`,
    `Phone: ${lead.phone}`,
    `Service: ${serviceLabels[lead.service] || lead.service}`,
    `City: ${lead.city}`,
    lead.message ? `Note: ${lead.message.slice(0, 80)}` : null,
  ].filter(Boolean).join('\n');

  await twilio.messages.create({ body, from: TWILIO_FROM, to: TWILIO_TO });
}

async function sendAppointmentSms(appt) {
  const twilio = getClient();
  if (!twilio) return;

  const { TWILIO_FROM, TWILIO_TO } = process.env;
  if (!TWILIO_FROM || !TWILIO_TO) return;

  const body = [
    '📅 New Estimate Scheduled!',
    `Name: ${appt.firstName} ${appt.lastName}`,
    `Phone: ${appt.phone}`,
    `Service: ${appt.service}`,
    `Date: ${appt.preferredDate} at ${appt.preferredTime}`,
    `City: ${appt.city}`,
  ].join('\n');

  await twilio.messages.create({ body, from: TWILIO_FROM, to: TWILIO_TO });
}

module.exports = { sendLeadSms, sendAppointmentSms };
