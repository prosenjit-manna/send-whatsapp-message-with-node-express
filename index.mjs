import express from 'express';
import qrcode from 'qrcode-terminal';
import whatsapp from 'whatsapp-web.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const { Client, LocalAuth } = whatsapp;

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const allowedGroups = process.env.ALLOWED_GROUPS ? process.env.ALLOWED_GROUPS.split(',') : [];
const hangoutsWebhookUrl = process.env.HANGOUTS_WEBHOOK_URL;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox'],
  },
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Scan the QR code above to authenticate.');
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
});

app.get('/', async (req, res) => {
  res.send('WhatsApp Web.js server is running!');
});

app.post('/send-message', async (req, res) => {
  console.log('Request body:', req.body); // Debugging log

  const { groupName, message } = req.body || {}; // Fallback to handle undefined req.body

  if (!groupName || !message) {
    return res.status(400).json({ error: 'Missing groupName or message in request body.' });
  }

  if (!allowedGroups.includes(groupName)) {
    return res.status(403).json({ error: `Forbidden: Group "${groupName}" is not allowed.` });
  }

  try {
    const chats = await client.getChats();
    const group = chats.find((chat) => chat.isGroup && chat.name === groupName);

    if (!group) {
      return res.status(404).json({ error: `Group "${groupName}" not found.` });
    }

    await client.sendMessage(group.id._serialized, message);

      const { message } = req.body || {}; // Fallback to handle undefined req.body

    if (!message) {
        return res.status(400).json({ error: 'Missing message in request body.' });
    }

    if (!hangoutsWebhookUrl) {
        return res.status(500).json({ error: 'Hangouts webhook URL is not configured.' });
    }

    try {
        const response = await fetch(hangoutsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
        });

        if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
        }

        res.status(200).json({ status: 'Message sent successfully to Hangouts group.' });
    } catch (error) {
        console.error('Error sending message to Hangouts:', error);
        res.status(500).json({ error: 'Failed to send message to Hangouts group.' });
    }

    res.status(200).json({ status: 'Message sent successfully.' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

client.initialize();
