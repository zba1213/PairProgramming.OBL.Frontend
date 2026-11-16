Vue.createApp({
    data() {
        return {
            records: [],
            filters: { title: '', artist: '', publicationYear: '' },
            appliedFilters: {},
            loading: true,
            error: null
        };
    },
    computed: {
        hasFilters() {
            return Object.values(this.appliedFilters).some(value => value !== '');
        }
    },
    mounted() { this.loadRecords(); },
    methods: {
        applyFilters() {
            this.appliedFilters = {
                title: this.filters.title.trim(),
                artist: this.filters.artist.trim(),
                publicationYear: this.filters.publicationYear
            };
            this.loadRecords();
        },
        resetFilters() {
            this.filters = { title: '', artist: '', publicationYear: '' };
            this.applyFilters();
        },
        async loadRecords() {
            this.loading = true;
            this.error = null;
            try {
                const response = await axios.get(`${window.APP_CONFIG.apiBaseUrl}/api/musicrecords`, {
                    params: Object.fromEntries(
                        Object.entries(this.appliedFilters).filter(([, value]) => value !== '')
                    ),
                    timeout: 10000
                });
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
