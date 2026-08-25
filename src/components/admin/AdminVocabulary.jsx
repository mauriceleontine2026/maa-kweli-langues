import { useEffect, useState } from "react";
import { createVocabulary, deleteVocabulary, enrichVocabulary, getAllVocabulary, updateVocabulary } from "@/api/languageService";
import { Plus, Trash2, Search, Pencil, Check, X, Sparkles, Loader2 } from "lucide-react";

export default function AdminVocabulary({ languages }) {
  const [vocab, setVocab] = useState([]);
  const [search, setSearch] = useState("");
  const [filterLang, setFilterLang] = useState("");
  const [newVocab, setNewVocab] = useState({ language_code: "", word: "", translation_fr: "", phonetic: "", phonetic_simple: "", example_target: "", example_fr: "", category: "", lesson_number: 1 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(/** @type {any} */ ({}));
  const [enrichingId, setEnrichingId] = useState(null);
  const [enrichment, setEnrichment] = useState(null);
  const [enrichmentMsg, setEnrichmentMsg] = useState("");

  const fetchVocab = async () => {
    const data = await getAllVocabulary();
    setVocab(Array.isArray(data) ? data : []);
  };
  useEffect(() => { fetchVocab(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      await createVocabulary(newVocab);
      setMsg("✅ Mot ajouté !");
      setNewVocab({ ...newVocab, word: "", translation_fr: "", phonetic: "", phonetic_simple: "", example_target: "", example_fr: "" });
      fetchVocab();
    } catch (err) { setMsg("❌ " + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce mot ?")) return;
    await deleteVocabulary(id);
    fetchVocab();
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setEditForm({ word: v.word, translation_fr: v.translation_fr, phonetic: v.phonetic || "", phonetic_simple: v.phonetic_simple || "", example_target: v.example_target || "", example_fr: v.example_fr || "" });
  };

  const saveEdit = async () => {
    await updateVocabulary(editingId, editForm);
    setEditingId(null);
    fetchVocab();
  };

  const previewEnrichment = async (id) => {
    setEnrichingId(id);
    setEnrichment(null);
    setEnrichmentMsg("");
    try {
      setEnrichment(await enrichVocabulary(id));
    } catch (err) {
      setEnrichmentMsg("❌ " + err.message);
    } finally {
      setEnrichingId(null);
    }
  };

  const applyEnrichment = async () => {
    if (!enrichment?.item_id) return;
    setEnrichingId(enrichment.item_id);
    setEnrichmentMsg("");
    try {
      await enrichVocabulary(enrichment.item_id, true);
      setEnrichmentMsg("✅ Correction appliquée.");
      setEnrichment(null);
      fetchVocab();
    } catch (err) {
      setEnrichmentMsg("❌ " + err.message);
    } finally {
      setEnrichingId(null);
    }
  };

  const inputCls = "w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

  const filtered = vocab.filter(v =>
    (!filterLang || v.language_code === filterLang) &&
    (!search || v.word?.toLowerCase().includes(search.toLowerCase()) || v.translation_fr?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Add form */}
      <form onSubmit={handleSave} className="bg-card rounded-2xl p-5 border border-border space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Ajouter un mot</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Langue *</label>
            <select value={newVocab.language_code} onChange={e => setNewVocab({ ...newVocab, language_code: e.target.value })} className={inputCls} required>
              <option value="">Choisir...</option>
              {languages.map(l => <option key={l.code} value={l.code}>{l.name_fr}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>N° Leçon</label>
            <input type="number" min="1" value={newVocab.lesson_number} onChange={e => setNewVocab({ ...newVocab, lesson_number: parseInt(e.target.value) })} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Mot *</label>
            <input value={newVocab.word} onChange={e => setNewVocab({ ...newVocab, word: e.target.value })} className={inputCls} required placeholder="Ex: Jaaraama" />
          </div>
          <div>
            <label className={labelCls}>Traduction fr *</label>
            <input value={newVocab.translation_fr} onChange={e => setNewVocab({ ...newVocab, translation_fr: e.target.value })} className={inputCls} required placeholder="Ex: Bonjour" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Phonétique IPA</label>
            <input value={newVocab.phonetic} onChange={e => setNewVocab({ ...newVocab, phonetic: e.target.value })} className={inputCls} placeholder="/dja-ra-ma/" />
          </div>
          <div>
            <label className={labelCls}>Phonétique simple</label>
            <input value={newVocab.phonetic_simple} onChange={e => setNewVocab({ ...newVocab, phonetic_simple: e.target.value })} className={inputCls} placeholder="dja-ra-ma" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Exemple (cible)</label>
            <input value={newVocab.example_target} onChange={e => setNewVocab({ ...newVocab, example_target: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Traduction exemple</label>
            <input value={newVocab.example_fr} onChange={e => setNewVocab({ ...newVocab, example_fr: e.target.value })} className={inputCls} />
          </div>
        </div>
        {msg && <p className="text-sm text-center">{msg}</p>}
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60">
          <Plus size={16} /> {saving ? "Ajout..." : "Ajouter"}
        </button>
      </form>

      {/* List */}
      <div>
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <Sparkles size={17} className="shrink-0 text-primary" />
          <span><b>Perplexity :</b> cliquez sur <b>Analyser avec Perplexity</b> pour vérifier et enrichir une entrée.</span>
        </div>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <select value={filterLang} onChange={e => setFilterLang(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm">
            <option value="">Toutes</option>
            {languages.map(l => <option key={l.code} value={l.code}>{l.name_fr}</option>)}
          </select>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.map(v => {
            const lang = languages.find(l => l.code === v.language_code);
            if (editingId === v.id) {
              return (
                <div key={v.id} className="bg-card rounded-xl p-3 border border-primary/40 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{lang?.flag_emoji || "🌍"}</span>
                    <span className="text-xs text-muted-foreground">Édition</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editForm.word} onChange={e => setEditForm({ ...editForm, word: e.target.value })} className="w-full border border-border bg-background rounded-lg px-2.5 py-1.5 text-sm" placeholder="Mot" />
                    <input value={editForm.translation_fr} onChange={e => setEditForm({ ...editForm, translation_fr: e.target.value })} className="w-full border border-border bg-background rounded-lg px-2.5 py-1.5 text-sm" placeholder="Traduction" />
                    <input value={editForm.phonetic} onChange={e => setEditForm({ ...editForm, phonetic: e.target.value })} className="w-full border border-border bg-background rounded-lg px-2.5 py-1.5 text-sm" placeholder="Phonétique IPA" />
                    <input value={editForm.phonetic_simple} onChange={e => setEditForm({ ...editForm, phonetic_simple: e.target.value })} className="w-full border border-border bg-background rounded-lg px-2.5 py-1.5 text-sm" placeholder="Phonétique simple" />
                    <input value={editForm.example_target} onChange={e => setEditForm({ ...editForm, example_target: e.target.value })} className="w-full border border-border bg-background rounded-lg px-2.5 py-1.5 text-sm" placeholder="Exemple" />
                    <input value={editForm.example_fr} onChange={e => setEditForm({ ...editForm, example_fr: e.target.value })} className="w-full border border-border bg-background rounded-lg px-2.5 py-1.5 text-sm" placeholder="Traduction exemple" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:opacity-90 transition">
                      <Check size={14} /> Enregistrer
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-sm font-medium hover:bg-secondary/70 transition">
                      <X size={14} /> Annuler
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={v.id} className="bg-card rounded-xl p-3 border border-border space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{lang?.flag_emoji || "🌍"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm">{v.word} <span className="text-muted-foreground">→ {v.translation_fr}</span></div>
                    {v.phonetic && <div className="text-xs text-primary font-mono">{v.phonetic}</div>}
                  </div>
                  <button onClick={() => previewEnrichment(v.id)} disabled={enrichingId === v.id} title="Analyser avec Perplexity" className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50">
                    {enrichingId === v.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Analyser avec Perplexity
                  </button>
                  <button onClick={() => startEdit(v)} title="Modifier" className="text-blue-500 hover:bg-blue-500/10 p-2 rounded-lg transition">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(v.id)} title="Supprimer" className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition">
                    <Trash2 size={16} />
                  </button>
                </div>
                {enrichment?.item_id === v.id && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2 text-xs">
                    <div className="font-semibold text-primary">Proposition Perplexity</div>
                    <div><b>Traduction :</b> {enrichment.translation_fr}</div>
                    <div><b>Phonétique :</b> {enrichment.phonetic}</div>
                    <div><b>Exemple :</b> {enrichment.example_target} → {enrichment.example_fr}</div>
                    <div><b>Contexte :</b> {enrichment.usage_context}</div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={applyEnrichment} disabled={enrichingId === v.id} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground disabled:opacity-50">
                        {enrichingId === v.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Appliquer
                      </button>
                      <button onClick={() => setEnrichment(null)} className="rounded-lg bg-secondary px-3 py-1.5 text-muted-foreground">Ignorer</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Aucun mot</p>}
        </div>
        {enrichmentMsg && <p className="mt-3 text-center text-sm">{enrichmentMsg}</p>}
      </div>
    </div>
  );
}