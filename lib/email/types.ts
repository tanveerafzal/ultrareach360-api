export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
  isConfigured(): boolean;
}

export type EmailProviderType = "sendgrid" | "resend" | "smtp";

export interface EmailServiceConfig {
  primaryProvider?: EmailProviderType;
  fallbackProvider?: EmailProviderType;
}
