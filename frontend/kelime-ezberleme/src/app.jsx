import { useEffect, useState } from "react";
import { getWordsAPI, createWordAPI } from "./services/wordService";

function App() {
  const [words, setWords] = useState([]);
  const [message, setMessage] = useState("");

  async function loadWords() {
    try {
      const data = await getWordsAPI();
      setWords(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleAddWord() {
    try {
      await createWordAPI({
        eng_word: "apple",
        tur_word: "elma",
        picture_url: null,
        audio_url: null,
        topic: "food",
        difficulty_level: 1,
      });

      setMessage("Kelime eklendi.");
      loadWords();
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadWords();
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <h1>Kelime Ezberleme Sistemi</h1>

      <button onClick={handleAddWord}>Test kelime ekle</button>

      {message && <p>{message}</p>}

      <h2>Kelimeler</h2>

      <ul>
        {words.map((word) => (
          <li key={word.id}>
            {word.eng_word} - {word.tur_word}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
