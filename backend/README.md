# Backend

Bu klasör, Kelime Hafızam projesinin FastAPI tabanlı backend bölümünü içerir.

Backend tarafında kullanıcı işlemleri, kelime yönetimi, quiz algoritması, analiz raporu, Wordle bulmaca ve Word Chain modülleri bulunmaktadır.

## Kullanılan Teknolojiler

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT Authentication
- SQLite / PostgreSQL
- gTTS
- OpenAI API entegrasyonu

## Backend Modülleri

| Dosya                            | Açıklama                                        |
| -------------------------------- | ----------------------------------------------- |
| `main.py`                        | FastAPI uygulamasının giriş noktası             |
| `database.py`                    | Veritabanı bağlantı ayarları                    |
| `models.py`                      | SQLAlchemy tablo modelleri                      |
| `schemas.py`                     | Pydantic request/response şemaları              |
| `auth.py`                        | Kayıt, giriş, JWT ve şifre sıfırlama işlemleri  |
| `users.py`                       | Kullanıcı ayarları ve kullanıcı işlemleri       |
| `quiz.py`                        | Günlük quiz ve 6 tekrar algoritması             |
| `reports.py`                     | Analiz raporu endpointleri                      |
| `report_helpers.py`              | Rapor hesaplama yardımcı fonksiyonları          |
| `wordle.py`                      | Öğrenilen kelimelerden Wordle bulmaca sistemi   |
| `word_chain.py`                  | LLM ile hikaye ve görsel üretme sistemi         |
| `db_setup.py`                    | Lokal veritabanı hazırlama yardımcısı           |
| `fix_sqlite_runtime_tables.py`   | SQLite tablo uyumluluk düzeltmeleri             |
| `fill_audio_urls.py`             | Kelimeler için telaffuz linki doldurma scripti  |
| `fill_missing_audio_with_tts.py` | Eksik telaffuzlar için yerel MP3 üretme scripti |

## API Modülleri

### Auth

| Method | Endpoint                | Açıklama                      |
| ------ | ----------------------- | ----------------------------- |
| POST   | `/auth/register`        | Yeni kullanıcı kaydı          |
| POST   | `/auth/login`           | Kullanıcı girişi              |
| POST   | `/auth/forgot-password` | Şifremi unuttum işlemi        |
| POST   | `/auth/reset-password`  | Şifre sıfırlama               |
| GET    | `/auth/me`              | Giriş yapan kullanıcı bilgisi |

### Words

| Method | Endpoint                 | Açıklama                 |
| ------ | ------------------------ | ------------------------ |
| GET    | `/words`                 | Kelime listesini getirir |
| POST   | `/words`                 | Yeni kelime ekler        |
| PUT    | `/words/{word_id}`       | Kelimeyi günceller       |
| DELETE | `/words/{word_id}`       | Kelimeyi siler           |
| POST   | `/words/{word_id}/image` | Kelimeye görsel yükler   |

### Quiz

| Method | Endpoint       | Açıklama                                          |
| ------ | -------------- | ------------------------------------------------- |
| GET    | `/quiz/daily`  | Günlük quiz sorularını getirir                    |
| POST   | `/quiz/answer` | Quiz cevabını işler ve tekrar aşamasını günceller |

### Reports

| Method | Endpoint      | Açıklama                             |
| ------ | ------------- | ------------------------------------ |
| GET    | `/reports/me` | Kullanıcının analiz raporunu getirir |

### User Settings

| Method | Endpoint             | Açıklama                       |
| ------ | -------------------- | ------------------------------ |
| GET    | `/users/me/settings` | Kullanıcı ayarlarını getirir   |
| PUT    | `/users/me/settings` | Kullanıcı ayarlarını günceller |

### Dashboard

| Method | Endpoint             | Açıklama                          |
| ------ | -------------------- | --------------------------------- |
| GET    | `/dashboard/summary` | Ana sayfa özet verilerini getirir |

### Wordle

| Method | Endpoint          | Açıklama                     |
| ------ | ----------------- | ---------------------------- |
| POST   | `/wordle/start`   | Yeni Wordle oyunu başlatır   |
| POST   | `/wordle/guess`   | Wordle tahmini gönderir      |
| GET    | `/wordle/current` | Aktif Wordle oyununu getirir |
| GET    | `/wordle/history` | Wordle geçmişini getirir     |

### Word Chain

| Method | Endpoint               | Açıklama                        |
| ------ | ---------------------- | ------------------------------- |
| POST   | `/word-chain/generate` | LLM ile hikaye ve görsel üretir |
| GET    | `/word-chain/history`  | Word Chain geçmişini getirir    |

## 6 Tekrar Mantığı

Kelime öğrenme aşamaları:

```txt
0 -> Yeni kelime
1 -> 1 gün sonra tekrar
2 -> 1 hafta sonra tekrar
3 -> 1 ay sonra tekrar
4 -> 3 ay sonra tekrar
5 -> 6 ay sonra tekrar
6 -> Öğrenilmiş kelime
```
