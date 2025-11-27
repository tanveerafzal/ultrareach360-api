import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { validateToken } from "@/lib/auth";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

let twilioClient: ReturnType<typeof twilio> | null = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export async function POST(request: NextRequest) {
  console.log("\n=== New SMS Request ===");
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
    const { businessGroup, to, body: smsBody } = body;

    console.log("Request body:", {
      businessGroup,
      to,
      bodyLength: smsBody?.length
    });

    // Validate required fields
    if (!businessGroup || !to || !smsBody) {
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
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)"
        },
        { status: 400 }
      );
    }

    // Check if Twilio is configured
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
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

    // Send SMS
    const message = await twilioClient.messages.create({
      body: messageText,
      from: TWILIO_PHONE_NUMBER,
      to: formattedTo
    });

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
    console.error("SMS sending error:", error);

    let errorMessage = "Failed to send SMS";
    let statusCode = 500;

    // Twilio-specific error handling
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
