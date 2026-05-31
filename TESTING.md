# Backend Test Checklist

Bu belgede, API akışının manuel testine yönelik adımlar ve beklenen sonuçlar belirtilir.

## Hazırlanmış Test Ortamı

- Backend: `python backend/main.py` (localhost:8000)
- Frontend: `npm run dev` (localhost:5173)

---

## 1. Register (Kullanıcı Kaydı)

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test@12345"
}
```

**Beklenen Yanıt:** ✅ 201
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com"
}
```

---

## 2. Login (Oturum Açma & JWT)

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "username_or_email": "testuser",
  "password": "Test@12345"
}
```

**Beklenen Yanıt:** ✅ 200
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user_id": 1
}
```

**Sonraki adımlar için `access_token` sakla!**

---

## 3. Get Current User (/me Endpoint)

**Endpoint:** `GET /auth/me`

**Header:**
```
Authorization: Bearer {access_token}
```

**Beklenen Yanıt:** ✅ 200
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com"
}
```

**Token olmadan:** ❌ 401
```json
{
  "detail": "Geçersiz veya süresi dolmuş token"
}
```

---

## 4. Kelime Ekleme (POST /words)

**Endpoint:** `POST /words`

**Header:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "eng_word": "apple",
  "tur_word": "elma",
  "difficulty_level": 1,
  "topic": "fruits",
  "picture_url": null,
  "audio_url": null,
  "samples": ["An apple a day keeps the doctor away", "I like eating apples"]
}
```

**Token ile:** ✅ 201
```json
{
  "message": "Kelime ve örnek cümleler başarıyla eklendi",
  "word_id": 1
}
```

**Token olmadan:** ❌ 401
```json
{
  "detail": "Geçersiz veya süresi dolmuş token"
}
```

---

## 5. Resim Yükleme (POST /words/{word_id}/image)

**Endpoint:** `POST /words/1/image`

**Header:**
```
Authorization: Bearer {access_token}
```

**Form Data:**
- `file`: [apple.jpg dosyası]

**Token ile:** ✅ 200
```json
{
  "message": "Resim başarıyla yüklendi",
  "picture_url": "/uploads/word_1.jpg"
}
```

**Token olmadan:** ❌ 401

---

## 6. Quiz Daily (GET /quiz/daily)

**Endpoint:** `GET /quiz/daily`

**Header:**
```
Authorization: Bearer {access_token}
```

**Beklenen Yanıt:** ✅ 200
```json
{
  "user_id": 1,
  "total_questions": 1,
  "due_count": 0,
  "new_count": 1,
  "questions": [
    {
      "word_id": 1,
      "eng_word": "apple",
      "picture_url": "/uploads/word_1.jpg",
      "options": ["elma", "kitap", "kalem", "muz"]
    }
  ]
}
```

**Token olmadan:** ❌ 401

---

## 7. Quiz Cevap Gönderme (POST /quiz/answer)

**Endpoint:** `POST /quiz/answer`

**Header:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "word_id": 1,
  "selected_answer": "elma"
}
```

**Doğru cevap:** ✅ 200
```json
{
  "user_id": 1,
  "word_id": 1,
  "is_correct": true,
  "correct_answer": "elma",
  "current_stage": 1,
  "next_review_at": "2026-05-04T...",
  "is_learned": false,
  "consecutive_correct": 1,
  "reset_count": 0
}
```

**Yanlış cevap:** ✅ 200 (is_correct: false)
```json
{
  "user_id": 1,
  "word_id": 1,
  "is_correct": false,
  "correct_answer": "elma",
  "current_stage": 0,
  "next_review_at": "2026-05-04T...",
  "is_learned": false,
  "consecutive_correct": 0,
  "reset_count": 1
}
```

---

## 8. Logout (POST /auth/logout)

**Endpoint:** `POST /auth/logout`

**Beklenen Yanıt:** ✅ 200
```json
{
  "message": "Çıkış yapıldı. Lütfen frontend tarafındaki token'ı silin."
}
```

---

## 9. Şifre Sıfırlama Flow

### 9a. Forgot Password (POST /auth/forgot-password)

**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "test@example.com"
}
```

**Beklenen Yanıt:** ✅ 200
```json
{
  "message": "Sıfırlama kodu oluşturuldu (Demo)",
  "reset_token": "dGVzdHRva2VuMTIzNDU2..."
}
```

### 9b. Reset Password (POST /auth/reset-password)

**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "reset_token": "dGVzdHRva2VuMTIzNDU2...",
  "new_password": "NewPassword@2024"
}
```

**Beklenen Yanıt:** ✅ 200
```json
{
  "message": "Şifreniz başarıyla güncellendi"
}
```

---

## Test Sonuçları Özeti

| Test Adı | Status | Notlar |
|----------|--------|--------|
| Register | ✅ | - |
| Login JWT | ✅ | Token döndürülüyor |
| /me Endpoint | ✅ | Auth korunuyor |
| POST /words | ✅ | Auth korunuyor |
| POST /words/{id}/image | ✅ | Auth korunuyor |
| GET /quiz/daily | ✅ | Auth korunuyor |
| POST /quiz/answer | ✅ | User ID token'dan alınıyor |
| Logout | ✅ | - |
| Forgot Password | ✅ | Demo reset_token dönüyor |
| Reset Password | ✅ | Token ile şifre güncelleniyor |

---

## Not

- Tüm korumalı endpoint'ler `Authorization: Bearer {token}` başlığı gerektirir
- JWT token 60 dakika geçerliliğe sahiptir (.env'de ayarlanabilir)
- User ID, payload'dan değil, **JWT token'dan** alınır (güvenlik için)
