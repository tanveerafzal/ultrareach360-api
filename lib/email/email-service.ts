import type { EmailProvider, EmailMessage, EmailSendResult, EmailProviderType, EmailServiceConfig } from "./types";
import { SendGridProvider } from "./providers/sendgrid";
import { ResendProvider } from "./providers/resend";
import { SmtpProvider } from "./providers/smtp";

export class EmailService {
  private providers: Map<EmailProviderType, EmailProvider>;
  private config: EmailServiceConfig;

  constructor(config?: EmailServiceConfig) {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║           EMAIL SERVICE INITIALIZATION                      ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    this.providers = new Map();

    // Initialize all providers
    console.log("Initializing email providers...\n");
    this.providers.set("sendgrid", new SendGridProvider());
    this.providers.set("resend", new ResendProvider());
    this.providers.set("smtp", new SmtpProvider());

    // Default config: use Resend as primary, SendGrid as fallback
    // Can be overridden via EMAIL_PROVIDER env var
    const envProvider = process.env.EMAIL_PROVIDER as EmailProviderType;
    const envFallback = process.env.EMAIL_FALLBACK_PROVIDER as EmailProviderType;

    this.config = {
      primaryProvider: config?.primaryProvider || envProvider || "resend",
      fallbackProvider: config?.fallbackProvider || envFallback || "sendgrid"
    };

    console.log("\n┌────────────────────────────────────────────────────────────┐");
    console.log("│ EMAIL SERVICE CONFIGURATION SUMMARY                        │");
    console.log("├────────────────────────────────────────────────────────────┤");
    console.log(`│ Primary Provider:    ${(this.config.primaryProvider || "none").toUpperCase().padEnd(38)}│`);
    console.log(`│ Fallback Provider:   ${(this.config.fallbackProvider || "none").toUpperCase().padEnd(38)}│`);
    console.log("├────────────────────────────────────────────────────────────┤");
    console.log("│ Provider Status:                                           │");
    console.log(`│   • SendGrid:  ${this.providers.get("sendgrid")?.isConfigured() ? "✓ CONFIGURED    " : "✗ NOT CONFIGURED"}                          │`);
    console.log(`│   • Resend:    ${this.providers.get("resend")?.isConfigured() ? "✓ CONFIGURED    " : "✗ NOT CONFIGURED"}                          │`);
    console.log(`│   • SMTP:      ${this.providers.get("smtp")?.isConfigured() ? "✓ CONFIGURED    " : "✗ NOT CONFIGURED"}                          │`);
    console.log("└────────────────────────────────────────────────────────────┘\n");
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const { primaryProvider, fallbackProvider } = this.config;

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║              EMAIL SEND REQUEST                             ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log("Timestamp:", new Date().toISOString());
    console.log("\n┌─ Email Details ─────────────────────────────────────────────┐");
    console.log(`│ To:      ${message.to}`);
    console.log(`│ From:    ${message.from}`);
    console.log(`│ Subject: ${message.subject}`);
    console.log("└─────────────────────────────────────────────────────────────┘\n");

    // Try primary provider
    if (primaryProvider) {
      const provider = this.providers.get(primaryProvider);

      console.log("┌─ Provider Selection ────────────────────────────────────────┐");
      console.log(`│ Trying PRIMARY provider: ${primaryProvider.toUpperCase()}`);
      console.log(`│ Provider configured: ${provider?.isConfigured() ? "YES" : "NO"}`);
      console.log("└─────────────────────────────────────────────────────────────┘\n");

      if (provider?.isConfigured()) {
        console.log(`>>> Sending email via ${primaryProvider.toUpperCase()}...`);
        const result = await provider.send(message);

        if (result.success) {
          console.log("\n┌─ SUCCESS ───────────────────────────────────────────────────┐");
          console.log(`│ Email sent successfully via: ${primaryProvider.toUpperCase()}`);
          console.log(`│ Message ID: ${result.messageId || "N/A"}`);
          console.log("└─────────────────────────────────────────────────────────────┘\n");
          return result;
        }

        console.warn("\n┌─ PRIMARY PROVIDER FAILED ──────────────────────────────────┐");
        console.warn(`│ Provider: ${primaryProvider.toUpperCase()}`);
        console.warn(`│ Error: ${result.error}`);
        console.warn("└─────────────────────────────────────────────────────────────┘\n");
      } else {
        console.warn(`⚠ Primary provider ${primaryProvider.toUpperCase()} is NOT CONFIGURED - skipping`);
      }
    }

    // Try fallback provider if primary failed
    if (fallbackProvider && fallbackProvider !== primaryProvider) {
      const provider = this.providers.get(fallbackProvider);

      console.log("\n┌─ Fallback Provider ─────────────────────────────────────────┐");
      console.log(`│ Trying FALLBACK provider: ${fallbackProvider.toUpperCase()}`);
      console.log(`│ Provider configured: ${provider?.isConfigured() ? "YES" : "NO"}`);
      console.log("└─────────────────────────────────────────────────────────────┘\n");

      if (provider?.isConfigured()) {
        console.log(`>>> Sending email via ${fallbackProvider.toUpperCase()}...`);
        const result = await provider.send(message);

        if (result.success) {
          console.log("\n┌─ SUCCESS (via fallback) ────────────────────────────────────┐");
          console.log(`│ Email sent successfully via: ${fallbackProvider.toUpperCase()}`);
          console.log(`│ Message ID: ${result.messageId || "N/A"}`);
          console.log("└─────────────────────────────────────────────────────────────┘\n");
          return result;
        }

        console.error("\n┌─ FALLBACK PROVIDER ALSO FAILED ───────────────────────────┐");
        console.error(`│ Provider: ${fallbackProvider.toUpperCase()}`);
        console.error(`│ Error: ${result.error}`);
        console.error("└─────────────────────────────────────────────────────────────┘\n");
      } else {
        console.warn(`⚠ Fallback provider ${fallbackProvider.toUpperCase()} is NOT CONFIGURED - skipping`);
      }
    }

    // Both providers failed or not configured
    console.error("\n╔════════════════════════════════════════════════════════════╗");
    console.error("║           ALL EMAIL PROVIDERS FAILED                        ║");
    console.error("╚════════════════════════════════════════════════════════════╝\n");

    return {
      success: false,
      error: "All email providers failed or are not configured"
    };
  }

  getConfiguredProviders(): string[] {
    const configured: string[] = [];
    this.providers.forEach((provider, name) => {
      if (provider.isConfigured()) {
        configured.push(name);
      }
    });
    return configured;
  }

  getDefaultFromEmail(): string {
    // Try to get from email based on which provider is configured
    const { primaryProvider } = this.config;

    let fromEmail = "";

    if (primaryProvider === "resend" && process.env.RESEND_FROM_EMAIL) {
      fromEmail = process.env.RESEND_FROM_EMAIL;
    } else if (primaryProvider === "sendgrid" && process.env.SENDGRID_FROM_EMAIL) {
      fromEmail = process.env.SENDGRID_FROM_EMAIL;
    } else if (primaryProvider === "smtp" && process.env.SMTP_FROM_EMAIL) {
      fromEmail = process.env.SMTP_FROM_EMAIL;
    } else {
      // Fallback to any configured FROM email
      fromEmail = process.env.RESEND_FROM_EMAIL ||
                  process.env.SENDGRID_FROM_EMAIL ||
                  process.env.SMTP_FROM_EMAIL ||
                  "";
    }

    console.log(`[EmailService] getDefaultFromEmail() => "${fromEmail}" (provider: ${primaryProvider})`);
    return fromEmail;
  }
}

// Export singleton instance
export const emailService = new EmailService();
