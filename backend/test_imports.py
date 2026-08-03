import pkgutil
import app
import sys

errors = []
for m in pkgutil.walk_packages(app.__path__, app.__name__ + '.'):
    try:
        __import__(m.name)
    except Exception as e:
        errors.append(f"{m.name}: {e}")

if errors:
    for e in errors:
        print(e)
    sys.exit(1)
print("All imports succeeded!")
