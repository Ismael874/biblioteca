const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

dotenv.config();

const { getPool, sql } = require('./db');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@biblion.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

async function ensureAdminSeed() {
  const pool = await getPool();
  const existing = await pool.request().query("SELECT TOP 1 id FROM Users WHERE role = 'admin'");
  if (existing.recordset.length) return;

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const adminId = crypto.randomBytes(12).toString('hex');
  await pool.request()
    .input('id', sql.NVarChar, adminId)
    .input('name', sql.NVarChar, 'Administrador')
    .input('email', sql.NVarChar, ADMIN_EMAIL)
    .input('matricula', sql.NVarChar, 'ADMIN')
    .input('password', sql.NVarChar, hashed)
    .input('role', sql.NVarChar, 'admin')
    .query(`INSERT INTO Users (id, name, email, matricula, password, role, createdAt)
            VALUES (@id, @name, @email, @matricula, @password, @role, GETDATE())`);

  console.log(`Cuenta admin creada: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (cámbiala luego)`);
}

// On a cold start, LocalDB can take a moment to auto-start on the very first
// connection attempt. ensureAdminSeed() only ever runs once at boot, so if
// that one attempt lost the race it used to mean no admin account, silently,
// until someone noticed admin@biblion.local didn't work and asked why.
async function ensureAdminSeedWithRetry(retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await ensureAdminSeed();
      return;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      console.error(
        `No se pudo preparar la cuenta admin (intento ${attempt}/${retries}): ${err.message}` +
        (isLastAttempt ? '' : ` — reintentando en ${delayMs / 1000}s...`)
      );
      if (!isLastAttempt) await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(morgan('dev'));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const purchasesRoutes = require('./routes/purchases');
const rentalsRoutes = require('./routes/rentals');

app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/rentals', rentalsRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await ensureAdminSeedWithRetry();
});
