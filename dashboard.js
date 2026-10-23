const express=require("express");
const {auth}=require("../middleware/auth");
const {db}=require("../firebase");
const router=express.Router();
router.get("/",auth,async(req,res,next)=>{try{
const [users,tests,classes,announcements,attendance,subs]=await Promise.all([
db.collection("users").get(),db.collection("tests").get(),db.collection("classes").get(),db.collection("announcements").get(),db.collection("attendance").get(),db.collection("submissions").get()]);
const userRows=users.docs.map(d=>d.data()),testRows=tests.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.published!==false).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
const classRows=classes.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.startAt.localeCompare(a.startAt));
const annRows=announcements.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
res.json({role:req.user.role,counts:{students:userRows.filter(u=>u.role==="student").length,teachers:userRows.filter(u=>u.role==="teacher").length,tests:testRows.length,classes:classRows.length,attendance:attendance.docs.map(d=>d.data()).filter(a=>a.studentId===req.user.id).length,submissions:subs.docs.map(d=>d.data()).filter(s=>s.studentId===req.user.id).length},tests:testRows.slice(0,5).map(t=>({...t,questions:(t.questions||[]).map(({answer,explanation,...q})=>q)})),classes:classRows.slice(0,5),announcements:annRows.slice(0,5)});
}catch(e){next(e);}});
module.exports=router;
