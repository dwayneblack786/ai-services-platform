# AI Agent Platform for Real Estate

Note: this is a documentation name update only. The repository name will be changed later.

Work in progress: this README is actively being updated and will evolve as architecture and product documentation are refined.

This project is a vertical AI integration for real estate teams. Instead of one generic AI tool, it delivers a connected set of products that share the same foundation for identity, tenancy, data, and agent orchestration.

This README is written for three audiences at once:

- business and investment stakeholders evaluating category and growth potential
- customers evaluating practical workflow value
- engineering teams evaluating architecture and implementation fit

## Table of Contents

- [What Problem We Are Solving](#what-problem-we-are-solving)
- [How The Workspace Connects](#how-the-workspace-connects)
- [Products We Offer](#products-we-offer)
- [Success Metrics To Track](#success-metrics-to-track)
- [Install After Clone](#install-after-clone)
- [Intent Of This README](#intent-of-this-readme)

## What Problem We Are Solving

Real estate teams often switch between disconnected tools for listings, photos, compliance, documents, and client communication. That creates duplicate work, inconsistent data, and slower response times.

This platform is built to solve that by:

- connecting multiple real estate AI products on one shared platform
- reusing common services (auth, tenant context, product access, integrations)
- running specialized agents for specific business workflows
- keeping product experiences separate while sharing backend capabilities

## How The Workspace Connects

Each folder is part of one end-to-end system:

- `product-management/`: platform control plane for tenant-aware auth, product access, and shared operations
- `ai-listing-agent/`: ListingLift product workspace (frontend + backend)
- `services-java/`: Java Spring Boot agent workflow services (listing, CV, IDP, voice)
- `services-python/`: Python model/inference services (speech, vision, and agent support)
- `shared/`: shared contracts/types
- `ai-product-template/`: starter template for new product modules
- `docs/` and `plans/`: architecture, decisions, and migration planning

```mermaid
flowchart LR
	U[Real Estate Users] --> FE[Product Frontends]
	FE --> BE[Node.js Product Backends]
	BE --> J[Java Agent Services]
	BE --> P[Python Inference Services]
	J --> D[(Shared Data + Tenant Context)]
	P --> D
	PM[Platform Control Plane] --> FE
	PM --> BE
```

## Products We Offer

The platform is built as a connected product suite for real estate operations. Each product solves a focused workflow, and together they create a full vertical AI stack.

- ListingLift: turns property inputs and photos into listing-ready content faster.
- PropVision: analyzes property images to identify features and improve listing quality.
- PropBrief: generates concise market and property intelligence summaries for faster decision-making.
- ComplianceGuard: reviews content for policy and compliance risks before publishing.
- DealDesk: extracts and structures information from real estate documents.
- FieldVoice: manages voice-based lead intake, qualification, and follow-up workflows.
- TenantLoop: supports tenant and property management workflows with AI assistance.

Product availability can vary by rollout phase. Some modules are active now, and others are transitional or planned as architecture migration continues.

## Success Metrics To Track

Use these as practical product and platform metrics while rolling out the new architecture:

| Metric | Why It Matters | How To Measure |
|---|---|---|
| Time to first draft listing | Measures ListingLift value for agents | Median minutes from upload to draft |
| Human edit rate after generation | Measures output quality | % of generated content requiring major edits |
| Compliance pass rate (first review) | Measures compliance quality | % passing first review gate |
| Lead response time (FieldVoice) | Measures customer experience speed | Median time from inbound call to logged outcome |
| Cross-product adoption per tenant | Measures platform integration value | # of products actively used per tenant/month |
| Platform uptime for core workflows | Measures operational reliability | Availability for login + core product APIs |

## Install After Clone

Use the workspace installer script as the source of truth for setup.

1. Clone and enter the repository.

```bash
git clone <your-repo-url>
cd ai-services-platform
```

2. Run the installer script (PowerShell).

```powershell
./scripts/install-workspace.ps1
```

Optional: if your repositories are under a different GitHub owner, pass it explicitly.

```powershell
./scripts/install-workspace.ps1 -GitHubOwner <your-github-owner>
```

What this script does:

- clones missing sibling repos in this workspace (`ai-listing-agent`, `services-java`, `services-python`, `product-management`, `shared`)
- creates missing `.env` files from `.env.example` templates (with prompt/confirmation)
- installs Java dependencies using Maven wrapper offline dependency fetch
- installs Node.js dependencies for active modules (`npm ci` when lockfile exists, otherwise `npm install`)
- prints infrastructure startup commands for Docker and Podman

3. Start infrastructure with one of the compose files printed by the installer.

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

or

```bash
podman-compose -f infra/podman-compose.dev.yml up -d
```

4. Start application services.

- Windows: `./start-app.ps1`
- macOS/Linux: `./start-app.sh`

## Intent Of This README

This README stays concise and user-focused: what this platform is, what business problem it solves, how modules connect, and how to get running after clone.

Service-level behavior and deep technical details belong in each module README and the docs folder.