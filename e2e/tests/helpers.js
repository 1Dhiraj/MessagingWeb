const { expect } = require('@playwright/test')

/**
 * Drives one chat client: a browser context + page with its own localStorage,
 * standing in for a separate user/device.
 */
class ChatUser {
  constructor(page, id, name) {
    this.page = page
    this.id = id
    this.name = name
  }

  static async create(browser, { id, name, contextOptions = {} } = {}) {
    const context = await browser.newContext({
      permissions: ['microphone'],
      ...contextOptions,
    })

    // Instrument getUserMedia so tests can assert the microphone is actually
    // released — a leaked live track is invisible in the DOM.
    await context.addInitScript(() => {
      window.__liveAudioTracks = 0
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await original(constraints)
        stream.getAudioTracks().forEach(track => {
          window.__liveAudioTracks += 1
          const stop = track.stop.bind(track)
          let stopped = false
          track.stop = () => {
            if (!stopped) { stopped = true; window.__liveAudioTracks -= 1 }
            stop()
          }
        })
        return stream
      }
    })

    const page = await context.newPage()

    // Surface app-side crashes as test failures instead of silent breakage.
    page.on('pageerror', err => {
      console.error(`[pageerror:${name}]`, err.message)
      page.__pageErrors = page.__pageErrors || []
      page.__pageErrors.push(err.message)
    })

    const user = new ChatUser(page, id, name)
    await user.login()
    return user
  }

  async login() {
    await this.page.goto('/')
    // Seed the ID directly so every test starts from a known identity.
    await this.page.evaluate(id => {
      localStorage.setItem('whatsapp-clone-id', JSON.stringify(id))
    }, this.id)
    await this.page.reload()
    await expect(this.page.getByTestId('new-btn')).toBeVisible()
  }

  /** Add `other` to this user's contact list. */
  async addContact(other) {
    await this.page.getByTestId('tab-contacts').click()
    await this.page.getByTestId('new-btn').click()
    await this.page.getByTestId('contact-id-input').fill(other.id)
    await this.page.getByTestId('contact-name-input').fill(other.name)
    await this.page.getByTestId('create-contact-btn').click()
    await expect(this.page.getByTestId('contact-item').filter({ hasText: other.name })).toBeVisible()
  }

  /** Create (and open) a 1:1 conversation with an already-added contact. */
  async startConversationWith(other) {
    await this.page.getByTestId('tab-conversations').click()
    await this.page.getByTestId('new-btn').click()
    await this.page.getByRole('checkbox', { name: other.name }).check()
    await this.page.getByTestId('create-conversation-btn').click()
    await expect(this.page.getByTestId('message-input')).toBeVisible()
  }

  async openConversation(index = 0) {
    await this.page.getByTestId('tab-conversations').click()
    await this.page.getByTestId('conversation-item').nth(index).click()
    await expect(this.page.getByTestId('message-input')).toBeVisible()
  }

  async sendText(text) {
    await this.page.getByTestId('message-input').fill(text)
    await this.page.getByTestId('send-btn').click()
    await expect(this.page.getByTestId('message-input')).toHaveValue('')
  }

  /** All rendered message bubbles, oldest first. */
  bubbles() {
    return this.page.getByTestId('message-bubble')
  }

  bubbleWithText(text) {
    return this.page.getByTestId('message-bubble').filter({ hasText: text })
  }

  /** Open the per-message menu (right click on desktop). */
  async openMessageMenu(text) {
    await this.bubbleWithText(text).first().click({ button: 'right' })
    await expect(this.page.getByTestId('context-menu')).toBeVisible()
  }

  async close() {
    await this.page.context().close()
  }

  get pageErrors() {
    return this.page.__pageErrors || []
  }
}

/**
 * On mobile the chat and sidebar are fixed panels that slide in over 280ms.
 * `toBeVisible()` is satisfied by an off-screen translated panel, so wait for
 * the chat panel to actually settle at x=0 before measuring anything in it.
 */
async function waitForChatPanel(page) {
  await expect
    .poll(async () => {
      const box = await page.locator('.conversation-panel').boundingBox()
      return box ? Math.round(box.x) : null
    }, { timeout: 10_000 })
    .toBe(0)
}

/** Unique ids per run so leftover state can never leak between tests. */
function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Record a voice note for roughly `ms` milliseconds and send it.
 * Returns once the composer is idle again.
 */
async function recordVoiceNote(user, ms = 1200) {
  const page = user.page
  await page.getByTestId('record-btn').click()
  await expect(page.getByTestId('recording-indicator')).toBeVisible()
  await page.waitForTimeout(ms)
  await page.getByTestId('record-btn').click()
  await expect(page.getByTestId('recording-indicator')).toBeHidden()
  await expect(page.getByTestId('uploading-bar')).toBeHidden({ timeout: 30_000 })
}

module.exports = { ChatUser, uid, recordVoiceNote, waitForChatPanel }
