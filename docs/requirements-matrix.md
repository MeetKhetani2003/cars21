# Cars21 demo requirement matrix

## Source availability

The available source was the pasted master prompt. It references a separate Cars24 system-design PDF and Excalidraw flowcharts, but those files were not present beside the prompt. Requirements below therefore trace to the text prompt and do not assert undocumented business rules.

| Workflow / actor | Route(s) | Demo interaction and state | Production data / API still needed |
|---|---|---|---|
| Buyer discovery | `/`, `/buy-cars`, `/buy-cars/:city` | Homepage search forwards city/make/budget; inventory supports make, city, fuel, body, budget and sort filters; empty state and clear filters | Search index, live inventory, geo/city service, pagination, saved searches |
| Buyer decision | `/car/:carId` | Sample specs, gallery controls, inspection/document tabs, sample callback and favourite state | Vehicle media, availability, enquiry/callback service, verified inspection and document sources |
| Seller intake | `/sell-car`, `/sell-car/vehicle-details` | Registration field validation and editable illustrative vehicle details | Registration lookup, seller identity/consent, OTP provider, secure seller profile API |
| Indicative value | `/sell-car/valuation` | Deterministic estimate range with editable year/km/owners/condition and visible assumptions | Market data, configurable defect weights, regional multipliers, reserve margin config, model governance |
| Inspection booking | `/sell-car/inspection` | Doorstep/centre choice, address/centre, date/time validation | Serviceable PINs, capacity, calendar, inspector dispatch and confirmation |
| Inspection and decision | `/inspection`, `/sell-car/inspection-status`, `/sell-car/offer` | 140+ category concept, OBD-II category, sample statuses, findings, pass/fail selling options | Inspection app/device integration, photos, OBD readings, scoring, actual decision thresholds and evidence |
| Dealer auction | `/become-a-dealer`, `/dealer-auctions`, `/sell-car/auction-result` | Dealer interest form; 30-minute local timer; ₹5,000 minimum increment; last-two-minute +60s extension; sample reserve comparison and acceptance state | Dealer identity/permissions, server timer, Redis/concurrency lock, WebSockets/event stream, reserve data, auction close and deal lock |
| Deal and fulfilment | `/sell-car/auction-result`, `/account` | Escrow, pickup/payout, RC transfer shown as downstream status milestones | Payment/escrow, pickup partner, seller payout, RTO/RC provider, audit/status service |
| Finance | `/loans24`, `/loans24/emi-calculator`, `/loans24/eligibility` | Correct local amortizing EMI calculation; sample application fields | Lender rates/fees, consent, eligibility, credit check, loan application and approval APIs |
| Identity and roles | `/login`, `/account`, `/inspector`, `/operations` | Buyer/seller/dealer/inspector role selector and representative sample dashboards | Authentication, role-based access, persistence, private admin APIs and audit logs |
| Support | `/help` | Demo-specific FAQ content | Support platform, actual terms/policies and help content |

## Cross-cutting controls

- Inventory, personas, prices, dates, inspection reports, scores, and queue metrics are clearly illustrative.
- No payment, OTP, KYC, live dealer system, external registry lookup, lender request, or appointment is represented as completed.
- UI states are local React state. Durable and sensitive information must use authenticated, consented backend services before production use.
- Shared navigation, responsive layout, visible focus, semantic labels, reduced-motion support, and mobile filter drawer are implemented in the frontend.
