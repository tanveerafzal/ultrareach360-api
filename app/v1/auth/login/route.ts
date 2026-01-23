import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { createRequestLogger } from "@/lib/logger";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || undefined;
  const logger = createRequestLogger(request, requestId);

  logger.requestStart({ endpoint: "/v1/auth/login" });

  try {
    // Connect to database
    logger.dbOperation("connect", { database: "mongodb" });
    await connectDB();
    logger.debug("Database connected successfully");

    // Parse request body
    const body = await request.json();
    const { username, password, apiKey } = body;

    logger.debug("Login attempt", {
      username: username?.substring(0, 3) + "***",
      hasPassword: !!password,
      hasApiKey: !!apiKey,
    });

    // Validate required fields
    if (!username || !password || !apiKey) {
      logger.validationError("credentials", "Missing required fields", {
        hasUsername: !!username,
        hasPassword: !!password,
        hasApiKey: !!apiKey,
      });
      logger.requestEnd(400, { reason: "validation_error" });
      return NextResponse.json(
        {
          success: false,
          error: "Please provide username, password, and apiKey"
        },
        { status: 400 }
      );
    }

    // Find the user by email/username
    logger.dbOperation("findUser", { email: username.toLowerCase() });
    const user = await User.findOne({
      email: username.toLowerCase()
    }).select("+password");

    if (!user) {
      logger.warn("Login failed: User not found", { email: username.toLowerCase() });
      logger.requestEnd(401, { reason: "user_not_found" });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials"
        },
        { status: 401 }
      );
    }

    // Verify password
    logger.debug("Verifying password");
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      logger.warn("Login failed: Invalid password", {
        userId: user._id.toString(),
        email: user.email,
      });
      logger.requestEnd(401, { reason: "invalid_password" });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials"
        },
        { status: 401 }
      );
    }

    // Check if user has API access approved
    if (user.apiAccess.status !== "approved") {
      logger.warn("Login failed: API access not approved", {
        userId: user._id.toString(),
        email: user.email,
        apiAccessStatus: user.apiAccess.status,
      });
      logger.requestEnd(403, { reason: "api_access_not_approved" });
      return NextResponse.json(
        {
          success: false,
          error: "API access not approved. Please request API access first.",
          apiAccessStatus: user.apiAccess.status
        },
        { status: 403 }
      );
    }

    // Validate API key
    if (!user.apiAccess.apiKey || user.apiAccess.apiKey !== apiKey) {
      logger.warn("Login failed: Invalid API key", {
        userId: user._id.toString(),
        email: user.email,
      });
      logger.requestEnd(401, { reason: "invalid_api_key" });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API key"
        },
        { status: 401 }
      );
    }

    // Get partner information if user has a partnerId
    let partnerInfo = null;
    if (user.partnerId) {
      logger.dbOperation("findPartner", { partnerId: user.partnerId.toString() });
      const partnerUser = await User.findById(user.partnerId);
      if (partnerUser) {
        partnerInfo = {
          id: partnerUser._id.toString(),
          name: partnerUser.name,
          email: partnerUser.email
        };
        logger.debug("Partner info retrieved", { partnerId: partnerInfo.id });
      }
    }

    // Generate JWT token
    logger.debug("Generating JWT token");
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        partnerId: user.partnerId?.toString() || null,
        role: user.role,
        plan: user.plan
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    logger.info("Login successful", {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      plan: user.plan,
      hasPartner: !!partnerInfo,
    });
    logger.requestEnd(200, { reason: "success" });

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          plan: user.plan,
          role: user.role,
          partner: partnerInfo
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.requestError(500, error, { endpoint: "/v1/auth/login" });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error"
      },
      { status: 500 }
    );
  }
}
