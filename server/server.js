require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const auth = require('./middleware/auth');
const app = express();

// ✅ TEMPAT BENAR: Izinkan asal Netlify DULU, tidak tertulis ulang di bawah!
app.use(cors({
  origin: process.env.FRONTEND_URL, // https://catatan-ku-my-favorite.netlify.app
  credentials: true
}));

app.use(express.json()); // Baca data JSON dari permintaan

// ===== DAFTAR PENGGUNA BARU =====
app.post('/api/register', async (req, res) => {
  try {
    const {nama, email, password} = req.body;
    const cek = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (cek.rows.length > 0) return res.status(400).json({pesan:"Email sudah terdaftar!"});
    const sandiEnkripsi = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users(nama,email,password) VALUES($1,$2,$3)",[nama,email,sandiEnkripsi]);
    res.status(201).json({pesan:"Daftar berhasil! Silakan login"});
  } catch(err) {
    res.status(500).json({pesan:"Gagal daftar", err: err.message})
  }
});

// ===== LOGIN =====
app.post('/api/login', async (req, res) => {
  try {
    const {email, password} = req.body;
    const user = await pool.query("SELECT id,nama,password FROM users WHERE email=$1", [email]);
    if(user.rows.length === 0) return res.status(401).json({pesan:"Email tidak ditemukan"});
    const cocok = await bcrypt.compare(password, user.rows[0].password);
    if(!cocok) return res.status(401).json({pesan:"Kata sandi salah!"});
    const token = jwt.sign({id:user.rows[0].id,nama:user.rows[0].nama}, process.env.JWT_SECRET, {expiresIn:"1d"});
    res.json({token, nama: user.rows[0].nama});
  } catch(err) {
    res.status(500).json({pesan:"Gagal login", err: err.message})
  }
});

// ===== AMBIL CATATAN HANYA MILIK PENGGUNA =====
app.get('/api/catatan', auth, async (req, res) => {
  const hasil = await pool.query("SELECT id,judul,isi,tanggal FROM notes WHERE user_id=$1 ORDER BY tanggal DESC", [req.user.id]);
  res.json(hasil.rows);
});

// ===== TAMBAH CATATAN TERKAIT PENGGUNA =====
app.post('/api/catatan', auth, async (req, res) => {
  const {judul,isi} = req.body;
  const simpan = await pool.query("INSERT INTO notes(judul,isi,user_id) VALUES($1,$2,$3) RETURNING *", [judul,isi,req.user.id]);
  res.status(201).json(simpan.rows[0]);
});

// ===== UBAH =====
app.put('/api/catatan/:id', auth, async (req, res) => {
  const {judul,isi} = req.body;
  const ubah = await pool.query("UPDATE notes SET judul=$1,isi=$2 WHERE id=$3 AND user_id=$4 RETURNING *", [judul,isi,req.params.id,req.user.id]);
  if(ubah.rows.length === 0) return res.status(404).json({pesan:"Tidak ada/hak terbatas"});
  res.json(ubah.rows[0]);
});

// ===== HAPUS =====
app.delete('/api/catatan/:id', auth, async (req, res) => {
  const hapus = await pool.query("DELETE FROM notes WHERE id=$1 AND user_id=$2 RETURNING *", [req.params.id, req.user.id]);
  if(hapus.rows.length === 0) return res.status(404).json({pesan:"Tidak ada/hak terbatas"});
  res.json({pesan:"Terhapus"});
});

// ❌ app.listen dihapus karena untuk Vercel serverless
// ✅ Ekspor aplikasi agar Vercel bisa jalankan
module.exports = app;
