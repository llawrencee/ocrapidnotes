import { useState, useRef, useEffect } from "react"
import axios from "axios"
import {
  Card,
  Nav,
  Button,
  Tabs,
  Tab,
  Badge,
  Placeholder,
  Toast,
  ToastContainer,
  Form,
} from "react-bootstrap"

const server_url = "http://localhost:3000/"

function content_skeleton(amount) {
  let _placeholders = []
  for (let i = 0; i < amount; i++) {
    _placeholders.push(<Placeholder xs={Math.floor(Math.random() * 4) + 1} />)
    _placeholders.push(" ")
  }

  return (
    <Placeholder as="div" animation="wave" style={{ textAlign: "left" }}>
      {_placeholders}
    </Placeholder>
  )
}

let _s1 = content_skeleton(20 + Math.random() * 25)
let _s2 = content_skeleton(20 + Math.random() * 25)

function App() {
  const [active_tab, set_active_tab] = useState("upload")
  const [file, set_file] = useState({
    file: null,
    file_name: "",
    file_size: 0,
    file_type: "",
    modified_date: "",
  })
  const [ocr, set_ocr] = useState("tesseract")
  const [server_response, set_server_response] = useState({
    upload: {
      status_text: "",
      time_taken: 0,
    },
    scan: {
      status_text: "",
      time_taken: 0,
      data: "",
    },
    format: {
      status_text: "",
      time_taken: 0,
      data: "",
    },
  })
  const [notification, set_notification] = useState({
    active: false,
    type: "",
    title: "",
    message: "",
  })

  const upload = new (function () {
    this.label = { element: useRef() }
    this.image = { element: useRef() }
    this.input = {
      element: useRef(),
      change_handler: (event) => {
        let _url = event.target.files[0]
        if (_url == undefined) {
          set_notification({
            active: true,
            type: "warning",
            title: "Warning",
            message: "Uploaded image cannot be empty!",
          })
          this.input.element.current.value = ""
          return
        }
        if (!/^image/.test(_url.type)) {
          set_notification({
            active: true,
            type: "warning",
            title: "Warning",
            message: "Uploaded image must have a mimetype of 'image/*'!",
          })
          this.input.element.current.value = ""
          return
        }
        console.log("[i] Uploading Image:", _url.name)
        this.image.file = _url
        set_file({
          file: _url,
          file_name: _url.name,
          file_size: _url.size,
          file_type: _url.type,
          modified_date: _url.lastModifiedDate,
        })
        console.log("[i] Stored Image:", _url)
        this.label.element.current.style.display = "none"
        this.image.element.current.src = URL.createObjectURL(_url)
        this.image.element.current.style.display = "block"
      },
      remove_handler: () => {
        console.log("[i] Removing Image:", file)
        upload.input.element.current.value = ""
        set_file({
          file: null,
          file_name: "",
          file_size: 0,
          file_type: "",
          modified_date: "",
        })
        this.label.element.current.style.display = "flex"
        this.image.element.current.src = ""
        this.image.element.current.style.display = "none"
      },
      upload_handler: () => {
        const _t1 = Date.now()
        const data = new FormData()
        data.append("file", file.file)
        axios
          .post(server_url + "upload/", data)
          .then((res) => {
            set_server_response({
              ...server_response,
              upload: {
                status_text: res.statusText,
                time_taken: Date.now() - _t1,
              },
            })
            set_notification({
              active: true,
              type: "success",
              title: res.statusText,
              message:
                "Image uploaded successfully. You may now proceed to scan the image.",
            })
          })
          .catch((error) => {
            set_server_response({
              ...server_response,
              upload: {
                status_text: error.response.statusText,
                time_taken: Date.now() - _t1,
              },
            })
            set_notification({
              active: true,
              type: "error",
              title: error.response.statusText,
              message: error.message,
            })
          })
      },
    }
  })()

  const scan = new (function () {
    this.output = {
      element: useRef(),
    }
    this.select = {
      change_handler: (event) => {
        set_ocr(event.target.value)
      },
    }
    this.functions = {
      tesseract_handler: () => {
        set_notification({
          active: true,
          type: "info",
          title: "Tesseract",
          message: "Extracting text using <Tesseract>. Please wait...",
        })
        const _t1 = Date.now()
        const data = new FormData()
        data.append("filename", file.file_name)
        axios
          .post(server_url + "scan/", data)
          .then((res) => {
            set_server_response({
              ...server_response,
              scan: {
                status_text: res.statusText,
                time_taken: Date.now() - _t1,
                data: res.data,
              },
            })
          })
          .catch((error) => {
            set_server_response({
              ...server_response,
              scan: {
                status_text: error.response.statusText,
                time_taken: Date.now() - _t1,
                data: "",
              },
            })
            set_notification({
              active: true,
              type: "error",
              title: error.response.statusText,
              message: error.message,
            })
          })
      },
      gvapi_handler: () => {
        // hi skybrother
      },
    }
  })()

  const format = new (function () {
    this.output = {
      element: useRef(),
    }
    this.function = {
      llm_handler: () => {
        set_notification({
          active: true,
          type: "info",
          title: "GPT v3.5 Turbo",
          message: "Formatting extracted text using <GPT>. Please wait...",
        })
        const _t1 = Date.now()
        const data = new FormData()
        data.append("text", server_response.scan.data)
        axios
          .post(server_url + "format/", data)
          .then((res) => {
            set_server_response({
              ...server_response,
              format: {
                status_text: res.statusText,
                time_taken: Date.now() - _t1,
                data: res.data.message.content,
              },
            })
            console.log(res)
          })
          .catch((error) => {
            set_server_response({
              ...server_response,
              scan: {
                status_text: error.response.statusText,
                time_taken: Date.now() - _t1,
                data: "",
              },
            })
            set_notification({
              active: true,
              type: "error",
              title: error.response.statusText,
              message: error.message,
            })
          })
      },
    }
  })()

  // CONNECT TO SERVER
  useEffect(() => {
    axios
      .get(server_url)
      .then((res) => {
        if (res.status == 200) {
          set_notification({
            active: true,
            type: "success",
            title: res.statusText,
            message: "Connected to server successfully.",
          })
        }
      })
      .catch((error) => {
        set_notification({
          active: true,
          type: "error",
          title: error.code,
          message: error.message,
        })
      })
  }, [])

  return (
    <>
      <main data-bs-theme="dark">
        <Card border="success" className="main-card">
          <Card.Header>
            <Nav
              variant="tabs"
              defaultActiveKey="upload"
              activeKey={active_tab}
              onSelect={(selectedKey) => {
                set_active_tab(selectedKey)
              }}>
              <Nav.Item>
                <Nav.Link eventKey="upload">Upload</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  eventKey="scan"
                  disabled={
                    server_response.upload.status_text != "" &&
                    server_response.upload.time_taken != 0
                      ? false
                      : true
                  }>
                  Scan
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  eventKey="format"
                  disabled={
                    server_response.scan.status_text != "" &&
                    server_response.scan.time_taken != 0 &&
                    server_response.scan.data != ""
                      ? false
                      : true
                  }>
                  Format
                </Nav.Link>
              </Nav.Item>
              <Nav.Item style={{ marginLeft: "auto" }}>
                <Nav.Link eventKey="preferences">Preferences</Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>
          <Card.Body className="main-card-body">
            <Tabs defaultActiveKey="upload" activeKey={active_tab}>
              <Tab eventKey="upload" className="upload-pane">
                <div className="upload-image">
                  <label ref={upload.label.element}>
                    <span>
                      Drag Image or <Badge bg="secondary">Upload</Badge>
                    </span>
                  </label>
                  <img src="/" ref={upload.image.element} />
                  <input
                    type="file"
                    onChange={upload.input.change_handler}
                    ref={upload.input.element}
                  />
                </div>
                <div className="upload-status">
                  <h4>Image Properties</h4>
                  <ul>
                    <li>
                      File Name:{" "}
                      <i>
                        {file.file_name != "" ? (
                          file.file_name
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={8} />
                          </Placeholder>
                        )}
                      </i>
                    </li>
                    <li>
                      File Size:{" "}
                      <i>
                        {file.file_size > 0 ? (
                          file.file_size
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={3} />
                          </Placeholder>
                        )}{" "}
                        Bytes
                      </i>
                    </li>
                    <li>
                      File Type:{" "}
                      <i>
                        {file.file_type != "" ? (
                          file.file_type
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={4} />
                          </Placeholder>
                        )}
                      </i>
                    </li>
                    <li>
                      Last Modified:{" "}
                      <i>
                        {file.modified_date.toString() != "" ? (
                          file.modified_date.toString()
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={7} />
                          </Placeholder>
                        )}
                      </i>
                    </li>
                  </ul>
                  <h4>Server Status</h4>
                  <ul>
                    <li>
                      Response:{" "}
                      <i>
                        {server_response.upload.status_text != "" ? (
                          server_response.upload.status_text
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={2} />
                          </Placeholder>
                        )}
                      </i>
                    </li>
                    <li>
                      Time Taken:{" "}
                      <i>
                        {server_response.upload.time_taken != 0 ? (
                          server_response.upload.time_taken
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={2} />
                          </Placeholder>
                        )}
                        ms
                      </i>
                    </li>
                  </ul>
                  <div className="upload-controls">
                    <Button
                      variant="danger"
                      disabled={
                        file.file_name != "" &&
                        file.file_size > 0 &&
                        file.file_type != "" &&
                        file.modified_date.toString() != ""
                          ? false
                          : true
                      }
                      onClick={upload.input.remove_handler}>
                      Remove
                    </Button>
                    <Button
                      variant="success"
                      disabled={
                        file.file_name != "" &&
                        file.file_size > 0 &&
                        file.file_type != "" &&
                        file.modified_date.toString() != ""
                          ? false
                          : true
                      }
                      onClick={upload.input.upload_handler}>
                      Confirm
                    </Button>
                    <Button
                      variant="primary"
                      disabled={
                        server_response.upload.status_text != "" &&
                        server_response.upload.time_taken != 0
                          ? false
                          : true
                      }
                      onClick={() => set_active_tab("scan")}>
                      Scan
                    </Button>
                  </div>
                </div>
              </Tab>
              <Tab eventKey="scan" className="scan-pane">
                <div className="scan-output">
                  <pre ref={scan.output.element}>
                    {server_response.scan.data != ""
                      ? server_response.scan.data
                      : _s1}
                  </pre>
                </div>
                <div className="scan-status">
                  <h4>Scan Controls</h4>
                  <ul className="controls-list">
                    <li>
                      OCR&nbsp;Model:
                      <Form.Select
                        size="sm"
                        onChange={scan.select.change_handler}>
                        <option value="tesseract">Tesseract</option>
                        <option value="gvapi">Google Vision API</option>
                        <option value="pocr">PaddleOCR</option>
                      </Form.Select>
                    </li>
                  </ul>
                  <h4>Server Status</h4>
                  <ul>
                    <li>
                      Response:{" "}
                      <i>
                        {server_response.scan.status_text != "" ? (
                          server_response.scan.status_text
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={2} />
                          </Placeholder>
                        )}
                      </i>
                    </li>
                    <li>
                      Time Taken:{" "}
                      <i>
                        {server_response.scan.time_taken != 0 ? (
                          server_response.scan.time_taken
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={2} />
                          </Placeholder>
                        )}
                        ms
                      </i>
                    </li>
                    <li>
                      Word Count:{" "}
                      <i>
                        {server_response.scan.data != 0 ? (
                          server_response.scan.data.split(" ").length
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={2} />
                          </Placeholder>
                        )}{" "}
                        words
                      </i>
                    </li>
                  </ul>
                  <div className="scan-controls">
                    {ocr == "tesseract" ? (
                      <Button onClick={scan.functions.tesseract_handler}>
                        Extract Text
                      </Button>
                    ) : ocr == "gvapi" ? (
                      <Button onClick={scan.functions.gvapi_handler}>
                        Extract Text
                      </Button>
                    ) : ocr == "pocr" ? (
                      <Button onClick={() => console.log("empty")}>
                        Extract Text
                      </Button>
                    ) : (
                      ""
                    )}
                    <Button
                      variant="success"
                      disabled={
                        server_response.scan.status_text != "" &&
                        server_response.scan.time_taken != 0 &&
                        server_response.scan.data != ""
                          ? false
                          : true
                      }
                      onClick={() => {
                        navigator.clipboard.writeText(server_response.scan.data)
                      }}>
                      Copy
                    </Button>
                    <Button
                      variant="primary"
                      disabled={
                        server_response.scan.status_text != "" &&
                        server_response.scan.time_taken != 0 &&
                        server_response.scan.data != ""
                          ? false
                          : true
                      }
                      onClick={() => {
                        set_active_tab("format")
                        format.function.llm_handler()
                      }}>
                      Format
                    </Button>
                  </div>
                </div>
              </Tab>
              <Tab eventKey="format" className="format-pane">
                <div className="format-output">
                  <pre ref={format.output.element}>
                    {server_response.format.data != ""
                      ? server_response.format.data
                      : _s2}
                  </pre>
                </div>
                <div className="format-status">
                  <h4>Server Status</h4>
                  <ul>
                    <li>
                      Response:{" "}
                      <i>
                        {server_response.format.status_text != "" ? (
                          server_response.format.status_text
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={2} />
                          </Placeholder>
                        )}
                      </i>
                    </li>
                    <li>
                      Time Taken:{" "}
                      <i>
                        {server_response.format.time_taken != 0 ? (
                          server_response.format.time_taken
                        ) : (
                          <Placeholder as="span" animation="wave">
                            <Placeholder xs={2} />
                          </Placeholder>
                        )}
                        ms
                      </i>
                    </li>
                  </ul>
                  <div className="format-controls">
                    <Button
                      variant="success"
                      disabled={
                        server_response.format.status_text != "" &&
                        server_response.format.time_taken != 0 &&
                        server_response.format.data != ""
                          ? false
                          : true
                      }
                      onClick={() => {
                        navigator.clipboard.writeText(
                          server_response.format.data
                        )
                      }}>
                      Copy
                    </Button>
                    <Button
                      variant="primary"
                      onClick={format.function.llm_handler}>
                      Re-Format
                    </Button>
                  </div>
                </div>
              </Tab>
              <Tab eventKey="preferences" className="preferences-pane">
                Preferences
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>

        <ToastContainer
          className="p-3"
          position="bottom-start"
          style={{ zIndex: 1 }}>
          <Toast
            style={{
              borderColor:
                notification.type == "success"
                  ? "var(--bs-success-border-subtle)"
                  : notification.type == "primary"
                  ? "var(--bs-info-border-subtle)"
                  : notification.type == "warning"
                  ? "var(--bs-warning-border-subtle)"
                  : notification.type == "danger"
                  ? "var(--bs-danger-border-subtle)"
                  : "",
            }}
            show={notification.active}
            onClose={() =>
              set_notification({
                ...notification,
                active: false,
              })
            }
            delay={8000}
            autohide>
            <Toast.Header closeButton={true}>
              <strong className="me-auto">OCRapidNotes</strong>
              <small
                className={
                  notification.type == "success"
                    ? "text-success"
                    : notification.type == "info"
                    ? "text-info"
                    : notification.type == "warning"
                    ? "text-warning"
                    : notification.type == "danger"
                    ? "text-danger"
                    : ""
                }>
                {notification.title}
              </small>
            </Toast.Header>
            <Toast.Body className="text-light">
              {notification.message}
            </Toast.Body>
          </Toast>
        </ToastContainer>
      </main>
    </>
  )
}

export default App
