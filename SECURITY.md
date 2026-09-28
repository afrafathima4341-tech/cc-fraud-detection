# Security Policy

## Default Credentials
Do NOT use the default admin credentials in production.

Default dev credentials for local development only:
- Email: admin@fraud.local
- Password: Admin@12345

On first login, change the password immediately.

## JWT Secret
Set `JWT_SECRET_KEY` to a cryptographically random string in production.
The server will refuse to start in production mode if the default secret is used.

## Password Policy
Minimum 8 characters, at least one uppercase letter, at least one digit.
