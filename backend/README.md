# Kelime Ezberleme Sistemi Backend

FastAPI tabanlı backend. Kullanıcı kayıt/giriş, kelime yönetimi, 6 tekrar prensipli quiz, ayarlar, rapor, Wordle ve Word Chain modüllerini içerir.

## Çalıştırma

Windows PowerShell:

```powershell
cd C:\Users\Haktan\kelime-ezberleme-sistemi\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Swagger:

```txt
http://127.0.0.1:8000/docs
```

## .env

`backend/.env.example` dosyasını `backend/.env` olarak kopyalayabilirsin.

SQLite lokal kullanım:

```env
DATABASE_URL=sqlite:///./kelime_ezberleme.db
SECRET_KEY=YOUR_SECRET_KEY_HERE_MIN_32_CHARS
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
UPLOAD_DIR=./uploads
```

PostgreSQL kullanım:

```env
DATABASE_URL=postgresql://postgres:SIFRE@localhost:5432/kelime_ezberleme
```

## Otomatik veritabanı hazırlama

Backend açılırken `db_setup.py` çalışır:

- Eski/bozuk SQLite şemasını tespit eder.
- Gerekirse eski DB'yi `.broken-YYYYMMDDHHMMSS.db` adıyla yedekleyip yeni DB oluşturur.
- Tabloları SQLAlchemy modellerine göre oluşturur.
- `database/word_seed_final_samples.csv` içindeki 1440 kelimeyi seed eder.
- Kelimelerin `difficulty_level` değeri 1-10 aralığındadır.

Bu sayede `users.id`, `user_settings.id`, `quiz_sessions.id` gibi SQLite autoincrement hataları kalıcı olarak çözülür.

## Ana endpointler

```txt
POST   /auth/register
POST   /auth/login
GET    /auth/me
POST   /auth/forgot-password
POST   /auth/reset-password

GET    /words
POST   /words
GET    /words/{word_id}
PUT    /words/{word_id}
DELETE /words/{word_id}
POST   /words/{word_id}/image

GET    /quiz/daily
POST   /quiz/answer

GET    /users/me/settings
PUT    /users/me/settings
GET    /users/me/stats

GET    /reports/me
GET    /dashboard/summary

POST   /wordle/start
GET    /wordle/current
POST   /wordle/guess

POST   /word-chain/generate
GET    /word-chain/history
```
