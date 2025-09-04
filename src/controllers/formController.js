import Form from "../models/Form.js";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";


export const generatePDFWithQR = async (formData) => {
  // Ensure uploads directory exists
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate unique report ID
  const reportId = `RPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Paths for QR and PDF
  const qrCodePath = path.join(uploadDir, `qr-${reportId}.png`);
  const pdfPath = path.join(uploadDir, `report-${reportId}.pdf`);

  // Generate QR Code
  await QRCode.toFile(qrCodePath, `Report ID: ${reportId}`);

  // Generate PDF
  const doc = new PDFDocument();
  const pdfStream = fs.createWriteStream(pdfPath);
  doc.pipe(pdfStream);

  doc.fontSize(18).text("Stamp Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Report ID: ${reportId}`);
  doc.text(`Applicant Name: ${formData.applicantName}`);
  doc.text(`Purpose: ${formData.purpose}`);
  doc.text(`Serial Number: ${formData.serialNumber}`);
  doc.text(`No of Stamps: ${formData.noOfStamps}`);
  doc.text(`Date: ${new Date(formData.date).toLocaleDateString()}`);
  
  doc.addPage();
  doc.image(qrCodePath, {
    fit: [150, 150],
    align: "center",
    valign: "center",
  });

  doc.end();

  // Wait until PDF writing is complete
  await new Promise((resolve) => pdfStream.on("finish", resolve));

  return {
    reportId,
    qrCodePath,
    pdfPath,
  };
};


/**
 * @desc    Create new form + report
 * @route   POST /api/forms
 * @access  Private
 */
export const createForm = async (req, res) => {
  try {
    console.log("RAW BODY:", req.body); // 🛠️ Debug
    const formData = req.body;
    formData.userId = req.user.id;

    // Generate report immediately
    const { reportId, pdfPath, qrCodePath } = await generatePDFWithQR(formData);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const form = await Form.create({
      ...formData,
      reportId,
      reportUrl: pdfPath,
      qrCodeUrl: qrCodePath,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      message: "Form created successfully with report",
      data: form,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get all forms of logged-in user
 * @route   GET /api/forms
 * @access  Private
 */
export const getForms = async (req, res) => {
  try {
    const forms = await Form.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: forms.length,
      data: forms,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get form by ID
 * @route   GET /api/forms/:id
 * @access  Private
 */
export const getFormById = async (req, res) => {
  try {
    console.log(">>id", req.params.id );
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    if (form.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Check if report expired
    const expired = new Date() > form.expiresAt;

    res.status(200).json({
      success: true,
      data: form,
      expired,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Regenerate report if expired
 * @route   POST /api/forms/:id/regenerate
 * @access  Private
 */
export const regenerateReport = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    if (form.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Only regenerate if expired
    if (new Date() < form.expiresAt) {
      return res.status(400).json({ success: false, message: "Report not expired yet" });
    }

    const { reportId, pdfPath, qrCodePath } = await generatePDFWithQR(form);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    form.reportId = reportId;
    form.reportUrl = pdfPath;
    form.qrCodeUrl = qrCodePath;
    form.expiresAt = expiresAt;

    await form.save();

    res.status(200).json({
      success: true,
      message: "Report regenerated successfully",
      data: form,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
