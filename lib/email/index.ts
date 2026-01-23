export { EmailService, emailService } from "./email-service";
export { SendGridProvider } from "./providers/sendgrid";
export { ResendProvider } from "./providers/resend";
export { SmtpProvider } from "./providers/smtp";
export type {
  EmailMessage,
  EmailSendResult,
  EmailProvider,
  EmailProviderType,
  EmailServiceConfig
} from "./types";
