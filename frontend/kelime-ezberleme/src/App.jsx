import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";

import Landing from "./pages/Landing/Landing";

import AppLayout from "./components/AppLayout/AppLayout";
import Home from "./pages/Home/Home";
import ModulePage from "./pages/ModulePage/ModulePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />

          <Route
            path="/words"
            element={
              <ModulePage
                icon="📚"
                title="Kelimelerim"
                description="Eklenen kelimeleri, anlamlarını, örnek cümlelerini ve tekrar durumlarını burada görüntüleyebilirsin."
                buttonText="Quiz'e Git"
                buttonPath="/quiz"
              />
            }
          />

          <Route
            path="/add-word"
            element={
              <ModulePage
                icon="➕"
                title="Kelime Ekle"
                description="İngilizce kelime, Türkçe karşılığı, örnek cümleler ve görsel bilgisi ekleme ekranı burada olacak."
                buttonText="Kelimelerimi Gör"
                buttonPath="/words"
              />
            }
          />

          <Route
            path="/quiz"
            element={
              <ModulePage
                icon="🧠"
                title="Quiz"
                description="6 sefer tekrar prensibine göre soruların geldiği ana sınav ekranı burada çalışacak."
                buttonText="Ana Sayfaya Dön"
                buttonPath="/home"
              />
            }
          />

          <Route
            path="/puzzle"
            element={
              <ModulePage
                icon="🧩"
                title="Bulmaca"
                description="Öğrenilen kelimelerden oluşan Wordle benzeri bulmaca modülü burada yer alacak."
                buttonText="Kelimelerimi Gör"
                buttonPath="/words"
              />
            }
          />

          <Route
            path="/word-chain"
            element={
              <ModulePage
                icon="🔗"
                title="Word Chain"
                description="Seçilen kelimelerden LLM ile hikaye ve görsel üretme modülü burada olacak."
                buttonText="Ana Sayfaya Dön"
                buttonPath="/home"
              />
            }
          />

          <Route
            path="/reports"
            element={
              <ModulePage
                icon="📊"
                title="Analiz Raporu"
                description="Kullanıcının doğru-yanlış oranları, öğrenilen kelime sayısı ve başarı yüzdeleri burada raporlanacak."
                buttonText="Ana Sayfaya Dön"
                buttonPath="/home"
              />
            }
          />

          <Route
            path="/settings"
            element={
              <ModulePage
                icon="⚙️"
                title="Ayarlar"
                description="Günlük yeni kelime sayısı ve quiz tercihleri gibi kişisel ayarlar burada düzenlenecek."
                buttonText="Ana Sayfaya Dön"
                buttonPath="/home"
              />
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;