import requests

# Login as a member to get token
login_res = requests.post("http://localhost:8000/api/auth/login", json={
    "username": "member1",
    "password": "member1"
})
print(f"Login status: {login_res.status_code}")
if login_res.status_code != 200:
    print(f"Login error: {login_res.text}")
    # Try other users
    for u, p in [("admin", "admin"), ("member2", "member2"), ("test", "test")]:
        login_res = requests.post("http://localhost:8000/api/auth/login", json={"username": u, "password": p})
        if login_res.status_code == 200:
            print(f"Login success with {u}")
            break
    else:
        print("All login attempts failed")
        exit(1)

token = login_res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# Test /api/auth/me
me_res = requests.get("http://localhost:8000/api/auth/me", headers=headers)
print(f"\n/api/auth/me status: {me_res.status_code}")
me_data = me_res.json()
print(f"User: {me_data.get('user', {}).get('name')} (role={me_data.get('user', {}).get('role')})")
print(f"allowed_modules: {me_data.get('allowed_modules')}")

# Test /api/announcements
ann_res = requests.get("http://localhost:8000/api/announcements", headers=headers)
print(f"\n/api/announcements status: {ann_res.status_code}")
if ann_res.status_code == 200:
    print(f"Announcements count: {len(ann_res.json())}")
else:
    print(f"Error: {ann_res.text}")
