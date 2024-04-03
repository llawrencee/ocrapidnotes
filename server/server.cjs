// Import Server Functions
const express = require("express")
const express_fileupload = require("express-fileupload")
const cors = require("cors")

// System Functions
const { spawn } = require("child_process")

// Import Optical Character Recogntion (OCR) Models
const Tesseract = require("tesseract.js")
const vision = require("@google-cloud/vision")
const OpenAI = require("openai")

// Initialize Server Defaults
const app = express()
const PORT = process.env.PORT || 3000

// OCR & Large Language Model (LLM) Clients
const llm_client = new OpenAI({
  apiKey:
    process.env.OPENAI_APIKEY ||
    "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",
})
const gvapi_client = new vision.ImageAnnotatorClient()

// Enable File Uploads
app.use(cors())
// File Upload Limitations
app.use(
  express_fileupload({
    limits: {
      fileSize: 5_000_000, // 5MB
    },
    abortOnLimit: true,
  })
)
app.use("/uploads", express.static("server/uploads")) // Location of Uploads

// ROUTES
app.get("/", (req, res) => {
  res.sendStatus(200)
})

app.post("/upload", (req, res) => {
  // Check If Uploaded File Exists
  if (!req.files) return res.sendStatus(417)

  const image = req.files.file

  // Test File Mimetype
  if (!/^image/.test(image.mimetype)) return res.sendStatus(415)

  // Save Image
  image.mv(__dirname + "/uploads/" + image.name)

  res.sendStatus(200) // OK
})

app.post("/scan", async (req, res) => {
  // Check If Filename Exists
  if (req.body.filename == "") return res.sendStatus(422) // Unprocessable Content
  // Check If OCR Type Exists
  if (req.body.type == "") return res.sendStatus(422) // Unprocessable Content

  // GOOGLE VISION API
  if (req.body.type == "gvapi") {
    const [result] = await gvapi_client.documentTextDetection(
      "./server/uploads/" + req.body.filename
    )
    const detections = result.textAnnotations

    // Log Text Output
    detections.forEach((text) => console.log(text))

    // Send Scanned Output
    res.send(
      detections
        .map((text) => text.description)
        .join(" ")
        .replace(/[\r\n]+/gm, " ")
    )
  }

  if (req.body.type == "pocr") {
    res.send("hi baus")
  }
})

app.post("/filter", async (req, res) => {
  // Check If Text To Filter Exists
  if (req.body.text == "") return res.sendStatus(422) // Unprocessable Content
  // Check If Filtered Characters Preference Exists
  if (req.body.filtered_characters == "") return res.sendStatus(422) // Unprocessable Content

  let _message =
    "You are a tool that filters unreadable characters or words from the following text. If you found an unreadable word, attempt to fix or correct it. If it can't be fixed, leave it as is. Display the filtered output in paragraph form. "

  // Conditional For Filtered Character List Prompt
  if (req.body.filtered_characters == "true") {
    _message +=
      "After doing so, specify the filtered characters or words in list form. Also specify the unreadable words you have corrected. Be verbose as possible when listing the filtered characters or words. Make sure every changes or filter is mentioned. "
  } else {
    _message +=
      "After doing so, do not specify the filtered characters or words. Just the filtered output. "
  }
  _message +=
    "Don't show another Filtered Output again. Don't say anything, just the output."

  const completion = await llm_client.chat.completions.create({
    messages: [
      {
        role: "system",
        content: _message,
      },
      {
        role: "user",
        content: req.body.text,
      },
    ],
    model: "gpt-3.5-turbo",
  })

  // Send Filtered Output
  res.send(completion.choices[0])
})

app.post("/format", async (req, res) => {
  // Check If Text To Format Exists
  if (req.body.text == "") return res.sendStatus(422) // Unprocessable Content

  const completion = await llm_client.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Treat everything as notes. Format them to make it more understandable. Do not add any extra content.",
      },
      {
        role: "user",
        content: req.body.text,
      },
    ],
    model: "gpt-3.5-turbo",
  })

  // Send Formatted Output
  res.send(completion.choices[0])
})

// Start Server
app.listen(PORT, () => console.log(`Server running on port: ${PORT}`))
