const { chromium } = require('playwright');
const bank1 = require('./banks/bank1');
const bank2 = require('./banks/bank2');

async function submitInstruction(instruction) {
    let browser;

    try {
        browser = await chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        let bankDriver;
        if (instruction.bank_slug === 'bank1') {
            bankDriver = bank1;
        } else if (instruction.bank_slug === 'bank2') {
            bankDriver = bank2;
        } else {
            throw new Error(`Unsupported bank_slug: ${instruction.bank_slug}`);
        }

        await bankDriver.login(page);

        const result = await bankDriver.requestMoney(page, instruction);

        return {
            ok: true,
            requestRef: result.requestRef
        };

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    submitInstruction
};