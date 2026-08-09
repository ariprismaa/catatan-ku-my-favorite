require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });

const initDB=async()=>{
  try{
    await pool.connect();
    console.log("✅ Terhubung Neon PostgreSQL");
  }catch(err){console.error("❌ DB gagal:",err.message);process.exit(1);}
};
initDB();
module.exports=pool;