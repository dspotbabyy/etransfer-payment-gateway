const fs = require('fs');
const path = require('path');

const COOKIES_PATH = path.join(__dirname, '../../../.data/bank2-cookies.json');

async function login(page) {
    const username = process.env.BANK2_USER;
    const password = process.env.BANK2_PASS;

    if (!username || !password) {
        throw new Error('BANK2_USER and BANK2_PASS environment variables are required');
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

    // TODO: Navigate to bank login page
    // TODO: Fill in username field with selector
    // TODO: Fill in password field with selector
    // TODO: Click login button with selector
    // TODO: Wait for successful login indicator

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
}

async function requestMoney(page, { payerHandle, amountCents, reference }) {
    // TODO: Navigate to Interac Request Money page

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
    requestMoney
};