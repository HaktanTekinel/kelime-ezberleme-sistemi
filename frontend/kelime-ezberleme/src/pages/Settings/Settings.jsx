import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getUserSettingsAPI,
  updateUserSettingsAPI,
} from "../../services/settingsService";
import "./Settings.css";

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function pickValue(source, keys) {
  if (!source) {
    return "";
  }

  for (const key of keys) {
    if (hasValue(source[key])) {
      return source[key];
    }
  }

  return "";
}

function normalizeSettings(data) {
  const settings = data?.settings || data?.user_settings || data || {};

  return {
    dailyNewWordCount: pickValue(settings, [
      "daily_new_word_count",
      "dailyNewWordCount",
      "daily_quiz_limit",
      "dailyQuizLimit",
      "quiz_question_count",
      "quizQuestionCount",
    ]),
  };
}

function Settings() {
  const [settings, setSettings] = useState({
    dailyNewWordCount: "",
  });

  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveMessage, setSaveMessage] = useState({
    type: "",
    text: "",
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setSaveMessage({ type: "", text: "" });

    try {
      const data = await getUserSettingsAPI();
      const normalized = normalizeSettings(data);

      setSettings(normalized);
      setOriginalSettings(normalized);
    } catch (err) {
      setOriginalSettings(null);
      setSettings({
        dailyNewWordCount: "",
      });

      setLoadError(
        err.message ||
          "Ayarlar şu anda yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isChanged = useMemo(() => {
    if (!originalSettings) {
      return hasValue(settings.dailyNewWordCount);
    }

    return (
      String(settings.dailyNewWordCount) !==
      String(originalSettings.dailyNewWordCount)
    );
  }, [settings, originalSettings]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: value,
    }));

    setSaveMessage({
      type: "",
      text: "",
    });
  };

  const validateSettings = () => {
    const dailyCount = Number(settings.dailyNewWordCount);

    if (!settings.dailyNewWordCount) {
      return "Günlük yeni kelime sayısı boş bırakılamaz.";
    }

    if (!Number.isInteger(dailyCount)) {
      return "Günlük yeni kelime sayısı tam sayı olmalıdır.";
    }

    if (dailyCount < 1) {
      return "Günlük yeni kelime sayısı en az 1 olmalıdır.";
    }

    if (dailyCount > 100) {
      return "Günlük yeni kelime sayısı en fazla 100 olabilir.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateSettings();

    if (validationError) {
      setSaveMessage({
        type: "error",
        text: validationError,
      });
      return;
    }

    setSaving(true);
    setSaveMessage({
      type: "",
      text: "",
    });

    const dailyCount = Number(settings.dailyNewWordCount);

    try {
      const payload = {
        daily_new_word_count: dailyCount,
        daily_quiz_limit: dailyCount,
      };

      await updateUserSettingsAPI(payload);

      const updatedSettings = {
        dailyNewWordCount: dailyCount,
      };

      setSettings(updatedSettings);
      setOriginalSettings(updatedSettings);

      setSaveMessage({
        type: "success",
        text: "Ayarlar başarıyla kaydedildi.",
      });
    } catch (err) {
      setSaveMessage({
        type: "error",
        text:
          err.message ||
          "Ayarlar kaydedilemedi. Lütfen tekrar deneyin.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div>
          <h2>Ayarlar</h2>
          <p>
            Günlük çalışma hedefini belirle ve kelime öğrenme planını kendi
            hızına göre düzenle.
          </p>
        </div>

        <button type="button" onClick={loadSettings} disabled={loading}>
          {loading ? "Yükleniyor..." : "Yenile"}
        </button>
      </section>

      {loadError && (
        <section className="settings-alert error">
          <div>
            <h3>Ayarlar yüklenemedi</h3>
            <p>{loadError}</p>
          </div>
        </section>
      )}

      <section className="settings-grid">
        <form className="settings-card" onSubmit={handleSubmit}>
          <div className="settings-card-header">
            <div>
              <p>Çalışma tercihi</p>
              <h3>Günlük yeni kelime sayısı</h3>
            </div>

            <div className="settings-icon">⚙️</div>
          </div>

          {loading ? (
            <div className="settings-loading-box">
              Ayarlar yükleniyor...
            </div>
          ) : (
            <>
              <label className="settings-field">
                <span>Günlük yeni kelime sayısı</span>

                <input
                  type="number"
                  name="dailyNewWordCount"
                  min="1"
                  max="100"
                  value={settings.dailyNewWordCount}
                  onChange={handleChange}
                  placeholder="Örn: 10"
                />
              </label>

              <p className="settings-help-text">
                Bu sayı, günlük kelime çalışma hedefini belirler. İstersen
                daha az kelimeyle düzenli çalışabilir veya hedefini artırabilirsin.
              </p>

              {saveMessage.text && (
                <div className={`settings-alert ${saveMessage.type}`}>
                  <p>{saveMessage.text}</p>
                </div>
              )}

              <div className="settings-actions">
                <button
                  type="button"
                  className="secondary-settings-button"
                  onClick={loadSettings}
                  disabled={saving}
                >
                  Vazgeç
                </button>

                <button
                  type="submit"
                  className="primary-settings-button"
                  disabled={saving || !isChanged}
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </>
          )}
        </form>

        <aside className="settings-info-card">
          <h3>Çalışma hedefi nasıl kullanılır?</h3>

          <div className="settings-info-list">
            <div>
              <strong>Günlük hedef</strong>
              <span>
                Her gün kaç yeni kelimeyle çalışmak istediğini belirler.
              </span>
            </div>

            <div>
              <strong>Düzenli tekrar</strong>
              <span>
                Doğru bildiğin kelimeler tekrar planına alınır ve belirli
                aralıklarla yeniden sorulur.
              </span>
            </div>

            <div>
              <strong>Kalıcı öğrenme</strong>
              <span>
                Bir kelime altı aşamayı başarıyla tamamladığında öğrenilmiş
                kelimeler arasına eklenir.
              </span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default Settings;