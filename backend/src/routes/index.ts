import { Router } from 'express';
import { login, updateProfile, searchPlayers, getPhoneNumber } from '../controllers/authController';
import { getMatches, createMatch, updateMatch, deleteMatch, submitResult, getRankings, getMatchParticipants, getReferees, addReferee, removeReferee } from '../controllers/matchController';
import { adminLogin, createAdmin, getAuditLogs, promotePlayerToAdmin } from '../controllers/adminController';
import { submitApplication, getApplications, auditApplication, getUserApplications, cancelApplication, createOrder, simulatePayment, getMyOrders } from '../controllers/applicationController';
import { createGame, getGames, updateGameScore, getGroups, createGroup, updateGroup, deleteGroup } from '../controllers/gameController';
import { authenticateToken, requireAdmin, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Auth
router.post('/auth/login', login);
router.put('/auth/:id/profile', authenticateToken, updateProfile);
router.get('/users/search', authenticateToken, searchPlayers);
router.post('/auth/phone', authenticateToken, getPhoneNumber);

// Matches
router.get('/matches', getMatches);
router.post('/matches/list', getMatches); // New endpoint for POST support
router.post('/matches', authenticateToken, requireAdmin, createMatch);
router.put('/matches/:id', authenticateToken, requireAdmin, updateMatch);
router.delete('/matches/:id', authenticateToken, requireAdmin, deleteMatch); // Changed from requireSuperAdmin to requireAdmin for easier testing
router.post('/matches/:id/results', authenticateToken, requireAdmin, submitResult); // Admin or Referee
router.get('/matches/rankings', getRankings);
router.post('/matches/rankings-list', getRankings); // New endpoint for POST support
router.get('/matches/:id/participants', getMatchParticipants);

// Match Referees (Admin or Super Admin)
router.get('/matches/:id/referees', authenticateToken, requireAdmin, getReferees);
router.post('/matches/:id/referees', authenticateToken, requireAdmin, addReferee);
router.delete('/matches/:id/referees/:playerId', authenticateToken, requireAdmin, removeReferee);

// Games / Draw (Referee or Admin)
// Note: In real app, we should check if user is referee for this specific match.
// For now, allow any admin or referee (we check role in controller or here)
router.post('/matches/:tournamentId/games', authenticateToken, createGame); 
router.get('/matches/:tournamentId/games', getGames);
router.put('/games/:gameId/score', authenticateToken, updateGameScore);

// Groups
router.get('/matches/:tournamentId/groups', getGroups);
router.post('/matches/:tournamentId/groups', authenticateToken, createGroup);
router.put('/groups/:id', authenticateToken, updateGroup);
router.delete('/groups/:id', authenticateToken, deleteGroup);

// Player Application
router.post('/application/submit', authenticateToken, submitApplication);
router.post('/application/:id/cancel', authenticateToken, cancelApplication);
router.get('/application/my', authenticateToken, getUserApplications);

// Payment & Orders
router.post('/orders/create', authenticateToken, createOrder);
router.post('/orders/pay', authenticateToken, simulatePayment);
router.get('/orders/my', authenticateToken, getMyOrders);

// Admin Routes (Protected)
router.get('/admin/applications', authenticateToken, requireAdmin, getApplications);
router.post('/admin/applications/:id/audit', authenticateToken, requireAdmin, auditApplication);
router.get('/admin/audit-logs', authenticateToken, requireAdmin, getAuditLogs);

export default router;
