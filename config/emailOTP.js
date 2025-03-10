const speakeasy = require("speakeasy");
const nodemailer = require("nodemailer");

const generateOTP = () => {
  const secret = speakeasy.generateSecret({ length: 20 });
  const otp = speakeasy.totp({
    secret: secret.base32, // base32 encoded
    encoding: "base32",
  });

  return { otp, secret: secret.base32 }; // Save for verification
};

const sendOTPEmail = (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "juliusngjq123@gmail.com", // User Test email
      pass: "", //
    },
  });

  const mailOptions = {
    from: "SideQuest_Team58@outlook.com", // Sender
    to: email,
    subject: "Your OTP for Confirmation",
    text: `Your One-Time Password (OTP) is: ${otp}. It will expire in 5 minutes.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
};

(module.exports = sendOTPEmail), generateOTP;
