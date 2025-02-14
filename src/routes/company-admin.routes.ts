import { Router } from 'express';
import * as companyAdminController from '../controllers/company-admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Tüm route'lar authenticate ve company_admin rolü gerektirir
router.use(authenticate);
router.use(authorize(['company_admin']));

// Şirket profil yönetimi
router.get('/profile', companyAdminController.getCompanyProfile);
router.put('/profile', companyAdminController.updateCompanyProfile);

// Kullanıcı yönetimi
router.post('/users', companyAdminController.createUser);
router.get('/users', companyAdminController.listUsers);

// Şirket istatistikleri
router.get('/stats', companyAdminController.getCompanyStats);

export default router; 