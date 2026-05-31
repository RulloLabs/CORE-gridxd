import { supabase } from "@/integrations/supabase/client";

/**
 * Service to handle Analytics tracking natively in Supabase
 */
export const analyticsService = {
  /**
   * Tracks an event in the analytics_events table
   */
  async trackEvent(eventName: string, metadata: Record<string, any> = {}) {
    try {
      // Get current user if available to attach to the event
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          event_name: eventName,
          user_id: session?.user?.id || null,
          metadata: metadata
        });

      if (error) {
        console.error("Analytics tracking error:", error);
      }
    } catch (err) {
      // Fail silently to avoid breaking UX for analytics errors
      console.error("Failed to track event:", err);
    }
  }
};
