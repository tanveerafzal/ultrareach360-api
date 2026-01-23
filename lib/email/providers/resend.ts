import { Resend } from "resend";
import type { EmailProvider, EmailMessage, EmailSendResult } from "../types";

export class ResendProvider implements EmailProvider {
  name = "resend";
  private resend: Resend | null = null;
  private configured: boolean;
  private fromEmail: string;

  constructor() {
    console.log("\n=== Resend Provider Initialization ===");

    const apiKey = process.env.RESEND_API_KEY || "";
    this.fromEmail = process.env.RESEND_FROM_EMAIL || "";

    // Log configuration status
    console.log("Resend Configuration check:");
    console.log("  - RESEND_API_KEY:", apiKey ? `✓ (${apiKey.substring(0, 10)}...)` : "✗ NOT SET");
    console.log("  - RESEND_FROM_EMAIL:", this.fromEmail ? `✓ (${this.fromEmail})` : "✗ NOT SET");

    this.configured = !!apiKey;

    if (this.configured) {
      this.resend = new Resend(apiKey);
      console.log("Resend client initialized successfully");
      console.log("=== Resend Provider Initialization Complete (ENABLED) ===\n");
    } else {
      console.log("Resend provider NOT configured (missing RESEND_API_KEY)");
      console.log("=== Resend Provider Initialization Complete (DISABLED) ===\n");
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log("\n=== Resend Send Request ===");
    console.log("Timestamp:", new Date().toISOString());

    if (!this.configured || !this.resend) {
      console.error("Resend send aborted: API key not configured");
      return {
        success: false,
        error: "Resend is not configured. Set RESEND_API_KEY environment variable.",
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
      console.log("\nConnecting to Resend API...");
      const startTime = Date.now();

      const result = await this.resend.emails.send({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html
      });

      const duration = Date.now() - startTime;

      if (result.error) {
        console.error("\n=== Resend API Error ===");
        console.error("Error Name:", result.error.name);
        console.error("Error Message:", result.error.message);
        console.error("Duration:", `${duration}ms`);
        console.error("========================\n");

        return {
          success: false,
          error: result.error.message,
          provider: this.name
        };
      }

      console.log("\n=== Resend Send Success ===");
      console.log("Message ID:", result.data?.id);
      console.log("Duration:", `${duration}ms`);
      console.log("===========================\n");

      return {
        success: true,
        messageId: result.data?.id,
        provider: this.name
      };
    } catch (error: any) {
      console.error("\n=== Resend Send Error ===");
      console.error("Error Type:", error.constructor.name);
      console.error("Error Message:", error.message);
      console.error("Error Code:", error.code);

      // Diagnose common errors
      let diagnosis = "";
      let userFriendlyError = error.message;

      if (error.message?.includes("API key")) {
        diagnosis = "Authentication failed - API key is invalid";
        userFriendlyError = "Email service authentication failed. Please contact support.";
      } else if (error.message?.includes("rate limit")) {
        diagnosis = "Rate limited - Too many requests";
        userFriendlyError = "Email service is busy. Please try again later.";
      } else if (error.message?.includes("domain")) {
        diagnosis = "Domain not verified in Resend";
        userFriendlyError = "Email domain not authorized. Please contact support.";
      }

      if (diagnosis) {
        console.error("Diagnosis:", diagnosis);
      }

      console.error("Stack Trace:", error.stack);
      console.error("=========================\n");

      return {
        success: false,
        error: userFriendlyError,
        provider: this.name
      };
    }
  }
}
