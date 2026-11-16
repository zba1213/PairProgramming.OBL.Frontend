const LoginPanel = {
    props: ['session'],
    emits: ['signed-in', 'signed-out'],
    data() {
        return { username: '', password: '', busy: false, error: '' };
    },
    methods: {
        async login() {
            this.busy = true;
            this.error = '';
            try {
                const { data } = await axios.post(`${window.APP_CONFIG.apiBaseUrl}/api/auth/login`, {
                    username: this.username.trim(),
                    password: this.password
                }, { timeout: 10000 });
                const expiresAt = Date.parse(data.expiresAt);
                if (!data.token || !data.username || !data.role || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
                    throw new Error('Invalid login response');
                }
                this.username = '';
                this.$emit('signed-in', data);
            } catch (error) {
                this.error = error.response?.status === 401
                    ? 'Forkert brugernavn eller adgangskode.'
                    : 'Login kunne ikke gennemføres. Prøv igen.';
            } finally {
                this.password = '';
                this.busy = false;
            }
        }
    },
    template: `
        <section aria-label="Konto">
            <div v-if="session" class="account">
                <span role="status" data-testid="login-status">{{ session.username }} ({{ session.role }})</span>
                <button type="button" @click="$emit('signed-out')">Log ud</button>
            </div>
            <form v-else aria-label="Log ind" @submit.prevent="login">
                <fieldset class="account" :disabled="busy">
                    <label>Brugernavn<input id="login-username" v-model="username" autocomplete="username" maxlength="100" required></label>
                    <label>Adgangskode<input id="login-password" v-model="password" type="password" autocomplete="current-password" maxlength="256" required></label>
                    <button type="submit">{{ busy ? 'Logger ind…' : 'Log ind' }}</button>
                </fieldset>
                <p v-if="error" role="alert">{{ error }}</p>
            </form>
        </section>
    `
};

Vue.createApp({
    components: { LoginPanel },
    data() {
        return {
            records: [],
            session: null,
            sessionTimer: null,
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
    beforeUnmount() { this.clearSession(); },
    methods: {
        setSession(session) {
            this.clearSession();
            this.session = session;
            this.sessionTimer = setTimeout(() => this.clearSession(), Date.parse(session.expiresAt) - Date.now());
        },
        clearSession() {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
            this.session = null;
        },
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
