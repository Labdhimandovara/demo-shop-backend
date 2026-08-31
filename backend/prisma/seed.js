const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const products = [
  // Electronics
  { name: 'Wireless Bluetooth Headphones', description: 'Premium noise-cancelling over-ear headphones with 30-hour battery life.', price: 2999, stock: 50, category: 'Electronics', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
  { name: 'Smart Watch Pro', description: 'Fitness tracker with heart rate monitor, GPS, and 7-day battery.', price: 4999, stock: 30, category: 'Electronics', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' },
  { name: 'USB-C Hub 7-in-1', description: 'Multiport adapter with HDMI, USB 3.0, SD card, and PD charging.', price: 1299, stock: 80, category: 'Electronics', imageUrl: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400' },
  { name: 'Mechanical Keyboard', description: 'TKL layout with RGB backlighting and Cherry MX switches.', price: 3499, stock: 25, category: 'Electronics', imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400' },
  { name: 'Portable SSD 1TB', description: 'Ultra-fast external SSD with USB 3.2 Gen 2 and rugged casing.', price: 5999, stock: 40, category: 'Electronics', imageUrl: 'https://images.unsplash.com/photo-1597225244516-8a31e8ab3966?w=400' },

  // Clothing
  { name: 'Classic White Oxford Shirt', description: 'Premium cotton Oxford shirt, slim fit, wrinkle-resistant.', price: 999, stock: 100, category: 'Clothing', imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400' },
  { name: 'Slim Fit Chinos', description: 'Stretch cotton chinos in 6 colors, comfortable all-day wear.', price: 1499, stock: 75, category: 'Clothing', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400' },
  { name: 'Running Sneakers', description: 'Lightweight mesh sneakers with responsive cushioning for daily runs.', price: 2499, stock: 60, category: 'Clothing', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
  { name: 'Hooded Sweatshirt', description: 'Premium fleece hoodie with kangaroo pocket and adjustable drawstring.', price: 1799, stock: 90, category: 'Clothing', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400' },
  { name: 'Leather Jacket', description: 'Genuine leather biker jacket with zip pockets and quilted lining.', price: 7999, stock: 15, category: 'Clothing', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400' },

  // Books
  { name: 'Clean Code by Robert Martin', description: 'A Handbook of Agile Software Craftsmanship — essential reading for developers.', price: 599, stock: 200, category: 'Books', imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400' },
  { name: 'Atomic Habits', description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones by James Clear.', price: 449, stock: 150, category: 'Books', imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400' },
  { name: 'Deep Work', description: 'Rules for Focused Success in a Distracted World by Cal Newport.', price: 399, stock: 120, category: 'Books', imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400' },
  { name: 'The Pragmatic Programmer', description: 'Your Journey to Mastery — a classic guide for software engineers.', price: 699, stock: 100, category: 'Books', imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400' },
  { name: 'Zero to One', description: 'Notes on Startups, or How to Build the Future by Peter Thiel.', price: 349, stock: 180, category: 'Books', imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400' },

  // Accessories
  { name: 'Leather Minimalist Wallet', description: 'Slim RFID-blocking bifold wallet in genuine Italian leather.', price: 899, stock: 70, category: 'Accessories', imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400' },
  { name: 'Canvas Backpack 25L', description: 'Water-resistant canvas backpack with 15" laptop compartment.', price: 1999, stock: 45, category: 'Accessories', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' },
  { name: 'Stainless Steel Water Bottle', description: '1L double-wall insulated bottle, keeps cold 24h and hot 12h.', price: 799, stock: 120, category: 'Accessories', imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400' },
  { name: 'Polarised Sunglasses', description: 'UV400 polarised lenses with lightweight titanium frame.', price: 1499, stock: 55, category: 'Accessories', imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400' },
  { name: 'Wireless Charging Pad', description: '15W fast wireless charging pad compatible with Qi-enabled devices.', price: 699, stock: 90, category: 'Accessories', imageUrl: 'https://images.unsplash.com/photo-1586253634026-8cb574908d1e?w=400' },
];

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash: adminHash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('Created admin:', admin.email);

  // Create customer user
  const customerHash = await bcrypt.hash('Customer@123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@demo.com' },
    update: {},
    create: {
      email: 'customer@demo.com',
      passwordHash: customerHash,
      name: 'Demo Customer',
      role: 'CUSTOMER',
    },
  });
  console.log('Created customer:', customer.email);

  // Create products
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { id: p.name.toLowerCase().replace(/\s+/g, '-').slice(0, 20) + '-prod' },
      update: {},
      create: p,
    });
    console.log('Created product:', product.name);
  }

  console.log('Seeding complete!');
  console.log('\nDemo Accounts:');
  console.log('  Admin:    admin@demo.com    / Admin@123');
  console.log('  Customer: customer@demo.com / Customer@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
