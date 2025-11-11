import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

// Učitavanje env promenljivih (Render koristi Environment Variables)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Dozvoljene origin adrese
const allowedOrigins = [
  "http://localhost:8080",
  "https://planta-melem.vercel.app",
  "https://www.plantamelem.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error(`Not allowed by CORS: ${origin}`), false);
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

// Health check ruta da Render ne timeout-uje deploy
app.get("/", (req, res) => {
  res.send("Backend je live!");
});

// Nodemailer transporter za Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,       // Gmail account
    pass: process.env.GMAIL_APP_PASS,   // 16-znamenkasti App Password
  },
});

// ✅ Ruta za narudžbu
app.post("/api/order", async (req, res) => {
  const { customer, items, total, lang = "sr", currencyCode = "BAM" } = req.body;

  if (!customer?.email) {
    return res.status(400).json({ message: "Email je obavezan za potvrdu narudžbe." });
  }

  try {
    const messages = {
      sr: {
        subject: "Potvrda narudžbe melema",
        heading: `Hvala na narudžbi, ${customer.firstName || ""} ${customer.lastName || ""}!`,
        received: "Primili smo Vašu narudžbu i uskoro ćemo je obraditi.",
        itemHtml: (item) =>
          `<li>${item.title || ""} - Količina: ${item.quantity || 1} × ${(item.basePrice ?? 0).toFixed(2)} ${currencyCode} = ${((item.basePrice ?? 0) * (item.quantity || 1)).toFixed(2)} ${currencyCode}</li>`,
      },
      en: {
        subject: "Order Confirmation - Planta Melem",
        heading: `Thank you for your order, ${customer.firstName || ""} ${customer.lastName || ""}!`,
        received: "We have received your order and will process it shortly.",
        itemHtml: (item) =>
          `<li>${item.title || ""} - Quantity: ${item.quantity || 1} × ${(item.basePrice ?? 0).toFixed(2)} ${currencyCode} = ${((item.basePrice ?? 0) * (item.quantity || 1)).toFixed(2)} ${currencyCode}</li>`,
      },
    };

    const t = messages[lang] || messages["sr"];
    const itemsHtml = items.map((i) => t.itemHtml(i)).join("");

    // Mail prodavcu
    await transporter.sendMail({
      from: `"Planta Melem" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: "Nova narudžbina melema",
      text: `Nova narudžbina od ${customer.firstName || ""} ${customer.lastName || ""}, email: ${customer.email}`,
    });

    // Mail korisniku
    await transporter.sendMail({
      from: `"Planta Melem" <${process.env.GMAIL_USER}>`,
      to: customer.email,
      subject: t.subject,
      html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>${t.heading}</h2>
        <p>${t.received}</p>
        <ul>${itemsHtml}</ul>
        <p>Ukupno: ${total?.toFixed(2) || "0.00"} ${currencyCode}</p>
      </div>
      `,
    });

    res.status(200).json({ message: "Narudžbina uspešno poslata!" });
  } catch (error) {
    console.error("❌ Greška prilikom slanja emaila:", error);
    res.status(500).json({ message: "Greška prilikom slanja narudžbine." });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`);
});
