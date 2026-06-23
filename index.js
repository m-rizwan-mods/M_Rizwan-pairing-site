const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static('public')); 

app.get('/pair', async (req, res) => {
  const number = req.query.number;
  if (!number) return res.json({ code: "Number missing" });

  if (fs.existsSync('./session')) {
    fs.rmSync('./session', { recursive: true, force: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS("Desktop")
  });

  sock.ev.on('creds.update', saveCreds);

  try {
    await delay(1500);
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(number);
      res.json({ code: code?.match(/.{1,4}/g)?.join('-') || code }); 
    } else {
      res.json({ code: "Already Linked" });
    }
  } catch (e) {
    console.log(e);
    res.json({ code: "Service Unavailable" });
  } finally {
    setTimeout(() => sock.end(), 3000);
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));