import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import path from "path";
import morgan from 'morgan'

dotenv.config();

const app = express();
app.use(express.json());
app.use(morgan('dev'))

const corsOptions = {
  origin: ['http://localhost:8080'],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
// app.options('*', cors(corsOptions));          // ❌ remove this
// app.options('(.*)', cors(corsOptions));       // ✅ if you want it explicitly

app.use(helmet());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/reports", formRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch(err => console.log(err));
