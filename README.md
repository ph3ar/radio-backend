
# backend-radio-boilerplate


This project is a boilerplate backend for radio-style applications, built with Next.js and TypeScript. It is designed for easy integration with InfluxDB (time-series database), Prometheus (metrics), and Grafana (visualization/dashboarding). It provides API endpoints, audio processing, and a UI for managing radio events and modules.

## Integrations
- **InfluxDB**: Ready for time-series data storage (metrics, events, etc.)
- **Prometheus**: Boilerplate for exposing metrics endpoints
- **Grafana**: Designed for easy dashboarding and visualization


## Features
- Next.js app with API routes
- Audio visualizer and event feed components
- Modular architecture for sound modules
- UI components for toggling modules and themes
- Boilerplate for InfluxDB, Prometheus, and Grafana integration

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- pnpm (preferred) or npm/yarn

### Installation
```bash
pnpm install
```

### Running the Development Server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Running Tests
```bash
pnpm test
```

## Project Structure
- `app/` - Next.js app directory (pages, API routes)
- `components/` - React UI components
- `lib/` - Utility and sound module logic
- `public/` - Static assets
- `styles/` - Global and component styles

## Containerization
A Dockerfile is provided to run the app in a container. See below for usage.

## Usage with Docker


### Build the Docker Image
```bash
docker build -t backend-radio-boilerplate .
```

### Run the Container
```bash
docker run -p 3000:3000 backend-radio-boilerplate
```

The app will be available at [http://localhost:3000](http://localhost:3000

## License
MIT
