import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, Users, Trophy, Activity, Calendar, Gamepad2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { getEffectiveUser, users, grades, servers, sanctions } = useApp();
  const user = getEffectiveUser();

  // Ces états sont remplis APRES l'appel à Kobra (idem que dans LoginPage)
  // mais ici on les affiche directement depuis user.hoursPlayedMonth / hoursPlayedWeek
  // car LoginPage les a déjà calculés et stockés dans l'utilisateur au moment du login.
  // On ajoute quand même un fetch pour mettre à jour si besoin.
  const [rpName, setRpName] = useState<string | null>(null);
  const [hoursMonth, setHoursMonth] = useState<number>(user?.hoursPlayedMonth ?? 0);
  const [hoursWeek, setHoursWeek] = useState<number>(user?.hoursPlayedWeek ?? 0);
  const [playerData, setPlayerData] = useState<any>(null);

  useEffect(() => {
    if (!user?.steamId) return;

    // On initialise immédiatement avec les valeurs déjà stockées (calculées au login)
    setHoursMonth(user.hoursPlayedMonth ?? 0);
    setHoursWeek(user.hoursPlayedWeek ?? 0);

    // ETAPE 1 : Appeler Kobra pour obtenir rpName + heures à jour
    fetchKobraData(user.steamId);
  }, [user?.steamId]);

  const fetchKobraData = async (steamId: string) => {
    try {
      const res = await fetch(`/.netlify/functions/kobra?steamid=${steamId}`);
      if (!res.ok) return;

      const data = await res.json();

      // ETAPE 2 : Mettre à jour le nom RP (data.rpName = "Naomi Billa")
      if (data.rpName && data.rpName.trim() !== '') {
        setRpName(data.rpName.trim());
        setPlayerData({ name: data.rpName });
      }

      // ETAPE 3 : Mettre à jour les heures de jeu
      setHoursMonth(data.hoursMonth ?? 0);
      setHoursWeek(data.hoursWeek ?? 0);

    } catch (error) {
      console.error('[dashboard] erreur Kobra:', error);
    }
  };

  const familyMembers = users.filter(u => {
    const grade = grades.find(g => g.name === u.grade);
    return grade?.isFamilyMember;
  });

  const memberSanctions = user ? sanctions.filter(s => s.targetId === user.steamId) : [];
  const totalPoints = memberSanctions.reduce((acc, s) => acc + s.points, 0);

  // Nom affiché : nom RP Kobra si dispo, sinon nom Steam stocké
  const displayName = rpName || user?.username || 'Utilisateur';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-[#12121a] to-[#1a1a25] rounded-2xl p-6 border border-gray-800">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {user?.avatar && (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-24 h-24 rounded-full border-4 border-pink-400 shadow-lg"
            />
          )}
          <div className="text-center md:text-left flex-1">
            <h2 className="text-3xl font-bold">
              <span style={{
                background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Bienvenue, {displayName}
              </span>
            </h2>
            {rpName && user?.username && rpName !== user.username && (
              <p className="text-gray-500 text-sm mt-1">Steam : {user.username}</p>
            )}
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-pink-500/20 text-pink-300 border border-pink-500/30">
                {user?.grade || 'Membre'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user?.status === 'active'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {user?.status === 'active' ? '● Actif' : '○ Inactif'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hours Played Month */}
        <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800 card-hover">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-8 h-8 text-pink-400" />
            <span className="text-xs text-gray-500">Ce mois</span>
          </div>
          <p className="text-3xl font-bold text-white">{hoursMonth}h</p>
          <p className="text-gray-400 text-sm mt-1">Heures jouées</p>
        </div>

        {/* Hours Played Week */}
        <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800 card-hover">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-8 h-8 text-sky-400" />
            <span className="text-xs text-gray-500">Cette semaine</span>
          </div>
          <p className="text-3xl font-bold text-white">{hoursWeek}h</p>
          <p className="text-gray-400 text-sm mt-1">Heures jouées</p>
        </div>

        {/* Family Members */}
        <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800 card-hover">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-green-400" />
            <span className="text-xs text-gray-500">Famille</span>
          </div>
          <p className="text-3xl font-bold text-white">{familyMembers.length}</p>
          <p className="text-gray-400 text-sm mt-1">Membres</p>
        </div>

        {/* Sanctions Points */}
        <div className="bg-[#12121a] rounded-xl p-5 border border-gray-800 card-hover">
          <div className="flex items-center justify-between mb-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <span className="text-xs text-gray-500">Sanctions</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalPoints}</p>
          <p className="text-gray-400 text-sm mt-1">Points cumulés</p>
        </div>
      </div>

      {/* Player Info from Kobra API */}
      {playerData && (
        <div className="bg-[#12121a] rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-pink-400" />
            Informations KobraLost
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1a25] rounded-lg p-4">
              <p className="text-gray-400 text-sm">Nom RP</p>
              <p className="text-white font-medium">{rpName || 'Non défini'}</p>
            </div>
            <div className="bg-[#1a1a25] rounded-lg p-4">
              <p className="text-gray-400 text-sm">Heures ce mois</p>
              <p className="text-green-400 font-medium">{hoursMonth}h</p>
            </div>
            <div className="bg-[#1a1a25] rounded-lg p-4">
              <p className="text-gray-400 text-sm">Heures cette semaine</p>
              <p className="text-blue-400 font-medium">{hoursWeek}h</p>
            </div>
          </div>
        </div>
      )}

      {/* Server Status */}
      <div className="bg-[#12121a] rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-400" />
          Serveurs en ligne
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servers.map(server => (
            <div key={server.id} className="bg-[#1a1a25] rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{server.name}</p>
                <p className="text-gray-400 text-sm">{server.map} • {server.gamemode}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${server.players >= server.max_players ? 'text-red-400' : 'text-green-400'}`}>
                  {server.players}/{server.max_players}
                </p>
                <p className="text-gray-500 text-xs">joueurs</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#12121a] rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold mb-4">Activité récente</h3>
        <div className="space-y-3">
          {memberSanctions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune activité récente</p>
          ) : (
            memberSanctions.slice(0, 5).map(sanction => (
              <div key={sanction.id} className="flex items-center gap-3 p-3 bg-[#1a1a25] rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  sanction.type === 'banishment' ? 'bg-red-500' :
                  sanction.type === 'written_warning' ? 'bg-yellow-500' : 'bg-gray-400'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm">
                    {sanction.type === 'oral_warning' && 'Warn oral'}
                    {sanction.type === 'written_warning' && `Warn écrit (${sanction.points} point(s))`}
                    {sanction.type === 'banishment' && 'Bannissement'}
                    {' - '}
                    <span className="text-gray-400">{sanction.reason}</span>
                  </p>
                  <p className="text-xs text-gray-500">par {sanction.issuerName}</p>
                </div>
                <span className="text-xs text-gray-600">
                  {new Date(sanction.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
