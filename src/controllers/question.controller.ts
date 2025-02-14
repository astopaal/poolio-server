import { Response } from 'express';
import { getRepository } from 'typeorm';
import { Question } from '../models/Question';
import { Survey } from '../models/Survey';
import { QuestionOption } from '../models/QuestionOption';
import { AuthRequest } from '../middleware/auth';

// Soru Ekleme
export const createQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const { surveyId } = req.params;
    const { text, type, isRequired, order, validations, options } = req.body;

    if (!text || !type) {
      res.status(400).json({ message: 'Soru metni ve tipi gereklidir' });
      return;
    }

    // Anket kontrolü
    const surveyRepository = getRepository(Survey);
    const survey = await surveyRepository.findOne({
      where: { id: surveyId, creator: { id: req.user.userId } }
    });

    if (!survey) {
      res.status(404).json({ message: 'Anket bulunamadı' });
      return;
    }

    if (survey.isPublished) {
      res.status(400).json({ message: 'Yayınlanmış ankete soru eklenemez' });
      return;
    }

    const questionRepository = getRepository(Question);
    const questionOptionRepository = getRepository(QuestionOption);

    // Soru oluşturma
    const question = questionRepository.create({
      text,
      type,
      isRequired: isRequired ?? false,
      order: order ?? 0,
      validations,
      survey
    });

    await questionRepository.save(question);

    // Seçenekleri ekleme (eğer varsa)
    if (options && ['single_choice', 'multiple_choice'].includes(type)) {
      const questionOptions = options.map((opt: any, index: number) => 
        questionOptionRepository.create({
          text: opt.text,
          order: index,
          metadata: opt.metadata,
          question
        })
      );

      await questionOptionRepository.save(questionOptions);
      question.options = questionOptions;
    }

    res.status(201).json({
      message: 'Soru başarıyla eklendi',
      question
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Soru Güncelleme
export const updateQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const { surveyId, questionId } = req.params;
    const { text, type, isRequired, order, validations, options } = req.body;

    // Anket ve soru kontrolü
    const questionRepository = getRepository(Question);
    const question = await questionRepository.findOne({
      where: { 
        id: questionId,
        survey: { 
          id: surveyId,
          creator: { id: req.user.userId }
        }
      },
      relations: ['survey', 'options']
    });

    if (!question) {
      res.status(404).json({ message: 'Soru bulunamadı' });
      return;
    }

    if (question.survey.isPublished) {
      res.status(400).json({ message: 'Yayınlanmış anketteki soru düzenlenemez' });
      return;
    }

    // Soru güncelleme
    question.text = text || question.text;
    question.type = type || question.type;
    question.isRequired = isRequired ?? question.isRequired;
    question.order = order ?? question.order;
    question.validations = validations || question.validations;

    await questionRepository.save(question);

    // Seçenekleri güncelleme
    if (options && ['single_choice', 'multiple_choice'].includes(question.type)) {
      const questionOptionRepository = getRepository(QuestionOption);
      
      // Mevcut seçenekleri sil
      if (question.options) {
        await questionOptionRepository.remove(question.options);
      }

      // Yeni seçenekleri ekle
      const newOptions = options.map((opt: any, index: number) => 
        questionOptionRepository.create({
          text: opt.text,
          order: index,
          metadata: opt.metadata,
          question
        })
      );

      question.options = await questionOptionRepository.save(newOptions);
    }

    res.json({
      message: 'Soru başarıyla güncellendi',
      question
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Soru Silme
export const deleteQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const { surveyId, questionId } = req.params;

    const questionRepository = getRepository(Question);
    const question = await questionRepository.findOne({
      where: { 
        id: questionId,
        survey: { 
          id: surveyId,
          creator: { id: req.user.userId }
        }
      },
      relations: ['survey']
    });

    if (!question) {
      res.status(404).json({ message: 'Soru bulunamadı' });
      return;
    }

    if (question.survey.isPublished) {
      res.status(400).json({ message: 'Yayınlanmış anketten soru silinemez' });
      return;
    }

    await questionRepository.remove(question);

    res.json({ message: 'Soru başarıyla silindi' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Soru Sıralama
export const reorderQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const { surveyId } = req.params;
    const { questionOrders } = req.body;

    if (!Array.isArray(questionOrders)) {
      res.status(400).json({ message: 'Geçersiz sıralama verisi' });
      return;
    }

    // Anket kontrolü
    const surveyRepository = getRepository(Survey);
    const survey = await surveyRepository.findOne({
      where: { id: surveyId, creator: { id: req.user.userId } }
    });

    if (!survey) {
      res.status(404).json({ message: 'Anket bulunamadı' });
      return;
    }

    if (survey.isPublished) {
      res.status(400).json({ message: 'Yayınlanmış ankette sıralama değiştirilemez' });
      return;
    }

    const questionRepository = getRepository(Question);

    // Tüm soruları güncelle
    await Promise.all(
      questionOrders.map(async ({ id, order }: { id: string; order: number }) => {
        await questionRepository.update(
          { id, survey: { id: surveyId } },
          { order }
        );
      })
    );

    res.json({ message: 'Soru sıralaması güncellendi' });
  } catch (error) {
    console.error('Reorder questions error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
}; 