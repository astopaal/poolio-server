import { Router } from 'express';
import { submitResponse, getResponses, getResponseStatistics } from '../controllers/response.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Yanıt gönderme (anonim veya kullanıcı)
router.post('/:surveyId', submitResponse);

// Yanıtları listeleme (sadece yetkili kullanıcılar)
router.get('/:surveyId', authenticate, getResponses);

// Yanıt istatistikleri (sadece yetkili kullanıcılar)
router.get('/:surveyId/statistics', authenticate, getResponseStatistics);

export default router; 