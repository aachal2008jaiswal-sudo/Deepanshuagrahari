const jwt = require("jsonwebtoken");
const { db } = require("../firebase");

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(500).json({ error: "Server JWT_SECRET must be set to a long random secret." });
    }
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Login required. Please sign in again." });
  }
}
const roles = (...allowed) => (req, res, next) =>
  allowed.includes(req.user.role) ? next() : res.status(403).json({ error: "You do not have permission for this action." });

async function loadUser(req, res, next) {
  try {
    const snap = await db.collection("users").doc(req.user.id).get();
    if (!snap.exists) return res.status(401).json({ error: "Account not found." });
    req.account = snap.data();
    next();
  } catch (e) { next(e); }
}
module.exports = { auth, roles, loadUser };
