const express = require("express");
const { v4: uuid } = require("uuid");
const { db } = require("../firebase");
const { auth, roles } = require("../middleware/auth");
const router = express.Router();
const publicTest = t => ({ ...t, questions: (t.questions || []).map(({ answer, explanation, ...q }) => q) });

router.get("/", auth, async (req, res, next) => {
  try {
    const snap = await db.collection("tests").orderBy("createdAt", "desc").get();
    let tests = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.published !== false);
    if (req.user.role === "student") tests = tests.filter(t => t.className === "All" || t.className === req.user.className);
    res.json(tests.map(publicTest));
  } catch (e) { next(e); }
});
router.post("/", auth, roles("admin", "teacher"), async (req, res, next) => {
  try {
    const { title, className = "All", subject = "General", dueAt = "", questions = [], published = true } = req.body || {};
    if (!String(title || "").trim() || !Array.isArray(questions) || !questions.length)
      return res.status(400).json({ error: "Test title and at least one question are required." });
    const cleaned = questions.map(q => {
      if (!String(q.question || "").trim() || !Array.isArray(q.options) || q.options.length < 2 || !Number.isInteger(Number(q.answer)) || Number(q.answer) < 0 || Number(q.answer) >= q.options.length)
        throw new Error("Each question needs text, options, and a valid zero-based answer index.");
      return { id: uuid(), question: String(q.question).trim(), options: q.options.slice(0, 4).map(String), answer: Number(q.answer), explanation: String(q.explanation || ""), marks: Math.max(1, Number(q.marks) || 1) };
    });
    const id = uuid(), row = { title: String(title).trim(), className, subject, dueAt, questions: cleaned, published: Boolean(published), createdBy: req.user.id, teacherName: req.user.name, createdAt: new Date().toISOString() };
    await db.collection("tests").doc(id).create(row);
    res.status(201).json({ ok: true, test: publicTest({ id, ...row }) });
  } catch (e) { if (e.message.startsWith("Each question")) return res.status(400).json({ error: e.message }); next(e); }
});
router.post("/:id/submit", auth, roles("student"), async (req, res, next) => {
  try {
    const testRef = db.collection("tests").doc(req.params.id), testSnap = await testRef.get();
    if (!testSnap.exists) return res.status(404).json({ error: "Test not found." });
    const test = testSnap.data();
    if (test.className !== "All" && test.className !== req.user.className) return res.status(403).json({ error: "This test is not assigned to your class." });
    const subRef = db.collection("submissions").doc(`${req.params.id}_${req.user.id}`);
    const existing = await subRef.get();
    if (existing.exists) return res.status(409).json({ error: "You have already submitted this test." });
    const answers = req.body.answers || {}; let score = 0, total = 0;
    for (const q of test.questions) { total += q.marks || 1; if (Number(answers[q.id]) === q.answer) score += q.marks || 1; }
    const row = { testId: req.params.id, testTitle: test.title, studentId: req.user.id, studentName: req.user.name, answers, score, total, submittedAt: new Date().toISOString() };
    await subRef.create(row);
    res.json({ score, total, percentage: total ? Math.round(score / total * 100) : 0 });
  } catch (e) { next(e); }
});
router.get("/:id/ranking", auth, async (req, res, next) => {
  try {
    if (req.user.role === "student") {
      const own = await db.collection("submissions").doc(`${req.params.id}_${req.user.id}`).get();
      if (!own.exists) return res.status(403).json({ error: "Submit the test to view ranking." });
    } else if (!["admin", "teacher"].includes(req.user.role)) return res.status(403).json({ error: "Not allowed." });
    const snap = await db.collection("submissions").where("testId", "==", req.params.id).get();
    res.json(snap.docs.map(d => d.data()).sort((a,b)=>b.score-a.score || a.submittedAt.localeCompare(b.submittedAt)).map((s,i)=>({ rank:i+1, name:s.studentName, score:s.score, total:s.total, percentage:s.total ? Math.round(s.score/s.total*100) : 0 })));
  } catch (e) { next(e); }
});
module.exports = router;
