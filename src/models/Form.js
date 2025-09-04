import mongoose from "mongoose";

const formSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Applicant Through
  applicantType: { type: String, enum: ["self", "agent"], required: true },
  agentName: { type: String },
  agentContact: { type: String },
  agentCNIC: { type: String },
  agentEmail: { type: String },

  // Applicant Information
  applicantName: { type: String, required: true },
  applicantCNIC: { type: String, required: true },
  relation: { type: String },
  relationName: { type: String },
  applicantContact: { type: String },
  applicantAddress: { type: String },
  applicantEmail: { type: String },

  // Stamp Details
  purpose: { type: String, required: true },
  denomination: { type: String, required: true },
  denominationValue: { type: String },
  serialNumber: { type: String, required: true },
  numStamps: { type: Number, required: true },
  reason: { type: String },

  // Extra date field
  date: { type: Date, required: true },

  // Report Info
  reportId: { type: String, unique: true },
  reportUrl: { type: String },
  qrCodeUrl: { type: String },
  expiresAt: { type: Date }
}, { timestamps: true });

export default mongoose.model("Form", formSchema);
