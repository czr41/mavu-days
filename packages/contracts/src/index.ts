export {
  MARKETING_SITE_IMAGE_PREFIX,
  MARKETING_SITE_HERO_JPG,
  MARKETING_SITE_1BHK_JPG,
  MARKETING_SITE_2BHK_JPG,
  MARKETING_SITE_FULL_FARM_JPG,
  canonicalizeMarketingSitePath,
} from './marketing-static-paths.js';

/** OTA / listing platform integration contract (implementations live in apps/api or future packages). */
export interface CalendarEvent {
  uid: string;
  startUtc: Date;
  endUtc: Date;
  summary?: string;
}

export interface ChannelConnector {
  readonly channelId: string;
  fetchExternalCalendar(icalUrl: string): Promise<CalendarEvent[]>;
}
