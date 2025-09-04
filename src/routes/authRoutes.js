import express from "express";
import {
  forgotPassword,
  getUser,
  login,
  requestOtp,
  
  setNewPassword,
  
  verifyOtp,
  verifyResetOtp,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

import { Router } from 'express'
const router = Router()   

router.post("/signup", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", setNewPassword);
router.post("/login", login);
router.get("/me", authMiddleware, getUser);

export default router;
