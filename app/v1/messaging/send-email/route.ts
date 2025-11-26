import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessGroup, to, subject, body: emailBody } = body;

    // Validate required fields
    if (!businessGroup || !to || !subject || !emailBody) {
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
      return NextResponse.json(
        {
          success: false,
          error: "Email service is not configured. Please contact administrator."
        },
        { status: 500 }
      );
    }

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
    await sgMail.send(msg);

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
    console.error("Email sending error:", error);

    let errorMessage = "Failed to send email";
    let statusCode = 500;

    if (error.response) {
      errorMessage = error.response.body?.errors?.[0]?.message || errorMessage;
      statusCode = error.response.statusCode || statusCode;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.message
      },
      { status: statusCode }
    );
  }
}
