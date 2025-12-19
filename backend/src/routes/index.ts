import { Router } from 'express';
import { login, updateProfile } from '../controllers/authController';
import { getMatches, createMatch, updateMatch, submitResult, getRankings, getMatchParticipants } from '../controllers/matchController';
import { adminLogin, createAdmin, getAuditLogs, promotePlayerToAdmin } from '../controllers/adminController';
import { submitApplication, getApplications, auditApplication } from '../controllers/applicationController';
import { authenticateToken, requireAdmin, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Auth (WeChat Player)
router.post('/auth/login', login);
router.put('/auth/:id/profile', authenticateToken, updateProfile);

// Admin Auth
router.post('/admin/login', adminLogin);
router.post('/admin/create', authenticateToken, requireSuperAdmin, createAdmin); // Secured by Super Admin
router.post('/admin/promote/:id', authenticateToken, requireAdmin, promotePlayerToAdmin); // Promote player to admin

// Matches
router.get('/matches', getMatches);
router.post('/matches', authenticateToken, requireAdmin, createMatch);
router.put('/matches/:id', authenticateToken, requireAdmin, updateMatch);
router.post('/matches/:id/results', authenticateToken, requireAdmin, submitResult);
router.get('/matches/rankings', getRankings);
router.get('/matches/:id/participants', getMatchParticipants);

// Player Application
router.post('/application/submit', submitApplication);

// Admin Routes (Protected)
router.get('/admin/applications', authenticateToken, requireAdmin, getApplications);
router.post('/admin/applications/:id/audit', authenticateToken, requireAdmin, auditApplication);
router.get('/admin/audit-logs', authenticateToken, requireAdmin, getAuditLogs);

export default router;
