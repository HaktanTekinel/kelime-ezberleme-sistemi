import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { clearAuthData } from "../../services/apiClient";
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
  return String(name || "Öğrenci")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const NAV_ITEMS = [
  { path: "/home", label: "Ana Sayfa", icon: "🏠", keywords: ["ana", "home", "panel"] },
  { path: "/words", label: "Kelimelerim", icon: "📚", keywords: ["kelime", "kelimeler", "liste", "words"] },
  { path: "/add-word", label: "Kelime Ekle", icon: "➕", keywords: ["ekle", "yeni", "word add"] },
  { path: "/quiz", label: "Quiz", icon: "🧠", keywords: ["quiz", "test", "sınav", "tekrar"] },
  { path: "/puzzle", label: "Bulmaca", icon: "🧩", keywords: ["bulmaca", "wordle", "oyun"] },
  { path: "/word-chain", label: "Word Chain", icon: "🔗", keywords: ["word chain", "hikaye", "llm", "görsel"] },
  { path: "/reports", label: "Analiz Raporu", icon: "📊", keywords: ["rapor", "analiz", "başarı", "istatistik"] },
  { path: "/settings", label: "Ayarlar", icon: "⚙️", keywords: ["ayar", "ayarlar", "hedef"] },
];

function AppLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const currentUser = getCurrentUser();

  const searchResults = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase("tr-TR");

    if (!search) {
      return [];
    }

    return NAV_ITEMS.filter((item) => {
      const labelMatch = item.label.toLocaleLowerCase("tr-TR").includes(search);

      const keywordMatch = item.keywords.some((keyword) =>
        keyword.toLocaleLowerCase("tr-TR").includes(search)
      );

      return labelMatch || keywordMatch;
    }).slice(0, 5);
  }, [searchText]);

  const handleLogout = () => {
    clearAuthData();
    navigate("/login", { replace: true });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    if (searchResults.length > 0) {
      navigate(searchResults[0].path);
      setSearchText("");
    }
  };

  const handleSearchNavigate = (path) => {
    navigate(path);
    setSearchText("");
  };

  return (
    <div className="app-layout">
      <button
        className="mobile-menu-button"
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Menüyü aç"
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
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Menüyü kapat"
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
          {NAV_ITEMS.map((item) => (
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
          <button className="logout-button" type="button" onClick={handleLogout}>
            Çıkış Yap
          </button>
        </div>
      </aside>

        {sidebarOpen && (
            <button className="sidebar-overlay"type="button"onClick={() => setSidebarOpen(false)}
           aria-label="Menüyü kapat"
            />
            )}

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="topbar-small-text">Kelime öğrenme paneli</p>
            <h1>Merhaba, {currentUser} 👋</h1>
          </div>

          <div className="topbar-actions">
            <form className="search-box" onSubmit={handleSearchSubmit}>
              <span>🔎</span>

              <input
                type="text"
                placeholder="Kelime veya modül ara..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />

              {searchText.trim() && (
                <button
                  type="button"
                  className="search-clear-button"
                  onClick={() => setSearchText("")}
                  aria-label="Aramayı temizle"
                >
                  ×
                </button>
              )}

              {searchText.trim() && (
                <div className="search-results">
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => handleSearchNavigate(item.path)}
                      >
                        <span>{item.icon}</span>
                        <div>
                          <strong>{item.label}</strong>
                          <small>Sayfaya git</small>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="search-empty-result">
                      Sonuç bulunamadı.
                    </div>
                  )}
                </div>
              )}
            </form>

            <div className="topbar-avatar">{getInitials(currentUser)}</div>
          </div>
        </header>

        <Outlet context={{ currentUser }} />
      </main>
    </div>
  );
}

export default AppLayout;