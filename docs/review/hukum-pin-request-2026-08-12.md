# Permohonan review — pin ayat untuk pertanyaan hukum (warisan & nikah)

> Ditulis 2026-08-12 untuk **Ustadz Ahmad Isrofiel Mardlatillah**.
> **Status: BELUM DIKIRIM — DAN JANGAN DIKIRIM DALAM BENTUK INI.** Lihat blok di bawah.
> Belum ada satu pin pun yang masuk ke kode. Halaman ini adalah permintaan review, bukan catatan
> sesuatu yang sudah tayang.

> ## ⛔ JANGAN KIRIM — surat ini memuat satu kalimat yang sekarang TIDAK BENAR
>
> Ditemukan 2026-08-12 malam, diukur langsung pada produksi.
>
> Di bawah tertulis **"Aplikasi tidak mengarang jawaban."** Sejak `EDITION` diubah ke `synthesis`
> sore itu, **aplikasi memang mengarang jawaban** — model AI yang menyusun prosanya. Mengirim
> kalimat itu kepada Ustadz berarti menyampaikan keadaan aplikasi secara keliru kepada orang yang
> justru dimintai pertimbangan. Itu harus diperbaiki sebelum surat ini berangkat.
>
> Kedua, **premis surat ini sudah gugur.** Diukur pada `POST /api/answer`:
>
> - Dengan grounding **dipaksa** ke QS 4:25, jawabannya mengutip 2:221, 5:5 dan 60:10 — **QS 4:25
>   tidak disebut sama sekali.**
> - Tanpa grounding apa pun, aplikasi tetap menjawab lengkap.
>
> Artinya model **mengabaikan** hasil pencarian, bukan memolesnya. Ayat perbudakan itu **tidak
> sampai** ke pembaca lewat jalur jawaban AI. Memperbaiki daftar pin tidak mengubah apa pun yang
> dilihat pembaca di jalur itu — hanya di jalur cadangan (saat model gagal / ditolak penjaga).
>
> **Yang sebenarnya perlu ditanyakan kepada Ustadz sekarang** bukan "ayat mana untuk pertanyaan
> mana", melainkan: bolehkah aplikasi menyusun jawaban hukum dari pengetahuan modelnya sendiri —
> lihat ISC-418, ISC-419, ISC-420 di `ISA.md`. Surat ini perlu ditulis ulang dengan pertanyaan itu
> di depan. Keputusan ada pada Erik.
>
> Yang sudah tayang di `main` hanyalah **perbaikan routing** (satu kata dihapus dari daftar alias
> `keluarga`) — itu tidak memilih ayat, hanya mengarahkan pertanyaan ke bab yang memang memuat
> dalilnya. Pemilihan ayat di bawah ini menunggu tanda tangan Ustadz.

## Ringkasan untuk Ustadz

Aplikasi menjawab pertanyaan hukum dengan menampilkan **entri Indeks Tematik Ustadz Muhammad
Thalib apa adanya**, lengkap dengan rujukan ayatnya. Aplikasi tidak mengarang jawaban. Yang kami
minta direview bukan teks — teks tetap tulisan beliau — melainkan **entri mana yang muncul untuk
pertanyaan mana**.

Peringkatnya sekarang memakai kesamaan kata. Cara itu buta terhadap makna, dan pada dua pertanyaan
di bawah hasilnya bukan sekadar kurang tepat, tapi **salah dan berpotensi menyinggung**.

## Masalah 1 — pertanyaan nikah beda agama dijawab dengan ayat perbudakan

Diukur langsung pada aplikasi, 2026-08-12:

| Pertanyaan pengguna | Jawaban aplikasi sekarang |
|---|---|
| `hukum nikah beda agama` | QS. An-Nisa 4:25 — *"Nikahi budak perempuan dengan izin tuannya"*, lalu QS. Al-Baqarah 2:136 |
| `apa hukum nikah siri` | QS. An-Nisa 4:25 — *"Nikahi budak perempuan dengan izin tuannya"* (satu-satunya entri) |
| `apakah boleh menikah dengan non muslim` | QS. Al-Baqarah 2:221 — *"Menikah dengan kaum musyrik laki-laki/perempuan"* ✔ benar |

Entri yang tepat (2:221) **ada** di korpus dan muncul untuk kalimat ketiga. Ia tidak muncul untuk
kalimat pertama semata-mata karena frasa "beda agama" tidak berbagi satu kata pun dengan kata
"musyrik" yang dipakai Ustadz Thalib. Kalimat "nikah siri" tidak berbagi kata dengan entri mana pun,
sehingga tersisa 4:25 yang kebetulan memuat kata "nikahi".

**Usulan kami: daripada memperbaiki peringkat, kami kunci (pin) daftar entri untuk topik ini —
dan daftar itu Ustadz yang menyetujui.**

### Usulan pin — hukum nikah

Dipicu oleh: `nikah beda agama`, `menikah beda agama`, `nikah dengan non muslim`, `nikah siri`,
`syarat sah nikah`, `rukun nikah`.

| # | Ayat | Teks entri (verbatim, Indeks Tematik) | Bab asal | Catatan kami |
|---|---|---|---|---|
| 1 | QS. Al-Baqarah 2:221 | Menikah dengan kaum musyrik laki-laki/perempuan | Perintah dan Larangan (Larangan) | Inti pertanyaan beda agama |
| 2 | QS. An-Nisa 4:4 | Bayarkan maskawin kepada mempelai perempuan | Perintah dan Larangan (Perintah) | Mahar |
| 3 | QS. An-Nisa 4:23 | Menikahi perempuan yang punya ikatan mahram | Perintah dan Larangan (Larangan) | Mahram |
| 4 | QS. An-Nisa 4:24 | Menikahi perempuan bersuami | Perintah dan Larangan (Larangan) | |
| 5 | QS. An-Nur 24:32 | Membantu orang miskin menikah | Keluarga | Anjuran menikah |
| 6 | QS. An-Nur 24:30–31 | Hubungan seksual hanya halal melalui pernikahan yang sah | Karakteristik Negara Bersyari'ah | |

**Pertanyaan khusus untuk Ustadz:**

1. Apakah 2:221 tepat sebagai entri pertama untuk "nikah beda agama", ataukah menampilkannya
   sendirian justru menyederhanakan masalah (mis. perbedaan ahli kitab dan musyrik)?
2. **Untuk "nikah siri" korpus kami tidak memuat entri yang benar-benar menjawabnya.** Lebih baik
   mana: menampilkan pin umum di atas, atau **diam** dan mengarahkan pengguna bertanya kepada ustadz?
   Kami condong ke diam — mengikuti keputusan yang sama pada kata "pacaran".
3. Bolehkah 4:25 kami **keluarkan** dari hasil pertanyaan nikah? Kami tidak menghapus entri beliau
   dari indeks; hanya tidak menjadikannya jawaban pertanyaan yang bukan tentangnya.

## Masalah 2 — pertanyaan warisan

Sudah diperbaiki di sisi routing hari ini (tanpa memilih ayat):

| Pertanyaan | Sebelum | Sesudah |
|---|---|---|
| `apa itu warisan` | diam, 0 entri | QS. An-Nisa 4:11 + 4:19 |
| `hukum warisan dalam keluarga` | diam, 0 entri | 7 entri, termasuk 4:11 |

Tersisa satu hal yang butuh keputusan Ustadz. Entri **QS. An-Nisa 4:33** — *"Berikan kepada ahli
waris bagian yang telah ditetapkan oleh Allah"* — sering **tidak** muncul, karena tertulis "ahli
waris" dan bukan "warisan". Sebaliknya, entri yang muncul justru kadang menyertakan:

- QS. Al-Baqarah 2:178 — *"Dalam pidana qishash, hak menghukum atau memaafkan ada pada ahli waris
  korban"* → memuat kata "waris", tapi ini **hukum pidana**, bukan faraidh.
- QS. Al-Isra 17:84 — *"Hak mempertahankan tradisi warisan"* → "warisan" di sini berarti
  **tradisi turun-temurun**, bukan harta.
- QS. An-Nisa 4:19 — *"Menjadikan perempuan sebagai barang warisan"* → sebuah larangan; benar
  terkait, tapi bukan jawaban "bagaimana pembagiannya".

### Usulan pin — hukum waris

| # | Ayat | Teks entri (verbatim) | Bab asal |
|---|---|---|---|
| 1 | QS. An-Nisa 4:11 | Berikan bagian warisan kepada anak perempuan setengah bagian anak lelaki | Perintah dan Larangan |
| 2 | QS. An-Nisa 4:33 | Berikan kepada ahli waris bagian yang telah ditetapkan oleh Allah | Perintah dan Larangan |
| 3 | QS. Al-Baqarah 2:180 | Hak waris sesuai ketentuan hukum | Karakteristik Negara Bersyari'ah |
| 4 | QS. An-Nisa 4:176 | Memberi fatwa soal Kalalah | Allah Subhanahu wa Ta'ala |
| 5 | QS. An-Nisa 4:19 | Menjadikan perempuan sebagai barang warisan | Perintah dan Larangan (Larangan) |

**Pertanyaan khusus untuk Ustadz:**

4. Nomor 4 (4:176) memang ayat kalalah, tetapi Ustadz Thalib meletakkannya di bab **Allah** dengan
   keterangan *"Memberi fatwa soal Kalalah"* — kalimatnya menyorot Allah yang berfatwa, bukan
   aturan warisnya. Apakah pantas ditampilkan dalam daftar warisan dengan keterangan itu apa adanya?
   Kami **tidak akan** mengubah kalimat beliau.
5. Apakah 2:178 dan 17:84 memang harus dikeluarkan, sebagaimana kami usulkan?
6. Urutannya sudah tepat, atau ada yang mestinya didahulukan?

## Yang tidak kami lakukan

- Tidak mengubah, meringkas, atau menerjemahkan ulang satu kalimat pun milik Ustadz Thalib.
- Tidak menambah ayat yang tidak ada dalam Indeks Tematik.
- Tidak membuat aplikasi menyimpulkan hukum dengan bahasanya sendiri.
- Tidak menayangkan pin mana pun sebelum halaman ini dijawab.

## Setelah Ustadz menjawab

Jawaban direkam di file ini (tanggal + poin yang disetujui/ditolak), lalu pin dimasukkan ke
`TOPIC_PINS` di `web/src/knowledge.ts` persis seperti yang disetujui. Bila Ustadz memilih "diam"
untuk nikah siri, itu pun kami catat sebagai keputusan — sama seperti keputusan pada "pacaran".

**Catatan pencatatan:** persetujuan bersyarat ditulis sebagai bersyarat, tidak pernah
disederhanakan menjadi persetujuan biasa.
