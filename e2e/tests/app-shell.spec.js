const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { ChatUser, uid } = require('./helpers')

test.describe('Login and identity', () => {
  test('creating a new ID logs you straight in and persists', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('login-id-input')).toBeVisible()

    await page.getByTestId('create-id-btn').click()
    await expect(page.getByTestId('new-btn')).toBeVisible()

    const stored = await page.evaluate(() => localStorage.getItem('whatsapp-clone-id'))
    expect(stored).toBeTruthy()

    // Survives a reload.
    await page.reload()
    await expect(page.getByTestId('new-btn')).toBeVisible()
  })

  test('logging in with an existing ID works and whitespace is trimmed', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('login-id-input').fill('  my-custom-id  ')
    await page.getByTestId('login-btn').click()

    await expect(page.getByTestId('new-btn')).toBeVisible()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('whatsapp-clone-id')))
    expect(stored).toBe('my-custom-id')
  })

  test('corrupted localStorage does not white-screen the app', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('whatsapp-clone-id', JSON.stringify('recover-me'))
      localStorage.setItem('whatsapp-clone-conversations', 'undefined')
      localStorage.setItem('whatsapp-clone-contacts', '{not json')
    })
    await page.reload()
    await expect(page.getByTestId('new-btn')).toBeVisible()
  })

  test('logout clears app storage and returns to login', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('create-id-btn').click()
    await expect(page.getByTestId('new-btn')).toBeVisible()

    page.on('dialog', d => d.accept())
    await page.getByTitle('Log out').click()

    await expect(page.getByTestId('login-id-input')).toBeVisible()
    const leftover = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => k.startsWith('whatsapp-clone-')))
    expect(leftover).toEqual([])
  })
})

test.describe('Contacts and conversations', () => {
  let alice, bob

  test.beforeEach(async ({ browser }) => {
    alice = await ChatUser.create(browser, { id: uid('alice'), name: 'Alice' })
    bob = await ChatUser.create(browser, { id: uid('bob'), name: 'Bob' })
  })

  test.afterEach(async () => {
    await alice.close()
    await bob.close()
  })

  test('adding your own ID as a contact is rejected', async () => {
    const page = alice.page
    await page.getByTestId('tab-contacts').click()
    await page.getByTestId('new-btn').click()
    await page.getByTestId('contact-id-input').fill(alice.id)
    await page.getByTestId('contact-name-input').fill('Me')
    await page.getByTestId('create-contact-btn').click()

    await expect(page.getByTestId('contact-error')).toContainText("your own ID")
    await expect(page.getByTestId('contact-item')).toHaveCount(0)
  })

  test('duplicate contacts are rejected', async () => {
    await alice.addContact(bob)

    const page = alice.page
    await page.getByTestId('new-btn').click()
    await page.getByTestId('contact-id-input').fill(bob.id)
    await page.getByTestId('contact-name-input').fill('Bob again')
    await page.getByTestId('create-contact-btn').click()

    await expect(page.getByTestId('contact-error')).toContainText('already exists')
    await expect(page.getByTestId('contact-item')).toHaveCount(1)
  })

  test('a conversation cannot be created with nothing selected', async () => {
    await alice.addContact(bob)

    const page = alice.page
    await page.getByTestId('tab-conversations').click()
    await page.getByTestId('new-btn').click()
    await page.getByTestId('create-conversation-btn').click()

    await expect(page.getByTestId('conversation-error')).toContainText('at least one contact')
    // No blank row was created.
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('conversation-item')).toHaveCount(0)
  })

  test('creating the same conversation twice reuses the existing one', async () => {
    await alice.addContact(bob)
    await alice.startConversationWith(bob)
    await alice.page.getByTestId('tab-conversations').click()
    await expect(alice.page.getByTestId('conversation-item')).toHaveCount(1)

    await alice.startConversationWith(bob)
    await alice.page.getByTestId('tab-conversations').click()
    await expect(alice.page.getByTestId('conversation-item')).toHaveCount(1)
  })

  test('contact search filters the list', async () => {
    await alice.addContact(bob)
    await alice.addContact({ id: uid('carol'), name: 'Carol' })

    const page = alice.page
    await page.getByTestId('tab-contacts').click()
    await expect(page.getByTestId('contact-item')).toHaveCount(2)

    await page.getByPlaceholder('Search or start new chat').fill('carol')
    await expect(page.getByTestId('contact-item')).toHaveCount(1)
    await expect(page.getByTestId('contact-item').first()).toContainText('Carol')
  })
})

test.describe('Appearance', () => {
  let alice, bob

  test.beforeEach(async ({ browser }) => {
    alice = await ChatUser.create(browser, { id: uid('alice'), name: 'Alice' })
    bob = await ChatUser.create(browser, { id: uid('bob'), name: 'Bob' })
    await alice.addContact(bob)
    await alice.startConversationWith(bob)
  })

  test.afterEach(async () => {
    await alice.close()
    await bob.close()
  })

  test('dark mode applies everywhere and survives a reload', async () => {
    const page = alice.page
    await page.getByTestId('theme-toggle').click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // The dashboard shell used to stay cream because it hard-coded #efeae2.
    const shellBg = await page.locator('.dashboard-wrapper').evaluate(
      el => getComputedStyle(el).backgroundColor)
    expect(shellBg).not.toBe('rgb(239, 234, 226)')

    const sidebarBg = await page.locator('.sidebar-panel').evaluate(
      el => getComputedStyle(el).backgroundColor)
    expect(sidebarBg).not.toBe('rgb(255, 255, 255)')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('chat wallpaper can be changed and persists', async () => {
    const page = alice.page
    await page.getByTitle('Change wallpaper').click()

    const ocean = page.getByTitle('Ocean')
    await expect(ocean).toBeVisible()
    await ocean.click()
    // Picker closes on selection — proof the click was handled.
    await expect(ocean).toBeHidden()

    const container = page.getByTestId('messages-container')
    await expect(container).toHaveCSS('background-image', /linear-gradient/)

    await page.reload()
    await page.getByTestId('conversation-item').first().click()
    await expect(page.getByTestId('messages-container')).toHaveCSS('background-image', /linear-gradient/)
  })
})

test.describe('File attachments', () => {
  let alice, bob, tmpImage

  test.beforeAll(() => {
    // 1x1 transparent PNG.
    tmpImage = path.join(os.tmpdir(), `wa-clone-test-${Date.now()}.png`)
    fs.writeFileSync(tmpImage, Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'))
  })

  test.afterAll(() => {
    if (fs.existsSync(tmpImage)) fs.unlinkSync(tmpImage)
  })

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

  test('an image sends with a caption and arrives for the recipient', async () => {
    const page = alice.page
    await page.locator('input[type="file"]').setInputFiles(tmpImage)

    await expect(page.getByTestId('caption-input')).toBeVisible()
    await page.getByTestId('caption-input').fill('look at this')
    await page.getByTestId('preview-send').click()

    await expect(page.getByTestId('media-image')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('message-text')).toContainText('look at this')

    await bob.openConversation(0)
    await expect(bob.page.getByTestId('media-image')).toBeVisible()

    // The image resolves — a broken URL would leave naturalWidth at 0.
    const width = await bob.page.getByTestId('media-image').evaluate(img => img.naturalWidth)
    expect(width).toBeGreaterThan(0)
  })

  test('the upload server reports its storage mode', async ({ request }) => {
    const res = await request.get('http://localhost:5000/health')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
