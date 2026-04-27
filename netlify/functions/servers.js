// Proxy Netlify pour récupérer la liste des serveurs KobraLost
const KOBRA_TOKEN = 'PAT_5kleQtzAnSEM0II2Uw2Keg4dS2gEjU4BuMcj';

exports.handler = async function() {
  try {
    const res = await fetch('https://dashboard.kobralost-rp.com/api/v2/servers', {
      headers: {
        'Authorization': `Bearer ${KOBRA_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const servers = Array.isArray(data) ? data : (data?.data || data?.servers || []);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(servers),
    };
  } catch (err) {
    console.error('[servers] erreur:', err.message);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify([]),
    };
  }
};
