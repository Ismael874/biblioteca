const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getPool, sql, DB_SERVER, DB_DATABASE } = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

function deleteUploadedFile(relativePath) {
  if (!relativePath) return;
  const fullPath = path.join(__dirname, '..', 'uploads', relativePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

// GET db-status: always 200, never throws — the point is to answer
// "is the database actually reachable right now" even when it isn't,
// so the panel can show that plainly instead of a generic error toast.
router.get('/db-status', verifyToken, verifyAdmin, async (req, res) => {
  const startedAt = Date.now();
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({
      connected: true,
      server: DB_SERVER,
      database: DB_DATABASE,
      latencyMs: Date.now() - startedAt
    });
  } catch (err) {
    res.json({
      connected: false,
      server: DB_SERVER,
      database: DB_DATABASE,
      error: err.message
    });
  }
});

// GET stats: counts + real DB size (admin only)
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pool = await getPool();

    const counts = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Users) AS users,
        (SELECT COUNT(*) FROM Books) AS books,
        (SELECT COUNT(*) FROM Purchases) AS purchases,
        (SELECT COUNT(*) FROM Rentals) AS rentals
    `);

    const size = await pool.request().query(`
      SELECT CAST(SUM(size) * 8.0 / 1024 AS DECIMAL(18,2)) AS sizeMb
      FROM sys.master_files
      WHERE database_id = DB_ID()
    `);

    res.json({
      ...counts.recordset[0],
      dbSizeMb: size.recordset[0].sizeMb
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all users, safe (no password) (admin only)
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, name, email, matricula, role, createdAt FROM Users ORDER BY createdAt DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a user and everything they own (admin only)
router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.params.id;

    const target = await pool.request()
      .input('id', sql.NVarChar, userId)
      .query('SELECT * FROM Users WHERE id = @id');

    if (!target.recordset.length) return res.status(404).json({ message: 'User not found' });
    if (target.recordset[0].role === 'admin') {
      return res.status(400).json({ message: 'No se puede eliminar una cuenta de administrador' });
    }

    // Books aren't FK-linked to Users (ownerId allows NULL for seed/public
    // books), so their cleanup has to happen here explicitly. Their
    // Purchases/Rentals/Chapters cascade automatically once the book row goes.
    const ownedBooks = await pool.request()
      .input('ownerId', sql.NVarChar, userId)
      .query('SELECT id, pdfPath, coverPath FROM Books WHERE ownerId = @ownerId');

    for (const book of ownedBooks.recordset) {
      deleteUploadedFile(book.pdfPath);
      deleteUploadedFile(book.coverPath);
      await pool.request()
        .input('id', sql.NVarChar, book.id)
        .query('DELETE FROM Books WHERE id = @id');
    }

    // Users' own Purchases/Rentals/Subscriptions cascade automatically now.
    await pool.request()
      .input('id', sql.NVarChar, userId)
      .query('DELETE FROM Users WHERE id = @id');

    res.json({ success: true, deletedBooks: ownedBooks.recordset.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
