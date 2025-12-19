import { Router } from 'express';
import { login } from '../controllers/authController';
import { getMatches, createMatch, updateMatch, submitResult, getRankings } from '../controllers/matchController';

const router = Router();

// Auth
router.post('/auth/login', login);

// Matches
router.get('/matches', getMatches);
router.post('/matches', createMatch);
router.put('/matches/:id', updateMatch);
router.post('/matches/:id/results', submitResult);
router.get('/matches/rankings', getRankings); // Exposed under /matches for convenience

export default router;
