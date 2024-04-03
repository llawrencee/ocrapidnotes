// Import React Functions
import { useState, useRef, useEffect } from "react"

// Import Optical Character Recogntion (OCR) Model
import Tesseract from "tesseract.js"

// Import Fetch Library
import axios from "axios"

// Import Bootstrap UI Components
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

// Set Server URL
const server_url = "http://localhost:3000/"

// Skeleton Content Generator
function content_skeleton(amount) {
  let _placeholders = [] // Contains Placeholder Components

  // Generate Placeholder Contents Based on Amount
  for (let i = 0; i < amount; i++) {
    _placeholders.push(
      <Placeholder xs={Math.floor(Math.random() * 4) + 1} key={i} /> // Randomize Length
    )
    // Add to Array
    _placeholders.push(" ")
  }

  // Return Animated Placeholders
  return (
    <Placeholder as="div" animation="wave" style={{ textAlign: "left" }}>
      {_placeholders}
    </Placeholder>
  )
}

// Pre-Load Scan & Format Content Skeleton
// Minimum 20 Placeholders, Maximum 45 Placeholders
let _s1 = content_skeleton(20 + Math.random() * 25)
let _s2 = content_skeleton(20 + Math.random() * 25)

// Main Functions
function App() {
  // Navigation Tab State
  const [active_tab, set_active_tab] = useState("upload")
  // Uploaded File State
  const [file, set_file] = useState({
    file: null,
    file_name: "",
    file_size: 0,
    file_type: "",
    modified_date: "",
  })
  // Selected OCR Model to Use
  const [ocr, set_ocr] = useState("tesseract")
  // Server Response State
  // Automatically Updates Values In Real-Time
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
  const [preferences, set_preferences] = useState({
    filter: true,
    filtered_characters: false,
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
        this.image.file = _url
        set_file({
          file: _url,
          file_name: _url.name,
          file_size: _url.size,
          file_type: _url.type,
          modified_date: _url.lastModifiedDate,
        })
        this.label.element.current.style.display = "none"
        this.image.element.current.src = URL.createObjectURL(_url)
        this.image.element.current.style.display = "block"
      },
      remove_handler: () => {
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

  const filter = (text, type, time, filtered) => {
    const data = new FormData()
    data.append("text", text)
    data.append("filtered_characters", filtered)
    axios
      .post(server_url + "filter/", data)
      .then((res) => {
        set_server_response({
          ...server_response,
          scan: {
            status_text: res.statusText,
            time_taken: Date.now() - time,
            data: res.data.message.content,
          },
        })
        set_notification({
          active: true,
          type: "success",
          title: res.statusText,
          message: `Successfully scanned and filtered text using <${
            type == "tesseract"
              ? "Tesseract"
              : type == "gvapi"
              ? "Google Vision API"
              : type == "pocr"
              ? "PaddleOCR"
              : "Undefined"
          }>.`,
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
  }

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
        set_server_response({
          ...server_response,
          scan: {
            status_text: "",
            time_taken: 0,
            data: "",
          },
        })
        set_notification({
          active: true,
          type: "info",
          title: "Tesseract",
          message: "Extracting text using <Tesseract>. Please wait...",
        })
        const _t1 = Date.now()
        Tesseract.recognize("./server/uploads/" + file.file_name, "eng", {
          logger: (m) => {
            console.log(m.status, `${Math.round(m.progress * 100)}%`)
          },
        })
          .catch((error) => {
            set_server_response({
              ...server_response,
              scan: {
                status_text: "BAD REQUEST",
                time_taken: Date.now() - _t1,
                data: "",
              },
            })
            set_notification({
              active: true,
              type: "danger",
              title: new Error(error).name,
              message: new Error(error).message,
            })
          })
          .then((result) => {
            if (preferences.filter) {
              filter(
                result.data.text.replace(/[\r\n]+/gm, " "),
                "tesseract",
                _t1,
                preferences.filtered_characters
              )
            } else {
              set_server_response({
                ...server_response,
                scan: {
                  status_text: "OK",
                  time_taken: Date.now() - _t1,
                  data: result.data.text.replace(/[\r\n]+/gm, " "),
                },
              })
              set_notification({
                active: true,
                type: "success",
                title: "OK",
                message:
                  "Successfully scanned and filtered text using <Tesseract>.",
              })
            }
          })
      },
      gvapi_handler: () => {
        set_server_response({
          ...server_response,
          scan: {
            status_text: "",
            time_taken: 0,
            data: "",
          },
        })
        set_notification({
          active: true,
          type: "info",
          title: "Google Vision API",
          message: "Extracting text using <Google Vision API>. Please wait...",
        })
        const _t1 = Date.now()
        const data = new FormData()
        data.append("filename", file.file_name)
        data.append("type", "gvapi")
        axios
          .post(server_url + "scan/", data)
          .then((res) => {
            if (preferences.filter) {
              filter(res.data, "gvapi", _t1, preferences.filtered_characters)
            } else {
              set_server_response({
                ...server_response,
                scan: {
                  status_text: res.statusText,
                  time_taken: Date.now() - _t1,
                  data: res.data,
                },
              })
            }
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
      pocr_handler: () => {
        set_notification({
          active: true,
          type: "info",
          title: "PaddleOCR",
          message: "Extracting text using <PaddleOCR>. Please wait...",
        })
        const _t1 = Date.now()
        const data = new FormData()
        data.append("filename", file.file_name)
        data.append("type", "pocr")
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
        data.append("text", document.getElementById("scan_output").value)
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
                  {server_response.scan.data != "" ? (
                    <textarea
                      ref={scan.output.element}
                      id="scan_output"
                      defaultValue={server_response.scan.data}></textarea>
                  ) : (
                    _s1
                  )}
                </div>
                <div className="scan-status">
                  <h4>Scan Controls</h4>
                  <ul className="controls-list">
                    <li>
                      Scanning&nbsp;Type:
                      <Form.Select
                        size="sm"
                        onChange={scan.select.change_handler}>
                        <option value="tesseract">Rapid Offline Mode</option>
                        <option value="gvapi">Accurate Online Mode</option>
                        <option value="pocr">Accurate Offline Mode</option>
                      </Form.Select>
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        label="Filter"
                        checked={preferences.filter}
                        onChange={() => {
                          set_preferences({
                            ...preferences,
                            filter: !preferences.filter,
                          })
                        }}
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        checked={preferences.filtered_characters}
                        disabled={!preferences.filter}
                        label="Show Filtered Characters"
                        onChange={() => {
                          set_preferences({
                            ...preferences,
                            filtered_characters:
                              !preferences.filtered_characters,
                          })
                        }}
                      />
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
                      <Button onClick={scan.functions.pocr_handler}>
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
                        navigator.clipboard.writeText(
                          document.getElementById("scan_output").value
                        )
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
                  <pre ref={format.output.element} id="format_output">
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
                          document.getElementById("format_output").value
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
                <div className="preferences-output"></div>
                <div className="preferences-status">
                  <h4>Scan Controls</h4>
                  <ul className="controls-list">
                    <li>
                      <Form.Check
                        type="switch"
                        label="Title"
                        value="title"
                        checked={false}
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        label="List"
                        value="list"
                        checked={false}
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        label="Outline"
                        value="outline"
                        checked={false}
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        label="Paraphrase"
                        value="paraphrase"
                        checked={false}
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        label="Translate"
                        value="translate"
                        checked={false}
                      />
                    </li>
                  </ul>
                </div>
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
