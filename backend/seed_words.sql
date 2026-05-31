-- TEST KELİMELERİ EKLEME
-- Bu dosya sadece test verisi ekler.
-- Aynı kelime varsa tekrar eklemez.

WITH new_words (
    eng_word,
    tur_word,
    picture_url,
    audio_url,
    topic,
    difficulty_level
) AS (
    VALUES
    ('Brain', 'Beyin', '/images/words/brain.jpg', NULL, 'Body', 1),
    ('Night', 'Gece', '/images/words/night.jpg', NULL, 'Time', 1),
    ('Tiger', 'Kaplan', '/images/words/tiger.jpg', NULL, 'Animals', 2),
    ('Robin', 'Kızılgerdan Kuşu', '/images/words/robin.jpg', NULL, 'Animals', 2),
    ('Noble', 'Asil', '/images/words/noble.jpg', NULL, 'Personality', 3),
    ('Apple', 'Elma', '/images/words/apple.jpg', NULL, 'Food', 1),
    ('Book', 'Kitap', '/images/words/book.jpg', NULL, 'Education', 1),
    ('River', 'Nehir', '/images/words/river.jpg', NULL, 'Nature', 2),
    ('Window', 'Pencere', '/images/words/window.jpg', NULL, 'House', 1),
    ('Mountain', 'Dağ', '/images/words/mountain.jpg', NULL, 'Nature', 2)
)
INSERT INTO words (
    eng_word,
    tur_word,
    picture_url,
    audio_url,
    topic,
    difficulty_level,
    is_active,
    created_at,
    updated_at
)
SELECT
    nw.eng_word,
    nw.tur_word,
    nw.picture_url,
    nw.audio_url,
    nw.topic,
    nw.difficulty_level,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM new_words nw
WHERE NOT EXISTS (
    SELECT 1
    FROM words w
    WHERE LOWER(w.eng_word) = LOWER(nw.eng_word)
);

-- TEST ÖRNEK CÜMLELERİ EKLEME
-- Aynı cümle varsa tekrar eklemez.

WITH sample_data (
    eng_word,
    sample_text,
    sample_order
) AS (
    VALUES
    ('Brain', 'The brain controls many functions of the body.', 1),
    ('Brain', 'Reading books is good for your brain.', 2),

    ('Night', 'I studied English words at night.', 1),
    ('Night', 'The sky is dark at night.', 2),

    ('Tiger', 'The tiger is a strong wild animal.', 1),
    ('Tiger', 'A tiger can run very fast.', 2),

    ('Robin', 'A robin was sitting on the tree.', 1),
    ('Robin', 'The robin sang a beautiful song.', 2),

    ('Noble', 'He made a noble decision.', 1),
    ('Noble', 'Helping others is a noble action.', 2),

    ('Apple', 'I eat an apple every morning.', 1),
    ('Apple', 'She bought a red apple from the market.', 2),

    ('Book', 'This book is very useful for learning English.', 1),
    ('Book', 'He opened the book and started reading.', 2),

    ('River', 'The river flows through the city.', 1),
    ('River', 'We walked near the river yesterday.', 2),

    ('Window', 'Please open the window.', 1),
    ('Window', 'The cat looked through the window.', 2),

    ('Mountain', 'The mountain is covered with snow.', 1),
    ('Mountain', 'They climbed the mountain together.', 2)
)
INSERT INTO word_samples (
    word_id,
    sample_text,
    sample_order,
    created_at
)
SELECT
    w.id,
    sd.sample_text,
    sd.sample_order,
    CURRENT_TIMESTAMP
FROM sample_data sd
JOIN words w ON LOWER(w.eng_word) = LOWER(sd.eng_word)
WHERE NOT EXISTS (
    SELECT 1
    FROM word_samples ws
    WHERE ws.word_id = w.id
      AND ws.sample_text = sd.sample_text
);

-- KONTROL SORGUSU
SELECT 
    w.id,
    w.eng_word,
    w.tur_word,
    w.topic,
    w.difficulty_level,
    ws.sample_order,
    ws.sample_text
FROM words w
LEFT JOIN word_samples ws ON ws.word_id = w.id
ORDER BY w.id, ws.sample_order;