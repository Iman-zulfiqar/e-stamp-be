// models/User.js
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // enforce lowercase to avoid case issues later
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
}, { timestamps: true })

function looksLikeBcryptHash(value) {
  // bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars long
  return typeof value === 'string' && /^\$2[aby]\$/.test(value) && value.length === 60
}

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  if (looksLikeBcryptHash(this.password)) return next()        // ← skip rehashing
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

// if you allow password updates via findOneAndUpdate, protect that too
UserSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() || {}
  if (!update.password) return next()
  if (looksLikeBcryptHash(update.password)) return next()
  update.password = await bcrypt.hash(update.password, 10)
  this.setUpdate(update)
  next()
})

export default mongoose.model('User', UserSchema)
