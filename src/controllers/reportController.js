import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import Report from "../models/Report.js";
import Form from "../models/Form.js";

export const generateReport = async (req, res) => {
  try {
    const { formId } = req.params;
    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found" });

    const qrData = `${process.env.CLIENT_URL}/report/${form._id}`;
    const qrCodePath = `uploads/qr-${form._id}.png`;
    await QRCode.toFile(qrCodePath, qrData);

    const pdfPath = `uploads/report-${form._id}.pdf`;
    const pdfDoc = new PDFDocument();
    pdfDoc.pipe(fs.createWriteStream(pdfPath));

    pdfDoc.fontSize(18).text("Report Details", { align: "center" });
    pdfDoc.moveDown();
    pdfDoc.text(`Field 1: ${form.field1}`);
    pdfDoc.text(`Field 2: ${form.field2}`);
    pdfDoc.image(qrCodePath, { width: 120, height: 120 });

    pdfDoc.end();

    const report = await Report.create({
      formId,
      pdfUrl: pdfPath,
      qrCodeUrl: qrCodePath
    });

    res.json({ message: "Report generated", report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
