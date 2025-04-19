"use client";
import { useState, useEffect, useCallback } from "react";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Message {
  _id: string;
  originalMessage: string;
  encryptedMessage: string;
  lastDecryptedMessage?: string;
  createdAt: string;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authFormData, setAuthFormData] = useState({
    email: "",
    password: "",
  });
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);

  const fetchMessageHistory = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get("/api/messages");
      setMessageHistory(data);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching message history:", err);
      setError(
        (axios.isAxiosError(err) && err.response?.data?.message) ||
          "Failed to fetch message history"
      );
    }
  }, [token]);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setAuthenticatedUser(JSON.parse(savedUser));
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    if (token) {
      fetchMessageHistory();
    }
  }, [token, fetchMessageHistory]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/api/users");
      setUsers(data);
      setError(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Error fetching users");
      } else {
        setError("An unexpected error occurred");
      }
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/users/register", formData);
      await fetchUsers();
      setFormData({ name: "", email: "", password: "" });
      setError(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Error registering user");
      } else {
        setError("An unexpected error occurred");
      }
      console.error("Error:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/users/login", authFormData);
      setToken(data.token);
      setAuthenticatedUser(data.user);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setError(null);
      setAuthFormData({ email: "", password: "" });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Login failed");
      } else {
        setError("An unexpected error occurred");
      }
      console.error("Error:", err);
    }
  };

  const handleEncrypt = async () => {
    if (!token || !message) {
      setError("Please enter a message and ensure you're logged in");
      return;
    }
    try {
      const { data } = await api.post("/api/encrypt", { message });
      setEncryptedMessage(data.encryptedMessage);
      setCurrentMessageId(data.messageId);
      setError(null);
      await fetchMessageHistory();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error("Error encrypting:", err);
        setError(err.response?.data?.message || "Error encrypting message");
      } else {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      }
    }
  };

  const handleDecrypt = async () => {
    if (!token || !encryptedMessage) {
      setError(
        "Please provide an encrypted message and ensure you're logged in"
      );
      return;
    }
    try {
      const { data } = await api.post("/api/decrypt", {
        encryptedMessage,
        messageId: currentMessageId,
      });
      setMessage(data.decryptedMessage);
      setError(null);
      await fetchMessageHistory();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error("Error decrypting:", err);
        setError(err.response?.data?.message || "Error decrypting message");
      } else {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      }
    }
  };

  const handleLogout = () => {
    setAuthenticatedUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setMessageHistory([]);
    setMessage("");
    setEncryptedMessage("");
    setCurrentMessageId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <section className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl mt-16">
          <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">
            User Management
          </h2>
          <form onSubmit={handleSubmit} className="mb-8 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-white/5 border-white/10 focus:border-blue-500 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full bg-white/5 border-white/10 focus:border-blue-500 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full bg-white/5 border-white/10 focus:border-blue-500 text-white"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Register User
            </Button>
          </form>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div>
            <h2 className="text-2xl font-bold mb-4">Users List</h2>
            {loading ? (
              <p>Loading users...</p>
            ) : (
              <div className="space-y-2">
                {users.length === 0 ? (
                  <p>No users found.</p>
                ) : (
                  users.map((user) => (
                    <div key={user._id} className="p-4 border rounded">
                      <p>
                        <strong>Name:</strong> {user.name}
                      </p>
                      <p>
                        <strong>Email:</strong> {user.email}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
        <section className="mb-16 mt-16 bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl">
          <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Authentication
          </h2>
          {authenticatedUser ? (
            <div className="text-center">
              <p className="mb-4">Welcome, {authenticatedUser.name}!</p>
              <Button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Logout
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6 max-w-md mx-auto">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={authFormData.email}
                  onChange={(e) =>
                    setAuthFormData({ ...authFormData, email: e.target.value })
                  }
                  placeholder="Enter your email"
                  className="w-full bg-white/5 border-white/10 focus:border-purple-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={authFormData.password}
                  onChange={(e) =>
                    setAuthFormData({
                      ...authFormData,
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter your password"
                  className="w-full bg-white/5 border-white/10 focus:border-purple-500 text-white"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
              >
                Login
              </Button>
            </form>
          )}
        </section>
        <section className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl">
          <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Message Encryption
          </h2>
          {authenticatedUser ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Message to Encrypt
                </label>
                <textarea
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white resize-none"
                  placeholder="Enter your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button
                  onClick={handleEncrypt}
                  className="mt-2 w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
                >
                  Encrypt Message
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Encrypted/Decrypted Message
                </label>
                <textarea
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white resize-none"
                  placeholder="Your encrypted/decrypted message will appear here..."
                  value={encryptedMessage}
                  onChange={(e) => setEncryptedMessage(e.target.value)}
                />
                <Button
                  onClick={handleDecrypt}
                  className="mt-2 w-full bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
                >
                  Decrypt Message
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p>Please login to use encryption/decryption features</p>
            </div>
          )}
        </section>
        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Message History</h3>
          <div className="space-y-4">
            {messageHistory.map((msg) => (
              <div key={msg._id} className="bg-white/5 p-4 rounded-lg">
                <p className="text-sm text-gray-400">
                  {new Date(msg.createdAt).toLocaleString()}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Original Message:
                    </p>
                    <p className="mt-1">{msg.originalMessage}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Encrypted:
                    </p>
                    <p className="mt-1 break-all">{msg.encryptedMessage}</p>
                  </div>
                  {msg.lastDecryptedMessage && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-400">
                        Last Decrypted:
                      </p>
                      <p className="mt-1">{msg.lastDecryptedMessage}</p>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setEncryptedMessage(msg.encryptedMessage);
                      setCurrentMessageId(msg._id);
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Use This Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
