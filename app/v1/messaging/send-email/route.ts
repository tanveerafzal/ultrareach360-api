import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { validateToken } from "@/lib/auth";
import { createRequestLogger, logger as globalLogger } from "@/lib/logger";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "";

// Log configuration at startup (once)
globalLogger.info("SendGrid configuration loaded", {
  apiKeyExists: !!SENDGRID_API_KEY,
  apiKeyLength: SENDGRID_API_KEY.length,
  fromEmail: SENDGRID_FROM_EMAIL || "NOT_SET",
});

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

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

    // Check if SendGrid is configured
    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
      logger.error("SendGrid not configured", null, {
        hasApiKey: !!SENDGRID_API_KEY,
        hasFromEmail: !!SENDGRID_FROM_EMAIL,
      });
      logger.requestEnd(500, { reason: "sendgrid_not_configured" });
      return NextResponse.json(
        {
          success: false,
          error: "Email service is not configured. Please contact administrator."
        },
        { status: 500 }
      );
    }

    logger.debug("Validation passed, preparing email");

    // Prepare email message
    const msg = {
      to: to,
      from: SENDGRID_FROM_EMAIL,
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

    const result = await sgMail.send(msg);

    logger.externalServiceSuccess("SendGrid", "send", {
      statusCode: result[0]?.statusCode,
      messageId: result[0]?.headers?.["x-message-id"],
    });

    logger.info("Email sent successfully", {
      businessGroup,
      to,
      subject: msg.subject,
    });
    logger.requestEnd(200, { reason: "success" });

    return NextResponse.json(
      {
        success: true,
        message: "Email sent successfully",
        data: {
          businessGroup,
          to,
          subject: msg.subject,
          sentAt: new Date().toISOString()
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Extract SendGrid-specific error details
    let errorMessage = "Failed to send email";
    let statusCode = 500;
    const errorDetails: any = {
      type: error.constructor.name,
      message: error.message,
      code: error.code,
    };

    if (error.response) {
      errorMessage = error.response.body?.errors?.[0]?.message || errorMessage;
      statusCode = error.response.statusCode || statusCode;
      errorDetails.sendgridStatusCode = error.response.statusCode;
      errorDetails.sendgridErrors = error.response.body?.errors;
    }

    logger.externalServiceError("SendGrid", "send", error, errorDetails);
    logger.requestError(statusCode, error, {
      endpoint: "/v1/messaging/send-email",
      sendgridStatusCode: errorDetails.sendgridStatusCode,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails
      },
      { status: statusCode }
    );
  }
}
