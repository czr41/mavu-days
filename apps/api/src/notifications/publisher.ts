import nodemailer from 'nodemailer';
import type { Booking, Organization, RentableUnit } from '@prisma/client';

export type NotificationPayload = {
  to: string;
  subject: string;
  text: string;
};

/** Outbound notifications (email now; WhatsApp in Phase 2). */
export interface NotificationPublisher {
  send(payload: NotificationPayload): Promise<void>;
  notifyBookingConfirmed(input: {
    organization: Pick<Organization, 'name'>;
    booking: Pick<Booking, 'guestName' | 'guestEmail' | 'guestPhone' | 'checkInUtc' | 'checkOutUtc'>;
    unit: Pick<RentableUnit, 'name'>;
    caretakerEmail?: string;
  }): Promise<void>;
}

export class ConsoleNotificationPublisher implements NotificationPublisher {
  async send(payload: NotificationPayload): Promise<void> {
    console.log('[notify]', payload.subject, '→', payload.to, '\n', payload.text);
    await Promise.resolve();
  }

  async notifyBookingConfirmed(input: {
    organization: Pick<Organization, 'name'>;
    booking: Pick<Booking, 'guestName' | 'guestEmail' | 'guestPhone' | 'checkInUtc' | 'checkOutUtc'>;
    unit: Pick<RentableUnit, 'name'>;
    caretakerEmail?: string;
  }): Promise<void> {
    const txt = [
      `New confirmed booking for ${input.organization.name}`,
      `Unit: ${input.unit.name}`,
      `Guest: ${input.booking.guestName ?? '(no name)'} / ${input.booking.guestPhone ?? input.booking.guestEmail ?? ''}`,
      `Check-in: ${input.booking.checkInUtc.toISOString()}`,
      `Check-out: ${input.booking.checkOutUtc.toISOString()}`,
    ].join('\n');
    if (input.caretakerEmail) {
      await this.send({ to: input.caretakerEmail, subject: 'New booking confirmed', text: txt });
    } else {
      await this.send({
        to: 'ops@localhost',
        subject: '[no caretaker email] Booking confirmed',
        text: txt + '\n(No caretaker emails on file — add CARETAKER memberships with user email.)',
      });
    }
  }
}

export class SmtpNotificationPublisher extends ConsoleNotificationPublisher {
  private transporter: nodemailer.Transporter;

  constructor(private from: string, config: { host: string; port: number; user?: string; pass?: string }) {
    super();
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  override async send(payload: NotificationPayload): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });
  }
}

export function createPublisherFromEnv(env: NodeJS.ProcessEnv): NotificationPublisher {
  if (env.SMTP_HOST && env.SMTP_FROM) {
    return new SmtpNotificationPublisher(env.SMTP_FROM, {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ? Number(env.SMTP_PORT) : 587,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    });
  }
  return new ConsoleNotificationPublisher();
}
