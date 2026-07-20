# Peninjauan ayat perasaan — dibagi per bagian

> **Status sebenarnya, per 20 Juli 2026.**
>
> **144 dari 147 ayat di berkas ini SUDAH TAYANG** dan dibaca pengguna sekarang juga.
> Berkas aslinya masih menulis "belum ada satu pun yang tayang" — itu benar ketika ditulis, dan sudah
> **tidak benar lagi**: perluasan korpus (55 → 201 ayat) kami naikkan atas keputusan kami sendiri,
> **sebelum** Ustadz meninjaunya.
>
> Kami menuliskannya terus terang karena itu mengubah arti peninjauan ini. Ustadz bukan sedang
> menyetujui sesuatu sebelum tayang, melainkan **memeriksa yang sudah berjalan** — sehingga
> **"jangan dipakai" berarti kami CABUT dari aplikasi.** Mohon jangan sungkan mencabut.

## Bagian-bagian

Berkas aslinya (`../feelings-expansion.md`, 147 ayat) dibagi menjadi **13 bagian**
supaya bisa ditinjau dan dikembalikan sedikit demi sedikit. Setiap bagian berdiri sendiri dan sudah
memuat petunjuk peninjauan secara lengkap — tidak perlu dikerjakan berurutan.

| Bagian | Ayat | ⚠️ | Perasaan |
|---|---|---|---|
| [bagian-01](bagian-01.md) | 11 | 1 | Iri & membanding-bandingkan, Marah, Kesepian, Sakit & kesembuhan, Lisan & gunjingan, Memaafkan orang lain, Sombong & angkuh, Takut mati |
| [bagian-02](bagian-02.md) | 11 | 3 | Ragu & iman melemah, Harta & tamak, Orang tua, Dizalimi, Rasa bersalah & dosa, Godaan & hawa nafsu |
| [bagian-03](bagian-03.md) | 12 | 3 | Pernikahan & pasangan, Menanti keturunan, Menanti jodoh, Lelah mendidik anak, Anak yang menjauh, Merawat orang tua |
| [bagian-04](bagian-04.md) | 11 | 2 | Pertengkaran keluarga, Mengasuh sendirian, Khawatir masa depan, Bingung memilih |
| [bagian-05](bagian-05.md) | 10 | 1 | Memulai lagi, Harapan, Bahagia, Menua, Sakit menahun |
| [bagian-06](bagian-06.md) | 12 | 6 | Perceraian, Dikhianati, Ditinggalkan, Ditolak, Rindu |
| [bagian-07](bagian-07.md) | 11 | 2 | Merantau, Kekurangan, Cemas soal uang, Pelit, Tidak pernah merasa cukup, Merasa cukup |
| [bagian-08](bagian-08.md) | 11 | 2 | Sedekah, Iri melihat kekayaan orang, Malu, Menyesal |
| [bagian-09](bagian-09.md) | 11 | 1 | Minder, Merasa tidak berguna, Merasa tidak dicintai, Hampa |
| [bagian-10](bagian-10.md) | 12 | 1 | Ingin berubah, Direndahkan, Difitnah, Menyimpan benci, Ingin membalas, Kehilangan sahabat |
| [bagian-11](bagian-11.md) | 12 | 2 | Masalah dengan tetangga, Ingin berdamai, Putus asa, Marah pada takdir, Doa tidak dijawab |
| [bagian-12](bagian-12.md) | 12 | 3 | Merasa jauh dari Allah, Merasa terlalu banyak dosa, Takut riya atau munafik, Susah istiqamah, Lelah & jenuh, Kewalahan |
| [bagian-13](bagian-13.md) | 11 | — | Malas & menunda, Kehilangan pekerjaan, Bingung arah hidup, Stres ujian & belajar, Usaha terasa tak cukup |
| **Total** | **147** | **27** | **70 perasaan** |

Setiap bagian bisa dikembalikan sendiri-sendiri. Ayat dalam bagian yang sudah disetujui langsung
diproses; sisanya menunggu tanpa menghambat.

## Satu keputusan desain: ayat yang cocok untuk dua perasaan — **SUDAH DIPUTUSKAN**

> **Catatan pembaruan (20 Juli 2026).** Bagian ini semula mengajukan pilihan kepada Ustadz, karena
> dahulu sebuah ayat hanya bisa memiliki SATU tema. **Pilihan itu sudah diambil dan sudah dikerjakan:**
> skema dilebarkan menjadi `themes: Theme[]`, sehingga **satu ayat kini boleh menenangkan beberapa
> perasaan sekaligus.** Ustadz **tidak perlu memutuskan apa pun di bagian ini.**
>
> Saat meninjau: kalau menurut Ustadz sebuah ayat cocok untuk perasaan ini **walaupun ayat itu sudah
> dipakai di perasaan lain**, silakan setujui saja. Empat ayat yang dahulu terganjal (3:185, 21:35,
> 24:22, 3:135) sudah tidak menjadi masalah.

## Kalau disetujui

Empat sentuhan, semuanya data — tidak ada perubahan arsitektur:

1. `src/review/problem-verses.ts` — tambahkan kunci tema ke `Theme`, baris ke `PROBLEM_VERSES`,
   label ke `THEME_LABELS`
2. `web/src/retrieve.ts` — tambahkan kata kunci `LEXICON` dan satu pembuka `OPENERS` per tema
3. `bun run app:corpus` — korpus terbangun ulang
4. Uji, lalu tayangkan kedua edisi

Yang **tidak** diselesaikan usulan ini: pertanyaan yang bukan perasaan (hukum, akidah) tetap
mengikuti jalur yang sudah ada. Ini memperluas jangkauan perasaan, bukan mengubah hukum aplikasi.
