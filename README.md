# Cars21

Cars21 is a Next.js car marketplace frontend with Node.js Route Handlers for inventory search and GridFS photo storage.

## Run locally

1. Keep `.env.local` in the project root. It contains the MongoDB connection string and private management credentials; it is ignored by Git.
2. Run `npm install` after pulling or cloning the project.
3. Run `npm run dev` and open `http://localhost:3000`.
4. Run `npm run build` before deployment; `npm start` serves the production build.

The provided Atlas connection is configured locally with database name `cars21`. Never put `MONGODB_URI`, `CARS21_ADMIN_TOKEN`, `CARS21_SESSION_SECRET`, `CARS21_SUPERADMIN_USERNAME`, `CARS21_SUPERADMIN_PASSWORD`, or `WHATSAPP_ADMIN_NUMBER` in browser code, a public environment variable, or source control. For deployment, add them as server-side environment variables in the host dashboard. Keep the database user scoped to the Cars21 database. `CARS21_SESSION_SECRET` should be a separate, long random value.

## Inventory search

The homepage search accepts a car, make, or model plus city, make, and budget. The inventory page sends `q`, `city`, `make`, `fuel`, `body`, `minPrice`, `maxPrice`, and `sort` filters to `GET /api/cars`. Search text is escaped before building MongoDB regex filters. Inventory responses are bounded to 100 records.

`cars` documents use `id`, `make`, `model`, `variant`, `year`, `km`, `fuel`, `transmission`, `owners`, `price`, `city`, optional `area`, `body`, `score`, `badge`, `color`, `accent`, and optionally `imageId`, `sellerName`, `sellerPhone`, and `sellerWhatsApp`. The detail route is `GET /api/cars/:id`.

The Atlas connection check succeeded, and the `cars` collection is currently empty. In development, the API falls back to the existing illustrative inventory if MongoDB is unreachable or the collection has no records. Production reads only MongoDB and returns an empty result until listings are added. Demo records are not written to the database automatically.

### Add or update an inventory record

`POST /api/cars` upserts one listing by `id`. Admins can publish, pause, mark sold, and assign listings to vendors. Vendor submissions and edits are saved as `pending` for admin review. Vendors can edit and remove only their own listings.

## Superadmin, admin and vendor workspaces

- Set `CARS21_SUPERADMIN_USERNAME` and `CARS21_SUPERADMIN_PASSWORD` in `.env.local` or your deployment environment. Open `/superadmin` and sign in using those values. The superadmin is provisioned only from environment variables, never from MongoDB. Changing the password invalidates existing superadmin sessions.
- Only the superadmin can create admin or vendor accounts. New accounts receive a random one-time password that is shown once; share it securely. The superadmin can edit or delete accounts, suspend/reactivate them, and reset passwords. Admins sign in at `/admin` using the account email and password.
- The superadmin has full platform data controls: create/edit/delete vehicle listings, view/update/delete enquiries, manage all vendors and admin accounts, and review or delete GridFS photos. Deleting a photo also clears its GridFS reference from any listing that uses it.
- Completed seller inspection requests and dealer partnership applications are saved to MongoDB and appear under Website submissions in both admin and superadmin workspaces. Admins can update their status; only the superadmin can delete them. Buyer enquiries, vendor listings, and uploaded listing photos are also persisted and visible to management.
- Finance eligibility, vehicle-history, auction, and post-inspection offer screens remain illustrative demos. They do not transmit or save the sample values entered into those experiences.
- Admins can manage listings, existing vendor access, and buyer enquiries, but cannot create admin or vendor accounts. Admin accounts and vendor accounts are stored with scrypt password hashes in the `admins` and `vendors` collections.
- Vendors sign in at `/vendor` with the email and password created by a superadmin. Their workspace is limited to their own inventory and enquiries. They cannot access other vendors, approve or publish listings, or manage accounts.
- Public dealer discovery is available at `/dealers`; city, area/locality, and car-model filters use active dealer and vehicle records. Dealer profiles expose public business details and active inventory for search indexing, while revealing a contact number and saving a dealer still require buyer sign-in. Set `CARS21_APP_URL` to the canonical production origin so `sitemap.xml` can include active dealer profile URLs.
- All management sessions use signed, HTTP-only, same-site cookies. Suspending an account blocks further workspace access.
- `/operations` now opens the admin workspace. Legacy bearer-token access remains supported for server-side inventory and inquiry API calls.

## GridFS photos

- `POST /api/photos` accepts a multipart field named `file` and writes the photo to the `carPhotos` GridFS bucket.
- `GET /api/photos/:id` streams a stored image by its GridFS ObjectId.
- Uploads require an admin or vendor session, accept JPEG, PNG, WebP, or AVIF, and are capped at 4 MB. Vendors may attach only photos uploaded in their workspace.
- The upload response contains an `id` and `url`. Set a car's `imageId` to that returned ID to serve it through GridFS.

These route handlers explicitly use the Node.js runtime. MongoClient is reused across warm invocations to preserve its connection pool. Route handlers require a Node.js serverless host; a static export cannot run them.

## Buyer enquiries and WhatsApp

The car detail page includes a visit/callback form. `POST /api/inquiries` validates the buyer's name, mobile, city, and consent, looks up the selected car on the server, and saves a snapshot of the vehicle plus the buyer's contact details in MongoDB's `inquiries` collection. After a successful save, the browser opens WhatsApp with the car link, listing details, seller contact, and buyer details filled in as a message. The visitor must press Send in WhatsApp.

Set `WHATSAPP_ADMIN_NUMBER` to the admin number in international format, digits only. Vendor listings use the vendor dashboard's inquiry WhatsApp number and email (defaulting to the business phone and account email). The enquiry is saved first; the app then sends a dealer email when configured and returns a WhatsApp draft for the buyer to open. Configure `RESEND_API_KEY` and a verified sender in `CARS21_EMAIL_FROM` to send dealer notifications. Without those settings, the enquiry still saves and the dashboard records that email delivery is not configured. Signed-in admins can open `/admin` and view the newest 100 enquiries; vendors only see enquiries for their own listings. Client contact information is never returned by the public API. The legacy server-side `CARS21_ADMIN_TOKEN` remains supported for server API calls and is never stored by the admin inbox in the browser.

## Dealer inspection and subscriptions

Vendors can publish a vehicle listing while submitting its inspection checklist and evidence photos for Cars21 review. Superadmins review the packet under `/superadmin` → **Inspection review** and can approve, request changes, or reject it. Approval controls the public inspection report; it does not block enquiries while review is pending. Superadmins create plans and assign or cancel vendor subscriptions from **Subscription plans** and **Vendor subscriptions**. Plans control term length, maximum live listings, up to 20 photos per listing (including inspection evidence), and enabled workspace features. Vendors see their term, expiry, listing capacity, photo allowance, enquiries, and business profile on their dashboard.

The public `/pricing` page lists active plans marked public. Email notifications use the Resend REST API; add a send-only API key to the server environment and set `CARS21_EMAIL_FROM` to a sender on a verified domain before sending to dealer addresses.

## Google buyer accounts and activity history

Buyer enquiries, saving dealers, and seller phone reveals require Google sign-in. Dealer directory and profile pages remain public so shoppers and search engines can find active inventory. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CARS21_SESSION_SECRET`, and `CARS21_APP_URL` in the server environment. In Google Cloud Console, add the app origin (for example `http://localhost:3001`) as an authorized JavaScript origin and add `${CARS21_APP_URL}/api/auth/google/callback` as an authorized redirect URI. The exact hostname and port must match the running app. The sign-in screen explains the activity tracking and requires the buyer to acknowledge it before OAuth begins.

Cars21 records signed-in searches, car views, dealer profile views, phone reveals, and enquiries in MongoDB's `user_actions` collection. The admin and superadmin workspace's **User history** section provides recent activity (last 7 days) and older history, with client, date range, car, dealer, and activity filters. Recent/history grouping is calculated from event timestamps, so activity becomes history automatically after seven days without a scheduled job. These event records are retained in MongoDB; configure a retention policy separately if the business later needs automatic deletion.

Buyer profiles are stored in the `buyers` collection. Profile name, phone, and city can be edited; the Google email remains provider-managed. Current saved cars are stored as one unique buyer/car record in `buyer_wishlists`. Car listing cards and detail pages share that wishlist, and a sign-in prompted by a save resumes the save after Google returns. The workspace's **Wishlist demand** section ranks active cars by current unique buyer saves. Vendors see only their own listings; admin and superadmin users see marketplace-wide demand. Wishlist totals indicate buyer interest, not completed purchases.

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/cars` | Search and filter inventory |
| GET | `/api/cars/:id` | Read a listing |
| POST | `/api/cars` | Admin upsert; vendor-owned submissions are held for review |
| DELETE | `/api/cars/:id` | Admin delete or vendor-owned listing delete |
| GET | `/api/admin/overview` | Admin inventory, vendor, and inquiry metrics |
| GET | `/api/admin/cars` | Admin listing management feed |
| GET | `/api/admin/vendors` | Admin vendor management |
| PATCH/POST | `/api/admin/vendors/:id` | Admin suspend/reactivate or reset vendor password |
| GET/POST | `/api/superadmin/users` | Superadmin list and create admin/vendor accounts |
| PATCH/POST/DELETE | `/api/superadmin/users/:id` | Superadmin edit, suspend/reactivate, reset, or delete account |
| GET | `/api/superadmin/photos` | Superadmin GridFS photo library |
| DELETE | `/api/superadmin/photos/:id` | Superadmin delete a stored photo |
| POST | `/api/seller-leads` | Save a seller's vehicle and inspection request |
| POST | `/api/dealer-applications` | Save a dealer partnership application |
| GET | `/api/admin/submissions` | Admin seller requests and dealer applications |
| PATCH/DELETE | `/api/admin/submissions/:id` | Update submission status; superadmin may delete |
| GET | `/api/vendor/cars` | Vendor-owned inventory only |
| POST | `/api/photos` | Admin/vendor upload to GridFS |
| GET | `/api/photos/:id` | Stream a GridFS photo |
| POST | `/api/inquiries` | Save a car enquiry and prepare its WhatsApp message |
| GET | `/api/inquiries` | Admin all enquiries; vendors see enquiries for their listings |
| PATCH | `/api/inquiries/:id` | Admin update any enquiry; vendor update own enquiry status |
| DELETE | `/api/inquiries/:id` | Superadmin delete an enquiry |
| GET/POST/DELETE | `/api/auth/session` | Inspect, create, or clear a signed role-based management session |
| POST | `/api/auth/google` | Start consented Google buyer sign-in |
| GET | `/api/auth/google/callback` | Verify OAuth response and create buyer session |
| POST | `/api/user/actions` | Record signed-in search, car view, or dealer view |
| POST | `/api/user/reveal-phone` | Record a phone reveal and return the seller number to the signed-in buyer |
| GET | `/api/admin/user-history` | Admin-only recent and historical buyer activity |
| GET/POST | `/api/user/wishlist` | Read or update the signed-in buyer's saved cars |
| GET/POST | `/api/user/saved-vendors` | Read or update the signed-in buyer's saved dealer profiles |
| GET/PATCH | `/api/user/profile` | Read or update buyer profile name, phone, and city |
| GET | `/api/admin/wishlist-insights` | Platform-wide or vendor-scoped current wishlist demand |

## Routes and demo scope

The existing marketplace, vehicle details, seller walkthrough, inspection, finance, and dealer experiences remain available in the Next.js app. Seller scheduling, KYC, credit checks, payments, and bidding remain demonstrations; inventory, photos, and buyer enquiries use MongoDB-backed APIs.

