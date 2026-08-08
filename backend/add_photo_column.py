from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE students ADD COLUMN photo_path VARCHAR'))
        conn.commit()
        print('Column photo_path added successfully to students table')
    except Exception as e:
        if 'already exists' in str(e).lower() or 'duplicate column' in str(e).lower():
            print('Column photo_path already exists')
        else:
            print(f'Error: {e}')
