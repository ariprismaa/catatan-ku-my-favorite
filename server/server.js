require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const auth = require('./middleware/auth');
const app = express();

// ✅ CORS BENAR DI AWAL, TIDAK GANDA
const allowedOrigins = [process.env.FRONTEND_URL];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else callback(new Error('Tidak diizinkan CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors()); // tanggapi permintaan awal OPTIONS

app.use(express.json());

// ===== DAFTAR =====
app.post('/api/register', async (req, res) => {
  try {
    const {nama,email,password}=req.body;
    const cek=await pool.query("SELECT id FROM users WHERE email=$1",[email]);
    if(cek.rows.length>0) return res.status(400).json({pesan:"Email sudah terdaftar!"});
    const sandiEnkripsi=await bcrypt.hash(password,10);
    await pool.query("INSERT INTO users(nama,email,password) VALUES($1,$2,$3)",[nama,email,sandiEnkripsi]);
    return res.status(201).json({pesan:"Daftar berhasil! Silakan login"});
  } catch(err){
    console.error("ERR DAFTAR:",err.message); // lihat log Vercel
    return res.status(500).json({pesan:"Gagal daftar: "+err.message});
  }
});

// ===== LOGIN =====
app.post('/api/login', async (req, res) => {
  try{
    const {email,password}=req.body;
    const user=await pool.query("SELECT id,nama,password FROM users WHERE email=$1",[email]);
    if(user.rows.length===0) return res.status(401).json({pesan:"Email tidak ditemukan"});
    const cocok=await bcrypt.compare(password,user.rows[0].password);
    if(!cocok) return res.status(401).json({pesan:"Kata sandi salah!"});
    const token=jwt.sign({id:user.rows[0].id,nama:user.rows[0].nama},process.env.JWT_SECRET,{expiresIn:"1d"});
    return res.json({token,nama:user.rows[0].nama});
  } catch(err){
    console.error("ERR LOGIN:",err.message);
    return res.status(500).json({pesan:"Gagal login: "+err.message});
  }
});

// sisanya rute catatan tetap sama seperti sebelumnya...

module.exports = app;
