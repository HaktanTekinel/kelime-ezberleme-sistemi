# Database

Kelime ezberleme sistemi projesinin veritabanı yönetimi.

## Mevcut Strateji (MVP)

Şu anda **SQLAlchemy ORM** modelleri kullanılıyor:
- `backend/models.py` — tüm tablo tanımlamaları
- `backend/database.py` — database bağlantısı ve session yönetimi
- `main.py` → `models.Base.metadata.create_all(bind=engine)` — otomatik tablo oluşturması

**Başlat & Çalıştır:**
```bash
python backend/main.py
```
İlk çalıştırmada tüm tablolar otomatik oluşturulur (SQLite veya PostgreSQL'e bağlı olarak).

### .env Konfigurasyonu

```
DATABASE_URL=sqlite:///./kelime_ezberleme.db
```

PostgreSQL için:
```
DATABASE_URL=postgresql://user:password@localhost/kelime_ezberleme_db
```

## İleri Adım: Alembic Migration

Proje büyüdükçe **schema versiyonlaması** gerekecektir. O zaman:

```bash
# Alembic kurulumu
pip install alembic

# Başlat
alembic init -t async migrations

# Migration oluştur
alembic revision --autogenerate -m "Add new column to users"

# Uygula
alembic upgrade head
```

Bu adımda:
- `backend/models.py` — tek kaynak of truth olarak kalır
- `migrations/` — her değişikliğin version kontrol kaydı
- `init.sql` → **kaldırılır** (model'den generate edilir)

## DB Şeması (Mevcut Tablolar)

Aşağıdaki tablolar SQLAlchemy'de tanımlanmıştır (`backend/models.py`):

### users
- `id` (PK)
- `username` (UNIQUE)
- `email` (UNIQUE)
- `password_hash`
- `is_active` (bool, default=True)
- `role` (default="user")
- `daily_quiz_limit` (int, default=10)
- `total_correct_answers`, `total_wrong_answers`
- `created_at`, `updated_at` (TIMESTAMP)

### words
- `id` (PK)
- `eng_word`, `tur_word`
- `topic`, `difficulty_level`
- `picture_url`, `audio_url`
- `is_active` (Soft delete)
- `created_at`, `updated_at`

### word_samples
- `id` (PK)
- `word_id` (FK → words.id)
- `sample_text`, `sample_order`
- `created_at`

### user_word_progress
- `id` (PK)
- `user_id` (FK → users.id)
- `word_id` (FK → words.id)
- `current_stage` (0-6, spaced repetition)
- `next_review_at` (TIMESTAMP)
- `is_learned` (bool)
- `consecutive_correct`, `reset_count`
- `last_answer_correct`, `updated_at`
- **UNIQUE**: (user_id, word_id)

### password_reset_tokens
- `id` (PK)
- `token` (UNIQUE)
- `user_id` (FK → users.id)
- `expires_at` (TIMESTAMP)
- `is_used` (bool)
- `created_at`


### user_settings

Kullanıcının quiz ve öğrenme ayarlarını tutar.

Tutulan temel bilgiler:

- günlük yeni kelime sayısı
- quiz soru sayısı
- anlık geri bildirim gösterme durumu
- soru atlamaya izin verme durumu

Her kullanıcı için bir ayar kaydı bulunur. Bu tablo `users` tablosuna bağlıdır.

---

### user_word_progress

Kullanıcının kelimelerdeki öğrenme ilerlemesini tutar.

Tutulan temel bilgiler:

- kullanıcı
- kelime
- mevcut öğrenme aşaması
- art arda doğru cevap sayısı
- son cevabın doğru olup olmadığı
- son tekrar tarihi
- sonraki tekrar tarihi
- kelimenin öğrenilip öğrenilmediği
- sıfırlama sayısı

Bu tablo sayesinde her kullanıcının her kelime için ayrı ilerleme durumu takip edilir.

---

### quiz_sessions

Kullanıcının başlattığı quiz oturumlarını tutar.

Tutulan temel bilgiler:

- kullanıcı
- quiz türü
- toplam soru sayısı
- doğru cevap sayısı
- yanlış cevap sayısı
- atlanan soru sayısı
- başlama zamanı
- bitiş zamanı

Bir quiz başladığında bu tabloda yeni bir oturum kaydı oluşur.

---

### quiz_answers

Quizlerde verilen cevapları tutar.

Tutulan temel bilgiler:

- quiz oturumu
- kullanıcı
- kelime
- seçilen cevap
- doğru cevap
- cevabın doğru olup olmadığı
- soru tipi
- cevaplama süresi
- cevaplama zamanı

Bu tablo, quiz performansını analiz etmek için kullanılır.

---

### word_samples

Kelimelere ait örnek cümleleri tutar.

Tutulan temel bilgiler:

- kelime
- örnek cümle
- örnek sırası
- oluşturulma tarihi

Bir kelimeye birden fazla örnek cümle eklenebilir.

---

### word_chain_stories

LLM ile üretilen hikâye kayıtlarını tutar.

Tutulan temel bilgiler:

- kullanıcı
- hikâyede kullanılan kelimeler
- üretilen hikâye metni
- görsel bağlantısı
- kullanılan LLM model adı
- oluşturulma tarihi

Bu tablo, kelime zinciri veya hedef kelimelerle hikâye üretme özelliği için kullanılır.

---

### wordle_games

Kullanıcının Wordle oyunlarını tutar.

Tutulan temel bilgiler:

- kullanıcı
- hedef kelime
- oyun durumu
- deneme sayısı
- başlama zamanı
- bitiş zamanı

Wordle oyununda hedef kelime `words` tablosundan seçilir.

---

### report_snapshots

Kullanıcının öğrenme raporlarını tutar.

Tutulan temel bilgiler:

- kullanıcı
- rapor tarihi
- toplam öğrenilen kelime sayısı
- başarı oranı
- zayıf konular
- güçlü konular
- oluşturulma tarihi

Bu tablo, kullanıcının zaman içindeki öğrenme performansını raporlamak için kullanılır.

## Tablo İlişkileri

Temel ilişkiler şu şekildedir:

```text
users
 ├── user_settings
 ├── user_word_progress
 ├── quiz_sessions
 ├── quiz_answers
 ├── word_chain_stories
 ├── wordle_games
 └── report_snapshots

words
 ├── user_word_progress
 ├── quiz_answers
 ├── word_samples
 └── wordle_games

quiz_sessions
 └── quiz_answers
