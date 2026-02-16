require('dotenv').config();

console.log('=== ENVIRONMENT CHECK ===');
console.log('CLIENT_ID:', process.env.HUBSPOT_CLIENT_ID);
console.log('REDIRECT_URI:', process.env.HUBSPOT_REDIRECT_URI);
console.log('========================');

const express = require('express');
const app = express();

function getInstallUrl() {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI;
    
    console.log('Inside function - CLIENT_ID:', clientId);
    console.log('Inside function - REDIRECT_URI:', redirectUri);
    
    return `https://app.hubspot.com/oauth/authorize` +
        `?client_id=${clientId}` +
        `&scope=crm.objects.deals.read%20crm.objects.deals.write` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

app.get('/test', (req, res) => {
    const url = getInstallUrl();
    console.log('Generated URL:', url);
    res.send(`<pre>${url}</pre>`);
});

app.listen(3001, () => console.log('Test server on port 3001'));