const { test, expect } = require('@playwright/test')
const { ChatUser, uid, recordVoiceNote, waitForChatPanel } = require('./helpers')

/*
 * Runs under the Pixel 7 project: touch enabled, mobile viewport and UA.
 */
test.describe('Mobile layout and interactions', () => {
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

  // The sidebar is translated off-screen when hidden, so its x offset is the
  // most reliable signal of which panel is showing.
  async function sidebarX(page) {
    const box = await page.locator('.sidebar-panel').boundingBox()
    return box ? box.x : null
  }

  test('the back button returns to the conversation list and stays there', async () => {
    const page = alice.page
    await alice.sendText('hello mobile')

    const backBtn = page.locator('.mobile-back-btn')
    await expect(backBtn).toBeVisible()
    await backBtn.tap()

    await expect.poll(() => sidebarX(page)).toBe(0)

    // Regression guard: the view used to snap straight back to the chat on the
    // next render (socket event, keystroke, anything), because the effect
    // depended on an object rebuilt every render. Force plenty of re-renders.
    await bob.openConversation(0)
    await bob.sendText('ping 1')
    await bob.sendText('ping 2')
    await bob.sendText('ping 3')
    await page.waitForTimeout(1500)

    expect(await sidebarX(page)).toBe(0)
    await expect(page.getByTestId('conversation-item').first()).toBeVisible()
  })

  test('tapping a conversation opens the chat panel', async () => {
    const page = alice.page
    await page.locator('.mobile-back-btn').tap()
    await expect.poll(() => sidebarX(page)).toBe(0)

    await page.getByTestId('conversation-item').first().tap()
    await expect(page.getByTestId('message-input')).toBeVisible()
    await expect.poll(() => sidebarX(page)).toBeLessThan(0)
  })

  test('long press opens the message menu on touch', async () => {
    await alice.sendText('long press me')
    const bubble = alice.bubbleWithText('long press me').first()

    // A real long press: touchstart, hold past the 500ms threshold, release.
    await bubble.evaluate(el => {
      const r = el.getBoundingClientRect()
      const touch = new Touch({
        identifier: 1, target: el,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      })
      el.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touch], targetTouches: [touch], changedTouches: [touch],
        bubbles: true, cancelable: true,
      }))
    })

    await expect(alice.page.getByTestId('context-menu')).toBeVisible({ timeout: 5000 })
  })

  test('the context menu stays inside the viewport', async () => {
    await waitForChatPanel(alice.page)
    await alice.sendText('edge case')
    const viewport = alice.page.viewportSize()

    // Open it near the bubble's bottom-right, close to the screen edge. Stay a
    // few pixels inside so the click is not captured by the row wrapper.
    const bubble = alice.bubbleWithText('edge case').first()
    const box = await bubble.boundingBox()
    await bubble.click({
      button: 'right',
      position: { x: Math.max(4, box.width - 6), y: Math.max(4, box.height - 6) },
    })

    const menu = alice.page.getByTestId('context-menu')
    await expect(menu).toBeVisible()

    const menuBox = await menu.boundingBox()
    expect(menuBox.x).toBeGreaterThanOrEqual(0)
    expect(menuBox.y).toBeGreaterThanOrEqual(0)
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width + 1)
    expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height + 1)
  })

  test('the composer does not overflow the screen', async () => {
    const page = alice.page
    const viewport = page.viewportSize()
    await waitForChatPanel(page)

    const inputBox = await page.getByTestId('message-input').boundingBox()
    expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(viewport.width + 1)

    const recordBox = await page.getByTestId('record-btn').boundingBox()
    expect(recordBox.x + recordBox.width).toBeLessThanOrEqual(viewport.width + 1)

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('voice notes record and send on mobile with a single tap', async () => {
    await recordVoiceNote(alice, 1400)
    await expect(alice.page.getByTestId('voice-note')).toHaveCount(1)

    // Touch devices fire touchstart *and* a synthetic mousedown; the old
    // press-and-hold handler started two recorders and leaked the first mic
    // stream. Zero live tracks means exactly one recorder, cleanly stopped.
    const tracks = await alice.page.evaluate(() => window.__liveAudioTracks)
    expect(tracks).toBe(0)
  })

  test('the voice note player fits inside its bubble', async () => {
    await recordVoiceNote(alice, 1200)
    const viewport = alice.page.viewportSize()

    const player = alice.page.getByTestId('voice-note')
    const bubble = alice.page.getByTestId('message-bubble').last()

    const pb = await player.boundingBox()
    const bb = await bubble.boundingBox()
    expect(pb.x + pb.width).toBeLessThanOrEqual(bb.x + bb.width + 1)
    expect(bb.x + bb.width).toBeLessThanOrEqual(viewport.width + 1)
  })

  test('received messages render correctly on mobile', async () => {
    await alice.sendText('from alice')
    await bob.openConversation(0)
    await expect(bob.bubbleWithText('from alice')).toBeVisible()

    await bob.sendText('from bob')
    await expect(alice.bubbleWithText('from bob')).toBeVisible()
  })
})
