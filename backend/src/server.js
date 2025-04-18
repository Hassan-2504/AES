require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Message = require("./models/Message");
const { encrypt, decrypt } = require("./utils/encryption");

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "No authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("JWT Verification Error:", err);
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/aes_db"
    );
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration Error:", error);
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
});

app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res
      .status(500)
      .json({ message: "Error during login", error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (error) {
    console.error("Fetch Users Error:", error);
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
});

app.post("/api/encrypt", authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const encryptedMessage = encrypt(message);
    const newMessage = new Message({
      userId: req.user.userId,
      originalMessage: message,
      encryptedMessage,
    });

    await newMessage.save();
    res.json({ encryptedMessage, messageId: newMessage._id });
  } catch (error) {
    console.error("Encryption Error:", error);
    res
      .status(500)
      .json({ message: "Error encrypting message", error: error.message });
  }
});

app.post("/api/decrypt", authenticateToken, async (req, res) => {
  try {
    const { encryptedMessage, messageId } = req.body;
    if (!encryptedMessage) {
      return res.status(400).json({ message: "Encrypted message is required" });
    }

    const decryptedMessage = decrypt(encryptedMessage);

    if (messageId) {
      const message = await Message.findById(messageId);
      if (!message || message.userId.toString() !== req.user.userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized to update this message" });
      }
      message.lastDecryptedMessage = decryptedMessage;
      await message.save();
    }

    res.json({ decryptedMessage });
  } catch (error) {
    console.error("Decryption Error:", error);
    res
      .status(500)
      .json({ message: "Error decrypting message", error: error.message });
  }
});

app.get("/api/messages", authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(messages);
  } catch (error) {
    console.error("Message History Error:", error);
    res
      .status(500)
      .json({ message: "Error fetching messages", error: error.message });
  }
});

const startServer = async () => {
  await connectToMongoDB();
  const PORT = process.env.PORT || 5000;
  app
    .listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    })
    .on("error", (err) => {
      console.error("Server startup error:", err);
      process.exit(1);
    });
};

startServer();
