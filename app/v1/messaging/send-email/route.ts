import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth";
import { emailService } from "@/lib/email/email-service";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || undefined;
  const logger = createRequestLogger(request, requestId);

  logger.requestStart({ endpoint: "/v1/messaging/send-email" });

  // Validate JWT token
  const authResult = validateToken(request, logger);
  if (!authResult.success) {
    logger.requestEnd(401, { reason: "auth_failed", error: authResult.error });
    return authResult.response!;
  }

  // Set user context for subsequent logs
  logger.setUser(authResult.user!.userId, authResult.user!.email);

  try {
    const body = await request.json();
    const { businessGroup, to, subject, body: emailBody } = body;

    logger.debug("Email request payload", {
      businessGroup,
      to,
      subjectPreview: subject?.substring(0, 50),
      bodyLength: emailBody?.length,
    });

    // Validate required fields
    if (!businessGroup || !to || !subject || !emailBody) {
      logger.validationError("fields", "Missing required fields", {
        hasBusinessGroup: !!businessGroup,
        hasTo: !!to,
        hasSubject: !!subject,
        hasBody: !!emailBody,
      });
      logger.requestEnd(400, { reason: "validation_error" });
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
      logger.validationError("to", "Invalid email format", { email: to });
      logger.requestEnd(400, { reason: "invalid_email_format" });
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

    // Send email
    logger.externalServiceStart("SendGrid", "send", {
      to: msg.to,
      from: msg.from,
      subject: msg.subject,
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
