# CineTrack — Project Planning Pack

**Discover. Contribute. Collect.**

Dokumentasi implementasi untuk Responsi Modul 5 Praktikum PPB Ganjil 2026, Teknik Komputer. Versi spesifikasi 1.0 — 15 November 2026. Deadline pengumpulan: **Selasa, 17 November 2026, 23.59 WIB**.

CineTrack adalah PWA katalog film dan koleksi pribadi: data film TMDB digabung dengan film yang ditambahkan pengguna; koleksi pribadi dapat dikelola offline. Ini bukan layanan streaming.

## Mulai di Codex

1. Buat folder project baru `cinetrack` dan ekstrak isi ZIP ke root folder tersebut (jangan membuat folder berlapis). Buka folder itu sebagai workspace Codex.
2. Bacalah [AGENTS.md](AGENTS.md) dan [CODEX_PROMPT.md](CODEX_PROMPT.md). Salin prompt ke Codex, minta implementasi bertahap, bukan sekadar membuat rencana baru.
3. Siapkan akun TMDB developer, project Supabase baru (bukan database modul), GitHub, Vercel. Isi `.env.local` dan environment Vercel berdasarkan `.env.example` setelah implementasi. Jangan tempel token di chat atau commit.
4. Lengkapi `VITE_AUTHOR_NAME`, `VITE_AUTHOR_NIM`, `VITE_AUTHOR_GROUP` dengan identitas yang benar sebelum deploy. Nilai ini akan tampil publik sesuai kebutuhan tugas; pertimbangkan privasi sebelum membagikan URL di luar kelas.
5. Ikuti [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md), jalankan [TEST_PLAN.md](docs/TEST_PLAN.md), dan kumpulkan URL produksi Vercel.

## Peta dokumen

| Dokumen | Isi |
|---|---|
| [PRD.md](docs/PRD.md) | Tujuan, scope, use case, kebutuhan, acceptance criteria |
| [DESIGN.md](docs/DESIGN.md) | Branding, design tokens, layout responsive, layar dan interaksi |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, folder, data contracts, alur, keputusan teknis |
| [DATABASE.md](docs/DATABASE.md) | Schema, constraint, RLS, storage dan migration |
| [API.md](docs/API.md) | TMDB proxy, Axios, PostgREST, upload dan error handling |
| [PWA.md](docs/PWA.md) | Manifest, cache, IndexedDB, outbox, sync dan instalasi |
| [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Milestone, prioritas, deployment, batasan |
| [TEST_PLAN.md](docs/TEST_PLAN.md) | Test case, evaluasi offline, RLS dan demo responsi |
| [REFERENCES.md](docs/REFERENCES.md) | Dasar modul dan referensi resmi |

## Keputusan inti

- React JS + Vite + JavaScript/JSX, Tailwind CSS, Lucide React, React Router, Axios, vite-plugin-pwa; Supabase Auth/Postgres/Storage; Vercel.
- TMDB diakses lewat proxy server Vercel agar token tidak masuk bundle browser; API film gratis untuk penggunaan nonkomersial dengan atribusi.
- Katalog komunitas bersifat publik (baca), perubahan hanya oleh pemilik melalui RLS. Shelf pribadi. Anonymous Auth tidak memerlukan login manual, tetapi identitas tidak dapat dipulihkan setelah data browser dihapus.
- Film custom dapat CRUD online; shelf dapat CRUD offline setelah aplikasi pertama kali dimuat online. Draft film custom disimpan lokal; submit/upload memerlukan internet. Search offline hanya untuk data yang pernah tersedia lokal.
- HashRouter dipilih untuk menghindari konflik SPA fallback dengan API Vercel; URL contoh `/#/movies/tmdb/157336`.
- Metadata TMDB tidak diimpor massal. Simpan ID/referensi dan cache seperlunya sesuai ketentuan TMDB; sebelum deployment, verifikasi syarat penyimpanan metadata/gambar. Bila tidak mengizinkan cache tertentu, gunakan placeholder dan ID saja.

**Status:** paket spesifikasi, bukan kode aplikasi yang sudah berjalan. Belum ada akun, token, migrasi terpasang, atau deployment yang diuji. Tidak ada identitas mahasiswa yang ditebak. Detail teknis di sini merupakan keputusan rancangan untuk disetujui/dilaksanakan, bukan syarat tambahan resmi dari asisten praktikum.

---

## Implementation — 15 November 2026

The planning pack above is preserved as historical context. This directory now contains the CineTrack implementation, not just specifications. Run commands **inside this directory**, alongside this README and package.json.

```powershell
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Node 24 LTS was used. The app builds without credentials and displays configuration/error states; it never supplies fake catalog data. Configure services using [SETUP.md](docs/SETUP.md). Test evidence and remaining release gates are in [IMPLEMENTATION_RESULTS.md](docs/IMPLEMENTATION_RESULTS.md).

```powershell
npm run lint
npm test
npm run build
npm run test:e2e
npm run preview
```

`dev` includes the TMDB server proxy. `preview` serves the production PWA shell only, so live TMDB requests require `dev`, Vercel development tooling, or deployment. Browser tests use an installed Chrome; adjust Playwright's channel if necessary. Fixtures exist only in tests and use isolated temporary browser contexts. Unit tests include an embedded PostgreSQL migration/RLS check, not a substitute for real Supabase JWT/storage tests.

### Delivered behavior and deliberate choices

- Responsive Home, Explore, details, custom add/edit, My Shelf, Profile and Contributions; desktop rail and mobile navigation follow the supplied design tokens.
- TMDB proxy is server-only, GET-only, parameter-allowlisted, timed out, and uncached. Community data uses Axios/PostgREST, anonymous Supabase Auth, owner policies, and restricted public poster uploads.
- Shelf changes are committed with a coalescing IndexedDB outbox, per-item revisions, tombstones, retries, session checks, stable IDs, conflict reconciliation, and Web Locks. Pending work survives reload; failed operations remain visible. Explicit removal can resolve an unsyncable new entry.
- Custom publishing is online-only; fields and poster File/Blob drafts persist offline. Image cleanup after failures occurs only when a successful read proves the newly uploaded object is unreferenced. Prior posters remain for historical shelf snapshots; periodic owner cleanup is manual.
- Community snapshots are bounded to 100 entries / seven days and labeled stale offline. TMDB metadata/posters have **no application-managed persistent cache**, and TMDB shelf snapshots remain null. Shelf labels therefore use `TMDB movie #ID`, with details available online. Browser HTTP caching remains subject to upstream headers. Retention rights still require review through the developer account; the FAQ is not permission for indefinite caching.
- The small app groups related components/pages instead of creating every suggested directory. The database year maximum is 2031, aligned with the supplied migration specification. Mixed-source pagination lists TMDB results then community results for each page; it does not claim global ranking. Duplicate checks warn explicitly when pagination or a source failure leaves the check incomplete.
- P1 features are limited to external trailer links. No deployment URL, real author identity, mobile installation, or live integration success is claimed without configuration and verification.

The Ponytail skill informed the use of native dialogs, native form controls, a small service layer and one authoritative outbox; frontend-design was applied using the provided cinematic palette and layout rather than changing the approved design.
