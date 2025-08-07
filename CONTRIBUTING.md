# Contributing to Prospectoo

Thank you for your interest in contributing to Prospectoo! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Chrome browser (latest version)
- Git
- OpenAI API key (for AI features)

### Development Setup
1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/prospectoo-chrome-extension.git
   cd prospectoo-chrome-extension
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Set up environment variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Load extension in Chrome**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the project root directory

## 📋 Development Guidelines

### Code Style
- Use JavaScript Standard Style
- Run ESLint before committing: `npm run lint`
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### File Structure
```
prospectoo-chrome-extension/
├── manifest.json          # Extension manifest
├── popup.html            # Main UI
├── scripts/
│   └── popup.js         # Popup logic
├── content.js           # Content script
├── background.js        # Service worker
├── styles/
│   ├── popup.css        # Main styles
│   └── content.css      # Injected styles
├── backend/             # API server
│   ├── server.js       # Main server
│   └── package.json    # Backend dependencies
└── icons/              # Extension icons
```

### Commit Convention
Use conventional commit messages:
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` test additions/changes
- `chore:` maintenance tasks

Examples:
```
feat: add real-time channel scanning
fix: resolve email extraction regex issue
docs: update API documentation
```

## 🐛 Bug Reports

### Before Submitting
1. Check existing issues to avoid duplicates
2. Test with the latest version
3. Verify the bug isn't related to your environment

### Bug Report Template
```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Chrome version:
- Extension version:
- Operating System:

## Screenshots
If applicable, add screenshots

## Additional Context
Any other relevant information
```

## ✨ Feature Requests

### Feature Request Template
```markdown
## Feature Description
Clear description of the requested feature

## Use Case
Why is this feature needed? Who would benefit?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Mockups, examples, or other relevant information
```

## 🔧 Development Areas

### High Priority
- **AI Improvements**: Better similarity algorithms
- **Performance**: Faster channel processing
- **UI/UX**: Enhanced user experience
- **Email Detection**: More accurate extraction

### Medium Priority
- **Analytics**: Better reporting features
- **Export Options**: More file formats
- **Filtering**: Advanced search filters
- **Integrations**: CRM and marketing tools

### Low Priority
- **Themes**: Additional UI themes
- **Languages**: Internationalization
- **Mobile**: Mobile companion app
- **Documentation**: Video tutorials

## 🧪 Testing

### Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] Channel detection works on various YouTube pages
- [ ] Similarity search returns relevant results
- [ ] Email extraction finds valid emails
- [ ] Export functionality works correctly
- [ ] Real-time mode operates properly
- [ ] UI is responsive and accessible

### Automated Testing
```bash
# Run backend tests
cd backend && npm test

# Run linting
npm run lint

# Validate entire project
npm run validate
```

## 📝 Documentation

### Code Documentation
- Add JSDoc comments for functions
- Document complex algorithms
- Include usage examples
- Keep README.md updated

### API Documentation
- Document all endpoints
- Include request/response examples
- Explain error codes
- Update OpenAPI/Swagger specs

## 🚀 Pull Request Process

### Before Submitting
1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes with clear, focused commits
3. Test thoroughly (manual + automated)
4. Update documentation if needed
5. Run `npm run validate` to check code quality

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Automated tests pass
- [ ] No new linting errors

## Screenshots
If applicable, add screenshots

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### Review Process
1. Automated checks must pass
2. At least one maintainer review required
3. Address all review feedback
4. Maintain clean commit history
5. Squash commits if requested

## 🏷️ Release Process

### Version Numbering
We use Semantic Versioning (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version bumped in manifest.json
- [ ] Changelog updated
- [ ] Release notes prepared
- [ ] Chrome Web Store package ready

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn
- Maintain professional communication
- Report inappropriate behavior

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time community chat
- **Email**: Direct contact for sensitive issues

## 🎯 Contribution Ideas

### For Beginners
- Fix typos in documentation
- Add code comments
- Improve error messages
- Write tests for existing features
- Create examples and tutorials

### For Experienced Developers
- Implement new AI algorithms
- Optimize performance bottlenecks
- Add new data sources
- Build integrations
- Enhance security features

### For Designers
- Improve UI/UX design
- Create better icons and graphics
- Design marketing materials
- Improve accessibility
- Create user flow diagrams

### For Technical Writers
- Improve documentation
- Write tutorials and guides
- Create video content
- Translate content
- Review and edit existing docs

## 🏆 Recognition

### Contributors
All contributors are recognized in:
- README.md contributors section
- Release notes
- Project website (coming soon)
- Annual contributor highlights

### Maintainer Path
Active contributors may be invited to become maintainers based on:
- Consistent quality contributions
- Community involvement
- Technical expertise
- Alignment with project goals

## 📞 Getting Help

### Development Questions
- Check existing documentation
- Search GitHub issues
- Ask in GitHub Discussions
- Join our Discord community

### Technical Support
- Create detailed issue reports
- Provide reproduction steps
- Include relevant logs/screenshots
- Be patient and respectful

## 📚 Resources

### Learning Materials
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [JavaScript Standard Style](https://standardjs.com/)

### Development Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Postman](https://www.postman.com/) for API testing
- [VS Code](https://code.visualstudio.com/) with recommended extensions
- [Git](https://git-scm.com/) for version control

---

Thank you for contributing to Prospectoo! Together, we're building the best AI-powered YouTube channel discovery tool. 🚀