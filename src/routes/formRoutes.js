import express from "express";
import { createForm, getForms, getFormById, regenerateReport } from "../controllers/formController.js";
import authMiddleware  from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createForm);                  // Create form + report
router.get("/", authMiddleware, getForms);                    // Get all forms
router.get("/:id", authMiddleware, getFormById);              // Get form by ID
router.post("/:id/regenerate", authMiddleware, regenerateReport); // Regenerate report

export default router;
