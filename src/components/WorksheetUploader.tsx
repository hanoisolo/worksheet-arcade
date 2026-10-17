import { useRef, useState, type ChangeEvent } from 'react'
import { FileText, Upload } from 'lucide-react'
import type { WorksheetFile } from '../types/game'
import { ACCEPT, fileToWorksheet } from '../utils/fileToWorksheet'

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function WorksheetUploader({
  file,
  onFile,
  onClear,
}: {
  file: WorksheetFile | null
  onFile: (f: WorksheetFile) => void
  onClear: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function prepare(picked: File) {
    setError(null)
    setBusy(true)
    const result = await fileToWorksheet(picked)
    setBusy(false)
    if (result.ok) {
      onFile(result.value)
    } else {
      setError(result.error.message)
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (picked) void prepare(picked)
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload worksheet: drop a file or press Enter to choose"
        aria-busy={busy}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const picked = event.dataTransfer.files?.[0]
          if (picked) void prepare(picked)
        }}
        className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan ${
          dragging ? 'border-cyan bg-cyan/15' : 'border-cyan/50 bg-panel hover:border-cyan'
        }`}
      >
        <Upload aria-hidden className="h-10 w-10 text-cyan" />
        <h3 className="text-lg font-extrabold text-ink">Drop your worksheet here</h3>
        <p className="text-sm text-ink/85">PNG, JPEG, WEBP or PDF · PDFs up to 5 MB</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="min-h-11 rounded-2xl bg-lime px-5 py-2 font-extrabold text-bg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
        >
          Choose file
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="min-h-11 rounded-2xl border-2 border-cyan bg-cyan/10 px-5 py-2 font-extrabold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
        >
          Take photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          aria-label="Choose a worksheet file"
          tabIndex={-1}
          data-testid="file-input"
          onChange={handleInputChange}
          className="sr-only"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Take a photo of the worksheet"
          tabIndex={-1}
          data-testid="camera-input"
          onChange={handleInputChange}
          className="sr-only"
        />
      </div>

      {busy && (
        <p aria-live="polite" className="rounded-2xl bg-panel px-4 py-3 font-bold text-cyan">
          Preparing…
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-2xl border-2 border-amber bg-amber/15 px-4 py-3 font-bold text-amber"
        >
          {error}
        </p>
      )}

      {file && (
        <div className="flex items-center gap-4 rounded-2xl bg-panel p-4">
          {file.mime === 'application/pdf' ? (
            <FileText aria-hidden className="h-12 w-12 shrink-0 text-cyan" />
          ) : (
            <img
              alt="Worksheet preview"
              src={`data:${file.mime};base64,${file.base64}`}
              className="h-14 w-14 shrink-0 rounded-xl border-2 border-cyan/40 object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold text-ink">{file.name}</p>
            <p className="text-sm text-ink/85">{formatSize(file.bytes)}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove worksheet"
            className="min-h-11 shrink-0 rounded-2xl border-2 border-pink px-4 py-2 font-extrabold text-pink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}
