import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sanction } from '../types';
import { 
  Shield, AlertTriangle, Ban, MessageSquare, Plus, Search,
  ChevronDown, EyeOff 
} from 'lucide-react';

export const Admin: React.FC = () => {
  const { 
    users, grades, sanctions, setSanctions, hasPermission, 
    getEffectiveUser, addLog, isFamilyMember 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'casiers' | 'issue'>('casiers');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [search, setSearch] = useState('');
  
  // Issue sanction form
  const [targetUser, setTargetUser] = useState('');
  const [sanctionType, setSanctionType] = useState<'oral_warning' | 'written_warning' | 'banishment'>('oral_warning');
  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState('');
  
  const user = getEffectiveUser();
  const canViewAllCasiers = hasPermission('view_sanctions');
  const canViewOwnCasier = hasPermission('view_own_sanctions');
  const canIssueSanctions = hasPermission('issue_sanctions');

  const familyMembers = users.filter(u => {
    const grade = grades.find(g => g.name === u.grade);
    return grade?.isFamilyMember;
  });

  const getMemberSanctions = (steamId: string) => {
    return sanctions.filter(s => s.targetId === steamId);
  };

  const getMemberPoints = (steamId: string) => {
    return sanctions.filter(s => s.targetId === steamId).reduce((acc, s) => acc + s.points, 0);
  };

  const getAutoKickThreshold = (grade: string) => {
    const gradeObj = grades.find(g => g.name === grade);
    return gradeObj?.autoKickPoints || 3;
  };

  const shouldAutoKick = (steamId: string) => {
    const member = users.find(u => u.steamId === steamId);
    if (!member) return false;
    
    const points = getMemberPoints(steamId);
    const threshold = getAutoKickThreshold(member.grade);
    return points >= threshold;
  };

  const handleIssueSanction = () => {
    if (!targetUser || !reason.trim()) return;
    
    const target = users.find(u => u.steamId === targetUser);
    if (!target) return;

    const newSanction: Sanction = {
      id: Date.now().toString(),
      targetId: targetUser,
      targetName: target.username,
      issuerId: user?.steamId || '',
      issuerName: user?.username || 'Unknown',
      type: sanctionType,
      points: sanctionType === 'oral_warning' ? 0 : points,
      reason: reason.trim(),
      createdAt: new Date().toISOString()
    };

    setSanctions(prev => [...prev, newSanction]);
    addLog('Sanction', `${user?.username} a infligé un ${sanctionType === 'oral_warning' ? 'warn oral' : sanctionType === 'written_warning' ? `warn écrit (${points} points)` : 'bannissement'} à ${target.username}`);

    // Check auto kick
    const newTotalPoints = getMemberPoints(targetUser) + newSanction.points;
    const threshold = getAutoKickThreshold(target.grade);
    
    if (newTotalPoints >= threshold) {
      addLog('Auto-kick', `${target.username} a été automatiquement expulsé (${newTotalPoints} points >= ${threshold})`);
    }

    // Reset form
    setTargetUser('');
    setReason('');
    setPoints(1);
  };

  const filteredFamilyMembers = familyMembers.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.steamId.includes(search)
  );

  // Check if user has access
  if (!isFamilyMember() || (!canViewAllCasiers && !canViewOwnCasier)) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Vous n'avez pas accès à cette section</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">
          <span style={{ 
            background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            Espace Administratif
          </span>
        </h2>
        <p className="text-gray-400 mt-1">Gestion des sanctions et casiers</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('casiers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'casiers'
              ? 'bg-gradient-to-r from-pink-500/20 to-sky-500/20 text-white border border-pink-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Casiers
        </button>
        {canIssueSanctions && (
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'issue'
                ? 'bg-gradient-to-r from-pink-500/20 to-sky-500/20 text-white border border-pink-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            Sanctionner
          </button>
        )}
      </div>

      {/* Casiers Tab */}
      {activeTab === 'casiers' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un membre..."
              className="w-full pl-10 pr-4 py-3"
            />
          </div>

          {/* Members casiers */}
          <div className="space-y-3">
            {filteredFamilyMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun membre trouvé</p>
              </div>
            ) : (
              filteredFamilyMembers.map(member => {
                const memberSanctions = getMemberSanctions(member.steamId);
                const memberPoints = getMemberPoints(member.steamId);
                const threshold = getAutoKickThreshold(member.grade);
                const isSelected = selectedMember === member.steamId;
                const isExpanded = canViewAllCasiers || (canViewOwnCasier && user?.steamId === member.steamId);

                return (
                  <div
                    key={member.steamId}
                    className="bg-[#12121a] rounded-xl border border-gray-800 overflow-hidden"
                  >
                    <button
                      onClick={() => setSelectedMember(isSelected ? '' : member.steamId)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors"
                    >
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                          {member.username[0].toUpperCase()}
                        </div>
                      )}
                      
                      <div className="flex-1 text-left">
                        <p className="font-semibold">{member.username}</p>
                        <p className="text-sm text-gray-400">{member.grade}</p>
                      </div>

                      <div className="text-right">
                        <p className={`font-bold ${memberPoints >= threshold ? 'text-red-400' : memberPoints > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {memberPoints}/{threshold} points
                        </p>
                        <p className="text-xs text-gray-500">{memberSanctions.length} sanction(s)</p>
                      </div>

                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Expanded view */}
                    {isSelected && (
                      <div className="border-t border-gray-800 p-4">
                        {!isExpanded ? (
                          <p className="text-gray-500 text-center py-4">
                            <EyeOff className="w-5 h-5 mx-auto mb-2 opacity-50" />
                            Vous n'avez pas les permissions pour voir ce casier
                          </p>
                        ) : memberSanctions.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">
                            Aucune sanction
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {memberSanctions.map(sanction => (
                              <div key={sanction.id} className="flex items-center gap-3 p-3 bg-[#1a1a25] rounded-lg">
                                <div className={`w-3 h-3 rounded-full ${
                                  sanction.type === 'banishment' ? 'bg-red-500' :
                                  sanction.type === 'written_warning' ? 'bg-yellow-500' : 'bg-gray-400'
                                }`}></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {sanction.type === 'oral_warning' && 'Warn oral'}
                                    {sanction.type === 'written_warning' && `Warn écrit (${sanction.points} point(s))`}
                                    {sanction.type === 'banishment' && 'Bannissement'}
                                  </p>
                                  <p className="text-sm text-gray-400">{sanction.reason}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Par {sanction.issuerName} • {new Date(sanction.createdAt).toLocaleString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Auto kick warning */}
                        {shouldAutoKick(member.steamId) && (
                          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                            <Ban className="w-5 h-5 text-red-400" />
                            <p className="text-red-300 text-sm">
                              Ce membre a atteint le seuil d'expulsion automatique ({memberPoints}/{threshold} points)
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Issue Sanction Tab */}
      {activeTab === 'issue' && canIssueSanctions && (
        <div className="bg-[#12121a] rounded-2xl p-6 border border-gray-800">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Infliger une sanction
          </h3>

          <div className="space-y-4">
            {/* Target member */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Membre cible</label>
              <select
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                className="w-full"
              >
                <option value="">Sélectionner un membre</option>
                {familyMembers.map(m => (
                  <option key={m.steamId} value={m.steamId}>
                    {m.username} ({m.grade})
                  </option>
                ))}
              </select>
            </div>

            {/* Sanction type */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type de sanction</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => { setSanctionType('oral_warning'); setPoints(0); }}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    sanctionType === 'oral_warning'
                      ? 'border-gray-400 bg-gray-400/10'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 text-gray-400 mb-2" />
                  <p className="font-medium">Warn oral</p>
                  <p className="text-xs text-gray-500">0 point - Simple rappel</p>
                </button>

                <button
                  onClick={() => { setSanctionType('written_warning'); setPoints(1); }}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    sanctionType === 'written_warning'
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mb-2" />
                  <p className="font-medium">Warn écrit</p>
                  <p className="text-xs text-gray-500">1-3 points selon gravité</p>
                </button>

                <button
                  onClick={() => { setSanctionType('banishment'); setPoints(0); }}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    sanctionType === 'banishment'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <Ban className="w-5 h-5 text-red-400 mb-2" />
                  <p className="font-medium">Bannissement</p>
                  <p className="text-xs text-gray-500">Expulsion de la famille</p>
                </button>
              </div>
            </div>

            {/* Points (for written warning) */}
            {sanctionType === 'written_warning' && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre de points</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(p => (
                    <button
                      key={p}
                      onClick={() => setPoints(p)}
                      className={`w-12 h-12 rounded-lg font-bold text-lg transition-colors ${
                        points === p
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Raison</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez la raison de cette sanction..."
                className="w-full h-24 resize-none"
              />
            </div>

            {/* Warning text */}
            {targetUser && (
              <div className="p-3 bg-[#1a1a25] rounded-lg">
                <p className="text-sm text-gray-400">
                  Points actuels: <span className="font-semibold text-white">{getMemberPoints(targetUser)}</span>
                  {sanctionType === 'written_warning' && (
                    <> + {points} = <span className="font-semibold text-white">{getMemberPoints(targetUser) + points}</span></>
                  )}
                  {' / Seuil auto-kick: '}
                  <span className="font-semibold text-white">
                    {getAutoKickThreshold(users.find(u => u.steamId === targetUser)?.grade || '')}
                  </span>
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleIssueSanction}
              disabled={!targetUser || !reason.trim()}
              className="w-full btn-miami py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Appliquer la sanction
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
