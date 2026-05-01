# Backend

Bu klasör, kelime ezberleme sistemi projesinin FastAPI tabanlı backend kodlarını içerir.

Backend tarafında kullanıcı işlemleri, kimlik doğrulama, kelime ekleme/listeleme, sınav modülü ve veritabanı bağlantısı yönetilir.

## Kullanılan Teknolojiler

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- PostgreSQL
- Pydantic
- Passlib / bcrypt
- python-dotenv

## Dosya Yapısı

```text
backend/
├── database.py
├── main.py
├── models.py
├── schemas.py
└── README.md
```

## Projeyi Çalıştırma

Öncelikle backend klasörüne girilir:

```bash
cd backend
```

Sanal ortam aktif edilir.

Windows PowerShell için:

```bash
.\venv\Scripts\activate
```

Git Bash için:

```bash
source venv/Scripts/activate
```

Gerekli paketler yüklü değilse yüklenir:

```bash
pip install -r requirements.txt
```

Backend uygulaması aşağıdaki komut ile çalıştırılır:

```bash
python -m uvicorn main:app --reload
```

Uygulama çalıştıktan sonra backend şu adreste çalışır:

```text
http://127.0.0.1:8000
```

Swagger API dokümantasyon ekranı:

```text
http://127.0.0.1:8000/docs
```

## API Endpointleri

Bu bölüm frontend tarafının backend ile nasıl haberleşeceğini göstermek için hazırlanmıştır.

Frontend tarafı kullanıcıdan aldığı verileri bu endpointlere gönderir. Backend ise veritabanı işlemlerini yapar ve frontend tarafına cevap döndürür.

---

## 1. Kullanıcı Kayıt Olma

Yeni kullanıcı oluşturmak için kullanılır.

### Endpoint

```text
POST http://127.0.0.1:8000/register
```

### Request Body

```json
{
  "username": "ornek_kullanici",
  "email": "ornek@mail.com",
  "password": "sifre123"
}
```

### Örnek Başarılı Cevap

```json
{
  "id": 1,
  "username": "ornek_kullanici",
  "email": "ornek@mail.com"
}
```

### Açıklama

Bu endpoint kullanıcıdan kullanıcı adı, e-posta ve şifre bilgisi alır.

Backend tarafında:

- Kullanıcı adı kontrol edilir.
- E-posta kontrol edilir.
- Şifre hashlenerek veritabanına kaydedilir.
- Başarılı kayıt sonrası kullanıcı bilgisi döndürülür.

Şifre veritabanına düz metin olarak kaydedilmez. Hashlenmiş şekilde tutulur.

---

## 2. Kullanıcı Giriş Yapma

Kayıtlı kullanıcının sisteme giriş yapması için kullanılır.

### Endpoint

```text
POST http://127.0.0.1:8000/login
```

### Request Body

```json
{
  "username_or_email": "ornek_kullanici",
  "password": "sifre123"
}
```

Alternatif olarak kullanıcı adı yerine e-posta da gönderilebilir:

```json
{
  "username_or_email": "ornek@mail.com",
  "password": "sifre123"
}
```

### Örnek Başarılı Cevap

```json
{
  "access_token": "token_bilgisi",
  "token_type": "bearer"
}
```

### Açıklama

Bu endpoint kullanıcı adı veya e-posta ile giriş yapılmasını sağlar.

Backend tarafında:

- Kullanıcı adı veya e-posta veritabanında aranır.
- Şifre hashlenmiş şifre ile karşılaştırılır.
- Bilgiler doğruysa token üretilir.
- Token frontend tarafına döndürülür.

Frontend tarafı bu token bilgisini saklayarak giriş gerektiren işlemlerde kullanır.

---

## Token Kullanımı

Login işlemi başarılı olduğunda backend tarafından `access_token` döndürülür.

Frontend tarafı bu tokenı saklar. Örnek olarak `localStorage` kullanılabilir.

```js
localStorage.setItem("token", data.access_token);
```

Giriş gerektiren endpointlere istek atarken token `Authorization` header içinde gönderilir.

### Örnek Header

```text
Authorization: Bearer token_bilgisi
```

### JavaScript Fetch Örneği

```js
fetch("http://127.0.0.1:8000/words", {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  }
});
```

Backend bu tokenı kontrol eder. Token geçerliyse işlem yapılır. Token geçersizse veya hiç gönderilmemişse kullanıcı yetkisiz kabul edilir.

---

## 3. Kelime Ekleme Modülü

Kelime ekleme modülü, kullanıcıların sisteme yeni kelime ekleyebilmesi için kullanılır.

Kelime bilgisi şu alanlardan oluşabilir:

- İngilizce kelime
- Türkçe karşılığı
- Örnek cümleler
- Kelimeye ait resim yolu
- Opsiyonel olarak sesli okunuş bilgisi

Örnek kelime bilgisi:

```json
{
  "eng_word_name": "apple",
  "tur_word_name": "elma",
  "picture": "C://words/apple.jpeg",
  "samples": [
    "I eat an apple.",
    "This apple is red."
  ]
}
```

Frontend tarafı kelime ekleme ekranından aldığı bilgileri backend tarafındaki kelime endpointine gönderir.

Not: Kelime endpointinin tam adresi backend kodundaki mevcut route yapısına göre kontrol edilmelidir.

---

## 4. Sınav Modülü ve 6 Tekrar Algoritması

Sınav modülü, kelimelerin belirli aralıklarla tekrar edilmesine dayanır.

Bir kelimenin öğrenilmiş sayılması için kullanıcının aynı kelimeyi 6 farklı tekrar zamanında doğru bilmesi gerekir.

Tekrar zamanları:

1. 1 gün sonra
2. 1 hafta sonra
3. 1 ay sonra
4. 3 ay sonra
5. 6 ay sonra
6. 1 yıl sonra

Mantık:

- Kullanıcı kelimeyi doğru bilirse tekrar seviyesi artar.
- Kullanıcı kelimeyi yanlış bilirse süreç o kelime için başa döner.
- 6 tekrar seviyesi başarıyla tamamlanırsa kelime bilinen kelimeler havuzuna alınır.
- Sınav ekranında hem yeni kelimeler hem de tekrar zamanı gelen eski kelimeler gösterilir.

Bu algoritma backend tarafında yönetilir. Frontend sadece backendden gelen sınav sorularını kullanıcıya gösterir ve kullanıcının cevabını backend tarafına gönderir.

---

## Frontend İçin Genel Notlar

Frontend tarafı backend ile HTTP istekleri üzerinden haberleşir.

Temel akış:

1. Kullanıcı kayıt olur.
2. Kullanıcı giriş yapar.
3. Backend frontend tarafına token döndürür.
4. Frontend tokenı saklar.
5. Kullanıcı kelime ekleme, kelime listeleme veya sınav işlemi yaptığında frontend backend endpointlerine istek atar.
6. Giriş gerektiren isteklerde token header içinde gönderilir.

Frontend tarafının doğrudan veritabanına bağlanması gerekmez. Veritabanı işlemleri backend üzerinden yapılır.

---

## Swagger Kullanımı

Swagger ekranı backend endpointlerini test etmek için kullanılır.

Swagger adresi:

```text
http://127.0.0.1:8000/docs
```

Swagger üzerinden:

- Register endpointi test edilebilir.
- Login endpointi test edilebilir.
- Kelime endpointleri test edilebilir.
- Endpointlerin istediği JSON formatı görülebilir.
- Backend cevapları kontrol edilebilir.

Frontend geliştiricisi, hangi endpointin hangi veriyi istediğini Swagger üzerinden görebilir.

---

## Örnek Frontend Register İsteği

```js
fetch("http://127.0.0.1:8000/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    username: "ornek_kullanici",
    email: "ornek@mail.com",
    password: "sifre123"
  })
});
```

## Örnek Frontend Login İsteği

```js
fetch("http://127.0.0.1:8000/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    username_or_email: "ornek_kullanici",
    password: "sifre123"
  })
});
```

## Örnek Tokenlı İstek

```js
fetch("http://127.0.0.1:8000/words", {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  }
});
```

---
