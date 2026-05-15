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

const accounts = [
  {
    label: "admin",
    email: env.QA_ADMIN_EMAIL,
    password: env.QA_ADMIN_PASSWORD,
    expectedRole: "admin",
    checks: [
      { label: "profiles visible", table: "profiles", columns: "id,role,status" },
      { label: "members visible", table: "members", columns: "id,profile_id" },
      { label: "projects visible", table: "projects", columns: "id,work_date,status" },
      { label: "assignments visible", table: "assignments", columns: "id,project_id,member_id,status,detail_text" },
      { label: "expenses visible", table: "transportation_expenses", columns: "id,assignment_id,member_id,status" }
    ]
  },
  {
    label: "member",
    email: env.QA_MEMBER_EMAIL,
    password: env.QA_MEMBER_PASSWORD,
    expectedRole: "member",
    checks: [
      { label: "own profile visible", table: "profiles", columns: "id,role,status" },
      { label: "own member row visible", table: "members", columns: "id,profile_id" },
      { label: "own shifts visible", table: "shift_availabilities", columns: "id,member_id,work_date,availability" },
      { label: "own confirmed assignments visible", table: "assignments", columns: "id,project_id,member_id,status,detail_text" },
      { label: "own expenses visible", table: "transportation_expenses", columns: "id,assignment_id,member_id,status" }
    ]
  }
];

const runnableAccounts = accounts.filter((account) => account.email && account.password);

if (runnableAccounts.length === 0) {
  console.error("No QA credentials provided.");
  console.error("Set QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD and/or QA_MEMBER_EMAIL/QA_MEMBER_PASSWORD, then rerun this script.");
  process.exit(1);
}

const allResults = [];

for (const account of runnableAccounts) {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password
  });

  if (signInError || !authData.user) {
    allResults.push({
      account: account.label,
      check: "signInWithPassword",
      ok: false,
      visibleRows: null,
      sampledRows: 0,
      error: signInError?.message ?? "No user returned"
    });
    continue;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,role,status")
    .eq("id", authData.user.id)
    .single();

  allResults.push({
    account: account.label,
    check: `profile role=${account.expectedRole}`,
    ok: !profileError && profile?.role === account.expectedRole && profile.status === "active",
    visibleRows: profile ? 1 : 0,
    sampledRows: profile ? 1 : 0,
    error: profileError
      ? profileError.message
      : profile?.role === account.expectedRole && profile.status === "active"
        ? ""
        : profile
          ? `role=${profile.role} status=${profile.status}`
          : "No profile"
  });

  for (const check of account.checks) {
    const { data, error, count } = await supabase
      .from(check.table)
      .select(check.columns, { count: "exact" })
      .limit(3);

    allResults.push({
      account: account.label,
      check: check.label,
      ok: !error,
      visibleRows: count ?? null,
      sampledRows: data?.length ?? 0,
      error: error ? `${error.code ?? "NO_CODE"} ${error.message}` : ""
    });
  }

  await supabase.auth.signOut();
}

console.table(allResults);

const failed = allResults.filter((result) => !result.ok);
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
