// Proxy Netlify pour l'API Steam (évite les erreurs CORS du navigateur)
const STEAM_API_KEY = 'FA46E6FA408317D64E957F59F5FDA13F';

exports.handler = async function(event) {
  const steamId = event.queryStringParameters?.steamid;

  if (!steamId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'steamid manquant' }) };
  }

  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    const res = await fetch(url);

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ name: null, avatar: null }),
      };
    }

    const data = await res.json();
    const player = data?.response?.players?.[0] ?? null;

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        name:   player?.personaname ?? null,
        avatar: player?.avatarfull  ?? null,
      }),
    };
  } catch (err) {
    console.error('[steam] erreur:', err.message);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ name: null, avatar: null }),
    };
  }
};
