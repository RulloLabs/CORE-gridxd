import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HistoryEntry {
  id: string;
  project_name: string;
  icon_count: number;
  resolution: string;
  used_backend: boolean;
  thumbnail: string | null;
  created_at: string;
}

/** Compress a dataUrl to a small base64 thumbnail (max 80px) */
async function makeThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const SIZE = 80;
      const ratio = Math.min(SIZE / img.width, SIZE / img.height);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * ratio);
      c.height = Math.round(img.height * ratio);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl); // fallback, keep original
    img.src = dataUrl;
  });
}

export function useProcessingHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableReady, setTableReady] = useState<boolean | null>(null); // null = unchecked

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("processing_history")
        .select("id, project_name, icon_count, resolution, used_backend, thumbnail, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        // Table not created yet — silently degrade
        setTableReady(false);
        setHistory([]);
      } else {
        setTableReady(true);
        setHistory((data as HistoryEntry[]) ?? []);
      }
    } catch {
      setTableReady(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const saveToHistory = useCallback(
    async (entry: {
      project_name: string;
      icon_count: number;
      resolution: string;
      used_backend: boolean;
      firstIconDataUrl?: string;
    }) => {
      if (!user || tableReady === false) return;

      let thumbnail: string | null = null;
      if (entry.firstIconDataUrl) {
        try {
          thumbnail = await makeThumbnail(entry.firstIconDataUrl);
        } catch {
          thumbnail = null;
        }
      }

      try {
        const { error } = await supabase.from("processing_history").insert({
          user_id: user.id,
          project_name: entry.project_name || "Sin nombre",
          icon_count: entry.icon_count,
          resolution: entry.resolution,
          used_backend: entry.used_backend,
          thumbnail,
        });
        if (!error) {
          // Optimistic update — prepend to local state
          fetchHistory();
        }
      } catch {
        // Fail silently — history is non-critical
      }
    },
    [user, tableReady, fetchHistory]
  );

  const deleteEntry = useCallback(async (id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
    try {
      await supabase.from("processing_history").delete().eq("id", id);
    } catch {
      // revert on failure
      fetchHistory();
    }
  }, [fetchHistory]);

  return { history, loading, tableReady, saveToHistory, deleteEntry, refetch: fetchHistory };
}
