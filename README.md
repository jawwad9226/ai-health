# AI-Powered Terminal

An intelligent terminal application that combines PowerShell with AI assistance. The application can use either cloud-based AI services (like OpenAI) or run locally using LocalAI.

## Features

- PowerShell terminal integration
- Real-time AI assistance and suggestions
- Error analysis and solutions
- Flexible AI backend (LocalAI or cloud-based)
- Modern UI with split terminal and chat interface

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure AI:
- For cloud-based AI (OpenAI):
  - Create a `.env` file
  - Add your OpenAI API key: `OPENAI_API_KEY=your_key_here`
  - Set `USE_LOCAL_AI=false`

- For LocalAI:
  - Install and configure LocalAI
  - Set `USE_LOCAL_AI=true`
  - Set `LOCAL_AI_ENDPOINT=http://localhost:8080` (or your LocalAI endpoint)

3. Start the application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Development

- `main.js`: Electron main process
- `src/`: Source files
  - `components/`: React components
  - `services/`: Backend services
  - `styles/`: CSS styles

## Contributing

Feel free to submit issues and pull requests.

## License

MIT
