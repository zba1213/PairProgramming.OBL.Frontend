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

const RecordForm = {
    props: ['busy'],
    emits: ['add'],
    data() {
        return { title: '', artist: '', duration: '', publicationYear: '' };
    },
    methods: {
        submit() {
            if (!this.title || !this.artist || this.busy) return;
            this.$emit('add', {
                title: this.title,
                artist: this.artist,
                duration: this.duration,
                publicationYear: this.publicationYear
            });
        }
    },
    template: `
        <section aria-labelledby="add-record-heading" class="record-form">
            <h2 id="add-record-heading">Tilføj musikplade</h2>
            <form @submit.prevent="submit">
                <fieldset class="filter-fields" :disabled="busy">
                    <label>Titel<input id="record-title" v-model.trim="title" maxlength="200" required></label>
                    <label>Kunstner<input id="record-artist" v-model.trim="artist" maxlength="200" required></label>
                    <label>Varighed i sekunder<input id="record-duration" v-model.number="duration" type="number" min="1" max="2147483647" required></label>
                    <label>Udgivelsesår<input id="record-year" v-model.number="publicationYear" type="number" min="1" max="9999" required></label>
                    <button type="submit">Tilføj</button>
                </fieldset>
            </form>
        </section>
    `
};

Vue.createApp({
    components: { LoginPanel, RecordForm },
    data() {
        return {
            records: [],
            session: null,
            sessionTimer: null,
            saving: false,
            recordFormVersion: 0,
            mutationStatus: '',
            mutationError: '',
            filters: { title: '', artist: '', publicationYear: '' },
            appliedFilters: {},
            loading: true,
            error: null
        };
    },
    computed: {
        canManageRecords() {
            return this.session?.role === 'Editor';
        },
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
        async addRecord(record) {
            await this.changeRecords('post', '', record);
        },
        async deleteRecord(record) {
            if (!this.canManageRecords || this.saving) return;
            if (window.confirm(`Slet “${record.title}” fra samlingen?`)) {
                await this.changeRecords('delete', `/${record.id}`);
            }
        },
        async changeRecords(method, path, data) {
            if (!this.canManageRecords || this.saving || this.loading) return;
            this.saving = true;
            this.mutationStatus = '';
            this.mutationError = '';
            const token = this.session.token;
            try {
                await axios({
                    method,
                    url: `${window.APP_CONFIG.apiBaseUrl}/api/musicrecords${path}`,
                    data,
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 10000
                });
                if (method === 'post') this.recordFormVersion++;
                this.mutationStatus = method === 'post' ? 'Musikpladen er tilføjet.' : 'Musikpladen er slettet.';
                await this.loadRecords();
            } catch (error) {
                switch (error.response?.status) {
                    case 400:
                        this.mutationError = 'Kontrollér titel, kunstner, varighed og udgivelsesår.';
                        break;
                    case 401:
                        if (this.session?.token === token) this.clearSession();
                        this.mutationError = 'Din session er udløbet. Log ind igen.';
                        break;
                    case 403:
                        this.mutationError = 'Din konto har ikke adgang til at ændre samlingen.';
                        break;
                    case 404:
                        this.mutationError = 'Musikpladen findes ikke længere.';
                        await this.loadRecords();
                        break;
                    default:
                        this.mutationError = 'Ændringen kunne ikke bekræftes. Kontrollér listen, før du prøver igen.';
                        await this.loadRecords();
                }
            } finally {
                this.saving = false;
            }
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
