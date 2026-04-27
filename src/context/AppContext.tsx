import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Grade, Application, Notification, Log, Sanction, TrustedPerson, AvoidedPerson, FamilyMessage, PurgeVote, Server } from '../types';

interface AppContextType {
  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isImpersonating: boolean;
  impersonateRole: string | null;
  setImpersonateRole: (role: string | null) => void;
  
  // Users
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  
  // Grades
  grades: Grade[];
  setGrades: React.Dispatch<React.SetStateAction<Grade[]>>;
  
  // Applications
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  
  // Notifications
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  
  // Logs
  logs: Log[];
  setLogs: React.Dispatch<React.SetStateAction<Log[]>>;
  
  // Sanctions
  sanctions: Sanction[];
  setSanctions: React.Dispatch<React.SetStateAction<Sanction[]>>;
  
  // Trusted/Avoided
  trustedPersons: TrustedPerson[];
  setTrustedPersons: React.Dispatch<React.SetStateAction<TrustedPerson[]>>;
  avoidedPersons: AvoidedPerson[];
  setAvoidedPersons: React.Dispatch<React.SetStateAction<AvoidedPerson[]>>;
  
  // Family messages
  familyMessages: FamilyMessage[];
  setFamilyMessages: React.Dispatch<React.SetStateAction<FamilyMessage[]>>;
  
  // Purge votes
  purgeVotes: PurgeVote[];
  setPurgeVotes: React.Dispatch<React.SetStateAction<PurgeVote[]>>;
  
  // Servers
  servers: Server[];
  
  // Rules
  rules: string;
  setRules: (rules: string) => void;
  rulesPrivate: string;
  setRulesPrivate: (rules: string) => void;
  
  // Super admin SteamID
  superAdminSteamId: string;
  
  // Helper functions
  hasPermission: (permission: string) => boolean;
  isFamilyMember: () => boolean;
  getEffectiveUser: () => User | null;
  addLog: (action: string, details: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Default permissions exported for use elsewhere
export const defaultPermissions: { id: string; name: string; description: string }[] = [
  { id: 'view_members', name: 'Voir les membres', description: 'Accéder à la liste des membres' },
  { id: 'manage_members', name: 'Gérer les membres', description: 'Ajouter, supprimer, promouvoir ou rétrograder' },
  { id: 'view_applications', name: 'Voir les candidatures', description: 'Consulter les candidatures' },
  { id: 'vote_applications', name: 'Voter sur les candidatures', description: 'Voter pour accepter ou refuser' },
  { id: 'manage_applications', name: 'Gérer les candidatures', description: 'Décision finale sur les candidatures' },
  { id: 'edit_rules', name: 'Modifier le règlement', description: 'Modifier les règles de la famille' },
  { id: 'view_logs', name: 'Voir les logs', description: 'Consulter l\'historique des actions' },
  { id: 'view_sanctions', name: 'Voir tous les casiers', description: 'Voir les casiers de tous les membres' },
  { id: 'view_own_sanctions', name: 'Voir son casier', description: 'Voir son propre casier uniquement' },
  { id: 'issue_sanctions', name: 'Donner des sanctions', description: 'Donner des warnings ou sanctions' },
  { id: 'manage_grades', name: 'Gérer les grades', description: 'Créer et modifier les grades' },
  { id: 'manage_family', name: 'Gérer la famille', description: 'Gérer les infos de la famille' },
  { id: 'impersonate', name: 'Tester les rôles', description: 'Visualiser le site sous un autre rôle' },
  { id: 'view_rewards', name: 'Voir les récompenses', description: 'Accéder au classement des récompenses' },
  { id: 'view_steamid', name: 'Voir les SteamID', description: 'Accéder à la section SteamID' },
  { id: 'manage_trusted', name: 'Gérer personnes de confiance', description: 'Ajouter/supprimer les personnes de confiance' },
  { id: 'view_admin', name: 'Voir l\'admin', description: 'Accéder à l\'onglet administratif' },
  { id: 'vote_purge', name: 'Voter purge', description: 'Voter pour la purge' },
  { id: 'add_steamid', name: 'Ajouter SteamID', description: 'Ajouter des personnes dans le SteamID Manager' },
  { id: 'view_private_rules', name: 'Voir règlement privé', description: 'Accéder à la section privée du règlement' },
];

const superAdminSteamId = '76561199481716844';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fm_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonateRole, setImpersonateRole] = useState<string | null>(null);

  // Data states
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('fm_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [grades, setGrades] = useState<Grade[]>(() => {
    const saved = localStorage.getItem('fm_grades');
    return saved ? JSON.parse(saved) : [];
  });

  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem('fm_applications');
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('fm_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<Log[]>(() => {
    const saved = localStorage.getItem('fm_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [sanctions, setSanctions] = useState<Sanction[]>(() => {
    const saved = localStorage.getItem('fm_sanctions');
    return saved ? JSON.parse(saved) : [];
  });

  const [trustedPersons, setTrustedPersons] = useState<TrustedPerson[]>(() => {
    const saved = localStorage.getItem('fm_trusted');
    return saved ? JSON.parse(saved) : [];
  });

  const [avoidedPersons, setAvoidedPersons] = useState<AvoidedPerson[]>(() => {
    const saved = localStorage.getItem('fm_avoided');
    return saved ? JSON.parse(saved) : [];
  });

  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>(() => {
    const saved = localStorage.getItem('fm_family_messages');
    return saved ? JSON.parse(saved) : [];
  });

  const [purgeVotes, setPurgeVotes] = useState<PurgeVote[]>(() => {
    const saved = localStorage.getItem('fm_purge_votes');
    return saved ? JSON.parse(saved) : [];
  });

  const [rules, setRules] = useState<string>(() => {
    return localStorage.getItem('fm_rules') || `# Règlement de la Famille Meay

## Article 1 - Respect mutuel
Tous les membres doivent se respecter mutuellement, quel que soit leur grade ou ancienneté.

## Article 2 - Comportement
Le comportement toxique, le harcèlement et les insultes sont strictement interdits.

## Article 3 - Activité
Chaque membre doit maintenir un minimum d'activité. Une période d'inactivité de plus de 30 jours peut entraîner une révision de votre statut.

## Article 4 - Hierarchie
Le respect de la hiérarchie est obligatoire. Les décisions des grades supérieurs doivent être suivies.

## Article 5 - Représentation
En portant le tag de la famille, vous la représentez. Assurez-vous de toujours avoir un comportement exemplaire.

## Article 6 - Purge
La purge a lieu le premier samedi de chaque mois à 21h. La participation est obligatoire pour tous les membres de la famille.

## Article 7 - Sanctions
Les sanctions suivantes peuvent être appliquées :
- Warn oral : rappel sans points
- Warn écrit : 1, 2 ou 3 points selon la gravité
- Bannissement : expulsion de la famille`;
  });

  const [rulesPrivate, setRulesPrivate] = useState<string>(() => {
    return localStorage.getItem('fm_rules_private') || `## Section privée — Directives internes\n\nCette section est réservée aux membres ayant la permission adéquate.\n\n### Protocoles internes\nInformations confidentielles réservées aux membres de confiance.`;
  });

  // Servers (hardcoded or fetched)
  const [servers, setServers] = useState<Server[]>([]);

  // Effect to save to localStorage
  useEffect(() => {
    localStorage.setItem('fm_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('fm_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('fm_grades', JSON.stringify(grades));
  }, [grades]);

  useEffect(() => {
    localStorage.setItem('fm_applications', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem('fm_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('fm_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('fm_sanctions', JSON.stringify(sanctions));
  }, [sanctions]);

  useEffect(() => {
    localStorage.setItem('fm_trusted', JSON.stringify(trustedPersons));
  }, [trustedPersons]);

  useEffect(() => {
    localStorage.setItem('fm_avoided', JSON.stringify(avoidedPersons));
  }, [avoidedPersons]);

  useEffect(() => {
    localStorage.setItem('fm_family_messages', JSON.stringify(familyMessages));
  }, [familyMessages]);

  useEffect(() => {
    localStorage.setItem('fm_purge_votes', JSON.stringify(purgeVotes));
  }, [purgeVotes]);

  useEffect(() => {
    localStorage.setItem('fm_rules', rules);
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('fm_rules_private', rulesPrivate);
  }, [rulesPrivate]);

  // Auto-clear logs every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs([]);
      localStorage.removeItem('fm_logs');
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch servers on mount
  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('https://dashboard.kobralost-rp.com/api/v2/servers');
      const data = await response.json();
      if (Array.isArray(data)) {
        setServers(data.map((s: any) => ({
          id: s.id,
          name: s.name || `Server ${s.id}`,
          players: s.players || 0,
          max_players: s.max_players || s.slots || 128,
          address: s.address || '',
          map: s.map || 'unknown',
          gamemode: s.gamemode || 'DarkRP'
        })));
      }
    } catch (error) {
      console.log('Using demo server data');
      setServers([
        { id: 1, name: 'KobraLost DarkRP #1', players: 127, max_players: 128, address: 'kobralost-rp.com:27015', map: 'rp_downtown_v2', gamemode: 'DarkRP' },
        { id: 2, name: 'KobraLost DarkRP #2', players: 89, max_players: 128, address: 'kobralost-rp.com:27016', map: 'rp_venice', gamemode: 'DarkRP' }
      ]);
    }
  };

  const getEffectiveUser = (): User | null => {
    if (isImpersonating && impersonateRole && currentUser) {
      const roleUser = users.find(u => u.grade === impersonateRole);
      if (roleUser) return roleUser;
      return { ...currentUser, grade: impersonateRole };
    }
    return currentUser;
  };

  const hasPermission = (permission: string): boolean => {
    const user = getEffectiveUser();
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.steamId === superAdminSteamId) return true;
    
    const grade = grades.find(g => g.name === user.grade);
    if (!grade) return false;
    
    // Check if grade is family member
    if (!grade.isFamilyMember) return false;
    
    return grade.permissions.some(p => p.id === permission && p.granted);
  };

  const isFamilyMember = (): boolean => {
    const user = getEffectiveUser();
    if (!user) return false;
    
    // Super admin is always family
    if (user.steamId === superAdminSteamId) return true;
    
    const grade = grades.find(g => g.name === user.grade);
    return grade?.isFamilyMember || false;
  };

  const addLog = (action: string, details: string) => {
    const user = getEffectiveUser();
    if (!user) return;
    
    const newLog: Log = {
      id: Date.now().toString(),
      userId: user.steamId,
      userName: user.username,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    
    setLogs(prev => [newLog, ...prev]);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser: (user) => {
        setCurrentUser(user);
        if (user) {
          localStorage.setItem('fm_current_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('fm_current_user');
        }
      },
      isImpersonating,
      impersonateRole,
      setImpersonateRole: (role) => {
        setImpersonateRole(role);
        setIsImpersonating(role !== null);
      },
      users,
      setUsers,
      grades,
      setGrades,
      applications,
      setApplications,
      notifications,
      setNotifications,
      logs,
      setLogs,
      sanctions,
      setSanctions,
      trustedPersons,
      setTrustedPersons,
      avoidedPersons,
      setAvoidedPersons,
      familyMessages,
      setFamilyMessages,
      purgeVotes,
      setPurgeVotes,
      servers,
      rules,
      setRules,
      rulesPrivate,
      setRulesPrivate,
      superAdminSteamId,
      hasPermission,
      isFamilyMember,
      getEffectiveUser,
      addLog
    }}>
      {children}
    </AppContext.Provider>
  );
};
