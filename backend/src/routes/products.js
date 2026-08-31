const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { withAuth, withAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product catalog endpoints (public)
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products with optional filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (Electronics, Clothing, Books, Accessories)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of products with pagination
 */
router.get('/', async (req, res) => {
  const { search, category, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = {};
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];
  if (category) where.category = { equals: category, mode: 'insensitive' };
  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
    prisma.product.count({ where }),
  ]);
  res.json({ data: { products, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }, message: 'Success' });
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found', data: null });
  res.json({ data: { product }, message: 'Success' });
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price, stock, category]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               category:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created
 *       403:
 *         description: Admin access required
 */
router.post('/', withAdmin, async (req, res) => {
  const { name, description, price, stock, category, imageUrl } = req.body;
  if (!name || !description || price == null || stock == null || !category) {
    return res.status(400).json({ error: 'name, description, price, stock, category are required', data: null });
  }
  const product = await prisma.product.create({ data: { name, description, price: Number(price), stock: Number(stock), category, imageUrl } });
  res.status(201).json({ data: { product }, message: 'Product created' });
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Update a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated
 */
router.patch('/:id', withAdmin, async (req, res) => {
  const { name, description, price, stock, category, imageUrl } = req.body;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(description && { description }),
      ...(price != null && { price: Number(price) }),
      ...(stock != null && { stock: Number(stock) }),
      ...(category && { category }),
      ...(imageUrl !== undefined && { imageUrl }),
    },
  });
  res.json({ data: { product }, message: 'Product updated' });
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id', withAdmin, async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ data: null, message: 'Product deleted' });
});

module.exports = router;
