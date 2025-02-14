import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

// Şirket İşlemleri
export const createCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, slug, settings } = req.body;

    if (!name || !slug) {
      res.status(400).json({ message: 'Şirket adı ve slug gereklidir' });
      return;
    }

    const companyRepository = getRepository(Company);

    // Slug kontrolü
    const existingCompany = await companyRepository.findOne({ where: { slug } });
    if (existingCompany) {
      res.status(400).json({ message: 'Bu slug zaten kullanımda' });
      return;
    }

    const company = companyRepository.create({
      name,
      slug,
      settings,
      isActive: true
    });

    await companyRepository.save(company);

    res.status(201).json({
      message: 'Şirket başarıyla oluşturuldu',
      company
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const listCompanies = async (_req: Request, res: Response): Promise<void> => {
  try {
    const companyRepository = getRepository(Company);
    const companies = await companyRepository.find({
      relations: ['users'],
      order: { createdAt: 'DESC' }
    });

    // Kullanıcı sayısı ve diğer özet bilgileri ekle
    const companiesWithStats = companies.map(company => ({
      ...company,
      userCount: company.users.length,
      users: undefined // Kullanıcı detaylarını gizle
    }));

    res.json(companiesWithStats);
  } catch (error) {
    console.error('List companies error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const getCompanyDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyRepository = getRepository(Company);
    
    const company = await companyRepository.findOne({
      where: { id },
      relations: ['users']
    });

    if (!company) {
      res.status(404).json({ message: 'Şirket bulunamadı' });
      return;
    }

    res.json(company);
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, settings } = req.body;

    const companyRepository = getRepository(Company);
    const company = await companyRepository.findOne({ where: { id } });

    if (!company) {
      res.status(404).json({ message: 'Şirket bulunamadı' });
      return;
    }

    // Güncelleme
    company.name = name || company.name;
    company.settings = settings || company.settings;

    await companyRepository.save(company);

    res.json({
      message: 'Şirket başarıyla güncellendi',
      company
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const deactivateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyRepository = getRepository(Company);
    const userRepository = getRepository(User);

    const company = await companyRepository.findOne({ where: { id } });

    if (!company) {
      res.status(404).json({ message: 'Şirket bulunamadı' });
      return;
    }

    // Şirketi pasife al
    company.isActive = false;
    await companyRepository.save(company);

    // Şirket kullanıcılarını pasife al
    await userRepository.update(
      { company: { id } },
      { isActive: false }
    );

    res.json({ message: 'Şirket ve kullanıcıları pasife alındı' });
  } catch (error) {
    console.error('Deactivate company error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Company Admin İşlemleri
export const createCompanyAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, companyId } = req.body;

    if (!firstName || !lastName || !email || !password || !companyId) {
      res.status(400).json({ message: 'Tüm alanlar gereklidir' });
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
    const company = await companyRepository.findOne({ where: { id: companyId } });
    if (!company) {
      res.status(400).json({ message: 'Geçersiz şirket' });
      return;
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Company admin oluştur
    const user = userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'company_admin',
      company,
      isActive: true
    });

    await userRepository.save(user);

    res.status(201).json({
      message: 'Company admin başarıyla oluşturuldu',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.company.id
      }
    });
  } catch (error) {
    console.error('Create company admin error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Sistem İstatistikleri
export const getSystemStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const companyRepository = getRepository(Company);
    const userRepository = getRepository(User);

    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      activeUsers
    ] = await Promise.all([
      companyRepository.count(),
      companyRepository.count({ where: { isActive: true } }),
      userRepository.count(),
      userRepository.count({ where: { isActive: true } })
    ]);

    const stats = {
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        inactive: totalCompanies - activeCompanies
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
}; 