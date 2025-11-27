import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { validateToken } from "@/lib/auth";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "";

console.log("=== SendGrid Configuration ===");
console.log("API Key exists:", !!SENDGRID_API_KEY);
console.log("API Key length:", SENDGRID_API_KEY.length);
console.log("API Key prefix:", SENDGRID_API_KEY.substring(0, 10) + "...");
console.log("From Email:", SENDGRID_FROM_EMAIL);
console.log("==============================");

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

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

    // Check if SendGrid is configured
    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
      console.log("Configuration error: SendGrid not properly configured");
      console.log("API Key present:", !!SENDGRID_API_KEY);
      console.log("From Email present:", !!SENDGRID_FROM_EMAIL);
      return NextResponse.json(
        {
          success: false,
          error: "Email service is not configured. Please contact administrator."
        },
        { status: 500 }
      );
    }

    console.log("Validation passed. Preparing email message...");

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

    console.log("Email message prepared:", {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    });

    // Send email
    console.log("Attempting to send email via SendGrid...");
    const result = await sgMail.send(msg);
    console.log("SendGrid response:", {
      statusCode: result[0]?.statusCode,
      headers: result[0]?.headers
    });

    console.log("Email sent successfully!");

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
    console.error("\n=== Email Sending Error ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);

    if (error.response) {
      console.error("SendGrid Response Details:");
      console.error("Status Code:", error.response.statusCode);
      console.error("Response Body:", JSON.stringify(error.response.body, null, 2));
      console.error("Response Headers:", error.response.headers);
    }

    console.error("Full Error Object:", JSON.stringify(error, null, 2));
    console.error("Stack Trace:", error.stack);
    console.error("========================\n");

    let errorMessage = "Failed to send email";
    let statusCode = 500;
    let errorDetails: any = {
      message: error.message,
      code: error.code
    };

    if (error.response) {
      errorMessage = error.response.body?.errors?.[0]?.message || errorMessage;
      statusCode = error.response.statusCode || statusCode;
      errorDetails.sendgridErrors = error.response.body?.errors;
      errorDetails.statusCode = error.response.statusCode;
    }

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
