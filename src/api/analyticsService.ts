import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export const analyticsService = {
  async trackEvent(eventName: string, metadata: Record<string, unknown> = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          event_name: eventName,
          user_id: session?.user?.id || null,
          metadata: metadata
        });
      if (error) {
        logger.error("Analytics tracking error:", error);
      }
    } catch (err) {
      logger.error("Failed to track event:", err);
    }
  }
};
