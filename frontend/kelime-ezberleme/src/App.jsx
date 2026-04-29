// src/App.jsx
import React from 'react';
import Login from './pages/Login'; // Login.jsx dosyasını hangi klasöre koyduysan yolu ona göre ayarla

function App() {
  return (
    <div>
      {/* Sadece Login ekranını render ediyoruz */}
      <Login />
    </div>
  );
}

export default App;