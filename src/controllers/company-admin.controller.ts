import { Response } from 'express';
import { getRepository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { Survey } from '../models/Survey';
import { AuthRequest } from '../middleware/auth';

// Şirket Profil İşlemleri
export const getCompanyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ message: 'Şirket bilgisi bulunamadı' });
      return;
    }

    const companyRepository = getRepository(Company);
    const company = await companyRepository.findOne({
      where: { id: req.user.companyId },
      relations: ['users']
    });

    if (!company) {
      res.status(404).json({ message: 'Şirket bulunamadı' });
      return;
    }

    // Kullanıcı detaylarını gizle
    const companyProfile = {
      ...company,
      users: company.users.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }))
    };

    res.json(companyProfile);
  } catch (error) {
    console.error('Get company profile error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const updateCompanyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ message: 'Şirket bilgisi bulunamadı' });
      return;
    }

    const { name, website, phone, address, settings } = req.body;

    const companyRepository = getRepository(Company);
    const company = await companyRepository.findOne({
      where: { id: req.user.companyId }
    });

    if (!company) {
      res.status(404).json({ message: 'Şirket bulunamadı' });
      return;
    }

    // Güncelleme
    company.name = name || company.name;
    company.website = website || company.website;
    company.phone = phone || company.phone;
    company.address = address || company.address;
    company.settings = settings || company.settings;

    await companyRepository.save(company);

    res.json({
      message: 'Şirket profili güncellendi',
      company
    });
  } catch (error) {
    console.error('Update company profile error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Kullanıcı Yönetimi
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ message: 'Şirket bilgisi bulunamadı' });
      return;
    }

    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      res.status(400).json({ message: 'Tüm alanlar gereklidir' });
      return;
    }

    if (!['editor', 'viewer'].includes(role)) {
      res.status(400).json({ message: 'Geçersiz rol' });
      return;
    }

    const userRepository = getRepository(User);
    const companyRepository = getRepository(Company);

    // Email kontrolü
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Bu email zaten kullanımda' });
      return;
    }

    // Şirket kontrolü
    const company = await companyRepository.findOne({
      where: { id: req.user.companyId }
    });

    if (!company) {
      res.status(404).json({ message: 'Şirket bulunamadı' });
      return;
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı oluştur
    const user = userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      company,
      isActive: true
    });

    await userRepository.save(user);

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ message: 'Şirket bilgisi bulunamadı' });
      return;
    }

    const userRepository = getRepository(User);
    const users = await userRepository.find({
      where: { company: { id: req.user.companyId } },
      order: { createdAt: 'DESC' }
    });

    // Hassas bilgileri çıkar
    const safeUsers = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    }));

    res.json(safeUsers);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Şirket İstatistikleri
export const getCompanyStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ message: 'Şirket bilgisi bulunamadı' });
      return;
    }

    const userRepository = getRepository(User);
    const surveyRepository = getRepository(Survey);

    const [
      totalUsers,
      activeUsers,
      totalSurveys,
      activeSurveys
    ] = await Promise.all([
      userRepository.count({ where: { company: { id: req.user.companyId } } }),
      userRepository.count({ where: { company: { id: req.user.companyId }, isActive: true } }),
      surveyRepository.count({ where: { creator: { company: { id: req.user.companyId } } } }),
      surveyRepository.count({ where: { creator: { company: { id: req.user.companyId } }, isPublished: true } })
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      surveys: {
        total: totalSurveys,
        active: activeSurveys,
        draft: totalSurveys - activeSurveys
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
}; 