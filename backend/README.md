# Kelime Ezberleme Sistemi Backend

Bu klasör, **6 sefer tekrar prensibi ile kelime ezberleme sistemi** projesinin FastAPI tabanlı backend kodlarını içerir.

Backend tarafında şu modüller bulunur:

- Kullanıcı kayıt / giriş / şifremi unuttum
- JWT token ile kimlik doğrulama
- Kelime ekleme, listeleme, güncelleme ve silme
- Kelimelere birden fazla örnek cümle ekleme
- Kelime görseli yükleme
- 6 aşamalı tekrar prensibine göre quiz sistemi
- Kullanıcıya özel günlük yeni kelime sayısı ayarı
- Quiz cevap geçmişi
- Kullanıcı analiz raporu
- Wordle ve Word Chain için veritabanı altyapısı

---

## Kullanılan Teknolojiler

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- PostgreSQL
- Pydantic
- python-jose
- passlib / bcrypt
- python-dotenv

---

## Projeyi Çalıştırma

Önce proje klasöründe sanal ortam aktif edilir.

Windows PowerShell:

```bash
.\.venv\Scripts\activate