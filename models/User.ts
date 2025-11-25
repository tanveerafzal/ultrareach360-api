import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  plan: string;
  role: "admin" | "partner" | "user";
  partnerId?: mongoose.Types.ObjectId;
  apiAccess: {
    status: "none" | "pending" | "approved" | "rejected";
    requestedAt?: Date;
    approvedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    apiKey?: string;
    rejectionReason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    plan: {
      type: String,
      default: "demo",
      enum: ["demo", "starter", "professional", "enterprise"],
    },
    role: {
      type: String,
      enum: ["admin", "partner", "user"],
      default: "user",
      required: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    apiAccess: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      requestedAt: {
        type: Date,
      },
      approvedAt: {
        type: Date,
      },
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      apiKey: {
        type: String,
      },
      rejectionReason: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
