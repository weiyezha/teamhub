import requests
import json

BASE = "http://localhost:8000"
DEMO_TOKEN = "demo"
HEADERS = {"Authorization": f"Bearer {DEMO_TOKEN}", "Content-Type": "application/json"}

endpoints = [
    ("GET", "/api/announcements", None),
    ("GET", "/api/announcements?sort=smart&unread_only=false", None),
    ("POST", "/api/announcements", {"title": "Test", "content": "Test content", "category": "general"}),
    ("GET", "/api/announcements/1", None),
    ("GET", "/api/announcements/1/versions", None),
    ("GET", "/api/announcements/1/links", None),
    ("POST", "/api/announcements/1/links", {"target_type": "url", "target_url": "https://example.com", "title": "Example"}),
    ("POST", "/api/announcements/bulk", {"ids": [1], "action": "pin"}),
    ("POST", "/api/announcements/archive-expired", {}),
    ("GET", "/api/tasks", None),
    ("POST", "/api/tasks", {"title": "Test task", "source_announcement_id": 1}),
    ("GET", "/api/reading-list", None),
    ("GET", "/api/push/vapid-public-key", None),
    ("POST", "/api/fetch-title", {"url": "https://example.com"}),
    ("GET", "/api/users", None),
    ("GET", "/api/dashboard/stats", None),
    ("GET", "/api/dashboard/activity", None),
    ("POST", "/api/login", {"username": "admin.teamhub", "password": "admin123"}),
]

print(f"{'METHOD':<7} {'ENDPOINT':<45} {'STATUS':<8} {'RESPONSE'}")
print("=" * 90)
for method, path, body in endpoints:
    url = BASE + path
    try:
        if method == "GET":
            r = requests.get(url, headers=HEADERS, timeout=5)
        elif method == "POST":
            r = requests.post(url, headers=HEADERS, json=body, timeout=5)
        elif method == "PUT":
            r = requests.put(url, headers=HEADERS, json=body, timeout=5)
        elif method == "DELETE":
            r = requests.delete(url, headers=HEADERS, timeout=5)
        
        preview = ""
        try:
            j = r.json()
            if isinstance(j, dict) and "detail" in j:
                preview = str(j["detail"])[:40]
            elif isinstance(j, dict) and "message" in j:
                preview = str(j["message"])[:40]
            elif isinstance(j, list):
                preview = f"list[{len(j)}]"
            else:
                preview = str(j)[:40]
        except:
            preview = r.text[:40]
        
        ok = "OK" if r.status_code < 400 else f"ERR{r.status_code}"
        print(f"{method:<7} {path:<45} {ok:<8} {preview}")
    except Exception as e:
        print(f"{method:<7} {path:<45} {'FAIL':<8} {str(e)[:40]}")
