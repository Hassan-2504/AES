const crypto = require("crypto");

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "default_key_12345678901234567890123456789012";
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is not defined in .env file");
}
if (Buffer.from(ENCRYPTION_KEY, "utf8").length !== 32) {
  throw new Error(
    `ENCRYPTION_KEY must be exactly 32 bytes (32 characters in UTF-8). Current length: ${
      Buffer.from(ENCRYPTION_KEY, "utf8").length
    }`
  );
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf8"),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text) {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf8"),
    iv
  );
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };
