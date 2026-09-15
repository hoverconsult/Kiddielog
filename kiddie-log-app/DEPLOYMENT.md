# Deployment gate

The source is ready for repository publication and hosted-environment integration. A production launch is complete only after these external requirements are configured and tested:

1. Run the Node server behind HTTPS with `NODE_ENV=production`.
2. Set the exact public host and origin using `KIDDIE_LOG_ALLOWED_HOSTS` and `KIDDIE_LOG_PUBLIC_ORIGIN`.
3. Connect a verified transactional email provider for private OTP and account-invitation delivery. The current code records an outbox item; the delivery adapter remains to be connected.
4. Configure persistent storage and encrypted backups for the SQLite database, or migrate the store adapter to a managed transactional database.
5. Approve the privacy notice, consent terms, data-retention schedule and safeguarding incident procedure.
6. Test installability and every role on the final HTTPS hostname.

The application must not be presented as operationally production-certified until these gates pass.
