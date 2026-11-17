<script>
export default {
    props: ['busy', 'editingRecord', 'saveRecord'],
    emits: ['cancel'],
    data() {
        return { record: { ...this.editingRecord } };
    },
    mounted() {
        if (this.editingRecord) this.$refs.title.focus();
    },
    methods: {
        async submit() {
            if (!this.record.title || !this.record.artist || this.busy) return;
            if (await this.saveRecord(this.record)) this.record = {};
        }
    }
}
</script>

<template>
    <section aria-labelledby="record-form-heading" class="record-form">
        <h2 id="record-form-heading">{{ editingRecord ? 'Redigér musikplade' : 'Tilføj musikplade' }}</h2>
        <form @submit.prevent="submit">
            <fieldset class="filter-fields" :disabled="busy">
                <label>Titel<input id="record-title" ref="title" v-model.trim="record.title" maxlength="200" required></label>
                <label>Kunstner<input id="record-artist" v-model.trim="record.artist" maxlength="200" required></label>
                <label>Varighed i sekunder<input id="record-duration" v-model.number="record.duration" type="number" min="1" max="2147483647" required></label>
                <label>Udgivelsesår<input id="record-year" v-model.number="record.publicationYear" type="number" min="1" max="9999" required></label>
                <button type="submit">{{ editingRecord ? 'Gem ændringer' : 'Tilføj' }}</button>
                <button v-if="editingRecord" type="button" @click="$emit('cancel')">Annullér</button>
            </fieldset>
        </form>
    </section>
</template>
