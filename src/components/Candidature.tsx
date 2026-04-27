import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Application, Vote } from '../types';
import { Send, Check, X, MessageSquare, Users, Clock } from 'lucide-react';

export const Candidature: React.FC = () => {
  const { 
    currentUser, applications, setApplications, hasPermission, 
    getEffectiveUser, addLog, setNotifications 
  } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [whyJoin, setWhyJoin] = useState('');
  const [voteComment, setVoteComment] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  const user = getEffectiveUser();
  const canVote = hasPermission('vote_applications');
  const canManage = hasPermission('manage_applications');

  const handleSubmitApplication = () => {
    if (!currentUser || !motivation.trim() || !whyJoin.trim()) return;

    const newApp: Application = {
      id: Date.now().toString(),
      applicantName: currentUser.username,
      applicantSteamId: currentUser.steamId,
      applicantAvatar: currentUser.avatar,
      motivation: motivation.trim(),
      whyJoin: whyJoin.trim(),
      status: 'pending',
      votes: [],
      createdAt: new Date().toISOString()
    };

    setApplications(prev => [...prev, newApp]);
    setShowForm(false);
    setMotivation('');
    setWhyJoin('');

    addLog('Candidature', `${currentUser.username} a soumis une candidature`);

    // Notify admins
    setNotifications(prev => [...prev, {
      id: Date.now().toString(),
      type: 'application',
      title: 'Nouvelle candidature',
      message: `${currentUser.username} a soumis une candidature`,
      read: false,
      timestamp: new Date().toISOString(),
      link: 'candidature'
    }]);
  };

  const handleVote = (appId: string, vote: 'accept' | 'reject') => {
    if (!user) return;

    const app = applications.find(a => a.id === appId);
    if (!app) return;

    // Check if user already voted
    const existingVote = app.votes.find(v => v.voterId === user.steamId);
    if (existingVote) return;

    const newVote: Vote = {
      voterId: user.steamId,
      voterName: user.username,
      vote,
      comment: voteComment.trim() || undefined,
      timestamp: new Date().toISOString()
    };

    setApplications(prev => prev.map(a => 
      a.id === appId ? { ...a, votes: [...a.votes, newVote] } : a
    ));

    addLog('Vote', `${user.username} a voté ${vote === 'accept' ? 'pour' : 'contre'} la candidature de ${app.applicantName}`);
    setVoteComment('');
  };

  const handleDecision = (appId: string, decision: 'accepted' | 'rejected') => {
    if (!user) return;

    setApplications(prev => prev.map(a => 
      a.id === appId ? { 
        ...a, 
        status: decision,
        decidedAt: new Date().toISOString(),
        decidedBy: user.username
      } : a
    ));

    const app = applications.find(a => a.id === appId);
    if (app) {
      addLog('Décision', `${user.username} a ${decision === 'accepted' ? 'accepté' : 'refusé'} la candidature de ${app.applicantName}`);
      
      // Notify applicant
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        type: 'decision',
        title: decision === 'accepted' ? 'Candidature acceptée' : 'Candidature refusée',
        message: decision === 'accepted' 
          ? 'Félicitations ! Votre candidature a été acceptée.'
          : 'Votre candidature a été refusée. Vous pouvez postuler à nouveau plus tard.',
        read: false,
        timestamp: new Date().toISOString(),
        link: 'candidature'
      }]);
    }
  };

  const filteredApps = applications.filter(app => 
    filter === 'all' || app.status === filter
  );

  const userHasVoted = (app: Application) => {
    return user ? app.votes.some(v => v.voterId === user.steamId) : true;
  };

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
              Candidatures
            </span>
          </h2>
          <p className="text-gray-400 mt-1">Postulez pour rejoindre la famille</p>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-miami px-6 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          Nouvelle candidature
        </button>
      </div>

      {/* Application Form */}
      {showForm && (
        <div className="bg-[#12121a] rounded-2xl p-6 border border-gray-800 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">Formulaire de candidature</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Lettre de motivation
              </label>
              <textarea
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="Présentez-vous et expliquez votre parcours de joueur..."
                className="w-full h-32 resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Pourquoi souhaitez-vous rejoindre la famille ?
              </label>
              <textarea
                value={whyJoin}
                onChange={(e) => setWhyJoin(e.target.value)}
                placeholder="Expliquez ce qui vous attire dans notre famille..."
                className="w-full h-32 resize-none"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSubmitApplication}
                disabled={!motivation.trim() || !whyJoin.trim()}
                className="btn-miami px-6 py-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Soumettre ma candidature
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-xl font-medium bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Toutes' },
          { value: 'pending', label: 'En attente' },
          { value: 'accepted', label: 'Acceptées' },
          { value: 'rejected', label: 'Refusées' }
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApps.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune candidature {filter !== 'all' ? `avec le filtre "${filter}"` : ''}</p>
          </div>
        ) : (
          filteredApps.map(app => (
            <div
              key={app.id}
              className="bg-[#12121a] rounded-xl border border-gray-800 overflow-hidden card-hover"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {app.applicantAvatar && (
                    <img
                      src={app.applicantAvatar}
                      alt={app.applicantName}
                      className="w-14 h-14 rounded-full border-2 border-gray-700"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{app.applicantName}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        app.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {app.status === 'pending' ? 'En attente' :
                         app.status === 'accepted' ? 'Accepté' : 'Refusé'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-400 flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4" />
                      {new Date(app.createdAt).toLocaleString('fr-FR')}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-300">Motivation:</p>
                        <p className="text-gray-400 text-sm">{app.motivation}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-300">Pourquoi rejoindre:</p>
                        <p className="text-gray-400 text-sm">{app.whyJoin}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Votes */}
                {canVote && app.status === 'pending' && (
                  <div className="mt-5 pt-5 border-t border-gray-800">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">Votes ({app.votes.length})</span>
                    </div>
                    
                    {/* Vote buttons */}
                    {!userHasVoted(app) && (
                      <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <input
                          type="text"
                          value={voteComment}
                          onChange={(e) => setVoteComment(e.target.value)}
                          placeholder="Commentaire (optionnel)"
                          className="flex-1"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVote(app.id, 'accept')}
                            className="px-4 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Accepter
                          </button>
                          <button
                            onClick={() => handleVote(app.id, 'reject')}
                            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Refuser
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Votes list */}
                    {app.votes.length > 0 && (
                      <div className="space-y-2">
                        {app.votes.map(vote => (
                          <div key={vote.voterId} className="flex items-center gap-3 p-3 bg-[#1a1a25] rounded-lg">
                            <div className={`w-3 h-3 rounded-full ${
                              vote.vote === 'accept' ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                            <span className="font-medium text-sm">{vote.voterName}</span>
                            <span className="text-gray-500 text-sm">•</span>
                            <span className={`text-sm ${
                              vote.vote === 'accept' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {vote.vote === 'accept' ? 'Accepte' : 'Refuse'}
                            </span>
                            {vote.comment && (
                              <span className="text-gray-500 text-sm">- "{vote.comment}"</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Admin decision */}
                {canManage && app.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-gray-800 flex gap-3">
                    <button
                      onClick={() => handleDecision(app.id, 'accepted')}
                      className="px-4 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
                    >
                      Accepter définitivement
                    </button>
                    <button
                      onClick={() => handleDecision(app.id, 'rejected')}
                      className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                    >
                      Refuser définitivement
                    </button>
                  </div>
                )}

                {/* Decision info */}
                {app.decidedAt && (
                  <div className="mt-4 pt-4 border-t border-gray-800 text-sm text-gray-500">
                    Décision prise par {app.decidedBy} le {new Date(app.decidedAt).toLocaleString('fr-FR')}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
