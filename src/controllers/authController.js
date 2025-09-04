import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import Otp from "../models/Otp.js";

// Generate random 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

/** =========================
 ** 1. Request OTP for Signup
 ========================== */
 export const requestOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' })
    }

    // deny if already registered (case-insensitive)
    const existing = await User.findOne({ email: new RegExp(`^${email}$`, 'i') })
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const otpCode = generateOtp() // e.g., 6-digit string
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000)

    // hash password now; never store raw
    const passwordHash = await bcrypt.hash(password, 10)

    // Upsert OTP doc with name + passwordHash
    await Otp.findOneAndUpdate(
      { email },
      { email, otp: otpCode, expiresAt: otpExpire, name, passwordHash },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    await sendEmail({
      to: email,
      subject: 'Your OTP Code',
      html: `<p>Hello ${name},</p>
             <p>Your OTP is: <b>${otpCode}</b></p>
             <p>It expires in 5 minutes.</p>`,
    })

    // Do NOT echo back password
    return res.status(200).json({ message: 'OTP sent to your email', email })
  } catch (err) {
    console.error('requestOtp error:', err)
    return res.status(500).json({ message: 'Something went wrong' })
  }
}

/** =========================
 ** 2. Verify OTP & Signup
 ========================== */
 export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' })
    }

    // find OTP record
    const otpRecord = await Otp.findOne({ email })
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP not found. Please request again.' })
    }

    // check expiry
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ email })
      return res.status(400).json({ message: 'OTP expired. Please request again.' })
    }

    // check code
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' })
    }

    // safety: block if someone registered meanwhile
    const already = await User.findOne({ email: new RegExp(`^${email}$`, 'i') })
    if (already) {
      await Otp.deleteOne({ email })
      return res.status(400).json({ message: 'Email already registered' })
    }

    // create user using stored name + passwordHash
    const user = await User.create({
      name: otpRecord.name,
      email,
      password: otpRecord.passwordHash,
    })

    // clean up OTP
    await Otp.deleteOne({ email })

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    return res.status(201).json({
      message: 'Signup successful',
      user: { id: user._id, name: user.name, email: user.email },
      token,
    })
  } catch (err) {
    console.error('verifyOtp error:', err)
    return res.status(500).json({ message: 'Something went wrong' })
  }
}


/** =========================
 ** 3. Login User
 ========================== */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /auth/me
export const getUser = async (req, res) => {

  try {

    // req.user should be set by your auth middleware after verifying the token
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Fetch and omit sensitive fields
    const user = await User.findById(userId)
      .select('-password -__v')  // omit secrets / noise
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error('getUser error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** =========================
 ** 4. Forgot Password (Send OTP)
 ========================== */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpCode = generateOtp();
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.findOneAndUpdate(
      { email },
      { otp: otpCode, expiresAt: otpExpire },
      { upsert: true, new: true }
    );

    await sendEmail({
      to: email,
      subject: "Reset Your Password",
      html: `<p>Hello ${user.name},</p>
             <p>Your password reset OTP is: <b>${otpCode}</b></p>
             <p>This OTP is valid for 5 minutes.</p>`,
    });

    res.status(200).json({ message: "OTP sent to your email", email:email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

/** =========================
 ** 5. Reset Password (Verify OTP & Update Password)
 ========================== */
// controllers/authController.js (add)


export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const otpRecord = await Otp.findOne({ email: normalizedEmail })
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP not found. Please request again.' })
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ email: normalizedEmail })
      return res.status(400).json({ message: 'OTP expired. Please request again.' })
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' })
    }

    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      // You might want to hide existence, but keeping explicit for now
      await Otp.deleteOne({ email: normalizedEmail })
      return res.status(404).json({ message: 'User not found' })
    }

    // Short-lived reset token (15 minutes). Include a purpose claim.
    const resetToken = jwt.sign(
      { sub: String(user._id), prp: 'pwd_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    )

    // (Optional) remove OTP now so it can't be reused
    await Otp.deleteOne({ email: normalizedEmail })

    return res.status(200).json({
      message: 'OTP verified',
      resetToken,
      expiresIn: 15 * 60, // seconds
    })
  } catch (err) {
    console.error('verifyResetOtp error:', err)
    return res.status(500).json({ message: 'Something went wrong' })
  }
}
export const setNewPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and newPassword are required' })
    }

    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'Reset token expired' })
      }
      return res.status(400).json({ message: 'Invalid reset token' })
    }

    if (payload?.prp !== 'pwd_reset' || !payload?.sub) {
      return res.status(400).json({ message: 'Invalid reset token' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    const updated = await User.findByIdAndUpdate(
      payload.sub,
      { password: hashedPassword },
      { new: true }
    )

    if (!updated) {
      return res.status(404).json({ message: 'User not found' })
    }

    // (Optional) Invalidate existing sessions by rotating a token version, etc.

    return res.status(200).json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('setNewPassword error:', err)
    return res.status(500).json({ message: 'Something went wrong' })
  }
}
