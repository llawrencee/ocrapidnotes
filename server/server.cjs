const express = require("express")
const express_fileupload = require("express-fileupload")
const cors = require("cors")

const Tesseract = require("tesseract.js")
const OpenAI = require("openai")

const app = express()
const PORT = process.env.PORT || 3000

const llm_client = new OpenAI({
  apiKey: process.env.OPENAI_APIKEY || "",
})

app.use(cors())
app.use(
  express_fileupload({
    limits: {
      fileSize: 5_000_000, // 5MB
    },
    abortOnLimit: true,
  })
)
app.use("/uploads", express.static("server/uploads"))

// ROUTES
app.get("/", (req, res) => {
  res.sendStatus(200)
})

app.post("/upload", (req, res) => {
  // check if there is any file
  if (!req.files) return res.sendStatus(417)

  const image = req.files.file

  // test if the file is an image or not
  if (!/^image/.test(image.mimetype)) return res.sendStatus(415)

  // save image in the uploads directory
  image.mv(__dirname + "/uploads/" + image.name)

  res.sendStatus(200)
})

app.post("/scan", (req, res) => {
  // check if a filename is passed
  if (req.body.filename == "") return res.sendStatus(422)

  Tesseract.recognize("./server/uploads/" + req.body.filename, "eng", {
    logger: (m) => {
      console.log(m.status, `${Math.round(m.progress * 100)}%`)
    },
  })
    .catch((err) => console.error(err))
    .then((result) => {
      res.send(result.data.text.replace(/[\r\n]+/gm, " "))
    })
})

app.post("/format", async (req, res) => {
  console.log(req.body.text)

  const completion = await llm_client.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Treat everything as notes. Format them to make it more understandable. Use hierarchy in listing things. Use ## for titles and - for definitions.",
      },
      {
        role: "user",
        content: req.body.text,
      },
    ],
    model: "gpt-3.5-turbo",
  })

  res.send(completion.choices[0])
})

app.listen(PORT, () => console.log(`Server running on port: ${PORT}`))
