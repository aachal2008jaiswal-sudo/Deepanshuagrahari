const express = require("express");
const { v4: uuid } = require("uuid");
const { db } = require("../firebase");
const { auth, roles } = require("../middleware/auth");
const router = express.Router();

router.get("/", auth, roles("admin", "teacher"), async (req, res, next) => {
  try {
    const snap = await db.collection("students").orderBy("createdAt", "desc").get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { next(e); }
});
router.post("/", auth, roles("admin", "teacher"), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!String(b.name || "").trim() || !String(b.className || "").trim())
      return res.status(400).json({ error: "Student name and class are required." });
    const id = uuid();
    const row = {
      name: String(b.name).trim(), className: String(b.className).trim(),
      board: String(b.board || "UP Board"), rollNumber: String(b.rollNumber || "").trim(),
      phone: String(b.phone || "").trim(), guardianName: String(b.guardianName || "").trim(),
      guardianPhone: String(b.guardianPhone || "").trim(), address: String(b.address || "").trim(),
      email: String(b.email || "").trim().toLowerCase(), active: true,
      createdAt: new Date().toISOString(), createdBy: req.user.id
    };
    await db.collection("students").doc(id).create(row);
    res.status(201).json({ id, ...row });
  } catch (e) { next(e); }
});
router.patch("/:id", auth, roles("admin", "teacher"), async (req, res, next) => {
  try {
    const ref = db.collection("students").doc(req.params.id), snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Student not found." });
    const allowed = ["name","className","board","rollNumber","phone","guardianName","guardianPhone","address","email","active"];
    const patch = {};
    for (const key of allowed) if (req.body[key] !== undefined) patch[key] = req.body[key];
    patch.updatedAt = new Date().toISOString();
    await ref.update(patch);
    res.json({ id: snap.id, ...snap.data(), ...patch });
  } catch (e) { next(e); }
});
router.delete("/:id", auth, roles("admin"), async (req, res, next) => {
  try {
    const ref = db.collection("students").doc(req.params.id), snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Student not found." });
    await ref.update({ active: false, archivedAt: new Date().toISOString() }); // archive instead of destructive delete
    res.json({ ok: true, message: "Student archived." });
  } catch (e) { next(e); }
});
module.exports = router;
