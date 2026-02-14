#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! curl -sSf http://127.0.0.1:3010 >/dev/null 2>&1; then
  RBAC_BOOTSTRAP_ADMIN_USER_ID=dogfood-admin AEI_TEMPORAL_EXECUTION_ENABLED=1 PORT=3010 npm run start >/tmp/ari-start.log 2>&1 &
  sleep 4
fi

cat >/tmp/exec-payload.json <<'JSON'
{"rule_set_id":"rule-dogfood-f03","assignment_plan":[{"id":"task-api-1","assigned_agent_id_or_pool":"agent-api-a","estimated_cost":0.05,"estimated_duration":0.2},{"id":"task-api-2","assigned_agent_id_or_pool":"agent-api-b","estimated_cost":0.07,"estimated_duration":0.3}],"estimated_cost":0.12,"estimated_duration":1,"success_probability":88}
JSON

post_response="$(curl -sS -X POST http://127.0.0.1:3010/api/executions \
  -H x-project-id:project-default \
  -H x-user-id:dogfood-admin \
  -H content-type:application/json \
  --data @/tmp/exec-payload.json)"

echo "$post_response" >/tmp/exec-post.json
execution_id="$(echo "$post_response" | sed -n 's/.*"execution_id":"\([^"]*\)".*/\1/p')"
if [[ -z "$execution_id" ]]; then
  echo "POST_RESPONSE:$post_response"
  echo "Failed to parse execution_id"
  exit 1
fi

sleep 3
get_response="$(curl -sS http://127.0.0.1:3010/api/executions \
  -H x-project-id:project-default \
  -H x-user-id:dogfood-admin)"
execution_row="$(echo "$get_response" | python3 -c 'import json,sys; data=json.load(sys.stdin); target=open("/tmp/exec-post.json").read(); exec_id=json.loads(target)["execution_id"]; rows=[e for e in data.get("executions",[]) if e.get("execution_id")==exec_id]; print(json.dumps(rows[0] if rows else {}))')"

echo "$get_response" >/tmp/exec-get.json
echo "POST_RESPONSE:$post_response"
echo "GET_RESPONSE:$get_response"
echo "MATCHED_EXECUTION:$execution_row"
