# Frontend

Bu klasör, Kelime Hafızam projesinin React + Vite tabanlı frontend bölümünü içerir.

Frontend tarafında kullanıcı arayüzü, sayfa yönlendirmeleri, quiz ekranı, kelime listesi, analiz raporu, Wordle bulmaca ve Word Chain ekranları bulunmaktadır.

## Kullanılan Teknolojiler

- React
- Vite
- React Router
- JavaScript
- CSS
- Fetch API

## Frontend Klasör Yapısı

| Klasör / Dosya    | Açıklama                                         |
| ----------------- | ------------------------------------------------ |
| `src/components/` | Ortak kullanılan componentler                    |
| `src/pages/`      | Uygulama sayfaları                               |
| `src/services/`   | Backend API isteklerini yöneten servis dosyaları |
| `src/styles/`     | Ortak stil dosyaları                             |
| `src/assets/`     | Statik görsel ve varlık dosyaları                |
| `src/App.jsx`     | Uygulama route yapısı                            |
| `src/main.jsx`    | React uygulamasının giriş noktası                |

## Sayfalar

| Sayfa            | Açıklama                                    |
| ---------------- | ------------------------------------------- |
| `Landing`        | Kullanıcıyı karşılayan giriş ekranı         |
| `Login`          | Kullanıcı giriş ekranı                      |
| `Register`       | Yeni kullanıcı kayıt ekranı                 |
| `ForgotPassword` | Şifremi unuttum ekranı                      |
| `Home`           | Kullanıcı ana paneli                        |
| `WordList`       | Kelime listesi ve kelime kartları           |
| `Words`          | Kelime ekleme / kelime modülü               |
| `Quiz`           | Günlük quiz ekranı                          |
| `Puzzle`         | Wordle bulmaca ekranı                       |
| `WordChain`      | LLM destekli hikaye ve görsel üretme ekranı |
| `Reports`        | Analiz raporu ekranı                        |
| `Settings`       | Kullanıcı ayarları ekranı                   |
| `ModulePage`     | Modül yönlendirme ekranı                    |

## Servis Dosyaları

| Dosya                 | Açıklama                                               |
| --------------------- | ------------------------------------------------------ |
| `apiClient.js`        | Ortak API base URL, token ve response işlemleri        |
| `authService.js`      | Kayıt, giriş, şifre sıfırlama işlemleri                |
| `wordService.js`      | Kelime listeleme, ekleme, düzenleme ve silme işlemleri |
| `quizService.js`      | Günlük quiz ve cevap gönderme işlemleri                |
| `reportService.js`    | Analiz raporu API işlemleri                            |
| `dashboardService.js` | Ana sayfa özet verileri                                |
| `settingsService.js`  | Kullanıcı ayarları işlemleri                           |
| `wordleService.js`    | Wordle bulmaca işlemleri                               |
| `wordChainService.js` | Word Chain hikaye ve görsel üretimi işlemleri          |

## Öne Çıkan Arayüz Özellikleri

- Responsive tasarım
- Sol menülü uygulama paneli
- Kullanıcı giriş / kayıt ekranları
- Kelime arama ve filtreleme
- Seviye filtresi
- Konu filtresi
- Kelime kartlarında örnek cümle aç/kapat
- Kelime kartlarında telaffuz dinleme
- Quiz sırasında telaffuz dinleme
- Quiz bitmeden sayfa değiştirildiğinde kaldığı yerden devam etme
- Quiz sonuç ekranı
- Analiz raporunda seviye ve konu bazlı başarı dağılımı
- Rapor detaylarında doğru ve yanlış kelimeleri görme
- Yazdırılabilir rapor ekranı
- Wordle bulmaca geçmişi
- Word Chain hikaye ve görsel geçmişi

## Kelimelerim Ekranı

Kelimelerim ekranında kullanıcı kelime havuzunu inceleyebilir.

Desteklenen işlemler:

- Kelime arama
- Konuya göre filtreleme
- Seviyeye göre filtreleme
- Zorluğa göre sıralama
- A-Z / Z-A sıralama
- Kelime düzenleme
- Kelime silme
- Görsel görüntüleme
- Ses / telaffuz dinleme
- Birden fazla örnek cümleyi açıp kapatma

## Quiz Ekranı

Quiz ekranı 6 tekrar prensibine göre çalışır.

Desteklenen özellikler:

- Günlük quiz sorularını getirme
- Çoktan seçmeli cevaplama
- Doğru / yanlış geri bildirimi
- Kelime tekrar aşamasını gösterme
- Telaffuz dinleme
- Sonuç ekranı
- Doğru / yanlış sayısı
- Başarı oranı
- Sayfa değiştirince quizin kaldığı yerden devam etmesi

## Analiz Raporu Ekranı

Analiz raporu ekranında kullanıcı performansı gösterilir.

Gösterilen bilgiler:

- Toplam çözülen soru
- Doğru cevap sayısı
- Yanlış cevap sayısı
- Başarı oranı
- Öğrenilen kelime sayısı
- Tekrar bekleyen kelime sayısı
- Seviye bazlı başarı dağılımı
- Konu bazlı başarı dağılımı
- Detaylı doğru / yanlış kelime listeleri
- Yazdırma desteği

## Wordle / Bulmaca Ekranı

Wordle ekranında kullanıcı, öğrenilmiş kelimelerden oluşturulan bulmacaları çözebilir.

Desteklenen özellikler:

- Yeni oyun başlatma
- Tahmin gönderme
- Aktif oyunu görüntüleme
- Oyun geçmişini görüntüleme
- Öğrenilen kelimelerden soru üretme

## Word Chain Ekranı

Word Chain ekranı LLM destekli hikaye ve görsel üretimi için kullanılır.

Desteklenen özellikler:

- Kelime zinciri oluşturma
- Seçilen kelimelerle hikaye üretme
- Hikaye içinde hedef kelimeleri vurgulama
- Görsel üretme
- Üretilen hikaye ve görselleri geçmişte görüntüleme

## Ortam Değişkenleri

Frontend API adresini `.env` dosyasından alır.

Örnek:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
