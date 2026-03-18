
A modern, professional academic website built with HTML, CSS, and hosted on GitHub Pages.

## Features

- Clean, distinctive design with warm academic aesthetic
- Fully responsive (mobile, tablet, desktop)
- Animated page transitions and hover effects
- Three main pages: Home, Research, CV
- Integration with external links (Substack, social media)
- Fast loading and performance-optimized

## Setup Instructions

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right and select "New repository"
3. Name it: `glowing-octo-meme`
4. Set it to **Public**
5. Do NOT initialize with README
6. Click "Create repository"

### 2. Upload Files to GitHub

**Option A: Via GitHub Website (Easiest)**
1. On your repository page, click "uploading an existing file"
2. Drag and drop all these files:
   - `index.html`
   - `research.html`
   - `cv.html`
   - `styles.css`
   - `research.css`
   - `cv.css`
   - `README.md` (this file)
3. Scroll down and click "Commit changes"

**Option B: Via Git Command Line**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/glowing-octo-meme.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" (top menu)
3. Click "Pages" (left sidebar)
4. Under "Source", select "Deploy from a branch"
5. Under "Branch", select `main` and `/ (root)`
6. Click "Save"
7. Wait 2-5 minutes for deployment

Your site will be live at: `https://your-username.github.io/glowing-octo-meme/`

For this repository, the expected URL is: `https://samrudhasurana.github.io/glowing-octo-meme/`

GitHub Pages will automatically serve `index.html`, so `https://samrudhasurana.github.io/glowing-octo-meme/index.html` should also work, but the shorter folder URL is the standard one to share.

## Updating Your Website

To make changes:

1. Edit the HTML/CSS files locally
2. Upload to GitHub (drag and drop or use Git)
3. Changes will appear within 1-2 minutes

### Updating the Research Page (No Code Needed)

The research page is driven by `research-data.json`. To add or edit items:

1. Open `research-data.json`.
2. Find the section you want to update (`policyPapers`, `bookReviews`, `workingPapers`, `worksInProgress`, or `popularArticles`).
3. Add a new JSON object or edit an existing one.
4. Save and push the file—`research.html` will update automatically.

Tip: If you prefer a spreadsheet workflow, you can keep a Google Sheet and export it to JSON, then replace the contents of `research-data.json` with the exported file.

## File Structure

```
├── index.html          # Homepage
├── research.html       # Research page
├── cv.html            # CV page
├── styles.css         # Main stylesheet
├── research.css       # Research page styles
├── cv.css            # CV page styles
└── README.md         # This file
```

## Customization Tips

- **Colors**: Edit CSS variables in `styles.css` (lines 1-10)
- **Fonts**: Change Google Fonts links in HTML `<head>` sections
- **Content**: Update text directly in HTML files
- **Images**: Replace image URLs with your own

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2025 Samrudha Surana. All rights reserved.
