#!/bin/bash
BASE="http://localhost:8000"
H="Content-Type: application/json"

# Login to get token
login_resp=$(curl -s -X POST "$BASE/api/auth/login" -H "$H" -d '{"username":"admin.teamhub","password":"admin123"}')
echo "Login response: $login_resp"
token=$(echo "$login_resp" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $token"

if [ -z "$token" ]; then
  echo "Failed to get token, exiting"
  exit 1
fi

AUTH="Authorization: Bearer $token"

check() {
  method=$1
  path=$2
  body=$3
  if [ -n "$body" ]; then
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" -H "$AUTH" -H "$H" -d "$body")
  else
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" -H "$AUTH")
  fi
  code=$(echo "$resp" | tail -1)
  body_preview=$(echo "$resp" | sed '$d' | head -c 100)
  printf "%-6s %-50s %-6s %s\n" "$method" "$path" "$code" "$body_preview"
}

echo ""
echo "METHOD ENDPOINT                                         CODE   RESPONSE"
echo "=========================================================================="
check GET  "/api/auth/me" ""
check GET  "/api/announcements" ""
check GET  "/api/announcements?sort=smart" ""
check POST "/api/announcements" '{"title":"Test API","content":"Testing all endpoints","category":"general"}'
check GET  "/api/announcements/1" ""
check GET  "/api/announcements/1/versions" ""
check GET  "/api/announcements/1/links" ""
check POST "/api/announcements/1/links" '{"target_type":"url","target_url":"https://example.com","title":"Example"}'
check POST "/api/announcements/bulk" '{"ids":[1],"action":"pin"}'
check POST "/api/announcements/archive-expired" '{"action":"archive"}'
check GET  "/api/tasks" ""
check POST "/api/tasks" '{"title":"Test task","source_announcement_id":1}'
check GET  "/api/comments?target_type=announcement&target_id=1" ""
check POST "/api/comments" '{"target_type":"announcement","target_id":1,"content":"test comment"}'
check GET  "/api/reactions?target_type=announcement&target_id=1" ""
check POST "/api/reactions" '{"target_type":"announcement","target_id":1,"reaction_type":"ack"}'
check GET  "/api/dashboard/stats" ""
check GET  "/api/dashboard/ticker" ""
check GET  "/api/team" ""
check GET  "/api/admin/users" ""
check GET  "/api/admin/stats" ""
check GET  "/api/admin/activity" ""
check GET  "/api/categories" ""
check GET  "/api/push/vapid-public-key" ""
check POST "/api/fetch-title" '{"url":"https://example.com"}'
check POST "/api/seed" '{}'
