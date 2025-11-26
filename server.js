import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Crea cartella uploads se non esiste
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Database in memoria
let cards = [];
let idCounter = 1;

// Configurazione
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(uploadsDir));

// Configurazione upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Solo immagini permesse'));
  }
});

// API Routes
app.get('/api/cards', (req, res) => {
  res.json(cards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/cards/:id', (req, res) => {
  const card = cards.find(c => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: 'Scheda non trovata' });
  res.json(card);
});

app.post('/api/cards', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Immagine obbligatoria' });

    const newCard = {
      id: `card_${idCounter++}`,
      title: req.body.title || '',
      description: req.body.description || '',
      tags: req.body.tags || '',
      imageUrl: `/uploads/${req.file.filename}`,
      createdAt: new Date().toISOString()
    };

    cards.push(newCard);
    res.status(201).json(newCard);
  } catch (error) {
    res.status(500).json({ error: 'Errore creazione' });
  }
});

app.put('/api/cards/:id', upload.single('image'), (req, res) => {
  try {
    const index = cards.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Scheda non trovata' });

    const updates = {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags
    };
    if (req.file) updates.imageUrl = `/uploads/${req.file.filename}`;

    cards[index] = { ...cards[index], ...updates };
    res.json(cards[index]);
  } catch (error) {
    res.status(500).json({ error: 'Errore aggiornamento' });
  }
});

app.delete('/api/cards/:id', (req, res) => {
  const index = cards.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Scheda non trovata' });
  cards.splice(index, 1);
  res.json({ success: true });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server attivo su porta ${PORT}`);
});
