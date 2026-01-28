# Hillman Chan's Portfolio

A personal portfolio website showcasing my projects, skills, and interactive games.

**Live Site:** [hillmanchan.com](https://hillmanchan.com)

## Featured Games

| Game | Description | URL |
|------|-------------|-----|
| **Prompt Hunter** | An AI-powered RPG game where players use creative prompts and unique character abilities to defeat monsters. Supports English and Cantonese. | [prompt-hunter.hillmanchan.com](https://prompt-hunter.hillmanchan.com) |
| **Never Have I Ever** | A multilingual interactive card game with dynamic prompts, custom question input, and language selection (EN/FR/ZH-CN/ZH-HK). | [card-game.hillmanchan.com](https://card-game.hillmanchan.com) |
| **Personal ChatBot** | A customizable keyword-driven chatbot that simulates a personal conversational assistant with mood-based responses. | [chat-box.hillmanchan.com](https://chat-box.hillmanchan.com) |
| **Dream Record 夢境紀錄器** | AI-powered dream journal with voice recording, dream analysis, weekly reports, and streak tracking. | [dream-record.hillmanchan.com](https://dream-record.hillmanchan.com) |

## Projects Showcased

- **Resume Builder & Interview Prep Tool** - Create professional resumes and practice AI-driven interviews
- **Hong Kong Teacher System** - Multi-tenant SEN school management platform
- **Job Tracker & Finder** - Job search with Reed.co.uk API integration and interactive mapping
- **AI Detection Tool** - Machine learning tool to detect AI-written text

## Tech Stack

- **Frontend:** React, TailwindCSS, Framer Motion
- **Games:** React, i18next, Gemini API
- **Hosting:** AWS S3, CloudFront
- **DNS:** Cloudflare

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Buy me a coffee (Stripe Payment Links)

Set the following environment variables (in a `.env` file at the project root) to enable the coffee support page at `/my-offer/coffee`:

```
REACT_APP_STRIPE_LINK_1=<Payment Link for £1 coffee>
REACT_APP_STRIPE_LINK_5=<Payment Link for £5 coffee>
REACT_APP_STRIPE_LINK_10=<Payment Link for £10 coffee>
REACT_APP_STRIPE_LINK_CUSTOM=<Payment Link that allows custom amount>
```

These are Stripe Payment Links you generate in your Stripe Dashboard. The custom link should be configured to allow customers to specify the amount.
