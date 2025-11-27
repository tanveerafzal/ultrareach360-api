import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  partnerId: string | null;
  role: string;
  plan: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  response?: NextResponse;
}

/**
 * Validates JWT token from Authorization header
 * Returns authenticated user data if valid, or error response if invalid
 */
export function validateToken(request: NextRequest): AuthResult {
  try {
    // Get Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      console.log("Authentication failed: No Authorization header");
      return {
        success: false,
        error: "Missing authorization token",
        response: NextResponse.json(
          {
            success: false,
            error: "Missing authorization token. Please include 'Authorization: Bearer <token>' header."
          },
          { status: 401 }
        )
      };
    }

    // Check Bearer format
    if (!authHeader.startsWith("Bearer ")) {
      console.log("Authentication failed: Invalid Authorization format");
      return {
        success: false,
        error: "Invalid authorization format",
        response: NextResponse.json(
          {
            success: false,
            error: "Invalid authorization format. Use 'Authorization: Bearer <token>'."
          },
          { status: 401 }
        )
      };
    }

    // Extract token
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      console.log("Authentication failed: Empty token");
      return {
        success: false,
        error: "Empty token",
        response: NextResponse.json(
          {
            success: false,
            error: "Authorization token is empty."
          },
          { status: 401 }
        )
      };
    }

    console.log("Validating JWT token...");
    console.log("Token prefix:", token.substring(0, 20) + "...");

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;

    console.log("Token validated successfully for user:", decoded.email);

    return {
      success: true,
      user: decoded
    };
  } catch (error: any) {
    console.error("Token validation error:", error.message);

    if (error.name === "TokenExpiredError") {
      return {
        success: false,
        error: "Token expired",
        response: NextResponse.json(
          {
            success: false,
            error: "Token has expired. Please login again."
          },
          { status: 401 }
        )
      };
    }

    if (error.name === "JsonWebTokenError") {
      return {
        success: false,
        error: "Invalid token",
        response: NextResponse.json(
          {
            success: false,
            error: "Invalid token. Please login again."
          },
          { status: 401 }
        )
      };
    }

    return {
      success: false,
      error: "Authentication failed",
      response: NextResponse.json(
        {
          success: false,
          error: "Authentication failed. Please login again."
        },
        { status: 401 }
      )
    };
  }
}
