const express = require("express");
const multer = require("multer");
const { v4: uuid } = require("uuid");
const { db, bucket } = require("../firebase");
const { auth, roles } = require("../middleware/auth");
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req,file,cb) => {
  const ok = ["application/pdf","image/jpeg","image/png","image/webp"].includes(file.mimetype);
  cb(ok ? null : new Error("Only PDF, JPG, PNG or WEBP files are allowed."), ok);
}});

router.get("/", auth, async (req,res,next)=>{
  try {
    const snap=await db.collection("materials").orderBy("createdAt","desc").get();
    let rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(req.user.role==="student") rows=rows.filter(m=>m.className==="All" || m.className===req.user.className);
    res.json(rows);
  } catch(e){next(e);}
});
router.post("/", auth, roles("admin","teacher"), upload.single("file"), async(req,res,next)=>{
  try {
    if(!req.file) return res.status(400).json({error:"Please choose a PDF or image file."});
    if(!bucket) return res.status(500).json({error:"FIREBASE_STORAGE_BUCKET is missing. Configure Firebase Storage first."});
    const id=uuid(), safeName=req.file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_");
    const objectName=`coaching-materials/${id}-${safeName}`;
    const file=bucket.file(objectName);
    await file.save(req.file.buffer,{metadata:{contentType:req.file.mimetype,metadata:{uploadedBy:req.user.id}}});
    // Private bucket object; signed URL expires after 60 minutes. Generate a new URL from this API as needed.
    const [url]=await file.getSignedUrl({action:"read",expires:Date.now()+60*60*1000});
    const row={title:String(req.body.title||req.file.originalname),subject:String(req.body.subject||"General"),className:String(req.body.className||"All"),url,storagePath:objectName,originalName:req.file.originalname,mimeType:req.file.mimetype,size:req.file.size,uploadedBy:req.user.name,createdAt:new Date().toISOString()};
    await db.collection("materials").doc(id).create(row);
    res.status(201).json({id,...row});
  }catch(e){next(e);}
});
module.exports=router;
