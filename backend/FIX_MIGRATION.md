# Fix Migration Issue on AWS

The database already has tables but alembic thinks it needs to create them.

## Solution: Mark current migration as complete

Run this on AWS:

```bash
cd ~/smart-mdm-/backend
source venv/bin/activate

# Mark the latest successful migration in alembic_version table
python3 << EOF
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL')

engine = create_engine(db_url)
with engine.connect() as conn:
    # Check current version
    try:
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        current = result.fetchone()
        print(f"Current version: {current}")
    except:
        print("No alembic_version table")
    
    # Delete and set to last working migration
    conn.execute(text("DELETE FROM alembic_version"))
    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('03d174a7ebfb')"))
    conn.commit()
    print("Set to migration: 03d174a7ebfb (add_indexes)")

print("Now run: python3 -m alembic upgrade head")
EOF

# Now run the new migration
python3 -m alembic upgrade head
```
