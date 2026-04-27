import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { defaultPermissions } from '../context/AppContext';
import { Grade } from '../types';
import { 
  Users, Layers, Plus, Trash2, Edit3, Save, X,
  Eye, Activity, UserMinus, UserPlus, Pencil
} from 'lucide-react';

export const Gestion: React.FC = () => {
  const { 
    users, setUsers, grades, setGrades, logs, setLogs, hasPermission, 
    addLog, getEffectiveUser, setImpersonateRole 
  } = useApp();
  
  const [activeSection, setActiveSection] = useState<'grades' | 'members' | 'logs' | 'impersonate'>('grades');
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [renamingGrade, setRenamingGrade] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newGrade, setNewGrade] = useState({ name: '', color: '#FFB6C1', autoKickPoints: 3, isFamilyMember: true });
  const [showNewGradeForm, setShowNewGradeForm] = useState(false);
  
  // Member management
  const [selectedMember, setSelectedMember] = useState('');
  const [newGradeName, setNewGradeName] = useState('');

  const user = getEffectiveUser();
  const canManageGrades = hasPermission('manage_grades');
  const canManageMembers = hasPermission('manage_members');
  const canViewLogs = hasPermission('view_logs');
  const canImpersonate = hasPermission('impersonate');

  const handleCreateGrade = () => {
    if (!newGrade.name.trim()) return;
    
    const grade: Grade = {
      id: Date.now().toString(),
      name: newGrade.name.trim(),
      color: newGrade.color,
      autoKickPoints: newGrade.autoKickPoints,
      isFamilyMember: newGrade.isFamilyMember,
      permissions: []
    };
    
    setGrades(prev => [...prev, grade]);
    addLog('Grade', `Création du grade "${grade.name}"`);
    setShowNewGradeForm(false);
    setNewGrade({ name: '', color: '#FFB6C1', autoKickPoints: 3, isFamilyMember: true });
  };

  const handleUpdateGradePermissions = (gradeId: string, permissionId: string, granted: boolean) => {
    setGrades(prev => prev.map(g => {
      if (g.id !== gradeId) return g;
      
      const existingPermission = g.permissions.find(p => p.id === permissionId);
      if (existingPermission) {
        return {
          ...g,
          permissions: g.permissions.map(p => 
            p.id === permissionId ? { ...p, granted } : p
          )
        };
      } else {
        const permDef = defaultPermissions.find(p => p.id === permissionId);
        return {
          ...g,
          permissions: [...g.permissions, {
            id: permissionId,
            name: permDef?.name || permissionId,
            description: permDef?.description || '',
            granted
          }]
        };
      }
    }));
  };

  const handleDeleteGrade = (gradeId: string) => {
    const grade = grades.find(g => g.id === gradeId);
    if (grade) {
      setGrades(prev => prev.filter(g => g.id !== gradeId));
      addLog('Grade', `Suppression du grade "${grade.name}"`);
    }
  };

  const handleRenameGrade = (gradeId: string) => {
    if (!renameValue.trim()) return;
    const grade = grades.find(g => g.id === gradeId);
    if (grade) {
      const oldName = grade.name;
      const newName = renameValue.trim();
      setGrades(prev => prev.map(g => g.id === gradeId ? { ...g, name: newName } : g));
      setUsers(prev => prev.map(u => u.grade === oldName ? { ...u, grade: newName } : u));
      addLog('Grade', `Renommage du grade "${oldName}" → "${newName}"`);
    }
    setRenamingGrade(null);
    setRenameValue('');
  };

  const handleClearLogs = () => {
    setLogs([]);
    localStorage.removeItem('fm_logs');
  };

  const handleChangeMemberGrade = (memberId: string) => {
    if (!newGradeName) return;
    
    const member = users.find(u => u.steamId === memberId);
    if (member) {
      setUsers(prev => prev.map(u => 
        u.steamId === memberId ? { ...u, grade: newGradeName } : u
      ));
      addLog('Membre', `Changement de grade de ${member.username} vers "${newGradeName}"`);
    }
    setSelectedMember('');
    setNewGradeName('');
  };

  const handleDeleteMember = (memberId: string) => {
    const member = users.find(u => u.steamId === memberId);
    if (member) {
      setUsers(prev => prev.filter(u => u.steamId !== memberId));
      addLog('Membre', `Suppression de ${member.username}`);
    }
  };

  const handleImpersonate = (gradeName: string) => {
    setImpersonateRole(gradeName);
    addLog('Impersonation', `${user?.username} utilise la vue "${gradeName}"`);
  };

  const sections = [
    { id: 'grades', label: 'Gestion des grades', icon: Layers, show: canManageGrades },
    { id: 'members', label: 'Gestion des membres', icon: Users, show: canManageMembers },
    { id: 'logs', label: 'Logs d\'activité', icon: Activity, show: canViewLogs },
    { id: 'impersonate', label: 'Tester les rôles', icon: Eye, show: canImpersonate },
  ];

  const visibleSections = sections.filter(s => s.show);

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
            Gestion
          </span>
        </h2>
        <p className="text-gray-400 mt-1">Administration de la famille</p>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {visibleSections.map(section => {
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

      {/* Grades Management */}
      {activeSection === 'grades' && canManageGrades && (
        <div className="space-y-4">
          {/* Create new grade */}
          <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-pink-400" />
                Grades ({grades.length})
              </h3>
              <button
                onClick={() => setShowNewGradeForm(!showNewGradeForm)}
                className="btn-miami px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau grade
              </button>
            </div>

            {showNewGradeForm && (
              <div className="bg-[#1a1a25] rounded-lg p-4 mb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newGrade.name}
                    onChange={(e) => setNewGrade({ ...newGrade, name: e.target.value })}
                    placeholder="Nom du grade"
                  />
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newGrade.color}
                      onChange={(e) => setNewGrade({ ...newGrade, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="number"
                      value={newGrade.autoKickPoints}
                      onChange={(e) => setNewGrade({ ...newGrade, autoKickPoints: parseInt(e.target.value) || 3 })}
                      placeholder="Points auto-kick"
                      className="flex-1"
                      min="1"
                      max="10"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newGrade.isFamilyMember}
                      onChange={(e) => setNewGrade({ ...newGrade, isFamilyMember: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Membre de la famille</span>
                  </label>
                  <button
                    onClick={handleCreateGrade}
                    disabled={!newGrade.name.trim()}
                    className="btn-miami px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    Créer
                  </button>
                </div>
              </div>
            )}

            {/* Grades list */}
            <div className="space-y-3">
              {grades.map(grade => (
                <div
                  key={grade.id}
                  className="bg-[#1a1a25] rounded-lg p-4 border border-gray-800"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: grade.color }}></div>
                      {renamingGrade === grade.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameGrade(grade.id); if (e.key === 'Escape') setRenamingGrade(null); }}
                            className="text-sm px-2 py-1 rounded bg-gray-800 border border-gray-600 flex-1"
                            autoFocus
                          />
                          <button onClick={() => handleRenameGrade(grade.id)} className="p-1 hover:bg-green-500/20 rounded text-green-400"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setRenamingGrade(null)} className="p-1 hover:bg-gray-700 rounded text-gray-400"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold">{grade.name}</span>
                          {grade.isFamilyMember && (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300">Famille</span>
                          )}
                          <span className="text-sm text-gray-400">Auto-kick: {grade.autoKickPoints} points</span>
                        </>
                      )}
                    </div>
                    {renamingGrade !== grade.id && (
                      <div className="flex gap-2">
                        <button onClick={() => { setRenamingGrade(grade.id); setRenameValue(grade.name); }} className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors" title="Renommer"><Pencil className="w-4 h-4 text-yellow-400" /></button>
                        <button onClick={() => setEditingGrade(editingGrade === grade.id ? null : grade.id)} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Permissions"><Edit3 className="w-4 h-4 text-gray-400" /></button>
                        <button onClick={() => handleDeleteGrade(grade.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors" title="Supprimer"><Trash2 className="w-4 h-4 text-red-400" /></button>
                      </div>
                    )}
                  </div>

                  {/* Permissions */}
                  {editingGrade === grade.id && (
                    <div className="pt-3 border-t border-gray-800">
                      <p className="text-sm text-gray-400 mb-3">Permissions:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {defaultPermissions.map(perm => {
                          const granted = grade.permissions.find(p => p.id === perm.id)?.granted || false;
                          return (
                            <label
                              key={perm.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-gray-800/50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={granted}
                                onChange={(e) => handleUpdateGradePermissions(grade.id, perm.id, e.target.checked)}
                                className="w-4 h-4 rounded"
                              />
                              <div>
                                <p className="text-sm font-medium">{perm.name}</p>
                                <p className="text-xs text-gray-500">{perm.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Members Management */}
      {activeSection === 'members' && canManageMembers && (
        <div className="space-y-4">
          <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              Gestion des membres ({users.length})
            </h3>

            <div className="space-y-2">
              {users.map(member => (
                <div
                  key={member.steamId}
                  className="flex items-center gap-4 p-3 bg-[#1a1a25] rounded-lg"
                >
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                      {member.username[0].toUpperCase()}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.username}</p>
                    <p className="text-sm text-gray-400">{member.grade}</p>
                  </div>

                  {/* Grade change */}
                  {selectedMember === member.steamId ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newGradeName}
                        onChange={(e) => setNewGradeName(e.target.value)}
                        className="text-sm"
                      >
                        <option value="">Sélectionner</option>
                        {grades.map(g => (
                          <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleChangeMemberGrade(member.steamId)}
                        disabled={!newGradeName}
                        className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedMember(''); setNewGradeName(''); }}
                        className="p-2 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedMember(member.steamId)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.steamId)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <UserMinus className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {activeSection === 'logs' && canViewLogs && (
        <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Logs d'activité ({logs.length})
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Auto-clear toutes les 30 min</span>
              <button
                onClick={handleClearLogs}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors"
              >
                Vider
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun log</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-[#1a1a25] rounded-lg text-sm">
                  <div className="w-2 h-2 rounded-full bg-sky-400 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300">
                      <span className="font-medium text-white">{log.userName}</span>
                      {' - '}
                      <span className="text-pink-400">{log.action}</span>
                    </p>
                    <p className="text-gray-500 mt-1">{log.details}</p>
                  </div>
                  <span className="text-gray-600 text-xs flex-shrink-0">
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Impersonation */}
      {activeSection === 'impersonate' && canImpersonate && (
        <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            Tester les rôles
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Visualisez le site comme si vous aviez un autre grade pour tester les permissions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grades.map(grade => (
              <button
                key={grade.id}
                onClick={() => handleImpersonate(grade.name)}
                className="flex items-center gap-3 p-4 bg-[#1a1a25] rounded-lg hover:bg-gray-800 transition-colors text-left"
              >
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: grade.color }}
                ></div>
                <div>
                  <p className="font-medium">{grade.name}</p>
                  <p className="text-xs text-gray-500">
                    {grade.permissions.filter(p => p.granted).length} permissions
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
