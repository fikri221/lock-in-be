const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Biar bisa dipanggil dari frontend Next.js
app.use(express.json());

const isTesting = process.env.USE_DUMMY === "true";

// Endpoint AI
app.post("/api/ai", async (req, res) => {
  const { prompt } = req.body;

  if (isTesting) {
    // Dummy response for testing purposes
    const dummyResponse = [
      { "response": "Karena kamu ingin cepat jago coding, saya buat jadwal ini fokus pada kombinasi 'belajar konsep', 'latihan coding', dan 'praktek langsung bikin project'. Saya selipkan sesi santai seperti baca artikel, diskusi di komunitas, atau nonton video agar belajar tetap fun dan nggak monoton. Intinya, semakin sering kamu ngoding dan nyoba bikin sesuatu, skill kamu akan berkembang lebih cepat." },
      { "time": "06:00", "activity": "Bangun dan stretching 10 menit", "duration": 30 },
      { "time": "06:15", "activity": "Olahraga ringan (jogging atau bodyweight workout)", "duration": 30 },
      { "time": "07:00", "activity": "Mandi dan bersiap-siap", "duration": 30 },
      { "time": "07:30", "activity": "Sarapan sehat sambil nonton video coding tutorial", "duration": 30 },
      { "time": "08:00", "activity": "Practice coding challenge (LeetCode, Codewars, dsb)", "duration": 60 },
      { "time": "09:00", "activity": "Buat mini project kecil (contoh: to-do app atau clone sederhana)", "duration": 90 },
      { "time": "10:30", "activity": "Ngopi santai sambil baca artikel best practices coding", "duration": 30 },
      { "time": "11:00", "activity": "Lanjutkan project pribadi dengan fokus (deep work)", "duration": 90 },
      { "time": "12:30", "activity": "Makan siang dan istirahat", "duration": 60 },
      { "time": "13:30", "activity": "Tonton video course/playlist coding lanjutan", "duration": 60 },
      { "time": "14:30", "activity": "Practice coding lagi (fokuskan pada konsep yang baru dipelajari)", "duration": 60 },
      { "time": "15:30", "activity": "Break, relaksasi atau power nap 20 menit", "duration": 30 },
      { "time": "16:00", "activity": "Debugging atau code review project sendiri", "duration": 60 },
      { "time": "17:00", "activity": "Ngobrol atau diskusi coding di komunitas (Discord, Forum, dsb)", "duration": 60 },
      { "time": "18:00", "activity": "Makan malam santai", "duration": 60 },
      { "time": "19:00", "activity": "Ikut live coding session atau webinar jika ada", "duration": 60 },
      { "time": "20:00", "activity": "Membuat catatan atau dokumentasi dari apa yang dipelajari hari ini", "duration": 60 },
      { "time": "21:00", "activity": "Relaksasi, baca buku atau nonton video inspiratif tentang karir programming", "duration": 60 },
      { "time": "22:00", "activity": "Tidur", "duration": 540 },
    ];
    console.log("Using dummy response:", dummyResponse);
    // Simulasi delay 1.5 detik
    setTimeout(() => {
      res.json(dummyResponse);
    }, 1500);

    return;
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Kamu adalah asisten produktivitas.
              Tugasmu hanya menjawab dalam bentuk array JSON yang berisi jadwal produktif harian.
              Jangan pernah menambahkan penjelasan tambahan.`,
          },
          {
            role: "user",
            content:
              prompt +
              `Format jawaban HARUS dalam bentuk array JSON, dengan setiap item memiliki properti:
              - "time": waktu dalam format 24 jam (contoh: "08:00")
              - "activity": deskripsi singkat kegiatan yang produktif

              Contoh format:
              [
                { "time": "08:00", "activity": "Bangun dan olahraga ringan" },
                { "time": "09:00", "activity": "Sarapan sehat dan rencana hari" }
              ]

              Note: Jangan tambahkan penjelasan apapun sebelum atau sesudah JSON.
              Hanya kirimkan JSON array saja.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = JSON.parse(response.data.choices[0].message.content);
    res.json({ result: aiResponse });
  } catch (error) {
    console.error("OpenAI API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong with AI API." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
