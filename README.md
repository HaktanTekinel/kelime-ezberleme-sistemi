@'

# Kelime Hafızam | 6 Tekrar ile Kelime Ezberleme Sistemi

Kelime Hafızam, İngilizce kelime öğrenmeyi 6 tekrar prensibiyle destekleyen web tabanlı bir kelime ezberleme sistemidir.

Uygulamada kullanıcı kayıt/giriş işlemleri, kelime ekleme, günlük quiz, tekrar algoritması, analiz raporu, Wordle bulmaca ve LLM destekli Word Chain hikaye üretimi bulunur.

## Proje Amacı

Bu projenin amacı, kullanıcıların İngilizce kelimeleri düzenli tekrarlarla kalıcı şekilde öğrenmesini sağlamaktır.

Sistem, kullanıcının doğru ve yanlış cevaplarına göre kelimenin tekrar aşamasını günceller. Bir kelime 6 tekrar aşamasını başarıyla tamamladığında öğrenilmiş kabul edilir.

## Ana Özellikler

- Kullanıcı kayıt, giriş ve şifremi unuttum akışı
- JWT tabanlı kimlik doğrulama
- Kelime ekleme, listeleme, düzenleme ve silme
- İngilizce kelime, Türkçe karşılık, örnek cümle, görsel ve ses desteği
- 1-10 arası kelime seviyesi
- Günlük quiz sistemi
- 6 tekrar prensibine göre kelime ilerleme takibi
- Quiz sırasında telaffuz dinleme
- Kelimelerim ekranında telaffuz dinleme
- Analiz raporu
- Konu ve seviye bazlı başarı dağılımı
- Doğru / yanlış kelime detayları
- Yazdırılabilir rapor ekranı
- Öğrenilen kelimelerden Wordle bulmacası
- LLM destekli Word Chain hikaye ve görsel üretimi
- Responsive arayüz

## Kullanılan Teknolojiler

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- SQLite / PostgreSQL
- JWT Authentication
- Uvicorn
- gTTS
- OpenAI / LLM entegrasyonu

### Frontend

- React
- Vite
- React Router
- JavaScript
- CSS

## Proje Klasör Yapısı

```txt
kelime-ezberleme-sistemi/
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── quiz.py
│   ├── reports.py
│   ├── report_helpers.py
│   ├── schemas.py
│   ├── users.py
│   ├── word_chain.py
│   ├── wordle.py
│   ├── uploads/audio/words/
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── database/
│   ├── init.sql
│   ├── migration_story_1_5.sql
│   ├── word_seed_final_samples.csv
│   ├── word_samples_seed_final.csv
│   └── README.md
│
├── frontend/
│   └── kelime-ezberleme/
│       ├── src/
│       ├── package.json
│       ├── .env.example
│       └── README.md
│
├── docs/
├── .gitignore
├── .env.example
└── README.md
```
