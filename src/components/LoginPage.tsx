import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';

const STEAM_API_KEY = 'FA46E6FA408317D64E957F59F5FDA13F';
const SUPER_ADMIN_STEAM_ID = '76561199481716844';

export const LoginPage: React.FC = () => {
  const { setCurrentUser, setGrades, grades, users, setUsers, servers, addLog } = useApp();
  const [loading, setLoading] = useState(false);
  const [showServers, setShowServers] = useState(false);

  // Gère le callback Steam OAuth (si steamid dans l'URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const steamId = params.get('steamid');
    if (steamId) {
      handleSteamLogin(steamId);
    }
  }, []);

  const handleSteamLogin = async (steamId: string) => {
    setLoading(true);
    try {
      // -------------------------------------------------------
      // ETAPE 1 : Récupérer les infos Steam (avatar, nom Steam)
      // -------------------------------------------------------
      const steamRes = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
      );
      const steamData = await steamRes.json();
      const steamPlayer = steamData?.response?.players?.[0];
      if (!steamPlayer) {
        setLoading(false);
        return;
      }

      // -------------------------------------------------------
      // ETAPE 2 : Appeler notre fonction Netlify avec le steamId
      //           → elle contacte l'API Kobra et renvoie :
      //             { rpName, hoursMonth, hoursWeek }
      // -------------------------------------------------------
      let rpName: string | null = null;
      let hoursMonth = 0;
      let hoursWeek = 0;

      try {
        const kobraRes = await fetch(`/.netlify/functions/kobra?steamid=${steamId}`);
        if (kobraRes.ok) {
          const kobraData = await kobraRes.json();
          // rpName = "Naomi Billa" (ou null si joueur pas trouvé sur le serveur)
          rpName = kobraData.rpName ?? null;
          hoursMonth = kobraData.hoursMonth ?? 0;
          hoursWeek  = kobraData.hoursWeek  ?? 0;
        }
      } catch {
        // Si Kobra est inaccessible, on continue avec les valeurs par défaut
      }

      // -------------------------------------------------------
      // ETAPE 3 : Le nom affiché = nom RP Kobra si dispo,
      //           sinon nom Steam
      // -------------------------------------------------------
      const displayUsername =
        rpName && rpName.trim() !== '' ? rpName.trim() : steamPlayer.personaname;

      // -------------------------------------------------------
      // ETAPE 4 : Créer ou mettre à jour l'utilisateur
      // -------------------------------------------------------
      const existingUser = users.find(u => u.steamId === steamId);

      if (!existingUser) {
        // Nouvel utilisateur
        const isSuperAdmin = steamId === SUPER_ADMIN_STEAM_ID;
        const newUser: User = {
          steamId,
          username: displayUsername,
          avatar: steamPlayer.avatarfull,
          grade: isSuperAdmin ? 'Super Admin' : 'Membre',
          isFamilyMember: isSuperAdmin,
          status: 'active',
          hoursPlayedMonth: hoursMonth,
          hoursPlayedWeek: hoursWeek,
          joinedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser);
        if (grades.length === 0) initializeDefaultGrades();
        addLog('Connexion', `${newUser.username} s'est connecté pour la première fois`);
      } else {
        // Utilisateur existant → on met à jour nom + avatar + heures
        const updatedUser: User = {
          ...existingUser,
          username: displayUsername,
          avatar: steamPlayer.avatarfull,
          hoursPlayedMonth: hoursMonth,
          hoursPlayedWeek: hoursWeek,
          lastLogin: new Date().toISOString(),
        };
        setUsers(prev => prev.map(u => u.steamId === steamId ? updatedUser : u));
        setCurrentUser(updatedUser);
      }
    } catch (err) {
      console.error('[login] erreur:', err);
    }
    setLoading(false);
  };

  const initializeDefaultGrades = () => {
    setGrades([{
      id: '1',
      name: 'Super Admin',
      color: '#FFD700',
      autoKickPoints: 10,
      isFamilyMember: true,
      permissions: [
        { id: 'view_members', name: 'Voir les membres', description: 'Accéder à la liste des membres', granted: true },
        { id: 'manage_members', name: 'Gérer les membres', description: 'Ajouter, supprimer, promouvoir ou rétrograder', granted: true },
        { id: 'view_applications', name: 'Voir les candidatures', description: 'Consulter les candidatures', granted: true },
        { id: 'vote_applications', name: 'Voter sur les candidatures', description: 'Voter pour accepter ou refuser', granted: true },
        { id: 'manage_applications', name: 'Gérer les candidatures', description: 'Décision finale sur les candidatures', granted: true },
        { id: 'edit_rules', name: 'Modifier le règlement', description: 'Modifier les règles de la famille', granted: true },
        { id: 'view_logs', name: 'Voir les logs', description: "Consulter l'historique des actions", granted: true },
        { id: 'view_sanctions', name: 'Voir tous les casiers', description: 'Voir les casiers de tous les membres', granted: true },
        { id: 'view_own_sanctions', name: 'Voir son casier', description: 'Voir son propre casier uniquement', granted: true },
        { id: 'issue_sanctions', name: 'Donner des sanctions', description: 'Donner des warnings ou sanctions', granted: true },
        { id: 'manage_grades', name: 'Gérer les grades', description: 'Créer et modifier les grades', granted: true },
        { id: 'manage_family', name: 'Gérer la famille', description: 'Gérer les infos de la famille', granted: true },
        { id: 'impersonate', name: 'Tester les rôles', description: 'Visualiser le site sous un autre rôle', granted: true },
        { id: 'view_rewards', name: 'Voir les récompenses', description: 'Accéder au classement des récompenses', granted: true },
        { id: 'view_steamid', name: 'Voir les SteamID', description: 'Accéder à la section SteamID', granted: true },
        { id: 'manage_trusted', name: 'Gérer personnes de confiance', description: 'Ajouter/supprimer les personnes de confiance', granted: true },
        { id: 'view_admin', name: "Voir l'admin", description: "Accéder à l'onglet administratif", granted: true },
        { id: 'vote_purge', name: 'Voter purge', description: 'Voter pour la purge', granted: true },
      ]
    },
    {
      id: '2',
      name: 'Membre',
      color: '#98FB98',
      autoKickPoints: 3,
      isFamilyMember: true,
      permissions: [
        { id: 'view_members', name: 'Voir les membres', description: 'Accéder à la liste des membres', granted: true },
        { id: 'view_applications', name: 'Voir les candidatures', description: 'Consulter les candidatures', granted: true },
        { id: 'vote_applications', name: 'Voter sur les candidatures', description: 'Voter pour accepter ou refuser', granted: true },
        { id: 'view_own_sanctions', name: 'Voir son casier', description: 'Voir son propre casier uniquement', granted: true },
        { id: 'view_rewards', name: 'Voir les récompenses', description: 'Accéder au classement des récompenses', granted: true },
        { id: 'vote_purge', name: 'Voter purge', description: 'Voter pour la purge', granted: true },
      ]
    },
    {
      id: '3',
      name: 'Recrue',
      color: '#87CEEB',
      autoKickPoints: 3,
      isFamilyMember: true,
      permissions: [
        { id: 'view_members', name: 'Voir les membres', description: 'Accéder à la liste des membres', granted: true },
        { id: 'view_own_sanctions', name: 'Voir son casier', description: 'Voir son propre casier uniquement', granted: true },
        { id: 'vote_purge', name: 'Voter purge', description: 'Voter pour la purge', granted: true },
      ]
    }]);
  };

  const handleSteamAuth = () => {
    const steamId = prompt('Entrez votre SteamID64 pour la démo:\n\nUtilisez 76561199481716844 pour Super Admin');
    if (steamId) {
      handleSteamLogin(steamId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden grid-bg">
      <div className="absolute inset-0 grid-bg opacity-50"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 text-center max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-bold mb-4">
            <span className="font-handwriting" style={{
              background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Famille Meay
            </span>
          </h1>
          <p className="text-gray-400 text-lg mt-4">Rejoignez notre communauté exclusive</p>
        </div>

        <div className="bg-[#12121a]/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-800 shadow-2xl mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-white">Connexion</h2>

          <button
            onClick={handleSteamAuth}
            disabled={loading}
            className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #1b2838, #2a475e)',
              border: '2px solid #66c0f4',
              color: '#66c0f4'
            }}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Se connecter avec Steam
              </>
            )}
          </button>

          <p className="mt-4 text-gray-500 text-sm">
            L'accès est uniquement possible via Steam
          </p>
        </div>

        <div className="bg-[#12121a]/60 backdrop-blur rounded-xl p-6 border border-gray-800">
          <button
            onClick={() => setShowServers(!showServers)}
            className="text-white font-semibold flex items-center justify-center gap-2 mx-auto hover:text-pink-300 transition-colors"
          >
            <span>Serveurs disponibles</span>
            <svg className={`w-5 h-5 transition-transform ${showServers ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showServers && (
            <div className="mt-4 space-y-3">
              {servers.map(server => (
                <div key={server.id} className="bg-[#1a1a25] rounded-lg p-4 flex items-center justify-between">
                  <div className="text-left">
                    <p className="font-semibold text-white">{server.name}</p>
                    <p className="text-gray-400 text-sm">Map: {server.map}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${server.players >= server.max_players ? 'text-red-400' : 'text-green-400'}`}>
                      {server.players}/{server.max_players}
                    </p>
                    <button
                      onClick={() => navigator.clipboard.writeText(server.address)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Copier l'IP
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-8 text-gray-600 text-sm">
          © 2024 Famille Meay • Tous droits réservés
        </p>
      </div>
    </div>
  );
};
