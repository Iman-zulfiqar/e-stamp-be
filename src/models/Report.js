import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
  generatedAt: { type: Date, default: Date.now },
  pdfUrl: { type: String },
  qrCodeUrl: { type: String }
});

export default mongoose.model("Report", reportSchema);
