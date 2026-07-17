"use client";

import { createClient } from "@supabase/supabase-js";

/** Client navigateur (anon key) — dashboard commerçant, soumis au RLS. */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
