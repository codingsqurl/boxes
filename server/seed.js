const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');

async function seedReviews() {
  const db = getDb();

  const meta = db.prepare("SELECT value FROM seed_meta WHERE key = 'reviews_seeded'").get();
  if (meta) {
    console.log('Reviews already seeded — skipping');
    return;
  }

  const jsonPath = path.join(__dirname, '..', 'reviews.json');
  if (!fs.existsSync(jsonPath)) {
    console.warn('reviews.json not found — skipping seed');
    return;
  }

  const reviews = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const insert = db.prepare(`
    INSERT INTO reviews (author, rating, text, date, source, seeded)
    VALUES (@author, @rating, @text, @date, @source, 1)
  `);

  const insertMany = db.transaction((items) => {
    for (const r of items) insert.run(r);
  });

  insertMany(reviews);

  db.prepare("INSERT INTO seed_meta (key, value) VALUES ('reviews_seeded', 'true')").run();
  console.log(`Seeded ${reviews.length} reviews from reviews.json`);
}

module.exports = { seedReviews };
