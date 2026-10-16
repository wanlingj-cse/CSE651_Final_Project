# Peters' Bakery Website Clone (Est. 1936)

A faithful, high-fidelity clone of **[Peters' Bakery](https://www.petersbakery.com/)** in San Jose, CA — Silicon Valley's oldest family-owned bakery and home of the world-famous **Burnt Almond Cake**.

🌐 **Live Production Deployment**: **[https://peters-bakery.vercel.app](https://peters-bakery.vercel.app)**

---

## 🌟 Key Features

1. **Faithful Visual Design & Branding**
   - Authentic Peters' Bakery logo, typography, color palette (baker's chocolate, toasted caramel gold, warm cream, almond), and motto: *"If you don’t want to eat it yourself, don’t sell it."*
   - Real-time **Open / Closed Store Status Badge** calculated dynamically based on store hours (Tuesday–Saturday 6:30 AM – 6:00 PM, Sunday & Monday closed).

2. **Complete Page Architecture**
   - **Home (`index.html`)**: Hero banner, customer welcome card, *"What We Bake"* signature showcase (Strawberry Ring, Burnt Almond Cake, Beehive Coffee Cake), heritage story teaser, *"Come Visit Us"* section with store photography, interactive Google Map embed, and full footer.
   - **About Us & History (`about.html`)**: Complete narrative of founder Tony Peters (1907–1996), Studebaker weekday job & San Francisco weekend apprentice train rides, 1936 founding, 1947 Alum Rock relocation, 1974 armed robbery showdown, Santa Clara County Horsemen's Association presidency, and 3rd generation family continuation. Includes historical photos (`tony-portrait.png`, `tony-horse.jpg`, `bakery-1972.jpg`, `about-mural.jpg`) and an interactive milestone timeline.
   - **Online Ordering & Full Menu (`online/petersbakery.html`)**: Category filters (Burnt Almond Cakes, Specialties & Danish, Pies, Breakfast Pastries, Cookies, Artisan Breads) with instant customization, size selector, and shopping bag checkout.
   - **Photo Gallery (`gallery.html`)**: 15 authentic gallery photos with category tags and a full-screen interactive **Lightbox Viewer** supporting keyboard and arrow navigation.
   - **FAQ (`faq.html`)**: All 14 official Peters' Bakery questions & answers (dietary restrictions, Burnt Almond Cake ingredients, Goldbelly delivery explanation, pre-order lines, wedding cakes, storage tips) featuring animated accordions and a **live search filter**.
   - **Orders & Notice (`orders.html`)**: Official 48-hour advance notice advisory, small lobby guidance, direct link to official Toast Tab, plus an interactive **Custom Burnt Almond Cake Builder** with size selections, custard flavors, and custom chocolate script inscriptions.
   - **Return & Refund Policy (`refund.html`)**: Complete, official 48-hour return requirements, product evaluation policy, non-refundable items, and donation guidelines.

3. **Interactive Features & E-Commerce Cart**
   - Slide-out **Bakery Box Cart Drawer** tracking items, quantities, subtotal, and review flow.
   - Official **Orders Notice Modal** enforcing lead times and line etiquette before checkout.
   - Responsive design for mobile, tablet, and desktop screens with mobile drawer navigation.

---

## 🚀 Running Locally with Docker Desktop

The project includes a production-grade **Nginx on Alpine Linux** Docker setup with live volume mounts for hot-reload development.

### Start with Docker Compose (Recommended)
```bash
docker compose up -d
```
The container will launch as `peters-bakery-dev` and be visible directly inside your **Docker Desktop** application with a green `healthy` status.

- Open in your browser: **[http://localhost:3030](http://localhost:3030)**
- Clean URLs are supported out of the box (e.g. `http://localhost:3030/about`, `http://localhost:3030/menu`, `http://localhost:3030/faq`).
- **Live Hot-Reloading**: Any edits made to HTML, CSS, or JS files on your machine immediately update in the container without requiring a rebuild.

### Docker Management Commands
```bash
# View container logs
docker compose logs -f

# Check container health status
docker ps --filter "name=peters-bakery-dev"

# Restart the dev container
docker compose restart

# Stop the container
docker compose down
```

### Running without Docker (Alternative)
```bash
python3 -m http.server 3030
```

---

## 📂 Project Structure

```
├── index.html            # Homepage
├── about.html            # About Us & 88-Year History
├── gallery.html          # High-Res Photo Gallery with Lightbox
├── faq.html              # Frequently Asked Questions with Live Search
├── orders.html           # Online Ordering Notice & Cake Customizer
├── refund.html           # Return & Refund Policy
├── online/               # Toast Tab Online Ordering Cloned Experience
│   └── petersbakery.html # Full Interactive Bakery Menu & Checkout
├── egiftcards/           # Toast Tab eGift Card Shop Experience
│   └── petersbakery.html # Instant Digital Gift Card Purchase
├── assets/
│   ├── css/
│   │   └── style.css     # Unified Design System & Responsive Styles
│   ├── js/
│   │   └── main.js       # Live Store Hours, Cart, Lightbox, FAQs
│   └── images/           # Authentic Peters' Bakery assets & photos
└── data/
    └── scraped_content.json # Extracted source data and text records
```
