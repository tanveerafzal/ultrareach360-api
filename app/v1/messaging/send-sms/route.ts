import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { validateToken } from "@/lib/auth";
import { createRequestLogger, logger as globalLogger } from "@/lib/logger";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

// Lazy initialization of Twilio client to prevent build-time errors
let twilioClient: ReturnType<typeof twilio> | null = null;
let twilioInitialized = false;

function getTwilioClient(): ReturnType<typeof twilio> | null {
  if (!twilioInitialized) {
    twilioInitialized = true;
    globalLogger.info("Twilio configuration loaded", {
      accountSidExists: !!TWILIO_ACCOUNT_SID,
      authTokenExists: !!TWILIO_AUTH_TOKEN,
      phoneNumber: TWILIO_PHONE_NUMBER || "NOT_SET",
    });
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      try {
        twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      } catch (e: any) {
        globalLogger.error("Failed to initialize Twilio client", e);
      }
    }
  }
  return twilioClient;
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || undefined;
  const logger = createRequestLogger(request, requestId);

  logger.requestStart({ endpoint: "/v1/messaging/send-sms" });

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
    const { businessGroup, to, body: smsBody } = body;

    logger.debug("SMS request payload", {
      businessGroup,
      to,
      bodyLength: smsBody?.length,
    });

    // Validate required fields
    if (!businessGroup || !to || !smsBody) {
      logger.validationError("fields", "Missing required fields", {
        hasBusinessGroup: !!businessGroup,
        hasTo: !!to,
        hasBody: !!smsBody,
      });
      logger.requestEnd(400, { reason: "validation_error" });
      return NextResponse.json(
        {
          success: false,
          error: "Please provide businessGroup, to, and body"
        },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to.replace(/[\s()-]/g, ""))) {
      logger.validationError("to", "Invalid phone number format", { phone: to });
      logger.requestEnd(400, { reason: "invalid_phone_format" });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)"
        },
        { status: 400 }
      );
    }

    // Check if Twilio is configured
    const client = getTwilioClient();
    if (!client || !TWILIO_PHONE_NUMBER) {
      logger.error("Twilio not configured", null, {
        hasClient: !!client,
        hasPhoneNumber: !!TWILIO_PHONE_NUMBER,
      });
      logger.requestEnd(500, { reason: "twilio_not_configured" });
      return NextResponse.json(
        {
          success: false,
          error: "SMS service is not configured. Please contact administrator."
        },
        { status: 500 }
      );
    }

    // Prepare SMS message with business group prefix
    const messageText = `[${businessGroup}] ${smsBody}`;

    // Check message length (SMS limit is 160 characters for single message)
    if (messageText.length > 1600) {
      logger.validationError("body", "Message too long", {
        length: messageText.length,
        maxLength: 1600,
      });
      logger.requestEnd(400, { reason: "message_too_long" });
      return NextResponse.json(
        {
          success: false,
          error: "Message body is too long. Maximum length is 1600 characters."
        },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedTo = to.replace(/[\s()-]/g, "");
    const formattedTo = normalizedTo.startsWith("+") ? normalizedTo : `+${normalizedTo}`;

    logger.debug("Validation passed, preparing SMS", {
      formattedTo,
      messageLength: messageText.length,
    });

    // Send SMS
    logger.externalServiceStart("Twilio", "messages.create", {
      to: formattedTo,
      from: TWILIO_PHONE_NUMBER,
      messageLength: messageText.length,
    });

    const message = await client.messages.create({
      body: messageText,
      from: TWILIO_PHONE_NUMBER,
      to: formattedTo
    });

    logger.externalServiceSuccess("Twilio", "messages.create", {
      messageId: message.sid,
      status: message.status,
      segments: message.numSegments,
    });

    logger.info("SMS sent successfully", {
      businessGroup,
      to: formattedTo,
      messageId: message.sid,
      status: message.status,
    });
    logger.requestEnd(200, { reason: "success" });

    return NextResponse.json(
      {
        success: true,
        message: "SMS sent successfully",
        data: {
          businessGroup,
          to: formattedTo,
          messageId: message.sid,
          status: message.status,
          sentAt: new Date().toISOString(),
          segments: message.numSegments
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    let errorMessage = "Failed to send SMS";
    let statusCode = 500;

    // Twilio-specific error handling with detailed logging
    const errorDetails: any = {
      type: error.constructor.name,
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
    };

    if (error.code) {
      switch (error.code) {
        case 21211:
          errorMessage = "Invalid phone number";
          statusCode = 400;
          break;
        case 21408:
          errorMessage = "Permission denied to send SMS to this number";
          statusCode = 403;
          break;
        case 21610:
          errorMessage = "Phone number is not reachable or opted out";
          statusCode = 400;
          break;
        case 21614:
          errorMessage = "Invalid phone number format";
          statusCode = 400;
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
    }

    logger.externalServiceError("Twilio", "messages.create", error, errorDetails);
    logger.requestError(statusCode, error, {
      endpoint: "/v1/messaging/send-sms",
      twilioErrorCode: error.code,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.message,
        code: error.code
      },
      { status: statusCode }
    );
  }
}
