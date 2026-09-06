const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>FAMOUS BATMAN BOT</title></head>
        <body style="background: #111; color: #fff; font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h1>FAMOUS BATMAN BOT PAIRING</h1>
            <form action="/pair" method="POST">
                <input type="text" name="phone" placeholder="Enter WhatsApp Number (e.g. 923xxxxxxxx)" style="padding: 10px; width: 300px;" required><br><br>
                <button type="submit" style="padding: 10px 20px; background: gold; border: none; font-weight: bold; cursor: pointer;">Get Pairing Code</button>
            </form>
        </body>
        </html>
    `);
});

app.post('/pair', async (req, res) => {
    const phoneNumber = req.body.phone;
    if (!phoneNumber) return res.send("Phone number is required!");

    const sessionDir = './auth_info_baileys';
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    try {
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' })
        });

        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                res.send(`
                    <body style="background: #111; color: #fff; font-family: sans-serif; text-align: center; padding-top: 50px;">
                        <h2>Your Pairing Code:</h2>
                        <h1 style="color: gold; font-size: 50px;">${code}</h1>
                        <p>Go to WhatsApp -> Linked Devices -> Link with phone number instead.</p>
                    </body>
                `);
            }, 3000);
        } else {
            res.send("Already connected!");
        }
    } catch (err) {
        res.send("Error generating code: " + err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
