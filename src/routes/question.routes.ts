import { Router } from 'express';
import * as questionController from '../controllers/question.controller';
import { authenticate, authorize } from '../middleware/auth';
import { listQuestions } from '../controllers/question.controller';

const router = Router({ mergeParams: true }); // surveyId parametresini almak için

// Tüm route'lar authenticate gerektirir
router.use(authenticate);

// Soru yönetimi (editor ve company_admin rollerine açık)
router.post('/', authorize(['editor', 'company_admin']), questionController.createQuestion);
router.put('/:questionId', authorize(['editor', 'company_admin']), questionController.updateQuestion);
router.delete('/:questionId', authorize(['editor', 'company_admin']), questionController.deleteQuestion);
router.post('/reorder', authorize(['editor', 'company_admin']), questionController.reorderQuestions);

router.get('/', listQuestions);

export default router; 