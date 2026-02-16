require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();

console.log('CLIENT_ID:', process.env.HUBSPOT_CLIENT_ID);
console.log('REDIRECT_URI:', process.env.HUBSPOT_REDIRECT_URI);

// -------------------
// MongoDB Connection
// -------------------
// mongoose.connect(process.env.MONGO_URI)
//     .then(() => console.log("MongoDB connected"))
//     .catch(err => console.error("Mongo error:", err));

// -------------------
// Simplified Schema - Single Portal Only
// -------------------
// const appConfigSchema = new mongoose.Schema({
//     _id: { type: String, default: 'single_portal' },
//     accessToken: { type: String, required: true },
//     refreshToken: { type: String, required: true },
//     portalId: { type: String, required: true },
//     currentCounter: { type: Number, default: parseInt(process.env.START_VALUE) || 261525 }
// });

// const AppConfig = mongoose.model("AppConfig", appConfigSchema);

// -------------------
// Public App Install URL
// -------------------
function getInstallUrl() {
    const scopes = 'crm.objects.deals.read crm.objects.deals.write crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write';
    return `https://app.hubspot.com/oauth/authorize` +
        `?client_id=${process.env.HUBSPOT_CLIENT_ID}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&redirect_uri=${encodeURIComponent(process.env.HUBSPOT_REDIRECT_URI)}`;
}

let projectCounter = 261525;

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
// OAuth Callback
// -------------------
app.get('/oauth/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) return res.status(400).send("Missing code");

        const tokenRes = await axios.post(
            'https://api.hubapi.com/oauth/v1/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env.HUBSPOT_CLIENT_ID,
                client_secret: process.env.HUBSPOT_CLIENT_SECRET,
                redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
                code
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token, refresh_token, hub_id } = tokenRes.data;

        // Save single portal configuration
        await AppConfig.findOneAndUpdate(
            { _id: 'single_portal' },
            { 
                accessToken: access_token, 
                refreshToken: refresh_token,
                portalId: hub_id.toString()
            },
            { upsert: true }
        );

        res.send("App installed successfully! You can now use the increment endpoint.");
    } catch (err) {
        console.error("OAuth error:", err.response?.data || err.message);
        res.status(500).send("OAuth failed");
    }
});

// -------------------
app.use(express.json());

// -------------------
// Get Next Project ID - Just returns the counter, doesn't update deals
// -------------------
app.post('/get-next-project-id', async (req, res) => {
    try {
        // Get the app configuration
        // let config = await AppConfig.findById('single_portal');
        
        // if (!config) {
        //     return res.status(400).json({ 
        //         error: "App not installed. Please visit /install first." 
        //     });
        // }

        // // Increment the counter
        // config = await AppConfig.findOneAndUpdate(
        //     { _id: 'single_portal' },
        //     { $inc: { currentCounter: 1 } },
        //     { returnDocument: 'after' }
        // );

        const newProjectId = projectCounter++;

        // Just return the project ID
        res.json({ 
            success: true,
            project_id: newProjectId 
        });
    } catch (err) {
        console.error("Error getting project ID:", err.message);
        res.status(500).json({ 
            success: false,
            // error: "Internal Server Error", 
            details: err.message 
        });
    }
});

// -------------------
// Get Current Counter (without incrementing)
// -------------------
app.get('/current-counter', async (req, res) => {
    try {
        const config = await AppConfig.findById('single_portal');
        
        if (!config) {
            return res.status(400).json({ 
                error: "App not installed. Please visit /install first." 
            });
        }

        res.json({ 
            current_counter: config.currentCounter 
        });
    } catch (err) {
        console.error("Error getting current counter:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// -------------------
// Reset Counter
// -------------------
app.post('/restart-counter', async (req, res) => {
    try {
        const startValue = parseInt(process.env.START_VALUE) || 261525;

        await AppConfig.findOneAndUpdate(
            { _id: 'single_portal' },
            { currentCounter: startValue },
            { upsert: true }
        );

        res.json({ 
            success: true,
            message: `Counter reset to ${startValue}`,
            current_counter: startValue
        });
    } catch (err) {
        console.error("Error resetting counter:", err.message);
        res.status(500).json({ 
            success: false,
            error: "Internal Server Error" 
        });
    }
});

// -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));