# Kelime Hafızam

Kelime Hafızam, İngilizce kelime öğrenmeyi 6 tekrar prensibiyle destekleyen web tabanlı bir kelime ezberleme uygulamasıdır.

Uygulamada kullanıcı kayıt/giriş işlemleri, kelime ekleme, günlük quiz, analiz raporu, Wordle bulmaca ve LLM destekli Word Chain modülü bulunur.

## Kullanılan Teknolojiler

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- SQLite / PostgreSQL
- JWT Authentication
- gTTS
- OpenAI API

### Frontend

- React
- Vite
- React Router
- JavaScript
- CSS

## Hızlı Çalıştırma

Projeyi çalıştırmak için backend ve frontend ayrı terminallerde başlatılır.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --reload
```

Backend adresi:

```txt
http://127.0.0.1:8000
```

Swagger API dokümantasyonu:

```txt
http://127.0.0.1:8000/docs
```

### Frontend

Yeni terminal açılır.

```powershell
cd frontend\kelime-ezberleme
npm install
copy .env.example .env
npm run dev
```

Frontend adresi:

```txt
http://localhost:5173
```

## Temel Özellikler

- Kullanıcı kayıt, giriş ve şifremi unuttum işlemleri
- JWT tabanlı kullanıcı doğrulama
- Kelime ekleme, listeleme, düzenleme ve silme
- Kelimelere örnek cümle, görsel ve ses ekleme
- 6 tekrar prensibine göre quiz sistemi
- Kelime tekrar aşaması takibi
- Quiz sırasında telaffuz dinleme
- Kelime kartlarında telaffuz dinleme
- Kullanıcı ayarları
- Analiz raporu
- Seviye ve konu bazlı başarı dağılımı
- Yazdırılabilir rapor ekranı
- Öğrenilen kelimelerden Wordle bulmacası
- LLM destekli Word Chain hikaye ve görsel üretimi

## 6 Tekrar Algoritması

Sistem, kelimenin doğru bilinme durumuna göre tekrar zamanını belirler.

```txt
0 -> Yeni kelime
1 -> 1 gün sonra tekrar
2 -> 1 hafta sonra tekrar
3 -> 1 ay sonra tekrar
4 -> 3 ay sonra tekrar
5 -> 6 ay sonra tekrar
6 -> Öğrenilmiş kelime
```

Kullanıcı kelimeyi doğru bildikçe aşama ilerler. Yanlış cevap verilirse kelimenin tekrar süreci başa alınır.

## Proje Klasör Yapısı

```txt
kelime-ezberleme-sistemi/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── quiz.py
│   ├── reports.py
│   ├── wordle.py
│   ├── word_chain.py
│   ├── uploads/audio/words/
│   ├── requirements.txt
│   └── README.md
│
├── database/
│   ├── init.sql
│   ├── migration_story_1_5.sql
│   ├── word_seed_final_samples.csv
│   └── README.md
│
├── frontend/
│   └── kelime-ezberleme/
│       ├── src/
│       ├── package.json
│       └── README.md
│
├── docs/
├── .gitignore
├── .env.example
└── README.md
```

## API Özeti

### Auth

```txt
POST /auth/register
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
```

### Words

```txt
GET    /words
POST   /words
PUT    /words/{word_id}
DELETE /words/{word_id}
POST   /words/{word_id}/image
```

### Quiz

```txt
GET  /quiz/daily
POST /quiz/answer
```

### Reports

```txt
GET /reports/me
```

### Wordle

```txt
POST /wordle/start
POST /wordle/guess
GET  /wordle/current
GET  /wordle/history
```

### Word Chain

```txt
POST /word-chain/generate
GET  /word-chain/history
```

## Story Durumu

| Story   | Açıklama                                    | Durum      |
| ------- | ------------------------------------------- | ---------- |
| Story 1 | Kullanıcı kayıt, giriş ve şifremi unuttum   | Tamamlandı |
| Story 2 | Kelime ekleme modülü                        | Tamamlandı |
| Story 3 | 6 tekrar prensibine göre quiz modülü        | Tamamlandı |
| Story 4 | Kullanıcı ayarları                          | Tamamlandı |
| Story 5 | Analiz raporu ve çıktı alma                 | Tamamlandı |
| Story 6 | Öğrenilen kelimelerden Wordle bulmaca       | Tamamlandı |
| Story 7 | LLM ile Word Chain hikaye ve görsel üretimi | Tamamlandı |

## Test Kontrol Listesi

- Kullanıcı kayıt olabilir.
- Kullanıcı giriş yapabilir.
- Kullanıcı şifre sıfırlama akışını kullanabilir.
- Kullanıcı kelime ekleyebilir.
- Kullanıcı kelimeleri listeleyebilir, düzenleyebilir ve silebilir.
- Kullanıcı günlük quiz çözebilir.
- Kelime doğru bilinirse tekrar aşaması ilerler.
- Yanlış cevapta tekrar süreci başa alınır.
- Kullanıcı quiz sırasında sesli telaffuz dinleyebilir.
- Kullanıcı analiz raporunda başarı durumunu görebilir.
- Rapor yazdırılabilir.
- Öğrenilen kelimelerden Wordle oyunu başlatılabilir.
- Word Chain ekranında LLM ile hikaye ve görsel üretilebilir.

## GitHub Notları

Repoya eklenmemesi gereken dosyalar:

```txt
.env
.venv/
node_modules/
dist/
__pycache__/
*.db
*.sqlite
*.sqlite3
backup/
```

Repoda bulunması gereken önemli dosyalar:

```txt
README.md
backend/README.md
frontend/kelime-ezberleme/README.md
database/README.md
.env.example
backend/.env.example
frontend/kelime-ezberleme/.env.example
database/word_seed_final_samples.csv
backend/uploads/audio/words/*.mp3
```
