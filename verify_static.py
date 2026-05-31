import sys
import os
import re

sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("🔍 PRE-PUSH VERIFICATION CHECKLIST")
print("=" * 60)

# 1. Check source files exist
print("\n1️⃣ Source Files Exist...")
files_to_check = [
    "backend/auth.py",
    "backend/main.py",
    "backend/schemas.py",
    "backend/quiz.py",
    "backend/database.py",
]

for f in files_to_check:
    if os.path.exists(f):
        print(f"   ✅ {f}")
    else:
        print(f"   ❌ {f} NOT FOUND")

# 2. Check for critical code patterns
print("\n2️⃣ Critical Code Patterns...")
patterns = [
    ("backend/auth.py", r'@router\.get\("/me"', "/auth/me endpoint"),
    ("backend/auth.py", r'response_model=schemas\.Token', "/login returns Token"),
    ("backend/main.py", r'Depends\(get_current_user_id\)', "POST /words auth"),
    ("backend/quiz.py", r'Depends\(get_current_user_id\)', "quiz endpoints auth"),
]

for filepath, pattern, desc in patterns:
    try:
        with open(filepath) as f:
            content = f.read()
            if re.search(pattern, content):
                print(f"   ✅ {desc}")
            else:
                print(f"   ❌ {desc} NOT FOUND")
    except Exception as e:
        print(f"   ❌ Error reading {filepath}: {e}")

# 3. Check .env
print("\n3️⃣ .env Configuration...")
if os.path.exists(".env"):
    print("   ✅ .env file exists")
    with open(".env") as f:
        content = f.read()
        if "SECRET_KEY" in content and "DATABASE_URL" in content:
            print("   ✅ .env has required keys")
        else:
            print("   ❌ .env missing required keys")
else:
    print("   ❌ .env file NOT found")

# 4. Check documentation
print("\n4️⃣ Documentation Files...")
docs = ["REFACTOR_SUMMARY.md", "TESTING.md", ".env.example"]
for doc in docs:
    if os.path.exists(doc):
        print(f"   ✅ {doc} exists")
    else:
        print(f"   ❌ {doc} NOT found")

# 5. Check .gitignore
print("\n5️⃣ .gitignore Configuration...")
if os.path.exists(".gitignore"):
    with open(".gitignore") as f:
        content = f.read()
        if ".env" in content:
            print("   ✅ .env is in .gitignore (safe from secrets leak)")
        else:
            print("   ⚠️  .env NOT in .gitignore - ADD IT!")
else:
    print("   ❌ .gitignore not found")

print("\n" + "=" * 60)
print("✅ PRE-PUSH CHECKLIST COMPLETE!")
print("=" * 60)
