import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth";
import { emailService } from "@/lib/email/email-service";

export async function POST(request: NextRequest) {
  console.log("\n=== New Email Request ===");
  console.log("Timestamp:", new Date().toISOString());

  // Validate JWT token
  const authResult = validateToken(request);
  if (!authResult.success) {
    console.log("Authentication failed:", authResult.error);
    return authResult.response!;
  }

  console.log("Authenticated user:", authResult.user!.email);

  try {
    const body = await request.json();
    const { businessGroup, to, subject, body: emailBody } = body;

    console.log("Request body:", {
      businessGroup,
      to,
      subject: subject?.substring(0, 50),
      bodyLength: emailBody?.length
    });

    // Validate required fields
    if (!businessGroup || !to || !subject || !emailBody) {
      console.log("Validation failed: Missing required fields");
      return NextResponse.json(
        {
          success: false,
          error: "Please provide businessGroup, to, subject, and body"
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.log("Validation failed: Invalid email format -", to);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address format"
        },
        { status: 400 }
      );
    }

    // Check if any email provider is configured
    const configuredProviders = emailService.getConfiguredProviders();
    const fromEmail = emailService.getDefaultFromEmail();

    if (configuredProviders.length === 0 || !fromEmail) {
      console.log("Configuration error: No email provider configured");
      console.log("Configured providers:", configuredProviders);
      console.log("From Email present:", !!fromEmail);
      return NextResponse.json(
        {
          success: false,
          error: "Email service is not configured. Please contact administrator."
        },
        { status: 500 }
      );
    }

    console.log("Validation passed. Preparing email message...");
    console.log("Available providers:", configuredProviders);

    // Prepare email message
    const msg = {
      to: to,
      from: fromEmail,
      subject: `[${businessGroup}] ${subject}`,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-bottom: 3px solid #007bff;">
            <h2 style="margin: 0; color: #333;">${businessGroup}</h2>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <div style="color: #333; line-height: 1.6;">
              ${emailBody.replace(/\n/g, "<br>")}
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">This email was sent from ${businessGroup}</p>
          </div>
        </div>
      `
    };

    console.log("Email message prepared:", {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    });

    // Send email using email service
    console.log("Attempting to send email...");
    const result = await emailService.send(msg);

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    console.log("Email sent successfully via", result.provider);

    return NextResponse.json(
      {
        success: true,
        message: "Email sent successfully",
        data: {
          businessGroup,
          to,
          subject: msg.subject,
          sentAt: new Date().toISOString(),
          provider: result.provider,
          messageId: result.messageId
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("\n=== Email Sending Error ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Full Error Object:", JSON.stringify(error, null, 2));
    console.error("Stack Trace:", error.stack);
    console.error("========================\n");

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send email",
        details: {
          message: error.message,
          code: error.code
        }
      },
      { status: 500 }
    );
  }
}
