const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getPool, sql } = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// POST create rental
router.post('/', verifyToken, async (req, res) => {
  try {
    const { bookId, daysToRent } = req.body;
    if (!bookId || !daysToRent) return res.status(400).json({ message: 'Missing fields' });

    const pool = await getPool();

    // Check if book exists
    const book = await pool.request()
      .input('id', sql.NVarChar, bookId)
      .query('SELECT * FROM Books WHERE id = @id');

    if (!book.recordset.length) return res.status(404).json({ message: 'Book not found' });

    // Check if already renting
    const existing = await pool.request()
      .input('bookId', sql.NVarChar, bookId)
      .input('renterId', sql.NVarChar, req.user.id)
      .query(`
        SELECT TOP 1 * FROM Rentals 
        WHERE bookId = @bookId AND renterId = @renterId AND endAt > GETDATE()
      `);

    if (existing.recordset.length) return res.status(400).json({ message: 'Already renting this book' });

    // Create rental record
    const rentalId = crypto.randomBytes(12).toString('hex');
    const endDate = new Date(Date.now() + daysToRent * 24 * 60 * 60 * 1000);

    await pool.request()
      .input('id', sql.NVarChar, rentalId)
      .input('bookId', sql.NVarChar, bookId)
      .input('renterId', sql.NVarChar, req.user.id)
      .input('endAt', sql.DateTime, endDate)
      .query(`
        INSERT INTO Rentals (id, bookId, renterId, startAt, endAt)
        VALUES (@id, @bookId, @renterId, GETDATE(), @endAt)
      `);

    res.json({ success: true, rentalId, expiresAt: endDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user rentals
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Users can only see their own rentals unless admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('renterId', sql.NVarChar, userId)
      .query(`
        SELECT r.id, r.bookId, r.startAt, r.endAt, b.title, b.author,
               CASE WHEN r.endAt > GETDATE() THEN 'active' ELSE 'expired' END as status
        FROM Rentals r
        JOIN Books b ON r.bookId = b.id
        WHERE r.renterId = @renterId
        ORDER BY r.startAt DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all rentals (admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT r.id, r.bookId, r.renterId, r.startAt, r.endAt, b.title, u.name,
             CASE WHEN r.endAt > GETDATE() THEN 'active' ELSE 'expired' END as status
      FROM Rentals r
      JOIN Books b ON r.bookId = b.id
      JOIN Users u ON r.renterId = u.id
      ORDER BY r.startAt DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
