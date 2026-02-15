# 🚀 Azure Deployment Guide for SYNERGI

This guide uses your **Azure for Students** credits to deploy SYNERGI using **Docker Containers** on **Azure App Service**. This is a scalable, "startup-grade" approach.

### Prerequisites

1.  **Azure CLI** installed (`az login`).
2.  **Docker Desktop** running.

---

## 1. Create an Azure Container Registry (ACR)

You need a place to store your Docker images.

```bash
# Create a resource group
az group create --name synergi-rg --location eastus

# Create registry (must be unique URL, e.g. synergiregistry123)
az acr create --resource-group synergi-rg --name synergiregistry$RANDOM --sku Basic --admin-enabled true

# Login to ACR
az acr login --name <registry-name>
```

---

## 2. Deploy The Backend

(We do this first to get the API URL).

### Build & Push Backend

```bash
# Get the registry login server (e.g., synergiregistry.azurecr.io)
ACR_SERVER=<registry-name>.azurecr.io

# Build Agent/Backend Image
docker build -t $ACR_SERVER/synergi-backend:latest ./backend

# Push to Azure
docker push $ACR_SERVER/synergi-backend:latest
```

### Create Backend App Service

1.  Go to Azure Portal > Create Resource > **Web App**.
2.  **Publish**: Docker Container.
3.  **Region**: East US.
4.  **Pricing Plan**: **B1** (Basic) to separate production from free tier limitations, or **F1** (Free) if just testing. Since you have credits, B1 is safer for demos.
5.  **Docker Tab**:
    - Image Source: Azure Container Registry.
    - Image: `synergi-backend:latest`.
6.  **Review & Create**.

**After Deployment:**

- Go to resource > **Configuration** (Environment variables).
- Add settings from your local `.env`:
  - `GEMINI_API_KEY`: ...
  - `GROQ_API_KEY`: ...
  - `AGENT_PRIVATE_KEY`: ... (if backend acts as agent)
- **Copy the Backend URL**: e.g., `https://synergi-backend.azurewebsites.net`.

---

## 3. Deploy The Frontend

(Now we build the frontend, pointing it to the live backend).

### Build & Push Frontend

Replace `BACKEND_URL` with your actual Azure Backend URL.

```bash
# Build with the API URL baked in
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://synergi-backend.azurewebsites.net \
  -t $ACR_SERVER/synergi-frontend:latest \
  ./frontend

# Push
docker push $ACR_SERVER/synergi-frontend:latest
```

### Create Frontend App Service

1.  Create another **Web App** (Docker).
2.  Select Image: `synergi-frontend:latest`.
3.  **Pricing**: B1 (or F1).
4.  **Create**.

**Configuration:**

- Go to Frontend App > **Configuration**.
- Add user-facing env vars if needed (Auth secrets, etc.).

---

## 4. Run the Agent (Optional)

The `agent` is a CLI/Script. You have two options:

1.  **Run Locally:** Connect it to your cloud backend (Set `SERVER_URL=https://synergi-backend.azurewebsites.net` in `agent/.env`).
2.  **Run as a Container Instance (ACI):**
    - Build `agent` image.
    - Deploy to **Azure Container Instances** (ACI) as a continuously running container if it has a loop.

---

## 🌟 Cost Management

- **B1 Plan**: ~$13/month per app. (Backend + Frontend = ~$26/mo).
- **Credits**: ₹9,000 (~$100) covers this easily for months.
- **Cleanup**: When done, delete the `synergi-rg` resource group to stop all charges.
