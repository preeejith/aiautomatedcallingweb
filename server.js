/**
 * server.js — ElevenLabs + Twilio Outbound Call Backend
 * ─────────────────────────────────────────────────────
 * Run: node server.js
 * Requires: npm install express cors dotenv
 */

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'xi-api-key'],
  credentials: true
}));
app.use(express.json());   // Parse JSON body


// ── ENV VARIABLES (put these in your .env file) ──────────────────────────────
// ELEVENLABS_API_KEY        = xi_xxxxxxxxxxxxxxxxxxxxxxxx
// ELEVENLABS_AGENT_ID       = your_agent_id_from_elevenlabs_dashboard
// ELEVENLABS_PHONE_NUMBER_ID = the phone number ID from ElevenLabs > Phone Numbers tab
// PORT                      = 3000 (optional)
// ─────────────────────────────────────────────────────────────────────────────

const {
  ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID,
  ELEVENLABS_PHONE_NUMBER_ID,
  PORT = 3000,
} = process.env

// ── POST /initiate-call ───────────────────────────────────────────────────────
// Called by Vue component with { to_number, customer_name }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/initiate-call', async (req, res) => {
  const {
    to_number,
    customer_name,
    partner_name,
    location,
    service_name,
    service_details
  } = req.body

  // Basic validation
  if (!to_number || !customer_name) {
    return res.status(400).json({ error: 'to_number and customer_name are required.' })
  }
  if (!to_number.startsWith('+')) {
    return res.status(400).json({ error: 'Phone number must include country code, e.g. +91...' })
  }

  try {
    console.log(`\n🚀 INITIATING CALL:`);
    console.log(`   To: ${to_number}`);
    console.log(`   Agent ID: ${ELEVENLABS_AGENT_ID}`);
    console.log(`   Dynamic Variables:`, { customer_name, partner_name, location, service_name, service_details });

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

        // ── Forward all dynamic variables to ElevenLabs ──
        conversation_initiation_client_data: {
          dynamic_variables: {
            user_name: customer_name,   // maps to {{user_name}}
            partner_name: partner_name || '',
            location: location || '',
            service_name: service_name || '',
            service_details: service_details || '',
            phone_number: to_number,
          }
        }
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('ElevenLabs API error:', data)
      return res.status(response.status).json({
        error: data?.detail?.message || data?.message || 'ElevenLabs API call failed.',
        raw: data,
      })
    }

    // Success — send back conversation_id and callSid to Vue
    return res.json({
      success: true,
      message: `Call initiated to ${customer_name} at ${to_number}`,
      conversation_id: data.conversation_id || null,
      callSid: data.callSid || null,
    })

  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error.' })
  }
})

// ── GET /summary/:id ───────────────────────────────────────────────────────────
// Returns ONLY the 2-3 sentence summary for a specific conversation
// ─────────────────────────────────────────────────────────────────────────────
app.get('/summary/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${id}`, {
      method: 'GET',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch' });

    return res.json({
      summary: data.analysis?.transcript_summary || "Summary not generated yet.",
      analysis: data.analysis || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /transcript/:id ─────────────────────────────────────────────────────────
// Called by Vue component to get the conversation transcript
// ─────────────────────────────────────────────────────────────────────────────
app.get('/transcript/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'Conversation ID is required' })

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${id}`, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      }
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('ElevenLabs Transcript error:', data)
      return res.status(response.status).json({
        error: data?.detail?.message || data?.message || 'Failed to fetch transcript.',
      })
    }

    return res.json({
      transcript: data.transcript || [],
      metadata: data.conversation_initiation_client_data?.dynamic_variables || {},
      analysis: data.analysis || null
    })

  } catch (err) {
    console.error('Server error fetching transcript:', err)
    return res.status(500).json({ error: err.message || 'Internal server error.' })
  }
})

// ── GET /audio/:id ──────────────────────────────────────────────────────────────
// Get the audio recording of a conversation
// ─────────────────────────────────────────────────────────────────────────────
app.get('/audio/:id', async (req, res) => {
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

    // Proxy the audio content type
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');

    // Send array buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    console.error('Server error fetching audio:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// ── GET /conversations ─────────────────────────────────────────────────────────
// Get all recent conversations for the configured agent
// ─────────────────────────────────────────────────────────────────────────────
app.get('/conversations', async (req, res) => {
  try {
    const { page_size = 30, cursor } = req.query;
    let url = `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${ELEVENLABS_AGENT_ID}&page_size=${page_size}`;

    if (cursor) {
      url += `&start_after_id=${cursor}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.detail?.message || 'Failed to fetch conversations' })
    }

    // ElevenLabs returns { conversations: [...], has_more: true/false, last_conversation_id: "..." }
    return res.json(data)
  } catch (err) {
    console.error('Server error fetching conversations:', err)
    return res.status(500).json({ error: err.message || 'Internal server error.' })
  }
})

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`\n✅ ElevenLabs Call Server running on http://localhost:${PORT}`)
  console.log(`   POST http://localhost:${PORT}/initiate-call\n`)
})
