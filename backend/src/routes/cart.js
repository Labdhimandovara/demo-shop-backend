const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { withAuth } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Cart management (JWT required)
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart items with total
 */
router.get('/', withAuth, async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.userId },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  res.json({ data: { items, total, count: items.length }, message: 'Success' });
});

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Item added to cart
 */
router.post('/', withAuth, async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required', data: null });
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Product not found', data: null });
  if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock', data: null });
  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: req.userId, productId } },
    update: { quantity: { increment: Number(quantity) } },
    create: { userId: req.userId, productId, quantity: Number(quantity) },
    include: { product: true },
  });
  res.status(201).json({ data: { item }, message: 'Item added to cart' });
});

/**
 * @swagger
 * /api/cart/{itemId}:
 *   patch:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Cart item updated
 */
router.patch('/:itemId', withAuth, async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || Number(quantity) < 1) return res.status(400).json({ error: 'quantity must be at least 1', data: null });
  const existing = await prisma.cartItem.findFirst({ where: { id: req.params.itemId, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: 'Cart item not found', data: null });
  const item = await prisma.cartItem.update({
    where: { id: req.params.itemId },
    data: { quantity: Number(quantity) },
    include: { product: true },
  });
  res.json({ data: { item }, message: 'Cart item updated' });
});

/**
 * @swagger
 * /api/cart/{itemId}:
 *   delete:
 *     summary: Remove a specific item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed
 */
router.delete('/:itemId', withAuth, async (req, res) => {
  const existing = await prisma.cartItem.findFirst({ where: { id: req.params.itemId, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: 'Cart item not found', data: null });
  await prisma.cartItem.delete({ where: { id: req.params.itemId } });
  res.json({ data: null, message: 'Item removed from cart' });
});

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete('/', withAuth, async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.userId } });
  res.json({ data: null, message: 'Cart cleared' });
});

module.exports = router;
