import sgMail from "@sendgrid/mail";
import type { EmailProvider, EmailMessage, EmailSendResult } from "../types";

export class SendGridProvider implements EmailProvider {
  name = "sendgrid";
  private apiKey: string;
  private configured: boolean;
  private fromEmail: string;

  constructor() {
    console.log("\n=== SendGrid Provider Initialization ===");

    this.apiKey = process.env.SENDGRID_API_KEY || "";
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || "";

    // Log configuration status
    console.log("SendGrid Configuration check:");
    console.log("  - SENDGRID_API_KEY:", this.apiKey ? `✓ (${this.apiKey.substring(0, 10)}...)` : "✗ NOT SET");
    console.log("  - SENDGRID_FROM_EMAIL:", this.fromEmail ? `✓ (${this.fromEmail})` : "✗ NOT SET");

    this.configured = !!this.apiKey;

    if (this.configured) {
      sgMail.setApiKey(this.apiKey);
      console.log("SendGrid API key configured successfully");
      console.log("=== SendGrid Provider Initialization Complete (ENABLED) ===\n");
    } else {
      console.log("SendGrid provider NOT configured (missing SENDGRID_API_KEY)");
      console.log("=== SendGrid Provider Initialization Complete (DISABLED) ===\n");
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log("\n=== SendGrid Send Request ===");
    console.log("Timestamp:", new Date().toISOString());

    if (!this.configured) {
      console.error("SendGrid send aborted: API key not configured");
      return {
        success: false,
        error: "SendGrid is not configured. Set SENDGRID_API_KEY environment variable.",
        provider: this.name
      };
    }

    console.log("Email details:");
    console.log("  - From:", message.from);
    console.log("  - To:", message.to);
    console.log("  - Subject:", message.subject);
    console.log("  - Text length:", message.text?.length || 0);
    console.log("  - HTML length:", message.html?.length || 0);

    try {
      console.log("\nConnecting to SendGrid API...");
      const startTime = Date.now();

      const result = await sgMail.send({
        to: message.to,
        from: message.from,
        subject: message.subject,
        text: message.text,
        html: message.html
      });

      const duration = Date.now() - startTime;

      console.log("\n=== SendGrid Send Success ===");
      console.log("Status Code:", result[0]?.statusCode);
      console.log("Message ID:", result[0]?.headers?.["x-message-id"]);
      console.log("Duration:", `${duration}ms`);
      console.log("=============================\n");

      return {
        success: true,
        messageId: result[0]?.headers?.["x-message-id"] as string,
        provider: this.name
      };
    } catch (error: any) {
      console.error("\n=== SendGrid Send Error ===");
      console.error("Error Type:", error.constructor.name);
      console.error("Error Message:", error.message);
      console.error("Error Code:", error.code);
      console.error("HTTP Status:", error.response?.statusCode);
      console.error("Response Body:", JSON.stringify(error.response?.body, null, 2));

      // Parse SendGrid specific errors
      const sgErrors = error.response?.body?.errors;
      if (sgErrors && Array.isArray(sgErrors)) {
        console.error("\nSendGrid Error Details:");
        sgErrors.forEach((err: any, index: number) => {
          console.error(`  Error ${index + 1}:`);
          console.error(`    - Message: ${err.message}`);
          console.error(`    - Field: ${err.field || "N/A"}`);
          console.error(`    - Help: ${err.help || "N/A"}`);
        });
      }

      // Diagnose common errors
      let diagnosis = "";
      let userFriendlyError = error.message;

      if (error.response?.statusCode === 401) {
        diagnosis = "Authentication failed - API key is invalid";
        userFriendlyError = "Email service authentication failed. Please contact support.";
      } else if (error.response?.statusCode === 403) {
        diagnosis = "Forbidden - API key lacks required permissions or sender not verified";
        userFriendlyError = "Email sending not authorized. Please contact support.";
      } else if (error.response?.statusCode === 400) {
        diagnosis = "Bad request - Check email format and content";
        userFriendlyError = sgErrors?.[0]?.message || "Invalid email request.";
      } else if (error.response?.statusCode === 429) {
        diagnosis = "Rate limited - Too many requests";
        userFriendlyError = "Email service is busy. Please try again later.";
      } else if (error.response?.statusCode >= 500) {
        diagnosis = "SendGrid server error";
        userFriendlyError = "Email service is temporarily unavailable. Please try again later.";
      }

      if (diagnosis) {
        console.error("Diagnosis:", diagnosis);
      }

      console.error("Stack Trace:", error.stack);
      console.error("===========================\n");

      return {
        success: false,
        error: userFriendlyError,
        provider: this.name
      };
    }
  }
}
