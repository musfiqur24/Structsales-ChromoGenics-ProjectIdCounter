require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

console.log('CLIENT_ID:', process.env.HUBSPOT_CLIENT_ID);
console.log('REDIRECT_URI:', process.env.HUBSPOT_REDIRECT_URI);

// -------------------
// HubSpot Install URL
// -------------------
function getInstallUrl() {
    const scopes =
        'crm.objects.deals.read crm.objects.deals.write ' +
        'crm.objects.contacts.read crm.objects.contacts.write ' +
        'crm.objects.companies.read crm.objects.companies.write';

    return (
        'https://app.hubspot.com/oauth/authorize' +
        `?client_id=${process.env.HUBSPOT_CLIENT_ID}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&redirect_uri=${encodeURIComponent(process.env.HUBSPOT_REDIRECT_URI)}`
    );
}

// -------------------
// In-memory counter
// -------------------
let projectCounter = parseInt(process.env.START_VALUE) || 261525;

// -------------------
// Routes
// -------------------
app.get('/', (req, res) => {
    const installUrl = getInstallUrl();
    res.send(`
        <h1>HubSpot Counter App</h1>
        <p><a href="${installUrl}">Click here to install the app</a></p>
        <p>Or visit: <a href="/install">/install</a></p>
    `);
});

app.get('/install', (req, res) => {
    res.redirect(getInstallUrl());
});

// -------------------
// OAuth Callback (NO DB)
// -------------------
app.get('/oauth/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) return res.status(400).send('Missing code');

        await axios.post(
            'https://api.hubapi.com/oauth/v1/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env.HUBSPOT_CLIENT_ID,
                client_secret: process.env.HUBSPOT_CLIENT_SECRET,
                redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
                code,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        res.send('App installed successfully! You can now use the counter.');
    } catch (err) {
        console.error('OAuth error:', err.response?.data || err.message);
        res.status(500).send('OAuth failed');
    }
});

// -------------------
// Get Next Project ID
// -------------------
app.post('/get-next-project-id', (req, res) => {
    const newProjectId = projectCounter++;
    res.json({
        success: true,
        project_id: newProjectId,
    });
});

// -------------------
// Get Current Counter
// -------------------
app.get('/current-counter', (req, res) => {
    res.json({
        current_counter: projectCounter,
    });
});

// -------------------
// Reset Counter
// -------------------
app.post('/restart-counter', (req, res) => {
    projectCounter = parseInt(process.env.START_VALUE) || 261525;

    res.json({
        success: true,
        message: `Counter reset to ${projectCounter}`,
        current_counter: projectCounter,
    });
});

// -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
);
