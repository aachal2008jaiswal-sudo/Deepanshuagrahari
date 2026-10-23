const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const { db } = require("../firebase");
const { auth, loadUser } = require("../middleware/auth");
const router = express.Router();

function makeToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("Configure a strong JWT_SECRET in .env");
  return jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
function safeUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, className: u.className || "", board: u.board || "" };
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role = "student", className = "Class 6", board = "UP Board" } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!String(name || "").trim() || !cleanEmail || String(password || "").length < 8)
      return res.status(400).json({ error: "Name, email and password (at least 8 characters) are required." });
    // Public self-registration may create students only. Admin creates teacher accounts/changes roles.
    if (role !== "student") return res.status(403).json({ error: "Only student self-registration is allowed. Ask admin for a teacher account." });
    const found = await db.collection("users").where("email", "==", cleanEmail).limit(1).get();
    if (!found.empty) return res.status(409).json({ error: "This email is already registered." });
    const user = { id: uuid(), name: String(name).trim(), email: cleanEmail, passwordHash: await bcrypt.hash(password, 12), role, className, board, createdAt: new Date().toISOString() };
    await db.collection("users").doc(user.id).create(user);
    return res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (e) { next(e); }
});
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const snap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (snap.empty) return res.status(401).json({ error: "Email or password is incorrect." });
    const user = snap.docs[0].data();
    if (!await bcrypt.compare(password, user.passwordHash || "")) return res.status(401).json({ error: "Email or password is incorrect." });
    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (e) { next(e); }
});
router.get("/me", auth, loadUser, (req, res) => res.json(safeUser(req.account)));
module.exports = router;
