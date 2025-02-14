import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection } from 'typeorm';
import { User } from './models/User';
import { Company } from './models/Company';
import { Survey } from './models/Survey';
import { Question } from './models/Question';
import { QuestionOption } from './models/QuestionOption';
import { Answer } from './models/Answer';
import { Response } from './models/Response';
import routes from './routes';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Serve OpenAPI documentation
app.use(express.static(path.join(__dirname, 'public')));
app.use('/openapi.yaml', express.static(path.join(__dirname, '..', 'openapi.yaml')));

// API Documentation route
app.get('/docs', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/', (_req, res) => {
  res.send('Survey App API is running!');
});

// Database connection will be configured here
const initializeDatabase = async () => {
  try {
    console.log('🔄 Veritabanına bağlanılıyor...');
    
    const connection = await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'survey_app',
      entities: [User, Company, Survey, Question, QuestionOption, Answer, Response],
      synchronize: true
    });

    console.log('✅ Veritabanı bağlantısı başarılı!');
    
    // Log table creation/sync status
    const tables = connection.entityMetadatas.map(entity => entity.tableName);
    console.log('\n📊 Senkronize edilen tablolar:');
    tables.forEach(table => {
      console.log(`   ├─ ${table}`);
    });
    console.log('   └─ Tüm tablolar başarıyla senkronize edildi! 🎉\n');

  } catch (error) {
    console.error('❌ Veritabanı bağlantı hatası:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server ${PORT} portunda çalışıyor!`);
  console.log(`📚 API Dokümantasyonu: http://localhost:${PORT}/docs`);
  initializeDatabase();
}); 