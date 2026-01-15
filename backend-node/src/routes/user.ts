import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { User } from '../../../shared/types';

const router = express.Router();

// Get current user (protected route)
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
