// === Cek Login & Dapat Pengguna ===
const user = netlifyIdentity.currentUser();
if (!user) window.location.href = 'login.html';
document.getElementById('userEmail').textContent = user.email;

document.getElementById('logoutBtn').addEventListener('click', () => {
  netlifyIdentity.logout();
  window.location.href = 'login.html';
});

// === Pengaturan Repo GitHub ===
const GITHUB_USER = 'USERNAME_GITHUB'; // GANTI!
const GITHUB_REPO = 'NAMA_REPO';       // GANTI!
const USER_FILE = `catatan_${user.id}.json`; // File khusus per pengguna

// === Ambil catatan dari repo GitHub ===
async function ambilCatatan() {
  try {
    const res = await fetch(`/.netlify/git-gateway/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${USER_FILE}`);
    if (!res.ok) throw new Error('Belum ada catatan');
    const data = await res.json();
    const catatan = JSON.parse(atob(data.content)); // Dekode base64
    tampilkanCatatan(catatan);
  } catch {
    tampilkanCatatan([]); // Kosong jika baru pertama kali
  }
}

// === Simpan catatan ke file pribadi di GitHub ===
async function simpanCatatan(catatan) {
  let sha;
  try { // Ambil sha jika file sudah ada untuk update
    const cek = await fetch(`/.netlify/git-gateway/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${USER_FILE}`);
    const d = await cek.json();
    sha = d.sha;
  } catch {}

  await fetch(`/.netlify/git-gateway/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${USER_FILE}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${user.token.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Update catatan ${new Date().toLocaleString('id-ID')}`,
      content: btoa(JSON.stringify(catatan, null, 2)), // Encode base64
      sha: sha
    })
  });
  ambilCatatan(); // Segar tampilan setelah simpan
}

// === Tampilkan catatan di halaman ===
function tampilkanCatatan(catatan) {
  const wadah = document.getElementById('notesList');
  if (catatan.length === 0) {
    wadah.innerHTML = `<p class="info">Belum ada catatan. Buat catatan pertamamu sekarang!</p>`;
    return;
  }
  wadah.innerHTML = '';
  catatan.forEach((item, i) => {
    const kartu = document.createElement('div');
    kartu.className = 'note-card';
    kartu.innerHTML = `
      <h3>${item.judul}</h3>
      <p>${item.isi}</p>
      <small>Dibuat: ${item.tanggal}</small>
      <button class="del-btn" data-idx="${i}">🗑️ Hapus Catatan Ini</button>
    `;
    wadah.appendChild(kartu);
  });

  // Tombol hapus berfungsi
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const idx = parseInt(e.target.dataset.idx);
      const daftar = await dapatCatatanSekarang();
      daftar.splice(idx, 1);
      await simpanCatatan(daftar);
    });
  });
}

// === Bantu ambil catatan saat ini ===
async function dapatCatatanSekarang() {
  try {
    const res = await fetch(`/.netlify/git-gateway/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${USER_FILE}`);
    const d = await res.json();
    return JSON.parse(atob(d.content));
  } catch { return []; }
}

// === Tombol simpan catatan baru ===
document.getElementById('saveNote').addEventListener('click', async () => {
  const judul = document.getElementById('noteTitle').value.trim();
  const isi = document.getElementById('noteContent').value.trim();
  if (!judul || !isi) return alert('Isi judul dan isi catatan dulu ya!');

  const daftar = await dapatCatatanSekarang();
  daftar.unshift({
    judul,
    isi,
    tanggal: new Date().toLocaleString('id-ID')
  });
  await simpanCatatan(daftar);

  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').value = '';
});

// === Jalankan saat halaman siap ===
document.addEventListener('DOMContentLoaded', ambilCatatan);