const express = require("express")
const fileUpload = require("express-fileupload")
const asyncHandler = require("express-async-handler")
const cors = require("cors")
const OpenAI = require("openai")

const app = express()
const port = process.env.PORT || 3000

const client = new OpenAI({
  apiKey: "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",
})

app.use(cors())
app.use(
  fileUpload({
    limits: {
      fileSize: 5_000_000, // 5MB
    },
    abortOnLimit: true,
  })
)
app.use("/uploads", express.static("server/uploads"))

app.get("/", (req, res) => {
  res.send({
    status: 200,
    message: {
      type: "[Info]",
      content: `Connected successfully on port: ${port}`,
    },
  })
})

app.post("/upload", (req, res) => {
  if (!req.files) {
    return res.send({
      status: 400,
      message: {
        type: "[Error]",
        content: "Image upload field must contain an image!",
      },
    })
  }

  const image = req.files.file

  if (!/^image/.test(image.mimetype))
    return res.send({
      status: 400,
      message: {
        type: "[Error]",
        content: 'Uploaded image must have a mimetype of "image/png"',
      },
    })

  image.mv(__dirname + "/uploads/" + image.name)

  res.send({
    file: {
      path: `uploads/${image.name}`,
    },
    status: 200,
    message: {
      type: "[Info]",
      content: "Image uploaded successfully",
    },
  })
})

app.post(
  "/format",
  asyncHandler(async (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
    })

    // let _messages = []
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Treat everything as notes. Format them to make it more understandable.",
        },
        {
          role: "user",
          content: req.body.content,
        },
      ],
      stream: true,
      model: "gpt-3.5-turbo",
    })

    for await (const chunk of completion) {
      res.write(chunk.choices[0]?.delta.content || "")
    }
    res.end()
  })
)

// app.post("/format", async (req, res) => {
//   console.log(req.body)
//   try {
//     const completion = await fetch(
//       "https://api.openai.com/v1/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer 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`,
//         },
//         // We need to send the body as a string, so we use JSON.stringify.
//         body: JSON.stringify({
//           model: "gpt-3.5-turbo",
//           messages: [
//             {
//               role: "user",
//               // The message will be 'Say hello.' unless you provide a message in the request body.
//               content: ` ${req.body.content || "Say hello."}`,
//             },
//           ],
//           temperature: 0,
//           max_tokens: 25,
//           n: 1,
//           stream: true,
//         }),
//       }
//     )

//     await pipeline(completion.body, res)
//     res.status(200)
//   } catch (err) {
//     console.log(err)
//   }
// })

app.listen(port, () => {
  console.log(`App running on ${port}`)
})
