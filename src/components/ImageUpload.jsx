// Libraries
import { useRef, useState } from "react"

function ImageUpload({ scan_function, organize_function, organize_ready }) {
  const [r_disabled, change_r_disabled] = useState(true)
  const [s_disabled, change_s_disabled] = useState(true)

  const upload = new (function () {
    this.label = { element: useRef() }
    this.image = { element: useRef(), _url: null }
    this.input = {
      element: useRef(),
      change_handler: (event) => {
        if (event.target.files[0] != undefined) {
          this.label.element.current.textContent = ""
          this.image.element.current.style.display = "block"
          this.image.element.current.src = URL.createObjectURL(
            event.target.files[0]
          )

          change_r_disabled(false)
          change_s_disabled(false)
        }
      },
    }
    this.button = {
      click_handler: () => {
        this.input.element.current.click()
      },
    }
  })()

  const control = new (function () {
    this.preference = {
      click_handler: () => {
        console.log("Set Note Preference")
      },
    }
    this.remove = {
      click_handler: () => {
        console.log("Remove Image")
        upload.image._url = null
        upload.label.element.current.textContent = "Drag Image Here or "
        upload.label.element.current.append(
          (document.createElement("span").textContent = "Upload")
        )
        upload.image.element.current.style.display = "none"
        upload.image.element.current.src = upload.image._url

        change_r_disabled(true)
        change_s_disabled(true)
      },
    }
    this.scan = {
      click_handler: () => {
        console.log("Scan Image")
        scan_function(upload.image.element.current.src)
      },
    }
    this.organize = {
      click_handler: () => {
        console.log("Organize Notes")
        organize_function()
      },
    }
  })()

  return (
    <>
      <div className="image-upload">
        <button className="upload-button" onClick={upload.button.click_handler}>
          <label htmlFor="image_upload" ref={upload.label.element}>
            Drag Image Here or <span>Upload</span>
          </label>
        </button>
        <img src="/" className="upload-image" ref={upload.image.element} />
        <input
          type="file"
          name="image_upload"
          className="upload-input"
          onChange={upload.input.change_handler}
          ref={upload.input.element}
        />
      </div>

      <ul className="image-controls">
        <li>
          <button onClick={control.preference.click_handler}>
            Set Note Preference
          </button>
        </li>
        <li>
          <button onClick={control.remove.click_handler} disabled={r_disabled}>
            Remove Image
          </button>
        </li>
        <li>
          <button onClick={control.scan.click_handler} disabled={s_disabled}>
            Scan
          </button>
        </li>
        <li>
          <button
            onClick={control.organize.click_handler}
            disabled={organize_ready}>
            Turn Into Notes
          </button>
        </li>
      </ul>
    </>
  )
}

export default ImageUpload
