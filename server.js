import { Resend } from "resend";
import Cors from "cors";

// Inicijalizacija CORS middleware
const cors = Cors({
  origin: [
    "http://localhost:8080",
    "https://planta-melem.vercel.app",
    "https://www.plantamelem.com",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
});

// Pomoćna funkcija za pokretanje middleware-a u serverless okruženju
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

// Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Pokreni CORS middleware
  await runMiddleware(req, res, cors);

  // Dozvoljeni samo POST zahtjevi
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { customer, items, total, lang = "sr", currencyCode = "BAM" } = req.body;

  if (!customer?.email) {
    return res.status(400).json({ message: "Email je obavezan za potvrdu narudžbine." });
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
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_FROM,
      subject: "Nova narudžbina melema",
      text: `Nova narudžbina od ${customer.firstName || ""} ${customer.lastName || ""}, email: ${customer.email}`,
    });

    // Mail korisniku
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
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
}
