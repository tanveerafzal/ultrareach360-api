import nodemailer from "nodemailer";
import type { EmailProvider, EmailMessage, EmailSendResult } from "../types";

export class SmtpProvider implements EmailProvider {
  name = "smtp";
  private transporter: nodemailer.Transporter | null = null;
  private configured: boolean;
  private config: {
    host: string;
    port: number;
    user: string;
    secure: boolean;
  } | null = null;

  constructor() {
    console.log("\n=== SMTP Provider Initialization ===");

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true";

    // Log configuration status (without exposing password)
    console.log("SMTP Configuration check:");
    console.log("  - SMTP_HOST:", host ? `✓ (${host})` : "✗ NOT SET");
    console.log("  - SMTP_PORT:", `✓ (${port})`);
    console.log("  - SMTP_USER:", user ? `✓ (${user})` : "✗ NOT SET");
    console.log("  - SMTP_PASS:", pass ? "✓ (set)" : "✗ NOT SET");
    console.log("  - SMTP_SECURE:", secure ? "true (SSL/TLS)" : "false (STARTTLS)");
    console.log("  - SMTP_FROM_EMAIL:", process.env.SMTP_FROM_EMAIL || "NOT SET");

    this.configured = !!(host && user && pass);

    if (!this.configured) {
      const missing: string[] = [];
      if (!host) missing.push("SMTP_HOST");
      if (!user) missing.push("SMTP_USER");
      if (!pass) missing.push("SMTP_PASS");
      console.error(`SMTP provider NOT configured. Missing: ${missing.join(", ")}`);
      console.log("=== SMTP Provider Initialization Complete (DISABLED) ===\n");
      return;
    }

    this.config = { host: host!, port, user: user!, secure };

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass
        },
        tls: {
          rejectUnauthorized: true,
          minVersion: "TLSv1.2"
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 30000, // 30 seconds for sending
        debug: process.env.SMTP_DEBUG === "true",
        logger: process.env.SMTP_DEBUG === "true"
      });

      console.log("SMTP transporter created successfully");
      console.log("=== SMTP Provider Initialization Complete (ENABLED) ===\n");

      // Verify connection asynchronously (don't block constructor)
      this.verifyConnection();
    } catch (error: any) {
      console.error("Failed to create SMTP transporter:", error.message);
      this.configured = false;
      this.transporter = null;
    }
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) return;

    try {
      console.log("Verifying SMTP connection...");
      await this.transporter.verify();
      console.log("SMTP connection verified successfully - ready to send emails");
    } catch (error: any) {
      console.error("\n=== SMTP Connection Verification Failed ===");
      console.error("Error:", error.message);
      console.error("Code:", error.code);

      if (error.code === "ECONNREFUSED") {
        console.error("Diagnosis: Cannot connect to SMTP server. Check host and port.");
      } else if (error.code === "EAUTH" || error.code === "EENVELOPE") {
        console.error("Diagnosis: Authentication failed. Check username and password.");
      } else if (error.code === "ESOCKET") {
        console.error("Diagnosis: Socket error. Check if SSL/TLS settings are correct.");
      } else if (error.code === "ETIMEDOUT") {
        console.error("Diagnosis: Connection timed out. Server may be unreachable.");
      }
      console.error("===========================================\n");

      // Don't disable the provider - connection might work later
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log("\n=== SMTP Send Request ===");
    console.log("Timestamp:", new Date().toISOString());

    if (!this.configured || !this.transporter) {
      console.error("SMTP send aborted: Provider not configured");
      return {
        success: false,
        error: "SMTP is not configured. Check SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.",
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
      console.log(`\nConnecting to SMTP server: ${this.config?.host}:${this.config?.port}...`);

      const startTime = Date.now();

      const result = await this.transporter.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html
      });

      const duration = Date.now() - startTime;

      console.log("\n=== SMTP Send Success ===");
      console.log("Message ID:", result.messageId);
      console.log("Response:", result.response);
      console.log("Accepted:", result.accepted);
      console.log("Rejected:", result.rejected);
      console.log("Duration:", `${duration}ms`);
      console.log("=========================\n");

      return {
        success: true,
        messageId: result.messageId,
        provider: this.name
      };
    } catch (error: any) {
      console.error("\n=== SMTP Send Error ===");
      console.error("Error Type:", error.constructor.name);
      console.error("Error Message:", error.message);
      console.error("Error Code:", error.code);
      console.error("SMTP Response:", error.response);
      console.error("SMTP Response Code:", error.responseCode);
      console.error("Command:", error.command);

      // Detailed error diagnosis
      let diagnosis = "";
      let userFriendlyError = error.message;

      switch (error.code) {
        case "ECONNREFUSED":
          diagnosis = "Connection refused - SMTP server is not reachable";
          userFriendlyError = "Cannot connect to email server. Please try again later.";
          break;
        case "ECONNRESET":
          diagnosis = "Connection reset - Server closed the connection unexpectedly";
          userFriendlyError = "Connection to email server was lost. Please try again.";
          break;
        case "ETIMEDOUT":
          diagnosis = "Connection timed out - Server did not respond in time";
          userFriendlyError = "Email server is not responding. Please try again later.";
          break;
        case "EAUTH":
          diagnosis = "Authentication failed - Invalid username or password";
          userFriendlyError = "Email authentication failed. Please contact support.";
          break;
        case "EENVELOPE":
          diagnosis = "Envelope error - Invalid sender or recipient address";
          userFriendlyError = "Invalid email address format.";
          break;
        case "EMESSAGE":
          diagnosis = "Message error - Problem with email content";
          userFriendlyError = "There was a problem with the email content.";
          break;
        case "ESOCKET":
          diagnosis = "Socket error - TLS/SSL handshake may have failed";
          userFriendlyError = "Secure connection failed. Please try again.";
          break;
        default:
          if (error.responseCode >= 500) {
            diagnosis = "Server error - SMTP server returned an error";
            userFriendlyError = "Email server error. Please try again later.";
          } else if (error.responseCode >= 400) {
            diagnosis = "Client error - Request was rejected by server";
            userFriendlyError = error.response || "Email was rejected by server.";
          }
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
