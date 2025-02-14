import { Router } from 'express';
import * as surveyController from '../controllers/survey.controller';
import { authenticate, authorize } from '../middleware/auth';
import questionRoutes from './question.routes';

const router = Router();

// Tüm route'lar authenticate gerektirir
router.use(authenticate);

// Anket yönetimi (editor, company_admin ve super_admin rollerine açık)
router.post('/', authorize(['editor', 'company_admin', 'super_admin']), surveyController.createSurvey);
router.get('/', authorize(['editor', 'company_admin', 'super_admin']), surveyController.listSurveys);
router.get('/:id', authorize(['editor', 'company_admin', 'super_admin']), surveyController.getSurveyDetails);
router.put('/:id', authorize(['editor', 'company_admin', 'super_admin']), surveyController.updateSurvey);
router.delete('/:id', authorize(['editor', 'company_admin', 'super_admin']), surveyController.deleteSurvey);
router.post('/:id/toggle-publish', authorize(['editor', 'company_admin', 'super_admin']), surveyController.toggleSurveyPublish);

// Soru yönetimi route'ları
router.use('/:surveyId/questions', questionRoutes);

export default router; 