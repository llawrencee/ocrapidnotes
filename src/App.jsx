import { useState, useRef, useEffect } from "react"
import { Badge, Button, ListGroup, Modal, Stack } from "react-bootstrap"
import axios from "axios"
import Tesseract from "tesseract.js"

import "./styles/App.css"

function App() {
  const [preferenceShow, setPreferenceShow] = useState(false)
  const [mainShow, setMainShow] = useState(false)
  const [mainContent, setMainContent] = useState("")
  const [formatButtonShow, setFormatButtonShow] = useState(true)
  const [statusState, setStatusState] = useState("")
  const [statusProgress, setStatusProgress] = useState("")

  const modal = new (function () {
    this.preference = {
      active: preferenceShow,
      click_handler: () => {
        setPreferenceShow(true)
      },
      hide: () => {
        setPreferenceShow(false)
      },
    }
    this.main = {
      active: mainShow,
      title: { element: useRef() },
      content: { _state: mainContent },
      control: { format: { _state: useRef() } },
      status: {
        state: { _state: statusState },
        progress: { _state: statusProgress },
      },
      click_handler: () => {
        setMainShow(true)
        control.remove.click_handler()
      },
      hide: () => {
        setMainShow(false)
      },
    }
  })()

  const upload = new (function () {
    this.label = { element: useRef() }
    this.image = {
      element: useRef(),
      file: null,
      filename: "",
      src: null,
    }
    this.input = {
      change_handler: (event) => {
        let _url = event.target.files[0]
        if (_url == undefined) return
        console.log(`Uploading Image : ${_url.name}`)
        this.image.file = _url
        this.image.filename = _url.name
        this.image.src = URL.createObjectURL(_url)
        this.image.element.current.src = URL.createObjectURL(_url)
        this.label.element.current.style.display = "none"
        this.image.element.current.style.display = "block"
      },
    }
  })()

  const functions = new (function () {
    this.scan = (path) => {
      Tesseract.recognize(`http://localhost:3000/${path}`, "eng", {
        logger: (m) => {
          setStatusState(m.status)
          setStatusProgress(`${Math.round(m.progress * 100)}%`)
        },
      })
        .catch((err) => console.error(err))
        .then((result) => {
          setMainContent(result.data.text.replace(/[\r\n]+/gm, " "))
          setFormatButtonShow(false)
        })
    }
    this.format = (res) => {
      setStatusProgress(res.status)
      setMainContent(res.data)
    }
  })()

  const control = {
    preference: {
      click_handler: () => {
        modal.preference.show()
      },
    },
    remove: {
      click_handler: () => {
        if (
          upload.image.src != null ||
          upload.image.element.current.src != null
        ) {
          console.log(`Remove Image: ${upload.image.filename}`)
          upload.label.element.current.style.display = "flex"
          upload.image.src = null
          upload.image.element.current.src = null
          upload.image.element.current.style.display = "none"
        }
      },
    },
    scan: {
      click_handler: () => {
        console.log("Extracting Text")
        console.log(upload.image.file)

        setTimeout(() => {
          modal.main.title.element.current.textContent = "Scanning Text"
        }, 300)

        const data = new FormData()
        data.append("file", upload.image.file)
        axios.post("http://localhost:3000/upload/", data).then((res) => {
          console.log(res.data)
          if (res.data.status != 400) {
            modal.main.click_handler()
            functions.scan(res.data.file.path)
          }
        })
      },
    },
    format: {
      click_handler: () => {
        const data = new FormData()
        data.append("content", modal.main.content._state)
        setTimeout(() => {
          modal.main.title.element.current.textContent = "Formatting Text"
          setMainContent("")
          setStatusState("Status")
          setStatusProgress("...")
        }, 300)
        axios.post("http://localhost:3000/format", data).then((res) => {
          functions.format(res)
        })
      },
    },
  }

  useEffect(() => {
    fetch("http://localhost:3000/")
      .then((res) => {
        return res.json()
      })
      .then((data) => {
        console.log(data)
      })
  }, [])

  return (
    <>
      <Modal
        show={modal.preference.active}
        onHide={modal.preference.hide}
        backdrop="static"
        centered
        style={{ color: "black" }}>
        <Modal.Header closeButton>
          <Modal.Title>Set Note Preference</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Lorem ipsum dolor sit, amet consectetur adipisicing elit. Deleniti
          esse necessitatibus fuga cumque quasi veniam neque ab? Asperiores
          sequi ut odit voluptatibus, a dolor! Quo excepturi eligendi neque at
          accusantium!
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={modal.preference.hide}>
            Close
          </Button>
          <Button variant="success" onClick={modal.preference.hide}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={modal.main.active}
        onHide={modal.main.hide}
        backdrop="static"
        centered
        style={{ color: "black" }}>
        <Modal.Header closeButton>
          <Modal.Title ref={modal.main.title.element}>
            Scanning Text...
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre
            style={{
              wordWrap: "break-word",
              whiteSpace: "pre-wrap",
              maxHeight: "300px",
              marginBottom: "0",
            }}>
            {modal.main.content._state}
          </pre>
        </Modal.Body>
        <Modal.Footer>
          <div style={{ marginRight: "auto" }}>
            <span style={{ textTransform: "capitalize" }}>
              {modal.main.status.state._state}
            </span>
            &nbsp;:&nbsp;
            <span>{modal.main.status.progress._state}</span>
          </div>
          <Button variant="danger" onClick={modal.main.hide}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={control.format.click_handler}
            disabled={formatButtonShow}>
            Format
          </Button>
        </Modal.Footer>
      </Modal>

      <Stack direction="horizontal" gap={3} className="main-container">
        <div className="upload-image">
          <label ref={upload.label.element}>
            <span>
              Drag Image or <Badge bg="secondary">Upload</Badge>
            </span>
          </label>
          <img
            src="/"
            className="upload-image-background"
            ref={upload.image.element}
          />
          <input
            type="file"
            className="upload-image-input"
            onChange={upload.input.change_handler}
          />
        </div>

        <ListGroup className="control-container">
          <ListGroup.Item
            as="button"
            action
            onClick={modal.preference.click_handler}>
            <Stack direction="horizontal" gap={3}>
              <Badge>Image</Badge>
              <Stack direction="vertical">
                <h5>Set Note Preference</h5>
                <p>Add your own preference to your notes</p>
              </Stack>
            </Stack>
          </ListGroup.Item>
          <ListGroup.Item
            as="button"
            action
            onClick={control.remove.click_handler}>
            <Stack direction="horizontal" gap={3}>
              <Badge>Image</Badge>
              <Stack direction="vertical">
                <h5>Remove</h5>
                <p>Change the image</p>
              </Stack>
            </Stack>
          </ListGroup.Item>
          <ListGroup.Item
            as="button"
            action
            onClick={control.scan.click_handler}>
            <Stack direction="horizontal" gap={3}>
              <Badge>Image</Badge>
              <Stack direction="vertical">
                <h5>Scan</h5>
                <p>Get the text in the image</p>
              </Stack>
            </Stack>
          </ListGroup.Item>
        </ListGroup>
      </Stack>
    </>
  )
}

export default App
