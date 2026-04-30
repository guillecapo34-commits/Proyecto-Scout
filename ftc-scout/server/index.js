import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import teamsRouter from './routes/teams.js';
import { initDB } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
});
await initDB();
app.use('/api', limiter);
app.use(express.json());

app.use(express.static(join(__dirname, '../client')));

app.use('/api/teams', teamsRouter);

app.get('/simulator', (req, res) => {
  res.sendFile(join(__dirname, '../client/simulator.html'));
});
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`FTC Scout running at http://localhost:${PORT}`);
});