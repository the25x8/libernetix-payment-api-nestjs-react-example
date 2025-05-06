# Libernetix payment API: Nestjs + React example

This repo demonstrates how to integrate https://libernetix.com/ API for accepting payments using Nest.js for the backend and React for the frontend. We use Vite for the frontend build tool and Docker for containerization. It designed to be simple example of a payment integration.

### Purpose
Job interview task for a Libernetix that is looking for fullstack developers. The task is to create a payment integration with Libernetix API using S2S approach and Nest.js at the backend and simple frontend. The task includes creating a payment form, handling payment submission, and displaying the payment status.

### Features
- [x] OpenTelemetry integration for monitoring and tracing
- [x] Payments API for creating and processing payments.
  - [x] Create purchase in Libernetix API
  - [x] Accept cards without 3DS
  - [x] Process payment status by webhook
    - [ ] Check public key to guarantee the authenticity of webhook events
  - [ ] Process 3DS authorization of the payment
  - [ ] E2E tests for payment controller
    - [ ] Test purchase creation
    - [ ] Test purchase creation with wrong card details
    - [ ] Test purchase creation with invalid form data
    - [ ] Test processing payment status (webhook)
    - [ ] 
- [x] Frontend React SPA
  - [x] Form to collect card details with validation
  - [x] Handle payment submission
  - [x] Display payment status
  - [ ] Handle 3DS authorization flow

## Development

You can run the project using Docker. This monorepo contains backend (Nest.js) and frontend (React/Vite). Each part has its own Dockerfile and run in docker compose with a shared network. This infra also uses Prometheus and OpenTelemetry for monitoring and tracing as it is a requirement for the task.

### Configuration
In `/backend` and `/frontend` folders you will find `.env.example` files. These files contain the environment variables required to run the project. You need to create a `.env` file in each folder and fill in the required values.

### Building and Running
To run the project just run the following command:

```bash
docker-compose up --build
```

After the build is complete, you can access the backend and frontend applications at the following URLs and ports:
- Backend: [http://localhost:3000](http://localhost:3000)
- Frontend: [http://localhost:4173](http://localhost:4173)
