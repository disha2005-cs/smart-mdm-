# Documentation

Start with the [main README](../README.md) — it covers running the project with Docker,
manual setup, configuration and the API.

The files here are reference material and project history.

| File | What it is |
|---|---|
| [BUG_FIXES.md](BUG_FIXES.md) | Running log of defects found and fixed |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Manual (non-Docker) server deployment notes |
| [DEPLOYMENT_STEPS.txt](DEPLOYMENT_STEPS.txt) | Original step-by-step deployment checklist |
| [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) | EC2 deployment walkthrough |
| [AWS_RESET_INSTRUCTIONS.md](AWS_RESET_INSTRUCTIONS.md) | Resetting the S3 bucket and credentials |
| [PRODUCTION_READY.md](PRODUCTION_READY.md) | Pre-launch checklist |

> **Note:** these predate the Docker setup and describe the older manual workflow. Where they
> disagree with the main README, the main README is current. `docker compose up --build` is
> now the supported way to run the whole stack.
