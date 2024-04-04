// Import React Functions
import { useEffect, useRef, useState } from "react"

// Import Optical Character Recogntion (OCR) Model
import Tesseract from "tesseract.js"

// Import Fetch Library
import axios from "axios"

// Import Cookie Library
import Cookies from "js-cookie"

// Import Bootstrap UI Components
import {
  Badge,
  Button,
  Card,
  Form,
  Nav,
  Placeholder,
  Stack,
  Tab,
  Tabs,
  Toast,
  ToastContainer,
} from "react-bootstrap"

// Set Server URL
const server_url = "http://localhost:3000/"

// Skeleton Content Generator
// amount:int; number of placeholders to create
function content_skeleton(amount) {
  let _placeholders = [] // Contains Placeholder Components

  // Generate Placeholder Contents
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
let _s3 = content_skeleton(20 + Math.random() * 25)

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
  // Server Responses Object
  const [server_response, set_server_response] = useState({
    upload: {
      status_text: "", // Server Response
      time_taken: 0, // Measured in ms
    },
    scan: {
      status_text: "", // Server Response
      time_taken: 0, // Measured in ms
      data: "", // Scanned Text
    },
    format: {
      status_text: "", // Server Response
      time_taken: 0, // Measured in ms
      data: "", // Formatted Text
    },
  })
  // Toast Notification State
  const [notification, set_notification] = useState({
    active: false,
    type: "", // "success", "info", "warning", "danger"
    title: "",
    message: "",
  })
  // Set Default Preferences
  const [preferences, set_preferences] = useState({
    scan: {
      filter: true,
      filtered_characters: false,
    },
    format: {
      title: true,
      list: true,
      outline: false,
      paraphrase: false,
      translate: false,
      language: "English",
    },
  })
  // Apply Cookie Preferences
  useEffect(() => {
    if (Cookies.get("preferences")) {
      let _preference = JSON.parse(Cookies.get("preferences"))
      set_preferences({
        ...preferences,
        format: {
          title: _preference.format.title,
          list: _preference.format.list,
          outline: _preference.format.outline,
          paraphrase: _preference.format.paraphrase,
          translate: _preference.format.translate,
          language: _preference.format.language,
        },
      })
      document.getElementById("input_language").value =
        _preference.format.language
    }
  }, [])

  // UPLOAD
  const upload = new (function () {
    this.label = { element: useRef() }
    this.image = { element: useRef() }
    this.input = {
      element: useRef(),
      // Manage File Input Change Event
      change_handler: (event) => {
        // Get File
        let _url = event.target.files[0]
        // Check If File Exists
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
        // Check If File Has Image Mimetype
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
        // Store Image Locally
        this.image.file = _url
        // Update File State With File Metadata
        set_file({
          file: _url,
          file_name: _url.name,
          file_size: _url.size,
          file_type: _url.type,
          modified_date: _url.lastModifiedDate,
        })
        // Hide Label, Set - Show Uploaded Image
        this.label.element.current.style.display = "none"
        this.image.element.current.src = URL.createObjectURL(_url)
        this.image.element.current.style.display = "block"
      },
      // Manage Remove Uploaded Image
      remove_handler: () => {
        // Remove Image From Input Element
        upload.input.element.current.value = ""
        set_file({
          file: null,
          file_name: "",
          file_size: 0,
          file_type: "",
          modified_date: "",
        })
        // Show Label, Remove - Hide Uploaded Image
        this.label.element.current.style.display = "flex"
        this.image.element.current.src = ""
        this.image.element.current.style.display = "none"
      },
      // Manage File Upload
      upload_handler: () => {
        // Start Time Profiling For Upload
        const _t1 = Date.now()
        const data = new FormData()
        data.append("file", file.file) // Add File To Form Data
        axios
          .post(server_url + "upload/", data) // localhost:3000/upload/
          .then((res) => {
            // Save Server Response In Upload Object
            set_server_response({
              ...server_response,
              upload: {
                status_text: res.statusText,
                time_taken: Date.now() - _t1,
              },
            })
            // Notify User
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

  // FILTER
  // text:string; text to be filtered
  // type:string; ocr model
  // time:int; time started profile
  // filtered:boolean; show filtered characters or not
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
          }>.`, // Returns <Tesseract>, <Google Vision API>, or <PaddleOCR>
        })
      })
      .catch((error) => {
        set_server_response({
          ...server_response,
          scan: {
            status_text: error.response.statusText,
            time_taken: Date.now() - time,
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

  // SCAN
  const scan = new (function () {
    this.output = {
      element: useRef(),
    }
    this.select = {
      // Form Select OnChange Event Handler
      change_handler: (event) => {
        // Replace OCR Used Based On Input
        set_ocr(event.target.value)
      },
    }
    // OCR Model Functions
    this.functions = {
      // TESSERACT
      tesseract_handler: () => {
        // Clear Scan Response
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
        Tesseract.recognize(server_url + "uploads/" + file.file_name, "eng", {
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
            if (preferences.scan.filter) {
              filter(
                result.data.text.replace(/[\r\n]+/gm, " "),
                "tesseract",
                _t1,
                preferences.scan.filtered_characters
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

      // GOOGLE VISION API
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
            if (preferences.scan.filter) {
              console.log("filtered")
              filter(
                res.data,
                "gvapi",
                _t1,
                preferences.scan.filtered_characters
              )
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

      // PADDLEOCR
      pocr_handler: () => {
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
            if (preferences.scan.filter) {
              filter(
                res.data,
                "pocr",
                _t1,
                preferences.scan.filtered_characters
              )
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
    }
  })()

  // FORMAT
  const format = new (function () {
    this.output = {
      element: useRef(),
    }
    this.function = {
      // GPT
      llm_handler: () => {
        set_server_response({
          ...server_response,
          format: {
            status_text: "",
            time_taken: 0,
            data: "",
          },
        })
        set_notification({
          active: true,
          type: "info",
          title: "GPT v3.5 Turbo",
          message: "Formatting extracted text using <GPT>. Please wait...",
        })
        const _t1 = Date.now()
        const data = new FormData()
        data.append("text", document.getElementById("scan_output").value)
        data.append("preferences", JSON.stringify(preferences.format))
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
  // Test If Server Is Online
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

  // Render
  return (
    <>
      <main data-bs-theme="dark">
        <Card border="success" className="main-card">
          <Card.Header>
            {/* Nav - Links for moving between Tabs */}
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
            {/* Tab - Each section for the specific tabs */}
            <Tabs defaultActiveKey="upload" activeKey={active_tab}>
              {/* UPLOAD */}
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

              {/* SCAN */}
              <Tab eventKey="scan" className="scan-pane">
                <div className="scan-output">
                  {server_response.scan.data != "" ? (
                    <textarea
                      ref={scan.output.element}
                      id="scan_output"
                      defaultValue={server_response.scan.data}
                      autoFocus
                      onFocus={(event) => {
                        event.target.setSelectionRange(
                          event.target.value.length,
                          event.target.value.length
                        )
                      }}></textarea>
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
                        checked={preferences.scan.filter}
                        onChange={() => {
                          set_preferences({
                            ...preferences,
                            scan: {
                              ...preferences.scan,
                              filter: !preferences.scan.filter,
                            },
                          })
                        }}
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        checked={preferences.scan.filtered_characters}
                        disabled={!preferences.scan.filter}
                        label="Show Filtered Characters"
                        onChange={() => {
                          set_preferences({
                            ...preferences,
                            scan: {
                              ...preferences.scan,
                              filtered_characters:
                                !preferences.scan.filtered_characters,
                            },
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

              {/* FORMAT */}
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

              {/* PREFERENCES */}
              <Tab eventKey="preferences" className="preferences-pane">
                <div className="preferences-output">
                  <pre>
                    {preferences.format.title ? "## Lorem Ipsum\n" : ""}
                    {preferences.format.list
                      ? "\n- Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ullamcorper gravida diam in scelerisque.\n\n- Nulla erat ex, consectetur ut imperdiet eget, ultricies ac magna.\n\n- Vestibulum accumsan velit quis velit sollicitudin finibus. Quisque ac suscipit justo, ut semper mi.\n\n- In volutpat, justo eget pretium fringilla, mi eros tempus nisl, id pellentesque sapien purus posuere nisi.\n"
                      : ""}
                    {preferences.format.outline
                      ? "\n- Praesent ullamcorper gravida diam in scelerisque. Nulla erat ex, consectetur ut imperdiet eget, ultricies ac magna. Vestibulum accumsan velit quis velit sollicitudin finibus. Quisque ac suscipit justo, ut semper mi. In volutpat, justo eget pretium fringilla, mi eros tempus nisl, id pellentesque sapien purus posuere nisi. Cras efficitur turpis non hendrerit dapibus. Nulla hendrerit vitae sapien bibendum sodales. Pellentesque eget eleifend est. Pellentesque consequat ultrices neque, vitae interdum lacus. Mauris mollis feugiat elit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Suspendisse posuere lobortis urna, ut sagittis dolor congue sed. In ante leo, lacinia non ligula lacinia, sagittis malesuada odio. Aliquam vitae auctor velit. Praesent faucibus vitae odio in tincidunt. Vivamus auctor gravida mollis."
                      : ""}
                    {preferences.format.paraphrase
                      ? "\n- A gravida element within scelerisque, rich in magna ultricies. Seeking solicitation in finibus. Embracing justo, navigating through semper. Volutpat holds a pretium fringilla, temporally distinct. Efficitur turpis, non-hendrerit dapibus. Void of hendrerit, yet imbued with bibendum sodales. Consequat ultrices, interdum lacus vitae. Mollis feugiat, elit in essence. Embracing interdum and fames, ante ipsum faucibus. Posuere lobortis suspends, dolorously congue sed. Preceding leo, non-ligula, odio malesuada sagittis. Auctor vitae, embracing odio in tincidunt. Auctor mollis gravida."
                      : ""}
                    {!(
                      preferences.format.title ||
                      preferences.format.list ||
                      preferences.format.outline ||
                      preferences.format.paraphrase
                    )
                      ? _s3
                      : ""}
                  </pre>
                </div>
                <div className="preferences-status">
                  <h4>Scan Controls</h4>
                  <ul className="controls-list">
                    <li>
                      <Form.Check
                        type="switch"
                        label="Title"
                        checked={preferences.format.title}
                        onChange={() => {
                          set_preferences({
                            ...preferences,
                            format: {
                              ...preferences.format,
                              title: !preferences.format.title,
                            },
                          })
                        }}
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        label="List"
                        checked={preferences.format.list}
                        onChange={() => {
                          set_preferences({
                            ...preferences,
                            format: {
                              ...preferences.format,
                              list: !preferences.format.list,
                            },
                          })
                        }}
                        disabled={
                          preferences.format.outline ||
                          preferences.format.paraphrase
                        }
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        label="Outline"
                        checked={preferences.format.outline}
                        onChange={() => {
                          set_preferences({
                            ...preferences,
                            format: {
                              ...preferences.format,
                              outline: !preferences.format.outline,
                            },
                          })
                        }}
                        disabled={
                          preferences.format.list ||
                          preferences.format.paraphrase
                        }
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        label="Paraphrase"
                        checked={preferences.format.paraphrase}
                        onChange={() => {
                          set_preferences({
                            ...preferences,
                            format: {
                              ...preferences.format,
                              paraphrase: !preferences.format.paraphrase,
                            },
                          })
                        }}
                        disabled={
                          preferences.format.list || preferences.format.outline
                        }
                      />
                    </li>
                    <li>
                      <Form.Check
                        type="switch"
                        label="Translate"
                        checked={preferences.format.translate}
                        onChange={() => {
                          set_preferences({
                            ...preferences,
                            format: {
                              ...preferences.format,
                              translate: !preferences.format.translate,
                            },
                          })
                          if (!preferences.format.translate) {
                            document.getElementById("input_language").focus()
                          }
                        }}
                      />
                    </li>
                    <li>
                      <Form.Group as={Stack}>
                        <Stack direction="horizontal" gap={3}>
                          <Form.Label
                            htmlFor="input_language"
                            className={
                              !preferences.format.translate
                                ? "text-secondary"
                                : ""
                            }
                            style={{ marginBottom: 0 }}>
                            Translate&nbsp;To
                          </Form.Label>
                          <Form.Control
                            size="sm"
                            type="text"
                            id="input_language"
                            defaultValue={preferences.format.language}
                            readOnly={!preferences.format.translate}
                          />
                        </Stack>
                      </Form.Group>
                    </li>
                  </ul>
                  <div className="preferences-controls">
                    <Button
                      variant="danger"
                      disabled={
                        preferences.format.title == true &&
                        preferences.format.list == true &&
                        preferences.format.outline == false &&
                        preferences.format.paraphrase == false &&
                        preferences.format.translate == false &&
                        preferences.format.language == "English"
                          ? true
                          : false
                      }
                      onClick={() => {
                        set_preferences({
                          ...preferences,
                          format: {
                            title: true,
                            list: true,
                            outline: false,
                            paraphrase: false,
                            translate: false,
                            language: "English",
                          },
                        })
                        document.getElementById("input_language").value =
                          "English"
                      }}>
                      Reset to Default
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => {
                        Cookies.set(
                          "preferences",
                          `{"format": {"title": ${
                            preferences.format.title
                          },"list": ${preferences.format.list},"outline": ${
                            preferences.format.outline
                          },"paraphrase": ${
                            preferences.format.paraphrase
                          },"translate": ${
                            preferences.format.translate
                          },"language": "${
                            document.getElementById("input_language").value
                          }"}}`
                        )
                        set_preferences({
                          ...preferences,
                          format: {
                            ...preferences.format,
                            language:
                              document.getElementById("input_language").value,
                          },
                        })
                        set_notification({
                          active: true,
                          type: "success",
                          title: "Saved Preferences",
                          message:
                            "User preferences has been stored in a cookie.",
                        })
                      }}>
                      Save
                    </Button>
                  </div>
                </div>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>

        {/* Notification Toast */}
        <ToastContainer
          className="p-3"
          position="bottom-start"
          style={{ zIndex: 1 }}>
          <Toast
            style={{
              borderColor:
                notification.type == "success"
                  ? "var(--bs-success-border-subtle)"
                  : notification.type == "info"
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
            delay={8000} // 8 Seconds
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
