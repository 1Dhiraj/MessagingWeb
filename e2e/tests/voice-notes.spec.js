const { test, expect } = require('@playwright/test')
const { ChatUser, uid, recordVoiceNote } = require('./helpers')

test.describe('Voice notes', () => {
  let alice, bob

  test.beforeEach(async ({ browser }) => {
    alice = await ChatUser.create(browser, { id: uid('alice'), name: 'Alice' })
    bob = await ChatUser.create(browser, { id: uid('bob'), name: 'Bob' })
    await alice.addContact(bob)
    await bob.addContact(alice)
    await alice.startConversationWith(bob)
  })

  test.afterEach(async () => {
    await alice.close()
    await bob.close()
  })

  test('the browser supports a recordable audio container', async () => {
    // Guards the regression where `audio/webm` was hard-coded and threw on
    // browsers that only support audio/mp4.
    const picked = await alice.page.evaluate(() => {
      const candidates = [
        'audio/webm;codecs=opus', 'audio/webm',
        'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4',
      ]
      return candidates.find(t => MediaRecorder.isTypeSupported(t)) || null
    })
    expect(picked).not.toBeNull()
  })

  test('recording shows a live timer and can be cancelled without sending', async () => {
    const page = alice.page
    await page.getByTestId('record-btn').click()
    await expect(page.getByTestId('recording-indicator')).toBeVisible()

    // Always m:ss — never NaN or a runaway float.
    await expect(page.getByTestId('record-timer')).toHaveText(/^\d+:\d{2}$/)

    // And it actually advances.
    await expect(page.getByTestId('record-timer')).toHaveText('0:01', { timeout: 4000 })
    await expect(page.getByTestId('record-timer')).toHaveText('0:02', { timeout: 4000 })

    await page.getByTestId('cancel-recording').click()
    await expect(page.getByTestId('recording-indicator')).toBeHidden()

    // Nothing was sent, and the composer is usable again.
    await expect(page.getByTestId('voice-note')).toHaveCount(0)
    await expect(page.getByTestId('message-input')).toBeVisible()
  })

  test('cancelling releases the microphone', async () => {
    const page = alice.page
    await page.getByTestId('record-btn').click()
    await expect(page.getByTestId('recording-indicator')).toBeVisible()
    await page.waitForTimeout(600)
    await page.getByTestId('cancel-recording').click()
    await expect(page.getByTestId('recording-indicator')).toBeHidden()

    // The old code returned early on an empty chunk list and never stopped the
    // tracks, leaving the mic hot. Assert no live audio track survives.
    await page.waitForTimeout(300)
    const liveTracks = await page.evaluate(() => window.__liveAudioTracks || 0)
    expect(liveTracks).toBe(0)
  })

  test('a recorded note sends, renders as a player and reaches the recipient', async () => {
    await recordVoiceNote(alice, 1500)

    const senderNote = alice.page.getByTestId('voice-note')
    await expect(senderNote).toHaveCount(1)

    await bob.openConversation(0)
    const receiverNote = bob.page.getByTestId('voice-note')
    await expect(receiverNote).toHaveCount(1)

    // Sidebar preview labels it correctly rather than showing a blank row.
    await bob.page.getByTestId('tab-conversations').click()
    await expect(bob.page.getByTestId('conversation-item').first()).toContainText('Voice note')
  })

  test('duration is finite and seekable, not Infinity', async () => {
    await recordVoiceNote(alice, 2000)

    const note = alice.page.getByTestId('voice-note')
    await expect(note).toHaveCount(1)

    // data-duration is only populated once a real, finite duration is known.
    await expect(note).not.toHaveAttribute('data-duration', '')
    const duration = Number(await note.getAttribute('data-duration'))
    expect(Number.isFinite(duration)).toBe(true)
    expect(duration).toBeGreaterThan(0.5)

    // The visible label must never render Infinity/NaN.
    const label = await alice.page.getByTestId('voice-note-time').textContent()
    expect(label).toMatch(/^\d+:\d{2}$/)

    // Same on the receiving side, where the header-less webm bug bit hardest.
    await bob.openConversation(0)
    const bobNote = bob.page.getByTestId('voice-note')
    await expect(bobNote).not.toHaveAttribute('data-duration', '')
    const bobLabel = await bob.page.getByTestId('voice-note-time').textContent()
    expect(bobLabel).toMatch(/^\d+:\d{2}$/)
  })

  test('playback starts and advances', async () => {
    await recordVoiceNote(alice, 2000)
    await bob.openConversation(0)

    const note = bob.page.getByTestId('voice-note')
    await expect(note).toHaveCount(1)

    await bob.page.getByTestId('voice-note-toggle').click()
    await expect(note).toHaveAttribute('data-playing', 'true')

    // currentTime actually moves — i.e. the media element decoded the blob.
    await bob.page.waitForTimeout(900)
    const t = await bob.page.evaluate(() => {
      const a = document.querySelector('[data-testid="voice-note"] audio')
      return a ? a.currentTime : -1
    })
    expect(t).toBeGreaterThan(0)

    await bob.page.getByTestId('voice-note-toggle').click()
    await expect(note).toHaveAttribute('data-playing', 'false')
  })

  test('seeking by clicking the waveform works', async () => {
    await recordVoiceNote(alice, 2500)

    const bars = alice.page.getByRole('slider', { name: 'Seek voice message' })
    await expect(bars).toBeVisible()

    const box = await bars.boundingBox()
    await alice.page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2)

    const t = await alice.page.evaluate(() => {
      const a = document.querySelector('[data-testid="voice-note"] audio')
      return a ? a.currentTime : -1
    })
    expect(t).toBeGreaterThan(0)
  })

  test('a voice note can be replied to and deleted', async () => {
    await recordVoiceNote(alice, 1200)
    await bob.openConversation(0)
    await expect(bob.page.getByTestId('voice-note')).toHaveCount(1)

    // Reply to the note: the quote should describe it, not render blank.
    await bob.page.getByTestId('message-bubble').last().click({ button: 'right' })
    await bob.page.getByTestId('menu-reply').click()
    await expect(bob.page.getByTestId('reply-bar')).toContainText('Voice note')
    await bob.sendText('nice note')
    await expect(bob.bubbleWithText('nice note').getByTestId('reply-quote')).toContainText('Voice note')

    // Delete for everyone removes the audio on both sides.
    await alice.page.getByTestId('message-bubble').first().click({ button: 'right' })
    await alice.page.getByTestId('menu-delete-all').click()
    await expect(alice.page.getByTestId('voice-note')).toHaveCount(0)
    await expect(bob.page.getByTestId('voice-note')).toHaveCount(0)
  })

  test('recording is mutually exclusive with typing a message', async () => {
    const page = alice.page
    await page.getByTestId('record-btn').click()
    await expect(page.getByTestId('recording-indicator')).toBeVisible()

    // Attachment and emoji entry points are locked out mid-recording.
    await expect(page.getByTestId('emoji-btn')).toBeDisabled()
    await expect(page.getByTestId('attach-btn')).toBeDisabled()

    await page.getByTestId('cancel-recording').click()
    await expect(page.getByTestId('emoji-btn')).toBeEnabled()
  })

  test('a too-short tap is discarded instead of sending an empty file', async () => {
    const page = alice.page
    await page.getByTestId('record-btn').click()
    await page.getByTestId('record-btn').click() // immediate stop
    await page.waitForTimeout(1500)

    await expect(page.getByTestId('voice-note')).toHaveCount(0)
    await expect(page.getByTestId('composer-error')).toHaveCount(0)
  })
})
