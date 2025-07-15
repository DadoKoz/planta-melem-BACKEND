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
  // Očekujemo da frontend šalje podatke u formatu:
  // {
  //   customer: { firstName, lastName, address, city, postalCode, country, phone, email },
  //   items: [ { id, title, price, quantity }, ... ],
  //   total: broj
  // }

  const { customer, items, total } = req.body;

  if (!customer?.email) {
    return res.status(400).json({ message: "Email je obavezan za potvrdu narudžbe." });
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

    // Pripremi tekst za prodavca sa svim stavkama iz korpe
    const itemsText = items
      .map(
        (item) =>
          `${item.title} - Količina: ${item.quantity} - Cena: ${item.price}`
      )
      .join("\n");

    const mailOptionsToYou = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Nova narudžbina melema",
      text: `
Imate novu narudžbinu:

Ime: ${customer.firstName}
Prezime: ${customer.lastName}
Adresa: ${customer.address}
Grad: ${customer.city}
Poštanski broj: ${customer.postalCode}
Zemlja: ${customer.country}
Telefon: ${customer.phone}
Email: ${customer.email}

Stavke narudžbine:
${itemsText}

Ukupno: ${total.toFixed(2)} KM
      `,
    };

    const mailOptionsToCustomer = {
      from: process.env.EMAIL_USER,
      to: customer.email,
      subject: "Potvrda narudžbe melema",
      html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #348558;">Hvala na narudžbi, ${customer.firstName} ${customer.lastName}!</h2>
        <p>Primili smo Vašu narudžbinu i uskoro ćemo je obraditi.</p>
        <h3>Detalji narudžbine:</h3>
        <ul>
          ${items
            .map(
              (item) =>
                `<li>${item.title} - Količina: ${item.quantity} - Cena: ${item.price}</li>`
            )
            .join("")}
        </ul>
        <h3>Ukupno:</h3>
        <p><strong>${total.toFixed(2)} KM</strong></p>
        <h3>Adresa za dostavu:</h3>
        <p>${customer.address}<br>${customer.city}, ${customer.postalCode}<br>${customer.country}</p>
        <p>Kontakt telefon: ${customer.phone}</p>
        <hr style="border:none; border-top:1px solid #ccc;" />
        <p style="font-size: 0.9em; color: #777;">
          Ako imate dodatnih pitanja, slobodno nas kontaktirajte.<br>
          Srdačan pozdrav,<br>
          Vaš tim za podršku
        </p>
      </div>
      `,
    };

    await transporter.sendMail(mailOptionsToYou);
    console.log("Mail prodavcu poslat.");

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
