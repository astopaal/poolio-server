# Poolio - Anket Yönetim Sistemi API

Bu proje, şirketlerin anket oluşturmasına, yönetmesine ve analiz etmesine olanak sağlayan bir API sunucusudur.

## Özellikler

- 🔐 Çok seviyeli yetkilendirme sistemi (Super Admin, Company Admin, Editor, Viewer)
- 🏢 Şirket yönetimi
- 📊 Anket oluşturma ve yönetme
- 📝 Farklı soru tipleri desteği (Çoktan seçmeli, Metin, Değerlendirme vb.)
- 📈 Detaylı yanıt analizi ve istatistikler
- 🔒 JWT tabanlı kimlik doğrulama
- 📚 OpenAPI/Swagger dokümantasyonu

## Teknolojiler

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- TypeORM
- JWT
- OpenAPI/Swagger

## Kurulum

1. Repoyu klonlayın:
```bash
git clone https://github.com/astopaal/poolio-server.git
```

2. Bağımlılıkları yükleyin:
```bash
cd poolio-server
npm install
```

3. `.env` dosyasını oluşturun:
```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=survey_app
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

4. Veritabanını oluşturun:
```bash
createdb survey_app
```

5. Uygulamayı başlatın:
```bash
# Geliştirme modu
npm run dev

# Prodüksiyon modu
npm run build
npm start
```

## API Dokümantasyonu

API dokümantasyonuna `http://localhost:5001/docs` adresinden erişebilirsiniz.

## Roller ve İzinler

### Super Admin
- Tüm sistem üzerinde tam yetki
- Şirket oluşturma/düzenleme/silme
- Şirket adminlerini yönetme
- Sistem istatistiklerini görüntüleme

### Company Admin
- Şirket ayarlarını yönetme
- Kullanıcı oluşturma/düzenleme
- Tüm anketleri görüntüleme ve yönetme
- Şirket istatistiklerini görüntüleme

### Editor
- Anket oluşturma/düzenleme
- Soru yönetimi
- Yanıt istatistiklerini görüntüleme

### Viewer
- Anketleri görüntüleme
- Yanıtları görüntüleme

## Lisans

MIT 