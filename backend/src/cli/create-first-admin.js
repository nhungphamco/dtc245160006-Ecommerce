// Run manually only after explicit deployment/bootstrap approval. Never run at startup.
const readline = require('node:readline');
const readlinePromises = require('node:readline/promises');
const pool = require('../config/database');
const { createBootstrapService } = require('../services/bootstrap.service');

function secret(prompt) {
    return new Promise((resolve, reject) => {
        process.stdout.write(prompt);
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        let value = '';
        const cleanup = () => {
            process.stdin.off('keypress', onKey);
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write('\n');
        };
        const onKey = (character, key = {}) => {
            if (key.ctrl && key.name === 'c') { cleanup(); reject(new Error('Da huy bootstrap')); }
            else if (key.name === 'return' || key.name === 'enter') { cleanup(); resolve(value); }
            else if (key.name === 'backspace') { value = Array.from(value).slice(0, -1).join(''); }
            else if (key.ctrl && key.name === 'u') { value = ''; }
            else if (!key.ctrl && !key.meta && character && !/[\u0000-\u001f\u007f]/.test(character)) value += character;
        };
        process.stdin.on('keypress', onKey);
    });
}
async function main() {
    if (!process.stdin.isTTY || !process.stdout.isTTY || process.argv.length !== 2) throw new Error('Can terminal tuong tac, khong nhan mat khau qua tham so hoac pipe');
    const prompts = readlinePromises.createInterface({ input: process.stdin, output: process.stdout });
    let fullName, email, approval;
    try {
        fullName = await prompts.question('Ho ten Admin moi: ');
        email = await prompts.question('Email Admin moi: ');
        approval = await prompts.question('Nhap CREATE FIRST ADMIN de xac nhan: ');
    } finally { prompts.close(); }
    const password = await secret('Mat khau (khong hien thi): ');
    const confirmation = await secret('Nhap lai mat khau: ');
    const user = await createBootstrapService().createFirstAdmin({ fullName, email, password, confirmation, approval });
    console.log(`Da tao Admin #${user.id}. Dang nhap qua giao dien MiniShop; chua tao session tu dong.`);
}
if (require.main === module) {
    main().catch(error => {
        console.error(error.status || error.message.startsWith('Can terminal') || error.message === 'Da huy bootstrap' ? error.message : 'Bootstrap that bai. Kiem tra ket noi va cau hinh, khong cong khai credentials.');
        process.exitCode = 1;
    }).finally(() => pool.end());
}
module.exports = { secret };
