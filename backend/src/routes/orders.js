const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { withAuth, withAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management (JWT required)
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place an order from cart (checkout)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [address, paymentMethod]
 *             properties:
 *               address:
 *                 type: object
 *                 required: [name, street, city, country, zip]
 *                 properties:
 *                   name:
 *                     type: string
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   country:
 *                     type: string
 *                   zip:
 *                     type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, cash]
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Cart is empty or insufficient stock
 */
router.post('/', withAuth, async (req, res) => {
  const { address, paymentMethod = 'card' } = req.body;
  if (!address || !address.name || !address.street || !address.city || !address.country || !address.zip) {
    return res.status(400).json({ error: 'Complete address (name, street, city, country, zip) is required', data: null });
  }
  const cartItems = await prisma.cartItem.findMany({ where: { userId: req.userId }, include: { product: true } });
  if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty', data: null });

  // Check stock
  for (const item of cartItems) {
    if (item.product.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for: ${item.product.name}`, data: null });
    }
  }

  const total = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  // Transaction: create order + deduct stock + clear cart
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: req.userId,
        total,
        address,
        paymentMethod,
        items: {
          create: cartItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.product.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
    for (const item of cartItems) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
    }
    await tx.cartItem.deleteMany({ where: { userId: req.userId } });
    return newOrder;
  });

  res.status(201).json({ data: { order }, message: 'Order placed successfully' });
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get current user's order history
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/', withAuth, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.userId },
    include: { items: { include: { product: { select: { name: true, imageUrl: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: { orders }, message: 'Success' });
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
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
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id', withAuth, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return res.status(404).json({ error: 'Order not found', data: null });
  res.json({ data: { order }, message: 'Success' });
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED]
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.patch('/:id/status', withAdmin, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}`, data: null });
  }
  const order = await prisma.order.update({ where: { id: req.params.id }, data: { status } });
  res.json({ data: { order }, message: 'Order status updated' });
});

module.exports = router;
