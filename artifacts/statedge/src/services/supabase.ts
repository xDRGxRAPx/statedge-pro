import { createClient } from "@supabase/supabase-js";
import type { HistoryItem } from "../utils/types";

const SUPABASE_URL = "https://sixhmydiybvzsrkexrsl.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpeGhteWRpeWJ2enNya2V4cnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njc1NTQsImV4cCI6MjA5NTE0MzU1NH0.VV2Pe8U6gV7R5C6fDwHOmZq_LVVWnkBrk-I7ZUnzEVo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchDoubleHistory(limit = 1000): Promise<HistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from("roulette_history")
      .select("id,color,number,created_at")
      .lte("created_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro Double:", error);
      return [];
    }

    return (data || [])
      .map((item: any) => ({
        id: String(item.id),
        game_type: "double",
        color: item.color,
        number: item.number,
        multiplier: null,
        created_at: item.created_at,
      }))
      .reverse();
  } catch (err) {
    console.error("Erro fetchDoubleHistory:", err);
    return [];
  }
}

export async function fetchCrashHistory(limit = 1000): Promise<HistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from("crash_history")
      .select("id,multiplier,created_at")
      .lte("created_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro Crash:", error);
      return [];
    }

    return (data || [])
      .map((item: any) => ({
        id: String(item.id),
        game_type: "crash",
        color: null,
        number: null,
        multiplier: Number(item.multiplier),
        created_at: item.created_at,
      }))
      .reverse();
  } catch (err) {
    console.error("Erro fetchCrashHistory:", err);
    return [];
  }
}

export async function fetchHistory(limit = 1000): Promise<HistoryItem[]> {
  return fetchDoubleHistory(limit);
}