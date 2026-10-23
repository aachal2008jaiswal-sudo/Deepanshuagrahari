const express=require("express");
const {v4:uuid}=require("uuid");
const {db}=require("../firebase");
const {auth,roles}=require("../middleware/auth");
const router=express.Router();
router.get("/",auth,async(req,res,next)=>{try{const s=await db.collection("classes").orderBy("startAt","desc").get();res.json(s.docs.map(d=>({id:d.id,...d.data()})));}catch(e){next(e);}});
router.post("/",auth,roles("admin","teacher"),async(req,res,next)=>{try{const {title,className="All",subject="General",startAt,roomUrl=""}=req.body||{};if(!title||!startAt)return res.status(400).json({error:"Class title and start time are required."});const id=uuid(),row={title,className,subject,startAt,roomUrl:roomUrl||`https://meet.jit.si/edusmart-${id.slice(0,8)}`,teacherName:req.user.name,createdAt:new Date().toISOString()};await db.collection("classes").doc(id).create(row);res.status(201).json({id,...row});}catch(e){next(e);}});
module.exports=router;
