const express = require('express');
const router = express.Router();

const VALID_HEIGHTS      = [200, 350, 600, 1000, 1500];
const VALID_SERVICES     = [0.5, 1, 0.7, 0.6];
const VALID_ACCESSIBILITY = [1, 1.2, 1.5];

router.post('/', (req, res) => {
  const height        = parseFloat(req.body.height);
  const service       = parseFloat(req.body.service);
  const condition     = parseFloat(req.body.condition);
  const accessibility = parseFloat(req.body.accessibility);

  const errors = [];
  if (!VALID_HEIGHTS.includes(height))           errors.push('height must be a valid option');
  if (!VALID_SERVICES.includes(service))          errors.push('service must be a valid option');
  if (isNaN(condition) || condition <= 0)         errors.push('condition must be a positive number');
  if (!VALID_ACCESSIBILITY.includes(accessibility)) errors.push('accessibility must be a valid option');

  if (errors.length > 0) return res.status(400).json({ errors });

  const baseCost = height * service * condition * accessibility;
  const min = Math.round(baseCost * 0.8);
  const max = Math.round(baseCost * 1.2);

  res.json({ min, max });
});

module.exports = router;
