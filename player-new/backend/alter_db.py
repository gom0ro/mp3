import sqlite3

def upgrade():
    conn = sqlite3.connect('vibeplayer.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE tracks ADD COLUMN waveform JSON;")
        print("Added waveform column")
    except Exception as e:
        print("Waveform column might exist:", e)

    try:
        cursor.execute("ALTER TABLE tracks ADD COLUMN loudness FLOAT;")
        print("Added loudness column")
    except Exception as e:
        print("Loudness column might exist:", e)
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade()
