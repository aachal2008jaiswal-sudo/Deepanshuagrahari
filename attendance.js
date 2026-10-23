const express = require("express");
const { v4: uuid } = require("uuid");
const { db } = require("../firebase");
const { auth, roles } = require("../middleware/auth");
const router = express.Router();
const today = () => new Date().toISOString().slice(0,10);

router.get("/", auth, async (req, res, next) => {
  try {
    let q = db.collection("attendance");
    if (req.user.role === "student") q = q.where("studentId", "==", req.user.id);
    const snap = await q.get();
    let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    rows.sort((a,b)=>(b.date || "").localeCompare(a.date || ""));
    res.json(rows);
  } catch (e) { next(e); }
});
router.post("/checkin", auth, roles("student"), async (req, res, next) => {
  try {
    const date = today(), classId = String(req.body.classId || req.user.className || "general");
    const id = `${req.user.id}_${date}_${classId.replace(/[^a-zA-Z0-9_-]/g,"_")}`;
    const ref = db.collection("attendance").doc(id), snap = await ref.get();
    if (snap.exists) return res.json({ ok: true, attendance: { id, ...snap.data() }, message: "Attendance already recorded for today." });
    const row = { studentId:req.user.id, studentName:req.user.name, classId, date, checkIn:new Date().toISOString(), status:"Present", method:"Portal check-in" };
    await ref.create(row); res.json({ ok:true, attendance:{id,...row} });
  } catch (e) { next(e); }
});
router.post("/manual", auth, roles("admin","teacher"), async (req, res, next) => {
  try {
    const { studentId, date = today(), status = "Present", classId = "general" } = req.body || {};
    if (!studentId || !["Present","Absent","Late"].includes(status)) return res.status(400).json({ error: "Student and valid attendance status are required." });
    const userSnap = await db.collection("users").doc(studentId).get();
    const studentSnap = await db.collection("students").doc(studentId).get();
    const student = userSnap.exists ? userSnap.data() : (studentSnap.exists ? studentSnap.data() : null);
    if (!student) return res.status(404).json({ error: "Student account/record not found. Student must have a portal account for attendance." });
    const id = `${studentId}_${date}_${String(classId).replace(/[^a-zA-Z0-9_-]/g,"_")}`;
    const row = { studentId, studentName: student.name, classId, date, status, checkIn: new Date().toISOString(), method: "Teacher/admin" };
    await db.collection("attendance").doc(id).set(row, { merge: true });
    res.json({ id, ...row });
  } catch (e) { next(e); }
});
module.exports = router;
