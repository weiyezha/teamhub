#!/bin/bash
BASE="http://localhost:8000"
TOKEN="demo"
H="Authorization: Bearer $TOKEN"
HC="Content-Type: application/json"

check() {
  method=$1
  path=$2
  body=$3
  if [ -n "$body" ]; then
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" -H "$H" -H "$HC" -d "$body")
  else
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" -H "$H")
  fi
  code=$(echo "$resp" | tail -1)
  body_preview=$(echo "$resp" | sed '$d' | head -c 80)
  printf "%-6s %-45s %-6s %s\n" "$method" "$path" "$code" "$body_preview"
}

echo "METHOD ENDPOINT                                    CODE   RESPONSE"
echo "=================================================================="
check GET  "/api/announcements" ""
check GET  "/api/announcements?sort=smart" ""
check POST "/api/announcements" '{"title":"Test","content":"Test","category":"general"}'
check GET  "/api/announcements/1" ""
check GET  "/api/announcements/1/versions" ""
check GET  "/api/announcements/1/links" ""
check POST "/api/announcements/1/links" '{"target_type":"url","target_url":"https://example.com","title":"Ex"}'
check POST "/api/announcements/bulk" '{"ids":[1],"action":"pin"}'
check POST "/api/announcements/archive-expired" '{"action":"archive"}'
check GET  "/api/tasks" ""
check POST "/api/tasks" '{"title":"Test","source_announcement_id":1}'
check GET  "/api/reading-list" ""
check GET  "/api/push/vapid-public-key" ""
check POST "/api/fetch-title" '{"url":"https://example.com"}'
check GET  "/api/users" ""
check GET  "/api/dashboard/stats" ""
check GET  "/api/dashboard/activity" ""
check POST "/api/login" '{"username":"admin.teamhub","password":"admin123"}'
check GET  "/api/announcements/1/comments" ""
check POST "/api/announcements/1/comments" '{"content":"test"}'
check GET  "/api/announcements/1/reactions" ""
check POST "/api/announcements/1/reactions" '{"reaction_type":"ack"}'
check GET  "/api/announcements/1/read-status" ""
check POST "/api/announcements/1/read" '{}'
