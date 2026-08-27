import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const { data: merchants } = await db.from("merchants").select("id, slug, name");
console.log("commerces :", merchants?.map((m) => m.slug).join(", "));
const { data: promos } = await db
  .from("promos")
  .select("merchant_id, title, message, apple_devices_notified, sent_at")
  .order("sent_at", { ascending: false })
  .limit(10);
console.log("promos enregistrées :", promos?.length ?? 0);
for (const p of promos ?? []) {
  const slug = merchants?.find((m) => m.id === p.merchant_id)?.slug ?? p.merchant_id;
  console.log(` - ${p.sent_at} | ${slug} | apple=${p.apple_devices_notified} | ${p.message.slice(0, 50)}`);
}
