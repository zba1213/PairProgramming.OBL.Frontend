<script>
import axios from 'axios'
import { apiBaseUrl } from '../config.js'

export default {
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
                const { data } = await axios.post(`${apiBaseUrl}/api/auth/login`, {
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
    }
}
</script>

<template>
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
</template>
