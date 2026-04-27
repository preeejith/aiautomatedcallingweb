<template>
  <div class="caller-wrapper">
    <!-- Background noise texture -->
    <div class="bg-noise"></div>
    <div class="bg-grid"></div>

    <div class="caller-card">
      <!-- Header -->
      <div class="card-header">
        <div class="logo-row">
          <div class="signal-icon">
            <span></span><span></span><span></span><span></span>
          </div>
          <h1 class="title">AI Caller</h1>
        </div>
        <p class="subtitle">Powered by Ohyes Ai</p>
      </div>

      <!-- Status Bar -->
      <div class="status-bar" :class="statusClass">
        <div class="status-dot"></div>
        <span>{{ statusMessage }}</span>
      </div>

      <!-- Form -->
      <div class="form-section">
        <!-- Name Field -->
        <div class="field-group">
          <label class="field-label">
            <span class="label-icon">👤</span>
            Customer Name
          </label>
          <input
            v-model="customerName"
            type="text"
            class="field-input"
            placeholder="e.g. Arjun Kumar"
            :disabled="isLoading"
          />
          <p class="field-hint">This name will be used by the AI agent dynamically</p>
        </div>

        <!-- Phone Field -->
        <div class="field-group">
          <label class="field-label">
            <span class="label-icon">📞</span>
            Phone Number
          </label>
          <input
            v-model="phoneNumber"
            type="tel"
            class="field-input"
            placeholder="e.g. +919876543210"
            :disabled="isLoading"
          />
        </div>

        <!-- NEW: Additional Dynamic Variables -->
        <div class="field-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="field-group">
            <label class="field-label">📍 Location</label>
            <input v-model="location" type="text" class="field-input" placeholder="e.g. Delhi" :disabled="isLoading" />
          </div>
          <div class="field-group">
            <label class="field-label">🤝 Partner</label>
            <input v-model="partnerName" type="text" class="field-input" placeholder="e.g. BestService" :disabled="isLoading" />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">🛠️ Service Name</label>
          <input v-model="serviceName" type="text" class="field-input" placeholder="e.g. Plumbing" :disabled="isLoading" />
        </div>

        <div class="field-group">
          <label class="field-label">📝 Service Details</label>
          <textarea v-model="serviceDetails" class="field-input" style="height: 60px; resize: none;" placeholder="e.g. Tap Repair in kitchen" :disabled="isLoading"></textarea>
        </div>
      </div>

      <!-- Call Button -->
      <button
        class="call-btn"
        :class="{ loading: isLoading, success: callSuccess }"
        @click="initiateCall"
        :disabled="isLoading || !customerName || !phoneNumber"
      >
        <span v-if="!isLoading && !callSuccess" class="btn-content">
          <span class="btn-icon">📲</span>
          Initiate Call
        </span>
        <span v-else-if="isLoading" class="btn-content">
          <span class="spinner"></span>
          Connecting...
        </span>
        <span v-else class="btn-content">
          <span class="btn-icon">✅</span>
          Call Initiated!
        </span>
      </button>

      <!-- Response Info -->
      <div v-if="callResponse" class="response-card">
        <h3 class="response-title">📋 Call Details</h3>
        <div class="response-row">
          <span class="response-key">Called</span>
          <span class="response-val">{{ callResponse.calledName }}</span>
        </div>
        <div class="response-row">
          <span class="response-key">Number</span>
          <span class="response-val">{{ callResponse.toNumber }}</span>
        </div>
        <div class="response-row" v-if="callResponse.conversationId">
          <span class="response-key">Conv. ID</span>
          <span class="response-val mono">{{ callResponse.conversationId }}</span>
        </div>
        <div class="response-row" v-if="callResponse.callSid">
          <span class="response-key">Call SID</span>
          <span class="response-val mono">{{ callResponse.callSid }}</span>
        </div>
        
        <!-- Transcript Feature -->
        <div style="margin-top: 1.5rem; text-align: center;" v-if="callResponse.conversationId">
          <button class="call-btn" style="padding: 0.6rem 1rem; font-size: 0.9rem;" @click="getTranscript" :disabled="isFetchingTranscript">
            {{ isFetchingTranscript ? 'Fetching Transcript...' : '📜 Get Transcript' }}
          </button>
        </div>

        <div v-if="transcript" class="transcript-wrapper" style="margin-top: 1rem;">
          <!-- NEW: Sentiment Evaluations -->
          <div v-if="analysis && (analysis.call_successful || (analysis.evaluation_criteria_results && Object.keys(analysis.evaluation_criteria_results).length > 0))" class="eval-container">
            <h4 class="audio-title">📊 Call Evaluations</h4>
            <div class="eval-badges">
              <!-- Default: Call Success Status -->
              <div v-if="analysis.call_successful" class="eval-badge" :class="analysis.call_successful">
                <span class="eval-name">Call Status:</span>
                <span class="eval-status">{{ analysis.call_successful }}</span>
                <div class="eval-tooltip">Automatically determined based on the call completion and interaction quality.</div>
              </div>

              <!-- Custom Criteria -->
              <div v-for="(result, name) in analysis.evaluation_criteria_results" :key="name" 
                class="eval-badge" :class="result.result">
                <span class="eval-name">{{ name }}:</span>
                <span class="eval-status">{{ result.result }}</span>
                <div v-if="result.rationale" class="eval-tooltip">{{ result.rationale }}</div>
              </div>
            </div>

            <!-- Setup Guide UI for specific sentiment -->
            <div v-if="!analysis.evaluation_criteria_results || Object.keys(analysis.evaluation_criteria_results).length === 0" 
              style="margin-top: 0.75rem; padding: 0.6rem; background: rgba(124,92,252,0.04); border: 1px dashed rgba(124,92,252,0.2); border-radius: 6px;">
              <h5 style="margin: 0 0 0.3rem 0; font-size: 0.7rem; color: #7c5cfc; text-transform: uppercase;">💡 Want specific sentiment (Aggression)?</h5>
              <p style="margin: 0; font-size: 0.65rem; color: rgba(255,255,255,0.4); line-height: 1.3;">
                Add an <strong>Evaluation Criterion</strong> named "Aggression" or "Sentiment" in your ElevenLabs Analysis settings to see live badges here.
              </p>
            </div>
          </div>
          <!-- NEW: Conversation Summary -->
          <div v-if="summary" class="summary-container" style="margin-bottom: 1.25rem;">
            <h4 class="audio-title">📝 AI Summary</h4>
            <div class="summary-box">
              {{ summary }}
            </div>
          </div>

          <div class="audio-container" style="margin-bottom: 0.75rem;">
            <h4 class="audio-title">🎙️ Audio Recording</h4>
            <audio controls :src="`${backendUrl}/audio/${callResponse.conversationId}`" preload="none" class="audio-player"></audio>
          </div>
          <div class="transcript-box">
            <div v-if="transcript.length === 0" class="msg info">No messages yet. (Takes a short moment after call finishes to generate)</div>
            <div v-for="(msg, i) in transcript" :key="i" :class="['msg', msg.role]">
              <strong>{{ msg.role === 'agent' ? 'AI Agent' : (msg.role === 'user' ? customerName : msg.role) }}:</strong>
              <span>{{ msg.message || msg.text || '...' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="errorMessage" class="error-card">
        <span class="error-icon">⚠️</span>
        {{ errorMessage }}
      </div>

      <!-- Old Conversation Feature -->
      <div class="history-section">
        <h4 class="history-title">🔍 Lookup Old Conversation</h4>
        <div class="field-group" style="flex-direction: row; gap: 0.5rem; align-items: stretch;">
          <input
            v-model="oldConversationId"
            type="text"
            class="field-input"
            placeholder="Enter Conversation ID"
            style="flex: 1; padding: 0.6rem; font-size: 0.85rem;"
            :disabled="isFetchingOld"
          />
          <button class="call-btn" style="width: auto; padding: 0.6rem 1rem; font-size: 0.85rem;" @click="fetchOldTranscript" :disabled="!oldConversationId || isFetchingOld">
            {{ isFetchingOld ? '...' : 'Fetch' }}
          </button>
        </div>
        
        <div v-if="oldTranscriptError" class="error-card" style="margin-top: 0.75rem; font-size: 0.75rem; padding: 0.5rem;">
          <span class="error-icon">⚠️</span> {{ oldTranscriptError }}
        </div>

        <div v-if="oldTranscript" class="transcript-wrapper" style="margin-top: 0.75rem;">
          <!-- NEW: Old Conversation Summary -->
          <div v-if="oldSummary" class="summary-container" style="margin-bottom: 1rem;">
            <h4 class="audio-title">📝 AI Summary</h4>
            <div class="summary-box" style="font-size: 0.85rem;">
              {{ oldSummary }}
            </div>
          </div>

          <div class="audio-container" style="margin-bottom: 0.75rem;">
            <h4 class="audio-title">🎙️ Audio Recording</h4>
            <audio controls :src="`${backendUrl}/audio/${oldConversationId.trim()}`" preload="none" class="audio-player"></audio>
          </div>
          <div class="transcript-box">
            <div v-if="oldTranscript.length === 0" class="msg info">No messages found.</div>
            <div v-for="(msg, i) in oldTranscript" :key="i" :class="['msg', msg.role]">
              <strong>{{ msg.role === 'agent' ? 'AI Agent' : msg.role }}:</strong>
              <span>{{ msg.message || msg.text || '...' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- How it works -->
      <div class="info-section">
        <h4 class="info-title">How Dynamic Name Works</h4>
        <div class="info-steps">
          <div class="info-step">
            <span class="step-num">1</span>
            <span>You enter name + phone above</span>
          </div>
          <div class="info-step">
            <span class="step-num">2</span>
            <span>Number sends to your backend</span>
          </div>
          <div class="info-step">
            <span class="step-num">3</span>
            <span>Backend calls ElevenLabs API with <code>dynamic_variables: &#123; user_name &#125;</code></span>
          </div>
          <div class="info-step">
            <span class="step-num">4</span>
            <span>Agent greets: <em>"Hello {{ customerName || 'Customer' }}!"</em></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ElevenLabsCaller',

  data() {
    return {
      customerName: '',
      phoneNumber: '',
      partnerName: '',
      location: '',
      serviceName: '',
      serviceDetails: '',
      isDisconnecting: false,
      isLoading: false,
      callSuccess: false,
      callResponse: null,
      errorMessage: '',
      status: 'idle', // idle | calling | success | error
      transcript: null,
      summary: null,
      isFetchingTranscript: false,
      
      oldConversationId: '',
      oldTranscript: null,
      oldSummary: null,
      isFetchingOld: false,
      oldTranscriptError: '',

      // ─── CONFIGURE THESE ──────────────────────────────────────────────
      // This is YOUR Node.js backend URL (see server.js below)
      backendUrl: (import.meta.env.VITE_BACKEND_URL || '/api') + '/initiate-call',
      // ──────────────────────────────────────────────────────────────────
    }
  },

  mounted() {
    this.parseUrlParams()
  },

  computed: {
    statusMessage() {
      const map = {
        idle:    'Ready to call',
        calling: 'Initiating call...',
        success: 'Call connected successfully',
        error:   'Call failed — check details below',
      }
      return map[this.status]
    },
    statusClass() {
      return {
        'status-idle':    this.status === 'idle',
        'status-calling': this.status === 'calling',
        'status-success': this.status === 'success',
        'status-error':   this.status === 'error',
      }
    }
  },

  methods: {
    parseUrlParams() {
      const params = new URLSearchParams(window.location.search)
      if (params.get('customer_name')) this.customerName = params.get('customer_name')
      if (params.get('phone_number'))  this.phoneNumber = params.get('phone_number')
      if (params.get('partner_name'))  this.partnerName = params.get('partner_name')
      if (params.get('location'))      this.location = params.get('location')
      if (params.get('service_name'))  this.serviceName = params.get('service_name')
      if (params.get('service_details')) this.serviceDetails = params.get('service_details')
    },

    async fetchOldTranscript() {
      if (!this.oldConversationId.trim()) return
      this.isFetchingOld = true
      this.oldTranscriptError = ''
      this.oldTranscript = null
      try {
        const baseUrl = new URL(this.backendUrl).origin
        const response = await fetch(`${baseUrl}/transcript/${this.oldConversationId.trim()}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to fetch transcript')
        
        this.oldTranscript = data.transcript
        this.oldSummary = data.analysis?.summary || null
      } catch (err) {
        this.oldTranscriptError = err.message
      } finally {
        this.isFetchingOld = false
      }
    },

    async getTranscript() {
      if (!this.callResponse || !this.callResponse.conversationId) return
      this.isFetchingTranscript = true
      this.errorMessage = ''
      try {
        const baseUrl = new URL(this.backendUrl).origin
        const response = await fetch(`${baseUrl}/transcript/${this.callResponse.conversationId}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to fetch transcript')
        
        this.transcript = data.transcript
        this.summary = data.analysis?.summary || null
      } catch (err) {
        this.errorMessage = 'Transcript Error: ' + err.message
      } finally {
        this.isFetchingTranscript = false
      }
    },

    async initiateCall() {
      // Validation
      if (!this.customerName.trim()) {
        this.errorMessage = 'Please enter the customer name.'
        return
      }
      if (!this.phoneNumber.trim()) {
        this.errorMessage = 'Please enter a phone number with country code.'
        return
      }
      if (!this.phoneNumber.startsWith('+')) {
        this.errorMessage = 'Phone number must start with + and include country code (e.g. +91...).'
        return
      }

      // Reset
      this.errorMessage = ''
      this.callResponse = null
      this.transcript   = null
      this.summary      = null
      this.callSuccess  = false
      this.isLoading    = true
      this.status       = 'calling'

      try {
        const response = await fetch(this.backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_number:       this.phoneNumber.trim(),
            customer_name:   this.customerName.trim(),
            partner_name:    this.partnerName.trim(),
            location:        this.location.trim(),
            service_name:    this.serviceName.trim(),
            service_details: this.serviceDetails.trim(),
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `Server error: ${response.status}`)
        }

        // Success
        this.callSuccess  = true
        this.status       = 'success'
        this.callResponse = {
          calledName:     this.customerName,
          toNumber:       this.phoneNumber,
          conversationId: data.conversation_id || null,
          callSid:        data.callSid         || null,
        }

        // Reset button after 4 seconds
        setTimeout(() => { this.callSuccess = false }, 4000)

      } catch (err) {
        this.status       = 'error'
        this.errorMessage = err.message || 'Unexpected error. Is your backend server running?'
      } finally {
        this.isLoading = false
      }
    },
  },
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

/* ── Root ── */
.caller-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  font-family: 'DM Sans', sans-serif;
}

/* Background texture */
.bg-noise {
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 0;
}
.bg-grid {
  position: fixed; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none; z-index: 0;
}

/* ── Card ── */
.caller-card {
  position: relative; z-index: 1;
  width: 100%; max-width: 480px;
  background: #13131a;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 20px;
  padding: 2.5rem 2rem;
  box-shadow: 0 0 0 1px rgba(255,255,255,.04), 0 40px 80px rgba(0,0,0,.6);
}

/* ── Header ── */
.card-header { margin-bottom: 1.5rem; }
.logo-row {
  display: flex; align-items: center; gap: .75rem;
  margin-bottom: .4rem;
}
.signal-icon {
  display: flex; align-items: flex-end; gap: 2px; height: 22px;
}
.signal-icon span {
  display: block; width: 4px; border-radius: 2px;
  background: #7c5cfc;
}
.signal-icon span:nth-child(1) { height: 8px; }
.signal-icon span:nth-child(2) { height: 12px; opacity:.8; }
.signal-icon span:nth-child(3) { height: 16px; opacity:.9; }
.signal-icon span:nth-child(4) { height: 22px; }

.title {
  font-family: 'Syne', sans-serif;
  font-size: 1.7rem; font-weight: 800;
  color: #fff; margin: 0; letter-spacing: -.5px;
}
.subtitle {
  font-size: .78rem; color: rgba(255,255,255,.35);
  margin: 0; letter-spacing: .04em; text-transform: uppercase;
}

/* ── Status Bar ── */
.status-bar {
  display: flex; align-items: center; gap: .5rem;
  padding: .5rem .75rem;
  border-radius: 8px; margin-bottom: 1.5rem;
  font-size: .82rem; font-weight: 500;
  border: 1px solid transparent;
  transition: all .3s;
}
.status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  flex-shrink: 0;
}
.status-idle   { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.07); color: rgba(255,255,255,.4); }
.status-idle .status-dot { background: rgba(255,255,255,.3); }
.status-calling { background: rgba(255,200,50,.08); border-color: rgba(255,200,50,.25); color: #ffc832; }
.status-calling .status-dot { background: #ffc832; animation: pulse 1s infinite; }
.status-success { background: rgba(52,211,153,.08); border-color: rgba(52,211,153,.25); color: #34d399; }
.status-success .status-dot { background: #34d399; }
.status-error   { background: rgba(248,113,113,.08); border-color: rgba(248,113,113,.25); color: #f87171; }
.status-error .status-dot { background: #f87171; }

@keyframes pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50% { opacity:.4; transform:scale(1.4); }
}

/* ── Form ── */
.form-section { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 1.5rem; }
.field-group { display: flex; flex-direction: column; gap: .4rem; }
.field-label {
  display: flex; align-items: center; gap: .4rem;
  font-size: .82rem; font-weight: 500;
  color: rgba(255,255,255,.55); text-transform: uppercase; letter-spacing: .06em;
}
.label-icon { font-size: .9rem; }
.field-input {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: .75rem 1rem;
  color: #fff;
  font-size: .97rem;
  font-family: 'DM Sans', sans-serif;
  transition: border-color .2s, background .2s;
  outline: none;
  width: 100%; box-sizing: border-box;
}
.field-input::placeholder { color: rgba(255,255,255,.2); }
.field-input:focus {
  border-color: #7c5cfc;
  background: rgba(124,92,252,.08);
}
.field-input:disabled { opacity: .5; cursor: not-allowed; }
.field-hint { font-size: .75rem; color: rgba(255,255,255,.25); margin: 0; }

/* ── Call Button ── */
.call-btn {
  width: 100%;
  padding: .9rem 1.5rem;
  border-radius: 12px;
  border: none; cursor: pointer;
  font-family: 'Syne', sans-serif;
  font-size: 1rem; font-weight: 700;
  letter-spacing: .03em;
  transition: all .25s;
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, #7c5cfc 0%, #5b8cf5 100%);
  color: #fff;
  box-shadow: 0 4px 20px rgba(124,92,252,.4);
}
.call-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(124,92,252,.55);
}
.call-btn:active:not(:disabled) { transform: translateY(0); }
.call-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
.call-btn.success { background: linear-gradient(135deg, #34d399 0%, #059669 100%); box-shadow: 0 4px 20px rgba(52,211,153,.4); }
.call-btn.loading { opacity: .8; }
.btn-content { display: flex; align-items: center; justify-content: center; gap: .5rem; }
.btn-icon { font-size: 1.1rem; }

/* Spinner */
.spinner {
  display: inline-block;
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Response Card ── */
.response-card {
  margin-top: 1.25rem;
  background: rgba(52,211,153,.06);
  border: 1px solid rgba(52,211,153,.2);
  border-radius: 12px;
  padding: 1rem 1.25rem;
}
.response-title {
  font-family: 'Syne', sans-serif;
  font-size: .9rem; font-weight: 700;
  color: #34d399; margin: 0 0 .75rem;
}
.response-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: .3rem 0;
  border-bottom: 1px solid rgba(255,255,255,.05);
  gap: 1rem;
}
.response-row:last-child { border-bottom: none; }
.response-key { font-size: .78rem; color: rgba(255,255,255,.35); text-transform: uppercase; letter-spacing: .05em; flex-shrink:0; }
.response-val { font-size: .85rem; color: rgba(255,255,255,.8); text-align:right; word-break:break-all; }
.mono { font-family: 'DM Mono', monospace; font-size: .75rem; color: #7c5cfc; }

/* Transcript Styles */
.transcript-wrapper { display: flex; flex-direction: column; width: 100%; }
.audio-container { background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
.audio-title { margin: 0 0 0.5rem 0; font-size: 0.75rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Syne', sans-serif;}
.audio-player { width: 100%; height: 36px; outline: none; }

/* Evaluations UI */
.eval-container { margin-bottom: 1rem; }
.eval-badges { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.eval-badge {
  position: relative;
  padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.75rem;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; gap: 0.4rem; cursor: help;
}
.eval-badge.success, .eval-badge.positive { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.3); color: #34d399; }
.eval-badge.failure, .eval-badge.aggression, .eval-badge.negative { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: #f87171; }
.eval-badge.normal, .eval-badge.neutral { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.9); }
.eval-badge.curiosity, .eval-badge.satisfied { background: rgba(124,92,252,0.1); border-color: rgba(124,92,252,0.3); color: #7c5cfc; }
.eval-name { font-weight: 600; opacity: 0.8; }
.eval-status { text-transform: uppercase; font-weight: 800; font-size: 0.65rem; letter-spacing: 0.05em; }
.eval-tooltip {
  position: absolute; bottom: 100%; left: 0; width: 220px;
  background: #1f1f2e; border: 1px solid rgba(255,255,255,0.1);
  padding: 0.6rem; border-radius: 6px; font-size: 0.7rem; color: rgba(255,255,255,0.8);
  box-shadow: 0 10px 20px rgba(0,0,0,0.4); pointer-events: none;
  opacity: 0; transform: translateY(10px); transition: all 0.2s; z-index: 10;
}
.eval-badge:hover .eval-tooltip { opacity: 1; transform: translateY(-5px); }

.transcript-box {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 1rem;
  max-height: 250px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.msg {
  font-size: 0.85rem;
  line-height: 1.4;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  width: fit-content;
  max-width: 90%;
}
.msg.agent { background: rgba(52,211,153,.15); border: 1px solid rgba(52,211,153,.3); color: #e5e7eb; align-self: flex-start; }
.msg.user { background: rgba(124,92,252,.15); border: 1px solid rgba(124,92,252,.3); color: #e5e7eb; align-self: flex-end; }
.msg.info { background: transparent; color: rgba(255,255,255,0.4); font-style: italic; align-self: center; }

/* ── Error Card ── */
.error-card {
  margin-top: 1rem;
  background: rgba(248,113,113,.08);
  border: 1px solid rgba(248,113,113,.25);
  border-radius: 10px;
  padding: .75rem 1rem;
  font-size: .85rem;
  color: #f87171;
  display: flex; align-items: flex-start; gap: .5rem;
}
.error-icon { flex-shrink:0; }

/* ── History Section ── */
.history-section {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255,255,255,.07);
}
.history-title {
  font-family: 'Syne', sans-serif;
  font-size: .8rem; font-weight: 700;
  color: rgba(255,255,255,.3);
  text-transform: uppercase; letter-spacing: .08em;
  margin: 0 0 .75rem;
}

/* ── Info Section ── */
.info-section {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255,255,255,.07);
}
.info-title {
  font-family: 'Syne', sans-serif;
  font-size: .8rem; font-weight: 700;
  color: rgba(255,255,255,.3);
  text-transform: uppercase; letter-spacing: .08em;
  margin: 0 0 .75rem;
}
.info-steps { display: flex; flex-direction: column; gap: .5rem; }
.info-step {
  display: flex; align-items: flex-start; gap: .6rem;
  font-size: .8rem; color: rgba(255,255,255,.35); line-height: 1.4;
}
.step-num {
  flex-shrink:0;
  width: 18px; height: 18px;
  background: rgba(124,92,252,.2);
  border: 1px solid rgba(124,92,252,.3);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .7rem; font-weight: 700; color: #7c5cfc;
}
.info-step code {
  background: rgba(255,255,255,.08); padding: .1em .35em;
  border-radius: 4px; font-family: 'DM Mono', monospace;
  font-size: .75rem; color: rgba(255,255,255,.5);
}
.info-step em { color: rgba(255,255,255,.5); font-style:italic; }
</style>
