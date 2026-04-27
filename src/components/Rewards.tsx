import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Award, Trophy, Clock, Crown, Medal, Star } from 'lucide-react';

export const Rewards: React.FC = () => {
  const { users, grades } = useApp();
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<{ winner: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlaytimeData();
  }, [period]);

  const fetchPlaytimeData = async () => {
    setLoading(true);
    const familyMembers = users.filter(u => {
      const grade = grades.find(g => g.name === u.grade);
      return grade?.isFamilyMember;
    });

    // Try to fetch real playtime data
    const updatedMembers = await Promise.all(
      familyMembers.map(async (member) => {
        try {
          const response = await fetch(
            `https://dashboard.kobralost-rp.com/api/v2/1/players/${member.steamId}/sessions`
          );
          if (response.ok) {
            const sessions = await response.json();
            const now = new Date();
            
            let weekHours = 0;
            let monthHours = 0;
            
            // Calculate hours from sessions
            const sessionsArray = Array.isArray(sessions) ? sessions : sessions.data || [];
            sessionsArray.forEach((session: any) => {
              const sessionStart = new Date(session.start || session.created_at);
              const sessionEnd = new Date(session.end || session.updated_at || new Date());
              const duration = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60 * 60);
              
              // This week
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay());
              weekStart.setHours(0, 0, 0, 0);
              
              if (sessionStart >= weekStart) {
                weekHours += duration;
              }
              
              // This month
              if (sessionStart.getMonth() === now.getMonth() && sessionStart.getFullYear() === now.getFullYear()) {
                monthHours += duration;
              }
            });
            
            return { ...member, hoursPlayedWeek: Math.round(weekHours * 10) / 10, hoursPlayedMonth: Math.round(monthHours * 10) / 10 };
          }
        } catch (error) {
          // Use existing data
        }
        return member;
      })
    );

    // Sort by playtime
    const sorted = updatedMembers.sort((a, b) => 
      period === 'month' ? b.hoursPlayedMonth - a.hoursPlayedMonth : b.hoursPlayedWeek - a.hoursPlayedWeek
    );

    setLeaderboard(sorted.slice(0, 10));
    
    // Check for winner announcement (72h window)
    if (period === 'month' && sorted.length > 0) {
      const now = new Date();
      if (now.getDate() <= 3) { // First 3 days of month
        setAnnouncement({ winner: sorted[0].username, type: 'month' });
      }
    } else if (period === 'week' && sorted.length > 0) {
      const now = new Date();
      if (now.getDay() <= 2) { // First 2-3 days of week (Mon-Wed)
        setAnnouncement({ winner: sorted[0].username, type: 'week' });
      }
    }
    
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-300" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-gray-500">#{rank}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            <span className="font-handwriting" style={{ 
              background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              Récompenses
            </span>
          </h2>
          <p className="text-gray-400 mt-1">Classement des joueurs les plus actifs</p>
        </div>

        {/* Period toggle */}
        <div className="flex gap-2 bg-[#12121a] rounded-lg p-1 border border-gray-800">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              period === 'week' ? 'bg-pink-500/20 text-pink-300' : 'text-gray-400 hover:text-white'
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              period === 'month' ? 'bg-sky-500/20 text-sky-300' : 'text-gray-400 hover:text-white'
            }`}
          >
            Mois
          </button>
        </div>
      </div>

      {/* Winner announcement */}
      {announcement && (
        <div className="bg-gradient-to-r from-pink-500/20 to-sky-500/20 rounded-2xl p-6 border border-pink-500/30 animate-pulse-glow">
          <div className="flex items-center justify-center gap-4">
            <Trophy className="w-12 h-12 text-yellow-400" />
            <div className="text-center">
              <p className="text-lg font-semibold">
                🎉 Le gagnant {announcement.type === 'month' ? 'du mois' : 'de la semaine'} est...
              </p>
              <p className="text-3xl font-bold miami-text mt-1">{announcement.winner}</p>
              <p className="text-gray-400 text-sm mt-2">Félicitations ! 🏆</p>
            </div>
            <Trophy className="w-12 h-12 text-yellow-400" />
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-[#12121a] rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-pink-400" />
            Top 10 - {period === 'week' ? 'Semaine' : 'Mois'}
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-3">Chargement des données...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun membre trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {leaderboard.map((member, index) => {
              const grade = grades.find(g => g.name === member.grade);
              const hours = period === 'month' ? member.hoursPlayedMonth : member.hoursPlayedWeek;
              
              return (
                <div
                  key={member.steamId}
                  className={`flex items-center gap-4 p-4 transition-colors hover:bg-gray-800/30 ${
                    index < 3 ? 'bg-gradient-to-r from-transparent' : ''
                  }`}
                  style={{
                    background: index === 0 ? 'linear-gradient(90deg, rgba(255,215,0,0.05), transparent)' :
                               index === 1 ? 'linear-gradient(90deg, rgba(192,192,192,0.05), transparent)' :
                               index === 2 ? 'linear-gradient(90deg, rgba(205,127,50,0.05), transparent)' : undefined
                  }}
                >
                  {/* Rank */}
                  <div className="w-10 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>

                  {/* Avatar */}
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className="w-12 h-12 rounded-full border-2"
                      style={{ borderColor: grade?.color || '#666' }}
                    />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ backgroundColor: grade?.color || '#666' }}
                    >
                      {member.username[0].toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{member.username}</p>
                      {index < 3 && <Star className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <span 
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${grade?.color || '#666'}20`,
                        color: grade?.color || '#666'
                      }}
                    >
                      {member.grade}
                    </span>
                  </div>

                  {/* Hours */}
                  <div className="text-right">
                    <p className="text-2xl font-bold miami-text">{hours}h</p>
                    <p className="text-gray-500 text-sm flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      jouées
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800 text-center">
          <p className="text-3xl font-bold miami-text">
            {leaderboard.reduce((acc, m) => acc + (period === 'month' ? m.hoursPlayedMonth : m.hoursPlayedWeek), 0).toFixed(1)}h
          </p>
          <p className="text-gray-400 mt-1">Total cumulé</p>
        </div>
        <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800 text-center">
          <p className="text-3xl font-bold miami-text">
            {leaderboard.length > 0 ? (leaderboard.reduce((acc, m) => acc + (period === 'month' ? m.hoursPlayedMonth : m.hoursPlayedWeek), 0) / leaderboard.length).toFixed(1) : '0'}h
          </p>
          <p className="text-gray-400 mt-1">Moyenne</p>
        </div>
        <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800 text-center">
          <p className="text-3xl font-bold miami-text">
            {leaderboard.length > 0 ? Math.max(...leaderboard.map(m => period === 'month' ? m.hoursPlayedMonth : m.hoursPlayedWeek)) : 0}h
          </p>
          <p className="text-gray-400 mt-1">Record</p>
        </div>
      </div>
    </div>
  );
};
