const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getPool, sql } = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// POST create purchase
router.post('/', verifyToken, async (req, res) => {
  try {
    const { bookId } = req.body;
    if (!bookId) return res.status(400).json({ message: 'Missing bookId' });

    const pool = await getPool();

    // Check if book exists
    const book = await pool.request()
      .input('id', sql.NVarChar, bookId)
      .query('SELECT * FROM Books WHERE id = @id');

    if (!book.recordset.length) return res.status(404).json({ message: 'Book not found' });

    const bookData = book.recordset[0];
    if (bookData.isFree) return res.status(400).json({ message: 'Cannot purchase a free book' });

    // Check if already purchased
    const existing = await pool.request()
      .input('bookId', sql.NVarChar, bookId)
      .input('buyerId', sql.NVarChar, req.user.id)
      .query('SELECT TOP 1 * FROM Purchases WHERE bookId = @bookId AND buyerId = @buyerId');

    if (existing.recordset.length) return res.status(400).json({ message: 'Already purchased' });

    // Create purchase record
    const purchaseId = crypto.randomBytes(12).toString('hex');
    await pool.request()
      .input('id', sql.NVarChar, purchaseId)
      .input('bookId', sql.NVarChar, bookId)
      .input('buyerId', sql.NVarChar, req.user.id)
      .input('amount', sql.Decimal(18,2), bookData.price)
      .query(`
        INSERT INTO Purchases (id, bookId, buyerId, amount, purchasedAt)
        VALUES (@id, @bookId, @buyerId, @amount, GETDATE())
      `);

    res.json({ success: true, purchaseId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user purchases
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Users can only see their own purchases unless admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('buyerId', sql.NVarChar, userId)
      .query(`
        SELECT p.id, p.bookId, p.amount, p.purchasedAt, b.title, b.author
        FROM Purchases p
        JOIN Books b ON p.bookId = b.id
        WHERE p.buyerId = @buyerId
        ORDER BY p.purchasedAt DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all purchases (admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.id, p.bookId, p.buyerId, p.amount, p.purchasedAt, b.title, u.name
      FROM Purchases p
      JOIN Books b ON p.bookId = b.id
      JOIN Users u ON p.buyerId = u.id
      ORDER BY p.purchasedAt DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
