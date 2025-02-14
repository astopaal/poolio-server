import { Response } from 'express';
import { getRepository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { Survey } from '../models/Survey';
import { Response as SurveyResponse } from '../models/Response';
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
    const responseRepository = getRepository(SurveyResponse);

    const [
      totalUsers,
      activeUsers,
      totalSurveys,
      activeSurveys,
      totalResponses,
      completedResponses
    ] = await Promise.all([
      userRepository.count({ where: { company: { id: req.user.companyId } } }),
      userRepository.count({ where: { company: { id: req.user.companyId }, isActive: true } }),
      surveyRepository.createQueryBuilder('survey')
        .leftJoin('survey.creator', 'creator')
        .where('creator.companyId = :companyId', { companyId: req.user.companyId })
        .getCount(),
      surveyRepository.createQueryBuilder('survey')
        .leftJoin('survey.creator', 'creator')
        .where('creator.companyId = :companyId', { companyId: req.user.companyId })
        .andWhere('survey.status = :status', { status: 'active' })
        .getCount(),
      responseRepository.createQueryBuilder('response')
        .leftJoin('response.survey', 'survey')
        .leftJoin('survey.creator', 'creator')
        .where('creator.companyId = :companyId', { companyId: req.user.companyId })
        .getCount(),
      responseRepository.createQueryBuilder('response')
        .leftJoin('response.survey', 'survey')
        .leftJoin('survey.creator', 'creator')
        .where('creator.companyId = :companyId', { companyId: req.user.companyId })
        .andWhere('response.isCompleted = :isCompleted', { isCompleted: true })
        .getCount()
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
      },
      responses: {
        total: totalResponses,
        completed: completedResponses,
        completionRate: totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0
      }
    };

    console.log('Company Stats:', {
      companyId: req.user.companyId,
      stats,
      query: {
        totalSurveys,
        activeSurveys
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Şirket Aktiviteleri
export const getCompanyActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ message: 'Şirket bilgisi bulunamadı' });
      return;
    }

    const activities = [];

    // Son oluşturulan anketler
    const surveyRepository = getRepository(Survey);
    const recentSurveys = await surveyRepository.find({
      where: { creator: { company: { id: req.user.companyId } } },
      relations: ['creator'],
      order: { createdAt: 'DESC' },
      take: 5
    });

    activities.push(...recentSurveys.map(survey => ({
      id: `survey-${survey.id}`,
      type: 'survey_created',
      message: `"${survey.title}" anketi ${survey.creator.firstName} ${survey.creator.lastName} tarafından oluşturuldu`,
      createdAt: survey.createdAt
    })));

    // Son gelen yanıtlar
    const responseRepository = getRepository(SurveyResponse);
    const recentResponses = await responseRepository
      .createQueryBuilder('response')
      .leftJoinAndSelect('response.survey', 'survey')
      .leftJoinAndSelect('survey.creator', 'creator')
      .where('creator.companyId = :companyId', { companyId: req.user.companyId })
      .orderBy('response.createdAt', 'DESC')
      .take(5)
      .getMany();

    activities.push(...recentResponses.map(response => ({
      id: `response-${response.id}`,
      type: 'survey_response',
      message: `"${response.survey.title}" anketine yeni bir yanıt geldi`,
      createdAt: response.createdAt
    })));

    // Son eklenen kullanıcılar
    const userRepository = getRepository(User);
    const recentUsers = await userRepository.find({
      where: { company: { id: req.user.companyId } },
      order: { createdAt: 'DESC' },
      take: 5
    });

    activities.push(...recentUsers.map(user => ({
      id: `user-${user.id}`,
      type: 'user_created',
      message: `${user.firstName} ${user.lastName} kullanıcısı eklendi`,
      createdAt: user.createdAt
    })));

    // Aktiviteleri tarihe göre sırala
    const sortedActivities = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    res.json(sortedActivities);
  } catch (error) {
    console.error('Get company activities error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
}; 