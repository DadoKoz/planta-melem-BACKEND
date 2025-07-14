require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
const PORT = 5001; // tvoj port, promijeni po potrebi

app.use(cors({
  origin: "http://localhost:8080",
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());

app.post("/api/order", async (req, res) => {
  const {
    firstName,
    lastName,
    address,
    city,
    postalCode,
    country,
    phone,
    email,       // korisnikov email
    product,
    quantity,
  } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email je obavezan za potvrdu narudžbe." });
  }

  try {
    let transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 1. Mail tebi (prodavcu)
    const mailOptionsToYou = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Nova narudžbina melema",
      text: `
Imate novu narudžbinu:

Ime: ${firstName}
Prezime: ${lastName}
Adresa: ${address}
Grad: ${city}
Poštanski broj: ${postalCode}
Zemlja: ${country}
Telefon: ${phone}
Email: ${email}
Proizvod: ${product}
Količina: ${quantity}
      `,
    };

    // 2. Mail korisniku - potvrda narudžbe (HTML)
    const mailOptionsToCustomer = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Potvrda narudžbe melema",
      html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #348558;">Hvala na narudžbi, ${firstName} ${lastName}!</h2>
        <p>Primili smo Vašu narudžbu i uskoro ćemo je obraditi.</p>
        <h3>Detalji narudžbe:</h3>
        <ul>
          <li><strong>Proizvod:</strong> ${product}</li>
          <li><strong>Količina:</strong> ${quantity}</li>
        </ul>
        <h3>Adresa za dostavu:</h3>
        <p>${address}<br>${city}, ${postalCode}<br>${country}</p>
        <p>Kontakt telefon: ${phone}</p>
        <hr style="border:none; border-top:1px solid #ccc;" />
        <p style="font-size: 0.9em; color: #777;">
          Ako imate dodatnih pitanja, slobodno nas kontaktirajte.<br>
          Srdačan pozdrav,<br>
          Vaš tim za podršku
        </p>
      </div>
      `,
    };

  // Pošalji mail tebi (prodavcu)
await transporter.sendMail(mailOptionsToYou);
console.log("Mail prodavcu poslat.");

// Log email adrese kupca za potvrdu
console.log("Šaljem mail kupcu na:", email);

// Pošalji potvrdu korisniku
await transporter.sendMail(mailOptionsToCustomer);
console.log("Potvrda korisniku poslana.");

    res.status(200).json({ message: "Narudžbina uspešno poslata, potvrda poslata na email!" });
  } catch (error) {
    console.error("Greška prilikom slanja emaila:", error);
    res.status(500).json({ message: "Greška prilikom slanja narudžbine." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server radi na http://localhost:${PORT}`);
});
