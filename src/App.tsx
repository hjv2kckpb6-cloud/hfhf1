import React, { useEffect, useState, useRef } from 'react';
import { fbLoad, fbSave, fbListen } from './firebase';
import {
  Award,
  Bell,
  BookOpen,
  Check,
  ClipboardList,
  Database,
  Eye,
  FileText,
  Gamepad2,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Newspaper,
  Radio,
  Search,
  Shield,
  Trash2,
  Trophy,
  Users,
  Video,
  X,
} from 'lucide-react';

type Permission =
  | 'viewMembers'
  | 'voteApplications'
  | 'manageApplications'
  | 'editRules'
  | 'manageFamily'
  | 'viewRewards'
  | 'viewAdmin'
  | 'viewAllRecords'
  | 'viewOwnRecord'
  | 'issueSanctions'
  | 'viewSteamIds'
  | 'manageRoles'
  | 'manageMembers'
  | 'viewLogs'
  | 'previewRoles'
  | 'viewDashboard'
  | 'viewCandidature'
  | 'viewReglement'
  | 'viewFamille'
  | 'viewGestion'
  | 'viewActualites'
  | 'postActualites'
  | 'pingEveryone';

type Role = {
  id: string;
  name: string;
  color: string;
  isFamily: boolean;
  rewardEligible: boolean;
  autoKickPoints: number;
  permissions: Permission[];
};

type Member = {
  steamId: string;
  name: string;
  avatar: string;
  roleId: string;
  status: 'actif' | 'inactif';
  weekHours: number;
  monthHours: number;
  totalHours: number;
  lastSync?: string;
};

type Application = {
  id: string;
  steamId: string;
  name: string;
  motivation: string;
  whyJoin: string;
  status: 'pending' | 'accepted' | 'rejected';
  votes: { steamId: string; name: string; vote: 'accept' | 'reject'; at: string }[];
  decidedBy?: string;
};

type Sanction = {
  id: string;
  targetSteamId: string;
  type: 'oral' | 'written' | 'ban';
  points: number;
  reason: string;
  issuer: string;
  createdAt: string;
};

type FamilyPost = { id: string; type: 'manual' | 'auto'; text: string; at: string; author?: string };
type PersonRecord = { id: string; name: string; steamId: string; note: string; at: string };
type PurgeVote = { steamId: string; name: string; answer: 'present' | 'absent'; at: string };
type SteamIdEntry = { id: string; name: string; steamId: string; at: string };
type LogEntry = { id: string; actor: string; action: string; details: string; at: string };
type NewsPost = {
  id: string;
  author: string;
  authorSteamId: string;
  type: 'message' | 'youtube' | 'ping';
  content: string; // texte ou URL youtube ou message du ping
  isPing: boolean;
  at: string;
};

const SUPER_ADMIN_STEAM_ID = '76561199481716844';
const PUBLIC_ROLE_ID = 'public';
const SUPER_ROLE_ID = 'super-admin';

const permissionCatalog: { id: Permission; label: string; group?: string }[] = [
  // Onglets visibles
  { id: 'viewDashboard', label: 'Voir Dashboard', group: 'onglets' },
  { id: 'viewCandidature', label: 'Voir Candidature', group: 'onglets' },
  { id: 'viewReglement', label: 'Voir Reglement', group: 'onglets' },
  { id: 'viewFamille', label: 'Voir Famille', group: 'onglets' },
  { id: 'viewMembers', label: 'Voir Membres', group: 'onglets' },
  { id: 'viewRewards', label: 'Voir Recompenses', group: 'onglets' },
  { id: 'viewAdmin', label: 'Voir Administratif', group: 'onglets' },
  { id: 'viewSteamIds', label: 'Voir SteamID', group: 'onglets' },
  { id: 'viewGestion', label: 'Voir Gestion', group: 'onglets' },
  { id: 'viewActualites', label: 'Voir Actualites', group: 'onglets' },
  // Actions actualités
  { id: 'postActualites', label: 'Poster actualites (message/video)', group: 'actions' },
  { id: 'pingEveryone', label: 'Ping @everyone (notification)', group: 'actions' },
  // Actions
  { id: 'voteApplications', label: 'Voter candidatures', group: 'actions' },
  { id: 'manageApplications', label: 'Decision finale candidatures', group: 'actions' },
  { id: 'editRules', label: 'Modifier reglement', group: 'actions' },
  { id: 'manageFamily', label: 'Gerer journal, confiance et eviter', group: 'actions' },
  { id: 'viewAllRecords', label: 'Voir tous les casiers', group: 'actions' },
  { id: 'viewOwnRecord', label: 'Voir son casier', group: 'actions' },
  { id: 'issueSanctions', label: 'Ajouter sanctions', group: 'actions' },
  { id: 'manageRoles', label: 'Gerer roles et permissions', group: 'actions' },
  { id: 'manageMembers', label: 'Gerer membres', group: 'actions' },
  { id: 'viewLogs', label: 'Voir logs', group: 'actions' },
  { id: 'previewRoles', label: 'Visualiser comme role', group: 'actions' },
];

const defaultRoles: Role[] = [
  {
    id: SUPER_ROLE_ID,
    name: 'Super Admin',
    color: '#ffb6c1',
    isFamily: true,
    rewardEligible: false,
    autoKickPoints: 99,
    permissions: permissionCatalog.map((permission) => permission.id),
  },
  {
    id: PUBLIC_ROLE_ID,
    name: 'Public',
    color: '#98fb98',
    isFamily: false,
    rewardEligible: false,
    autoKickPoints: 3,
    permissions: ['viewDashboard', 'viewCandidature', 'viewReglement', 'viewFamille'] as Permission[],
  },
];

const defaultMembers: Member[] = [];
// Les membres sont créés dynamiquement à la connexion Steam et synchronisés via l'API.

const defaultRules = `# Reglement Famille Meay

1. Respect total entre membres.
2. Aucune toxicite, menace ou comportement qui nuit a la famille.
3. La hierarchie doit etre respectee.
4. La purge a lieu le premier samedi de chaque mois a 21h.
5. Warn oral: 0 point, simple rappel.
6. Warn ecrit: 1, 2 ou 3 points avec raison.
7. Bannissement: sortie immediate de la famille.`;

// localStorage uniquement pour la session (steamid), tout le reste va dans Firebase
function loadLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function firstSaturdayOfMonth(date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth(), 1, 21, 0, 0, 0);
  while (next.getDay() !== 6) next.setDate(next.getDate() + 1);
  return next;
}

function extractSteamIdFromCallback(params: URLSearchParams) {
  const directSteamId = params.get('steamid') || params.get('steamId') || '';
  if (/^\d{17,25}$/.test(directSteamId)) return directSteamId;

  const claimed = params.get('openid.claimed_id') || params.get('openid.identity') || '';
  const steamIdMatch = claimed.match(/steamcommunity\.com\/openid\/id\/(\d{17,25})/);
  if (steamIdMatch?.[1]) return steamIdMatch[1];

  const looseMatch = claimed.match(/(\d{17,25})/);
  return looseMatch?.[1] || '';
}

function isSteamCallback(params: URLSearchParams) {
  return params.get('openid.mode') === 'id_res' || params.has('openid.claimed_id') || params.has('openid.identity') || params.has('steamid');
}

// Tout passe par les fonctions Netlify (pas d'appels directs depuis le navigateur = pas de CORS)

async function fetchSteamProfile(steamId: string) {
  try {
    const res = await fetch(`/.netlify/functions/steam?steamid=${steamId}`);
    if (!res.ok) return {};
    const json = await res.json();
    return {
      name:   json?.name   as string | undefined,
      avatar: json?.avatar as string | undefined,
    };
  } catch {
    return {};
  }
}

async function fetchKobraProfile(steamId: string) {
  try {
    const res = await fetch(`/.netlify/functions/kobra?steamid=${steamId}`);
    if (!res.ok) return {};
    const json = await res.json();
    // kobra.js retourne : { rpName, hoursMonth, hoursWeek, hoursTotal }
    return {
      name:       json?.rpName     as string | undefined,
      weekHours:  json?.hoursWeek  as number | undefined,
      monthHours: json?.hoursMonth as number | undefined,
      totalHours: json?.hoursTotal as number | undefined,
    };
  } catch (err: any) {
    console.error('[Kobra] erreur:', err?.message ?? err);
    return {};
  }
}

function App() {
  const [sessionSteamId, setSessionSteamId] = useState(() => localStorage.getItem('meay_session_steamid') || '');
  const [active, setActive] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [defaultArrivalRoleId, setDefaultArrivalRoleId] = useState(PUBLIC_ROLE_ID);
  const [previewRoleId, setPreviewRoleId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [fbReady, setFbReady] = useState(false);

  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [applications, setApplications] = useState<Application[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [familyPosts, setFamilyPosts] = useState<FamilyPost[]>([]);
  const [trusted, setTrusted] = useState<PersonRecord[]>([]);
  const [avoided, setAvoided] = useState<PersonRecord[]>([]);
  const [purgeVotes, setPurgeVotes] = useState<PurgeVote[]>([]);
  const [steamIds, setSteamIds] = useState<SteamIdEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [lastSeenNewsAt, setLastSeenNewsAt] = useState<string>(() => localStorage.getItem('meay_news_seen') || '');
  const [rules, setRules] = useState(defaultRules);
  const [servers, setServers] = useState<any[]>([]);

  const [applicationText, setApplicationText] = useState({ motivation: '', whyJoin: '' });
  const [memberSearch, setMemberSearch] = useState('');
  const [newRole, setNewRole] = useState({ name: '', color: '#b0e0e6', autoKickPoints: 3, isFamily: true, rewardEligible: true });
  const [newPerson, setNewPerson] = useState({ name: '', steamId: '', note: '' });
  const [newAvoided, setNewAvoided] = useState({ name: '', steamId: '', note: '' });
  const [newSteamEntry, setNewSteamEntry] = useState({ name: '', steamId: '' });
  const [newPost, setNewPost] = useState('');
  const [sanctionForm, setSanctionForm] = useState({ targetSteamId: '', type: 'oral' as Sanction['type'], points: 0, reason: '' });

  // Chargement initial depuis Firebase + écoute temps réel
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    unsubs.push(fbListen<Role[]>('roles', (v) => {
      if (!v.length) { setRoles(defaultRoles); return; }
      // Migration : s'assurer que le super-admin a toujours TOUTES les permissions
      // (utile quand on ajoute de nouvelles permissions comme viewGestion)
      const migrated = v.map((role) => {
        if (role.id === SUPER_ROLE_ID) {
          return { ...role, permissions: permissionCatalog.map((p) => p.id) as Permission[] };
        }
        return role;
      });
      setRoles(migrated);
    }, defaultRoles));
    unsubs.push(fbListen<Member[]>('members', setMembers, []));
    unsubs.push(fbListen<Application[]>('applications', setApplications, []));
    unsubs.push(fbListen<Sanction[]>('sanctions', setSanctions, []));
    unsubs.push(fbListen<FamilyPost[]>('familyPosts', setFamilyPosts, []));
    unsubs.push(fbListen<PersonRecord[]>('trusted', setTrusted, []));
    unsubs.push(fbListen<PersonRecord[]>('avoided', setAvoided, []));
    unsubs.push(fbListen<PurgeVote[]>('purgeVotes', setPurgeVotes, []));
    unsubs.push(fbListen<SteamIdEntry[]>('steamIds', setSteamIds, []));
    unsubs.push(fbListen<LogEntry[]>('logs', setLogs, []));
    unsubs.push(fbListen<NewsPost[]>('newsPosts', setNewsPosts, []));
    unsubs.push(fbListen<string>('rules', setRules, defaultRules));
    unsubs.push(fbListen<string>('defaultArrivalRoleId', (v) => setDefaultArrivalRoleId(v || PUBLIC_ROLE_ID), PUBLIC_ROLE_ID));
    setTimeout(() => setFbReady(true), 1500);
    return () => unsubs.forEach((u) => u());
  }, []);

  // Sauvegarde dans Firebase à chaque changement (seulement après chargement initial)
  const isFirstRender = useRef(true);
  useEffect(() => { if (isFirstRender.current) { isFirstRender.current = false; return; } }, []);
  useEffect(() => { if (fbReady) fbSave('roles', roles); }, [roles]);
  useEffect(() => { if (fbReady) fbSave('members', members); }, [members]);
  useEffect(() => { if (fbReady) fbSave('applications', applications); }, [applications]);
  useEffect(() => { if (fbReady) fbSave('sanctions', sanctions); }, [sanctions]);
  useEffect(() => { if (fbReady) fbSave('familyPosts', familyPosts); }, [familyPosts]);
  useEffect(() => { if (fbReady) fbSave('trusted', trusted); }, [trusted]);
  useEffect(() => { if (fbReady) fbSave('avoided', avoided); }, [avoided]);
  useEffect(() => { if (fbReady) fbSave('purgeVotes', purgeVotes); }, [purgeVotes]);
  useEffect(() => { if (fbReady) fbSave('steamIds', steamIds); }, [steamIds]);
  useEffect(() => { if (fbReady) fbSave('logs', logs); }, [logs]);
  useEffect(() => { if (fbReady) fbSave('newsPosts', newsPosts); }, [newsPosts]);
  useEffect(() => { if (fbReady) fbSave('rules', rules); }, [rules]);
  useEffect(() => { if (fbReady) fbSave('defaultArrivalRoleId', defaultArrivalRoleId); }, [defaultArrivalRoleId]);

  const currentMember = members.find((member) => member.steamId === sessionSteamId) || (sessionSteamId ? {
    steamId: sessionSteamId,
    name: sessionSteamId === SUPER_ADMIN_STEAM_ID ? 'Owner Meay' : `Steam ${sessionSteamId.slice(-6)}`,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${sessionSteamId}`,
    roleId: sessionSteamId === SUPER_ADMIN_STEAM_ID ? SUPER_ROLE_ID : defaultArrivalRoleId,
    status: 'actif' as const,
    weekHours: 0,
    monthHours: 0,
    lastSync: new Date().toISOString(),
  } : null);
  const effectiveRoleId = previewRoleId || currentMember?.roleId || PUBLIC_ROLE_ID;
  const effectiveRole = roles.find((role) => role.id === effectiveRoleId) || defaultRoles[1];
  const isSuperAdmin = currentMember?.steamId === SUPER_ADMIN_STEAM_ID;
  const isOwner = currentMember?.steamId === SUPER_ADMIN_STEAM_ID;
  // Si on est en preview, on respecte strictement les permissions du rôle prévisualisé
  // même pour le super admin (c'est le but du preview)
  const can = (permission: Permission) =>
    previewRoleId
      ? effectiveRole.permissions.includes(permission)
      : isSuperAdmin || effectiveRole.permissions.includes(permission);
  const memberRole = (member: Member) => roles.find((role) => role.id === member.roleId) || defaultRoles[1];
  const familyMembers = members.filter((member) => memberRole(member).isFamily);
  const rewardMembers = familyMembers.filter((member) => memberRole(member).rewardEligible);
  const defaultArrivalRole = roles.find((role) => role.id === defaultArrivalRoleId) || roles.find((role) => role.id === PUBLIC_ROLE_ID) || defaultRoles[1];
  const unreadPings = newsPosts.filter(p => p.isPing && p.at > lastSeenNewsAt).length;
  const unreadNotifications = applications.filter((app) => app.status === 'pending').length + familyPosts.filter((post) => post.type === 'auto').length + unreadPings;

  const addLog = (action: string, details: string) => {
    const actor = currentMember?.name || 'Systeme';
    setLogs((previous) => [{ id: crypto.randomUUID(), actor, action, details, at: new Date().toISOString() }, ...previous]);
  };

  const addAutoPost = (text: string) => {
    setFamilyPosts((previous) => [{ id: crypto.randomUUID(), type: 'auto', text, at: new Date().toISOString() }, ...previous]);
  };

  const upsertMember = (member: Member) => {
    setMembers((previous) => {
      const old = previous.find((item) => item.steamId === member.steamId);
      if (!old) return [member, ...previous];
      return previous.map((item) => (item.steamId === member.steamId ? { ...item, ...member } : item));
    });
  };

  const buildInstantMember = (steamId: string, preferredRoleId?: string): Member => {
    const existing = members.find((member) => member.steamId === steamId);
    return {
      steamId,
      name: existing?.name || (steamId === SUPER_ADMIN_STEAM_ID ? 'Owner Meay' : `Steam ${steamId.slice(-6)}`),
      avatar: existing?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${steamId}`,
      roleId: steamId === SUPER_ADMIN_STEAM_ID ? SUPER_ROLE_ID : existing?.roleId || preferredRoleId || defaultArrivalRoleId,
      status: 'actif',
      weekHours: existing?.weekHours || 0,
      monthHours: existing?.monthHours || 0,
      totalHours: existing?.totalHours || 0,
      lastSync: new Date().toISOString(),
    };
  };

  const syncMember = async (steamId: string, preferredRoleId?: string) => {
    const existing = members.find((member) => member.steamId === steamId);
    const steam = await fetchSteamProfile(steamId);
    const kobra = await fetchKobraProfile(steamId);
    const roleId = steamId === SUPER_ADMIN_STEAM_ID ? SUPER_ROLE_ID : existing?.roleId || preferredRoleId || PUBLIC_ROLE_ID;
    const synced: Member = {
      steamId,
      name: kobra.name || steam.name || existing?.name || `Steam ${steamId.slice(-6)}`,
      avatar: kobra.avatar || steam.avatar || existing?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${steamId}`,
      roleId,
      status: 'actif',
      weekHours: kobra.weekHours ?? existing?.weekHours ?? 0,
      monthHours: kobra.monthHours ?? existing?.monthHours ?? 0,
      totalHours: kobra.totalHours ?? existing?.totalHours ?? 0,
      lastSync: new Date().toISOString(),
    };

    upsertMember(synced);
    return synced;
  };

  const loginWithSteamId = async (steamId: string, preferredRoleId = defaultArrivalRoleId) => {
    const instantMember = buildInstantMember(steamId, preferredRoleId);
    upsertMember(instantMember);
    localStorage.setItem('meay_session_steamid', instantMember.steamId);
    localStorage.removeItem('meay_pending_steam_login');
    setSessionSteamId(instantMember.steamId);
    setActive('dashboard');

    setSyncing(true);
    try {
      const member = await syncMember(steamId, preferredRoleId);
      localStorage.setItem('meay_session_steamid', member.steamId);
      setSessionSteamId(member.steamId);
      addLog('Connexion Steam', `${member.name} connecte avec ${member.steamId}`);
      setActive('dashboard');
    } catch {
      addLog('Connexion Steam', `${instantMember.name} connecte avec ${instantMember.steamId}, sync API en attente`);
    } finally {
      setSyncing(false);
    }
  };

  const buildSteamAuthUrl = () => {
    // returnTo must point back to this page so we can extract the SteamID from openid.claimed_id
    const returnTo = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': window.location.origin,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    });
    return `https://steamcommunity.com/openid/login?${params.toString()}`;
  };

  const startSteamLogin = () => {
    // Redirect the current page to Steam — Steam will redirect back here with
    // openid.claimed_id containing the user's SteamID64.
    // A popup approach does NOT work for a frontend-only app because Steam sets
    // a cookie-based session and the popup context is isolated; postMessage
    // never fires reliably across origins.
    window.location.assign(buildSteamAuthUrl());
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackSteamId = extractSteamIdFromCallback(params);

    // Steam redirects back to this page with openid.* query params.
    if (isSteamCallback(params) && callbackSteamId) {
      loginWithSteamId(callbackSteamId);
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Support manual ?steamid=xxx or ?fallback_steamid=xxx for dev/testing
    const directId = params.get('steamid') || params.get('fallback_steamid');
    if (directId && /^\d{17,25}$/.test(directId) && !callbackSteamId) {
      loginWithSteamId(directId);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const syncSessionFromStorage = () => {
      const storedSteamId = localStorage.getItem('meay_session_steamid') || '';
      if (storedSteamId && storedSteamId !== sessionSteamId) {
        upsertMember(buildInstantMember(storedSteamId));
        setSessionSteamId(storedSteamId);
        setActive('dashboard');
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'meay_session_steamid') syncSessionFromStorage();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === 'MEAY_STEAM_AUTH' && /^\d{17,25}$/.test(event.data.steamId)) {
        loginWithSteamId(event.data.steamId);
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);
    const interval = window.setInterval(syncSessionFromStorage, 500);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
      window.clearInterval(interval);
    };
  }, [sessionSteamId]);

  useEffect(() => {
    fetch('/.netlify/functions/servers')
      .then((r) => r.json())
      .then((data) => setServers(Array.isArray(data) && data.length ? data : [{ name: 'KobraLost DarkRP', players: 0, max_players: 128, address: 'DarkRP' }]))
      .catch(() => setServers([{ name: 'KobraLost DarkRP', players: 0, max_players: 128, address: 'API non accessible' }]));
  }, []);

  const syncAllFamily = async () => {
    setSyncing(true);
    try {
      await Promise.all(familyMembers.map((member) => syncMember(member.steamId, member.roleId)));
      addLog('Synchronisation API', 'Membres famille synchronises avec KobraLost');
    } finally {
      setSyncing(false);
    }
  };

  const submitApplication = () => {
    if (!currentMember || !applicationText.motivation.trim() || !applicationText.whyJoin.trim()) return;
    setApplications((previous) => [
      {
        id: crypto.randomUUID(),
        steamId: currentMember.steamId,
        name: currentMember.name,
        motivation: applicationText.motivation,
        whyJoin: applicationText.whyJoin,
        status: 'pending',
        votes: [],
      },
      ...previous,
    ]);
    setApplicationText({ motivation: '', whyJoin: '' });
    addLog('Candidature', `${currentMember.name} a depose une candidature`);
  };

  const voteApplication = (id: string, vote: 'accept' | 'reject') => {
    if (!currentMember) return;
    setApplications((previous) => previous.map((app) => {
      if (app.id !== id || app.votes.some((item) => item.steamId === currentMember.steamId)) return app;
      return { ...app, votes: [...app.votes, { steamId: currentMember.steamId, name: currentMember.name, vote, at: new Date().toISOString() }] };
    }));
    addLog('Vote candidature', `${currentMember.name} a vote ${vote}`);
  };

  const decideApplication = (id: string, status: 'accepted' | 'rejected') => {
    if (!currentMember) return;
    setApplications((previous) => previous.map((app) => (app.id === id ? { ...app, status, decidedBy: currentMember.name } : app)));
    addLog('Decision candidature', `${currentMember.name} a ${status === 'accepted' ? 'accepte' : 'refuse'} une candidature`);
  };

  const createRole = () => {
    if (!newRole.name.trim()) return;
    setRoles((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        name: newRole.name,
        color: newRole.color,
        isFamily: newRole.isFamily,
        rewardEligible: newRole.rewardEligible,
        autoKickPoints: newRole.autoKickPoints,
        permissions: newRole.isFamily ? ['viewOwnRecord'] : [],
      },
    ]);
    addLog('Role', `Role ${newRole.name} cree`);
    setNewRole({ name: '', color: '#b0e0e6', autoKickPoints: 3, isFamily: true, rewardEligible: true });
  };

  const updateRole = (roleId: string, patch: Partial<Role>) => {
    setRoles((previous) => previous.map((roleItem) => (roleItem.id === roleId ? { ...roleItem, ...patch } : roleItem)));
  };

  const togglePermission = (roleId: string, permission: Permission) => {
    setRoles((previous) => previous.map((roleItem) => {
      if (roleItem.id !== roleId) return roleItem;
      const permissions = roleItem.permissions.includes(permission)
        ? roleItem.permissions.filter((item) => item !== permission)
        : [...roleItem.permissions, permission];
      return { ...roleItem, permissions };
    }));
  };

  const changeMemberRole = (steamId: string, roleId: string) => {
    const before = members.find((member) => member.steamId === steamId);
    const beforeFamily = before ? memberRole(before).isFamily : false;
    const afterRole = roles.find((roleItem) => roleItem.id === roleId);
    setMembers((previous) => previous.map((member) => (member.steamId === steamId ? { ...member, roleId } : member)));
    if (before && afterRole) {
      addLog('Role membre', `${before.name} passe ${afterRole.name}`);
      if (!beforeFamily && afterRole.isFamily) addAutoPost(`${before.name} rejoint officiellement la Famille Meay.`);
      if (beforeFamily && !afterRole.isFamily) addAutoPost(`${before.name} quitte la Famille Meay.`);
    }
  };

  const addSanction = () => {
    if (!currentMember || !sanctionForm.targetSteamId || !sanctionForm.reason.trim()) return;
    const points = sanctionForm.type === 'oral' ? 0 : sanctionForm.type === 'ban' ? 99 : Number(sanctionForm.points);
    const sanction: Sanction = {
      id: crypto.randomUUID(),
      targetSteamId: sanctionForm.targetSteamId,
      type: sanctionForm.type,
      points,
      reason: sanctionForm.reason,
      issuer: currentMember.name,
      createdAt: new Date().toISOString(),
    };
    setSanctions((previous) => [sanction, ...previous]);
    const target = members.find((member) => member.steamId === sanctionForm.targetSteamId);
    const totalPoints = sanctions.filter((item) => item.targetSteamId === sanctionForm.targetSteamId).reduce((sum, item) => sum + item.points, 0) + points;
    if (target) {
      const threshold = memberRole(target).autoKickPoints;
      addLog('Sanction', `${target.name}: ${sanctionForm.type}, ${points} point(s)`);
      if (sanctionForm.type === 'ban' || totalPoints >= threshold) {
        changeMemberRole(target.steamId, PUBLIC_ROLE_ID);
        addAutoPost(`${target.name} est automatiquement retire de la famille (${totalPoints}/${threshold} points).`);
      }
    }
    setSanctionForm({ targetSteamId: '', type: 'oral', points: 0, reason: '' });
  };

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, show: can('viewDashboard') },
    { id: 'actualites', label: 'Actualites', icon: Newspaper, show: true, badge: unreadPings },
    { id: 'candidature', label: 'Candidature', icon: FileText, show: can('viewCandidature') },
    { id: 'membres', label: 'Membres', icon: Users, show: can('viewMembers') && effectiveRole.isFamily },
    { id: 'reglement', label: 'Reglement', icon: BookOpen, show: can('viewReglement') },
    { id: 'famille', label: 'Famille', icon: MessageCircle, show: can('viewFamille') },
    { id: 'recompenses', label: 'Recompense', icon: Award, show: can('viewRewards') },
    { id: 'admin', label: 'Administratif', icon: Shield, show: can('viewAdmin') && effectiveRole.isFamily },
    { id: 'steamid', label: 'SteamID', icon: Database, show: can('viewSteamIds') },
    { id: 'gestion', label: 'Gestion', icon: ClipboardList, show: can('viewGestion') },
  ];

  if (!currentMember) {
    return (
      <main className="grid-bg min-h-screen overflow-hidden bg-[#07070b] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,182,193,.18),transparent_28%),radial-gradient(circle_at_80%_75%,rgba(176,224,230,.16),transparent_32%)]" />
        <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10">

          <h1 className="font-handwriting text-8xl leading-none text-white md:text-9xl">Famille Meay</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-gray-300">
            Connexion Steam uniquement, synchronisation KobraLost, roles, votes, casiers et recompenses.
          </p>

          <div className="mt-8 max-w-xl rounded-3xl border border-white/10 bg-white/[.04] p-5 backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[.3em] text-gray-500">Role attribue automatiquement</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-lg" style={{ color: defaultArrivalRole.color }}>
              <RoleName name={defaultArrivalRole.name} />
            </div>
            <p className="mt-2 text-sm text-gray-500">Seul le owner peut changer ce role dans Gestion.</p>
            <button onClick={startSteamLogin} className="btn-miami mt-4 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-xl font-bold glow-blue">
              <Gamepad2 className="h-6 w-6" />
              Se connecter avec Steam
            </button>
            <p className="mt-3 text-sm text-gray-500">
              Une fenetre Steam s'ouvre. Une fois validee, le dashboard se deverrouille automatiquement ici.
            </p>
          </div>

          <div className="relative mt-8 grid gap-3 md:grid-cols-3">
            {servers.slice(0, 3).map((server, index) => (
              <Panel key={`${server.name || index}`}>
                <p className="text-xl font-bold text-sky-100">{server.name || `Serveur ${index + 1}`}</p>
                <p className="text-gray-400">{server.players ?? 0}/{server.max_players ?? server.slots ?? 128} joueurs</p>
                <p className="text-sm text-pink-200">{server.address || 'DarkRP KobraLost'}</p>
              </Panel>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="grid-bg min-h-screen bg-[#08080d] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08080d]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl bg-white/5 p-2 lg:hidden"><Menu /></button>
            <button onClick={() => setActive('dashboard')} className="font-handwriting text-5xl miami-text">Famille Meay</button>
          </div>
          <div className="flex items-center gap-3">
            {previewRoleId && <button onClick={() => setPreviewRoleId('')} className="rounded-xl border border-pink-300/30 px-3 py-2 text-pink-200"><Eye className="mr-2 inline h-4 w-4" /><RoleName name={effectiveRole.name} /></button>}
            <div className="relative">
              <button onClick={() => { setNotificationsOpen(!notificationsOpen); setAvatarMenuOpen(false); }} className="relative rounded-xl bg-white/5 p-2">
                <Bell />
                {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-pink-300 px-1.5 text-xs font-bold text-black">{unreadNotifications}</span>}
              </button>
              {notificationsOpen && (
                <Panel className="absolute right-0 mt-3 w-80">
                  <p className="font-handwriting text-3xl">Notifications</p>
                  <p className="text-gray-400">{applications.filter((app) => app.status === 'pending').length} candidature(s) en attente.</p>
                  <p className="text-gray-400">{familyPosts.filter((post) => post.type === 'auto').length} message(s) automatique(s) famille.</p>
                  {unreadPings > 0 && <p className="text-yellow-300 font-medium">{unreadPings} ping(s) @everyone non lu(s) → <button onClick={() => { setActive('actualites'); setNotificationsOpen(false); const now = new Date().toISOString(); setLastSeenNewsAt(now); localStorage.setItem('meay_news_seen', now); }} className="underline">Voir Actualités</button></p>}
                </Panel>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="relative focus:outline-none"
              >
                <img src={currentMember.avatar} alt="avatar" className="h-11 w-11 rounded-full border-2 border-sky-200 hover:border-pink-300 transition-colors" />
                {previewRoleId && (
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-pink-400 border-2 border-[#08080d] flex items-center justify-center">
                    <Eye className="h-2 w-2 text-black" />
                  </span>
                )}
              </button>
              {avatarMenuOpen && (
                <Panel className="absolute right-0 mt-3 w-56 z-50">
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                    <img src={currentMember.avatar} alt="avatar" className="h-9 w-9 rounded-full border-2 border-sky-200" />
                    <div>
                      <p className="font-semibold text-sm text-white">{currentMember.name}</p>
                      <p className="text-xs text-gray-400" style={{ color: effectiveRole.color }}>{effectiveRole.name}</p>
                    </div>
                  </div>
                  {previewRoleId && (
                    <button
                      onClick={() => { setPreviewRoleId(''); setAvatarMenuOpen(false); }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-pink-200 hover:bg-pink-500/10 transition mb-1"
                    >
                      <Eye className="h-4 w-4" />
                      Arrêter la prévisualisation
                    </button>
                  )}
                  <button
                    onClick={() => { localStorage.removeItem('meay_session_steamid'); localStorage.removeItem('meay_pending_steam_login'); setSessionSteamId(''); setPreviewRoleId(''); setAvatarMenuOpen(false); }}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-pink-200 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    Se déconnecter
                  </button>
                </Panel>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[250px_1fr]">
        <aside className={`${menuOpen ? 'block' : 'hidden'} h-fit rounded-3xl border border-white/10 bg-[#101017]/80 p-3 lg:block`}>
          {navigation.filter((item) => item.show).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => {
                setActive(item.id);
                setMenuOpen(false);
                if (item.id === 'actualites') {
                  const now = new Date().toISOString();
                  setLastSeenNewsAt(now);
                  localStorage.setItem('meay_news_seen', now);
                }
              }} className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-lg transition ${active === item.id ? 'bg-pink-200/15 text-pink-100' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {'badge' in item && (item as any).badge > 0 && (
                  <span className="rounded-full bg-pink-400 px-2 py-0.5 text-xs font-bold text-black animate-pulse">
                    {(item as any).badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        <section className="min-w-0 animate-fade-in">
          {active === 'dashboard' && <Dashboard currentMember={currentMember} effectiveRole={effectiveRole} familyCount={familyMembers.length} sanctions={sanctions} servers={servers} syncing={syncing} onSync={() => { setSyncing(true); syncMember(currentMember.steamId, currentMember.roleId).finally(() => setSyncing(false)); }} />}
          {active === 'actualites' && <ActualitesSection posts={newsPosts} setPosts={setNewsPosts} currentMember={currentMember} canPost={can('postActualites')} canPing={can('pingEveryone')} />}
          {active === 'candidature' && <ApplicationsSection applications={applications} currentMember={currentMember} canVote={can('voteApplications')} canManage={can('manageApplications')} applicationText={applicationText} setApplicationText={setApplicationText} onSubmit={submitApplication} onVote={voteApplication} onDecide={decideApplication} />}
          {active === 'membres' && <MembersSection members={familyMembers} roles={roles} search={memberSearch} setSearch={setMemberSearch} />}
          {active === 'reglement' && <RulesSection rules={rules} setRules={setRules} editable={can('editRules')} />}
          {active === 'famille' && <FamilySection currentMember={currentMember} canManage={can('manageFamily')} posts={familyPosts} setPosts={setFamilyPosts} trusted={trusted} setTrusted={setTrusted} avoided={avoided} setAvoided={setAvoided} purgeVotes={purgeVotes} setPurgeVotes={setPurgeVotes} newPost={newPost} setNewPost={setNewPost} newPerson={newPerson} setNewPerson={setNewPerson} newAvoided={newAvoided} setNewAvoided={setNewAvoided} />}
          {active === 'recompenses' && <RewardsSection members={rewardMembers} />}
          {active === 'admin' && <AdminSection currentMember={currentMember} members={familyMembers} roles={roles} sanctions={sanctions} canViewAll={can('viewAllRecords')} canIssue={can('issueSanctions')} form={sanctionForm} setForm={setSanctionForm} onAdd={addSanction} />}
          {active === 'steamid' && <SteamIdSection entries={steamIds} setEntries={setSteamIds} form={newSteamEntry} setForm={setNewSteamEntry} />}
          {active === 'gestion' && <ManagementSection roles={roles} members={members} logs={logs} applications={applications} newRole={newRole} setNewRole={setNewRole} onCreateRole={createRole} onUpdateRole={updateRole} onTogglePermission={togglePermission} onChangeMemberRole={changeMemberRole} onSyncAll={syncAllFamily} setPreviewRoleId={setPreviewRoleId} canLogs={can('viewLogs')} canPreview={can('previewRoles')} isOwner={isOwner} defaultArrivalRoleId={defaultArrivalRoleId} setDefaultArrivalRoleId={setDefaultArrivalRoleId} />}
        </section>
      </div>
    </main>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/10 bg-[#12121a]/90 p-5 shadow-2xl shadow-black/20 ${className}`}>{children}</div>;
}

function Title({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-handwriting text-6xl leading-none miami-text">{title}</h2>
      <p className="mt-2 text-lg text-gray-400">{text}</p>
    </div>
  );
}

function Dashboard({ currentMember, effectiveRole, familyCount, sanctions, servers, syncing, onSync }: { currentMember: Member; effectiveRole: Role; familyCount: number; sanctions: Sanction[]; servers: any[]; syncing: boolean; onSync: () => void }) {
  const points = sanctions.filter((sanction) => sanction.targetSteamId === currentMember.steamId).reduce((sum, sanction) => sum + sanction.points, 0);
  return (
    <div>
      <Title title="Dashboard" text="Profil Steam, grade, activite et etat serveur." />
      <Panel className="mb-5">
        <div className="flex flex-wrap items-center gap-5">
          <img src={currentMember.avatar} alt="avatar" className="h-24 w-24 rounded-full border-4 border-pink-200" />
          <div className="flex-1">
            <h3 className="font-handwriting text-5xl">{currentMember.name}</h3>
            <p className="text-2xl" style={{ color: effectiveRole.color }}><RoleName name={effectiveRole.name} /> - {currentMember.status}</p>
            <p className="text-sm text-gray-500">SteamID: {currentMember.steamId}</p>
          </div>
          <button onClick={onSync} disabled={syncing} className="btn-miami rounded-2xl px-5 py-3 font-semibold">{syncing ? 'Synchronisation...' : 'Sync API'}</button>
        </div>
      </Panel>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Heures ce mois" value={`${currentMember.monthHours}h`} />
        <Stat label="Heures semaine" value={`${currentMember.weekHours}h`} />
        <Stat label="Temps total" value={`${currentMember.totalHours}h`} />
        <Stat label="Membres famille" value={`${familyCount}`} />
        <Stat label="Points casier" value={`${points}/${effectiveRole.autoKickPoints}`} />
      </div>
      <Panel className="mt-5">
        <h3 className="mb-3 font-handwriting text-3xl">Connexion serveur DarkRP</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {servers.slice(0, 4).map((server, index) => (
            <div key={`${server.name || index}`} className="rounded-2xl bg-white/5 p-4">
              <p className="text-xl text-sky-100">{server.name || `Serveur ${index + 1}`}</p>
              <p className="text-gray-400">{server.players ?? 0}/{server.max_players ?? server.slots ?? 128} joueurs</p>
              <p className="text-sm text-pink-200">{server.address || server.ip || 'Adresse via API'}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <Panel><p className="text-4xl font-bold miami-text">{value}</p><p className="text-gray-400">{label}</p></Panel>;
}

function ApplicationsSection({ applications, currentMember, canVote, canManage, applicationText, setApplicationText, onSubmit, onVote, onDecide }: { applications: Application[]; currentMember: Member; canVote: boolean; canManage: boolean; applicationText: { motivation: string; whyJoin: string }; setApplicationText: (value: { motivation: string; whyJoin: string }) => void; onSubmit: () => void; onVote: (id: string, vote: 'accept' | 'reject') => void; onDecide: (id: string, status: 'accepted' | 'rejected') => void }) {
  return (
    <div>
      <Title title="Candidature" text="Postuler, voter, consulter les votes et decider." />
      <Panel className="mb-4">
        <textarea className="mb-3 w-full" value={applicationText.motivation} onChange={(event) => setApplicationText({ ...applicationText, motivation: event.target.value })} placeholder="Lettre de motivation" />
        <textarea className="mb-3 w-full" value={applicationText.whyJoin} onChange={(event) => setApplicationText({ ...applicationText, whyJoin: event.target.value })} placeholder="Pourquoi souhaitez-vous rejoindre la famille ?" />
        <button onClick={onSubmit} className="btn-miami rounded-2xl px-5 py-3 text-lg font-semibold">Envoyer ma candidature</button>
      </Panel>
      <div className="grid gap-4">
        {applications.map((application) => {
          const userVoted = application.votes.some((vote) => vote.steamId === currentMember.steamId);
          return (
            <Panel key={application.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-handwriting text-4xl">{application.name}</h3>
                  <p className="text-sm text-gray-500">{application.steamId}</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{application.status}</span>
              </div>
              <p className="mt-4 text-gray-300">{application.motivation}</p>
              <p className="mt-2 text-gray-400">{application.whyJoin}</p>
              <div className="mt-4 rounded-2xl bg-white/5 p-3">
                <p className="font-semibold text-sky-100">Votes visibles</p>
                {application.votes.length === 0 ? <p className="text-gray-500">Aucun vote</p> : application.votes.map((vote) => <p key={`${application.id}-${vote.steamId}`} className="text-gray-300">{vote.name}: {vote.vote === 'accept' ? 'Pour' : 'Contre'}</p>)}
              </div>
              {canVote && application.status === 'pending' && !userVoted && <div className="mt-4 flex gap-2"><button onClick={() => onVote(application.id, 'accept')} className="rounded-xl bg-green-300/15 px-4 py-2 text-green-200"><Check className="mr-1 inline h-4 w-4" />Accepter</button><button onClick={() => onVote(application.id, 'reject')} className="rounded-xl bg-red-300/15 px-4 py-2 text-red-200"><X className="mr-1 inline h-4 w-4" />Refuser</button></div>}
              {canManage && application.status === 'pending' && <div className="mt-4 flex gap-2"><button onClick={() => onDecide(application.id, 'accepted')} className="btn-miami rounded-xl px-4 py-2">Decision: accepter</button><button onClick={() => onDecide(application.id, 'rejected')} className="rounded-xl bg-white/10 px-4 py-2">Decision: refuser</button></div>}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function MembersSection({ members, roles, search, setSearch }: { members: Member[]; roles: Role[]; search: string; setSearch: (value: string) => void }) {
  const filtered = members.filter((member) => `${member.name} ${member.steamId}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <Title title="Membres" text="Liste publique limitee aux roles marques comme famille." />
      <div className="relative mb-4"><Search className="absolute left-3 top-3 text-gray-500" /><input className="w-full pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un nom ou SteamID" /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((member) => {
          const role = roles.find((item) => item.id === member.roleId);
          return <Panel key={member.steamId}><div className="flex items-center gap-4"><img src={member.avatar} alt="avatar" className="h-16 w-16 rounded-full" /><div><h3 className="font-handwriting text-3xl">{member.name}</h3><p style={{ color: role?.color }}><RoleName name={role?.name ?? ''} /></p><p className="text-sm text-gray-500">{member.monthHours}h ce mois</p></div></div></Panel>;
        })}
      </div>
    </div>
  );
}

// Available KBRP emojis
const KBRP_EMOJIS: Record<string, string> = {
  angel: '/emojis/angel.png', angry: '/emojis/angry.png', astronaut: '/emojis/astronaut.png',
  ban: '/emojis/ban.png', beer: '/emojis/beer.png', blush: '/emojis/blush.png',
  bot: '/emojis/bot.png', briefcase: '/emojis/briefcase.png', camera: '/emojis/camera.png',
  checkmark: '/emojis/checkmark.png', citizen: '/emojis/citizen.png', constructor: '/emojis/constructor.png',
  cool: '/emojis/cool.png', crown: '/emojis/crown.png', cry: '/emojis/cry.png',
  delivery: '/emojis/delivery.png', devil: '/emojis/devil.png', dress: '/emojis/dress.png',
  firefighter: '/emojis/firefighter.png', fishing: '/emojis/fishing.png', hacker: '/emojis/hacker.png',
  hi: '/emojis/hi.png', hunter: '/emojis/hunter.png', kiss: '/emojis/kiss.png',
  lol: '/emojis/lol.png', love: '/emojis/love.png', magnifying_glass: '/emojis/magnifying_glass.png',
  money: '/emojis/money.png', muted: '/emojis/muted.png', owl_zombie: '/emojis/owl_zombie.png',
  pain: '/emojis/pain.png', paradise: '/emojis/paradise.png', party: '/emojis/party.png',
  plate: '/emojis/plate.png', police: '/emojis/police.png', prison_jail: '/emojis/prison_jail.png',
  prisoner: '/emojis/prisoner.png', purge: '/emojis/purge.png', rip: '/emojis/rip.png',
  santa: '/emojis/santa.png', shield: '/emojis/shield.png', sip: '/emojis/sip.png',
  sports_car_driver: '/emojis/sports_car_driver.png', staffdiscord: '/emojis/staffdiscord.png',
  star: '/emojis/star.png', sweat: '/emojis/sweat.png', thumbs_up: '/emojis/thumbs_up.png',
  ufo: '/emojis/ufo.png', welder: '/emojis/welder.png', wink: '/emojis/wink.png',
  zeus: '/emojis/zeus.png', zombie: '/emojis/zombie.png', mlc: '/emojis/mlc.png',
  alert: '/emojis/alert.gif', exc: '/emojis/exc.gif', verifiedroxo: '/emojis/verifiedroxo.gif',
};

function RoleName({ name, style, className }: { name: string; style?: React.CSSProperties; className?: string }) {
  const parts = name.split(/(\[emoji:[^\]]+\])/g);
  return (
    <span style={style} className={className}>
      {parts.map((part, i) => {
        const match = part.match(/^\[emoji:([^\]]+)\]$/);
        if (match) {
          const key = match[1].toLowerCase().replace(/ /g, '_');
          const src = KBRP_EMOJIS[key];
          if (src) return <img key={i} src={src} alt={key} className="inline-block align-middle" style={{ height: '1.1em', width: 'auto', marginRight: 2 }} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function renderRulesLine(line: string, i: number): React.ReactNode {
  // Parse inline [emoji:name] tokens
  const renderInline = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\[emoji:[^\]]+\])/g);
    return parts.map((part, j) => {
      const match = part.match(/^\[emoji:([^\]]+)\]$/);
      if (match) {
        const name = match[1].toLowerCase().replace(/ /g, '_');
        const src = KBRP_EMOJIS[name];
        if (src) return <img key={j} src={src} alt={name} className="inline-block align-middle" style={{ height: '1.4em', width: 'auto', verticalAlign: 'middle' }} />;
        return <span key={j} className="text-pink-400 text-sm">[{name}?]</span>;
      }
      return <span key={j}>{part}</span>;
    });
  };

  if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold mb-4 mt-6" style={{ background: 'linear-gradient(135deg,#FFB6C1,#B0E0E6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{renderInline(line.slice(2))}</h1>;
  if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold mb-3 mt-5 text-pink-300">{renderInline(line.slice(3))}</h2>;
  if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-medium mb-2 mt-4 text-sky-300">{renderInline(line.slice(4))}</h3>;
  if (line.trim() === '') return <div key={i} className="h-3" />;
  // Bold
  if (line.includes('**')) {
    const boldParts = line.split('**');
    return <p key={i} className="text-gray-300 mb-2">{boldParts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{renderInline(part)}</strong> : renderInline(part))}</p>;
  }
  return <p key={i} className="text-gray-300 mb-2">{renderInline(line)}</p>;
}

function EmojiPicker({ onInsert }: { onInsert: (tag: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen(o => !o)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm flex items-center gap-1">
        😀 Emojis KBRP
      </button>
      {open && (
        <div className="absolute z-50 top-9 left-0 bg-[#18181f] border border-gray-700 rounded-xl p-3 grid grid-cols-6 gap-1" style={{ width: 280 }}>
          {Object.entries(KBRP_EMOJIS).map(([name, src]) => (
            <button key={name} title={name} type="button" onClick={() => { onInsert(`[emoji:${name}]`); setOpen(false); }}
              className="hover:bg-white/10 rounded p-1 flex items-center justify-center">
              <img src={src} alt={name} style={{ height: 28, width: 'auto' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RulesSection({ rules, setRules, editable }: { rules: string; setRules: (value: string) => void; editable: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(rules);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertEmoji = (tag: string) => {
    const ta = textareaRef.current;
    if (!ta) { setDraft(d => d + tag); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = draft.slice(0, start) + tag + draft.slice(end);
    setDraft(next);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + tag.length; ta.focus(); }, 0);
  };

  const handleSave = () => { setRules(draft); setIsEditing(false); };
  const handleCancel = () => { setDraft(rules); setIsEditing(false); };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <Title title="Reglement" text="Texte structure, modifiable selon permission." />
        {editable && !isEditing && (
          <button onClick={() => { setDraft(rules); setIsEditing(true); }} className="px-4 py-2 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-sm font-medium">
            ✏️ Modifier
          </button>
        )}
      </div>
      <Panel>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <EmojiPicker onInsert={insertEmoji} />
              <span className="text-xs text-gray-500">Syntax: [emoji:nom] — ex: [emoji:crown]</span>
            </div>
            <textarea
              ref={textareaRef}
              className="min-h-96 w-full text-sm font-mono"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium">Sauvegarder</button>
              <button onClick={handleCancel} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            {rules.split('\n').map((line, i) => renderRulesLine(line, i))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function FamilySection({ currentMember, canManage, posts, setPosts, trusted, setTrusted, avoided, setAvoided, purgeVotes, setPurgeVotes, newPost, setNewPost, newPerson, setNewPerson, newAvoided, setNewAvoided }: { currentMember: Member; canManage: boolean; posts: FamilyPost[]; setPosts: (value: FamilyPost[]) => void; trusted: PersonRecord[]; setTrusted: (value: PersonRecord[]) => void; avoided: PersonRecord[]; setAvoided: (value: PersonRecord[]) => void; purgeVotes: PurgeVote[]; setPurgeVotes: (value: PurgeVote[]) => void; newPost: string; setNewPost: (value: string) => void; newPerson: { name: string; steamId: string; note: string }; setNewPerson: (value: { name: string; steamId: string; note: string }) => void; newAvoided: { name: string; steamId: string; note: string }; setNewAvoided: (value: { name: string; steamId: string; note: string }) => void }) {
  const purgeDate = firstSaturdayOfMonth();
  const votePurge = (answer: 'present' | 'absent') => {
    setPurgeVotes([...purgeVotes.filter((vote) => vote.steamId !== currentMember.steamId), { steamId: currentMember.steamId, name: currentMember.name, answer, at: new Date().toISOString() }]);
  };
  return (
    <div>
      <Title title="Famille" text="Journal interne, confiance, personnes a eviter et purge." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h3 className="font-handwriting text-3xl">Journal interne</h3>
          {canManage && <div className="mt-3 flex gap-2"><input className="flex-1" value={newPost} onChange={(event) => setNewPost(event.target.value)} placeholder="Annonce" /><button className="btn-miami rounded-xl px-4" onClick={() => { if (newPost.trim()) { setPosts([{ id: crypto.randomUUID(), type: 'manual', text: newPost, author: currentMember.name, at: new Date().toISOString() }, ...posts]); setNewPost(''); } }}>Ajouter</button></div>}
          <div className="mt-4 space-y-2">{posts.map((post) => <div key={post.id} className="rounded-2xl bg-white/5 p-3"><p className="text-gray-200">{post.text}</p><p className="text-xs text-gray-500">{post.type === 'auto' ? 'Auto' : post.author} - {new Date(post.at).toLocaleString('fr-FR')}</p></div>)}</div>
        </Panel>
        <Panel>
          <h3 className="font-handwriting text-3xl">Purge mensuelle</h3>
          <p className="text-gray-300">Premier samedi du mois a 21h: {purgeDate.toLocaleDateString('fr-FR')} 21:00</p>
          <div className="mt-3 flex gap-2"><button onClick={() => votePurge('present')} className="btn-miami rounded-xl px-4 py-2">Present</button><button onClick={() => votePurge('absent')} className="rounded-xl bg-white/10 px-4 py-2">Absent</button></div>
          <div className="mt-4 space-y-2">{purgeVotes.map((vote) => <p key={vote.steamId} className="rounded-xl bg-white/5 p-2">{vote.name}: {vote.answer}</p>)}</div>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <PersonList title="Personnes de confiance hors famille" records={trusted} setRecords={setTrusted} form={newPerson} setForm={setNewPerson} canManage={canManage} />
        <PersonList title="Personnes a eviter" records={avoided} setRecords={setAvoided} form={newAvoided} setForm={setNewAvoided} canManage={canManage} />
      </div>
    </div>
  );
}

function PersonList({ title, records, setRecords, form, setForm, canManage }: { title: string; records: PersonRecord[]; setRecords: (value: PersonRecord[]) => void; form: { name: string; steamId: string; note: string }; setForm: (value: { name: string; steamId: string; note: string }) => void; canManage: boolean }) {
  return <Panel><h3 className="font-handwriting text-3xl">{title}</h3>{canManage && <div className="mt-3 grid gap-2 md:grid-cols-3"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nom" /><input value={form.steamId} onChange={(event) => setForm({ ...form, steamId: event.target.value })} placeholder="SteamID" /><input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Note" /><button className="btn-miami rounded-xl px-4 py-2 md:col-span-3" onClick={() => { if (form.name && form.steamId) { setRecords([{ id: crypto.randomUUID(), name: form.name, steamId: form.steamId, note: form.note, at: new Date().toISOString() }, ...records]); setForm({ name: '', steamId: '', note: '' }); } }}>Ajouter</button></div>}<div className="mt-4 space-y-2">{records.map((record) => <div key={record.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-3"><div><p className="font-semibold">{record.name}</p><p className="text-sm text-gray-500">{record.steamId} - {record.note}</p></div>{canManage && <button onClick={() => setRecords(records.filter((item) => item.id !== record.id))} className="text-red-300"><Trash2 className="h-4 w-4" /></button>}</div>)}</div></Panel>;
}

function RewardsSection({ members }: { members: Member[] }) {
  const week = [...members].sort((a, b) => b.weekHours - a.weekHours).slice(0, 10);
  const month = [...members].sort((a, b) => b.monthHours - a.monthHours).slice(0, 10);
  const day = new Date().getDate();
  return (
    <div>
      <Title title="Recompense" text="Classement des roles eligibles uniquement." />
      {day <= 3 && <Panel className="mb-4 text-center"><p className="text-xl text-gray-300">Notification 72h</p><p className="font-handwriting text-5xl miami-text">Gagnant du mois: {month[0]?.name || 'Aucun'}</p></Panel>}
      <div className="grid gap-4 xl:grid-cols-2"><Leaderboard title="Semaine" members={week} period="week" /><Leaderboard title="Mois" members={month} period="month" /></div>
    </div>
  );
}

function Leaderboard({ title, members, period }: { title: string; members: Member[]; period: 'week' | 'month' }) {
  return <Panel><h3 className="mb-3 font-handwriting text-4xl">{title}</h3>{members.map((member, index) => <div key={member.steamId} className="mb-2 flex items-center gap-3 rounded-2xl bg-white/5 p-3"><Trophy className={index === 0 ? 'text-pink-200' : 'text-gray-500'} /><span className="w-7 text-xl">{index + 1}</span><img src={member.avatar} alt="avatar" className="h-11 w-11 rounded-full" /><span className="flex-1 font-semibold">{member.name}</span><span className="text-2xl miami-text">{period === 'week' ? member.weekHours : member.monthHours}h</span></div>)}</Panel>;
}

function AdminSection({ currentMember, members, roles, sanctions, canViewAll, canIssue, form, setForm, onAdd }: { currentMember: Member; members: Member[]; roles: Role[]; sanctions: Sanction[]; canViewAll: boolean; canIssue: boolean; form: { targetSteamId: string; type: Sanction['type']; points: number; reason: string }; setForm: (value: { targetSteamId: string; type: Sanction['type']; points: number; reason: string }) => void; onAdd: () => void }) {
  const visibleMembers = canViewAll ? members : members.filter((member) => member.steamId === currentMember.steamId);
  return (
    <div>
      <Title title="Administratif" text="Casiers, sanctions et auto-kick selon points." />
      {canIssue && <Panel className="mb-4"><div className="grid gap-2 md:grid-cols-5"><select value={form.targetSteamId} onChange={(event) => setForm({ ...form, targetSteamId: event.target.value })}><option value="">Membre</option>{members.map((member) => <option key={member.steamId} value={member.steamId}>{member.name}</option>)}</select><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Sanction['type'], points: event.target.value === 'oral' ? 0 : 1 })}><option value="oral">Warn oral</option><option value="written">Warn ecrit</option><option value="ban">Bannissement</option></select><input type="number" min="0" max="3" value={form.points} onChange={(event) => setForm({ ...form, points: Number(event.target.value) })} /><input className="md:col-span-2" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Raison" /><button className="btn-miami rounded-xl px-4 py-2 md:col-span-5" onClick={onAdd}>Ajouter sanction</button></div></Panel>}
      <div className="grid gap-4">
        {visibleMembers.map((member) => {
          const role = roles.find((item) => item.id === member.roleId);
          const records = sanctions.filter((sanction) => sanction.targetSteamId === member.steamId);
          const points = records.reduce((sum, sanction) => sum + sanction.points, 0);
          return <Panel key={member.steamId}><h3 className="font-handwriting text-4xl">{member.name}</h3><p className="text-gray-400">{points}/{role?.autoKickPoints ?? 3} points {points >= (role?.autoKickPoints ?? 3) ? '- kick automatique atteint' : ''}</p>{records.map((record) => <div key={record.id} className="mt-2 rounded-2xl bg-white/5 p-3"><p className="font-semibold">{record.type} - {record.points} point(s)</p><p className="text-gray-400">{record.reason}</p><p className="text-xs text-gray-500">Par {record.issuer}, {new Date(record.createdAt).toLocaleString('fr-FR')}</p></div>)}</Panel>;
        })}
      </div>
    </div>
  );
}

function SteamIdSection({ entries, setEntries, form, setForm }: { entries: SteamIdEntry[]; setEntries: (value: SteamIdEntry[]) => void; form: { name: string; steamId: string }; setForm: (value: { name: string; steamId: string }) => void }) {
  return <div><Title title="SteamID" text="Categorie visible par permission." /><Panel><div className="grid gap-2 md:grid-cols-3"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nom" /><input value={form.steamId} onChange={(event) => setForm({ ...form, steamId: event.target.value })} placeholder="SteamID64" /><button className="btn-miami rounded-xl px-4 py-2" onClick={() => { if (form.name && form.steamId) { setEntries([{ id: crypto.randomUUID(), name: form.name, steamId: form.steamId, at: new Date().toISOString() }, ...entries]); setForm({ name: '', steamId: '' }); } }}>Ajouter</button></div>{entries.map((entry) => <p key={entry.id} className="mt-3 rounded-2xl bg-white/5 p-3"><b>{entry.name}</b> - {entry.steamId}</p>)}</Panel></div>;
}

function ManagementSection({ roles, members, logs, applications, newRole, setNewRole, onCreateRole, onUpdateRole, onTogglePermission, onChangeMemberRole, onSyncAll, setPreviewRoleId, canLogs, canPreview, isOwner, defaultArrivalRoleId, setDefaultArrivalRoleId }: { roles: Role[]; members: Member[]; logs: LogEntry[]; applications: Application[]; newRole: { name: string; color: string; autoKickPoints: number; isFamily: boolean; rewardEligible: boolean }; setNewRole: (value: { name: string; color: string; autoKickPoints: number; isFamily: boolean; rewardEligible: boolean }) => void; onCreateRole: () => void; onUpdateRole: (roleId: string, patch: Partial<Role>) => void; onTogglePermission: (roleId: string, permission: Permission) => void; onChangeMemberRole: (steamId: string, roleId: string) => void; onSyncAll: () => void; setPreviewRoleId: (roleId: string) => void; canLogs: boolean; canPreview: boolean; isOwner: boolean; defaultArrivalRoleId: string; setDefaultArrivalRoleId: (roleId: string) => void }) {
  return (
    <div>
      <Title title="Gestion" text="Roles, permissions, membres, candidatures, logs et preview." />
      {isOwner && <Panel className="mb-4"><h3 className="font-handwriting text-3xl">Role attribue a l'arrivee</h3><p className="text-gray-400">Les joueurs ne choisissent pas leur role. Le owner definit ici le role automatiquement attribue a la premiere connexion.</p><select className="mt-3 w-full" value={defaultArrivalRoleId} onChange={(event) => setDefaultArrivalRoleId(event.target.value)}>{roles.filter((role) => role.id !== SUPER_ROLE_ID).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></Panel>}
      <Panel className="mb-4"><h3 className="font-handwriting text-3xl">Creer un role</h3>
      <div className="mb-2 flex items-center gap-2">
        <EmojiPicker onInsert={(tag) => setNewRole({ ...newRole, name: newRole.name + tag })} />
        <span className="text-xs text-gray-500">Ajoute un emoji devant le nom (ex: [emoji:crown] Chef)</span>
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-5">
        <input value={newRole.name} onChange={(event) => setNewRole({ ...newRole, name: event.target.value })} placeholder="Nom du role" style={{ gridColumn: 'span 5' }} /><input type="color" value={newRole.color} onChange={(event) => setNewRole({ ...newRole, color: event.target.value })} /><input type="number" value={newRole.autoKickPoints} onChange={(event) => setNewRole({ ...newRole, autoKickPoints: Number(event.target.value) })} /><label className="rounded-xl bg-white/5 p-2"><input type="checkbox" checked={newRole.isFamily} onChange={(event) => setNewRole({ ...newRole, isFamily: event.target.checked })} /> Famille</label><label className="rounded-xl bg-white/5 p-2"><input type="checkbox" checked={newRole.rewardEligible} onChange={(event) => setNewRole({ ...newRole, rewardEligible: event.target.checked })} /> Classement</label><button className="btn-miami rounded-xl px-4 py-2 md:col-span-5" onClick={onCreateRole}>Creer</button></div></Panel>
      <div className="grid gap-4">
        {roles.map((role) => <Panel key={role.id}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-handwriting text-4xl" style={{ color: role.color }}><RoleName name={role.name} /></h3>
          <div className="flex items-center gap-2 flex-wrap">
            {canPreview && <button onClick={() => setPreviewRoleId(role.id)} className="rounded-xl bg-white/10 px-3 py-2 text-sm">Visualiser</button>}
            <div className="flex items-center gap-1">
              <EmojiPicker onInsert={(tag) => onUpdateRole(role.id, { name: tag + role.name })} />
              <input
                className="rounded-xl bg-white/10 px-3 py-2 text-sm w-44"
                defaultValue={role.name}
                onBlur={(e) => { if (e.target.value.trim() && e.target.value !== role.name) onUpdateRole(role.id, { name: e.target.value.trim() }); }}
                placeholder="Renommer..."
              />
            </div>
          </div>
        </div><div className="mt-3 grid gap-2 md:grid-cols-4"><label className="rounded-xl bg-white/5 p-2"><input type="checkbox" checked={role.isFamily} onChange={(event) => onUpdateRole(role.id, { isFamily: event.target.checked })} /> Famille</label><label className="rounded-xl bg-white/5 p-2"><input type="checkbox" checked={role.rewardEligible} onChange={(event) => onUpdateRole(role.id, { rewardEligible: event.target.checked })} /> Classement</label><label className="rounded-xl bg-white/5 p-2 md:col-span-2">Auto-kick points <input className="ml-2 w-20" type="number" value={role.autoKickPoints} onChange={(event) => onUpdateRole(role.id, { autoKickPoints: Number(event.target.value) })} /></label><div className="mt-2 w-full col-span-4">
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Onglets visibles</p>
                    <div className="grid gap-2 md:grid-cols-4">
                      {permissionCatalog.filter(p => p.group === 'onglets').map((permission) => <label key={permission.id} className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-2 flex items-center gap-2 cursor-pointer hover:bg-sky-500/20"><input type="checkbox" checked={role.permissions.includes(permission.id)} onChange={() => onTogglePermission(role.id, permission.id)} /> {permission.label}</label>)}
                    </div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1 mt-3">Actions & droits</p>
                    <div className="grid gap-2 md:grid-cols-4">
                      {permissionCatalog.filter(p => p.group === 'actions').map((permission) => <label key={permission.id} className="rounded-xl bg-white/5 p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10"><input type="checkbox" checked={role.permissions.includes(permission.id)} onChange={() => onTogglePermission(role.id, permission.id)} /> {permission.label}</label>)}
                    </div>
                  </div></div></Panel>)}
      </div>
      <Panel className="mt-4"><div className="flex items-center justify-between"><h3 className="font-handwriting text-3xl">Membres</h3><button onClick={onSyncAll} className="btn-miami rounded-xl px-4 py-2">Sync API famille</button></div>{members.map((member) => <div key={member.steamId} className="mt-2 flex items-center gap-2 rounded-2xl bg-white/5 p-3"><span className="flex-1">{member.name} <span className="text-xs text-gray-500">{member.steamId}</span></span><select value={member.roleId} onChange={(event) => onChangeMemberRole(member.steamId, event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>)}</Panel>
      <Panel className="mt-4"><h3 className="font-handwriting text-3xl">Candidatures</h3><p className="text-gray-400">{applications.length} candidature(s), {applications.filter((application) => application.status === 'pending').length} en attente.</p></Panel>
      {canLogs && <Panel className="mt-4"><h3 className="font-handwriting text-3xl">Logs</h3>{logs.map((log) => <p key={log.id} className="mt-2 rounded-xl bg-white/5 p-2"><b>{log.action}</b> - {log.details} <span className="text-xs text-gray-500">par {log.actor}</span></p>)}</Panel>}
    </div>
  );
}

// ─── Onglet Actualités ────────────────────────────────────────────────────────
function ActualitesSection({
  posts, setPosts, currentMember, canPost, canPing
}: {
  posts: NewsPost[];
  setPosts: (v: NewsPost[]) => void;
  currentMember: Member;
  canPost: boolean;
  canPing: boolean;
}) {
  const [msgText, setMsgText] = useState('');
  const [ytUrl, setYtUrl]     = useState('');
  const [pingText, setPingText] = useState('');
  const [tab, setTab] = useState<'message' | 'youtube' | 'ping'>('message');

  function getYoutubeId(url: string) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function addPost(type: NewsPost['type'], content: string, isPing = false) {
    if (!content.trim()) return;
    const post: NewsPost = {
      id: crypto.randomUUID(),
      author: currentMember.name,
      authorSteamId: currentMember.steamId,
      type,
      content: content.trim(),
      isPing,
      at: new Date().toISOString(),
    };
    setPosts([post, ...posts]);
    setMsgText(''); setYtUrl(''); setPingText('');
  }

  function deletePost(id: string) {
    setPosts(posts.filter(p => p.id !== id));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-handwriting text-5xl miami-text">Actualites</h2>
        <p className="mt-1 text-gray-500">Annonces, videos et pings pour tous les membres.</p>
      </div>

      {/* Zone de publication */}
      {canPost && (
        <Panel>
          {/* Onglets du formulaire */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab('message')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${tab === 'message' ? 'bg-pink-500/20 text-pink-200 border border-pink-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              <MessageCircle className="h-4 w-4" /> Message
            </button>
            <button onClick={() => setTab('youtube')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${tab === 'youtube' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              <Video className="h-4 w-4" /> YouTube
            </button>
            {canPing && (
              <button onClick={() => setTab('ping')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${tab === 'ping' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                <Radio className="h-4 w-4" /> Ping @everyone
              </button>
            )}
          </div>

          {tab === 'message' && (
            <div className="flex gap-2">
              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder="Écrire une annonce..."
                className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-pink-400"
                rows={3}
              />
              <button onClick={() => addPost('message', msgText)} className="btn-miami self-end rounded-xl px-5 py-3 font-semibold">
                Publier
              </button>
            </div>
          )}

          {tab === 'youtube' && (
            <div className="space-y-2">
              <input
                value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
                placeholder="URL YouTube (ex: https://youtu.be/xxxx)"
                className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
              />
              {ytUrl && getYoutubeId(ytUrl) && (
                <div className="rounded-xl overflow-hidden border border-white/10 aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${getYoutubeId(ytUrl)}`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}
              <button onClick={() => { const id = getYoutubeId(ytUrl); if (id) addPost('youtube', ytUrl); }} className="btn-miami rounded-xl px-5 py-3 font-semibold">
                Publier la vidéo
              </button>
            </div>
          )}

          {tab === 'ping' && canPing && (
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <Radio className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-200">Un ping envoie une notification visible à tous les membres. Utilise-le avec parcimonie.</p>
              </div>
              <div className="flex gap-2">
                <input
                  value={pingText}
                  onChange={e => setPingText(e.target.value)}
                  placeholder="Message du ping @everyone..."
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
                <button onClick={() => addPost('ping', pingText, true)} className="rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 px-5 py-3 font-semibold hover:bg-yellow-500/30 transition">
                  Ping !
                </button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* Liste des posts */}
      <div className="space-y-4">
        {posts.length === 0 && (
          <Panel>
            <p className="text-center text-gray-500 py-6">Aucune actualité pour le moment.</p>
          </Panel>
        )}
        {posts.map(post => (
          <Panel key={post.id} className={post.isPing ? 'border-yellow-500/40 bg-yellow-500/5' : ''}>
            {/* En-tête */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {post.type === 'message' && <MessageCircle className="h-4 w-4 text-pink-400" />}
                {post.type === 'youtube' && <Video className="h-4 w-4 text-red-400" />}
                {post.type === 'ping' && <Radio className="h-4 w-4 text-yellow-400" />}
                <span className="font-semibold text-white">{post.author}</span>
                {post.isPing && (
                  <span className="rounded-full bg-yellow-500/20 border border-yellow-500/30 px-2 py-0.5 text-xs font-bold text-yellow-300">
                    @everyone
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(post.at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {currentMember.steamId === post.authorSteamId && (
                <button onClick={() => deletePost(post.id)} className="text-gray-600 hover:text-red-400 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Contenu */}
            {post.type === 'message' && (
              <p className="text-gray-200 whitespace-pre-wrap">{post.content}</p>
            )}
            {post.type === 'ping' && (
              <p className="text-yellow-100 whitespace-pre-wrap">{post.content}</p>
            )}
            {post.type === 'youtube' && (
              <div className="space-y-2">
                <div className="rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${getYoutubeId(post.content)}`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
                <a href={post.content} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline break-all">
                  {post.content}
                </a>
              </div>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}

export default App;