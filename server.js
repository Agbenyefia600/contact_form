require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static('public')); // serves public/index.html

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/api/contact', async (req, res) => {
  const body = req.body || {};
  const firstName = (body.firstName || '').trim();
  const lastName = (body.lastName || '').trim();
  const email = (body.email || '').trim();
  const queryType = body.queryType;
  const message = (body.message || '').trim();
  const consent = body.consent === true;

  // Server-side validation — never trust the client alone.
  const errors = {};
  if (!firstName) errors.firstName = 'This field is required';
  if (!lastName) errors.lastName = 'This field is required';
  if (!email || !isValidEmail(email)) errors.email = 'Please enter a valid email address';
  if (queryType !== 'general' && queryType !== 'support') errors.queryType = 'Please select a query type';
  if (!message) errors.message = 'This field is required';
  if (!consent) errors.consent = 'To submit this form, please consent to being contacted';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors, error: 'Please fix the highlighted fields.' });
  }

  try {
    await pool.query(
      `INSERT INTO contact_submissions
         (first_name, last_name, email, query_type, message, consent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [firstName, lastName, email, queryType, message, consent]
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Failed to insert contact submission:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
