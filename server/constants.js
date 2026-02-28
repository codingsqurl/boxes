const SERVICE_LABELS = {
  pruning:      'Tree Pruning',
  removal:      'Tree Removal',
  fire:         'Fire Mitigation',
  storm:        'Storm Damage',
  consultation: 'Consultation',
  other:        'Other',
};

const VALID_SERVICES = Object.keys(SERVICE_LABELS);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContact({ firstName, lastName, phone, email, service, city }) {
  const errors = [];
  if (!firstName?.trim()) errors.push('firstName is required');
  if (!lastName?.trim())  errors.push('lastName is required');
  if (!phone?.trim())     errors.push('phone is required');
  if (!email?.trim())     errors.push('email is required');
  if (!service || !VALID_SERVICES.includes(service)) errors.push('valid service is required');
  if (!city?.trim())      errors.push('city is required');
  if (email && !EMAIL_REGEX.test(email)) errors.push('email format is invalid');
  const phoneDigits = (phone || '').replace(/\D/g, '');
  if (phone && phoneDigits.length !== 10) errors.push('phone must be 10 digits');
  return errors;
}

module.exports = { SERVICE_LABELS, VALID_SERVICES, validateContact };
