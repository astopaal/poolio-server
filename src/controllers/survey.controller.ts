import { Response } from 'express';
import { getRepository } from 'typeorm';
import { Survey } from '../models/Survey';
import { Question } from '../models/Question';
import { AuthRequest } from '../middleware/auth';
import { Response as ResponseModel } from '../models/Response';

// Anket Oluşturma
export const createSurvey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const { title, description, settings } = req.body;

    if (!title) {
      res.status(400).json({ message: 'Anket başlığı gereklidir' });
      return;
    }

    const surveyRepository = getRepository(Survey);

    const survey = surveyRepository.create({
      title,
      description,
      creator: { id: req.user.userId },
      status: 'draft',
      isPublished: false,
      ...settings
    });

    await surveyRepository.save(survey);

    res.status(201).json({
      message: 'Anket başarıyla oluşturuldu',
      survey
    });
  } catch (error) {
    console.error('Create survey error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Anket Listeleme
export const listSurveys = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const surveyRepository = getRepository(Survey);
    
    const surveys = await surveyRepository.find({
      where: { creator: { id: req.user.userId } },
      relations: ['questions'],
      order: { createdAt: 'DESC' }
    });

    // Her anket için soru sayısını ekle
    const surveysWithStats = surveys.map(survey => ({
      ...survey,
      questionCount: survey.questions.length,
      questions: undefined // Soru detaylarını gizle
    }));

    res.json(surveysWithStats);
  } catch (error) {
    console.error('List surveys error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Anket Detayı
export const getSurveyDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const { id } = req.params;
    const surveyRepository = getRepository(Survey);

    const survey = await surveyRepository.findOne({
      where: { id, creator: { id: req.user.userId } },
      relations: ['questions', 'questions.options']
    });

    if (!survey) {
      res.status(404).json({ message: 'Anket bulunamadı' });
      return;
    }

    res.json(survey);
  } catch (error) {
    console.error('Get survey details error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Anket Güncelleme
export const updateSurvey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const { id } = req.params;
    const { title, description, settings } = req.body;

    const surveyRepository = getRepository(Survey);
    const survey = await surveyRepository.findOne({
      where: { id, creator: { id: req.user.userId } }
    });

    if (!survey) {
      res.status(404).json({ message: 'Anket bulunamadı' });
      return;
    }

    if (survey.isPublished) {
      res.status(400).json({ message: 'Yayınlanmış anket düzenlenemez' });
      return;
    }

    // Güncelleme
    survey.title = title || survey.title;
    survey.description = description || survey.description;
    if (settings) {
      survey.isPasswordProtected = settings.isPasswordProtected ?? survey.isPasswordProtected;
      survey.password = settings.password || survey.password;
      survey.allowAnonymous = settings.allowAnonymous ?? survey.allowAnonymous;
      survey.startDate = settings.startDate || survey.startDate;
      survey.endDate = settings.endDate || survey.endDate;
    }

    await surveyRepository.save(survey);

    res.json({
      message: 'Anket başarıyla güncellendi',
      survey
    });
  } catch (error) {
    console.error('Update survey error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Anket Yayınlama/Yayından Kaldırma
export const toggleSurveyPublish = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const { id } = req.params;
    const surveyRepository = getRepository(Survey);
    const questionRepository = getRepository(Question);

    const survey = await surveyRepository.findOne({
      where: { id, creator: { id: req.user.userId } },
      relations: ['questions']
    });

    if (!survey) {
      res.status(404).json({ message: 'Anket bulunamadı' });
      return;
    }

    // Yayından kaldırma
    if (survey.isPublished) {
      survey.isPublished = false;
      survey.status = 'draft';
      await surveyRepository.save(survey);
      
      res.json({
        message: 'Anket yayından kaldırıldı',
        survey
      });
      return;
    }

    // Yayınlama öncesi kontroller
    const questions = await questionRepository.count({ where: { survey: { id } } });
    if (questions === 0) {
      res.status(400).json({ message: 'Ankette en az bir soru olmalıdır' });
      return;
    }

    // Yayınlama
    survey.isPublished = true;
    survey.status = 'active';
    await surveyRepository.save(survey);

    res.json({
      message: 'Anket yayınlandı',
      survey
    });
  } catch (error) {
    console.error('Toggle survey publish error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Anket Silme
export const deleteSurvey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const { id } = req.params;
    const surveyRepository = getRepository(Survey);

    const survey = await surveyRepository.findOne({
      where: { id, creator: { id: req.user.userId } }
    });

    if (!survey) {
      res.status(404).json({ message: 'Anket bulunamadı' });
      return;
    }

    if (survey.isPublished) {
      res.status(400).json({ message: 'Yayınlanmış anket silinemez' });
      return;
    }

    await surveyRepository.remove(survey);

    res.json({ message: 'Anket başarıyla silindi' });
  } catch (error) {
    console.error('Delete survey error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Son aktiviteleri getir
export const getRecentActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const surveyRepository = getRepository(Survey);
    const responseRepository = getRepository(ResponseModel);

    // Son 10 aktiviteyi getir
    const activities = [];

    // Son oluşturulan anketler
    const recentSurveys = await surveyRepository.find({
      where: {
        creator: { id: req.user.userId }
      },
      order: {
        createdAt: 'DESC'
      },
      take: 5,
      relations: ['creator']
    });

    activities.push(...recentSurveys.map(survey => ({
      id: `survey-${survey.id}`,
      type: 'survey_created',
      message: `"${survey.title}" anketi oluşturuldu`,
      createdAt: survey.createdAt
    })));

    // Son yanıtlar
    const recentResponses = await responseRepository
      .createQueryBuilder('response')
      .leftJoinAndSelect('response.survey', 'survey')
      .where('survey.creator.id = :userId', { userId: req.user.userId })
      .orderBy('response.createdAt', 'DESC')
      .take(5)
      .getMany();

    activities.push(...recentResponses.map(response => ({
      id: `response-${response.id}`,
      type: 'survey_response',
      message: `"${response.survey.title}" anketine yeni bir yanıt geldi`,
      createdAt: response.createdAt
    })));

    // Aktiviteleri tarihe göre sırala
    const sortedActivities = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    res.json(sortedActivities);
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
}; 