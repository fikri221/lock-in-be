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
      { time: "08:00", activity: "Bangun pagi dan olahraga ringan" },
      { time: "09:00", activity: "Sarapan sehat dan merencanakan hari" },
      { time: "10:00", activity: "Fokus kerja pada tugas utama" },
      { time: "12:00", activity: "Makan siang dan istirahat singkat" },
      { time: "13:00", activity: "Lanjutkan pekerjaan produktif" },
      { time: "15:00", activity: "Break ringan (stretching atau minum teh)" },
      { time: "16:00", activity: "Selesaikan sisa pekerjaan penting" },
      { time: "18:00", activity: "Waktu untuk hobi atau keluarga" },
      { time: "20:00", activity: "Review hari dan persiapan esok" },
      { time: "22:00", activity: "Tidur cukup dan berkualitas" },
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
