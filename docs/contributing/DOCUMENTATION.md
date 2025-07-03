# Documentation Guidelines

This guide outlines the standards and best practices for contributing to the CellerHut Logistics API documentation.

## Documentation Structure

All documentation is organized in the `/docs` directory with the following structure:

```
docs/
├── README.md                 # Main documentation index
├── getting-started/         # Quick start and setup guides
├── api/                     # API reference documentation
├── features/                # Feature-specific documentation
├── architecture/            # Technical architecture docs
├── deployment/              # Deployment guides
└── contributing/            # Contribution guidelines
```

## Documentation Standards

### 1. File Naming

- Use lowercase with hyphens: `email-verification.md`
- Be descriptive but concise
- Use `.md` extension for all documentation files

### 2. Document Structure

Every documentation file should follow this structure:

```markdown
# Document Title

Brief description of what this document covers.

## Table of Contents (for longer docs)

- [Section 1](#section-1)
- [Section 2](#section-2)

## Section 1

Content...

### Subsection 1.1

More detailed content...

## Section 2

Content...
```

### 3. Writing Style

#### General Guidelines

- **Be Clear and Concise**: Avoid unnecessary jargon
- **Use Active Voice**: "The service sends an email" not "An email is sent by the service"
- **Be Consistent**: Use the same terminology throughout
- **Include Examples**: Show, don't just tell

#### Technical Writing

- **Code Examples**: Include working examples
- **API Endpoints**: Show request and response formats
- **Configuration**: Provide complete examples
- **Error Scenarios**: Document common errors and solutions

### 4. Code Examples

#### Formatting

Use syntax highlighting with language specification:

```typescript
// TypeScript example
interface User {
  id: number;
  email: string;
  name: string;
}
```

```bash
# Bash example
pnpm install
pnpm run dev
```

```json
// JSON example
{
  "name": "example",
  "version": "1.0.0"
}
```

#### Best Practices for Code Examples

1. **Keep it Simple**: Focus on the concept being explained
2. **Make it Runnable**: Ensure examples actually work
3. **Add Comments**: Explain complex parts
4. **Show Full Context**: Include imports and setup when necessary

### 5. API Documentation

When documenting API endpoints:

```markdown
### Endpoint Name

Brief description of what the endpoint does.

**Endpoint:** `METHOD /path/to/endpoint`

**Authentication:** Required/Optional

**Request:**
```http
POST /api/v1/users
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Missing or invalid token
- `409 Conflict` - Email already exists
```

### 6. Feature Documentation

When documenting features:

1. **Overview**: What the feature does and why it's useful
2. **Configuration**: Required setup and environment variables
3. **Usage**: How to use the feature with examples
4. **API Reference**: Related endpoints
5. **Best Practices**: Recommendations for optimal use
6. **Troubleshooting**: Common issues and solutions

#### Using the Feature Documentation Template

We provide a comprehensive template for documenting new features:

1. **Copy the template**: 
   ```bash
   cp docs/contributing/FEATURE_DOCUMENTATION_TEMPLATE.md docs/features/your-feature-name.md
   ```

2. **Fill in all sections**: The template includes placeholders for:
   - Overview and configuration
   - Usage examples
   - API endpoints
   - Security considerations
   - Testing guidelines
   - Troubleshooting

3. **Update the main index**: Add a link to your feature in `docs/README.md`

4. **Keep it updated**: Documentation should be updated alongside code changes

### 7. Linking

#### Internal Links

Use relative paths for internal documentation:

```markdown
See the [API Reference](../api/README.md) for more details.
```

#### External Links

Use descriptive link text:

```markdown
Read more about [JWT authentication](https://jwt.io/introduction)
```

### 8. Images and Diagrams

When including images:

1. Store images in `docs/assets/images/`
2. Use descriptive filenames: `auth-flow-diagram.png`
3. Include alt text: `![Authentication flow diagram](../assets/images/auth-flow-diagram.png)`
4. Keep file sizes reasonable (< 1MB)

For diagrams, prefer text-based diagrams when possible:

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │────▶│   API   │────▶│Database │
└─────────┘     └─────────┘     └─────────┘
```

### 9. Tables

Use tables for structured data:

```markdown
| Parameter | Type   | Required | Description          |
|-----------|--------|----------|---------------------|
| email     | string | Yes      | User's email address |
| password  | string | Yes      | User's password      |
| name      | string | No       | User's full name     |
```

### 10. Warnings and Notes

Use blockquotes for important information:

```markdown
> **Note:** This feature requires Redis to be configured.

> **Warning:** Changing this setting will invalidate all existing tokens.

> **Tip:** Use environment variables for sensitive configuration.
```

## Documentation Types

### 1. Getting Started Guides

- Focus on getting users up and running quickly
- Include prerequisites
- Provide step-by-step instructions
- Include verification steps

### 2. How-to Guides

- Task-oriented documentation
- Assume basic knowledge
- Focus on achieving specific goals
- Include troubleshooting tips

### 3. Reference Documentation

- Complete and accurate API information
- All parameters and options
- Response formats
- Error codes and meanings

### 4. Conceptual Documentation

- Explain the "why" behind design decisions
- Architecture overviews
- Best practices
- Security considerations

## Review Process

### Before Submitting

1. **Spell Check**: Run a spell checker
2. **Link Check**: Ensure all links work
3. **Code Test**: Verify code examples work
4. **Format Check**: Ensure consistent formatting

### Documentation PR Checklist

- [ ] Follows naming conventions
- [ ] Includes appropriate sections
- [ ] Code examples are tested
- [ ] Links are working
- [ ] No spelling/grammar errors
- [ ] Follows style guidelines
- [ ] Updates related documents if needed
- [ ] Adds entry to relevant index/TOC

## Tools and Resources

### Recommended Tools

1. **Markdown Editors**:
   - VSCode with Markdown Preview
   - Typora
   - MacDown (macOS)

2. **Diagram Tools**:
   - draw.io
   - Mermaid
   - ASCII diagram generators

3. **API Testing**:
   - Postman
   - HTTPie
   - curl

### Useful Resources

- [Markdown Guide](https://www.markdownguide.org/)
- [Technical Writing Guide](https://developers.google.com/tech-writing)
- [API Documentation Best Practices](https://swagger.io/blog/api-documentation-best-practices/)

## Common Mistakes to Avoid

1. **Outdated Information**: Keep docs in sync with code
2. **Missing Context**: Always explain the "why"
3. **No Examples**: Include practical examples
4. **Broken Links**: Test all links regularly
5. **Inconsistent Terminology**: Use a glossary
6. **Too Technical**: Consider your audience
7. **No Version Information**: Specify API versions

## Updating Documentation

When making code changes:

1. **Update Affected Docs**: Change documentation alongside code
2. **Add Migration Guides**: For breaking changes
3. **Update Examples**: Ensure they still work
4. **Review Related Docs**: Check for ripple effects

## Questions and Support

If you have questions about documentation:

1. Check existing documentation for examples
2. Ask in the development chat/forum
3. Create an issue for clarification
4. Propose improvements via PR

---

Thank you for contributing to our documentation!