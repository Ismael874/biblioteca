const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPool, sql } = require('../db');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

router.post('/register', async (req, res) => {
  const { name, email, matricula, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT TOP 1 * FROM Users WHERE email = @email');

    if (existing.recordset.length) return res.status(400).json({ message: 'User exists' });

    const hashed = await bcrypt.hash(password, 10);
    const userId = crypto.randomBytes(12).toString('hex');

    await pool.request()
      .input('id', sql.NVarChar, userId)
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('matricula', sql.NVarChar, matricula || '')
      .input('password', sql.NVarChar, hashed)
      .input('role', sql.NVarChar, 'user')
      .query(`INSERT INTO Users (id, name, email, matricula, password, role, createdAt)
              VALUES (@id, @name, @email, @matricula, @password, @role, GETDATE())`);

    const token = jwt.sign({ id: userId, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, user: { id: userId, name, email, role: 'user' } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT TOP 1 * FROM Users WHERE email = @email');

    const user = result.recordset[0];
    if (!user) return res.status(400).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.user.id)
      .query('SELECT id, name, email, role, createdAt FROM Users WHERE id = @id');

    if (!result.recordset.length) return res.status(404).json({ message: 'User not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
