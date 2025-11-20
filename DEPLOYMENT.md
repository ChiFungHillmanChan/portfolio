# Portfolio Deployment Guide

This guide documents the automated deployment process for your portfolio website to AWS S3 using GitHub Actions.

## 🚀 How It Works

Your portfolio is set up with **Continuous Deployment (CD)**. This means:
1. You make changes to your code locally.
2. You push those changes to the `main` branch on GitHub.
3. GitHub Actions automatically builds your React app and uploads it to your AWS S3 bucket.

## 📝 Routine Workflow

When you want to update your portfolio:

1.  **Make your changes** (edit code, add projects to `projectData.json`, etc.).
2.  **Commit your changes**:
    ```bash
    git add .
    git commit -m "Description of your changes"
    ```
3.  **Push to GitHub**:
    ```bash
    git push origin main
    ```
4.  **Done!** 
    *   Go to the **Actions** tab in your GitHub repository to watch the deployment progress.
    *   Within minutes, your changes will be live on your website.

## ⚙️ Configuration Details

### AWS S3 Bucket
*   **Bucket Name**: `hillmanportfolio1`
*   **Region**: `eu-west-2` (London)
*   **Structure**: The deployment script uploads the *contents* of the build folder to the *root* of the bucket.

### GitHub Action (`.github/workflows/deploy.yml`)
This file controls the automation. It performs these steps:
1.  Checks out your code.
2.  Installs dependencies (`npm ci`).
3.  Builds the project (`npm run build`).
4.  Uploads to S3 with specific caching rules:
    *   **Static Assets (CSS/JS)**: Cached for 1 year (fast loading).
    *   **Index.html**: Never cached (ensures users always see updates immediately).
    *   **Other Files**: Synced to root.

### Secrets
The deployment relies on these GitHub Repository Secrets (Settings > Secrets and variables > Actions):
*   `AWS_ACCESS_KEY_ID`
*   `AWS_SECRET_ACCESS_KEY`

**⚠️ Important:** If you ever delete your IAM user or rotate keys in AWS, you **must** update these secrets in GitHub or deployment will fail.

## 🛠 Troubleshooting

### "Deployment failed"
1.  Click on the failed run in the **Actions** tab.
2.  Click on the **deploy** job to see the logs.
3.  Common errors:
    *   *Access Denied*: Check your AWS IAM permissions or update GitHub Secrets.
    *   *Build Failed*: You might have a syntax error in your React code. Run `npm run build` locally to check.

### "I don't see my changes"
*   **Hard Refresh**: Press `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows) to clear your browser cache.
*   **Check Invalidation**: Currently, we are relying on cache-control headers. If you use CloudFront in the future, you may need to add an invalidation step.

## 📂 Project Structure
*   `portfolio/`: The React application.
*   `.github/workflows/`: Contains the deployment automation script.
*   `README.md`: This file.

