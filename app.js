Vue.createApp({
    data() { return { records: [], loading: true, error: null }; },
    mounted() { this.loadRecords(); },
    methods: {
        async loadRecords() {
            this.loading = true;
            this.error = null;
            try {
                const response = await axios.get(`${window.APP_CONFIG.apiBaseUrl}/api/musicrecords`, { timeout: 10000 });
                if (!Array.isArray(response.data)) throw new Error('Invalid API response');
                this.records = response.data;
            } catch {
                this.error = 'Musiksamlingen kunne ikke hentes. Kontrollér, at serveren kører, og prøv igen.';
            } finally { this.loading = false; }
        },
        formatDuration(seconds) {
            return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        }
    }
}).mount('#app');
