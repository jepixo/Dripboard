# Dripboard

Dripboard is a cutting-edge virtual try-on application that lets you curate and visualize outfits on a personalized AI-generated avatar. Upload images of your clothes, build looks with an intuitive interface, and let the Google Gemini API generate a photorealistic image of you wearing your new outfit.

![Dripboard Screenshot](https://storage.googleapis.com/aistudio-marketplace/project_madison_pro/Dripboard_Screenshot.png)

## ✨ Features

- **AI-Powered Avatar Creation**: Generate a full-body, standardized avatar from a single photo of yourself.
- **Virtual Wardrobe**: Upload images of your clothing. Dripboard's AI automatically cleans the images, isolates the clothing item, and analyzes its properties like color, fabric, pattern, and style.
- **Intuitive Outfit Builder**: Mix and match items from your virtual wardrobe. Layer multiple items within the same category (e.g., a shirt under a jacket).
- **Photorealistic Outfit Generation**: Powered by the Gemini 2.5 Flash Image model, Dripboard generates a high-fidelity image of your avatar wearing the selected outfit, respecting item fit and layering.
- **Advanced Fit Simulation**: Input your body measurements and clothing sizes to get AI-generated fit notes, influencing how clothes appear in the final image (e.g., tight, loose, oversized).
- **My Looks Gallery**: Save your favorite generated outfits to a personal gallery for future inspiration.
- **Fully Local & Private**: All your avatars, clothing, and outfits are stored securely on your own device using IndexedDB. No data is uploaded to a central server.
- **Responsive Design**: A seamless experience across desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Model**: [Google Gemini API](https://ai.google.dev/) (`gemini-2.5-flash-image`, `gemini-2.5-pro`)
- **Local Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) for persistent client-side storage.
- **Dependencies**: Handled via modern `importmap` in `index.html`.

## 🚀 Getting Started

This application is designed to run in an environment where the Google Gemini API key is provided as an environment variable (`process.env.API_KEY`).

### Prerequisites

- A valid Google Gemini API key.
- A local web server to serve the `index.html` file.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/dripboard.git
    cd dripboard
    ```

2.  **API Key Configuration:**
    Ensure the `API_KEY` is available in the execution environment. The application will automatically pick it up via `process.env.API_KEY`. The app includes a UI to switch API keys if running in a compatible environment (like Google AI Studio).

3.  **Run the application:**
    Serve the project's root directory using a local web server. A simple one can be run with Python:
    ```bash
    # For Python 3
    python -m http.server
    ```
    Then, open your browser and navigate to `http://localhost:8000`.

## 📂 Project Structure

```
.
├── components/          # React components for different UI parts
│   ├── AvatarCreationModal.tsx
│   ├── ItemCard.tsx
│   ├── OutfitBuilder.tsx  # Main outfit creation interface
│   ├── Wardrobe.tsx       # Wardrobe and avatar management view
│   └── ...
├── services/            # Logic for external services
│   ├── geminiService.ts   # All interactions with the Google Gemini API
│   └── storageService.ts  # Wrapper for IndexedDB local storage
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main application component and layout
├── index.html           # Entry point, includes importmap for dependencies
└── index.tsx            # React root renderer
```

## 🧠 How It Works

### Gemini Service (`services/geminiService.ts`)

This service is the core of the application's AI capabilities.

- **Avatar Creation**: Takes a user-uploaded image and uses a prompt to generate a clean, full-body, forward-facing avatar on a neutral background.
- **Clothing Processing**: When a clothing item is uploaded, it performs a two-step process:
    1.  **Image Cleaning (Optional)**: Uses `gemini-2.5-flash-image` to isolate the clothing item from its original background, placing it on a neutral gray background.
    2.  **Analysis**: Uses `gemini-2.5-pro` with a JSON schema to analyze the cleaned image and extract metadata like colors, fabrics, patterns, and styles.
- **Outfit Generation**: This is the most complex part. It constructs a detailed prompt that includes the avatar image, all selected clothing item images, and a set of "Golden Rules" instructing the model on how to perform the virtual try-on.
    - **Multi-Step Generation**: To ensure the avatar's face is perfectly preserved when wearing headwear or eyewear, it uses a two-step process: first, it generates the headwear on the original avatar, and then uses that *new* image as the base to add the bodywear. This prevents the model from altering the face when adding a shirt, for example.
    - **Precise Instructions**: The prompt is engineered to command the model to preserve the avatar's pose, body shape, and face, while completely replacing the original clothing with the new items. It also includes fit notes based on user-provided measurements.

### Storage Service (`services/storageService.ts`)

This service abstracts all interactions with the browser's IndexedDB. It provides simple `get`, `add`, and `save` methods for managing avatars, clothing items, and saved outfits, ensuring all user data persists between sessions without needing a backend.
