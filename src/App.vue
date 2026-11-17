<script>
import axios from "axios";
import { apiBaseUrl } from "./config.js";
import LoginPanel from "./components/LoginPanel.vue";
import RecordForm from "./components/RecordForm.vue";

const recordsUrl = `${apiBaseUrl}/api/musicrecords`;

export default {
  components: { LoginPanel, RecordForm },
  data() {
    return {
      records: [],
      editingRecord: null,
      session: null,
      sessionTimer: null,
      saving: false,
      mutationStatus: "",
      mutationError: "",
      filters: { title: "", artist: "", publicationYear: "" },
      appliedFilters: {},
      loading: true,
      error: null,
    };
  },
  computed: {
    canManageRecords() {
      return this.session?.role === "Editor";
    },
    hasFilters() {
      return Object.values(this.appliedFilters).some((value) => value !== "");
    },
  },
  mounted() {
    this.loadRecords();
  },
  beforeUnmount() {
    this.clearSession();
  },
  methods: {
    setSession(session) {
      this.clearSession();
      this.session = session;
      this.sessionTimer = setTimeout(
        () => this.clearSession(),
        Date.parse(session.expiresAt) - Date.now(),
      );
    },
    clearSession() {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
      this.session = null;
      this.editingRecord = null;
    },
    editRecord(record) {
      this.mutationStatus = "";
      this.mutationError = "";
      this.editingRecord = record;
    },
    async addRecord(record) {
      if (!this.canManageRecords || this.saving || this.loading) return false;
      const token = this.session.token;
      this.startSaving();
      try {
        await axios.post(recordsUrl, record, this.authorizedRequest(token));
        this.mutationStatus = "Musikpladen er tilføjet.";
        await this.loadRecords();
        return true;
      } catch (error) {
        await this.handleSaveError(error, token);
        return false;
      } finally {
        this.saving = false;
      }
    },
    async updateRecord(record) {
      if (!this.canManageRecords || this.saving || this.loading) return false;
      const token = this.session.token;
      this.startSaving();
      try {
        await axios.put(
          `${recordsUrl}/${record.id}`,
          record,
          this.authorizedRequest(token),
        );
        this.editingRecord = null;
        this.mutationStatus = "Musikpladen er opdateret.";
        await this.loadRecords();
        return true;
      } catch (error) {
        await this.handleSaveError(error, token);
        return false;
      } finally {
        this.saving = false;
      }
    },
    async deleteRecord(record) {
      if (!this.canManageRecords || this.saving || this.loading) return;
      if (!window.confirm(`Slet “${record.title}” fra samlingen?`)) return;

      const token = this.session.token;
      this.startSaving();
      try {
        await axios.delete(
          `${recordsUrl}/${record.id}`,
          this.authorizedRequest(token),
        );
        if (this.editingRecord?.id === record.id) this.editingRecord = null;
        this.mutationStatus = "Musikpladen er slettet.";
        await this.loadRecords();
      } catch (error) {
        await this.handleSaveError(error, token);
      } finally {
        this.saving = false;
      }
    },
    startSaving() {
      this.saving = true;
      this.mutationStatus = "";
      this.mutationError = "";
    },
    authorizedRequest(token) {
      return { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 };
    },
    async handleSaveError(error, token) {
      switch (error.response?.status) {
        case 400:
          this.mutationError =
            "Kontrollér titel, kunstner, varighed og udgivelsesår.";
          return;
        case 401:
          if (this.session?.token === token) this.clearSession();
          this.mutationError = "Din session er udløbet. Log ind igen.";
          return;
        case 403:
          this.mutationError =
            "Din konto har ikke adgang til at ændre samlingen.";
          return;
        case 404:
          this.mutationError = "Musikpladen findes ikke længere.";
          break;
        default:
          this.mutationError =
            "Ændringen kunne ikke bekræftes. Kontrollér listen, før du prøver igen.";
      }
      await this.loadRecords();
    },
    applyFilters() {
      this.appliedFilters = {
        title: this.filters.title.trim(),
        artist: this.filters.artist.trim(),
        publicationYear: this.filters.publicationYear,
      };
      this.loadRecords();
    },
    resetFilters() {
      this.filters = { title: "", artist: "", publicationYear: "" };
      this.applyFilters();
    },
    async loadRecords() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(recordsUrl, {
          params: Object.fromEntries(
            Object.entries(this.appliedFilters).filter(
              ([, value]) => value !== "",
            ),
          ),
          timeout: 10000,
        });
        if (!Array.isArray(response.data))
          throw new Error("Invalid API response");
        this.records = response.data;
      } catch {
        this.error =
          "Musiksamlingen kunne ikke hentes. Kontrollér, at serveren kører, og prøv igen.";
      } finally {
        this.loading = false;
      }
    },
    formatDuration(seconds) {
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    },
  },
};
</script>

<template>
  <main id="app">
    <header>
      <span class="brand">DR</span><span>Musikarkivet</span>
      <LoginPanel
        class="login-panel"
        :session="session"
        @signed-in="setSession"
        @signed-out="clearSession"
      ></LoginPanel>
    </header>
    <p class="eyebrow">SAMLINGEN</p>
    <h1>Musik gennem tiden</h1>
    <p>Gå på opdagelse i vores samling af musikplader.</p>
    <RecordForm
      v-if="canManageRecords"
      :key="editingRecord?.id ?? 'new'"
      :busy="saving || loading"
      :editing-record="editingRecord"
      :save-record="editingRecord ? updateRecord : addRecord"
      @cancel="editingRecord = null"
    ></RecordForm>
    <div class="record-feedback">
      <p v-if="mutationStatus" role="status">{{ mutationStatus }}</p>
      <p v-if="mutationError" role="alert">{{ mutationError }}</p>
    </div>
    <form class="filters" @submit.prevent="applyFilters">
      <fieldset :disabled="loading || saving" class="filter-fields">
        <legend class="sr-only">Filtrér musikplader</legend>
        <label for="filter-title"
          >Titel<input id="filter-title" v-model="filters.title" type="search"
        /></label>
        <label for="filter-artist"
          >Kunstner<input
            id="filter-artist"
            v-model="filters.artist"
            type="search"
        /></label>
        <label for="filter-year"
          >Udgivelsesår<input
            id="filter-year"
            v-model="filters.publicationYear"
            type="number"
            min="1"
            max="9999"
            step="1"
        /></label>
        <button type="submit">Søg</button>
        <button type="button" class="reset-filters" @click="resetFilters">
          Nulstil
        </button>
      </fieldset>
    </form>
    <p v-if="loading" role="status">Henter musikplader…</p>
    <div v-else-if="error" role="alert">
      <p>{{ error }}</p>
      <button @click="loadRecords">Prøv igen</button>
    </div>
    <p v-else-if="records.length === 0" role="status">
      {{
        hasFilters
          ? "Ingen musikplader matcher din søgning."
          : "Der er endnu ingen musikplader i samlingen."
      }}
    </p>
    <template v-else>
      <p class="count" role="status">
        {{ records.length }} {{ records.length === 1 ? "plade" : "plader" }}
        {{ hasFilters ? "fundet" : "i samlingen" }}
      </p>
      <div class="table-wrapper">
        <table>
          <caption class="sr-only">
            Musikplader
          </caption>
          <thead>
            <tr>
              <th scope="col">Titel</th>
              <th scope="col">Kunstner</th>
              <th scope="col">Varighed</th>
              <th scope="col">Udgivelsesår</th>
              <th v-if="canManageRecords" scope="col">Handling</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in records"
              :key="record.id"
              data-testid="record-row"
            >
              <td>{{ record.title }}</td>
              <td>{{ record.artist }}</td>
              <td>{{ formatDuration(record.duration) }}</td>
              <td>{{ record.publicationYear }}</td>
              <td v-if="canManageRecords">
                <button
                  type="button"
                  class="edit-record"
                  :disabled="
                    saving || loading || editingRecord?.id === record.id
                  "
                  :aria-label="'Redigér ' + record.title"
                  @click="editRecord(record)"
                >
                  Redigér
                </button>
                <button
                  type="button"
                  class="delete-record"
                  :disabled="saving || loading"
                  :aria-label="'Slet ' + record.title"
                  @click="deleteRecord(record)"
                >
                  Slet
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </main>
</template>
