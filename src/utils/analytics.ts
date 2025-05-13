
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent = {
  event_type: string;
  url: string;
  metadata?: Record<string, any>;
}

export const trackEvent = async (event: AnalyticsEvent) => {
  try {
    // Get user agent and referrer from browser
    const userAgent = navigator.userAgent;
    const referrer = document.referrer;

    // Track event in Supabase
    const { error } = await supabase.from('analytics_events').insert({
      event_type: event.event_type,
      url: event.url,
      user_agent: userAgent,
      referrer: referrer,
      metadata: event.metadata || {}
    });

    if (error) {
      console.error("Error tracking event:", error);
    }
  } catch (error) {
    // Silent fail - we don't want analytics to break the app
    console.error("Analytics error:", error);
  }
};

// Hook for page view tracking
export const usePageViewTracking = () => {
  return (url: string, metadata?: Record<string, any>) => {
    trackEvent({
      event_type: 'page_view',
      url,
      metadata
    });
  };
};

// Track button clicks
export const trackButtonClick = (buttonName: string, metadata?: Record<string, any>) => {
  trackEvent({
    event_type: 'button_click',
    url: window.location.href,
    metadata: { button: buttonName, ...metadata }
  });
};

// Track form submissions
export const trackFormSubmission = (formName: string, metadata?: Record<string, any>) => {
  trackEvent({
    event_type: 'form_submission',
    url: window.location.href,
    metadata: { form: formName, ...metadata }
  });
};
