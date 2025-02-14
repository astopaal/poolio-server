import { Router } from 'express';
import * as superAdminController from '../controllers/super-admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Tüm route'lar authenticate ve super_admin rolü gerektirir
router.use(authenticate);
router.use(authorize(['super_admin']));

// Şirket yönetimi
router.post('/companies', superAdminController.createCompany);
router.get('/companies', superAdminController.listCompanies);
router.get('/companies/:id', superAdminController.getCompanyDetails);
router.put('/companies/:id', superAdminController.updateCompany);
router.delete('/companies/:id', superAdminController.deactivateCompany);

// Company Admin yönetimi
router.post('/company-admins', superAdminController.createCompanyAdmin);

// Sistem istatistikleri ve aktiviteleri
router.get('/stats', superAdminController.getSystemStats);
router.get('/activities', superAdminController.getSystemActivities);

export default router; 