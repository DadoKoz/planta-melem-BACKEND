require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5001;

// Dozvoljeni origin-i za CORS
const allowedOrigins = [
  "http://localhost:8080",
  "https://planta-melem.vercel.app",
  "https://www.plantamelem.com",
];


app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy does not allow access from origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
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
    email,
    product,
    quantity,
  } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email je obavezan za potvrdu narudžbe." });
  }

  try {
    let transporter = nodemailer.createTransport({
      host: "mail.plantamelem.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

const mailOptionsToYou = {
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER,
  subject: "Nova narudžbina melema",
  html: `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
      <div style="text-align: center;">
       
        <h2 style="color: #cc3d3d;">Nova narudžba je primljena!</h2>
      </div>
      
      <h3 style="margin-top: 30px;">Podaci o kupcu:</h3>
      <ul>
        <li><strong>Ime:</strong> ${firstName}</li>
        <li><strong>Prezime:</strong> ${lastName}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Telefon:</strong> ${phone}</li>
      </ul>

      <h3>Adresa za dostavu:</h3>
      <p>
        ${address}<br>
        ${postalCode} ${city}<br>
        ${country}
      </p>

      <h3>Detalji narudžbe:</h3>
      <ul>
        <li><strong>Proizvod:</strong> ${product}</li>
        <li><strong>Količina:</strong> ${quantity}</li>
      </ul>

      <hr style="border: none; border-top: 1px solid #ccc; margin-top: 30px;" />
      <p style="font-size: 0.9em; color: #777;">
        Ova poruka je automatski generisana. Za dodatne informacije, posjetite admin panel ili kontaktirajte korisnika direktno.
      </p>
    </div>
  `
};


    const mailOptionsToCustomer = {
  from: process.env.EMAIL_USER,
  to: email,
  subject: "Potvrda narudžbe melema",
  html: `
  <div style="font-family: Arial, sans-serif; color: #333; max-width:600px; margin:auto; border:1px solid #eee; padding:20px; border-radius:8px;">
    <div style="text-align:center; margin-bottom:20px;">
     
    </div>
    <h2 style="color: #348558; text-align:center;">Hvala na narudžbi, ${firstName} ${lastName}!</h2>
    <p style="font-size:16px; line-height:1.6;">Primili smo Vašu narudžbu i uskoro ćemo je obraditi.</p>
    <h3 style="margin-top:30px; color:#555;">Detalji narudžbe:</h3>
    <ul style="list-style:none; padding:0; font-size:15px;">
      <li><strong>Proizvod:</strong> ${product}</li>
      <li><strong>Količina:</strong> ${quantity}</li>
    </ul>
    <h3 style="margin-top:30px; color:#555;">Adresa za dostavu:</h3>
    <p style="font-size:15px; line-height:1.5;">
      ${address}<br>
      ${city}, ${postalCode}<br>
      ${country}
    </p>
    <p style="font-size:15px;"><strong>Kontakt telefon:</strong> ${phone}</p>
    <hr style="border:none; border-top:1px solid #ccc; margin:30px 0;" />
    <p style="font-size:13px; color:#777; text-align:center;">
      Ako imate dodatnih pitanja, slobodno nas kontaktirajte.<br>
      Srdačan pozdrav,<br>
      Vaš tim za podršku
    </p>
  </div>
  `,
};


    await transporter.sendMail(mailOptionsToYou);
    console.log("Mail prodavcu poslat.");

    console.log("Šaljem mail kupcu na:", email);
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
