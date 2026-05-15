import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const env = { ...readEnvFile(join(process.cwd(), ".env.local")), ...process.env };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const checks = [
  { label: "profiles", table: "profiles", columns: "id,role,status" },
  { label: "members", table: "members", columns: "id,profile_id,base_daily_rate" },
  { label: "shift_availabilities", table: "shift_availabilities", columns: "id,member_id,work_date,availability" },
  { label: "projects", table: "projects", columns: "id,work_date,title,status,required_people" },
  { label: "assignments.detail_text", table: "assignments", columns: "id,project_id,member_id,daily_rate,detail_text,status" },
  { label: "transportation_expenses", table: "transportation_expenses", columns: "id,assignment_id,member_id,amount,status" },
  { label: "monthly_settlements", table: "monthly_settlements", columns: "id,member_id,target_month,status" },
  { label: "monthly_settlement_items", table: "monthly_settlement_items", columns: "id,monthly_settlement_id,assignment_id,subtotal" }
];

const results = [];

for (const check of checks) {
  const { data, error, count } = await supabase
    .from(check.table)
    .select(check.columns, { count: "exact" })
    .limit(1);

  results.push({
    check: check.label,
    ok: !error,
    visibleRows: count ?? null,
    sampledRows: data?.length ?? 0,
    error: error ? `${error.code ?? "NO_CODE"} ${error.message}` : ""
  });
}

const { data: userData, error: userError } = await supabase.auth.getUser();
const missingSession = userError?.status === 400 && userError.message === "Auth session missing!";
results.push({
  check: "auth.getUser",
  ok: !userError || missingSession,
  visibleRows: userData.user ? 1 : 0,
  sampledRows: userData.user ? 1 : 0,
  error: missingSession ? "expected anonymous session" : userError ? `${userError.status ?? "NO_STATUS"} ${userError.message}` : ""
});

console.table(results);

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  process.exitCode = 1;
}

function readEnvFile(path) {
  const values = {};
  if (!existsSync(path)) {
    return values;
  }

  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    values[key] = rawValue.replace(/^["']|["']$/g, "");
  }
  return values;
}
