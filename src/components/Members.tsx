import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Users, Filter, ChevronDown, Eye, EyeOff } from 'lucide-react';

export const Members: React.FC = () => {
  const { users, grades } = useApp();
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'grade' | 'hours'>('name');
  const [familyOnly, setFamilyOnly] = useState(false);

  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(search.toLowerCase());
      const matchesGrade = gradeFilter === 'all' || user.grade === gradeFilter;
      const grade = grades.find(g => g.name === user.grade);
      const matchesFamily = !familyOnly || (grade?.isFamilyMember ?? false);
      return matchesSearch && matchesGrade && matchesFamily;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.username.localeCompare(b.username);
        case 'grade': return a.grade.localeCompare(b.grade);
        case 'hours': return b.hoursPlayedMonth - a.hoursPlayedMonth;
        default: return 0;
      }
    });

  const uniqueGrades = [...new Set(users.map(u => u.grade))];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            <span style={{
              background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Membres
            </span>
          </h2>
          <p className="text-gray-400 mt-1">{filteredUsers.length} membre(s) affiché(s)</p>
        </div>

        {/* Toggle famille */}
        <button
          onClick={() => setFamilyOnly(prev => !prev)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium border transition-all ${
            familyOnly
              ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {familyOnly ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {familyOnly ? 'Famille uniquement' : 'Tous les membres'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un membre..."
            className="w-full pl-10 pr-4 py-3"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="pl-10 pr-10 py-3 appearance-none cursor-pointer"
          >
            <option value="all">Tous les grades</option>
            {uniqueGrades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 pr-10 appearance-none cursor-pointer"
          >
            <option value="name">Trier par nom</option>
            <option value="grade">Trier par grade</option>
            <option value="hours">Trier par heures</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Members Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucun membre trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => {
            const grade = grades.find(g => g.name === user.grade);
            return (
              <div
                key={user.steamId}
                className="bg-[#12121a] rounded-xl p-5 border border-gray-800 card-hover"
              >
                <div className="flex items-center gap-4">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-16 h-16 rounded-full border-2"
                      style={{ borderColor: grade?.color || '#666' }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                      style={{ backgroundColor: grade?.color || '#666', color: '#000' }}
                    >
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{user.username}</h3>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${grade?.color || '#666'}20`,
                          color: grade?.color || '#666'
                        }}
                      >
                        {user.grade}
                      </span>
                      {!grade?.isFamilyMember && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-400">
                          Hors famille
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Statut</span>
                    <span className={`flex items-center gap-1.5 ${user.status === 'active' ? 'text-green-400' : 'text-gray-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                      {user.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-400">Heures ce mois</span>
                    <span className="text-white font-medium">{user.hoursPlayedMonth}h</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-400">Membre depuis</span>
                    <span className="text-gray-300">{new Date(user.joinedAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
