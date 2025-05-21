import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import serverless from 'serverless-http';

dotenv.config();

const { Pool } = pkg;

const app = express();

app.use(
  cors({
    origin: *,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(bodyParser.json());

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Failed to connect to PostgreSQL:', err.message));

app.get('/api/reports', async (req, res) => {
  try {
    const result = await pool.query('SELECT type, latitude, longitude FROM report');
    const formatted = result.rows.map((row) => ({
      category: row.type,
      location: [parseFloat(row.latitude), parseFloat(row.longitude)],
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching reports:', err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/reportsDetails', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM report ORDER BY DATE DESC LIMIT 10');
    const formatted = result.rows.map((row) => ({
      date: row.date,
      time: row.time,
      category: row.type,
      description: row.description,
      location: [parseFloat(row.latitude), parseFloat(row.longitude)],
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching reports:', err.message);
    res.status(500).json({ error: 'Database error2', details: err.message });
  }
});

app.post('/api/submitReport', async (req, res) => {
  const { category, description, location, timestamp } = req.body;

  if (!category || !description || !location || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const [latitude, longitude] = location;

  try {
    const dateObj = new Date(timestamp);
    const date = dateObj.toISOString().split('T')[0];
    const time = dateObj.toTimeString().split(' ')[0];

    const result = await pool.query(
      `INSERT INTO report (type, description, latitude, longitude, date, time)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [category, description, latitude, longitude, date, time]
    );

    res.status(201).json({ message: 'Report saved successfully.', id: result.rows[0].id });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ error: 'Failed to save report.' });
  }
});

// No app.listen on Vercel
export const handler = serverless(app);
