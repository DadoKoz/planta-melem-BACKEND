require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const sgMail = require("@sendgrid/mail");

const app = express();
const PORT = process.env.PORT || 5001;

// SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Dozvoljeni origin-i za CORS
const allowedOrigins = [
  "http://localhost:8080",
  "https://planta-melem.vercel.app",
  "https://www.plantamelem.com",
];

// Ručni CORS headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  next();
});

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

// ------------------------------------------------------------
// ✅ Ruta za narudžbu
// ------------------------------------------------------------
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
        details: "Detalji narudžbine:",
        total: "Ukupno:",
        address: "Adresa za dostavu:",
        contact: "Kontakt telefon:",
        thanks: "Ako imate dodatnih pitanja, slobodno nas kontaktirajte.",
        closing: "Srdačan pozdrav,<br>Vaš tim za podršku",
        itemHtml: (item) =>
          `<li>${item.title || ""} - Količina: ${item.quantity || 1} × ${(item.basePrice ?? 0).toFixed(2)} ${currencyCode} = ${((item.basePrice ?? 0) * (item.quantity || 1)).toFixed(2)} ${currencyCode}</li>`,
      },
      en: {
        subject: "Order Confirmation - Planta Melem",
        heading: `Thank you for your order, ${customer.firstName || ""} ${customer.lastName || ""}!`,
        received: "We have received your order and will process it shortly.",
        details: "Order Details:",
        total: "Total:",
        address: "Shipping Address:",
        contact: "Contact phone:",
        thanks: "If you have any questions, feel free to contact us.",
        closing: "Best regards,<br>Your support team",
        itemHtml: (item) =>
          `<li>${item.title || ""} - Quantity: ${item.quantity || 1} × ${(item.basePrice ?? 0).toFixed(2)} ${currencyCode} = ${((item.basePrice ?? 0) * (item.quantity || 1)).toFixed(2)} ${currencyCode}</li>`,
      },
    };

    const t = messages[lang] || messages["sr"];

    const itemsHtml = items.map((item) => t.itemHtml(item)).join("");

    // Mail prodavcu
    const msgToYou = {
      to: process.env.EMAIL_USER,
      from: process.env.EMAIL_USER,
      subject: "Nova narudžbina melema",
      html: `
        <h2>Nova narudžbina</h2>
        <p><strong>Ime:</strong> ${customer.firstName || ""}</p>
        <p><strong>Prezime:</strong> ${customer.lastName || ""}</p>
        <p><strong>Email:</strong> ${customer.email || ""}</p>
        <p><strong>Telefon:</strong> ${customer.phone || ""}</p>
        <h3>Stavke narudžbine:</h3>
        <ul>${itemsHtml}</ul>
        <p><strong>Ukupno:</strong> ${total?.toFixed(2) || "0.00"} ${currencyCode}</p>
        <p><strong>Adresa:</strong> ${customer.address || ""}, ${customer.city || ""}, ${customer.postalCode || ""}, ${customer.country || ""}</p>
      `,
    };

    // Mail korisniku
    const msgToCustomer = {
      to: customer.email,
      from: process.env.EMAIL_USER,
      subject: t.subject,
      html: `
        <h2>${t.heading}</h2>
        <p>${t.received}</p>
        <h3>${t.details}</h3>
        <ul>${itemsHtml}</ul>
        <p><strong>${t.total}</strong> ${total?.toFixed(2) || "0.00"} ${currencyCode}</p>
        <p><strong>${t.address}</strong> ${customer.address || ""}, ${customer.city || ""}, ${customer.postalCode || ""}, ${customer.country || ""}</p>
        <p>${t.contact}: ${customer.phone || ""}</p>
        <hr>
        <p>${t.thanks}<br>${t.closing}</p>
      `,
    };

    await sgMail.send(msgToYou);
    await sgMail.send(msgToCustomer);

    res.status(200).json({ message: "Narudžbina uspešno poslata, potvrda poslata na email!" });
  } catch (error) {
    console.error("❌ Greška prilikom slanja emaila:", error);
    res.status(500).json({ message: "Greška prilikom slanja narudžbine." });
  }
});

// ------------------------------------------------------------
// ✅ Ruta za kontakt formu
// ------------------------------------------------------------
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!email || !message || !name) {
    return res.status(400).json({ message: "Nedostaju obavezna polja." });
  }

  try {
    const msg = {
      to: process.env.EMAIL_USER,
      from: process.env.EMAIL_USER,
      subject: "📩 Novi kontakt sa sajta",
      html: `
        <h2>Novi kontakt sa sajta</h2>
        <p><strong>Ime:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefon:</strong> ${phone || "Nije unesen"}</p>
        <p><strong>Poruka:</strong><br>${message}</p>
      `,
    };

    await sgMail.send(msg);

    res.status(200).json({ message: "Poruka uspešno poslata!" });
  } catch (error) {
    console.error("❌ Greška prilikom slanja kontakt emaila:", error);
    res.status(500).json({ message: "Greška prilikom slanja poruke." });
  }
});

// ------------------------------------------------------------
// 🚀 Start server
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Server radi na http://localhost:${PORT}`);
});
