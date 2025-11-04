# Winions Dice Roller

A 66d6 dice rolling system to determine which House your Winion belongs to.

## 🎲 How It Works

1. **Choose Your School** - Select between Anarchy, Mischief, or Luck
2. **Roll 66 Dice** - Roll 66 six-sided dice (66d6)
3. **Discover Your House** - Your total determines which of the 13 Houses you belong to

## 📁 File Structure

```
winions-dice-roller/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── script.js           # Dice rolling logic
├── README.md           # This file
│
├── Images to Add:
│   ├── dice-anarchy.png    # Bronze/orange D66 dice image
│   ├── dice-mischief.png   # Blue D66 dice image
│   ├── dice-luck.png       # Green D66 dice image
│   ├── icon-anarchy.png    # Fire/chaos icon for button
│   ├── icon-mischief.png   # Devil/mischief icon for button
│   ├── icon-luck.png       # Clover/luck icon for button
│   │
│   └── House GIFs (for reveals):
│       ├── havoc.gif
│       ├── misfit.gif
│       ├── frog.gif
│       ├── theory.gif
│       ├── spectrum.gif
│       ├── clay.gif
│       ├── stencil.gif
│       ├── royal.gif
│       ├── shadow.gif
│       ├── hellish.gif
│       ├── hologram.gif
│       ├── gold.gif
│       └── winionswhat.gif
```

## 🚀 Deploy to Vercel

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect it as a static site
   - Click "Deploy"
   - Done! Your dice roller will be live

## 📸 Images Needed

### Dice Images (220x220px recommended)
- `dice-anarchy.png` - Bronze/orange 3D D66 dice
- `dice-mischief.png` - Blue 3D D66 dice  
- `dice-luck.png` - Green 3D D66 dice

### Button Icons (40x40px recommended)
- `icon-anarchy.png` - Fire/chaos symbol
- `icon-mischief.png` - Devil/demon face symbol
- `icon-luck.png` - Four-leaf clover symbol

### House GIFs (any size, will be displayed at 350x350px)
All the house GIFs from your main Winions site

## 🎨 House Distribution

The dice totals map to houses as follows:

| House | Rarity | Roll Range | Count |
|-------|--------|------------|-------|
| Havoc | Common | 66-175 | 222 |
| Misfits | Common | 176-230 | 111 |
| Frog | Uncommon | 231-263 | 66 |
| Theory | Uncommon | 264-290 | 55 |
| Spectrum | Uncommon | 291-312 | 44 |
| Clay | Uncommon | 313-329 | 33 |
| Stencil | Uncommon | 330-345 | 33 |
| Royal | Rare | 346-356 | 22 |
| Shadows | Rare | 357-367 | 22 |
| Hellish | Rare | 368-378 | 22 |
| Hologram | Ultra Rare | 379-389 | 22 |
| Gold | Ultra Rare | 390-394 | 11 |
| Death | Mythic | 395-396 | 3 |

**Total: 666 possible outcomes**

## 🔗 Integration with Main Site

Once deployed, add a link to your main Winions site:

```html
<li><a href="https://your-dice-roller.vercel.app" target="_blank">Dice Roller</a></li>
```

## 🎯 Features

- ✅ Three school selection system (Anarchy, Mischief, Luck)
- ✅ Animated 66d6 dice rolling
- ✅ Counting animation for total
- ✅ Modal popup with house reveal
- ✅ Mobile responsive design
- ✅ Matches Winions red/black aesthetic
- ✅ Reset to try different schools

## 📝 Notes

- Images will fallback to text placeholders if not found
- All house GIF filenames are already configured in `script.js`
- The UI exactly matches your provided design mockup
- Ready for immediate deployment once images are added

---

Built with 🔥 for the Winions collection
