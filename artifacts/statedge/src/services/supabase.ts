import { createClient } from "@supabase/supabase-js";
import type { HistoryItem } from "../utils/types";

const SUPABASE_URL = "https://zjjqcnqgsojcqogsutmj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqanFjbnFnc29qY3FvZ3N1dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDg5MzgsImV4cCI6MjA5NDg4NDkzOH0.cpaqhJqO4NoEuJiMEOgQZ4kD7iS5W_kn36eFxq2xrJg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchHistory(limit = 200): Promise<HistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from("history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data?.length) return [];

    return (data as HistoryItem[]).reverse();
  } catch {
    return [];
  }
}

export async function fetchDoubleHistory(limit = 150): Promise<HistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from("history")
      .select("*")
      .eq("game_type", "double")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data?.length) return [];
    return (data as HistoryItem[]).reverse();
  } catch {
    return [];
  }
}

export async function fetchCrashHistory(limit = 150): Promise<HistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from("history")
      .select("*")
      .eq("game_type", "crash")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data?.length) return [];
    return (data as HistoryItem[]).reverse();
  } catch {
    return [];
  }
}
