import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Survey } from '../models/Survey';
import { Response as SurveyResponse } from '../models/Response';
import { Answer } from '../models/Answer';
import { Question } from '../models/Question';
import { AuthRequest } from '../middleware/auth';

interface QuestionStats {
  totalAnswers: number;
  type: Question['type'];
  choices?: Record<string, number>;
  average?: number;
  distribution?: Record<number, number>;
  responses?: string[];
}

export const submitResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { surveyId } = req.params;
    const { answers } = req.body;
    const userId = (req as AuthRequest).user?.userId;

    const surveyRepository = getRepository(Survey);
    const responseRepository = getRepository(SurveyResponse);
    const answerRepository = getRepository(Answer);
    const questionRepository = getRepository(Question);

    // Anket kontrolü
    const survey = await surveyRepository.findOne({ where: { id: surveyId } });
    if (!survey) {
      res.status(404).json({ message: 'Anket bulunamadı' });
      return;
    }

    // Yanıt oluştur
    const surveyResponse = responseRepository.create({
      survey,
      respondent: userId ? { id: userId } : undefined,
      anonymousId: !userId ? `anon_${Date.now()}` : undefined,
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        completionTime: Date.now()
      }
    });

    await responseRepository.save(surveyResponse);

    // Yanıtları kaydet
    for (const answer of answers) {
      const question = await questionRepository.findOne({ where: { id: answer.questionId } });
      if (question) {
        const newAnswer = answerRepository.create({
          response: surveyResponse,
          question,
          value: answer.value
        });
        await answerRepository.save(newAnswer);
      }
    }

    res.status(201).json({
      message: 'Yanıtınız başarıyla kaydedildi',
      responseId: surveyResponse.id
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const getResponses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { surveyId } = req.params;
    const userId = req.user?.userId;

    const surveyRepository = getRepository(Survey);
    const responseRepository = getRepository(SurveyResponse);

    // Anket kontrolü ve yetki kontrolü
    const survey = await surveyRepository.findOne({
      where: { id: surveyId },
      relations: ['company']
    });

    if (!survey) {
      res.status(404).json({ message: 'Anket bulunamadı' });
      return;
    }

    // Yanıtları getir
    const responses = await responseRepository.find({
      where: { survey: { id: surveyId } },
      relations: ['answers', 'answers.question', 'respondent'],
      order: { createdAt: 'DESC' }
    });

    res.json(responses);
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const getResponseStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { surveyId } = req.params;

    const surveyRepository = getRepository(Survey);
    const responseRepository = getRepository(SurveyResponse);

    // Anket kontrolü
    const survey = await surveyRepository.findOne({
      where: { id: surveyId },
      relations: ['questions']
    });

    if (!survey) {
      res.status(404).json({ message: 'Anket bulunamadı' });
      return;
    }

    // Tüm yanıtları getir
    const responses = await responseRepository.find({
      where: { survey: { id: surveyId } },
      relations: ['answers', 'answers.question']
    });

    // İstatistikleri hesapla
    const statistics = {
      totalResponses: responses.length,
      completionRate: responses.filter(r => r.isCompleted).length / responses.length,
      averageCompletionTime: responses.reduce((acc, r) => acc + (r.metadata?.completionTime || 0), 0) / responses.length,
      questionStats: {} as Record<string, QuestionStats>
    };

    // Soru bazında istatistikler
    for (const question of survey.questions) {
      const answers = responses.flatMap(r => r.answers.filter(a => a.question.id === question.id));
      
      const questionStats: QuestionStats = {
        totalAnswers: answers.length,
        type: question.type
      };

      // Soru tipine göre özel istatistikler
      switch (question.type) {
        case 'multiple_choice':
        case 'single_choice':
          questionStats.choices = {};
          answers.forEach(answer => {
            const choice = answer.value.choice;
            if (choice) {
              questionStats.choices![choice] = (questionStats.choices![choice] || 0) + 1;
            }
          });
          break;

        case 'rating':
          const values = answers.map(a => a.value.rating).filter(Boolean) as number[];
          if (values.length > 0) {
            questionStats.average = values.reduce((a, b) => a + b, 0) / values.length;
            questionStats.distribution = {};
            values.forEach(value => {
              questionStats.distribution![value] = (questionStats.distribution![value] || 0) + 1;
            });
          }
          break;

        case 'text':
          questionStats.responses = answers
            .map(a => a.value.text)
            .filter((text): text is string => typeof text === 'string');
          break;
      }

      statistics.questionStats[question.id] = questionStats;
    }

    res.json(statistics);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
}; 