# Database

Bu klasör kelime ezberleme sisteminin veritabanı şemasını ve seed dosyalarını içerir.

## Güncel tablo kaynağı

Ana kaynak `backend/models.py` dosyasıdır. Backend açılırken:

1. SQLite bozuk/eski şema kontrol edilir.
2. Eksik tablolar SQLAlchemy ile oluşturulur.
3. `database/word_seed_final_samples.csv` içindeki kelimeler otomatik içeri aktarılır.

Bu yüzden lokal geliştirmede ayrıca SQL çalıştırmadan backend başlatmak yeterlidir:

```bash
cd backend
python -m uvicorn main:app --reload
```

## Kelime seed durumu

`word_seed_final_samples.csv` dosyası güncellendi:

- 1440 kelime var.
- Her kelimenin Türkçe karşılığı var.
- Her kelimede 2 örnek cümle var.
- `difficulty_level` kolonu 1 ile 10 arasında dağıtıldı.
- Her seviyede 144 kelime olacak şekilde dengelendi.
- Eski CEFR bilgisi `level` kolonunda korunur.

Frontend 1-10 seviye filtrelediği için backend artık doğrudan `difficulty_level` alanını kullanır.

## PostgreSQL kullanımı

PostgreSQL için `init.sql` dosyası çalıştırılabilir. Ancak seed verileri backend açılışında CSV üzerinden otomatik aktarılır.

Örnek `.env`:

```env
DATABASE_URL=postgresql://postgres:SIFRE@localhost:5432/kelime_ezberleme
```

## SQLite kullanımı

`.env` içinde `DATABASE_URL` boşsa veya SQLite verilirse backend otomatik `backend/kelime_ezberleme.db` kullanır.

```env
DATABASE_URL=sqlite:///./kelime_ezberleme.db
```

Önceki hatanın sebebi SQLite'ta `BIGINT PRIMARY KEY` kullanılmasıydı. Güncel modelde ID alanları SQLite ile uyumlu `INTEGER PRIMARY KEY` olarak oluşturulur.
