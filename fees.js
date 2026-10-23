const express = require("express");
const { v4: uuid } = require("uuid");
const { db } = require("../firebase");
const { auth, roles } = require("../middleware/auth");
const router = express.Router();

router.get("/", auth, roles("admin","teacher"), async (req,res,next)=>{
  try { const snap=await db.collection("fees").orderBy("createdAt","desc").get(); res.json(snap.docs.map(d=>({id:d.id,...d.data()}))); }
  catch(e){next(e);}
});
router.post("/", auth, roles("admin","teacher"), async (req,res,next)=>{
  try {
    const b=req.body||{}, amount=Number(b.amount), paid=Number(b.paid||0);
    if(!b.studentId || !Number.isFinite(amount) || amount<0 || !Number.isFinite(paid) || paid<0 || paid>amount)
      return res.status(400).json({error:"Student ID, valid total amount and paid amount (not greater than total) are required."});
    const user=await db.collection("users").doc(b.studentId).get();
    const student=await db.collection("students").doc(b.studentId).get();
    const record=user.exists?user.data():(student.exists?student.data():null);
    if(!record) return res.status(404).json({error:"Student not found."});
    const id=uuid(), row={studentId:b.studentId,studentName:record.name,amount,paid,balance:amount-paid,month:String(b.month||""),paymentDate:String(b.paymentDate||new Date().toISOString().slice(0,10)),method:String(b.method||"Cash"),note:String(b.note||""),createdAt:new Date().toISOString(),createdBy:req.user.id};
    await db.collection("fees").doc(id).create(row); res.status(201).json({id,...row});
  } catch(e){next(e);}
});
router.get("/student/:studentId", auth, async (req,res,next)=>{
  try {
    if(req.user.role==="student" && req.user.id!==req.params.studentId) return res.status(403).json({error:"Not allowed."});
    if(!["student","teacher","admin"].includes(req.user.role)) return res.status(403).json({error:"Not allowed."});
    if(req.user.role==="teacher" && req.params.studentId===undefined) return res.status(403).json({error:"Not allowed."});
    const snap=await db.collection("fees").where("studentId","==",req.params.studentId).get();
    const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.paymentDate||"").localeCompare(a.paymentDate||""));
    res.json(rows);
  } catch(e){next(e);}
});
module.exports=router;
