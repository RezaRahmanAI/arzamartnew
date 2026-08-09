# PRODUCTION AUDIT, AUTO-FIX & PLESK DEPLOYMENT ENGINE

## Next.js + ASP.NET Core + SQL Server — Windows/Plesk Production Environment

You are acting as a **Senior Software Architect, DevOps Engineer, Security Engineer, Performance Engineer, and Code Reviewer**.

I have an e-commerce application with:

* Frontend: Next.js
* Backend: ASP.NET Core Web API
* Database: SQL Server
* Hosting: Windows Server
* Hosting Panel: Plesk
* Web Server: IIS
* Production environment does NOT use Docker unless absolutely necessary and supported by the hosting environment.

Your job is NOT simply to review the code.

You must:

1. Inspect the entire project.
2. Understand the architecture.
3. Detect production problems.
4. Detect security vulnerabilities.
5. Detect performance problems.
6. Detect deployment problems.
7. Detect incorrect project structure.
8. Detect configuration problems.
9. Detect Next.js production issues.
10. Detect ASP.NET Core production issues.
11. Detect SQL/EF Core problems.
12. Detect Windows/IIS/Plesk compatibility issues.
13. Fix problems that can safely be fixed automatically.
14. Build the complete application.
15. Run tests and validation.
16. Prepare production deployment packages.
17. Generate deployment instructions.
18. NEVER make destructive changes without clearly identifying them first.

---

# PHASE 1 — FULL PROJECT DISCOVERY

First inspect the entire repository.

Do NOT start modifying files immediately.

Create an inventory of:

* Frontend project
* Backend project
* Shared libraries
* Configuration files
* Environment files
* Database configuration
* Authentication
* Authorization
* API endpoints
* Middleware
* Services
* Repositories
* EF Core DbContext
* Entity models
* DTOs
* Validators
* Background services
* Logging
* Caching
* File upload system
* Image processing
* Payment integration
* Email/SMS integration
* Third-party integrations
* Next.js pages
* Next.js components
* API clients
* State management
* SEO
* Metadata
* Static assets
* Build configuration
* IIS configuration
* Plesk-related files
* Deployment scripts

Understand the dependency graph before changing anything.

---

# PHASE 2 — ARCHITECTURE AUDIT

Check whether the project follows a professional production architecture.

For ASP.NET Core verify:

* Clean Architecture principles
* Separation of concerns
* Dependency Injection
* API layer
* Application layer
* Domain layer
* Infrastructure layer
* DTO separation
* Entity separation
* Business logic separation
* Validation
* Exception handling
* Logging
* Authentication
* Authorization
* Configuration
* Database access
* External service integration

Do NOT introduce unnecessary abstractions.

Avoid:

* Over-engineering
* Generic repositories where unnecessary
* Excessive interfaces
* Unnecessary microservices
* Unnecessary design patterns
* Duplicate services
* Duplicate business logic

If the existing architecture is already good, preserve it.

---

# PHASE 3 — ASP.NET CORE PRODUCTION AUDIT

Inspect:

* Program.cs
* appsettings.json
* appsettings.Production.json
* Dependency injection
* Middleware pipeline
* Controllers
* Services
* EF Core
* DbContext
* Authentication
* JWT configuration
* Authorization policies
* CORS
* Rate limiting
* Exception handling
* Logging
* Health checks
* Compression
* HTTPS
* Static files
* File uploads
* Background services

Check for:

* N+1 queries
* Unnecessary database calls
* Missing AsNoTracking()
* Loading entire tables
* Missing pagination
* Inefficient LINQ
* Multiple SaveChangesAsync()
* Unnecessary Include()
* Large object loading
* Blocking async calls
* .Result
* .Wait()
* Thread blocking
* Memory leaks
* Incorrect scoped/singleton/transient lifetimes
* Incorrect DbContext lifetime
* Duplicate database queries
* Missing cancellation tokens where useful

Fix safe issues.

---

# PHASE 4 — DATABASE AUDIT

Inspect SQL Server usage.

Check:

* Primary keys
* Foreign keys
* Indexes
* Unique constraints
* Nullable fields
* Decimal precision
* String lengths
* Date/time handling
* Soft delete strategy
* Audit fields
* Concurrency
* Transactions
* Query performance
* EF Core migrations

Look for:

* Missing indexes
* Duplicate indexes
* Unnecessary indexes
* Cartesian joins
* Slow queries
* N+1 queries
* Large SELECT *
* Unbounded queries
* Inefficient filtering
* Incorrect data types

Do NOT automatically change production database schema unless the change is clearly safe.

If schema changes are required:

Create a migration and clearly explain it.

---

# PHASE 5 — NEXT.JS PRODUCTION AUDIT

Inspect the complete Next.js application.

Check:

* App Router / Pages Router
* Server Components
* Client Components
* Server Actions
* API calls
* Data fetching
* Caching
* Revalidation
* Dynamic rendering
* Static rendering
* Image optimization
* Metadata
* SEO
* Sitemap
* Robots.txt
* Error pages
* Loading states
* Not-found pages
* Route structure
* Middleware
* Authentication
* Cookies
* Token handling
* Environment variables

IMPORTANT:

Do NOT blindly convert everything into Client Components.

Prefer:

* Server Components
* Server-side data fetching
* Static generation where appropriate
* ISR/revalidation where appropriate
* Streaming/loading states
* Minimal client-side JavaScript

Avoid:

* unnecessary useEffect()
* unnecessary useState()
* duplicate API requests
* client-side fetching when server-side fetching is more appropriate
* large JavaScript bundles
* unnecessary libraries

---

# PHASE 6 — E-COMMERCE PERFORMANCE AUDIT

This is an e-commerce website.

Pay special attention to:

* Homepage
* Product listing
* Product details
* Categories
* Search
* Cart
* Checkout
* Landing pages
* Customer profile
* Orders
* Admin dashboard

Identify:

* Duplicate API requests
* Waterfall requests
* Slow database queries
* Large API responses
* Unoptimized images
* Huge JS bundles
* unnecessary hydration
* unnecessary re-renders
* bad caching
* missing pagination
* missing database indexes
* excessive client-side processing

Target:

* Fast initial page load
* Minimal API requests
* Minimal JavaScript
* Optimized images
* Efficient database queries
* Proper caching
* Good Core Web Vitals

Do NOT implement caching blindly.

For every cache, define:

* What is cached?
* Where?
* TTL/revalidation?
* How is it invalidated?
* What happens after admin updates data?
* What happens after product/category changes?

---

# PHASE 7 — SECURITY AUDIT

Perform a serious security audit.

Check for:

* Hardcoded secrets
* API keys in source code
* Database passwords
* JWT secrets
* Exposed environment variables
* Unsafe CORS
* Missing authorization
* IDOR vulnerabilities
* SQL injection
* XSS
* CSRF where applicable
* Open redirects
* Path traversal
* Unsafe file uploads
* Malicious file extensions
* Missing file size limits
* Weak password handling
* Sensitive information in logs
* Stack traces exposed to users
* Excessive API permissions
* Missing rate limiting
* Broken authentication
* Insecure cookies
* Incorrect SameSite settings
* Missing Secure flag
* Missing HttpOnly flag

Never expose secrets in frontend code.

Anything prefixed with NEXT_PUBLIC_ must be considered publicly visible.

---

# PHASE 8 — ENVIRONMENT CONFIGURATION

Create a clean environment strategy.

Development:

.env.local

Production:

.env.production

Never commit real production secrets.

Verify:

* Database connection string
* JWT configuration
* API URL
* Frontend URL
* CORS origins
* Upload paths
* Email configuration
* Payment configuration
* Third-party API keys

Use placeholders/examples where necessary.

Create:

.env.example

without real secrets.

---

# PHASE 9 — API + FRONTEND COMMUNICATION

Audit the complete communication flow:

Next.js
↓
ASP.NET Core API
↓
Application Services
↓
EF Core
↓
SQL Server

Check:

* API base URL
* HTTPS
* CORS
* authentication
* cookies/tokens
* error handling
* timeout
* retry behavior
* serialization
* DTO consistency

Make sure development URLs are NOT accidentally used in production.

---

# PHASE 10 — PLESK + WINDOWS SERVER COMPATIBILITY

The application must be deployable on:

Windows Server
+
Plesk
+
IIS

Verify ASP.NET Core hosting requirements.

Backend production build must be compatible with IIS/Plesk.

Check:

* ASP.NET Core Hosting Bundle requirements
* IIS configuration
* web.config
* Application Pool
* .NET runtime
* stdout logging
* permissions
* static file permissions
* upload directory permissions

For Next.js check whether the hosting environment supports:

* Node.js
* npm
* standalone Next.js deployment

Prefer Next.js standalone output when appropriate.

If using:

next.config.js

evaluate whether:

output: "standalone"

is appropriate for this deployment environment.

Do NOT assume Linux-only commands will work on Windows.

All deployment scripts must work with PowerShell/Windows.

---

# PHASE 11 — PRODUCTION BUILD

After fixes:

Build backend in Release mode.

Example:

dotnet restore
dotnet build -c Release
dotnet publish -c Release

Build frontend using production configuration.

Example:

npm ci
npm run build

If standalone mode is appropriate, verify the generated standalone output.

DO NOT declare the application production-ready if build fails.

---

# PHASE 12 — AUTOMATED VALIDATION

Run:

* Backend build
* Frontend build
* Tests
* TypeScript validation
* ESLint
* EF migration validation
* Dependency checks
* Configuration validation

If tests don't exist, explicitly report:

"Tests are missing."

Do not fake test results.

---

# PHASE 13 — DEPLOYMENT PACKAGE

Create a deployment directory:

deployment/

with:

deployment/
├── api/
├── web/
├── scripts/
├── config/
├── docs/
└── README.md

Create:

deployment/scripts/

with:

* build-production.ps1
* package-production.ps1
* deploy-api.ps1
* deploy-web.ps1
* health-check.ps1

Scripts must be safe and should NOT delete production files unless explicitly requested.

---

# PHASE 14 — API DEPLOYMENT

The API deployment process should:

1. Restore dependencies.
2. Build Release.
3. Publish Release.
4. Create deployment package.
5. Validate required files.
6. Validate web.config.
7. Validate production configuration.
8. Provide Plesk/IIS deployment instructions.

The resulting API package should be suitable for uploading to the Plesk API domain/subdomain.

---

# PHASE 15 — NEXT.JS DEPLOYMENT

Determine the correct deployment strategy based on the actual project.

If server-side Next.js features are required:

Use Node.js deployment compatible with Plesk.

If the application can safely be static:

Evaluate static export.

Do NOT force static export if the application requires:

* Server Components requiring runtime
* Server Actions
* Dynamic server rendering
* Runtime authentication
* Server-side API calls
* Dynamic routes that cannot be pre-generated

Choose the correct deployment architecture based on actual code.

---

# PHASE 16 — HEALTH CHECK

Create an API health endpoint such as:

/health

It should verify application health without exposing sensitive information.

Create a deployment health check script that verifies:

* API reachable
* HTTP status
* HTTPS
* frontend reachable
* API endpoint reachable
* database connectivity where appropriate

Never expose database credentials or internal exception details.

---

# PHASE 17 — ROLLBACK STRATEGY

Create a safe rollback process.

Before deployment:

* Backup previous API deployment
* Preserve previous frontend build
* Preserve configuration
* Record deployment timestamp/version

If deployment fails:

Provide a documented rollback process.

---

# PHASE 18 — PRODUCTION READINESS SCORE

At the end generate:

PRODUCTION_READINESS_REPORT.md

Include:

## Architecture

Score: X/10

## Security

Score: X/10

## Performance

Score: X/10

## Database

Score: X/10

## Next.js

Score: X/10

## ASP.NET Core

Score: X/10

## Deployment

Score: X/10

## Maintainability

Score: X/10

## Overall

Score: X/10

Also classify findings:

🔴 CRITICAL
🟠 HIGH
🟡 MEDIUM
🔵 LOW
🟢 GOOD

---

# IMPORTANT AUTO-FIX RULES

You are authorized to fix obvious, safe, production-related issues.

Examples:

* Remove unused imports
* Fix TypeScript errors
* Fix obvious async mistakes
* Fix incorrect dependency injection
* Fix missing error handling
* Fix obvious performance issues
* Fix insecure configuration patterns
* Fix incorrect environment handling
* Fix incorrect Next.js configuration
* Fix build configuration
* Fix deployment scripts
* Fix obvious API bugs

BUT:

Do NOT:

* Delete business logic
* Delete database tables
* Delete production data
* Change payment logic without explanation
* Change authentication architecture unnecessarily
* Rewrite the entire project
* Introduce microservices without requirement
* Add Redis just because it is popular
* Add Docker if Plesk environment does not support it
* Replace working architecture unnecessarily

If a risky change is required:

1. Identify it.
2. Explain why.
3. Show affected files.
4. Propose the safest implementation.
5. Only then modify it if safe to do so.

---

# FINAL DELIVERABLES

At the end, I expect:

1. Fixed production-ready source code.
2. Production build verification.
3. Backend deployment package.
4. Next.js deployment package.
5. PowerShell deployment scripts.
6. Plesk deployment instructions.
7. Environment variable documentation.
8. Health-check script.
9. Rollback instructions.
10. PRODUCTION_READINESS_REPORT.md
11. CHANGELOG_PRODUCTION.md

The final report must clearly answer:

* What was wrong?
* What was fixed?
* What remains?
* What commands were executed?
* Did backend build successfully?
* Did frontend build successfully?
* Did tests pass?
* Is the application ready for Plesk deployment?
* What exact steps do I need to perform in Plesk?

DO NOT simply say "everything looks good."

Provide evidence from the actual project.

Start with:

PHASE 1 — PROJECT DISCOVERY

and proceed sequentially.
