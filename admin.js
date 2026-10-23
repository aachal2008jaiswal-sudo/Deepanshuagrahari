const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const { db } = require("../firebase");
const { auth, roles } = require("../middleware/auth");
const router = express.Router();

router.get("/users", auth, roles("admin","teacher"), async(req,res,next)=>{
  try {const snap=await db.collection("users").get();res.json(snap.docs.map(d=>{const u=d.data();return{id:d.id,name:u.name,email:u.email,role:u.role,className:u.className||"",board:u.board||""}}));}
  catch(e){next(e);}
});
router.patch("/users/:id/role", auth, roles("admin"), async(req,res,next)=>{
  try {
    if(!["student","teacher","admin"].includes(req.body.role)) return res.status(400).json({error:"Invalid role."});
    const ref=db.collection("users").doc(req.params.id), snap=await ref.get();
    if(!snap.exists) return res.status(404).json({error:"User not found."});
    await ref.update({role:req.body.role,updatedAt:new Date().toISOString()});res.json({ok:true});
  }catch(e){next(e);}
});
router.get("/dashboard", auth, async(req,res,next)=>{
  try {
    const [users,tests,classes,announcements,subs]=await Promise.all([
      db.collection("users").get(),db.collection("tests").get(),db.collection("classes").get(),
      db.collection("announcements").get(),db.collection("submissions").get()
    ]);
    const userDocs=users.docs.map(d=>d.data());
    const mine=subs.docs.map(d=>d.data()).filter(s=>s.studentId===req.user.id);
    const ts=tests.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.published!==false).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const cs=classes.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.startAt.localeCompare(a.startAt));
    const anns=announcements.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    res.json({role:req.user.role,counts:{students:userDocs.filter(u=>u.role==="student").length,teachers:userDocs.filter(u=>u.role==="teacher").length,tests:ts.length,classes:cs.length,attendance:0,submissions:mine.length},tests:ts.slice(0,5).map(t=>({...t,questions:(t.questions||[]).map(({answer,explanation,...q})=>q)})),classes:cs.slice(0,5),announcements:anns.slice(0,5)});
  }catch(e){next(e);}
});
router.post("/announcements", auth, roles("admin","teacher"), async(req,res,next)=>{
  try {const message=String(req.body.message||"").trim();if(!message)return res.status(400).json({error:"Message is required."});const id=uuid(),row={message,by:req.user.name,createdAt:new Date().toISOString()};await db.collection("announcements").doc(id).create(row);res.status(201).json({id,...row});}
  catch(e){next(e);}
});
router.post("/bootstrap-admin", async(req,res,next)=>{
  try {
    // Protected by one-time setup token; set ADMIN_SETUP_TOKEN in environment, call once, then remove it.
    const expected=process.env.ADMIN_SETUP_TOKEN;
    if(!expected || req.headers["x-setup-token"]!==expected) return res.status(403).json({error:"Admin bootstrap is disabled or setup token is incorrect."});
    const email=String(process.env.ADMIN_EMAIL||"").trim().toLowerCase(), password=String(process.env.ADMIN_PASSWORD||"");
    if(!email || password.length<12) return res.status(500).json({error:"Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (12+ characters) in .env."});
    const existing=await db.collection("users").where("role","==","admin").limit(1).get();
    if(!existing.empty) return res.status(409).json({error:"An admin already exists."});
    const id=uuid(),user={id,name:process.env.ADMIN_NAME||"Deepanshu Sir",email,passwordHash:await bcrypt.hash(password,12),role:"admin",className:"",board:"",createdAt:new Date().toISOString()};
    await db.collection("users").doc(id).create(user);res.json({ok:true,message:"Admin created. Remove ADMIN_SETUP_TOKEN and restart the server."});
  }catch(e){next(e);}
});
module.exports=router;
