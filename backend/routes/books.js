const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getPool, sql } = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Ensure upload directories exist
const uploadPdfs = path.join(__dirname, '..', 'uploads', 'pdfs');
const uploadCovers = path.join(__dirname, '..', 'uploads', 'covers');
[uploadPdfs, uploadCovers].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// The extension used to matter only for readability — but Express derives
// the Content-Type it serves a cover with from this saved extension, so a
// mismatch (e.g. a .jpg that's actually WebP, which browsers happily let you
// save with either extension) meant the browser got told "this is a JPEG"
// for bytes that weren't, and silently failed to render it. Deriving the
// extension from the browser-reported mimetype instead keeps them in sync.
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

function extensionFor(file) {
  return MIME_EXTENSIONS[file.mimetype] || path.extname(file.originalname) || '';
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'pdf') cb(null, uploadPdfs);
    else if (file.fieldname === 'cover') cb(null, uploadCovers);
    else cb(new Error('Unknown field'));
  },
  filename: function (req, file, cb) {
    const name = crypto.randomBytes(12).toString('hex') + extensionFor(file);
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'cover' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('La portada debe ser una imagen'));
    }
    if (file.fieldname === 'pdf' && file.mimetype !== 'application/pdf') {
      return cb(new Error('El archivo debe ser un PDF'));
    }
    cb(null, true);
  }
});

// Content-Type by file extension breaks the moment the extension lies about
// what's actually in the file (see extensionFor above) — sniffing the first
// bytes is what the browser itself effectively does, so this stays correct
// even for covers that were saved with the wrong extension before that fix.
function sniffImageContentType(filePath, fallback) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);

  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (buf.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return fallback;
}

// GET all books (public)
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, title, author, categoria, description, estado, price, isFree, coverPath, ownerId, createdAt
      FROM Books ORDER BY createdAt DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET book by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT * FROM Books WHERE id = @id');
    if (!result.recordset.length) return res.status(404).json({ message: 'Book not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create book (authenticated user)
router.post('/', verifyToken, upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, author, categoria, description, estado, price, isFree } = req.body;
    const pdfFile = req.files?.pdf?.[0];
    const coverFile = req.files?.cover?.[0];

    if (!title || !author || !categoria || !description) {
      if (pdfFile) fs.unlinkSync(pdfFile.path);
      if (coverFile) fs.unlinkSync(coverFile.path);
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const pool = await getPool();
    const bookId = crypto.randomBytes(12).toString('hex');

    await pool.request()
      .input('id', sql.NVarChar, bookId)
      .input('title', sql.NVarChar, title)
      .input('author', sql.NVarChar, author)
      .input('categoria', sql.NVarChar, categoria)
      .input('description', sql.NVarChar, description)
      .input('estado', sql.NVarChar, estado || 'disponible')
      .input('price', sql.Decimal(18,2), price || 0)
      .input('isFree', sql.Bit, isFree === 'true' || isFree === true ? 1 : 0)
      .input('pdfPath', sql.NVarChar, pdfFile ? `pdfs/${pdfFile.filename}` : null)
      .input('coverPath', sql.NVarChar, coverFile ? `covers/${coverFile.filename}` : null)
      .input('ownerId', sql.NVarChar, req.user.id)
      .query(`
        INSERT INTO Books (id, title, author, categoria, description, estado, price, isFree, pdfPath, coverPath, ownerId, createdAt)
        VALUES (@id, @title, @author, @categoria, @description, @estado, @price, @isFree, @pdfPath, @coverPath, @ownerId, GETDATE())
      `);

    res.json({ success: true, bookId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update book (owner or admin)
router.put('/:id', verifyToken, upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const pool = await getPool();
    const bookId = req.params.id;

    const book = await pool.request()
      .input('id', sql.NVarChar, bookId)
      .query('SELECT * FROM Books WHERE id = @id');

    if (!book.recordset.length) return res.status(404).json({ message: 'Book not found' });

    const existingBook = book.recordset[0];
    if (existingBook.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { title, author, categoria, description, estado, price, isFree } = req.body;
    const pdfFile = req.files?.pdf?.[0];
    const coverFile = req.files?.cover?.[0];

    let pdfPath = existingBook.pdfPath;
    let coverPath = existingBook.coverPath;

    if (pdfFile) {
      if (existingBook.pdfPath) {
        const oldPath = path.join(__dirname, '..', 'uploads', existingBook.pdfPath);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      pdfPath = `pdfs/${pdfFile.filename}`;
    }
    if (coverFile) {
      if (existingBook.coverPath) {
        const oldPath = path.join(__dirname, '..', 'uploads', existingBook.coverPath);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      coverPath = `covers/${coverFile.filename}`;
    }

    await pool.request()
      .input('id', sql.NVarChar, bookId)
      .input('title', sql.NVarChar, title || existingBook.title)
      .input('author', sql.NVarChar, author || existingBook.author)
      .input('categoria', sql.NVarChar, categoria || existingBook.categoria)
      .input('description', sql.NVarChar, description || existingBook.description)
      .input('estado', sql.NVarChar, estado || existingBook.estado)
      .input('price', sql.Decimal(18,2), price ?? existingBook.price)
      .input('isFree', sql.Bit, isFree !== undefined ? (isFree === 'true' || isFree === true ? 1 : 0) : existingBook.isFree)
      .input('pdfPath', sql.NVarChar, pdfPath)
      .input('coverPath', sql.NVarChar, coverPath)
      .query(`
        UPDATE Books
        SET title = @title, author = @author, categoria = @categoria, description = @description,
            estado = @estado, price = @price, isFree = @isFree, pdfPath = @pdfPath, coverPath = @coverPath
        WHERE id = @id
      `);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE book (owner or admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const pool = await getPool();
    const bookId = req.params.id;

    const book = await pool.request()
      .input('id', sql.NVarChar, bookId)
      .query('SELECT * FROM Books WHERE id = @id');

    if (!book.recordset.length) return res.status(404).json({ message: 'Book not found' });

    const existingBook = book.recordset[0];
    if (existingBook.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (existingBook.pdfPath) {
      const pdfPath = path.join(__dirname, '..', 'uploads', existingBook.pdfPath);
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }
    if (existingBook.coverPath) {
      const coverPath = path.join(__dirname, '..', 'uploads', existingBook.coverPath);
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    }

    await pool.request()
      .input('id', sql.NVarChar, bookId)
      .query('DELETE FROM Books WHERE id = @id');

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET download/view PDF
router.get('/:id/pdf', verifyToken, async (req, res) => {
  try {
    const pool = await getPool();
    const bookId = req.params.id;

    const book = await pool.request()
      .input('id', sql.NVarChar, bookId)
      .query('SELECT * FROM Books WHERE id = @id');

    if (!book.recordset.length) return res.status(404).json({ message: 'Book not found' });

    const bookData = book.recordset[0];
    const canAccess = bookData.ownerId === req.user.id || req.user.role === 'admin' || bookData.isFree === 1;

    if (!canAccess) {
      const purchase = await pool.request()
        .input('bookId', sql.NVarChar, bookId)
        .input('buyerId', sql.NVarChar, req.user.id)
        .query('SELECT TOP 1 * FROM Purchases WHERE bookId = @bookId AND buyerId = @buyerId');

      if (!purchase.recordset.length) {
        const rental = await pool.request()
          .input('bookId', sql.NVarChar, bookId)
          .input('renterId', sql.NVarChar, req.user.id)
          .query('SELECT TOP 1 * FROM Rentals WHERE bookId = @bookId AND renterId = @renterId AND endAt > GETDATE()');

        if (!rental.recordset.length) {
          return res.status(403).json({ message: 'You do not have access to this book' });
        }
      }
    }

    if (!bookData.pdfPath) return res.status(404).json({ message: 'No PDF available' });

    const pdfPath = path.join(__dirname, '..', 'uploads', bookData.pdfPath);
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ message: 'PDF file not found' });

    res.download(pdfPath, `${bookData.title}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET book cover image
router.get('/:id/cover', async (req, res) => {
  try {
    const pool = await getPool();
    const bookId = req.params.id;

    const book = await pool.request()
      .input('id', sql.NVarChar, bookId)
      .query('SELECT coverPath FROM Books WHERE id = @id');

    if (!book.recordset.length || !book.recordset[0].coverPath) {
      // Return default cover if none exists
      return res.json({ message: 'No cover available', default: true });
    }

    const coverPath = path.join(__dirname, '..', 'uploads', book.recordset[0].coverPath);
    if (!fs.existsSync(coverPath)) {
      return res.json({ message: 'Cover file not found', default: true });
    }

    res.type(sniffImageContentType(coverPath, 'application/octet-stream'));
    res.sendFile(coverPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
