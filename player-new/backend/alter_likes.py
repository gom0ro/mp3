import sqlite3

def alter_db():
    conn = sqlite3.connect("vibeplayer.db")
    cursor = conn.cursor()
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN liked_track_ids JSON NOT NULL DEFAULT "[]"')
        print("Added liked_track_ids column to users")
    except sqlite3.OperationalError as e:
        print(f"Error (maybe column exists): {e}")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    alter_db()
