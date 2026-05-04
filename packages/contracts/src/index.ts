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
