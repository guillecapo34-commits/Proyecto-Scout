import { Router } from 'express';
import NodeCache from 'node-cache';
import { fetchTeamInfo, fetchTeamStats } from '../services/ftcscout.js';
import fetch from 'node-fetch';

const router = Router();
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 300 });
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

function validateTeamNumber(req, res, next) {
  const num = parseInt(req.params.number, 10);
  if (isNaN(num) || num <= 0 || String(num) !== req.params.number) {
    return res.status(400).json({ error: 'Invalid team number.' });
  }
  req.teamNumber = num;
  next();
}

router.get('/', async (req, res) => {
  const search = req.query.search ?? '';
  const limit = parseInt(req.query.limit, 10) || 50;
  const cacheKey = `search:${search}:${limit}`;

  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { searchTeams } = await import('../services/ftcscout.js');
    const teams = await searchTeams(search, limit);
    cache.set(cacheKey, teams);
    res.json(teams);
  } catch (err) {
    console.error('[teams/]', err.message);
    res.status(502).json({ error: 'Failed to fetch teams.' });
  }
});
router.get('/featured-match', async (req, res) => {
  try {
    const { fetchFeaturedMatch } = await import('../services/ftcscout.js');
    const featured = await fetchFeaturedMatch();
    if (!featured) return res.status(404).json({ error: 'No featured match found.' });
    res.json(featured);
  } catch (err) {
    console.error('[featured-match]', err.message);
    res.status(502).json({ error: 'Failed to fetch featured match.' });
  }
});
router.get('/:number', validateTeamNumber, async (req, res) => {
  const { teamNumber } = req;
  const cacheKey = `team:${teamNumber}`;

  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const team = await fetchTeamInfo(teamNumber);
    if (!team) return res.status(404).json({ error: 'Team not found.' });

    cache.set(cacheKey, team);
    res.json(team);
  } catch (err) {
    console.error('[teams/:number]', err.message);
    res.status(502).json({ error: 'Failed to fetch team data.' });
  }
});

router.get('/:number/stats', validateTeamNumber, async (req, res) => {
  const { teamNumber } = req;
  const season = parseInt(req.query.season, 10) || 2025;
  const cacheKey = `stats:${teamNumber}:${season}`;

  const cached = cache.get(cacheKey);
  if (cached !== undefined) return res.json(cached);

  try {
    const stats = await fetchTeamStats(teamNumber, season);
    cache.set(cacheKey, stats);
    res.json(stats);
  } catch (err) {
    console.error('[teams/:number/stats]', err.message);
    res.status(502).json({ error: 'Failed to fetch team stats.' });
  }
});
router.get('/:number/matches', validateTeamNumber, async (req, res) => {
  const { teamNumber } = req;
  const season = parseInt(req.query.season, 10) || 2025;
  const cacheKey = `matches:${teamNumber}:${season}`;

  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { fetchTeamMatches } = await import('../services/ftcscout.js');
    const matches = await fetchTeamMatches(teamNumber, season);
    cache.set(cacheKey, matches);
    res.json(matches);
  } catch (err) {
    console.error('[teams/:number/matches]', err.message);
    res.status(502).json({ error: 'Failed to fetch matches.' });
  }
});
router.get('/:number/alliance-stats', validateTeamNumber, async (req, res) => {
  const { teamNumber } = req;
  const season = parseInt(req.query.season, 10) || 2025;
  const cacheKey = `alliance-stats:${teamNumber}:${season}`;

  const cached = cache.get(cacheKey);
  if (cached !== undefined) return res.json(cached);

  try {
    const { fetchTeamInfo, fetchTeamStats } = await import('../services/ftcscout.js');
    const [info, stats] = await Promise.all([
      fetchTeamInfo(teamNumber),
      fetchTeamStats(teamNumber, season)
    ]);
    const result = { info, stats };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('[teams/:number/alliance-stats]', err.message);
    res.status(502).json({ error: 'Failed to fetch alliance team data.' });
  }
});
router.post('/predict', async (req, res) => {
  try {
    const response = await fetch(`${ML_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(502).json({ error: err.error || 'Prediction failed' });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('[predict]', err.message);
    res.status(502).json({ error: 'ML service unavailable' });
  }
});
export default router;