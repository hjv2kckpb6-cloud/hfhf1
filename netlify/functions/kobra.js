const KOBRA_TOKEN = 'PAT_5kleQtzAnSEM0II2Uw2Keg4dS2gEjU4BuMcj';
const SERVER_ID   = 1; // ID du serveur KobraLost

exports.handler = async function(event) {
  const steamId = event.queryStringParameters?.steamid;
  if (!steamId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'steamid manquant' }) };
  }

  const headers = {
    'Authorization': `Bearer ${KOBRA_TOKEN}`,
    'Content-Type':  'application/json',
  };

  const empty = { rpName: null, hoursMonth: 0, hoursWeek: 0, hoursTotal: 0 };

  try {
    // ── ETAPE 1 : Profil joueur → récupère rpName ET uuid interne ─────────────
    // L'API attend le steamId ici, et renvoie { data: { uuid, name, ... } }
    const playerRes = await fetch(
      `https://dashboard.kobralost-rp.com/api/v2/${SERVER_ID}/players/${steamId}`,
      { headers }
    );

    if (!playerRes.ok) {
      console.error('[kobra] profil introuvable, statut:', playerRes.status);
      return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(empty) };
    }

    const playerJson = await playerRes.json();
    const player = playerJson?.data ?? playerJson ?? null;
    const rpName = player?.name ?? null;
    // L'UUID interne Kobra (différent du steamId) sert pour l'endpoint /sessions
    const uuid   = player?.uuid ?? player?.id ?? null;

    console.log('[kobra] player:', JSON.stringify(player).slice(0, 200));
    console.log('[kobra] rpName:', rpName, '| uuid:', uuid);

    if (!uuid) {
      console.error('[kobra] uuid absent dans la réponse profil');
      return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ...empty, rpName }) };
    }

    // ── ETAPE 2 : Bornes temporelles ─────────────────────────────────────────
    const now = new Date();

    // Début du mois : 1er à 00:00:00 UTC
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

    // Début de la semaine : lundi 00:00:00 UTC
    const dow = now.getUTCDay(); // 0=dim
    const diffMon = (dow === 0) ? -6 : 1 - dow;
    const startOfWeek = new Date(now);
    startOfWeek.setUTCDate(now.getUTCDate() + diffMon);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    // ── ETAPE 3 : Sessions via uuid + filtre playTime ────────────────────────
    // On utilise les query params from/to/filters documentés dans l'API
    // → from=0 (tout depuis le début) filters=playTime pour éviter les doublons
    const sessionsUrl = `https://dashboard.kobralost-rp.com/api/v2/${SERVER_ID}/players/${uuid}/sessions?filters=playTime&from=0`;
    const sessionsRes = await fetch(sessionsUrl, { headers });

    let allSessions = [];
    if (sessionsRes.ok) {
      const raw = await sessionsRes.json();
      allSessions = Array.isArray(raw) ? raw
                  : Array.isArray(raw?.data) ? raw.data
                  : [];
      console.log('[kobra] sessions reçues:', allSessions.length, '| 1er exemple:', JSON.stringify(allSessions[0]).slice(0, 150));
    } else {
      console.error('[kobra] sessions HTTP:', sessionsRes.status, await sessionsRes.text().catch(() => ''));
    }

    // ── ETAPE 4 : Calcul des heures ──────────────────────────────────────────
    // Format attendu : { filter:"playTime", fromDate:"...", endDate:"...", duration: <secondes> }
    let totalSec = 0, monthSec = 0, weekSec = 0;

    for (const s of allSessions) {
      // durée en secondes (champ "duration" ou calcul fromDate→endDate)
      let dur = 0;
      if (typeof s.duration === 'number' && s.duration > 0) {
        dur = s.duration;
      } else if (s.fromDate && s.endDate) {
        dur = Math.max(0, (new Date(s.endDate) - new Date(s.fromDate)) / 1000);
      }
      if (dur <= 0) continue;

      const from = new Date(s.fromDate ?? s.from_date ?? s.start);
      if (isNaN(from.getTime())) continue;

      // Borne de fin = endDate ou fromDate+dur, tronquée à maintenant si session en cours
      const endRaw = s.endDate ? new Date(s.endDate) : new Date(from.getTime() + dur * 1000);
      const end    = endRaw > now ? now : endRaw;
      const effectiveSec = Math.max(0, (end - from) / 1000);

      totalSec += effectiveSec;
      if (from >= startOfMonth) monthSec += effectiveSec;
      if (from >= startOfWeek)  weekSec  += effectiveSec;
    }

    const hoursTotal = Math.round(totalSec / 3600);
    const hoursMonth = Math.round(monthSec / 3600);
    const hoursWeek  = Math.round(weekSec  / 3600);

    console.log('[kobra] hoursTotal:', hoursTotal, '| hoursMonth:', hoursMonth, '| hoursWeek:', hoursWeek);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ rpName, hoursMonth, hoursWeek, hoursTotal }),
    };

  } catch (err) {
    console.error('[kobra] erreur:', err.message);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(empty),
    };
  }
};
