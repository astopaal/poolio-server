import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { Survey } from '../models/Survey';
import { Response as SurveyResponse } from '../models/Response';
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
    const surveyRepository = getRepository(Survey);
    const responseRepository = getRepository(SurveyResponse);

    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      activeUsers,
      totalSurveys,
      totalResponses
    ] = await Promise.all([
      companyRepository.count(),
      companyRepository.count({ where: { isActive: true } }),
      userRepository.count(),
      userRepository.count({ where: { isActive: true } }),
      surveyRepository.count(),
      responseRepository.count()
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
      },
      surveys: {
        total: totalSurveys
      },
      responses: {
        total: totalResponses
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Super Admin için son aktiviteleri getir
export const getSystemActivities = async (_req: Request, res: Response): Promise<void> => {
  try {
    const companyRepository = getRepository(Company);
    const userRepository = getRepository(User);
    const surveyRepository = getRepository(Survey);
    const responseRepository = getRepository(SurveyResponse);

    const activities = [];

    // Son oluşturulan şirketler
    const recentCompanies = await companyRepository.find({
      order: { createdAt: 'DESC' },
      take: 5
    });

    activities.push(...recentCompanies.map(company => ({
      id: `company-${company.id}`,
      type: 'company_created',
      message: `"${company.name}" şirketi oluşturuldu`,
      createdAt: company.createdAt
    })));

    // Son kaydolan kullanıcılar
    const recentUsers = await userRepository.find({
      relations: ['company'],
      order: { createdAt: 'DESC' },
      take: 5
    });

    activities.push(...recentUsers.map(user => ({
      id: `user-${user.id}`,
      type: 'user_created',
      message: `${user.firstName} ${user.lastName} kullanıcısı ${user.company?.name || 'sistem'} bünyesinde oluşturuldu`,
      createdAt: user.createdAt
    })));

    // Son oluşturulan anketler
    const recentSurveys = await surveyRepository.find({
      relations: ['creator', 'creator.company'],
      order: { createdAt: 'DESC' },
      take: 5
    });

    activities.push(...recentSurveys.map(survey => ({
      id: `survey-${survey.id}`,
      type: 'survey_created',
      message: `"${survey.title}" anketi ${survey.creator.company?.name} şirketi tarafından oluşturuldu`,
      createdAt: survey.createdAt
    })));

    // Son gelen yanıtlar
    const recentResponses = await responseRepository.find({
      relations: ['survey', 'survey.creator', 'survey.creator.company'],
      order: { createdAt: 'DESC' },
      take: 5
    });

    activities.push(...recentResponses.map(response => ({
      id: `response-${response.id}`,
      type: 'survey_response',
      message: `"${response.survey.title}" anketine (${response.survey.creator.company?.name}) yeni bir yanıt geldi`,
      createdAt: response.createdAt
    })));

    // Aktiviteleri tarihe göre sırala
    const sortedActivities = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    res.json(sortedActivities);
  } catch (error) {
    console.error('Get system activities error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
}; 