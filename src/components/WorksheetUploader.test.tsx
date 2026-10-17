// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorksheetUploader from './WorksheetUploader'
import type { WorksheetFile } from '../types/game'

function pngFile(): File {
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00,
  ])
  return new File([bytes], 'worksheet.png', { type: 'image/png' })
}

afterEach(cleanup)

describe('WorksheetUploader', () => {
  it('shows the drop zone with its accessible label', () => {
    render(<WorksheetUploader file={null} onFile={vi.fn()} onClear={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'Upload worksheet: drop a file or press Enter to choose' })
    ).toBeTruthy()
    expect(screen.getByText('Drop your worksheet here')).toBeTruthy()
    expect(screen.getByText('PNG, JPEG, WEBP or PDF · PDFs up to 5 MB')).toBeTruthy()
  })

  it('alerts when a text file is uploaded', async () => {
    const onFile = vi.fn()
    const user = userEvent.setup({ applyAccept: false })

    render(<WorksheetUploader file={null} onFile={onFile} onClear={vi.fn()} />)

    await user.upload(
      screen.getByTestId('file-input'),
      new File(['hello worksheet'], 'notes.txt', { type: 'text/plain' })
    )

    const alert = await screen.findByRole('alert')
    expect(alert.textContent ?? '').toMatch(/please upload/i)
    expect(onFile).not.toHaveBeenCalled()
  })

  it('alerts when a HEIC file is uploaded', async () => {
    const onFile = vi.fn()
    const user = userEvent.setup({ applyAccept: false })

    render(<WorksheetUploader file={null} onFile={onFile} onClear={vi.fn()} />)

    await user.upload(
      screen.getByTestId('file-input'),
      new File([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])], 'photo.heic', {
        type: 'image/heic',
      })
    )

    const alert = await screen.findByRole('alert')
    expect(alert.textContent ?? '').toMatch(/heic/i)
    expect(onFile).not.toHaveBeenCalled()
  })

  it('accepts a small PNG and calls onFile', async () => {
    const onFile = vi.fn()
    const user = userEvent.setup({ applyAccept: false })

    render(<WorksheetUploader file={null} onFile={onFile} onClear={vi.fn()} />)

    await user.upload(screen.getByTestId('file-input'), pngFile())

    await waitFor(() => expect(onFile).toHaveBeenCalledTimes(1))
    expect(onFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'worksheet.png', mime: 'image/png' })
    )
  })

  it('renders the picked worksheet and removes it', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()
    const file: WorksheetFile = {
      name: 'fractions.png',
      mime: 'image/png',
      base64: 'iVBORw0KGgo=',
      bytes: 2048,
    }

    render(<WorksheetUploader file={file} onFile={vi.fn()} onClear={onClear} />)

    expect(screen.getByText('fractions.png')).toBeTruthy()
    expect(screen.getByText('2 KB')).toBeTruthy()
    expect(screen.getByAltText('Worksheet preview')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Remove worksheet' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
