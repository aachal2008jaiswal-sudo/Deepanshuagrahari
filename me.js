const express=require("express");
const {auth,loadUser}=require("../middleware/auth");
const router=express.Router();
router.get("/",auth,loadUser,(req,res)=>{const u=req.account;res.json({id:u.id,name:u.name,email:u.email,role:u.role,className:u.className||"",board:u.board||""});});
module.exports=router;
