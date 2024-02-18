// Libraries
import OpenAI from "openai"
import Tesseract from "tesseract.js"
import { useRef, useState } from "react"

// Styling
import "./css/App.css"

// Components
import ImageUpload from "./components/ImageUpload"

const client = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
  dangerouslyAllowBrowser: !0,
})

function App() {
  const [status, changeStatus] = useState("No Status")
  const [progress, changeProgress] = useState("null")
  const [text, changeText] = useState("")
  const [ready, updateReady] = useState(true)

  const functions = {
    scan: (image_blob) => {
      console.log(image_blob)
      Tesseract.recognize(image_blob, "eng", {
        logger: (m) => {
          console.log(m)
          changeStatus(m.status)
          changeProgress(`${Math.round(m.progress * 100)}%`)
        },
      })
        .catch((err) => console.error(err))
        .then((result) => {
          changeText(result.data.text)
          console.log(ready)
          new (function () {
            updateReady(false)
          })()
          console.log(ready)
        })
    },
    organize: async () => {
      let _messages = []
      const completion = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "Treat everything as notes. Format them to make it more understandable.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        stream: true,
        model: "gpt-3.5-turbo",
      })

      changeStatus("Organizing")
      for await (const chunk of completion) {
        console.log(chunk)
        let _m = chunk.choices[0].delta.content
        _messages.push(_m)
        changeProgress(`"${_m}"`)
        changeText(_messages)
        if (_m == undefined) changeProgress("Done.")
      }
    },
  }

  return (
    <>
      <div className="image-group-container">
        <ImageUpload
          scan_function={functions.scan}
          organize_function={functions.organize}
          organize_ready={ready}></ImageUpload>
      </div>
      <div className="panel-group-container">
        <p>
          {status} - {progress}
        </p>
        <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
          {text}
        </pre>
      </div>
    </>
  )
}

export default App
