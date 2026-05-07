import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./AppLayout.css";

function getCurrentUser() {
  try {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      return parsedUser.username || parsedUser.name || "Öğrenci";
    }

    return (
      localStorage.getItem("username") ||
      localStorage.getItem("userName") ||
      "Öğrenci"
    );
  } catch {
    return "Öğrenci";
  }
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AppLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUser = getCurrentUser();

  const navItems = [
    { path: "/home", label: "Ana Sayfa", icon: "🏠" },
    { path: "/words", label: "Kelimelerim", icon: "📚" },
    { path: "/add-word", label: "Kelime Ekle", icon: "➕" },
    { path: "/quiz", label: "Quiz", icon: "🧠" },
    { path: "/puzzle", label: "Bulmaca", icon: "🧩" },
    { path: "/word-chain", label: "Word Chain", icon: "🔗" },
    { path: "/reports", label: "Analiz Raporu", icon: "📊" },
    { path: "/settings", label: "Ayarlar", icon: "⚙️" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    localStorage.removeItem("userName");

    navigate("/login", { replace: true });
  };

  return (
    <div className="app-layout">
      <button
        className="mobile-menu-button"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="app-logo">
            <span className="app-logo-number">6</span>
          </div>

          <div>
            <h2>Kelime Hafızam</h2>
            <p>6 tekrar ile öğren</p>
          </div>

          <button
            className="sidebar-close-button"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="profile-card">
          <div className="profile-avatar">{getInitials(currentUser)}</div>

          <div>
            <h3>{currentUser}</h3>
            <p>Aktif öğrenci</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="daily-goal-card">
            <span className="goal-icon">🔥</span>
            <div>
              <strong>Günlük Seri</strong>
              <p>5 gün üst üste çalışma</p>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            Çıkış Yap
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="topbar-small-text">Kelime öğrenme paneli</p>
            <h1>Merhaba, {currentUser} 👋</h1>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <span>🔎</span>
              <input type="text" placeholder="Kelime veya modül ara..." />
            </div>

            <div className="streak-badge">
              <span>🔥</span>
              <strong>5</strong>
            </div>

            <div className="topbar-avatar">{getInitials(currentUser)}</div>
          </div>
        </header>

        <Outlet context={{ currentUser }} />
      </main>
    </div>
  );
}

export default AppLayout;