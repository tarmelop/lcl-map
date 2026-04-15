const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load configuration
let config;
try {
    config = require('./config.js');
} catch (error) {
    console.error('Error: config.js not found. Please copy config.example.js to config.js and update with your settings.');
    process.exit(1);
}

const app = express();
const PORT = config.port;
const PINS_FILE = path.join(__dirname, 'pins.json');
const ADMIN_PASSWORD = config.adminPassword;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize pins file if it doesn't exist
async function initPinsFile() {
    try {
        await fs.access(PINS_FILE);
    } catch {
        await fs.writeFile(PINS_FILE, JSON.stringify([], null, 2));
    }
}

// Read pins from file
async function readPins() {
    try {
        const data = await fs.readFile(PINS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading pins:', error);
        return [];
    }
}

// Write pins to file
async function writePins(pins) {
    await fs.writeFile(PINS_FILE, JSON.stringify(pins, null, 2));
}

// API Routes

// Get public config (for frontend)
app.get('/api/config', async (req, res) => {
    res.json({
        mapTilerApiKey: config.mapTilerApiKey,
        useMapTiler: config.useMapTiler,
        clusterRadius: config.clusterRadius !== undefined ? config.clusterRadius : 40
    });
});

// Get all pins (without edit tokens)
app.get('/api/pins', async (req, res) => {
    try {
        const pins = await readPins();
        // Remove edit tokens from public response
        const publicPins = pins.map(({ editToken, ...pin }) => pin);
        res.json(publicPins);
    } catch (error) {
        console.error('Error fetching pins:', error);
        res.status(500).json({ error: 'Failed to fetch pins' });
    }
});

// Get single pin by edit token
app.get('/api/pins/:editToken', async (req, res) => {
    try {
        const pins = await readPins();
        const pin = pins.find(p => p.editToken === req.params.editToken);

        if (!pin) {
            return res.status(404).json({ error: 'Pin not found' });
        }

        res.json(pin);
    } catch (error) {
        console.error('Error fetching pin:', error);
        res.status(500).json({ error: 'Failed to fetch pin' });
    }
});

// Create new pin
app.post('/api/pins', async (req, res) => {
    try {
        const { name, forumUsername, greeting, about, location, color, lat, lng } = req.body;

        // Validation
        if (!name || !location || !lat || !lng) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (name.length > 100) {
            return res.status(400).json({ error: 'Name is too long' });
        }

        if (about && about.length > 500) {
            return res.status(400).json({ error: 'About is too long' });
        }

        if (greeting && greeting.length > 150) {
            return res.status(400).json({ error: 'Greeting is too long' });
        }

        const pins = await readPins();

        const newPin = {
            id: uuidv4(),
            editToken: uuidv4(),
            name: name.trim(),
            forumUsername: forumUsername ? forumUsername.trim().replace(/^@/, '') : '',
            greeting: greeting ? greeting.trim() : '',
            about: about ? about.trim() : '',
            location: location.trim(),
            color: color || '#3498db',
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            createdAt: new Date().toISOString()
        };

        pins.push(newPin);
        await writePins(pins);

        res.status(201).json(newPin);
    } catch (error) {
        console.error('Error creating pin:', error);
        res.status(500).json({ error: 'Failed to create pin' });
    }
});

// Update pin
app.put('/api/pins/:editToken', async (req, res) => {
    try {
        const { name, forumUsername, greeting, about, location, color, lat, lng } = req.body;
        const { editToken } = req.params;

        // Validation
        if (!name || !location || !lat || !lng) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pins = await readPins();
        const pinIndex = pins.findIndex(p => p.editToken === editToken);

        if (pinIndex === -1) {
            return res.status(404).json({ error: 'Pin not found or invalid edit token' });
        }

        pins[pinIndex] = {
            ...pins[pinIndex],
            name: name.trim(),
            forumUsername: forumUsername !== undefined ? forumUsername.trim().replace(/^@/, '') : (pins[pinIndex].forumUsername || ''),
            greeting: greeting !== undefined ? greeting.trim() : (pins[pinIndex].greeting || ''),
            about: about ? about.trim() : '',
            location: location.trim(),
            color: color || pins[pinIndex].color || '#3498db',
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            updatedAt: new Date().toISOString()
        };

        await writePins(pins);

        res.json(pins[pinIndex]);
    } catch (error) {
        console.error('Error updating pin:', error);
        res.status(500).json({ error: 'Failed to update pin' });
    }
});

// Delete pin
app.delete('/api/pins/:editToken', async (req, res) => {
    try {
        const { editToken } = req.params;
        const pins = await readPins();
        const pinIndex = pins.findIndex(p => p.editToken === editToken);

        if (pinIndex === -1) {
            return res.status(404).json({ error: 'Pin not found or invalid edit token' });
        }

        const deletedPin = pins[pinIndex];
        pins.splice(pinIndex, 1);
        await writePins(pins);

        res.json({ success: true, id: deletedPin.id });
    } catch (error) {
        console.error('Error deleting pin:', error);
        res.status(500).json({ error: 'Failed to delete pin' });
    }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { password } = req.body;

        if (password === ADMIN_PASSWORD) {
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get all pins with edit tokens (admin only)
app.post('/api/admin/pins', async (req, res) => {
    try {
        const { password } = req.body;

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const pins = await readPins();
        res.json(pins);
    } catch (error) {
        console.error('Error fetching admin pins:', error);
        res.status(500).json({ error: 'Failed to fetch pins' });
    }
});

// Start server
initPinsFile().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
