import { Router } from 'express';
import authRoutes from './auth.routes';
import superAdminRoutes from './super-admin.routes';
import companyAdminRoutes from './company-admin.routes';
import surveyRoutes from './survey.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/company-admin', companyAdminRoutes);
router.use('/surveys', surveyRoutes);

export default router; 