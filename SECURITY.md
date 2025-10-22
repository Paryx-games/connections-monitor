# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Connections Monitor, please report it responsibly rather than disclosing it publicly.

### How to Report

Please email security concerns to the project maintainers with the following information:

- **Description**: A clear explanation of the vulnerability
- **Location**: Specific file(s) and line number(s) if applicable
- **Severity**: Your assessment of the severity (Critical, High, Medium, Low)
- **Proof of Concept**: Steps to reproduce or a proof-of-concept (if safe to share)
- **Impact**: Potential impact on users and systems
- **Suggested Fix**: Any proposed solution (optional)

### Response Timeline

- **Acknowledgment**: We aim to acknowledge receipt within 48 hours
- **Investigation**: We will investigate and determine the validity and severity
- **Timeline**: Security fixes will be prioritized based on severity:
  - **Critical**: Patch released within 7 days
  - **High**: Patch released within 14 days
  - **Medium**: Patch released within 30 days
  - **Low**: Included in next regular release

### Disclosure Process

- We will work with you to understand and resolve the issue
- We request that you do not publicly disclose the vulnerability until we've had time to release a fix
- Once a fix is released, we will publicly acknowledge the vulnerability and credit you (unless you prefer anonymity)

## Security Considerations

### For Users

This tool is intended for network monitoring and diagnostic purposes on systems you own or have permission to monitor. Be aware of:

- **Legal Compliance**: Ensure monitoring complies with applicable laws and regulations in your jurisdiction
- **Permissions**: Only use this tool on systems where you have explicit permission to monitor network activity
- **Data Sensitivity**: Network connection data may contain sensitive information; keep logs secure
- **API Token Security**: Protect your IPinfo.io API token as you would a password; never commit it to version control

### For Developers

When contributing to this project, please follow these security practices:

- **Dependencies**: Keep all dependencies up to date. Regularly run `npm audit` and address vulnerabilities
- **Code Review**: All pull requests will be reviewed for security issues before merging
- **Secrets**: Never commit API tokens, passwords, or sensitive credentials to the repository
- **Input Validation**: Validate and sanitize all external inputs, particularly from system commands and API responses
- **Error Handling**: Avoid exposing sensitive information in error messages or logs
- **PowerShell Commands**: Be cautious with shell command execution; use parameterized approaches where possible

## Known Security Limitations

- This application requires administrative/elevated privileges to access network connection data on Windows
- PowerShell command output is parsed and could potentially be vulnerable to injection attacks if the system environment is compromised
- Geographic IP data is fetched from a third-party service (IPinfo.io); verify their privacy policy
- Stored connection data is kept in memory; restart the application to clear data

## Security Best Practices

### Installation & Setup

- Download releases only from the official GitHub repository
- Verify file integrity when possible
- Run the application with the minimum required privileges
- Keep Node.js and all dependencies updated

### Configuration

- Never share your `config.yml` file, especially your IPinfo.io token
- Use a `.gitignore` file to prevent accidental commits of configuration files
- Rotate your IPinfo.io token regularly if it may have been exposed
- Run the application in a secure environment with proper access controls

### Monitoring & Logs

- Review logs regularly for unusual activity
- Do not share logs containing network connection data without sanitization
- Consider implementing log rotation and retention policies
- Protect log files with appropriate file permissions

## Security Updates

We recommend:

- Watching this repository for security releases
- Subscribing to notifications for new releases
- Regularly checking for npm package updates via `npm outdated`
- Reviewing the CHANGELOG for security-related fixes

## Dependencies & Third-Party Services

This project uses:

- **chalk**: Terminal string styling
- **js-yaml**: YAML parser
- **node-fetch**: HTTP client
- **IPinfo.io**: Geographic IP lookup service

Monitor these dependencies for published vulnerabilities. We will promptly address any critical vulnerabilities in our dependencies.

## Compliance

This tool is provided "as is" without warranty. Users are responsible for:

- Ensuring compliance with applicable laws and regulations
- Obtaining necessary permissions to monitor network activity
- Protecting sensitive network data
- Reviewing and understanding network traffic patterns

## Questions or Suggestions?

If you have questions about this security policy or security-related suggestions, please open a discussion on the GitHub repository or contact the maintainers.

Thank you for helping keep Connections Monitor secure.
