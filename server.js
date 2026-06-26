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

// Helper to initiate Twilio outbound calls via ElevenLabs API
async function triggerOutboundCall({
  agent_id,
  to_number,
  customer_name,
  dynamic_variables = {}
}) {
  if (!to_number) {
    throw new Error('to_number is required.')
  }
  if (!to_number.startsWith('+')) {
    throw new Error('Phone number must include country code, e.g. +91...')
  }

  // Fallback if name is empty, missing, or null
  const finalCustomerName = (customer_name && customer_name.trim()) ? customer_name.trim() : 'Partner';

  const selectedAgentId = agent_id || ELEVENLABS_AGENT_ID;

  console.log(`\n🚀 INITIATING OUTBOUND CALL:`);
  console.log(`   To: ${to_number}`);
  console.log(`   Agent ID: ${selectedAgentId}`);
  console.log(`   Dynamic Variables:`, {
    ...dynamic_variables,
    user_name: finalCustomerName,
    name: finalCustomerName,
    customer_name: finalCustomerName,
    customerName: finalCustomerName,
    client_name: finalCustomerName,
    clientName: finalCustomerName,
    first_name: finalCustomerName,
    firstName: finalCustomerName,
    user_name_there: finalCustomerName
  });

  const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      agent_id: selectedAgentId,
      agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
      to_number: to_number,
      conversation_initiation_client_data: {
        dynamic_variables: {
          user_name: finalCustomerName,
          name: finalCustomerName,
          customer_name: finalCustomerName,
          customerName: finalCustomerName,
          client_name: finalCustomerName,
          clientName: finalCustomerName,
          first_name: finalCustomerName,
          firstName: finalCustomerName,
          user_name_there: finalCustomerName, // fallback for ElevenLabs syntax
          phone_number: to_number,
          ...dynamic_variables
        }
      }
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('ElevenLabs API error:', data)
    throw new Error(data?.detail?.message || data?.message || 'ElevenLabs API call failed.')
  }

  return {
    success: true,
    message: `Call initiated to ${finalCustomerName} at ${to_number}`,
    conversation_id: data.conversation_id || null,
    callSid: data.callSid || null,
  }
}

// ── POST /initiate-call ───────────────────────────────────────────────────────
// Called by Vue component with { to_number, customer_name }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/initiate-call', async (req, res) => {
  try {
    const {
      to_number,
      customer_name,
      agent_id,
      email,
      registration_pending,
      remaining_data,
      partner_name,
      location,
      service_name,
      service_details
    } = req.body

    const result = await triggerOutboundCall({
      agent_id,
      to_number,
      customer_name,
      dynamic_variables: {
        email: email || '',
        registration_pending: registration_pending !== undefined ? String(registration_pending) : 'true',
        remaining_data: remaining_data || '',
        partner_name: partner_name || '',
        location: location || '',
        service_name: service_name || '',
        service_details: service_details || '',
      }
    })

    return res.json(result)
  } catch (err) {
    console.error('Outbound call error:', err)
    return res.status(400).json({ error: err.message })
  }
})

// ── POST /initiate-booking ────────────────────────────────────────────────────
// Specific Service Booking Trigger API
// ─────────────────────────────────────────────────────────────────────────────
app.post('/initiate-booking', async (req, res) => {
  try {
    const {
      to_number,
      customer_name,
      partner_name,
      location,
      service_name,
      service_details
    } = req.body

    const result = await triggerOutboundCall({
      agent_id: ELEVENLABS_AGENT_ID, // Use default booking agent
      to_number,
      customer_name,
      dynamic_variables: {
        partner_name: partner_name || '',
        location: location || '',
        service_name: service_name || '',
        service_details: service_details || '',
      }
    })

    return res.json(result)
  } catch (err) {
    console.error('Booking call error:', err)
    return res.status(400).json({ error: err.message })
  }
})

// ── POST /initiate-booking-confirmation ──────────────────────────────────────
// Booking Confirmation Agent — Sam (agent_7001ksprhd41ec79dttg7yxrw3ga)
// Collects: customer_name, address, service_type, date
// ─────────────────────────────────────────────────────────────────────────────
app.post('/initiate-booking-confirmation', async (req, res) => {
  try {
    const {
      to_number,
      customer_name,
      address,
      service_type,
      date,
    } = req.body

    const result = await triggerOutboundCall({
      agent_id: 'agent_7001ksprhd41ec79dttg7yxrw3ga', // Booking Confirmation Agent — Sam
      to_number,
      customer_name,
      dynamic_variables: {
        address: address || '',
        service_type: service_type || '',
        date: date || '',
      }
    })

    return res.json(result)
  } catch (err) {
    console.error('Booking confirmation call error:', err)
    return res.status(400).json({ error: err.message })
  }
})

// ── POST /initiate-registration ────────────────────────────────────────────────
// Specific Registration Trigger API
// ─────────────────────────────────────────────────────────────────────────────
app.post('/initiate-registration', async (req, res) => {
  try {
    const {
      to_number,
      customer_name,
      email,
      registration_pending,
      remaining_data
    } = req.body

    const result = await triggerOutboundCall({
      agent_id: 'agent_8701ksmkp18cfm6t0a4mrqjhr785', // Hardcoded Registration Agent ID
      to_number,
      customer_name,
      dynamic_variables: {
        email: email || '',
        registration_pending: registration_pending !== undefined ? String(registration_pending) : 'true',
        remaining_data: remaining_data || '',
      }
    })

    return res.json(result)
  } catch (err) {
    console.error('Registration call error:', err)
    return res.status(400).json({ error: err.message })
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
    const { page_size = 30, cursor, agent_id } = req.query;
    const selectedAgentId = agent_id || ELEVENLABS_AGENT_ID;
    let url = `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${selectedAgentId}&page_size=${page_size}`;

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

// ── DELETE /conversation/:id ──────────────────────────────────────────────────
// Deletes a conversation from ElevenLabs after verifying password
// ─────────────────────────────────────────────────────────────────────────────
app.delete('/conversation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (password !== 'qwertyu') {
      return res.status(403).json({ error: 'Incorrect password' });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${id}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });

    if (!response.ok) {
      const data = await response.json();
      return res.status(response.status).json({ error: data?.detail?.message || 'Failed to delete conversation' });
    }

    return res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error('Delete conversation error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`\n✅ ElevenLabs Call Server running on http://localhost:${PORT}`)
  console.log(`   POST http://localhost:${PORT}/initiate-call\n`)
})
