const express = require('express');
const router = express.Router();
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/itemController');

const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

router.get('/', getAllItems);
router.get('/:id', getItemById);
router.post('/', authMiddleware, requireAdmin, createItem);
router.put('/:id', authMiddleware, requireAdmin, updateItem);
router.delete('/:id', authMiddleware, requireAdmin, deleteItem);

module.exports = router;