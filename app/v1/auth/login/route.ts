import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { username, password, partner } = body;

    // Validate required fields
    if (!username || !password || !partner) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide username, password, and partner"
        },
        { status: 400 }
      );
    }

    // Find the partner by email
    const partnerUser = await User.findOne({
      email: partner.toLowerCase(),
      role: "partner"
    });

    if (!partnerUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid partner"
        },
        { status: 401 }
      );
    }

    // Find the user by email/username and verify they belong to this partner
    const user = await User.findOne({
      email: username.toLowerCase(),
      partnerId: partnerUser._id
    }).select("+password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials or you don't belong to this partner"
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
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
      return NextResponse.json(
        {
          success: false,
          error: "API access not approved. Please request API access first.",
          apiAccessStatus: user.apiAccess.status
        },
        { status: 403 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        partnerId: partnerUser._id.toString(),
        role: user.role,
        plan: user.plan
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

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
          partner: {
            id: partnerUser._id.toString(),
            name: partnerUser.name,
            email: partnerUser.email
          }
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error"
      },
      { status: 500 }
    );
  }
}
