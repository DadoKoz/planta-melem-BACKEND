require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5001;

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

// ✅ Ruta za narudžbu
app.post("/api/order", async (req, res) => {
  const {
    customer,
    items,
    total,
    lang = "sr",
    currencyCode = "BAM",
  } = req.body;

  if (!customer?.email) {
    return res.status(400).json({
      message: "Email je obavezan za potvrdu narudžbe.",
    });
  }

  try {
    let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


    // Tekstovi po jeziku
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
        itemLine: (item) =>
          `${item.title || ""} - Količina: ${item.quantity || 1} × ${(item.basePrice ?? 0).toFixed(2)} ${currencyCode} = ${((item.basePrice ?? 0) * (item.quantity || 1)).toFixed(2)} ${currencyCode}`,
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
        itemLine: (item) =>
          `${item.title || ""} - Quantity: ${item.quantity || 1} × ${(item.basePrice ?? 0).toFixed(2)} ${currencyCode} = ${((item.basePrice ?? 0) * (item.quantity || 1)).toFixed(2)} ${currencyCode}`,
        itemHtml: (item) =>
          `<li>${item.title || ""} - Quantity: ${item.quantity || 1} × ${(item.basePrice ?? 0).toFixed(2)} ${currencyCode} = ${((item.basePrice ?? 0) * (item.quantity || 1)).toFixed(2)} ${currencyCode}</li>`,
      },
    };

    const t = messages[lang] || messages["sr"];

    const itemsText = items
      .map((item) => t.itemLine(item))
      .join("\n");

    const mailOptionsToYou = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Nova narudžbina melema",
      text: `
Imate novu narudžbinu:

Ime: ${customer.firstName || ""}
Prezime: ${customer.lastName || ""}
Adresa: ${customer.address || ""}
Grad: ${customer.city || ""}
Poštanski broj: ${customer.postalCode || ""}
Zemlja: ${customer.country || ""}
Telefon: ${customer.phone || ""}
Email: ${customer.email || ""}

Stavke narudžbine:
${itemsText}

Ukupno: ${total?.toFixed(2) || "0.00"} ${currencyCode}
      `,
    };

    const mailOptionsToCustomer = {
      from: process.env.EMAIL_USER,
      to: customer.email,
      subject: t.subject,
      html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #348558;">${t.heading}</h2>
        <p>${t.received}</p>
        <h3>${t.details}</h3>
        <ul>
          ${items.map((item) => t.itemHtml(item)).join("")}
        </ul>
        <h3>${t.total}</h3>
        <p><strong>${total?.toFixed(2) || "0.00"} ${currencyCode}</strong></p>
        <h3>${t.address}</h3>
        <p>${customer.address || ""}<br>${customer.city || ""}, ${customer.postalCode || ""}<br>${customer.country || ""}</p>
        <p>${t.contact}: ${customer.phone || ""}</p>
        <hr style="border:none; border-top:1px solid #ccc;" />
        <p style="font-size: 0.9em; color: #777;">
          ${t.thanks}<br>
          ${t.closing}
        </p>
      </div>
      `,
    };

    await transporter.sendMail(mailOptionsToYou);
    console.log("✅ Mail prodavcu poslat.");

    await transporter.sendMail(mailOptionsToCustomer);
    console.log("✅ Potvrda korisniku poslana.");

    res.status(200).json({
      message: "Narudžbina uspešno poslata, potvrda poslata na email!",
    });
  } catch (error) {
    console.error("❌ Greška prilikom slanja emaila:", error);
    res.status(500).json({
      message: "Greška prilikom slanja narudžbine.",
    });
  }
});

// ✅ Ruta za kontakt formu
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!email || !message || !name) {
    return res.status(400).json({ message: "Nedostaju obavezna polja." });
  }

  try {
    let transporter = nodemailer.createTransport({
      host: "185.212.108.34",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        servername: "mail.plantamelem.com",
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER,
  subject: "📩 Novi kontakt sa sajta",
  html: `
    <div style="background-image: url('cid:backgroundImage'); background-size: cover; background-position: center; padding: 60px 30px; font-family: Arial, sans-serif; color: white; position: relative;">
      <div style="background-color: rgba(0,0,0,0.6); padding: 40px; border-radius: 12px; max-width: 600px; margin: auto;">
        <h2 style="font-size: 28px; margin-bottom: 20px;">📩 Novi kontakt sa sajta</h2>
        <p><strong>Ime:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefon:</strong> ${phone || "Nije unesen"}</p>
        <p style="margin-top: 20px;"><strong>Poruka:</strong><br>${message}</p>
      </div>
    </div>
  `,
  attachments: [
    {
      filename: 'image2.jpeg',
      path: path.join(__dirname, 'public/image2.jpeg'),
      cid: 'backgroundImage',
    },
  ],
};


    await transporter.sendMail(mailOptions);

    console.log("✅ Kontakt email sa slikom poslat.");
    res.status(200).json({ message: "Poruka uspešno poslata!" });
  } catch (error) {
    console.error("❌ Greška prilikom slanja kontakt emaila:", error);
    res.status(500).json({ message: "Greška prilikom slanja poruke." });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server radi na http://localhost:${PORT}`);
});
