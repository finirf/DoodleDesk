# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in DoodleDesk, please report it **privately** instead of using public issues.

**Email:** Send details to the maintainer via GitHub profile.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Out of Scope

The following are **not security vulnerabilities**:
- Public exposure of the Supabase anon key (by Supabase design—security is enforced via RLS policies)
- Public repository content visibility

## In Scope

Security issues include:
- Backend RLS policy bypasses
- Authentication flow weaknesses
- XSS vulnerabilities in frontend code
- CSRF protection gaps
- Edge function secret exposure
- Credential leakage via error messages
- SQL injection vectors
- Account takeover vulnerabilities

## Security Implementation

This project uses:
- **Supabase Auth** with leaked password protection (HaveIBeenPwned)
- **Row-Level Security (RLS)** for all data isolation
- **Edge Functions** with environment-based secret management
- **Content Security Policy** in HTML meta tags
- **CORS origin validation** for browser requests

Review [BACKEND_SQL_README.md](BACKEND_SQL_README.md) Section 12 for security hardening checklist.

## Responsible Disclosure

We will:
1. Acknowledge receipt of your report within 48 hours
2. Investigate and validate the issue
3. Develop a fix and prepare a security update
4. Coordinate a release timeline
5. Credit you in the fix (unless you prefer anonymity)
