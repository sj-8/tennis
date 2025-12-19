import { Router } from 'express';
import { login } from '../controllers/authController';
import { getMatches, createMatch, updateMatch, submitResult, getRankings } from '../controllers/matchController';
import { adminLogin, createAdmin, getAuditLogs } from '../controllers/adminController';
import { submitApplication, getApplications, auditApplication } from '../controllers/applicationController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Auth (WeChat Player)
router.post('/auth/login', login);

// Admin Auth
router.post('/admin/login', adminLogin);
router.post('/admin/create', createAdmin); // Should be secured

// Matches
router.get('/matches', getMatches);
router.post('/matches', createMatch);
router.put('/matches/:id', updateMatch);
router.post('/matches/:id/results', submitResult);
router.get('/matches/rankings', getRankings);

// Player Application
router.post('/application/submit', submitApplication);

// Admin Routes (Protected)
router.get('/admin/applications', authenticateToken, requireAdmin, getApplications);
router.post('/admin/applications/:id/audit', authenticateToken, requireAdmin, auditApplication);
router.get('/admin/audit-logs', authenticateToken, requireAdmin, getAuditLogs);

export default router;
