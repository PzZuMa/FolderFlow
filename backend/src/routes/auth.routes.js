import express from 'express';
import { register, login, updateProfile, changePassword, updateProfileImage } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', protect, updateProfile);
router.put('/profile-image', protect, updateProfileImage);
router.put('/password', protect, changePassword);

export default router;