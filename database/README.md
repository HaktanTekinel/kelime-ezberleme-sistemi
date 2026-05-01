# Database

Bu klasör, kelime ezberleme sistemi projesinin PostgreSQL veritabanı kurulum dosyalarını içerir.

## Dosyalar

- `init.sql`: Projede kullanılan veritabanı tablolarını ve ilişkilerini oluşturur.

## Veritabanı Yapısı

Bu projede kullanıcılar, kelimeler, quizler, kelime öğrenme ilerlemesi, Wordle oyunu, hikâye üretimi ve raporlama işlemleri için tablolar bulunmaktadır.

## Tablolar

### users

Kullanıcı bilgilerini tutar.

Tutulan temel bilgiler:

- kullanıcı adı
- e-posta
- şifre hash değeri
- aktiflik durumu
- kullanıcı rolü
- oluşturulma ve güncellenme tarihi

Bu tablo sistemdeki ana kullanıcı tablosudur. Diğer birçok tablo `users` tablosuna bağlıdır.

---

### words

Sistemdeki kelimeleri tutar.

Tutulan temel bilgiler:

- İngilizce kelime
- Türkçe karşılığı
- görsel bağlantısı
- ses dosyası bağlantısı
- konu
- zorluk seviyesi
- kelimeyi ekleyen kullanıcı
- aktiflik durumu

`created_by` alanı `users` tablosundaki kullanıcıya bağlıdır. Kullanıcı silinirse kelimeyi ekleyen kullanıcı bilgisi boş bırakılır.

---

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
