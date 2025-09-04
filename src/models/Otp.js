// models/Otp.js
import mongoose from 'mongoose'

const OtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    // store what we need to finish signup later:
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
)

// TTL: document auto-deletes at expiresAt
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('Otp', OtpSchema)
