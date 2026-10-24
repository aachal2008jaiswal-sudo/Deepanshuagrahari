require("dotenv").config();
const express = require("express");
const path = require("path");
const { db } = require("./firebase");

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Keep existing website design and static files in the same project folder.
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(__dirname, { index: "index.html", dotfiles: "ignore" }));

app.get("/api/health", (req,res)=>res.json({ok:true,service:"Education Coaching Centre Firebase API"}));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/me", require("./routes/me"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/students", require("./routes/students"));
app.use("/api/tests", require("./routes/tests"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/fees", require("./routes/fees"));
app.use("/api/materials", require("./routes/materials"));
app.use("/api/classes", require("./routes/classes"));

app.post("/api/ai/generate-questions", require("./middleware/auth").auth, require("./middleware/auth").roles("admin","teacher"), (req,res)=>res.status(503).json({error:"AI question generation is not configured in this Firebase backend yet. Connect your existing Gemini server route securely to enable it."}));
app.post("/api/ai/solve", require("./middleware/auth").auth, (req,res)=>res.status(503).json({error:"AI solver route must be merged from your existing server.js and configured with a server-side Gemini API key."}));

app.get("/portal", (req,res)=>res.sendFile(path.join(__dirname,"portal.html")));
app.get("*",(req,res,next)=>{
  if(req.path.startsWith("/api/")) return res.status(404).json({error:"API endpoint not found."});
  res.sendFile(path.join(__dirname,"index.html"), err=>err && next(err));
});
app.use((err,req,res,next)=>{
  console.error(err);
  if(err.code==="LIMIT_FILE_SIZE") return res.status(413).json({error:"File too large. Maximum size is 8 MB."});
  if(err.message && err.message.includes("Only PDF")) return res.status(400).json({error:err.message});
  res.status(500).json({error:"Server error. Check server logs for details."});
});

async function start(){
  // Confirm Firestore is reachable without exposing secrets.
  await db.collection("_health").doc("check").set({checkedAt:new Date().toISOString()});
  app.listen(PORT,()=>console.log(`Education Coaching Centre running on http://localhost:${PORT}`));
}
start().catch(err=>{console.error("Startup failed. Check Firebase credentials and project configuration.",err);process.exit(1);});
