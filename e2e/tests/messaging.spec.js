const { test, expect } = require('@playwright/test')
const { ChatUser, uid } = require('./helpers')

test.describe('Core messaging', () => {
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

  test('a text message reaches the other user', async () => {
    await alice.sendText('Hello from Alice')

    await expect(alice.bubbleWithText('Hello from Alice')).toBeVisible()

    // Bob receives it without having created the conversation himself.
    await bob.openConversation(0)
    await expect(bob.bubbleWithText('Hello from Alice')).toBeVisible()

    // And the reply comes back.
    await bob.sendText('Hi Alice!')
    await expect(alice.bubbleWithText('Hi Alice!')).toBeVisible()
  })

  test('message text is encrypted on the wire', async () => {
    const frames = []
    // Capture what actually arrives over Bob's socket. `page.on('websocket')`
    // only sees sockets opened after it is attached, so reload to force a
    // fresh connection under observation.
    bob.page.on('websocket', ws => {
      ws.on('framereceived', f => frames.push(String(f.payload)))
      ws.on('framesent', f => frames.push(String(f.payload)))
    })
    await bob.page.reload()
    await expect(bob.page.getByTestId('new-btn')).toBeVisible()

    const secret = 'topsecret-plaintext-9f3a'
    await alice.sendText(secret)
    await bob.openConversation(0)
    await expect(bob.bubbleWithText(secret)).toBeVisible()

    // Bob decrypted and rendered it, but the raw frames never carried it.
    expect(frames.length).toBeGreaterThan(0)
    expect(frames.some(f => f.includes(secret))).toBe(false)
  })

  test('unread badge appears then clears on open', async () => {
    await alice.sendText('badge me')

    const badge = bob.page.getByTestId('conversation-item').first()
    await expect(badge).toContainText('1')

    await bob.openConversation(0)
    await bob.page.getByTestId('tab-conversations').click()
    await expect(bob.page.getByTestId('conversation-item').first()).not.toContainText('badge me1')
  })

  test('read receipts turn the tick blue', async () => {
    await alice.sendText('did you read this')

    const tick = alice.bubbleWithText('did you read this').locator('svg[width="16"]')
    await expect(tick).toHaveCount(0) // single grey tick so far

    await bob.openConversation(0)

    // Double blue tick renders as the 16px-wide SVG.
    await expect(tick).toHaveCount(1)
  })

  test('typing indicator shows on the other side', async () => {
    // Bob needs the conversation to exist before he can have it open.
    await alice.sendText('start')
    await bob.openConversation(0)

    await alice.page.getByTestId('message-input').pressSequentially('composing…', { delay: 60 })

    // Shown in both the chat header and the sidebar row — assert on the header.
    await expect(bob.page.getByText('typing...').first()).toBeVisible()
  })

  test('reply quotes the original message', async () => {
    await alice.sendText('original message')
    await bob.openConversation(0)

    await bob.openMessageMenu('original message')
    await bob.page.getByTestId('menu-reply').click()
    await expect(bob.page.getByTestId('reply-bar')).toContainText('original message')

    await bob.sendText('my reply')

    const replyBubble = bob.bubbleWithText('my reply')
    await expect(replyBubble.getByTestId('reply-quote')).toContainText('original message')

    // Alice sees the same quote — the reply text survives the encrypt/decrypt round trip.
    const onAlice = alice.bubbleWithText('my reply')
    await expect(onAlice.getByTestId('reply-quote')).toContainText('original message')
  })

  test('editing a message updates it for both users', async () => {
    await alice.sendText('typo herr')
    await bob.openConversation(0)
    await expect(bob.bubbleWithText('typo herr')).toBeVisible()

    await alice.openMessageMenu('typo herr')
    await alice.page.getByTestId('menu-edit').click()
    await alice.page.getByTestId('message-input').fill('typo fixed')
    await alice.page.getByTestId('send-btn').click()

    await expect(alice.bubbleWithText('typo fixed')).toContainText('(edited)')
    await expect(bob.bubbleWithText('typo fixed')).toContainText('(edited)')

    // No crash — this path used to throw "editMessage is not a function".
    expect(alice.pageErrors).toEqual([])
  })

  test('delete for everyone tombstones the message on both sides', async () => {
    await alice.sendText('oops wrong chat')
    await bob.openConversation(0)
    await expect(bob.bubbleWithText('oops wrong chat')).toBeVisible()

    await alice.openMessageMenu('oops wrong chat')
    await alice.page.getByTestId('menu-delete-all').click()

    await expect(alice.page.getByTestId('deleted-message')).toBeVisible()
    await expect(bob.page.getByTestId('deleted-message')).toBeVisible()
  })

  test('delete for me removes it locally only', async () => {
    await alice.sendText('only i lose this')
    await bob.openConversation(0)
    await expect(bob.bubbleWithText('only i lose this')).toBeVisible()

    await alice.openMessageMenu('only i lose this')
    await alice.page.getByTestId('menu-delete-me').click()

    await expect(alice.bubbleWithText('only i lose this')).toHaveCount(0)
    await expect(bob.bubbleWithText('only i lose this')).toBeVisible()
  })

  test('reactions sync to the other user', async () => {
    await alice.sendText('react to me')
    await bob.openConversation(0)

    await bob.openMessageMenu('react to me')
    await bob.page.getByTestId('react-❤️').click()

    await expect(bob.bubbleWithText('react to me')).toContainText('❤️')
    await expect(alice.bubbleWithText('react to me')).toContainText('❤️')
  })

  test('in-chat search filters the message list', async () => {
    await alice.sendText('apples')
    await alice.sendText('bananas')
    await alice.sendText('cherries')
    await expect(alice.bubbles()).toHaveCount(3)

    await alice.page.getByTitle('Search messages').click()
    await alice.page.getByPlaceholder('Search messages...').fill('banana')

    await expect(alice.bubbles()).toHaveCount(1)
    await expect(alice.bubbles().first()).toContainText('bananas')
  })

  test('emoji picker inserts into the composer', async () => {
    await alice.page.getByTestId('emoji-btn').click()
    await alice.page.getByRole('button', { name: '😂' }).first().click()
    await expect(alice.page.getByTestId('message-input')).toHaveValue('😂')
  })

  test('online presence is reflected in the header', async () => {
    // Bob is connected, so Alice's chat header should say so straight away.
    await expect(alice.page.getByText('online', { exact: true })).toBeVisible()

    // And it clears when he disconnects.
    await bob.close()
    await expect(alice.page.getByText('online', { exact: true })).toBeHidden()
  })
})
