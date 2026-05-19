from pathlib import Path
import shutil
import sqlite3


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "kelime_ezberleme.db"


def table_exists(cursor, table_name):
    cursor.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    )
    return cursor.fetchone() is not None


def column_exists(cursor, table_name, column_name):
    if not table_exists(cursor, table_name):
        return False

    cursor.execute(f"PRAGMA table_info({table_name})")
    return any(row[1] == column_name for row in cursor.fetchall())


def add_column_if_missing(cursor, table_name, column_definition):
    column_name = column_definition.split()[0]

    if table_exists(cursor, table_name) and not column_exists(cursor, table_name, column_name):
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_definition}")
        print(f"Eklendi: {table_name}.{column_name}")


def print_schema(cursor, table_name):
    cursor.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    )
    row = cursor.fetchone()

    if row:
        print(f"\n{table_name} şeması:")
        print(row[0])


def main():
    if not DB_PATH.exists():
        print(f"DB bulunamadı: {DB_PATH}")
        print("Önce backend'i bir kez çalıştırıp DB oluşmasını sağla.")
        return

    backup_path = DB_PATH.with_suffix(".db.backup")
    shutil.copy2(DB_PATH, backup_path)
    print(f"Yedek alındı: {backup_path}")

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    cursor.execute("PRAGMA foreign_keys = OFF")

    add_column_if_missing(cursor, "words", "created_by_user_id INTEGER NULL")

    tables_to_drop = [
        "wordle_guesses",
        "wordle_games",
        "word_chain_stories",
        "report_snapshots",
        "quiz_answers",
        "quiz_sessions",
        "user_settings",
    ]

    for table_name in tables_to_drop:
        cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
        print(f"Silindi/yok sayıldı: {table_name}")

    cursor.execute(
        """
        CREATE TABLE user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            daily_new_word_count INTEGER NOT NULL DEFAULT 10,
            quiz_question_count INTEGER NOT NULL DEFAULT 10,
            show_instant_feedback BOOLEAN NOT NULL DEFAULT 1,
            allow_skip_questions BOOLEAN NOT NULL DEFAULT 1,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE quiz_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_type VARCHAR(30) NOT NULL DEFAULT 'daily',
            total_questions INTEGER NOT NULL DEFAULT 0,
            correct_count INTEGER NOT NULL DEFAULT 0,
            wrong_count INTEGER NOT NULL DEFAULT 0,
            skipped_count INTEGER NOT NULL DEFAULT 0,
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            finished_at TIMESTAMP NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE quiz_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_session_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            word_id INTEGER NOT NULL,
            selected_answer TEXT NULL,
            correct_answer TEXT NOT NULL,
            is_correct BOOLEAN NOT NULL,
            question_type VARCHAR(30) NOT NULL DEFAULT 'multiple_choice',
            response_time_ms INTEGER NULL,
            answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quiz_session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE report_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            report_date DATE NOT NULL DEFAULT CURRENT_DATE,
            total_learned_words INTEGER NOT NULL DEFAULT 0,
            success_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
            weak_topics_json TEXT NULL,
            strong_topics_json TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE wordle_games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            target_word_id INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            attempt_count INTEGER NOT NULL DEFAULT 0,
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            finished_at TIMESTAMP NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (target_word_id) REFERENCES words(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE wordle_guesses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            guess VARCHAR(150) NOT NULL,
            feedback_json TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES wordle_games(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE word_chain_stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            prompt_words_json TEXT NOT NULL,
            story_text TEXT NOT NULL,
            summary_text TEXT NULL,
            image_url TEXT NULL,
            llm_model_name VARCHAR(100) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        INSERT OR IGNORE INTO user_settings (
            user_id,
            daily_new_word_count,
            quiz_question_count,
            show_instant_feedback,
            allow_skip_questions
        )
        SELECT
            id,
            COALESCE(daily_quiz_limit, 10),
            COALESCE(daily_quiz_limit, 10),
            1,
            1
        FROM users
        """
    )

    cursor.execute("SELECT id FROM users ORDER BY id LIMIT 1")
    user_row = cursor.fetchone()

    cursor.execute("SELECT id FROM words ORDER BY id LIMIT 1")
    word_row = cursor.fetchone()

    if user_row and word_row and table_exists(cursor, "user_word_progress"):
        user_id = user_row[0]
        word_id = word_row[0]

        cursor.execute(
            """
            INSERT INTO user_word_progress (
                user_id,
                word_id,
                current_stage,
                next_review_at,
                is_learned,
                consecutive_correct,
                last_answer_correct,
                reset_count
            )
            VALUES (?, ?, 6, NULL, 1, 6, 1, 0)
            ON CONFLICT(user_id, word_id)
            DO UPDATE SET
                current_stage = 6,
                next_review_at = NULL,
                is_learned = 1,
                consecutive_correct = 6,
                last_answer_correct = 1,
                reset_count = 0
            """,
            (user_id, word_id),
        )

        print(f"Demo için öğrenilmiş kelime ayarlandı. user_id={user_id}, word_id={word_id}")

    cursor.execute("PRAGMA foreign_keys = ON")

    connection.commit()

    for table_name in [
        "user_settings",
        "quiz_sessions",
        "quiz_answers",
        "wordle_games",
        "wordle_guesses",
        "word_chain_stories",
    ]:
        print_schema(cursor, table_name)

    connection.close()

    print("\nSQLite runtime tabloları düzeltildi.")
    print("Şimdi backend'i tekrar başlat.")


if __name__ == "__main__":
    main()