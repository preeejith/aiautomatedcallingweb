<template>
  <div class="history-wrapper">
    <div class="history-card">
      <h2 class="title">Call History</h2>
      <p class="subtitle">All phone calls made by your agent</p>

      <div class="search-bar" v-if="!isLoading && !errorMessage && conversations.length > 0">
        <input 
          v-model="searchQuery" 
          type="text" 
          class="field-input" 
          placeholder="🔍 Search by Conversation ID..." 
        />
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading conversations...</span>
      </div>
      
      <div v-else-if="errorMessage" class="error-state">
        <span class="error-icon">⚠️</span> {{ errorMessage }}
      </div>
      
      <div v-else class="list-container">
        <div v-if="conversations.length === 0" class="empty-state">
          No conversations found for this agent yet.
        </div>
        
        <table v-else class="history-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Status</th>
              <th>Call Duration</th>
              <th>Conversation ID</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="conv in filteredConversations" :key="conv.conversation_id">
              <tr class="conv-row" :class="{ 'expanded': expandedId === conv.conversation_id }">
                <td>{{ formatDate(conv.start_time_unix_secs) }}</td>
                <td>
                  <span class="status-badge" :class="conv.status">{{ conv.status || 'unknown' }}</span>
                </td>
                <td>{{ formatDuration(conv.call_duration_secs) }}</td>
                <td class="mono">{{ conv.conversation_id.substring(0, 12) }}...</td>
                <td>
                  <button class="view-btn" @click="toggleTranscript(conv.conversation_id)">
                    {{ expandedId === conv.conversation_id ? 'Hide' : 'Transcript' }}
                  </button>
                </td>
              </tr>
              <!-- Embedded Transcript -->
              <tr v-if="expandedId === conv.conversation_id" class="transcript-row">
                <td colspan="5">
                  <div class="transcript-loader" v-if="isFetchingTranscript">
                    <div class="spinner small"></div> Loading script & audio...
                  </div>
                  <div v-else-if="transcriptError" class="transcript-error">{{ transcriptError }}</div>
                  <div v-else-if="transcriptData" class="transcript-wrapper">
                    <!-- Audio Player -->
                    <div class="audio-container">
                      <h4 class="audio-title">🎙️ Call Recording</h4>
                      <audio controls :src="`${backendUrl}/audio/${conv.conversation_id}`" preload="none" class="audio-player"></audio>
                    </div>

                    <div class="transcript-box">
                      <div v-if="transcriptData.length === 0" class="msg info">No messages recorded in this call.</div>
                      <div v-for="(msg, i) in transcriptData" :key="i" :class="['msg', msg.role]">
                        <strong>{{ msg.role === 'agent' ? 'AI Agent' : msg.role }}:</strong>
                        <span>{{ msg.message || msg.text || '...' }}</span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConversationHistory',
  data() {
    return {
      backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
      conversations: [],
      searchQuery: '',
      isLoading: true,
      errorMessage: '',
      
      expandedId: null,
      transcriptData: null,
      isFetchingTranscript: false,
      transcriptError: '',
    }
  },
  mounted() {
    this.fetchConversations()
  },
  computed: {
    filteredConversations() {
      if (!this.searchQuery.trim()) return this.conversations
      const q = this.searchQuery.toLowerCase().trim()
      return this.conversations.filter(c => 
        c.conversation_id.toLowerCase().includes(q)
      )
    }
  },
  methods: {
    async fetchConversations() {
      this.isLoading = true
      this.errorMessage = ''
      try {
        const res = await fetch(`${this.backendUrl}/conversations`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to fetch history')
        
        // ElevenLabs returns { conversations: [...] }
        this.conversations = data.conversations || []
      } catch (err) {
        this.errorMessage = err.message
      } finally {
        this.isLoading = false
      }
    },
    async toggleTranscript(id) {
      if (this.expandedId === id) {
        this.expandedId = null
        this.transcriptData = null
        return
      }
      
      this.expandedId = id
      this.isFetchingTranscript = true
      this.transcriptError = ''
      this.transcriptData = null
      
      try {
        const res = await fetch(`${this.backendUrl}/transcript/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to fetch transcript')
        
        this.transcriptData = data.transcript
      } catch (err) {
        this.transcriptError = err.message
      } finally {
        this.isFetchingTranscript = false
      }
    },
    formatDate(unixSecs) {
      if (!unixSecs) return 'Unknown'
      const date = new Date(unixSecs * 1000)
      return date.toLocaleString()
    },
    formatDuration(secs) {
      if (!secs) return '0s'
      const m = Math.floor(secs / 60)
      const s = Math.floor(secs % 60)
      if (m > 0) return `${m}m ${s}s`
      return `${s}s`
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

.history-wrapper {
  padding: 2rem;
  display: flex;
  justify-content: center;
  font-family: 'DM Sans', sans-serif;
}
.history-card {
  width: 100%;
  max-width: 900px;
  background: #13131a;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0,0,0,.4);
}
.title {
  font-family: 'Syne', sans-serif;
  font-size: 1.5rem; font-weight: 800;
  color: #fff; margin: 0 0 0.25rem 0; letter-spacing: -.5px;
}
.subtitle {
  font-size: .85rem; color: rgba(255,255,255,.4);
  margin: 0 0 1.5rem 0;
}

.search-bar { margin-bottom: 2rem; }
.field-input {
  width: 100%; max-width: 400px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  padding: 0.8rem 1rem; border-radius: 8px; color: #fff; font-size: 0.9rem;
  outline: none; transition: border-color .2s; font-family: 'DM Sans', sans-serif;
}
.field-input::placeholder { color: rgba(255,255,255,.3); }
.field-input:focus { border-color: #7c5cfc; background: rgba(124,92,252,.05); }

.loading-state, .empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 4rem 0; color: rgba(255,255,255,.5); gap: 1rem;
}
.spinner {
  width: 24px; height: 24px;
  border: 3px solid rgba(255,255,255,.1);
  border-top-color: #7c5cfc; border-radius: 50%;
  animation: spin .8s linear infinite;
}
.spinner.small { width: 14px; height: 14px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.error-state {
  background: rgba(248,113,113,.08); border: 1px solid rgba(248,113,113,.25);
  border-radius: 8px; padding: 1rem; color: #f87171; text-align: center;
}

.history-table {
  width: 100%; border-collapse: collapse; text-align: left;
}
.history-table th {
  padding: 1rem; font-size: .8rem; text-transform: uppercase;
  color: rgba(255,255,255,.3); border-bottom: 1px solid rgba(255,255,255,.1);
  letter-spacing: .05em; font-weight: 600;
}
.history-table td {
  padding: 1rem; font-size: .9rem; color: rgba(255,255,255,.85);
  border-bottom: 1px solid rgba(255,255,255,.05);
}
.mono { font-family: 'DM Mono', monospace; font-size: .8rem; color: rgba(255,255,255,.5); }

.status-badge {
  padding: 0.25rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6);
}
.status-badge.done { background: rgba(52,211,153,.15); color: #34d399; }
.status-badge.in_progress { background: rgba(124,92,252,.15); color: #7c5cfc; }
.status-badge.failed, .status-badge.missed { background: rgba(248,113,113,.15); color: #f87171; }

.view-btn {
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  color: #fff; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem;
  cursor: pointer; transition: all .2s;
}
.view-btn:hover { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.2); }

.conv-row.expanded td { border-bottom: none; background: rgba(124,92,252,0.03); }
.transcript-row td { padding: 0 1rem 1.5rem 1rem; border-bottom: 1px solid rgba(255,255,255,.1); background: rgba(124,92,252,0.03); }

.transcript-loader { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: rgba(255,255,255,.5); }
.transcript-error { color: #f87171; font-size: 0.85rem; }

.transcript-wrapper { display: flex; flex-direction: column; gap: 1rem; }
.audio-container { background: rgba(0,0,0,0.2); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
.audio-title { margin: 0 0 0.5rem 0; font-size: 0.8rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Syne', sans-serif;}
.audio-player { width: 100%; height: 38px; outline: none; }

/* Transcript UI inside table */
.transcript-box {
  background: rgba(0,0,0,0.3); border-radius: 8px; padding: 1rem;
  max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem;
  border: 1px solid rgba(255,255,255,0.05);
}
.msg {
  font-size: 0.85rem; line-height: 1.4; padding: 0.5rem 0.75rem;
  border-radius: 8px; width: fit-content; max-width: 90%;
}
.msg.agent { background: rgba(52,211,153,.1); border: 1px solid rgba(52,211,153,.2); color: #e5e7eb; align-self: flex-start; }
.msg.user { background: rgba(124,92,252,.1); border: 1px solid rgba(124,92,252,.2); color: #e5e7eb; align-self: flex-end; }
.msg.info { background: transparent; color: rgba(255,255,255,0.4); font-style: italic; align-self: center; }
</style>
