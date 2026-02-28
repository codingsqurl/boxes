const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// GET /api/google-reviews
router.get('/', async (req, res, next) => {
  try {
    const { GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID } = process.env;

    // Fall back to internal reviews if not configured
    if (!GOOGLE_PLACES_API_KEY || !GOOGLE_PLACE_ID) {
      const db = getDb();
      const reviews = db.prepare(
        'SELECT id, author, rating, text, date, source FROM reviews ORDER BY id ASC'
      ).all();
      return res.json({ source: 'internal', reviews });
    }

    const db = getDb();

    // Check cache
    const cached = db.prepare(
      'SELECT data, cached_at FROM google_reviews_cache ORDER BY id DESC LIMIT 1'
    ).get();

    if (cached) {
      const age = Date.now() - new Date(cached.cached_at).getTime();
      if (age < CACHE_TTL_MS) {
        return res.json({ source: 'google_cached', reviews: JSON.parse(cached.data) });
      }
    }

    // Fetch from Google Places API
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${GOOGLE_PLACE_ID}&fields=reviews,rating,user_ratings_total&key=${GOOGLE_PLACES_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('[google-reviews] Places API error:', data.status);
      const fallback = db.prepare('SELECT id, author, rating, text, date, source FROM reviews ORDER BY id ASC').all();
      return res.json({ source: 'internal_fallback', reviews: fallback });
    }

    const reviews = (data.result.reviews || []).map(r => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      date: r.relative_time_description,
      source: 'Google',
    }));

    // Store in cache
    db.prepare('DELETE FROM google_reviews_cache').run();
    db.prepare('INSERT INTO google_reviews_cache (data) VALUES (?)').run(JSON.stringify(reviews));

    res.json({ source: 'google_live', reviews });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
