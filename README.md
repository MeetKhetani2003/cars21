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

`cars` documents use `id`, `make`, `model`, `variant`, `year`, `km`, `fuel`, `transmission`, `owners`, `price`, `city`, `body`, `score`, `badge`, `color`, `accent`, and optionally `imageId`, `sellerName`, `sellerPhone`, and `sellerWhatsApp`. The detail route is `GET /api/cars/:id`.

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

Set `WHATSAPP_ADMIN_NUMBER` to the admin number in international format, digits only. A car's `sellerWhatsApp` or `sellerPhone` takes priority when present. Signed-in admins can open `/admin` and view the newest 100 enquiries; vendors only see enquiries for their own listings. Client contact information is never returned by the public API. The legacy server-side `CARS21_ADMIN_TOKEN` remains supported for server API calls and is never stored by the admin inbox in the browser.

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

## Routes and demo scope

The existing marketplace, vehicle details, seller walkthrough, inspection, finance, and dealer experiences remain available in the Next.js app. Seller scheduling, KYC, credit checks, payments, and bidding remain demonstrations; inventory, photos, and buyer enquiries use MongoDB-backed APIs.

