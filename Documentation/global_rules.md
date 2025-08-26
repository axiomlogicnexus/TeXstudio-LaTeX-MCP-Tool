# Global Rules and Important Information

## AI Initialization Requirements
- AI MUST be initialized with global_rules.md at the start of each new project conversation
- AI must maintain context of these rules throughout the conversation
- Remind AI of specific rules when they become relevant to current task

## File Paths
- Projects Root: C:/Users/Anthracite Ace/Desktop/Software_Development/Cascade Projects/
- Rider Installation: C:/Program Files/JetBrains/JetBrains Rider 2024.3/bin/rider64.exe
- JetBrains Plugins: C:/Users/Anthracite Ace/AppData/Roaming/JetBrains/Rider2024.3/plugins/

## Command Preferences
- Use PowerShell for file operations (more reliable than cmd.exe)
- PowerShell file search: `Get-ChildItem -Path [path] -Recurse -Filter [pattern]`
- Process killing: `taskkill /F /IM [process.exe]`
- Use semicolons (;) instead of ampersands (&&) for command chaining in PowerShell
- SAFETY: Never use deletion commands outside project workspace, unless specifically instructed to. Verify paths and running processes first.

## Development Environment
- OS: Windows
- IDE: JetBrains Rider 2024.3
- Framework: .NET 8.0 LTS
  - Blazor Web App (supports Interactive Auto, Interactive WebAssembly, and Server)
  - .NET MAUI Blazor Hybrid
- Default development port: 5050
- WebAssembly Requirements:
  - Install WASM tools: `dotnet workload install wasm-tools`
  - Verify installation: `dotnet workload list`
  - Update when needed: `dotnet workload update`

## Code Documentation Requirements
- Every file must have a header comment with path and purpose
- All public APIs must have XML documentation
- Complex code blocks require inline comments explaining logic
- Document platform-specific implementations
- Add summary comments for interfaces and classes
- Include usage examples in comments where appropriate

## Development Process Requirements
- Continue implementation until feature is complete
- Verify all acceptance criteria are met
- Document any remaining TODOs
- Add comprehensive tests for new features
- Request explicit user confirmation for completion

## Error Handling Protocol
1. Analysis Process:
   - Examine error message and stack trace
   - Review related code context
   - Check configuration and environment
   - Consider platform-specific implications
2. Documentation:
   - Document error analysis process
   - Record attempted solutions
   - Note platform-specific error patterns
3. Resolution:
   - Present multiple solution options
   - Explain reasoning for chosen approach
   - Verify fix across all platforms

## Implementation Checklist
- [ ] File header documentation
- [ ] XML documentation for public APIs
- [ ] Inline comments for complex logic
- [ ] Platform-specific documentation
- [ ] Error handling implementation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Platform-specific tests

## API Integration
- Cerebras API Base URL: https://api.cerebras.ai/v1/
- Available Models: llama3.1-8b, llama3.1-70b, llama-3.3-70b
- API Request Headers:
  ```json
  {
    "Authorization": "Bearer [api_key]",
    "Accept": "application/json",
    "Content-Type": "application/json"
  }
  ```

## Project Structure Preferences
- Use Properties/launchSettings.json for port configuration
- Keep API keys in secure configuration
- Implement interfaces for services (e.g., IChatService)
- Use dependency injection for services

## Code Conventions
- Use async/await for API calls
- Implement proper error handling and logging
- Use dependency injection
- Follow C# naming conventions
- Add XML documentation for public APIs

## Testing Guidelines
- Create separate test project
- Use xUnit for testing
- Keep test files parallel to source files
- Follow Arrange-Act-Assert pattern

## Common Issues & Solutions
1. Port conflicts: Check launchSettings.json
2. API errors: Verify endpoint and model names
3. Build issues: Clean solution before rebuild
4. Manual User Interactions: Always feel free to ask for manual user interference if needed

## Multi-Project Template Guidelines
### Project Structure
- Maintain hybrid capability while supporting WASM deployment
- Keep platform-specific files (don't delete)
- Use conditional compilation for platform targeting

### Compilation Directives
```xml
<PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <DefineConstants>NET8_0_WASM;NET8_0_MAUI</DefineConstants>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
</PropertyGroup>
```

### Code Organization
- Use preprocessor directives (#if, #else, #endif) for platform-specific code
- Implement platform abstraction through interfaces
- Utilize dependency injection for platform-specific services
- Keep shared code in platform-agnostic libraries
- Use global usings for common namespaces

### File Management
- Disable rather than delete platform-specific files using .csproj conditions
- Use conditional imports in _Imports.razor
- Maintain separate entry points (Program.cs) for each platform
- Keep platform-specific implementations in dedicated namespaces

### Best Practices
- Abstract platform-specific features behind interfaces
- Use feature flags for runtime platform determination
- Implement lazy loading for platform-specific modules
- Maintain clear separation between shared and platform-specific code
- Document platform-specific requirements and dependencies
- Utilize .NET 8 performance improvements and new features:
  - Native AOT compilation where applicable
  - Blazor United model for flexible rendering
  - Enhanced dependency injection capabilities
  - Improved startup performance
