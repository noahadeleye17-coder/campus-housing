# Off-Campus Hub

A student housing and roommate-matching platform built for FUTA (Federal University of Technology, Akure) students.A listings directory connecting students with verified off-campus apartments and each other, with no payment processing involved. It's a discovery and connection tool: find a place, find a roommate, and take it from there.

**Live site:** [offcampushub.ng](https://offcampushub.ng)

## Features

**For students**
- Browse and search verified apartment listings near campus, with server-side search and pagination
- Filter by price range and distance from FUTA
- Map view with distance calculated from a fixed FUTA reference point
- Roommate matching: build a profile, browse others, and send/accept connect requests with privacy-gated contact reveal (WhatsApp/contact info only shared after a mutual match)
- Google OAuth or local email/password login
- Account settings: notification preferences, password changes, account deletion (with full cleanup of associated data and media)

**For landlords**
- List apartments with multiple photos and video, auto-resized and stored on Cloudinary
- Edit listings without losing existing photos
- WhatsApp deep-link contact button, pre-filled with the listing context so students don't have to explain which apartment they're asking about
- Email fallback contact (ungated, unlike roommate contact)

**Admin dashboard**
- Manage all listings across all landlords, not just one's own
- Manage all user accounts: change roles, disable, or delete
- Post site-wide announcements/content
- View platform stats
- Send a "welcome back" re-engagement email campaign to selected students or all students at once (via Resend)

**Under the hood**
- Server-side rendering for apartment detail pages with injected meta tags and JSON-LD structured data, so shared links unfurl properly and pages are indexable
- Dynamically generated `sitemap.xml` built from live listings
- Progressive Web App (PWA),installable to the home screen; logged-in users land straight on their dashboard, logged-out users land on the homepage
- Rate limiting across auth, password reset, uploads, and general writes

## Tech stack

- **Backend:** Node.js, Express 5
- **Database:** MongoDB Atlas via Mongoose
- **Auth:** JWT + Google OAuth
- **Media:** Multer + Sharp for image processing, Cloudinary for storage
- **Email:** Resend
- **Maps/Geocoding:** Leaflet, Nominatim (FUTA-biased search)
- **Frontend:** Vanilla HTML/CSS/JS
- **Testing:** Jest + Supertest
- **Hosting:** Render

## Project structure

```
├── controllers/       # Route handlers (apartments, users, admin, auth, roommates)
├── models/             # Mongoose schemas (Apartment, User, RoommateProfile, RoommateRequest, SiteConfig)
├── routes/             # Express route definitions
├── middleware/         # Auth middleware, rate limiting
├── upload/             # Multer config + Sharp image resizing
├── utils/              # Shared helpers (email, etc.)
├── frontend/           # Static HTML/CSS/JS pages
├── server.js           # App entry point
└── config.example.env  # Environment variable template
```

## Getting started

**Prerequisites:** Node.js, a MongoDB Atlas cluster, a Cloudinary account, a Resend account, and a Google OAuth client ID.

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template and fill in your own values:
   ```bash
   cp config.example.env .env
   ```

3. Set the following environment variables in `.env`:

   | Variable | Description |
   |---|---|
   | `PORT` | Port the server runs on |
   | `MONGO_URI` | MongoDB Atlas connection string |
   | `JWT_SECRET` | Secret used to sign auth tokens |
   | `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
   | `FRONTEND_URL` | Base URL of the frontend (used in emails/redirects) |
   | `SITE_URL` | Canonical site URL, used to build the sitemap (e.g. `https://offcampushub.ng`) |
   | `ALLOWED_ORIGIN` | Comma-separated list of allowed CORS origins |
   | `RESEND_API_KEY` | Resend API key for transactional and campaign email |
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Cloudinary API secret |
   | `API_RATE_LIMIT_MAX` | General API rate limit |
   | `AUTH_RATE_LIMIT_MAX` | Login/register rate limit |
   | `PASSWORD_RESET_RATE_LIMIT_MAX` | Password reset rate limit |
   | `WRITE_RATE_LIMIT_MAX` | Write-operation rate limit |
   | `UPLOAD_RATE_LIMIT_MAX` | Upload rate limit |
   | `UPLOAD_FILE_SIZE_LIMIT_MB` | Max upload file size in MB |

4. Run the dev server:
   ```bash
   npm run dev
   ```

5. Run tests:
   ```bash
   npm test
   ```

## License

ISC
