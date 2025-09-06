# 🎉 Event Vision AI

## Your Complete Event Planning Solution - From Vision to Reality in One Platform

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="Event Vision AI Banner" width="100%" />
  
  <p align="center">
    <strong>Transform any venue into your dream event with AI-powered visualizations, professional floor plans, and actionable shopping lists.</strong>
  </p>
</div>

---

## 🌟 Overview

Event Vision AI is a comprehensive, one-stop event planning platform that bridges the gap between imagination and execution. Simply upload photos of your venue, describe your vision, and watch as AI transforms your space with:

- 📸 **Precise Venue Analysis** - AI maps your exact space with accurate measurements
- 📐 **Professional Floor Plans** - Technical CAD-style layouts for vendors
- 🎨 **Multi-Angle Visualizations** - Photorealistic renders from different perspectives
- 🛍️ **Smart Shopping Lists** - Direct Amazon links to purchase everything you see

Perfect for wedding planners, corporate event managers, and anyone organizing memorable gatherings. Save hours of planning time and thousands in design fees.

## ✨ Key Features

### 1. Intelligent Venue Analysis
- **Accurate Spatial Mapping**: AI analyzes your venue photos to create precise spatial maps
- **No Hallucination**: Only maps features actually visible in your photos
- **Terrain Recognition**: Handles outdoor lawns, indoor ballrooms, and mixed spaces
- **Constraint Identification**: Identifies slopes, obstacles, and unusable areas

### 2. Professional Floor Plans
- **True Bird's-Eye View**: Technical architectural drawings from directly above
- **Detailed Sections**: Clear labels for dining, dancing, ceremony, service areas
- **Vendor-Ready**: Includes dimensions, scale, and setup instructions
- **Event-Specific Layouts**: Optimized for weddings, corporate events, or parties

### 3. Photorealistic Visualizations
- **Multiple Angles**: Main event space and side views
- **Evening Ambiance**: Consistent 7:00 PM golden hour lighting
- **Venue-Accurate**: Maintains actual architectural features and constraints
- **Magazine Quality**: Professional event photography style renders

### 4. Actionable Shopping Lists
- **Curated Items**: 18+ common event setup items
- **Direct Purchase Links**: One-click Amazon shopping
- **Price Estimates**: Budget ranges for all items
- **Category Organization**: Lighting, furniture, decor, catering, and more

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jennifercheukyin/event_planning_AI.git
   cd event_planning_AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_API_KEY=your_gemini_api_key_here
   ```
   
   Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

4. **Run the application**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## 💻 Usage

### Step 1: Upload Venue Photos
- Upload multiple photos of your venue from different angles
- Supports both indoor and outdoor spaces
- AI automatically cleans screenshots and removes UI elements
- Optional: Add venue location and website for enhanced analysis

### Step 2: Describe Your Vision
- Enter details about your event (type, guest count, theme)
- Example: "Elegant wedding reception for 150 guests with garden theme, string lights, and dance floor"
- Be specific about your requirements and preferences

### Step 3: Generate Designs
- Click "Generate Event Design" to start the AI transformation
- Processing takes approximately 30 seconds
- AI analyzes venue → creates blueprint → generates visualizations

### Step 4: Review Results
- **Floor Plan Tab**: Technical bird's-eye view with labeled sections
- **Main Event Space Tab**: Photorealistic view of the transformed venue
- **Side View Tab**: Alternative angle showing depth and layout

### Step 5: Shop for Items
- Click "View Shopping List" to see curated event items
- Each item includes price range and Amazon search link
- Items match what appears in your generated visualizations

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI Models**: 
  - Google Gemini 2.5 Flash (venue analysis)
  - Gemini 2.5 Flash Image Preview "Nano Banana" (image generation)
- **Image Processing**: Automatic cleanup and enhancement
- **Architecture**: Component-based with custom hooks

## 📁 Project Structure

```
event_planning_AI/
├── src/
│   ├── components/        # React components
│   │   ├── ImageUploader.tsx
│   │   ├── PromptInput.tsx
│   │   ├── ResultDisplay.tsx
│   │   └── Icon.tsx
│   ├── services/          # API services
│   │   └── geminiService.ts
│   ├── types/             # TypeScript definitions
│   └── App.tsx            # Main application
├── public/                # Static assets
├── .env                   # Environment variables (create this)
└── package.json          # Dependencies
```

## 🔑 API Configuration

The application uses Google's Gemini AI models:

- **Gemini 2.5 Flash**: For intelligent venue analysis and blueprint creation
- **Nano Banana (Gemini 2.5 Flash Image Preview)**: For generating photorealistic visualizations

Ensure your API key has access to both models.

## 🎯 Use Cases

### Wedding Planning
- Transform raw venue spaces into elegant wedding setups
- Visualize ceremony and reception layouts
- Plan seating arrangements with precise floor plans
- Get shopping lists for decorations and rentals

### Corporate Events
- Design professional conference setups
- Plan networking spaces and exhibition areas
- Optimize traffic flow with technical floor plans
- Budget with itemized shopping lists

### Private Parties
- Visualize birthday, anniversary, or holiday parties
- Create themed event designs
- Plan entertainment and dining areas
- Shop for party supplies efficiently

## 📈 Benefits

- **Time Savings**: Hours of planning reduced to minutes
- **Cost Effective**: Save thousands on professional design fees
- **Accuracy**: Precise venue mapping prevents setup day surprises
- **Comprehensive**: All planning tools in one platform
- **Actionable**: Direct shopping links make execution simple

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for powerful vision and generation capabilities
- React and Vite communities for excellent development tools
- All contributors and users who help improve the platform

## 📧 Contact

For questions or support, please open an issue on GitHub or contact the maintainers.

---

<div align="center">
  <strong>Transform your venue. Realize your vision. Plan with confidence.</strong>
  <br>
  Built with ❤️ using AI
</div>