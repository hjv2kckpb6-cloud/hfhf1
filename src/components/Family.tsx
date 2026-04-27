import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, Trash2, Shield, AlertTriangle, Calendar, 
  CheckCircle, XCircle, MessageSquare, Users 
} from 'lucide-react';

export const Family: React.FC = () => {
  const { 
    familyMessages, setFamilyMessages, trustedPersons, setTrustedPersons,
    avoidedPersons, setAvoidedPersons, purgeVotes, setPurgeVotes,
    hasPermission, getEffectiveUser, addLog, isFamilyMember
  } = useApp();
  
  const [activeSection, setActiveSection] = useState<'news' | 'trusted' | 'avoided' | 'purge'>('news');
  const [newMessage, setNewMessage] = useState('');
  
  // Trusted person form
  const [trustedName, setTrustedName] = useState('');
  const [trustedSteamId, setTrustedSteamId] = useState('');
  const [trustedNote, setTrustedNote] = useState('');
  
  // Avoided person form
  const [avoidedName, setAvoidedName] = useState('');
  const [avoidedSteamId, setAvoidedSteamId] = useState('');
  const [avoidedReason, setAvoidedReason] = useState('');

  const user = getEffectiveUser();
  const canManageTrusted = hasPermission('manage_trusted');
  const canVotePurge = hasPermission('vote_purge');

  // Get current month/year for purge
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentPurgeVote = purgeVotes.find(p => p.month === currentMonth && p.year === currentYear);
  const hasVotedPurge = user ? currentPurgeVote?.votes.some(v => v.userId === user.steamId) : true;

  // Get next purge date (first Saturday of next month at 21h)
  const getNextPurgeDate = () => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);
    while (next.getDay() !== 6) {
      next.setDate(next.getDate() + 1);
    }
    next.setHours(21, 0, 0, 0);
    return next;
  };

  const handleAddTrusted = () => {
    if (!trustedName.trim() || !trustedSteamId.trim()) return;
    
    const newTrusted = {
      id: Date.now().toString(),
      name: trustedName.trim(),
      steamId: trustedSteamId.trim(),
      addedBy: user?.username || 'Unknown',
      addedAt: new Date().toISOString(),
      note: trustedNote.trim() || undefined
    };
    
    setTrustedPersons(prev => [...prev, newTrusted]);
    addLog('Personne de confiance', `Ajout de ${trustedName} comme personne de confiance`);
    setTrustedName('');
    setTrustedSteamId('');
    setTrustedNote('');
  };

  const handleAddAvoided = () => {
    if (!avoidedName.trim() || !avoidedSteamId.trim() || !avoidedReason.trim()) return;
    
    const newAvoided = {
      id: Date.now().toString(),
      name: avoidedName.trim(),
      steamId: avoidedSteamId.trim(),
      addedBy: user?.username || 'Unknown',
      addedAt: new Date().toISOString(),
      reason: avoidedReason.trim()
    };
    
    setAvoidedPersons(prev => [...prev, newAvoided]);
    addLog('Personne à éviter', `Ajout de ${avoidedName} comme personne à éviter`);
    setAvoidedName('');
    setAvoidedSteamId('');
    setAvoidedReason('');
  };

  const handleVotePurge = (present: boolean) => {
    if (!user || !canVotePurge) return;
    
    const vote = {
      userId: user.steamId,
      userName: user.username,
      present,
      timestamp: new Date().toISOString()
    };
    
    if (currentPurgeVote) {
      setPurgeVotes(prev => prev.map(p => 
        p.month === currentMonth && p.year === currentYear
          ? { ...p, votes: [...p.votes.filter(v => v.userId !== user.steamId), vote] }
          : p
      ));
    } else {
      setPurgeVotes(prev => [...prev, {
        id: Date.now().toString(),
        month: currentMonth,
        year: currentYear,
        votes: [vote]
      }]);
    }
    
    addLog('Vote purge', `${user.username} a voté ${present ? 'présent' : 'absent'} pour la purge`);
  };

  const handleAddNews = () => {
    if (!newMessage.trim()) return;
    const message = {
      id: Date.now().toString(),
      type: 'manual' as const,
      content: newMessage.trim(),
      author: user?.username,
      timestamp: new Date().toISOString()
    };
    setFamilyMessages([message]);
    setNewMessage('');
  };

  const handleDeleteNews = (id: string) => {
    setFamilyMessages(prev => prev.filter(m => m.id !== id));
  };

  const sections = [
    { id: 'news', label: 'Actualités', icon: MessageSquare },
    { id: 'trusted', label: 'Personnes de confiance', icon: Shield },
    { id: 'avoided', label: 'Personnes à éviter', icon: AlertTriangle },
    { id: 'purge', label: 'Purge mensuelle', icon: Calendar },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">
          <span className="font-handwriting" style={{ 
            background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            Famille
          </span>
        </h2>
        <p className="text-gray-400 mt-1">Espace interne de la famille</p>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-pink-500/20 to-sky-500/20 text-white border border-pink-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* News Section */}
      {activeSection === 'news' && (
        <div className="space-y-4">
          {/* Add news form (for family members) */}
          {isFamilyMember() && (
            <div className="bg-[#12121a] rounded-xl p-4 border border-gray-800">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ajouter une actualité..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNews()}
                />
                <button
                  onClick={handleAddNews}
                  disabled={!newMessage.trim()}
                  className="btn-miami px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Messages list */}
          <div className="space-y-3">
            {familyMessages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune actualité pour le moment</p>
              </div>
            ) : (
              familyMessages.map(msg => (
                <div key={msg.id} className="bg-[#12121a] rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    {msg.type === 'auto' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-sky-500/20 text-sky-300">
                        Auto
                      </span>
                    )}
                    {msg.author && (
                      <span className="text-gray-400 text-sm">par {msg.author}</span>
                    )}
                    <span className="text-gray-600 text-sm ml-auto">
                      {new Date(msg.timestamp).toLocaleString('fr-FR')}
                    </span>
                    {isFamilyMember() && (
                      <button
                        onClick={() => handleDeleteNews(msg.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1 ml-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-300">{msg.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Trusted Persons Section */}
      {activeSection === 'trusted' && (
        <div className="space-y-4">
          {/* Add form */}
          {canManageTrusted && (
            <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Ajouter une personne de confiance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={trustedName}
                  onChange={(e) => setTrustedName(e.target.value)}
                  placeholder="Nom"
                />
                <input
                  type="text"
                  value={trustedSteamId}
                  onChange={(e) => setTrustedSteamId(e.target.value)}
                  placeholder="SteamID"
                />
                <input
                  type="text"
                  value={trustedNote}
                  onChange={(e) => setTrustedNote(e.target.value)}
                  placeholder="Note (optionnel)"
                />
              </div>
              <button
                onClick={handleAddTrusted}
                disabled={!trustedName.trim() || !trustedSteamId.trim()}
                className="mt-3 btn-miami px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          )}

          {/* List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trustedPersons.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune personne de confiance</p>
              </div>
            ) : (
              trustedPersons.map(person => (
                <div key={person.id} className="bg-[#12121a] rounded-xl p-4 border border-green-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-green-300">{person.name}</p>
                      <p className="text-gray-400 text-sm font-mono">{person.steamId}</p>
                      {person.note && (
                        <p className="text-gray-500 text-sm mt-1">{person.note}</p>
                      )}
                    </div>
                    {canManageTrusted && (
                      <button
                        onClick={() => setTrustedPersons(prev => prev.filter(p => p.id !== person.id))}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs mt-2">
                    Ajouté par {person.addedBy} le {new Date(person.addedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Avoided Persons Section */}
      {activeSection === 'avoided' && (
        <div className="space-y-4">
          {/* Add form */}
          {canManageTrusted && (
            <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Ajouter une personne à éviter
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={avoidedName}
                  onChange={(e) => setAvoidedName(e.target.value)}
                  placeholder="Nom"
                />
                <input
                  type="text"
                  value={avoidedSteamId}
                  onChange={(e) => setAvoidedSteamId(e.target.value)}
                  placeholder="SteamID"
                />
                <input
                  type="text"
                  value={avoidedReason}
                  onChange={(e) => setAvoidedReason(e.target.value)}
                  placeholder="Raison"
                />
              </div>
              <button
                onClick={handleAddAvoided}
                disabled={!avoidedName.trim() || !avoidedSteamId.trim() || !avoidedReason.trim()}
                className="mt-3 btn-miami px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          )}

          {/* List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {avoidedPersons.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune personne à éviter</p>
              </div>
            ) : (
              avoidedPersons.map(person => (
                <div key={person.id} className="bg-[#12121a] rounded-xl p-4 border border-yellow-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-yellow-300">{person.name}</p>
                      <p className="text-gray-400 text-sm font-mono">{person.steamId}</p>
                      <p className="text-gray-500 text-sm mt-1">Raison: {person.reason}</p>
                    </div>
                    {canManageTrusted && (
                      <button
                        onClick={() => setAvoidedPersons(prev => prev.filter(p => p.id !== person.id))}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs mt-2">
                    Ajouté par {person.addedBy} le {new Date(person.addedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Purge Section */}
      {activeSection === 'purge' && (
        <div className="space-y-4">
          {/* Purge info */}
          <div className="bg-[#12121a] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-8 h-8 text-pink-400" />
              <div>
                <h3 className="font-semibold text-lg">Prochaine purge</h3>
                <p className="text-gray-400">
                  {getNextPurgeDate().toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              La purge a lieu tous les premiers samedis de chaque mois à 21h. 
              Chaque membre de la famille doit indiquer sa présence.
            </p>
          </div>

          {/* Vote section */}
          {canVotePurge && isFamilyMember() && (
            <div className="bg-[#12121a] rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-4">Votre présence</h3>
              {hasVotedPurge ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Vous avez déjà voté pour ce mois</span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVotePurge(true)}
                    className="flex-1 py-3 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Présent
                  </button>
                  <button
                    onClick={() => handleVotePurge(false)}
                    className="flex-1 py-3 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <XCircle className="w-5 h-5" />
                    Absent
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Votes list */}
          {currentPurgeVote && currentPurgeVote.votes.length > 0 && (
            <div className="bg-[#12121a] rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-4">
                Votes du mois ({currentPurgeVote.votes.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentPurgeVote.votes.map(vote => (
                  <div key={vote.userId} className="flex items-center gap-3 p-3 bg-[#1a1a25] rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${vote.present ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <div className="flex-1">
                      <p className="font-medium">{vote.userName}</p>
                      <p className={`text-sm font-medium ${vote.present ? 'text-green-400' : 'text-red-400'}`}>
                        {vote.present ? 'Présent' : 'Absent'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Stats */}
              <div className="mt-4 pt-4 border-t border-gray-800 flex gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-sm">
                    <span className="font-semibold text-green-400">
                      {currentPurgeVote.votes.filter(v => v.present).length}
                    </span> présents
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-400" />
                  <span className="text-sm">
                    <span className="font-semibold text-red-400">
                      {currentPurgeVote.votes.filter(v => !v.present).length}
                    </span> absents
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
