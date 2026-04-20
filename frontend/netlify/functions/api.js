const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'xi-api-key'],
  credentials: true
}));
app.use(express.json());


const {
  ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID,
  ELEVENLABS_PHONE_NUMBER_ID,
} = process.env;

const router = express.Router();

router.post('/initiate-call', async (req, res) => {
  const { to_number, customer_name, partner_name, location, service_name, service_details } = req.body;

  // Basic validation
  if (!to_number || !customer_name) {
    return res.status(400).json({ error: 'to_number and customer_name are required.' });
  }

  try {
    console.log(`[Netlify Function] Agent ID: ${ELEVENLABS_AGENT_ID}`);
    const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        agent_id: ELEVENLABS_AGENT_ID,
        agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
        to_number: to_number,
        conversation_initiation_client_data: {
          dynamic_variables: {
            user_name: customer_name,
            partner_name: partner_name || '',
            location: location || '',
            service_name: service_name || '',
            service_details: service_details || '',
            phone_number: to_number,
          }
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('ElevenLabs API error:', data);
      return res.status(response.status).json({
        error: data?.detail?.message || data?.message || 'ElevenLabs API call failed.',
        raw: data,
      });
    }

    return res.json({
      success: true,
      message: `Call initiated to ${customer_name}`,
      conversation_id: data.conversation_id || null,
      callSid: data.callSid || null,
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

router.get('/transcript/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Conversation ID is required' });

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${id}`, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.detail?.message || data?.message || 'Failed to fetch transcript.',
      });
    }

    return res.json({
      transcript: data.transcript || [],
      metadata: data.conversation_initiation_client_data?.dynamic_variables || {}
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

router.get('/audio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Conversation ID is required' });

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${id}/audio`, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).send(errorData);
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${ELEVENLABS_AGENT_ID}`, {
      method: 'GET',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.detail?.message || 'Failed to fetch conversations' });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

router.get('/health', (_, res) => res.json({ status: 'ok' }));

// Mount the router on both /api and /.netlify/functions/api to handle Netlify's routing quirks
app.use('/api', router);
app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app, {
  binary: ['audio/*', 'audio/mpeg']
});
