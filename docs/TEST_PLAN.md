# Test Planı

Bu dosya, Kelime Hafızam projesinin temel test senaryolarını özetler.

## 1. Kullanıcı İşlemleri

| Test                                    | Beklenen Sonuç                              |
| --------------------------------------- | ------------------------------------------- |
| Yeni kullanıcı kayıt olur               | Kullanıcı başarıyla oluşturulur             |
| Kullanıcı giriş yapar                   | Token alınır ve ana sayfaya yönlendirilir   |
| Kullanıcı çıkış yapar                   | Oturum kapanır                              |
| Şifremi unuttum akışı çalıştırılır      | Reset token / şifre sıfırlama süreci başlar |
| Giriş yapmadan korumalı sayfaya gidilir | Kullanıcı login sayfasına yönlendirilir     |

## 2. Kelime İşlemleri

| Test                          | Beklenen Sonuç                              |
| ----------------------------- | ------------------------------------------- |
| Yeni kelime eklenir           | Kelime veritabanına kaydedilir              |
| Kelimelerim sayfası açılır    | Kelimeler listelenir                        |
| Arama kutusuna kelime yazılır | Liste arama sonucuna göre filtrelenir       |
| Seviye filtresi seçilir       | Sadece seçilen seviyedeki kelimeler görünür |
| Konu filtresi seçilir         | Sadece seçilen konudaki kelimeler görünür   |
| Kelime düzenlenir             | Güncellenen bilgi listede görünür           |
| Kelime silinir                | Kelime listeden kaldırılır                  |
| Örnek cümle oku açılır        | Ek örnek cümleler görünür                   |
| Telaffuz butonuna basılır     | Ses sayfa içinde çalar                      |

## 3. Quiz İşlemleri

| Test                                | Beklenen Sonuç                        |
| ----------------------------------- | ------------------------------------- |
| Günlük quiz başlatılır              | Quiz soruları ekrana gelir            |
| Cevap seçilir                       | Seçilen cevap işaretlenir             |
| Cevap gönderilir                    | Doğru / yanlış geri bildirimi görünür |
| Doğru cevap verilir                 | Kelimenin tekrar aşaması ilerler      |
| Yanlış cevap verilir                | Kelimenin tekrar süreci başa alınır   |
| Quiz sırasında telaffuz dinlenir    | Kelimenin sesi çalar                  |
| Quiz bitmeden başka sayfaya gidilir | Quiz kaybolmaz                        |
| Quiz sayfasına geri dönülür         | Quiz kaldığı yerden devam eder        |
| Quiz tamamlanır                     | Sonuç ekranı görünür                  |

## 4. Analiz Raporu

| Test                            | Beklenen Sonuç                    |
| ------------------------------- | --------------------------------- |
| Rapor sayfası açılır            | Genel istatistikler görünür       |
| Seviye bazlı sonuçlar incelenir | Seviye başarıları listelenir      |
| Konu bazlı sonuçlar incelenir   | Konu başarıları listelenir        |
| Detay oku açılır                | Doğru ve yanlış kelimeler görünür |
| Yazdır butonuna basılır         | Tarayıcı yazdırma ekranı açılır   |

## 5. Wordle / Bulmaca

| Test                  | Beklenen Sonuç                     |
| --------------------- | ---------------------------------- |
| Wordle ekranı açılır  | Bulmaca ekranı görünür             |
| Yeni oyun başlatılır  | Öğrenilen kelimelerden oyun oluşur |
| Tahmin gönderilir     | Harf durumları gösterilir          |
| Oyun tamamlanır       | Sonuç kaydedilir                   |
| Geçmiş oyunlar açılır | Önceki oyunlar listelenir          |

## 6. Word Chain

| Test                     | Beklenen Sonuç                        |
| ------------------------ | ------------------------------------- |
| Word Chain ekranı açılır | Kelime zinciri ekranı görünür         |
| Kelimeler seçilir        | Seçilen kelimeler zincire eklenir     |
| Hikaye oluşturulur       | LLM hikaye üretir                     |
| Görsel oluşturulur       | LLM görsel üretir                     |
| Geçmiş kayıtlar açılır   | Önceki hikaye ve görseller listelenir |

## 7. Genel Kontroller

| Test                                       | Beklenen Sonuç                      |
| ------------------------------------------ | ----------------------------------- |
| Backend çalıştırılır                       | `http://127.0.0.1:8000/docs` açılır |
| Frontend çalıştırılır                      | `http://localhost:5173` açılır      |
| `.env` dosyaları repoya eklenmez           | GitHub’da görünmez                  |
| `node_modules` repoya eklenmez             | GitHub’da görünmez                  |
| Veritabanı `.db` dosyaları repoya eklenmez | GitHub’da görünmez                  |
