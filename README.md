# PaarcelMate - Peer-to-Peer Parcel Delivery Platform

A production-ready peer-to-peer parcel delivery platform connecting travelers with senders for fast, affordable package delivery.

## Overview

PaarcelMate allows travelers to monetize their journeys by delivering parcels along their route, while senders get cheaper and faster delivery compared to traditional couriers.

### Key Features

- **Smart Matching**: AI-powered geospatial matching between travelers and parcels
- **Trust & Safety**: Multi-layered verification system with trust scoring
- **Secure Payments**: Escrow-based payment system with Stripe Connect
- **Real-time Tracking**: Live GPS tracking and updates via WebSockets
- **Insurance**: Built-in coverage up to $500, optional premium insurance
- **Mobile-First**: Native iOS/Android apps with React Native
- **Fraud Detection**: ML-powered fraud detection and prevention
- **Scalable Architecture**: Microservices-based design with Kubernetes

## Tech Stack

### Backend
- **Node.js** (NestJS) - REST/GraphQL API
- **Python** (FastAPI) - ML/AI services
- **PostgreSQL** with PostGIS - Primary database with geospatial support
- **Redis** - Caching and real-time data
- **Kafka** - Event streaming
- **WebSockets** - Real-time updates

### Frontend
- **React Native** - iOS/Android mobile apps
- **Next.js** - Web dashboard (TypeScript)
- **TailwindCSS** - Styling
- **React Query** - Data fetching

### Infrastructure
- **Docker** & **Kubernetes** - Containerization and orchestration
- **AWS/GCP** - Cloud hosting
- **Terraform** - Infrastructure as Code
- **GitHub Actions** - CI/CD

### Third-Party Services
- **Stripe Connect** - Payments and escrow
- **Onfido/Jumio** - Identity verification
- **Twilio** - SMS notifications
- **SendGrid** - Email
- **Google Maps API** - Geolocation and routing
- **AWS S3** - File storage

## Project Structure

```
paarcelmate/
├── backend/                    # NestJS API server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication & authorization
│   │   │   ├── users/         # User management
│   │   │   ├── trips/         # Traveler trip management
│   │   │   ├── parcels/       # Parcel management
│   │   │   ├── matching/      # Matching algorithm
│   │   │   ├── payments/      # Payment & escrow
│   │   │   ├── tracking/      # Real-time location tracking
│   │   │   ├── trust/         # Trust & safety
│   │   │   ├── notifications/ # Push/SMS/Email
│   │   │   └── admin/         # Admin operations
│   │   ├── common/
│   │   └── main.ts
│   ├── prisma/                # Database schema
│   ├── test/
│   └── package.json
├── ml-services/               # Python ML/AI services
│   ├── fraud_detection/       # Fraud detection models
│   ├── route_matching/        # Route optimization
│   ├── dynamic_pricing/       # Pricing algorithms
│   └── image_verification/    # Computer vision
├── mobile/                    # React Native mobile app
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── services/
│   │   └── store/
│   └── package.json
├── web/                       # Next.js web dashboard
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
├── admin-dashboard/           # Admin operations dashboard
├── infrastructure/            # Terraform, K8s configs
│   ├── terraform/
│   ├── kubernetes/
│   └── docker/
├── docs/                      # Documentation
├── .github/workflows/         # CI/CD pipelines
└── docker-compose.yml         # Local development
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 15+ with PostGIS
- Redis 7+
- Docker & Docker Compose

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourorg/paarcelmate.git
cd paarcelmate
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start infrastructure with Docker Compose**
```bash
docker-compose up -d postgres redis kafka
```

4. **Install backend dependencies**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
```

5. **Start backend server**
```bash
npm run start:dev
```

6. **Install mobile app dependencies**
```bash
cd mobile
npm install
npx pod-install  # iOS only
```

7. **Start mobile app**
```bash
npm run ios     # or npm run android
```

8. **Install web dashboard dependencies**
```bash
cd web
npm install
npm run dev
```

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm run test
npm run test:e2e

# Mobile tests
cd mobile
npm run test
```

### Database Migrations
```bash
cd backend
npx prisma migrate dev --name migration_name
```

### API Documentation
- Swagger UI: http://localhost:3000/api/docs
- GraphQL Playground: http://localhost:3000/graphql

## Deployment

### Production Build
```bash
# Build all services
docker-compose build

# Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/
```

### Environment Variables

See [.env.example](.env.example) for required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `STRIPE_SECRET_KEY` - Stripe API key
- `JWT_SECRET` - JWT signing secret
- `ONFIDO_API_KEY` - Identity verification
- `GOOGLE_MAPS_API_KEY` - Maps and geolocation

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Mobile Apps (iOS/Android)                     │
│                Web Dashboard (Next.js)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                ┌─────────▼─────────┐
                │   Load Balancer   │
                │   (AWS ALB/NLB)   │
                └─────────┬─────────┘
                          │
                ┌─────────▼─────────┐
                │   API Gateway     │
                │  (Kong/Traefik)   │
                └─────────┬─────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼─────┐   ┌─────▼──────┐   ┌────▼─────┐
    │  Auth    │   │  Matching  │   │ Payment  │
    │ Service  │   │  Service   │   │ Service  │
    └────┬─────┘   └─────┬──────┘   └────┬─────┘
         │               │                │
    ┌────▼─────┐   ┌─────▼──────┐   ┌────▼─────┐
    │PostgreSQL│   │   Redis    │   │  Stripe  │
    │ +PostGIS │   │  (Cache)   │   │ Connect  │
    └──────────┘   └────────────┘   └──────────┘
```

### Key Design Decisions

1. **Microservices Architecture**: Independent scaling of services
2. **Event-Driven**: Kafka for async communication
3. **CQRS Pattern**: Separate read/write models for performance
4. **API Gateway**: Centralized auth, rate limiting, routing
5. **Multi-Region**: Deploy in multiple AWS regions for low latency

## Security

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: RBAC (Role-Based Access Control)
- **Encryption**: TLS 1.3 for transit, AES-256 for data at rest
- **PII Protection**: Data encryption, minimal exposure
- **Rate Limiting**: Per-user and per-IP limits
- **Input Validation**: Comprehensive validation on all inputs
- **Security Headers**: CORS, CSP, HSTS configured
- **Dependency Scanning**: Automated with Snyk/Dependabot

## Compliance

- **GDPR**: Data privacy, right to deletion
- **CCPA**: California privacy compliance
- **PCI DSS**: Payment card security (via Stripe)
- **SOC 2**: Security controls and auditing
- **Terms of Service**: Legal protection and liability

## Monitoring & Observability

- **Logging**: Centralized with ELK Stack
- **Metrics**: Prometheus + Grafana
- **Tracing**: Distributed tracing with Jaeger
- **Error Tracking**: Sentry
- **Uptime Monitoring**: Pingdom/StatusCake
- **Alerts**: PagerDuty integration

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Proprietary - All rights reserved

## Support

- Email: support@paarcelmate.com
- Documentation: https://docs.paarcelmate.com
- Status Page: https://status.paarcelmate.com

## Team

- **CEO/Founder**: [Your Name]
- **CTO**: [Your Name]
- **Lead Engineer**: [Your Name]

---

Built with ❤️ by the PaarcelMate team
