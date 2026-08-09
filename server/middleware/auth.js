const jwt=require('jsonwebtoken');
require('dotenv').config();

const auth=(req,res,next)=>{
  const header=req.headers.authorization;
  if(!header) return res.status(401).json({pesan:"Harus login dulu!"});
  const token=header.split(" ")[1];
  try{
    const verifikasi=jwt.verify(token,process.env.JWT_SECRET);
    req.user=verifikasi; // simpan id pengguna
    next();
  }catch(err){
    res.status(401).json({pesan:"Token tidak valid/sudah habis!"});
  }
};
module.exports=auth;