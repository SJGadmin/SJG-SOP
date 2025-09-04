# SJG SOP Assistant

A specialized chatbot for an internal real estate team to get answers from Standard Operating Procedures (SOPs).

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **AI**: Google Gemini API
- **Data Source**: Slite API

## Running the Project Locally

### 1. Environment Variables

This project requires API keys to function. The Vercel Serverless Functions (`/api` directory) will automatically read these from a `.env` file during local development.

Create a file named `.env` in the root of the project and add your secret keys:

```
API_KEY="your_google_gemini_api_key"
SLITE_API_KEY="your_slite_api_key"
```

### 2. Install Dependencies

If you haven't already, install the project dependencies, including the Vercel CLI which is needed to run the serverless functions locally.

```bash
npm install
```

### 3. Run the Development Server

This command starts the Vercel development environment, which serves both the Vite frontend and the serverless API functions, allowing them to communicate correctly.

```bash
npm run dev
```

The application should now be running, typically on `http://localhost:3000`.

## Deployment

This application is configured for deployment on Vercel. 

1. Push your code to a Git repository (GitHub, GitLab, etc.).
2. Import the repository into a new Vercel project.
3. In the Vercel project settings, go to **Settings > Environment Variables** and add `API_KEY` and `SLITE_API_KEY` with their respective values.
4. Vercel will automatically build and deploy the application upon new pushes to the main branch.
