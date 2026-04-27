import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Database, Plus, Trash2, Search, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface SteamIdEntry {
  id: string;
  name: string;
  steamId: string;
  addedBy: string;
  addedAt: string;
  note?: string;
}

const PAGE_SIZE = 10;

export const SteamIdManager: React.FC = () => {
  const { hasPermission, addLog, getEffectiveUser } = useApp();
  const [entries, setEntries] = useState<SteamIdEntry[]>(() => {
    const saved = localStorage.getItem('fm_steamid_entries');
    return saved ? JSON.parse(saved) : [];
  });
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSteamId, setNewSteamId] = useState('');
  const [newNote, setNewNote] = useState('');
  const [expanded, setExpanded] = useState(false);

  const user = getEffectiveUser();
  const canView = hasPermission('view_steamid');
  const canAdd = hasPermission('add_steamid');

  React.useEffect(() => {
    localStorage.setItem('fm_steamid_entries', JSON.stringify(entries));
  }, [entries]);

  const handleAdd = () => {
    if (!newName.trim() || !newSteamId.trim()) return;
    const newEntry: SteamIdEntry = {
      id: Date.now().toString(),
      name: newName.trim(),
      steamId: newSteamId.trim(),
      addedBy: user?.username || 'Unknown',
      addedAt: new Date().toISOString(),
      note: newNote.trim() || undefined
    };
    setEntries(prev => [...prev, newEntry]);
    addLog('SteamID', `Ajout de ${newName} avec le SteamID ${newSteamId}`);
    setNewName('');
    setNewSteamId('');
    setNewNote('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      setEntries(prev => prev.filter(e => e.id !== id));
      addLog('SteamID', `Suppression de ${entry.name} (${entry.steamId})`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredEntries = entries.filter(entry =>
    entry.name.toLowerCase().includes(search.toLowerCase()) ||
    entry.steamId.includes(search)
  );

  const visibleEntries = expanded ? filteredEntries : filteredEntries.slice(0, PAGE_SIZE);
  const hiddenCount = filteredEntries.length - PAGE_SIZE;

  if (!canView) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Vous n'avez pas accès à cette section</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            <span style={{
              background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              SteamID Manager
            </span>
          </h2>
          <p className="text-gray-400 mt-1">Base de données des SteamID</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-miami px-4 py-2 rounded-xl font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && canAdd && (
        <div className="bg-[#12121a] rounded-2xl p-6 border border-gray-800 animate-fade-in">
          <h3 className="font-semibold mb-4">Ajouter un SteamID</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom du joueur" className="w-full" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">SteamID</label>
              <input type="text" value={newSteamId} onChange={(e) => setNewSteamId(e.target.value)} placeholder="76561198000000000" className="w-full" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Note (optionnel)</label>
              <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Note ou description" className="w-full" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdd} disabled={!newName.trim() || !newSteamId.trim()} className="btn-miami px-4 py-2 rounded-lg font-medium disabled:opacity-50">Ajouter</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700">Annuler</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setExpanded(false); }}
          placeholder="Rechercher par nom ou SteamID..."
          className="w-full pl-10 pr-4 py-3"
        />
      </div>

      {/* Entries list */}
      <div className="bg-[#12121a] rounded-2xl border border-gray-800 overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{entries.length === 0 ? 'Aucun SteamID enregistré' : 'Aucun résultat trouvé'}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-800">
              {visibleEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400/20 to-sky-400/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold">{entry.name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{entry.name}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-gray-400 font-mono">{entry.steamId}</code>
                      <button onClick={() => copyToClipboard(entry.steamId)} className="text-gray-500 hover:text-pink-400 transition-colors" title="Copier"><Copy className="w-3 h-3" /></button>
                      <a href={`https://steamcommunity.com/profiles/${entry.steamId}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-sky-400 transition-colors" title="Profil Steam"><ExternalLink className="w-3 h-3" /></a>
                    </div>
                    {entry.note && <p className="text-gray-500 text-sm mt-1">{entry.note}</p>}
                  </div>
                  <div className="text-right text-sm text-gray-500 hidden md:block">
                    <p>Ajouté par {entry.addedBy}</p>
                    <p>{new Date(entry.addedAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <button onClick={() => handleDelete(entry.id)} className="text-gray-500 hover:text-red-400 transition-colors p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>

            {/* Flèche pour afficher plus / moins */}
            {hiddenCount > 0 && (
              <button
                onClick={() => setExpanded(prev => !prev)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800/40 transition-colors border-t border-gray-800"
              >
                {expanded ? (
                  <><ChevronUp className="w-4 h-4" /> Masquer</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Voir {hiddenCount} personne{hiddenCount > 1 ? 's' : ''} de plus</>
                )}
              </button>
            )}
          </>
        )}
      </div>

      <div className="text-center text-gray-500 text-sm">
        {entries.length} SteamID{entries.length > 1 ? 's' : ''} enregistré{entries.length > 1 ? 's' : ''}
      </div>
    </div>
  );
};
