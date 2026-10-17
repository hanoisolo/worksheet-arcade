import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ReadyScreen from './ReadyScreen'
import GamePlaceholder from './GamePlaceholder'
import type { GamePayload } from '../types/game'

const payload: GamePayload = {
  meta: {
    title: 'Fraction Frenzy',
    subject: 'Math',
    targetGrade: 'Grade 4',
    topicSummary: 'Add and compare fractions with the same denominator.',
  },
  levels: [
    {
      id: 1,
      difficulty: 'easy',
      question: 'What is 1/4 + 1/4?',
      options: ['1/2', '1/8', '2/8', '1'],
      correctAnswer: '1/2',
      hint: 'Same denominator.',
      explanation: '1/4 + 1/4 = 2/4 = 1/2.',
    },
    {
      id: 2,
      difficulty: 'medium',
      question: 'Which is bigger: 3/5 or 2/5?',
      options: ['3/5', '2/5', 'Equal', 'Cannot tell'],
      correctAnswer: '3/5',
      hint: 'Compare numerators.',
      explanation: 'With the same denominator, the larger numerator wins.',
    },
  ],
  matchingPairs: [
    { id: 'p1', term: 'one half', match: '1/2' },
    { id: 'p2', term: 'one third', match: '1/3' },
    { id: 'p3', term: 'one quarter', match: '1/4' },
  ],
}

afterEach(() => {
  cleanup()
})

describe('ReadyScreen', () => {
  it('shows the worksheet title, meta line, and counts', () => {
    render(<ReadyScreen payload={payload} source="ai" onPick={() => {}} onHome={() => {}} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Fraction Frenzy' })).toBeTruthy()
    expect(screen.getByText('Math · Grade 4')).toBeTruthy()
    expect(screen.getByText('2 questions · 3 matching pairs')).toBeTruthy()
  })

  it('shows the Demo pill only for demo source', () => {
    const { rerender } = render(
      <ReadyScreen payload={payload} source="ai" onPick={() => {}} onHome={() => {}} />,
    )

    expect(screen.queryByText('Demo')).toBeNull()

    rerender(<ReadyScreen payload={payload} source="demo" onPick={() => {}} onHome={() => {}} />)

    expect(screen.getByText('Demo')).toBeTruthy()
  })

  it('renders three game buttons with per-game counts', () => {
    render(<ReadyScreen payload={payload} source="demo" onPick={() => {}} onHome={() => {}} />)

    expect(screen.getByRole('button', { name: /Space Blaster/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Memory Match/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Boss Quest/ })).toBeTruthy()
    expect(screen.getAllByText('2 questions')).toHaveLength(2)
    expect(screen.getByText('3 pairs')).toBeTruthy()
  })

  it('calls onPick with the game id when a card is clicked', () => {
    const onPick = vi.fn()
    render(<ReadyScreen payload={payload} source="ai" onPick={onPick} onHome={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /Memory Match/ }))

    expect(onPick).toHaveBeenCalledWith('memory')
  })
})

describe('GamePlaceholder', () => {
  it('shows the coming soon message and calls onBack', () => {
    const onBack = vi.fn()
    render(<GamePlaceholder title="Memory Match" onBack={onBack} />)

    expect(screen.getByRole('heading', { name: 'Memory Match' })).toBeTruthy()
    expect(screen.getByText('Coming soon! This game is being built.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Back to games/ }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
