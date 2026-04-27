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
              <th>Key Point / Result</th>
              <th>Call Duration</th>
              <th>Conversation ID</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="conv in paginatedConversations" :key="conv.conversation_id">
              <tr class="conv-row" :class="{ 'expanded': expandedId === conv.conversation_id }">
                <td>{{ formatDate(conv.start_time_unix_secs) }}</td>
                <td>
                  <span class="status-badge" :class="conv.status">{{ conv.status || 'unknown' }}</span>
                </td>
                <td class="key-point-cell" :title="summariesMap[conv.conversation_id]">
                  {{ summariesMap[conv.conversation_id] || '...' }}
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
                    <!-- Caller Info -->
                    <div v-if="transcriptMetadata && transcriptMetadata.phone_number" class="caller-box">
                      <strong>📞 Phone Number:</strong> <span class="mono">{{ transcriptMetadata.phone_number }}</span>
                    </div>

                    <!-- NEW: Sentiment Evaluations -->
                    <div v-if="transcriptAnalysis && (transcriptAnalysis.call_successful || (transcriptAnalysis.evaluation_criteria_results && Object.keys(transcriptAnalysis.evaluation_criteria_results).length > 0))" class="eval-container">
                      <h4 class="audio-title">📊 Call Evaluations</h4>
                      <div class="eval-badges">
                        <!-- Default: Call Success Status -->
                        <div v-if="transcriptAnalysis.call_successful" class="eval-badge" :class="transcriptAnalysis.call_successful">
                          <span class="eval-name">Call Status:</span>
                          <span class="eval-status">{{ transcriptAnalysis.call_successful }}</span>
                          <div class="eval-tooltip">Automatically determined based on the call completion and interaction quality.</div>
                        </div>

                        <!-- Custom Criteria -->
                        <div v-for="(result, name) in transcriptAnalysis.evaluation_criteria_results" :key="name" 
                          class="eval-badge" :class="result.result">
                          <span class="eval-name">{{ name }}:</span>
                          <span class="eval-status">{{ result.result }}</span>
                          <div v-if="result.rationale" class="eval-tooltip">{{ result.rationale }}</div>
                        </div>
                      </div>

                      <!-- Setup Guide UI for specific sentiment -->
                      <div v-if="!transcriptAnalysis.evaluation_criteria_results || Object.keys(transcriptAnalysis.evaluation_criteria_results).length === 0" 
                        style="margin-top: 1rem; padding: 0.75rem; background: rgba(124,92,252,0.05); border: 1px dashed rgba(124,92,252,0.3); border-radius: 8px;">
                        <h5 style="margin: 0 0 0.4rem 0; font-size: 0.75rem; color: #7c5cfc; text-transform: uppercase;">💡 Get Smarter Highlights</h5>
                        <p style="margin: 0; font-size: 0.7rem; color: rgba(255,255,255,0.5); line-height: 1.4;">
                          Add an <strong>Evaluation Criterion</strong> named <strong style="color: #fff;">"Key Point"</strong> in ElevenLabs (Analysis tab) to see smart summaries like <em>"Partner needs assistance"</em> instead of just the first sentence of the transcript.
                        </p>
                      </div>
                    </div>

                    <!-- NEW: Conversation Summary -->
                    <div v-if="transcriptSummary" class="summary-container" style="margin-bottom: 1.5rem;">
                      <h4 class="audio-title">📝 AI Summary</h4>
                      <div class="summary-box">
                        <!-- Key Point Highlight -->
                        <div class="key-point-highlight" v-if="summariesMap[conv.conversation_id]">
                          <strong>Quick Highlight:</strong> {{ summariesMap[conv.conversation_id] }}
                        </div>
                        
                        <!-- Full Summary -->
                        <div class="full-summary-text">
{{ transcriptSummary }}
                        </div>
                      </div>
                    </div>

                    <!-- Transcript Box -->
                    <div class="transcript-box">
                      <div v-if="transcriptData.length === 0" class="msg info">No messages recorded in this call.</div>
                      <div v-for="(msg, i) in transcriptData" :key="i" :class="['msg', msg.role]">
                        <strong>{{ msg.role === 'agent' ? 'AI Agent' : msg.role }}:</strong>
                        <span>{{ msg.message || msg.text || '...' }}</span>
                      </div>
                    </div>

                    <!-- Audio Player -->
                    <div class="audio-container" style="margin-bottom: 1.5rem;">
                      <h4 class="audio-title">🎙️ Call Recording</h4>
                      <audio controls :src="`${backendUrl}/audio/${conv.conversation_id}`" preload="none" class="audio-player"></audio>
                    </div>

                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <!-- Pagination Controls -->
        <div class="pagination-controls" v-if="totalPages > 1">
          <button 
            :disabled="currentPage === 1" 
            @click="currentPage--"
            class="page-btn">
            Previous
          </button>
          <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
          <button 
            :disabled="currentPage === totalPages" 
            @click="currentPage++"
            class="page-btn">
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConversationHistory',
  data() {
    return {
      backendUrl: import.meta.env.VITE_BACKEND_URL || '/api',
      conversations: [],
      searchQuery: '',
      isLoading: true,
      errorMessage: '',
      
      expandedId: null,
      transcriptData: null,
      transcriptSummary: null,
      transcriptMetadata: null,
      isFetchingTranscript: false,
      transcriptError: '',
      
      currentPage: 1,
      itemsPerPage: 20,
      summariesMap: {} // { conversation_id: 'Short summary text...' }
    }
  },
  mounted() {
    this.fetchConversations()
  },
  watch: {
    searchQuery() {
      this.currentPage = 1;
    }
  },
  computed: {
    filteredConversations() {
      if (!this.searchQuery.trim()) return this.conversations
      const q = this.searchQuery.toLowerCase().trim()
      return this.conversations.filter(c => 
        c.conversation_id.toLowerCase().includes(q)
      )
    },
    totalPages() {
      return Math.ceil(this.filteredConversations.length / this.itemsPerPage) || 1
    },
    paginatedConversations() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      const rows = this.filteredConversations.slice(start, start + this.itemsPerPage)
      
      // Auto-fetch summaries for visible rows
      rows.forEach(c => this.fetchRowSummary(c.conversation_id))
      
      return rows
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
      this.transcriptSummary = null
      this.transcriptMetadata = null
      this.transcriptAnalysis = null;
      
      try {
        const res = await fetch(`${this.backendUrl}/transcript/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to fetch transcript')
        
        this.transcriptData = data.transcript
        this.transcriptSummary = data.analysis?.transcript_summary || null
        this.transcriptMetadata = data.metadata || {}
        this.transcriptAnalysis = data.analysis || {};
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
    },
    async fetchRowSummary(id) {
      if (this.summariesMap[id]) return // Already fetched or fetching
      
      // Mark as fetching to prevent duplicate calls
      this.summariesMap[id] = 'Loading...'
      
      try {
        const res = await fetch(`${this.backendUrl}/summary/${id}`)
        const data = await res.json()
        if (res.ok && data.summary) {
          // Pass the analysis object which now contains evaluation_criteria_results
          this.summariesMap[id] = this.extractKeyPoint(data.summary, data.analysis)
        } else {
          this.summariesMap[id] = 'No summary available'
        }
      } catch (err) {
        console.error('Failed to fetch row summary:', err)
        this.summariesMap[id] = 'Error'
      }
    },
    extractKeyPoint(fullSummary, analysis) {
      // 1. Try to find a custom 'Key Point' or 'Result' evaluation first
      if (analysis && analysis.evaluation_criteria_results) {
        const smartPoint = analysis.evaluation_criteria_results['Key Point'] || 
                           analysis.evaluation_criteria_results['Result'] ||
                           analysis.evaluation_criteria_results['Overall Result'];
        
        if (smartPoint && smartPoint.result) {
          return smartPoint.result;
        }
      }

      // 2. Fallback to the first sentence if no custom evaluation is found
      if (!fullSummary) return '...'
      const firstSentence = fullSummary.split(/[.!?]/)[0]
      if (firstSentence.length > 85) {
        return firstSentence.substring(0, 82) + '...'
      }
      return firstSentence + '.'
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

.key-point-cell { 
  max-width: 200px; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  font-style: italic; 
  color: #7c5cfc;
  opacity: 0.9;
  font-size: 0.8rem;
}

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
.caller-box { background: rgba(124,92,252,0.1); border: 1px solid rgba(124,92,252,0.2); padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; color: #fff; }
.caller-box strong { color: rgba(255,255,255,0.7); margin-right: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; }
.audio-container { background: rgba(0,0,0,0.2); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
.audio-title { margin: 0 0 0.5rem 0; font-size: 0.8rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Syne', sans-serif;}
.audio-player { width: 100%; height: 38px; outline: none; }

/* Evaluations UI */
.eval-container { margin-bottom: 1.5rem; }
.eval-badges { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.eval-badge {
  position: relative;
  padding: 0.5rem 0.8rem; border-radius: 8px; font-size: 0.8rem;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; gap: 0.5rem; cursor: help;
}
.eval-badge.success, .eval-badge.positive { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.3); color: #34d399; }
.eval-badge.failure, .eval-badge.aggression, .eval-badge.negative { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: #f87171; }
.eval-badge.normal, .eval-badge.neutral { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.9); }
.eval-badge.curiosity, .eval-badge.satisfied { background: rgba(124,92,252,0.1); border-color: rgba(124,92,252,0.3); color: #7c5cfc; }
.eval-name { font-weight: 600; opacity: 0.8; }
.eval-status { text-transform: uppercase; font-weight: 800; font-size: 0.7rem; letter-spacing: 0.05em; }
.eval-tooltip {
  position: absolute; bottom: 100%; left: 0; width: 250px;
  background: #1f1f2e; border: 1px solid rgba(255,255,255,0.1);
  padding: 0.75rem; border-radius: 8px; font-size: 0.75rem; color: rgba(255,255,255,0.8);
  box-shadow: 0 10px 20px rgba(0,0,0,0.4); pointer-events: none;
  opacity: 0; transform: translateY(10px); transition: all 0.2s; z-index: 10;
}
.eval-badge:hover .eval-tooltip { opacity: 1; transform: translateY(-5px); }

/* Summary UI */
.summary-container {
  background: rgba(124, 92, 252, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(124, 92, 252, 0.2);
  padding: 1.25rem;
}
.summary-box {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  font-size: 0.95rem;
}
.key-point-highlight {
  background: rgba(124, 92, 252, 0.1);
  border-left: 3px solid #7c5cfc;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #fff;
}
.key-point-highlight strong {
  color: #7c5cfc;
  margin-right: 0.5rem;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
}
.full-summary-text {
  opacity: 0.8;
}

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

/* Pagination */
.pagination-controls {
  display: flex; justify-content: center; align-items: center; gap: 1rem;
  margin-top: 1.5rem; padding-top: 1.5rem;
  border-top: 1px solid rgba(255,255,255,.05);
}
.page-btn {
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  color: #fff; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem;
  cursor: pointer; transition: all .2s; font-family: 'DM Sans', sans-serif;
  font-weight: 500;
}
.page-btn:hover:not(:disabled) {
  background: rgba(124,92,252,.15); border-color: #7c5cfc; color: #7c5cfc;
}
.page-btn:disabled {
  opacity: 0.4; cursor: not-allowed;
}
.page-info {
  font-size: 0.85rem; color: rgba(255,255,255,.6); font-weight: 500;
}
</style>
