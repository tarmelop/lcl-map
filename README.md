# LCL Participants Map

A simple, mobile-friendly web app where people can add themselves to a collaborative map.

## Features

- 📍 Add yourself to the map with name, about me, and location
- 🎨 Choose your own pin color or use random colors
- 🔍 Location autocomplete using OpenStreetMap's Nominatim service
- 🗂️ Automatic pin clustering when many pins are close together
- 🔗 Unique edit links - no login required
- ✏️ Edit or delete your pin using your personal link
- 📱 Fully responsive and mobile-friendly
- 🗺️ Interactive map powered by Leaflet.js and OpenStreetMap
- 🌍 Multi-language support (English, Italiano, Español, Português, العربية, Français, Türkçe, 日本語)
- 📊 Live participant counter
- 🔐 Admin panel for managing all pins (password protected)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure the application:
```bash
cp config.example.js config.js
```

Edit `config.js` and update:
- `adminPassword`: Change from default to a secure password
- `mapTilerApiKey`: (Optional) Add your MapTiler API key for multi-language map labels
- `useMapTiler`: Set to `false` to use free OpenStreetMap tiles instead

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## How It Works

### Changing Language
1. Use the language dropdown in the header to select your preferred language
2. The entire interface (buttons, forms, messages) will update automatically
3. Location autocomplete will provide suggestions in your selected language
4. Your language preference is saved for future visits

**Map Tiles Configuration:**
- By default, the map uses free OpenStreetMap tiles which show place names in their native/local language
- For translated map labels in your selected language, you can enable MapTiler:
  1. Get a free API key from [MapTiler](https://www.maptiler.com/cloud/)
  2. Edit `config.js`
  3. Set `useMapTiler: true`
  4. Add your API key to `mapTilerApiKey: 'YOUR_API_KEY_HERE'`
- The UI and location search are always fully translated regardless of which tile provider you use

### Adding a Pin
1. Click "Add Yourself" button
2. Fill in your name, about me (optional), and location
3. Start typing a location and select from autocomplete suggestions (in your selected language)
4. Choose a pin color (a random color is pre-selected, or click "Random" for a new one)
5. Click "Save"
6. **Important:** Save the unique edit link provided - this is how you'll edit or delete your pin later

### Editing a Pin
1. Open the unique edit link you received when creating your pin
2. Make your changes
3. Click "Save"

### Deleting a Pin
1. Open your unique edit link
2. Click "Delete"
3. Confirm the deletion

### Admin Panel
1. Access the admin panel by visiting: `http://localhost:3000/?admin`
2. Enter the admin password (configured in `config.js`)
3. Toggle password visibility using the eye icon
4. Use the search bar to filter pins by name, location, or description
5. Click "Edit" on any pin in the list, or click pins directly on the map
6. Edit or delete any pin from the admin interface

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Map:** Leaflet.js with OpenStreetMap tiles
- **Clustering:** Leaflet.markercluster for grouping nearby pins
- **Geocoding:** Nominatim (OpenStreetMap)
- **Backend:** Node.js + Express
- **Storage:** JSON file

## Deployment

You can deploy this app to any Node.js hosting service:

- **Heroku:** Easy deployment with Git
- **Railway:** Modern platform with free tier
- **DigitalOcean:** Deploy on App Platform or Droplet
- **Vercel/Netlify:** Use with serverless functions adaptation

Make sure to set the `PORT` environment variable if required by your hosting service.

## File Structure

```
lcl-map/
├── public/
│   ├── index.html         # Main HTML page
│   ├── app.js             # Frontend JavaScript
│   ├── style.css          # Styles
│   └── translations.js    # Language translations
├── server.js              # Express server and API
├── config.js              # Configuration (create from config.example.js)
├── config.example.js      # Example configuration file
├── package.json           # Dependencies
├── pins.json             # Pin data (created automatically)
└── README.md             # This file
```

## API Endpoints

### Public Endpoints
- `GET /api/config` - Get public configuration (MapTiler key, etc.)
- `GET /api/pins` - Get all pins (without edit tokens)
- `GET /api/pins/:editToken` - Get specific pin by edit token
- `POST /api/pins` - Create new pin
- `PUT /api/pins/:editToken` - Update pin
- `DELETE /api/pins/:editToken` - Delete pin

### Admin Endpoints
- `POST /api/admin/login` - Admin login (requires password in body)
- `POST /api/admin/pins` - Get all pins with edit tokens (requires password in body)

## Important Notes

- **Configuration:** Always create `config.js` from `config.example.js` and update with your own secure settings
- **Security:** Change the default admin password in `config.js` before deploying to production
- **Git Safety:** The `config.js` file is in `.gitignore` to prevent accidentally committing sensitive credentials
- **Edit Links:** The edit link is the only way to modify or delete a pin. Make sure users save it!
- **No Authentication:** This app doesn't use traditional authentication. Security is based on the uniqueness of edit tokens (UUIDs).
- **Admin Access:** Access the admin panel via `/?admin` URL parameter - no visible button in the interface
- **Admin Features:** Search through hundreds of pins, click-to-edit from map when logged in as admin
- **Data Storage:** Pins are stored in a JSON file. For production use with many users, consider switching to a proper database.
- **Rate Limiting:** Consider adding rate limiting to prevent abuse of the Nominatim API and your endpoints.
- **Multi-language:** The app supports 8 languages with full UI translation and localized location search
- **RTL Support:** Arabic language automatically switches to right-to-left text direction
- **Map Tiles:** Two options available:
  - **OpenStreetMap (default):** Free, no API key needed, shows place names in native/local language
  - **MapTiler (optional):** Requires free API key, provides translated map labels in your selected language

## License

MIT
