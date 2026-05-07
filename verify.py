import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("🔍 PRE-PUSH VERIFICATION CHECKLIST")
print("=" * 60)

# 1. Check imports
print("\n1️⃣ Backend Imports...")
try:
    from backend.main import app
    print("   ✅ backend.main imports OK")
except Exception as e:
    print(f"   ❌ ERROR: {e}")
    sys.exit(1)

# 2. Check routes
print("\n2️⃣ API Routes...")
routes_to_check = [
    ("/auth/register", "POST"),
    ("/auth/login", "POST"),
    ("/auth/me", "GET"),
    ("/auth/logout", "POST"),
    ("/auth/forgot-password", "POST"),
    ("/auth/reset-password", "POST"),
    ("/words", "POST"),
    ("/quiz/daily", "GET"),
    ("/quiz/answer", "POST"),
]

found_routes = {f"{r[0]} {r[1]}": False for r in routes_to_check}
for route in app.routes:
    for check in routes_to_check:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            path_match = check[0] in route.path
            method_match = check[1] in route.methods if route.methods else False
            if path_match and method_match:
                found_routes[f"{check[0]} {check[1]}"] = True

for route, found in found_routes.items():
    status = "✅" if found else "❌"
    print(f"   {status} {route}")

if not all(found_routes.values()):
    print("\n   ⚠️  Some routes missing!")

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
        if ".env" in f.read():
            print("   ✅ .env is in .gitignore (safe from secrets leak)")
        else:
            print("   ⚠️  .env NOT in .gitignore - ADD IT!")

print("\n" + "=" * 60)
print("✅ PRE-PUSH CHECKLIST COMPLETE!")
print("=" * 60)
