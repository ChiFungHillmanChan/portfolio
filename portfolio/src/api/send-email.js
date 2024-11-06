// api/send-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, email, message } = req.body;

    const credentials = JSON.parse(process.env.EMAIL_CREDENTIALS)
    // Configure the transporter with environment variables
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: credentials.EMAIL_USER,
        pass: credentials.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: credentials.user,
      to: 'hillmanchan709@gmail.com',
      subject: 'From my portfolio: Someone contacted me via portfolio',
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
