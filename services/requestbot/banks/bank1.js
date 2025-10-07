const fs = require('fs');
const path = require('path');

const COOKIES_PATH = path.join(__dirname, '../../../.data/bank1-cookies.json');

async function login(page) {
    const username = process.env.BANK1_USER;
    const password = process.env.BANK1_PASS;

    if (!username || !password) {
        throw new Error('BANK1_USER and BANK1_PASS environment variables are required');
    }

    // Try to load existing cookies
    try {
        if (fs.existsSync(COOKIES_PATH)) {
            const cookiesJson = fs.readFileSync(COOKIES_PATH, 'utf8');
            const cookies = JSON.parse(cookiesJson);
            await page.context().addCookies(cookies);
        }
    } catch (error) {
        console.log('Could not load existing cookies:', error.message);
    }

    // Debug screenshot after loading cookies
    console.log('Taking screenshot after loading cookies...');
    await page.screenshot({ path: 'debug-1-before-login.png' });

    // TODO: Navigate to bank login page
    console.log('Navigating to bank login page...');

    // TODO: Fill in username field with selector
    console.log('Filling username field...');

    // TODO: Fill in password field with selector
    console.log('Filling password field...');

    // Debug screenshot after filling fields
    console.log('Taking screenshot after filling username and password...');
    await page.screenshot({ path: 'debug-2-filled-fields.png' });

    // TODO: Click login button with selector
    console.log('Clicking login button...');

    // Debug screenshot after clicking login
    console.log('Taking screenshot after clicking login button...');
    await page.screenshot({ path: 'debug-3-after-click.png' });

    // TODO: Wait for successful login indicator
    console.log('Waiting for successful login indicator...');

    // Save cookies after successful login
    try {
        const cookies = await page.context().cookies();
        const cookiesDir = path.dirname(COOKIES_PATH);
        if (!fs.existsSync(cookiesDir)) {
            fs.mkdirSync(cookiesDir, { recursive: true });
        }
        fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    } catch (error) {
        console.log('Could not save cookies:', error.message);
    }

    await page.screenshot({ path: 'debug-after-login.png' });
}

async function addRecipient(page, email) {
    // Wait for network idle state after navigation
    await page.waitForLoadState('networkidle');

    // Debug screenshot to see what page we're actually on
    await page.screenshot({ path: 'debug-before-add-recipient.png' });

    // Wait for the add recipient button to be visible
    await page.waitForSelector('#MainContent_TransactionMainContent_txpTransactions_ctl01_flwData_btnAddContact', { timeout: 10000 });

    // Click the add new recipient button
    await page.click('#MainContent_TransactionMainContent_txpTransactions_ctl01_flwData_btnAddContact');

    // Fill recipient name field with the email address as the name
    await page.fill('#MainContent_TransactionMainContent_txpTransactions_ctl01_contactForm_txtContactName_txField', email);

    // Fill recipient email field with the email
    await page.fill('#MainContent_TransactionMainContent_txpTransactions_ctl01_contactForm_flwTransferMethods_txtEmail_txField', email);

    // Click continue button
    await page.click('#MainContent_TransactionMainContent_txpTransactions_btnNextFlowItem');

    // Wait for confirmation or navigation
    await page.waitForTimeout(2000);
}

async function requestMoney(page, { payerHandle, amountCents, reference }) {
    // Navigate to Interac Request Money page using menu clicks
    // Click the parent Interac e-Transfers menu
    await page.click('#Container2_transactionMenus_top_topS_9_aMG_0');

    // Wait 1 second for dropdown to appear
    await page.waitForTimeout(1000);

    // Click Request e-Transfer
    await page.click('#Container2_transactionMenus_top_topS_9_topSI_0_aSMG_1');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Try to add recipient, continue if recipient already exists
    try {
        await addRecipient(page, payerHandle);
    } catch (error) {
        console.log('Could not add recipient (may already exist):', error.message);
    }

    // TODO: Fill in recipient email field with payerHandle

    // Convert cents to CAD format
    const amountCAD = (amountCents / 100).toFixed(2);
    // TODO: Fill in amount field with amountCAD

    // TODO: Fill in memo field with reference

    // TODO: Submit the form

    // TODO: Wait for confirmation and extract request reference
    const requestRef = 'TODO_EXTRACT_REQUEST_REF';

    return { requestRef };
}

module.exports = {
    login,
    requestMoney,
    addRecipient
};